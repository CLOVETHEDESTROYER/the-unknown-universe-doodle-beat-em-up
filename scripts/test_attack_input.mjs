import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:4384';
const output = 'output/gameplay-pass/attack-input';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = {};

function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(response.url());
  });
}

async function boot(page, query = '') {
  await page.goto(`${origin}/?autostart=1&capture=1&level=1${query}`);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.mode === 'platforming' && state.player?.grounded;
  }, null, { timeout: 60_000 });
  await page.getByRole('status', { name: 'Loading game', exact: true }).waitFor({ state: 'hidden' });
  assert.deepEqual((await read(page)).failedAssets, []);
}

const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function atEndOfCooldown(page) {
  await page.waitForFunction(() => {
    const remaining = JSON.parse(window.render_game_to_text()).equipment.cooldownRemainingMs;
    return remaining > 45 && remaining <= 115;
  });
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watch(desktop);
  await boot(desktop, '&character=barrett&unlockRoster=1');
  await desktop.evaluate(() => window.__unknownPlatformerSpecialTest({ offsets: [83], hp: 30 }));
  await desktop.keyboard.press('Space', { delay: 35 });
  await atEndOfCooldown(desktop);
  await desktop.keyboard.press('Space');
  await desktop.waitForTimeout(220);
  let state = await read(desktop);
  results.melee = { combo: state.attack.combo, targetHp: state.enemies[0]?.hp };
  await desktop.screenshot({ path: `${output}/melee.png` });

  await boot(desktop);
  await desktop.keyboard.press('KeyC', { delay: 35 });
  await atEndOfCooldown(desktop);
  await desktop.keyboard.press('KeyC');
  await desktop.waitForTimeout(180);
  results.blasterShots = (await read(desktop)).weapon.shotsFired;

  // Opposing directions cancel during a turn. Fire should keep the previous aim.
  await boot(desktop);
  await desktop.keyboard.down('ArrowRight');
  await desktop.waitForFunction(() => JSON.parse(window.render_game_to_text()).player.velocityX > 100);
  await desktop.keyboard.down('ArrowLeft');
  await desktop.keyboard.press('Space', { delay: 30 });
  state = await read(desktop);
  results.shotDuringTurn = state.projectiles.find(shot => shot.playerShot)?.velocityX;
  await desktop.screenshot({ path: `${output}/blaster.png` });
  await desktop.keyboard.up('ArrowRight');
  await desktop.waitForFunction(() => JSON.parse(window.render_game_to_text()).player.facing === 'left');
  await desktop.keyboard.up('ArrowLeft');

  const phone = await browser.newPage({ ...devices['iPhone 15 landscape'], deviceScaleFactor: 1 });
  watch(phone);
  await boot(phone);
  const fire = phone.getByRole('button', { name: 'Hold to fire equipped weapon', exact: true });
  await fire.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, button: 0 });
  await phone.waitForFunction(() => JSON.parse(window.render_game_to_text()).weapon.shotsFired === 1);
  await fire.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1, button: 0 });
  await atEndOfCooldown(phone);
  await fire.tap();
  await phone.waitForTimeout(180);
  results.touchShots = (await read(phone)).weapon.shotsFired;
  await phone.screenshot({ path: `${output}/touch.png` });

  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(results);
  assert.deepEqual(errors, []);
  assert.deepEqual(results.melee, { combo: 2, targetHp: 26 });
  assert.equal(results.blasterShots, 2);
  assert(results.shotDuringTurn > 0);
  assert.equal(results.touchShots, 2);
} finally {
  await browser.close();
}
