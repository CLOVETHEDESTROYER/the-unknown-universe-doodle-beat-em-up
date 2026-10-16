"""Normalize generated intact/attack/wreck poses using one scale and hull baseline."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'art/starbreak-finale-v3/pursuer-poses-generated.png').convert('RGBA')
alpha=np.asarray(source)[:,:,3]
spans=[];start=None
for x,on in enumerate([*(alpha>32).any(axis=0),False]):
    if on and start is None:start=x
    if not on and start is not None:
        if x-start>250:spans.append((start,x))
        start=None
if len(spans)!=3:raise ValueError(f'Expected three separated ships: {spans}')
boxes=[]
for left,right in spans:
    box=source.crop((left,0,right,source.height)).getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    boxes.append((left+box[0],box[1],left+box[2],box[3]))
scale=min(600/max(b[2]-b[0] for b in boxes),340/max(b[3]-b[1] for b in boxes))
sheet=Image.new('RGBA',(1920,400))
for i,box in enumerate(boxes):
    crop=source.crop(box)
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    # Reactor/hull centre remains at the same original vertical line in every pose.
    y=round(200-(source.height*.5-box[1])*scale)
    sheet.alpha_composite(crop,(i*640+round(320-crop.width/2),y))
sheet.save(ROOT/'public/flight/void-pursuer-v3.png',optimize=True)
(ROOT/'art/starbreak-finale-v3/pursuer-metadata.json').write_text(json.dumps({'frameWidth':640,'frameHeight':400,'scale':scale,'origin':[.5,.5],'poses':['ready','attack','wreck']},indent=2))
preview=Image.new('RGBA',sheet.size,'#aaabc3');preview.alpha_composite(sheet)
out=ROOT/'output/starbreak-finale-v3';out.mkdir(parents=True,exist_ok=True)
preview.convert('RGB').save(out/'pursuer-review.jpg',quality=95)
print('Packed pursuer with shared scale',scale)
