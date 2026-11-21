import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const out='output/combat-cosmetics';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('unknownUniverse.wallet.v1',JSON.stringify({version:1,gold:0,receipts:[],pending:null,owned:['rose','starlight','prism'],equipped:{ink:'rose',trail:'starlight',burst:'prism'}})));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(fn){const end=Date.now()+20000;while(Date.now()<end){const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
async function boot(){await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:5175'}/?autostart=1&capture=1`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,null,{timeout:60000});}
try{
 await boot();assert.equal((await read()).combatEffects.style.ink,'rose');
 await page.keyboard.down('c');let s=await until(s=>s.projectiles.some(p=>p.playerShot));
 const shot=s.projectiles.find(p=>p.playerShot);assert.equal(shot.tint,0xff79bb);assert.equal(shot.damage,2);assert.equal(shot.cosmeticInk,'rose');assert(s.combatEffects.activeTrails>0);
 await page.waitForTimeout(130);await page.screenshot({path:`${out}/rose-starlight-shots.png`});await page.keyboard.up('c');
 const grunt=(await read()).enemies.find(e=>e.kind==='walker');await page.evaluate(x=>window.__unknownPlatformerSetPlayerPosition(x,480),grunt.x-140);
 await page.keyboard.down('c');s=await until(s=>s.combatEffects.hits>0);await page.screenshot({path:`${out}/enemy-hit-flash.png`});await page.keyboard.up('c');
 await page.evaluate(()=>{window.__unknownPlatformerPrepareGateTest();window.__unknownPlatformerSetPlayerPosition(1800,480);});
 await page.keyboard.down('c');await until(s=>s.weapon.chargeReady);await page.screenshot({path:`${out}/rose-charge.png`});await page.keyboard.up('c');
 s=await until(s=>s.projectiles.some(p=>p.chargedShot));assert.equal(s.projectiles.find(p=>p.chargedShot).damage,6);assert.equal(s.projectiles.find(p=>p.chargedShot).tint,0xff79bb);
 await page.screenshot({path:`${out}/charged-starlight-trail.png`});
 await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(1800,260));await until(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:35});
 s=await until(s=>s.combatEffects.landings>0);assert.equal(s.combatEffects.style.burst,'prism');await page.waitForTimeout(90);await page.screenshot({path:`${out}/prism-butt-bomb.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await boot();assert((await read()).combatEffects.reducedMotion);await page.keyboard.press('c',{delay:80});await page.screenshot({path:`${out}/reduced-motion.png`});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,equippedCosmeticsInGame:true,normalDamage:2,chargeDamage:6,hitFlashes:true,slamRing:true,reducedMotion:true,errors}));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await fs.writeFile(`${out}/failure-state.json`,JSON.stringify(await read().catch(()=>null),null,2));throw e;}finally{await browser.close();}
