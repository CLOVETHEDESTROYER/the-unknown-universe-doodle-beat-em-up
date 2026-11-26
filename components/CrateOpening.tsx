import React,{useEffect,useRef,useState} from 'react';
import {playSfx} from '../audio/gameAudio';
import {CRATES,lootItemArt,type CrateId,type CrateReveal} from '../gameplay/workshopCrates';
import {cardArt,type CardId} from '../gameplay/collectibleCards';
import {isSupply,type ShopItemId} from '../gameplay/shopCatalog';

export type CratePhase='preparing'|'shaking'|'charging'|'burst'|'revealed';
export function CrateSprite({crate,frame=0}:{crate:CrateId;frame?:number}){
  return <div className="crate-sprite" aria-hidden="true" data-crate={crate} data-frame={frame}
    style={{backgroundImage:`url('/workshop/crates-v2/${crate}${frame===0?'-poster':''}.webp')`,backgroundSize:frame===0?'100% 100%':'400% 100%',backgroundPosition:`${frame/3*100}% 0`}}/>;
}
const CrateOpening:React.FC<{opening:CrateReveal;animate:boolean;error:string;onCollect:(gallery:boolean)=>void;onPhase:(phase:CratePhase)=>void}>=({opening,animate,error,onCollect,onPhase})=>{
  const [phase,setPhase]=useState<CratePhase>(animate?'preparing':'revealed');
  const [ready,setReady]=useState(false),[artError,setArtError]=useState(false);
  const timers=useRef<number[]>([]),control=useRef<HTMLButtonElement>(null),skipped=useRef(false);
  const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const reward=opening.reward,isCard=reward.kind==='card';
  const art=isCard?cardArt(reward.id as CardId):lootItemArt(reward.id as ShopItemId);
  const clear=()=>{timers.current.forEach(window.clearTimeout);timers.current=[];};
  const skip=()=>{skipped.current=true;clear();setPhase('revealed');};
  useEffect(()=>{
    let cancelled=false;
    const images=[`/workshop/crates-v2/${opening.crate}.webp`,art].map(src=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>resolve();image.src=src;}));
    void Promise.all(images).then(()=>{if(!cancelled)setReady(true);});
    return()=>{cancelled=true;};
  },[opening.crate,art]);
  useEffect(()=>{
    if(!animate||!ready||skipped.current)return;
    if(reduced){setPhase('revealed');return;}
    setPhase('shaking');playSfx('landing',{preview:true,volume:.6});
    timers.current=[window.setTimeout(()=>{setPhase('charging');playSfx('blasterChargeReady',{preview:true,volume:.5});},1000),
      window.setTimeout(()=>{setPhase('burst');playSfx('explosion',{preview:true,volume:.6});},1450),
      window.setTimeout(()=>{setPhase('revealed');playSfx('powerup',{preview:true,volume:.75});},2050)];
    return clear;
  },[animate,ready,reduced]);
  useEffect(()=>{onPhase(phase);control.current?.focus();},[phase,onPhase]);
  const revealed=phase==='revealed',frame=revealed?3:phase==='burst'?2:phase==='charging'?1:0;
  return <section className={`crate-opening rarity-${reward.rarity} phase-${phase} ${isCard?'reward-is-card':''}`} aria-label="Crate reward" data-phase={phase}
    onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!revealed)skip();}}}>
    <div className="opening-topline"><span>{CRATES[opening.crate].name}</span><span>{revealed?'YOUR DISCOVERY':'A LITTLE MYSTERY…'}</span></div>
    <div className="opening-stage">
      <div className="opening-rays" aria-hidden="true"/><div className="opening-shockwave" aria-hidden="true"/>
      <div className="opening-sparks" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--spark-angle':`${i*15}deg`,'--spark-distance':`${125+i%5*24}px`,'--spark-delay':`${i%4*35}ms`} as React.CSSProperties}/>)}</div>
      <div className="opening-chest"><CrateSprite crate={opening.crate} frame={frame}/></div>
      {revealed&&<div className={`opening-reward ${isCard?'opening-card':'opening-item'}`}>
        {artError?<div className="reward-art-error">{reward.name}<small>Artwork is still loading. Your reward is saved.</small></div>:<img src={art} alt={reward.description} width={isCard?320:256} height={isCard?480:256} onError={()=>setArtError(true)}/>}
      </div>}
    </div>
    <div className="opening-caption" aria-live="polite">{revealed?<><span className="opening-rarity">{reward.rarity} {isCard?'CHARACTER ART':isSupply(reward.id)?'SUPPLY':'ITEM'}</span><h2>{reward.name}</h2><p>{reward.description}</p><small>{isCard?'Saved to your character gallery.':isSupply(reward.id)?'Saved to your inventory. Use it between levels.':'Added to your inventory. Equip it whenever you like.'}</small></>:<><h2>{phase==='preparing'?'Getting your crate ready…':phase==='burst'?'Here it comes!':'What’s inside?'}</h2><p>Your discovery is on its way.</p></>}</div>
    {error&&<p role="alert" className="workshop-error">{error}</p>}
    <div className="opening-actions">{revealed?<><button type="button" ref={control} className="workshop-primary" onClick={()=>onCollect(true)}>{isCard?'View in gallery':'View in inventory'}</button><button type="button" className="workshop-secondary" onClick={()=>onCollect(false)}>Back to crates</button></>:<button ref={control} type="button" className="opening-skip" onClick={skip}>Skip animation</button>}</div>
  </section>;
}
export default CrateOpening;
