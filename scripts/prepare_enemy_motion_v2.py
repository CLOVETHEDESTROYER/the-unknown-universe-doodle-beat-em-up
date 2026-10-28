"""Extract shipped first poses as generation references, without changing source art."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/enemy-motion-v2'
OUT.mkdir(parents=True,exist_ok=True)
SEEDS={
 'grunt':('grunt_walking_ai.png',543,724),
 'alien':('doodles/m_alien_walk_ai.png',280,280),
 'dasher':('doodles/m_dasher_walk_ai.png',280,280),
 'giant':('doodles/m_giant_walk_ai.png',360,420),
 **{kind:(f'enemies/restored-v1/{kind}-walk.png',512,512) for kind in ['spider','ghost','terror','cosmic']},
 **{kind:(f'flight/{kind}-v2.png',0,0) for kind in ['scout','interceptor','gunship']},
}
review=Image.new('RGBA',(1200,900),'#c4c9d2');draw=ImageDraw.Draw(review)
metadata={}
for i,(kind,(file,w,h)) in enumerate(SEEDS.items()):
 image=Image.open(ROOT/'public'/file).convert('RGBA')
 if w:image=image.crop((0,0,w,h))
 box=image.getchannel('A').getbbox();crop=image.crop(box)
 crop.thumbnail((250,220),Image.Resampling.LANCZOS)
 ref=Image.new('RGBA',(768,768));ref.alpha_composite(crop.resize((crop.width*2,crop.height*2)),((768-crop.width*2)//2,640-crop.height*2))
 ref.save(OUT/f'{kind}-seed.png')
 x=(i%4)*300;y=(i//4)*300
 review.alpha_composite(crop,(x+(300-crop.width)//2,y+245-crop.height));draw.text((x+12,y+265),kind,fill='#151821')
 metadata[kind]={'source':file,'cell':[w,h],'bounds':box}
review.convert('RGB').save(OUT/'shipped-roster.jpg',quality=94)
(OUT/'seeds.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print(json.dumps(metadata))
