import { companionCombatProfile } from './companion-combat-profile.js';
import { restorativePower } from './combat-rules.js';
import { companionFieldRoomReason } from './field-treatment.js';
import { genericMazeInscriptionNote, recordGenericMazeInscription } from './maze-inscription-note.js';

// This leaf never imports a maze runtime or calculates geometry. Integration
// supplies the canonical roomAt(run, cell), v2 runIdentity, actorId and validActor
// adapters. Missing v2 adapters fail closed; quotes are not execution authority.
const ROLES = Object.freeze({ scout: 'rogue', scholar: 'mage', protector: 'warrior', healer: 'healer' });
const MASTERY = Object.freeze({
  scout: { kest: ['watch_line', 5] },
  scholar: { orrin: ['winter_prison', 3] },
  protector: { mira: ['intercede', 3], tovin: ['rally_standard', 5] },
  healer: { sable: ['purifying_touch', 5] },
});
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const finite = (v, min = 0, max = 100000) => Number.isFinite(v) && v >= min && v <= max;
const livingHp = (v, max = 100000) => finite(v, 0, max) && v > 0;
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && Object.keys(v).every(k => keys.includes(k));
const same = (a, b) => object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);
const identityKeys = ['mazeId', 'runSeed', 'runGeneration', 'manifestVersion', 'family', 'sourceId', 'locationId'];
const actualDamage = (hp, damage) => Math.min(damage, Math.max(0, hp - 1));
const activeParty = s => (s.companions || []).filter(p => p.recruited && p.active).slice(0, 3);
const generation = s => s.dynasty?.generation || 1;
const text = (v, max = 160) => typeof v === 'string' && v.length > 0 && v.length <= max;

function identity(s, m, options) {
  if (!m || ![1, 2].includes(m.version) || !/^maze-\d+$/.test(m.id) || !int(Number(m.id.slice(5)), 1) || !['authored', 'regional', 'contract', 'radiant'].includes(m.kind) || !int(m.generation, 1, 5000)
    || m.seed !== `${s.seed}:maze:${m.generation}:${m.kind}:${m.sourceId}:${m.locationId}:${m.id.slice(5)}`) return null;
  const expected = { mazeId: m.id, runSeed: m.seed, runGeneration: m.generation,
    manifestVersion: m.version === 2 ? 1 : 0, family: m.version === 2 ? m.content?.family : m.kind,
    sourceId: m.sourceId, locationId: m.locationId };
  if (m.version === 2) {
    if (typeof options.runIdentity !== 'function' || typeof options.actorId !== 'function' || typeof options.validActor !== 'function'
      || !['authored', 'signature'].includes(expected.family) || (expected.family === 'authored' ? m.kind !== 'authored' : m.kind !== 'regional')) return null;
    const supplied = options.runIdentity(m);
    if (!exact(supplied, identityKeys) || !identityKeys.every(key => supplied[key] === expected[key])) return null;
  }
  return expected;
}
function actorId(s, options) { return options.actorId ? options.actorId(s) : s.dynasty?.activePersonId || 'hero'; }
function validActor(s, id, options) {
  return typeof id === 'string' && id.length > 0 && id.length <= 160 && (options.validActor ? options.validActor(s, id)
    : id === actorId(s, options) || (s.dynasty?.history || []).some(p => p.personId === id) || (s.lineage?.people || []).some(p => p.id === id));
}
function actorGeneration(s, id, options) {
  return id === actorId(s, options) ? generation(s) : s.dynasty?.history?.find(row => row.personId === id)?.generation;
}
// Local role IDs are re-used after succession. They are action selectors, not
// historical people. Capture the actual lineage identity (or explicit owning
// hero/generation for a legacy roster without lineage) at the accepted action.
function personIdentity(s, p, options) {
  if (!p || !text(p.id) || !text(p.name, 1000)) return null;
  const record = s.lineage?.people?.find(row => row.source === 'companion' && row.localId === p.id);
  const bornDay = Number.isSafeInteger(p.bornDay) ? p.bornDay : record?.bornDay ?? null;
  if (record && (record.name !== p.name || record.bornDay !== bornDay)) return null;
  return { localId: p.id, personId: record?.id || null, name: p.name, bornDay,
    actorId: actorId(s, options), actorGeneration: generation(s) };
}
function validPersonIdentity(s, person, localId, owner, ownerGeneration, options) {
  if (!exact(person, ['localId', 'personId', 'name', 'bornDay', 'actorId', 'actorGeneration']) || person.localId !== localId || !text(localId)
    || !text(person.name, 1000) || !(person.bornDay === null || int(person.bornDay, -10000000, s.day))
    || person.actorId !== owner || person.actorGeneration !== ownerGeneration || !(person.personId === null || text(person.personId))) return false;
  if (owner === actorId(s, options)) {
    const current = s.companions?.find(p => p.id === localId);
    return same(person, personIdentity(s, current, options));
  }
  if (person.personId !== null) {
    const known = s.lineage?.people?.find(p => p.id === person.personId);
    if (known && (known.name !== person.name || known.bornDay !== person.bornDay || known.localId !== localId)) return false;
    if (s.dynasty?.id && person.personId !== `${s.dynasty.id}-g${ownerGeneration}-companion-${localId}`) return false;
  }
  return true;
}
function roomAt(m, cell, options) {
  if (typeof options.roomAt !== 'function') return null;
  const room = options.roomAt(m, cell);
  return room && room.id === cell && !room.contentSlot ? room : null;
}
function mastery(s, helper, kind, day = s.day) {
  const spec = MASTERY[kind]?.[helper.id], stage = s.rpg?.companionStages?.[helper.id];
  if (!spec || !stage || !int(stage.stage, spec[1], 5) || !stage.trainedTechniques?.includes(spec[0])) return null;
  const choice = stage.choices?.[spec[1] - 1];
  if (!choice || !['care', 'trade'].includes(choice.id) || !int(choice.day, 0, day)) return null;
  return { techniqueId: spec[0], chapter: spec[1], day: choice.day, choice: choice.id };
}
function personReason(s, p, { helper = false } = {}) {
  if (!p) return 'Choose a named companion or a living ally.';
  if (p.side && p.side !== 'party') return 'Only a traveling ally can take part.';
  const status = s.rpg?.companionStages?.[p.id]?.status;
  if (p.alive === false || status === 'dead') return 'The deceased cannot take part in field assistance.';
  if (p.available === false || status && status !== 'available') return 'This companion is not present and available.';
  if (!p.recruited || !p.active || !activeParty(s).includes(p)) return 'Only the first three recruited active companions travel with you.';
  if (!finite(p.maxHp, 1) || !finite(p.hp, 0, p.maxHp) || p.hp <= 0) return 'A downed or unrecorded companion cannot take part. Stabilization is separate.';
  if (helper && (!finite(p.maxMp) || !finite(p.mp, 0, p.maxMp))) return 'This companion’s personal Focus is not recorded.';
  return null;
}
function momentReason(s, m, room, options) {
  if (!s?.hero || s.phase === 'retired' || s.hero.alive === false || !livingHp(s.hero.hp) || !finite(s.hero.maxHp, s.hero.hp)) return 'There is no living hero to assist.';
  if (!m || m.status !== 'inside' || m.locationId !== s.locationId || !int(m.tier, 1, 6) || !int(m.position, 0, 120)
    || !Array.isArray(m.visited) || !Array.isArray(m.cleared) || !m.visited.includes(m.position) || !room || !identity(s, m, options)) return 'This current room’s field-assistance context is not available.';
  if (s.battle || s.event || s.conversations?.pending || s.timeline?.journey || s.cartography?.pending || s.cartography?.offsite || m.pendingRoom != null)
    return 'Finish the current moment before requesting field assistance.';
  if (s.rpg?.project || s.stories?.project || s.conversations?.project || s.familyOrigins?.project || s.health?.recovery || s.fellowship?.project
    || s.workshop?.project || s.careers?.batch || s.sanctuaries?.commitment || s.pastimes?.project || s.life?.plan || options.contextReason)
    return options.contextReason || 'Finish or pause your attended commitment first.';
  return null;
}
function snapshot(p, id) {
  return { id, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp };
}
function effect(kind, tier, actor, learned, score, target) {
  const threshold = 8 + tier * 2;
  let focusCost = kind === 'scout' || kind === 'scholar' ? 3 : 4;
  let herbCost = 0, aloneDamage = 0, damage = 0, hpGain = 0, focusGain = 0, bonus = 0, mitigation = 0;
  if (kind === 'scout') {
    bonus = learned ? 3 : 2;
    aloneDamage = actualDamage(target.hp, score >= threshold ? 0 : 4 + tier * 2);
    damage = actualDamage(target.hp, score + bonus >= threshold ? 0 : 4 + tier * 2);
  } else if (kind === 'protector') {
    mitigation = learned ? 3 : Math.min(3, 1 + actor.armor);
    aloneDamage = actualDamage(target.hp, 2 + tier);
    damage = actualDamage(target.hp, Math.max(1, 2 + tier - mitigation));
  } else if (kind === 'scholar') {
    if (learned) focusCost = 4;
    focusGain = Math.min(learned ? 3 : 2, target.maxMp - target.mp);
  } else if (kind === 'healer') {
    herbCost = 1;
    hpGain = Math.min(target.maxHp - target.hp, learned ? 8 : 6, restorativePower(actor, 2) + (learned ? 2 : 0));
  }
  return { focusCost, herbCost, aloneDamage, damage, hpGain, focusGain, bonus, mitigation, threshold };
}

/** Detached exact quote; adapters are trusted integration code, never action data. */
export function quoteMazeFieldAssist(s, kind, helperId, targetId = 'hero', options = {}) {
  const m = s?.maze, room = m && roomAt(m, m.position, options), helper = (s?.companions || []).find(p => p.id === helperId);
  const target = targetId === 'hero' ? s?.hero : (s?.companions || []).find(p => p.id === targetId);
  const q = { kind, helperId, helperName: helper?.name || 'Unknown helper', targetId, targetName: target?.name || 'Unknown target', days: 0,
    focusCost: 0, herbCost: 0, hpGain: 0, focusGain: 0, aloneDamage: 0, damage: 0, disabledReason: null, receipt: null };
  const block = reason => ({ ...q, disabledReason: reason, focusCost: 0, herbCost: 0, hpGain: 0, focusGain: 0, receipt: null,
    ...(helper ? { helperFocusAfter: helper.mp } : {}), ...(target ? { targetHpAfter: target.hp, targetFocusAfter: target.mp } : {}) });
  let reason = momentReason(s, m, room, options);
  if (reason) return block(reason);
  if (!Object.hasOwn(ROLES, kind)) return block('Choose a known field assistance action.');
  reason = personReason(s, helper, { helper: true });
  if (reason) return block(reason);
  if (typeof options.participationReason === 'function' && (reason = options.participationReason(s, helper.id))) return block(reason);
  if (helper.combatExperience !== undefined && !int(helper.combatExperience, 0, 324)) return block('This companion’s recorded growth is not valid.');
  const profile = companionCombatProfile(s, helper), learned = mastery(s, helper, kind);
  if (helper.role !== ROLES[kind] || profile.actor.role !== ROLES[kind]) return block('This companion’s recorded role does not qualify for this assistance.');
  if (!target || targetId !== 'hero' && (reason = personReason(s, target))) return block(reason || 'Choose a living traveling ally.');
  if (target.side && target.side !== 'party' || !livingHp(target.hp) || !finite(target.maxHp, target.hp) || !finite(target.mp) || !finite(target.maxMp, target.mp)) return block('The target’s living Health and Focus must be recorded.');
  if (kind !== 'healer' && targetId !== 'hero') return block('This assistance is for the hero in this current room.');
  const done = m.cleared.includes(room.id);
  if (kind === 'scout' || kind === 'protector') {
    if (room.kind !== 'trap' || done) return block('Choose an unresolved generic hazard in the current room.');
  } else if (kind === 'scholar') {
    if (done || !genericMazeInscriptionNote(room)) return block('Choose an unread generic inscription in the current room.');
  } else {
    reason = companionFieldRoomReason(s, { mazeRoom: room });
    if (reason) return block(reason);
  }
  if (m.fieldAssists !== undefined && !validateMazeFieldAssists(s, m, options)) return block('This room’s recorded assistance is not valid.');
  if (m.fieldAssists?.entries.some(row => row.cellId === room.id)) return block('Companion help has already been used in this room.');
  const score = (s.hero.skills?.survival || 0) + (s.hero.attributes?.agility || 0);
  if (!int(score, 0, 20000)) return block('The hero’s current hazard skill is not recorded.');
  const result = effect(kind, m.tier, profile.actor, learned, score, target);
  Object.assign(q, result, { mastery: learned, helperFocus: helper.mp, helperFocusAfter: helper.mp - result.focusCost,
    targetHp: target.hp, targetHpAfter: target.hp - result.damage + result.hpGain,
    targetFocus: target.mp, targetFocusAfter: target.mp + result.focusGain - (helper === target ? result.focusCost : 0), herbs: s.flags?.herbs || 0 });
  if (kind === 'scout' && score >= result.threshold) return block('You can handle this without spending companion Focus.');
  if ((kind === 'scout' || kind === 'protector') && result.damage >= result.aloneDamage) return block('This assistance would not reduce your actual injury.');
  if (kind === 'scholar' && result.focusGain <= 0) return block('Your Focus is already full. You can still read the inscription yourself.');
  if (kind === 'healer' && result.hpGain <= 0) return block('This ally is already at full Health.');
  if (helper.mp < result.focusCost) return block(`Requires ${result.focusCost} of ${helper.name}’s personal Focus.`);
  if (!int(q.herbs, 0, 1000000000) || q.herbs < result.herbCost) return block('Requires one actual herb bundle as well as the healer’s personal Focus.');
  const currentActor = actorId(s, options);
  if (!validActor(s, currentActor, options) || !int(s.day, m.startedDay)) return block('The attending hero’s identity is not recorded.');
  const helperPerson = personIdentity(s, helper, options), targetPerson = targetId === 'hero' ? null : personIdentity(s, target, options);
  if (!helperPerson || targetId !== 'hero' && !targetPerson) return block('The actual companion’s identity is not recorded.');
  q.receipt = { ...identity(s, m, options), cellId: room.id, roomKind: room.kind, roomVariant: room.variant ?? null, kind, actorId: currentActor,
    actorGeneration: generation(s), actorName: s.hero.name || 'You', visitId: m.expeditionVisit?.id || null, day: s.day, helperId, helperPerson, targetPerson,
    helperRole: profile.actor.role, helperSlot: activeParty(s).indexOf(helper), helper: snapshot(helper, helperId),
    growthEnabled: s.revision >= 5, victories: helper.combatExperience || 0, mastery: learned,
    target: snapshot(target, targetId), heroScore: score, roomClearedBefore: done, herbsBefore: q.herbs,
    ...result, helperFocusAfter: q.helperFocusAfter, targetHpAfter: q.targetHpAfter, targetFocusAfter: q.targetFocusAfter, herbsAfter: q.herbs - result.herbCost };
  return q;
}

/** Re-resolve current IDs and debit only a newly computed valid effect. No day
 * spending, pending project, cached quote, battle command or map update exists. */
export function applyMazeFieldAssist(s, kind, helperId, targetId = 'hero', options = {}, ctx = {}) {
  const q = quoteMazeFieldAssist(s, kind, helperId, targetId, options);
  if (q.disabledReason) return q;
  const m = s.maze, room = roomAt(m, m.position, options), helper = s.companions.find(p => p.id === helperId);
  const target = targetId === 'hero' ? s.hero : s.companions.find(p => p.id === targetId);
  helper.mp -= q.focusCost;
  target.hp = q.targetHpAfter;
  if (q.focusGain) target.mp += q.focusGain;
  if (q.herbCost) s.flags.herbs -= q.herbCost;
  if (['scout', 'protector', 'scholar'].includes(kind)) m.cleared = [...new Set([...m.cleared, m.position])];
  m.fieldAssists ||= { version: 1, entries: [] };
  m.fieldAssists.entries.push(q.receipt);
  if (kind === 'scholar') q.notebookCopyNotice = recordGenericMazeInscription(s, room, ctx).notebookCopyNotice;
  return q;
}

const receiptKeys = [...identityKeys, 'cellId', 'roomKind', 'roomVariant', 'kind', 'actorId', 'actorGeneration', 'actorName', 'visitId', 'day', 'helperId', 'helperPerson', 'targetPerson', 'helperRole', 'helperSlot', 'helper', 'growthEnabled', 'victories', 'mastery', 'target', 'heroScore', 'roomClearedBefore', 'herbsBefore', 'focusCost', 'herbCost', 'aloneDamage', 'damage', 'hpGain', 'focusGain', 'bonus', 'mitigation', 'threshold', 'helperFocusAfter', 'targetHpAfter', 'targetFocusAfter', 'herbsAfter'];
const validSnapshot = value => exact(value, ['id', 'hp', 'maxHp', 'mp', 'maxMp']) && typeof value.id === 'string'
  && finite(value.maxHp, 1) && livingHp(value.hp, value.maxHp) && finite(value.maxMp) && finite(value.mp, 0, value.maxMp);

/** Historical receipts carry bounded formula inputs, not current resources or
 * availability. Execution verifies real attendance; later growth/recovery/death
 * is permitted. This is structural provenance validation, not a cryptographic
 * assertion that an arbitrary imported save's past resources really existed. */
export function validateMazeFieldAssists(s, m = s?.maze, options = {}) {
  if (m?.fieldAssists === undefined) return true;
  const ledger = m.fieldAssists, run = identity(s, m, options);
  if (!run || !exact(ledger, ['version', 'entries']) || ledger.version !== 1 || !Array.isArray(ledger.entries) || ledger.entries.length > 121) return false;
  const cells = new Set(); let lastDay = m.startedDay;
  for (const row of ledger.entries) {
    if (!exact(row, receiptKeys) || !identityKeys.every(key => row[key] === run[key]) || !int(row.cellId, 0, 120) || cells.has(row.cellId)
      || !m.visited.includes(row.cellId) || !int(row.day, lastDay, s.day) || !validActor(s, row.actorId, options) || !Object.hasOwn(ROLES, row.kind)
      || !int(row.actorGeneration, m.generation, generation(s)) || row.actorGeneration !== actorGeneration(s, row.actorId, options)
      || !text(row.actorName, 1000) || row.actorId === actorId(s, options) && row.actorName !== (s.hero.name || 'You')
      || s.dynasty?.history?.find(p => p.personId === row.actorId)?.name && row.actorName !== s.dynasty.history.find(p => p.personId === row.actorId).name
      || !(row.visitId === null || /^maze-visit-[1-9]\d*$/.test(row.visitId)) || !(row.roomVariant === null || int(row.roomVariant, 0, 5))
      || row.helperRole !== ROLES[row.kind] || !int(row.helperSlot, 0, 2) || !validSnapshot(row.helper) || row.helper.id !== row.helperId
      || !validSnapshot(row.target) || !int(row.victories, 0, 324) || typeof row.growthEnabled !== 'boolean' || !int(row.heroScore, 0, 20000)
      || typeof row.roomClearedBefore !== 'boolean' || !int(row.herbsBefore, 0, 1000000000)) return false;
    const currentLife = row.actorId === actorId(s, options), helper = currentLife ? s.companions?.find(p => p.id === row.helperId) : null, target = row.target;
    if (!validPersonIdentity(s, row.helperPerson, row.helperId, row.actorId, row.actorGeneration, options)
      || currentLife && (!helper || helper.role !== row.helperRole || companionCombatProfile(s, helper).actor.role !== row.helperRole)
      || (target.id === 'hero' ? row.targetPerson !== null : !validPersonIdentity(s, row.targetPerson, target.id, row.actorId, row.actorGeneration, options))) return false;
    if (row.helperId === target.id && !same(row.helper, target)) return false;
    if (row.helperId === target.id && !same(row.helperPerson, row.targetPerson)) return false;
    const room = roomAt(m, row.cellId, options);
    if (!room || row.roomKind !== room.kind || row.roomVariant !== (room.variant ?? null)) return false;
    if (row.kind === 'scout' || row.kind === 'protector') {
      if (room.kind !== 'trap' || row.roomClearedBefore || target.id !== 'hero' || !m.cleared.includes(row.cellId)) return false;
    } else if (row.kind === 'scholar') {
      if (!genericMazeInscriptionNote(room) || row.roomClearedBefore || target.id !== 'hero' || !m.cleared.includes(row.cellId)) return false;
    } else if (!['entrance', 'empty', 'cache', 'camp', 'inscription', 'objective', 'enemy', 'guardian', 'trap'].includes(room.kind)
      || ['enemy', 'guardian', 'trap'].includes(room.kind) && !row.roomClearedBefore || row.roomClearedBefore && !m.cleared.includes(row.cellId)) return false;
    if (row.mastery !== null) {
      const spec = MASTERY[row.kind]?.[row.helperId];
      if (!spec || !exact(row.mastery, ['techniqueId', 'chapter', 'day', 'choice']) || row.mastery.techniqueId !== spec[0] || row.mastery.chapter !== spec[1]
        || !int(row.mastery.day, 0, row.day) || !['care', 'trade'].includes(row.mastery.choice)) return false;
      // A current life's chapter evidence still exists and must agree. Ancestor
      // receipts retain the bounded source because succession resets chapters.
      if (currentLife && !same(row.mastery, mastery(s, helper, row.kind, row.day))) return false;
    }
    const historical = companionCombatProfile({ revision: row.growthEnabled ? 5 : 4 }, { ...row.helper, role: row.helperRole, combatExperience: row.victories }).actor;
    const result = effect(row.kind, m.tier, historical, row.mastery, row.heroScore, target);
    if (!Object.keys(result).every(key => row[key] === result[key]) || row.helper.mp < result.focusCost || row.herbsBefore < result.herbCost
      || row.helperFocusAfter !== row.helper.mp - result.focusCost || row.herbsAfter !== row.herbsBefore - result.herbCost
      || row.targetHpAfter !== target.hp - result.damage + result.hpGain
      || row.targetFocusAfter !== target.mp + result.focusGain - (row.helperId === target.id ? result.focusCost : 0)) return false;
    if (row.kind === 'scout' && row.heroScore >= result.threshold || ['scout', 'protector'].includes(row.kind) && result.damage >= result.aloneDamage
      || row.kind === 'scholar' && result.focusGain <= 0 || row.kind === 'healer' && result.hpGain <= 0) return false;
    cells.add(row.cellId); lastDay = row.day;
  }
  return true;
}

/** Closed visit accounts can outlive physical maps. Recheck the same bounded
 * formula/person/run schema without inventing a map or making it action
 * authority. Retained physical runs are checked separately and must contain
 * the identical accepted receipt. */
export function validateMazeFieldAssistReceipt(s, row) {
  if (!object(row) || ![0, 1].includes(row.manifestVersion) || !int((row.threshold - 8) / 2, 1, 6)) return false;
  const version = row.manifestVersion === 1 ? 2 : 1;
  const kind = version === 2 ? row.family === 'authored' ? 'authored' : 'regional' : row.family;
  const run = { version, id: row.mazeId, seed: row.runSeed, generation: row.runGeneration, kind, sourceId: row.sourceId, locationId: row.locationId,
    tier: (row.threshold - 8) / 2, startedDay: 0, visited: [row.cellId], cleared: row.roomClearedBefore || row.kind !== 'healer' ? [row.cellId] : [],
    ...(version === 2 ? { content: { family: row.family } } : {}), fieldAssists: { version: 1, entries: [row] } };
  return validateMazeFieldAssists(s, run, {
    roomAt: () => ({ id: row.cellId, kind: row.roomKind, variant: row.roomVariant }),
    runIdentity: () => Object.fromEntries(identityKeys.map(key => [key, row[key]])),
    actorId: state => actorId(state, {}), validActor: (state, id) => validActor(state, id, {}),
  });
}
