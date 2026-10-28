import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local Playwright can drive the game's localhost input and setup hooks.
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const output = new URL('../output/stomp-flow/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const place = (x,y) => page.evaluate(({x,y}) => window.__unknownPlatformerSetPlayerPosition(x,y), {x,y});
const shot = name => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
const wait = async (predicate, timeout=6500) => {
  const start = Date.now();
  while (Date.now()-start < timeout) {
    if (errors.length) throw new Error(errors.join('\n'));
    const state = await read();
    if (predicate(state)) return state;
    await page.waitForTimeout(15);
  }
  throw new Error(`Timeout: ${predicate}`);
};
async function boot(query='') {
  await page.goto(`${origin}/?autostart=1&level=1&capture=1&${query}`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets, []);
}
const evidence = {};
async function bounce(boosted) {
  await boot();
  if (boosted) {
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100); // Consume the normal jump before positioning the fall.
  }
  const enemy = (await read()).enemies.find(e => e.bounceLane);
  const before = (await read()).progress;
  await place(enemy.x, enemy.bodyTop-65);
  const bounced = await wait(s => s.movement.stompCount === 1);
  assert.equal(bounced.player.health, 100);
  assert.equal(bounced.movement.lastStompSpeed, boosted ? 650 : 420);
  assert.equal(bounced.movement.lastStompBoosted, boosted);
  assert.equal(bounced.progress.monstersDefeated, before.monstersDefeated+1);
  assert.equal(bounced.progress.score-before.score, 200);
  let apex = bounced.player.y;
  const until = Date.now()+1100;
  while (Date.now()<until) {
    const s = await read();
    apex = Math.min(apex,s.player.y);
    await page.waitForTimeout(20);
  }
  const landed = await wait(s => s.player.grounded);
  assert.equal(landed.movement.stompChain, 0);
  assert.equal(landed.movement.stompCount, 1, 'Holding Jump does not auto-repeat a jump after landing');
  if (boosted) await page.keyboard.up('ArrowUp');
  return { bounced, apex, landed: landed.player };
}
async function course(query='') {
  await boot(query);
  // Set up the course entrance; all route movement after this is real keyboard input.
  await place(3078,400);
  await page.keyboard.down('ArrowRight');
  await wait(s=>s.springPads[2].launches>0);
  await page.keyboard.down('ArrowUp');
  const samples=[];
  let captured=0;
  try {
    const start=Date.now();
    while (Date.now()-start<5500) {
      const s=await read();
      samples.push({player:s.player,movement:s.movement,enemies:s.enemies.filter(e=>e.bounceLane),spring:s.springPads[2]});
      if(s.movement.stompCount>captured) {
        captured=s.movement.stompCount;
        await shot(`${query ? 'dinio-' : ''}chain-${captured}`);
      }
      if (s.player.x>=4330) break;
      await page.waitForTimeout(20);
    }
  } finally {
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');
  }
  await fs.writeFile(new URL(`${query ? 'dinio-' : ''}course-samples.json`,output),JSON.stringify(samples,null,2));
  const state=await read();
  assert.equal(state.movement.bestStompChain,3,'Hold Right and Jump to chain all three enemies');
  assert.equal(state.progress.monstersDefeated,3);
  assert.equal(state.player.health,100);
  assert.equal(state.player.lives,3);
  const rewarded = await wait(s => s.powerups.inkShieldReady && s.player.grounded);
  assert.equal(rewarded.player.bodyBottom,300,'A high third bounce reaches the reward ledge');
  await shot(`${query ? 'dinio-' : ''}reward-ledge`);
  return { player:rewarded.player,movement:rewarded.movement,score:rewarded.progress.score,souls:rewarded.progress.souls,dinio:rewarded.dinio };
}
try {
  evidence.lowBounce=await bounce(false);
  evidence.highBounce=await bounce(true);
  assert(evidence.highBounce.apex < evidence.lowBounce.apex-65);
  evidence.keyboardCourse=await course();
  evidence.companionCourse=await course('dinio=1&dinioUnlocked=1');
  await boot();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(100);
  const target=(await read()).enemies.find(e=>e.bounceLane);
  await place(target.x,target.bodyTop-60);
  await wait(s=>s.movement.stompChain===1);
  await page.keyboard.up('ArrowUp');
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10));
  assert.equal((await read()).movement.stompChain,0);
  evidence.damageResetsChain=true;
  await page.evaluate(()=>window.__unknownPlatformerForceFall());
  await wait(s=>s.xgodPose==='normal' && s.player.grounded,5000);
  assert.equal((await read()).movement.stompChain,0);
  evidence.respawnResetsChain=true;
  await page.setViewportSize({width:844,height:390});
  await boot();
  await page.locator('[data-touch-control="jump"]').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch'});
  await page.waitForTimeout(100);
  const mobileTarget=(await read()).enemies.find(e=>e.bounceLane);
  await place(mobileTarget.x,mobileTarget.bodyTop-60);
  const mobile=await wait(s=>s.movement.stompCount===1);
  assert.equal(mobile.movement.lastStompSpeed,650);
  await shot('phone-touch-bounce');
  await page.locator('[data-touch-control="jump"]').dispatchEvent('pointercancel',{pointerId:2,pointerType:'touch'});
  await page.waitForTimeout(50);
  assert((await read()).player.velocityY > -450,'Touch release cuts the high bounce');
  evidence.touchBoostAndRelease=true;
  await page.goto(`${origin}/?autostart=1&level=2&capture=1`);
  await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.equal((await read()).enemies.some(e=>e.bounceLane),false);
  assert.equal((await read()).springPads.length,0);
  evidence.levelTwoIsolation=true;
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,checks:Object.keys(evidence),errors}));
} catch(error) {
  await fs.writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),state:await read(),evidence,errors},null,2));
  await shot('failure');
  throw error;
} finally {await browser.close();}
