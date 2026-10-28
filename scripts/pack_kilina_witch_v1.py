"""Pack the original witch Kilina, separate from the Daughter's existing art."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/bosses/kilina-witch-v1'
DEST.mkdir(parents=True,exist_ok=True)
source=Image.open(ROOT/'art/kilina-witch-v1/poses-generated.png').convert('RGBA')
pixels=np.array(source)
n,labels,stats,centers=cv2.connectedComponentsWithStats((pixels[:,:,3]>64).astype('uint8'),8)
islands=[i for i in range(1,n) if stats[i,4]>20000]
assert len(islands)==8,f'Expected eight complete poses, got {len(islands)}'
islands.sort(key=lambda i:(int(centers[i,1]>source.height/2),centers[i,0]))
anchors=[210,605,980,1400,175,645,1010,1400]
scale=.72
frames=[]
for index,k in enumerate(islands):
    x,y,w,h,_=stats[k]
    crop=pixels[y:y+h,x:x+w].copy()
    # Remove neighboring pose fragments without rectangular cell cuts through hair/hands.
    crop[:,:,3]=np.where(labels[y:y+h,x:x+w]==k,crop[:,:,3],0)
    art=Image.fromarray(crop).resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(640,640))
    frame.alpha_composite(art,(round(320+(x-anchors[index])*scale),600-art.height))
    frames.append(frame)
for action,indices in [('walk',[0,1,2,3]),('attack',[4,5,6,7])]:
    sheet=Image.new('RGBA',(2560,640))
    for i,index in enumerate(indices):sheet.alpha_composite(frames[index],(i*640,0))
    sheet.save(DEST/f'{action}.png',optimize=True)
(DEST/'metadata.json').write_text(json.dumps({'character':'Kilina (original witch, not her Daughter)','frameSize':640,'origin':[.5,600/640],'sourceScale':scale,'displayScale':.68,'walk':['ready','stride','passing','opposite-stride'],'attack':['spell-windup','spell-release','air-step','drained-recovery']},indent=2))
out=ROOT/'output/kilina-witch-v1'
out.mkdir(parents=True,exist_ok=True)
preview=Image.new('RGBA',(1024,560),'#c9d1c2')
for i,frame in enumerate(frames):preview.alpha_composite(frame.resize((256,256)),(i%4*256,i//4*280))
preview.convert('RGB').save(out/'pose-preview.jpg',quality=95)
print(f'Packed {len(frames)} original Kilina poses in {DEST}')
