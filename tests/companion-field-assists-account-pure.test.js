import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteMazeFieldAssist, applyMazeFieldAssist, validateMazeFieldAssists, validateMazeFieldAssistReceipt } from '../dist/js/companion-field-assists.js';
import { createExpeditionVisit, recordExpeditionFieldAssist, expeditionVisitTotals, finishExpeditionVisit, validateExpeditionReceipts } from '../dist/js/maze-receipts.js';
import { describeMazeFieldAssist, renderMazeFieldAssists, mazeFieldAssistReceiptText } from '../dist/js/companion-field-assists-ui.js';
const clone = value => structuredClone(value);
const rules = { validateFieldAssist: validateMazeFieldAssistReceipt };
const companion = (id, name, bornDay) => ({ id, name, bornDay, role: id === 'sable' ? 'healer' : 'rogue', alive: true, recruited: true, active: true, hp: 20, maxHp: 40, mp: 20, maxMp: 24, combatExperience: 0 });
const opts = { roomAt: (m, id) => ({ id, kind: m.testKind, variant: 2 }),
  runIdentity: m => ({ mazeId: m.id, runSeed: m.seed, runGeneration: m.generation, manifestVersion: 1, family: m.content.family, sourceId: m.sourceId, locationId: m.locationId }),
  actorId: s => s.dynasty.activePersonId, validActor: (s, id) => id === s.dynasty.activePersonId || s.dynasty.history.some(p => p.personId === id) };
function fresh(kind = 'scout') {
  const id = kind === 'healer' ? 'sable' : 'kest', helper = companion(id, 'Original ' + id, -8000);
  const s = { seed: 'field-account', revision: 5, day: 20, phase: 'adult', locationId: 'ruin', event: null, battle: null,
    hero: { name: 'First Traveler', hp: 30, maxHp: 60, mp: 8, maxMp: 30, gold: 10, potions: 2, skills: { survival: 5 }, attributes: { agility: 6 } },
    dynasty: { id: 'dyn', generation: 1, activePersonId: 'dyn-g1-hero-hero', history: [] },
    lineage: { people: [{ id: `dyn-g1-companion-${id}`, source: 'companion', localId: id, name: helper.name, bornDay: helper.bornDay }] },
    world: { locations: [{ id: 'ruin' }] }, companions: [helper], flags: { herbs: 2 }, rpg: { companionStages: { [id]: { status: 'available', stage: 0, choices: [], trainedTechniques: [] } } },
    maze: { version: 2, id: 'maze-1', seed: 'field-account:maze:1:authored:buried_archive:ruin:1', generation: 1, kind: 'authored', sourceId: 'buried_archive', locationId: 'ruin', content: { family: 'authored' },
      position: 7, previous: 0, visited: [0, 7], cleared: [0], collected: [], steps: 0, objective: false, proofBattleId: null, proofCaptured: false, tier: 2, startedDay: 18, pendingRoom: null, status: 'inside', testKind: kind === 'healer' ? 'empty' : 'trap' },
    mazeBook: { nextRun: 2, nextExpeditionVisit: 2, records: [], expeditionReceipts: [] } };
  s.maze.expeditionVisit = createExpeditionVisit(s, s.maze, 1, { coverage: 'observed' }); assert.ok(s.maze.expeditionVisit); return s;
}
function accept(s, kind = 'scout') {
  const q = applyMazeFieldAssist(s, kind, s.companions[0].id, 'hero', opts); assert.equal(q.disabledReason, null);
  s.maze.expeditionVisit = recordExpeditionFieldAssist(s.maze.expeditionVisit, s, s.maze, q.receipt, rules); return q;
}
function close(s) {
  const r = finishExpeditionVisit(s.maze.expeditionVisit, s, s.maze, 'stair', rules); assert.ok(r); delete s.maze.expeditionVisit;
  s.mazeBook.records.push(clone(s.maze)); s.mazeBook.expeditionReceipts.push(r); s.maze = null; return r;
}
function succeed(s) {
  const previous = s.dynasty.activePersonId; s.dynasty.history.push({ personId: previous, generation: 1, name: s.hero.name });
  s.dynasty.generation = 2; s.dynasty.activePersonId = 'dyn-g1-child-1'; s.hero.name = 'Second Traveler';
  s.lineage.people.forEach(p => p.source = 'ancestor');
  s.companions = [companion('kest', 'Entirely New Scout', -3000)];
  s.lineage.people.push({ id: 'dyn-g2-companion-kest', source: 'companion', localId: 'kest', name: s.companions[0].name, bornDay: s.companions[0].bornDay });
  s.rpg.companionStages = { kest: { status: 'available', stage: 0, choices: [], trainedTechniques: [] } };
}
test('accepted help records exact personal use once; old visit keys/counters stay unchanged until acceptance', () => {
  const s = fresh('healer'), before = clone(s.maze.expeditionVisit); assert.equal(Object.hasOwn(before, 'assists'), false);
  const q = accept(s, 'healer'), v = s.maze.expeditionVisit;
  assert.equal(v.assists.length, 1); assert.deepEqual(v.assists[0], q.receipt); assert.deepEqual(v.used, before.used); assert.deepEqual(v.days, before.days); assert.deepEqual(v.settlements, before.settlements);
  const totals = expeditionVisitTotals(v); assert.equal(totals.companionFocusUsed, 4); assert.equal(totals.costs.herbs, 1); assert.equal(totals.gains.herbs, 0); assert.equal(totals.gains.experience, 0);
  assert.equal(validateExpeditionReceipts(s, rules), true); assert.equal(validateExpeditionReceipts(s), false, 'new optional assistance needs the canonical injected validator, not a guessed effect model');
  assert.equal(recordExpeditionFieldAssist(v, s, s.maze, q.receipt, rules), v); assert.equal(expeditionVisitTotals(v).costs.herbs, 1);
  const returned = close(s); assert.equal(returned.assists.length, 1); assert.ok(validateExpeditionReceipts(s, rules));
});
test('closed accounting uses original person/name/generation after role IDs are regenerated and maps are evicted', () => {
  const s = fresh(); const q = accept(s), old = close(s), before = clone(old.assists[0]); succeed(s);
  assert.ok(validateExpeditionReceipts(s, rules)); assert.deepEqual(old.assists[0], before); assert.equal(old.assists[0].helperPerson.personId, 'dyn-g1-companion-kest');
  assert.match(mazeFieldAssistReceiptText(old.assists[0]), /Original kest/); assert.ok(!mazeFieldAssistReceiptText(old.assists[0]).includes('Entirely New Scout'));
  s.mazeBook.records = []; s.mazeBook.nextRun = 1; assert.ok(validateExpeditionReceipts(s, rules)); assert.ok(validateMazeFieldAssistReceipt(s, q.receipt));
  const bad = clone(s); bad.mazeBook.expeditionReceipts[0].assists[0].helperPerson.personId = 'dyn-g2-companion-kest'; assert.equal(validateExpeditionReceipts(bad, rules), false);
});
test('physical room slot survives succession, without ancestor technique or current-roster attribution', () => {
  const s = fresh(); s.hero.skills.survival = 3;
  const stage = s.rpg.companionStages.kest; stage.stage = 5; stage.trainedTechniques = ['watch_line']; stage.choices = Array.from({ length: 5 }, () => ({ id: 'care', day: 19 }));
  accept(s); const history = clone(s.maze.fieldAssists.entries[0]); close(s); succeed(s); s.maze = clone(s.mazeBook.records[0]);
  assert.ok(validateMazeFieldAssists(s, s.maze, opts)); assert.deepEqual(s.maze.fieldAssists.entries[0], history);
  const blocked = quoteMazeFieldAssist(s, 'scout', 'kest', 'hero', opts); assert.ok(blocked.disabledReason); assert.equal(s.companions[0].mp, 20);
  s.maze.position = 8; s.maze.visited.push(8); const noInheritedBonus = quoteMazeFieldAssist(s, 'scout', 'kest', 'hero', opts); assert.ok(noInheritedBonus.disabledReason, 'new role holder has only +2, not the ancestor helper’s +3');
  s.hero.skills.survival = 4; s.maze.expeditionVisit = createExpeditionVisit(s, s.maze, 2, { coverage: 'observed' }); s.mazeBook.nextExpeditionVisit = 3;
  const current = accept(s); assert.equal(current.mastery, null); assert.equal(current.bonus, 2); assert.equal(current.receipt.helperPerson.personId, 'dyn-g2-companion-kest'); assert.equal(current.receipt.helperPerson.name, 'Entirely New Scout'); assert.ok(validateMazeFieldAssists(s, s.maze, opts));
});
test('receipt accounting rejects wrong visit, ownership, missing records, duplicate rows and changed arithmetic', () => {
  const s = fresh(); accept(s);
  for (const change of [x => x.maze.expeditionVisit.assists[0].visitId = 'maze-visit-2', x => x.maze.expeditionVisit.assists[0].actorGeneration = 2,
    x => x.maze.expeditionVisit.assists[0].helperPerson.name = 'Entirely New Scout', x => x.maze.expeditionVisit.assists[0].helperPerson.bornDay++,
    x => x.maze.expeditionVisit.assists[0].focusCost = 4, x => x.maze.expeditionVisit.assists.push(clone(x.maze.expeditionVisit.assists[0])),
    x => delete x.maze.expeditionVisit.assists, x => x.maze.fieldAssists.entries = []]) {
    const bad = clone(s); change(bad); assert.equal(validateExpeditionReceipts(bad, rules), false);
  }
});
test('failed/no-op quote and declined personal boundary create no visit help metadata or debt', () => {
  const s = fresh(); s.hero.skills.survival = 6; const before = clone(s);
  assert.ok(applyMazeFieldAssist(s, 'scout', 'kest', 'hero', opts).disabledReason); assert.deepEqual(s, before);
  s.hero.skills.survival = 5; const eligible = clone(s); const q = applyMazeFieldAssist(s, 'scout', 'kest', 'hero', { ...opts, participationReason: () => 'Their own boundary remains.' });
  assert.match(q.disabledReason, /boundary/); assert.deepEqual(s, eligible);
});
test('native help controls disclose exact marginal benefit, escape names and preserve historical authorship', () => {
  const s = fresh(); s.companions[0].name = '<Original & Scout>'; s.lineage.people[0].name = s.companions[0].name;
  const q = quoteMazeFieldAssist(s, 'scout', 'kest', 'hero', opts), text = describeMazeFieldAssist(q); assert.match(text, /Alone: lose 8 Health/); assert.match(text, /With help: lose 0/); assert.match(text, /20 → 17/);
  const e = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const ui = { e, button: (label, op, id, _cls, disabled) => `<button type="button" data-op="${op}" data-id="${e(id)}"${disabled ? ' disabled' : ''}>${label}</button>` };
  const before = clone(s), offers = [{ id: 'maze_assist_selected', label: s.companions[0].name, description: text }], html = renderMazeFieldAssists(s, offers, ui);
  assert.match(html, /type="button" data-op="activity"/); assert.ok(html.includes('&lt;Original &amp; Scout&gt;')); assert.ok(!html.includes('<Original & Scout>')); assert.deepEqual(s, before);
  accept(s); close(s); succeed(s); s.maze = clone(s.mazeBook.records[0]); const historical = renderMazeFieldAssists(s, [], ui); assert.ok(historical.includes('&lt;Original &amp; Scout&gt;')); assert.ok(!historical.includes('Entirely New Scout'));
});
