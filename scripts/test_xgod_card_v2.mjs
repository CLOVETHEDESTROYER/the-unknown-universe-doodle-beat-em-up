import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const out=new URL(`../output/xgod-card-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];
try{
 for(const device of ['iPhone 15 landscape','iPhone 15','Desktop Chrome']){
  const page=await browser.newPage({...devices[device],deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/?capture=1`);await page.getByRole('button',{name:'Start game',exact:true}).click();
  const card=page.locator('[data-character-id="xgod"]'),image=card.getByRole('img');
  await image.evaluate(img=>img.decode());assert((await image.getAttribute('src')).endsWith('/cards/xgod-current-v2.webp'));
  assert.equal(await card.isEnabled(),true);assert.equal(await page.locator('[data-character-id="barrett"]').isDisabled(),true);
  const bounds=await card.boundingBox(),viewport=page.viewportSize();assert(bounds.y>=0&&bounds.y+bounds.height<=viewport.height,'Full card fits vertically');
  if(device!=='Desktop Chrome'){
   const roster=page.getByRole('group',{name:'Choose a character'});
   assert(await roster.evaluate(n=>n.scrollWidth>n.clientWidth));
   await roster.evaluate(n=>n.scrollLeft=n.scrollWidth);await page.waitForTimeout(250);
   assert(await roster.evaluate(n=>n.scrollLeft>0));await roster.evaluate(n=>n.scrollLeft=0);await page.waitForTimeout(250);
  }
  await page.screenshot({path:fileURLToPath(new URL(`${device.replaceAll(' ','-')}.png`,out))});
  evidence.push({device,card:await image.getAttribute('src'),fullHeight:true});await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}finally{await browser.close();}
