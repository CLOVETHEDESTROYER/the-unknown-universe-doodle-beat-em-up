import type { GroundFoe } from './enemyMotion';

export const ENCOUNTER_IDS = ['rooftop_runout','doghost_rescue','last_ferry','rapid_demo','rooftop_crossfire','dragon_approach'] as const;
export type EncounterId = typeof ENCOUNTER_IDS[number];
export interface EncounterEnemy {kind: GroundFoe; x:number; y:number; left:number; right:number}
export interface RouteEncounterPlan {
  id:EncounterId; level:number; kind:'escape'|'rescue'|'ferry'|'combat'; title:string;
  hold?:boolean;
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
/** End-relative approach coordinates follow all course insertions automatically. */
export function levelOneCombat(endX:number):RouteEncounterPlan[]{
  return [
    {id:'rapid_demo',level:1,kind:'combat',title:'INK RUSH',entry:1080,exit:1650,
      intro:'Try your new firepower.',objective:'Run and fire through the rooftop punks.',payoff:'NICE SHOOTING! +300',
      marker:{x:1160,y:480},waves:[[
        {kind:'walker',x:1370,y:480,left:1290,right:1430},
        {kind:'walker',x:1580,y:480,left:1500,right:1630}]]},
    {id:'rooftop_crossfire',level:1,kind:'combat',hold:true,title:'HOLD THE ROOFTOP',entry:1770,exit:2320,
      intro:'Clear the street before moving on.',objective:'Dodge the shots. Watch the charging punk.',payoff:'ROUTE CLEAR! +300 · Health +20',
      marker:{x:1800,y:480},waves:[
        [{kind:'alien',x:1970,y:480,left:1900,right:2020}],
        [{kind:'dasher',x:2200,y:480,left:2150,right:2270}]]},
    {id:'dragon_approach',level:1,kind:'combat',hold:true,title:'LAST LINE',entry:endX-1420,exit:endX-980,
      intro:'One last patrol guards the boss yard.',objective:'Clear the patrol, then enter the boss yard.',payoff:'BOSS YARD OPEN! +300',
      marker:{x:endX-1370,y:480},waves:[[
        {kind:'walker',x:endX-1260,y:480,left:endX-1320,right:endX-1210},
        {kind:'dasher',x:endX-1070,y:480,left:endX-1130,right:endX-1020}]]}
  ];
}
export const encountersForLevel=(level:number,endX?:number)=>[
  ...ROUTE_ENCOUNTERS.filter(plan=>plan.level===level),
  ...(level===1&&endX!==undefined?levelOneCombat(endX):[])
];
export const isEncounterId=(id:unknown):id is EncounterId=>typeof id==='string'&&(ENCOUNTER_IDS as readonly string[]).includes(id);
