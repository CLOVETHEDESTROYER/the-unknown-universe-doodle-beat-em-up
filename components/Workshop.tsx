import React,{useEffect,useRef,useState} from 'react';
import type {Wallet} from '../gameplay/levelRewards';
import {SHOP_ITEMS,DEFAULT_COSMETICS,inkColor,isSupply,type ShopItemId,type CosmeticLoadout} from '../gameplay/shopCatalog';
import {purchaseBlock} from '../gameplay/workshop';
import {POWERUPS} from '../gameplay/powerups';
import BuddyPreview from './BuddyPreview';
import WardrobePreview from './WardrobePreview';
import './Workshop.css';

interface Props {wallet:Wallet;error:string;message:string;betweenLevels:boolean;onBuy:(id:ShopItemId)=>boolean;onEquip:(slot:keyof CosmeticLoadout,id:string)=>void;onContinue:()=>void;}
export default function Workshop({wallet,error,message,betweenLevels,onBuy,onEquip,onContinue}:Props){
  const [tab,setTab]=useState<'supply'|'style'|'wardrobe'|'powers'|'buddies'|'collection'>(betweenLevels?'supply':'style');
  const [selected,setSelected]=useState<ShopItemId>(betweenLevels?'shield':'arctic');
  const [confirm,setConfirm]=useState(false);
  const panel=useRef<HTMLElement>(null);
  const item=SHOP_ITEMS.find(i=>i.id===selected)!;
  const owned=!isSupply(selected)&&wallet.owned.includes(selected);
  const equipped=owned&&wallet.equipped[item.type as keyof CosmeticLoadout]===selected;
  const blocked=purchaseBlock(wallet,selected);
  const preview={...wallet.equipped,...(!isSupply(selected)?{[item.type]:selected}:{})} as CosmeticLoadout;
  const color='#'+inkColor(preview).toString(16).padStart(6,'0');
  const stats=wallet.pending?.campaign.stats;
  const isWardrobe=(entry:typeof item)=>['face','head','outfit'].includes(entry.type);
  const isSpecial=(entry:typeof item)=>entry.type==='xgodSpecial'||entry.type==='kaiSpecial';
  const isBuddy=item.type==='buddy';
  const visibleFor=(shelf:typeof tab)=>SHOP_ITEMS.filter(entry=>{
    if(shelf==='collection')return wallet.owned.includes(entry.id);
    if(shelf==='supply')return isSupply(entry.id);
    if(shelf==='wardrobe')return isWardrobe(entry);
    if(shelf==='powers')return isSpecial(entry);
    if(shelf==='buddies')return entry.type==='buddy';
    return entry.type==='ink'||entry.type==='trail'||entry.type==='burst';
  });
  const visible=visibleFor(tab);
  const resetLabels: Record<keyof CosmeticLoadout,string> = {
    ink:'Original ink',trail:'Simple trail',burst:'Classic burst',face:'Remove shades',head:'Remove headband',
    outfit:'Original sneakers',xgodSpecial:'Equip X Breaker',kaiSpecial:'Equip Thunderfall',buddy:'Send buddy home',
  };
  const resetSlots=(Object.keys(DEFAULT_COSMETICS) as (keyof CosmeticLoadout)[]).filter(slot=>{
    if(tab==='powers')return slot==='xgodSpecial'||slot==='kaiSpecial';
    if(tab==='buddies')return slot==='buddy';
    if(tab==='wardrobe')return slot==='face'||slot==='head'||slot==='outfit';
    if(tab==='style')return slot==='ink'||slot==='trail'||slot==='burst';
    return tab==='collection'&&wallet.equipped[slot]!=='classic';
  });
  useEffect(()=>{panel.current?.focus();},[]);
  useEffect(()=>{
    const previous=window.render_game_to_text;
    const render=()=>JSON.stringify({mode:'workshop',betweenLevels,tab,selected,confirm,wallet:{gold:wallet.gold,owned:wallet.owned,equipped:wallet.equipped},
      resume:wallet.pending?.campaign.stats??null,error:error||null});
    window.render_game_to_text=render;return()=>{if(window.render_game_to_text===render)window.render_game_to_text=previous;};
  },[wallet,betweenLevels,tab,selected,confirm,error]);
  return <section className="workshop" role="dialog" aria-modal="true" aria-labelledby="workshop-title" ref={panel} tabIndex={-1}
    onKeyDown={e=>{if(e.key==='Escape'&&!e.repeat){e.preventDefault();e.stopPropagation();if(confirm)setConfirm(false);else onContinue();}}}>
    <div className="workshop-paper">
      <header className="workshop-header"><div><span className="workshop-eyebrow">THE UNKNOWN UNIVERSE · SUPPLIES & STYLE</span><h1 id="workshop-title">Kai’s Workshop</h1><p>A little help now. Something cool to keep.</p></div>
        <div className="workshop-gold"><span>YOUR WALLET</span><strong data-testid="shop-gold">{wallet.gold.toLocaleString()} <small>Gold</small></strong></div></header>
      {betweenLevels&&stats&&<div className="workshop-loadout"><span>Next: Level {stats.level}</span><span>{POWERUPS[stats.equipment?.active??'hands'].name} · {stats.equipment?.hits??0}/3</span><span>Shield: {stats.inkShieldReady?'ready':'empty'}</span><span>Lives: {stats.lives}/{stats.maxLives}</span></div>}
      <div className="workshop-body">
        <aside className="workshop-preview">
          {(isSpecial(item)||isBuddy)?<div className={`workshop-stage workshop-ability-preview ability-${item.id}`} role="img" aria-label={`Preview of ${item.name}`}>
            {isBuddy?<BuddyPreview id={item.type==='buddy'?item.id:'spark-moth'}/>:<span aria-hidden="true">{item.icon}</span>}
          </div>:(tab==='wardrobe'||isWardrobe(item))?<WardrobePreview style={preview}/>:<div className={`workshop-stage trail-${preview.trail} burst-${preview.burst}`} style={{'--preview-ink':color} as React.CSSProperties} role="img" aria-label={`Preview of ${item.name}`}>
            <span className="workshop-preview-label">TRY THE LOOK</span><div className="workshop-runner"/><div className="workshop-preview-trail">{preview.trail==='starlight'?'✦ ✧ ✦':preview.trail==='chalk'?'• · •':'—'}</div><div className="workshop-preview-bolt"/><div className="workshop-preview-ring"/><div className="workshop-preview-floor"/>
            {isSupply(selected)&&<span className="workshop-supply-doodle" aria-hidden="true">{item.icon}</span>}
          </div>}
          <div className="workshop-item-info"><span className="workshop-item-tag">{isSupply(selected)?'CAMPAIGN SUPPLY':isSpecial(item)?'PERMANENT SPECIAL':isBuddy?'PERMANENT HELPER':'PERMANENT COSMETIC'}</span><h2>{item.name}</h2><p>{item.description}</p><small>{item.detail}</small>
            {confirm?<div className="workshop-confirm"><p>Buy {item.name} for <strong>{item.price} Gold</strong>?</p><button onClick={()=>{if(onBuy(selected))setConfirm(false);}}>Confirm purchase</button><button className="workshop-secondary" onClick={()=>setConfirm(false)}>Cancel</button></div>
              :owned?<button disabled={equipped} onClick={()=>onEquip(item.type as keyof CosmeticLoadout,selected)}>{equipped?'Equipped':isSpecial(item)||isBuddy?'Equip':'Equip this look'}</button>
              :<><button disabled={Boolean(blocked)} onClick={()=>setConfirm(true)}>Buy for {item.price} Gold</button>{blocked&&<p className="workshop-blocked">{blocked}</p>}</>}
          </div>
        </aside>
        <div className="workshop-stock"><nav aria-label="Workshop shelves">{(['supply','powers','buddies','style','wardrobe','collection'] as const).map(id=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setConfirm(false);const first=visibleFor(id)[0];if(first)setSelected(first.id);}}>{id==='supply'?'Supplies':id==='powers'?'Specials':id==='buddies'?'Buddies':id==='style'?'Ink & trails':id==='wardrobe'?'Wardrobe':'Collection'}</button>)}</nav>
          <div className="workshop-cards">{visible.map(i=><button key={i.id} className={`workshop-card ${selected===i.id?'selected':''}`} aria-label={`Preview ${i.name}`} aria-pressed={selected===i.id} onClick={()=>{setSelected(i.id);setConfirm(false);}}>
            <span className={`workshop-card-icon icon-${i.id}`} aria-hidden="true">{i.icon}</span><span className="workshop-card-title">{i.name}</span><span>{i.type==='supply'?'For this campaign':'Yours to keep'}</span><strong>{wallet.owned.includes(i.id)?Object.values(wallet.equipped).some(value=>value===i.id)?'Equipped':'Owned':`${i.price} Gold`}</strong>
          </button>)}</div>
          {tab==='collection'&&visible.length===0&&<p className="workshop-empty">Purchased specials, buddies, and cosmetics appear here.</p>}
          {resetSlots.length>0&&<div className="workshop-classics">{resetSlots.map(slot=><button key={slot} disabled={wallet.equipped[slot]==='classic'} onClick={()=>onEquip(slot,'classic')}>{resetLabels[slot]}</button>)}</div>}
        </div>
      </div>
      <footer className="workshop-footer"><div aria-live="polite">{error?<p role="alert" className="workshop-error">{error}</p>:<p>{message||'Choose an item to see how it works.'}</p>}</div><button onClick={onContinue}>{betweenLevels?'Continue story':'Back to title'} <span aria-hidden="true">→</span></button></footer>
    </div>
  </section>;
}
