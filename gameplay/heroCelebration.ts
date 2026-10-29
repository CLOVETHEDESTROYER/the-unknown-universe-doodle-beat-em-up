import Phaser from 'phaser';
import type {CharacterId} from '../types';
import {ELYTRON_ART} from './elytron';

export type CelebrationKind = 'victory' | 'sword';
export const HERO_VICTORY_DURATION = 1400;
export const SWORD_REWARD_DURATION = 2400;
export const FLIGHT_VICTORY_START = 700;
const VICTORY_STEPS = [0, 180, 400, 1000];
const SWORD_STEPS = [0, 280, 640, 1020, 1620, 2020];
const FOLDER = '/characters/celebrations-v1/';

export function loadHeroCelebrationAssets(load:Phaser.Loader.LoaderPlugin,hero:CharacterId,sword=false,reuseKai=false){
  if(hero==='elytron'){
    load.multiatlas('hero_victory',ELYTRON_ART.folder+'reactions.json',ELYTRON_ART.folder);return;
  }
  if(hero==='killer_kai'){
    if(!reuseKai)load.multiatlas('kai_reactions','/characters/killer-kai-v1/reactions.json','/characters/killer-kai-v1/');
  }else load.multiatlas('hero_victory',FOLDER+hero+'.json',FOLDER);
  if(hero==='xgod'&&sword)load.multiatlas('hero_sword_reward',FOLDER+'xgod-sword.json',FOLDER);
}

/** A disposable presentation sprite; it never changes equipment or deals damage. */
export class HeroCelebration {
  private actor:Phaser.GameObjects.Sprite;
  private light:Phaser.GameObjects.Graphics;
  private kind:CelebrationKind|null=null;
  private elapsed=0;
  private frame=0;
  private running=false;
  private cuePlayed=false;
  private x=0;
  private feet=0;
  private facing=1;
  private counts={victory:0,sword:0};
  private finished={victory:0,sword:0};
  constructor(private scene:Phaser.Scene,private hero:CharacterId,private cue?:()=>void){
    this.actor=scene.add.sprite(0,0,'__DEFAULT').setVisible(false).setDepth(42);
    this.light=scene.add.graphics().setDepth(16);
  }
  get active(){return this.running;}
  get duration(){return this.kind==='sword'?SWORD_REWARD_DURATION:HERO_VICTORY_DURATION;}
  start(kind:CelebrationKind,x:number,feet:number,facing=1){
    if(this.running||kind==='sword'&&this.hero!=='xgod')return false;
    const key=kind==='sword'?'hero_sword_reward':this.hero==='killer_kai'?'kai_reactions':'hero_victory';
    if(!this.scene.textures.exists(key))return false;
    this.kind=kind;this.elapsed=0;this.running=true;this.cuePlayed=false;this.counts[kind]++;
    this.actor.setTexture(key).setOrigin(.5,this.hero==='killer_kai'&&kind==='victory'?240/256:352/384)
      .setScale(this.hero==='killer_kai'&&kind==='victory'?.782:1).setAlpha(1);
    if(this.hero==='elytron')this.actor.setOrigin(.5,ELYTRON_ART.baseline/ELYTRON_ART.height).setScale(ELYTRON_ART.scale);
    this.seek(0,x,feet,facing);return true;
  }
  update(delta:number,x:number,feet:number,facing=1){
    if(this.running)this.seek(this.elapsed+Math.max(0,delta),x,feet,facing);
  }
  seek(elapsed:number,x:number,feet:number,facing=1){
    if(!this.running)return;
    this.elapsed=Math.max(0,elapsed);this.x=x;this.feet=feet;this.facing=facing;
    if(this.elapsed>=this.duration){
      this.finished[this.kind!]++;this.running=false;this.actor.setVisible(false);this.light.clear();return;
    }
    const steps=this.kind==='sword'?SWORD_STEPS:VICTORY_STEPS;
    this.frame=steps.reduce((frame,t,index)=>this.elapsed>=t?index:frame,0);
    this.actor.setFrame(String(this.frame+(this.hero==='elytron'?12:this.hero==='killer_kai'&&this.kind==='victory'?8:0)))
      .setPosition(x,feet).setFlipX(facing<0).setVisible(true);
    this.light.clear();
    if(this.kind==='sword'){
      const ignite=Phaser.Math.Clamp((this.elapsed-600)/420,0,1);
      const fade=Phaser.Math.Clamp((SWORD_REWARD_DURATION-this.elapsed)/350,0,1);
      this.light.fillStyle(0xffbd4a,.13*ignite*fade).fillCircle(x,feet-95,78+Math.sin(this.elapsed/90)*5)
        .lineStyle(2,0xffda85,.6*ignite*fade).strokeEllipse(x,feet-2,100+ignite*20,16);
      if(this.frame>=2&&!this.cuePlayed){this.cuePlayed=true;this.cue?.();}
    }else if(this.hero==='teleportation_c')this.actor.setAlpha(this.frame===2?.86+Math.sin(this.elapsed/60)*.14:1);
  }
  cancel(){this.running=false;this.actor.setVisible(false);this.light.clear();}
  read(){return {active:this.running,kind:this.kind,elapsedMs:Math.round(this.elapsed),durationMs:this.duration,
    frame:this.frame,stage:this.kind==='sword'?['reach','claim','ignite','raise','settle','ready'][this.frame]:['ready','windup','cheer','settle'][this.frame],
    texture:this.actor.texture.key,visible:this.actor.visible,feet:Math.round(this.feet),x:Math.round(this.x),facing:this.facing,
    played:{...this.counts},completed:{...this.finished}};}
  destroy(){this.actor.destroy();this.light.destroy();}
}
