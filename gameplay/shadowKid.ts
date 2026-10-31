import type {KaiPoseInput} from './killerKai';

export const SHADOW_ART={folder:'/characters/shadow-kid-v1/',width:512,height:384,baseline:352,scale:.68} as const;

export function shadowKidPose(s:KaiPoseInput & {crouching:boolean}):{key:string;frame:number}{
  if(s.hurtAge<280)return {key:'shadow_hurt',frame:Math.min(3,Math.floor(s.hurtAge/70))};
  if(s.attacking)return {key:'shadow_throw',frame:Math.min(7,Math.floor(s.attackAge/100))};
  if(s.shotAge<300)return {key:'shadow_throw',frame:Math.min(7,4+Math.floor(s.shotAge/100))};
  if(s.crouching)return {key:'shadow_crouch',frame:1};
  if(!s.grounded)return {key:'shadow_jump',frame:s.jumpAge<60?0:s.velocityY< -180?1:s.velocityY<150?2:3};
  if(s.landingAge<100)return {key:'shadow_crouch',frame:0};
  if(Math.abs(s.velocityX)>18)return {key:'shadow_run',frame:Math.floor(s.stride/25)%8};
  return {key:'shadow_idle',frame:Math.floor(s.now/170)%4};
}
