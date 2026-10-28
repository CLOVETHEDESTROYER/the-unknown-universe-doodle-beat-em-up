"""Prepare approved character references and pack generated signature animations.

Raw art uses six 512px slots (3 columns x 2 rows), with a shared foot baseline
at y=440. Runtime frames are 256px and atlas pages never exceed 1024px.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/signature-specials-v1'
OUT = ROOT / 'public/characters/signature-specials-v1'
SEEDS = {
    'xgod': ('characters/xgod/drawn-v1/idle.png', 768),
    'barrett': ('characters/playable-v3/barrett-idle.png', 640),
    'nico': ('characters/equipment-v4/nico-hands-idle.png', 768),
    'ezra': ('characters/playable-v3/ezra-idle.png', 640),
    'teleportation_c': ('characters/playable-v3/teleportation_c-idle.png', 640),
    'zgod': ('characters/z-god-v1/extras-idle.png', 768),
}

def references():
    ART.mkdir(parents=True, exist_ok=True)
    for hero, (path, width) in SEEDS.items():
        im = Image.open(ROOT / 'public' / path).convert('RGBA').crop((0, 0, width, 512))
        im = im.crop(im.getchannel('A').getbbox())
        im.thumbnail((300, 300), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (1536, 1024))
        canvas.alpha_composite(im, ((512-im.width)//2, 440-im.height))
        canvas.save(ART / f'{hero}-reference.png')
        seed = canvas.crop((0, 0, 512, 512))
        seed.save(ART / f'{hero}-seed.png')

def pack():
    OUT.mkdir(parents=True, exist_ok=True)
    preview = Image.new('RGBA', (6*256, len(SEEDS)*280), '#ddd8ce')
    manifest = {}
    for row, hero in enumerate(SEEDS):
        source = Image.open(ART / f'{hero}-source.png').convert('RGBA')
        pixels=np.asarray(source).copy()
        labels,_=ndimage.label(pixels[:,:,3]>210)
        counts=np.bincount(labels.ravel());boxes=ndimage.find_objects(labels)
        main=sorted(range(1,len(counts)),key=lambda i:-counts[i])[:6]
        if any(counts[i]<5000 for i in main):raise ValueError(f'{hero}: six complete poses required')
        main.sort(key=lambda i:(boxes[i-1][0].start+boxes[i-1][0].stop)/2)
        main=sorted(main[:3],key=lambda i:boxes[i-1][1].start)+sorted(main[3:],key=lambda i:boxes[i-1][1].start)
        # Generated effects can cross a nominal grid boundary. Assign alpha pixels
        # to the nearest complete pose instead of slicing through a face or flame.
        distance,nearest=ndimage.distance_transform_edt(~np.isin(labels,main),return_indices=True)
        owner=labels[tuple(nearest)]
        cells=[]
        for label in main:
            rgba=pixels.copy()
            rgba[:,:,3]=np.where((owner==label)&(distance<55),pixels[:,:,3],0)
            pose=Image.fromarray(rgba)
            cells.append(pose.crop(pose.getchannel('A').getbbox()))
        def anchor(cell):
            alpha=np.asarray(cell)[:,:,3]
            labels,_=ndimage.label(alpha>220)
            sizes=np.bincount(labels.ravel());sizes[0]=0
            mask=labels==sizes.argmax()
            yy,xx=np.where(mask);bottom=int(yy.max())+1;top=int(yy.min())
            feet=xx[yy>bottom-max(8,(bottom-top)*.12)]
            return (int(feet.min())+int(feet.max()))/2,bottom,bottom-top
        scale=min(150/max(anchor(cells[0])[2],anchor(cells[5])[2]),
                  244/max(c.width for c in cells),210/max(c.height for c in cells))
        # One shared scale, plus a stable bottom-center character anchor.
        frames = []
        for n in range(6):
            ax,ay,_=anchor(cells[n])
            resized=cells[n].resize((round(cells[n].width*scale),round(cells[n].height*scale)),Image.Resampling.LANCZOS)
            cell=Image.new('RGBA',(256,256))
            cell.alpha_composite(resized,(round(128-ax*scale),round(220-ay*scale)))
            if not cell.getchannel('A').getbbox():
                raise ValueError(f'{hero}: empty frame {n}')
            frames.append(cell)
            preview.alpha_composite(cell, (n*256, row*280+24))
        # Lossless trimmed atlas, one page shared by all six frames of this hero.
        page = Image.new('RGBA', (780, 520))
        entries = []
        for n, cell in enumerate(frames):
            box = cell.getchannel('A').getbbox()
            crop = cell.crop(box)
            x, y = (n % 3)*260+2, (n // 3)*260+2
            page.alpha_composite(crop, (x, y))
            entries.append({'filename':str(n), 'rotated':False, 'trimmed':True,
                'frame':{'x':x,'y':y,'w':crop.width,'h':crop.height},
                'sourceSize':{'w':256,'h':256},
                'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
        page.save(OUT / f'{hero}.png', optimize=True)
        (OUT / f'{hero}.json').write_text(json.dumps({'textures':[{'image':f'{hero}.png','frames':entries}]}, separators=(',',':')))
        manifest[hero] = {'frames':6,'frameSize':256,'baseline':220,'seed':SEEDS[hero][0]}
        ImageDraw.Draw(preview).text((8,row*280+5),hero,fill='#161426')
    (ART / 'metadata.json').write_text(json.dumps(manifest,indent=2)+'\n')
    fx=OUT/'fx';fx.mkdir(exist_ok=True)
    source=Image.open(ART/'ezra-pillar-source.png').convert('RGBA')
    flames=[]
    for n in range(4):
        cell=source.crop((round(n%2*source.width/2),round(n//2*source.height/2),
            round((n%2+1)*source.width/2),round((n//2+1)*source.height/2)))
        flames.append(cell.crop(cell.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox()))
    scale=min(180/max(c.width for c in flames),240/max(c.height for c in flames))
    page=Image.new('RGBA',(520,520));entries=[]
    for n,flame in enumerate(flames):
        flame=flame.resize((round(flame.width*scale),round(flame.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(256,256));cell.alpha_composite(flame,((256-flame.width)//2,248-flame.height))
        box=cell.getchannel('A').getbbox();crop=cell.crop(box);x,y=n%2*260+2,n//2*260+2
        page.alpha_composite(crop,(x,y))
        entries.append({'filename':str(n),'rotated':False,'trimmed':True,
            'frame':{'x':x,'y':y,'w':crop.width,'h':crop.height},'sourceSize':{'w':256,'h':256},
            'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
    page.save(fx/'ezra.png',optimize=True)
    (fx/'ezra.json').write_text(json.dumps({'textures':[{'image':'ezra.png','frames':entries}]},separators=(',',':')))
    preview.convert('RGB').save(ART / 'preview.jpg', quality=92)
    print('Packed six signature move atlases (1.5 MiB RGBA each; only selected hero loads).')

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--references',action='store_true')
    args=parser.parse_args()
    references() if args.references else pack()
