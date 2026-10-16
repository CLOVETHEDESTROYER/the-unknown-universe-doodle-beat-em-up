import React from 'react';
import { getAudioSettings, playSfx, updateAudioSettings } from '../audio/gameAudio';
import type { AudioSettings } from '../audio/gameAudio';

export default function SoundControls({settings=getAudioSettings()}:{settings?:AudioSettings}){
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
    <button type="button" disabled={settings.muted||settings.effects===0} onClick={()=>playSfx('punchHit',{preview:true})}
      className="mt-1 rounded-lg border-2 border-violet-700 bg-violet-100 px-3 py-1 text-sm font-bold disabled:opacity-40">Test effects</button>
  </section>;
}
