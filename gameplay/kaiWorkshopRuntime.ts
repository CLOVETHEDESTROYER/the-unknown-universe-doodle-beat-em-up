import Phaser from 'phaser';
import {KAI_ART,kaiArtKey,kaiArtPath,kaiEffectKey} from './kaiWorkshopArt';
import type {CosmeticLoadout,ShopItemId} from './shopCatalog';

export function loadKaiEquippedArt(load:Phaser.Loader.LoaderPlugin,style:CosmeticLoadout){
  const ids=new Set<ShopItemId>();
  for(const value of [style.buddy,style.ink,style.trail,style.burst,style.xgodSpecial,style.kaiSpecial])if(value!=='classic')ids.add(value);
  for(const id of ids)load.spritesheet(kaiArtKey(id),kaiArtPath(id),{frameWidth:256,frameHeight:256,endFrame:KAI_ART[id].frames-1});
}
export function makeKaiArtAnimations(scene:Phaser.Scene){
  for(const id of Object.keys(KAI_ART) as ShopItemId[]){
    const key=kaiArtKey(id),asset=KAI_ART[id];if(!scene.textures.exists(key))continue;
    const add=(name:string,start:number,end:number,fps:number,repeat:number)=>{
      if(!scene.anims.exists(name))scene.anims.create({key:name,frames:scene.anims.generateFrameNumbers(key,{start,end}),frameRate:fps,repeat});
    };
    add(key,0,3,6,-1);
    if(asset.hasEffect)add(kaiEffectKey(id),4,7,11,0);
  }
}
const effects=new WeakMap<Phaser.Scene,Set<Phaser.GameObjects.Sprite>>();
/** Bounded, visual-only generated effect. Existing combat owns every hit and timer. */
export function playKaiEffect(scene:Phaser.Scene,id:ShopItemId,x:number,y:number,width:number,height:number,flip=false,reduced=false){
  if(!scene.anims.exists(kaiEffectKey(id)))return null;
  let active=effects.get(scene);if(!active){active=new Set();effects.set(scene,active);}
  if(active.size>=24)active.values().next().value?.destroy();
  const sprite=scene.add.sprite(x,y,kaiArtKey(id),reduced?6:4).setDisplaySize(width,height).setDepth(24).setFlipX(flip).setData('kaiShopEffect',id);
  active.add(sprite);sprite.once('destroy',()=>active.delete(sprite));
  if(reduced)scene.tweens.add({targets:sprite,alpha:0,duration:200,onComplete:()=>sprite.destroy()});
  else sprite.play(kaiEffectKey(id)).once('animationcomplete',()=>sprite.destroy());
  return sprite;
}
