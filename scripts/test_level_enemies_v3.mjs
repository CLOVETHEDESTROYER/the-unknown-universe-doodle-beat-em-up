import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const kind=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/level-enemies-v3/${kind}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[kind].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 13 landscape'],deviceScaleFactor:1}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
const shot=async name=>{const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));await fs.writeFile(new URL(name+'.png',out),Buffer.from(png.split(',')[1],'base64'));};
const place=(x,level)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y:level<=2?480:520});
const roster={1:'tagger',2:'bellkeeper',3:'boiler',4:'mantis',6:'mimic'};
const moves={tagger:'paint_skip',bellkeeper:'grave_chime',boiler:'coal_mortar',mantis:'returning_leaf',mimic:'rift_cross'};
try{
 for(const [levelText,foe] of Object.entries(roster)){
  if(process.env.GAME_TEST_LEVEL&&process.env.GAME_TEST_LEVEL!==levelText)continue;
  const level=Number(levelText);
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=zgod&sword=1`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded;}catch{return false;}},{},{timeout:60000});
  let s=await read();assert.deepEqual(s.failedAssets,[]);assert(s.enemies.some(e=>e.kind===foe),'New enemy appears in the actual campaign');
  assert(s.enemies.some(e=>e.kind==='walker'),'Opening grunt remains');
  if(level===4)assert(!s.enemies.some(e=>e.kind==='ghost'),'Forest no longer reuses graveyard ghost');
  assert(!s.enemies.some(e=>Object.values(roster).includes(e.kind)&&e.kind!==foe),'New identities are exclusive to their chapter');
  const campaignPlacements=s.enemies.filter(e=>e.kind===foe).map(e=>({x:e.x,y:e.y}));
  await place(80,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,12),foe);
  const frames=new Set();for(let n=0;n<7;n++){s=await read();frames.add(s.enemies[0].visualFrame);await page.waitForTimeout(60);}assert(frames.size>=2,'Locomotion animates');
  s=await wait(s=>s.enemies[0]?.attackState==='tell');const committed=s.enemies[0];assert(committed.warningVisible);assert.equal(committed.move,moves[foe]);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);const paused=(await read()).enemies[0].stateElapsedMs;await page.waitForTimeout(130);assert.equal((await read()).enemies[0].stateElapsedMs,paused);
  await page.keyboard.press('KeyP');await place(700,level);
  s=await wait(s=>s.enemies[0]?.attackState==='attack');assert.equal(s.enemies[0].attackDirection,committed.attackDirection);assert.equal(s.enemies[0].targetX,committed.targetX);
  const patterns=new Set(),velocities=new Set();let peakShots=0,returned=false,bounced=false,armed=false,seenDormant=false;
  const end=Date.now()+1500;let captured=false;
  while(Date.now()<end){
    s=await read();const projectiles=s.projectiles.filter(p=>p.sourceKind===foe);
    peakShots=Math.max(peakShots,projectiles.length);
    for(const p of projectiles){patterns.add(p.pattern);velocities.add(p.velocityX);returned||=p.returned;bounced||=p.bounces>0;armed||=p.armed;seenDormant||=!p.armed;}
    if(!captured&&Date.now()>end-1050){await shot(`${foe}-attack`);captured=true;}
    await page.waitForTimeout(25);
  }
  assert(peakShots>0,'Signature creates real projectiles');assert(armed,'Signature becomes damaging');
  assert((await read()).enemies[0].attacksCompleted>=1);
  if(foe==='tagger'){assert(peakShots>=2);assert(bounced,'Paint really bounces');}
  if(foe==='bellkeeper'){assert(peakShots>=2);assert(seenDormant,'Graves warn before arming');}
  if(foe==='boiler')assert(patterns.has('coal_burst'),'Coal lands and becomes explosion');
  if(foe==='mantis')assert(returned,'Thrown leaf reverses direction');
  if(foe==='mimic'){assert.equal(peakShots,4);assert(seenDormant);}
  // A real sword attack must remove the collider, award one kill, and finish four defeat poses.
  await place(220,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,1),foe);await page.waitForTimeout(90);
  const before=(await read()).progress;await page.keyboard.press('Space',{delay:45});
  s=await wait(s=>s.enemyDeaths.length>0);assert.equal(s.enemies.length,0);assert.equal(s.progress.monstersDefeated,before.monstersDefeated+1);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);const frozen=(await read()).enemyDeaths[0].frame;await shot(`${foe}-death`);
  await page.waitForTimeout(140);assert.equal((await read()).enemyDeaths[0].frame,frozen);await page.keyboard.press('KeyP');
  const deathFrames=new Set([String(frozen)]);await wait(s=>{s.enemyDeaths.forEach(d=>deathFrames.add(String(d.frame)));return !s.enemyDeaths.length;});
  assert(deathFrames.has('15'));assert(deathFrames.size>=2);assert.equal((await read()).progress.monstersDefeated,before.monstersDefeated+1);
  // Checkpoint retry clears signature hazards and warnings using the real fall/death path.
  await place(80,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,12),foe);
  await wait(s=>s.projectiles.some(p=>p.sourceKind===foe));await page.evaluate(()=>window.__unknownPlatformerForceFall());
  await wait(s=>s.player.y>700||s.player.x>100);
  await wait(s=>s.player.grounded&&s.player.x>100&&s.player.x<200,15000);
  s=await read();assert(!s.projectiles.some(p=>p.sourceKind===foe));assert(!s.enemies.some(e=>e.warningVisible));
  evidence.push({level,foe,campaignPlacements,movementFrames:frames.size,patterns:[...patterns],peakShots,returned,bounced,pause:true,deathFrames:[...deathFrames],retryCleanup:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,browser:kind,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
