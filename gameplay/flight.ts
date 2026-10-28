import type { DifficultyMode } from '../types';
import { clearCombat, createCombat, resetCombat, stepCombat } from './flightCombat';
import type { FlightCombat } from './flightCombat';
import { PURSUER_CHECKPOINT, PURSUER_START } from './flightPursuer';
import { createAsteroidField, rockX, rockY } from './flightAsteroids';
import type { Rock } from './flightAsteroids';
import { FLIGHT_WEAPON_PICKUPS, weaponPickupY } from './flightWeapons';
import type { FlightWeaponId } from './flightWeapons';
import { SHIP_DEATH_DURATION_MS } from './flightDeath';
import type { ShipDeath } from './flightDeath';
export { rockX, rockY } from './flightAsteroids';

export const FLIGHT_END = 17000;
export const FLIGHT_SPEED = 230;
export const SHIP_BOUNDS = { left: 100, right: 910, top: 145, bottom: 475 };
export type FlightPhase = 'boarding' | 'launch' | 'flight' | 'respawn' | 'dying' | 'landing' | 'disembark' | 'complete' | 'gameover';
export const FLIGHT_BEACONS = [
  {distance:1650,y:255}, {distance:2750,y:350}, {distance:4150,y:300},
  {distance:5350,y:170}, {distance:7350,y:300}, {distance:8550,y:375},
  {distance:9900,y:180}, {distance:12650,y:280}, {distance:13850,y:440}, {distance:15150,y:310}
];
export interface FlightState {
  invincible?: boolean;
  phase: FlightPhase; phaseMs: number; clock: number; distance: number;
  x: number; y: number; vx: number; vy: number; hull: number; lives: number;
  checkpoint: number; invulnerableUntil: number; impacts: number; score: number;
  collected: number[]; difficulty: DifficultyMode;
  landingFromX: number; landingFromY: number;
  bank:number;combat:FlightCombat;travel:number;
  asteroidSeed:number;rocks:Rock[];
  collectedWeapons:number[];checkpointWeapons:number[];checkpointWeapon:FlightWeaponId;weaponChangedAt:number;
  death:ShipDeath|null;
  weaponHits:number;
}
export function createFlight(lives: number, score: number, difficulty: DifficultyMode,seed=Math.floor(Math.random()*4294967296)): FlightState {
  return { phase:'boarding', phaseMs:0, clock:0, distance:0, x:400,y:438,vx:0,vy:0,
    hull:100,lives,checkpoint:0,invulnerableUntil:0,impacts:0,score,collected:[],difficulty,landingFromX:240,landingFromY:295,bank:0,combat:createCombat(),travel:0,
    asteroidSeed:seed>>>0,rocks:createAsteroidField(seed),collectedWeapons:[],checkpointWeapons:[],checkpointWeapon:'twin',weaponChangedAt:-9999,death:null,weaponHits:0 };
}
const approach = (v:number,target:number,amount:number) => v<target?Math.min(target,v+amount):Math.max(target,v-amount);
export function setFlightPhase(s:FlightState, phase:FlightPhase) {s.phase=phase;s.phaseMs=0;}
export function damageShip(s:FlightState,amount?:number) {
  if(s.invincible)return false;
  if(s.phase!=='flight' || s.clock<s.invulnerableUntil)return false;
  s.hull=Math.max(0,s.hull-(amount??(s.difficulty==='EASY'?20:s.difficulty==='HARD'?26:32)));
  if(s.combat.weapon!=='twin'){
    s.weaponHits=s.hull===0?0:Math.max(0,s.weaponHits-1);
    if(s.weaponHits===0){s.combat.weapon='twin';s.checkpointWeapon='twin';s.weaponChangedAt=s.clock;}
  }
  s.impacts++;s.invulnerableUntil=s.clock+1600;s.vx=-110;
  if(s.hull===0){
    s.combat.weapon='twin';s.checkpointWeapon='twin';s.weaponHits=0;
    s.lives=Math.max(0,s.lives-1);
    s.death={id:s.impacts,x:s.x,y:s.y,bank:s.bank,startedAt:s.clock,final:s.lives===0};
    s.vx=s.vy=0;
    clearCombat(s.combat);
    setFlightPhase(s,s.lives>0?'respawn':'dying');
  }
  return true;
}
export function stepFlight(s:FlightState, ms:number, input:{x:number;y:number;fire?:boolean}) {
  if(s.phase==='complete' || s.phase==='gameover')return;
  const dt=ms/1000;
  s.clock+=ms;s.phaseMs+=ms;
  if(s.phase==='dying'){
    if(s.phaseMs>=SHIP_DEATH_DURATION_MS)setFlightPhase(s,'gameover');
    return;
  }
  if(s.phase==='boarding'){
    if(s.phaseMs>=2600)setFlightPhase(s,'launch');
    return;
  }
  if(s.phase==='launch'){
    const t=Math.min(1,s.phaseMs/1900),ease=t*t*(3-2*t);
    s.x=400-160*ease;s.y=438-143*ease;
    if(t===1)setFlightPhase(s,'flight');
    return;
  }
  if(s.phase==='respawn'){
    if(s.phaseMs>=1200){
      s.distance=s.checkpoint;s.x=240;s.y=295;s.vx=s.vy=0;s.hull=100;
      s.bank=0;resetCombat(s.combat,s.checkpoint);
      s.death=null;
      s.combat.weapon=s.checkpointWeapon;s.collectedWeapons=[...s.checkpointWeapons];s.weaponChangedAt=-9999;
      s.weaponHits=s.combat.weapon==='twin'?0:3;
      s.invulnerableUntil=s.clock+2500;setFlightPhase(s,'flight');
    }
    return;
  }
  if(s.phase==='landing'){
    const t=Math.min(1,s.phaseMs/2800),ease=t*t*(3-2*t);
    s.x=s.landingFromX+(650-s.landingFromX)*ease;s.y=s.landingFromY+(438-s.landingFromY)*ease;s.vx=s.vy=0;
    if(t===1)setFlightPhase(s,'disembark');
    return;
  }
  if(s.phase==='disembark'){
    if(s.phaseMs>=2100){s.score+=600;setFlightPhase(s,'complete');}
    return;
  }
  const length=Math.max(1,Math.hypot(input.x,input.y));
  const tx=input.x/length*340,ty=input.y/length*340;
  const accel=(v:number,t:number)=>t===0?2600:v*t<0?3000:2300;
  s.vx=approach(s.vx,tx,accel(s.vx,tx)*dt);
  s.vy=approach(s.vy,ty,accel(s.vy,ty)*dt);
  s.bank+=(Math.max(-10,Math.min(10,s.vy*.025))-s.bank)*(1-Math.exp(-ms/95));
  s.x=Math.max(SHIP_BOUNDS.left,Math.min(SHIP_BOUNDS.right,s.x+s.vx*dt));
  s.y=Math.max(SHIP_BOUNDS.top,Math.min(SHIP_BOUNDS.bottom,s.y+s.vy*dt));
  if(s.x===SHIP_BOUNDS.left || s.x===SHIP_BOUNDS.right)s.vx=0;
  if(s.y===SHIP_BOUNDS.top || s.y===SHIP_BOUNDS.bottom)s.vy=0;
  s.travel+=FLIGHT_SPEED*dt;
  s.distance=Math.min(s.combat.finaleDefeated?FLIGHT_END:PURSUER_START,s.distance+FLIGHT_SPEED*dt);
  const nextCheckpoint=s.distance>=PURSUER_CHECKPOINT?PURSUER_CHECKPOINT:s.distance>=11500?11500:s.distance>=6000?6000:0;
  if(nextCheckpoint>s.checkpoint){
    s.checkpoint=nextCheckpoint;s.score+=100;
    s.checkpointWeapon=s.combat.weapon;s.checkpointWeapons=[...s.collectedWeapons];
    if(nextCheckpoint===PURSUER_CHECKPOINT)s.hull=Math.min(100,s.hull+25);
  }
  for(const pickup of FLIGHT_WEAPON_PICKUPS){
    if(s.collectedWeapons.includes(pickup.id))continue;
    if(Math.abs(pickup.distance-s.distance-s.x)<76&&Math.abs(weaponPickupY(pickup,s.clock)-s.y)<44){
      s.collectedWeapons.push(pickup.id);s.combat.weapon=pickup.weapon;s.weaponHits=3;s.combat.nextShotAt=0;s.weaponChangedAt=s.clock;
    }
  }
  for(const rock of s.rocks){
    if(rock.hp<=0)continue;
    const dx=Math.max(0,Math.abs(rockX(rock,s.clock,s.distance)-s.x)-46);
    const dy=Math.max(0,Math.abs(rockY(rock,s.clock)-s.y)-16);
    if(dx*dx+dy*dy<rock.radius*rock.radius)damageShip(s);
  }
  const obstacles=s.rocks.filter(r=>r.hp>0).map(r=>({id:r.id,x:rockX(r,s.clock,s.distance),y:rockY(r,s.clock),radius:r.radius,hp:r.hp}));
  stepCombat(s,s.combat,ms,Boolean(input.fire),amount=>damageShip(s,amount),obstacles);
  for(const rock of obstacles)s.rocks[rock.id].hp=rock.hp;
  for(const [id,b] of FLIGHT_BEACONS.entries()){
    if(!s.collected.includes(id) && Math.hypot(b.distance-s.distance-s.x,b.y-s.y)<55){
      s.collected.push(id);s.score+=75;
    }
  }
  if(s.phase==='flight' && s.distance>=FLIGHT_END){
    clearCombat(s.combat);
    s.landingFromX=s.x;s.landingFromY=s.y;setFlightPhase(s,'landing');
  }
}
