export type GunUpgradeId='rapid'|'fan'|'homing';
export const GUN_UPGRADES={
  rapid:{name:'Rapid Fire',color:0xffdf76,interval:95,damage:2,speed:760,lifetime:900,limit:12,angles:[0]},
  fan:{name:'Fan Shots',color:0xffb976,interval:320,damage:1.5,speed:650,lifetime:1000,limit:20,angles:[-.28,-.14,0,.14,.28]},
  homing:{name:'Heat Seekers',color:0x78e7ff,interval:400,damage:3,speed:460,lifetime:1800,limit:6,angles:[0]},
} as const;
export const isGunUpgrade=(v:unknown):v is GunUpgradeId=>typeof v==='string'&&Object.hasOwn(GUN_UPGRADES,v);
export const gunInterval=(mode:GunUpgradeId|undefined)=>mode?GUN_UPGRADES[mode].interval:230;
