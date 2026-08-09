import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "playwright";

const FRAME_MS = 1000 / 60;

function parseArgs(argv) {
  const args = {
    url: null,
    actionsFile: null,
    iterations: 1,
    pauseMs: 200,
    headless: true,
    screenshotDir: "output/web-game"
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--url" && next) {
      args.url = next;
      index += 1;
    } else if (arg === "--actions-file" && next) {
      args.actionsFile = next;
      index += 1;
    } else if (arg === "--iterations" && next) {
      args.iterations = Math.max(1, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--pause-ms" && next) {
      args.pauseMs = Math.max(0, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === "--headless" && next) {
      args.headless = next !== "false" && next !== "0";
      index += 1;
    } else if (arg === "--screenshot-dir" && next) {
      args.screenshotDir = next;
      index += 1;
    }
  }

  if (!args.url || !args.actionsFile) {
    throw new Error("The local Playwright client requires --url and --actions-file.");
  }

  return args;
}

const keyForButton = (button) => {
  const keys = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    space: "Space",
    enter: "Enter",
    escape: "Escape",
    z: "z",
    x: "x",
    a: "a",
    b: "b",
    p: "p",
    f: "f"
  };

  return keys[button] ?? button;
};

async function advanceFrames(page, frames) {
  const duration = Math.max(0, frames) * FRAME_MS;
  if (duration > 0) {
    await page.waitForTimeout(duration);
  }
}

async function releaseInputs(page, heldKeys, mouseHeld) {
  for (const key of heldKeys) {
    await page.keyboard.up(key);
  }
  heldKeys.clear();
  if (mouseHeld) {
    await page.mouse.up();
  }
  return false;
}

async function runActions(page, actions) {
  const heldKeys = new Set();
  let mouseHeld = false;

  for (const step of actions.steps ?? []) {
    mouseHeld = await releaseInputs(page, heldKeys, mouseHeld);
    const buttons = step.buttons ?? [];

    if (buttons.includes("left_mouse_button")) {
      await page.mouse.move(step.mouse_x ?? 0, step.mouse_y ?? 0);
      await page.mouse.down();
      mouseHeld = true;
    }

    for (const button of buttons) {
      if (button === "left_mouse_button") {
        continue;
      }
      const key = keyForButton(button);
      await page.keyboard.down(key);
      heldKeys.add(key);
    }

    await advanceFrames(page, step.frames ?? 1);
  }

  await releaseInputs(page, heldKeys, mouseHeld);
}

async function readGameState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text === "function") {
      return window.render_game_to_text();
    }
    return JSON.stringify({ mode: "ui-only" }, null, 2);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const actions = JSON.parse(await readFile(args.actionsFile, "utf8"));
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`);
  });

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      if (typeof window.render_game_to_text !== "function") {
        return false;
      }

      try {
        const state = JSON.parse(window.render_game_to_text());
        return Boolean(state?.player && state?.mode);
      } catch {
        return false;
      }
    }, undefined, { timeout: 10000 }).catch(() => page.waitForTimeout(500));

    for (let iteration = 0; iteration < args.iterations; iteration += 1) {
      await runActions(page, actions);
      if (args.pauseMs > 0) {
        await page.waitForTimeout(args.pauseMs);
      }

      await page.screenshot({
        path: `${args.screenshotDir}/shot-${iteration}.png`,
        fullPage: true
      });
      await writeFile(`${args.screenshotDir}/state-${iteration}.json`, await readGameState(page));
    }

    const errors = { consoleErrors, pageErrors, failedRequests };
    if (consoleErrors.length > 0 || pageErrors.length > 0 || failedRequests.length > 0) {
      await writeFile(`${args.screenshotDir}/errors-0.json`, JSON.stringify(errors, null, 2));
    }

    console.log(`Playwright smoke test completed with ${args.iterations} iteration(s).`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  if (error?.message?.includes("Executable doesn't exist")) {
    console.error(`${error.message}\nRun: npx playwright install chromium`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
