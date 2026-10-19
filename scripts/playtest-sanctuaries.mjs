import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LifeRun, engine, ordinaryChoice } from './playtest-utils.mjs';

// Real public-engine journeys: no age, money, evidence or relationship grants.
const results = [], records = [];
function policy(mode) {
  let fled = false;
  return (event, state) => {
    const has = id => event.choices.some(c => c.id === id);
    if (event.id === 'sanctuary_case_accusation') { if (mode === 'flight' && !fled) { fled = true; return 'escape'; } return 'cooperate'; }
    if (event.id === 'sanctuary_case_hearing' || event.id === 'sanctuary_case_capture') return mode === 'paid' && has('pay') && state.hero.gold >= state.legal.evidence * 12 ? 'pay' : 'service';
    if (event.id === 'sanctuary_case_aftercare') return 'account';
    if (event.id === 'sanctuary_donor_terms') return has('agree') ? 'agree' : 'private';
    if (event.id === 'sanctuary_pack_terms') return 'agree';
    if (event.id === 'life_hunger') return has('agreement') ? 'agreement' : 'animal';
    if (event.id === 'lycan_fullmoon') return has('safe') ? 'safe' : 'isolate';
    const fixed = { health_concern: 'rest', retirement: 'settle', vampire_offer: 'accept', lycan_offer: 'accept', vampire_feeding: 'animal', family_visit: 'time', travel_bandits: 'avoid', travel_beasts: 'avoid', travel_weather: 'shelter', travel_caravan: 'share', travel_witness: 'listen', travel_sick_traveler: 'aid', travel_lore: 'record', travel_delay: 'continue', annual_deadline_review: 'continue', calling_initiation: 'wait' };
    if (fixed[event.id] && has(fixed[event.id])) return fixed[event.id];
    const ordinary = ordinaryChoice(event); if (ordinary) return ordinary;
    return ['listen', 'respect', 'keep', 'private', 'pause', 'later', 'decline', 'quiet', 'wait', 'care', 'curiosity', 'people', 'help', 'talk', 'continue'].find(has) || event.choices[0]?.id;
  };
}
function clearCommitment(run) {
  for (let i = 0; i < 200; i++) {
    run.settle();
    if (!run.state.sanctuaries.commitment) return;
    run.act('sanctuary_continue');
  }
  throw Error('An actual sanctuary commitment failed to finish.');
}
function act(run, id) { run.act(id).settle(); clearCommitment(run); }
function finish(run, details) {
  run.settle();
  if (run.state.timeline.yearTarget !== null) run.grow(run.state.age + 1);
  run.retire();
  results.push({ id: run.id, ...details, age: run.state.age, day: run.state.day, operations: run.log.length, terminal: run.state.phase, legalHistory: run.state.sanctuaries.history.filter(h => h.result.startsWith('legal')), agreements: run.state.sanctuaries.agreements, plans: run.state.sanctuaries.plans });
  records.push({ id: run.id, config: run.config, log: run.log });
}

for (const mode of ['service', 'paid', 'flight']) {
  const run = new LifeRun(`v8-local-law-${mode}`, { name: `Merren ${mode}`, seed: `v8-hearing-${mode}`, birthplace: 'city', household: 'noble', familySetup: 'two_parents' }, policy(mode));
  run.grow(18).move('city');
  for (let attempts = 0; attempts < 40 && !run.state.sanctuaries.cases.length; attempts++) act(run, 'lift_purse');
  assert.ok(run.state.sanctuaries.cases.length, 'a genuine merchant witness must create the case');
  if (mode === 'flight' && run.state.sanctuaries.cases.some(c => c.status === 'fugitive')) {
    for (let i = 0; i < 4; i++) act(run, 'camp_rest');
  }
  assert.ok(run.state.sanctuaries.cases.every(c => c.status === 'resolved'), 'the actual local account must close through played consequences');
  if (mode === 'flight') assert.ok(run.state.sanctuaries.history.some(h => h.result === 'legal_captured'), 'flight must actually lead to a playable local detention');
  finish(run, { route: mode, actualCaptured: run.state.sanctuaries.history.some(h => h.result === 'legal_captured') });
}

{
  const run = new LifeRun('v8-named-donor', { name: 'Elwen Dusk', seed: 'v8-remembered-donor', birthplace: 'city', household: 'noble', familySetup: 'two_parents' }, policy('donor'));
  run.grow(18).move('city'); act(run, 'vampire_invitation');
  for (const candidate of engine.getActions(run.state).filter(a => a.id.startsWith('sanctuary_donor_') && !a.disabledReason)) {
    act(run, candidate.id); if (run.state.sanctuaries.agreements.length) break;
  }
  assert.equal(run.state.sanctuaries.agreements.length, 1, 'an actual consenting local contact must accept');
  const donorId = run.state.sanctuaries.agreements[0].id;
  const before = run.state.day;
  act(run, `sanctuary_feed_${donorId}`);
  assert.equal(run.state.day - before, 1, 'a saved agreement session attends a real day');
  assert.equal(run.state.sanctuaries.agreements[0].sessions, 1);
  assert.ok(engine.getActions(run.state).find(a => a.id === `sanctuary_feed_${donorId}`).disabledReason, 'the actual fourteen-day boundary must prevent immediate reuse');
  for (let i = 0; i < 7; i++) act(run, 'camp_rest');
  act(run, `sanctuary_feed_${donorId}`);
  assert.equal(run.state.sanctuaries.agreements[0].sessions, 2);
  act(run, `sanctuary_end_${donorId}`);
  assert.equal(run.state.sanctuaries.agreements[0].status, 'ended');
  finish(run, { route: 'private named donor, two real sessions and voluntary ending', contact: run.state.sanctuaries.agreements[0].contactName });
}

{
  const run = new LifeRun('v8-moon-household', { name: 'Bram Moonwatch', seed: 'v8-situated-refuge', birthplace: 'village', household: 'noble', familySetup: 'two_parents' }, policy('moon'));
  run.grow(18);
  for (const id of ['workshop_gather_wood', 'workshop_gather_wood', 'workshop_gather_stone', 'workshop_gather_cloth', 'workshop_build_shelter']) {
    act(run, id);
    for (let i = 0; i < 60 && run.state.workshop.project; i++) { run.settle(); run.act('workshop_continue'); }
  }
  run.move('forest'); act(run, 'lycan_invitation'); run.move('home');
  // Let an imminent full moon complete before arranging the next actual cycle.
  if (engine.getMoonForecast(run.state).daysUntil < 3) for (let i = 0; i < 3; i++) act(run, 'camp_rest');
  act(run, 'sanctuary_household');
  assert.equal(run.state.sanctuaries.plans.length, 1);
  const plan = run.state.sanctuaries.plans[0];
  assert.ok(plan.preparedMoon > run.state.day);
  const control = run.state.hero.condition.control;
  const circle = engine.getActions(run.state).find(a => a.id.startsWith('sanctuary_pack_') && !a.disabledReason);
  if (circle && plan.preparedMoon - run.state.day > 2) act(run, circle.id);
  assert.equal(run.state.hero.condition.control, control, 'another agreement for the same moon does not duplicate its lesson');
  for (let i = 0; i < 20 && run.state.hero.condition.lastFullMoon < plan.preparedMoon; i++) act(run, 'camp_rest');
  assert.equal(run.state.hero.condition.lastFullMoon, plan.preparedMoon);
  assert.ok(run.log.some(row => row.operation === 'choice:lycan_fullmoon:safe'), 'the real prepared transformation must be lived');
  finish(run, { route: 'built a real shelter, prepared a household plan and lived the safe full moon', preparedMoon: plan.preparedMoon });
}

mkdirSync('docs/playtest', { recursive: true }); mkdirSync('artifacts/playtest/v8', { recursive: true });
writeFileSync('docs/playtest/v8-sanctuaries.json', JSON.stringify({ distinctLives: results.length, operations: results.reduce((sum, r) => sum + r.operations, 0), lives: results }, null, 2) + '\n');
writeFileSync('artifacts/playtest/v8/sanctuary-actions.json', JSON.stringify(records) + '\n');
writeFileSync('docs/playtest/v8-sanctuary-actions.json.gz', gzipSync(JSON.stringify(records) + '\n'));
process.stdout.write(JSON.stringify({ distinctLives: results.length, operations: results.reduce((sum, r) => sum + r.operations, 0), routes: results.map(r => ({ id: r.id, route: r.route, age: r.age, terminal: r.terminal })) }, null, 2) + '\n');
