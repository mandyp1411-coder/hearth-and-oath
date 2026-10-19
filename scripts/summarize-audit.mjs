import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),output=args.find(a=>a.startsWith('--output='))?.slice(9)||'docs/audit-v13.json';
const files=args.filter(a=>!a.startsWith('--output='));
assert.ok(files.length,'Pass the completed audit JSON files to combine.');
const batches=files.map(file=>JSON.parse(readFileSync(file,'utf8')));
for(const batch of batches){
  assert.equal(batch.summary.completed,batch.summary.requested,'every selected batch must be finished');
  assert.equal(batch.summary.failed,0,'failed journeys must be fixed before reporting');
}
const reports=batches.flatMap(b=>b.reports).sort((a,b)=>a.index-b.index),coverage={};
for(const r of reports){r.focus ||= 'livelihood';r.lifestyle ||= 'frugal';}
for(const batch of batches)for(const [category,counts] of Object.entries(batch.coverage)){
  coverage[category] ||= {};
  for(const [key,count] of Object.entries(counts))coverage[category][key]=(coverage[category][key]||0)+count;
}
const sum=key=>batches.reduce((n,b)=>n+(b.summary[key]||0),0);
const summary={requested:sum('requested'),completed:reports.length,passed:reports.filter(r=>r.status==='passed').length,failed:reports.filter(r=>r.status==='failed').length,
  uniqueSeeds:new Set(reports.map(r=>r.seed)).size,uniqueFinishedLives:new Set(reports.map(r=>r.lifeHash)).size,uniqueDecisionTraces:new Set(reports.map(r=>r.decisionTraceHash)).size,
  transitions:sum('transitions'),reloads:sum('reloads'),portraitChecks:sum('portraitChecks'),immutableChecks:sum('immutableChecks'),heirs:sum('heirs'),retirement:sum('retirement'),deaths:sum('deaths'),
  children:reports.reduce((n,r)=>n+r.children,0),birthplaces:new Set(reports.map(r=>r.config.birthplace)).size,ancestries:new Set(reports.map(r=>r.config.appearance.ancestry)).size,
  professions:new Set(reports.map(r=>r.profession)).size,worldTopologies:new Set(reports.map(r=>r.topologyHash)).size};
assert.equal(summary.uniqueSeeds,summary.completed);assert.equal(summary.uniqueFinishedLives,summary.completed);assert.equal(summary.uniqueDecisionTraces,summary.completed);
const result={edition:batches[0].edition,started:batches.map(b=>b.started).sort()[0],finished:batches.map(b=>b.finished).sort().at(-1),
  method:'Automated public-engine birth-to-retirement lives using offered actions, varied beginnings and household priorities. No direct save/stat edits. Browser sessions and audio listening are outside this audit; campaign paths are recorded separately in the companion story audit.',
  summary,coverage,reports};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
