import Phaser from 'phaser';
import type { PlatformRoute, PendulumPlan } from './platformRoutes';

const swingPoint=(plan:PendulumPlan,clock:number)=>{
  const angle=Math.sin((clock/plan.period+plan.phase)*Math.PI*2)*plan.arc;
  return {x:plan.x+Math.sin(angle)*plan.length,y:plan.y+Math.cos(angle)*plan.length};
};

/** Simulation-driven mechanisms: no wall-clock tweens or independent damage rules. */
export class PlatformRouteRuntime {
  private clock=0;
  private ink:Phaser.GameObjects.Graphics;
  private title:Phaser.GameObjects.Text;
  private riding=-1;
  private carried=0;
  private contacts=0;
  private color:number;
  constructor(private scene:Phaser.Scene,private route:PlatformRoute,private player:Phaser.Physics.Arcade.Sprite,
    level:number,private damage:()=>void){
    this.color=({1:0xffc76d,2:0xc8b5ed,3:0xffa46a,4:0xb5e38e,6:0x99dafa} as Record<number,number>)[level];
    this.ink=scene.add.graphics().setDepth(8);
    this.title=scene.add.text(route.start+45,route.floor-320,route.title,{
      fontFamily:'Gochi Hand, sans-serif',fontSize:'22px',color:'#fff1cb',stroke:'#272238',strokeThickness:4,
    }).setDepth(7);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.ink.destroy();this.title.destroy();});
  }
  update(delta:number){
    this.clock+=delta;
    this.ink.clear();this.riding=-1;
    const body=this.player.body as Phaser.Physics.Arcade.Body;
    this.route.conveyors.forEach((belt,index)=>{
      const riding=body.velocity.y>=-20&&Math.abs(body.bottom-belt.y)<4&&body.right>belt.x+4&&body.left<belt.x+belt.w-4;
      if(riding){
        this.riding=index;
        const dx=belt.speed*delta/1000;
        if(!(dx>0?body.blocked.right:body.blocked.left)){
          // Shift all three together, so Arcade postUpdate does not apply carry twice.
          body.position.x+=dx;body.prev.x+=dx;this.player.x+=dx;this.carried+=Math.abs(dx);
        }
      }
      this.ink.fillStyle(0x252b3c,.95).fillRect(belt.x,belt.y+4,belt.w,23)
        .lineStyle(2,this.color).strokeRect(belt.x,belt.y+4,belt.w,23);
      const offset=((this.clock*belt.speed/1000)%38+38)%38;
      for(let x=belt.x+offset;x<belt.x+belt.w-13;x+=38){
        const d=Math.sign(belt.speed);
        this.ink.lineStyle(3,this.color,.95).lineBetween(x-5*d,belt.y+10,x+3*d,belt.y+16)
          .lineBetween(x+3*d,belt.y+16,x-5*d,belt.y+22);
      }
    });
    for(const plan of this.route.pendulums){
      const p=swingPoint(plan,this.clock);
      // Dotted swing envelope and a visible anchor make the danger readable in advance.
      this.ink.lineStyle(1,this.color,.25);
      for(let i=0;i<18;i++){
        const a=-plan.arc+2*plan.arc*i/18,b=a+plan.arc/24;
        this.ink.lineBetween(plan.x+Math.sin(a)*plan.length,plan.y+Math.cos(a)*plan.length,
          plan.x+Math.sin(b)*plan.length,plan.y+Math.cos(b)*plan.length);
      }
      this.ink.lineStyle(5,0x292439).lineBetween(plan.x,plan.y,p.x,p.y)
        .lineStyle(2,this.color,.85).lineBetween(plan.x,plan.y,p.x,p.y)
        .fillStyle(0x292439).fillCircle(plan.x,plan.y,9).fillStyle(this.color).fillCircle(plan.x,plan.y,4);
      const points=Array.from({length:16},(_,i)=>{
        const angle=i*Math.PI/8+this.clock/600;
        const r=i%2===0?plan.radius:plan.radius*.72;
        return new Phaser.Geom.Point(p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r);
      });
      this.ink.fillStyle(this.color).fillPoints(points,true).lineStyle(3,0x292439).strokePoints(points,true)
        .fillStyle(0x57405a).fillCircle(p.x,p.y,plan.radius*.44)
        .lineStyle(2,0xfff4d2,.9).lineBetween(p.x-8,p.y-6,p.x-2,p.y-11);
      if(Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(p.x,p.y,plan.radius-3),
        new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height))){this.contacts++;this.damage();}
    }
  }
  read(){return {title:this.route.title,start:this.route.start,end:this.route.start+this.route.length,
    cameraTop:Math.round(this.scene.cameras.main.scrollY),
    ridingConveyor:this.riding,carriedPixels:Math.round(this.carried),contacts:this.contacts,
    conveyors:this.route.conveyors,pendulums:this.route.pendulums.map(plan=>({...plan,...swingPoint(plan,this.clock),anchorX:plan.x,anchorY:plan.y}))};}
}
