import React, { useRef } from "react";

interface MonsterIdeatorProps {
  onSpriteUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSpriteLoaded?: boolean;
}

const MonsterIdeator: React.FC<MonsterIdeatorProps> = ({ onSpriteUpload, isSpriteLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-80 h-full overflow-y-auto border-l-4 border-slate-300 bg-slate-50 p-6 font-['Indie_Flower']">
      <h2 className="mb-4 text-center text-3xl font-bold text-slate-800">Character Workshop</h2>

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

      <div className="rotate-[-1deg] rounded-lg border-2 border-violet-200 bg-violet-50 p-4 shadow-sm">
        <h3 className="mb-2 text-2xl font-bold text-violet-900">Workshop Notes</h3>
        <p className="mb-3 text-slate-700">
          The live AI idea generator is currently offline for the hosted build, so this panel stays deployment-safe on Vercel.
        </p>
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li>Upload custom player art here whenever you want to test a new doodle.</li>
          <li>Enemy and helper concepting can be reconnected later behind a server-side API route.</li>
          <li>The game itself now runs without any Gemini dependency in the browser.</li>
        </ul>
      </div>

      <div className="mt-12 text-center text-xs italic text-slate-400">
        "Every masterpiece starts with a messy scribble."
      </div>
    </div>
  );
};

export default MonsterIdeator;
