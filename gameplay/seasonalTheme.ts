export const THANKSGIVING_KEY = 'unknownUniverse.thanksgiving.v1';
export type SeasonalTheme = 'thanksgiving';
export function readThanksgivingEnabled() {
  try { return localStorage.getItem(THANKSGIVING_KEY) === 'true'; }
  catch { return false; }
}
export function storeThanksgivingEnabled(enabled: boolean) {
  try { localStorage.setItem(THANKSGIVING_KEY, String(enabled)); }
  catch { /* The setting still works for this session without browser storage. */ }
}
export function acceptsThanksgivingCode(code: string) {
  return code.trim().toLowerCase() === 'happyturkey';
}
