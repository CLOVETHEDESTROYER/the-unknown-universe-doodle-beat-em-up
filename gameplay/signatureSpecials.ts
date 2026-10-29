import type { CharacterId } from '../types';

export const SIGNATURE_SPECIALS = {
  elytron: {name:'Pulse Storm',cooldown:6000,windup:320,duration:1300,color:0xffda39,
    description:'Unleash six traveling electrical pulses toward enemies.'},
  killer_kai: {name:'Thunderfall',cooldown:7000,windup:650,duration:1600,color:0x57dcff,
    description:'Charge in a crouch, punch the ground, and call down three waves of electrical beams.'},
  xgod: {name:'X Breaker',cooldown:5500,windup:230,duration:650,color:0xffa43b,
    description:'Carve a fiery X through enemies and incoming shots.'},
  barrett: {name:'Bearquake',cooldown:6000,windup:260,duration:720,color:0xffc66b,
    description:'Slam the ground to launch and stun nearby enemies.'},
  nico: {name:'Rocket Vault',cooldown:5000,windup:200,duration:650,color:0xc0ea79,
    description:'Blast enemies below and rocket upward and forward.'},
  ezra: {name:'Hellfire Pillar',cooldown:6500,windup:240,duration:680,color:0xff6936,
    description:'Raise a lingering flame column that burns passing enemies.'},
  teleportation_c: {name:'Rift Ambush',cooldown:5500,windup:280,duration:750,color:0xbc82ff,
    description:'Find a safe position behind a nearby enemy and strike.'},
  zgod: {name:'Star Comet',cooldown:6000,windup:240,duration:1050,color:0xffb9e5,
    description:'Ricochet between up to three nearby foes in a starry burst.'},
} satisfies Record<CharacterId,{name:string;cooldown:number;windup:number;duration:number;color:number;description:string}>;

export interface SignatureState {
  startedAt:number;readyAt:number;until:number;impacted:boolean;uses:number;hits:number;
  clearedShots:number;blocked:number;hops:number;invulnerableUntil:number;
}
export const createSignatureState=():SignatureState=>({startedAt:-99999,readyAt:0,until:0,
  impacted:false,uses:0,hits:0,clearedShots:0,blocked:0,hops:0,invulnerableUntil:0});

export function beginSignature(state:SignatureState,hero:CharacterId,now:number){
  if(now<state.readyAt||now<state.until)return false;
  const spec=SIGNATURE_SPECIALS[hero];
  state.startedAt=now;state.readyAt=now+spec.cooldown;state.until=now+spec.duration;
  state.impacted=false;state.uses++;state.hops=0;
  return true;
}

export function signatureFrame(hero:CharacterId,elapsed:number){
  if(hero==='elytron')return elapsed<320?Math.min(2,Math.floor(elapsed/110)):elapsed<1000?3+Math.floor((elapsed-320)/90)%3:elapsed<1150?6:7;
  const spec=SIGNATURE_SPECIALS[hero];
  if(elapsed<spec.windup*.5)return 0;
  if(elapsed<spec.windup)return 1;
  const progress=(elapsed-spec.windup)/(spec.duration-spec.windup);
  return progress<.2?2:progress<.65?3:progress<.88?4:5;
}
