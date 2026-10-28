"""Normalize generated Kai poses with shared per-sheet scales and foot anchors.

Sources are preserved in art/. Runtime uses trimmed lossless WebP atlas pages
of at most 1024px, rather than enormous untrimmed character strips.
"""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/killer-kai-v1'
OUT = ROOT / 'public/characters/killer-kai-v1'


def extract(name, count):
    source = np.array(Image.open(ART / f'{name}-source.png').convert('RGBA'))
    assert source[:, :, 3].min() == 0, 'Real transparent alpha required'
    labels, _ = ndimage.label(source[:, :, 3] > 200)
    sizes = np.bincount(labels.ravel())
    main = sorted(range(1, len(sizes)), key=lambda i: -sizes[i])[:count]
    boxes = ndimage.find_objects(labels)
    assert min(sizes[i] for i in main) > 800, (name, 'Missing complete poses')
    main.sort(key=lambda i: (boxes[i-1][0].start + boxes[i-1][0].stop) / 2)
    main = sum([sorted(main[n:n+4], key=lambda i: boxes[i-1][1].start)
                for n in range(0, count, 4)], [])
    distance, nearest = ndimage.distance_transform_edt(~np.isin(labels, main), return_indices=True)
    owners = labels[tuple(nearest)]
    poses = []
    for label in main:
        rgba = source.copy()
        rgba[:, :, 3] = np.where((owners == label) & (distance < 24), source[:, :, 3], 0)
        pose = Image.fromarray(rgba)
        poses.append(pose.crop(pose.getchannel('A').getbbox()))
    return poses


def foot_anchor(pose):
    alpha = np.asarray(pose)[:, :, 3]
    ys, xs = np.where(alpha > 220)
    bottom = int(ys.max()) + 1
    feet = xs[ys >= bottom - max(5, int(pose.height * .07))]
    return (int(feet.min()) + int(feet.max())) / 2, bottom


def atlas(name, frames):
    textures, pages = [], []
    page = Image.new('RGBA', (1024, 1024))
    entries, x, y, row_height = [], 2, 2, 0

    def flush():
        if not entries:
            return
        filename = f'{name}-{len(textures)}.webp'
        used = page.crop((0, 0, 1024, min(1024, y + row_height + 2)))
        used.save(OUT / filename, lossless=True, method=6, exact=True)
        textures.append({'image': filename, 'frames': entries.copy()})
        pages.append({'image': filename, 'width': used.width, 'height': used.height})

    for n, cell in enumerate(frames):
        box = cell.getchannel('A').getbbox()
        assert box
        crop = cell.crop(box)
        if x + crop.width + 2 > 1024:
            x, y, row_height = 2, y + row_height + 4, 0
        if y + crop.height + 2 > 1024:
            flush()
            page = Image.new('RGBA', (1024, 1024))
            entries, x, y, row_height = [], 2, 2, 0
        page.alpha_composite(crop, (x, y))
        entries.append({'filename': str(n), 'rotated': False, 'trimmed': True,
                        'frame': {'x': x, 'y': y, 'w': crop.width, 'h': crop.height},
                        'sourceSize': {'w': cell.width, 'h': cell.height},
                        'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': crop.width, 'h': crop.height}})
        x += crop.width + 4
        row_height = max(row_height, crop.height)
    flush()
    (OUT / f'{name}.json').write_text(json.dumps({'textures': textures}, separators=(',', ':')), encoding='utf-8')
    return pages


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    normalized, metadata = {}, {}
    for name, count, anchor_frame in [('movement', 16, 0), ('combat', 16, 0),
                                     ('reactions', 16, 0), ('sword', 16, 12),
                                     ('mobility', 16, 7), ('special', 8, 7), ('fx', 8, 0)]:
        poses = extract(name, count)
        # One run drawing reversed which arm carried the cannon; retain the
        # approved same-arm contact pose at the opposite cycle contact instead.
        if name == 'movement':
            poses[8] = poses[4].copy()
        small = name in ('mobility', 'special', 'fx')
        width, height, baseline = (256, 256, 220) if small else (384, 256, 240)
        target = 170 if small else 200
        scale = min(target / poses[anchor_frame].height,
                    (width - 16) / max(p.width for p in poses),
                    (baseline - 8) / max(p.height for p in poses))
        if name == 'fx':
            scale = min(210 / max(p.width for p in poses), 120 / max(p.height for p in poses))
        frames = []
        for n, pose in enumerate(poses):
            ax, ay = foot_anchor(pose)
            resized = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (width, height))
            if name == 'fx':
                point = ((width - resized.width) // 2, (height - resized.height) // 2)
            elif name == 'mobility' and n < 4:
                point = ((width - resized.width) // 2, round(150 - resized.height / 2))
            else:
                point = (round(width / 2 - ax * scale), round(baseline - ay * scale))
            assert point[0] >= 0 and point[1] >= 0 and point[0]+resized.width <= width and point[1]+resized.height <= height, (name, n, point, resized.size)
            cell.alpha_composite(resized, point)
            frames.append(cell)
        if name == 'special':
            frames = [frames[n] for n in [0, 2, 3, 4, 6, 7]]
        normalized[name] = frames
        pages = atlas(name, frames)
        metadata[name] = {'frames': len(frames), 'logicalCell': [width, height],
                          'baseline': baseline, 'sharedScale': scale, 'pages': pages}
        review = Image.new('RGBA', (width * 4, 280 * ((len(frames) + 3) // 4)), '#77727d')
        draw = ImageDraw.Draw(review)
        for n, cell in enumerate(frames):
            review.alpha_composite(cell, (n % 4 * width, n // 4 * 280))
            draw.text((n % 4 * width + 8, n // 4 * 280 + 260), f'{name} {n}', fill='white')
        review.convert('RGB').save(ART / f'{name}-review.jpg', quality=93)

    run = Image.new('RGBA', (384 * 8, 256))
    for n in range(8):
        run.alpha_composite(normalized['movement'][4+n], (384*n, 0))
    run.save(OUT / 'flight-run.webp', lossless=True, method=6)
    normalized['movement'][0].save(OUT / 'flight-idle.webp', lossless=True, method=6)
    seed = Image.open(ART / 'seed.png').convert('RGBA')
    seed.thumbnail((336, 480), Image.Resampling.LANCZOS)
    card = Image.new('RGBA', (384, 576))
    card.alpha_composite(seed, ((384-seed.width)//2, 48))
    card.save(OUT / 'card.webp', lossless=True, method=6)
    # The cyborg's chest reactor is the collectible Overdrive Core icon.
    source = Image.open(ART / 'seed.png').convert('RGBA')
    core = source.crop((210, 190, 291, 276))
    core.thumbnail((80, 80), Image.Resampling.LANCZOS)
    core.save(OUT / 'reward.webp', lossless=True, method=6)
    (ART / 'animation-manifest.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
    preview = Image.new('RGBA', (1536, 7 * 210), '#373741')
    draw = ImageDraw.Draw(preview)
    for row, (name, frames) in enumerate(normalized.items()):
        draw.text((12, row*210+6), name.upper(), fill='#a2eaff')
        for n, cell in enumerate(frames[:8]):
            crop = cell.crop(cell.getbbox())
            crop.thumbnail((170, 174), Image.Resampling.LANCZOS)
            preview.alpha_composite(crop, (n*192+(192-crop.width)//2, row*210+30+(174-crop.height)//2))
    preview.convert('RGB').save(ART / 'animation-overview.jpg', quality=94)
    print(json.dumps({'frames': sum(len(v) for v in normalized.values()),
                      'runtimeBytes': sum(p.stat().st_size for p in OUT.iterdir()), 'sheets': metadata}, indent=2))


if __name__ == '__main__':
    main()
