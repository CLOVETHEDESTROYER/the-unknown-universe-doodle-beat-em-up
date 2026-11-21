"""Register the approved running legs to a clean two-handed generated gun torso."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageChops
root=Path(__file__).resolve().parents[2]
folder=root/'public/characters/xgod/drawn-v1'
source=Image.open(Path(__file__).with_name('source.png')).convert('RGBA')
# Isolate the first complete gun grip; ignore decorative material at the sheet edges.
source=source.crop((120,25,405,245))
old=Image.open(folder/'run.png').convert('RGBA')
sheet=Image.new('RGBA',old.size)
review=Image.new('RGBA',(1200,400),'#777777')
target=[(119,194,181,207),(131,197,191,209),(138,199,199,205),(116,192,181,207),
        (116,192,178,207),(128,198,189,210),(135,193,198,202),(113,198,178,211)]
data={'frames':8,'fps':16,'attachments':[],'bounds':[]}
for i,(dx,dy,fx,fy) in enumerate(target):
 dx,dy,fx,fy=185+dx/.75,95+dy/.75,185+fx/.75,95+fy/.75
 sx,sy,ex,ey=85,200,159,213
 scale_x=(ex-sx)/(fx-dx); scale_y=.75
 shear=((ey-sy)-(fy-dy)*scale_y)/(fx-dx)
 upper=source.transform((768,512),Image.Transform.AFFINE,(scale_x,0,sx-dx*scale_x,shear,scale_y,sy-dx*shear-dy*scale_y),resample=Image.Resampling.BICUBIC)
 def waist(x): return round(dy+(x-dx)*(fy-dy)/(fx-dx))
 top=Image.new('L',(768,512));bottom=Image.new('L',(768,512))
 a,b=255,560
 ImageDraw.Draw(top).polygon([(0,0),(768,0),(768,waist(b)+1),(b,waist(b)+1),(a,waist(a)+1),(0,waist(a)+1)],fill=255)
 ImageDraw.Draw(bottom).polygon([(dx-8,dy),(fx+8,fy),(fx+45,fy+16),(768,fy+16),(768,512),(0,512),(0,dy+16),(dx-45,dy+16)],fill=255)
 x,y=i%4*768,i//4*512
 cell=old.crop((x,y,x+768,y+512))
 cell.putalpha(ImageChops.multiply(cell.getchannel('A'),bottom))
 labels,_=ndimage.label(np.array(cell.getchannel('A'))>128)
 sizes=np.bincount(labels.ravel());sizes[0]=0
 keep=ndimage.binary_dilation(labels==sizes.argmax(),iterations=2)
 cell.putalpha(ImageChops.multiply(cell.getchannel('A'),Image.fromarray((keep*255).astype('uint8'))))
 upper.putalpha(ImageChops.multiply(upper.getchannel('A'),top))
 cell.alpha_composite(upper);sheet.alpha_composite(cell,(x,y))
 # Tip center in the isolated source, transformed with the same affine registration.
 mx=dx+(260-sx)/scale_x;my=dy+(164-sy-(mx-dx)*shear)/scale_y
 data['attachments'].append({'muzzle':[round(mx),round(my)]})
 data['bounds'].append(list(cell.getchannel('A').getbbox()))
 review.alpha_composite(cell.resize((300,200)),(i%4*300,i//4*200))
sheet.save(folder/'blaster-run-stride.png',optimize=True)
metadata=json.loads((folder/'metadata.json').read_text());metadata['actions']['blaster-run']=data
(folder/'metadata-gun-run-v2.json').write_text(json.dumps(metadata,indent=2)+'\n')
review.convert('RGB').save(Path(__file__).with_name('preview.jpg'))
