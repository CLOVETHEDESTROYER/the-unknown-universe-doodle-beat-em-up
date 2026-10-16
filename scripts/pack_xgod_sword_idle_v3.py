"""Normalize the upright pose to the existing motion-v2 foot anchor and scale."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/xgod-sword-idle-v3'
DEST = ROOT / 'public/characters/xgod/sword-idle-v3'
DEST.mkdir(parents=True, exist_ok=True)
manifest = json.loads((SOURCE / 'render-attachments.json').read_text())
sheet = Image.new('RGBA', (2048, 512))
attachments = []
for index, record in enumerate(manifest['actions']['sword-idle']):
    frame = Image.open(SOURCE / 'frames' / f'sword-idle-{index:02d}.png').convert('RGBA')
    feet = Image.open(SOURCE / 'frames' / f'sword-idle-{index:02d}-feet.png').getchannel('A')
    bounds = feet.point(lambda a: 255 if a > 32 else 0).getbbox()
    if not bounds:
        raise ValueError('Missing foot anchor')
    scale = 1.02
    x, y = round(256 - 256 * scale), round(480 - bounds[3] * scale)
    normalized = Image.new('RGBA', (512, 512))
    normalized.paste(frame.resize((round(512 * scale), round(512 * scale)), Image.Resampling.LANCZOS), (x, y))
    sheet.paste(normalized, (index * 512, 0))
    attachments.append({'grip': [round(v * scale + offset, 2) for v, offset in zip(record['grip'], [x,y])]})
sheet.save(DEST / 'sword-idle.png', optimize=True)
(DEST / 'metadata.json').write_text(json.dumps({'frameWidth':512, 'frameHeight':512,
    'origin':[.5,.9375], 'displayScale':.4, 'weaponHand':'right',
    'sourceHandSocket':manifest['sourceHandSocket'], 'frames':4, 'fps':6,
    'attachments':attachments}, indent=2))
preview = Image.new('RGBA', sheet.size, '#c6cbbd')
preview.alpha_composite(sheet)
preview.convert('RGB').save(SOURCE / 'idle-review.jpg', quality=95)
print(f'Packed upright sword idle in {DEST}')
