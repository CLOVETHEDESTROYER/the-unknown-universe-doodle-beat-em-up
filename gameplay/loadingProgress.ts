import type Phaser from 'phaser';

export const GAME_LOADING_EVENT = 'unknown-universe:loading';
export function reportGameLoading(progress: number) {
  window.dispatchEvent(new CustomEvent(GAME_LOADING_EVENT, {detail: progress}));
}

export function trackSceneLoading(loader: Phaser.Loader.LoaderPlugin) {
  let last = -1;
  reportGameLoading(0);
  loader.on('progress', (value: number) => {
    // Atlas pages join the queue after their metadata; completion waits for scene creation.
    const percent = Math.min(99, Math.floor(value * 100));
    if (percent > last) { last = percent; reportGameLoading(percent / 100); }
  });
}
