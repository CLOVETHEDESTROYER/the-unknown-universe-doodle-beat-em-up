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
