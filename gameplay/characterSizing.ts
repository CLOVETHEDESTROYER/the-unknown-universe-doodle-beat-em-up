import type Phaser from 'phaser';
import type {CharacterId} from '../types';
import measurements from './characterSizes.generated.json';

type Profile={target:number;base:number;special:number;mobility:number;victory:number;death:number;flight:number;
  equipment:Record<string,number>;textures:Record<string,number>};
export type HeroPresentation='body'|'special'|'mobility'|'victory'|'death'|'flight';
export const CHARACTER_SIZES:Record<CharacterId,Profile>=measurements;

export const standingBodyHeight=(hero:CharacterId)=>hero==='zgod'?76:108;

/** One calibration per authored animation family, never per-frame stretching. */
export function characterScale(hero:CharacterId,texture='',presentation:HeroPresentation='body'){
  const spec=CHARACTER_SIZES[hero];
  let sourceHeight=presentation==='body'?spec.base:spec[presentation];
  if(presentation==='body'){
    const power=/^hero_(hands|blaster|sword|frost|ember|storm)_/.exec(texture)?.[1]
      ?? (/sword/.test(texture)?'sword':/blaster/.test(texture)?'blaster':undefined);
    sourceHeight=spec.textures[texture]??(power?spec.equipment[power]:undefined)??spec.base;
    if(texture==='hero_death')sourceHeight=spec.death;
  }
  return spec.target/sourceHeight;
}

export function sizeCharacter(sprite:Phaser.GameObjects.Sprite,hero:CharacterId,presentation:HeroPresentation='body'){
  sprite.setScale(characterScale(hero,sprite.texture.key,presentation));
}

/** Collider dimensions are in world pixels and stay fixed when artwork changes family. */
export function sizePlayerBody(player:Phaser.Physics.Arcade.Sprite,hero:CharacterId,crouching:boolean){
  sizeCharacter(player,hero);
  const body=player.body as Phaser.Physics.Arcade.Body;
  const width=(hero==='zgod'?30:40)/player.scaleX;
  const height=(crouching?(hero==='zgod'?48:60):standingBodyHeight(hero))/player.scaleY;
  body.setSize(width,height,false).setOffset(player.width*player.originX-width/2,player.height*player.originY-height);
}

const measuredFrames=new WeakMap<Phaser.Textures.Frame,number>();
/** Used by capture-mode QA; ignores transparent padding and faint aura pixels. */
export function visibleCharacterHeight(sprite:Phaser.GameObjects.Sprite){
  const frame=sprite.frame;
  let height=measuredFrames.get(frame);
  if(height===undefined){
    const canvas=document.createElement('canvas');canvas.width=frame.cutWidth;canvas.height=frame.cutHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    ctx.drawImage(frame.source.image as CanvasImageSource,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,canvas.width,canvas.height);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let top=canvas.height,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(rgba[(y*canvas.width+x)*4+3]>128){top=Math.min(top,y);bottom=Math.max(bottom,y);break;}
    height=bottom<0?0:bottom-top+1;measuredFrames.set(frame,height);
  }
  return Math.round(height*Math.abs(sprite.scaleY)*10)/10;
}
