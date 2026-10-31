/** Ice equipment keeps its own art and sockets; all frames use the drawn X-God baseline. */
export const XGOD_FROST_FOLDER='/characters/xgod/frost-v1/';
export const XGOD_FROST_ACTIONS=['idle','run','jump','attack','crouch','skid','hurt'] as const;
export function xgodFrostPose(s:{now:number;grounded:boolean;vy:number;vx:number;stride:number;
  crouching:boolean;crouchProgress:number;shotAge:number;jumpAge:number;landingAge:number;skidding:boolean;skidAge:number}){
  if(s.crouching||s.crouchProgress>0)return {action:'crouch',frame:s.crouching?(s.shotAge<260?2:s.crouchProgress<.5?0:1):3};
  if(s.grounded&&s.shotAge<260)return {action:'attack',frame:s.shotAge<130?2:3};
  if(!s.grounded)return {action:'jump',frame:s.jumpAge<55&&s.vy< -300?0:s.vy< -180?1:s.vy<150?2:3};
  if(s.landingAge<100)return {action:'jump',frame:0};
  if(s.skidding)return {action:'skid',frame:Math.max(0,Math.min(3,Math.floor(s.skidAge/50)))};
  if(Math.abs(s.vx)>18)return {action:'run',frame:Math.floor(s.stride/27)%8};
  return {action:'idle',frame:Math.floor(s.now/170)%4};
}
