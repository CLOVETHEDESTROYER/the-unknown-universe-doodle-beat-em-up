import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const engine=process.env.GAME_TEST_BROWSER||'chromium',device=process.env.GAME_TEST_DEVICE||'desktop';
const out=new URL(`../output/fire-blade-v1/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...device==='desktop'?{viewport:{width:1366,height:900}}:devices[device],deviceScaleFactor:1});
const errors=[],evidence=[];let requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
page.on('request',r=>{if(r.url().includes('/fire-blade-v1/'))requests.push(r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x=1040,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const enemies=options=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),options);
const waves=s=>s.projectiles.filter(p=>p.fireBlade);
const fire=()=>device==='desktop'?page.keyboard.press('Space'):page.locator('[data-touch-control="attack"]').tap();
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function wait(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error(`Timeout: ${fn}`);}
async function face(direction){const key=direction>0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);await wait(s=>s.player.facing===(direction>0?'right':'left'));await page.keyboard.up(key);}
async function boot(level=3,hero='xgod',extra=''){
 for(const key of ['Space','ArrowLeft','ArrowRight','ArrowDown'])await page.keyboard.up(key);
 requests=[];await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=${hero}&unlockRoster=1&sword=1${extra}`);
 await page.waitForFunction(l=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player&&(l===5||JSON.parse(window.render_game_to_text()).player.grounded),level,{timeout:60000});
 assert.deepEqual((await read()).failedAssets,[]);
}
async function prepare(direction=1,x=1040){await enemies({offsets:[]});await place(x);await face(direction);await place(x);await wait(s=>s.player.grounded&&s.equipment.cooldownRemainingMs===0);}
async function fireNext(){const fired=(await read()).weapon.fireBlades.fired;await fire();return wait(s=>s.weapon.fireBlades.fired>fired);}
try{
 await boot();assert.equal(requests.length,1);await prepare();assert.equal((await read()).equipment.active,'sword');
 await page.evaluate(()=>{window.__bladeFrames=new Set();window.__bladeTravel=[];const sample=()=>{const s=JSON.parse(window.render_game_to_text());for(const p of s.projectiles??[]){if(p.fireBlade){window.__bladeFrames.add(Number(p.frame));window.__bladeTravel.push(p.fireBladeTravel);}}requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await fireNext();let s=await wait(s=>waves(s).some(w=>w.fireBladeTravel>=100));assert.equal(waves(s)[0].damage,3);assert.equal(waves(s)[0].texture,'fire_blade');await shot('right-fire-blade');
 await page.keyboard.press('p');await wait(s=>s.mode==='paused');const frozen=waves(await read());await page.waitForTimeout(250);assert.deepEqual(waves(await read()),frozen);await page.getByRole('button',{name:'Resume Playing'}).click();
 await wait(s=>waves(s).length===0);const travel=await page.evaluate(()=>Math.max(...window.__bladeTravel));assert(travel>=510&&travel<=575,`Travel ${travel}`);assert.deepEqual((await page.evaluate(()=>Array.from(window.__bladeFrames))).sort(),[0,1,2,3]);evidence.push({range:travel,allFrames:true,pause:true});
 await prepare(-1,1600);await fireNext();s=await wait(s=>waves(s).some(w=>w.fireBladeTravel>100));assert(waves(s)[0].velocityX<0);await shot('left-fire-blade');await wait(s=>waves(s).length===0);evidence.push({left:true});
 await prepare();await page.waitForTimeout(850);
 for(const damage of [4,4,6]){
  await wait(s=>s.equipment.cooldownRemainingMs===0);await place();await enemies({offsets:[70],hp:20});await fireNext();s=await read();assert.equal(s.enemies[0].hp,20-damage,'Stronger combo slash');
  await page.waitForTimeout(90);assert.equal((await read()).enemies[0].hp,20-damage,'Same swing projectile cannot hit melee target again');
 }
 evidence.push({meleeCombo:[4,4,6],noDoubleHit:true});
 await prepare();await enemies({offsets:[300,410,530],hp:3});const kills=(await read()).progress.monstersDefeated;await fireNext();s=await wait(s=>s.progress.monstersDefeated===kills+2);await wait(s=>waves(s).length===0);s=await read();assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].hp,3);assert.equal(s.weapon.fireBlades.hits,2);evidence.push({rangedKills:2,pierceCap:true,score:s.progress.score});
 await prepare();await enemies({offsets:[300],hp:20});const hits=(await read()).weapon.fireBlades.hits;await fireNext();await wait(s=>s.weapon.fireBlades.hits===hits+1);await wait(s=>waves(s).length===0);assert.equal((await read()).enemies[0].hp,17);evidence.push({waveDamageOnce:true});
 await prepare();await fireNext();const fired=(await read()).weapon.fireBlades.fired;await fire();await page.waitForTimeout(60);assert.equal((await read()).weapon.fireBlades.fired,fired);await wait(s=>waves(s).length===0);evidence.push({cooldown:true});
 // Replacement after a launch leaves the already-fired wave intact, but cancels a pending sword swing.
 await prepare();await fireNext();await page.evaluate(()=>window.__unknownPlatformerCollectPickup('frost'));assert.equal((await read()).equipment.active,'frost');assert(waves(await read()).length>0);await wait(s=>waves(s).length===0);evidence.push({replacementAfterLaunch:true});
 await boot();await prepare();const before=(await read()).weapon.fireBlades.fired;await page.evaluate(()=>{const check=()=>{const s=JSON.parse(window.render_game_to_text());if(s.attack.resolution==='pending')window.__unknownPlatformerDamagePlayer(5);else requestAnimationFrame(check);};requestAnimationFrame(check);});await fire();await page.waitForTimeout(300);s=await read();assert.equal(s.weapon.fireBlades.fired,before);assert.equal(s.equipment.hits,2);evidence.push({damageCancelsWindup:true});
 await boot();await prepare();await page.evaluate(()=>{const check=()=>{const s=JSON.parse(window.render_game_to_text());if(s.attack.resolution==='pending')window.__unknownPlatformerCollectPickup('frost');else requestAnimationFrame(check);};requestAnimationFrame(check);});await fire();await page.waitForTimeout(300);s=await read();assert.equal(s.weapon.fireBlades.fired,0);assert.equal(s.equipment.active,'frost');evidence.push({replacementCancelsWindup:true});
 await boot();await prepare();await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);await fire();await page.waitForTimeout(250);assert.equal((await read()).weapon.fireBlades.fired,0);await page.keyboard.up('ArrowDown');await wait(s=>!s.player.crouching);await page.keyboard.press('z');await wait(s=>!s.player.grounded);await page.keyboard.press('KeyC');s=await wait(s=>s.weapon.fireBlades.fired===1);assert(!s.player.grounded);assert.equal(s.player.bodyHeight,108);evidence.push({crouchBlocksSwing:true,airAndC:true});
 await page.evaluate(()=>window.__unknownPlatformerForceFall());await wait(s=>waves(s).length===0);evidence.push({pitClearsWaves:true});
 await boot(4);await prepare(1,370);await fireNext();s=await wait(s=>waves(s).length===0);assert.equal(s.weapon.fireBlades.hits,0);evidence.push({solidWall:true});
 // Use the actual Daughter encounter: guarded wave, then a distant wave during ATTACK.
 await boot(2,'xgod','&finishLevel=1');await wait(s=>s.enemies.some(e=>e.kind==='boss'&&e.attackState==='tell'));s=await read();let boss=s.enemies.find(e=>e.kind==='boss');await place(boss.x+300,boss.floorY);await face(-1);await fireNext();s=await wait(s=>s.enemies.find(e=>e.kind==='boss')?.guardedHits>0);assert.equal(s.enemies.find(e=>e.kind==='boss').hp,boss.maxHp);await shot('boss-guard');
 s=await wait(s=>s.enemies.find(e=>e.kind==='boss')?.vulnerable);boss=s.enemies.find(e=>e.kind==='boss');await place(boss.x+300,boss.floorY);await face(-1);await wait(s=>s.equipment.cooldownRemainingMs===0);await fireNext();s=await wait(s=>s.enemies.find(e=>e.kind==='boss')?.hp<boss.maxHp);assert.equal(s.enemies.find(e=>e.kind==='boss').hp,boss.maxHp-4.5);await shot('boss-opening-wave');evidence.push({bossGuardAndOpening:true});
 for(const hero of ['barrett','nico','ezra','teleportation_c','zgod']){
  await boot(3,hero);await prepare();await enemies({offsets:[300],hp:20});await fireNext();s=await wait(s=>s.weapon.fireBlades.hits===1);if(hero==='zgod')assert.equal(s.enemies.length,0);else assert.equal(s.enemies[0].hp,17);await shot(hero+'-fire-blade');evidence.push({hero,rangedHit:true});
 }
 await boot(5);assert.equal(requests.length,0);evidence.push({flightUnchanged:true});
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(`${engine} ${device}: PASS — range/animation/pause, combo, piercing damage, cooldown, cancellation, walls, boss armor and all heroes.`);
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
