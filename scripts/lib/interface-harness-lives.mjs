// Lives for the interface harness (scripts/interface-harness.py).
//
// The harness measures pages, and two of them need a life the creator cannot
// hand it: a new-edition life standing in a battle (the v0.68 field page) and
// a life of the old edition standing in a battle (the older battle page). Both
// are made here with the real engine and written as save envelopes the game
// reads from its storage (saves.js, `hearth-and-oath:slots:v1`). Nothing here
// is invented history: the lives are generated the way the creator and the
// engine generate them, then put into a fight by `createBattle`.
//
//   node scripts/lib/interface-harness-lives.mjs <out-dir> [seed]
//
// writes <out-dir>/edition.json, field.json and legacy.json, each the JSON
// envelope `{version:1, slots:[{id:0,state,updatedAt}], activeSlot:0}`,
// and prints one line of JSON describing them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as engine from '../../dist/js/engine.js';
import { createBattle } from '../../dist/js/combat.js';
import { createLifeAtAge } from '../../dist/js/new-life.js';
import { defaultCreatorDraft } from '../../dist/js/creator.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function settle(s, limit = 20) { for (let n = 0; n < limit && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; }
function grow(s, to) { for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); return settle(s); }
function intoBattle(s, kind) {
  s.flags.battlesStarted = (s.flags.battlesStarted || 0) + 1;
  const battle = createBattle(s, kind, null);
  battle.instanceId = `battle-${s.seed}-${s.flags.battlesStarted}`;
  s.battle = battle;
  return s;
}
const envelope = state => ({ version: 1, slots: [{ id: 0, state, updatedAt: new Date().toISOString() }], activeSlot: 0 });

export async function buildHarnessLives(seed = 'harness-v070') {
  // The life the creator makes with its defaults for this seed: an edition
  // life at eighteen, left exactly as the creator leaves it, with the
  // eighteenth-birthday scene waiting. The harness answers that scene in the
  // browser, the way a player would, to reach "Right now".
  const edition = await createLifeAtAge(defaultCreatorDraft(seed));
  if (!engine.validateSave(edition)) throw new Error('The edition life is not a valid save.');
  // The same life with its scene answered, standing in a roaming fight:
  // `createBattle` on an edition life sets `fieldVersion` and the game draws
  // the field page.
  const field = intoBattle(settle(structuredClone(edition)), 'free_beast');
  if (!engine.validateSave(field)) throw new Error('The edition life in battle is not a valid save.');
  // A life of the old edition (born without a station), grown to twenty and
  // put into a forest fight: no `fieldVersion`, so the game draws the older
  // battle page the legacy saves keep.
  let legacy = grow(engine.createBirthGame({ seed: `${seed}-legacy`, station: null, name: 'Oswin Harness' }), 20);
  if (legacy.phase === 'retired') throw new Error('The legacy life did not reach twenty.');
  legacy = intoBattle(legacy, 'forest');
  if (!engine.validateSave(legacy)) throw new Error('The legacy life in battle is not a valid save.');
  return { edition, field, legacy };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const out = process.argv[2];
  if (!out) { console.error('usage: node scripts/lib/interface-harness-lives.mjs <out-dir> [seed]'); process.exit(2); }
  const started = Date.now();
  const lives = await buildHarnessLives(process.argv[3] || 'harness-v070');
  mkdirSync(out, { recursive: true });
  const summary = { ms: Date.now() - started };
  for (const [name, state] of Object.entries(lives)) {
    writeFileSync(join(out, `${name}.json`), JSON.stringify(envelope(state)));
    summary[name] = { seed: state.seed, name: state.hero.name, age: state.age, station: Boolean(state.hero.station), battle: state.battle ? { encounterId: state.battle.encounterId, fieldVersion: state.battle.fieldVersion ?? null, actors: state.battle.actors.length } : null, event: state.event?.id ?? null };
  }
  console.log(JSON.stringify(summary));
}
