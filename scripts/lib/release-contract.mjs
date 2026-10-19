import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {treeFiles} from './release-identity.mjs';
export const STATUSES=Object.freeze(['PASS','FAIL','NOT RUN','ENVIRONMENT BLOCKED']);
export async function discoverContract(root,manifest) {
  if(manifest.schemaVersion!==1)throw Error('Unsupported release contract schema.');
  const files=(await treeFiles(root,'tests')).filter(file=>file.endsWith('.test.js'));
  const offline=(await treeFiles(root,'scripts')).filter(file=>/^scripts\/verify-offline[^/]*\.mjs$/.test(file));
  const missing=[...Object.keys(manifest.tests),...manifest.requiredOfflineChecks].filter(file=>!files.includes(file)&&!offline.includes(file));
  if(missing.length)throw Error(`Required regression checks disappeared: ${missing.join(', ')}`);
  const tests=[];
  for(const file of files) {
    const source=await readFile(path.join(root,file),'utf8'),categories=new Set(['unit-mechanics']);
    for(const [category,expression] of Object.entries(manifest.categoryRules))if(new RegExp(expression).test(source))categories.add(category);
    for(const category of manifest.tests[file]?.categories||[])categories.add(category);
    const entry=manifest.tests[file]||{},tier=entry.tier||'core';
    if(!['core','stress'].includes(tier)||tier==='stress'&&(typeof entry.reason!=='string'||!entry.reason.trim()||typeof entry.coreCoverage!=='string'||!entry.coreCoverage.trim()))throw Error(`Stress classification needs a reviewed reason and retained core coverage: ${file}`);
    tests.push({file,tier,categories:[...categories],newByConvention:!manifest.tests[file],knownDebt:manifest.tests[file]?.knownDebt||null});
  }
  return {tests,offline};
}
export function parseTestResults(text) {
  const results=[];
  for(const line of text.split('\n')) {
    if(!line.trim())continue;
    let row;try{row=JSON.parse(line);}catch{throw Error('Test reporter emitted a non-JSON line; result cannot be trusted.');}
    // Node synthesizes a passing file wrapper for an empty test file. It is not a test.
    if((row.type==='test:pass'||row.type==='test:fail')&&!(row.type==='test:pass'&&row.name===row.file))results.push(row);
  }
  return {passed:results.filter(r=>r.type==='test:pass'&&!r.skip&&!r.todo).length,failed:results.filter(r=>r.type==='test:fail'&&!r.signal).length,environmentBlocked:results.filter(r=>r.signal).length,skipped:results.filter(r=>r.skip||r.todo).length,failures:results.filter(r=>r.type==='test:fail'),results:results.length,cases:results.map(({name,durationMs,signal})=>({name,durationMs,signal}))};
}
export function aggregateStatus(checks) {
  if(checks.some(row=>!STATUSES.includes(row.status)))return 'FAIL';
  if(checks.some(row=>row.status==='FAIL'))return 'FAIL';
  if(checks.some(row=>row.status==='ENVIRONMENT BLOCKED'))return 'ENVIRONMENT BLOCKED';
  if(!checks.length||checks.some(row=>row.status==='NOT RUN'))return 'NOT RUN';
  return 'PASS';
}
export function classifyProcess(result) {
  if(result.error||result.signal)return 'ENVIRONMENT BLOCKED';
  return result.code===0?'PASS':'FAIL';
}

export function classifyTestOutcome(processResult,stats) {
  // A later environmental interruption must not hide an already observed
  // assertion failure. Retain both diagnostics, with FAIL taking priority.
  if(stats.failed)return 'FAIL';
  if(stats.environmentBlocked)return 'ENVIRONMENT BLOCKED';
  const status=classifyProcess(processResult);
  return status==='PASS'&&(!stats.results||stats.failed||stats.skipped)?'FAIL':status;
}
