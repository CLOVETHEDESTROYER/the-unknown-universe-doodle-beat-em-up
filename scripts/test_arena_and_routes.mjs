import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:4387';
const output = 'output/enemy-facing';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(response.url());
});

const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
const boss = state => state.enemies?.find(enemy => enemy.kind === 'boss');
const place = (x, y) => page.evaluate(({ x, y }) => window.__unknownPlatformerSetPlayerPosition(x, y), { x, y });
const fixture = options => page.evaluate(options => window.__unknownPlatformerBossRulesTest(options), options);
const shot = name => page.screenshot({ path: `${output}/${name}.png` });

async function wait(predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    assert.deepEqual(errors, []);
    const state = await read();
    if (predicate(state, boss(state))) return state;
    await page.waitForTimeout(20);
  }
  throw new Error(`Timed out waiting for ${predicate}`);
}

async function boot(level, query = '') {
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}${query}`);
  await wait(state => level === 5 ? state.mode === 'flight' : state.player?.grounded, 60_000);
  await page.getByRole('status', { name: 'Loading game', exact: true }).waitFor({ state: 'hidden' });
  assert.deepEqual((await read()).failedAssets, []);
}

async function hold(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function recordAttack(level, move) {
  await wait((state, enemy) => enemy?.attackState === 'tell' && (!move || enemy.move === move), 15_000);
  // Sample each rendered frame in the browser while the screenshot is captured.
  const trace = page.evaluate(() => new Promise((resolve, reject) => {
    const warning = new Set();
    const action = new Set();
    let peakY = Infinity;
    const deadline = performance.now() + 6500;
    function sample() {
      const state = JSON.parse(window.render_game_to_text());
      const enemy = state.enemies.find(enemy => enemy.kind === 'boss');
      if (enemy.attackState === 'tell') warning.add(enemy.visualFrame);
      if (enemy.attackState === 'attack') {
        action.add(enemy.visualFrame);
        peakY = Math.min(peakY, enemy.y);
      }
      if (enemy.attackState === 'recover') resolve({ warning: [...warning], action: [...action], peakY, enemy });
      else if (performance.now() >= deadline) reject(new Error('Boss did not enter recovery'));
      else requestAnimationFrame(sample);
    }
    sample();
  }));
  const state = await wait((state, enemy) => enemy?.attackState === 'attack' && enemy.stateElapsedMs >= 220);
  const name = boss(state).move;
  await shot(`boss-${level}-${name}`);
  const { warning, action, peakY, enemy } = await trace;
  assert(warning.length >= 2 && action.length >= 2, `${name} cycles distinct warning and attack poses`);
  if (name === 'dragon_lunge') {
    assert(peakY < enemy.floorY - 75, 'The Dragon rises during the lunge');
    assert(Math.abs(enemy.x - enemy.startX) > 95 && enemy.x === enemy.targetX, 'The Dragon reaches the warned landing point');
  }
  return { move: name, warning, action };
}

try {
  for (const [level, ledgeX, rightFacingArt] of [[1, 4935, true], [2, 1310, true], [3, 1135, true], [4, 1190, true], [6, 1210, false]]) {
    await boot(level);
    let state = await read();
    const ledge = state.crumblingPlatforms.find(ledge => ledge.x === ledgeX);
    assert(ledge, `Level ${level} includes its new route ledge`);
    await place(ledge.x + ledge.w / 2, ledge.y - 16);
    const routeLedge = state => state.crumblingPlatforms.find(item => item.x === ledgeX);
    await wait(state => routeLedge(state).phase === 'shaking');
    await shot(`route-${level}`);
    await wait(state => routeLedge(state).phase === 'gone' && !routeLedge(state).solid);

    const attacks = [];
    if (level <= 3) {
      const enemy = boss(await read());
      await place(enemy.x - 260, enemy.floorY);
      attacks.push(await recordAttack(level));
      if (level === 1) attacks.push(await recordAttack(level, 'dragon_lunge'));
    }

    await fixture({ state: 'recover' });
    state = await wait((state, enemy) => state.bossArenaCamera.locked && enemy?.vulnerable);
    const enemy = boss(state);
    assert.equal(enemy.facing, -1);
    assert.equal(enemy.visualFlipX, rightFacingArt);
    await place(enemy.x + 220, enemy.floorY);
    state = await wait((state, enemy) => enemy?.facing === 1 && enemy.vulnerable);
    assert.equal(boss(state).visualFlipX, !rightFacingArt);
    await shot(`boss-${level}-turned`);

    await fixture({ state: 'tell' });
    state = await wait((state, enemy) => state.bossArenaCamera.locked && enemy?.attackState === 'tell');
    const committed = boss(state);
    await place(committed.x + 220, committed.floorY);
    await page.waitForTimeout(100);
    const turned = boss(await read());
    assert.equal(turned.facing, committed.facing);
    assert.equal(turned.targetX, committed.targetX);
    results.push({ level, facing: true, committedAim: true, crumble: true, attacks });
  }

  await boot(1);
  await place(175, 480);
  await page.evaluate(() => window.__unknownPlatformerEnemyTest('walker', 100));
  let state = await wait(state => state.enemies[0]?.attackState === 'tell');
  const walker = state.enemies[0];
  assert.equal(walker.attackDirection, -1);
  assert.equal(walker.visualFlipX, false);
  await place(walker.x + 170, 480);
  state = await wait(state => state.enemies[0]?.attackState === 'attack');
  assert.equal(state.enemies[0].visualFlipX, false);
  state = await wait(state => state.enemies[0]?.attackState === 'recover' && state.enemies[0].visualFlipX);
  await shot('walker-recovery-turn');
  results.push({ regularEnemyTurnsInRecovery: true });

  await boot(1, '&finishLevel=1');
  state = await wait(state => state.bossArenaCamera.locked);
  assert.equal(boss(state).maxHp, 40);
  assert(state.powerStations.every(station => station.kind === 'blaster'));
  assert(!state.pickups.some(pickup => pickup.kind === 'power'));
  const floor = boss(state).floorY;
  const { minX, maxX } = state.bossArenaCamera;
  await place(minX + 92, floor);
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('KeyZ');
  await wait(state => !state.player.grounded && state.player.velocityY < 0);
  await page.waitForTimeout(620);
  await page.keyboard.up('KeyZ');
  await page.keyboard.up('ArrowLeft');
  state = await read();
  assert(state.player.x >= minX && state.player.x < minX + 65);
  assert(state.bossArenaCamera.locked && boss(state).engaged);
  await shot('arena-left-wall');
  await place(maxX - 160, floor);
  await hold('ArrowRight', 650);
  state = await read();
  assert(state.player.x <= maxX && state.bossArenaCamera.locked);

  await fixture({ state: 'recover', hp: 1 });
  state = await wait((state, enemy) => state.bossArenaCamera.locked && enemy?.vulnerable);
  await place(boss(state).x - 160, floor);
  await hold('ArrowRight', 40);
  await hold('Space', 250);
  state = await wait(state => state.bossDeath.visible);
  assert(state.bossArenaCamera.locked);
  assert(!state.pickups.some(pickup => pickup.kind === 'power'));
  state = await wait(state => state.bossDefeated);
  assert(!state.bossArenaCamera.locked);
  const sword = state.pickups.find(pickup => pickup.kind === 'power');
  assert(sword, 'Defeat unlocks the sword pickup');
  await wait(state => state.celebration.completed.victory === 1);
  await shot('dragon-sword-reward');
  await place(sword.x, floor);
  state = await wait(state => state.equipment.active === 'sword');
  assert(state.powerups.swordUnlocked);
  assert.equal(state.equipment.hits, 3);
  await wait(state => state.celebration.active && state.celebration.kind === 'sword');
  await shot('dragon-sword-claimed');
  results.push({ arenaBounds: true, lockedThroughDefeat: true, swordReward: true });

  await boot(1, '&character=teleportation_c&unlockRoster=1');
  const dragon = boss(await read());
  await place(dragon.left - 240, dragon.floorY);
  await page.keyboard.press('KeyX');
  await wait(state => state.teleport.anchor);
  await page.keyboard.down('ArrowRight');
  state = await wait(state => state.bossArenaCamera.locked);
  await page.keyboard.up('ArrowRight');
  assert(state.teleport.anchor.x < state.bossArenaCamera.minX);
  state = await wait(state => state.teleport.cooldownRemainingMs === 0 && !state.special.active);
  assert(Math.abs(state.player.x - state.teleport.anchor.x) < 380, 'The outside anchor is still within recall range');
  await page.keyboard.press('KeyR');
  state = await wait(state => state.teleport.blocked > 0);
  assert(state.bossArenaCamera.locked && state.player.x >= state.bossArenaCamera.minX);
  assert.equal(state.teleport.recalls, 0);
  await page.evaluate(() => window.__unknownPlatformerForceFall());
  await wait((state, enemy) => state.player.grounded && !state.heroDeath.active && !state.bossArenaCamera.locked && !enemy.engaged);
  results.push({ recallCannotLeaveArena: true, checkpointRetryReleasesArena: true });

  await boot(5, '&flightFinale=1&flightSeed=20261016');
  const step = ms => page.evaluate(ms => window.advanceTime(ms), ms);
  const placeShip = x => page.evaluate(x => window.__unknownFlightSetShipPosition(x, 475), x);
  for (let time = 0; time < 12_000; time += 100) {
    state = await read();
    if (state.enemies.some(enemy => enemy.kind === 'pursuer' && enemy.phase === 'recover')) break;
    await step(100);
  }
  const pursuer = state => state.enemies.find(enemy => enemy.kind === 'pursuer');
  assert.equal(pursuer(state).phase, 'recover');
  await placeShip(910);
  await step(40);
  assert(pursuer(await read()).visualFlipX);
  await shot('pursuer-turned');
  await placeShip(110);
  await step(40);
  assert(!pursuer(await read()).visualFlipX);

  await boot(5, '&flightSeed=20261016&character=zgod');
  await step(23_000);
  state = await read();
  assert.equal(state.mode, 'flight');
  await shot('route-5');
  results.push({ level: 5, pursuerFacesShip: true, seededDebrisCount: state.flight.totalAsteroids });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(results);
} catch (error) {
  await shot('failure');
  await writeFile(`${output}/failure.json`, JSON.stringify({ error: String(error), state: await read(), results, errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
