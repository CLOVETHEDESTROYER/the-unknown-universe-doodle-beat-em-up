from PIL import Image,ImageDraw
from pathlib import Path
root=Path('art/workshop-v1'); root.mkdir(exist_ok=True)
refs={'blaster':('public/characters/xgod/ink-marker-blaster-v1.png',None),'sword':('public/xgod_sword_reward_fit.png',None),'frost':('public/powerups/v1/frost.png',None),'ember':('public/powerups/v1/ember.png',None),'storm':('public/powerups/v1/storm.png',None),'shield':('public/ink_shield_power.png',None),'gravity':('public/doodles/gravity_core.png',None),'heart':('public/heart_sprite.png',None),'dinio':('public/companions/dinio/hybrid-v1/walk.png',(0,0,320,320)),'doghost':('public/companions/motion-v2/doghost.webp',(0,0,240,240)),'teleportation-c':('public/companions/teleportation-c-v3/helper.png',(0,0,320,320))}
sheet=Image.new('RGB',(1100,660),'#e9e7df');d=ImageDraw.Draw(sheet)
for n,(name,(path,box)) in enumerate(refs.items()):
 im=Image.open(path).convert('RGBA');im=im.crop(box) if box else im
 im=im.crop(im.getbbox());im.thumbnail((190,185),Image.Resampling.LANCZOS)
 cell=Image.new('RGBA',(256,256));cell.alpha_composite(im,((256-im.width)//2,(256-im.height)//2));cell.save(root/(name+'-seed.png'))
 x=n%5*220;y=n//5*220;sheet.paste(im,(x+(220-im.width)//2,y+10),im);d.text((x+12,y+202),name,fill='#222222')
sheet.save(root/'references.jpg')
