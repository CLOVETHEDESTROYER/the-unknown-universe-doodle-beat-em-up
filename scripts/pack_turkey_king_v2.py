"""Pack right-facing King frames, a registered turkey flight loop and throw demo."""
from pathlib import Path
import subprocess,sys,json
import cv2
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/seasonal/turkey-king-sprites-v2'
OUT=ROOT/'public/characters/turkey-king-v2'
subprocess.run([sys.executable,str(ROOT/'scripts/pack_turkey_king_v1.py'),'--source',str(SOURCE),'--out',str(OUT),'--facing','right'],check=True)
data=np.array(Image.open(SOURCE/'projectile-generated.png').convert('RGBA'))
n,labels,stats,centers=cv2.connectedComponentsWithStats((data[:,:,3]>40).astype('uint8'),8)
mains=sorted([i for i in range(1,n) if stats[i,4]>10000],key=lambda i:stats[i,0])
assert len(mains)==4,len(mains)
birds=[];anchors=[]
for i in mains:
    mask=cv2.dilate((labels==i).astype('uint8'),np.ones((3,3),np.uint8))
    pixels=data.copy();pixels[:,:,3]=np.where(mask,data[:,:,3],0)
    im=Image.fromarray(pixels);im=im.crop(im.getbbox());a=np.array(im)
    yy,xx=np.indices(a.shape[:2]);rgb=a[:,:,:3].astype(float)
    beak=(a[:,:,3]>160)&(rgb[:,:,0]>170)&(rgb[:,:,1]>105)&(rgb[:,:,2]<100)&(xx>im.width*.7)&(yy<im.height*.7)
    by,bx=np.where(beak);assert len(bx)>20
    # Register on the beak rather than wing tips, so the body does not bounce
    # up and down merely because the wings change their silhouette.
    anchors.append((float(np.median(bx)),float(np.median(by))));birds.append(im)
scale=min(194/max(a[0] for a in anchors),30/max(im.width-a[0] for im,a in zip(birds,anchors)),
          84/max(a[1] for a in anchors),140/max(im.height-a[1] for im,a in zip(birds,anchors)))
strip=Image.new('RGBA',(1024,256));frames=[]
frame_dir=SOURCE/'projectile-frames';frame_dir.mkdir(exist_ok=True)
for i,(bird,(ax,ay)) in enumerate(zip(birds,anchors)):
    bird=bird.resize((round(bird.width*scale),round(bird.height*scale)),Image.Resampling.LANCZOS)
    x,y=210-round(ax*scale),100-round(ay*scale)
    assert x>=14 and y>=14 and x+bird.width<=242 and y+bird.height<=242
    f=Image.new('RGBA',(256,256));f.alpha_composite(bird,(x,y));f.save(frame_dir/f'{i+1:02d}.png')
    frames.append(f);strip.alpha_composite(f,(i*256,0))
strip.save(OUT/'turkey-projectile.png',optimize=True)
meta=json.loads((OUT/'metadata.json').read_text())
meta['projectile']={'texture':'turkey-projectile.png','frameWidth':256,'frameHeight':256,'frames':[0,1,2,3],
                    'fps':10,'origin':[.58,.58],'baseFacing':'right','sharedSourceScale':scale}
meta['animations']['throw']['projectile']='turkey-projectile.png'
meta['animations']['throw']['releaseFrame']=11
meta['animations']['throw']['spawnPoint']={'x':510,'y':305,'space':'source frame pixels, before display scale'}
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
king=Image.open(OUT/'spritesheet.png').convert('RGBA')
def king_frame(i):return king.crop(((i%4)*640,(i//4)*640,(i%4+1)*640,(i//4+1)*640))
demo=[]
for t in range(0,1600,50):
    bg=Image.new('RGBA',(960,420),'#e9edf2');draw=ImageDraw.Draw(bg)
    draw.line((30,350,930,350),fill='#aab4c2',width=2)
    i=0 if t<200 else 10 if t<380 else 11 if t<520 else 12 if t<720 else 0
    pose=king_frame(i).resize((352,352),Image.Resampling.LANCZOS)
    bg.alpha_composite(pose,(44,20))
    if 380<=t<1300:
        age=(t-380)/1000;bird=frames[int(age*10)%4].resize((96,96),Image.Resampling.LANCZOS)
        x=round(44+510*.55+age*620-96*.58);y=round(20+305*.55-96*.58)
        bg.alpha_composite(bird,(x,y))
    demo.append(bg.convert('RGB'))
demo[0].save(SOURCE/'turkey-throw-preview.gif',save_all=True,append_images=demo[1:],duration=50,loop=0)
print(json.dumps({'projectileFrames':4,'beakAligned':True,'output':str(OUT)}))
