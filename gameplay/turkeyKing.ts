import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
type Sprite=Phaser.Physics.Arcade.Sprite;
interface Hooks{
  player:Sprite;enemies:Phaser.Physics.Arcade.Group;projectiles:Phaser.Physics.Arcade.Group;
  facing:()=>number;canUse:()=>boolean;clearLine:(enemy:Sprite)=>boolean;
  damage:(enemy:Sprite,amount:number,projectile?:boolean)=>boolean;fired:()=>void;
}
export const TURKEY_KING={folder:'/characters/turkey-king-v2/',staffDamage:4,staffRange:145,staffCooldown:550,throwDamage:4,throwCooldown:850,throwSpeed:620};
export function loadTurkeyKingAssets(load:Phaser.Loader.LoaderPlugin){
  load.spritesheet('turkey_king_body',TURKEY_KING.folder+'spritesheet.png',{frameWidth:640,frameHeight:640});
  load.spritesheet('turkey_king_bird',TURKEY_KING.folder+'turkey-projectile.png',{frameWidth:256,frameHeight:256});
  load.spritesheet('hero_death',TURKEY_KING.folder+'death.png',{frameWidth:640,frameHeight:640});
}
/** Native weapons share the campaign's ordinary damage/guard/projectile paths. */
export class TurkeyKingCombat{
  private staffAt=-9999;private throwAt=-9999;private staffDone=true;private throwDone=true;
  private direction=1;private readyAt=0;private staffReadyAt=0;
  private lastClockAt=0;private resumed=false;
  private staffBufferedUntil=0;private throwBufferedUntil=0;
  private hud:Phaser.GameObjects.Text;
  throws=0;staffSwings=0;staffHits=0;
  constructor(private scene:Phaser.Scene,private hooks:Hooks){
    scene.anims.create({key:'turkey_king_fly',frames:[0,1,2,3].map(frame=>({key:'turkey_king_bird',frame})),frameRate:10,repeat:-1});
    this.hud=scene.add.text(24,108,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'20px',color:'#ffdb9c',stroke:'#21182d',strokeThickness:5}).setScrollFactor(0).setDepth(83);
    scene.events.on(Phaser.Scenes.Events.RESUME,()=>{this.resumed=true;});
  }
  get casting(){return this.scene.time.now<this.throwAt+380;}
  get swinging(){return this.scene.time.now<this.staffAt+340;}
  get facing(){return this.casting||this.swinging?this.direction:this.hooks.facing();}
  update(staff:boolean,toss:boolean){
    const now=this.scene.time.now;
    if(this.resumed){
      const gap=Math.max(0,now-this.lastClockAt-this.scene.game.loop.delta);
      if(this.staffAt>0)this.staffAt+=gap;if(this.throwAt>0)this.throwAt+=gap;
      if(this.readyAt>0)this.readyAt+=gap;if(this.staffReadyAt>0)this.staffReadyAt+=gap;
      for(const shot of this.hooks.projectiles.getChildren())if(shot.getData('turkeyKingProjectile'))shot.setData('playerShotExpiresAt',Number(shot.getData('playerShotExpiresAt'))+gap);
      this.resumed=false;
    }
    this.lastClockAt=now;
    this.hud.setText(`X / SP: TURKEY TOSS · ${now<this.readyAt?((this.readyAt-now)/1000).toFixed(1)+'s':'READY'}`);
    if(!this.hooks.canUse()){this.cancel();return;}
    if(staff)this.staffBufferedUntil=now+300;if(toss)this.throwBufferedUntil=now+300;
    if(!this.casting&&!this.swinging){
      if(now<this.throwBufferedUntil&&now>=this.readyAt){this.staffBufferedUntil=this.throwBufferedUntil=0;this.throwAt=now;this.readyAt=now+TURKEY_KING.throwCooldown;this.throwDone=false;this.direction=this.hooks.facing();}
      else if(now<this.staffBufferedUntil&&now>=this.staffReadyAt){this.staffBufferedUntil=0;this.staffAt=now;this.staffReadyAt=now+TURKEY_KING.staffCooldown;this.staffDone=false;this.direction=this.hooks.facing();this.staffSwings++;playSfx('swordSwing',{pitch:.75});}
    }
    if(!this.throwDone&&now-this.throwAt>=110){this.throwDone=true;this.throwTurkey();}
    if(!this.staffDone&&now-this.staffAt>=100){this.staffDone=true;this.strike();}
  }
  private strike(){
    const p=this.hooks.player,d=this.direction;
    const rect=new Phaser.Geom.Rectangle(d>0?p.x-8:p.x-TURKEY_KING.staffRange+8,p.y-145,TURKEY_KING.staffRange,150);
    for(const enemy of this.hooks.enemies.getChildren() as Sprite[]){
      if(!enemy.active||!this.hooks.clearLine(enemy))continue;
      const b=enemy.body as Phaser.Physics.Arcade.Body;
      if(Phaser.Geom.Intersects.RectangleToRectangle(rect,new Phaser.Geom.Rectangle(b.x,b.y,b.width,b.height))&&this.hooks.damage(enemy,TURKEY_KING.staffDamage))this.staffHits++;
    }
  }
  private throwTurkey(){
    const p=this.hooks.player,d=this.direction,now=this.scene.time.now;
    const x=p.x+d*190*p.scaleX,y=p.y-295*p.scaleY;
    const target=(this.hooks.enemies.getChildren() as Sprite[]).filter(e=>e.active&&d*(e.x-p.x)>30&&d*(e.x-p.x)<750&&this.hooks.clearLine(e))
      .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    const dy=target?(target.body as Phaser.Physics.Arcade.Body).center.y-y:0;
    const angle=target?Phaser.Math.Clamp(Math.atan2(dy,Math.max(90,Math.abs(target.x-x))),-.45,.55):0;
    const bird=this.hooks.projectiles.create(x,y,'turkey_king_bird',0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    bird.setOrigin(.58,.58).setScale(.32).setFlipX(d<0).setDepth(22).play('turkey_king_fly')
      .setData('damage',TURKEY_KING.throwDamage).setData('turkeyKingProjectile',true).setData('pattern','royal_turkey')
      .setData('playerShotExpiresAt',now+1700).setVelocity(d*Math.cos(angle)*TURKEY_KING.throwSpeed,Math.sin(angle)*TURKEY_KING.throwSpeed);
    bird.body.setAllowGravity(false).setSize(145,105,true);
    this.throws++;this.hooks.fired();playSfx('punchSwing',{pitch:.6,volume:.6});
  }
  pose(grounded:boolean,vx:number,vy:number,stride:number,hurtAge:number){
    const now=this.scene.time.now;
    if(hurtAge<300)return 13;
    if(this.casting)return now-this.throwAt<110?10:now-this.throwAt<230?11:12;
    if(this.swinging)return now-this.staffAt<100?7:now-this.staffAt<220?8:9;
    if(!grounded)return vy<0?5:6;
    return Math.abs(vx)>18?1+Math.floor(stride/34)%4:0;
  }
  read(){return {name:'Royal Turkey Toss',throws:this.throws,staffSwings:this.staffSwings,staffHits:this.staffHits,
    active:this.casting,staffActive:this.swinging,cooldownRemainingMs:Math.max(0,this.readyAt-this.scene.time.now),staffDamage:TURKEY_KING.staffDamage,throwDamage:TURKEY_KING.throwDamage};}
  cancel(){this.staffDone=this.throwDone=true;this.staffAt=this.throwAt=-9999;this.staffBufferedUntil=this.throwBufferedUntil=0;}
  destroy(){this.hud.destroy();}
}
