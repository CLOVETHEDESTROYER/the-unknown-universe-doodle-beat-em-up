from pathlib import Path
from PIL import Image,ImageDraw
root=Path('art/kai-workshop-v1');root.mkdir(exist_ok=True)
refs={'frost-kit':'frost','ember-kit':'ember','shield':'shield','life':'heart'}
old=Path('../the-unknown-universe-doodle-beat-em-up/art/workshop-v1')
for target,source in refs.items():
 im=Image.open(old/(source+'-generated.png'));im.save(root/(target+'-generated.png'))
 Image.open(old/(source+'-seed.png')).save(root/(target+'-seed.png'))
Image.open(old/'references.jpg').save(root/'existing-game-reference.jpg')
# Shipped hero frames are style references, not edit targets.
im=Image.open('public/characters/xgod/drawn-v1/blaster-idle.png').convert('RGBA');print(im.size)
im=im.crop((0,0,768,512));im.save(root/'xgod-seed.png')
