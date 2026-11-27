import React from "react";
import type { AudioSettings } from "../audio/gameAudio";
import { FLIGHT_LEVEL } from "../campaign";
import { HERO_MOBILITY, hasNewMobilityArt } from "../gameplay/heroMobility";
import type { CharacterId } from "../types";
import DisplayControls from "./DisplayControls";
import SoundControls from "./SoundControls";

interface PauseOverlayProps {
  campaignActive: boolean;
  useLegacyBrawler: boolean;
  playerSprite: string | null;
  level: number;
  selectedCharacterId: CharacterId;
  saveError: string;
  audioSettings: AudioSettings;
  cameraMotionOption: React.ReactNode;
  onSaveAndQuit: () => void;
  onResume: () => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({
  campaignActive,
  useLegacyBrawler,
  playerSprite,
  level,
  selectedCharacterId,
  saveError,
  audioSettings,
  cameraMotionOption,
  onSaveAndQuit,
  onResume
}) => {
  const params = new URLSearchParams(window.location.search);
  const showXGodMobilityHint =
    !useLegacyBrawler &&
    level !== FLIGHT_LEVEL &&
    selectedCharacterId === "xgod" &&
    !playerSprite &&
    params.get("xgodRun") !== "legacy" &&
    params.get("xgodArt") !== "model";

  const equipmentHint =
    selectedCharacterId === "killer_klause"
      ? "Killer Klause keeps his present launcher. Space / HIT: three-hit melee combo (jab, hook, launcher uppercut). C / FIRE: launch a present. X / SP: call the medic and engineer elves."
      : selectedCharacterId === "turkey_king"
        ? "The Turkey King always keeps his royal weapons. Space / HIT: staff strike. C / TOSS: throw a turkey. X / SP: Royal Turkey Storm. Coins and hearts are available; other powerups are disabled."
        : selectedCharacterId === "zgod"
          ? "Z-God is invincible. Her attacks defeat enemies in one hit."
          : selectedCharacterId === "killer_kai"
            ? "Kai keeps his built-in arm cannon when a powerup breaks. Powerups last three unblocked hits. Shields protect your equipment."
            : "Powerups survive three unblocked hits. Lose one and fight with your fists until you find another. Shields protect your equipment.";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-auto">
      <div className="pause-dialog mx-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border-4 border-slate-800 bg-white p-4 text-center font-['Gochi_Hand'] shadow-2xl md:p-8">
        <h2 className="mb-3 text-4xl font-bold text-slate-800 md:text-5xl">Game Paused</h2>
        {campaignActive && !useLegacyBrawler && !playerSprite && (
          <div className="mb-3">
            <button
              onClick={onSaveAndQuit}
              className="rounded-full border-2 border-slate-800 bg-emerald-600 px-6 py-2 text-xl text-white"
            >
              Save &amp; Quit
            </button>
            <p role="status" className="mt-2 text-sm text-slate-600">
              {saveError ||
                "Autosaved in this browser. Continue returns to your last checkpoint; enemies reset."}
            </p>
          </div>
        )}
        {showXGodMobilityHint && (
          <p className="mb-3 text-lg text-slate-700">
            Tap Z / Up or JUMP: jump → double jump → butt bomb.
            <br />
            You can also press D-pad Down or press Down / S while airborne to slam.
          </p>
        )}
        {!useLegacyBrawler && level !== FLIGHT_LEVEL && selectedCharacterId === "zgod" && (
          <p className="mb-3 text-lg text-slate-700">
            Tap Z / Up or JUMP: jump → double jump → ground punch.
            <br />
            You can also press D-pad Down or press Down / S while airborne. Clears enemies and
            enemy shots across the screen.
          </p>
        )}
        {!useLegacyBrawler && level !== FLIGHT_LEVEL && hasNewMobilityArt(selectedCharacterId) && (
          <p className="mb-3 text-lg text-slate-700">
            Tap Z / Up or JUMP: jump → double jump → {HERO_MOBILITY[selectedCharacterId].name}.
            <br />
            Down / S or D-pad Down also triggers the slam in midair.
          </p>
        )}
        {!useLegacyBrawler && level !== FLIGHT_LEVEL && (
          <p className="mb-3 text-base text-slate-700">
            Hold Down / S to crouch and shoot low. Hold W (or Up in midair) to aim up/diagonal, and
            hold Down while firing in midair to shoot downward. Press G or E to toss an Ink Grenade.
            {selectedCharacterId === "xgod"
              ? " Firing right next to an enemy snaps into a fast close-quarters slash."
              : ""}
          </p>
        )}
        {!useLegacyBrawler && (
          <p className="pause-equipment-hint mx-auto mb-3 max-w-sm text-base text-slate-700">
            {equipmentHint}
          </p>
        )}
        <SoundControls settings={audioSettings} />
        {cameraMotionOption}
        <DisplayControls />
        <button
          onClick={onResume}
          className="rounded-full border-4 border-slate-800 bg-blue-500 px-8 py-2 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 hover:bg-blue-600"
        >
          Resume Playing
        </button>
      </div>
    </div>
  );
};

export default PauseOverlay;
