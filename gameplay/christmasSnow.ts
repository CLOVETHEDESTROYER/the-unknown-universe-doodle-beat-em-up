import Phaser from 'phaser';

/** Bounded decoration, independent of collision and reduced-motion safe. */
export class ChristmasSnow {
  private art:Phaser.GameObjects.Graphics;
  private elapsed=0;
  private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(scene:Phaser.Scene){this.art=scene.add.graphics().setScrollFactor(0).setDepth(10);}
  update(delta:number,width:number){
    if(!this.reduced)this.elapsed+=Math.max(0,delta)/1000;
    this.art.clear().fillStyle(0xe5faff,.65);
    const count=this.reduced?8:36;
    for(let i=0;i<count;i++){
      const x=((i*.618%1)*width+Math.sin(this.elapsed*.3+i)*14+width)%width;
      const y=(i*97+this.elapsed*(16+i%5*4))%600;
      this.art.fillCircle(x,y,1+i%3*.6);
    }
  }
  destroy(){this.art.destroy();}
}
