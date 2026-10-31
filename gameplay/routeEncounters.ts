import type { GroundFoe } from './enemyMotion';

export const ENCOUNTER_IDS = ['rooftop_runout','doghost_rescue','last_ferry'] as const;
export type EncounterId = typeof ENCOUNTER_IDS[number];
export interface EncounterEnemy {kind: GroundFoe; x:number; y:number; left:number; right:number}
export interface RouteEncounterPlan {
  id:EncounterId; level:number; kind:'escape'|'rescue'|'ferry'; title:string;
  entry:number; exit:number; intro:string; objective:string; payoff:string;
  waves:EncounterEnemy[][]; marker:{x:number;y:number};
}
export const ROUTE_ENCOUNTERS:RouteEncounterPlan[] = [
  {id:'rooftop_runout',level:1,kind:'escape',title:'ROOFTOP RUNOUT',entry:7060,exit:8260,
    intro:'The old roof is giving way!',objective:'Keep moving. Jump the gaps before the roof falls.',payoff:'Back on solid ground! +300 · Health +20',
    marker:{x:7150,y:330},waves:[[
      {kind:'walker',x:7280,y:450,left:7180,right:7350},
      {kind:'alien',x:7950,y:255,left:7750,right:8030}]]},
  {id:'doghost_rescue',level:2,kind:'rescue',title:"DOGHOST'S RESCUE",entry:1430,exit:2460,
    intro:'Doghost is trapped above the graves.',objective:'Defeat the two cage guards. Then touch the orb.',payoff:'Doghost is free. You have a friend in the dark! +300',
    marker:{x:1790,y:310},waves:[[
      {kind:'walker',x:1910,y:450,left:1850,right:2040},
      {kind:'alien',x:2250,y:265,left:2110,right:2350}]]},
  {id:'last_ferry',level:4,kind:'ferry',title:'THE LAST FERRY',entry:7000,exit:7600,
    intro:'The last crossing is under attack.',objective:'Ride the ferry and clear both ambush waves.',payoff:'Crossing secured. The way to Kilina is open! +400 · Shield',
    marker:{x:7120,y:305},waves:[[
      {kind:'walker',x:7120,y:320,left:7020,right:7190},
      {kind:'alien',x:7350,y:250,left:7250,right:7430}],
      [{kind:'dasher',x:7870,y:470,left:7790,right:7950}]]}
];
export const encountersForLevel=(level:number)=>ROUTE_ENCOUNTERS.filter(plan=>plan.level===level);
export const isEncounterId=(id:unknown):id is EncounterId=>typeof id==='string'&&(ENCOUNTER_IDS as readonly string[]).includes(id);
