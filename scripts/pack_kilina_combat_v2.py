"""Pack whole generated silhouettes with the established Kilina scale and anchor."""
from pathlib import Path
import json
import importlib.util
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/kilina-combat-v2'
OUT=ROOT/'public/bosses/kilina-combat-v2'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('normalizer',Path.home()/'.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2/scripts/normalize_sprite_strip.py')
normalizer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(normalizer)

def silhouettes(image,minimum,rows):
    _,_,stats,_=cv2.connectedComponentsWithStats((np.array(image.getchannel('A'))>40).astype('uint8'),8)
    boxes=[tuple(map(int,s[:4])) for s in stats[1:] if s[4]>minimum]
    boxes.sort(key=lambda b:(int((b[1]+b[3]/2)/(image.height/rows)),b[0]))
    return [image.crop((max(0,x-2),max(0,y-2),min(image.width,x+w+2),min(image.height,y+h+2))) for x,y,w,h in boxes]

raw=Image.open(SOURCE/'poses-generated.png').convert('RGBA')
poses=silhouettes(raw,10000,3)
assert len(poses)==12,len(poses)
old=Image.open(ROOT/'public/bosses/kilina-witch-v1/walk.png').convert('RGBA').crop((0,0,640,640))
height=normalizer.crop_to_content(old,24).height
scale=min(height/poses[0].height,590/max(p.width for p in poses),560/max(p.height for p in poses))
sheet=Image.new('RGBA',(2560,1920))
frames=SOURCE/'frames'
frames.mkdir(exist_ok=True)
for i,pose in enumerate(poses):
    pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(640,640))
    frame.alpha_composite(pose,((640-pose.width)//2,600-pose.height))
    frame.save(frames/f'{i+1:02d}.png')
    sheet.alpha_composite(frame,((i%4)*640,(i//4)*640))
sheet.save(OUT/'attack.png',optimize=True)
fx=Image.open(SOURCE/'effects-generated.png').convert('RGBA')
effects=silhouettes(fx,15000,2)
assert len(effects)==4,len(effects)
names=['frost-hex','ice-shard','shadow-crescent','ice-prison']
for name,effect in zip(names,effects):
    effect.thumbnail((244,244),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(256,256))
    frame.alpha_composite(effect,((256-effect.width)//2,(256-effect.height)//2))
    frame.save(OUT/f'{name}.png',optimize=True)
(OUT/'metadata.json').write_text(json.dumps({'frameSize':640,'columns':4,'rows':3,'origin':[.5,600/640],'displayScale':.68,'sharedSourceScale':scale,'baseFacing':'right','poses':['frost-windup','frost-release','levitate','ice-storm','dash-windup','dash','dash-brake','rune-windup','rune-cast','hex-cast','recover','second-wind'],'effects':names},indent=2)+'\n')
print('Packed twelve Kilina poses and four spell effects:',OUT)
