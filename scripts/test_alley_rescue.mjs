import {enterAlleyFromSave} from './alley_test_helpers.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4391';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await fs.mkdir('output/alley-rescue',{recursive:true});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const walk=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key)};
try{
 await enterAlleyFromSave(page,origin);
 assert.equal((await state()).visual,'unarmed-idle');await page.screenshot({path:'output/alley-rescue/alley.png'});await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).visual==='unarmed-run');await page.keyboard.up('ArrowRight');await walk('ArrowRight',3200);assert((await state()).nearInteraction);await page.keyboard.press('e');assert.equal((await state()).room,'hall');
 await page.screenshot({path:'output/alley-rescue/hall.png'});await walk('ArrowRight',3200);await page.keyboard.press('e');assert.equal((await state()).room,'gunroom');
 await walk('ArrowRight',1600);await page.screenshot({path:'output/alley-rescue/kai.png'});assert((await state()).nearInteraction);await page.keyboard.press('e');assert.equal((await state()).phase,'approach');assert.equal(await page.evaluate(()=>localStorage.getItem('unknown-universe-kai-arm')),null);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='transfer');await page.screenshot({path:'output/alley-rescue/transfer.png'});
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='rise');await page.screenshot({path:'output/alley-rescue/rise.png'});
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='thanks');await page.screenshot({path:'output/alley-rescue/thanks.png'});
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='gift');assert.equal((await state()).armUnlocked,false);await page.keyboard.press('c');assert.equal((await state()).shots,0);await page.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.visual==='equip'&&s.pose>=2&&s.pose<=4});await page.screenshot({path:'output/alley-rescue/gift.png'});await page.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.visual==='equip'&&s.pose>=6});await page.screenshot({path:'output/alley-rescue/gift-raised.png'});
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).armUnlocked,{},{timeout:10000});assert((await state()).rescued);assert.equal(await page.evaluate(()=>localStorage.getItem('unknown-universe-kai-rescued')),'true');assert.equal(await page.evaluate(()=>localStorage.getItem('unknown-universe-kai-arm')),null);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1')).stats.equipment.blasterVariant==='kai_arm');
 await page.keyboard.press('c');assert.equal((await state()).shots,1);await page.screenshot({path:'output/alley-rescue/arm.png'});
 await walk('ArrowLeft',2500);await page.keyboard.press('e');assert.equal((await state()).room,'hall');await walk('ArrowLeft',3000);await page.keyboard.press('e');assert.equal((await state()).room,'alley');
 await page.getByRole('button',{name:'Save & Quit'}).click();await page.reload();await page.getByRole('button',{name:'Continue Game'}).click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).completed);await page.getByRole('button',{name:'Continue to Graveyard'}).click();await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player?.grounded}catch{return false}},{},{timeout:60000});let campaign=await state();assert.equal(campaign.weapon.kaiArm,true);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).player?.texture==='xgod_kai_arm');await page.screenshot({path:'output/alley-rescue/campaign-arm.png'});await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).player?.texture==='xgod_kai_arm_run');await page.screenshot({path:'output/alley-rescue/campaign-arm-run.png'});await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).player?.texture==='xgod_kai_arm');
 const shots=(await state()).weapon.shotsFired;await page.keyboard.down('KeyC');await page.waitForFunction(n=>JSON.parse(window.render_game_to_text()).weapon.shotsFired>n,shots);await page.keyboard.up('KeyC');assert.deepEqual(errors,[]);console.log('Rescue sequence, arm reward, reload, and campaign fire passed');
}finally{await browser.close()}
