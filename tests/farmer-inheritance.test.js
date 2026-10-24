import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { completeLineageHistory, killNamedPerson } from '../dist/js/lineage.js';
import { farmView } from '../dist/js/farmer.js';
import { seasonOf } from '../dist/js/living-world.js';

const clone = s => structuredClone(s);
let parentCache;
function pick(s) {
  const preferred = { farm_ambition: 'keep', hard_winter: 'endure', debt_reckoning: 'plead', farm_due: 'pay', farm_reckoning: 'pay', farm_harvest: 'store' }[s.event.id];
  const offered = s.event.choices.filter(c => !c.disabledReason);
  return (offered.find(c => c.id === preferred) || offered.find(c => ['continue', 'endure', 'rest', 'care', 'present', 'plead', 'private', 'wait', 'refuse'].includes(c.id)) || offered[0])?.id;
}
function settle(s) {
  for (let n = 0; s.event && n < 60; n++) {
    s = engine.chooseEventOption(s, pick(s));
    assert.ok(engine.validateSave(s), 'answering the family life preserves its save');
  }
  assert.equal(s.event, null);
  return s;
}
function parent() {
  if (!parentCache) {
    const seed = 'farm-inherited-life';
    let s = engine.createBirthGame({ seed, difficulty: 'gentle', station: rollBirthCircumstances(seed, 'common', 'human'), appearance: { ancestry: 'human' } });
    for (let n = 0; n < 1500 && (s.age < 18 || s.event || s.timeline.yearTarget !== null); n++) {
      // Dues in this fixture are affordable; growing up is not the failure under test.
      if (s.age >= 16) s.hero.gold = Math.max(s.hero.gold, 200);
      s = s.event ? engine.chooseEventOption(s, pick(s)) : s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.ageUp(s);
    }
    assert.equal(s.age, 18);
    assert.notEqual(s.phase, 'retired');
    assert.ok(engine.validateSave(s));
    parentCache = s;
  }
  return clone(parentCache);
}
function child(s) {
  s.life.home.tier = 'cottage';
  s.life.health = Math.max(s.life.health, 60);
  s.hero.gold = Math.max(s.hero.gold, 200);
  const a = engine.getActions(s).find(a => a.id === 'life_family');
  assert.ok(a && !a.disabledReason, `a child may be welcomed: ${a?.disabledReason || 'absent'}`);
  s = engine.chooseAction(s, a.id);
  assert.equal(s.event?.id, 'life_family_start');
  s = engine.chooseEventOption(s, 'adopt');
  s = settle(s);
  const c = s.life.children.at(-1);
  assert.ok(c, 'the public family command introduces an actual child');
  assert.ok(s.lineage.people.some(p => p.source === 'child' && p.localId === c.id && p.development));
  assert.ok(engine.validateSave(s));
  return { s, childId: c.id };
}
function close(s) {
  s.phase = 'retired'; s.event = null; s.battle = null;
  s.chronicle = `${s.hero.name}'s chapter closes.`;
  completeLineageHistory(s, 'retirement');
  assert.ok(engine.validateSave(s), 'the parent has a readable closed chapter');
  return s;
}
function actualPerson(s, ref) {
  return ref?.source === 'life' ? s.life.people.find(p => p.id === ref.id)
    : ref?.source === 'lineage' ? s.lineage.people.find(p => p.id === ref.id)
    : [...(s.society?.people || []), ...(s.society?.archive || [])].find(p => p.id === ref?.id);
}
function act(s, id) {
  const a = engine.getActions(s).find(a => a.id === id && !a.disabledReason);
  assert.ok(a, `${id} is available`);
  const next = engine.chooseAction(s, id);
  assert.ok(engine.validateSave(next));
  return next;
}
function scene(s, wanted) {
  for (let n = 0; n < 800 && s.event?.id !== wanted; n++) {
    s = s.event ? engine.chooseEventOption(s, pick(s)) : s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.liveSeason(s);
    assert.ok(engine.validateSave(s), `the road to ${wanted} preserves the family`);
  }
  assert.equal(s.event?.id, wanted);
  return s;
}

test('the real child inherits the same field and its book, without inheriting the parent’s private ambition or marriage', () => {
  const prepared = child(parent()), s = close(prepared.s), before = clone(s);
  const next = engine.continueAsChild(s, prepared.childId);
  assert.deepEqual(s, before, 'succession never rewrites the closed parent');
  assert.equal(next.dynasty.generation, s.dynasty.generation + 1);
  assert.ok(engine.validateSave(next));
  assert.equal(next.day, s.day, 'the world does not restart for an heir');
  assert.ok(next.farm, 'the heir has the actual inherited livelihood');
  assert.equal(next.farm.homeId, s.farm.homeId);
  assert.equal(next.farm.field.status, s.farm.field.status);
  assert.equal(next.farm.field.strips, s.farm.field.strips);
  assert.equal(next.farm.field.grain, s.farm.field.grain);
  assert.equal(next.farm.ambition, null, 'a family saying is not an ambition silently chosen for the child');
  assert.equal(next.farm.plan, null, 'a parent’s private scheme is not the child’s new commitment');
  assert.equal(next.life.partnerId, null);
  assert.equal(next.farm.people.spouse, null);
  assert.ok(next.farm.inheritance, 'the field opens with its real family history');
  assert.match(JSON.stringify(next.farm.inheritance), new RegExp(s.hero.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(farmView(next), 'the opening can be read even before the heir is old enough to work');
  const restored = engine.migrateSave(JSON.parse(JSON.stringify(next)));
  assert.ok(restored && engine.validateSave(restored));
  assert.deepEqual(restored.farm, next.farm);
});

test('a new heir of a pre-farmer life is not handed a retroactive family field', () => {
  const prepared = child(parent());
  delete prepared.s.farm;
  prepared.s.edition.began = '0.70.0';
  const s = close(prepared.s), next = engine.continueAsChild(s, prepared.childId);
  assert.equal(next.dynasty.generation, s.dynasty.generation + 1);
  assert.ok(engine.validateSave(next));
  assert.equal(next.farm, undefined, 'birth initialization must not invent a parent’s land on succession');
});

test('a child who died before sixteen is not erased when the parent’s ambition is judged', () => {
  const first = child(parent()), second = child(first.s);
  let s = second.s;
  const survivor = s.life.children.find(c => c.id === first.childId);
  const record = s.lineage.people.find(p => p.source === 'child' && p.localId === survivor.id);
  // A surviving sixteen-year-old beside a younger child is the controlled family precondition.
  survivor.age = 16; survivor.bornDay = s.day - 16 * 365;
  record.bornDay = survivor.bornDay;
  const younger = s.life.children.find(c => c.id === second.childId);
  younger.age = 1; younger.bornDay = s.day - 365;
  s.lineage.people.find(p => p.source === 'child' && p.localId === younger.id).bornDay = younger.bornDay;
  s.farm.ambition = { id: 'farm_fed', chosenDay: s.day, fulfilledDay: null, turns: [] };
  s.farm.wintersFed = 1;
  assert.equal(killNamedPerson(s, second.childId, 'A childhood fever.', {
    journal(title, text, tag) { s.journal.push({ id: `farm-child-death-${s.journal.length}`, day: s.day, age: s.age, generation: s.dynasty.generation, title, text, tag }); },
  }), true);
  assert.ok(engine.validateSave(s), 'the dead child remains in the real family record');
  s = engine.chooseAction(s, 'life_rest');
  assert.ok(engine.validateSave(s));
  assert.equal(s.farm.ambition.fulfilledDay, null, 'a surviving sibling cannot erase the child who never reached sixteen');
  assert.notEqual(s.flags.farm_fed, true);
  assert.ok(s.life.children.some(c => c.id === second.childId && c.alive === false));
});

test('the heir receives a real neighbour debt and boundary feud; losing the field cannot be undone by a fresh birth', () => {
  const first = child(parent()), second = child(first.s);
  let s = act(second.s, 'farm_plan');
  assert.equal(s.event?.id, 'farm_boundary');
  s = engine.chooseEventOption(s, 'night');
  assert.ok(s.farm.plan.discovered, 'this deterministic life includes a witnessed lantern');
  const dueSeason = s.farm.plan.dueSeason;
  s = scene(s, 'farm_boundary_turn');
  assert.ok(seasonOf(s.day) >= dueSeason, 'the witness returns in a later season');
  s = settle(engine.chooseEventOption(s, 'deny'));
  const neighbourName = s.farm.people.neighbour.name;
  assert.ok(s.farm.people.neighbour.opinion < -10);
  s.hero.gold = 0;
  s = scene(s, 'farm_due');
  s = engine.chooseEventOption(s, 'plead');
  s = scene(s, 'farm_reckoning');
  const loan = s.farm.threads.find(t => t.def === 'reckoning' && !t.closed).data.amount;
  const helped = close(settle(engine.chooseEventOption(clone(s), 'neighbour')));
  const parentNeighbour = actualPerson(helped, helped.farm.people.neighbour);
  assert.ok(parentNeighbour, 'the parent’s quarrel names someone in the world');
  const heir = engine.continueAsChild(helped, first.childId);
  assert.equal(heir.dynasty.generation, helped.dynasty.generation + 1);
  assert.ok(engine.validateSave(heir));
  assert.equal(heir.farm.neighbourDebt, loan);
  assert.equal(heir.farm.inheritance.debt, loan);
  assert.ok(heir.farm.inheritance.feud.includes(neighbourName));
  const inheritedNeighbour = heir.farm.people.neighbour;
  assert.ok(inheritedNeighbour, 'the inherited feud remains with a particular person');
  const samePerson = actualPerson(heir, inheritedNeighbour);
  assert.ok(samePerson, 'the inherited neighbour reference resolves in the changed world');
  assert.equal(samePerson.name, parentNeighbour.name, 'the heir’s peer slot cannot rename the old neighbour');
  assert.equal(samePerson.bornDay, parentNeighbour.bornDay, 'the old neighbour is not reborn alongside the heir');
  assert.equal(inheritedNeighbour.name, samePerson.name);
  assert.ok(inheritedNeighbour.opinion < 0, 'the parent’s quarrel still colours this neighbour’s opinion');
  assert.ok(farmView(heir).chapters.some(c => c.paragraphs.some(p => p.includes(neighbourName))));
  const lost = close(settle(engine.chooseEventOption(clone(s), 'continue')));
  const landlessHeir = engine.continueAsChild(lost, first.childId);
  assert.equal(landlessHeir.dynasty.generation, lost.dynasty.generation + 1);
  assert.ok(engine.validateSave(landlessHeir));
  assert.equal(landlessHeir.farm.field.status, 'lost');
  assert.equal(landlessHeir.farm.inheritance.field, 'lost');
  assert.equal(landlessHeir.farm.field.grain, 0);
});

test('a deferred due passes its principal and arrears to the heir, in both the opening and the next reckoning', () => {
  const prepared = child(parent());
  let s = prepared.s;
  // This fixture isolates a working-age heir without another sixteen-year simulation.
  const c = s.life.children.find(c => c.id === prepared.childId);
  c.age = 16; c.bornDay = s.day - 16 * 365;
  s.lineage.people.find(p => p.source === 'child' && p.localId === c.id).bornDay = c.bornDay;
  s.hero.gold = 0;
  s = scene(s, 'farm_due');
  s = settle(engine.chooseEventOption(s, 'plead'));
  assert.ok(s.farm.due.deferredUntil > seasonOf(s.day), 'the parent has not yet faced the reckoning');
  assert.ok(s.farm.due.arrears > 0);
  const principal = s.farm.due.amount, arrears = s.farm.due.arrears;
  const total = principal + arrears + s.farm.neighbourDebt;
  const closed = close(s);
  let heir = engine.continueAsChild(closed, prepared.childId);
  assert.equal(heir.dynasty.generation, closed.dynasty.generation + 1);
  assert.ok(engine.validateSave(heir));
  assert.equal(heir.farm.due.amount, principal);
  assert.equal(heir.farm.due.arrears, arrears);
  assert.equal(heir.farm.inheritance.debt, total, 'the opening cannot omit the unpaid principal');
  assert.equal(farmView(heir).inheritance.debt, total, 'the Book and debt ledger agree');
  heir.hero.gold = total + 30;
  heir = scene(heir, 'farm_reckoning');
  const pay = heir.event.choices.find(c => c.id === 'pay');
  assert.equal(pay.cost, principal + arrears, 'the creditor still asks for the whole deferred due');
  const gold = heir.hero.gold;
  heir = engine.chooseEventOption(heir, 'pay');
  assert.ok(engine.validateSave(heir));
  assert.equal(heir.hero.gold, gold - principal - arrears);
  assert.equal(heir.farm.due.arrears, 0);
});

test('inherited loans stay with the actual living or dead lender when the heir reuses local peer IDs', () => {
  for (const dead of [false, true]) {
    const prepared = child(parent());
    let s = prepared.s;
    const lender = s.life.people.find(p => p.id === 'rival');
    assert.ok(lender);
    if (dead) {
      assert.equal(killNamedPerson(s, lender.id, 'A winter fever.', { journal(title, text, tag) { s.journal.push({ id: `farm-creditor-death-${s.journal.length}`, day: s.day, age: s.age, generation: s.dynasty.generation, title, text, tag }); } }), true);
      s = settle(engine.chooseAction(s, 'life_rest'));
    }
    const before = s.life.people.find(p => p.id === lender.id);
    const record = s.lineage.people.find(p => p.source === 'life' && p.localId === before.id && p.name === before.name);
    // A captured loan from a particular household isolates inherited identity.
    s.farm.loans = [{ source: 'life', id: before.id, name: before.name, amount: 8 }];
    s.farm.creditor = { source: 'life', id: before.id, name: before.name };
    s.farm.neighbourDebt = 8;
    s = close(s);
    const next = engine.continueAsChild(s, prepared.childId), loan = next.farm.loans[0];
    assert.ok(engine.validateSave(next));
    assert.notEqual(next.life.people.find(p => p.id === 'rival').name, before.name, 'the heir has a different peer');
    const actual = actualPerson(next, loan);
    assert.ok(actual, 'the lender remains a recorded person');
    assert.equal(actual.name, before.name);
    assert.equal(actual.bornDay, record.bornDay);
    assert.equal(actual.alive !== false, !dead, 'succession cannot revive or kill the lender');
    assert.equal(loan.amount, 8);
    assert.deepEqual(next.farm.creditor, { source: loan.source, id: loan.id, name: loan.name });
    assert.equal(next.farm.neighbourDebt, 8);
    assert.deepEqual(engine.migrateSave(clone(next)).farm.loans, next.farm.loans);
    const forged = clone(next); forged.farm.loans[0].name = 'Another household';
    assert.equal(engine.validateSave(forged), false, 'a reused reference cannot rename the creditor');
  }
});

test('an inherited relative loan uses the already-recorded person when they are absent from the heir’s household', () => {
  const prepared = child(parent());
  let s = prepared.s;
  const lender = s.life.people.find(p => p.id === 'kin');
  const record = s.lineage.people.find(p => p.source === 'life' && p.localId === lender.id && p.name === lender.name);
  s.farm.loans = [{ source: 'life', id: lender.id, name: lender.name, amount: 5 }];
  s.farm.creditor = { source: 'life', id: lender.id, name: lender.name };
  s.farm.neighbourDebt = 5;
  s = close(s);
  const next = engine.continueAsChild(s, prepared.childId), loan = next.farm.loans[0];
  assert.ok(engine.validateSave(next));
  assert.equal(loan.source, 'lineage');
  assert.equal(loan.id, record.id);
  assert.equal(actualPerson(next, loan).name, lender.name);
  assert.equal(actualPerson(next, loan).alive, record.alive);
  assert.equal(next.life.people.some(p => p.name === lender.name), false, 'succession does not fabricate a present relative');
  assert.equal(next.farm.neighbourDebt, 5);
});



