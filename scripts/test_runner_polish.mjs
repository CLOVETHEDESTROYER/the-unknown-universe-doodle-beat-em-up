import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Browser plugin unavailable in this session; validate real DOM touch controls with Playwright.
const startLevel = process.argv.includes('--level2') ? 2 : 1;
const output = `C:/Users/analo/.codex/visualizations/2026/05/22/019e5022-49ab-7600-a5dc-2b8487aa74c1/${startLevel === 2 ? 'graveyard-lifts' : 'runner-polish'}`;
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const phone = process.argv.includes('--phone');
const short = process.argv.includes('--short');
const page = await browser.newPage({ viewport: phone ? { width: 844, height: 390 } : { width: 1366, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function button(control, down) {
  await page.locator(`[data-touch-control="${control}"]`).dispatchEvent(down ? 'pointerdown' : 'pointerup', { pointerId: control === 'jump' ? 1 : 2, pointerType: 'touch', bubbles: true });
}
try {
  await page.goto(`http://127.0.0.1:5173/?autostart=1&character=xgod&level=${startLevel}&unlockRoster=1${startLevel === 2 ? '&sword=1&swordUnlocked=1' : ''}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player);
  await page.locator('[data-touch-control="jump"]').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${output}/${phone ? 'phone' : 'tablet'}-start.png` });
  const initial = await read();
  const frames = new Set();
  const samples = [];
  let jumpUntil = 0;
  let pressed = false;
  let lastX = 0;
  let lastJumpAt = -9999;
  let captures = 0;
  const started = Date.now();
  const jumpPoints = startLevel === 2 ? [440, 810, 1170, 1490, 1770, 2130, 2480, 2890, 3170, 3570, 3930, 4380, 4700] : [440, 710, 1050, 1480, 1860, 2240, 2620, 2950, 3380, 3740, 4150, 4620];
  const used = new Set();
  while (Date.now() - started < (short ? 5500 : 90000)) {
    const state = await read();
    if (!state.player) { await page.waitForTimeout(100); continue; }
    samples.push(state);
    if (state.level === startLevel + 1) break;
    const p = state.player;
    frames.add(`${p.texture}:${p.frame}`);
    const now = Date.now();
    if (p.x < lastX - 250) used.clear();
    lastX = p.x;
    const point = jumpPoints.find(x => !used.has(x) && p.x >= x && p.x < x + 180);
    const boss = state.enemies.find(e => e.kind === 'boss');
    const bossJump = p.x > 4800 && boss && Math.abs(p.x - boss.x) < 240;
    if (p.grounded && now - lastJumpAt > 500 && (point !== undefined || bossJump)) {
      if (point !== undefined) used.add(point);
      lastJumpAt = now;
      jumpUntil = now + 550;
      await button('jump', true);
      pressed = true;
    }
    if (pressed && now >= jumpUntil) { await button('jump', false); pressed = false; }
    if (p.x > 1500) await button('attack', true);
    if (captures === 0 && !p.grounded && p.x > 500 || captures === 1 && p.x > 2200 || captures === 2 && p.x > 4800) {
      await page.screenshot({ path: `${output}/${phone ? 'phone' : 'tablet'}-section-${captures++}.png` });
    }
    await page.waitForTimeout(70);
  }
  const final = await read();
  await page.screenshot({ path: `${output}/${phone ? 'phone' : 'tablet'}-final.png` });
  assert.equal(errors.length, 0, errors.join('\n'));
  assert(samples.every(s => s.failedAssets.length === 0), 'Assets failed');
  if (startLevel === 1) assert(samples.some(s => s.player.grounded && s.player.y === 400), 'First ledge was not landed on');
  else assert(samples.some(s => s.movingPlatforms?.some(l => s.player.x > l.x && s.player.x < l.x + l.width && Math.abs(s.player.bodyBottom - l.y) < 4)), 'No moving platform was landed on');
  assert(samples.some(s => s.player.velocityY < -300), 'Jump did not rise');
  assert(frames.size > 10, 'Animation is not progressing');
  if (!short) assert.equal(final.level, startLevel + 1, `The authentic Level ${startLevel} run did not reach the next level`);
  await fs.writeFile(`${output}/${phone ? 'phone' : 'tablet'}-result.json`, JSON.stringify({ initial, final, frames: [...frames], errors, samples }, null, 2));
  console.log(JSON.stringify({ passed: true, level: final.level, health: final.player?.health, checkpoint: final.checkpoint, frames: frames.size }));
} catch (error) {
  await fs.writeFile(`${output}/failure.json`, JSON.stringify({ error: String(error), state: await read().catch(() => null), errors }, null, 2));
  throw error;
} finally { await browser.close(); }
