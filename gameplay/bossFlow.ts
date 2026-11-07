export const FLOW_BOSSES=['dark_dragon','killinas_daughter','ink_behemoth'] as const;
const seq=(age:number,frames:number[],ms:number)=>frames[Math.min(frames.length-1,Math.floor(Math.max(0,age)/ms))];
/** Render-only timing. Combat movement, tell duration, hit gates and openings stay authoritative. */
export function bossFlowFrame(id:string,state:string,move:string,age:number,tell:number,impactAge:number,phaseTwo:boolean,travelMs:number){
  if(state==='patrol')return 0;
  if(state==='phase')return seq(age,[0,1,2,6,7],190);
  if(state==='recover'){
    if(id==='killinas_daughter')return seq(age,move==='leap_slam'?[9,10,11]:move==='cannon_burst'?[6,10,11]:[5,10,11],145);
    return seq(age,id==='dark_dragon'?[10,11,6,7]:[11,11,6,0],155);
  }
  if(state==='tell'){
    if(id==='killinas_daughter'&&move==='cannon_burst')return age<tell*.5?0:6;
    if(move==='dragon_lunge'||move==='cinder_bound'||move==='leap_slam')return age<tell*.3?0:age<tell*.68?1:8;
    return seq(age,[0,1,2],Math.max(70,tell/3));
  }
  if(id==='dark_dragon'){
    if(move==='dragon_lunge')return age<travelMs*.15?8:age<travelMs*.7?9:age<travelMs*.9?10:11;
    const cadence=phaseTwo?195:230,cycle=Math.max(0,age-110)%cadence;
    return age<110?seq(age,[2,3],55):cycle<65?4:cycle<125?5:cycle<175?6:3;
  }
  if(id==='killinas_daughter'){
    if(move==='cannon_burst')return age%190<75?7:6;
    if(move==='leap_slam')return age<travelMs*.85?8:9;
    return age<travelMs*.12?2:age<travelMs*.3?3:age<travelMs*.6?4:age<travelMs*.78?5:10;
  }
  if(move==='cinder_bound')return age<travelMs*.14?8:age<travelMs?9:seq(age-travelMs,[10,5,6,0],110);
  if(move==='ember_rain')return seq(age,[1,2,3,2,6,7],210);
  if(age<260)return seq(age,[2,3],130);
  return impactAge<90?4:impactAge<180?5:impactAge<260?6:7;
}
export function pursuerFlowFrame(phase:string,age:number){
  if(phase==='tell')return age<200?0:age<600?1:2;
  if(phase==='charge')return [2,6,2,7][Math.floor(age/85)%4];
  if(phase==='attack')return [2,3,4,2][Math.floor(age/70)%4];
  if(phase==='recover')return seq(age,[4,5,5,0],150);
  if(phase==='transition')return [1,2][Math.floor(age/130)%2];
  return [0,6,0,7][Math.floor(age/220)%4];
}
