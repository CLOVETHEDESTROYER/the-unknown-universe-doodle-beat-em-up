
import React, { useState, useRef } from 'react';
import { generateMonsterIdea } from '../services/geminiService';
import { DoodleIdea } from '../types';

interface MonsterIdeatorProps {
  onSpriteUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSpriteLoaded?: boolean;
}

const MonsterIdeator: React.FC<MonsterIdeatorProps> = ({ onSpriteUpload, isSpriteLoaded }) => {
  const [idea, setIdea] = useState<DoodleIdea | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGetIdea = async () => {
    setLoading(true);
    const newIdea = await generateMonsterIdea();
    setIdea(newIdea);
    setLoading(false);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-80 h-full bg-slate-50 border-l-4 border-slate-300 p-6 overflow-y-auto font-['Indie_Flower']">
      <h2 className="text-3xl font-bold text-slate-800 mb-4 text-center">Inspiration Lab</h2>
      
      {/* Doodle Scanner Section */}
      <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
        <h3 className="text-xl font-bold text-blue-800 mb-2">Doodle Scanner</h3>
        <p className="text-sm text-blue-600 mb-4 leading-tight italic">
          Upload your son's "player_walk.png" to bring him to life!
        </p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png" 
          onChange={onSpriteUpload}
        />
        
        <button
          onClick={triggerUpload}
          className={`w-full font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 border-2 border-blue-800 ${
            isSpriteLoaded 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-white hover:bg-slate-100 text-blue-800'
          }`}
        >
          {isSpriteLoaded ? '✅ Character Scanned!' : '📸 Scan Character Doodle'}
        </button>
      </div>

      <p className="text-slate-600 mb-6 text-center leading-tight">
        Need a new Scribble Monster for the game? Ask the AI for an idea!
      </p>

      <button
        onClick={handleGetIdea}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? 'Thinking of doodles...' : 'Get New Doodle Idea! ✏️'}
      </button>

      {idea && (
        <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg transform -rotate-1 shadow-sm">
          <h3 className="text-2xl font-bold text-yellow-800 mb-2">The {idea.name}</h3>
          <p className="text-slate-700 mb-3">{idea.description}</p>
          <div className="border-t border-yellow-200 pt-2">
            <p className="font-bold text-yellow-900 mb-1">How to draw it:</p>
            <ul className="list-disc list-inside text-slate-600 text-sm">
              {idea.parts.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-slate-400 text-xs italic">
        "Every masterpiece starts with a messy scribble."
      </div>
    </div>
  );
};

export default MonsterIdeator;
