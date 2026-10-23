"""Pack sixteen generated action poses per unlockable hero, retaining one scale/foot anchor."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/roster-mobility-v2';OUT=ROOT/'public/characters/mobility-v2'
HEROES=('barrett','nico','ezra','teleportation_c')

def pack(hero):
    source=Image.open(ART/f'{hero}-source.png').convert('RGBA');pixels=np.array(source)
    assert pixels[:,:,3].min()==0,'Transparent source required'
    labels,_=ndimage.label(pixels[:,:,3]>210)
    counts=np.bincount(labels.ravel());boxes=ndimage.find_objects(labels)
    main=sorted(range(1,len(counts)),key=lambda i:-counts[i])[:16]
    assert min(counts[i] for i in main)>5000,'Sixteen complete body poses required'
    main.sort(key=lambda i:boxes[i-1][0].start)
    main=sum([sorted(main[row:row+4],key=lambda i:boxes[i-1][1].start) for row in range(0,16,4)],[])
    distance,nearest=ndimage.distance_transform_edt(~np.isin(labels,main),return_indices=True)
    owner=labels[tuple(nearest)];poses=[]
    for label in main:
        rgba=pixels.copy()
        rgba[:,:,3]=np.where((owner==label)&(distance<3),pixels[:,:,3],0)
        cell=Image.fromarray(rgba);box=cell.getchannel('A').getbbox()
        assert box
        poses.append(cell.crop(box))
    scale=min(170/poses[7].height,210/max(p.height for p in poses),238/max(p.width for p in poses))
    sheet=Image.new('RGBA',(1040,1040));review=Image.new('RGBA',(1040,1120),'#736c78');draw=ImageDraw.Draw(review);entries=[]
    for n,pose in enumerate(poses):
        pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(256,256));y=round(150-pose.height/2) if n<4 else 220-pose.height
        cell.alpha_composite(pose,((256-pose.width)//2,y));box=cell.getchannel('A').getbbox();crop=cell.crop(box)
        x,ay=n%4*260+2,n//4*260+2;sheet.alpha_composite(crop,(x,ay))
        review.alpha_composite(cell,(n%4*260,n//4*280+12));draw.text((n%4*260+10,n//4*280+260),str(n),fill='white')
        entries.append({'filename':str(n),'rotated':False,'trimmed':True,'frame':{'x':x,'y':ay,'w':crop.width,'h':crop.height},'sourceSize':{'w':256,'h':256},'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
    OUT.mkdir(parents=True,exist_ok=True);sheet.save(OUT/f'{hero}.webp',lossless=True,method=6,exact=True)
    (OUT/f'{hero}.json').write_text(json.dumps({'textures':[{'image':f'{hero}.webp','frames':entries}]},separators=(',',':')),encoding='utf-8')
    review.convert('RGB').save(ART/f'{hero}-review.jpg',quality=92)
    (ART/f'{hero}-metadata.json').write_text(json.dumps({'scale':scale,'extraction':'sixteen connected body components; nearest outline; no translucent aura','frames':16,'baseline':220,'logicalCell':256},indent=2),encoding='utf-8')
    print(hero,(OUT/f'{hero}.webp').stat().st_size,'bytes')

if __name__=='__main__':
    import sys
    for hero in sys.argv[1:] or HEROES:pack(hero)
