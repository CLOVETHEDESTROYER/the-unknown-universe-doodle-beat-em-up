import type { CombatHost, FlightCombat, FlightEnemy, CombatEffect } from './flightCombat';
import { BOSS_DEFEAT_DURATION, pursuerCounterWindow } from './bossPresentation';

export const PURSUER_START = 15400;
export const PURSUER_CHECKPOINT = 15300;
export const PURSUER_ID = 'void-pursuer';
export const PURSUER_HEALTH = { EASY: 72, HARD: 92, 'X-GOD': 112 } as const;
export type PursuerMove = 'fan' | 'sweep' | 'strafe' | 'barrage';
export const PURSUER_PHASE_NAMES = ['LOCK ON', 'HUNT MODE', 'CORE OVERDRIVE'] as const;
const CYCLES: PursuerMove[][] = [
  ['fan', 'sweep', 'strafe', 'barrage'],
  ['strafe', 'barrage', 'fan', 'sweep'],
  ['barrage', 'sweep', 'fan', 'strafe'],
];
type Emit = (kind: CombatEffect['kind'], x: number, y: number) => void;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b-a)*t;
const smooth = (t: number) => { t=clamp(t,0,1); return t*t*(3-2*t); };

export function pursuerTellDuration(e: FlightEnemy, difficulty: CombatHost['difficulty']) {
  const phase=clamp(e.phaseNumber??1,1,3);
  const base=e.move==='barrage'?1400:e.move==='sweep'?1200:1100;
  return base-(phase-1)*125-(difficulty==='HARD'?60:difficulty==='X-GOD'?100:0);
}
export function pursuerAttackDuration(e: FlightEnemy) {
  const p=(e.phaseNumber??1)-1;
  return e.move==='sweep'?[1750,1550,1400][p]:e.move==='strafe'?[2350,2700,3000][p]
    :e.move==='barrage'?[2710,3360,3360][p]:[1900,2500,2700][p];
}
/** Renderer and physics use this same warned, committed charge path. */
export function pursuerSweepPoint(e: FlightEnemy, t: number) {
  const arc=Math.sin(clamp(t,0,1)*Math.PI),phase=e.phaseNumber??1;
  return {x:835-(phase===3?600:phase===2?575:550)*arc,
    y:clamp((e.launchY??300)+(e.aimY-(e.launchY??300))*arc-35*Math.sin(t*Math.PI*2),185,435)};
}
export function pursuerAttackHint(e: FlightEnemy) {
  return e.move==='barrage'?'GUARDED: BARRAGE — MOVE INTO THE GREEN LANE!'
    :e.move==='strafe'?'GUARDED: STRAFE — LEAVE THE AIM MARK!'
    :e.move==='sweep'?'GUARDED: SWEEP — MOVE CLEAR OF THE CURVE!'
    :'GUARDED: PRISM FANS — KEEP MOVING!';
}
function move(e: FlightEnemy, s: CombatHost) {
  const phase=e.phaseNumber??1;
  e.move=CYCLES[phase-1][(e.attackIndex??0)%4];
  e.phase='tell';e.phaseMs=0;e.volley=0;
  e.startX=e.x;e.startY=e.y;
  e.aimX=clamp(s.x,100,e.move==='strafe'?460:620);e.aimY=clamp(s.y,145,475);
  e.launchY=e.move==='strafe'||e.move==='sweep'?(s.y>=300?190:410)
    :e.move==='fan'?((e.attacks??0)%2?370:230):300;
  e.targetY=600-e.launchY;
  // Choose another reachable lane, then lock it for every wall in this attack.
  const lanes=[190,300,410],nearest=lanes.reduce((best,y)=>Math.abs(y-s.y)<Math.abs(best-s.y)?y:best);
  e.safeY=lanes[(lanes.indexOf(nearest)+1)%3];
  e.tellDurationMs=pursuerTellDuration(e,s.difficulty);
}
function recover(e: FlightEnemy) {
  e.phase='recover';e.phaseMs=0;e.startX=e.x;e.startY=e.y;
}
function bolt(s: CombatHost, c: FlightCombat, x: number, y: number, angle: number, speed: number) {
  c.bolts.push({id:c.nextId++,owner:'enemy',sourceId:PURSUER_ID,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    expires:s.clock+3900,damage:s.difficulty==='EASY'?10:s.difficulty==='HARD'?14:18});
  c.enemyShots++;
}
export function startPursuer(s: CombatHost, c: FlightCombat) {
  c.finaleStarted=true;c.finaleDefeated=c.defeated.includes(PURSUER_ID);
  c.waveName='VOID PURSUER — APPROACH BLOCKED';c.waveNoticeUntil=s.clock+2500;
  if(c.finaleDefeated)return;
  const hp=PURSUER_HEALTH[s.difficulty];
  c.enemies.push({id:PURSUER_ID,kind:'pursuer',x:1140,y:300,baseY:300,hp,maxHp:hp,age:0,
    phase:'enter',phaseMs:0,aimX:260,aimY:300,startX:1140,startY:300,move:'fan',phaseNumber:1,attacks:0,attackIndex:0,volley:0});
}
export function stepPursuer(s: CombatHost, c: FlightCombat, e: FlightEnemy, ms: number, emit: Emit) {
  const phase=e.phaseNumber??1;
  if(e.phase==='dying'){
    e.x=e.startX+e.phaseMs/BOSS_DEFEAT_DURATION*65;e.y=e.startY+(e.phaseMs/BOSS_DEFEAT_DURATION)**2*80;
    if((e.volley??0)<4&&e.phaseMs>=(e.volley??0)*500){
      emit('destroy',e.x+Math.sin((e.volley??0)*2)*65,e.y-25+(e.volley??0)*15);e.volley=(e.volley??0)+1;
    }
    if(e.phaseMs>=BOSS_DEFEAT_DURATION){c.finaleDefeated=true;c.waveName='APPROACH CLEAR — PREPARE TO LAND';c.waveNoticeUntil=s.clock+2500;}
    return;
  }
  if(e.phase==='enter'){
    e.x-=170*ms/1000;e.y=300+Math.sin(e.age/650)*18;
    if(e.x<=835)move(e,s);
  }else if(e.phase==='transition'){
    e.x=835;e.y=300+Math.sin(e.phaseMs/80)*3;
    if(e.phaseMs>=1000)move(e,s);
  }else if(e.phase==='tell'){
    const t=smooth(e.phaseMs/(e.tellDurationMs??1100));
    e.x=lerp(e.startX,835,t);e.y=lerp(e.startY,e.launchY??300,t);
    if(e.phaseMs>=(e.tellDurationMs??1100)){
      e.phase=e.move==='sweep'?'charge':'attack';e.phaseMs=0;e.volley=0;
      e.startX=e.x;e.startY=e.y;
    }
  }else if(e.phase==='charge'){
    const t=clamp(e.phaseMs/pursuerAttackDuration(e),0,1),point=pursuerSweepPoint(e,t);
    e.x=point.x;e.y=point.y;
    if(phase>=2&&t>=.5&&e.volley===0){
      const spread=phase===3?[-.6,-.2,.2,.6]:[-.4,.4];
      for(const a of spread)bolt(s,c,e.x-102,e.y,Math.PI+a,330+(phase-2)*30);
      e.volley=1;
    }
    if(t===1)recover(e);
  }else if(e.phase==='attack'){
    const t=clamp(e.phaseMs/pursuerAttackDuration(e),0,1);
    const speed=300+(phase-1)*30+(s.difficulty==='HARD'?15:s.difficulty==='X-GOD'?30:0);
    if(e.move==='strafe'){
      e.x=835-(phase===3?220:180)*Math.sin(t*Math.PI);
      e.y=lerp(e.launchY??190,e.targetY??410,smooth(t));
      if((e.volley??0)<phase+2&&e.phaseMs>=200+(e.volley??0)*350){
        const aim=Math.atan2(e.aimY-e.y,e.aimX-(e.x-102));
        for(const spread of phase===1?[0]:phase===2?[-.12,.12]:[-.18,0,.18])bolt(s,c,e.x-102,e.y,aim+spread,speed);
        e.volley=(e.volley??0)+1;
      }
    }else if(e.move==='barrage'){
      e.x=835+Math.sin(t*Math.PI*2)*25;e.y=300+Math.sin(t*Math.PI*2)*26;
      if((e.volley??0)<(phase===1?2:3)&&e.phaseMs>=160+(e.volley??0)*650){
        for(const y of [150,210,270,330,390,450])if(Math.abs(y-(e.safeY??300))>75)bolt(s,c,e.x-102,y,Math.PI,speed+20);
        e.volley=(e.volley??0)+1;
      }
    }else{
      e.x=835-Math.sin(t*Math.PI)*45;e.y=clamp((e.launchY??230)+Math.sin(t*Math.PI*2)*(phase===3?65:45),195,425);
      if((e.volley??0)<(phase===1?1:2)&&e.phaseMs>=180+(e.volley??0)*950){
        const aim=Math.atan2(e.aimY-e.y,e.aimX-(e.x-102));
        for(const spread of phase===1?[-.22,0,.22]:phase===2?[-.38,-.19,0,.19,.38]:[-.48,-.32,-.16,0,.16,.32,.48])bolt(s,c,e.x-102,e.y,aim+spread,speed);
        e.volley=(e.volley??0)+1;
      }
    }
    if(t===1)recover(e);
  }else if(e.phase==='recover'){
    const t=smooth(e.phaseMs/350);e.x=lerp(e.startX,835,t);e.y=lerp(e.startY,300,t);
    if(e.phaseMs>=pursuerCounterWindow(phase)){
      e.attacks=(e.attacks??0)+1;e.attackIndex=(e.attackIndex??0)+1;
      if(phase<3&&e.hp<=e.maxHp*(phase===1?.68:.34)){
        e.phaseNumber=phase+1;e.phase='transition';e.phaseMs=0;e.attackIndex=0;
        c.waveName=PURSUER_PHASE_NAMES[phase];c.waveNoticeUntil=s.clock+2200;
      }else move(e,s);
    }
  }
}
