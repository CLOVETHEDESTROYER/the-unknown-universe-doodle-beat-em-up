"""Normalize the twelve-pose Regent sheet, including his floating crown."""
from pathlib import Path
import importlib.util
import json
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/void-regent-v4'
OUT=ROOT/'public/bosses/void-regent-v4'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('normalizer',Path.home()/'.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2/scripts/normalize_sprite_strip.py')
normalizer=importlib.util.module_from_spec(spec);spec.loader.exec_module(normalizer)
raw=Image.open(SOURCE/'poses-generated.png').convert('RGBA')
data=np.array(raw);n,labels,stats,centers=cv2.connectedComponentsWithStats((data[:,:,3]>40).astype('uint8'),8)
mains=[i for i in range(1,n) if stats[i,4]>15000]
assert len(mains)==12,len(mains)
mains.sort(key=lambda i:(int(centers[i,1]/(raw.height/3)),stats[i,0]))
groups={i:[i] for i in mains}
for component in range(1,n):
    if component in groups or stats[component,4]<80:continue
    cx,cy=centers[component]
    def distance(i):
        x,y,w,h,_=stats[i]
        return max(x-cx,0,cx-x-w)**2+max(y-cy,0,cy-y-h)**2
    nearest=min(mains,key=distance)
    if distance(nearest)<55**2:groups[nearest].append(component)
poses=[]
for main in mains:
    keep=np.isin(labels,groups[main]).astype('uint8')
    keep=cv2.dilate(keep,np.ones((3,3),np.uint8))
    frame=data.copy();frame[:,:,3]=np.where(keep,data[:,:,3],0)
    poses.append(normalizer.crop_to_content(Image.fromarray(frame),24))
old=Image.open(ROOT/'public/bosses/encounters-v2/void_regent/attack.png').convert('RGBA').crop((0,0,640,640))
height=normalizer.crop_to_content(old,24).height
scale=min(height/poses[0].height,590/max(p.width for p in poses),560/max(p.height for p in poses))
sheet=Image.new('RGBA',(2560,1920));frames=SOURCE/'frames';frames.mkdir(exist_ok=True)
for i,pose in enumerate(poses):
    pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(640,640));frame.alpha_composite(pose,((640-pose.width)//2,600-pose.height))
    frame.save(frames/f'{i+1:02d}.png');sheet.alpha_composite(frame,((i%4)*640,(i//4)*640))
sheet.save(OUT/'attack.png',optimize=True)
(OUT/'metadata.json').write_text(json.dumps({'frameSize':640,'columns':4,'rows':3,'origin':[.5,600/640],'displayScale':.9,'sharedSourceScale':scale,'baseFacing':'left','poses':['star-windup','star-release','nova-charge','nova-release','crash-windup','crash-rise','crash-dive','crash-impact','shadow-dash','rift-cast','recover','ascension']},indent=2)+'\n')
print('Packed twelve Regent poses with floating crowns:',OUT)
