import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../output/kilina-recovery/blaster-playtest/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const boss = s => s.enemies.find(e => e.bossId === 'killinas_daughter');
const place = (x,y=480) => page.evaluate(({x,y}) => window.__unknownPlatformerSetPlayerPosition(x,y), {x,y});
const wait = async predicate => {
  const start = Date.now();
  while (Date.now() - start < 12000) {
    if (errors.length) throw new Error(errors.join('\n'));
    const s = await read();
    if (predicate(s,boss(s))) return s;
    await page.waitForTimeout(25);
  }
  throw new Error(`Timeout: ${predicate}`);
};
try {
  await page.goto(`${process.env.GAME_TEST_URL || 'http://127.0.0.1:3000'}/?autostart=1&level=2&capture=1`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets, []);
  let b = boss(await read());
  await place(b.x + 300);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(35);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('Space');
  await wait((s,b) => b.guardedHits >= 2);
  await page.keyboard.up('Space');
  const guarded = boss(await read());
  assert.equal(guarded.hp, 44, 'Guarded blaster hits deal zero damage');
  await page.screenshot({ path: fileURLToPath(new URL('guarded.png', output)) });
  await wait((s,b) => b.attackState === 'recover');
  b = boss(await read());
  await place(b.x + 150);
  const before = b.hp;
  await page.keyboard.down('Space');
  await wait((s,b) => b.openingHits >= 2);
  await page.keyboard.up('Space');
  const counter = boss(await read());
  assert(before - counter.hp >= 6, 'Gunshots gain full recovery damage');
  await page.screenshot({ path: fileURLToPath(new URL('opening.png', output)) });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: fileURLToPath(new URL('phone-arena.png', output)) });
  await place((counter.left + counter.right) / 2);
  const leap = await wait((s,b) => b.move === 'leap_slam' && b.attackState === 'attack' && b.y < 340);
  assert(leap.bossArenaCamera.locked);
  assert.equal(boss(leap).bodyBottom, boss(leap).y);
  await page.screenshot({ path: fileURLToPath(new URL('phone-leap.png', output)) });
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('results.json', output), JSON.stringify({ guarded, counter, leap: boss(leap), errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: ['blasterArmor', 'blasterCounter', 'phoneArena', 'airborneBody'], errors }));
} catch (error) {
  await fs.writeFile(new URL('failure.json', output), JSON.stringify({ error: String(error), state: await read(), errors }, null, 2));
  await page.screenshot({ path: fileURLToPath(new URL('failure.png', output)) });
  throw error;
} finally { await browser.close(); }
