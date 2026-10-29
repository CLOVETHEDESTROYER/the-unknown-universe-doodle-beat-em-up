import type {KaiPoseInput} from './killerKai';

/** Reviewed 640x512 logical frames, packed into mobile-safe atlas pages. */
export const ELYTRON_ART={folder:'/characters/elytron-v1/',width:640,height:512,baseline:480,scale:.46} as const;
export function elytronPose(s:KaiPoseInput & {crouching:boolean}):{key:string;frame:number}{
  if(s.hurtAge<280)return {key:'elytron_reactions',frame:Math.min(3,Math.floor(s.hurtAge/70))};
  if(s.crouching)return {key:'elytron_combat',frame:s.attacking?8+Math.min(3,Math.floor(s.attackAge/75)):4+Math.floor(s.now/190)%4};
  if(s.dashing)return {key:'elytron_mobility',frame:8+Math.floor(s.now/70)%4};
  if(s.attacking)return {key:'elytron_combat',frame:Math.min(3,Math.floor(s.attackAge/75))};
  if(s.shotAge<250)return {key:'elytron_combat',frame:12+Math.min(3,Math.floor(s.shotAge/65))};
  if(!s.grounded)return {key:'elytron_movement',frame:4+(s.jumpAge<60?0:s.velocityY< -180?1:s.velocityY<150?2:3)};
  if(s.landingAge<140)return {key:'elytron_mobility',frame:14+Math.min(1,Math.floor(s.landingAge/70))};
  if(s.skidding)return {key:'elytron_mobility',frame:12+Math.floor(s.now/100)%2};
  if(Math.abs(s.velocityX)>18)return {key:'elytron_locomotion',frame:Math.floor(s.stride/28)%8};
  return {key:'elytron_movement',frame:Math.floor(s.now/190)%4};
}
