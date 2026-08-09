import React, { useEffect } from "react";

type TouchControlKey = "left" | "right" | "up" | "down" | "attack" | "jump" | "dash";

type TouchControlState = Record<TouchControlKey, boolean>;

declare global {
  interface Window {
    __unknownUniverseTouchControls?: Partial<TouchControlState>;
  }
}

const CONTROL_KEYS: TouchControlKey[] = ["left", "right", "up", "down", "attack", "jump", "dash"];
const activePointers = new Map<number, TouchControlKey>();

const setControl = (key: TouchControlKey, value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  window.__unknownUniverseTouchControls = {
    ...window.__unknownUniverseTouchControls,
    [key]: value
  };
};

const resetControls = () => {
  if (typeof window === "undefined") {
    return;
  }

  activePointers.clear();
  window.__unknownUniverseTouchControls = Object.fromEntries(CONTROL_KEYS.map((key) => [key, false])) as TouchControlState;
};

const releasePointer = (pointerId: number) => {
  const control = activePointers.get(pointerId);
  if (!control) {
    return;
  }

  activePointers.delete(pointerId);
  setControl(control, Array.from(activePointers.values()).includes(control));
};

const TouchButton: React.FC<{
  control: TouchControlKey;
  label: string;
  className?: string;
  compact?: boolean;
}> = ({ control, label, className = "", compact = false }) => {
  const usesWordLabel = label.length > 1;
  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic test events do not always have an active pointer to capture.
    }
    releasePointer(event.pointerId);
    activePointers.set(event.pointerId, control);
    setControl(control, true);
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
      type="button"
      aria-label={label}
      data-touch-control={control}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      className={`touch-control-button select-none rounded-full border-[3px] border-white/70 bg-slate-950/58 font-['Gochi_Hand'] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-md active:scale-95 active:bg-violet-700/80 ${
        compact ? "touch-control-compact h-12 w-12 text-2xl" : `touch-control-action h-16 w-16 ${usesWordLabel ? "touch-control-word text-xl tracking-wide" : "text-3xl"}`
      } ${className}`}
    >
      {label}
    </button>
  );
};

const TouchControls: React.FC<{ isPaused: boolean }> = ({ isPaused }) => {
  useEffect(() => {
    resetControls();

    const releaseAll = () => resetControls();
    const releaseTrackedPointer = (event: PointerEvent) => releasePointer(event.pointerId);
    const releaseWhenHidden = () => {
      if (document.visibilityState !== "visible") {
        releaseAll();
      }
    };
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pointerup", releaseTrackedPointer);
    window.addEventListener("pointercancel", releaseTrackedPointer);
    document.addEventListener("visibilitychange", releaseWhenHidden);

    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pointerup", releaseTrackedPointer);
      window.removeEventListener("pointercancel", releaseTrackedPointer);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      resetControls();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      resetControls();
    }
  }, [isPaused]);

  return (
    <div className="touch-controls pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="touch-dpad pointer-events-auto grid h-44 w-44 grid-cols-3 grid-rows-3 place-items-center rounded-full border border-white/10 bg-slate-950/16 p-1 backdrop-blur-[2px]">
        <div />
        <TouchButton control="up" label="^" compact />
        <div />
        <TouchButton control="left" label="<" compact />
        <div className="touch-control-center h-10 w-10 rounded-full border-2 border-white/25 bg-white/10" />
        <TouchButton control="right" label=">" compact />
        <div />
        <TouchButton control="down" label="v" compact />
        <div />
      </div>

      <div className="touch-action-cluster pointer-events-auto mb-1 grid grid-cols-2 gap-3">
        <TouchButton control="jump" label="JUMP" className="bg-sky-700/72" />
        <TouchButton control="dash" label="DASH" className="bg-fuchsia-700/72" />
        <TouchButton control="attack" label="ATTACK" className="touch-control-attack col-span-2 h-16 w-36 bg-amber-600/82" />
      </div>
    </div>
  );
};

export default TouchControls;
