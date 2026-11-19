import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
import {CHARGED_BOLT_TEXTURE} from './chargedBlasterEffects';
import {SPECIALS, type BuddyId, type SpecialId} from './shopCatalog';

type Actor = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;

export function drawBuddy(art:Phaser.GameObjects.Graphics, buddy:BuddyId, facing:number, flap:number) {
  art.clear();
  const moth=buddy==='spark-moth';
  const outline=0x2c2441, shell=moth?0xffc866:0x7fe3cb;
  const height=12+flap*3;
  for(const side of [-1,1]){
    art.fillStyle(moth?0xdfbbff:0x6caad9).fillEllipse(side*13,-3,19,height)
      .lineStyle(2,outline).strokeEllipse(side*13,-3,19,height);
  }
  art.fillStyle(shell).fillEllipse(0,0,moth?24:28,20).lineStyle(2,outline).strokeEllipse(0,0,moth?24:28,20);
  art.lineBetween(-5,-9,-8,-16).lineBetween(5,-9,8,-16);
  art.fillStyle(outline).fillCircle(facing*4-3,-2,1.7).fillCircle(facing*4+3,-2,1.7);
  if(moth)art.fillStyle(0xfff6ca).fillCircle(0,5,3);
  else art.lineStyle(2,0xfff3d0).lineBetween(-3,5,3,5).lineBetween(0,2,0,8);
}

interface Hooks {
  player:Actor;
  enemies:Phaser.Physics.Arcade.Group;
  projectiles:Phaser.Physics.Arcade.Group;
  facing:()=>number;
  damage:(enemy:Actor,damage:number)=>boolean;
  clearLine:(enemy:Actor)=>boolean;
}

export class WorkshopCombat {
  private readonly buddyArt:Phaser.GameObjects.Graphics;
  private readonly reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  private nextSpecial=0;
  private nextAssist=0;
  private uses=0;
  private assists=0;
  private buddy:BuddyId|'classic'='classic';
  constructor(private readonly scene:Phaser.Scene,private readonly hooks:Hooks){
    this.buddyArt=scene.add.graphics().setDepth(19).setVisible(false);
  }

  private bolt(x:number,y:number,angle:number,speed:number,damage:number,color:number,size:number,pierces=1) {
    const shot=this.hooks.projectiles.create(x,y,CHARGED_BOLT_TEXTURE) as Actor;
    shot.setDisplaySize(size,size*.55).setTint(color).setRotation(angle).setDepth(22)
      .setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed)
      .setData('damage',damage).setData('workshopShot',true)
      .setData('companionPierces',pierces).setData('companionTargets',new Set<Actor>())
      .setData('companionShotExpiresAt',this.scene.time.now+1300);
    (shot.body as Body).setAllowGravity(false).setSize(shot.width*.76,shot.height*.65,true);
  }

  private pulse(x:number,y:number,width:number,height:number,color:number) {
    const ring=this.scene.add.ellipse(x,y,width,height,color,.15).setStrokeStyle(3,color,.95).setDepth(23);
    this.scene.tweens.add({targets:ring,alpha:0,scale:this.reducedMotion.matches?1:1.23,duration:330,onComplete:()=>ring.destroy()});
  }

  trigger(id:SpecialId) {
    const now=this.scene.time.now;
    if(now<this.nextSpecial)return;
    const spec=SPECIALS[id], body=this.hooks.player.body as Body, direction=this.hooks.facing();
    const {x,y}=body.center;
    this.nextSpecial=now+spec.cooldown;
    this.uses++;
    if(id==='ink-fan'||id==='rail-pulse'){
      const rail=id==='rail-pulse';
      for(const offset of rail?[0]:[-.26,0,.26]){
        this.bolt(x+direction*18,y,(direction<0?Math.PI:0)+offset,rail?820:520,rail?6:3,spec.color,rail?88:47,rail?3:1);
      }
      this.pulse(x+direction*26,y,48,38,spec.color);
      playSfx('blasterChargeFire');
      return;
    }
    const isNet=id==='static-net';
    const effectX=x+(isNet?direction*135:0);
    const area=new Phaser.Geom.Ellipse(effectX,y,isNet?300:270,isNet?143:195);
    for(const object of [...this.hooks.enemies.getChildren()]){
      const enemy=object as Actor;
      if(!enemy.active||!enemy.body?.enable||!this.hooks.clearLine(enemy))continue;
      const target=(enemy.body as Body).center;
      if(area.contains(target.x,target.y))this.hooks.damage(enemy,isNet?4:5);
    }
    for(const object of [...this.hooks.projectiles.getChildren()]){
      const shot=object as Actor;
      if(shot.active&&shot.getData('enemyProjectile')&&area.contains(shot.x,shot.y))shot.destroy();
    }
    this.pulse(effectX,y,area.width,area.height,spec.color);
    playSfx(isNet?'storm':'slamCharge');
  }

  updateBuddy(id:BuddyId|'classic',delta:number,assistance=true) {
    this.buddy=id;
    const player=this.hooks.player,art=this.buddyArt;
    if(id==='classic'||!player.active){art.setVisible(false);return;}
    const now=this.scene.time.now,facing=this.hooks.facing(), body=player.body as Body;
    const flap=this.reducedMotion.matches?0:Math.sin(now/110);
    const x=player.x-facing*78,y=body.center.y-39+flap*5;
    const step=1-Math.exp(-delta/100);
    if(!art.visible||Phaser.Math.Distance.Between(x,y,art.x,art.y)>270)art.setPosition(x,y);
    else art.setPosition(Phaser.Math.Linear(art.x,x,step),Phaser.Math.Linear(art.y,y,step));
    art.setVisible(true);
    drawBuddy(art,id,facing,flap);
    if(!assistance||now<this.nextAssist)return;
    if(id==='patch-beetle'){
      const inbound=this.hooks.projectiles.getChildren().find((object)=>{
        const shot=object as Actor;
        if(!shot.active||!shot.body?.enable||!shot.getData('enemyProjectile'))return false;
        const dx=body.center.x-shot.x,dy=body.center.y-shot.y,v=(shot.body as Body).velocity;
        return Math.abs(dx)<115&&Math.abs(dy)<body.height*.55&&dx*v.x+dy*v.y>0;
      }) as Actor|undefined;
      if(!inbound)return;
      this.pulse(inbound.x,inbound.y,48,48,0x7fe3cb);
      inbound.destroy();this.nextAssist=now+5500;
      playSfx('shield',{volume:.45});
    } else {
      const target=this.hooks.enemies.getChildren().find(object=>{
        const enemy=object as Actor;
        return enemy.active&&enemy.body?.enable&&Phaser.Math.Distance.Between(art.x,art.y,enemy.x,enemy.y)<330&&this.hooks.clearLine(enemy);
      }) as Actor|undefined;
      if(!target)return;
      const center=(target.body as Body).center;
      this.bolt(art.x,art.y,Phaser.Math.Angle.Between(art.x,art.y,center.x,center.y),370,2,0xffdc79,27);
      this.nextAssist=now+2300;
      playSfx('enemyLaser',{volume:.18,pitch:1.35});
    }
    this.assists++;
  }
  read() {
    return {uses:this.uses,cooldownRemainingMs:this.cooldownRemainingMs,buddy:this.buddy,
      buddyVisible:this.buddyArt.visible,assists:this.assists};
  }
  get cooldownRemainingMs(){return Math.max(0,this.nextSpecial-this.scene.time.now);}
}
