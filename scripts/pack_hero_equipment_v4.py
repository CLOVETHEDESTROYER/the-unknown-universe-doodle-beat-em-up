"""Pack generated held equipment and death sequences without cutting nominal grid cells."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/hero-equipment-v4'
OUT=ROOT/'public/characters/equipment-v4'
OUT.mkdir(parents=True,exist_ok=True)
previous=json.loads((ROOT/'public/characters/playable-v3/metadata.json').read_text())
meta={}

def extract(path,counts):
    source=Image.open(path).convert('RGBA'); rgba=np.array(source);alpha=rgba[:,:,3]
    labels,n=ndimage.label(alpha>128);sizes=np.bincount(labels.ravel());pieces=[]
    objects=ndimage.find_objects(labels)
    extras={}
    if 'elemental' in str(path):
        # A floating halo is intentionally disconnected. Keep it with the nearest head below it.
        for small,b in enumerate(objects,1):
            if not 120<=sizes[small]<3000:continue
            sy,sx=b;cx=(sx.start+sx.stop)/2;candidates=[]
            for large,bb in enumerate(objects,1):
                if sizes[large]<3000:continue
                by,bx=bb
                if sy.stop<=by.start+(by.stop-by.start)*.15 and sy.start>=by.start-140 and bx.start-20<=cx<=bx.stop+20:
                    candidates.append(((cx-(bx.start+bx.stop)/2)**2+(by.start-sy.stop)**2,large))
            if candidates:extras.setdefault(min(candidates)[1],[]).append(small)
    for label,bounds in enumerate(objects,1):
        if sizes[label]<3000:continue
        y,x=bounds
        ids=[label,*extras.get(label,[])];region=ndimage.binary_dilation(np.isin(labels,ids),iterations=2)
        for small in ids[1:]:
            sy,sx=objects[small-1]
            y=slice(min(y.start,sy.start),max(y.stop,sy.stop));x=slice(min(x.start,sx.start),max(x.stop,sx.stop))
        pixels=rgba.copy();pixels[:,:,3]=np.where(region,alpha,0)
        frame=Image.fromarray(pixels).crop((max(0,x.start-2),max(0,y.start-2),min(source.width,x.stop+2),min(source.height,y.stop+2)))
        pieces.append((y.start,x.start,frame))
    assert len(pieces)==sum(counts),(path,len(pieces),sum(counts))
    pieces.sort(key=lambda p:p[0]);rows=[];start=0
    for count in counts:
        rows.append([p[2] for p in sorted(pieces[start:start+count],key=lambda p:p[1])]);start+=count
    return rows

def pack(hero,power,actions,scale,death=False):
    data={};review=Image.new('RGBA',(1024,256),'#dce5d6')
    for column,(action,frames) in enumerate(actions.items()):
        sheet=Image.new('RGBA',(768*len(frames),512));frame_data=[]
        for i,pose in enumerate(frames):
            a=pose.getchannel('A').point(lambda v:255 if v>128 else 0)
            feet=a.crop((0,int(pose.height*.8),pose.width,pose.height)).getbbox()
            anchor=pose.width/2 if death else (feet[0]+feet[2])/2
            resized=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
            x=round(384-anchor*scale);y=480-resized.height
            assert x>=8 and x+resized.width<=760 and y>=8,(hero,power,action,i,x,y,resized.size)
            cell=Image.new('RGBA',(768,512));cell.alpha_composite(resized,(x,y))
            pixels=np.array(cell);r,g,b,alpha=[pixels[:,:,c].astype(float) for c in range(4)]
            mask=(alpha>128)&(g>r*1.2)&(g>b*1.2) if power=='blaster' else (alpha>128)&(b>r*1.25)&(g>r*1.1)
            mask[:40,:]=False;mask[430:,:]=False
            yy,xx=np.where(mask)
            point=None
            if len(xx):
                tip=int(np.quantile(xx,.99));band=yy[xx>=tip-4]
                point=[tip+3,int(np.median(band))]
            frame_data.append({'bounds':list(cell.getchannel('A').getbbox()),'muzzle':point if power=='blaster' else None,'hand':point if power=='frost' else None})
            sheet.alpha_composite(cell,(i*768,0))
            if i==0 and column<4:review.alpha_composite(cell.resize((256,171)),(column*256,40))
            if death and i<4:review.alpha_composite(cell.resize((256,171)),(i*256,40))
        sheet.save(OUT/f'{hero}-{power}-{action}.png')
        data[action]={'frames':len(frames),'poses':frame_data}
    review.convert('RGB').save(ART/f'{hero}-{power}-preview.jpg',quality=92)
    meta.setdefault(hero,{})[power]=data

deaths=extract(ART/'deaths-spaced-source.png',[4]*4)
for row,hero in enumerate(('barrett','nico','ezra','teleportation_c')):
    box=previous[hero]['actions']['idle']['bounds'][0];target=box[3]-box[1]
    rows=extract(ART/f'{hero}-weapons-source.png',[8,7 if hero=='ezra' else 8,8,8])
    all_frames=[f for r in rows for f in r]
    scale=min(target/rows[1][4].height,445/max(f.height for f in all_frames),596/max(f.width for f in all_frames))
    for index,power in enumerate(('blaster','sword')):
        run,poses=rows[index*2:index*2+2]
        attacks=poses[5:] if len(poses)==8 else [poses[4],*poses[5:]]
        pack(hero,power,{'run':run,'jump':poses[:4],'idle':[poses[4]],'attack':attacks},scale)
    path=ART/(f'{hero}-elemental-corrected.png' if hero=='nico' else 'ezra-elemental-final.png' if hero=='ezra' else f'{hero}-elemental-source.png')
    rows=extract(path,[8]*3 if hero=='ezra' else [4]*6)
    groups=[rows[i] if hero=='ezra' else rows[i*2]+rows[i*2+1] for i in range(3)]
    all_frames=[f for group in groups for f in group]
    scale=min(target/groups[0][6].height,445/max(f.height for f in all_frames),596/max(f.width for f in all_frames))
    for power,poses in zip(('frost','ember','storm'),groups):
        # Barrett's generated falling frost pose omitted the glove; retain the complete equipped rising drawing.
        jumps=[poses[4],poses[4] if hero=='barrett' and power=='frost' else poses[5]]
        pack(hero,power,{'run':poses[:4],'jump':jumps,'idle':[poses[6]],'attack':[poses[7]]},scale)
    d=deaths[row];scale=min(target/d[0].height,596/max(f.width for f in d))
    pack(hero,'death',{'collapse':d},scale,True)

rows=extract(ART/'nico-unarmed-source.png',[4]*4);f=sum(rows,[])
box=previous['nico']['actions']['idle']['bounds'][0];scale=(box[3]-box[1])/f[12].height
pack('nico','hands',{'run':f[:8],'jump':f[8:12],'idle':[f[12]],'attack':f[13:16]},scale)
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Packed all four heroes: five equipped sets each, four collapse sequences and Nico unarmed.')
