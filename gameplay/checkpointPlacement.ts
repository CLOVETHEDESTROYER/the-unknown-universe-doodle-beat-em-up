type Surface={x:number;y:number;w:number;h:number};
export const CHECKPOINT_ART={width:58*1.2,height:82*1.2,originX:350.5/1060,originY:1439/1484,baseHalfWidth:10};
/** Prefer the original route's floor; clamp only flags whose base would overhang an edge. */
export function checkpointSupport(x:number,surfaces:Surface[]){
  const half=CHECKPOINT_ART.baseHalfWidth;
  const under=surfaces.find(p=>p.w>=half*2&&x>=p.x+half&&x<=p.x+p.w-half);
  if(under)return {x,y:under.y};
  const nearby=surfaces.filter(p=>p.w>=half*2).map(p=>({x:Math.max(p.x+half,Math.min(p.x+p.w-half,x)),y:p.y}))
    .sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
  return nearby??{x,y:520};
}
