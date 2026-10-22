import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const kind=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/enemy-motion-v2/${kind}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[kind].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const context=await browser.newContext({...devices['iPhone 13 landscape'],deviceScaleFactor:1});
const page=await context.newPage(),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
const shot=async name=>{
 const path=fileURLToPath(new URL(name+'.png',out));
 if(/-(attack|recover|death)$/.test(name)){
  const data=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));
  await fs.writeFile(path,Buffer.from(data.split(',')[1],'base64'));
 }else await page.screenshot({path});
};
const place=(x,level)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y:level<=2?480:520});
const fixture=foe=>page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe),foe);
const rosters={1:['walker','spider','dasher'],2:['walker','ghost','terror'],3:['walker','alien','giant'],4:['walker','spider','ghost'],6:['walker','cosmic','dasher']};
try{
 for(const [levelText,roster] of Object.entries(rosters)){
  const level=Number(levelText);
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=zgod&sword=1`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded;}catch{return false;}},{},{timeout:60000});
  let s=await read();assert.deepEqual(s.failedAssets,[]);
  assert.deepEqual([...new Set(s.enemies.filter(e=>e.kind!=='boss').map(e=>e.kind))].sort(),[...roster].sort());
  await shot('level-'+level+'-roster');
  for(const foe of roster){
   await place(80,level);await fixture(foe);s=await wait(s=>s.enemies.length===1);
   const frames=new Set();for(let n=0;n<7;n++){s=await read();frames.add(String(s.enemies[0].visualFrame));await page.waitForTimeout(70);}
   assert(frames.size>=2,`${foe} animates locomotion`);
   s=await wait(s=>s.enemies[0]?.attackState==='tell');const e=s.enemies[0];assert(e.warningVisible);assert(['8','9'].includes(String(e.visualFrame)));
   await page.keyboard.press('KeyP');await page.waitForTimeout(80);const paused=await read();await page.waitForTimeout(120);assert.equal((await read()).enemies[0].stateElapsedMs,paused.enemies[0].stateElapsedMs);
   await page.keyboard.press('KeyP');await place(690,level);
   s=await wait(s=>s.enemies[0]?.attackState==='attack');assert.equal(s.enemies[0].attackDirection,e.attackDirection);assert.equal(s.enemies[0].targetX,e.targetX);
   await page.waitForTimeout(100);s=await read();assert(['10','11'].includes(String(s.enemies[0].visualFrame)));await shot(`level${level}-${foe}-attack`);
   let peakShots=s.projectiles.filter(p=>p.enemyProjectile).length;
   s=await wait(s=>{peakShots=Math.max(peakShots,s.projectiles.filter(p=>p.enemyProjectile).length);return s.enemies[0]?.attackState==='recover';});
   assert(s.enemies[0].attacksCompleted>=1);
   if(foe==='alien'||foe==='giant'||foe==='cosmic'||level===4&&foe==='ghost')assert(peakShots>=2,`${foe} actually emits its volley`);
   if(level===4&&foe==='spider')assert(peakShots>=3,'Web fan has three projectiles');
   if(level===6&&foe==='dasher')assert(s.projectiles.some(p=>p.enemyProjectile&&p.sourceKind==='dasher'),'Rift rush ends with a real pulse');
   await shot(`level${level}-${foe}-recover`);
   // Use a real sword attack to defeat a fresh enemy, then prove the corpse has no collider/extra reward.
   await place(220,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,1),foe);
   await page.waitForTimeout(100);const before=(await read()).progress;const score=before.score,kills=before.monstersDefeated;
   await page.keyboard.press(foe==='ghost'?'KeyX':'Space',{delay:45});s=await wait(s=>s.enemyDeaths?.length>0);
   assert.equal(s.enemies.length,0);assert.equal(s.progress.monstersDefeated,kills+1);assert(s.progress.score>=score+150);
   const deathFrames=new Set(s.enemyDeaths.map(d=>String(d.frame)));
   await page.keyboard.press('KeyP');await page.waitForTimeout(80);const death=await read();await shot(`level${level}-${foe}-death`);
   await page.waitForTimeout(150);assert.equal((await read()).enemyDeaths[0].frame,death.enemyDeaths[0].frame);
   deathFrames.add(String(death.enemyDeaths[0].frame));
   await page.keyboard.press('KeyP');await wait(s=>{s.enemyDeaths.forEach(d=>deathFrames.add(String(d.frame)));return s.enemyDeaths.length===0;});
   assert(deathFrames.has('15'));assert(deathFrames.size>=2);assert.equal((await read()).progress.monstersDefeated,kills+1);
   if(foe!=='ghost')assert.equal((await read()).progress.score,score+150);
   evidence.push({level,foe,walkFrames:frames.size,lockedAttack:true,pause:true,nonCollidingDeath:true});
  }
 }
 // Ordinary X God takes the real claw hit, then his actual blaster triggers the same death path.
 await page.goto(`${origin}/?autostart=1&capture=1&level=1&character=xgod`);
 await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded;}catch{return false;}},{},{timeout:60000});
 await place(220,1);await fixture('walker');
 let hit=await wait(s=>s.player.health<100);assert(hit.player.health>0);assert.equal(hit.enemies[0].move,'claw_lunge');
 await place(220,1);await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',1));
 const kills=(await read()).progress.monstersDefeated;
 await page.keyboard.press('Space',{delay:45});await wait(s=>s.enemyDeaths.length>0);
 assert.equal((await read()).progress.monstersDefeated,kills+1);assert((await read()).weapon.shotsFired>0);
 await shot('xgod-blaster-death');
 evidence.push({actualClawDamage:true,actualXGodBlasterDeath:true});
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,browser:kind,encounters:evidence.length,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
