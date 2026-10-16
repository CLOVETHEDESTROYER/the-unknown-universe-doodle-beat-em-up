"""Normalize approved generated poses; preserve drawing scale and isolate neighboring cells."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/playable-motion-v3'
DEST = ROOT / 'public/characters/playable-v3'
DEST.mkdir(parents=True, exist_ok=True)
metadata = {}

def extract(path, rows):
    source = Image.open(path).convert('RGBA')
    alpha = np.array(source.getchannel('A'))
    labels, count = ndimage.label(alpha > 128)
    sizes = np.bincount(labels.ravel())
    objects = ndimage.find_objects(labels)
    pieces = []
    for label, bounds in enumerate(objects, 1):
        if sizes[label] < 2000:
            continue
        y, x = bounds
        # Retain original alpha around the selected connected drawing, excluding nearby poses/noise.
        region = ndimage.binary_dilation(labels == label, iterations=2)
        pixels = np.array(source)
        pixels[:, :, 3] = np.where(region, alpha, 0)
        frame = Image.fromarray(pixels).crop((max(0,x.start-2), max(0,y.start-2), min(source.width,x.stop+2), min(source.height,y.stop+2)))
        pieces.append((y.start, x.start, frame))
    assert len(pieces) == rows * 4, (path, len(pieces))
    pieces.sort(key=lambda p: p[0])
    ordered = []
    for row in range(rows):
        ordered += [p[2] for p in sorted(pieces[row*4:row*4+4], key=lambda p:p[1])]
    return ordered

def pack(hero, actions, height=330):
    frames = [f for a in actions.values() for f in a]
    scale = min(height/max(f.height for f in frames), 520/max(f.width for f in frames))
    data = {'cellWidth':640, 'cellHeight':512, 'baseline':480, 'scale':scale, 'actions':{}}
    preview = Image.new('RGBA', (8*256, len(actions)*256), '#dce5d6')
    for row,(action,poses) in enumerate(actions.items()):
        sheet = Image.new('RGBA', (640*len(poses),512))
        bounds = []
        for i,pose in enumerate(poses):
            # Center on the feet, keeping a forward-reaching arm/launcher from shifting the torso.
            a = pose.getchannel('A').point(lambda v:255 if v>128 else 0)
            feet = a.crop((0,int(pose.height*.8),pose.width,pose.height)).getbbox()
            anchor = (feet[0]+feet[2])/2
            resized = pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
            x=round(320-anchor*scale); y=480-resized.height
            assert x>=8 and x+resized.width<=632 and y>=8, (hero,action,i,x,y,resized.size)
            cell=Image.new('RGBA',(640,512));cell.alpha_composite(resized,(x,y))
            bounds.append(list(cell.getchannel('A').getbbox()))
            sheet.alpha_composite(cell,(i*640,0))
            if i<8:preview.alpha_composite(cell.resize((256,205)),(i*256,row*256))
        sheet.save(DEST/f'{hero}-{action}.png')
        data['actions'][action]={'frames':len(poses),'bounds':bounds}
    preview.convert('RGB').save(ART/f'{hero}-preview.jpg',quality=92)
    metadata[hero]=data

for hero in ('barrett','nico','ezra'):
    f=extract(ART/f'{hero}-source.png',4)
    pack(hero,{'run':f[:8],'jump':f[8:12],'idle':[f[12]],'attack':f[13:16]})

f=extract(ART/'teleportation-c-source.png',2)
pack('teleportation_c',{'jump':f[:4],'idle':[f[4]],'land':[f[5]],'arrival':[f[7]]})
(DEST/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('Packed four playable heroes with complete padded frames and shared per-hero scale.')
