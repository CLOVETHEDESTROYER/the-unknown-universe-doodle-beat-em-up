import Phaser from 'phaser';
import {ENEMY_DEATH_MS,defeatPose,foeTexture,foeWalk} from './enemyMotion';
import type {GroundFoe} from './enemyMotion';

interface LocalEnvironment {
  level:number;player:Phaser.Physics.Arcade.Sprite;projectiles:Phaser.Physics.Arcade.Group;
  place:(enemy:Phaser.Physics.Arcade.Sprite,x:number,y:number)=>void;
  clearIntent:(enemy:Phaser.Physics.Arcade.Sprite)=>void;
  showIntent:(enemy:Phaser.Physics.Arcade.Sprite,kind:GroundFoe)=>void;
  firePulse:(enemy:Phaser.Physics.Arcade.Sprite,damage:number,color:number,speed:number,target:{x:number;y:number})=>void;
  damage:(amount:number)=>void;clearLine:(enemy:Phaser.Physics.Arcade.Sprite)=>boolean;
}
export function localEnemyMove(kind:GroundFoe,level:number){
  return kind==='walker'?'claw_lunge':kind==='alien'?'cinder_spit':kind==='giant'?'ground_slam'
    :kind==='dasher'?(level===6?'rift_charge':'shoulder_rush')
    :kind==='spider'?(level===4?'web_pounce':'pounce')
    :kind==='ghost'?(level===4?'hex_dive':'dive'):kind==='terror'?'tongue_lash':'locked_volley';
}

/** A telegraph locks aim; it cannot turn into a tracking attack after the player dodges. */
export function updateLocalEnemy(scene:Phaser.Scene,enemy:Phaser.Physics.Arcade.Sprite,kind:GroundFoe,now:number,env:LocalEnvironment){
  const body=enemy.body as Phaser.Physics.Arcade.Body;
  const state=String(enemy.getData('attackState'));
  const elapsed=now-Number(enemy.getData('stateStartedAt')??now);
  const left=Number(enemy.getData('left')),right=Number(enemy.getData('right'));
  const direction=Number(enemy.getData('attackDirection')??-1);
  const tell=kind==='giant'?800:kind==='alien'?650:kind==='dasher'?600:480;
  const attack=kind==='giant'?550:kind==='alien'?460:kind==='dasher'?580:360;
  const recover=kind==='giant'?1100:kind==='alien'?850:kind==='dasher'?800:650;
  if(state==='tell'){
    enemy.setVelocityX(0).setFlipX(direction>0).anims.stop();
    enemy.setTexture(foeTexture(kind),elapsed<tell/2?'8':'9');
    if(elapsed>=tell){
      env.clearIntent(enemy);enemy.clearTint().setData('attackState','attack').setData('stateStartedAt',now);
      if(kind==='dasher'&&env.level===6){
        const echo=scene.add.sprite(enemy.x,enemy.y,foeTexture(kind),'9').setOrigin(enemy.originX,enemy.originY).setScale(enemy.scaleX).setFlipX(enemy.flipX).setTint(0xb08cff).setAlpha(.5);
        scene.tweens.add({targets:echo,alpha:0,duration:260,onComplete:()=>echo.destroy()});
        const distance=Math.max(0,Math.min(135,Math.abs(Number(enemy.getData('targetX'))-enemy.x)-125));
        env.place(enemy,Phaser.Math.Clamp(enemy.x+direction*distance,left,right),enemy.y);
      }
    }
    return;
  }
  if(state==='attack'){
    enemy.anims.stop();enemy.setTexture(foeTexture(kind),elapsed<attack*.65?'10':'11');
    enemy.setVelocityX(direction*(kind==='dasher'?440:kind==='walker'?220:0));
    if(elapsed>=75&&!enemy.getData('attackFired')){
      enemy.setData('attackFired',true);
      const target={x:Number(enemy.getData('targetX')),y:Number(enemy.getData('targetY'))};
      if(kind==='walker'){
        const strike=new Phaser.Geom.Rectangle(body.center.x+(direction>0?0:-100),body.top+8,100,Math.max(32,body.height-8));
        const playerBody=env.player.body as Phaser.Physics.Arcade.Body;
        if(env.clearLine(enemy)&&Phaser.Geom.Intersects.RectangleToRectangle(strike,new Phaser.Geom.Rectangle(playerBody.x,playerBody.y,playerBody.width,playerBody.height)))env.damage(10);
      }
      if(kind==='alien')for(const dy of [-32,32])env.firePulse(enemy,10,0xff9e42,265,{x:target.x,y:target.y+dy});
      if(kind==='giant'){
        const impact=scene.add.image(enemy.x,body.bottom-12,'enemy_hit_impact').setDisplaySize(190,62).setTint(0xffa35c).setDepth(14);
        scene.tweens.add({targets:impact,alpha:0,duration:270,onComplete:()=>impact.destroy()});
        for(const d of [-1,1]){
          const wave=env.projectiles.create(enemy.x+d*36,body.bottom-18,'boss_ink_orb') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          wave.setDisplaySize(70,22).setTint(0xffa34d).setData('enemyProjectile',true).setData('damage',14).setData('bossShotExpiresAt',now+1500).setData('sourceKind','giant').setData('quakeWave',true).setDepth(14);
          wave.body.setAllowGravity(false);wave.setVelocityX(d*225);
        }
      }
    }
    if(elapsed>=attack){
      if(kind==='dasher'&&env.level===6)env.firePulse(enemy,9,0xc598ff,240,{x:Number(enemy.getData('targetX')),y:Number(enemy.getData('targetY'))});
      enemy.setVelocityX(0).setData('attackState','recover').setData('stateStartedAt',now)
        .setData('attacksCompleted',Number(enemy.getData('attacksCompleted')??0)+1);
    }
    return;
  }
  if(state==='recover'){
    enemy.setVelocityX(0).anims.stop();enemy.setTexture(foeTexture(kind),'11');
    if(elapsed>=recover)enemy.setData('attackState','patrol').setData('nextAttackAt',now+1000);
    return;
  }
  let facing=Number(enemy.getData('direction'));
  enemy.x=Phaser.Math.Clamp(enemy.x,left,right);
  if(enemy.x<=left+1)facing=1;if(enemy.x>=right-1)facing=-1;
  enemy.setData('direction',facing).setFlipX(facing>0).setVelocityX(facing*(kind==='dasher'?145:kind==='giant'?55:kind==='alien'?65:80));
  enemy.anims.play(foeWalk(kind),true);enemy.anims.timeScale=1;
  const target=env.player.body as Phaser.Physics.Arcade.Body;
  if(now>=Number(enemy.getData('nextAttackAt'))&&Math.abs(env.player.x-enemy.x)<(kind==='alien'?540:kind==='giant'?280:kind==='dasher'?390:220)
    &&Math.abs(target.bottom-body.bottom)<125){
    enemy.setVelocityX(0).setData('attackState','tell').setData('stateStartedAt',now).setData('attackDirection',env.player.x<enemy.x?-1:1)
      .setData('targetX',target.center.x).setData('targetY',target.center.y).setData('attackFired',false).setTint(0xffd166);
    enemy.anims.stop();enemy.setTexture(foeTexture(kind),'8');
    env.showIntent(enemy,kind);
  }
}

/** Combat removal is immediate; a separate non-colliding sprite finishes the defeat. */
export function playEnemyDefeat(scene:Phaser.Scene,enemy:Phaser.Physics.Arcade.Sprite,deaths:Set<Phaser.GameObjects.Sprite>){
  const kind=enemy.getData('kind') as GroundFoe;
  const corpse=scene.add.sprite(enemy.x,enemy.y,foeTexture(kind),'12').setOrigin(enemy.originX,enemy.originY)
    .setScale(Number(enemy.getData('baseScale'))).setFlipX(enemy.flipX).setDepth(11).setData('kind',kind);
  deaths.add(corpse);scene.tweens.killTweensOf(enemy);enemy.destroy();
  scene.tweens.addCounter({from:0,to:ENEMY_DEATH_MS,duration:ENEMY_DEATH_MS,onUpdate:tween=>{
    if(!corpse.active)return;const pose=defeatPose(tween.getValue()??0);corpse.setFrame(pose.frame).setAlpha(pose.alpha);
  },onComplete:()=>{deaths.delete(corpse);corpse.destroy();}});
}
