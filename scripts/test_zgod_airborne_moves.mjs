import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const engine = process.env.GAME_TEST_BROWSER || 'chromium';
const device = process.env.GAME_TEST_DEVICE || 'iPhone 13 landscape';
const output = new URL(`../output/zgod-airborne/${engine}-${device.replaceAll(' ', '-')}/`, import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await ({ chromium, webkit })[engine].launch({ headless: true,
  ...(process.env.GAME_TEST_EXECUTABLE ? { executablePath: process.env.GAME_TEST_EXECUTABLE } : {}) });
const context = await browser.newContext({ ...(device === 'desktop' ? { viewport: { width: 1366, height: 900 } } : devices[device]), deviceScaleFactor: 1 });
const page = await context.newPage(), errors = [], evidence = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const move = s => s.movement.zgodMobility;
const control = key => page.locator(`[data-touch-control="${key}"]`);
const tap = async key => {
  if (device === 'desktop' || key==='down') await page.keyboard.press({ jump: 'z', down: 'ArrowDown', dash: 'x' }[key]);
  else await control(key).tap();
};
const hold = (key, down) => key==='down' ? page.keyboard[down?'down':'up']('ArrowDown') : control(key).dispatchEvent(down ? 'pointerdown' : 'pointerup', { pointerId: 7, pointerType: 'touch' });
const enemies = options => page.evaluate(o => window.__unknownPlatformerSpecialTest(o), options);
async function wait(fn, timeout = 15000) {
  const deadline = Date.now()+timeout;
  while (Date.now()<deadline) {
    assert.deepEqual(errors, []);
    const s = await read();
    if (fn(s)) return s;
    await page.waitForTimeout(20);
  }
  throw Error(`Timed out: ${fn}`);
}
async function shot(name) { await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) }); }
async function record(name) {
  const s = await read();
  evidence.push({ name, player: s.player, movement: s.movement, special: s.special, enemies: s.enemies, projectiles: s.projectiles });
  console.log(`${engine} ${name}: PASS`);
  return s;
}
async function boot(query = '') {
  await page.goto(`${origin}/?autostart=1&capture=1&character=zgod${query}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded, { timeout: 60000 });
  assert.deepEqual((await read()).failedAssets, []);
}
async function jump() {
  await wait(s => s.player.grounded && move(s).bombPhase === 'ready');
  await hold('jump', true);
  await wait(s => !s.player.grounded && s.player.y < 380);
  await hold('jump', false);
}
try {
  await boot();
  await enemies({ offsets: [] });
  await hold('jump', true);
  await wait(s => !s.player.grounded);
  await wait(s => s.player.grounded);
  assert.equal(move(await read()).doubleJumps, 0, 'Holding jump cannot auto-double');
  await hold('jump', false);
  await jump(); await tap('jump');
  let s = await wait(s => move(s).frame === 2);
  assert.equal(move(s).doubleJumps, 1);
  assert.equal(s.movement.airLaunchKind, 'double-jump');
  assert(s.player.velocityY < 0 && !move(s).doubleJumpAvailable);
  assert.equal(s.player.bodyHeight, 82, 'The regular collider stays in use');
  assert.equal(move(s).texture, 'zgod_double_jump');
  await shot('double-jump'); await record('double jump and pose');
  await tap('jump'); await wait(s=>move(s).bombs===1);
  assert.equal(move(await read()).doubleJumps, 1, 'Third press slams instead of adding a jump');
  await wait(s=>move(s).bombPhase==='ready'&&s.player.grounded);
  await boot();await enemies({offsets:[]});await jump();await tap('jump');
  await wait(s=>move(s).doubleJumps===1);

  await enemies({ offsets: [250, 550, 800, 1500], hp: 100, projectile: true });
  await hold('down', true);
  s = await wait(s => move(s).bombPhase === 'windup');
  assert.equal(s.enemies.length, 4, 'Screen clear waits for the landing');
  await page.evaluate(() => window.__unknownPlatformerDamagePlayer(500));
  assert.equal((await read()).player.health, 100, 'Invincibility remains active during windup');
  await page.keyboard.press('p'); await wait(s => s.mode === 'paused');
  const paused = await read();
  await page.keyboard.press('z'); await page.keyboard.press('x'); await page.waitForTimeout(250);
  assert.deepEqual(move(await read()), move(paused));
  assert.equal((await read()).player.y, paused.player.y);
  await page.getByRole('button', { name: 'Resume Playing' }).click();
  s = await wait(s => move(s).bombPhase === 'diving');
  assert.equal(move(s).texture, 'zgod_ground_punch');
  assert.equal(s.enemies.length, 4);
  await shot('fist-first-dive');
  await page.evaluate(()=>{for(const control of ['jump','dash']){const node=document.querySelector(`[data-touch-control="${control}"]`);for(const type of ['pointerdown','pointerup'])node.dispatchEvent(new PointerEvent(type,{pointerId:9,pointerType:'touch',button:0,bubbles:true}));}});
  s = await wait(s => move(s).bombPhase === 'landing' && move(s).frame === 4);
  assert.equal(move(s).screenClears, 1);
  assert.equal(move(s).hits, 3);
  assert.equal(move(s).clearedShots, 1);
  assert(move(s).shockwaveActive && move(s).knockoutPoses > 0);
  assert.equal(s.enemies.length, 1);
  assert(s.enemies[0].x > 1500 && s.enemies[0].hp === 100, 'Offscreen enemy survives');
  assert.equal(s.projectiles.length, 0);
  assert.equal(s.player.health, 100); assert.equal(s.player.lives, 3);
  assert.equal(s.special.uses, 0, 'SP cannot interrupt the punch');
  await shot('screen-clear'); await record('screen wipe, offscreen preservation, waves and KO poses');
  await wait(s => move(s).bombPhase === 'ready' && !move(s).shockwaveActive);
  s = await read(); assert(s.player.visible && move(s).doubleJumpAvailable);
  assert.equal(move(s).knockoutPoses, 0);
  assert.equal(move(s).bombs, 1, 'Holding Down does not repeat');
  await hold('down', false);

  // A roof blocks X God's smaller bomb, but not Z God's screen-wide power.
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(680, 380));
  await enemies({ offsets: [0, 180, 1500], hp: 500 });
  await jump(); await tap('down');
  s = await wait(s => move(s).bombPhase === 'landing');
  assert(Math.abs(s.player.bodyBottom-380) < 4);
  assert.equal(s.enemies.length, 1);
  assert(s.enemies[0].x > 2000);
  assert.equal(move(s).screenClears, 2);
  await record('raised platform landing clears foes below and across roofs');

  // Actual distant arena boss remains alive when the opening screen is cleared.
  await boot(); await jump(); await tap('down');
  s = await wait(s => move(s).impacts === 1);
  const futureBoss = s.enemies.find(e => e.kind === 'boss');
  assert(futureBoss && futureBoss.hp === futureBoss.maxHp && futureBoss.x > 9000);
  await record('screen range preserves the future boss');

  // Test a real, guarded arena boss, using its actual controller/death sequence.
  await boot('&finishLevel=1');
  s = await wait(s => s.enemies.some(e => e.kind === 'boss' && e.attackState === 'tell'));
  assert(!s.enemies.find(e => e.kind === 'boss').vulnerable);
  await jump(); await tap('down');
  await wait(s => move(s).screenClears === 1);
  s = await wait(s => !s.enemies.some(e => e.kind === 'boss'));
  assert.equal(s.bossCues.vulnerability.attackPromptVisible, false);
  assert.equal(s.player.health, 100); assert.equal(s.player.lives, 3);
  assert(s.progress.monstersDefeated >= 1);
  await wait(s => s.bossDefeated);
  await record('guarded boss is knocked out and rewards unlock');

  await boot(); await enemies({ offsets: [] });
  await page.evaluate(() => window.__unknownPlatformerCollectPickup('frost'));
  const loadout = (await read()).equipment;
  await page.evaluate(() => window.__unknownPlatformerDamagePlayer(1000));
  s = await read(); assert.equal(s.player.health, 100);
  assert.equal(s.equipment.active, loadout.active); assert.equal(s.equipment.hits, loadout.hits);
  await jump(); await tap('jump'); await tap('down');
  await wait(s => move(s).bombPhase === 'ready' && move(s).impacts === 1);
  s = await read(); assert.equal(s.equipment.active, loadout.active); assert.equal(s.equipment.hits, loadout.hits);
  assert(s.player.visible);
  await record('equipped ground punch and damage preserve health, lives and equipment');
  await page.evaluate(() => window.__unknownPlatformerForceFall());
  s = await wait(s => s.player.grounded && move(s).doubleJumpAvailable);
  assert.equal(s.player.health, 100); assert.equal(s.player.lives, 3);
  assert.equal(move(s).bombPhase, 'ready');
  await enemies({ offsets: [170], hp: 100 }); await tap('dash');
  await wait(s => s.special.uses === 1 && s.special.hits === 1);
  await wait(s => !s.special.active);
  s = await read(); assert.equal(s.enemies.length, 0); assert(s.player.visible);
  await record('fall recovery and Star Comet remain intact');

  // Holding grounded Down before jumping cannot trigger an automatic slam.
  await hold('down', true); await wait(s => s.player.crouching);
  const bombs = move(await read()).bombs;
  await hold('jump', true); await wait(s => !s.player.grounded);
  await hold('jump', false); await page.waitForTimeout(120);
  assert.equal(move(await read()).bombs, bombs);
  await hold('down', false);
  assert.deepEqual(errors, []);
  assert.equal(await page.title(), 'The Unknown Universe');
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  await record('held Down stays crouch/jump without auto punch');
} catch (e) {
  await shot('failure'); console.error(JSON.stringify(await read())); throw e;
} finally {
  await fs.writeFile(new URL('results.json', output), JSON.stringify({ evidence, errors }, null, 2));
  await browser.close();
}
