export interface CrumblingPlatformPlan {
  x:number;y:number;w:number;h:number;
  crumbleMs?:number;restoreMs?:number;
}
export interface TimedVentPlan {
  x:number;y:number;w:number;height:number;phase?:number;
}
export interface CrumbleState {phase:'ready'|'shaking'|'gone';elapsed:number;falls:number}
export const createCrumble=():CrumbleState=>({phase:'ready',elapsed:0,falls:0});
export function stepCrumble(s:CrumbleState,plan:CrumblingPlatformPlan,ms:number,riding:boolean,occupied:boolean){
  if(s.phase==='ready'){
    if(riding){s.phase='shaking';s.elapsed=0;}
  }else{
    s.elapsed+=ms;
    if(s.phase==='shaking'&&s.elapsed>=(plan.crumbleMs??700)){
      s.phase='gone';s.elapsed=0;s.falls++;
    }else if(s.phase==='gone'&&s.elapsed>=(plan.restoreMs??2600)&&!occupied){s.phase='ready';s.elapsed=0;}
  }
}
export function ventPhase(clock:number,plan:TimedVentPlan){
  const at=((clock+(plan.phase??0)*4200)%4200+4200)%4200;
  return at<1500?'idle':at<2450?'warning':'active';
}
