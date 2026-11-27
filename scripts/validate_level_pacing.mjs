/**
 * Fast static layout & pacing validator across all 5 ground levels (1, 2, 3, 4, 6).
 * Uses the repo's existing esbuild to load TypeScript gameplay modules cleanly in Node.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import os from "node:os";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpFile = path.join(os.tmpdir(), `tuu-validate-${process.pid}.mjs`);

const entrySource = `
export { LEVELS } from "./gameplay/platformerLevels";
export { battlefieldPropsForLevel } from "./gameplay/battlefieldLayouts";
export { setPiecesForLevel } from "./gameplay/interactiveSetPieces";
export { encountersForLevel } from "./gameplay/routeEncounters";
`;

await build({
  stdin: { contents: entrySource, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpFile,
  plugins: [
    {
      name: "stub-browser-runtime",
      setup(b) {
        b.onResolve({ filter: /^phaser$|^\.\.\/audio\/gameAudio$/ }, (args) => ({
          path: args.path,
          namespace: "stub"
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export default {}; export const playSfx = () => {};",
          loader: "js"
        }));
      }
    }
  ]
});

try {
  const { LEVELS, battlefieldPropsForLevel, setPiecesForLevel, encountersForLevel } = await import(
    pathToFileURL(tmpFile).href
  );

  const GROUND_LEVELS = [1, 2, 3, 4, 6];
  const errors = [];
  const warnings = [];

  const hasSupportAt = (platforms, x, floorY, tolerance = 6) =>
    platforms.some(
      (p) => x >= p.x - 10 && x <= p.x + p.w + 10 && Math.abs(p.y - floorY) <= tolerance
    );

  for (const lvl of GROUND_LEVELS) {
    const plan = LEVELS[lvl];
    assert(plan, `Missing LevelPlan for L${lvl}`);
    const props = battlefieldPropsForLevel(lvl, plan.endX);
    const setPieces = setPiecesForLevel(lvl, plan.endX);
    const encounters = encountersForLevel(lvl, plan.endX);

    for (const prop of props) {
      if (!hasSupportAt(plan.platforms, prop.x, prop.floor)) {
        errors.push(`L${lvl} prop "${prop.id}" (${prop.kind}) at (${prop.x}, floor=${prop.floor}) has no supporting platform`);
      }
    }
    for (const tower of setPieces.towers) {
      if (!hasSupportAt(plan.platforms, tower.x, tower.floor)) {
        errors.push(`L${lvl} watchtower "${tower.id}" at (${tower.x}, floor=${tower.floor}) has no supporting platform`);
      }
    }
    for (const gate of setPieces.blastGates) {
      if (!hasSupportAt(plan.platforms, gate.x, gate.floor)) {
        errors.push(`L${lvl} blast gate "${gate.id}" at (${gate.x}, floor=${gate.floor}) has no supporting platform`);
      }
    }
    for (const cp of plan.checkpoints) {
      const supported = plan.platforms.some((p) => cp.x >= p.x && cp.x <= p.x + p.w && p.y >= cp.y);
      if (!supported) {
        errors.push(`L${lvl} checkpoint at (${cp.x}, ${cp.y}) is over open air`);
      }
    }
    const strongpoints = encounters.filter((e) => e.kind === "combat" && e.hold);
    for (const sp of strongpoints) {
      const width = sp.exit - sp.entry;
      if (width < 480) {
        errors.push(`L${lvl} strongpoint "${sp.id}" width ${width}px is too cramped (< 480px)`);
      }
    }
    const landmarks = [
      ...setPieces.towers.map((t) => ({ id: t.id, x: t.x })),
      ...setPieces.blastGates.map((g) => ({ id: g.id, x: g.x })),
      ...setPieces.drawbridges.map((b) => ({ id: b.id, x: b.bridgeX }))
    ].sort((a, b) => a.x - b.x);
    for (let i = 1; i < landmarks.length; i++) {
      const gap = landmarks[i].x - landmarks[i - 1].x;
      if (gap < 200) {
        warnings.push(`L${lvl} close landmarks: ${landmarks[i - 1].id} (${landmarks[i - 1].x}) -> ${landmarks[i].id} (${landmarks[i].x}) = ${gap}px`);
      }
    }

    console.log(
      `[validate] L${lvl} "${plan.title}": endX=${plan.endX}, platforms=${plan.platforms.length}, props=${props.length}, towers=${setPieces.towers.length}, gates=${setPieces.blastGates.length}, bridges=${setPieces.drawbridges.length}, trestles=${setPieces.collapsingBridges.length}, strongpoints=${strongpoints.length}`
    );
  }

  if (warnings.length) {
    console.warn("\nSpacing warnings:\n - " + warnings.join("\n - "));
  }
  if (errors.length) {
    console.error("\nValidation FAILED:\n - " + errors.join("\n - "));
    process.exit(1);
  }
  console.log("\nAll 5 ground levels passed layout & pacing validation!");
} finally {
  fs.rmSync(tmpFile, { force: true });
}
