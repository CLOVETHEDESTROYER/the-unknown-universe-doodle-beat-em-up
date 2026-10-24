import {useCallback, useEffect, useRef, useState} from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
const CODE: readonly Direction[] = ['up', 'down', 'up', 'down', 'left', 'right', 'left'];
const KEYS: Record<string, Direction | undefined> = {
  ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
};
const BUTTONS: {direction:Direction;symbol:string}[] = [
  {direction:'up',symbol:'↑'}, {direction:'left',symbol:'←'},
  {direction:'down',symbol:'↓'}, {direction:'right',symbol:'→'},
];

/** Mounted only on character select; gameplay directions never enter the code. */
export default function RosterUnlockPad({unlocked,onUnlock}:{unlocked:boolean;onUnlock:()=>void}) {
  const history = useRef<Direction[]>([]);
  const [accepted,setAccepted] = useState(false);
  const enter = useCallback((direction:Direction) => {
    if (unlocked) return;
    history.current = [...history.current,direction].slice(-CODE.length);
    if (history.current.length === CODE.length && CODE.every((step,index) => step === history.current[index])) {
      history.current = [];
      setAccepted(true);
      onUnlock();
    }
  },[unlocked,onUnlock]);
  useEffect(() => {
    if (unlocked) return;
    const keydown = (event:KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const direction = KEYS[event.key];
      if (!direction) return;
      event.preventDefault();
      if (event.repeat) return;
      enter(direction);
    };
    const reset = () => { history.current = []; };
    window.addEventListener('keydown',keydown);
    window.addEventListener('blur',reset);
    return () => {
      window.removeEventListener('keydown',keydown);
      window.removeEventListener('blur',reset);
      reset();
    };
  },[unlocked,enter]);

  if (accepted) return <div className="roster-code-success" role="status">
    <span aria-hidden="true">★</span>
    <span>Secret code accepted!<br />All characters unlocked.</span>
  </div>;
  if (unlocked) return null;
  return <div className="roster-code-pad" role="group" aria-label="Character selection direction pad">
    <span className="roster-code-label" aria-hidden="true">D-PAD</span>
    {BUTTONS.map(({direction,symbol}) => <button key={direction} type="button"
      className={`roster-code-direction roster-code-${direction}`} aria-label={`Code direction: ${direction}`}
      onClick={() => enter(direction)}>
      <span aria-hidden="true">{symbol}</span>
    </button>)}
  </div>;
}
