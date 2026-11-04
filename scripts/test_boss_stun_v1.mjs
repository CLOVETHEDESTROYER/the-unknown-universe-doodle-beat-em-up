import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'unknown-boss-stun-v1');await fs.mkdir(out,{recursive:true});
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:54821';
const errors=[],evidence=[];
await build({entryPoints:['gameplay/flightCombat.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(out,'flightCombat.mjs'),logLevel:'silent'});
const {createCombat,stepCombat,FLIGHT_WAVES}=await import(pathToFileURL(path.join(out,'flightCombat.mjs')));
// Real flight projectile collisions, fixed no-hit/stun clocks, and no refresh.
if(!process.env.BOSS_STUN_EXTRA_ONLY)for(const phase of [1,2,3]){
 const s={x:200,y:150,bank:0,clock:0,distance:15400,checkpoint:15300,hull:100,score:0,difficulty:'EASY',phase:'flight'};
 const c=createCombat();c.finaleStarted=true;c.spawnedWaves=FLIGHT_WAVES.map((_,i)=>i);
 const e={id:'void-pursuer',kind:'pursuer',x:835,y:300,startX:835,startY:300,baseY:300,hp:100,maxHp:100,age:0,phase:'recover',phaseMs:0,phaseNumber:phase,aimX:200,aimY:150};c.enemies.push(e);
 const tick=ms=>{s.clock+=ms;stepCombat(s,c,ms,false,()=>false,[]);};
 for(let t=0;t<2990;t+=10)tick(10);assert.equal(e.phase,'recover');tick(10);assert.equal(e.phase,'tell');
 Object.assign(e,{phase:'recover',phaseMs:0,counterStunned:false,startX:e.x,startY:e.y});
 const hit=()=>{c.bolts.push({id:c.nextId++,owner:'player',x:e.x,y:e.y,vx:0,vy:0,damage:1,expires:s.clock+1000});tick(10);};
 hit();assert(e.counterStunned);assert.equal(e.phaseMs,0);assert.equal(e.hp,99);
 for(let t=0;t<400;t+=10)tick(10);hit();assert(e.phaseMs>=400);assert.equal(e.hp,98);
 while(e.phaseMs<1990)tick(10);assert.equal(e.phase,'recover');tick(10);assert.equal(e.phase,'tell');
 evidence.push({flightPhase:phase,missAfter3000:true,hitStuns2000:true,noRepeatRefresh:true});
}
const browser=await chromium.launch({headless:true});let page;
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const boss=s=>s.enemies.find(e=>e.kind==='boss');
 const wait=async(fn,ms=60000)=>{const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s,boss(s)))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);};
 const fixture=opts=>page.evaluate(opts=>window.__unknownPlatformerBossRulesTest(opts),opts);
 if(!process.env.BOSS_STUN_EXTRA_ONLY)for(const [level,seasonal] of [[1,false],[2,false],[3,false],[4,false],[6,false],[1,true]]){
  await page.goto(origin);await page.evaluate(on=>localStorage.setItem('unknownUniverse.thanksgiving.v1',String(on)),seasonal);
  await page.goto(`${origin}/?autostart=1&level=${level}&finishLevel=1&capture=1`);
  await wait((s,b)=>s.player?.grounded&&b);
  const id=boss(await read()).bossId;
  for(const phase of (level===6?[1,2,3]:[1,2])){
   const opts={state:'recover',hp:100,phase,...(level===6?{regentMove:'crown_nova'}:{})};
   await fixture(opts);let s=await wait((s,b)=>b.vulnerable);
   assert.equal(boss(s).recoveryDurationMs,3000);assert(!boss(s).counterStunned);assert.equal(s.bossCues.vulnerability.prompt,'HIT TO STUN!');
   await wait((s,b)=>b.stateElapsedMs>=2750);assert(boss(await read()).vulnerable);
   await wait((s,b)=>!b.vulnerable);assert(!boss(await read()).counterStunned);
   await fixture(opts);s=await wait((s,b)=>b.vulnerable);
   await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(b.x+170,b.floorY);});
   await page.keyboard.press('ArrowLeft',{delay:30});await page.keyboard.down('Space');
   s=await wait((s,b)=>b.counterStunned);await page.keyboard.up('Space');assert.equal(boss(s).recoveryDurationMs,2000);assert(boss(s).hp<100);
   await wait(s=>s.bossCues.vulnerability.prompt==='STUNNED!');
   if(level===6&&phase===3)await page.screenshot({path:path.join(out,'void-stunned.png')});
   await page.waitForTimeout(200);await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');
   s=await read();assert(boss(s).stateElapsedMs>=500);assert(boss(s).recoveryRemainingMs<1500);assert.equal(s.player.health,100);
   await page.keyboard.press('p');await wait(s=>s.mode==='paused');const remaining=boss(await read()).recoveryRemainingMs;
   await page.waitForTimeout(300);assert.equal(boss(await read()).recoveryRemainingMs,remaining);
   await page.keyboard.press('p');await wait(s=>s.mode==='platforming');assert(boss(await read()).recoveryRemainingMs>remaining-160);
   await wait((s,b)=>!b.vulnerable);evidence.push({boss:id,phase,missResumes:true,projectileStun:true,noRefresh:true,safeStun:true,pausePreserved:true});
  }
 }
 // Pulse is local to the visible Regent, and reduced motion uses steady alpha.
 await page.goto(`${origin}/?autostart=1&level=6&finishLevel=1&capture=1`);await wait((s,b)=>s.player?.grounded&&b);
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await fixture({state:'attack',regentMove:'crown_nova',hp:100});
  await wait(s=>s.bossCues.vulnerability.attackPulseVisible);const alphas=[];
  for(let i=0;i<10;i++){alphas.push((await read()).bossCues.vulnerability.attackPulseAlpha);await page.waitForTimeout(55);}
  assert(reduced?Math.max(...alphas)-Math.min(...alphas)<.02:Math.max(...alphas)-Math.min(...alphas)>.1);
  if(!reduced)await page.screenshot({path:path.join(out,'void-attack-pulse.png')});
 }
 await fixture({state:'recover',regentMove:'crown_nova',hp:100});await wait((s,b)=>b.vulnerable);assert(!(await read()).bossCues.vulnerability.attackPulseVisible);
 // Strip equipment with real damage, then land an actual fist counter.
 for(let i=0;i<3;i++){
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1));
  await page.waitForTimeout(i===2?500:900);
 }
 assert.equal((await read()).equipment.active,'hands');
 await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(b.x+90,b.floorY);});
 await page.keyboard.press('ArrowLeft',{delay:30});await page.keyboard.down('Space');await wait((s,b)=>b.counterStunned,1500);await page.keyboard.up('Space');
 evidence.push({realFistStuns:true});
 await fixture({state:'recover',regentMove:'crown_nova',hp:100});
 await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(b.x,b.bodyTop-75);});
 await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:40});await wait((s,b)=>b.counterStunned&&b.buttBombHits>0,2000);
 evidence.push({realButtBombStuns:true});
 await page.setViewportSize({width:844,height:390});await fixture({state:'recover',regentMove:'crown_nova',hp:100});
 await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(b.x+170,b.floorY);});
 await page.keyboard.press('ArrowLeft',{delay:30});await page.keyboard.down('Space');await wait((s,b)=>b.counterStunned);await page.keyboard.up('Space');
 await page.screenshot({path:path.join(out,'phone-stunned.png')});evidence.push({phoneStunVisible:true});
 await page.goto(`${origin}/?autostart=1&level=5&capture=1&flightFinale=1`);
 await wait(s=>s.engine==='flight'&&s.player);
 let pursuer;
 for(let i=0;i<200;i++){
  const s=await read();pursuer=s.enemies.find(e=>e.kind==='pursuer');if(pursuer?.phase==='recover')break;
  await page.evaluate(()=>{window.__unknownFlightSetShipPosition(180,145);return window.advanceTime(100);});
 }
 assert.equal(pursuer.phase,'recover');
 await page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x-210,y),pursuer);await page.keyboard.down('Space');
 for(let i=0;i<40;i++){
  await page.evaluate(()=>window.advanceTime(20));pursuer=(await read()).enemies.find(e=>e.kind==='pursuer');if(pursuer?.counterStunned)break;
 }
 await page.keyboard.up('Space');assert(pursuer.counterStunned);assert.equal(pursuer.recoveryDurationMs,2000);
 await page.screenshot({path:path.join(out,'flight-stunned.png')});evidence.push({realFlightBossStun:true});
 assert.deepEqual((await read()).failedAssets,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(e){if(page){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(e),state:await page.evaluate(()=>JSON.parse(window.render_game_to_text())).catch(()=>null),evidence,errors},null,2));await page.screenshot({path:path.join(out,'failure.png')});}throw e;}
finally{await browser.close();}
