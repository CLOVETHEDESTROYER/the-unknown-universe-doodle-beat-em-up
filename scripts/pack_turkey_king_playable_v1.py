"""Derive celebration/death/flight strips and the roster card from approved art."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/characters/turkey-king-v2'
sheet=Image.open(OUT/'spritesheet.png').convert('RGBA')
def frame(i):return sheet.crop(((i%4)*640,(i//4)*640,(i%4+1)*640,(i//4+1)*640))
def strip(name,ids):
    im=Image.new('RGBA',(640*len(ids),640))
    for n,i in enumerate(ids):im.alpha_composite(frame(i),(640*n,0))
    im.save(OUT/name,optimize=True)
strip('victory.png',[15,15,15,15]);strip('death.png',[13,14,14,14]);strip('flight-walk.png',[1,2,3,4])
frame(0).save(OUT/'idle.png',optimize=True)
card=frame(0);card=card.crop(card.getbbox());card.thumbnail((450,620));card.save(OUT/'card.webp',quality=92)
def h(i):
    a=frame(i).getbbox();return a[3]-a[1]
profile={'target':250,'base':h(0),'special':h(0),'mobility':h(0),'victory':h(15),'death':max(h(13),h(14)),'flight':h(0),'equipment':{},'textures':{}}
path=ROOT/'gameplay/characterSizes.generated.json';data=json.loads(path.read_text());data['turkey_king']=profile
path.write_text(json.dumps(data,indent=2)+'\n')
meta=json.loads((OUT/'metadata.json').read_text());meta['integrated']=True;meta['unlockCode']='allhailking'
meta['controls']={'staff':'Space / HIT','turkeyThrow':'C or X / SP','jump':'Z / Up / JUMP'}
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
print(profile)
