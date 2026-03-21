
import React, { useState } from 'react';
import GameEngine from './components/GameEngine';
import UIOverlay from './components/UIOverlay';
import MonsterIdeator from './components/MonsterIdeator';
import { GameStats } from './types';

const App: React.FC = () => {
  const [stats, setStats] = useState<GameStats>({
    souls: 0,
    monstersDefeated: 0,
    health: 100,
    maxHealth: 100,
    lives: 3,
    maxLives: 3,
    level: 1,
    isGameOver: false
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isIdeatorCollapsed, setIsIdeatorCollapsed] = useState(false);
  const [playerSprite, setPlayerSprite] = useState<string | null>(null);

  const handleStatsUpdate = (newStats: Partial<GameStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      if (updated.lives <= 0 && !prev.isGameOver) {
        return { ...updated, isGameOver: true };
      }
      return updated;
    });
  };

  const togglePause = () => {
    if (stats.isGameOver) return;
    setIsPaused(prev => !prev);
  };

  const restartGame = () => {
    setStats({
      souls: 0,
      monstersDefeated: 0,
      health: 100,
      maxHealth: 100,
      lives: 3,
      maxLives: 3,
      level: 1,
      isGameOver: false
    });
    setIsPaused(false);
  };

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPlayerSprite(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden transition-all duration-500">
      <div className="flex-grow relative overflow-hidden transition-all duration-500">
        {/* We key the engine by playerSprite to force a restart when a new asset is loaded */}
        <GameEngine 
          key={playerSprite ? 'custom-sprite' : 'default'}
          isPaused={isPaused || stats.isGameOver} 
          currentLevel={stats.level}
          playerSprite={playerSprite}
          onStatsUpdate={handleStatsUpdate} 
          onTogglePause={togglePause}
        />
        <UIOverlay stats={stats} isPaused={isPaused} onTogglePause={togglePause} />
        
        {isPaused && !stats.isGameOver && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-white p-12 rounded-3xl border-8 border-slate-800 shadow-2xl transform -rotate-2 font-['Gochi_Hand'] text-center">
              <h2 className="text-6xl font-bold text-slate-800 mb-6">Game Paused!</h2>
              <button 
                onClick={togglePause}
                className="bg-blue-500 hover:bg-blue-600 text-white text-3xl px-12 py-4 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 border-4 border-slate-800"
              >
                RESUME PLAYING ▶️
              </button>
            </div>
          </div>
        )}

        {stats.isGameOver && (
          <div className="absolute inset-0 bg-red-900/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-white p-12 rounded-3xl border-8 border-slate-800 shadow-2xl transform rotate-1 font-['Gochi_Hand'] text-center max-w-lg">
              <h2 className="text-7xl font-bold text-red-600 mb-2 underline decoration-slate-800">GAME OVER</h2>
              <p className="text-2xl text-slate-600 mb-8 italic">The Unknown Universe has reclaimed its doodles...</p>
              
              <div className="bg-slate-100 p-6 rounded-xl border-4 border-dashed border-slate-400 mb-8">
                <p className="text-3xl text-blue-600 mb-2">✨ {stats.souls} Souls Collected</p>
                <p className="text-3xl text-red-500">👾 {stats.monstersDefeated} Monsters Banished</p>
              </div>

              <button 
                onClick={restartGame}
                className="bg-green-500 hover:bg-green-600 text-white text-4xl px-16 py-6 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 border-4 border-slate-800"
              >
                DRAW AGAIN? ✏️
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-6 py-2 bg-slate-900/60 backdrop-blur rounded-full border border-white/10">
            <p className="text-white/60 font-['Indie_Flower'] text-sm">
              The Unknown Universe - V1.4 (Custom Sprite Support)
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Monster Ideator */}
      <div className={`relative h-full transition-all duration-500 ease-in-out border-l-4 border-slate-700 bg-slate-50 ${isIdeatorCollapsed ? 'w-0' : 'w-80'}`}>
        <button 
          onClick={() => setIsIdeatorCollapsed(!isIdeatorCollapsed)}
          className="absolute -left-10 top-1/2 -translate-y-1/2 bg-slate-700 text-white p-2 rounded-l-xl shadow-lg hover:bg-slate-600 transition-colors z-50"
          title={isIdeatorCollapsed ? "Open Inspiration Lab" : "Collapse Inspiration Lab"}
        >
          <div className="text-xl font-bold transform -rotate-90 whitespace-nowrap px-1">
             {isIdeatorCollapsed ? '💡 IDEAS' : '❌ CLOSE'}
          </div>
        </button>
        <div className={`h-full overflow-hidden transition-opacity duration-300 ${isIdeatorCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <MonsterIdeator onSpriteUpload={handleSpriteUpload} isSpriteLoaded={!!playerSprite} />
        </div>
      </div>
    </div>
  );
};

export default App;
