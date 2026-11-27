import type {PowerupRoute} from './powerups';
export const SUPPLY_CRATE_IDS = [
  ...[1,2,3,4,6].flatMap(level=>['rapid','health','fan'].map(kind=>`l${level}-${kind}`)),
  'l5-spread','l5-health','l5-homing'
];
export interface SupplyCrateSave {broken:string[];collected:string[];landed?:string[]}
export const isSupplyCrateId=(id:unknown):id is typeof SUPPLY_CRATE_IDS[number]=>typeof id==='string'&&(SUPPLY_CRATE_IDS as readonly string[]).includes(id);
export function supplyCratePlans(level:number,endX:number,route?:PowerupRoute,avoid:{x:number}[]=[]){
  if(![1,2,3,4,6].includes(level))return [];
  if(level!==1){
    if(!route)return [];
    const used=[...avoid],plans:Array<{id:string;x:number;floor:number;reward:'rapid'|'health'|'fan'}>=[];
    for(const [i,anchor] of [route.spawn.x+950,route.spawn.x+(endX-route.spawn.x)*.48,endX-1600].entries()){
      const point=route.platforms.filter(p=>p.h>=80&&p.w>=220).flatMap(p=>{
        const clamp=(x:number)=>Math.max(p.x+96,Math.min(p.x+p.w-96,x));
        return [anchor,anchor-160,anchor+160,anchor-320,anchor+320,p.x+96,p.x+p.w-96,(p.x+p.x+p.w)/2].map(x=>({x:clamp(x),floor:p.y,support:p}));
      }).filter(p=>p.x>route.spawn.x+100&&p.x<endX-1100&&!used.some(q=>Math.abs(q.x-p.x)<240)
        &&!route.hazards.some(h=>p.x>h.x-80&&p.x<h.x+h.w+80&&Math.abs(p.floor-h.y)<120)
        &&!route.platforms.some(r=>r!==p.support&&r.x<p.x+56&&r.x+r.w>p.x-56&&r.y<p.floor&&r.y+r.h>p.floor-120))
        .sort((a,b)=>Math.abs(a.x-anchor)-Math.abs(b.x-anchor))[0];
      if(point){plans.push({id:`l${level}-${['rapid','health','fan'][i]}`,x:point.x,floor:point.floor,reward:(['rapid','health','fan'] as const)[i]});used.push(point);}
    }
    return plans;
  }
  return [
    {id:'l1-rapid',x:1600,floor:480,reward:'rapid' as const},
    {id:'l1-health',x:3750,floor:480,reward:'health' as const},
    {id:'l1-fan',x:endX-1580,floor:480,reward:'fan' as const}
  ];
}
