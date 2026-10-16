"""Normalize existing approved art; shared scales preserve anatomy across actions."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPECS = {
    'dark_dragon': dict(scale=.55, anchor=320, walk=('dark_dragon_walk_v2.png',560,560,[260]*7), attack=('dark_dragon_attack_v2.png',980,620,[450,372,372,372])),
    'ink_behemoth': dict(scale=.70, anchor=320, walk=('cinder_colossus_idle_v1.png',418,627,[230]*6), attack=('cinder_colossus_attack_v1.png',627,627,[420,390,420,390])),
    'void_regent': dict(scale=.75, anchor=320, walk=('void_regent_walk_v3.png',768,512,[340,330,370,330]), attack=('void_regent_attack_v3.png',768,512,[400,400,360,350])),
}
for boss, spec in SPECS.items():
    dest = ROOT/'public/bosses/encounters-v2'/boss
    dest.mkdir(parents=True,exist_ok=True)
    preview = Image.new('RGBA',(1024,768),'#c3c6c2')
    draw = ImageDraw.Draw(preview)
    for row, action in enumerate(['walk','attack']):
        filename, w, h, anchors = spec[action]
        source = Image.open(ROOT/'public/bosses'/filename).convert('RGBA')
        sheet = Image.new('RGBA',(640*len(anchors),640))
        for i, anchor_x in enumerate(anchors):
            cell = np.array(source.crop(((i%(source.width//w))*w,(i//(source.width//w))*h,(i%(source.width//w)+1)*w,(i//(source.width//w)+1)*h)))
            n, labels, stats, centers = cv2.connectedComponentsWithStats((cell[:,:,3]>24).astype('uint8'),8)
            main = 1+np.argmax(stats[1:,4])
            x,y,cw,ch,_ = stats[main]
            keep = labels == main
            # Preserve the Regent's separate floating crown; remove neighboring-cell debris.
            if boss == 'void_regent':
                for k in range(1,n):
                    if stats[k,4]>120 and x+30 < centers[k,0] < x+cw-30 and centers[k,1] < y+50:
                        keep |= labels == k
            cell[:,:,3] = np.where(keep,cell[:,:,3],0)
            art = Image.fromarray(cell).resize((round(w*spec['scale']),round(h*spec['scale'])),Image.Resampling.LANCZOS)
            baseline = 525 if boss == 'dark_dragon' and action == 'attack' else y+ch
            frame = Image.new('RGBA',(640,640))
            frame.alpha_composite(art,(round(spec['anchor']-anchor_x*spec['scale']),round(600-baseline*spec['scale'])))
            sheet.alpha_composite(frame,(i*640,0))
            # Show representative ready/commit/recover poses with a common floor.
            if i < 4:
                preview.alpha_composite(frame.resize((256,256)),(i*256,row*350+30))
                draw.line((i*256,row*350+270,(i+1)*256,row*350+270),fill='#444444',width=2)
                draw.text((i*256+8,row*350+292),f'{action} {i}',fill='black')
        sheet.save(dest/f'{action}.png',optimize=True)
    (dest/'metadata.json').write_text(json.dumps({'frameSize':640,'origin':[spec['anchor']/640,600/640],'sourceScale':spec['scale'],'sources':{a:spec[a][0] for a in ['walk','attack']}},indent=2))
    out=ROOT/'output/boss-encounters-v2'
    out.mkdir(parents=True,exist_ok=True)
    preview.convert('RGB').save(out/f'{boss}-preview.jpg',quality=94)
    print(dest)
