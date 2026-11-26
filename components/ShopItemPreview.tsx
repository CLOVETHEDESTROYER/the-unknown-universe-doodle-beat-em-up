import React,{useEffect,useRef,useState} from 'react';
import {KAI_ART,kaiArtPath} from '../gameplay/kaiWorkshopArt';
import type {ShopItemId} from '../gameplay/shopCatalog';

const ShopItemPreview:React.FC<{id:ShopItemId}>=({id})=>{
  const asset=KAI_ART[id],sprite=useRef<HTMLDivElement>(null),frameRef=useRef(0);
  const [mode,setMode]=useState('item'),[step,setStep]=useState(0);
  const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [left,setLeft]=useState(false);
  const start=mode==='fly'?4:mode==='assist'?12:mode==='effect'?4:0;
  const count=mode==='fly'?8:4;
  useEffect(()=>{
    const element=sprite.current;if(!element)return;
    let cancelled=false,raf=0,started:number|undefined;
    element.dataset.ready='false';element.style.backgroundImage='none';
    const image=new Image();
    const draw=(now:number)=>{
      if(cancelled)return;started??=now;
      const offset=playing?Math.floor((now-started)/(mode==='fly'?80:145))%count:step%count;
      const index=start+offset;frameRef.current=offset;
      element.style.backgroundPosition=`${index%4/3*100}% ${asset.rows===1?0:Math.floor(index/4)/(asset.rows-1)*100}%`;
      element.dataset.frame=String(index);element.dataset.ready='true';
      if(playing)raf=requestAnimationFrame(draw);
    };
    image.onload=()=>{if(cancelled)return;element.style.backgroundImage=`url("${kaiArtPath(id)}")`;raf=requestAnimationFrame(draw);};
    image.onerror=()=>{if(!cancelled)element.dataset.ready='error';};image.src=kaiArtPath(id);
    return()=>{cancelled=true;cancelAnimationFrame(raf);image.onload=null;image.onerror=null;};
  },[id,asset,playing,mode,start,count,step]);
  const choose=(value:string)=>{setMode(value);setStep(0);};
  return <div className="kai-art-preview">
    <div className="workshop-stage kai-art-stage" role="img" aria-label={`Preview of ${asset.name}`}>
      <div ref={sprite} className="kai-item-sprite" data-shop-art={id} style={{backgroundSize:`400% ${asset.rows*100}%`,transform:left?'scaleX(-1)':undefined}}/>
    </div>
    <div className="kai-art-controls" role="group" aria-label="Animation preview controls">
      <button type="button" aria-pressed={playing} onClick={()=>{setStep(frameRef.current);setPlaying(p=>!p);}}>{playing?'Pause':'Play'}</button>
      <button type="button" onClick={()=>{setStep(frameRef.current+1);setPlaying(false);}}>Next pose</button>
      <button type="button" aria-pressed={left} onClick={()=>setLeft(v=>!v)}>Face {left?'right':'left'}</button>
    </div>
    {(asset.buddy||asset.hasEffect)&&<div className="kai-art-actions" role="group" aria-label="Animation actions">
      <button type="button" aria-pressed={mode==='item'} onClick={()=>choose('item')}>{asset.buddy?'Idle':'Item'}</button>
      {asset.buddy?<><button type="button" aria-pressed={mode==='fly'} onClick={()=>choose('fly')}>{id==='spark-moth'||id==='patch-beetle'?'Fly':'Move'}</button><button type="button" aria-pressed={mode==='assist'} onClick={()=>choose('assist')}>{id==='spark-moth'?'Spark shot':id==='patch-beetle'?'Intercept':'Assist'}</button></>:<button type="button" aria-pressed={mode==='effect'} onClick={()=>choose('effect')}>In action</button>}
    </div>}
  </div>;
};
export default ShopItemPreview;
