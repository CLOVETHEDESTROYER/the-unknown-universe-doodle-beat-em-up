"""Original procedural game effects. Uses only Python's standard library, no samples/services."""
from pathlib import Path
import array, json, math, random, wave
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/audio/sfx-v1'
DEST.mkdir(parents=True,exist_ok=True)
RATE=44100
PI=math.pi

def tone(duration, start, end=None, gain=.5, delay=0, decay=5, wave_kind='sine'):
    return ('tone',duration,start,end if end is not None else start,gain,delay,decay,wave_kind)

def noise(duration,gain=.5,delay=0,decay=7,smooth=.6):
    return ('noise',duration,gain,delay,decay,smooth)

def chime(notes, step=.055):
    return [tone(.22,n,gain=.4,delay=i*step,decay=7) for i,n in enumerate(notes)]

def recipe(name,v):
    p=1+(v-1)*.04
    if name=='punchSwing':return [noise(.13,.55,decay=6,smooth=.82),tone(.09,280*p,110*p,.2)]
    if name=='punchHit':return [tone(.16,155*p,46*p,.85,decay=8),noise(.095,.5,smooth=.5),tone(.07,620*p,180,.17)]
    if name=='swordSwing':return [noise(.22,.65,decay=4,smooth=.4),tone(.14,850*p,280*p,.2)]
    if name=='swordHit':return [tone(.2,210*p,65,.7),noise(.12,.55,smooth=.2),tone(.25,1560*p,980,.22,decay=10)]
    if name=='enemyHit':return [tone(.12,190*p,65,.65),noise(.09,.4,smooth=.6)]
    if name=='playerHit':return [tone(.24,430*p,150,.6,wave_kind='triangle'),noise(.07,.25,smooth=.8)]
    if name=='playerDeath':return [tone(.58,620,65,.55,wave_kind='triangle'),tone(.35,280,45,.6,delay=.38),noise(.18,.3,delay=.4,smooth=.8)]
    if name=='enemyDeath':return [tone(.22,360*p,80,.6),noise(.2,.35,smooth=.76)]
    if name=='bossDeath':return [noise(1.05,.7,decay=4,smooth=.94),tone(.75,120,32,.7),noise(.28,.35,delay=.28,smooth=.62),noise(.25,.25,delay=.62,smooth=.7)]
    if name=='blaster':return [tone(.11,1450*p,260,.5,wave_kind='triangle'),noise(.035,.12,smooth=.3)]
    if name=='shipHit':return [noise(.18,.55,smooth=.45),tone(.24,165*p,50,.7),tone(.16,980*p,350,.2)]
    if name=='shipExplosion':return [noise(.92,.75,decay=4,smooth=.91),tone(.55,135,30,.8),noise(.22,.45,delay=.12,smooth=.3),noise(.2,.25,delay=.45,smooth=.65),tone(.1,1650,420,.12,delay=.6)]
    if name=='explosion':return [noise(.43,.65,smooth=.84),tone(.3,160*p,38,.65),noise(.12,.3,delay=.1,smooth=.3)]
    if name=='pickup':return chime([880,1320],.04)
    if name=='powerup':return chime([440,554.37,659.25,880])
    if name=='frost':return chime([1320,1760,2093],.035)+[noise(.14,.18,smooth=.22)]
    if name=='ember':return [noise(.3,.55,decay=5,smooth=.85),tone(.2,95,230,.55)]
    if name=='storm':return [noise(.17,.55,smooth=.18),tone(.35,310,72,.55),tone(.22,1245,622,.2)]
    if name=='teleport':return [tone(.2,250*p,1450*p,.4),tone(.17,1450*p,420,.35,delay=.07),noise(.16,.23,smooth=.62)]
    if name=='shield':return chime([740,1110,1480],.03)+[noise(.08,.17,smooth=.2)]
    if name=='jump':return [tone(.12,220*p,480*p,.5,wave_kind='triangle')]
    if name=='stomp':return [tone(.18,155*p,48,.75),noise(.065,.35,smooth=.7),tone(.1,260,460,.25,delay=.025)]
    if name=='spring':return [tone(.28,150,750,.5,wave_kind='triangle'),tone(.22,285,900,.25,delay=.04)]
    raise ValueError(name)

def render(layers,seed):
    rng=random.Random(seed)
    length=max(layer[1]+(layer[5] if layer[0]=='tone' else layer[3]) for layer in layers)
    samples=[0.0]*math.ceil((length+.015)*RATE)
    for layer in layers:
        if layer[0]=='tone':
            _,duration,start,end,gain,delay,decay,kind=layer
        else:
            _,duration,gain,delay,decay,smooth=layer
        previous=0.0
        for i in range(math.ceil(duration*RATE)):
            t=i/RATE;q=t/duration
            env=min(1,t/.004)*math.exp(-decay*q)*min(1,(duration-t)/.012)
            if layer[0]=='tone':
                phase=2*PI*(start*t+(end-start)*t*t/(2*duration))
                raw=math.sin(phase)
                if kind=='triangle':raw=2/PI*math.asin(raw)
            else:
                previous=previous*smooth+(1-smooth)*rng.uniform(-1,1)
                raw=previous*math.sqrt((1+smooth)/(1-smooth))
            samples[round(delay*RATE)+i]+=raw*gain*env
    peak=max(abs(s) for s in samples)
    scale=.8/max(peak,.001)
    pcm=array.array('h',(round(max(-1,min(1,s*scale))*32767) for s in samples))
    return pcm,round(len(samples)/RATE,4)

variants={'punchSwing':3,'punchHit':3,'swordSwing':2,'swordHit':2,'enemyHit':3,'playerHit':2,'playerDeath':1,'enemyDeath':2,
          'bossDeath':1,'blaster':2,'shipHit':2,'shipExplosion':1,'explosion':2,'pickup':1,'powerup':1,'frost':1,'ember':1,'storm':1,
          'teleport':2,'shield':1,'jump':2,'stomp':2,'spring':1}
manifest=[]
for index,(name,count) in enumerate(variants.items()):
    for variant in range(count):
        pcm,duration=render(recipe(name,variant),index*100+variant)
        filename=f'{name}-{variant+1}.wav'
        with wave.open(str(DEST/filename),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
        manifest.append({'name':name,'file':filename,'seconds':duration,'peak':.8})
(DEST/'manifest.json').write_text(json.dumps({'sampleRate':RATE,'channels':1,'files':manifest},indent=2)+'\n')
print(f'Generated {len(manifest)} original WAV effects in {DEST}')
