import { FINAL_LEVEL } from '../campaign';
import type { CharacterId } from '../types';
import type { GroundFoe } from './enemyMotion';
import type { CrumblingPlatformPlan, TimedVentPlan } from './groundObstacles';
import type { PlatformSupport } from './levelArchitecture';
import { KILINA_HEALTH, KILINA_NEW_MOVES } from './kilinaCombat';
import { PLATFORM_ROUTES, type PlatformRoute } from './platformRoutes';
import type { EquippedPowerup } from './powerups';
import { RESTORED_ENEMY_BODIES } from './restoredEnemyBodies';
import { TURKEY_MOVES } from './turkeyBoss';
import { UNIQUE_ENEMY_BODIES } from './uniqueEnemies';
import { REGENT_NEW_MOVES, VOID_REGENT_HEALTH } from './voidRegent';

const MAX_LEVEL = FINAL_LEVEL;
export type LevelNumber = 1 | 2 | 3 | 4 | 6;
export type EnemyKind = GroundFoe | "boss";
export type BossId = "dark_dragon" | "turkey" | "killinas_daughter" | "ink_behemoth" | "kilina" | "void_regent";
export type PickupKind = "coin" | "heart" | "power" | "shield" | "gravity" | "dinio" | "doghost" | "teleportation_c" | "rush_star" | EquippedPowerup;

export interface PlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
  support?: PlatformSupport;
  railing?: boolean;
  ladderSide?: "left" | "right";
}

export interface EnemyPlan {
  kind: EnemyKind;
  x: number;
  y: number;
  left: number;
  right: number;
  bossId?: BossId;
  bounceLane?: boolean;
}

export interface MovingPlatformPlan extends PlatformRect {
  travel: number;
  period: number;
  phase?: number;
  axis?: "x" | "y";
}

export interface PickupPlan {
  kind: PickupKind;
  x: number;
  y: number;
  requiresBossDefeat?: boolean;
  bounceReward?: boolean;
}

export interface SpringPadPlan {
  x: number;
  y: number;
  width: number;
  launchSpeed: number;
}

export interface RooftopRushPlan {
  durationMs: number;
  stars: Array<{ x: number; y: number }>;
}

export interface LevelPlan {
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
  platformRoute?: PlatformRoute;
  rooftopRush?: RooftopRushPlan;
  hazards: PlatformRect[];
  enemies: EnemyPlan[];
  pickups: PickupPlan[];
  endX: number;
  tint: number;
}

// Fractions of each animation frame. The body bottom matches the visible feet,
// while the top is the surface a descending player can stomp.
export const ENEMY_BODY_PROFILES: Record<Exclude<EnemyKind, "boss">, {
  x: number; y: number; width: number; height: number; footAnchor: number;
}> = {
  walker: { x: 0.27, y: 0.15, width: 0.46, height: 0.63, footAnchor: 0.78 },
  alien: { x: 0.28, y: 0.10, width: 0.44, height: 0.85, footAnchor: 0.95 },
  dasher: { x: 0.18, y: 0.20, width: 0.64, height: 0.73, footAnchor: 0.93 },
  giant: { x: 0.14, y: 0.10, width: 0.72, height: 0.87, footAnchor: 0.97 },
  ...UNIQUE_ENEMY_BODIES,
  ...RESTORED_ENEMY_BODIES
};

export const BOSS_BODY_PROFILES: Record<BossId, { x: number; y: number; width: number; height: number }> = {
  turkey: {x:.25,y:.49,width:.50,height:.4475},
  dark_dragon: { x: 0.35, y: 0.625, width: 0.30, height: 0.3125 },
  killinas_daughter: { x: 0.42, y: 0.54, width: 0.16, height: 0.3975 },
  kilina: { x: 0.41, y: 0.5075, width: 0.18, height: 0.43 },
  ink_behemoth: { x: 0.35, y: 0.4375, width: 0.30, height: 0.50 },
  void_regent: { x: 0.38, y: 0.44, width: 0.24, height: 0.4975 }
};

export const BOSS_ATTACK_VISUALS: Record<BossId, {
  path: string; frameWidth: number; frameHeight: number;
  originX: number; originY: number; facesRight: boolean;
}> = {
  turkey: {path:'seasonal/thanksgiving-v1/turkey.png',frameWidth:512,frameHeight:512,originX:.5,originY:480/512,facesRight:false},
  dark_dragon: { path: "bosses/encounters-v2/dark_dragon/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  killinas_daughter: { path: "bosses/kilina-v3/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  kilina: { path: "bosses/kilina-combat-v2/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  ink_behemoth: { path: "bosses/encounters-v2/ink_behemoth/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: true },
  void_regent: { path: "bosses/void-regent-v4/attack.png", frameWidth: 640, frameHeight: 640, originX: 0.5, originY: 600 / 640, facesRight: false }
};

export const BOSS_DEFINITIONS: Record<BossId, {
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
  turkey: {
    name:'GIANT TURKEY',textureKey:'boss_turkey',assetPath:'seasonal/thanksgiving-v1/turkey.png',
    frameWidth:512,frameHeight:512,frameCount:1,scale:.85,maxHp:32,tint:0xe49a37,
    attackName:'TALON CHARGE',attackStyle:'rush',projectileKey:'turkey_gust',attackInterval:2200,tellMs:1100,attackMs:1900
  },
  dark_dragon: {
    name: "DARK DRAGON",
    textureKey: "boss_dark_dragon",
    assetPath: "bosses/encounters-v2/dark_dragon/walk.png",
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 7,
    scale: 1.26,
    maxHp: 40,
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
    maxHp: KILINA_HEALTH,
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
    maxHp: VOID_REGENT_HEALTH,
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
export const BOSS_MOVES: Record<string, { tell: number; attack: number; recovery: number; hint: string }> = {
  ...TURKEY_MOVES,
  ...KILINA_NEW_MOVES,
  ...REGENT_NEW_MOVES,
  fire_volley: { tell: 750, attack: 1100, recovery: 2600, hint: "FIRE VOLLEY - MOVE!" },
  dragon_lunge: { tell: 800, attack: 670, recovery: 2600, hint: "LUNGE - MOVE CLEAR!" },
  low_breath: { tell: 850, attack: 1050, recovery: 2700, hint: "LOW FIRE - JUMP!" },
  furnace_quake: { tell: 850, attack: 1550, recovery: 2800, hint: "QUAKE - JUMP!" },
  cinder_bound: { tell: 950, attack: 1100, recovery: 2800, hint: "BOUND - LEAVE THE RING!" },
  ember_rain: { tell: 1050, attack: 2100, recovery: 2800, hint: "EMBERS - LEAVE THE LANES!" },
  blink_burst: { tell: 900, attack: 2500, recovery: 3000, hint: "RIFT - WATCH THE PORTALS!" },
  void_rain: { tell: 1050, attack: 2350, recovery: 2800, hint: "VOID RAIN - LEAVE THE MARKS!" },
  star_fan: { tell: 800, attack: 2100, recovery: 2600, hint: "STAR FAN - MOVE!" },
  shadow_dash: { tell: 850, attack: 800, recovery: 2700, hint: "SHADOW DASH - MOVE CLEAR!" },
  witch_hex: { tell: 850, attack: 1500, recovery: 2600, hint: "HEX BOLTS - KEEP MOVING!" },
  rune_bloom: { tell: 1050, attack: 2000, recovery: 2700, hint: "RUNES - LEAVE THE MARKS!" },
  witch_step: { tell: 850, attack: 950, recovery: 2600, hint: "WITCH STEP - LEAVE THE RING!" }
};

export const LEVELS: Record<LevelNumber, LevelPlan> = {
  1: {
    chapter: "THE SCRATCH",
    title: "Rooftop Recess",
    backgrounds: ["dark_alleyway_1", "dark_alleyway_2", "dark_alleyway_3"],
    blockKey: "platform_school_block",
    hazardKey: "platform_ink_hazard",
    spawn: { x: 160, y: 480 },
    checkpoints: [{ x: 1100, y: 410 }, { x: 3680, y: 410 }, { x: 5560, y: 410 }, { x: 7310, y: 410 }, { x: 9360, y: 410 }, { x: 10200, y: 410 }],
    platforms: [
      // Zone 1–3: Roomy Outpost Approach -> Spacious Ink Rush Split Route -> Wide Rooftop Strongpoint Courtyard
      { x: 0, y: 480, w: 3860, h: 240, support: "cliff" },
      { x: 540, y: 416, w: 88, h: 64, support: "none" },
      { x: 740, y: 378, w: 220, h: 42, support: "bunker", ladderSide: "left" },
      { x: 960, y: 392, w: 120, h: 36, support: "cantilever-left", railing: true },
      // Spacious two-tier Ink Rush street vs. bunker rooftop split (open gap at 2105..2220 for overhead crush-crate!)
      { x: 1710, y: 350, w: 270, h: 42, support: "bunker", ladderSide: "left" },
      { x: 1980, y: 362, w: 125, h: 36, support: "cantilever-left", railing: true },
      { x: 2220, y: 350, w: 320, h: 42, support: "truss", railing: true },
      // Wide-open Rooftop Strongpoint balcony (roomy courtyard below with Watchtower #1 at x=3400)
      { x: 2860, y: 382, w: 260, h: 42, support: "cantilever-right", railing: true },
      { x: 3120, y: 424, w: 72, h: 56, support: "none" },
      // Zone 4: Drawbridge #1 -> Wide Stepped Bastion Terrace (y=480 -> y=436) -> 6-Plank Collapsing Trestle Gorge (4940..5264)
      { x: 4040, y: 480, w: 240, h: 240, support: "cliff" },
      { x: 4280, y: 436, w: 660, h: 284, support: "cliff" },
      { x: 4240, y: 344, w: 260, h: 42, support: "cantilever-right", railing: true },
      { x: 5264, y: 480, w: 1076, h: 240, support: "cliff" },
      { x: 5340, y: 374, w: 280, h: 42, support: "truss", railing: true, ladderSide: "left" },
      // Optional high exit reached from the bounce lane -> anchored stone citadel pier
      { x: 6500, y: 300, w: 240, h: 42, support: "pillar", railing: true },
      // Zone 5: Wide Fortified Ridge (y=432 + Blast Gate #2) -> Roomy Sunken Underpass Trench (y=502) -> Drawbridge #2
      { x: 6500, y: 480, w: 360, h: 240, support: "cliff" },
      { x: 6860, y: 432, w: 400, h: 288, support: "cliff" },
      { x: 7260, y: 502, w: 460, h: 218, support: "cliff" },
      { x: 7720, y: 480, w: 120, h: 240, support: "cliff" },
      { x: 7060, y: 336, w: 300, h: 42, support: "truss", railing: true },
      { x: 7690, y: 375, w: 260, h: 42, support: "cantilever-left", railing: true },
      // Zone 6: Spacious Scrap Bunker Citadel & Double Overpass (8030..9080)
      { x: 8030, y: 480, w: 1050, h: 240, support: "cliff" },
      { x: 8140, y: 416, w: 120, h: 38, support: "cantilever-right", railing: true },
      { x: 8290, y: 397, w: 92, h: 83, support: "none" },
      { x: 8440, y: 345, w: 290, h: 42, support: "bunker", ladderSide: "left" },
      { x: 8990, y: 390, w: 290, h: 42, support: "truss", railing: true },
      // Stepped Fortress Turret Approach before Rooftop Runout & Boss Yard
      { x: 9290, y: 480, w: 590, h: 240, support: "cliff" },
      { x: 9540, y: 407, w: 100, h: 73, support: "none" },
      { x: 9660, y: 345, w: 200, h: 42, support: "cantilever-left", railing: true },
      { x: 9770, y: 268, w: 120, h: 36, support: "scaffold", railing: true },
      // Zone 7: Dark Dragon Boss Yard with anchored stone citadel balconies
      { x: 9880, y: 480, w: 1770, h: 240, support: "cliff" },
      { x: 10440, y: 385, w: 240, h: 42, support: "pillar", railing: true },
      { x: 10870, y: 385, w: 240, h: 42, support: "pillar", railing: true }
    ],
    crumblingPlatforms: [{ x: 7590, y: 305, w: 120, h: 34, crumbleMs: 850 }, { x: 8890, y: 296, w: 128, h: 34 }],
    movingPlatforms: [
      { x: 3810, y: 392, w: 200, h: 42, travel: 28, period: 3400 },
      { x: 7420, y: 375, w: 165, h: 42, travel: 42, period: 4200 },
      { x: 8740, y: 375, w: 180, h: 42, travel: 48, period: 4600, phase: 0.5 }
    ],
    springPads: [
      { x: 1480, y: 480, width: 112, launchSpeed: 780 },
      { x: 4150, y: 480, width: 108, launchSpeed: 780 },
      { x: 5480, y: 374, width: 84, launchSpeed: 620 }
    ],
    rooftopRush: {
      durationMs: 16000,
      stars: [
        { x: 1780, y: 280 }, { x: 1920, y: 280 },
        { x: 2300, y: 280 }, { x: 2440, y: 280 },
        { x: 2920, y: 312 }, { x: 3060, y: 312 }
      ]
    },
    hazards: [
      { x: 3860, y: 556, w: 180, h: 34 },
      { x: 4940, y: 556, w: 324, h: 34 },
      { x: 6340, y: 556, w: 160, h: 34 },
      { x: 7520, y: 484, w: 120, h: 18 },
      { x: 7840, y: 556, w: 190, h: 34 },
      { x: 8620, y: 462, w: 130, h: 18 },
      { x: 9080, y: 556, w: 210, h: 34 },
      { x: 9470, y: 462, w: 100, h: 18 }
    ],
    enemies: [
      { kind: "walker", x: 760, y: 450, left: 660, right: 920 },
      { kind: "alien", x: 850, y: 378, left: 755, right: 945 },
      { kind: "walker", x: 2340, y: 450, left: 2180, right: 2510 },
      { kind: "walker", x: 4135, y: 450, left: 4055, right: 4255 },
      { kind: "alien", x: 4370, y: 344, left: 4255, right: 4485 },
      { kind: "alien", x: 4750, y: 278, left: 4700, right: 4800 },
      { kind: "dasher", x: 4580, y: 410, left: 4320, right: 4910 },
      { kind: "walker", x: 5710, y: 450, left: 5696, right: 5724, bounceLane: true },
      { kind: "walker", x: 5980, y: 450, left: 5966, right: 5994, bounceLane: true },
      { kind: "walker", x: 6240, y: 450, left: 6226, right: 6254, bounceLane: true },
      { kind: "walker", x: 6690, y: 450, left: 6530, right: 6830 },
      { kind: "walker", x: 6970, y: 405, left: 6880, right: 7075 },
      { kind: "alien", x: 7210, y: 336, left: 7080, right: 7340 },
      { kind: "bumper", x: 7470, y: 476, left: 7290, right: 7680 },
      { kind: "dasher", x: 7610, y: 476, left: 7310, right: 7690 },
      { kind: "walker", x: 8180, y: 450, left: 8060, right: 8340 },
      { kind: "alien", x: 8780, y: 315, left: 8735, right: 8825 },
      { kind: "dasher", x: 8940, y: 450, left: 8680, right: 9040 },
      { kind: "tagger", x: 9470, y: 450, left: 9320, right: 9640 },
      { kind: "giant", x: 9710, y: 450, left: 9580, right: 9840 },
      { kind: "alien", x: 9760, y: 345, left: 9675, right: 9845 },
      { kind: "giant", x: 10030, y: 450, left: 9930, right: 10160 },
      { kind: "boss", bossId: "dark_dragon", x: 10790, y: 398, left: 10630, right: 11000 }
    ],
    pickups: [
      { kind: "coin", x: 580, y: 335 },
      ...[790, 900].map((x): PickupPlan => ({ kind: "coin", x, y: 315 })),
      ...[{ x: 1520, y: 250 }, { x: 1585, y: 205 }, { x: 1650, y: 210 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[2020, 2240, 2460].map((x): PickupPlan => ({ kind: "coin", x, y: 425 })),
      { kind: "dinio", x: 3560, y: 425 },
      ...[{ x: 3760, y: 360 }, { x: 3910, y: 300 }, { x: 4060, y: 340 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[{ x: 4460, y: 310 }, { x: 4600, y: 275 }, { x: 4990, y: 340 }, { x: 5140, y: 340 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      ...[{ x: 5520, y: 230 }, { x: 5620, y: 240 },
        { x: 5790, y: 265 }, { x: 5870, y: 185 }, { x: 5950, y: 225 },
        { x: 6060, y: 265 }, { x: 6140, y: 185 }, { x: 6220, y: 225 },
        { x: 6350, y: 250 }, { x: 6450, y: 200 }].map((point): PickupPlan => ({ kind: "coin", ...point })),
      { kind: "shield", x: 6620, y: 245, bounceReward: true },
      ...[6940, 7060, 7180].map((x): PickupPlan => ({ kind: "coin", x, y: 295 })),
      ...[7740, 7840, 7940].map((x): PickupPlan => ({ kind: "coin", x, y: 325 })),
      ...[8480, 8600, 8720].map((x): PickupPlan => ({ kind: "coin", x, y: 295 })),
      ...[9020, 9120, 9220].map((x): PickupPlan => ({ kind: "coin", x, y: 330 })),
      ...[9640, 9740, 9840].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      { kind: "heart", x: 5590, y: 420 },
      { kind: "heart", x: 9380, y: 420 },
      { kind: "power", x: 11040, y: 430, requiresBossDefeat: true }
    ],
    endX: 11350,
    tint: 0xffffff
  },
  2: {
    chapter: "THE GRAVEYARD",
    title: "Moonlit Mausoleum",
    backgrounds: ["graveyard_level1", "graveyard_level2", "graveyard_level2_5", "graveyard_level3"],
    blockKey: "platform_graveyard_block",
    hazardKey: "platform_fog_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 1960, y: 410 }, { x: 5160, y: 410 }, { x: 7600, y: 410 }, { x: 9020, y: 410 }, { x: 10060, y: 410 }],
    platforms: [
      // Zone 1: Roomy Moonlit Approach & Mausoleum Outpost (0..1860)
      { x: 0, y: 480, w: 1860, h: 240, support: "cliff" },
      { x: 1120, y: 378, w: 280, h: 42, support: "bunker", ladderSide: "left" },
      { x: 1400, y: 394, w: 140, h: 36, support: "cantilever-left", railing: true },
      // Zone 2: Spacious Doghost POW Liberation Courtyard (1860..3240)
      { x: 1860, y: 480, w: 1380, h: 240, support: "cliff" },
      { x: 2040, y: 370, w: 290, h: 42, support: "bunker", ladderSide: "left" },
      { x: 2800, y: 382, w: 320, h: 42, support: "truss", railing: true },
      // Zone 3: Stepped Crypt Terrace (y=480 -> y=436) -> 6-Plank Collapsing Fog Gorge (4700..5024)
      { x: 3240, y: 480, w: 300, h: 240, support: "cliff" },
      { x: 3540, y: 436, w: 1160, h: 284, support: "cliff" },
      { x: 3680, y: 344, w: 260, h: 42, support: "cantilever-right", railing: true },
      { x: 5024, y: 480, w: 1060, h: 240, support: "cliff" },
      { x: 5260, y: 374, w: 340, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 5720, y: 390, w: 240, h: 42, support: "pillar", railing: true },
      // Zone 4: Fortified Mausoleum Ridge (y=436) -> Sunken Catacomb Trench (y=504) -> Drawbridge #1
      { x: 6084, y: 436, w: 540, h: 284, support: "cliff" },
      { x: 6624, y: 504, w: 540, h: 216, support: "cliff" },
      { x: 7164, y: 480, w: 160, h: 240, support: "cliff" },
      { x: 6320, y: 336, w: 300, h: 42, support: "truss", railing: true },
      { x: 7130, y: 375, w: 260, h: 42, support: "cantilever-left", railing: true },
      // Zone 5: Bellkeeper Crossfire Citadel -> Drawbridge #2 -> Final Crypt Approach
      { x: 7514, y: 480, w: 1180, h: 240, support: "cliff" },
      { x: 7690, y: 416, w: 120, h: 38, support: "cantilever-right", railing: true },
      { x: 7840, y: 397, w: 92, h: 83, support: "none" },
      { x: 7920, y: 340, w: 280, h: 42, support: "bunker", ladderSide: "left" },
      { x: 8620, y: 388, w: 290, h: 42, support: "truss", railing: true },
      { x: 8894, y: 480, w: 906, h: 240, support: "cliff" },
      { x: 9260, y: 350, w: 240, h: 42, support: "cantilever-left", railing: true },
      { x: 9540, y: 410, w: 95, h: 70, support: "none" },
      // Zone 6: Boss Yard (Killina's Daughter) with anchored stone crypt balconies
      { x: 9800, y: 480, w: 1510, h: 240, support: "cliff" },
      { x: 10100, y: 385, w: 240, h: 42, support: "pillar", railing: true },
      { x: 10530, y: 385, w: 240, h: 42, support: "pillar", railing: true }
    ],
    crumblingPlatforms: [{ x: 1560, y: 326, w: 135, h: 36 }, { x: 8300, y: 314, w: 130, h: 36 }],
    movingPlatforms: [
      { x: 600, y: 380, w: 300, h: 42, travel: 52, period: 4800 },
      { x: 2420, y: 368, w: 280, h: 42, travel: 56, period: 4400, phase: 0.5 },
      { x: 4080, y: 342, w: 240, h: 42, travel: 48, period: 4000, phase: 0.25 },
      { x: 6820, y: 375, w: 170, h: 42, travel: 48, period: 4300, phase: 0.25 },
      { x: 8220, y: 375, w: 180, h: 42, travel: 52, period: 4700, phase: 0.5 }
    ],
    hazards: [
      { x: 4700, y: 556, w: 324, h: 34 },
      { x: 6820, y: 486, w: 130, h: 18 },
      { x: 7324, y: 556, w: 190, h: 34 },
      { x: 8694, y: 556, w: 200, h: 34 },
      { x: 9420, y: 462, w: 110, h: 18 }
    ],
    enemies: [
      { kind: "walker", x: 860, y: 450, left: 680, right: 1100 },
      { kind: "alien", x: 1240, y: 378, left: 1140, right: 1380 },
      { kind: "walker", x: 3390, y: 450, left: 3260, right: 3520 },
      { kind: "alien", x: 3810, y: 344, left: 3700, right: 3920 },
      { kind: "dasher", x: 4520, y: 410, left: 4360, right: 4680 },
      { kind: "bellkeeper", x: 5440, y: 450, left: 5220, right: 5680 },
      { kind: "dasher", x: 5860, y: 450, left: 5640, right: 6040 },
      { kind: "walker", x: 6260, y: 410, left: 6110, right: 6420 },
      { kind: "alien", x: 6460, y: 336, left: 6340, right: 6600 },
      { kind: "giant", x: 6760, y: 478, left: 6650, right: 6960 },
      { kind: "walker", x: 7620, y: 450, left: 7540, right: 7780 },
      { kind: "alien", x: 8060, y: 340, left: 7940, right: 8180 },
      { kind: "walker", x: 9160, y: 450, left: 8960, right: 9380 },
      { kind: "giant", x: 9660, y: 450, left: 9520, right: 9780 },
      { kind: "boss", bossId: "killinas_daughter", x: 10450, y: 398, left: 10240, right: 10650 }
    ],
    pickups: [
      ...[660, 760, 860].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
      ...[1180, 1260, 1340].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
      { kind: "doghost", x: 2480, y: 420 },
      ...[2120, 2220, 2320].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
      { kind: "shield", x: 3020, y: 320 },
      ...[3740, 3840, 3940].map((x): PickupPlan => ({ kind: "coin", x, y: 275 })),
      ...[4780, 4880, 4980].map((x): PickupPlan => ({ kind: "coin", x, y: 340 })),
      { kind: "heart", x: 5200, y: 420 },
      ...[5360, 5460, 5560].map((x): PickupPlan => ({ kind: "coin", x, y: 310 })),
      ...[6380, 6480, 6580].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
      ...[7180, 7280, 7380].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
      ...[7980, 8080, 8180].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
      ...[8680, 8780, 8880].map((x): PickupPlan => ({ kind: "coin", x, y: 325 })),
      ...[9320, 9420, 9520].map((x): PickupPlan => ({ kind: "coin", x, y: 295 })),
      { kind: "heart", x: 9100, y: 420 }
    ],
    endX: 11010,
    tint: 0xffffff
  },
  3: {
    chapter: "THE FURNACE",
    title: "Cinder Rampart",
    backgrounds: ["cave_level_1", "cave_level_2", "cave_level_3"],
    blockKey: "platform_furnace_block",
    hazardKey: "platform_lava_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 2990, y: 450 }, { x: 5340, y: 450 }, { x: 6680, y: 450 }],
    platforms: [
      // Zone 1: Foundry Approach -> Drawbridge #1 (0..1240)
      { x: 0, y: 520, w: 1240, h: 120, support: "cliff" },
      { x: 860, y: 392, w: 280, h: 42, support: "bunker", ladderSide: "left" },
      { x: 1140, y: 404, w: 130, h: 36, support: "cantilever-left", railing: true },
      // Zone 2: Stepped Smelter Line Strongpoint (y=520 -> y=472 -> y=520) + Blast Gate #1 -> Drawbridge #2
      { x: 1450, y: 520, w: 340, h: 120, support: "cliff" },
      { x: 1790, y: 472, w: 1150, h: 168, support: "cliff" },
      { x: 2940, y: 520, w: 320, h: 120, support: "cliff" },
      { x: 2020, y: 340, w: 360, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 2560, y: 356, w: 240, h: 42, support: "cantilever-right", railing: true },
      // Zone 3: Teleportation C Foundry -> 6-Plank Collapsing Magma Trestle Bridge (4930..5254)
      { x: 3500, y: 520, w: 1240, h: 120, support: "cliff" },
      { x: 4740, y: 476, w: 190, h: 164, support: "cliff" },
      { x: 3680, y: 438, w: 130, h: 38, support: "cantilever-right", railing: true },
      { x: 3840, y: 360, w: 360, h: 42, support: "bunker", ladderSide: "left" },
      { x: 4320, y: 378, w: 220, h: 42, support: "truss", railing: true },
      // Zone 4: Slag Overpass Strongpoint -> Drawbridge #3 -> Blast Gate #2 Rampart
      { x: 5254, y: 520, w: 1120, h: 120, support: "cliff" },
      { x: 5620, y: 330, w: 380, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 6614, y: 520, w: 566, h: 120, support: "cliff" },
      { x: 6720, y: 370, w: 260, h: 42, support: "cantilever-left", railing: true },
      // Zone 5: Cinder Colossus Boss Arena (shifted +3440)
      { x: 7400, y: 520, w: 1770, h: 120, support: "cliff" },
      { x: 7960, y: 340, w: 450, h: 42, support: "pillar", railing: true }
    ],
    crumblingPlatforms: [{ x: 1620, y: 365, w: 126, h: 36 }, { x: 5420, y: 409, w: 148, h: 38 }],
    hazards: [
      { x: 1240, y: 552, w: 210, h: 38 },
      { x: 3260, y: 552, w: 240, h: 38 },
      { x: 4930, y: 552, w: 324, h: 38 },
      { x: 6374, y: 552, w: 240, h: 38 },
      { x: 7180, y: 552, w: 220, h: 38 }
    ],
    enemies: [
      { kind: "walker", x: 760, y: 470, left: 560, right: 1120 },
      { kind: "alien", x: 980, y: 392, left: 880, right: 1120 },
      { kind: "boiler", x: 1620, y: 470, left: 1480, right: 1760 },
      { kind: "alien", x: 2180, y: 340, left: 2040, right: 2360 },
      { kind: "dasher", x: 4060, y: 470, left: 3660, right: 4440 },
      { kind: "boiler", x: 4360, y: 470, left: 3920, right: 4680 },
      { kind: "giant", x: 5840, y: 470, left: 5480, right: 6220 },
      { kind: "alien", x: 5820, y: 330, left: 5640, right: 5980 },
      { kind: "walker", x: 6740, y: 470, left: 6640, right: 6840 },
      { kind: "boss", bossId: "ink_behemoth", x: 8120, y: 438, left: 7540, right: 8740 }
    ],
    pickups: [
      { kind: "coin", x: 940, y: 320 },
      { kind: "coin", x: 2150, y: 275 },
      { kind: "teleportation_c", x: 3790, y: 455 },
      { kind: "heart", x: 4020, y: 295 },
      { kind: "heart", x: 6720, y: 455 },
      { kind: "power", x: 8040, y: 275 }
    ],
    endX: 8890,
    tint: 0xffffff
  },
  4: {
    chapter: "THE WITCHWOOD",
    title: "Kilina's Moonthorn Sanctuary",
    backgrounds: ["witchwood_panorama", "witchwood_parallax"],
    blockKey: "platform_witchwood_block",
    hazardKey: "platform_witchwood_hazard",
    spawn: { x: 160, y: 520 },
    checkpoints: [{ x: 1760, y: 450 }, { x: 3520, y: 450 }, { x: 5720, y: 450 }, { x: 6780, y: 450 }, { x: 8420, y: 450 }],
    platforms: [
      // Zone 1: Entry Ruins & Blast Gate #1 -> Drawbridge #1 (0..2260)
      { x: 0, y: 520, w: 2260, h: 200, support: "cliff" },
      { x: 520, y: 450, w: 90, h: 70, support: "none" },
      { x: 920, y: 385, w: 280, h: 42, support: "bunker", ladderSide: "left" },
      { x: 1200, y: 400, w: 140, h: 36, support: "cantilever-left", railing: true },
      { x: 1520, y: 340, w: 280, h: 42, support: "truss", railing: true },
      // Zone 2: Broad Ruined Wall -> Raised Mossy Ruin Plateau Strongpoint (y=472) -> 6-Plank Collapsing Ravine Bridge
      { x: 2460, y: 520, w: 1120, h: 200, support: "cliff" },
      { x: 2560, y: 405, w: 220, h: 42, support: "cantilever-left", railing: true },
      { x: 2940, y: 365, w: 360, h: 155, support: "none" },
      { x: 3580, y: 472, w: 900, h: 248, support: "cliff" },
      { x: 3680, y: 344, w: 250, h: 42, support: "cantilever-right", railing: true },
      // Zone 3: Spring Court -> Sunken Bramble Hollow (y=542) -> Drawbridge #2
      { x: 4804, y: 520, w: 860, h: 200, support: "cliff" },
      { x: 5160, y: 385, w: 260, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 5664, y: 542, w: 620, h: 178, support: "cliff" },
      { x: 5820, y: 385, w: 260, h: 42, support: "cantilever-left", railing: true },
      { x: 6284, y: 520, w: 220, h: 200, support: "cliff" },
      // Zone 4: Moonthorn Ambush Strongpoint -> Blast Gate #2 -> Safe Approach before Extension & Kilina
      { x: 6704, y: 520, w: 1200, h: 200, support: "cliff" },
      { x: 7120, y: 375, w: 290, h: 42, support: "bunker", ladderSide: "left" },
      { x: 7860, y: 385, w: 240, h: 42, support: "truss", railing: true },
      { x: 8064, y: 520, w: 536, h: 200, support: "cliff" },
      // Zone 5: Kilina's Sanctuary Boss Yard (shifted +2680)
      { x: 8600, y: 520, w: 1880, h: 200, support: "cliff" },
      { x: 8800, y: 405, w: 210, h: 42, support: "cantilever-left", railing: true },
      { x: 9260, y: 345, w: 190, h: 42, support: "pillar", railing: true },
      { x: 9820, y: 345, w: 190, h: 42, support: "pillar", railing: true }
    ],
    crumblingPlatforms: [{ x: 1380, y: 292, w: 128, h: 36 }, { x: 7520, y: 326, w: 112, h: 36 }],
    movingPlatforms: [
      { x: 5560, y: 390, w: 160, h: 42, travel: 50, period: 4100, phase: 0.3 },
      { x: 6420, y: 385, w: 155, h: 42, travel: 45, period: 3900 }
    ],
    springPads: [{ x: 4980, y: 520, width: 92, launchSpeed: 680 }],
    hazards: [
      { x: 2260, y: 552, w: 200, h: 38 },
      { x: 4480, y: 552, w: 324, h: 38 },
      { x: 6504, y: 552, w: 200, h: 38 },
      { x: 7904, y: 552, w: 160, h: 38 }
    ],
    enemies: [
      { kind: "walker", x: 1060, y: 385, left: 940, right: 1180 },
      { kind: "mantis", x: 1620, y: 470, left: 1340, right: 1960 },
      { kind: "alien", x: 1660, y: 340, left: 1540, right: 1780 },
      { kind: "walker", x: 2740, y: 470, left: 2520, right: 2900 },
      { kind: "dasher", x: 3400, y: 470, left: 3320, right: 3560 },
      { kind: "mantis", x: 5240, y: 470, left: 4980, right: 5560 },
      { kind: "alien", x: 5940, y: 385, left: 5840, right: 6060 },
      { kind: "giant", x: 5940, y: 492, left: 5720, right: 6220 },
      { kind: "walker", x: 8220, y: 470, left: 8100, right: 8520 },
      { kind: "giant", x: 8770, y: 470, left: 8620, right: 8940 },
      { kind: "boss", bossId: "kilina", x: 9620, y: 520, left: 9330, right: 9830 }
    ],
    pickups: [
      ...[960, 1050, 1140].map((x): PickupPlan => ({ kind: "coin", x, y: 325 })),
      ...[1580, 1660, 1740].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
      ...[3000, 3120, 3240].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      ...[4560, 4660, 4760].map((x): PickupPlan => ({ kind: "coin", x, y: 360 })),
      ...[5220, 5320, 5420].map((x): PickupPlan => ({ kind: "coin", x, y: 315 })),
      ...[7180, 7280, 7380].map((x): PickupPlan => ({ kind: "coin", x, y: 305 })),
      { kind: "shield", x: 3500, y: 440 }, { kind: "heart", x: 1760, y: 465 },
      { kind: "heart", x: 6780, y: 465 }, { kind: "heart", x: 8340, y: 465 }
    ],
    endX: 10180,
    tint: 0xffffff
  },
  6: {
    chapter: "THE DREAD PLANET",
    title: "Void Regent Approach",
    backgrounds: ["void_regent_pencil_panorama"],
    blockKey: "platform_dread_planet_block",
    hazardKey: "platform_void_hazard",
    spawn: { x: 160, y: 450 },
    checkpoints: [{ x: 3000, y: 450 }, { x: 5410, y: 450 }, { x: 6760, y: 450 }],
    platforms: [
      // Zone 1: Dread Planet Landing -> Abyss Drawbridge #1 (0..1240)
      { x: 0, y: 520, w: 1240, h: 120, support: "cliff" },
      { x: 860, y: 375, w: 280, h: 42, support: "bunker", ladderSide: "left" },
      { x: 1140, y: 392, w: 130, h: 36, support: "cantilever-left", railing: true },
      // Zone 2: Raised Obsidian Terrace Strongpoint (y=468) + Citadel Blast Gate #1 -> Drawbridge #2
      { x: 1450, y: 520, w: 340, h: 120, support: "cliff" },
      { x: 1790, y: 468, w: 1150, h: 172, support: "cliff" },
      { x: 2940, y: 520, w: 340, h: 120, support: "cliff" },
      { x: 2020, y: 332, w: 360, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 2560, y: 350, w: 240, h: 42, support: "cantilever-right", railing: true },
      // Zone 3: Gravity Core Spire -> 6-Plank Collapsing Void-Trestle Bridge (4996..5320)
      { x: 3520, y: 520, w: 1280, h: 120, support: "cliff" },
      { x: 4800, y: 472, w: 196, h: 168, support: "cliff" },
      { x: 3880, y: 355, w: 340, h: 42, support: "bunker", ladderSide: "left" },
      { x: 4320, y: 315, w: 260, h: 42, support: "truss", railing: true },
      // Zone 4: Mimic Armory Strongpoint -> Blast Gate #2 Rampart
      { x: 5320, y: 520, w: 1180, h: 120, support: "cliff" },
      { x: 5720, y: 320, w: 380, h: 42, support: "truss", railing: true, ladderSide: "left" },
      { x: 6440, y: 375, w: 260, h: 42, support: "truss", railing: true },
      { x: 6660, y: 520, w: 700, h: 120, support: "cliff" },
      { x: 6820, y: 365, w: 260, h: 42, support: "cantilever-left", railing: true },
      // Zone 5: Void Regent Citadel Boss Arena (shifted +3720)
      { x: 7600, y: 520, w: 1890, h: 120, support: "cliff" },
      { x: 8240, y: 330, w: 520, h: 42, support: "pillar", railing: true }
    ],
    crumblingPlatforms: [{ x: 1620, y: 363, w: 120, h: 36 }, { x: 5500, y: 355, w: 155, h: 36 }],
    hazards: [
      { x: 1240, y: 550, w: 210, h: 40 },
      { x: 3280, y: 550, w: 240, h: 40 },
      { x: 4996, y: 550, w: 324, h: 40 },
      { x: 6500, y: 550, w: 160, h: 40 },
      { x: 7360, y: 550, w: 240, h: 40 }
    ],
    enemies: [
      { kind: "walker", x: 760, y: 470, left: 560, right: 1120 },
      { kind: "alien", x: 980, y: 375, left: 880, right: 1120 },
      { kind: "mimic", x: 1620, y: 470, left: 1480, right: 1760 },
      { kind: "alien", x: 2180, y: 332, left: 2040, right: 2360 },
      { kind: "giant", x: 4060, y: 470, left: 3680, right: 4480 },
      { kind: "mimic", x: 4440, y: 470, left: 3960, right: 4740 },
      { kind: "dasher", x: 5940, y: 470, left: 5540, right: 6340 },
      { kind: "alien", x: 5900, y: 320, left: 5740, right: 6080 },
      { kind: "walker", x: 6820, y: 470, left: 6690, right: 6920 },
      { kind: "boss", bossId: "void_regent", x: 8440, y: 438, left: 7820, right: 9020 }
    ],
    pickups: [
      { kind: "coin", x: 960, y: 310 },
      { kind: "coin", x: 2160, y: 265 },
      { kind: "gravity", x: 4440, y: 245 },
      { kind: "heart", x: 6790, y: 455 },
      { kind: "heart", x: 8420, y: 260 }
    ],
    endX: 9200,
    tint: 0xffffff
  }
};

export interface LevelExtension {
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
  insertionX: 9880, bridgeStartX: 9880, addedLength: 2505, newEndX: 13855, floorY: 480, groundHeight: 240,
  ground: [
    { x: 9880, y: 480, w: 500, h: 240 }, { x: 10520, y: 480, w: 520, h: 240 },
    { x: 11200, y: 480, w: 560, h: 240 }, { x: 11890, y: 480, w: 495, h: 240 }
  ],
  platforms: [
    { x: 10040, y: 405, w: 260, h: 42 }, { x: 10640, y: 350, w: 260, h: 42 },
    { x: 11350, y: 390, w: 270, h: 42 }, { x: 12000, y: 355, w: 300, h: 42 }
  ],
  hazards: [
    { x: 10380, y: 556, w: 140, h: 34 }, { x: 11040, y: 556, w: 160, h: 34 },
    { x: 11760, y: 556, w: 130, h: 34 }
  ],
  movingPlatforms: [
    { x: 10390, y: 380, w: 145, h: 42, travel: 36, period: 4100 },
    { x: 11745, y: 375, w: 155, h: 42, travel: 34, period: 3900, phase: 0.4 }
  ],
  checkpoints: [{ x: 11210, y: 410 }],
  enemies: [
    { kind: "walker", x: 10190, y: 450, left: 10000, right: 10350 },
    { kind: "alien", x: 10850, y: 255, left: 10680, right: 11000 },
    { kind: "dasher", x: 11520, y: 450, left: 11320, right: 11710 },
    { kind: "giant", x: 12140, y: 450, left: 11950, right: 12320 }
  ],
  pickups: [
    ...[10100, 10210, 10320].map((x): PickupPlan => ({ kind: "coin", x, y: 315 })),
    ...[10660, 10770, 10880].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[11380, 11500, 11620].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    ...[12000, 12120, 12240].map((x): PickupPlan => ({ kind: "coin", x, y: 300 })),
    { kind: "heart", x: 11210, y: 420 }
  ]
});

extendLevelRoute(LEVELS[2], {
  insertionX: 9800, bridgeStartX: 9800, addedLength: 2505, newEndX: 13515, floorY: 480, groundHeight: 240,
  ground: [
    { x: 9800, y: 480, w: 480, h: 240 }, { x: 10280, y: 480, w: 650, h: 240 },
    { x: 10930, y: 480, w: 670, h: 240 }, { x: 11600, y: 480, w: 705, h: 240 }
  ],
  platforms: [
    { x: 9960, y: 385, w: 250, h: 42, support: "bunker" }, { x: 10530, y: 350, w: 270, h: 42, support: "truss" },
    { x: 11180, y: 390, w: 260, h: 42, support: "cantilever-left" }, { x: 11890, y: 345, w: 280, h: 42, support: "truss" }
  ],
  hazards: [],
  movingPlatforms: [
    { x: 10255, y: 375, w: 150, h: 42, travel: 38, period: 4200, phase: 0.3 },
    { x: 11560, y: 380, w: 150, h: 42, travel: 40, period: 4500 }
  ],
  checkpoints: [{ x: 11105, y: 410 }],
  enemies: [
    { kind: "walker", x: 10040, y: 450, left: 9870, right: 10250 },
    { kind: "alien", x: 10690, y: 250, left: 10510, right: 10900 },
    { kind: "dasher", x: 11370, y: 450, left: 11160, right: 11570 },
    { kind: "giant", x: 12030, y: 450, left: 11850, right: 12230 }
  ],
  pickups: [
    ...[9920, 10040, 10160].map((x): PickupPlan => ({ kind: "coin", x, y: 310 })),
    ...[10530, 10650, 10770].map((x): PickupPlan => ({ kind: "coin", x, y: 280 })),
    ...[11160, 11280, 11400].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    ...[11820, 11940, 12060].map((x): PickupPlan => ({ kind: "coin", x, y: 295 })),
    { kind: "heart", x: 11105, y: 420 }
  ]
});

extendLevelRoute(LEVELS[3], {
  insertionX: 7400, bridgeStartX: 7180, addedLength: 1635, newEndX: 10525, floorY: 520, groundHeight: 120,
  ground: [
    { x: 7180, y: 520, w: 430, h: 120 }, { x: 7740, y: 520, w: 480, h: 120 },
    { x: 8360, y: 520, w: 675, h: 120 }
  ],
  platforms: [
    { x: 7330, y: 395, w: 240, h: 42, support: "bunker" }, { x: 7830, y: 335, w: 280, h: 42, support: "truss" },
    { x: 8450, y: 375, w: 290, h: 42, support: "cantilever-left" }, { x: 8780, y: 330, w: 190, h: 42, support: "scaffold" }
  ],
  hazards: [
    { x: 7610, y: 552, w: 130, h: 38 }, { x: 8220, y: 552, w: 140, h: 38 }
  ],
  movingPlatforms: [{ x: 7580, y: 390, w: 145, h: 42, travel: 38, period: 4100 }],
  checkpoints: [{ x: 8380, y: 450 }],
  enemies: [
    { kind: "walker", x: 7410, y: 470, left: 7260, right: 7560 },
    { kind: "alien", x: 7950, y: 245, left: 7780, right: 8140 },
    { kind: "dasher", x: 8540, y: 470, left: 8380, right: 8920 },
    { kind: "giant", x: 8880, y: 470, left: 8740, right: 8990 }
  ],
  pickups: [
    ...[7320, 7430, 7540].map((x): PickupPlan => ({ kind: "coin", x, y: 340 })),
    ...[7800, 7920, 8040].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[8430, 8550, 8670].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    { kind: "heart", x: 8380, y: 450 }
  ]
});

extendLevelRoute(LEVELS[6], {
  insertionX: 7600, bridgeStartX: 7360, addedLength: 1644, newEndX: 10844, floorY: 520, groundHeight: 120,
  ground: [
    { x: 7360, y: 520, w: 440, h: 120 }, { x: 7930, y: 520, w: 490, h: 120 },
    { x: 8550, y: 520, w: 694, h: 120 }
  ],
  platforms: [
    { x: 7520, y: 390, w: 250, h: 42, support: "bunker" }, { x: 8050, y: 325, w: 270, h: 42, support: "truss" },
    { x: 8640, y: 375, w: 300, h: 42, support: "cantilever-left" }, { x: 9030, y: 335, w: 190, h: 42, support: "scaffold" }
  ],
  hazards: [
    { x: 7800, y: 552, w: 130, h: 38 }, { x: 8420, y: 552, w: 130, h: 38 }
  ],
  movingPlatforms: [{ x: 7770, y: 390, w: 145, h: 42, travel: 40, period: 4300, phase: 0.35 }],
  checkpoints: [{ x: 8565, y: 450 }],
  enemies: [
    { kind: "walker", x: 7580, y: 470, left: 7420, right: 7740 },
    { kind: "alien", x: 8170, y: 240, left: 8000, right: 8370 },
    { kind: "dasher", x: 8720, y: 470, left: 8580, right: 9100 },
    { kind: "giant", x: 9155, y: 470, left: 9020, right: 9220 }
  ],
  pickups: [
    ...[7480, 7600, 7720].map((x): PickupPlan => ({ kind: "coin", x, y: 335 })),
    ...[8010, 8130, 8250].map((x): PickupPlan => ({ kind: "coin", x, y: 285 })),
    ...[8620, 8740, 8860].map((x): PickupPlan => ({ kind: "coin", x, y: 320 })),
    { kind: "heart", x: 8565, y: 450 }
  ]
});

// Each new stretch introduces a mechanism over solid ground, then combines it
// with short jumpable gaps. The original boss yard moves as one intact section.
extendLevelRoute(LEVELS[3], {
  insertionX:9035,bridgeStartX:9035,addedLength:2400,newEndX:12925,floorY:520,groundHeight:120,
  ground:[{x:9035,y:520,w:600,h:120},{x:9795,y:520,w:570,h:120},{x:10525,y:520,w:910,h:120}],
  platforms:[{x:9980,y:355,w:250,h:42,support:'truss'},{x:10630,y:442,w:96,h:78},{x:10790,y:350,w:280,h:42,support:'bunker'}],
  hazards:[{x:9635,y:552,w:160,h:38},{x:10365,y:552,w:160,h:38}],
  springPads:[{x:9270,y:520,width:100,launchSpeed:780}],
  crumblingPlatforms:[{x:9420,y:340,w:140,h:36},{x:9630,y:310,w:150,h:36},{x:9860,y:350,w:200,h:36}],
  movingPlatforms:[{x:10180,y:380,w:160,h:42,travel:110,period:4000,axis:'x'}],
  timedVents:[{x:9990,y:520,w:72,height:132},{x:10880,y:520,w:72,height:148,phase:.5}],
  checkpoints:[{x:9450,y:450},{x:10580,y:450},{x:11240,y:450}],
  enemies:[{kind:'walker',x:9540,y:470,left:9470,right:9590},
    {kind:'alien',x:10990,y:350,left:10830,right:11010},
    {kind:'dasher',x:11060,y:470,left:11010,right:11180}],
  pickups:[...[9460,9530,9670,9750,9910,10010,10120,10230].map((x):PickupPlan=>({kind:'coin',x,y:x<9840?250:290})),
    ...[10650,10850,10960,11070].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'heart',x:10580,y:465},{kind:'heart',x:11240,y:465}]
});

extendLevelRoute(LEVELS[4], {
  insertionX:8600,bridgeStartX:8600,addedLength:2200,newEndX:12380,floorY:520,groundHeight:200,
  ground:[{x:8600,y:520,w:680,h:200},{x:9430,y:520,w:650,h:200},{x:10220,y:520,w:580,h:200}],
  platforms:[{x:9550,y:440,w:95,h:80},{x:9660,y:355,w:240,h:42,support:'bunker'},{x:10380,y:430,w:100,h:90}],
  hazards:[{x:9280,y:552,w:150,h:38},{x:10080,y:552,w:140,h:38}],
  springPads:[{x:8840,y:520,width:96,launchSpeed:760}],
  crumblingPlatforms:[{x:8990,y:350,w:160,h:36},{x:9210,y:320,w:160,h:36},{x:9430,y:350,w:200,h:36}],
  movingPlatforms:[{x:9940,y:390,w:160,h:42,travel:115,period:4200,axis:'x',phase:.25}],
  timedVents:[],checkpoints:[{x:9140,y:450},{x:10290,y:450}],
  enemies:[{kind:'walker',x:9170,y:470,left:9100,right:9230},
    {kind:'alien',x:9800,y:355,left:9710,right:9860}],
  pickups:[...[9030,9120,9250,9330,9470,9580].map((x):PickupPlan=>({kind:'coin',x,y:260})),
    ...[9720,9830,9980,10120,10260,10430].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'shield',x:9560,y:285},{kind:'heart',x:10290,y:465}]
});

extendLevelRoute(LEVELS[6], {
  insertionX:9244,bridgeStartX:9244,addedLength:2500,newEndX:13344,floorY:520,groundHeight:120,
  ground:[{x:9244,y:520,w:730,h:120},{x:10134,y:520,w:640,h:120},{x:10944,y:520,w:800,h:120}],
  platforms:[{x:9700,y:335,w:200,h:42,support:'truss'},{x:10220,y:350,w:250,h:42,support:'bunker'},{x:10800,y:462,w:115,h:38},
    {x:11040,y:435,w:110,h:85},{x:11140,y:355,w:260,h:42,support:'cantilever-left'}],
  hazards:[{x:9974,y:552,w:160,h:38},{x:10774,y:552,w:170,h:38}],
  springPads:[{x:9580,y:520,width:100,launchSpeed:800}],
  crumblingPlatforms:[{x:9980,y:305,w:150,h:36},{x:10170,y:345,w:200,h:36}],
  movingPlatforms:[{x:10600,y:385,w:170,h:42,travel:110,period:3900,axis:'x',phase:.5}],
  timedVents:[{x:10300,y:520,w:72,height:140,phase:.25},{x:11230,y:520,w:72,height:140,phase:.75}],
  checkpoints:[{x:9820,y:450},{x:10990,y:450},{x:11580,y:450}],
  enemies:[{kind:'alien',x:10390,y:350,left:10280,right:10430},
    {kind:'dasher',x:11480,y:470,left:11440,right:11540}],
  pickups:[...[9740,9850,10010,10090,10220,10330,10440,10610].map((x):PickupPlan=>({kind:'coin',x,y:x<10220?245:290})),
    ...[11050,11180,11290,11400].map((x):PickupPlan=>({kind:'coin',x,y:290})),
    {kind:'heart',x:10990,y:465},{kind:'heart',x:11580,y:465}]
});

// Add connected lower/upper courses after the previous encounters. The original
// arena, rewards and exit move together through the existing extension helper.
for(const [key,course] of Object.entries(PLATFORM_ROUTES)){
  const level=LEVELS[Number(key) as LevelNumber];
  const previousObstacleStart=level.obstacleStart;
  extendLevelRoute(level,{
    insertionX:course.start,bridgeStartX:course.start,addedLength:course.length,newEndX:level.endX+course.length,
    floorY:course.floor,groundHeight:course.groundHeight,ground:course.ground,platforms:course.platforms,
    hazards:course.hazards,movingPlatforms:course.movingPlatforms,springPads:course.springPads,
    crumblingPlatforms:course.crumblingPlatforms,timedVents:course.timedVents,checkpoints:course.checkpoints,
    enemies:[],pickups:course.coins.map(point=>({...point,kind:'coin'})),
  });
  level.obstacleStart=previousObstacleStart;
  level.platformRoute=course;
  // Keep the course's exit checkpoint outside the next patrol's attack range.
  const end=course.start+course.length;
  for(const enemy of level.enemies){
    if(enemy.kind==='boss'||enemy.x<end||enemy.left>=end+500)continue;
    const shift=end+500-enemy.left;
    enemy.x+=shift;enemy.left+=shift;enemy.right+=shift;
  }
}

export const CHARACTER_FEEL: Record<CharacterId, {
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
  killer_kai: {runSpeed:350,acceleration:2350,braking:2900,turnAcceleration:3200,airAcceleration:1400,airBraking:450,jumpVelocity:780,attackCooldown:280,attackRange:520},
  killer_klause:{runSpeed:300,acceleration:2250,braking:2900,turnAcceleration:3000,airAcceleration:1400,airBraking:450,jumpVelocity:780,attackCooldown:550,attackRange:136},
  turkey_king:{runSpeed:310,acceleration:2250,braking:2900,turnAcceleration:3000,airAcceleration:1400,airBraking:450,jumpVelocity:780,attackCooldown:550,attackRange:145},
  shadow_kid: {runSpeed:370,acceleration:2450,braking:2950,turnAcceleration:3250,airAcceleration:1450,airBraking:450,jumpVelocity:780,attackCooldown:800,attackRange:125},
  elytron: {runSpeed:365,acceleration:2450,braking:2950,turnAcceleration:3250,airAcceleration:1450,airBraking:450,jumpVelocity:780,attackCooldown:320,attackRange:125},
  zgod: { runSpeed: 365, acceleration: 2550, braking: 2800, turnAcceleration: 3100, airAcceleration: 1500, airBraking: 450, jumpVelocity: 780, attackCooldown: 340, attackRange: 145 },
  xgod: { runSpeed: 375, acceleration: 2650, braking: 3300, turnAcceleration: 3600, airAcceleration: 1650, airBraking: 480, jumpVelocity: 785, attackCooldown: 340, attackRange: 118 },
  barrett: { runSpeed: 300, acceleration: 2050, braking: 2700, turnAcceleration: 2900, airAcceleration: 1150, airBraking: 400, jumpVelocity: 750, attackCooldown: 430, attackRange: 128 },
  nico: { runSpeed: 320, acceleration: 2200, braking: 2800, turnAcceleration: 3050, airAcceleration: 1250, airBraking: 425, jumpVelocity: 760, attackCooldown: 560, attackRange: 520 },
  ezra: { runSpeed: 310, acceleration: 2150, braking: 2800, turnAcceleration: 3000, airAcceleration: 1200, airBraking: 425, jumpVelocity: 760, attackCooldown: 500, attackRange: 420 },
  teleportation_c: { runSpeed: 380, acceleration: 2500, braking: 3000, turnAcceleration: 3400, airAcceleration: 1500, airBraking: 500, jumpVelocity: 800, attackCooldown: 430, attackRange: 150 }
};

export const levelKey = (level: number): LevelNumber => (level === 5 ? FINAL_LEVEL : Math.min(MAX_LEVEL, Math.max(1, level))) as LevelNumber;
export const pointValueForPickup = (kind: PickupKind) => kind === "rush_star" ? 0 : kind === "heart" ? 125 : kind === "coin" ? 100 : 700;
