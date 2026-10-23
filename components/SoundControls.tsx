import React, {useState} from 'react';
import { getAudioSettings, playSfx, updateAudioSettings } from '../audio/gameAudio';
import type { AudioSettings } from '../audio/gameAudio';
import type {SoundName} from '../audio/soundBank';

export default function SoundControls({settings=getAudioSettings()}:{settings?:AudioSettings}){
  const [preview,setPreview]=useState<SoundName>('punchHit');
  return <section aria-label="Sound settings" className="my-4 rounded-xl border-2 border-slate-300 bg-slate-50 p-3 text-left text-slate-800">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-xl font-bold">Sound</h3>
      <button type="button" aria-pressed={settings.muted} onClick={()=>updateAudioSettings({muted:!settings.muted})}
        className="rounded-lg border-2 border-slate-700 bg-white px-2 py-1 text-sm font-bold">{settings.muted?'Unmute audio':'Mute all audio'}</button>
    </div>
    {(['music','effects'] as const).map(channel=><label key={channel} className="my-2 grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-base">
      <span>{channel==='music'?'Music':'Effects'}</span>
      <input aria-label={`${channel==='music'?'Music':'Effects'} volume`} type="range" min="0" max="100" step="1" value={Math.round(settings[channel]*100)}
        onChange={event=>updateAudioSettings({[channel]:Number(event.target.value)/100})} className="w-full accent-violet-700" />
      <span className="text-right text-sm">{Math.round(settings[channel]*100)}%</span>
    </label>)}
    <label className="mt-2 flex items-center gap-2 text-sm">Preview
      <select aria-label="Sound preview" value={preview} onChange={event=>setPreview(event.target.value as SoundName)} className="min-w-0 flex-1 rounded border border-slate-400 bg-white p-1">
        {([['punchHit','Punch impact'],['blaster','Ink blaster'],['shipLaser','Ship laser'],['shipLance','Plasma lance'],['shipMissile','Homing missile'],['jump','Jump'],['doubleJump','Double jump'],['slamXgod','X God: Butt Bomb'],['slamBarrett','Barrett: Bear Drop'],['slamNico','Nico: Rocket Drop'],['slamEzra','Ezra: Flame Crash'],['slamTeleport','Teleportation C: Rift Drop'],['slamZgod','Z God: Starfall']] as const).map(([name,label])=><option key={name} value={name}>{label}</option>)}
      </select>
    </label>
    <button type="button" disabled={settings.muted||settings.effects===0} onClick={()=>playSfx(preview,{preview:true})}
      className="mt-1 rounded-lg border-2 border-violet-700 bg-violet-100 px-3 py-1 text-sm font-bold disabled:opacity-40">Test effects</button>
  </section>;
}
