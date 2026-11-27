/**
 * Unified regression test runner for core Playwright gameplay checks.
 *
 * Usage:
 *   node scripts/run_regression_suite.mjs                # build + run core suite
 *   node scripts/run_regression_suite.mjs --skip-build   # reuse existing dist/
 *   node scripts/run_regression_suite.mjs --only loading,save
 *   node scripts/run_regression_suite.mjs --list
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, preview as createVitePreview } from "vite";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const SUITE = [
  {
    id: "loading",
    script: "scripts/test_loading_v1.mjs",
    serverMode: "preview",
    description: "Title/level-1 transfer budgets and lazy bundle split"
  },
  {
    id: "save",
    script: "scripts/test_campaign_save_v1.mjs",
    serverMode: "preview",
    description: "Campaign autosave, checkpoint resume, flight & story saves"
  },
  {
    id: "mobile",
    script: "scripts/test_mobile_edge_to_edge.mjs",
    serverMode: "preview",
    description: "Edge-to-edge phone/tablet/desktop viewport & touch targets"
  },
  {
    id: "metalslug",
    script: "scripts/test_metal_slug_v1.mjs",
    serverMode: "preview",
    description: "X-God directional aiming, Ink Grenades, explosive barrels, and 5-level strongpoints"
  },
  {
    id: "workshop",
    script: "scripts/test_workshop_crates_v2.mjs",
    serverMode: "dev",
    description: "Kai's Workshop crates, loot odds, wallet persistence & gallery"
  }
];

const argv = process.argv.slice(2);
if (argv.includes("--list")) {
  for (const item of SUITE) {
    console.log(`${item.id.padEnd(10)} (${item.serverMode.padEnd(7)}) ${item.script} - ${item.description}`);
  }
  process.exit(0);
}

const skipBuild = argv.includes("--skip-build");
const onlyIdx = argv.indexOf("--only");
const selectedIds =
  onlyIdx >= 0 && argv[onlyIdx + 1]
    ? new Set(argv[onlyIdx + 1].split(",").map((s) => s.trim()).filter(Boolean))
    : null;

const checks = selectedIds ? SUITE.filter((item) => selectedIds.has(item.id)) : SUITE;
if (checks.length === 0) {
  console.error("No matching checks. Run with --list to see available checks.");
  process.exit(1);
}

function runProcess(command, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: process.platform === "win32" && command === "npm"
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const needsPreview = checks.some((c) => c.serverMode === "preview");
const needsDev = checks.some((c) => c.serverMode === "dev");

if (needsPreview && (!skipBuild || !fs.existsSync(path.join(repoRoot, "dist", "index.html")))) {
  console.log("[suite] Running production build...");
  const buildCode = await runProcess("npm", ["run", "build"]);
  if (buildCode !== 0) process.exit(buildCode);
}

let previewServer = null;
let previewUrl = "";
let devServer = null;
let devUrl = "";

try {
  if (needsPreview) {
    previewServer = await createVitePreview({
      root: repoRoot,
      preview: { host: "127.0.0.1", port: 0, strictPort: false }
    });
    const addr = previewServer.httpServer.address();
    previewUrl = `http://127.0.0.1:${addr.port}`;
    console.log(`[suite] Preview server listening at ${previewUrl}`);
  }

  if (needsDev) {
    devServer = await createViteServer({
      root: repoRoot,
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "error"
    });
    await devServer.listen();
    const addr = devServer.httpServer.address();
    devUrl = `http://127.0.0.1:${addr.port}`;
    console.log(`[suite] Dev server listening at ${devUrl}`);
  }

  const results = [];
  for (const check of checks) {
    const started = Date.now();
    const url = check.serverMode === "dev" ? devUrl : previewUrl;
    console.log(`\n[suite] Running "${check.id}" (${check.script}) against ${url}...`);
    const code = await runProcess(process.execPath, [path.join(repoRoot, check.script)], {
      GAME_TEST_URL: url
    });
    results.push({ id: check.id, passed: code === 0, ms: Date.now() - started });
  }

  console.log("\n=== Regression Suite Summary ===");
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.id.padEnd(10)} (${(r.ms / 1000).toFixed(1)}s)`);
  }
  const failed = results.filter((r) => !r.passed).length;
  process.exit(failed === 0 ? 0 : 1);
} finally {
  if (previewServer) await new Promise((resolve) => previewServer.httpServer.close(resolve));
  if (devServer) await devServer.close();
}
