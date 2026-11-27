import React from "react";
import { FINAL_LEVEL } from "../campaign";
import type { GameStats } from "../types";

interface VictoryOverlayProps {
  stats: GameStats;
  useLegacyBrawler: boolean;
  onPlayAgain: () => void;
}

const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  stats,
  useLegacyBrawler,
  onPlayAgain
}) => (
  <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-amber-200/75 p-3 backdrop-blur-md pointer-events-auto">
    <div className="my-auto w-full max-w-2xl shrink-0 rounded-3xl border-4 border-slate-800 bg-white p-4 sm:p-6 text-center font-['Gochi_Hand'] shadow-2xl">
      <h2 className="mb-2 text-4xl sm:text-6xl font-bold text-amber-500 underline decoration-slate-800">
        Universe Saved
      </h2>
      <p className="mb-3 text-base sm:text-xl text-slate-600">
        You cleared all {useLegacyBrawler ? 4 : FINAL_LEVEL} levels and survived the most dangerous
        planet in the Unknown Universe.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-x-3 rounded-xl border-2 border-dashed border-slate-400 bg-slate-100 p-3">
        <p className="mb-2 text-xl sm:text-3xl text-amber-500">{stats.score} Points</p>
        <p className="mb-2 text-base sm:text-xl text-blue-600">{stats.souls} Souls Collected</p>
        <p className="mb-2 text-base sm:text-xl text-red-500">
          {stats.monstersDefeated} Monsters Banished
        </p>
        <p className="text-base sm:text-xl text-orange-500">
          {stats.hasFlameSword ? "Flame Sword Awakened" : "Flame Sword Lost In Battle"}
        </p>
        <p className="mt-2 text-base sm:text-xl text-sky-500">
          {stats.shieldUnlocked ? "Ink Shield Unlocked" : "Ink Shield Never Claimed"}
        </p>
        <p className="mt-2 text-base sm:text-xl text-pink-500">
          {stats.dinioUnlocked ? "Dinio Joined The Squad" : "Dinio Never Hatched"}
        </p>
        <p className="mt-2 text-base sm:text-xl text-slate-500">
          {stats.doghostUnlocked ? "Doghost Floated In" : "Doghost Never Appeared"}
        </p>
        <p className="mt-2 text-base sm:text-xl text-violet-700">
          {stats.teleportationCUnlocked
            ? "Teleportation C Emerged From The Void"
            : "Teleportation C Stayed Hidden"}
        </p>
      </div>
      <button
        onClick={onPlayAgain}
        className="rounded-full border-4 border-slate-800 bg-green-500 px-8 py-3 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-green-600"
      >
        Play Again
      </button>
    </div>
  </div>
);

export default VictoryOverlay;
