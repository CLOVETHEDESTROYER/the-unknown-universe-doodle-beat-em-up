import React, { useEffect, useRef } from "react";
import type { TouchControlKey, TouchControlState } from '../types';

const CONTROL_KEYS: TouchControlKey[] = ["left", "right", "up", "down", "attack", "shoot", "jump", "dash", "recall"];
const activePointers = new Map<number, Set<TouchControlKey>>();
const pointerKinds = new Map<number,string>();

const setControl = (key: TouchControlKey, value: boolean, pointerId: number) => {
  if (typeof window === "undefined") {
    return;
  }

  const pointerKeys = activePointers.get(pointerId) ?? new Set<TouchControlKey>();
  if (value) {
    pointerKeys.add(key);
    activePointers.set(pointerId, pointerKeys);
  } else {
    pointerKeys.delete(key);
    if (pointerKeys.size === 0) {
      activePointers.delete(pointerId);
    }
  }

  const next = {
    ...window.__unknownUniverseTouchControls,
    [key]: value || [...activePointers.values()].some((keys) => keys.has(key))
  };
  next.axisX = Number(Boolean(next.right)) - Number(Boolean(next.left));
  next.axisY = Number(Boolean(next.down)) - Number(Boolean(next.up));
  window.__unknownUniverseTouchControls = next;
};

const releasePointer = (pointerId: number) => {
  const pointerKeys = activePointers.get(pointerId);
  activePointers.delete(pointerId);
  pointerKinds.delete(pointerId);
  for (const key of pointerKeys ?? []) {
    setControl(key, false, pointerId);
  }
  // Notify the D-pad and action buttons even when their own release was missed.
  window.dispatchEvent(new CustomEvent('unknown-universe:pointer-release', {detail:pointerId}));
};

const resetControls = () => {
  if (typeof window === "undefined") {
    return;
  }

  activePointers.clear();
  pointerKinds.clear();
  window.__unknownUniverseTouchControls = { ...Object.fromEntries(CONTROL_KEYS.map((key) => [key, false])), axisX: 0, axisY: 0 } as TouchControlState;
  window.dispatchEvent(new Event('unknown-universe:controls-reset'));
};

/** Captured thumb slides between directions; each action thumb remains independent. */
const TouchDpad: React.FC<{ platformer: boolean; canDown: boolean; downLabel: string }> = ({ platformer, canDown, downLabel }) => {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const nativeTouch = useRef<number | null>(null);
  const geometry = useRef<DOMRect | null>(null);
  const paint = () => {
    const controls = window.__unknownUniverseTouchControls;
    for (const node of base.current?.querySelectorAll<HTMLElement>('[data-touch-control]') ?? []) {
      node.toggleAttribute('data-pressed', Boolean(controls?.[node.dataset.touchControl as TouchControlKey]));
    }
  };
  const neutral = () => {
    const previous = pointer.current;
    pointer.current = null; nativeTouch.current = null; geometry.current = null;
    if (previous !== null) releasePointer(previous);
    paint();
  };
  useEffect(() => {
    const released = (event: Event) => {if ((event as CustomEvent<number>).detail === pointer.current) neutral();};
    const ended = (event: TouchEvent) => {if ([...event.changedTouches].some(t => t.identifier === nativeTouch.current)) neutral();};
    window.addEventListener('unknown-universe:controls-reset', neutral);
    window.addEventListener('unknown-universe:pointer-release', released);
    window.addEventListener('touchend', ended, true); window.addEventListener('touchcancel', ended, true);
    return () => {
      window.removeEventListener('unknown-universe:controls-reset', neutral);
      window.removeEventListener('unknown-universe:pointer-release', released);
      window.removeEventListener('touchend', ended, true); window.removeEventListener('touchcancel', ended, true);
      neutral();
    };
  }, []);
  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId || !geometry.current) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {neutral(); return;}
    event.preventDefault();
    const rect = geometry.current;
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    const next = {left: x < -1/6, right: x > 1/6, up: y < -1/6, down: (!platformer || canDown) && y > 1/6};
    const wasUp = Boolean(window.__unknownUniverseTouchControls?.up);
    const wasDown = Boolean(window.__unknownUniverseTouchControls?.down);
    for (const key of ['left','right','up','down'] as const) setControl(key, next[key], event.pointerId);
    if (platformer && next.up && !wasUp) window.dispatchEvent(new Event('unknown-universe:jump'));
    if (platformer && next.down && !wasDown) window.dispatchEvent(new Event('unknown-universe:down'));
    paint();
  };
  return <div ref={base} role="group" aria-label="Movement D-pad" data-touch-dpad className="touch-dpad pointer-events-auto select-none"
    onContextMenu={event => event.preventDefault()}
    onTouchStart={event => {nativeTouch.current = event.changedTouches[0]?.identifier ?? null;}}
    onPointerDown={event => {
      if (pointer.current !== null || event.button !== 0) return;
      pointer.current = event.pointerId; geometry.current = event.currentTarget.getBoundingClientRect();
      pointerKinds.set(event.pointerId, event.pointerType);
      try {event.currentTarget.setPointerCapture(event.pointerId);} catch { /* Synthetic events lack capture. */ }
      steer(event);
    }}
    onPointerMove={steer}
    onPointerUp={event => {if (pointer.current === event.pointerId) neutral();}}
    onPointerCancel={event => {if (pointer.current === event.pointerId) neutral();}}
    onLostPointerCapture={event => {if (pointer.current === event.pointerId) neutral();}}>
    <span className="touch-dpad-center" aria-hidden="true" />
    {(['up','left','right','down'] as const).map((direction) => <span key={direction} data-touch-control={direction}
      className={`touch-dpad-key touch-dpad-${direction}`} aria-label={direction === 'up' ? platformer ? 'Jump' : 'Steer up' : direction === 'down' ? platformer ? downLabel : 'Steer down' : `Move ${direction}`}>
      {{up:'▲\uFE0E',left:'◀\uFE0E',right:'▶\uFE0E',down:'▼\uFE0E'}[direction]}
    </span>)}
  </div>;
};

const TouchButton: React.FC<{
  control: TouchControlKey;
  label: string;
  className?: string;
  compact?: boolean;
  accessibleLabel?: string;
}> = ({ control, label, className = "", compact = false, accessibleLabel }) => {
  const node=useRef<HTMLButtonElement>(null),held=useRef(new Set<number>());
  useEffect(()=>{
    const released=(event:Event)=>{held.current.delete((event as CustomEvent<number>).detail);if(!held.current.size)node.current?.removeAttribute('data-pressed');};
    const reset=()=>{held.current.clear();node.current?.removeAttribute('data-pressed');};
    window.addEventListener('unknown-universe:pointer-release',released);window.addEventListener('unknown-universe:controls-reset',reset);
    return()=>{window.removeEventListener('unknown-universe:pointer-release',released);window.removeEventListener('unknown-universe:controls-reset',reset);for(const id of held.current)releasePointer(id);};
  },[]);
  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    if(event.button!==0||held.current.has(event.pointerId))return;
    event.preventDefault();
    held.current.add(event.pointerId);event.currentTarget.setAttribute('data-pressed','true');
    pointerKinds.set(event.pointerId,event.pointerType);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic test events do not always have an active pointer to capture.
    }
    setControl(control, true, event.pointerId);
    if(control==='dash')window.dispatchEvent(new Event('unknown-universe:special'));
    if(control==='jump')window.dispatchEvent(new Event('unknown-universe:jump'));
    if(control==='down')window.dispatchEvent(new Event('unknown-universe:down'));
    if(control==='attack'||control==='shoot')window.dispatchEvent(new Event('unknown-universe:attack'));
  };

  const release = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Safe to ignore when the browser already released the pointer.
    }
    releasePointer(event.pointerId);
  };

  return (
    <button
      ref={node}
      type="button"
      aria-label={accessibleLabel ?? label}
      title={accessibleLabel ?? label}
      data-touch-control={control}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={(event) => releasePointer(event.pointerId)}
      onTouchEnd={()=>{for(const id of [...held.current])releasePointer(id);}}
      onTouchCancel={()=>{for(const id of [...held.current])releasePointer(id);}}
      onContextMenu={event=>event.preventDefault()}
      className={`touch-control select-none rounded-full border-[3px] border-white/70 bg-slate-950/80 font-['Gochi_Hand'] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] active:scale-95 active:bg-violet-700/80 ${
        compact ? "h-12 w-12 text-2xl" : "h-16 w-16 text-3xl"
      } ${className}`}
    >
      {label}
    </button>
  );
};

const TouchControls: React.FC<{ isPaused: boolean; flightMode?: boolean; isPlatformer?: boolean; autoRun?: boolean; canCrouch?: boolean; canShoot?: boolean; blasterEquipped?: boolean; teleportControls?:boolean; starControls?:boolean; specialName?:string; slamName?:string }> = ({ isPaused, flightMode = false, isPlatformer = false, autoRun = false, canCrouch = false, canShoot = false, blasterEquipped = false,teleportControls=false,starControls=false,specialName,slamName }) => {
  const airborneMoves = isPlatformer && (starControls || canCrouch);
  const downLabel = airborneMoves ? `Crouch / airborne ${slamName??(starControls?'ground punch':'butt bomb')}` : 'Crouch';
  useEffect(() => {
    resetControls();

    const releaseAll = () => resetControls();
    const releaseOne = (event: PointerEvent) => releasePointer(event.pointerId);
    window.addEventListener("blur", releaseAll);
    window.addEventListener('resize', releaseAll);
    const visibility = () => { if (document.hidden) releaseAll(); };
    const touchEnded=(event:TouchEvent)=>{if(event.touches.length===0)for(const [id,kind] of [...pointerKinds])if(kind==='touch')releasePointer(id);};
    window.addEventListener('touchend',touchEnded);window.addEventListener('touchcancel',touchEnded);
    window.addEventListener('pagehide',releaseAll);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener("pointerup", releaseOne);
    window.addEventListener("pointercancel", releaseOne);

    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener('resize', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('touchend',touchEnded);window.removeEventListener('touchcancel',touchEnded);
      window.removeEventListener('pagehide',releaseAll);
      window.removeEventListener("pointerup", releaseOne);
      window.removeEventListener("pointercancel", releaseOne);
      resetControls();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      resetControls();
    }
  }, [isPaused]);

  useEffect(() => {
    // A held flight direction/fire input must not become a jump/slash on landing.
    resetControls();
  }, [flightMode, isPlatformer]);

  return (
    <div aria-hidden={isPaused || undefined} inert={isPaused || undefined} className={`touch-controls pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${isPlatformer ? "touch-controls-platformer" : ""}`}>
      {isPlatformer && autoRun ? (
        airborneMoves ? <div className="pointer-events-auto"><TouchButton control="down" label="v" accessibleLabel={downLabel} compact /></div> : <div className="w-10" aria-hidden="true" />
      ) : (
        <TouchDpad platformer={isPlatformer} canDown={starControls || canCrouch} downLabel={downLabel} />
      )}

      {flightMode && <div className="touch-actions pointer-events-auto mb-1">
        <TouchButton control="attack" label="FIRE" accessibleLabel="Hold to fire ship cannons" className="h-20 w-24 bg-lime-700/82 text-2xl" />
      </div>}
      {!flightMode && <div className="touch-actions pointer-events-auto relative mb-1 grid grid-cols-2 gap-3">
        {isPlatformer && <span className="pointer-events-none absolute -top-5 right-0 hidden whitespace-nowrap text-xs font-bold text-white drop-shadow-[0_2px_2px_#111827] md:block">{blasterEquipped ? "Space / C: shoot" : "Space / C: attack"}</span>}
        <TouchButton control="jump" label="JUMP" accessibleLabel={airborneMoves ? `Jump / double jump / third tap: ${slamName??(starControls ? 'ground punch' : 'butt bomb')}` : "Jump"} className="bg-sky-700/72" />
        {isPlatformer && specialName ? (
          <TouchButton control="dash" label="SP" accessibleLabel={`Special: ${specialName}`} className="bg-violet-700/80 text-xl" />
        ) : starControls ? (
          <TouchButton control="dash" label="STAR" accessibleLabel="Star Dash" className="bg-pink-700/80 text-sm" />
        ) : isPlatformer && canCrouch ? (
          <TouchButton control="down" label="v" accessibleLabel="Crouch" className="bg-fuchsia-700/72" />
        ) : (
          <TouchButton control="dash" label={teleportControls?'BLINK':'D'} accessibleLabel={teleportControls?'Teleport step':'Dash'} className={`bg-fuchsia-700/72 ${teleportControls?'text-sm':''}`} />
        )}
        {isPlatformer && canShoot && !blasterEquipped && !teleportControls && <TouchButton control="shoot" label="FIRE" accessibleLabel="Hold to shoot equipped weapon" className="bg-lime-700/82" />}
        {teleportControls&&<TouchButton control="recall" label="R" accessibleLabel="Return to teleport anchor" className="bg-violet-700/72" />}
        <TouchButton control="attack" label={blasterEquipped?'FIRE':'HIT'} accessibleLabel={blasterEquipped ? "Hold to fire equipped weapon" : "Use equipped attack"} className="bg-amber-600/82 text-4xl" />
      </div>}
    </div>
  );
};

export default TouchControls;
