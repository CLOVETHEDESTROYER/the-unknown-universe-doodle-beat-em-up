
export type DifficultyMode = "EASY" | "HARD" | "X-GOD";
export type CharacterId = "xgod" | "barrett" | "nico" | "ezra" | "teleportation_c";

export interface GameStats {
  score: number;
  souls: number;
  monstersDefeated: number;
  health: number;
  maxHealth: number;
  lives: number;
  maxLives: number;
  level: number;
  isGameOver: boolean;
  isVictory: boolean;
  swordUnlocked: boolean;
  hasFlameSword: boolean;
  swordDurability: number;
  maxSwordDurability: number;
  shieldUnlocked: boolean;
  inkShieldReady: boolean;
  dinioUnlocked: boolean;
  hasDinio: boolean;
  doghostUnlocked: boolean;
  hasDoghost: boolean;
  teleportationCUnlocked: boolean;
  hasTeleportationC: boolean;
  gravityCoreUnlocked: boolean;
  gravityCoreCharges: number;
  selectedCharacterId: CharacterId;
  characterPowerUnlocked: boolean;
}

export interface DoodleIdea {
  name: string;
  description: string;
  parts: string[];
}
