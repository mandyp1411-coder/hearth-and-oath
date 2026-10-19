import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadOfflineGame} from '../dist/js/offline.js';
import {packageHosting} from '../scripts/package-hosting-v57.mjs';
import {verifyHostingRecipe} from '../scripts/verify-hosting-recipe-v57.mjs';
const encode=text=>new TextEncoder().encode(text),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const copy=value=>structuredClone(value),later=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(count=2){
  const assets=Array.from({length:count},(_,index)=>{const bytes=encode(index?'score '+index:'<svg>世界 🗡️</svg>'),file=index?'audio/score-'+index+'.ogg':'art/face.svg';return {file,mime:index?'audio/ogg':'image/svg+xml',bytes:bytes.length,sha256:hash(bytes),marker:`__HO_ASSET_${hash(bytes).slice(0,16)}_${String(index).padStart(4,'0')}__`,occurrences:index?1:2,payload:bytes};});
  const template=`<!doctype html><title>世界 🗡️</title><img src="${assets[0].marker}"><script>const portrait='${assets[0].marker}';const score=${JSON.stringify(assets.slice(1).map(a=>a.marker))};</script>`,bytes=encode(template),cut=encode('<!doctype html><title>').length+1;
  const chunks=[bytes.slice(0,cut),bytes.slice(cut)],templateParts=chunks.map((part,index)=>({file:`template-${String(index+1).padStart(2,'0')}.part`,bytes:part.length,sha256:hash(part)}));
  const expected=template.replace(/__HO_ASSET_[a-f0-9]{16}_\d{4}__/g,marker=>{const a=assets.find(a=>a.marker===marker);return `data:${a.mime};base64,${Buffer.from(a.payload).toString('base64')}`;});
  const manifest={schemaVersion:3,bytes:encode(expected).length,sha256:hash(encode(expected)),templateBytes:bytes.length,templateSha256:hash(bytes),inputBytes:bytes.length+assets.reduce((n,a)=>n+a.bytes,0),templateParts,assets:assets.map(({payload,...asset})=>asset)};
  const payloads=new Map([...templateParts.map((p,i)=>['./offline/'+p.file,chunks[i]]),...assets.map(a=>['./'+a.file,a.payload])]),calls=[];
  const fetcher=async(url,options)=>{calls.push({url,signal:options?.signal});return url==='./offline/manifest.json'?{ok:true,json:async()=>manifest}:{ok:payloads.has(url),arrayBuffer:async()=>payloads.get(url).slice().buffer};};
  return {manifest,payloads,calls,fetcher,expected};
}
test('schema3 reconstructs the exact complete HTML, including repeated assets and split UTF-8, while fetching each media file once',async()=>{
  const f=fixture(),events=[],game=await loadOfflineGame(f.fetcher,{onProgress:event=>events.push(event)});
  assert.equal(await game.text(),f.expected);assert.equal(hash(new Uint8Array(await game.arrayBuffer())),f.manifest.sha256);assert.equal(game.type,'text/html;charset=utf-8');
  assert.equal(f.calls.filter(c=>c.url==='./art/face.svg').length,1);assert.equal(events.at(-1).downloadedBytes,f.manifest.inputBytes);assert.equal(events.at(-1).phase,'complete');assert.equal(events.at(-1).artifactBytes,game.size);
  for(let i=1;i<events.length;i++)assert.ok(events[i].downloadedBytes>=events[i-1].downloadedBytes);
});
test('unsafe, duplicate and excessive schema3 entries fail before any payload request',async()=>{
  const bad=['../private','/art/face.svg','https://example.com/face.svg','art/../face.svg','art/face.svg?secret=1','art/%2e%2e/face.svg','art/face.svg\n','art\\face.svg'];
  for(const file of bad){const f=fixture();f.manifest.assets[0].file=file;await assert.rejects(loadOfflineGame(f.fetcher),/manifest/);assert.equal(f.calls.length,1);}
  for(const alter of [m=>m.assets.push(copy(m.assets[0])),m=>m.assets[0].occurrences=0,m=>m.inputBytes++,m=>m.templateParts[0].file='../template-01.part',m=>m.assets=Array(2049).fill(m.assets[0])]){
    const f=fixture();alter(f.manifest);await assert.rejects(loadOfflineGame(f.fetcher),/manifest/);assert.equal(f.calls.length,1);
  }
});
test('truncation, asset checksum corruption and marker-count corruption never yield an offline file',async()=>{
  for(const alter of [f=>f.payloads.set('./art/face.svg',encode('short')),f=>f.manifest.assets[0].sha256='0'.repeat(64),f=>f.manifest.assets[0].occurrences++]){
    const f=fixture(),events=[];alter(f);await assert.rejects(loadOfflineGame(f.fetcher,{onProgress:e=>events.push(e)}),/byte count|checksum|marker counts/);assert.ok(!events.some(e=>e.phase==='complete'));
  }
});
test('recipe media requests are bounded to four in flight and cancellation rejects blocked reads without starting more',{timeout:5000},async()=>{
  const f=fixture(9),gate=later(),begun=later(),controller=new AbortController();let active=0,maximum=0,media=0;
  const fetcher=async(url,options)=>{
    if(!url.startsWith('./art/')&&!url.startsWith('./audio/'))return f.fetcher(url,options);
    media++;active++;maximum=Math.max(maximum,active);if(media===4)begun.resolve();return {ok:true,arrayBuffer:async()=>{await gate.promise;active--;return f.payloads.get(url).slice().buffer;}};
  };
  const work=loadOfflineGame(fetcher,{signal:controller.signal});
  await begun.promise;assert.equal(media,4);assert.equal(maximum,4);controller.abort();await assert.rejects(work,{name:'AbortError'});gate.resolve();await nextTurn();assert.equal(media,4);
});
test('historical schema2 supports64 ordered byte parts without changing the reconstructed bytes',async()=>{
  const manifest={schemaVersion:2,bytes:64,parts:Array.from({length:64},(_,i)=>({file:`game-${String(i+1).padStart(2,'0')}.part`,bytes:1}))};
  const game=await loadOfflineGame(async url=>url==='./offline/manifest.json'?{ok:true,json:async()=>manifest}:{ok:true,arrayBuffer:async()=>new Uint8Array([65]).buffer});assert.equal(await game.text(),'A'.repeat(64));
});
test('hosting preparation reuses runtime assets and ships recipe templates without duplicate standalone parts',async t=>{
  const project=await mkdtemp(path.join(os.tmpdir(),'hearth-hosting-'));t.after(()=>rm(project,{recursive:true,force:true}));const f=fixture();
  await mkdir(path.join(project,'dist/offline'),{recursive:true});await mkdir(path.join(project,'dist/art'),{recursive:true});
  await writeFile(path.join(project,'dist/index.html'),'<title>Runtime</title>');await writeFile(path.join(project,'dist/art/face.svg'),'retained runtime image');
  await writeFile(path.join(project,'dist/offline/manifest.json'),JSON.stringify({schemaVersion:2}));await writeFile(path.join(project,'dist/offline/recipe.json'),JSON.stringify(f.manifest));
  await writeFile(path.join(project,'dist/offline/game-01.part'),'large duplicate complete HTML bytes');await writeFile(path.join(project,'dist/offline/template-01.part'),'small recipe template');
  const result=await packageHosting(project);assert.equal(result.offlineSchema,3);assert.deepEqual(JSON.parse(await readFile(path.join(project,'out/offline/manifest.json'),'utf8')),f.manifest);
  assert.deepEqual(await readdir(path.join(project,'out/offline')),['manifest.json','template-01.part']);assert.equal(await readFile(path.join(project,'out/art/face.svg'),'utf8'),'retained runtime image');assert.ok(await readFile(path.join(project,'dist/offline/game-01.part')));
});
test('release recipe verification compares the shipped payload with every complete offline byte',async t=>{
  const project=await mkdtemp(path.join(os.tmpdir(),'hearth-parity-'));t.after(()=>rm(project,{recursive:true,force:true}));const f=fixture();
  for(const [url,bytes]of f.payloads){const file=path.join(project,'out',url.slice(2));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}
  await mkdir(path.join(project,'dist/offline'),{recursive:true});await mkdir(path.join(project,'artifacts'),{recursive:true});
  await writeFile(path.join(project,'out/offline/manifest.json'),JSON.stringify(f.manifest));
  await writeFile(path.join(project,'dist/offline/manifest.json'),JSON.stringify({schemaVersion:2,bytes:f.manifest.bytes,sha256:f.manifest.sha256}));
  await writeFile(path.join(project,'artifacts/hearth-and-oath.html'),f.expected);
  assert.equal((await verifyHostingRecipe(project)).sha256,f.manifest.sha256);
  await writeFile(path.join(project,'artifacts/hearth-and-oath.html'),f.expected+' ');
  await assert.rejects(verifyHostingRecipe(project),/exact complete offline HTML/);
});
