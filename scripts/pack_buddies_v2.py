"""Normalize complete ImageGen buddy sheets with native alpha and a shared scale."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/buddies-v2'
OUT=ROOT/'public/buddies/v2'
OUT.mkdir(parents=True,exist_ok=True)
manifest={}
preview=Image.new('RGB',(1024,5*276),'#eaeede')
draw=ImageDraw.Draw(preview)
for row,job in enumerate(json.loads((ART/'prompts.json').read_text())['jobs']):
    path=ART/f"{job['id']}-source.png"
    if not path.exists():shutil.copyfile(job['source'],path)
    source=Image.open(path).convert('RGBA')
    assert source.getchannel('A').getextrema()[0]==0,job['id']
    cells=[];boxes=[]
    for i in range(16):
        x,y=i%4,i//4
        cell=source.crop((round(x*source.width/4),round(y*source.height/4),round((x+1)*source.width/4),round((y+1)*source.height/4)))
        pixels=np.array(cell)
        labels,count=ndimage.label(pixels[:,:,3]>24)
        areas=np.bincount(labels.ravel());areas[0]=0
        largest=int(areas.argmax())
        for label in range(1,count+1):
            if label==largest or areas[label]>=areas[largest]*.12:continue
            yy,xx=np.where(labels==label)
            if xx.min()<=1 or yy.min()<=1 or xx.max()>=cell.width-2 or yy.max()>=cell.height-2:
                pixels[:,:,3][ndimage.binary_dilation(labels==label,iterations=1)]=0
        cell=Image.fromarray(pixels)
        box=cell.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
        assert box,(job['id'],i)
        cells.append(cell);boxes.append(box)
    scale=230/max(max(b[2]-b[0],b[3]-b[1]) for b in boxes)
    packed=[];sheet=Image.new('RGBA',(1024,1024))
    for i,(cell,b) in enumerate(zip(cells,boxes)):
        sprite=cell.crop(b).resize((max(1,round((b[2]-b[0])*scale)),max(1,round((b[3]-b[1])*scale))),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(256,256));frame.alpha_composite(sprite,((256-sprite.width)//2,244-sprite.height))
        packed.append(frame);sheet.alpha_composite(frame,(i%4*256,i//4*256))
    sheet.save(OUT/f"{job['id']}.webp",lossless=True,method=6)
    packed[0].save(OUT/f"{job['id']}-poster.webp",lossless=True,method=6)
    sheet.save(ART/f"{job['id']}-sheet.png")
    for column,index in enumerate([0,5,9,14]):preview.paste(packed[index],(column*256,row*276),packed[index])
    draw.text((12,row*276+257),job['name']+' - idle / move / move / assist',fill='#263c36')
    frames=[]
    for image in packed:
        bg=Image.new('RGB',(256,256),'#eaeede');bg.paste(image,mask=image.getchannel('A'));frames.append(bg)
    frames[0].save(ART/f"{job['id']}-preview.gif",save_all=True,append_images=frames[1:],duration=120,loop=0)
    manifest[job['id']]={'name':job['name'],'columns':4,'rows':4,'size':256,'frames':16,'hasEffect':False,'buddy':True}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
preview.save(ART/'preview.jpg',quality=92)
print('Packed 5 buddies / 80 distinct frames.')
