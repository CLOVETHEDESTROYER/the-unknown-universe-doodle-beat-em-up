import {useEffect, useRef, useState} from 'react';
import type {CosmeticLoadout} from '../gameplay/shopCatalog';
import {paintWardrobe} from '../gameplay/xgodWardrobe';

const poses = [
  {label:'Idle', sheet:'blaster-idle', frames:4, ms:230},
  {label:'Run', sheet:'blaster-run-stride', frames:8, ms:78},
  {label:'Jump', sheet:'blaster-jump', frames:4, ms:180},
  {label:'Crouch', sheet:'blaster-crouch', frames:4, ms:220},
];

export default function WardrobePreview({style}: {style:CosmeticLoadout}) {
  const [pose, selectPose] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const {face,head,outfit} = style;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d', {willReadFrequently:true});
    if (!ctx) return;
    const sheet = new Image();
    const current = poses[pose];
    let timer: ReturnType<typeof setInterval> | undefined;
    let frame = 0;
    sheet.onload = () => {
      const draw = () => {
        ctx.clearRect(0,0,768,512);
        ctx.drawImage(sheet, frame % 4 * 768, Math.floor(frame / 4) * 512, 768,512,0,0,768,512);
        paintWardrobe(ctx, 'runner_' + (pose === 1 ? 'blaster-run' : current.sheet), frame, style);
        frame = (frame + 1) % current.frames;
      };
      draw();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(draw,current.ms);
    };
    sheet.src = '/characters/xgod/drawn-v1/' + current.sheet + '.png';
    return () => { sheet.onload = null; clearInterval(timer); };
  }, [pose,face,head,outfit]);
  return <div className="wardrobe-preview">
    <canvas ref={canvas} width={768} height={512} role="img" aria-label={poses[pose].label + ' preview of X God’s outfit'} />
    <div className="wardrobe-poses" role="group" aria-label="Preview pose">
      {poses.map((entry,index) => <button key={entry.label} type="button" aria-pressed={pose===index} onClick={()=>selectPose(index)}>{entry.label}</button>)}
    </div>
  </div>;
}
