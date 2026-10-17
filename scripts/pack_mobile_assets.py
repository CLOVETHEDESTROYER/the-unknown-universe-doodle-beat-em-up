"""Build lossless trimmed mobile atlases and smaller display-only backgrounds.

Requires Pillow. Keeps original frame sizes/offsets and frame order in Phaser
multiatlas metadata, so gameplay coordinates and collision sizes do not change.
Run after changing any of the source artwork listed below.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
OUT = PUBLIC / 'mobile-v1'
OUT.mkdir(exist_ok=True)
SHEETS = {}


def add(pattern, width, height):
    for path in PUBLIC.glob(pattern):
        SHEETS[path.relative_to(PUBLIC).as_posix()] = (width, height)


for folder in ['runner-v4', 'runner-sword-v1', 'motion-v2', 'jump-v3', 'sword-idle-v3', 'blaster-run-v3']:
    add(f'characters/xgod/{folder}/*.png', 512, 512)
add('xgod_side_scroll*.png', 512, 512)
add('characters/equipment-v4/*.png', 768, 512)
add('characters/xgod/drawn-v1/*.png', 768, 512)
add('characters/z-god-v1/*.png', 768, 512)
add('characters/playable-v3/*-run.png', 640, 512)
add('characters/playable-v3/*-attack.png', 640, 512)
add('characters/playable-v3/*-jump.png', 640, 512)
for hero in ['barrett', 'nico', 'ezra', 'teleportation_c']:
    add(f'characters/{hero}/walk.png', 256, 360)
    add(f'characters/{hero}/attack.png', 480, 360)
add('characters/teleportation_c/dash.png', 256, 360)
add('companions/dinio/hybrid-v1/walk.png', 320, 320)
add('companions/dinio/hybrid-v1/attack.png', 448, 320)
add('doghost_walk.png', 240, 180)
add('grunt_walking_ai.png', 543, 724)
for enemy in ['alien', 'dasher']:
    add(f'doodles/m_{enemy}_walk_ai.png', 280, 280)
add('doodles/m_giant_walk_ai.png', 360, 420)
add('enemies/restored-v1/*.png', 512, 512)
add('bosses/encounters-v2/*/*.png', 640, 640)
add('bosses/kilina-v3/*.png', 640, 640)
add('bosses/kilina-witch-v1/*.png', 640, 640)
add('flight/void-pursuer-v3.png', 640, 400)


def layout(frames, width):
    pages = [[]]
    x = y = row = 0
    for number, crop, bounds in sorted(frames, key=lambda item: -item[1].height):
        w, h = crop.width + 4, crop.height + 4
        if w > width:
            return None
        if x + w > width:
            x, y, row = 0, y + row, 0
        if y + h > 2048:
            pages.append([])
            x = y = row = 0
        pages[-1].append((number, crop, bounds, x + 2, y + 2))
        x += w
        row = max(row, h)
    sizes = [(max(item[3] + item[1].width + 2 for item in page),
              max(item[4] + item[1].height + 2 for item in page)) for page in pages]
    return pages, sizes


manifest = {'sheets': {}, 'images': {}}
source_pixels = packed_pixels = 0
for source, (fw, fh) in sorted(SHEETS.items()):
    with Image.open(PUBLIC / source) as original:
        # Only regular, complete, unspaced sheets are handled here.
        if original.width % fw or original.height % fh:
            continue
        original = original.convert('RGBA')
        columns, rows = original.width // fw, original.height // fh
        frames = []
        for n in range(columns * rows):
            cell = original.crop(((n % columns) * fw, (n // columns) * fh,
                                  (n % columns + 1) * fw, (n // columns + 1) * fh))
            bounds = cell.getchannel('A').getbbox() or (0, 0, 1, 1)
            frames.append((n, cell.crop(bounds), bounds))
        options = [layout(frames, width) for width in [512, 768, 1024, 1536, 2048]]
        options = [option for option in options if option]
        if not options:
            continue
        pages, sizes = min(options, key=lambda item: sum(w * h for w, h in item[1]))
        pixels = sum(w * h for w, h in sizes)
        if pixels >= original.width * original.height * .92 and max(original.size) <= 4096:
            continue
        slug = hashlib.sha256(f'{source}:{fw}:{fh}'.encode()).hexdigest()[:16]
        textures = []
        for page_number, (page, size) in enumerate(zip(pages, sizes)):
            image_name = f'{slug}-{page_number}.png'
            image = Image.new('RGBA', size)
            entries = []
            for n, crop, bounds, x, y in sorted(page, key=lambda item: item[0]):
                image.paste(crop, (x, y))
                entries.append({'filename': str(n), 'rotated': False, 'trimmed': True,
                                'frame': {'x': x, 'y': y, 'w': crop.width, 'h': crop.height},
                                'sourceSize': {'w': fw, 'h': fh},
                                'spriteSourceSize': {'x': bounds[0], 'y': bounds[1], 'w': crop.width, 'h': crop.height}})
            image.save(OUT / image_name, optimize=True)
            textures.append({'image': image_name, 'frames': entries})
        (OUT / f'{slug}.json').write_text(json.dumps({'textures': textures}, separators=(',', ':')), encoding='utf-8')
        manifest['sheets'][source] = {'url': f'/mobile-v1/{slug}.json', 'width': fw, 'height': fh, 'count': columns * rows}
        source_pixels += original.width * original.height
        packed_pixels += pixels

patterns = ['platformer/*panorama*.png', 'platformer/*parallax*.png', 'flight/*panorama*.png',
            'flight/*parallax*.png', 'cave_level_*.png', 'cards/*.png', 'GameStartScreen.png', 'Level1Intro.png',
            'characters/xgod/runner-blaster-v1/*-pose-v1.png']
for path in sorted({path for pattern in patterns for path in PUBLIC.glob(pattern)}):
    source = path.relative_to(PUBLIC).as_posix()
    with Image.open(path) as image:
        limit = 768 if source.startswith('cards/') else 1536
        if max(image.size) <= limit:
            continue
        slug = hashlib.sha256(source.encode()).hexdigest()[:16] + '-image.png'
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        image.save(OUT / slug, optimize=True)
        manifest['images'][source] = f'/mobile-v1/{slug}'

(ROOT / 'gameplay/mobileAssetManifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'sheets': len(manifest['sheets']), 'images': len(manifest['images']),
                  'sourceDecodedMiB': round(source_pixels * 4 / 1048576, 1),
                  'packedDecodedMiB': round(packed_pixels * 4 / 1048576, 1),
                  'reductionPercent': round((1 - packed_pixels / source_pixels) * 100, 1)}))
