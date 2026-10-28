import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const out=new URL('../output/flight-pressure-v3/simulation/',import.meta.url);
await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/flightCombat.ts','gameplay/flight.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(out),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {FLIGHT_WAVES,createCombat,resetCombat,stepCombat,flightChargeEnd}=await import(new URL('flightCombat.mjs',out));
const {createFlight,stepFlight,damageShip}=await import(new URL('flight.mjs',out));
const host=(difficulty='EASY')=>({x:240,y:300,bank:0,clock:0,distance:0,checkpoint:0,hull:100,score:0,difficulty,phase:'flight'});
const evidence=[];
assert.equal(FLIGHT_WAVES.length,13);
assert.equal(FLIGHT_WAVES.reduce((n,w)=>n+w.ys.length,0),28);
assert(FLIGHT_WAVES.every((w,i)=>!i||(w.at-FLIGHT_WAVES[i-1].at)/230<5.5));

for(const difficulty of ['EASY','HARD','X-GOD']){
  const s=host(difficulty),c=createCombat(),seen=new Map(),shots=new Map();let maxActive=0,maxBolts=0;
  const tick=(ms=1000/120)=>{s.clock+=ms;s.distance=Math.min(15400,s.distance+230*ms/1000);stepCombat(s,c,ms,false,()=>false,[]);};
  while(s.distance<15400){
    tick();maxActive=Math.max(maxActive,c.enemies.length);maxBolts=Math.max(maxBolts,c.bolts.length);
    for(const e of c.enemies){
      if(e.kind==='pursuer')continue;
      if(!seen.has(e.id))seen.set(e.id,{kind:e.kind,entry:e.entry,initial:{x:e.x,y:e.y},phases:new Set(),xs:[],ys:[],hp:e.hp});
      const record=seen.get(e.id);record.phases.add(e.phase);
      if(!['incoming','enter'].includes(e.phase)){record.xs.push(e.x);record.ys.push(e.y);}
      if(e.phase==='incoming'){
        assert.equal(e.y,e.entry==='above'?60:560);assert(e.phaseMs<(e.entryDelayMs??950)+10);
        assert(!c.bolts.some(b=>b.owner==='enemy'&&b.x===e.x&&b.y===e.y));
      }
      assert(Number.isFinite(e.x)&&Number.isFinite(e.y));
    }
    for(const b of c.bolts)if(b.owner==='enemy')shots.set(b.id,b.damage);
  }
  assert.equal(seen.size,28);assert.equal(c.spawnedWaves.length,13);
  assert.equal(c.enemies.length,1);assert.equal(c.enemies[0].kind,'pursuer');assert(c.finaleStarted);
  const entries=[...new Set([...seen.values()].map(e=>e.entry))];assert.deepEqual(entries.sort(),['above','below','front']);
  for(const e of seen.values()){
    assert(e.hp>(e.kind==='scout'?2.3:e.kind==='interceptor'?4.6:e.kind==='prism'?6.9:difficulty==='EASY'?9.2:difficulty==='HARD'?11.5:13.8),'Each ordinary role is tougher than its earlier health');
    if(e.entry!=='front'){assert(e.phases.has('incoming'));assert(e.phases.has('enter'));}
    if(e.kind==='gunship'||e.kind==='prism'){
      if(e.xs.length>500){assert(Math.max(...e.xs)-Math.min(...e.xs)>65);assert(Math.max(...e.ys)-Math.min(...e.ys)>65);}
    }
  }
  assert(maxActive<=9,`Bound simultaneous enemies: ${maxActive}`);assert(maxBolts<60);
  assert(c.enemyShots>55,'Continuous combat pressure');
  evidence.push({difficulty,ships:seen.size,entries,maxActive,maxBolts,enemyShots:c.enemyShots});
}

// Vertical arrivals cannot hit or fire during their warning; a charge never re-aims.
for(const entry of ['above','below']){
  const w=FLIGHT_WAVES.find(w=>w.kind==='interceptor'&&w.entry===entry);
  const s=host(),c=createCombat();s.distance=w.at;
  c.spawnedWaves=FLIGHT_WAVES.flatMap((wave,i)=>wave!==w?[i]:[]);
  const tick=ms=>{s.clock+=ms;stepCombat(s,c,ms,false,()=>{throw new Error('Unexpected contact');},[]);};
  tick(0);const e=c.enemies[0];s.x=e.x;s.y=e.y;
  for(let n=0;n<90;n++)tick(10);
  assert.equal(e.phase,'incoming');assert.equal(c.enemyShots,0);
  s.x=240;s.y=300;
  while(e.phase!=='tell')tick(10);
  assert(e.y>=145&&e.y<=475);const aim=[e.aimX,e.aimY],end=flightChargeEnd(e);
  assert(end.x<e.x);s.y=475;
  while(e.phase!=='charge')tick(10);
  for(let n=0;n<40;n++)tick(10);
  assert.deepEqual([e.aimX,e.aimY],aim);assert.deepEqual(flightChargeEnd(e),end);
  assert(e.y!==e.baseY&&e.x<e.startX-100);
}

// The paired scout volley contains an aimed shot as well as a flanking shot.
{
  const s=host(),c=createCombat(),damage=[];c.spawnedWaves=FLIGHT_WAVES.map((_,i)=>i);
  c.enemies=[{id:'scout-aim',kind:'scout',x:825,y:300,baseY:300,hp:8,maxHp:8,age:0,phase:'weave',phaseMs:0,aimX:0,aimY:0,startX:825,startY:300}];
  for(let n=0;n<500&&!damage.includes(9);n++){s.clock+=10;stepCombat(s,c,10,false,amount=>{damage.push(amount);return true;},[]);}
  assert(damage.includes(9),'One paired scout shot aims directly at the locked mark; idling between a symmetric fan is not safe');
}

// Edge targets remain on the visible charge ray after clipping travel to the arena.
for(const [x,y] of [[100,145],[100,475],[910,145],[910,475]]){
  const s=host(),c=createCombat();s.x=x;s.y=y;c.spawnedWaves=FLIGHT_WAVES.map((_,i)=>i);
  const e={id:'edge-charge',kind:'interceptor',x:730,y:335,baseY:335,hp:6,maxHp:6,age:0,phase:'enter',phaseMs:0,aimX:0,aimY:0,startX:730,startY:335};c.enemies=[e];
  stepCombat(s,c,10,false,()=>false,[]);assert.equal(e.phase,'tell');const end=flightChargeEnd(e);
  assert(end.x>=-110-1e-6&&end.x<=1040+1e-6&&end.y>=120-1e-6&&end.y<=495+1e-6);
  assert(Math.abs((end.x-e.x)*(e.aimY-e.y)-(end.y-e.y)*(e.aimX-e.x))<1e-6,'The marked target is on the actual charge ray');
  assert(Math.hypot(end.x-e.x,end.y-e.y)>=Math.hypot(e.aimX-e.x,e.aimY-e.y));
}

// Every role remains damageable, with rewards/death art and gunship repairs.
for(const kind of ['scout','interceptor','gunship','prism']){
  const s=host(),c=createCombat();c.spawnedWaves=FLIGHT_WAVES.map((_,i)=>i);
  const e={id:kind,kind,x:720,y:300,baseY:300,hp:1,maxHp:1,age:0,phase:kind==='scout'?'weave':'tell',phaseMs:0,aimX:240,aimY:300,startX:720,startY:300};c.enemies=[e];
  c.bolts.push({id:1,owner:'player',x:720,y:300,vx:0,vy:0,damage:1,expires:2000});
  stepCombat(s,c,10,false,()=>false,[]);
  assert.equal(c.enemies.length,0);assert.deepEqual(c.defeated,[kind]);assert(s.score>=100);
  assert(c.effects.some(fx=>fx.kind==='destroy'&&fx.source===kind));assert.equal(c.repairs.length,kind==='gunship'?1:0);
}

// Retry credits stay stable; a checkpoint resumes its next wave without an instant pile-up.
for(const checkpoint of [0,6000,11500,15300]){
  const s=host(),c=createCombat();s.distance=checkpoint;c.defeated=['0:0'];resetCombat(c,checkpoint);
  stepCombat(s,c,10,false,()=>false,[]);assert.equal(c.enemies.length,0);
  s.distance=checkpoint===15300?15400:FLIGHT_WAVES.find(w=>w.at>checkpoint).at;
  s.clock+=10;stepCombat(s,c,10,false,()=>false,[]);
  assert(c.enemies.length>0);assert(!c.enemies.some(e=>e.id==='0:0'));
}
// A finale entered from a direct checkpoint never respawns old waves, even on a large time step.
{
  const s=host(),c=createCombat();s.distance=15400;stepCombat(s,c,10,false,()=>false,[]);
  assert.deepEqual(c.enemies.map(e=>e.kind),['pursuer']);
}
// Natural flight progression, fatal cleanup and checkpoint restart use the real integration.
{
  const s=createFlight(3,0,'EASY',20261016);s.invincible=true;
  for(let n=0;n<7800&&!s.combat.finaleStarted;n++)stepFlight(s,10,{x:0,y:0});
  assert(s.combat.finaleStarted);assert.equal(s.checkpoint,15300);assert(s.combat.spawnedWaves.length===13);
  s.invincible=false;s.invulnerableUntil=0;assert(damageShip(s,100));assert.equal(s.phase,'respawn');assert.equal(s.combat.enemies.length,0);assert.equal(s.combat.bolts.length,0);
  stepFlight(s,1200,{x:0,y:0});assert.equal(s.phase,'flight');assert.equal(s.distance,15300);
  for(let n=0;n<50;n++)stepFlight(s,10,{x:0,y:0});assert.equal(s.combat.enemies.length,1);assert.equal(s.combat.enemies[0].kind,'pursuer');
}
await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,evidence,verticalWarnings:true,committedCharges:true,rewards:true,checkpoints:true,finale:true},null,2));
console.log(JSON.stringify({passed:true,evidence,verticalWarnings:true,committedCharges:true,rewards:true,checkpoints:true,finale:true}));
