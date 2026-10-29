"""Extract whole-sheet generations into aligned PNG strips and Phaser atlases.

Only packing, cropping and shared-scale resampling; raw generated art is retained.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'output/pdf-deps'))
import cv2
import numpy as np
from PIL import Image, ImageDraw

ART = ROOT / 'art/elytron-sprites-v2'
OUT = ROOT / 'public/characters/elytron-v1'
W, H, BASELINE = 640, 512, 480
# Each animation is a complete generated sequence; no synthetic mirrored frames.
GROUPS = {
    'movement': [('idle', 0, 4, 6, True), ('jump', 4, 4, 10, False)],
    'locomotion': [('run', 0, 8, 12, True)],
    'combat': [('attack', 0, 4, 12, False), ('crouch', 4, 4, 6, True), ('crouch-attack', 8, 4, 12, False), ('pulse-cast', 12, 4, 12, False)],
    'mobility': [('double-jump', 0, 4, 12, False), ('butt-bomb', 4, 4, 12, False), ('dash', 8, 4, 14, True), ('skid', 12, 2, 10, False), ('land', 14, 2, 10, False)],
    'reactions': [('damage', 0, 4, 12, False), ('dazed', 4, 4, 8, True), ('death', 8, 4, 8, False), ('celebrate', 12, 4, 8, True)],
    'special': [('pulse-storm', 0, 8, 12, False)],
    'extras': [('arrival', 0, 4, 10, False), ('reward', 4, 4, 8, False)],
    'fx': [('pulse-projectile', 0, 4, 14, True), ('pulse-impact', 4, 4, 16, False), ('charge', 8, 4, 12, True), ('slam-wave', 12, 4, 14, False)],
}


def extract(group, count):
    image = Image.open(ART / f'{group}-source.png').convert('RGBA')
    rgba = np.asarray(image)
    assert rgba[:, :, 3].min() == 0, f'{group}: real alpha required'
    if group == 'fx':
        # Dispersing effects contain many disconnected sparks. Preserve their
        # full generated cell rather than mistaking each spark for a new frame.
        # Locate actual horizontal gutters: generated rows drift from the grid.
        ink_rows = (rgba[:, :, 3] > 64).sum(axis=1)
        quiet = np.r_[False, ink_rows < 5, False].astype('int8')
        starts = np.flatnonzero(np.diff(quiet) == 1)
        ends = np.flatnonzero(np.diff(quiet) == -1)
        gaps = [(int(a)+int(b))//2 for a,b in zip(starts, ends) if a > 0 and b < image.height and b-a >= 5]
        cuts = [0] + [min(gaps, key=lambda y: abs(y-image.height*k/4)) for k in [1,2,3]] + [image.height]
        assert all(a < b for a,b in zip(cuts, cuts[1:])), (group, cuts)
        poses, bounds = [], []
        for index in range(count):
            row, col = divmod(index, 4)
            box = (round(col*image.width/4), cuts[row],
                   round((col+1)*image.width/4), cuts[row+1])
            cell = image.crop(box)
            content = cell.getbbox()
            assert content, (group, index)
            poses.append(cell.crop(content))
            bounds.append([box[0]+content[0], box[1]+content[1], box[0]+content[2], box[1]+content[3]])
        return poses, bounds
    n, labels, stats, centers = cv2.connectedComponentsWithStats((rgba[:, :, 3] > 32).astype('uint8'))
    main = sorted(range(1, n), key=lambda i: -stats[i, 4])[:count]
    assert len(main) == count and min(stats[i, 4] for i in main) > 120, (group, 'missing frames')
    main.sort(key=lambda i: centers[i, 1])
    main = sum([sorted(main[k:k+4], key=lambda i: centers[i, 0]) for k in range(0, count, 4)], [])
    # Associate detached sparks and soft antialiased borders with nearest main pose.
    # Pixel ownership prevents duplicate fragments leaking into adjacent frames.
    inverse = (~np.isin(labels, main)).astype('uint8')
    distance, nearest = cv2.distanceTransformWithLabels(inverse, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_CCOMP)
    owner_lookup = {}
    for i in main:
        ys, xs = np.where(labels == i)
        owner_lookup[i] = int(nearest[ys[0], xs[0]])
    assert len(set(owner_lookup.values())) == count, (group, 'merged source poses')
    poses, bounds = [], []
    for i in main:
        a = rgba.copy()
        a[:, :, 3] = np.where((nearest == owner_lookup[i]) & (distance < 28), a[:, :, 3], 0)
        pose = Image.fromarray(a)
        box = pose.getbbox()
        assert box
        poses.append(pose.crop(box))
        bounds.append(list(box))
    return poses, bounds


def atlas(group, frames):
    pages, textures = [], []
    page = Image.new('RGBA', (1024, 1024))
    entries, x, y, row_height = [], 2, 2, 0

    def flush():
        if not entries:
            return
        filename = f'{group}-{len(textures)}.webp'
        used = page.crop((0, 0, 1024, y + row_height + 2))
        used.save(OUT / filename, lossless=True, method=6, exact=True)
        textures.append({'image': filename, 'frames': entries.copy()})
        pages.append({'image': filename, 'width': used.width, 'height': used.height})

    for index, cell in enumerate(frames):
        box = cell.getbbox()
        crop = cell.crop(box)
        if x + crop.width + 2 > 1024:
            x, y, row_height = 2, y + row_height + 4, 0
        if y + crop.height + 2 > 1024:
            flush()
            page = Image.new('RGBA', (1024, 1024))
            entries, x, y, row_height = [], 2, 2, 0
        page.alpha_composite(crop, (x, y))
        entries.append({'filename': str(index), 'rotated': False, 'trimmed': True,
                        'frame': {'x': x, 'y': y, 'w': crop.width, 'h': crop.height},
                        'sourceSize': {'w': W, 'h': H},
                        'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': crop.width, 'h': crop.height}})
        x += crop.width + 4
        row_height = max(row_height, crop.height)
    flush()
    (OUT / f'{group}.json').write_text(json.dumps({'textures': textures}, separators=(',', ':')))
    return pages


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    animations, sheets, overview_rows = {}, {}, []
    for group, actions in GROUPS.items():
        count = max(start + length for _, start, length, _, _ in actions)
        if group == 'movement':
            raw_poses, raw_boxes = extract(group, 16)
            # Use the dedicated run-cycle pass instead of the original study.
            poses = [raw_poses[i] for i in [0, 1, 2, 3, 12, 13, 14, 15]]
            boxes = [raw_boxes[i] for i in [0, 1, 2, 3, 12, 13, 14, 15]]
        else:
            poses, boxes = extract(group, count)
        anchor = {'movement': 0, 'locomotion': 0, 'combat': 12, 'mobility': 15, 'reactions': 0, 'special': 7, 'extras': 7, 'fx': 0}[group]
        if group == 'fx':
            scale = min(440 / max(p.width for p in poses), 300 / max(p.height for p in poses))
        else:
            scale = min(360 / poses[anchor].height, 580 / max(p.width for p in poses), 440 / max(p.height for p in poses))
        frames = []
        for index, pose in enumerate(poses):
            size = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
            resized = pose.resize(size, Image.Resampling.LANCZOS)
            if group == 'fx':
                point = ((W-size[0])//2, (H-size[1])//2)
            else:
                # Foot center is less sensitive to an outstretched punching arm.
                alpha = np.asarray(pose)[:, :, 3]
                ys, xs = np.where(alpha > 200)
                bottom = int(ys.max()) + 1
                feet = xs[ys >= bottom-max(5, round(pose.height*.06))]
                foot_x = (int(feet.min())+int(feet.max()))/2
                px = round(W/2-foot_x*scale)
                px = max(20, min(px, W-20-size[0]))
                point = (px, BASELINE-size[1])
            assert point[0] >= 0 and point[1] >= 0 and point[0]+size[0] <= W and point[1]+size[1] <= H
            frame = Image.new('RGBA', (W, H))
            frame.alpha_composite(resized, point)
            assert frame.getbbox() and frame.getbbox()[0] > 0 and frame.getbbox()[2] < W
            frames.append(frame)
        sheets[group] = {'frames': count, 'frameWidth': W, 'frameHeight': H, 'baseline': BASELINE,
                         'sharedScale': scale, 'sourceBounds': boxes, 'pages': atlas(group, frames)}
        grid = Image.new('RGBA', (W*4, H*((count+3)//4)))
        for i, frame in enumerate(frames):
            grid.alpha_composite(frame, (i%4*W, i//4*H))
        grid.save(ART / f'{group}-sheet.png')
        review = Image.new('RGBA', grid.size, '#424957')
        review.alpha_composite(grid)
        review.convert('RGB').save(ART / f'{group}-review.jpg', quality=92)
        for action, start, length, fps, loop in actions:
            strip = Image.new('RGBA', (W*length, H))
            action_dir = ART / 'frames' / action
            action_dir.mkdir(parents=True, exist_ok=True)
            gif = []
            for i, frame in enumerate(frames[start:start+length]):
                strip.alpha_composite(frame, (W*i, 0))
                frame.save(action_dir / f'{i:02}.png')
                bg = Image.new('RGBA', (W, H), '#424957')
                bg.alpha_composite(frame)
                bg.thumbnail((320, 256), Image.Resampling.LANCZOS)
                gif.append(bg.convert('RGB'))
            strip.save(OUT / f'{action}.png')
            gif[0].save(ART / f'{action}.gif', save_all=True, append_images=gif[1:], duration=round(1000/fps), loop=0 if loop else 1, disposal=2)
            animations[action] = {'atlas': group, 'start': start, 'end': start+length-1, 'frames': length,
                                  'frameRate': fps, 'repeat': -1 if loop else 0, 'strip': f'{action}.png'}
            overview_rows.append((action, frames[start:start+length]))
        print(f'{group}: {count} complete alpha frames packed', flush=True)
    manifest = {'character': 'Elytron', 'design': 'option-01', 'facing': 'right', 'frameWidth': W,
                'frameHeight': H, 'origin': [0.5, BASELINE/H], 'integration': 'platformer-and-flight',
                'animations': animations, 'sheets': sheets,
                'totalFrames': sum(g['frames'] for g in sheets.values())}
    for dest in [ART/'animation-manifest.json', OUT/'manifest.json']:
        dest.write_text(json.dumps(manifest, indent=2)+'\n')
    overview = Image.new('RGB', (1280, len(overview_rows)*150), '#303643')
    draw = ImageDraw.Draw(overview)
    for row, (action, action_frames) in enumerate(overview_rows):
        draw.text((12, row*150+10), action.upper(), fill='#ffda39')
        for i, frame in enumerate(action_frames):
            thumb = frame.copy()
            thumb.thumbnail((150, 120), Image.Resampling.LANCZOS)
            overview.paste(thumb, (i*160+(160-thumb.width)//2, row*150+27), thumb)
    overview.save(ART/'animation-overview.jpg', quality=94)
    print(json.dumps({'animations': len(animations), 'frames': manifest['totalFrames'], 'groups': len(sheets)}))


if __name__ == '__main__':
    main()
