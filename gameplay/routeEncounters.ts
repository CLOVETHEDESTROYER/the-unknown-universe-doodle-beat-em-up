import type { GroundFoe } from './enemyMotion';

export const ENCOUNTER_IDS = [
  'rooftop_runout',
  'doghost_rescue',
  'last_ferry',
  'rapid_demo',
  'rooftop_crossfire',
  'rooftop_gauntlet',
  'dragon_approach',
  'lockwing_gate',
  'graveyard_ambush',
  'crypt_courtyard',
  'catacomb_crossfire',
  'furnace_foundry_hold',
  'smelter_line',
  'slag_overpass',
  'witchwood_crossfire',
  'ruined_courtyard',
  'moonthorn_ambush',
  'dread_citadel_hold',
  'outer_breach',
  'mimic_armory'
] as const;
export type EncounterId = typeof ENCOUNTER_IDS[number];
export interface EncounterEnemy {kind: GroundFoe | 'lockwing'; x:number; y:number; left:number; right:number}
export interface RouteEncounterPlan {
  id:EncounterId; level:number; kind:'escape'|'rescue'|'ferry'|'combat'|'gate'; title:string;
  hold?:boolean;
  entry:number; exit:number; intro:string; objective:string; payoff:string;
  waves:EncounterEnemy[][]; marker:{x:number;y:number};
  gate?: {x:number;floor:number};
}
export const ROUTE_ENCOUNTERS:RouteEncounterPlan[] = [
  {id:'lockwing_gate',level:1,kind:'gate',title:'LOCKWING',entry:1180,exit:1350,
    intro:'Lockwing shut the gate!',objective:'Dodge the upper and lower bolts. Strike when Lockwing comes down.',payoff:'Gate open! +300',
    marker:{x:1265,y:270},gate:{x:1350,floor:480},
    waves:[[{kind:'lockwing',x:1265,y:418,left:1265,right:1265}]]},
  {id:'rooftop_runout',level:1,kind:'escape',title:'ROOFTOP RUNOUT',entry:10060,exit:11260,
    intro:'The old roof is giving way!',objective:'Keep moving. Jump the gaps before the roof falls.',payoff:'Back on solid ground! +300 · Health +20',
    marker:{x:10150,y:330},waves:[[
      {kind:'walker',x:10280,y:450,left:10180,right:10350},
      {kind:'alien',x:10950,y:255,left:10750,right:11030}]]},
  {id:'doghost_rescue',level:2,kind:'rescue',title:"DOGHOST'S RESCUE",entry:1980,exit:3120,
    intro:'Doghost is trapped in the crypt yard!',objective:'Clear the cage guards and free Doghost.',payoff:'Doghost is free. You have a friend in the dark! +300',
    marker:{x:2480,y:310},waves:[[
      {kind:'walker',x:2640,y:450,left:2520,right:2860},
      {kind:'alien',x:2920,y:265,left:2780,right:3060}]]},
  {id:'last_ferry',level:4,kind:'ferry',title:'THE LAST FERRY',entry:9680,exit:10280,
    intro:'The last crossing is under attack.',objective:'Ride the ferry and clear both ambush waves.',payoff:'Crossing secured. The way to Kilina is open! +400 · Shield',
    marker:{x:9800,y:305},waves:[[
      {kind:'walker',x:9800,y:320,left:9700,right:9870},
      {kind:'alien',x:10030,y:250,left:9930,right:10110}],
      [{kind:'dasher',x:10550,y:470,left:10470,right:10630}]]}
];
/** End-relative approach coordinates follow all course insertions automatically. */
export function levelOneCombat(endX:number):RouteEncounterPlan[]{
  return [
    {id:'rapid_demo',level:1,kind:'combat',title:'INK RUSH',entry:1680,exit:2420,
      intro:'Barricade ahead! Blast the ink drums!',objective:'Clear the street squad and perched sniper.',payoff:'SQUAD WIPED! +350',
      marker:{x:1810,y:480},waves:[
        [
          {kind:'walker',x:2010,y:480,left:1840,right:2180},
          {kind:'walker',x:2230,y:480,left:2040,right:2390},
          {kind:'alien',x:2340,y:350,left:2240,right:2500}
        ],
        [
          {kind:'dasher',x:2350,y:480,left:1890,right:2410},
          {kind:'tagger',x:2120,y:480,left:1880,right:2320}
        ]
      ]},
    {id:'rooftop_crossfire',level:1,kind:'combat',hold:true,title:'ROOFTOP STRONGPOINT',entry:2740,exit:3540,
      intro:'AMBUSH! Hold the rooftop!',objective:'Use cover, chain the barrels, and wipe out all 3 waves.',payoff:'STRONGPOINT CLEAR! +500 · Health +20',
      marker:{x:2880,y:480},waves:[
        [
          {kind:'walker',x:3080,y:480,left:2820,right:3460},
          {kind:'alien',x:2990,y:382,left:2880,right:3100},
          {kind:'dasher',x:3360,y:480,left:2860,right:3500}
        ],
        [
          {kind:'bumper',x:3350,y:480,left:2860,right:3490},
          {kind:'walker',x:2920,y:480,left:2800,right:3360},
          {kind:'alien',x:3270,y:480,left:2940,right:3500}
        ],
        [
          {kind:'giant',x:3300,y:480,left:2860,right:3490},
          {kind:'dasher',x:2910,y:480,left:2800,right:3420}
        ]
      ]},
    {id:'rooftop_gauntlet',level:1,kind:'combat',hold:true,title:'SCRAP BUNKER',entry:8120,exit:8960,
      intro:'Enemy bunker blocking the mid-roof!',objective:'Shatter the barricade and break the squad line.',payoff:'BUNKER BREACHED! +450 · Health +20',
      marker:{x:8280,y:480},waves:[
        [
          {kind:'walker',x:8440,y:480,left:8180,right:8880},
          {kind:'alien',x:8580,y:345,left:8460,right:8710},
          {kind:'tagger',x:8820,y:480,left:8360,right:8920}
        ],
        [
          {kind:'giant',x:8790,y:480,left:8280,right:8920},
          {kind:'dasher',x:8360,y:480,left:8160,right:8860},
          {kind:'bumper',x:8620,y:480,left:8260,right:8900}
        ]
      ]},
    {id:'dragon_approach',level:1,kind:'combat',hold:true,title:'FINAL LINE',entry:endX-1460,exit:endX-960,
      intro:'Heavy garrison before the Dark Dragon!',objective:'Crush the bunker squad to storm the boss yard.',payoff:'BOSS YARD OPEN! +500 · Health +20',
      marker:{x:endX-1370,y:480},waves:[
        [
          {kind:'walker',x:endX-1280,y:480,left:endX-1410,right:endX-1010},
          {kind:'dasher',x:endX-1080,y:480,left:endX-1360,right:endX-990},
          {kind:'alien',x:endX-1180,y:480,left:endX-1340,right:endX-1000}
        ],
        [
          {kind:'giant',x:endX-1130,y:480,left:endX-1390,right:endX-990},
          {kind:'dasher',x:endX-1320,y:480,left:endX-1420,right:endX-1010},
          {kind:'tagger',x:endX-1030,y:480,left:endX-1320,right:endX-980}
        ]
      ]}
  ];
}

export function campaignStrongpoints(level:number,endX:number):RouteEncounterPlan[]{
  if(level===1)return levelOneCombat(endX);
  if(level===2){
    return [
      {id:'crypt_courtyard',level:2,kind:'combat',hold:true,title:'CRYPT COURTYARD',entry:3620,exit:4460,
        intro:'Undead garrison on the raised crypt terrace!',objective:'Chain the barrels and topple the watchtower.',payoff:'TERRACE CLEAR! +450 · Health +20',
        marker:{x:3820,y:436},waves:[
          [
            {kind:'walker',x:3960,y:436,left:3680,right:4380},
            {kind:'bellkeeper',x:4240,y:436,left:3860,right:4420},
            {kind:'alien',x:3820,y:344,left:3700,right:3920}
          ],
          [
            {kind:'dasher',x:4320,y:436,left:3720,right:4420},
            {kind:'giant',x:4120,y:436,left:3740,right:4400}
          ]
        ]},
      {id:'catacomb_crossfire',level:2,kind:'combat',hold:true,title:'CATACOMB CROSSFIRE',entry:7660,exit:8520,
        intro:'Bellkeeper squad locking down the bridge approach!',objective:'Shatter the crypt bunker line.',payoff:'BRIDGE APPROACH OPEN! +450 · Health +20',
        marker:{x:7860,y:480},waves:[
          [
            {kind:'bellkeeper',x:8060,y:480,left:7720,right:8440},
            {kind:'walker',x:8320,y:480,left:7760,right:8460},
            {kind:'alien',x:8060,y:340,left:7940,right:8180}
          ],
          [
            {kind:'giant',x:8340,y:480,left:7760,right:8460},
            {kind:'dasher',x:7940,y:480,left:7700,right:8420},
            {kind:'bellkeeper',x:8200,y:480,left:7760,right:8460}
          ]
        ]},
      {id:'graveyard_ambush',level:2,kind:'combat',hold:true,title:'MAUSOLEUM AMBUSH',entry:endX-1480,exit:endX-980,
        intro:'Undead ambush before the crypt!',objective:'Clear both waves to open the mausoleum yard.',payoff:'CRYPT PATH CLEAR! +450 · Health +20',
        marker:{x:endX-1360,y:480},waves:[
          [
            {kind:'walker',x:endX-1290,y:480,left:endX-1430,right:endX-1010},
            {kind:'bellkeeper',x:endX-1110,y:480,left:endX-1360,right:endX-1000},
            {kind:'dasher',x:endX-1020,y:480,left:endX-1380,right:endX-990}
          ],
          [
            {kind:'giant',x:endX-1160,y:480,left:endX-1400,right:endX-1000},
            {kind:'alien',x:endX-1280,y:480,left:endX-1420,right:endX-1020},
            {kind:'bellkeeper',x:endX-1040,y:480,left:endX-1330,right:endX-990}
          ]
        ]}
    ];
  }
  if(level===3){
    return [
      {id:'smelter_line',level:3,kind:'combat',hold:true,title:'SMELTER LINE',entry:1860,exit:2740,
        intro:'Boiler crew holding the raised smelter deck!',objective:'Blast the barrels and drop the watchtower.',payoff:'SMELTER CLEAR! +450 · Health +20',
        marker:{x:2040,y:472},waves:[
          [
            {kind:'boiler',x:2240,y:472,left:1920,right:2680},
            {kind:'walker',x:2520,y:472,left:1960,right:2700},
            {kind:'alien',x:2200,y:340,left:2040,right:2360}
          ],
          [
            {kind:'giant',x:2560,y:472,left:1960,right:2700},
            {kind:'dasher',x:2080,y:472,left:1900,right:2660}
          ]
        ]},
      {id:'slag_overpass',level:3,kind:'combat',hold:true,title:'SLAG OVERPASS',entry:5440,exit:6260,
        intro:'Heavy furnace unit blocking the overpass!',objective:'Crush the squad to reach the lava drawbridge.',payoff:'OVERPASS SECURED! +450 · Health +20',
        marker:{x:5640,y:520},waves:[
          [
            {kind:'boiler',x:5860,y:520,left:5500,right:6200},
            {kind:'dasher',x:6100,y:520,left:5520,right:6220},
            {kind:'alien',x:5820,y:330,left:5640,right:5980}
          ],
          [
            {kind:'giant',x:6040,y:520,left:5540,right:6200},
            {kind:'boiler',x:5680,y:520,left:5480,right:6160}
          ]
        ]},
      {id:'furnace_foundry_hold',level:3,kind:'combat',hold:true,title:'FOUNDRY GAUNTLET',entry:endX-1480,exit:endX-980,
        intro:'Foundry lock-in! Cinder squad incoming!',objective:'Survive the mortar barrage and breach the furnace gate.',payoff:'FOUNDRY BREACHED! +450 · Health +20',
        marker:{x:endX-1360,y:520},waves:[
          [
            {kind:'boiler',x:endX-1140,y:520,left:endX-1380,right:endX-1000},
            {kind:'dasher',x:endX-1280,y:520,left:endX-1420,right:endX-1010},
            {kind:'walker',x:endX-1040,y:520,left:endX-1350,right:endX-990}
          ],
          [
            {kind:'giant',x:endX-1180,y:520,left:endX-1400,right:endX-1000},
            {kind:'boiler',x:endX-1030,y:520,left:endX-1340,right:endX-990},
            {kind:'alien',x:endX-1300,y:520,left:endX-1420,right:endX-1040}
          ]
        ]}
    ];
  }
  if(level===4){
    return [
      {id:'ruined_courtyard',level:4,kind:'combat',hold:true,title:'RUINED COURTYARD',entry:3620,exit:4440,
        intro:'Mantis raiders holding the mossy plateau!',objective:'Break the watchtower and chain the barrels.',payoff:'PLATEAU SECURED! +450 · Health +20',
        marker:{x:3820,y:472},waves:[
          [
            {kind:'mantis',x:3960,y:472,left:3660,right:4380},
            {kind:'walker',x:4200,y:472,left:3720,right:4400},
            {kind:'alien',x:3800,y:344,left:3690,right:3920}
          ],
          [
            {kind:'giant',x:4240,y:472,left:3720,right:4400},
            {kind:'dasher',x:3860,y:472,left:3660,right:4380}
          ]
        ]},
      {id:'moonthorn_ambush',level:4,kind:'combat',hold:true,title:'MOONTHORN AMBUSH',entry:6860,exit:7720,
        intro:'Kilina’s vanguard sealing the thorn gate!',objective:'Clear both ambush waves to breach the gate.',payoff:'THORN GATE OPEN! +450 · Health +20',
        marker:{x:7060,y:520},waves:[
          [
            {kind:'mantis',x:7260,y:520,left:6920,right:7660},
            {kind:'dasher',x:7520,y:520,left:6960,right:7680},
            {kind:'alien',x:7260,y:375,left:7140,right:7390}
          ],
          [
            {kind:'giant',x:7500,y:520,left:6980,right:7680},
            {kind:'mantis',x:7120,y:520,left:6900,right:7620}
          ]
        ]},
      {id:'witchwood_crossfire',level:4,kind:'combat',hold:true,title:'THORN STRONGHOLD',entry:endX-1480,exit:endX-980,
        intro:'Kilina’s guard springs an ambush!',objective:'Cut through the Witchwood garrison.',payoff:'SANCTUARY OPEN! +450 · Health +20',
        marker:{x:endX-1360,y:520},waves:[
          [
            {kind:'mantis',x:endX-1150,y:520,left:endX-1390,right:endX-1000},
            {kind:'dasher',x:endX-1290,y:520,left:endX-1420,right:endX-1020},
            {kind:'walker',x:endX-1040,y:520,left:endX-1340,right:endX-990}
          ],
          [
            {kind:'giant',x:endX-1160,y:520,left:endX-1400,right:endX-1000},
            {kind:'mantis',x:endX-1030,y:520,left:endX-1320,right:endX-990},
            {kind:'alien',x:endX-1290,y:520,left:endX-1420,right:endX-1030}
          ]
        ]}
    ];
  }
  if(level===6){
    return [
      {id:'outer_breach',level:6,kind:'combat',hold:true,title:'OUTER BREACH',entry:1860,exit:2740,
        intro:'Void vanguard holding the obsidian terrace!',objective:'Topple the watchtower and break the outer line.',payoff:'OUTER LINE BROKEN! +500 · Health +20',
        marker:{x:2040,y:468},waves:[
          [
            {kind:'mimic',x:2240,y:468,left:1920,right:2680},
            {kind:'walker',x:2520,y:468,left:1960,right:2700},
            {kind:'alien',x:2200,y:332,left:2040,right:2360}
          ],
          [
            {kind:'giant',x:2560,y:468,left:1960,right:2700},
            {kind:'dasher',x:2080,y:468,left:1900,right:2660}
          ]
        ]},
      {id:'mimic_armory',level:6,kind:'combat',hold:true,title:'MIMIC ARMORY',entry:5520,exit:6380,
        intro:'Mimic strike team sealing the inner armory!',objective:'Clear both waves to breach the citadel.',payoff:'ARMORY CLEARED! +500 · Health +20',
        marker:{x:5720,y:520},waves:[
          [
            {kind:'mimic',x:5940,y:520,left:5580,right:6320},
            {kind:'dasher',x:6200,y:520,left:5620,right:6340},
            {kind:'alien',x:5900,y:320,left:5740,right:6080}
          ],
          [
            {kind:'giant',x:6140,y:520,left:5620,right:6320},
            {kind:'mimic',x:5760,y:520,left:5560,right:6280}
          ]
        ]},
      {id:'dread_citadel_hold',level:6,kind:'combat',hold:true,title:'DREAD CITADEL LINE',entry:endX-1480,exit:endX-980,
        intro:'FINAL GARRISON! All void units deployed!',objective:'Break all 3 waves to face the Void Regent.',payoff:'CITADEL BREACHED! +600 · Health +25',
        marker:{x:endX-1360,y:520},waves:[
          [
            {kind:'mimic',x:endX-1150,y:520,left:endX-1390,right:endX-1000},
            {kind:'dasher',x:endX-1290,y:520,left:endX-1420,right:endX-1010},
            {kind:'walker',x:endX-1030,y:520,left:endX-1340,right:endX-990}
          ],
          [
            {kind:'giant',x:endX-1180,y:520,left:endX-1400,right:endX-1000},
            {kind:'mimic',x:endX-1040,y:520,left:endX-1320,right:endX-990},
            {kind:'alien',x:endX-1300,y:520,left:endX-1420,right:endX-1040}
          ],
          [
            {kind:'giant',x:endX-1260,y:520,left:endX-1410,right:endX-1000},
            {kind:'dasher',x:endX-1060,y:520,left:endX-1350,right:endX-990},
            {kind:'mimic',x:endX-1160,y:520,left:endX-1380,right:endX-1010}
          ]
        ]}
    ];
  }
  return [];
}

export const encountersForLevel=(level:number,endX?:number)=>[
  ...ROUTE_ENCOUNTERS.filter(plan=>plan.level===level),
  ...(endX!==undefined?campaignStrongpoints(level,endX):[])
];
export const isEncounterId=(id:unknown):id is EncounterId=>typeof id==='string'&&(ENCOUNTER_IDS as readonly string[]).includes(id);
