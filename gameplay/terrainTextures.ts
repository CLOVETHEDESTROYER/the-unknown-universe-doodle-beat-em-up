import Phaser from 'phaser';

const TERRAIN_PALETTES: Record<number, { ink: number; mineral: number; haze: number }> = {
  1: { ink: 0x422d64, mineral: 0xdec9f4, haze: 0xffe3a5 },
  2: { ink: 0x182c32, mineral: 0x9ac694, haze: 0xa9cdb9 },
  3: { ink: 0x3e1f26, mineral: 0xffa15a, haze: 0xf18a54 },
  4: { ink: 0x253b32, mineral: 0xbdd3a1, haze: 0xb7c6a7 },
  5: { ink: 0x202946, mineral: 0xa8b7d8, haze: 0xb0bce5 },
  6: { ink: 0x211c3d, mineral: 0xb991df, haze: 0xae9af7 },
};

function grain(seed: number) {
  return ((Math.imul(seed ^ (seed >>> 13), 1597334677) >>> 0) % 997) / 997;
}

/** Break up tile repetition while leaving the walkable top edge easy to read. */
export function drawTerrainDetail(art: Phaser.GameObjects.Graphics, rect: { x: number; y: number; w: number; h: number }, level: number) {
  const { ink, mineral } = TERRAIN_PALETTES[level];
  const { x, y, w, h } = rect;
  for (let offset = 12; offset < w - 10; offset += 42) {
    const variation = grain(x + y + offset);
    const px = x + offset + variation * 8;
    const seamY = y + 12 + variation * 12;
    art.lineStyle(1, ink, .38).lineBetween(px, seamY, px + 7, seamY + 4)
      .lineBetween(px + 7, seamY + 4, px + 3, seamY + 9);
    art.lineStyle(2, mineral, .32).lineBetween(px + 11, seamY + 8, px + 20, seamY + 5);
    if (h <= 56 && variation > .32) {
      const edge = y + h - 2;
      art.fillStyle(ink, .48).fillPoints([
        { x: px - 7, y: edge }, { x: px + 15, y: edge },
        { x: px + 9, y: edge + 4 + variation * 4 }, { x: px + 1, y: edge + 5 },
      ], true);
    } else if (h > 56 && variation > .36) {
      const py = y + 30 + grain(x + offset * 5) * Math.min(h - 38, 54);
      art.lineStyle(2, ink, .26).lineBetween(px, py, px + 12, py + 6)
        .lineBetween(px + 12, py + 6, px + 18, py + 3);
    }
  }
}

/** Distant stipple and haze sit behind actors and scroll with the landscape. */
export function addBackdropDetail(scene: Phaser.Scene, level: number, span: number) {
  const { haze } = TERRAIN_PALETTES[level];
  const art = scene.add.graphics().setScrollFactor(.44, 0).setDepth(-16);
  for (let x = 0; x < span; x += 69) {
    const px = x + grain(x + level) * 42;
    const py = 215 + grain(x + level * 31) * 285;
    art.fillStyle(haze, .13).fillCircle(px, py, 1 + grain(x + 32) * 2.5);
    if (grain(x + 12) > .42) {
      art.fillStyle(haze, .025).fillEllipse(px, py + 30, 135 + grain(x + 8) * 230, 12 + grain(x + 16) * 28);
    }
  }
  return art;
}

/**
 * TileSprite owns a power-of-two canvas and GPU pattern for every instance.
 * Prepare the pattern at its displayed size first, rather than duplicating
 * the full-resolution source artwork for every ledge in a level.
 */
export function addTerrainTiles(
  scene: Phaser.Scene, x: number, y: number, width: number, height: number,
  key: string, frame?: string, scaleX = 1, scaleY = scaleX,
): Phaser.GameObjects.TileSprite {
  const source = scene.textures.getFrame(key, frame);
  const repeatWidth = source.width * scaleX;
  const repeatHeight = source.height * scaleY;
  const patternWidth = Math.max(1, Math.min(512, Math.ceil(repeatWidth)));
  const patternHeight = Math.max(1, Math.min(512, Math.ceil(repeatHeight)));
  const patternKey = `terrain:${JSON.stringify([key, frame, patternWidth, patternHeight])}`;

  if (!scene.textures.exists(patternKey)) {
    const image = source.source.image;
    if (image instanceof Uint8Array) throw new Error(`Terrain requires image artwork: ${key}`);
    const pattern = scene.textures.createCanvas(patternKey, patternWidth, patternHeight);
    if (!pattern) throw new Error(`Unable to create terrain pattern: ${key}`);
    pattern.context.drawImage(image, source.cutX, source.cutY,
      source.cutWidth, source.cutHeight, 0, 0, patternWidth, patternHeight);
    pattern.refresh();
  }

  return scene.add.tileSprite(x, y, width, height, patternKey)
    .setTileScale(repeatWidth / patternWidth, repeatHeight / patternHeight);
}
