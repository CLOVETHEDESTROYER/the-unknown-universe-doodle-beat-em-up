"""Register the v3 King and storm effects on shared anchors and source scales."""
from pathlib import Path
import json
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/seasonal/turkey-king-sprites-v3'
OUT = ROOT / 'public/characters/turkey-king-v3'
OUT.mkdir(parents=True, exist_ok=True)


def cells(name, columns, rows, minimum_area=100):
    image = Image.open(SOURCE / f'{name}-generated.png').convert('RGBA')
    # Assign whole connected silhouettes before cutting: extended staff poses can
    # cross an ideal grid line without belonging to their neighbouring frame.
    pixels = np.array(image)
    count, labels, stats, centers = cv2.connectedComponentsWithStats((pixels[:, :, 3] > 100).astype('uint8'), 8)
    frames = []
    for row in range(rows):
        for column in range(columns):
            components = [i for i in range(1, count) if stats[i, 4] >= minimum_area
                          and min(columns - 1, int(centers[i][0] * columns / image.width)) == column
                          and min(rows - 1, int(centers[i][1] * rows / image.height)) == row]
            mask = cv2.dilate(np.isin(labels, components).astype('uint8'), np.ones((3, 3), np.uint8))
            isolated = pixels.copy()
            isolated[:, :, 3] = np.where(mask, pixels[:, :, 3], 0)
            frames.append(Image.fromarray(isolated).crop((round(column * image.width / columns) - 60, round(row * image.height / rows),
                          round((column + 1) * image.width / columns) + 60, round((row + 1) * image.height / rows))))
    return frames


def register(frames, columns, scale, frame_size=640, grounded=None):
    output = []
    for row in range(len(frames) // columns):
        ids = grounded[row] if grounded else list(range(row * columns, (row + 1) * columns))
        baseline = round(float(np.median([frames[i].getbbox()[3] for i in ids])))
        for index in range(row * columns, (row + 1) * columns):
            source = frames[index]
            box = source.getbbox()
            assert box, index
            pose = source.crop(box)
            pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
            x = round(frame_size / 2 + (box[0] - source.width * .48) * scale)
            y = round(frame_size * .9375 + (box[1] - baseline) * scale)
            assert x >= 4 and y >= 4 and x + pose.width <= frame_size - 4 and y + pose.height <= frame_size - 4, (index, x, y, pose.size)
            frame = Image.new('RGBA', (frame_size, frame_size))
            frame.alpha_composite(pose, (x, y))
            output.append(frame)
    return output


def sheet(name, frames, columns):
    size = frames[0].width
    image = Image.new('RGBA', (size * columns, size * ((len(frames) + columns - 1) // columns)))
    for i, frame in enumerate(frames):
        image.alpha_composite(frame, (i % columns * size, i // columns * size))
    image.save(OUT / name, optimize=True)


movement_source = cells('movement', 4, 3)
combat_source = cells('combat', 4, 4)
storm_source = cells('storm', 3, 2)
movement_height = movement_source[0].getbbox()[3] - movement_source[0].getbbox()[1]
combat_height = combat_source[0].getbbox()[3] - combat_source[0].getbbox()[1]
# The staff is upright in these ready poses, so standing height measures the body.
storm_height = storm_source[0].getbbox()[3] - storm_source[0].getbbox()[1]
movement = register(movement_source, 4, 450 / movement_height, grounded=[[0, 1], [4, 5, 6, 7], [8, 11]])
combat = register(combat_source, 4, 450 / combat_height)
storm = register(storm_source, 3, 450 / storm_height, frame_size=768)
sheet('movement.png', movement, 4)
sheet('combat.png', combat, 4)
sheet('storm.png', storm, 3)
sheet('flight-walk.png', movement[2:8], 6)
sheet('victory.png', [combat[14], combat[14], combat[15], combat[14]], 4)
sheet('death.png', [combat[12], combat[13], combat[13], combat[13]], 4)
movement[0].save(OUT / 'idle.png', optimize=True)
card = movement[0].crop(movement[0].getbbox())
card.thumbnail((450, 620))
card.save(OUT / 'card.webp', quality=92)
shutil.copyfile(ROOT / 'public/characters/turkey-king-v2/turkey-projectile.png', OUT / 'turkey-projectile.png')

effects = cells('effects', 4, 3, minimum_area=18)
for name, source_frames, size, scale in [('rain.png', effects[:4], 256, .64),
                                         ('burst.png', effects[4:8], 256, .64),
                                         ('wings.png', effects[8:], 128, .3)]:
    normalized = []
    for source in source_frames:
        image = Image.new('RGBA', (size, size))
        source = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
        image.alpha_composite(source, ((size - source.width) // 2, (size - source.height) // 2))
        normalized.append(image)
    sheet(name, normalized, 4)

bolts = cells('lightning', 4, 1, minimum_area=18)
lightning = Image.new('RGBA', (1024, 512))
for i, source in enumerate(bolts):
    source = source.crop(source.getbbox())
    source.thumbnail((244, 500), Image.Resampling.LANCZOS)
    lightning.alpha_composite(source, (i * 256 + (256 - source.width) // 2, 512 - source.height))
lightning.save(OUT / 'lightning.png', optimize=True)

metadata = {
    'character': 'The Turkey King', 'version': 3, 'standingHeight': 208,
    'baseFacing': 'right', 'origin': [.5, .9375],
    'movement': {'frameSize': 640, 'idle': [0, 1], 'walk': [2, 3, 4, 5, 6, 7], 'crouch': 8, 'rise': 9, 'fall': 10, 'land': 11},
    'combat': {'frameSize': 640, 'staff': list(range(6)), 'throw': list(range(6, 12)), 'hurt': 12, 'defeat': 13, 'victory': [14, 15]},
    'storm': {'frameSize': 768, 'frames': list(range(6)), 'invokeMs': 640},
    'scales': {'movement': 450 / movement_height, 'combat': 450 / combat_height, 'storm': 450 / storm_height},
}
(OUT / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')

def height(frame):
    box = frame.getbbox()
    return box[3] - box[1]

path = ROOT / 'gameplay/characterSizes.generated.json'
profiles = json.loads(path.read_text())
profiles['turkey_king'] = {'target': 208, 'base': height(movement[0]), 'special': height(movement[0]),
                          'mobility': height(movement[0]), 'victory': height(combat[14]),
                          'death': height(combat[12]), 'flight': height(movement[0]), 'equipment': {}, 'textures': {}}
path.write_text(json.dumps(profiles, indent=2) + '\n')

all_frames = movement + combat
preview = Image.new('RGB', (960, 240 * 7), '#dce2e8')
for i, frame in enumerate(all_frames):
    frame = frame.resize((240, 240), Image.Resampling.LANCZOS)
    preview.paste(frame, (i % 4 * 240, i // 4 * 240), frame)
preview.save(SOURCE / 'preview.png')
for name, frames in [('walk', movement[2:8]), ('staff', combat[:6]), ('throw', combat[6:12]), ('storm', storm)]:
    images = []
    for frame in frames:
        image = Image.new('RGBA', (320, 360), '#dce2e8')
        frame = frame.resize((320, 320), Image.Resampling.LANCZOS)
        image.alpha_composite(frame, (0, 24))
        images.append(image.convert('RGB'))
    images[0].save(SOURCE / f'{name}-preview.gif', save_all=True, append_images=images[1:], duration=90, loop=0)
print(json.dumps({'frames': len(all_frames) + len(storm), 'profile': profiles['turkey_king']}))
