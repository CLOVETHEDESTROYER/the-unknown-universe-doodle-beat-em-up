import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4387',out='output/boss-flow-v3';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
async function boot(level,seasonal=false){if(!page.url().startsWith(origin))await page.goto(origin);await page.evaluate(seasonal=>localStorage.setItem('unknownUniverse.thanksgiving.v1',String(seasonal)),seasonal);await page.goto(`${origin}/?autostart=1&capture=1&level=${level}`);await wait(s=>s.player?.grounded,60000);assert.deepEqual((await read()).failedAssets,[]);}
const shot=n=>page.screenshot({path:`${out}/${n}.png`});
async function sample(){return page.evaluate(()=>new Promise((resolve,reject)=>{
 const frames={tell:new Set(),attack:new Set(),recover:new Set()},textures=new Set(),end=performance.now()+9500;let attacks=0;
 function next(){const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');if(!b)return reject(Error('Missing boss'));
  if(frames[b.attackState])frames[b.attackState].add(b.visualFrame);textures.add(b.visualTexture);if(b.attackState==='attack')attacks++;
  if(b.attackState==='recover'&&b.stateElapsedMs>650)return resolve({frames:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,[...v]])),textures:[...textures],attacks});
  if(performance.now()>end)return reject(Error('Animation did not reach recovery'));requestAnimationFrame(next);
 }next();
}));}
try{
 for(const [level,moves,seasonal] of [[1,['fire_volley','dragon_lunge'],false],[2,['axe_dash','cannon_burst','leap_slam'],false],[3,['furnace_quake','cinder_bound','ember_rain'],false],[4,['frost_hex','ice_storm','witch_dash','rune_bloom'],false],[6,['star_fan','crown_nova','void_crash','blink_burst'],false],[1,['wing_gust','talon_charge'],true]]){
  if(process.argv[2]&&!process.argv[2].split(',').map(Number).includes(level))continue;
  await boot(level,seasonal);
  for(const move of moves){
   await page.evaluate(({move,level})=>{window.__unknownPlatformerBossRulesTest({state:'tell',naturalTiming:true,hp:100,...level===6?{regentMove:move}:{stageMove:move}});if(level===6){const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(Math.max(b.left+100,Math.min(b.right-100,b.x-260)),b.floorY);}}, {move,level});
   const trace=sample();trace.catch(()=>{});await wait(s=>{const b=s.enemies.find(e=>e.kind==='boss');return b?.attackState==='attack'&&b.move===move;});await page.waitForTimeout(140);await shot(`level-${level}-${move}`);
   const result=await trace;assert(result.frames.tell.length>=2,`${move}: anticipation has multiple poses`);assert(result.frames.attack.length>=2,`${move}: action changes pose`);assert(result.frames.recover.length>=2,`${move}: recovery settles`);
   evidence.push({level,move,...result});assert.deepEqual(errors,[]);
  }
 }
 await page.goto(`${origin}/?autostart=1&capture=1&level=5&flightFinale=1`);await wait(s=>s.engine==='flight'&&s.enemies?.some(e=>e.kind==='pursuer'),60000);
 const frames=new Set();const end=Date.now()+7000;
 while(Date.now()<end){const s=await read(),b=s.enemies.find(e=>e.kind==='pursuer');frames.add(b.visualFrame);await page.waitForTimeout(25);}
 assert(frames.size>=5,'Pursuer spools, fires, recoils and recovers');await shot('pursuer-animated');evidence.push({flightPursuerFrames:[...frames]});
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,cases:evidence.length,evidence,errors}));
}catch(error){await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
