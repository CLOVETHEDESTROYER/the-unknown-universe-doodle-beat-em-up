import React,{useState} from 'react';
import type {Wallet} from '../gameplay/levelRewards';
import {SHOP_ITEMS,isSupply,DEFAULT_COSMETICS,type ShopItemId,type SupplyId,type CosmeticLoadout} from '../gameplay/shopCatalog';
import {lootItemArt,rarityForValue} from '../gameplay/workshopCrates';
import {supplyBlock} from '../gameplay/workshop';
import {KAI_ART} from '../gameplay/kaiWorkshopArt';
import ShopItemPreview from './ShopItemPreview';
import WardrobePreview from './WardrobePreview';

const RESET_LABELS:Record<keyof CosmeticLoadout,string>={ink:'Original ink',trail:'Simple trail',burst:'Classic burst',face:'Remove shades',head:'Remove headband',outfit:'Original sneakers',xgodSpecial:'Equip X Breaker',kaiSpecial:'Equip Thunderfall',buddy:'Send buddy home'};
type Filter='all'|'supplies'|'specials'|'buddies'|'style';
export default function WorkshopInventory({wallet,onUse,onEquip}:{wallet:Wallet;onUse:(id:SupplyId)=>boolean;onEquip:(slot:keyof CosmeticLoadout,id:string)=>void}){
  const [filter,setFilter]=useState<Filter>('all'),[selected,setSelected]=useState<ShopItemId|null>(null);
  const items=SHOP_ITEMS.filter(entry=>(isSupply(entry.id)?(wallet.inventory[entry.id]??0)>0:wallet.owned.includes(entry.id))&&(
    filter==='all'||filter==='supplies'&&isSupply(entry.id)||filter==='specials'&&['xgodSpecial','kaiSpecial'].includes(entry.type)||filter==='buddies'&&entry.type==='buddy'||filter==='style'&&['ink','trail','burst','face','head','outfit'].includes(entry.type)));
  const item=items.find(entry=>entry.id===selected)??items[0];
  const supply=item&&isSupply(item.id),blocked=supply?supplyBlock(wallet,item.id as SupplyId):null;
  const equipped=item&&!supply&&wallet.equipped[item.type as keyof CosmeticLoadout]===item.id;
  return <section aria-label="Your inventory" className="workshop-inventory">
    <div className="inventory-heading"><div><span className="collection-eyebrow">FIND IT. KEEP IT. MAKE IT YOURS.</span><h2>Your inventory</h2></div><p>Supplies wait here until you need them.<br/>Specials, buddies, and style are yours to keep.</p></div>
    <nav className="inventory-filters" aria-label="Inventory categories">{(['all','supplies','specials','buddies','style'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setSelected(null);}}>{value==='all'?'Everything':value[0].toUpperCase()+value.slice(1)}</button>)}</nav>
    {item?<div className="inventory-body"><aside className={`inventory-detail rarity-${rarityForValue(item.price)}`}>
      {KAI_ART[item.id]?<ShopItemPreview key={item.id} id={item.id}/>:<div className="inventory-static-art"><img src={lootItemArt(item.id)} alt={item.name} width={256} height={256}/></div>}
      <div className="inventory-description"><span className="loot-rarity">{rarityForValue(item.price)} · {supply?'CAMPAIGN SUPPLY':'PERMANENT'}</span><h3>{item.name}</h3><p>{item.description}</p><small>{item.detail}</small>
        {supply?<><button type="button" className="workshop-primary" disabled={Boolean(blocked)} onClick={()=>onUse(item.id as SupplyId)}>Use one · {wallet.inventory[item.id as SupplyId]} in inventory</button>{blocked&&<p className="inventory-blocked">{blocked}</p>}</>
          :<button type="button" className="workshop-primary" disabled={equipped} onClick={()=>onEquip(item.type as keyof CosmeticLoadout,item.id)}>{equipped?'Equipped':'Equip item'}</button>}
        {['face','head','outfit'].includes(item.type)&&<details className="kai-try-on"><summary>Try on X God</summary><WardrobePreview style={{...wallet.equipped,[item.type]:item.id}}/></details>}
      </div></aside><div className="inventory-grid">{items.map(entry=><button type="button" key={entry.id} className={`inventory-item rarity-${rarityForValue(entry.price)}`} aria-label={`Preview ${entry.name}`} aria-pressed={item.id===entry.id} onClick={()=>setSelected(entry.id)}>
        <img src={lootItemArt(entry.id)} alt="" width={88} height={88} loading="lazy"/><span className="loot-rarity">{rarityForValue(entry.price)}</span><strong>{entry.name}</strong><small>{isSupply(entry.id)?`${wallet.inventory[entry.id]} saved`:Object.values(wallet.equipped).includes(entry.id as never)?'Equipped':'Owned'}</small>
      </button>)}</div></div>:<div className="inventory-empty"><span aria-hidden="true">✦</span><h3>A little room for something great.</h3><p>Open a crate to discover power-ups, buddies, specials, and style.</p></div>}
    <details className="inventory-reset"><summary>Original looks & abilities</summary><div>{(Object.keys(DEFAULT_COSMETICS) as (keyof CosmeticLoadout)[]).map(slot=><button type="button" key={slot} disabled={wallet.equipped[slot]==='classic'} onClick={()=>onEquip(slot,'classic')}>{RESET_LABELS[slot]}</button>)}</div></details>
  </section>;
}
