import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output = 'C:/Users/analo/.codex/visualizations/2026/05/22/019e5022-49ab-7600-a5dc-2b8487aa74c1/runner-polish';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const jump = down => page.locator('[data-touch-control="jump"]').dispatchEvent(down ? 'pointerdown' : 'pointerup', { pointerId: 1, pointerType: 'touch' });
async function boot(level = 1) {
  await page.goto(`http://127.0.0.1:5173/?autostart=1&character=xgod&unlockRoster=1&manualRun=1&level=${level}${level > 1 ? '&sword=1&swordUnlocked=1' : ''}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
}
const evidence = {};
try {
  await boot();
  await jump(true);
  await page.waitForTimeout(1800);
  const held = await read();
  assert(held.player.grounded && held.player.y === 480, 'Holding jump must land without repeating');
  await jump(false);
  evidence.holdDoesNotRepeat = held.player;
  async function apex(holdMs) {
    await jump(true);
    const samples = [];
    const start = Date.now();
    let released = false;
    while (Date.now() - start < 1400) {
      if (!released && Date.now() - start > holdMs) { await jump(false); released = true; }
      samples.push((await read()).player.y);
      await page.waitForTimeout(25);
    }
    return Math.min(...samples);
  }
  const shortApex = await apex(65);
  const highApex = await apex(600);
  assert(highApex < shortApex - 60, 'Hold length must produce a meaningfully higher jump');
  evidence.jumpApex = { shortApex, highApex };
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(620, 480));
  await jump(true);
  await page.waitForTimeout(600);
  await jump(false);
  await page.waitForTimeout(800);
  const ledge = await read();
  assert.equal(ledge.player.y, 400, 'Jump through the platform from underneath, then land on top');
  assert.equal(ledge.player.bodyBottom, 400);
  await page.keyboard.down('Space');
  await page.waitForTimeout(190);
  const punch = await read();
  assert.equal(punch.player.texture, 'runner_attack');
  assert.equal(punch.player.frame, 3);
  assert.equal(punch.player.bodyBottom, 400);
  await page.screenshot({ path: `${output}/tablet-portrait-punch.png` });
  await page.keyboard.up('Space');
  evidence.oneWayAndAttack = { ledge: ledge.player, punch: punch.player };
  await page.waitForTimeout(350);
  const beforeStomp = await read();
  const target = beforeStomp.enemies.find(enemy => enemy.kind === 'walker');
  await page.evaluate(({ x, y }) => window.__unknownPlatformerSetPlayerPosition(x, y), { x: target.x, y: target.bodyTop - 60 });
  await page.waitForTimeout(550);
  const stomp = await read();
  assert.equal(stomp.progress.monstersDefeated, beforeStomp.progress.monstersDefeated + 1, 'Descending head contact should defeat a regular enemy');
  assert(stomp.player.velocityY < 0, 'A head stomp should bounce upward');
  evidence.headStomp = stomp.player;
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(1770, 480));
  await page.waitForTimeout(200);
  assert.equal((await read()).checkpoint.index, 0);
  await page.evaluate(() => window.__unknownPlatformerForceFall());
  await page.waitForTimeout(800);
  const respawn = await read();
  assert.equal(respawn.player.x, 1770);
  assert.equal(respawn.player.y, 480);
  evidence.checkpointRespawn = respawn.player;
  await boot(2);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  assert.equal((await read()).player.texture, 'runner_sword-run');
  await page.keyboard.up('ArrowRight');
  await jump(true);
  await page.waitForTimeout(300);
  assert.equal((await read()).player.texture, 'runner_sword-jump');
  await page.screenshot({ path: `${output}/sword-jump.png` });
  await jump(false);
  await page.keyboard.down('Space');
  await page.waitForTimeout(190);
  assert.equal((await read()).player.texture, 'runner_sword-attack');
  await page.screenshot({ path: `${output}/sword-attack.png` });
  await page.keyboard.up('Space');
  evidence.swordContinuity = (await read()).player;
  for (const level of [3, 4]) {
    await boot(level);
    await jump(true);
    await page.waitForTimeout(350);
    const state = await read();
    assert.deepEqual(state.failedAssets, []);
    assert(state.player.velocityY < 0);
    evidence[`level${level}Smoke`] = state.player;
    await jump(false);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/edge-results.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence) }));
} finally { await browser.close(); }
