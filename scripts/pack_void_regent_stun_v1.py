"""Pack the generated four-pose stun strip with the shipped Regent's anchor/scale."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/void-regent-stun-v1'
OUT=ROOT/'public/bosses/void-regent-stun-v1'
OUT.mkdir(parents=True,exist_ok=True)
raw=Image.open(SOURCE/'generated.png').convert('RGBA');data=np.array(raw)
n,labels,stats,centers=cv2.connectedComponentsWithStats((data[:,:,3]>40).astype('uint8'),8)
mains=sorted([i for i in range(1,n) if stats[i,4]>15000],key=lambda i:stats[i,0])
assert len(mains)==4,len(mains)
groups={i:[i] for i in mains}
for c in range(1,n):
    if c in groups or stats[c,4]<80:continue
    cx,cy=centers[c]
    def distance(i):
        x,y,w,h,_=stats[i];return max(x-cx,0,cx-x-w)**2+max(y-cy,0,cy-y-h)**2
    near=min(mains,key=distance)
    if distance(near)<65**2:groups[near].append(c)
poses=[]
for main in mains:
    keep=cv2.dilate(np.isin(labels,groups[main]).astype('uint8'),np.ones((3,3),np.uint8))
    pixels=data.copy();pixels[:,:,3]=np.where(keep,data[:,:,3],0)
    im=Image.fromarray(pixels);poses.append(im.crop(im.getbbox()))
ref=Image.open(ROOT/'art/void-regent-v4/frames/11.png').convert('RGBA')
scale=min((ref.getbbox()[3]-ref.getbbox()[1])/poses[3].height,590/max(p.width for p in poses),560/max(p.height for p in poses))
sheet=Image.new('RGBA',(2560,640));frames=SOURCE/'frames';frames.mkdir(exist_ok=True)
for i,pose in enumerate(poses):
    pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(640,640));frame.alpha_composite(pose,((640-pose.width)//2,600-pose.height))
    frame.save(frames/f'{i+1:02d}.png');sheet.alpha_composite(frame,(i*640,0))
sheet.save(OUT/'stun.png',optimize=True)
(OUT/'metadata.json').write_text(json.dumps({'frameSize':640,'frames':4,'origin':[.5,600/640],'sharedSourceScale':scale,'poses':['recoil','dazed-left','dazed-right','slump']},indent=2)+'\n')
