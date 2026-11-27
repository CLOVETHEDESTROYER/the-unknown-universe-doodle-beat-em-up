import { isCharacterId, ROSTER_UNLOCK_STORAGE_KEY } from "../characters";
import { FINAL_LEVEL } from "../campaign";
import { CharacterId, DifficultyMode, GameStats } from "../types";
import { createLoadout } from "./powerups";
import { readThanksgivingEnabled, storeThanksgivingEnabled } from "./seasonalTheme";
import {
  acceptsTurkeyKingCode,
  readTurkeyKingSelected,
  readTurkeyKingUnlocked,
  unlockTurkeyKing
} from "./turkeyKingUnlock";
import {
  acceptsChristmasCode,
  acceptsSpiritOfChristmasCode,
  isChristmasAvailable,
  readChristmasPreview,
  readSpiritOfChristmasUnlock,
  storeChristmasPreview,
  unlockSpiritOfChristmas
} from "./christmasEvent";

export const KAI_RESCUE_KEY = "unknown-universe-kai-rescued";

export const readKaiRescued = () => {
  try {
    return localStorage.getItem(KAI_RESCUE_KEY) === "true";
  } catch {
    return false;
  }
};

export const LEVEL_MUSIC: Partial<Record<number, string>> = {
  1: "/TheUnknownUniverseTheme.mp3",
  2: "/GraveYardDread.mp3",
  3: "/CaveDripLogic.mp3",
  4: "/audio/music/witchwood-level.mp3",
  5: "/audio/music/starbreak-overdrive.mp3",
  6: "/audio/music/dread-planet-level.mp3"
};

export const START_SCREEN_MUSIC = "/audio/music/unknown-universe-intro-new.mp3";

export const BOSS_MUSIC: Partial<Record<number, { bossId: string; src: string }>> = {
  1: { bossId: "dark_dragon", src: "/audio/music/dark-dragon-dragons-breath.mp3" },
  2: {
    bossId: "killinas_daughter",
    src: "/audio/music/killinas-daughter-the-brooding-collosus.mp3"
  },
  3: { bossId: "ink_behemoth", src: "/audio/music/cinder-colossus-heart-of-the-furnace.mp3" },
  4: { bossId: "kilina", src: "/audio/music/kilina-boss.mp3" },
  5: { bossId: "void-pursuer", src: "/audio/music/void-pursuer.mp3" }
};

export const LEVEL_ONE_INTRO_IMAGE = "/Level1Intro.png";
export const START_SCREEN_IMAGE = "/GameStartScreen.png";
export const DEFAULT_DIFFICULTY: DifficultyMode = "EASY";

export const DIFFICULTY_OPTIONS: Array<{
  mode: DifficultyMode;
  label: string;
  description: string;
}> = [
  {
    mode: "EASY",
    label: "Easy",
    description: "A smoother run with lighter enemy health and calmer wave pressure."
  },
  {
    mode: "HARD",
    label: "Hard",
    description: "Enemies get tougher, faster, and a little more relentless."
  },
  {
    mode: "X-GOD",
    label: "X-GOD",
    description: "The nastiest version of the campaign with the heaviest enemy scaling."
  }
];

export const DEFAULT_STATS: GameStats = {
  isDying: false,
  activeBossId: null,
  score: 0,
  souls: 0,
  monstersDefeated: 0,
  health: 100,
  maxHealth: 100,
  lives: 3,
  maxLives: 3,
  level: 1,
  isGameOver: false,
  isVictory: false,
  swordUnlocked: false,
  hasFlameSword: false,
  swordDurability: 0,
  maxSwordDurability: 3,
  shieldUnlocked: false,
  inkShieldReady: false,
  dinioUnlocked: false,
  hasDinio: false,
  doghostUnlocked: false,
  hasDoghost: false,
  teleportationCUnlocked: false,
  hasTeleportationC: false,
  gravityCoreUnlocked: false,
  gravityCoreCharges: 0,
  selectedCharacterId: "xgod",
  characterPowerUnlocked: false
};

const PLATFORMER_ONLY_HEROES = new Set<CharacterId>([
  "killer_klause",
  "turkey_king",
  "zgod",
  "killer_kai",
  "elytron",
  "shadow_kid"
]);

export const supportsLegacyBrawler = (characterId: CharacterId) =>
  !PLATFORMER_ONLY_HEROES.has(characterId);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const readBooleanQuery = (value: string | null) =>
  value === "1" || value === "true" || value === "yes";

export const isRosterUnlockedFromStorage = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ROSTER_UNLOCK_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const isRosterUnlockBypassed = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("unlockRoster"));
};

export const getInitialCharacterId = (): CharacterId => {
  if (typeof window === "undefined") return "xgod";

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("character");
  if (acceptsSpiritOfChristmasCode(params.get("code") ?? "")) {
    unlockSpiritOfChristmas();
    storeChristmasPreview(true);
    return "killer_klause";
  }
  if (acceptsChristmasCode(params.get("code") ?? "")) {
    storeChristmasPreview(true);
    return "killer_klause";
  }
  if (requested === "killer_klause") return isChristmasAvailable() ? requested : "xgod";
  if (!requested && readChristmasPreview()) return "killer_klause";
  if (acceptsTurkeyKingCode(params.get("code") ?? "")) {
    unlockTurkeyKing();
    storeThanksgivingEnabled(true);
    return "turkey_king";
  }
  if (!requested && readTurkeyKingSelected()) return "turkey_king";
  if (!isCharacterId(requested)) return "xgod";
  if (requested === "turkey_king") return readTurkeyKingUnlocked() ? requested : "xgod";

  if (
    requested === "xgod" ||
    requested === "zgod" ||
    (requested === "killer_kai" && readKaiRescued()) ||
    isRosterUnlockedFromStorage() ||
    isRosterUnlockBypassed()
  ) {
    return requested;
  }

  return "xgod";
};

export const readDifficultyQuery = (value: string | null): DifficultyMode => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "HARD") return "HARD";
  if (normalized === "X-GOD" || normalized === "XGOD" || normalized === "X_GOD") return "X-GOD";
  return DEFAULT_DIFFICULTY;
};

export const shouldBypassStartFlow = () => {
  if (typeof window === "undefined") return false;
  return readBooleanQuery(new URLSearchParams(window.location.search).get("autostart"));
};

export const shouldUseLegacyDesktopControls = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    readBooleanQuery(params.get("desktopControls")) || readBooleanQuery(params.get("legacyDesktop"))
  );
};

export const shouldUseLegacyBrawler = () => {
  if (typeof window === "undefined") return false;
  return readBooleanQuery(new URLSearchParams(window.location.search).get("legacyBrawler"));
};

export const shouldUseAutoRun = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("autoRun")) && !readBooleanQuery(params.get("manualRun"));
};

export const getInitialDifficulty = (): DifficultyMode => {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  return readDifficultyQuery(new URLSearchParams(window.location.search).get("difficulty"));
};

export const getInitialStats = (): GameStats => {
  if (typeof window === "undefined") return DEFAULT_STATS;

  const params = new URLSearchParams(window.location.search);
  const levelParam = Number.parseInt(params.get("level") ?? "", 10);
  const healthParam = Number.parseInt(params.get("health") ?? "", 10);
  const livesParam = Number.parseInt(params.get("lives") ?? "", 10);
  const soulsParam = Number.parseInt(params.get("souls") ?? "", 10);
  const killsParam = Number.parseInt(params.get("kills") ?? "", 10);
  const scoreParam = Number.parseInt(params.get("score") ?? "", 10);
  const swordUnlocked = readBooleanQuery(params.get("swordUnlocked"));
  const hasFlameSword = readBooleanQuery(params.get("sword"));
  const shieldUnlocked =
    readBooleanQuery(params.get("shieldUnlocked")) || readBooleanQuery(params.get("shield"));
  const dinioUnlocked =
    readBooleanQuery(params.get("dinioUnlocked")) || readBooleanQuery(params.get("dinio"));
  const hasDinio = readBooleanQuery(params.get("dinio"));
  const doghostUnlocked =
    readBooleanQuery(params.get("doghostUnlocked")) || readBooleanQuery(params.get("doghost"));
  const hasDoghost = readBooleanQuery(params.get("doghost"));
  const teleportationCUnlocked =
    readBooleanQuery(params.get("teleportcUnlocked")) || readBooleanQuery(params.get("teleportc"));
  const hasTeleportationC = readBooleanQuery(params.get("teleportc"));
  const gravityCoreUnlocked =
    readBooleanQuery(params.get("gravityCoreUnlocked")) ||
    readBooleanQuery(params.get("gravityCore"));
  const gravityCoreChargesParam = Number.parseInt(params.get("gravityCoreCharges") ?? "", 10);
  const selectedCharacterId = getInitialCharacterId();
  const klauseInvincible =
    selectedCharacterId === "killer_klause" &&
    (acceptsSpiritOfChristmasCode(params.get("code") ?? "") || readSpiritOfChristmasUnlock());
  const characterPowerUnlocked =
    selectedCharacterId === "zgod" ||
    readBooleanQuery(params.get("characterPower")) ||
    (selectedCharacterId === "xgod" && hasFlameSword);
  const inkShieldReadyParam = params.get("shieldReady");
  const swordDurabilityParam = Number.parseInt(params.get("swordDurability") ?? "", 10);
  const maxSwordDurabilityParam = Number.parseInt(params.get("maxSwordDurability") ?? "", 10);
  const maxSwordDurability = Number.isFinite(maxSwordDurabilityParam)
    ? clamp(maxSwordDurabilityParam, 1, 5)
    : DEFAULT_STATS.maxSwordDurability;

  const maxLevel =
    shouldUseLegacyBrawler() && supportsLegacyBrawler(selectedCharacterId) ? 4 : FINAL_LEVEL;

  return {
    ...DEFAULT_STATS,
    seasonalTheme: isChristmasAvailable()
      ? "christmas"
      : readThanksgivingEnabled()
        ? "thanksgiving"
        : undefined,
    klauseInvincible,
    level: Number.isFinite(levelParam) ? clamp(levelParam, 1, maxLevel) : DEFAULT_STATS.level,
    health:
      selectedCharacterId === "zgod"
        ? DEFAULT_STATS.maxHealth
        : Number.isFinite(healthParam)
          ? clamp(healthParam, 1, DEFAULT_STATS.maxHealth)
          : DEFAULT_STATS.health,
    lives: Number.isFinite(livesParam)
      ? clamp(livesParam, 1, DEFAULT_STATS.maxLives)
      : DEFAULT_STATS.lives,
    score: Number.isFinite(scoreParam) ? Math.max(0, scoreParam) : DEFAULT_STATS.score,
    souls: Number.isFinite(soulsParam) ? Math.max(0, soulsParam) : DEFAULT_STATS.souls,
    monstersDefeated: Number.isFinite(killsParam)
      ? Math.max(0, killsParam)
      : DEFAULT_STATS.monstersDefeated,
    equipment: createLoadout(
      hasFlameSword
        ? "sword"
        : selectedCharacterId === "xgod" || selectedCharacterId === "killer_kai"
          ? "blaster"
          : "hands"
    ),
    swordUnlocked: swordUnlocked || hasFlameSword,
    hasFlameSword,
    swordDurability: hasFlameSword
      ? Number.isFinite(swordDurabilityParam)
        ? clamp(swordDurabilityParam, 1, maxSwordDurability)
        : maxSwordDurability
      : 0,
    maxSwordDurability,
    shieldUnlocked,
    inkShieldReady: shieldUnlocked
      ? inkShieldReadyParam
        ? readBooleanQuery(inkShieldReadyParam)
        : true
      : false,
    dinioUnlocked,
    hasDinio,
    doghostUnlocked,
    hasDoghost,
    teleportationCUnlocked,
    hasTeleportationC,
    gravityCoreUnlocked,
    gravityCoreCharges: gravityCoreUnlocked
      ? Number.isFinite(gravityCoreChargesParam)
        ? clamp(gravityCoreChargesParam, 1, 3)
        : 3
      : 0,
    selectedCharacterId,
    characterPowerUnlocked
  };
};
