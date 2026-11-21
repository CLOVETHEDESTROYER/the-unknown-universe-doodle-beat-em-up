import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const out='output/playwright/mobile-edge-to-edge';await fs.mkdir(out,{recursive:true});
const reports=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const [label,viewport,level] of [
   ['iphone',{width:852,height:350},2],
   ['small-phone',{width:667,height:300},1],
   ['ipad',{width:1024,height:768},2],
   ['flight',{width:852,height:350},5],
   ['desktop',{width:1280,height:800},2]
  ]){
   const context=await browser.newContext({...label==='desktop'?{}:devices['iPhone 15 landscape'],viewport,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
   try{
    await page.goto(`${origin}/?autostart=1&level=${level}&capture=1`);
    await page.waitForFunction(()=>{try{const s=JSON.parse(window.render_game_to_text());return s.player?.grounded||s.level===5&&s.ship?.visible;}catch{return false;}},{},{timeout:90000});
    await page.locator('[aria-label="Loading game"]').waitFor({state:'hidden',timeout:90000});
    const geometry=async()=>page.evaluate(()=>{
     const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
     return {host:rect(document.querySelector('.unknown-universe-game')),canvas:rect(document.querySelector('.unknown-universe-game canvas')),
      pause:rect(document.querySelector('.game-hud > button')),pad:rect(document.querySelector('[data-touch-dpad]')),
      keys:[...document.querySelectorAll('[data-touch-dpad] [data-touch-control],.touch-actions button')].filter(n=>n.getBoundingClientRect().height>0).map(n=>({control:n.dataset.touchControl,...rect(n)})),
      health:rect(document.querySelector('.game-hud > div:nth-child(2)')),scroll:document.documentElement.scrollWidth};
    });
    const g=await geometry();
    if(label!=='desktop'){assert(g.host.x<1&&g.host.y<1);assert(Math.abs(g.host.width-viewport.width)<2);assert(Math.abs(g.host.height-viewport.height)<2);}
    if(!['ipad','desktop'].includes(label)){assert(g.canvas.width>=viewport.width-2);assert(g.canvas.height>=viewport.height-2);}
    if(label!=='desktop'){assert(g.pause.width>=44&&g.pause.height>=44);assert(g.health.width<viewport.width*.4);}
    assert(g.scroll<=viewport.width);
    for(const k of g.keys){assert(k.width>=44&&k.height>=44,k.control+' touch target');assert(k.x>=0&&k.y>=0&&k.right<=viewport.width+1&&k.bottom<=viewport.height+1,k.control+' inside viewport');}
    if(level!==5&&label!=='desktop')assert(g.pad.height<=64,'Movement stays below the hero instead of covering its body');
    if(label==='desktop')assert(g.pad.height>100,'Desktop retains its existing D-pad');
    await page.screenshot({path:`${out}/${name}-${label}.png`});
    if(label==='iphone'){
     const key=control=>g.keys.find(k=>k.control===control);
     const move=async control=>{const k=key(control);await page.mouse.move(k.x+k.width/2,k.y+k.height/2);};
     await move('left');await page.mouse.down();assert((await read()).touchControls.left);
     await move('right');let s=await read();assert(s.touchControls.right&&!s.touchControls.left);
     await page.locator('.touch-actions [data-touch-control="attack"]').dispatchEvent('pointerdown',{pointerId:22,pointerType:'touch',button:0,buttons:1});
     s=await read();assert(s.touchControls.attack&&s.touchControls.right,'Move and fire together');
     await page.locator('.touch-actions [data-touch-control="attack"]').dispatchEvent('pointerup',{pointerId:22,pointerType:'touch',button:0,buttons:0});
     await move('down');s=await read();assert(s.touchControls.down&&!s.touchControls.right,'Middle key crouches, never jumps');
     await page.mouse.up();await page.waitForTimeout(100);s=await read();assert(!s.touchControls.down&&!s.touchControls.attack);
     await move('right');await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();await page.waitForTimeout(200);
     const before=await read();
     await page.setViewportSize({width:350,height:852});await page.locator('.phone-portrait-rotate').waitFor({state:'visible'});
     assert(!(await read()).touchControls.right);
     await page.setViewportSize(viewport);await page.waitForTimeout(500);
     const after=await read();assert.equal(after.player.health,before.player.health);assert.equal(after.player.lives,before.player.lives);assert(Math.abs(after.player.x-before.player.x)<40,'Rotation preserves the run');
     const restored=await geometry();assert(restored.canvas.width>=viewport.width-2);
     await page.setViewportSize({width:852,height:280});await page.waitForTimeout(400);const toolbar=await geometry();assert(toolbar.canvas.width>=850&&toolbar.canvas.height>=278);
     await page.getByRole('button',{name:'II',exact:true}).click();await page.getByRole('region',{name:'Screen settings'}).waitFor();
     assert(await page.getByText(/Add to Home Screen/).isVisible());
     const dialog=page.locator('.pause-dialog');assert(await dialog.isVisible());
     await page.getByRole('button',{name:'Resume Playing',exact:true}).click();
    }
    assert.deepEqual(errors,[]);reports.push({engine:name,case:label,canvas:g.canvas,host:g.host,targets:g.keys,passed:true});
    console.log(name,label,'passed');
   }catch(e){await page.screenshot({path:`${out}/${name}-${label}-failure.png`}).catch(()=>{});throw e;}
   finally{await context.close();}
  }
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));
