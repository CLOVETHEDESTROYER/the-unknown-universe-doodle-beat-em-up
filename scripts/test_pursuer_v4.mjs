import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const engine=process.env.GAME_TEST_BROWSER||'chromium',device=process.env.GAME_TEST_DEVICE||'desktop';
const out=new URL(`../output/pursuer-v4/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const context=await browser.newContext({...device==='desktop'?{viewport:{width:1366,height:900}}:devices[device],deviceScaleFactor:1});
const page=await context.newPage(),errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies.find(e=>e.kind==='pursuer');
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x,y});
const shot=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,out))});
async function boot(extra=''){
 await page.keyboard.up('Space');await page.goto(`${origin}/?autostart=1&level=5&capture=1&flightFinale=1&flightSeed=20261017${extra}`);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player,null,{timeout:60000});
 assert.deepEqual((await read()).failedAssets,[]);await advance(0);
}
async function wait(fn,limit=12000){for(let t=0;t<limit;t+=40){const s=await read();if(fn(s,boss(s)))return s;await advance(40);}throw Error(`Timeout: ${fn}`);}
function dodgeY(s,b){
 if(b.move==='barrage'&&['tell','attack'].includes(b.phase))return b.safeY;
 const preferred=b.aimY<300?475:145;
 const threats=s.projectiles.filter(p=>p.enemyProjectile&&p.vx<0).map(p=>{const t=(110-p.x)/p.vx;return t>=0&&t<1.8?{y:p.y+p.vy*t,t}:null;}).filter(Boolean);
 return [145,195,250,300,350,405,475].sort((a,z)=>{
  const cost=y=>threats.reduce((n,p)=>n+Math.max(0,60-Math.abs(y-p.y))*(2-p.t),0)+Math.abs(y-preferred)*.015;
  return cost(a)-cost(z);
 })[0];
}
try{
 await boot();let s=await wait((s,b)=>b?.phase==='tell'),e=boss(s);assert.equal(e.maxHp,72);
 assert.equal(e.visualFrame,1);const travel=s.flight.travel;
 await place(650,e.y-20);await page.keyboard.down('Space');await advance(160);await page.keyboard.up('Space');
 s=await read();assert.equal(boss(s).hp,72);assert(s.combat.guardedHits>0);assert.equal(s.flight.distance,15400);assert(s.flight.travel>travel);evidence.guardAndScrolling=true;
 await page.keyboard.press('p');await page.waitForTimeout(50);const paused=await read();await advance(1200);assert.equal((await read()).mode,'paused');assert.deepEqual((await read()).enemies,paused.enemies);assert.equal((await read()).flight.travel,paused.flight.travel);
 await page.keyboard.press('p');await page.waitForTimeout(50);evidence.pause=true;
 const seen=new Set(),captured=new Set(),openings=[];let recovery='',openingHp=72,opening=null,oldPhase='',lastPhase=1;
 for(let i=0;i<2400;i++){
  s=await read();e=boss(s);if(!e)break;assert.equal(s.player.lives,3,'Positioned encounter cases survive');
  assert(e.phaseNumber>=lastPhase&&e.phaseNumber<=3);lastPhase=e.phaseNumber;
  const key=`${e.phaseNumber}:${e.move}`;
  if(e.phase==='tell'){
   seen.add(key);const mark={x:e.aimX,y:e.aimY,safeY:e.safeY,launchY:e.launchY};
   await place(100,dodgeY(s,e));await advance(40);const next=boss(await read());
   if(next?.phase==='tell')assert.deepEqual({x:next.aimX,y:next.aimY,safeY:next.safeY,launchY:next.launchY},mark,'Warnings do not retarget');
   if(!captured.has(`warning-${key}`)){await shot(`warning-${key.replace(':','-')}`);captured.add(`warning-${key}`);}
  }else if(['attack','charge'].includes(e.phase)){
   await page.keyboard.up('Space');await place(100,dodgeY(s,e));
   if(e.phaseMs>400&&!captured.has(`attack-${key}`)){await shot(`attack-${key.replace(':','-')}`);captured.add(`attack-${key}`);}
  }else if(e.phase==='recover'){
   assert.equal(e.recoveryDurationMs,e.phaseNumber===1?3000:2600);assert(e.vulnerable);
   if(oldPhase!=='recover'){
    recovery=`${e.phaseNumber}:${e.attacks}`;openingHp=e.hp;opening={phase:e.phaseNumber,clock:s.flight.travel,first:e.phaseMs};openings.push({phase:e.phaseNumber,duration:e.recoveryDurationMs});
    if(!captured.has(`opening-${e.phaseNumber}`)){await shot(`opening-${e.phaseNumber}`);captured.add(`opening-${e.phaseNumber}`);}
   }
   if(openingHp-e.hp<4&&e.phaseMs>380&&e.phaseMs<1700){await place(675,255);await page.keyboard.down('Space');}
   else{await page.keyboard.up('Space');await place(100,dodgeY(s,e));}
  }else{
   await page.keyboard.up('Space');await place(100,145);
   if(e.phase==='transition'){
    assert(opening&&e.phaseNumber===opening.phase+1);assert(e.phaseMs<1020);
    if(!captured.has(`phase-${e.phaseNumber}`)){
     const hp=e.hp;await place(675,280);await page.keyboard.down('Space');await advance(150);await page.keyboard.up('Space');assert.equal(boss(await read()).hp,hp,'Phase changes are protected');
     await shot(`phase-${e.phaseNumber}`);captured.add(`phase-${e.phaseNumber}`);
    }
   }
   if(e.phase==='dying'){
    assert.equal(s.projectiles.filter(p=>p.enemyProjectile).length,0);assert(!s.flight.finaleDefeated);
    const score=s.progress.score,frames=new Set();
    for(let t=0;t<2400;t+=80){const b=boss(await read());if(b?.death)frames.add(b.death.frame);await advance(80);}
    s=await read();assert(s.flight.finaleDefeated&&!boss(s));assert.equal(s.progress.score,score);assert.deepEqual([...frames].sort(),[0,1,2,3]);
    evidence.deathFrames=[...frames];break;
   }
  }
  oldPhase=e.phase;await advance(100);
 }
 const expected=[1,2,3].flatMap(p=>['fan','sweep','strafe','barrage'].map(m=>`${p}:${m}`)).sort();assert.deepEqual([...seen].sort(),expected,'Four attacks appear in all three phases');
 s=await read();assert(s.flight.finaleDefeated);assert.equal(s.combat.kills,1);assert(s.combat.enemyShots>100);
 evidence.patterns=[...seen];evidence.openings=openings;evidence.fight={hull:s.ship.hull,shots:s.combat.enemyShots,kills:s.combat.kills};
 await shot('cleared-approach');await advance(8000);assert(['landing','disembark'].includes((await read()).flight.phase));await advance(5000);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).level===6&&JSON.parse(window.render_game_to_text()).player?.grounded);assert.equal((await read()).player.lives,3);evidence.landing=true;

 // Real steering reaches a committed barrage lane before the first wall arrives.
 await boot();for(let t=0;t<40000;t+=100){s=await read();e=boss(s);if(e?.move==='barrage'&&e.phase==='tell')break;if(e)await place(100,dodgeY(s,e));await advance(100);}
 s=await read();e=boss(s);assert(e?.move==='barrage'&&e.phase==='tell');const target=e.safeY;
 await place(200,target===190?410:190);const key=target<(await read()).player.y?'ArrowUp':'ArrowDown';await page.keyboard.down(key);
 await wait(s=>Math.abs(s.player.y-target)<22,1500);await page.keyboard.up(key);await advance(150);s=await read();assert(Math.abs(s.player.y-target)<45);
 const hull=s.ship.hull;await shot('real-steering-safe-lane');await wait((s,b)=>b.phase==='recover',6000);assert.equal((await read()).ship.hull,hull);evidence.realSteeringBarrageDodge=true;

 await boot();await wait((s,b)=>b?.phase==='tell');await place(100,145);
 for(let i=0;i<9&&(await read()).flight.phase==='flight';i++){await page.evaluate(()=>window.__unknownFlightDamageShip());if((await read()).flight.phase==='flight')await advance(1700);}
 s=await read();assert.equal(s.flight.phase,'respawn');assert.equal(s.enemies.length,0);assert.equal(s.projectiles.length,0);await advance(1300);s=await read();assert.equal(s.flight.checkpoint,15300);assert.equal(s.ship.hull,100);assert.equal(s.player.lives,2);
 s=await wait((s,b)=>!!b);assert.equal(boss(s).hp,72);assert.equal(boss(s).phaseNumber,1);evidence.finalCheckpointRetry=true;
 for(const [difficulty,hp,damage] of [['HARD',92,14],['X-GOD',112,18]]){
  await boot(`&difficulty=${difficulty}`);s=await wait((s,b)=>b?.phase==='tell');assert.equal(boss(s).maxHp,hp);await place(100,475);
  s=await wait((s,b)=>s.projectiles.some(p=>p.enemyProjectile&&p.x<b.x-180&&p.y>160&&p.y<450));
  const bolt=s.projectiles.find(p=>p.enemyProjectile&&p.x<boss(s).x-180&&p.y>160&&p.y<450);assert.equal(bolt.damage,damage);
  const hull=(await read()).ship.hull;await place(bolt.x,bolt.y);await advance(25);assert.equal((await read()).ship.hull,hull-damage,'Configured plasma damage reaches the hull');
 }
 evidence.difficultyScaling=true;
 await boot('&character=zgod');s=await wait((s,b)=>b?.phase==='tell');await place(650,boss(s).y-20);await page.keyboard.down('Space');await wait((s,b)=>b?.phase==='dying');await page.keyboard.up('Space');assert.equal((await read()).ship.hull,100);evidence.zGodOneHit=true;
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(`${engine} ${device}: PASS — all 12 phase/attack combinations, real counters, warning/pause/guard checks, keyboard barrage dodge, four wreck frames, landing, retry and difficulty.`);
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}
finally{await browser.close();}
