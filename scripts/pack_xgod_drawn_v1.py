"""Pack drawn X God sequences, retaining complete poses and a shared foot baseline."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/xgod-drawn-v1'
OUT = ROOT / 'public/characters/xgod/drawn-v1'
OUT.mkdir(parents=True, exist_ok=True)
W, H, BASE = 768, 512, 480
meta = {'frameWidth':W, 'frameHeight':H, 'baseline':BASE, 'actions':{}}
review = Image.new('RGBA', (1536, 7*220), '#e8e0d0')


def extract(path, rows):
    im = Image.open(path).convert('RGBA')
    pixels = np.array(im);alpha = pixels[:, :, 3]
    labels, _ = ndimage.label(alpha > 128)
    sizes = np.bincount(labels.ravel());objects = ndimage.find_objects(labels)
    main = [i for i in range(1,len(sizes)) if sizes[i] > 2500]
    if len(main) != sum(rows):
        raise ValueError((str(path),len(main),sum(rows)))
    main.sort(key=lambda i:(objects[i-1][0].start+objects[i-1][0].stop)/2)
    ordered=[];offset=0
    for count in rows:
        ordered += sorted(main[offset:offset+count],key=lambda i:objects[i-1][1].start)
        offset+=count
    centers=[((objects[i-1][1].start+objects[i-1][1].stop)/2,
              (objects[i-1][0].start+objects[i-1][0].stop)/2) for i in ordered]
    ids={i:[i] for i in ordered}
    for i,bounds in enumerate(objects,1):
        if i in ids or sizes[i]<12:continue
        # Detached emitted rounds must not become artifacts behind the next pose.
        if path.name=='blaster-source.png':continue
        y,x=bounds;cx,cy=(x.start+x.stop)/2,(y.start+y.stop)/2
        n=min(range(len(main)),key=lambda n:(centers[n][0]-cx)**2+(centers[n][1]-cy)**2)
        if abs(centers[n][0]-cx)<im.width*.22 and abs(centers[n][1]-cy)<im.height*.17:ids[ordered[n]].append(i)
    result=[]
    for i in ordered:
        region=ndimage.binary_dilation(np.isin(labels,ids[i]),iterations=2)
        rgba=pixels.copy();rgba[:,:,3]=np.where(region,alpha,0)
        pose=Image.fromarray(rgba);result.append(pose.crop(pose.getchannel('A').getbbox()))
    return result


def body_height(pose):
    p=np.array(pose).astype(float);r,g,b,a=[p[:,:,i] for i in range(4)]
    yy,xx=np.where((a>128)&(g>125)&(g>r*.97)&(g>b*1.7))
    return pose.height-(int(np.quantile(yy,.01)) if len(yy) else 0)


def scale_for(poses,reference):
    return min(330/body_height(reference),440/max(f.height for f in poses),650/max(f.width for f in poses))


def pack(action,poses,scale,review_row=None,review_col=0):
    cols=min(4,len(poses));sheet=Image.new('RGBA',(W*cols,H*((len(poses)+cols-1)//cols)))
    data={'frames':len(poses),'fps':16 if action.endswith('run') else 6,'attachments':[],'bounds':[]}
    for n,pose in enumerate(poses):
        a=pose.getchannel('A').point(lambda v:255 if v>128 else 0)
        feet=a.crop((0,int(pose.height*.84),pose.width,pose.height)).getbbox()
        anchor=pose.width/2 if action=='death' else (feet[0]+feet[2])/2
        scaled=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        x,y=round(W/2-anchor*scale),BASE-scaled.height
        if x<8 or y<8 or x+scaled.width>W-8:raise ValueError((action,n,x,y,scaled.size))
        cell=Image.new('RGBA',(W,H));cell.alpha_composite(scaled,(x,y))
        p=np.array(cell).astype(float);r,g,b,alpha=[p[:,:,k] for k in range(4)]
        # Barrel/muzzle: the rightmost lime component below the hair.
        green=(alpha>128)&(g>r*1.05)&(g>b*1.5)&(g>110)
        green[:270]=False;green[430:]=False;green[:,:W//2]=False
        yy,xx=np.where(green);muzzle=None
        if action.startswith('blaster-') and len(xx):
            tip=int(np.quantile(xx,.99));muzzle=[tip+2,int(np.median(yy[xx>=tip-5]))]
            labels,_=ndimage.label(green);sizes=np.bincount(labels.ravel());caps=[]
            for label,box in enumerate(ndimage.find_objects(labels),1):
                cy,cx=box;cw,ch=cx.stop-cx.start,cy.stop-cy.start
                if sizes[label]>=50 and 6<=cw<=40 and ch>=20 and ch>cw*1.2:
                    caps.append((cx.stop,(cy.start+cy.stop)/2))
            # Use the narrow green barrel opening, not the broad muzzle flash.
            if caps:
                cap=max(caps,key=lambda c:c[0]);muzzle=[cap[0]+2,round(cap[1])]
        data['attachments'].append({'muzzle':muzzle})
        data['bounds'].append(list(cell.getchannel('A').getbbox()))
        sheet.alpha_composite(cell,((n%cols)*W,(n//cols)*H))
        if n==0 and review_row is not None:
            review.alpha_composite(cell.resize((256,171)),(review_col*256,review_row*220+30))
            ImageDraw.Draw(review).text((review_col*256+8,review_row*220+10),action,fill='#201d2d')
    sheet.save(OUT/f'{action}.png',optimize=True)
    meta['actions'][action]=data


for row,prefix in enumerate(['hands','blaster']):
    f=extract(ART/f'{prefix}-source.png',[4]*4);scale=scale_for(f,f[12]);name='' if prefix=='hands' else 'blaster-'
    for col,(action,poses) in enumerate([('run',f[:8]),('jump',f[8:12]),('idle',[f[12]]),('attack',f[13:16])]):
        pack(name+action,poses,scale,row,col)

f=extract(ART/'utility-source.png',[4]*4);scale=scale_for(f,f[0])
for col,(action,poses) in enumerate([('idle',f[:4]),('crouch',f[4:8]),('blaster-idle',f[8:12]),('blaster-crouch',f[12:16])]):
    pack(action,poses,scale,2,col)
f=extract(ART/'reactions-source.png',[4]*4);scale=scale_for(f,f[0])
for col,(action,poses) in enumerate([('damage',f[:4]),('death',f[4:8]),('skid',f[8:12]),('blaster-skid',f[12:16])]):
    pack(action,poses,scale,3,col)
f=extract(ART/'sword-support-source.png',[4]*4);scale=scale_for(f,f[0])
for col,(action,poses) in enumerate([('sword-idle',f[:4]),('sword-jump',f[4:8]),('sword-crouch',f[8:12]),('sword-skid',f[12:16])]):
    pack(action,poses,scale,4,col)
f=extract(ART/'sword-attack-alpha-source.png',[3,3]);pack('sword-attack',f,scale_for(f,f[0]),5,0)

# Retain the existing approved drawn run choreography, with the shared padded frame.
im=Image.open(ROOT/'public/xgod_side_scroll_fire_sword_run_v1.png').convert('RGBA')
f=[]
for i in range(im.width//512):
    cell=im.crop((i*512,0,(i+1)*512,512));f.append(cell.crop(cell.getchannel('A').getbbox()))
pack('sword-run',f,scale_for(f,f[0]),5,1)
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
review.convert('RGB').save(ART/'animation-preview.jpg',quality=93)
print(f'Packed {len(meta["actions"])} drawn X God animation sheets; originals preserved.')
