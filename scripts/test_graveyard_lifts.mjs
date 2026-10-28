import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = 'C:/Users/analo/.codex/visualizations/2026/05/22/019e5022-49ab-7600-a5dc-2b8487aa74c1/graveyard-lifts';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1024 }, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (down) => page.locator('[data-touch-control="jump"]').dispatchEvent(down ? 'pointerdown' : 'pointerup', { pointerId: 1, pointerType: 'touch' });
try {
  await page.goto('http://127.0.0.1:5173/?autostart=1&level=2&character=xgod&sword=1&swordUnlocked=1&manualRun=1');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  await page.screenshot({ path: `${output}/tablet-start.png` });
  const initial = await read();
  assert.equal(initial.movingPlatforms.length, 4);
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(690, 480));
  await button(true);
  await page.waitForTimeout(600);
  await button(false);
  await page.waitForTimeout(700);
  const samples = [];
  for (let i = 0; i < 55; i++) {
    samples.push(await read());
    if ([5, 30].includes(i)) await page.screenshot({ path: `${output}/lift-ride-${i}.png` });
    await page.waitForTimeout(100);
  }
  const rideErrors = samples.map(s => Math.abs(s.player.bodyBottom - s.movingPlatforms[0].y));
  await fs.writeFile(`${output}/lift-samples.json`, JSON.stringify(samples, null, 2));
  assert(Math.max(...rideErrors) <= 4, `Rider separated from lift: ${Math.max(...rideErrors)}px`);
  assert(samples.some(s => s.movingPlatforms[0].velocityY < -20) && samples.some(s => s.movingPlatforms[0].velocityY > 20));
  assert(samples.every(s => s.player.texture === 'runner_sword-run'), 'Riding must not flash the jump pose');
  assert(samples.every(s => s.movingPlatforms.every(l => l.y >= l.minY - 2 && l.y <= l.maxY + 2)));
  await page.keyboard.press('p');
  await page.waitForTimeout(100);
  const pauseY = (await read()).movingPlatforms[0].y;
  await page.waitForTimeout(400);
  assert.equal((await read()).movingPlatforms[0].y, pauseY);
  await page.getByRole('button', { name: /resume/i }).click();
  await page.waitForTimeout(100);
  await button(true);
  await page.waitForTimeout(180);
  assert((await read()).player.velocityY < -300, 'Jump off lift must work');
  await button(false);
  assert.deepEqual(errors, []);
  assert(samples.every(s => s.failedAssets.length === 0));
  await fs.writeFile(`${output}/lift-results.json`, JSON.stringify({ errors, maxRideError: Math.max(...rideErrors), samples }, null, 2));
  console.log('PASS: jump through, land, ride up/down, pause, resume, jump off, bounds, and assets');
} catch (error) {
  await fs.writeFile(`${output}/lift-failure.json`, JSON.stringify({ error: String(error), state: await read(), errors }, null, 2));
  await page.screenshot({ path: `${output}/lift-failure.png` });
  throw error;
} finally { await browser.close(); }
