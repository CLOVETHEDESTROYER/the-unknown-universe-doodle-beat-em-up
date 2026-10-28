"""Pack rendered poses around their shoe line and preserve exact prop sockets."""
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/xgod-motion-v2'
DEST = ROOT / 'public/characters/xgod/motion-v2'
DEST.mkdir(parents=True, exist_ok=True)
manifest = json.loads((SOURCE / 'render-attachments.json').read_text())
metadata = {'frameWidth': 512, 'frameHeight': 512, 'origin': [0.5, 0.9375],
            'displayScale': 0.4, 'weaponHand': 'right', 'sourceHandSocket': manifest['sourceHandSocket'], 'actions': {}}
previews = []
for action, records in manifest['actions'].items():
    sheet = Image.new('RGBA', (2048, math.ceil(len(records) / 4) * 512))
    attachments = []
    for index, record in enumerate(records):
        frame = Image.open(SOURCE / 'frames' / f'{action}-{index:02d}.png').convert('RGBA')
        feet = Image.open(SOURCE / 'frames' / f'{action}-{index:02d}-feet.png').getchannel('A')
        bounds = feet.point(lambda alpha: 255 if alpha > 32 else 0).getbbox()
        if not bounds:
            raise ValueError(f'No foot anchor in {action}/{index}')
        scale = 1.02
        x = round(256 - 256 * scale)
        y = round(480 - bounds[3] * scale)
        normalized = Image.new('RGBA', (512, 512))
        normalized.paste(frame.resize((round(512 * scale), round(512 * scale)), Image.Resampling.LANCZOS), (x, y))
        sheet.paste(normalized, (index % 4 * 512, index // 4 * 512))
        attachments.append({key: [round(point[0] * scale + x, 2), round(point[1] * scale + y, 2)]
                            for key, point in record.items()})
        if index == len(records) - 1 or (action == 'blaster-run' and index % 2 == 0):
            previews.append((f'{action} {index}', normalized))
    sheet.save(DEST / f'{action}.png', optimize=True)
    metadata['actions'][action] = {'frames': len(records), 'fps': 14 if action.endswith('run') else 6 if action.endswith('idle') else 25,
                                  'attachments': attachments}
(DEST / 'metadata.json').write_text(json.dumps(metadata, indent=2))

from PIL import ImageDraw
preview = Image.new('RGBA', (1024, math.ceil(len(previews) / 4) * 280), '#dce4dc')
draw = ImageDraw.Draw(preview)
for index, (name, frame) in enumerate(previews):
    x, y = index % 4 * 256, index // 4 * 280
    preview.alpha_composite(frame.resize((256, 256), Image.Resampling.LANCZOS), (x, y))
    draw.text((x + 10, y + 258), name, fill='#1c2430')
preview.convert('RGB').save(SOURCE / 'pose-review.jpg', quality=95)
print(f'Packed {len(metadata["actions"])} actions into {DEST}')
