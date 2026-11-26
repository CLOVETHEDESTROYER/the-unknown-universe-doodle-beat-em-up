import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='output/workshop-crates-v2';await fs.mkdir(out,{recursive:true});
const port=Number(process.env.GAME_TEST_PORT||4399);
const server=process.env.GAME_TEST_URL?null:await createServer({server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
if(server)await server.listen();
const origin=process.env.GAME_TEST_URL||`http://127.0.0.1:${port}`;
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],evidence={};
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('favicon.ico'))errors.push(`${response.status()} ${response.url()}`);});
const key='unknownUniverse.wallet.v1';
const defaults={isDying:false,activeBossId:null,score:0,souls:0,monstersDefeated:0,health:100,maxHealth:100,lives:3,maxLives:3,level:1,isGameOver:false,isVictory:false,swordUnlocked:false,hasFlameSword:false,swordDurability:0,maxSwordDurability:3,shieldUnlocked:false,inkShieldReady:false,dinioUnlocked:false,hasDinio:false,doghostUnlocked:false,hasDoghost:false,teleportationCUnlocked:false,hasTeleportationC:false,gravityCoreUnlocked:false,gravityCoreCharges:0,selectedCharacterId:'xgod',characterPowerUnlocked:false};
const classic={ink:'classic',trail:'classic',burst:'classic',face:'classic',head:'classic',outfit:'classic',xgodSpecial:'classic',kaiSpecial:'classic',buddy:'classic'};
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const wallet=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const shot=async name=>{await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.crate-offer .crate-sprite')].map(sprite=>new Promise(resolve=>{const url=getComputedStyle(sprite).backgroundImage.slice(5,-2);const image=new Image();image.onload=resolve;image.onerror=resolve;image.src=url;})));});return page.screenshot({path:`${out}/${name}.png`});};
async function until(predicate,ms=60000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const state=await read();if(state&&predicate(state))return state;await page.waitForTimeout(30);}throw Error(`Timeout ${predicate}: ${JSON.stringify(await read())}`);}
async function seed(value){await page.goto(origin,{waitUntil:'domcontentloaded'});await page.evaluate(({key,value})=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(value));},{key,value});await page.reload({waitUntil:'domcontentloaded'});if(!value.pending)await page.getByLabel('Shop wallet',{exact:true}).click();await until(state=>state.mode==='workshop');}
async function forceReward(id,crate='normal'){
  await page.evaluate(async({id,crate,key})=>{
    const m=await import('/gameplay/workshopCrates.ts');
    const raw=JSON.parse(localStorage.getItem(key)),wallet={...raw,...m.restoreCrateCollection(raw)};
    const pool=m.lootPool(wallet,crate),reward=pool.find(entry=>entry.id===id);if(!reward)throw Error(`Unavailable fixture reward: ${id}`);
    const odds=m.lootOdds(wallet,crate),entry=odds.find(entry=>entry.rarity===reward.rarity);
    const before=odds.slice(0,odds.indexOf(entry)).reduce((sum,tier)=>sum+tier.chance,0);
    const same=pool.filter(item=>item.rarity===reward.rarity);
    window.__crateTestRolls=[before+entry.chance*.5,(same.indexOf(reward)+.5)/same.length];
    window.__crateTestOriginal??=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=function(array){if(window.__crateTestRolls.length){array[0]=Math.floor(window.__crateTestRolls.shift()*0x100000000);return array;}return window.__crateTestOriginal(array);};
  },{id,crate,key});
}
async function open(crate='normal',double=false){const button=page.getByRole('button',{name:`Open ${crate==='normal'?'Normal':'Legendary'} Crate for ${crate==='normal'?125:400} Gold`,exact:true});if(double)await button.evaluate(button=>{button.click();button.click();});else await button.click();return until(state=>state.crateReveal);}
async function collect(view=false){await until(state=>state.cratePhase==='revealed');await page.getByRole('button',{name:view?/View in gallery|View in inventory/:'Back to crates',exact:!view}).click();return until(state=>!state.crateReveal);}
function betweenWallet(base,level=2){const resultLevel=level-1;const stats={...defaults,level,score:900,lives:2,health:70,equipment:{active:'blaster',hits:1,unlocked:['blaster'],gunUpgrade:'rapid',blasterVariant:'kai_arm'},rewardProgress:{runId:'crate-test',startScore:900,startGems:0,startMonsters:0}};return {...base,receipts:[`crate-test:${resultLevel}`],pending:{stage:'shop',purchases:[],result:{receiptId:`crate-test:${resultLevel}`,level:resultLevel,points:900,totalPoints:900,gems:0,monsters:0,pickupGold:0,clearGold:100,performanceGold:0,earnedGold:100},campaign:{version:1,savedAt:Date.now(),difficulty:'EASY',stats,story:`level${resultLevel}`}}};}

try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  evidence.rules=await page.evaluate(async defaults=>{
    const m=await import('/gameplay/workshopCrates.ts'),w=await import('/gameplay/levelRewards.ts'),catalog=await import('/gameplay/shopCatalog.ts'),cards=await import('/gameplay/collectibleCards.ts'),shop=await import('/gameplay/workshop.ts'),characters=await import('/characters.ts');
    const check=(test,message)=>{if(!test)throw Error(message);};
    const throws=(fn,message)=>{let threw=false;try{fn();}catch{threw=true;}check(threw,message);};
    const base={...w.emptyWallet(),gold:1000000},snap=JSON.stringify(base);
    const sequence=values=>()=>values.shift();
    const opened=m.openWorkshopCrate(base,'normal',sequence([0,0]));
    check(opened.gold===999875&&opened.inventory.repair===1,'Supply must be granted with exactly one charge');
    check(JSON.stringify(base)===snap,'Opening must not mutate its input');
    throws(()=>m.openWorkshopCrate(opened,'normal'),'Uncollected receipt must block another charge');
    const claimed=m.collectCrateReward(opened,opened.crateReveal.receipt);check(!claimed.crateReveal&&claimed.inventory.repair===1,'Collect must only acknowledge');
    throws(()=>m.collectCrateReward(claimed,opened.crateReveal.receipt),'Receipt cannot be claimed twice');
    for(const roll of [NaN,-1,1,Infinity])throws(()=>m.openWorkshopCrate(base,'normal',()=>roll),'Bad random roll must not grant or charge');
    throws(()=>m.openWorkshopCrate({...base,gold:124},'normal'),'Insufficient funds');
    const counts={common:0,rare:0,epic:0,legendary:0},seen=new Set();let state=72573;
    const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/0x100000000;};
    for(let i=0;i<10000;i++){const next=m.openWorkshopCrate(base,'normal',random);counts[next.crateReveal.reward.rarity]++;seen.add(next.crateReveal.reward.id);}
    for(const [rarity,ratio] of Object.entries({common:.6,rare:.28,epic:.1,legendary:.02}))check(Math.abs(counts[rarity]/10000-ratio)<.02,`Normal odds drift: ${rarity}`);
    check(seen.size===m.LOOT.length,'All rewards must be reachable from normal crates');
    const legendary={epic:0,legendary:0};
    for(let i=0;i<2000;i++){const next=m.openWorkshopCrate(base,'legendary',random);check(next.crateReveal.reward.rarity==='epic'||next.crateReveal.reward.rarity==='legendary','Legendary minimum tier');legendary[next.crateReveal.reward.rarity]++;}
    check(Math.abs(legendary.legendary/2000-.25)<.04,'Legendary odds drift');
    const complete={...base,owned:catalog.SHOP_ITEMS.filter(item=>!catalog.isSupply(item.id)).map(item=>item.id),cards:cards.COLLECTIBLE_CARDS.map(card=>card.id)};
    check(m.lootPool(complete,'normal').every(reward=>catalog.isSupply(reward.id)),'Permanent duplicates must leave pool');
    check(m.lootOdds(complete,'legendary').find(tier=>tier.rarity==='epic').chance===1,'Exhausted tiers must renormalize');
    const full={...complete,inventory:Object.fromEntries(catalog.SHOP_ITEMS.filter(item=>catalog.isSupply(item.id)).map(item=>[item.id,999]))};
    check(m.lootPool(full,'normal').length===0&&Boolean(m.crateBlock(full,'legendary')),'Full inventory must prevent a wasted charge');
    const firstCard=m.openWorkshopCrate(base,'legendary',sequence([.99,0]));
    check(firstCard.cards.includes('xgod-3d')&&firstCard.owned.length===0,'Art must not unlock or equip playable characters');
    const afterCard=m.collectCrateReward(firstCard,firstCard.crateReveal.receipt);
    check(!m.lootPool(afterCard,'legendary').some(reward=>reward.id==='xgod-3d'),'Owned art must not repeat');
    const old={version:1,gold:801,receipts:[],pending:null,owned:['arctic'],equipped:{ink:'arctic'}};
    localStorage.setItem(w.WALLET_KEY,JSON.stringify(old));const migrated=w.readWallet(defaults);
    check(migrated.gold===801&&migrated.equipped.ink==='arctic'&&migrated.cards.length===0&&Object.keys(migrated.inventory).length===0,'Legacy wallet migration');
    localStorage.setItem(w.WALLET_KEY,JSON.stringify({...old,inventory:{repair:3,shield:-9,life:1000,unknown:99},cards:['xgod-3d','xgod-3d','bogus'],crateReveal:{receipt:'bad'}}));
    const clean=w.readWallet(defaults);check(clean.gold===801&&clean.inventory.repair===3&&!clean.inventory.shield&&!clean.inventory.life&&clean.cards.length===1&&!clean.crateReveal,'Optional corruption must not erase gold');
    localStorage.setItem(w.WALLET_KEY,JSON.stringify(opened));const recovered=w.readWallet(defaults);
    check(recovered.crateReveal.receipt===opened.crateReveal.receipt&&recovered.inventory.repair===1&&recovered.gold===opened.gold,'Receipt recovery cannot reroll or charge');
    const heroes=characters.CHARACTER_IDS;
    check(heroes.every(hero=>cards.COLLECTIBLE_CARDS.some(card=>card.hero===hero&&card.style==='3D render')),'Every character needs a 3D card');
    check(cards.COLLECTIBLE_CARDS.length===33&&new Set(m.LOOT.map(reward=>reward.id)).size===m.LOOT.length,'Unique catalog IDs');
    const stats={...defaults,level:4,equipment:{active:'blaster',hits:1,unlocked:['blaster'],gunUpgrade:'rapid',blasterVariant:'kai_arm'}};
    const campaign={version:1,savedAt:Date.now(),difficulty:'EASY',story:'level3',stats};
    const supplyWallet={...base,inventory:Object.fromEntries(catalog.SHOP_ITEMS.filter(item=>catalog.isSupply(item.id)).map(item=>[item.id,2])),pending:{stage:'shop',campaign,purchases:[]}};
    const repaired=shop.redeemSupply(supplyWallet,'repair');check(repaired.gold===base.gold&&repaired.inventory.repair===1&&repaired.pending.campaign.stats.equipment.hits===3&&repaired.pending.campaign.stats.equipment.gunUpgrade==='rapid'&&repaired.pending.campaign.stats.equipment.blasterVariant==='kai_arm','Repair must preserve gun and variant without gold charge');
    throws(()=>shop.redeemSupply(repaired,'repair'),'One supply per visit');
    for(const hero of ['zgod','turkey_king','killer_klause'])check(Boolean(shop.supplyBlock({...supplyWallet,pending:{...supplyWallet.pending,campaign:{...campaign,stats:{...stats,selectedCharacterId:hero}}}},'frost-kit')),'Native-weapon restrictions');
    check(Boolean(shop.supplyBlock({...supplyWallet,pending:{...supplyWallet.pending,campaign:{...campaign,stats:{...stats,level:5}}}},'storm-kit')),'Ground gear must wait through flight');
    check(Boolean(shop.supplyBlock({...supplyWallet,pending:null},'shield')),'Title supplies must be stored');
    for(const id of catalog.SHOP_ITEMS.filter(item=>catalog.isSupply(item.id)).map(item=>item.id)){
      const testStats={...stats,health:65,lives:2,equipment:{active:'blaster',hits:1,unlocked:['blaster'],gunUpgrade:'standard'}};
      const testWallet={...supplyWallet,pending:{...supplyWallet.pending,campaign:{...campaign,stats:testStats}}};
      const updated=shop.redeemSupply(testWallet,id);check(updated.inventory[id]===1&&updated.gold===base.gold,`Supply must be usable: ${id}`);
    }
    localStorage.clear();return {normalSamples:10000,counts,legendarySamples:2000,legendary,reachable:seen.size,legacyMigration:true,receiptRecovery:true,supplies:17,duplicateProtection:true};
  },defaults);

  // Start with a pre-crate wallet to exercise the real upgrade path through the UI.
  const oldWallet={version:1,gold:5000,receipts:[],pending:null,owned:[],equipped:classic};
  await seed(oldWallet);await shot('01-crate-shop-desktop');
  assert.equal(await page.locator('.crate-offer').count(),2);
  await page.getByRole('button',{name:'Inspect Legendary Crate',exact:true}).click();
  await page.locator('.crate-odds summary').click();assert((await page.locator('.crate-odds-tiers').innerText()).includes('25%'));
  await page.locator('.crate-odds summary').click();
  await page.evaluate(()=>{window.__crateSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,...args){if(key==='unknownUniverse.wallet.v1')throw new DOMException('Full','QuotaExceededError');return window.__crateSetItem.call(this,key,...args);};});
  await page.getByRole('button',{name:'Open Normal Crate for 125 Gold',exact:true}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await wallet()).gold,5000);assert(!(await wallet()).crateReveal);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__crateSetItem;});
  await forceReward('repair');let state=await open('normal',true);assert.equal(state.wallet.gold,4875);assert.equal(state.wallet.inventory.repair,1);assert.equal(state.wallet.cratesOpened,1);
  await until(state=>state.cratePhase==='shaking');await shot('02-normal-shake');
  await until(state=>state.cratePhase==='burst');await shot('03-normal-burst');
  await until(state=>state.cratePhase==='revealed');await shot('04-normal-supply-reveal');
  const receiptWallet=await wallet();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.getByRole('button',{name:'Back to crates',exact:true}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await wallet()).crateReveal.receipt,receiptWallet.crateReveal.receipt);assert.equal((await wallet()).gold,4875);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__crateSetItem;});
  await collect(true);assert.equal((await read()).tab,'inventory');await page.getByRole('button',{name:/Use one/}).waitFor();assert(await page.getByRole('button',{name:/Use one/}).isDisabled());
  await page.getByRole('button',{name:/^The crates/}).click();await forceReward('kai-turkey');state=await open();const receipt=state.crateReveal.receipt;
  // Reload before reveal. The same reward must recover immediately with one debit.
  await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Shop wallet',{exact:true}).click();state=await until(state=>state.cratePhase==='revealed');
  assert.equal(state.crateReveal.receipt,receipt);assert.equal(state.crateReveal.reward.id,'kai-turkey');assert.equal(state.wallet.gold,4750);assert.equal(state.wallet.cards.length,1);await shot('05-recovered-turkey-kai');
  await collect(true);await page.getByRole('button',{name:'View Gobble Gobble Kai',exact:true}).click();assert(await page.locator('.collectible-viewer').evaluate(dialog=>dialog.matches(':modal')));await shot('06-turkey-kai-full-art');
  await page.keyboard.press('Escape');assert.equal((await read()).mode,'workshop');assert(await page.getByRole('button',{name:'View Gobble Gobble Kai',exact:true}).evaluate(button=>document.activeElement===button));
  await page.getByLabel('Series',{exact:true}).selectOption('Beyond the Page');assert.equal(await page.locator('.collectible-card').count(),11);
  await page.getByLabel('Collected only',{exact:true}).check();assert.equal(await page.locator('.collectible-card').count(),0);await page.getByLabel('Collected only',{exact:true}).uncheck();
  await page.getByRole('button',{name:/^The crates/}).click();await forceReward('xgod-3d','legendary');await open('legendary');await until(state=>state.cratePhase==='charging');await shot('07-legendary-charge');await until(state=>state.cratePhase==='revealed');await shot('08-legendary-3d-reveal');await collect();
  await page.emulateMedia({reducedMotion:'reduce'});await forceReward('xgod-harvest');await open();await until(state=>state.cratePhase==='revealed');
  assert.equal(await page.locator('.opening-chest').evaluate(element=>getComputedStyle(element).animationName),'none');await shot('09-reduced-motion-harvest');await collect();await page.emulateMedia({reducedMotion:'no-preference'});
  await forceReward('spark-moth');await open();await page.getByRole('button',{name:'Skip animation',exact:true}).click();await collect(true);await page.getByRole('button',{name:'Preview Spark Moth',exact:true}).click();await page.getByRole('button',{name:'Equip item',exact:true}).click();assert.equal((await wallet()).equipped.buddy,'spark-moth');
  await page.getByRole('button',{name:'Back to title',exact:false}).click();await page.getByRole('button',{name:'Art Gallery',exact:true}).click();await page.getByRole('button',{name:/Character art/}).click();assert.equal(await page.locator('.collectible-card.is-owned').count(),3);
  await page.getByRole('button',{name:'Close gallery',exact:true}).click();
  let saved=await wallet();await seed(betweenWallet({...saved,inventory:{...saved.inventory,repair:2,shield:2,life:2,'heart-kit':2}},2));
  await page.getByRole('button',{name:/^Your inventory/}).click();
  const supplyGold=(await wallet()).gold;
  await page.getByRole('button',{name:'Preview Weapon tune-up',exact:true}).click();await page.evaluate(()=>{window.__crateSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.getByRole('button',{name:/Use one/}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await wallet()).inventory.repair,2);assert.equal((await wallet()).pending.campaign.stats.equipment.hits,1);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__crateSetItem;});
  for(const name of ['Weapon tune-up','Ink Shield','Extra life','Health Heart']){
    await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();await page.getByRole('button',{name:/Use one/}).click();
  }
  state=await read();assert.equal(state.resume.equipment.hits,3);assert.equal(state.resume.equipment.blasterVariant,'kai_arm');assert.equal(state.resume.equipment.gunUpgrade,'rapid');assert.equal(state.resume.health,100);assert.equal(state.resume.lives,3);assert(state.resume.inkShieldReady);assert.equal(state.wallet.gold,supplyGold);await shot('10-supplies-applied');
  await page.reload();state=await until(state=>state.mode==='workshop');assert.equal(state.resume.health,100);assert.equal(state.wallet.inventory.repair,1);
  await page.getByRole('button',{name:'Continue story',exact:false}).click();state=await until(state=>state.mode==='campaign-story');assert.equal(state.chapter,'level1');assert.equal(state.resume.equipment.hits,3);assert(state.resume.inkShieldReady);assert.equal((await wallet()).pending,null);
  // Gallery composition and every generated file are verified using a complete review fixture.
  const fixture=await page.evaluate(async()=>{const c=await import('/gameplay/collectibleCards.ts'),s=await import('/gameplay/shopCatalog.ts'),w=await import('/gameplay/levelRewards.ts');return {...w.emptyWallet(),gold:1500,cards:c.COLLECTIBLE_CARDS.map(card=>card.id),owned:s.SHOP_ITEMS.filter(item=>!s.isSupply(item.id)).map(item=>item.id),inventory:Object.fromEntries(s.SHOP_ITEMS.filter(item=>s.isSupply(item.id)).map(item=>[item.id,2]))};});
  await seed(fixture);await page.getByRole('button',{name:/^Character gallery/}).click();
  for(const [series,count] of [['Off Duty',7],['Family Album',4],['Hero Academy',2],['City Legends',3]]){await page.getByLabel('Series',{exact:true}).selectOption(series);assert.equal(await page.locator('.collectible-card').count(),count);}await page.getByLabel('Series',{exact:true}).selectOption('all');await page.getByLabel('Character',{exact:true}).selectOption('xgod');assert.equal(await page.locator('.collectible-card').count(),8);await page.getByLabel('Character',{exact:true}).selectOption('zgod');assert.equal(await page.locator('.collectible-card').count(),3);await page.getByLabel('Character',{exact:true}).selectOption('all');
  await page.locator('.collectible-card img').last().scrollIntoViewIfNeeded();await page.locator('.workshop').evaluate(element=>element.scrollTo(0,0));await page.waitForTimeout(200);await shot('11-character-gallery-desktop');
  for(const button of await page.locator('.collectible-card').all()){
    await button.click();await page.locator('.collectible-viewer>img').waitFor();assert(await page.locator('.collectible-viewer>img').evaluate(image=>image.complete&&image.naturalWidth>0));await page.getByRole('button',{name:'Close artwork',exact:true}).click();
  }
  for(const [width,height,label] of [[393,852,'portrait'],[852,393,'landscape']]){
    await page.setViewportSize({width,height});await page.locator('.workshop').evaluate(element=>element.scrollTo(0,0));
    assert(await page.locator('.workshop').evaluate(element=>element.scrollWidth<=element.clientWidth+1));await shot(`12-gallery-phone-${label}`);
    await page.getByRole('button',{name:/^The crates/}).click();await page.locator('.workshop').evaluate(element=>element.scrollTo(0,0));assert(await page.locator('.workshop').evaluate(element=>element.scrollWidth<=element.clientWidth+1));await shot(`13-crates-phone-${label}`);
    await forceReward('storm-kit','legendary');await open('legendary');await page.getByRole('button',{name:'Skip animation',exact:true}).click();await until(state=>state.cratePhase==='revealed');await shot(`14-reveal-phone-${label}`);
    const claim=page.getByRole('button',{name:'Back to crates',exact:true});await claim.scrollIntoViewIfNeeded();const box=await claim.boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width+1);await collect();
    await page.getByRole('button',{name:/^Your inventory/}).click();await page.getByRole('button',{name:'Supplies',exact:true}).click();await page.getByRole('button',{name:'Preview Storm Halo',exact:true}).click();assert(await page.locator('.workshop').evaluate(element=>element.scrollWidth<=element.clientWidth+1));await shot(`15-inventory-phone-${label}`);
    await page.getByRole('button',{name:/^Character gallery/}).click();
  }
  await seed({...oldWallet,gold:100});assert(await page.getByRole('button',{name:'Open Normal Crate for 125 Gold',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Open Legendary Crate for 400 Gold',exact:true}).isDisabled());assert.equal((await wallet()).gold,100);
  evidence.ui={atomicStorageFailure:true,doubleClick:true,normalAndLegendaryAnimation:true,reloadBeforeReveal:true,titleGallery:true,fullArtworkAndFilters:true,all33ArtFiles:true,supplyCarryover:true,permanentEquip:true,phonePortraitAndLandscape:true,reducedMotion:true,insufficientGold:true};
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await shot('failure').catch(()=>{});await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),state:await read(),errors,evidence},null,2));throw error;}
finally{await browser.close();if(server)await server.close();}
