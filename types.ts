
export interface GameStats {
  souls: number;
  monstersDefeated: number;
  health: number;
  maxHealth: number;
  lives: number;
  maxLives: number;
  level: number;
  isGameOver: boolean;
}

export interface DoodleIdea {
  name: string;
  description: string;
  parts: string[];
}
