import {useState} from 'react';
import {acceptsThanksgivingCode} from '../gameplay/seasonalTheme';

export default function SecretCodeEntry({enabled,onChange}:{enabled:boolean;onChange:(enabled:boolean)=>void}) {
  const [code,setCode]=useState('');
  const [message,setMessage]=useState('');
  return <form className="secret-code-entry" aria-label="Secret codes" onKeyDown={event=>event.stopPropagation()}
    onSubmit={event=>{
      event.preventDefault();
      if(!acceptsThanksgivingCode(code)){setMessage('Code not recognized. Try again.');return;}
      onChange(true);setCode('');setMessage('Code accepted! Pick a hero for Thanksgiving mode.');
    }}>
    <label htmlFor="secret-game-code">Secret code</label>
    <input id="secret-game-code" type="text" value={code} maxLength={40} autoComplete="off" autoCapitalize="none"
      autoCorrect="off" spellCheck={false} enterKeyHint="go" placeholder="Enter a code" aria-describedby="secret-code-feedback"
      onChange={event=>{setCode(event.target.value);setMessage('');}} />
    <button type="submit">Apply code</button>
    {enabled && <button type="button" className="seasonal-toggle" onClick={()=>{onChange(false);setMessage('Classic mode selected for your next game.');}}>Thanksgiving ON · Turn off</button>}
    <span id="secret-code-feedback" role="status" aria-live="polite">{message || (enabled?'Fall leaves + giant turkey boss for your next game.':'Have a secret code? Enter it here.')}</span>
  </form>;
}
