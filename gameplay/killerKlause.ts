import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
import run from './klauseRun.generated.json';

type Sprite = Phaser.Physics.Arcade.Sprite;
interface Hooks {
  player:Sprite; enemies:Phaser.Physics.Arcade.Group; projectiles:Phaser.Physics.Arcade.Group;
  facing:()=>number; canUse:()=>boolean; clearLine:(enemy:Sprite)=>boolean;
  damage:(enemy:Sprite,amount:number,projectile?:boolean)=>boolean; fired:()=>void;
  heal:(amount:number)=>number;
}
export const KLAUSE_ART = '/seasonal/christmas-v1/';
export function loadKillerKlauseAssets(load:Phaser.Loader.LoaderPlugin) {
  for (const [key,file] of [['klause_body','movement'],['klause_combat','combat'],['klause_special','special'],['hero_death','special']])
    load.spritesheet(key,KLAUSE_ART+`killer-klause/${file}.png`,{frameWidth:640,frameHeight:640});
  load.spritesheet('klause_combo',KLAUSE_ART+'killer-klause/combo-v2.png',{frameWidth:640,frameHeight:640});
  load.spritesheet('klause_run',KLAUSE_ART+'killer-klause/run-v2.png',{frameWidth:640,frameHeight:640});
  load.spritesheet('klause_fx',KLAUSE_ART+'effects/christmas-fx.png',{frameWidth:256,frameHeight:256});
  for (const role of ['medic','engineer']) load.spritesheet('klause_elf_'+role,KLAUSE_ART+`elves/${role}.png`,{frameWidth:320,frameHeight:320});
}

/** Native weapon preview, using ordinary projectile collisions and boss guards. */
export class KillerKlauseCombat {
  private clock=0;
  private lastSceneAt=0;
  private direction=1;
  private action:'fire'|'melee'|'helpers'|null=null;
  private actionAt=-9999;
  private readyAt=0;
  private meleeReadyAt=0;
  private meleeBufferedUntil=-1;
  private comboExpiresAt=-1;
  private comboIndex=0;
  private fireWasHeld=false;
  private fireBufferedUntil=-1;
  private helperReadyAt=0;
  private helperAt=-9999;
  private resolved=false;
  private medicDone=false;
  private engineerShots=0;
  private alive=true;
  private clearing=false;
  private hud:Phaser.GameObjects.Text;
  private rainbow:Phaser.GameObjects.Sprite;
  private rainbowKey:string;
  private rainbowTexture:Phaser.Textures.CanvasTexture;
  private rainbowFrame='';
  private rainbowAt=-100;
  private medic:Phaser.GameObjects.Sprite;
  private engineer:Phaser.GameObjects.Sprite;
  private fx:Array<{sprite:Phaser.GameObjects.Sprite;at:number;start:number;fps:number}>=[];
  private shots=0;
  private hits=0;
  private swings=0;
  private calls=0;
  private healing=0;
  constructor(private scene:Phaser.Scene,private hooks:Hooks) {
    this.medic=scene.add.sprite(0,0,'klause_elf_medic',0).setOrigin(.5,.9375).setScale(.36).setDepth(19).setVisible(false);
    this.engineer=scene.add.sprite(0,0,'klause_elf_engineer',0).setOrigin(.5,.9375).setScale(.36).setDepth(19).setVisible(false);
    this.hud=scene.add.text(24,108,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'19px',color:'#b8f6da',stroke:'#192831',strokeThickness:5}).setScrollFactor(0).setDepth(83);
    this.rainbowKey=`klause_rainbow_${scene.sys.settings.key}`;
    if(scene.textures.exists(this.rainbowKey))scene.textures.remove(this.rainbowKey);
    this.rainbowTexture=scene.textures.createCanvas(this.rainbowKey,640,640);
    this.rainbow=scene.add.sprite(0,0,this.rainbowKey).setOrigin(.5,600/640).setDepth(20.1).setAlpha(0);
    scene.anims.create({key:'klause_gift_flight',frames:[0,1,2,3].map(frame=>({key:'klause_fx',frame})),frameRate:10,repeat:-1});
  }
  get casting(){return this.action==='fire'||this.action==='helpers';}
  get swinging(){return this.action==='melee';}
  get facing(){return this.action==='melee'?this.direction:this.hooks.facing();}
  present(player:Sprite,invulnerable:boolean,now:number){
    if(!invulnerable||!player.visible){this.rainbow.setVisible(false);return;}
    const frameKey=`${player.texture.key}:${player.frame.name}`,ctx=this.rainbowTexture.context;
    if(frameKey!==this.rainbowFrame||now-this.rainbowAt>=34){
      const frame=player.frame;
      ctx.clearRect(0,0,640,640);
      ctx.drawImage(frame.source.image as CanvasImageSource,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,640,640);
      ctx.globalCompositeOperation='source-in';
      const gradient=ctx.createLinearGradient(0,0,640,0),phase=(now/1500)%1;
      for(let band=0;band<10;band++){
        const shade=Phaser.Display.Color.HSVToRGB((phase+band/10)%1,.92,1) as Phaser.Types.Display.ColorObject;
        const css=`rgba(${shade.r},${shade.g},${shade.b},0.92)`;
        gradient.addColorStop(band/10,css);
        gradient.addColorStop(Math.min(.999,(band+.78)/10),css);
      }
      gradient.addColorStop(1,gradientColor(Phaser,phase));
      ctx.fillStyle=gradient;ctx.fillRect(0,0,640,640);ctx.globalCompositeOperation='source-over';
      this.rainbowTexture.refresh();this.rainbowFrame=frameKey;this.rainbowAt=now;
    }
    this.rainbow.setVisible(true).setPosition(player.x,player.y)
      .setOrigin(player.originX,player.originY).setScale(player.scaleX,player.scaleY)
      .setFlipX(player.flipX).setFlipY(player.flipY).setAngle(player.angle).setDepth(player.depth+.1)
      .clearTint().setAlpha(.68+.08*Math.sin(now/90));
  }
  updateEffects(delta:number) { this.advance(delta); }
  update(melee:boolean,fire:boolean,special:boolean,delta:number) {
    this.advance(delta);
    const age=this.clock-this.actionAt;
    if(this.action&&age>=(this.action==='fire'?900:this.action==='helpers'?500:this.action==='melee'?this.comboDuration():420))this.action=null;
    if(!this.hooks.canUse()){this.cancel();return;}
    // Keep one tap through a committed reload. Holding FIRE repeats without
    // leaving an extra shot queued when the button is released.
    if(fire&&!this.fireWasHeld)this.fireBufferedUntil=this.clock+1000;
    this.fireWasHeld=fire;
    if(melee)this.meleeBufferedUntil=this.clock+520;
    if(!this.action){
      if(special&&this.clock>=this.helperReadyAt){
        this.action='helpers';this.helperAt=this.clock;this.helperReadyAt=this.clock+10000;
        this.medicDone=false;this.engineerShots=0;this.calls++;
      }else if((fire||this.clock<=this.fireBufferedUntil)&&this.clock>=this.readyAt){
        this.action='fire';this.readyAt=this.clock+950;this.fireBufferedUntil=-1;
      }
      else if(this.clock<=this.meleeBufferedUntil&&this.clock>=this.meleeReadyAt){
        this.comboIndex=this.clock<=this.comboExpiresAt?this.comboIndex%3+1:1;
        this.action='melee';this.actionAt=this.clock;this.direction=this.hooks.facing();this.comboExpiresAt=this.clock+900;
        this.meleeReadyAt=this.clock+(this.comboIndex===3?540:300);this.meleeBufferedUntil=-1;
        this.resolved=false;this.swings++;playSfx('punchSwing',{pitch:this.comboIndex===3?.55:.9});
      }
      if(this.action){this.actionAt=this.clock;this.direction=this.hooks.facing();this.resolved=false;}
    }
    const meleeHitAt=this.comboIndex===3?215:this.comboIndex===2?175:145;
    if(!this.resolved&&this.clock-this.actionAt>=(this.action==='melee'?meleeHitAt:150)){
      this.resolved=true;
      if(this.action==='fire')this.launchGift();
      else if(this.action==='melee'){
        const p=this.hooks.player,d=this.direction;
        const reach=this.comboIndex===3?198:this.comboIndex===2?170:148;
        const height=this.comboIndex===3?170:145;
        const region=new Phaser.Geom.Rectangle(d>0?p.x-8:p.x-reach+8,p.y-height,reach,height+12);
        for(const enemy of this.hooks.enemies.getChildren() as Sprite[]){
          if(!enemy.active||!this.hooks.clearLine(enemy))continue;
          const b=enemy.body as Phaser.Physics.Arcade.Body;
          const damage=this.comboIndex===3?8:this.comboIndex===2?5:4;
          if(Phaser.Geom.Intersects.RectangleToRectangle(region,new Phaser.Geom.Rectangle(b.x,b.y,b.width,b.height))&&this.hooks.damage(enemy,damage)){
            this.hits++;this.effect(enemy.x,b.center.y,4,this.comboIndex===3?.8:.55,d);
            if(this.comboIndex===3)playSfx('powerup',{pitch:.72,volume:.55});
          }
        }
      }
    }
    const helperAge=this.clock-this.helperAt;
    if(helperAge>=400&&helperAge<2800){
      if(!this.medicDone){
        this.medicDone=true;this.healing+=this.hooks.heal(12);
        this.effect(this.hooks.player.x,this.feet-55,12,.6);playSfx('powerup',{volume:.4,pitch:1.1});
      }
      if(helperAge>=650+this.engineerShots*550&&this.engineerShots<2){
        this.engineerShots++;this.launchGift(this.engineer.x,this.engineer.y-48,3);
      }
    }
  }
  private get feet(){return (this.hooks.player.body as Phaser.Physics.Arcade.Body).bottom;}
  private comboDuration(){return this.comboIndex===3?520:this.comboIndex===2?440:400;}
  private advance(delta:number) {
    if(!this.alive)return;
    const gap=this.lastSceneAt?Math.max(0,this.scene.time.now-this.lastSceneAt-delta):0;
    if(gap>80)for(const shot of this.hooks.projectiles.getChildren())if(shot.getData('klauseProjectile'))
      shot.setData('playerShotExpiresAt',Number(shot.getData('playerShotExpiresAt'))+gap);
    this.lastSceneAt=this.scene.time.now;this.clock+=Math.max(0,delta);
    const age=this.clock-this.helperAt,visible=age>=0&&age<2800;
    const d=this.hooks.facing(),p=this.hooks.player;
    for(const [i,elf] of [this.medic,this.engineer].entries()){
      const assisting=age>=350&&age<1600;
      elf.setVisible(visible).setPosition(p.x-d*(70+i*52),this.feet).setFlipX(d<0)
        .setFrame(assisting?8+Math.min(2,Math.floor((age-350)/400)):age>=1600?11:2+Math.floor(age/75)%6);
    }
    this.fx=this.fx.filter(fx=>{
      const frame=Math.floor((this.clock-fx.at)*fx.fps/1000);
      if(frame>=4){fx.sprite.destroy();return false;}
      fx.sprite.setFrame(fx.start+frame);return true;
    });
    this.hud.setText(`X / SP: ELF HELPERS · ${this.clock<this.helperReadyAt?((this.helperReadyAt-this.clock)/1000).toFixed(1)+'s':'READY'}`);
  }
  private launchGift(x?:number,y?:number,damage=5) {
    const p=this.hooks.player,d=this.facing;
    const anchor=p.texture.key==='klause_run'?run.muzzles[Number(p.frame.name)]:undefined;
    const muzzleX=x??p.x+d*(anchor?anchor[0]-320:190)*p.scaleX;
    const muzzleY=y??this.feet+(anchor?anchor[1]-600:-345)*p.scaleY;
    x??=muzzleX+d*14;y??=muzzleY;
    const target=(this.hooks.enemies.getChildren() as Sprite[]).filter(e=>e.active&&d*(e.x-x!)>15&&d*(e.x-x!)<850&&this.hooks.clearLine(e))
      .sort((a,b)=>Math.abs(a.x-x!)-Math.abs(b.x-x!))[0];
    const dy=target?(target.body as Phaser.Physics.Arcade.Body).center.y-y:0;
    const angle=target?Phaser.Math.Clamp(Math.atan2(dy,Math.max(80,Math.abs(target.x-x))),-.65,.65):0;
    const shot=this.hooks.projectiles.create(x,y,'klause_fx',0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    shot.setScale(.55).setFlipX(d<0).setDepth(22).play('klause_gift_flight')
      .setData('damage',damage).setData('pattern','present_rocket').setData('klauseProjectile',true)
      .setData('playerShotExpiresAt',this.scene.time.now+2400).setVelocity(d*Math.cos(angle)*520,Math.sin(angle)*520);
    shot.body.setAllowGravity(false).setSize(92,84,true);
    shot.once('destroy',()=>{if(this.alive&&!this.clearing&&this.scene.sys.isActive())this.effect(shot.x,shot.y,4,.65);});
    this.effect(muzzleX,muzzleY,8,.45,d);this.shots++;this.hooks.fired();playSfx('punchSwing',{pitch:.55,volume:.65});
  }
  private effect(x:number,y:number,start:number,scale:number,direction=1) {
    const sprite=this.scene.add.sprite(x,y,'klause_fx',start).setScale(scale).setFlipX(direction<0).setDepth(23);
    this.fx.push({sprite,at:this.clock,start,fps:start===12?8:18});
  }
  pose(grounded:boolean,vx:number,vy:number,stride:number,hurtAge:number,crouching=false) {
    const age=this.clock-this.actionAt;
    if(hurtAge<300)return {texture:'klause_combat',frame:hurtAge<150?12:13};
    if(this.action==='helpers')return {texture:'klause_special',frame:Math.min(3,Math.floor(age/125))};
    if(this.action==='melee')return {texture:'klause_combo',frame:(this.comboIndex-1)*4+Math.min(3,Math.floor(age/(this.comboDuration()/4)))};
    // Moving fire keeps the legs running; standing fire plays the full reload.
    if(this.action==='fire'&&grounded&&Math.abs(vx)<=18&&!crouching)
      return {texture:'klause_combat',frame:age<335?Math.min(3,Math.floor(age/84)):4+Math.min(3,Math.floor((age-335)/140))};
    if(grounded&&!crouching&&Math.abs(vx)>18)return {texture:'klause_run',frame:Math.floor(stride/run.distancePerFrame)%8};
    return {texture:'klause_body',frame:!grounded?vy<0?9:10:crouching?8:Math.floor(this.clock/480)%2};
  }
  read(){return {name:'Present Launcher',shots:this.shots,meleeSwings:this.swings,meleeHits:this.hits,comboStage:this.action==='melee'?this.comboIndex:0,
    comboRemainingMs:Math.max(0,this.comboExpiresAt-this.clock),active:this.casting,
    cooldownRemainingMs:Math.max(0,this.readyAt-this.clock),fireQueued:this.clock<=this.fireBufferedUntil,helpers:{active:this.clock-this.helperAt<2800,calls:this.calls,
      healing:this.healing,engineerShots:this.engineerShots,cooldownRemainingMs:Math.max(0,this.helperReadyAt-this.clock)}};}
  cancel(clearEffects=false) {
    this.action=null;this.actionAt=-9999;this.resolved=true;
    this.fireBufferedUntil=-1;this.fireWasHeld=false;
    this.meleeBufferedUntil=-1;this.comboExpiresAt=-1;this.comboIndex=0;
    if(clearEffects){
      this.helperAt=-9999;this.medic.setVisible(false);this.engineer.setVisible(false);this.clearing=true;
      for(const shot of [...this.hooks.projectiles.getChildren()])if(shot.getData('klauseProjectile'))shot.destroy();
      this.clearing=false;
      for(const fx of this.fx)fx.sprite.destroy();this.fx=[];
    }
  }
  destroy(){if(!this.alive)return;this.alive=false;this.cancel(true);this.medic.destroy();this.engineer.destroy();this.hud.destroy();this.rainbow.destroy();this.scene.textures.remove(this.rainbowKey);}
}

function gradientColor(phaser:typeof Phaser,phase:number){
  const color=phaser.Display.Color.HSVToRGB(phase,.92,1) as Phaser.Types.Display.ColorObject;
  return `rgba(${color.r},${color.g},${color.b},0.92)`;
}
