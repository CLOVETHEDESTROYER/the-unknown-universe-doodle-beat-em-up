import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';
import type {FlightState} from './flight';
import type {SupplyCrateSave} from './supplyCrates';

export const FLIGHT_SUPPLY_PLANS=[
  {id:'l5-spread',distance:2600,reward:'spread' as const},
  {id:'l5-health',distance:8200,reward:'health' as const},
  {id:'l5-homing',distance:13200,reward:'homing' as const}
];
/** Flight uses the same one-time crate ledger but ship bolts and ship rewards,
 * not ground Arcade bodies. Boxes descend into the ship's reachable lane. */
export class FlightSupplyCrates {
  private broken:Set<string>;private collected:Set<string>;private landed:Set<string>;
  private items:ReturnType<FlightSupplyCrates['makeItems']>;
  constructor(private scene:Phaser.Scene,saved:SupplyCrateSave|undefined,private changed:(s:SupplyCrateSave)=>void){
    this.broken=new Set(saved?.broken??[]);this.collected=new Set(saved?.collected??[]);this.landed=new Set(saved?.landed??[]);
    this.items=this.makeItems();
  }
  private makeItems(){return FLIGHT_SUPPLY_PLANS.map(plan=>({plan,hp:this.broken.has(plan.id)?0:3,
    phase:this.broken.has(plan.id)?'broken':this.landed.has(plan.id)?'landed':'waiting',elapsed:0,y:this.landed.has(plan.id)?300:-70,
    icon:this.scene.add.image(0,0,'flight_supply_crate').setDisplaySize(76,82).setVisible(false).setDepth(12),
    canopy:this.scene.add.graphics().setDepth(13),
    label:this.scene.add.text(0,0,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'16px',color:'#fff0c2',stroke:'#19182e',strokeThickness:4}).setOrigin(.5).setDepth(13)
  }));}
  save():SupplyCrateSave{return {broken:[...this.broken],collected:[...this.collected],landed:[...this.landed]};}
  update(s:FlightState,ms:number){
    if(s.phase!=='flight')return;
    const consumed=new Set<number>();
    for(const item of this.items){
      const x=item.plan.distance-s.distance;
      if(item.phase==='waiting'&&x<=1100&&x>=-100){item.phase='descending';item.elapsed=0;}
      if(item.phase==='descending'){
        item.elapsed+=ms;item.y=-70+370*Math.min(1,item.elapsed/2400);
        if(item.elapsed>=2400){item.phase='landed';this.landed.add(item.plan.id);this.changed(this.save());}
      }
      if(item.phase==='landed'&&x>-100&&x<1100){
        for(const bolt of s.combat.bolts){
          if(bolt.owner!=='player'||consumed.has(bolt.id))continue;
          if(Math.abs(bolt.x-x)>44||Math.abs(bolt.y-item.y)>45)continue;
          consumed.add(bolt.id);item.hp=Math.max(0,item.hp-bolt.damage);
          if(item.hp===0){item.phase='broken';this.broken.add(item.plan.id);this.changed(this.save());playSfx('punchHit',{volume:.5});break;}
        }
      }
      if(item.phase==='broken'&&!this.collected.has(item.plan.id)&&Math.abs(s.x-x)<65&&Math.abs(s.y-item.y)<50){
        this.collected.add(item.plan.id);
        if(item.plan.reward==='health'||s.noPowerups)s.hull=Math.min(100,s.hull+30);
        else{s.combat.weapon=item.plan.reward;s.weaponHits=3;s.combat.nextShotAt=0;s.weaponChangedAt=s.clock;}
        this.changed(this.save());playSfx('powerup');
      }
    }
    if(consumed.size)s.combat.bolts=s.combat.bolts.filter(bolt=>!consumed.has(bolt.id));
  }
  draw(s:FlightState){
    for(const item of this.items){
      const x=item.plan.distance-s.distance,visible=s.phase==='flight'&&x>-100&&x<1100&&item.phase!=='waiting'&&!this.collected.has(item.plan.id);
      item.icon.setVisible(visible);item.label.setVisible(visible);item.canopy.clear();if(!visible)continue;
      const loot=item.phase==='broken',health=item.plan.reward==='health'||s.noPowerups;
      item.icon.setTexture(loot?(health?'flight_supply_health':`flight_power_${item.plan.reward}`):'flight_supply_crate')
        .setDisplaySize(loot?48:76,loot?48:82).setPosition(x,item.y).setAngle(item.phase==='descending'?Math.sin(item.elapsed/300)*4:0);
      item.label.setText(loot?(health?'REPAIR +30':item.plan.reward.toUpperCase()):item.phase==='descending'?'SUPPLIES ↓':'SHOOT TO OPEN').setPosition(x,item.y+58);
      if(item.phase==='descending'){
        const g=item.canopy,y=item.y-105;
        g.fillStyle(0xf4df99).lineStyle(3,0x2b2332).beginPath().arc(x,y,55,Math.PI,Math.PI*2,false).lineTo(x-55,y).closePath().fillPath().strokePath();
        g.fillStyle(0x9dc6b5).fillTriangle(x,y-55,x-24,y,x+24,y);
        g.lineStyle(2,0xeee3c9).lineBetween(x-46,y,x-28,item.y-38).lineBetween(x+46,y,x+28,item.y-38);
      }
    }
  }
  read(s:FlightState){return this.items.map(i=>({...i.plan,x:i.plan.distance-s.distance,y:i.y,hp:i.hp,delivery:i.phase,collected:this.collected.has(i.plan.id)}));}
  destroy(){for(const item of this.items){item.icon.destroy();item.canopy.destroy();item.label.destroy();}}
}
