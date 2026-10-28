"""Pack athletic run with a single transform, retaining its bounce and barrel sockets."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/xgod-blaster-run-v3'
DEST=ROOT/'public/characters/xgod/blaster-run-v3';DEST.mkdir(parents=True,exist_ok=True)
manifest=json.loads((SOURCE/'render-attachments.json').read_text())
sheet=Image.new('RGBA',(2048,2048));preview=Image.new('RGBA',(2048,560),'#c6cbbd');draw=ImageDraw.Draw(preview)
ground=Image.open(SOURCE/'frames/ground-reference-feet.png').getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()[3]
attachments=[];frames=[];scale,x=1.02,-5;y=round(480-ground*scale)
max_error=max(v for r in manifest['actions']['blaster-run'] for v in r['plantErrors'])
if max_error>.06:raise ValueError(f'Stance foot cannot reach ground: {max_error}')
for i,record in enumerate(manifest['actions']['blaster-run']):
    frame=Image.open(SOURCE/'frames'/f'blaster-run-{i:02d}.png').convert('RGBA')
    normalized=Image.new('RGBA',(512,512))
    normalized.paste(frame.resize((522,522),Image.Resampling.LANCZOS),(x,y))
    bounds=normalized.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    if not bounds or min(bounds[:2])<=1 or max(bounds[2:])>=511:raise ValueError(f'Clipped frame {i}: {bounds}')
    sheet.alpha_composite(normalized,((i%4)*512,(i//4)*512))
    attachments.append({k:[round(v[0]*scale+x,2),round(v[1]*scale+y,2)] for k,v in record.items() if k in ('grip','muzzle')})
    px=(i%8)*256;py=(i//8)*280
    preview.alpha_composite(normalized.resize((256,256),Image.Resampling.LANCZOS),(px,py))
    draw.text((px+8,py+260),f'{i:02d}: {" / ".join(record["contacts"]) or "flight"}',fill='#182820')
    gif=Image.new('RGBA',(320,300),'#c6cbbd');gif.alpha_composite(normalized.resize((300,300),Image.Resampling.LANCZOS),(10,-8));frames.append(gif.convert('RGB'))
sheet.save(DEST/'blaster-run.png',optimize=True)
metadata={'frameWidth':512,'frameHeight':512,'origin':[.5,.9375],'displayScale':.4,
          'weaponHand':manifest['weaponHand'],'sourceHandSocket':manifest['sourceHandSocket'],
          'fps':32,'cycleMs':500,'rootTransform':[scale,x,y],'maxPlantError':max_error,
          'actions':{'blaster-run':{'frames':16,'attachments':attachments}}}
(DEST/'metadata.json').write_text(json.dumps(metadata,indent=2))
preview.convert('RGB').save(SOURCE/'pose-review.jpg',quality=95)
frames[0].save(SOURCE/'run-preview.gif',save_all=True,append_images=frames[1:],duration=[30]*16,loop=0)
print('Packed sixteen-frame blaster run and per-frame barrel sockets.')
