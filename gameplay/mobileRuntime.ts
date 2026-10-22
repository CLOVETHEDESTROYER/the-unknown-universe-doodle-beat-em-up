import Phaser from 'phaser';
import manifestData from './mobileAssetManifest.json';

type MobileSheet = { url: string; width: number; height: number; count: number };
const manifest = manifestData as { sheets: Record<string, MobileSheet>; images: Record<string, string> };

export function isMobileGraphicsEnabled(): boolean {
  const quality = new URLSearchParams(window.location.search).get('quality');
  if (quality === 'desktop') return false;
  return quality === 'mobile' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
}

export function mobileImagePath(path: string): string {
  return isMobileGraphicsEnabled() ? manifest.images[path.replace(/^\//, '')] ?? path : path;
}

export function loadGameImage(loader: Phaser.Loader.LoaderPlugin, key: string, path: string) {
  return loader.image(key, mobileImagePath(path));
}

/** Trimmed atlas frames retain their original logical size and numeric names. */
export function loadGameSheet(loader: Phaser.Loader.LoaderPlugin, key: string, path: string,
  config: Phaser.Types.Loader.FileTypes.ImageFrameConfig) {
  const sheet = isMobileGraphicsEnabled() ? manifest.sheets[path.replace(/^\//, '')] : undefined;
  if (!sheet || sheet.width !== config.frameWidth || sheet.height !== config.frameHeight
    || (config.startFrame ?? 0) > 0 || config.margin || config.spacing) {
    return loader.spritesheet(key, path, config);
  }
  loader.multiatlas(key, sheet.url, '/mobile-v1/');
  // Match spritesheet defaults and endFrame semantics before scene creation.
  loader.once(Phaser.Loader.Events.COMPLETE, () => {
    if (!loader.scene.textures.exists(key)) return;
    const texture = loader.scene.textures.get(key);
    // Packing order across pages may differ from chronological frame order.
    texture.firstFrame = '0';
    if (config.endFrame !== undefined && config.endFrame >= 0 && config.endFrame < sheet.count - 1) {
      for (let n = config.endFrame! + 1; n < sheet.count; n++) {
        // Phaser 3.90 remove() does not update frameTotal itself.
        if (texture.remove(String(n))) texture.frameTotal--;
      }
    }
  });
  return loader;
}

export function mobileGameOptions(): Partial<Phaser.Types.Core.GameConfig> {
  return isMobileGraphicsEnabled() ? {
    resolution: 1,
    loader: { maxParallelDownloads: 2, imageLoadType: 'HTMLImageElement' },
  } : {};
}

export interface GameViewport { width: number; height: number; safeLeft: number; safeRight: number }

/** Keep the established world height; wide phones reveal additional world horizontally. */
export function landscapeGameViewport(host: HTMLElement): GameViewport {
  const {width, height}=host.getBoundingClientRect();
  const wide=isMobileGraphicsEnabled()&&width>height&&height>=120;
  const viewWidth=wide?Math.max(1024,Math.round(576*width/height)):1024;
  let safeLeft=22,safeRight=22;
  if(wide){
    const probe=document.createElement('div');
    probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
    document.body.append(probe);
    const style=getComputedStyle(probe),scale=Math.max(viewWidth/width,576/height);
    safeLeft=Math.max(22,(parseFloat(style.paddingLeft)||0)*scale+12);
    safeRight=Math.max(22,(parseFloat(style.paddingRight)||0)*scale+12);
    probe.remove();
  }
  return {width:viewWidth,height:576,safeLeft,safeRight};
}

/** Resize the render viewport in place; rotation must not recreate the run. */
export function watchGameViewport(game: Phaser.Game, host: HTMLElement, layout?: (view: GameViewport) => void) {
  let frame = 0;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (game.isBooted && game.scale) {
        if(layout){
          const view=landscapeGameViewport(host);
          if(game.scale.gameSize.width!==view.width||game.scale.gameSize.height!==view.height)game.scale.setGameSize(view.width,view.height);
          else game.scale.refresh();
          layout(view);
        }else game.scale.refresh();
      }
    });
  };
  const lost = (event: Event) => {
    event.preventDefault();
    window.dispatchEvent(new Event('unknown-universe:graphics-lost'));
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  resize();
  const bindCanvas = () => game.canvas?.addEventListener('webglcontextlost', lost);
  if (game.canvas) bindCanvas();
  else game.events.once(Phaser.Core.Events.BOOT, bindCanvas);
  return () => {
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    cancelAnimationFrame(frame);
    game.events.off(Phaser.Core.Events.BOOT, bindCanvas);
    game.canvas?.removeEventListener('webglcontextlost', lost);
  };
}
