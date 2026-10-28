import Phaser from 'phaser';

export const VOID_REGENT_HEALTH = 84;
export const REGENT_PHASE_ONE = ['star_fan','blink_burst','shadow_dash','void_rain'] as const;
export const REGENT_PHASE_TWO = ['blink_burst','star_fan','void_rain','blink_burst','shadow_dash','star_fan'] as const;
export type RegentMove = typeof REGENT_PHASE_ONE[number];
export const isRegentMove=(value:unknown):value is RegentMove=>REGENT_PHASE_ONE.includes(value as RegentMove);

export function regentTeleportTarget(x:number,left:number,right:number,viewWidth:number){
  // Keep the whole drawing visible on narrow screens while crossing most of
  // the viewport. Both endpoints stay on the final arena's continuous floor.
  const inset=Math.max(40,(right-left-viewWidth)/2+150);
  return x<(left+right)/2?right-inset:left+inset;
}

export function regentBlinkFrame(elapsed:number,phase:number){
  const returning=phase===2&&elapsed>=1080;
  const age=elapsed-(returning?1080:0);
  return {leg:returning?2:1,teleportAt:returning?1240:160,
    alpha:age<120?1-age/120:age<160?0:Math.min(1,(age-160)/200),
    contact:age>=400,returnWarning:phase===2&&elapsed>=800&&elapsed<1240};
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
