"""Normalize two generated X God mobility sheets into small, trimmed Phaser atlases.

Keep a common scale within each animation; airborne spins rotate around the body
center, while ground-pound poses share the bottom-center landing anchor.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/xgod-mobility-v1'
OUT = ROOT / 'public/characters/xgod/mobility-v1'


def pack():
    OUT.mkdir(parents=True, exist_ok=True)
    preview = Image.new('RGBA', (1536, 560), '#e4ded1')
    metadata = {}
    for row, name in enumerate(['double-jump', 'butt-bomb']):
        pixels = np.asarray(Image.open(ART / f'{name}-source.png').convert('RGBA'))
        labels, _ = ndimage.label(pixels[:, :, 3] > 210)
        counts = np.bincount(labels.ravel())
        boxes = ndimage.find_objects(labels)
        main = sorted(range(1, len(counts)), key=lambda i: -counts[i])[:6]
        assert all(counts[i] > 5000 for i in main), 'Six complete poses required'
        main.sort(key=lambda i: boxes[i-1][0].start)
        main = sorted(main[:3], key=lambda i: boxes[i-1][1].start) + sorted(main[3:], key=lambda i: boxes[i-1][1].start)
        distance, nearest = ndimage.distance_transform_edt(~np.isin(labels, main), return_indices=True)
        owner = labels[tuple(nearest)]
        poses = []
        for label in main:
            rgba = pixels.copy()
            # Discard the generated translucent aura; retain antialiased outlines.
            rgba[:, :, 3] = np.where((owner == label) & (distance < 3), pixels[:, :, 3], 0)
            pose = Image.fromarray(rgba)
            poses.append(pose.crop(pose.getchannel('A').getbbox()))
        # Upright recovery pose establishes the same 170px standing height.
        scale = min(170 / poses[5].height, 240 / max(p.width for p in poses), 210 / max(p.height for p in poses))
        page = Image.new('RGBA', (780, 520))
        entries = []
        for n, pose in enumerate(poses):
            pose = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (256, 256))
            y = round(150-pose.height/2) if name == 'double-jump' else 220-pose.height
            cell.alpha_composite(pose, (round(128-pose.width/2), y))
            box = cell.getchannel('A').getbbox()
            crop = cell.crop(box)
            x, y = n % 3*260+2, n // 3*260+2
            page.alpha_composite(crop, (x, y))
            entries.append({'filename': str(n), 'rotated': False, 'trimmed': True,
                'frame': {'x': x, 'y': y, 'w': crop.width, 'h': crop.height},
                'sourceSize': {'w': 256, 'h': 256},
                'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': crop.width, 'h': crop.height}})
            preview.alpha_composite(cell, (n*256, row*280+24))
        page.save(OUT / f'{name}.png', optimize=True)
        (OUT / f'{name}.json').write_text(json.dumps({'textures': [{'image': f'{name}.png', 'frames': entries}]}, separators=(',', ':')))
        metadata[name] = {'frames': 6, 'frameSize': 256, 'baseline': 220, 'scale': scale,
            'anchor': 'body center' if name == 'double-jump' else 'bottom center'}
        ImageDraw.Draw(preview).text((8, row*280+5), name, fill='#17172a')
    (ART / 'metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
    preview.convert('RGB').save(ART / 'preview.jpg', quality=92)
    print('Packed two 780x520 atlases (3.1 MiB RGBA total).')


if __name__ == '__main__':
    pack()
