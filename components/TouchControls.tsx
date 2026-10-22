import React, { useEffect, useRef } from "react";
import type { TouchControlKey, TouchControlState } from '../types';

const CONTROL_KEYS: TouchControlKey[] = ["left", "right", "up", "down", "attack", "shoot", "jump", "dash", "recall"];
const activePointers = new Map<number, Set<TouchControlKey>>();

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

  window.__unknownUniverseTouchControls = {
    ...window.__unknownUniverseTouchControls,
    [key]: value || [...activePointers.values()].some((keys) => keys.has(key))
  };
};

const releasePointer = (pointerId: number) => {
  const pointerKeys = activePointers.get(pointerId);
  if (!pointerKeys) {
    return;
  }

  activePointers.delete(pointerId);
  for (const key of pointerKeys) {
    setControl(key, false, pointerId);
  }
};

const resetControls = () => {
  if (typeof window === "undefined") {
    return;
  }

  activePointers.clear();
  window.__unknownUniverseTouchControls = { ...Object.fromEntries(CONTROL_KEYS.map((key) => [key, false])), axisX: 0, axisY: 0 } as TouchControlState;
  window.dispatchEvent(new Event('unknown-universe:controls-reset'));
};

/** Pointer capture keeps steering when a thumb slides outside the base. */
const TouchJoystick: React.FC<{ platformer: boolean; canDown: boolean }> = ({ platformer, canDown }) => {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const neutral = () => {
    if (pointer.current !== null) releasePointer(pointer.current);
    pointer.current = null;
    if (window.__unknownUniverseTouchControls) {
      window.__unknownUniverseTouchControls.axisX = 0;
      window.__unknownUniverseTouchControls.axisY = 0;
    }
    base.current?.removeAttribute('data-active');
    if (knob.current) knob.current.style.transform = 'translate(-50%, -50%)';
  };
  useEffect(() => {
    window.addEventListener('unknown-universe:controls-reset', neutral);
    return () => { window.removeEventListener('unknown-universe:controls-reset', neutral); neutral(); };
  }, []);
  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const travel = rect.width * .29;
    const dx = (event.clientX - rect.left - rect.width / 2) / travel;
    const dy = (event.clientY - rect.top - rect.height / 2) / travel;
    const distance = Math.hypot(dx, dy), scale = Math.max(1, distance);
    const x = dx / scale, y = dy / scale;
    const axis = (value: number) => Math.abs(value) <= .18 ? 0 : Math.sign(value) * (Math.abs(value) - .18) / .82;
    const axisX = axis(x), axisY = axis(y);
    setControl('left', axisX < 0, event.pointerId);
    setControl('right', axisX > 0, event.pointerId);
    setControl('up', !platformer && axisY < 0, event.pointerId);
    const down = (!platformer || canDown) && axisY > .5 && (!platformer || Math.abs(axisX) < .45);
    const wasDown = Boolean(window.__unknownUniverseTouchControls?.down);
    setControl('down', down, event.pointerId);
    window.__unknownUniverseTouchControls = { ...window.__unknownUniverseTouchControls, axisX, axisY: platformer ? 0 : axisY };
    if (platformer && down && !wasDown) window.dispatchEvent(new Event('unknown-universe:down'));
    if (knob.current) knob.current.style.transform = `translate(calc(-50% + ${x * travel}px), calc(-50% + ${y * travel}px))`;
  };
  return <div ref={base} role="group" aria-label={platformer ? 'Movement joystick: left, right and down' : 'Movement joystick: steer in any direction'}
    data-touch-joystick className="touch-joystick pointer-events-auto select-none"
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (pointer.current !== null || event.button !== 0) return;
      pointer.current = event.pointerId;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic events lack capture. */ }
      event.currentTarget.setAttribute('data-active', 'true');
      steer(event);
    }}
    onPointerMove={steer}
    onPointerUp={event => { if (pointer.current === event.pointerId) neutral(); }}
    onPointerCancel={event => { if (pointer.current === event.pointerId) neutral(); }}
    onLostPointerCapture={event => { if (pointer.current === event.pointerId) neutral(); }}>
    <span className="touch-joystick-guide" aria-hidden="true">✥</span>
    <span ref={knob} className="touch-joystick-knob" aria-hidden="true" />
  </div>;
};

const TouchButton: React.FC<{
  control: TouchControlKey;
  label: string;
  className?: string;
  compact?: boolean;
  accessibleLabel?: string;
}> = ({ control, label, className = "", compact = false, accessibleLabel }) => {
  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
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
    setControl(control, false, event.pointerId);
  };

  return (
    <button
      type="button"
      aria-label={accessibleLabel ?? label}
      title={accessibleLabel ?? label}
      data-touch-control={control}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={(event) => releasePointer(event.pointerId)}
      className={`touch-control select-none rounded-full border-[3px] border-white/70 bg-slate-950/58 font-['Gochi_Hand'] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-md active:scale-95 active:bg-violet-700/80 ${
        compact ? "h-12 w-12 text-2xl" : "h-16 w-16 text-3xl"
      } ${className}`}
    >
      {label}
    </button>
  );
};

const TouchControls: React.FC<{ isPaused: boolean; flightMode?: boolean; isPlatformer?: boolean; autoRun?: boolean; canCrouch?: boolean; canShoot?: boolean; blasterEquipped?: boolean; teleportControls?:boolean; starControls?:boolean; specialName?:string }> = ({ isPaused, flightMode = false, isPlatformer = false, autoRun = false, canCrouch = false, canShoot = false, blasterEquipped = false,teleportControls=false,starControls=false,specialName }) => {
  const airborneMoves = isPlatformer && (starControls || canCrouch && new URLSearchParams(window.location.search).get('xgodArt') !== 'model');
  const downLabel = airborneMoves ? starControls ? 'Crouch / airborne ground punch' : 'Crouch / airborne butt bomb' : 'Crouch';
  useEffect(() => {
    resetControls();

    const releaseAll = () => resetControls();
    const releaseOne = (event: PointerEvent) => releasePointer(event.pointerId);
    window.addEventListener("blur", releaseAll);
    window.addEventListener('resize', releaseAll);
    const visibility = () => { if (document.hidden) releaseAll(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener("pointerup", releaseOne);
    window.addEventListener("pointercancel", releaseOne);

    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener('resize', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
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
        <TouchJoystick platformer={isPlatformer} canDown={starControls || canCrouch} />
      )}

      {flightMode && <div className="touch-actions pointer-events-auto mb-1">
        <TouchButton control="attack" label="FIRE" accessibleLabel="Hold to fire ship cannons" className="h-20 w-24 bg-lime-700/82 text-2xl" />
      </div>}
      {!flightMode && <div className="touch-actions pointer-events-auto relative mb-1 grid grid-cols-2 gap-3">
        {isPlatformer && <span className="pointer-events-none absolute -top-5 right-0 hidden whitespace-nowrap text-xs font-bold text-white drop-shadow-[0_2px_2px_#111827] md:block">{blasterEquipped ? "Space / C: shoot" : "Space / C: attack"}</span>}
        <TouchButton control="jump" label="J" accessibleLabel={airborneMoves ? `Jump / double jump / third tap: ${starControls ? 'ground punch' : 'butt bomb'}` : "Jump"} className="bg-sky-700/72" />
        {isPlatformer && specialName ? (
          <TouchButton control="dash" label="SP" accessibleLabel={`Special: ${specialName}`} className="bg-violet-700/80 text-xl" />
        ) : starControls ? (
          <TouchButton control="dash" label="STAR" accessibleLabel="Star Dash" className="bg-pink-700/80 text-sm" />
        ) : isPlatformer && canCrouch ? (
          <TouchButton control="down" label="v" accessibleLabel="Crouch" className="bg-fuchsia-700/72" />
        ) : (
          <TouchButton control="dash" label={teleportControls?'BLINK':'D'} accessibleLabel={teleportControls?'Teleport step':'Dash'} className={`bg-fuchsia-700/72 ${teleportControls?'text-sm':''}`} />
        )}
        {isPlatformer && canShoot && !teleportControls && <TouchButton control="shoot" label="S" accessibleLabel="Hold to shoot equipped weapon" className="bg-lime-700/82" />}
        {teleportControls&&<TouchButton control="recall" label="R" accessibleLabel="Return to teleport anchor" className="bg-violet-700/72" />}
        <TouchButton control="attack" label="A" accessibleLabel={blasterEquipped ? "Hold to fire equipped weapon" : "Use equipped attack"} className="bg-amber-600/82 text-4xl" />
      </div>}
    </div>
  );
};

export default TouchControls;
