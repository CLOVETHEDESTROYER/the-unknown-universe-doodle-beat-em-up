export const SHOP_ITEMS = [
  {id:'repair',name:'Weapon tune-up',price:75,type:'supply',icon:'✎',description:'Restore your equipped ground weapon to three hits.',detail:'For this campaign. Keeps your weapon and upgrades.'},
  {id:'shield',name:'Ink Shield',price:100,type:'supply',icon:'⬡',description:'Block one hit before it reaches your health and weapon.',detail:'For this campaign. One shield at a time.'},
  {id:'life',name:'Extra life',price:150,type:'supply',icon:'♥',description:'Replace one lost life for the next part of your adventure.',detail:'For this campaign. Up to your current life limit.'},
  {id:'arctic',name:'Arctic Ink',price:250,type:'ink',icon:'◆',description:'Ice-blue blaster shots and a bright cyan charge glow.',detail:'Permanent ink color. Changes appearance only.'},
  {id:'rose',name:'Neon Rose',price:250,type:'ink',icon:'◆',description:'Pink blaster shots with a warm electric glow.',detail:'Permanent ink color. Changes appearance only.'},
  {id:'chalk',name:'Chalk Sparks',price:400,type:'trail',icon:'✧',description:'Leave a dotted chalk trail behind your blaster shots.',detail:'Permanent shot trail. Changes appearance only.'},
  {id:'starlight',name:'Starlight',price:650,type:'trail',icon:'✦',description:'Send little glowing stars streaming behind each shot.',detail:'Permanent shot trail. Changes appearance only.'},
  {id:'prism',name:'Prism Burst',price:600,type:'burst',icon:'✺',description:'Colorful rings and sparks for charge hits and slam landings.',detail:'Permanent special effect. Changes appearance only.'},
  {id:'rooftop-shades',name:'Rooftop Shades',price:150,type:'face',icon:'◒',description:'Dark wraparound sunglasses for X God.',detail:'Permanent · X God’s drawn ground sprites'},
  {id:'sunset-band',name:'Sunset Headband',price:150,type:'head',icon:'〰',description:'A coral headband that follows X God’s hairline.',detail:'Permanent · X God’s drawn ground sprites'},
  {id:'blue-kicks',name:'Blue Kicks',price:200,type:'outfit',icon:'◆',description:'Sky-blue accents on X God’s sneakers.',detail:'Permanent · X God’s drawn ground sprites'},
  {id:'frost-kit',name:'Frost Gauntlet',price:125,type:'supply',icon:'❄',description:'Equip a fresh Frost Gauntlet for the next ground level.',detail:'Campaign power-up · slows regular enemies'},
  {id:'ember-kit',name:'Ember Boots',price:125,type:'supply',icon:'♨',description:'Equip fresh Ember Boots for the next ground level.',detail:'Campaign power-up · fire dash'},
  {id:'ink-fan',name:'Ink Fan',price:350,type:'xgodSpecial',icon:'✹',description:'Throw three big ink bolts in a spreading fan.',detail:'X God · X / SP · 5 second cooldown'},
  {id:'chalk-ring',name:'Chalk Ring',price:400,type:'xgodSpecial',icon:'◎',description:'Blast nearby enemies on both sides and erase close incoming shots.',detail:'X God · X / SP · 6 second cooldown'},
  {id:'rail-pulse',name:'Rail Pulse',price:350,type:'kaiSpecial',icon:'➤',description:'Fire a focused pulse that can pierce three enemies in a line.',detail:'Killer Kai · X / SP · 5.5 second cooldown'},
  {id:'static-net',name:'Static Net',price:400,type:'kaiSpecial',icon:'ϟ',description:'Sweep a wide area ahead, damaging enemies and clearing hostile shots.',detail:'Killer Kai · X / SP · 6.5 second cooldown'},
  {id:'spark-moth',name:'Spark Moth',price:450,type:'buddy',icon:'✦',description:'Follows your hero and fires a small spark at nearby enemies.',detail:'Permanent buddy · fires at enemies'},
  {id:'patch-beetle',name:'Patch Beetle',price:450,type:'buddy',icon:'⬡',description:'Follows your hero and intercepts an incoming shot when ready.',detail:'Permanent buddy · blocks incoming shots'},
] as const;
export type ShopItem=typeof SHOP_ITEMS[number];
export type ShopItemId=ShopItem['id'];
export type SupplyId='repair'|'shield'|'life'|'frost-kit'|'ember-kit';
export type SpecialId='ink-fan'|'chalk-ring'|'rail-pulse'|'static-net';
export type BuddyId='spark-moth'|'patch-beetle';
export const SPECIALS: Record<SpecialId,{name:string;cooldown:number;color:number}> = {
  'ink-fan':{name:'Ink Fan',cooldown:5000,color:0xacfb50},
  'chalk-ring':{name:'Chalk Ring',cooldown:6000,color:0xffb665},
  'rail-pulse':{name:'Rail Pulse',cooldown:5500,color:0x63e4ff},
  'static-net':{name:'Static Net',cooldown:6500,color:0xbe98ff},
};
export function equippedSpecial(loadout:CosmeticLoadout,hero:string):SpecialId|'classic' {
  return hero==='xgod'?loadout.xgodSpecial:hero==='killer_kai'?loadout.kaiSpecial:'classic';
}
export interface CosmeticLoadout {ink:'classic'|'arctic'|'rose';trail:'classic'|'chalk'|'starlight';burst:'classic'|'prism';face:'classic'|'rooftop-shades';head:'classic'|'sunset-band';outfit:'classic'|'blue-kicks';xgodSpecial:'classic'|'ink-fan'|'chalk-ring';kaiSpecial:'classic'|'rail-pulse'|'static-net';buddy:'classic'|BuddyId}
export const DEFAULT_COSMETICS:CosmeticLoadout={ink:'classic',trail:'classic',burst:'classic',face:'classic',head:'classic',outfit:'classic',xgodSpecial:'classic',kaiSpecial:'classic',buddy:'classic'};
export const isShopItem=(id:unknown):id is ShopItemId=>SHOP_ITEMS.some(item=>item.id===id);
export const isSupply=(id:unknown):id is SupplyId=>id==='repair'||id==='shield'||id==='life'||id==='frost-kit'||id==='ember-kit';
export const isPermanentShopItem=(id:unknown):id is Exclude<ShopItemId,SupplyId>=>isShopItem(id)&&!isSupply(id);
export const inkColor=(c:CosmeticLoadout,charged=false)=>c.ink==='rose'?0xff79bb:c.ink==='arctic'?0x75eaff:charged?0x9bf5ff:0xc9ef83;
export function restoreCosmetics(raw:Partial<CosmeticLoadout>|undefined,owned:ShopItemId[]):CosmeticLoadout{
  return {ink:raw?.ink&&(raw.ink==='arctic'||raw.ink==='rose')&&owned.includes(raw.ink)?raw.ink:'classic',
    trail:raw?.trail&&(raw.trail==='chalk'||raw.trail==='starlight')&&owned.includes(raw.trail)?raw.trail:'classic',
    burst:raw?.burst==='prism'&&owned.includes('prism')?'prism':'classic',
    face:raw?.face==='rooftop-shades'&&owned.includes('rooftop-shades')?'rooftop-shades':'classic',
    head:raw?.head==='sunset-band'&&owned.includes('sunset-band')?'sunset-band':'classic',
    outfit:raw?.outfit==='blue-kicks'&&owned.includes('blue-kicks')?'blue-kicks':'classic',
    xgodSpecial:(raw?.xgodSpecial==='ink-fan'||raw?.xgodSpecial==='chalk-ring')&&owned.includes(raw.xgodSpecial)?raw.xgodSpecial:'classic',
    kaiSpecial:(raw?.kaiSpecial==='rail-pulse'||raw?.kaiSpecial==='static-net')&&owned.includes(raw.kaiSpecial)?raw.kaiSpecial:'classic',
    buddy:(raw?.buddy==='spark-moth'||raw?.buddy==='patch-beetle')&&owned.includes(raw.buddy)?raw.buddy:'classic'};
}
