import React, {useEffect,useRef,useState} from 'react';
import {WORKSHOP_ASSETS,workshopSheet,workshopPoster,type WorkshopAsset,type WorkshopAction} from '../gameplay/workshopAssets';
import './CombatGallery.css';

interface WorkshopProps { onSpriteUpload?: (e:React.ChangeEvent<HTMLInputElement>)=>void; isSpriteLoaded?:boolean; onClose?:()=>void }

const SpritePreview:React.FC<{asset:WorkshopAsset;action:WorkshopAction;playing:boolean;left:boolean;step:number;frameRef:React.MutableRefObject<number>}>=({asset,action,playing,left,step,frameRef})=>{
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext('2d');
    if(!canvas||!ctx)return;
    canvas.dataset.ready='false';ctx.clearRect(0,0,320,320);
    let cancelled=false,raf=0,started:number|undefined;
    const source=new Image();setError(false);
    const paint=(clock:number)=>{
      if(cancelled)return;
      started??=clock;
      const index=action.start+(playing?Math.floor((clock-started)*action.fps/1000)%action.count:step%action.count);
      ctx.clearRect(0,0,320,320);ctx.save();
      if(left){ctx.translate(320,0);ctx.scale(-1,1);}
      const display=asset.group==='buddies'?320:270;
      ctx.drawImage(source,index%asset.columns*asset.size,Math.floor(index/asset.columns)*asset.size,asset.size,asset.size,(320-display)/2,(320-display)/2,display,display);
      ctx.restore();canvas.dataset.frame=String(index);canvas.dataset.ready='true';frameRef.current=index-action.start;
      if(playing)raf=requestAnimationFrame(paint);
    };
    source.onload=()=>{if(!cancelled)raf=requestAnimationFrame(paint);};
    source.onerror=()=>{if(!cancelled)setError(true);};source.src=workshopSheet(asset.id);
    return ()=>{cancelled=true;cancelAnimationFrame(raf);source.onload=null;source.onerror=null;};
  },[asset,action,playing,left,step,frameRef]);
  return <div className="combat-gallery-stage"><canvas ref={canvasRef} width={320} height={320} role="img" aria-label={`${asset.name}: ${action.name} animation`} data-asset={asset.id}/>{error&&<p role="alert">This animation could not load. Reopen the workshop to try again.</p>}</div>;
}

export default function CombatGallery({onSpriteUpload,isSpriteLoaded,onClose}:WorkshopProps){
  const [group,setGroup]=useState<'powerups'|'buddies'>('powerups');
  const [selected,setSelected]=useState('blaster'),[actionIndex,setActionIndex]=useState(0);
  const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [left,setLeft]=useState(false),[step,setStep]=useState(0);
  const frameRef=useRef(0);
  const asset=WORKSHOP_ASSETS.find(a=>a.id===selected)!;
  const action=asset.actions[actionIndex]??asset.actions[0];
  const choose=(id:string)=>{setSelected(id);setActionIndex(0);setStep(0);};
  return <section className={`combat-gallery ${onClose?'combat-gallery-expanded':'combat-gallery-sidebar'}`} aria-labelledby="combat-gallery-heading">
    <header className="combat-gallery-header"><div><p className="combat-gallery-eyebrow">THE UNKNOWN UNIVERSE</p><h2 id="combat-gallery-heading">Art Gallery</h2><p>Little doodles. Big powers.</p></div>{onClose&&<button autoFocus type="button" onClick={onClose} className="combat-gallery-close" aria-label="Close gallery">Close ×</button>}</header>
    <div className="combat-gallery-tabs" aria-label="Workshop collection">{(['powerups','buddies'] as const).map(g=><button key={g} type="button" aria-pressed={group===g} onClick={()=>{setGroup(g);choose(g==='powerups'?'blaster':'dinio');}}>{g==='powerups'?'Power-ups · 13':'Buddies · 3'}</button>)}</div>
    <div className="combat-gallery-body"><div className="combat-gallery-preview">
      <div className="combat-gallery-preview-label"><span>{group==='powerups'?'POWER-UP STUDY':'BUDDY STUDY'}</span><span>{action.count} poses</span></div>
      <SpritePreview key={asset.id} asset={asset} action={action} playing={playing} left={left} step={step} frameRef={frameRef}/>
      <div className="combat-gallery-controls"><button type="button" onClick={()=>{setStep(frameRef.current);setPlaying(p=>!p);}} aria-pressed={playing}>{playing?'Pause':'Play'}</button><button type="button" onClick={()=>{setPlaying(false);setStep(frameRef.current+1);}}>Next pose</button><button type="button" onClick={()=>{setStep(frameRef.current);setLeft(l=>!l);}} aria-pressed={left}>Face {left?'right':'left'}</button></div>
      <div className="combat-gallery-actions" aria-label="Animation actions">{asset.actions.map((a,i)=><button type="button" key={a.name} aria-pressed={actionIndex===i} onClick={()=>{setActionIndex(i);setStep(0);}}>{a.name}</button>)}</div>
      <h3>{asset.name}</h3><p className="combat-gallery-description">{asset.description}</p>
    </div><div className="combat-gallery-collection"><p className="combat-gallery-collection-heading">{group==='powerups'?'Choose a power-up':'Meet your buddies'}</p>
      <div className="combat-gallery-grid">{WORKSHOP_ASSETS.filter(a=>a.group===group).map(a=><button type="button" key={a.id} aria-pressed={selected===a.id} aria-label={`Preview ${a.name}`} onClick={()=>choose(a.id)}><img src={workshopPoster(a.id)} alt="" loading="lazy" width={96} height={96}/><span>{a.name}</span></button>)}</div>
      <p className="combat-gallery-note">{group==='powerups'?'Discover these in the campaign. Previewing an item keeps your loadout and unlocks as they are.':'Choose an action to see each buddy move. Find their orbs in the campaign to recruit them.'}</p>
      {onSpriteUpload&&<details className="combat-gallery-scanner"><summary>Doodle Scanner</summary><p>Try your own player_walk.png sprite sheet.</p><label>{isSpriteLoaded?'Character scanned — choose another':'Scan character doodle'}<input type="file" accept="image/png" onChange={onSpriteUpload}/></label></details>}
    </div></div>
  </section>;
}
