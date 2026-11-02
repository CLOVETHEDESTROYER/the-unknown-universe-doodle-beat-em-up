import Phaser from 'phaser';

export const TURKEY_MOVES = {
  talon_charge: {tell:1100,attack:1900,recovery:2900,hint:'TALONS - JUMP OVER THE CHARGE!'},
  wing_gust: {tell:1100,attack:2100,recovery:2900,hint:'WING GUST - JUMP THE WIND!'},
};

/** Committed strike, then a harmless flight home before the counter window. */
export function turkeyFlight(elapsed:number, phaseTwo:boolean) {
  const rushEnd=phaseTwo?620:720;
  if(elapsed<280)return {leg:'lift',travel:0,lift:45+23*Math.min(1,elapsed/280),frame:2};
  if(elapsed<rushEnd)return {leg:'charge',travel:(elapsed-280)/(rushEnd-280),lift:68,frame:3};
  if(elapsed<1650){
    const t=(elapsed-rushEnd)/(1650-rushEnd);
    return {leg:'retreat',travel:1-t,lift:68+Math.sin(t*Math.PI)*80,frame:4};
  }
  return {leg:'land',travel:0,lift:68*(1-Math.min(1,(elapsed-1650)/250)),frame:5};
}

export function makeTurkeyGustTexture(scene:Phaser.Scene) {
  if(scene.textures.exists('turkey_gust'))return;
  const g=scene.make.graphics({x:0,y:0});
  g.lineStyle(10,0x335b67,.85);
  for(const y of [30,76,123])g.beginPath().moveTo(16,y).lineTo(112,y).arc(112,y+15,15,-Math.PI/2,Math.PI/2).strokePath();
  g.lineStyle(5,0xe2fbff,1);
  for(const y of [30,76,123])g.beginPath().moveTo(16,y).lineTo(112,y).arc(112,y+15,15,-Math.PI/2,Math.PI/2).strokePath();
  g.generateTexture('turkey_gust',160,160);g.destroy();
}

/** Sparse, fixed-size pool: cosmetic only, never a collision object. */
export class AutumnLeaves {
  private leaves: {sprite:Phaser.GameObjects.Image;speed:number;drift:number;spin:number;phase:number}[]=[];
  private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private scene:Phaser.Scene, private width:number) {
    for(let i=0;i<(this.reduced?6:22);i++){
      const sprite=scene.add.image((i*.618%1)*width,(i*.381%1)*600-24,'autumn_leaves',i%12)
        .setDisplaySize(14+i%4*4,14+i%4*4).setAlpha(.65).setScrollFactor(0).setDepth(i%3===0?19:-8);
      this.leaves.push({sprite,speed:22+i%5*7,drift:10+i%4*4,spin:i%2?17:-23,phase:i*1.7});
    }
  }
  update(delta:number) {
    if(this.reduced)return;
    const dt=Math.min(delta,50)/1000;
    for(const leaf of this.leaves){
      leaf.phase+=dt;leaf.sprite.y+=leaf.speed*dt;
      leaf.sprite.x+=(leaf.drift+Math.sin(leaf.phase*1.7)*24)*dt;
      leaf.sprite.angle+=leaf.spin*dt;
      if(leaf.sprite.y>610){leaf.sprite.y=-24;leaf.sprite.x=(leaf.sprite.x+this.width*.37)%this.width;}
      if(leaf.sprite.x>this.width+30)leaf.sprite.x=-20;
    }
  }
  resize(width:number){this.width=width;}
  destroy(){this.leaves.forEach(leaf=>leaf.sprite.destroy());this.leaves=[];}
  get count(){return this.leaves.length;}
}
