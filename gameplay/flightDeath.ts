export const SHIP_DEATH_DURATION_MS=1100;
export interface ShipDeath {id:number;x:number;y:number;bank:number;startedAt:number;final:boolean}
export function shipDeathPose(death:ShipDeath|null,clock:number){
  if(!death)return null;
  // Snap sub-millisecond clock drift so a frozen Game Over frame is fully finished.
  const elapsed=Math.max(0,Math.round((clock-death.startedAt)*1000)/1000);
  return {...death,elapsed,progress:Math.min(1,elapsed/SHIP_DEATH_DURATION_MS),
    stage:elapsed>=SHIP_DEATH_DURATION_MS?'finished':elapsed<100?'flash':elapsed<650?'breakup':'embers',
    visible:elapsed<SHIP_DEATH_DURATION_MS};
}
