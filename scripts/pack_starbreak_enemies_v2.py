"""Extract the three generated silhouettes, preserving their original transparency."""
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'art/starbreak-combat-v2/enemies-generated.png').convert('RGBA')
alpha=np.asarray(source)[:,:,3]
columns=(alpha>32).any(axis=0)
spans=[]
start=None
for x,occupied in enumerate([*columns,False]):
    if occupied and start is None:start=x
    if not occupied and start is not None:
        if x-start>150:spans.append((start,x))
        start=None
if len(spans)!=3:raise ValueError(f'Expected three separated silhouettes: {spans}')
for name,(left,right) in zip(['scout','interceptor','gunship'],spans):
    crop=source.crop((left,0,right,source.height))
    box=crop.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    crop=crop.crop(box)
    margin=round(max(crop.size)*.05)
    out=Image.new('RGBA',(crop.width+2*margin,crop.height+2*margin))
    out.alpha_composite(crop,(margin,margin))
    out.save(ROOT/f'public/flight/{name}-v2.png',optimize=True)
    print(name,out.size)
