import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4393';
const mobile=process.env.SIZE_MOBILE==='1';
const out='output/character-sizing'+(mobile?'/mobile':'');await fs.mkdir(out,{recursive:true});
const specs=JSON.parse(await fs.readFile('gameplay/characterSizes.generated.json','utf8'));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage(mobile?{...devices['iPhone 15 landscape'],deviceScaleFactor:1}:{viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame/.test(m.text()))errors.push(m.text())});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}});
async function wait(fn,timeout=30000){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25)}throw Error('Timeout '+fn+' '+JSON.stringify(await read()))}
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
async function boot(hero,level=4){await page.goto(`${origin}/?autostart=1&unlockRoster=1&capture=1&character=${hero}&level=${level}`);return wait(s=>level===5?s.engine==='flight'&&s.ship?.visible:s.mode==='platforming'&&s.player?.grounded,60000)}
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
async function arena(){await fixture({offsets:[]});await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(1160,520));await wait(s=>s.player.grounded)}
try{
 for(const hero of process.env.SIZE_HEROES?.split(',')||Object.keys(specs)){
  const target=specs[hero].target;await boot(hero,3);await arena();
  let s=await read();assert(Math.abs(s.player.visibleHeight-target)<target*.10,`${hero} idle ${s.player.visibleHeight} vs ${target}`);
  assert.equal(s.player.bodyHeight,hero==='zgod'?76:108);await snap(hero+'-idle');
  const record={hero,target,idle:s.player.visibleHeight,powers:[],checks:[]};
  await page.keyboard.down('ArrowRight');await wait(s=>s.player.velocityX>200);await snap(hero+'-run');await page.keyboard.up('ArrowRight');
  await arena();await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);assert.equal((await read()).player.bodyHeight,hero==='zgod'?48:60);await snap(hero+'-crouch');await page.keyboard.up('ArrowDown');await wait(s=>!s.player.crouching);
  // Hold through screenshot capture so tool latency cannot cut the first jump short.
  await page.keyboard.down('ArrowUp');await wait(s=>!s.player.grounded);await snap(hero+'-jump');await page.keyboard.up('ArrowUp');
  if(hero!=='zgod'){await page.waitForTimeout(50);await page.keyboard.press('KeyZ',{delay:70});await wait(s=>s.movement?.heroMobility?.doubleJumps>0||s.movement?.xgodMobility?.doubleJumps>0);await snap(hero+'-double-jump');await page.keyboard.press('ArrowDown',{delay:70});await wait(s=>(s.movement?.heroMobility?.impacts??s.movement?.xgodMobility?.impacts)>0)}
  record.checks.push('run/crouch/jump/slam');
  if(mobile){results.push(record);console.log(hero,'mobile passed',record.idle);continue;}
  await boot(hero);await arena();
  for(const power of ['blaster','sword','frost','ember','storm']){
   await page.evaluate(k=>window.__unknownPlatformerCollectPickup(k),power);await page.waitForTimeout(300);await wait(s=>s.player.grounded&&!s.celebration?.active);
   s=await read();assert.equal(s.equipment.active,power);
   // Raised swords and helmets can extend beyond the standing body reference.
   assert(s.player.visibleHeight>target*.7&&s.player.visibleHeight<target*1.5,`${hero}/${power} ${s.player.visibleHeight}`);
   record.powers.push({power,height:s.player.visibleHeight,scale:s.player.visualScale});await snap(hero+'-'+power);
   await page.keyboard.press('Space',{delay:70});await page.waitForTimeout(380);await snap(hero+'-'+power+'-attack');await page.waitForTimeout(450);
  }
  await boot(hero,3);await arena();await fixture({offsets:[150],hp:30});await page.keyboard.press('KeyX',{delay:45});
  s=await wait(s=>s.special.active);assert(Math.abs(s.special.visualScale-target/specs[hero].special)<.001);await snap(hero+'-special');record.checks.push('special scale');
  if(hero!=='zgod'){
   await boot(hero,3);await arena();await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10));await snap(hero+'-hurt');await page.waitForTimeout(1100);
   await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));await wait(s=>s.heroDeath.active);await snap(hero+'-death');await wait(s=>!s.heroDeath.active&&s.player.visible&&s.player.grounded);record.checks.push('death/respawn');
  }
  await boot(hero,1);await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:1}));
  const boss=(await read()).enemies.find(e=>e.kind==='boss');await page.evaluate(b=>window.__unknownPlatformerSetPlayerPosition(b.x-75,b.floorY),boss);
  await page.keyboard.down('Space');s=await wait(s=>s.celebration?.active);await page.keyboard.up('Space');assert(Math.abs(s.celebration.visualScale-target/specs[hero].victory)<.001);await snap(hero+'-victory');
  await boot(hero,5);await snap(hero+'-boarding');await page.evaluate(()=>window.advanceTime(4800));s=await read();assert(s.ship.pilotVisible);assert.deepEqual(s.failedAssets,[]);record.checks.push('victory/flight');results.push(record);console.log(hero,'passed',record.idle);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',results,errors},null,2));
}catch(e){await snap('failure');await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),state:await read(),results,errors},null,2));throw e}finally{await browser.close()}
