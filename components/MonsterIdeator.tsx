import React, { useRef, useState } from "react";
import { generateMonsterIdea, hasGeminiApiKey } from "../services/geminiService";
import { DoodleIdea } from "../types";

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
    <div className="w-80 h-full overflow-y-auto border-l-4 border-slate-300 bg-slate-50 p-6 font-['Indie_Flower']">
      <h2 className="mb-4 text-center text-3xl font-bold text-slate-800">Inspiration Lab</h2>

      <div className="mb-8 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
        <h3 className="mb-2 text-xl font-bold text-blue-800">Doodle Scanner</h3>
        <p className="mb-4 text-sm italic leading-tight text-blue-600">
          Upload your son&apos;s "player_walk.png" to bring him to life!
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
          className={`w-full rounded-xl border-2 border-blue-800 px-4 py-3 font-bold shadow-md transition-all active:scale-95 ${
            isSpriteLoaded
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-white text-blue-800 hover:bg-slate-100"
          }`}
        >
          {isSpriteLoaded ? "Character Scanned" : "Scan Character Doodle"}
        </button>
      </div>

      <p className="mb-4 text-center leading-tight text-slate-600">
        Need a new Scribble Monster for the game? Ask the idea generator for something weird.
      </p>

      <p className="mb-3 text-center text-xs leading-tight text-slate-500">
        {hasGeminiApiKey
          ? "Gemini is connected for fresh monster prompts."
          : "No GEMINI_API_KEY found, so this panel will use a local doodle idea deck."}
      </p>

      <button
        onClick={handleGetIdea}
        disabled={loading}
        className="w-full rounded-full bg-blue-500 px-4 py-3 font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 hover:bg-blue-600"
      >
        {loading ? "Thinking of doodles..." : hasGeminiApiKey ? "Get New Doodle Idea" : "Draw From Local Idea Deck"}
      </button>

      {idea && (
        <div className="mt-8 rotate-[-1deg] rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <h3 className="mb-2 text-2xl font-bold text-yellow-800">The {idea.name}</h3>
          <p className="mb-3 text-slate-700">{idea.description}</p>
          <div className="border-t border-yellow-200 pt-2">
            <p className="mb-1 font-bold text-yellow-900">How to draw it:</p>
            <ul className="list-inside list-disc text-sm text-slate-600">
              {idea.parts.map((part, index) => (
                <li key={index}>{part}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-xs italic text-slate-400">
        "Every masterpiece starts with a messy scribble."
      </div>
    </div>
  );
};

export default MonsterIdeator;
