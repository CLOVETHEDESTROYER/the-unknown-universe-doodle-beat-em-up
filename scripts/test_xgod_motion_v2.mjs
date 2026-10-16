import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The connected Browser Use service cannot drive this machine's localhost game.
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const output = new URL('../output/xgod-motion-v2/playtest/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const screenshot = name => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
const evidence = {};
async function boot(sword = false) {
  await page.goto(`${origin}/?autostart=1&level=1&capture=1&manualRun=1${sword ? '&sword=1&swordUnlocked=1' : ''}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets, []);
}
try {
  for (const sword of [false, true]) {
    await boot(sword);
    const name = sword ? 'sword' : 'blaster';
    const prefix = `runner_${name}-`;
    assert.equal((await read()).player.texture, `${prefix}idle`);
    await screenshot(`${name}-idle`);
    const frames = new Set();
    await page.keyboard.down('ArrowRight');
    for (let index = 0; index < 16; index++) {
      await page.waitForTimeout(40);
      const state = await read();
      assert.equal(state.player.texture, sword ? 'xgod_side_scroll_fire_sword_run_v1' : `${prefix}run`);
      frames.add(state.player.frame);
      if (index === 8) await screenshot(`${name}-run`);
    }
    await page.keyboard.up('ArrowRight');
    assert(frames.size >= 6, 'The run cycles through distinct contact and passing frames');
    await page.waitForTimeout(300);
    const standing = (await read()).player;
    const crouchFrames = new Set();
    await page.keyboard.down('ArrowDown');
    for (let index = 0; index < 10; index++) {
      await page.waitForTimeout(20);
      const state = (await read()).player;
      assert.equal(state.texture, `${prefix}crouch`);
      assert.equal(state.crouching, true);
      assert.equal(state.bodyHeight, 64);
      assert.equal(state.bodyBottom, standing.bodyBottom);
      crouchFrames.add(state.frame);
    }
    assert(crouchFrames.size >= 4);
    assert.equal(Number((await read()).player.frame), 5);
    await screenshot(`${name}-crouch`);
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(65);
    const rising = (await read()).player;
    assert.equal(rising.crouching, false);
    assert.equal(rising.bodyHeight, 108);
    assert.equal(rising.texture, `${prefix}crouch`);
    assert(Number(rising.frame) > 0 && Number(rising.frame) < 5);
    await page.waitForTimeout(200);
    assert.equal((await read()).player.texture, `${prefix}idle`);
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(220);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(70);
    const jump = (await read()).player;
    assert.equal(jump.texture, `${prefix}jump`);
    assert.equal(jump.crouching, false);
    assert.equal(jump.bodyHeight, 108);
    assert(jump.velocityY < -200);
    await screenshot(`${name}-jump`);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(900);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(280);
    assert.equal((await read()).player.facing, 'left');
    await screenshot(`${name}-idle-left`);
    if (!sword) {
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(220);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.down('Space');
      await page.waitForTimeout(80);
      await page.keyboard.up('Space');
      const fired = await read();
      const shot = fired.projectiles.find(projectile => projectile.playerShot);
      assert(shot && shot.x < fired.player.x && shot.damage === 2);
      const metadata = JSON.parse(await fs.readFile(new URL('../public/characters/xgod/motion-v2/metadata.json', import.meta.url), 'utf8'));
      const muzzle = metadata.actions['blaster-idle'].attachments[0].muzzle;
      assert(Math.abs(shot.y - (fired.player.y + (muzzle[1] - 480) * 0.4)) < 4, 'Shot height follows the rendered barrel');
      assert.equal(fired.player.texture, 'runner_blaster-attack', 'Firing immediately after crouch raises the weapon');
      await screenshot('blaster-fire-left');
      evidence.barrelAlignment = { shot, expectedY: fired.player.y + (muzzle[1] - 480) * 0.4 };
    } else {
      await page.keyboard.down('Space');
      await page.waitForTimeout(160);
      await page.keyboard.up('Space');
      assert.equal((await read()).player.texture, 'xgod_side_scroll_fire_sword_attack_v1');
      await screenshot('sword-slash-left');
    }
    evidence[name] = { runFrames: [...frames], crouchFrames: [...crouchFrames], riseFrame: rising.frame, jump };
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await boot();
  const touch = async event => page.locator('[data-touch-control="down"]').dispatchEvent(event, { pointerId: 4, pointerType: 'touch', bubbles: true });
  await touch('pointerdown');
  await page.waitForTimeout(240);
  assert.equal((await read()).player.crouching, true);
  await screenshot('phone-touch-crouch');
  await touch('pointercancel');
  await page.waitForTimeout(240);
  assert.equal((await read()).player.texture, 'runner_blaster-idle');
  evidence.touchCancelRestoresIdle = true;
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('results.json', output), JSON.stringify({ evidence, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: Object.keys(evidence), errors }));
} catch (error) {
  await fs.writeFile(new URL('failure.json', output), JSON.stringify({ error: String(error), state: await read(), errors }, null, 2));
  await screenshot('failure');
  throw error;
} finally {
  await browser.close();
}
