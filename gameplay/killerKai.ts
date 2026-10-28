import type { PowerupId } from './powerups';

/** Atlas indices follow the generated, reviewed sheets in art/killer-kai-v1. */
export const KAI_ART = {folder:'/characters/killer-kai-v1/',baseline:240,width:384,height:256,scale:.782} as const;
export interface KaiPoseInput {
  now:number;grounded:boolean;velocityX:number;velocityY:number;stride:number;
  jumpAge:number;landingAge:number;shotAge:number;hurtAge:number;
  attackAge:number;attacking:boolean;dashing:boolean;skidding:boolean;equipment:PowerupId;
}
export function killerKaiPose(s:KaiPoseInput):{key:string;frame:number}{
  if(s.hurtAge<280)return {key:'kai_reactions',frame:Math.min(3,Math.floor(s.hurtAge/70))};
  if(s.dashing)return {key:'kai_reactions',frame:12};
  const sword=s.equipment==='sword';
  if(s.attacking)return sword?{key:'kai_combat',frame:12+Math.min(3,Math.floor(s.attackAge/90))}
    :{key:'kai_combat',frame:Math.min(3,Math.floor(s.attackAge/75))};
  if(s.shotAge<190)return {key:'kai_combat',frame:s.shotAge<75?2:3};
  if(!s.grounded){
    const phase=s.jumpAge<60?0:s.velocityY< -180?1:s.velocityY<150?2:3;
    return {key:sword?'kai_sword':'kai_movement',frame:(sword?8:12)+phase};
  }
  if(s.landingAge<100)return {key:'kai_reactions',frame:14};
  if(s.skidding)return {key:'kai_reactions',frame:13};
  if(Math.abs(s.velocityX)>18)return {key:sword?'kai_sword':'kai_movement',frame:(sword?0:4)+Math.floor(s.stride/30)%8};
  return sword?{key:'kai_sword',frame:12}:{key:'kai_movement',frame:Math.floor(s.now/190)%4};
}
