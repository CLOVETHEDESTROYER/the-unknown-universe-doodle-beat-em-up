import Phaser from 'phaser';

export const KILINA_HEALTH=72;
export const KILINA_NEW_MOVES={
  frost_hex:{tell:1100,attack:1750,recovery:2600,hint:'FREEZING HEX - JUMP OR DUCK!'},
  ice_storm:{tell:1200,attack:2300,recovery:2800,hint:'ICE STORM - LEAVE THE BLUE LANES!'},
  witch_dash:{tell:950,attack:1700,recovery:2600,hint:'SHADOW DASH - LEAVE THE LINE!'},
};
export type KilinaNewMove=keyof typeof KILINA_NEW_MOVES;
export const isKilinaNewMove=(move:string):move is KilinaNewMove=>Object.hasOwn(KILINA_NEW_MOVES,move);
export const KILINA_PHASE_ONE=['frost_hex','witch_step','rune_bloom','ice_storm','witch_hex','witch_dash'];
export const KILINA_PHASE_TWO=['witch_dash','frost_hex','ice_storm','rune_bloom','witch_hex','witch_step'];
export function kilinaBattlePose(move:string,state:string,elapsed:number){
  if(state==='recover')return 10;
  if(state==='phase')return 11;
  const tell=state==='tell';
  if(move==='frost_hex')return tell?0:1;
  if(move==='ice_storm')return tell?2:3;
  if(move==='witch_dash')return tell?4:elapsed<430?5:6;
  if(move==='rune_bloom')return tell?7:8;
  if(move==='witch_step')return tell?4:elapsed<700?2:6;
  return tell?7:9;
}

/** Simulation-time status, with edge-triggered escape taps and thaw protection. */
export class PlayerFreeze {
  remaining=0;
  grace=0;
  hits=0;
  breaks=0;
  private elapsed=0;
  private held=false;
  private tapCooldown=0;
  private ice:Phaser.GameObjects.Image;
  private label:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene,private player:Phaser.Physics.Arcade.Sprite){
    this.ice=scene.add.image(0,0,'kilina_ice_prison').setDepth(37).setAlpha(.85).setVisible(false);
    this.label=scene.add.text(0,0,'FROZEN · TAP JUMP / FIRE',{fontFamily:'Gochi Hand, sans-serif',fontSize:'19px',color:'#e3fcff',stroke:'#14304d',strokeThickness:5}).setOrigin(.5,1).setDepth(81).setVisible(false);
  }
  get active(){return this.remaining>0;}
  get protected(){return this.active||this.grace>0;}
  start(){
    if(this.protected)return false;
    this.remaining=900;this.elapsed=0;this.held=false;this.tapCooldown=0;this.hits++;return true;
  }
  update(delta:number,held:boolean,tapped=false){
    const dt=Math.min(50,Math.max(0,delta));
    this.grace=Math.max(0,this.grace-dt);
    if(this.active){
      this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);this.tapCooldown=Math.max(0,this.tapCooldown-dt);
      if((tapped||held&&!this.held)&&this.elapsed>=100&&this.tapCooldown<=0){
        this.remaining=Math.max(0,200-this.elapsed,this.remaining-160);this.tapCooldown=80;this.breaks++;
      }
      if(!this.active)this.thaw();
    }
    this.held=held;
    this.present();
  }
  thaw(){this.remaining=0;this.grace=650;this.present();}
  clear(){this.remaining=this.grace=0;this.held=false;this.present();}
  present(){
    const body=this.player.body as Phaser.Physics.Arcade.Body;
    this.ice.setVisible(this.active);this.label.setVisible(this.active);
    if(!this.active||!body)return;
    this.ice.setPosition(body.center.x,body.center.y).setDisplaySize(Math.max(75,body.width+48),body.height+45);
    this.label.setPosition(body.center.x,body.top-22);
  }
  read(){return {active:this.active,remainingMs:Math.ceil(this.remaining),thawGraceMs:Math.ceil(this.grace),hits:this.hits,escapeTaps:this.breaks};}
  destroy(){this.ice.destroy();this.label.destroy();}
}
