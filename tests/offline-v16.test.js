import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfflineGame } from '../dist/js/offline.js';

const encoder = new TextEncoder();
const payload = encoder.encode('<!doctype html><title>Hearth & Oath — 世界</title>🗡️<p>é</p>');
const slices = [payload.slice(0, 36), payload.slice(36, 58), payload.slice(58)];
const manifestFor = chunks => ({bytes:chunks.reduce((sum,chunk)=>sum+chunk.byteLength,0),parts:chunks.map((chunk,index)=>({file:`game-${String(index+1).padStart(2,'0')}.part`,bytes:chunk.byteLength}))});
function mockFetch(manifest, chunks = slices, overrides = {}) {
  const calls = [];
  const responses = Object.fromEntries(chunks.map((chunk,index)=>[
    `./offline/game-${String(index+1).padStart(2,'0')}.part`,
    {ok:true,arrayBuffer:async()=>chunk.slice().buffer}
  ]));
  responses['./offline/manifest.json'] = {ok:true,json:async()=>manifest};
  Object.assign(responses,overrides);
  return {calls,fetcher:async url=>{calls.push(url);return responses[url];}};
}

test('offline download preserves every byte when UTF-8 characters cross chunk boundaries',async()=>{
  // Cut inside both a multi-byte CJK character and the sword emoji.
  const text = '<!doctype html><title>世界</title>🗡️';
  const bytes = encoder.encode(text),firstCut=encoder.encode('<!doctype html><title>').length+1;
  const secondCut=encoder.encode('<!doctype html><title>世界</title>').length+2;
  const chunks=[bytes.slice(0,firstCut),bytes.slice(firstCut,secondCut),bytes.slice(secondCut)];
  const {calls,fetcher}=mockFetch(manifestFor(chunks),chunks);
  const game=await loadOfflineGame(fetcher);
  assert.ok(game instanceof Blob);assert.equal(game.type,'text/html;charset=utf-8');assert.equal(game.size,bytes.byteLength);
  assert.deepEqual(new Uint8Array(await game.arrayBuffer()),bytes);assert.equal(await game.text(),text);
  assert.deepEqual([...calls].sort(),['./offline/manifest.json','./offline/game-01.part','./offline/game-02.part','./offline/game-03.part'].sort());
});

test('offline download rejects unavailable manifests and missing or unsuccessful part responses',async()=>{
  for(const response of [undefined,{ok:false}]){
    const {fetcher}=mockFetch(manifestFor(slices),slices,{'./offline/manifest.json':response});
    await assert.rejects(loadOfflineGame(fetcher),/manifest could not be downloaded/);
  }
  for(const response of [undefined,{ok:false}]){
    const {fetcher}=mockFetch(manifestFor(slices),slices,{'./offline/game-02.part':response});
    await assert.rejects(loadOfflineGame(fetcher),/game-02\.part could not be downloaded/);
  }
});

test('offline download rejects truncated or oversized parts instead of returning corrupt HTML',async()=>{
  for(const delta of [-1,1]){
    const wrong=new Uint8Array(slices[1].byteLength+delta);
    const {fetcher}=mockFetch(manifestFor(slices),slices,{'./offline/game-02.part':{ok:true,arrayBuffer:async()=>wrong.buffer}});
    await assert.rejects(loadOfflineGame(fetcher),/game-02\.part has an unexpected byte count/);
  }
});

test('offline manifest validates bounded part counts and exact positive integer byte totals before fetching payloads',async()=>{
  const one={file:'game-01.part',bytes:1};
  const malformed=[null,[],{},
    {bytes:0,parts:[one]},{bytes:-1,parts:[one]},{bytes:Infinity,parts:[one]},
    {bytes:NaN,parts:[one]},{bytes:1.5,parts:[one]},
    {bytes:1,parts:[]},{bytes:65,parts:Array.from({length:65},(_,i)=>({file:`game-${String(i+1).padStart(2,'0')}.part`,bytes:1}))},
    {bytes:2,parts:[one]},{bytes:1,parts:[null]},
    {bytes:1,parts:[{file:'game-01.part',bytes:0}]},
    {bytes:1,parts:[{file:'game-01.part',bytes:1.5}]},
    {bytes:1,parts:[{file:'game-01.part',bytes:Infinity}]},
    {bytes:1,parts:[{file:1,bytes:1}]},
    {bytes:Number.MAX_SAFE_INTEGER,parts:[{file:'game-01.part',bytes:Number.MAX_SAFE_INTEGER},{file:'game-02.part',bytes:1}]}
  ];
  for(const manifest of malformed){
    const {calls,fetcher}=mockFetch(manifest);
    await assert.rejects(loadOfflineGame(fetcher),/manifest/);
    assert.deepEqual(calls,['./offline/manifest.json'],'invalid manifests cannot trigger part requests');
  }
});

test('offline manifest accepts only the local game part basenames and rejects URL or path injection',async()=>{
  for(const file of ['../game-01.part','/game-01.part','https://example.com/game-01.part','game-01.part?x=1','game-01.part#x','game-1.part','game-001.part','game-01.part/extra','game-01.part\n']){
    const {calls,fetcher}=mockFetch({bytes:1,parts:[{file,bytes:1}]});
    await assert.rejects(loadOfflineGame(fetcher),/invalid part/);
    assert.deepEqual(calls,['./offline/manifest.json']);
  }
});
