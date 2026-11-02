import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Browser plugin skill is unavailable; use the project's installed Playwright.
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4392';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'unknown-universe-thanksgiving-v1');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],evidence=[];
let page,context;
const key='unknownUniverse.thanksgiving.v1';
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies?.find(e=>e.kind==='boss');
async function fresh(options={}){
  if(context)await context.close();
  context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
}
async function wait(fn,timeout=15000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    assert.deepEqual(errors,[]);
    const s=await read().catch(()=>null);
    if(s&&fn(s,boss(s)))return s;
    await page.waitForTimeout(25);
  }
  throw Error('Timed out: '+fn);
}
const shot=n=>page.screenshot({path:path.join(out,n+'.png')});
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=options=>page.evaluate(options=>window.__unknownPlatformerBossRulesTest(options),options);
async function run(level=1){
  await page.goto(`${origin}/?autostart=1&capture=1&finishLevel=1&level=${level}`);
  return wait((s,b)=>s.mode==='platforming'&&s.player?.grounded&&b&&s.bossArenaCamera?.locked
    &&s.bossArenaCamera.left>b.x-s.viewport.width+100&&s.bossArenaCamera.left<b.x,60000);
}
async function start(){await page.getByRole('button',{name:'Start game',exact:true}).click();}
async function enter(code){await page.getByLabel('Secret code',{exact:true}).fill(code);await page.getByRole('button',{name:'Apply code',exact:true}).click();}
try{
  await fresh();
  let s=await run();assert.equal(boss(s).bossId,'dark_dragon');assert.equal(s.autumnLeafCount,0);
  assert.deepEqual(s.failedAssets,[]);evidence.push({classicDragonWithoutCode:true});
  await page.goto(origin);await start();
  assert.equal(await page.title(),'The Unknown Universe');assert.equal(await page.locator('vite-error-overlay').count(),0);
  const locked=await page.locator('[data-character-id]:disabled').count();
  await enter('wrongturkey');assert.match(await page.locator('#secret-code-feedback').textContent(),/not recognized/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
  await page.getByLabel('Secret code',{exact:true}).fill('');
  await page.getByLabel('Secret code',{exact:true}).pressSequentially(' HappyTurkey ',{delay:35});
  await page.getByLabel('Secret code',{exact:true}).press('Enter');
  assert.match(await page.locator('#secret-code-feedback').textContent(),/Code accepted/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'true');
  assert.equal(await page.locator('[data-character-id]:disabled').count(),locked,'Seasonal code does not unlock the roster');
  await shot('desktop-code-accepted');
  await page.locator('[data-character-id="xgod"]').click();
  await page.getByRole('button',{name:'Skip story',exact:true}).click();
  s=await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);
  assert.equal(boss(s).bossId,'turkey');assert.equal(s.seasonalTheme,'thanksgiving');assert(s.autumnLeafCount>0);
  await page.keyboard.press('p');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1')));
  assert.equal(save.stats.seasonalTheme,'thanksgiving');
  // A changed preference must not rewrite a saved campaign's selected theme.
  await page.evaluate(key=>localStorage.setItem(key,'false'),key);await page.reload();
  await page.getByRole('button',{name:'Continue Game',exact:true}).click();
  s=await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);assert.equal(boss(s).bossId,'turkey');
  evidence.push({textCode:true,caseAndWhitespace:true,invalidCodeRejected:true,rosterUnaffected:true,saveContinueTheme:true});
  await page.evaluate(({key,save})=>{
    delete save.stats.seasonalTheme;localStorage.setItem('unknownUniverse.campaign.v1',JSON.stringify(save));localStorage.setItem(key,'true');
  },{key,save});
  await page.goto(origin);await page.getByRole('button',{name:'Continue Game',exact:true}).click();
  s=await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);
  assert.equal(boss(s).bossId,'dark_dragon','Older saves keep the classic boss even with a seasonal preference');
  evidence.push({oldSaveCompatible:true,savedThemeIndependentOfPreference:true});
  await page.evaluate(key=>localStorage.setItem(key,'true'),key);

  for(const phase of [1,2]){
    await run();await fixture({state:'tell',stageMove:'talon_charge',phase});
    s=await wait((s,b)=>b?.attackState==='tell');const startX=boss(s).startX;
    await shot(`phase${phase}-talons-warning`);
    s=await wait((s,b)=>b?.flightLeg==='charge'&&b.stateElapsedMs>=390);
    assert.equal(boss(s).visualFrame,3);assert(Math.abs(boss(s).x-startX)>60);assert(boss(s).y<boss(s).floorY-40);
    await shot(`phase${phase}-talon-charge`);
    s=await wait((s,b)=>b?.flightLeg==='retreat');assert.equal(boss(s).canDamage,false);
    const hp=s.player.health;await place(boss(s).x,boss(s).y);
    await page.waitForTimeout(150);s=await read();assert.equal(s.player.health,hp,'Retreat is harmless');
    await shot(`phase${phase}-retreat`);
    s=await wait((s,b)=>b?.vulnerable&&b.visualFrame===9);assert(Math.abs(boss(s).x-startX)<4,'Turkey flies home before recovering');
    assert.equal(boss(s).visualFrame,9);assert(boss(s).recoveryRemainingMs>2000);
    await shot(`phase${phase}-recover`);
    evidence.push({phase,talonFlight:true,harmlessRetreat:true,returnsHome:true,counterWindow:true});

    await fixture({state:'attack',stageMove:'wing_gust',phase});
    s=await read();const initialX=s.player.x;
    s=await wait((s,b)=>b?.gustPushes>0);assert(s.player.velocityX< -200);assert(s.player.health<100);
    await page.waitForTimeout(180);s=await read();assert(s.player.x<initialX-35,'Wind causes real displacement');
    await shot(`phase${phase}-wing-gust-push`);
    s=await wait((s,b)=>b?.vulnerable);assert(!s.projectiles.some(p=>p.sourceBoss==='turkey'),'Gusts clear during recovery');
    evidence.push({phase,wingGust:true,actualKnockback:true,safeRecovery:true});
  }

  await run();await fixture({state:'tell',stageMove:'wing_gust'});
  s=await wait((s,b)=>b.attackState==='tell');await page.keyboard.press('p');
  s=await wait(s=>s.mode==='paused');const elapsed=boss(s).stateElapsedMs;
  await page.waitForTimeout(1200);assert.equal(boss(await read()).stateElapsedMs,elapsed);
  await page.keyboard.press('p');s=await wait(s=>s.mode==='platforming');assert.equal(boss(s).attackState,'tell');
  assert(boss(s).stateElapsedMs<elapsed+250,'Pause keeps warning time');
  await wait((s,b)=>b.attackState==='attack');await page.keyboard.down('z');
  s=await wait(s=>s.player.velocityY< -400);const jumpHp=s.player.health;
  await page.waitForTimeout(430);s=await read();assert.equal(s.player.health,jumpHp,'A real jump clears the first wind pulse');
  await shot('jump-over-gust');await page.keyboard.up('z');
  evidence.push({pauseFreezes:true,resumePreservesWarning:true,realJumpDodgesGust:true});

  await run();await fixture({state:'recover',hp:1});
  s=await read();await place(boss(s).x-180,boss(s).floorY);
  await page.keyboard.press('ArrowRight',{delay:25});await page.keyboard.down('Space');
  s=await wait(s=>s.bossDeath?.visible);await page.keyboard.up('Space');
  assert.equal(s.bossDeath.bossId,'turkey');assert.equal(s.bossDeath.texture,'boss_death_turkey');
  await page.waitForTimeout(700);await shot('turkey-defeated');
  s=await wait(s=>s.bossDefeated||s.bossDeath?.stage==='finished');
  assert(!boss(s));assert(s.pickups.some(p=>p.kind==='power'),'Original boss reward remains available');
  evidence.push({realBlasterDefeat:true,turkeyDeathArt:true,rewardAndBarrier:true});

  // Seasonal mode swaps only level one; level two keeps its original encounter.
  s=await run(2);assert.equal(boss(s).bossId,'killinas_daughter');evidence.push({otherBossesPreserved:true});

  for(const viewport of [{width:844,height:390},{width:734,height:290},{width:390,height:844}]){
    await fresh({...devices['iPhone 13'],viewport,deviceScaleFactor:1});
    await page.goto(origin);await start();await enter('happyturkey');
    const input=await page.getByLabel('Secret code',{exact:true}).boundingBox();
    assert(input.x>=0&&input.x+input.width<=viewport.width&&input.y>=0&&input.y+input.height<=viewport.height);
    const card=await page.locator('[data-character-id="xgod"]').boundingBox();
    assert(card.height>80&&card.y>=0&&card.y+card.height<=viewport.height,'Cards remain usable alongside code field');
    await page.waitForTimeout(350);await shot(`mobile-code-${viewport.width}x${viewport.height}`);
    if(viewport.width>viewport.height){s=await run();assert.equal(boss(s).bossId,'turkey');assert.deepEqual(s.failedAssets,[]);await shot(`mobile-turkey-${viewport.width}x${viewport.height}`);}
    evidence.push({viewport,mobileCode:true,cardsVisible:true});
  }
  await fresh();await page.goto(origin);await start();await enter('happyturkey');
  await page.getByRole('button',{name:'Thanksgiving ON · Turn off',exact:true}).click();
  await page.reload();s=await run();assert.equal(boss(s).bossId,'dark_dragon');evidence.push({classicToggle:true,persistedOff:true});
  await fresh();await page.goto(origin);await start();
  for(const direction of ['up','down','up','down','left','right','left'])await page.getByRole('button',{name:`Code direction: ${direction}`,exact:true}).click();
  assert.equal(await page.locator('[data-character-id]:disabled').count(),0);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);evidence.push({dpadStillWorks:true});
  await fresh();await context.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage unavailable','QuotaExceededError');};});
  await page.goto(origin);await start();await enter('happyturkey');
  await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
  s=await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);assert.equal(boss(s).bossId,'turkey');
  evidence.push({storageDeniedSessionFallback:true});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,out,evidence,errors}));
}catch(error){
  const state=await read().catch(()=>null);
  await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),state,evidence,errors},null,2));
  await shot('failure').catch(()=>{});throw error;
}finally{await browser.close();}
