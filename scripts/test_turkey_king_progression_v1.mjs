import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'turkey-king-progression');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const wait=async(fn,ms=60000)=>{const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);};
 await page.goto((process.env.GAME_TEST_URL||'http://127.0.0.1:54821')+'/?autostart=1&level=1&finishLevel=1&capture=1&code=allhailking');
 await wait(s=>s.player?.grounded&&s.turkeyKing);
 await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',stageMove:'wing_gust',hp:4}));
 await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');window.__unknownPlatformerSetPlayerPosition(b.x-200,b.floorY);});
 await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('c');await wait(s=>s.bossDefeated);await page.keyboard.up('c');
 let s=await wait(s=>s.bossDeath.stage==='finished'&&!s.celebration.active);assert.equal(s.equipment.active,'hands');assert.equal(s.powerups.hasFlameSword,false);assert(!s.pickups.some(p=>p.kind==='power'));
 await page.screenshot({path:path.join(out,'king-level1-victory.png')});
 await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text());window.__unknownPlatformerSetPlayerPosition(s.progress.levelEndX,480);});
 s=await wait(s=>s.mode==='campaign-story'&&s.chapter==='level1');assert.equal(s.resume.selectedCharacterId,'turkey_king');assert.equal(s.resume.equipment.active,'hands');
 await page.getByRole('button',{name:'Skip story',exact:true}).click();s=await wait(s=>s.mode==='platforming'&&s.level===2&&s.player?.grounded);assert.equal(s.selectedCharacter.id,'turkey_king');assert.equal(s.equipment.active,'hands');assert.deepEqual(s.failedAssets,[]);
 await page.screenshot({path:path.join(out,'king-level2.png')});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,actualBossDefeat:true,victoryArt:true,clearDoesNotEquipSword:true,chapter2NativeWeapons:true,errors}));
}finally{await browser.close();}
