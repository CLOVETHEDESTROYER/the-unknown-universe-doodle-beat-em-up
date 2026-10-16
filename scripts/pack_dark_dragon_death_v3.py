"""Normalize the complete generated dragon death drawing with clear margins and floor anchor."""
from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/dark-dragon-death-v3'
source=Image.open(ART/'source.png').convert('RGBA')
bounds=source.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<source.width and bounds[3]<source.height
drawing=source.crop(bounds)
scale=min(640/drawing.width,288/drawing.height)
drawing=drawing.resize((round(drawing.width*scale),round(drawing.height*scale)),Image.Resampling.LANCZOS)
frame=Image.new('RGBA',(768,384))
frame.alpha_composite(drawing,((768-drawing.width)//2,352-drawing.height))
visible=frame.getchannel('A').getbbox()
assert visible[0]>=64 and visible[1]>=64 and visible[2]<=704 and visible[3]==352
frame.save(ROOT/'public/bosses/dark-dragon-death-v3.png')
background=Image.new('RGBA',frame.size,'#dce5d6');background.alpha_composite(frame)
background.convert('RGB').save(ART/'preview.jpg',quality=94)
(ART/'metadata.json').write_text(json.dumps({'sourceBounds':bounds,'frame':[768,384],'visibleBounds':visible,'origin':[.5,352/384],'scale':scale},indent=2)+'\n')
print('Packed complete dragon death sprite with clear bounds:',visible)
