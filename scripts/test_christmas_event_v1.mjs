import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../gameplay/christmasEvent.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const event=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
assert(event.acceptsChristmasCode('SantaKisComing'));
for(const code of ['santakiscoming','SANTAKISCOMING','SantaKIsComing','SantaKiscoming',' SantaKisComing','SantaKisComing '])assert(!event.acceptsChristmasCode(code),code);
for(const [time,live] of [[event.CHRISTMAS_START-1,false],[event.CHRISTMAS_START,true],[event.CHRISTMAS_END-1,true],[event.CHRISTMAS_END,false]]){
  assert.equal(event.isChristmasEventLive(time),live);
  assert.equal(event.isChristmasAvailable(time),live);
}
const local=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',dateStyle:'short',timeStyle:'medium',hourCycle:'h23'});
const parts=time=>Object.fromEntries(local.formatToParts(time).map(part=>[part.type,part.value]));
for(const [time,month] of [[event.CHRISTMAS_START,'11'],[event.CHRISTMAS_END,'12']]){
  const value=parts(time);assert.equal(value.year,'2026');assert.equal(value.month,month);
  assert.equal(value.day,'26');assert.equal(value.hour,'00');assert.equal(value.minute,'00');assert.equal(value.second,'00');
}
event.storeChristmasPreview(true);assert(event.isChristmasAvailable(event.CHRISTMAS_START-10000));
event.storeChristmasPreview(false);assert(!event.isChristmasAvailable(event.CHRISTMAS_END));
globalThis.localStorage={getItem(){throw Error('Storage blocked')},setItem(){throw Error('Storage blocked')}};
event.storeChristmasPreview(true);assert(event.readChristmasPreview());assert(event.isChristmasAvailable(event.CHRISTMAS_END));
event.storeChristmasPreview(false);assert(!event.isChristmasAvailable(event.CHRISTMAS_END));
console.log('Christmas exact-case code, Denver calendar boundaries, preview toggle, and blocked-storage fallback passed.');
