import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4398',out='output/typescript-cleanup/projectiles';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}}),boss=s=>s.enemies.find(e=>e.kind==='boss');
async function wait(fn,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(15)}throw Error('Timeout '+fn+' '+JSON.stringify(await read()))}
async function boot(level){await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=xgod`);return wait(s=>s.mode==='platforming'&&s.player?.grounded,60000)}
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerBossRulesTest(o),o);
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
try{
 await boot(3);await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[170],hp:30}));await page.keyboard.down('Space');
 await wait(s=>s.weapon.shotsFired>0&&s.projectiles.some(p=>p.playerShot&&p.velocityY===0));await wait(s=>s.enemies.some(e=>e.hp<30));await page.keyboard.up('Space');await snap('blaster-hit');checks.push('ordinary dynamic blaster projectiles travel horizontally and damage enemies');
 await boot(2);await fixture({state:'attack',phase:2});await wait(s=>s.projectiles.some(p=>p.enemyProjectile));await snap('cannon-burst');checks.push('phase-two cannon projectiles spawn with dynamic bodies');
 for(const [level,move,pattern] of [[3,'cinder_bound','quake'],[4,'witch_step','witch_wisp']]){
  await boot(level);
  for(const phase of [1,2]){
   await fixture({state:'attack',stageMove:move,phase});
   let s=await read();await page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x:boss(s).right+90,y:boss(s).floorY});
   s=await wait(s=>s.projectiles.some(p=>p.pattern===pattern));assert.equal(boss(s).attackState,'attack');assert(!boss(s).vulnerable);
   assert(s.projectiles.filter(p=>p.pattern===pattern).every(p=>p.velocityY===0));
   const appearedAt=boss(s).stateElapsedMs;
   await page.waitForTimeout(150);s=await read();assert(s.projectiles.some(p=>p.pattern===pattern),'Landing wave survives beyond a single update');await snap(`${move}-phase${phase}-wave`);
   s=await wait(s=>boss(s).vulnerable);assert.equal(boss(s).attackState,'recover');assert(!s.projectiles.some(p=>p.sourceBoss),'Recovery clears boss-owned shots');
   assert(boss(s).recoveryRemainingMs>0&&boss(s).recoveryRemainingMs<=boss(s).recoveryDurationMs);assert.equal(boss(s).recoveryDurationMs,level===3?(phase===1?2800:2400):(phase===1?2600:2200));
   await snap(`${move}-phase${phase}-safe-opening`);checks.push({move,phase,appearedAt,wavesLive:true,recoverySafe:true,fullCounterWindow:true});
   await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const frozen=boss(await read());await page.waitForTimeout(200);assert.deepEqual(boss(await read()),frozen);await page.getByRole('button',{name:'Resume Playing',exact:true}).click();
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',checks,errors},null,2));console.log(checks);
}catch(e){await snap('failure');await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),state:await read(),checks,errors},null,2));throw e}finally{await browser.close()}
