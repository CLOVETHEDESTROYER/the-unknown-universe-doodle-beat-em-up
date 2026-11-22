"""Register the generated 4x2 run sheet with fixed scale and hip/floor anchors.

The generic strip helper centers the full silhouette, so a shoulder launcher
and alternating extended boots shift its pivot. Keep the authored torso axis
instead. This only crops, scales and packs the generated artwork.
"""
import json
from PIL import Image
from pack_christmas_v1 import ART, OUT, isolate_grid, contact, loop


def pack():
    frames, boxes = isolate_grid('klause-run-v2', 4, 2)
    source = Image.open(ART / 'source/klause-run-v2.png')
    slot_width = source.width / 4
    pad = round(slot_width * .25)
    scale = 420 / (boxes[0][3] - boxes[0][1])
    sheet = Image.new('RGBA', (2560, 1280))
    normalized, audit = [], []
    folder = ART / 'frames/klause-run-v2'
    folder.mkdir(parents=True, exist_ok=True)
    # Source belt/hip centers, relative to each ideal cell, measured once.
    hips = [241, 245, 242, 243, 241, 245, 242, 243]
    # Barrel centers in source cell coordinates; registration transforms these
    # with the artwork so projectiles stay attached to the moving launcher.
    source_muzzles = [(399, 94), (397, 114), (397, 95), (399, 86),
                      (399, 96), (397, 112), (399, 95), (400, 81)]
    muzzles = []
    for i, (slot, box) in enumerate(zip(frames, boxes)):
        pose = slot.crop(box)
        pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
        pivot = hips[i] + pad
        x = round(320 + (box[0] - pivot) * scale)
        # Airborne passing poses lift the feet by 4.5 world pixels. Contact and
        # compression poses stay planted, with no per-frame scale stretching.
        floor = 588 if i in (3, 7) else 600
        y = floor - pose.height
        pad_y = round(source.height / 2 * .25)
        mx, my = source_muzzles[i]
        muzzles.append([round(x + (pad + mx - box[0]) * scale), round(y + (pad_y + my - box[1]) * scale)])
        frame = Image.new('RGBA', (640, 640))
        frame.alpha_composite(pose, (x, y))
        bounds = frame.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
        assert bounds and min(bounds[:2]) >= 16 and max(bounds[2:]) <= 624, (i, bounds)
        frame.save(folder / f'{i:02}.png', optimize=True)
        sheet.alpha_composite(frame, ((i % 4) * 640, (i // 4) * 640))
        normalized.append(frame)
        audit.append({'frame': i, 'sourceBounds': list(box), 'exportBounds': list(bounds), 'hipX': 320, 'floorY': floor})
    assert len({frame.tobytes() for frame in normalized}) == 8
    destination = OUT / 'killer-klause/run-v2.png'
    sheet.save(destination, optimize=True)
    entry = {'image': 'killer-klause/run-v2.png', 'columns': 4, 'rows': 2,
             'frameWidth': 640, 'frameHeight': 640, 'frameCount': 8,
             'origin': [.5, .9375], 'sharedSourceScale': scale,
             'worldStandingHeight': 240, 'worldDistancePerFrame': 24, 'muzzles': muzzles,
             'animations': {'run': {'frames': list(range(8)), 'frameRate': 12.5, 'repeat': -1}}, 'bounds': audit}
    (OUT / 'killer-klause/run-v2.json').write_text(json.dumps(entry, indent=2) + '\n')
    runtime = {'distancePerFrame': 24, 'muzzles': muzzles}
    (ART.parents[2] / 'gameplay/klauseRun.generated.json').write_text(json.dumps(runtime, indent=2) + '\n')
    contact(normalized, 'klause-run-v2')
    loop(normalized, list(range(8)), 12.5, 'klause-run-v2')
    print(f'Packed {len(normalized)} distinct frames at shared scale {scale:.4f}: {destination}')
    return entry


def main():
    entry = pack()
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['sheets']['klause-run-v2'] = entry
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    template = (ART / 'review-template.html').read_text(encoding='utf-8')
    (OUT / 'review.html').write_text(template.replace('/*__MANIFEST__*/{}', json.dumps(manifest)), encoding='utf-8')


if __name__ == '__main__':
    main()
