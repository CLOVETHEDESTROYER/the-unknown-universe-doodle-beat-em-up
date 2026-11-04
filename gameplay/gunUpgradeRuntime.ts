import Phaser from 'phaser';
import {GUN_UPGRADES} from './gunUpgrades';
import type {GunUpgradeId} from './gunUpgrades';
export function makeGunUpgradeTextures(scene:Phaser.Scene){
  for(const mode of Object.keys(GUN_UPGRADES) as GunUpgradeId[]){
    const key='gun_upgrade_'+mode;if(scene.textures.exists(key))continue;
    const g=scene.make.graphics({x:0,y:0}),color=GUN_UPGRADES[mode].color;
    g.fillStyle(0x21182d,1).fillRoundedRect(8,8,80,80,18).lineStyle(5,color,1).strokeRoundedRect(8,8,80,80,18);
    g.lineStyle(5,0xfff3d9,1);
    if(mode==='rapid')for(let i=0;i<3;i++){
      const y=29+i*19;g.lineBetween(21,y,40,y).fillStyle(color,1).fillRoundedRect(48,y-5,24,10,5);
    }
    if(mode==='fan')for(const a of [-.65,0,.65]){
      const x=24+Math.cos(a)*48,y=48+Math.sin(a)*48;
      g.lineBetween(24,48,x,y).fillStyle(color,1).fillCircle(x,y,6);
    }
    if(mode==='homing')g.strokeCircle(52,44,20).lineBetween(52,15,52,30).lineBetween(52,58,52,75)
      .lineBetween(22,44,38,44).lineBetween(66,44,81,44).fillStyle(color,1).fillTriangle(23,69,40,54,43,72);
    g.generateTexture(key,96,96);g.destroy();
  }
}
export function steerGunSeekers(projectiles:Phaser.Physics.Arcade.Group,enemies:Phaser.Physics.Arcade.Group,delta:number){
  for(const shot of projectiles.getChildren() as Phaser.Physics.Arcade.Sprite[]){
    if(!shot.active||shot.getData('gunUpgrade')!=='homing')continue;
    const body=shot.body as Phaser.Physics.Arcade.Body;
    let target=shot.getData('gunTarget') as Phaser.Physics.Arcade.Sprite|undefined;
    if(!target?.active||Number(target.getData('hp'))<=0){
      const direction=Number(shot.getData('gunDirection'))||1;
      target=(enemies.getChildren() as Phaser.Physics.Arcade.Sprite[])
        .filter(e=>e.active&&Number(e.getData('hp'))>0&&direction*(e.x-shot.x)>0&&Phaser.Math.Distance.Between(shot.x,shot.y,e.x,e.y)<900)
        .sort((a,b)=>Phaser.Math.Distance.Between(shot.x,shot.y,a.x,a.y)-Phaser.Math.Distance.Between(shot.x,shot.y,b.x,b.y))[0];
      shot.setData('gunTarget',target);
    }
    if(!target)continue;
    const b=target.body as Phaser.Physics.Arcade.Body;
    const desired=Math.atan2(b.center.y-shot.y,b.center.x-shot.x),angle=Math.atan2(body.velocity.y,body.velocity.x);
    const turn=Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(desired-angle),-4.5*Math.min(delta,50)/1000,4.5*Math.min(delta,50)/1000);
    const next=angle+turn,speed=GUN_UPGRADES.homing.speed;
    shot.setVelocity(Math.cos(next)*speed,Math.sin(next)*speed).setRotation(next);
  }
}
