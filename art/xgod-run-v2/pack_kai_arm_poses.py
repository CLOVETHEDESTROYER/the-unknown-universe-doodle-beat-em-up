"""Pack arm cannon crouch and jump art with frame-specific barrel anchors."""
import json
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
folder = root / 'public/characters/xgod/kai-arm-v1'
source = Image.open(Path(__file__).with_name('kai-arm-crouch-jump-source.png')).convert('RGBA')
w, h, baseline = 768, 512, 480
shooting_points = [(348, 218), (782, 240), (1222, 260), (1666, 227),
                   (343, 681), (785, 643), (1227, 620), (1669, 642)]

def frames(sheet):
    for y in range(0, sheet.height, h):
        for x in range(0, sheet.width, w):
            yield sheet.crop((x, y, x+w, y+h))

def cyan_muzzle(frame):
    r, g, b, a = np.asarray(frame, dtype=float).transpose(2, 0, 1)
    yy, xx = np.where((a > 180) & (g > 125) & (b > 120) & (g > r*1.5) & (b > r*1.5))
    x = int(np.quantile(xx, .96))
    return [x, int(np.median(yy[xx >= x-10]))]

standing = list(frames(Image.open(folder / 'arm.png').convert('RGBA')))
muzzles = {
    'xgod_kai_arm': [cyan_muzzle(pose) for pose in standing],
    'xgod_kai_arm_run': [cyan_muzzle(pose) for pose in frames(Image.open(folder / 'run-v2.png').convert('RGBA'))],
}
# The fire frame includes a drawn flash that extends beyond the barrel.
muzzles['xgod_kai_arm'][2][0] = muzzles['xgod_kai_arm'][1][0]

reference_height = standing[0].getbbox()[3] - standing[0].getbbox()[1]
for row, action in enumerate(('crouch', 'jump')):
    sheet = Image.new('RGBA', (w*4, h))
    points = []
    for col in range(4):
        left, top = col*source.width//4, row*source.height//2
        cell = source.crop((left, top, (col+1)*source.width//4, (row+1)*source.height//2))
        # Trim soft alpha noise around the pose for a stable foot line.
        bounds = cell.getchannel('A').point(lambda a: 255 if a > 96 else 0).getbbox()
        pose = cell.crop(bounds)
        if row == 0 and col == 0:
            scale = reference_height / pose.height
        feet = pose.crop((0, round(pose.height*.87), pose.width, pose.height)).getbbox()
        pose = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
        x = round(w/2 - (feet[0]+feet[2])/2*scale)
        y = baseline - pose.height
        sheet.alpha_composite(pose, (col*w+x, y))
        mx, my = shooting_points[row*4+col]
        points.append([round(x+(mx-left-bounds[0])*scale), round(y+(my-top-bounds[1])*scale)])
    sheet.save(folder / (action+'.png'), optimize=True)
    muzzles['xgod_kai_arm_'+action] = points
(folder / 'muzzles.json').write_text(json.dumps(muzzles, indent=2)+'\n')
