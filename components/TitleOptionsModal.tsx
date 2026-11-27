import React from "react";
import type { AudioSettings } from "../audio/gameAudio";
import { DIFFICULTY_OPTIONS } from "../gameplay/appBootstrap";
import type { DifficultyMode } from "../types";
import SoundControls from "./SoundControls";

interface TitleOptionsModalProps {
  panel: "options" | "credits";
  difficulty: DifficultyMode;
  audioSettings: AudioSettings;
  cameraMotionOption: React.ReactNode;
  useLegacyBrawler: boolean;
  onSelectDifficulty: (mode: DifficultyMode) => void;
  onClose: () => void;
}

const TitleOptionsModal: React.FC<TitleOptionsModalProps> = ({
  panel,
  difficulty,
  audioSettings,
  cameraMotionOption,
  useLegacyBrawler,
  onSelectDifficulty,
  onClose
}) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border-4 border-slate-900 bg-white/95 p-6 font-['Gochi_Hand'] shadow-[0_28px_80px_rgba(0,0,0,0.45)] md:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border-2 border-slate-800 bg-slate-100 px-3 py-1 text-lg text-slate-800 transition hover:bg-slate-200"
      >
        CLOSE
      </button>

      {panel === "options" ? (
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
                  onClick={() => onSelectDifficulty(option.mode)}
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
          {cameraMotionOption}
        </>
      ) : (
        <>
          <h2 className="mb-3 text-4xl font-bold text-slate-900 md:text-5xl">Credits</h2>
          <div className="space-y-4 text-slate-700 md:text-2xl">
            <p>
              <span className="font-bold text-slate-900">Project:</span> The Unknown Universe:
              Doodle Beat &apos;Em Up
            </p>
            <p>
              <span className="font-bold text-slate-900">Art Direction:</span> Hand-drawn character,
              prop, and level art from your custom asset set.
            </p>
            <p>
              <span className="font-bold text-slate-900">Tech:</span> React, Phaser, and Vite.
            </p>
            <p>
              <span className="font-bold text-slate-900">Additional sound effects:</span>{" "}
              <a
                className="underline"
                href="https://kenney.nl/assets/sci-fi-sounds"
                target="_blank"
                rel="noreferrer"
              >
                Sci-fi Sounds by Kenney
              </a>{" "}
              (CC0 1.0).
            </p>
            <p>
              <span className="font-bold text-slate-900">Current Build:</span>{" "}
              {useLegacyBrawler ? "Four" : "Six"}-level campaign with persistent power-ups, bosses,
              pals, and custom music.
            </p>
          </div>
        </>
      )}
    </div>
  </div>
);

export default TitleOptionsModal;
