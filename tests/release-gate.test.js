import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {discoverContract,aggregateStatus,parseTestResults,classifyProcess,classifyTestOutcome} from '../scripts/lib/release-contract.mjs';
import {runtimeIdentity,validateOfflineIdentity,validateUnchangedOfflineIdentity,sha256,hashFile} from '../scripts/lib/release-identity.mjs';
import {executionIdentity,reusableResults,testTierStatus} from '../scripts/lib/release-checkpoint.mjs';
import {runReleaseProcess} from '../scripts/lib/release-process.mjs';
import {manualAttestation} from '../scripts/lib/release-manual.mjs';

async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),'hearth-release-contract-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const put=async(file,content)=>{await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),content);};
  await put('package.json',JSON.stringify({version:'0.99.0'}));await put('dist/js/app.js','<small>v0.99.0</small>\n');await put('dist/index.html','<html lang="en"></html>');await put('dist/styles.css','body{}');await put('scripts/build-offline.mjs','// fixture builder');await put('scripts/lib/release-identity.mjs','// fixture provenance algorithm');
  const bytes=Buffer.from('<html>Standalone fixture v0.99.0</html>'),loader='<html>Hosted loader fixture</html>';
  await put('dist/hearth-and-oath.html',loader);
  const manifest={schemaVersion:2,version:'0.99.0',bytes:bytes.length,sha256:sha256(bytes),loaderSha256:sha256(loader),source:await runtimeIdentity(root),buildGit:{head:'fixture-precommit',dirty:true},parts:[{file:'game-01.part',bytes:bytes.length,sha256:sha256(bytes)}]};
  await put('dist/offline/game-01.part',bytes);await put('artifacts/hearth-and-oath.html',bytes);await put('dist/offline/manifest.json',JSON.stringify(manifest));
  return {root,put,manifest,bytes};
}
test('release contract includes new feature tests and offline checkers by convention, without historical exclusions',async t=>{
  const {root,put}=await fixture(t);await put('tests/old-save.test.js','// migrateSave');await put('tests/new-feature.test.js','// mountApp styles.css aria-label');await put('scripts/verify-offline-new-feature.mjs','// current');
  const contract=await discoverContract(root,{schemaVersion:1,tests:{'tests/old-save.test.js':{}},requiredOfflineChecks:[],categoryRules:{handlers:'mountApp','responsive-css':'styles\\.css','accessibility-semantic':'aria-'}});
  assert.equal(contract.tests.length,2);const fresh=contract.tests.find(row=>row.newByConvention);assert.equal(fresh.file,'tests/new-feature.test.js');assert.deepEqual(fresh.categories,['unit-mechanics','handlers','responsive-css','accessibility-semantic']);assert.deepEqual(contract.offline,['scripts/verify-offline-new-feature.mjs']);
  await assert.rejects(discoverContract(root,{schemaVersion:1,tests:{'tests/missing-old-save.test.js':{}},requiredOfflineChecks:[],categoryRules:{}}),/disappeared/);
});
test('release aggregation cannot turn failures, skips, incomplete or blocked checks into PASS',()=>{
  assert.equal(aggregateStatus([{status:'PASS'},{status:'FAIL'}]),'FAIL');assert.equal(aggregateStatus([{status:'PASS'},{status:'NOT RUN'}]),'NOT RUN');assert.equal(aggregateStatus([{status:'PASS'},{status:'ENVIRONMENT BLOCKED'}]),'ENVIRONMENT BLOCKED');assert.equal(aggregateStatus([]),'NOT RUN');assert.equal(aggregateStatus([{status:'pretend green'}]),'FAIL');
  const parsed=parseTestResults('{"type":"test:pass","name":"one"}\n{"type":"test:fail","name":"two"}\n{"type":"test:pass","name":"three","skip":true}\n');assert.equal(parsed.passed,1);assert.equal(parsed.failed,1);assert.equal(parsed.skipped,1);assert.equal(classifyProcess({code:null,signal:'SIGKILL'}),'ENVIRONMENT BLOCKED');assert.equal(classifyProcess({code:1}),'FAIL');assert.equal(classifyProcess({code:0}),'PASS');
  const killed=parseTestResults('{"type":"test:fail","name":"terminated VM","signal":"SIGKILL"}');assert.equal(killed.environmentBlocked,1);assert.equal(killed.failed,0);
  const mixed=parseTestResults('{"type":"test:fail","name":"actual regression"}\n{"type":"test:fail","name":"terminated VM","signal":"SIGKILL"}');assert.equal(classifyTestOutcome({code:1},mixed),'FAIL','a later signal cannot hide an already observed assertion failure');
  assert.throws(()=>parseTestResults('not JSON'),/cannot be trusted/);assert.equal(parseTestResults('{"type":"test:pass","name":"empty.test.js","file":"empty.test.js"}').results,0);
});
test('the real Node reporter distinguishes a failed assertion and skipped test instead of trusting process output',async t=>{
  const {root,put}=await fixture(t);await put('probe.test.mjs',"import test from 'node:test';import assert from 'node:assert/strict';test('works',()=>{});test('regression',()=>assert.equal(1,2));test.skip('unexecuted',()=>{});");
  const reporter=new URL('../scripts/lib/release-reporter.mjs',import.meta.url).pathname;
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-concurrency=1',`--test-reporter=${reporter}`,path.join(root,'probe.test.mjs')],{encoding:'utf8',env});
  assert.equal(result.status,1);const stats=parseTestResults(result.stdout);assert.equal(stats.passed,1);assert.equal(stats.failed,1);assert.equal(stats.skipped,1);assert.equal(stats.failures[0].name,'regression');
  await put('terminated.test.mjs',"process.kill(process.pid,'SIGTERM');\n");
  const terminated=spawnSync(process.execPath,['--test','--test-concurrency=1',`--test-reporter=${reporter}`,path.join(root,'terminated.test.mjs')],{encoding:'utf8',env});
  const interrupted=parseTestResults(terminated.stdout);assert.equal(terminated.status,1);assert.equal(interrupted.environmentBlocked,1);assert.equal(interrupted.failed,0);assert.equal(interrupted.failures[0].signal,'SIGTERM');
});
test('exact offline bytes, per-part checksums, version and runtime source are all required',async t=>{
  const {root,put,manifest,bytes}=await fixture(t);const valid=await validateOfflineIdentity(root);assert.equal(valid.sha256,manifest.sha256);assert.equal(valid.buildGit.dirty,true,'precommit provenance is disclosed, never relabeled as a clean final commit');
  await put('dist/js/app.js','<small>v0.99.0</small>\n// changed runtime');await assert.rejects(validateOfflineIdentity(root),/stale/);await put('dist/js/app.js','<small>v0.99.0</small>\n');
  await put('dist/offline/game-01.part',Buffer.from(bytes).fill(88,5,6));await assert.rejects(validateOfflineIdentity(root),/part.*checksum/);await put('dist/offline/game-01.part',bytes);
  await put('artifacts/hearth-and-oath.html','wrong');await assert.rejects(validateOfflineIdentity(root),/Standalone artifact differs/);await put('artifacts/hearth-and-oath.html',bytes);
  await put('dist/offline/game-02.part','extra');await assert.rejects(validateOfflineIdentity(root),/extra/);await rm(path.join(root,'dist/offline/game-02.part'));
  await put('dist/hearth-and-oath.html','changed loader');await assert.rejects(validateOfflineIdentity(root),/loader differs/);await put('dist/hearth-and-oath.html','<html>Hosted loader fixture</html>');
  await put('dist/offline/manifest.json',JSON.stringify({...manifest,version:'0.98.0'}));await assert.rejects(validateOfflineIdentity(root),/version/);
  await put('dist/offline/manifest.json',JSON.stringify({...manifest,schemaVersion:1}));await assert.rejects(validateOfflineIdentity(root),/provenance/);
});
test('test-only changes do not invalidate the runtime artifact, but build-input changes do',async t=>{
  const {root,put}=await fixture(t);await put('tests/new-mechanical-guard.test.js','// future guard');await validateOfflineIdentity(root);await put('scripts/build-offline.mjs','// changed bundling behavior');await assert.rejects(validateOfflineIdentity(root),/stale/);
});
test('offline bytes and provenance must remain unchanged throughout semantic verification',async t=>{
  const {root,put,manifest,bytes}=await fixture(t),before=await validateOfflineIdentity(root);
  assert.deepEqual(await validateUnchangedOfflineIdentity(root,before),before);
  await put('dist/offline/manifest.json',JSON.stringify({...manifest,buildGit:{head:'changed-provenance',dirty:false}}));
  await assert.rejects(validateUnchangedOfflineIdentity(root,before),/changed during verification/);
  await put('dist/offline/manifest.json',JSON.stringify(manifest));
  await put('artifacts/hearth-and-oath.html',Buffer.from(bytes).fill(88,5,6));
  await assert.rejects(validateUnchangedOfflineIdentity(root,before),/Standalone artifact differs/);
});

test('new tests default to core even under stress; only reviewed cohorts can be marked stress',async t=>{
  const {root,put}=await fixture(t);await put('tests/stress/new-feature.test.js','// current future feature');await put('tests/stress/reviewed-cohort.test.js','// repeated full lifetimes');
  const manifest={schemaVersion:1,tests:{'tests/stress/reviewed-cohort.test.js':{tier:'stress',reason:'Repeated full-lifetime cohort retained for full certification.',coreCoverage:'Current mechanics, migrations and one full representative lifetime stay in core.'}},requiredOfflineChecks:[],categoryRules:{}};
  const contract=await discoverContract(root,manifest);assert.equal(contract.tests.find(t=>t.file.includes('new-feature')).tier,'core');assert.equal(contract.tests.find(t=>t.file.includes('reviewed-cohort')).tier,'stress');
  delete manifest.tests['tests/stress/reviewed-cohort.test.js'].coreCoverage;await assert.rejects(discoverContract(root,manifest),/reviewed reason and retained core coverage/);
  const tests=[{tier:'core',status:'PASS'},{tier:'stress',status:'NOT RUN'}];assert.equal(testTierStatus(tests,'core'),'PASS');assert.equal(testTierStatus(tests),'NOT RUN');tests[0].status='FAIL';assert.equal(testTierStatus(tests,'core'),'FAIL');assert.equal(testTierStatus(tests),'FAIL');
});
test('resume reuses actual results only for identical source, contract, environment and intact logs',async t=>{
  const {root,put}=await fixture(t);await put('artifacts/prior/one.log','one actual passing result');await put('artifacts/prior/one.results.jsonl','{"type":"test:pass","name":"actual executed case"}\n');
  const identity=executionIdentity({source:{runtime:{sha256:'runtime',files:1},verification:{sha256:'tests-and-runner',files:2},git:{head:'exact-head'}},version:'0.99.0',node:process.version,platform:process.platform,arch:process.arch,inventory:{tests:[{file:'tests/one.test.js',tier:'core',categories:['unit-mechanics']}]}});
  const checkpoint={schemaVersion:2,immutableSourceStatus:'PASS',executionIdentity:identity,tests:[{file:'tests/one.test.js',tier:'core',status:'PASS',code:0,passed:1,failed:0,skipped:0,resultsLog:'artifacts/prior/one.results.jsonl',resultsLogSha256:await hashFile(path.join(root,'artifacts/prior/one.results.jsonl')),log:'artifacts/prior/one.log',logSha256:await hashFile(path.join(root,'artifacts/prior/one.log'))},{file:'tests/not-finished.test.js',status:'NOT RUN'}]};
  const cached=await reusableResults(checkpoint,identity,{root,hashFile});assert.equal(cached.size,1);assert.equal(cached.get('tests/one.test.js').reused,true);
  for(const change of [{...identity,head:'new-head'},{...identity,version:'0.99.1'},{...identity,runtime:{sha256:'changed',files:1}},{...identity,verification:{sha256:'new-assertion',files:2}},{...identity,node:'other-node'},{...identity,inventory:'another-test'}])await assert.rejects(reusableResults(checkpoint,change,{root,hashFile}),/Resume rejected/);
  await assert.rejects(reusableResults({...checkpoint,immutableSourceStatus:'NOT RUN'},identity,{root,hashFile}),/in-progress/);
  checkpoint.tests[0].status='FAIL';await assert.rejects(reusableResults(checkpoint,identity,{root,hashFile}),/disagree with actual reporter/);
  checkpoint.tests[0].status='PASS';
  await put('artifacts/prior/one.results.jsonl','{"type":"test:fail","name":"actual failed case"}\n');Object.assign(checkpoint.tests[0],{status:'FAIL',code:1,passed:0,failed:1,resultsLogSha256:await hashFile(path.join(root,'artifacts/prior/one.results.jsonl'))});
  assert.equal((await reusableResults(checkpoint,identity,{root,hashFile})).get('tests/one.test.js').status,'FAIL','a genuine saved failure remains a failure');
  await put('artifacts/prior/one.log','tampered result');await assert.rejects(reusableResults(checkpoint,identity,{root,hashFile}),/log changed/);
});
test('declared subprocess budget terminates its own fixture and cannot report a pass',async t=>{
  const {root}=await fixture(t),log=path.join(root,'artifacts/process.log');
  const result=await runReleaseProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd:root,log,timeoutMs:120});
  assert.equal(result.timedOut,true);assert.match(result.error,/budget/);assert.equal(classifyProcess(result),'ENVIRONMENT BLOCKED');assert.ok(result.durationMs<5000);assert.ok(result.signal||result.code!==0);
});
test('human evidence cannot override contract-required manual checks or assert an undocumented pass',()=>{
  const row={status:'PASS',reason:'Measured browser review.',evidencePath:'artifacts/review.png',reviewer:'Reviewer',reviewedAt:'2026-10-17T04:00:00Z',requiredForSoftwareGate:false,attestation:false};
  assert.equal(manualAttestation({requiredForSoftwareGate:true},row).requiredForSoftwareGate,true);
  assert.equal(manualAttestation({requiredForSoftwareGate:false},{...row,requiredForSoftwareGate:true}).requiredForSoftwareGate,false);
  assert.equal(manualAttestation({requiredForSoftwareGate:true},row).attestation,true);
  assert.throws(()=>manualAttestation({requiredForSoftwareGate:true},{...row,evidencePath:''}),/Manual PASS/);
  assert.throws(()=>manualAttestation({requiredForSoftwareGate:true},{...row,reviewedAt:'not a date'}),/Manual PASS/);
  assert.throws(()=>manualAttestation({requiredForSoftwareGate:true},{...row,status:'all green'}),/valid status/);
  assert.throws(()=>manualAttestation({requiredForSoftwareGate:true},{...row,reason:' '}),/nonempty reason/);
});
