export const GAME_UPDATES = [
  {
    id: 20261113,
    title: 'Alley Rescue and new audio',
    changes: [
      'Rescue Killer Kai after Level 1 to unlock him and earn a blaster-arm power-up for X God in that campaign.',
      'Hear new music in the Furnace, Witchwood, and Dread Planet, plus dedicated tracks for Kilina and the Void Pursuer.',
      'Listen for new cues at liftoff, during the Void Pursuer and Void Regent fights, and before nearby vents erupt.',
    ],
  },
] as const;

const HISTORY_KEY = 'unknownUniverse.updateHistory.v1';
export const LATEST_UPDATE = GAME_UPDATES[0].id;

export function readSeenUpdate(): number | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// A saved revision also records that this browser has started playing.
export function markLatestUpdateSeen(): number {
  const seen = Math.max(readSeenUpdate() ?? 0, LATEST_UPDATE);
  try {
    localStorage.setItem(HISTORY_KEY, String(seen));
  } catch {
    // The current app session still remembers the dismissal or play start.
  }
  return seen;
}
