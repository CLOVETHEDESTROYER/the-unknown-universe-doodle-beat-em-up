import {kaiPosterPath} from './kaiWorkshopArt';
import type {Wallet} from './levelRewards';
import {SHOP_ITEMS,isSupply,type ShopItemId,type SupplyId} from './shopCatalog';
import {COLLECTIBLE_CARDS,isCardId,type CardId} from './collectibleCards';

export const RARITIES = ['common','rare','epic','legendary'] as const;
export type Rarity = typeof RARITIES[number];
export type CrateId = 'normal'|'legendary';
export const CRATES = {
  normal:{name:'Normal Crate',price:125,description:'Oak, iron, and a little mystery.',weights:{common:60,rare:28,epic:10,legendary:2}},
  legendary:{name:'Legendary Crate',price:400,description:'Forged in metal. Studded with gems. Epic or better.',weights:{common:0,rare:0,epic:75,legendary:25}},
} as const;
export interface LootReward {kind:'item'|'card';id:ShopItemId|CardId;name:string;value:number;rarity:Rarity;description:string}
export interface CrateReveal {receipt:string;crate:CrateId;reward:LootReward;openedAt:number}
export const rarityForValue=(value:number):Rarity=>value<=200?'common':value<=400?'rare':value<=650?'epic':'legendary';
export const LOOT:LootReward[] = [
  ...SHOP_ITEMS.map(item=>({kind:'item' as const,id:item.id,name:item.name,value:item.price,rarity:rarityForValue(item.price),description:item.description})),
  ...COLLECTIBLE_CARDS.map(card=>({kind:'card' as const,id:card.id,name:card.name,value:card.value,rarity:rarityForValue(card.value),description:card.description})),
];

/** Owned permanent rewards leave the pool. Consumables remain useful and can repeat. */
export function lootPool(wallet:Wallet,crate:CrateId){
  return LOOT.filter(reward=>CRATES[crate].weights[reward.rarity]>0&&(reward.kind==='card'
    ?!wallet.cards.includes(reward.id as CardId)
    :isSupply(reward.id)?(wallet.inventory[reward.id]??0)<999:!wallet.owned.includes(reward.id as ShopItemId)));
}
export function lootOdds(wallet:Wallet,crate:CrateId){
  const pool=lootPool(wallet,crate);
  const total=RARITIES.reduce((sum,rarity)=>sum+(pool.some(reward=>reward.rarity===rarity)?CRATES[crate].weights[rarity]:0),0);
  return RARITIES.map(rarity=>{
    const count=pool.filter(reward=>reward.rarity===rarity).length;
    const chance=count&&total?CRATES[crate].weights[rarity]/total:0;
    return {rarity,count,chance,each:count?chance/count:0};
  });
}
export function crateBlock(wallet:Wallet,crate:CrateId):string|null {
  if(wallet.crateReveal)return 'Collect your current reward first.';
  if(wallet.gold<CRATES[crate].price)return `You need ${CRATES[crate].price-wallet.gold} more Gold.`;
  return lootPool(wallet,crate).length?null:'You have collected every available reward in this crate.';
}
const randomUnit=()=>crypto.getRandomValues(new Uint32Array(1))[0]/0x100000000;

/** Charge, grant, and recovery receipt are saved together before the opening animation. */
export function openWorkshopCrate(wallet:Wallet,crate:CrateId,random:()=>number=randomUnit):Wallet {
  if(!Object.hasOwn(CRATES,crate))throw Error('Unknown crate.');
  const blocked=crateBlock(wallet,crate);if(blocked)throw Error(blocked);
  const pool=lootPool(wallet,crate),odds=lootOdds(wallet,crate);
  const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Could not roll a reward. Please try again.');
  let threshold=0;
  const tier=odds.find(entry=>{threshold+=entry.chance;return roll<threshold;})??odds.filter(entry=>entry.count).at(-1)!;
  const candidates=pool.filter(reward=>reward.rarity===tier.rarity);
  const choice=random();if(!Number.isFinite(choice)||choice<0||choice>=1)throw Error('Could not roll a reward. Please try again.');
  const reward=candidates[Math.floor(choice*candidates.length)];
  const next:Wallet={...wallet,gold:wallet.gold-CRATES[crate].price,cratesOpened:Math.min(1e9,wallet.cratesOpened+1),
    crateReveal:{receipt:crypto.randomUUID(),crate,reward,openedAt:Date.now()}};
  if(reward.kind==='card')next.cards=[...wallet.cards,reward.id as CardId];
  else if(isSupply(reward.id))next.inventory={...wallet.inventory,[reward.id]:(wallet.inventory[reward.id]??0)+1};
  else next.owned=[...wallet.owned,reward.id as ShopItemId];
  return next;
}
export function collectCrateReward(wallet:Wallet,receipt:string):Wallet {
  if(wallet.crateReveal?.receipt!==receipt)throw Error('This reward has already been collected.');
  return {...wallet,crateReveal:null};
}

/** Optional extension fields never invalidate an existing wallet or campaign save. */
export function restoreCrateCollection(raw:Record<string,unknown>){
  const inventory:Partial<Record<SupplyId,number>>={};
  if(raw.inventory&&typeof raw.inventory==='object')for(const [id,count] of Object.entries(raw.inventory)){
    if(isSupply(id)&&Number.isSafeInteger(count)&&Number(count)>0&&Number(count)<=999)inventory[id]=Number(count);
  }
  const cards:CardId[]=Array.isArray(raw.cards)?[...new Set(raw.cards.filter(isCardId))]:[];
  let crateReveal:CrateReveal|null=null;
  const opening=raw.crateReveal as CrateReveal|undefined;
  if(opening&&typeof opening==='object'&&typeof opening.receipt==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(opening.receipt)
    &&(opening.crate==='normal'||opening.crate==='legendary')&&Number.isSafeInteger(opening.openedAt)&&opening.openedAt>0){
    const reward=LOOT.find(entry=>entry.id===opening.reward?.id&&entry.kind===opening.reward?.kind);
    // Receipts only restore the presentation. They never grant an item a second time.
    if(reward&&(reward.kind==='card'?cards.includes(reward.id as CardId):isSupply(reward.id)?Boolean(inventory[reward.id])
      :Array.isArray(raw.owned)&&raw.owned.includes(reward.id)))crateReveal={receipt:opening.receipt,crate:opening.crate,reward,openedAt:opening.openedAt};
  }
  return {inventory,cards,crateReveal,cratesOpened:Number.isSafeInteger(raw.cratesOpened)&&Number(raw.cratesOpened)>=0&&Number(raw.cratesOpened)<=1e9?Number(raw.cratesOpened):0};
}

const legacyArt:Partial<Record<ShopItemId,string>>={
  'blaster-kit':'blaster','sword-kit':'sword','storm-kit':'storm','rapid-kit':'rapid','fan-kit':'fan','homing-kit':'homing',
  'heart-kit':'heart','dinio-orb':'dinio','doghost-orb':'doghost','teleport-orb':'teleportation-c','gravity-kit':'gravity','kai-arm-kit':'kai-arm',
};
export function lootItemArt(id:ShopItemId){
  return legacyArt[id]?`/workshop/v1/${legacyArt[id]}-poster.webp`:kaiPosterPath(id);
}
