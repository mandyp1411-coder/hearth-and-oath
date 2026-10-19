import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteMazeFieldAssist as quote, applyMazeFieldAssist as apply, validateMazeFieldAssists as valid } from '../dist/js/companion-field-assists.js';
import { genericMazeInscriptionNote, recordGenericMazeInscription } from '../dist/js/maze-inscription-note.js';
import { editionHistory } from '../dist/js/narrative-edition.js';

// Controlled pure fixtures prove the leaf accounting/adapter contract, not an
// earned playthrough, engine integration, browser acceptance or live balance.
const actors = { mira: 'warrior', kest: 'rogue', orrin: 'mage', sable: 'healer', tovin: 'warrior', vesper: 'rogue' };
const person = id => ({ id, name: id, role: actors[id], recruited: true, active: true, alive: true, hp: 20, maxHp: 40, mp: 20, maxMp: 24, combatExperience: 0, agility: 7 });
function fixture(kind = 'trap', helper = 'kest', version = 1) {
  const runKind = version === 2 ? 'authored' : 'radiant', sourceId = version === 2 ? 'buried_archive' : 'uncharted';
  return { seed: 'field-assists', revision: 5, day: 20, phase: 'adult', locationId: 'ruin', event: null, battle: null,
    hero: { name: 'You', hp: 30, maxHp: 60, mp: 8, maxMp: 30, potions: 4, skills: { survival: 5, scholarship: 7 }, attributes: { agility: 6 } },
    companions: [person(helper)], flags: { herbs: 2 }, journal: [], playerNotes: [], dynasty: { activePersonId: 'hero', generation: 1, history: [] },
    rpg: { companionStages: { [helper]: { stage: 0, status: 'available', locationId: 'home', choices: [], trainedTechniques: [] } } },
    maze: { version, id: 'maze-1', seed: `field-assists:maze:1:${runKind}:${sourceId}:ruin:1`, generation: 1, kind: runKind, sourceId, locationId: 'ruin', tier: 2,
      position: 7, previous: 6, visited: [0, 6, 7], cleared: [0, 6], collected: [], pendingRoom: null, status: 'inside', startedDay: 18,
      ...(version === 2 ? { content: { family: 'authored' } } : {}) },
    testRoom: { id: 7, kind, variant: 2, doors: [6, 8] } };
}
const options = s => ({ roomAt: (_m, id) => ({ ...s.testRoom, id }),
  runIdentity: m => ({ mazeId: m.id, runSeed: m.seed, runGeneration: m.generation, manifestVersion: 1, family: m.content.family, sourceId: m.sourceId, locationId: m.locationId }),
  actorId: state => state.dynasty?.activePersonId || 'hero', validActor: (state, id) => id === (state.dynasty?.activePersonId || 'hero') || state.dynasty?.history?.some(p => p.personId === id) });
function earn(s, id, chapter) {
  const stage = s.rpg.companionStages[s.companions[0].id]; stage.stage = chapter; stage.trainedTechniques = [id];
  stage.choices = Array.from({ length: chapter }, (_, n) => ({ id: 'care', day: s.day - chapter + n }));
}
function unchangedBlocked(s, kind, helper, target = 'hero', opts = options(s)) {
  const before = structuredClone(s), q = apply(s, kind, helper, target, opts);
  assert.ok(q.disabledReason); assert.equal(q.focusCost, 0); assert.equal(q.herbCost, 0); assert.equal(q.receipt, null); assert.deepEqual(s, before); return q;
}

test('pure scout quote and atomic effect debit real Focus, retain unassisted check and touch no map/supplies/skills', () => {
  const s = fixture(), before = structuredClone(s), q = quote(s, 'scout', 'kest', 'hero', options(s));
  assert.deepEqual(s, before); assert.equal(q.disabledReason, null); assert.equal(q.threshold, 12); assert.equal(q.bonus, 2); assert.equal(q.aloneDamage, 8); assert.equal(q.damage, 0); assert.equal(q.focusCost, 3);
  q.receipt.damage = 999; q.focusCost = 0;
  const actual = apply(s, 'scout', 'kest', 'hero', options(s)); assert.equal(actual.focusCost, 3); assert.equal(s.companions[0].mp, 17); assert.equal(s.hero.hp, 30); assert.equal(s.maze.fieldAssists.entries.length, 1); assert.ok(valid(s, s.maze, options(s)));
  const expected = structuredClone(before); expected.companions[0].mp -= 3; expected.maze.cleared.push(7); expected.maze.fieldAssists = structuredClone(s.maze.fieldAssists); assert.deepEqual(s, expected);
  unchangedBlocked(s, 'scout', 'kest');
});

for (const [score, allowed] of [[8, false], [9, false], [10, true], [11, true], [12, false], [13, false]]) test(`scout hero check ${score}/12 has marginal benefit ${allowed}`, () => {
  const s = fixture(); s.hero.skills.survival = score - 6;
  if (allowed) { const q = apply(s, 'scout', 'kest', 'hero', options(s)); assert.equal(q.disabledReason, null); assert.equal(q.damage, 0); }
  else unchangedBlocked(s, 'scout', 'kest');
});

test('chapter 5 watch_line replaces base bonus only with real learned non-scheme evidence', () => {
  const s = fixture(); s.hero.skills.survival = 3; earn(s, 'watch_line', 5);
  const q = quote(s, 'scout', 'kest', 'hero', options(s)); assert.equal(q.bonus, 3); assert.equal(q.focusCost, 3); assert.equal(q.mastery.techniqueId, 'watch_line');
  for (const change of [x => x.stage = 4, x => x.trainedTechniques = [], x => x.choices[4].id = 'scheme', x => x.choices[4].day = 21, x => x.choices = []]) {
    const bad = structuredClone(s); change(bad.rpg.companionStages.kest); unchangedBlocked(bad, 'scout', 'kest');
  }
  apply(s, 'scout', 'kest', 'hero', options(s)); assert.ok(valid(s, s.maze, options(s)));
});

for (const tier of [1, 2, 3, 4, 5, 6]) test(`protector tier ${tier} preserves nonzero injury and exact cost`, () => {
  const s = fixture('trap', 'mira'); s.maze.tier = tier;
  const q = apply(s, 'protector', 'mira', 'hero', options(s)); assert.equal(q.aloneDamage, 2 + tier); assert.equal(q.damage, Math.max(1, tier)); assert.equal(q.mitigation, 2); assert.equal(s.hero.hp, 30 - q.damage); assert.equal(s.companions[0].mp, 16); assert.ok(valid(s, s.maze, options(s)));
});
test('protector armor growth and earned protection replace rather than stack; HP floor no-op never charges', () => {
  const s = fixture('trap', 'mira'); s.companions[0].combatExperience = 36; earn(s, 'intercede', 3);
  const q = apply(s, 'protector', 'mira', 'hero', options(s)); assert.equal(q.mitigation, 3); assert.equal(q.damage, 1); assert.ok(valid(s, s.maze, options(s)));
  for (const hp of [1, 2]) { const x = fixture('trap', 'mira'); x.hero.hp = hp; unchangedBlocked(x, 'protector', 'mira'); }
  const x = fixture(); x.hero.hp = 1; unchangedBlocked(x, 'scout', 'kest');
});

for (const missing of [0, 1, 2, 3, 20]) test(`scholar recovers exactly capped missing Focus ${missing} and copies only existing note`, () => {
  const s = fixture('inscription', 'orrin'); s.hero.mp = 30 - missing; const before = structuredClone(s), journals = [];
  if (!missing) { unchangedBlocked(s, 'scholar', 'orrin'); return; }
  const q = apply(s, 'scholar', 'orrin', 'hero', options(s), { journal: (...args) => journals.push(args) });
  assert.equal(q.focusGain, Math.min(2, missing)); assert.equal(s.hero.mp, before.hero.mp + q.focusGain); assert.equal(s.companions[0].mp, 17); assert.equal(s.day, 20); assert.deepEqual(s.hero.skills, before.hero.skills);
  const note = genericMazeInscriptionNote(s.testRoom); assert.deepEqual(s.playerNotes, [{ day: 20, text: note.title + ': ' + note.text, id: 'note-1', ownerId: 'hero', generation: 1, noteVersion: 0, archived: false }]); assert.deepEqual(journals, [['A Note from Below', note.text, 'exploration', { narrativeEdition: 30 }]]); assert.ok(valid(s, s.maze, options(s)));
  unchangedBlocked(s, 'scholar', 'orrin'); assert.equal(s.playerNotes.length, 1);
});
test('experienced scholarly field adaptation charges four real Focus, does not claim a combat spell effect', () => {
  const s = fixture('inscription', 'orrin'); earn(s, 'winter_prison', 3);
  const q = apply(s, 'scholar', 'orrin', 'hero', options(s)); assert.equal(q.focusCost, 4); assert.equal(q.focusGain, 3); assert.equal(s.companions[0].mp, 16); assert.equal(s.hero.mp, 11); assert.ok(valid(s, s.maze, options(s)));
});

for (const missing of [0, 1, 5, 8, 30]) test(`healer exact HP cap with ${missing} missing; four Focus and one real herb, no potion`, () => {
  const s = fixture('empty', 'sable'); s.hero.hp = 60 - missing;
  if (!missing) { unchangedBlocked(s, 'healer', 'sable'); return; }
  const q = apply(s, 'healer', 'sable', 'hero', options(s)); assert.equal(q.hpGain, Math.min(5, missing)); assert.equal(s.hero.hp, 60 - missing + q.hpGain); assert.equal(s.hero.potions, 4); assert.equal(s.hero.mp, 8); assert.equal(s.flags.herbs, 1); assert.equal(s.companions[0].mp, 16); assert.equal(s.maze.cleared.includes(7), false); assert.ok(valid(s, s.maze, options(s)));
});
test('healer growth/earned cap stays 5–8 and selected ally/self treatment changes only that target', () => {
  for (const [wins, learned, expected] of [[0, false, 5], [324, false, 6], [0, true, 7], [324, true, 8]]) {
    const s = fixture('camp', 'sable'); s.companions[0].combatExperience = wins; if (learned) earn(s, 'purifying_touch', 5);
    const q = apply(s, 'healer', 'sable', 'sable', options(s)); assert.equal(q.hpGain, expected); assert.equal(s.companions[0].hp, 20 + expected); assert.equal(s.companions[0].mp, 16); assert.equal(q.targetFocusAfter, 16); assert.ok(valid(s, s.maze, options(s)));
  }
  const s = fixture('empty', 'sable'); s.companions.push(person('mira')); apply(s, 'healer', 'sable', 'mira', options(s)); assert.equal(s.companions[1].hp, 25); assert.equal(s.hero.hp, 30);
});

for (const [label, patch, status] of [['dead', { alive: false }], ['downed', { hp: 0 }], ['reserve', { active: false }], ['unrecruited', { recruited: false }], ['unavailable', { available: false }], ['wrong side', { side: 'enemy' }], ['missing MP', { mp: undefined }], ['missing HP', { hp: undefined }], ['away', {}, 'away'], ['departed', {}, 'departed'], ['dead status', {}, 'dead']]) test(`${label} helper cannot assist or spend anything`, () => {
  const s = fixture(); Object.assign(s.companions[0], patch); if (status) s.rpg.companionStages.kest.status = status; unchangedBlocked(s, 'scout', 'kest');
});
test('first three slots and actual personal Focus boundaries do not promote a fourth or use defaults', () => {
  const s = fixture(); s.companions = [person('mira'), person('orrin'), person('sable'), person('kest')]; unchangedBlocked(s, 'scout', 'kest');
  for (const mp of [0, 2, 3]) { const x = fixture(); x.companions[0].mp = mp; if (mp === 3) { apply(x, 'scout', 'kest', 'hero', options(x)); assert.equal(x.companions[0].mp, 0); } else unchangedBlocked(x, 'scout', 'kest'); }
  unchangedBlocked(fixture(), 'scout', 'missing'); unchangedBlocked(fixture(), 'healer', 'kest');
});
for (const [label, change] of [['battle', s => s.battle = {}], ['pending battle room', s => s.maze.pendingRoom = 7], ['event', s => s.event = { id: 'birthday' }], ['conversation', s => s.conversations = { pending: {} }], ['travel', s => s.timeline = { journey: {} }], ['crossing', s => s.cartography = { pending: {} }], ['offsite', s => s.cartography = { offsite: {} }], ['retired', s => s.phase = 'retired'], ['attended work', s => s.rpg.project = { completedDays: 0 }]]) test(`${label} is not a new attendance or resource path`, () => {
  const s = fixture(); change(s); unchangedBlocked(s, 'scout', 'kest');
});
test('canonical context reason, absent/wrong current descriptor and every anchored contentSlot fail closed', () => {
  const s = fixture(); unchangedBlocked(s, 'scout', 'kest', 'hero', {});
  unchangedBlocked(s, 'scout', 'kest', 'hero', { ...options(s), contextReason: 'Finish this commitment.' });
  unchangedBlocked(s, 'scout', 'kest', 'hero', { ...options(s), roomAt: () => ({ id: 8, kind: 'trap' }) });
  for (const [kind, helper, action] of [['trap', 'kest', 'scout'], ['trap', 'mira', 'protector'], ['inscription', 'orrin', 'scholar'], ['empty', 'sable', 'healer']]) {
    const x = fixture(kind, helper); x.testRoom.contentSlot = 'authored-evidence'; unchangedBlocked(x, action, helper);
  }
});
test('healer unsafe rooms and downed/dead/absent targets never replace stabilization or consume herbs', () => {
  for (const kind of ['trap', 'enemy', 'guardian']) { const s = fixture(kind, 'sable'); unchangedBlocked(s, 'healer', 'sable'); s.maze.cleared.push(7); assert.equal(apply(s, 'healer', 'sable', 'hero', options(s)).disabledReason, null); }
  for (const patch of [{ hp: 0 }, { alive: false }, { active: false }, { available: false }, { side: 'enemy' }]) { const s = fixture('camp', 'sable'); s.companions.push({ ...person('mira'), ...patch }); unchangedBlocked(s, 'healer', 'sable', 'mira'); }
  const s = fixture('camp', 'sable'); s.flags.herbs = 0; unchangedBlocked(s, 'healer', 'sable');
});
test('one shared physical slot survives helper/role changes, JSON reload, camp recovery and re-entry', () => {
  const s = fixture('inscription', 'sable'); s.companions.push(person('orrin')); apply(s, 'healer', 'sable', 'hero', options(s));
  unchangedBlocked(s, 'scholar', 'orrin'); const loaded = JSON.parse(JSON.stringify(s)); loaded.companions[0].mp = 24; loaded.maze.position = 0; loaded.maze.position = 7; unchangedBlocked(loaded, 'healer', 'sable'); assert.ok(valid(loaded, loaded.maze, options(loaded)));
});
test('stale named action rechecks deletion, party swap, death, away, MP, resources and actual room', () => {
  for (const change of [s => s.companions = [], s => s.companions[0].active = false, s => s.companions[0].alive = false, s => s.rpg.companionStages.kest.status = 'away', s => s.companions[0].mp = 2, s => s.maze.cleared.push(7), s => s.maze.position = 8]) {
    const s = fixture(); assert.equal(quote(s, 'scout', 'kest', 'hero', options(s)).disabledReason, null); change(s); unchangedBlocked(s, 'scout', 'kest');
  }
});
test('v2 requires canonical complete run/actor adapters and never accepts a partial ID', () => {
  const s = fixture('trap', 'kest', 2);
  for (const key of ['runIdentity', 'actorId', 'validActor']) { const opts = options(s); delete opts[key]; unchangedBlocked(s, 'scout', 'kest', 'hero', opts); }
  unchangedBlocked(s, 'scout', 'kest', 'hero', { ...options(s), runIdentity: m => ({ mazeId: m.id }) });
  assert.equal(apply(s, 'scout', 'kest', 'hero', options(s)).disabledReason, null); assert.ok(valid(s, s.maze, options(s)));
});
test('strict receipt schema rejects identity substitution, duplicates, impossible arithmetic, source/role/room and forged mastery', () => {
  const s = fixture('trap', 'kest', 2); earn(s, 'watch_line', 5); apply(s, 'scout', 'kest', 'hero', options(s));
  for (const change of [r => r.runSeed += '-wrong', r => r.runGeneration++, r => r.mazeId = 'maze-2', r => r.sourceId = 'other', r => r.locationId = 'home', r => r.actorId = 'stranger', r => r.extra = true, r => r.cellId = 120, r => r.focusCost = 0, r => r.helperFocusAfter++, r => r.targetHpAfter++, r => r.hpGain++, r => r.victories = 325, r => r.helperSlot = 3, r => r.helperRole = 'mage', r => r.helper.mp = Infinity, r => r.mastery.techniqueId = 'winter_prison', r => r.mastery.day = 21, r => r.mastery.choice = 'scheme']) {
    const bad = structuredClone(s); change(bad.maze.fieldAssists.entries[0]); assert.equal(valid(bad, bad.maze, options(bad)), false);
  }
  const dup = structuredClone(s); dup.maze.fieldAssists.entries.push(structuredClone(dup.maze.fieldAssists.entries[0])); assert.equal(valid(dup, dup.maze, options(dup)), false);
  const anchor = structuredClone(s); anchor.testRoom.contentSlot = 'source-room'; assert.equal(valid(anchor, anchor.maze, options(anchor)), false);
  const unearned = structuredClone(s); unearned.rpg.companionStages.kest.choices[4].id = 'scheme'; assert.equal(valid(unearned, unearned.maze, options(unearned)), false);
});
test('historical bounded receipt remains valid after actual growth, depleted resources, death/away and successor chapter reset', () => {
  const s = fixture('trap', 'mira', 2); earn(s, 'intercede', 3); apply(s, 'protector', 'mira', 'hero', options(s));
  s.companions[0].combatExperience = 324; s.companions[0].hp = 0; s.companions[0].mp = 0; s.companions[0].alive = false; s.rpg.companionStages.mira.status = 'dead'; assert.ok(valid(s, s.maze, options(s)));
  s.dynasty = { activePersonId: 'heir', generation: 2, history: [{ personId: 'hero', generation: 1 }] }; s.rpg.companionStages.mira = { stage: 0, choices: [] }; assert.ok(valid(s, s.maze, options(s)));
  const bad = structuredClone(s); bad.maze.fieldAssists.entries[0].mastery.chapter = 5; assert.equal(valid(bad, bad.maze, options(bad)), false);
});
test('older absent ledger is valid and every read remains non-mutating', () => {
  const s = fixture(), before = structuredClone(s); assert.ok(valid(s, s.maze, options(s))); assert.ok(valid({})); quote(s, 'scout', 'kest', 'hero', options(s)); assert.deepEqual(s, before); assert.equal(s.maze.fieldAssists, undefined);
});

test('fractional living Health remains living; healer self snapshots cannot contradict each other', () => {
  const s = fixture('empty', 'sable'); s.companions[0].hp = .5; s.hero.hp = .5;
  assert.equal(apply(s, 'healer', 'sable', 'sable', options(s)).disabledReason, null); assert.equal(s.companions[0].hp, 5.5); assert.ok(valid(s, s.maze, options(s)));
  const bad = structuredClone(s), row = bad.maze.fieldAssists.entries[0]; row.target.mp = 10; row.targetFocusAfter = 6; assert.equal(valid(bad, bad.maze, options(bad)), false);
});

for (const [kind, room, id, cost] of [['scout', 'trap', 'kest', 3], ['protector', 'trap', 'mira', 4], ['scholar', 'inscription', 'orrin', 3], ['healer', 'empty', 'sable', 4]]) {
  test(`${kind} exact personal Focus limit and one-below limit are real, not profile defaults`, () => {
    const s = fixture(room, id); s.companions[0].mp = cost - 1; unchangedBlocked(s, kind, id); s.companions[0].mp = cost;
    assert.equal(apply(s, kind, id, 'hero', options(s)).disabledReason, null); assert.equal(s.companions[0].mp, 0); assert.ok(valid(s, s.maze, options(s)));
  });
}

test('all six earned inscription lines survive a full notebook without evicting any old note or changing scholar costs', () => {
  const exactLines = ['The last repair crew marked a dry sleeping place beside the western wall.', 'A mason recorded the names of workers who never returned to the surface.', 'A traveller scratched a warning about loose floors beside an old stair.', 'The old keepers stored water above the damp line and food behind sealed doors.', 'A faded note describes a family sheltering here during a winter siege.', 'Someone added a small farewell beneath an unfinished route sketch.'];
  for (let variant = 0; variant < 6; variant++) {
    const s = fixture('inscription', 'orrin'); s.testRoom.variant = variant; s.playerNotes = Array.from({ length: 100 }, (_, n) => ({ day: 19, text: 'Old note ' + n }));
    const before = structuredClone(s), calls = [], q = apply(s, 'scholar', 'orrin', 'hero', options(s), { journal: (...args) => calls.push(args) });
    assert.deepEqual(s.playerNotes, before.playerNotes); assert.equal(s.playerNotes[0].text, 'Old note 0'); assert.equal(s.playerNotes.at(-1).text, 'Old note 99');
    assert.equal(calls.length, 1); assert.equal(calls[0][1], exactLines[variant]); assert.match(q.notebookCopyNotice, /full.*Journal Archive/);
    assert.equal(s.companions[0].mp, before.companions[0].mp - 3); assert.equal(s.hero.mp, before.hero.mp + 2); assert.equal(s.day, before.day); assert.equal(s.maze.fieldAssists.entries.length, 1); assert.ok(valid(s, s.maze, options(s)));
    assert.deepEqual(s.maze.visited, [0, 6, 7]); assert.deepEqual(s.testRoom.doors, [6, 8]);
  }
});

test('invalid ledger envelopes, resource bounds and source/family contracts fail closed', () => {
  const s = fixture(); apply(s, 'scout', 'kest', 'hero', options(s));
  for (const change of [x => x.maze.fieldAssists.extra = 1, x => x.maze.fieldAssists.version = 2, x => x.maze.fieldAssists.entries = {}, x => x.maze.fieldAssists.entries[0].target.extra = 1, x => x.maze.fieldAssists.entries[0].helper.maxMp = 100001]) {
    const bad = structuredClone(s); change(bad); assert.equal(valid(bad, bad.maze, options(bad)), false);
  }
  const v2 = fixture('trap', 'kest', 2); v2.maze.kind = 'radiant'; v2.maze.seed = 'field-assists:maze:1:radiant:buried_archive:ruin:1'; unchangedBlocked(v2, 'scout', 'kest');
  const unknown = fixture('trap', 'mira'); unknown.companions[0].role = 'unrecognized'; unchangedBlocked(unknown, 'protector', 'mira');
});

test('the exact current inscription Journal survives the real narrative formatter instead of becoming an earlier moment', () => {
  const s = fixture('inscription', 'orrin'); s.narrativeEdition = 30; const calls = [];
  const journalLiteral = (title, text, tag, meta) => { const row = { id: 'literal-note', day: s.day, age: 20, title, text, tag, ...meta }; s.journal.push(row); calls.push(row); };
  recordGenericMazeInscription(s, s.testRoom, { journalLiteral, journal: () => assert.fail('the exact note must prefer the literal current-prose path') });
  assert.equal(calls.length, 1); const row = calls[0]; assert.equal(row.title, 'A Note from Below'); assert.equal(row.text, genericMazeInscriptionNote(s.testRoom).text); assert.equal(row.narrativeEdition, 30); assert.deepEqual(editionHistory(s, row), row);
  const unmarked = { ...row }; delete unmarked.narrativeEdition; assert.notEqual(editionHistory(s, unmarked).title, row.title, 'this reproduces why an unmarked note was lost after the action');
});
