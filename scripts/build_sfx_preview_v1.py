"""A short listening reel assembled only from the project's original generated effects."""
from pathlib import Path
import array, json, wave
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/audio-v1'
OUT.mkdir(parents=True,exist_ok=True)
rate=44100
plan=[('punchSwing',0),('punchHit',.1),('swordSwing',.7),('swordHit',.87),('playerHit',1.5),
      ('enemyDeath',2.1),('teleport',2.8),('powerup',3.5),('blaster',4.3),('blaster',4.5),
      ('shipHit',5.0),('shipExplosion',5.7),('playerDeath',6.9)]
mix=[0.0]*round(8*rate)
for name,start in plan:
    with wave.open(str(ROOT/f'public/audio/sfx-v1/{name}-1.wav'),'rb') as f:
        samples=array.array('h',f.readframes(f.getnframes()))
    for i,sample in enumerate(samples):mix[round(start*rate)+i]+=sample*.55
pcm=array.array('h',(round(max(-32767,min(32767,s))) for s in mix))
with wave.open(str(OUT/'sound-preview.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(OUT/'preview-order.json').write_text(json.dumps([{'sound':name,'atSeconds':start} for name,start in plan],indent=2)+'\n')
print('Built eight-second original effects listening reel.')
