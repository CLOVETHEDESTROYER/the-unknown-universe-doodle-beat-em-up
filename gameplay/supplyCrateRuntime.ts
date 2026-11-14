import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
import {supplyCratePlans,type SupplyCrateSave} from './supplyCrates';
type Plan=ReturnType<typeof supplyCratePlans>[number];
type Delivery='waiting'|'descending'|'landed'|'broken';
export const SUPPLY_DROP_MS=3600;
interface Host {changed:(state:SupplyCrateSave)=>void;collect:(reward:Plan['reward'])=>void}
/** Non-solid props with one-shot, persisted rewards; neither enemies nor saves
 * can recreate a collected reward. Uncollected drops are restored in place. */
export class SupplyCrateRuntime {
  private broken:Set<string>;
  private collected:Set<string>;
  private landed:Set<string>;
  private items:Array<{plan:Plan;hp:number;delivery:Delivery;elapsed:number;startY:number;canopy:Phaser.GameObjects.Graphics|null;sprite:Phaser.GameObjects.Image|null;label:Phaser.GameObjects.Text|null;drop:Phaser.GameObjects.Image|null}>=[];
  constructor(private scene:Phaser.Scene,plans:Plan[],saved:SupplyCrateSave|undefined,private host:Host){
    this.broken=new Set(saved?.broken??[]);this.collected=new Set(saved?.collected??[]);
    this.landed=new Set(saved?.landed??[]);
    this.items=plans.map(plan=>({plan,hp:this.broken.has(plan.id)?0:3,
      delivery:this.broken.has(plan.id)?'broken':this.landed.has(plan.id)?'landed':'waiting',elapsed:this.landed.has(plan.id)?1000:0,startY:0,
      canopy:this.broken.has(plan.id)||this.landed.has(plan.id)?null:scene.add.graphics().setDepth(10),
      sprite:this.broken.has(plan.id)?null:scene.add.image(plan.x,plan.floor,'supply_crate').setOrigin(.5,1).setDisplaySize(96,104).setDepth(9).setVisible(this.landed.has(plan.id)),
      label:this.broken.has(plan.id)?null:scene.add.text(plan.x,plan.floor-120,'BREAK',{
        fontFamily:'Gochi Hand, sans-serif',fontSize:'16px',color:'#fff1b8',stroke:'#21182d',strokeThickness:4}).setOrigin(.5).setDepth(10).setVisible(this.landed.has(plan.id)),drop:null}));
    this.items.forEach(item=>{if(item.hp===0&&!this.collected.has(item.plan.id))this.spawnDrop(item);});
  }
  save():SupplyCrateSave{return {broken:[...this.broken],collected:[...this.collected],landed:[...this.landed]};}
  private updateDelivery(item:typeof this.items[number],player:Phaser.Physics.Arcade.Sprite,delta:number){
    if(item.delivery==='waiting'){
      // Trigger near the player, not at level load while every crate is offscreen.
      if(Math.abs(player.x-item.plan.x)>650)return;
      item.delivery='descending';item.elapsed=0;
      item.startY=Math.min(this.scene.cameras.main.worldView.top-30,item.plan.floor-450);
      item.sprite?.setPosition(item.plan.x,item.startY).setVisible(true);
      item.label?.setText('SUPPLIES ↓').setPosition(item.plan.x,item.plan.floor-16).setVisible(true);
    }
    if(item.delivery==='broken')return;
    item.elapsed+=delta;
    if(item.delivery==='descending'){
      const t=Math.min(1,item.elapsed/SUPPLY_DROP_MS);
      const sway=Math.sin(item.elapsed/450)*12*Math.sin(t*Math.PI);
      item.sprite?.setPosition(item.plan.x+sway,item.startY+(item.plan.floor-item.startY)*t).setAngle(sway*.35);
      if(t===1){
        item.delivery='landed';item.elapsed=0;item.sprite?.setPosition(item.plan.x,item.plan.floor).setAngle(0);
        item.label?.setText('BREAK').setPosition(item.plan.x,item.plan.floor-120);
        this.landed.add(item.plan.id);this.host.changed(this.save());
      }
    }else if(item.sprite){
      const bounce=Math.sin(Math.min(1,item.elapsed/280)*Math.PI)*.08;
      item.sprite.setDisplaySize(96,104*(1-bounce));
    }
    const g=item.canopy?.clear(),sprite=item.sprite;
    if(!g||!sprite)return;
    const fold=item.delivery==='landed'?Math.min(1,item.elapsed/650):0;
    if(fold===1){g.destroy();item.canopy=null;return;}
    const x=sprite.x,y=sprite.y-174+fold*65,r=70*(1-fold*.75);
    g.setAlpha(1-fold);
    // Thick ink contours, alternating cloth panels and suspension lines are
    // drawn in local game style; no extra spritesheet download is needed.
    g.fillStyle(0xf4df99,1).lineStyle(4,0x2b2332,1).beginPath()
      .arc(x,y,r,Math.PI,Math.PI*2,false).lineTo(x-r,y).closePath().fillPath().strokePath();
    g.fillStyle(0x9dc6b5,1).fillTriangle(x,y-r,x-r*.45,y,x+r*.45,y);
    g.lineStyle(3,0x2b2332,1).lineBetween(x,y-r,x-r*.45,y).lineBetween(x,y-r,x+r*.45,y);
    for(const sign of [-1,1]){
      g.lineStyle(2,0xeee3c9,1).lineBetween(x+sign*r*.85,y,sprite.x+sign*32,sprite.y-96)
        .lineBetween(x+sign*r*.4,y,sprite.x+sign*32,sprite.y-96);
    }
  }
  private spawnDrop(item:typeof this.items[number]){
    const key=item.plan.reward==='health'?'heart':`gun_upgrade_${item.plan.reward}`;
    item.drop=this.scene.add.image(item.plan.x,item.plan.floor-54,key).setDisplaySize(50,50).setDepth(18);
  }
  damageRect(rect:Phaser.Geom.Rectangle,damage:number,projectile?:Phaser.Physics.Arcade.Sprite):boolean{
    let hit=false;
    for(const item of this.items){
      if(item.hp<=0||item.delivery!=='landed'||!Phaser.Geom.Rectangle.Overlaps(rect,new Phaser.Geom.Rectangle(item.plan.x-48,item.plan.floor-104,96,104)))continue;
      const seen=projectile?.getData('supplyCrateHits') as Set<string>|undefined;
      if(seen?.has(item.plan.id))continue;
      if(projectile){const ids=seen??new Set<string>();ids.add(item.plan.id);projectile.setData('supplyCrateHits',ids);}
      hit=true;item.hp=Math.max(0,item.hp-Math.max(1,damage));
      if(item.hp>0){
        item.sprite?.setTint(0xffe4a8);
        this.scene.time.delayedCall(85,()=>{if(item.sprite?.active)item.sprite.clearTint();});
        playSfx('enemyHit',{volume:.4});continue;
      }
      this.broken.add(item.plan.id);item.delivery='broken';item.canopy?.destroy();item.canopy=null;item.sprite?.destroy();item.sprite=null;item.label?.destroy();item.label=null;
      this.spawnDrop(item);this.host.changed(this.save());playSfx('punchHit',{volume:.65});
      // Small wooden fragments, without flash, camera shake or hit-stop.
      for(let i=0;i<6;i++){
        const bit=this.scene.add.rectangle(item.plan.x,item.plan.floor-50,10,5,0xd6ae70).setDepth(17).setRotation(i);
        this.scene.tweens.add({targets:bit,x:item.plan.x+(i-2.5)*22,y:item.plan.floor-15,angle:i*70,alpha:0,duration:400,onComplete:()=>bit.destroy()});
      }
    }
    return hit;
  }
  update(player:Phaser.Physics.Arcade.Sprite,projectiles:Phaser.Physics.Arcade.Group,delta:number){
    for(const item of this.items)this.updateDelivery(item,player,Math.max(0,delta));
    for(const object of [...projectiles.getChildren()]){
      const shot=object as Phaser.Physics.Arcade.Sprite;
      if(!shot.active||shot.getData('enemyProjectile')||shot.getData('companion'))continue;
      if(!shot.getData('playerShotExpiresAt')&&!shot.getData('frostShot')&&!shot.getData('fireBlade'))continue;
      const body=shot.body as Phaser.Physics.Arcade.Body;
      if(this.damageRect(new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height),Number(shot.getData('damage'))||2,shot)&&!shot.getData('fireBlade'))shot.destroy();
    }
    const body=player.body as Phaser.Physics.Arcade.Body;
    const rect=new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height);
    for(const item of this.items){
      if(!item.drop||this.collected.has(item.plan.id)||!Phaser.Geom.Rectangle.Overlaps(rect,item.drop.getBounds()))continue;
      this.collected.add(item.plan.id);item.drop.destroy();item.drop=null;
      this.host.collect(item.plan.reward);this.host.changed(this.save());
    }
  }
  read(){return this.items.map(({plan,hp,drop,delivery,sprite,canopy,elapsed})=>({...plan,hp,delivery,y:sprite?.y??null,deliveryElapsedMs:Math.round(elapsed),parachuteVisible:Boolean(canopy?.active&&delivery==='descending'),broken:this.broken.has(plan.id),collected:this.collected.has(plan.id),dropVisible:Boolean(drop?.active)}));}
  destroy(){for(const item of this.items){item.canopy?.destroy();item.sprite?.destroy();item.label?.destroy();item.drop?.destroy();}}
}
