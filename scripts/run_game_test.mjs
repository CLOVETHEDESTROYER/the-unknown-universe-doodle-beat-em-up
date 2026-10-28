import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const defaultActionsFile = path.join(repoRoot, "tests", "game-smoke.actions.json");
const defaultOutputDir = path.join(repoRoot, "output", "web-game");
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const webGameClientPath = path.join(codexHome, "skills", "develop-web-game", "scripts", "web_game_playwright_client.js");

function parseArgs(argv) {
  const args = {
    port: 4173,
    headless: true,
    iterations: 3,
    pauseMs: 200,
    skipBuild: false,
    actionsFile: defaultActionsFile,
    screenshotDir: defaultOutputDir,
    query: "",
    startLevel: null,
    startSword: false,
    startSwordUnlocked: false,
    startSwordDurability: null,
    startShield: false,
    startShieldUnlocked: false,
    startShieldReady: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--port" && next) {
      args.port = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--headless" && next) {
      args.headless = next !== "false" && next !== "0";
      i += 1;
    } else if (arg === "--iterations" && next) {
      args.iterations = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--pause-ms" && next) {
      args.pauseMs = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--actions-file" && next) {
      args.actionsFile = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === "--screenshot-dir" && next) {
      args.screenshotDir = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === "--query" && next) {
      args.query = next.replace(/^\?/, "");
      i += 1;
    } else if (arg === "--start-level" && next) {
      args.startLevel = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--start-sword") {
      args.startSword = true;
    } else if (arg === "--start-sword-unlocked") {
      args.startSwordUnlocked = true;
    } else if (arg === "--start-sword-durability" && next) {
      args.startSwordDurability = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--start-shield") {
      args.startShield = true;
    } else if (arg === "--start-shield-unlocked") {
      args.startShieldUnlocked = true;
    } else if (arg === "--start-shield-ready" && next) {
      args.startShieldReady = next !== "false" && next !== "0";
      i += 1;
    } else if (arg === "--skip-build") {
      args.skipBuild = true;
    }
  }

  return args;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function createStaticServer(port) {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      const relativePath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
      const normalizedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
      let filePath = path.join(distDir, normalizedPath);

      try {
        const fileStats = await stat(filePath);
        if (fileStats.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
      } catch {
        filePath = path.join(distDir, "index.html");
      }

      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": getContentType(filePath) });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

async function runWebGameClient(args) {
  if (!fs.existsSync(webGameClientPath)) {
    throw new Error(`Missing web game client at ${webGameClientPath}`);
  }

  const queryParams = new URLSearchParams(args.query);
  if (!queryParams.has("autostart")) {
    queryParams.set("autostart", "1");
  }
  if (Number.isFinite(args.startLevel)) {
    queryParams.set("level", String(args.startLevel));
  }
  if (args.startSword) {
    queryParams.set("sword", "1");
  }
  if (args.startSwordUnlocked || args.startSword) {
    queryParams.set("swordUnlocked", "1");
  }
  if (Number.isFinite(args.startSwordDurability)) {
    queryParams.set("swordDurability", String(args.startSwordDurability));
  }
  if (args.startShield) {
    queryParams.set("shield", "1");
  }
  if (args.startShieldUnlocked || args.startShield) {
    queryParams.set("shieldUnlocked", "1");
  }
  if (typeof args.startShieldReady === "boolean") {
    queryParams.set("shieldReady", args.startShieldReady ? "1" : "0");
  }
  const queryString = queryParams.toString();

  const clientSource = await readFile(webGameClientPath, "utf8");
  const runnableClientSource = `process.argv.splice(1, 0, "web_game_playwright_client.js");\n${clientSource}`;

  await runCommand(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      runnableClientSource,
      "--",
      "--url",
      `http://127.0.0.1:${args.port}${queryString ? `/?${queryString}` : ""}`,
      "--actions-file",
      args.actionsFile,
      "--iterations",
      String(args.iterations),
      "--pause-ms",
      String(args.pauseMs),
      "--headless",
      args.headless ? "true" : "false",
      "--screenshot-dir",
      args.screenshotDir
    ],
    { cwd: repoRoot }
  );
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(args.actionsFile)) {
    throw new Error(`Missing actions file at ${args.actionsFile}`);
  }

  fs.rmSync(args.screenshotDir, { recursive: true, force: true });
  fs.mkdirSync(args.screenshotDir, { recursive: true });

  if (!args.skipBuild) {
    await runCommand("npm.cmd", ["run", "build"]);
  }

  const server = await createStaticServer(args.port);

  try {
    await runWebGameClient(args);
    console.log(`Gameplay smoke test artifacts written to ${args.screenshotDir}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
