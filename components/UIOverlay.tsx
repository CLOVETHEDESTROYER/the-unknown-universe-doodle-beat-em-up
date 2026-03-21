
import React, { useState } from 'react';
import { GameStats } from '../types';

interface UIOverlayProps {
  stats: GameStats;
  isPaused: boolean;
  onTogglePause: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, isPaused, onTogglePause }) => {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isObjectiveCollapsed, setIsObjectiveCollapsed] = useState(false);
  const healthPercent = (stats.health / stats.maxHealth) * 100;

  return (
    <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start font-['Gochi_Hand']">
      {/* Left Side: Stats Panel */}
      <div className="relative pointer-events-auto">
        <button 
          onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
          className="absolute -right-4 top-4 bg-slate-800 text-white w-8 h-8 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          {isStatsCollapsed ? '▶️' : '◀️'}
        </button>
        
        <div className={`bg-white/95 p-5 rounded-2xl shadow-xl border-4 border-slate-800 transform transition-all duration-300 origin-left min-w-[300px] ${
          isStatsCollapsed ? 'scale-x-0 opacity-0 -translate-x-full' : 'scale-x-100 opacity-100'
        }`}>
          <div className="flex justify-between items-center border-b-2 border-slate-200 pb-1 mb-3">
             <h1 className="text-3xl font-bold text-slate-800">Level {stats.level}</h1>
             <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm">CHAPTER: {stats.level === 1 ? 'THE SCRATCH' : 'THE GRID'}</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                <span className="flex items-center gap-1">❤️ HEALTH</span>
                <span>{Math.ceil(stats.health)}%</span>
              </div>
              <div className="w-full bg-slate-200 h-5 rounded-full border-2 border-slate-800 overflow-hidden shadow-inner p-[2px]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    healthPercent > 50 ? 'bg-green-500' : healthPercent > 20 ? 'bg-yellow-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border-2 border-dashed border-slate-300">
              <span className="text-lg font-bold text-slate-600">LIVES:</span>
              <div className="flex gap-2">
                {[...Array(stats.maxLives)].map((_, i) => (
                  <span key={i} className={`text-2xl transition-opacity ${i < stats.lives ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}>
                    💖
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <p className="text-xl text-blue-600">✨ Souls: <span className="font-bold">{stats.souls}</span></p>
              <p className="text-xl text-red-600">👾 Kills: <span className="font-bold">{stats.monstersDefeated}</span></p>
            </div>
          </div>
          
          <button 
            onClick={onTogglePause}
            className={`mt-6 w-full py-3 px-4 rounded-xl font-bold text-white transition-all border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-95 ${
              isPaused ? 'bg-green-500' : 'bg-amber-500'
            }`}
          >
            {isPaused ? '▶️ RESUME (P)' : '⏸ PAUSE (P)'}
          </button>
        </div>
      </div>

      {/* Right Side: Objective Panel */}
      <div className="relative pointer-events-auto">
        <button 
          onClick={() => setIsObjectiveCollapsed(!isObjectiveCollapsed)}
          className="absolute -left-4 top-4 bg-slate-800 text-white w-8 h-8 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          {isObjectiveCollapsed ? '◀️' : '▶️'}
        </button>

        <div className={`bg-white/90 p-5 rounded-2xl shadow-lg border-4 border-slate-800 transform transition-all duration-300 origin-right max-w-xs ${
          isObjectiveCollapsed ? 'scale-x-0 opacity-0 translate-x-full' : 'scale-x-100 opacity-100'
        }`}>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 underline decoration-blue-400 decoration-4">Objective</h2>
          <div className="mb-4 text-slate-700">
            {stats.level === 1 ? (
               stats.monstersDefeated < 15 ? (
                 <p>Banish <span className="font-bold text-red-500">{15 - stats.monstersDefeated}</span> more doodles to face the Ink Behemoth!</p>
               ) : (
                 <p className="text-purple-600 font-bold animate-pulse">INK BURST ACTIVE! DODGE THE BLOBS!</p>
               )
            ) : (
              <p>Level 2: The Grid. Faster monsters, deadlier Boss special moves.</p>
            )}
          </div>
          <ul className="text-lg text-slate-700 space-y-2 text-sm">
            <li className="font-bold text-blue-700">⌨️ CONTROLS:</li>
            <li>✨ SPACE: Attack</li>
            <li>🦘 Z: Jump (Dodge!)</li>
            <li>💨 X: Dash (Invincible!)</li>
            <li>❤️ 5 Souls = Heart Kit</li>
            <li>🗑️ Smash cans for supplies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
