import type Phaser from 'phaser';
export const TELEPORT_HELPER={key:'teleport_helper_v3',scale:160/220,originY:300/320,assistMs:360};
export function loadTeleportHelper(load:Phaser.Loader.LoaderPlugin){
  load.spritesheet(TELEPORT_HELPER.key,'/companions/teleportation-c-v3/helper.png',{frameWidth:320,frameHeight:320});
}
export function helperPose(clock:number,stride:number,speed:number,vy:number,airborne:boolean,landing:boolean,arrival:boolean){
  if(arrival)return {frame:23,mode:'arrival'};
  if(landing)return {frame:15,mode:'landing'};
  if(airborne)return {frame:vy< -70?12:vy<70?13:14,mode:'airborne'};
  if(speed>18)return {frame:4+Math.floor(stride/22)%8,mode:'run'};
  return {frame:Math.floor(clock/190)%4,mode:'idle'};
}
export function helperAssistFrame(kind:string,age:number){
  return (kind==='strike'?16:20)+(age<65?0:age<110?1:age<235?2:3);
}
