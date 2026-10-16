"""Normalize generated pickup icons without changing their artwork or native alpha."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/powerups/v1'
DEST.mkdir(parents=True,exist_ok=True)
atlas=Image.new('RGBA',(768,256))
for index,kind in enumerate(['frost','ember','storm']):
    original=Image.open(ROOT/f'art/ground-powerups-v1/{kind}-generated.png').convert('RGBA')
    assert original.getchannel('A').getextrema()[0]==0,'Native transparent image required'
    box=original.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
    crop=original.crop(box)
    ratio=224/max(crop.size)
    crop=crop.resize((round(crop.width*ratio),round(crop.height*ratio)),Image.Resampling.LANCZOS)
    cell=Image.new('RGBA',(256,256))
    cell.alpha_composite(crop,((256-crop.width)//2,(256-crop.height)//2))
    cell.save(DEST/f'{kind}.png',optimize=True)
    atlas.alpha_composite(cell,(index*256,0))
atlas.save(DEST/'atlas.png')
print('Packed frost, ember, storm with native alpha.')
