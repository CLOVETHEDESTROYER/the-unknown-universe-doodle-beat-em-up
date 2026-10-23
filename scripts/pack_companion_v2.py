"""Normalize the generated Doghost cycle and deliver the remade X God card."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/companion-v2';OUT=ROOT/'public/companions/motion-v2';OUT.mkdir(parents=True,exist_ok=True)
source=Image.open(ART/'doghost-generated.png').convert('RGBA')
assert source.getchannel('A').getextrema()[0]==0
frames=[]
# Generated rows have unequal whitespace; shared 1/3 crops include neighboring ears/tails.
rows=[0,round(source.height*385/1080),round(source.height*715/1080),source.height]
for n in range(12):
 x,y=n%4,n//4
 cell=source.crop((max(0,round(x*source.width/4)-10),rows[y],min(source.width,round((x+1)*source.width/4)+10),rows[y+1]))
 # Adjacent tail motion marks occasionally enter the gutter. Discard clipped components.
 pixels=np.array(cell);labels,_=ndimage.label(pixels[:,:,3]>0)
 clipped=np.unique(np.concatenate((labels[:,:2].ravel(),labels[:,-2:].ravel())))
 clipped=clipped[clipped!=0];pixels[np.isin(labels,clipped)]=0;cell=Image.fromarray(pixels)
 box=cell.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox();assert box
 frames.append(cell.crop(box))
scale=150/max(f.height for f in frames[:8])
sheet=Image.new('RGBA',(960,720));entries=[];review=Image.new('RGBA',(960,720),'#727a86');draw=ImageDraw.Draw(review)
for n,frame in enumerate(frames):
 frame=frame.resize((round(frame.width*scale),round(frame.height*scale)),Image.Resampling.LANCZOS)
 ox=(240-frame.width)//2;oy=216-frame.height;assert ox>=0 and oy>=0
 cell=Image.new('RGBA',(240,240));cell.alpha_composite(frame,(ox,oy))
 x,y=n%4*240,n//4*240;sheet.alpha_composite(cell,(x,y));review.alpha_composite(cell,(x,y));draw.text((x+12,y+220),f'Doghost / {n}',fill='white')
 entries.append({'filename':str(n),'rotated':False,'trimmed':False,'frame':{'x':x,'y':y,'w':240,'h':240},'sourceSize':{'w':240,'h':240},'spriteSourceSize':{'x':0,'y':0,'w':240,'h':240}})
sheet.save(ART/'doghost-sheet.png',optimize=True);sheet.save(OUT/'doghost.webp',lossless=True,method=6,exact=True)
(OUT/'doghost.json').write_text(json.dumps({'textures':[{'image':'doghost.webp','frames':entries}]},separators=(',',':')),encoding='utf-8')
review.convert('RGB').save(ART/'doghost-review.jpg',quality=92)
card=Image.open(ROOT/'art/ui-v2/xgod-card-generated.png').convert('RGBA')
card.save(ROOT/'public/cards/xgod-current-v2.webp',quality=92,method=6,exact=True)
print('Doghost: 8 glide + 4 howl frames;', (OUT/'doghost.webp').stat().st_size,'bytes. X God card:',(ROOT/'public/cards/xgod-current-v2.webp').stat().st_size,'bytes')
