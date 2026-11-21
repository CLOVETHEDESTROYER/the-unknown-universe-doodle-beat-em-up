"""Mechanically register generated Christmas artwork; never alters live gameplay.

Requires Pillow, NumPy, OpenCV. Run from any directory. Sources and prompts stay
in art/seasonal/christmas-v1; all prepared assets have their own public folder.
"""
from __future__ import annotations

import json
from pathlib import Path
import statistics

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/seasonal/christmas-v1'
SOURCE = ART / 'source'
OUT = ROOT / 'public/seasonal/christmas-v1'
PREVIEW = ART / 'previews'
MANIFEST: dict = {'version': 1, 'status': 'playable-preview; pending deployment', 'baseFacing': 'right',
                  'heroWorldStandingHeight': 160, 'sheets': {}, 'backgrounds': [], 'props': [], 'story': []}


def save_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def isolate_grid(name: str, cols: int, rows: int):
    """Assign whole connected silhouettes by centroid, avoiding grid-line cuts.

    Coordinates remain relative to the ideal slot so registration preserves the
    motion authored in the source. Tiny disconnected generation speckles drop.
    """
    image = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    data = np.array(image)
    assert np.mean(data[:, :, 3] == 0) > .1, f'{name}: missing transparency'
    count, labels, stats, centers = cv2.connectedComponentsWithStats((data[:, :, 3] > 40).astype('uint8'), 8)
    frames, source_boxes = [], []
    sw, sh = image.width / cols, image.height / rows
    for row in range(rows):
        for col in range(cols):
            ids = [i for i in range(1, count) if stats[i, 4] >= 40
                   and min(cols - 1, int(centers[i][0] / sw)) == col
                   and min(rows - 1, int(centers[i][1] / sh)) == row]
            assert ids, f'{name}: empty slot {row * cols + col}'
            # Preserve anti-aliased edges immediately adjacent to solid pixels.
            mask = cv2.dilate(np.isin(labels, ids).astype('uint8'), np.ones((3, 3), np.uint8))
            clean = data.copy()
            clean[:, :, 3] = np.where(mask, data[:, :, 3], 0)
            # A padded local canvas lets weapons cross ideal cell boundaries.
            pad, pad_y = round(sw * .25), round(sh * .25)
            left, top = round(col * sw) - pad, round(row * sh) - pad_y
            right, bottom = round((col + 1) * sw) + pad, round((row + 1) * sh) + pad_y
            # Glows and raised weapons can also cross horizontal row lines.
            # Check component bounds before cropping, not only the final margin.
            assert all(stats[n, 0] >= left and stats[n, 1] >= top
                       and stats[n, 0] + stats[n, 2] <= right
                       and stats[n, 1] + stats[n, 3] <= bottom for n in ids), (name, row, col, 'source crop')
            slot = Image.fromarray(clean).crop((left, top, right, bottom))
            bounds = slot.getbbox()
            assert bounds, name
            frames.append(slot)
            source_boxes.append(bounds)
    return frames, source_boxes


def checker(size, tile=24):
    im = Image.new('RGB', size, '#14252c')
    draw = ImageDraw.Draw(im)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill='#1c333b')
    return im


def contact(frames, name, cols=4):
    thumb, label = 220, 25
    output = checker((cols * thumb, ((len(frames) + cols - 1) // cols) * (thumb + label)))
    draw = ImageDraw.Draw(output)
    for i, frame in enumerate(frames):
        tile = frame.copy()
        tile.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
        x, y = i % cols * thumb, i // cols * (thumb + label)
        output.paste(tile, (x, y), tile)
        draw.text((x + 9, y + thumb + 4), f'{i:02}', fill='#eff6ec')
    output.save(PREVIEW / f'{name}-sheet.jpg', quality=90)


def loop(frames, sequence, fps, name):
    images = []
    for index in sequence:
        frame = frames[index].resize((320, 320), Image.Resampling.LANCZOS)
        background = checker((320, 320), 20)
        background.paste(frame, (0, 0), frame)
        ImageDraw.Draw(background).line((0, 300, 320, 300), fill='#4a6d72')
        images.append(background)
    images[0].save(PREVIEW / f'{name}.gif', save_all=True, append_images=images[1:],
                   duration=round(1000 / fps), loop=0)


def register(name, folder, filename, cols, rows, frame_size, animations,
             target_height=None, reference=0, baselines=None, centered=False):
    source, boxes = isolate_grid(name, cols, rows)
    max_width = max(b[2] - b[0] for b in boxes)
    max_height = max(b[3] - b[1] for b in boxes)
    # Shared scale for ALL poses of this family, never fit each pose separately.
    scale = min((frame_size - 40) / max_width, (frame_size - 60) / max_height)
    if target_height:
        scale = min(scale, target_height / (boxes[reference][3] - boxes[reference][1]))
    anchor = (frame_size // 2, round(frame_size * .9375))
    frames, audit = [], []
    for i, (slot, box) in enumerate(zip(source, boxes)):
        row, col = divmod(i, cols)
        row_ids = baselines[row] if baselines else list(range(row * cols, (row + 1) * cols))
        baseline = statistics.median(boxes[n][3] for n in row_ids)
        pose = slot.crop(box)
        pose = pose.resize((max(1, round(pose.width * scale)), max(1, round(pose.height * scale))), Image.Resampling.LANCZOS)
        if centered:
            x, y = (frame_size - pose.width) // 2, (frame_size - pose.height) // 2
        else:
            # Use the lower body as the horizontal registration anchor; a long
            # launcher must not pull the torso away from the foot position.
            alpha = np.array(slot.getchannel('A'))
            foot_band = np.argwhere(alpha[max(0, round(baseline - max_height * .10)):round(baseline)] > 80)
            pivot = float(np.median(foot_band[:, 1])) if len(foot_band) else (box[0] + box[2]) / 2
            x = round(anchor[0] + (box[0] - pivot) * scale)
            y = round(anchor[1] + (box[1] - baseline) * scale)
            # Preserve the authored vertical offsets. If an extreme weapon pose
            # reaches a cell edge, translate the whole pose, never clip it.
            x = min(max(16, x), frame_size - pose.width - 16)
            y = min(max(16, y), frame_size - pose.height - 16)
        assert x >= 0 and y >= 0 and x + pose.width <= frame_size and y + pose.height <= frame_size, (name, i)
        frame = Image.new('RGBA', (frame_size, frame_size))
        frame.alpha_composite(pose, (x, y))
        frames.append(frame)
        audit.append({'frame': i, 'sourceBounds': list(box), 'exportBounds': list(frame.getbbox())})
    sheet = Image.new('RGBA', (cols * frame_size, rows * frame_size))
    frame_folder = ART / 'frames' / name
    frame_folder.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames):
        sheet.alpha_composite(frame, (i % cols * frame_size, i // cols * frame_size))
        frame.save(frame_folder / f'{i:02}.png', optimize=True)
    destination = OUT / folder / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, optimize=True)
    entry = {'image': f'{folder}/{filename}', 'columns': cols, 'rows': rows, 'frameWidth': frame_size,
             'frameHeight': frame_size, 'frameCount': len(frames), 'anchor': [frame_size // 2] * 2 if centered else list(anchor),
             'origin': [.5, .5] if centered else [.5, .9375], 'sharedSourceScale': scale,
             'animations': {key: {'frames': seq, 'frameRate': fps, 'repeat': repeat}
                            for key, (seq, fps, repeat) in animations.items()},
             'bounds': audit}
    MANIFEST['sheets'][name] = entry
    contact(frames, name, cols)
    for key, (seq, fps, _) in animations.items():
        if len(seq) > 1:
            loop(frames, seq, fps, f'{name}-{key}')
    return frames


def main():
    PREVIEW.mkdir(parents=True, exist_ok=True)
    hero_movement = register('klause-movement', 'killer-klause', 'movement.png', 4, 4, 640, {
        'idle': ([0, 1], 3, -1), 'run': (list(range(2, 8)), 10, -1), 'crouch': ([8], 1, 0),
        'jump': ([9, 10, 11], 8, 0), 'dash': ([12, 13], 10, 0), 'slam': ([14, 15], 8, 0)},
        target_height=420, baselines=[[0, 1, 2, 3], [4, 5, 6, 7], [8, 11], [13, 15]])
    register('klause-combat', 'killer-klause', 'combat.png', 4, 4, 640, {
        'fire': ([0, 1, 2, 3], 12, 0), 'reload': ([4, 5, 6, 7], 8, 0),
        'melee': ([8, 9, 10, 11], 12, 0), 'hurt': ([12, 13], 8, 0), 'victory': ([14, 15], 3, -1)},
        target_height=420)
    register('klause-special', 'killer-klause', 'special.png', 4, 4, 640, {
        'helper-call': ([0, 1, 2, 3], 8, 0), 'medic': ([4, 5, 6, 7], 6, 0),
        'defeat': ([8, 9, 10, 11], 5, 0), 'air-fire': ([12, 13, 14, 15], 10, 0)},
        target_height=420, baselines=[[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [15]])
    hero_movement[0].save(OUT / 'killer-klause/idle.png', optimize=True)
    master = Image.open(SOURCE / 'killer-klause-master.png').convert('RGBA')
    master.thumbnail((768, 768), Image.Resampling.LANCZOS)
    master.save(OUT / 'killer-klause/portrait.webp', lossless=True)
    MANIFEST['hero'] = {'id': 'killer_klause', 'name': 'Killer Klause', 'portrait': 'killer-klause/portrait.webp',
                        'idle': 'killer-klause/idle.png', 'visibleIdleHeight': hero_movement[0].getbbox()[3] - hero_movement[0].getbbox()[1],
                        'runtimeStandingHeightProposal': 160, 'collision': 'Define during integration; artwork bounds are not hitboxes.',
                        'eventMarkersProposal': {'fire': {'frame': 1, 'emit': 'present-projectile'},
                                                 'reload': {'frame': 2, 'emit': 'reload-complete'},
                                                 'helper-call': {'frame': 2, 'emit': 'elf-assist'}}}
    for helper in ['medic', 'engineer']:
        register(f'elf-{helper}', 'elves', f'{helper}.png', 4, 3, 320, {
            'idle': ([0, 1], 3, -1), 'run': (list(range(2, 8)), 10, -1),
            'assist': ([8, 9, 10], 6, 0), 'celebrate': ([11], 1, 0)}, target_height=230)
    register('effects', 'effects', 'christmas-fx.png', 4, 5, 256, {
        'gift-flight': ([0, 1, 2, 3], 10, -1), 'gift-burst': ([4, 5, 6, 7], 14, 0),
        'muzzle': ([8, 9, 10, 11], 20, 0), 'healing': ([12, 13, 14, 15], 8, 0),
        'transformation': ([16, 17, 18, 19], 8, 0)}, centered=True)
    prop_frames = register('props', 'props', 'workshop-props.png', 4, 3, 320, {}, centered=True)
    names = ['present-launcher', 'red-gift', 'green-gift', 'santas-hat', 'medic-satchel', 'bandages',
             'gift-crate', 'candy-cane', 'snowy-pine', 'workshop-lantern', 'broken-beam', 'toy-workbench']
    for name, frame in zip(names, prop_frames):
        frame.save(OUT / 'props' / f'{name}.png', optimize=True)
        MANIFEST['props'].append({'name': name, 'image': f'props/{name}.png'})
    for name in ['north-pole', 'workshop', 'city']:
        im = Image.open(SOURCE / f'background-{name}.png').convert('RGB')
        folder = OUT / 'backgrounds'
        folder.mkdir(exist_ok=True)
        im.save(folder / f'{name}.webp', quality=92)
        MANIFEST['backgrounds'].append({'name': name, 'image': f'backgrounds/{name}.webp',
                                        'width': im.width, 'height': im.height, 'tileable': False,
                                        'use': 'Background only; retain runtime collision and foreground geometry.'})
    story = json.loads((ROOT / 'docs/christmas-v1/storyboards.json').read_text(encoding='utf-8'))
    (OUT / 'story').mkdir(exist_ok=True)
    for page in range(3):
        im = Image.open(SOURCE / f'storyboard-{page + 1}.png').convert('RGB')
        for n in range(4):
            # Source pages are text-free equal 2x2 panels. Captions are separate.
            col, row = n % 2, n // 2
            tile = im.crop((round(col * im.width / 2), round(row * im.height / 2),
                            round((col + 1) * im.width / 2), round((row + 1) * im.height / 2)))
            panel = story['panels'][page * 4 + n]
            tile.save(OUT / panel['image'], quality=94)
    save_json(OUT / 'story/manifest.json', story)
    MANIFEST['story'] = story['panels']
    MANIFEST['releaseWindow'] = json.loads((ROOT / 'docs/christmas-v1/release-window.json').read_text(encoding='utf-8'))
    if (SOURCE / 'killer-klause-card.png').exists():
        card = Image.open(SOURCE / 'killer-klause-card.png').convert('RGB')
        card.save(OUT / 'killer-klause/card.webp', quality=94)
        MANIFEST['hero']['card'] = 'killer-klause/card.webp'
    save_json(OUT / 'manifest.json', MANIFEST)
    # Keep the gallery self-contained for file:// review as well as Vite.
    template = (ART / 'review-template.html').read_text(encoding='utf-8')
    (OUT / 'review.html').write_text(template.replace('/*__MANIFEST__*/{}', json.dumps(MANIFEST)), encoding='utf-8')
    total = sum(v['frameCount'] for v in MANIFEST['sheets'].values())
    print(f'Packed {total} authored frames, 3 backgrounds, 12 storyboard panels; gameplay unchanged.')


if __name__ == '__main__':
    main()
