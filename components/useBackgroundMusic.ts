import { useEffect, useRef } from "react";
import { ALLEY_MAIN_MUSIC } from "../audio/alleyRescueAudio";
import type { AudioSettings } from "../audio/gameAudio";
import { FINAL_LEVEL } from "../campaign";
import { BOSS_MUSIC, LEVEL_MUSIC, START_SCREEN_MUSIC } from "../gameplay/appBootstrap";
import { STORY_CHAPTERS, type StoryChapterId } from "../story/campaignStory";

interface BackgroundMusicOptions {
  appPhase: string;
  storyChapter: StoryChapterId | null;
  gameSuspended: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  level: number;
  activeBossId: string | null | undefined;
  useLegacyBrawler: boolean;
  audioSettings: AudioSettings;
}

export function useBackgroundMusic({
  appPhase,
  storyChapter,
  gameSuspended,
  isGameOver,
  isVictory,
  level,
  activeBossId,
  useLegacyBrawler,
  audioSettings
}: BackgroundMusicOptions) {
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const pendingMusicStartRef = useRef(false);

  useEffect(() => {
    const bossTrack = BOSS_MUSIC[level];
    const musicSrc =
      appPhase === "alleyRescue"
        ? null
        : appPhase === "workshop"
          ? ALLEY_MAIN_MUSIC
          : appPhase === "start" || appPhase === "characterSelect"
            ? START_SCREEN_MUSIC
            : appPhase === "story"
              ? LEVEL_MUSIC[storyChapter ? STORY_CHAPTERS[storyChapter].musicLevel : 1]
              : appPhase === "intro"
                ? LEVEL_MUSIC[1]
                : appPhase === "game" &&
                    !useLegacyBrawler &&
                    bossTrack &&
                    activeBossId === bossTrack.bossId
                  ? bossTrack.src
                  : LEVEL_MUSIC[useLegacyBrawler && level === 4 ? FINAL_LEVEL : level];

    if (!musicSrc) {
      pendingMusicStartRef.current = false;
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      return;
    }

    const shouldPauseMusic = appPhase === "game" && (gameSuspended || isGameOver || isVictory);
    let audio = backgroundMusicRef.current;

    if (!audio || !audio.src.endsWith(musicSrc)) {
      if (audio) {
        audio.pause();
      }
      audio = new Audio(musicSrc);
      audio.preload = "none";
      audio.loop = true;
      backgroundMusicRef.current = audio;
    }
    audio.volume = audioSettings.music;
    audio.muted = audioSettings.muted;

    const tryPlay = () => {
      if (!backgroundMusicRef.current || shouldPauseMusic) return;
      backgroundMusicRef.current
        .play()
        .then(() => {
          pendingMusicStartRef.current = false;
        })
        .catch(() => {
          pendingMusicStartRef.current = true;
        });
    };

    const unlockPlayback = () => {
      if (!pendingMusicStartRef.current) return;
      tryPlay();
    };

    if (shouldPauseMusic) {
      audio.pause();
      pendingMusicStartRef.current = false;
    } else {
      tryPlay();
    }

    window.addEventListener("pointerdown", unlockPlayback);
    window.addEventListener("keydown", unlockPlayback);

    return () => {
      window.removeEventListener("pointerdown", unlockPlayback);
      window.removeEventListener("keydown", unlockPlayback);
    };
  }, [
    appPhase,
    storyChapter,
    gameSuspended,
    isGameOver,
    isVictory,
    level,
    activeBossId,
    useLegacyBrawler,
    audioSettings.music,
    audioSettings.muted
  ]);

  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);
}
