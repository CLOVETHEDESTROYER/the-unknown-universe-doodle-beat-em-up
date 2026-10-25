import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Browser plugin skill is absent; the repository Playwright drives real fights,
// complete defeat/landing sequences and exits, rather than injecting app phases.
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4380';
const engine=process.env.GAME_TEST_BROWSER||'chromium';
const lastLevel=Number(process.env.STORY_TEST_LAST_LEVEL||5);
const profiles=process.env.STORY_TEST_DEVICES?process.env.STORY_TEST_DEVICES.split(','):['Desktop Chrome','iPhone 15 landscape','iPhone 15','iPad Pro 11 landscape'];
const out=new URL(`../output/campaign-story-chapters-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const errors=[],evidence=[];let page,device;
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const shot=name=>page.screenshot({path:fileURLToPath(new URL(device.replaceAll(' ','-')+'-'+name+'.png',out))});
async function wait(fn,timeout=60000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(30);}
  throw Error('State timeout '+fn+'; actual '+JSON.stringify(await read()));
}
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const ground=level=>wait(s=>s.mode==='platforming'&&s.level===level&&s.player?.grounded);
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shipPlace=(x,y)=>page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x,y});
async function story(level,index=0){
  const s=await wait(s=>s.mode==='campaign-story'&&s.chapter===`level${level}`&&s.index===index&&!s.busy);
  assert(s.image.loaded&&!s.image.error);assert.equal(await page.locator('canvas').count(),0);
  assert.equal(await page.locator('.touch-controls').count(),0);
  assert.equal(s.resume.level,level+1);assert.equal(s.resume.selectedCharacterId,'zgod');
  assert(await page.locator('.campaign-story-art img').evaluate(img=>img.complete&&img.naturalWidth===1440));
  await page.waitForFunction(()=>document.querySelector('.campaign-story').getBoundingClientRect().bottom<=innerHeight+1);
  const size=page.viewportSize();
  for(const selector of ['.campaign-story-caption','.campaign-story-dialogue','.campaign-story nav','button']){
    for(const node of await page.locator('.campaign-story').locator(selector).all()){
      const b=await node.boundingBox();assert(b.x>=-1&&b.y>=-1&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,selector+' fits');
      assert(await node.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1),selector+' is readable');
      if(selector==='button')assert(b.width>=44&&b.height>=44);
    }
  }
  return s;
}
async function killGroundBoss(level){
  let s=await ground(level),boss=s.enemies.find(e=>e.kind==='boss');assert(boss);
  await place(boss.x-100,boss.floorY);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(25);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
  await wait(s=>s.bossDefeated&&s.bossDeath.stage==='finished');s=await read();
  assert.equal(s.bossDeath.bossId,level===3?'ink_behemoth':'kilina');
  await shot(`level${level}-actual-defeat`);
  await place(s.progress.levelEndX,520);
  const ending=await story(level);assert(ending.resume.score>=s.progress.score+900);
  return ending.resume;
}
function compareGround(s,saved){
  assert.equal(s.selectedCharacter.id,saved.selectedCharacterId);
  for(const key of ['score','souls','monstersDefeated'])assert.equal(s.progress[key],saved[key]);
  assert.equal(s.player.health,saved.health);assert.equal(s.player.lives,saved.lives);
  for(const key of ['active','hits'])assert.equal(s.equipment[key],saved.equipment[key]);
  assert.deepEqual(s.equipment.unlocked,saved.equipment.unlocked);
  assert.equal(s.dinio.active,saved.hasDinio);assert.equal(s.doghost.active,saved.hasDoghost);
  assert.equal(s.teleportationC.active,saved.hasTeleportationC);
  for(const key of ['shieldUnlocked','inkShieldReady','gravityCoreUnlocked','gravityCoreCharges'])assert.equal(s.powerups[key],saved[key]);
}
async function readEnding(level){
  const initial=await story(level);assert.equal(initial.total,4);
  assert.equal(await page.getByRole('button',{name:'Previous story image',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Next story image',exact:true}).click();await story(level,1);
  await page.getByRole('button',{name:'Previous story image',exact:true}).click();await story(level,0);
  for(let index=0;index<4;index++){
    if(index){
      if(device==='Desktop Chrome')await page.keyboard.press('ArrowRight');
      else await page.getByRole('button',{name:'Next story image',exact:true}).tap();
    }
    const s=await story(level,index);
    assert.equal(s.speaker,{3:['EZRA','KILLER KAI','X GOD','TELEPORTATION C'],4:['X GOD','TELEPORTATION C','Z-GOD','X GOD'],5:['X GOD','KILLER KAI · RADIO','NICO · RADIO','X GOD']}[level][index]);
    if(level===3&&index===2)assert(s.caption[0].includes('Void Regent'));
    if(level===4&&index===2)assert(s.caption[0].includes('looking for you'));
    if(level===5&&index===2)assert(s.caption[1].includes('Witchwood'));
    await shot(`level${level}-scene${index+1}`);
    assert.deepEqual(s.resume,initial.resume,'Reading never changes run state');
  }
  return initial.resume;
}
async function resume(level){
  await page.getByRole('button',{name:{3:'Enter Witchwood',4:'Begin Starbreak Run',5:'Enter Dread Planet'}[level],exact:true}).click();
  if(level===4)return wait(s=>s.engine==='flight'&&s.player);
  return ground(level+1);
}
async function killPursuerAndLand(){
  await advance(0);
  let s;
  for(let elapsed=0;elapsed<9000;elapsed+=80){
    s=await read();if(s.enemies.some(e=>e.kind==='pursuer'))break;await advance(80);
  }
  const boss=s.enemies.find(e=>e.kind==='pursuer');assert(boss,'Real Pursuer spawned');
  await shipPlace(650,boss.y-20);await page.keyboard.down('Space');
  for(let elapsed=0;elapsed<6000;elapsed+=80){
    s=await read();if(s.enemies.some(e=>e.kind==='pursuer'&&e.phase==='dying'))break;await advance(80);
  }
  await page.keyboard.up('Space');s=await read();assert(s.enemies.some(e=>e.kind==='pursuer'&&e.phase==='dying'));
  assert(!s.flight.finaleDefeated,'Wreck finishes before the story');
  await shot('pursuer-actual-wreck');await advance(2600);
  s=await read();assert(s.flight.finaleDefeated);assert.equal(s.combat.kills,1);
  const phases=new Set();
  for(let elapsed=0;elapsed<15000;elapsed+=150){
    s=await read();if(s.mode==='campaign-story')break;
    phases.add(s.flight.phase);await advance(150);
  }
  assert(phases.has('landing')&&phases.has('disembark'),'Real landing/disembark precedes ending');
  return (await story(5)).resume;
}
try{
  for(device of profiles){
    const context=await browser.newContext({...devices[device],deviceScaleFactor:1});page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
    const artRequests=new Set();page.on('request',r=>{if(/\/cutscenes\/.*\.webp$/.test(r.url()))artRequests.add(r.url());});
    await page.goto(origin+'/?autostart=1&capture=1&level=3&character=zgod&flightFinale=1&lives=2&score=1200&souls=4&kills=7&sword=1&shield=1&dinio=1&doghost=1&teleportc=1&gravityCore=1&gravityCoreCharges=2');
    // Portrait is readable during story; actual phone gameplay asks for landscape.
    if(device==='iPhone 15')await page.setViewportSize({width:852,height:393});
    let saved=await killGroundBoss(3);assert.equal(artRequests.size,1,'No other chapter art downloads early');
    for(let level=3;level<=lastLevel;level++){
      if(device==='iPhone 15')await page.setViewportSize({width:393,height:852});
      await readEnding(level);assert.equal(artRequests.size,(level-2)*4,'Only visited story images are requested');
      if(device==='iPhone 15')await page.setViewportSize({width:852,height:393});
      const resumed=await resume(level);assert.deepEqual(resumed.failedAssets,[]);
      if(level===4){
        assert.equal(resumed.selectedCharacter.id,'zgod');assert.equal(resumed.player.lives,saved.lives);assert.equal(resumed.progress.score,saved.score);
        assert.deepEqual(resumed.companionsOnboard,{dinio:saved.hasDinio,doghost:saved.hasDoghost,teleportationC:saved.hasTeleportationC});
      }else compareGround(resumed,saved);
      await shot(`level${level+1}-resumed`);
      if(level<lastLevel)saved=level===3?await killGroundBoss(4):await killPursuerAndLand();
    }
    evidence.push({device,chapters:lastLevel-2,realGroundBossDeaths:true,...lastLevel===5?{realFlightWreckAndLanding:true}: {},backAndNext:true,allCaptionsReadable:true,thumbTargets:true,stateAndHelpersPreserved:true,noEagerArtwork:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(error){
  await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));throw error;
}finally{await browser.close();}
