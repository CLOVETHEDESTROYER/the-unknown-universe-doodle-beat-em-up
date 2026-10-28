import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Browser plugin skill is absent; use the repository's installed Playwright.
// Flow: select hero -> opening -> playable level -> actual boss defeat/exit ->
// ending -> next playable level with the final run snapshot preserved.
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4380';
const engine=process.env.GAME_TEST_BROWSER||'chromium';
const out=new URL(`../output/campaign-story-v1/${engine}/`,import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const errors=[],evidence=[];let page;
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function wait(predicate,timeout=60000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const s=await read();if(s&&predicate(s))return s;await page.waitForTimeout(30);}
  throw Error('State timeout: '+predicate+'; actual '+JSON.stringify(await read()));
}
async function fresh(device='Desktop Chrome'){
  const context=await browser.newContext({...devices[device],deviceScaleFactor:1});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  return context;
}
async function story(chapter,index=0){
  const state=await wait(s=>s.mode==='campaign-story'&&s.chapter===chapter&&s.index===index&&!s.busy);
  assert(state.image.loaded&&!state.image.error);assert.equal(await page.locator('canvas').count(),0,'The renderer is released while reading the story');
  assert.equal(await page.locator('.touch-controls').count(),0,'No gameplay input behind the story');
  assert(await page.locator('.campaign-story-art img').evaluate(img=>img.complete&&img.naturalWidth===1440));
  return state;
}
async function bounds(){
  // App fits visualViewport on the next animation frame after orientation changes.
  await page.waitForFunction(()=>{
    const b=document.querySelector('.campaign-story').getBoundingClientRect();
    return b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1;
  });
  const size=page.viewportSize();
  for(const selector of ['.campaign-story-header','.campaign-story-art','.campaign-story-dialogue','.campaign-story-caption','.campaign-story nav','button']){
    for(const node of await page.locator('.campaign-story').locator(selector).all()){
      const b=await node.boundingBox();assert(b.x>=-1&&b.y>=-1&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,selector+' fits');
      assert(await node.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1),selector+' has no clipping');
      if(selector==='button')assert(b.width>=44&&b.height>=44);
    }
  }
}
async function begin(hero='xgod'){
  await page.goto(origin+'/?capture=1&unlockRoster=1');
  assert.equal(await page.title(),'The Unknown Universe');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator(`[data-character-id="${hero}"]`).click();
  return story('prologue');
}
async function playable(level){return wait(s=>s.mode==='platforming'&&s.level===level&&s.player?.grounded);}
async function defeatAndExit(level){
  let state=await playable(level),boss=state.enemies.find(e=>e.kind==='boss');
  assert(boss,'The real campaign boss exists');
  await page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x:boss.x-100,y:boss.floorY});
  // Invincible Z-God's normal attack defeats even a guarded boss in one hit.
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(25);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
  await wait(s=>s.bossDeath?.stage==='finished'&&s.bossDefeated);
  state=await read();await shot(`level${level}-boss-defeated`);
  await page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x:state.progress.levelEndX,y:level===1?480:520});
  const ending=await story(`level${level}`);
  assert.equal(ending.resume.level,level+1);assert.equal(ending.resume.selectedCharacterId,'zgod');
  assert(ending.resume.score>=state.progress.score+900,'The clear reward is granted before story playback');
  assert.equal(ending.resume.lives,state.player.lives);
  return ending.resume;
}
function compareSnapshot(state,saved){
  assert.equal(state.selectedCharacter.id,saved.selectedCharacterId);
  assert.equal(state.progress.score,saved.score);assert.equal(state.progress.souls,saved.souls);
  assert.equal(state.progress.monstersDefeated,saved.monstersDefeated);
  assert.equal(state.player.health,saved.health);assert.equal(state.player.lives,saved.lives);
  for(const key of ['active','hits'])assert.equal(state.equipment[key],saved.equipment[key]);
  assert.deepEqual(state.equipment.unlocked,saved.equipment.unlocked);
  assert.equal(state.dinio.active,saved.hasDinio);assert.equal(state.doghost.active,saved.hasDoghost);
  assert.equal(state.teleportationC.active,saved.hasTeleportationC);
  assert.equal(state.powerups.shieldUnlocked,saved.shieldUnlocked);
  assert.equal(state.powerups.inkShieldReady,saved.inkShieldReady);
}
try{
  for(const device of ['Desktop Chrome','iPhone 15 landscape','iPhone 15','iPad Pro 11 landscape']){
    const context=await fresh(device),requests=[];
    page.on('request',r=>{if(r.url().includes('/cutscenes/')&&/\.(png|webp)$/.test(r.url()))requests.push(r.url());});
    await begin();await bounds();assert.equal(requests.length,1,'Only the displayed story illustration loads');
    await shot(device.replaceAll(' ','-')+'-opening');
    await page.keyboard.press('ArrowRight');await story('prologue',1);
    await page.keyboard.press('ArrowLeft');await story('prologue',0);
    await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,cancelable:true})));
    assert.equal((await read()).index,0,'Held keys do not rush through a scene');
    for(let index=1;index<6;index++){
      await page.getByRole('button',{name:'Next story image',exact:true}).click();await story('prologue',index);await bounds();
    }
    await shot(device.replaceAll(' ','-')+'-transformation');
    if(device==='iPhone 15')await page.setViewportSize({width:852,height:393});
    await page.getByRole('button',{name:'Begin Level 1',exact:true}).click();
    const state=await playable(1);assert.equal(state.selectedCharacter.id,'xgod');
    assert.deepEqual(state.failedAssets,[]);await shot(device.replaceAll(' ','-')+'-playable');
    evidence.push({device,opening:true,back:true,noAutorepeat:true,fullArt:true,thumbTargets:true,continueToPlayable:true});
    await context.close();
  }
  // Alternate hero retains their gameplay identity; the header labels X's account.
  let context=await fresh();await begin('killer_kai');
  assert.equal((await read()).resume.selectedCharacterId,'killer_kai');
  assert((await page.locator('.campaign-story-header').innerText()).includes("X GOD'S STORY"));
  await page.keyboard.press('Escape');assert.equal((await playable(1)).selectedCharacter.id,'killer_kai');
  await shot('kai-skipped-opening');await context.close();evidence.push({alternateHero:true,escapeSkip:true});

  // A missing image never blocks captions, retry, skip or entering the game.
  context=await fresh();await page.route('**/cutscenes/**/*.webp',r=>r.abort());
  await page.goto(origin+'/?capture=1');await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('[data-character-id="xgod"]').click();
  await wait(s=>s.mode==='campaign-story'&&s.image.error);
  assert(await page.getByRole('button',{name:'Retry image',exact:true}).isVisible());
  assert((await page.locator('.campaign-story-caption').innerText()).includes('Earthior'));
  await shot('missing-image-recovery');await page.unroute('**/cutscenes/**/*.webp');
  await page.getByRole('button',{name:'Retry image',exact:true}).click();await story('prologue');
  await page.getByRole('button',{name:'Skip story',exact:true}).click();await playable(1);await context.close();
  evidence.push({imageFailureReadable:true,retry:true,skip:true});

  // Real kills, full death sequences, real exit overlaps; no synthetic level change.
  context=await fresh();
  await page.goto(origin+'/?autostart=1&capture=1&character=zgod&score=1234&souls=4&kills=7&lives=2');
  let saved=await defeatAndExit(1);await shot('level1-ending');
  await page.setViewportSize({width:852,height:393});await bounds();await shot('level1-ending-phone');
  const stable=JSON.stringify(saved);await page.waitForTimeout(1000);assert.equal(JSON.stringify((await read()).resume),stable,'Run stats stay frozen during the scene');
  await page.getByRole('button',{name:'Skip story',exact:true}).click();
  let state=await playable(2);compareSnapshot(state,saved);await shot('level2-resumed');
  saved=await defeatAndExit(2);
  for(let index=1;index<4;index++){
    await page.getByRole('button',{name:'Next story image',exact:true}).click();
    await story('level2',index);await bounds();await shot('graveyard-'+index);
    if(index===2){
      assert.equal((await read()).speaker,'NICO · RADIO');
      await page.setViewportSize({width:393,height:852});await bounds();await shot('graveyard-radio-portrait');
      await page.setViewportSize({width:852,height:393});await bounds();
    }
  }
  assert.equal((await read()).speaker,'X GOD');
  // Rapid double activation must not jump two campaign levels.
  await page.getByRole('button',{name:'Enter the Furnace',exact:true}).evaluate(button=>{button.click();button.click();});
  state=await playable(3);compareSnapshot(state,saved);assert.equal(state.level,3);await shot('level3-resumed');
  await context.close();evidence.push({realBossDeaths:true,exitStory1:true,exitStory2:true,snapshotsPreserved:true,noInventedHelpers:true,noDoubleAdvance:true});

  // Existing debug entry bypasses opening, and non-default health survives mount.
  context=await fresh();await page.goto(origin+'/?autostart=1&capture=1&level=2&health=73&lives=2');
  state=await playable(2);assert.equal(state.player.health,73);assert.equal(state.player.lives,2);assert.equal(await page.locator('.campaign-story').count(),0);
  await context.close();evidence.push({debugEntryPreserved:true,healthSnapshot:true});

  context=await fresh();
  await page.goto(origin+'/?autostart=1&capture=1&level=2&character=zgod&dinio=1&doghost=1&teleportc=1&shield=1');
  saved=await defeatAndExit(2);assert(saved.hasDinio&&saved.hasDoghost&&saved.hasTeleportationC&&saved.inkShieldReady);
  await page.getByRole('button',{name:'Skip story',exact:true}).click();state=await playable(3);compareSnapshot(state,saved);
  await context.close();evidence.push({collectedHelpersPreserved:true,shieldPreserved:true});
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(error){
  await shot('failure').catch(()=>{});
  await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));throw error;
}finally{await browser.close();}
