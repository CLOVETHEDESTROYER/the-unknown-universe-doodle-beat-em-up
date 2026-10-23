import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1}),errors=[],evidence=[];
const out=new URL(`../output/companion-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=16000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
const place=(x,y=480)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=async n=>{const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL());await fs.writeFile(new URL(n+'.png',out),Buffer.from(png.split(',')[1],'base64'));};
async function boot(companion){await page.goto(`${origin}/?autostart=1&capture=1&level=1&character=xgod&${companion}=1`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});await place(220);}
try{
 await boot('dinio');await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[180],hp:4}));
 let s=await read(),kills=s.progress.monstersDefeated;await wait(s=>s.progress.monstersDefeated>kills);s=await read();assert(s.dinio.shots>=2&&s.dinio.hits>=2);await shot('dinio-defeat');
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
 const frames=new Set();await page.keyboard.down('ArrowRight');for(let n=0;n<8;n++){await page.waitForTimeout(55);s=await read();frames.add(s.dinio.frame);}await page.keyboard.up('ArrowRight');assert(frames.size>=2);
 await page.keyboard.press('KeyZ',{delay:100});await wait(s=>!s.dinio.grounded);await shot('dinio-hop');await wait(s=>s.dinio.grounded);
 await place(1100);await wait(s=>s.dinio.warps>0);assert(Math.abs((await read()).dinio.x-(await read()).player.x)<230);
 await boot('dinio');await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'tell'}));const shots=(await read()).dinio.shots;await page.waitForTimeout(1000);assert.equal((await read()).dinio.shots,shots,'Dinio waits for boss opening');
 await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover'}));
 // The left arena ledge blocks ground-level shots; stand on it to open a real firing lane.
 await place((await read()).enemies[0].x-50,385);await wait(s=>s.enemies[0].hp<100);assert((await read()).dinio.shots>shots);evidence.push({dinioRealKills:true,terrainHop:true,walkFrames:frames.size,catchup:true,bossOpenings:true});
 await boot('doghost');await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[90,160],hp:3}));s=await read();kills=s.progress.monstersDefeated;
 const attackFrames=new Set();await wait(s=>{if(s.doghost.attacking)attackFrames.add(s.doghost.frame);return s.progress.monstersDefeated>=kills+2;});s=await read();assert(s.doghost.hits>=2);assert(s.doghost.shots>=1);assert(attackFrames.size>=2);await shot('doghost-piercing-defeat');
 await boot('doghost');await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'tell'}));const ghostShots=(await read()).doghost.shots;await page.waitForTimeout(1600);assert.equal((await read()).doghost.shots,ghostShots);
 await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover'}));await wait(s=>s.enemies[0].hp<100);await shot('doghost-boss');evidence.push({doghostRealKills:true,piercingWave:true,howlFrames:[...attackFrames],bossOpenings:true});
 await boot('teleportc');await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[180],hp:8}));await wait(s=>s.teleportationC.strikes>0);s=await read();assert(s.enemies[0].hp<8&&s.enemies[0].hp>0,'Ally assists against healthy enemies');await shot('teleport-strike');await wait(s=>s.teleportationC.assist==='none');evidence.push({teleportHealthyEnemyStrike:true,returnsToFormation:true});
 // All three companions pause without movement, attacks or delayed damage advancing.
 await page.goto(`${origin}/?autostart=1&capture=1&level=1&dinio=1&doghost=1&teleportc=1`);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});
 await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');
 s=await read();await page.waitForTimeout(350);const paused=await read();for(const key of ['dinio','doghost','teleportationC'])assert.deepEqual(paused[key],s[key]);await shot('all-companions-paused');
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw e;}finally{await browser.close();}
