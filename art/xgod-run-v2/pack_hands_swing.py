"""Assemble the new arm poses over the original eight running leg frames."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

root = Path(__file__).resolve().parents[2]
folder = root / 'public/characters/xgod/drawn-v1'
source = Image.open(root / 'art/xgod-run-v2/hands-swing-source.png').convert('RGBA')
mouthless = Image.open(Path(__file__).with_name('hands-mouthless.png')).convert('RGBA')
if mouthless.size != source.size:
    raise ValueError('Expression art must match the original pose sheet dimensions.')
# Use only the corrected mouth art so the silhouette and limb positions stay registered.
for x, y in [(293, 213), (735, 214), (1160, 214), (1603, 214),
             (292, 641), (731, 640), (1159, 640), (1597, 641)]:
    box = (x-17, y-13, x+16, y+11)
    patch = mouthless.crop(box)
    mask = Image.new('L', patch.size)
    draw = ImageDraw.Draw(mask)
    for inset, opacity in enumerate((64, 128, 192, 255)):
        draw.rectangle((inset, inset, patch.width-1-inset, patch.height-1-inset), fill=opacity)
    source.paste(patch, box[:2], mask)
old = Image.open(folder / 'run.png').convert('RGBA')
sheet = Image.new('RGBA', old.size)
w,h = 768,512
# Waist landmarks, left and right. Donor coordinates are in the source sheet.
# Target coordinates are in the original pose review (300px-wide crops).
donor = [(165,283,254,290),(609,279,684,285),(1040,280,1120,287),(1493,280,1577,286),
         (168,714,256,720),(622,707,699,717),(1049,717,1135,720),(1494,706,1573,713)]
target = [(119,194,181,207),(131,197,191,209),(138,199,199,205),(116,192,181,207),
          (116,192,178,207),(128,198,189,210),(135,193,198,202),(113,198,178,211)]
# Move through backward swing, passing pose, forward swing, and return.
order = [0,1,2,3,4,3,6,5]
for i,j in enumerate(order):
    x,y = (i%4)*w,(i//4)*h
    leg = old.crop((x,y,x+w,y+h))
    sx,sy,ex,ey = donor[j]
    dx,dy,fx,fy = target[i]
    dx,dy,fx,fy = 185+dx/.75,95+dy/.75,185+fx/.75,95+fy/.75
    scale_x = (ex-sx)/(fx-dx)
    scale_y = 0.88
    shear = ((ey-sy)-(fy-dy)*scale_y)/(fx-dx)
    col, row = j % 4, j // 4
    left, top = col * source.width // 4, row * source.height // 2
    donor_frame = source.crop((left, top, (col + 1) * source.width // 4, (row + 1) * source.height // 2))
    upper = donor_frame.transform((w,h),Image.Transform.AFFINE,
        (scale_x,0,sx-left-dx*scale_x,shear,scale_y,sy-top-dx*shear-dy*scale_y),
        resample=Image.Resampling.BICUBIC)
    def waist(at):
        return round(dy+(at-dx)*(fy-dy)/(fx-dx))
    # Join along the dark shirt hem, keeping the original cargo pants and feet.
    bottom = Image.new('L',(w,h))
    top = Image.new('L',(w,h))
    a,b = 255,560
    ImageDraw.Draw(bottom).polygon([(a,waist(a)),(b,waist(b)),(w,waist(b)),(w,h),(0,h),(0,waist(a))],fill=255)
    ImageDraw.Draw(top).polygon([(0,0),(w,0),(w,waist(b)+1),(b,waist(b)+1),(a,waist(a)+1),(0,waist(a)+1)],fill=255)
    leg.putalpha(ImageChops.multiply(leg.getchannel('A'),bottom))
    upper.putalpha(ImageChops.multiply(upper.getchannel('A'),top))
    leg.alpha_composite(upper)
    sheet.alpha_composite(leg,(x,y))
sheet.save(folder / 'run-swing.png',optimize=True)
