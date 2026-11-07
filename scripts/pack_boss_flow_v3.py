"""Pack generated boss in-betweens at the shipped body scale and shared anchors."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'art/boss-flow-v3';OUT=ROOT/'public/bosses/flow-v3';OUT.mkdir(parents=True,exist_ok=True)
old={'dark_dragon':'bosses/encounters-v2/dark_dragon/attack.png','killinas_daughter':'bosses/kilina-v3/attack.png','ink_behemoth':'bosses/encounters-v2/ink_behemoth/attack.png','pursuer':'flight/void-pursuer-v3.png'}
metadata={}
for key,path in old.items():
 image=Image.open(ART/f'{key}-generated.png').convert('RGBA');pixels=np.array(image);rows=2 if key=='pursuer' else 3
 count,labels,stats,centers=cv2.connectedComponentsWithStats((pixels[:,:,3]>120).astype('uint8'),8);frames=[];boxes=[]
 for n in range(rows*4):
  row,col=divmod(n,4);ids=[i for i in range(1,count) if stats[i,4]>=45 and min(3,int(centers[i,0]*4/image.width))==col and min(rows-1,int(centers[i,1]*rows/image.height))==row]
  mask=cv2.dilate(np.isin(labels,ids).astype('uint8'),np.ones((3,3),np.uint8));rgba=pixels.copy();rgba[:,:,3]=np.where(mask,rgba[:,:,3],0)
  cell=Image.fromarray(rgba).crop((round(col*image.width/4)-30,round(row*image.height/rows),round((col+1)*image.width/4)+30,round((row+1)*image.height/rows)))
  box=cell.getbbox();assert box,(key,n);frames.append(cell);boxes.append(box)
 prior=Image.open(ROOT/'public'/path).convert('RGBA').crop((0,0,640,400 if key=='pursuer' else 640));a=np.array(prior)[:,:,3];yy,xx=np.where(a>120)
 scale=(min(600,xx.max()-xx.min()+1)/(boxes[0][2]-boxes[0][0])) if key=='pursuer' else (yy.max()-yy.min()+1)/(boxes[0][3]-boxes[0][1])
 height=400 if key=='pursuer' else 640;sheet=Image.new('RGBA',(2560,height*rows));review=Image.new('RGB',(1120,280*rows),'#dce3e8');draw=ImageDraw.Draw(review);norm=[]
 for n,cell in enumerate(frames):
  row=n//4;box=boxes[n];baseline=float(np.median([boxes[j][3] for j in range(row*4,row*4+4)]));crop=cell.crop(box);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
  x=round(320+(box[0]-cell.width/2)*scale)
  if key=='pursuer':
   mid=float(np.median([(boxes[j][1]+boxes[j][3])/2 for j in range(row*4,row*4+4)]));y=round(200+(box[1]-mid)*scale)
  else:y=round(600+(box[1]-baseline)*scale)
  assert x>=0 and y>=0 and x+crop.width<=640 and y+crop.height<=height,(key,n,x,y,crop.size)
  f=Image.new('RGBA',(640,height));f.alpha_composite(crop,(x,y));norm.append(f);sheet.alpha_composite(f,(n%4*640,n//4*height))
  f.thumbnail((280,250));review.paste(f,(n%4*280,n//4*280),f);draw.text((n%4*280+6,n//4*280+255),str(n),fill='black')
 sheet.save(OUT/f'{key}.png',optimize=True);review.save(ART/f'{key}-preview.jpg',quality=92)
 gif=[]
 for i in ([0,1,2,3,4,5,6,7] if key!='killinas_daughter' else [0,1,2,3,4,5,10,11]):
  bg=Image.new('RGBA',(640,height),'#dce3e8');bg.alpha_composite(norm[i]);bg.thumbnail((320,320));gif.append(bg.convert('RGB'))
 gif[0].save(ART/f'{key}-preview.gif',save_all=True,append_images=gif[1:],duration=110,loop=0)
 metadata[key]={'frameWidth':640,'frameHeight':height,'frames':rows*4,'scale':scale,'origin':[.5,.5 if key=='pursuer' else 600/640]}
(OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(metadata))
