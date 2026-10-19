import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { DUNGEONS, generateDungeonDefinition } from '../dist/js/exploration.js';
import { Player } from './playtest-story.mjs';

// Three actual age-zero lives, with the same strict public-API player used in
// the audit. Seed selection broadens route/objective coverage; it grants no
// age, money, skills, party members, discoveries or battle outcome.
const featureKeys = seed => DUNGEONS.flatMap(d => {
  const v = generateDungeonDefinition(seed, d.id);
  return [`${d.id}:layout:${v.layout}`, `${d.id}:objective:${v.objective.id}`, `${d.id}:motive:${v.motive.id}`];
});
const candidates = Array.from({ length: 250 }, (_, n) => `v8-expedition-life-${n}`);
const selected = [], covered = new Set();
while (selected.length < 3) {
  const seed = candidates.filter(s => !selected.includes(s)).map(s => ({ seed: s, count: featureKeys(s).filter(f => !covered.has(f)).length })).sort((a, b) => b.count - a.count || a.seed.localeCompare(b.seed))[0].seed;
  selected.push(seed); featureKeys(seed).forEach(f => covered.add(f));
}
const specs = selected.map((seed, i) => ({ id: `v8-expedition-${i + 1}`, seed, name: ['Isca of the Witnesses', 'Halwen the Restorer', 'Deryn of the Private Record'][i], birthplace: ['marsh', 'tower', 'camp'][i], household: ['poor', 'tradesfolk', 'poor'][i], familySetup: ['single_parent', 'two_parents', 'adopted'][i], calling: ['guardian', 'elementalist', 'ranger'][i], profession: 'scholar', birth: ['care', 'curiosity', 'courage'][i], ending: ['renew', 'release', 'haven'][i], policy: { patients: 'living', letter: 'independent', return: 'open', inquiry: 'record', ferryman: 'protect', accounts: 'families', patron: 'independent', gate: 'evacuate', refugees: 'camp', anchor: 'voluntary', council: 'inclusive', keeper: 'listen', prepare: 'refuge', final: 'testimony', aftermath: 'people' }, sides: true, method: ['public', 'stewardship', 'copy'][i], fighting: i === 0 }));

function dungeonChoice(p, id) {
  const offered = p.state.event?.choices.find(c => c.id === id);
  if (p.state.event?.id.startsWith('dungeon_')) { assert.ok(offered && !offered.disabledReason, `${p.spec.id}/${p.state.dungeon.id}: ${id}: ${offered?.disabledReason || 'absent'}`); p.choose(id); }
  else {
    const action = E.getActions(p.state).find(a => a.id === `explore_${id}`);
    assert.ok(action && !action.disabledReason, `Missing actual expedition action ${id}`);
    p.step('dungeon-activity', id, s => E.chooseAction(s, action.id));
  }
  for (let n = 0; n < 50; n++) {
    if (p.state.battle) { p.win(); continue; }
    if (p.state.event && !p.state.event.id.startsWith('dungeon_')) { p.choose(p.automaticChoice()); continue; }
    return;
  }
  throw Error('Unbounded dungeon interruption');
}

function crawl(p) {
  const { id, definition } = p.state.dungeon;
  assert.equal(definition.version, 1);
  const cache = definition.rooms.find(r => r.kind === 'treasure'), first = definition.rooms[1], boss = definition.rooms.find(r => r.kind === 'boss'), objective = definition.rooms.find(r => r.kind === 'objective');
  const variant = { id, seed: p.state.seed, layout: definition.layout, concern: definition.objective.id, motive: definition.motive.id, custodian: definition.custodian.name, witness: definition.witness.name, rooms: definition.rooms.map(r => ({ id: r.id, exits: r.exits })), negotiated: false };
  p.dungeons.push(id);
  if (definition.layout === 0) {
    dungeonChoice(p, 'route_witness'); dungeonChoice(p, 'hear_witness'); dungeonChoice(p, 'protect_witness');
    dungeonChoice(p, 'route_entry'); dungeonChoice(p, `route_${first.id}`);
    dungeonChoice(p, 'listen'); dungeonChoice(p, p.spec.fighting || !first.parley ? 'fight' : 'parley'); dungeonChoice(p, `route_${cache.id}`);
  } else if (definition.layout === 1) {
    dungeonChoice(p, 'route_service'); dungeonChoice(p, 'repair_route'); dungeonChoice(p, `route_${cache.id}`);
  } else {
    dungeonChoice(p, 'route_reliquary'); dungeonChoice(p, 'restore'); dungeonChoice(p, `route_${cache.id}`);
  }
  dungeonChoice(p, 'take'); dungeonChoice(p, `route_${boss.id}`); dungeonChoice(p, 'listen');
  const parley = p.state.event?.choices.find(c => c.id === 'parley');
  if (!p.spec.fighting && parley && !parley.disabledReason) { dungeonChoice(p, 'parley'); variant.negotiated = true; }
  else dungeonChoice(p, 'fight');
  assert.equal(p.state.dungeon.complete, false);
  dungeonChoice(p, `route_${objective.id}`);
  const finish = p.spec.method === 'public' ? 'finish_public' : p.spec.method === 'stewardship' ? 'finish_stewardship' : 'finish';
  dungeonChoice(p, finish);
  const final = structuredClone(p.state.flags.dungeonRecords[id]);
  assert.equal(final.complete, true); assert.equal(final.facts.objectiveMethod, p.spec.method);
  const definitionBefore = JSON.stringify(final.definition);
  dungeonChoice(p, 'leave');
  assert.equal(JSON.stringify(p.state.flags.dungeonRecords[id].definition), definitionBefore);
  variant.resolution = final.facts; variant.cleared = final.cleared;
  p.variantRecords.push(variant);
}

const summaries = [];
mkdirSync('artifacts/playtest/v8-dungeons', { recursive: true });
for (const spec of specs) {
  const p = new Player(spec); p.variantRecords = []; p.dungeon = () => crawl(p);
  const ordinaryAct = p.act.bind(p);
  p.act = id => {
    p.settle();
    const offered = E.getActions(p.state).find(a => a.id === id);
    if (offered?.disabledReason?.includes('birthday')) p.grow(p.state.age + 1);
    return ordinaryAct(id);
  };
  try {
    p.grow(18); p.move('city'); p.act('career_choose_scholar'); p.money(450);
    p.earn(spec.calling); p.move('city');
    for (const id of ['mira', 'orrin', 'kest']) p.step('recruit', id, s => E.recruitCompanion(s, id));
    for (let n = 0; n < 12; n++) { p.act('career_buy_cloth'); p.act('career_buy_ore'); }
    for (let n = 0; n < 5; n++) p.act('buy_potion');
    // The guardian and ranger study enough to answer the scholarly motive;
    // their other skills and trusted memories arise from childhood/calling.
    while (p.state.hero.skills.scholarship < 4) p.act('study');
    p.move('forest'); while ((p.state.flags.herbs || 0) < 8 || p.state.hero.skills.survival < 4) p.act('gather_herbs');
    p.move('city'); p.rest(); p.campaign();
    assert.equal(new Set(p.variantRecords.map(r => r.id)).size, 5, 'all five mandatory/side quest discoveries reached through real variants');
    p.retirement();
    const summary = { ...p.result(), variants: p.variantRecords, operations: p.trace.length, companionMemories: p.state.companions.map(c => ({ id: c.id, name: c.name, memories: c.memories.filter(m => m.startsWith('Expedition:')) })) };
    summaries.push(summary);
    writeFileSync(`artifacts/playtest/v8-dungeons/${spec.id}.json`, JSON.stringify({ spec, summary, trace: p.trace, battles: p.battles, finalState: p.state }, null, 2) + '\n');
    console.log(`${spec.id}: ${summary.ending}; ${p.trace.length} public operations; all five expeditions; ${p.variantRecords.filter(r => r.negotiated).length} negotiated guardians; ${p.battles.length} real battles.`);
  } catch (error) {
    writeFileSync(`artifacts/playtest/v8-dungeons/${spec.id}-failure.json`, JSON.stringify({ spec, error: String(error), trace: p.trace, state: p.state }, null, 2) + '\n');
    throw error;
  }
}
writeFileSync('docs/playtest/dungeon-variants-v8.json', JSON.stringify({ method: 'Three independent age-zero seeds, public APIs only; real work, paid supplies, training, battles and campaign choices. No state/resource/outcome grants.', distinctFeaturesCovered: covered.size, possibleLayoutObjectiveMotiveFeatures: 45, lives: summaries }, null, 2) + '\n');
writeFileSync('docs/playtest/dungeon-variant-actions-v8.json.gz', gzipSync(JSON.stringify({ method: 'Complete public-API traces and final states for the three v0.8 expedition lives; repeat verification is not counted as additional unique lives.', records: specs.map(s => JSON.parse(readFileSync(`artifacts/playtest/v8-dungeons/${s.id}.json`, 'utf8'))) })));
