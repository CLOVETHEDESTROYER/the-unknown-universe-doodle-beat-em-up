/** Complete the story interlude through its real doors and rescue interaction. */
export async function completeAlleyRescue(page) {
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'alley_rescue');
  const walk = async ms => { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(ms); await page.keyboard.up('ArrowRight'); };
  await walk(2300); await page.keyboard.press('e');
  if ((await state()).room !== 'hall') throw new Error('Alley house did not open');
  await walk(2300); await page.keyboard.press('e');
  if ((await state()).room !== 'gunroom') throw new Error('Spare gun room did not open');
  await walk(1600); await page.keyboard.press('e');
  await page.getByRole('button', {name:'Continue to Graveyard'}).waitFor({timeout:30000});
  await page.getByRole('button', {name:'Continue to Graveyard'}).click();
}
