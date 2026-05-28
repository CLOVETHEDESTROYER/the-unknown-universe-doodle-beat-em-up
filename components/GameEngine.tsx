
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CHARACTER_CONFIGS } from '../characters';
import { CharacterId, DifficultyMode, GameStats } from '../types';

interface GameEngineProps {
  isPaused: boolean;
  currentLevel: number;
  difficulty: DifficultyMode;
  selectedCharacterId: CharacterId;
  initialScore: number;
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

type MonsterType = 'CHASER' | 'ALIEN' | 'GHOST' | 'DASHER' | 'FLOATER' | 'GIANT' | 'DEVIL' | 'COSMIC_GRUNT' | 'BOSS';
type EnemyClass = 'MELEE' | 'LONG_RANGE' | 'JUMPER';
type DestructibleType = 'TRASH' | 'BOX' | 'BOOKS' | 'VENDING';

const GameEngine: React.FC<GameEngineProps> = ({
  isPaused,
  currentLevel,
  difficulty,
  selectedCharacterId,
  initialScore,
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPausedRef = useRef(isPaused);
  const frameStepMs = 1000 / 60;
  const debugParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const debugSpawnSwordReward = debugParams.get('rewardSword') === '1' || debugParams.get('rewardSword') === 'true';
  const debugAutoClaimSwordReward = debugParams.get('rewardSwordAuto') === '1' || debugParams.get('rewardSwordAuto') === 'true';
  const debugSpawnBoss = debugParams.get('boss') === '1' || debugParams.get('boss') === 'true';
  const MAX_LEVEL = 4;
  const selectedCharacter = CHARACTER_CONFIGS[selectedCharacterId];
  const isXGod = selectedCharacterId === 'xgod';

  type LevelNumber = 1 | 2 | 3 | 4;
  const getLevelKey = (level: number): LevelNumber => Math.min(MAX_LEVEL, Math.max(1, level)) as LevelNumber;

  // Perspective Constants
  const SCREEN_WIDTH = 1024;
  const SCREEN_HEIGHT = 576;
  const HORIZON_Y = SCREEN_HEIGHT * 0.6;
  const FLOOR_BOTTOM = SCREEN_HEIGHT - 20;
  const WALK_ZONE_TOP = HORIZON_Y - (SCREEN_HEIGHT * 0.1);
  const WALK_ZONE_BOTTOM = SCREEN_HEIGHT - 4;
  const SECTION_CARD_TOP_Y = 48;
  const SECTION_CARD_OPACITY = 0.75;
  const HEART_HEAL_PERCENT = 0.3;
  const POINT_VALUES = {
    gold: 200,
    homework: 100,
    booksBreak: 50,
    teleporti: 250,
    dinioUnlock: 400,
    doghostUnlock: 500,
    teleportationCUnlock: 650,
    heart: 125,
    swordPickup: 300,
    xgodSwordReward: 900,
    inkShieldUnlock: 750,
    trashBreak: 20,
    boxBreak: 30,
    vendingBreak: 75,
    chaserKill: 60,
    alienKill: 85,
    ghostKill: 95,
    dasherKill: 110,
    floaterKill: 130,
    giantKill: 180,
    devilKill: 125,
    cosmicGruntKill: 150,
    level1BossKill: 1200,
    level2BossKill: 1500,
    level3BossKill: 2200,
    level4BossKill: 3200,
    gravityCoreUnlock: 900
  } as const;
  const DIFFICULTY_TUNING: Record<DifficultyMode, {
    enemyHpMultiplier: number;
    bossHpMultiplier: number;
    enemySpeedMultiplier: number;
    extraWaveMonsters: number;
  }> = {
    EASY: {
      enemyHpMultiplier: 0.86,
      bossHpMultiplier: 0.9,
      enemySpeedMultiplier: 0.92,
      extraWaveMonsters: -1
    },
    HARD: {
      enemyHpMultiplier: 1.18,
      bossHpMultiplier: 1.2,
      enemySpeedMultiplier: 1.08,
      extraWaveMonsters: 0
    },
    "X-GOD": {
      enemyHpMultiplier: 1.42,
      bossHpMultiplier: 1.48,
      enemySpeedMultiplier: 1.16,
      extraWaveMonsters: 1
    }
  };
  const difficultyTuning = DIFFICULTY_TUNING[difficulty];

  // --- TUNING CONSTANTS ---
  const PLAYER_SCALE = 0.5;
  const FRAME_WIDTH = 200; // 1606 / 8 ≈ 200
  const FRAME_HEIGHT = 327;
  const CHARACTER_WALK_FRAME_WIDTH = 256;
  const CHARACTER_WALK_FRAME_HEIGHT = 360;
  const CHARACTER_ATTACK_FRAME_WIDTH = 480;
  const CHARACTER_ATTACK_FRAME_HEIGHT = 360;
  const CHARACTER_DASH_FRAME_WIDTH = 256;
  const CHARACTER_DASH_FRAME_HEIGHT = 360;
  const CHARACTER_PROJECTILE_FRAME_WIDTH = 192;
  const CHARACTER_PROJECTILE_FRAME_HEIGHT = 96;
  const SMALL_ENEMY_FRAME_WIDTH = 280;
  const SMALL_ENEMY_FRAME_HEIGHT = 280;
  const GIANT_ENEMY_FRAME_WIDTH = 360;
  const GIANT_ENEMY_FRAME_HEIGHT = 420;
  const FALLBACK_FRAME_SIZE = 180;
  const GRUNT_WALK_FRAME_WIDTH = 543;
  const GRUNT_WALK_FRAME_HEIGHT = 724;
  const SWORD_WALK_FRAME_WIDTH = 232;
  const SWORD_WALK_FRAME_HEIGHT = 327;
  const SWORD_ATTACK_FRAME_WIDTH = 350;
  const SWORD_ATTACK_FRAME_HEIGHT = 332;
  const SWORD_COMBO_FRAMES = [0, 1, 2] as const;
  const SPIDER_FRAME_WIDTH = 560;
  const SPIDER_FRAME_HEIGHT = 578;
  const DARK_DRAGON_WALK_FRAME_WIDTH = 520;
  const DARK_DRAGON_WALK_FRAME_HEIGHT = 560;
  const DARK_DRAGON_ATTACK_FRAME_WIDTH = 960;
  const DARK_DRAGON_ATTACK_FRAME_HEIGHT = 620;
  const KILLINAS_DAUGHTER_WALK_FRAME_WIDTH = 560;
  const KILLINAS_DAUGHTER_WALK_FRAME_HEIGHT = 700;
  const KILLINAS_DAUGHTER_ATTACK_FRAME_WIDTH = 760;
  const KILLINAS_DAUGHTER_ATTACK_FRAME_HEIGHT = 720;
  const DINIO_WALK_FRAME_WIDTH = 238;
  const DINIO_WALK_FRAME_HEIGHT = 279;
  const DINIO_ATTACK_FRAME_WIDTH = 448;
  const DINIO_ATTACK_FRAME_HEIGHT = 300;
  const DOGHOST_WALK_FRAME_WIDTH = 240;
  const DOGHOST_WALK_FRAME_HEIGHT = 180;
  const TELEPORTATION_C_WALK_FRAME_WIDTH = 526;
  const TELEPORTATION_C_WALK_FRAME_HEIGHT = 482;
  const TELEPORTATION_C_ATTACK_FRAME_WIDTH = 551;
  const TELEPORTATION_C_ATTACK_FRAME_HEIGHT = 342;
  const MOONLIGHT_TERROR_WALK_FRAME_WIDTH = 560;
  const MOONLIGHT_TERROR_WALK_FRAME_HEIGHT = 632;
  const MOONLIGHT_TERROR_ATTACK_FRAME_WIDTH = 700;
  const MOONLIGHT_TERROR_ATTACK_FRAME_HEIGHT = 594;
  const COSMIC_GRUNT_FRAME_WIDTH = 543;
  const COSMIC_GRUNT_FRAME_HEIGHT = 724;
  const VOID_REGENT_WALK_FRAME_WIDTH = 720;
  const VOID_REGENT_WALK_FRAME_HEIGHT = 840;
  const VOID_REGENT_ATTACK_FRAME_WIDTH = 700;
  const VOID_REGENT_ATTACK_FRAME_HEIGHT = 840;
  const INK_BEHEMOTH_FRAME_WIDTH = 620;
  const INK_BEHEMOTH_FRAME_HEIGHT = 580;
  const XGOD_SWORD_POWERUP_FRAME_WIDTH = 420;
  const XGOD_SWORD_POWERUP_FRAME_HEIGHT = 700;
  const BACKGROUND_STRIP_HEIGHT = 850;
  const DARK_DRAGON = {
    scale: 0.98,
    corpseScale: 0.7,
    patrolRadius: 320,
    attackIntervalMs: 2700,
    windupMs: 520,
    breathMs: 1500,
    fireOrbSpeed: 560,
    phaseTwoFireOrbSpeed: 640,
    fireVolleyCount: 5,
    phaseTwoFireVolleyCount: 6
  };
  const KILLINAS_DAUGHTER = {
    scale: 0.74,
    patrolRadius: 245,
    attackIntervalMs: 2800,
    bulletSpeed: 450,
    bulletVolleyCount: 4,
    bulletVolleyDelayMs: 120,
    meleeRange: 205,
    meleeWindupMs: 360,
    meleeRecoverMs: 520,
    gunWindupMs: 260,
    gunRecoverMs: 720
  };
  const FEEL = {
    moveSpeed: 255,
    moveResponse: 0.26,
    verticalRatio: 0.78,
    dashMultiplier: 2.35,
    dashDuration: 170,
    dashCooldown: 560,
    attackDuration: 155,
    swordAttackDuration: 190,
    swordComboResetMs: 650,
    swordComboChainWindowMs: 110,
    attackReach: 66,
    jumpVelocity: 18,
    slamVelocity: -32,
    cameraLerp: 0.14,
    hitInvulnerabilityMs: 1040,
    hitKnockback: 235,
  };
  const DINIO = {
    scale: 0.88,
    followDistance: 112,
    verticalOffset: 18,
    moveSpeed: 210,
    attackRange: 360,
    shotSpeed: 360,
    shotCooldownMs: 880,
    unlockOrbX: 1520,
    walkOriginX: 0.5,
    attackOriginX: 0.3,
    originY: 0.9
  };
  const DOGHOST = {
    scale: 0.74,
    followDistance: 138,
    verticalOffset: -52,
    moveSpeed: 195,
    attackRange: 320,
    waveSpeed: 330,
    waveCooldownMs: 1120,
    unlockOrbX: 1760
  };
  const TELEPORTATION_C = {
    scale: 0.28,
    attackScale: 0.52,
    attackOriginX: 0.46,
    attackOriginY: 0.78,
    followDistance: 176,
    verticalOffset: -18,
    moveSpeed: 215,
    unlockOrbX: 2140,
    bobAmplitude: 16,
    attackRange: 380,
    attackCooldownMs: 1650,
    strikeDamage: 2,
    teleportOffsetX: 86,
    teleportOffsetY: -8
  };
  const GHOST_FLOAT = {
    scale: 0.58,
    floatSpeed: 132,
    chargeSpeed: 250,
    swoopSpeed: 510,
    attackLeadFrames: 120,
    chargeTimeoutFrames: 58,
    postSwoopRecoverFrames: 72
  };
  const GRAVITY_CORE = {
    unlockX: 1840,
    damageBonus: 1,
    maxCharges: 3
  };
  const CHARACTER_PLAYSTYLE: Record<CharacterId, {
    speedMultiplier: number;
    damageTakenMultiplier: number;
    attackDamageMultiplier: number;
    attackDurationMultiplier: number;
    attackReachBonus: number;
    dashCooldownMultiplier: number;
    specialCooldownMs: number;
  }> = {
    xgod: {
      speedMultiplier: 1.04,
      damageTakenMultiplier: 0.9,
      attackDamageMultiplier: 1.08,
      attackDurationMultiplier: 1,
      attackReachBonus: 0,
      dashCooldownMultiplier: 0.92,
      specialCooldownMs: 1100
    },
    barrett: {
      speedMultiplier: 0.93,
      damageTakenMultiplier: 0.78,
      attackDamageMultiplier: 1.26,
      attackDurationMultiplier: 1.18,
      attackReachBonus: 26,
      dashCooldownMultiplier: 1.08,
      specialCooldownMs: 1450
    },
    nico: {
      speedMultiplier: 0.99,
      damageTakenMultiplier: 0.96,
      attackDamageMultiplier: 1.08,
      attackDurationMultiplier: 1.12,
      attackReachBonus: 12,
      dashCooldownMultiplier: 1.02,
      specialCooldownMs: 1350
    },
    ezra: {
      speedMultiplier: 0.96,
      damageTakenMultiplier: 1.1,
      attackDamageMultiplier: 1.2,
      attackDurationMultiplier: 1.08,
      attackReachBonus: 10,
      dashCooldownMultiplier: 1.04,
      specialCooldownMs: 1300
    },
    teleportation_c: {
      speedMultiplier: 1.16,
      damageTakenMultiplier: 1.08,
      attackDamageMultiplier: 0.96,
      attackDurationMultiplier: 0.88,
      attackReachBonus: 18,
      dashCooldownMultiplier: 0.82,
      specialCooldownMs: 960
    }
  };
  const playstyle = CHARACTER_PLAYSTYLE[selectedCharacterId];
  const VOID_REGENT = {
    scale: 0.52,
    attackScale: 0.55,
    attackIntervalMs: 2250,
    windupMs: 430,
    beamMs: 1150,
    boltSpeed: 650,
    patrolRadius: 315,
    burstCount: 7
  };
  const INK_BEHEMOTH = {
    scale: 0.84,
    attackScale: 0.9,
    patrolRadius: 260,
    attackIntervalMs: 2450,
    windupMs: 420,
    spitSpeed: 430,
    spitCount: 4,
    quakeRadius: 235
  };
  const ENCOUNTERS = {
    waveCounts: [3, 4, 5],
    monsterSpeed: {
      chaser: 108,
      dasher: 180,
      floater: 100,
      bossChase: 78,
      bossRage: 122,
    },
  };
  const POWERUPS = {
    shieldCooldownMs: 8000,
    shieldBlockInvulnerabilityMs: 320,
  };
  const LEVEL_PROFILES = {
    1: {
      chapter: 'THE SCRATCH',
      sectionCards: [
        { title: 'SECTION 1', subtitle: 'LOCKER ALLEY AMBUSH' },
        { title: 'SECTION 2', subtitle: 'SKOOL YARD RUSH' },
        { title: 'SECTION 3', subtitle: 'INK BLOCK SHOWDOWN' },
        { title: 'BOSS ZONE', subtitle: 'INK BEHEMOTH GATE' },
      ],
      backgrounds: ['dark_alleyway_1', 'dark_alleyway_2', 'dark_alleyway_3', 'dark_alleyway_3'],
      wavePlans: [
        { primaryEnemy: 'CHASER', supportEnemies: ['FLOATER'], baseCount: 3, staggerMs: 640, supportSlots: [2], rearSlots: [] },
        { primaryEnemy: 'CHASER', supportEnemies: ['DEVIL', 'FLOATER'], baseCount: 4, staggerMs: 580, supportSlots: [2, 4], rearSlots: [4] },
        { primaryEnemy: 'CHASER', supportEnemies: ['DEVIL', 'DASHER', 'FLOATER'], baseCount: 5, staggerMs: 520, supportSlots: [1, 3, 5], rearSlots: [4, 6] }
      ],
      tint: 0xffffff,
      floor: 0x94a3b8,
      floorAlpha: 0.22,
      atmosphereColor: 0xffffff,
      atmosphereAlpha: 0.08,
      fitBackgroundToScreen: true
    },
    2: {
      chapter: 'THE GRAVEYARD',
      sectionCards: [
        { title: 'GRAVE 1', subtitle: 'MAUSOLEUM ROW' },
        { title: 'GRAVE 2', subtitle: 'BLOOD MOON WAY' },
        { title: 'GRAVE 2.5', subtitle: 'CROW STORM FIELD' },
        { title: 'BOSS ZONE', subtitle: "KILLINA'S MAUSOLEUM" },
      ],
      backgrounds: ['graveyard_level1', 'graveyard_level2', 'graveyard_level2_5', 'graveyard_level3'],
      wavePlans: [
        { primaryEnemy: 'ALIEN', supportEnemies: ['DASHER', 'CHASER'], baseCount: 4, staggerMs: 600, supportSlots: [2, 4], rearSlots: [3] },
        { primaryEnemy: 'ALIEN', supportEnemies: ['DASHER', 'FLOATER', 'GHOST'], baseCount: 5, staggerMs: 540, supportSlots: [1, 3, 5], rearSlots: [3, 5] },
        { primaryEnemy: 'ALIEN', supportEnemies: ['DASHER', 'GIANT', 'GHOST'], baseCount: 5, staggerMs: 500, supportSlots: [2, 4, 6], rearSlots: [3, 6] }
      ],
      tint: 0xffffff,
      floor: 0x475569,
      floorAlpha: 0.16,
      atmosphereColor: 0xe2e8f0,
      atmosphereAlpha: 0.04,
      fitBackgroundToScreen: true
    },
    3: {
      chapter: 'THE FURNACE',
      sectionCards: [
        { title: 'FURNACE 1', subtitle: 'ASH-LIT ENTRY' },
        { title: 'FURNACE 2', subtitle: 'EMBER CUTTHROAT WAY' },
        { title: 'FURNACE 3', subtitle: 'CINDER RAMPART' },
        { title: 'BOSS ZONE', subtitle: 'THE VOID GATE' },
      ],
      backgrounds: ['cave_level_1', 'cave_level_2', 'cave_level_3', 'cave_level_3'],
      wavePlans: [
        { primaryEnemy: 'DEVIL', supportEnemies: ['GIANT', 'GHOST'], baseCount: 4, staggerMs: 720, supportSlots: [1, 3], rearSlots: [3] },
        { primaryEnemy: 'DEVIL', supportEnemies: ['DASHER', 'GIANT', 'ALIEN', 'GHOST'], baseCount: 5, staggerMs: 640, supportSlots: [1, 3, 4, 5], rearSlots: [3, 5] },
        { primaryEnemy: 'DEVIL', supportEnemies: ['GIANT', 'DASHER', 'ALIEN', 'GHOST'], baseCount: 5, staggerMs: 580, supportSlots: [1, 2, 4, 6], rearSlots: [4, 6] }
      ],
      tint: 0xffffff,
      floor: 0x3f3f46,
      floorAlpha: 0.16,
      atmosphereColor: 0xfca5a5,
      atmosphereAlpha: 0.04,
      fitBackgroundToScreen: true
    },
    4: {
      chapter: 'THE DREAD PLANET',
      sectionCards: [
        { title: 'ORBIT 1', subtitle: 'CRATER OF TEETH' },
        { title: 'ORBIT 2', subtitle: 'RIFT-CROWNED VALLEY' },
        { title: 'ORBIT 3', subtitle: 'THE PLANET THAT HUNTS' },
        { title: 'FINAL BOSS', subtitle: 'VOID REGENT THRONE' },
      ],
      backgrounds: ['space_level_1', 'space_level_2', 'space_level_3_ai', 'space_level_3_ai'],
      wavePlans: [
        { primaryEnemy: 'COSMIC_GRUNT', supportEnemies: ['GHOST', 'DASHER'], baseCount: 5, staggerMs: 620, supportSlots: [2, 4], rearSlots: [3] },
        { primaryEnemy: 'COSMIC_GRUNT', supportEnemies: ['FLOATER', 'DEVIL', 'GHOST'], baseCount: 6, staggerMs: 560, supportSlots: [1, 3, 5], rearSlots: [2, 5] },
        { primaryEnemy: 'COSMIC_GRUNT', supportEnemies: ['GIANT', 'DASHER', 'DEVIL', 'FLOATER'], baseCount: 7, staggerMs: 500, supportSlots: [1, 3, 5, 7], rearSlots: [2, 4, 7] }
      ],
      tint: 0xffffff,
      floor: 0x1f1138,
      floorAlpha: 0.1,
      atmosphereColor: 0xc084fc,
      atmosphereAlpha: 0.05,
      fitBackgroundToScreen: true
    }
  } as const;
  // ------------------------

  const getAudioContext = () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();

        // Resume audio context on first user interaction
        const resumeAudio = () => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              window.removeEventListener('click', resumeAudio);
              window.removeEventListener('keydown', resumeAudio);
            });
          }
        };

        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
      }
      return audioContextRef.current;
    } catch (e) {
      return null;
    }
  };

  const playSound = (config: {
    type?: OscillatorType;
    freq?: number;
    endFreq?: number;
    volume?: number;
    duration?: number;
    noise?: boolean;
  }) => {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      const duration = config.duration || 0.1;
      const volume = config.volume || 0.1;

      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      if (config.noise) {
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start();
        source.stop(ctx.currentTime + duration);
      } else {
        const osc = ctx.createOscillator();
        osc.type = config.type || 'sine';
        osc.frequency.setValueAtTime(config.freq || 440, ctx.currentTime);
        if (config.endFreq) {
          osc.frequency.exponentialRampToValueAtTime(config.endFreq, ctx.currentTime + duration);
        }
        osc.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) {
      console.warn("Sound generation failed:", e);
    }
  };

  const sounds = {
    soul: () => playSound({ freq: 880, endFreq: 1200, volume: 0.1, duration: 0.15, type: 'sine' }),
    attack: () => playSound({ freq: 300, endFreq: 100, volume: 0.05, duration: 0.1, type: 'sawtooth' }),
    slam: () => playSound({ freq: 150, endFreq: 50, volume: 0.2, duration: 0.2, type: 'square' }),
    hit: () => playSound({ noise: true, volume: 0.08, duration: 0.05 }),
    hurt: () => playSound({ freq: 150, endFreq: 50, volume: 0.2, duration: 0.3, type: 'square' }),
    health: () => {
      playSound({ freq: 440, volume: 0.1, duration: 0.1 });
      setTimeout(() => playSound({ freq: 554, volume: 0.1, duration: 0.1 }), 50);
      setTimeout(() => playSound({ freq: 659, volume: 0.1, duration: 0.1 }), 100);
    },
    trash: () => playSound({ noise: true, volume: 0.1, duration: 0.2 }),
    growl: () => playSound({ freq: 120, endFreq: 40, volume: 0.2, duration: 0.6, type: 'sawtooth' }),
    bossShoot: () => playSound({ freq: 400, endFreq: 800, volume: 0.15, duration: 0.2, type: 'triangle' }),
    dash: () => playSound({ noise: true, volume: 0.08, duration: 0.15 }),
    jump: () => playSound({ freq: 200, endFreq: 600, volume: 0.1, duration: 0.2, type: 'sine' }),
    fanfare: () => {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        setTimeout(() => playSound({ freq: f, volume: 0.1, duration: 0.4, type: 'triangle' }), i * 150);
      });
    }
  };

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!gameRef.current) return;
    const activeScenes = gameRef.current.scene.getScenes(true);
    activeScenes.forEach(scene => {
      if (isPaused) scene.scene.pause();
      else scene.scene.resume();
    });
  }, [isPaused]);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const testWindow = window as Window & {
      advanceTime?: (ms: number) => Promise<void>;
      render_game_to_text?: () => string;
      __unknownUniverseTouchControls?: Partial<Record<'left' | 'right' | 'up' | 'down' | 'attack' | 'jump' | 'dash', boolean>>;
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      parent: gameContainerRef.current,
      backgroundColor: '#0f172a',
      render: {
        antialias: true,
        pixelArt: false,
        preserveDrawingBuffer: true
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
      },
      scene: { preload, create, update }
    };

    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let playerShadow: Phaser.GameObjects.Image;
    let dinioCompanion: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
    let doghostCompanion: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
    let teleportationCCompanion: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
    let attackHitbox: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    let backgroundGraphics: Phaser.GameObjects.Graphics;
    let backgroundStrip: Phaser.GameObjects.Container;
    let backgroundStripWidth = SCREEN_WIDTH;
    const failedAssetKeys = new Set<string>();
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let attackKey: Phaser.Input.Keyboard.Key;
    let jumpKey: Phaser.Input.Keyboard.Key;
    let jumpAltKey: Phaser.Input.Keyboard.Key;
    let dashKey: Phaser.Input.Keyboard.Key;
    let dashAltKey: Phaser.Input.Keyboard.Key;
    let pauseKey: Phaser.Input.Keyboard.Key;
    let previousTouchAttack = false;
    let previousTouchJump = false;
    let previousTouchDash = false;
    let keepMovingPrompt: Phaser.GameObjects.Container;
    let transitionOverlay: Phaser.GameObjects.Container;
    let swordRewardOverlay: Phaser.GameObjects.Container;
    let sectionCardOverlay: Phaser.GameObjects.Container;
    let bossHud: Phaser.GameObjects.Container;
    let bossLabelText: Phaser.GameObjects.Text;
    let bossBarFill: Phaser.GameObjects.Rectangle;
    let bossIntentText: Phaser.GameObjects.Text;
    let feedbackFlash: Phaser.GameObjects.Rectangle;
    let streetDressings: Phaser.GameObjects.Image[] = [];

    let souls: Phaser.Physics.Arcade.Group;
    let monsters: Phaser.Physics.Arcade.Group;
    let projectiles: Phaser.Physics.Arcade.Group;
    let allyProjectiles: Phaser.Physics.Arcade.Group;
    let destructibles: Phaser.Physics.Arcade.Group;
    let healthUpgrades: Phaser.Physics.Arcade.Group;
    let homeworkPickups: Phaser.Physics.Arcade.Group;
    let swordPickups: Phaser.Physics.Arcade.Group;
    let swordRewardPickups: Phaser.Physics.Arcade.Group;
    let dinioPickups: Phaser.Physics.Arcade.Group;
    let doghostPickups: Phaser.Physics.Arcade.Group;
    let teleportationCPickups: Phaser.Physics.Arcade.Group;
    let teleportiPickups: Phaser.Physics.Arcade.Group;
    let gravityCorePickups: Phaser.Physics.Arcade.Group;
    let healthGraphics: Phaser.GameObjects.Graphics;
    let playerSword: Phaser.GameObjects.Image;
    let playerShield: Phaser.GameObjects.Image;

    let currentSouls = 0;
    let currentKills = 0;
    let currentScore = initialScore;
    let playerHealth = 100;
    let playerLives = 3;
    let swordUnlocked = initialSwordUnlocked;
    let hasFlameSword = initialHasFlameSword;
    let characterPowerUnlocked = isXGod ? initialHasFlameSword : initialCharacterPowerUnlocked;
    let nextCharacterSpecialAt = 0;
    let swordDurability = initialSwordDurability;
    let shieldUnlocked = initialShieldUnlocked;
    let inkShieldReady = initialInkShieldReady;
    let dinioUnlocked = initialDinioUnlocked;
    let hasDinio = initialHasDinio;
    let dinioNextShotAt = 0;
    let dinioAttackEndsAt = 0;
    let dinioAttackFacing = 1;
    let doghostUnlocked = initialDoghostUnlocked;
    let hasDoghost = initialHasDoghost;
    let doghostNextShotAt = 0;
    let doghostAttackEndsAt = 0;
    let teleportationCUnlocked = initialTeleportationCUnlocked;
    let hasTeleportationC = initialHasTeleportationC;
    let teleportationCNextStrikeAt = 0;
    let teleportationCAttackEndsAt = 0;
    let teleportationCAttackFacing = 1;
    let gravityCoreUnlocked = initialGravityCoreUnlocked;
    let gravityCoreCharges = initialGravityCoreUnlocked ? Math.max(1, initialGravityCoreCharges) : 0;
    let shieldRechargeAt = 0;
    let isAttacking = false;
    let attackEndsAt = 0;
    let playerAttackVisualHoldUntil = 0;
    let playerAttackId = 0;
    let swordComboStep = 0;
    let swordComboResetAt = 0;
    let isSlamming = false;
    let playerInvulnerable = false;
    let invulnerabilityEndsAt = 0;
    let facingDirection = 1;
    let lastDestructibleSpawnX = 0;
    let isLevelTransitioning = false;
    let pendingSwordRewardPickup = false;
    let isSwordRewardSequenceActive = false;
    let isDazed = false;
    let dazedRecoveryAt = 0;
    let gameOverRestartAt = 0;

    // Jump & Dash State
    let isJumping = false;
    let jumpZ = 0;
    let jumpVelocity = 0;
    const jumpGravity = -0.7;
    let isDashing = false;
    let dashEndsAt = 0;
    let dashCooldown = 0;

    let currentSectionIndex = 0;
    let isFightingWave = false;
    let pendingWaveSpawns = 0;
      let lastMovementTime = 0;
      let teleportiCooldownUntil = 0;
      let teleportHangUntil = 0;
      let playableTeleportStrikeDepthUntil = 0;
      let teleportHoldJumpZ = 0;
    let virtualTime = 0;
    let isManualStepping = false;
    const fightSections = [800, 1600, 2400, 3200];

    function syncPowerupStats(extra: Partial<GameStats> = {}) {
      onStatsUpdate({
        score: currentScore,
        swordUnlocked,
        hasFlameSword,
        swordDurability,
        maxSwordDurability,
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
        ...extra
      });
    }

    function addScore(points: number, extra: Partial<GameStats> = {}) {
      if (points !== 0) {
        currentScore += points;
      }
      onStatsUpdate({
        score: currentScore,
        ...extra
      });
    }

    function getMonsterPointValue(monster: Phaser.Physics.Arcade.Sprite) {
      const type = monster.getData('type') as MonsterType;
      switch (type) {
        case 'BOSS':
          return currentLevel === 1
            ? POINT_VALUES.level1BossKill
            : currentLevel === 2
              ? POINT_VALUES.level2BossKill
              : currentLevel === 3
                ? POINT_VALUES.level3BossKill
                : POINT_VALUES.level4BossKill;
        case 'ALIEN':
          return POINT_VALUES.alienKill;
        case 'GHOST':
          return POINT_VALUES.ghostKill;
        case 'DASHER':
          return POINT_VALUES.dasherKill;
        case 'FLOATER':
          return POINT_VALUES.floaterKill;
        case 'GIANT':
          return POINT_VALUES.giantKill;
        case 'DEVIL':
          return POINT_VALUES.devilKill;
        case 'COSMIC_GRUNT':
          return POINT_VALUES.cosmicGruntKill;
        case 'CHASER':
        default:
          return POINT_VALUES.chaserKill;
      }
    }

    function getDestructiblePointValue(type: DestructibleType) {
      switch (type) {
        case 'BOOKS':
          return POINT_VALUES.booksBreak;
        case 'BOX':
          return POINT_VALUES.boxBreak;
        case 'VENDING':
          return POINT_VALUES.vendingBreak;
        case 'TRASH':
        default:
          return POINT_VALUES.trashBreak;
      }
    }

    function flashPlayerHitTint(scene: Phaser.Scene, color: number = 0xef4444, duration: number = 180) {
      if (!player || !player.active) {
        return;
      }

      scene.tweens.killTweensOf(player, 'tint');
      player.setTint(color);
      scene.time.delayedCall(duration, () => {
        if (player && player.active && !isDazed) {
          player.clearTint();
        }
      });
    }

    function playPlayerScalePulse(scene: Phaser.Scene, scaleX: number, scaleY: number, duration: number) {
      if (!player || !player.active) {
        return;
      }

      scene.tweens.killTweensOf(player);
      player.setScale(PLAYER_SCALE);
      scene.tweens.add({
        targets: player,
        scaleX,
        scaleY,
        duration,
        yoyo: true,
        onComplete: () => {
          if (player && player.active) {
            player.setScale(PLAYER_SCALE);
          }
        }
      });
    }

    function endPlayerAttack() {
      isAttacking = false;
      attackEndsAt = 0;
      if (player && player.active) {
        player.setScale(PLAYER_SCALE);
      }
    }

    function startPlayerAttack(scene: Phaser.Scene, currentTime: number, duration: number) {
      isAttacking = true;
      playerAttackId++;
      const attackId = playerAttackId;
      attackEndsAt = currentTime + duration;
      playerAttackVisualHoldUntil = selectedCharacterId === 'barrett' ? currentTime + 1700 : attackEndsAt;
      scene.tweens.killTweensOf(player);
      if (player && player.active) {
        player.setScale(PLAYER_SCALE);
        if (selectedCharacterId === 'barrett' && scene.textures.exists('character_attack')) {
          player.setTexture('character_attack', 3);
        }
      }
      scene.tweens.add({
        targets: player,
        scaleX: PLAYER_SCALE * 1.24,
        scaleY: PLAYER_SCALE * 1.18,
        duration,
        yoyo: true,
        onComplete: () => {
          if (attackId === playerAttackId && scene.time.now >= attackEndsAt) {
            endPlayerAttack();
          }
        }
      });
    }

    function startSwordComboAttack(scene: Phaser.Scene, currentTime: number) {
      if (currentTime > swordComboResetAt) {
        swordComboStep = 0;
      } else {
        swordComboStep = (swordComboStep + 1) % SWORD_COMBO_FRAMES.length;
      }
      swordComboResetAt = currentTime + FEEL.swordComboResetMs;
      startPlayerAttack(scene, currentTime, FEEL.swordAttackDuration * playstyle.attackDurationMultiplier);
    }

    function setPlayerInvulnerableUntil(until: number) {
      invulnerabilityEndsAt = Math.max(invulnerabilityEndsAt, until);
      playerInvulnerable = true;
    }

    function clearPlayerInvulnerability() {
      playerInvulnerable = false;
      invulnerabilityEndsAt = 0;
      if (player && player.active) {
        player.alpha = 1;
      }
    }

    function endPlayerDash() {
      isDashing = false;
      dashEndsAt = 0;
    }

    function resetPlayerActionState() {
      endPlayerAttack();
      endPlayerDash();
      swordComboStep = 0;
      swordComboResetAt = 0;
      dinioAttackEndsAt = 0;
      doghostAttackEndsAt = 0;
      isJumping = false;
      isSlamming = false;
      jumpZ = 0;
      jumpVelocity = 0;
      teleportHangUntil = 0;
      teleportHoldJumpZ = 0;
      if (player && player.active) {
        player.setScale(PLAYER_SCALE);
        player.alpha = 1;
        player.clearTint();
      }
    }

    function completeRespawn() {
      if (!isDazed || dazedRecoveryAt === 0) {
        return;
      }

      isDazed = false;
      dazedRecoveryAt = 0;
      resetPlayerActionState();
      clearPlayerInvulnerability();
      playerHealth = 100;
      onStatsUpdate({ health: 100 });

      if (player && player.active) {
        player.setPosition(player.x - 200, (HORIZON_Y + FLOOR_BOTTOM) / 2);
      }
    }

    function completeGameOver(scene: Phaser.Scene) {
      if (gameOverRestartAt === 0) {
        return;
      }

      gameOverRestartAt = 0;
      isDazed = false;
      dazedRecoveryAt = 0;
      resetPlayerActionState();
      clearPlayerInvulnerability();
      const finalSnapshot = {
        score: currentScore,
        level: currentLevel,
        souls: currentSouls,
        monstersDefeated: currentKills,
        swordUnlocked,
        hasFlameSword,
        swordDurability,
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
        characterPowerUnlocked
      };
      currentScore = 0;
      currentSouls = 0;
      currentKills = 0;
      swordUnlocked = false;
      hasFlameSword = false;
      swordDurability = 0;
      shieldUnlocked = false;
      inkShieldReady = false;
      dinioUnlocked = false;
      hasDinio = false;
      doghostUnlocked = false;
      hasDoghost = false;
      teleportationCUnlocked = false;
      hasTeleportationC = false;
      gravityCoreUnlocked = false;
      gravityCoreCharges = 0;
      characterPowerUnlocked = false;
      scene.scene.restart();
      onStatsUpdate({
        ...finalSnapshot,
        lives: 0,
        health: 0,
        isVictory: false
      });
    }

    function textureOrFallback(
      scene: Phaser.Scene,
      key: string,
      fallbackKey: 'fallback_player' | 'fallback_enemy' | 'fallback_boss' | 'fallback_object' | 'fallback_powerup' = 'fallback_object'
    ) {
      if (!failedAssetKeys.has(key) && scene.textures.exists(key)) {
        return key;
      }
      if (scene.textures.exists(fallbackKey)) {
        return fallbackKey;
      }
      return key;
    }

    function preload(this: Phaser.Scene) {
      failedAssetKeys.clear();
      this.load.on('loaderror', (file: { key?: string; src?: string }) => {
        if (file.key) {
          failedAssetKeys.add(file.key);
          console.warn(`[Unknown Universe] Asset failed to load: ${file.key}`, file.src ?? '');
        }
      });

      this.load.image('fallback_player', 'doodles/fallback_player.svg');
      this.load.image('fallback_enemy', 'doodles/fallback_enemy.svg');
      this.load.image('fallback_boss', 'doodles/fallback_boss.svg');
      this.load.image('fallback_object', 'doodles/fallback_object.svg');
      this.load.image('fallback_powerup', 'doodles/fallback_powerup.svg');

      if (!isXGod) {
        this.load.spritesheet('character_walk', `characters/${selectedCharacterId}/walk.png`, {
          frameWidth: CHARACTER_WALK_FRAME_WIDTH,
          frameHeight: CHARACTER_WALK_FRAME_HEIGHT
        });
        this.load.spritesheet('character_attack', `characters/${selectedCharacterId}/attack.png`, {
          frameWidth: CHARACTER_ATTACK_FRAME_WIDTH,
          frameHeight: CHARACTER_ATTACK_FRAME_HEIGHT
        });
        this.load.spritesheet('character_dash', `characters/${selectedCharacterId}/dash.png`, {
          frameWidth: CHARACTER_DASH_FRAME_WIDTH,
          frameHeight: CHARACTER_DASH_FRAME_HEIGHT
        });
        this.load.image('character_jump', `characters/${selectedCharacterId}/jump.png`);
        this.load.image('character_dazed', `characters/${selectedCharacterId}/dazed.png`);
        this.load.image('character_dead', `characters/${selectedCharacterId}/dead.png`);
        this.load.image('character_reward', `characters/${selectedCharacterId}/reward.png`);
        this.load.image('character_projectile', `characters/${selectedCharacterId}/projectile.png`);
        if (selectedCharacterId === 'nico' || selectedCharacterId === 'ezra') {
          this.load.spritesheet('character_projectile_anim', `characters/${selectedCharacterId}/projectile-sheet.png`, {
            frameWidth: CHARACTER_PROJECTILE_FRAME_WIDTH,
            frameHeight: CHARACTER_PROJECTILE_FRAME_HEIGHT
          });
        }
        this.load.image('character_burst', `characters/${selectedCharacterId}/burst.png`);
        this.load.image('character_special', `characters/${selectedCharacterId}/special.png`);
      }

      if (playerSprite) {
        this.load.spritesheet('player_walk', playerSprite, {
          frameWidth: FALLBACK_FRAME_SIZE,
          frameHeight: FALLBACK_FRAME_SIZE
        });
      } else {
        this.load.spritesheet('player_walk_internal', 'player_walk.png', {
          frameWidth: FRAME_WIDTH,
          frameHeight: FRAME_HEIGHT
        });
      }
      this.load.image('player_jump', 'player_jump.png');
      this.load.image('player_buttbomb', 'player_buttbomb.png');
      this.load.image('player_attack', 'player_attack.png');
      this.load.spritesheet('player_sword_walk', 'player_sword_walk.png', {
        frameWidth: SWORD_WALK_FRAME_WIDTH,
        frameHeight: SWORD_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('player_sword_attack', 'player_sword_attack.png', {
        frameWidth: SWORD_ATTACK_FRAME_WIDTH,
        frameHeight: SWORD_ATTACK_FRAME_HEIGHT
      });
      this.load.spritesheet('spider_walk', 'spider_walk.png', {
        frameWidth: SPIDER_FRAME_WIDTH,
        frameHeight: SPIDER_FRAME_HEIGHT
      });
      this.load.spritesheet('spider_attack', 'spider_attack.png', {
        frameWidth: SPIDER_FRAME_WIDTH,
        frameHeight: SPIDER_FRAME_HEIGHT
      });
      this.load.spritesheet('dark_dragon_walk', 'dark_dragon_walk_v2.png', {
        frameWidth: DARK_DRAGON_WALK_FRAME_WIDTH,
        frameHeight: DARK_DRAGON_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('dark_dragon_attack', 'dark_dragon_attack_v2.png', {
        frameWidth: DARK_DRAGON_ATTACK_FRAME_WIDTH,
        frameHeight: DARK_DRAGON_ATTACK_FRAME_HEIGHT
      });
      this.load.image('dark_dragon_dead', 'dark_dragon_dead_v2.png');
      this.load.spritesheet('killinas_daughter_walk', 'killinas_daughter_walk_v2.png', {
        frameWidth: KILLINAS_DAUGHTER_WALK_FRAME_WIDTH,
        frameHeight: KILLINAS_DAUGHTER_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('killinas_daughter_attack', 'killinas_daughter_attack_v2.png', {
        frameWidth: KILLINAS_DAUGHTER_ATTACK_FRAME_WIDTH,
        frameHeight: KILLINAS_DAUGHTER_ATTACK_FRAME_HEIGHT
      });
      this.load.image('player_dazed', 'player_dazed.png');
      this.load.image('player_dead', 'player_dead.png');
      this.load.spritesheet('dinio_walk', 'dinio_walk.png', {
        frameWidth: DINIO_WALK_FRAME_WIDTH,
        frameHeight: DINIO_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('dinio_attack', 'dinio_attack.png', {
        frameWidth: DINIO_ATTACK_FRAME_WIDTH,
        frameHeight: DINIO_ATTACK_FRAME_HEIGHT
      });
      this.load.spritesheet('doghost_walk', 'doghost_walk.png', {
        frameWidth: DOGHOST_WALK_FRAME_WIDTH,
        frameHeight: DOGHOST_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('teleportation_c_walk', 'teleportation_c_walk.png', {
        frameWidth: TELEPORTATION_C_WALK_FRAME_WIDTH,
        frameHeight: TELEPORTATION_C_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('teleportation_c_attack', 'teleportation_c_attack.png', {
        frameWidth: TELEPORTATION_C_ATTACK_FRAME_WIDTH,
        frameHeight: TELEPORTATION_C_ATTACK_FRAME_HEIGHT
      });
      this.load.spritesheet('moonlight_terror_walk', 'moonlight_terror_walk.png', {
        frameWidth: MOONLIGHT_TERROR_WALK_FRAME_WIDTH,
        frameHeight: MOONLIGHT_TERROR_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('moonlight_terror_attack', 'moonlight_terror_attack.png', {
        frameWidth: MOONLIGHT_TERROR_ATTACK_FRAME_WIDTH,
        frameHeight: MOONLIGHT_TERROR_ATTACK_FRAME_HEIGHT
      });
      this.load.spritesheet('cosmic_grunt_walk', 'doodles/cosmic_grunt_walk_ai.png', {
        frameWidth: COSMIC_GRUNT_FRAME_WIDTH,
        frameHeight: COSMIC_GRUNT_FRAME_HEIGHT
      });
      this.load.spritesheet('void_regent_walk', 'doodles/void_regent_walk_v2.png', {
        frameWidth: VOID_REGENT_WALK_FRAME_WIDTH,
        frameHeight: VOID_REGENT_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('void_regent_attack', 'doodles/void_regent_attack_v2.png', {
        frameWidth: VOID_REGENT_ATTACK_FRAME_WIDTH,
        frameHeight: VOID_REGENT_ATTACK_FRAME_HEIGHT
      });
      this.load.spritesheet('ink_behemoth_walk', 'ink_behemoth_walk.png', {
        frameWidth: INK_BEHEMOTH_FRAME_WIDTH,
        frameHeight: INK_BEHEMOTH_FRAME_HEIGHT
      });
      this.load.spritesheet('ink_behemoth_attack', 'ink_behemoth_attack.png', {
        frameWidth: INK_BEHEMOTH_FRAME_WIDTH,
        frameHeight: INK_BEHEMOTH_FRAME_HEIGHT
      });
      this.load.image('boss_fireball', 'doodles/boss_fireball_v2.png');
      this.load.image('killinas_bullet', 'doodles/killinas_bullet_v2.png');
      this.load.image('void_bolt', 'doodles/void_bolt_v2.png');
      this.load.image('ink_boss_spit', 'doodles/ink_boss_spit_v2.png');
      this.load.image('xgod_sword_reward', 'xgod_sword_reward_fit.png');
      this.load.spritesheet('xgod_sword_powerup', 'xgod_sword_powerup.png', {
        frameWidth: XGOD_SWORD_POWERUP_FRAME_WIDTH,
        frameHeight: XGOD_SWORD_POWERUP_FRAME_HEIGHT
      });
      this.load.image('ghost_float', 'ghost_float.png');
      this.load.image('background_alley', 'background_alley.png');
      this.load.image('dark_alleyway_1', 'dark_alleyway_1.png');
      this.load.image('dark_alleyway_2', 'dark_alleyway_2.png');
      this.load.image('dark_alleyway_3', 'dark_alleyway_3.png');
      this.load.image('graveyard_level1', 'graveyard_level1.png');
      this.load.image('graveyard_level2', 'graveyard_level2.png');
      this.load.image('graveyard_level2_5', 'graveyard_level2_5.png');
      this.load.image('graveyard_level3', 'graveyard_level3.png');
      this.load.image('cave_level_1', 'cave_level_1.png');
      this.load.image('cave_level_2', 'cave_level_2.png');
      this.load.image('cave_level_3', 'cave_level_3.png');
      this.load.image('space_level_1', 'doodles/space_level_1.svg');
      this.load.image('space_level_2', 'doodles/space_level_2.svg');
      this.load.image('space_level_3', 'doodles/space_level_3.svg');
      this.load.image('space_level_3_ai', 'doodles/space_level_3_ai.png');
      this.load.spritesheet('player_dash', 'player_dash.png', {
        frameWidth: 221, // 887 / 4
        frameHeight: 266
      });
      this.load.spritesheet('grunt_walking', 'grunt_walking_ai.png', {
        frameWidth: GRUNT_WALK_FRAME_WIDTH,
        frameHeight: GRUNT_WALK_FRAME_HEIGHT
      });
      this.load.spritesheet('grunt_dead', 'grunt_dead.png', {
        frameWidth: 335,
        frameHeight: 419 // Actual height from file
      });
      this.load.image('grunt_pile', 'grunt_pile.png');
      this.load.image('p_happy', 'doodles/p_happy.svg');
      this.load.image('m_devil', 'doodles/m_devil.png');
      this.load.spritesheet('m_alien_walk', 'doodles/m_alien_walk_ai.png', {
        frameWidth: SMALL_ENEMY_FRAME_WIDTH,
        frameHeight: SMALL_ENEMY_FRAME_HEIGHT
      });
      this.load.image('m_alien', 'doodles/m_alien.png');
      this.load.image('m_ghost', 'ghost_float.png');
      this.load.image('m_ghost_attack', 'ghost_attack.png');
      this.load.image('m_boss', 'doodles/m_boss.png');
      this.load.image('h_heart', 'heart_sprite.png');
      this.load.image('homework_pickup', 'homework_pickup.png');
      this.load.image('gold_pickup', 'gold_pickup.png');
      this.load.image('o_trash', 'doodles/o_trash.png');
      this.load.image('o_box', 'doodles/o_box.png');
      this.load.image('o_books', 'doodles/o_books.png');
      this.load.image('o_vending', 'doodles/o_vending.png');
      this.load.image('ink_splat', 'doodles/ink_splat.svg');
      this.load.image('impact_vfx', 'doodles/impact_vfx.svg');
      this.load.image('scrap', 'homework_pickup.png');
      this.load.image('soulTexture', 'doodles/soul_orb.svg');
      this.load.image('m_floater', 'doodles/m_floater.png');
      this.load.spritesheet('m_dasher_walk', 'doodles/m_dasher_walk_ai.png', {
        frameWidth: SMALL_ENEMY_FRAME_WIDTH,
        frameHeight: SMALL_ENEMY_FRAME_HEIGHT
      });
      this.load.image('m_dasher', 'doodles/m_dasher.png');
      this.load.spritesheet('m_giant_walk', 'doodles/m_giant_walk_ai.png', {
        frameWidth: GIANT_ENEMY_FRAME_WIDTH,
        frameHeight: GIANT_ENEMY_FRAME_HEIGHT
      });
      this.load.image('m_giant', 'doodles/m_giant.png');
      this.load.image('slam_wave', 'doodles/slam_wave.svg');
      this.load.image('shadow_oval', 'doodles/shadow_oval.png');
      this.load.image('spawn_burst', 'doodles/spawn_burst.svg');
      this.load.image('d_cone', 'doodles/d_cone.png');
      this.load.image('d_lamp', 'doodles/d_lamp.png');
      this.load.image('d_puddle', 'doodles/d_puddle.png');
      this.load.image('d_poster', 'doodles/d_poster.png');
      this.load.image('tell_ring', 'doodles/tell_ring.svg');
      this.load.image('dash_tell', 'doodles/dash_tell.svg');
      this.load.image('giant_quake', 'doodles/giant_quake.svg');
      this.load.image('boss_warning', 'doodles/boss_warning.svg');
      this.load.image('flame_sword', 'doodles/flame_sword.svg');
      this.load.image('sword_pickup', 'doodles/sword_pickup.svg');
      this.load.image('ink_shield', 'ink_shield_power.png');
      this.load.image('shield_burst', 'doodles/shield_burst.svg');
      this.load.image('dinio_orb', 'doodles/dinio_orb.png');
      this.load.image('dinio_shot', 'doodles/dinio_shot.png');
      this.load.image('dinio_muzzle_flash', 'doodles/dinio_muzzle_flash.png');
      this.load.image('doghost_orb', 'doodles/doghost_orb.svg');
      this.load.image('doghost_wave', 'doodles/doghost_wave.svg');
      this.load.image('teleportation_c_orb', 'doodles/teleportation_c_orb.png');
      this.load.image('gravity_core', 'doodles/gravity_core.svg');
      this.load.image('teleporti', 'doodles/teleporti.png');
    }

    function create(this: Phaser.Scene) {
      const scene = this;
      teleportationCNextStrikeAt = 0;
      teleportationCAttackEndsAt = 0;
      teleportationCAttackFacing = 1;
      const levelProfile = LEVEL_PROFILES[getLevelKey(currentLevel)];

      const buildBackgroundStrip = () => {
        backgroundStrip = scene.add.container(0, SCREEN_HEIGHT).setScrollFactor(0).setDepth(-20);
        let currentX = 0;

        levelProfile.backgrounds.forEach((backgroundKey) => {
          if (!scene.textures.exists(backgroundKey)) {
            return;
          }

          const source = scene.textures.get(backgroundKey).getSourceImage() as { width?: number; height?: number } | undefined;
          const sourceWidth = source?.width ?? SCREEN_WIDTH;
          const sourceHeight = source?.height ?? BACKGROUND_STRIP_HEIGHT;
          const displayWidth = Math.max(SCREEN_WIDTH, Math.round(sourceWidth * (BACKGROUND_STRIP_HEIGHT / sourceHeight)));
          const segment = scene.add.image(currentX, 0, textureOrFallback(scene, backgroundKey, 'fallback_object'))
            .setOrigin(0, 1)
            .setDisplaySize(displayWidth, BACKGROUND_STRIP_HEIGHT)
            .setTint(levelProfile.tint);

          backgroundStrip.add(segment);
          currentX += displayWidth - 56;
        });

        backgroundStripWidth = Math.max(SCREEN_WIDTH, currentX);
      };

      buildBackgroundStrip();

      // Keep some floor graphics for depth perception
      backgroundGraphics = scene.add.graphics().setDepth(-10);
      backgroundGraphics.fillStyle(levelProfile.floor, levelProfile.floorAlpha).fillRect(0, HORIZON_Y, 4096, SCREEN_HEIGHT - HORIZON_Y);
      backgroundGraphics.fillStyle(levelProfile.atmosphereColor, levelProfile.atmosphereAlpha).fillRect(0, 0, 4096, HORIZON_Y);

      scene.physics.world.setBounds(0, WALK_ZONE_TOP, 4096, WALK_ZONE_BOTTOM - WALK_ZONE_TOP);
      scene.cameras.main.setBounds(0, 0, 4096, SCREEN_HEIGHT);

      const animKey = !isXGod && scene.textures.exists('character_walk')
        ? 'character_walk'
        : playerSprite
          ? 'player_walk'
          : (scene.textures.exists('player_walk_internal') ? 'player_walk_internal' : null);

      if (animKey) {
        const texture = scene.textures.get(animKey);
        const frameCount = texture.frameTotal;

        // Only create animations if we actually have frames to work with
        if (frameCount > 1) {
          scene.anims.create({
            key: 'walk',
            frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: frameCount - 2 }),
            frameRate: 10,
            repeat: -1
          });
          scene.anims.create({
            key: 'idle',
            frames: [{ key: animKey, frame: 0 }],
            frameRate: 1
          });
          scene.anims.create({
            key: 'jump_pose',
            frames: [{ key: animKey, frame: Math.min(1, frameCount - 1) }],
            frameRate: 1
          });
          scene.anims.create({
            key: 'dash',
            frames: scene.anims.generateFrameNumbers(!isXGod && scene.textures.exists('character_dash') ? 'character_dash' : 'player_dash', { start: 0, end: 3 }),
            frameRate: 15,
            repeat: -1
          });
        }
      }

      if (!isXGod && scene.textures.exists('character_attack')) {
        const characterAttackFrames = selectedCharacterId === 'barrett'
          ? [
            { key: 'character_attack', frame: 3 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 },
            { key: 'character_attack', frame: 4 }
          ]
          : scene.anims.generateFrameNumbers('character_attack', { start: 0, end: 4 });
        scene.anims.create({
          key: 'character_attack_anim',
          frames: characterAttackFrames,
          frameRate: selectedCharacterId === 'barrett' ? 10 : 16,
          repeat: 0
        });
      }

      if (!isXGod && scene.textures.exists('character_projectile_anim')) {
        scene.anims.create({
          key: 'character_projectile_fly',
          frames: scene.anims.generateFrameNumbers('character_projectile_anim', { start: 0, end: 5 }),
          frameRate: selectedCharacterId === 'ezra' ? 14 : 18,
          repeat: -1
        });
      }

      if (scene.textures.exists('m_alien_walk')) {
        scene.anims.create({
          key: 'm_alien_walk_anim',
          frames: scene.anims.generateFrameNumbers('m_alien_walk', { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1
        });
      }
      if (scene.textures.exists('m_dasher_walk')) {
        scene.anims.create({
          key: 'm_dasher_walk_anim',
          frames: scene.anims.generateFrameNumbers('m_dasher_walk', { start: 0, end: 3 }),
          frameRate: 13,
          repeat: -1
        });
      }
      if (scene.textures.exists('m_giant_walk')) {
        scene.anims.create({
          key: 'm_giant_walk_anim',
          frames: scene.anims.generateFrameNumbers('m_giant_walk', { start: 0, end: 3 }),
          frameRate: 7,
          repeat: -1
        });
      }

      if (scene.textures.exists('grunt_walking')) {
        scene.anims.create({
          key: 'grunt_walk',
          frames: scene.anims.generateFrameNumbers('grunt_walking', { start: 0, end: 3 }),
          frameRate: 12,
          repeat: -1
        });
      }
      if (scene.textures.exists('grunt_dead')) {
        scene.anims.create({
          key: 'grunt_die',
          frames: scene.anims.generateFrameNumbers('grunt_dead', { start: 0, end: 1 }),
          frameRate: 12,
          repeat: 0
        });
      }
      if (scene.textures.exists('dinio_walk')) {
        scene.anims.create({
          key: 'dinio_walk_anim',
          frames: scene.anims.generateFrameNumbers('dinio_walk', { start: 0, end: 2 }),
          frameRate: 8,
          repeat: -1
        });
      }
      if (scene.textures.exists('dinio_attack')) {
        scene.anims.create({
          key: 'dinio_attack_anim',
          frames: scene.anims.generateFrameNumbers('dinio_attack', { start: 0, end: 1 }),
          frameRate: 10,
          repeat: 0
        });
      }
      if (scene.textures.exists('doghost_walk')) {
        scene.anims.create({
          key: 'doghost_walk_anim',
          frames: scene.anims.generateFrameNumbers('doghost_walk', { start: 0, end: 2 }),
          frameRate: 7,
          repeat: -1
        });
      }
      if (scene.textures.exists('teleportation_c_walk')) {
        scene.anims.create({
          key: 'teleportation_c_walk_anim',
          frames: scene.anims.generateFrameNumbers('teleportation_c_walk', { start: 0, end: 2 }),
          frameRate: 8,
          repeat: -1
        });
      }
      if (scene.textures.exists('teleportation_c_attack')) {
        scene.anims.create({
          key: 'teleportation_c_attack_anim',
          frames: scene.anims.generateFrameNumbers('teleportation_c_attack', { start: 0, end: 4 }),
          frameRate: 14,
          repeat: 0
        });
      }
      if (scene.textures.exists('moonlight_terror_walk')) {
        scene.anims.create({
          key: 'moonlight_terror_walk_anim',
          frames: scene.anims.generateFrameNumbers('moonlight_terror_walk', { start: 0, end: 1 }),
          frameRate: 6,
          repeat: -1
        });
      }
      if (scene.textures.exists('moonlight_terror_attack')) {
        scene.anims.create({
          key: 'moonlight_terror_attack_anim',
          frames: scene.anims.generateFrameNumbers('moonlight_terror_attack', { start: 0, end: 4 }),
          frameRate: 12,
          repeat: 0
        });
      }
      if (scene.textures.exists('cosmic_grunt_walk')) {
        scene.anims.create({
          key: 'cosmic_grunt_walk_anim',
          frames: scene.anims.generateFrameNumbers('cosmic_grunt_walk', { start: 0, end: 3 }),
          frameRate: 9,
          repeat: -1
        });
      }
      if (scene.textures.exists('void_regent_walk')) {
        scene.anims.create({
          key: 'void_regent_walk_anim',
          frames: scene.anims.generateFrameNumbers('void_regent_walk', { start: 0, end: 3 }),
          frameRate: 7,
          repeat: -1
        });
      }
      if (scene.textures.exists('void_regent_attack')) {
        scene.anims.create({
          key: 'void_regent_attack_anim',
          frames: scene.anims.generateFrameNumbers('void_regent_attack', { start: 0, end: 3 }),
          frameRate: 8,
          repeat: 0
        });
      }
      if (scene.textures.exists('ink_behemoth_walk')) {
        scene.anims.create({
          key: 'ink_behemoth_walk_anim',
          frames: scene.anims.generateFrameNumbers('ink_behemoth_walk', { start: 0, end: 5 }),
          frameRate: 7,
          repeat: -1
        });
      }
      if (scene.textures.exists('ink_behemoth_attack')) {
        scene.anims.create({
          key: 'ink_behemoth_attack_anim',
          frames: scene.anims.generateFrameNumbers('ink_behemoth_attack', { start: 0, end: 3 }),
          frameRate: 8,
          repeat: 0
        });
      }
      if (scene.textures.exists('player_sword_walk')) {
        scene.anims.create({
          key: 'sword_walk',
          frames: scene.anims.generateFrameNumbers('player_sword_walk', { start: 0, end: 3 }),
          frameRate: 10,
          repeat: -1
        });
        scene.anims.create({
          key: 'sword_idle',
          frames: [{ key: 'player_sword_walk', frame: 0 }],
          frameRate: 1
        });
      }
      if (scene.textures.exists('spider_walk')) {
        scene.anims.create({
          key: 'spider_walk_anim',
          frames: scene.anims.generateFrameNumbers('spider_walk', { start: 0, end: 2 }),
          frameRate: 8,
          repeat: -1
        });
      }
      if (scene.textures.exists('spider_attack')) {
        scene.anims.create({
          key: 'spider_attack_anim',
          frames: scene.anims.generateFrameNumbers('spider_attack', { start: 0, end: 2 }),
          frameRate: 10,
          repeat: 0
        });
      }
      if (scene.textures.exists('dark_dragon_walk')) {
        scene.anims.create({
          key: 'dark_dragon_walk_anim',
          frames: scene.anims.generateFrameNumbers('dark_dragon_walk', { start: 0, end: 6 }),
          frameRate: 9,
          repeat: -1
        });
      }
      if (scene.textures.exists('dark_dragon_attack')) {
        scene.anims.create({
          key: 'dark_dragon_attack_anim',
          frames: scene.anims.generateFrameNumbers('dark_dragon_attack', { start: 0, end: 3 }),
          frameRate: 7,
          repeat: 0
        });
      }
      if (scene.textures.exists('killinas_daughter_walk')) {
        scene.anims.create({
          key: 'killinas_daughter_walk_anim',
          frames: scene.anims.generateFrameNumbers('killinas_daughter_walk', { start: 0, end: 7 }),
          frameRate: 10,
          repeat: -1
        });
      }
      if (scene.textures.exists('killinas_daughter_attack')) {
        scene.anims.create({
          key: 'killinas_daughter_attack_anim',
          frames: scene.anims.generateFrameNumbers('killinas_daughter_attack', { start: 0, end: 3 }),
          frameRate: 9,
          repeat: 0
        });
      }

      const emojis = [
        { key: 'p_happy', char: '😄' }, { key: 'm_devil', char: '😈' },
        { key: 'm_ghost', char: '👻' }, { key: 'm_alien', char: '👽' }, { key: 'm_boss', char: '👹' },
        { key: 'h_heart', char: '💖' }, { key: 'o_trash', char: '🗑️' }, { key: 'o_box', char: '📦' },
        { key: 'o_books', char: '📚' }, { key: 'o_vending', char: '🥤' }, { key: 'ink_splat', char: '⚫' },
        { key: 'impact_vfx', char: '💥' }, { key: 'scrap', char: '📄' }
      ];

      emojis.forEach(e => {
        if (!scene.textures.exists(e.key)) {
          const txt = scene.make.text({
            x: -1000,
            y: -1000,
            text: e.char,
            style: { fontSize: '64px', color: '#ffffff', fontFamily: 'Arial' }
          }, false);
          scene.textures.addCanvas(e.key, txt.canvas);
          txt.destroy();
        }
      });

      if (!scene.textures.exists('soulTexture')) {
        scene.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xfacc15).fillCircle(10, 10, 10).generateTexture('soulTexture', 20, 20);
      }
      if (!scene.textures.exists('attackHitboxTexture')) {
        scene.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4).generateTexture('attackHitboxTexture', 4, 4);
      }

      souls = scene.physics.add.group();
      monsters = scene.physics.add.group();
      projectiles = scene.physics.add.group();
      allyProjectiles = scene.physics.add.group();
      destructibles = scene.physics.add.group();
      healthUpgrades = scene.physics.add.group();
      homeworkPickups = scene.physics.add.group();
      swordPickups = scene.physics.add.group();
      swordRewardPickups = scene.physics.add.group();
      dinioPickups = scene.physics.add.group();
      doghostPickups = scene.physics.add.group();
      teleportationCPickups = scene.physics.add.group();
      teleportiPickups = scene.physics.add.group();
      gravityCorePickups = scene.physics.add.group();
      healthGraphics = scene.add.graphics().setDepth(10000);
      const arrowTxt = scene.add.text(0, 0, 'KEEP MOVING! ➡️', {
        fontFamily: 'Gochi Hand', fontSize: '56px', color: '#ff4444', stroke: '#ffffff', strokeThickness: 8
      }).setOrigin(0.5);
      keepMovingPrompt = scene.add.container(200, HORIZON_Y + 50, [arrowTxt]);
      keepMovingPrompt.setScrollFactor(0).setVisible(false).setDepth(10001);

      const transitionBg = scene.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, 200, 0x1e293b, 0.9).setOrigin(0.5);
      const transitionTitle = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, `LEVEL ${currentLevel} STARTING...`, {
        fontFamily: 'Gochi Hand', fontSize: '80px', color: '#ffffff', stroke: '#000000', strokeThickness: 10
      }).setOrigin(0.5);
      transitionOverlay = scene.add.container(0, 0, [transitionBg, transitionTitle]).setScrollFactor(0).setDepth(20000).setAlpha(0);

      const rewardOverlayTexture = isXGod ? 'xgod_sword_powerup' : textureOrFallback(scene, 'character_reward', 'fallback_powerup');
      const swordRewardGlow = scene.add.sprite(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 8, rewardOverlayTexture, 0)
        .setScale(0.82)
        .setTint(0xffffff)
        .setAlpha(0)
        .setVisible(false);
      const swordRewardSprite = scene.add.sprite(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 8, rewardOverlayTexture, 0)
        .setScale(isXGod ? 0.82 : 1.12)
        .setAlpha(0)
        .setVisible(false);
      const swordRewardTitle = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 214, `${selectedCharacter.rewardName.toUpperCase()} AWAKENED`, {
        fontFamily: 'Gochi Hand', fontSize: '58px', color: '#fff7d1', stroke: '#111111', strokeThickness: 10
      }).setOrigin(0.5).setAlpha(0).setVisible(false);
      const swordRewardSubtitle = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 220, 'A relic worthy of the Dark Dragon.', {
        fontFamily: 'Indie Flower', fontSize: '30px', color: '#fff7d1', stroke: '#111111', strokeThickness: 8
      }).setOrigin(0.5).setAlpha(0).setVisible(false);
      swordRewardOverlay = scene.add.container(0, 0, [swordRewardGlow, swordRewardSprite, swordRewardTitle, swordRewardSubtitle])
        .setScrollFactor(0)
        .setDepth(20500)
        .setAlpha(0)
        .setVisible(false);

      const sectionCardBg = scene.add.rectangle(SCREEN_WIDTH / 2, SECTION_CARD_TOP_Y, 460, 82, 0xfff7d1, 0.9)
        .setStrokeStyle(4, 0x111111)
        .setOrigin(0.5);
      const sectionCardTitle = scene.add.text(SCREEN_WIDTH / 2, SECTION_CARD_TOP_Y - 18, 'SECTION 1', {
        fontFamily: 'Gochi Hand', fontSize: '32px', color: '#0f172a', stroke: '#ffffff', strokeThickness: 6
      }).setOrigin(0.5);
      const sectionCardSubtitle = scene.add.text(SCREEN_WIDTH / 2, SECTION_CARD_TOP_Y + 16, 'LOCKER ALLEY AMBUSH', {
        fontFamily: 'Indie Flower', fontSize: '20px', color: '#334155'
      }).setOrigin(0.5);
      sectionCardOverlay = scene.add.container(0, 0, [sectionCardBg, sectionCardTitle, sectionCardSubtitle])
        .setScrollFactor(0)
        .setDepth(21000)
        .setAlpha(0)
        .setVisible(false);

      const bossHudBg = scene.add.rectangle(0, 0, 420, 72, 0x0f172a, 0.86).setStrokeStyle(4, 0xfff7d1);
      bossLabelText = scene.add.text(-185, -18, 'INK BEHEMOTH', {
        fontFamily: 'Gochi Hand', fontSize: '28px', color: '#fff7d1'
      }).setOrigin(0, 0.5);
      const bossBarFrame = scene.add.rectangle(34, -14, 210, 18, 0xffffff, 0.1).setStrokeStyle(3, 0xf8fafc);
      bossBarFill = scene.add.rectangle(-70, -14, 204, 10, 0xef4444, 1).setOrigin(0, 0.5);
      bossIntentText = scene.add.text(-185, 18, 'Intent: STALKING', {
        fontFamily: 'Indie Flower', fontSize: '22px', color: '#fecaca'
      }).setOrigin(0, 0.5);
      bossHud = scene.add.container(SCREEN_WIDTH / 2, 62, [bossHudBg, bossLabelText, bossBarFrame, bossBarFill, bossIntentText])
        .setScrollFactor(0)
        .setDepth(21500)
        .setAlpha(0)
        .setVisible(false);

      feedbackFlash = scene.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0xffffff, 0)
        .setScrollFactor(0)
        .setDepth(23000);

      const activeTexture = textureOrFallback(scene, animKey || 'p_happy', 'fallback_player');

      // CRITICAL FIX: Pass '0' as the 4th argument to specify we want the first slice of the spritesheet
      player = scene.physics.add.sprite(200, (HORIZON_Y + FLOOR_BOTTOM) / 2, activeTexture, 0);

      player.setCollideWorldBounds(true);
      player.setOrigin(0.5, 0.9);
      player.setScale(PLAYER_SCALE);
      player.setSize(80, 120);
      player.setOffset(50, 40);
      playerShadow = scene.add.image(player.x, player.y + 6, textureOrFallback(scene, 'shadow_oval', 'fallback_object')).setAlpha(0.28).setDepth(player.y - 2);
      playerSword = scene.add.image(player.x + 26, player.y - 18, textureOrFallback(scene, 'flame_sword', 'fallback_powerup')).setScale(0.34).setVisible(isXGod && hasFlameSword).setDepth(player.y + 2);
      playerShield = scene.add.image(player.x, player.y - 18, textureOrFallback(scene, 'ink_shield', 'fallback_powerup'))
        .setScale(0.44)
        .setVisible(shieldUnlocked)
        .setAlpha(inkShieldReady ? 0.92 : 0.22)
        .setDepth(player.y + 1);
      if (hasDinio) {
        spawnDinioCompanion(scene);
      }
      if (hasDoghost) {
        spawnDoghostCompanion(scene);
      }
      if (isXGod && hasTeleportationC) {
        spawnTeleportationCCompanion(scene);
      }

      attackHitbox = scene.physics.add.image(0, 0, 'attackHitboxTexture').setVisible(false).setAlpha(0).setSize(120, 80);
      attackHitbox.body.allowGravity = false;
      attackHitbox.setImmovable(true);

      scene.cameras.main.startFollow(player, true, FEEL.cameraLerp, FEEL.cameraLerp);
      populateStreetDressings(scene);
      for (let i = 0; i < 5; i++) {
        const spawnX = Phaser.Math.Between(100, 600);
        if (i === 1 || i === 4) {
          spawnHomework(scene, spawnX);
        } else {
          spawnSoul(scene, spawnX);
        }
      }
      spawnDestructible(scene, 400);
      spawnDestructible(scene, 650);
      if (currentLevel === 1 && !dinioUnlocked) {
        spawnDinioPickup(scene, DINIO.unlockOrbX, (HORIZON_Y + FLOOR_BOTTOM) / 2);
      }
      if (currentLevel === 2 && !doghostUnlocked) {
        spawnDoghostPickup(scene, DOGHOST.unlockOrbX, (HORIZON_Y + FLOOR_BOTTOM) / 2 - 12);
      }
      if (isXGod && currentLevel === 3 && !teleportationCUnlocked) {
        spawnTeleportationCPickup(scene, TELEPORTATION_C.unlockOrbX, (HORIZON_Y + FLOOR_BOTTOM) / 2 - 10);
      }
      if (currentLevel === 4 && !gravityCoreUnlocked) {
        spawnGravityCorePickup(scene, GRAVITY_CORE.unlockX, (HORIZON_Y + FLOOR_BOTTOM) / 2 - 18);
      }
      if (currentLevel === 1) {
        spawnTeleportiPickup(scene, 560, FLOOR_BOTTOM - 22);
      }
      if (swordUnlocked && !hasFlameSword) {
        spawnSwordPickup(scene, 315, FLOOR_BOTTOM - 32);
      }
      if (currentLevel === 1 && !characterPowerUnlocked && debugSpawnSwordReward) {
        spawnBossRewardSword(scene, 470, FLOOR_BOTTOM - 28);
        if (debugAutoClaimSwordReward) {
          scene.time.delayedCall(1900, () => {
            const debugPickup = swordRewardPickups.getChildren()[0] as Phaser.Physics.Arcade.Sprite | undefined;
            if (debugPickup?.active) {
              startXGodSwordRewardSequence(scene, debugPickup);
            }
          });
        }
      }
      if (debugSpawnBoss) {
        currentSectionIndex = fightSections.length - 1;
        isFightingWave = true;
        showSectionCard(scene, 'DEBUG BOSS', 'FORCED BOSS ARENA', 700);
        spawnBoss(scene);
      }

      // Overlaps
      scene.physics.add.overlap(player, souls, (p, s) => {
        if (jumpZ < 40) {
          (s as Phaser.Physics.Arcade.Sprite).destroy();
          sounds.soul();
          currentSouls++;
          addScore(POINT_VALUES.gold, { souls: currentSouls });
          if (currentSouls % 4 === 0) {
            spawnHealth(scene, player.x, player.y - 100);
          }
        }
      });
      scene.physics.add.overlap(player, healthUpgrades, (p, h) => {
        if (jumpZ < 40) {
          (h as Phaser.Physics.Arcade.Sprite).destroy();
          sounds.health();
          playerHealth = Math.min(100, playerHealth + Math.round(100 * HEART_HEAL_PERCENT));
          addScore(POINT_VALUES.heart, { health: playerHealth });
        }
      });
      scene.physics.add.overlap(player, homeworkPickups, (p, pickup) => {
        if (jumpZ < 40) {
          (pickup as Phaser.Physics.Arcade.Sprite).destroy();
          sounds.soul();
          addScore(POINT_VALUES.homework);
        }
      });
      scene.physics.add.overlap(player, swordPickups, (p, s) => {
        if (jumpZ < 40) {
          (s as Phaser.Physics.Arcade.Sprite).destroy();
          addScore(POINT_VALUES.swordPickup);
          equipSword(scene, true);
          showSectionCard(scene, 'POWER-UP GAINED', 'FLAME SWORD AWAKENED', 950);
        }
      });
      scene.physics.add.overlap(player, swordRewardPickups, (p, pickup) => {
        if (jumpZ < 40) {
          startXGodSwordRewardSequence(scene, pickup as Phaser.Physics.Arcade.Sprite);
        }
      });
      scene.physics.add.overlap(player, dinioPickups, (p, pickup) => {
        if (jumpZ < 40) {
          (pickup as Phaser.Physics.Arcade.Sprite).destroy();
          addScore(POINT_VALUES.dinioUnlock);
          equipDinio(scene);
          showSectionCard(scene, 'DINIO UNLOCKED', 'PINK ORB BLAST READY', 1100);
        }
      });
      scene.physics.add.overlap(player, doghostPickups, (p, pickup) => {
        if (jumpZ < 40) {
          (pickup as Phaser.Physics.Arcade.Sprite).destroy();
          addScore(POINT_VALUES.doghostUnlock);
          equipDoghost(scene);
          showSectionCard(scene, 'DOGHOST UNLOCKED', 'WHITE WAVE PUNCH READY', 1100);
        }
      });
      scene.physics.add.overlap(player, teleportationCPickups, (p, pickup) => {
        if (jumpZ < 40) {
          (pickup as Phaser.Physics.Arcade.Sprite).destroy();
          addScore(POINT_VALUES.teleportationCUnlock);
          equipTeleportationC(scene);
          showSectionCard(scene, 'TELEPORTATION C UNLOCKED', 'BLACK ORB SHADOW GUIDE', 1100);
        }
      });
      scene.physics.add.overlap(player, teleportiPickups, (p, pickup) => {
        if (jumpZ < 40) {
          triggerTeleporti(scene, pickup as Phaser.Physics.Arcade.Sprite);
        }
      });
      scene.physics.add.overlap(player, gravityCorePickups, (p, pickup) => {
        if (jumpZ < 40) {
          (pickup as Phaser.Physics.Arcade.Sprite).destroy();
          gravityCoreUnlocked = true;
          gravityCoreCharges = GRAVITY_CORE.maxCharges;
          addScore(POINT_VALUES.gravityCoreUnlock);
          syncPowerupStats();
          pulseFeedbackFlash(scene, 0xa78bfa, 0.24, 240);
          showSectionCard(scene, 'GRAVITY CORE CLAIMED', 'SPACE HITS LAND HARDER', 1200);
          sounds.soul();
        }
      });
      scene.physics.add.overlap(attackHitbox, monsters, (hb, m) => {
        if (isAttacking) {
          const monster = m as Phaser.Physics.Arcade.Sprite;
          if (monster.getData('iframe')) return;
          if (monster.getData('lastPlayerAttackId') === playerAttackId) return;
          monster.setData('lastPlayerAttackId', playerAttackId);
          sounds.hit();
          takeMonsterDamage(scene, monster, getPlayerAttackDamage());
        }
      });
      scene.physics.add.overlap(player, projectiles, (p, pr) => {
        if (!playerInvulnerable && jumpZ < 30) {
          const projectile = pr as Phaser.Physics.Arcade.Sprite;
          const damage = projectile.getData('damage') ?? 15;
          releaseEnemyProjectile(projectile);
          takePlayerDamage(scene, damage);
        }
      });
      scene.physics.add.overlap(allyProjectiles, monsters, (shot, m) => {
        const projectile = shot as Phaser.Physics.Arcade.Sprite;
        const monster = m as Phaser.Physics.Arcade.Sprite;
        if (projectile.getData('spent') || monster.getData('iframe')) {
          return;
        }
        projectile.setData('spent', true);
        projectile.destroy();
        sounds.hit();
        takeMonsterDamage(scene, monster, projectile.getData('damage') ?? 2);
      });
      scene.physics.add.overlap(attackHitbox, destructibles, (hb, d) => {
        if (!isAttacking) return;
        const item = d as Phaser.Physics.Arcade.Sprite;
        if (item.getData('lastPlayerAttackId') === playerAttackId) return;
        item.setData('lastPlayerAttackId', playerAttackId);
        damageDestructible(scene, item, selectedCharacterId === 'barrett' && characterPowerUnlocked ? 2 : 1);
      });
      scene.physics.add.overlap(monsters, destructibles, (m, d) => { const monster = m as Phaser.Physics.Arcade.Sprite; const type = monster.getData('type'); if (type === 'GIANT' || type === 'BOSS' || monster.getData('state') === 'DASHING') damageDestructible(scene, d as Phaser.Physics.Arcade.Sprite, 1); });
      scene.physics.add.overlap(player, monsters, (p, m) => {
        if (!playerInvulnerable && !isAttacking && !isSlamming && jumpZ < 30) {
          const monster = m as Phaser.Physics.Arcade.Sprite;
          const type = monster.getData('type') as MonsterType;
          const enemyClass = (monster.getData('enemyClass') || getMonsterClass(type)) as EnemyClass;
          if (enemyClass === 'LONG_RANGE') {
            return;
          }
          if (enemyClass === 'JUMPER' && monster.getData('state') !== 'SLAM') {
            return;
          }
          const damage = type === 'BOSS' ? 13 : type === 'DEVIL' ? 14 : type === 'COSMIC_GRUNT' ? 11 : type === 'GIANT' ? 12 : type === 'DASHER' ? 10 : 8;
          takePlayerDamage(scene, damage);
        }
      });

      cursors = scene.input.keyboard!.createCursorKeys();
      attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      jumpAltKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      dashKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      dashAltKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
      pauseKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      lastMovementTime = scene.time.now;
      syncPowerupStats();
      showLevelTransition(scene, `LEVEL ${currentLevel} START!`, 1500);
    }

    function placeStreetDressing(
      scene: Phaser.Scene,
      config: {
        texture: string;
        x: number;
        y: number;
        scale: number;
        alpha?: number;
        angle?: number;
        flipX?: boolean;
        originY?: number;
        depthOffset?: number;
      }
    ) {
      const visualScale =
        config.texture === 'd_cone' ? config.scale * 0.48
          : config.texture === 'd_lamp' ? config.scale * 0.55
          : config.texture === 'd_puddle' ? config.scale * 0.42
          : config.scale;
      const visualAlpha =
        config.texture === 'd_puddle' ? Math.min(config.alpha ?? 1, 0.42)
          : config.texture === 'd_lamp' ? Math.min(config.alpha ?? 1, 0.5)
          : config.alpha ?? 1;
      const image = scene.add.image(config.x, config.y, textureOrFallback(scene, config.texture, 'fallback_object'))
        .setOrigin(0.5, config.originY ?? 1)
        .setScale(visualScale)
        .setAlpha(visualAlpha)
        .setDepth(config.y + (config.depthOffset ?? 0));
      if (config.flipX) image.setFlipX(true);
      if (config.angle) image.setAngle(config.angle);
      return image;
    }

    function populateStreetDressings(scene: Phaser.Scene) {
      streetDressings.forEach((item) => item.destroy());
      streetDressings = [
        placeStreetDressing(scene, { texture: 'd_puddle', x: 240, y: FLOOR_BOTTOM - 12, scale: 0.82, alpha: 0.72, depthOffset: -12 }),
        placeStreetDressing(scene, { texture: 'd_poster', x: 470, y: HORIZON_Y + 74, scale: 0.72, alpha: 0.92, originY: 0.5, angle: -4, depthOffset: -90 }),
        placeStreetDressing(scene, { texture: 'd_cone', x: 710, y: FLOOR_BOTTOM - 4, scale: 0.74, depthOffset: -3 }),
        placeStreetDressing(scene, { texture: 'd_lamp', x: 920, y: FLOOR_BOTTOM - 4, scale: 0.9, alpha: 0.88, depthOffset: -18 }),
        placeStreetDressing(scene, { texture: 'd_puddle', x: 1125, y: FLOOR_BOTTOM - 10, scale: 0.95, alpha: 0.76, depthOffset: -14 }),
        placeStreetDressing(scene, { texture: 'd_poster', x: 1295, y: HORIZON_Y + 82, scale: 0.84, alpha: 0.92, originY: 0.5, angle: 5, depthOffset: -88 }),
        placeStreetDressing(scene, { texture: 'd_cone', x: 1510, y: FLOOR_BOTTOM - 3, scale: 0.9, depthOffset: -3 }),
        placeStreetDressing(scene, { texture: 'd_lamp', x: 1765, y: FLOOR_BOTTOM - 3, scale: 1.02, alpha: 0.86, depthOffset: -18 }),
        placeStreetDressing(scene, { texture: 'd_puddle', x: 1960, y: FLOOR_BOTTOM - 10, scale: 1.05, alpha: 0.76, depthOffset: -14 }),
        placeStreetDressing(scene, { texture: 'd_poster', x: 2210, y: HORIZON_Y + 76, scale: 0.78, alpha: 0.9, originY: 0.5, angle: -3, depthOffset: -90 }),
        placeStreetDressing(scene, { texture: 'd_cone', x: 2520, y: FLOOR_BOTTOM - 5, scale: 0.82, flipX: true, depthOffset: -3 }),
        placeStreetDressing(scene, { texture: 'd_lamp', x: 2795, y: FLOOR_BOTTOM - 4, scale: 0.94, alpha: 0.88, depthOffset: -18 }),
        placeStreetDressing(scene, { texture: 'd_puddle', x: 3005, y: FLOOR_BOTTOM - 11, scale: 0.9, alpha: 0.72, depthOffset: -14 }),
        placeStreetDressing(scene, { texture: 'd_poster', x: 3320, y: HORIZON_Y + 84, scale: 0.86, alpha: 0.92, originY: 0.5, angle: 4, depthOffset: -92 }),
      ];
    }

    function showLevelTransition(scene: Phaser.Scene, message: string, duration: number, onComplete?: () => void) {
      isLevelTransitioning = true;
      const title = transitionOverlay.getAt(1) as Phaser.GameObjects.Text;
      title.setText(message);
      scene.tweens.add({
        targets: transitionOverlay, alpha: 1, duration: 300, ease: 'Power2',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: transitionOverlay, alpha: 0, duration: 300,
              onComplete: () => {
                isLevelTransitioning = false;
                if (onComplete) onComplete();
              }
            });
          });
        }
      });
    }

    function showSectionCard(scene: Phaser.Scene, title: string, subtitle: string, duration: number = 1050) {
      const titleText = sectionCardOverlay.getAt(1) as Phaser.GameObjects.Text;
      const subtitleText = sectionCardOverlay.getAt(2) as Phaser.GameObjects.Text;
      titleText.setText(title);
      subtitleText.setText(subtitle);
      scene.tweens.killTweensOf(sectionCardOverlay);
      sectionCardOverlay.setVisible(true).setAlpha(0).setY(-10);
      scene.tweens.add({
        targets: sectionCardOverlay,
        alpha: SECTION_CARD_OPACITY,
        y: 0,
        duration: 160,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: sectionCardOverlay,
              alpha: 0,
              y: -18,
              duration: 190,
              onComplete: () => sectionCardOverlay.setVisible(false).setY(0)
            });
          });
        }
      });
    }

    function pulseFeedbackFlash(scene: Phaser.Scene, color: number, alpha: number, duration: number) {
      feedbackFlash.setFillStyle(color, alpha).setAlpha(alpha);
      scene.tweens.add({
        targets: feedbackFlash,
        alpha: 0,
        duration,
        ease: 'Quad.easeOut'
      });
    }

    function updateBossHudDisplay(boss?: Phaser.Physics.Arcade.Sprite | null) {
      if (!boss || !boss.active || boss.getData('state') === 'DEAD') {
        bossHud.setVisible(false).setAlpha(0);
        return;
      }

      const hp = boss.getData('hp') || 0;
      const maxHp = boss.getData('maxHp') || 1;
      const intent = boss.getData('intent') || 'STALKING';
      const bossName = boss.getData('bossName') || 'INK BEHEMOTH';
      const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);

      bossHud.setVisible(true).setAlpha(1);
      bossLabelText.setText(bossName);
      bossBarFill.width = 204 * pct;
      bossIntentText.setText(`Intent: ${intent}`);
      bossIntentText.setColor(
        intent === 'SHOCKWAVE' ? '#fde68a'
          : intent === 'DRAGON BREATH' ? '#fdba74'
          : intent === 'GUNFIRE' ? '#c4b5fd'
          : intent === 'AXE SWING' || intent === 'AXE RANGE' ? '#fca5a5'
          : intent === 'INK SPIT' ? '#fecdd3'
          : '#ddd6fe'
      );
    }

    function drawBackground(g: Phaser.GameObjects.Graphics, level: number) {
      g.clear();
      g.fillStyle(0xe2e8f0, 1).fillRect(0, 0, 4096, HORIZON_Y);
      g.lineStyle(1, 0xcbd5e1, 0.5);
      for (let i = 0; i < 4096; i += 100) g.lineBetween(i, 0, i, HORIZON_Y);
      g.fillStyle(0xf8fafc, 1).fillRect(0, HORIZON_Y, 4096, SCREEN_HEIGHT - HORIZON_Y);
      g.fillStyle(0x94a3b8, 0.2).fillRect(0, HORIZON_Y, 4096, 20);
      g.lineStyle(4, 0x475569, 0.8);
      g.lineBetween(0, HORIZON_Y, 4096, HORIZON_Y);
      if (level === 1) {
        g.lineStyle(1, 0xadd8e6, 0.5);
        for (let i = HORIZON_Y; i < SCREEN_HEIGHT; i += 40) g.lineBetween(0, i, 4096, i);
      } else {
        g.lineStyle(1, 0xadd8e6, 0.3);
        for (let i = 0; i < 4096; i += 60) g.lineBetween(i, HORIZON_Y, i, SCREEN_HEIGHT);
        for (let i = HORIZON_Y; i < SCREEN_HEIGHT; i += 60) g.lineBetween(0, i, 4096, i);
      }
    }

    function takePlayerDamage(scene: Phaser.Scene, amount: number) {
      if (isDazed) return;

      if (shieldUnlocked && inkShieldReady) {
        inkShieldReady = false;
        shieldRechargeAt = scene.time.now + POWERUPS.shieldCooldownMs;
        setPlayerInvulnerableUntil(scene.time.now + POWERUPS.shieldBlockInvulnerabilityMs);
        pulseFeedbackFlash(scene, 0x38bdf8, 0.22, 180);
        const burst = scene.add.image(player.x, player.y - 18, 'shield_burst').setScale(0.2).setAlpha(0.96).setDepth(player.y + 5);
        scene.tweens.add({
          targets: burst,
          scale: 0.92,
          alpha: 0,
          angle: 120,
          duration: 280,
          ease: 'Cubic.easeOut',
          onComplete: () => burst.destroy()
        });
        syncPowerupStats();
        return;
      }

      sounds.hurt();
      const damageAmount = Math.max(1, Math.round(getDifficultyScaledDamage(amount) * playstyle.damageTakenMultiplier));
      playerHealth = Math.max(0, playerHealth - damageAmount);
      onStatsUpdate({ health: playerHealth });
      pulseFeedbackFlash(scene, 0xef4444, 0.18, 150);
      flashPlayerHitTint(scene);

      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      const nearestThreat = monsters
        ?.getChildren()
        .map((monster) => monster as Phaser.Physics.Arcade.Sprite)
        .filter((monster) => monster.active)
        .sort((a, b) => Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y) - Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y))[0];
      const knockbackDirection = nearestThreat ? (player.x < nearestThreat.x ? -1 : 1) : (facingDirection === 1 ? -1 : 1);
      playerBody.setVelocity(
        knockbackDirection * FEEL.hitKnockback,
        Phaser.Math.Clamp(playerBody.velocity.y - 42, -120, 120)
      );

      if (playerHealth <= 0) {
        playerLives--;
        applySwordDefeatPenalty(scene);
        if (playerLives > 0) {
          onStatsUpdate({ lives: playerLives });
          isDazed = true;
          dazedRecoveryAt = scene.time.now + 3000;
          gameOverRestartAt = 0;
          resetPlayerActionState();
          player.setVelocity(0, 0);
          player.anims.stop();
          player.setTexture(!isXGod && scene.textures.exists('character_dazed') ? 'character_dazed' : 'player_dazed');

          scene.tweens.add({
            targets: player,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 14, // ~3 seconds
            onComplete: completeRespawn
          });
          return; // Skip normal hit reaction
        } else {
          // GAME OVER SEQUENCE
          // Don't update stats yet to prevent App from pausing the game
          isDazed = true; // Block input
          dazedRecoveryAt = 0;
          gameOverRestartAt = scene.time.now + 5200;
          resetPlayerActionState();
          player.setVelocity(0, 0);
          player.anims.stop();
          player.setTexture(!isXGod && scene.textures.exists('character_dead') ? 'character_dead' : 'player_dead');

          scene.tweens.add({
            targets: player,
            alpha: 0,
            duration: 200,
            yoyo: true,
            repeat: 12, // 5 seconds
            onComplete: () => completeGameOver(scene)
          });
          return;
        }
      }

      setPlayerInvulnerableUntil(scene.time.now + FEEL.hitInvulnerabilityMs);
      scene.cameras.main.shake(150, 0.01);
      scene.tweens.add({
        targets: player, alpha: 0.3, duration: 80, yoyo: true, repeat: 4,
        onComplete: () => { if (!isDazed && scene.time.now >= invulnerabilityEndsAt) clearPlayerInvulnerability(); }
      });
    }

    function takeMonsterDamage(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, amount: number) {
      if (!monster || !monster.active) return;
      const type = monster.getData('type');
      const currentHp = monster.getData('hp') - amount;
      monster.setData('hp', currentHp);
      monster.setTint(0xff0000);
      pulseFeedbackFlash(scene, 0xffffff, type === 'BOSS' ? 0.12 : 0.06, 90);
      scene.cameras.main.shake(type === 'BOSS' ? 100 : 55, type === 'BOSS' ? 0.004 : 0.0025);
      const kb = type === 'BOSS' ? 10 : 30;
      monster.x += facingDirection * kb;
      const impact = scene.add.sprite(monster.x, monster.y - 30, 'impact_vfx').setScale(0.5);
      scene.tweens.add({ targets: impact, alpha: 0, scale: 1.2, duration: 200, onComplete: () => impact.destroy() });
      if (type === 'BOSS') {
        monster.setData('iframe', true);
        scene.time.delayedCall(150, () => { if (monster && monster.active) { monster.setData('iframe', false); monster.clearTint(); } });
      } else {
        scene.time.delayedCall(100, () => { if (monster && monster.active) monster.clearTint(); });
      }
      if (currentHp <= 0) {
        if (type === 'BOSS') {
          addScore(getMonsterPointValue(monster));
          const isDarkDragonBoss = monster.getData('bossVariant') === 'DARK_DRAGON';
          if (isDarkDragonBoss && scene.textures.exists('dark_dragon_dead')) {
            const facingRight = !!monster.getData('facingRight');
            monster.setData('state', 'DEAD');
            monster.setData('intent', 'DEFEATED');
            monster.body.enable = false;
            monster.setVelocity(0, 0);
            monster.anims.stop();
            monster.clearTint();
            monster.setVisible(false);
            const corpse = scene.add.image(
              monster.x + (facingRight ? 18 : -18),
              monster.y - 4,
              'dark_dragon_dead'
            )
              .setScale(DARK_DRAGON.corpseScale)
              .setOrigin(0.5, 0.8)
              .setFlipX(facingRight)
              .setDepth(monster.y + 1);
            handleBossDefeat(scene);
            scene.time.delayedCall(1400, () => {
              corpse.destroy();
              if (monster && monster.active) {
                monster.destroy();
              }
            });
            return;
          }
          handleBossDefeat(scene);
          monster.destroy();
        } else if (monster.texture.key === 'grunt_walking' || type === 'CHASER') {
          // Grunt death sequence
          monster.body.enable = false;
          monster.setVelocity(0, 0);
          // If we have a death animation, play it, otherwise just sit there
          if (scene.anims.exists('grunt_die')) {
            monster.play('grunt_die');
            monster.once('animationcomplete', () => {
              monster.setTexture('grunt_pile');
            });
          }
          else if (scene.textures.exists('grunt_dead')) monster.setTexture('grunt_dead');

          currentKills++;
          addScore(getMonsterPointValue(monster), { monstersDefeated: currentKills });

          scene.time.delayedCall(2000, () => {
            scene.tweens.add({
              targets: monster,
              alpha: 0,
              duration: 500,
              onComplete: () => { if (monster && monster.active) monster.destroy(); }
            });
          });
        } else {
          monster.destroy();
          currentKills++;
          addScore(getMonsterPointValue(monster), { monstersDefeated: currentKills });
        }
      }
    }

    function damageDestructible(scene: Phaser.Scene, d: Phaser.Physics.Arcade.Sprite, amount: number) {
      if (!d || !d.active) return;
      const hp = (d.getData('hp') || 1) - amount;
      d.setData('hp', hp);
      d.setTint(0xcccccc);
      scene.time.delayedCall(50, () => { if (d && d.active) d.clearTint(); });
      scene.tweens.add({ targets: d, x: d.x + (Math.random() * 4 - 2), duration: 50, yoyo: true });
      if (hp <= 0) breakDestructible(scene, d);
    }

    function breakDestructible(scene: Phaser.Scene, d: Phaser.Physics.Arcade.Sprite) {
      sounds.trash();
      const x = d.x; const y = d.y; const type = d.getData('type') as DestructibleType;
      addScore(getDestructiblePointValue(type));
      for (let i = 0; i < 5; i++) {
        const scrap = scene.add.sprite(x, y - 20, 'scrap').setScale(Phaser.Math.FloatBetween(0.07, 0.11));
        scene.physics.add.existing(scrap);
        const body = scrap.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-200, -50));
          body.setGravityY(400);
        }
        scene.tweens.add({ targets: scrap, alpha: 0, angle: 360, duration: 800, onComplete: () => scrap.destroy() });
      }
      d.destroy();
      const roll = Math.random();
      if (type === 'BOOKS') {
        if (roll < 0.7) spawnHomework(scene, x, y - 14);
        else if (roll < 0.9) spawnSoul(scene, x, y - 12);
      }
      else if (type === 'VENDING') {
        spawnHealth(scene, x, y);
        if (roll < 0.45) spawnSoul(scene, x + 20, y - 16);
      }
      else if (type === 'BOX') {
        if (roll < 0.34) spawnSoul(scene, x, y - 10);
        else if (roll < 0.52) spawnHomework(scene, x + 10, y - 10);
        else if (roll < 0.64) spawnHealth(scene, x, y);
      }
      else {
        if (roll < 0.3) spawnSoul(scene, x, y - 10);
        else if (roll < 0.4) spawnHealth(scene, x, y);
      }
    }

    function handleBossDefeat(scene: Phaser.Scene) {
      sounds.fanfare();
      scene.cameras.main.flash(500, 255, 255, 255);
      const earnedSword = currentLevel === 1 && !characterPowerUnlocked;
      const earnedShield = currentLevel === 2 && !shieldUnlocked;
      if (earnedShield) {
        shieldUnlocked = true;
        inkShieldReady = true;
        shieldRechargeAt = 0;
        playerShield?.setVisible(true).setAlpha(0.92);
        addScore(POINT_VALUES.inkShieldUnlock);
      }
      if (currentLevel >= MAX_LEVEL) {
        showLevelTransition(scene, 'FINAL BOSS DEFEATED!', 2200, () => {
          syncPowerupStats({
            isVictory: true,
            level: MAX_LEVEL,
            monstersDefeated: currentKills
          });
        });
        return;
      }

      if (earnedSword) {
        const rewardX = scene.cameras.main.scrollX + SCREEN_WIDTH * 0.72;
        spawnBossRewardSword(scene, rewardX, FLOOR_BOTTOM - 28);
        showSectionCard(scene, 'DARK DRAGON DOWN', `TOUCH THE ${selectedCharacter.rewardName.toUpperCase()}`, 1400);
        return;
      }

      const rewardTitle = earnedShield
        ? 'INK SHIELD UNLOCKED!'
        : `LEVEL ${currentLevel} COMPLETE!`;
      const rewardSubtitle = earnedShield ? 'INK SHIELD ORBIT ONLINE' : undefined;

      showLevelTransition(scene, rewardTitle, 2200, () => {
        inkShieldReady = shieldUnlocked;
        syncPowerupStats({
          level: Math.min(MAX_LEVEL, currentLevel + 1),
          monstersDefeated: 0,
          isVictory: false
        });
      });
      if (rewardSubtitle) {
        showSectionCard(scene, 'POWER-UP GAINED', rewardSubtitle, 1100);
      }
    }

    function spawnSoul(scene: Phaser.Scene, x: number, y?: number) {
      const dropY = Phaser.Math.Clamp(y ?? Phaser.Math.Between(HORIZON_Y + 20, FLOOR_BOTTOM - 20), HORIZON_Y + 20, FLOOR_BOTTOM - 20);
      const s = souls.create(x, dropY, textureOrFallback(scene, 'gold_pickup', 'fallback_powerup'));
      if (s) {
        s.setScale(0.42).setDepth(s.y + 2).setSize(86, 68);
        scene.tweens.add({ targets: s, y: dropY - 10, duration: 800, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: s, scale: 0.46, duration: 460, yoyo: true, repeat: -1 });
      }
    }

    function spawnHealth(scene: Phaser.Scene, x: number, y: number) {
      const h = healthUpgrades.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 20, FLOOR_BOTTOM - 20), 'h_heart');
      if (h) {
        h.setScale(0.48).setDepth(h.y + 2).setSize(64, 86);
        scene.tweens.add({ targets: h, scale: 0.53, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    function spawnHomework(scene: Phaser.Scene, x: number, y?: number) {
      const dropY = Phaser.Math.Clamp(y ?? Phaser.Math.Between(HORIZON_Y + 22, FLOOR_BOTTOM - 20), HORIZON_Y + 22, FLOOR_BOTTOM - 20);
      const pickup = homeworkPickups.create(x, dropY, textureOrFallback(scene, 'homework_pickup', 'fallback_powerup'));
      if (pickup) {
        pickup.setScale(0.54).setDepth(pickup.y + 2).setSize(84, 72);
        scene.tweens.add({ targets: pickup, y: dropY - 8, duration: 760, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, angle: 4, duration: 520, yoyo: true, repeat: -1 });
      }
    }

    function spawnDinioCompanion(scene: Phaser.Scene) {
      if (dinioCompanion?.active) {
        return;
      }

      dinioCompanion = scene.physics.add.sprite(player.x - DINIO.followDistance, player.y + DINIO.verticalOffset, 'dinio_walk', 0);
      dinioCompanion.setCollideWorldBounds(true);
      dinioCompanion.setOrigin(DINIO.walkOriginX, DINIO.originY);
      dinioCompanion.setScale(DINIO.scale);
      dinioCompanion.setSize(132, 144);
      dinioCompanion.setOffset(52, 66);
      setDinioPose(scene, 'WALK', facingDirection);
    }

    function setDinioPose(scene: Phaser.Scene, pose: 'WALK' | 'ATTACK', direction: number) {
      if (!dinioCompanion?.active) {
        return;
      }

      const facingLeft = direction < 0;
      dinioCompanion.setFlipX(facingLeft);
      dinioCompanion.setOrigin(
        pose === 'ATTACK'
          ? (facingLeft ? 1 - DINIO.attackOriginX : DINIO.attackOriginX)
          : DINIO.walkOriginX,
        DINIO.originY
      );

      if (pose === 'ATTACK') {
        if (scene.anims.exists('dinio_attack_anim') && dinioCompanion.anims.currentAnim?.key !== 'dinio_attack_anim') {
          dinioCompanion.play('dinio_attack_anim', true);
        }
        return;
      }

      if (scene.anims.exists('dinio_walk_anim') && dinioCompanion.anims.currentAnim?.key !== 'dinio_walk_anim') {
        dinioCompanion.play('dinio_walk_anim', true);
      }
    }

    function equipDinio(scene: Phaser.Scene) {
      dinioUnlocked = true;
      hasDinio = true;
      dinioNextShotAt = scene.time.now + 500;
      spawnDinioCompanion(scene);
      pulseFeedbackFlash(scene, 0xff66d9, 0.18, 220);
      syncPowerupStats();
    }

    function spawnDoghostCompanion(scene: Phaser.Scene) {
      if (!player || !player.active || doghostCompanion?.active) {
        return;
      }

      const spawnX = player.x + (facingDirection * DOGHOST.followDistance);
      const spawnY = player.y + DOGHOST.verticalOffset;
      doghostCompanion = scene.physics.add.sprite(spawnX, spawnY, 'doghost_walk', 0);
      doghostCompanion.body.allowGravity = false;
      doghostCompanion.setCollideWorldBounds(true);
      doghostCompanion.setOrigin(0.5, 0.9);
      doghostCompanion.setScale(DOGHOST.scale);
      doghostCompanion.setAlpha(0.84);
      doghostCompanion.setTint(0xf8fbff);
      doghostCompanion.setSize(116, 120);
      doghostCompanion.setOffset(62, 50);
      if (scene.anims.exists('doghost_walk_anim')) {
        doghostCompanion.play('doghost_walk_anim');
      }
    }

    function spawnTeleportationCCompanion(scene: Phaser.Scene) {
      if (!player || !player.active || teleportationCCompanion?.active) {
        return;
      }

      const spawnX = player.x - (facingDirection * TELEPORTATION_C.followDistance);
      const spawnY = player.y + TELEPORTATION_C.verticalOffset;
      teleportationCCompanion = scene.physics.add.sprite(spawnX, spawnY, 'teleportation_c_walk', 0);
      teleportationCCompanion.body.allowGravity = false;
      teleportationCCompanion.setCollideWorldBounds(true);
      teleportationCCompanion.setOrigin(0.5, 0.92);
      teleportationCCompanion.setScale(TELEPORTATION_C.scale);
      teleportationCCompanion.setAlpha(0.88);
      teleportationCCompanion.setTint(0xd6ccff);
      teleportationCCompanion.setSize(180, 210);
      teleportationCCompanion.setOffset(172, 180);
      setTeleportationCPose(scene, 'WALK', facingDirection);
    }

    function setTeleportationCPose(scene: Phaser.Scene, pose: 'WALK' | 'ATTACK', direction: number) {
      if (!teleportationCCompanion?.active) {
        return;
      }

      teleportationCAttackFacing = direction;
      const facingLeft = direction < 0;
      teleportationCCompanion.setFlipX(facingLeft);
      teleportationCCompanion.setOrigin(
        pose === 'ATTACK'
          ? (facingLeft ? 1 - TELEPORTATION_C.attackOriginX : TELEPORTATION_C.attackOriginX)
          : 0.5,
        pose === 'ATTACK' ? TELEPORTATION_C.attackOriginY : 0.92
      );
      teleportationCCompanion.setScale(pose === 'ATTACK' ? TELEPORTATION_C.attackScale : TELEPORTATION_C.scale);

      if (pose === 'ATTACK') {
        teleportationCCompanion.setTexture('teleportation_c_attack', 0);
        if (scene.anims.exists('teleportation_c_attack_anim') && teleportationCCompanion.anims.currentAnim?.key !== 'teleportation_c_attack_anim') {
          teleportationCCompanion.play('teleportation_c_attack_anim', true);
        }
        return;
      }

      teleportationCCompanion.setTexture('teleportation_c_walk', 0);
      if (scene.anims.exists('teleportation_c_walk_anim') && teleportationCCompanion.anims.currentAnim?.key !== 'teleportation_c_walk_anim') {
        teleportationCCompanion.play('teleportation_c_walk_anim', true);
      }
    }

    function getNearestActiveMonster(x: number, y: number) {
      return monsters
        .getChildren()
        .map((monster) => monster as Phaser.Physics.Arcade.Sprite)
        .filter((monster) => monster.active)
        .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y))[0];
    }

    function triggerTeleportationCAttack(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite) {
      if (!teleportationCCompanion?.active || !target.active) {
        return;
      }

      const teleportationCBody = teleportationCCompanion.body as Phaser.Physics.Arcade.Body;
      const direction = target.x >= teleportationCCompanion.x ? 1 : -1;
      const cameraLeft = scene.cameras.main.scrollX + 40;
      const cameraRight = scene.cameras.main.scrollX + SCREEN_WIDTH - 40;
      const strikeX = Phaser.Math.Clamp(target.x - (direction * TELEPORTATION_C.teleportOffsetX), cameraLeft, cameraRight);
      const strikeY = Phaser.Math.Clamp(target.y + TELEPORTATION_C.teleportOffsetY, HORIZON_Y + 26, FLOOR_BOTTOM - 12);
      const vanishX = teleportationCCompanion.x;
      const vanishY = teleportationCCompanion.y - 26;

      teleportationCNextStrikeAt = scene.time.now + TELEPORTATION_C.attackCooldownMs;
      teleportationCAttackEndsAt = scene.time.now + 560;
      teleportationCAttackFacing = direction;
      teleportationCBody.setVelocity(0, 0);

      const vanishBurst = scene.add.image(vanishX, vanishY, 'teleportation_c_orb')
        .setScale(0.22)
        .setAlpha(0.82)
        .setDepth(teleportationCCompanion.y + 6);
      scene.tweens.add({
        targets: vanishBurst,
        scale: 0.62,
        alpha: 0,
        angle: direction * 35,
        duration: 180,
        ease: 'Cubic.easeOut',
        onComplete: () => vanishBurst.destroy()
      });

      teleportationCCompanion.setAlpha(0);
      scene.time.delayedCall(110, () => {
        if (!teleportationCCompanion?.active) {
          return;
        }

        teleportationCCompanion.setPosition(strikeX, strikeY);
        teleportationCCompanion.setDepth(strikeY + 2);
        teleportationCCompanion.setAlpha(0.96);
        setTeleportationCPose(scene, 'ATTACK', direction);
        pulseFeedbackFlash(scene, 0x8b5cf6, 0.06, 120);

        const appearBurst = scene.add.image(strikeX, strikeY - 34, 'teleportation_c_orb')
          .setScale(0.2)
          .setAlpha(0.92)
          .setDepth(strikeY + 5);
        scene.tweens.add({
          targets: appearBurst,
          scale: 0.54,
          alpha: 0,
          duration: 180,
          ease: 'Cubic.easeOut',
          onComplete: () => appearBurst.destroy()
        });

        scene.time.delayedCall(170, () => {
          if (!teleportationCCompanion?.active || !target.active) {
            return;
          }

          if (Phaser.Math.Distance.Between(teleportationCCompanion.x, teleportationCCompanion.y, target.x, target.y) <= 170) {
            sounds.hit();
            takeMonsterDamage(scene, target, TELEPORTATION_C.strikeDamage);
          }
        });
      });
    }

    function equipDoghost(scene: Phaser.Scene) {
      doghostUnlocked = true;
      hasDoghost = true;
      doghostNextShotAt = scene.time.now + 420;
      spawnDoghostCompanion(scene);
      pulseFeedbackFlash(scene, 0xf8fafc, 0.2, 220);
      syncPowerupStats();
    }

    function equipTeleportationC(scene: Phaser.Scene) {
      teleportationCUnlocked = true;
      hasTeleportationC = true;
      teleportationCNextStrikeAt = scene.time.now + 900;
      teleportationCAttackEndsAt = 0;
      spawnTeleportationCCompanion(scene);
      pulseFeedbackFlash(scene, 0x111111, 0.24, 220);
      pulseFeedbackFlash(scene, 0x8b5cf6, 0.12, 180);
      syncPowerupStats();
    }

    function spawnDinioPickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = dinioPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 24, FLOOR_BOTTOM - 24), 'dinio_orb');
      if (pickup) {
        pickup.setScale(0.54).setDepth(pickup.y + 2).setSize(90, 90);
        scene.tweens.add({ targets: pickup, y: pickup.y - 20, duration: 760, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, alpha: 0.65, duration: 420, yoyo: true, repeat: -1 });
      }
    }

    function spawnDoghostPickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = doghostPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 24, FLOOR_BOTTOM - 24), 'doghost_orb');
      if (pickup) {
        pickup.setScale(0.5).setDepth(pickup.y + 2).setSize(88, 88);
        scene.tweens.add({ targets: pickup, y: pickup.y - 18, duration: 760, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, alpha: 0.82, duration: 420, yoyo: true, repeat: -1 });
      }
    }

    function spawnTeleportationCPickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = teleportationCPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 24, FLOOR_BOTTOM - 24), 'teleportation_c_orb');
      if (pickup) {
        pickup.setScale(0.48).setDepth(pickup.y + 2).setSize(92, 92);
        scene.tweens.add({ targets: pickup, y: pickup.y - 20, duration: 760, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, alpha: 0.84, duration: 420, yoyo: true, repeat: -1 });
      }
    }

    function spawnGravityCorePickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = gravityCorePickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 24, FLOOR_BOTTOM - 24), 'gravity_core');
      if (pickup) {
        pickup.setScale(0.52).setDepth(pickup.y + 3).setSize(96, 96);
        scene.tweens.add({ targets: pickup, y: pickup.y - 24, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: pickup, angle: 360, duration: 2400, repeat: -1, ease: 'Linear' });
        scene.tweens.add({ targets: pickup, scale: 0.62, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    function spawnTeleportiPickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = teleportiPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 26, FLOOR_BOTTOM - 18), 'teleporti');
      if (pickup) {
        pickup.setScale(0.56).setDepth(pickup.y + 3).setSize(96, 112).setOffset(48, 40);
        pickup.setData('cooldownUntil', 0);
        scene.tweens.add({ targets: pickup, y: pickup.y - 18, duration: 840, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, alpha: 0.72, duration: 460, yoyo: true, repeat: -1 });
      }
    }

    function spawnEncounterTeleporti(scene: Phaser.Scene, sectionIndex: number, camX: number) {
      const isHeavyTeleportSection
        = (currentLevel === 2 && sectionIndex === 1)
        || (currentLevel === 3 && sectionIndex === 1);
      if (!isHeavyTeleportSection) {
        return;
      }

      const spawnId = `L${currentLevel}-S${sectionIndex}`;
      const exists = teleportiPickups.getChildren().some((child) => {
        const pickup = child as Phaser.Physics.Arcade.Sprite;
        return pickup.active && pickup.getData('spawnId') === spawnId;
      });
      if (exists) {
        return;
      }

      const pickupX = camX + SCREEN_WIDTH * 0.62;
      const pickupY = FLOOR_BOTTOM - 26;
      const pickup = teleportiPickups.create(pickupX, pickupY, textureOrFallback(scene, 'teleporti', 'fallback_powerup'));
      if (pickup) {
        pickup.setScale(0.56).setDepth(pickup.y + 3).setSize(96, 112).setOffset(48, 40);
        pickup.setData('cooldownUntil', 0);
        pickup.setData('spawnId', spawnId);
        scene.tweens.add({ targets: pickup, y: pickup.y - 18, duration: 840, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: pickup, alpha: 0.72, duration: 460, yoyo: true, repeat: -1 });
      }
    }

    function triggerTeleporti(scene: Phaser.Scene, pickup: Phaser.Physics.Arcade.Sprite) {
      const now = scene.time.now;
      const cooldownUntil = pickup.getData('cooldownUntil') || 0;
      if (!pickup.active || now < cooldownUntil || now < teleportiCooldownUntil) {
        return;
      }

      const camX = scene.cameras.main.scrollX;
      const minX = camX + 90;
      const maxX = camX + SCREEN_WIDTH - 90;
      const minY = HORIZON_Y + 34;
      const maxY = FLOOR_BOTTOM - 18;
      let nextX = player.x;
      let nextY = player.y;

      for (let attempt = 0; attempt < 10; attempt++) {
        const candidateX = Phaser.Math.Between(minX, maxX);
        const candidateY = Phaser.Math.Between(minY, maxY);
        const farFromPickup = Phaser.Math.Distance.Between(candidateX, candidateY, pickup.x, pickup.y) > 180;
        const farFromPlayer = Phaser.Math.Distance.Between(candidateX, candidateY, player.x, player.y) > 150;
        if (farFromPickup && farFromPlayer) {
          nextX = candidateX;
          nextY = candidateY;
          break;
        }
      }

      teleportiCooldownUntil = now + 2300;
      addScore(POINT_VALUES.teleporti);
      pickup.setData('cooldownUntil', now + 2600);
      pickup.setAlpha(0.28);
      resetPlayerActionState();
      player.setVelocity(0, 0);

      const depart = scene.add.image(player.x, player.y - 18, 'teleporti').setScale(0.3).setAlpha(0.82).setDepth(player.y + 4);
      scene.tweens.add({
        targets: depart,
        scale: 0.9,
        alpha: 0,
        angle: 60,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => depart.destroy()
      });

      player.setPosition(nextX, nextY);
      playerShadow.setPosition(nextX, nextY + 6);
      isJumping = true;
      isSlamming = false;
      jumpVelocity = 0;
      teleportHoldJumpZ = 218;
      jumpZ = teleportHoldJumpZ;
      teleportHangUntil = now + 2000;
      setPlayerInvulnerableUntil(teleportHangUntil + 400);
      pulseFeedbackFlash(scene, 0x60a5fa, 0.18, 180);
      const arrive = scene.add.image(nextX, nextY - 18, 'teleporti').setScale(0.24).setAlpha(0.9).setDepth(nextY + 4);
      scene.tweens.add({
        targets: arrive,
        scale: 0.96,
        alpha: 0,
        angle: -70,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => arrive.destroy()
      });
      showSectionCard(scene, 'TELEPORTI!', 'SKY WARP -> STROBE -> BUTT BOUNCE', 1050);
      sounds.soul();

      scene.time.delayedCall(1500, () => {
        if (pickup && pickup.active) {
          pickup.setAlpha(0.72);
        }
      });
    }

    function fireDinioShot(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite) {
      if (!dinioCompanion?.active || !target.active) {
        return;
      }

      const direction = target.x >= dinioCompanion.x ? 1 : -1;
      dinioAttackFacing = direction;
      setDinioPose(scene, 'ATTACK', direction);
      const muzzleX = dinioCompanion.x + (direction * 118);
      const muzzleY = dinioCompanion.y - 210;
      const shot = allyProjectiles.create(dinioCompanion.x + (direction * 92), dinioCompanion.y - 188, textureOrFallback(scene, 'dinio_shot', 'fallback_powerup'));
      if (shot) {
        shot.setScale(direction === 1 ? 0.28 : -0.28, 0.28);
        shot.setAlpha(0.95);
        shot.setDepth(dinioCompanion.y + 8);
        shot.setData({ spent: false, expiresAt: scene.time.now + 1700 });
        (shot.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        scene.physics.moveToObject(shot, target, DINIO.shotSpeed);
        scene.tweens.add({
          targets: shot,
          scaleX: direction === 1 ? 0.56 : -0.56,
          scaleY: 0.56,
          alpha: 1,
          duration: 90,
          ease: 'Quad.Out'
        });
      }
      const flash = scene.add.image(muzzleX, muzzleY, 'dinio_muzzle_flash')
        .setScale(direction === 1 ? 0.28 : -0.28, 0.28)
        .setAlpha(0.95)
        .setDepth(dinioCompanion.y + 10);
      scene.tweens.add({
        targets: flash,
        scaleX: direction === 1 ? 0.96 : -0.96,
        scaleY: 0.96,
        alpha: 0,
        angle: direction * 10,
        duration: 140,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy()
      });
      scene.tweens.add({
        targets: dinioCompanion,
        x: dinioCompanion.x - (direction * 18),
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      dinioAttackEndsAt = scene.time.now + 260;
    }

    function fireDoghostWave(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite) {
      if (!doghostCompanion?.active || !target.active) {
        return;
      }

      const direction = target.x >= doghostCompanion.x ? 1 : -1;
      const shot = allyProjectiles.create(doghostCompanion.x + (direction * 56), doghostCompanion.y - 64, textureOrFallback(scene, 'doghost_wave', 'fallback_powerup'));
      if (shot) {
        shot.setScale(direction === 1 ? 0.3 : -0.3, 0.3);
        shot.setAlpha(0.88);
        shot.setTint(0xf8fafc);
        shot.setDepth(doghostCompanion.y + 7);
        shot.setData({ spent: false, expiresAt: scene.time.now + 1400, damage: 1 });
        (shot.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        scene.physics.moveToObject(shot, target, DOGHOST.waveSpeed);
        scene.tweens.add({
          targets: shot,
          scaleX: direction === 1 ? 0.68 : -0.68,
          scaleY: 0.68,
          alpha: 0.3,
          duration: 220,
          ease: 'Quad.easeOut'
        });
      }

      sounds.attack();
      doghostAttackEndsAt = scene.time.now + 180;
      scene.tweens.add({
        targets: doghostCompanion,
        x: doghostCompanion.x - (direction * 14),
        alpha: 0.98,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    function equipSword(scene: Phaser.Scene, fullDurability: boolean) {
      swordUnlocked = true;
      hasFlameSword = true;
      characterPowerUnlocked = true;
      swordDurability = fullDurability ? maxSwordDurability : Math.max(1, swordDurability);
      playerSword?.setVisible(true);
      pulseFeedbackFlash(scene, 0xf97316, 0.16, 170);
      syncPowerupStats();
    }

    function equipCharacterPower(scene: Phaser.Scene) {
      characterPowerUnlocked = true;
      if (isXGod) {
        equipSword(scene, true);
        return;
      }
      pulseFeedbackFlash(scene, selectedCharacterId === 'teleportation_c' ? 0x8b5cf6 : selectedCharacterId === 'ezra' ? 0xf97316 : selectedCharacterId === 'nico' ? 0x84cc16 : 0xf59e0b, 0.2, 220);
      syncPowerupStats();
    }

    function spawnSwordPickup(scene: Phaser.Scene, x: number, y: number) {
      const pickup = swordPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 24, FLOOR_BOTTOM - 24), 'sword_pickup');
      if (pickup) {
        pickup.setScale(0.54).setDepth(pickup.y + 2);
        scene.tweens.add({ targets: pickup, y: pickup.y - 18, duration: 800, yoyo: true, repeat: -1 });
      }
    }

    function spawnBossRewardSword(scene: Phaser.Scene, x: number, y: number) {
      if (pendingSwordRewardPickup || characterPowerUnlocked) {
        return;
      }
      pendingSwordRewardPickup = true;
      const pickupTexture = isXGod ? 'xgod_sword_reward' : textureOrFallback(scene, 'character_reward', 'fallback_powerup');
      const pickup = swordRewardPickups.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 190, FLOOR_BOTTOM - 86), pickupTexture);
      if (pickup) {
        pickup
          .setOrigin(0.5, 0.9)
          .setScale(isXGod ? 0.22 : 0.62)
          .setDepth(pickup.y + 3)
          .setSize(isXGod ? 250 : 120, isXGod ? 760 : 120)
          .setOffset(isXGod ? 155 : 36, isXGod ? 136 : 36);
        scene.tweens.add({ targets: pickup, y: pickup.y - 16, duration: 840, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: pickup, alpha: 0.84, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    function startXGodSwordRewardSequence(scene: Phaser.Scene, pickup: Phaser.Physics.Arcade.Sprite) {
      if (!pickup.active || isSwordRewardSequenceActive) {
        return;
      }

      pendingSwordRewardPickup = false;
      isSwordRewardSequenceActive = true;
      pickup.destroy();
      addScore(POINT_VALUES.xgodSwordReward);
      player.setVelocity(0, 0);
      equipCharacterPower(scene);
      playerSword?.setVisible(false);

      const glow = swordRewardOverlay.getAt(0) as Phaser.GameObjects.Sprite;
      const rewardSprite = swordRewardOverlay.getAt(1) as Phaser.GameObjects.Sprite;
      const title = swordRewardOverlay.getAt(2) as Phaser.GameObjects.Text;
      const subtitle = swordRewardOverlay.getAt(3) as Phaser.GameObjects.Text;

      glow.setFrame(0).setVisible(false).setAlpha(0);
      rewardSprite.setFrame(0).setVisible(true).setAlpha(1).setScale(isXGod ? 0.82 : 1.12);
      title.setText(`${selectedCharacter.rewardName.toUpperCase()} POWER-UP`).setVisible(true).setAlpha(1);
      subtitle.setText(selectedCharacter.rewardSubtitle).setVisible(true).setAlpha(0.96);
      swordRewardOverlay.setVisible(true).setAlpha(1);
      pulseFeedbackFlash(scene, 0xffedd5, 0.2, 260);

      scene.time.delayedCall(280, () => {
        if (!isSwordRewardSequenceActive) {
          return;
        }
        if (isXGod) rewardSprite.setFrame(1);
      });
      scene.time.delayedCall(560, () => {
        if (!isSwordRewardSequenceActive) {
          return;
        }
        if (isXGod) rewardSprite.setFrame(2);
      });
      scene.time.delayedCall(840, () => {
        if (!isSwordRewardSequenceActive) {
          return;
        }
        if (isXGod) {
          rewardSprite.setFrame(3);
          glow.setFrame(3);
        }
        glow.setVisible(true);
        scene.tweens.add({
          targets: rewardSprite,
          scale: 0.9,
          alpha: 1,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
          targets: glow,
          scale: 0.96,
          alpha: 0.38,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        scene.time.addEvent({
          delay: 700,
          repeat: 6,
          callback: () => {
            if (isSwordRewardSequenceActive) {
              pulseFeedbackFlash(scene, 0xfff7d1, 0.08, 180);
            }
          }
        });
      });

      scene.time.delayedCall(5840, () => {
        scene.tweens.killTweensOf(rewardSprite);
        scene.tweens.killTweensOf(glow);
        glow.setVisible(false).setAlpha(0);
        rewardSprite.setVisible(false).setAlpha(0).setScale(0.82);
        title.setVisible(false).setAlpha(0);
        subtitle.setVisible(false).setAlpha(0);
        swordRewardOverlay.setVisible(false).setAlpha(0);
        isSwordRewardSequenceActive = false;
        playerSword?.setVisible(isXGod && hasFlameSword);
        showLevelTransition(scene, `${selectedCharacter.rewardName.toUpperCase()} CLAIMED!`, 1200, () => {
          inkShieldReady = shieldUnlocked;
          syncPowerupStats({
            level: Math.min(MAX_LEVEL, currentLevel + 1),
            monstersDefeated: 0,
            isVictory: false
          });
        });
      });
    }

    function applySwordDefeatPenalty(scene: Phaser.Scene) {
      if (!hasFlameSword) {
        return;
      }

      swordDurability = Math.max(0, swordDurability - 1);
      if (swordDurability === 0) {
        hasFlameSword = false;
        playerSword?.setVisible(false);
        syncPowerupStats();
        scene.time.delayedCall(320, () => {
          if (player && player.active) {
            spawnSwordPickup(scene, player.x + 130, FLOOR_BOTTOM - 28);
            showSectionCard(scene, 'POWER-UP DROPPED', 'RECOVER THE FLAME SWORD', 950);
          }
        });
      } else {
        syncPowerupStats();
      }
    }

    function spawnDestructible(scene: Phaser.Scene, x: number) {
      const y = Phaser.Math.Between(HORIZON_Y + 40, FLOOR_BOTTOM - 10);
      const rolls = ['TRASH', 'BOX', 'BOOKS', 'BOOKS', 'BOOKS', 'VENDING', 'VENDING', 'VENDING'];
      const type = rolls[Math.floor(Math.random() * rolls.length)] as DestructibleType;
      spawnDestructiblePreset(scene, x, type, y);
    }

    function spawnDestructiblePreset(scene: Phaser.Scene, x: number, type: DestructibleType, y?: number) {
      const spawnY = y ?? Phaser.Math.Between(HORIZON_Y + 40, FLOOR_BOTTOM - 10);
      let texture = 'o_trash'; let hp = 1; let scale = 1;
      if (type === 'BOX') { texture = 'o_box'; scale = 0.52; }
      else if (type === 'BOOKS') { texture = 'o_books'; scale = 0.52; }
      else if (type === 'VENDING') { texture = 'o_vending'; hp = 3; scale = 0.66; }
      else { texture = 'o_trash'; hp = 2; scale = 0.52; }
      const t = destructibles.create(x, spawnY, textureOrFallback(scene, texture, 'fallback_object'));
      if (t) {
        t.setData({ type, hp }).setScale(scale);
        t.setImmovable(true).setOrigin(0.5, 0.9);
        if (type === 'VENDING') t.setSize(74, 170);
        else if (type === 'BOOKS') t.setSize(88, 58);
        else if (type === 'BOX') t.setSize(38, 34);
        else t.setSize(30, 44);
      }
    }

    function playSpawnBurst(scene: Phaser.Scene, x: number, y: number) {
      const burst = scene.add.image(x, y - 26, 'spawn_burst').setScale(0.22).setAlpha(0.95).setDepth(y + 4);
      scene.tweens.add({
        targets: burst,
        scale: 0.86,
        alpha: 0,
        angle: Phaser.Math.Between(-20, 20),
        duration: 280,
        ease: 'Quad.easeOut',
        onComplete: () => burst.destroy()
      });
    }

    function playMonsterTell(scene: Phaser.Scene, x: number, y: number, texture: string, scale: number, duration: number, angle: number = 0) {
      const tell = scene.add.image(x, y, textureOrFallback(scene, texture, 'fallback_powerup')).setScale(scale).setAlpha(0.96).setAngle(angle).setDepth(y + 8);
      scene.tweens.add({
        targets: tell,
        alpha: 0,
        scale: scale * 1.25,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => tell.destroy()
      });
    }

    function spawnSectionEncounterProps(scene: Phaser.Scene, sectionIndex: number, camX: number) {
      const anchorX = camX + SCREEN_WIDTH * 0.6;
      const presets: Array<Array<Array<{ offsetX: number; type: DestructibleType }>>> = [
        [
          [
            { offsetX: -170, type: 'TRASH' },
            { offsetX: 20, type: 'BOX' },
          ],
          [
            { offsetX: -210, type: 'BOOKS' },
            { offsetX: 10, type: 'VENDING' },
            { offsetX: 180, type: 'BOX' },
          ],
          [
            { offsetX: -220, type: 'VENDING' },
            { offsetX: -10, type: 'TRASH' },
            { offsetX: 170, type: 'BOOKS' },
          ]
        ],
        [
          [
            { offsetX: -190, type: 'BOOKS' },
            { offsetX: 10, type: 'VENDING' },
          ],
          [
            { offsetX: -220, type: 'VENDING' },
            { offsetX: 0, type: 'BOX' },
            { offsetX: 190, type: 'BOOKS' },
          ],
          [
            { offsetX: -230, type: 'TRASH' },
            { offsetX: -20, type: 'VENDING' },
            { offsetX: 180, type: 'VENDING' },
          ]
        ],
        [
          [
            { offsetX: -210, type: 'TRASH' },
            { offsetX: 10, type: 'TRASH' },
            { offsetX: 190, type: 'VENDING' },
          ],
          [
            { offsetX: -240, type: 'BOOKS' },
            { offsetX: -20, type: 'BOX' },
            { offsetX: 185, type: 'TRASH' },
          ],
          [
            { offsetX: -240, type: 'VENDING' },
            { offsetX: 0, type: 'BOOKS' },
            { offsetX: 205, type: 'BOX' },
          ]
        ],
        [
          [
            { offsetX: -230, type: 'BOOKS' },
            { offsetX: -20, type: 'VENDING' },
            { offsetX: 200, type: 'TRASH' },
          ],
          [
            { offsetX: -230, type: 'VENDING' },
            { offsetX: -10, type: 'BOOKS' },
            { offsetX: 190, type: 'BOX' },
          ],
          [
            { offsetX: -250, type: 'TRASH' },
            { offsetX: -30, type: 'VENDING' },
            { offsetX: 190, type: 'BOOKS' },
          ]
        ]
      ];
      const group = presets[getLevelKey(currentLevel) - 1][Math.min(sectionIndex, 2)];
      group.forEach((preset, index) => {
        const reduceProp = (preset.type === 'TRASH' || preset.type === 'BOX')
          && ((currentLevel + sectionIndex + index) % 2 === 1);
        if (reduceProp) {
          return;
        }
        spawnDestructiblePreset(
          scene,
          anchorX + preset.offsetX,
          preset.type,
          Phaser.Math.Between(HORIZON_Y + 56 + (index * 8), FLOOR_BOTTOM - 10)
        );
      });
      placeStreetDressing(scene, { texture: 'd_cone', x: anchorX - 300, y: FLOOR_BOTTOM - 3, scale: currentLevel === 3 ? 0.92 : 0.78, depthOffset: -3 });
      placeStreetDressing(scene, { texture: 'd_puddle', x: anchorX + 260, y: FLOOR_BOTTOM - 11, scale: currentLevel === 2 ? 0.98 : 0.82, alpha: 0.72, depthOffset: -14 });
      spawnEncounterTeleporti(scene, sectionIndex, camX);
    }

    function fireFloaterShot(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active) return;
      const direction = player.x >= monster.x ? 1 : -1;
      const projectile = projectiles.create(monster.x + (direction * 34), monster.y - 18, textureOrFallback(scene, 'ink_splat', 'fallback_powerup'));
      if (projectile) {
        projectile.setScale(0.56);
        projectile.setTint(0x8df08f);
        projectile.setAlpha(0.92);
        scene.physics.moveToObject(projectile, player, 215);
      }
    }

    function fireLongRangeEnemyShot(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active) return;
      const type = monster.getData('type') as MonsterType;
      const direction = player.x >= monster.x ? 1 : -1;
      const texture = type === 'GHOST' ? 'doghost_wave' : 'scrap';
      const projectile = projectiles.create(monster.x + (direction * 42), monster.y - 28, textureOrFallback(scene, texture, 'fallback_powerup'));
      if (!projectile) {
        return;
      }
      projectile.setData('damage', type === 'GHOST' ? 6 : 8);
      projectile.setData('expiresAt', scene.time.now + 2600);
      projectile
        .setScale(type === 'GHOST' ? 0.62 : 0.5)
        .setAlpha(type === 'GHOST' ? 0.84 : 0.96)
        .setTint(type === 'GHOST' ? 0xdbeafe : 0xf8fafc)
        .setDepth(monster.y + 6);
      scene.physics.moveToObject(projectile, player, getDifficultyScaledSpeed(type === 'GHOST' ? 255 : 285));
      sounds.bossShoot();
    }

    function moveLongRangeEnemy(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, timer: number, state: string, nextAction: number, stateUntil: number, distanceToPlayer: number) {
      const type = monster.getData('type') as MonsterType;
      const preferredDistance = type === 'GHOST' ? 410 : 360;
      const verticalDrift = Math.sin(scene.time.now * 0.004 + monster.x * 0.013) * (type === 'GHOST' ? 62 : 38);
      const keepAwayX = player.x + (monster.x < player.x ? -preferredDistance : preferredDistance);
      const approachX = player.x + (monster.x < player.x ? -preferredDistance * 0.82 : preferredDistance * 0.82);
      const targetX = distanceToPlayer < preferredDistance - 70 ? keepAwayX : distanceToPlayer > preferredDistance + 120 ? approachX : monster.x;
      const targetY = Phaser.Math.Clamp(player.y + verticalDrift, HORIZON_Y + 28, FLOOR_BOTTOM - 24);

      if (type === 'GHOST') {
        setGhostPose(monster, 'FLOAT');
        monster.setAlpha(0.64 + ((Math.sin(scene.time.now * 0.008 + monster.x * 0.02) + 1) * 0.14));
      }

      if (state === 'RANGE_WINDUP') {
        monster.setVelocity(0);
        monster.setTint(Math.floor(timer / 5) % 2 === 0 ? 0xfef3c7 : 0xffffff);
        if (timer >= stateUntil) {
          monster.clearTint();
          fireLongRangeEnemyShot(scene, monster);
          monster.setData('state', 'RANGE_RECOVER');
          monster.setData('stateUntil', timer + 28);
          monster.setData('nextAction', timer + Phaser.Math.Between(120, 175));
        }
        return;
      }

      if (state === 'RANGE_RECOVER') {
        monster.setVelocity(0);
        if (timer >= stateUntil) {
          monster.setData('state', 'CHASE');
        }
        return;
      }

      monster.clearTint();
      smoothMoveTo(monster, targetX, targetY, getDifficultyScaledSpeed(type === 'GHOST' ? GHOST_FLOAT.floatSpeed : ENCOUNTERS.monsterSpeed.floater), 0.12, 28);
      if (timer >= nextAction && distanceToPlayer < 620) {
        monster.setData('state', 'RANGE_WINDUP');
        monster.setData('stateUntil', timer + 34);
        playMonsterTell(scene, monster.x, monster.y - 34, 'tell_ring', 0.18, 260);
      }
    }

    function updateSpiderJumper(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, timer: number, state: string, nextAction: number, stateUntil: number, distanceToPlayer: number) {
      const jumpStartedAt = monster.getData('jumpStartedAt') || 0;
      const jumpEndsAt = monster.getData('jumpEndsAt') || 0;
      const jumpStartX = monster.getData('jumpStartX') ?? monster.x;
      const jumpStartY = monster.getData('jumpStartY') ?? monster.y;
      const jumpTargetX = monster.getData('jumpTargetX') ?? player.x;
      const jumpTargetY = monster.getData('jumpTargetY') ?? player.y;

      if (state === 'JUMP_PREP') {
        monster.setVelocity(0);
        monster.setTint(Math.floor(timer / 4) % 2 === 0 ? 0x86efac : 0xffffff);
        if (scene.anims.exists('spider_attack_anim') && (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'spider_attack_anim')) {
          monster.play('spider_attack_anim', true);
        }
        if (timer >= stateUntil) {
          monster.clearTint();
          monster.setData('state', 'JUMPING');
          monster.setData('jumpStartedAt', scene.time.now);
          monster.setData('jumpEndsAt', scene.time.now + 820);
          monster.setData('jumpStartX', monster.x);
          monster.setData('jumpStartY', monster.y);
          monster.setData('jumpTargetX', Phaser.Math.Clamp(player.x + Phaser.Math.Between(-34, 34), scene.cameras.main.scrollX + 48, scene.cameras.main.scrollX + SCREEN_WIDTH - 48));
          monster.setData('jumpTargetY', Phaser.Math.Clamp(player.y + Phaser.Math.Between(-20, 20), HORIZON_Y + 28, FLOOR_BOTTOM - 22));
          playMonsterTell(scene, monster.x, monster.y - 42, 'dash_tell', 0.24, 210);
        }
        return;
      }

      if (state === 'JUMPING') {
        const progress = Phaser.Math.Clamp((scene.time.now - jumpStartedAt) / Math.max(1, jumpEndsAt - jumpStartedAt), 0, 1);
        const lift = Math.sin(progress * Math.PI) * 155;
        monster.setVelocity(0);
        monster.setPosition(
          Phaser.Math.Linear(jumpStartX, jumpTargetX, progress),
          Phaser.Math.Linear(jumpStartY, jumpTargetY, progress) - lift
        );
        monster.setDepth(monster.y + 180);
        if (progress >= 1) {
          monster.setPosition(jumpTargetX, jumpTargetY);
          monster.setData('state', 'SLAM');
          monster.setData('stateUntil', timer + 18);
          monster.setData('nextAction', timer + 132);
          scene.cameras.main.shake(130, 0.004);
          playMonsterTell(scene, monster.x, monster.y - 16, 'giant_quake', 0.18, 220);
          if (!playerInvulnerable && jumpZ < 42 && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < 126) {
            takePlayerDamage(scene, 16);
          }
        }
        return;
      }

      if (state === 'SLAM') {
        monster.setVelocity(0);
        monster.setTint(0xbbf7d0);
        if (timer >= stateUntil) {
          monster.clearTint();
          monster.setData('state', 'RECOVER');
          monster.setData('stateUntil', timer + 34);
        }
        return;
      }

      if (state === 'RECOVER') {
        monster.setVelocity(0);
        if (timer >= stateUntil) {
          monster.setData('state', 'CHASE');
          if (scene.anims.exists('spider_walk_anim')) {
            monster.play('spider_walk_anim', true);
          }
        }
        return;
      }

      const skitterOffset = Math.sin(scene.time.now * 0.004 + monster.x * 0.012) * 36;
      const stagingX = player.x + (monster.x < player.x ? -250 : 250);
      smoothMoveTo(monster, stagingX, player.y + skitterOffset, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.floater * 0.86), 0.13, 32);
      if ((!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'spider_walk_anim') && scene.anims.exists('spider_walk_anim')) {
        monster.play('spider_walk_anim', true);
      }
      if (timer >= nextAction && distanceToPlayer < 620) {
        monster.setData('state', 'JUMP_PREP');
        monster.setData('stateUntil', timer + 32);
      }
    }

    function getMonsterBaseFacing(type: MonsterType) {
      // This is the direction the unflipped art is drawn facing.
      if (type === 'CHASER' || type === 'COSMIC_GRUNT') return 'left';
      return 'right';
    }

    function getMonsterFlipForFacing(monster: Phaser.Physics.Arcade.Sprite, facingRight: boolean) {
      const baseFacing = (monster.getData('baseFacing') || getMonsterBaseFacing(monster.getData('type') as MonsterType)) as 'left' | 'right';
      return baseFacing === 'left' ? facingRight : !facingRight;
    }

    function updateMonsterFacing(monster: Phaser.Physics.Arcade.Sprite) {
      if (!player?.active || !monster.active) {
        return false;
      }
      const facingRight = player.x > monster.x;
      monster.setData('facingRight', facingRight);
      monster.setFlipX(getMonsterFlipForFacing(monster, facingRight));
      return facingRight;
    }

    function applyMonsterSeparation(monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || monster.getData('type') === 'BOSS') {
        return;
      }

      monsters.getChildren().forEach((otherChild) => {
        const other = otherChild as Phaser.Physics.Arcade.Sprite;
        if (!other || other === monster || !other.active || other.getData('type') === 'BOSS') {
          return;
        }

        const dx = monster.x - other.x;
        const dy = monster.y - other.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const monsterType = monster.getData('type') as MonsterType;
        const otherType = other.getData('type') as MonsterType;
        const minDistance = monsterType === 'GIANT' || otherType === 'GIANT' ? 132 : 74;
        if (distance >= minDistance) {
          return;
        }

        const push = (minDistance - distance) * 0.04;
        const nx = dx / distance;
        const ny = dy / distance;
        monster.x += nx * push;
        monster.y = Phaser.Math.Clamp(monster.y + ny * push * 0.55, WALK_ZONE_TOP, WALK_ZONE_BOTTOM);
      });
    }

    function getBossFlipForFacing(monster: Phaser.Physics.Arcade.Sprite, facingRight: boolean) {
      const baseFacing = (monster.getData('baseFacing') || 'left') as 'left' | 'right';
      return baseFacing === 'left' ? facingRight : !facingRight;
    }

    function syncBossFacing(monster: Phaser.Physics.Arcade.Sprite) {
      const facingRight = !!monster.getData('facingRight');
      const usingDarkDragonAttackArt = monster.getData('bossVariant') === 'DARK_DRAGON' && monster.texture.key === 'dark_dragon_attack';
      if (usingDarkDragonAttackArt) {
        monster.setFlipX(!facingRight);
        return;
      }
      monster.setFlipX(getBossFlipForFacing(monster, facingRight));
    }

    function updateBossFacing(monster: Phaser.Physics.Arcade.Sprite) {
      const facingRight = !!player?.active && player.x > monster.x;
      monster.setData('facingRight', facingRight);
      syncBossFacing(monster);
      return facingRight;
    }

    function setDarkDragonPose(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, pose: 'WALK' | 'WINDUP' | 'BREATH' | 'DEAD') {
      if (pose === 'DEAD') {
        monster.anims.stop();
        monster.setTexture('dark_dragon_dead');
        monster.setScale(DARK_DRAGON.corpseScale);
        monster.setOrigin(0.5, 0.82);
        monster.setSize(430, 255);
        monster.setOffset(236, 302);
        syncBossFacing(monster);
        return;
      }

      if (pose === 'WALK') {
        monster.setScale(DARK_DRAGON.scale);
        monster.setOrigin(0.5, 0.86);
        monster.setSize(305, 300);
        monster.setOffset(112, 190);
        syncBossFacing(monster);
        if (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'dark_dragon_walk_anim') {
          monster.play('dark_dragon_walk_anim', true);
        }
        return;
      }

      monster.anims.stop();
      monster.setTexture('dark_dragon_attack', pose === 'BREATH' ? 2 : 0);
      monster.setScale(DARK_DRAGON.scale);
      monster.setOrigin(0.5, 0.82);
      monster.setSize(330, 270);
      monster.setOffset(150, 205);
      syncBossFacing(monster);
    }

    function setKillinasPose(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, pose: 'WALK' | 'GUN' | 'AXE') {
      monster.setScale(KILLINAS_DAUGHTER.scale);
      monster.setOrigin(0.5, 0.92);
      monster.setSize(178, 270);
      monster.setOffset(pose === 'WALK' ? 190 : 242, pose === 'WALK' ? 345 : 372);
      syncBossFacing(monster);

      if (pose === 'WALK') {
        if (monster.texture.key !== 'killinas_daughter_walk') {
          monster.setTexture('killinas_daughter_walk', 0);
        }
        if (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'killinas_daughter_walk_anim') {
          monster.play('killinas_daughter_walk_anim', true);
        }
        return;
      }

      monster.anims.stop();
      if (pose === 'GUN') {
        monster.setTexture('killinas_daughter_attack', 1);
      } else {
        monster.setTexture('killinas_daughter_attack', 3);
      }
    }

    function setVoidRegentPose(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, pose: 'WALK' | 'ATTACK') {
      monster.setOrigin(0.5, 0.9);
      monster.setSize(330, 480);
      monster.setOffset(pose === 'ATTACK' ? 185 : 195, pose === 'ATTACK' ? 238 : 250);
      syncBossFacing(monster);

      if (pose === 'ATTACK') {
        monster.setScale(VOID_REGENT.attackScale);
        if (monster.texture.key !== 'void_regent_attack') {
          monster.setTexture('void_regent_attack', 0);
        }
        if (scene.anims.exists('void_regent_attack_anim')) {
          monster.play('void_regent_attack_anim', true);
        }
        return;
      }

      monster.setScale(VOID_REGENT.scale);
      if (monster.texture.key !== 'void_regent_walk') {
        monster.setTexture('void_regent_walk', 0);
      }
      if (scene.anims.exists('void_regent_walk_anim') && (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'void_regent_walk_anim')) {
        monster.play('void_regent_walk_anim', true);
      }
    }

    function setInkBehemothPose(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, pose: 'WALK' | 'ATTACK') {
      monster.setOrigin(0.5, 0.88);
      monster.setSize(320, 300);
      monster.setOffset(150, 170);
      syncBossFacing(monster);

      if (pose === 'ATTACK') {
        monster.setScale(INK_BEHEMOTH.attackScale);
        if (monster.texture.key !== 'ink_behemoth_attack') {
          monster.setTexture('ink_behemoth_attack', 0);
        }
        if (scene.anims.exists('ink_behemoth_attack_anim')) {
          monster.play('ink_behemoth_attack_anim', true);
        }
        return;
      }

      monster.setScale(INK_BEHEMOTH.scale);
      if (monster.texture.key !== 'ink_behemoth_walk') {
        monster.setTexture('ink_behemoth_walk', 0);
      }
      if (scene.anims.exists('ink_behemoth_walk_anim') && (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'ink_behemoth_walk_anim')) {
        monster.play('ink_behemoth_walk_anim', true);
      }
    }

    function moveDarkDragonPatrol(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, phase: number, currentTime: number) {
      const camX = scene.cameras.main.scrollX;
      const hoverSeed = monster.getData('hoverSeed') || 0;
      const arenaMid = camX + (SCREEN_WIDTH * 0.5);
      const arenaLeft = camX + 360;
      const arenaRight = camX + SCREEN_WIDTH - 360;
      const sweepRadius = Math.min(DARK_DRAGON.patrolRadius, (SCREEN_WIDTH * 0.5) - 365);
      const targetX = Phaser.Math.Clamp(
        arenaMid + Math.sin((currentTime + hoverSeed) / (phase === 2 ? 230 : 270)) * sweepRadius,
        arenaLeft,
        arenaRight
      );
      const targetY = Phaser.Math.Clamp(
        HORIZON_Y + 70 + Math.cos((currentTime + hoverSeed) / 420) * 26,
        HORIZON_Y + 44,
        FLOOR_BOTTOM - 82
      );
      scene.physics.moveTo(monster, targetX, targetY, getDifficultyScaledSpeed(phase === 2 ? ENCOUNTERS.monsterSpeed.bossRage + 88 : ENCOUNTERS.monsterSpeed.bossChase + 78));
      if (Phaser.Math.Distance.Between(monster.x, monster.y, targetX, targetY) < 26) {
        monster.setVelocity(0);
      }
    }

    function releaseEnemyProjectile(projectile: Phaser.Physics.Arcade.Sprite) {
      if (!projectile || !projectile.active) {
        return;
      }

      const ownerBoss = projectile.getData('ownerBoss') as Phaser.Physics.Arcade.Sprite | undefined;
      if (ownerBoss?.active && ownerBoss.getData('bossVariant') === 'DARK_DRAGON') {
        ownerBoss.setData('activeFireballs', Math.max(0, (ownerBoss.getData('activeFireballs') || 0) - 1));
      }

      projectile.destroy();
    }

    function moveKillinasPatrol(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, phase: number, currentTime: number) {
      const camX = scene.cameras.main.scrollX;
      const hoverSeed = monster.getData('hoverSeed') || 0;
      const arenaLeft = camX + 150;
      const arenaRight = camX + SCREEN_WIDTH - 150;
      const targetX = Phaser.Math.Clamp(
        player.x + Math.sin((currentTime + hoverSeed) / 380) * KILLINAS_DAUGHTER.patrolRadius,
        arenaLeft,
        arenaRight
      );
      const targetY = Phaser.Math.Clamp(
        HORIZON_Y + 86 + Math.cos((currentTime + hoverSeed) / 510) * 18,
        HORIZON_Y + 56,
        FLOOR_BOTTOM - 64
      );
      scene.physics.moveTo(monster, targetX, targetY, getDifficultyScaledSpeed(phase === 2 ? ENCOUNTERS.monsterSpeed.bossRage + 30 : ENCOUNTERS.monsterSpeed.bossChase + 28));
      if (Phaser.Math.Distance.Between(monster.x, monster.y, targetX, targetY) < 18) {
        monster.setVelocity(0);
      }
    }

    function moveVoidRegentPatrol(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, phase: number, currentTime: number) {
      const camX = scene.cameras.main.scrollX;
      const hoverSeed = monster.getData('hoverSeed') || 0;
      const arenaLeft = camX + 120;
      const arenaRight = camX + SCREEN_WIDTH - 120;
      const targetX = Phaser.Math.Clamp(
        camX + SCREEN_WIDTH * 0.55 + Math.sin((currentTime + hoverSeed) / (phase === 2 ? 230 : 310)) * VOID_REGENT.patrolRadius,
        arenaLeft,
        arenaRight
      );
      const targetY = Phaser.Math.Clamp(
        HORIZON_Y + 86 + Math.cos((currentTime + hoverSeed) / 360) * 34,
        HORIZON_Y + 44,
        FLOOR_BOTTOM - 78
      );
      smoothMoveTo(monster, targetX, targetY, getDifficultyScaledSpeed(phase === 2 ? ENCOUNTERS.monsterSpeed.bossRage + 124 : ENCOUNTERS.monsterSpeed.bossChase + 96), 0.18, 24);
    }

    function moveInkBehemothPatrol(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, phase: number, currentTime: number) {
      const camX = scene.cameras.main.scrollX;
      const hoverSeed = monster.getData('hoverSeed') || 0;
      const arenaLeft = camX + 142;
      const arenaRight = camX + SCREEN_WIDTH - 142;
      const targetX = Phaser.Math.Clamp(
        player.x + Math.sin((currentTime + hoverSeed) / (phase === 2 ? 260 : 340)) * INK_BEHEMOTH.patrolRadius,
        arenaLeft,
        arenaRight
      );
      const targetY = Phaser.Math.Clamp(
        HORIZON_Y + 110 + Math.cos((currentTime + hoverSeed) / 430) * 28,
        HORIZON_Y + 62,
        FLOOR_BOTTOM - 74
      );
      smoothMoveTo(monster, targetX, targetY, getDifficultyScaledSpeed(phase === 2 ? ENCOUNTERS.monsterSpeed.bossRage + 58 : ENCOUNTERS.monsterSpeed.bossChase + 44), 0.16, 22);
    }

    function spawnVoidBolt(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, index: number, total: number) {
      if (!monster.active || !player?.active) {
        return;
      }

      const facingDirection = monster.getData('facingRight') ? 1 : -1;
      const muzzleX = monster.x + (facingDirection * 124);
      const muzzleY = monster.y - 96 + ((index % 3) - 1) * 18;
      const projectile = projectiles.create(muzzleX, muzzleY, textureOrFallback(scene, 'void_bolt', 'fallback_powerup'));
      if (!projectile) {
        return;
      }

      const spread = (index - ((total - 1) / 2)) * 0.075;
      const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, player.x, player.y - 12) + spread;
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.setVelocity(Math.cos(angle) * VOID_REGENT.boltSpeed, Math.sin(angle) * VOID_REGENT.boltSpeed);
      projectile.setScale(0.46);
      projectile.setTint(index % 2 === 0 ? 0xd8b4fe : 0xfb7185);
      projectile.setAlpha(0.94);
      projectile.setDepth(monster.y + 8);
      projectile.setData({ expiresAt: scene.time.now + 1550 });
      scene.tweens.add({ targets: projectile, scale: 0.58, alpha: 1, duration: 100, yoyo: true, repeat: 1 });
      sounds.bossShoot();
    }

    function performVoidRegentBarrage(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active || monster.getData('state') === 'DEAD') {
        return;
      }

      const now = scene.time.now;
      const phase = (monster.getData('hp') || 1) <= ((monster.getData('maxHp') || 1) / 2) ? 2 : 1;
      const burstCount = phase === 2 ? VOID_REGENT.burstCount + 3 : VOID_REGENT.burstCount;
      updateBossFacing(monster);
      monster.setVelocity(0, 0);
      monster.setData('intent', phase === 2 ? 'VOID STORM' : 'GRAVITY BARRAGE');
      monster.setData('windupEndsAt', now + VOID_REGENT.windupMs);
      monster.setData('attackEndsAt', now + VOID_REGENT.windupMs + VOID_REGENT.beamMs);
      monster.setData('nextAttackAt', now + VOID_REGENT.attackIntervalMs - (phase === 2 ? 280 : 0));
      setVoidRegentPose(scene, monster, 'ATTACK');
      playMonsterTell(scene, monster.x, monster.y - 88, 'tell_ring', 0.34, VOID_REGENT.windupMs + 180);

      scene.time.delayedCall(VOID_REGENT.windupMs, () => {
        if (!monster.active || monster.getData('state') === 'DEAD') {
          return;
        }
        setVoidRegentPose(scene, monster, 'ATTACK');
        for (let i = 0; i < burstCount; i++) {
          scene.time.delayedCall(i * 115, () => {
            if (monster.active && player?.active && monster.getData('state') !== 'DEAD') {
              updateBossFacing(monster);
              spawnVoidBolt(scene, monster, i, burstCount);
            }
          });
        }
      });
    }

    function spawnDarkDragonFireOrb(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, speed: number) {
      if (!monster.active || !player?.active) {
        return;
      }
      const facingDirection = monster.getData('facingRight') ? 1 : -1;
      const muzzleX = monster.x + (facingDirection * 148);
      const muzzleY = monster.y - 154;
      const muzzleFlash = scene.add.sprite(muzzleX, muzzleY, 'impact_vfx')
        .setScale(0.46)
        .setTint(0xff9f43)
        .setAlpha(0.96)
        .setDepth(monster.y + 6);
      scene.tweens.add({
        targets: muzzleFlash,
        alpha: 0,
        scale: 0.88,
        duration: 140,
        ease: 'Quad.easeOut',
        onComplete: () => muzzleFlash.destroy()
      });

      const projectile = projectiles.create(muzzleX, muzzleY, textureOrFallback(scene, 'boss_fireball', 'fallback_powerup'));
      if (!projectile) {
        return;
      }

      sounds.bossShoot();
      projectile.setScale(0.46);
      projectile.setTint(0xff7a18);
      projectile.setAlpha(0.98);
      projectile.setDepth(monster.y + 5);
      projectile.setData({
        ownerBoss: monster,
        expiresAt: scene.time.now + 1400
      });
      monster.setData('activeFireballs', (monster.getData('activeFireballs') || 0) + 1);
      scene.tweens.add({
        targets: projectile,
        scale: 0.62,
        duration: 140,
        yoyo: true,
        repeat: 1
      });
      scene.physics.moveToObject(projectile, player, speed);
    }

    function performDarkDragonBreath(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active || monster.getData('state') === 'DEAD') {
        return;
      }

      const now = scene.time.now;
      const phase = (monster.getData('hp') || 1) <= ((monster.getData('maxHp') || 1) / 2) ? 2 : 1;
      const volleyCount = phase === 2 ? DARK_DRAGON.phaseTwoFireVolleyCount : DARK_DRAGON.fireVolleyCount;
      const orbSpeed = phase === 2 ? DARK_DRAGON.phaseTwoFireOrbSpeed : DARK_DRAGON.fireOrbSpeed;
      const volleyDurationMs = (volleyCount - 1) * 140;

      updateBossFacing(monster);
      monster.setVelocity(0);
      monster.setData('intent', 'DRAGON BREATH');
      monster.setData('windupEndsAt', now + DARK_DRAGON.windupMs);
      monster.setData('attackEndsAt', now + DARK_DRAGON.windupMs + DARK_DRAGON.breathMs + volleyDurationMs + 1400);
      monster.setData('nextAttackAt', now + DARK_DRAGON.attackIntervalMs);
      monster.setData('activeFireballs', 0);
      setDarkDragonPose(scene, monster, 'WINDUP');
      sounds.growl();
      playMonsterTell(scene, monster.x, monster.y - 86, 'tell_ring', 0.28, DARK_DRAGON.windupMs + 120);

      scene.time.delayedCall(DARK_DRAGON.windupMs, () => {
        if (!monster.active || monster.getData('state') === 'DEAD' || !player?.active) {
          return;
        }
        updateBossFacing(monster);
        setDarkDragonPose(scene, monster, 'BREATH');
        for (let i = 0; i < volleyCount; i++) {
          scene.time.delayedCall(i * 140, () => {
            if (monster && monster.active && monster.getData('state') !== 'DEAD' && player && player.active) {
              updateBossFacing(monster);
              spawnDarkDragonFireOrb(scene, monster, orbSpeed);
            }
          });
        }
      });
    }

    function spawnKillinasBullet(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, spreadRadians: number = 0) {
      if (!monster.active || !player?.active) {
        return;
      }

      const facingRight = !!monster.getData('facingRight');
      const direction = facingRight ? 1 : -1;
      const muzzleX = monster.x + (direction * 92);
      const muzzleY = monster.y - 162;
      const projectile = projectiles.create(muzzleX, muzzleY, textureOrFallback(scene, 'killinas_bullet', 'fallback_powerup'));
      if (!projectile) {
        return;
      }

      const muzzleFlash = scene.add.sprite(muzzleX, muzzleY, 'impact_vfx')
        .setScale(0.34)
        .setTint(0xd8b4fe)
        .setAlpha(0.92)
        .setDepth(monster.y + 5);
      scene.tweens.add({
        targets: muzzleFlash,
        alpha: 0,
        scale: 0.78,
        duration: 120,
        ease: 'Quad.easeOut',
        onComplete: () => muzzleFlash.destroy()
      });

      const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, player.x, player.y - 18) + spreadRadians;
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.setVelocity(
        Math.cos(angle) * KILLINAS_DAUGHTER.bulletSpeed,
        Math.sin(angle) * KILLINAS_DAUGHTER.bulletSpeed
      );
      projectile.setScale(0.36);
      projectile.setTint(0xc4b5fd);
      projectile.setAlpha(0.96);
      projectile.setDepth(monster.y + 4);
      sounds.bossShoot();
    }

    function performKillinasVolley(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active) {
        return;
      }
      const now = scene.time.now;
      updateBossFacing(monster);
      monster.setVelocity(0);
      monster.setData('intent', 'GUNFIRE');
      monster.setData('attackKind', 'GUN');
      monster.setData('windupEndsAt', now + KILLINAS_DAUGHTER.gunWindupMs);
      monster.setData('attackEndsAt', now + KILLINAS_DAUGHTER.gunWindupMs + KILLINAS_DAUGHTER.gunRecoverMs);
      monster.setData('nextAttackAt', now + KILLINAS_DAUGHTER.attackIntervalMs);
      setKillinasPose(scene, monster, 'GUN');
      playMonsterTell(scene, monster.x, monster.y - 84, 'tell_ring', 0.22, KILLINAS_DAUGHTER.gunWindupMs + 120);

      scene.time.delayedCall(KILLINAS_DAUGHTER.gunWindupMs, () => {
        if (!monster.active || monster.getData('state') === 'DEAD' || !player?.active) {
          return;
        }
        setKillinasPose(scene, monster, 'GUN');
        for (let i = 0; i < KILLINAS_DAUGHTER.bulletVolleyCount; i++) {
          scene.time.delayedCall(i * KILLINAS_DAUGHTER.bulletVolleyDelayMs, () => {
            if (monster && monster.active && monster.getData('state') !== 'DEAD' && player && player.active) {
              updateBossFacing(monster);
              setKillinasPose(scene, monster, 'GUN');
              spawnKillinasBullet(scene, monster, Phaser.Math.FloatBetween(-0.08, 0.08));
            }
          });
        }
      });
    }

    function performKillinasAxeStrike(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active) {
        return;
      }
      const now = scene.time.now;
      updateBossFacing(monster);
      monster.setVelocity(0);
      monster.setData('intent', 'AXE SWING');
      monster.setData('attackKind', 'AXE');
      monster.setData('windupEndsAt', now + KILLINAS_DAUGHTER.meleeWindupMs);
      monster.setData('attackEndsAt', now + KILLINAS_DAUGHTER.meleeWindupMs + KILLINAS_DAUGHTER.meleeRecoverMs);
      monster.setData('nextAttackAt', now + KILLINAS_DAUGHTER.attackIntervalMs - 200);
      setKillinasPose(scene, monster, 'AXE');
      playMonsterTell(scene, monster.x, monster.y - 56, 'tell_ring', 0.24, KILLINAS_DAUGHTER.meleeWindupMs + 100);

      scene.time.delayedCall(KILLINAS_DAUGHTER.meleeWindupMs, () => {
        if (!monster.active || monster.getData('state') === 'DEAD' || !player?.active) {
          return;
        }
        updateBossFacing(monster);
        setKillinasPose(scene, monster, 'AXE');
        const impact = scene.add.sprite(player.x, player.y - 26, 'impact_vfx')
          .setScale(0.62)
          .setTint(0xe9d5ff)
          .setAlpha(0.96)
          .setDepth(player.y + 6);
        scene.tweens.add({
          targets: impact,
          alpha: 0,
          scale: 1.18,
          duration: 180,
          ease: 'Cubic.easeOut',
          onComplete: () => impact.destroy()
        });
        if (!playerInvulnerable && jumpZ < 30 && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < KILLINAS_DAUGHTER.meleeRange + 36) {
          takePlayerDamage(scene, 18);
        }
      });
    }

    function spawnInkBehemothSpit(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, index: number, total: number) {
      if (!monster.active || !player?.active) {
        return;
      }

      const facingDirection = monster.getData('facingRight') ? 1 : -1;
      const muzzleX = monster.x + (facingDirection * 112);
      const muzzleY = monster.y - 94 + ((index % 2) * 16);
      const projectile = projectiles.create(muzzleX, muzzleY, textureOrFallback(scene, 'ink_boss_spit', 'fallback_powerup'));
      if (!projectile) {
        return;
      }

      const spread = (index - ((total - 1) / 2)) * 0.095;
      const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, player.x, player.y - 10) + spread;
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.setVelocity(Math.cos(angle) * INK_BEHEMOTH.spitSpeed, Math.sin(angle) * INK_BEHEMOTH.spitSpeed);
      projectile.setScale(0.46);
      projectile.setTint(index % 2 === 0 ? 0x111827 : 0xbe185d);
      projectile.setAlpha(0.98);
      projectile.setDepth(monster.y + 6);
      projectile.setData({ expiresAt: scene.time.now + 1750 });
      scene.tweens.add({ targets: projectile, scale: 0.58, duration: 120, yoyo: true, repeat: 1 });
      sounds.bossShoot();
    }

    function performInkBehemothAttack(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.active || !player?.active || monster.getData('state') === 'DEAD') {
        return;
      }

      const now = scene.time.now;
      const phase = (monster.getData('hp') || 1) <= ((monster.getData('maxHp') || 1) / 2) ? 2 : 1;
      const isShockwave = phase === 2 && Phaser.Math.Between(0, 1) === 0;
      updateBossFacing(monster);
      monster.setVelocity(0, 0);
      monster.setData('intent', isShockwave ? 'SHOCKWAVE' : 'INK SPIT');
      monster.setData('windupEndsAt', now + INK_BEHEMOTH.windupMs);
      monster.setData('attackEndsAt', now + INK_BEHEMOTH.windupMs + (isShockwave ? 720 : 960));
      monster.setData('nextAttackAt', now + INK_BEHEMOTH.attackIntervalMs - (phase === 2 ? 300 : 0));
      setInkBehemothPose(scene, monster, 'ATTACK');
      sounds.growl();
      playMonsterTell(scene, monster.x, monster.y - 66, 'tell_ring', 0.26, INK_BEHEMOTH.windupMs + 140);

      scene.time.delayedCall(INK_BEHEMOTH.windupMs, () => {
        if (!monster.active || monster.getData('state') === 'DEAD' || !player?.active) {
          return;
        }
        updateBossFacing(monster);
        setInkBehemothPose(scene, monster, 'ATTACK');
        if (isShockwave) {
          scene.cameras.main.shake(360, 0.008);
          const ring = scene.add.graphics().setDepth(monster.y + 3);
          scene.tweens.add({
            targets: ring,
            alpha: 0,
            duration: 620,
            onUpdate: (tween) => {
              const radius = tween.getValue() * INK_BEHEMOTH.quakeRadius;
              ring.clear().lineStyle(10, 0x111827, 0.6 - tween.getValue()).strokeCircle(monster.x, monster.y, radius);
              if (player && player.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < radius + 10 && jumpZ === 0 && !playerInvulnerable) {
                takePlayerDamage(scene, getDifficultyScaledDamage(13));
              }
            },
            onComplete: () => ring.destroy()
          });
          return;
        }

        const spitCount = phase === 2 ? INK_BEHEMOTH.spitCount + 2 : INK_BEHEMOTH.spitCount;
        for (let i = 0; i < spitCount; i++) {
          scene.time.delayedCall(i * 135, () => {
            if (monster.active && player?.active && monster.getData('state') !== 'DEAD') {
              updateBossFacing(monster);
              spawnInkBehemothSpit(scene, monster, i, spitCount);
            }
          });
        }
      });
    }

    function performGiantQuake(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
      scene.cameras.main.shake(220, 0.006);
      const quake = scene.add.image(monster.x, monster.y + 10, 'giant_quake').setScale(0.34).setAlpha(0.94).setDepth(monster.y + 2);
      scene.tweens.add({ targets: quake, scale: 0.92, alpha: 0, duration: 340, ease: 'Cubic.easeOut', onComplete: () => quake.destroy() });
      if (!playerInvulnerable && jumpZ === 0 && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < 165) {
        takePlayerDamage(scene, 14);
      }
      destructibles.getChildren().forEach((d) => {
        const item = d as Phaser.Physics.Arcade.Sprite;
        if (item && item.active && Phaser.Math.Distance.Between(monster.x, monster.y, item.x, item.y) < 155) {
          damageDestructible(scene, item, 1);
        }
      });
    }

    function showSectionCard(scene: Phaser.Scene, title: string, subtitle: string, duration: number = 1050) {
      const titleText = sectionCardOverlay.getAt(1) as Phaser.GameObjects.Text;
      const subtitleText = sectionCardOverlay.getAt(2) as Phaser.GameObjects.Text;
      titleText.setText(title);
      subtitleText.setText(subtitle);
      scene.tweens.killTweensOf(sectionCardOverlay);
      sectionCardOverlay.setVisible(true).setAlpha(0).setY(-10);
      scene.tweens.add({
        targets: sectionCardOverlay,
        alpha: SECTION_CARD_OPACITY,
        y: 0,
        duration: 160,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: sectionCardOverlay,
              alpha: 0,
              y: -18,
              duration: 190,
              onComplete: () => sectionCardOverlay.setVisible(false).setY(0)
            });
          });
        }
      });
    }

    function pulseFeedbackFlash(scene: Phaser.Scene, color: number, alpha: number, duration: number) {
      feedbackFlash.setFillStyle(color, alpha).setAlpha(alpha);
      scene.tweens.add({
        targets: feedbackFlash,
        alpha: 0,
        duration,
        ease: 'Quad.easeOut'
      });
    }

    function getWavePlan(sectionIndex: number) {
      const levelProfile = LEVEL_PROFILES[getLevelKey(currentLevel)];
      return levelProfile.wavePlans[Math.min(sectionIndex, levelProfile.wavePlans.length - 1)];
    }

    function getWaveMonsterType(sectionIndex: number, spawnSlot: number): MonsterType {
      const wavePlan = getWavePlan(sectionIndex);
      const supportCount = wavePlan.supportEnemies.length;
      const isSupportSlot =
        wavePlan.supportSlots.includes(spawnSlot) ||
        (spawnSlot >= wavePlan.baseCount && supportCount > 0 && spawnSlot % 2 === 1);

      if (!isSupportSlot || supportCount === 0) {
        return wavePlan.primaryEnemy;
      }

      const supportIndex = wavePlan.supportSlots.indexOf(spawnSlot);
      const cycleIndex = supportIndex >= 0 ? supportIndex : spawnSlot;
      return wavePlan.supportEnemies[cycleIndex % supportCount];
    }

    function shouldSpawnFromRear(sectionIndex: number, spawnSlot: number) {
      const wavePlan = getWavePlan(sectionIndex);
      return wavePlan.rearSlots.includes(spawnSlot) || (spawnSlot > wavePlan.baseCount && spawnSlot % 3 === 0);
    }

    function getMonsterVisual(type: MonsterType) {
      if (type === 'ALIEN') return { texture: 'm_alien_walk', useAnim: true, scale: 0.54, animKey: 'm_alien_walk_anim' };
      if (type === 'GHOST') return { texture: 'm_ghost', useAnim: false, scale: GHOST_FLOAT.scale };
      if (type === 'DASHER') return { texture: 'm_dasher_walk', useAnim: true, scale: 0.5, animKey: 'm_dasher_walk_anim' };
      if (type === 'DEVIL') return { texture: 'moonlight_terror_walk', useAnim: true, scale: 0.33, animKey: 'moonlight_terror_walk_anim' };
      if (type === 'COSMIC_GRUNT') return { texture: 'cosmic_grunt_walk', useAnim: true, scale: 0.26, animKey: 'cosmic_grunt_walk_anim' };
      if (type === 'GIANT') return { texture: 'm_giant_walk', useAnim: true, scale: 0.54, animKey: 'm_giant_walk_anim' };
      if (type === 'FLOATER') return { texture: 'spider_walk', useAnim: true, scale: 0.31, animKey: 'spider_walk_anim' };
      return { texture: 'grunt_walking', useAnim: true, scale: 0.24, animKey: 'grunt_walk' };
    }

    function getMonsterClass(type: MonsterType): EnemyClass {
      if (type === 'FLOATER') return 'JUMPER';
      if (type === 'ALIEN' || type === 'GHOST') return 'LONG_RANGE';
      return 'MELEE';
    }

    function getMonsterBaseHp(type: MonsterType) {
      if (type === 'ALIEN') return 8;
      if (type === 'GHOST') return 5;
      if (type === 'GIANT') return 17;
      if (type === 'DEVIL') return 11;
      if (type === 'COSMIC_GRUNT') return 9;
      if (type === 'DASHER') return 5;
      if (type === 'FLOATER') return 6;
      return 6;
    }

    function getDifficultyScaledEnemyHp(baseHp: number) {
      return Math.max(1, Math.round(baseHp * difficultyTuning.enemyHpMultiplier));
    }

    function getDifficultyScaledBossHp(baseHp: number) {
      return Math.max(1, Math.round(baseHp * difficultyTuning.bossHpMultiplier));
    }

    function getDifficultyScaledSpeed(baseSpeed: number) {
      return baseSpeed * difficultyTuning.enemySpeedMultiplier;
    }

    function getDifficultyScaledDamage(baseDamage: number) {
      const multiplier = difficulty === 'EASY' ? 0.82 : difficulty === 'HARD' ? 1 : 1.18;
      return Math.max(1, Math.round(baseDamage * multiplier));
    }

    function smoothMoveTo(
      sprite: Phaser.Physics.Arcade.Sprite,
      targetX: number,
      targetY: number,
      speed: number,
      response: number = 0.15,
      arriveRadius: number = 18
    ) {
      if (!sprite.active) {
        return;
      }

      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY);
      if (distance <= arriveRadius) {
        body.setVelocity(
          Phaser.Math.Linear(body.velocity.x, 0, response * 1.4),
          Phaser.Math.Linear(body.velocity.y, 0, response * 1.4)
        );
        return;
      }

      const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, targetX, targetY);
      body.setVelocity(
        Phaser.Math.Linear(body.velocity.x, Math.cos(angle) * speed, response),
        Phaser.Math.Linear(body.velocity.y, Math.sin(angle) * speed, response)
      );
    }

    function syncMonsterWalkRate(monster: Phaser.Physics.Arcade.Sprite) {
      if (!monster.anims?.currentAnim) {
        return;
      }

      const body = monster.body as Phaser.Physics.Arcade.Body;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      monster.anims.timeScale = Phaser.Math.Clamp(speed / 130, 0.74, 1.42);
    }

    function setGhostPose(monster: Phaser.Physics.Arcade.Sprite, pose: 'FLOAT' | 'ATTACK') {
      if (!monster?.active) {
        return;
      }

      const desiredTexture = currentLevel === 2 && pose === 'ATTACK' && monster.scene.textures.exists('m_ghost_attack')
        ? 'm_ghost_attack'
        : 'm_ghost';

      if (monster.texture.key !== desiredTexture) {
        monster.setTexture(desiredTexture);
      }

      monster.setScale(GHOST_FLOAT.scale).setOrigin(0.5, 0.84);
    }

    function updateBossHudDisplay(boss?: Phaser.Physics.Arcade.Sprite | null) {
      if (!boss || !boss.active || boss.getData('state') === 'DEAD') {
        bossHud.setVisible(false).setAlpha(0);
        return;
      }

      const hp = boss.getData('hp') || 0;
      const maxHp = boss.getData('maxHp') || 1;
      const intent = boss.getData('intent') || 'STALKING';
      const bossName = boss.getData('bossName') || 'INK BEHEMOTH';
      const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);

      bossHud.setVisible(true).setAlpha(1);
      bossLabelText.setText(bossName);
      bossBarFill.width = 204 * pct;
      bossIntentText.setText(`Intent: ${intent}`);
      bossIntentText.setColor(
        intent === 'SHOCKWAVE' ? '#fde68a'
          : intent === 'DRAGON BREATH' ? '#fdba74'
          : intent === 'GUNFIRE' ? '#c4b5fd'
          : intent === 'AXE SWING' || intent === 'AXE RANGE' ? '#fca5a5'
          : intent === 'GRAVITY BARRAGE' || intent === 'RIFT CHARGE' || intent === 'VOID STORM' ? '#c084fc'
          : intent === 'INK SPIT' ? '#fecdd3'
          : '#ddd6fe'
      );
    }

    function showBossWarning(scene: Phaser.Scene, title: string = 'INK BEHEMOTH') {
      pulseFeedbackFlash(scene, 0xf59e0b, 0.12, 220);
      const banner = scene.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80, 'boss_warning').setScrollFactor(0).setDepth(22000).setScale(0.3).setAlpha(0);
      const warning = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80, title, {
        fontFamily: 'Gochi Hand', fontSize: '64px', color: '#1f2937', stroke: '#ffffff', strokeThickness: 10
      }).setOrigin(0.5).setScrollFactor(0).setDepth(22001).setAlpha(0);
      scene.tweens.add({
        targets: [banner, warning],
        alpha: 1,
        scale: 0.96,
        duration: 220,
        onComplete: () => {
          scene.time.delayedCall(900, () => {
            scene.tweens.add({
              targets: [banner, warning],
              alpha: 0,
              y: '-=26',
              duration: 240,
              onComplete: () => {
                banner.destroy();
                warning.destroy();
              }
            });
          });
        }
      });
    }

    function setSectionBackground(scene: Phaser.Scene, sectionIndex: number) {
      if (!backgroundStrip) {
        return;
      }
    }

    function triggerSectionWave(scene: Phaser.Scene) {
      isFightingWave = true;
      pendingWaveSpawns = 0;
      const camX = scene.cameras.main.scrollX;
      scene.physics.world.setBounds(camX, WALK_ZONE_TOP, SCREEN_WIDTH, WALK_ZONE_BOTTOM - WALK_ZONE_TOP);
      const levelCards = LEVEL_PROFILES[getLevelKey(currentLevel)].sectionCards;
      const activeCard = levelCards[Math.min(currentSectionIndex, levelCards.length - 1)];
      setSectionBackground(scene, currentSectionIndex);
      showSectionCard(scene, activeCard.title, activeCard.subtitle);
      if (currentSectionIndex === fightSections.length - 1) spawnBoss(scene);
      else {
        spawnSectionEncounterProps(scene, currentSectionIndex, camX);
        const wavePlan = getWavePlan(currentSectionIndex);
        const chapterPressureBonus = currentLevel >= 3 ? 1 : 0;
        const count = Math.max(
          2,
          wavePlan.baseCount + chapterPressureBonus + difficultyTuning.extraWaveMonsters
        );
        const waveLeadInMs = 560;
        for (let i = 0; i < count; i++) {
          pendingWaveSpawns++;
          scene.time.delayedCall(waveLeadInMs + (i * wavePlan.staggerMs), () => {
            pendingWaveSpawns = Math.max(0, pendingWaveSpawns - 1);
            spawnWaveMonster(scene, currentSectionIndex, i);
          });
        }
      }
    }

    function spawnWaveMonster(scene: Phaser.Scene, sectionIndex: number, waveSlot: number) {
      if (!isFightingWave) {
        return;
      }

      const camX = scene.cameras.main.scrollX;
      const fromRear = shouldSpawnFromRear(sectionIndex, waveSlot);
      const spawnX = fromRear ? camX + 48 : camX + SCREEN_WIDTH - 48;
      const y = Phaser.Math.Between(HORIZON_Y + 20, FLOOR_BOTTOM - 20);
      const type = getWaveMonsterType(sectionIndex, waveSlot);
      const visual = getMonsterVisual(type);
      let hp = getDifficultyScaledEnemyHp(getMonsterBaseHp(type));
      if (currentLevel > 1) hp = Math.floor(hp * (1.08 + (currentLevel * 0.08)));

      const m = monsters.create(spawnX, y, textureOrFallback(scene, visual.texture, 'fallback_enemy'));
      if (m) {
        m.setData({
          type,
          hp,
          maxHp: hp,
          timer: 0,
          state: type === 'GHOST' ? 'FLOAT' : 'CHASE',
          nextAction: type === 'GHOST' ? GHOST_FLOAT.attackLeadFrames + (waveSlot * 20) : 60 + (waveSlot * 15),
          stateUntil: 0,
          spawnSide: fromRear ? 'rear' : 'front',
          swoopFromLeft: fromRear,
          swoopTargetX: spawnX,
          swoopTargetY: y,
          enemyClass: getMonsterClass(type),
          baseFacing: getMonsterBaseFacing(type),
          facingRight: false,
          isPrimaryWaveEnemy: type === getWavePlan(sectionIndex).primaryEnemy
        }).setCollideWorldBounds(true);
        if (type === 'FLOATER') {
          m.setScale(visual.scale).setTint(0xffffff).setOrigin(0.5, 0.78);
          m.setSize(320, 150);
          m.setOffset(120, 320);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (type === 'GHOST') {
          m.setScale(visual.scale).setOrigin(0.5, 0.84);
          m.setFlipX(fromRear);
          m.setAlpha(0.78);
          m.setSize(210, 220);
          m.setOffset(164, 172);
          setGhostPose(m, 'FLOAT');
        } else if (type === 'ALIEN') {
          m.setScale(visual.scale).setOrigin(0.5, 0.86);
          m.setSize(118, 130);
          m.setOffset(82, 96);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (type === 'DASHER') {
          m.setScale(visual.scale).setOrigin(0.5, 0.86);
          m.setSize(132, 122);
          m.setOffset(74, 112);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (type === 'GIANT') {
          m.setScale(visual.scale).setOrigin(0.5, 0.92);
          m.setSize(168, 260);
          m.setOffset(96, 124);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (type === 'DEVIL') {
          m.setScale(visual.scale).setOrigin(0.5, 0.9);
          m.setFlipX(!fromRear);
          m.setSize(180, 220);
          m.setOffset(190, 320);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (type === 'COSMIC_GRUNT') {
          m.setScale(visual.scale).setOrigin(0.5, 0.9);
          m.setFlipX(!fromRear);
          m.setSize(230, 360);
          m.setOffset(142, 220);
          if (visual.animKey) {
            m.play(visual.animKey);
          }
        } else if (visual.useAnim) {
          m.setScale(visual.scale).setOrigin(0.5, 0.9);
          m.setFlipX(!fromRear);
          m.setSize(230, 360);
          m.setOffset(142, 220);
          const animToPlay = visual.animKey ?? 'grunt_walk';
          if (scene.anims.exists(animToPlay)) {
            m.play(animToPlay);
          }
        } else {
          m.setScale(visual.scale);
          m.setFlipX(fromRear);
        }
        updateMonsterFacing(m);
        playSpawnBurst(scene, m.x, m.y);
      }
    }

    function spawnBoss(scene: Phaser.Scene) {
      sounds.growl();
      const camX = scene.cameras.main.scrollX;
      const isDarkDragonBoss = currentLevel === 1 && scene.textures.exists('dark_dragon_walk');
      const isKillinasBoss = currentLevel === 2 && scene.textures.exists('killinas_daughter_walk');
      const isInkBehemothBoss = currentLevel === 3 && scene.textures.exists('ink_behemoth_walk');
      const isVoidRegentBoss = currentLevel === 4 && scene.textures.exists('void_regent_walk');
      spawnSectionEncounterProps(scene, 2, camX + 140);
      placeStreetDressing(scene, { texture: 'd_lamp', x: camX + 180, y: FLOOR_BOTTOM - 4, scale: 1.06, alpha: 0.9, depthOffset: -18 });
      placeStreetDressing(scene, { texture: 'd_lamp', x: camX + SCREEN_WIDTH - 120, y: FLOOR_BOTTOM - 4, scale: 1.06, alpha: 0.9, depthOffset: -18 });
      placeStreetDressing(scene, { texture: 'd_poster', x: camX + 520, y: HORIZON_Y + 74, scale: 0.9, alpha: 0.95, originY: 0.5, angle: -2, depthOffset: -88 });
      const bossName = isDarkDragonBoss ? 'DARK DRAGON' : isKillinasBoss ? "KILLINA'S DAUGHTER" : isVoidRegentBoss ? 'VOID REGENT' : 'INK BEHEMOTH';
      const bossTexture = isDarkDragonBoss ? 'dark_dragon_walk' : isKillinasBoss ? 'killinas_daughter_walk' : isVoidRegentBoss ? 'void_regent_walk' : isInkBehemothBoss ? 'ink_behemoth_walk' : 'm_boss';
      showBossWarning(scene, bossName);
      const bossStartX = isDarkDragonBoss ? camX + 620 : camX + 800;
      const boss = monsters.create(bossStartX, (HORIZON_Y + FLOOR_BOTTOM) / 2, textureOrFallback(scene, bossTexture, 'fallback_boss'));
      if (boss) {
        const bossHp = getDifficultyScaledBossHp(currentLevel === 1 ? 40 : currentLevel === 2 ? 56 : currentLevel === 3 ? 72 : 104);
        const baseScale = isDarkDragonBoss ? DARK_DRAGON.scale : isKillinasBoss ? KILLINAS_DAUGHTER.scale : isVoidRegentBoss ? VOID_REGENT.scale : isInkBehemothBoss ? INK_BEHEMOTH.scale : currentLevel === 3 ? 4.1 : 3.5;
        boss.setScale(baseScale).setData({
          type: 'BOSS',
          hp: bossHp,
          maxHp: bossHp,
          timer: 0,
          phase: 1,
          iframe: false,
          state: 'CHASE',
          bossVariant: isDarkDragonBoss ? 'DARK_DRAGON' : isKillinasBoss ? 'KILLINAS_DAUGHTER' : isVoidRegentBoss ? 'VOID_REGENT' : 'INK_BEHEMOTH',
          bossName,
          nextAttackAt: scene.time.now + 1600,
          windupEndsAt: 0,
          attackEndsAt: 0,
          attackKind: null,
          facingRight: false,
          activeFireballs: 0,
          hoverSeed: Phaser.Math.Between(0, 2000),
          baseFacing: isKillinasBoss ? 'right' : 'left'
        });
        boss.setCollideWorldBounds(true).setTint(currentLevel === 3 ? 0xffd4d4 : currentLevel === 2 ? 0xdbeafe : 0xcccccc);
        if (isDarkDragonBoss) {
          boss.clearTint();
          updateBossFacing(boss);
          setDarkDragonPose(scene, boss, 'WALK');
        } else if (isKillinasBoss) {
          boss.clearTint();
          updateBossFacing(boss);
          setKillinasPose(scene, boss, 'WALK');
        } else if (isVoidRegentBoss) {
          boss.clearTint();
          updateBossFacing(boss);
          setVoidRegentPose(scene, boss, 'WALK');
        } else if (isInkBehemothBoss) {
          boss.clearTint();
          updateBossFacing(boss);
          setInkBehemothPose(scene, boss, 'WALK');
        }
      }
      // Spawn health pickups and souls in the boss arena so the player can recover
      for (let i = 0; i < 2; i++) spawnHealth(scene, camX + 200 + i * 300, Phaser.Math.Between(HORIZON_Y + 30, FLOOR_BOTTOM - 30));
      for (let i = 0; i < 4; i++) spawnSoul(scene, camX + 150 + i * 200);
    }

    function performSlamImpact(scene: Phaser.Scene) {
      sounds.slam();
      scene.cameras.main.shake(300, 0.015);
      const ring = scene.add.image(player.x, player.y + 6, 'slam_wave').setDepth(player.y).setScale(0.3).setAlpha(0.95);
      scene.tweens.add({ targets: ring, scale: 1.45, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      const slamRadius = 150;
      monsters.getChildren().forEach(m => { const monster = m as Phaser.Physics.Arcade.Sprite; if (monster && monster.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < slamRadius) takeMonsterDamage(scene, monster, 3); });
      destructibles.getChildren().forEach(d => { const item = d as Phaser.Physics.Arcade.Sprite; if (item && item.active && Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y) < slamRadius) damageDestructible(scene, item, 2); });
    }

    function getPlayerAttackDamage() {
      const gravityBonus = gravityCoreUnlocked ? GRAVITY_CORE.damageBonus : 0;
      let baseDamage = 1;
      if (isXGod) baseDamage = hasFlameSword ? 3 : 1;
      else if (!characterPowerUnlocked) baseDamage = 1;
      else if (selectedCharacterId === 'barrett') baseDamage = 4;
      else if (selectedCharacterId === 'nico') baseDamage = 2;
      else if (selectedCharacterId === 'ezra') baseDamage = 3;
      else baseDamage = 3;
      return Math.max(1, Math.round(baseDamage * playstyle.attackDamageMultiplier) + gravityBonus);
    }

    function firePlayableProjectile(scene: Phaser.Scene, damage: number, speed: number) {
      if (isXGod || !player?.active) return;
      const projectileTexture = scene.textures.exists('character_projectile_anim') ? 'character_projectile_anim' : textureOrFallback(scene, 'character_projectile', 'fallback_powerup');
      const shot = allyProjectiles.create(player.x + facingDirection * 74, player.y - 72 - jumpZ, projectileTexture);
      if (!shot) return;
      const projectileScale = scene.textures.exists('character_projectile_anim')
        ? (selectedCharacterId === 'nico' ? 0.5 : 0.46)
        : 0.42;
      shot.setScale(facingDirection === 1 ? projectileScale : -projectileScale, projectileScale);
      shot.setAlpha(0.96).setDepth(player.y + 12);
      shot.setData({ spent: false, expiresAt: scene.time.now + 1700, damage: Math.max(1, Math.round(damage * playstyle.attackDamageMultiplier)) });
      (shot.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      if (scene.anims.exists('character_projectile_fly')) {
        shot.anims.play('character_projectile_fly', true);
      }
      shot.setVelocityX(facingDirection * speed * (selectedCharacterId === 'teleportation_c' ? 1.08 : 1));
      shot.setVelocityY(selectedCharacterId === 'ezra' ? -24 : 0);
      const burst = scene.add.image(player.x + facingDirection * 56, player.y - 72 - jumpZ, textureOrFallback(scene, 'character_burst', 'fallback_powerup'))
        .setScale(facingDirection === 1 ? 0.28 : -0.28, 0.28)
        .setAlpha(0.85)
        .setDepth(player.y + 14);
      scene.tweens.add({ targets: burst, scaleX: facingDirection === 1 ? 0.72 : -0.72, scaleY: 0.72, alpha: 0, duration: 180, onComplete: () => burst.destroy() });
    }

    function triggerPlayableTeleportStrike(scene: Phaser.Scene) {
      const target = getNearestActiveMonster(player.x, player.y);
      if (!target) return;
      const side = target.x >= player.x ? -1 : 1;
        player.setPosition(target.x + side * 118, Phaser.Math.Clamp(target.y - 6, WALK_ZONE_TOP, FLOOR_BOTTOM - 20));
        facingDirection = side === -1 ? 1 : -1;
        playableTeleportStrikeDepthUntil = scene.time.now + 520;
        player.setDepth(player.y + 24);
      const portal = scene.add.image(target.x, target.y - 60, textureOrFallback(scene, 'character_special', 'fallback_powerup'))
        .setScale(0.5)
        .setAlpha(0.88)
        .setDepth(target.y + 20);
      scene.tweens.add({ targets: portal, scale: 1.25, alpha: 0, angle: 180, duration: 360, onComplete: () => portal.destroy() });
      const slash = scene.add.image(player.x + facingDirection * 42, player.y - 74, textureOrFallback(scene, 'character_burst', 'fallback_powerup'))
        .setScale(facingDirection === 1 ? 0.34 : -0.34, 0.34)
        .setAlpha(0.9)
        .setDepth(player.y + 28);
      scene.tweens.add({ targets: slash, scaleX: facingDirection === 1 ? 0.82 : -0.82, scaleY: 0.82, alpha: 0, duration: 260, onComplete: () => slash.destroy() });
      takeMonsterDamage(scene, target, getPlayerAttackDamage() + 2);
      setPlayerInvulnerableUntil(scene.time.now + 520);
    }

    function triggerCharacterDashSpecial(scene: Phaser.Scene, currentTime: number) {
      if (isXGod || !characterPowerUnlocked || currentTime < nextCharacterSpecialAt) return false;
      nextCharacterSpecialAt = currentTime + playstyle.specialCooldownMs;
      if (selectedCharacterId === 'barrett') {
        const roar = scene.add.image(player.x, player.y - 60, textureOrFallback(scene, 'character_special', 'fallback_powerup'))
          .setScale(0.2)
          .setAlpha(0.72)
          .setDepth(player.y + 8);
        scene.tweens.add({ targets: roar, scale: 1.35, alpha: 0, duration: 420, onComplete: () => roar.destroy() });
        monsters.getChildren().forEach((m) => {
          const monster = m as Phaser.Physics.Arcade.Sprite;
          if (monster.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < 190) {
            monster.setVelocity(0, 0);
            monster.setData('stateUntil', currentTime + 520);
            takeMonsterDamage(scene, monster, 1);
          }
        });
      } else if (selectedCharacterId === 'teleportation_c') {
        triggerPlayableTeleportStrike(scene);
      } else if (selectedCharacterId === 'nico') {
        firePlayableProjectile(scene, 4, 520);
      } else if (selectedCharacterId === 'ezra') {
        const aura = scene.add.image(player.x, player.y - 60, textureOrFallback(scene, 'character_special', 'fallback_powerup'))
          .setScale(0.4)
          .setAlpha(0.68)
          .setDepth(player.y + 6);
        scene.tweens.add({ targets: aura, scale: 1.6, alpha: 0, duration: 520, onComplete: () => aura.destroy() });
        monsters.getChildren().forEach((m) => {
          const monster = m as Phaser.Physics.Arcade.Sprite;
          if (monster.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < 175) {
            takeMonsterDamage(scene, monster, 2);
          }
        });
      }
      return true;
    }

    function update(this: Phaser.Scene) {
      const scene = this;
      const currentTime = scene.time.now;
      if (Phaser.Input.Keyboard.JustDown(pauseKey)) onTogglePause();

      if (!player || !player.active) return;

      if (isDashing && dashEndsAt > 0 && currentTime >= dashEndsAt) {
        endPlayerDash();
      }

      if (isAttacking && attackEndsAt > 0 && currentTime >= attackEndsAt) {
        endPlayerAttack();
      }

      if (playerInvulnerable && invulnerabilityEndsAt > 0 && currentTime >= invulnerabilityEndsAt && !isDazed) {
        clearPlayerInvulnerability();
      }

      if (isDazed) {
        if (gameOverRestartAt > 0 && currentTime >= gameOverRestartAt) {
          completeGameOver(scene);
          return;
        }

        if (dazedRecoveryAt > 0 && currentTime >= dazedRecoveryAt) {
          completeRespawn();
        }
      }

      if (isPausedRef.current || isLevelTransitioning || isSwordRewardSequenceActive || isDazed) { if (player && player.active) player.setVelocity(0); return; }

      if (shieldUnlocked && !inkShieldReady && currentTime >= shieldRechargeAt) {
        inkShieldReady = true;
        pulseFeedbackFlash(scene, 0x93c5fd, 0.08, 140);
        syncPowerupStats();
      }

      const teleportHolding = teleportHangUntil > currentTime;
      if (teleportHangUntil > 0 && currentTime >= teleportHangUntil) {
        teleportHangUntil = 0;
        isSlamming = true;
        jumpVelocity = FEEL.slamVelocity;
        pulseFeedbackFlash(scene, 0x93c5fd, 0.12, 180);
      }

      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      const touchControls = testWindow.__unknownUniverseTouchControls ?? {};
      const touchAttackDown = Boolean(touchControls.attack);
      const touchJumpDown = Boolean(touchControls.jump);
      const touchDashDown = Boolean(touchControls.dash);
      const touchAttackJustDown = touchAttackDown && !previousTouchAttack;
      const touchJumpJustDown = touchJumpDown && !previousTouchJump;
      const touchDashJustDown = touchDashDown && !previousTouchDash;
      previousTouchAttack = touchAttackDown;
      previousTouchJump = touchJumpDown;
      previousTouchDash = touchDashDown;
      const mR = cursors.right.isDown || Boolean(touchControls.right);
      const mL = cursors.left.isDown || Boolean(touchControls.left);
      const mU = cursors.up.isDown || Boolean(touchControls.up);
      const mD = cursors.down.isDown || Boolean(touchControls.down);
      const curSpeed = (isDashing ? FEEL.moveSpeed * FEEL.dashMultiplier : FEEL.moveSpeed) * playstyle.speedMultiplier;
      let targetVelocityX = 0;
      let targetVelocityY = 0;
      if (!teleportHolding) {
        if (mL) { targetVelocityX = -curSpeed; facingDirection = -1; }
        else if (mR) { targetVelocityX = curSpeed; facingDirection = 1; }
        if (mU) targetVelocityY = -curSpeed * FEEL.verticalRatio; else if (mD) targetVelocityY = curSpeed * FEEL.verticalRatio;
      }
      playerBody.setVelocityX(Phaser.Math.Linear(playerBody.velocity.x, targetVelocityX, FEEL.moveResponse));
      playerBody.setVelocityY(Phaser.Math.Linear(playerBody.velocity.y, targetVelocityY, FEEL.moveResponse));
      if (!teleportHolding && (mR || mL || mU || mD)) lastMovementTime = currentTime;

      const defaultWalkTexture = !isXGod && scene.textures.exists('character_walk') ? 'character_walk' : (playerSprite ? 'player_walk' : 'player_walk_internal');
      const swordWalkAvailable = isXGod && hasFlameSword && scene.textures.exists('player_sword_walk') && scene.anims.exists('sword_walk');
      const hasAnims = scene.anims.exists('walk') || scene.anims.exists('sword_walk');
      if (hasAnims && player.anims) {
        player.setFlipX(facingDirection === -1);
        if (isJumping) {
          if (isSlamming) {
            player.anims.stop();
            player.setTexture(!isXGod && scene.textures.exists('character_jump') ? 'character_jump' : 'player_buttbomb');
          } else {
            player.setTexture(!isXGod && scene.textures.exists('character_jump') ? 'character_jump' : 'player_jump');
          }
        } else if (isDashing) {
          if (!isXGod && scene.textures.exists('character_dash')) player.setTexture('character_dash');
          else player.setTexture('player_dash');
          player.anims.play('dash', true);
        } else if (isAttacking || (selectedCharacterId === 'barrett' && currentTime < playerAttackVisualHoldUntil)) {
          if (!isXGod && scene.textures.exists('character_attack')) {
            if (selectedCharacterId === 'barrett') {
              player.anims.stop();
              player.setTexture('character_attack', 4);
            } else {
              player.setTexture('character_attack');
              player.anims.play('character_attack_anim', true);
            }
          } else if (hasFlameSword && scene.textures.exists('player_sword_attack')) {
            player.anims.stop();
            player.setTexture('player_sword_attack', SWORD_COMBO_FRAMES[swordComboStep]);
          } else {
            player.anims.stop();
            player.setTexture('player_attack');
          }
        } else if (Math.abs(playerBody.velocity.x) > 8 || Math.abs(playerBody.velocity.y) > 8) {
          const walkTexture = swordWalkAvailable ? 'player_sword_walk' : defaultWalkTexture;
          const walkAnim = swordWalkAvailable ? 'sword_walk' : 'walk';
          if (player.texture.key !== walkTexture) {
            player.setTexture(walkTexture);
          }
          player.anims.play(walkAnim, true);
          const walkSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.y);
          player.anims.timeScale = isDashing ? 2.5 : Phaser.Math.Clamp(walkSpeed / FEEL.moveSpeed, 0.72, 1.18);
        } else {
          const idleTexture = swordWalkAvailable ? 'player_sword_walk' : defaultWalkTexture;
          const idleAnim = swordWalkAvailable ? 'sword_idle' : 'idle';
          if (player.texture.key !== idleTexture) {
            player.setTexture(idleTexture);
          }
          player.anims.play(idleAnim, true);
        }
      }

      if (!teleportHolding && (Phaser.Input.Keyboard.JustDown(jumpKey) || Phaser.Input.Keyboard.JustDown(jumpAltKey) || touchJumpJustDown) && !isJumping) {
        isJumping = true; jumpVelocity = FEEL.jumpVelocity; sounds.jump();
        playPlayerScalePulse(scene, PLAYER_SCALE * 1.2, PLAYER_SCALE * 0.8, 100);
      }
      if (!teleportHolding && isJumping && !isSlamming && (Phaser.Input.Keyboard.JustDown(attackKey) || touchAttackJustDown)) {
        isSlamming = true; jumpVelocity = FEEL.slamVelocity;
      }
      if (isJumping) {
        if (teleportHolding) {
          jumpZ = teleportHoldJumpZ;
          jumpVelocity = 0;
        } else {
          jumpZ += jumpVelocity; jumpVelocity += jumpGravity;
        }
        if (jumpZ <= 0) {
          const wasSlamming = isSlamming; jumpZ = 0; isJumping = false; isSlamming = false; jumpVelocity = 0;
          if (wasSlamming) {
            performSlamImpact(scene);
            playPlayerScalePulse(scene, PLAYER_SCALE * 1.4, PLAYER_SCALE * 0.5, 150);
          } else {
            playPlayerScalePulse(scene, PLAYER_SCALE * 1.2, PLAYER_SCALE * 0.6, 100);
          }
        }
      }

      if (!teleportHolding && (Phaser.Input.Keyboard.JustDown(dashKey) || Phaser.Input.Keyboard.JustDown(dashAltKey) || touchDashJustDown) && !isDashing && currentTime > dashCooldown) {
        isDashing = true; dashEndsAt = currentTime + FEEL.dashDuration; setPlayerInvulnerableUntil(dashEndsAt); sounds.dash(); dashCooldown = currentTime + (FEEL.dashCooldown * playstyle.dashCooldownMultiplier);
        triggerCharacterDashSpecial(scene, currentTime);
        for (let i = 1; i <= 3; i++) {
          scene.time.delayedCall(i * 40, () => {
            if (!player || !player.active) return;
            const ghost = scene.add.sprite(player.x, player.y - jumpZ, player.texture.key, player.frame.name)
              .setAlpha(0.3).setTint(0x00ffff).setFlipX(player.flipX).setDepth(player.depth - 1);
            ghost.setScale(PLAYER_SCALE);
            scene.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
          });
        }
      }

      const attackPressed = !teleportHolding && (Phaser.Input.Keyboard.JustDown(attackKey) || touchAttackJustDown);
      const canChainSwordAttack = isXGod && hasFlameSword && !isJumping && attackPressed && (!isAttacking || currentTime >= attackEndsAt - FEEL.swordComboChainWindowMs);
      const canStartBasicAttack = (!isXGod || !hasFlameSword) && attackPressed && !isAttacking && !isJumping;

      if (canChainSwordAttack) {
        sounds.attack();
        startSwordComboAttack(scene, currentTime);
      } else if (canStartBasicAttack) {
        sounds.attack();
        const baseAttackDuration = (!isXGod && characterPowerUnlocked ? FEEL.swordAttackDuration : FEEL.attackDuration) * playstyle.attackDurationMultiplier;
        const attackDuration = selectedCharacterId === 'barrett' ? Math.max(baseAttackDuration, 1400) : baseAttackDuration;
        startPlayerAttack(scene, currentTime, attackDuration);
        if (!isXGod && characterPowerUnlocked) {
          if (selectedCharacterId === 'nico') firePlayableProjectile(scene, 4, 520);
          else if (selectedCharacterId === 'ezra') firePlayableProjectile(scene, 3, 420);
          else if (selectedCharacterId === 'teleportation_c') triggerPlayableTeleportStrike(scene);
        }
      }

      const usingEmbeddedSwordArt = player.texture.key === 'player_sword_walk' || player.texture.key === 'player_sword_attack';
      const sScale = Math.max(0.3, 1 - (jumpZ / 400));
      playerShadow
        .setPosition(player.x, player.y + 6)
        .setScale(0.68 * sScale, 0.68 * sScale)
        .setDepth(player.y - 2)
        .setAlpha(0.3 * sScale);
      playerSword
        .setVisible(isXGod && hasFlameSword && !usingEmbeddedSwordArt)
        .setPosition(player.x + (facingDirection * 20), player.y - 24 - jumpZ)
        .setScale(facingDirection === 1 ? 0.34 : -0.34, 0.34)
        .setAngle(facingDirection === 1 ? 12 : -12)
        .setDepth(player.y + 1)
        .setAlpha(isAttacking ? 0.4 : 0.95);
      playerShield
        .setVisible(shieldUnlocked)
        .setPosition(
          player.x + Math.sin(currentTime * 0.0052) * 30,
          player.y - 26 - jumpZ + Math.sin(currentTime * 0.0104) * 16
        )
        .setScale(inkShieldReady ? 0.44 : 0.38)
        .setAlpha(inkShieldReady ? 0.92 : 0.24)
        .setAngle(Math.sin(currentTime * 0.0038) * 18)
        .setDepth(player.y + 1);
      if (teleportHolding) {
        player.setAlpha(Math.sin(currentTime * 0.05) > 0 ? 0.3 : 1);
      } else if (!playerInvulnerable) {
        player.setAlpha(1);
      }
      if (!isFightingWave && currentSectionIndex < fightSections.length && player.x >= fightSections[currentSectionIndex]) triggerSectionWave(scene);
      if (isFightingWave && pendingWaveSpawns === 0 && monsters.countActive() === 0) {
        isFightingWave = false;
        currentSectionIndex++;
        scene.physics.world.setBounds(0, WALK_ZONE_TOP, 4096, WALK_ZONE_BOTTOM - WALK_ZONE_TOP);
        lastMovementTime = currentTime;
        pulseFeedbackFlash(scene, 0x22c55e, 0.1, 220);
        showSectionCard(scene, 'PATH CLEARED', currentSectionIndex >= fightSections.length ? 'THE STREET GOES QUIET' : 'KEEP PUSHING FORWARD', 800);
      }
      keepMovingPrompt.setVisible(!isFightingWave && currentSectionIndex < fightSections.length && currentTime - lastMovementTime > 5000);

      const playerFeetMargin = player.displayHeight * (1 - player.originY);
      const clampedPlayerY = Phaser.Math.Clamp(player.y, WALK_ZONE_TOP, Math.max(WALK_ZONE_TOP, WALK_ZONE_BOTTOM - playerFeetMargin));
      if (clampedPlayerY !== player.y) {
        player.y = clampedPlayerY;
        if (playerBody.velocity.y > 0 && player.y >= WALK_ZONE_BOTTOM - playerFeetMargin) {
          playerBody.setVelocityY(0);
        } else if (playerBody.velocity.y < 0 && player.y <= WALK_ZONE_TOP) {
          playerBody.setVelocityY(0);
        }
      }
        const playerDepthBoost = currentTime < playableTeleportStrikeDepthUntil ? 36 : selectedCharacterId === 'teleportation_c' ? 18 : 0;
        player.setDepth(player.y + playerDepthBoost).setY(player.y - jumpZ);

      if (hasDinio && !dinioCompanion?.active) {
        spawnDinioCompanion(scene);
      }
      if (dinioCompanion?.active) {
        const dinioBody = dinioCompanion.body as Phaser.Physics.Arcade.Body;
        const followX = player.x - (facingDirection * DINIO.followDistance);
        const followY = player.y + DINIO.verticalOffset;
        dinioBody.setVelocityX(Phaser.Math.Linear(dinioBody.velocity.x, (followX - dinioCompanion.x) * 6, 0.18));
        dinioBody.setVelocityY(Phaser.Math.Linear(dinioBody.velocity.y, (followY - dinioCompanion.y) * 6, 0.16));
        dinioCompanion.setDepth(dinioCompanion.y);

        const targetMonster = monsters
          .getChildren()
          .map((monster) => monster as Phaser.Physics.Arcade.Sprite)
          .filter((monster) => monster.active)
          .sort((a, b) => Phaser.Math.Distance.Between(dinioCompanion.x, dinioCompanion.y, a.x, a.y) - Phaser.Math.Distance.Between(dinioCompanion.x, dinioCompanion.y, b.x, b.y))[0];

        if (targetMonster && currentTime >= dinioNextShotAt && Phaser.Math.Distance.Between(dinioCompanion.x, dinioCompanion.y, targetMonster.x, targetMonster.y) < DINIO.attackRange) {
          dinioNextShotAt = currentTime + DINIO.shotCooldownMs;
          fireDinioShot(scene, targetMonster);
        } else if (currentTime < dinioAttackEndsAt) {
          setDinioPose(scene, 'ATTACK', dinioAttackFacing);
        } else {
          setDinioPose(scene, 'WALK', facingDirection);
        }
      }
      if (hasDoghost && !doghostCompanion?.active) {
        spawnDoghostCompanion(scene);
      }
      if (doghostCompanion?.active) {
        const doghostBody = doghostCompanion.body as Phaser.Physics.Arcade.Body;
        const hoverBob = Math.sin(currentTime * 0.006) * 12;
        const followX = player.x + (facingDirection * DOGHOST.followDistance);
        const followY = player.y + DOGHOST.verticalOffset + hoverBob;
        doghostCompanion.setFlipX(facingDirection === -1);
        doghostBody.setVelocityX(Phaser.Math.Linear(doghostBody.velocity.x, (followX - doghostCompanion.x) * 6, 0.15));
        doghostBody.setVelocityY(Phaser.Math.Linear(doghostBody.velocity.y, (followY - doghostCompanion.y) * 6, 0.15));
        doghostCompanion.setDepth(doghostCompanion.y + 1);

        const targetMonster = monsters
          .getChildren()
          .map((monster) => monster as Phaser.Physics.Arcade.Sprite)
          .filter((monster) => monster.active)
          .sort((a, b) => Phaser.Math.Distance.Between(doghostCompanion.x, doghostCompanion.y, a.x, a.y) - Phaser.Math.Distance.Between(doghostCompanion.x, doghostCompanion.y, b.x, b.y))[0];

        if (targetMonster && currentTime >= doghostNextShotAt && Phaser.Math.Distance.Between(doghostCompanion.x, doghostCompanion.y, targetMonster.x, targetMonster.y) < DOGHOST.attackRange) {
          doghostNextShotAt = currentTime + DOGHOST.waveCooldownMs;
          fireDoghostWave(scene, targetMonster);
        } else if (currentTime >= doghostAttackEndsAt && scene.anims.exists('doghost_walk_anim') && !doghostCompanion.anims.isPlaying) {
          doghostCompanion.play('doghost_walk_anim', true);
        }
      }
      if (isXGod && hasTeleportationC && !teleportationCCompanion?.active) {
        spawnTeleportationCCompanion(scene);
      }
      if (teleportationCCompanion?.active) {
        const teleportationCBody = teleportationCCompanion.body as Phaser.Physics.Arcade.Body;
        const targetMonster = getNearestActiveMonster(teleportationCCompanion.x, teleportationCCompanion.y);

        if (targetMonster && currentTime >= teleportationCNextStrikeAt && currentTime >= teleportationCAttackEndsAt && Phaser.Math.Distance.Between(teleportationCCompanion.x, teleportationCCompanion.y, targetMonster.x, targetMonster.y) < TELEPORTATION_C.attackRange) {
          triggerTeleportationCAttack(scene, targetMonster);
        }

        if (currentTime < teleportationCAttackEndsAt) {
          teleportationCBody.setVelocity(0, 0);
          teleportationCCompanion.setDepth(teleportationCCompanion.y + 2);
          setTeleportationCPose(scene, 'ATTACK', teleportationCAttackFacing);
        } else {
          const hoverBob = Math.sin(currentTime * 0.0055) * TELEPORTATION_C.bobAmplitude;
          const followX = player.x - (facingDirection * TELEPORTATION_C.followDistance);
          const followY = player.y + TELEPORTATION_C.verticalOffset + hoverBob;
          teleportationCBody.setVelocityX(Phaser.Math.Linear(teleportationCBody.velocity.x, (followX - teleportationCCompanion.x) * 6, 0.16));
          teleportationCBody.setVelocityY(Phaser.Math.Linear(teleportationCBody.velocity.y, (followY - teleportationCCompanion.y) * 6, 0.16));
          teleportationCCompanion.setDepth(teleportationCCompanion.y);
          setTeleportationCPose(scene, 'WALK', facingDirection);
        }
      }

      allyProjectiles.getChildren().forEach((shotChild) => {
        const shot = shotChild as Phaser.Physics.Arcade.Sprite;
        if (!shot.active) {
          return;
        }
        shot.setDepth(shot.y + 6);
        if ((shot.getData('expiresAt') || 0) <= currentTime) {
          shot.destroy();
        }
      });
      projectiles.getChildren().forEach((projectileChild) => {
        const projectile = projectileChild as Phaser.Physics.Arcade.Sprite;
        if (!projectile.active) {
          return;
        }
        projectile.setDepth(projectile.y + 6);
        const expiresAt = projectile.getData('expiresAt') || 0;
        const offscreen = projectile.x < scene.cameras.main.scrollX - 120
          || projectile.x > scene.cameras.main.scrollX + SCREEN_WIDTH + 120
          || projectile.y < -80
          || projectile.y > SCREEN_HEIGHT + 120;
        if ((expiresAt > 0 && expiresAt <= currentTime) || offscreen) {
          releaseEnemyProjectile(projectile);
        }
      });

      healthGraphics.clear();
      let activeBoss: Phaser.Physics.Arcade.Sprite | null = null;
      monsters.getChildren().forEach((m) => {
        const monster = m as Phaser.Physics.Arcade.Sprite;
        if (!monster || !monster.active) return;
        const type = monster.getData('type') as MonsterType;
        const hp = monster.getData('hp'); const maxHp = monster.getData('maxHp');
        const timer = (monster.getData('timer') || 0) + 1; monster.setData('timer', timer);
        if (type === 'BOSS') {
          if (monster.getData('state') === 'DEAD') {
            monster.setVelocity(0);
            monster.setDepth(monster.y);
            return;
          }
          activeBoss = monster;
          const isDarkDragonBoss = monster.getData('bossVariant') === 'DARK_DRAGON';
          const isKillinasBoss = monster.getData('bossVariant') === 'KILLINAS_DAUGHTER';
          const isVoidRegentBoss = monster.getData('bossVariant') === 'VOID_REGENT';
          const isInkBehemothBoss = monster.getData('bossVariant') === 'INK_BEHEMOTH';
          if (isDarkDragonBoss) {
            const phase = hp <= maxHp / 2 ? 2 : 1;
            const windupEndsAt = monster.getData('windupEndsAt') || 0;
            const attackEndsAt = monster.getData('attackEndsAt') || 0;
            const nextAttackAt = monster.getData('nextAttackAt') || 0;
            const activeFireballs = monster.getData('activeFireballs') || 0;

            updateBossFacing(monster);
            if (currentTime < windupEndsAt) {
              monster.setVelocity(0);
              monster.setData('intent', 'DRAGON BREATH');
              setDarkDragonPose(scene, monster, 'WINDUP');
            } else if (currentTime < attackEndsAt && activeFireballs > 0) {
              monster.setVelocity(0);
              monster.setData('intent', 'DRAGON BREATH');
              setDarkDragonPose(scene, monster, 'BREATH');
            } else if (currentTime >= nextAttackAt) {
              performDarkDragonBreath(scene, monster);
            } else {
              monster.setData('intent', 'STALKING');
              setDarkDragonPose(scene, monster, 'WALK');
              moveDarkDragonPatrol(scene, monster, phase, currentTime);
            }
          } else if (isKillinasBoss) {
            const phase = hp <= maxHp / 2 ? 2 : 1;
            const windupEndsAt = monster.getData('windupEndsAt') || 0;
            const attackEndsAt = monster.getData('attackEndsAt') || 0;
            const nextAttackAt = monster.getData('nextAttackAt') || 0;
            const distanceToPlayer = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);
            const attackKind = (monster.getData('attackKind') || 'GUN') as 'GUN' | 'AXE';

            updateBossFacing(monster);
            if (currentTime < attackEndsAt) {
              monster.setVelocity(0);
              if (currentTime < windupEndsAt) {
                monster.setData('intent', attackKind === 'AXE' ? 'AXE SWING' : 'GUNFIRE');
              }
              setKillinasPose(
                scene,
                monster,
                attackKind === 'AXE' ? 'AXE' : 'GUN'
              );
            } else if (currentTime >= nextAttackAt) {
              if (distanceToPlayer <= KILLINAS_DAUGHTER.meleeRange) {
                performKillinasAxeStrike(scene, monster);
              } else {
                performKillinasVolley(scene, monster);
              }
            } else {
              monster.setData('intent', distanceToPlayer <= KILLINAS_DAUGHTER.meleeRange + 40 ? 'AXE RANGE' : 'STALKING');
              setKillinasPose(scene, monster, 'WALK');
              moveKillinasPatrol(scene, monster, phase, currentTime);
            }
          } else if (isVoidRegentBoss) {
            const phase = hp <= maxHp / 2 ? 2 : 1;
            const windupEndsAt = monster.getData('windupEndsAt') || 0;
            const attackEndsAt = monster.getData('attackEndsAt') || 0;
            const nextAttackAt = monster.getData('nextAttackAt') || 0;

            updateBossFacing(monster);
            if (currentTime < attackEndsAt) {
              monster.setVelocity(0, 0);
              monster.setData('intent', currentTime < windupEndsAt ? 'CHARGING RIFT' : phase === 2 ? 'VOID STORM' : 'GRAVITY BARRAGE');
              setVoidRegentPose(scene, monster, 'ATTACK');
            } else if (currentTime >= nextAttackAt) {
              performVoidRegentBarrage(scene, monster);
            } else {
              monster.setData('intent', 'HUNTING');
              setVoidRegentPose(scene, monster, 'WALK');
              moveVoidRegentPatrol(scene, monster, phase, currentTime);
            }
          } else if (isInkBehemothBoss && scene.textures.exists('ink_behemoth_walk')) {
            const phase = hp <= maxHp / 2 ? 2 : 1;
            const windupEndsAt = monster.getData('windupEndsAt') || 0;
            const attackEndsAt = monster.getData('attackEndsAt') || 0;
            const nextAttackAt = monster.getData('nextAttackAt') || 0;

            updateBossFacing(monster);
            if (currentTime < attackEndsAt) {
              monster.setVelocity(0, 0);
              monster.setData('intent', currentTime < windupEndsAt ? 'INK CHARGE' : monster.getData('intent') || 'INK SPIT');
              setInkBehemothPose(scene, monster, 'ATTACK');
            } else if (currentTime >= nextAttackAt) {
              performInkBehemothAttack(scene, monster);
            } else {
              monster.setData('intent', 'STALKING');
              setInkBehemothPose(scene, monster, 'WALK');
              moveInkBehemothPatrol(scene, monster, phase, currentTime);
            }
          } else {
            const phase = hp <= maxHp / 2 ? 2 : 1; const cycle = timer % (phase === 2 ? 280 : 400);
            const bossIntent = cycle < 150 ? 'STALKING' : (phase === 2 ? 'SHOCKWAVE' : 'INK SPIT');
            monster.setData('intent', bossIntent);
            updateBossFacing(monster);
            if (cycle === 128) playMonsterTell(scene, monster.x, monster.y - 48, 'tell_ring', 0.22, 380);
            if (cycle < 150) scene.physics.moveToObject(monster, player, getDifficultyScaledSpeed(phase === 2 ? ENCOUNTERS.monsterSpeed.bossRage : ENCOUNTERS.monsterSpeed.bossChase));
            else if (cycle === 150) {
              monster.setVelocity(0); sounds.growl();
              if (phase === 2) {
                scene.cameras.main.shake(400, 0.01); const ring = scene.add.graphics();
                scene.tweens.add({ targets: ring, alpha: 0, duration: 600, onUpdate: (tween) => { const radius = tween.getValue() * 300; ring.clear().lineStyle(10, 0x000000, 0.6 - tween.getValue()).strokeCircle(monster.x, monster.y, radius); if (player && player.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < radius + 10 && jumpZ === 0 && !playerInvulnerable) takePlayerDamage(scene, 12); }, onComplete: () => ring.destroy() });
              } else {
                for (let i = 0; i < 4; i++) scene.time.delayedCall(i * 200, () => {
                  if (monster && monster.active && player && player.active) {
                    const projectile = projectiles.create(monster.x, monster.y - 60, 'ink_splat');
                    if (projectile) {
                      projectile.setScale(0.6);
                      scene.physics.moveToObject(projectile, player, 250);
                    }
                  }
                });
              }
            }
          }
          drawBar(healthGraphics, monster.x - 60, monster.y - 140, 120, hp / maxHp, true);
        } else {
          const distanceToPlayer = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);
          const state = (monster.getData('state') || 'CHASE') as string;
          const nextAction = monster.getData('nextAction') || 0;
          const stateUntil = monster.getData('stateUntil') || 0;
          updateMonsterFacing(monster);

          if (type === 'FLOATER') {
            updateSpiderJumper(scene, monster, timer, state, nextAction, stateUntil, distanceToPlayer);
          } else if (type === 'ALIEN') {
            moveLongRangeEnemy(scene, monster, timer, state, nextAction, stateUntil, distanceToPlayer);
          } else if (type === 'COSMIC_GRUNT') {
            const orbitDrift = Math.sin(scene.time.now * 0.006 + monster.x * 0.02) * 58;
            const lungeReady = distanceToPlayer < 250 && timer >= nextAction;
            if (state === 'WINDUP') {
              monster.setVelocity(0);
              monster.setTint(0xc4b5fd);
              if (timer >= stateUntil) {
                monster.clearTint();
                monster.setData('state', 'DASHING');
                monster.setData('stateUntil', timer + 24);
                playMonsterTell(scene, monster.x, monster.y - 34, 'dash_tell', 0.26, 180, monster.flipX ? 180 : 0);
                scene.physics.moveToObject(monster, player, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.dasher * 1.55));
              }
            } else if (state === 'DASHING') {
              if (timer >= stateUntil) {
                monster.setData('state', 'CHASE');
                monster.setData('nextAction', timer + 115);
              }
            } else {
              smoothMoveTo(monster, player.x, player.y + orbitDrift, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.chaser * 0.98), 0.13, 24);
              if (scene.anims.exists('cosmic_grunt_walk_anim') && (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'cosmic_grunt_walk_anim')) {
                monster.play('cosmic_grunt_walk_anim', true);
              }
              if (lungeReady) {
                monster.setData('state', 'WINDUP');
                monster.setData('stateUntil', timer + 22);
                playMonsterTell(scene, monster.x, monster.y - 26, 'tell_ring', 0.16, 210);
              }
            }
          } else if (type === 'GHOST') {
            moveLongRangeEnemy(scene, monster, timer, state, nextAction, stateUntil, distanceToPlayer);
          } else if (type === 'DEVIL') {
            if (state === 'WINDUP') {
              monster.setVelocity(0);
              monster.setTint(0xfca5a5);
              if (timer >= stateUntil) {
                monster.clearTint();
                if (!playerInvulnerable && jumpZ < 30 && distanceToPlayer < 188) {
                  takePlayerDamage(scene, 18);
                }
                sounds.hit();
                const impact = scene.add.sprite(player.x, player.y - 26, 'impact_vfx').setScale(0.48).setTint(0xe2e8f0).setDepth(player.y + 5);
                scene.tweens.add({ targets: impact, alpha: 0, scale: 1.06, duration: 180, onComplete: () => impact.destroy() });
                monster.setData('state', 'RECOVER');
                monster.setData('stateUntil', timer + 24);
                monster.setData('nextAction', timer + 96);
              }
            } else if (state === 'RECOVER') {
              monster.setVelocity(0);
              if (timer >= stateUntil) {
                monster.setData('state', 'CHASE');
                if (scene.anims.exists('moonlight_terror_walk_anim')) {
                  monster.play('moonlight_terror_walk_anim', true);
                }
              }
            } else {
              smoothMoveTo(monster, player.x, player.y, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.chaser * 0.76), 0.13, 26);
              if (scene.anims.exists('moonlight_terror_walk_anim') && (!monster.anims.currentAnim || monster.anims.currentAnim.key !== 'moonlight_terror_walk_anim')) {
                monster.play('moonlight_terror_walk_anim', true);
              }
              if (distanceToPlayer < 168 && timer >= nextAction) {
                monster.setData('state', 'WINDUP');
                monster.setData('stateUntil', timer + 24);
                playMonsterTell(scene, monster.x + (monster.flipX ? -30 : 30), monster.y - 18, 'tell_ring', 0.18, 220);
                if (scene.anims.exists('moonlight_terror_attack_anim')) {
                  monster.play('moonlight_terror_attack_anim', true);
                }
              }
            }
          } else if (type === 'DASHER') {
            if (state === 'WINDUP') {
              monster.setVelocity(0);
              monster.setTint(0xfacc15);
              if (timer >= stateUntil) {
                monster.clearTint();
                monster.setData('state', 'DASHING');
                monster.setData('stateUntil', timer + 22);
                playMonsterTell(scene, monster.x + (monster.flipX ? -26 : 26), monster.y - 18, 'dash_tell', 0.32, 220, monster.flipX ? 180 : 0);
                scene.physics.moveToObject(monster, player, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.dasher * 2.05));
              }
            } else if (state === 'DASHING') {
              if (timer >= stateUntil) {
                monster.setData('state', 'CHASE');
                monster.setData('nextAction', timer + 88);
              }
            } else {
              smoothMoveTo(monster, player.x, player.y, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.dasher * 0.74), 0.14, 28);
              if (distanceToPlayer < 320 && timer >= nextAction) {
                monster.setData('state', 'WINDUP');
                monster.setData('stateUntil', timer + 24);
                playMonsterTell(scene, monster.x, monster.y - 24, 'tell_ring', 0.16, 220);
              }
            }
          } else if (type === 'GIANT') {
            if (state === 'WINDUP') {
              monster.setVelocity(0);
              monster.setTint(0xfda4af);
              if (timer >= stateUntil) {
                monster.clearTint();
                performGiantQuake(scene, monster);
                monster.setData('state', 'RECOVER');
                monster.setData('stateUntil', timer + 28);
                monster.setData('nextAction', timer + 118);
              }
            } else if (state === 'RECOVER') {
              monster.setVelocity(0);
              if (timer >= stateUntil) monster.setData('state', 'CHASE');
            } else {
              smoothMoveTo(monster, player.x, player.y, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.chaser * 0.68), 0.12, 30);
              if (distanceToPlayer < 190 && timer >= nextAction) {
                monster.setData('state', 'WINDUP');
                monster.setData('stateUntil', timer + 32);
                playMonsterTell(scene, monster.x, monster.y - 8, 'giant_quake', 0.16, 280);
              }
            }
          } else {
            smoothMoveTo(monster, player.x, player.y, getDifficultyScaledSpeed(ENCOUNTERS.monsterSpeed.chaser), 0.14, 24);
          }
          updateMonsterFacing(monster);
          syncMonsterWalkRate(monster);
          applyMonsterSeparation(monster);
          drawBar(healthGraphics, monster.x - 20, monster.y - 45, 40, hp / maxHp);
        }
        monster.setDepth(monster.y);
      });
      updateBossHudDisplay(activeBoss);

      if (isAttacking) {
        const hitboxWidth = isXGod ? (hasFlameSword ? 168 : 124) : selectedCharacterId === 'barrett' && characterPowerUnlocked ? 208 : 138 + playstyle.attackReachBonus;
        const hitboxHeight = isXGod ? (hasFlameSword ? 102 : 82) : selectedCharacterId === 'barrett' && characterPowerUnlocked ? 116 : 88;
        const hitboxReach = (isXGod ? FEEL.attackReach : 70) + playstyle.attackReachBonus;
        attackHitbox.setSize(hitboxWidth, hitboxHeight);
        (attackHitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxHeight);
        attackHitbox.setPosition(player.x + (facingDirection * hitboxReach), player.y);
      }
      else { attackHitbox.setPosition(-1000, -1000); }

      if (player.x > lastDestructibleSpawnX + 600) { lastDestructibleSpawnX = player.x; spawnDestructible(scene, player.x + 800); }
      if (playerHealth < 100) {
        drawBar(healthGraphics, player.x - 20, player.y - (45 * (PLAYER_SCALE / 0.6)), 40, playerHealth / 100);
      }

      destructibles.getChildren().forEach((d) => {
        const item = d as Phaser.Physics.Arcade.Sprite;
        if (item && item.active) item.setDepth(item.y);
      });

      // Continuous background strip scrolling
      if (backgroundStrip) {
        const maxCameraScroll = Math.max(1, 4096 - SCREEN_WIDTH);
        let scrollProgress = Phaser.Math.Clamp(scene.cameras.main.scrollX / maxCameraScroll, 0, 1);
        if (currentLevel === 4 && currentSectionIndex >= fightSections.length - 1) {
          scrollProgress = 1;
        }
        const maxStripShift = Math.max(0, backgroundStripWidth - SCREEN_WIDTH);
        backgroundStrip.x = -Math.round(scrollProgress * maxStripShift);
      }

      scene.events.once('postrender', () => { if (player && player.active) player.setY(player.y + jumpZ); });
    }

    function drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, p: number, isBoss: boolean = false) {
      const h = isBoss ? 12 : 6; g.fillStyle(0x000000, 0.3).fillRect(x, y, w, h);
      const color = isBoss ? 0x9333ea : (p > 0.5 ? 0x22c55e : (p > 0.25 ? 0xfacc15 : 0xef4444));
      g.fillStyle(color, 1).fillRect(x + 1, y + 1, (w - 2) * p, h - 2);
    }

    function renderGameToText() {
      const playerBody = player?.body as Phaser.Physics.Arcade.Body | undefined;
      const activeMonsters = monsters
        ? monsters.getChildren()
            .map((monster) => monster as Phaser.Physics.Arcade.Sprite)
            .filter((monster) => monster.active)
            .map((monster) => ({
              type: monster.getData('type'),
              enemyClass: monster.getData('enemyClass') || getMonsterClass(monster.getData('type') as MonsterType),
              state: monster.getData('state') || 'CHASE',
              intent: monster.getData('intent') || null,
              facing: monster.getData('facingRight') ? 'right' : 'left',
              x: Math.round(monster.x),
              y: Math.round(monster.y),
              hp: monster.getData('hp'),
              maxHp: monster.getData('maxHp')
            }))
        : [];
      const activeSouls = souls
        ? souls.getChildren()
            .map((soul) => soul as Phaser.Physics.Arcade.Sprite)
            .filter((soul) => soul.active)
            .map((soul) => ({ x: Math.round(soul.x), y: Math.round(soul.y) }))
        : [];
      const activeHealth = healthUpgrades
        ? healthUpgrades.getChildren()
            .map((heart) => heart as Phaser.Physics.Arcade.Sprite)
            .filter((heart) => heart.active)
            .map((heart) => ({ x: Math.round(heart.x), y: Math.round(heart.y) }))
        : [];
      const activeHomework = homeworkPickups
        ? homeworkPickups.getChildren()
            .map((pickup) => pickup as Phaser.Physics.Arcade.Sprite)
            .filter((pickup) => pickup.active)
            .map((pickup) => ({ x: Math.round(pickup.x), y: Math.round(pickup.y) }))
        : [];
      const activeAllyShots = allyProjectiles
        ? allyProjectiles.getChildren()
            .map((shot) => shot as Phaser.Physics.Arcade.Sprite)
            .filter((shot) => shot.active)
            .map((shot) => ({ x: Math.round(shot.x), y: Math.round(shot.y) }))
        : [];
      const activeTeleporti = teleportiPickups
        ? teleportiPickups.getChildren()
            .map((pickup) => pickup as Phaser.Physics.Arcade.Sprite)
            .filter((pickup) => pickup.active)
            .map((pickup) => ({
              x: Math.round(pickup.x),
              y: Math.round(pickup.y),
              cooldownRemainingMs: Math.max(0, Math.round((pickup.getData('cooldownUntil') || 0) - (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0)))
            }))
        : [];
      const activeGravityCores = gravityCorePickups
        ? gravityCorePickups.getChildren()
            .map((pickup) => pickup as Phaser.Physics.Arcade.Sprite)
            .filter((pickup) => pickup.active)
            .map((pickup) => ({ x: Math.round(pickup.x), y: Math.round(pickup.y) }))
        : [];
      const activeDestructibles = destructibles
        ? destructibles.getChildren()
            .map((item) => item as Phaser.Physics.Arcade.Sprite)
            .filter((item) => item.active)
            .map((item) => ({
              type: item.getData('type'),
              hp: item.getData('hp'),
              x: Math.round(item.x),
              y: Math.round(item.y)
            }))
        : [];
      const activeBoss = activeMonsters.find((monster) => monster.type === 'BOSS') ?? null;

      return JSON.stringify(
        {
          coordinateSystem: 'origin=(0,0) top-left; +x moves right; +y moves down; jump height is reported separately as jumpZ',
          mode: isPausedRef.current ? 'paused' : (isLevelTransitioning || isSwordRewardSequenceActive) ? 'transition' : isFightingWave ? 'combat' : 'explore',
          level: currentLevel,
          section: LEVEL_PROFILES[getLevelKey(currentLevel)].sectionCards[Math.min(currentSectionIndex, 3)]?.subtitle ?? 'FREE ROAM',
          failedAssets: Array.from(failedAssetKeys),
          selectedCharacter: {
            id: selectedCharacterId,
            name: selectedCharacter.name,
            rewardName: selectedCharacter.rewardName,
            rewardUnlocked: characterPowerUnlocked
          },
          touchControls: testWindow.__unknownUniverseTouchControls ?? {},
          player: player
            ? {
                x: Math.round(player.x),
                y: Math.round(player.y),
                jumpZ: Math.round(jumpZ),
                velocityX: Math.round(playerBody?.velocity.x ?? 0),
                velocityY: Math.round(playerBody?.velocity.y ?? 0),
                facing: facingDirection === 1 ? 'right' : 'left',
                health: playerHealth,
                lives: playerLives,
                isAttacking,
                isJumping,
                isSlamming,
                isDashing,
                isInvulnerable: playerInvulnerable
              }
            : null,
          progress: {
            score: currentScore,
            souls: currentSouls,
            monstersDefeated: currentKills,
            sectionIndex: currentSectionIndex,
            isFightingWave,
            pendingWaveSpawns,
            nextFightX: currentSectionIndex < fightSections.length ? fightSections[currentSectionIndex] : null
          },
          sword: {
            unlocked: swordUnlocked,
            equipped: hasFlameSword,
            durability: swordDurability,
            maxDurability: maxSwordDurability
          },
          shield: {
            unlocked: shieldUnlocked,
            ready: inkShieldReady,
            cooldownRemainingMs: inkShieldReady ? 0 : Math.max(0, Math.round(shieldRechargeAt - (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0)))
          },
          dinio: {
            unlocked: dinioUnlocked,
            active: hasDinio,
            x: dinioCompanion?.active ? Math.round(dinioCompanion.x) : null,
            y: dinioCompanion?.active ? Math.round(dinioCompanion.y) : null,
            attackCooldownRemainingMs: Math.max(0, Math.round(dinioNextShotAt - (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0)))
          },
          doghost: {
            unlocked: doghostUnlocked,
            active: hasDoghost,
            x: doghostCompanion?.active ? Math.round(doghostCompanion.x) : null,
            y: doghostCompanion?.active ? Math.round(doghostCompanion.y) : null,
            attackCooldownRemainingMs: Math.max(0, Math.round(doghostNextShotAt - (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0)))
          },
          teleportationC: {
            unlocked: teleportationCUnlocked,
            active: hasTeleportationC,
            x: teleportationCCompanion?.active ? Math.round(teleportationCCompanion.x) : null,
            y: teleportationCCompanion?.active ? Math.round(teleportationCCompanion.y) : null,
            attackCooldownRemainingMs: Math.max(0, Math.round(teleportationCNextStrikeAt - (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0))),
            attacking: teleportationCAttackEndsAt > (gameRef.current?.scene.getScenes(true)[0]?.time.now ?? 0)
          },
          gravityCore: {
            unlocked: gravityCoreUnlocked,
            charges: gravityCoreCharges,
            pickups: activeGravityCores
          },
          swordReward: {
            pendingPickup: pendingSwordRewardPickup,
            sequenceActive: isSwordRewardSequenceActive
          },
          boss: activeBoss
            ? {
                hp: activeBoss.hp,
                maxHp: activeBoss.maxHp,
                intent: activeBoss.intent ?? 'STALKING',
                facing: activeBoss.facing ?? 'left'
              }
            : null,
          world: {
            cameraX: gameRef.current ? Math.round(gameRef.current.scene.getScenes(true)[0]?.cameras.main.scrollX ?? 0) : 0,
            horizonY: Math.round(HORIZON_Y),
            floorBottom: Math.round(FLOOR_BOTTOM)
          },
          monsters: activeMonsters,
          allyShots: activeAllyShots,
          teleporti: activeTeleporti,
          souls: activeSouls,
          homeworkPickups: activeHomework,
          healthPickups: activeHealth,
          destructibles: activeDestructibles
        },
        null,
        2
      );
    }

    async function advanceTime(ms: number) {
      const game = gameRef.current;
      if (!game) {
        return;
      }

      if (!isManualStepping) {
        game.loop.sleep();
        isManualStepping = true;
      }

      const steps = Math.max(1, Math.ceil(ms / frameStepMs));
      const delta = ms / steps;

      for (let step = 0; step < steps; step++) {
        virtualTime += delta;
        game.step(virtualTime, delta);
      }
    }

    try {
      gameRef.current = new Phaser.Game(config);
      testWindow.render_game_to_text = renderGameToText;
      testWindow.advanceTime = advanceTime;
    } catch (e) {
      console.error("Phaser failed to initialize:", e);
    }

    return () => {
      delete testWindow.render_game_to_text;
      delete testWindow.advanceTime;
      gameRef.current?.destroy(true);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, [currentLevel, playerSprite, difficulty, selectedCharacterId]);

  return (
    <div className="unknown-universe-game relative flex h-full w-full items-center justify-center bg-slate-800">
      <div ref={gameContainerRef} className="h-full w-full overflow-hidden bg-slate-900 shadow-2xl lg:h-auto lg:w-auto lg:rounded-lg lg:border-8 lg:border-slate-700" />
    </div>
  );
};

export default GameEngine;
