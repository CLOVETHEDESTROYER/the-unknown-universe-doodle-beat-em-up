import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4391';
const browser=await chromium.launch({headless:true,executablePath:process.env.GAME_TEST_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
await fs.mkdir('output/gate-runout',{recursive:true});
const heroes=['xgod','zgod','killer_kai','barrett','nico','ezra','teleportation_c','elytron','shadow_kid','turkey_king','xgod_sword','xgod_kai_arm','xgod_firing','killer_kai_firing'];const results=[];
try{
 for(const hero of heroes){
  if(hero==='xgod_kai_arm')await page.evaluate(()=>localStorage.setItem('unknown-universe-kai-arm','true'));
  const character=hero.startsWith('xgod_')?'xgod':hero==='killer_kai_firing'?'killer_kai':hero;
  await page.goto(`${origin}/?autostart=1&capture=1&level=2&unlockRoster=1&character=${character}${hero==='turkey_king'?'&code=allhailking':''}${hero==='xgod_sword'?'&sword=1&swordUnlocked=1':''}`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player?.grounded}catch{return false}},{},{timeout:60000});
  await page.evaluate(()=>window.__unknownPlatformerPrepareGateTest());if(hero.endsWith('_firing'))await page.keyboard.down('KeyC');await page.keyboard.down('ArrowRight');
  const observed=await page.evaluate(()=>new Promise((resolve,reject)=>{const deadline=performance.now()+9000, samples=[];let entered=false;function sample(){const s=JSON.parse(window.render_game_to_text());if(s.mode==='transition'&&s.player){entered=true;samples.push({x:s.player.x,frame:s.player.frame,texture:s.player.texture});}else if(entered){resolve(samples);return}if(performance.now()>deadline){reject(Error('gate transition timeout '+JSON.stringify({mode:s.mode,player:s.player,progress:s.progress,bossDefeated:s.bossDefeated,celebration:s.celebration})));return}requestAnimationFrame(sample)}requestAnimationFrame(sample)}));
  await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyC');const unique=new Set(observed.map(p=>p.texture+':'+p.frame));const travel=observed.at(-1).x-observed[0].x;
  assert(travel>40,`${hero} moves through gate (${travel})`);assert(unique.size>=3,`${hero} animates through gate, only ${[...unique]}`);assert.deepEqual(errors,[]);results.push({hero,frames:unique.size,travel:Math.round(travel)});console.log(hero,unique.size,Math.round(travel));
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
