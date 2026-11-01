import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4398';
const out='output/typescript-cleanup/legacy';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}});
async function wait(fn,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(20)}throw Error('Timeout '+fn+' '+JSON.stringify(await read()))}
const step=ms=>page.waitForTimeout(ms);
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
async function boot(level=1,boss=false){await page.goto(`${origin}/?autostart=1&capture=1&legacyBrawler=1&level=${level}${boss?'&boss=1':''}`);await wait(s=>s.player&&typeof s.player.jumpZ==='number'&&['explore','combat'].includes(s.mode),60000)}
try{
 await boot();const start=(await read()).player.x;
 await page.keyboard.down('ArrowRight');await step(300);await page.keyboard.up('ArrowRight');assert((await read()).player.x>start+10);
 await page.keyboard.down('Space');await step(30);await page.keyboard.up('Space');assert((await read()).player.isAttacking);
 const flashed=await page.evaluate(()=>window.__unknownLegacyHitTest());assert(flashed.before>0);assert.equal(flashed.preserved,flashed.before);assert.equal(flashed.tint,0xef4444);await snap('attack-hit-flash');
 const damaged=await page.evaluate(()=>window.__unknownLegacyHitTest(10));assert(damaged.health<100);assert.equal(damaged.preserved,damaged.before);
 await wait(s=>!s.player.isAttacking&&s.player.tint===0xffffff&&Math.abs(s.player.scaleX-s.player.scaleY)<.001);let s=await read();await snap('hit-recovered');
 checks.push('hit flash and actual damage preserve the active attack tween; tint clears and attack returns to normal scale');
 const x=s.player.x;await page.keyboard.down('ArrowRight');await step(250);await page.keyboard.up('ArrowRight');assert((await read()).player.x>x);checks.push('movement remains controllable after damage');
 await page.keyboard.down('KeyZ');await step(80);await page.keyboard.up('KeyZ');s=await read();assert(s.player.isJumping||s.player.jumpZ>0);await snap('jump');checks.push('legacy jump remains functional');
 await step(1000);await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const paused=(await read()).player;await step(300);assert.deepEqual((await read()).player,paused);await page.getByRole('button',{name:'Resume Playing',exact:true}).click();await wait(s=>s.mode!=='paused');checks.push('pause/resume preserves state');
 for(const level of [1,2,3,4]){
  await boot(level,true);await wait(s=>s.boss);await snap('level-'+level+'-boss');
  await page.keyboard.down('Space');await step(400);await page.keyboard.up('Space');
  assert((await read()).monsters.every(m=>typeof m.type==='string'&&Number.isFinite(m.hp)));assert.deepEqual((await read()).failedAssets,[]);
 }
 checks.push('all four legacy level profiles and boss HUDs load without asset or runtime errors');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',checks,errors},null,2));console.log(checks);
}catch(e){await snap('failure');await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),state:await read(),checks,errors},null,2));throw e}finally{await browser.close()}
