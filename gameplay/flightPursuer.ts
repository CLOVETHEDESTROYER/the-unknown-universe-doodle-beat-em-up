import type { CombatHost, FlightCombat, FlightEnemy, CombatEffect } from './flightCombat';

export const PURSUER_START=15400;
export const PURSUER_CHECKPOINT=15300;
export const PURSUER_ID='void-pursuer';
type Emit=(kind:CombatEffect['kind'],x:number,y:number)=>void;
function move(e:FlightEnemy,s:CombatHost){
  e.move=(e.attacks??0)%2===0?'fan':'sweep';
  e.phase='tell';e.phaseMs=0;e.volley=0;e.x=835;
  e.startX=e.x;e.startY=e.y;
  e.aimX=e.move==='sweep'?260:Math.min(s.x,e.x-200);
  e.aimY=Math.max(185,Math.min(435,s.y));
}
export function startPursuer(s:CombatHost,c:FlightCombat){
  c.finaleStarted=true;c.finaleDefeated=c.defeated.includes(PURSUER_ID);
  c.waveName='VOID PURSUER — APPROACH BLOCKED';c.waveNoticeUntil=s.clock+2500;
  if(c.finaleDefeated)return;
  const hp=s.difficulty==='EASY'?28:s.difficulty==='HARD'?36:44;
  c.enemies.push({id:PURSUER_ID,kind:'pursuer',x:1140,y:300,baseY:300,hp,maxHp:hp,age:0,
    phase:'enter',phaseMs:0,aimX:260,aimY:300,startX:1140,startY:300,move:'fan',phaseNumber:1,attacks:0,volley:0});
}
export function stepPursuer(s:CombatHost,c:FlightCombat,e:FlightEnemy,ms:number,emit:Emit){
  const phaseTwo=e.phaseNumber===2;
  if(e.phase==='dying'){
    e.x=e.startX+e.phaseMs/1500*65;e.y=e.startY+(e.phaseMs/1500)**2*80;
    if((e.volley??0)<4&&e.phaseMs>=(e.volley??0)*350){
      emit('destroy',e.x+Math.sin((e.volley??0)*2)*65,e.y-25+(e.volley??0)*15);e.volley=(e.volley??0)+1;
    }
    if(e.phaseMs>=1500){c.finaleDefeated=true;c.waveName='APPROACH CLEAR — PREPARE TO LAND';c.waveNoticeUntil=s.clock+2500;}
    return;
  }
  if(e.phase==='enter'){
    e.x-=170*ms/1000;e.y=300+Math.sin(e.age/650)*18;
    if(e.x<=835)move(e,s);
  }else if(e.phase==='transition'){
    e.x=835;e.y=300+Math.sin(e.phaseMs/80)*3;
    if(e.phaseMs>=950)move(e,s);
  }else if(e.phase==='tell'){
    e.y=e.startY+Math.sin(e.phaseMs/200)*3;
    if(e.phaseMs>=(phaseTwo?950:1100)){
      e.phase=e.move==='sweep'?'charge':'attack';e.phaseMs=0;e.startY=e.y;e.volley=0;
    }
  }else if(e.phase==='attack'){
    const spreads=phaseTwo?[-.34,-.17,0,.17,.34]:[-.25,0,.25];
    if((e.volley??0)<spreads.length&&e.phaseMs>=160+(e.volley??0)*200){
      const a=Math.atan2(e.aimY-e.y,e.aimX-(e.x-102))+spreads[e.volley??0];
      c.bolts.push({id:c.nextId++,owner:'enemy',x:e.x-102,y:e.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,
        expires:s.clock+3400,damage:s.difficulty==='EASY'?10:s.difficulty==='HARD'?14:18});
      c.enemyShots++;e.volley=(e.volley??0)+1;
    }
    e.y=e.startY+Math.sin(e.phaseMs/120)*2;
    if(e.phaseMs>=(phaseTwo?1250:1050)){e.phase='recover';e.phaseMs=0;e.x=835;e.y=300;}
  }else if(e.phase==='charge'){
    const t=Math.min(1,e.phaseMs/(phaseTwo?1400:1600)),arc=Math.sin(t*Math.PI);
    e.x=835-575*arc;e.y=e.startY+(e.aimY-e.startY)*arc-35*Math.sin(t*Math.PI*2);
    if(phaseTwo&&t>=.5&&e.volley===0){
      for(const vy of [-125,125])c.bolts.push({id:c.nextId++,owner:'enemy',x:e.x-102,y:e.y,vx:-260,vy,
        expires:s.clock+2300,damage:s.difficulty==='EASY'?10:s.difficulty==='HARD'?14:18});
      c.enemyShots+=2;e.volley=1;
    }
    if(t===1){e.phase='recover';e.phaseMs=0;e.x=835;e.y=300;}
  }else if(e.phase==='recover'&&e.phaseMs>=(phaseTwo?1750:2100)){
    e.attacks=(e.attacks??0)+1;
    if(!phaseTwo&&e.hp<=e.maxHp/2){e.phaseNumber=2;e.phase='transition';e.phaseMs=0;}
    else move(e,s);
  }
}
