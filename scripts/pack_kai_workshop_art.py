"""Pack generated Kai's Workshop artwork; preserve native alpha and source poses."""
from pathlib import Path
import json
import re
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/kai-workshop-v1'
OUT=ROOT/'public/workshop/kai-v1'
OUT.mkdir(parents=True,exist_ok=True)
catalog=(ROOT/'gameplay/shopCatalog.ts').read_text(encoding='utf-8').split('] as const;')[0]
items=re.findall(r"\{id:'([^']+)',name:'([^']+)'",catalog)
effects={'arctic','rose','chalk','starlight','prism','ink-fan','chalk-ring','rail-pulse','static-net'}
buddies={'spark-moth','patch-beetle'}
metadata={}
all_frames={}

for name,title in items:
    path=ART/f'{name}-alpha.png'
    if not path.exists():path=ART/f'{name}-generated.png'
    source=Image.open(path).convert('RGBA')
    assert source.getchannel('A').getextrema()[0]==0,f'{name}: native transparent background required'
    columns,rows=(4,4) if name in buddies else (4,2) if name in effects else (2,2)
    pixels=np.array(source)
    labels,count=ndimage.label(pixels[:,:,3]>12)
    centers=ndimage.center_of_mass(pixels[:,:,3],labels,range(1,count+1))
    groups=[[] for _ in range(columns*rows)]
    for label,(cy,cx) in enumerate(centers,1):
        row=min(rows-1,int(cy*rows/source.height));col=min(columns-1,int(cx*columns/source.width))
        groups[row*columns+col].append(label)
    cells=[];boxes=[]
    for n in range(columns*rows):
        row,col=divmod(n,columns)
        # Complete components retain a wing/antenna crossing an approximate cell boundary.
        margin=20 if name in buddies else 0
        bounds=(round(col*source.width/columns)-margin,round(row*source.height/rows)-margin,
                round((col+1)*source.width/columns)+margin,round((row+1)*source.height/rows)+margin)
        if name in buddies:
            rgba=pixels.copy();mask=ndimage.binary_dilation(np.isin(labels,groups[n]),iterations=1)
            rgba[:,:,3]=np.where(mask,rgba[:,:,3],0);cell=Image.fromarray(rgba).crop(bounds)
        else:cell=source.crop(bounds)
        box=cell.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
        assert box,(name,n)
        cells.append(cell);boxes.append(box)
    # A shared scale per animation family preserves growth and wingbeat proportions.
    scales=[]
    for start,end in [(0,len(cells))] if name in buddies else [(0,4)]+([(4,8)] if name in effects else []):
        scale=220/max(max(b[2]-b[0],b[3]-b[1]) for b in boxes[start:end])
        scales.extend([scale]*(end-start))
    size=256;packed=[];sheet=Image.new('RGBA',(size*4,size*(len(cells)//4)))
    for n,(cell,box,scale) in enumerate(zip(cells,boxes,scales)):
        crop=cell.crop(box).resize((max(1,round((box[2]-box[0])*scale)),max(1,round((box[3]-box[1])*scale))),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(size,size));frame.alpha_composite(crop,((size-crop.width)//2,(size-crop.height)//2))
        assert len(set(frame.getchannel('A').getdata()))>1,(name,n)
        packed.append(frame);sheet.alpha_composite(frame,(n%4*size,n//4*size))
    sheet.save(OUT/f'{name}.webp',lossless=True,method=6,exact=True)
    packed[0].save(OUT/f'{name}-poster.webp',lossless=True,method=6,exact=True)
    preview=Image.new('RGB',sheet.size,'#eee7db');preview.paste(sheet,mask=sheet.getchannel('A'));preview.save(ART/f'{name}-preview.jpg',quality=90)
    metadata[name]={'name':title,'columns':4,'rows':len(cells)//4,'size':size,'frames':len(cells),'hasEffect':name in effects,'buddy':name in buddies}
    all_frames[name]=packed

assert len(metadata)==19,'Catalog coverage changed: audit the new stock before packing.'
(OUT/'manifest.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
contact=Image.new('RGB',(5*210,4*235),'#faf5e9');draw=ImageDraw.Draw(contact)
for n,(name,title) in enumerate(items):
    im=all_frames[name][0].resize((190,190),Image.Resampling.LANCZOS);x=n%5*210;y=n//5*235
    contact.paste(im,(x+10,y+5),im);draw.text((x+10,y+205),title,fill='#29243e')
contact.save(ART/'catalog.jpg',quality=93)
gif=[]
for n in range(16):
    bg=Image.new('RGB',(640,345),'#faf5e9');draw=ImageDraw.Draw(bg)
    for c,name in enumerate(['spark-moth','patch-beetle']):
        f=all_frames[name][n].resize((320,320));bg.paste(f,(c*320,0),f)
        draw.text((c*320+100,325),metadata[name]['name'],fill='#29243e')
    gif.append(bg)
gif[0].save(ART/'buddies.gif',save_all=True,append_images=gif[1:],duration=110,loop=0,disposal=2)
print(f'Packed all {len(metadata)} catalog items, {sum(v["frames"] for v in metadata.values())} painted frames.')
