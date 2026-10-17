"""Normalize the generated four-frame fire crescent into a small PNG strip."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/fire-blade-v1'
OUT = ROOT / 'public/powerups/fire-blade-v1'
source = Image.open(ART / 'source.png').convert('RGBA')
frames = []
for row in range(2):
    for col in range(2):
        cell = source.crop((col*source.width//2, row*source.height//2,
                            (col+1)*source.width//2, (row+1)*source.height//2))
        pixels = np.array(cell)
        mask = ndimage.binary_dilation(pixels[:, :, 3] > 210, iterations=2)
        pixels[:, :, 3] = np.where(mask, pixels[:, :, 3], 0)
        cell = Image.fromarray(pixels)
        frames.append(cell.crop(cell.getchannel('A').getbbox()))
scale = min(112/max(p.width for p in frames), 200/max(p.height for p in frames))
strip = Image.new('RGBA', (128*4, 224))
preview = Image.new('RGBA', strip.size, '#283038')
bounds = []
for i, frame in enumerate(frames):
    frame = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.LANCZOS)
    pos = ((128-frame.width)//2, (224-frame.height)//2)
    strip.alpha_composite(frame, (i*128+pos[0], pos[1]))
    preview.alpha_composite(frame, (i*128+pos[0], pos[1]))
    bounds.append([*pos, frame.width, frame.height])
OUT.mkdir(parents=True, exist_ok=True)
strip.save(OUT / 'blade.png', optimize=True)
preview.convert('RGB').save(ART / 'preview.jpg', quality=95)
(ART / 'metadata.json').write_text(json.dumps({'frameSize':[128,224], 'frames':4,
    'scale':scale, 'bounds':bounds, 'atlas':list(strip.size),
    'rgbaBytes':strip.width*strip.height*4}, indent=2)+'\n')
print('Packed fire blade', strip.size, 'RGBA MiB', strip.width*strip.height*4/1024**2)
