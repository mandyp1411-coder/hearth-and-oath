import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LifeRun, engine, ordinaryChoice, fingerprint } from './playtest-utils.mjs';
import { communityView, communitySupport, COMMUNITY_CATALOG } from '../dist/js/community.js';

// Reproducible real civilian lives: all resources and days come through public
// engine actions. Focused unit fixtures are kept separate from these records.
const profiles = [
  { id: 'community-founder', name: 'Tamsin Lowfire', seed: 'v8-civic-smith-4783', birthplace: 'village', household: 'poor', familySetup: 'homeless', profession: 'blacksmith', works: [['learning', 'open'], ['road', 'practice'], ['garden', 'practice']] },
  { id: 'community-caregiver', name: 'Neris Candle', seed: 'v8-civic-care-9029', birthplace: 'brook', household: 'tradesfolk', familySetup: 'single_parent', profession: 'healer', works: [['clinic', 'practice'], ['refuge', 'open'], ['garden', 'open']] },
];
let activeRun = null;
process.on('uncaughtException', error => {
  if (activeRun) writeFileSync(`artifacts/playtest/community/${activeRun.id}-failed.json`, JSON.stringify({ error: String(error), summary: activeRun.summary(), event: activeRun.state.event, state: activeRun.state, log: activeRun.log }, null, 2) + '\n');
  console.error(error); console.error(JSON.stringify({ currentEvent: activeRun?.state.event, last: activeRun?.log.slice(-5) })); process.exit(1);
});
let scope = 'open';
function policy(event) {
  if (event.id === 'health_concern') return event.category === 'Physical health' ? 'rest' : 'support';
  const explicit = { community_charter: scope, community_review: 'keep', community_beneficiary: 'listen', career_year: 'community', career_legacy: 'teach', career_staff: 'apprentice', career_invoice: 'honest', health_concern: 'support', lineage_school: 'public', lineage_childhood: 'curiosity', life_family_start: 'adopt', family_annual: 'care', calling_offer: 'wait', plague_letter: 'later', retirement: 'settle', life_budget: 'simplify' };
  const id = explicit[event.id] || ordinaryChoice(event);
  if (id && event.choices.some(choice => choice.id === id)) return id;
  if (event.id === 'lineage_adoption') return ['listen', 'offer', 'wait'].find(id => event.choices.some(choice => choice.id === id));
  return event.choices.find(choice => /listen|honest|rest|acknowledge|wait|decline|care|support|respect|space|explain|question/i.test(`${choice.label} ${choice.description}`))?.id || event.choices[0]?.id;
}
function completeCommitment(run) {
  for (let n = 0; n < 600; n++) {
    run.settle();
    const s = run.state;
    if (s.phase === 'retired') throw new Error(`${run.id}: natural death interrupted the stated civilian policy`);
    if (s.community?.project?.commitment) run.act('community_continue');
    else if (s.lineage?.adoption?.preparation) run.act('lineage_adoption_continue');
    else if (s.careers?.batch) run.act('career_batch_continue');
    else if (s.workshop?.project) run.act('workshop_continue');
    else if (s.timeline?.yearTarget !== null) run.step('continue-age-up', engine.continueAgeUp);
    else return;
  }
  throw new Error(`${run.id}: commitment did not finish`);
}
function liveYears(run, age) {
  for (let n = 0; n < 500 && run.state.age < age; n++) { completeCommitment(run); run.step('age-up', engine.ageUp); }
  completeCommitment(run); assert.ok(run.state.age >= age);
}
function earn(run, gold) {
  for (let n = 0; n < 16 && run.state.hero.gold < gold; n++) { completeCommitment(run); run.act('career_batch_year'); completeCommitment(run); }
  assert.ok(run.state.hero.gold >= gold, `${run.id}: work must actually pay for the chosen civic ambition`);
}
function gather(run, materials) {
  for (const [id, count] of Object.entries(materials)) {
    const site = id === 'ore' ? 'forest' : id === 'crystal' ? 'sanctuary' : id === 'hide' ? 'forest' : 'home';
    run.move(site);
    for (let n = 0; n < 100 && (run.state.equipment.materials[id] || 0) < count; n++) {
      completeCommitment(run);
      if (run.available(`workshop_gather_${id}`)) { run.act(`workshop_gather_${id}`); completeCommitment(run); }
      else { const rest = engine.getActions(run.state).find(action => action.id === 'health_routine'); if (rest?.disabledReason?.includes('birthday')) liveYears(run, run.state.age + 1); else run.act('health_routine'); completeCommitment(run); }
    }
    assert.ok(run.state.equipment.materials[id] >= count, `${run.id}: actual ${id} gathering`);
  }
}

mkdirSync('artifacts/playtest/community', { recursive: true });
const results = [];
for (const profile of profiles) {
  const run = new LifeRun(profile.id, profile, policy); activeRun = run;
  const originalAct = run.act.bind(run);
  run.act = id => { const quoted = engine.getActions(run.state).find(action => action.id === id); if (quoted?.disabledReason?.includes('birthday')) liveYears(run, run.state.age + 1); return originalAct(id); };
  liveYears(run, 18);
  run.move(profile.birthplace === 'brook' ? 'brook' : 'home'); run.act(`career_choose_${profile.profession}`); run.settle();
  earn(run, 18000);
  run.act('life_home_cottage'); run.settle();
  const choices = [], controls = [];
  for (const [kind, pickedScope] of profile.works) {
    const row = COMMUNITY_CATALOG.find(row => row.id === kind), required = {};
    for (const part of row.stages) for (const [id, count] of Object.entries(part.materials)) required[id] = (required[id] || 0) + count;
    gather(run, required); const site = kind === 'garden' ? 'brook' : kind === 'learning' ? 'city' : 'home'; run.move(site); scope = pickedScope;
    run.act(`community_begin_${kind}`); run.settle();
    for (let stage = 0; stage < 3; stage++) { run.act('community_stage'); completeCommitment(run); }
    const work = run.state.community.works.at(-1); choices.push({ id: work.id, kind, scope: work.scope, site: work.locationId, workedDays: work.workedDays, constructionGold: work.constructionGold, endowmentGold: work.contributedGold, protectedReserve: work.operatingBalance, operatingSpent: work.operatingSpent, beneficiaries: work.beneficiaries.map(person => ({ id: person.id, name: person.name, source: person.source })) });
    controls.push({ site, support: communitySupport(run.state), hash: fingerprint(run.state) });
  }
  assert.equal(new Set(run.state.community.works.map(work => work.kind)).size, 3);
  assert.ok(run.state.community.ambitionSteps.some(step => step.id === 3), 'the honest three-work/two-place network is recognized');
  // The endowment must expire through actual lived years before another funded
  // contribution restores its quoted service. No day or purse is patched.
  liveYears(run, run.state.age + 11);
  const first = run.state.community.works[0]; run.move(first.locationId);
  assert.equal(communityView(run.state).works.find(work => work.id === first.id).operating, false);
  const paid = run.state.hero.gold, contributed = first.contributedGold;
  earn(run, 1600); run.act(`community_fund_${first.id}`); run.settle();
  assert.equal(run.state.community.works.find(work => work.id === first.id).contributedGold, contributed + 1500);
  assert.ok(communityView(run.state).works.find(work => work.id === first.id).operating);
  liveYears(run, Math.max(40, run.state.age));
  if (profile.id === 'community-founder') {
    run.move(run.state.life.home.locationId || 'home');
    for (let n = 0; n < 20 && run.state.life.health < 50; n++) { run.act('health_clinic'); completeCommitment(run); }
    assert.ok(run.state.life.health >= 40, 'actual care makes room for another household responsibility');
    for (const age of [16, 12, 6]) { if (run.state.life.children.some(child => child.alive !== false)) break; run.act(`lineage_adoption_${age}`); completeCommitment(run); }
    assert.ok(run.state.life.children.some(child => child.alive !== false), 'an actual consenting child can carry the civic estate onward');
  }
  run.retire();
  const summary = run.save('artifacts/playtest/community');
  const result = { ...summary, works: choices, supportControls: controls, restoredFunding: { priorGold: paid, contributedGold: run.state.community.works[0].contributedGold }, institutionEvents: run.log.filter(entry => entry.event?.startsWith('community_')).map(entry => ({ event: entry.event, selected: entry.selected, day: entry.day, elapsed: entry.elapsed })), finalCommunity: communityView(run.state) };
  if (profile.id === 'community-founder') {
    const originalWorks = structuredClone(run.state.community.works), child = run.state.life.children.find(child => child.alive !== false);
    run.step('continue-actual-child', state => engine.continueAsChild(state, child.id));
    assert.equal(run.state.dynasty.generation, 2); assert.deepEqual(run.state.community.works, originalWorks);
    const inherited = communityView(run.state), heirAge = run.state.age;
    if (heirAge >= 14 && heirAge < 18) { run.move('city'); const action = engine.getActions(run.state).find(action => action.id === 'school_enroll_academy'); assert.ok(action && !action.disabledReason); assert.equal(action.cost, 12, 'the real inherited public endowment removes eight actual enrollment gold'); run.act('school_enroll_academy'); run.settle(); }
    writeFileSync(`artifacts/playtest/community/${profile.id}-successor.json`, JSON.stringify({ summary: run.summary(), log: run.log, state: run.state }, null, 2) + '\n');
    result.successor = { name: run.state.hero.name, startingAge: heirAge, age: run.state.age, generation: run.state.dynasty.generation, inheritedWorkIds: inherited.works.map(work => work.id), inheritedProtectedGold: inherited.works.reduce((sum, work) => sum + work.operatingBalance, 0), schoolRoute: run.state.education.route, stateHash: fingerprint(run.state) };
  }
  results.push(result);
}
mkdirSync('docs/playtest', { recursive: true });
writeFileSync('docs/playtest/community-v8.json', JSON.stringify({ version: 8, policy: 'Earn a classless civilian living, gather actual materials, build three distinct services in two real settlements, let the fund expire, choose a real contribution, and close the original life.', lives: results }, null, 2) + '\n');
console.log(JSON.stringify({ lives: results.map(result => ({ id: result.id, age: result.age, operations: result.operations, works: result.works.map(work => work.kind), communityEvents: result.institutionEvents.length, terminal: result.terminal })), complete: true }));
