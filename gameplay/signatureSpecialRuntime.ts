import Phaser from 'phaser';
import type { CharacterId } from '../types';
import { SIGNATURE_SPECIALS, beginSignature, createSignatureState, signatureFrame } from './signatureSpecials';
import { playSfx } from '../audio/gameAudio';

type Enemy=Phaser.Physics.Arcade.Sprite;
interface Hooks {
  player:Enemy;enemies:Phaser.Physics.Arcade.Group;projectiles:Phaser.Physics.Arcade.Group;
  facing:()=>number;grounded:()=>boolean;canUse:()=>boolean;
  clearLine:(enemy:Enemy)=>boolean;damage:(enemy:Enemy,amount:number)=>boolean;
  lockMovement:(until:number)=>void;launch:(vx:number,vy:number)=>void;
  landing:(enemy:Enemy|null,behind:boolean)=>{x:number;y:number;facing:number}|null;
  relocate:(to:{x:number;y:number;facing:number})=>void;
  floor:(x:number)=>number|null;
}

/** Owns on-foot signature attacks; weapons and their durability remain independent. */
export class SignatureSpecialRuntime {
  readonly state=createSignatureState();
  private actor:Phaser.GameObjects.Sprite;
  private hud:Phaser.GameObjects.Text;
  private art:Phaser.GameObjects.Graphics;
  private pillar:Phaser.GameObjects.Image|null=null;
  private zone:{x:number;y:number;until:number;nextTick:number}|null=null;
  private visited=new Set<Enemy>();
  private lastHopAt=0;
  private chainDone=false;
  private hiddenPlayer=false;
  private effect:{kind:'x'|'quake'|'rocket'|'rift'|'star';x:number;y:number;at:number}|null=null;
  private castDirection=1;
  private alive=true;

  constructor(private scene:Phaser.Scene,readonly hero:CharacterId,private hooks:Hooks){
    this.actor=scene.add.sprite(0,0,'signature_special','0').setOrigin(.5,220/256)
      .setScale(.88).setDepth(24).setVisible(false);
    this.art=scene.add.graphics().setDepth(23);
    if(hero==='ezra')this.pillar=scene.add.image(0,0,'signature_pillar','0').setOrigin(.5,248/256).setDepth(23).setVisible(false);
    this.hud=scene.add.text(24,108,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'22px',
      color:'#fff3d2',stroke:'#19182e',strokeThickness:4}).setScrollFactor(0).setDepth(82);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
  }
  get casting(){return this.scene.time.now<this.state.until;}
  get invulnerable(){return this.scene.time.now<this.state.invulnerableUntil;}

  trigger(){
    const now=this.scene.time.now;
    if(!this.hooks.canUse()||(this.hero==='barrett'&&!this.hooks.grounded()))return false;
    // A failed destination search never consumes the player's cooldown.
    if((this.hero==='teleportation_c'||this.hero==='zgod')&&!this.findTarget()
      &&this.hero==='teleportation_c'&&!this.hooks.landing(null,true)){
      this.state.blocked++;return false;
    }
    if(!beginSignature(this.state,this.hero,now))return false;
    this.visited.clear();this.chainDone=false;this.lastHopAt=now;this.castDirection=this.hooks.facing();
    this.hooks.lockMovement(now+SIGNATURE_SPECIALS[this.hero].windup);
    this.hooks.player.setVelocityX(0);
    if(this.hero==='teleportation_c')this.state.invulnerableUntil=now+650;
    if(this.hero==='zgod')this.state.invulnerableUntil=this.state.until;
    playSfx(this.hero==='teleportation_c'||this.hero==='zgod'?'teleport':'powerup', {pitch:this.hero==='barrett'?.75:1.1});
    return true;
  }

  update(){
    if(!this.alive)return;
    const now=this.scene.time.now;
    if(this.casting&&!this.state.impacted&&now>=this.state.startedAt+SIGNATURE_SPECIALS[this.hero].windup){
      this.state.impacted=true;this.impact();
    }
    if(this.hero==='zgod'&&!this.chainDone&&this.casting&&this.state.impacted&&this.state.hops<3&&now-this.lastHopAt>=190)this.cometHop();
    if(this.zone){
      if(now>=this.zone.until)this.zone=null;
      else if(now>=this.zone.nextTick){
        this.zone.nextTick=now+420;
        this.hitArea(new Phaser.Geom.Rectangle(this.zone.x-55,this.zone.y-225,110,230),1.5);
      }
    }
    const readyIn=Math.max(0,this.state.readyAt-now);
    this.hud.setText(`X / SP: ${SIGNATURE_SPECIALS[this.hero].name.toUpperCase()} · ${readyIn?`${(readyIn/1000).toFixed(1)}s`:'READY'}`)
      .setColor(readyIn?'#d5c5df':'#fff1a3');
    this.drawEffects(now);
  }

  present(){
    const player=this.hooks.player;
    if(!this.alive||!player.active)return;
    if(this.casting&&this.hooks.canUse()){
      const body=player.body as Phaser.Physics.Arcade.Body;
      const elapsed=this.scene.time.now-this.state.startedAt;
      this.actor.setVisible(true).setPosition(player.x,body.bottom).setFlipX(this.hooks.facing()<0)
        .setFrame(String(signatureFrame(this.hero,elapsed)));
      player.setVisible(false);this.hiddenPlayer=true;
    }else{
      this.actor.setVisible(false);
      if(this.hiddenPlayer){player.setVisible(true);this.hiddenPlayer=false;}
    }
  }

  private hitArea(area:Phaser.Geom.Rectangle,damage:number,stun=0){
    for(const child of [...this.hooks.enemies.getChildren()]){
      const enemy=child as Enemy;
      if(!enemy.active||!this.hooks.clearLine(enemy))continue;
      const body=enemy.body as Phaser.Physics.Arcade.Body;
      if(!Phaser.Geom.Intersects.RectangleToRectangle(area,new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height)))continue;
      if(this.hooks.damage(enemy,damage)){
        this.state.hits++;
        if(stun&&enemy.active){
          const boss=enemy.getData('kind')==='boss';
          enemy.setData('specialStunUntil',this.scene.time.now+(boss?120:stun));
          enemy.setVelocityX(0);
          if(!boss&&body.allowGravity)enemy.setVelocityY(-360);
        }
      }
    }
  }

  private impact(){
    const player=this.hooks.player,body=player.body as Phaser.Physics.Arcade.Body;
    const now=this.scene.time.now,x=body.center.x,y=body.bottom,d=this.castDirection;
    if(this.hero==='xgod'){
      const area=new Phaser.Geom.Rectangle(d>0?x-15:x-405,y-235,420,245);
      this.hitArea(area,5);
      for(const child of [...this.hooks.projectiles.getChildren()]){
        const shot=child as Enemy;
        if(shot.active&&shot.getData('enemyProjectile')&&Phaser.Geom.Rectangle.Contains(area,shot.x,shot.y)){
          shot.destroy();this.state.clearedShots++;
        }
      }
      this.effect={kind:'x',x:x+d*175,y:y-115,at:now};playSfx('swordSwing');
    }else if(this.hero==='barrett'){
      this.hitArea(new Phaser.Geom.Rectangle(x-245,y-140,490,155),4,1100);
      this.effect={kind:'quake',x,y,at:now};this.scene.cameras.main.shake(150,.004);playSfx('stomp');
    }else if(this.hero==='nico'){
      this.hitArea(new Phaser.Geom.Rectangle(x-130,y-70,260,180),4);
      this.hooks.lockMovement(now+300);this.hooks.launch(d*340,-790);
      this.state.invulnerableUntil=now+280;this.effect={kind:'rocket',x,y,at:now};playSfx('explosion');
    }else if(this.hero==='ezra'){
      let targetX=x,feet=y;
      for(let range=150;range>=40;range-=20){
        const next=x+d*range,floor=this.hooks.floor(next);
        if(floor!==null&&Math.abs(floor-y)<=100){targetX=next;feet=floor;break;}
      }
      this.zone={x:targetX,y:feet,until:now+2600,nextTick:now};
      playSfx('ember');
    }else if(this.hero==='teleportation_c'){
      const target=this.findTarget(),to=this.hooks.landing(target,true);
      if(!to){this.state.blocked++;return;}
      this.effect={kind:'rift',x:player.x,y,at:now};this.hooks.relocate(to);
      const after=player.body as Phaser.Physics.Arcade.Body;
      this.hitArea(new Phaser.Geom.Rectangle(after.center.x-140,after.bottom-180,280,190),6);
      playSfx('teleport');
    }else this.cometHop();
  }

  private findTarget(){
    const p=this.hooks.player,b=p.body as Phaser.Physics.Arcade.Body;
    return (this.hooks.enemies.getChildren() as Enemy[]).filter(e=>e.active&&Number(e.getData('hp'))>0
      &&!this.visited.has(e)&&Math.abs(e.x-p.x)<=520
      &&Math.abs((e.body as Phaser.Physics.Arcade.Body).bottom-b.bottom)<180
      &&this.hooks.clearLine(e)&&this.hooks.landing(e,this.hero==='teleportation_c'))
      .sort((a,c)=>Math.abs(a.x-p.x)-Math.abs(c.x-p.x))[0]??null;
  }

  private cometHop(){
    const now=this.scene.time.now,target=this.findTarget();
    this.lastHopAt=now;
    if(!target){
      // Still provide a visible cast, without an unsafe blind dash over a gap.
      this.chainDone=true;this.effect={kind:'star',x:this.hooks.player.x,y:this.hooks.player.y-65,at:now};return;
    }
    const to=this.hooks.landing(target,false);
    if(!to){this.state.blocked++;this.visited.add(target);return;}
    this.visited.add(target);
    const oldX=this.hooks.player.x,oldY=this.hooks.player.y;
    this.hooks.relocate(to);this.state.hops++;
    if(this.hooks.damage(target,7))this.state.hits++;
    this.effect={kind:'star',x:(oldX+to.x)/2,y:(oldY+to.y)/2-60,at:now};playSfx('teleport',{pitch:1.3});
  }

  private drawEffects(now:number){
    this.art.clear();
    this.pillar?.setVisible(Boolean(this.zone));
    if(this.zone){
      const {x,y,until}=this.zone,fade=Math.min(1,(until-now)/250);
      this.pillar?.setFrame(String(Math.floor(now/100)%4)).setPosition(x,y).setDisplaySize(192+Math.sin(now/65)*8,240+Math.sin(now/90)*10)
        .setAlpha(fade).setFlipX(Math.floor(now/110)%2===0);
      this.art.lineStyle(3,0xffe39c,.85*fade).strokeEllipse(x,y-2,116,20);
    }
    if(!this.effect)return;
    const age=now-this.effect.at;if(age>480){this.effect=null;return;}
    const {x,y,kind}=this.effect,p=age/480,alpha=1-p;
    if(kind==='x'){
      for(const [w,color] of [[26,0xff6331],[13,0xffd260],[4,0xfff4cc]]){
        this.art.lineStyle(w,color,alpha).lineBetween(x-95,y-110,x+95,y+90)
          .lineBetween(x+95,y-110,x-95,y+90);
      }
    }else if(kind==='quake'){
      this.art.lineStyle(8,0xffc66b,alpha).strokeEllipse(x,y-4,80+p*480,18+p*50);
      for(let i=0;i<8;i++)this.art.fillStyle(0x8e6240,alpha).fillRect(x+(i-3.5)*35,y-Math.sin(p*Math.PI)*(i%3+1)*23,9,8);
    }else if(kind==='rocket'){
      this.art.fillStyle(0xffad46,alpha).fillEllipse(x,y-6,130+p*100,60+p*60);
      for(let i=0;i<5;i++)this.art.fillStyle(0xd6d0bc,alpha*.7).fillCircle(x+(i-2)*25,y-20-p*90,12+p*14);
    }else if(kind==='rift'){
      this.art.lineStyle(6,0xc390ff,alpha).strokeEllipse(x,y-70,25+p*90,140);
    }else{
      for(let i=0;i<7;i++){
        const px=x+(i-3)*25,py=y+Math.sin(i*2+now/80)*20,r=8+(i%3)*3;
        this.art.lineStyle(3,i%2?0xffdb77:0xff91dc,alpha).lineBetween(px-r,py,px+r,py).lineBetween(px,py-r,px,py+r);
      }
    }
  }

  read(){const now=this.scene.time.now;return {name:SIGNATURE_SPECIALS[this.hero].name,...this.state,
    active:this.casting,cooldownRemainingMs:Math.max(0,this.state.readyAt-now),
    frame:this.actor.visible?Number(this.actor.frame.name):null,zone:this.zone?{...this.zone}:null};}

  cancel(restore=true){
    this.state.until=0;this.state.invulnerableUntil=0;this.zone=null;this.effect=null;
    this.actor.setVisible(false);this.art.clear();
    this.pillar?.setVisible(false);
    if(restore&&this.hiddenPlayer&&this.hooks.player.active)this.hooks.player.setVisible(true);
    this.hiddenPlayer=false;
  }
  destroy(){if(!this.alive)return;this.cancel(false);this.alive=false;this.actor.destroy();this.art.destroy();this.pillar?.destroy();this.hud.destroy();}
}
