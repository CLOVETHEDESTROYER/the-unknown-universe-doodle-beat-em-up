import Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';
import type { EncounterEnemy, EncounterId, RouteEncounterPlan } from './routeEncounters';

interface EncounterHost {
  player:Phaser.Physics.Arcade.Sprite;
  spawn:(plan:EncounterEnemy)=>Phaser.Physics.Arcade.Sprite;
  rescued:()=>boolean;
  releaseDoghost:()=>void;
  complete:(id:EncounterId)=>void;
  collapse:(elapsed:number)=>void;
  onFerry:()=>boolean;
}
type Stage='waiting'|'warning'|'active'|'between_waves'|'orb_ready'|'complete';
/** Uses simulation delta so pauses, hit-stop and checkpoint retries remain deterministic. */
export class RouteEncounterRuntime {
  private stage:Stage;
  private elapsed=0;
  private wave=-1;
  private grace=0;
  private riddenMs=0;
  private noticeMs=0;
  private attempts=0;
  private enemies:Phaser.Physics.Arcade.Sprite[]=[];
  private hud:Phaser.GameObjects.Text;
  private marker:Phaser.GameObjects.Text;
  private cage:Phaser.GameObjects.Graphics|null=null;
  private captive:Phaser.GameObjects.Image|null=null;
  private released=false;
  private gateBody:Phaser.Physics.Arcade.StaticBody|null=null;
  private gateWall:Phaser.GameObjects.Rectangle|null=null;
  private gateArt:Phaser.GameObjects.Graphics|null=null;
  private gateCollider:Phaser.Physics.Arcade.Collider|null=null;
  constructor(private scene:Phaser.Scene,readonly plan:RouteEncounterPlan,private host:EncounterHost,completed:boolean,width:number,pixelScale=1){
    this.stage=completed||plan.kind==='rescue'&&host.rescued()?'complete':'waiting';
    this.hud=scene.add.text(width/2,145,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'21px',color:'#fff3ce',align:'center',stroke:'#151224',strokeThickness:3,
      backgroundColor:'#141325ed',padding:{x:12,y:8},wordWrap:{width:Math.min(640,width-70)}}).setOrigin(.5,0).setScrollFactor(0).setDepth(95).setVisible(false);
    this.marker=scene.add.text(plan.marker.x,plan.marker.y-120,plan.title,{fontFamily:'Gochi Hand, sans-serif',fontSize:'24px',color:'#ffe7a2',stroke:'#21192f',strokeThickness:5}).setOrigin(.5).setDepth(8);
    if(plan.kind==='rescue'&&this.stage!=='complete'){
      this.captive=scene.add.image(plan.marker.x,plan.marker.y,'doghost_pickup').setDisplaySize(60,60).setDepth(8);
      this.cage=scene.add.graphics().setDepth(10);this.drawCage();
    }
    if(plan.gate&&this.stage!=='complete'){
      const {x,floor}=plan.gate;
      const top=-520;
      this.gateWall=scene.add.rectangle(x,(floor+top)/2,44,floor-top).setVisible(false);
      scene.physics.add.existing(this.gateWall,true);
      this.gateBody=this.gateWall.body as Phaser.Physics.Arcade.StaticBody;
      this.gateCollider=scene.physics.add.collider(host.player,this.gateWall);
      this.gateArt=scene.add.graphics().setDepth(12);
      this.gateArt.fillStyle(0x272337,.85).fillRect(x-22,0,44,floor)
        .lineStyle(3,0xfed26c,.95).strokeRect(x-22,-4,44,floor+4);
      for(let y=10;y<floor;y+=34)this.gateArt.lineBetween(x-16,y+18,x+16,y);
    }
    this.resize(width,pixelScale);
    if(this.stage==='complete')this.showCompletionMarker();
  }
  resize(width:number,pixelScale=1){
    const scale=Math.max(.2,pixelScale);
    this.hud.setX(width/2).setFontSize(Math.max(21,Math.round(12/scale)))
      .setWordWrapWidth(Math.min(width-70,Math.max(640,Math.round(300/scale))));
  }
  private drawCage(){
    const {x,y}=this.plan.marker;
    this.cage?.clear().lineStyle(4,0xe8cca0,1).strokeRoundedRect(x-48,y-50,96,100,12);
    for(const offset of [-24,0,24])this.cage?.lineBetween(x+offset,y-46,x+offset,y+46);
  }
  private enemiesLeft(){return this.enemies.filter(enemy=>enemy.active&&Number(enemy.getData('hp'))>0).length;}
  private showCompletionMarker(){
    const label=this.plan.kind==='rescue'?'DOGHOST IS FREE':this.plan.kind==='gate'?'GATE OPEN':'CROSSING SECURED';
    this.marker.setText(label).setColor('#b6f5c2');
  }
  private removeGate(){
    this.gateCollider?.destroy();this.gateCollider=null;
    this.gateWall?.destroy();this.gateWall=null;this.gateBody=null;
    this.gateArt?.destroy();this.gateArt=null;
  }
  barrier(){
    const body=this.gateBody;
    return body?{x:body.x,y:body.y,w:body.width,h:body.height}:null;
  }
  private patrolGate(){
    const enemy=this.enemies[0];
    if(!enemy?.active)return;
    // Wait at melee height, rise, wait high, and descend with eased reversals.
    const phase=this.elapsed%3200;
    const rise=phase<1050?0:phase<1800?(phase-1050)/750:phase<2300?1:1-(phase-2300)/900;
    const lift=(1-Math.cos(Math.PI*rise))/2;
    const {x,y}=this.plan.waves[0][0];
    const body=enemy.body as Phaser.Physics.Arcade.Body;
    body.reset(x,y-185*lift);
    body.updateFromGameObject();
    const wobble = Math.max(0,Number(enemy.getData('wobbleUntil') ?? 0) - this.scene.time.now) / 300;
    enemy.setAngle(wobble > 0 ? Math.sin((1-wobble)*Math.PI*5)*wobble*20 : Math.sin(this.elapsed/140)*3);
  }
  private spawnWave(){
    this.wave++;
    this.enemies=this.plan.waves[this.wave].map(plan=>{
      const enemy=this.host.spawn(plan);enemy.setData('routeEncounter',this.plan.id);
      // Every arrival receives a readable attack-free window.
      enemy.setData('nextAttackAt',this.scene.time.now+1400);return enemy;
    });
    this.stage='active';playSfx('enemyHit',{volume:.25,pitch:.7});
  }
  private finish(){
    if(this.stage==='complete')return;
    this.stage='complete';this.noticeMs=3800;
    this.cage?.destroy();this.cage=null;this.captive?.destroy();this.captive=null;
    this.removeGate();this.showCompletionMarker();
    this.host.complete(this.plan.id);playSfx('powerup');
  }
  update(delta:number){
    const x=this.host.player.x,near=x>=this.plan.entry-250&&x<=this.plan.exit+400;
    if(this.stage==='complete'){
      this.noticeMs=Math.max(0,this.noticeMs-delta);this.marker.setVisible(this.noticeMs===0);this.hud.setVisible(this.noticeMs>0&&near).setText(this.plan.payoff);return;
    }
    if(this.stage==='waiting'&&x>=this.plan.entry&&x<=this.plan.exit+80){
      this.stage='warning';this.grace=this.plan.kind==='gate'?480:2200;this.attempts++;playSfx('shield',{volume:.3});
    }
    if(this.stage==='warning'){
      this.grace-=delta;
      if(this.grace<=0)this.spawnWave();
    }else if(this.stage==='active'){
      this.elapsed+=delta;
      if(this.plan.kind==='gate'){
        if(this.enemiesLeft())this.patrolGate();
        else this.finish();
      }else if(this.plan.kind==='escape'){
        this.host.collapse(this.elapsed);
        if(x>=this.plan.exit)this.finish();
      }else if(!this.enemiesLeft()){
        if(this.wave+1<this.plan.waves.length){this.stage='between_waves';this.grace=1300;}
        else if(this.plan.kind==='rescue'){
          this.stage='orb_ready';this.cage?.destroy();this.cage=null;this.captive?.destroy();this.captive=null;
          this.host.releaseDoghost();this.released=true;playSfx('shield');
        }else if(this.riddenMs>=250&&x>=this.plan.exit)this.finish();
      }
    }else if(this.stage==='between_waves'){
      this.grace-=delta;if(this.grace<=0)this.spawnWave();
    }else if(this.stage==='orb_ready'&&this.host.rescued())this.finish();
    if(this.plan.kind==='ferry'&&this.stage!=='waiting'&&this.host.onFerry())this.riddenMs+=delta;
    let objective=this.plan.objective;
    if(this.stage==='warning')objective=this.plan.intro+'\n'+objective;
    if(this.stage==='active'&&(this.plan.kind==='ferry'||this.plan.kind==='rescue'))objective+=`\nWave ${this.wave+1}/${this.plan.waves.length} · ${this.enemiesLeft()} remaining${this.plan.kind==='ferry'?' · '+(this.riddenMs>=250?'Ferry ridden':'Ride the moving platform'):''}`;
    if(this.stage==='between_waves')objective='Another guard is approaching. Get ready!';
    if(this.stage==='orb_ready')objective='The cage is open. Jump up and touch Doghost’s orb!';
    if(this.noticeMs>0)objective=this.plan.payoff;
    this.marker.setVisible(this.stage==='waiting');
    this.hud.setVisible(near&&this.stage!=='waiting').setText(this.plan.title+'\n'+objective);
  }
  reset(){
    if(this.stage==='complete')return;
    this.enemies.forEach(enemy=>{if(enemy.active)enemy.destroy();});this.enemies=[];
    this.stage='waiting';this.elapsed=0;this.wave=-1;this.grace=0;this.riddenMs=0;this.hud.setVisible(false);
    if(this.plan.kind==='rescue'&&this.released){
      // The orb remains collectible, so a retry never needs to duplicate it.
      this.stage='orb_ready';
    }
  }
  read(){return {id:this.plan.id,title:this.plan.title,kind:this.plan.kind,stage:this.stage,wave:this.wave+1,totalWaves:this.plan.waves.length,enemiesLeft:this.enemiesLeft(),elapsedMs:Math.round(this.elapsed),warningMs:Math.max(0,Math.round(this.grace)),riddenMs:Math.round(this.riddenMs),attempts:this.attempts,entry:this.plan.entry,exit:this.plan.exit,marker:this.plan.marker,objectiveVisible:this.hud.visible,gateClosed:Boolean(this.gateBody)};}
  destroy(){this.enemies.forEach(enemy=>{if(enemy.active)enemy.destroy();});this.hud.destroy();this.marker.destroy();this.cage?.destroy();this.captive?.destroy();this.removeGate();}
}
