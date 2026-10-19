import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { matrix, hash, validateRoot, validateEvidence, verifyFixtureTrace, validateReserves, validateCertificate, encounterCases, compareReports } from '../scripts/check-earned-balance.mjs';

// Synthetic harness/contract tests. These are NOT earned-life combat outcomes.
const root = index => JSON.parse(gunzipSync(readFileSync(`tests/fixtures/earned-balance/root-${index}.json.gz`)));
const fakeEngine = {validateSave: () => true, chooseAction(s) {const next=structuredClone(s);next.hero.hp=Math.min(next.hero.maxHp,next.hero.hp+1);return next;}};
const fixture = () => {const r=root(0);return {id:'support-low',root:0,evidenceClass:'action-earned',calling:'bard',state:r.state,stateHash:r.stateHash,rootHash:r.stateHash,trace:[]};};
const result = () => ({id:'support-low/solo/road_bandits/resource-aware-v1',inputHash:'same-input',outcome:'victory',actions:10,
  ending:[{id:'hero',hp:40,maxHp:60,mp:10,maxMp:30}],potionsOpening:2,potionsEnding:2});
const report = () => ({matrixHash:'matrix',fixtureSetHash:'fixtures',sourceRevision:'test',provenance:{rootChecksumsVerified:true,setupReplayed:['support-low']},
  scope:{encounters:1,expeditions:0,notRun:[]},results:[result()],expeditions:[]});

test('historical root checksums, seeds and action source remain anchored', () => {
  for(let index=0;index<3;index++)assert.equal(validateRoot(root(index),index),true);
  const changed=root(0);changed.state.hero.maxHp=500;assert.throws(()=>validateRoot(changed,0),/unchanged historical/);
});
test('a modified 500-HP routing fixture cannot masquerade as an earned snapshot', () => {
  const f=fixture(),r=root(0);f.state.hero.hp=f.state.hero.maxHp=500;f.stateHash=hash(f.state);
  assert.throws(()=>validateEvidence(f,fakeEngine,r),/trace ends/);
});
test('a fabricated public-action hash chain is rejected by actual replay semantics', () => {
  const f=fixture(),r=root(0);f.state.hero.hp=f.state.hero.maxHp=500;f.stateHash=hash(f.state);
  f.trace=[{method:'chooseAction',args:['rest'],beforeHash:r.stateHash,afterHash:f.stateHash,days:0}];
  assert.equal(validateEvidence(f,fakeEngine,r),true,'hash chain alone is deliberately not sufficient evidence');
  assert.throws(()=>verifyFixtureTrace(f,r,fakeEngine),/historical setup drift or unearned edit/);
});
test('synthetic evidence cannot receive an earned label', () => {
  const f=fixture();f.evidenceClass='synthetic-invariant';assert.throws(()=>validateEvidence(f,fakeEngine,root(0)));
});
test('approved matrix is finite and separates counterfactual sensitivity cases', () => {
  const fixtures=matrix.forms.flatMap(form=>matrix.stages.map(stage=>({id:form.id+'-'+stage,root:0,stage})));
  for(const level of matrix.targeted.earnedBoundaryLevels)fixtures.push({id:'weapon-boundary-'+level,root:0,stage:'boundary-'+level});
  for(const i of matrix.targeted.secondaryRoots)fixtures.push({id:'support-traits-'+i,root:i,stage:'low'});
  const cases=encounterCases(fixtures);
  assert.equal(cases.length,240);assert.equal(cases.filter(c=>c.sensitivity.startsWith('counterfactual')).length,12);
  assert.equal(matrix.bounds.expeditionMovements,120);assert.equal(matrix.bounds.expeditionCommands,300);
});
test('nonfinite, negative and overcap combat resources fail hard', () => {
  const b={actors:[{id:'hero',hp:10,maxHp:20,mp:2,maxMp:3}],potions:1};assert.doesNotThrow(()=>validateReserves(b));
  for(const value of [NaN,-1,21]){const bad=structuredClone(b);bad.actors[0].hp=value;assert.throws(()=>validateReserves(bad));}
});
test('comparison allows small intended movement without exact-output golden overfit', () => {
  const a=report(),b=report();b.results[0].actions=12;b.results[0].ending[0].hp=35;
  assert.equal(compareReports(a,b).status,'PASS');
});
test('outcome changes need a case-specific design explanation, not silent acceptance', () => {
  const a=report(),b=report();b.results[0].outcome='defeat';const id=b.results[0].id;
  assert.equal(compareReports(a,b).status,'REVIEW REQUIRED');
  assert.equal(compareReports(a,b,[{id,reason:'Intentional named-risk change reviewed with matched expedition resources.'}]).status,'PASS');
  assert.throws(()=>compareReports(a,b,[{id,reason:'ok'}]),/substantive design reason/);
});
test('different inputs, fixture sets and unfinished scopes cannot pass comparison', () => {
  for(const change of [b=>b.fixtureSetHash='different',b=>b.results[0].inputHash='different',b=>b.scope.notRun.push('expeditions')]){
    const a=report(),b=report();change(b);assert.throws(()=>compareReports(a,b));
  }
});


test('combat preparation rejects fixture edits even when a forged trace is rehashed', () => {
  const f=fixture();f.sourceCommit='historical-source';const data={fixtures:[f]};
  const certificate={fixtureSetHash:hash(data),matrixHash:hash(matrix),sourceRevision:'historical-source',replayed:[{id:f.id,stateHash:f.stateHash,traceHash:hash(f.trace)}],notRun:[]};
  assert.equal(validateCertificate(data,certificate),true);f.state.hero.hp=f.state.hero.maxHp=500;f.stateHash=hash(f.state);
  assert.throws(()=>validateCertificate(data,certificate),/historical public-replay certificate/);
});
