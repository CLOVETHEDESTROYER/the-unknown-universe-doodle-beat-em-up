import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4191';
const out=process.env.GAME_TEST_OUTPUT||'output/christmas-preview-v1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.GAME_TEST_BROWSER?{executablePath:process.env.GAME_TEST_BROWSER}:{})});
const errors=[],passed=[];
let context,page;
const previewKey='unknownUniverse.christmasPreview.2026';
async function fresh({date='2026-11-21T18:00:00Z',storageBlocked=false,viewport={width:1440,height:900}}={}){
  await context?.close();context=await browser.newContext({viewport});
  await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await context.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await context.addInitScript(({date,storageBlocked})=>{
    const RealDate=Date;let offset=RealDate.parse(date)-RealDate.now();
    window.Date=class extends RealDate{constructor(...args){if(args.length)super(...args);else super(RealDate.now()+offset)}static now(){return RealDate.now()+offset}};
    window.__setChristmasTestDate=value=>{offset=RealDate.parse(value)-RealDate.now();window.dispatchEvent(new Event('focus'))};
    if(storageBlocked)Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked for test')}});
  },{date,storageBlocked});
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)errors.push(response.status()+' '+response.url())});
}
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(predicate,timeout=60000){
  const end=Date.now()+timeout;
  while(Date.now()<end){assert.deepEqual(errors,[]);const state=await read().catch(()=>null);if(state&&predicate(state))return state;await page.waitForTimeout(25)}
  throw Error('Timed out: '+predicate.toString());
}
const code=()=>page.getByLabel('Secret code',{exact:true});
const klause=()=>page.locator('[data-character-id="killer_klause"]');
async function enter(value,keyboard=false){await code().fill(value);if(keyboard)await code().press('Enter');else await page.getByRole('button',{name:'Apply code',exact:true}).click()}
const screenshot=name=>page.screenshot({path:path.join(out,name+'.png')});
const record=name=>{passed.push(name);console.log('PASS '+name)};
try{
  await fresh();await page.goto(origin);
  await code().waitFor({state:'visible'});
  for(const value of ['santakiscoming','SANTAKISCOMING','SantaKIsComing','SantaKiscoming']){
    await enter(value);assert.match(await page.getByRole('status').filter({hasText:'Code not recognized'}).textContent(),/not recognized/);
    assert.notEqual(await page.evaluate(key=>localStorage.getItem(key),previewKey),'true');
  }
  record('wrong capitalization rejected on main screen');
  await enter('SantaKisComing',true);await page.getByRole('status').filter({hasText:'Christmas preview unlocked'}).waitFor();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),previewKey),'true');await screenshot('title-preview');
  await page.reload();await page.getByRole('button',{name:'Christmas preview ON · Turn off',exact:true}).waitFor();
  await page.getByRole('button',{name:'Start game',exact:true}).click();await klause().waitFor();assert(await klause().isEnabled());
  await screenshot('roster-preview');record('exact code via Enter persists and unlocks Killer Klause');
  await klause().click();await wait(s=>s.mode==='campaign-story'&&s.chapter==='christmas'&&!s.busy);
  for(let i=0;i<11;i++){
    assert.equal((await read()).index,i);
    if(i===5)await screenshot('hat-transformation-story');
    await page.getByRole('button',{name:'Next story image',exact:true}).click();await wait(s=>s.index===i+1&&!s.busy);
  }
  assert.equal((await read()).total,12);
  // Keep the real menu/save path, then expose existing capture hooks for combat QA.
  await page.evaluate(()=>history.replaceState({},'','/?capture=1'));
  await page.getByRole('button',{name:'Begin Level 1',exact:true}).click();
  let state=await wait(s=>s.mode==='platforming'&&s.player?.grounded&&s.killerKlause);
  assert.equal(state.selectedCharacter.id,'killer_klause');assert.equal(state.seasonalTheme,'christmas');assert.deepEqual(state.failedAssets,[]);
  assert.equal(state.weapon.primary,'present_launcher');assert(Math.abs(state.player.visibleHeight-160)<3);
  await screenshot('klause-gameplay');record('all twelve story panels and actual Christmas gameplay');
  const initialX=state.player.x;await page.keyboard.down('ArrowRight');await page.waitForTimeout(260);await page.keyboard.up('ArrowRight');
  assert((await read()).player.x>initialX+30);await page.keyboard.press('z');await wait(s=>s.player&&!s.player.grounded);await wait(s=>s.player?.grounded);
  await page.evaluate(()=>{window.__unknownPlatformerEnemyTest('walker',5);window.__unknownPlatformerSetPlayerPosition(160,480)});
  await page.keyboard.press('ArrowRight');await page.keyboard.down('c');await wait(s=>s.killerKlause.shots>=1);
  await wait(s=>s.enemyDeaths?.length>0||s.enemies.every(e=>e.kind!=='walker'));await page.keyboard.up('c');
  await screenshot('present-hit');record('movement, jump and real present projectile enemy defeat');
  await wait(s=>!s.killerKlause.active);
  await page.evaluate(()=>{window.__unknownPlatformerSetPlayerPosition(160,480);window.__unknownPlatformerDamagePlayer(30)});
  await page.waitForTimeout(250);
  const health=(await read()).player.health;await page.keyboard.press('x');
  state=await wait(s=>s.killerKlause.helpers.healing>0&&s.killerKlause.helpers.engineerShots>=1);
  assert(state.player.health>health);await screenshot('elf-helpers');
  await page.keyboard.press('p');state=await wait(s=>s.mode==='paused');const cooldown=state.killerKlause.helpers.cooldownRemainingMs;
  await page.waitForTimeout(400);assert.equal((await read()).killerKlause.helpers.cooldownRemainingMs,cooldown);
  await page.keyboard.press('p');await wait(s=>s.mode==='platforming');record('elf healing, supporting present fire and pause-safe cooldown');
  await page.keyboard.press('p');await page.getByRole('button',{name:/Save.*Quit/i}).click();await code().waitFor();
  await page.getByRole('button',{name:'Christmas preview ON · Turn off',exact:true}).click();
  await page.reload();await page.evaluate(()=>window.__setChristmasTestDate('2026-12-26T07:00:00.000Z'));
  await page.getByRole('button',{name:'Continue Game',exact:true}).click();
  state=await wait(s=>s.mode==='platforming'&&s.killerKlause);assert.equal(state.seasonalTheme,'christmas');record('saved Christmas run resumes after expiry with preview disabled');

  await fresh({date:'2026-11-26T06:59:00.000Z'});await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();
  assert.equal(await klause().count(),0);
  await page.evaluate(()=>window.__setChristmasTestDate('2026-11-26T07:00:00.000Z'));await klause().waitFor();assert(await klause().isEnabled());
  assert.notEqual(await page.evaluate(key=>localStorage.getItem(key),previewKey),'true');
  await page.evaluate(()=>window.__setChristmasTestDate('2026-12-26T06:59:59.000Z'));assert(await klause().isEnabled());
  await page.evaluate(()=>window.__setChristmasTestDate('2026-12-26T07:00:00.000Z'));await klause().waitFor({state:'detached'});
  record('automatic Thanksgiving opening and exclusive post-Christmas expiry without a code');
  await fresh({date:'2026-11-26T12:00:00.000Z'});await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
  state=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(state.seasonalTheme,'christmas');
  record('public Christmas scenery starts with an ordinary hero and no code');

  await fresh({storageBlocked:true});await page.goto(origin);await enter('SantaKisComing');await page.getByRole('button',{name:'Start game',exact:true}).click();await klause().waitFor();assert(await klause().isEnabled());
  record('blocked browser storage still allows session preview');
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
    await fresh({viewport});await page.goto(origin);await code().waitFor({state:'visible'});await enter('SantaKisComing');
    const box=await code().boundingBox();assert(box.y>=0&&box.y+box.height<=viewport.height);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await screenshot('title-'+viewport.width);
  }
  record('phone portrait and landscape title entry stays visible');
  await fresh();await page.goto(origin);await enter('HaPpYtUrKeY');await page.getByRole('status').filter({hasText:'Code accepted'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('unknownUniverse.thanksgiving.v1')),'true');record('Thanksgiving code compatibility');
  await fresh();await page.goto(origin+'/?autostart=1&capture=1&level=5&code=SantaKisComing');
  state=await wait(s=>s.mode==='flight'||s.engine==='flight');await screenshot('klause-flight');record('Killer Klause flight assets load');
  for(const level of [2,3,4,6]){
    await page.goto(origin+`/?autostart=1&capture=1&level=${level}&code=SantaKisComing`);
    state=await wait(s=>s.mode==='platforming'&&s.level===level&&s.player?.grounded&&s.killerKlause);
    assert.deepEqual(state.failedAssets,[]);assert.equal(state.seasonalTheme,'christmas');await screenshot('klause-level-'+level);
  }
  record('all remaining ground stages load with Klause and the Christmas theme');
  await page.goto(origin+'/?autostart=1&capture=1&code=SantaKisComing');await wait(s=>s.mode==='platforming'&&s.player?.grounded);
  await page.keyboard.press('z');await wait(s=>s.player&&!s.player.grounded);
  await page.keyboard.press('z');await wait(s=>s.movement.heroMobility.doubleJumps===1);
  await page.keyboard.press('ArrowDown');await wait(s=>s.movement.heroMobility.bombs===1);
  await wait(s=>s.movement.heroMobility.impacts===1);record('Klause double jump and North Pole Drop use valid animation frames');
  await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(160,480));await page.waitForTimeout(1000);
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(100));
  state=await wait(s=>s.heroDeath.active);assert(state.heroDeath.frame>=8&&state.heroDeath.frame<=11);await screenshot('klause-defeat');
  await wait(s=>!s.heroDeath.active&&s.player?.health>0);record('Klause defeat animation and respawn');
  await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:5}));
  await page.keyboard.press('ArrowRight');await page.keyboard.down('c');await wait(s=>s.bossDefeated);await page.keyboard.up('c');
  state=await wait(s=>s.celebration.active);assert.equal(state.celebration.texture,'hero_victory');await screenshot('klause-victory');
  record('real boss defeat reaches Klause victory artwork');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed,errors},null,2));console.log(JSON.stringify({passed:passed.length,errors}));
}finally{await context?.close();await browser.close()}
