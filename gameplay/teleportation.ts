export const BLINK_RANGE=190;
export const BLINK_COOLDOWN=1150;
export const PHASE_MS=140;
export const COUNTER_MS=520;
export const ANCHOR_MS=3200;
export interface TeleportState {
  readyAt:number;phaseUntil:number;counterUntil:number;lastAt:number;mode:'blink'|'recall';
  anchor:{x:number;y:number;expires:number}|null;blinks:number;recalls:number;strikes:number;blocked:number;
}
export const createTeleport=():TeleportState=>({readyAt:0,phaseUntil:0,counterUntil:0,lastAt:-9999,mode:'blink',anchor:null,blinks:0,recalls:0,strikes:0,blocked:0});
export interface TeleportRect {x:number;y:number;w:number;h:number}
export interface TeleportSpace {solids:TeleportRect[];supports:TeleportRect[];hazards:TeleportRect[];left:number;right:number;halfWidth:number;height:number}
const overlaps=(a:TeleportRect,b:TeleportRect)=>a.x<b.x+b.w-1&&a.x+a.w>b.x+1&&a.y<b.y+b.h-1&&a.y+a.h>b.y+1;
export function safeTeleportPoint(x:number,y:number,space:TeleportSpace,grounded:boolean){
  if(x<space.left+space.halfWidth||x>space.right-space.halfWidth)return false;
  const body={x:x-space.halfWidth,y:y-space.height,w:space.halfWidth*2,h:space.height};
  if(space.solids.some(r=>overlaps(body,r))||space.hazards.some(r=>overlaps({...body,y:body.y-4,h:body.h+12},r)))return false;
  return !grounded||space.supports.some(r=>x-space.halfWidth>=r.x+1&&x+space.halfWidth<=r.x+r.w-1&&Math.abs(y-r.y)<20);
}
export function blinkDestination(x:number,y:number,direction:number,space:TeleportSpace,grounded:boolean){
  let result:number|null=null;
  for(let distance=6;distance<=BLINK_RANGE;distance+=6){
    const next=x+Math.sign(direction)*distance;
    const body={x:next-space.halfWidth,y:y-space.height,w:space.halfWidth*2,h:space.height};
    if(next<space.left+space.halfWidth||next>space.right-space.halfWidth||space.solids.some(r=>overlaps(body,r)))break;
    if(safeTeleportPoint(next,y,space,grounded))result=next;
  }
  return result!==null&&Math.abs(result-x)>=36?{x:result,y}:null;
}
export function teleportPathClear(from:{x:number;y:number},to:{x:number;y:number},space:TeleportSpace){
  const steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/6);
  for(let i=1;i<=steps;i++){
    const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
    if(space.solids.some(r=>overlaps({x:x-space.halfWidth,y:y-space.height,w:space.halfWidth*2,h:space.height},r)))return false;
  }
  return true;
}
export function startTeleport(s:TeleportState,now:number,from:{x:number;y:number},to:{x:number;y:number},recall=false){
  if(now<s.readyAt)return false;
  if(recall&&(!s.anchor||now>=s.anchor.expires))return false;
  s.readyAt=now+BLINK_COOLDOWN;s.phaseUntil=now+PHASE_MS;s.counterUntil=now+COUNTER_MS;s.lastAt=now;s.mode=recall?'recall':'blink';
  if(recall){s.anchor=null;s.recalls++;}else{s.anchor={...from,expires:now+ANCHOR_MS};s.blinks++;}
  return true;
}
export function resetTeleport(s:TeleportState){s.anchor=null;s.phaseUntil=s.counterUntil=0;}
