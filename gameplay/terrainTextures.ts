import Phaser from 'phaser';

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
