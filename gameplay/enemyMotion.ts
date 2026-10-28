/** Shared art contract: eight locomotion, four attack, four defeat poses. */
export type GroundFoe = 'walker'|'alien'|'dasher'|'giant'|'spider'|'ghost'|'terror'|'cosmic'|'tagger'|'bellkeeper'|'boiler'|'mantis'|'mimic';
export const ENEMY_MOTION = {
  ...Object.fromEntries(['tagger','bellkeeper','boiler','mantis','mimic'].map(asset=>[asset,{asset,width:256,height:256,feet:.94,facesRight:false,fps:12}])) as Record<'tagger'|'bellkeeper'|'boiler'|'mantis'|'mimic',{asset:string;width:number;height:number;feet:number;facesRight:boolean;fps:number}>,
  walker:{asset:'grunt',width:272,height:362,feet:.78,facesRight:false,fps:12},
  alien:{asset:'alien',width:140,height:140,feet:.95,facesRight:false,fps:10},
  dasher:{asset:'dasher',width:140,height:140,feet:.93,facesRight:false,fps:16},
  giant:{asset:'giant',width:180,height:210,feet:.97,facesRight:false,fps:8},
  spider:{asset:'spider',width:256,height:256,feet:480/512,facesRight:false,fps:14},
  ghost:{asset:'ghost',width:256,height:256,feet:480/512,facesRight:false,fps:8},
  terror:{asset:'terror',width:256,height:256,feet:480/512,facesRight:false,fps:9},
  cosmic:{asset:'cosmic',width:256,height:256,feet:480/512,facesRight:false,fps:11},
} as const;
export const GRUNT_THEMES:Record<number,{name:string;tint:number;glow:number}>={
  1:{name:'Rooftop Punk',tint:0xffffff,glow:0xffde79},
  2:{name:'Grave Thrall',tint:0xa8d3b4,glow:0xb4f4d2},
  3:{name:'Ash Grunt',tint:0xffbc77,glow:0xff712f},
  4:{name:'Briar Grunt',tint:0x9bca79,glow:0xb3ef6d},
  6:{name:'Void Grunt',tint:0xc5a0ff,glow:0xba8fff},
};
export const ENEMY_DEATH_MS=700;
export const foeFolder=(kind:GroundFoe)=>['tagger','bellkeeper','boiler','mantis','mimic'].includes(kind)?'level-v3':'motion-v2';
export const foeAsset=(kind:GroundFoe,level:number)=>kind==='walker'&&level!==1?`grunt-${level}`:ENEMY_MOTION[kind].asset;
export const foeTexture=(kind:GroundFoe)=>`foe_${kind}`;
export const foeWalk=(kind:GroundFoe)=>`foe_${kind}_walk`;
export function attackPose(elapsed:number,duration:number){return String(8+Math.min(3,Math.floor(Math.max(0,elapsed)/duration*4)));}
export function defeatPose(elapsed:number){return {frame:String(12+Math.min(3,Math.floor(elapsed/ENEMY_DEATH_MS*4))),alpha:elapsed<520?1:Math.max(0,1-(elapsed-520)/180)};}
