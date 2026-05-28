import React, { useEffect } from "react";

type TouchControlKey = "left" | "right" | "up" | "down" | "attack" | "jump" | "dash";

type TouchControlState = Record<TouchControlKey, boolean>;

declare global {
  interface Window {
    __unknownUniverseTouchControls?: Partial<TouchControlState>;
  }
}

const CONTROL_KEYS: TouchControlKey[] = ["left", "right", "up", "down", "attack", "jump", "dash"];

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

  window.__unknownUniverseTouchControls = Object.fromEntries(CONTROL_KEYS.map((key) => [key, false])) as TouchControlState;
};

const TouchButton: React.FC<{
  control: TouchControlKey;
  label: string;
  className?: string;
  compact?: boolean;
}> = ({ control, label, className = "", compact = false }) => {
  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic test events do not always have an active pointer to capture.
    }
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
    setControl(control, false);
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-touch-control={control}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      className={`select-none rounded-full border-[3px] border-white/70 bg-slate-950/58 font-['Gochi_Hand'] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-md active:scale-95 active:bg-violet-700/80 ${
        compact ? "h-12 w-12 text-2xl" : "h-16 w-16 text-3xl"
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
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pointerup", releaseAll);
    window.addEventListener("pointercancel", releaseAll);

    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pointerup", releaseAll);
      window.removeEventListener("pointercancel", releaseAll);
      resetControls();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      resetControls();
    }
  }, [isPaused]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto grid h-44 w-44 grid-cols-3 grid-rows-3 place-items-center rounded-full border border-white/10 bg-slate-950/16 p-1 backdrop-blur-[2px]">
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

      <div className="pointer-events-auto mb-1 grid grid-cols-2 gap-3">
        <TouchButton control="jump" label="J" className="bg-sky-700/72" />
        <TouchButton control="dash" label="D" className="bg-fuchsia-700/72" />
        <TouchButton control="attack" label="A" className="col-span-2 h-16 w-36 bg-amber-600/82 text-4xl" />
      </div>
    </div>
  );
};

export default TouchControls;
