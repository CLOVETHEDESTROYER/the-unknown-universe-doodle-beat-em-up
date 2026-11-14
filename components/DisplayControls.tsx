import React, {useEffect, useState} from 'react';

/** Fullscreen is optional: unsupported iPhone browsers get Home Screen guidance. */
export default function DisplayControls() {
  const [fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));
  const [notice,setNotice]=useState('');
  const standalone=window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
  const supported=Boolean(document.fullscreenEnabled&&document.documentElement.requestFullscreen);
  useEffect(()=>{const changed=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
  const toggle=async()=>{
    try {
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setNotice('');
    }catch{setNotice('This browser could not enter full screen. On iPhone, use Safari → Share → Add to Home Screen, then launch the game from its icon.');}
  };
  return <section aria-label="Screen settings" className="mb-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
    {supported&&<button type="button" onClick={()=>void toggle()} className="min-h-11 rounded-full border-2 border-slate-800 bg-violet-700 px-5 py-2 text-lg text-white">{fullscreen?'Exit full screen':'Enter full screen'}</button>}
    <p className="mt-1">{standalone?'Home Screen mode: the game uses the available display without browser bars.':'For the largest iPhone play area: open in Safari → Share → Add to Home Screen. Enable “Open as Web App” if offered, then launch from the new icon. An internet connection is still required.'}</p>
    {notice&&<p role="status" className="mt-2">{notice}</p>}
  </section>;
}
