import Phaser from 'phaser';
import {UNIQUE_ENEMIES,isUniqueEnemy} from './uniqueEnemies';
import type {UniqueEnemyKind} from './uniqueEnemies';
import {foeTexture,foeWalk} from './enemyMotion';

interface Environment {
  player:Phaser.Physics.Arcade.Sprite;projectiles:Phaser.Physics.Arcade.Group;
  clearIntent:(enemy:Phaser.Physics.Arcade.Sprite)=>void;
  floorAt:(x:number)=>number|null;
}
type Enemy=Phaser.Physics.Arcade.Sprite;
type Shot=Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
/** Small reusable raster VFX textures; these do not add network requests or per-frame canvases. */
function prepareMoveTextures(scene:Phaser.Scene){
  if(scene.textures.exists('unique_paint'))return;
  const g=scene.add.graphics();
  const save=(name:string)=>{g.generateTexture('unique_'+name,64,64);g.clear();};
  g.fillStyle(0x41213a).fillCircle(31,33,27).fillStyle(0xff4bbd).fillCircle(30,32,23)
    .fillCircle(9,16,6).fillCircle(54,49,5).fillStyle(0xffc0e6).fillEllipse(23,23,14,7);save('paint');
  g.fillStyle(0x193a3e).fillRoundedRect(5,3,54,59,13).fillStyle(0x79c9b5).fillRoundedRect(9,7,46,53,10)
    .lineStyle(4,0xd5fff0).lineBetween(32,18,32,48).lineBetween(22,28,42,28)
    .lineStyle(2,0x284e4b).lineBetween(13,52,21,45);save('grave');
  g.fillStyle(0x1e1b24).fillCircle(32,34,27).lineStyle(3,0xffa42c).strokeCircle(32,34,24)
    .lineBetween(15,22,29,32).lineBetween(29,32,22,48).lineBetween(29,32,46,37)
    .lineBetween(46,37,50,24).fillStyle(0xffe28a).fillCircle(30,8,5);save('coal');
  const leaf=[{x:3,y:32},{x:15,y:15},{x:23,y:21},{x:31,y:10},{x:37,y:20},{x:49,y:17},{x:60,y:31},{x:48,y:47},{x:39,y:43},{x:31,y:54},{x:22,y:43},{x:14,y:48}];
  g.fillStyle(0x9ae255).fillPoints(leaf,true).lineStyle(3,0x23352a).strokePoints(leaf,true)
    .lineStyle(2,0xf0f9a5).lineBetween(8,32,55,32).lineBetween(26,32,31,15).lineBetween(38,32,46,44);save('leaf');
  const star=[{x:32,y:2},{x:41,y:23},{x:62,y:32},{x:41,y:41},{x:32,y:62},{x:23,y:41},{x:2,y:32},{x:23,y:23}];
  g.fillStyle(0xa46dff).fillPoints(star,true).lineStyle(3,0x2a1b48).strokePoints(star,true)
    .fillStyle(0xc4ffff).fillCircle(32,32,7);save('star');
  const burst=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=i%2?20:31;return {x:32+Math.cos(a)*r,y:32+Math.sin(a)*r};});
  g.fillStyle(0xff6e2e).fillPoints(burst,true).fillStyle(0xffbe48).fillCircle(32,32,22)
    .fillStyle(0xffef9f).fillCircle(32,32,13);save('burst');g.destroy();
}
function shot(scene:Phaser.Scene,enemy:Enemy,env:Environment,x:number,y:number,pattern:string,damage:number,life=2400){
  prepareMoveTextures(scene);
  const texture={paint_skip:'paint',grave_chime:'grave',coal_mortar:'coal',returning_leaf:'leaf',rift_cross:'star'}[pattern]??'star';
  const p=env.projectiles.create(x,y,'unique_'+texture) as Shot;
  p.setDisplaySize(26,26).setDepth(16)
    .setData('sourceKind',enemy.getData('kind')).setData('pattern',pattern).setData('enemyProjectile',true)
    .setData('damage',damage).setData('bornAt',scene.time.now).setData('bossShotExpiresAt',scene.time.now+life);
  p.body.setAllowGravity(false).setSize(p.width*.65,p.height*.65,true);
  return p;
}
function launch(scene:Phaser.Scene,enemy:Enemy,kind:UniqueEnemyKind,env:Environment){
  const body=enemy.body as Phaser.Physics.Arcade.Body,d=Number(enemy.getData('attackDirection'));
  const tx=Number(enemy.getData('targetX')),ty=Number(enemy.getData('targetY'));
  if(kind==='tagger'){
    const p=shot(scene,enemy,env,body.center.x+d*35,body.bottom-36,'paint_skip',9,1900);
    p.setDisplaySize(32,22).setVelocity(d*270,-160).setData('bounces',0);
    p.body.setAllowGravity(true).setGravityY(-450).setBounce(.8,.72);
  }else if(kind==='bellkeeper'){
    for(const [index,offset] of [-62,62].entries()){
      const x=tx+offset,floor=env.floorAt(x)??body.bottom;
      const p=shot(scene,enemy,env,x,floor-34,'grave_chime',12,1100+index*220);
      p.setDisplaySize(32,68).setAlpha(.22).setData('armAt',scene.time.now+280+index*220);
      p.body.setSize(p.width*.8,p.height*.9,true);p.body.enable=false;
    }
  }else if(kind==='boiler'){
    const p=shot(scene,enemy,env,body.center.x,body.top+6,'coal_mortar',13,1400);
    const floor=env.floorAt(tx)??body.bottom;
    p.setDisplaySize(30,30).setData('startX',p.x).setData('startY',p.y).setData('landX',tx)
      .setData('landY',floor-14).setData('landAt',scene.time.now+800);
  }else if(kind==='mantis'){
    const p=shot(scene,enemy,env,body.center.x+d*30,body.center.y,'returning_leaf',11,1800);
    p.setDisplaySize(48,19).setVelocity(d*310,0).setData('returnAt',scene.time.now+600);
  }else{
    // Delayed diagonal stars give the player time to leave the marked point.
    for(const angle of [Math.PI*.25,Math.PI*.75,Math.PI*1.25,Math.PI*1.75]){
      const p=shot(scene,enemy,env,tx,ty,'rift_cross',11,1500);
      p.setDisplaySize(22,22).setAlpha(.2).setData('armAt',scene.time.now+300)
        .setData('launchVX',Math.cos(angle)*225).setData('launchVY',Math.sin(angle)*225);
      p.body.enable=false;
    }
  }
}
function warning(scene:Phaser.Scene,enemy:Enemy,kind:UniqueEnemyKind,env:Environment){
  env.clearIntent(enemy);
  const g=scene.add.graphics().setDepth(17),body=enemy.body as Phaser.Physics.Arcade.Body;
  const x=Number(enemy.getData('targetX')),y=Number(enemy.getData('targetY'));
  g.lineStyle(3,UNIQUE_ENEMIES[kind].color,.95);
  if(kind==='bellkeeper')for(const offset of [-62,62])g.strokeEllipse(x+offset,(env.floorAt(x+offset)??body.bottom)-5,46,20);
  else if(kind==='boiler')g.strokeEllipse(x,(env.floorAt(x)??body.bottom)-5,110,24);
  else if(kind==='mimic')g.strokeCircle(x,y,38).lineBetween(x-30,y-30,x+30,y+30).lineBetween(x-30,y+30,x+30,y-30);
  else g.lineBetween(body.center.x,body.center.y,x,y).strokeCircle(x,y,18);
  enemy.setData('tellVisual',g);
}
export function updateUniqueEnemy(scene:Phaser.Scene,enemy:Enemy,kind:UniqueEnemyKind,now:number,env:Environment){
  const def=UNIQUE_ENEMIES[kind],body=enemy.body as Phaser.Physics.Arcade.Body;
  const state=enemy.getData('attackState'),elapsed=now-Number(enemy.getData('stateStartedAt')??now);
  const left=Number(enemy.getData('left')),right=Number(enemy.getData('right'));
  if(state==='tell'){
    enemy.setVelocityX(0).setFlipX(Number(enemy.getData('attackDirection'))>0).anims.stop();
    enemy.setFrame(elapsed<def.tell/2?'8':'9');
    if(elapsed>=def.tell){env.clearIntent(enemy);enemy.clearTint().setData('attackState','attack').setData('stateStartedAt',now);}
    return;
  }
  if(state==='attack'){
    enemy.setVelocityX(0).anims.stop();enemy.setFrame(elapsed<def.attack*.65?'10':'11');
    const fired=Number(enemy.getData('shotsInBurst')??0),needed=kind==='tagger'?3:1;
    if(fired<needed&&elapsed>=70+fired*160){launch(scene,enemy,kind,env);enemy.setData('shotsInBurst',fired+1);}
    if(elapsed>=def.attack)enemy.setData('attackState','recover').setData('stateStartedAt',now)
      .setData('attacksCompleted',Number(enemy.getData('attacksCompleted')??0)+1);
    return;
  }
  if(state==='recover'){
    enemy.setVelocityX(0).anims.stop();enemy.setFrame('11');
    if(elapsed>=def.recover)enemy.setData('attackState','patrol').setData('nextAttackAt',now+950);
    return;
  }
  let d=Number(enemy.getData('direction'))||-1;
  if(enemy.x<=left+1)d=1;if(enemy.x>=right-1)d=-1;
  enemy.setData('direction',d).setFlipX(d>0).setVelocityX(d*def.speed).anims.play(foeWalk(kind),true);
  const target=env.player.body as Phaser.Physics.Arcade.Body;
  if(now>=Number(enemy.getData('nextAttackAt'))&&Math.abs(target.center.x-body.center.x)<def.notice&&Math.abs(target.bottom-body.bottom)<120){
    enemy.setVelocityX(0).setData('attackState','tell').setData('stateStartedAt',now).setData('shotsInBurst',0)
      .setData('targetX',target.center.x).setData('targetY',target.center.y).setData('attackDirection',target.center.x<body.center.x?-1:1)
      .setTint(def.color).setTexture(foeTexture(kind),'8');enemy.anims.stop();warning(scene,enemy,kind,env);
  }
}
/** Scene-clock projectile phases pause with the game and share normal retry cleanup. */
export function updateUniqueProjectiles(scene:Phaser.Scene,projectiles:Phaser.Physics.Arcade.Group,now:number){
  for(const object of [...projectiles.getChildren()]){
    const p=object as Shot;if(!p.active||!isUniqueEnemy(String(p.getData('sourceKind'))))continue;
    const pattern=p.getData('pattern'),armAt=Number(p.getData('armAt')??0);
    if(armAt&&now>=armAt){
      p.setData('armAt',0).setAlpha(1);p.body.enable=true;
      p.setVelocity(Number(p.getData('launchVX')??0),Number(p.getData('launchVY')??0));
    }
    if(pattern==='returning_leaf'){
      p.rotation+=.14;
      if(now>=Number(p.getData('returnAt'))&&!p.getData('returned')){p.setData('returned',true);p.setVelocityX(-p.body.velocity.x);}
    }
    if(pattern==='coal_mortar'){
      const t=Phaser.Math.Clamp((now-Number(p.getData('bornAt')))/800,0,1);
      // Reset both physics and visual coordinates; postUpdate must not add this motion twice.
      p.body.reset(Phaser.Math.Linear(Number(p.getData('startX')),Number(p.getData('landX')),t),
        Phaser.Math.Linear(Number(p.getData('startY')),Number(p.getData('landY')),t)-Math.sin(t*Math.PI)*145);
      p.rotation+=.08;
      if(t>=1)explodeCoal(scene,p);
    }
  }
}
function explodeCoal(scene:Phaser.Scene,p:Shot){
  if(p.getData('pattern')!=='coal_mortar')return;
  p.setTexture('unique_burst').setData('pattern','coal_burst').setData('bossShotExpiresAt',scene.time.now+280).setVelocity(0,0)
    .setDisplaySize(108,70).setAlpha(.9);
  p.body.setSize(p.width*.8,p.height*.8,true);
}
export function uniqueProjectileWall(scene:Phaser.Scene,p:Shot){
  if(p.getData('pattern')==='paint_skip'){
    const bounces=Number(p.getData('bounces'))+1;p.setData('bounces',bounces);if(bounces>=3)p.destroy();
  }else if(p.getData('pattern')==='coal_mortar')explodeCoal(scene,p);
  else if(p.getData('pattern')==='coal_burst')return;
  else p.destroy();
}
