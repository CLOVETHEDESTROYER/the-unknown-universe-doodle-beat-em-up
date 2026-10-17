import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const engine=process.env.GAME_TEST_BROWSER||'chromium',device=process.env.GAME_TEST_DEVICE||'desktop';
const out=new URL(`../output/ember-jets-v1/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const context=await browser.newContext({...device==='desktop'?{viewport:{width:1366,height:900}}:devices[device],deviceScaleFactor:1});
const page=await context.newPage(),errors=[],evidence=[];let requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
page.on('request',r=>{if(r.url().includes('/ember-jets-v1/'))requests.push(r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const collect=id=>page.evaluate(id=>window.__unknownPlatformerCollectPickup(id),id);
const enemies=options=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),options);
async function wait(fn,ms=12000){const until=Date.now()+ms;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(12);}throw Error(`Timeout: ${fn}`);}
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function face(direction){const key=direction>0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);await wait(s=>s.player.facing===(direction>0?'right':'left'));await page.keyboard.up(key);}
async function boot(level=3,hero='xgod',extra=''){
 for(const key of ['ArrowLeft','ArrowRight','Space','z'])await page.keyboard.up(key);
 requests=[];await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=${hero}&unlockRoster=1${extra}`);
 await page.waitForFunction(level=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player&&(level===5||JSON.parse(window.render_game_to_text()).player.grounded),level,{timeout:60000});assert.deepEqual((await read()).failedAssets,[]);
}
async function prepare(x=1040,direction=1){await enemies({offsets:[]});await collect('ember');await place(x);await face(direction);await place(x);await page.waitForTimeout(40);await wait(s=>s.equipment.active==='ember'&&s.equipment.cooldownRemainingMs===0);}
const fire=()=>device==='desktop'?page.keyboard.press('Space'):page.locator('[data-touch-control="attack"]').tap();
try{
 await boot();assert.equal(requests.length,4);await prepare();let start=await read();const height=start.player.bodyHeight;
 await page.evaluate(()=>{window.__emberFrames=new Set();window.__emberSamples=[];const sample=()=>{const s=JSON.parse(window.render_game_to_text());if(s.equipment?.emberActive){window.__emberFrames.add(s.equipment.emberJets.frame);window.__emberSamples.push({x:s.player.x,speed:s.player.velocityX,remaining:s.equipment.emberRemainingMs});}requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await fire();let s=await wait(s=>s.equipment.emberActive&&s.equipment.emberRemainingMs<480);
 assert.equal(s.player.bodyHeight,height);assert.equal(s.equipment.emberJets.texture,'ember_jets');assert.equal(s.equipment.emberJets.actorTexture,'ember_xgod_dash');assert(!s.player.visible);await shot('right-jet');
 await page.keyboard.press('p');await wait(s=>s.mode==='paused');const paused=await read();await page.waitForTimeout(200);s=await read();assert.equal(s.player.x,paused.player.x);assert.deepEqual(s.equipment,paused.equipment);await page.getByRole('button',{name:'Resume Playing'}).click();
 s=await wait(s=>!s.equipment.emberActive);const distance=s.player.x-start.player.x;assert(distance>=360&&distance<=445,`Actual dash distance: ${distance}`);assert(distance>=2*620*.26);assert(!s.equipment.emberJets.visible&&s.player.visible);
 assert.deepEqual((await page.evaluate(()=>Array.from(window.__emberFrames))).sort(),[0,1,2,3]);evidence.push({rightDistance:distance,pause:true,bodyHeight:height});
 const uses=s.equipment.uses;await fire();await page.waitForTimeout(50);assert.equal((await read()).equipment.uses,uses,'Cooldown still blocks early reuse');
 await wait(s=>s.equipment.cooldownRemainingMs===0);await place(1500);await face(-1);await place(1500);await page.waitForTimeout(35);start=await read();await fire();s=await wait(s=>s.equipment.emberActive&&s.equipment.emberRemainingMs<450);assert.equal(s.equipment.emberJets.facing,'left');await shot('left-jet');
 s=await wait(s=>!s.equipment.emberActive);assert(start.player.x-s.player.x>=360);evidence.push({leftDistance:start.player.x-s.player.x});

 await prepare();await enemies({offsets:[70,200,300],hp:20});await fire();await wait(s=>!s.equipment.emberActive&&s.equipment.hitsLanded>=3);
 s=await read();assert.equal(s.equipment.hitsLanded,3);assert(s.enemies.every(e=>e.hp===17),'Dash deals three damage once per target');assert.equal(s.player.health,100);evidence.push({threeTargetsOnce:true});
 await prepare();await fire();await wait(s=>s.equipment.emberActive);await page.keyboard.press('x');assert.equal((await read()).special.uses,0,'SP cannot overlap the committed jet');await collect('frost');s=await wait(s=>!s.equipment.emberActive);assert(!s.equipment.emberJets.visible);await page.keyboard.down('ArrowLeft');await wait(s=>s.player.velocityX<0);await page.keyboard.up('ArrowLeft');evidence.push({replacementReleasesMovement:true});
 await boot();await prepare();await fire();await wait(s=>s.equipment.emberActive);await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(5));s=await wait(s=>!s.equipment.emberActive);assert(!s.equipment.emberJets.visible);assert.equal(s.player.health,95);await wait(s=>s.xgodPose==='normal');evidence.push({damageCancels:true});
 await prepare();await place(1040,250);await wait(s=>!s.player.grounded);await fire();s=await wait(s=>s.equipment.emberActive&&s.player.velocityY>100);await shot('air-jet');await wait(s=>!s.equipment.emberActive);evidence.push({airDashKeepsGravity:true});
 await prepare(700);await fire();await wait(s=>s.player.health<95||s.player.lives<3);assert(!(await read()).equipment.emberActive,'Gap/hazard damage cancels the dash');evidence.push({groundGapRemainsHazardous:true});

 await boot(4);await prepare(370);await fire();await wait(s=>s.equipment.emberActive);s=await wait(s=>!s.equipment.emberActive);assert(s.player.x<430&&s.player.x>380,'Solid wall blocks the longer dash');assert(!s.equipment.emberJets.visible);evidence.push({solidWall:true,x:s.player.x});
 await boot(3,'xgod','&finishLevel=1');await collect('ember');s=await wait(s=>s.enemies.some(e=>e.kind==='boss'&&e.attackState==='tell'));const b=s.enemies.find(e=>e.kind==='boss');await place(b.x-250,b.floorY);await face(1);await fire();s=await wait(s=>s.enemies.find(e=>e.kind==='boss')?.guardedHits>0);assert.equal(s.enemies.find(e=>e.kind==='boss').hp,b.maxHp);evidence.push({bossArmor:true});
 for(const hero of ['barrett','nico','ezra','teleportation_c','zgod']){
  await boot(3,hero);assert.equal(requests.length,2);assert(requests.every(r=>r.includes('/jets.')));await prepare();await fire();s=await wait(s=>s.equipment.emberActive&&s.equipment.emberRemainingMs<460);assert.equal(s.equipment.emberJets.actorTexture,null);assert(s.player.visible);await shot(hero+'-jet');await wait(s=>!s.equipment.emberActive);evidence.push({hero,jet:true});
 }
 await boot(2);assert.equal(requests.length,0);await boot(5);assert.equal(requests.length,0);evidence.push({earlyAndFlightDoNotLoadJets:true});
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(`${engine} ${device}: PASS — 2x+ travel both directions, all poses, pause/cooldown, per-target damage, wall/gap/armor, interruption and all heroes.`);
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
