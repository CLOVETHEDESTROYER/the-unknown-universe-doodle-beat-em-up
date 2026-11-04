"""Normalize the approved sixteen-pose Turkey King sheet and animation previews."""
from pathlib import Path
import argparse
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--source',default='art/seasonal/turkey-king-sprites-v1')
parser.add_argument('--out',default='public/characters/turkey-king-v1')
parser.add_argument('--facing',choices=['left','right'],default='left')
args=parser.parse_args()
SOURCE=ROOT/args.source
OUT=ROOT/args.out
OUT.mkdir(parents=True,exist_ok=True)
data=np.array(Image.open(SOURCE/'poses-generated.png').convert('RGBA'))
height,width=data.shape[:2]
n,labels,stats,centers=cv2.connectedComponentsWithStats((data[:,:,3]>40).astype('uint8'),8)
mains=[i for i in range(1,n) if stats[i,4]>10000]
assert len(mains)==16,len(mains)
mains.sort(key=lambda i:(int(centers[i,1]/(height/4)),stats[i,0]))
groups={i:[i] for i in mains}
for c in range(1,n):
    if c in groups or stats[c,4]<60:continue
    cx,cy=centers[c]
    def distance(i):
        x,y,w,h,_=stats[i]
        return max(x-cx,0,cx-x-w)**2+max(y-cy,0,cy-y-h)**2
    near=min(mains,key=distance)
    if distance(near)<70**2:groups[near].append(c)
poses=[];anchors=[]
for main in mains:
    mask=cv2.dilate(np.isin(labels,groups[main]).astype('uint8'),np.ones((3,3),np.uint8))
    pixels=data.copy();pixels[:,:,3]=np.where(mask,data[:,:,3],0)
    im=Image.fromarray(pixels);im=im.crop(im.getbbox())
    alpha=np.array(im)[:,:,3]
    ys,xs=np.where(alpha>40)
    # Anchor the feet rather than the weapon's bounding-box center. This keeps
    # the body aligned when the staff extends far to the left during strikes.
    feet=xs[ys>=im.height*.85]
    anchor=float(np.median(feet))
    poses.append(im);anchors.append(anchor)
scale=min(500/max(p.height for p in poses),292/max(anchors),292/max(p.width-a for p,a in zip(poses,anchors)))
sheet=Image.new('RGBA',(2560,2560));frames=[]
frame_dir=SOURCE/'frames';frame_dir.mkdir(exist_ok=True)
names=['idle','walk-contact-left','walk-pass-left','walk-contact-right','walk-pass-right','jump-rise','jump-fall',
       'staff-windup','staff-strike','staff-recover','throw-windup','throw-release','throw-follow','hurt','defeat','victory']
for i,(pose,anchor) in enumerate(zip(poses,anchors)):
    resized=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    left=320-round(anchor*scale);top=600-resized.height
    assert left>=16 and left+resized.width<=624 and top>=16
    frame=Image.new('RGBA',(640,640));frame.alpha_composite(resized,(left,top))
    frame.save(frame_dir/f'{i+1:02d}-{names[i]}.png');frames.append(frame)
    sheet.alpha_composite(frame,((i%4)*640,(i//4)*640))
sheet.save(OUT/'spritesheet.png',optimize=True)
animations={
    'idle':{'frames':[0],'fps':1,'loop':True},
    'walk':{'frames':[1,2,3,4],'fps':7,'loop':True},
    'jump':{'frames':[5,6],'fps':6,'loop':False},
    'staff':{'frames':[7,8,9],'fps':10,'loop':False,'impactFrame':8},
    'throw':{'frames':[10,11,12],'fps':9,'loop':False,'releaseFrame':11},
    'hurt':{'frames':[13],'fps':4,'loop':False},
    'defeat':{'frames':[14],'fps':1,'loop':False},
    'victory':{'frames':[15],'fps':1,'loop':False},
}
metadata={'character':'The Turkey King','plannedUnlockCode':'allhailking','frameWidth':640,'frameHeight':640,
          'columns':4,'rows':4,'origin':[.5,600/640],'baseFacing':args.facing,'sharedSourceScale':scale,
          'frameNames':names,'animations':animations,'powerups':False,'integrated':False}
(OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
# Small previews use the exact shipped frames and anchor, composited on a
# checkerboard solely to show transparency and movement clearly.
bg=Image.new('RGBA',(320,320),'white');draw=ImageDraw.Draw(bg)
for y in range(0,320,16):
    for x in range(0,320,16):
        if (x//16+y//16)%2:draw.rectangle((x,y,x+15,y+15),fill='#e1e6eb')
for name,ids in {'walk-preview':[1,2,3,4],'staff-preview':[0,7,8,9,0],'throw-preview':[0,10,11,12,0]}.items():
    preview=[]
    for index in ids:
        f=bg.copy();f.alpha_composite(frames[index].resize((320,320),Image.Resampling.LANCZOS));preview.append(f.convert('RGB'))
    preview[0].save(SOURCE/f'{name}.gif',save_all=True,append_images=preview[1:],duration=150,loop=0)
print(json.dumps({'frames':len(frames),'size':sheet.size,'sharedScale':scale,'output':str(OUT)}))
