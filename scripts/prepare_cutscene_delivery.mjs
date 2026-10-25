import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Delivery-only resampling/encoding. Originals and creative artwork stay intact.
const root=fileURLToPath(new URL('../',import.meta.url));
const requested=process.argv.slice(2);
const manifests=requested.length?requested:['prologue-v2','level1-v1','level2-v1','level3-v1','level4-v1','level5-v1','level6-v1'];
if(manifests.some(chapter=>!['prologue-v2','level1-v1','level2-v1','level3-v1','level4-v1','level5-v1','level6-v1'].includes(chapter)))throw Error('Unknown cutscene chapter');
const images=new Set();
for(const chapter of manifests){
  const scenes=JSON.parse(await fs.readFile(path.join(root,'public/cutscenes',chapter,'scenes.json'),'utf8'));
  for(const scene of scenes)images.add(scene.image);
}
const browser=await chromium.launch({headless:true});
let originalBytes=0,deliveryBytes=0;
try{
  const page=await browser.newPage();
  for(const image of images){
    const source=path.join(root,'public',image),dest=source.replace(/\.png$/,'.webp');
    const bytes=await fs.readFile(source);
    const encoded=await page.evaluate(async data=>{
      const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
      const canvas=document.createElement('canvas');
      canvas.width=Math.min(1440,img.naturalWidth);canvas.height=Math.round(img.naturalHeight*canvas.width/img.naturalWidth);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/webp',.88).split(',')[1];
    },bytes.toString('base64'));
    const output=Buffer.from(encoded,'base64');
    await fs.writeFile(dest,output);originalBytes+=bytes.length;deliveryBytes+=output.length;
    console.log(`${path.relative(root,dest)}: ${Math.round(output.length/1024)} KiB`);
  }
  console.log(JSON.stringify({images:images.size,originalBytes,deliveryBytes,savedPercent:Math.round(100*(1-deliveryBytes/originalBytes))}));
}finally{await browser.close();}
