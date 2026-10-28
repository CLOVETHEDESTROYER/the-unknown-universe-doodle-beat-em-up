"""Normalize generated whole sheets into shared-scale, foot-anchored atlases.

Grid cells guide ordering, not clipping: an overhead sword may cross a slot edge.
This extends the sprite skill's strip normalization for 2-row, hand-drawn sheets.
No character artwork is redrawn; only alpha extraction/resampling/packing occurs.
"""
from pathlib import Path
import json
import sys
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/hero-celebrations-v1'
OUT=ROOT/'public/characters/celebrations-v1'
HEROES=['xgod','barrett','nico','ezra','teleportation_c','zgod','xgod-sword']
CELL=384
BASELINE=352

def pack(hero):
    count=6 if hero=='xgod-sword' else 4
    columns=3 if count==6 else 2
    pixels=np.array(Image.open(ART/f'{hero}-source.png').convert('RGBA'))
    assert pixels[:,:,3].min()==0,'Real alpha transparency is required'
    labels,n=ndimage.label(pixels[:,:,3]>40)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    selected=np.argsort(sizes)[-count:]
    assert min(sizes[selected])>4000,('Missing complete poses',hero)
    centers=ndimage.center_of_mass(pixels[:,:,3],labels,selected)
    selected=[label for _,label in sorted(zip(centers,selected),key=lambda v:v[0][0])]
    selected=sum([sorted(selected[i:i+columns],key=lambda label:ndimage.center_of_mass(pixels[:,:,3],labels,[label])[0][1]) for i in range(0,count,columns)],[])
    # Keep antialiased outlines next to their body; reject neighboring pose pixels
    # and disconnected haze. The original alpha, including attached flame, stays.
    distance,nearest=ndimage.distance_transform_edt(~np.isin(labels,selected),return_indices=True)
    owner=labels[tuple(nearest)]
    poses=[];anchors=[]
    for label in selected:
        rgba=pixels.copy();rgba[:,:,3]=np.where((owner==label)&(distance<4),pixels[:,:,3],0)
        image=Image.fromarray(rgba);box=image.getchannel('A').getbbox();assert box
        image=image.crop(box);poses.append(image)
        mask=np.array(image.getchannel('A'))>40
        band=mask[int(image.height*.9):]
        yy,xx=np.where(band);assert len(xx)
        anchors.append(((int(xx.min())+int(xx.max())+1)/2,image.height))
    reference_height=166 if hero!='zgod' else 150
    scale=min(reference_height/poses[0].height,330/max(p.height for p in poses),
        180/max(ax for ax,_ in anchors),180/max(p.width-ax for p,(ax,_) in zip(poses,anchors)))
    cells=[];entries=[];atlas=Image.new('RGBA',(1024,1024))
    review=Image.new('RGBA',(columns*CELL,2*(CELL+28)),'#5a5665');draw=ImageDraw.Draw(review)
    x=y=2;row_height=0
    for i,(pose,(ax,ay)) in enumerate(zip(poses,anchors)):
        resized=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(CELL,CELL))
        px=round(CELL/2-ax*scale);py=round(BASELINE-ay*scale)
        assert px>=0 and py>=0 and px+resized.width<=CELL and py+resized.height<=CELL,(hero,i)
        cell.alpha_composite(resized,(px,py));cells.append(cell)
        box=cell.getchannel('A').getbbox();crop=cell.crop(box)
        if x+crop.width+2>1024:x=2;y+=row_height+4;row_height=0
        assert y+crop.height+2<=1024
        atlas.alpha_composite(crop,(x,y))
        entries.append({'filename':str(i),'rotated':False,'trimmed':True,'frame':{'x':x,'y':y,'w':crop.width,'h':crop.height},
            'sourceSize':{'w':CELL,'h':CELL},'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
        x+=crop.width+4;row_height=max(row_height,crop.height)
        rx=i%columns*CELL;ry=i//columns*(CELL+28)
        review.alpha_composite(cell,(rx,ry));draw.line((rx,ry+BASELINE,rx+CELL,ry+BASELINE),fill='#e2d296')
        draw.text((rx+8,ry+CELL),str(i),fill='white')
    OUT.mkdir(parents=True,exist_ok=True)
    atlas=atlas.crop((0,0,1024,y+row_height+2))
    atlas.save(OUT/f'{hero}.webp',lossless=True,method=6,exact=True)
    (OUT/f'{hero}.json').write_text(json.dumps({'textures':[{'image':f'{hero}.webp','frames':entries}]},separators=(',',':'))+'\n')
    review.convert('RGB').save(ART/f'{hero}-review.jpg',quality=94)
    (ART/f'{hero}-metadata.json').write_text(json.dumps({'frames':count,'baseline':BASELINE,'cell':CELL,'scale':scale,
        'sourceBodyBounds':[p.size for p in poses],'atlas':atlas.size,'extraction':'connected body alpha, outline padding, shared scale, bottom-boot midpoint'},indent=2)+'\n')
    print(hero,count,atlas.size,(OUT/f'{hero}.webp').stat().st_size,'bytes')

if __name__=='__main__':
    for hero in sys.argv[1:] or HEROES:
        assert hero in HEROES
        pack(hero)
