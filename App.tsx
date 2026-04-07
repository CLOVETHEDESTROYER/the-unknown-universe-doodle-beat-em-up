import React, { Suspense, lazy, useEffect, useState } from "react";
import GameEngine from "./components/GameEngine";
import UIOverlay from "./components/UIOverlay";
import { GameStats } from "./types";

const MonsterIdeator = lazy(() => import("./components/MonsterIdeator"));
type AppPhase = "start" | "intro" | "game";

const LEVEL_MUSIC: Partial<Record<number, string>> = {
  1: "/TheUnknownUniverseTheme.mp3",
  2: "/GraveYardDread.mp3",
  3: "/CaveDripLogic.mp3"
};
const START_SCREEN_MUSIC = "/GfunkAllStars.mp3";
const LEVEL_ONE_INTRO_IMAGE = "/Level1Intro.png";
const START_SCREEN_IMAGE = "/GameStartScreen.png";

const DEFAULT_STATS: GameStats = {
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
  maxSwordDurability: 2,
  shieldUnlocked: false,
  inkShieldReady: false,
  dinioUnlocked: false,
  hasDinio: false,
  doghostUnlocked: false,
  hasDoghost: false,
  teleportationCUnlocked: false,
  hasTeleportationC: false
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readBooleanQuery = (value: string | null) => value === "1" || value === "true" || value === "yes";
const shouldBypassStartFlow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return readBooleanQuery(params.get("autostart"));
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
  const inkShieldReadyParam = params.get("shieldReady");
  const swordDurabilityParam = Number.parseInt(params.get("swordDurability") ?? "", 10);
  const maxSwordDurabilityParam = Number.parseInt(params.get("maxSwordDurability") ?? "", 10);
  const maxSwordDurability = Number.isFinite(maxSwordDurabilityParam) ? clamp(maxSwordDurabilityParam, 1, 5) : DEFAULT_STATS.maxSwordDurability;

  return {
    ...DEFAULT_STATS,
    level: Number.isFinite(levelParam) ? clamp(levelParam, 1, 3) : DEFAULT_STATS.level,
    health: Number.isFinite(healthParam) ? clamp(healthParam, 1, DEFAULT_STATS.maxHealth) : DEFAULT_STATS.health,
    lives: Number.isFinite(livesParam) ? clamp(livesParam, 1, DEFAULT_STATS.maxLives) : DEFAULT_STATS.lives,
    score: Number.isFinite(scoreParam) ? Math.max(0, scoreParam) : DEFAULT_STATS.score,
    souls: Number.isFinite(soulsParam) ? Math.max(0, soulsParam) : DEFAULT_STATS.souls,
    monstersDefeated: Number.isFinite(killsParam) ? Math.max(0, killsParam) : DEFAULT_STATS.monstersDefeated,
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
    hasTeleportationC
  };
};

const App: React.FC = () => {
  const [stats, setStats] = useState<GameStats>(getInitialStats);
  const [appPhase, setAppPhase] = useState<AppPhase>(() => (shouldBypassStartFlow() ? "game" : "start"));
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isIdeatorCollapsed, setIsIdeatorCollapsed] = useState(false);
  const [playerSprite, setPlayerSprite] = useState<string | null>(null);
  const backgroundMusicRef = React.useRef<HTMLAudioElement | null>(null);
  const pendingMusicStartRef = React.useRef(false);

  useEffect(() => {
    if (appPhase !== "intro") {
      setIsIntroExiting(false);
      return;
    }

    const beginExitTimer = window.setTimeout(() => {
      setIsIntroExiting(true);
    }, 3200);

    const finishIntroTimer = window.setTimeout(() => {
      setAppPhase("game");
      setIsIntroExiting(false);
    }, 4000);

    return () => {
      window.clearTimeout(beginExitTimer);
      window.clearTimeout(finishIntroTimer);
    };
  }, [appPhase]);

  useEffect(() => {
    if (appPhase !== "start") {
      return;
    }

    const handleStartShortcut = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "enter" || key === " " || key === "s") {
        event.preventDefault();
        setAppPhase("intro");
      }
    };

    window.addEventListener("keydown", handleStartShortcut);
    return () => {
      window.removeEventListener("keydown", handleStartShortcut);
    };
  }, [appPhase]);

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
    const musicSrc =
      appPhase === "start"
        ? START_SCREEN_MUSIC
        : appPhase === "intro"
          ? LEVEL_MUSIC[1]
          : LEVEL_MUSIC[stats.level];

    if (!musicSrc) {
      pendingMusicStartRef.current = false;
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      return;
    }

    const shouldPauseMusic = appPhase === "game" && (isPaused || stats.isGameOver || stats.isVictory);
    let audio = backgroundMusicRef.current;

    if (!audio || !audio.src.endsWith(musicSrc)) {
      if (audio) {
        audio.pause();
      }
      audio = new Audio(musicSrc);
      audio.loop = true;
      audio.volume = 0.42;
      backgroundMusicRef.current = audio;
    }

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
  }, [appPhase, isPaused, stats.isGameOver, stats.isVictory, stats.level]);

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
      if (updated.lives <= 0 && !previous.isGameOver) {
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

  const restartGame = () => {
    setStats(DEFAULT_STATS);
    setIsPaused(false);
    setIsIntroExiting(false);
    setAppPhase(shouldBypassStartFlow() ? "game" : "start");
  };

  const startGameFromTitle = () => {
    setIsPaused(false);
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 transition-all duration-500">
      <div className="relative flex-grow overflow-hidden transition-all duration-500">
        {appPhase !== "start" && (
          <GameEngine
            key={`${playerSprite ? "custom-sprite" : "default"}-${stats.level}`}
            isPaused={appPhase !== "game" || isPaused || stats.isGameOver || stats.isVictory}
            currentLevel={stats.level}
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
            onStatsUpdate={handleStatsUpdate}
            onTogglePause={togglePause}
          />
        )}
        {appPhase === "game" && <UIOverlay stats={stats} isPaused={isPaused} onTogglePause={togglePause} />}

        {appPhase === "start" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950">
            <img
              src={START_SCREEN_IMAGE}
              alt="Unknown Universe game start screen"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/20" />
            <div className="relative z-10 flex h-full w-full items-end justify-center px-8 pb-[9vh]">
              <button
                id="start-game-button"
                onClick={startGameFromTitle}
                className="rounded-[2rem] border-4 border-slate-900/90 bg-white/95 px-12 py-5 font-['Gochi_Hand'] text-4xl font-bold tracking-wide text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                START GAME
              </button>
            </div>
          </div>
        )}

        {appPhase === "intro" && (
          <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden bg-slate-950">
            <div
              className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
                isIntroExiting ? "-translate-x-full" : "translate-x-0"
              }`}
            >
              <img
                src={LEVEL_ONE_INTRO_IMAGE}
                alt="Level 1 intro screen"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-10 flex justify-center">
                <div className="rounded-full border-2 border-white/70 bg-slate-950/65 px-6 py-2 font-['Gochi_Hand'] text-2xl tracking-wide text-white shadow-lg">
                  LOADING LEVEL 1...
                </div>
              </div>
            </div>
          </div>
        )}

        {appPhase === "game" && isPaused && !stats.isGameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-auto">
            <div className="rotate-[-2deg] rounded-3xl border-8 border-slate-800 bg-white p-12 text-center font-['Gochi_Hand'] shadow-2xl">
              <h2 className="mb-6 text-6xl font-bold text-slate-800">Game Paused</h2>
              <button
                onClick={togglePause}
                className="rounded-full border-4 border-slate-800 bg-blue-500 px-12 py-4 text-3xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-blue-600"
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
              <p className="mb-6 text-2xl text-slate-600">You cleared all 3 levels and carried your earned power-ups into the final battle.</p>
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

        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="rounded-full border border-white/10 bg-slate-900/60 px-6 py-2 backdrop-blur">
            <p className="text-sm text-white/60 font-['Indie_Flower']">
              The Unknown Universe - V1.6 (Leaner Build)
            </p>
          </div>
        </div>
      </div>

      <div
        className={`relative h-full border-l-4 border-slate-700 bg-slate-50 transition-all duration-500 ease-in-out ${
          isIdeatorCollapsed || appPhase !== "game" ? "w-0" : "w-80"
        }`}
      >
        <button
          onClick={() => setIsIdeatorCollapsed(!isIdeatorCollapsed)}
          className={`absolute -left-10 top-1/2 z-50 rounded-l-xl bg-slate-700 p-2 text-white shadow-lg transition-colors hover:bg-slate-600 -translate-y-1/2 ${
            appPhase !== "game" ? "hidden" : ""
          }`}
          title={isIdeatorCollapsed ? "Open Inspiration Lab" : "Collapse Inspiration Lab"}
        >
          <div className="whitespace-nowrap px-1 text-xl font-bold -rotate-90 transform">
            {isIdeatorCollapsed ? "IDEAS" : "CLOSE"}
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
      </div>
    </div>
  );
};

export default App;
