import type {BuddyId} from './shopCatalog';

/** A small original drawing shared by the Workshop preview and the Alley. */
export function paintBuddy(ctx:CanvasRenderingContext2D,id:BuddyId,facing=1,flap=0) {
  const moth=id==='spark-moth';
  const ellipse=(x:number,y:number,w:number,h:number,color:string)=>{
    ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();ctx.stroke();
  };
  ctx.save();ctx.strokeStyle='#2c2441';ctx.lineWidth=2;ctx.lineCap='round';
  for(const side of [-1,1])ellipse(side*13,-3,19,12+flap*3,moth?'#dfbbff':'#6caad9');
  ellipse(0,0,moth?24:28,20,moth?'#ffc866':'#7fe3cb');
  ctx.beginPath();ctx.moveTo(-5,-9);ctx.lineTo(-8,-16);ctx.moveTo(5,-9);ctx.lineTo(8,-16);ctx.stroke();
  ctx.fillStyle='#2c2441';
  for(const side of [-1,1]){ctx.beginPath();ctx.arc(facing*4+side*3,-2,1.7,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff3d0';
  if(moth){ctx.beginPath();ctx.arc(0,5,3,0,Math.PI*2);ctx.fill();}
  else {ctx.fillRect(-3,4,6,2);ctx.fillRect(-1,2,2,6);}
  ctx.restore();
}
