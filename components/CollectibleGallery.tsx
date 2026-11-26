import React,{useEffect,useRef,useState} from 'react';
import {CHARACTER_CONFIGS,CHARACTER_IDS} from '../characters';
import {COLLECTIBLE_CARDS,cardArt,type CardId} from '../gameplay/collectibleCards';
import {rarityForValue} from '../gameplay/workshopCrates';
import './CollectibleGallery.css';

export default function CollectibleGallery({owned}:{owned:readonly CardId[]}){
  const [hero,setHero]=useState('all'),[series,setSeries]=useState('all'),[collectedOnly,setCollectedOnly]=useState(false);
  const [view,setView]=useState<CardId|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const card=COLLECTIBLE_CARDS.find(entry=>entry.id===view);
  const visible=COLLECTIBLE_CARDS.filter(entry=>(hero==='all'||entry.hero===hero)&&(series==='all'||entry.series===series)&&(!collectedOnly||owned.includes(entry.id)));
  useEffect(()=>{if(view)dialog.current?.showModal();else dialog.current?.close();},[view]);
  return <section className="collectible-gallery" aria-labelledby="collectible-gallery-title">
    <div className="collection-heading"><div><span className="collection-eyebrow">THE COLLECTION · VOLUME 01</span><h2 id="collectible-gallery-title">Characters. Reimagined.</h2><p>Different worlds. Different styles. Your favorite heroes.</p></div><strong data-testid="gallery-count">{owned.length}<span> / {COLLECTIBLE_CARDS.length} collected</span></strong></div>
    <div className="collection-filters">
      <label>Character<select aria-label="Character" value={hero} onChange={event=>setHero(event.target.value)}><option value="all">All characters</option>{CHARACTER_IDS.map(id=><option key={id} value={id}>{CHARACTER_CONFIGS[id].name==='???'?'Shadow Kid':CHARACTER_CONFIGS[id].name}</option>)}</select></label>
      <label>Series<select aria-label="Series" value={series} onChange={event=>setSeries(event.target.value)}><option value="all">All series</option>{[...new Set(COLLECTIBLE_CARDS.map(card=>card.series))].map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="collection-owned-filter"><input type="checkbox" checked={collectedOnly} onChange={event=>setCollectedOnly(event.target.checked)}/> Collected only</label>
    </div>
    <div className="collectible-grid">{visible.map(entry=>{
      const has=owned.includes(entry.id),rarity=rarityForValue(entry.value);
      return <button type="button" key={entry.id} className={`collectible-card rarity-${rarity} ${has?'is-owned':'is-locked'}`} disabled={!has}
        aria-label={has?`View ${entry.name}`:`Locked: ${entry.name}`} data-card-id={entry.id} onClick={()=>setView(entry.id)}>
        <div className="collectible-art">{has?<img src={cardArt(entry.id)} alt={entry.description} width={512} height={768} loading="lazy"/>:<div className="collectible-lock" aria-hidden="true"><span>?</span><small>{entry.series==='Beyond the Page'?'BEYOND THE PAGE':entry.series==='Harvest Party'?'HARVEST PARTY':'STYLE SWITCH'}</small></div>}
          <span className="collectible-rarity">{rarity}</span>{has&&<span className="collectible-owned">✓ Collected</span>}</div>
        <div className="collectible-caption"><span>{entry.style}</span><h3>{entry.name}</h3><small>{has?'Tap to view full artwork':'Discover in a crate'}</small></div>
      </button>;
    })}</div>
    {visible.length===0&&<p className="collection-empty">No cards here yet. Try another filter or discover more art in the workshop crates.</p>}
    <p className="collection-note">Collectible artwork stays in your gallery. Character outfits, playable unlocks, and abilities are collected separately.</p>
    <dialog ref={dialog} className="collectible-viewer" aria-label={card?.name??'Character artwork'} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}} onCancel={event=>{event.preventDefault();event.stopPropagation();setView(null);}} onClose={()=>setView(null)}>
      {card&&<><button type="button" className="collectible-viewer-close" autoFocus onClick={()=>setView(null)} aria-label="Close artwork">Close ×</button><img src={cardArt(card.id)} alt={card.description} width={1024} height={1536}/><div><span>{card.series} · {card.style}</span><h2>{card.name}</h2><p>{card.description}</p></div></>}
    </dialog>
  </section>;
}
