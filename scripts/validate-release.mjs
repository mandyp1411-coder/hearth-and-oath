#!/usr/bin/env node
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runtimeIdentity,verificationIdentity,gitIdentity,hashFile,validateOfflineIdentity,validateUnchangedOfflineIdentity} from './lib/release-identity.mjs';
import {discoverContract,parseTestResults,aggregateStatus,classifyProcess,classifyTestOutcome} from './lib/release-contract.mjs';
import {executionIdentity,reusableResults,testTierStatus} from './lib/release-checkpoint.mjs';
import {runReleaseProcess} from './lib/release-process.mjs';
import {manualAttestation} from './lib/release-manual.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const flags=new Set(['--existing-artifact','--source-only','--inventory-only']);
const values=new Set(['--output','--manual-evidence','--expected-version','--expected-commit','--file-timeout-ms','--tier','--resume','--pause-after']);
for(let i=0;i<args.length;i++) {
  if(values.has(args[i])) {if(!args[++i]||args[i].startsWith('--'))throw Error('Missing option value.');}
  else if(!flags.has(args[i]))throw Error(`Unknown release option: ${args[i]}`);
}
const output=path.resolve(root,option('--output')||'artifacts/release-validation');
if(!output.startsWith(path.join(root,'artifacts')+path.sep))throw Error('--output must be inside artifacts/ (generated, not release source).');
const fileTimeoutMs=Number(option('--file-timeout-ms')||900000),tier=option('--tier')||'full';
if(!Number.isSafeInteger(fileTimeoutMs)||fileTimeoutMs<1000)throw Error('--file-timeout-ms must be an integer of at least 1000.');
if(!['core','full'].includes(tier))throw Error('--tier must be core or full.');
await mkdir(output,{recursive:true});
const report={schemaVersion:2,startedAt:new Date().toISOString(),command:['node','scripts/validate-release.mjs',...args],node:process.version,platform:process.platform,arch:process.arch,serial:true,fileTimeoutMs,tier,checks:[],manual:{},tests:[],limits:[
  'CSS checks are source assertions, not layout measurements.',
  'Handler/focus/ARIA checks use a semantic fake DOM, not a browser or screen reader.',
  'Core-only PASS is never full release certification; omitted stress tests remain NOT RUN.',
  'Offline checksum identity alone does not execute gameplay.',
]};
// Invalidate a prior report PASS immediately. A prior completed checkpoint remains
// separately available until this run reaches a clean terminal/pause comparison.
await writeFile(path.join(output,'report.json'),JSON.stringify({...report,softwareStatus:'NOT RUN',reason:'Validation in progress; no current aggregate result yet.'},null,2)+'\n');
const add=(id,status,detail={})=>{const row={id,status,...detail};report.checks.push(row);console.log(`${status}: ${id}${detail.reason?`: ${detail.reason}`:''}`);return row;};
let stopRequested=false,stopReason=null,activeChild=null;
const requestStop=signal=>{stopRequested=true;stopReason=`Interrupted by ${signal}; uncompleted file results are NOT RUN.`;activeChild?.stop();};
process.on('SIGINT',()=>requestStop('SIGINT'));process.on('SIGTERM',()=>requestStop('SIGTERM'));
const pauseFile=path.join(output,'PAUSE');
async function pauseRequested() {try{await stat(pauseFile);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function run(id,command,commandArgs) {
  console.log(`RUN: ${id}`);
  const log=path.join(output,id.replace(/[^a-z0-9.-]/gi,'_')+'.log');
  const result=await runReleaseProcess(command,commandArgs,{cwd:root,log,timeoutMs:fileTimeoutMs,onChild:child=>{activeChild=child;}});
  const resultsLog=log+'.results.jsonl';await writeFile(resultsLog,result.stdout);
  return {...result,log:path.relative(root,log),logSha256:await hashFile(log),resultsLog:path.relative(root,resultsLog),resultsLogSha256:await hashFile(resultsLog)};
}
async function partial() {
  await writeFile(path.join(output,'checkpoint.partial.json'),JSON.stringify({...report,operationStatus:'NOT RUN',immutableSourceStatus:'NOT RUN',reason:'Run in progress; final immutable-source comparison is pending.'},null,2)+'\n');
}
async function setManual(manifest,version) {
  for(const[id,config]of Object.entries(manifest.manualChecks))report.manual[id]={status:'NOT RUN',requiredForSoftwareGate:config.requiredForSoftwareGate,reason:config.description};
  if(!option('--manual-evidence'))return;
  const file=path.resolve(root,option('--manual-evidence')),manual=JSON.parse(await readFile(file,'utf8'));
  report.manualEvidence={path:option('--manual-evidence'),sha256:await hashFile(file),type:'Human-supplied attestation, not measured by this command'};
  for(const[id,row]of Object.entries(manual.checks||{})) {
    if(!manifest.manualChecks[id])throw Error(`Unknown manual check: ${id}`);
    const attestation=manualAttestation(manifest.manualChecks[id],row);
    if(manual.version!==version||manual.runtimeSha256!==report.source.runtime.sha256)throw Error('Manual evidence belongs to another runtime source/version.');
    if(attestation.evidencePath)attestation.evidenceSha256=await hashFile(path.resolve(root,attestation.evidencePath));
    report.manual[id]=attestation;
  }
  report.manualArtifactSha256=manual.artifactSha256;
}
try {
  const manifest=JSON.parse(await readFile(path.join(root,'release-contract.json'),'utf8'));
  const contract=await discoverContract(root,manifest),version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
  report.version=version;report.inventory=contract;
  report.source={runtime:await runtimeIdentity(root),verification:await verificationIdentity(root),git:gitIdentity(root)};
  report.executionIdentity=executionIdentity({...report,inventory:contract});
  if(option('--expected-version')&&option('--expected-version')!==version)throw Error('Expected version does not match package version.');
  if(option('--expected-commit')&&option('--expected-commit')!==report.source.git.head)throw Error('Expected commit does not match checked-out HEAD.');
  if(option('--pause-after')&&!contract.tests.some(row=>row.file===option('--pause-after')))throw Error('--pause-after must name an exact discovered test file.');
  add('test-contract','PASS',{files:contract.tests.length,stressFiles:contract.tests.filter(t=>t.tier==='stress').length,offlineChecks:contract.offline.length,newTests:contract.tests.filter(t=>t.newByConvention).map(t=>t.file),historicalExclusions:0});
  await setManual(manifest,version);
  let cached=new Map();
  if(option('--resume')) {
    const checkpoint=JSON.parse(await readFile(path.resolve(root,option('--resume')),'utf8'));
    cached=await reusableResults(checkpoint,report.executionIdentity,{root,hashFile});
    report.resumedFrom={path:option('--resume'),sha256:await hashFile(path.resolve(root,option('--resume'))),reusableFiles:cached.size};
  }
  const inventoryOnly=args.includes('--inventory-only');
  for(const check of contract.tests) {
    let row;
    if(!stopRequested&&await pauseRequested()){stopRequested=true;stopReason='PAUSE marker requested a clean boundary stop.';}
    if(inventoryOnly)row={...check,status:'NOT RUN',reason:'Inventory-only mode; no tests executed.'};
    else if(stopRequested)row={...check,status:'NOT RUN',reason:stopReason};
    else if(tier==='core'&&check.tier==='stress')row={...check,status:'NOT RUN',reason:'Reviewed stress cohort omitted from explicit core-only run; still required for full certification.'};
    else if(cached.has(check.file)) {row={...check,...cached.get(check.file)};console.log(`REUSE ${row.status}: ${check.file} (exact snapshot and log checksum)`);}
    else {
      const result=await run(check.file,process.execPath,['--test','--test-concurrency=1','--test-reporter=./scripts/lib/release-reporter.mjs',check.file]);
      let stats;try{stats=parseTestResults(result.stdout);}catch(error){stats={failed:1,reason:error.message};}
      const status=stopRequested?'NOT RUN':classifyTestOutcome(result,stats);
      row={...check,...stats,status,code:result.code,signal:result.signal,log:result.log,logSha256:result.logSha256,resultsLog:result.resultsLog,resultsLogSha256:result.resultsLogSha256,error:result.error,durationMs:result.durationMs};
      if(stopRequested)row={...check,status:'NOT RUN',reason:stopReason,log:result.log,logSha256:result.logSha256,durationMs:result.durationMs,diagnosticPartialStats:stats};
      console.log(`${status}: ${check.file} (${stats.passed||0} passed, ${stats.failed||0} failed, ${stats.skipped||0} skipped, ${(result.durationMs/1000).toFixed(1)}s)`);
    }
    report.tests.push(row);await partial();
    if(check.file===option('--pause-after')){stopRequested=true;stopReason=`Requested checkpoint after ${check.file}.`;}
  }
  report.coreTestStatus=testTierStatus(report.tests,'core');report.fullTestStatus=testTierStatus(report.tests);
  for(const category of ['unit-mechanics','handlers','responsive-css','accessibility-semantic']) {
    const rows=report.tests.filter(test=>test.categories.includes(category));
    add(category,aggregateStatus(rows),{files:rows.length,passed:rows.reduce((n,t)=>n+(t.passed||0),0),failed:rows.reduce((n,t)=>n+(t.failed||0),0),skipped:rows.reduce((n,t)=>n+(t.skipped||0),0)});
  }
  if(inventoryOnly||args.includes('--source-only')||stopRequested) {
    add('offline-build','NOT RUN',{reason:stopRequested?stopReason:inventoryOnly?'Inventory-only mode.':'Source-only mode; artifact not built or certified.'});
    add('offline-identity','NOT RUN',{reason:'No current artifact validation performed.'});
    add('offline-semantics','NOT RUN',{reason:'No embedded gameplay/handler checks executed.'});
    add('immutable-artifact','NOT RUN',{reason:'No offline artifact verification performed.'});
  } else {
    if(args.includes('--existing-artifact'))add('offline-build','NOT RUN',{requiredForSoftwareGate:false,reason:'Build intentionally reused, not rerun. Required identity validation below rejects stale runtime/build inputs.'});
    else {const result=await run('offline-build',process.execPath,['scripts/build-offline.mjs']);add('offline-build',classifyProcess(result),{log:result.log,logSha256:result.logSha256,code:result.code,signal:result.signal,error:result.error});}
    let validArtifact=false;
    try {report.artifact=await validateOfflineIdentity(root);if(report.manualArtifactSha256&&report.manualArtifactSha256!==report.artifact.sha256)throw Error('Manual offline evidence belongs to other artifact bytes.');validArtifact=true;add('offline-identity','PASS',report.artifact);}
    catch(error){add('offline-identity','FAIL',{reason:error.message});}
    const runs=[];
    for(const file of contract.offline) {
      if(!validArtifact||stopRequested){runs.push({file,status:'NOT RUN',reason:stopRequested?stopReason:'Exact current offline identity not established.'});continue;}
      const result=await run(file,process.execPath,['--expose-gc',file]),status=stopRequested?'NOT RUN':classifyProcess(result);
      runs.push({file,status,log:result.log,logSha256:result.logSha256,code:result.code,signal:result.signal,error:result.error});console.log(`${status}: ${file}`);
    }
    report.offline=runs;add('offline-semantics',aggregateStatus(runs),{files:runs.length});
    if(!validArtifact)add('immutable-artifact','NOT RUN',{reason:'No initial exact artifact identity was established.'});
    else {
      try {report.artifactAfter=await validateUnchangedOfflineIdentity(root,report.artifact);add('immutable-artifact','PASS',{reason:'Standalone bundle, hosted parts, loader and exact provenance manifest revalidated after semantic checkers.'});}
      catch(error){add('immutable-artifact','FAIL',{reason:error.message});}
    }
  }
  const after={runtime:await runtimeIdentity(root),verification:await verificationIdentity(root),git:gitIdentity(root)};
  const immutable=after.runtime.sha256===report.source.runtime.sha256&&after.verification.sha256===report.source.verification.sha256&&after.git.head===report.source.git.head;
  report.immutableSourceStatus=immutable?'PASS':'FAIL';report.after=after;
  add('immutable-source',report.immutableSourceStatus,{reason:'Runtime, build/test inputs and HEAD compared before and after verification.'});
  for(const[id,row]of Object.entries(report.manual))if(row.requiredForSoftwareGate)add(`manual:${id}`,row.status,{reason:row.reason});
} catch(error) {add('validation-infrastructure','FAIL',{reason:error.message});}
for(const id of ['test-contract','unit-mechanics','handlers','responsive-css','accessibility-semantic','offline-build','offline-identity','offline-semantics','immutable-artifact','immutable-source'])if(!report.checks.some(check=>check.id===id))add(id,'NOT RUN',{reason:'Verification did not reach this stage; see preceding failure.'});
report.finishedAt=new Date().toISOString();report.operationStatus=stopRequested?'NOT RUN':report.checks.some(row=>row.id==='validation-infrastructure'&&row.status==='FAIL')?'FAIL':'PASS';report.stopReason=stopReason;
report.softwareStatus=aggregateStatus(report.checks.filter(check=>check.requiredForSoftwareGate!==false));report.softwareComplete=report.softwareStatus==='PASS';report.manualStatus=aggregateStatus(Object.values(report.manual));
report.summary={filesTotal:report.inventory?.tests.length||0,filesTerminal:report.tests.filter(t=>t.status!=='NOT RUN').length,reusedFiles:report.tests.filter(t=>t.reused).length,passed:report.tests.reduce((n,t)=>n+(t.passed||0),0),failed:report.tests.reduce((n,t)=>n+(t.failed||0),0),skipped:report.tests.reduce((n,t)=>n+(t.skipped||0),0),stressNotRunFiles:report.tests.filter(t=>t.tier==='stress'&&t.status==='NOT RUN').map(t=>t.file)};
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(output,'checkpoint.json'),JSON.stringify(report,null,2)+'\n');
for(const[id,row]of Object.entries(report.manual))console.log(`${row.status}: manual:${id}${row.attestation?' (human-supplied attestation)':''}`);
console.log(`Core tests: ${report.coreTestStatus||'NOT RUN'}. Full tests: ${report.fullTestStatus||'NOT RUN'}. Software gate: ${report.softwareStatus}. Manual checks are separate.\nReport: ${path.relative(root,path.join(output,'report.json'))}`);
process.exitCode=report.softwareStatus==='PASS'?0:report.softwareStatus==='FAIL'?1:2;
