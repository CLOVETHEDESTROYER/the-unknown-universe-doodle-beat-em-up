"""Pack generated ice-gauntlet X-God frames; retain source art and hand sockets."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/xgod-frost-v1';OUT=ROOT/'public/characters/xgod/frost-v1'
OUT.mkdir(parents=True,exist_ok=True)
W,H,BASE=768,512,480
meta={'frameWidth':W,'frameHeight':H,'baseline':BASE,'actions':{}}
review=Image.new('RGB',(2048,7*200),'#eae3d8');draw=ImageDraw.Draw(review)

def extract(name):
    rgba=np.array(Image.open(ART/f'{name}-source.png').convert('RGBA'))
    assert rgba[:,:,3].min()==0
    labels,count=ndimage.label(rgba[:,:,3]>128)
    sizes=np.bincount(labels.ravel());boxes=ndimage.find_objects(labels)
    mains=[i for i in range(1,count+1) if sizes[i]>8000]
    assert len(mains)==16,(name,len(mains))
    mains.sort(key=lambda i:(boxes[i-1][0].start+boxes[i-1][0].stop)/2)
    mains=[i for r in range(0,16,4) for i in sorted(mains[r:r+4],key=lambda i:boxes[i-1][1].start)]
    centers=[((boxes[i-1][1].start+boxes[i-1][1].stop)/2,(boxes[i-1][0].start+boxes[i-1][0].stop)/2) for i in mains]
    groups={i:[i] for i in mains}
    for i,b in enumerate(boxes,1):
        if i in groups or b is None or sizes[i]<8:continue
        y,x=b;cx,cy=(x.start+x.stop)/2,(y.start+y.stop)/2
        n=min(range(16),key=lambda n:(cx-centers[n][0])**2+(cy-centers[n][1])**2)
        groups[mains[n]].append(i)
    poses=[]
    for i in mains:
        region=ndimage.binary_dilation(np.isin(labels,groups[i]),iterations=2)
        pixels=rgba.copy();pixels[:,:,3]=np.where(region,rgba[:,:,3],0)
        im=Image.fromarray(pixels);poses.append(im.crop(im.getbbox()))
    return poses

def pack(action,poses,scale,row):
    cells=[];entries=[]
    for n,pose in enumerate(poses):
        mask=pose.getchannel('A').point(lambda a:255 if a>128 else 0)
        feet=mask.crop((0,int(pose.height*.85),pose.width,pose.height)).getbbox()
        ax=(feet[0]+feet[2])/2
        pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        x,y=round(W/2-ax*scale),BASE-pose.height
        assert x>8 and y>8 and x+pose.width<W-8
        cell=Image.new('RGBA',(W,H));cell.alpha_composite(pose,(x,y));cells.append(cell)
        p=np.array(cell).astype(float);r,g,b,a=[p[:,:,k] for k in range(4)]
        cyan=(a>128)&(b>r*1.2)&(g>r*1.1)&(b>100)
        cyan[:220]=False;cyan[460:]=False;cyan[:,:W//2]=False
        yy,xx=np.where(cyan)
        assert len(xx)>20,(action,n,'gauntlet not found')
        tip=int(np.quantile(xx,.98));hand=[tip+2,round(float(np.median(yy[xx>=tip-7])))]
        entries.append({'bounds':list(cell.getbbox()),'hand':hand})
        thumb=cell.resize((256,171));review.paste(thumb,(n*256,row*200+23),thumb)
        draw.text((n*256+8,row*200+5),f'{action} {n+1}',fill='#2b2336')
        folder=ART/'frames'/action;folder.mkdir(parents=True,exist_ok=True);cell.save(folder/f'{n:02}.png')
    tw=max(c.getbbox()[2]-c.getbbox()[0] for c in cells)+4
    th=max(c.getbbox()[3]-c.getbbox()[1] for c in cells)+4
    cols=min(4,len(cells));page=Image.new('RGBA',(tw*cols,th*((len(cells)+cols-1)//cols)))
    assert max(page.size)<=2048
    frames=[]
    for n,cell in enumerate(cells):
        box=cell.getbbox();crop=cell.crop(box);x,y=n%cols*tw+2,n//cols*th+2
        page.alpha_composite(crop,(x,y))
        frames.append({'filename':str(n),'rotated':False,'trimmed':True,'frame':{'x':x,'y':y,'w':crop.width,'h':crop.height},
          'sourceSize':{'w':W,'h':H},'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
    page.save(OUT/f'{action}.webp',lossless=True,exact=True,method=6)
    (OUT/f'{action}.json').write_text(json.dumps({'textures':[{'image':f'{action}.webp','frames':frames}]}))
    meta['actions'][action]={'frames':len(cells),'fps':12 if action=='run' else 10 if action=='attack' else 7,'poses':entries}
    gif=[]
    for cell in cells:
        bg=Image.new('RGBA',(W,H),'#eae3d8');bg.alpha_composite(cell);bg.thumbnail((384,256));gif.append(bg.convert('RGB'))
    gif[0].save(ART/f'{action}-preview.gif',save_all=True,append_images=gif[1:],duration=round(1000/meta['actions'][action]['fps']),loop=0)

movement=extract('movement');actions=extract('actions')
movement_scale=330/movement[0].height
action_scale=330/actions[0].height
for row,(name,poses) in enumerate([('idle',movement[:4]),('run',movement[4:12]),('jump',movement[12:]),('attack',actions[:4]),('crouch',actions[4:8]),('skid',actions[8:12]),('hurt',actions[12:])]):
    pack(name,poses,movement_scale if row<3 else action_scale,row)
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
review.save(ART/'animation-preview.jpg',quality=94)
print('Packed 32 ice-gauntlet frames, seven mobile-safe atlases and per-frame hand sockets.')
