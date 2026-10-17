import Phaser from 'phaser';

export const EMBER_DASH = { speed: 700, duration: 600, damage: 3, frameMs: 70 } as const;

/** Drawn boot thrust follows the ordinary collider; it adds no collision area. */
export class EmberJets {
  private jets: Phaser.GameObjects.Sprite;
  private actor: Phaser.GameObjects.Sprite | null;
  private hidden = false;
  constructor(scene: Phaser.Scene, private player: Phaser.Physics.Arcade.Sprite, drawnXGod: boolean) {
    this.jets=scene.add.sprite(0,0,'ember_jets','0').setDepth(19).setVisible(false);
    this.actor=drawnXGod?scene.add.sprite(0,0,'ember_xgod_dash','0').setOrigin(.5,220/256).setScale(.78).setDepth(24).setVisible(false):null;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.jets.destroy();this.actor?.destroy();});
  }
  present(active: boolean, elapsed: number, direction: number, obscured: boolean, hidePlayer: boolean) {
    const frame=Math.floor(Math.max(0,elapsed)/EMBER_DASH.frameMs)%4;
    const visible=active&&!obscured&&this.player.active;
    this.jets.setVisible(visible);this.actor?.setVisible(visible);
    if(visible){
      const body=this.player.body as Phaser.Physics.Arcade.Body;
      this.jets.setFrame(String(frame)).setOrigin(direction>0?1:0,.5).setFlipX(direction<0)
        .setDisplaySize(260,52).setPosition(this.player.x-direction*10,body.bottom-14);
      if(this.actor){
        this.actor.setFrame(String(frame)).setPosition(this.player.x,body.bottom).setFlipX(direction<0);
        this.player.setVisible(false);this.hidden=true;
      }
    }else if(this.hidden){
      if(!hidePlayer&&this.player.active)this.player.setVisible(true);
      this.hidden=false;
    }
  }
  hide() {
    this.jets.setVisible(false);this.actor?.setVisible(false);
    if(this.hidden&&this.player.active)this.player.setVisible(true);
    this.hidden=false;
  }
  read(){return {visible:this.jets.visible,texture:this.jets.visible?this.jets.texture.key:null,
    frame:this.jets.visible?Number(this.jets.frame.name):null,width:this.jets.displayWidth,
    facing:this.jets.flipX?'left':'right',actorTexture:this.actor?.visible?this.actor.texture.key:null};}
}
