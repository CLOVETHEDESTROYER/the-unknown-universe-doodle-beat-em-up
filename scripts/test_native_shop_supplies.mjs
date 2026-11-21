import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4191';
const browser=await chromium.launch({headless:true,...(process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
try{
  await page.goto(origin);await page.getByLabel('Secret code',{exact:true}).fill('SantaKisComing');
  await page.getByRole('button',{name:'Apply code',exact:true}).click();
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('[data-character-id="killer_klause"]').click();
  await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await page.waitForFunction(()=>localStorage.getItem('unknownUniverse.campaign.v1'),{},{timeout:60000});
  const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1')));
  for(const hero of ['killer_klause','turkey_king']){
    const campaign=structuredClone(initial);
    Object.assign(campaign,{story:'level1'});
    Object.assign(campaign.stats,{selectedCharacterId:hero,level:2,score:900,souls:0,monstersDefeated:0,lives:1,
      equipment:{active:'hands',hits:0,unlocked:[]},rewardProgress:{runId:'native-shop-test',startScore:900,startGems:0,startMonsters:0}});
    const result={receiptId:'native-shop-test:1',level:1,points:900,totalPoints:900,gems:0,monsters:0,pickupGold:0,clearGold:100,performanceGold:0,earnedGold:100};
    const wallet={version:1,gold:1000,receipts:['native-shop-test:1'],owned:[],equipped:{ink:'classic',trail:'classic',burst:'classic'},pending:{result,campaign,stage:'shop'}};
    await page.evaluate(wallet=>localStorage.setItem('unknownUniverse.wallet.v1',JSON.stringify(wallet)),wallet);
    await page.reload();await page.getByRole('button',{name:'Preview Ink Shield',exact:true}).waitFor();
    for(const name of ['Ink Shield','Weapon tune-up','Frost Gauntlet','Ember Boots']){
      await page.getByRole('button',{name:'Preview '+name,exact:true}).click();
      assert(await page.locator('.workshop-item-info>button').isDisabled(),hero+': '+name);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')).gold),1000);
    }
    await page.getByRole('button',{name:'Preview Extra life',exact:true}).click();
    await page.getByRole('button',{name:'Buy for 150 Gold',exact:true}).click();
    await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')));
    assert.equal(after.gold,850);assert.equal(after.pending.campaign.stats.lives,2);
  }
  assert.deepEqual(errors,[]);console.log('PASS: native heroes cannot spend Gold on incompatible supplies; extra lives still work.');
}finally{await browser.close()}
