import {chromium, devices} from 'playwright';
import assert from 'node:assert/strict';

// Transfer budgets catch accidentally restoring full-size PNGs or eager game bundles.
// Timing is reported, not asserted: CI CPU and network conditions vary.
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:4381';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({...devices['iPhone 13 landscape'],deviceScaleFactor:1});
const page = await context.newPage();
const errors=[], requests=[], responses=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const network = await context.newCDPSession(page), types = new Map();
await network.send('Network.enable');
await network.send('Network.setCacheDisabled',{cacheDisabled:true});
network.on('Network.requestWillBeSent',e=>types.set(e.requestId,e.type));
network.on('Network.loadingFinished',e=>responses.push({type:types.get(e.requestId),bytes:e.encodedDataLength}));
const transferred=()=>responses.reduce((n,r)=>n+r.bytes,0);
try {
  await page.goto(`${origin}/?capture=1`);
  await page.getByRole('button',{name:'Start game',exact:true}).waitFor();
  await page.locator('img[alt="Unknown Universe game start screen"]').evaluate(img=>img.decode());
  assert.equal(await page.title(),'The Unknown Universe');
  assert(!requests.some(u=>/phaser-vendor|sfx-v1|MonsterIdeator|cdn\.tailwindcss/.test(u)),
    'Title must be usable before loading game engines, effects or the hidden workshop');
  const titleBytes=transferred();
  assert(titleBytes<1024*1024,`Title response budget: ${titleBytes} bytes`);
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('[data-character-id="xgod"]').click();
  await page.waitForFunction(()=>{
    try {return document.querySelector('[data-phase="game"]')&&JSON.parse(window.render_game_to_text()).player.grounded;}
    catch {return false;}
  },{},{timeout:60000});
  assert.equal(await page.getByRole('status',{name:'Loading game'}).count(),0);
  const state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  assert.deepEqual(state.failedAssets,[]);
  assert.deepEqual(errors,[]);
  assert(!requests.some(u=>/\/assets\/(FlightGameEngine|GameEngine|MonsterIdeator)-/.test(u)),
    'Starting level one must not download other engines or the workshop');
  assert(transferred()<32*1024*1024,`Level-one response budget: ${transferred()} bytes`);
  console.log(JSON.stringify({passed:true,titleBytes,firstLevelBytes:transferred(),
    readyMs:await page.evaluate(()=>performance.now()),errors}));
} finally {await browser.close();}
