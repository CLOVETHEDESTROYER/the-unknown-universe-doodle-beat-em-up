"""Normalize whole generated defeat sheets; retain one anatomy scale per boss.

Requires Pillow, NumPy and SciPy. Sources and approved seeds are preserved in
art/boss-deaths-v1. Alpha components avoid cutting tall poses at nominal rows.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/boss-deaths-v1'
OUT = ROOT / 'public/bosses/deaths-v1'
IDS = ('dark_dragon', 'killinas_daughter', 'ink_behemoth', 'kilina', 'void_regent', 'pursuer')


def extract(path):
    pixels = np.array(Image.open(path).convert('RGBA'))
    labels, _ = ndimage.label(pixels[:, :, 3] > 210)
    counts = np.bincount(labels.ravel())
    boxes = ndimage.find_objects(labels)
    bodies = [i for i in range(1, len(counts)) if counts[i] > 20000]
    assert len(bodies) == 4, (path, len(bodies))
    bodies.sort(key=lambda i: boxes[i-1][0].start)
    bodies = sum([sorted(bodies[n:n+2], key=lambda i: boxes[i-1][1].start) for n in (0, 2)], [])
    groups = {i: [i] for i in bodies}
    # Keep the Regent's disconnected crown and nearby wreck fragments. Generated
    # diffuse alpha halos are excluded instead of becoming rectangular backdrops.
    for i, box in enumerate(boxes, 1):
        if i in groups or counts[i] < 100:
            continue
        sy, sx = box
        cx, cy = (sx.start+sx.stop)/2, (sy.start+sy.stop)/2
        choices = []
        for main in bodies:
            by, bx = boxes[main-1]
            dx = max(bx.start-cx, cx-bx.stop, 0)
            dy = max(by.start-cy, cy-by.stop, 0)
            if dx < 45 and dy < 65:
                choices.append((dx*dx+dy*dy+((bx.start+bx.stop)/2-cx)**2*.01, main))
        if choices:
            groups[min(choices)[1]].append(i)
    frames = []
    for main in bodies:
        mask = ndimage.binary_dilation(np.isin(labels, groups[main]), iterations=2)
        rgba = pixels.copy()
        rgba[:, :, 3] = np.where(mask, pixels[:, :, 3], 0)
        frame = Image.fromarray(rgba)
        frames.append(frame.crop(frame.getchannel('A').getbbox()))
    return frames


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    preview = Image.new('RGBA', (1024, 6*286), '#dce1dc')
    draw = ImageDraw.Draw(preview)
    metadata = {}
    for row, boss in enumerate(IDS):
        poses = extract(ART / f'{boss}-source.png')
        seed = Image.open(ART / f'{boss}-seed.png')
        flight = boss == 'pursuer'
        scale = seed.width/poses[0].width if flight else seed.height/poses[0].height
        scale = min(scale, 590/max(p.width for p in poses), (350 if flight else 560)/max(p.height for p in poses))
        cells, crops, bounds = [], [], []
        for frame in poses:
            frame = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (640, 400 if flight else 640))
            x = (640-frame.width)//2
            y = (400-frame.height)//2 if flight else 600-frame.height
            assert x >= 12 and y >= 12 and x+frame.width <= 628, (boss, x, y, frame.size)
            cell.alpha_composite(frame, (x, y))
            box = cell.getchannel('A').getbbox()
            assert box and box[1] >= 8 and box[3] <= cell.height-8, (boss, box)
            cells.append(cell); bounds.append(box); crops.append(cell.crop(box))
        widths = [max(p.width for p in crops[c::2])+4 for c in range(2)]
        heights = [max(p.height for p in crops[r*2:r*2+2])+4 for r in range(2)]
        page = Image.new('RGBA', (sum(widths), sum(heights)))
        entries = []
        for i, (cell, crop, box) in enumerate(zip(cells, crops, bounds)):
            px = 2+(widths[0] if i%2 else 0); py = 2+(heights[0] if i//2 else 0)
            page.alpha_composite(crop, (px, py))
            entries.append({'filename': str(i), 'rotated': False, 'trimmed': True,
                'frame': {'x': px, 'y': py, 'w': crop.width, 'h': crop.height},
                'sourceSize': {'w': cell.width, 'h': cell.height},
                'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': crop.width, 'h': crop.height}})
            thumb = cell.resize((256, 160 if flight else 256), Image.Resampling.LANCZOS)
            preview.alpha_composite(thumb, (i*256, row*286+22+(45 if flight else 0)))
        draw.text((8, row*286+5), boss+' : recoil / buckle / fall / rest', fill='#202438')
        draw.line((0, row*286+262, 1024, row*286+262), fill='#9ba99b', width=1)
        page.save(OUT / f'{boss}.png', optimize=True)
        (OUT / f'{boss}.json').write_text(json.dumps({'textures': [{'image': f'{boss}.png', 'frames': entries}]}, separators=(',', ':')))
        metadata[boss] = {'source': f'{boss}-source.png', 'seed': f'{boss}-seed.png', 'scale': scale,
            'logicalFrame': list(cells[0].size), 'origin': [.5, .5 if flight else 600/640],
            'bounds': bounds, 'atlas': list(page.size), 'decodedBytes': page.width*page.height*4}
        print(boss, 'atlas', page.size, 'RGBA MiB', round(page.width*page.height*4/1024**2, 2))
    preview.convert('RGB').save(ART / 'preview.jpg', quality=94)
    (ART / 'metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')


if __name__ == '__main__':
    main()
