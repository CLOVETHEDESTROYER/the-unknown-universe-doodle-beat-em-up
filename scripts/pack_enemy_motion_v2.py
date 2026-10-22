"""Pack generated 4x4 action sheets into trimmed, mobile-sized lossless WebP atlases."""
import json
import statistics
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/enemy-motion-v2'
OUT=ROOT/'public/enemies/motion-v2';OUT.mkdir(parents=True,exist_ok=True)
# Half the established logical cells, with twice the scene scale: colliders stay put.
SPECS={
 'grunt':(272,362,.78,238),'alien':(140,140,.95,121),
 'dasher':(140,140,.93,104),'giant':(180,210,.97,185),
 'spider':(256,256,480/512,110),'ghost':(256,256,480/512,150),
 'terror':(256,256,480/512,180),'cosmic':(256,256,480/512,165),
 **{f'grunt-{n}':(272,362,.78,238) for n in [2,3,4,6]},
 **{kind:(256,160,.5,90 if kind!='scout' else 132) for kind in ['scout','interceptor','gunship']},
}
metadata={}
def clean_fragments(cell,n):
 # Keep body/limbs, remove tiny disconnected remnants of adjacent generated cells.
 alpha=np.array(cell.getchannel('A'));mask=alpha>24;seen=np.zeros(mask.shape,dtype=bool);groups=[]
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  todo=[(int(x),int(y))];seen[y,x]=True;points=[]
  while todo:
   px,py=todo.pop();points.append((px,py))
   for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((nx,ny))
  groups.append(points)
 if not groups:return cell
 largest=max(map(len,groups));keep=np.zeros(mask.shape,dtype=np.uint8)
 main=max(groups,key=len);mx0=min(p[0] for p in main)-12;mx1=max(p[0] for p in main)+12;my0=min(p[1] for p in main)-12;my1=max(p[1] for p in main)+12
 for points in groups:
  if len(points)<max(12,largest*.012):continue
  if not any(mx0<=x<=mx1 and my0<=y<=my1 for x,y in points):continue
  for x,y in points:keep[y,x]=255
 keep_image=Image.fromarray(keep).filter(ImageFilter.MaxFilter(5))
 cell.putalpha(ImageChops.multiply(cell.getchannel('A'),keep_image))
 return cell
for name,(width,height,feet,target_height) in SPECS.items():
 path=ART/f'{name}-generated.png'
 if not path.exists():continue
 source=Image.open(path).convert('RGBA')
 assert source.getchannel('A').getextrema()[0]==0,f'{name}: background must be transparent'
 frames=[]
 for n in range(16):
  x=n%4;y=n//4
  gutter=0 if name in ['scout','interceptor','gunship'] else 24
  left=max(0,round(x*source.width/4)-gutter)
  # The long tongue crossed the generated grid by a few pixels; recover its tip.
  if name in ['terror','ghost'] and n==10:left=max(0,left-60)
  right=min(source.width,round((x+1)*source.width/4)+gutter)
  cell=source.crop((left,round(y*source.height/4),right,round((y+1)*source.height/4)))
  if name not in ['scout','interceptor','gunship']:cell=clean_fragments(cell,n)
  box=cell.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox()
  assert box,f'{name} frame {n} is empty'
  frames.append(cell.crop(box))
 scale=target_height/max(f.height for f in frames[:8])
 crops=[]
 for n,frame in enumerate(frames):
  crop=frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.LANCZOS)
  # Locomotion/attacks use the feet as the horizontal anchor, not an extended claw.
  band=frame.getchannel('A').crop((0,int(frame.height*.88),frame.width,frame.height)).getbbox()
  center=(band[0]+band[2])/2 if band and n<12 and name not in ['scout','interceptor','gunship'] else frame.width/2
  offset_x=round(width/2-center*scale)
  offset_y=round(height*feet-crop.height) if name not in ['scout','interceptor','gunship'] else round((height-crop.height)/2)
  crops.append((n,crop,offset_x,offset_y))
 # Simple shelves with two-pixel transparent gutters; source geometry stays independent.
 pages=[];page=Image.new('RGBA',(1024,1024));entries=[];x=y=row_height=0
 def save_page():
  if not entries:return
  used_width=max(e['frame']['x']+e['frame']['w']+2 for e in entries)
  used_height=max(e['frame']['y']+e['frame']['h']+2 for e in entries)
  image_name=f'{name}-{len(pages)}.webp'
  page.crop((0,0,used_width,used_height)).save(OUT/image_name,lossless=True,method=6,exact=True)
  pages.append({'image':image_name,'frames':entries.copy()})
 for n,crop,ox,oy in crops:
  if x+crop.width+4>1024:x=0;y+=row_height;row_height=0
  if y+crop.height+4>1024:
   save_page();page=Image.new('RGBA',(1024,1024));entries=[];x=y=row_height=0
  page.alpha_composite(crop,(x+2,y+2))
  entries.append({'filename':str(n),'rotated':False,'trimmed':True,
   'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},
   'sourceSize':{'w':width,'h':height},'spriteSourceSize':{'x':ox,'y':oy,'w':crop.width,'h':crop.height}})
  x+=crop.width+4;row_height=max(row_height,crop.height+4)
 save_page()
 (OUT/f'{name}.json').write_text(json.dumps({'textures':pages},separators=(',',':')),encoding='utf-8')
 for stale in OUT.glob(f'{name}-*.webp'):
  if stale.name not in {page['image'] for page in pages}:
   assert stale.resolve().parent==OUT.resolve()
   stale.unlink()
 metadata[name]={'cell':[width,height],'feet':feet,'frames':16,'pages':len(pages),'scale':scale}
 review=Image.new('RGBA',(4*320,4*290),'#bfc6cf');draw=ImageDraw.Draw(review)
 for n,crop,ox,oy in crops:
  visual=crop.copy();visual.thumbnail((290,245),Image.Resampling.LANCZOS)
  review.alpha_composite(visual,((n%4)*320+(320-visual.width)//2,(n//4)*290+245-visual.height))
  draw.text(((n%4)*320+10,(n//4)*290+265),f'{name} / {n}',fill='#141724')
 review.convert('RGB').save(ART/f'{name}-review.jpg',quality=92)
(OUT/'metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print(json.dumps(metadata))
