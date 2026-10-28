import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1}),errors=[],evidence=[],requests=[];
const out=new URL(`../output/roster-mobility-edges-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),m=s=>s.movement.heroMobility;
async function wait(fn,ms=14000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
const snap=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
async function boot(hero){requests.length=0;await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=3&character=${hero}`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});assert.equal((await read()).selectedCharacter.id,hero);assert(!requests.some(url=>/mobility-v2\/.*\.webp/.test(url)&&!url.includes(hero+'.webp')),'Only selected hero mobility loads');}
async function drop(){let s=await read();await place(s.player.x,s.player.bodyBottom-100);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:25});return wait(s=>m(s).impacts>0);}
try{
 for(const hero of ['barrett','nico','ezra','teleportation_c']){
  await boot(hero);await fixture({offsets:[]});await place(1160,520);await page.waitForTimeout(100);
  assert.equal((await read()).equipment.active,'hands');await fixture({offsets:[65],hp:12});
  await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);await page.keyboard.down('Space');
  await wait(s=>s.enemies[0].hp<12);await snap(hero+'-crouch-unarmed');await page.keyboard.up('Space');await page.keyboard.up('ArrowDown');await page.waitForTimeout(350);
  await fixture({offsets:[hero==='barrett'?215:110],hp:50,projectile:hero==='nico',lift:hero==='ezra'?170:0});
  let s=await drop();await wait(s=>m(s).hits>0);s=await read();const enemy=s.enemies[0];assert(enemy.hp<50);
  if(hero==='barrett')assert(enemy.stunnedRemainingMs>550,'Bear Drop has a longer stun and wide reach');
  if(hero==='nico')assert.equal(m(s).clearedShots,1,'Rocket Drop clears a real nearby hostile shot');
  if(hero==='ezra')assert(enemy.bodyBottom<s.player.bodyBottom-125,'Tall flame catches a raised enemy');
  if(hero==='teleportation_c'){
   const distance=Math.abs(enemy.x-s.player.x);await page.waitForTimeout(200);s=await read();assert(Math.abs(s.enemies[0].x-s.player.x)<distance-15,'Rift pulls living enemies inward');
  }
  await snap(hero+'-unique-impact');await wait(s=>m(s).bombPhase==='ready');
  // Crouched frozen shots and low sword attacks retain their weapon behavior.
  for(const weapon of ['frost','sword']){
   await fixture({offsets:[]});await place(1160,520);await page.evaluate(k=>window.__unknownPlatformerCollectPickup(k),weapon);await page.waitForTimeout(150);assert.equal((await read()).equipment.active,weapon);
   await fixture({offsets:[90],hp:12});await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);
   await page.keyboard.down('Space');s=await wait(s=>s.enemies[0].hp<12);assert(s.player.crouching);if(weapon==='frost')assert(s.enemies[0].frozenRemainingMs>0);
   await snap(hero+'-crouch-'+weapon);await page.keyboard.up('Space');await page.keyboard.up('ArrowDown');await wait(s=>!s.player.crouching);
  }
  await fixture({offsets:[]});await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));await page.waitForTimeout(120);
  await page.keyboard.press('ArrowLeft',{delay:35});await page.waitForTimeout(100);await fixture({offsets:[-115],hp:8});await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);
  await page.keyboard.down('Space');await wait(s=>s.enemies[0].hp<8);assert.equal((await read()).player.facing,'left');await snap(hero+'-crouch-left');await page.keyboard.up('Space');await page.keyboard.up('ArrowDown');
  await fixture({offsets:[]});await place(1160,420);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:25});await wait(s=>m(s).bombPhase==='windup');
  const lives=(await read()).player.lives;await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));await wait(s=>s.player.lives<lives);await wait(s=>s.player.grounded&&s.player.visible&&m(s).bombPhase==='ready');assert(m(await read()).doubleJumpAvailable,'Death/retry restores movement and visibility');
  // New slams use the actual guarded boss controller, including the recent-hit bypass.
  await boot(hero);await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'tell',cooldown:true}));s=await read();let boss=s.enemies.find(e=>e.kind==='boss');
  await place(boss.x,boss.bodyTop-75);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:30});s=await wait(s=>s.enemies.find(e=>e.kind==='boss')?.buttBombHits===1);boss=s.enemies.find(e=>e.kind==='boss');assert(boss.hp<100);await wait(s=>m(s).bombPhase==='ready');assert.equal((await read()).enemies[0].buttBombHits,1);
  evidence.push({hero,uniqueImpact:true,crouchUnarmed:true,crouchFrost:true,crouchSword:true,leftShot:true,deathRecovery:true,guardBypass:true,oneHitPerCast:true,onlySelectedArt:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await snap('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
