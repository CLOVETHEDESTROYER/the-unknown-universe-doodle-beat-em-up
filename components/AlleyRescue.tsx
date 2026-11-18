import React, {useEffect, useRef, useState} from 'react';
import {getAudioSettings,subscribeAudioSettings,playSfx,stopEffects} from '../audio/gameAudio';
import {AlleyRescueAudio} from '../audio/alleyRescueAudio';

type Room = 'alley' | 'hall' | 'gunroom';
type Props = { onRescue: () => void; onExit: () => void; onContinue: () => void; alreadyRescued: boolean; armUnlocked: boolean; campaign: boolean; completed: boolean; saveError: string };

// The same rescue map is used for the campaign interlude and title-screen replay.
// The parent owns campaign progress and the persistent roster reward.
export default function AlleyRescue({onRescue, onExit, onContinue, alreadyRescued, armUnlocked, campaign, completed, saveError}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef({room:'alley' as Room, x:100, rescued:alreadyRescued, arm:armUnlocked && (!campaign || completed), armEquipped:false, danceDone:completed, phase:'idle' as 'idle'|'approach'|'transfer'|'rise'|'thanks'|'gift'|'dance', phaseTime:0, facing:1, keys:new Set<string>(), message:campaign&&!completed?'On the road to the Graveyard, X God hears someone inside the house.':'', shots:0, shotTime:-10, visual:'unarmed-idle', pose:0, backgroundReady:false});
  const [view,setView] = useState({room:'alley' as Room, rescued:alreadyRescued, near:false, message:campaign&&!completed?'On the road to the Graveyard, X God hears someone inside the house.':'', arm:armUnlocked && (!campaign || completed), phase:'idle',danceDone:completed});
  const callbacks=useRef({onRescue,onContinue,onExit});callbacks.current={onRescue,onContinue,onExit};
  const [musicNotice,setMusicNotice]=useState('');
  const musicRef=useRef<HTMLAudioElement|null>(null);
  const retryMusic=useRef(()=>{});
  const interact = useRef(() => {});
  const fireRef = useRef(() => {});
  useEffect(() => {
    const c=canvas.current!; const ctx=c.getContext('2d')!; const s=game.current;
    const backgrounds: Record<Room, HTMLImageElement> = {alley:new Image(), hall:new Image(), gunroom:new Image()};
    for (const room of ['alley','hall','gunroom'] as const) backgrounds[room].src=`/levels/alley-rescue-v1/${room}.webp`;
    const hero=new Image(); hero.src='/characters/xgod/drawn-v1/idle.png';
    const run=new Image(); run.src='/characters/xgod/drawn-v1/run-swing.png';
    const sword=new Image(); sword.src='/characters/xgod/drawn-v1/sword-attack.png';
    const arm=new Image(); arm.src='/characters/xgod/kai-arm-v1/arm.png';
    const armRun=new Image(); armRun.src='/characters/xgod/kai-arm-v1/run-v2.png';
    const equip=new Image(); equip.src='/characters/xgod/kai-arm-v1/equip.png';
    const kai=new Image(); kai.src='/characters/killer-kai-v1/reactions-0.webp';
    const heroDance=new Image();heroDance.src='/characters/alley-dance-v1/xgod.png';
    const kaiDance=new Image();kaiDance.src='/characters/alley-dance-v1/kai.png';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const music=new Audio('/audio/music/alley-blaster-party.mp3');music.preload='auto';music.loop=true;musicRef.current=music;
    const alleyMusic=new Audio('/audio/music/uneasy-pursuit-alleyway.mp3');alleyMusic.preload='auto';alleyMusic.loop=true;
    let musicBlocked=false,musicFailed=false,musicStarted=false,musicDisposed=false;
    const audioSettings=()=>{const a=getAudioSettings();for(const track of [music,alleyMusic]){track.volume=a.music;track.muted=a.muted;}};
    audioSettings();const unsubscribe=subscribeAudioSettings(audioSettings);
    const startAlleyMusic=()=>{if(musicDisposed||musicStarted||document.hidden)return;audioSettings();void alleyMusic.play().then(()=>{if(musicDisposed||musicStarted||document.hidden)alleyMusic.pause();else{musicBlocked=false;setMusicNotice('');}}).catch(()=>{if(!musicDisposed&&!musicStarted){musicBlocked=true;setMusicNotice('Tap Play music to enable the Alley soundtrack.');}});};
    const startMusic=()=>{alleyMusic.pause();audioSettings();if(!musicStarted){music.currentTime=0;musicStarted=true;}void music.play().then(()=>{musicBlocked=false;setMusicNotice('');}).catch(()=>{musicBlocked=true;setMusicNotice('Tap Play music to enable audio. The dance will still finish.');});};
    music.addEventListener('error',()=>{musicFailed=true;if(musicStarted)setMusicNotice('Party music could not load. You can still continue after the dance.');});
    alleyMusic.addEventListener('error',()=>{if(!musicStarted)setMusicNotice('Alley soundtrack is unavailable. You can still play.');});
    // Prime this same media element inside a real interaction for mobile audio.
    const primeMusic=()=>{if(musicStarted)return;music.volume=0;void music.play().then(()=>{if(!musicStarted){music.pause();music.currentTime=0;}audioSettings();}).catch(()=>{});};
    retryMusic.current=()=>{if(musicStarted)startMusic();else startAlleyMusic();};
    const unlockAlleyMusic=()=>{if(!musicStarted&&alleyMusic.paused)startAlleyMusic();};
    window.addEventListener('pointerdown',unlockAlleyMusic);window.addEventListener('keydown',unlockAlleyMusic);
    startAlleyMusic();
    let last=0, frame=0, active=true, moving=false, animationTime=0, strideDistance=0;
    const rescueAudio=new AlleyRescueAudio(cue=>playSfx(cue.sound,{volume:cue.volume,pitch:cue.pitch}));
    // One frame per distance travelled keeps steps in sync at both player and rescue speeds.
    const strideFrame=()=>Math.floor(strideDistance/20)%8;
    const near=()=>s.room==='alley'?s.x>755:s.room==='hall'?s.x<150||s.x>755:s.x<150||s.x>590;
    const sync=()=>setView({room:s.room,rescued:s.rescued,near:near(),message:s.message,arm:s.arm,phase:s.phase,danceDone:s.danceDone});
    interact.current=()=>{
      if (!near() || s.phase!=='idle') return;
      primeMusic();
      s.message='';
      if(s.room==='alley'){s.room='hall';s.x=110;}
      else if(s.room==='hall'&&s.x<150){s.room='alley';s.x=750;}
      else if(s.room==='hall'){s.room='gunroom';s.x=110;}
      else if(s.x<150){s.room='hall';s.x=750;}
      else {s.phase='approach';s.phaseTime=0;s.danceDone=false;s.armEquipped=false;s.keys.clear();s.facing=1;s.message='X God: Hang on, Kai. I can help!';}
      sync();
    };
    const draw=()=>{
      const g=ctx; g.clearRect(0,0,960,540);
      const background=backgrounds[s.room];
      s.backgroundReady=Boolean(background.complete && background.naturalWidth);
      if(s.backgroundReady) g.drawImage(background,0,0,960,540);
      else { g.fillStyle='#172033';g.fillRect(0,0,960,540);g.fillStyle='#f4e7c9';g.textAlign='center';g.font='bold 22px sans-serif';g.fillText(background.complete ? 'Scene art could not be loaded' : 'Opening the alley…',480,220);g.textAlign='left'; }
      if(s.phase==='dance'){
        g.save();g.fillStyle='rgba(10,8,35,.25)';g.fillRect(0,0,960,540);
        const clock=reduced.matches?0:s.phaseTime;
        for(let i=0;i<3;i++){
          const x=180+i*300,land=x+Math.sin(clock*.65+i*2)*220;
          g.fillStyle=['rgba(240,80,200,.13)','rgba(50,220,255,.13)','rgba(255,210,70,.13)'][i];
          g.beginPath();g.moveTo(x,0);g.lineTo(land-140,470);g.lineTo(land+140,470);g.closePath();g.fill();
        }
        g.fillStyle='#cddcf2';g.beginPath();g.arc(480,65,24,0,Math.PI*2);g.fill();g.strokeStyle='#788eab';g.lineWidth=1;
        for(let i=-16;i<=16;i+=8){g.beginPath();g.moveTo(460,65+i);g.lineTo(500,65+i);g.stroke();}
        g.fillStyle='#fff2b1';g.font='bold 22px sans-serif';g.textAlign='center';g.fillText(`BLASTER ARM PARTY!  ${Math.ceil(Math.max(0,15-s.phaseTime))}s`,480,115);g.restore();
      }
      if(s.room==='gunroom'){
        const t=s.phaseTime, p=s.phase;
        const recovered=(s.arm&&p==='idle') || p==='thanks' || p==='gift'||p==='dance';
        const rising=p==='rise';
        const k=recovered?[407,206,159,204]:rising?(t<.8?[841,2,170,141]:t<1.5?[677,2,160,154]:[156,2,172,197]):[841,2,170,141];
        if(p==='dance'&&kaiDance.complete&&kaiDance.naturalWidth){const f=Math.floor(s.phaseTime*8)%8;g.drawImage(kaiDance,f*512,0,512,512,663,420-212.625,224,224);}
        else if(kai.complete&&kai.naturalWidth){const h=recovered?155:rising?(t<.8?127:t<1.5?140:153):127;g.drawImage(kai,k[0],k[1],k[2],k[3],700,420-h,145,h);}
        if(!recovered && !rising){g.strokeStyle='#a91e2b';g.lineWidth=4;g.beginPath();g.moveTo(807,347);g.lineTo(811,357);g.stroke();}
        if(p==='transfer'||p==='rise'){
          const strength=p==='transfer'?Math.min(1,t/2):1;
          g.save();g.globalAlpha=.25+.28*strength;g.fillStyle='#ffba41';g.beginPath();g.arc(770,350,45+strength*34+Math.sin(animationTime*8)*6,0,Math.PI*2);g.fill();
          g.strokeStyle='#ffda79';g.lineWidth=4;g.beginPath();g.moveTo(725,350);g.quadraticCurveTo(748,310+Math.sin(animationTime*7)*10,775,345);g.stroke();
          g.globalAlpha=.9;g.fillStyle='#88efff';for(let i=0;i<5;i++){const px=740+i*17,py=385-((animationTime*35+i*27)%95);g.beginPath();g.arc(px,py,2+i%2,0,Math.PI*2);g.fill();}g.restore();
        }
      }
      const sequence=s.phase!=='idle';
      const usingSword=s.phase==='transfer'||s.phase==='rise';
      const usingArm=s.arm&&s.armEquipped&&!sequence;
      const sprite=s.phase==='gift'?equip:usingSword?sword:usingArm?(moving?armRun:arm):(moving&&run.complete&&run.naturalWidth?run:hero);
      if(s.phase==='dance'&&heroDance.complete&&heroDance.naturalWidth){
        const pose=Math.floor(s.phaseTime*8)%8;s.pose=pose;s.visual='arm-dance';
        g.drawImage(heroDance,pose*512,0,512,512,s.x-112,450-212.625,224,224);
      }else if(sprite.complete&&sprite.naturalWidth){
        const pose=s.phase==='gift'?Math.min(7,Math.floor(s.phaseTime/3.5*8)):usingSword?(s.phaseTime<.4?1:3):usingArm?(moving?strideFrame():animationTime-s.shotTime<.28?2:0):moving?strideFrame():Math.floor(animationTime*6)%4;
        s.visual=s.phase==='gift'?'equip':usingSword?'sword':usingArm?(moving?'arm-run':'arm-idle'):(moving?'unarmed-run':'unarmed-idle');s.pose=pose;
        g.save();g.translate(s.x,450);g.scale(s.facing,1);g.drawImage(sprite,(pose%4)*768,Math.floor(pose/4)*512,768,512,-194.4,-243,388.8,259.2);g.restore();
      } else {g.fillStyle='#ead9b5';g.fillRect(s.x-24,328,48,122);}
      if(s.arm&&animationTime-s.shotTime<.35){g.fillStyle='#6defff';const d=(animationTime-s.shotTime)*500;g.beginPath();g.ellipse(s.x+s.facing*(81+d),369,22,6,0,0,Math.PI*2);g.fill();}
      if(near()&&s.phase==='idle'){g.fillStyle='rgba(15,23,42,.88)';g.fillRect(300,25,360,45);g.fillStyle='#fff';g.font='bold 21px sans-serif';g.textAlign='center';g.fillText(s.room==='gunroom'&&s.x>590?(s.arm?'E / USE: REPLAY RESCUE':'E / USE: HELP KAI'):'E / USE: OPEN DOOR',480,54);g.textAlign='left';}
      if(s.room==='gunroom'&&s.danceDone&&s.phase==='idle'){g.fillStyle='#9effcb';g.font='bold 22px sans-serif';g.fillText('EXIT →',838,470);}
    };
    let exiting=false;
    const tick=(time:number)=>{if(!active)return;const dt=document.hidden?0:last?Math.min((time-last)/1000,.05):0;last=time;const dir=(s.keys.has('ArrowRight')||s.keys.has('d')?1:0)-(s.keys.has('ArrowLeft')||s.keys.has('a')?1:0);animationTime+=dt;const previousX=s.x;
      if(s.phase!=='idle'){
        s.phaseTime+=dt;
        if(s.phase==='approach'){s.x=Math.max(s.x,Math.min(665,s.x+210*dt));if(s.x>=665){s.phase='transfer';s.phaseTime=0;s.message='X God channels the Fire Sword into Kai.';sync();}}
        else if(s.phase==='transfer'&&s.phaseTime>=3.5){s.phase='rise';s.phaseTime=0;s.message='Kai’s power is returning...';sync();}
        else if(s.phase==='rise'&&s.phaseTime>=2.4){s.phase='thanks';s.phaseTime=0;s.message='Killer Kai: Thank you, X God! You brought me back.';sync();}
        else if(s.phase==='thanks'&&s.phaseTime>=3.5){s.phase='gift';s.phaseTime=0;s.message='Killer Kai: Take this blaster-arm connection. It’s yours!';sync();}
        else if(s.phase==='gift'&&s.phaseTime>=3.5){s.phase='dance';s.phaseTime=0;s.arm=true;s.armEquipped=true;s.rescued=true;s.keys.clear();s.message='Blaster arm acquired! X God and Kai are celebrating!';startMusic();sync();}
        else if(s.phase==='dance'&&s.phaseTime>=15){s.phase='idle';s.phaseTime=0;s.danceDone=true;s.keys.clear();s.message='Party complete! Walk right to continue. C / FIRE: try your new arm.';callbacks.current.onRescue();sync();}
      }else if(dir){s.x=Math.max(55,Math.min(895,s.x+dir*320*dt));s.facing=dir;sync();}
      if(!exiting&&s.room==='gunroom'&&s.danceDone&&s.phase==='idle'&&s.x>=885){exiting=true;if(campaign)callbacks.current.onContinue();else callbacks.current.onExit();}
      const distance=Math.abs(s.x-previousX);moving=distance>0.001;strideDistance+=distance;
      if(!document.hidden)rescueAudio.update(s.phase,s.phaseTime);
      draw();frame=requestAnimationFrame(tick);};
    const fire=()=>{if(s.arm&&s.phase==='idle'&&animationTime-s.shotTime>=.3){s.armEquipped=true;s.shotTime=animationTime;s.shots++;sync();}};
    const down=(e:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','a','d','e','E',' ','c','C'].includes(e.key))e.preventDefault();if((e.key==='c'||e.key==='C')&&!e.repeat)fire();else if((e.key==='e'||e.key==='E'||e.key===' ')&&!e.repeat)interact.current();else s.keys.add(e.key.toLowerCase().startsWith('arrow')?e.key:e.key.toLowerCase());};
    const up=(e:KeyboardEvent)=>s.keys.delete(e.key.toLowerCase().startsWith('arrow')?e.key:e.key.toLowerCase());
    const clear=()=>s.keys.clear();
    const visibility=()=>{last=0;s.keys.clear();if(document.hidden){music.pause();alleyMusic.pause();stopEffects();}else if(musicStarted)startMusic();else startAlleyMusic();};
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    const previous=window.render_game_to_text;const render=()=>JSON.stringify({mode:'alley_rescue',campaign,completed:s.danceDone&&campaign,backgroundReady:s.backgroundReady,room:s.room,player:{x:Math.round(s.x)},nearInteraction:near(),rescued:s.rescued,phase:s.phase,phaseTime:s.phaseTime,armUnlocked:s.arm,armEquipped:s.armEquipped,visual:s.visual,pose:s.pose,strideDistance:Math.round(strideDistance),shots:s.shots,message:s.message,dance:{duration:15,done:s.danceDone,remaining:s.phase==='dance'?Math.max(0,15-s.phaseTime):0,spritesReady:Boolean(heroDance.naturalWidth&&kaiDance.naturalWidth),musicPlaying:!music.paused,musicTime:music.currentTime,musicLoop:music.loop,musicBlocked,musicFailed,reducedMotion:reduced.matches},controls:'left/right, E to interact',coordinates:'x increases to the right'});window.render_game_to_text=render;
    const renderWithSound=()=>JSON.stringify({...JSON.parse(render()),rescueAudio:rescueAudio.read(),music:{track:musicStarted?'dance':'uneasy-pursuit',alleyPlaying:!alleyMusic.paused,alleyTime:alleyMusic.currentTime,alleyLoop:alleyMusic.loop,alleyMuted:alleyMusic.muted,alleyVolume:alleyMusic.volume}});
    window.render_game_to_text=renderWithSound;
    fireRef.current=fire;
    frame=requestAnimationFrame(tick);return()=>{active=false;musicDisposed=true;cancelAnimationFrame(frame);stopEffects();for(const track of [music,alleyMusic]){track.pause();track.removeAttribute('src');track.load();}musicRef.current=null;unsubscribe();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerdown',unlockAlleyMusic);window.removeEventListener('keydown',unlockAlleyMusic);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);if(window.render_game_to_text===renderWithSound)window.render_game_to_text=previous;};
  },[campaign]);
  const hold=(key:string,pressed:boolean)=>{if(pressed)game.current.keys.add(key);else game.current.keys.delete(key);};
  return <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-2 text-white" style={{touchAction:'none'}}>
    <div className="flex w-full max-w-5xl items-center justify-between gap-2 px-2 font-bold"><span>THE ALLEY · {view.room==='alley'?'Find the house':view.room==='hall'?'Search the house':'Spare gun room'}</span><div className="flex gap-2">{campaign && completed && view.danceDone && view.phase==='idle' && <button className="rounded-lg bg-emerald-400 px-3 py-1 text-slate-950" onClick={onContinue}>Continue to Graveyard</button>}<button className="rounded-lg bg-slate-700 px-3 py-1" onClick={onExit}>{campaign ? "Save & Quit" : "Exit level"}</button></div></div>
    <canvas ref={canvas} width={960} height={540} className="min-h-0 max-h-[68vh] w-auto max-w-full rounded-lg" aria-label="Alley rescue level" />
    {saveError && <p role="alert" className="text-amber-200">{saveError}</p>}
    {musicNotice && <p className="text-center text-sm text-amber-200">{musicNotice} <button className="rounded bg-slate-700 px-2 py-1" onClick={()=>retryMusic.current()}>Play music</button></p>}
    <p className="min-h-6 text-center text-sm sm:text-base" role="status">{view.message || (view.arm ? 'Move with ← / → or A / D. E / USE: interact. C / FIRE: equip and fire the arm.' : 'Move with ← / → or A / D. Press E or USE at doors and to help Kai.')}</p>
    <div className="flex gap-3"><button aria-label="Move left" className="rounded-xl bg-slate-700 px-6 py-2 text-xl" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold('ArrowLeft',true);}} onPointerUp={()=>hold('ArrowLeft',false)} onPointerCancel={()=>hold('ArrowLeft',false)} onLostPointerCapture={()=>hold('ArrowLeft',false)}>←</button><button aria-label="Move right" className="rounded-xl bg-slate-700 px-6 py-2 text-xl" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold('ArrowRight',true);}} onPointerUp={()=>hold('ArrowRight',false)} onPointerCancel={()=>hold('ArrowRight',false)} onLostPointerCapture={()=>hold('ArrowRight',false)}>→</button><button className="rounded-xl bg-amber-400 px-6 py-2 text-xl font-bold text-slate-950 disabled:opacity-50" disabled={!view.near || view.phase!=='idle'} onClick={()=>interact.current()}>USE</button>{view.arm && <button className="rounded-xl bg-cyan-400 px-6 py-2 text-xl font-bold text-slate-950" onClick={()=>fireRef.current()}>FIRE</button>}</div>
  </div>;
}
