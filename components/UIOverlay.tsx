import React, { useState } from "react";
import { CHARACTER_CONFIGS, CHARACTER_IDS } from "../characters";
import { CharacterId, DifficultyMode, GameStats } from "../types";

interface UIOverlayProps {
  stats: GameStats;
  difficulty: DifficultyMode;
  selectedCharacterId: CharacterId;
  isPaused: boolean;
  useLegacyDesktopControls?: boolean;
  onTogglePause: () => void;
  onJumpToLevel: (level: number) => void;
  onTestCharacterMode: (characterId: CharacterId, powered: boolean) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, difficulty, selectedCharacterId, isPaused, useLegacyDesktopControls = false, onTogglePause, onJumpToLevel, onTestCharacterMode }) => {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isObjectiveCollapsed, setIsObjectiveCollapsed] = useState(false);
  const showDevTools = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("devTools") === "1";
  const selectedCharacter = CHARACTER_CONFIGS[selectedCharacterId];
  const healthPercent = (stats.health / stats.maxHealth) * 100;
  const chapterName =
    stats.level === 1 ? "THE SCRATCH"
      : stats.level === 2 ? "THE GRAVEYARD"
      : stats.level === 3 ? "THE FURNACE"
      : "THE DREAD PLANET";
  const levelObjective =
    stats.level === 1
      ? "Survive the schoolyard alley, unlock your first pals, and defeat the Ink Behemoth to awaken the first weapon power-up."
      : stats.level === 2
        ? "Carry the Flame Sword through the graveyard and defeat Killina's Daughter to unlock the Ink Shield."
        : stats.level === 3
          ? "Bring the Flame Sword and Ink Shield into the furnace district and beat the void gate."
          : "Enter the most dangerous planet in the Unknown Universe, claim the Gravity Core, and defeat the Void Regent.";

  return (
    <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-start justify-between p-6 font-['Gochi_Hand']">
      <div className={`absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-2 bg-slate-950/58 px-3 py-2 text-white backdrop-blur-sm ${useLegacyDesktopControls ? "lg:hidden" : ""}`}>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-5">{selectedCharacter.name}</p>
          <p className="text-sm leading-4 text-violet-100">L{stats.level} | {difficulty}</p>
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <div className="mb-1 flex justify-between text-xs">
            <span>HEALTH</span>
            <span>{Math.ceil(stats.health)}/{stats.maxHealth}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-white/70 bg-slate-900">
            <div
              className={`${healthPercent > 50 ? "bg-green-400" : healthPercent > 20 ? "bg-yellow-300" : "bg-red-500"} h-full`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
        <div className="text-right text-sm leading-4">
          <p>{stats.score} pts</p>
          <p>{stats.monstersDefeated} KO</p>
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="pointer-events-auto rounded-full border-2 border-white/80 bg-slate-900/80 px-3 py-1 text-base font-bold active:scale-95"
        >
          {isPaused ? "PLAY" : "II"}
        </button>
      </div>

      {showDevTools && (
        <div className="pointer-events-auto absolute bottom-16 right-4 z-40 hidden w-[25rem] rounded-2xl border-4 border-slate-900 bg-white/90 p-3 shadow-xl backdrop-blur-sm xl:right-6 xl:block">
          <p className="mb-2 text-center text-sm font-bold tracking-wide text-slate-700">DEV TEST TOOLS</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onJumpToLevel(level)}
              className={`rounded-xl border-2 border-slate-900 px-3 py-2 text-lg font-bold shadow-[2px_2px_0_rgba(15,23,42,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:scale-95 ${
                stats.level === level ? "bg-violet-700 text-white" : "bg-amber-100 text-slate-900 hover:bg-amber-200"
              }`}
            >
              L{level}
            </button>
            ))}
          </div>
          <div className="mt-3 border-t-2 border-slate-300 pt-3">
            <p className="mb-2 text-center text-xs font-bold tracking-wide text-slate-700">PLAYER MODE TEST</p>
            <div className="grid grid-cols-5 gap-1.5">
              {CHARACTER_IDS.map((characterId) => {
              const character = CHARACTER_CONFIGS[characterId];
              const isActive = selectedCharacterId === characterId;
              return (
                <button
                  key={characterId}
                  type="button"
                  onClick={() => onTestCharacterMode(characterId, true)}
                  title={`Load ${character.name} powered mode`}
                  className={`min-h-[2.5rem] rounded-lg border-2 px-1 text-sm font-bold leading-tight shadow-[1px_1px_0_rgba(15,23,42,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:scale-95 ${
                    isActive
                      ? "border-violet-900 bg-violet-700 text-white"
                      : "border-slate-900 bg-slate-100 text-slate-900 hover:bg-violet-100"
                  }`}
                >
                  {character.name.replace("Teleportation C", "TC")}
                </button>
              );
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onTestCharacterMode(selectedCharacterId, false)}
                className={`rounded-lg border-2 border-slate-900 px-2 py-1 text-sm font-bold shadow-[1px_1px_0_rgba(15,23,42,1)] transition active:scale-95 ${
                  stats.characterPowerUnlocked || stats.hasFlameSword ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-800 text-white"
                }`}
              >
                BASE MODE
              </button>
              <button
                type="button"
                onClick={() => onTestCharacterMode(selectedCharacterId, true)}
                className={`rounded-lg border-2 border-slate-900 px-2 py-1 text-sm font-bold shadow-[1px_1px_0_rgba(15,23,42,1)] transition active:scale-95 ${
                  stats.characterPowerUnlocked || stats.hasFlameSword ? "bg-orange-500 text-white" : "bg-orange-100 text-slate-900 hover:bg-orange-200"
                }`}
              >
                POWERED MODE
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`pointer-events-none absolute right-4 top-4 z-30 hidden w-full max-w-[12rem] px-2 lg:right-6 lg:top-5 ${useLegacyDesktopControls ? "lg:block" : ""}`}>
        <div className="rounded-xl border-4 border-slate-900 bg-white/90 px-3 py-2 shadow-xl backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-700">
            <span className="text-xs text-red-700">{selectedCharacter.name.toUpperCase()} HEALTH</span>
            <span>{Math.ceil(stats.health)}/{stats.maxHealth}</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-200 p-[1px] shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                healthPercent > 50 ? "bg-green-500" : healthPercent > 20 ? "bg-yellow-400" : "bg-red-500"
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`relative hidden pointer-events-auto ${useLegacyDesktopControls ? "lg:block" : ""}`}>
        <button
          onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
          className="absolute -right-4 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow-md transition-transform hover:scale-110 active:scale-95"
        >
          {isStatsCollapsed ? ">" : "<"}
        </button>

        <div
          className={`min-w-[300px] origin-left rounded-2xl border-4 border-slate-800 bg-white/95 p-5 shadow-xl transition-all duration-300 ${
            isStatsCollapsed ? "-translate-x-full scale-x-0 opacity-0" : "scale-x-100 opacity-100"
          }`}
        >
          <div className="mb-3 flex items-center justify-between border-b-2 border-slate-200 pb-1">
            <h1 className="text-3xl font-bold text-slate-800">Level {stats.level}</h1>
            <div className="flex gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-white">
                CHAPTER: {chapterName}
              </span>
              <span className="rounded-full bg-violet-700 px-3 py-1 text-sm text-white">
                MODE: {difficulty}
              </span>
            </div>
          </div>
          <div className="mb-3 rounded-xl border-2 border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-lg font-bold text-violet-700">PLAYER: {selectedCharacter.name}</p>
            <p className="text-base text-slate-700">{selectedCharacter.subtitle} - {selectedCharacter.rewardName}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>HEALTH</span>
                <span>{Math.ceil(stats.health)}%</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full border-2 border-slate-800 bg-slate-200 p-[2px] shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    healthPercent > 50 ? "bg-green-500" : healthPercent > 20 ? "bg-yellow-400" : "bg-red-500"
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 p-2">
              <span className="text-lg font-bold text-slate-600">LIVES:</span>
              <div className="flex gap-2 text-2xl text-red-500">
                {[...Array(stats.maxLives)].map((_, index) => (
                  <span key={index} className={`transition-opacity ${index < stats.lives ? "opacity-100" : "opacity-20 grayscale"}`}>
                    *
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xl text-amber-600">
                Score: <span className="font-bold">{stats.score}</span>
              </p>
              <p className="text-xl text-blue-600">
                Souls: <span className="font-bold">{stats.souls}</span>
              </p>
              <p className="text-xl text-red-600">
                Kills: <span className="font-bold">{stats.monstersDefeated}</span>
              </p>
            </div>

            <div className="rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-2 text-slate-700">
              <p className="text-lg font-bold text-orange-600">Power-Ups</p>
              <p className="text-base">
                {stats.swordUnlocked
                  ? stats.hasFlameSword
                    ? `Flame Sword equipped (${stats.swordDurability}/${stats.maxSwordDurability})`
                    : "Flame Sword unlocked, but dropped. Pick it up again."
                  : "No sword yet. Beat the level 1 boss to earn it."}
              </p>
              {selectedCharacterId !== "xgod" && (
                <p className="mt-2 text-base text-orange-700">
                  {stats.characterPowerUnlocked
                    ? `${selectedCharacter.rewardName} awakened. ${selectedCharacter.name}'s attacks now use their card power.`
                    : `No ${selectedCharacter.rewardName} yet. Beat the level 1 boss to earn it.`}
                </p>
              )}
              <p className="mt-2 text-base text-sky-700">
                {stats.shieldUnlocked
                  ? stats.inkShieldReady
                    ? "Ink Shield charged and ready to block one hit."
                    : "Ink Shield unlocked and recharging."
                  : "No shield yet. Beat the level 2 boss to earn it."}
              </p>
              <p className="mt-2 text-base text-pink-700">
                {stats.dinioUnlocked
                  ? stats.hasDinio
                    ? "Dinio is active and spitting pink orb shots at enemies."
                    : "Dinio unlocked, but not currently active."
                  : "No Dinio yet. Find the glowing pink orb in level 1."}
              </p>
              <p className="mt-2 text-base text-slate-600">
                {stats.doghostUnlocked
                  ? stats.hasDoghost
                    ? "Doghost is active and firing ghostly sound waves at enemies."
                    : "Doghost unlocked, but not currently active."
                  : "No Doghost yet. Find the glowing white orb in level 2."}
              </p>
              <p className="mt-2 text-base text-violet-700">
                {stats.teleportationCUnlocked
                  ? stats.hasTeleportationC
                    ? "Teleportation C is active and shadow-running alongside you."
                    : "Teleportation C unlocked, but not currently active."
                  : "No Teleportation C yet. Find the shiny black orb in level 3."}
              </p>
              <p className="mt-2 text-base text-indigo-700">
                {stats.gravityCoreUnlocked
                  ? `Gravity Core charged (${stats.gravityCoreCharges}/3). Your space-world hits land harder.`
                  : "No Gravity Core yet. Find it on the Dread Planet."}
              </p>
            </div>
          </div>

          <button
            onClick={onTogglePause}
            className={`mt-6 w-full rounded-xl border-2 border-slate-800 px-4 py-3 font-bold text-white shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-95 ${
              isPaused ? "bg-green-500" : "bg-amber-500"
            }`}
          >
            {isPaused ? "RESUME (P)" : "PAUSE (P)"}
          </button>
        </div>
      </div>

      <div className={`relative hidden pointer-events-auto ${useLegacyDesktopControls ? "lg:block" : ""}`}>
        <button
          onClick={() => setIsObjectiveCollapsed(!isObjectiveCollapsed)}
          className="absolute -left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow-md transition-transform hover:scale-110 active:scale-95"
        >
          {isObjectiveCollapsed ? "<" : ">"}
        </button>

        <div
          className={`max-w-xs origin-right rounded-2xl border-4 border-slate-800 bg-white/90 p-5 shadow-lg transition-all duration-300 ${
            isObjectiveCollapsed ? "translate-x-full scale-x-0 opacity-0" : "scale-x-100 opacity-100"
          }`}
        >
          <h2 className="mb-2 text-2xl font-bold text-slate-800 underline decoration-4 decoration-blue-400">Objective</h2>
          <div className="mb-4 text-slate-700">
            <p>{levelObjective}</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="font-bold text-blue-700">CONTROLS:</li>
            <li>Arrow keys: Move</li>
            <li>Space: Attack</li>
            <li>Z: Jump</li>
            <li>X: Dash</li>
            <li>F: Fullscreen</li>
            <li>5 souls: Heart kit</li>
            <li>Smash props for supplies</li>
            <li>Carry power-ups between levels</li>
            <li>Pink orb unlocks Dinio in level 1</li>
            <li>White orb unlocks Doghost in level 2</li>
            <li>Black orb unlocks Teleportation C in level 3</li>
            <li>Gravity Core empowers level 4 attacks</li>
            <li>Ink Shield blocks one hit when charged</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
