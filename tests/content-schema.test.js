// The content schema (v0.70): the condition language parses and evaluates,
// every example validates clean, every broken fixture fails for the reason it
// was written to, the whole content tree has no errors, the vocabularies hold
// to the engine, and the compiler makes a module the engine could import.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { parse, tryParse, evaluate, holds, references, comparisons, ConditionError } from '../scripts/lib/conditions.mjs';
import { voiceCheck } from '../scripts/content/voice-check.mjs';
import { validateFile, crossCheck, KINDS, EFFECT_OP_IDS, ROLE_KIND_IDS, ROLE_FIELDS, SKILLS, FACTIONS, STANDINGS, TIE_KINDS, GUILD_RANKS, FAITH_RANKS, ANCESTRIES, TRAIT_IDS, TAGS, CREDENTIALS, SEASONS, FOE_ROLES, FOE_PATTERNS, SCOPE } from '../scripts/content/schema.mjs';
import { validateTree, toMarkdown } from '../scripts/content/validate.mjs';
import { compile, EXPORT_NAMES } from '../scripts/content/compile.mjs';
import { RANKS as GUILD_RANKS_ENGINE } from '../dist/js/guild.js';
import { RANKS as FAITH_RANKS_ENGINE } from '../dist/js/faith.js';
import { addStationTie } from '../dist/js/station.js';
import { ORIGIN_ANCESTRIES } from '../dist/js/origins.js';
import { PERSONALITY_TRAITS, ACQUIRED_TRAITS, INTENT_TAGS, shiftNature } from '../dist/js/personality.js';
import { CREDENTIAL_LABELS } from '../dist/js/schooling.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(project, rel), 'utf8'));
const codes = result => result.errors.map(e => e.code);

// ---------------------------------------------------------------------------
test('conditions: the grammar parses to an AST with the expected shape and precedence', () => {
  assert.deepEqual(parse('age >= 16'), { type: 'cmp', op: '>=', left: { type: 'path', path: ['age'], position: 0 }, right: { type: 'num', value: 16 } });
  assert.deepEqual(parse("season == 'spring'").right, { type: 'str', value: 'spring' });
  assert.deepEqual(parse('hero.station.household').path, ['hero', 'station', 'household']);
  // not binds tighter than and, and tighter than or; parentheses override.
  const ast = parse('not a and b or c');
  assert.equal(ast.type, 'or'); assert.equal(ast.left.type, 'and'); assert.equal(ast.left.left.type, 'not');
  assert.equal(parse('a and (b or c)').right.type, 'or');
  const call = parse("in(season, 'spring', 'summer')");
  assert.equal(call.type, 'call'); assert.equal(call.name, 'in'); assert.equal(call.args.length, 3);
  assert.deepEqual(parse('true'), { type: 'bool', value: true });
  assert.deepEqual(parse('-3 < 0').left, { type: 'num', value: -3 });
  assert.deepEqual(parse('gold >= 2.5').right, { type: 'num', value: 2.5 });
});

test('conditions: parse errors name the position of the fault', () => {
  const cases = [
    ['age >', 5, /Unexpected end/], ["season == 'spr", 10, /Unterminated string/], ['and age', 0, /Unexpected 'and'/], ['age = 3', 4, /Expected '=='/],
    ['(age > 3', 8, /Expected '\)'/], ['age > 3)', 7, /Unexpected '\)'/], ['has(nature', 10, /Expected '\)'/], ['age >= 16 season', 10, /Unexpected 'season'/],
    ['', 0, /Empty condition/], ['   ', 0, /Empty condition/], ['age ! 3', 4, /Expected '!='/], ['a.', 2, /name after the dot/], ['flag("x")', 5, /single quotes/], ['3 3', 2, /Unexpected '3'/], ['age # 3', 4, /Unexpected character/],
  ];
  for (const [src, position, message] of cases) {
    const r = tryParse(src);
    assert.equal(r.ok, false, src);
    assert.equal(r.error.position, position, `${src}: position`);
    assert.match(r.error.message, message, src);
    assert.throws(() => parse(src), e => e instanceof ConditionError && e.position === position);
  }
  assert.throws(() => parse(42), ConditionError);
});

test('conditions: evaluation against a scope, with the built-in functions', () => {
  const scope = { age: 20, season: 'spring', gold: 15, debt: 0, nature: ['brave', 'honest'], marks: ['drinker'], flags: { field_kept: true, sold: false }, knows: ['neighbour', 'spouse'], credentials: ['letters'], standing: { villagers: 12, order: -3 }, hero: { station: { household: 'poor', id: 'common' } } };
  const yes = ["age >= 16 and season == 'spring'", "has(nature, 'brave')", "not mark('devout')", "mark('drinker')", "in(season, 'spring', 'summer')", "credential('letters') and standing.villagers > 10",
    "hero.station.household == 'poor' and (age > 30 or flag('field_kept'))", 'standing.order < 0', 'standing.order >= -3', 'not not true', "knows('spouse')", 'gold != 16', 'debt == 0', "flag('field_kept') and not flag('sold')", "not flag('never_set')", 'missing.path != 3', "season != 'winter'", 'has(flags, \'field_kept\')'];
  const no = ["knows('lord')", 'gold > 15', "season == 'winter'", 'has(nature, \'greedy\')', 'missing.path == 3', 'missing.path < 3', 'false or (age < 18 and true)', "credential('degree')", "in(season, 'autumn', 'winter')", 'has(flags, \'sold\')'];
  for (const c of yes) assert.equal(holds(c, scope), true, c);
  for (const c of no) assert.equal(holds(c, scope), false, c);
  // Comparisons across types are false rather than coerced; a bare path evaluates to its value.
  assert.equal(holds("age == '20'", scope), false);
  assert.equal(evaluate(parse('standing.villagers'), scope), 12);
  // Unknown functions fail at evaluation with their position; callers may add functions.
  assert.throws(() => holds("owns('ox')", scope), e => e instanceof ConditionError && e.position === 0);
  assert.equal(holds("owns('ox')", scope, { owns: (s, [what]) => what === 'ox' }), true);
  // references and comparisons expose what a validator needs.
  const refs = references(parse("has(nature,'brave') and standing.villagers > 3 and in(season,'spring')"));
  assert.deepEqual(refs.paths.map(p => p.path.join('.')), ['nature', 'standing.villagers', 'season']);
  assert.deepEqual(refs.calls.map(c => c.name), ['has', 'in']);
  assert.equal(comparisons(parse("a == 'x' or (b < 3 and not c != 'y')")).length, 3);
});

// ---------------------------------------------------------------------------
test('voice check: the audit log and the unwritten are caught, clean text passes', () => {
  assert.deepEqual(voiceCheck('The steward counts it twice and does not thank you.'), []);
  assert.deepEqual(voiceCheck('TODO write this').map(h => h.kind), ['placeholder']);
  const hits = voiceCheck('This is recorded in the category ledger; the fee is settled separately and accrues. Choose this action. Not a promise of anything. lorem ipsum ${x} [object Object] undefined');
  assert.deepEqual(hits.map(h => h.phrase).sort(), ['Choose this action', '[object Object]', '${', 'accrues', 'category', 'lorem', 'not a promise of', 'recorded', 'settled separately', 'undefined'].sort());
  assert.ok(hits.every(h => Number.isInteger(h.index)));
  // Whole words only: a recorder is not a record, and a placeholder word inside another word is not one.
  assert.deepEqual(voiceCheck('The recorder played. Categorical.'), []);
  assert.deepEqual(voiceCheck(''), []); assert.deepEqual(voiceCheck(null), []);
});

// ---------------------------------------------------------------------------
test('schema: every example file validates clean, with the kinds the Bible names', () => {
  assert.deepEqual(KINDS, ['scene', 'thread', 'foe', 'place', 'landmark', 'ambition', 'play', 'dialogue', 'design-asset']);
  const results = [];
  for (const kind of KINDS) {
    const file = `content/examples/${kind}.json`;
    assert.ok(existsSync(path.join(project, file)), `${file} exists`);
    const r = validateFile(read(file), { file });
    assert.deepEqual(r.errors, [], `${file} has no errors`);
    assert.equal(r.kind, kind);
    assert.ok(r.items >= 1, `${file} has items`);
    results.push(r);
  }
  assert.deepEqual(crossCheck(results), []);
  const scene = results.find(r => r.kind === 'scene');
  assert.deepEqual(scene.warnings, [], 'the example scenes follow the house convention');
  assert.ok(scene.texts > 30, 'every text field was read');
  assert.deepEqual(results.find(r => r.kind === 'dialogue').dialogueRoles, { spouse: 4 });
});

test('schema: the broken scene fails for an unknown op, an undeclared role and a TODO', () => {
  const r = validateFile(read('tests/fixtures/content-invalid/bad-scene.json'), { file: 'bad-scene.json' });
  const got = codes(r);
  assert.ok(got.includes('effect.unknown-op'), got);
  assert.ok(got.includes('placeholder.undeclared-role'), got);
  assert.ok(got.includes('text.placeholder'), got);
  assert.equal(r.errors.find(e => e.code === 'effect.unknown-op').path, 'items[0].choices[0].effects[0].op');
  assert.match(r.errors.find(e => e.code === 'placeholder.undeclared-role').message, /\{steward\.name\}/);
  assert.match(r.errors.find(e => e.code === 'text.placeholder').message, /TODO/);
  assert.ok(!got.includes('placeholder.unknown-field'), 'the declared neighbour role resolves');
});

test('schema: the broken thread fails for an unparsable condition, an unknown path and a missing scene', () => {
  const r = validateFile(read('tests/fixtures/content-invalid/bad-thread.json'), { file: 'bad-thread.json' });
  const parseError = r.errors.find(e => e.code === 'condition.parse');
  assert.ok(parseError); assert.equal(parseError.path, 'items[0].opens'); assert.match(parseError.message, /Unexpected 'and' at 7/);
  const pathError = r.errors.find(e => e.code === 'condition.unknown-path');
  assert.ok(pathError); assert.equal(pathError.path, 'items[0].closes'); assert.match(pathError.message, /weather\.mood/);
  assert.deepEqual(crossCheck([r]).map(e => e.code), ['ref.missing']);
  const tree = validateTree(path.join(project, 'tests/fixtures/content-invalid'));
  assert.equal(tree.files, 2);
  assert.ok(tree.errors >= 6, `the fixtures carry ${tree.errors} errors`);
  assert.ok(tree.errorRows.some(e => e.code === 'ref.missing' && /a-scene-nobody-wrote/.test(e.message)));
  assert.match(toMarkdown(tree), /\| tests\/fixtures\/content-invalid\/bad-thread\.json \| items\[0\]\.opens \| condition\.parse \|/);
});

test('schema: a thread declares the roles its scenes read, and a scene those of its follow-up', () => {
  const scenes = validateFile({ kind: 'scene', schemaVersion: 1, items: [
    { id: 'a', title: 'T', text: 't {lord.name}', roles: [{ id: 'lord', kind: 'lord' }], choices: [{ id: 'continue', label: 'l', result: 'r', effects: [{ op: 'followUp', scene: 'b', seasons: 1 }] }] },
    { id: 'b', title: 'T', text: 't {steward.name}', roles: [{ id: 'steward', kind: 'reeve' }, { id: 'friend', kind: 'friend', required: false }], choices: [{ id: 'continue', label: 'l', result: 'r', effects: [] }] },
  ] }, { file: 's.json' });
  const threads = validateFile({ kind: 'thread', schemaVersion: 1, items: [
    { id: 't1', roles: [{ id: 'lord', kind: 'creditor' }], opens: 'age > 3', stages: [{ id: 's', scene: 'a', after: { seasons: 0 } }, { id: 's2', scene: 'b', after: { seasons: 1 } }] },
    { id: 't2', roles: [{ id: 'lord', kind: 'lord' }, { id: 'steward', kind: 'reeve' }], opens: 'age > 3', stages: [{ id: 's', scene: 'a', after: { seasons: 0 } }, { id: 's2', scene: 'b', after: { seasons: 1 } }] },
  ] }, { file: 't.json' });
  assert.deepEqual([...scenes.errors, ...threads.errors], []);
  const cross = crossCheck([scenes, threads]).map(e => `${e.file} ${e.path} ${e.code}`);
  assert.deepEqual(cross, ['s.json items[0].choices[0].effects[0].scene ref.role-unsupplied', 't.json items[0].stages[0].scene ref.role-kind', 't.json items[0].stages[1].scene ref.role-unsupplied'], 'an optional role need not be supplied; t2 supplies everything');
});

test('schema: a file without a kind is a design asset only under content/expansion-v27', () => {
  const r = validateFile({ title: 'notes', body: 'A note with {name} tokens of its own, all of it written.' }, { file: 'content/expansion-v27/x.json', designAsset: true });
  assert.equal(r.kind, 'design-asset'); assert.deepEqual(r.errors, []);
  const bad = validateFile([{ body: 'TODO later' }], { file: 'content/expansion-v27/y.json', designAsset: true });
  assert.deepEqual(codes(bad), ['text.placeholder']);
  assert.deepEqual(codes(validateFile({ items: [] }, { file: 'content/other.json' })), ['file.kind']);
  assert.deepEqual(codes(validateFile({ kind: 'saga', schemaVersion: 1, items: [] }, { file: 'x.json' })), ['file.kind']);
  assert.deepEqual(codes(validateFile({ kind: 'scene', schemaVersion: 2, items: [] }, { file: 'x.json' })), ['file.schema-version']);
});

test('schema: placeholders must name a declared role and a known field; the hero is implicit', () => {
  const item = (text, roles) => ({ kind: 'scene', schemaVersion: 1, items: [{ id: 'x', title: 'T', text, roles, choices: [{ id: 'continue', label: 'l', result: 'r', effects: [] }] }] });
  assert.deepEqual(codes(validateFile(item('{hero.name} and {hero.their} field.'))), []);
  assert.deepEqual(codes(validateFile(item('{spouse.name}', [{ id: 'spouse', kind: 'spouse' }]))), []);
  assert.deepEqual(codes(validateFile(item('{spouse.nose}', [{ id: 'spouse', kind: 'spouse' }]))), ['placeholder.unknown-field']);
  assert.deepEqual(codes(validateFile(item('{spouse.name}'))), ['placeholder.undeclared-role']);
  assert.deepEqual(codes(validateFile(item('{name}'))), ['placeholder.shape']);
  assert.deepEqual(codes(validateFile(item('The ${x} fee'))), ['text.placeholder', 'placeholder.shape']);
  assert.deepEqual(ROLE_FIELDS, ['name', 'they', 'them', 'their', 'theirs', 'home', 'trade', 'honorific']);
});

test('schema: effects are a closed vocabulary with validated arguments', () => {
  const withEffects = effects => validateFile({ kind: 'scene', schemaVersion: 1, items: [{ id: 'x', title: 'T', text: 't', roles: [{ id: 'friend', kind: 'friend' }, { id: 'lord', kind: 'lord' }], choices: [{ id: 'continue', label: 'l', result: 'r', effects }] }] });
  assert.deepEqual(EFFECT_OP_IDS, ['standing', 'gold', 'stress', 'joy', 'health', 'wound', 'devotion', 'skill', 'mark', 'tie', 'bond', 'journal', 'memory', 'followUp', 'open', 'flag', 'death', 'evidence', 'obligation', 'place']);
  const good = [
    { op: 'standing', who: 'villagers', by: -6 }, { op: 'standing', who: 'faith', by: 5 }, { op: 'gold', by: 30 }, { op: 'stress', by: 14 }, { op: 'joy', by: -3 }, { op: 'health', by: 4 }, { op: 'wound', share: 0.25 },
    { op: 'devotion', by: 8 }, { op: 'skill', id: 'survival', by: 1 }, { op: 'mark', id: 'hard', title: 'The levy', text: 'Something in you closed on the march.' }, { op: 'tie', kind: 'hates', role: 'friend', note: 'you called their work shoddy in the square' },
    { op: 'tie', kind: 'knows', name: "the smiths' guild", note: 'you worked through their strike' }, { op: 'bond', role: 'friend', by: 12 }, { op: 'journal', title: 'The levy', text: 'The cart leaves at dawn.', tag: 'world' }, { op: 'memory', text: 'You went to the levy.' },
    { op: 'flag', id: 'field_kept', value: true }, { op: 'death', role: 'friend', cause: 'killed with the levy', title: 'The levy', text: 'They did not come back with the carts.' }, { op: 'death', cause: 'killed in the doorway of the shrine' },
    { op: 'evidence', by: 1, text: 'The court marked the door that opened.' }, { op: 'obligation', id: 'reach_bedside', title: 'Reach the bedside', days: 60, text: 'Be at home within the season.' }, { op: 'place', security: -6 },
  ];
  assert.deepEqual(codes(withEffects(good)), []);
  const bad = [
    [{ op: 'smite' }, 'effect.unknown-op'], [{ op: 'gold' }, 'effect.missing-arg'], [{ op: 'gold', by: 0 }, 'effect.bad-arg'], [{ op: 'gold', by: 2.5 }, 'effect.bad-arg'], [{ op: 'gold', by: 3, who: 'x' }, 'effect.unknown-arg'],
    [{ op: 'standing', who: 'elves', by: 3 }, 'effect.bad-arg'], [{ op: 'skill', id: 'cooking', by: 1 }, 'effect.bad-arg'], [{ op: 'skill', id: 'survival', by: 5 }, 'effect.bad-arg'], [{ op: 'mark', id: 'sad' }, 'effect.bad-arg'],
    [{ op: 'tie', kind: 'loves', role: 'friend', note: 'n' }, 'effect.bad-arg'], [{ op: 'tie', kind: 'knows', note: 'n' }, 'effect.bad-arg'], [{ op: 'tie', kind: 'knows', role: 'stranger', note: 'n' }, 'effect.unknown-role'], [{ op: 'tie', kind: 'knows', role: 'friend', note: 'x'.repeat(121) }, 'text.long'],
    [{ op: 'bond', role: 'lord', by: 2 }, 'effect.not-a-person'], [{ op: 'bond', role: 'hero', by: 2 }, 'effect.not-a-person'], [{ op: 'wound', share: 1.5 }, 'effect.bad-arg'], [{ op: 'journal', text: '' }, 'text.empty'], [{ op: 'journal', text: 'Fee settled separately.' }, null],
    [{ op: 'followUp', scene: 'Bad Scene', seasons: 1 }, 'effect.bad-arg'], [{ op: 'followUp', scene: 'ok', seasons: 0 }, 'effect.bad-arg'], [{ op: 'followUp', scene: 'ok', seasons: 2, chance: 100 }, 'effect.bad-arg'], [{ op: 'flag', id: 'x', value: null }, 'effect.bad-arg'],
    [{ op: 'death', cause: 'TODO' }, 'text.placeholder'], [{ op: 'evidence', text: 't', by: 0 }, 'effect.bad-arg'], [{ op: 'place' }, 'effect.bad-arg'], [{ op: 'obligation', id: 'x', title: 't', days: 400, text: 'x' }, 'effect.bad-arg'], ['gold', 'effect.shape'],
  ];
  for (const [effect, code] of bad) {
    const r = withEffects([effect]);
    if (code) assert.ok(codes(r).includes(code), `${JSON.stringify(effect)} → ${code}, got ${codes(r)}`);
    else { assert.deepEqual(codes(r), []); assert.ok(r.voice.length, 'a voice hit is a warning, not an error'); }
  }
});

test('schema: conditions in content read only the scope and compare only to values it takes', () => {
  const withWhen = when => codes(validateFile({ kind: 'scene', schemaVersion: 1, items: [{ id: 'x', title: 'T', text: 't', when, choices: [{ id: 'continue', label: 'l', result: 'r', effects: [] }] }] }));
  assert.deepEqual(withWhen("age >= 16 and hero.station.id == 'common' and standing.order > 0 and skills.survival >= 3 and flags.anything and knows('lord') and credential('letters') and mark('drinker') and has(nature, 'brave') and in(season, 'spring') and guild.rank == 'master' and faith.wing == 'open' and home.tier == 'cottage' and here.type == 'village'"), []);
  assert.deepEqual(withWhen('weather.mood == 3'), ['condition.unknown-path']);
  assert.deepEqual(withWhen('standing > 3'), ['condition.unknown-path']);
  assert.deepEqual(withWhen('age.years > 3'), ['condition.unknown-path']);
  assert.deepEqual(withWhen("season == 'monsoon'"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("in(season, 'spring', 'monsoon')"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("has(nature, 'grumpy')"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("mark('sad')"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("credential('wizardry')"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("knows('dragon')"), ['condition.unknown-value']);
  assert.deepEqual(withWhen("owns('ox')"), ['condition.unknown-function']);
  assert.deepEqual(withWhen('mark(3)'), ['condition.bad-call']);
  assert.deepEqual(withWhen('age >= 16 and'), ['condition.parse']);
  assert.deepEqual(Object.keys(SCOPE.standing), [...STANDINGS]);
});

test('schema: the whole content tree validates with zero errors and the report reads back', () => {
  const report = validateTree(path.join(project, 'content'));
  assert.equal(report.errors, 0, JSON.stringify(report.errorRows, null, 1));
  assert.equal(report.warnings, 0, JSON.stringify(report.warningRows, null, 1));
  assert.equal(report.voiceHits, 0);
  assert.ok(report.files >= 12 && report.items >= 22 && report.texts > 1000);
  assert.equal(report.byKind['design-asset'].files, 4, 'the three v27 assets and the example');
  assert.deepEqual(report.dialogue, { target: [15, 20], linesByRole: { spouse: 4 } });
  const md = toMarkdown(report, { when: '2026-10-23' });
  assert.match(md, /\| spouse \| 4 \| 11 short \|/);
  assert.match(md, /## Errors\n\nNone\./);
});

test('schema: the v27 species fit the foe kind when wrapped', () => {
  const design = read('content/expansion-v27/encounter_design_v27.json');
  const r = validateFile({ kind: 'foe', schemaVersion: 1, items: design.species }, { file: 'wrapped-v27.json' });
  assert.deepEqual(r.errors, []);
  assert.equal(r.items, 48);
  for (const s of design.species) { assert.ok(FOE_ROLES.includes(s.role), s.role); assert.ok(FOE_PATTERNS.includes(s.pattern), s.pattern); }
});

// ---------------------------------------------------------------------------
test('vocabularies: the lists copied from engine constants still match the engine', () => {
  assert.deepEqual([...GUILD_RANKS], [...GUILD_RANKS_ENGINE]);
  assert.deepEqual([...FAITH_RANKS], [...FAITH_RANKS_ENGINE]);
  assert.deepEqual([...ANCESTRIES], [...ORIGIN_ANCESTRIES]);
  assert.deepEqual([...TRAIT_IDS], [...PERSONALITY_TRAITS, ...ACQUIRED_TRAITS].map(t => t.id));
  assert.deepEqual([...TAGS], [...INTENT_TAGS]);
  assert.deepEqual([...CREDENTIALS], ['letters', ...Object.keys(CREDENTIAL_LABELS), 'journeyman']);
  const engine = readFileSync(path.join(project, 'dist/js/engine.js'), 'utf8');
  assert.deepEqual([...SKILLS], JSON.parse(engine.match(/^const SKILLS = (\[[^\]]+\]);/m)[1].replace(/'/g, '"')));
  assert.deepEqual([...FACTIONS], [...engine.match(/factions: \{ ([^}]+) \}/)[1].matchAll(/(\w+): 0/g)].map(m => m[1]));
  // addStationTie accepts exactly the tie kinds the schema allows.
  const s = { hero: { station: { ties: [] } } };
  for (const kind of TIE_KINDS) assert.equal(addStationTie(s, { kind, name: `n-${kind}`, note: 'x' }), true);
  assert.equal(addStationTie(s, { kind: 'loves', name: 'n', note: 'x' }), false);
  // shiftNature takes every id the schema allows as a mark.
  for (const id of TRAIT_IDS) { const life = { hero: { personality: { traits: [], applied: [] }, marks: [] }, day: 1 }; assert.equal(shiftNature(life, id, 'T', 't'), true, id); }
  assert.deepEqual([...SEASONS], ['spring', 'summer', 'autumn', 'winter']);
  assert.ok(ROLE_KIND_IDS.includes('neighbour') && ROLE_KIND_IDS.includes('named-person'));
});

// ---------------------------------------------------------------------------
test('compile: the examples compile into frozen modules with named exports the offline build can inline', async () => {
  const out = mkdtempSync(path.join(os.tmpdir(), 'hearth-content-'));
  try {
    const { written, report } = compile(path.join(project, 'content'), out);
    assert.equal(report.errors, 0);
    assert.deepEqual(written.map(w => w.kind), Object.keys(EXPORT_NAMES));
    const scenes = await import(path.join(out, 'scene.js'));
    assert.deepEqual(Object.keys(scenes).sort(), ['SCENES', 'SCENES_BY_ID']);
    assert.equal(scenes.SCENES.length, 4);
    assert.equal(scenes.SCENES_BY_ID['fence-between'].title, 'The fence between');
    assert.equal(scenes.SCENES_BY_ID['fence-between'].source, 'content/examples/scene.json');
    assert.ok(Object.isFrozen(scenes.SCENES) && Object.isFrozen(scenes.SCENES_BY_ID['fence-between'].choices[0].effects[0]));
    assert.throws(() => { 'use strict'; scenes.SCENES_BY_ID['fence-between'].title = 'x'; }, TypeError);
    const src = readFileSync(path.join(out, 'scene.js'), 'utf8');
    assert.doesNotMatch(src, /^import /m, 'a content module imports nothing');
    assert.doesNotMatch(src, /export default/, 'named exports only: build-offline strips `export ` and destructures named imports');
    assert.match(src, /^export const SCENES = /m);
    const dialogues = await import(path.join(out, 'dialogue.js'));
    assert.equal(dialogues.DIALOGUES_BY_ID['spouse-at-the-hearth'].lines.length, 4);
    // A tree with errors compiles nothing.
    const bad = mkdtempSync(path.join(os.tmpdir(), 'hearth-content-bad-'));
    try { assert.throws(() => compile(path.join(project, 'tests/fixtures/content-invalid'), bad), /errors; nothing compiled/); assert.ok(!existsSync(path.join(bad, 'scene.js'))); }
    finally { rmSync(bad, { recursive: true, force: true }); }
  } finally { rmSync(out, { recursive: true, force: true }); }
});
