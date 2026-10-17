"""Normalize generated Z-God poses with shared scale, generous cells and foot anchors."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/z-god-v1'
OUT = ROOT / 'public/characters/z-god-v1'
OUT.mkdir(parents=True, exist_ok=True)
CW, CH, BASELINE = 768, 512, 480
metadata = {'zgod': {}}
review = Image.new('RGBA', (1536, 7 * 256), '#e9e0d4')


def extract(path):
    source = Image.open(path).convert('RGBA')
    pixels = np.array(source)
    alpha = pixels[:, :, 3]
    labels, _ = ndimage.label(alpha > 128)
    sizes = np.bincount(labels.ravel())
    objects = ndimage.find_objects(labels)
    mains = [i for i in range(1, len(sizes)) if sizes[i] > 2500]
    if len(mains) != 16:
        raise ValueError(f'{path}: expected 16 complete poses, found {len(mains)}')
    # Components isolate poses without cutting hair, swords or flashes at cell edges.
    mains.sort(key=lambda i: (objects[i-1][0].start + objects[i-1][0].stop) / 2)
    ordered = []
    for row in range(4):
        ordered += sorted(mains[row*4:row*4+4], key=lambda i: objects[i-1][1].start)
    centers = [((objects[i-1][1].start + objects[i-1][1].stop)/2,
                (objects[i-1][0].start + objects[i-1][0].stop)/2) for i in ordered]
    assigned = {i: [i] for i in ordered}
    # Retain disconnected small sparks with their nearest complete pose.
    for i, bounds in enumerate(objects, 1):
        if i in assigned or sizes[i] < 8:
            continue
        y, x = bounds
        cx, cy = (x.start+x.stop)/2, (y.start+y.stop)/2
        nearest = min(range(16), key=lambda n: (centers[n][0]-cx)**2+(centers[n][1]-cy)**2)
        if abs(centers[nearest][0]-cx) < source.width*.24 and abs(centers[nearest][1]-cy) < source.height*.17:
            assigned[ordered[nearest]].append(i)
    frames = []
    for i in ordered:
        mask = ndimage.binary_dilation(np.isin(labels, assigned[i]), iterations=2)
        result = pixels.copy()
        result[:, :, 3] = np.where(mask, alpha, 0)
        image = Image.fromarray(result)
        box = image.getchannel('A').getbbox()
        frames.append(image.crop(box))
    return frames


def pack(power, action, poses, scale):
    cols = min(4, len(poses))
    sheet = Image.new('RGBA', (cols*CW, ((len(poses)+cols-1)//cols)*CH))
    entries = []
    for n, pose in enumerate(poses):
        opaque = pose.getchannel('A').point(lambda value: 255 if value > 128 else 0)
        feet = opaque.crop((0, int(pose.height*.84), pose.width, pose.height)).getbbox()
        anchor = (feet[0]+feet[2])/2 if feet else pose.width/2
        resized = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
        x, y = round(CW/2-anchor*scale), BASELINE-resized.height
        if x < 8 or y < 8 or x+resized.width > CW-8:
            raise ValueError((power, action, n, x, y, resized.size))
        cell = Image.new('RGBA', (CW, CH))
        cell.alpha_composite(resized, (x, y))
        p = np.array(cell).astype(float)
        r, g, b, a = [p[:, :, k] for k in range(4)]
        colored = (a > 128) & ((r > 170) & (g > 110) & (b < 100) if power == 'blaster' else (b > r*1.4) & (g > r*1.2))
        colored[:180] = False
        colored[430:] = False
        yy, xx = np.where(colored)
        point = None
        if len(xx):
            tip = int(np.quantile(xx, .98))
            point = [tip+3, int(np.median(yy[xx >= tip-5]))]
        entries.append({'bounds': list(cell.getchannel('A').getbbox()),
                        'muzzle': point if power == 'blaster' else None,
                        'hand': point if power == 'frost' else None})
        sheet.alpha_composite(cell, ((n % cols)*CW, (n//cols)*CH))
    sheet.save(OUT / f'{power}-{action}.png', optimize=True)
    metadata['zgod'].setdefault(power, {})[action] = {'frames': len(poses), 'poses': entries}
    return sheet.crop((0, 0, CW, CH))


for row, power in enumerate(['hands', 'blaster', 'sword', 'frost', 'ember', 'storm', 'extras']):
    frames = extract(ART / f'{power}-source.png')
    # One scale per entire generated sequence: crouching/jumping never stretches the character.
    idle = frames[0] if power == 'extras' else frames[12]
    target = 245 if power == 'extras' else 255 if power == 'sword' else 245
    scale = min(target/idle.height, 440/max(f.height for f in frames), 650/max(f.width for f in frames))
    actions = {'idle': frames[:4], 'crouch': frames[4:8], 'dash': frames[8:12],
               'react': frames[12:14], 'victory': frames[14:16]} if power == 'extras' else {
               'run': frames[:8], 'jump': frames[8:12], 'idle': [frames[12]], 'attack': frames[13:16]}
    for col, (action, poses) in enumerate(actions.items()):
        cell = pack(power, action, poses, scale)
        review.alpha_composite(cell.resize((256, 171)), (col*256, row*256+48))
        ImageDraw.Draw(review).text((col*256+8, row*256+18), f'{power} / {action}', fill='#261a32')

crouches = extract(ART / 'crouch-source.png')
crouch_scale = min(245/crouches[3].height, 440/max(p.height for p in crouches), 650/max(p.width for p in crouches))
for power, poses in [('blaster',crouches[:4]),('sword',crouches[4:8]),('frost',crouches[8:12]),('ember',crouches[12:14]),('storm',crouches[14:16])]:
    pack(power, 'crouch', poses, crouch_scale)

# Shared runtime aliases and visual-only reward/projectile images use generated pixels.
for name, action in [('idle', 'idle'), ('dash', 'dash')]:
    source = OUT / f'{"hands" if name == "idle" else "extras"}-{action}.png'
    Image.open(source).crop((0, 0, CW, CH)).save(OUT / f'{name}.png')
attack = Image.open(OUT / 'hands-attack.png')
attack.crop((CW, 0, CW*2, CH)).save(OUT / 'reward.png')
Image.open(ART / 'card-source.png').save(ROOT / 'public/cards/z-god-card.png', optimize=True)
(OUT / 'metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
review.convert('RGB').save(ART / 'animation-preview.jpg', quality=93)
print('Packed Z-God: 128 generated poses, six loadouts and idle/crouch/dash/reaction/victory sets.')
