import {regularEnemyHealth} from './enemyBalance';
import type { DifficultyMode } from '../types';
import { PURSUER_ID, PURSUER_START, startPursuer, stepPursuer } from './flightPursuer';
import type { PursuerMove } from './flightPursuer';
import { FLIGHT_WEAPONS } from './flightWeapons';
import type { FlightWeaponId } from './flightWeapons';

export type EnemyKind='scout'|'interceptor'|'gunship'|'prism'|'pursuer';
type EnemyPhase='incoming'|'enter'|'weave'|'tell'|'charge'|'recover'|'exit'|'attack'|'transition'|'dying';
export type FlightEntry='front'|'above'|'below';
export interface FlightEnemy {
  id:string;kind:EnemyKind;x:number;y:number;baseY:number;hp:number;maxHp:number;age:number;
  phase:EnemyPhase;phaseMs:number;aimX:number;aimY:number;startX:number;startY:number;
  move?:PursuerMove;phaseNumber?:number;attacks?:number;volley?:number;
  attackIndex?:number;launchY?:number;targetY?:number;safeY?:number;tellDurationMs?:number;
  hitUntil?:number;
  entry?:FlightEntry;entryDelayMs?:number;stageX?:number;
  chargeX?:number;chargeY?:number;
}
export interface FlightBolt {id:number;owner:'player'|'enemy';x:number;y:number;vx:number;vy:number;expires:number;damage:number;
  weapon?:FlightWeaponId;pierces?:number;hitIds?:string[];targetId?:string;sourceId?:string}
export interface CombatEffect {id:number;kind:'hit'|'destroy'|'blocked'|'muzzle'|'repair';x:number;y:number;expires:number;born:number;duration:number;size:number;source?:'asteroid'|EnemyKind}
export interface CombatRock {id:number;x:number;y:number;radius:number;hp:number}
export interface FlightCombat {
  enemies:FlightEnemy[];bolts:FlightBolt[];effects:CombatEffect[];
  repairs:{id:number;x:number;y:number;expires:number}[];
  spawnedWaves:number[];defeated:string[];nextId:number;nextShotAt:number;
  shotsFired:number;hits:number;guardedHits:number;rockBlocks:number;enemyShots:number;repairsCollected:number;
  rockHits:number;rocksDestroyed:number;
  waveNoticeUntil:number;waveName:string;
  finaleStarted:boolean;finaleDefeated:boolean;
  weapon:FlightWeaponId;
}
export interface CombatHost {x:number;y:number;bank:number;clock:number;distance:number;checkpoint:number;hull:number;score:number;difficulty:DifficultyMode;phase:string;invincible?:boolean}
type Host=CombatHost;
export const FLIGHT_WAVES:{at:number;kind:EnemyKind;ys:number[];name:string;entry?:FlightEntry}[]=[
  {at:650,kind:'scout',ys:[210,300,390],name:'SCOUT FORMATION — OPEN FIRE!'},
  {at:1850,kind:'scout',ys:[215,325],entry:'above',name:'SCOUTS ABOVE — WATCH THE TOP EDGE'},
  {at:3100,kind:'interceptor',ys:[215,410],name:'INTERCEPTORS — LEAVE THE MARK'},
  {at:4200,kind:'gunship',ys:[365],entry:'below',name:'GUNSHIP BELOW — WATCH THE BOTTOM EDGE'},
  {at:5350,kind:'scout',ys:[205,310,415],name:'SCOUT SWARM — KEEP MOVING'},
  {at:6550,kind:'interceptor',ys:[200,335],entry:'above',name:'DIVE ATTACK — INTERCEPTORS ABOVE'},
  {at:7700,kind:'prism',ys:[245,390],name:'PRISM RAYS — DODGE THE LASER LANES'},
  {at:8900,kind:'scout',ys:[285,420],entry:'below',name:'SCOUTS BELOW — WATCH THE BOTTOM EDGE'},
  {at:10050,kind:'gunship',ys:[255],entry:'above',name:'HEAVY GUNSHIP ABOVE — DODGE THE FAN'},
  {at:11250,kind:'scout',ys:[205,310,415],name:'SCOUT SWARM — CLEAR A LANE'},
  {at:12400,kind:'interceptor',ys:[285,420],entry:'below',name:'RISING INTERCEPTORS — LEAVE THE MARK'},
  {at:13550,kind:'prism',ys:[230,365],entry:'above',name:'PRISM RAYS ABOVE — WATCH THE LASERS'},
  {at:14650,kind:'scout',ys:[210,310,410],name:'LAST DEFENSE — PUSH THROUGH!'}
];
export function createCombat():FlightCombat {
  return {enemies:[],bolts:[],effects:[],repairs:[],spawnedWaves:[],defeated:[],nextId:1,nextShotAt:0,
    shotsFired:0,hits:0,guardedHits:0,rockBlocks:0,rockHits:0,rocksDestroyed:0,enemyShots:0,repairsCollected:0,waveNoticeUntil:0,waveName:'',finaleStarted:false,finaleDefeated:false,weapon:'twin'};
}
export function clearCombat(c:FlightCombat){c.enemies=[];c.bolts=[];c.effects=[];c.repairs=[];c.waveNoticeUntil=0;}
export function resetCombat(c:FlightCombat,checkpoint:number){
  clearCombat(c);c.spawnedWaves=FLIGHT_WAVES.flatMap((w,id)=>w.at<checkpoint?[id]:[]);c.nextShotAt=0;
  c.finaleStarted=false;c.finaleDefeated=c.defeated.includes(PURSUER_ID);
}
export function shipMuzzles(s:Pick<Host,'x'|'y'|'bank'>){
  const a=s.bank*Math.PI/180;
  return [16,20].map(y=>({x:s.x+84*Math.cos(a)-y*Math.sin(a),y:s.y+84*Math.sin(a)+y*Math.cos(a)}));
}
const effect=(c:FlightCombat,s:Host,kind:CombatEffect['kind'],x:number,y:number,size=125,source?:CombatEffect['source'])=>{
  const duration=kind==='destroy'?850:kind==='repair'?800:120;
  c.effects.push({id:c.nextId++,kind,x,y,born:s.clock,duration,expires:s.clock+duration,size,source});
};
function phase(e:FlightEnemy,p:EnemyPhase,s:Host){
  e.phase=p;e.phaseMs=0;
  if(p==='recover'){e.startX=e.x;e.startY=e.y;}
  if(p==='weave')e.startY=e.y;
  if(p==='tell'){
    e.aimX=s.x;e.aimY=s.y;e.startX=e.x;e.startY=e.y;
    // Commit the whole charge before the warning; never home in on a dodging pilot.
    const a=Math.atan2(e.aimY-e.y,e.aimX-e.x),ux=Math.cos(a),uy=Math.sin(a);
    const distance=Math.min(Math.hypot(e.aimX-e.x,e.aimY-e.y)+170,
      ux>0?(1040-e.x)/ux:ux<0?(-110-e.x)/ux:Infinity,
      uy>0?(495-e.y)/uy:uy<0?(120-e.y)/uy:Infinity);
    // Clip travel along the ray so even an edge target stays on the warned path.
    e.chargeX=e.x+ux*distance;e.chargeY=e.y+uy*distance;
  }
}
export function flightChargeEnd(e:FlightEnemy){
  return {x:e.chargeX??e.aimX-170,y:e.chargeY??e.aimY};
}
export function flightEnemyMuzzle(e:FlightEnemy){
  const offset=e.kind==='pursuer'?102:e.kind==='gunship'?78:e.kind==='scout'?25:55;
  return e.x+(e.kind!=='pursuer'&&e.aimX>e.x?offset:-offset);
}
function stepEntry(e:FlightEnemy,s:Host,dt:number){
  if(e.phase==='incoming'){
    if(e.phaseMs>=(e.entryDelayMs??950)){
      e.startX=e.x;e.startY=e.y;phase(e,'enter',s);
    }
    return true;
  }
  if(e.phase!=='enter')return false;
  if(e.entry&&e.entry!=='front'){
    const t=Math.min(1,e.phaseMs/1250),ease=t*t*(3-2*t);
    e.x=e.startX+((e.stageX??825)-e.startX)*ease;
    e.y=e.startY+(e.baseY-e.startY)*ease;
    if(t===1)phase(e,e.kind==='scout'?'weave':'tell',s);
  }else{
    const speed=e.kind==='scout'?185:e.kind==='gunship'?155:205;
    e.x-=speed*dt;e.y=e.baseY+Math.sin(e.age/450)*30;
    if(e.x<=(e.stageX??(e.kind==='prism'?825:835)))phase(e,e.kind==='scout'?'weave':'tell',s);
  }
  return true;
}
function stepRegularEnemy(e:FlightEnemy,s:Host,c:FlightCombat,dt:number){
  if(stepEntry(e,s,dt))return;
  const muzzle=()=>flightEnemyMuzzle(e);
  const emit=(x:number,y:number,a:number,speed:number,damage:number)=>{
    const vx=Math.cos(a)*speed,vy=Math.sin(a)*speed;
    c.bolts.push({id:c.nextId++,owner:'enemy',x,y,vx:Math.abs(vx)<1e-9?0:vx,vy:Math.abs(vy)<1e-9?0:vy,expires:s.clock+3100,damage});c.enemyShots++;
  };
  if(e.kind==='scout'){
    e.x-=175*dt;
    const target=Math.max(150,Math.min(470,e.baseY+Math.sin(e.age/360+e.baseY)*60));
    const settle=e.phase==='weave'?Math.min(1,e.phaseMs/350):1;
    e.y=e.startY+(target-e.startY)*settle;
    if(e.phase==='weave'&&e.phaseMs>=900&&e.x>120)phase(e,'tell',s);
    else if(e.phase==='tell'&&e.phaseMs>=650){
      const a=Math.atan2(e.aimY-e.y,e.aimX-muzzle());
      for(const spread of [0,Math.floor(e.age/1800)%2?.16:-.16])emit(muzzle(),e.y,a+spread,290,9);
      phase(e,'attack',s);
    }else if(e.phase==='attack'&&e.phaseMs>=220)phase(e,'recover',s);
    else if(e.phase==='recover'&&e.phaseMs>=500)phase(e,'weave',s);
    return;
  }
  if(e.kind==='interceptor'){
    if(e.phase==='tell'&&e.phaseMs>=(s.difficulty==='EASY'?1000:850))phase(e,'charge',s);
    if(e.phase==='charge'){
      const t=Math.min(1,e.phaseMs/950),end=flightChargeEnd(e);
      e.x=e.startX+(end.x-e.startX)*t;e.y=e.startY+(end.y-e.startY)*t;
      if(t===1)phase(e,'exit',s);
    }else if(e.phase==='exit')e.x-=600*dt;
    return;
  }
  // Heavy ships reposition in both axes while reloading. Their warning/attack stays fixed.
  if(e.phase==='recover'){
    const t=Math.min(1,e.phaseMs/450),ease=t*t*(3-2*t);
    e.x=e.startX+((e.stageX??825)+Math.sin(e.age/620)*65-e.startX)*ease;
    e.y=e.startY+(Math.max(155,Math.min(465,e.baseY+Math.sin(e.age/470)*65))-e.startY)*ease;
    if(e.phaseMs>=(e.kind==='prism'?1050:1250))phase(e,e.age>10000?'exit':'tell',s);
  }else if(e.phase==='exit')e.x-=280*dt;
  if(e.kind==='prism'){
    if(e.phase==='tell'&&e.phaseMs>=850){e.volley=0;phase(e,'attack',s);}
    else if(e.phase==='attack'){
      const volley=e.volley??0;
      if(volley<3&&e.phaseMs>=volley*200){
        const y=Math.max(145,Math.min(475,e.aimY+[-65,0,65][volley]));
        emit(muzzle(),y,e.aimX>e.x?0:Math.PI,380,11);e.volley=volley+1;
      }
      if(e.phaseMs>=650)phase(e,'recover',s);
    }
  }else if(e.phase==='tell'&&e.phaseMs>=1000){
    const a=Math.atan2(e.aimY-e.y,e.aimX-muzzle());
    for(const spread of [-.18,0,.18])emit(muzzle(),e.y,a+spread,330,s.difficulty==='EASY'?12:s.difficulty==='HARD'?16:20);
    phase(e,'recover',s);
  }
}
function fireWeapon(s:Host,c:FlightCombat){
  const def=FLIGHT_WEAPONS[c.weapon],muzzles=shipMuzzles(s),a=s.bank*Math.PI/180;
  c.nextShotAt=s.clock+def.interval;
  const emit=(p:{x:number;y:number},angle:number)=>{
    c.bolts.push({id:c.nextId++,owner:'player',...p,vx:def.speed*Math.cos(angle),vy:def.speed*Math.sin(angle),
      expires:s.clock+(c.weapon==='homing'?2300:1500),damage:def.damage,weapon:c.weapon,
      ...(c.weapon==='lance'?{pierces:4,hitIds:[]}:{} )});
    c.shotsFired++;
  };
  if(c.weapon==='spread')[-.22,-.11,0,.11,.22].forEach((spread,i)=>emit(muzzles[i%2],a+spread));
  else if(c.weapon==='lance')emit({x:(muzzles[0].x+muzzles[1].x)/2,y:(muzzles[0].y+muzzles[1].y)/2},a);
  else muzzles.forEach(p=>emit(p,a));
  muzzles.forEach(p=>effect(c,s,'muzzle',p.x,p.y));
}
function steerMissile(b:FlightBolt,c:FlightCombat,rocks:CombatRock[],dt:number){
  const targets=[...c.enemies.filter(e=>e.hp>0&&e.phase!=='dying'&&e.x>b.x-20&&e.x<1150).map(e=>({id:e.id,x:e.x,y:e.y,priority:0})),
    ...rocks.filter(r=>r.hp>0&&r.x>b.x+10&&r.x<1150).map(r=>({id:`rock:${r.id}`,x:r.x,y:r.y,priority:220}))];
  let target=targets.find(t=>t.id===b.targetId);
  if(!target)target=targets.filter(t=>Math.hypot(t.x-b.x,t.y-b.y)<730)
    .sort((u,v)=>Math.hypot(u.x-b.x,u.y-b.y)+u.priority-Math.hypot(v.x-b.x,v.y-b.y)-v.priority)[0];
  if(!target){b.targetId=undefined;return;}
  b.targetId=target.id;
  const angle=Math.atan2(b.vy,b.vx),wanted=Math.atan2(target.y-b.y,target.x-b.x);
  const delta=Math.atan2(Math.sin(wanted-angle),Math.cos(wanted-angle));
  const next=angle+Math.max(-3.4*dt,Math.min(3.4*dt,delta));
  b.vx=Math.cos(next)*FLIGHT_WEAPONS.homing.speed;b.vy=Math.sin(next)*FLIGHT_WEAPONS.homing.speed;
}
function spendHit(b:FlightBolt,key:string){
  if(b.weapon==='lance'){
    b.hitIds!.push(key);b.pierces=(b.pierces??1)-1;
    if(b.pierces<=0)b.expires=0;
  }else b.expires=0;
}
export function stepCombat(s:Host,c:FlightCombat,ms:number,fire:boolean,damage:(amount?:number)=>boolean,
  rocks:CombatRock[]){
  if(s.phase!=='flight')return;
  const dt=ms/1000;
  if(s.distance>=PURSUER_START&&!c.finaleStarted){clearCombat(c);startPursuer(s,c);}
  if(!c.finaleStarted)for(const [waveId,w] of FLIGHT_WAVES.entries()){
    if(s.distance<w.at||c.spawnedWaves.includes(waveId))continue;
    c.spawnedWaves.push(waveId);c.waveName=w.name;c.waveNoticeUntil=s.clock+2200;
    w.ys.forEach((y,i)=>{
      const id=`${waveId}:${i}`;if(c.defeated.includes(id))return;
      const hp=regularEnemyHealth(w.kind==='scout'?3:w.kind==='interceptor'?5:w.kind==='prism'?7:s.difficulty==='EASY'?10:s.difficulty==='HARD'?12:14);
      const entry=w.entry??'front',vertical=entry!=='front',stageX=vertical?730+i*155:825;
      const x=vertical?stageX+85:1110+i*125,startY=entry==='above'?60:entry==='below'?560:y;
      c.enemies.push({id,kind:w.kind,x,y:startY,baseY:y,hp,maxHp:hp,age:0,
        phase:vertical?'incoming':'enter',phaseMs:0,aimX:0,aimY:0,startX:x,startY,
        entry,entryDelayMs:950+i*180,stageX});
    });
  }
  if(fire&&s.clock>=c.nextShotAt){
    fireWeapon(s,c);
  }
  for(const e of c.enemies){
    e.age+=ms;e.phaseMs+=ms;
    if(e.kind==='pursuer')stepPursuer(s,c,e,ms,(kind,x,y)=>effect(c,s,kind,x,y));
    else stepRegularEnemy(e,s,c,dt);
    const halfW=e.kind==='pursuer'?85:e.kind==='gunship'?65:e.kind==='prism'?68:e.kind==='interceptor'?48:29,halfH=e.kind==='pursuer'?37:e.kind==='gunship'?30:e.kind==='prism'?25:21;
    if(e.phase!=='incoming'&&e.phase!=='dying'&&!(e.kind==='pursuer'&&e.phase==='recover')&&Math.abs(e.x-s.x)<halfW+46&&Math.abs(e.y-s.y)<halfH+16)damage(16);
    if(s.phase!=='flight'){clearCombat(c);return;}
  }
  for(const b of c.bolts){
    if(b.expires<=s.clock)continue;
    if(b.owner==='enemy'&&b.sourceId){
      const source=c.enemies.find(e=>e.id===b.sourceId);
      if(!source||source.phase==='recover'||source.phase==='dying'){b.expires=0;continue;}
    }
    if(b.owner==='player'&&b.weapon==='homing')steerMissile(b,c,rocks,dt);
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    const stone=rocks.find(r=>r.hp>0&&!b.hitIds?.includes(`rock:${r.id}`)&&Math.hypot(r.x-b.x,r.y-b.y)<r.radius+3);
    if(stone){
      spendHit(b,`rock:${stone.id}`);
      if(b.owner==='player'){
        c.rockBlocks++;c.rockHits++;stone.hp=Math.max(0,stone.hp-(s.invincible?stone.hp:b.damage));
        if(stone.hp===0){c.rocksDestroyed++;s.score+=50;effect(c,s,'destroy',stone.x,stone.y,stone.radius*3,'asteroid');}
        else effect(c,s,'hit',b.x,b.y,45,'asteroid');
      }else effect(c,s,'blocked',b.x,b.y);
      continue;
    }
    if(b.owner==='enemy'){
      if(Math.abs(b.x-s.x)<50&&Math.abs(b.y-s.y)<21){damage(b.damage);b.expires=0;}
      if(s.phase!=='flight'){clearCombat(c);return;}
      continue;
    }
    const target=c.enemies.find(e=>e.hp>0&&!b.hitIds?.includes(e.id)&&Math.abs(e.x-b.x)<(e.kind==='pursuer'?85:e.kind==='gunship'?65:e.kind==='prism'?68:e.kind==='interceptor'?48:29)&&Math.abs(e.y-b.y)<(e.kind==='pursuer'?37:e.kind==='gunship'?30:e.kind==='prism'?25:21));
    if(!target)continue;
    if(target.kind==='pursuer'&&target.phase!=='recover'&&!s.invincible){
      b.expires=0;c.guardedHits++;effect(c,s,'blocked',b.x,b.y);continue;
    }
    spendHit(b,target.id);
    const appliedDamage=s.invincible?target.hp:target.kind==='pursuer'&&b.weapon==='spread'?b.damage*.5:b.damage;
    target.hp=Math.max(0,target.hp-appliedDamage);target.hitUntil=s.clock+100;c.hits++;effect(c,s,'hit',b.x,b.y,45);
    if(target.hp<=0){
      effect(c,s,'destroy',target.x,target.y,target.kind==='pursuer'?190:target.kind==='gunship'?155:115,target.kind);
      if(!c.defeated.includes(target.id)){
        c.defeated.push(target.id);s.score+=target.kind==='pursuer'?700:target.kind==='gunship'?300:target.kind==='interceptor'?180:target.kind==='prism'?220:100;
        if(target.kind==='gunship')c.repairs.push({id:c.nextId++,x:target.x,y:target.y,expires:s.clock+8000});
      }
      if(target.kind==='pursuer'){
        target.phase='dying';target.phaseMs=0;target.volley=1;target.startX=target.x;target.startY=target.y;
        c.enemies=[target];c.repairs=[];
        for(const hostile of c.bolts)if(hostile.owner==='enemy')hostile.expires=0;
      }
    }
  }
  for(const r of c.repairs){
    r.x-=90*dt;
    if(Math.abs(r.x-s.x)<60&&Math.abs(r.y-s.y)<36){
      s.hull=Math.min(100,s.hull+15);r.expires=0;c.repairsCollected++;effect(c,s,'repair',s.x,s.y-45);
    }
  }
  c.enemies=c.enemies.filter(e=>e.kind==='pursuer'?!c.finaleDefeated:e.hp>0&&e.x>-150&&e.age<15000);
  c.bolts=c.bolts.filter(b=>b.expires>s.clock&&b.x>-100&&b.x<1150&&b.y>100&&b.y<600);
  c.effects=c.effects.filter(e=>e.expires>s.clock).slice(-50);
  c.repairs=c.repairs.filter(r=>r.expires>s.clock&&r.x>-50);
}
