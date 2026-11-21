"""Pack ImageGen sheets without repainting pixels or manufacturing animation frames."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/workshop-v1'
OUT = ROOT / 'public/workshop/v1'
OUT.mkdir(parents=True, exist_ok=True)
POWER_IDS = ['blaster', 'sword', 'frost', 'ember', 'storm', 'kai-arm', 'shield',
             'rapid', 'fan', 'homing', 'gravity', 'heart', 'rush-star']


def split(source, columns, rows, isolate=False):
    assert source.getchannel('A').getextrema()[0] == 0, 'Native transparency required'
    frames = []
    pixels = np.array(source) if isolate else None
    if isolate:
        labels, count = ndimage.label(pixels[:, :, 3] > 8)
        objects = ndimage.find_objects(labels)
        centers = ndimage.center_of_mass(pixels[:, :, 3], labels, range(1, count + 1))
        groups = [[] for _ in range(columns * rows)]
        for label, box in enumerate(objects, 1):
            if box is None:
                continue
            cy, cx = centers[label - 1]
            col = min(columns - 1, int(cx * columns / source.width))
            row = min(rows - 1, int(cy * rows / source.height))
            groups[row * columns + col].append(label)
    for n in range(columns * rows):
        x, y = n % columns, n // columns
        margin = 24 if isolate else 0
        box = (round(x * source.width / columns) - margin, round(y * source.height / rows) - margin,
               round((x + 1) * source.width / columns) + margin, round((y + 1) * source.height / rows) + margin)
        if isolate:
            # Isolate complete painted components before cropping; crowns and howl waves
            # may cross an approximate grid boundary. Never import a neighboring sprite.
            rgba = pixels.copy()
            mask = ndimage.binary_dilation(np.isin(labels, groups[n]), iterations=1)
            rgba[:, :, 3] = np.where(mask, rgba[:, :, 3], 0)
            cell = Image.fromarray(rgba).crop(box)
        else:
            cell = source.crop(box)
        assert cell.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox(), n
        frames.append(cell)
    return frames


def write(name, frames, columns, size, scale, anchors):
    sheet = Image.new('RGBA', (columns * size, (len(frames) // columns) * size))
    packed = []
    for n, cell in enumerate(frames):
        bounds = cell.getchannel('A').point(lambda a: 255 if a > 5 else 0).getbbox()
        crop = cell.crop(bounds)
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
        ax, ay, dx, dy = anchors[n]
        ox, oy = round(dx + (bounds[0] - ax) * scale), round(dy + (bounds[1] - ay) * scale)
        assert ox >= -1 and oy >= -1 and ox + crop.width <= size + 1 and oy + crop.height <= size + 1, (name, n, ox, oy, crop.size)
        frame = Image.new('RGBA', (size, size))
        frame.alpha_composite(crop, (ox, oy))
        sheet.alpha_composite(frame, (n % columns * size, n // columns * size))
        packed.append(frame)
    sheet.save(OUT / f'{name}.webp', lossless=True, method=6, exact=True)
    packed[0].save(OUT / f'{name}-poster.webp', lossless=True, method=6, exact=True)
    review = Image.new('RGB', sheet.size, '#dbe2e8')
    review.paste(sheet, mask=sheet.getchannel('A'))
    review.save(ART / f'{name}-preview.jpg', quality=90)
    return packed


metadata = {}
buddy_previews = {}
for name in POWER_IDS:
    source = Image.open(ART / f'{name}-generated.png').convert('RGBA')
    frames = split(source, 2, 2)
    boxes = [f.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox() for f in frames]
    scale = 166 / max(max(b[2] - b[0], b[3] - b[1]) for b in boxes)
    anchors = [((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 96, 96) for b in boxes]
    packed = write(name, frames, 4, 192, scale, anchors)
    metadata[name] = {'columns': 4, 'rows': 1, 'frames': 4, 'frameSize': 192, 'fps': 7}

for name, rows, height in [('dinio', 4, 260), ('doghost', 4, 200), ('teleportation-c', 6, 220)]:
    path = ART / f'{name}-generated.png'
    if not path.exists():
        continue
    frames = split(Image.open(path).convert('RGBA'), 4, rows, isolate=True)
    boxes = [f.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox() for f in frames]
    scale = height / float(np.median([b[3] - b[1] for b in boxes[:4]]))
    anchors = []
    for n, f in enumerate(frames):
        # A single scale and a shared row baseline preserve anticipation and airborne poses.
        row = n // 4
        baseline = float(np.median([boxes[i][3] for i in range(row * 4, row * 4 + 4)]))
        anchors.append((f.width / 2, baseline, 160, 300))
    # Fit all painted pixels, including attack wisps, while retaining one shared scale.
    for f, (ax, ay, dx, dy) in zip(frames, anchors):
        b = f.getchannel('A').point(lambda a: 255 if a > 5 else 0).getbbox()
        scale = min(scale, 154 / max(ax - b[0], b[2] - ax, 1), 294 / max(ay - b[1], 1))
    packed = write(name, frames, 4, 320, scale, anchors)
    buddy_previews[name] = packed
    metadata[name] = {'columns': 4, 'rows': rows, 'frames': rows * 4, 'frameSize': 320,
                      'fps': 10, 'origin': [0.5, 300 / 320], 'bodyHeight': round(height), 'scale': scale}
    for action, ids in [('idle', range(4)), ('run', range(4, 12)),
                        ('attack', range(16, 20) if rows == 6 else range(12, 16))]:
        preview = []
        for i in ids:
            bg = Image.new('RGBA', (320, 320), '#dbe2e8')
            bg.alpha_composite(packed[i])
            preview.append(bg.convert('RGB'))
        preview[0].save(ART / f'{name}-{action}.gif', save_all=True, append_images=preview[1:], duration=100, loop=0)

(OUT / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
contact = Image.new('RGB', (7 * 160, 2 * 190), '#e9e7df')
draw = ImageDraw.Draw(contact)
for n, name in enumerate(POWER_IDS):
    im = Image.open(OUT / f'{name}-poster.webp').convert('RGBA')
    im.thumbnail((150, 150))
    x, y = n % 7 * 160, n // 7 * 190
    contact.paste(im, (x + 5, y), im)
    draw.text((x + 8, y + 155), name, fill='#222222')
contact.save(ART / 'powerups-contact.jpg', quality=92)
if len(buddy_previews) == 3:
    animation = []
    for n in range(16):
        stage = Image.new('RGB', (960, 350), '#faf6ec')
        labels = ImageDraw.Draw(stage)
        for col, (name, frames) in enumerate(buddy_previews.items()):
            index = n + 4 if name == 'teleportation-c' and n >= 12 else n
            stage.paste(frames[index], (col * 320, 0), frames[index])
            labels.text((col * 320 + 115, 325), {'dinio':'Dinio','doghost':'Doghost','teleportation-c':'Teleportation C'}[name], fill='#29283b')
        animation.append(stage)
    animation[0].save(ART / 'buddies.gif', save_all=True, append_images=animation[1:], duration=120, loop=0, disposal=2)
print(f'Packed {len(metadata)} animated assets; source pixels and native alpha preserved.')
