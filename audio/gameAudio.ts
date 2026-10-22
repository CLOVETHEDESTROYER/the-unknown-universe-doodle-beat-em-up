import { SOUND_BANK, soundPath } from './soundBank';
import type { SoundName } from './soundBank';

export interface AudioSettings {music:number;effects:number;muted:boolean}
const STORAGE_KEY='unknownUniverse.audio.v1';
const defaults:AudioSettings={music:.42,effects:.65,muted:false};
const clamp=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
function readSettings():AudioSettings{
  try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return value?{music:clamp(value.music,defaults.music),effects:clamp(value.effects,defaults.effects),muted:value.muted===true}:{...defaults};}
  catch{return {...defaults};}
}
let settings=readSettings();
const subscribers=new Set<()=>void>();
export const getAudioSettings=()=>settings;
export function subscribeAudioSettings(listener:()=>void){subscribers.add(listener);return ()=>{subscribers.delete(listener);};}
export function updateAudioSettings(patch:Partial<AudioSettings>){
  settings={music:clamp(patch.music,settings.music),effects:clamp(patch.effects,settings.effects),muted:typeof patch.muted==='boolean'?patch.muted:settings.muted};
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{/* Private browsing may deny storage. */}
  if(master&&context)master.gain.setTargetAtTime(settings.muted?0:settings.effects,context.currentTime,.015);
  if(settings.muted||settings.effects===0)stopEffects();
  subscribers.forEach(listener=>listener());
}

let context:AudioContext|null=null,master:GainNode|null=null,readyPromise:Promise<void>|null=null;
let paused=false,installed=0,unlocked=false;
const buffers=new Map<string,AudioBuffer>(),raw=new Map<string,Promise<ArrayBuffer>>();
const preparing=new Map<string,Promise<void>>();
const voices=new Set<{source:AudioBufferSourceNode;gain:GainNode;priority:number}>();
const lastPlayed=new Map<SoundName,number>();
const variants=new Map<SoundName,number>();
const played:Partial<Record<SoundName,number>>={};
let suppressed=0,totalPlayed=0,lastSound:SoundName|null=null;
const failed=new Set<string>();
const entries=Object.entries(SOUND_BANK) as [SoundName,typeof SOUND_BANK[SoundName]][];
function fetchClip(path:string){
  let promise=raw.get(path);
  if(!promise){promise=fetch(path).then(response=>{if(!response.ok)throw Error(String(response.status));return response.arrayBuffer();});raw.set(path,promise);}
  return promise;
}
function prepareClip(path:string){
  if(buffers.has(path)||!context)return Promise.resolve();
  const existing=preparing.get(path);if(existing)return existing;
  const ctx=context;
  const promise=fetchClip(path).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{buffers.set(path,buffer);})
    .catch(()=>{failed.add(path);}).finally(()=>{raw.delete(path);preparing.delete(path);});
  preparing.set(path,promise);
  return promise;
}
function prepare(){
  if(readyPromise||!context)return readyPromise??Promise.resolve();
  const queue=entries.flatMap(([name,def])=>Array.from({length:def.variants},(_,n)=>soundPath(name,n)));
  // Warm in small batches after interaction; avoid 39 simultaneous fetches/decodes.
  const worker=async()=>{while(queue.length)await prepareClip(queue.shift()!);};
  readyPromise=Promise.all([worker(),worker()]).then(()=>{});
  return readyPromise;
}
function unlock(){
  try{
    if(!context){
      const Constructor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Constructor)return;
      context=new Constructor();master=context.createGain();
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.13;
      master.gain.value=settings.muted?0:settings.effects;master.connect(limiter);limiter.connect(context.destination);
    }
    unlocked=true;
    if(context.state==='suspended')void context.resume().catch(()=>{});
    void prepare();
  }catch{/* Audio support must not interrupt gameplay. */}
}
export function installGameAudio(){
  if(installed++===0){window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);}
  return ()=>{if(--installed===0){window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);stopEffects();}};
}
export function stopEffects(){for(const voice of [...voices]){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();voices.delete(voice);}}
export function setEffectsPaused(value:boolean){paused=value;if(value)stopEffects();}

interface PlayOptions {volume?:number;pitch?:number;preview?:boolean}
export function playSfx(name:SoundName,options:PlayOptions={}){
  if(!SOUND_BANK[name]||!context||!master||!unlocked||context.state!=='running'||settings.muted||settings.effects===0||paused&&!options.preview){suppressed++;return false;}
  const def=SOUND_BANK[name],now=context.currentTime*1000;
  if(now-(lastPlayed.get(name)??-9999)<def.gap){suppressed++;return false;}
  lastPlayed.set(name,now);
  const variant=(variants.get(name)??0)%def.variants;variants.set(name,variant+1);
  const path=soundPath(name,variant),requested=performance.now();
  const start=()=>{
    const buffer=buffers.get(path);
    if(!buffer||!context||!master||settings.muted||settings.effects===0||paused&&!options.preview)return false;
    if(def.priority===3)for(const voice of [...voices])if(voice.priority<2){voice.source.stop();}
    if(voices.size>=12){
      const quiet=[...voices].find(v=>v.priority<def.priority);
      if(!quiet){suppressed++;return false;}quiet.source.stop();quiet.source.disconnect();quiet.gain.disconnect();voices.delete(quiet);
    }
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
    source.playbackRate.value=Math.max(.65,Math.min(1.5,options.pitch??(1+(Math.random()-.5)*.07)));
    gain.gain.value=def.volume*Math.max(0,Math.min(1,options.volume??1));source.connect(gain);gain.connect(master);
    const voice={source,gain,priority:def.priority};voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};
    source.start();played[name]=(played[name]??0)+1;totalPlayed++;lastSound=name;return true;
  };
  if(buffers.has(path))return start();
  void prepareClip(path).then(()=>{if(performance.now()-requested<120)start();});
  return false;
}
export const getAudioDebug=()=>({settings:{...settings},unlocked,state:context?.state??'locked',loadedClips:buffers.size,
  expectedClips:entries.reduce((n,[,d])=>n+d.variants,0),activeVoices:voices.size,maxVoices:12,paused,totalPlayed,played:{...played},suppressed,lastSound,failed:[...failed]});

declare global{interface Window{__unknownGameAudio?:{read:typeof getAudioDebug;preview:(name?:SoundName)=>boolean}}}
export function installAudioDebug(){
  const params=new URLSearchParams(window.location.search);
  if(params.get('capture')!=='1'&&params.get('devTools')!=='1')return ()=>{};
  const debug={read:getAudioDebug,preview:(name:SoundName='punchHit')=>playSfx(name,{preview:true})};window.__unknownGameAudio=debug;
  return ()=>{if(window.__unknownGameAudio===debug)delete window.__unknownGameAudio;};
}
