import manifest from './performanceAssetManifest.json';

/** Sprite delivery preserves frame geometry; roster cards may use display thumbnails. Unknown URLs pass through. */
export function deliveryImagePath(path: string): string {
  return (manifest.images as Record<string, string>)[path.replace(/^\//, '')] ?? path;
}

export function deliveryAtlasPath(path: string): string {
  return (manifest.atlases as Record<string, string>)[path.replace(/^\//, '')] ?? path;
}
