import type Phaser from 'phaser';

export const CAMERA_MOTION_KEY = 'unknownUniverse.cameraMotion';

export function readCameraMotion() {
  try { return localStorage.getItem(CAMERA_MOTION_KEY) !== 'off'; }
  catch { return true; }
}

/** The bob is a render offset. Follow, bounds and fixed HUD elements keep their usual coordinates. */
export class FootfallCamera {
  private dip = 0;
  private ahead = 0;
  private renderOffset = 0;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly camera: Phaser.Cameras.Scene2D.Camera, private readonly enabled: () => boolean) {
    camera.on('prerender',this.applyBob);
    camera.on('postrender',this.restoreBob);
  }

  update(delta: number, stride: number, velocityX: number, runSpeed: number, planted: boolean, steady: boolean, followY: number, distancePerFrame=27) {
    if (!this.enabled() || this.reducedMotion.matches) {
      this.clear(followY);
      return;
    }
    const speed = Math.max(-1,Math.min(1,velocityX/runSpeed));
    const lookingAhead = steady && Math.abs(speed)>.14;
    const bobbing = lookingAhead && planted && Math.abs(speed)>.25;
    // X God's eight frames are spaced 27 world units apart, with two footfalls per cycle.
    const phase = stride / (distancePerFrame*4) * Math.PI * 2;
    const pulse = Math.pow((1+Math.cos(phase))/2,3);
    this.dip += ((bobbing ? 2.8*Math.abs(speed)*pulse : 0)-this.dip)*(1-Math.exp(-delta/40));
    this.ahead += ((lookingAhead ? speed*38 : 0)-this.ahead)*(1-Math.exp(-delta/160));
    this.camera.setFollowOffset(-this.ahead,followY);
  }

  clear(followY: number) {
    this.dip = this.ahead = 0;
    this.camera.setFollowOffset(0,followY);
  }

  read() {
    return { enabled:this.enabled()&&!this.reducedMotion.matches, dip:Number(this.dip.toFixed(2)), ahead:Number(this.ahead.toFixed(2)) };
  }

  private applyBob = () => {
    if (this.renderOffset || !this.enabled() || this.reducedMotion.matches) return;
    this.renderOffset = this.dip;
    this.camera.scrollY += this.renderOffset;
  };

  private restoreBob = () => {
    this.camera.scrollY -= this.renderOffset;
    this.renderOffset = 0;
  };

  destroy() {
    this.camera.off('prerender',this.applyBob);
    this.camera.off('postrender',this.restoreBob);
    this.restoreBob();
  }
}
