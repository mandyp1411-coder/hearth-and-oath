import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {parseTestResults,classifyTestOutcome,STATUSES} from './release-contract.mjs';
import {sha256} from './release-identity.mjs';

/** Resume is exact-snapshot reuse, not affected-test guessing. */
export function executionIdentity({source,version,node,platform,arch,inventory}) {
  return {
    runtime:source.runtime,verification:source.verification,head:source.git.head,
    version,node,platform,arch,
    inventory:sha256(JSON.stringify(inventory.tests.map(({file,tier,categories})=>({file,tier,categories})))),
  };
}
export async function reusableResults(checkpoint,identity,{root,hashFile}) {
  if(checkpoint.schemaVersion!==2||checkpoint.immutableSourceStatus!=='PASS')throw Error('Resume requires a schema-2 checkpoint with a completed immutable-source comparison; an in-progress/old partial is not resumable.');
  if(JSON.stringify(checkpoint.executionIdentity)!==JSON.stringify(identity))throw Error('Resume rejected: runtime, test/runner/contract content, version, HEAD, environment or discovered inventory changed. Start a new run.');
  const rows=new Map();
  for(const row of checkpoint.tests||[]) {
    if(!['PASS','FAIL'].includes(row.status))continue;
    if(rows.has(row.file))throw Error(`Duplicate checkpoint result: ${row.file}`);
    const log=path.resolve(root,row.log||'');
    if(!log.startsWith(path.join(root,'artifacts')+path.sep)||!/^[a-f0-9]{64}$/.test(row.logSha256||''))throw Error(`Resume result lacks an owned, checksummed log: ${row.file}`);
    if(await hashFile(log)!==row.logSha256)throw Error(`Resume log changed: ${row.file}`);
    const resultsLog=path.resolve(root,row.resultsLog||'');
    if(!resultsLog.startsWith(path.join(root,'artifacts')+path.sep)||!/^[a-f0-9]{64}$/.test(row.resultsLogSha256||'')||await hashFile(resultsLog)!==row.resultsLogSha256)throw Error(`Resume structured results changed or missing: ${row.file}`);
    const actual=parseTestResults(await readFile(resultsLog,'utf8'));
    if(classifyTestOutcome(row,actual)!==row.status||actual.passed!==row.passed||actual.failed!==row.failed||actual.skipped!==row.skipped)throw Error(`Resume status/counts disagree with actual reporter events: ${row.file}`);
    rows.set(row.file,{...row,reused:true});
  }
  return rows;
}
export function testTierStatus(tests,tier='full') {
  const rows=tests.filter(row=>tier==='full'||row.tier==='core');
  if(rows.some(row=>!STATUSES.includes(row.status)))return 'FAIL';
  if(rows.some(row=>row.status==='FAIL'))return 'FAIL';
  if(rows.some(row=>row.status==='ENVIRONMENT BLOCKED'))return 'ENVIRONMENT BLOCKED';
  if(!rows.length||rows.some(row=>row.status==='NOT RUN'))return 'NOT RUN';
  return 'PASS';
}
