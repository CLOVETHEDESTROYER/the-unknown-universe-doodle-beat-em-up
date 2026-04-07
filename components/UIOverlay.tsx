import React, { useState } from "react";
import { GameStats } from "../types";

interface UIOverlayProps {
  stats: GameStats;
  isPaused: boolean;
  onTogglePause: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, isPaused, onTogglePause }) => {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isObjectiveCollapsed, setIsObjectiveCollapsed] = useState(false);
  const healthPercent = (stats.health / stats.maxHealth) * 100;
  const chapterName = stats.level === 1 ? "THE SCRATCH" : stats.level === 2 ? "THE GRID" : "THE FURNACE";
  const levelObjective =
    stats.level === 1
      ? "Survive the schoolyard alley, unlock your first pals, and defeat the Ink Behemoth to awaken the first weapon power-up."
      : stats.level === 2
        ? "Carry the Flame Sword through the neon grid and defeat the boss to unlock the Ink Shield."
        : "Bring the Flame Sword and Ink Shield into the furnace district and finish the final boss.";

  return (
    <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-6 font-['Gochi_Hand']">
      <div className="pointer-events-none absolute right-4 top-4 z-30 w-full max-w-[12rem] px-2 lg:right-6 lg:top-5">
        <div className="rounded-xl border-4 border-slate-900 bg-white/90 px-3 py-2 shadow-xl backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-700">
            <span className="text-xs text-red-700">X-GOD HEALTH</span>
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

      <div className="relative pointer-events-auto">
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
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-white">
              CHAPTER: {chapterName}
            </span>
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

      <div className="relative pointer-events-auto">
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
            <li>Ink Shield blocks one hit when charged</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
