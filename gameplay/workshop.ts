import type {Wallet} from './levelRewards';
import {SHOP_ITEMS,isSupply,type ShopItemId,type CosmeticLoadout} from './shopCatalog';
import {equipPowerup,POWERUP_HITS,restoreLoadout} from './powerups';

export function purchaseBlock(wallet:Wallet,id:ShopItemId):string|null{
  const item=SHOP_ITEMS.find(i=>i.id===id)!;
  if(isSupply(id)){
    const p=wallet.pending,s=p?.campaign.stats;
    if(!s||p?.stage!=='shop'||s.isVictory)return 'Supplies are available between levels.';
    if(p.purchases?.includes(id))return 'Already bought on this visit.';
    if(s.selectedCharacterId==='zgod')return 'Z-God already has invincibility and unlimited lives.';
    if(id==='life'&&s.lives>=s.maxLives)return 'Your lives are already full.';
    if(id!=='life'&&s.level===5)return 'Ground supplies return after Starbreak.';
    if(id==='shield'&&s.inkShieldReady)return 'You already have an Ink Shield.';
    if(id==='frost-kit'||id==='ember-kit'){
      if(s.level<3)return 'Available after the Graveyard.';
      if(s.selectedCharacterId==='turkey_king')return 'The Turkey King uses his royal weapons.';
      if(p.purchases?.some(bought=>bought==='repair'||bought==='frost-kit'||bought==='ember-kit'))return 'You already tuned or replaced your weapon this visit.';
      const active=id==='frost-kit'?'frost':'ember';
      if(s.equipment?.active===active&&s.equipment.hits===POWERUP_HITS)return 'This power-up is already at full durability.';
    }
    if(id==='repair'){
      if(p.purchases?.some(bought=>bought==='frost-kit'||bought==='ember-kit'))return 'Your new power-up is already at full durability.';
      if(s.selectedCharacterId==='turkey_king')return 'The royal weapons do not need repairs.';
      const loadout=restoreLoadout(s.equipment,'hands');
      if(loadout.active==='hands')return 'Find a weapon before buying a tune-up.';
      if(loadout.hits>=3)return 'Your equipped weapon is already fully repaired.';
    }
  }else if(wallet.owned.includes(id))return 'Already owned.';
  return wallet.gold<item.price?'Not enough Gold.':null;
}

/** The returned wallet contains both the charge and its benefit for one atomic write. */
export function buyShopItem(wallet:Wallet,id:ShopItemId):Wallet{
  const blocked=purchaseBlock(wallet,id);if(blocked)throw Error(blocked);
  const item=SHOP_ITEMS.find(i=>i.id===id)!;
  if(!isSupply(id)){
    const slot=item.type as keyof CosmeticLoadout;
    return {...wallet,gold:wallet.gold-item.price,owned:[...wallet.owned,id],equipped:{...wallet.equipped,[slot]:id}};
  }
  const pending=wallet.pending!,s=pending.campaign.stats;
  const stats={...s};
  if(id==='life')stats.lives=Math.min(s.maxLives,s.lives+1);
  if(id==='shield'){stats.shieldUnlocked=true;stats.inkShieldReady=true;}
  if(id==='frost-kit'||id==='ember-kit'){
    stats.equipment=equipPowerup(restoreLoadout(s.equipment,'hands'),id==='frost-kit'?'frost':'ember',s.level);
    stats.hasFlameSword=false;
    stats.swordDurability=0;
  }
  if(id==='repair'){
    stats.equipment={...restoreLoadout(s.equipment,'hands'),hits:3};
    if(stats.equipment.active==='sword')stats.swordDurability=3;
  }
  return {...wallet,gold:wallet.gold-item.price,pending:{...pending,purchases:[...(pending.purchases??[]),id],campaign:{...pending.campaign,stats}}};
}
export function equipCosmetic(wallet:Wallet,slot:keyof CosmeticLoadout,id:string):Wallet{
  const item=SHOP_ITEMS.find(i=>i.id===id);
  if(id!=='classic'&&(!item||item.type!==slot||!wallet.owned.includes(item.id)))throw Error('Purchase this item before equipping it.');
  return {...wallet,equipped:{...wallet.equipped,[slot]:id}};
}
