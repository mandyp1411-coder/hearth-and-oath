import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { cpus, platform, release } from 'node:os';

const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(2,i<0?undefined:i),i<0?true:s.slice(i+1)];}));
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const modules=resolve(args.modules||join(project,'dist/js'));
const repo=resolve(modules,'../..'),fixtureDir=resolve(args.fixtures||join(project,'artifacts/performance/fixtures'));
const n=Number(args.samples||7),warmups=Number(args.warmups||1),mode=args.mode||'save';
assert.ok(Number.isInteger(n)&&n>0&&Number.isInteger(warmups)&&warmups>=0,'valid sample counts');
assert.ok(['save','cold','create'].includes(mode),'supported mode');
const sha=s=>createHash('sha256').update(s).digest('hex');
const hash=s=>sha(JSON.stringify(s));
const sourceFiles=readdirSync(modules).filter(s=>s.endsWith('.js')).sort();
const moduleHashes=Object.fromEntries(sourceFiles.map(name=>[name,sha(readFileSync(join(modules,name)))]));
const graphHash=hash(moduleHashes);
const sourceRevision=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceDirty=execFileSync('git',['-C',repo,'status','--porcelain'],{encoding:'utf8'}).trim();
const importStart=performance.now();
const E=await import(pathToFileURL(join(modules,'engine.js')));
const S=await import(pathToFileURL(join(modules,'saves.js')));
const engineAndSaveImportMs=performance.now()-importStart;
const report={schemaVersion:1,sourceRevision,sourceDirty,moduleDirectory:modules,moduleGraphHash:graphHash,moduleHashes,mode,node:process.version,environment:{platform:platform(),release:release(),cpu:cpus()[0]?.model,cpuCount:cpus().length},isolationNote:args['isolation-note']||'NOT PROVIDED: do not treat as quiet-environment result',limits:['Node CPU timings only, not browser/device or localStorage disk timings.','Cold store/title preparation covers save parsing/migration/copies only, not DOM, CSS, media, full app imports, or browser rendering.','Historical fixtures are labelled and migrated without invented resources or history truncation.'],engineAndSaveImportMs,samples:n,warmups};
const summary=values=>{const a=[...values].sort((x,y)=>x-y);return {medianMs:a[Math.floor(a.length/2)],minMs:a[0],maxMs:a.at(-1),samplesMs:values};};
const SLOT='hearth-and-oath:slots:v1';
const LEGACY=S.LEGACY_SAVE_KEY;
const clone=value=>JSON.parse(JSON.stringify(value));
const fixtures={};
const provenance=JSON.parse(readFileSync(join(fixtureDir,'provenance.json'),'utf8'));
for(const p of provenance){
 const raw=JSON.parse(readFileSync(join(fixtureDir,p.file),'utf8'));
 const state=E.migrateSave(raw);assert.ok(state,`${p.id} migrates`);assert.ok(E.validateSave(state));
 fixtures[p.id]=state;p.originalInputHash=hash(raw);p.migratedInputHash=hash(state);p.originalBytes=Buffer.byteLength(JSON.stringify(raw));p.migratedBytes=Buffer.byteLength(JSON.stringify(state));
}
report.fixtures=provenance;
function disk(envelope){
 const data=new Map([[SLOT,JSON.stringify(envelope)],[LEGACY,JSON.stringify(envelope.slots[envelope.activeSlot].state)]]);
 return {data,reads:0,writes:0,getItem(key){this.reads++;return data.get(key)??null;},setItem(key,value){this.writes++;data.set(key,String(value));},removeItem(key){data.delete(key);}};
}
function envelope(states,backups={}){return {version:1,activeSlot:states.length>1?states.length-1:0,slots:Array.from({length:3},(_,id)=>({id,state:states[id]||null,updatedAt:states[id]?'2026-10-15T00:00:00.000Z':null,revision:`benchmark-slot-${id}`})),backups:Object.fromEntries(Object.entries(backups).map(([id,state])=>[id,{state,updatedAt:'2026-10-14T00:00:00.000Z'}]))};}
function observer(){const calls=[];return {calls,validate(value){const start=performance.now();const result=E.migrateSave(value);calls.push({ms:performance.now()-start});return result;}};}
function assertCommit({store,storage,before,next,changed,remoteNeighbor}){
 const durable=JSON.parse(storage.getItem(SLOT));assert.equal(durable.version,1);assert.equal(durable.activeSlot,0);assert.deepEqual(durable.slots[0].state,next);assert.deepEqual(JSON.parse(storage.getItem(LEGACY)),next);
 assert.equal(store.available(),true);assert.equal(store.conflict(),null);assert.equal(store.hasUnsaved(),false);
 assert.deepEqual(durable.backups,before.backups);
 for(let id=1;id<3;id++)assert.deepEqual(durable.slots[id],remoteNeighbor?.id===id?remoteNeighbor:before.slots[id]);
 if(changed){assert.equal(typeof durable.slots[0].revision,'string');assert.ok(durable.slots[0].revision);assert.notEqual(durable.slots[0].revision,before.slots[0].revision);assert.ok(Number.isFinite(Date.parse(durable.slots[0].updatedAt)));assert.notEqual(durable.slots[0].updatedAt,before.slots[0].updatedAt);}
 else assert.deepEqual(durable.slots[0],before.slots[0]);
 assert.deepEqual(store.read(0),next);
 return {stateHash:hash(next),durablePayloadHash:hash({activeSlot:durable.activeSlot,slots:durable.slots.map(({id,state})=>({id,state})),backups:durable.backups}),targetRevisionAdvanced:changed,targetTimestampAdvanced:changed,untouchedSlotMetadataExact:true,backupsExact:true,mirrorExact:true};
}
if(mode==='create'){
 const {createLifeAtAge}=await import(pathToFileURL(join(modules,'new-life.js')));
 const config={seed:'roadmap15-controlled-adult',name:'Performance Gate',startAge:18,difficulty:'gentle'};
 const start=performance.now();const state=await createLifeAtAge(config);report.adultCreation={ms:performance.now()-start,config,inputHash:hash(config),outputHash:hash(state),bytes:Buffer.byteLength(JSON.stringify(state)),journal:state.journal.length};
 assert.ok(E.validateSave(state));
}else if(mode==='cold'){
 report.coldStore=[];
 for(const [id,env] of [['empty',envelope([])],['adult-one',envelope([fixtures.adult0])],['three-with-backups',envelope([fixtures.adult0,fixtures.adult1,fixtures.adult2],{0:fixtures.elder103,1:fixtures.successor2,2:fixtures.journey957})]]){
  const values=[],counts=[],validateMs=[];
  for(let i=-warmups;i<n;i++){
   const storage=disk(env),obs=observer(),start=performance.now(),store=S.createSaveStore(storage,obs.validate);
   const saved=store.read(store.active()),occupied=store.list().filter(s=>s.state);
   const ms=performance.now()-start;assert.equal(occupied.length,env.slots.filter(s=>s.state).length);if(saved)assert.ok(E.validateSave(saved));
   if(i>=0){values.push(ms);counts.push(obs.calls.length);validateMs.push(obs.calls.reduce((sum,x)=>sum+x.ms,0));}
  }
  report.coldStore.push({id,inputEnvelopeHash:hash(env),inputEnvelopeBytes:Buffer.byteLength(JSON.stringify(env)),...summary(values),migrationCalls:counts,migrationInclusiveMs:validateMs});
 }
}else{
 const adult=fixtures.adult0,inputHash=hash(adult),offered=E.getActions(adult);
 const chosen=args.action||['rest','health_routine','camp_rest','life_rest','grow_read'].find(id=>offered.some(a=>a.id===id&&!a.disabledReason));
 assert.ok(chosen,'choose a recorded legal ordinary adult action');assert.ok(offered.some(a=>a.id===chosen&&!a.disabledReason),chosen+' is actually offered');
 const next=E.chooseAction(adult,chosen);
 assert.ok(E.validateSave(next));assert.equal(hash(adult),inputHash,'engine input unchanged');assert.notEqual(hash(next),inputHash,'ordinary action really changes the state');
 report.action={id:chosen,inputHash,outputHash:hash(next)};
 const newborn=E.createBirthGame({seed:'roadmap15-controlled-birth',name:'Birth Gate',difficulty:'gentle'});assert.ok(E.validateSave(newborn));
 const birthChoice=newborn.event.choices.find(c=>!c.disabledReason);assert.ok(birthChoice);const afterBirth=E.chooseEventOption(newborn,birthChoice.id);assert.ok(E.validateSave(afterBirth));
 report.newborn={config:{seed:'roadmap15-controlled-birth',name:'Birth Gate',difficulty:'gentle'},inputHash:hash(newborn),choiceId:birthChoice.id,outputHash:hash(afterBirth)};
 const scenarios=[
  {id:'newborn-empty-first-write',env:envelope([]),next:newborn,changed:true},
  {id:'newborn-choice-one',env:envelope([newborn]),next:afterBirth,changed:true},
  {id:'adult-action-one',env:envelope([adult]),next,changed:true},
  {id:'adult-action-three',env:envelope([adult,fixtures.adult1,fixtures.adult2]),next,changed:true},
  {id:'adult-action-three-backups',env:envelope([adult,fixtures.adult1,fixtures.adult2],{0:fixtures.elder103,1:fixtures.successor2,2:fixtures.journey957}),next,changed:true},
  {id:'adult-unchanged-three-backups',env:envelope([adult,fixtures.adult1,fixtures.adult2],{0:fixtures.elder103,1:fixtures.successor2,2:fixtures.journey957}),next:adult,changed:false},
  {id:'elder103-unchanged',env:envelope([fixtures.elder103]),next:fixtures.elder103,changed:false},
  {id:'successor2-unchanged',env:envelope([fixtures.successor2]),next:fixtures.successor2,changed:false},
  {id:'journal957-unchanged',env:envelope([fixtures.journey957]),next:fixtures.journey957,changed:false},
 ];
 report.writes=[];
 for(const spec of scenarios){
  const samples=[],incoming=[],durable=[],counts=[],readCounts=[];let proof;
  for(let i=-warmups;i<n;i++){
   const env=clone(spec.env),storage=disk(env),obs=observer(),store=S.createSaveStore(storage,obs.validate);obs.calls.length=0;storage.reads=0;
   const start=performance.now();assert.ok(store.write(0,spec.next));const ms=performance.now()-start;
   const validationCalls=obs.calls.length,reads=storage.reads,own=obs.calls[0]?.ms||0,other=obs.calls.slice(1).reduce((sum,x)=>sum+x.ms,0);
   proof=assertCommit({store,storage,before:env,next:spec.next,changed:spec.changed});
   if(i>=0){samples.push(ms);incoming.push(own);durable.push(other);counts.push(validationCalls);readCounts.push(reads);}
  }
  report.writes.push({id:spec.id,inputEnvelopeHash:hash(spec.env),inputStateHash:hash(spec.next),inputEnvelopeBytes:Buffer.byteLength(JSON.stringify(spec.env)),...summary(samples),incomingMigrationMs:incoming,durableMigrationMs:durable,migrationCalls:counts,storageReads:readCounts,proof});
 }
 // Repeated calls retain a single store after its own successful commit.
 {
  const storage=disk(envelope([adult,fixtures.adult1,fixtures.adult2],{0:fixtures.elder103,1:fixtures.successor2,2:fixtures.journey957})),obs=observer(),store=S.createSaveStore(storage,obs.validate);assert.ok(store.write(0,next));
  const before=JSON.parse(storage.getItem(SLOT)),samples=[],incoming=[],durable=[],counts=[],readCounts=[];let proof;
  for(let i=-warmups;i<n;i++){obs.calls.length=0;storage.reads=0;const start=performance.now();assert.ok(store.write(0,next));const ms=performance.now()-start,reads=storage.reads;proof=assertCommit({store,storage,before,next,changed:false});if(i>=0){samples.push(ms);incoming.push(obs.calls[0]?.ms||0);durable.push(obs.calls.slice(1).reduce((sum,x)=>sum+x.ms,0));counts.push(obs.calls.length);readCounts.push(reads);}}
  report.writes.push({id:'warm-repeated-adult-three-backups',inputStateHash:hash(next),inputEnvelopeHash:hash({slots:before.slots.map(({id,state})=>({id,state})),backups:before.backups}),...summary(samples),incomingMigrationMs:incoming,durableMigrationMs:durable,migrationCalls:counts,storageReads:readCounts,proof});
 }
 // A byte change from another tab must take the external validation path and
 // preserve the changed neighboring slot, even if only its revision changed.
 {
  const env=envelope([adult,fixtures.adult1,fixtures.adult2]),storage=disk(env),obs=observer(),store=S.createSaveStore(storage,obs.validate);
  const remote=clone(env);remote.slots[1].revision='external-neighbor-revision';remote.slots[1].updatedAt='2026-10-16T00:00:00.000Z';storage.setItem(SLOT,JSON.stringify(remote));obs.calls.length=0;
  assert.ok(store.write(0,next));const count=obs.calls.length;assert.ok(count>=4,'externally changed three-slot envelope validates every occupied slot plus input');
  report.externalNeighbor={migrationCalls:count,proof:assertCommit({store,storage,before:env,next,changed:true,remoteNeighbor:remote.slots[1]})};
 }
 assert.equal(hash(adult),inputHash,'fixture remains immutable');
}
const output=JSON.stringify(report,null,2)+'\n';if(args.out)writeFileSync(resolve(args.out),output);else process.stdout.write(output);
