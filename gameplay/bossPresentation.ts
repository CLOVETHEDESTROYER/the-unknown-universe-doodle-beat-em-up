/** Shared scene-clock timings keep counter cues and both boss renderers in sync. */
export const BOSS_COUNTER_BASE_MS = 2600;
export function bossCounterWindow(phase: number, base = BOSS_COUNTER_BASE_MS) {
  return base - (phase === 2 ? 400 : 0);
}
export function pursuerCounterWindow(phase: number) { return phase >= 2 ? 2600 : 3000; }

export const BOSS_DEFEAT_DURATION = 2350;
export const BOSS_DEATH_BASE_FACING = {
  dark_dragon: -1, killinas_daughter: 1, ink_behemoth: 1,
  kilina: 1, void_regent: -1, pursuer: -1,
} as const;
export type BossDeathId = keyof typeof BOSS_DEATH_BASE_FACING;
export function bossDeathTexture(id: BossDeathId) { return `boss_death_${id}`; }
export function bossDeathPose(elapsed: number) {
  const frame = elapsed < 240 ? 0 : elapsed < 540 ? 1 : elapsed < 900 ? 2 : 3;
  const stage: 'finished' | 'recoil' | 'collapse' | 'fallen' = elapsed >= BOSS_DEFEAT_DURATION ? 'finished' : frame === 0 ? 'recoil' : frame < 3 ? 'collapse' : 'fallen';
  return { frame, stage, alpha: Math.max(0, Math.min(1, (BOSS_DEFEAT_DURATION - elapsed) / 450)) };
}
