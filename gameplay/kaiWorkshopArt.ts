import manifest from '../public/workshop/kai-v1/manifest.json';
import type {BuddyId,ShopItemId} from './shopCatalog';

export const KAI_ART=manifest;
export const kaiArtPath=(id:ShopItemId)=>`/workshop/kai-v1/${id}.webp`;
export const kaiPosterPath=(id:ShopItemId)=>`/workshop/kai-v1/${id}-poster.webp`;
export const kaiArtKey=(id:ShopItemId)=>`kai_shop_${id}`;
export const kaiEffectKey=(id:ShopItemId)=>`kai_shop_effect_${id}`;
export function buddyFrame(clock:number,moving=true,assistAge=-1,reduced=false){
  if(reduced)return assistAge>=0?14:0;
  if(assistAge>=0&&assistAge<400)return 12+Math.min(3,Math.floor(assistAge/100));
  return moving?4+Math.floor(clock/80)%8:Math.floor(clock/200)%4;
}
const images=new Map<ShopItemId,HTMLImageElement>();
/** One decoded image per item, shared by the canvas previews, wardrobe and Alley. */
export function kaiCanvasImage(id:ShopItemId){
  let image=images.get(id);
  if(!image){image=new Image();image.src=kaiArtPath(id);images.set(id,image);}
  return image;
}
export function paintGeneratedBuddy(ctx:CanvasRenderingContext2D,id:BuddyId,facing:number,clock:number,reduced=false){
  const image=kaiCanvasImage(id);if(!image.complete||!image.naturalWidth)return false;
  const frame=buddyFrame(clock,true,-1,reduced);
  ctx.save();if(facing<0)ctx.scale(-1,1);
  ctx.drawImage(image,frame%4*256,Math.floor(frame/4)*256,256,256,-31,-31,62,62);ctx.restore();return true;
}
