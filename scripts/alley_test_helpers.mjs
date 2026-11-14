/** Complete the story interlude through its real doors and rescue interaction. */
export async function completeAlleyRescue(page) {
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'alley_rescue');
  const walk = async x => { await page.keyboard.down('ArrowRight'); await page.waitForFunction(x=>JSON.parse(window.render_game_to_text()).player.x>=x,x,{timeout:15000}); await page.keyboard.up('ArrowRight'); };
  await walk(790); await page.keyboard.press('e');
  if ((await state()).room !== 'hall') throw new Error('Alley house did not open');
  await walk(790); await page.keyboard.press('e');
  if ((await state()).room !== 'gunroom') throw new Error('Spare gun room did not open');
  await walk(620); await page.keyboard.press('e');
  await page.getByRole('button', {name:'Continue to Graveyard'}).waitFor({timeout:60000});
  await page.getByRole('button', {name:'Continue to Graveyard'}).click();
}

/** Reach the interlude from a valid campaign save without a title-screen shortcut. */
export async function enterAlleyFromSave(page, origin) {
  await page.goto(origin);
  await page.getByRole('button', {name:'Start game', exact:true}).click();
  await page.getByRole('button', {name:'X God: Select character'}).click();
  await page.getByRole('button', {name:'Skip story'}).click();
  await page.waitForFunction(() => { try { return JSON.parse(window.render_game_to_text()).player?.grounded; } catch { return false; } }, {}, {timeout:60000});
  await page.locator('[data-phase="game"]').waitFor({timeout:60000});
  await page.getByRole('button', {name:'II', exact:true}).click();
  await page.getByRole('button', {name:'Save & Quit'}).click();
  await page.evaluate(() => {
    const key='unknownUniverse.campaign.v1', save=JSON.parse(localStorage.getItem(key));
    save.stats.level=2;save.stats.swordUnlocked=true;save.stats.hasFlameSword=true;save.stats.swordDurability=3;
    save.stats.equipment={active:'sword',hits:3,unlocked:['blaster','sword']};
    save.story='level1';delete save.interlude;
    localStorage.setItem(key,JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', {name:'Continue Game'}).click();
  await page.getByRole('button', {name:'Skip story'}).click();
  await page.waitForFunction(() => { try { return JSON.parse(window.render_game_to_text()).mode==='alley_rescue'; } catch { return false; } });
}
