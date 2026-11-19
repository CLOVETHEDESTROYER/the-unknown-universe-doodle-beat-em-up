import Phaser from 'phaser';
import {inkColor,type CosmeticLoadout} from './shopCatalog';

type Pulse={x:number;y:number;at:number;duration:number;kind:'muzzle'|'hit'|'slam';strong:boolean;color:number};
/** One additive ink layer, short-lived pulses, and capped visual-only hit silhouettes. */
export class CombatEffects{
  private glow:Phaser.GameObjects.Graphics;
  private ink:Phaser.GameObjects.Graphics;
  private pulses:Pulse[]=[];
  private silhouettes=new Set<Phaser.GameObjects.Sprite>();
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private muzzles=0;private hits=0;private landings=0;private trails=0;
  constructor(private scene:Phaser.Scene,private style:()=>CosmeticLoadout){
    this.glow=scene.add.graphics().setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
    this.ink=scene.add.graphics().setDepth(24);
  }
  private pulse(kind:Pulse['kind'],x:number,y:number,strong:boolean,color:number){
    this.pulses.push({kind,x,y,strong,color,at:this.scene.time.now,duration:kind==='slam'?360:kind==='hit'?210:125});
    if(this.pulses.length>32)this.pulses.shift();
  }
  muzzle(x:number,y:number,charged:boolean){this.muzzles++;this.pulse('muzzle',x,y,charged,inkColor(this.style(),charged));}
  hit(source:Phaser.GameObjects.Sprite,x:number,y:number,strong:boolean){
    this.hits++;const color=inkColor(this.style(),strong);this.pulse('hit',x,y,strong,color);
    if(!source.active||!source.visible||this.silhouettes.size>=8)return;
    const flash=this.scene.add.sprite(source.x,source.y,source.texture.key,source.frame.name)
      .setOrigin(source.originX,source.originY).setScale(source.scaleX,source.scaleY).setFlipX(source.flipX)
      .setAngle(source.angle).setDepth(source.depth+1).setTintFill(strong?0xfff4d0:color).setAlpha(this.reduced.matches?.28:.6);
    this.silhouettes.add(flash);
    this.scene.tweens.add({targets:flash,alpha:0,duration:this.reduced.matches?55:95,onComplete:()=>{this.silhouettes.delete(flash);flash.destroy();}});
  }
  landing(x:number,y:number){this.landings++;this.pulse('slam',x,y,true,0xffd17c);}
  tick(projectiles:Phaser.Physics.Arcade.Group){
    const g=this.glow,ink=this.ink,now=this.scene.time.now,style=this.style(),reduced=this.reduced.matches;
    g.clear();ink.clear();this.trails=0;
    for(const child of projectiles.getChildren()){
      const p=child as Phaser.Physics.Arcade.Sprite;if(!p.active||!p.getData('inkShot'))continue;
      this.trails++;
      const body=p.body as Phaser.Physics.Arcade.Body,speed=body.velocity.length();if(speed<1)continue;
      const dx=body.velocity.x/speed,dy=body.velocity.y/speed,color=inkColor(style,Boolean(p.getData('chargedShot')));
      const length=reduced?18:style.trail==='classic'?27:68;
      g.fillStyle(color,.11).fillEllipse(p.x,p.y,p.getData('chargedShot')?82:44,p.getData('chargedShot')?51:28)
        .lineStyle(style.trail==='classic'?3:2,color,.35).lineBetween(p.x-dx*length,p.y-dy*length,p.x,p.y);
      if(style.trail!=='classic')for(let i=1;i<=3;i++){
        const x=p.x-dx*i*length/3,y=p.y-dy*i*length/3,r=style.trail==='starlight'?4:2;
        g.fillStyle(color,.75-i*.13).fillCircle(x,y,style.trail==='chalk'?r:1.5);
        if(style.trail==='starlight')ink.lineStyle(2,color,.8-i*.12).lineBetween(x-r,y,x+r,y).lineBetween(x,y-r,x,y+r);
      }
    }
    this.pulses=this.pulses.filter(p=>now-p.at<p.duration);
    for(const p of this.pulses){
      const t=Phaser.Math.Clamp((now-p.at)/p.duration,0,1),fade=1-t;
      const prism=style.burst==='prism'&&(p.kind==='slam'||p.kind==='hit'&&p.strong);
      const colors=prism?[0x75eaff,0xff87c7,0xffd77b]:[p.color];
      const radius=p.kind==='slam'?(reduced?40:18+t*105):p.kind==='muzzle'?(p.strong?32:15):p.strong?25:12;
      colors.forEach((color,i)=>{
        const r=radius+i*7;
        g.fillStyle(color,(p.kind==='muzzle'?.22:.10)*fade).fillEllipse(p.x,p.y,r*2.6,r*(p.kind==='slam'?.9:2));
        if(p.kind==='slam')ink.lineStyle(3,color,.8*fade).strokeEllipse(p.x,p.y-2,r*2,r*.48);
        else if(p.kind==='hit')ink.lineStyle(2,color,.8*fade).strokeCircle(p.x,p.y,r*(reduced?1:.5+t*.7));
      });
      if(p.kind!=='muzzle'&&!reduced)for(let i=0;i<(p.strong?6:3);i++){
        const a=i*Math.PI*2/(p.strong?6:3),r=(p.kind==='slam'?35:12)+t*(p.kind==='slam'?60:25);
        ink.lineStyle(2,colors[i%colors.length],fade).lineBetween(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*(p.kind==='slam'?.3:1),
          p.x+Math.cos(a)*(r+7),p.y+Math.sin(a)*(r+7)*(p.kind==='slam'?.3:1));
      }
    }
  }
  read(){return {muzzles:this.muzzles,hits:this.hits,landings:this.landings,activeTrails:this.trails,style:this.style(),reducedMotion:this.reduced.matches};}
  clear(){this.glow.clear();this.ink.clear();this.pulses=[];}
  destroy(){this.silhouettes.forEach(s=>s.destroy());this.silhouettes.clear();this.glow.destroy();this.ink.destroy();this.pulses=[];}
}
