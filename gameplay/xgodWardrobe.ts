import type Phaser from 'phaser';
import type {CosmeticLoadout} from './shopCatalog';
import anchors from './xgodWardrobeAnchors.json';

const eyes: Record<string, (number[] | null)[]> = anchors;

export function paintWardrobe(ctx: CanvasRenderingContext2D, key: string, frame: number, style: CosmeticLoadout, overlayOnly = false) {
  const poses = eyes[key];
  if (!poses) return;
  const eye = poses[frame];
  if (style.outfit === 'blue-kicks' && (eye?.[2] ?? 0) < 90 && (key !== 'hero_death' || frame < 2)) {
    const {width, height} = ctx.canvas;
    const top = Math.floor(height * .72);
    const pixels = ctx.getImageData(0, top, width, height - top);
    const data = pixels.data;
    const hasGun = key.startsWith('runner_blaster-') || key.startsWith('xgod_kai_arm');
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      const x = (i / 4) % width, y = top + Math.floor(i / (4 * width));
      const barrelArea = hasGun && eye && x > eye[0] && y < 451;
      const nearHead = eye && Math.abs(x - eye[0]) < width * .15 && y < eye[1] + width * .07;
      // Only the lime sneaker accents below the knees receive the new palette.
      if (!barrelArea && !nearHead && a && g > 72 && g > r * .9 && b < g * .64 && r < g * 1.08) {
        data[i] = g * .34;
        data[i + 1] = g * .78;
        data[i + 2] = Math.min(255, g * 1.2);
      } else if (overlayOnly) data[i + 3] = 0;
    }
    if (overlayOnly) ctx.clearRect(0, 0, width, height);
    ctx.putImageData(pixels, 0, top);
  } else if (overlayOnly) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  if (!eye || style.face === 'classic' && style.head === 'classic') return;
  ctx.save();
  ctx.translate(eye[0], eye[1]);
  ctx.rotate((eye[2] ?? 0) * Math.PI / 180);
  if (ctx.canvas.width === 256) ctx.scale(.38, .38);
  if (ctx.canvas.width === 384) ctx.scale(.36, .36);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#242033';
  ctx.lineWidth = 4;
  if (style.head === 'sunset-band') {
    ctx.beginPath();
    ctx.moveTo(-54, -25);
    ctx.quadraticCurveTo(-31, -40, 6, -36);
    ctx.lineTo(12, -25);
    ctx.quadraticCurveTo(-23, -30, -49, -15);
    ctx.closePath();
    ctx.fillStyle = '#dc526c';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-43, -26);
    ctx.quadraticCurveTo(-22, -35, 1, -31);
    ctx.strokeStyle = '#ffac92';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (style.face === 'rooftop-shades') {
    ctx.beginPath();
    ctx.moveTo(-40, -6);
    ctx.lineTo(-16, -9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-17, -11);
    ctx.lineTo(20, -12);
    ctx.quadraticCurveTo(22, 13, 5, 15);
    ctx.quadraticCurveTo(-14, 17, -17, -11);
    ctx.closePath();
    ctx.fillStyle = '#37304e';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 1);
    ctx.lineTo(2, -6);
    ctx.moveTo(2, 6);
    ctx.lineTo(14, -3);
    ctx.strokeStyle = '#a4e7ef';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw the dressed version of the current frame over its live visual using the same transform. */
export class XGodWardrobe {
  private readonly layer: Phaser.GameObjects.Image;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private previous = '';
  constructor(private readonly scene: Phaser.Scene) {
    this.texture = scene.textures.createCanvas('xgod_wardrobe_layer', 768, 512)!;
    this.layer = scene.add.image(0, 0, this.texture).setVisible(false);
  }
  update(source: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | undefined, style: CosmeticLoadout) {
    if (!source?.active || !source.visible || !eyes[source.texture.key] ||
        style.head === 'classic' && style.face === 'classic' && style.outfit === 'classic') {
      this.layer.setVisible(false);
      return;
    }
    const frame = source.frame, key = source.texture.key;
    const signature = [key, frame.name, style.head, style.face, style.outfit].join('/');
    if (signature !== this.previous) {
      this.previous = signature;
      const w = frame.realWidth, h = frame.realHeight;
      if (this.texture.width !== w || this.texture.height !== h) this.texture.setSize(w, h);
      const ctx = this.texture.context;
      ctx.clearRect(0, 0, w, h);
      if (style.outfit === 'blue-kicks') {
        ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
          frame.x, frame.y, frame.cutWidth, frame.cutHeight);
      }
      paintWardrobe(ctx, key, Number(frame.name), style, true);
      this.texture.refresh();
      this.layer.setTexture(this.texture.key);
    }
    this.layer.setPosition(source.x, source.y).setOrigin(source.originX, source.originY)
      .setScale(source.scaleX, source.scaleY).setRotation(source.rotation)
      .setFlip(source.flipX, source.flipY).setDepth(source.depth + .01).setAlpha(source.alpha).setVisible(true);
    this.layer.setTint(source.tintTopLeft, source.tintTopRight, source.tintBottomLeft, source.tintBottomRight);
  }
  read() { return this.layer.visible ? this.previous : null; }
  destroy() {
    this.layer.destroy();
    this.scene.textures.remove(this.texture.key);
  }
}
