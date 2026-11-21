import type Phaser from 'phaser';
import { WORKSHOP_ASSETS, workshopSheet } from './workshopAssets';
export const workshopKey=(id:string)=>`workshop_${id}`;
export function loadWorkshopPickup(load:Phaser.Loader.LoaderPlugin,id:string){
  load.spritesheet(workshopKey(id),workshopSheet(id),{frameWidth:192,frameHeight:192,endFrame:3});
}
export function makeWorkshopAnimations(scene:Phaser.Scene){
  for(const asset of WORKSHOP_ASSETS){
    const key=workshopKey(asset.id);
    if(asset.group!=='powerups'||!scene.textures.exists(key)||scene.anims.exists(key))continue;
    scene.anims.create({key,frames:scene.anims.generateFrameNumbers(key,{start:0,end:3}),frameRate:7,repeat:-1});
  }
}
export function animateWorkshopPickup(sprite:Phaser.GameObjects.Sprite,id:string){
  const key=workshopKey(id);
  if(sprite.scene.anims.exists(key))sprite.play(key);
}
