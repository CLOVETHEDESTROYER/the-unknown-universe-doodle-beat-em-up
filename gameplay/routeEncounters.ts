import type { GroundFoe } from './enemyMotion';

export const ENCOUNTER_IDS = ['rooftop_runout','doghost_rescue','last_ferry','lockwing_gate'] as const;
export type EncounterId = typeof ENCOUNTER_IDS[number];
export interface EncounterEnemy {kind: GroundFoe | 'lockwing'; x:number; y:number; left:number; right:number}
export interface RouteEncounterPlan {
  id:EncounterId; level:number; kind:'escape'|'rescue'|'ferry'|'gate'; title:string;
  entry:number; exit:number; intro:string; objective:string; payoff:string;
  waves:EncounterEnemy[][]; marker:{x:number;y:number};
  gate?: {x:number;floor:number};
}
export const ROUTE_ENCOUNTERS:RouteEncounterPlan[] = [
  {id:'lockwing_gate',level:1,kind:'gate',title:'LOCKWING',entry:1160,exit:1470,
    intro:'Lockwing shut the gate!',objective:'Wait for Lockwing to come down, then hit it.',payoff:'Gate open! +300',
    marker:{x:1410,y:300},gate:{x:1470,floor:480},
    waves:[[{kind:'lockwing',x:1410,y:418,left:1410,right:1410}]]},
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
