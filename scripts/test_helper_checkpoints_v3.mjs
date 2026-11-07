import {chromium,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4387',out='output/helper-checkpoints-v3';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});let context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();const errors=[],evidence=[];
function watch(){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});}watch();
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function wait(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
async function boot(level,query=''){await page.goto(`${origin}/?autostart=1&capture=1&level=${level}${query}`);return wait(s=>s.player?.grounded,60000);}
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
async function sample(ms){return page.evaluate(ms=>new Promise(resolve=>{const end=performance.now()+ms,frames=new Set(),modes=new Set();function next(){const s=JSON.parse(window.render_game_to_text());frames.add(Number(s.teleportationC.frame));modes.add(s.teleportationC.mode);if(performance.now()>=end)resolve({frames:[...frames],modes:[...modes]});else requestAnimationFrame(next);}next();}),ms);}
try{
 for(const level of [1,2,3,4,6]){
  let s=await boot(level);for(const f of s.checkpointFlags){assert(Math.abs(f.width-69.6)<.01);assert(Math.abs(f.height-98.4)<.01);assert(s.terrain.platforms.some(p=>f.x>=p.x+10&&f.x<=p.x+p.w-10&&f.groundY===p.y),'Every flag base rests entirely on a solid surface');}
  const flag=s.checkpointFlags[0];await place(flag.x-90,flag.groundY);await page.keyboard.down('ArrowRight');s=await wait(s=>s.checkpoint.index>=0);await page.keyboard.up('ArrowRight');await shot(`level-${level}-grounded-flag`);
  await page.evaluate(()=>window.__unknownPlatformerForceFall());s=await wait(s=>s.player.grounded&&Math.abs(s.player.x-flag.x)<35);assert(Math.abs(s.player.bodyBottom-flag.groundY)<4);
  await place(flag.x+120,flag.groundY);await page.waitForTimeout(150);await shot(`level-${level}-flag-base`);
  evidence.push({level,flags:s.checkpointFlags.length,allGrounded:true,sizeMultiplier:1.2,realActivationAndRespawn:true});
 }
 await boot(3);let s=await read();const orb=s.pickups.find(p=>p.kind==='teleportation_c');assert(orb);await place(orb.x,520);await wait(s=>s.teleportationC.active);
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));await place(200,520);await page.waitForTimeout(900);
 const idle=await sample(900);assert(idle.modes.includes('idle'));assert(idle.frames.filter(f=>f>=0&&f<=3).length>=3);await shot('helper-idle');
 await page.keyboard.down('ArrowRight');const run=await sample(850);await page.keyboard.up('ArrowRight');assert(run.frames.filter(f=>f>=4&&f<=11).length>=5);await shot('helper-run');
 await page.keyboard.down('z');const air=await sample(850);await page.keyboard.up('z');assert(air.modes.includes('airborne'));assert(air.frames.some(f=>f>=12&&f<=14));await wait(s=>s.player.grounded);await shot('helper-land');
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[180],hp:20}));const strike=await sample(750);s=await read();assert(s.teleportationC.strikes>=1);assert(strike.frames.filter(f=>f>=16&&f<=19).length>=3);await shot('helper-strike-return');
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));await wait(s=>s.teleportationC.cooldownRemainingMs===0);await place(220,520);
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[],projectile:true}));await page.keyboard.down('ArrowRight');const intercept=await sample(750);await page.keyboard.up('ArrowRight');
 s=await read();assert(s.teleportationC.intercepts>=1);assert(intercept.frames.filter(f=>f>=20&&f<=23).length>=3);await shot('helper-intercept-return');
 await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');await page.waitForTimeout(300);assert.deepEqual((await read()).teleportationC,s.teleportationC);await page.keyboard.press('p');await wait(s=>s.mode==='platforming');
 evidence.push({realLevel3Pickup:true,idle,run,air,strike,intercept,realAssistDamage:true,pause:true});
 await context.close();context=await browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:1});page=await context.newPage();watch();await boot(3,'&teleportc=1');await shot('phone-helper-flags');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
