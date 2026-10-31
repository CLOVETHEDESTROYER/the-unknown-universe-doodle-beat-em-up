"""Pack generated shadow-kid drafts without redrawing or stretching individual poses."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/shadow-kid-v1'
OUT = ROOT / 'public/characters/shadow-kid-v1'
OUT.mkdir(parents=True, exist_ok=True)
CW, CH, BASELINE, SCALE = 512, 384, 352, .56


def extract(name):
    src = Image.open(ART / f'{name}-source.png').convert('RGBA')
    pixels = np.array(src)
    labels, count = ndimage.label(pixels[:, :, 3] > 128)
    sizes = np.bincount(labels.ravel())
    boxes = ndimage.find_objects(labels)
    mains = [i for i in range(1, count + 1) if sizes[i] > 20000]
    expected = 16 if name == 'reactions' else 8
    assert len(mains) == expected, (name, len(mains))
    mains.sort(key=lambda i: boxes[i-1][0].start)
    mains = [i for row in [mains[n:n+4] for n in range(0, expected, 4)]
             for i in sorted(row, key=lambda i: boxes[i-1][1].start)]
    centers = [((boxes[i-1][1].start + boxes[i-1][1].stop)/2,
                (boxes[i-1][0].start + boxes[i-1][0].stop)/2) for i in mains]
    groups = {i: [i] for i in mains}
    for i, box in enumerate(boxes, 1):
        if box is None or i in groups or sizes[i] < 8:
            continue
        y, x = box
        cx, cy = (x.start+x.stop)/2, (y.start+y.stop)/2
        nearest = min(range(expected), key=lambda k: (cx-centers[k][0])**2 + (cy-centers[k][1])**2)
        # The released orb extends into the next grid slot; keep it with throw frame 6.
        if name == 'throw' and 750 < cx < 840 and 620 < cy < 790:
            nearest = 5
        groups[mains[nearest]].append(i)
    poses = []
    for i in mains:
        mask = ndimage.binary_dilation(np.isin(labels, groups[i]), iterations=2)
        frame = pixels.copy()
        frame[:, :, 3] = np.where(mask, pixels[:, :, 3], 0)
        frame = Image.fromarray(frame)
        box = frame.getbbox()
        assert box is not None
        poses.append((frame.crop(box), box))
    return poses


manifest = {'status': 'first playable integration', 'cellWidth': CW,
            'cellHeight': CH, 'anchor': [CW//2, BASELINE],
            'facing': 'right', 'scale': SCALE, 'animations': {}}
previews = []


def pack(action, poses, fps, loop, source, jump=False, scale=SCALE):
    sheet = Image.new('RGBA', (CW*4, CH*((len(poses)+3)//4)))
    cells = []
    entries = []
    for index, (pose, box) in enumerate(poses):
        resized = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
        # Foot midpoint rather than whole-image midpoint keeps reaching hands from shifting the body.
        footbox = pose.getchannel('A').crop((0, int(pose.height*.85), pose.width, pose.height)).getbbox()
        center = (footbox[0]+footbox[2])/2 if footbox else pose.width/2
        x = round(CW/2-center*scale)
        lift = round(max(0, 1005-box[3])*SCALE) if jump and index in (1, 2) else 0
        y = BASELINE-resized.height-lift
        assert x >= 0 and y >= 0 and x+resized.width <= CW and y+resized.height <= CH, (action,index)
        cell = Image.new('RGBA', (CW, CH))
        cell.alpha_composite(resized, (x, y))
        frame_dir = ART / 'frames' / action
        frame_dir.mkdir(parents=True, exist_ok=True)
        cell.save(frame_dir / f'{index:02}.png')
        sheet.alpha_composite(cell, ((index%4)*CW, (index//4)*CH))
        cells.append(cell)
        entries.append({'bounds': list(cell.getbbox()), 'sourceBounds': list(box)})
    sheet.save(OUT / f'{action}.png')
    manifest['animations'][action] = {'file': f'{action}.png', 'frames': len(cells), 'columns': 4,
        'fps': fps, 'loop': loop, 'source': source, 'poses': entries}
    # Composited review GIF: alpha remains intact in the PNG masters.
    review_frames = []
    for cell in cells:
        bg = Image.new('RGBA', cell.size, '#eae3d8')
        bg.alpha_composite(cell)
        review_frames.append(bg.convert('RGB'))
    review_frames[0].save(ART / f'{action}-preview.gif', save_all=True,
                          append_images=review_frames[1:], duration=round(1000/fps), loop=0)
    previews.append((action, cells))


idle_jump = extract('idle-jump')
pack('idle', idle_jump[:4], 6, True, 'idle-jump-source.png')
pack('jump', idle_jump[4:], 9, False, 'idle-jump-source.png', jump=True)
pack('run', extract('run'), 12, True, 'run-source.png')
pack('throw', extract('throw'), 10, False, 'throw-source.png')
reactions = extract('reactions')
# New sheet has smaller source figures; one shared scale across all four actions.
reaction_scale = 270 / reactions[12][0].height
for row, action in enumerate(['crouch', 'hurt', 'death', 'victory']):
    pack(action, reactions[row*4:row*4+4], 7, action in ('crouch','victory'), 'reactions-source.png', scale=reaction_scale)
manifest['animations']['throw']['releaseFrame'] = 5
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
review = Image.new('RGB', (8*256, len(previews)*220), '#eae3d8')
draw = ImageDraw.Draw(review)
for row, (action, cells) in enumerate(previews):
    for col, cell in enumerate(cells):
        thumb = cell.resize((256,192))
        review.paste(thumb, (col*256,row*220+25),thumb)
        draw.text((col*256+8,row*220+6), f'{action} {col+1}',fill='#261a32')
review.save(ART / 'animation-preview.jpg', quality=93)
# Mobile-safe atlas pages are <=2048 on either edge, with string frame names.
def atlas(name, cells):
    canvas = Image.new('RGBA', (CW*4, CH*((len(cells)+3)//4)))
    frames = []
    for i, cell in enumerate(cells):
        x,y = i%4*CW,i//4*CH
        canvas.alpha_composite(cell,(x,y))
        frames.append({'filename':str(i),'frame':{'x':x,'y':y,'w':CW,'h':CH},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':CW,'h':CH},'sourceSize':{'w':CW,'h':CH}})
    canvas.save(OUT / f'{name}-atlas.png')
    (OUT / f'{name}.json').write_text(json.dumps({'textures':[{'image':f'{name}-atlas.png','format':'RGBA8888','size':{'w':canvas.width,'h':canvas.height},'scale':1,'frames':frames}]}))

sets = dict(previews)
for action,cells in previews:
    atlas(action,cells)
atlas('mobility',sets['jump'] + [sets['crouch'][1],sets['jump'][1],sets['crouch'][1],sets['crouch'][0]] + sets['crouch']*2)
seed = Image.open(ART/'seed.png').convert('RGBA')
seed.thumbnail((CW,CH))
seed.save(OUT/'portrait.png')
effect = Image.open(ART/'black-hole-source.png').convert('RGBA')
effect = effect.crop(effect.getbbox())
effect.thumbnail((192,192))
effect.save(OUT/'black-hole.png')
print('Packed 40 frames and mobile-safe atlases.')
