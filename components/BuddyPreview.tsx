import {useEffect,useRef} from 'react';
import {paintBuddy} from '../gameplay/buddyArt';
import type {BuddyId} from '../gameplay/shopCatalog';

export default function BuddyPreview({id}:{id:BuddyId}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d');
    if(!ctx)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0;
    const draw=(time:number)=>{
      const flap=reduced.matches?0:Math.sin(time/110);
      ctx.clearRect(0,0,192,128);ctx.save();ctx.translate(96,67+flap*5);ctx.scale(3.5,3.5);
      paintBuddy(ctx,id,1,flap);ctx.restore();
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(frame);
  },[id]);
  return <canvas ref={canvas} width={192} height={128} aria-hidden="true"/>;
}
