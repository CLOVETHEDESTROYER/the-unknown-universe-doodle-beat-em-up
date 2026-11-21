import {chromium} from 'playwright';
import {preview} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='output/kai-workshop-art';await fs.mkdir(out,{recursive:true});
const server=process.env.GAME_TEST_URL?null:await preview({preview:{host:'127.0.0.1',port:4398,strictPort:true},logLevel:'error'});
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4398';
const browser=await chromium.launch({headless:true,...(process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}),args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],requests=new Set();
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const path=new URL(r.url()).pathname;if(r.ok())requests.add(path);if(r.status()>=400&&!path.endsWith('favicon.ico'))errors.push(r.url());});
const manifest=JSON.parse(await fs.readFile('public/workshop/kai-v1/manifest.json','utf8'));
const classic={ink:'classic',trail:'classic',burst:'classic',face:'classic',head:'classic',outfit:'classic',xgodSpecial:'classic',kaiSpecial:'classic',buddy:'classic'};
const evidence={items:[],actions:[]};
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
async function until(fn,ms=60000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn);}
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const ready=()=>page.locator('.kai-item-sprite[data-ready=true]').waitFor();
async function samples(ms=800){return page.evaluate(ms=>new Promise(resolve=>{const frames=new Set(),start=performance.now();function tick(){frames.add(Number(document.querySelector('.kai-item-sprite').dataset.frame));if(performance.now()-start>=ms)resolve([...frames]);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}),ms);}
async function shelf(name){await page.getByRole('button',{name,exact:true}).click();}
async function select(name){await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();await ready();}
async function seed(equipped,owned=Object.keys(manifest)){
  await page.goto(origin);await page.evaluate(({equipped,owned,classic})=>localStorage.setItem('unknownUniverse.wallet.v1',JSON.stringify({version:1,gold:20000,receipts:[],pending:null,owned,equipped:{...classic,...equipped}})),{equipped,owned,classic});
}
async function boot(equipped,hero='xgod',level=1){await seed(equipped);await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&character=${hero}&level=${level}`);return until(s=>s.player?.grounded&&s.mode==='platforming'||s.engine==='flight');}
try{
  await seed({},[]);await page.reload();await page.getByLabel('Shop wallet',{exact:true}).click();await until(s=>s.mode==='workshop');
  for(const [tab,ids] of [
    ['Supplies',['repair','shield','life','frost-kit','ember-kit']],
    ['Specials',['ink-fan','chalk-ring','rail-pulse','static-net']],
    ['Buddies',['spark-moth','patch-beetle']],
    ['Ink & trails',['arctic','rose','chalk','starlight','prism']],
    ['Wardrobe',['rooftop-shades','sunset-band','blue-kicks']],
  ]){
    await shelf(tab);
    for(const id of ids){
      await select(manifest[id].name);const frames=await samples();assert(frames.length>=3,`${id}: ${frames}`);
      assert(await page.locator('.kai-item-sprite').evaluate((el,id)=>el.style.backgroundImage.includes(`/workshop/kai-v1/${id}.webp`),id));
      const poster=page.getByRole('button',{name:`Preview ${manifest[id].name}`,exact:true}).locator('img');assert(await poster.evaluate(im=>im.complete&&im.naturalWidth>0));
      evidence.items.push({id,frames});
      if(manifest[id].hasEffect){await shelf('In action');await ready();const effect=await samples();assert(effect.every(f=>f>=4&&f<8));assert(effect.length>=3);evidence.actions.push({id,action:'effect',frames:effect});}
      if(manifest[id].buddy)for(const action of ['Fly',id==='spark-moth'?'Spark shot':'Intercept']){
        await shelf(action);await ready();const poses=await samples();assert(poses.length>=3);assert(poses.every(f=>action==='Fly'?f>=4&&f<12:f>=12&&f<16));evidence.actions.push({id,action,frames:poses});
      }
    }
    await shot(`shelf-${tab.toLowerCase().replaceAll(' ','-').replaceAll('&','and')}`);
  }
  assert.equal(evidence.items.length,Object.keys(manifest).length);assert.equal((await read()).wallet.gold,20000);
  await shelf('Wardrobe');await select('Rooftop Shades');await page.getByText('Try on X God',{exact:true}).click();
  for(const pose of ['Run','Jump','Crouch','Idle']){await page.getByRole('button',{name:pose,exact:true}).click();await page.waitForTimeout(250);await page.locator('.kai-try-on').screenshot({path:`${out}/try-on-${pose.toLowerCase()}.png`});}
  await shelf('Buddies');await select('Spark Moth');await page.getByRole('button',{name:'Pause',exact:true}).click();await ready();
  const frame=await page.locator('.kai-item-sprite').getAttribute('data-frame');await page.waitForTimeout(300);assert.equal(await page.locator('.kai-item-sprite').getAttribute('data-frame'),frame);
  await shelf('Next pose');await ready();assert.equal(Number(await page.locator('.kai-item-sprite').getAttribute('data-frame')),(Number(frame)+1)%4);await shelf('Face left');
  for(const [width,height,label] of [[393,852,'phone-portrait'],[852,393,'phone-landscape']]){
    await page.setViewportSize({width,height});assert(await page.locator('.workshop').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await shot(label);
  }
  await page.setViewportSize({width:1280,height:900});
  // Real permanent-item purchases keep the original wallet confirmation flow.
  for(const [tab,ids] of [['Specials',['ink-fan','chalk-ring','rail-pulse','static-net']],['Buddies',['spark-moth','patch-beetle']]]){
    await shelf(tab);for(const id of ids){await select(manifest[id].name);await page.locator('.workshop-item-info>button').click();await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();assert((await read()).wallet.owned.includes(id));}
  }
  const bought=(await read()).wallet;await page.reload();await page.getByLabel('Shop wallet',{exact:true}).click();await until(s=>s.mode==='workshop');assert.equal((await read()).wallet.gold,bought.gold);assert.deepEqual((await read()).wallet.owned,bought.owned);
  evidence.purchaseReloadAndControls=true;
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByLabel('Shop wallet',{exact:true}).click();await until(s=>s.mode==='workshop');await ready();assert(await page.getByRole('button',{name:'Play',exact:true}).isVisible());await page.emulateMedia({reducedMotion:'no-preference'});
  for(const [id,hero] of [['ink-fan','xgod'],['chalk-ring','xgod'],['rail-pulse','killer_kai'],['static-net','killer_kai']]){
    await boot({[hero==='xgod'?'xgodSpecial':'kaiSpecial']:id},hero);
    await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[100,170,230],hp:50}));
    await page.keyboard.press('x',{delay:45});const s=await until(s=>s.workshopCombat.uses===1);assert(s.workshopCombat.cooldownRemainingMs>0);
    await shot(`special-${id}`);assert(requests.has(`/workshop/kai-v1/${id}.webp`));
  }
  await boot({buddy:'spark-moth'});await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(220,480));await page.waitForTimeout(650);await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[180],hp:50}));
  let s=await until(s=>s.workshopCombat.assists>0);assert.equal(s.workshopCombat.buddyTexture,'kai_shop_spark-moth');await shot('ground-spark-moth-assist');
  await boot({buddy:'patch-beetle'});await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[],projectile:true,incoming:true}));
  s=await until(s=>s.workshopCombat.assists>0);assert.equal(s.workshopCombat.buddyTexture,'kai_shop_patch-beetle');await shot('ground-patch-beetle-intercept');
  await boot({ink:'arctic',trail:'chalk',burst:'prism'});await page.keyboard.down('c');await until(s=>s.combatEffects.generatedShots>0&&s.combatEffects.generatedTrails>0);await shot('generated-arctic-chalk');await page.keyboard.up('c');
  await boot({buddy:'spark-moth'},'xgod',5);await page.waitForTimeout(600);await shot('flight-generated-buddy');assert(requests.has('/workshop/kai-v1/spark-moth.webp'));
  await seed({buddy:'patch-beetle'});await page.reload();
  await page.getByRole('button',{name:'Start game',exact:true}).click();await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);
  // Enter through the supported campaign interlude; the title no longer has a replay shortcut.
  await page.evaluate(()=>{const key='unknownUniverse.campaign.v1',save=JSON.parse(localStorage.getItem(key));save.stats={...save.stats,level:2,campaignCheckpoint:undefined,flightSave:undefined};save.story=null;save.interlude='alley-rescue';save.savedAt=Date.now();localStorage.setItem(key,JSON.stringify(save));});
  await page.goto(origin);await page.getByRole('button',{name:'Continue Game',exact:true}).click();await until(s=>s.mode==='alley_rescue'&&s.backgroundReady);await page.waitForTimeout(500);await shot('alley-generated-buddy');
  evidence.liveSpecialsBuddiesInkTrailsFlightAndAlley=true;assert.deepEqual(errors,[]);
  await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,catalogItems:evidence.items.length,actionLoops:evidence.actions.length,errors}));
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),evidence,errors,state:await read().catch(()=>null)},null,2));throw e;}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
