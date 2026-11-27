import Phaser from 'phaser';
import type {DifficultyMode} from '../types';
import {ENEMY_DEATH_MS,defeatPose,foeTexture,foeWalk} from './enemyMotion';
import type {GroundFoe} from './enemyMotion';
import {difficultyCombatTuning} from './metalSlugCombat';

interface LocalEnvironment {
  level:number;difficulty?:DifficultyMode;player:Phaser.Physics.Arcade.Sprite;projectiles:Phaser.Physics.Arcade.Group;
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
  const tuning=difficultyCombatTuning(env.difficulty??'EASY');
  const state=String(enemy.getData('attackState'));
  const elapsed=now-Number(enemy.getData('stateStartedAt')??now);
  const left=Number(enemy.getData('left')),right=Number(enemy.getData('right'));
  const direction=Number(enemy.getData('attackDirection')??-1);
  const tell=Math.round((kind==='giant'?660:kind==='alien'?520:kind==='dasher'?490:390)*tuning.cadenceScale);
  const attack=kind==='giant'?520:kind==='alien'?420:kind==='dasher'?540:340;
  const recover=Math.round((kind==='giant'?740:kind==='alien'?560:kind==='dasher'?540:440)*tuning.cadenceScale);
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
    enemy.setVelocityX(direction*(kind==='dasher'?485:kind==='walker'?275:0));
    if(elapsed>=75&&!enemy.getData('attackFired')){
      enemy.setData('attackFired',true);
      const target={x:Number(enemy.getData('targetX')),y:Number(enemy.getData('targetY'))};
      if(kind==='walker'){
        const strike=new Phaser.Geom.Rectangle(body.center.x+(direction>0?0:-108),body.top+8,108,Math.max(36,body.height-8));
        const playerBody=env.player.body as Phaser.Physics.Arcade.Body;
        if(env.clearLine(enemy)&&Phaser.Geom.Intersects.RectangleToRectangle(strike,new Phaser.Geom.Rectangle(playerBody.x,playerBody.y,playerBody.width,playerBody.height)))env.damage(10);
      }
      if(kind==='alien'){
        const spread=tuning.extraVolley?[-46,0,46]:[-30,30];
        for(const dy of spread)env.firePulse(enemy,10,0xff9e42,Math.round(295*tuning.projectileSpeedScale),{x:target.x,y:target.y+dy});
      }
      if(kind==='giant'){
        const impact=scene.add.image(enemy.x,body.bottom-12,'enemy_hit_impact').setDisplaySize(210,68).setTint(0xffa35c).setDepth(14);
        scene.tweens.add({targets:impact,alpha:0,duration:270,onComplete:()=>impact.destroy()});
        for(const d of [-1,1]){
          const wave=env.projectiles.create(enemy.x+d*36,body.bottom-18,'boss_ink_orb') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          wave.setDisplaySize(74,24).setTint(0xffa34d).setData('enemyProjectile',true).setData('damage',14).setData('bossShotExpiresAt',now+1650).setData('sourceKind','giant').setData('quakeWave',true).setDepth(14);
          wave.body.setAllowGravity(false);wave.setVelocityX(d*Math.round(260*tuning.projectileSpeedScale));
        }
      }
    }
    if(elapsed>=attack){
      if(kind==='dasher'&&env.level===6)env.firePulse(enemy,9,0xc598ff,Math.round(265*tuning.projectileSpeedScale),{x:Number(enemy.getData('targetX')),y:Number(enemy.getData('targetY'))});
      enemy.setVelocityX(0).setData('attackState','recover').setData('stateStartedAt',now)
        .setData('attacksCompleted',Number(enemy.getData('attacksCompleted')??0)+1);
    }
    return;
  }
  if(state==='recover'){
    enemy.setVelocityX(0).anims.stop();enemy.setTexture(foeTexture(kind),'11');
    if(elapsed>=recover)enemy.setData('attackState','patrol').setData('nextAttackAt',now+Math.round(620*tuning.cadenceScale));
    return;
  }
  const target=env.player.body as Phaser.Physics.Arcade.Body;
  const dxToPlayer=target.center.x-body.center.x;
  const distX=Math.abs(dxToPlayer);
  const distY=Math.abs(target.bottom-body.bottom);
  let facing=Number(enemy.getData('direction'));
  enemy.x=Phaser.Math.Clamp(enemy.x,left,right);
  // Active pursuit when player enters engagement range on the same tier
  const pursuing=(kind==='walker'||kind==='dasher'||kind==='giant')&&distX<440+tuning.noticeBonus&&distX>48&&distY<135;
  if(pursuing){
    facing=dxToPlayer<0?-1:1;
    if((facing<0&&enemy.x<=left+2)||(facing>0&&enemy.x>=right-2))facing=0;
  }else{
    if(enemy.x<=left+1)facing=1;if(enemy.x>=right-1)facing=-1;
  }
  const baseSpeed=kind==='dasher'?165:kind==='giant'?70:kind==='alien'?75:98;
  const moveSpeed=pursuing?baseSpeed*1.32:baseSpeed;
  if(facing!==0)enemy.setData('direction',facing).setFlipX(facing>0);
  else enemy.setFlipX(dxToPlayer>0);
  enemy.setVelocityX(facing*moveSpeed);
  enemy.anims.play(foeWalk(kind),true);enemy.anims.timeScale=pursuing?1.25:1;
  const noticeX=(kind==='alien'?600:kind==='giant'?330:kind==='dasher'?440:250)+tuning.noticeBonus;
  const noticeY=kind==='alien'?310:145;
  if(now>=Number(enemy.getData('nextAttackAt'))&&distX<noticeX&&distY<noticeY){
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
