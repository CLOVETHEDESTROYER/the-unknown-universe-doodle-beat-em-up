import {isGunUpgrade} from './gunUpgrades';
import type {GunUpgradeId} from './gunUpgrades';
export type PowerupId = 'hands' | 'blaster' | 'sword' | 'frost' | 'ember' | 'storm';
export type EquippedPowerup = Exclude<PowerupId, 'hands'>;
export interface PowerupLoadout { active: PowerupId; hits: number; unlocked: EquippedPowerup[];gunUpgrade?:GunUpgradeId }
export const POWERUP_HITS = 3;
export const POWERUPS: Record<PowerupId, {name:string;level:number;color:number;hint:string;icon:string;cooldown:number}> = {
  hands:{name:'Fists',level:1,color:0xffedc1,hint:'Space / C: punch',icon:'',cooldown:360},
  blaster:{name:'Ink Blaster',level:1,color:0xc9ef83,hint:'Hold Space / C: fire',icon:'characters/xgod/ink-marker-blaster-v1.png',cooldown:230},
  sword:{name:'Flame Sword',level:1,color:0xffc077,hint:'Space / C: fire blade',icon:'xgod_sword_reward_fit.png',cooldown:440},
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
    ...(active==='blaster'&&isGunUpgrade(saved.gunUpgrade)?{gunUpgrade:saved.gunUpgrade}:{}),
    unlocked:[...new Set((saved.unlocked??[]).filter(id=>isPowerup(id)&&String(id)!=='hands'))]};
}
export function equipPowerup(s:PowerupLoadout,id:EquippedPowerup,level:number):PowerupLoadout {
  if(POWERUPS[id].level>level)return s;
  return {active:id,hits:POWERUP_HITS,unlocked:[...new Set([...s.unlocked,id])],...(id==='blaster'&&s.active==='blaster'&&isGunUpgrade(s.gunUpgrade)?{gunUpgrade:s.gunUpgrade}:{})};
}
export function hitPowerup(s:PowerupLoadout,fatal=false):PowerupLoadout {
  if(s.active==='hands')return s;
  const hits=fatal?0:Math.max(0,s.hits-1);
  const {gunUpgrade,...base}=s;
  return {...base,active:hits===0?'hands':s.active,hits,...(hits>0&&s.active==='blaster'&&isGunUpgrade(gunUpgrade)?{gunUpgrade}:{})};
}
export function upgradeGun(s:PowerupLoadout,mode:GunUpgradeId):PowerupLoadout{
  return s.active==='blaster'&&isGunUpgrade(mode)?{...s,gunUpgrade:mode}:s;
}
const LEVEL_SPECIAL:Partial<Record<number,EquippedPowerup>>={2:'frost',3:'ember',4:'storm',6:'storm'};
export function levelPowerupPool(level:number):EquippedPowerup[] {
  const special=LEVEL_SPECIAL[level];
  return special ? ['blaster',special] : level===1 ? ['blaster'] : [];
}
export interface PowerupRoute {platforms:{x:number;y:number;w:number;h:number}[];hazards:{x:number;y:number;w:number;h:number}[];checkpoints:{x:number;y:number}[];spawn:{x:number;y:number};endX:number}
export function powerupRoute(level:number,route:PowerupRoute){
  const pool=levelPowerupPool(level);
  if(!pool.length)return [];
  const length=route.endX-route.spawn.x;
  const anchors=[route.spawn.x+180,route.endX-1150];
  if(pool.length>1)anchors.splice(1,0,route.spawn.x+length*.38);
  return routePickupPoints(route,anchors).map((p,i)=>({...p,kind:pool[i]??pool[0]}));
}
export function routePickupPoints(route:PowerupRoute,anchors:number[],avoid:{x:number}[]=[]){
  const used=[...avoid],points:{x:number;y:number}[]=[];
  for(const anchor of anchors){
    const point=route.platforms.filter(p=>p.h>=40&&p.w>=140)
      .map(p=>({x:Math.max(p.x+64,Math.min(p.x+p.w-64,anchor)),y:p.y-62}))
      .filter(p=>p.x>route.spawn.x+80&&p.x<route.endX-400&&!used.some(q=>Math.abs(q.x-p.x)<240)
        &&!route.hazards.some(h=>p.x>h.x-65&&p.x<h.x+h.w+65&&Math.abs(p.y+62-h.y)<95))
      .sort((a,b)=>Math.abs(a.x-anchor)-Math.abs(b.x-anchor))[0];
    if(point){points.push(point);used.push(point);}
  }
  return points;
}
export function gunUpgradeRoute(route:PowerupRoute,avoid:{x:number}[]){
  const length=route.endX-route.spawn.x;
  return routePickupPoints(route,[.2,.58,.78].map(t=>route.spawn.x+length*t),avoid)
    .map((p,i)=>({...p,mode:(['rapid','fan','homing'] as GunUpgradeId[])[i]}));
}
