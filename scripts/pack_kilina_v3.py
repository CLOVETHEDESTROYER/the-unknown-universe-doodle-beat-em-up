"""Normalize the approved walk and generated attack poses without clipping weapons."""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/bosses/kilina-v3'
DEST.mkdir(parents=True, exist_ok=True)
source = Image.open(ROOT / 'art/kilina-attack-poses-v3-generated.png').convert('RGBA')
pixels = np.array(source)
count, labels, stats, centers = cv2.connectedComponentsWithStats((pixels[:, :, 3] > 32).astype('uint8'), 8)
islands = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > 10000]
if len(islands) != 8:
    raise ValueError(f'Expected eight complete attack silhouettes, found {len(islands)}')
islands.sort(key=lambda i: (int(centers[i][1] > source.height / 2), centers[i][0]))
# The lunge crosses the nominal grid border; connected silhouettes preserve its axe.
anchors = [196, 690, 1046, 1525, 212, 692, 1100, 1500]
scale = 0.78
frames = []
for index, label in enumerate(islands):
    x, y, w, h, _ = stats[label]
    isolated = pixels[y:y+h, x:x+w].copy()
    isolated[:, :, 3] = np.where(labels[y:y+h, x:x+w] == label, isolated[:, :, 3], 0)
    art = Image.fromarray(isolated).resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (640, 640))
    frame.alpha_composite(art, (round(320 + (x - anchors[index]) * scale), round(600 - h * scale)))
    frames.append(frame)

walk_source = Image.open(ROOT / 'public/bosses/killinas_daughter_walk_v2.png').convert('RGBA')
walk = []
for index in range(8):
    cell = np.array(walk_source.crop((index * 620, 0, (index + 1) * 620, 700)))
    n, lab, stat, _ = cv2.connectedComponentsWithStats((cell[:, :, 3] > 32).astype('uint8'), 8)
    keep = 1 + np.argmax(stat[1:, cv2.CC_STAT_AREA])
    x, y, w, h, _ = stat[keep]
    crop = cell[y:y+h, x:x+w].copy()
    crop[:, :, 3] = np.where(lab[y:y+h, x:x+w] == keep, crop[:, :, 3], 0)
    # The soles, rather than an extended axe/gun, define the horizontal anchor.
    feet = np.argwhere(crop[-18:, :, 3] > 32)
    anchor = (feet[:, 1].min() + feet[:, 1].max()) / 2
    shared_scale = 280 / 500
    art = Image.fromarray(crop).resize((round(w * shared_scale), round(h * shared_scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (640, 640))
    frame.alpha_composite(art, (round(320 - anchor * shared_scale), 600 - art.height))
    walk.append(frame)

for name, group in [('walk', walk), ('attack', frames)]:
    sheet = Image.new('RGBA', (2560, 1280))
    for index, frame in enumerate(group):
        sheet.alpha_composite(frame, (index % 4 * 640, index // 4 * 640))
    sheet.save(DEST / f'{name}.png', optimize=True)

metadata = {'frameSize': 640, 'origin': [0.5, 600/640], 'scale': 0.9,
            'actions': ['ready', 'windup', 'dash', 'follow-through', 'aim', 'recoil', 'leap', 'landing'],
            'muzzle': [round(320 + (430 - anchors[4]) * scale), round(600 + (595 - 844) * scale)]}
(DEST / 'metadata.json').write_text(json.dumps(metadata, indent=2))
preview = Image.new('RGBA', (1024, 560), '#d8ddd6')
draw = ImageDraw.Draw(preview)
for index, frame in enumerate(frames):
    preview.alpha_composite(frame.resize((256, 256)), (index % 4 * 256, index // 4 * 280))
    draw.text((index % 4 * 256 + 10, index // 4 * 280 + 258), metadata['actions'][index], fill='black')
preview.convert('RGB').save(ROOT / 'output/kilina-v3/attack-preview.jpg', quality=95)
print(f'Packed {len(frames)} attack poses and {len(walk)} walk frames into {DEST}')
