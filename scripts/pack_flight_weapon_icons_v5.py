"""Normalize three generated pickup icons, retaining their native alpha."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/starbreak-weapons-v5'
DEST=ROOT/'public/flight/weapons-v5'
DEST.mkdir(parents=True,exist_ok=True)
atlas=Image.new('RGBA',(768,256))
for i,kind in enumerate(['spread','lance','homing']):
    source=Image.open(SOURCE/f'{kind}-generated.png').convert('RGBA')
    assert source.getchannel('A').getextrema()[0]==0,'Native transparent background required'
    bounds=source.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
    crop=source.crop(bounds)
    factor=232/max(crop.size)
    crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
    cell=Image.new('RGBA',(256,256));cell.alpha_composite(crop,((256-crop.width)//2,(256-crop.height)//2))
    cell.save(DEST/f'{kind}.png',optimize=True)
    atlas.alpha_composite(cell,(i*256,0))
atlas.save(DEST/'pickup-atlas.png',optimize=True)
print('Packed three transparent weapon icons.')
