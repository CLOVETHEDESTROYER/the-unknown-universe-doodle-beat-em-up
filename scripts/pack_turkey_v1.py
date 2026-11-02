"""Normalize the approved full turkey sheet with one shared scale and foot anchor."""
from pathlib import Path
import importlib.util
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/seasonal/thanksgiving-v1'
OUT = ROOT / 'public/seasonal/thanksgiving-v1'
OUT.mkdir(parents=True, exist_ok=True)
skill = Path.home() / '.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2/scripts/normalize_sprite_strip.py'
spec = importlib.util.spec_from_file_location('sprite_normalizer', skill)
normalizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(normalizer)
raw = Image.open(SOURCE / 'turkey-sheet-raw.png').convert('RGBA')
# The generated poses drift a few pixels across grid boundaries. Extract whole
# connected silhouettes before normalizing, so neighboring feet never leak in.
_, _, stats, _ = cv2.connectedComponentsWithStats((np.array(raw.getchannel('A')) > 40).astype('uint8'), 8)
boxes = [tuple(map(int, box[:4])) for box in stats[1:] if box[4] > 5000]
boxes.sort(key=lambda box: (int((box[1]+box[3]/2)/(raw.height/3)), box[0]))
assert len(boxes) == 12, f'Expected twelve whole silhouettes, found {len(boxes)}'
contents = [raw.crop((max(0,x-2),max(0,y-2),min(raw.width,x+w+2),min(raw.height,y+h+2))) for x,y,w,h in boxes]
assert all(contents), 'All twelve poses must contain artwork'
width, height = normalizer.max_content_size(contents)
scale = min(464/width, 450/height)
sheet = Image.new('RGBA', (2048,1536))
frames_dir = SOURCE / 'frames'
frames_dir.mkdir(exist_ok=True)
names = ['idle','takeoff','talons-ready','talon-charge','retreat','landing','gust-windup','gust-flap','gust-follow','recover','hurt','defeated']
for i, content in enumerate(contents):
    frame = Image.new('RGBA', (512,512))
    resized = content.resize((round(content.width*scale), round(content.height*scale)), Image.Resampling.LANCZOS)
    frame.alpha_composite(resized, ((512-resized.width)//2, 480-resized.height))
    frame.save(frames_dir / f'{i+1:02d}.png')
    sheet.alpha_composite(frame, ((i%4)*512, (i//4)*512))
sheet.save(OUT / 'turkey.png', optimize=True)
leaves = Image.open(SOURCE / 'falling-leaves-concept-sheet.png').convert('RGBA')
leaf_sheet = Image.new('RGBA', (512,384))
for i in range(12):
    c,r=i%4,i//4
    leaf=leaves.crop((round(c*leaves.width/4),round(r*leaves.height/3),round((c+1)*leaves.width/4),round((r+1)*leaves.height/3)))
    leaf=normalizer.crop_to_content(leaf,24)
    leaf.thumbnail((112,112),Image.Resampling.LANCZOS)
    leaf_sheet.alpha_composite(leaf,(c*128+(128-leaf.width)//2,r*128+(128-leaf.height)//2))
leaf_sheet.save(OUT/'leaves.png',optimize=True)
pano=Image.open(SOURCE/'autumn-rooftops-concept.png')
# Keep the distant skyline; gameplay supplies its own collidable foreground roofs.
pano=pano.crop((0,0,pano.width,round(pano.height*.65)))
pano.save(OUT/'autumn-skyline.webp',quality=90)
(OUT/'metadata.json').write_text(json.dumps({'frameWidth':512,'frameHeight':512,'columns':4,'rows':3,'origin':[.5,480/512],'baseFacing':'left','sharedScale':scale,'frames':dict(enumerate(names))},indent=2)+'\n')
print(f'Packed {len(names)} turkey poses, twelve leaves and autumn skyline to {OUT}')
