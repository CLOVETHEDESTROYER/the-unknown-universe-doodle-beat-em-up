"""Pack Kai's revised ground-punch special and four vertical lightning frames."""
import json
from PIL import Image, ImageDraw
import pack_killer_kai_v1 as base

ART=base.ROOT/'art/kai-thunderfall-v1'
OUT=base.ROOT/'public/characters/kai-thunderfall-v1'


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    base.ART=ART
    base.OUT=OUT
    poses=base.extract('actor',8)
    scale=min(170/poses[7].height,240/max(p.width for p in poses),212/max(p.height for p in poses))
    frames=[]
    for n in [0,1,3,4,6,7]:
        pose=poses[n];ax,ay=base.foot_anchor(pose)
        pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        point=(round(128-ax*scale),round(220-ay*scale))
        assert point[0]>=0 and point[1]>=0 and point[0]+pose.width<=256 and point[1]+pose.height<=256
        cell=Image.new('RGBA',(256,256));cell.alpha_composite(pose,point);frames.append(cell)
    actor_pages=base.atlas('special',frames)
    strip=Image.open(ART/'beams-source.png').convert('RGBA')
    beams=[]
    # Fading electricity deliberately breaks into isolated fragments, so retain
    # all alpha inside each verified strip cell rather than one connected blob.
    for n in range(4):
        cell=strip.crop((round(n*strip.width/4),0,round((n+1)*strip.width/4),strip.height))
        box=cell.getchannel('A').getbbox();assert box;beams.append(cell.crop(box))
    beam_scale=min(480/max(b.height for b in beams),180/max(b.width for b in beams))
    beam_frames=[]
    for beam in beams:
        beam=beam.resize((round(beam.width*beam_scale),round(beam.height*beam_scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(192,512));cell.alpha_composite(beam,((192-beam.width)//2,496-beam.height));beam_frames.append(cell)
    beam_pages=base.atlas('beams',beam_frames)
    review=Image.new('RGBA',(1536,800),'#373741');draw=ImageDraw.Draw(review)
    for n,frame in enumerate(frames):
        review.alpha_composite(frame,(n*256,0));draw.text((n*256+8,260),['CROUCH','POWER UP','GROUND PUNCH','CALL LIGHTNING','RISE','RECOVER'][n],fill='#a2eaff')
    for n,frame in enumerate(beam_frames):review.alpha_composite(frame,(384+n*192,288))
    review.convert('RGB').save(ART/'preview.jpg',quality=94)
    (ART/'metadata.json').write_text(json.dumps({'actor':{'frames':6,'baseline':220,'scale':scale,'pages':actor_pages},
        'beams':{'frames':4,'baseline':496,'scale':beam_scale,'pages':beam_pages}},indent=2)+'\n',encoding='utf-8')
    print('Packed six Thunderfall body poses and four lightning frames; pages <=1024px.')


if __name__=='__main__':main()
