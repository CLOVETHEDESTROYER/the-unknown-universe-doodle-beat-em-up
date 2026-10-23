"""Original layered action Foley/synthesis: deterministic, sample-free, offline rendered.

Requires NumPy/SciPy. No third-party samples or generation service is involved.
"""
from pathlib import Path
import json, wave
import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/audio/sfx-v2';ART=ROOT/'art/audio-v2'
RATE=32000
VARIANTS={'blaster':3,'shipLaser':3,'shipLance':2,'shipMissile':2,'enemyLaser':2,
 'jump':3,'doubleJump':3,'landing':2,'slamCharge':2,'slamXgod':2,'slamBarrett':2,
 'slamNico':2,'slamEzra':2,'slamTeleport':2,'slamZgod':2,'punchSwing':3,'punchHit':3,
 'swordSwing':2,'swordHit':2,'enemyHit':3,'explosion':3,'shipHit':2,'shipExplosion':2,
 'frost':2,'ember':2,'storm':2,'teleport':3,'stomp':3,'spring':2}

class Sound:
 def __init__(self,duration,rng):self.y=np.zeros(round(duration*RATE));self.rng=rng;self.layers=[]
 def add(self,y,at=0,gain=1,label='layer'):
  start=round(at*RATE);n=min(len(y),len(self.y)-start)
  if n>0:self.y[start:start+n]+=y[:n]*gain
  self.layers.append(label)
 def tone(self,duration,f0,f1=None,gain=.3,at=0,decay=5,fm=0,label='body'):
  t=np.arange(round(duration*RATE))/RATE;q=t/duration
  freq=f0*np.power((f1 or f0)/f0,q)
  phase=2*np.pi*np.cumsum(freq)/RATE
  # Mild FM adds material/energy character without a brittle square-wave edge.
  y=np.sin(phase+fm*np.sin(phase*2.13)*np.exp(-5*q))
  env=np.minimum(1,t/.0025)*np.exp(-decay*q)*np.minimum(1,(duration-t)/.018)
  self.add(y*env,at,gain,label)
 def noise(self,duration,low,high,gain=.3,at=0,decay=5,attack=.003,label='texture'):
  n=round(duration*RATE);t=np.arange(n)/RATE
  sos=signal.butter(2,[low,high],btype='bandpass',fs=RATE,output='sos')
  y=signal.sosfilt(sos,self.rng.normal(0,1,n));y/=max(np.sqrt(np.mean(y*y)),.001)
  env=np.minimum(1,t/attack)*np.exp(-decay*t/duration)*np.minimum(1,(duration-t)/.025)
  self.add(y*env,at,gain,label)
 def modes(self,duration,base,gain=.3,at=0,metal=False):
  ratios=[1,1.43,2.17,3.06] if metal else [1,1.52,2.31,3.8]
  for i,r in enumerate(ratios):self.tone(duration/(1+i*.18),base*r,gain=gain/(1+i*1.5),at=at,decay=6+i,fm=.04,label='inharmonic resonance')
 def room(self,amount=.15):
  dry=self.y.copy()
  for delay,gain in [(0.023,.5),(.041,.3),(.073,.17)]:
   at=round(delay*RATE);tail=signal.sosfilt(signal.butter(1,3200,fs=RATE,output='sos'),dry[:-at])
   self.y[at:]+=tail*amount*gain
  self.layers.append('short filtered early reflections')

def recipe(name,v,rng):
 p=1+(v-1)*.035
 duration={'shipExplosion':1.05,'explosion':.65,'slamZgod':.85,'slamBarrett':.7,'slamEzra':.72,'slamNico':.68,'slamTeleport':.65}.get(name,.42)
 s=Sound(duration,rng)
 if name in ('blaster','shipLaser','shipLance','enemyLaser'):
  ship=name!='blaster';lance=name=='shipLance';enemy=name=='enemyLaser'
  s.noise(.022,1800,9000,.21,label='trigger snap')
  s.tone(.12,210*p,75,.36,decay=6,label='pressure body')
  s.tone(.26 if lance else .18,(1650 if ship else 950)*p,160 if enemy else 320,.27,decay=5,fm=1.5 if ship else .65,label='modulated energy discharge')
  s.noise(.2,450,3500,.13,at=.012,decay=5,label='barrel air and electric grit')
  if not ship:s.modes(.11,540,.10,at=.014,metal=True)
  if lance:s.tone(.25,2400,620,.17,at=.035,decay=5,fm=.3,label='lance harmonic tail')
 elif name=='shipMissile':
  s.noise(.26,150,2800,.35,decay=4,attack=.009,label='rocket propellant rush');s.tone(.18,180,65,.3,label='launch thump');s.tone(.26,230,690,.17,fm=.35,label='accelerating motor')
 elif name in ('jump','doubleJump','spring'):
  double=name=='doubleJump';s.noise(.12,300,5200,.14,decay=4,label='shoe push and fabric air')
  s.tone(.19,170*p,470 if not double else 780,.22,decay=3.8,fm=.12,label='rising elastic body')
  s.tone(.065,115*p,80,.25,decay=7,label='foot push')
  if double:
   s.tone(.23,620*p,1200,.14,at=.025,decay=4,label='second-jump shimmer');s.noise(.20,2200,8500,.08,at=.02,decay=6,label='air twist')
  if name=='spring':s.modes(.3,340,.22,metal=True)
 elif name in ('landing','stomp','punchHit','enemyHit','shipHit'):
  heavy=name in ('stomp','shipHit');s.tone(.23 if heavy else .15,165*p,48 if heavy else 75,.43,decay=7,label='low impact weight')
  s.noise(.075,550,5700,.27,decay=8,label='contact crack');s.noise(.22,130,1100,.18,decay=6,label='body grit')
  s.modes(.20,260 if name!='shipHit' else 420,.16,metal=name=='shipHit')
  if heavy:s.noise(.23,1200,6500,.08,at=.055,decay=5,label='settling debris')
 elif name in ('punchSwing','swordSwing','slamCharge'):
  sword=name=='swordSwing';s.noise(.23,450 if sword else 160,8500 if sword else 3500,.26,decay=3,attack=.025,label='shaped air sweep')
  s.tone(.18,720 if sword else 260,180,.13,decay=4,fm=.4,label='motion body')
  if sword:s.modes(.2,1250,.075,metal=True)
  if name=='slamCharge':s.tone(.24,260,80,.24,decay=3,fm=.3,label='downward commitment cue')
 elif name=='swordHit':
  s.noise(.06,1300,9000,.25,decay=8,label='edge contact');s.tone(.2,200,65,.35,label='hit weight');s.modes(.34,730*p,.22,metal=True)
 elif name.startswith('slam') or name in ('explosion','shipExplosion'):
  star=name=='slamZgod';bear=name=='slamBarrett';fire=name=='slamEzra';rift=name=='slamTeleport';rocket=name in ('slamNico','explosion','shipExplosion')
  s.tone(.45 if bear else .3,130*p,35,.52,decay=6,fm=.13,label='impact pressure and sub body')
  s.tone(.2,260,80,.19,label='phone-speaker impact harmonic');s.noise(.06,800,8500,.32,decay=8,label='leading impact snap')
  s.noise(.5,55,800,.23,decay=4,label='low debris roll');s.modes(.3,190 if bear else 290,.16)
  for i in range(4):s.noise(.07,800+i*350,6000,.075/(1+i*.3),at=.065+i*.06,decay=7,label='staggered settling fragments')
  if rocket:s.noise(.55,200,4800,.22,at=.015,decay=5,label='blast bloom')
  if fire:
   s.noise(.55,700,7000,.22,at=.04,decay=4,label='rising flame roar');s.tone(.3,180,480,.14,at=.03,fm=.55,label='flame pressure rise')
  if rift:
   s.tone(.43,860,100,.3,at=.02,decay=3,fm=1.8,label='inward portal warp');s.noise(.4,400,5000,.13,at=.02,decay=3,label='vortex air')
  if star:
   for i,f in enumerate([523.25,659.25,783.99,1046.5]):s.tone(.58,f,f*1.005,.12,at=i*.022,decay=5,label='star power chord')
   s.noise(.55,2000,9500,.10,at=.08,decay=4,label='radiant wave')
  if bear:s.modes(.42,105,.23)
  if name=='shipExplosion':
   s.noise(.3,200,3600,.16,at=.2,decay=5,label='secondary rupture');s.noise(.5,90,1800,.15,at=.4,decay=5,label='wreckage tail')
 elif name in ('frost','ember','storm','teleport'):
  if name=='frost':
   s.noise(.18,2800,11000,.12,decay=6,label='ice hiss');s.modes(.32,1450*p,.17,metal=True);s.tone(.16,900,1900,.17,fm=.2,label='cold discharge')
  elif name=='ember':s.noise(.33,150,4300,.35,decay=3,label='thrust and flame rush');s.tone(.25,110,290,.23,fm=.8,label='boot motor')
  elif name=='storm':s.noise(.08,600,11000,.30,decay=7,label='electrical crack');s.tone(.33,240,45,.42,label='thunder body');s.noise(.25,100,2800,.20,at=.04,decay=4,label='thunder roll');s.modes(.28,1200,.1,metal=True)
  else:s.tone(.23,180*p,1300,.22,decay=3,fm=1.7,label='portal inhale');s.tone(.22,1500,160,.22,at=.12,decay=4,fm=.8,label='portal release');s.noise(.3,700,6500,.12,decay=3,attack=.04,label='phase texture')
 else:raise ValueError(name)
 s.room(.1 if name in ('jump','doubleJump','punchSwing') else .20)
 return s

def render(s):
 y=signal.sosfilt(signal.butter(2,35,btype='highpass',fs=RATE,output='sos'),s.y)
 y=np.tanh(y*1.12) # Gentle saturation glues layers without hard clipping.
 fade=min(round(.025*RATE),len(y));y[-fade:]*=np.linspace(1,0,fade)
 # Normalize the family, then leave the runtime mixer enough headroom for overlaps.
 y*=.74/max(np.abs(y).max(),.001)
 y[:24]*=np.linspace(0,1,24);y[-round(.008*RATE):]=0
 return np.rint(y*32767).astype('<i2')

def write(path,pcm):
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())

def main():
 OUT.mkdir(parents=True,exist_ok=True);ART.mkdir(parents=True,exist_ok=True);manifest=[]
 for event,(name,count) in enumerate(VARIANTS.items()):
  for v in range(count):
   s=recipe(name,v,np.random.default_rng(9300+event*31+v));pcm=render(s);file=f'{name}-{v+1}.wav';write(OUT/file,pcm)
   manifest.append({'name':name,'file':file,'seconds':round(len(pcm)/RATE,4),'peak':round(float(np.abs(pcm.astype(float)).max()/32768),4),'rms':round(float(np.sqrt(np.mean((pcm.astype(float)/32768)**2))),4),'layers':list(dict.fromkeys(s.layers))})
 (OUT/'manifest.json').write_text(json.dumps({'sampleRate':RATE,'channels':1,'provenance':'Original deterministic layered synthesis; no recorded or third-party samples','files':manifest},indent=2)+'\n',encoding='utf-8')
 print(f'{len(manifest)} effects / {sum((OUT/f["file"]).stat().st_size for f in manifest):,} bytes')
 # A fair A/B reel: old blaster/jump/stomp, then their new equivalents at matching gain.
 from scipy.signal import resample_poly
 plan=[('v1','blaster',0),('v2','blaster',.7),('v1','jump',1.5),('v2','jump',2.2),('v2','doubleJump',2.9),('v1','stomp',3.7),('v2','slamXgod',4.4),('v2','shipLaser',5.4),('v2','shipLance',6.1),('v2','shipMissile',6.8),('v2','slamBarrett',7.6),('v2','slamNico',8.6),('v2','slamEzra',9.6),('v2','slamTeleport',10.6),('v2','slamZgod',11.6),('v2','swordSwing',12.8),('v2','swordHit',13.0),('v2','teleport',13.9)]
 mix=np.zeros(15*RATE)
 for version,name,at in plan:
  with wave.open(str(ROOT/f'public/audio/sfx-{version}/{name}-1.wav'),'rb') as f:
   rate=f.getframerate();samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
  if rate!=RATE:samples=resample_poly(samples,RATE,rate)
  start=round(at*RATE);mix[start:start+len(samples)]+=samples*.65
 write(ART/'sound-preview-v2.wav',np.rint(np.clip(mix,-.95,.95)*32767).astype('<i2'))
 (ART/'preview-order.json').write_text(json.dumps([{'version':v,'sound':n,'atSeconds':t} for v,n,t in plan],indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
