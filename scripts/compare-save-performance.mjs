import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(2,i<0?undefined:i),i<0?true:s.slice(i+1)];}));
assert.ok(args.baseline&&args.candidate,'pass --baseline and --candidate reports');
const baseline=JSON.parse(readFileSync(args.baseline,'utf8')),candidate=JSON.parse(readFileSync(args.candidate,'utf8'));
assert.equal(baseline.mode,candidate.mode);assert.ok(baseline.samples>=3&&candidate.samples>=3,'at least three measured samples per graph');
assert.equal(baseline.node,candidate.node);assert.deepEqual(baseline.environment,candidate.environment);
assert.equal(baseline.sourceDirty,'','baseline source must be clean');assert.equal(candidate.sourceDirty,'','candidate source must be clean');
assert.deepEqual(Object.keys(baseline.moduleHashes),Object.keys(candidate.moduleHashes));
const changed=Object.keys(baseline.moduleHashes).filter(name=>baseline.moduleHashes[name]!==candidate.moduleHashes[name]);
assert.deepEqual(changed,['saves.js'],'only the reviewed save-cache implementation may differ');
assert.deepEqual(baseline.fixtures,candidate.fixtures,'exact original and migrated fixtures required');
const findings=[];
if(baseline.mode==='save'){
 assert.deepEqual(baseline.action,candidate.action);assert.deepEqual(baseline.newborn,candidate.newborn);assert.equal(baseline.externalNeighbor.migrationCalls,candidate.externalNeighbor.migrationCalls);assert.deepEqual(baseline.externalNeighbor.proof,candidate.externalNeighbor.proof);
 assert.deepEqual(baseline.writes.map(x=>x.id),candidate.writes.map(x=>x.id));
 for(let i=0;i<baseline.writes.length;i++){
  const a=baseline.writes[i],b=candidate.writes[i];assert.equal(a.inputEnvelopeHash,b.inputEnvelopeHash);assert.equal(a.inputStateHash,b.inputStateHash);assert.deepEqual(a.proof,b.proof);
  assert.ok(b.migrationCalls.every(n=>n===1),b.id+': incoming migration remains mandatory, unchanged durable migrations are removed');assert.ok(b.storageReads.every(n=>n===3),b.id+': actual durable reads are retained');
  const change=(b.medianMs/a.medianMs-1)*100;findings.push({id:a.id,baselineMedianMs:a.medianMs,candidateMedianMs:b.medianMs,changePercent:change});
  assert.ok(b.medianMs-a.medianMs<=Math.max(25,a.medianMs*.2),a.id+': non-target regression exceeds predeclared 25ms/20% tolerance');
  if(a.id==='adult-action-three-backups')assert.ok(change<=-20,'target hot path must improve at least 20% on this controlled Node workload');
 }
}else if(baseline.mode==='cold'){
 assert.deepEqual(baseline.coldStore.map(x=>x.id),candidate.coldStore.map(x=>x.id));
 for(let i=0;i<baseline.coldStore.length;i++){
  const a=baseline.coldStore[i],b=candidate.coldStore[i];assert.equal(a.inputEnvelopeHash,b.inputEnvelopeHash);assert.deepEqual(a.migrationCalls,b.migrationCalls,'cold initial validation is unchanged');
  findings.push({id:a.id,baselineMedianMs:a.medianMs,candidateMedianMs:b.medianMs,changePercent:(b.medianMs/a.medianMs-1)*100});assert.ok(b.medianMs-a.medianMs<=Math.max(50,a.medianMs*.2),a.id+': fresh-store regression exceeds predeclared 50ms/20% tolerance');
 }
}else{
 assert.deepEqual(baseline.adultCreation.config,candidate.adultCreation.config);assert.equal(baseline.adultCreation.outputHash,candidate.adultCreation.outputHash);findings.push({id:'adult-creation',note:'unchanged output, not a robust creation timing claim'});
}
const result={status:'PASS',baselineRevision:baseline.sourceRevision,candidateRevision:candidate.sourceRevision,mode:baseline.mode,samples:{baseline:baseline.samples,candidate:candidate.samples},changedModules:changed,findings,limits:baseline.limits};
const text=JSON.stringify(result,null,2)+'\n';if(args.out)writeFileSync(args.out,text);else process.stdout.write(text);
