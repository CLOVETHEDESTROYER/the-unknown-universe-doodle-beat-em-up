import Phaser from 'phaser';
import {playSfx} from '../audio/gameAudio';

type Enemy=Phaser.Physics.Arcade.Sprite;
interface Hooks {
  enemies:Phaser.Physics.Arcade.Group;projectiles:Phaser.Physics.Arcade.Group;
  damage:(enemy:Enemy,amount:number)=>boolean;floor:(x:number)=>number|null;
}
interface Column {x:number;y:number;at:number;wave:number;fired:boolean}

/** Scheduled sky strikes share the scene clock, pause and ordinary boss damage rules. */
export class KaiThunderfall {
  private columns:Column[]=[];
  private sprites:Phaser.GameObjects.Sprite[]=[];
  private marks:Phaser.GameObjects.Graphics;
  private targets=[new Set<Enemy>(),new Set<Enemy>(),new Set<Enemy>()];
  private sounded=new Set<number>();
  private strikes=0;
  private hits=0;
  private clearedShots=0;
  private waves=0;
  private alive=true;

  constructor(private scene:Phaser.Scene,private hooks:Hooks){
    this.marks=scene.add.graphics().setDepth(22);
  }

  start(x:number,y:number,now:number){
    this.cancel();
    const camera=this.scene.cameras.main;
    const left=Math.max(camera.scrollX+35,x-480),right=Math.min(camera.scrollX+camera.width-35,x+480);
    const enemies=(this.hooks.enemies.getChildren() as Enemy[]).filter(e=>{
      const body=e.body as Phaser.Physics.Arcade.Body;
      return e.active&&body?.enable&&Number(e.getData('hp'))>0&&body.center.x>=left&&body.center.x<=right
        &&body.bottom>camera.scrollY&&body.top<camera.scrollY+camera.height;
    }).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)).slice(0,4);
    for(let wave=0;wave<3;wave++){
      const lanes=enemies.map(e=>({x:(e.body as Phaser.Physics.Arcade.Body).center.x+(wave===1?12:wave===2?-12:0),
        y:(e.body as Phaser.Physics.Arcade.Body).bottom}));
      for(let n=lanes.length;n<6;n++){
        const lx=Phaser.Math.Linear(left,right,(n+.5)/6);
        lanes.push({x:lx,y:this.hooks.floor(lx)??y});
      }
      // The first wave favors actual enemy lanes; later waves revisit the marked
      // ground. Moving enemies can leave a column before its delayed strike.
      lanes.forEach((lane,n)=>this.columns.push({x:Phaser.Math.Clamp(lane.x,left,right),y:lane.y,
        at:now+120+wave*330+n*45,wave,fired:false}));
    }
    while(this.sprites.length<this.columns.length)this.sprites.push(this.scene.add.sprite(0,0,'kai_thunder_beam','0')
      .setOrigin(.5,496/512).setDepth(23).setVisible(false));
  }

  update(now:number){
    if(!this.alive)return;
    this.marks.clear();
    const top=this.scene.cameras.main.scrollY-60;
    this.columns.forEach((column,n)=>{
      const age=now-column.at,sprite=this.sprites[n];
      sprite.setVisible(age>=-65&&age<220);
      if(age>=-140&&age<0){
        this.marks.lineStyle(2,0x61e7ff,.65).strokeEllipse(column.x,column.y-3,62,12);
      }
      if(age>=0&&!column.fired){
        column.fired=true;this.strikes++;
        if(!this.sounded.has(column.wave)){
          this.sounded.add(column.wave);this.waves++;playSfx('storm',{volume:.55,pitch:1.1+column.wave*.08});
        }
        this.strike(column,top,now);
      }
      if(sprite.visible){
        const frame=age<0?0:age<65?1:age<140?2:3;
        const alpha=age<0?.55:age<140?.95:(220-age)/80;
        sprite.setFrame(String(frame)).setPosition(column.x,column.y).setAlpha(alpha)
          .setDisplaySize(frame===2?108:90,Math.max(80,column.y-top)*512/480);
      }
    });
    if(this.columns.length&&this.columns.every(c=>now>=c.at+220)){
      this.columns=[];this.targets.forEach(s=>s.clear());
    }
  }

  private strike(column:Column,top:number,now:number){
    const area=new Phaser.Geom.Rectangle(column.x-38,top,76,Math.max(0,column.y-top+10));
    for(const enemy of [...this.hooks.enemies.getChildren()] as Enemy[]){
      if(!enemy.active||this.targets[column.wave].has(enemy))continue;
      const body=enemy.body as Phaser.Physics.Arcade.Body;
      if(!body?.enable||!Phaser.Geom.Intersects.RectangleToRectangle(area,new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height)))continue;
      this.targets[column.wave].add(enemy);
      if(this.hooks.damage(enemy,3)){
        this.hits++;
        if(enemy.active&&enemy.getData('kind')!=='boss'){
          enemy.setData('specialStunUntil',now+300).setVelocityX(0);
          if(body.allowGravity)enemy.setVelocityY(-160);
        }
      }
    }
    for(const shot of [...this.hooks.projectiles.getChildren()] as Enemy[]){
      if(shot.active&&shot.getData('enemyProjectile')&&Phaser.Geom.Rectangle.Contains(area,shot.x,shot.y)){
        shot.destroy();this.clearedShots++;
      }
    }
  }

  read(){const now=this.scene.time.now;return {active:this.columns.length>0,strikes:this.strikes,hits:this.hits,
    waves:this.waves,clearedShots:this.clearedShots,planned:this.columns.length,
    columns:this.columns.filter(c=>now>=c.at-140&&now<c.at+220).map(c=>({x:Math.round(c.x),y:Math.round(c.y),
      phase:now<c.at?'warning':'strike',wave:c.wave,age:Math.round(now-c.at)}))};}

  cancel(){this.columns=[];this.targets.forEach(s=>s.clear());this.sounded.clear();
    this.sprites.forEach(s=>s.setVisible(false));this.marks.clear();}
  destroy(){if(!this.alive)return;this.cancel();this.alive=false;this.sprites.forEach(s=>s.destroy());this.marks.destroy();}
}
