// The public event uses Denver midnight boundaries (MST on both dates).
export const CHRISTMAS_START = Date.parse('2026-11-26T07:00:00.000Z');
export const CHRISTMAS_END = Date.parse('2026-12-26T07:00:00.000Z');
export const CHRISTMAS_PREVIEW_KEY = 'unknownUniverse.christmasPreview.2026';
let sessionPreview = false;

export const acceptsChristmasCode = (code: string) => code === 'SantaKisComing';
export const isChristmasEventLive = (now = Date.now()) => now >= CHRISTMAS_START && now < CHRISTMAS_END;
export function readChristmasPreview() {
  try { return sessionPreview || localStorage.getItem(CHRISTMAS_PREVIEW_KEY) === 'true'; }
  catch { return sessionPreview; }
}
export function storeChristmasPreview(enabled: boolean) {
  sessionPreview = enabled;
  try { localStorage.setItem(CHRISTMAS_PREVIEW_KEY, String(enabled)); }
  catch { /* Keep the preview usable when browser storage is unavailable. */ }
}
export const isChristmasAvailable = (now = Date.now()) => readChristmasPreview() || isChristmasEventLive(now);

/** Recheck the calendar on a boundary or return to the app, without altering runs. */
export function watchChristmasAvailability(update: (available: boolean) => void) {
  let timer: ReturnType<typeof setTimeout>;
  const refresh = () => {
    clearTimeout(timer);
    const now = Date.now();
    update(isChristmasAvailable(now));
    const boundary = now < CHRISTMAS_START ? CHRISTMAS_START : now < CHRISTMAS_END ? CHRISTMAS_END : Infinity;
    if (Number.isFinite(boundary)) timer = setTimeout(refresh, Math.min(2_147_000_000, Math.max(1, boundary - now)));
  };
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('storage', refresh);
  refresh();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('storage', refresh);
  };
}
