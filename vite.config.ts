import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Assets loaded directly without mobileImagePath/loadGameImage (index.html or legacy GameEngine.tsx)
 * that must stay in dist/ even when a /performance-v1/ WebP copy also exists.
 */
const DIRECT_ASSET_KEEP = new Set([
  'cards/xgod-card.png',
  'doodles/dinio_orb.png',
  'doodles/dinio_shot.png',
  'doodles/shadow_oval.png',
  'doodles/teleportation_c_orb.png',
  'gold_pickup.png',
  'heart_sprite.png',
  'ink_shield_power.png',
  'xgod_sword_reward_fit.png'
]);

const SUPERSEDED_DIST_DIRS = [
  'mobile-v1',
  'cutscenes/prologue-v1',
  'characters/turkey-king-v1',
  'characters/turkey-king-v2'
];

function removePathStats(target: string): { files: number; bytes: number } {
  if (!fs.existsSync(target)) return { files: 0, bytes: 0 };
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    fs.rmSync(target, { force: true });
    return { files: 1, bytes: stat.size };
  }
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const sub = removePathStats(path.join(target, entry.name));
    files += sub.files;
    bytes += sub.bytes;
  }
  fs.rmSync(target, { recursive: true, force: true });
  return { files, bytes };
}

function pruneRedundantDistAssets(): Plugin {
  let outDir = 'dist';
  return {
    name: 'prune-redundant-dist-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle(error) {
      if (error) return;
      let removedFiles = 0;
      let removedBytes = 0;
      const track = (target: string) => {
        const res = removePathStats(target);
        removedFiles += res.files;
        removedBytes += res.bytes;
      };

      // 1. Remove build-input/superseded directories (100% replaced by performance-v1 or newer versions).
      for (const relDir of SUPERSEDED_DIST_DIRS) {
        track(path.join(outDir, relDir));
      }

      // 2. Remove raw cutscene PNGs when their WebP delivery copy exists (story/campaignStory.ts loads .webp).
      const cutscenesDir = path.join(outDir, 'cutscenes');
      if (fs.existsSync(cutscenesDir)) {
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.png') && fs.existsSync(full.replace(/\.png$/, '.webp'))) {
              track(full);
            }
          }
        };
        walk(cutscenesDir);
      }

      // 3. Remove raw PNGs superseded by /performance-v1/*.webp unless directly loaded outside mobileImagePath.
      const manifestPath = path.resolve(__dirname, 'gameplay/performanceAssetManifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
          images?: Record<string, string>;
        };
        for (const [rel, mapped] of Object.entries(manifest.images ?? {})) {
          if (rel.startsWith('mobile-v1/') || DIRECT_ASSET_KEEP.has(rel) || /\/reward\.png$/.test(rel)) {
            continue;
          }
          const deliveryFile = path.join(outDir, mapped.replace(/^\//, ''));
          if (fs.existsSync(deliveryFile)) {
            track(path.join(outDir, rel));
          }
        }
      }

      // 4. Remove internal review-only HTML pages from production output.
      track(path.join(outDir, 'seasonal/christmas-v1/review.html'));

      if (removedFiles > 0) {
        console.log(
          `[prune-redundant-dist-assets] Pruned ${removedFiles} redundant files (${(removedBytes / 1048576).toFixed(1)} MB) from ${path.basename(outDir)}/`
        );
      }
    }
  };
}

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: "0.0.0.0"
    },
    plugins: [react(), pruneRedundantDistAssets()],
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("react")) {
              return "react-vendor";
            }

            if (id.includes("phaser")) {
              return "phaser-vendor";
            }

            return "vendor";
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        phaser: path.resolve(__dirname, "node_modules/phaser/dist/phaser-arcade-physics.js")
      }
    }
  };
});
