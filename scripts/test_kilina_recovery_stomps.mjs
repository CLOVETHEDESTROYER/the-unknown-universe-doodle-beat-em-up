import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../output/kilina-recovery/stomps/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const boss = s => s.enemies.find(e => e.bossId === 'killinas_daughter');
const place = (x,y=480) => page.evaluate(({x,y}) => window.__unknownPlatformerSetPlayerPosition(x,y), {x,y});
async function wait(predicate) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (errors.length) throw new Error(errors.join('\n'));
    const s = await read();
    if (predicate(s,boss(s))) return s;
    await page.waitForTimeout(15);
  }
  throw new Error(`Timed out: ${predicate}`);
}
try {
  await page.goto(`${process.env.GAME_TEST_URL || 'http://127.0.0.1:3000'}/?autostart=1&level=2&capture=1`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  let s = await read();
  assert.deepEqual(s.failedAssets, []);
  const before = s.progress.score;
  let b = boss(s);
  await place(b.x,b.bodyTop-28);
  const guarded = await wait(s => s.movement.stompCount === 1);
  assert.equal(boss(guarded).hp,44);
  assert.equal(guarded.progress.score,before,'Blocked stomps cannot farm points');
  assert.equal(guarded.movement.lastStompSpeed,430,'Blocked stomps still bounce safely');
  assert(boss(guarded).guardedHits > 0);
  b = boss(guarded);
  await place(b.x-300);
  await wait((s,b) => b.attackState === 'tell');
  b = boss(await read());
  await place(b.x-b.facing*300);
  s = await wait((s,b) => b.vulnerable);
  b = boss(s);
  assert(b.recoveryRemainingMs > 950);
  await place(b.x,b.bodyTop-28);
  const counter = await wait(s => s.movement.stompCount === 2);
  assert.equal(boss(counter).hp,38,'An opening stomp deals its 1.5x counter damage');
  assert.equal(counter.progress.score-before,50);
  assert.equal(counter.movement.lastStompSpeed,430);
  assert.equal(boss(counter).openingHits,1);
  await place(b.x-b.facing*280);
  await page.screenshot({ path: fileURLToPath(new URL('stomp-counter.png',output)) });
  const closed = await wait((s,b) => !b.vulnerable);
  assert.equal(boss(closed).recoveryRemainingMs,0);
  assert.equal(boss(closed).hp,38);
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({guarded,counter,closed:boss(closed),errors},null,2));
  console.log(JSON.stringify({passed:true,checks:['guardedStomp','noBlockedPoints','openingStomp','windowCloses'],errors}));
} catch (e) {
  await fs.writeFile(new URL('failure.json',output),JSON.stringify({error:String(e),state:await read(),errors},null,2));
  await page.screenshot({path:fileURLToPath(new URL('failure.png',output))});
  throw e;
} finally { await browser.close(); }
