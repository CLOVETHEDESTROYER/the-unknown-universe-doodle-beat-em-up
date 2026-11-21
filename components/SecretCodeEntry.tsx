import {useState} from 'react';
import {acceptsThanksgivingCode} from '../gameplay/seasonalTheme';
import {acceptsTurkeyKingCode} from '../gameplay/turkeyKingUnlock';
import {acceptsChristmasCode} from '../gameplay/christmasEvent';

interface Props {
  enabled:boolean; onChange:(enabled:boolean)=>void; onTurkeyKing:()=>void;
  christmasActive:boolean; christmasPreview:boolean; onChristmasPreview:(enabled:boolean)=>void;
}
export default function SecretCodeEntry({enabled,onChange,onTurkeyKing,christmasActive,christmasPreview,onChristmasPreview}:Props) {
  const [code,setCode]=useState('');
  const [message,setMessage]=useState('');
  return <form className="secret-code-entry" aria-label="Secret codes" onKeyDown={event=>event.stopPropagation()}
    onSubmit={event=>{
      event.preventDefault();
      if(acceptsChristmasCode(code)){onChristmasPreview(true);setCode('');setMessage('Christmas preview unlocked! Start game and choose Killer Klause.');return;}
      if(acceptsTurkeyKingCode(code)){onTurkeyKing();setCode('');setMessage(christmasActive?'All hail The Turkey King! Select his card to play. Christmas scenery is active.':'All hail The Turkey King! Select his card to play. Thanksgiving mode is on.');return;}
      if(!acceptsThanksgivingCode(code)){setMessage('Code not recognized. Try again.');return;}
      onChange(true);setCode('');setMessage(christmasActive?'Code accepted! Thanksgiving preference saved; Christmas scenery is active.':'Code accepted! Pick a hero for Thanksgiving mode.');
    }}>
    <label htmlFor="secret-game-code">Secret code</label>
    <input id="secret-game-code" type="text" value={code} maxLength={40} autoComplete="off" autoCapitalize="none"
      autoCorrect="off" spellCheck={false} enterKeyHint="go" placeholder="Enter a code" aria-describedby="secret-code-feedback"
      onChange={event=>{setCode(event.target.value);setMessage('');}} />
    <button type="submit">Apply code</button>
    {christmasPreview && <button type="button" className="seasonal-toggle" onClick={()=>{onChristmasPreview(false);setMessage('Christmas preview turned off.');}}>Christmas preview ON · Turn off</button>}
    {christmasActive && !christmasPreview && <span>Christmas event is live!</span>}
    {enabled && <button type="button" className="seasonal-toggle" onClick={()=>{onChange(false);setMessage(christmasActive?'Thanksgiving is off. Christmas remains active for your next game.':'Classic mode selected for your next game.');}}>Thanksgiving ON · Turn off</button>}
    <span id="secret-code-feedback" role="status" aria-live="polite">{message || (christmasActive?'Killer Klause and Christmas scenery are ready.':enabled?'Fall leaves + giant turkey boss for your next game.':'Have a secret code? Enter it here.')}</span>
  </form>;
}
