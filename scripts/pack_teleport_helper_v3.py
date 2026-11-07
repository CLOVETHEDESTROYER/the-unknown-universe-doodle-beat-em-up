"""Normalize the complete generated helper action sheet on a shared foot anchor."""
from pathlib import Path
import json
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/companions/teleportation-c-v3';OUT=ROOT/'public/companions/teleportation-c-v3';OUT.mkdir(parents=True,exist_ok=True)
im=Image.open(ART/'generated.png').convert('RGBA');pixels=np.array(im)
count,labels,stats,centers=cv2.connectedComponentsWithStats((pixels[:,:,3]>100).astype('uint8'),8)
frames=[];boxes=[]
for n in range(24):
 row,col=divmod(n,4)
 ids=[i for i in range(1,count) if stats[i,4]>35 and int(centers[i][0]*4/im.width)==col and int(centers[i][1]*6/im.height)==row]
 mask=cv2.dilate(np.isin(labels,ids).astype('uint8'),np.ones((3,3),np.uint8));rgba=pixels.copy();rgba[:,:,3]=np.where(mask,rgba[:,:,3],0)
 cell=Image.fromarray(rgba).crop((round(col*im.width/4),round(row*im.height/6),round((col+1)*im.width/4),round((row+1)*im.height/6)))
 box=cell.getbbox();assert box,n;frames.append(cell);boxes.append(box)
scale=220/(boxes[0][3]-boxes[0][1]);sheet=Image.new('RGBA',(1280,1920));preview=Image.new('RGB',(960,1440),'#dce3e8');draw=ImageDraw.Draw(preview)
normalized=[]
for n,cell in enumerate(frames):
 row=n//4;baseline=round(float(np.median([boxes[i][3] for i in range(row*4,row*4+4)])))
 box=boxes[n];crop=cell.crop(box);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 x=round(160+(box[0]-cell.width/2)*scale);y=round(300+(box[1]-baseline)*scale)
 assert x>=0 and y>=0 and x+crop.width<=320 and y+crop.height<=320,(n,crop.size,x,y)
 f=Image.new('RGBA',(320,320));f.alpha_composite(crop,(x,y));normalized.append(f);sheet.alpha_composite(f,(n%4*320,n//4*320))
 f=f.resize((240,240),Image.Resampling.LANCZOS);preview.paste(f,(n%4*240,n//4*240),f);draw.text((n%4*240+5,n//4*240+222),str(n),fill='black')
sheet.save(OUT/'helper.png',optimize=True);preview.save(ART/'preview.jpg',quality=92)
for name,ids in [('idle',range(4)),('run',range(4,12)),('strike',range(16,20)),('intercept',range(20,24))]:
 gif=[]
 for n in ids:
  bg=Image.new('RGBA',(320,320),'#dce3e8');bg.alpha_composite(normalized[n]);gif.append(bg.convert('RGB'))
 gif[0].save(ART/f'{name}.gif',save_all=True,append_images=gif[1:],duration=85 if name=='run' else 120,loop=0)
(OUT/'metadata.json').write_text(json.dumps({'frameSize':320,'frames':24,'origin':[.5,300/320],'bodyHeight':220,'worldHeight':160,'facing':'right'},indent=2)+'\n')
print('Packed 24 helper frames; shared body height 220, world height 160.')
