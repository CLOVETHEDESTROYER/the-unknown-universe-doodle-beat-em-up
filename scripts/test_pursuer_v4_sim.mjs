import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const out=new URL('../output/pursuer-v4/simulation/',import.meta.url);await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/flightPursuer.ts','gameplay/flightCombat.ts','gameplay/flight.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(out),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {startPursuer,stepPursuer,pursuerSweepPoint,PURSUER_HEALTH}=await import(new URL('flightPursuer.mjs',out));
const {createCombat,stepCombat}=await import(new URL('flightCombat.mjs',out));
const {createFlight,stepFlight}=await import(new URL('flight.mjs',out));
const evidence=[];
const host=(difficulty='EASY')=>({x:240,y:295,bank:0,clock:0,distance:15400,checkpoint:15300,hull:100,score:0,difficulty,phase:'flight'});
for(const difficulty of ['EASY','HARD','X-GOD'])for(const phase of [1,2,3]){
 const s=host(difficulty),c=createCombat();startPursuer(s,c);const e=c.enemies[0];assert.equal(e.hp,PURSUER_HEALTH[difficulty]);
 e.phaseNumber=phase;e.phase='recover';e.phaseMs=4000;e.attackIndex=-1;
 const tick=()=>{s.clock+=1000/120;e.age+=1000/120;e.phaseMs+=1000/120;stepPursuer(s,c,e,1000/120,()=>{});};
 tick();const seen=[];
 for(let n=0;n<4;n++){
  assert.equal(e.phase,'tell');const mark={aimX:e.aimX,aimY:e.aimY,safeY:e.safeY,launchY:e.launchY};const tell=e.tellDurationMs,move=e.move;
  assert(tell>=750);s.x=450;s.y=475-s.y+145;
  while(e.phase==='tell'){tick();assert.deepEqual({aimX:e.aimX,aimY:e.aimY,safeY:e.safeY,launchY:e.launchY},mark);}
  const shots=c.enemyShots,positions=[],shotStart=c.bolts.length;
  while(e.phase!=='recover'){
   if(e.phase==='charge'){const point=pursuerSweepPoint(e,Math.min(1,e.phaseMs/([1750,1550,1400][phase-1])));assert(Math.abs(e.x-point.x)<14);}
   tick();positions.push([e.x,e.y]);assert(e.x>=234&&e.x<=861&&e.y>=184&&e.y<=436);
  }
  assert(Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0]))>35,move+' moves horizontally');
  if(move!=='barrage')assert(Math.max(...positions.map(p=>p[1]))-Math.min(...positions.map(p=>p[1]))>40,move+' moves vertically');
  const fired=c.bolts.slice(shotStart);const expected=move==='fan'?[3,10,14][phase-1]:move==='strafe'?[3,8,15][phase-1]:move==='sweep'?[0,2,4][phase-1]:null;
  if(expected!==null)assert.equal(c.enemyShots-shots,expected);
  if(move==='barrage'){
   assert(fired.length>=6);assert(fired.every(b=>Math.abs(b.y-e.safeY)>75));
   for(const y of [e.safeY-50,e.safeY,e.safeY+50])assert(fired.every(b=>Math.abs(b.y-y)>21),'Marked corridor clears the real projectile hitbox');
   assert(Math.abs(e.safeY-mark.aimY)/340+0.18<tell/1000,'The lane is reachable before firing');
  }
  const duration=phase===1?3000:2600;
  while(e.phaseMs<duration-20)tick();assert.equal(e.phase,'recover');
  seen.push({move,shots:c.enemyShots-shots,tell,duration,xRange:[Math.min(...positions.map(p=>p[0])),Math.max(...positions.map(p=>p[0]))],yRange:[Math.min(...positions.map(p=>p[1])),Math.max(...positions.map(p=>p[1]))]});
  while(e.phase==='recover')tick();
 }
 assert.equal(new Set(seen.map(x=>x.move)).size,4);evidence.push({difficulty,phase,patterns:seen});
}
// Damage cannot interrupt a full counter opening or hit a protected transition.
{
 const s=host(),c=createCombat();c.spawnedWaves=[0,1,2,3,4];startPursuer(s,c);const e=c.enemies[0];
 e.phase='recover';e.phaseMs=0;e.startX=e.x=835;e.startY=e.y=300;e.hp=45;
 const tick=ms=>{s.clock+=ms;stepCombat(s,c,ms,false,()=>false,[]);};
 for(let n=0;n<290;n++)tick(10);assert.equal(e.phase,'recover');assert.equal(e.phaseNumber,1);
 tick(100);assert.equal(e.phase,'transition');assert.equal(e.phaseNumber,2);
 c.bolts.push({id:c.nextId++,owner:'player',x:e.x-5,y:e.y,vx:0,vy:0,damage:99,expires:s.clock+1000});tick(10);assert.equal(e.hp,45);assert(c.guardedHits>0);
 e.phase='recover';e.phaseMs=0;e.hp=20;e.startX=e.x;e.startY=e.y;
 for(let n=0;n<250;n++)tick(10);assert.equal(e.phaseNumber,2);assert.equal(e.phase,'recover');tick(100);assert.equal(e.phaseNumber,3);assert.equal(e.phase,'transition');
}
// A stationary pilot is pressured, while the committed green corridor is safe.
{
 const s=createFlight(3,0,'EASY',20261017);s.phase='flight';s.distance=s.checkpoint=15300;s.x=240;s.y=295;s.rocks=[];
 for(let t=0;t<35000&&s.phase==='flight';t+=1000/120)stepFlight(s,1000/120,{x:0,y:0});
 assert(s.impacts>0,'Standing still takes damage');
 evidence.push({stationaryPilot:{impacts:s.impacts,hull:s.hull,lives:s.lives}});
}
await fs.writeFile(new URL('../simulation-results.json',out),JSON.stringify(evidence,null,2));
console.log('PASS: 36 difficulty/phase/pattern combinations, fixed warnings, movement bounds, shot escalation, reachable safe lanes, full counter windows, protected phase changes and idle-pilot pressure.');
