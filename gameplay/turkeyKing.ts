import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
import { TurkeyStorm } from './turkeyStorm';
type Sprite=Phaser.Physics.Arcade.Sprite;
interface Hooks{
  player:Sprite;enemies:Phaser.Physics.Arcade.Group;projectiles:Phaser.Physics.Arcade.Group;
  facing:()=>number;canUse:()=>boolean;clearLine:(enemy:Sprite)=>boolean;
  damage:(enemy:Sprite,amount:number,projectile?:boolean)=>boolean;fired:()=>void;
  floorAt:(x:number)=>number|null;
}
export const TURKEY_KING={folder:'/characters/turkey-king-v3/',staffDamage:4,staffRange:145,staffCooldown:550,throwDamage:4,throwCooldown:850,throwSpeed:620};
export function loadTurkeyKingAssets(load:Phaser.Loader.LoaderPlugin){
  load.spritesheet('turkey_king_body',TURKEY_KING.folder+'movement.png',{frameWidth:640,frameHeight:640});
  load.spritesheet('turkey_king_combat',TURKEY_KING.folder+'combat.png',{frameWidth:640,frameHeight:640});
  load.spritesheet('turkey_king_storm',TURKEY_KING.folder+'storm.png',{frameWidth:768,frameHeight:768});
  for(const effect of ['rain','burst'])load.spritesheet('turkey_storm_'+effect,TURKEY_KING.folder+effect+'.png',{frameWidth:256,frameHeight:256});
  load.spritesheet('turkey_storm_wings',TURKEY_KING.folder+'wings.png',{frameWidth:128,frameHeight:128});
  load.spritesheet('turkey_storm_lightning',TURKEY_KING.folder+'lightning.png',{frameWidth:256,frameHeight:512});
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
  private storm:TurkeyStorm;
  throws=0;staffSwings=0;staffHits=0;
  constructor(private scene:Phaser.Scene,private hooks:Hooks){
    this.storm=new TurkeyStorm(scene,hooks);
    scene.anims.create({key:'turkey_king_fly',frames:[0,1,2,3].map(frame=>({key:'turkey_king_bird',frame})),frameRate:10,repeat:-1});
    this.hud=scene.add.text(24,108,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'20px',color:'#ffdb9c',stroke:'#21182d',strokeThickness:5}).setScrollFactor(0).setDepth(83);
    scene.events.on(Phaser.Scenes.Events.RESUME,()=>{this.resumed=true;});
  }
  get casting(){return this.scene.time.now<this.throwAt+440||this.storm.casting;}
  get swinging(){return this.scene.time.now<this.staffAt+440;}
  get facing(){return this.casting||this.swinging?this.direction:this.hooks.facing();}
  updateEffects(delta:number){this.storm.update(delta,this.direction);}
  update(staff:boolean,toss:boolean,special:boolean,delta:number){
    const now=this.scene.time.now;
    this.storm.update(delta,this.direction);
    if(this.resumed){
      const gap=Math.max(0,now-this.lastClockAt-this.scene.game.loop.delta);
      if(this.staffAt>0)this.staffAt+=gap;if(this.throwAt>0)this.throwAt+=gap;
      if(this.readyAt>0)this.readyAt+=gap;if(this.staffReadyAt>0)this.staffReadyAt+=gap;
      for(const shot of this.hooks.projectiles.getChildren())if(shot.getData('turkeyKingProjectile'))shot.setData('playerShotExpiresAt',Number(shot.getData('playerShotExpiresAt'))+gap);
      this.resumed=false;
    }
    this.lastClockAt=now;
    this.hud.setText(`X / SP: TURKEY STORM · ${this.storm.cooldown>0?(this.storm.cooldown/1000).toFixed(1)+'s':'READY'}`);
    if(!this.hooks.canUse()){this.cancel();return;}
    if(staff)this.staffBufferedUntil=now+300;if(toss)this.throwBufferedUntil=now+300;
    if(!this.casting&&!this.swinging){
      if(special&&this.storm.start()){this.direction=this.hooks.facing();this.staffBufferedUntil=this.throwBufferedUntil=0;}
      else if(now<this.throwBufferedUntil&&now>=this.readyAt){this.staffBufferedUntil=this.throwBufferedUntil=0;this.throwAt=now;this.readyAt=now+TURKEY_KING.throwCooldown;this.throwDone=false;this.direction=this.hooks.facing();}
      else if(now<this.staffBufferedUntil&&now>=this.staffReadyAt){this.staffBufferedUntil=0;this.staffAt=now;this.staffReadyAt=now+TURKEY_KING.staffCooldown;this.staffDone=false;this.direction=this.hooks.facing();this.staffSwings++;playSfx('swordSwing',{pitch:.75});}
    }
    if(!this.throwDone&&now-this.throwAt>=195){this.throwDone=true;this.throwTurkey();}
    if(!this.staffDone&&now-this.staffAt>=175){this.staffDone=true;this.strike();}
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
    const x=p.x+d*190*p.scaleX,y=p.y-270*p.scaleY;
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
  pose(grounded:boolean,vx:number,vy:number,stride:number,hurtAge:number,crouching=false){
    const now=this.scene.time.now;
    if(hurtAge<300)return {texture:'turkey_king_combat',frame:12};
    if(this.storm.casting){
      const age=this.storm.age;
      return {texture:'turkey_king_storm',frame:age<150?0:age<320?1:age<500?2:age<760?3:age<980?4:5};
    }
    if(now<this.throwAt+440){const age=now-this.throwAt;return {texture:'turkey_king_combat',frame:6+(age<70?0:age<135?1:age<195?2:age<265?3:age<345?4:5)};}
    if(this.swinging){const age=now-this.staffAt;return {texture:'turkey_king_combat',frame:age<60?0:age<125?1:age<175?2:age<260?3:age<350?4:5};}
    return {texture:'turkey_king_body',frame:!grounded?vy<0?9:10:crouching?8:Math.abs(vx)>18?2+Math.floor(stride/26)%6:Math.floor(now/480)%2};
  }
  read(){return {name:'Royal Turkey Toss',throws:this.throws,staffSwings:this.staffSwings,staffHits:this.staffHits,
    active:this.casting,staffActive:this.swinging,cooldownRemainingMs:Math.max(0,this.readyAt-this.scene.time.now),storm:this.storm.read(),staffDamage:TURKEY_KING.staffDamage,throwDamage:TURKEY_KING.throwDamage};}
  cancel(clearStorm=false){this.staffDone=this.throwDone=true;this.staffAt=this.throwAt=-9999;this.staffBufferedUntil=this.throwBufferedUntil=0;this.storm.interrupt(clearStorm);}
  destroy(){this.hud.destroy();}
}
