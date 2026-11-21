import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';

type Enemy=Phaser.Physics.Arcade.Sprite;
const BOLT='lockwing_bolt';
function prepareBolt(scene:Phaser.Scene){
  if(scene.textures.exists(BOLT))return;
  const ink=scene.add.graphics();
  const edge=[{x:5,y:25},{x:22,y:5},{x:62,y:8},{x:79,y:25},{x:62,y:42},{x:22,y:45}];
  ink.fillStyle(0x3a263d).fillPoints(edge,true).lineStyle(3,0xffce65).strokePoints(edge,true);
  ink.fillStyle(0xffbb3d).fillEllipse(39,25,57,28).fillStyle(0xffec9a).fillEllipse(33,24,38,18)
    .fillStyle(0xfffbe1).fillEllipse(26,23,19,10).lineStyle(3,0xfff4c6).lineBetween(42,25,65,25);
  ink.generateTexture(BOLT,84,50);ink.destroy();
}
function ports(enemy:Enemy,direction:number){
  return [-1,1].map((side,index)=>({x:enemy.x+direction*enemy.displayWidth*.35,
    y:enemy.y+side*enemy.displayHeight*.28,pattern:index===0?'lockwing_upper':'lockwing_lower'}));
}
function clearWarning(enemy:Enemy){
  (enemy.getData('tellVisual') as Phaser.GameObjects.Graphics|undefined)?.destroy();
  enemy.setData('tellVisual',undefined).setData('lockTellUntil',0).setData('attackState','patrol');
}
export function clearLockwingCombat(enemy:Enemy,projectiles:Phaser.Physics.Arcade.Group){
  clearWarning(enemy);
  projectiles.getChildren().filter(p=>p.getData('lockwingOwner')===enemy).forEach(p=>p.destroy());
}

/** Simulation time pauses with the encounter. Bolts commit to two horizontal lanes. */
export function updateLockwingVolley(scene:Phaser.Scene,enemy:Enemy,player:Enemy,projectiles:Phaser.Physics.Arcade.Group,delta:number){
  const clock=Number(enemy.getData('lockClock')??0)+delta;
  enemy.setData('lockClock',clock);
  const near=Math.abs(player.x-enemy.x)<620&&Math.abs(player.y-enemy.y)<430;
  if(!near){clearWarning(enemy);enemy.setData('lockNextVolley',clock+1400);return;}
  const until=Number(enemy.getData('lockTellUntil')??0);
  if(until>0){
    const direction=Number(enemy.getData('lockDirection'));
    const warning=enemy.getData('tellVisual') as Phaser.GameObjects.Graphics;
    const progress=Phaser.Math.Clamp(1-(until-clock)/550,0,1);
    warning.clear();
    for(const port of ports(enemy,direction)){
      warning.fillStyle(0xffd373,.12+progress*.16).fillCircle(port.x,port.y,23+progress*6)
        .lineStyle(3,0xffe6a0,.95).strokeCircle(port.x,port.y,12+progress*8)
        .lineStyle(2,0xffe6a0,.55).lineBetween(port.x+direction*30,port.y,port.x+direction*100,port.y)
        .lineBetween(port.x+direction*100,port.y,port.x+direction*88,port.y-7)
        .lineBetween(port.x+direction*100,port.y,port.x+direction*88,port.y+7);
    }
    if(clock<until)return;
    prepareBolt(scene);
    for(const port of ports(enemy,direction)){
      const shot=projectiles.create(port.x,port.y,BOLT) as Phaser.Physics.Arcade.Sprite;
      shot.setDisplaySize(72,44).setDepth(18).setFlipX(direction>0).setVelocityX(direction*240)
        .setData('enemyProjectile',true).setData('sourceKind','lockwing').setData('lockwingOwner',enemy)
        .setData('pattern',port.pattern).setData('damage',12).setData('bossShotExpiresAt',scene.time.now+2900);
      const body=shot.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setSize(shot.width*.72,shot.height*.65,true);
      const glow=scene.add.ellipse(port.x,port.y,46,35,0xffdc85,.55).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({targets:glow,alpha:0,scale:1.35,duration:160,onComplete:()=>glow.destroy()});
    }
    enemy.setData('shotsInBurst',Number(enemy.getData('shotsInBurst')??0)+2).setData('lockNextVolley',clock+1600);
    clearWarning(enemy);playSfx('enemyLaser',{volume:.32,pitch:.65});return;
  }
  if(clock>=Number(enemy.getData('lockNextVolley')??1400)){
    enemy.setData('lockTellUntil',clock+550).setData('lockDirection',player.x<enemy.x?-1:1)
      .setData('attackState','tell').setData('tellVisual',scene.add.graphics().setDepth(17));
  }
}
