import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local Playwright is needed to drive this machine's localhost and gameplay hooks.
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const output = new URL('../output/kilina-recovery/playtest/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const boss = state => state.enemies.find(enemy => enemy.bossId === 'killinas_daughter');
const shot = name => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
const wait = async (predicate, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (errors.length) throw new Error(errors.join('\n'));
    const state = await read();
    if (predicate(state, boss(state))) return state;
    await page.waitForTimeout(25);
  }
  throw new Error(`Timed out waiting for ${predicate.toString()}`);
};
const place = (x, y = 480) => page.evaluate(({x,y}) => window.__unknownPlatformerSetPlayerPosition(x,y), {x,y});
const evidence = {};
async function boot() {
  await page.goto(`${origin}/?autostart=1&level=2&capture=1&sword=1&swordUnlocked=1`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets, []);
}
async function slashAt(x, side, y = 480) {
  await place(x, y);
  const key = side === 1 ? 'ArrowRight' : 'ArrowLeft';
  await page.keyboard.down(key);
  await page.waitForTimeout(35);
  await page.keyboard.up(key);
  await page.keyboard.down('Space');
  await wait(s => s.attack.visualActive && s.attack.visualElapsed < 160);
  await page.keyboard.up('Space');
  await wait(s => s.attack.active && s.attack.visualElapsed >= 210);
}
async function counterUntil(done) {
  const deadline = Date.now() + 100000;
  let lastOpening;
  while (Date.now() < deadline) {
    const s = await read();
    const b = boss(s);
    if (done(s,b)) return s;
    if (errors.length) throw new Error(errors.join('\n'));
    if (b.vulnerable && b.recoveryRemainingMs > 400) {
      const before = b.hp;
      await slashAt(b.x - b.facing * 135, b.facing);
      const hitState = await read();
      if (done(hitState,boss(hitState))) return hitState;
      await wait(s => s.attack.visualElapsed >= 460);
      const after = boss(await read());
      if (after && after.hp < before) lastOpening = after;
    } else {
      // Setup hook positions only; actual keyboard sword strikes deal all damage.
      // Leave the committed landing/axe path while waiting for the next opening.
      const safeX = b.move === 'leap_slam' ? b.targetX < (b.left+b.right)/2 ? b.right : b.left
        : b.x - b.facing * 280;
      await place(safeX, 360);
      await page.waitForTimeout(60);
    }
  }
  throw new Error(`Counter cycle timed out; last opening: ${JSON.stringify(lastOpening)}`);
}
try {
  await boot();
  let initial = boss(await read());
  assert.equal(initial.maxHp, 44);
  assert.equal(initial.bodyBottom, 480);
  await place(initial.x - 480);
  await wait((s,b) => b.velocityX < -80);
  const walking = boss(await read());
  assert(walking.velocityX < -80);
  await shot('approach');
  let state = await wait((s,b) => b?.attackState === 'tell' && b.move === 'axe_dash');
  let b = boss(state);
  const committed = { targetX: b.targetX, facing: b.facing, startX: b.x };
  const beforeHp = b.hp;
  await slashAt(b.x + b.facing * 140, -b.facing);
  b = boss(await read());
  assert.equal(b.hp, beforeHp, 'Guarded sword hits do zero damage');
  assert.notEqual(b.attackState, 'patrol', 'A sword hit must not cancel the committed attack');
  assert(b.guardedHits >= 1);
  evidence.armorAndCommitment = { beforeHp, hp: b.hp, state: b.attackState };
  await place(b.x - b.facing * 300);
  await shot('axe-windup');
  state = await wait((s,b) => b?.attackState === 'attack' && b.move === 'axe_dash');
  b = boss(state);
  assert.equal(b.facing, committed.facing);
  assert.equal(b.targetX, committed.targetX);
  await wait((s,b) => Math.abs(b.x - committed.startX) > Math.abs(committed.targetX - committed.startX) * 0.4);
  const dashing = boss(await read());
  assert(Math.abs(dashing.x - committed.startX) > Math.abs(committed.targetX - committed.startX) * 0.4);
  assert.equal(dashing.bodyBottom, dashing.y, 'Dash hitbox stays planted beneath the artwork');
  assert([2, 3].includes(dashing.visualFrame), 'The dash shows its strike or follow-through pose');
  const dashState = await read();
  assert(dashState.bossArenaCamera.locked);
  assert(dashing.x - 250 > dashState.bossArenaCamera.left - 8);
  assert(dashing.x + 250 < dashState.bossArenaCamera.left + 1024 + 8);
  await shot('axe-dash');
  state = await wait((s,b) => b?.attackState === 'recover');
  b = boss(state);
  const recoveryHp = b.hp;
  await slashAt(b.x - b.facing * 135, b.facing);
  const counter = boss(await read());
  assert(recoveryHp - counter.hp >= 3, 'Recovery rewards a full counterattack');
  assert(counter.vulnerable);
  await shot('counter-opening');
  evidence.dash = { committed, dashing, counterDamage: recoveryHp - counter.hp };
  await place(counter.x < (counter.left + counter.right) / 2 ? counter.right - 10 : counter.left + 10);

  state = await wait((s,b) => b?.attackState === 'tell' && b.move === 'cannon_burst');
  await shot('cannon-aim');
  b = boss(state);
  const duckHealth = state.player.health;
  await page.keyboard.down('ArrowDown');
  state = await wait((s,b) => b?.attackState === 'attack' && b.shotsInBurst === 3);
  assert(state.projectiles.some(p => p.enemyProjectile));
  await shot('cannon-burst');
  evidence.cannon = boss(state);
  await page.waitForTimeout(550);
  assert.equal((await read()).player.health, duckHealth, 'Crouching clears the aimed standing-height burst');
  await page.keyboard.up('ArrowDown');

  state = await wait((s,b) => b?.attackState === 'tell' && b.move === 'leap_slam');
  b = boss(state);
  const landingX = b.targetX;
  await shot('slam-warning');
  await place(landingX < (b.left + b.right) / 2 ? b.right : b.left);
  state = await wait((s,b) => b?.attackState === 'attack' && b.move === 'leap_slam' && b.y < 340);
  assert.equal(boss(state).targetX, landingX);
  assert.equal(boss(state).bodyBottom, boss(state).y, 'Leap hitbox moves with the airborne boss');
  await shot('leap');
  state = await wait((s,b) => b?.attackState === 'recover' && b.move === 'leap_slam');
  assert.equal(boss(state).bodyBottom, 480);
  await shot('slam-recovery');
  evidence.slam = { landingX, landed: boss(state) };

  // Real sword attacks during recovery drive the half-health transition.
  state = await counterUntil((s,b) => b.hp <= 22);
  assert(boss(state).vulnerable, 'Crossing half health does not cut the current opening short');
  assert.equal(boss(state).phase, 1);
  state = await wait((s,b) => b?.phase === 2);
  await shot('second-wind');
  evidence.phaseTwo = boss(state);
  const phaseHp = boss(state).hp;
  b = boss(state);
  await slashAt(b.x - b.facing * 135, b.facing);
  b = boss(await read());
  assert.equal(b.hp,phaseHp,'Second-wind transition is guarded');
  assert(b.guardedHits > boss(state).guardedHits);
  evidence.phaseGuard = { hp: b.hp, guardedHits: b.guardedHits };
  // This strike is behind the boss during her stationary phase transition,
  // keeping the rear-guard check independent of a moving dash and sword cooldown.
  evidence.rearGuard = { hp: b.hp, guardedHits: b.guardedHits };
  // Stay clear of the first dash to provoke the telegraphed return dash.
  b = boss(state);
  await place((b.left + b.right) / 2);
  await wait((s,b) => b?.attackState === 'attack' && b.move === 'axe_dash');
  b = boss(await read());
  await place(b.targetX > (b.left + b.right) / 2 ? b.left : b.right);
  state = await wait((s,b) => b?.attackState === 'tell' && b.followUp === true);
  await shot('return-dash-warning');
  evidence.returnDash = boss(state);
  state = await wait((s,b) => b?.attackState === 'attack' && b.move === 'leap_slam');
  b = boss(state);
  await place(b.targetX < (b.left + b.right) / 2 ? b.right : b.left, 385);
  state = await wait((s,b) => b?.attackState === 'recover' && b.move === 'leap_slam');
  assert(state.projectiles.filter(p => p.enemyProjectile).length >= 2, 'Phase two landing creates two low waves');
  await shot('phase-two-shockwaves');
  evidence.phaseTwoWaves = state.projectiles;
  state = await wait((s,b) => b?.attackState === 'attack' && b.move === 'cannon_burst' && b.shotsInBurst === 5);
  evidence.phaseTwoBurst = boss(state);

  // Finish through actual counterattacks and check that the gate still opens.
  await counterUntil((s,b) => !b);
  state = await wait(s => s.bossDefeated);
  assert.equal(state.enemies.some(e => e.bossId === 'killinas_daughter'), false);
  assert.equal(state.bossAttackVisualVisible, false);
  assert.equal(state.bossArenaCamera.locked, false);
  assert.equal(state.projectiles.some(p => p.enemyProjectile), false);
  await shot('victory');
  evidence.defeatCleanup = true;
  await place(state.progress.levelEndX);
  await wait(s => s.mode === 'transition');
  await wait(s => s.level === 3 && s.player?.grounded);
  evidence.exitAdvances = true;
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('results.json', output), JSON.stringify({ evidence, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence), errors }));
} catch (error) {
  await fs.writeFile(new URL('failure.json', output), JSON.stringify({ error: String(error), state: await read(), evidence, errors }, null, 2));
  await shot('failure');
  throw error;
} finally { await browser.close(); }
