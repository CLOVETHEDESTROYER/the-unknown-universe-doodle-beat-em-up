"""Normalize Blender jump poses with a stable airborne root, and planted landing frames."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/xgod-jump-v3'
DEST=ROOT/'public/characters/xgod/jump-v3';DEST.mkdir(parents=True,exist_ok=True)
manifest=json.loads((SOURCE/'render-attachments.json').read_text())
# Calibrated to the approved sword-idle-v3 camera/sole reference, in 512px cells.
# Store the transform explicitly so rebuilding does not depend on old output files.
scale=1.02;x=-5;root_y=43
metadata={'frameWidth':512,'frameHeight':512,'origin':[.5,.9375],'displayScale':.4,'weaponHand':'right',
          'sourceHandSocket':manifest['sourceHandSocket'],'swordAsset':manifest['swordAsset'],
          'swordSize':manifest['swordSize'],'airborneTransform':[scale,x,root_y],
          'poses':['takeoff','rise','tuck','apex','unfold','reach','land','settle'],'actions':{}}
preview=Image.new('RGBA',(2048,560),'#c6cbbd');draw=ImageDraw.Draw(preview)
for row,(action,records) in enumerate(manifest['actions'].items()):
    sheet=Image.new('RGBA',(2048,1024));attachments=[]
    for i,record in enumerate(records):
        frame=Image.open(SOURCE/'frames'/f'{action}-{i:02d}.png').convert('RGBA')
        y=root_y
        if i>=6:
            feet=Image.open(SOURCE/'frames'/f'{action}-{i:02d}-feet.png').getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
            y=round(480-feet[3]*scale)
        normalized=Image.new('RGBA',(512,512))
        normalized.paste(frame.resize((round(512*scale),round(512*scale)),Image.Resampling.LANCZOS),(x,y))
        bounds=normalized.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
        if not bounds or bounds[0]<=1 or bounds[1]<=1 or bounds[2]>=511 or bounds[3]>=511:raise ValueError(f'Clipped pose: {action}/{i} {bounds}')
        sheet.alpha_composite(normalized,((i%4)*512,(i//4)*512))
        attachments.append({k:[round(p[0]*scale+x,2),round(p[1]*scale+y,2)] for k,p in record.items()})
        px=i*256;py=row*280
        preview.alpha_composite(normalized.resize((256,256),Image.Resampling.LANCZOS),(px,py))
        draw.text((px+8,py+260),f'{action} {metadata["poses"][i]}',fill='#182820')
    sheet.save(DEST/f'{action}.png',optimize=True)
    metadata['actions'][action]={'frames':8,'attachments':attachments}
(DEST/'metadata.json').write_text(json.dumps(metadata,indent=2))
preview.convert('RGB').save(SOURCE/'pose-review.jpg',quality=95)
print('Packed two eight-frame jumps with one airborne root and planted landings.')
