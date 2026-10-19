// Versioned, detached Ironman rules. This module has no engine, storage or DOM
// dependency. Only the caller may install a result in a life or persist it.
export const IRONMAN_VERSION = 1;
export const IRONMAN_TERMINAL = 'ironman-death';
const own = (value, key) => Boolean(value && Object.hasOwn(value, key));
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => object(value) && Object.keys(value).length === expected.length && expected.every(key => own(value, key));
const integer = (value, min = 0, max = 10000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max;
const runIdentity = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const copy = value => structuredClone(value);
const sameDeath = (a, b) => a.personId === b.personId && a.day === b.day && a.battleId === b.battleId && a.generation === b.generation;
const companionIds = new Set(['mira', 'orrin', 'kest', 'sable', 'tovin', 'vesper']);
const paladinOaths = Object.freeze({
  mercy: 'Show mercy: never bind an unwilling soul or feed on an unwilling person.',
  truth: 'Speak and act honestly: do not deceive through theft, coerce souls, or prey on unwilling people.',
  protection: 'Protect the vulnerable: do not steal from others, prey on travelers, or bind an unwilling soul.',
});

// A present but invalid claim must not silently become Standard.
export const isIronman = state => own(state, 'ironman');

/** Resolve only the current exact person, never an ancestor sharing a roster ID. */
export function currentIronmanPerson(state, actorId) {
  if (!Array.isArray(state?.lineage?.people)) return null;
  const matches = state.lineage.people.filter(person => actorId === 'hero'
    ? person.id === state.dynasty?.activePersonId && person.source === 'hero' && person.localId === 'hero'
    : person.source === 'companion' && person.localId === actorId && companionIds.has(actorId));
  return matches.length === 1 && text(matches[0].id, 160) ? matches[0] : null;
}

function validCasualty(death, state, startedDay, { applied = true } = {}) {
  if (!keys(death, ['personId', 'day', 'battleId', 'generation']) || !text(death.personId, 160)
      || !integer(death.day, startedDay, state.day) || !text(death.battleId)
      || !integer(death.generation, 1, state.dynasty.generation)) return false;
  const people = state.lineage.people.filter(person => person.id === death.personId);
  const person = people.length === 1 ? people[0] : null;
  // Current companion records become ancestors on succession. The immutable ID
  // retains their original generation and source, unlike their reused roster ID.
  if (!person || !['companion', 'ancestor'].includes(person.source) || !companionIds.has(person.localId)
      || person.id !== `${state.dynasty.id}-g${death.generation}-companion-${person.localId}`
      || !integer(person.bornDay, -10000000, death.day)) return false;
  if (!applied) return true;
  if (person.alive !== false || person.deathDay !== death.day) return false;
  if (person.source === 'companion') {
    const actual = state.companions?.find(value => value.id === person.localId);
    if (!actual || actual.alive !== false || actual.active !== false || actual.recruited !== false || actual.hp !== 0 || actual.deathDay !== death.day) return false;
    if (state.rpg && state.rpg.companionStages?.[person.localId]?.status !== 'dead') return false;
  }
  return true;
}

export function validateIronman(state) {
  if (!isIronman(state)) return true;
  const mode = state.ironman;
  if (!keys(mode, ['version', 'runId', 'startedDay', 'casualties']) || mode.version !== IRONMAN_VERSION
      || !runIdentity(mode.runId) || state.revision !== 5 || !integer(state.day)
      || !integer(mode.startedDay, 0, state.day) || !object(state.dynasty)
      || !text(state.dynasty.id, 80) || !integer(state.dynasty.generation, 1, 200)
      || !Array.isArray(state.lineage?.people) || !currentIronmanPerson(state, 'hero')
      || !Array.isArray(mode.casualties) || mode.casualties.length > state.lineage.people.length
      || new Set(mode.casualties.map(death => death?.personId)).size !== mode.casualties.length) return false;
  return mode.casualties.every(death => validCasualty(death, state, mode.startedDay));
}

/** The randomness provider is explicit and never falls back to time/Math.random. */
export function createIronmanMetadata(state, cryptoProvider = globalThis.crypto) {
  if (isIronman(state) || state?.revision !== 5 || !integer(state.day) || state.battle
      || currentIronmanPerson(state, 'hero')?.alive !== true || !(state.hero?.hp > 0) || state.phase === 'retired'
      || !integer(state.dynasty?.generation, 1, 200)) throw new Error('This opening cannot begin an Ironman run.');
  let runId;
  if (typeof cryptoProvider?.randomUUID === 'function') runId = cryptoProvider.randomUUID();
  else if (typeof cryptoProvider?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoProvider.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    runId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  if (!runIdentity(runId)) throw new Error('Secure random run identity is unavailable.');
  const metadata = { version: IRONMAN_VERSION, runId, startedDay: state.day, casualties: [] };
  if (!validateIronman({ ...state, ironman: metadata })) throw new Error('This opening has no valid Ironman identity.');
  return metadata;
}

/** Only the accepted engine trial choice creates this bounded context. Neither
 * an encounter's title nor a caller-supplied generic boolean authenticates it. */
export function paladinTrialContext(state) {
  if (!isIronman(state) || !validateIronman(state) || state.phase !== 'adult' || !(state.age >= 18)
      || !(state.hero?.hp > 0) || state.hero.path !== 'warrior' || state.hero.specialization !== null
      || currentIronmanPerson(state, 'hero')?.alive !== true || state.flags?.pendingSpecialization !== 'paladin'
      || !own(paladinOaths, state.flags.oathType) || state.flags.oath !== paladinOaths[state.flags.oathType]
      || !text(state.locationId, 160) || !state.world?.locations?.some(place => place.id === state.locationId
        && !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false)) return null;
  return { kind: 'initiation', classId: 'paladin', ownerId: state.dynasty.activePersonId, locationId: state.locationId, oathType: state.flags.oathType };
}

export function validPaladinTrialContext(state, context) {
  const expected = paladinTrialContext(state);
  return Boolean(expected && keys(context, Object.keys(expected)) && Object.keys(expected).every(key => expected[key] === context[key]));
}

export function captureBattleMortality(state, { nonlethal = false, solo = false } = {}) {
  if (!isIronman(state)) return undefined;
  if (!validateIronman(state) || typeof nonlethal !== 'boolean' || typeof solo !== 'boolean') throw new Error('Invalid Ironman battle rules.');
  const hero = currentIronmanPerson(state, 'hero');
  if (hero.alive !== true || !(state.hero?.hp > 0)) throw new Error('A deceased hero cannot enter combat.');
  const participants = [{ actorId: 'hero', personId: hero.id, kind: 'hero' }];
  if (!solo) for (const companion of (state.companions || []).filter(person => person.recruited && person.active).slice(0, 3).filter(person => person.alive !== false && person.hp > 0)) {
    const person = currentIronmanPerson(state, companion.id);
    if (!person || person.alive !== true || person.name !== companion.name
        || companion.bornDay !== undefined && person.bornDay !== companion.bornDay) throw new Error('A companion has no matching living person identity.');
    participants.push({ actorId: companion.id, personId: person.id, kind: 'companion' });
  }
  return { version: IRONMAN_VERSION, runId: state.ironman.runId, lethal: !nonlethal, participants, deaths: [] };
}

function validMortalityShape(battle) {
  const mortality = battle?.mortality;
  if (!keys(mortality, ['version', 'runId', 'lethal', 'participants', 'deaths']) || mortality.version !== IRONMAN_VERSION
      || !runIdentity(mortality.runId) || typeof mortality.lethal !== 'boolean'
      || !Array.isArray(mortality.participants) || mortality.participants.length < 1 || mortality.participants.length > 4
      || !Array.isArray(mortality.deaths) || mortality.deaths.length > mortality.participants.length
      || !Array.isArray(battle.actors)) return false;
  const actorIds = new Set(), personIds = new Set();
  for (const person of mortality.participants) {
    if (!keys(person, ['actorId', 'personId', 'kind']) || !text(person.personId, 160)
        || actorIds.has(person.actorId) || personIds.has(person.personId)
        || !(person.actorId === 'hero' && person.kind === 'hero' || companionIds.has(person.actorId) && person.kind === 'companion')) return false;
    const actor = battle.actors.find(actor => actor.id === person.actorId);
    if (!actor || actor.side !== 'party' || actor.ephemeral) return false;
    actorIds.add(person.actorId); personIds.add(person.personId);
  }
  if (!actorIds.has('hero')) return false;
  const dead = new Set();
  for (const death of mortality.deaths) {
    if (!keys(death, ['actorId', 'personId']) || dead.has(death.actorId)
        || !mortality.participants.some(person => person.actorId === death.actorId && person.personId === death.personId)
        || battle.actors.find(actor => actor.id === death.actorId)?.hp !== 0) return false;
    dead.add(death.actorId);
  }
  return mortality.lethal || mortality.deaths.length === 0;
}

export const combatDead = (battle, actorId) => Boolean(battle?.mortality?.lethal && battle.mortality.deaths?.some(death => death.actorId === actorId));
export const ironmanCombatStopped = battle => battle?.outcome === IRONMAN_TERMINAL;

/** Latch at each decrement, before any reflection/drain/healing or next target. */
export function recordCombatZero(battle, actorId, previousHp) {
  const mortality = battle?.mortality, actor = battle?.actors?.find(actor => actor.id === actorId);
  if (!mortality?.lethal || mortality.version !== IRONMAN_VERSION || !actor) return false;
  if (combatDead(battle, actorId)) { actor.hp = 0; return false; }
  if (!(previousHp > 0) || !(actor.hp <= 0)) return false;
  const person = mortality.participants?.find(person => person.actorId === actorId && actor.side === 'party' && !actor.ephemeral);
  if (!person) return false;
  actor.hp = 0;
  mortality.deaths.push({ actorId, personId: person.personId });
  battle.turnOrder = battle.turnOrder.filter(id => id !== actorId);
  if (person.kind === 'hero') { battle.outcome = IRONMAN_TERMINAL; battle.currentActorId = null; }
  return true;
}

export function validateBattleMortality(battle, state) {
  if (!isIronman(state)) return !own(battle, 'mortality') && battle?.outcome !== IRONMAN_TERMINAL;
  if (!validateIronman(state) || !validMortalityShape(battle) || battle.mortality.runId !== state.ironman.runId) return false;
  const nonlethal = battle.encounterId === 'watchhouse_duel' && battle.tournamentRulesVersion === 1 && battle.context?.kind === 'tournament'
    || battle.encounterId === 'initiation' && validPaladinTrialContext(state, battle.context);
  if (battle.mortality.lethal === nonlethal) return false;
  // Only the known construct is temporary. A roster actor cannot remove its
  // real person identity merely by claiming the caller-controlled flag.
  const construct = battle.actors.find(actor => actor.side === 'party' && actor.id === 'ash_attendant');
  if (construct && construct.ephemeral !== true) return false;
  const realIds = new Set(['hero', ...(state.companions || []).map(person => person.id)]);
  if (battle.actors.some(actor => realIds.has(actor.id) && (actor.side !== 'party' || actor.ephemeral)
      || actor.side === 'party' && !realIds.has(actor.id) && actor.id !== 'ash_attendant')) return false;
  const named = battle.actors.filter(actor => realIds.has(actor.id));
  if (named.length !== battle.mortality.participants.length) return false;
  for (const person of battle.mortality.participants) {
    const record = currentIronmanPerson(state, person.actorId);
    if (record?.id !== person.personId) return false;
    const actor = named.find(actor => actor.id === person.actorId);
    if (!actor || battle.mortality.lethal && actor.hp === 0 && !combatDead(battle, actor.id)) return false;
    if (person.kind === 'hero' && record.alive !== true) return false;
    const casualty = state.ironman.casualties.find(death => death.personId === person.personId);
    if (person.kind === 'companion' && (record.alive === false || casualty)) {
      if (!casualty || casualty.battleId !== battle.instanceId || casualty.day !== state.day
          || casualty.generation !== state.dynasty.generation || actor.hp !== 0
          || !battle.mortality.deaths.some(death => death.actorId === person.actorId && death.personId === person.personId)) return false;
    }
  }
  const heroDead = combatDead(battle, 'hero');
  return heroDead ? battle.outcome === IRONMAN_TERMINAL && battle.currentActorId === null : battle.outcome !== IRONMAN_TERMINAL;
}

/** Deaths may accumulate; the captured run, identities and lethality may not. */
export function sameBattleMortalityPolicy(before, after) {
  if (!own(before, 'mortality') || !own(after, 'mortality')) return !own(before, 'mortality') && !own(after, 'mortality');
  if (!validMortalityShape(before) || !validMortalityShape(after)) return false;
  return ['version', 'runId', 'lethal', 'participants'].every(key => JSON.stringify(before.mortality[key]) === JSON.stringify(after.mortality[key]))
    && before.mortality.deaths.every(death => after.mortality.deaths.some(next => next.actorId === death.actorId && next.personId === death.personId));
}

/** Only companions enter the run-scoped casualty floor; heroes end the run. */
export function ironmanBattleDeaths(state, battle) {
  if (!isIronman(state) || !validateBattleMortality(battle, state) || !text(battle.instanceId)) return [];
  return battle.mortality.deaths.filter(death => death.actorId !== 'hero' && !state.ironman.casualties.some(prior => prior.personId === death.personId))
    .map(death => ({ personId: death.personId, day: state.day, battleId: battle.instanceId, generation: state.dynasty.generation }));
}

export function ironmanHeroDeath(state) {
  const battle = state?.battle;
  if (!battle || !ironmanCombatStopped(battle) || !validateBattleMortality(battle, state) || !text(battle.instanceId)) return null;
  const hero = battle.mortality.deaths.find(death => death.actorId === 'hero');
  return { runId: state.ironman.runId, personId: hero.personId, day: state.day, battleId: battle.instanceId };
}

export function validateCasualtyFloor(state, floor) {
  if (!isIronman(state) || !validateIronman(state)) return false;
  if (floor == null) return true;
  if (!keys(floor, ['startedDay', 'casualties']) || floor.startedDay !== state.ironman.startedDay
      || !Array.isArray(floor.casualties) || new Set(floor.casualties.map(death => death?.personId)).size !== floor.casualties.length) return false;
  return floor.casualties.every(death => validCasualty(death, state, floor.startedDay)
    && state.ironman.casualties.some(candidate => sameDeath(candidate, death)));
}

export function mergeCasualtyFloor(floor, state) {
  if (!validateCasualtyFloor(state, floor)) return null;
  return { startedDay: state.ironman.startedDay, casualties: copy(state.ironman.casualties) };
}
