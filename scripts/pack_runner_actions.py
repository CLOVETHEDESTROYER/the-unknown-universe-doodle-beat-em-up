"""Pack Blender renders using one scale and a stable center/foot anchor."""
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'output/runner-motion-v3/frames'
destination = ROOT / 'public/characters/xgod/runner-v3'
destination.mkdir(parents=True, exist_ok=True)
actions = ['run', 'jump', 'attack', 'crouch', 'sword-run', 'sword-jump', 'sword-attack', 'sword-crouch']
frames = {action: [Image.open(path).convert('RGBA') for path in sorted(source.glob(f'{action}-[0-9][0-9].png'))] for action in actions}
scale = 1.02
metadata = {'frameWidth': 512, 'frameHeight': 512, 'origin': [0.5, 0.9375], 'scale': scale,
            'naturalFacing': 'right', 'bodySize': [96, 270], 'bodyOffset': [208, 210],
            'crouchBodySize': [96, 160], 'crouchBodyOffset': [208, 320], 'displayScale': 0.4, 'actions': {}}
for action, images in frames.items():
    assert images, action
    sheet = Image.new('RGBA', (2048, math.ceil(len(images) / 4) * 512))
    for index, image in enumerate(images):
        bounds = image.getchannel('A').getbbox()
        assert bounds and min(bounds[:2]) > 1 and max(bounds[2:]) < 511, (action, index, bounds)
        image = image.resize((round(512 * scale), round(512 * scale)), Image.Resampling.LANCZOS)
        # A common X pivot preserves the reach of the hands instead of re-centering each pose.
        x = round(256 - 256 * scale)
        y = round(480 - bounds[3] * scale)
        frame = Image.new('RGBA', (512, 512))
        frame.alpha_composite(image, (x, y))
        bbox = frame.getchannel('A').getbbox()
        assert bbox and bbox[0] > 4 and bbox[2] < 508 and bbox[1] > 4, (action, index, bbox)
        sheet.alpha_composite(frame, ((index % 4) * 512, (index // 4) * 512))
    sheet.save(destination / f'{action}.png', optimize=True)
    metadata['actions'][action] = {'frames': len(images), 'fps': 16 if action.endswith('run') else 18}
(destination / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
