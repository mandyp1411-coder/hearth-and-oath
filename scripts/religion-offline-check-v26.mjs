import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fakeSurface} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import {loadOfflineGame} from '../dist/js/offline.js';
const sourcePath=process.argv[2],output=process.argv[3];assert.ok(sourcePath&&output,'Provide one real saved-life path and result path.');
const source=E.migrateSave(JSON.parse(readFileSync(sourcePath,'utf8')));assert.ok(source);
const html=readFileSync(new URL('../artifacts/hearth-and-oath.html',import.meta.url),'utf8'),script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],manifest=JSON.parse(readFileSync(new URL('../dist/offline/manifest.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const download=await loadOfflineGame(async url=>url.endsWith('manifest.json')?{ok:true,json:async()=>manifest}:{ok:true,arrayBuffer:async()=>{const b=readFileSync(new URL('../dist/'+url.replace(/^\.\//,''),import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
assert.equal(hash(Buffer.from(await download.arrayBuffer())),hash(Buffer.from(html)));new vm.Script(script,{filename:'hearth-and-oath-offline.js'});
assert.equal((script.match(/data:image\/avif;base64,/g)||[]).length,206);assert.ok(!/['"]\.\/art\/curses\//.test(script));
assert.ok(script.includes('faithInquiryPlan')&&script.includes('religiousQuestScene'),'new story modules missing from offline build');
const result={kind:'Instrumented DOM handlers and standalone VM; no browser, CSS geometry or listening test',version:manifest.version,sourceName:source.hero.name,sourceDay:source.day,sourceSha256:hash(Buffer.from(JSON.stringify(source))),offlineBytes:manifest.bytes,offlineSha256:hash(Buffer.from(html)),inlineAvifAtlases:206,networkCalls:0,surfaces:[]};
for(const [width,height] of [[390,844],[974,654],[1286,902],[1474,654],[1920,1080]]){
 const surface=fakeSurface();surface.storage.setItem('hearth-and-oath:life:v1',JSON.stringify(source));let fetches=0;
 const context=vm.createContext({document:surface.document,localStorage:surface.storage,FormData:surface.FormData,window:{innerWidth:width,innerHeight:height,scrollTo(){},scrollBy(){}},requestAnimationFrame:cb=>{cb();return 1;},setTimeout:()=>1,clearTimeout(){},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),URL,Blob,TextEncoder,TextDecoder,queueMicrotask,fetch:()=>{fetches++;throw Error('Network is blocked');}});
 vm.runInContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));',context);vm.runInContext(script,context,{timeout:15000});await surface.click('title-continue');
 assert.ok(E.validateSave(surface.current()));const membership=surface.current().realm.faithId;
 if(source.phase!=='retired'&&source.hero.condition?.hunger>=75&&!source.event){const day=surface.current().day;await surface.click('blood-need');assert.equal(surface.current().day,day);await surface.click('choice','endure');assert.equal(surface.current().day,day+1);assert.ok(E.validateSave(surface.current()));}
 await surface.click('menu');await surface.click('tab','realm');assert.match(surface.root.innerHTML,/Permission for public magic is a separate law/);assert.match(surface.root.innerHTML,/congregation cannot cancel a local warrant/);assert.equal(surface.current().realm.faithId,membership);
 await surface.click('menu');await surface.click('tab','character');assert.ok((surface.root.innerHTML.match(/data:image\/avif;base64,/g)||[]).length,'missing inline character art');assert.equal(fetches,0);assert.ok(E.validateSave(surface.current()));
 result.surfaces.push({width,height,realLifeReload:true,localCurseLawVisible:true,membershipPreserved:true,characterArtInline:true});
}
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
