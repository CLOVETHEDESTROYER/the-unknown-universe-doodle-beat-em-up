"""Measure upright source artwork and generate shared runtime size calibration.

No art is redrawn or resized on disk. Each animation family gets one scale,
so crouches, jumps, raised hands and weapons retain their authored proportions.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
OUT=ROOT/'art/character-sizing-v1'
OUT.mkdir(parents=True,exist_ok=True)

def image(path, width=768, height=512, index=0):
    path=PUBLIC/path
    if path.suffix=='.json':
        for page in json.loads(path.read_text())['textures']:
            for frame in page['frames']:
                if frame['filename']==str(index):
                    r=frame['frame']
                    return Image.open(path.parent/page['image']).convert('RGBA').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
        raise ValueError((path,index))
    im=Image.open(path).convert('RGBA')
    columns=im.width//width
    x,y=index%columns*width,index//columns*height
    return im.crop((x,y,x+width,y+height))

def measure(im):
    box=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    assert box
    return box[3]-box[1]

heroes=['xgod','barrett','nico','ezra','teleportation_c','killer_kai','elytron','shadow_kid','zgod']
profiles={};samples={};records=[]
for hero in heroes:
    target=105 if hero=='zgod' else 160
    def ref(path,width=768,height=512,index=0):
        im=image(path,width,height,index);return measure(im)
    if hero in ('killer_kai','elytron','shadow_kid'):
        folder={'killer_kai':'killer-kai-v1','elytron':'elytron-v1','shadow_kid':'shadow-kid-v1'}[hero]
        path=f'characters/{folder}/{"idle" if hero=="shadow_kid" else "movement"}.json'
        base=ref(path);samples[hero]=image(path)
        p={'base':base,'equipment':{},'textures':{}}
        if hero=='killer_kai':
            p['textures']={f'kai_{a}':base for a in ['movement','combat','sword','reactions']}
            p['special']=ref('characters/kai-thunderfall-v1/special.json',index=5)
            p['mobility']=170
            p['victory']=base;p['death']=base;p['flight']=base
        elif hero=='elytron':
            for action,index in [('movement',0),('locomotion',0),('combat',12),('reactions',0),('special',7)]:
                p['textures']['elytron_'+action]=ref(f'characters/{folder}/{action}.json',index=index)
            p['textures']['elytron_mobility']=ref(f'characters/{folder}/mobility.json',index=15)/.82
            # Landing reference is crouched: use a standing-equivalent height.
            p['mobility']=p['textures']['elytron_mobility']
            p['special']=p['textures']['elytron_special'];p['death']=p['textures']['elytron_reactions']
            p['victory']=ref(f'characters/{folder}/reactions.json',index=12);p['flight']=p['textures']['elytron_locomotion']
        else:
            p['textures']={f'shadow_{a}':base for a in ['idle','run','jump','throw','crouch','hurt']}
            p['special']=base;p['mobility']=base;p['death']=base;p['victory']=base;p['flight']=base
    else:
        path='characters/xgod/drawn-v1/idle.png' if hero=='xgod' else 'characters/z-god-v1/hands-idle.png' if hero=='zgod' else f'characters/playable-v3/{hero}-idle.png'
        width=768 if hero in ('xgod','zgod') else 640
        base=ref(path,width);samples[hero]=image(path,width)
        p={'base':base,'equipment':{},'textures':{}}
        for power in ['hands','blaster','sword','frost','ember','storm']:
            path=f'characters/z-god-v1/{power}-idle.png' if hero=='zgod' else f'characters/xgod/drawn-v1/{power+"-" if power!="hands" else ""}idle.png' if hero=='xgod' else f'characters/equipment-v4/{hero}-{power}-idle.png'
            if (PUBLIC/path).exists():p['equipment'][power]=ref(path)
        if hero=='xgod' and (PUBLIC/'characters/xgod/frost-v1/idle.json').exists():
            p['equipment']['frost']=ref('characters/xgod/frost-v1/idle.json')
        p['special']=ref(f'characters/signature-specials-v1/{hero}.json',index=5)
        p['victory']=ref(f'characters/celebrations-v1/{hero}.json')
        p['mobility']=170 # Shared authored standing reference in both mobility packers.
        p['death']=base
        if hero=='zgod':p['flight']=base
        elif hero=='xgod':p['flight']=p['equipment'].get('blaster',base)
        else:p['flight']=ref(f'characters/{hero}/walk.png',256,360)
        if hero=='teleportation_c':
            # Original ink sprites have different cell dimensions from equipment art.
            p['textures']['character_walk']=ref('characters/teleportation_c/walk.png',256,360)
            p['textures']['character_attack']=p['textures']['character_walk']
            p['textures']['teleportation_c_dash']=p['textures']['character_walk']
            p['textures']['teleportation_c_walk']=p['textures']['character_walk']
            p['textures']['teleportation_c_attack']=p['textures']['character_walk']
    p['target']=target
    profiles[hero]=p
    old={'xgod':.4,'zgod':.391,'killer_kai':.782,'elytron':.46,'shadow_kid':.68}.get(hero,.391)
    records.append({'hero':hero,'sourceStandingHeight':base,'previousScale':old,'previousVisibleHeight':round(base*old,1),'targetHeight':target,'newScale':round(target/base,6)})

(ROOT/'gameplay/characterSizes.generated.json').write_text(json.dumps(profiles,indent=2)+'\n')
(OUT/'measurements.json').write_text(json.dumps(records,indent=2)+'\n')
sheet=Image.new('RGB',(180*len(heroes),520),'#ece6dc');draw=ImageDraw.Draw(sheet)
for row,label in enumerate(['Before','After: shared standing height']):
    baseline=220+row*260
    draw.line((0,baseline,sheet.width,baseline),fill='#a99d91')
    for col,record in enumerate(records):
        hero=record['hero'];im=samples[hero];im=im.crop(im.getbbox())
        scale=record['previousScale'] if row==0 else record['newScale']
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        sheet.paste(im,(col*180+(180-im.width)//2,baseline-im.height),im)
        draw.text((col*180+8,baseline+8),hero,fill='#282033')
        draw.text((col*180+8,baseline+25),f'{record["previousVisibleHeight"] if row==0 else record["targetHeight"]} px',fill='#282033')
    draw.text((8,row*260+5),label,fill='#282033')
sheet.save(OUT/'roster-before-after.jpg',quality=94)
print(json.dumps(records,indent=2))
