export const KAI_ARM_KEY = 'unknown-universe-kai-arm';
let unlockedForSession = false;
export function readKaiArmUnlocked(): boolean {
  if (unlockedForSession) return true;
  try { return localStorage.getItem(KAI_ARM_KEY) === 'true'; } catch { return false; }
}
export function unlockKaiArm(): void {
  unlockedForSession = true;
  try { localStorage.setItem(KAI_ARM_KEY, 'true'); } catch { /* Available this session. */ }
}
