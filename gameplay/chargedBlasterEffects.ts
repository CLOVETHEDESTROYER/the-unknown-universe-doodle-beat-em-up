import Phaser from 'phaser';

export const BLASTER_CHARGE_MS = 1400;
export const CHARGED_BOLT_TEXTURE = 'charged_ink_bolt';

export class ChargedBlasterEffects {
  private readonly ink: Phaser.GameObjects.Graphics;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly scene: Phaser.Scene,private readonly color:()=>number=()=>0x74e6ff) {
    this.ink = scene.add.graphics().setDepth(21);
    const art = scene.add.graphics();
    art.fillStyle(0x14334e).fillEllipse(31,20,60,31);
    art.fillStyle(0x1ba8d1).fillEllipse(34,20,53,26);
    art.fillStyle(0x7ceaff).fillEllipse(39,20,39,21);
    art.fillStyle(0xf2ffff).fillEllipse(44,18,26,11);
    art.generateTexture(CHARGED_BOLT_TEXTURE,64,40);
    art.destroy();
  }

  clear() {
    this.ink.clear();
  }

  muzzle(x: number, y: number, chargeMs: number, now: number) {
    if (chargeMs < 350) return;
    const fraction = chargeMs / BLASTER_CHARGE_MS;
    const ready = fraction >= 1;
    const radius = 9 + fraction * 11;
    this.ink.fillStyle(this.color(),ready ? .3 : .14).fillCircle(x,y,radius+5);
    this.ink.lineStyle(ready ? 3 : 2,ready ? 0xd7ffff : this.color(),.92).strokeCircle(x,y,radius);
    this.ink.lineStyle(3,0xf6ffff,1).beginPath().arc(x,y,radius+4,-Math.PI/2,-Math.PI/2+fraction*Math.PI*2).strokePath();
    if (this.reducedMotion.matches) return;
    for (const direction of [-1,1]) {
      const angle = now/110 + direction*Math.PI/2;
      this.ink.fillStyle(0xf2ffff,.95).fillCircle(x+Math.cos(angle)*(radius+8),y+Math.sin(angle)*(radius+8),ready ? 3 : 2);
    }
  }

  trail(x: number, y: number, originX: number, direction: number) {
    const length = Math.min(this.reducedMotion.matches ? 42 : 112,Math.abs(x-originX));
    if (length < 4) return;
    const tip = x - direction * 8;
    const tail = x - direction * length;
    this.ink.fillStyle(this.color(),.25).fillTriangle(tail,y,tip,y-21,tip,y+21);
    this.ink.fillStyle(this.color(),.76).fillTriangle(tail,y,tip,y-11,tip,y+11);
    this.ink.fillStyle(0xf1ffff,.9).fillTriangle(x-direction*length*.64,y,tip,y-4,tip,y+4);
  }

  impact(x: number, y: number, direct: boolean) {
    const burst = this.scene.add.graphics({x,y}).setDepth(26);
    const radius = direct ? 22 : 13;
    burst.fillStyle(this.color(),.27).fillCircle(0,0,radius+8);
    burst.lineStyle(4,0x153d69,.95).strokeCircle(0,0,radius);
    burst.lineStyle(3,0xc8fcff,1).strokeCircle(0,0,radius-3);
    for (let ray=0;ray<8;ray++) {
      const angle = ray*Math.PI/4;
      const end = radius + (ray%2 ? 8 : 15);
      burst.lineBetween(Math.cos(angle)*radius,Math.sin(angle)*radius,Math.cos(angle)*end,Math.sin(angle)*end);
    }
    this.scene.tweens.add({
      targets:burst, alpha:0, scale:this.reducedMotion.matches ? 1 : 1.85,
      duration:direct ? 250 : 140, ease:'quad.out', onComplete:()=>burst.destroy(),
    });
  }
}
