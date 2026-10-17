"""Pack the generated four-frame Ember Boots pose and exhaust strips."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/ember-jets-v1'
OUT=ROOT/'public/powerups/ember-jets-v1'

def clean(image):
    pixels=np.array(image.convert('RGBA'))
    # Keep native alpha around opaque pencil lines; remove diffuse generated halos.
    mask=ndimage.binary_dilation(pixels[:,:,3]>210,iterations=2)
    pixels[:,:,3]=np.where(mask,pixels[:,:,3],0)
    image=Image.fromarray(pixels)
    return image.crop(image.getchannel('A').getbbox())

def frames(name):
    source=Image.open(ART/f'{name}-source.png').convert('RGBA')
    if name=='jets':
        return [clean(source.crop((c*source.width//2,r*source.height//2,(c+1)*source.width//2,(r+1)*source.height//2))) for r in range(2) for c in range(2)]
    pixels=np.array(source);labels,_=ndimage.label(pixels[:,:,3]>210)
    sizes=np.bincount(labels.ravel());boxes=ndimage.find_objects(labels)
    main=sorted(range(1,len(sizes)),key=lambda i:-sizes[i])[:4]
    assert all(sizes[i]>5000 for i in main)
    main.sort(key=lambda i:boxes[i-1][0].start)
    main=sum([sorted(main[i:i+2],key=lambda n:boxes[n-1][1].start) for i in (0,2)],[])
    result=[]
    for label in main:
        rgba=pixels.copy();mask=ndimage.binary_dilation(labels==label,iterations=2)
        rgba[:,:,3]=np.where(mask,pixels[:,:,3],0)
        pose=Image.fromarray(rgba);result.append(pose.crop(pose.getchannel('A').getbbox()))
    return result

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    preview=Image.new('RGBA',(1024,410),'#d9dfda');draw=ImageDraw.Draw(preview);metadata={}
    for name in ('xgod','jets'):
        poses=frames(name);fx=name=='jets';w,h=(512,192) if fx else (256,256)
        scale=min(480/max(p.width for p in poses),164/max(p.height for p in poses)) if fx else min(170/poses[0].height,240/max(p.width for p in poses),210/max(p.height for p in poses))
        cells=[];entries=[];bounds=[];page=Image.new('RGBA',((w+4)*2,(h+4)*2))
        for i,p in enumerate(poses):
            p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
            cell=Image.new('RGBA',(w,h));x=496-p.width if fx else (w-p.width)//2;y=(h-p.height)//2 if fx else 220-p.height
            assert x>=8 and y>=8,(name,i,x,y,p.size)
            cell.alpha_composite(p,(x,y));box=cell.getchannel('A').getbbox();crop=cell.crop(box);bounds.append(box)
            px=i%2*(w+4)+2;py=i//2*(h+4)+2;page.alpha_composite(crop,(px,py))
            entries.append({'filename':str(i),'rotated':False,'trimmed':True,'frame':{'x':px,'y':py,'w':crop.width,'h':crop.height},
                'sourceSize':{'w':w,'h':h},'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height}})
            preview.alpha_composite(cell.resize((256,96) if fx else (256,256)),(i*256,296 if fx else 20));cells.append(cell)
        page.save(OUT/f'{name}.png',optimize=True)
        (OUT/f'{name}.json').write_text(json.dumps({'textures':[{'image':f'{name}.png','frames':entries}]},separators=(',',':')))
        metadata[name]={'logicalFrame':[w,h],'scale':scale,'bounds':bounds,'atlas':list(page.size),'rgbaBytes':page.width*page.height*4}
        print(name,page.size,'RGBA MiB',round(page.width*page.height*4/1024**2,2))
    draw.text((8,3),'X God: drawn Ember Boots dash poses',fill='#222');draw.text((8,280),'Shared twin jet flames: right-edge heel anchor',fill='#222')
    preview.convert('RGB').save(ART/'preview.jpg',quality=94)
    (ART/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')

if __name__=='__main__':main()
