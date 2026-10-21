// Balance harness: play many seeded lives with simple policies and report the
// measures the Design Bible sets targets for. Usage:
//   node scripts/balance/run-lives.mjs [--lives 24] [--start 18] [--years 60] [--policy passive,worker] [--json out.json]
// Policies: passive (Age up, first choice), worker (work every shift, first
// choice), striver (work, train, occasionally travel). The harness never
// changes the game; it only drives the public engine commands.
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import * as engine from '../../dist/js/engine.js';
import { createLifeAtAge } from '../../dist/js/new-life.js';
import { isSettlement } from '../../dist/js/world.js';

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const LIVES = Number(arg('lives', 24)), START = Number(arg('start', 18)), YEARS = Number(arg('years', 60));
const POLICIES = String(arg('policy', 'passive,worker')).split(',');
const JSON_OUT = arg('json', null);

const alive = s => s.phase !== 'retired' && s.hero.alive !== false;
function resolveEvents(s, max = 60) { for (let n = 0; s.event && n < max; n++) s = engine.chooseEventOption(s, s.event.choices[0].id); return s; }
function finishYear(s) {
  const age = s.age;
  for (let guard = 0; guard < 80 && alive(s) && s.age === age; guard++) {
    s = resolveEvents(s);
    if (!alive(s) || s.age !== age) break;
    const next = engine.ageUp(s);
    if (next.day === s.day && !next.event && next.age === s.age) { s = next; break; } // stuck: a waiting state we do not resolve
    s = next;
  }
  return resolveEvents(s);
}
function act(s, predicate) {
  const a = engine.getActions(s).find(x => !x.disabled && !x.disabledReason && predicate(x));
  return a ? engine.chooseAction(s, a.id) : null;
}
// A worker lives in a town and goes to its work yard; the generated start is
// often a wilderness site, so the first year begins with the walk there.
function goToWork(s) {
  if (!isSettlement(s.world, s.locationId)) {
    const towns = s.world.locations.filter(p => isSettlement(s.world, p.id)).map(p => ({ id: p.id, prev: engine.exploreTravelPreview(s, p.id) })).filter(t => t.prev && !t.prev.disabledReason).sort((a, b) => (a.prev.days || 99) - (b.prev.days || 99));
    if (!towns.length) return s;
    s = engine.startExploreJourney(s, towns[0].id);
    for (let guard = 0; guard < 200 && s.timeline?.journey && alive(s); guard++) s = s.event ? engine.chooseEventOption(s, s.event.choices[0].id) : engine.continueExploreJourney(s);
    s = resolveEvents(s);
  }
  if (engine.getActions(s).some(a => a.id === 'atlas_room_workyard' && !a.disabledReason)) s = engine.chooseAction(s, 'atlas_room_workyard');
  return s;
}
const policies = {
  passive: s => s,
  worker: s => { s = goToWork(s); for (let n = 0; n < 40 && alive(s); n++) { const next = act(s, a => a.id === 'career_work'); if (!next || next.day === s.day) break; s = resolveEvents(next); } return s; },
  striver: s => {
    s = goToWork(s);
    for (let n = 0; n < 30 && alive(s); n++) { const next = act(s, a => a.id === 'career_work'); if (!next || next.day === s.day) break; s = resolveEvents(next); }
    for (let n = 0; n < 4 && alive(s); n++) { const next = act(s, a => /^career_practice|^training_|^calling_practice/.test(a.id)); if (!next || next.day === s.day) break; s = resolveEvents(next); }
    return s;
  },
};

function measure(s, start, log) {
  const b = s.householdBudget || {};
  return {
    seed: s.seed, alive: alive(s), age: s.age, deathCause: s.health?.deathCause || (alive(s) ? null : 'other'),
    gold: s.hero.gold, debt: s.hero.debt || 0, joy: s.life?.happiness, stress: s.life?.stress, bodily: s.life?.health, hp: s.hero.hp, maxHp: s.hero.maxHp,
    supportedGold: b.supportedGold || 0, billedGold: b.billedGold || 0, conditions: (s.health?.physical?.length || 0) + (s.health?.mental?.length || 0),
    profession: s.hero.profession, wentIntoDebt: log.debt, worstStress: log.worstStress, minGold: log.minGold, yearsPlayed: s.age - start,
  };
}

const results = {};
for (const policy of POLICIES) {
  const rows = [];
  const t0 = performance.now();
  for (let i = 0; i < LIVES; i++) {
    const seed = `balance-${policy}-${i}`;
    let s = await createLifeAtAge({ seed, startAge: START });
    s = resolveEvents(s);
    const log = { debt: false, worstStress: 0, minGold: s.hero.gold };
    for (let y = 0; y < YEARS && alive(s); y++) {
      s = policies[policy](s);
      s = finishYear(s);
      log.worstStress = Math.max(log.worstStress, s.life?.stress ?? 0);
      log.minGold = Math.min(log.minGold, s.hero.gold);
      if ((s.hero.debt || 0) > 0 || (s.householdBudget?.supportedGold || 0) > 0) log.debt = true;
    }
    rows.push(measure(s, START, log));
  }
  const n = rows.length, med = (k) => { const v = rows.map(r => r[k]).filter(x => Number.isFinite(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const pct = f => Math.round(100 * rows.filter(f).length / n);
  const dead = rows.filter(r => !r.alive);
  results[policy] = {
    lives: n, seconds: Math.round((performance.now() - t0) / 1000),
    diedPct: pct(r => !r.alive), medianDeathAge: dead.length ? dead.map(r => r.age).sort((a, b) => a - b)[Math.floor(dead.length / 2)] : null,
    medianGold: med('gold'), medianMinGold: med('minGold'), everShortPct: pct(r => r.wentIntoDebt),
    medianJoy: med('joy'), medianStress: med('stress'), medianWorstStress: med('worstStress'), medianBodily: med('bodily'),
    conditionsAtEndPct: pct(r => r.conditions > 0), causes: Object.fromEntries(Object.entries(dead.reduce((m, r) => (m[r.deathCause] = (m[r.deathCause] || 0) + 1, m), {}))),
    rows,
  };
  const r = results[policy];
  console.log(`\n== ${policy}: ${n} lives from ${START} for up to ${YEARS} years (${r.seconds}s)`);
  console.log(`died ${r.diedPct}% (median age at death ${r.medianDeathAge ?? '-'}) · causes ${JSON.stringify(r.causes)}`);
  console.log(`gold median ${r.medianGold} · lowest point median ${r.medianMinGold} · ever short of money ${r.everShortPct}%`);
  console.log(`joy ${r.medianJoy} · stress ${r.medianStress} (worst ${r.medianWorstStress}) · bodily ${r.medianBodily} · with a condition at end ${r.conditionsAtEndPct}%`);
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
