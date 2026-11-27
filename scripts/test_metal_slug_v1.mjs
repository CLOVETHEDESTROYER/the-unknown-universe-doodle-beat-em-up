import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.GAME_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const read = () =>
    page.evaluate(() => {
      try {
        return JSON.parse(window.render_game_to_text());
      } catch {
        return null;
      }
    });

  await page.goto(`${origin}/?autostart=1&level=1&character=xgod`);
  await page.waitForFunction(
    () => {
      try {
        const s = JSON.parse(window.render_game_to_text());
        return s.mode === "platforming" && s.player?.grounded && s.battlefield;
      } catch {
        return false;
      }
    },
    {},
    { timeout: 60000 }
  );

  const initial = await read();
  assert.deepEqual(initial.failedAssets, [], `Failed assets: ${initial.failedAssets}`);
  assert.equal(initial.battlefield.bombs, 6, "X-God starts with 6 Ink Grenades");
  assert(
    initial.battlefield.barrelsLeft >= 8,
    `Expected >=8 barrels in L1, got ${initial.battlefield.barrelsLeft}`
  );
  assert(
    initial.battlefield.barricadesLeft >= 4,
    `Expected >=4 barricades in L1, got ${initial.battlefield.barricadesLeft}`
  );
  assert(initial.setPieces.bridgesTotal >= 3, "Expected >=3 drawbridges in L1");
  assert(initial.setPieces.hangingCratesTotal >= 4, "Expected >=4 hanging crush-crates in L1");
  assert(
    initial.routeEncounters.length >= 6,
    `Expected >=6 encounters in L1, got ${initial.routeEncounters.length}`
  );

  // 1. Directional aim UP (W + Space) updates aimMode and shoots upward
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(80);
  const aimingUp = await read();
  assert.equal(aimingUp.aimMode, "up", `Expected aimMode=up, got ${aimingUp.aimMode}`);
  await page.keyboard.down("Space");
  await page.waitForTimeout(260);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyW");
  const afterAimUp = await read();
  assert(afterAimUp.weapon.shotsFired >= 1, "Upward shot fired");

  // 2. Shoot overhead hanging crush-crate switch at x=2135 with W + Space
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(2132, 480));
  await page.waitForTimeout(100);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("Space");
  await page.waitForTimeout(550);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(550);
  const afterCrush = await read();
  assert(
    afterCrush.setPieces.cratesDropped >= 1,
    `Expected hanging crush-crate drop, got ${JSON.stringify(afterCrush.setPieces)}`
  );

  // 3. Sprint across 6-plank Collapsing Trestle Bridge (x=4940..5264, floor=438) before entering camera-locked strongpoints
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(4915, 436));
  await page.waitForTimeout(80);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => {
      try {
        return JSON.parse(window.render_game_to_text()).setPieces?.planksCollapsed >= 1;
      } catch {
        return false;
      }
    },
    {},
    { timeout: 6000 }
  );
  await page.keyboard.up("ArrowRight");
  const afterTrestle = await read();
  assert(
    afterTrestle.setPieces.planksCollapsed >= 1,
    `Expected collapsing trestle planks to drop, got ${JSON.stringify(afterTrestle.setPieces)}`
  );

  // 4. Ink Grenade throw (G) on clean open street
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(320, 480));
  await page.waitForTimeout(120);
  const beforeBomb = await read();
  await page.keyboard.press("KeyG");
  await page.waitForTimeout(1400);
  const afterBomb = await read();
  assert.equal(
    afterBomb.battlefield.bombs,
    beforeBomb.battlefield.bombs - 1,
    "Bomb count decremented"
  );
  assert.equal(afterBomb.battlefield.grenadesThrown, 1, "Grenade throw recorded");

  // 5. Breach Blast Gate #1 (x=2560)
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(2440, 480));
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.down("Space");
  await page.waitForTimeout(950);
  await page.keyboard.up("Space");
  await page.waitForTimeout(220);
  const afterGate = await read();
  assert(
    afterGate.setPieces.gatesBreached >= 1,
    `Expected blast gate breach, got ${JSON.stringify(afterGate.setPieces)}`
  );

  // 6. Shoot explosive ink barrel (x=3320) and chain-blast Watchtower #1 (x=3400)
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(3210, 480));
  await page.waitForTimeout(80);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(60);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => {
      try {
        const s = JSON.parse(window.render_game_to_text());
        return s.battlefield?.barrelsExploded >= 1 && s.setPieces?.towersDestroyed >= 1;
      } catch {
        return false;
      }
    },
    {},
    { timeout: 6000 }
  );
  await page.keyboard.up("Space");
  const afterBarrel = await read();
  assert(
    afterBarrel.battlefield.barrelsExploded >= 1,
    `Expected barrel explosion, got ${JSON.stringify(afterBarrel.battlefield)}`
  );
  assert(
    afterBarrel.setPieces.towersDestroyed >= 1,
    `Expected watchtower collapse, got ${JSON.stringify(afterBarrel.setPieces)}`
  );

  // 7. Shoot drawbridge #1 winch switch at x=3945 (standing on left bank x=3800) with diagonal-up shot
  await page.goto(`${origin}/?autostart=1&level=1&character=xgod`);
  await page.waitForFunction(
    () => {
      try {
        const s = JSON.parse(window.render_game_to_text());
        return s.mode === "platforming" && s.player?.grounded && s.setPieces;
      } catch {
        return false;
      }
    },
    {},
    { timeout: 60000 }
  );
  await page.evaluate(() => window.__unknownPlatformerSetPlayerPosition(3800, 480));
  await page.waitForTimeout(120);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(600);
  const afterBridge = await read();
  assert(
    afterBridge.setPieces.bridgesDropped >= 1,
    `Expected drawbridge drop, got ${JSON.stringify(afterBridge.setPieces)}`
  );

  // 8. Verify Levels 2, 3, 4, and 6 boot cleanly with full Metal Slug architecture, set-pieces & strongpoints
  for (const lvl of [2, 3, 4, 6]) {
    await page.goto(`${origin}/?autostart=1&level=${lvl}&character=xgod`);
    await page.waitForFunction(
      () => {
        try {
          const s = JSON.parse(window.render_game_to_text());
          return s.mode === "platforming" && s.player?.grounded && s.battlefield && s.setPieces;
        } catch {
          return false;
        }
      },
      {},
      { timeout: 60000 }
    );
    const s = await read();
    assert.deepEqual(s.failedAssets, [], `L${lvl} failed assets: ${s.failedAssets}`);
    assert(s.battlefield.barrelsLeft >= 5, `L${lvl} barrels`);
    assert(s.battlefield.barricadesLeft >= 3, `L${lvl} barricades`);
    assert(s.setPieces.bridgesTotal >= 2, `L${lvl} drawbridges`);
    assert(s.setPieces.hangingCratesTotal >= 3, `L${lvl} hanging crates`);
    assert(s.setPieces.towersTotal >= 3, `L${lvl} watchtowers`);
    assert(s.setPieces.blastGatesTotal >= 2, `L${lvl} blast gates`);
    assert(s.setPieces.collapsingPlanksTotal >= 6, `L${lvl} collapsing trestle bridge`);
    assert(
      s.routeEncounters.filter((e) => e.kind === "combat").length >= 3,
      `L${lvl} has >=3 combat strongpoints`
    );
  }

  // 9. Verify Level 5 (Flight) boots cleanly with new hand-drawn arcade pop-up & supply pod assets
  await page.goto(`${origin}/?autostart=1&level=5&character=xgod`);
  await page.waitForFunction(
    () => {
      try {
        const s = JSON.parse(window.render_game_to_text());
        return s.engine === "flight" && s.player !== null;
      } catch {
        return false;
      }
    },
    {},
    { timeout: 60000 }
  );
  const l5 = await read();
  assert.deepEqual(l5.failedAssets, [], `L5 failed assets: ${l5.failedAssets}`);

  assert.deepEqual(errors, [], `Page errors: ${errors.join("; ")}`);
  console.log(
    JSON.stringify({
      passed: true,
      l1SetPieces: afterBarrel.setPieces,
      l1BarrelsInitial: initial.battlefield.barrelsLeft,
      l1BarricadesInitial: initial.battlefield.barricadesLeft,
      afterBarrel: afterBarrel.battlefield
    })
  );
} finally {
  await browser.close();
}
