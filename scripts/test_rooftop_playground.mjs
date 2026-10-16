import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const origin = process.env.GAME_TEST_URL || "http://127.0.0.1:3000";
const output = new URL("../output/rooftop-playground-check/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const wait = (predicate, arg, timeout = 6000) => page.waitForFunction(
  ({ source, arg }) => new Function("state", "arg", `return (${source})(state, arg)`)(JSON.parse(window.render_game_to_text()), arg),
  { source: predicate.toString(), arg }, { timeout }
);
async function boot(level = 1) {
  await page.goto(`${origin}/?autostart=1&level=${level}&capture=1`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
}
async function moveTo(x) {
  await page.keyboard.down("ArrowRight");
  try { await wait((s, x) => s.player.x >= x, x); }
  finally { await page.keyboard.up("ArrowRight"); }
  await page.waitForTimeout(250);
}
async function jumpTo(x, standY, holdMs = 390) {
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(holdMs);
  await page.keyboard.up("ArrowUp");
  try { await wait((s, x) => s.player.x >= x, x); }
  finally { await page.keyboard.up("ArrowRight"); }
  await wait((s, heights) => heights.some((y) => Math.abs(s.player.bodyBottom - y) < 2) && Math.abs(s.player.velocityY) < 10,
    Array.isArray(standY) ? standY : [standY]);
}
const evidence = {};
try {
  await boot();
  await moveTo(330);
  await jumpTo(660, 380);
  await moveTo(1220);
  await wait((s) => s.springPads[0].launches > 0 && Math.abs(s.player.bodyBottom - 350) < 2);
  evidence.firstSpring = await read();
  assert.equal(evidence.firstSpring.player.health, 100);
  assert.equal(evidence.firstSpring.checkpoint.index, 0);
  assert.equal(evidence.firstSpring.rooftopRush.state, "active");
  await page.screenshot({ path: new URL("spring-route.png", output).pathname.replace(/^\/(\w:)/, "$1") });

  await moveTo(1290);
  assert.equal((await read()).rooftopRush.collected, 2);
  await jumpTo(1510, 350);
  assert.equal((await read()).rooftopRush.collected, 3);
  await moveTo(1675);
  assert.equal((await read()).rooftopRush.collected, 4);
  await jumpTo(1880, 385, 120);
  await moveTo(2015);
  const completed = await read();
  assert.equal(completed.rooftopRush.state, "complete", "The six-star route must be completable with real movement");
  assert.equal(completed.rooftopRush.collected, 6);
  assert.equal(completed.powerups.inkShieldReady, true);
  assert(completed.progress.score >= 1200);
  assert.equal(completed.player.health, 100);
  evidence.completedRoute = completed;
  await page.screenshot({ path: new URL("rush-complete.png", output).pathname.replace(/^\/(\w:)/, "$1") });

  await moveTo(2300);
  assert.equal((await read()).dinio.active, true);
  assert.equal((await read()).checkpoint.index, 1);
  await jumpTo(2660, [390, 480]);
  assert.equal((await read()).player.lives, 3, "The moving-landing gap must be crossable");
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(2780, 480));
  await wait((s) => s.springPads[1].launches > 0);
  evidence.secondSpring = await read();
  assert(evidence.secondSpring.player.velocityY < 0);

  await boot();
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(790, 480));
  await wait((s) => s.checkpoint.index === 0);
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1160, 350));
  await wait((s) => s.rooftopRush.state === "active");
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1220, 350));
  await wait((s) => s.rooftopRush.state === "ready", null, 16000);
  const reset = await read();
  assert.equal(reset.rooftopRush.collected, 0);
  assert.equal(reset.pickups.filter((p) => p.kind === "rush_star").length, 6);
  assert.equal(reset.player.health, 100);
  evidence.timeoutReset = reset.rooftopRush;

  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1160, 350));
  await wait((s) => s.rooftopRush.state === "active");
  await page.evaluate(() => window.__unknownPlatformerForceFall());
  await wait((s) => s.xgodPose === "death");
  await wait((s) => s.xgodPose === "normal");
  const respawn = await read();
  assert.equal(respawn.player.x, 790);
  assert.equal(respawn.player.bodyBottom, 480);
  assert.equal(respawn.player.health, 65);
  assert.equal(respawn.player.lives, 3);
  assert.equal(respawn.rooftopRush.state, "ready");
  assert.equal(respawn.pickups.filter((p) => p.kind === "rush_star").length, 6);
  evidence.fallRespawn = { player: respawn.player, challenge: respawn.rooftopRush };

  // Wait out hit protection safely away from the checkpoint's ground enemy.
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1220, 350));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1160, 350));
  await wait((s) => s.rooftopRush.state === "active");
  await page.evaluate(() => window.__unknownPlatformerDamagePlayer(1000));
  await wait((s) => s.xgodPose === "death");
  await wait((s) => s.xgodPose === "normal");
  const fatalRespawn = await read();
  assert.equal(fatalRespawn.player.lives, 2);
  assert.equal(fatalRespawn.rooftopRush.state, "ready");
  assert.equal(fatalRespawn.pickups.filter((p) => p.kind === "rush_star").length, 6);
  evidence.fatalRespawn = { player: fatalRespawn.player, challenge: fatalRespawn.rooftopRush };

  await boot(2);
  const otherLevel = await read();
  assert.equal(otherLevel.rooftopRush, null);
  assert.deepEqual(otherLevel.springPads, []);
  assert.deepEqual(otherLevel.failedAssets, []);
  assert.deepEqual(errors, []);
  evidence.otherLevel = "Level 2 loads without the Level 1 challenge";
  await fs.writeFile(new URL("results.json", output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence) }));
} catch (error) {
  console.error(error);
  try {
    await fs.writeFile(new URL("failure-state.json", output), JSON.stringify(await read(), null, 2));
    await page.screenshot({ path: new URL("failure.png", output).pathname.replace(/^\/(\w:)/, "$1") });
  } catch { /* Navigation failures may leave no game context to capture. */ }
  throw error;
} finally {
  await browser.close();
}
