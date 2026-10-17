import React, { useEffect } from "react";

type TouchControlKey = "left" | "right" | "up" | "down" | "attack" | "shoot" | "jump" | "dash" | "recall";

type TouchControlState = Record<TouchControlKey, boolean>;

declare global {
  interface Window {
    __unknownUniverseTouchControls?: Partial<TouchControlState>;
  }
}

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
  window.__unknownUniverseTouchControls = Object.fromEntries(CONTROL_KEYS.map((key) => [key, false])) as TouchControlState;
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
  useEffect(() => {
    resetControls();

    const releaseAll = () => resetControls();
    const releaseOne = (event: PointerEvent) => releasePointer(event.pointerId);
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pointerup", releaseOne);
    window.addEventListener("pointercancel", releaseOne);

    return () => {
      window.removeEventListener("blur", releaseAll);
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
    <div className={`touch-controls pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${isPlatformer ? "touch-controls-platformer" : ""}`}>
      {isPlatformer && autoRun ? (
        <div className="w-10" aria-hidden="true" />
      ) : isPlatformer ? (
        <div className="touch-dpad touch-dpad-platformer pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/16 p-2 backdrop-blur-[2px]">
          <TouchButton control="left" label="<" compact />
          {starControls || canCrouch ? <TouchButton control="down" label="v" accessibleLabel="Crouch" compact /> : <div className="h-10 w-10 rounded-full border-2 border-white/25 bg-white/10" />}
          <TouchButton control="right" label=">" compact />
        </div>
      ) : (
        <div className={`touch-dpad pointer-events-auto grid grid-cols-3 grid-rows-3 place-items-center rounded-full border border-white/10 bg-slate-950/16 p-1 backdrop-blur-[2px] ${flightMode ? "touch-dpad-flight h-40 w-40" : "h-44 w-44"}`}>
          <div />
          <TouchButton control="up" label="^" compact />
          <div />
          <TouchButton control="left" label="<" compact />
          <div className="h-10 w-10 rounded-full border-2 border-white/25 bg-white/10" />
          <TouchButton control="right" label=">" compact />
          <div />
          <TouchButton control="down" label="v" compact />
          <div />
        </div>
      )}

      {flightMode && <div className="touch-actions pointer-events-auto mb-1">
        <TouchButton control="attack" label="FIRE" accessibleLabel="Hold to fire ship cannons" className="h-20 w-24 bg-lime-700/82 text-2xl" />
      </div>}
      {!flightMode && <div className="touch-actions pointer-events-auto relative mb-1 grid grid-cols-2 gap-3">
        {isPlatformer && <span className="pointer-events-none absolute -top-5 right-0 hidden whitespace-nowrap text-xs font-bold text-white drop-shadow-[0_2px_2px_#111827] md:block">{blasterEquipped ? "Space / C: shoot" : "Space / C: attack"}</span>}
        <TouchButton control="jump" label="J" className="bg-sky-700/72" />
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
        <TouchButton control="attack" label="A" accessibleLabel={blasterEquipped ? "Hold to fire equipped weapon" : "Use equipped attack"} className={`${isPlatformer && (canShoot||teleportControls) ? "" : "col-span-2 w-36"} h-16 bg-amber-600/82 text-4xl`} />
      </div>}
    </div>
  );
};

export default TouchControls;
