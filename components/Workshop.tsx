import React,{useEffect,useRef,useState} from 'react';
import type {Wallet} from '../gameplay/levelRewards';
import {isSupply,type SupplyId,type CosmeticLoadout} from '../gameplay/shopCatalog';
import {CRATES,LOOT,crateBlock,lootOdds,lootPool,type CrateId} from '../gameplay/workshopCrates';
import {POWERUPS} from '../gameplay/powerups';
import {COLLECTIBLE_CARDS} from '../gameplay/collectibleCards';
import CollectibleGallery from './CollectibleGallery';
import BuddyPicker from './BuddyPicker';
import WorkshopInventory from './WorkshopInventory';
import CrateOpening,{CrateSprite,type CratePhase} from './CrateOpening';
import './Workshop.css';
import './WorkshopCrates.css';

interface Props {wallet:Wallet;error:string;message:string;betweenLevels:boolean;onOpenCrate:(id:CrateId)=>boolean;onCollectReward:(receipt:string)=>boolean;
  onUseSupply:(id:SupplyId)=>boolean;onEquip:(slot:keyof CosmeticLoadout,id:string)=>void;onContinue:()=>void}
type Tab='crates'|'inventory'|'gallery';
export default function Workshop({wallet,error,message,betweenLevels,onOpenCrate,onCollectReward,onUseSupply,onEquip,onContinue}:Props){
  const [tab,setTab]=useState<Tab>('crates'),[selected,setSelected]=useState<CrateId>('normal');
  const [animate,setAnimate]=useState(false),[phase,setPhase]=useState<CratePhase|'idle'>(wallet.crateReveal?'revealed':'idle');
  const panel=useRef<HTMLElement>(null),openingBusy=useRef(false);
  const stats=wallet.pending?.campaign.stats,opening=wallet.crateReveal;
  const odds=lootOdds(wallet,selected),pool=lootPool(wallet,selected);
  const supplyCount=Object.values(wallet.inventory).reduce((sum,count)=>sum+(count??0),0);
  useEffect(()=>{panel.current?.focus();},[]);
  useEffect(()=>{
    const previous=window.render_game_to_text;
    const render=()=>JSON.stringify({mode:'workshop',betweenLevels,tab,selected,cratePhase:opening?phase:'idle',
      crateReveal:opening,wallet:{gold:wallet.gold,owned:wallet.owned,equipped:wallet.equipped,inventory:wallet.inventory,cards:wallet.cards,cratesOpened:wallet.cratesOpened},
      odds,availableRewards:pool.length,resume:stats??null,error:error||null});
    window.render_game_to_text=render;return()=>{if(window.render_game_to_text===render)window.render_game_to_text=previous;};
  },[wallet,betweenLevels,tab,selected,phase,opening,error]);
  const open=(crate:CrateId)=>{
    if(openingBusy.current)return;openingBusy.current=true;
    setSelected(crate);setAnimate(true);
    if(!onOpenCrate(crate)){setAnimate(false);openingBusy.current=false;}
  };
  const collect=(view:boolean)=>{
    if(!opening||!onCollectReward(opening.receipt))return;
    setTab(view?opening.reward.kind==='card'?'gallery':'inventory':'crates');
    setAnimate(false);setPhase('idle');openingBusy.current=false;
    requestAnimationFrame(()=>{if(!view)panel.current?.querySelector<HTMLButtonElement>(`[data-crate-offer="${selected}"] .crate-buy-button`)?.focus();else panel.current?.focus();});
  };
  return <section className="workshop workshop-v2" role="dialog" aria-modal="true" aria-labelledby="workshop-title" ref={panel} tabIndex={-1}
    onKeyDown={event=>{if(event.key==='Escape'&&!event.repeat&&!opening){event.preventDefault();event.stopPropagation();onContinue();}}}>
    <div className="workshop-v2-paper">
      <header className="workshop-v2-header"><div><span className="workshop-v2-eyebrow">THE UNKNOWN UNIVERSE · KAI’S SUPPLY CO.</span><h1 id="workshop-title">A little gold.<br/><em>A great discovery.</em></h1><p>Welcome to Kai’s Workshop. Let’s see what you find.</p></div><div className="workshop-v2-wallet"><span>YOUR GOLD</span><strong data-testid="shop-gold">{wallet.gold.toLocaleString()}</strong><small>Earned on your adventures</small></div></header>
      {!opening&&<>
        {betweenLevels&&stats&&<div className="workshop-loadout"><span>Next: Level {stats.level}</span><span>{POWERUPS[stats.equipment?.active??'hands'].name} · {stats.equipment?.hits??0}/3</span><span>Shield: {stats.inkShieldReady?'ready':'empty'}</span><span>Lives: {stats.lives}/{stats.maxLives}</span></div>}
        <nav className="workshop-v2-tabs" aria-label="Workshop rooms">{(['crates','inventory','gallery'] as const).map(value=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==='crates'?'The crates':value==='inventory'?'Your inventory':'Character gallery'}<span>{value==='crates'?'01':value==='inventory'?wallet.owned.length+supplyCount:`${wallet.cards.length}/${COLLECTIBLE_CARDS.length}`}</span></button>)}</nav>
      </>}
      <main className="workshop-v2-main">{opening?<CrateOpening key={opening.receipt} opening={opening} animate={animate} error={error} onCollect={collect} onPhase={setPhase}/>
        :tab==='gallery'?<CollectibleGallery owned={wallet.cards}/>:tab==='inventory'?<WorkshopInventory wallet={wallet} onUse={onUseSupply} onEquip={onEquip}/>:<>
          <div className="crate-section-heading"><h2>Pick your kind of mystery.</h2><span>ONE CRATE. ONE DISCOVERY.</span></div>
          <div className="crate-shelf">{(['normal','legendary'] as const).map(id=>{
            const crate=CRATES[id],blocked=crateBlock(wallet,id);
            return <article className={`crate-offer crate-offer-${id} ${selected===id?'is-selected':''}`} key={id} data-crate-offer={id}>
              <div className="crate-offer-top"><span>{id==='normal'?'THE EVERYDAY SURPRISE':'SOMETHING EXTRAORDINARY'}</span><span className="crate-offer-symbol" aria-hidden="true">{id==='normal'?'✧':'✦'}</span></div>
              <button type="button" className="crate-art-button" aria-label={`Inspect ${crate.name}`} aria-pressed={selected===id} onClick={()=>setSelected(id)}><div className="crate-offer-halo"/><CrateSprite crate={id}/></button>
              <div className="crate-offer-description"><div><h3>{crate.name}</h3><span className="crate-price">{crate.price} <small>GOLD</small></span></div><p>{crate.description}</p><small>{id==='normal'?'Power-ups, helpers, style & character art.':'Guaranteed Epic or Legendary. A bigger discovery.'}</small></div>
              <button type="button" className="crate-buy-button" disabled={Boolean(blocked)} onClick={()=>open(id)} aria-label={`Open ${crate.name} for ${crate.price} Gold`}>Open crate <span>{crate.price} Gold <b aria-hidden="true">↗</b></span></button>
              <p className="crate-offer-footnote">{blocked||'Permanent discoveries never repeat.'}</p>
            </article>;
          })}</div>
          <div className="crate-how-it-works"><span aria-hidden="true">✦</span><p><strong>Something useful. Something unexpected.</strong> Supplies go into your inventory. Specials and buddies are yours to keep. Character art fills your gallery.</p></div>
          <BuddyPicker wallet={wallet} shop onChoose={id=>onEquip('buddy',id)}/>
          <details className="crate-odds" key={selected}><summary>{CRATES[selected].name} · What could be inside?</summary><div className="crate-odds-content"><p>Odds for your current collection. Owned art and permanent items leave the pool; remaining rarity chances adjust when a tier is complete.</p>
            <div className="crate-odds-tiers">{odds.map(entry=><div className={`rarity-${entry.rarity}`} key={entry.rarity}><span>{entry.rarity}</span><strong>{(entry.chance*100).toFixed(entry.chance&&entry.chance<.01?2:1).replace('.0','')}%</strong><small>{entry.count} discoveries</small></div>)}</div>
            <p>Rarity follows an item’s reference value: Common ≤ 200 · Rare ≤ 400 · Epic ≤ 650 · Legendary &gt; 650 Gold.</p>
            <ul className="crate-loot-list">{LOOT.filter(reward=>CRATES[selected].weights[reward.rarity]>0).map(reward=>{
              const available=pool.some(entry=>entry.id===reward.id),tier=odds.find(entry=>entry.rarity===reward.rarity)!;
              return <li key={reward.id} className={`rarity-${reward.rarity} ${available?'':'loot-already-owned'}`}><span><b>{reward.name}</b><small>{reward.kind==='card'?'Character art':isSupply(reward.id)?'Supply':'Permanent item'} · {reward.value} value</small></span><span>{available?`${(tier.each*100).toFixed(2)}%`:'Collected'}</span></li>;
            })}</ul>
          </div></details>
        </>}
      </main>
      {!opening&&<footer className="workshop-footer"><div aria-live="polite">{error?<p role="alert" className="workshop-error">{error}</p>:<p>{message||'Gold is earned by playing. Every discovery is saved.'}</p>}</div><button type="button" onClick={onContinue}>{betweenLevels?'Continue story':'Back to title'} <span aria-hidden="true">→</span></button></footer>}
    </div>
  </section>;
}
