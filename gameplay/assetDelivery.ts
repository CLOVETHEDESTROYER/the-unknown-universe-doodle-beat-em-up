import manifest from './performanceAssetManifest.json';

/** Delivery copies preserve source dimensions and alpha; unknown/custom URLs pass through. */
export function deliveryImagePath(path: string): string {
  return (manifest.images as Record<string, string>)[path.replace(/^\//, '')] ?? path;
}

export function deliveryAtlasPath(path: string): string {
  return (manifest.atlases as Record<string, string>)[path.replace(/^\//, '')] ?? path;
}
