import React, { Suspense, lazy, useEffect, useState } from "react";
import TouchControls from "./components/TouchControls";
import UIOverlay from "./components/UIOverlay";
import { CHARACTER_CONFIGS, CHARACTER_IDS, ROSTER_UNLOCK_STORAGE_KEY, isCharacterId } from "./characters";
import { CharacterId, DifficultyMode, GameStats } from "./types";
import { FINAL_LEVEL, FLIGHT_LEVEL } from "./campaign";
import { createLoadout } from './gameplay/powerups';
import { SIGNATURE_SPECIALS } from './gameplay/signatureSpecials';
import {HERO_MOBILITY,hasNewMobilityArt} from './gameplay/heroMobility';
import { mobileImagePath, isMobileGraphicsEnabled } from './gameplay/mobileRuntime';
import { GAME_LOADING_EVENT } from './gameplay/loadingProgress';
import SoundControls from './components/SoundControls';
import { getAudioSettings, installGameAudio, installAudioDebug, subscribeAudioSettings, setEffectsPaused } from './audio/gameAudio';

const MonsterIdeator = lazy(() => import("./components/MonsterIdeator"));
const loadPlatformer = () => import('./components/PlatformerGameEngine');
const loadFlight = () => import('./components/FlightGameEngine');
const loadLegacy = () => import('./components/GameEngine');
const PlatformerGameEngine = lazy(loadPlatformer);
const FlightGameEngine = lazy(loadFlight);
const GameEngine = lazy(loadLegacy);
type AppPhase = "start" | "characterSelect" | "intro" | "game";
type TitlePanel = "options" | "credits" | null;

const LEVEL_MUSIC: Partial<Record<number, string>> = {
  1: "/TheUnknownUniverseTheme.mp3",
  2: "/GraveYardDread.mp3",
  3: "/CaveDripLogic.mp3",
  4: "/GraveYardDread.mp3",
  5: "/audio/music/starbreak-overdrive.mp3",
  6: "/CaveDripLogic.mp3"
};
const START_SCREEN_MUSIC = "/GfunkAllStars.mp3";
const BOSS_MUSIC: Partial<Record<number, { bossId: string; src: string }>> = {
  1: { bossId: "dark_dragon", src: "/audio/music/dark-dragon-dragons-breath.mp3" },
  2: { bossId: "killinas_daughter", src: "/audio/music/killinas-daughter-the-brooding-collosus.mp3" },
  3: { bossId: "ink_behemoth", src: "/audio/music/cinder-colossus-heart-of-the-furnace.mp3" }
};
const LEVEL_ONE_INTRO_IMAGE = "/Level1Intro.png";
const START_SCREEN_IMAGE = "/GameStartScreen.png";
const DEFAULT_DIFFICULTY: DifficultyMode = "EASY";
const DIFFICULTY_OPTIONS: Array<{
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

const DEFAULT_STATS: GameStats = {
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readBooleanQuery = (value: string | null) => value === "1" || value === "true" || value === "yes";
const isRosterUnlockedFromStorage = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try { return window.localStorage.getItem(ROSTER_UNLOCK_STORAGE_KEY) === "true"; }
  catch { return false; }
};

const isRosterUnlockBypassed = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("unlockRoster"));
};

const getInitialCharacterId = (): CharacterId => {
  if (typeof window === "undefined") {
    return "xgod";
  }

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("character");
  if (!isCharacterId(requested)) {
    return "xgod";
  }

  if (requested === "xgod" || requested === "zgod" || isRosterUnlockedFromStorage() || isRosterUnlockBypassed()) {
    return requested;
  }

  return "xgod";
};

const readDifficultyQuery = (value: string | null): DifficultyMode => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "HARD") {
    return "HARD";
  }
  if (normalized === "X-GOD" || normalized === "XGOD" || normalized === "X_GOD") {
    return "X-GOD";
  }
  return DEFAULT_DIFFICULTY;
};

const shouldBypassStartFlow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("autostart"));
};

const shouldUseLegacyDesktopControls = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("desktopControls")) || readBooleanQuery(params.get("legacyDesktop"));
};

const shouldUseLegacyBrawler = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("legacyBrawler"));
};

const shouldUseAutoRun = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("autoRun")) && !readBooleanQuery(params.get("manualRun"));
};

const getInitialDifficulty = (): DifficultyMode => {
  if (typeof window === "undefined") {
    return DEFAULT_DIFFICULTY;
  }

  const params = new URLSearchParams(window.location.search);
  return readDifficultyQuery(params.get("difficulty"));
};

const getInitialStats = (): GameStats => {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }

  const params = new URLSearchParams(window.location.search);
  const levelParam = Number.parseInt(params.get("level") ?? "", 10);
  const healthParam = Number.parseInt(params.get("health") ?? "", 10);
  const livesParam = Number.parseInt(params.get("lives") ?? "", 10);
  const soulsParam = Number.parseInt(params.get("souls") ?? "", 10);
  const killsParam = Number.parseInt(params.get("kills") ?? "", 10);
  const scoreParam = Number.parseInt(params.get("score") ?? "", 10);
  const swordUnlocked = readBooleanQuery(params.get("swordUnlocked"));
  const hasFlameSword = readBooleanQuery(params.get("sword"));
  const shieldUnlocked = readBooleanQuery(params.get("shieldUnlocked")) || readBooleanQuery(params.get("shield"));
  const dinioUnlocked = readBooleanQuery(params.get("dinioUnlocked")) || readBooleanQuery(params.get("dinio"));
  const hasDinio = readBooleanQuery(params.get("dinio"));
  const doghostUnlocked = readBooleanQuery(params.get("doghostUnlocked")) || readBooleanQuery(params.get("doghost"));
  const hasDoghost = readBooleanQuery(params.get("doghost"));
  const teleportationCUnlocked = readBooleanQuery(params.get("teleportcUnlocked")) || readBooleanQuery(params.get("teleportc"));
  const hasTeleportationC = readBooleanQuery(params.get("teleportc"));
  const gravityCoreUnlocked = readBooleanQuery(params.get("gravityCoreUnlocked")) || readBooleanQuery(params.get("gravityCore"));
  const gravityCoreChargesParam = Number.parseInt(params.get("gravityCoreCharges") ?? "", 10);
  const selectedCharacterId = getInitialCharacterId();
  const characterPowerUnlocked = selectedCharacterId === 'zgod' || readBooleanQuery(params.get("characterPower")) || (selectedCharacterId === "xgod" && hasFlameSword);
  const inkShieldReadyParam = params.get("shieldReady");
  const swordDurabilityParam = Number.parseInt(params.get("swordDurability") ?? "", 10);
  const maxSwordDurabilityParam = Number.parseInt(params.get("maxSwordDurability") ?? "", 10);
  const maxSwordDurability = Number.isFinite(maxSwordDurabilityParam) ? clamp(maxSwordDurabilityParam, 1, 5) : DEFAULT_STATS.maxSwordDurability;

  return {
    ...DEFAULT_STATS,
    level: Number.isFinite(levelParam) ? clamp(levelParam, 1, shouldUseLegacyBrawler() && selectedCharacterId !== 'zgod' && selectedCharacterId !== 'killer_kai' ? 4 : FINAL_LEVEL) : DEFAULT_STATS.level,
    health: selectedCharacterId === 'zgod' ? DEFAULT_STATS.maxHealth : Number.isFinite(healthParam) ? clamp(healthParam, 1, DEFAULT_STATS.maxHealth) : DEFAULT_STATS.health,
    lives: Number.isFinite(livesParam) ? clamp(livesParam, 1, DEFAULT_STATS.maxLives) : DEFAULT_STATS.lives,
    score: Number.isFinite(scoreParam) ? Math.max(0, scoreParam) : DEFAULT_STATS.score,
    souls: Number.isFinite(soulsParam) ? Math.max(0, soulsParam) : DEFAULT_STATS.souls,
    monstersDefeated: Number.isFinite(killsParam) ? Math.max(0, killsParam) : DEFAULT_STATS.monstersDefeated,
    equipment:createLoadout(hasFlameSword?'sword':selectedCharacterId==='xgod'||selectedCharacterId==='killer_kai'?'blaster':'hands'),
    swordUnlocked: swordUnlocked || hasFlameSword,
    hasFlameSword,
    swordDurability: hasFlameSword
      ? (Number.isFinite(swordDurabilityParam) ? clamp(swordDurabilityParam, 1, maxSwordDurability) : maxSwordDurability)
      : 0,
    maxSwordDurability,
    shieldUnlocked,
    inkShieldReady: shieldUnlocked ? (inkShieldReadyParam ? readBooleanQuery(inkShieldReadyParam) : true) : false,
    dinioUnlocked,
    hasDinio,
    doghostUnlocked,
    hasDoghost,
    teleportationCUnlocked,
    hasTeleportationC,
    gravityCoreUnlocked,
    gravityCoreCharges: gravityCoreUnlocked ? (Number.isFinite(gravityCoreChargesParam) ? clamp(gravityCoreChargesParam, 1, 3) : 3) : 0,
    selectedCharacterId,
    characterPowerUnlocked
  };
};

const App: React.FC = () => {
  const [stats, setStats] = useState<GameStats>(getInitialStats);
  const [difficulty, setDifficulty] = useState<DifficultyMode>(getInitialDifficulty);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>(getInitialCharacterId);
  const [isRosterUnlocked, setIsRosterUnlocked] = useState(() => isRosterUnlockedFromStorage() || isRosterUnlockBypassed());
  const [appPhase, setAppPhase] = useState<AppPhase>(() => (shouldBypassStartFlow() ? "game" : "start"));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [titlePanel, setTitlePanel] = useState<TitlePanel>(null);
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const introStartedRef = React.useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mobileGraphics] = useState(isMobileGraphicsEnabled);
  const [portraitPhone, setPortraitPhone] = useState(() => mobileGraphics && window.innerWidth < 768 && window.innerHeight > window.innerWidth);
  const [graphicsLost, setGraphicsLost] = useState(false);
  const gameSuspended = isPaused || portraitPhone || graphicsLost;
  const [isIdeatorCollapsed, setIsIdeatorCollapsed] = useState(false);
  const [playerSprite, setPlayerSprite] = useState<string | null>(null);
  const [useLegacyDesktopControls] = useState(shouldUseLegacyDesktopControls);
  const [requestedLegacyBrawler] = useState(shouldUseLegacyBrawler);
  const useLegacyBrawler = requestedLegacyBrawler && selectedCharacterId !== 'zgod' && selectedCharacterId !== 'killer_kai';
  const [useAutoRun] = useState(shouldUseAutoRun);
  const backgroundMusicRef = React.useRef<HTMLAudioElement | null>(null);
  const pendingMusicStartRef = React.useRef(false);
  const [audioSettings,setAudioSettings]=useState(getAudioSettings);
  useEffect(() => {
    const update = (event: Event) => setLoadingProgress((event as CustomEvent<number>).detail);
    window.addEventListener(GAME_LOADING_EVENT, update);
    return () => window.removeEventListener(GAME_LOADING_EVENT, update);
  }, []);
  useEffect(() => { setLoadingProgress(0); }, [stats.level, selectedCharacterId, difficulty, playerSprite]);
  useEffect(() => {
    if (appPhase !== 'characterSelect') return;
    const load = useLegacyBrawler ? loadLegacy : stats.level === FLIGHT_LEVEL ? loadFlight : loadPlatformer;
    void load().catch(() => { /* React.lazy handles a later import failure. */ });
  }, [appPhase, useLegacyBrawler, stats.level]);
  useEffect(()=>{
    const removeAudio=installGameAudio(),removeDebug=installAudioDebug();
    const unsubscribe=subscribeAudioSettings(()=>setAudioSettings(getAudioSettings()));
    return ()=>{unsubscribe();removeDebug();removeAudio();};
  },[]);
  useEffect(()=>{setEffectsPaused(appPhase!=='game'||gameSuspended);},[appPhase,gameSuspended]);

  useEffect(() => {
    let frame = 0;
    const fitViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = window.visualViewport?.height ?? window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
        setPortraitPhone(mobileGraphics && window.innerWidth < 768 && window.innerHeight > window.innerWidth);
      });
    };
    const backgrounded = () => { if (document.hidden) setIsPaused(true); };
    const graphicsInterrupted = () => setGraphicsLost(true);
    fitViewport();
    window.addEventListener('resize', fitViewport);
    window.visualViewport?.addEventListener('resize', fitViewport);
    document.addEventListener('visibilitychange', backgrounded);
    window.addEventListener('unknown-universe:graphics-lost', graphicsInterrupted);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fitViewport);
      window.visualViewport?.removeEventListener('resize', fitViewport);
      document.removeEventListener('visibilitychange', backgrounded);
      window.removeEventListener('unknown-universe:graphics-lost', graphicsInterrupted);
    };
  }, [mobileGraphics]);

  useEffect(() => {
    if (appPhase !== "intro") {
      introStartedRef.current = 0;
      setIsIntroExiting(false);
      return;
    }

    if (!introStartedRef.current) introStartedRef.current = performance.now();
    if (!useLegacyBrawler && loadingProgress < 1) return;
    const remaining = Math.max(0, (useLegacyBrawler ? 3200 : 1200) - (performance.now() - introStartedRef.current));

    const beginExitTimer = window.setTimeout(() => {
      setIsIntroExiting(true);
    }, remaining);

    const finishIntroTimer = window.setTimeout(() => {
      setAppPhase("game");
      setIsIntroExiting(false);
    }, remaining + 800);

    return () => {
      window.clearTimeout(beginExitTimer);
      window.clearTimeout(finishIntroTimer);
    };
  }, [appPhase, loadingProgress, useLegacyBrawler]);

  useEffect(() => {
    if (!stats.isVictory || selectedCharacterId !== "xgod" || typeof window === "undefined") {
      return;
    }

    try { window.localStorage.setItem(ROSTER_UNLOCK_STORAGE_KEY, "true"); } catch { /* Keep the roster unlocked for this session. */ }
    setIsRosterUnlocked(true);
  }, [selectedCharacterId, stats.isVictory]);

  useEffect(() => {
    if (appPhase !== "start") {
      return;
    }

    const handleStartShortcut = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (event.key === "Escape") {
        setTitlePanel(null);
        return;
      }

      if (titlePanel) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "enter" || key === " " || key === "s") {
        event.preventDefault();
        setAppPhase("characterSelect");
      }
    };

    window.addEventListener("keydown", handleStartShortcut);
    return () => {
      window.removeEventListener("keydown", handleStartShortcut);
    };
  }, [appPhase, titlePanel]);

  useEffect(() => {
    const handleFullscreenToggle = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== "f") {
        return;
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen?.();
      }
    };

    window.addEventListener("keydown", handleFullscreenToggle);

    return () => {
      window.removeEventListener("keydown", handleFullscreenToggle);
    };
  }, []);

  useEffect(() => {
    const bossTrack = BOSS_MUSIC[stats.level];
    const musicSrc =
      appPhase === "start" || appPhase === "characterSelect"
        ? START_SCREEN_MUSIC
        : appPhase === "intro"
          ? LEVEL_MUSIC[1]
          : appPhase === "game" && !useLegacyBrawler && bossTrack && stats.activeBossId === bossTrack.bossId
            ? bossTrack.src
          : LEVEL_MUSIC[useLegacyBrawler && stats.level === 4 ? FINAL_LEVEL : stats.level];

    if (!musicSrc) {
      pendingMusicStartRef.current = false;
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      return;
    }

    const shouldPauseMusic = appPhase === "game" && (gameSuspended || stats.isGameOver || stats.isVictory);
    let audio = backgroundMusicRef.current;

    if (!audio || !audio.src.endsWith(musicSrc)) {
      if (audio) {
        audio.pause();
      }
      audio = new Audio(musicSrc);
      audio.preload = 'none';
      audio.loop = true;
      backgroundMusicRef.current = audio;
    }
    audio.volume=audioSettings.music;audio.muted=audioSettings.muted;

    const tryPlay = () => {
      if (!backgroundMusicRef.current || shouldPauseMusic) {
        return;
      }

      backgroundMusicRef.current
        .play()
        .then(() => {
          pendingMusicStartRef.current = false;
        })
        .catch(() => {
          pendingMusicStartRef.current = true;
        });
    };

    const unlockPlayback = () => {
      if (!pendingMusicStartRef.current) {
        return;
      }
      tryPlay();
    };

    if (shouldPauseMusic) {
      audio.pause();
      pendingMusicStartRef.current = false;
    } else {
      tryPlay();
    }

    window.addEventListener("pointerdown", unlockPlayback);
    window.addEventListener("keydown", unlockPlayback);

    return () => {
      window.removeEventListener("pointerdown", unlockPlayback);
      window.removeEventListener("keydown", unlockPlayback);
    };
  }, [appPhase, gameSuspended, stats.isGameOver, stats.isVictory, stats.level, stats.activeBossId, useLegacyBrawler,audioSettings.music,audioSettings.muted]);

  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const handleStatsUpdate = (newStats: Partial<GameStats>) => {
    setStats((previous) => {
      const updated = { ...previous, ...newStats };
      if (updated.isVictory) {
        return { ...updated, isGameOver: false };
      }
      // Flight reports Game Over after its final ship's explosion has completed.
      const flightOwnsGameOver = !useLegacyBrawler && updated.level === FLIGHT_LEVEL && newStats.isGameOver === false;
      if (updated.lives <= 0 && !previous.isGameOver && !flightOwnsGameOver && !updated.isDying) {
        return { ...updated, isGameOver: true };
      }
      return updated;
    });
  };

  const togglePause = () => {
    if (appPhase !== "game") {
      return;
    }

    if (stats.isGameOver || stats.isVictory) {
      return;
    }

    setIsPaused((previous) => !previous);
  };

  const jumpToLevelForTesting = (level: number) => {
    const targetLevel = clamp(level, 1, useLegacyBrawler ? 4 : FINAL_LEVEL);
    const hasSword = targetLevel >= 2;
    const hasShield = targetLevel >= 3;
    const hasDinio = targetLevel >= 2;
    const hasDoghost = targetLevel >= 3;
    const hasTeleportationC = targetLevel >= 4;

    setIsPaused(false);
    setTitlePanel(null);
    setIsIntroExiting(false);
    setAppPhase("game");
    setStats({
      ...DEFAULT_STATS,
      level: targetLevel,
      equipment:createLoadout(hasSword?'sword':selectedCharacterId==='xgod'||selectedCharacterId==='killer_kai'?'blaster':'hands'),
      score: 0,
      souls: targetLevel >= 2 ? 3 : 0,
      health: DEFAULT_STATS.maxHealth,
      lives: DEFAULT_STATS.maxLives,
      swordUnlocked: hasSword,
      hasFlameSword: hasSword,
      swordDurability: hasSword ? DEFAULT_STATS.maxSwordDurability : 0,
      shieldUnlocked: hasShield,
      inkShieldReady: hasShield,
      dinioUnlocked: hasDinio,
      hasDinio,
      doghostUnlocked: hasDoghost,
      hasDoghost,
      teleportationCUnlocked: hasTeleportationC,
      hasTeleportationC,
      gravityCoreUnlocked: false,
      gravityCoreCharges: 0,
      selectedCharacterId,
      characterPowerUnlocked: targetLevel >= 2
    });
  };

  const testCharacterMode = (characterId: CharacterId, powered: boolean) => {
    const currentLevel = clamp(stats.level, 1, useLegacyBrawler ? 4 : FINAL_LEVEL);
    const hasShield = currentLevel >= 3;
    const hasDinio = currentLevel >= 2;
    const hasDoghost = currentLevel >= 3;
    const hasTeleportationC = currentLevel >= 4;
    const xGodPowered = characterId === "xgod" && powered;

    setIsPaused(false);
    setTitlePanel(null);
    setIsIntroExiting(false);
    setIsRosterUnlocked(true);
    setSelectedCharacterId(characterId);
    setAppPhase("game");
    setStats({
      ...DEFAULT_STATS,
      level: currentLevel,
      equipment:createLoadout(xGodPowered?'sword':characterId==='xgod'||characterId==='killer_kai'?'blaster':'hands'),
      health: DEFAULT_STATS.maxHealth,
      lives: DEFAULT_STATS.maxLives,
      souls: currentLevel >= 2 ? 3 : 0,
      selectedCharacterId: characterId,
      swordUnlocked: xGodPowered,
      hasFlameSword: xGodPowered,
      swordDurability: xGodPowered ? DEFAULT_STATS.maxSwordDurability : 0,
      shieldUnlocked: hasShield,
      inkShieldReady: hasShield,
      dinioUnlocked: hasDinio,
      hasDinio,
      doghostUnlocked: hasDoghost,
      hasDoghost,
      teleportationCUnlocked: hasTeleportationC,
      hasTeleportationC: characterId === "teleportation_c" ? false : hasTeleportationC,
      gravityCoreUnlocked: currentLevel >= (useLegacyBrawler ? 4 : FINAL_LEVEL) && powered,
      gravityCoreCharges: currentLevel >= (useLegacyBrawler ? 4 : FINAL_LEVEL) && powered ? 3 : 0,
      characterPowerUnlocked: characterId === 'zgod' || powered
    });
  };

  const restartGame = () => {
    setStats({ ...DEFAULT_STATS, selectedCharacterId, characterPowerUnlocked:selectedCharacterId==='zgod', equipment:createLoadout(selectedCharacterId==='xgod'||selectedCharacterId==='killer_kai'?'blaster':'hands') });
    setIsPaused(false);
    setTitlePanel(null);
    setIsIntroExiting(false);
    setAppPhase(shouldBypassStartFlow() ? "game" : "start");
  };

  const startGameFromTitle = () => {
    setIsPaused(false);
    setTitlePanel(null);
    setAppPhase("characterSelect");
  };

  const beginRunWithCharacter = (characterId: CharacterId) => {
    const canSelect = characterId === "xgod" || characterId === "zgod" || isRosterUnlocked;
    if (!canSelect) {
      return;
    }

    setSelectedCharacterId(characterId);
    setStats({
      ...DEFAULT_STATS,
      selectedCharacterId: characterId,
      characterPowerUnlocked: characterId === 'zgod',
      equipment:createLoadout(characterId==='xgod'||characterId==='killer_kai'?'blaster':'hands')
    });
    setIsPaused(false);
    setTitlePanel(null);
    setAppPhase("intro");
  };

  const handleSpriteUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setPlayerSprite(loadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div data-mobile={mobileGraphics ? 'true' : 'false'} data-phase={appPhase} className="game-app-shell mobile-safe-area flex h-[100dvh] w-screen overflow-hidden bg-slate-900">
      <div className="relative flex-grow overflow-hidden transition-all duration-500">
        {graphicsLost && (
          <div role="alert" className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="max-w-sm">
              <h2 className="text-2xl font-bold">Graphics interrupted</h2>
              <p className="my-4">Reload to start the game again.</p>
              <button type="button" className="rounded-xl bg-violet-700 px-6 py-3" onClick={() => window.location.reload()}>Reload game</button>
            </div>
          </div>
        )}
        {appPhase !== "start" && appPhase !== "characterSelect" && (
          <Suspense fallback={null}>
          {useLegacyBrawler ? (
            <GameEngine
              key={`brawler-${playerSprite ? "custom-sprite" : "default"}-${selectedCharacterId}-${stats.level}-${difficulty}-${stats.characterPowerUnlocked ? "powered" : "base"}-${stats.hasFlameSword ? "sword" : "nosword"}`}
              isPaused={appPhase !== "game" || gameSuspended || stats.isGameOver || stats.isVictory}
              currentLevel={stats.level}
              difficulty={difficulty}
              selectedCharacterId={selectedCharacterId}
              initialScore={stats.score}
              playerSprite={playerSprite}
              initialSwordUnlocked={stats.swordUnlocked}
              initialHasFlameSword={stats.hasFlameSword}
              initialSwordDurability={stats.swordDurability}
              maxSwordDurability={stats.maxSwordDurability}
              initialShieldUnlocked={stats.shieldUnlocked}
              initialInkShieldReady={stats.inkShieldReady}
              initialDinioUnlocked={stats.dinioUnlocked}
              initialHasDinio={stats.hasDinio}
              initialDoghostUnlocked={stats.doghostUnlocked}
              initialHasDoghost={stats.hasDoghost}
              initialTeleportationCUnlocked={stats.teleportationCUnlocked}
              initialHasTeleportationC={stats.hasTeleportationC}
              initialGravityCoreUnlocked={stats.gravityCoreUnlocked}
              initialGravityCoreCharges={stats.gravityCoreCharges}
              initialCharacterPowerUnlocked={stats.characterPowerUnlocked}
              onStatsUpdate={handleStatsUpdate}
              onTogglePause={togglePause}
            />
          ) : stats.level === FLIGHT_LEVEL ? (
            <FlightGameEngine
              key={`flight-${selectedCharacterId}-${difficulty}`}
              isPaused={appPhase !== "game" || gameSuspended || stats.isGameOver || stats.isVictory}
              selectedCharacterId={selectedCharacterId}
              difficulty={difficulty}
              initialStats={stats}
              onStatsUpdate={handleStatsUpdate}
              onTogglePause={togglePause}
            />
          ) : (
            <PlatformerGameEngine
              key={`platformer-${playerSprite ? "custom-sprite" : "default"}-${selectedCharacterId}-${stats.level}-${difficulty}`}
            isPaused={appPhase !== "game" || gameSuspended || stats.isGameOver || stats.isVictory}
            currentLevel={stats.level}
            initialLives={stats.lives}
            initialEquipment={stats.equipment}
            difficulty={difficulty}
            selectedCharacterId={selectedCharacterId}
            initialScore={stats.score}
            initialSouls={stats.souls}
            initialMonstersDefeated={stats.monstersDefeated}
            playerSprite={playerSprite}
            initialSwordUnlocked={stats.swordUnlocked}
            initialHasFlameSword={stats.hasFlameSword}
            initialSwordDurability={stats.swordDurability}
            maxSwordDurability={stats.maxSwordDurability}
            initialShieldUnlocked={stats.shieldUnlocked}
            initialInkShieldReady={stats.inkShieldReady}
            initialDinioUnlocked={stats.dinioUnlocked}
            initialHasDinio={stats.hasDinio}
            initialDoghostUnlocked={stats.doghostUnlocked}
            initialHasDoghost={stats.hasDoghost}
            initialTeleportationCUnlocked={stats.teleportationCUnlocked}
            initialHasTeleportationC={stats.hasTeleportationC}
            initialGravityCoreUnlocked={stats.gravityCoreUnlocked}
            initialGravityCoreCharges={stats.gravityCoreCharges}
            initialCharacterPowerUnlocked={stats.characterPowerUnlocked}
            onStatsUpdate={handleStatsUpdate}
            onTogglePause={togglePause}
          />
          )
          }
          </Suspense>
        )}
        {appPhase === 'game' && !useLegacyBrawler && loadingProgress < 1 && (
          <div role="status" aria-label="Loading game" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center font-['Gochi_Hand'] text-white">
            <p className="text-3xl">Entering the Unknown Universe…</p>
            <progress className="h-4 w-64 max-w-full accent-violet-500" max={100} value={Math.round(loadingProgress * 100)} />
            <p className="text-xl">{Math.round(loadingProgress * 100)}%</p>
          </div>
        )}
        {appPhase === "game" && (
          <UIOverlay
            stats={stats}
            difficulty={difficulty}
            selectedCharacterId={selectedCharacterId}
            isPaused={isPaused}
            useLegacyDesktopControls={useLegacyDesktopControls}
            legacyCampaign={useLegacyBrawler}
            onTogglePause={togglePause}
            onJumpToLevel={jumpToLevelForTesting}
            onTestCharacterMode={testCharacterMode}
          />
        )}
        {appPhase === "game" && !stats.isGameOver && !stats.isVictory && !useLegacyDesktopControls && (
          <TouchControls isPaused={gameSuspended} slamName={HERO_MOBILITY[selectedCharacterId].name} specialName={!useLegacyBrawler && stats.level!==FLIGHT_LEVEL ? SIGNATURE_SPECIALS[selectedCharacterId].name : undefined} flightMode={!useLegacyBrawler && stats.level === FLIGHT_LEVEL} isPlatformer={!useLegacyBrawler && stats.level !== FLIGHT_LEVEL} autoRun={!useLegacyBrawler && useAutoRun} starControls={selectedCharacterId === "zgod"} canCrouch={selectedCharacterId !== "xgod" || new URLSearchParams(window.location.search).get("xgodRun") !== "legacy" && new URLSearchParams(window.location.search).get("xgodArt") !== "model" && !playerSprite} canShoot={!useLegacyBrawler && (stats.equipment?.active==='blaster'||stats.equipment?.active==='frost'||selectedCharacterId==='killer_kai'&&stats.equipment?.active==='hands')} blasterEquipped={!useLegacyBrawler && (stats.equipment?.active==='blaster'||stats.equipment?.active==='frost'||selectedCharacterId==='killer_kai'&&stats.equipment?.active==='hands')} teleportControls={!useLegacyBrawler&&stats.level!==FLIGHT_LEVEL&&selectedCharacterId==='teleportation_c'} />
        )}
        {appPhase === "game" && !stats.isGameOver && !stats.isVictory && (
          <div className="phone-portrait-rotate pointer-events-auto absolute inset-0 z-[60] items-center justify-center bg-slate-950/86 p-6 text-center font-['Gochi_Hand'] text-white backdrop-blur-md">
            <div className="max-w-sm rounded-3xl border-4 border-white/70 bg-slate-900/92 p-6 shadow-2xl">
              <p className="text-4xl font-bold">Turn Sideways</p>
              <p className="mt-3 text-2xl text-violet-100">The Unknown Universe plays best in landscape on phones.</p>
            </div>
          </div>
        )}

        {appPhase === "start" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#312e81_0%,#0f172a_55%,#020617_100%)]" />
            <div className="relative z-10 flex h-full w-full items-center justify-center p-3 sm:p-5 md:p-8">
              <div
                className="relative max-w-[1700px]"
                style={{
                  aspectRatio: "3172 / 1344",
                  width: "min(100%, calc(94vh * 2.3601))"
                }}
              >
                <img
                  src={mobileImagePath(START_SCREEN_IMAGE)}
                  alt="Unknown Universe game start screen"
                  className="absolute inset-0 block h-full w-full object-contain drop-shadow-[0_22px_65px_rgba(0,0,0,0.55)]"
                />

                <div className="pointer-events-none absolute left-[5.5%] top-[5.2%] rounded-full border-2 border-slate-900/70 bg-black/30 px-3 py-1 text-sm font-['Gochi_Hand'] text-white sm:text-base md:text-lg">
                  Mode: {difficulty}
                </div>

                <div className="absolute left-[12.2%] right-[12.2%] top-[74.5%] grid h-[19%] grid-cols-3 gap-[2.4%]">
                  <button
                    type="button"
                    aria-label="Open options"
                    onClick={() => setTitlePanel("options")}
                    className="h-full w-full cursor-pointer rounded-[1.6rem] border-4 border-transparent bg-white/0 text-transparent outline-none transition duration-200 hover:border-violet-300/70 hover:bg-white/10 focus-visible:border-violet-300/80"
                  >
                    <span className="sr-only">OPTIONS</span>
                  </button>
                  <button
                    id="start-game-button"
                    type="button"
                    aria-label="Start game"
                    onClick={startGameFromTitle}
                    className="h-full w-full cursor-pointer rounded-[1.8rem] border-4 border-transparent bg-white/0 text-transparent outline-none transition duration-200 hover:border-amber-300/80 hover:bg-white/10 focus-visible:border-amber-300/90"
                  >
                    <span className="sr-only">START GAME</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Open credits"
                    onClick={() => setTitlePanel("credits")}
                    className="h-full w-full cursor-pointer rounded-[1.6rem] border-4 border-transparent bg-white/0 text-transparent outline-none transition duration-200 hover:border-sky-300/70 hover:bg-white/10 focus-visible:border-sky-300/80"
                  >
                    <span className="sr-only">CREDITS</span>
                  </button>
                </div>
              </div>
            </div>

            {titlePanel && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border-4 border-slate-900 bg-white/95 p-6 font-['Gochi_Hand'] shadow-[0_28px_80px_rgba(0,0,0,0.45)] md:p-8">
                  <button
                    type="button"
                    onClick={() => setTitlePanel(null)}
                    className="absolute right-4 top-4 rounded-full border-2 border-slate-800 bg-slate-100 px-3 py-1 text-lg text-slate-800 transition hover:bg-slate-200"
                  >
                    CLOSE
                  </button>

                  {titlePanel === "options" ? (
                    <>
                      <h2 className="mb-3 text-4xl font-bold text-slate-900 md:text-5xl">Select Difficulty</h2>
                      <p className="mb-6 text-lg text-slate-600 md:text-2xl">
                        Pick how tough you want the enemy waves and bosses to be before you start the run.
                      </p>
                      <div className="space-y-4">
                        {DIFFICULTY_OPTIONS.map((option) => {
                          const isActive = difficulty === option.mode;
                          return (
                            <button
                              key={option.mode}
                              type="button"
                              onClick={() => setDifficulty(option.mode)}
                              className={`w-full rounded-2xl border-4 px-5 py-4 text-left shadow-md transition hover:-translate-y-0.5 ${
                                isActive
                                  ? "border-violet-700 bg-violet-100 text-violet-950"
                                  : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold md:text-3xl">{option.label}</span>
                                <span className="rounded-full border-2 border-current px-3 py-1 text-sm md:text-base">
                                  {isActive ? "SELECTED" : "CHOOSE"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-tight md:text-xl">{option.description}</p>
                            </button>
                          );
                        })}
                      </div>
                      <SoundControls settings={audioSettings} />
                    </>
                  ) : (
                    <>
                      <h2 className="mb-3 text-4xl font-bold text-slate-900 md:text-5xl">Credits</h2>
                      <div className="space-y-4 text-slate-700 md:text-2xl">
                        <p><span className="font-bold text-slate-900">Project:</span> The Unknown Universe: Doodle Beat 'Em Up</p>
                        <p><span className="font-bold text-slate-900">Art Direction:</span> Hand-drawn character, prop, and level art from your custom asset set.</p>
                        <p><span className="font-bold text-slate-900">Tech:</span> React, Phaser, and Vite.</p>
                        <p><span className="font-bold text-slate-900">Current Build:</span> {useLegacyBrawler ? "Four" : "Five"}-level campaign with persistent power-ups, bosses, pals, and custom music.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {appPhase === "characterSelect" && (
          <div className="character-select absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950 p-3 font-['Gochi_Hand'] sm:p-4" role="dialog" aria-labelledby="character-select-title">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_12%,rgba(124,58,237,0.36)_0%,rgba(15,23,42,0.92)_42%,#020617_100%)]" />
            <div className="character-select-content relative z-10 flex min-h-full w-full max-w-7xl shrink-0 flex-col justify-start py-3 md:justify-center">
              <div className="character-select-header mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-5 md:gap-4">
                <div>
                  <h1 id="character-select-title" className="text-4xl font-bold text-white sm:text-5xl md:text-7xl">Pick Your Player</h1>
                  <p className="character-select-description mt-1 max-w-3xl text-base text-violet-100 sm:text-xl md:text-2xl">
                    {isRosterUnlocked
                      ? "The roster is unlocked. Choose who enters the Unknown Universe."
                      : "X God and Z-God are ready. Beat the game with X God to unlock the other heroes."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppPhase("start")}
                  className="rounded-full border-4 border-white/70 bg-slate-900/80 px-5 py-2 text-xl text-white transition hover:bg-slate-800 md:text-2xl"
                >
                  Back
                </button>
              </div>

              <div className="character-roster grid min-h-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-7 md:gap-4" role="group" aria-label="Choose a character" tabIndex={0}>
                {CHARACTER_IDS.map((characterId) => {
                  const character = CHARACTER_CONFIGS[characterId];
                  const locked = characterId !== "xgod" && characterId !== "zgod" && !isRosterUnlocked;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      disabled={locked}
                      data-character-id={character.id}
                      aria-label={`${character.name}: ${locked ? 'Locked. Beat the game with X God to unlock.' : 'Select character'}`}
                      onClick={() => beginRunWithCharacter(character.id)}
                      className={`character-card group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border-4 bg-white text-left shadow-[8px_8px_0_rgba(0,0,0,0.45)] transition ${
                        locked
                          ? "border-slate-700 opacity-55 grayscale"
                          : "border-amber-200 hover:-translate-y-1 hover:border-white hover:shadow-[10px_12px_0_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      <div className="character-card-art relative aspect-[2/3] w-full overflow-hidden bg-slate-200">
                        <img
                          loading="lazy" decoding="async"
                          src={mobileImagePath(character.cardImage)}
                          alt={`${character.name} character card`}
                          className="h-full w-full object-contain"
                        />
                        {locked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/64 px-3 text-center">
                            <p className="rounded-xl border-2 border-white/60 bg-black/70 px-2 py-2 text-base leading-tight text-white sm:px-3 sm:text-xl">
                              LOCKED
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="character-card-details border-t-4 border-slate-900 bg-white p-2 sm:p-3">
                        <p className="text-xl font-bold text-slate-900 sm:text-2xl">{character.name}</p>
                        <p className="text-base text-slate-600 sm:text-lg">{character.subtitle}</p>
                        <p className="mt-1 text-sm font-bold text-amber-700">{SIGNATURE_SPECIALS[character.id].name}</p>
                        <p className="mt-1 text-base font-bold text-violet-700">{locked ? "LOCKED" : "SELECT"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="character-scroll-hint" aria-hidden="true">Swipe to browse heroes → · Tap SELECT to play</p>
            </div>
          </div>
        )}

        {appPhase === "intro" && (
          <div className="level-intro pointer-events-none absolute inset-0 z-40 overflow-hidden bg-slate-950">
            <div
              className={`level-intro-frame absolute inset-0 transition-transform duration-700 ease-in-out ${
                isIntroExiting ? "-translate-x-full" : "translate-x-0"
              }`}
            >
              <div className="level-intro-art">
                <img
                  src={mobileImagePath(LEVEL_ONE_INTRO_IMAGE)}
                  alt="Level 1 intro screen"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="level-intro-status flex justify-center" role="status">
                <div className="rounded-full border-2 border-white/70 bg-slate-950/65 px-6 py-2 font-['Gochi_Hand'] text-2xl tracking-wide text-white shadow-lg">
                  {loadingProgress === 1 ? 'READY!' : `LOADING LEVEL 1… ${Math.round(loadingProgress * 100)}%`}
                </div>
              </div>
            </div>
          </div>
        )}

        {appPhase === "game" && isPaused && !stats.isGameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-auto">
            <div className="pause-dialog mx-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border-4 border-slate-800 bg-white p-4 text-center font-['Gochi_Hand'] shadow-2xl md:p-8">
              <h2 className="mb-3 text-4xl font-bold text-slate-800 md:text-5xl">Game Paused</h2>
              {!useLegacyBrawler && stats.level !== FLIGHT_LEVEL && selectedCharacterId === 'xgod'
                && !playerSprite && new URLSearchParams(window.location.search).get('xgodRun') !== 'legacy'
                && new URLSearchParams(window.location.search).get('xgodArt') !== 'model' && (
                <p className="mb-3 text-lg text-slate-700">Tap Z / Up or JUMP: jump → double jump → butt bomb.<br />You can also pull the joystick down or press Down / S while airborne to slam.</p>
              )}
              {!useLegacyBrawler && stats.level !== FLIGHT_LEVEL && selectedCharacterId === 'zgod' && (
                <p className="mb-3 text-lg text-slate-700">Tap Z / Up or JUMP: jump → double jump → ground punch.<br />You can also pull the joystick down or press Down / S while airborne. Clears enemies and enemy shots across the screen.</p>
              )}
              {!useLegacyBrawler && stats.level !== FLIGHT_LEVEL && hasNewMobilityArt(selectedCharacterId) && (
                <p className="mb-3 text-lg text-slate-700">Tap Z / Up or JUMP: jump → double jump → {HERO_MOBILITY[selectedCharacterId].name}.<br />Down / S or joystick down also triggers the slam in midair.</p>
              )}
              {!useLegacyBrawler && stats.level !== FLIGHT_LEVEL && (
                <p className="mb-3 text-base text-slate-700">Hold Down / S or joystick down to crouch. Keep holding and press FIRE / Space / C to shoot low.</p>
              )}
              {!useLegacyBrawler && <p className="pause-equipment-hint mx-auto mb-3 max-w-sm text-base text-slate-700">{selectedCharacterId === 'zgod' ? 'Z-God is invincible. Her attacks defeat enemies in one hit.' : selectedCharacterId==='killer_kai'?'Kai keeps his built-in arm cannon when a powerup breaks. Powerups last three unblocked hits. Shields protect your equipment.':'Powerups survive three unblocked hits. Lose one and fight with your fists until you find another. Shields protect your equipment.'}</p>}
              <SoundControls settings={audioSettings} />
              <button
                onClick={togglePause}
                className="rounded-full border-4 border-slate-800 bg-blue-500 px-8 py-2 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-blue-600"
              >
                Resume Playing
              </button>
            </div>
          </div>
        )}

        {appPhase === "game" && stats.isVictory && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-amber-200/75 backdrop-blur-md pointer-events-auto">
            <div className="max-w-2xl -rotate-1 rounded-3xl border-8 border-slate-800 bg-white p-12 text-center font-['Gochi_Hand'] shadow-2xl">
              <h2 className="mb-2 text-7xl font-bold text-amber-500 underline decoration-slate-800">Universe Saved</h2>
              <p className="mb-6 text-2xl text-slate-600">You cleared all {useLegacyBrawler ? 4 : FINAL_LEVEL} levels and survived the most dangerous planet in the Unknown Universe.</p>
              <div className="mb-8 rounded-xl border-4 border-dashed border-slate-400 bg-slate-100 p-6">
                <p className="mb-2 text-4xl text-amber-500">{stats.score} Points</p>
                <p className="mb-2 text-3xl text-blue-600">{stats.souls} Souls Collected</p>
                <p className="mb-2 text-3xl text-red-500">{stats.monstersDefeated} Monsters Banished</p>
                <p className="text-3xl text-orange-500">{stats.hasFlameSword ? "Flame Sword Awakened" : "Flame Sword Lost In Battle"}</p>
                <p className="mt-2 text-3xl text-sky-500">{stats.shieldUnlocked ? "Ink Shield Unlocked" : "Ink Shield Never Claimed"}</p>
                <p className="mt-2 text-3xl text-pink-500">{stats.dinioUnlocked ? "Dinio Joined The Squad" : "Dinio Never Hatched"}</p>
                <p className="mt-2 text-3xl text-slate-500">{stats.doghostUnlocked ? "Doghost Floated In" : "Doghost Never Appeared"}</p>
                <p className="mt-2 text-3xl text-violet-700">{stats.teleportationCUnlocked ? "Teleportation C Emerged From The Void" : "Teleportation C Stayed Hidden"}</p>
              </div>
              <button
                onClick={restartGame}
                className="rounded-full border-4 border-slate-800 bg-green-500 px-16 py-6 text-4xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-green-600"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {appPhase === "game" && stats.isGameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/80 backdrop-blur-md pointer-events-auto">
            <div className="max-w-lg rotate-1 rounded-3xl border-8 border-slate-800 bg-white p-12 text-center font-['Gochi_Hand'] shadow-2xl">
              <h2 className="mb-2 text-7xl font-bold text-red-600 underline decoration-slate-800">Game Over</h2>
              <p className="mb-8 text-2xl italic text-slate-600">The Unknown Universe has reclaimed its doodles.</p>

              <div className="mb-8 rounded-xl border-4 border-dashed border-slate-400 bg-slate-100 p-6">
                <p className="mb-2 text-4xl text-amber-500">{stats.score} Points</p>
                <p className="mb-2 text-3xl text-blue-600">{stats.souls} Souls Collected</p>
                <p className="text-3xl text-red-500">{stats.monstersDefeated} Monsters Banished</p>
              </div>

              <button
                onClick={restartGame}
                className="rounded-full border-4 border-slate-800 bg-green-500 px-16 py-6 text-4xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-green-600"
              >
                Draw Again
              </button>
            </div>
          </div>
        )}

        <div className={`pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 ${useLegacyDesktopControls ? "lg:block" : ""}`}>
          <div className="rounded-full border border-white/10 bg-slate-900/60 px-6 py-2 backdrop-blur">
            <p className="text-sm text-white/60 font-['Indie_Flower']">
              The Unknown Universe - V1.6 (Leaner Build)
            </p>
          </div>
        </div>
      </div>

      {useLegacyDesktopControls && appPhase === 'game' && <div
        className={`relative h-full border-l-4 border-slate-700 bg-slate-50 transition-all duration-500 ease-in-out ${
          !useLegacyDesktopControls ? "hidden" : isIdeatorCollapsed || appPhase !== "game" ? "w-0" : "hidden w-0 lg:block lg:w-80"
        }`}
      >
        <button
          onClick={() => setIsIdeatorCollapsed(!isIdeatorCollapsed)}
          className={`absolute -left-10 top-1/2 z-50 rounded-l-xl bg-slate-700 p-2 text-white shadow-lg transition-colors hover:bg-slate-600 -translate-y-1/2 ${
            appPhase !== "game" || !useLegacyDesktopControls ? "hidden" : "hidden lg:block"
          }`}
          title={isIdeatorCollapsed ? "Open Workshop" : "Collapse Workshop"}
        >
          <div className="whitespace-nowrap px-1 text-xl font-bold -rotate-90 transform">
            {isIdeatorCollapsed ? "WORKSHOP" : "CLOSE"}
          </div>
        </button>
        <div className={`h-full overflow-hidden transition-opacity duration-300 ${isIdeatorCollapsed ? "opacity-0" : "opacity-100"}`}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-center text-slate-500 font-['Indie_Flower']">
                Loading Inspiration Lab...
              </div>
            }
          >
            <MonsterIdeator onSpriteUpload={handleSpriteUpload} isSpriteLoaded={Boolean(playerSprite)} />
          </Suspense>
        </div>
      </div>}
    </div>
  );
};

export default App;
