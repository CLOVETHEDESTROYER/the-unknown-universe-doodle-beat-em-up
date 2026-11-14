import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const out = path.resolve('output/run-gun-v1');
await fs.mkdir(out, { recursive: true });
await build({ entryPoints: ['gameplay/gunUpgrades.ts'], bundle: true, platform: 'node', format: 'esm', outfile: path.join(out, 'guns.mjs') });
const { GUN_UPGRADES, BASE_BLASTER, canSpawnGunVolley } = await import(pathToFileURL(path.join(out, 'guns.mjs')));
for (const mode of [undefined, 'rapid', 'fan', 'homing']) {
  const spec = mode ? GUN_UPGRADES[mode] : BASE_BLASTER;
  const volley = spec.angles?.length ?? 1;
  assert(canSpawnGunVolley(spec.limit - volley, mode));
  assert(!canSpawnGunVolley(spec.limit - volley + 1, mode));
  assert(spec.limit >= Math.ceil(spec.lifetime / spec.interval) * volley);
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function wait(fn) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    const state = await read().catch(() => null);
    if (state && fn(state)) return state;
    await page.waitForTimeout(40);
  }
  throw new Error('Timed out: ' + fn);
}
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:4178';
const report = { projectileBudgets: true };
try {
  await page.goto(origin + '/?autostart=1&capture=1&level=1&character=barrett&unlockRoster=1&seasonal=off');
  await wait(s => s.mode === 'platforming' && s.player?.grounded);
  await page.evaluate(() => window.__unknownPlatformerCollectPickup('blaster'));
  await wait(s => s.equipment.active === 'blaster');
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(100, 480));
  // Hold fire in empty space for longer than a projectile lifetime. A budget
  // regression must not silently throttle the documented 230ms cadence.
  await page.keyboard.press('ArrowLeft', { delay: 20 });
  const cadenceStart = (await read()).weapon.shotsFired;
  await page.keyboard.down('Space');
  await page.waitForTimeout(1700);
  await page.keyboard.up('Space');
  assert((await read()).weapon.shotsFired - cadenceStart >= 7);
  report.baselineSustainedCadence = true;
  await page.keyboard.press('ArrowRight', { delay: 20 });
  const start = await read();
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  const running = await read();
  assert(running.player.x > start.player.x + 20);
  assert(running.weapon.shotsFired > start.weapon.shotsFired);
  await page.keyboard.down('z');
  await page.waitForTimeout(200);
  // Jump is also available via the common up control.
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(150);
  const jumping = await read();
  assert(!jumping.player.grounded);
  assert(jumping.weapon.shotsFired > running.weapon.shotsFired);
  await page.screenshot({ path: path.join(out, 'desktop-jump-fire.png') });
  for (const key of ['Space', 'ArrowRight', 'ArrowUp', 'z']) await page.keyboard.up(key);
  report.desktopRunJumpFire = true;
  for (const mode of ['rapid', 'fan', 'homing']) {
    const response = await page.request.get(`${origin}/powerups/gun-upgrades-v1/${mode}.png`);
    assert(response.ok());
    assert(response.headers()['content-type'].includes('image/png'));
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(100, 480));
  const fire = page.locator('[data-touch-control="attack"]');
  const right = page.locator('[data-touch-control="right"]');
  const before = await read();
  const rightBox = await right.boundingBox();
  assert(rightBox);
  await right.dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', bubbles: true,
    clientX: rightBox.x + rightBox.width / 2, clientY: rightBox.y + rightBox.height / 2 });
  await fire.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', bubbles: true });
  await page.waitForTimeout(450);
  const touch = await read();
  assert(touch.weapon.shotsFired > before.weapon.shotsFired);
  assert(touch.player.x > before.player.x + 20);
  await fire.dispatchEvent('pointercancel', { pointerId: 22, pointerType: 'touch', bubbles: true });
  await right.dispatchEvent('pointercancel', { pointerId: 21, pointerType: 'touch', bubbles: true });
  await page.waitForTimeout(300);
  const released = await read();
  await page.waitForTimeout(350);
  assert.equal((await read()).weapon.shotsFired, released.weapon.shotsFired);
  report.touchMoveFireAndCancel = true;
  await page.screenshot({ path: path.join(out, 'phone.png') });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(report);
} finally { await browser.close(); }
