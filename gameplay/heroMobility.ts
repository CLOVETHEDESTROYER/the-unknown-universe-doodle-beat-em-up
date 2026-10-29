import type {CharacterId} from '../types';

export const HERO_MOBILITY = {
  elytron: {name:'Butt Bomb',radius:190,height:135,direct:6,wave:4,stun:500,launch:300,color:0xffda39},
  killer_kai: {name:'Jet Slam',radius:220,height:150,direct:7,wave:5,stun:550,launch:320,color:0x57dcff},
  xgod: {name:'Butt Bomb',radius:180,height:125,direct:6,wave:4,stun:450,launch:280,color:0xffcb69},
  zgod: {name:'Starfall Ground Punch',radius:180,height:125,direct:6,wave:4,stun:450,launch:280,color:0xff8fe0},
  barrett: {name:'Bear Drop',radius:230,height:145,direct:8,wave:5,stun:750,launch:340,color:0xffbb72},
  nico: {name:'Rocket Drop',radius:205,height:150,direct:7,wave:5,stun:450,launch:300,color:0xa8ef62},
  ezra: {name:'Flame Crash',radius:180,height:225,direct:6,wave:5,stun:450,launch:420,color:0xff763b},
  teleportation_c: {name:'Rift Drop',radius:250,height:145,direct:6,wave:3,stun:650,launch:220,color:0xb799ff},
} satisfies Record<CharacterId,{name:string;radius:number;height:number;direct:number;wave:number;stun:number;launch:number;color:number}>;

export const hasNewMobilityArt=(hero:CharacterId)=>hero!=='xgod'&&hero!=='zgod';
