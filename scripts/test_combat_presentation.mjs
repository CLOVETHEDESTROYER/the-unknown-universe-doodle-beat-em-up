import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const origin = process.env.GAME_TEST_URL || "http://127.0.0.1:3000";
const output = new URL("../output/combat-presentation-fixes/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const wait = (predicate, arg, timeout = 8000) => page.waitForFunction(
  ({ source, arg }) => new Function("s", "arg", `return (${source})(s, arg)`)(JSON.parse(window.render_game_to_text()), arg),
  { source: predicate.toString(), arg }, { timeout }
);
const screenshot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
async function boot(level = 1, query = "") {
  await page.goto(`${origin}/?autostart=1&level=${level}&capture=1&${query}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
}
const evidence = {};
try {
  await boot();
  await page.keyboard.down("Space");
  await wait((s) => s.weapon.shotsFired >= 2);
  await page.keyboard.up("Space");
  const primary = await read();
  assert.equal(primary.weapon.primary, "blaster");
  assert.equal(primary.attack.visualActive, false, "Space with a blaster must not trigger the old melee effect");
  assert(primary.projectiles.some((shot) => shot.playerShot && shot.damage === 2));
  await screenshot("space-fires-blaster");
  let count = primary.weapon.shotsFired;
  await page.waitForTimeout(300);
  assert.equal((await read()).weapon.shotsFired, count, "Releasing Space stops firing");
  await page.keyboard.down("KeyC");
  await wait((s, count) => s.weapon.shotsFired > count, count);
  await page.keyboard.up("KeyC");
  count = (await read()).weapon.shotsFired;
  await page.locator('[data-touch-control="attack"]').dispatchEvent("pointerdown", { pointerId: 33, pointerType: "touch" });
  await wait((s, count) => s.weapon.shotsFired > count, count);
  await page.locator('[data-touch-control="attack"]').dispatchEvent("pointerup", { pointerId: 33, pointerType: "touch" });
  await page.waitForTimeout(1000);
  count = (await read()).weapon.shotsFired;
  await page.keyboard.down("Space");
  await page.keyboard.down("KeyC");
  await page.waitForTimeout(500);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyC");
  const simultaneous = (await read()).weapon.shotsFired - count;
  assert(simultaneous >= 2 && simultaneous <= 3, "Space and C share the same firing cooldown");
  evidence.primaryControls = { shots: primary.weapon.shotsFired, simultaneousShots: simultaneous, touchAttackFires: true };

  await boot();
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(550, 480));
  await page.keyboard.down("Space");
  await wait((s) => s.progress.monstersDefeated === 1);
  await page.keyboard.up("Space");
  const hit = await read();
  assert(hit.weapon.shotsFired >= 2 && hit.weapon.shotsFired <= 3);
  evidence.blasterDamage = { shots: hit.weapon.shotsFired, defeated: hit.progress.monstersDefeated };

  for (const level of [1, 2, 3, 4]) {
    await boot(level);
    await page.waitForTimeout(650);
    const aliens = (await read()).enemies.filter((enemy) => enemy.kind === "alien");
    assert(aliens.length > 0);
    for (const alien of aliens) {
      assert.notEqual(alien.supportY, null);
      assert(Math.abs(alien.bodyBottom - alien.supportY) <= 2, `Level ${level} alien must stand on its platform`);
      assert(alien.grounded);
    }
    await page.waitForTimeout(1000);
    const settled = (await read()).enemies.filter((enemy) => enemy.kind === "alien");
    assert(settled.every((enemy) => Math.abs(enemy.bodyBottom - enemy.supportY) <= 2));
    evidence[`level${level}Aliens`] = settled;
    if (level === 1) {
      await page.evaluate((x) => window.__unknownPlatformerSetPlayerPosition(x - 140, 480), settled[0].x);
      await page.waitForTimeout(600);
      await screenshot("alien-on-rooftop");
      await wait((s) => s.projectiles.some((shot) => shot.enemyProjectile));
      const ranged = await read();
      assert(ranged.enemies.filter((enemy) => enemy.kind === "alien").every((enemy) => Math.abs(enemy.bodyBottom - enemy.supportY) <= 2));
      evidence.alienRangedAttackStaysGrounded = true;
    }
    assert.deepEqual((await read()).failedAssets, []);
  }

  await boot();
  let boss = (await read()).enemies.find((enemy) => enemy.bossId === "dark_dragon");
  assert.equal(boss.maxHp, 32);
  await page.evaluate((x) => window.__unknownPlatformerSetPlayerPosition(x + 300, 480), boss.x);
  const fightDeadline = Date.now() + 100000;
  while (boss && Date.now() < fightDeadline) {
    if (boss.vulnerable && boss.recoveryRemainingMs > 400) {
      await page.evaluate(({ x, y }) => window.__unknownPlatformerSetPlayerPosition(x, y),
        { x: boss.x - boss.facing * 180, y: boss.floorY });
      const turn = boss.facing > 0 ? "ArrowRight" : "ArrowLeft";
      await page.keyboard.down(turn);
      await wait((s, facing) => s.player.facing === facing, boss.facing > 0 ? "right" : "left");
      await page.keyboard.up(turn);
      const hp = boss.hp;
      await page.keyboard.down("Space");
      await wait((s, hp) => {
        const target = s.enemies.find(enemy => enemy.bossId === "dark_dragon");
        return !target || target.hp < hp;
      }, hp);
      await page.keyboard.up("Space");
    } else {
      await page.evaluate(({ x, y }) => window.__unknownPlatformerSetPlayerPosition(x, y),
        { x: Math.max(boss.left - 160, Math.min(boss.right + 160, boss.x - boss.facing * 280)), y: boss.floorY - 160 });
      await page.waitForTimeout(50);
    }
    boss = (await read()).enemies.find(enemy => enemy.bossId === "dark_dragon");
  }
  assert.equal(boss, undefined, "Real blaster counters defeat the guarded Dragon");
  const recoil = await read();
  assert.equal(recoil.bossAttackVisualVisible, false, "The independent attack artwork must be removed on defeat");
  assert.equal(recoil.enemies.some((enemy) => enemy.bossId === "dark_dragon"), false);
  await wait((s) => s.bossDeath.stage === "fallen");
  const fallen = await read();
  assert.equal(fallen.bossDeath.texture, "boss_dead_dark_dragon");
  assert.equal(fallen.bossDeath.visible, true);
  assert.equal(fallen.bossDefeated, true);
  assert.equal(fallen.pickups.filter((pickup) => pickup.kind === "power").length, 1);
  assert.equal(fallen.projectiles.some((shot) => shot.enemyProjectile), false);
  await screenshot("dark-dragon-fallen");
  await wait((s) => s.bossDeath.stage === "finished");
  const faded = await read();
  assert.equal(faded.bossDeath.visible, false);
  assert.equal(faded.bossAttackVisualVisible, false);
  evidence.dragonDefeat = { recoil: recoil.bossDeath, fallen: fallen.bossDeath, faded: faded.bossDeath, reward: true };

  await page.evaluate(() => window.__unknownPlatformerCollectPickup("power"));
  await wait((s) => s.weapon.primary === "sword");
  const swordShots = (await read()).weapon.shotsFired;
  await page.keyboard.down("Space");
  await wait((s) => s.attack.visualActive);
  await page.waitForTimeout(185);
  const sword = await read();
  await page.keyboard.up("Space");
  assert.equal(sword.weapon.shotsFired, swordShots);
  assert.equal(sword.player.texture, "xgod_side_scroll_fire_sword_attack_v1");
  evidence.swordSpaceStillSlashes = true;
  await page.evaluate((x) => window.__unknownPlatformerSetPlayerPosition(x, 480), faded.progress.levelEndX);
  await wait((s) => s.mode === "transition");
  await wait((s) => s.level === 2 && s.player?.grounded, null, 15000);
  evidence.exitOpensAndAdvances = true;
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL("results.json", output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence) }));
} catch (error) {
  try {
    await fs.writeFile(new URL("failure-state.json", output), JSON.stringify(await read(), null, 2));
    await screenshot("failure");
  } catch { /* Navigation failures may not have a game context. */ }
  throw error;
} finally {
  await browser.close();
}
