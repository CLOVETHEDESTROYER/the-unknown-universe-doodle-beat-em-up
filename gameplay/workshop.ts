import type {Wallet} from './levelRewards';
import {SHOP_ITEMS,isSupply,type SupplyId,type CosmeticLoadout} from './shopCatalog';
import {equipPowerup,equipKaiArm,upgradeGun,POWERUP_HITS,restoreLoadout,type EquippedPowerup} from './powerups';

const WEAPON_KITS:Partial<Record<SupplyId,EquippedPowerup>>={
  'blaster-kit':'blaster','sword-kit':'sword','frost-kit':'frost','ember-kit':'ember','storm-kit':'storm',
};
const GUN_KITS={'rapid-kit':'rapid','fan-kit':'fan','homing-kit':'homing'} as const;

export function supplyBlock(wallet:Wallet,id:SupplyId):string|null {
  const pending=wallet.pending,stats=pending?.campaign.stats;
  if(!stats||pending?.stage!=='shop'||stats.isVictory)return 'Save this supply for a workshop visit between levels.';
  if(pending.purchases?.includes(id))return 'Already used on this visit. Save the rest for later.';
  if(stats.selectedCharacterId==='zgod')return 'Z-God already has invincibility and unlimited lives.';
  if(id!=='life'&&id!=='heart-kit'&&(stats.selectedCharacterId==='killer_klause'||stats.selectedCharacterId==='turkey_king'))
    return stats.selectedCharacterId==='killer_klause'?'Killer Klause keeps his present launcher and elf support.':'The Turkey King keeps his royal weapons.';
  if(id==='life'&&stats.lives>=stats.maxLives)return 'Your lives are already full.';
  if(id==='heart-kit'&&stats.health>=stats.maxHealth)return 'Your health is already full.';
  if(id!=='life'&&id!=='heart-kit'&&stats.level===5)return 'Save ground supplies until after Starbreak.';
  if(id==='shield'&&stats.inkShieldReady)return 'You already have an Ink Shield.';
  const loadout=restoreLoadout(stats.equipment,'hands');
  const weapon=WEAPON_KITS[id];
  if(weapon){
    const minLevel=weapon==='sword'?2:weapon==='frost'?2:weapon==='ember'?3:weapon==='storm'?4:1;
    if(stats.level<minLevel)return `Available from level ${minLevel}. Your supply will keep.`;
    if(loadout.active===weapon&&loadout.hits===POWERUP_HITS)return 'This weapon is already at full durability.';
  }
  if(id==='kai-arm-kit'){
    if(stats.selectedCharacterId!=='xgod')return 'Kai’s gift is a weapon for X God.';
    if(stats.level<3&&loadout.blasterVariant!=='kai_arm')return 'Kai’s gift unlocks after the Alley Rescue. Save this kit for a later visit.';
    if(loadout.blasterVariant==='kai_arm'&&loadout.hits===POWERUP_HITS)return 'Your arm cannon is already fully repaired.';
  }
  if(id==='repair'){
    if(loadout.active==='hands')return 'Find a weapon before using a tune-up.';
    if(loadout.hits>=POWERUP_HITS)return 'Your equipped weapon is already fully repaired.';
  }
  if(Object.hasOwn(GUN_KITS,id)){
    if(loadout.active!=='blaster')return 'Equip a blaster before using a gun upgrade.';
    if(loadout.gunUpgrade===GUN_KITS[id as keyof typeof GUN_KITS])return 'This gun upgrade is already equipped.';
  }
  if(id==='dinio-orb'&&stats.hasDinio)return 'Dinio is already with you.';
  if(id==='doghost-orb'&&stats.hasDoghost)return 'Doghost is already with you.';
  if(id==='teleport-orb'){
    if(stats.level<3)return 'Teleportation C joins from level three. Your orb will keep.';
    if(stats.hasTeleportationC)return 'Teleportation C is already with you.';
  }
  if(id==='gravity-kit'&&stats.gravityCoreCharges>=3)return 'Your gravity core already has three charges.';
  return null;
}

function applySupply(wallet:Wallet,id:SupplyId):Wallet {
  const pending=wallet.pending!,s=pending.campaign.stats,stats={...s};
  if(id==='life')stats.lives=Math.min(s.maxLives,s.lives+1);
  if(id==='heart-kit')stats.health=Math.min(s.maxHealth,s.health+30);
  if(id==='shield'){stats.shieldUnlocked=true;stats.inkShieldReady=true;}
  const weapon=WEAPON_KITS[id];
  if(weapon||id==='kai-arm-kit'){
    const loadout=restoreLoadout(s.equipment,'hands');
    stats.equipment=id==='kai-arm-kit'?equipKaiArm(loadout,s.level):equipPowerup(loadout,weapon!,s.level);
    stats.hasFlameSword=stats.equipment.active==='sword';
    stats.swordDurability=stats.hasFlameSword?POWERUP_HITS:0;
    if(stats.hasFlameSword)stats.swordUnlocked=true;
  }
  if(id==='repair'){
    stats.equipment={...restoreLoadout(s.equipment,'hands'),hits:POWERUP_HITS};
    if(stats.equipment.active==='sword')stats.swordDurability=POWERUP_HITS;
  }
  if(Object.hasOwn(GUN_KITS,id))stats.equipment=upgradeGun(restoreLoadout(s.equipment,'hands'),GUN_KITS[id as keyof typeof GUN_KITS]);
  if(id==='dinio-orb'){stats.dinioUnlocked=true;stats.hasDinio=true;}
  if(id==='doghost-orb'){stats.doghostUnlocked=true;stats.hasDoghost=true;}
  if(id==='teleport-orb'){stats.teleportationCUnlocked=true;stats.hasTeleportationC=true;}
  if(id==='gravity-kit'){stats.gravityCoreUnlocked=true;stats.gravityCoreCharges=Math.min(3,s.gravityCoreCharges+1);}
  return {...wallet,pending:{...pending,purchases:[...(pending.purchases??[]),id],campaign:{...pending.campaign,stats}}};
}

export function redeemSupply(wallet:Wallet,id:SupplyId):Wallet {
  if(wallet.crateReveal)throw Error('Collect your crate reward first.');
  if(!isSupply(id)||(wallet.inventory[id]??0)<1)throw Error('Find this supply in a crate first.');
  const blocked=supplyBlock(wallet,id);if(blocked)throw Error(blocked);
  return applySupply({...wallet,inventory:{...wallet.inventory,[id]:wallet.inventory[id]!-1}},id);
}

export function equipCosmetic(wallet:Wallet,slot:keyof CosmeticLoadout,id:string):Wallet {
  const item=SHOP_ITEMS.find(entry=>entry.id===id);
  if(wallet.crateReveal)throw Error('Collect your crate reward first.');
  if(id!=='classic'&&(!item||item.type!==slot||!wallet.owned.includes(item.id)))throw Error('Collect this item before equipping it.');
  return {...wallet,equipped:{...wallet.equipped,[slot]:id}};
}
