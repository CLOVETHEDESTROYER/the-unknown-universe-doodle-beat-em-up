import {chromium} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out='output/shop-economy';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage(),errors=[],routes=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const level of [1,2,3,4,6]){
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:5175'}/?autostart=1&capture=1&level=${level}&character=zgod`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,null,{timeout:60000});
  const s=await page.evaluate(()=>JSON.parse(window.render_game_to_text())),gems=s.pickups.filter(p=>p.kind==='coin').length;
  const foes=s.enemies.filter(e=>e.kind!=='boss').length,bosses=s.enemies.filter(e=>e.kind==='boss').length;
  const budget=(fraction,killFraction)=>100+Math.floor(gems*fraction)*5+Math.min(150,Math.floor((Math.floor(foes*killFraction)*150+bosses*1500)/1000)*10);
  routes.push({level,gems,initialFoes:foes,guaranteedClear:100,lowCollectionEstimate:budget(.25,.4),typicalCollectionEstimate:budget(.6,.7),fullCollectionEstimate:budget(1,1)});
  console.log(`Level ${level}: ${gems} gems; estimated typical clear ${budget(.6,.7)} Gold`);
 }
 const catalog=await page.evaluate(async()=>{const {SHOP_ITEMS}=await import('/gameplay/shopCatalog.ts');return SHOP_ITEMS;});
 assert(catalog.find(i=>i.id==='shield').price<=100,'A clear alone covers a basic supply');assert(catalog.find(i=>i.id==='repair').price<100);
 assert(catalog.filter(i=>i.type!=='supply').every(i=>i.price>=200));
 assert.deepEqual(errors,[]);
 const report={note:'Route-based estimates, not observed player earnings. Uses 25%/60%/100% gem collection and 40%/70%/100% of initially present foes, plus the boss. Optional encounter and challenge bonuses are excluded. Flight minimum is 100 Gold; flight combat is not modeled.',routes,catalog,errors};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:true,minimumClearCanBuyShield:true,errors}));
}finally{await browser.close();}
