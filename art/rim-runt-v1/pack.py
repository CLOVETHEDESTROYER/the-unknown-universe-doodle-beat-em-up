"""Pack Rim Runt's four drawn key poses into the ground enemy atlas contract."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = Image.open(Path(__file__).with_name('source.png')).convert('RGBA')
destination = root / 'public/enemies/level-v3'
cell = 256
sheet = Image.new('RGBA', (cell*4, cell))
# Crop around each isolated drawing, keeping the wide follow-through fully intact.
poses = [(142,9,632,511,385), (899,9,1382,508,1142),
         (141,548,686,1000,412), (754,545,1474,1002,1183)]
for index, (left, top, right, bottom, foot_center) in enumerate(poses):
    crop = source.crop((left,top,right,bottom))
    scale = .278
    scaled = crop.resize((round(crop.width*scale),round(crop.height*scale)), Image.Resampling.LANCZOS)
    x = round(cell/2 - (foot_center-left)*scale)
    y = 241 - scaled.height
    assert 0 <= x and x + scaled.width <= cell
    sheet.alpha_composite(scaled,(index*cell+x,y))
sheet.save(destination/'bumper-0.webp',lossless=True,method=6)
sequence = [0,0,0,0,1,1,1,1,2,2,3,3,3,3,3,3]
frames = [{
    'filename':str(index),'rotated':False,'trimmed':False,
    'frame':{'x':pose*cell,'y':0,'w':cell,'h':cell},
    'sourceSize':{'w':cell,'h':cell},
    'spriteSourceSize':{'x':0,'y':0,'w':cell,'h':cell},
} for index,pose in enumerate(sequence)]
(destination/'bumper.json').write_text(json.dumps({'textures':[{'image':'bumper-0.webp','frames':frames}]},separators=(',',':'))+'\n')
