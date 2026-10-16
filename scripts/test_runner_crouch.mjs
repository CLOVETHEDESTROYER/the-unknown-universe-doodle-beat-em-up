import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output = 'C:/Users/analo/.codex/visualizations/2026/05/22/019e5022-49ab-7600-a5dc-2b8487aa74c1/runner-motion-v3';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (control, event) => page.locator(`[data-touch-control="${control}"]`).dispatchEvent(event, { pointerId: control === 'down' ? 1 : 2, pointerType: 'touch', bubbles: true });
const evidence = {};
async function boot(query = '&manualRun=1') {
  await page.goto(`http://127.0.0.1:5173/?autostart=1&character=xgod&level=1&unlockRoster=1${query}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets, []);
}
try {
  await boot();
  await page.getByRole('button', { name: 'Crouch', exact: true }).waitFor({ state: 'visible' });
  const stand = (await read()).player;
  await button('down', 'pointerdown');
  await page.waitForTimeout(250);
  const duck = (await read()).player;
  assert.equal(duck.crouching, true);
  assert.equal(duck.texture, 'runner_crouch');
  assert.equal(duck.bodyHeight, 64);
  assert.equal(duck.bodyBottom, stand.bodyBottom);
  await page.screenshot({ path: `${output}/crouch-phone.png` });
  await button('down', 'pointercancel');
  await page.waitForTimeout(100);
  assert.equal((await read()).player.bodyHeight, 108);
  assert.equal((await read()).player.bodyBottom, stand.bodyBottom);
  evidence.touchCrouch = { stand, duck };

  for (const key of ['ArrowDown', 's']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(100);
    assert.equal((await read()).player.crouching, true);
    await page.keyboard.up(key);
    await page.waitForTimeout(100);
    assert.equal((await read()).player.crouching, false);
  }
  await button('down', 'pointerdown');
  await page.waitForTimeout(150);
  await button('jump', 'pointerdown');
  await page.waitForTimeout(230);
  const rising = (await read()).player;
  assert.equal(rising.crouching, false);
  assert.equal(rising.bodyHeight, 108);
  assert.equal(rising.texture, 'runner_jump');
  assert(rising.velocityY < -200);
  await page.screenshot({ path: `${output}/jump-phone.png` });
  await button('jump', 'pointerup');
  await page.waitForTimeout(1200);
  assert.equal((await read()).player.crouching, true);
  assert.equal((await read()).player.bodyBottom, stand.bodyBottom);
  await button('down', 'pointerup');
  evidence.crouchJump = rising;

  await page.keyboard.down('ArrowRight');
  const frames = new Set();
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(70); frames.add((await read()).player.frame); }
  assert(frames.size >= 6);
  await page.screenshot({ path: `${output}/sprint-phone.png` });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);
  const stopped = (await read()).player.frame;
  await page.waitForTimeout(150);
  assert.equal((await read()).player.frame, stopped);
  evidence.runFrames = [...frames];

  await boot('');
  const startX = (await read()).player.x;
  await button('down', 'pointerdown');
  await page.waitForTimeout(400);
  const sliding = (await read()).player;
  assert(sliding.crouching && sliding.x > startX + 70);
  await button('down', 'pointerup');
  await page.waitForTimeout(150);
  assert.equal((await read()).player.texture, 'runner_run');
  evidence.autoRunDuck = sliding;

  await boot('&manualRun=1&sword=1&swordUnlocked=1');
  await button('down', 'pointerdown');
  await page.waitForTimeout(250);
  assert.equal((await read()).player.texture, 'runner_sword-crouch');
  await page.screenshot({ path: `${output}/sword-crouch-phone.png` });
  await button('jump', 'pointerdown');
  await page.waitForTimeout(230);
  assert.equal((await read()).player.texture, 'runner_sword-jump');
  await button('jump', 'pointerup');
  await button('down', 'pointerup');
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence), errors }));
} catch (error) {
  await fs.writeFile(`${output}/failure.json`, JSON.stringify({ error: String(error), state: await read(), errors }, null, 2));
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally { await browser.close(); }
