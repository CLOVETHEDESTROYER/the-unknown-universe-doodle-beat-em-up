import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { loadGameSheet, loadGameImage, mobileGameOptions, watchGameViewport } from "../gameplay/mobileRuntime";
import { CHARACTER_CONFIGS } from "../characters";
import { CharacterId, DifficultyMode, GameStats } from "../types";
import { FINAL_LEVEL } from "../campaign";
import { createCrumble, stepCrumble, ventPhase } from "../gameplay/groundObstacles";
import type { CrumbleState, CrumblingPlatformPlan, TimedVentPlan } from "../gameplay/groundObstacles";
import { RESTORED_ENEMIES, ENEMY_REINTRODUCTIONS, isRestoredEnemy } from "../gameplay/enemyVariety";
import type { RestoredEnemyKind } from "../gameplay/enemyVariety";
import { RESTORED_ENEMY_BODIES } from "../gameplay/restoredEnemyBodies";
import { POWERUPS, restoreLoadout, equipPowerup, hitPowerup, powerupRoute } from '../gameplay/powerups';
import type { PowerupLoadout, EquippedPowerup } from '../gameplay/powerups';
import { createTeleport, blinkDestination, safeTeleportPoint, teleportPathClear, startTeleport, resetTeleport, BLINK_COOLDOWN } from '../gameplay/teleportation';
import { playSfx } from '../audio/gameAudio';
import { addTerrainTiles } from '../gameplay/terrainTextures';
import { SignatureSpecialRuntime } from '../gameplay/signatureSpecialRuntime';
import { AirborneMoves } from '../gameplay/airborneMoves';
import { EMBER_DASH, EmberJets } from '../gameplay/emberJets';
import { FLAME_SWORD, FireBlades } from '../gameplay/fireBlade';
import { BossVulnerabilityCue } from '../gameplay/bossVulnerabilityCue';
import { BOSS_DEATH_BASE_FACING, BOSS_DEFEAT_DURATION, bossCounterWindow, bossDeathPose, bossDeathTexture } from '../gameplay/bossPresentation';

interface PlatformerGameEngineProps {
  initialEquipment?: PowerupLoadout;
  isPaused: boolean;
  initialLives?: number;
  currentLevel: number;
  difficulty: DifficultyMode;
  selectedCharacterId: CharacterId;
  initialScore: number;
  initialSouls: number;
  initialMonstersDefeated: number;
  playerSprite: string | null;
  initialSwordUnlocked: boolean;
  initialHasFlameSword: boolean;
  initialSwordDurability: number;
  maxSwordDurability: number;
  initialShieldUnlocked: boolean;
  initialInkShieldReady: boolean;
  initialDinioUnlocked: boolean;
  initialHasDinio: boolean;
  initialDoghostUnlocked: boolean;
  initialHasDoghost: boolean;
  initialTeleportationCUnlocked: boolean;
  initialHasTeleportationC: boolean;
  initialGravityCoreUnlocked: boolean;
  initialGravityCoreCharges: number;
  initialCharacterPowerUnlocked: boolean;
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  onTogglePause: () => void;
}

type LevelNumber = 1 | 2 | 3 | 4 | 6;
type EnemyKind = "walker" | "alien" | "dasher" | "giant" | "boss" | RestoredEnemyKind;
type BossId = "dark_dragon" | "killinas_daughter" | "ink_behemoth" | "kilina" | "void_regent";
type PickupKind = "coin" | "heart" | "power" | "shield" | "gravity" | "dinio" | "doghost" | "teleportation_c" | "rush_star" | EquippedPowerup;

interface PlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface EnemyPlan {
  kind: EnemyKind;
  x: number;
  y: number;
  left: number;
  right: number;
  bossId?: BossId;
  bounceLane?: boolean;
}

interface MovingPlatformPlan extends PlatformRect {
  travel: number;
  period: number;
  phase?: number;
  axis?: "x" | "y";
}

interface PickupPlan {
  kind: PickupKind;
  x: number;
  y: number;
  requiresBossDefeat?: boolean;
  bounceReward?: boolean;
}

interface SpringPadPlan {
  x: number;
  y: number;
  width: number;
  launchSpeed: number;
}

interface RooftopRushPlan {
  durationMs: number;
  stars: Array<{ x: number; y: number }>;
}

interface LevelPlan {
  chapter: string;
  title: string;
  backgrounds: string[];
  blockKey: string;
  hazardKey: string;
  spawn: { x: number; y: number };
  checkpoints: Array<{ x: number; y: number }>;
  platforms: PlatformRect[];
  movingPlatforms?: MovingPlatformPlan[];
  springPads?: SpringPadPlan[];
  crumblingPlatforms?: CrumblingPlatformPlan[];
  timedVents?: TimedVentPlan[];
  obstacleStart?: number;
  rooftopRush?: RooftopRushPlan;
  hazards: PlatformRect[];
  enemies: EnemyPlan[];
  pickups: PickupPlan[];
  endX: number;
  tint: number;
}

declare global {
  interface Window {
    __unknownUniverseTouchControls?: Partial<Record<"left" | "right" | "up" | "down" | "attack" | "shoot" | "jump" | "dash" | "recall", boolean>>;
    __unknownPlatformerForceFall?: () => void;
    __unknownPlatformerDamagePlayer?: (damage?: number) => void;
    __unknownPlatformerSetPlayerPosition?: (x: number, y?: number) => void;
    __unknownPlatformerCollectPickup?: (kind?: string) => void;
    __unknownPlatformerSpecialTest?: (options?: {offsets?:number[];hp?:number;projectile?:boolean;boss?:boolean;guarded?:boolean}) => void;
    advanceTime?: (ms: number) => Promise<void>;
    render_game_to_text?: () => string;
  }
}

const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 576;
const WORLD_HEIGHT = 720;
const MAX_LEVEL = FINAL_LEVEL;
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 327;
const XGOD_SIDE_SCROLL_RUN_FRAME_SIZE = 512;
const XGOD_SWORD_RUN_FRAME_WIDTH = 248;
const CHARACTER_WALK_FRAME_WIDTH = 256;
const CHARACTER_WALK_FRAME_HEIGHT = 360;
const CHARACTER_ATTACK_FRAME_WIDTH = 480;
const CHARACTER_ATTACK_FRAME_HEIGHT = 360;
const GRUNT_WALK_FRAME_WIDTH = 543;
const GRUNT_WALK_FRAME_HEIGHT = 724;
const SMALL_ENEMY_FRAME_WIDTH = 280;
const SMALL_ENEMY_FRAME_HEIGHT = 280;
const GIANT_ENEMY_FRAME_WIDTH = 360;
const GIANT_ENEMY_FRAME_HEIGHT = 420;
const XGOD_PLATFORM_STAND_OFFSET = 11;
const PLAYER_VISUAL_SCALE_MULTIPLIER = 1.15;
const TURN_SKID_DURATION_MS = 108;
const TURN_SKID_DECELERATION = 900;
const STOMP_HOP_SPEED = 420;
const STOMP_BOOST_SPEED = 650;

// Fractions of each animation frame. The body bottom matches the visible feet,
// while the top is the surface a descending player can stomp.
const ENEMY_BODY_PROFILES: Record<Exclude<EnemyKind, "boss">, {
  x: number; y: number; width: number; height: number; footAnchor: number;
}> = {
  walker: { x: 0.27, y: 0.15, width: 0.46, height: 0.63, footAnchor: 0.78 },
  alien: { x: 0.28, y: 0.10, width: 0.44, height: 0.85, footAnchor: 0.95 },
  dasher: { x: 0.18, y: 0.20, width: 0.64, height: 0.73, footAnchor: 0.93 },
  giant: { x: 0.14, y: 0.10, width: 0.72, height: 0.87, footAnchor: 0.97 },
  ...RESTORED_ENEMY_BODIES
};

const BOSS_BODY_PROFILES: Record<BossId, { x: number; y: number; width: number; height: number }> = {
  dark_dragon: { x: 0.35, y: 0.625, width: 0.30, height: 0.3125 },
  killinas_daughter: { x: 0.42, y: 0.54, width: 0.16, height: 0.3975 },
  kilina: { x: 0.41, y: 0.5075, width: 0.18, height: 0.43 },
  ink_behemoth: { x: 0.35, y: 0.4375, width: 0.30, height: 0.50 },
  void_regent: { x: 0.38, y: 0.44, width: 0.24, height: 0.4975 }
};

const BOSS_ATTACK_VISUALS: Record<BossId, {
  path: string; frameWidth: number; frameHeight: number;
  originX: number; originY: number; facesRight: boolean;
}> = {
  dark_dragon: { path: "bosses/encounters-v2/dark_dragon/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  killinas_daughter: { path: "bosses/kilina-v3/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  kilina: { path: "bosses/kilina-witch-v1/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  ink_behemoth: { path: "bosses/encounters-v2/ink_behemoth/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  void_regent: { path: "bosses/encounters-v2/void_regent/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: false }
};

const BOSS_DEFINITIONS: Record<BossId, {
  name: string;
  textureKey: string;
  assetPath: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  scale: number;
  maxHp: number;
  tint: number;
  attackName: string;
  attackStyle: "volley" | "rush" | "quake" | "burst";
  projectileKey: string;
  attackInterval: number;
  tellMs: number;
  attackMs: number;
}> = {
  dark_dragon: {
    name: "DARK DRAGON",
    textureKey: "boss_dark_dragon",
    assetPath: "bosses/encounters-v2/dark_dragon/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 7,
    scale: 1.05,
    maxHp: 32,
    tint: 0xff7a45,
    attackName: "FIRE VOLLEY",
    attackStyle: "volley",
    projectileKey: "boss_fire_orb",
    attackInterval: 2200,
    tellMs: 520,
    attackMs: 560
  },
  killinas_daughter: {
    name: "KILLINA'S DAUGHTER",
    textureKey: "boss_killinas_daughter",
    assetPath: "bosses/kilina-v3/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    scale: 0.9,
    maxHp: 44,
    tint: 0xe9a8ff,
    attackName: "AXE DASH",
    attackStyle: "rush",
    projectileKey: "boss_bullet",
    attackInterval: 2050,
    tellMs: 430,
    attackMs: 620
  },
  ink_behemoth: {
    name: "CINDER COLOSSUS",
    textureKey: "boss_cinder_colossus",
    assetPath: "bosses/encounters-v2/ink_behemoth/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 6,
    scale: 0.95,
    maxHp: 48,
    tint: 0xff7b2b,
    attackName: "FURNACE QUAKE",
    attackStyle: "quake",
    projectileKey: "boss_ink_orb",
    attackInterval: 2200,
    tellMs: 600,
    attackMs: 720
  },
  kilina: {
    name: "KILINA",
    textureKey: "boss_kilina",
    assetPath: "bosses/kilina-witch-v1/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 4,
    scale: 0.68,
    maxHp: 52,
    tint: 0xf04c86,
    attackName: "WITCH HEX",
    attackStyle: "burst",
    projectileKey: "boss_ink_orb",
    attackInterval: 1700,
    tellMs: 850,
    attackMs: 1500
  },
  void_regent: {
    name: "VOID REGENT",
    textureKey: "boss_void_regent",
    assetPath: "bosses/encounters-v2/void_regent/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 4,
    scale: 0.9,
    maxHp: 56,
    tint: 0xc084fc,
    attackName: "VOID BURST",
    attackStyle: "burst",
    projectileKey: "boss_bullet",
    attackInterval: 1900,
    tellMs: 500,
    attackMs: 600
  }
};

// All attacks commit their aim/destination during the warning. Durations are milliseconds.
const BOSS_MOVES: Record<string, { tell: number; attack: number; recovery: number; hint: string }> = {
  fire_volley: { tell: 750, attack: 1100, recovery: 2600, hint: "FIRE VOLLEY - MOVE!" },
  dragon_lunge: { tell: 800, attack: 700, recovery: 2600, hint: "LUNGE - MOVE CLEAR!" },
  low_breath: { tell: 850, attack: 1050, recovery: 2700, hint: "LOW FIRE - JUMP!" },
  furnace_quake: { tell: 850, attack: 1550, recovery: 2800, hint: "QUAKE - JUMP!" },
  cinder_bound: { tell: 950, attack: 1100, recovery: 2800, hint: "BOUND - LEAVE THE RING!" },
  ember_rain: { tell: 1050, attack: 2100, recovery: 2800, hint: "EMBERS - LEAVE THE LANES!" },
  blink_burst: { tell: 950, attack: 1500, recovery: 2600, hint: "BLINK - WATCH THE MARK!" },
  star_fan: { tell: 800, attack: 1250, recovery: 2600, hint: "STAR FAN - MOVE!" },
  shadow_dash: { tell: 850, attack: 800, recovery: 2700, hint: "SHADOW DASH - MOVE CLEAR!" },
  witch_hex: { tell: 850, attack: 1500, recovery: 2600, hint: "HEX BOLTS - KEEP MOVING!" },
  rune_bloom: { tell: 1050, attack: 2000, recovery: 2700, hint: "RUNES - LEAVE THE MARKS!" },
  witch_step: { tell: 850, attack: 950, recovery: 2600, hint: "WITCH STEP - LEAVE THE RING!" }
};

const LEVELS: Record<LevelNumber, LevelPlan> = {
  1: {
    chapter: "THE SCRATCH",
    title: "Rooftop Recess",
    backgrounds: ["dark_alleyway_1", "dark_alleyway_2", "dark_alleyway_3"],
    blockKey: "platform_school_block",
    hazardKey: "platform_ink_hazard",
    spawn: { x: 160, y: 480 },
    checkpoints: [{ x: 790, y: 410 }, { x: 2290, y: 410 }, { x: 3540, y: 410 }, { x: 4780, y: 410 }, { x: 6400, y: 410 }, { x: 7200, y: 410 }],
    platforms: [
      // Learn a short hop, then try the spring over a forgiving lower route.
      { x: 0, y: 480, w: 2450, h: 240 },
      { x: 430, y: 416, w: 88, h: 64 },
      { x: 590, y: 380, w: 180, h: 42 },
      // Optional rooftop line: a timed six-star trail, with solid ground below.
      { x: 1110, y: 350, w: 240, h: 42 },
      { x: 1490, y: 350, w: 250, h: 42 },
      { x: 1860, y: 385, w: 220, h: 42 },
      { x: 2090, y: 424, w: 72, h: 56 },
      // Repeat the launch with a moving landing and a small, readable gap.
      { x: 2590, y: 480, w: 500, h: 240 },
      { x: 2670, y: 390, w: 220, h: 42 },
      { x: 3220, y: 480, w: 880, h: 240 },
      { x: 3070, y: 400, w: 340, h: 42 },
      // An optional high exit is reached by keeping the three-stomp rhythm.
      { x: 4240, y: 300, w: 220, h: 42 },
      // 4. Rooftop hurdles teach a short hop before the bridge over the first ink gap.
      { x: 4230, y: 480, w: 890, h: 240 },
      { x: 4510, y: 407, w: 95, h: 73 },
      { x: 4650, y: 355, w: 220, h: 42 },
      { x: 5040, y: 390, w: 300, h: 42 },
      // 5. A second stretch combines a low wall, ink puddle, and optional lift route.
      { x: 5290, y: 480, w: 860, h: 240 },
      { x: 5520, y: 397, w: 92, h: 83 },
      { x: 5650, y: 345, w: 245, h: 42 },
      { x: 6080, y: 390, w: 300, h: 42 },
      // 6. A final short obstacle section gives a safe reset before the guardian.
      { x: 6340, y: 480, w: 540, h: 240 },
      { x: 6590, y: 407, w: 100, h: 73 },
      { x: 6700, y: 345, w: 190, h: 42 },
      // 7. The boss yard preserves its original open space for dodging Fire Volley.
      { x: 6880, y: 480, w: 1770, h: 240 },
      { x: 7440, y: 385, w: 240, h: 42 },
      { x: 7870, y: 385, w: 240, h: 42 }
    ],
    movingPlatforms: [
      { x: 2390, y: 395, w: 200, h: 42, travel: 28, period: 3400 },
      { x: 4800, y: 375, w: 165, h: 42, travel: 42, period: 4200 },
      { x: 5840, y: 375, w: 180, h: 42, travel: 48, period: 4600, phase: 0.5 }
    ],
    springPads: [
      { x: 950, y: 480, width: 112, launchSpeed: 780 },
      { x: 2790, y: 480, width: 112, launchSpeed: 780 },
      { x: 3235, y: 400, width: 84, launchSpeed: 620 }
    ],
    rooftopRush: {
      durationMs: 14000,
      stars: [
        { x: 1160, y: 280 }, { x: 1290, y: 280 },
        { x: 1590, y: 280 }, { x: 1680, y: 280 },
        { x: 1900, y: 315 }, { x: 2020, y: 315 }
      ]
    },
    hazards: [
      { x: 2450, y: 556, w: 140, h: 34 },
      { x: 2910, y: 462, w: 95, h: 18 },
      { x: 3090, y: 556, w: 130, h: 34 },
      { x: 4100, y: 556, w: 130, h: 34 },
      { x: 4830, y: 462, w: 115, h: 18 },
      { x: 5120, y: 556, w: 170, h: 34 },
      { x: 5790, y: 462, w: 130, h: 18 },
      { x: 6150, y: 556, w: 190, h: 34 },
      { x: 6530, y: 462, w: 100, h: 18 }
    ],
    enemies: [
      { kind: "walker", x: 680, y: 450, left: 580, right: 740 },
      { kind: "walker", x: 1610, y: 450, left: 1450, right: 1760 },
      { kind: "walker", x: 2720, y: 450, left: 2630, right: 2750 },
      { kind: "walker", x: 3450, y: 450, left: 3436, right: 3464, bounceLane: true },
      { kind: "walker", x: 3730, y: 450, left: 3716, right: 3744, bounceLane: true },
      { kind: "walker", x: 4010, y: 450, left: 3996, right: 4024, bounceLane: true },
      { kind: "alien", x: 4740, y: 260, left: 4590, right: 4900 },
      { kind: "walker", x: 5410, y: 450, left: 5340, right: 5490 },
      { kind: "dasher", x: 6020, y: 450, left: 5930, right: 6100 },
      { kind: "giant", x: 6750, y: 450, left: 6700, right: 6820 },
      { kind: "giant", x: 7030, y: 450, left: 6960, right: 7110 },
      { kind: "boss", bossId: "dark_dragon", x: 7790, y: 398, left: 7630, right: 8000 }
    ],
    pickups: [
      { kind: "coin", x: 455, y: 335 },
      ...[630, 720].map((x): PickupPlan => ({ kind: "coin", x, y: 315 })),
      ...[{ x: 980, y: 250 }, { x: 1030, y: 205 }, { x: 1080, y: 210 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[1400, 1580, 1780].map((x): PickupPlan => ({ kind: "coin", x, y: 425 })),
      { kind: "dinio", x: 2230, y: 425 },
      ...[{ x: 2350, y: 360 }, { x: 2480, y: 300 }, { x: 2610, y: 340 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[{ x: 2850, y: 330 }, { x: 2960, y: 285 }, { x: 3110, y: 320 }, { x: 3280, y: 335 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[{ x: 3280, y: 230 }, { x: 3380, y: 240 },
        { x: 3530, y: 265 }, { x: 3610, y: 185 }, { x: 3690, y: 225 },
        { x: 3810, y: 265 }, { x: 3890, y: 185 }, { x: 3970, y: 225 },
        { x: 4100, y: 250 }, { x: 4200, y: 200 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      { kind: "shield", x: 4370, y: 250, bounceReward: true },
      ...[4570, 4670, 4770].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
      ...[5050, 5150, 5250].map((x): PickupPlan => ({ kind: "coin", x, y: 330 })),
      ...[5600, 5720, 5840].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      ...[6100, 6200, 6300].map((x): PickupPlan => ({ kind: "coin", x, y: 330 })),
      ...[6680, 6770, 6860].map((x): PickupPlan => ({ kind: "coin", x, y: 310 })),
      { kind: "heart", x: 3550, y: 420 },
      { kind: "heart", x: 6390, y: 420 },
      { kind: "power", x: 8040, y: 430, requiresBossDefeat: true }
    ],
    endX: 8350,
    tint: 0xffffff
  },
  2: {
    chapter: "THE GRAVEYARD",
    title: "Moonlit Mausoleum",
    backgrounds: ["graveyard_level1", "graveyard_level2", "graveyard_level2_5", "graveyard_level3"],
    blockKey: "platform_graveyard_block",
    hazardKey: "platform_fog_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 1690, y: 410 }, { x: 3570, y: 410 }, { x: 5250, y: 410 }, { x: 6650, y: 410 }, { x: 7400, y: 410 }],
    platforms: [
      // Lifts first appear over solid ground; the lower route remains usable at every phase.
      { x: 0, y: 480, w: 1380, h: 240 },
      { x: 1380, y: 480, w: 1130, h: 240 },
      { x: 2510, y: 480, w: 1040, h: 240 },
      { x: 3550, y: 480, w: 940, h: 240 },
      { x: 4490, y: 480, w: 1030, h: 240 },
      { x: 5520, y: 480, w: 1040, h: 240 },
      { x: 6560, y: 480, w: 580, h: 240 },
      { x: 7140, y: 480, w: 1510, h: 240 },
      { x: 980, y: 385, w: 250, h: 42 },
      { x: 1570, y: 375, w: 270, h: 42 },
      { x: 2220, y: 390, w: 350, h: 42 },
      { x: 2740, y: 365, w: 240, h: 42 },
      { x: 3260, y: 390, w: 420, h: 42 },
      { x: 4010, y: 365, w: 240, h: 42 },
      { x: 4250, y: 400, w: 370, h: 42 },
      // Raised stone blocks and spans add decisions without trapping the lower route.
      { x: 4730, y: 405, w: 90, h: 75 },
      { x: 4860, y: 350, w: 230, h: 42 },
      { x: 5270, y: 390, w: 330, h: 42 },
      { x: 5730, y: 397, w: 90, h: 83 },
      { x: 5860, y: 340, w: 250, h: 42 },
      { x: 6300, y: 390, w: 340, h: 42 },
      { x: 6740, y: 350, w: 220, h: 42 },
      { x: 6880, y: 410, w: 95, h: 70 },
      // The guardian arena retains its open floor and two elevated ledges.
      { x: 7440, y: 385, w: 240, h: 42 },
      { x: 7870, y: 385, w: 240, h: 42 }
    ],
    movingPlatforms: [
      { x: 510, y: 380, w: 360, h: 42, travel: 55, period: 4800 },
      { x: 1880, y: 370, w: 300, h: 42, travel: 60, period: 4400, phase: 0.5 },
      { x: 2980, y: 380, w: 260, h: 42, travel: 50, period: 4000, phase: 0.25 },
      { x: 3690, y: 380, w: 290, h: 42, travel: 55, period: 4600, phase: 0.75 },
      { x: 5050, y: 380, w: 170, h: 42, travel: 48, period: 4300, phase: 0.25 },
      { x: 6030, y: 375, w: 180, h: 42, travel: 55, period: 4700, phase: 0.5 }
    ],
    hazards: [
      { x: 5090, y: 462, w: 120, h: 18 },
      { x: 6110, y: 462, w: 120, h: 18 },
      { x: 6990, y: 462, w: 110, h: 18 }
    ],
    enemies: [
      { kind: "walker", x: 1510, y: 450, left: 1420, right: 1550 },
      { kind: "alien", x: 2150, y: 265, left: 2080, right: 2350 },
      { kind: "dasher", x: 2820, y: 450, left: 2670, right: 2940 },
      { kind: "alien", x: 4950, y: 255, left: 4850, right: 5160 },
      { kind: "walker", x: 5590, y: 450, left: 5540, right: 5700 },
      { kind: "dasher", x: 6240, y: 450, left: 6140, right: 6320 },
      { kind: "walker", x: 6810, y: 450, left: 6740, right: 6860 },
      { kind: "giant", x: 7240, y: 450, left: 7180, right: 7290 },
      { kind: "boss", bossId: "killinas_daughter", x: 7790, y: 398, left: 7580, right: 7990 }
    ],
    pickups: [
      ...[580, 690, 800].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
      ...[1020, 1100, 1180].map((x): PickupPlan => ({ kind: "coin", x, y: 325 })),
      { kind: "doghost", x: 1790, y: 420 },
      ...[1940, 2020, 2100].map((x): PickupPlan => ({ kind: "coin", x, y: 270 })),
      { kind: "shield", x: 2400, y: 330 },
      ...[3020, 3100, 3180].map((x): PickupPlan => ({ kind: "coin", x, y: 275 })),
      ...[3780, 3860, 3940].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
      { kind: "heart", x: 3580, y: 420 },
      { kind: "coin", x: 4300, y: 330 },
      ...[4820, 4920, 5020].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      ...[5290, 5390, 5490].map((x): PickupPlan => ({ kind: "coin", x, y: 330 })),
      ...[5810, 5930, 6050].map((x): PickupPlan => ({ kind: "coin", x, y: 290 })),
      ...[6320, 6440, 6540].map((x): PickupPlan => ({ kind: "coin", x, y: 325 })),
      ...[6710, 6810, 6910].map((x): PickupPlan => ({ kind: "coin", x, y: 300 })),
      { kind: "heart", x: 6600, y: 420 }
    ],
    endX: 8350,
    tint: 0xffffff
  },
  3: {
    chapter: "THE FURNACE",
    title: "Cinder Rampart",
    backgrounds: ["cave_level_1", "cave_level_2", "cave_level_3"],
    blockKey: "platform_furnace_block",
    hazardKey: "platform_lava_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 1560, y: 395 }, { x: 3500, y: 380 }],
    platforms: [
      { x: 0, y: 520, w: 760, h: 120 },
      { x: 940, y: 520, w: 820, h: 120 },
      { x: 1980, y: 520, w: 720, h: 120 },
      { x: 2920, y: 520, w: 820, h: 120 },
      { x: 3960, y: 520, w: 1770, h: 120 },
      { x: 620, y: 385, w: 320, h: 42 },
      { x: 1280, y: 315, w: 320, h: 42 },
      { x: 2200, y: 350, w: 420, h: 42 },
      { x: 3270, y: 300, w: 360, h: 42 },
      { x: 4520, y: 340, w: 450, h: 42 }
    ],
    hazards: [
      { x: 780, y: 552, w: 150, h: 38 },
      { x: 1780, y: 552, w: 180, h: 38 },
      { x: 2720, y: 552, w: 180, h: 38 },
      { x: 3760, y: 552, w: 190, h: 38 }
    ],
    enemies: [
      { kind: "walker", x: 680, y: 470, left: 540, right: 730 },
      { kind: "alien", x: 1420, y: 250, left: 1180, right: 1780 },
      { kind: "dasher", x: 2350, y: 470, left: 2050, right: 2640 },
      { kind: "boss", bossId: "ink_behemoth", x: 4680, y: 438, left: 4100, right: 5300 }
    ],
    pickups: [
      { kind: "coin", x: 720, y: 315 },
      { kind: "coin", x: 1350, y: 245 },
      { kind: "teleportation_c", x: 2140, y: 455 },
      { kind: "heart", x: 2350, y: 285 },
      { kind: "power", x: 4600, y: 275 }
    ],
    endX: 5450,
    tint: 0xffffff
  },
  4: {
    chapter: "THE WITCHWOOD",
    title: "Kilina's Moonthorn Sanctuary",
    backgrounds: ["witchwood_panorama", "witchwood_parallax"],
    blockKey: "platform_witchwood_block",
    hazardKey: "platform_witchwood_hazard",
    spawn: { x: 160, y: 520 },
    checkpoints: [{ x: 1380, y: 450 }, { x: 2810, y: 450 }, { x: 4230, y: 450 }, { x: 5570, y: 450 }, { x: 6340, y: 450 }],
    platforms: [
      // Entry ruins teach the new route over a forgiving lower floor.
      { x: 0, y: 520, w: 1700, h: 200 },
      { x: 430, y: 450, w: 90, h: 70 }, { x: 650, y: 385, w: 260, h: 42 },
      { x: 1070, y: 335, w: 230, h: 42 }, { x: 1450, y: 405, w: 230, h: 42 },
      // A short gap, then jump onto the broad ruined wall and its rooftop coins.
      { x: 1840, y: 520, w: 1450, h: 200 },
      { x: 1760, y: 410, w: 180, h: 42 }, { x: 2160, y: 365, w: 340, h: 155 },
      { x: 2660, y: 405, w: 250, h: 42 }, { x: 3060, y: 355, w: 210, h: 42 },
      // Spring court and lift crossings. Every mandatory gap is a normal-jump width.
      { x: 3420, y: 520, w: 650, h: 200 }, { x: 4230, y: 520, w: 650, h: 200 },
      { x: 3700, y: 405, w: 220, h: 42 }, { x: 4480, y: 350, w: 270, h: 42 },
      { x: 5020, y: 520, w: 760, h: 200 }, { x: 5220, y: 395, w: 250, h: 42 },
      { x: 5600, y: 335, w: 240, h: 42 },
      // Breathing room and a final safe checkpoint before the sanctuary arena.
      { x: 5920, y: 520, w: 1880, h: 200 }, { x: 6120, y: 405, w: 210, h: 42 },
      { x: 6580, y: 345, w: 190, h: 42 }, { x: 7140, y: 345, w: 190, h: 42 }
    ],
    movingPlatforms: [
      { x: 3210, y: 405, w: 155, h: 42, travel: 42, period: 3700 },
      { x: 4040, y: 390, w: 160, h: 42, travel: 50, period: 4100, phase: 0.3 },
      { x: 4810, y: 385, w: 155, h: 42, travel: 45, period: 3900 }
    ],
    springPads: [{ x: 3510, y: 520, width: 85, launchSpeed: 680 }],
    hazards: [
      { x: 1700, y: 552, w: 140, h: 38 }, { x: 3290, y: 552, w: 130, h: 38 },
      { x: 4070, y: 552, w: 160, h: 38 }, { x: 4880, y: 552, w: 140, h: 38 },
      { x: 5780, y: 552, w: 140, h: 38 }
    ],
    enemies: [
      { kind: "walker", x: 830, y: 385, left: 720, right: 880 },
      { kind: "alien", x: 1190, y: 335, left: 1100, right: 1270 },
      { kind: "walker", x: 2040, y: 470, left: 1890, right: 2110 },
      { kind: "dasher", x: 2860, y: 470, left: 2700, right: 3150 },
      { kind: "alien", x: 4590, y: 350, left: 4520, right: 4710 },
      { kind: "walker", x: 5400, y: 470, left: 5080, right: 5510 },
      { kind: "giant", x: 6090, y: 470, left: 5950, right: 6200 },
      { kind: "boss", bossId: "kilina", x: 6940, y: 520, left: 6650, right: 7150 }
    ],
    pickups: [
      ...[690,780,870].map((x): PickupPlan => ({ kind: "coin", x, y: 330 })),
      ...[1110,1190,1270].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
      ...[2210,2330,2450].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      ...[3090,3180,3310,3450,3760,3860].map((x): PickupPlan => ({ kind: "coin", x, y: 300 })),
      ...[4530,4630,4730].map((x): PickupPlan => ({ kind: "coin", x, y: 290 })),
      ...[5640,5730,5810].map((x): PickupPlan => ({ kind: "coin", x, y: 275 })),
      { kind: "shield", x: 2790, y: 350 }, { kind: "heart", x: 1380, y: 465 },
      { kind: "heart", x: 5560, y: 465 }, { kind: "heart", x: 6340, y: 465 }
    ],
    endX: 7500,
    tint: 0xffffff
  },
  6: {
    chapter: "THE DREAD PLANET",
    title: "Void Regent Approach",
    backgrounds: ["void_regent_pencil_panorama"],
    blockKey: "platform_dread_planet_block",
    hazardKey: "platform_void_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 1700, y: 380 }, { x: 3560, y: 350 }],
    platforms: [
      { x: 0, y: 520, w: 820, h: 120 },
      { x: 980, y: 520, w: 700, h: 120 },
      { x: 1880, y: 520, w: 740, h: 120 },
      { x: 2860, y: 520, w: 780, h: 120 },
      { x: 3880, y: 520, w: 1890, h: 120 },
      { x: 700, y: 365, w: 300, h: 42 },
      { x: 1350, y: 300, w: 330, h: 42 },
      { x: 2250, y: 335, w: 380, h: 42 },
      { x: 3300, y: 285, w: 380, h: 42 },
      { x: 4520, y: 330, w: 520, h: 42 }
    ],
    hazards: [
      { x: 840, y: 550, w: 130, h: 40 },
      { x: 1700, y: 550, w: 160, h: 40 },
      { x: 2640, y: 550, w: 200, h: 40 },
      { x: 3660, y: 550, w: 210, h: 40 }
    ],
    enemies: [
      { kind: "walker", x: 680, y: 470, left: 520, right: 780 },
      { kind: "alien", x: 1450, y: 245, left: 1120, right: 1800 },
      { kind: "dasher", x: 3200, y: 470, left: 2960, right: 3600 },
      { kind: "boss", bossId: "void_regent", x: 4720, y: 438, left: 4100, right: 5300 }
    ],
    pickups: [
      { kind: "coin", x: 820, y: 300 },
      { kind: "coin", x: 1460, y: 230 },
      { kind: "gravity", x: 3400, y: 220 },
      { kind: "heart", x: 4700, y: 260 }
    ],
    endX: 5480,
    tint: 0xffffff
  }
};

interface LevelExtension {
  insertionX: number;
  bridgeStartX: number;
  addedLength: number;
  newEndX: number;
  floorY: number;
  groundHeight: number;
  ground: PlatformRect[];
  platforms: PlatformRect[];
  hazards: PlatformRect[];
  movingPlatforms?: MovingPlatformPlan[];
  springPads?: SpringPadPlan[];
  crumblingPlatforms?: CrumblingPlatformPlan[];
  timedVents?: TimedVentPlan[];
  checkpoints: Array<{ x: number; y: number }>;
  enemies: EnemyPlan[];
  pickups: PickupPlan[];
}

function extendLevelRoute(level: LevelPlan, extension: LevelExtension) {
  if (extension.ground[0]?.x !== extension.bridgeStartX || extension.bridgeStartX > extension.insertionX) {
    throw new Error(`Level extension bridge does not align with insertion at ${extension.insertionX}`);
  }
  const shift = (x: number) => x >= extension.insertionX ? x + extension.addedLength : x;
  level.platforms = level.platforms.map((platform) => ({ ...platform, x: shift(platform.x) }));
  level.hazards = level.hazards.map((hazard) => ({ ...hazard, x: shift(hazard.x) }));
  level.movingPlatforms = level.movingPlatforms?.map((platform) => ({ ...platform, x: shift(platform.x) }));
  level.springPads = level.springPads?.map((pad) => ({ ...pad, x: shift(pad.x) }));
  level.crumblingPlatforms = level.crumblingPlatforms?.map((platform) => ({ ...platform, x: shift(platform.x) }));
  level.timedVents = level.timedVents?.map((vent) => ({ ...vent, x: shift(vent.x) }));
  if(level.rooftopRush) level.rooftopRush.stars=level.rooftopRush.stars.map(point=>({...point,x:shift(point.x)}));
  level.checkpoints = level.checkpoints.map((point) => ({ ...point, x: shift(point.x) }));
  level.enemies = level.enemies.map((enemy) => enemy.x >= extension.insertionX
    ? { ...enemy, x: enemy.x + extension.addedLength, left: enemy.left + extension.addedLength, right: enemy.right + extension.addedLength }
    : enemy);
  level.pickups = level.pickups.map((pickup) => ({ ...pickup, x: shift(pickup.x) }));
  level.platforms.push(...extension.ground, ...extension.platforms);
  level.hazards.push(...extension.hazards);
  level.movingPlatforms = [...(level.movingPlatforms ?? []), ...(extension.movingPlatforms ?? [])];
  level.springPads = [...(level.springPads ?? []), ...(extension.springPads ?? [])];
  level.crumblingPlatforms = [...(level.crumblingPlatforms ?? []), ...(extension.crumblingPlatforms ?? [])];
  level.timedVents = [...(level.timedVents ?? []), ...(extension.timedVents ?? [])];
  if(extension.crumblingPlatforms?.length) level.obstacleStart=extension.insertionX;
  level.checkpoints.push(...extension.checkpoints);
  level.checkpoints.sort((a,b)=>a.x-b.x);
  level.enemies.push(...extension.enemies);
  level.pickups.push(...extension.pickups);

  // Keep the boss yard's exit floor intact and preserve its original runout past the gate.
  const arenaFloorX = extension.insertionX + extension.addedLength;
  const arenaFloor = level.platforms.find((platform) => platform.x === arenaFloorX
    && platform.y === extension.floorY && platform.h === extension.groundHeight);
  if (!arenaFloor) throw new Error(`Missing shifted boss floor at ${arenaFloorX}`);
  level.endX = extension.newEndX;
}

extendLevelRoute(LEVELS[1], {
  insertionX: 6880, bridgeStartX: 6880, addedLength: 2505, newEndX: 10855, floorY: 480, groundHeight: 240,
  ground: [
    { x: 6880, y: 480, w: 500, h: 240 }, { x: 7520, y: 480, w: 520, h: 240 },
    { x: 8200, y: 480, w: 560, h: 240 }, { x: 8890, y: 480, w: 495, h: 240 }
  ],
  platforms: [
    { x: 7040, y: 405, w: 260, h: 42 }, { x: 7640, y: 350, w: 260, h: 42 },
    { x: 8350, y: 390, w: 270, h: 42 }, { x: 9000, y: 355, w: 300, h: 42 }
  ],
  hazards: [
    { x: 7380, y: 556, w: 140, h: 34 }, { x: 8040, y: 556, w: 160, h: 34 },
    { x: 8760, y: 556, w: 130, h: 34 }
  ],
  movingPlatforms: [
    { x: 7390, y: 380, w: 145, h: 42, travel: 36, period: 4100 },
    { x: 8745, y: 375, w: 155, h: 42, travel: 34, period: 3900, phase: 0.4 }
  ],
  checkpoints: [{ x: 8210, y: 410 }],
  enemies: [
    { kind: "walker", x: 7190, y: 450, left: 7000, right: 7350 },
    { kind: "alien", x: 7850, y: 255, left: 7680, right: 8000 },
    { kind: "dasher", x: 8520, y: 450, left: 8320, right: 8710 },
    { kind: "giant", x: 9140, y: 450, left: 8950, right: 9320 }
  ],
  pickups: [
    ...[7100, 7210, 7320].map((x): PickupPlan => ({ kind: "coin", x, y: 315 })),
    ...[7660, 7770, 7880].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[8380, 8500, 8620].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    ...[9000, 9120, 9240].map((x): PickupPlan => ({ kind: "coin", x, y: 300 })),
    { kind: "heart", x: 8210, y: 420 }
  ]
});

extendLevelRoute(LEVELS[2], {
  insertionX: 7140, bridgeStartX: 7140, addedLength: 2505, newEndX: 10855, floorY: 480, groundHeight: 240,
  ground: [
    { x: 7140, y: 480, w: 480, h: 240 }, { x: 7620, y: 480, w: 650, h: 240 },
    { x: 8270, y: 480, w: 670, h: 240 }, { x: 8940, y: 480, w: 705, h: 240 }
  ],
  platforms: [
    { x: 7300, y: 385, w: 250, h: 42 }, { x: 7870, y: 350, w: 270, h: 42 },
    { x: 8520, y: 390, w: 260, h: 42 }, { x: 9230, y: 345, w: 280, h: 42 }
  ],
  hazards: [],
  movingPlatforms: [
    { x: 7595, y: 375, w: 150, h: 42, travel: 38, period: 4200, phase: 0.3 },
    { x: 8900, y: 380, w: 150, h: 42, travel: 40, period: 4500 }
  ],
  checkpoints: [{ x: 8445, y: 410 }],
  enemies: [
    { kind: "walker", x: 7380, y: 450, left: 7210, right: 7590 },
    { kind: "alien", x: 8030, y: 250, left: 7850, right: 8240 },
    { kind: "dasher", x: 8710, y: 450, left: 8500, right: 8910 },
    { kind: "giant", x: 9370, y: 450, left: 9190, right: 9570 }
  ],
  pickups: [
    ...[7260, 7380, 7500].map((x): PickupPlan => ({ kind: "coin", x, y: 310 })),
    ...[7870, 7990, 8110].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
    ...[8500, 8620, 8740].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    ...[9160, 9280, 9400].map((x): PickupPlan => ({ kind: "coin", x, y: 295 })),
    { kind: "heart", x: 8445, y: 420 }
  ]
});

extendLevelRoute(LEVELS[3], {
  insertionX: 3960, bridgeStartX: 3740, addedLength: 1635, newEndX: 7085, floorY: 520, groundHeight: 120,
  ground: [
    { x: 3740, y: 520, w: 430, h: 120 }, { x: 4300, y: 520, w: 480, h: 120 },
    { x: 4920, y: 520, w: 675, h: 120 }
  ],
  platforms: [
    { x: 3890, y: 395, w: 240, h: 42 }, { x: 4390, y: 335, w: 280, h: 42 },
    { x: 5010, y: 375, w: 290, h: 42 }, { x: 5340, y: 330, w: 190, h: 42 }
  ],
  hazards: [
    { x: 4170, y: 552, w: 130, h: 38 }, { x: 4780, y: 552, w: 140, h: 38 }
  ],
  movingPlatforms: [{ x: 4140, y: 390, w: 145, h: 42, travel: 38, period: 4100 }],
  checkpoints: [{ x: 4940, y: 450 }],
  enemies: [
    { kind: "walker", x: 3970, y: 470, left: 3820, right: 4120 },
    { kind: "alien", x: 4510, y: 245, left: 4340, right: 4700 },
    { kind: "dasher", x: 5100, y: 470, left: 4940, right: 5480 },
    { kind: "giant", x: 5440, y: 470, left: 5300, right: 5550 }
  ],
  pickups: [
    ...[3880, 3990, 4100].map((x): PickupPlan => ({ kind: "coin", x, y: 340 })),
    ...[4360, 4480, 4600].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[4990, 5110, 5230].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    { kind: "heart", x: 4940, y: 450 }
  ]
});

extendLevelRoute(LEVELS[6], {
  insertionX: 3880, bridgeStartX: 3640, addedLength: 1644, newEndX: 7124, floorY: 520, groundHeight: 120,
  ground: [
    { x: 3640, y: 520, w: 440, h: 120 }, { x: 4210, y: 520, w: 490, h: 120 },
    { x: 4830, y: 520, w: 694, h: 120 }
  ],
  platforms: [
    { x: 3800, y: 390, w: 250, h: 42 }, { x: 4330, y: 325, w: 270, h: 42 },
    { x: 4920, y: 375, w: 300, h: 42 }, { x: 5310, y: 335, w: 190, h: 42 }
  ],
  hazards: [
    { x: 4080, y: 552, w: 130, h: 38 }, { x: 4700, y: 552, w: 130, h: 38 }
  ],
  movingPlatforms: [{ x: 4050, y: 390, w: 145, h: 42, travel: 40, period: 4300, phase: 0.35 }],
  checkpoints: [{ x: 4845, y: 450 }],
  enemies: [
    { kind: "walker", x: 3860, y: 470, left: 3700, right: 4020 },
    { kind: "alien", x: 4450, y: 240, left: 4280, right: 4650 },
    { kind: "dasher", x: 5000, y: 470, left: 4860, right: 5380 },
    { kind: "giant", x: 5435, y: 470, left: 5300, right: 5500 }
  ],
  pickups: [
    ...[3760, 3880, 4000].map((x): PickupPlan => ({ kind: "coin", x, y: 335 })),
    ...[4290, 4410, 4530].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[4900, 5020, 5140].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    { kind: "heart", x: 4845, y: 450 }
  ]
});

// Each new stretch introduces a mechanism over solid ground, then combines it
// with short jumpable gaps. The original boss yard moves as one intact section.
extendLevelRoute(LEVELS[3], {
  insertionX:5595,bridgeStartX:5595,addedLength:2400,newEndX:9485,floorY:520,groundHeight:120,
  ground:[{x:5595,y:520,w:600,h:120},{x:6355,y:520,w:570,h:120},{x:7085,y:520,w:910,h:120}],
  platforms:[{x:6540,y:355,w:250,h:42},{x:7190,y:442,w:96,h:78},{x:7350,y:350,w:280,h:42}],
  hazards:[{x:6195,y:552,w:160,h:38},{x:6925,y:552,w:160,h:38}],
  springPads:[{x:5830,y:520,width:100,launchSpeed:780}],
  crumblingPlatforms:[{x:5980,y:340,w:140,h:36},{x:6190,y:310,w:150,h:36},{x:6420,y:350,w:200,h:36}],
  movingPlatforms:[{x:6740,y:380,w:160,h:42,travel:110,period:4000,axis:'x'}],
  timedVents:[{x:6550,y:520,w:72,height:132},{x:7440,y:520,w:72,height:148,phase:.5}],
  checkpoints:[{x:6010,y:450},{x:7140,y:450},{x:7800,y:450}],
  enemies:[{kind:'walker',x:6100,y:470,left:6030,right:6150},
    {kind:'alien',x:7550,y:350,left:7390,right:7570},
    {kind:'dasher',x:7620,y:470,left:7570,right:7740}],
  pickups:[...[6020,6090,6230,6310,6470,6570,6680,6790].map((x):PickupPlan=>({kind:'coin',x,y:x<6400?250:290})),
    ...[7210,7410,7520,7630].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'heart',x:7140,y:465},{kind:'heart',x:7800,y:465}]
});

extendLevelRoute(LEVELS[4], {
  insertionX:5920,bridgeStartX:5920,addedLength:2200,newEndX:9700,floorY:520,groundHeight:200,
  ground:[{x:5920,y:520,w:680,h:200},{x:6750,y:520,w:650,h:200},{x:7540,y:520,w:580,h:200}],
  platforms:[{x:6870,y:440,w:95,h:80},{x:6980,y:355,w:240,h:42},{x:7700,y:430,w:100,h:90}],
  hazards:[{x:6600,y:552,w:150,h:38},{x:7400,y:552,w:140,h:38}],
  springPads:[{x:6160,y:520,width:96,launchSpeed:760}],
  crumblingPlatforms:[{x:6310,y:350,w:160,h:36},{x:6530,y:320,w:160,h:36},{x:6750,y:350,w:200,h:36}],
  movingPlatforms:[{x:7260,y:390,w:160,h:42,travel:115,period:4200,axis:'x',phase:.25}],
  timedVents:[],checkpoints:[{x:6460,y:450},{x:7610,y:450}],
  enemies:[{kind:'walker',x:6490,y:470,left:6420,right:6550},
    {kind:'alien',x:7120,y:355,left:7030,right:7180}],
  pickups:[...[6350,6440,6570,6650,6790,6900].map((x):PickupPlan=>({kind:'coin',x,y:260})),
    ...[7040,7150,7300,7440,7580,7750].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'shield',x:6880,y:285},{kind:'heart',x:7610,y:465}]
});

extendLevelRoute(LEVELS[6], {
  insertionX:5524,bridgeStartX:5524,addedLength:2500,newEndX:9624,floorY:520,groundHeight:120,
  ground:[{x:5524,y:520,w:730,h:120},{x:6414,y:520,w:640,h:120},{x:7224,y:520,w:800,h:120}],
  platforms:[{x:5980,y:335,w:200,h:42},{x:6500,y:350,w:250,h:42},
    {x:7320,y:435,w:110,h:85},{x:7420,y:355,w:260,h:42}],
  hazards:[{x:6254,y:552,w:160,h:38},{x:7054,y:552,w:170,h:38}],
  springPads:[{x:5860,y:520,width:100,launchSpeed:800}],
  crumblingPlatforms:[{x:6260,y:305,w:150,h:36},{x:6450,y:345,w:200,h:36}],
  movingPlatforms:[{x:6880,y:385,w:170,h:42,travel:110,period:3900,axis:'x',phase:.5}],
  timedVents:[{x:6580,y:520,w:72,height:140,phase:.25},{x:7510,y:520,w:72,height:140,phase:.75}],
  checkpoints:[{x:6100,y:450},{x:7270,y:450},{x:7860,y:450}],
  enemies:[{kind:'alien',x:6670,y:350,left:6560,right:6710},
    {kind:'dasher',x:7760,y:470,left:7720,right:7820}],
  pickups:[...[6020,6130,6290,6370,6500,6610,6720,6890].map((x):PickupPlan=>({kind:'coin',x,y:x<6500?245:290})),
    ...[7330,7460,7570,7680].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'heart',x:7270,y:465},{kind:'heart',x:7860,y:465}]
});

const CHARACTER_FEEL: Record<CharacterId, {
  runSpeed: number;
  acceleration: number;
  braking: number;
  turnAcceleration: number;
  airAcceleration: number;
  airBraking: number;
  jumpVelocity: number;
  attackCooldown: number;
  attackRange: number;
}> = {
  zgod: { runSpeed: 365, acceleration: 2550, braking: 2800, turnAcceleration: 3100, airAcceleration: 1500, airBraking: 450, jumpVelocity: 780, attackCooldown: 340, attackRange: 145 },
  xgod: { runSpeed: 350, acceleration: 2300, braking: 2900, turnAcceleration: 3200, airAcceleration: 1350, airBraking: 450, jumpVelocity: 760, attackCooldown: 440, attackRange: 105 },
  barrett: { runSpeed: 300, acceleration: 2050, braking: 2700, turnAcceleration: 2900, airAcceleration: 1150, airBraking: 400, jumpVelocity: 750, attackCooldown: 430, attackRange: 128 },
  nico: { runSpeed: 320, acceleration: 2200, braking: 2800, turnAcceleration: 3050, airAcceleration: 1250, airBraking: 425, jumpVelocity: 760, attackCooldown: 560, attackRange: 520 },
  ezra: { runSpeed: 310, acceleration: 2150, braking: 2800, turnAcceleration: 3000, airAcceleration: 1200, airBraking: 425, jumpVelocity: 760, attackCooldown: 500, attackRange: 420 },
  teleportation_c: { runSpeed: 380, acceleration: 2500, braking: 3000, turnAcceleration: 3400, airAcceleration: 1500, airBraking: 500, jumpVelocity: 800, attackCooldown: 430, attackRange: 150 }
};

const levelKey = (level: number): LevelNumber => (level === 5 ? FINAL_LEVEL : Math.min(MAX_LEVEL, Math.max(1, level))) as LevelNumber;
const pointValueForPickup = (kind: PickupKind) => kind === "rush_star" ? 0 : kind === "heart" ? 125 : kind === "coin" ? 100 : 700;

const PlatformerGameEngine: React.FC<PlatformerGameEngineProps> = ({
  initialEquipment,
  isPaused,
  initialLives = 3,
  currentLevel,
  difficulty,
  selectedCharacterId,
  initialScore,
  initialSouls,
  initialMonstersDefeated,
  playerSprite,
  initialSwordUnlocked,
  initialHasFlameSword,
  initialSwordDurability,
  maxSwordDurability,
  initialShieldUnlocked,
  initialInkShieldReady,
  initialDinioUnlocked,
  initialHasDinio,
  initialDoghostUnlocked,
  initialHasDoghost,
  initialTeleportationCUnlocked,
  initialHasTeleportationC,
  initialGravityCoreUnlocked,
  initialGravityCoreCharges,
  initialCharacterPowerUnlocked,
  onStatsUpdate,
  onTogglePause
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isPausedRef = useRef(isPaused);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const onTogglePauseRef = useRef(onTogglePause);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
    onTogglePauseRef.current = onTogglePause;
  }, [onStatsUpdate, onTogglePause]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    const scene = gameRef.current?.scene.getScene("PlatformerScene");
    if (scene) {
      if (isPaused) scene.scene.pause();
      else scene.scene.resume();
    }
  }, [isPaused]);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const selectedCharacter = CHARACTER_CONFIGS[selectedCharacterId];
    const isXGod = selectedCharacterId === "xgod";
    const isZGod = selectedCharacterId === "zgod";
    const heroBodyWidth = isZGod ? 80 : 96;
    const heroBodyHeight = isZGod ? 210 : 270;
    let zGodDashUntil = -9999, zGodDashReadyAt = 0, zGodReactUntil = -9999, zGodReactReadyAt = 0, zGodVictoryUntil = -9999;
    const params = new URLSearchParams(window.location.search);
    const debugFinish = params.get("finishLevel") === "1";
    const debugStompCourse = currentLevel === 1 && params.get("stompCourse") === "1";
    const debugCheckpoint = params.get("checkpoint") === "1";
    const useSideScrollXGodRun = params.get("xgodRun") !== "legacy" && !playerSprite;
    const useDrawnXGod = isXGod && useSideScrollXGodRun && params.get('xgodArt') !== 'model';
    const isAutoRun = ["1", "true", "yes"].includes(params.get("autoRun") ?? "")
      && !["1", "true", "yes"].includes(params.get("manualRun") ?? "");
    const playFeel = CHARACTER_FEEL[selectedCharacterId];
    const originalLevel = LEVELS[levelKey(currentLevel)];
    const replacements = new Map<EnemyPlan, RestoredEnemyKind>();
    for (const [kind,index,replacement] of ENEMY_REINTRODUCTIONS[currentLevel] ?? []) {
      const plan = originalLevel.enemies.filter(enemy => enemy.kind === kind && !enemy.bounceLane)[index];
      if (plan) replacements.set(plan,replacement);
    }
    const level = {...originalLevel,enemies:originalLevel.enemies.map(enemy => replacements.has(enemy)
      ? {...enemy,kind:replacements.get(enemy)!} : enemy)};
    const worldWidth = Math.max(6000, level.endX + 300);
    const failedAssetKeys = new Set<string>();
    let signature: SignatureSpecialRuntime | null = null;
    let mobility: AirborneMoves | null = null;
    let emberJets: EmberJets | null = null;
    let fireBlades: FireBlades | null = null;
    let specialQueuedAt = -9999;
    let jumpQueuedAt = -9999, downQueuedAt = -9999, downWasHeld = false;
    let equipmentAttackQueuedAt = -9999;

    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let platforms: Phaser.Physics.Arcade.StaticGroup;
    const lifts: Array<{ plan: MovingPlatformPlan; sprite: Phaser.GameObjects.TileSprite; body: Phaser.Physics.Arcade.Body }> = [];
    const crumbleLedges: Array<{plan:CrumblingPlatformPlan;state:CrumbleState;art:Phaser.GameObjects.TileSprite;cracks:Phaser.GameObjects.Graphics;body:Phaser.Physics.Arcade.StaticBody}> = [];
    const vents: Array<{plan:TimedVentPlan;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;body:Phaser.Physics.Arcade.StaticBody;phase:string}> = [];
    const springPads: Array<{ plan: SpringPadPlan; sprite: Phaser.GameObjects.Image; readyAt: number; launches: number }> = [];
    let springJumpUntil = -9999;
    let rushState: "ready" | "active" | "complete" = "ready";
    let rushCollected = 0;
    let rushEndsAt = 0;
    let rushHud: Phaser.GameObjects.Text | null = null;
    let rushNoticeUntil = 0;
    let liftClock = 0;
    let hazards: Phaser.Physics.Arcade.StaticGroup;
    let enemies: Phaser.Physics.Arcade.Group;
    let pickups: Phaser.Physics.Arcade.Group;
    let projectiles: Phaser.Physics.Arcade.Group;
    let dinioCompanion: Phaser.GameObjects.Sprite | null = null;
    let dinioNextShotAt = 0;
    let dinioAttackUntil = 0;
    let dinioAttackFacing = 1;
    let doghostCompanion: Phaser.GameObjects.Sprite | null = null;
    let teleportationCCompanion: Phaser.GameObjects.Sprite | null = null;
    let xgodDamagePose: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | null = null;
    let xgodDeathPose: Phaser.GameObjects.Image | null = null;
    let heroDeathVisual: Phaser.GameObjects.Sprite | null = null;
    let heroDeathStartedAt=-9999;
    let checkpoints: Phaser.Physics.Arcade.StaticGroup;
    let endGate: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    let bossBarrier: Phaser.GameObjects.Rectangle | null = null;
    let bossHudText: Phaser.GameObjects.Text | null = null;
    let bossHudFrame: Phaser.GameObjects.Rectangle | null = null;
    let bossHudFill: Phaser.GameObjects.Rectangle | null = null;
    let bossTellMarker: Phaser.GameObjects.Image | null = null;
    let bossAttackVisual: Phaser.GameObjects.Sprite | null = null;
    let bossAttackWarning: Phaser.GameObjects.Graphics | null = null;
    let bossGuardVisual: Phaser.GameObjects.Graphics | null = null;
    let bossVulnerabilityCue: BossVulnerabilityCue | null = null;
    let bossArenaCameraLocked = false;
    let levelTitle: Phaser.GameObjects.Text | null = null;
    let bossDeathVisual: Phaser.GameObjects.Sprite | null = null;
    let bossDeathStage: "none" | "recoil" | "collapse" | "fallen" | "finished" = "none";
    let bossDeathId: BossId | null = null;
    let bossDeathStartedAt = 0;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let attackKey: Phaser.Input.Keyboard.Key;
    let shootKey: Phaser.Input.Keyboard.Key;
    let jumpKey: Phaser.Input.Keyboard.Key;
    let jumpAltKey: Phaser.Input.Keyboard.Key;
    let dashKey: Phaser.Input.Keyboard.Key;
    let recallKey:Phaser.Input.Keyboard.Key;
    const teleport=createTeleport();
    let blinkHeld=false,recallHeld=false,teleportStride=0;
    let characterStride=0;
    let blinkQueuedAt=-9999,recallQueuedAt=-9999;
    let teleportHud:Phaser.GameObjects.Text|null=null;
    let allyAssistAt=0,allyReturnAt=0,allyAssistKind:'none'|'intercept'|'strike'='none',allyIntercepts=0,allyStrikes=0;
    let crouchKey: Phaser.Input.Keyboard.Key;
    let hitStopActive = false;
    let playerHealth = 100;
    let playerLives = initialLives;
    let currentScore = initialScore;
    let currentSouls = initialSouls;
    let currentKills = initialMonstersDefeated;
    let checkpoint = { x: level.spawn.x, y: getPlatformStandY(level.spawn.x) ?? level.spawn.y };
    let checkpointIndex = -1;
    let lastGroundedAt = 0;
    let jumpBufferedAt = -9999;
    let jumpWasHeld = false;
    let airLaunchKind: "jump" | "double-jump" | "butt-bomb" | "ground-punch" | "spring" | "stomp" | "boss-stomp" | null = null;
    let jumpVisualAirborne=false;
    let jumpVisualStartedAt=0;
    let lastAirborneVelocity=0;
    let landingVisualStartedAt=-9999;
    let stompChain = 0;
    let bestStompChain = 0;
    let stompCount = 0;
    let lastStompAt = -9999;
    let lastStompBoosted = false;
    let lastStompSpeed = 0;
    let stompHint: Phaser.GameObjects.Text | null = null;
    let isCrouching = false;
    let isRespawning = false;
    let crouchVisualProgress = 0;
    let autoRunDirection = 1;
    let lastAttackAt = -9999;
    let lastShotAt = -9999;
    let shotsFired = 0;
    let shotRecoilUntil = -9999;
    let lastAttackInputAt = -9999;
    let attackComboStep = 0;
    let attackStartedAt = -9999;
    let lastDamageAt = -9999;
    let movementLockedUntil = -9999;
    let attackVisualUntil = -9999;
    let latestSceneTime = 0;
    let attackDebug = { active: false, hits: 0, x: 0, y: 0, w: 0, h: 0 };
    let attackResolution='none';
    let blinkStrikeVisual=false;
    let facingDirection = 1;
    let skidTurnDirection = 0;
    let skidMomentumDirection = 0;
    let skidUntil = -9999;
    let isSkidding = false;
    let turnSkidCount = 0;
    let lastTurnSkidStartSpeed = 0;
    let lastGroundedRunFrame = 0;
    let characterPowerUnlocked = initialCharacterPowerUnlocked;
    let hasFlameSword = initialHasFlameSword;
    let swordUnlocked = initialSwordUnlocked;
    let swordDurability = initialSwordDurability;
    let shieldUnlocked = initialShieldUnlocked;
    let inkShieldReady = initialInkShieldReady;
    let dinioUnlocked = initialDinioUnlocked;
    let hasDinio = initialHasDinio;
    let doghostUnlocked = initialDoghostUnlocked;
    let hasDoghost = initialHasDoghost;
    let teleportationCUnlocked = initialTeleportationCUnlocked;
    let hasTeleportationC = initialHasTeleportationC && selectedCharacterId!=='teleportation_c';
    let gravityCoreUnlocked = initialGravityCoreUnlocked;
    let gravityCoreCharges = initialGravityCoreCharges;
    let equipment=restoreLoadout(initialEquipment,initialHasFlameSword?'sword':isXGod?'blaster':'hands');
    hasFlameSword=equipment.active==='sword';
    swordDurability=hasFlameSword?equipment.hits:0;
    let powerHud:Phaser.GameObjects.Text;
    let powerAura:Phaser.GameObjects.Graphics;
    let powerUses=0,powerHits=0,clearedBolts=0,lastPowerAt=-9999,emberUntil=-9999,emberDirection=1;
    let emberRemaining=0,emberClockAt=-9999;
    const emberTargets=new Set<Phaser.Physics.Arcade.Sprite>();
    const routePowers=powerupRoute(currentLevel,level);
    const powerStations:Array<{kind:EquippedPowerup;x:number;y:number;nextAt:number;sprite:Phaser.Physics.Arcade.Sprite;label:Phaser.GameObjects.Text}>=[];
    let bossDefeated = !level.enemies.some((enemy) => enemy.kind === "boss");
    let activeBossId: BossId | null = null;
    let bossAttackAt = -9999;
    let isLevelClearing = false;

    const syncStats = (extra: Partial<GameStats> = {}) => {
      onStatsUpdateRef.current({
        isDying: (!isXGod || useDrawnXGod) && isRespawning,
        activeBossId,
        score: currentScore,
        souls: currentSouls,
        monstersDefeated: currentKills,
        health: playerHealth,
        lives: playerLives,
        level: currentLevel,
        swordUnlocked,
        hasFlameSword,
        swordDurability,
        maxSwordDurability:3,
        shieldUnlocked,
        inkShieldReady,
        dinioUnlocked,
        hasDinio,
        doghostUnlocked,
        hasDoghost,
        teleportationCUnlocked,
        hasTeleportationC,
        gravityCoreUnlocked,
        gravityCoreCharges,
        selectedCharacterId,
        characterPowerUnlocked,
        equipment:{...equipment,unlocked:[...equipment.unlocked]},
        ...extra
      });
    };

    const config: Phaser.Types.Core.GameConfig = {
      ...mobileGameOptions(),
      audio:{noAudio:true},
      type: params.get("renderer") === "canvas" ? Phaser.CANVAS : Phaser.AUTO,
      render: { preserveDrawingBuffer: params.get("capture") === "1" },
      parent: gameContainerRef.current,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: "#0f172a",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 1280, x: 0 },
          debug: params.get("debugHitboxes") === "1"
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        expandParent: false
      },
      scene: {
        key: "PlatformerScene",
        preload,
        create,
        update
      }
    };

    function preload(this: Phaser.Scene) {
      if (useDrawnXGod) {
        this.load.multiatlas('xgod_double_jump', '/characters/xgod/mobility-v1/double-jump.json', '/characters/xgod/mobility-v1/');
        this.load.multiatlas('xgod_butt_bomb', '/characters/xgod/mobility-v1/butt-bomb.json', '/characters/xgod/mobility-v1/');
      }
      if (isZGod) {
        this.load.multiatlas('zgod_double_jump', '/characters/z-god-v1/mobility-v1/double-jump.json', '/characters/z-god-v1/mobility-v1/');
        this.load.multiatlas('zgod_ground_punch', '/characters/z-god-v1/mobility-v1/ground-punch.json', '/characters/z-god-v1/mobility-v1/');
      }
      if(currentLevel>=3){
        this.load.multiatlas('ember_jets','/powerups/ember-jets-v1/jets.json','/powerups/ember-jets-v1/');
        if(useDrawnXGod)this.load.multiatlas('ember_xgod_dash','/powerups/ember-jets-v1/xgod.json','/powerups/ember-jets-v1/');
      }
      this.load.spritesheet('fire_blade','/powerups/fire-blade-v1/blade.png',{frameWidth:128,frameHeight:224});
      this.load.multiatlas('signature_special', `/characters/signature-specials-v1/${selectedCharacterId}.json`, '/characters/signature-specials-v1/');
      if(selectedCharacterId==='ezra')this.load.multiatlas('signature_pillar','/characters/signature-specials-v1/fx/ezra.json','/characters/signature-specials-v1/fx/');
      this.load.on("loaderror", (file: { key?: string }) => {
        if (file.key) failedAssetKeys.add(file.key);
      });

      if (currentLevel === 1) {
        loadGameImage(this.load, "platform_school_block", "platformer/school-rooftop-block.png");
        loadGameImage(this.load, "school_rooftop_panorama", "platformer/school-rooftop-panorama.png");
        loadGameImage(this.load, "platform_ink_hazard", "platformer/ink-hazard-generated.png");
        loadGameImage(this.load, "rooftop_spring_pad", "platformer/rooftop-spring-pad-generated.png");
      }
      if (currentLevel === 2) {
        loadGameImage(this.load, "platform_graveyard_block", "platformer/graveyard-moss-block.png");
        loadGameImage(this.load, "graveyard_moonlit_panorama", "platformer/graveyard-moonlit-panorama.png");
        loadGameImage(this.load, "platform_fog_hazard", "platformer/fog-hazard-generated.png");
      }
      if (currentLevel === 3) {
        loadGameImage(this.load, "platform_furnace_block", "platformer/furnace-block-generated.png");
        loadGameImage(this.load, "platform_lava_hazard", "platformer/lava-hazard-generated.png");
        loadGameImage(this.load, "rooftop_spring_pad", "platformer/rooftop-spring-pad-generated.png");
      }
      if (currentLevel === 4) {
        loadGameImage(this.load, "platform_witchwood_block", "platformer/graveyard-moss-block.png");
        loadGameImage(this.load, "platform_witchwood_hazard", "platformer/fog-hazard-generated.png");
        loadGameImage(this.load, "witchwood_panorama", "platformer/witchwood-panorama-generated.png");
        loadGameImage(this.load, "witchwood_parallax", "platformer/witchwood-parallax-generated.png");
        loadGameImage(this.load, "rooftop_spring_pad", "platformer/rooftop-spring-pad-generated.png");
      }
      if (currentLevel === FINAL_LEVEL) {
        loadGameImage(this.load, "platform_dread_planet_block", "platformer/dread-planet-block-generated.png");
        loadGameImage(this.load, "void_regent_pencil_panorama", "platformer/void-regent-pencil-panorama-generated.png");
        loadGameImage(this.load, "platform_void_hazard", "platformer/void-hazard-generated.png");
        loadGameImage(this.load, "rooftop_spring_pad", "platformer/rooftop-spring-pad-generated.png");
      }
      if (isXGod && useSideScrollXGodRun) {
        if (useDrawnXGod) {
          const folder='characters/xgod/drawn-v1';
          for (const action of ['idle','run','jump','attack','crouch','skid','blaster-idle','blaster-run','blaster-jump','blaster-attack','blaster-crouch','blaster-skid','sword-idle','sword-jump','sword-crouch','sword-skid']) {
            loadGameSheet(this.load,`runner_${action}`,`${folder}/${action}.png`,{frameWidth:768,frameHeight:512});
          }
          loadGameSheet(this.load,'xgod_side_scroll_fire_sword_run_v1',`${folder}/sword-run.png`,{frameWidth:768,frameHeight:512});
          loadGameSheet(this.load,'xgod_side_scroll_fire_sword_attack_v1',`${folder}/sword-attack.png`,{frameWidth:768,frameHeight:512});
          loadGameSheet(this.load,'runner_damage',`${folder}/damage.png`,{frameWidth:768,frameHeight:512});
          loadGameSheet(this.load,'hero_death',`${folder}/death.png`,{frameWidth:768,frameHeight:512});
          this.load.json('xgod_drawn_meta',`${folder}/metadata.json`);
        } else {
        loadGameImage(this.load, "xgod_damage_pose", "characters/xgod/runner-blaster-v1/damage-pose-v1.png");
        loadGameImage(this.load, "xgod_death_pose", "characters/xgod/runner-blaster-v1/death-pose-v1.png");
        loadGameSheet(this.load, "xgod_side_scroll_fire_sword_run_v1", "xgod_side_scroll_fire_sword_run_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_fire_sword_attack_v1", "xgod_side_scroll_fire_sword_attack_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        ["idle", "run", "jump", "attack", "crouch", "sword-idle", "sword-run", "sword-jump", "sword-attack", "sword-crouch"].forEach((action) => {
          const revisedPose = ["sword-idle", "sword-jump", "sword-crouch"].includes(action);
          const spriteSet = action === "sword-jump" ? "jump-v3" : action === "sword-idle" ? "sword-idle-v3" : revisedPose ? "motion-v2" : action.startsWith("sword-") ? "runner-sword-v1" : "runner-v4";
          loadGameSheet(this.load, `runner_${action}`, `characters/xgod/${spriteSet}/${action}.png`, { frameWidth: 512, frameHeight: 512, endFrame: action === "sword-jump" ? 7 : action.endsWith("jump") || revisedPose && action.endsWith("crouch") ? 5 : action.endsWith("crouch") || action.endsWith("idle") ? 3 : 7 });
        });
        ["idle", "run", "jump", "attack", "crouch"].forEach((action) => {
          loadGameSheet(this.load, `runner_blaster-${action}`, `characters/xgod/${action === "run" ? "blaster-run-v3" : action === "jump" ? "jump-v3" : "motion-v2"}/blaster-${action}.png`, { frameWidth: 512, frameHeight: 512, endFrame: action === "run" ? 15 : action === "crouch" ? 5 : action === "idle" ? 3 : 7 });
        });
        this.load.json("xgod_motion_v2_meta", "characters/xgod/motion-v2/metadata.json");
        this.load.json("xgod_jump_v3_meta", "characters/xgod/jump-v3/metadata.json");
        this.load.json("xgod_blaster_run_v3_meta", "characters/xgod/blaster-run-v3/metadata.json");
        }
      }
      loadGameImage(this.load, "checkpoint_flag", "platformer/checkpoint-flag-generated.png");
      loadGameImage(this.load, "end_gate", "platformer/end-gate-generated.png");
      loadGameImage(this.load, "gold_pickup", "gold_pickup.png");
      loadGameImage(this.load, "heart", "heart_sprite.png");
      loadGameImage(this.load, "power_pickup", isZGod ? 'characters/z-god-v1/reward.png' : isXGod ? "xgod_sword_reward_fit.png" : `characters/${selectedCharacterId}/reward.png`);
      loadGameImage(this.load, "shield_pickup", "ink_shield_power.png");
      loadGameImage(this.load, "gravity_pickup", "doodles/gravity_core.png");
      (['blaster','sword','frost','ember','storm'] as EquippedPowerup[]).forEach(id=>loadGameImage(this.load, `equipment_${id}`,POWERUPS[id].icon));
      loadGameImage(this.load, "dinio_pickup", "doodles/dinio_orb.png");
      loadGameImage(this.load, "dinio_shot", "doodles/dinio_shot.png");
      loadGameSheet(this.load, "dinio_walk", "companions/dinio/hybrid-v1/walk.png", { frameWidth: 320, frameHeight: 320 });
      loadGameSheet(this.load, "dinio_attack", "companions/dinio/hybrid-v1/attack.png", { frameWidth: 448, frameHeight: 320 });
      loadGameImage(this.load, "doghost_pickup", "doodles/doghost_orb.png");
      loadGameSheet(this.load, "doghost_walk", "doghost_walk.png", { frameWidth: 240, frameHeight: 180 });
      loadGameImage(this.load, "teleportation_c_pickup", "doodles/teleportation_c_orb.png");
      loadGameSheet(this.load, "teleportation_c_walk", "characters/teleportation_c/walk.png", { frameWidth:256,frameHeight:360 });
      loadGameSheet(this.load, 'teleportation_c_dash','characters/teleportation_c/dash.png',{frameWidth:256,frameHeight:360});
      loadGameSheet(this.load, 'teleportation_c_attack','characters/teleportation_c/attack.png',{frameWidth:480,frameHeight:360});
      loadGameImage(this.load, "shadow", "doodles/shadow_oval.png");
      loadGameImage(this.load, "enemy_hit_impact", "doodles/impact-vfx-generated.png");
      loadGameImage(this.load, "boss_tell_ring", "doodles/tell-ring-generated.png");
      loadGameImage(this.load, "projectile_static", isZGod || isXGod ? "doodles/attack_slash.png" : `characters/${selectedCharacterId}/projectile.png`);
      loadGameImage(this.load, "boss_fire_orb", "bosses/boss_fire_orb_v2.png");
      loadGameImage(this.load, "boss_ink_orb", "bosses/boss_ink_orb_v2.png");
      loadGameImage(this.load, "boss_bullet", "bosses/boss_bullet_v2.png");
      Object.values(BOSS_DEFINITIONS).forEach((boss) => {
        if (!level.enemies.some(enemy => enemy.bossId && BOSS_DEFINITIONS[enemy.bossId] === boss)) return;
        loadGameSheet(this.load, boss.textureKey, boss.assetPath, {
          frameWidth: boss.frameWidth,
          frameHeight: boss.frameHeight
        });
      });
      level.enemies.filter(enemy => enemy.bossId).forEach(enemy => {
        const bossId = enemy.bossId as BossId;
        const visual = BOSS_ATTACK_VISUALS[bossId];
        this.load.multiatlas(bossDeathTexture(bossId), `/bosses/deaths-v1/${bossId}.json`, '/bosses/deaths-v1/');
        loadGameSheet(this.load, `boss_attack_${bossId}`, visual.path, {
          frameWidth: visual.frameWidth,
          frameHeight: visual.frameHeight
        });
      });

      level.backgrounds.forEach((backgroundKey) => {
        if (currentLevel <= 2) return;
        if (currentLevel === 4 || currentLevel === FINAL_LEVEL && backgroundKey === "void_regent_pencil_panorama") return;
        const path = backgroundKey.startsWith("space_") ? `doodles/${backgroundKey}.png` : `${backgroundKey}.png`;
        loadGameImage(this.load, backgroundKey, path);
      });

      if (isZGod) {
        this.load.json('hero_equipment_meta', 'characters/z-god-v1/metadata.json');
        for (const power of ['blaster','sword','frost','ember','storm']) for (const action of ['run','jump','idle','attack','crouch']) {
          loadGameSheet(this.load, `hero_${power}_${action}`, `characters/z-god-v1/${power}-${action}.png`, {frameWidth:768,frameHeight:512});
        }
        for (const [key, action] of [['character_walk','run'],['character_jump','jump'],['character_attack','attack']]) {
          loadGameSheet(this.load, key, `characters/z-god-v1/hands-${action}.png`, {frameWidth:768,frameHeight:512});
        }
        loadGameImage(this.load, 'character_idle', 'characters/z-god-v1/idle.png');
        for (const action of ['idle','crouch','dash','react','victory']) {
          loadGameSheet(this.load, `z_${action}`, `characters/z-god-v1/extras-${action}.png`, {frameWidth:768,frameHeight:512});
        }
      } else if (!isXGod) {
        this.load.json('hero_equipment_meta','characters/equipment-v4/metadata.json');
        for(const power of ['blaster','sword','frost','ember','storm'])for(const action of ['run','jump','idle','attack']){
          loadGameSheet(this.load, `hero_${power}_${action}`,`characters/equipment-v4/${selectedCharacterId}-${power}-${action}.png`,{frameWidth:768,frameHeight:512});
        }
        loadGameSheet(this.load, 'hero_death','characters/equipment-v4/'+selectedCharacterId+'-death-collapse.png',{frameWidth:768,frameHeight:512});
        const legacyTeleport=selectedCharacterId==='teleportation_c';
        const unarmedNico=selectedCharacterId==='nico';
        loadGameSheet(this.load, "character_walk", legacyTeleport ? `characters/${selectedCharacterId}/walk.png` : unarmedNico ? 'characters/equipment-v4/nico-hands-run.png' : `characters/playable-v3/${selectedCharacterId}-run.png`, {
          frameWidth: legacyTeleport ? CHARACTER_WALK_FRAME_WIDTH : unarmedNico ? 768 : 640,
          frameHeight: legacyTeleport ? CHARACTER_WALK_FRAME_HEIGHT : 512
        });
        loadGameSheet(this.load, "character_attack", legacyTeleport ? `characters/${selectedCharacterId}/attack.png` : unarmedNico ? 'characters/equipment-v4/nico-hands-attack.png' : `characters/playable-v3/${selectedCharacterId}-attack.png`, {
          frameWidth: legacyTeleport ? CHARACTER_ATTACK_FRAME_WIDTH : unarmedNico ? 768 : 640,
          frameHeight: legacyTeleport ? CHARACTER_ATTACK_FRAME_HEIGHT : 512
        });
        loadGameSheet(this.load, "character_jump", unarmedNico ? 'characters/equipment-v4/nico-hands-jump.png' : `characters/playable-v3/${selectedCharacterId}-jump.png`, {frameWidth:unarmedNico?768:640,frameHeight:512});
        loadGameImage(this.load, "character_idle", unarmedNico ? 'characters/equipment-v4/nico-hands-idle.png' : `characters/playable-v3/${selectedCharacterId}-idle.png`);
        if(legacyTeleport)loadGameImage(this.load, 'character_land','characters/playable-v3/teleportation_c-land.png');
        loadGameImage(this.load, "character_dash", `characters/${selectedCharacterId}/dash.png`);
      } else if (playerSprite) {
        loadGameSheet(this.load, "player_walk", playerSprite, { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
      } else if (!useSideScrollXGodRun) {
        loadGameSheet(this.load, "player_walk_internal", "player_walk.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
        loadGameSheet(this.load, "xgod_platformer_run", "xgod_platformer_run.png", { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
        loadGameSheet(this.load, "xgod_side_scroll_run_v1", "xgod_side_scroll_run_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_sprint_run_v1", "xgod_side_scroll_sprint_run_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_jump_v1", "xgod_side_scroll_jump_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_attack_v2", "xgod_side_scroll_attack_v2.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_fire_sword_run_v1", "xgod_side_scroll_fire_sword_run_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameSheet(this.load, "xgod_side_scroll_fire_sword_attack_v1", "xgod_side_scroll_fire_sword_attack_v1.png", {
          frameWidth: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE,
          frameHeight: XGOD_SIDE_SCROLL_RUN_FRAME_SIZE
        });
        loadGameImage(this.load, "player_jump", "player_jump.png");
        loadGameImage(this.load, "player_attack", "player_attack.png");
        loadGameImage(this.load, "player_dash", "player_dash.png");
        loadGameSheet(this.load, "player_sword_walk", "player_sword_walk.png", { frameWidth: 232, frameHeight: 327 });
        loadGameSheet(this.load, "xgod_platformer_sword_run", "xgod_platformer_sword_run.png", { frameWidth: XGOD_SWORD_RUN_FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
        loadGameSheet(this.load, "player_sword_attack", "player_sword_attack.png", { frameWidth: 350, frameHeight: 332 });
      }

      loadGameSheet(this.load, "grunt_walking", "grunt_walking_ai.png", {
        frameWidth: GRUNT_WALK_FRAME_WIDTH,
        frameHeight: GRUNT_WALK_FRAME_HEIGHT
      });
      loadGameSheet(this.load, "m_alien_walk", "doodles/m_alien_walk_ai.png", {
        frameWidth: SMALL_ENEMY_FRAME_WIDTH,
        frameHeight: SMALL_ENEMY_FRAME_HEIGHT
      });
      loadGameSheet(this.load, "m_dasher_walk", "doodles/m_dasher_walk_ai.png", {
        frameWidth: SMALL_ENEMY_FRAME_WIDTH,
        frameHeight: SMALL_ENEMY_FRAME_HEIGHT
      });
      loadGameSheet(this.load, "m_giant_walk", "doodles/m_giant_walk_ai.png", {
        frameWidth: GIANT_ENEMY_FRAME_WIDTH,
        frameHeight: GIANT_ENEMY_FRAME_HEIGHT
      });
      for (const [kind, def] of Object.entries(RESTORED_ENEMIES)) {
        if (!level.enemies.some(enemy => enemy.kind === kind)) continue;
        loadGameSheet(this.load, `restored_${kind}_walk`, `enemies/restored-v1/${kind}-walk.png`, {frameWidth:512,frameHeight:512});
        if (def.attackFrames) loadGameSheet(this.load, `restored_${kind}_attack`, `enemies/restored-v1/${kind}-attack.png`, {frameWidth:512,frameHeight:512});
      }
    }

    function create(this: Phaser.Scene) {
      const scene = this;
      scene.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
      scene.cameras.main.setBounds(0, 0, worldWidth, SCREEN_HEIGHT);
      scene.cameras.main.setDeadzone(230, 120);

      makeBackground(scene);
      makeCinderShockwaveTexture(scene);
      makeAnimations(scene);

      platforms = scene.physics.add.staticGroup();
      hazards = scene.physics.add.staticGroup();
      enemies = scene.physics.add.group({ allowGravity: true });
      pickups = scene.physics.add.group({ allowGravity: false });
      projectiles = scene.physics.add.group({ allowGravity: false });
      fireBlades = new FireBlades(scene,projectiles);
      const shotArtwork = scene.add.graphics();
      shotArtwork.fillStyle(0x1c1824).fillEllipse(2, 2, 32, 17);
      shotArtwork.fillStyle(0xf4f0b3).fillEllipse(5, 4, 25, 12);
      shotArtwork.fillStyle(0xc9f98f).fillEllipse(11, 6, 16, 7);
      shotArtwork.lineStyle(2, 0xffffff, 0.9).lineBetween(15, 5, 27, 5);
      shotArtwork.generateTexture("player_ink_shot", 36, 22);
      shotArtwork.destroy();
      checkpoints = scene.physics.add.staticGroup();

      level.platforms.forEach((rect) => addPlatform(scene, rect));
      level.hazards.forEach((rect) => addHazard(scene, rect));
      level.checkpoints.forEach((point, index) => addCheckpoint(scene, point.x, point.y, index));
      level.pickups.filter((pickup) => {
        if (pickup.requiresBossDefeat) return false;
        if (pickup.kind === "dinio") return !dinioUnlocked;
        if (pickup.kind === "doghost") return !doghostUnlocked;
        if (pickup.kind === "teleportation_c") return !teleportationCUnlocked;
        return true;
      }).forEach((pickup) => addPickup(scene, pickup));
      routePowers.forEach(plan=>addPowerStation(scene,plan));
      level.enemies.forEach((enemy) => addEnemy(scene, enemy));
      if (level.enemies.some(enemy => enemy.kind === "boss")) {
        bossAttackWarning = scene.add.graphics().setDepth(14);
        bossGuardVisual = scene.add.graphics().setDepth(17);
      }
      level.springPads?.forEach((plan) => addSpringPad(scene, plan));
      if (currentLevel === 4) scene.add.text(2150, 305, "JUMP ONTO THE RUINS", {
        fontFamily: "Gochi Hand, sans-serif", fontSize: "20px", color: "#f8d7f0", stroke: "#342537", strokeThickness: 4
      }).setDepth(7);
      const firstBounceTarget = level.enemies.find(enemy => enemy.bounceLane);
      if (firstBounceTarget) {
        stompHint = scene.add.text(firstBounceTarget.x - 210, 288, "HOLD JUMP TO BOUNCE HIGH", {
          fontFamily: "Gochi Hand, sans-serif", fontSize: "22px", color: "#d8f5af", stroke: "#263020", strokeThickness: 4
        }).setOrigin(0.5).setDepth(7);
      }
      if (level.rooftopRush) {
        makeRooftopStarTexture(scene);
        addRooftopRushStars(scene);
        rushHud = scene.add.text(SCREEN_WIDTH - 24, 110, "", {
          fontFamily: "Gochi Hand, sans-serif", fontSize: "23px", color: "#f4dcff",
          stroke: "#271d36", strokeThickness: 5
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(83).setVisible(false);
      }

      const playerKey = getPlayerWalkTexture(scene);
      player = scene.physics.add.sprite(checkpoint.x, checkpoint.y, playerKey, 0);
      player.setDepth(20).setCollideWorldBounds(false).setDragX(0).setMaxVelocity(520, 900);
      const playerScale = isXGod
        ? (useSideScrollXGodRun ? 0.3 : 0.36)
        : 0.34;
      player.setScale(playerScale * PLAYER_VISUAL_SCALE_MULTIPLIER);
      player.body.setSize(isXGod ? 58 : 70, isXGod ? 126 : 132, true);
      if(!isXGod){
        const baseline=selectedCharacterId==='teleportation_c'?344:480;
        player.setOrigin(.5,baseline/player.height);
        player.body.setSize(heroBodyWidth,heroBodyHeight,false).setOffset((player.width-heroBodyWidth)/2,baseline-heroBodyHeight);
      }
      if (isXGod && useSideScrollXGodRun) {
        player.setOrigin(0.5, 480 / 512).setScale(0.4);
        player.body.setSize(96, 270, false).setOffset((player.width-96)/2, 210);
      }
      placePlayerOnPlatform(checkpoint.x, getPlatformStandY(checkpoint.x) ?? checkpoint.y);
      if (isXGod && useSideScrollXGodRun) player.setTexture(playerPosePrefix()+'idle', 0);
      powerAura=scene.add.graphics().setDepth(23);
      if(currentLevel>=3)emberJets=new EmberJets(scene,player,useDrawnXGod);
      powerHud=scene.add.text(SCREEN_WIDTH-22,72,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'18px',align:'right',color:'#fff4d6',stroke:'#19182e',strokeThickness:4})
        .setOrigin(1,0).setScrollFactor(0).setDepth(82);
      if(selectedCharacterId==='teleportation_c')teleportHud=scene.add.text(SCREEN_WIDTH-22,122,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'17px',color:'#cfb6ff',stroke:'#19182e',strokeThickness:4})
        .setOrigin(1,0).setScrollFactor(0).setDepth(82);
      checkpoint = { x: checkpoint.x, y: player.y };
      if (hasDinio) spawnDinioCompanion(scene);
      if (hasDoghost) spawnDoghostCompanion(scene);
      if (hasTeleportationC) spawnTeleportationCCompanion(scene);
      lastGroundedAt = scene.time.now;
      level.movingPlatforms?.forEach(plan => addMovingPlatform(scene, plan));
      level.crumblingPlatforms?.forEach(plan=>addCrumblingPlatform(scene,plan));
      level.timedVents?.forEach(plan=>addTimedVent(scene,plan));
      scene.cameras.main.startFollow(player, true, 0.12, 0.12, 0, 45);

      endGate = scene.physics.add.staticSprite(level.endX, 410, "end_gate");
      endGate.setDepth(10);
      endGate.setDisplaySize(100, 172).refreshBody();
      endGate.body.setSize(76, 150).setOffset(12, 12);
      if (!bossDefeated) {
        bossTellMarker = scene.add.image(0, 0, "boss_tell_ring").setDepth(11).setAlpha(0.72).setVisible(false);
        bossVulnerabilityCue = new BossVulnerabilityCue(scene);
        if (currentLevel === 1 || currentLevel >= 4) bossTellMarker.setDisplaySize(150, 150);
        else bossTellMarker.setScale(0.75);
        bossBarrier = scene.add.rectangle(level.endX - 150, 320, 28, 480, 0x7c3aed, 0.3).setDepth(14);
        scene.physics.add.existing(bossBarrier, true);
        scene.physics.add.collider(player, bossBarrier);
        bossHudFrame = scene.add.rectangle(SCREEN_WIDTH / 2, 148, 420, 24, 0x111827, 0.82)
          .setStrokeStyle(3, 0xfef3c7)
          .setScrollFactor(0)
          .setDepth(84)
          .setVisible(false);
        bossHudFill = scene.add.rectangle(SCREEN_WIDTH / 2 - 202, 148, 404, 14, 0xef4444, 1)
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
          .setDepth(85)
          .setVisible(false);
        bossHudText = scene.add.text(SCREEN_WIDTH / 2, 120, "GUARDIAN", {
          fontFamily: "Gochi Hand, sans-serif",
          fontSize: "22px",
          color: "#fda4af",
          stroke: "#111827",
          strokeThickness: 5
        }).setOrigin(0.5).setScrollFactor(0).setDepth(85);
        bossHudText.setVisible(false);
      }

      cursors = scene.input.keyboard!.createCursorKeys();
      attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      shootKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      jumpAltKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      dashKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      recallKey=scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      crouchKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);

      scene.physics.add.collider(player, platforms, undefined, (_, platform) => {
        const platformBody = (platform as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
        const body = player.body as Phaser.Physics.Arcade.Body;
        return !(platform as Phaser.GameObjects.Rectangle).getData("oneWay") || (body.velocity.y >= 0 && body.prev.y + body.height <= platformBody.top + 8);
      });
      scene.physics.add.collider(enemies, platforms, undefined, (enemy, platform) => {
        const kind = (enemy as Phaser.Physics.Arcade.Sprite).getData("kind");
        if(kind==='ghost')return false;
        if(!(platform as Phaser.GameObjects.Rectangle).getData('oneWay'))return true;
        if(kind==='boss')return false;
        const body=(enemy as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
        const surface=(platform as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
        return body.velocity.y>=0&&body.prev.y+body.height<=surface.top+8;
      });
      scene.physics.add.collider(projectiles, platforms, (projectile) => projectile.destroy(), (_, platform) =>
        !(platform as Phaser.GameObjects.Rectangle).getData("oneWay"));
      scene.physics.add.overlap(player, hazards, () => damagePlayer(scene, 12, false));
      scene.physics.add.overlap(player, enemies, (_, enemyObj) => handlePlayerEnemyOverlap(scene, enemyObj as Phaser.Physics.Arcade.Sprite));
      scene.physics.add.overlap(player, pickups, (_, pickupObj) => collectPickup(scene, pickupObj as Phaser.Physics.Arcade.Sprite));
      scene.physics.add.overlap(player, checkpoints, (_, checkpointObj) => activateCheckpoint(checkpointObj as Phaser.Physics.Arcade.Sprite));
      scene.physics.add.overlap(player, endGate, () => clearLevel(scene));
      scene.physics.add.overlap(projectiles, enemies, (projectileObj, enemyObj) => {
        const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;
        if(!projectile.active)return;
        if (projectile.getData("enemyProjectile")) return;
        if(projectile.getData('fireBlade')){
          fireBlades?.hit(projectile,enemyObj as Phaser.Physics.Arcade.Sprite,(enemy,amount)=>damageEnemy(scene,enemy,amount,true));
          return;
        }
        const damage = Number(projectile.getData("damage")) || (selectedCharacterId === "nico" ? 3 : 2);
        const isPlayerShot = Boolean(projectile.getData("playerShotExpiresAt"));
        const frost=Boolean(projectile.getData('frostShot'));
        projectileObj.destroy();
        const enemy=enemyObj as Phaser.Physics.Arcade.Sprite;
        if(damageEnemy(scene,enemy,damage,isPlayerShot)&&frost&&enemy.active&&enemy.getData('kind')!=='boss'){
          clearEnemyIntent(enemy);enemy.setData('attackState','patrol').setData('nextAttackAt',scene.time.now+1400);
          enemy.setData('frozenUntil',scene.time.now+900);enemy.setVelocityX(0);enemy.setTint(0x8ce5fa);
          powerHits++;
        }
      });
      scene.physics.add.overlap(player, projectiles, (_, projectileObj) => {
        const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;
        if (!projectile.getData("enemyProjectile")) return;
        const damage = Number(projectile.getData("damage"));
        projectile.destroy();
        damagePlayer(scene, Number.isFinite(damage) && damage > 0 ? damage : 10, false);
      });

      if (debugCheckpoint && level.checkpoints[0]) {
        checkpointIndex = 0;
        checkpoint = { x: level.checkpoints[0].x, y: getPlatformStandY(level.checkpoints[0].x) ?? level.checkpoints[0].y - 30 };
        placePlayerOnPlatform(checkpoint.x, checkpoint.y);
        checkpoint = { x: checkpoint.x, y: player.y };
      }
      if (debugFinish) {
        placePlayerOnPlatform(level.endX - 180, 430);
      }
      if (debugStompCourse) {
        placePlayerOnPlatform(3078, 400);
        checkpoint = { x: 3078, y: 400 };
        checkpointIndex = level.checkpoints.filter(point => point.x < 3078).length - 1;
        scene.cameras.main.centerOn(player.x, SCREEN_HEIGHT / 2);
      }
      if(params.get('obstacleCourse')==='1'&&level.obstacleStart){
        const prior=level.checkpoints.filter(point=>point.x<level.obstacleStart!);
        checkpointIndex=prior.length-1;
        const point=prior[prior.length-1]??level.spawn;
        checkpoint={x:point.x,y:getPlatformStandY(point.x)??point.y};
        placePlayerOnPlatform(level.obstacleStart,getPlatformStandY(level.obstacleStart)??520);
        scene.cameras.main.centerOn(player.x,SCREEN_HEIGHT/2);
      }
      if (params.get('enemyPreview')) {
        const kind=params.get('enemyPreview')!;
        const target=enemies.getChildren().find(child=>child.getData('kind')===kind) as Phaser.Physics.Arcade.Sprite | undefined;
        if(target){
          const x=Math.max(80,Number(target.getData('left'))-180);
          placePlayerOnPlatform(x,getPlatformStandY(x)??480);
          scene.cameras.main.centerOn(player.x,SCREEN_HEIGHT/2);
        }
      }
      if(params.get('powerupPreview')==='1'&&routePowers[0]){
        const p=routePowers[0];placePlayerOnPlatform(p.x-140,p.y+62);
        scene.cameras.main.centerOn(player.x,SCREEN_HEIGHT/2);
      }

      window.__unknownPlatformerForceFall = () => {
        if (!player?.active) return;
        player.setPosition(player.x, WORLD_HEIGHT + 120);
        player.body.setVelocity(0, 900);
      };
      window.__unknownPlatformerDamagePlayer = (damage = 10) => {
        if (!player?.active) return;
        damagePlayer(scene, damage, false);
      };
      window.__unknownPlatformerSetPlayerPosition = (x: number, y?: number) => {
        if (!player?.active) return;
        placePlayerOnPlatform(x, y ?? getPlatformStandY(x) ?? player.y);
        if(!bossArenaCameraLocked)scene.cameras.main.centerOn(player.x,SCREEN_HEIGHT/2);
      };
      window.__unknownPlatformerCollectPickup = (kind?: string) => {
        if (!pickups) return;
        const target = pickups.getChildren()
          .map((child) => child as Phaser.Physics.Arcade.Sprite)
          .find((pickup) => pickup.active && (!kind || pickup.getData("kind") === kind));
        if (target) collectPickup(scene, target);
      };

      signature = new SignatureSpecialRuntime(scene, selectedCharacterId, {
        player, enemies, projectiles,
        facing: () => facingDirection,
        grounded: () => isPlayerGrounded(player.body as Phaser.Physics.Arcade.Body),
        canUse: () => !isRespawning && !isLevelClearing && !isCrouching && !mobility?.busy && scene.time.now>=emberUntil,
        clearLine: enemy => !platformSeparatesPlayerAndEnemy(enemy),
        damage: (enemy, amount) => damageEnemy(scene, enemy, amount),
        lockMovement: until => { movementLockedUntil = Math.max(movementLockedUntil, until); },
        launch: (vx, vy) => {
          player.setVelocity(vx, vy);springJumpUntil=scene.time.now+450;
          jumpBufferedAt=lastGroundedAt=-9999;airLaunchKind='spring';
        },
        landing: signatureLanding,
        relocate: to => {
          const body=player.body as Phaser.Physics.Arcade.Body;
          const from={x:player.x,y:body.bottom};
          if(selectedCharacterId==='teleportation_c')startTeleport(teleport,scene.time.now,from,to,false);
          placePlayerOnPlatform(to.x,to.y);facingDirection=to.facing;
          body.setVelocity(0,0);portalBurst(scene,to.x,to.y);
        },
        floor: x => {
          const y=getPlatformStandY(x),body=player.body as Phaser.Physics.Arcade.Body;
          if(y===null)return null;
          const space=teleportSpace(),from={x:player.x,y:body.bottom};
          return safeTeleportPoint(x,y,space,true)&&teleportPathClear(from,{x,y},space)?y:null;
        },
      });
      if (useDrawnXGod || isZGod) mobility = new AirborneMoves(scene, {
        player, enemies, projectiles, facing: () => facingDirection,
        canUse: () => !isRespawning && !isLevelClearing && !signature?.casting
          && scene.time.now >= emberUntil && scene.time.now >= movementLockedUntil,
        clearLine: enemy => !platformSeparatesPlayerAndEnemy(enemy),
        damage: (enemy, amount) => damageEnemy(scene, enemy, amount, false, true),
      }, isZGod ? 'zgod' : 'xgod');
      if(params.get('capture')==='1'||params.get('devTools')==='1')window.__unknownPlatformerSpecialTest=(options={})=>{
        enemies.getChildren().slice().forEach(child=>child.destroy());
        projectiles.getChildren().slice().forEach(child=>child.destroy());
        for(const offset of options.offsets??[180]){
          const x=player.x+offset;
          addEnemy(scene,{kind:options.boss?'boss':'walker',bossId:options.boss?'dark_dragon':undefined,
            x,y:getPlatformStandY(x)??480,left:x-40,right:x+40});
          const enemy=enemies.getChildren().at(-1) as Phaser.Physics.Arcade.Sprite;
          enemy.setData('hp',options.hp??20).setData('maxHp',options.hp??20).setData('hurtUntil',scene.time.now+5000);
          if(options.boss)enemy.setData('engaged',true);
          if(options.boss)enemy.setData('attackState',options.guarded?'tell':'recover').setData('moveState','recover')
            .setData('recoverUntil',scene.time.now+5000).setData('phaseState','recover');
        }
        if(options.projectile){
          const shot=projectiles.create(player.x+155,player.y-60,'boss_fire_orb') as Phaser.Physics.Arcade.Sprite;
          shot.setDisplaySize(22,22).setData('enemyProjectile',true).setData('damage',10);
          (shot.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setVelocity(0,0);
        }
      };

      levelTitle = scene.add.text(28, 72, `${level.chapter}: ${level.title}`, {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "28px",
        color: "#fff7ed",
        stroke: "#0f172a",
        strokeThickness: 6
      }).setScrollFactor(0).setDepth(80).setAlpha(0.82);

      window.render_game_to_text = renderGameToText;
      window.advanceTime = async (ms: number) => {
        await new Promise((resolve) => window.setTimeout(resolve, ms));
      };
      syncStats();
      // The scene may finish loading after the initial pause effect ran.
      if (isPausedRef.current) scene.scene.pause();
    }

    function update(this: Phaser.Scene, _time: number, delta: number) {
      const scene = this;
      if (!player || !player.active || isLevelClearing || isRespawning) { signature?.cancel(false); mobility?.cancel(); emberJets?.hide(); fireBlades?.clear(); bossVulnerabilityCue?.hide(); return; }

      const now = scene.time.now;
      // Phaser Clock.now follows wall time; Arcade integrates smoothed delta.
      // Keep thrust/cooldown on simulation time, including after Pause resumes.
      if(equipment.active==='ember'&&emberClockAt>=0){
        const gap=now-emberClockAt-delta;
        lastAttackAt+=gap;lastPowerAt+=gap;emberClockAt=now;
      }
      if(emberRemaining>0){
        const wasUntil=emberUntil;
        emberRemaining=Math.max(0,emberRemaining-delta);emberUntil=now+emberRemaining;
        if(movementLockedUntil===wasUntil)movementLockedUntil=emberUntil;
      }
      updateMovingPlatforms(delta);
      updateGroundObstacles(scene,delta);
      latestSceneTime = now;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const touch = window.__unknownUniverseTouchControls ?? {};
      const grounded = isPlayerGrounded(body);
      mobility?.update(grounded);
      if (grounded && body.velocity.y >= 0 && now - lastStompAt > 120) {
        stompChain = 0;
        airLaunchKind = null;
      }
      // Keep the old jump height while making the return to the ground quicker.
      body.setGravityY(!grounded && body.velocity.y >= 0 ? 620 : 220);
      let jumpedThisFrame = false;
      if (grounded) lastGroundedAt = now;
      const jumpHeld = jumpKey.isDown || jumpAltKey.isDown || Boolean(touch.jump || touch.up);
      const queuedJump = performance.now()-jumpQueuedAt < 200;
      jumpQueuedAt = -9999;
      if (queuedJump || jumpHeld && !jumpWasHeld) {
        jumpBufferedAt = now;
      }
      const jumpCutSpeed = airLaunchKind === "stomp" ? 380 : 300;
      if (!jumpHeld && jumpWasHeld && body.velocity.y < -jumpCutSpeed && now >= springJumpUntil) body.setVelocityY(-jumpCutSpeed);
      jumpWasHeld = jumpHeld;
      const downHeld = cursors.down.isDown || crouchKey.isDown || Boolean(touch.down);
      const downPressed = performance.now()-downQueuedAt < 200 || downHeld && !downWasHeld;
      downQueuedAt = -9999; downWasHeld = downHeld;
      if (!grounded && downPressed && canStandUp() && mobility?.startBomb()) {
        setCrouching(false, now);
        jumpBufferedAt = lastGroundedAt = -9999;
        attackVisualUntil = shotRecoilUntil = -9999;
        airLaunchKind = isZGod ? 'ground-punch' : 'butt-bomb';
      }
      const wantsCrouch = !signature?.casting && !mobility?.busy && now>=emberUntil && grounded && downHeld;
      setCrouching(wantsCrouch, now);

      const moveLeft = !isAutoRun && (cursors.left.isDown || Boolean(touch.left));
      const moveRight = !isAutoRun && (cursors.right.isDown || Boolean(touch.right));
      // Auto-turn inside boss yards: a missed attack must never strand a mobile runner at the gate.
      if (isAutoRun && !bossDefeated && player.x > level.endX - 220) autoRunDirection = -1;
      if (bossDefeated || player.x < level.endX - 1080) autoRunDirection = 1;
      const targetVelocity = isAutoRun ? playFeel.runSpeed * autoRunDirection : isCrouching ? 0 : moveLeft ? -playFeel.runSpeed : moveRight ? playFeel.runSpeed : 0;
      if (isAutoRun) facingDirection = autoRunDirection;
      if (moveRight) facingDirection = 1;
      if (moveLeft) facingDirection = -1;
      if(now<emberUntil)facingDirection=emberDirection;
      const requestedDirection = Math.sign(targetVelocity);
      const currentDirection = Math.sign(body.velocity.x);
      if (!isAutoRun && grounded && requestedDirection !== 0 && currentDirection !== 0
        && requestedDirection !== currentDirection && Math.abs(body.velocity.x) > playFeel.runSpeed * 0.42
        && skidTurnDirection !== requestedDirection) {
        skidTurnDirection = requestedDirection;
        skidMomentumDirection = currentDirection;
        skidUntil = now + TURN_SKID_DURATION_MS;
        turnSkidCount += 1;
        lastTurnSkidStartSpeed = Math.round(Math.abs(body.velocity.x));
        showTurnSkidDust(scene, skidMomentumDirection);
      }
      if (requestedDirection === 0 || requestedDirection === currentDirection) skidTurnDirection = 0;
      isSkidding = grounded && now < skidUntil
        && (requestedDirection === 0 || requestedDirection === -skidMomentumDirection)
        && Math.sign(body.velocity.x) === skidMomentumDirection;
      const movementRate = !grounded
        ? targetVelocity === 0 ? playFeel.airBraking : playFeel.airAcceleration
        : targetVelocity === 0
          ? playFeel.braking
          : body.velocity.x * targetVelocity < 0
            ? playFeel.turnAcceleration
            : playFeel.acceleration;
      const nextVelocityX = isSkidding
        ? skidMomentumDirection * Math.max(0, Math.abs(body.velocity.x) - TURN_SKID_DECELERATION * delta / 1000)
        : Phaser.Math.Clamp(
          targetVelocity,
          body.velocity.x - movementRate * delta / 1000,
          body.velocity.x + movementRate * delta / 1000
        );
      if (now >= movementLockedUntil && !mobility?.busy) body.setVelocityX(Math.abs(nextVelocityX) < 1 ? 0 : nextVelocityX);

      if (!signature?.casting && !mobility?.busy && now - jumpBufferedAt < 140 && now - lastGroundedAt < 130 && (!isCrouching || canStandUp())) {
        setCrouching(false, now);
        body.setVelocityY(-playFeel.jumpVelocity);
        body.blocked.down = body.touching.down = false;
        playSfx('jump');
        airLaunchKind = "jump";
        jumpBufferedAt = -9999;
        lastGroundedAt = -9999;
        jumpedThisFrame = true;
      } else if (!grounded && !signature?.casting && !mobility?.busy && now-jumpBufferedAt < 140
        && canStandUp() && mobility?.doubleJump(playFeel.jumpVelocity*.94)) {
        setCrouching(false, now);
        airLaunchKind = 'double-jump';
        jumpBufferedAt = lastGroundedAt = -9999;
        springJumpUntil = now+180;
        jumpedThisFrame = true;
      }
      // Inputs during a committed ground pound cannot become a jump on recovery.
      if (mobility?.busy) jumpBufferedAt = -9999;
      const blinkInput=dashKey.isDown||Boolean(touch.dash),recallInput=recallKey.isDown||Boolean(touch.recall);
      const blinkPressed=Phaser.Input.Keyboard.JustDown(dashKey),recallPressed=Phaser.Input.Keyboard.JustDown(recallKey);
      const queuedBlink=performance.now()-blinkQueuedAt<160,queuedRecall=performance.now()-recallQueuedAt<160;
      blinkQueuedAt=recallQueuedAt=-9999;
      if(selectedCharacterId==='teleportation_c'&&now>=emberUntil&&!signature?.casting){
        if(queuedRecall||recallPressed||recallInput&&!recallHeld)tryTeleport(scene,true,grounded);
      }
      const queuedSpecial=performance.now()-specialQueuedAt<250;
      specialQueuedAt=-9999;
      if(queuedSpecial||queuedBlink||blinkPressed||blinkInput&&!blinkHeld)signature?.trigger();
      signature?.update();
      blinkHeld=blinkInput;recallHeld=recallInput;
      if(teleport.anchor&&now>=teleport.anchor.expires)teleport.anchor=null;
      if(teleportHud)teleportHud.setText(teleport.anchor?'R: RETURN TO PORTAL':'X / SP: RIFT AMBUSH');

      const blasterEquipped = equipment.active==='blaster'||equipment.active==='frost';
      const shootHeld = shootKey.isDown || Boolean(touch.shoot)
        || (blasterEquipped && (attackKey.isDown || Boolean(touch.attack)));
      if (!signature?.casting && !mobility?.busy && blasterEquipped && shootHeld && !isCrouching && now >= attackVisualUntil && now - lastShotAt >= POWERUPS[equipment.active].cooldown) {
        if (equipment.active==='frost'?fireFrostShot(scene):firePlayerShot(scene)) {
          lastShotAt = now;
          shotRecoilUntil = now + 180;
        }
      }

      const keyboardAttackPressed = Phaser.Input.Keyboard.JustDown(attackKey);
      const queuedEquipmentAttack=(equipment.active==='ember'||equipment.active==='sword')&&performance.now()-equipmentAttackQueuedAt<200;
      equipmentAttackQueuedAt=-9999;
      const attackPressed = !blasterEquipped && (keyboardAttackPressed || shootKey.isDown || Boolean(touch.attack||touch.shoot) || queuedEquipmentAttack);
      if (!signature?.casting && !mobility?.busy && attackPressed && !isCrouching && now - lastAttackAt >= Math.max(POWERUPS[equipment.active].cooldown,selectedCharacterId==='teleportation_c'?430:0)) {
        if(equipment.active==='ember'||equipment.active==='storm'){
          useElementalPower(scene);
        }else{
        if (now - lastAttackInputAt > 820) attackComboStep = 0;
        attackComboStep = (attackComboStep % 3) + 1;
        lastAttackInputAt = now;
        lastAttackAt = now;
        attackStartedAt = now;
        playSfx(equipment.active==='sword'?'swordSwing':'punchSwing');
        attackVisualUntil = now + (selectedCharacterId==='teleportation_c'?420:isXGod && useSideScrollXGodRun ? 430 : attackComboStep === 3 ? 360 : 300);
        const combo = attackComboStep;
        const attackEquipment=equipment.active;
        const blinkCounter=selectedCharacterId==='teleportation_c'&&now<teleport.counterUntil;
        blinkStrikeVisual=blinkCounter;
        const attackTeleport=teleport.blinks+teleport.recalls;
        attackResolution='pending';
        scene.time.delayedCall(selectedCharacterId==='teleportation_c'?(blinkCounter?55:125):isXGod && useSideScrollXGodRun ? (hasFlameSword ? 172 : 140) : !isXGod ? 100 : 0, () => {
          attackResolution=!player.active||isRespawning||isLevelClearing?'inactive':isCrouching?'crouched':equipment.active!==attackEquipment?'equipment_changed':now<=lastDamageAt?'damaged':selectedCharacterId==='teleportation_c'&&attackTeleport!==teleport.blinks+teleport.recalls?'teleported':'resolved';
          if(attackResolution==='resolved' && !mobility?.busy)performAttack(scene, combo,blinkCounter);
        });
        }
      }
      updatePowerupEffects(scene);

      if (!mobility?.busy && tryHeadStomp(scene)) jumpedThisFrame = true;
      if (!mobility?.busy && trySpringLaunch(scene)) jumpedThisFrame = true;
      const platformSnapped = snapPlayerToPlatformTop();
      if (platformSnapped) lastGroundedAt = now;
      updatePlayerVisual(scene, (grounded || platformSnapped) && !jumpedThisFrame, delta);
      signature?.present();
      mobility?.present(Boolean(signature?.casting || xgodDamagePose?.active || now < attackVisualUntil || now<emberUntil),
        Boolean(signature?.casting || xgodDamagePose?.active || now<emberUntil));
      emberJets?.present(equipment.active==='ember'&&now<emberUntil,EMBER_DASH.duration-emberRemaining,emberDirection,
        Boolean(signature?.casting||xgodDamagePose?.active||heroDeathVisual?.active),Boolean(signature?.casting||xgodDamagePose?.active||heroDeathVisual?.active||mobility?.read().texture));
      if (xgodDamagePose?.active) {
        xgodDamagePose.setPosition(player.x, (player.body as Phaser.Physics.Arcade.Body).bottom).setFlipX(facingDirection < 0);
      }
      updateEnemies(scene);
      updateDinioCompanion(scene, delta);
      updateDoghostCompanion(scene, delta);
      updateTeleportationCCompanion(scene, delta);
      cleanupProjectiles();
      fireBlades?.update(delta);
      updateBossHud(scene);
      updateRooftopRush(scene);

      if (player.y > WORLD_HEIGHT + 160) {
        damagePlayer(scene, 35, true);
      }
    }

    function makeBackground(scene: Phaser.Scene) {
      if (currentLevel <= 2) {
        for (let index = 0; index < 3; index++) {
          scene.add.image(index * 1728, 0, currentLevel === 1 ? "school_rooftop_panorama" : "graveyard_moonlit_panorama").setOrigin(0).setDisplaySize(1728, 576).setFlipX(index % 2 === 1).setScrollFactor(0.28, 0).setDepth(-30);
        }
        return;
      }
      if (currentLevel === 4) {
        scene.add.rectangle(0, 0, worldWidth, SCREEN_HEIGHT, 0x746184).setOrigin(0).setDepth(-50);
        for (let index = 0; index < 3; index++) {
          scene.add.image(index * 1728, 0, "witchwood_panorama").setOrigin(0).setDisplaySize(1728, 576)
            .setFlipX(index % 2 === 1).setScrollFactor(0.18, 0).setDepth(-40);
          scene.add.image(index * 1728, -45, "witchwood_parallax").setOrigin(0).setDisplaySize(1728, 576)
            .setFlipX(index % 2 === 1).setScrollFactor(0.45, 0).setAlpha(0.35).setDepth(-25);
        }
        return;
      }
      if (currentLevel === FINAL_LEVEL) {
        scene.add.rectangle(0, 0, worldWidth, SCREEN_HEIGHT, 0x111022).setOrigin(0).setDepth(-50);
        for (let index = 0; index < 3; index++) {
          scene.add.image(index * 1728, 0, "void_regent_pencil_panorama")
            .setOrigin(0)
            .setDisplaySize(1728, 576)
            .setFlipX(index % 2 === 1)
            .setScrollFactor(0.28, 0)
            .setDepth(-30);
        }
        return;
      }
      scene.add.rectangle(0, 0, worldWidth, SCREEN_HEIGHT, 0x0f172a).setOrigin(0).setDepth(-50);
      let currentX = 0;
      let bgIndex = 0;
      while (currentX < worldWidth) {
        const key = level.backgrounds[bgIndex % level.backgrounds.length];
        const image = scene.add.image(currentX, SCREEN_HEIGHT, key)
          .setOrigin(0, 1)
          .setDisplaySize(1520, 640)
          .setDepth(-30)
          .setTint(level.tint);
        image.setScrollFactor(0.62);
        currentX += 1460;
        bgIndex += 1;
      }
      scene.add.rectangle(0, 520, worldWidth, 220, 0x020617, 0.16).setOrigin(0).setDepth(-15);
    }

    function canStandUp() {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const top = player.y - (isZGod ? heroBodyHeight : 270) * player.scaleY;
      return !level.platforms.some(rect => rect.h > 56 && body.right > rect.x + 1 && body.left < rect.x + rect.w - 1
        && top < rect.y + rect.h && player.y > rect.y + 1);
    }

    function setCrouching(crouched: boolean, now: number) {
      if (isZGod) {
        if (crouched === isCrouching || !crouched && !canStandUp()) return;
        const body = player.body as Phaser.Physics.Arcade.Body;
        const previousHeight = body.height;
        isCrouching = crouched;
        const height = crouched ? 135 : heroBodyHeight;
        body.setSize(heroBodyWidth,height,false).setOffset((player.width-heroBodyWidth)/2,480-height);
        const shift = previousHeight-body.height;
        body.position.y += shift; body.prev.y += shift; body.prevFrame.y += shift; body.updateCenter();
        return;
      }
      if (!isXGod || !useSideScrollXGodRun || crouched === isCrouching) return;
      if (!crouched && !canStandUp()) return;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const previousHeight = body.height;
      isCrouching = crouched;
      if (crouched) {
        attackVisualUntil = now;
      }
      // Shift both current and previous bounds; otherwise Arcade treats the resize as movement.
      body.setSize(96, crouched ? 160 : 270, false).setOffset((player.width-96)/2, crouched ? 320 : 210);
      const shift = previousHeight - body.height;
      body.position.y += shift;
      body.prev.y += shift;
      body.prevFrame.y += shift;
      body.updateCenter();
    }

    function makeAnimations(scene: Phaser.Scene) {
      for (const [kind,def] of Object.entries(RESTORED_ENEMIES)) {
        if (!scene.textures.exists(`restored_${kind}_walk`)) continue;
        scene.anims.create({key:`restored_${kind}_walk`,frames:scene.anims.generateFrameNumbers(`restored_${kind}_walk`,{start:0,end:def.walkFrames-1}),frameRate:def.fps,repeat:-1});
      }
      const walkKey = getPlayerWalkTexture(scene);
      const walkAnimKey = getWalkAnimationKey(walkKey);
      if (scene.textures.exists(walkKey) && !scene.anims.exists(walkAnimKey)) {
        const usableFrames = getPlatformerRunFrameCount(scene, walkKey);
        scene.anims.create({
          key: walkAnimKey,
          frames: scene.anims.generateFrameNumbers(walkKey, { start: 0, end: Math.max(0, usableFrames - 1) }),
          frameRate: walkKey === "runner_blaster-run" ? 32 : walkKey.startsWith("runner_") || walkKey === "xgod_side_scroll_sprint_run_v1" ? 16 : isXGod ? 12 : 10,
          repeat: -1
        });
      }
      if (scene.textures.exists("grunt_walking")) {
        scene.anims.create({ key: "platformer_walker", frames: scene.anims.generateFrameNumbers("grunt_walking", { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
      }
      if (scene.textures.exists("character_attack") && !scene.anims.exists("platformer_player_attack")) {
        const usableFrames = Math.max(1, getPlatformerRunFrameCount(scene, "character_attack"));
        scene.anims.create({ key: "platformer_player_attack", frames: scene.anims.generateFrameNumbers("character_attack", { start: 0, end: Math.max(0, usableFrames - 1) }), frameRate: 9, repeat: 0 });
      }
      if (scene.textures.exists("doghost_walk") && !scene.anims.exists("platformer_doghost_walk")) {
        scene.anims.create({ key: "platformer_doghost_walk", frames: scene.anims.generateFrameNumbers("doghost_walk", { start: 0, end: 2 }), frameRate: 7, repeat: -1 });
      }
      if (scene.textures.exists("teleportation_c_walk") && !scene.anims.exists("platformer_teleportation_c_walk")) {
        scene.anims.create({ key: "platformer_teleportation_c_walk", frames: scene.anims.generateFrameNumbers("teleportation_c_walk", { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
      }
      if (scene.textures.exists("xgod_side_scroll_attack_v2") && !scene.anims.exists("platformer_xgod_side_scroll_attack")) {
        scene.anims.create({
          key: "platformer_xgod_side_scroll_attack",
          frames: scene.anims.generateFrameNumbers("xgod_side_scroll_attack_v2", { start: 0, end: 5 }),
          frameRate: 12,
          repeat: 0
        });
      }
      if (scene.textures.exists("m_alien_walk")) {
        scene.anims.create({ key: "platformer_alien", frames: scene.anims.generateFrameNumbers("m_alien_walk", { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
      }
      if (scene.textures.exists("m_dasher_walk")) {
        scene.anims.create({ key: "platformer_dasher", frames: scene.anims.generateFrameNumbers("m_dasher_walk", { start: 0, end: 3 }), frameRate: 9, repeat: -1 });
      }
      if (scene.textures.exists("m_giant_walk")) {
        scene.anims.create({ key: "platformer_giant", frames: scene.anims.generateFrameNumbers("m_giant_walk", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
      }
      Object.values(BOSS_DEFINITIONS).forEach((boss) => {
        const animationKey = getBossAnimationKey(boss);
        if (scene.textures.exists(boss.textureKey) && !scene.anims.exists(animationKey)) {
          scene.anims.create({
            key: animationKey,
            frames: boss.textureKey === "boss_kilina" ? [1, 2, 3, 2].map(frame => ({ key: boss.textureKey, frame }))
              : scene.anims.generateFrameNumbers(boss.textureKey, { start: 0, end: boss.frameCount - 1 }),
            frameRate: boss.textureKey === "boss_void_regent" || boss.textureKey === "boss_kilina" ? 9 : 7,
            repeat: -1
          });
        }
      });
    }

    function makeCinderShockwaveTexture(scene: Phaser.Scene) {
      if (scene.textures.exists("cinder_quake_wave")) return;
      const art = scene.make.graphics({ x: 0, y: 0, add: false });
      art.fillStyle(0xf97316, 0.28).fillEllipse(48, 25, 92, 34);
      art.lineStyle(8, 0xff8a1f, 0.96).strokeEllipse(48, 25, 84, 24);
      art.lineStyle(3, 0xffe089, 0.95).strokeEllipse(48, 23, 56, 12);
      art.generateTexture("cinder_quake_wave", 96, 50);
      art.destroy();
    }

    function getPlayerWalkTexture(scene: Phaser.Scene) {
      if (!isXGod && scene.textures.exists("character_walk")) return "character_walk";
      if (playerSprite && scene.textures.exists("player_walk")) return "player_walk";
      if (isXGod && useSideScrollXGodRun) {
        if (hasFlameSword && scene.textures.exists("xgod_side_scroll_fire_sword_run_v1")) return "xgod_side_scroll_fire_sword_run_v1";
        return playerPosePrefix()+'run';
      }
      if (hasFlameSword && scene.textures.exists("xgod_platformer_sword_run")) return "xgod_platformer_sword_run";
      if (isXGod && scene.textures.exists("xgod_platformer_run")) return "xgod_platformer_run";
      if (hasFlameSword && scene.textures.exists("player_sword_walk")) return "player_sword_walk";
      return "player_walk_internal";
    }

    function getWalkAnimationKey(textureKey: string) {
      return `platformer_player_walk_${textureKey}`;
    }

    function getBossAnimationKey(boss: typeof BOSS_DEFINITIONS[BossId]) {
      return `platformer_boss_${boss.textureKey}`;
    }

    function getPlatformerRunFrameCount(scene: Phaser.Scene, textureKey: string) {
      const frameTotal = scene.textures.get(textureKey).frameTotal;
      return Math.max(1, frameTotal - 1);
    }

    function addPlatform(scene: Phaser.Scene, rect: PlatformRect) {
      if (currentLevel <= 2 || currentLevel === 4) {
        const texture = scene.textures.get(level.blockKey);
        if (!texture.has("cap")) {
          const image = texture.getSourceImage();
          texture.add("cap", 0, 0, 0, image.width, 196);
          texture.add("bricks", 0, 0, 196, image.width, image.height - 196);
        }
        addTerrainTiles(scene, rect.x, rect.y, rect.w, Math.min(20, rect.h), level.blockKey, "cap", 0.22, 20 / 196).setOrigin(0).setDepth(1);
        if (rect.h > 20) addTerrainTiles(scene, rect.x, rect.y + 20, rect.w, rect.h - 20, level.blockKey, "bricks", 0.22).setOrigin(0).setDepth(1);
      } else {
        addTerrainTiles(scene, rect.x, rect.y, rect.w, rect.h, level.blockKey).setOrigin(0).setDepth(1);
      }
      const body = scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, 0xffffff, 0);
      scene.physics.add.existing(body, true);
      body.setData("oneWay", rect.h <= 56);
      platforms.add(body);
    }

    function addMovingPlatform(scene: Phaser.Scene, plan: MovingPlatformPlan) {
      const horizontal=plan.axis==='x';
      const displacement=Math.cos((plan.phase??0)*Math.PI*2)*plan.travel;
      const startY = plan.y + (horizontal?0:displacement);
      // The guide marks show the full travel range before the player commits to a jump.
      if(horizontal)scene.add.rectangle(plan.x+plan.w/2,plan.y+plan.h/2,plan.travel*2+plan.w,4,0xa7c7b8,.45).setDepth(0);
      else for (const x of [plan.x + 14, plan.x + plan.w - 14]) {
        scene.add.rectangle(x, plan.y + plan.h / 2, 4, plan.travel * 2 + plan.h, 0x577b72, 0.4).setDepth(0);
      }
      const sprite = addTerrainTiles(scene, plan.x+(horizontal?displacement:0), startY, plan.w, plan.h, level.blockKey, undefined, 0.22, 0.1)
        .setOrigin(0).setTint(0xd8fff0).setDepth(3);
      scene.physics.add.existing(sprite);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setImmovable(true);
      body.setFriction(1,0);
      body.checkCollision.down = body.checkCollision.left = body.checkCollision.right = false;
      lifts.push({ plan, sprite, body });
      scene.physics.add.collider(player, sprite, undefined, () => {
        const rider = player.body as Phaser.Physics.Arcade.Body;
        return rider.velocity.y >= body.velocity.y - 10 && rider.prev.y + rider.height <= body.prev.y + 10;
      });
    }

    function addCrumblingPlatform(scene:Phaser.Scene,plan:CrumblingPlatformPlan){
      const art=addTerrainTiles(scene,plan.x,plan.y,plan.w,plan.h,level.blockKey,undefined,.22,.1)
        .setOrigin(0).setTint(0xe8d3b6).setDepth(3);
      const cracks=scene.add.graphics().setPosition(plan.x,plan.y).setDepth(4);
      cracks.lineStyle(2,0x392c3e,.85);
      for(const x of [plan.w*.3,plan.w*.7])cracks.lineBetween(x,2,x-8,12).lineBetween(x-8,12,x+3,21).lineBetween(x+3,21,x-4,plan.h-2);
      const collider=scene.add.rectangle(plan.x+plan.w/2,plan.y+plan.h/2,plan.w,plan.h,0xffffff,0);
      scene.physics.add.existing(collider,true);
      const body=collider.body as Phaser.Physics.Arcade.StaticBody;
      crumbleLedges.push({plan,state:createCrumble(),art,cracks,body});
      scene.physics.add.collider(player,collider,undefined,()=>{
        const rider=player.body as Phaser.Physics.Arcade.Body;
        return body.enable&&rider.velocity.y>=0&&rider.prev.y+rider.height<=body.top+8;
      });
    }

    function addTimedVent(scene:Phaser.Scene,plan:TimedVentPlan){
      scene.add.image(plan.x+plan.w/2,plan.y-5,level.hazardKey).setDisplaySize(plan.w,16).setDepth(4);
      const texture=scene.textures.get(level.hazardKey);
      if(!texture.has('eruption')){
        const [x,y,w,h]=currentLevel===3?[190,231,200,343]:[940,143,200,426];
        texture.add('eruption',0,x,y,w,h);
      }
      const art=scene.add.image(plan.x+plan.w/2,plan.y,level.hazardKey,'eruption')
        .setDisplaySize(plan.w,plan.height).setOrigin(.5,1).setDepth(6).setVisible(false);
      const warning=scene.add.graphics().setDepth(5);
      const collider=scene.add.rectangle(plan.x+plan.w/2,plan.y-plan.height/2,plan.w,plan.height,0xffffff,0);
      scene.physics.add.existing(collider,true);hazards.add(collider);
      const body=collider.body as Phaser.Physics.Arcade.StaticBody;
      body.enable=false;
      vents.push({plan,art,warning,body,phase:'idle'});
    }

    function updateGroundObstacles(scene:Phaser.Scene,delta:number){
      if(hitStopActive)return;
      const rider=player.body as Phaser.Physics.Arcade.Body;
      for(const ledge of crumbleLedges){
        const {plan,state,body,art,cracks}=ledge;
        const overlap=rider.right>plan.x&&rider.left<plan.x+plan.w;
        const riding=body.enable&&overlap&&Math.abs(rider.bottom-plan.y)<=4&&rider.velocity.y>=-20;
        stepCrumble(state,plan,delta,riding,overlap&&rider.bottom>plan.y-4&&rider.top<plan.y+plan.h);
        body.enable=state.phase!=='gone';
        const falling=state.phase==='gone';
        const visible=!falling||state.elapsed<280;
        const shake=state.phase==='shaking'?Math.sin(state.elapsed*.08)*2:0;
        const fall=falling?state.elapsed*.2:0;
        art.setVisible(visible).setPosition(plan.x+shake,plan.y+fall)
          .setAlpha(falling?Math.max(0,1-state.elapsed/280):1)
          .setTint(state.phase==='shaking'?0xffcc84:0xe8d3b6);
        cracks.setVisible(visible).setPosition(art.x,art.y).setAlpha(art.alpha);
      }
      for(const vent of vents){
        const {plan,body,art,warning}=vent;
        vent.phase=ventPhase(liftClock,plan);body.enable=vent.phase==='active';
        art.setVisible(body.enable).setAlpha(.8+Math.sin(liftClock*.025)*.15);
        warning.clear();
        if(vent.phase==='warning'){
          warning.lineStyle(2,0xffd276,.6+Math.sin(liftClock*.018)*.25)
            .strokeRect(plan.x,plan.y-plan.height,plan.w,plan.height);
          warning.fillStyle(0xffd276,.15).fillRect(plan.x,plan.y-plan.height,plan.w,plan.height);
        }
      }
    }

    function resetGroundObstacles(){
      for(const ledge of crumbleLedges){ledge.state=createCrumble();ledge.body.enable=true;ledge.art.setPosition(ledge.plan.x,ledge.plan.y).setVisible(true).setAlpha(1);}
    }

    function addSpringPad(scene: Phaser.Scene, plan: SpringPadPlan) {
      const texture = scene.textures.get("rooftop_spring_pad");
      if (!texture.has("pad")) texture.add("pad", 0, 55, 240, 1810, 465);
      const sprite = scene.add.image(plan.x, plan.y + 2, "rooftop_spring_pad", "pad")
        .setOrigin(0.5, 1).setDisplaySize(plan.width, 42).setDepth(5);
      springPads.push({ plan, sprite, readyAt: 0, launches: 0 });
      if (springPads.length === 1) {
        scene.add.text(plan.x, plan.y - 74, "BOUNCE!", {
          fontFamily: "Gochi Hand, sans-serif", fontSize: "23px", color: "#dcf4ac",
          stroke: "#263020", strokeThickness: 4
        }).setOrigin(0.5).setDepth(7);
      }
    }

    function trySpringLaunch(scene: Phaser.Scene) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y < -20 || scene.time.now < movementLockedUntil) return false;
      const pad = springPads.find(({ plan, readyAt }) => scene.time.now >= readyAt
        && body.right > plan.x - plan.width / 2 + 8 && body.left < plan.x + plan.width / 2 - 8
        && body.bottom >= plan.y - 10 && body.bottom <= plan.y + 18);
      if (!pad) return false;
      setCrouching(false, scene.time.now);
      placePlayerOnPlatform(player.x, pad.plan.y - 26, true);
      body.setVelocityY(-pad.plan.launchSpeed);
      body.blocked.down = body.touching.down = false;
      springJumpUntil = scene.time.now + 650;
      stompChain = 0;
      airLaunchKind = "spring";
      jumpBufferedAt = lastGroundedAt = -9999;
      pad.readyAt = scene.time.now + 450;
      pad.launches += 1;
      playSfx('spring');
      const baseX = pad.sprite.scaleX;
      const baseY = pad.sprite.scaleY;
      scene.tweens.add({ targets: pad.sprite, scaleX: baseX * 1.13, scaleY: baseY * 0.48,
        duration: 85, yoyo: true, ease: "Back.easeOut" });
      return true;
    }

    function makeRooftopStarTexture(scene: Phaser.Scene) {
      // Small gameplay marker: irregular ink edges and pencil hatch strokes.
      const art = scene.make.graphics({ x: 0, y: 0 });
      const points = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? 25 : 12;
        return new Phaser.Geom.Point(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius);
      });
      art.fillStyle(0xf2b4e9).fillPoints(points, true);
      art.lineStyle(3, 0x332334).strokePoints(points, true);
      art.lineStyle(1, 0x995b9c, 0.65);
      [[24, 22, 38, 17], [23, 29, 42, 22], [20, 37, 41, 29], [25, 42, 41, 36]].forEach(([x1, y1, x2, y2]) => art.lineBetween(x1, y1, x2, y2));
      art.generateTexture("rooftop_rush_star", 64, 64);
      art.destroy();
    }

    function addRooftopRushStars(scene: Phaser.Scene) {
      level.rooftopRush?.stars.forEach((point) => addPickup(scene, { ...point, kind: "rush_star" }));
    }

    function resetRooftopRush(scene: Phaser.Scene) {
      if (!level.rooftopRush || rushState !== "active") return;
      pickups.getChildren().filter((child) => (child as Phaser.Physics.Arcade.Sprite).getData("kind") === "rush_star")
        .forEach((child) => child.destroy());
      rushState = "ready";
      rushCollected = 0;
      rushEndsAt = 0;
      addRooftopRushStars(scene);
      rushHud?.setText("STARS RESET — TRY AGAIN!").setColor("#fff0bd").setVisible(true);
      rushNoticeUntil = scene.time.now + 1600;
    }

    function updateRooftopRush(scene: Phaser.Scene) {
      if (!level.rooftopRush || !rushHud) return;
      if (rushState === "active") {
        if (scene.time.now >= rushEndsAt) {
          resetRooftopRush(scene);
          return;
        }
        const seconds = (rushEndsAt - scene.time.now) / 1000;
        rushHud.setVisible(true).setColor(seconds < 4 ? "#ffb494" : "#f4dcff")
          .setText(`ROOFTOP RUSH  ${rushCollected}/${level.rooftopRush.stars.length}  ·  ${seconds.toFixed(1)}s`);
      } else if (scene.time.now >= rushNoticeUntil) rushHud.setVisible(false);
    }

    function isPlayerGrounded(body: Phaser.Physics.Arcade.Body) {
      if (body.blocked.down) return true;
      // Overlap-only coins, checkpoints, and enemies also set touching.down.
      // A grounded player needs an actual supporting surface beneath their feet.
      if (body.velocity.y >= -20 && level.platforms.some(rect =>
        body.right > rect.x + 2 && body.left < rect.x + rect.w - 2 && Math.abs(body.bottom - rect.y) <= 3)) return true;
      if(crumbleLedges.some(ledge=>ledge.body.enable&&body.velocity.y>=-20&&body.right>ledge.body.left&&body.left<ledge.body.right&&Math.abs(body.bottom-ledge.body.top)<=3))return true;
      // Arcade contact can skip a tick as a lift accelerates away from the rider.
      return lifts.some(({ body: lift }) =>
        body.right > lift.left && body.left < lift.right &&
        Math.abs(body.bottom - lift.top) <= 3 &&
        body.velocity.y >= lift.velocity.y - 120);
    }

    function updateMovingPlatforms(delta: number) {
      if (hitStopActive || delta <= 0) return;
      liftClock += delta;
      for (const { plan, body } of lifts) {
        const phase = (liftClock / plan.period + (plan.phase ?? 0)) * Math.PI * 2;
        const target = (plan.axis==='x'?plan.x:plan.y) + Math.cos(phase) * plan.travel;
        if(plan.axis==='x')body.setVelocityX((target-body.x)/(delta/1000));
        else body.setVelocityY((target - body.y) / (delta / 1000));
      }
    }

    function snapPlayerToPlatformTop() {
      if (!isXGod || useSideScrollXGodRun) return false;
      if (!player?.active) return false;
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y < -20) return false;

      const playerHalfWidth = player.displayWidth * 0.24;
      const candidate = level.platforms
        .filter((rect) => player.x + playerHalfWidth >= rect.x && player.x - playerHalfWidth <= rect.x + rect.w)
        .map((rect) => ({ rect, standY: getPlatformStandY(player.x, rect) }))
        .filter((candidate): candidate is { rect: PlatformRect; standY: number } => candidate.standY !== null)
        .filter(({ standY }) => player.y >= standY - 2 && player.y <= standY + 10)
        .sort((a, b) => Math.abs(player.y - a.standY) - Math.abs(player.y - b.standY))[0];

      if (!candidate) return false;
      placePlayerOnPlatform(player.x, candidate.standY, true);
      body.blocked.down = true;
      return true;
    }

    function placePlayerOnPlatform(x: number, preferredY?: number, keepHorizontalVelocity = false) {
      mobility?.cancel(true);
      if(!keepHorizontalVelocity)stopEmber();
      jumpQueuedAt = downQueuedAt = jumpBufferedAt = -9999;
      const body = player.body as Phaser.Physics.Arcade.Body;
      // A raised platform can overlap the ground below it. Explicit stand heights
      // must win here or a valid mid-air catch would incorrectly snap to ground.
      const y = preferredY ?? getPlatformStandY(x) ?? player.y;
      const velocityX = keepHorizontalVelocity ? body.velocity.x : 0;
      body.reset(x, y);
      setCrouching(false, latestSceneTime);
      body.setVelocity(velocityX, 0);
      body.blocked.down = true;
      body.touching.down = true;
    }

    function getPlatformStandY(x: number, onlyRect?: PlatformRect) {
      const standOffset = !isXGod || useSideScrollXGodRun ? 0 : XGOD_PLATFORM_STAND_OFFSET;
      const platform = (onlyRect ? [onlyRect] : level.platforms)
        .find((rect) => x >= rect.x && x <= rect.x + rect.w);
      return platform ? platform.y - standOffset : null;
    }

    function addHazard(scene: Phaser.Scene, rect: PlatformRect) {
      if (currentLevel === 1 || rect.h <= 20) {
        scene.add.image(rect.x + rect.w / 2, rect.y + rect.h / 2, level.hazardKey).setDisplaySize(rect.w, rect.h).setDepth(4);
      } else {
        addTerrainTiles(scene, rect.x, rect.y, rect.w, rect.h, level.hazardKey).setOrigin(0).setDepth(4);
      }
      const body = scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, 0xffffff, 0);
      scene.physics.add.existing(body, true);
      hazards.add(body);
    }

    function addCheckpoint(scene: Phaser.Scene, x: number, y: number, index: number) {
      const flag = checkpoints.create(x, y, "checkpoint_flag") as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      flag.setData("index", index).setDepth(8);
      flag.setDisplaySize(58, 82).refreshBody();
      flag.body.setSize(42, 74).setOffset(8, 6);
    }

    function teleportSpace(){
      const body=player.body as Phaser.Physics.Arcade.Body;
      const rectangles=[...level.platforms,...lifts.map(l=>({x:l.body.x,y:l.body.y,w:l.body.width,h:l.body.height})),
        ...crumbleLedges.filter(l=>l.body.enable).map(l=>l.plan)];
      const solids=rectangles.filter(r=>r.h>56);
      if(bossBarrier?.active&&bossBarrier.body){const b=bossBarrier.body as Phaser.Physics.Arcade.StaticBody;if(b.enable)solids.push({x:b.x,y:b.y,w:b.width,h:b.height});}
      const boss=enemies.getChildren().find(e=>e.active&&e.getData('kind')==='boss'&&e.getData('engaged'));
      return {solids,supports:rectangles,hazards:[...level.hazards,...vents.filter(v=>v.phase==='active').map(v=>({x:v.body.x,y:v.body.y,w:v.body.width,h:v.body.height}))],
        left:bossArenaCameraLocked&&boss?Number(boss.getData('left'))-160:0,right:bossArenaCameraLocked&&boss?Number(boss.getData('right'))+160:level.endX,
        halfWidth:body.width/2,height:body.height};
    }

    function signatureLanding(enemy:Phaser.Physics.Arcade.Sprite|null,behind:boolean){
      const body=player.body as Phaser.Physics.Arcade.Body,space=teleportSpace();
      const from={x:player.x,y:body.bottom};
      if(!enemy){
        const to=blinkDestination(from.x,from.y,facingDirection,space,isPlayerGrounded(body));
        return to?{...to,facing:facingDirection}:null;
      }
      const target=enemy.body as Phaser.Physics.Arcade.Body;
      const enemyDirection=Number(enemy.getData('direction'))||(enemy.flipX?-1:1);
      const direction=behind?enemyDirection:Math.sign(target.center.x-player.x)||facingDirection;
      const x=target.center.x-direction*(target.width/2+body.width/2+14);
      const y=getPlatformStandY(x);
      if(y===null||Math.abs(y-from.y)>150||Math.abs(x-player.x)>540)return null;
      const to={x,y};
      if(!safeTeleportPoint(x,y,space,true)||!teleportPathClear(from,to,space))return null;
      return {...to,facing:Math.sign(target.center.x-x)||facingDirection};
    }

    function portalBurst(scene:Phaser.Scene,x:number,feet:number){
      const portal=scene.add.image(x,feet-48,'boss_tell_ring').setTint(0xc5a0ff).setDisplaySize(38,105).setDepth(24);
      scene.tweens.add({targets:portal,displayWidth:80,displayHeight:120,alpha:0,duration:300,onComplete:()=>portal.destroy()});
    }

    function tryTeleport(scene:Phaser.Scene,recall:boolean,grounded:boolean){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      if(now<teleport.readyAt||isRespawning||isLevelClearing)return false;
      const from={x:player.x,y:body.bottom},space=teleportSpace();
      const anchor=teleport.anchor;
      const to=recall?anchor&&now<anchor.expires&&Math.abs(anchor.x-from.x)<=380&&Math.abs(anchor.y-from.y)<130
        &&safeTeleportPoint(anchor.x,anchor.y,space,true)&&teleportPathClear(from,anchor,space)?anchor:null:blinkDestination(from.x,from.y,facingDirection,space,grounded);
      if(!to){teleport.blocked++;return false;}
      if(!startTeleport(teleport,now,from,to,recall))return false;
      playSfx('teleport',{pitch:recall?.86:1});
      // Air blinks keep momentum; only a supported departure can become a safe recall point.
      if(!recall&&!safeTeleportPoint(from.x,from.y,space,true))teleport.anchor=null;
      const velocity={x:body.velocity.x,y:body.velocity.y};
      const ghost=scene.add.image(player.x,player.y,player.texture.key,player.frame.name).setOrigin(player.originX,player.originY)
        .setScale(player.scaleX,player.scaleY).setFlipX(player.flipX).setTint(0xb48bff).setAlpha(.5).setDepth(18);
      scene.tweens.add({targets:ghost,alpha:0,duration:260,onComplete:()=>ghost.destroy()});
      portalBurst(scene,from.x,from.y);portalBurst(scene,to.x,to.y);
      body.reset(to.x,to.y);body.setVelocity(velocity.x,velocity.y);body.updateFromGameObject();body.prev.copy(body.position);body.prevFrame.copy(body.position);
      attackVisualUntil=shotRecoilUntil=-9999;
      return true;
    }

    function playerPosePrefix(){
      return equipment.active==='sword'?'runner_sword-':equipment.active==='blaster'?'runner_blaster-':'runner_';
    }

    function applyEquipment(scene:Phaser.Scene,id:EquippedPowerup){
      const next=equipPowerup(equipment,id,currentLevel);
      if(next===equipment)return;
      stopEmber();
      equipment=next;hasFlameSword=id==='sword';swordDurability=hasFlameSword?equipment.hits:0;
      playSfx('powerup',{pitch:id==='frost'?1.15:id==='ember'?.85:id==='storm'?1.05:1});
      if(hasFlameSword)swordUnlocked=true;
      characterPowerUnlocked=true;emberUntil=-9999;powerAura?.clear();
      lastShotAt=lastAttackAt=-9999;attackVisualUntil=shotRecoilUntil=-9999;
      showCompanionJoinNotice(scene,`${POWERUPS[id].name.toUpperCase()} · 3 HITS`, '#'+POWERUPS[id].color.toString(16).padStart(6,'0'));
      syncStats();
    }

    function addPowerStation(scene:Phaser.Scene,plan:{kind:EquippedPowerup;x:number;y:number}){
      const sprite=pickups.create(plan.x,plan.y,`equipment_${plan.kind}`) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      sprite.setDisplaySize(58,58).setDepth(10).setData('kind',plan.kind).setData('powerStation',true);
      sprite.body.setSize(sprite.width*.85,sprite.height*.85,true);
      const label=scene.add.text(plan.x,plan.y+35,POWERUPS[plan.kind].name.toUpperCase(),{fontFamily:'Gochi Hand, sans-serif',fontSize:'16px',color:'#'+POWERUPS[plan.kind].color.toString(16).padStart(6,'0'),stroke:'#19182e',strokeThickness:4})
        .setOrigin(.5).setDepth(10);
      powerStations.push({...plan,nextAt:0,sprite,label});
      scene.tweens.add({targets:sprite,y:plan.y-8,yoyo:true,repeat:-1,duration:850,ease:'sine.inOut'});
    }

    function fireFrostShot(scene:Phaser.Scene){
      const count=projectiles.getChildren().filter(p=>p.active&&p.getData('frostShot')).length;
      if(count>=3)return false;
      const body=player.body as Phaser.Physics.Arcade.Body;
      if(!isXGod){
        updatePlayerVisual(scene,isPlayerGrounded(body),0);
        if(isPlayerGrounded(body))player.setTexture('hero_frost_attack',0);
      }
      const hand=heroAttachment(scene,'hand');
      const shot=projectiles.create(hand?.x??player.x+facingDirection*38,hand?.y??body.center.y,'equipment_frost') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shot.setDisplaySize(32,28).setData('damage',1.5).setData('frostShot',true).setData('playerShotExpiresAt',scene.time.now+1300)
        .setDepth(22).setVelocityX(facingDirection*540).setAngularVelocity(facingDirection*210);
      (shot.body as Phaser.Physics.Arcade.Body).setSize(shot.width*.7,shot.height*.7,true).setAllowGravity(false);
      playSfx('frost');lastPowerAt=scene.time.now;powerUses++;shotsFired++;return true;
    }

    function useElementalPower(scene:Phaser.Scene){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      lastPowerAt=lastAttackAt=now;powerUses++;
      if(equipment.active==='ember'){
        playSfx('ember');
        emberRemaining=EMBER_DASH.duration;emberClockAt=now;emberUntil=now+emberRemaining;emberDirection=facingDirection;emberTargets.clear();movementLockedUntil=emberUntil;
        body.setMaxVelocity(EMBER_DASH.speed,900).setVelocityX(emberDirection*EMBER_DASH.speed);
        return;
      }
      // A short pulse clears hostile shots; bosses still use their normal guard/opening checks.
      playSfx('storm');
      const ring=scene.add.image(player.x,body.center.y,'boss_tell_ring').setDisplaySize(45,45).setTint(POWERUPS.storm.color).setDepth(24);
      scene.tweens.add({targets:ring,displayWidth:300,displayHeight:300,alpha:0,duration:320,onComplete:()=>ring.destroy()});
      enemies.getChildren().forEach(child=>{
        const enemy=child as Phaser.Physics.Arcade.Sprite,target=enemy.body as Phaser.Physics.Arcade.Body;
        if(enemy.active&&Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(body.center.x,body.center.y,150),new Phaser.Geom.Rectangle(target.x,target.y,target.width,target.height))
          &&!platformSeparatesPlayerAndEnemy(enemy)&&damageEnemy(scene,enemy,2.5,true))powerHits++;
      });
      projectiles.getChildren().forEach(child=>{
        const bolt=child as Phaser.Physics.Arcade.Sprite;
        if(bolt.active&&bolt.getData('enemyProjectile')&&Phaser.Math.Distance.Between(player.x,body.center.y,bolt.x,bolt.y)<=150){bolt.destroy();clearedBolts++;}
      });
    }

    function stopEmber(){
      if(movementLockedUntil===emberUntil)movementLockedUntil=-9999;
      emberRemaining=0;emberClockAt=-9999;emberUntil=-9999;emberTargets.clear();emberJets?.hide();
      if(player?.active)(player.body as Phaser.Physics.Arcade.Body).setMaxVelocity(520,900);
    }

    function updatePowerupEffects(scene:Phaser.Scene){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      powerHud.setText(`${POWERUPS[equipment.active].name.toUpperCase()}  ${'●'.repeat(equipment.hits)}${'○'.repeat(equipment.active==='hands'?0:3-equipment.hits)}\n${POWERUPS[equipment.active].hint}`)
        .setColor('#'+POWERUPS[equipment.active].color.toString(16).padStart(6,'0'));
      if (isZGod) powerHud.setText(`INVINCIBLE · ONE-HIT POWER · ${POWERUPS[equipment.active].name.toUpperCase()}`).setColor('#ffd0e5');
      powerAura.clear();
      if(now>=emberUntil)body.setMaxVelocity(520,900);
      if(selectedCharacterId==='teleportation_c'&&teleport.anchor){
        powerAura.lineStyle(3,0xb9a0ff,.8).strokeEllipse(teleport.anchor.x,teleport.anchor.y-5,46+Math.sin(now/90)*4,12);
      }
      if(isXGod&&['frost','ember','storm'].includes(equipment.active)){
        const color=POWERUPS[equipment.active].color;
        if(equipment.active==='storm'){
          powerAura.lineStyle(3,color,.9).strokeEllipse(player.x,body.top-12,50,14);
          for(let i=0;i<3;i++){const a=now/350+i*Math.PI*2/3;powerAura.fillStyle(color,.8).fillCircle(player.x+Math.cos(a)*27,body.top-12+Math.sin(a)*7,3);}
        }else if(equipment.active==='frost'){
          powerAura.fillStyle(color,.8).fillCircle(player.x+facingDirection*25,body.center.y,9);
        }else{
          powerAura.fillStyle(color,.65).fillEllipse(player.x-9,body.bottom-5,20,10).fillEllipse(player.x+9,body.bottom-5,20,10);
        }
      }
      if(now<emberUntil&&equipment.active==='ember'){
        // Physics handles solid walls and gaps. This is a fast attack, not invulnerability.
        if(emberDirection>0?body.blocked.right:body.blocked.left){stopEmber();return;}
        body.setVelocityX(emberDirection*EMBER_DASH.speed);
        const dash=new Phaser.Geom.Rectangle(body.x-12,body.y,body.width+24,body.height);
        enemies.getChildren().forEach(child=>{
          const enemy=child as Phaser.Physics.Arcade.Sprite,target=enemy.body as Phaser.Physics.Arcade.Body;
          if(enemy.active&&!emberTargets.has(enemy)&&Phaser.Geom.Intersects.RectangleToRectangle(dash,new Phaser.Geom.Rectangle(target.x,target.y,target.width,target.height))){
            emberTargets.add(enemy);if(damageEnemy(scene,enemy,EMBER_DASH.damage,true))powerHits++;
          }
        });
      }
      for(const p of powerStations){
        if(!p.nextAt||now<p.nextAt||Math.abs(player.x-p.x)<140)continue;
        p.nextAt=0;p.sprite.enableBody(false,p.x,p.y,true,true);p.label.setVisible(true);
      }
    }

    function addPickup(scene: Phaser.Scene, pickup: PickupPlan) {
      const texture = pickup.kind === "heart" ? "heart" : pickup.kind === "shield" ? "shield_pickup" : pickup.kind === "gravity" ? "gravity_pickup" : pickup.kind === "power" ? "power_pickup" : pickup.kind === "dinio" ? "dinio_pickup" : pickup.kind === "doghost" ? "doghost_pickup" : pickup.kind === "teleportation_c" ? "teleportation_c_pickup" : "gold_pickup";
      const sprite = pickups.create(pickup.x, pickup.y, texture) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const scale = pickup.kind === "power" ? 0.16 : pickup.kind === "dinio" ? 0.31 : pickup.kind === "doghost" ? 0.2 : pickup.kind === "teleportation_c" ? 0.3 : 0.36;
      sprite.setData("kind", pickup.kind).setData("bounceReward", Boolean(pickup.bounceReward)).setDepth(9).setScale(scale);
      if (pickup.bounceReward) sprite.setDisplaySize(54, 54);
      if (pickup.kind === "rush_star") sprite.setTexture("rooftop_rush_star").setDisplaySize(44, 44);
      sprite.body.setSize(sprite.width * 0.65, sprite.height * 0.75, true);
      scene.tweens.add({ targets: sprite, y: pickup.y - 10, yoyo: true, repeat: -1, duration: 900, ease: "sine.inOut" });
    }

    function spawnDinioCompanion(scene: Phaser.Scene) {
      if (dinioCompanion?.active || !player?.active) return;
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      const travelDirection = getCompanionTravelDirection();
      dinioCompanion = scene.add.sprite(player.x - travelDirection * 112, feet, "dinio_walk", 0)
        .setOrigin(0.5, 0.9375).setScale(0.39).setDepth(19);
      dinioNextShotAt = scene.time.now + 500;
    }

    function updateDinioCompanion(scene: Phaser.Scene, delta: number) {
      if (!hasDinio) return;
      if (!dinioCompanion?.active) spawnDinioCompanion(scene);
      const dinio = dinioCompanion;
      if (!dinio?.active) return;
      const travelDirection = getCompanionTravelDirection();
      const targetX = player.x - travelDirection * 112;
      const targetY = (player.body as Phaser.Physics.Arcade.Body).bottom;
      followCompanion(dinio, targetX, targetY, delta);

      const now = scene.time.now;
      const target = enemies.getChildren()
        .map((child) => child as Phaser.Physics.Arcade.Sprite)
        .filter((enemy) => enemy.active && Phaser.Math.Distance.Between(dinio.x, dinio.y, enemy.x, enemy.y) < 360)
        .sort((a, b) => Phaser.Math.Distance.Between(dinio.x, dinio.y, a.x, a.y) - Phaser.Math.Distance.Between(dinio.x, dinio.y, b.x, b.y))[0];
      if (target && now >= dinioNextShotAt) {
        dinioNextShotAt = now + 880;
        dinioAttackUntil = now + 270;
        dinioAttackFacing = target.x < dinio.x ? -1 : 1;
        scene.time.delayedCall(90, () => {
          if (!dinio.active || !target.active) return;
          const targetBody = target.body as Phaser.Physics.Arcade.Body;
          const startX = dinio.x + dinioAttackFacing * 42;
          const startY = dinio.y - 74;
          const angle = Phaser.Math.Angle.Between(startX, startY, targetBody.center.x, targetBody.center.y);
          const shot = projectiles.create(startX, startY, "dinio_shot") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          shot.setData("enemyProjectile", false).setData("damage", 2).setData("dinioShotExpiresAt", scene.time.now + 1700)
            .setDepth(18).setDisplaySize(48, 25).setFlipX(dinioAttackFacing < 0);
          shot.body.setAllowGravity(false).setSize(105, 48, true);
          shot.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
        });
      }
      if (now < dinioAttackUntil) {
        const remaining = dinioAttackUntil - now;
        dinio.setTexture("dinio_attack", remaining > 180 ? 0 : remaining > 90 ? 1 : 2);
        dinio.setOrigin(dinioAttackFacing < 0 ? 1 - 160 / 448 : 160 / 448, 0.9375);
        dinio.setFlipX(dinioAttackFacing < 0);
      } else {
        dinio.setTexture("dinio_walk", Math.floor(now / 90) % 6);
        dinio.setOrigin(0.5, 0.9375);
        dinio.setFlipX(travelDirection < 0);
      }
    }

    function spawnDoghostCompanion(scene: Phaser.Scene) {
      if (doghostCompanion?.active || !player?.active) return;
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      const travelDirection = getCompanionTravelDirection();
      doghostCompanion = scene.add.sprite(player.x - travelDirection * 190, feet - 54, "doghost_walk", 0)
        .setOrigin(0.5, 0.9).setDisplaySize(108, 81).setAlpha(0.88).setDepth(18);
      if (scene.anims.exists("platformer_doghost_walk")) doghostCompanion.play("platformer_doghost_walk");
    }

    function updateDoghostCompanion(scene: Phaser.Scene, delta: number) {
      if (!hasDoghost) return;
      if (!doghostCompanion?.active) spawnDoghostCompanion(scene);
      const doghost = doghostCompanion;
      if (!doghost?.active) return;
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      const travelDirection = getCompanionTravelDirection();
      const targetX = player.x - travelDirection * 190;
      const targetY = feet - 54 + Math.sin(scene.time.now * 0.006) * 7;
      followCompanion(doghost, targetX, targetY, delta);
      doghost.setFlipX(travelDirection < 0).setDepth(17);
    }

    function spawnTeleportationCCompanion(scene: Phaser.Scene) {
      if(selectedCharacterId==='teleportation_c')return;
      if (teleportationCCompanion?.active || !player?.active) return;
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      const travelDirection = getCompanionTravelDirection();
      teleportationCCompanion = scene.add.sprite(player.x + travelDirection * 124, feet - 12, "teleportation_c_walk", 0)
        .setOrigin(0.5, 1).setScale(.3).setAlpha(0.95).setTint(0xe8ddff).setDepth(19);
      if (scene.anims.exists("platformer_teleportation_c_walk")) teleportationCCompanion.play("platformer_teleportation_c_walk");
    }

    function updateTeleportationCCompanion(scene: Phaser.Scene, delta: number) {
      if (!hasTeleportationC) return;
      if (!teleportationCCompanion?.active) spawnTeleportationCCompanion(scene);
      const ally = teleportationCCompanion;
      if (!ally?.active) return;
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      const travelDirection = getCompanionTravelDirection();
      const targetX = player.x + travelDirection * 124;
      const targetY = feet - 12 + Math.sin(scene.time.now * 0.005) * 5;
      const now=scene.time.now;
      if(now<allyReturnAt){
        ally.anims.stop();ally.setTexture(allyAssistKind==='strike'?'teleportation_c_attack':'teleportation_c_dash',Math.min(allyAssistKind==='strike'?4:3,Math.floor((280-(allyReturnAt-now))/60)));
        return;
      }
      if(allyAssistKind!=='none'){
        portalBurst(scene,ally.x,ally.y);allyAssistKind='none';ally.setTexture('teleportation_c_walk',0);
        ally.setPosition(targetX,targetY);portalBurst(scene,targetX,targetY);ally.play('platformer_teleportation_c_walk');
      }
      if(now>=allyAssistAt&&selectedCharacterId!=='teleportation_c'){
        const bolt=projectiles.getChildren().find(child=>child.active&&child.getData('enemyProjectile')&&Phaser.Math.Distance.Between(player.x,feet-54,(child as Phaser.Physics.Arcade.Sprite).x,(child as Phaser.Physics.Arcade.Sprite).y)<125) as Phaser.Physics.Arcade.Sprite|undefined;
        const foe=enemies.getChildren().map(child=>child as Phaser.Physics.Arcade.Sprite)
          .filter(e=>e.active&&Math.abs(e.x-player.x)<480&&!platformSeparatesPlayerAndEnemy(e)&&(e.getData('kind')==='boss'?isBossVulnerable(e,now):Number(e.getData('hp'))<=2))
          .sort((a,b)=>Number(b.getData('kind')==='boss')-Number(a.getData('kind')==='boss')||Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0];
        if(bolt){
          portalBurst(scene,ally.x,ally.y);ally.setPosition(bolt.x,bolt.y+48);bolt.destroy();allyIntercepts++;allyAssistKind='intercept';
        }else if(foe){
          const b=foe.body as Phaser.Physics.Arcade.Body;
          portalBurst(scene,ally.x,ally.y);ally.setPosition(foe.x+(player.x<foe.x?-65:65),b.bottom).setFlipX(player.x>foe.x);
          if(damageEnemy(scene,foe,2,true))allyStrikes++;
          allyAssistKind='strike';
        }
        if(allyAssistKind!=='none'){playSfx('teleport',{volume:.45,pitch:1.15});portalBurst(scene,ally.x,ally.y);allyAssistAt=now+2600;allyReturnAt=now+280;return;}
      }
      if(Phaser.Math.Distance.Between(ally.x,ally.y,targetX,targetY)>280){portalBurst(scene,ally.x,ally.y);ally.setPosition(targetX,targetY);portalBurst(scene,targetX,targetY);}
      else followCompanion(ally,targetX,targetY,delta);
      ally.anims.timeScale=Phaser.Math.Clamp(Math.abs((player.body as Phaser.Physics.Arcade.Body).velocity.x)/260,.65,1.5);
      ally.setFlipX(travelDirection < 0).setDepth(19);
    }

    function getCompanionTravelDirection() {
      const horizontalSpeed = (player.body as Phaser.Physics.Arcade.Body).velocity.x;
      return Math.abs(horizontalSpeed) > 36 ? Math.sign(horizontalSpeed) : facingDirection;
    }

    function followCompanion(sprite: Phaser.GameObjects.Sprite, targetX: number, targetY: number, delta: number) {
      if (Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY) > 560) {
        sprite.setPosition(targetX, targetY);
        return;
      }
      const smoothing = 1 - Math.exp(-delta / 165);
      sprite.setPosition(
        Phaser.Math.Linear(sprite.x, targetX, smoothing),
        Phaser.Math.Linear(sprite.y, targetY, smoothing)
      );
    }

    function showTurnSkidDust(scene: Phaser.Scene, momentumDirection: number) {
      const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
      for (let index = 0; index < 3; index += 1) {
        const puff = scene.add.ellipse(player.x - momentumDirection * (18 + index * 9), feet - 7 - index * 3, 12, 7, 0xd6d3d1, 0.48)
          .setDepth(16);
        scene.tweens.add({
          targets: puff,
          x: puff.x - momentumDirection * 16,
          y: puff.y - 8,
          alpha: 0,
          scale: 1.45,
          duration: 190 + index * 35,
          onComplete: () => puff.destroy()
        });
      }
    }

    function addEnemy(scene: Phaser.Scene, plan: EnemyPlan) {
      const boss = plan.bossId ? BOSS_DEFINITIONS[plan.bossId] : null;
      const restored = isRestoredEnemy(plan.kind) ? RESTORED_ENEMIES[plan.kind] : null;
      const texture = boss?.textureKey ?? (restored ? `restored_${plan.kind}_walk` : plan.kind === "giant" ? "m_giant_walk" : plan.kind === "dasher" ? "m_dasher_walk" : plan.kind === "alien" ? "m_alien_walk" : "grunt_walking");
      const enemy = enemies.create(plan.x, plan.y, texture, 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const maxHp = boss?.maxHp ?? restored?.hp ?? (plan.kind === "giant" ? 7 : plan.kind === "dasher" ? 5 : plan.kind === "alien" ? 4 : 4);
      enemy.setData("kind", plan.kind)
        .setData("bounceLane", Boolean(plan.bounceLane))
        .setData("bossId", plan.bossId ?? null)
        .setData("left", plan.left)
        .setData("right", plan.right)
        .setData("spawnX", plan.x)
        .setData("spawnY", plan.y)
        .setData("direction", -1)
        .setData("hp", maxHp)
        .setData("maxHp", maxHp)
        .setData("hurtUntil", -9999)
        .setData("attackState", "patrol")
        .setData("attackTellUntil", -9999)
        .setData("attackUntil", -9999)
        .setData("attackFired", false)
        .setData("nextAttackAt", 900 + plan.x / 3);
      if (boss) enemy.setData("phase", 1);
      enemy.setDepth(12).setScale(boss?.scale ?? restored?.scale ?? (plan.kind === "giant" ? 0.32 : plan.kind === "walker" ? 0.22 : 0.54));
      enemy.setData("baseScale", enemy.scaleX);
      if (boss) {
        const profile = BOSS_BODY_PROFILES[plan.bossId as BossId];
        enemy.setOrigin(0.5, 600 / 640);
        enemy.body.setSize(enemy.width * profile.width, enemy.height * profile.height, false)
          .setOffset(enemy.width * profile.x, enemy.height * profile.y);
      } else {
        const profile = ENEMY_BODY_PROFILES[plan.kind as Exclude<EnemyKind, "boss">];
        enemy.setOrigin(0.5, profile.footAnchor);
        enemy.body.setSize(enemy.width * profile.width, enemy.height * profile.height, false)
          .setOffset(enemy.width * profile.x, enemy.height * profile.y);
      }
      if (boss) enemy.body.setAllowGravity(false);
      if (boss) {
        const floor = currentLevel <= 2 ? 480 : 520;
        placeBossAt(enemy, plan.x, floor);
        enemy.setData("floorY", floor).setData("left", level.endX - 850).setData("right", level.endX - 350)
          .setData("engaged", false).setData("attackIndex", 0).setData("move", "axe_dash")
          .setData("facing", -1).setData("damageReadyAt", 0).setData("guardedHits", 0).setData("openingHits", 0)
          .setData("attacksCompleted", 0).setData("phasePending", false)
          .setData("move", plan.bossId === "dark_dragon" ? "fire_volley" : plan.bossId === "ink_behemoth" ? "furnace_quake"
            : plan.bossId === "void_regent" ? "blink_burst" : plan.bossId === "kilina" ? "witch_hex" : "axe_dash");
      }
      if (boss && plan.bossId && scene.textures.exists(`boss_attack_${plan.bossId}`)) {
        const visual = BOSS_ATTACK_VISUALS[plan.bossId];
        bossAttackVisual = scene.add.sprite(plan.x, plan.y, `boss_attack_${plan.bossId}`, 0)
          .setOrigin(visual.originX, visual.originY).setScale(boss.scale).setDepth(13).setVisible(false);
      }
      if (plan.kind === "alien" || restored) {
        const margin = enemy.width * ENEMY_BODY_PROFILES[plan.kind as Exclude<EnemyKind,'boss'>].width * enemy.scaleX / 2 + 8;
        const support = level.platforms.filter((rect) => plan.x >= rect.x && plan.x <= rect.x + rect.w
          && rect.y >= plan.y && rect.w >= margin * 2)
          .sort((a, b) => a.y - b.y)[0];
        if (support) {
          const left = Phaser.Math.Clamp(plan.left, support.x + margin, support.x + support.w - margin);
          const right = Phaser.Math.Clamp(plan.right, left, support.x + support.w - margin);
          enemy.setData("left", left).setData("right", Math.max(left, right))
            .setData("supportY", support.y).setData("spawnY", support.y);
          enemy.body.reset(Phaser.Math.Clamp(plan.x, left, Math.max(left, right)), support.y);
          enemy.setData("spawnX", enemy.x);
        }
        enemy.body.setAllowGravity(true);
      }
      if(restored){
        enemy.setData('move',restored.move).setData('attacksCompleted',0).setData('shotsInBurst',0);
        if(plan.kind==='ghost'){
          const floor=Number(enemy.getData('supportY')??getPlatformStandY(plan.x)??480);
          const homeY=floor-135;
          placeBossAt(enemy,enemy.x,homeY);
          enemy.body.setAllowGravity(false);
          enemy.setData('homeY',homeY).setData('floorY',floor).setData('spawnY',homeY);
        }
        enemy.once('destroy',()=>clearEnemyIntent(enemy));
      }
      enemy.anims.play(boss ? getBossAnimationKey(boss) : restored ? `restored_${plan.kind}_walk` : plan.kind === "giant" ? "platformer_giant" : plan.kind === "dasher" ? "platformer_dasher" : plan.kind === "alien" ? "platformer_alien" : "platformer_walker", true);
    }

    function updateEnemies(scene: Phaser.Scene) {
      const now = scene.time.now;
      enemies.getChildren().forEach((child) => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return;
        if(now<Number(enemy.getData('specialStunUntil')??0)){enemy.setVelocityX(0);return;}
        const kind = enemy.getData("kind") as EnemyKind;
        if (enemy.y > WORLD_HEIGHT + 96) {
          enemy.setPosition(enemy.getData("spawnX") as number, enemy.getData("spawnY") as number);
          enemy.setVelocity(0, 0);
          enemy.setData("direction", -1).setData("attackState", "patrol").clearTint();
          return;
        }
        if (kind === "alien" || isRestoredEnemy(kind)) {
          // Keep ranged walkers on the roof they were assigned, including after knockback.
          enemy.x = Phaser.Math.Clamp(enemy.x, enemy.getData("left") as number, enemy.getData("right") as number);
        }
        if (now < (enemy.getData("hurtUntil") as number)) return;
        const left = enemy.getData("left") as number;
        const right = enemy.getData("right") as number;
        let direction = enemy.getData("direction") as number;
        const distanceToPlayer = Math.abs(player.x - enemy.x);

        if (kind === "boss") {
          updateBoss(scene, enemy, now);
          return;
        }
        if(now<Number(enemy.getData('frozenUntil')??0)){
          enemy.setVelocityX(0).setTint(0x8ce5fa);enemy.anims.timeScale=.15;return;
        }
        if(enemy.getData('frozenUntil')){enemy.setData('frozenUntil',0).clearTint();enemy.anims.timeScale=1;}
        if(isRestoredEnemy(kind)){
          updateRestoredEnemy(scene,enemy,kind,now);
          return;
        }
        if (kind === "alien") {
          updateGroundAlien(scene, enemy, now);
          return;
        }
        if (enemy.getData("bounceLane")) {
          enemy.x = Phaser.Math.Clamp(enemy.x, left, right);
          if (enemy.x <= left + 1) direction = 1;
          if (enemy.x >= right - 1) direction = -1;
          enemy.setData("direction", direction).setVelocityX(direction * 28);
          enemy.anims.timeScale = 0.65;
          faceNormalEnemy(enemy, kind, direction);
          return;
        }

        if (now >= (enemy.getData("nextAttackAt") as number) && distanceToPlayer < 360) {
          enemy.setData("attackState", "tell").setData("attackTellUntil", now + 360).setData("attackUntil", now + 620).setData("nextAttackAt", now + (kind === "dasher" ? 1900 : 1450));
          enemy.setTint(0xffd166);
        }

        const attackState = enemy.getData("attackState") as string;
        if (attackState === "tell" && now < (enemy.getData("attackTellUntil") as number)) {
          faceNormalEnemy(enemy, kind, player.x < enemy.x ? -1 : 1);
          enemy.setVelocityX(0);
          enemy.setScale((enemy.getData("baseScale") as number) * 1.08, (enemy.getData("baseScale") as number) * 0.92);
          return;
        }
        if (attackState === "tell") {
          enemy.setData("attackState", "attack").clearTint();
          enemy.setScale(enemy.getData("baseScale") as number);
        }
        if (enemy.getData("attackState") === "attack" && now < (enemy.getData("attackUntil") as number)) {
          const attackDirection = player.x < enemy.x ? -1 : 1;
          faceNormalEnemy(enemy, kind, attackDirection);
          enemy.setVelocityX(attackDirection * (kind === "dasher" ? 340 : kind === "giant" ? 210 : 250));
          return;
        }
        if (enemy.getData("attackState") === "attack") {
          enemy.setData("attackState", "patrol");
          enemy.setScale(enemy.getData("baseScale") as number);
        }
        if (enemy.x <= left) direction = 1;
        if (enemy.x >= right) direction = -1;
        enemy.setData("direction", direction);
        faceNormalEnemy(enemy, kind, direction);
        if (kind === "dasher") {
          enemy.setVelocityX(direction * 180);
        } else if (kind === "giant") {
          enemy.setVelocityX(direction * 70);
        } else {
          enemy.setVelocityX(direction * 92);
        }
      });
    }

    function updateGroundAlien(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite, now: number) {
      const state = enemy.getData("attackState") as string;
      if (state === "tell" || state === "attack") {
        enemy.setVelocityX(0);
        enemy.anims.pause();
        faceNormalEnemy(enemy, "alien", player.x < enemy.x ? -1 : 1);
        if (state === "tell" && now >= (enemy.getData("attackTellUntil") as number)) {
          enemy.clearTint().setData("attackState", "attack").setData("attackUntil", now + 240);
          fireEnemyPulse(scene, enemy, 10, 0xb5ffb3);
        } else if (state === "attack" && now >= (enemy.getData("attackUntil") as number)) {
          enemy.setData("attackState", "patrol");
        }
        return;
      }
      if (now >= (enemy.getData("nextAttackAt") as number) && Math.abs(player.x - enemy.x) < 620) {
        enemy.setVelocityX(0).setTint(0xffd166).setData("attackState", "tell")
          .setData("attackTellUntil", now + 420).setData("nextAttackAt", now + 2100);
        return;
      }
      let direction = enemy.getData("direction") as number;
      enemy.anims.resume();
      if (enemy.x <= (enemy.getData("left") as number) + 1) direction = 1;
      if (enemy.x >= (enemy.getData("right") as number) - 1) direction = -1;
      enemy.setData("direction", direction).setVelocityX(direction * 85);
      faceNormalEnemy(enemy, "alien", direction);
    }

    function faceNormalEnemy(enemy: Phaser.Physics.Arcade.Sprite, kind: EnemyKind, direction: number) {
      enemy.setFlipX(kind === "dasher" || kind === "alien" ? direction < 0 : direction > 0);
    }

    function clearEnemyIntent(enemy: Phaser.Physics.Arcade.Sprite) {
      (enemy.getData('tellVisual') as Phaser.GameObjects.Graphics | undefined)?.destroy();
      enemy.setData('tellVisual',null);
    }

    function showEnemyIntent(scene:Phaser.Scene,enemy:Phaser.Physics.Arcade.Sprite,kind:RestoredEnemyKind) {
      clearEnemyIntent(enemy);
      const body=enemy.body as Phaser.Physics.Arcade.Body;
      const targetX=Number(enemy.getData('targetX')),targetY=Number(enemy.getData('targetY'));
      const visual=scene.add.graphics().setDepth(17);
      visual.lineStyle(3,kind==='ghost'?0xf5a3d5:0xffd166,0.9);
      if(kind==='ghost') visual.strokeEllipse(targetX,targetY-body.height/2,90,65);
      else if(kind==='cosmic'){
        visual.lineBetween(body.center.x,body.center.y,targetX,targetY);
        visual.strokeCircle(targetX,targetY,12);
      }else{
        const direction=Number(enemy.getData('attackDirection'));
        const reach=kind==='spider'?140:110;
        visual.lineBetween(enemy.x,body.bottom-7,enemy.x+direction*reach,body.bottom-7);
        visual.strokeTriangle(enemy.x+direction*reach,body.bottom-7,enemy.x+direction*(reach-15),body.bottom-17,enemy.x+direction*(reach-15),body.bottom+3);
      }
      enemy.setData('tellVisual',visual);
    }

    function updateRestoredEnemy(scene:Phaser.Scene,enemy:Phaser.Physics.Arcade.Sprite,kind:RestoredEnemyKind,now:number) {
      const def=RESTORED_ENEMIES[kind];
      const body=enemy.body as Phaser.Physics.Arcade.Body;
      if(kind==='ghost')body.setVelocityY(0);
      const left=Number(enemy.getData('left')),right=Number(enemy.getData('right'));
      enemy.x=Phaser.Math.Clamp(enemy.x,left,right);
      const state=enemy.getData('attackState') as string;
      const started=Number(enemy.getData('stateStartedAt')??now);
      const elapsed=now-started;
      const lockedDirection=Number(enemy.getData('attackDirection')??-1);
      if(state==='tell'){
        enemy.setVelocityX(0).anims.pause();
        // Face the committed attack; moving behind the enemy does not redirect it.
        enemy.setFlipX(kind==='terror'?lockedDirection<0:lockedDirection>0);
        if(elapsed<def.tellMs)return;
        clearEnemyIntent(enemy);
        enemy.clearTint().setData('attackState','attack').setData('stateStartedAt',now).setData('shotsInBurst',0);
        if(kind==='spider')enemy.setVelocity(lockedDirection*310,-300);
        if(kind==='ghost')enemy.setData('launchX',enemy.x).setData('launchY',enemy.y);
        return;
      }
      if(state==='attack'){
        if(def.attackFrames){
          enemy.anims.stop();
          enemy.setTexture(`restored_${kind}_attack`,Math.min(def.attackFrames-1,Math.floor(elapsed/def.attackMs*def.attackFrames)));
          enemy.setFlipX(kind==='terror'?lockedDirection<0:lockedDirection>0);
        }
        if(kind==='spider') enemy.setVelocityX(lockedDirection*310);
        if(kind==='ghost'){
          const t=Phaser.Math.Clamp(elapsed/def.attackMs,0,1),ease=t*t*(3-2*t);
          placeBossAt(enemy,Phaser.Math.Linear(Number(enemy.getData('launchX')),Number(enemy.getData('targetX')),ease),
            Phaser.Math.Linear(Number(enemy.getData('launchY')),Number(enemy.getData('targetY')),ease));
        }
        if(kind==='terror'){
          enemy.setVelocityX(lockedDirection*100);
          if(elapsed>=120&&!enemy.getData('attackFired')){
            enemy.setData('attackFired',true);
            const strike=new Phaser.Geom.Rectangle(body.center.x+(lockedDirection>0?10:-120),body.center.y-48,110,96);
            const claw=scene.add.image(strike.centerX,strike.centerY,'enemy_hit_impact').setDisplaySize(100,85).setFlipX(lockedDirection<0).setDepth(19);
            scene.tweens.add({targets:claw,alpha:0,duration:180,onComplete:()=>claw.destroy()});
            const target=player.body as Phaser.Physics.Arcade.Body;
            if(!platformSeparatesPlayerAndEnemy(enemy)&&Phaser.Geom.Intersects.RectangleToRectangle(strike,new Phaser.Geom.Rectangle(target.left,target.top,target.width,target.height)))damagePlayer(scene,16,false);
          }
        }
        if(kind==='cosmic'){
          enemy.setVelocityX(0);
          const fired=Number(enemy.getData('shotsInBurst'));
          if(fired<2&&elapsed>=fired*220){
            fireEnemyPulse(scene,enemy,10,0xd6adff,270,{x:Number(enemy.getData('targetX')),y:Number(enemy.getData('targetY'))});
            enemy.setData('shotsInBurst',fired+1);
          }
        }
        if(elapsed>=def.attackMs){
          enemy.setVelocityX(0).setData('attackState','recover').setData('stateStartedAt',now)
            .setData('recoverFromX',enemy.x).setData('recoverFromY',enemy.y)
            .setData('attacksCompleted',Number(enemy.getData('attacksCompleted'))+1);
        }
        return;
      }
      if(state==='recover'){
        enemy.setVelocityX(0);
        if(kind==='ghost'){
          const t=Phaser.Math.Clamp(elapsed/def.recoverMs,0,1),ease=t*t*(3-2*t);
          placeBossAt(enemy,Phaser.Math.Linear(Number(enemy.getData('recoverFromX')),Number(enemy.getData('launchX')),ease),
            Phaser.Math.Linear(Number(enemy.getData('recoverFromY')),Number(enemy.getData('homeY')),ease));
        }
        enemy.anims.stop();
        enemy.setTexture(`restored_${kind}_walk`,0);
        if(elapsed>=def.recoverMs){
          enemy.setData('attackState','patrol').setData('stateStartedAt',now).setData('nextAttackAt',now+def.cooldownMs);
        }
        return;
      }
      clearEnemyIntent(enemy);
      let direction=Number(enemy.getData('direction'));
      if(enemy.x<=left+1)direction=1;
      if(enemy.x>=right-1)direction=-1;
      enemy.setData('direction',direction).setFlipX(direction>0);
      enemy.anims.play(`restored_${kind}_walk`,true);
      enemy.anims.timeScale=1;
      if(kind==='ghost'){
        placeBossAt(enemy,enemy.x,Number(enemy.getData('homeY'))+Math.sin(now/460+Number(enemy.getData('spawnX')))*13);
        enemy.setAngle(Math.sin(now/600)*4);
      }else enemy.setAngle(0);
      enemy.setVelocityX(direction*def.speed);
      const target=player.body as Phaser.Physics.Arcade.Body;
      const inLane=kind==='ghost'?Math.abs(target.center.y-body.center.y)<260:Math.abs(target.bottom-body.bottom)<155;
      if(now>=Number(enemy.getData('nextAttackAt'))&&Math.abs(player.x-enemy.x)<def.notice&&inLane){
        const attackDirection=player.x<enemy.x?-1:1;
        enemy.setData('attackState','tell').setData('stateStartedAt',now).setData('attackDirection',attackDirection)
          .setData('attackFired',false).setData('targetX',kind==='ghost'?Phaser.Math.Clamp(player.x,left,right):target.center.x)
          .setData('targetY',kind==='ghost'?Math.min(Number(enemy.getData('floorY'))-6,target.center.y+body.height/2):target.center.y)
          .setTint(0xffd166).setVelocityX(0).setAngle(0);
        showEnemyIntent(scene,enemy,kind);
      }
    }

    function setBossAttackPose(boss: Phaser.Physics.Arcade.Sprite, bossId: BossId, direction: number, frame: number | null) {
      if (!bossAttackVisual?.active) return;
      boss.setVisible(frame === null);
      bossAttackVisual.setVisible(frame !== null);
      if (frame === null) return;
      const visual = BOSS_ATTACK_VISUALS[bossId];
      const flipX = visual.facesRight ? direction < 0 : direction > 0;
      bossAttackVisual.setPosition(boss.x, boss.y).setAngle(0).setAlpha(1).setScale(boss.getData("baseScale") as number)
        .setOrigin(flipX ? 1 - visual.originX : visual.originX, visual.originY)
        .setFlipX(flipX).setFrame(frame);
    }

    function updateBoss(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, now: number) {
      const bossId = boss.getData("bossId") as BossId;
      if (bossId === "killinas_daughter") {
        updateKilina(scene, boss, now);
        return;
      }
      updateStageBoss(scene, boss, now);
    }

    function showStageBossPose(boss: Phaser.Physics.Arcade.Sprite, frame: number, angle = 0, stretch = 1) {
      const id = boss.getData("bossId") as BossId;
      const facing = Number(boss.getData("facing"));
      setBossAttackPose(boss, id, facing, frame);
      boss.setFlipX(id === "ink_behemoth" || id === "kilina" ? facing < 0 : facing > 0);
      bossAttackVisual?.setAngle(angle).setScale(Number(boss.getData("baseScale")) / stretch,
        Number(boss.getData("baseScale")) * stretch);
    }

    function beginStageBossMove(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, move: string) {
      const spec = BOSS_MOVES[move];
      const left = Number(boss.getData("left"));
      const right = Number(boss.getData("right"));
      const phaseTwo = boss.getData("phase") === 2;
      const direction = player.x < boss.x ? -1 : 1;
      const teleportX = boss.x < (left + right) / 2 ? right - 25 : left + 25;
      const targetX = move === "blink_burst" ? teleportX : move === "cinder_bound" || move === "witch_step" ? player.x
        : boss.x + direction * Phaser.Math.Clamp(Math.abs(player.x - boss.x) + 70, 280, 420);
      const travels = ["dragon_lunge", "cinder_bound", "shadow_dash", "witch_step"].includes(move);
      let destination = Phaser.Math.Clamp(targetX, left + 15, right - 15);
      // Reposition across the yard when cornered instead of performing a motionless charge.
      if (travels && Math.abs(destination - boss.x) < 180) destination = boss.x < (left + right) / 2 ? right - 15 : left + 15;
      boss.setVelocity(0, 0).setData("attackState", "tell").setData("move", move)
        .setData("facing", move === "blink_burst" ? player.x < teleportX ? -1 : 1 : travels ? Math.sign(destination - boss.x) : direction)
        .setData("stateStartedAt", scene.time.now).setData("tellDuration", spec.tell - (phaseTwo ? 120 : 0))
        .setData("startX", boss.x).setData("targetX", destination)
        .setData("aimX", player.x).setData("aimY", player.y - 85).setData("shotsInBurst", 0)
        .setData("lastAfterimageAt", -9999).setData("landingFired", false)
        .setData("markedXs", (phaseTwo ? [-260, -130, 0, 130, 260] : [-170, 0, 170])
          .map(offset => Phaser.Math.Clamp(player.x + offset, left - 160, right + 160)));
    }

    function recoverStageBoss(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite) {
      const duration = bossCounterWindow(Number(boss.getData('phase')), BOSS_MOVES[boss.getData("move") as string].recovery);
      placeBossAt(boss, boss.x, Number(boss.getData("floorY")));
      boss.setData("attackState", "recover").setData("stateStartedAt", scene.time.now)
        .setData("recoveryDuration", duration).setData("recoverUntil", scene.time.now + duration)
        .setData("attacksCompleted", Number(boss.getData("attacksCompleted")) + 1);
      bossAttackWarning?.clear();
      bossTellMarker?.setVisible(false);
    }

    function stageBossProjectile(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, x: number, y: number,
      vx: number, vy: number, kind: string, size = 32, damage = 10) {
      const config = BOSS_DEFINITIONS[boss.getData("bossId") as BossId];
      const key = kind === "quake" ? "cinder_quake_wave" : config.projectileKey;
      const orb = projectiles.create(x, y, key) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      orb.setData("enemyProjectile", true).setData("damage", damage).setData("bossMove", boss.getData("move"))
        .setData("bossShotExpiresAt", scene.time.now + (kind === "quake" ? 1900 : 2600))
        .setData("quakeWave", kind === "quake").setData("pattern", kind).setDepth(18)
        .setDisplaySize(kind === "quake" ? 86 : size, kind === "quake" ? 34 : size)
        .setTint(config.tint).setVelocity(vx, vy);
      (orb.body as Phaser.Physics.Arcade.Body).setSize(orb.width * 0.65, orb.height * 0.65, true).setAllowGravity(false);
      if (kind === "quake") orb.setFlipX(vx < 0);
      return orb;
    }

    function stageBossFan(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, count: number, spread: number, kind: string) {
      const direction = Number(boss.getData("facing"));
      const x = boss.x + direction * (boss.getData("bossId") === "dark_dragon" ? 95 : 75);
      const y = boss.y - 135;
      // Clamp aim to the committed side: crossing behind a boss never turns a shot backwards.
      const angle = (direction > 0 ? 0 : Math.PI) + Phaser.Math.Clamp(Math.atan2(
        Number(boss.getData("aimY")) - y, Math.max(100, Math.abs(Number(boss.getData("aimX")) - x))), -0.5, 0.5) * direction;
      for (let i = 0; i < count; i++) {
        const a = angle + (i - (count - 1) / 2) * spread;
        stageBossProjectile(scene, boss, x, y, Math.cos(a) * 350, Math.sin(a) * 350, kind, 28, 10);
      }
    }

    function stageBossWaves(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, kind = "quake") {
      [-1, 1].forEach(direction => stageBossProjectile(scene, boss, boss.x + direction * 105,
        Number(boss.getData("floorY")) - 18, direction * 360, 0, kind, 34, 10));
      scene.cameras.main.shake(140, 0.004);
    }

    function hitStageBossLanding(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(body.center.x - boss.x) < 145 && body.bottom > Number(boss.getData("floorY")) - 48) {
        damagePlayer(scene, 16, false);
      }
    }

    function drawStageBossWarning(boss: Phaser.Physics.Arcade.Sprite, progress: number) {
      if (!bossAttackWarning) return;
      const floor = Number(boss.getData("floorY"));
      const target = Number(boss.getData("targetX"));
      const move = boss.getData("move") as string;
      const color = BOSS_DEFINITIONS[boss.getData("bossId") as BossId].tint;
      bossAttackWarning.lineStyle(3, color, 0.4 + progress * 0.5);
      if (move === "ember_rain") {
        (boss.getData("markedXs") as number[]).forEach(x => {
          bossAttackWarning.fillStyle(color, 0.08 + progress * 0.13).fillRect(x - 22, floor - 460, 44, 460);
          bossAttackWarning.strokeEllipse(x, floor - 5, 58, 22);
        });
      } else if (move === "rune_bloom") {
        (boss.getData("markedXs") as number[]).forEach(x => {
          bossAttackWarning.fillStyle(color, 0.1 + progress * 0.15).fillRect(x - 24, floor - 190, 48, 190);
          bossAttackWarning.strokeEllipse(x, floor - 6, 70, 25);
        });
      } else if (move === "cinder_bound" || move === "witch_step" || move === "blink_burst") {
        bossTellMarker?.setPosition(target, floor - 5).setDisplaySize(move === "cinder_bound" ? 290 : move === "witch_step" ? 190 : 140, 32)
          .setTint(color).setAlpha(0.55 + progress * 0.4).setVisible(true);
        if (move === "blink_burst") bossAttackWarning.strokeEllipse(target, floor - 140, 110, 240);
      } else if (move === "dragon_lunge" || move === "shadow_dash") {
        bossAttackWarning.lineBetween(boss.x, floor - 14, target, floor - 14);
        bossAttackWarning.strokeEllipse(target, floor - 10, 115, 25);
      } else if (move === "low_breath" || move === "furnace_quake") {
        bossAttackWarning.lineBetween(boss.x - (move === "furnace_quake" ? 390 : 0), floor - 12,
          boss.x + (move === "furnace_quake" ? 390 : Number(boss.getData("facing")) * 390), floor - 12);
      } else {
        bossAttackWarning.lineBetween(boss.x + Number(boss.getData("facing")) * 80, boss.y - 135,
          Number(boss.getData("aimX")), Number(boss.getData("aimY")));
      }
    }

    function updateStageBoss(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, now: number) {
      const id = boss.getData("bossId") as BossId;
      const floor = Number(boss.getData("floorY"));
      const left = Number(boss.getData("left"));
      const right = Number(boss.getData("right"));
      const distance = Math.abs(player.x - boss.x);
      bossAttackWarning?.clear();
      bossTellMarker?.setVisible(false);
      if (distance > 1150 || player.x < left - (boss.getData("engaged") ? 280 : 200)) {
        if (boss.getData("engaged")) projectiles.getChildren().filter(p => p.getData("enemyProjectile")).forEach(p => p.destroy());
        placeBossAt(boss, Phaser.Math.Clamp(boss.x, left, right), floor);
        boss.setData("engaged", false).setData("attackState", "patrol").setAlpha(1);
        setBossArenaCamera(scene, boss, false);
        if (id === "kilina") {
          setBossAttackPose(boss, id, Number(boss.getData("facing")), null);
          boss.anims.stop();
          boss.setFrame(0).setFlipX(Number(boss.getData("facing")) < 0);
        } else showStageBossPose(boss, 0);
        return;
      }
      if (!boss.getData("engaged")) boss.setData("engaged", true).setData("nextAttackAt", now + 950);
      setBossArenaCamera(scene, boss, true);
      let state = boss.getData("attackState") as string;
      const phaseTwo = boss.getData("phase") === 2;
      const facing = Number(boss.getData("facing"));
      const move = boss.getData("move") as string;
      const elapsed = now - Number(boss.getData("stateStartedAt"));
      boss.x = Phaser.Math.Clamp(boss.x, left, right);
      if (boss.getData("phasePending") && (state === "patrol" || state === "recover" && now >= Number(boss.getData("recoverUntil")))) {
        boss.setData("phase", 2).setData("phasePending", false).setData("attackState", "phase").setData("stateStartedAt", now);
        state = "phase";
        scene.cameras.main.shake(180, 0.003);
      }
      if (state === "phase") {
        showStageBossPose(boss, id === "dark_dragon" || id === "kilina" ? 0 : 1, Math.sin(now / 95) * 2);
        if (now - Number(boss.getData("stateStartedAt")) >= 950) {
          boss.setData("attackState", "patrol").setData("nextAttackAt", now + 300);
        }
        return;
      }
      if (state === "tell") {
        const progress = Phaser.Math.Clamp(elapsed / Number(boss.getData("tellDuration")), 0, 1);
        showStageBossPose(boss, id === "dark_dragon" || id === "kilina" ? 0 : 1, -facing * progress * 4, 1 - Math.sin(progress * Math.PI) * 0.025);
        drawStageBossWarning(boss, progress);
        if (progress >= 1) boss.setData("attackState", "attack").setData("stateStartedAt", now);
        return;
      }
      if (state === "attack") {
        let duration = BOSS_MOVES[move].attack;
        const startX = Number(boss.getData("startX"));
        const targetX = Number(boss.getData("targetX"));
        let fired = Number(boss.getData("shotsInBurst"));
        if (move === "dragon_lunge" || move === "cinder_bound" || move === "shadow_dash" || move === "witch_step") {
          duration -= phaseTwo ? 100 : 0;
          const t = Phaser.Math.Clamp(elapsed / duration, 0, 1);
          const height = move === "cinder_bound" ? 165 : move === "witch_step" ? 125 : move === "dragon_lunge" ? 90 : 24;
          placeBossAt(boss, Phaser.Math.Linear(startX, targetX, Phaser.Math.SmoothStep(t, 0, 1)), floor - Math.sin(t * Math.PI) * height);
          showStageBossPose(boss, id === "dark_dragon" ? 0 : t < 0.7 ? 2 : 3, facing * Math.sin(t * Math.PI) * 4);
          if (move === "cinder_bound" || move === "witch_step") drawStageBossWarning(boss, 1);
          if (move === "shadow_dash" && now - Number(boss.getData("lastAfterimageAt")) >= 100 && bossAttackVisual) {
            boss.setData("lastAfterimageAt", now);
            const ghost = scene.add.image(bossAttackVisual.x, bossAttackVisual.y, bossAttackVisual.texture.key, bossAttackVisual.frame.name)
              .setOrigin(bossAttackVisual.originX, bossAttackVisual.originY).setScale(bossAttackVisual.scaleX, bossAttackVisual.scaleY)
              .setFlipX(bossAttackVisual.flipX).setTint(0xb080ff).setAlpha(0.25).setDepth(11);
            scene.tweens.add({ targets: ghost, alpha: 0, duration: 240, onComplete: () => ghost.destroy() });
          }
          if (t >= 1 && !boss.getData("landingFired")) {
            boss.setData("landingFired", true);
            if (move === "cinder_bound") { hitStageBossLanding(scene, boss); stageBossWaves(scene, boss); }
            if (move === "shadow_dash" && phaseTwo) stageBossWaves(scene, boss, "shadow_wave");
            if (move === "witch_step") stageBossWaves(scene, boss, "witch_wisp");
          }
        } else if (move === "fire_volley" || move === "low_breath") {
          const count = phaseTwo ? 4 : 3;
          if (fired < count && elapsed >= fired * 230 + 100) {
            if (move === "low_breath") stageBossProjectile(scene, boss, boss.x + facing * 115, floor - 18, facing * 290, 0, "low_fire", 34);
            else {
              const aim = Math.atan2(Number(boss.getData("aimY")) - (floor - 135), Math.max(130, Math.abs(Number(boss.getData("aimX")) - boss.x)));
              const angle = (facing > 0 ? 0 : Math.PI) + (Phaser.Math.Clamp(aim, -0.4, 0.4) + (fired - (count - 1) / 2) * 0.12) * facing;
              stageBossProjectile(scene, boss, boss.x + facing * 95, floor - 135, Math.cos(angle) * 340, Math.sin(angle) * 340, "fire_volley", 30);
            }
            boss.setData("shotsInBurst", ++fired).setData("lastBurstAt", now);
          }
          const recoil = Math.max(0, 1 - (now - Number(boss.getData("lastBurstAt") ?? -9999)) / 170);
          placeBossAt(boss, Phaser.Math.Clamp(startX - facing * recoil * 9, left, right), floor);
          // The old breath poses contain a large painted flame cone. Using that
          // for individual rounds falsely makes the whole cone look damaging.
          showStageBossPose(boss, 0, -facing * recoil * 5, 1 + recoil * 0.02);
        } else if (move === "furnace_quake") {
          const count = phaseTwo ? 2 : 1;
          if (fired < count && elapsed >= 260 + fired * 280) {
            stageBossWaves(scene, boss);
            boss.setData("shotsInBurst", ++fired);
          }
          showStageBossPose(boss, elapsed < 240 ? 1 : elapsed < 650 ? 2 : 3, facing * Math.sin(Math.min(1, elapsed / 650) * Math.PI) * 4);
        } else if (move === "ember_rain") {
          const lanes = boss.getData("markedXs") as number[];
          drawStageBossWarning(boss, 0.4);
          if (fired < lanes.length && elapsed >= 120 + fired * 170) {
            stageBossProjectile(scene, boss, lanes[fired], floor - 450, 0, 470, "falling_ember", 38, 12);
            boss.setData("shotsInBurst", ++fired);
          }
          showStageBossPose(boss, elapsed < 350 ? 1 : elapsed < 1150 ? 2 : 3, Math.sin(now / 90) * 1.5);
        } else if (move === "witch_hex") {
          const count = phaseTwo ? 5 : 3;
          if (fired < count && elapsed >= 140 + fired * 230) {
            const orb = stageBossProjectile(scene, boss, boss.x + facing * 65, floor - 145,
              facing * (phaseTwo ? 340 : 300), [-150, -65, -230, -100, -190][fired], "curved_hex", 30, 11);
            // Local gravity offsets the world's 1280 so these spells follow gentle arcs.
            (orb.body as Phaser.Physics.Arcade.Body).setAllowGravity(true).setGravityY(-900);
            boss.setData("shotsInBurst", ++fired).setData("lastBurstAt", now);
          }
          const recoil = Math.max(0, 1 - (now - Number(boss.getData("lastBurstAt") ?? -9999)) / 180);
          showStageBossPose(boss, 1, -facing * recoil * 5, 1 - recoil * 0.018);
        } else if (move === "rune_bloom") {
          drawStageBossWarning(boss, 0.65);
          const pulses = phaseTwo ? 2 : 1;
          if (fired < pulses && elapsed >= 280 + fired * 800) {
            (boss.getData("markedXs") as number[]).forEach(x => {
              const pillar = stageBossProjectile(scene, boss, x, floor - 95, 0, 0, "rune_pillar", 42, 12);
              pillar.setDisplaySize(42, 190).setAlpha(0.8).setData("bossShotExpiresAt", now + 600);
              (pillar.body as Phaser.Physics.Arcade.Body).setSize(pillar.width * 0.65, pillar.height * 0.9, true);
            });
            boss.setData("shotsInBurst", ++fired);
          }
          showStageBossPose(boss, elapsed < 220 ? 0 : 1, Math.sin(now / 120) * 1.5);
        } else {
          const blink = move === "blink_burst";
          const fireAt = blink ? 620 : 180;
          if (blink) {
            drawStageBossWarning(boss, 0.8);
            if (elapsed >= 300 && !boss.getData("landingFired")) {
              placeBossAt(boss, targetX, floor);
              boss.setData("landingFired", true);
            }
          }
          placeBossAt(boss, boss.x, floor - 10 - Math.sin(elapsed / 170) * 5);
          showStageBossPose(boss, elapsed < fireAt ? 1 : elapsed < duration - 220 ? 2 : 3, facing * Math.sin(elapsed / 180) * 2);
          if (blink) bossAttackVisual?.setAlpha(elapsed < 300 ? Math.max(0.1, 1 - elapsed / 300) : Math.min(1, (elapsed - 300) / 250));
          const bursts = phaseTwo ? 2 : 1;
          if (fired < bursts && elapsed >= fireAt + fired * 400) {
            stageBossFan(scene, boss, phaseTwo ? 5 : 3, 0.24, "void_star");
            boss.setData("shotsInBurst", ++fired);
          }
        }
        if (elapsed >= duration) recoverStageBoss(scene, boss);
        return;
      }
      if (state === "recover") {
        const remaining = Number(boss.getData("recoverUntil")) - now;
        showStageBossPose(boss, id === "dark_dragon" ? 0 : 3, facing * Math.max(0, 1 - elapsed / 700) * 3);
        if (remaining <= 0) boss.setData("attackState", "patrol").setData("nextAttackAt", now + (phaseTwo ? 350 : 600));
        return;
      }
      const direction = player.x < boss.x ? -1 : 1;
      boss.setData("facing", direction).setFlipX(id === "ink_behemoth" || id === "kilina" ? direction < 0 : direction > 0);
      setBossAttackPose(boss, id, direction, null);
      const desired = distance > 350 ? direction * (id === "ink_behemoth" ? 46 : id === "kilina" ? phaseTwo ? 155 : 120 : id === "void_regent" ? 95 : 75)
        : distance < 210 ? -direction * (id === "kilina" ? 105 : 65) : 0;
      boss.setVelocityX((boss.x <= left + 2 && desired < 0 || boss.x >= right - 2 && desired > 0) ? 0 : desired);
      if (id === "kilina" && Math.abs((boss.body as Phaser.Physics.Arcade.Body).velocity.x) < 1) {
        boss.anims.stop();
        boss.setFrame(0);
      } else {
        boss.anims.play(getBossAnimationKey(BOSS_DEFINITIONS[id]), true);
        boss.anims.timeScale = phaseTwo ? 1.2 : 0.9;
      }
      if (now >= Number(boss.getData("nextAttackAt"))) {
        const pattern = id === "dark_dragon" ? ["fire_volley", "dragon_lunge", "low_breath"]
          : id === "ink_behemoth" ? ["furnace_quake", "cinder_bound", "ember_rain"]
            : id === "kilina" ? ["witch_hex", "rune_bloom", "witch_step"] : ["blink_burst", "star_fan", "shadow_dash"];
        const index = Number(boss.getData("attackIndex"));
        boss.setData("attackIndex", index + 1);
        beginStageBossMove(scene, boss, pattern[index % pattern.length]);
      }
    }

    function showKilinaPose(boss: Phaser.Physics.Arcade.Sprite, frame: number, angle = 0, stretch = 1, offsetX = 0) {
      const direction = boss.getData("facing") as number;
      setBossAttackPose(boss, "killinas_daughter", direction, frame);
      boss.setFlipX(direction < 0);
      bossAttackVisual?.setAngle(angle).setScale((boss.getData("baseScale") as number) / stretch,
        (boss.getData("baseScale") as number) * stretch).setX(boss.x + offsetX);
    }

    function placeBossAt(boss: Phaser.Physics.Arcade.Sprite, x: number, y: number) {
      const body = boss.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
      // Arcade reset starts at the texture's top-left and omits custom offsets.
      // Synchronize now so same-frame collisions and counters use her actual body.
      body.updateFromGameObject();
      body.prev.copy(body.position);
      body.prevFrame.copy(body.position);
    }

    function setBossArenaCamera(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite | null, locked: boolean) {
      if (bossArenaCameraLocked === locked) return;
      bossArenaCameraLocked = locked;
      activeBossId = locked && boss ? boss.getData("bossId") as BossId : null;
      levelTitle?.setVisible(!locked);
      const camera = scene.cameras.main;
      if (locked && boss) {
        camera.stopFollow();
        camera.pan((Number(boss.getData("left")) + Number(boss.getData("right"))) / 2,
          SCREEN_HEIGHT / 2, 650, "Sine.easeInOut", true);
      } else {
        camera.panEffect.reset();
        camera.startFollow(player, true, 0.12, 0.12, 0, 45);
      }
      syncStats();
    }

    function beginKilinaMove(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, move: string, followUp = false) {
      const now = scene.time.now;
      // If crowded, use the axe rather than fire backwards through her own gun.
      if (move === "cannon_burst" && Math.abs(player.x - boss.x) < 215) move = "leap_slam";
      const phaseTwo = boss.getData("phase") === 2;
      const direction = player.x < boss.x ? -1 : 1;
      const tellMs = followUp ? 420 : move === "leap_slam" ? phaseTwo ? 650 : 800 : phaseTwo ? 540 : 680;
      const left = boss.getData("left") as number;
      const right = boss.getData("right") as number;
      boss.setVelocity(0, 0).setData("attackState", "tell").setData("move", move).setData("facing", direction)
        .setData("stateStartedAt", now).setData("attackTellUntil", now + tellMs)
        .setData("startX", boss.x).setData("followUp", followUp).setData("shotsInBurst", 0).setData("lastBurstAt", -9999)
        .setData("aimX", player.x).setData("aimY", player.y - 90)
        .setData("targetX", Phaser.Math.Clamp(move === "leap_slam" ? player.x
          : boss.x + direction * Phaser.Math.Clamp(Math.abs(player.x - boss.x) + 90, 280, 430), left + 10, right - 10));
    }

    function recoverKilina(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite) {
      const duration = bossCounterWindow(Number(boss.getData('phase')));
      boss.setVelocity(0, 0).setData("attackState", "recover").setData("stateStartedAt", scene.time.now)
        .setData('recoveryDuration', duration).setData("recoverUntil", scene.time.now + duration)
        .setData("attacksCompleted", Number(boss.getData("attacksCompleted")) + 1);
      bossTellMarker?.setVisible(false);
      bossAttackWarning?.clear();
    }

    function isBossVulnerable(boss: Phaser.Physics.Arcade.Sprite, now: number) {
      return Boolean(boss.getData("engaged")) && boss.getData("attackState") === "recover"
        && now < Number(boss.getData("recoverUntil"));
    }

    function updateBossGuard(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite) {
      if (!bossGuardVisual) return;
      bossGuardVisual.clear();
      if (!boss.getData("engaged")) return;
      const open = isBossVulnerable(boss, scene.time.now);
      const pulse = bossVulnerabilityCue?.reducedMotion ? .8 : 0.65 + Math.sin(scene.time.now / 100) * 0.15;
      if (open) {
        // A shrinking gold arc and foot ring mark the time left to counter.
        const duration = Number(boss.getData("recoveryDuration") ?? bossCounterWindow(Number(boss.getData('phase'))));
        const fraction = Phaser.Math.Clamp((Number(boss.getData("recoverUntil")) - scene.time.now) / duration, 0, 1);
        bossGuardVisual.lineStyle(4, 0xffdc80, pulse).strokeEllipse(boss.x, boss.y - 7, 155, 29);
        bossGuardVisual.beginPath().arc(boss.x, boss.y - 132, 88, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2, false).strokePath();
      } else {
        bossGuardVisual.lineStyle(2, 0xcaa0ff, 0.35).strokeEllipse(boss.x, boss.y - 126, 150, 235);
      }
    }

    function hitKilinaAxe(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, landing = false) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const floor = boss.getData("floorY") as number;
      const direction = boss.getData("facing") as number;
      const hit = landing
        ? new Phaser.Geom.Rectangle(boss.x - 112, floor - 52, 224, 55)
        : new Phaser.Geom.Rectangle(boss.x + (direction > 0 ? 20 : -165), floor - 133, 145, 92);
      if (!Phaser.Geom.Rectangle.Overlaps(hit, new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height))) return;
      const before = lastDamageAt;
      damagePlayer(scene, landing ? 15 : 16, false);
      if (before !== lastDamageAt && !isRespawning) {
        body.setVelocity((player.x < boss.x ? -1 : 1) * 300, -250);
        movementLockedUntil = scene.time.now + 150;
      }
    }

    function fireKilinaRound(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, index: number) {
      const direction = boss.getData("facing") as number;
      const muzzleX = boss.x + direction * 153;
      const muzzleY = boss.y - 175;
      const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, boss.getData("aimX") as number, boss.getData("aimY") as number)
        + [0, -0.035, 0.035, -0.08, 0.08][index];
      const round = projectiles.create(muzzleX, muzzleY, "boss_bullet") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const speed = boss.getData("phase") === 2 ? 510 : 440;
      round.setData("enemyProjectile", true).setData("kilinaShot", true).setData("damage", 11)
        .setData("bossShotExpiresAt", scene.time.now + 2200).setDepth(18).setDisplaySize(30, 18).setRotation(angle).setTint(0xe4b0ff)
        .setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      round.body.setSize(round.width * 0.75, round.height * 0.65, true).setAllowGravity(false);
      const flash = scene.add.ellipse(muzzleX, muzzleY, 26, 18, 0xf6cdff, 0.9).setDepth(19);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 1.8, duration: 100, onComplete: () => flash.destroy() });
      boss.setData("lastBurstAt", scene.time.now);
    }

    function landKilina(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite) {
      hitKilinaAxe(scene, boss, true);
      scene.cameras.main.shake(170, 0.005);
      const floor = boss.getData("floorY") as number;
      const ripple = scene.add.image(boss.x, floor - 6, "boss_tell_ring").setDisplaySize(230, 42).setTint(0xd8a4ff).setDepth(15);
      scene.tweens.add({ targets: ripple, alpha: 0, scaleX: ripple.scaleX * 1.5, duration: 330, onComplete: () => ripple.destroy() });
      if (boss.getData("phase") === 2) {
        [-1, 1].forEach(direction => {
          const wave = projectiles.create(boss.x + direction * 55, floor - 15, "boss_ink_orb") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          wave.setData("enemyProjectile", true).setData("kilinaShot", true).setData("damage", 10)
            .setData("bossShotExpiresAt", scene.time.now + 1300).setDisplaySize(54, 26).setTint(0xd8a4ff).setDepth(18)
            .setVelocityX(direction * 280);
          wave.body.setSize(wave.width * 0.75, wave.height * 0.6, true).setAllowGravity(false);
        });
      }
      recoverKilina(scene, boss);
    }

    function updateKilina(scene: Phaser.Scene, boss: Phaser.Physics.Arcade.Sprite, now: number) {
      const floor = boss.getData("floorY") as number;
      const left = boss.getData("left") as number;
      const right = boss.getData("right") as number;
      const distance = Math.abs(player.x - boss.x);
      bossAttackWarning?.clear();
      bossTellMarker?.setVisible(false);
      if (distance > 1100 || player.x < left - (boss.getData("engaged") ? 280 : 200)) {
        placeBossAt(boss, boss.x, floor);
        boss.setData("engaged", false).setData("attackState", "patrol");
        setBossArenaCamera(scene, boss, false);
        showKilinaPose(boss, 0, 0, 1 + Math.sin(now / 220) * 0.004);
        return;
      }
      if (!boss.getData("engaged")) {
        boss.setData("engaged", true).setData("nextAttackAt", now + 850);
      }
      setBossArenaCamera(scene, boss, true);
      let state = boss.getData("attackState") as string;
      const move = boss.getData("move") as string;
      const phaseTwo = boss.getData("phase") === 2;
      const facing = boss.getData("facing") as number;
      boss.x = Phaser.Math.Clamp(boss.x, left, right);

      if (boss.getData("phasePending") && (state === "patrol" || state === "recover" && now >= Number(boss.getData("recoverUntil")))) {
        boss.setVelocity(0, 0).setData("phase", 2).setData("phasePending", false).setData("attackState", "phase")
          .setData("attackIndex", 1).setData("stateStartedAt", now).setData("phaseUntil", now + 950);
        state = "phase";
        scene.cameras.main.shake(200, 0.003);
      }
      if (state === "phase") {
        const elapsed = now - (boss.getData("stateStartedAt") as number);
        showKilinaPose(boss, 1, -facing * Math.sin(elapsed / 85) * 3, 1 + Math.sin(elapsed / 100) * 0.015);
        bossTellMarker?.setPosition(boss.x, floor - 8).setDisplaySize(170, 45).setTint(0xffa7f5).setVisible(true);
        if (now >= (boss.getData("phaseUntil") as number)) beginKilinaMove(scene, boss, "axe_dash");
        return;
      }
      if (state === "tell") {
        boss.setVelocity(0, 0);
        const progress = Phaser.Math.Clamp((now - Number(boss.getData("stateStartedAt")))
          / (Number(boss.getData("attackTellUntil")) - Number(boss.getData("stateStartedAt"))), 0, 1);
        showKilinaPose(boss, move === "cannon_burst" ? 4 : 1, -facing * progress * (move === "cannon_burst" ? 2 : 7), 1 - Math.sin(progress * Math.PI) * 0.035);
        const targetX = boss.getData("targetX") as number;
        if (move === "leap_slam") {
          bossTellMarker?.setPosition(targetX, floor - 5).setDisplaySize(224, 42).setTint(0xe9a8ff).setAlpha(0.45 + progress * 0.45).setVisible(true);
        } else if (bossAttackWarning) {
          bossAttackWarning.lineStyle(3, 0xf0c6ff, 0.25 + progress * 0.5);
          if (move === "axe_dash") {
            bossAttackWarning.lineBetween(boss.x, floor - 12, targetX, floor - 12);
            bossAttackWarning.fillStyle(0xf0c6ff, 0.6).fillTriangle(targetX, floor - 12, targetX - facing * 20, floor - 24, targetX - facing * 20, floor);
          } else bossAttackWarning.lineBetween(boss.x + facing * 153, floor - 175, Number(boss.getData("aimX")), Number(boss.getData("aimY")));
        }
        if (now >= Number(boss.getData("attackTellUntil"))) {
          boss.setData("attackState", "attack").setData("stateStartedAt", now).setData("startX", boss.x);
        }
        return;
      }
      if (state === "attack") {
        const elapsed = now - Number(boss.getData("stateStartedAt"));
        const startX = boss.getData("startX") as number;
        const targetX = boss.getData("targetX") as number;
        if (move === "axe_dash") {
          const t = Phaser.Math.Clamp(elapsed / (phaseTwo ? 500 : 620), 0, 1);
          placeBossAt(boss, Phaser.Math.Linear(startX, targetX, 1 - (1 - t) ** 2), floor);
          showKilinaPose(boss, t < 0.67 ? 2 : 3, facing * (t < 0.67 ? -5 : 4), 1 - Math.sin(t * Math.PI) * 0.025);
          if (t > 0.12 && t < 0.78) hitKilinaAxe(scene, boss);
          if (t >= 1) {
            if (phaseTwo && !boss.getData("followUp") && Math.abs(player.x - boss.x) > 140) beginKilinaMove(scene, boss, "axe_dash", true);
            else recoverKilina(scene, boss);
          }
        } else if (move === "cannon_burst") {
          const count = phaseTwo ? 5 : 3;
          const fired = Number(boss.getData("shotsInBurst"));
          if (fired < count && elapsed >= fired * 190) {
            fireKilinaRound(scene, boss, fired);
            boss.setData("shotsInBurst", fired + 1);
          }
          placeBossAt(boss, Phaser.Math.Clamp(startX - facing * Math.min(60, elapsed * 0.07), left, right), floor);
          const recoil = Phaser.Math.Clamp((now - Number(boss.getData("lastBurstAt"))) / 140, 0, 1);
          showKilinaPose(boss, recoil < 0.65 ? 5 : 4, -facing * (1 - recoil) * 4, 1);
          if (elapsed >= count * 190 + 170) recoverKilina(scene, boss);
        } else {
          const t = Phaser.Math.Clamp(elapsed / (phaseTwo ? 800 : 960), 0, 1);
          placeBossAt(boss, Phaser.Math.Linear(startX, targetX, Phaser.Math.SmoothStep(t, 0, 1)), floor - Math.sin(t * Math.PI) * 175);
          showKilinaPose(boss, 6, facing * (t - 0.5) * 16, 1.025);
          bossTellMarker?.setPosition(targetX, floor - 5).setDisplaySize(224, 42).setTint(0xe9a8ff).setVisible(true);
          if (t >= 1) landKilina(scene, boss);
        }
        return;
      }
      if (state === "recover") {
        boss.setVelocity(0, 0);
        const elapsed = now - Number(boss.getData("stateStartedAt"));
        const remaining = Number(boss.getData("recoverUntil")) - now;
        showKilinaPose(boss, remaining < 220 || move === "cannon_burst" ? 0 : move === "leap_slam" ? 7 : 3,
          facing * Math.max(0, 1 - elapsed / 700) * 4, 1 - Math.sin(Math.min(1, elapsed / 700) * Math.PI) * 0.025);
        if (remaining <= 0) boss.setData("attackState", "patrol").setData("nextAttackAt", now + (phaseTwo ? 450 : 650));
        return;
      }

      boss.setY(floor);
      const direction = player.x < boss.x ? -1 : 1;
      boss.setData("facing", direction).setFlipX(direction < 0);
      const desired = distance > 345 ? direction * (phaseTwo ? 145 : 112) : distance < 225 ? -direction * 145 : 0;
      const velocity = boss.x <= left + 2 && desired < 0 || boss.x >= right - 2 && desired > 0 ? 0 : desired;
      boss.setVelocityX(velocity);
      if (Math.abs(velocity) > 1) {
        setBossAttackPose(boss, "killinas_daughter", direction, null);
        boss.anims.play(getBossAnimationKey(BOSS_DEFINITIONS.killinas_daughter), true);
        boss.anims.timeScale = phaseTwo ? 1.65 : 1.3;
      } else showKilinaPose(boss, 0, 0, 1 + Math.sin(now / 180) * 0.006);
      if (now >= Number(boss.getData("nextAttackAt")) && distance < 950) {
        const index = Number(boss.getData("attackIndex"));
        const pattern = phaseTwo ? ["axe_dash", "leap_slam", "cannon_burst", "axe_dash", "cannon_burst"] : ["axe_dash", "cannon_burst", "leap_slam"];
        boss.setData("attackIndex", index + 1);
        beginKilinaMove(scene, boss, distance > 650 ? "cannon_burst" : pattern[index % pattern.length]);
      }
    }

    function fireEnemyPulse(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite, damage: number, tint: number, speed = 220, lockedTarget?:{x:number;y:number}) {
      const direction = (lockedTarget?.x??player.x) < enemy.x ? -1 : 1;
      const source = enemy.body as Phaser.Physics.Arcade.Body;
      const target = player.body as Phaser.Physics.Arcade.Body;
      const pulse = projectiles.create(source.center.x + direction * 32, source.center.y - 4, "boss_ink_orb") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const angle = Phaser.Math.Angle.Between(pulse.x, pulse.y, lockedTarget?.x??target.center.x, lockedTarget?.y??target.center.y);
      pulse.setData("enemyProjectile", true).setData("damage", damage).setDepth(18).setTint(tint).setDisplaySize(28, 24);
      pulse.setData('bossShotExpiresAt',scene.time.now+3200).setData('sourceKind',enemy.getData('kind'));
      pulse.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      pulse.body.setSize(pulse.width * 0.7, pulse.height * 0.7, true);
      pulse.body.setAllowGravity(false);
    }

    function firePlayerShot(scene: Phaser.Scene) {
      const activeShots = projectiles.getChildren().filter((child) => {
        const shot = child as Phaser.Physics.Arcade.Sprite;
        return shot.active && shot.getData("playerShotExpiresAt");
      }).length;
      if (activeShots >= 3) return false;

      const body = player.body as Phaser.Physics.Arcade.Body;
      if(!isXGod){
        updatePlayerVisual(scene,isPlayerGrounded(body),0);
        if(isPlayerGrounded(body)&&Math.abs(body.velocity.x)<80)player.setTexture('hero_blaster_attack',1);
      }
      if (equipment.active==='blaster' && isXGod && useSideScrollXGodRun && isPlayerGrounded(body) && Math.abs(body.velocity.x) <= 18) {
        // Releasing crouch and firing should use the raised barrel immediately.
        player.anims.stop();
        player.setTexture("runner_blaster-attack", useDrawnXGod ? 1 : 0);
      }
      // Use the rendered hand/prop socket so shots follow the barrel in every pose.
      const action = player.texture.key.replace("runner_", "");
      const attachmentSet=useDrawnXGod?'xgod_drawn_meta':action==='blaster-run'?'xgod_blaster_run_v3_meta':action==='blaster-jump'?'xgod_jump_v3_meta':'xgod_motion_v2_meta';
      const attachment = !hasFlameSword && scene.cache.json.get(attachmentSet)?.actions[action]?.attachments[Number(player.frame.name)];
      const heldMuzzle=heroAttachment(scene,'muzzle');
      const muzzleX = heldMuzzle?.x ?? (attachment?.muzzle
        ? player.x + facingDirection * (attachment.muzzle[0] - (useDrawnXGod?384:256)) * player.scaleX
        : player.x + facingDirection * (hasFlameSword ? 76 : 82));
      const muzzleY = heldMuzzle?.y ?? (attachment?.muzzle
        ? player.y + (attachment.muzzle[1] - 480) * player.scaleY
        : player.y - (hasFlameSword ? 72 : 92));
      const shot = projectiles.create(muzzleX, muzzleY, "player_ink_shot") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shot.setData("damage", hasFlameSword ? 1 : 2).setData("playerShotExpiresAt", scene.time.now + 900)
        .setDepth(22).setFlipX(facingDirection < 0).setVelocityX(facingDirection * 650);
      if (hasFlameSword) shot.setTint(0xffb35c);
      shot.body.setSize(27, 13, true).setAllowGravity(false);

      // An enemy inside the drawn barrel must be hit before the shot spawns past it.
      const barrelPath = new Phaser.Geom.Rectangle(facingDirection > 0 ? player.x + 16 : muzzleX,
        muzzleY - 8, Math.max(0, Math.abs(muzzleX - player.x) - 16), 16);
      const closeTarget = enemies.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite)
        .filter((enemy) => {
          if (!enemy.active) return false;
          const target = enemy.body as Phaser.Physics.Arcade.Body;
          return Phaser.Geom.Rectangle.Overlaps(barrelPath, new Phaser.Geom.Rectangle(target.x, target.y, target.width, target.height));
        }).sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
      if (closeTarget) {
        shot.destroy();
        damageEnemy(scene, closeTarget, hasFlameSword ? 1 : 2, true);
      }

      const flash = scene.add.ellipse(muzzleX, muzzleY, 26, 20, 0xf4f0b3, 0.85).setDepth(21);
      scene.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 0.3, alpha: 0, duration: 90, onComplete: () => flash.destroy() });
      shotsFired += 1;
      playSfx('blaster');
      return true;
    }

    function cleanupProjectiles() {
      projectiles.getChildren().forEach((child) => {
        const projectile = child as Phaser.Physics.Arcade.Sprite;
        if (projectile.active && (projectile.x < -160 || projectile.x > worldWidth + 160 || projectile.y < -160 || projectile.y > WORLD_HEIGHT + 160 || (projectile.getData("dinioShotExpiresAt") && latestSceneTime > projectile.getData("dinioShotExpiresAt")) || (projectile.getData("playerShotExpiresAt") && latestSceneTime > projectile.getData("playerShotExpiresAt")) || (projectile.getData("bossShotExpiresAt") && latestSceneTime > projectile.getData("bossShotExpiresAt")))) {
          projectile.destroy();
        }
      });
    }

    function updateBossHud(scene: Phaser.Scene) {
      bossGuardVisual?.clear();
      if (!bossHudText) return;
      const boss = enemies.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite).find((enemy) => enemy.active && enemy.getData("kind") === "boss");
      if (!boss || !boss.getData("engaged")) {
        bossVulnerabilityCue?.hide();
        bossHudText.setVisible(false);
        bossHudFrame?.setVisible(false);
        bossHudFill?.setVisible(false);
        return;
      }
      const config = BOSS_DEFINITIONS[boss.getData("bossId") as BossId];
      // Keep the leaping boss's face clear of the health display.
      const kilinaHud = boss.getData("bossId") === "killinas_daughter";
      const compactHud = scene.scale.displaySize.height < 500;
      bossHudText.setY(compactHud ? 96 : 24);
      bossHudFrame?.setY(compactHud ? 126 : 49);
      bossHudFill?.setY(compactHud ? 126 : 49);
      const ratio = Phaser.Math.Clamp((boss.getData("hp") as number) / (boss.getData("maxHp") as number), 0, 1);
      const state = boss.getData("attackState") as string;
      const phase = Number(boss.getData("phase") ?? 1);
      const kilinaMove = boss.getData("move");
      const kilinaOpen = isBossVulnerable(boss, scene.time.now);
      const pose = bossAttackVisual?.active && bossAttackVisual.visible ? bossAttackVisual : boss;
      bossVulnerabilityCue?.update(boss, pose, kilinaOpen, Number(boss.getData('recoverUntil')),
        Number(boss.getData('recoveryDuration') ?? bossCounterWindow(phase)), compactHud);
      updateBossGuard(scene, boss);
      const openingSeconds = Math.max(0, Math.ceil((Number(boss.getData("recoverUntil")) - scene.time.now) / 100) / 10);
      const kilinaIntent = kilinaOpen ? `OPEN ${openingSeconds.toFixed(1)}s - ATTACK!` : state === "phase" ? "GUARDED - SECOND WIND!"
        : state === "tell" || state === "attack" ? kilinaMove === "axe_dash" ? "GUARDED: AXE - JUMP!"
          : kilinaMove === "leap_slam" ? "GUARDED: SLAM - MOVE!" : phase === 2 ? "GUARDED: CANNON - MOVE!" : "GUARDED: CANNON - DUCK!" : "GUARDED";
      const intent = kilinaHud ? kilinaIntent : kilinaOpen ? `OPEN ${openingSeconds.toFixed(1)}s - ATTACK!`
        : state === "phase" ? "GUARDED - SECOND WIND!" : state === "tell" || state === "attack"
          ? `GUARDED: ${BOSS_MOVES[kilinaMove as string]?.hint ?? config.attackName}` : "GUARDED";
      bossHudText.setVisible(true).setText(`${phase > 1 ? `PHASE ${phase}  ·  ` : ""}${config.name}  ${Math.round(Number(boss.getData("hp")) * 10) / 10} / ${boss.getData("maxHp")}  -  ${intent}`);
      bossHudText.setColor(kilinaOpen ? "#ffdf8c" : "#d6b7ff");
      bossHudFrame?.setVisible(true);
      bossHudFill?.setVisible(true).setDisplaySize(404 * ratio, 14).setFillStyle(kilinaOpen ? 0xffdc80 : 0x9970bf);
    }

    function updatePlayerVisual(scene: Phaser.Scene, grounded: boolean, delta: number) {
      player.setFlipX(facingDirection < 0);
      const body = player.body as Phaser.Physics.Arcade.Body;
      if(!isXGod){
        if(!grounded){
          if(!jumpVisualAirborne||body.velocity.y< -300&&lastAirborneVelocity>=0)jumpVisualStartedAt=scene.time.now;
          jumpVisualAirborne=true;lastAirborneVelocity=body.velocity.y;landingVisualStartedAt=-9999;
        }else if(jumpVisualAirborne){
          if(lastAirborneVelocity>180)landingVisualStartedAt=scene.time.now;
          jumpVisualAirborne=false;
        }
        if (isZGod) {
          updateZGodVisual(scene, grounded, delta);
          return;
        }
        if(equipment.active!=='hands'&&scene.textures.exists(`hero_${equipment.active}_idle`)){
          updateEquippedHeroVisual(scene,grounded,delta);
          return;
        }
      }
      if(selectedCharacterId==='teleportation_c'){
        const now=scene.time.now;
        player.anims.stop();player.setAlpha(now<teleport.phaseUntil ? .55 : 1);
        if(now<teleport.phaseUntil){
          player.setTexture('teleportation_c_dash',Math.min(3,Math.floor((now-teleport.lastAt)/35))).setAngle(0);
        }else if(now<attackVisualUntil){
          const elapsed=now-attackStartedAt+(blinkStrikeVisual?65:0);
          player.setTexture('character_attack',elapsed<65?0:elapsed<125?1:elapsed<205?2:elapsed<285?3:4).setAngle(0);
        }else if(!grounded){
          const frame=now-jumpVisualStartedAt<60?0:body.velocity.y< -180?1:body.velocity.y<150?2:3;
          player.setTexture('character_jump',frame).setAngle(Phaser.Math.Clamp(body.velocity.x*.006+body.velocity.y*.002,-6,6));
        }else if(now-landingVisualStartedAt<90){
          player.setTexture('character_land').setAngle(0);
        }else if(Math.abs(body.velocity.x)>18){
          teleportStride+=Math.abs(body.velocity.x)*delta/1000;
          player.setTexture('character_walk',[0,1,2,3][Math.floor(teleportStride/32)%4]).setAngle(Math.sin(teleportStride/32*Math.PI)*1.2+(isSkidding?-facingDirection*4:facingDirection*1.5));
        }else{
          teleportStride=0;player.setTexture('character_idle').setAngle(Math.sin(now/300)*.45);
        }
        // Original drawings have different transparent foot margins; keep their feet on the collider.
        const pose=player.texture.key,frame=Number(player.frame.name)||0;
        const baseline=pose==='character_walk'?[344,335,341,335][frame%4]:pose==='character_attack'?[338,338,339,338,339][Math.min(frame,4)]
          :pose==='teleportation_c_dash'?[351,344,349,344][frame%4]:480;
        player.setOrigin(.5,baseline/player.height);
        body.setSize(96,270,false).setOffset((player.width-96)/2,baseline-270);
        return;
      }
      if(!isXGod){
        const now=scene.time.now;
        player.anims.stop();
        if(now<attackVisualUntil){
          const elapsed=now-attackStartedAt;
          player.setTexture('character_attack',elapsed<100?0:elapsed<215?1:2).setAngle(0);
        }else if(!grounded){
          const frame=now-jumpVisualStartedAt<60?0:body.velocity.y< -180?1:body.velocity.y<150?2:3;
          player.setTexture('character_jump',frame).setAngle(Phaser.Math.Clamp(body.velocity.x*.003,-2,2));
        }else if(now-landingVisualStartedAt<(Math.abs(body.velocity.x)>80?65:120)){
          player.setTexture('character_jump',0).setAngle(0);
        }else if(now<shotRecoilUntil&&Math.abs(body.velocity.x)<80){
          player.setTexture('character_attack',now-lastShotAt<95?1:2).setAngle(0);
        }else if(Math.abs(body.velocity.x)>18){
          const stride=selectedCharacterId==='barrett'?27:selectedCharacterId==='nico'?31:29;
          characterStride+=Math.abs(body.velocity.x)*delta/1000;
          player.setTexture('character_walk',Math.floor(characterStride/stride)%8)
            .setAngle(isSkidding?-facingDirection*4:0);
        }else{
          characterStride=0;
          player.setTexture('character_idle').setAngle(Math.sin(now/(selectedCharacterId==='barrett'?380:460))*.35);
        }
        player.setOrigin(.5,480/512);
        body.setSize(96,270,false).setOffset((player.width-96)/2,210);
        return;
      }
      if (isXGod && useSideScrollXGodRun) {
        if (useDrawnXGod) {
          updateDrawnXGodVisual(scene,grounded,delta);
          return;
        }
        const prefix = playerPosePrefix();
        if(!grounded){
          // A stomp/spring replaces the falling motion immediately with a new takeoff.
          if(!jumpVisualAirborne||body.velocity.y< -300&&lastAirborneVelocity>=0)jumpVisualStartedAt=scene.time.now;
          jumpVisualAirborne=true;lastAirborneVelocity=body.velocity.y;landingVisualStartedAt=-9999;
        }else if(jumpVisualAirborne){
          if(scene.time.now-jumpVisualStartedAt>140&&lastAirborneVelocity>180)landingVisualStartedAt=scene.time.now;
          jumpVisualAirborne=false;
        }
        // Collision responds immediately; the art eases down and reverses on release.
        // Jump and attack take over immediately instead of waiting for the rise frames.
        const crouchTarget = isCrouching ? 1 : 0;
        crouchVisualProgress = !grounded || !isCrouching && (scene.time.now < attackVisualUntil || scene.time.now < shotRecoilUntil)
          ? 0 : Phaser.Math.Clamp(crouchVisualProgress + (crouchTarget ? 1 : -1) * delta / 180, 0, 1);
        if (isCrouching || crouchVisualProgress > 0) {
          player.anims.stop();
          player.setTexture(`${prefix}crouch`, Math.round(crouchVisualProgress * (prefix==='runner_'?3:5)));
        } else if (equipment.active==='blaster' && grounded && Math.abs(body.velocity.x) <= 18 && scene.time.now < shotRecoilUntil) {
          player.anims.stop();
          player.setTexture("runner_blaster-attack", Math.min(7, Math.floor((scene.time.now - lastShotAt) / 23)));
        } else if (scene.time.now < attackVisualUntil) {
          player.anims.stop();
          const elapsed = scene.time.now - attackStartedAt;
          if (hasFlameSword && scene.textures.exists("xgod_side_scroll_fire_sword_attack_v1")) {
            // Play the complete hand-drawn wind-up, slash, follow-through, and recovery.
            const frame = elapsed < 48 ? 0
              : elapsed < 104 ? 1
                : elapsed < 164 ? 2
                  : elapsed < 226 ? 3
                    : elapsed < 318 ? 4
                      : 5;
            player.setTexture("xgod_side_scroll_fire_sword_attack_v1", frame);
          } else {
            const frame = elapsed < 130 ? Math.floor(elapsed / 45) : elapsed < 275 ? 3 : Math.min(7, 4 + Math.floor((elapsed - 275) / 39));
            player.setTexture(`${prefix}attack`, frame);
          }
        } else if (!grounded) {
          player.anims.stop();
          const frame = scene.time.now-jumpVisualStartedAt<55&&body.velocity.y< -300 ? 0
            : body.velocity.y< -550 ? 1 : body.velocity.y< -110 ? 2 : body.velocity.y<110 ? 3 : body.velocity.y<450 ? 4 : 5;
          player.setTexture(`${prefix}jump`, frame);
        } else if (scene.time.now-landingVisualStartedAt<(Math.abs(body.velocity.x)>80?65:120)) {
          player.anims.stop();
          player.setTexture(`${prefix}jump`,prefix==='runner_'?5:scene.time.now-landingVisualStartedAt<60?6:7);
        } else if (Math.abs(body.velocity.x) > 18) {
          const key = hasFlameSword && scene.textures.exists("xgod_side_scroll_fire_sword_run_v1")
            ? "xgod_side_scroll_fire_sword_run_v1"
            : `${prefix}run`;
          const animation = getWalkAnimationKey(key);
          if (!scene.anims.exists(animation)) scene.anims.create({ key: animation,
            frames: scene.anims.generateFrameNumbers(key, { start: 0, end: Math.max(0,getPlatformerRunFrameCount(scene,key)-1) }),
            frameRate: key==='runner_blaster-run'?32:16, repeat: -1 });
          player.anims.play(animation, true);
          player.anims.timeScale = Phaser.Math.Clamp(Math.abs(body.velocity.x) / playFeel.runSpeed, 0.45, 1.4);
        } else {
          const key = `${prefix}idle`;
          const animation = getWalkAnimationKey(key);
          if (!scene.anims.exists(animation)) scene.anims.create({ key: animation, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
          player.anims.play(animation, true);
          player.anims.timeScale = 1;
        }
        return;
      }
      if (scene.time.now < attackVisualUntil && !isXGod && scene.anims.exists("platformer_player_attack")) {
        player.anims.play("platformer_player_attack", true);
      } else if (scene.time.now < attackVisualUntil && isXGod && useSideScrollXGodRun && hasFlameSword && scene.textures.exists("xgod_side_scroll_fire_sword_attack_v1")) {
        player.anims.stop();
        const attackElapsed = scene.time.now - attackStartedAt;
        // The full forward slash (frame 3) is held through the impact window.
        const attackFrame = attackElapsed < 48 ? 0
          : attackElapsed < 104 ? 1
            : attackElapsed < 164 ? 2
              : attackElapsed < 226 ? 3
                : attackElapsed < 318 ? 4
                  : 5;
        player.setTexture("xgod_side_scroll_fire_sword_attack_v1", attackFrame);
      } else if (scene.time.now < attackVisualUntil && isXGod && useSideScrollXGodRun && !hasFlameSword && scene.textures.exists("xgod_side_scroll_attack_v2")) {
        player.anims.stop();
        const attackElapsed = scene.time.now - attackStartedAt;
        const attackFrame = attackElapsed < 48 ? 0
          : attackElapsed < 96 ? 1
            : attackElapsed < 138 ? 2
              : attackElapsed < 230 ? 3
                : attackElapsed < 278 ? 4
                  : 5;
        player.setTexture("xgod_side_scroll_attack_v2", attackFrame);
      } else if (scene.time.now < attackVisualUntil && isXGod && scene.textures.exists(hasFlameSword ? "player_sword_attack" : "player_attack")) {
        player.anims.stop();
        if (hasFlameSword && scene.textures.exists("player_sword_attack")) {
          const attackFrame = Math.min(attackComboStep, Math.max(0, scene.textures.get("player_sword_attack").frameTotal - 2));
          player.setTexture("player_sword_attack", attackFrame);
        } else {
          player.setTexture("player_attack");
        }
      } else if (!grounded && isXGod && useSideScrollXGodRun && scene.textures.exists("xgod_side_scroll_jump_v1")) {
        player.anims.stop();
        const jumpFrame = body.velocity.y < -500 ? 0
          : body.velocity.y < -160 ? 1
            : body.velocity.y < 100 ? 2
              : body.velocity.y < 430 ? 3
                : 4;
        player.setTexture("xgod_side_scroll_jump_v1", jumpFrame);
      } else if (!grounded && isXGod && scene.textures.exists("player_jump")) {
        player.anims.stop();
        player.setTexture("player_jump");
      } else if (!grounded && !isXGod && scene.textures.exists("character_jump")) {
        player.anims.stop();
        player.setTexture("character_jump");
      } else if (Math.abs(body.velocity.x) > 18) {
        const walkKey = getPlayerWalkTexture(scene);
        const walkAnimKey = getWalkAnimationKey(walkKey);
        if (scene.textures.exists(walkKey) && !scene.anims.exists(walkAnimKey)) {
          const usableFrames = getPlatformerRunFrameCount(scene, walkKey);
          scene.anims.create({
            key: walkAnimKey,
            frames: scene.anims.generateFrameNumbers(walkKey, { start: 0, end: Math.max(0, usableFrames - 1) }),
            frameRate: walkKey === "xgod_side_scroll_sprint_run_v1" ? 16 : isXGod ? 12 : 10,
            repeat: -1
          });
        }
        if (player.texture.key !== walkKey) player.setTexture(walkKey);
        player.anims.play(walkAnimKey, true);
        const isSideScrollSprint = walkKey === "xgod_side_scroll_sprint_run_v1";
        player.anims.timeScale = Phaser.Math.Clamp(
          Math.abs(body.velocity.x) / playFeel.runSpeed,
          isSideScrollSprint ? 0.95 : 0.7,
          isSideScrollSprint ? 1.5 : 1.35
        );
        lastGroundedRunFrame = Number(player.frame.name) || lastGroundedRunFrame;
      } else {
        const walkKey = getPlayerWalkTexture(scene);
        // Preserve the last grounded run pose when the player releases the direction.
        // Only reset to the first frame when transitioning from a different pose.
        if (player.texture.key !== walkKey) {
          player.setTexture(walkKey);
        }
        player.anims.stop();
        player.setFrame(player.texture.key === walkKey ? lastGroundedRunFrame : 0);
      }
      // Traditional walk/jump/attack frames share a foot baseline, with wider attack cells.
      // Keep their collider on that baseline instead of resetting their movement every frame.
      if(!isXGod)body.setSize(96,270,false).setOffset((player.width-96)/2,player.height-270);
    }

    function updateDrawnXGodVisual(scene:Phaser.Scene,grounded:boolean,delta:number){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      const prefix=playerPosePrefix();
      if(!grounded){
        if(!jumpVisualAirborne||body.velocity.y< -300&&lastAirborneVelocity>=0)jumpVisualStartedAt=now;
        jumpVisualAirborne=true;lastAirborneVelocity=body.velocity.y;landingVisualStartedAt=-9999;
      }else if(jumpVisualAirborne){
        if(now-jumpVisualStartedAt>140&&lastAirborneVelocity>180)landingVisualStartedAt=now;
        jumpVisualAirborne=false;
      }
      player.anims.stop();player.setAngle(0);
      crouchVisualProgress=!grounded?0:Phaser.Math.Clamp(crouchVisualProgress+(isCrouching?1:-1)*delta/150,0,1);
      if(isCrouching||crouchVisualProgress>0){
        player.setTexture(prefix+'crouch',isCrouching?(crouchVisualProgress<.5?0:1):3);
      }else if(now<attackVisualUntil){
        const elapsed=now-attackStartedAt;
        if(hasFlameSword){
          const frame=elapsed<48?0:elapsed<104?1:elapsed<164?2:elapsed<226?3:elapsed<318?4:5;
          player.setTexture('xgod_side_scroll_fire_sword_attack_v1',frame);
        }else player.setTexture(prefix+'attack',elapsed<140?0:elapsed<275?1:2);
      }else if(equipment.active==='blaster'&&grounded&&Math.abs(body.velocity.x)<=18&&now<shotRecoilUntil){
        player.setTexture('runner_blaster-attack',now-lastShotAt<90?1:2);
      }else if(!grounded){
        player.setTexture(prefix+'jump',now-jumpVisualStartedAt<55&&body.velocity.y< -300?0:body.velocity.y< -180?1:body.velocity.y<150?2:3);
      }else if(now-landingVisualStartedAt<(Math.abs(body.velocity.x)>80?65:110)){
        player.setTexture(prefix+'jump',0);
      }else if(isSkidding){
        const frame=Math.min(3,Math.floor((now-skidUntil+TURN_SKID_DURATION_MS)/50));
        player.setTexture(prefix+'skid',Math.max(0,frame));
      }else if(Math.abs(body.velocity.x)>18){
        characterStride+=Math.abs(body.velocity.x)*delta/1000;
        const key=hasFlameSword?'xgod_side_scroll_fire_sword_run_v1':prefix+'run';
        player.setTexture(key,Math.floor(characterStride/27)%8);
      }else{
        characterStride=0;player.setTexture(prefix+'idle',Math.floor(now/170)%4);
      }
      player.setOrigin(.5,480/512);
      const height=isCrouching?160:270;
      body.setSize(96,height,false).setOffset((player.width-96)/2,480-height);
    }

    function updateZGodVisual(scene:Phaser.Scene,grounded:boolean,delta:number){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      const equipped=equipment.active!=='hands';
      const key=(action:string)=>equipped?`hero_${equipment.active}_${action}`:action==='run'?'character_walk':action==='jump'?'character_jump':action==='attack'?'character_attack':'z_idle';
      player.anims.stop();player.setAngle(0).setAlpha(1);
      if(isCrouching){
        player.setTexture(equipped?key('crouch'):'z_crouch',equipped&&equipment.active==='storm'?0:1);
      }else if(now<zGodDashUntil){
        player.setTexture(equipped?key('run'):'z_dash',equipped?Math.floor(now/32)%8:Math.min(3,Math.floor((now-zGodDashUntil+250)/65)));
      }else if(now<attackVisualUntil||equipped&&(equipment.active==='ember'&&now<emberUntil||equipment.active==='storm'&&now-lastPowerAt<300)){
        const elapsed=now-(now<attackVisualUntil?attackStartedAt:lastPowerAt);
        player.setTexture(key('attack'),elapsed<100?0:elapsed<215?1:2);
      }else if(!grounded){
        player.setTexture(key('jump'),now-jumpVisualStartedAt<60?0:body.velocity.y< -180?1:body.velocity.y<150?2:3);
      }else if(now-landingVisualStartedAt<90){
        player.setTexture(key('jump'),0);
      }else if(now<shotRecoilUntil&&Math.abs(body.velocity.x)<80){
        player.setTexture(key('attack'),now-lastShotAt<95?1:2);
      }else if(Math.abs(body.velocity.x)>18){
        characterStride+=Math.abs(body.velocity.x)*delta/1000;
        player.setTexture(key('run'),Math.floor(characterStride/27)%8).setAngle(isSkidding?-facingDirection*4:0);
      }else if(!equipped&&now<zGodVictoryUntil){
        player.setTexture('z_victory',Math.floor(now/180)%2);
      }else if(!equipped&&now<zGodReactUntil){
        player.setTexture('z_react',Math.floor(now/150)%2);
      }else{
        characterStride=0;player.setTexture(key('idle'),equipped?0:Math.floor(now/220)%4);
      }
      player.setOrigin(.5,480/512);
      const height=isCrouching?135:heroBodyHeight;
      body.setSize(heroBodyWidth,height,false).setOffset((player.width-heroBodyWidth)/2,480-height);
    }

    function updateEquippedHeroVisual(scene:Phaser.Scene,grounded:boolean,delta:number){
      const now=scene.time.now,body=player.body as Phaser.Physics.Arcade.Body;
      const prefix=`hero_${equipment.active}_`;
      const count=(action:string)=>Math.max(1,scene.textures.get(prefix+action).frameTotal-1);
      const phasing=selectedCharacterId==='teleportation_c'&&now<teleport.phaseUntil;
      player.anims.stop();player.setAlpha(phasing?.55:1).setAngle(0);
      if(phasing){
        player.setTexture(prefix+'run',Math.floor((now-teleport.lastAt)/35)%count('run'));
      }else if(now<attackVisualUntil){
        const elapsed=now-attackStartedAt+(blinkStrikeVisual?65:0);
        const frame=count('attack')===1?0:elapsed<100?0:elapsed<215?1:2;
        player.setTexture(prefix+'attack',Math.min(count('attack')-1,frame));
      }else if(equipment.active==='ember'&&now<emberUntil||equipment.active==='storm'&&now-lastPowerAt<300){
        player.setTexture(prefix+'attack',0);
      }else if(now<shotRecoilUntil&&grounded&&(equipment.active==='frost'||Math.abs(body.velocity.x)<80)){
        player.setTexture(prefix+'attack',count('attack')===1?0:now-lastShotAt<95?1:2);
      }else if(!grounded){
        const frame=count('jump')===2?(body.velocity.y>100?1:0):now-jumpVisualStartedAt<60?0:body.velocity.y< -180?1:body.velocity.y<150?2:3;
        player.setTexture(prefix+'jump',frame);
      }else if(now-landingVisualStartedAt<(Math.abs(body.velocity.x)>80?65:120)){
        player.setTexture(prefix+'jump',0);
      }else if(Math.abs(body.velocity.x)>18){
        characterStride+=Math.abs(body.velocity.x)*delta/1000;
        const stride=selectedCharacterId==='barrett'?27:selectedCharacterId==='nico'?31:selectedCharacterId==='teleportation_c'?32:29;
        const n=count('run'),distancePerFrame=n===4?stride*2:stride;
        player.setTexture(prefix+'run',Math.floor(characterStride/distancePerFrame)%n).setAngle(isSkidding?-facingDirection*4:0);
      }else{
        characterStride=0;player.setTexture(prefix+'idle',0).setAngle(Math.sin(now/420)*.3);
      }
      player.setOrigin(.5,480/512);
      body.setSize(96,270,false).setOffset((player.width-96)/2,210);
    }

    function heroAttachment(scene:Phaser.Scene,field:'hand'|'muzzle'){
      if(isXGod)return null;
      const match=/^hero_(blaster|frost)_(run|jump|idle|attack|crouch)$/.exec(player.texture.key);
      if(!match)return null;
      const point=scene.cache.json.get('hero_equipment_meta')?.[selectedCharacterId]?.[match[1]]?.[match[2]]?.poses[Number(player.frame.name)]?.[field];
      if(!point)return null;
      const x=(point[0]-384)*player.scaleX*facingDirection,y=(point[1]-480)*player.scaleY;
      const angle=player.rotation;
      return {x:player.x+x*Math.cos(angle)-y*Math.sin(angle),y:player.y+x*Math.sin(angle)+y*Math.cos(angle)};
    }

    function performAttack(scene: Phaser.Scene, comboStep: number,blinkCounter=false) {
      if (equipment.active==='blaster' && (selectedCharacterId === "nico" || selectedCharacterId === "ezra")) {
        const projectile = projectiles.create(player.x + facingDirection * 44, (player.body as Phaser.Physics.Arcade.Body).center.y, "projectile_static") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const projectileDamage = selectedCharacterId === "nico" ? 2 + Math.min(2, comboStep - 1) : 1 + comboStep;
        projectile.setData("damage", projectileDamage).setDepth(18).setScale((selectedCharacterId === "nico" ? 0.38 : 0.32) * (1 + comboStep * 0.08)).setVelocityX(facingDirection * (selectedCharacterId === "nico" ? 540 : 430));
        projectile.body.setSize(64, 50, true);
        projectile.body.setAllowGravity(false);
        playSfx('blaster',{pitch:selectedCharacterId==='nico'?.8:1.15});
        return;
      }

      const blinkStrike=selectedCharacterId==='teleportation_c'&&blinkCounter;
      const swordReach=selectedCharacterId==='xgod'?165:150;
      const attackRange = (equipment.active==='hands'?86+comboStep*8:(hasFlameSword?swordReach:Math.max(playFeel.attackRange,swordReach)) + comboStep * 18)+(blinkStrike?45:0);
      let damage = equipment.active==='hands'?(selectedCharacterId==='barrett'?2:1)+(comboStep===3?1:0):selectedCharacterId === "xgod"
        ? (hasFlameSword ? 2 : 1) + (comboStep === 3 ? 1 : 0)
        : selectedCharacterId === "barrett"
          ? (comboStep === 3 ? 3 : 2)
          : 1 + Math.floor(comboStep / 2);
      if(hasFlameSword)damage=comboStep===3?FLAME_SWORD.finisherDamage:FLAME_SWORD.damage;
      if(blinkStrike){damage+=1;teleport.counterUntil=0;teleport.strikes++;portalBurst(scene,player.x+facingDirection*50,player.y);}
      const hitRect = new Phaser.Geom.Rectangle(
        facingDirection > 0 ? player.x - 12 : player.x - attackRange + 12,
        player.y - 142,
        attackRange,
        172
      );
      const slash = scene.add.image(player.x + facingDirection * 66, player.y - 70, hasFlameSword?'fire_blade':"projectile_static",hasFlameSword?0:undefined)
        .setDepth(22)
        .setScale((isXGod && !hasFlameSword ? 0.35 : 0.7) * facingDirection, isXGod && !hasFlameSword ? 0.35 : 0.7)
        .setAlpha(0.82);
      if(hasFlameSword)slash.setDisplaySize(65,140).setFlipX(facingDirection<0);
      let hits = 0;
      const swordTargets=new Set<Phaser.Physics.Arcade.Sprite>();
      scene.tweens.add({ targets: slash, alpha: 0, scaleX: slash.scaleX * 1.35, scaleY: 0.9, duration: 180 + comboStep * 35, onComplete: () => slash.destroy() });
      enemies.getChildren().forEach((child) => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        const target = enemy.body as Phaser.Physics.Arcade.Body;
        const targetRect = new Phaser.Geom.Rectangle(target.left, target.top, target.width, target.height);
        if (enemy.active && !platformSeparatesPlayerAndEnemy(enemy) && Phaser.Geom.Rectangle.Overlaps(hitRect, targetRect)) {
          hits += 1;
          if(hasFlameSword)swordTargets.add(enemy);
          damageEnemy(scene, enemy, damage);
        }
      });
      if(hasFlameSword){
        const body=player.body as Phaser.Physics.Arcade.Body;
        // Short heroes need the cutting edge clear of the floor, too.
        fireBlades?.launch(player.x+facingDirection*32,Math.min(body.center.y,body.bottom-54),facingDirection,swordTargets);
      }
      attackDebug = { active: true, hits, x: Math.round(hitRect.x), y: Math.round(hitRect.y), w: Math.round(hitRect.width), h: Math.round(hitRect.height) };
      scene.time.delayedCall(260, () => {
        attackDebug = { ...attackDebug, active: false };
      });
    }

    function damageEnemy(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite, damage: number, isLightShot = false, isStomp = false) {
      if (!enemy.active || Number(enemy.getData("hp")) <= 0) return false;
      const targetBody = enemy.body as Phaser.Physics.Arcade.Body;
      const isBoss = enemy.getData("kind") === "boss";
      let appliedDamage = isZGod ? Number(enemy.getData('hp')) : damage;
      if (isBoss && !isZGod) {
        if (!isBossVulnerable(enemy, scene.time.now)) {
          enemy.setData("guardedHits", Number(enemy.getData("guardedHits")) + 1);
          // Blocking must not spend the opening's hit cooldown or interrupt an attack.
          if (scene.time.now >= Number(enemy.getData("guardFlashUntil") ?? 0)) {
            playSfx('shield',{volume:.35,pitch:.78});
            enemy.setData("guardFlashUntil", scene.time.now + 120);
            const block = scene.add.ellipse(targetBody.center.x, targetBody.center.y, 110, 180)
              .setStrokeStyle(4, 0xd5b3ff, 0.9).setDepth(26);
            scene.tweens.add({ targets: block, alpha: 0, scale: 1.15, duration: 140, onComplete: () => block.destroy() });
          }
          return false;
        }
        if (scene.time.now < Number(enemy.getData("damageReadyAt"))) return false;
        appliedDamage *= enemy.getData("bossId") === "ink_behemoth" ? 2 : 1.5;
        enemy.setData("damageReadyAt", scene.time.now + 160)
          .setData("openingHits", Number(enemy.getData("openingHits")) + 1);
      }
      const impact = scene.add.image(targetBody.center.x, targetBody.top + targetBody.height * 0.35, "enemy_hit_impact")
        .setDepth(25).setAlpha(0.9);
      if (currentLevel !== 3) impact.setDisplaySize(isLightShot ? 32 : 50, isLightShot ? 32 : 50);
      else impact.setScale(isLightShot ? 0.34 : 0.52);
      if (currentLevel >= 4 && enemy.getData("kind") === "boss") impact.setTint(currentLevel === 4 ? 0xf04c86 : 0xc084fc);
      scene.tweens.add({ targets: impact, scaleX: impact.scaleX * 1.7, scaleY: impact.scaleY * 1.7, alpha: 0, duration: 170, ease: "quad.out", onComplete: () => impact.destroy() });
      const hp = Math.max(0, (enemy.getData("hp") as number) - appliedDamage);
      playSfx(isStomp?'stomp':isLightShot?'enemyHit':equipment.active==='sword'?'swordHit':'punchHit');
      enemy.setData("hp", hp);
      const baseScale = enemy.getData("baseScale") as number;
      const knockDirection = enemy.x < player.x ? -1 : 1;
      if (isBoss) {
        // Armor absorbs the stagger: attacks remain committed through sword hits.
        const tint = 0xffe7a0;
        enemy.setTint(tint);
        bossAttackVisual?.setTint(tint);
        scene.time.delayedCall(90, () => {
          if (!enemy.active) return;
          enemy.clearTint();
          bossAttackVisual?.clearTint();
        });
        if (hp > 0 && enemy.getData("phase") === 1 && hp <= Number(enemy.getData("maxHp")) / 2) enemy.setData("phasePending", true);
      } else if (isLightShot) {
        enemy.setTint(0xfff5b1);
        scene.time.delayedCall(85, () => { if (enemy.active) enemy.clearTint(); });
      } else {
        if(isRestoredEnemy(enemy.getData('kind')))clearEnemyIntent(enemy);
        enemy.setData("hurtUntil", scene.time.now + 180).setTint(0xff5b5b);
        enemy.setData("attackState", "patrol");
        enemy.setScale(baseScale * 1.14, baseScale * 0.82);
        enemy.setVelocityX(knockDirection * (damage >= 3 ? 330 : 240));
        enemy.setVelocityY(-150);
        scene.tweens.add({ targets: enemy, scaleX: baseScale, scaleY: baseScale, duration: 150, ease: "quad.out" });
        scene.time.delayedCall(180, () => { if (enemy.active) enemy.clearTint(); });
        if (!isStomp) triggerHitStop(scene, damage >= 3 ? 75 : 55);
      }
      if (hp <= 0) {
        if (isZGod && isBoss) zGodVictoryUntil=scene.time.now+2200;
        currentKills += 1;
        currentScore += isBoss ? 1500 : 150;
        if (isBoss) {
          playBossDefeat(scene, enemy);
        } else {playSfx('enemyDeath');enemy.destroy();}
        syncStats();
      }
      return true;
    }

    function playBossDefeat(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite) {
      playSfx('bossDeath');
      const bossId = enemy.getData("bossId") as BossId;
      const bossX = enemy.x;
      const floorY = Number(enemy.getData('floorY'));
      const startY = Math.min(enemy.y, floorY);
      const facing = Number(enemy.getData('facing')) < 0 ? -1 : 1;
      bossDeathVisual = scene.add.sprite(bossX, startY, bossDeathTexture(bossId), '0')
        .setOrigin(.5, 600/640).setScale(BOSS_DEFINITIONS[bossId].scale)
        .setFlipX(BOSS_DEATH_BASE_FACING[bossId] !== facing).setDepth(14);
      const death = bossDeathVisual;
      bossDeathId = bossId;
      bossDeathStartedAt = scene.time.now;
      bossDeathStage = "recoil";
      // The attack sprite is independent of the physics enemy; both must leave combat.
      bossAttackVisual?.destroy();
      bossAttackVisual = null;
      bossTellMarker?.setVisible(false);
      bossAttackWarning?.clear();
      bossGuardVisual?.clear();
      bossHudText?.setVisible(false);
      bossVulnerabilityCue?.hide();
      bossHudFrame?.setVisible(false);
      bossHudFill?.setVisible(false);
      projectiles.getChildren().filter((child) => (child as Phaser.Physics.Arcade.Sprite).getData("enemyProjectile"))
        .forEach((child) => child.destroy());
      scene.tweens.killTweensOf(enemy);
      enemy.destroy();
      scene.cameras.main.shake(220, 0.009);
      // Scene-clock animation freezes with Pause. A removed physics enemy can
      // neither hit the player nor receive another score/reward during collapse.
      scene.tweens.addCounter({ from: 0, to: BOSS_DEFEAT_DURATION, duration: BOSS_DEFEAT_DURATION,
        onUpdate: tween => {
          if (!death.active) return;
          const elapsed = tween.getValue() ?? 0, pose = bossDeathPose(elapsed);
          bossDeathStage = pose.stage;
          death.setFrame(String(pose.frame)).setAlpha(pose.alpha)
            .setY(Phaser.Math.Linear(startY, floorY, Math.min(1, elapsed/540)));
        },
        onComplete: () => {
          death.destroy(); bossDeathVisual = null; bossDeathStage = 'finished';
          setBossArenaCamera(scene, null, false);
          finishBossDefeat(scene, bossId, bossX);
        } });
    }

    function finishBossDefeat(scene: Phaser.Scene, bossId: BossId, x: number) {
      if (bossDefeated) return;
      bossDefeated = true;
      bossBarrier?.destroy();
      bossBarrier = null;
      level.pickups.filter((pickup) => pickup.requiresBossDefeat).forEach((pickup) => addPickup(scene, pickup));
      const notice = scene.add.text(x, 170, `${BOSS_DEFINITIONS[bossId].name} DEFEATED!`, {
        fontFamily: "Gochi Hand, sans-serif", fontSize: "38px", color: "#fef3c7",
        stroke: "#111827", strokeThickness: 7
      }).setOrigin(0.5).setDepth(90);
      scene.tweens.add({ targets: notice, alpha: 0, delay: 1500, duration: 500, onComplete: () => notice.destroy() });
      syncStats();
    }

    function triggerHitStop(scene: Phaser.Scene, duration: number) {
      if (hitStopActive) return;
      hitStopActive = true;
      scene.physics.world.pause();
      window.setTimeout(() => {
        if (scene.sys.isActive()) scene.physics.world.resume();
        hitStopActive = false;
      }, duration);
    }

    function handlePlayerEnemyOverlap(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite) {
      if(signature?.invulnerable)return;
      if(mobility?.contact(enemy, canStomp(enemy))) return;
      if(selectedCharacterId==='teleportation_c'&&scene.time.now<teleport.phaseUntil)return;
      if(emberRemaining>0&&equipment.active==='ember'&&enemy.active&&enemy.getData('kind')!=='boss'){
        if(!emberTargets.has(enemy)){emberTargets.add(enemy);if(damageEnemy(scene,enemy,EMBER_DASH.damage,true))powerHits++;}
        return;
      }
      if (platformSeparatesPlayerAndEnemy(enemy)) return;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const kind = enemy.getData("kind") as EnemyKind;
      const isBoss = kind === "boss";
      // Sprite origins and deliberately compact Arcade bodies do not share a center.
      // Give a descending player a small contact window at the enemy's visible head.
      if (canStomp(enemy)) {
        // In run mode, a clean downward head stomp always removes normal enemies.
        stompEnemy(scene, enemy);
        return;
      }
      if (isZGod) { damagePlayer(scene,0,false); return; }
      const attackState = enemy.getData("attackState") as string;
      const bossConfig = isBoss ? BOSS_DEFINITIONS[enemy.getData("bossId") as BossId] : null;
      if (isBoss && scene.time.now < (enemy.getData("hurtUntil") as number)) return;
      if (scene.time.now - lastDamageAt < 850) return;
      const livesBeforeContact = playerLives;
      const contactDamage = isBoss
        ? attackState === "recover" ? 4 : attackState === "attack"
          && (bossConfig?.attackStyle === "rush" || ["dragon_lunge", "cinder_bound", "shadow_dash", "witch_step"].includes(enemy.getData("move"))) ? 16 : 8
        : kind === "giant" ? 18 : 12;
      damagePlayer(scene, contactDamage, false);
      if (playerLives !== livesBeforeContact) return;
      const knockDirection = player.x < enemy.x ? -1 : 1;
      body.setVelocity(knockDirection * 280, -240);
      movementLockedUntil = scene.time.now + 180;
    }

    function tryHeadStomp(scene: Phaser.Scene) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y <= 0) return false;

      const target = enemies.getChildren()
        .map((child) => child as Phaser.Physics.Arcade.Sprite)
        .find((enemy) => {
          return canStomp(enemy);
        });

      if (!target) return false;
      stompEnemy(scene, target);
      return true;
    }

    function canStomp(enemy: Phaser.Physics.Arcade.Sprite) {
      if (!enemy.active || platformSeparatesPlayerAndEnemy(enemy)) return false;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const target = enemy.body as Phaser.Physics.Arcade.Body;
      return body.velocity.y > 0 && body.right > target.left + 3 && body.left < target.right - 3
        && body.prev.y + body.height <= target.top + 16 && body.bottom >= target.top - 4;
    }

    function platformSeparatesPlayerAndEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const target = enemy.body as Phaser.Physics.Arcade.Body;
      // A walker beneath a thin roof must not hurt (or be stomped by) its rider.
      return level.platforms.some(rect => body.bottom <= rect.y + 4 && target.top >= rect.y - 12
        && target.center.y >= rect.y + rect.h && body.right > rect.x + 2 && body.left < rect.x + rect.w - 2);
    }

    function stompEnemy(scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite) {
      if (!enemy.active) return;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const isBoss = enemy.getData("kind") === "boss";
      const touch = window.__unknownUniverseTouchControls ?? {};
      const boosted = !isBoss && (jumpKey.isDown || jumpAltKey.isDown || Boolean(touch.jump || touch.up));
      const targetBody = enemy.body as Phaser.Physics.Arcade.Body;
      const contactX = targetBody.center.x;
      const contactY = targetBody.top;
      if (!isBoss) {
        const flatten = scene.add.sprite(enemy.x, targetBody.bottom, enemy.texture.key, enemy.frame.name)
          .setOrigin(enemy.originX, enemy.originY).setDepth(13).setFlipX(enemy.flipX)
          .setScale(enemy.scaleX * 1.15, enemy.scaleY * 0.24);
        scene.tweens.add({ targets: flatten, alpha: 0, scaleX: flatten.scaleX * 1.12,
          duration: 170, onComplete: () => flatten.destroy() });
      }
      const damaged = damageEnemy(scene, enemy, isBoss ? 4 : Number(enemy.getData("hp")), false, true);
      lastGroundedAt = jumpBufferedAt = -9999;
      body.blocked.down = body.touching.down = false;
      lastStompSpeed = isBoss ? 430 : boosted ? STOMP_BOOST_SPEED : STOMP_HOP_SPEED;
      body.setVelocityY(-lastStompSpeed);
      airLaunchKind = isBoss ? "boss-stomp" : "stomp";
      lastStompAt = scene.time.now;
      lastStompBoosted = boosted;
      stompCount += 1;
      stompChain = isBoss ? 0 : stompChain + 1;
      bestStompChain = Math.max(bestStompChain, stompChain);
      const points = isBoss ? damaged ? 50 : 0 : Math.min(1600, 200 * 2 ** (Math.min(stompChain, 4) - 1));
      // Normal defeats already award 150; the bounce bonus makes totals 200/400/800/1600.
      currentScore += isBoss ? points : points - 150;
      if (!isBoss) {
        const pop = scene.add.text(contactX, contactY - 30, `${stompChain > 1 ? `${stompChain} STOMPS! ` : boosted ? "HIGH BOUNCE! " : "BOUNCE! "}+${points}`, {
          fontFamily: "Gochi Hand, sans-serif", fontSize: stompChain > 1 ? "28px" : "22px",
          color: stompChain > 1 ? "#ffe1a0" : "#d7f5a2", stroke: "#253326", strokeThickness: 4
        }).setOrigin(0.5).setDepth(27);
        scene.tweens.add({ targets: pop, y: pop.y - 40, alpha: 0, duration: 650, onComplete: () => pop.destroy() });
        if (boosted) stompHint?.setVisible(false);
      }
      syncStats();
    }

    function damagePlayer(scene: Phaser.Scene, damage: number, forceRespawn: boolean) {
      if(isRespawning||isLevelClearing)return;
      if(!forceRespawn&&signature?.invulnerable)return;
      const now = scene.time.now;
      if (isZGod) {
        if (forceRespawn) {
          isCrouching=false;zGodDashUntil=-9999;movementLockedUntil=-9999;
          jumpVisualAirborne=false;landingVisualStartedAt=-9999;
          placePlayerOnPlatform(checkpoint.x,checkpoint.y);
          setBossArenaCamera(scene,null,false);
          zGodReactUntil=now+350;
          playSfx('teleport');
        } else if (now >= zGodReactReadyAt) {
          zGodReactReadyAt=now+750;zGodReactUntil=now+280;
          playSfx('shield',{volume:.25,pitch:1.3});
        }
        return;
      }
      if(!forceRespawn&&selectedCharacterId==='teleportation_c'&&now<teleport.phaseUntil)return;
      if (now - lastDamageAt < 850) return;
      const safeDamage = Number.isFinite(damage) && damage > 0 ? damage : 0;
      if (safeDamage === 0) return;
      lastDamageAt = now;
      stompChain = 0;
      if (inkShieldReady && !forceRespawn) {
        inkShieldReady = false;
        playSfx('shield');
        syncStats();
        return;
      }
      playerHealth = Math.max(0, playerHealth - safeDamage);
      signature?.cancel();
      mobility?.cancel();
      playSfx(forceRespawn||playerHealth<=0?'playerDeath':'playerHit');
      const previousPower=equipment.active;
      equipment=hitPowerup(equipment,forceRespawn||playerHealth<=0);
      hasFlameSword=equipment.active==='sword';swordDurability=hasFlameSword?equipment.hits:0;
      stopEmber();movementLockedUntil=-9999;attackVisualUntil=shotRecoilUntil=-9999;powerAura?.clear();
      if(previousPower!=='hands')showCompanionJoinNotice(scene,equipment.active==='hands'?'POWERUP LOST · FISTS READY':`${POWERUPS[equipment.active].name.toUpperCase()} · ${equipment.hits} HITS LEFT`,equipment.active==='hands'?'#ffe8b6':'#ffc3a5');
      const useXGodSideScrollPoses = isXGod && useSideScrollXGodRun;
      if (useXGodSideScrollPoses) showXGodDamagePose(scene);
      else {
        player.setTint(0xff7777);
        scene.time.delayedCall(160, () => player?.clearTint());
      }
      if (forceRespawn || playerHealth <= 0) {
        resetTeleport(teleport);blinkQueuedAt=recallQueuedAt=-9999;allyReturnAt=now;allyAssistAt=now+1200;
        // Lost equipment stays lost; nearby supply pickups become available on the retry.
        powerStations.forEach(p=>{if(p.nextAt)p.nextAt=now+800;});
        // A checkpoint retry starts a fresh readable encounter, without old aim lines or volleys.
        enemies.getChildren().forEach(child=>{
          const enemy=child as Phaser.Physics.Arcade.Sprite;
          if(!isRestoredEnemy(enemy.getData('kind')))return;
          clearEnemyIntent(enemy);
          enemy.setData('attackState','patrol').setData('nextAttackAt',now+1600).clearTint();
          enemy.setVelocity(0,0);
        });
        projectiles.getChildren().filter(child=>isRestoredEnemy(child.getData('sourceKind'))).forEach(child=>child.destroy());
        resetRooftopRush(scene);
        resetGroundObstacles();
        jumpVisualAirborne=false;landingVisualStartedAt=-9999;
        springJumpUntil = -9999;
        if (playerHealth <= 0) {
          playerLives = Math.max(0, playerLives - 1);
          playerHealth = 100;
        }
        if(!isXGod || useDrawnXGod){
          showHeroDeath(scene);
          syncStats({isDying:true,isGameOver:false});
          return;
        }
        if (playerLives <= 0) {
          if (useXGodSideScrollPoses) showXGodDeathPose(scene);
          syncStats({ isGameOver: true });
          return;
        }
        if (useXGodSideScrollPoses) showXGodDeathPose(scene);
        else placePlayerOnPlatform(checkpoint.x, checkpoint.y);
      }
      syncStats();
    }

    function showXGodDamagePose(scene: Phaser.Scene) {
      xgodDamagePose?.destroy();
      xgodDeathPose?.destroy();
      xgodDeathPose = null;
      player.setVisible(false);
      if (useDrawnXGod) {
        if(!scene.anims.exists('xgod_drawn_hurt'))scene.anims.create({key:'xgod_drawn_hurt',frames:scene.anims.generateFrameNumbers('runner_damage',{start:0,end:3}),frameRate:14,repeat:0});
        xgodDamagePose = scene.add.sprite(player.x,(player.body as Phaser.Physics.Arcade.Body).bottom,'runner_damage',0)
          .setOrigin(.5,480/512).setScale(player.scaleX,player.scaleY).setFlipX(facingDirection<0).setDepth(24).play('xgod_drawn_hurt');
      } else {
        xgodDamagePose = scene.add.image(player.x, (player.body as Phaser.Physics.Arcade.Body).bottom, "xgod_damage_pose")
          .setOrigin(0.5, 0.94).setDisplaySize(176, 176).setFlipX(facingDirection < 0).setDepth(24);
      }
      const pose = xgodDamagePose;
      scene.time.delayedCall(useDrawnXGod?300:250, () => {
        if (xgodDamagePose !== pose) return;
        pose.destroy();
        xgodDamagePose = null;
        if (!isRespawning && player?.active) player.setVisible(true);
      });
    }

    function showHeroDeath(scene:Phaser.Scene){
      if(heroDeathVisual?.active)return;
      xgodDamagePose?.destroy();xgodDamagePose=null;
      isRespawning=true;heroDeathStartedAt=scene.time.now;
      const body=player.body as Phaser.Physics.Arcade.Body;
      const retryHealth=playerHealth;
      const feet=Math.min(body.bottom,SCREEN_HEIGHT-28);
      body.setVelocity(0,0);body.enable=false;
      player.anims.stop();player.setVisible(false).setAlpha(1).clearTint();
      powerAura.clear();playerHealth=0;
      if(!scene.anims.exists('hero_collapse'))scene.anims.create({key:'hero_collapse',frames:scene.anims.generateFrameNumbers('hero_death',{start:0,end:3}),frameRate:5,repeat:0});
      heroDeathVisual=scene.add.sprite(player.x,feet,'hero_death',0).setOrigin(.5,480/512)
        .setScale(player.scaleX,player.scaleY).setFlipX(facingDirection<0).setDepth(25).play('hero_collapse');
      const death=heroDeathVisual;
      scene.time.delayedCall(1100,()=>{
        if(heroDeathVisual!==death||!player?.active)return;
        death.anims.stop();death.setFrame(3);
        if(playerLives<=0){
          isRespawning=false;isLevelClearing=true;
          syncStats({isDying:false,isGameOver:true});
          return;
        }
        death.destroy();heroDeathVisual=null;
        body.enable=true;playerHealth=retryHealth;
        player.setVisible(true).setAlpha(1).clearTint();
        placePlayerOnPlatform(checkpoint.x,checkpoint.y);
        isRespawning=false;lastGroundedAt=scene.time.now;lastDamageAt=scene.time.now;
        updatePlayerVisual(scene,true,0);
        syncStats({isDying:false,isGameOver:false});
      });
    }

    function showXGodDeathPose(scene: Phaser.Scene) {
      isRespawning = true;
      xgodDamagePose?.destroy();
      xgodDamagePose = null;
      xgodDeathPose?.destroy();
      const body = player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.enable = false;
      player.setVisible(false);
      xgodDeathPose = scene.add.image(player.x, body.bottom, "xgod_death_pose")
        .setOrigin(0.5, 0.85).setDisplaySize(220, 220).setFlipX(facingDirection < 0).setDepth(25);
      const pose = xgodDeathPose;
      if (playerLives <= 0) {
        isLevelClearing = true;
        return;
      }
      scene.time.delayedCall(620, () => {
        if (xgodDeathPose !== pose || !player?.active) return;
        pose.destroy();
        xgodDeathPose = null;
        body.enable = true;
        player.setVisible(true);
        placePlayerOnPlatform(checkpoint.x, checkpoint.y);
        isRespawning = false;
        lastGroundedAt = scene.time.now;
      });
    }

    function collectPickup(scene: Phaser.Scene, pickup: Phaser.Physics.Arcade.Sprite) {
      if (!pickup.active) return;
      const kind = pickup.getData("kind") as PickupKind;
      if(pickup.getData('powerStation')){
        const station=powerStations.find(p=>p.sprite===pickup)!;
        if(!pickup.body?.enable)return;
        station.sprite.disableBody(true,true);station.label.setVisible(false);station.nextAt=scene.time.now+12000;
        currentScore+=station.sprite.getData('collectedOnce')?0:150;station.sprite.setData('collectedOnce',true);
        applyEquipment(scene,station.kind);return;
      }
      pickup.destroy();
      if(kind!=='power')playSfx(kind==='coin'||kind==='rush_star'?'pickup':kind==='shield'?'shield':'powerup');
      currentScore += pointValueForPickup(kind);
      if (kind === "rush_star" && level.rooftopRush && rushState !== "complete") {
        if (rushState === "ready") {
          rushState = "active";
          rushEndsAt = scene.time.now + level.rooftopRush.durationMs;
        }
        rushCollected += 1;
        const pop = scene.add.text(pickup.x, pickup.y - 24, `${rushCollected}/${level.rooftopRush.stars.length}`, {
          fontFamily: "Gochi Hand, sans-serif", fontSize: "23px", color: "#fbd3f6", stroke: "#332334", strokeThickness: 4
        }).setOrigin(0.5).setDepth(24);
        scene.tweens.add({ targets: pop, y: pop.y - 28, alpha: 0, duration: 500, onComplete: () => pop.destroy() });
        if (rushCollected === level.rooftopRush.stars.length) {
          rushState = "complete";
          currentScore += 1200;
          shieldUnlocked = inkShieldReady = true;
          playerHealth = Math.min(100, playerHealth + 15);
          rushHud?.setText("ROOFTOP RUSH!  +1200 + SHIELD").setColor("#d7f5a2").setVisible(true);
          rushNoticeUntil = scene.time.now + 2600;
        }
      }
      if (kind === "coin") currentSouls += 1;
      if (kind === "heart") playerHealth = Math.min(100, playerHealth + 30);
      if (kind === "power") {
        characterPowerUnlocked = true;
        applyEquipment(scene,'sword');
        if (isXGod) {
          swordUnlocked = true;
          hasFlameSword = true;
          swordDurability = equipment.hits;
        }
      }
      if (kind === "shield") {
        shieldUnlocked = true;
        inkShieldReady = true;
      }
      if (kind === "gravity") {
        gravityCoreUnlocked = true;
        gravityCoreCharges = 3;
      }
      if (kind === "dinio") {
        dinioUnlocked = true;
        hasDinio = true;
        spawnDinioCompanion(scene);
        const notice = scene.add.text(player.x, player.y - 105, "DINIO JOINED!", {
          fontFamily: "Gochi Hand, sans-serif", fontSize: "28px", color: "#ff8ac8",
          stroke: "#37112e", strokeThickness: 6
        }).setOrigin(0.5).setDepth(90);
        scene.tweens.add({ targets: notice, y: notice.y - 35, alpha: 0, duration: 1100, onComplete: () => notice.destroy() });
      }
      if (kind === "doghost") {
        doghostUnlocked = true;
        hasDoghost = true;
        spawnDoghostCompanion(scene);
        showCompanionJoinNotice(scene, "DOGHOST JOINED!", "#f8fafc");
      }
      if (kind === "teleportation_c") {
        teleportationCUnlocked = true;
        hasTeleportationC = selectedCharacterId!=='teleportation_c';
        if(!hasTeleportationC)teleport.readyAt=scene.time.now;
        spawnTeleportationCCompanion(scene);
        showCompanionJoinNotice(scene, hasTeleportationC?"TELEPORTATION C JOINED!":"PORTAL CORE READY!", "#c4b5fd");
      }
      syncStats();
    }

    function showCompanionJoinNotice(scene: Phaser.Scene, message: string, color: string) {
      const notice = scene.add.text(player.x, player.y - 105, message, {
        fontFamily: "Gochi Hand, sans-serif", fontSize: "28px", color,
        stroke: "#171329", strokeThickness: 6
      }).setOrigin(0.5).setDepth(90);
      scene.tweens.add({ targets: notice, y: notice.y - 35, alpha: 0, duration: 1100, onComplete: () => notice.destroy() });
    }

    function activateCheckpoint(flag: Phaser.Physics.Arcade.Sprite) {
      const index = flag.getData("index") as number;
      if (index <= checkpointIndex) return;
      checkpointIndex = index;
      checkpoint = { x: flag.x, y: getPlatformStandY(flag.x) ?? flag.y - 30 };
      flag.setTint(0x34d399);
      currentScore += 200;
      syncStats();
    }

    function clearLevel(scene: Phaser.Scene) {
      if (isLevelClearing) return;
      if (!bossDefeated) return;
      isLevelClearing = true;
      currentScore += 900;
      if (currentLevel === 1) {
        characterPowerUnlocked = true;
        equipment=equipPowerup(equipment,'sword',currentLevel);
        if (isXGod) {
          swordUnlocked = true;
          hasFlameSword = true;
          swordDurability = equipment.hits;
        }
      }
      scene.add.text(SCREEN_WIDTH / 2, 210, currentLevel >= MAX_LEVEL ? "UNIVERSE SAVED!" : "LEVEL CLEAR!", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "60px",
        color: "#fef3c7",
        stroke: "#111827",
        strokeThickness: 8
      }).setOrigin(0.5).setScrollFactor(0).setDepth(90);
      scene.time.delayedCall(900, () => {
        if (currentLevel >= MAX_LEVEL) {
          syncStats({ isVictory: true });
        } else {
          syncStats({
            level: currentLevel + 1,
            health: playerHealth,
            isGameOver: false,
            isVictory: false
          });
        }
      });
    }

    function renderGameToText() {
      const body = player?.body as Phaser.Physics.Arcade.Body | undefined;
      const activeEnemies = enemies
        ? enemies.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite).filter((enemy) => enemy.active).map((enemy) => ({
          kind: enemy.getData("kind"),
          name: isRestoredEnemy(enemy.getData('kind')) ? RESTORED_ENEMIES[enemy.getData('kind') as RestoredEnemyKind].name : enemy.getData('kind'),
          texture: enemy.texture.key,
          velocityY: Math.round((enemy.body as Phaser.Physics.Arcade.Body).velocity.y),
          warningVisible: Boolean(enemy.getData('tellVisual')?.active),
          frozenRemainingMs:Math.max(0,Number(enemy.getData('frozenUntil')??0)-latestSceneTime),
          stunnedRemainingMs:Math.max(0,Number(enemy.getData('specialStunUntil')??0)-latestSceneTime),
          attackDirection: enemy.getData('attackDirection')??null,
          targetY: enemy.getData('targetY')??null,
          bounceLane: Boolean(enemy.getData("bounceLane")),
          bossId: enemy.getData("bossId") ?? null,
          x: Math.round(enemy.x),
          y: Math.round(enemy.y),
          velocityX: Math.round((enemy.body as Phaser.Physics.Arcade.Body).velocity.x),
          hp: enemy.getData("hp"),
          maxHp: enemy.getData("maxHp"),
          phase: enemy.getData("phase") ?? null,
          attackState: enemy.getData("attackState"),
          stateElapsedMs: enemy.getData("stateStartedAt") != null ? Math.max(0, Math.round(latestSceneTime - Number(enemy.getData("stateStartedAt")))) : 0,
          move: enemy.getData("move") ?? null,
          facing: enemy.getData("facing") ?? null,
          targetX: enemy.getData("targetX") != null ? Math.round(enemy.getData("targetX")) : null,
          vulnerable: enemy.getData("kind") === "boss" && isBossVulnerable(enemy, latestSceneTime),
          recoveryRemainingMs: enemy.getData("kind") === "boss" && isBossVulnerable(enemy, latestSceneTime)
            ? Math.max(0, Math.round(Number(enemy.getData("recoverUntil")) - latestSceneTime)) : 0,
          recoveryDurationMs: enemy.getData("kind") === "boss"
            ? Number(enemy.getData("recoveryDuration") ?? bossCounterWindow(Number(enemy.getData('phase')))) : null,
          guardedHits: enemy.getData("guardedHits") ?? null,
          openingHits: enemy.getData("openingHits") ?? null,
          attacksCompleted: enemy.getData("attacksCompleted") ?? null,
          shotsInBurst: enemy.getData("shotsInBurst") ?? null,
          followUp: enemy.getData("followUp") ?? null,
          visualFrame: enemy.getData("kind") === "boss" && bossAttackVisual?.visible ? Number(bossAttackVisual.frame.name) : Number(enemy.frame.name),
          coreOpen: enemy.getData("bossId") === "ink_behemoth" && isBossVulnerable(enemy, latestSceneTime),
          floorY: enemy.getData("floorY") ?? null,
          markedXs: enemy.getData("markedXs") ?? null,
          teleported: enemy.getData("move") === "blink_burst" && Boolean(enemy.getData("landingFired")),
          attackName: enemy.getData("kind") === "boss" ? enemy.getData("move")
            : isRestoredEnemy(enemy.getData('kind')) ? enemy.getData('move') : null,
          left: enemy.getData("left"),
          right: enemy.getData("right"),
          bodyBottom: Math.round((enemy.body as Phaser.Physics.Arcade.Body).bottom),
          bodyWidth: Math.round((enemy.body as Phaser.Physics.Arcade.Body).width),
          bodyHeight: Math.round((enemy.body as Phaser.Physics.Arcade.Body).height),
          supportY: enemy.getData("supportY") ?? null,
          grounded: (enemy.body as Phaser.Physics.Arcade.Body).blocked.down || (enemy.body as Phaser.Physics.Arcade.Body).touching.down,
          bodyTop: Math.round((enemy.body as Phaser.Physics.Arcade.Body).top)
        }))
        : [];
      const activePickups = pickups
        ? pickups.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite).filter((pickup) => pickup.active).map((pickup) => ({
          kind: pickup.getData("kind"),
          bounceReward: Boolean(pickup.getData("bounceReward")),
          x: Math.round(pickup.x),
          y: Math.round(pickup.y)
        }))
        : [];
      const activeProjectiles = projectiles
        ? projectiles.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite).filter((projectile) => projectile.active).map((projectile) => ({
          x: Math.round(projectile.x),
          y: Math.round(projectile.y),
          enemyProjectile: Boolean(projectile.getData("enemyProjectile")),
          quakeWave: Boolean(projectile.getData("quakeWave")),
          pattern: projectile.getData("pattern") ?? null,
          bossMove: projectile.getData("bossMove") ?? null,
          velocityX: Math.round((projectile.body as Phaser.Physics.Arcade.Body).velocity.x),
          velocityY: Math.round((projectile.body as Phaser.Physics.Arcade.Body).velocity.y),
          playerShot: Boolean(projectile.getData("playerShotExpiresAt")),
          frostShot: Boolean(projectile.getData('frostShot')),
          fireBlade: Boolean(projectile.getData('fireBlade')),
          texture:projectile.texture.key,frame:projectile.frame.name,
          fireBladeAge:projectile.getData('fireBladeAge')??null,
          fireBladeTravel:projectile.getData('fireBlade')?Math.round(Math.abs(projectile.x-Number(projectile.getData('fireBladeStart')))):null,
          damage: projectile.getData("damage") ?? null
        }))
        : [];

      return JSON.stringify({
        coordinateSystem: "origin=(0,0) top-left; +x moves right; +y moves down; platformer gravity pulls +y",
        engine: "platformer",
        mode: isPausedRef.current ? "paused" : isLevelClearing ? "transition" : "platforming",
        special: signature?.read() ?? null,
        autoRun: isAutoRun,
        level: currentLevel,
        chapter: level.chapter,
        section: level.title,
        failedAssets: Array.from(failedAssetKeys),
        selectedCharacter: {
          id: selectedCharacterId,
          name: selectedCharacter.name,
          rewardName: selectedCharacter.rewardName,
          rewardUnlocked: characterPowerUnlocked,
          spriteArt: isXGod ? useDrawnXGod ? 'drawn-v1' : 'previous' : null,
          invincible: isZGod,
          oneHitPower: isZGod,
          starComet: isZGod ? signature?.read() ?? null : null
        },
        player: player ? {
          x: Math.round(player.x),
          y: Math.round(player.y),
          velocityX: Math.round(body?.velocity.x ?? 0),
          velocityY: Math.round(body?.velocity.y ?? 0),
          grounded: Boolean(body && isPlayerGrounded(body)),
          crouching: isCrouching,
          crouchVisualProgress: Math.round(crouchVisualProgress * 100) / 100,
          bodyHeight: Math.round(body?.height ?? 0),
          facing: facingDirection === 1 ? "right" : "left",
          rangedTool: equipment.active==='blaster'?'ink_marker_blaster':equipment.active==='frost'?'frost_gauntlet':null,
          texture: player.texture.key,
          frame: player.frame.name,
          visible: player.visible,
          health: playerHealth,
          lives: playerLives,
          bodyBottom: Math.round(body?.bottom ?? 0)
        } : null,
        xgodPose: xgodDeathPose?.active ? "death" : xgodDamagePose?.active ? "damage" : isRespawning ? "respawning" : "normal",
        heroDeath: !isXGod || useDrawnXGod ? {active:Boolean(heroDeathVisual?.active),frame:heroDeathVisual?.active?Number(heroDeathVisual.frame.name):null,
          elapsedMs:heroDeathVisual?.active?Math.max(0,(gameRef.current?.scene.getScene('PlatformerScene').time.now??latestSceneTime)-heroDeathStartedAt):0,
          final:playerLives<=0,respawning:isRespawning} : null,
        weapon: { primary: equipment.active, shotsFired,fireBlades:fireBlades?.read()??null },
        equipment:{...equipment,name:POWERUPS[equipment.active].name,maxHits:3,uses:powerUses,hitsLanded:powerHits,clearedBolts,
          cooldownRemainingMs:Math.max(0,POWERUPS[equipment.active].cooldown-(latestSceneTime-Math.max(lastShotAt,lastAttackAt))),emberActive:latestSceneTime<emberUntil,
          emberRemainingMs:Math.max(0,emberUntil-latestSceneTime),emberSpeed:EMBER_DASH.speed,emberDurationMs:EMBER_DASH.duration,emberJets:emberJets?.read()??null},
        powerStations:powerStations.map(p=>({kind:p.kind,x:p.x,y:p.y,available:p.sprite.visible,rechargeMs:Math.max(0,p.nextAt-latestSceneTime)})),
        bossDefeated,
        bossAttackVisualVisible: Boolean(bossAttackVisual?.active && bossAttackVisual.visible),
        bossDeath: { bossId: bossDeathId, stage: bossDeathStage, visible: Boolean(bossDeathVisual?.active && bossDeathVisual.visible), texture: bossDeathVisual?.active ? bossDeathVisual.texture.key : null,
          frame: bossDeathVisual?.active ? Number(bossDeathVisual.frame.name) : null, elapsedMs: bossDeathId ? Math.max(0, latestSceneTime-bossDeathStartedAt) : 0 },
      attack: {
          ...attackDebug,
          resolution:attackResolution,
          combo: attackComboStep,
          visualActive: latestSceneTime < attackVisualUntil,
          visualElapsed: Math.max(0, Math.round(latestSceneTime - attackStartedAt)),
        sideScrollVariant: useSideScrollXGodRun
      },
      movement: {
        xgodMobility: useDrawnXGod ? mobility?.read() ?? null : null,
        zgodMobility: isZGod ? mobility?.read() ?? null : null,
        turnSkidActive: isSkidding,
        skidTimeRemainingMs: Math.max(0, Math.round(skidUntil - latestSceneTime)),
        turnSkidsTriggered: turnSkidCount,
        lastTurnSkidStartSpeed,
        airLaunchKind, stompChain, bestStompChain, stompCount, lastStompBoosted, lastStompSpeed,
        jumpPose:isXGod&&useSideScrollXGodRun&&player?.texture.key.endsWith('-jump')
          ? ['takeoff','rise','tuck','apex','unfold','reach','land','settle'][Number(player.frame.name)]??null:null,
        landingVisualActive:latestSceneTime-landingVisualStartedAt<120
      },
        checkpoint: { index: checkpointIndex, x: Math.round(checkpoint.x), y: Math.round(checkpoint.y) },
        progress: {
          score: currentScore,
          souls: currentSouls,
          monstersDefeated: currentKills,
          levelEndX: level.endX
        },
        powerups: {
          swordUnlocked,
          hasFlameSword,
          swordDurability,
          shieldUnlocked,
          inkShieldReady,
          characterPowerUnlocked,
          gravityCoreUnlocked,
          gravityCoreCharges
        },
        dinio: { unlocked: dinioUnlocked, active: hasDinio, x: dinioCompanion?.active ? Math.round(dinioCompanion.x) : null, y: dinioCompanion?.active ? Math.round(dinioCompanion.y) : null },
        doghost: { unlocked: doghostUnlocked, active: hasDoghost, x: doghostCompanion?.active ? Math.round(doghostCompanion.x) : null, y: doghostCompanion?.active ? Math.round(doghostCompanion.y) : null },
        teleportationC: { unlocked: teleportationCUnlocked, active: hasTeleportationC, x: teleportationCCompanion?.active ? Math.round(teleportationCCompanion.x) : null, y: teleportationCCompanion?.active ? Math.round(teleportationCCompanion.y) : null,
          assist:allyAssistKind,intercepts:allyIntercepts,strikes:allyStrikes,cooldownRemainingMs:Math.max(0,allyAssistAt-latestSceneTime) },
        teleport:selectedCharacterId==='teleportation_c'?{...teleport,phaseActive:latestSceneTime<teleport.phaseUntil,counterReady:latestSceneTime<teleport.counterUntil,cooldownRemainingMs:Math.max(0,teleport.readyAt-latestSceneTime),stride:teleportStride}:null,
        enemies: activeEnemies,
        movingPlatforms: lifts.map(({ plan, body }, index) => ({
          id: index, x: Math.round(body.x), y: Math.round(body.y), width: plan.w,
          axis:plan.axis??'y',minX:plan.x-(plan.axis==='x'?plan.travel:0),maxX:plan.x+(plan.axis==='x'?plan.travel:0),
          minY: plan.y - (plan.axis==='x'?0:plan.travel), maxY: plan.y + (plan.axis==='x'?0:plan.travel),
          velocityX:Math.round(body.velocity.x),velocityY: Math.round(body.velocity.y)
        })),
        crumblingPlatforms:crumbleLedges.map(({plan,state,body})=>({...plan,...state,solid:body.enable})),
        timedVents:vents.map(({plan,phase,body})=>({...plan,phase,active:body.enable})),
        terrain:{platforms:level.platforms,hazards:level.hazards,checkpoints:level.checkpoints,obstacleStart:level.obstacleStart??null},
        springPads: springPads.map(({ plan, launches, readyAt }) => ({
          x: plan.x, y: plan.y, width: plan.width, launches, ready: latestSceneTime >= readyAt
        })),
        rooftopRush: level.rooftopRush ? {
          state: rushState, collected: rushCollected, total: level.rooftopRush.stars.length,
          remainingMs: rushState === "active" ? Math.max(0, Math.round(rushEndsAt - latestSceneTime)) : 0,
          reward: "+1200 points and ink shield"
        } : null,
        pickups: activePickups,
        projectiles: activeProjectiles,
        bossArenaCamera: { locked: bossArenaCameraLocked, left: Math.round(sceneCameraLeft()), width: SCREEN_WIDTH },
        bossCues: { warningVisible: Boolean(bossAttackWarning?.commandBuffer.length), statusVisible: Boolean(bossGuardVisual?.commandBuffer.length),
          vulnerability: bossVulnerabilityCue?.read() ?? null },
        touchControls: window.__unknownUniverseTouchControls ?? {}
      });
    }

    function sceneCameraLeft() {
      return gameRef.current?.scene.getScene("PlatformerScene").cameras.main.scrollX ?? 0;
    }

    const queueSpecial=()=>{
      if(!isPausedRef.current&&!isRespawning&&!isLevelClearing)specialQueuedAt=performance.now();
    };
    window.addEventListener('unknown-universe:special',queueSpecial);
    const queueJump = () => {
      if(!isPausedRef.current&&!isRespawning&&!isLevelClearing) jumpQueuedAt=performance.now();
    };
    const queueDown = () => {
      if(!isPausedRef.current&&!isRespawning&&!isLevelClearing) downQueuedAt=performance.now();
    };
    const queueEquipmentAttack=()=>{
      if((equipment.active==='ember'||equipment.active==='sword')&&!isPausedRef.current&&!isRespawning&&!isLevelClearing)equipmentAttackQueuedAt=performance.now();
    };
    window.addEventListener('unknown-universe:jump',queueJump);
    window.addEventListener('unknown-universe:down',queueDown);
    window.addEventListener('unknown-universe:attack',queueEquipmentAttack);
    const handlePause=(event:KeyboardEvent)=>{
      if(event.code==='KeyX'&&!event.repeat)queueSpecial();
      if(!event.repeat&&(event.code==='Space'||event.code==='KeyC'))queueEquipmentAttack();
      if(!event.repeat && (event.code==='KeyZ'||event.code==='ArrowUp')) queueJump();
      if(!event.repeat && (event.code==='KeyS'||event.code==='ArrowDown')) queueDown();
      if(selectedCharacterId==='teleportation_c'&&!event.repeat&&!isPausedRef.current&&!isRespawning&&!isLevelClearing){
        if(event.code==='KeyX')blinkQueuedAt=performance.now();
        if(event.code==='KeyR')recallQueuedAt=performance.now();
      }
      if(event.code==='KeyP'&&!event.repeat){event.preventDefault();onTogglePauseRef.current();}
    };
    window.addEventListener('keydown',handlePause);
    gameRef.current = new Phaser.Game(config);
    const unwatchViewport = watchGameViewport(gameRef.current, gameContainerRef.current);

    return () => {
      unwatchViewport();
      window.removeEventListener('keydown',handlePause);
      window.removeEventListener('unknown-universe:special',queueSpecial);
      window.removeEventListener('unknown-universe:jump',queueJump);
      window.removeEventListener('unknown-universe:down',queueDown);
      window.removeEventListener('unknown-universe:attack',queueEquipmentAttack);
      window.render_game_to_text = () => JSON.stringify({
        coordinateSystem: "origin=(0,0) top-left; +x moves right; +y moves down; platformer gravity pulls +y",
        engine: "platformer",
        mode: "remounting",
        level: currentLevel,
        chapter: level.chapter,
        section: level.title,
        failedAssets: Array.from(failedAssetKeys),
        selectedCharacter: {
          id: selectedCharacterId,
          name: selectedCharacter.name,
          rewardName: selectedCharacter.rewardName,
          rewardUnlocked: characterPowerUnlocked
        },
        player: null,
        checkpoint: { index: checkpointIndex, x: Math.round(checkpoint.x), y: Math.round(checkpoint.y) },
        progress: {
          score: currentScore,
          souls: currentSouls,
          monstersDefeated: currentKills,
          levelEndX: level.endX
        },
        powerups: {
          swordUnlocked,
          hasFlameSword,
          swordDurability,
          shieldUnlocked,
          inkShieldReady,
          characterPowerUnlocked,
          gravityCoreUnlocked,
          gravityCoreCharges
        },
        enemies: [],
        pickups: [],
        touchControls: window.__unknownUniverseTouchControls ?? {}
      });
      window.advanceTime = async (ms: number) => {
        await new Promise((resolve) => window.setTimeout(resolve, ms));
      };
      window.__unknownPlatformerForceFall = undefined;
      window.__unknownPlatformerDamagePlayer = undefined;
      window.__unknownPlatformerSetPlayerPosition = undefined;
      window.__unknownPlatformerCollectPickup = undefined;
      window.__unknownPlatformerSpecialTest = undefined;
      signature?.destroy();signature=null;
      mobility?.destroy();mobility=null;
      bossVulnerabilityCue?.destroy();bossVulnerabilityCue=null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [
    currentLevel,
    difficulty,
    selectedCharacterId,
    playerSprite
  ]);

  return <div ref={gameContainerRef} className="unknown-universe-game h-full w-full" />;
};

export default PlatformerGameEngine;
