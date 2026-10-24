// The content schema (v0.70): one validator per kind of content, as plain
// functions. Every content file is `{ kind, schemaVersion: 1, items: [...] }`.
// The vocabulary (roles, effects, scope paths) is anchored on what the engine's
// authored scenes do today in faith.js, guild.js and living-world.js, so that
// v0.71 can author the farmer's life as data and the engine can execute it.
// docs/content-schema.md documents every field; this file is the law.
import { PERSONALITY_TRAITS, ACQUIRED_TRAITS, INTENT_TAGS } from '../../dist/js/personality.js';
import { STATIONS } from '../../dist/js/station.js';
import { CREDENTIAL_LABELS } from '../../dist/js/schooling.js';
import { FAITHS, REGION_TEMPLATES } from '../../dist/js/realm-content-v18.js';
import { tryParse, references, comparisons } from '../lib/conditions.mjs';
import { voiceCheck } from './voice-check.mjs';

export const SCHEMA_VERSION = 1;
export const KINDS = Object.freeze(['scene', 'thread', 'foe', 'place', 'landmark', 'ambition', 'play', 'dialogue', 'design-asset']);

// ---------------------------------------------------------------------------
// Vocabularies. Those the engine exports are imported; the rest are copied
// from engine constants that are not exported, and tests/content-schema.test.js
// holds them to the engine.
export const TRAIT_IDS = Object.freeze([...PERSONALITY_TRAITS, ...ACQUIRED_TRAITS].map(t => t.id)); // personality.js: natures and marks
export const MARK_IDS = TRAIT_IDS; // shiftNature accepts any trait as a mark
export const TAGS = INTENT_TAGS; // personality.js: what a choice means to a nature
export const FACTIONS = Object.freeze(['villagers', 'academy', 'order', 'underworld']); // engine.js: state.factions
export const PATH_STANDINGS = Object.freeze(['guild', 'faith']); // guild.member.standing, faith.member.standing
export const STANDINGS = Object.freeze([...FACTIONS, ...PATH_STANDINGS]);
export const SKILLS = Object.freeze(['weapons', 'defense', 'arcana', 'devotion', 'stealth', 'survival', 'scholarship', 'persuasion']); // engine.js SKILLS
export const ATTRIBUTES = Object.freeze(['strength', 'agility', 'vitality', 'intellect', 'willpower', 'presence']); // personality.js trait attributes
export const TIE_KINDS = Object.freeze(['owes', 'knows', 'hates']); // station.js addStationTie
export const TIE_NOTE_MAX = 120, TIE_NAME_MAX = 60; // station.js addStationTie slices
export const CREDENTIALS = Object.freeze(['letters', ...Object.keys(CREDENTIAL_LABELS), 'journeyman']); // schooling.js; `letters` is isLiterate
export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']); // world.js seasonIndex 0..3
export const STATION_IDS = Object.freeze(STATIONS.map(s => s.id));
export const HOUSEHOLDS = Object.freeze([...new Set(STATIONS.map(s => s.means))]); // station.means: poor, tradesfolk, noble
export const FREEDOMS = Object.freeze(['free', 'bound', 'owned']);
export const ANCESTRIES = Object.freeze(['human', 'elf', 'dwarf', 'halfling', 'orc', 'goblin', 'tiefling', 'beastfolk']); // origins.js ORIGIN_ANCESTRIES
export const PRONOUNS = Object.freeze(['he/him', 'she/her', 'they/them']);
export const REGION_IDS = Object.freeze(REGION_TEMPLATES.map(r => r.id));
export const FAITH_IDS = Object.freeze(FAITHS.map(f => f.id));
export const GUILD_CRAFTS = Object.freeze(['blacksmith', 'merchant', 'miner']); // guild.js
export const GUILD_RANKS = Object.freeze(['journeyman', 'master', 'warden', 'guildmaster']); // guild.js RANKS
export const FAITH_RANKS = Object.freeze(['oblate', 'novice', 'brother', 'keeper', 'prior']); // faith.js RANKS
export const HOME_TIERS = Object.freeze(['lodgings', 'cottage', 'townhouse', 'estate']); // household.js
export const LIVES = Object.freeze(['farmer', 'trader', 'healer', 'lord', 'thief', 'cleric', 'mage', 'soldier']); // the Bible's eight lives
export const VOICES = Object.freeze(['blunt', 'pious', 'sly', 'frightened', 'warm', 'cold', 'learned', 'plain', 'wry', 'weary', 'proud']);
export const PLACE_KINDS = Object.freeze(['village', 'city', 'forest', 'ruin', 'mountain', 'marsh', 'coast', 'tower', 'camp', 'gate', 'citadel', 'sanctuary', // world.js LOCATION_TYPES
  'farmstead', 'manor', 'hall', 'shrine', 'inn', 'market', 'mill', 'barn', 'house', 'dungeon']); // buildings a life's rooms may stand in
export const FOE_ROLES = Object.freeze(['beast', 'undead', 'spirit', 'construct', 'aberration', 'humanoid']); // enemies.js ENEMY_SPECIES role column
export const FOE_PATTERNS = Object.freeze(['striker', 'barbed', 'leech', 'hexer', 'warder', 'sniper', 'keeper', 'thornheart', 'covenant', 'captain', 'archivist', 'warden', // enemies.js aiKey
  'pack', 'ritualist', 'ambusher', 'charger', 'disruptor', 'healer']); // encounter_design_v27 patterns
export const FOE_WEAKNESSES = Object.freeze(['physical', 'fire', 'ice', 'lightning', 'sacred', 'none']);
export const FOE_RESISTANCES = Object.freeze(['burn', 'bleed', 'fear', 'poison']);

// Who a role can be filled by. Each kind names where the engine finds such a person today.
export const ROLE_KINDS = Object.freeze({
  spouse: 'life.partnerId', parent: "people with familyRole 'parent'", child: 'life.children', sibling: "people with familyRole 'sibling'",
  guardian: "people with familyRole 'guardian'", kin: 'living-world presentKin: any present family member',
  friend: "people with role 'friend'", rival: "people with role 'rival' (guild.member.rival, faith.member.rival)", suitor: "people with role 'suitor'",
  neighbour: 'living-world neighbourOf: a society person at the home settlement', companion: 'the party roster', mentor: 'progression.mentors',
  apprentice: 'guild.member.apprentice', classmate: 'education.schooling classmates', master: 'education.schooling.bond.master',
  lord: "the station tie that 'holds the land your family works'", reeve: "the lord's officer in a village (no filler yet; v0.71 adds it)",
  keeper: 'realm.sites[id].keeper', prior: 'faith.member.prior', warden: 'guild.member.warden', creditor: "the station tie of kind 'owes'",
  sergeant: "the levy's sergeant (living-world conscription)", officer: "the court's officer (living-world purge)",
  'named-person': 'a name made for the thread with generatePersonName',
});
export const ROLE_KIND_IDS = Object.freeze(Object.keys(ROLE_KINDS));
export const PERSON_ROLE_KINDS = Object.freeze(ROLE_KIND_IDS.filter(k => !['lord', 'reeve', 'creditor', 'sergeant', 'officer', 'named-person'].includes(k))); // roles that are a person in life.people, so a bond can move
export const ROLE_FIELDS = Object.freeze(['name', 'they', 'them', 'their', 'theirs', 'home', 'trade', 'honorific']);
export const IMPLICIT_ROLES = Object.freeze({ hero: 'the player' }); // every item may say {hero.name}
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/;
const ROLE_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const PREFIX_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*_?$/;
const PLACEHOLDER = /\{([^{}]*)\}/g;
export const TEXT_MAX = 2000;

// The scope a condition reads. `true` is a scalar, an array is the values the
// field takes, `'*'` is a bag of anything (flags). v0.71's scope builder
// produces this shape from a state; until then this is the contract.
export const SCOPE = Object.freeze({
  age: true, day: true, year: true, season: SEASONS, gold: true, debt: true, stress: true, joy: true, health: true, devotion: true,
  literate: true, married: true, children: true,
  hero: { name: true, ancestry: ANCESTRIES, pronouns: PRONOUNS, profession: true, calling: true, station: { id: STATION_IDS, household: HOUSEHOLDS, freedom: FREEDOMS, literate: true, rank: true } },
  standing: Object.fromEntries(STANDINGS.map(k => [k, true])),
  skills: Object.fromEntries(SKILLS.map(k => [k, true])),
  attributes: Object.fromEntries(ATTRIBUTES.map(k => [k, true])),
  nature: true, marks: true, flags: '*', credentials: true, knows: true,
  guild: { member: true, rank: GUILD_RANKS, craft: GUILD_CRAFTS, standing: true },
  faith: { member: true, rank: FAITH_RANKS, standing: true, wing: ['open', 'strict'], congregation: FAITH_IDS },
  home: { tier: HOME_TIERS, place: true, region: REGION_IDS, type: PLACE_KINDS },
  here: { place: true, region: REGION_IDS, type: PLACE_KINDS, shrine: true, settlement: true },
});
// What each function's string argument must be.
const CALL_ARGS = Object.freeze({ mark: MARK_IDS, credential: CREDENTIALS, knows: ROLE_KIND_IDS });

// ---------------------------------------------------------------------------
// Effects: a closed vocabulary with validated arguments. Each op names the
// engine call it stands for.
const int = (v, lo = -Infinity, hi = Infinity) => Number.isInteger(v) && v >= lo && v <= hi;
const nonzero = (v, hi) => int(v, -hi, hi) && v !== 0;
const str = (v, max = TEXT_MAX) => typeof v === 'string' && v.length > 0 && v.length <= max;
const roleRef = (c, v, path, personOnly = false) => {
  if (typeof v !== 'string' || !c.roles.has(v)) return c.err(path, 'effect.unknown-role', `names a role that is not declared: ${JSON.stringify(v)}`);
  const kind = c.roles.get(v);
  if (personOnly && v === 'hero') return c.err(path, 'effect.not-a-person', 'the hero is not a role here; leave role out for the hero');
  if (personOnly && kind && !PERSON_ROLE_KINDS.includes(kind)) return c.err(path, 'effect.not-a-person', `role ${v} is ${kind}, which is not a person in the life`);
  return true;
};
export const EFFECT_OPS = Object.freeze({
  // ctx.standing(faction, n) in engine.js; guild.member.standing / faith.member.standing in guild.js and faith.js
  standing: { args: ['who', 'by'], check: (e, c, p) => { if (!STANDINGS.includes(e.who)) c.err(p, 'effect.bad-arg', `standing.who must be one of ${STANDINGS.join(', ')}`); if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'standing.by is a non-zero integer within ±100'); } },
  // s.hero.gold += n (living-world strike, faith tithe)
  gold: { args: ['by'], check: (e, c, p) => { if (!nonzero(e.by, 10000)) c.err(p, 'effect.bad-arg', 'gold.by is a non-zero integer'); } },
  // s.life.stress clamped 0..100 (faith.js stress(), living-world stress())
  stress: { args: ['by'], check: (e, c, p) => { if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'stress.by is a non-zero integer within ±100'); } },
  // s.life.happiness clamped 0..100 (faith.js joy())
  joy: { args: ['by'], check: (e, c, p) => { if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'joy.by is a non-zero integer within ±100'); } },
  // s.life.health (fortune.js: the hare under the coat)
  health: { args: ['by'], check: (e, c, p) => { if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'health.by is a non-zero integer within ±100'); } },
  // s.hero.hp by a share of maxHp (living-world wolves and levy: Math.round(maxHp * 0.25))
  wound: { args: ['share'], check: (e, c, p) => { if (typeof e.share !== 'number' || !(e.share > 0 && e.share < 1)) c.err(p, 'effect.bad-arg', 'wound.share is a number between 0 and 1, the share of full health lost'); } },
  // s.realm.devotion clamped 0..100 (faith.js devote())
  devotion: { args: ['by'], check: (e, c, p) => { if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'devotion.by is a non-zero integer within ±100'); } },
  // s.hero.skills[id] += n (engine.js skill(); living-world +1 survival, persuasion, weapons)
  skill: { args: ['id', 'by'], check: (e, c, p) => { if (!SKILLS.includes(e.id)) c.err(p, 'effect.bad-arg', `skill.id must be one of ${SKILLS.join(', ')}`); if (!int(e.by, 1, 3)) c.err(p, 'effect.bad-arg', 'skill.by is 1 to 3'); } },
  // shiftNature(s, id, title, text) in personality.js: what life wrote on the hero
  mark: { args: ['id', 'title?', 'text?'], check: (e, c, p) => { if (!MARK_IDS.includes(e.id)) c.err(p, 'effect.bad-arg', `mark.id must be a trait: ${MARK_IDS.join(', ')}`); if (e.title !== undefined) c.text(`${p}.title`, e.title, 120); if (e.text !== undefined) c.text(`${p}.text`, e.text); } },
  // addStationTie(s, { kind, name, note }) in station.js; the name is a role's or a literal (living-world: 'the officers of the purge')
  tie: { args: ['kind', 'role?', 'name?', 'note'], check: (e, c, p) => { if (!TIE_KINDS.includes(e.kind)) c.err(p, 'effect.bad-arg', `tie.kind must be one of ${TIE_KINDS.join(', ')}`); if ((e.role === undefined) === (e.name === undefined)) c.err(p, 'effect.bad-arg', 'tie names exactly one of role or name'); if (e.role !== undefined) roleRef(c, e.role, `${p}.role`); if (e.name !== undefined) c.text(`${p}.name`, e.name, TIE_NAME_MAX); c.text(`${p}.note`, e.note, TIE_NOTE_MAX); } },
  // person.bond clamped 0..100 (living-world bond(), guild.js bond())
  bond: { args: ['role', 'by'], check: (e, c, p) => { roleRef(c, e.role, `${p}.role`, true); if (!nonzero(e.by, 100)) c.err(p, 'effect.bad-arg', 'bond.by is a non-zero integer within ±100'); } },
  // ctx.journalLiteral(title, text, tag): the line the player reads in the journal
  journal: { args: ['title?', 'text', 'tag?'], check: (e, c, p) => { if (e.title !== undefined) c.text(`${p}.title`, e.title, 120); c.text(`${p}.text`, e.text); if (e.tag !== undefined && !/^[a-z]{2,30}$/.test(String(e.tag))) c.err(p, 'effect.bad-arg', 'journal.tag is a short lower-case word'); } },
  // t.memory.push(text): the short line the thread remembers (faith say(), guild and living-world t.memory)
  memory: { args: ['text'], check: (e, c, p) => c.text(`${p}.text`, e.text, 300) },
  // t.followUp = { season: season + n, … } then followUp() later: another scene, some seasons on, perhaps only on a roll
  followUp: { args: ['scene', 'seasons', 'chance?'], check: (e, c, p) => { if (!str(e.scene, 80) || !ID_PATTERN.test(e.scene)) c.err(p, 'effect.bad-arg', 'followUp.scene is a scene id'); else c.ref('scene', e.scene, `${p}.scene`); if (!int(e.seasons, 1, 40)) c.err(p, 'effect.bad-arg', 'followUp.seasons is 1 to 40'); if (e.chance !== undefined && !int(e.chance, 1, 99)) c.err(p, 'effect.bad-arg', 'followUp.chance is 1 to 99 when given'); } },
  // openThread(s, def, roles): a thread begins
  open: { args: ['thread'], check: (e, c, p) => { if (!str(e.thread, 80) || !ID_PATTERN.test(e.thread)) c.err(p, 'effect.bad-arg', 'open.thread is a thread id'); else c.ref('thread', e.thread, `${p}.thread`); } },
  // s.flags[id] = value (engine.js flags)
  flag: { args: ['id', 'value'], check: (e, c, p) => { if (!str(e.id, 60) || !ID_PATTERN.test(e.id)) c.err(p, 'effect.bad-arg', 'flag.id is an id'); if (!['boolean', 'number', 'string'].includes(typeof e.value)) c.err(p, 'effect.bad-arg', 'flag.value is a boolean, number or string'); } },
  // ctx.endLife(cause) for the hero; ctx.killPerson(id, cause, day, { title, text }) for a role
  death: { args: ['role?', 'cause', 'title?', 'text?'], check: (e, c, p) => { if (e.role !== undefined) roleRef(c, e.role, `${p}.role`, true); c.text(`${p}.cause`, e.cause, 160); if (e.title !== undefined) c.text(`${p}.title`, e.title, 120); if (e.text !== undefined) c.text(`${p}.text`, e.text); } },
  // ctx.addEvidence(amount, description): the court's book (one book, not one per court)
  evidence: { args: ['by?', 'text'], check: (e, c, p) => { if (e.by !== undefined && !int(e.by, 1, 10)) c.err(p, 'effect.bad-arg', 'evidence.by is 1 to 10 when given'); c.text(`${p}.text`, e.text, 300); } },
  // ctx.addObligation(id, title, days, description): a promise with a date (living-world bedside)
  obligation: { args: ['id', 'title', 'days', 'text'], check: (e, c, p) => { if (!str(e.id, 60) || !ID_PATTERN.test(e.id)) c.err(p, 'effect.bad-arg', 'obligation.id is an id'); c.text(`${p}.title`, e.title, 120); if (!int(e.days, 1, 365)) c.err(p, 'effect.bad-arg', 'obligation.days is 1 to 365'); c.text(`${p}.text`, e.text); } },
  // site.security / site.prosperity clamped 0..100 for the home site (living-world markEvent, wolves_return)
  place: { args: ['security?', 'prosperity?'], check: (e, c, p) => { if (e.security === undefined && e.prosperity === undefined) c.err(p, 'effect.bad-arg', 'place changes security or prosperity'); for (const k of ['security', 'prosperity']) if (e[k] !== undefined && !nonzero(e[k], 100)) c.err(p, 'effect.bad-arg', `place.${k} is a non-zero integer within ±100`); } },
});
export const EFFECT_OP_IDS = Object.freeze(Object.keys(EFFECT_OPS));

// ---------------------------------------------------------------------------
// The collector: one per file. Errors stop a file being compiled; warnings and
// voice hits are reported. `refs` are checked across the tree afterwards.
class Collector {
  constructor(file) { this.file = file; this.errors = []; this.warnings = []; this.voice = []; this.refs = []; this.texts = 0; this.roles = new Map(); }
  err(path, code, message) { this.errors.push({ file: this.file, path, code, message }); return false; }
  warn(path, code, message) { this.warnings.push({ file: this.file, path, code, message }); }
  ref(kind, id, path) { this.refs.push({ file: this.file, kind, id, path, item: this.item }); }
  /** A text field the player reads: present, in the voice, placeholders resolved. */
  text(path, value, max = TEXT_MAX) {
    this.texts++;
    if (typeof value !== 'string') return this.err(path, 'text.type', 'must be a string');
    if (!value.trim()) return this.err(path, 'text.empty', 'is empty');
    if (value.length > max) this.err(path, 'text.long', `is longer than ${max} characters`);
    for (const hit of voiceCheck(value)) {
      if (hit.kind === 'placeholder') this.err(path, 'text.placeholder', `contains "${hit.phrase}"`);
      else { this.warn(path, 'voice', `says "${hit.phrase}"`); this.voice.push({ file: this.file, path, phrase: hit.phrase }); }
    }
    for (const m of value.matchAll(PLACEHOLDER)) {
      const [role, field, ...rest] = m[1].split('.');
      if (!field || rest.length) { this.err(path, 'placeholder.shape', `{${m[1]}} is not {role.field}`); continue; }
      if (!this.roles.has(role)) this.err(path, 'placeholder.undeclared-role', `{${m[1]}} names a role this item does not declare`);
      else if (!ROLE_FIELDS.includes(field)) this.err(path, 'placeholder.unknown-field', `{${m[1]}}: a role has ${ROLE_FIELDS.join(', ')}`);
    }
    return true;
  }
  /** A condition: parses, reads only the known scope, compares to values the scope can take. */
  condition(path, value) {
    if (typeof value !== 'string') return this.err(path, 'condition.type', 'must be a string');
    const r = tryParse(value);
    if (!r.ok) return this.err(path, 'condition.parse', `${r.error.message} at ${r.error.position} in ${JSON.stringify(value)}`);
    const { paths, calls } = references(r.ast), nodeAt = p => { let node = SCOPE; for (const k of p) { if (node === '*') return '*'; if (node === true || Array.isArray(node) || !Object.hasOwn(node, k)) return undefined; node = node[k]; } return node; };
    for (const { path: p } of paths) {
      const node = nodeAt(p);
      if (node === undefined) this.err(path, 'condition.unknown-path', `${p.join('.')} is not in the scope`);
      else if (node !== true && node !== '*' && !Array.isArray(node)) this.err(path, 'condition.unknown-path', `${p.join('.')} needs a field: ${Object.keys(node).join(', ')}`);
    }
    for (const call of calls) {
      const want = CALL_ARGS[call.name];
      if (!['has', 'in', 'mark', 'flag', 'knows', 'credential'].includes(call.name)) { this.err(path, 'condition.unknown-function', `${call.name}() is not a function the scope knows`); continue; }
      if (['mark', 'flag', 'knows', 'credential'].includes(call.name)) {
        if (call.args.length !== 1 || call.args[0].type !== 'str') { this.err(path, 'condition.bad-call', `${call.name}() takes one quoted id`); continue; }
        if (want && !want.includes(call.args[0].value)) this.err(path, 'condition.unknown-value', `${call.name}('${call.args[0].value}'): not one of ${want.join(', ')}`);
      }
      if (call.name === 'has') { if (call.args.length !== 2) this.err(path, 'condition.bad-call', 'has(list, value) takes two arguments'); else if (call.args[0].type === 'path' && call.args[0].path.join('.') === 'nature' && call.args[1].type === 'str' && !TRAIT_IDS.includes(call.args[1].value)) this.err(path, 'condition.unknown-value', `has(nature, '${call.args[1].value}'): not a trait`); }
      if (call.name === 'in') { if (call.args.length < 2) this.err(path, 'condition.bad-call', 'in(value, option, …) takes a value and at least one option'); else if (call.args[0].type === 'path') { const node = nodeAt(call.args[0].path); if (Array.isArray(node)) for (const a of call.args.slice(1)) if (a.type === 'str' && !node.includes(a.value)) this.err(path, 'condition.unknown-value', `${call.args[0].path.join('.')} is never '${a.value}' (${node.join(', ')})`); } }
    }
    for (const cmp of comparisons(r.ast)) {
      const [side, lit] = cmp.left.type === 'path' ? [cmp.left, cmp.right] : cmp.right.type === 'path' ? [cmp.right, cmp.left] : [null, null];
      if (!side || lit.type !== 'str') continue;
      const node = nodeAt(side.path);
      if (Array.isArray(node) && !node.includes(lit.value)) this.err(path, 'condition.unknown-value', `${side.path.join('.')} is never '${lit.value}' (${node.join(', ')})`);
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Field helpers.
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function fields(c, obj, path, allowed, required) {
  if (!isObj(obj)) return c.err(path, 'item.type', 'must be an object');
  let ok = true;
  for (const k of required) if (obj[k] === undefined) { c.err(`${path}.${k}`, 'item.missing-field', `is required`); ok = false; }
  for (const k of Object.keys(obj)) if (!allowed.includes(k) && !required.includes(k)) c.err(`${path}.${k}`, 'item.unknown-field', `is not a field of this kind (fields: ${[...required, ...allowed].join(', ')})`);
  return ok;
}
function idField(c, v, path, seen, what = 'id') {
  if (typeof v !== 'string' || !ID_PATTERN.test(v) || v.length > 80) return c.err(path, 'id.shape', `${what} is lower-case kebab or snake case, up to 80 characters`);
  if (seen) { if (seen.has(v)) return c.err(path, 'id.duplicate', `${what} ${v} appears twice`); seen.add(v); }
  return true;
}
function enumField(c, v, path, list, what) { if (!list.includes(v)) return c.err(path, 'field.enum', `${what} must be one of ${list.join(', ')}`); return true; }
function roles(c, list, path, extra = {}) {
  c.roles = new Map(Object.entries({ ...IMPLICIT_ROLES, ...extra }).map(([k]) => [k, null]));
  if (list === undefined) return true;
  if (!Array.isArray(list)) return c.err(path, 'roles.type', 'must be an array');
  for (const [i, r] of list.entries()) {
    const p = `${path}[${i}]`;
    if (!fields(c, r, p, ['required'], ['id', 'kind'])) continue;
    if (typeof r.id !== 'string' || !ROLE_ID_PATTERN.test(r.id)) { c.err(`${p}.id`, 'roles.id', 'a role id is a word, like neighbour or oldFriend'); continue; }
    if (c.roles.has(r.id)) { c.err(`${p}.id`, 'roles.duplicate', `role ${r.id} is declared twice (hero is implicit)`); continue; }
    if (!ROLE_KIND_IDS.includes(r.kind)) { c.err(`${p}.kind`, 'roles.kind', `kind must be one of ${ROLE_KIND_IDS.join(', ')}`); continue; }
    if (r.required !== undefined && typeof r.required !== 'boolean') c.err(`${p}.required`, 'roles.required', 'is a boolean');
    c.roles.set(r.id, r.kind);
  }
  return true;
}
function effects(c, list, path) {
  if (!Array.isArray(list)) return c.err(path, 'effects.type', 'must be an array of effects');
  for (const [i, e] of list.entries()) {
    const p = `${path}[${i}]`;
    if (!isObj(e) || typeof e.op !== 'string') { c.err(p, 'effect.shape', 'an effect is { op, …args }'); continue; }
    const def = EFFECT_OPS[e.op];
    if (!def) { c.err(`${p}.op`, 'effect.unknown-op', `${JSON.stringify(e.op)} is not an effect (ops: ${EFFECT_OP_IDS.join(', ')})`); continue; }
    const names = def.args.map(a => a.replace('?', '')), required = def.args.filter(a => !a.endsWith('?'));
    for (const k of required) if (e[k] === undefined) c.err(`${p}.${k}`, 'effect.missing-arg', `${e.op} needs ${k}`);
    for (const k of Object.keys(e)) if (k !== 'op' && !names.includes(k)) c.err(`${p}.${k}`, 'effect.unknown-arg', `${e.op} takes ${names.join(', ')}`);
    if (required.every(k => e[k] !== undefined)) def.check(e, c, p);
  }
  return true;
}
function tags(c, list, path) {
  if (list === undefined) return true;
  if (!Array.isArray(list) || !list.length) return c.err(path, 'tags.type', 'is a non-empty array of intent tags');
  for (const [i, t] of list.entries()) if (!TAGS.includes(t)) c.err(`${path}[${i}]`, 'tags.unknown', `${JSON.stringify(t)} is not an intent tag (${TAGS.join(', ')})`);
  return true;
}
function nature(c, v, path) { if (v !== undefined && !TRAIT_IDS.includes(v)) c.err(path, 'nature.unknown', `nature must be a trait (${TRAIT_IDS.join(', ')})`); }
function optionalCondition(c, v, path) { if (v !== undefined) c.condition(path, v); }
/** Strings anywhere inside a design structure: placeholders only, no voice, no role check. */
function placeholdersOnly(c, value, path) {
  const walk = (v, p) => {
    if (typeof v === 'string') { for (const hit of voiceCheck(v)) if (hit.kind === 'placeholder') c.err(p, 'text.placeholder', `contains "${hit.phrase}"`); c.texts++; }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  };
  walk(value, path);
}

// ---------------------------------------------------------------------------
// The kinds.
function choice(c, ch, p, seen) {
  if (!fields(c, ch, p, ['cost', 'risk', 'nature', 'when', 'locked', 'tags'], ['id', 'label', 'effects', 'result'])) return;
  idField(c, ch.id, `${p}.id`, seen, 'choice id');
  c.text(`${p}.label`, ch.label, 120);
  c.text(`${p}.result`, ch.result);
  if (ch.risk !== undefined) c.text(`${p}.risk`, ch.risk, 200);
  if (ch.cost !== undefined) { if (fields(c, ch.cost, `${p}.cost`, ['days', 'gold'], [])) { if (ch.cost.days === undefined && ch.cost.gold === undefined) c.err(`${p}.cost`, 'choice.cost', 'names days or gold'); for (const k of ['days', 'gold']) if (ch.cost[k] !== undefined && !int(ch.cost[k], 1, 10000)) c.err(`${p}.cost.${k}`, 'choice.cost', `${k} is a positive integer`); } }
  nature(c, ch.nature, `${p}.nature`);
  optionalCondition(c, ch.when, `${p}.when`);
  if (ch.locked !== undefined && fields(c, ch.locked, `${p}.locked`, [], ['when', 'reason'])) { c.condition(`${p}.locked.when`, ch.locked.when); c.text(`${p}.locked.reason`, ch.locked.reason, 200); }
  tags(c, ch.tags, `${p}.tags`);
  effects(c, ch.effects, `${p}.effects`);
}
const scene = (c, it, p) => {
  if (!fields(c, it, p, ['once', 'season', 'when', 'roles', 'tags'], ['id', 'title', 'text', 'choices'])) return;
  roles(c, it.roles, `${p}.roles`);
  c.text(`${p}.title`, it.title, 120); c.text(`${p}.text`, it.text);
  if (it.once !== undefined && typeof it.once !== 'boolean') c.err(`${p}.once`, 'field.type', 'is a boolean');
  if (it.season !== undefined) enumField(c, it.season, `${p}.season`, SEASONS, 'season');
  optionalCondition(c, it.when, `${p}.when`);
  tags(c, it.tags, `${p}.tags`);
  if (!Array.isArray(it.choices) || !it.choices.length || it.choices.length > 6) return c.err(`${p}.choices`, 'scene.choices', 'a scene has 1 to 6 choices');
  const seen = new Set();
  it.choices.forEach((ch, i) => choice(c, ch, `${p}.choices[${i}]`, seen));
  if (!seen.has('continue')) c.warn(`${p}.choices`, 'scene.no-continue', "the house convention: 'continue' is the choice that lets the world take its course");
};
const thread = (c, it, p) => {
  if (!fields(c, it, p, ['roles', 'closes', 'cooldown'], ['id', 'opens', 'stages'])) return;
  roles(c, it.roles, `${p}.roles`);
  c.condition(`${p}.opens`, it.opens);
  optionalCondition(c, it.closes, `${p}.closes`);
  if (it.cooldown !== undefined && !int(it.cooldown, 1, 80)) c.err(`${p}.cooldown`, 'field.type', 'is 1 to 80 seasons');
  if (!Array.isArray(it.stages) || !it.stages.length || it.stages.length > 12) return c.err(`${p}.stages`, 'thread.stages', 'a thread has 1 to 12 stages');
  const seen = new Set();
  it.stages.forEach((st, i) => {
    const sp = `${p}.stages[${i}]`;
    if (!fields(c, st, sp, ['when'], ['id', 'scene', 'after'])) return;
    idField(c, st.id, `${sp}.id`, seen, 'stage id');
    if (idField(c, st.scene, `${sp}.scene`, null, 'scene')) c.ref('scene', st.scene, `${sp}.scene`);
    if (fields(c, st.after, `${sp}.after`, [], ['seasons']) && !int(st.after.seasons, 0, 80)) c.err(`${sp}.after.seasons`, 'field.type', 'is 0 to 80 seasons after the stage before');
    optionalCondition(c, st.when, `${sp}.when`);
  });
};
const play = (c, it, p) => {
  if (!fields(c, it, p, ['roles'], ['id', 'life', 'title', 'setup', 'when', 'days', 'stages', 'fallout'])) return;
  roles(c, it.roles, `${p}.roles`);
  enumField(c, it.life, `${p}.life`, LIVES, 'life');
  c.text(`${p}.title`, it.title, 120); c.text(`${p}.setup`, it.setup); c.text(`${p}.fallout`, it.fallout);
  c.condition(`${p}.when`, it.when);
  if (!int(it.days, 1, 120)) c.err(`${p}.days`, 'field.type', 'days is 1 to 120');
  if (!Array.isArray(it.stages) || !it.stages.length || it.stages.length > 6) return c.err(`${p}.stages`, 'play.stages', 'a play has 1 to 6 stages');
  const seen = new Set();
  it.stages.forEach((st, i) => {
    const sp = `${p}.stages[${i}]`;
    if (!fields(c, st, sp, [], ['id', 'text', 'odds', 'success', 'failure'])) return;
    idField(c, st.id, `${sp}.id`, seen, 'stage id');
    c.text(`${sp}.text`, st.text);
    if (fields(c, st.odds, `${sp}.odds`, ['skill'], ['base', 'words'])) {
      if (!int(st.odds.base, 0, 100)) c.err(`${sp}.odds.base`, 'field.type', 'base is 0 to 100, the chance before skill');
      if (st.odds.skill !== undefined) enumField(c, st.odds.skill, `${sp}.odds.skill`, SKILLS, 'skill');
      if (fields(c, st.odds.words, `${sp}.odds.words`, [], ['good', 'bad'])) { c.text(`${sp}.odds.words.good`, st.odds.words.good, 200); c.text(`${sp}.odds.words.bad`, st.odds.words.bad, 200); }
    }
    effects(c, st.success, `${sp}.success`); effects(c, st.failure, `${sp}.failure`);
  });
};
const ambition = (c, it, p) => {
  if (!fields(c, it, p, ['shame', 'turns', 'roles'], ['id', 'title', 'offeredTo', 'fulfilled', 'saying'])) return;
  roles(c, it.roles, `${p}.roles`);
  c.text(`${p}.title`, it.title, 120); c.text(`${p}.saying`, it.saying, 400);
  if (it.shame !== undefined) c.text(`${p}.shame`, it.shame, 400);
  c.condition(`${p}.offeredTo`, it.offeredTo); c.condition(`${p}.fulfilled`, it.fulfilled);
  if (it.turns !== undefined) {
    if (!Array.isArray(it.turns) || it.turns.length > 8) return c.err(`${p}.turns`, 'ambition.turns', 'turns is an array of up to 8 { when, text }');
    it.turns.forEach((t, i) => { const tp = `${p}.turns[${i}]`; if (fields(c, t, tp, [], ['when', 'text'])) { c.condition(`${tp}.when`, t.when); c.text(`${tp}.text`, t.text); } });
  }
};
const landmark = (c, it, p) => {
  if (!fields(c, it, p, ['roles'], ['id', 'region', 'name', 'plate', 'premise', 'scenes', 'states'])) return;
  roles(c, it.roles, `${p}.roles`);
  enumField(c, it.region, `${p}.region`, REGION_IDS, 'region');
  c.text(`${p}.name`, it.name, 120); c.text(`${p}.plate`, it.plate, 400); c.text(`${p}.premise`, it.premise);
  if (!Array.isArray(it.scenes)) c.err(`${p}.scenes`, 'landmark.scenes', 'is an array of scene ids');
  else it.scenes.forEach((id, i) => { if (idField(c, id, `${p}.scenes[${i}]`, null, 'scene')) c.ref('scene', id, `${p}.scenes[${i}]`); });
  if (!Array.isArray(it.states) || !it.states.length || it.states.length > 8) return c.err(`${p}.states`, 'landmark.states', 'a landmark has 1 to 8 states');
  const seen = new Set();
  it.states.forEach((st, i) => { const sp = `${p}.states[${i}]`; if (fields(c, st, sp, [], ['id', 'when', 'text'])) { idField(c, st.id, `${sp}.id`, seen, 'state id'); c.condition(`${sp}.when`, st.when); c.text(`${sp}.text`, st.text); } });
};
const place = (c, it, p) => {
  if (!fields(c, it, p, ['roles'], ['id', 'name', 'kind', 'rooms'])) return;
  roles(c, it.roles, `${p}.roles`);
  c.text(`${p}.name`, it.name, 120);
  enumField(c, it.kind, `${p}.kind`, PLACE_KINDS, 'kind');
  if (!Array.isArray(it.rooms) || !it.rooms.length || it.rooms.length > 12) return c.err(`${p}.rooms`, 'place.rooms', 'a place has 1 to 12 rooms');
  const seen = new Set();
  it.rooms.forEach((r, i) => {
    const rp = `${p}.rooms[${i}]`;
    if (!fields(c, r, rp, ['text'], ['id', 'name', 'offers'])) return;
    idField(c, r.id, `${rp}.id`, seen, 'room id'); c.text(`${rp}.name`, r.name, 80);
    if (r.text !== undefined) c.text(`${rp}.text`, r.text);
    if (!Array.isArray(r.offers)) c.err(`${rp}.offers`, 'place.offers', 'is an array of action prefixes');
    else r.offers.forEach((o, j) => { if (typeof o !== 'string' || !PREFIX_PATTERN.test(o)) c.err(`${rp}.offers[${j}]`, 'place.offers', `${JSON.stringify(o)} is not an action prefix like faith_ or rest`); });
  });
};
const foe = (c, it, p) => {
  if (!fields(c, it, p, ['tier', 'signature', 'weakness', 'resistances', 'cadence', 'context', 'telegraph', 'habits', 'roles'], ['id', 'name', 'role', 'pattern'])) return;
  roles(c, it.roles, `${p}.roles`);
  c.text(`${p}.name`, it.name, 80);
  enumField(c, it.role, `${p}.role`, FOE_ROLES, 'role'); enumField(c, it.pattern, `${p}.pattern`, FOE_PATTERNS, 'pattern');
  if (it.tier !== undefined && !int(it.tier, 1, 3)) c.err(`${p}.tier`, 'field.type', 'tier is 1 to 3 (battlecraft placeTier)');
  if (it.signature !== undefined) c.text(`${p}.signature`, it.signature);
  if (it.telegraph !== undefined) c.text(`${p}.telegraph`, it.telegraph);
  if (it.weakness !== undefined) enumField(c, it.weakness, `${p}.weakness`, FOE_WEAKNESSES, 'weakness');
  if (it.resistances !== undefined) { if (!Array.isArray(it.resistances)) c.err(`${p}.resistances`, 'field.type', 'is an array'); else it.resistances.forEach((r, i) => enumField(c, r, `${p}.resistances[${i}]`, FOE_RESISTANCES, 'resistance')); }
  if (it.habits !== undefined) { if (!Array.isArray(it.habits) || !it.habits.length || it.habits.length > 6) c.err(`${p}.habits`, 'field.type', 'habits is 1 to 6 lines'); else it.habits.forEach((h, i) => c.text(`${p}.habits[${i}]`, h, 300)); }
  if (it.cadence !== undefined) { if (!isObj(it.cadence) || !Array.isArray(it.cadence.cycle)) c.err(`${p}.cadence`, 'foe.cadence', 'cadence is { cycle: [...], … } as encounter_design_v27 writes it'); else placeholdersOnly(c, it.cadence, `${p}.cadence`); }
  if (it.context !== undefined) { if (!isObj(it.context)) c.err(`${p}.context`, 'foe.context', 'context is an object'); else placeholdersOnly(c, it.context, `${p}.context`); }
};
const dialogue = (c, it, p) => {
  if (!fields(c, it, p, ['when', 'roles'], ['id', 'role', 'voice', 'lines'])) return;
  roles(c, it.roles, `${p}.roles`, { speaker: null });
  if (enumField(c, it.role, `${p}.role`, ROLE_KIND_IDS, 'role')) c.roles.set('speaker', it.role);
  enumField(c, it.voice, `${p}.voice`, VOICES, 'voice');
  optionalCondition(c, it.when, `${p}.when`);
  if (!Array.isArray(it.lines) || !it.lines.length || it.lines.length > 40) return c.err(`${p}.lines`, 'dialogue.lines', 'a dialogue has 1 to 40 lines');
  const seen = new Set();
  it.lines.forEach((ln, i) => {
    const lp = `${p}.lines[${i}]`;
    if (!fields(c, ln, lp, ['when', 'replies'], ['id', 'text'])) return;
    idField(c, ln.id, `${lp}.id`, seen, 'line id'); c.text(`${lp}.text`, ln.text, 600);
    optionalCondition(c, ln.when, `${lp}.when`);
    if (ln.replies === undefined) return;
    if (!Array.isArray(ln.replies) || ln.replies.length > 5) return c.err(`${lp}.replies`, 'dialogue.replies', 'a line has up to 5 replies');
    const rs = new Set();
    ln.replies.forEach((r, j) => { const rp = `${lp}.replies[${j}]`; if (!fields(c, r, rp, ['nature', 'tags', 'effects', 'when'], ['id', 'text'])) return; idField(c, r.id, `${rp}.id`, rs, 'reply id'); c.text(`${rp}.text`, r.text, 400); nature(c, r.nature, `${rp}.nature`); tags(c, r.tags, `${rp}.tags`); optionalCondition(c, r.when, `${rp}.when`); if (r.effects !== undefined) effects(c, r.effects, `${rp}.effects`); });
  });
};
const designAsset = (c, it, p) => placeholdersOnly(c, it, p);
const VALIDATORS = Object.freeze({ scene, thread, play, ambition, landmark, place, foe, dialogue, 'design-asset': designAsset });

// ---------------------------------------------------------------------------
/**
 * Validate one parsed content file. A file without `kind` is a design asset
 * when `options.designAsset` is true (the walker sets it for content/expansion-v27/).
 * Returns { kind, ids, errors, warnings, voice, refs, texts, items }.
 */
export function validateFile(doc, { file = 'content.json', designAsset = false } = {}) {
  const c = new Collector(file), ids = [];
  let items = 0;
  const rolesById = {}, rolesByIndex = []; // declared roles per item, for the cross-check that a thread supplies what its scenes need
  const out = () => ({ file, kind: c.kind || null, ids, items, errors: c.errors, warnings: c.warnings, voice: c.voice, refs: c.refs, texts: c.texts, dialogueRoles: c.dialogueRoles || {}, rolesById, rolesByIndex });
  if (designAsset && (Array.isArray(doc) || (isObj(doc) && doc.kind === undefined))) {
    // A design asset is read by people: it parses, and holds no unwritten text. Its shape is its own.
    c.kind = 'design-asset'; items = Array.isArray(doc) ? doc.length : Array.isArray(doc.items) ? doc.items.length : 1; placeholdersOnly(c, doc, '$'); return out();
  }
  if (!isObj(doc)) { c.err('', 'file.shape', 'a content file is a JSON object'); return out(); }
  if (doc.kind === undefined) { c.err('kind', 'file.kind', `every content file names its kind (${KINDS.join(', ')})`); return out(); }
  if (!KINDS.includes(doc.kind)) { c.err('kind', 'file.kind', `${JSON.stringify(doc.kind)} is not a kind (${KINDS.join(', ')})`); return out(); }
  c.kind = doc.kind;
  if (doc.schemaVersion !== SCHEMA_VERSION) c.err('schemaVersion', 'file.schema-version', `is ${SCHEMA_VERSION}`);
  for (const k of Object.keys(doc)) if (!['kind', 'schemaVersion', 'items', 'note'].includes(k)) c.err(k, 'file.unknown-field', 'a file has kind, schemaVersion, items and an optional note');
  if (!Array.isArray(doc.items)) { c.err('items', 'file.items', 'items is an array'); return out(); }
  items = doc.items.length;
  if (doc.kind === 'design-asset') { placeholdersOnly(c, doc.items, 'items'); return out(); }
  const seen = new Set();
  doc.items.forEach((it, i) => {
    const p = `items[${i}]`;
    c.roles = new Map(); c.item = i;
    if (isObj(it) && idField(c, it.id, `${p}.id`, seen, 'id')) ids.push(it.id);
    VALIDATORS[doc.kind](c, it, p);
    rolesByIndex[i] = isObj(it) && Array.isArray(it.roles) ? it.roles.filter(r => isObj(r) && typeof r.id === 'string').map(r => ({ id: r.id, kind: r.kind, required: r.required !== false })) : [];
    if (isObj(it) && typeof it.id === 'string') rolesById[it.id] = rolesByIndex[i];
    if (doc.kind === 'dialogue' && isObj(it) && typeof it.role === 'string' && Array.isArray(it.lines)) { c.dialogueRoles ||= {}; c.dialogueRoles[it.role] = (c.dialogueRoles[it.role] || 0) + it.lines.length; }
  });
  return out();
}

/**
 * Cross-check a tree of validated files: ids unique per kind across files, and
 * every reference (a thread's scene, a landmark's scenes, followUp.scene,
 * open.thread) names an item that exists. Returns the errors.
 */
export function crossCheck(results) {
  const errors = [], byKind = new Map();
  for (const r of results) {
    if (!r.kind || r.kind === 'design-asset') continue;
    const seen = byKind.get(r.kind) || new Map(); byKind.set(r.kind, seen);
    for (const id of r.ids) { if (seen.has(id)) errors.push({ file: r.file, path: `items(${id})`, code: 'id.duplicate-across-files', message: `${r.kind} ${id} is also in ${seen.get(id)}` }); else seen.set(id, r.file); }
  }
  for (const r of results) for (const ref of r.refs) if (!byKind.get(ref.kind)?.has(ref.id)) errors.push({ file: r.file, path: ref.path, code: 'ref.missing', message: `${ref.kind} ${ref.id} does not exist in the content tree` });
  // A thread carries the roles its scenes read (the engine's `t.roles`), and a scene carries its follow-up's: each must declare what the other needs.
  const sceneRoles = {}; for (const r of results) if (r.kind === 'scene') Object.assign(sceneRoles, r.rolesById);
  const supplies = (have, need, file, path, what) => { for (const n of need.filter(n => n.required)) { const h = have.find(x => x.id === n.id); if (!h) errors.push({ file, path, code: 'ref.role-unsupplied', message: `${what} needs role ${n.id} (${n.kind}), which is not declared here` }); else if (h.kind !== n.kind) errors.push({ file, path, code: 'ref.role-kind', message: `${what} wants role ${n.id} as ${n.kind}; here it is ${h.kind}` }); } };
  for (const r of results) for (const ref of r.refs) {
    if (ref.kind !== 'scene' || !sceneRoles[ref.id]) continue;
    const have = r.rolesByIndex?.[ref.item] || [];
    if (r.kind === 'thread' || (r.kind === 'scene' && /\.effects\[\d+\]\.scene$/.test(ref.path))) supplies(have, sceneRoles[ref.id], r.file, ref.path, `scene ${ref.id}`);
  }
  return errors;
}
