import Phaser from 'phaser';
import {bossCounterWindow} from './bossPresentation';

export const VOID_REGENT_HEALTH = 120;
export const REGENT_PHASE_ONE = ['star_fan','void_crash','blink_burst','crown_nova','shadow_dash','void_rain'] as const;
export const REGENT_PHASE_TWO = ['blink_burst','crown_nova','void_crash','star_fan','void_rain','shadow_dash'] as const;
export const REGENT_PHASE_THREE = ['crown_nova','blink_burst','void_crash','void_rain','star_fan','shadow_dash'] as const;
export const REGENT_NEW_MOVES={
  crown_nova:{tell:1100,attack:2550,recovery:2800,hint:'CROWN NOVA - WATCH THE STAR GAPS!'},
  void_crash:{tell:1100,attack:2300,recovery:2800,hint:'VOID CRASH - LEAVE THE RING, JUMP WAVES!'},
};
export type RegentMove = typeof REGENT_PHASE_ONE[number];
export const isRegentMove=(value:unknown):value is RegentMove=>REGENT_PHASE_ONE.includes(value as RegentMove);
export const regentPhaseForHealth=(hp:number,maxHp:number)=>hp<=maxHp/3?3:hp<=maxHp*2/3?2:1;
export const regentCounterWindow=(phase:number,base:number)=>bossCounterWindow(phase,base);
export const regentTellDuration=(phase:number,base:number)=>Math.max(650,base-(phase>=3?200:phase>=2?120:0));
export function regentBattlePose(move:string,state:string,elapsed:number){
  if(state==='patrol')return 0;
  if(state==='recover')return 10;
  if(state==='phase')return 11;
  if(move==='crown_nova')return state==='tell'?2:3;
  if(move==='void_crash')return state==='tell'?4:elapsed<430?5:elapsed<850?6:7;
  if(move==='shadow_dash')return state==='tell'?4:elapsed<650?8:0;
  if(move==='blink_burst')return 9;
  return state==='tell'?0:1;
}

export function regentCrashFrame(elapsed:number){
  if(elapsed<400){const t=elapsed/400;return {travel:t*.4,lift:Math.sin(t*Math.PI/2)*145,landed:false};}
  if(elapsed<850){const t=(elapsed-400)/450;return {travel:.4+.6*t,lift:145*(1-t*t),landed:false};}
  return {travel:1,lift:0,landed:true};
}

/** Procedural, readable stars and low shockwaves match the existing ink effects. */
export function makeRegentCombatTextures(scene:Phaser.Scene){
  if(scene.textures.exists('regent_nova_star'))return;
  const g=scene.make.graphics({x:0,y:0});
  const points=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8-Math.PI/2,r=i%2?10:27;return new Phaser.Geom.Point(32+Math.cos(a)*r,32+Math.sin(a)*r);});
  g.fillStyle(0x210e3b,1).fillPoints(points,true).lineStyle(3,0xb77cff,1).strokePoints(points,true);
  g.fillStyle(0xf9d879,1).fillCircle(32,32,6);g.generateTexture('regent_nova_star',64,64);g.clear();
  g.lineStyle(8,0x321847,1).strokeEllipse(48,24,84,30).lineStyle(4,0xd59bff,1).strokeEllipse(48,24,84,30)
    .lineStyle(2,0xffdd8c,1).lineBetween(10,24,86,24);g.generateTexture('regent_crash_wave',96,48);g.destroy();
}

export function regentTeleportTarget(x:number,left:number,right:number,viewWidth:number){
  // Keep the whole drawing visible on narrow screens while crossing most of
  // the viewport. Both endpoints stay on the final arena's continuous floor.
  const inset=Math.max(40,(right-left-viewWidth)/2+150);
  return x<(left+right)/2?right-inset:left+inset;
}

export function regentBlinkFrame(elapsed:number,phase:number){
  const leg=phase>=3&&elapsed>=2160?3:phase>=2&&elapsed>=1080?2:1;
  const age=elapsed-(leg-1)*1080;
  const warningLeg=phase>=3&&elapsed>=1880&&elapsed<2320?3:phase>=2&&elapsed>=800&&elapsed<1240?2:0;
  return {leg,teleportAt:(leg-1)*1080+160,warningLeg,
    alpha:age<120?1-age/120:age<160?0:Math.min(1,(age-160)/200),
    contact:age>=400,returnWarning:warningLeg>0};
}

/** Short-lived portals and departure echoes reuse the existing boss drawing. */
export class RegentRiftEffects {
  private objects=new Set<Phaser.GameObjects.Image|Phaser.GameObjects.Graphics>();
  constructor(private scene:Phaser.Scene){scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.clear());}
  burst(pose:Phaser.GameObjects.Sprite,from:number,to:number,feet:number){
    const echo=this.scene.add.image(from,feet,pose.texture.key,pose.frame.name)
      .setOrigin(pose.originX,pose.originY).setScale(pose.scaleX,pose.scaleY)
      .setFlipX(pose.flipX).setTint(0xcaa2ff).setAlpha(.5).setDepth(12);
    this.objects.add(echo);
    this.scene.tweens.add({targets:echo,scaleX:pose.scaleX*.25,alpha:0,duration:240,
      onComplete:()=>{this.objects.delete(echo);echo.destroy();}});
    for(const x of [from,to]){
      const ring=this.scene.add.graphics().setPosition(x,feet-105).setDepth(14);
      ring.lineStyle(5,0xb68bff,.9).strokeEllipse(0,0,80,210)
        .lineStyle(2,0x9af1ff,.85).strokeEllipse(0,0,62,194);
      this.objects.add(ring);
      this.scene.tweens.add({targets:ring,scaleX:1.6,scaleY:.8,alpha:0,duration:340,
        onComplete:()=>{this.objects.delete(ring);ring.destroy();}});
    }
  }
  clear(){for(const object of this.objects){this.scene.tweens.killTweensOf(object);object.destroy();}this.objects.clear();}
  get count(){return this.objects.size;}
}
