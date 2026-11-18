import React, {useEffect,useRef,useState} from 'react';
import type {LevelResult} from '../gameplay/levelRewards';
import './LevelResults.css';

interface Props {result:LevelResult;gold:number;error:string;onContinue:()=>void;outcome?:'cleared'|'defeat';}
const number=(value:number)=>value.toLocaleString();

function useTally(receipt:string){
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [progress,setProgress]=useState(()=>reduced?1:0);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    if(reduced){setProgress(1);return;}
    setProgress(0);
    const start=performance.now();let frame=0;
    const tick=(now:number)=>{
      const elapsed=Math.max(0,Math.min(1,(now-start)/1150));
      setProgress(1-Math.pow(1-elapsed,3));
      if(elapsed<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[receipt,reduced]);
  return {progress,complete:progress===1,reduced};
}

export default function LevelResults({result,gold,error,onContinue,outcome='cleared'}:Props){
  const defeated=outcome==='defeat';
  const tally=useTally(result.receiptId+outcome);
  const count=(value:number)=>Math.floor(value*tally.progress);
  const shownGold=error?gold:Math.max(0,gold-result.earnedGold)+count(result.earnedGold);
  const tallyState=useRef({points:0,gems:0,gold:0,complete:false});
  tallyState.current={points:count(result.points),gems:count(result.gems),gold:shownGold,complete:tally.complete};
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{panel.current?.focus();},[]);
  useEffect(()=>{
    const previous=window.render_game_to_text;
    // Keep engine details available to death/respawn QA while replacing the old Game Over overlay.
    let engineState={};if(defeated)try{engineState=JSON.parse(previous?.()??'{}');}catch{}
    const render=()=>JSON.stringify({...engineState,mode:defeated?'game-over':'level-results',outcome,result,wallet:{gold},tally:tallyState.current,saveError:error||null});
    window.render_game_to_text=render;
    return ()=>{if(window.render_game_to_text===render)window.render_game_to_text=previous;};
  },[result,gold,error,defeated,outcome]);
  return <section ref={panel} tabIndex={-1} className={`level-results ${defeated?'results-defeat':''} ${tally.complete?'tally-landed':''}`}
    data-tally={tally.complete?'complete':'counting'} role="dialog" aria-modal="true" aria-labelledby="results-heading"
    onKeyDown={event=>{if(event.key==='Enter'&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();event.stopPropagation();if(!event.repeat)onContinue();}}}>
    <div className="results-paper">
      <header className="results-header">
        <span className="results-stamp">{defeated?'GAME OVER':`LEVEL ${result.level} COMPLETE`}</span>
        <h1 id="results-heading">{defeated?'Another draft?':'Nice work!'}</h1>
        <p>{defeated?`Level ${result.level} unfinished. Here’s how far you got.`:'Your haul is in. Take a look before the next adventure.'}</p>
      </header>
      <div className="results-totals">
        <div className="results-points"><span>POINTS EARNED</span><strong data-testid="result-points" aria-label={`${number(result.points)} points earned`}>{number(count(result.points))}</strong><small>{number(count(result.totalPoints))} campaign total</small><i className="tally-glints" aria-hidden="true">✦</i></div>
        <div className="results-gems"><span><span aria-hidden="true">◆ </span>GEMS COLLECTED</span><strong data-testid="result-gems" aria-label={`${result.gems} gems collected`}>{number(count(result.gems))}</strong><small>{number(count(result.monsters))} {result.monsters===1?'enemy':'enemies'} defeated</small></div>
      </div>
      <div className="results-bottom">
        <div className="results-breakdown">
          <h2>{defeated?'This attempt':'Gold earned'}</h2>
          <dl>
            <div><dt>{defeated?'Gems found':<>Gem haul <small>({result.gems} × 5)</small></>}</dt><dd>{defeated?number(count(result.gems)):`+${number(count(result.pickupGold))}`}</dd></div>
            <div><dt>Level clear</dt><dd>{defeated?'Not earned':`+${number(count(result.clearGold))}`}</dd></div>
            <div><dt>Performance bonus</dt><dd>{defeated?'Finish to earn':`+${number(count(result.performanceGold))}`}</dd></div>
            <div className="results-earned"><dt>{defeated?'Gold banked':'This level'}</dt><dd data-testid="result-earned">+{number(count(result.earnedGold))} Gold</dd></div>
          </dl>
          <p className="results-bonus-note">{defeated?'Clear the level to bank its gems and bonuses. Gold from earlier clears is safe.':'Combat and challenge points earn bonus Gold. Gem points are counted in your haul.'}</p>
        </div>
        <div className="results-wallet">
          <span>YOUR WALLET</span><strong data-testid="wallet-gold">{number(shownGold)} <small>Gold</small></strong>
          <p>Save up for Kai’s Workshop.</p>
          <span className="results-saved">{error?'Not saved yet':defeated?'Your saved Gold is kept':'Ready for your next visit'}</span>
        </div>
      </div>
      {error&&<p role="alert" className="results-error">{error}</p>}
      <footer><button type="button" onClick={onContinue}>{defeated?'Draw again':error?'Retry saving':'Continue adventure'} <span aria-hidden="true">→</span></button></footer>
    </div>
  </section>;
}
