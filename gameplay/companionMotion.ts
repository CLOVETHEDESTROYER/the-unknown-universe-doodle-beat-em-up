/** Ground followers accelerate, hop steps and land on terrain instead of hovering at player height. */
export interface CompanionStride {vx:number;vy:number;grounded:boolean;warps:number}
export const companionStride=():CompanionStride=>({vx:0,vy:0,grounded:true,warps:0});
export function stepCompanionGround(state:CompanionStride,position:{x:number;y:number},target:{x:number;y:number;airborne:boolean},ms:number,floorAt:(x:number,near:number)=>number|null){
  const dt=Math.min(ms,50)/1000;
  if(Math.hypot(target.x-position.x,target.y-position.y)>620){state.vx=state.vy=0;state.warps++;return {x:target.x,y:floorAt(target.x,target.y)??target.y};}
  const dx=target.x-position.x,wanted=Math.abs(dx)<5?0:Math.max(-500,Math.min(500,dx*6));
  state.vx+=Math.max(-2300*dt,Math.min(2300*dt,wanted-state.vx));
  let x=position.x+state.vx*dt,y=position.y;
  const floor=floorAt(position.x,target.y),ahead=floorAt(position.x+Math.sign(state.vx)*40,target.y);
  if(state.grounded&&((ahead!==null&&ahead<y-16)||(target.airborne&&target.y<y-65))){
    const rise=ahead!==null?Math.max(50,y-ahead+32):80;
    state.vy=-Math.min(740,Math.max(500,Math.sqrt(2*1600*rise)));state.grounded=false;
  }
  if(!state.grounded){state.vy+=1600*dt;y+=state.vy*dt;}
  const nextFloor=floorAt(x,target.y);
  // Rise above the next step before crossing its vertical face.
  if(nextFloor!==null&&nextFloor<position.y-16&&y>nextFloor+2)x=position.x;
  const support=floorAt(x,target.y)??floor;
  if(support!==null&&y>=support&&state.vy>=0){y=support;state.vy=0;state.grounded=true;}
  else if(state.grounded&&(support===null||y<support-2)){state.grounded=false;}
  return {x,y};
}
