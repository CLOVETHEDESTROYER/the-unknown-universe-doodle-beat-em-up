export type PowerupId = 'hands' | 'blaster' | 'sword' | 'frost' | 'ember' | 'storm';
export type EquippedPowerup = Exclude<PowerupId, 'hands'>;
export interface PowerupLoadout { active: PowerupId; hits: number; unlocked: EquippedPowerup[] }
export const POWERUP_HITS = 3;
export const POWERUPS: Record<PowerupId, {name:string;level:number;color:number;hint:string;icon:string;cooldown:number}> = {
  hands:{name:'Fists',level:1,color:0xffedc1,hint:'Space / C: punch',icon:'',cooldown:360},
  blaster:{name:'Ink Blaster',level:1,color:0xc9ef83,hint:'Hold Space / C: fire',icon:'characters/xgod/ink-marker-blaster-v1.png',cooldown:230},
  sword:{name:'Flame Sword',level:1,color:0xffc077,hint:'Space / C: slash',icon:'xgod_sword_reward_fit.png',cooldown:440},
  frost:{name:'Frost Gauntlet',level:2,color:0x8ce5fa,hint:'Hold Space / C: ice shot',icon:'powerups/v1/frost.png',cooldown:470},
  ember:{name:'Ember Boots',level:3,color:0xffa56e,hint:'Space / C: fire dash',icon:'powerups/v1/ember.png',cooldown:1050},
  storm:{name:'Storm Halo',level:4,color:0xdec0ff,hint:'Space / C: shock pulse',icon:'powerups/v1/storm.png',cooldown:850}
};
export const isPowerup = (id:unknown):id is PowerupId => typeof id==='string' && Object.hasOwn(POWERUPS,id);
export function createLoadout(active:PowerupId='blaster'):PowerupLoadout {
  return {active,hits:active==='hands'?0:POWERUP_HITS,unlocked:active==='hands'?[]:[active]};
}
export function restoreLoadout(saved:PowerupLoadout|undefined,fallback:PowerupId):PowerupLoadout {
  if(!saved || !isPowerup(saved.active))return createLoadout(fallback);
  const active=saved.active!=='hands'&&saved.hits<=0?'hands':saved.active;
  return {active,hits:active==='hands'?0:Math.max(1,Math.min(POWERUP_HITS,Math.floor(saved.hits)||POWERUP_HITS)),
    unlocked:[...new Set((saved.unlocked??[]).filter(id=>isPowerup(id)&&String(id)!=='hands'))]};
}
export function equipPowerup(s:PowerupLoadout,id:EquippedPowerup,level:number):PowerupLoadout {
  if(POWERUPS[id].level>level)return s;
  return {active:id,hits:POWERUP_HITS,unlocked:[...new Set([...s.unlocked,id])]};
}
export function hitPowerup(s:PowerupLoadout,fatal=false):PowerupLoadout {
  if(s.active==='hands')return s;
  const hits=fatal?0:Math.max(0,s.hits-1);
  return {...s,active:hits===0?'hands':s.active,hits};
}
export const levelPowerupPool = (level:number):EquippedPowerup[] =>
  (['blaster','sword','frost','ember','storm'] as EquippedPowerup[])
    .filter(id=>POWERUPS[id].level<=level&&(id!=='sword'||level>=2));
export interface PowerupRoute {platforms:{x:number;y:number;w:number;h:number}[];hazards:{x:number;y:number;w:number;h:number}[];checkpoints:{x:number;y:number}[];spawn:{x:number;y:number};endX:number}
export function powerupRoute(level:number,route:PowerupRoute){
  const pool=levelPowerupPool(level),first=level===2?'frost':level===3?'ember':level>=4?'storm':'blaster';
  const anchors=[route.spawn.x+160,...route.checkpoints.map(p=>p.x+170),route.endX-1150];
  return anchors.flatMap((anchor,index)=>{
    const choices=route.platforms.filter(p=>p.h>=40&&p.w>=140&&p.x+p.w>anchor-220&&p.x<anchor+450)
      .map(p=>({x:Math.max(p.x+64,Math.min(p.x+p.w-64,anchor)),y:p.y-62}))
      .filter(p=>!route.hazards.some(h=>p.x>h.x-65&&p.x<h.x+h.w+65&&Math.abs(p.y+62-h.y)<95))
      .sort((a,b)=>Math.abs(a.x-anchor)-Math.abs(b.x-anchor));
    const point=choices[0];
    if(!point)return [];
    return [{...point,kind:(index===0?first:pool[(index-1)%pool.length]) as EquippedPowerup}];
  }).filter((p,i,all)=>all.findIndex(q=>Math.abs(q.x-p.x)<220)===i);
}
