import Phaser from 'phaser';

export const FLAME_SWORD = { damage: 4, finisherDamage: 6, waveDamage: 3, speed: 620, range: 560, pierce: 2 } as const;

/** Physics owns travel/collisions. Each swing owns its own target set. */
export class FireBlades {
  fired = 0;
  hits = 0;
  constructor(private scene: Phaser.Scene, private group: Phaser.Physics.Arcade.Group) {
    scene.anims.create({key:'fire_blade_fly', frames:scene.anims.generateFrameNumbers('fire_blade',{start:0,end:3}), frameRate:14, repeat:-1});
  }
  launch(x: number, y: number, direction: number, excluded: Set<Phaser.Physics.Arcade.Sprite>) {
    if(this.group.getChildren().filter(p=>p.active&&p.getData('fireBlade')).length>=3)return;
    const blade=this.group.create(x,y,'fire_blade',0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    blade.setDepth(24).setDisplaySize(70,116).setFlipX(direction<0).play('fire_blade_fly');
    blade.body.setAllowGravity(false).setSize(58,164,true);
    blade.setVelocityX(direction*FLAME_SWORD.speed);
    blade.setData({fireBlade:true,damage:FLAME_SWORD.waveDamage,fireBladeStart:x,
      fireBladeTargets:new Set(excluded),fireBladeHits:0,fireBladeAge:0});
    this.fired++;
  }
  hit(blade: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite,
      damage: (enemy: Phaser.Physics.Arcade.Sprite, amount: number) => boolean) {
    if(!blade.active||!enemy.active)return;
    const targets=blade.getData('fireBladeTargets') as Set<Phaser.Physics.Arcade.Sprite>;
    if(targets.has(enemy))return;
    targets.add(enemy);
    const boss=enemy.getData('kind')==='boss';
    if(damage(enemy,FLAME_SWORD.waveDamage))this.hits++;
    const hits=Number(blade.getData('fireBladeHits'))+1;
    blade.setData('fireBladeHits',hits);
    // Boss armor absorbs the wave; an opening still uses the normal damage gate.
    if(boss||hits>=FLAME_SWORD.pierce)blade.destroy();
  }
  update(delta: number) {
    if(this.scene.physics.world.isPaused)return;
    this.group.getChildren().forEach(child=>{
      const blade=child as Phaser.Physics.Arcade.Sprite;
      if(!blade.active||!blade.getData('fireBlade'))return;
      const age=Number(blade.getData('fireBladeAge'))+delta;
      blade.setData('fireBladeAge',age);
      if(Math.abs(blade.x-Number(blade.getData('fireBladeStart')))>=FLAME_SWORD.range||age>=FLAME_SWORD.range/FLAME_SWORD.speed*1000)blade.destroy();
    });
  }
  clear(){this.group.getChildren().slice().forEach(p=>{if(p.getData('fireBlade'))p.destroy();});}
  read(){return {fired:this.fired,hits:this.hits,damage:FLAME_SWORD.waveDamage,range:FLAME_SWORD.range};}
}
