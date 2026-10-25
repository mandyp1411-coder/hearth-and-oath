// Battlecraft (v0.68): the field a fight is read on, the arts a calling can
// master, what a fight costs afterwards, who stands beside you, what you know
// of what you fight, and the fights not worth the telling. Edition lives only:
// `state.battlecraft` exists only on them, and a battle made for one carries
// `fieldVersion: 68`. combat.js reads the battle side through the hooks here;
// the engine reads the life side. Legacy saves keep the fight they had.
import { seededRoll } from './world.js';
import { arcanePower, sacredPower, applyStatus } from './combat-rules.js';
import { reaches, livingRow } from './enemy-targets.js';
import { ENEMY_SPECIES, ENEMY_DESCRIPTIONS } from './enemies.js';
import { studyLevel } from './schooling.js';
import { CLASS_CATALOG } from './classes.js';

export const FIELD_VERSION = 68;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const number = (v, d = 0) => Number.isFinite(v) ? v : d;
const low = t => t.charAt(0).toLowerCase() + t.slice(1);
const alive = a => a.hp > 0;

// ---------------------------------------------------------------- the state
export function initializeBattlecraft(s) {
  if (s.battlecraft) return;
  s.battlecraft = { version: 1, arts: [], injuries: [], bestiary: {}, record: { fights: 0, won: 0, lost: 0, fled: 0, settled: 0, kills: {} }, pending: null, lastDay: s.day };
}
export const hasBattlecraft = s => !!s?.battlecraft;

// ---------------------------------------------------------------- the arts
// Every calling keeps its two gifts (the skill and the tactic) as the root of
// the tree and the two earned techniques (techniques-v27) as its second tier.
// Below those: two more at the second tier and four at the third. A row is
// what the art does, in a vocabulary the executor in applyArt understands.
const art = (id, calling, tier, name, cost, target, line, fx = {}) => ({ id, calling, tier, name, cost, target, line, fx });
export const ARTS = Object.freeze([
  // guardian — the line
  art('shield_wall', 'guardian', 2, 'Shield wall', 5, 'self', 'The line holds. Every ally gains 4 ward; you guard the party.', { partyWard: 4, defend: true }),
  art('hook_and_drag', 'guardian', 2, 'Hook and drag', 4, 'enemy', 'A strike that pulls a foe out of the back rank to where you can reach it.', { power: 2, pull: true }),
  art('bulwark', 'guardian', 3, 'Bulwark', 6, 'self', 'Once a fight: a 15-point ward on yourself, and every blow comes to you.', { selfWard: 15, defend: true, once: true }),
  art('iron_step', 'guardian', 3, 'Iron step', 6, 'enemy', 'A strike behind the shield. Anything that is not a lord of its kind loses its next action.', { power: 6, stun: true, interrupt: true }),
  art('last_stand', 'guardian', 3, 'Last stand', 5, 'enemy', 'Below a third of your health, a strike with everything left in it.', { power: 4, desperate: 10, pierce: true }),
  art('stand_fast', 'guardian', 3, 'Stand fast', 7, 'self', 'The word every line waits for: allies cleansed of wounds and fear, 6 ward each.', { partyWard: 6, partyCleanse: true }),
  // berserker — the red
  art('red_mist', 'berserker', 2, 'Red mist', 4, 'enemy', 'Six of your own health for a strike that goes through armour.', { hp: 6, power: 12, pierce: true }),
  art('war_cry', 'berserker', 2, 'War cry', 4, 'self', 'A shout that weakens every foe\'s next stroke by 3 and steels you with 4 ward.', { enemiesStatus: { weakened: [3] }, selfWard: 4 }),
  art('bone_breaker', 'berserker', 3, 'Bone breaker', 6, 'enemy', 'A strike that leaves armour hanging open: 2 points of it count for nothing after.', { power: 8, exposeArmor: 2 }),
  art('whirl', 'berserker', 3, 'The whirl', 7, 'all_enemies', 'Six of your health for a stroke at every living foe.', { hp: 6, power: 2 }),
  art('blood_bound', 'berserker', 3, 'Blood-bound', 5, 'enemy', 'A strike whose wound is half yours to keep: a third of the damage comes back as health.', { power: 5, drain: 3 }),
  art('reckoning', 'berserker', 3, 'The reckoning', 8, 'enemy', 'Once a fight: the heaviest blow you have, and your feet are rooted after it.', { power: 20, pierce: true, once: true, selfStatus: { rooted: [2] } }),
  // knight — the order of battle
  art('shield_bash', 'knight', 2, 'Shield bash', 4, 'enemy', 'The rim of the shield under the chin: a strike that breaks a charge and costs an ordinary foe its action.', { power: 4, stun: true, interrupt: true }),
  art('banner', 'knight', 2, 'Raise the banner', 6, 'self', 'Every ally takes 5 ward and 2 Focus from the sight of it.', { partyWard: 5, partyMp: 2 }),
  art('lance', 'knight', 3, 'The lance', 7, 'enemy', 'From the front rank, a piercing strike with the weight of a horse behind it.', { power: 10, pierce: true, front: true }),
  art('hold_the_line', 'knight', 3, 'Hold the line', 6, 'self', 'You guard, and the party behind you takes 8 ward.', { partyWard: 8, defend: true }),
  art('judgement_of_arms', 'knight', 3, 'Judgement of arms', 6, 'enemy', 'A strike, two marked openings, and a next stroke weakened by 4.', { power: 6, mark: 2, status: { weakened: [4] } }),
  art('rally', 'knight', 3, 'Rally', 7, 'self', 'The order given twice: every ally recovers 8 health and loses their fear.', { partyHeal: 8, partyCleanse: true }),
  // paladin — the oath kept
  art('sacred_shield', 'paladin', 2, 'Sacred shield', 5, 'party', 'A ward of 10 on one ally, and their wounds closed.', { ward: 10, cleanse: true, oath: true }),
  art('smite', 'paladin', 2, 'Smite', 6, 'enemy', 'The oath in the arm: a piercing sacred strike, worse for the dead and the unquiet.', { power: 8, pierce: true, element: 'radiance', oath: true }),
  art('aura', 'paladin', 3, 'Aura of courage', 7, 'self', 'Every ally takes 6 ward and 2 Focus, and no fear stands near you.', { partyWard: 6, partyMp: 2, partyCleanse: true, oath: true }),
  art('lay_on_hands', 'paladin', 3, 'Lay on hands', 6, 'party', 'Twenty-four health to one ally by touch.', { heal: 24, oath: true }),
  art('holy_wrath', 'paladin', 3, 'Holy wrath', 9, 'all_enemies', 'Light at every foe at once, piercing, sacred.', { power: 4, pierce: true, element: 'radiance', oath: true }),
  art('martyr', 'paladin', 3, 'The martyr\'s share', 5, 'self', 'Eight of your own health, and fourteen to every ally.', { hp: 8, partyHeal: 14, oath: true }),
  // healer — the steady hands
  art('triage', 'healer', 2, 'Triage', 5, 'party', 'Fourteen health and every wound, poison and fear cleansed from one ally.', { heal: 14, cleanse: true }),
  art('warding_circle', 'healer', 2, 'Warding circle', 6, 'self', 'A circle drawn in a breath: 5 ward on every ally.', { partyWard: 5 }),
  art('restoration', 'healer', 3, 'Restoration', 8, 'self', 'Sixteen health to every living ally.', { partyHeal: 16 }),
  art('quicken', 'healer', 3, 'Quicken', 4, 'party', 'Six Focus back to one ally, cleansed, with 3 ward.', { mp: 6, cleanse: true, ward: 3 }),
  art('sanctuary', 'healer', 3, 'Sanctuary', 9, 'self', 'Once a fight: 12 ward on every ally.', { partyWard: 12, once: true }),
  art('surgeons_eye', 'healer', 3, 'The surgeon\'s eye', 3, 'enemy', 'You know where it is held together: its next stroke weakened by 4, 1 point of its armour counts for nothing, and you have read it.', { status: { weakened: [4] }, exposeArmor: 1, inspect: true }),
  // elementalist — the four
  art('frost_bolt', 'elementalist', 2, 'Frost bolt', 5, 'enemy', 'Piercing cold. The foe is frozen: the next heavy blow shatters.', { power: 6, pierce: true, element: 'ice', frozen: true }),
  art('spark', 'elementalist', 2, 'Spark', 4, 'enemy', 'A small fire that burns 3 for three turns; on an oiled foe, twice that.', { power: 2, pierce: true, element: 'fire', status: { burn: [3, 3] } }),
  art('storm_call', 'elementalist', 3, 'Storm call', 8, 'all_enemies', 'Lightning at every foe.', { power: 6, pierce: true, element: 'lightning' }),
  art('glacial_prison', 'elementalist', 3, 'Glacial prison', 7, 'enemy', 'Ice that holds: frozen, rooted, and whatever it was preparing is lost.', { power: 8, pierce: true, element: 'ice', frozen: true, status: { rooted: [1] }, interrupt: true }),
  art('inferno', 'elementalist', 3, 'Inferno', 9, 'all_enemies', 'Fire at every foe, and it keeps burning.', { power: 8, pierce: true, element: 'fire', status: { burn: [2, 2] } }),
  art('mana_well', 'elementalist', 3, 'The well', 0, 'self', 'A breath taken from somewhere deep: 10 Focus back and 4 ward.', { selfMp: 10, selfWard: 4, once: true }),
  // druid — the green bargain
  art('thorn_lash', 'druid', 2, 'Thorn lash', 4, 'enemy', 'A whip of briar that leaves a foe bleeding.', { power: 4, pierce: true, status: { bleed: [2, 2] } }),
  art('bark_skin', 'druid', 2, 'Bark skin', 5, 'party', 'Eight ward on one ally, and bleeding and poison drawn out.', { ward: 8, cleanse: true }),
  art('wild_growth', 'druid', 3, 'Wild growth', 8, 'self', 'Ten health and 3 ward to every ally.', { partyHeal: 10, partyWard: 3 }),
  art('strangling_roots', 'druid', 3, 'Strangling roots', 6, 'enemy', 'Roots take the foe: rooted, its next stroke weakened by 5, and its preparation lost.', { status: { rooted: [1], weakened: [5] }, interrupt: true }),
  art('swarm', 'druid', 3, 'The swarm', 7, 'all_enemies', 'Something with many legs at every foe, and poison with it.', { power: 3, pierce: true, status: { poison: [2, 2] } }),
  art('moon_mend', 'druid', 3, 'Moon mend', 7, 'party', 'Twenty health to one ally, cleansed.', { heal: 20, cleanse: true }),
  // necromancer — the disputed dead
  art('grave_chill', 'necromancer', 2, 'Grave chill', 5, 'enemy', 'The cold of the grave: piercing, frozen, and the foe afraid.', { power: 5, pierce: true, element: 'ice', frozen: true, status: { fear: [2] } }),
  art('siphon', 'necromancer', 2, 'Siphon', 4, 'enemy', 'A strike whose damage comes half back to you as health.', { power: 4, pierce: true, drain: 2 }),
  art('bone_shield', 'necromancer', 3, 'Bone shield', 6, 'self', 'Once a fight: 12 ward of old bone around you.', { selfWard: 12, once: true }),
  art('withering', 'necromancer', 3, 'Withering', 6, 'enemy', 'Eight ward stripped from the foe and its next stroke weakened by 6.', { strip: 8, status: { weakened: [6] } }),
  art('plague_breath', 'necromancer', 3, 'Plague breath', 8, 'all_enemies', 'Every foe takes a little and is poisoned.', { power: 3, pierce: true, status: { poison: [3, 2] } }),
  art('death_mark', 'necromancer', 3, 'Death mark', 4, 'enemy', 'Three openings marked and 2 points of armour that count for nothing.', { mark: 3, exposeArmor: 2 }),
  // thief — the opening
  art('pitch_flask', 'thief', 2, 'Pitch flask', 3, 'enemy', 'A flask of pitch thrown from the back: the foe is oiled. Fire does twice its work on oil.', { power: 2, ranged: true, oiled: true }),
  art('vanish', 'thief', 2, 'Vanish', 4, 'self', 'You step back out of reach, veiled for two actions, with 3 ward.', { shiftBack: true, selfStatus: { veil: [4, 2] }, selfWard: 3 }),
  art('backstab', 'thief', 3, 'Backstab', 6, 'enemy', 'A piercing strike, far worse against a marked or weakened foe.', { power: 9, pierce: true, opening: 6 }),
  art('trip', 'thief', 3, 'Trip', 4, 'enemy', 'A foot where it was not expected: an ordinary foe loses its action and its preparation.', { power: 3, stun: true, interrupt: true }),
  art('needle', 'thief', 3, 'The needle', 5, 'enemy', 'A poisoned needle from the back rank.', { power: 2, ranged: true, pierce: true, status: { poison: [3, 3] } }),
  art('shadow_step', 'thief', 3, 'Shadow step', 4, 'enemy', 'You are somewhere else, and the foe has two openings it does not know about.', { mark: 2, shiftBack: true, selfWard: 3 }),
  // ranger — the long sight
  art('pinning_shot', 'ranger', 2, 'Pinning shot', 5, 'enemy', 'An arrow through the foot: piercing, rooted, and the charge lost.', { power: 5, pierce: true, ranged: true, status: { rooted: [1] }, interrupt: true }),
  art('flare_arrow', 'ranger', 2, 'Flare arrow', 4, 'enemy', 'An arrow wrapped and lit: fire, and burning after. Twice that on oil.', { power: 3, ranged: true, element: 'fire', status: { burn: [2, 2] } }),
  art('rain_of_arrows', 'ranger', 3, 'Rain of arrows', 7, 'all_enemies', 'Every foe, from the back rank.', { power: 4, ranged: true }),
  art('hamstring', 'ranger', 3, 'Hamstring', 5, 'enemy', 'An arrow in the tendon: its next stroke weakened by 5 and 1 point of armour open.', { power: 4, ranged: true, status: { weakened: [5] }, exposeArmor: 1 }),
  art('eagle_eye', 'ranger', 3, 'Eagle eye', 3, 'self', 'You read every foe on the field and mark an opening on each.', { markAll: 1, inspectAll: true }),
  art('hunters_mark', 'ranger', 3, 'The hunter\'s mark', 4, 'enemy', 'Three openings on one foe, and what it fears, known.', { mark: 3, inspect: true, ranged: true }),
  // assassin — the quiet
  art('throat_cut', 'assassin', 2, 'Throat cut', 5, 'enemy', 'A piercing strike that leaves the foe bleeding 3 for two turns.', { power: 8, pierce: true, status: { bleed: [3, 2] } }),
  art('smoke_bomb', 'assassin', 2, 'Smoke', 5, 'self', 'The party is veiled for two actions and you are at the back when it clears.', { partyStatus: { veil: [4, 2] }, shiftBack: true }),
  art('killing_blow', 'assassin', 3, 'The killing blow', 7, 'enemy', 'Piercing, and ten more below a third of the foe\'s health.', { power: 10, pierce: true, finisher: 10 }),
  art('nerve_strike', 'assassin', 3, 'Nerve strike', 5, 'enemy', 'An ordinary foe loses its action; any foe its next stroke, weakened by 4.', { power: 2, stun: true, status: { weakened: [4] } }),
  art('black_lotus', 'assassin', 3, 'Black lotus', 6, 'enemy', 'A dart from the back rank: poison 4 for three turns.', { power: 1, ranged: true, status: { poison: [4, 3] } }),
  art('mist_walk', 'assassin', 3, 'Mist walk', 4, 'enemy', 'Gone from the front, two openings marked, 3 ward.', { mark: 2, shiftBack: true, selfWard: 3 }),
  // bard — the verse
  art('battle_hymn', 'bard', 2, 'Battle hymn', 5, 'self', 'Four ward and 2 Focus to every ally.', { partyWard: 4, partyMp: 2 }),
  art('mockery', 'bard', 2, 'Mockery', 3, 'enemy', 'A verse the foe will remember: its next stroke weakened by 5, and afraid.', { status: { weakened: [5], fear: [2] } }),
  art('song_of_rest', 'bard', 3, 'Song of rest', 7, 'self', 'Ten health to every ally, and their wounds cleansed.', { partyHeal: 10, partyCleanse: true }),
  art('chorus_of_blades', 'bard', 3, 'Chorus of blades', 6, 'self', 'Every ally\'s next blow carries 4 more.', { partyStatus: { inspired: [4] } }),
  art('dirge', 'bard', 3, 'The dirge', 7, 'all_enemies', 'Every foe weakened by 3; those that cast are silenced for an action.', { enemiesStatus: { weakened: [3] }, silenceCasters: true }),
  art('encore', 'bard', 3, 'Encore', 4, 'party', 'Once a fight: ten Focus back to one ally and 6 ward.', { mp: 10, ward: 6, once: true }),
]);
export const artById = id => ARTS.find(a => a.id === id) || null;
const MAGIC_CALLINGS = ['elementalist', 'druid', 'necromancer'], SACRED_CALLINGS = ['paladin', 'healer'];
const TECH27 = { guardian: ['intercede', 'shield_rebuke'], berserker: ['blood_momentum', 'iron_fury'], knight: ['disabling_riposte', 'rally_standard'], paladin: ['sanctuary_ring', 'judgment_vow'], healer: ['shared_renewal', 'purifying_touch'], elementalist: ['winter_prison', 'chain_lightning'], druid: ['bramble_circle', 'rootbound'], necromancer: ['grave_attendant', 'soul_unmake'], thief: ['smoke_veil', 'take_opening'], ranger: ['hunters_volley', 'watch_line'], assassin: ['venom_edge', 'execution_window'], bard: ['discord_chorus', 'second_wind'] };
const LEARN = { 2: { days: 3, gold: 15 }, 3: { days: 4, gold: 40 } };
const callingSkill = calling => ({ guardian: 'defense', berserker: 'weapons', knight: 'weapons', paladin: 'devotion', healer: 'devotion', elementalist: 'arcana', druid: 'survival', necromancer: 'arcana', thief: 'stealth', ranger: 'survival', assassin: 'stealth', bard: 'persuasion' })[calling];
const mentorPlace = (calling, s) => s?.progression?.mentors?.[calling]?.locationId || CLASS_CATALOG.find(c => c.id === calling)?.locationId || null;
const learnedSecondTier = (s, calling) => [...(s.rpg?.trainedTechniques || []).filter(id => TECH27[calling]?.includes(id)), ...s.battlecraft.arts.filter(id => artById(id)?.calling === calling && artById(id).tier === 2)].length;

/** The tree as the page shows it: every art of the active calling with what stands between it and you. */
export function treeView(s) {
  const calling = s.hero?.specialization; if (!s.battlecraft || !calling) return null;
  const rows = ARTS.filter(a => a.calling === calling).map(a => ({ ...a, learned: s.battlecraft.arts.includes(a.id), reason: learnReason(s, a) }));
  return { calling, rows, roots: TECH27[calling] || [], secondTierLearned: learnedSecondTier(s, calling) };
}
function learnReason(s, a, { purse = true } = {}) {
  if (s.battlecraft.arts.includes(a.id)) return 'Learned.';
  if (s.hero.specialization !== a.calling) return 'Not your calling.';
  const mentor = s.progression?.mentors?.[a.calling];
  if (!mentor?.met) return 'You have not met the one who teaches it.';
  const skill = callingSkill(a.calling), need = a.tier === 2 ? 6 : 10;
  if (number(s.hero.skills?.[skill]) < need) return `Needs ${skill} ${need}.`;
  if (a.tier === 3 && learnedSecondTier(s, a.calling) < 2) return 'Two arts of the second tier first.';
  if (a.tier === 3 && s.locationId !== mentorPlace(a.calling, s)) return `Taught only at ${low(mentorPlaceName(s, a.calling))}.`;
  if (purse && s.hero.gold < LEARN[a.tier].gold) return `Requires ${LEARN[a.tier].gold} gold.`;
  return null;
}
const mentorPlaceName = (s, calling) => s.world?.locations?.find(l => l.id === mentorPlace(calling, s))?.name || 'the mentor\'s place';

// ---------------------------------------------------------------- injuries
export const INJURIES = Object.freeze({
  bruised: { name: 'Bruised ribs', days: 7, line: 'Every breath for a week reminds you of it. Nothing broken.' },
  broken_arm: { name: 'A broken arm', days: 42, weapons: -3, line: 'Six weeks in a sling if it is set, longer if it is not, and the hand is slow after.' },
  cracked_ribs: { name: 'Cracked ribs', days: 28, maxHp: -10, line: 'Four weeks of shallow breathing. You are less than you were until they knit.' },
  gashed_leg: { name: 'A gashed leg', days: 21, agility: -1, leaves: 'limp', line: 'Deep, and it wants cleaning and a healer. Left alone it will not mend straight.' },
  limp: { name: 'A limp', permanent: true, agility: -2, soldiering: true, line: 'The leg mended crooked. You will not march, stand a watch or run a road again.' },
  lost_eye: { name: 'A lost eye', permanent: true, agility: -1, ranged: -2, line: 'The world is flatter on one side now, and the bow does not trust you.' },
});
const FEVER_DAYS = 7; // an untreated wound has this long before it goes bad
export const activeInjuries = s => (s.battlecraft?.injuries || []).filter(i => i.permanent || i.until > s.day);
export function injuryModifiers(s) {
  const m = { weapons: 0, agility: 0, maxHp: 0, ranged: 0, soldiering: false, names: [] };
  for (const i of activeInjuries(s)) { const d = INJURIES[i.id]; if (!d) continue; m.weapons += d.weapons || 0; m.agility += d.agility || 0; m.maxHp += d.maxHp || 0; m.ranged += d.ranged || 0; m.soldiering ||= !!d.soldiering; m.names.push(d.name); }
  return m;
}
function wound(s, id, ctx, cause) {
  const d = INJURIES[id]; if (!d || s.battlecraft.injuries.some(i => i.id === id && (i.permanent || i.until > s.day))) return null;
  const rec = { id, day: s.day, until: d.permanent ? null : s.day + d.days, permanent: !!d.permanent, treated: false, cause };
  s.battlecraft.injuries = [...s.battlecraft.injuries.filter(i => i.permanent || i.until > s.day), rec].slice(-8);
  ctx.journalLiteral?.(d.name, `${cause} ${d.line}`, 'health');
  return rec;
}
const SOLDIERING = /soldier|guard|watch|scout|ranger|mercenar|knight|sell-?sword/i;
export function applyBattlecraftGates(s, actions) {
  if (!s.battlecraft || !injuryModifiers(s).soldiering) return actions;
  for (const a of actions) {
    if (a.disabledReason) continue;
    if (/^career_(work|accept|choose|shift)/.test(a.id) && SOLDIERING.test(`${a.label || ''} ${a.description || ''} ${s.hero.profession || ''}`)) a.disabledReason = 'Your leg will not carry a soldier\'s day.';
    if (/^(adventure_descend|explore_enter_|calling_train_)/.test(a.id) && /guardian|knight|berserker|ranger/.test(a.id)) a.disabledReason = 'The leg mended crooked. That road is shut.';
  }
  return actions;
}

// ---------------------------------------------------------------- above ground
export function battlecraftActions(s) {
  if (!s.battlecraft || s.phase === 'retired' || s.event || s.battle || s.delve || s.maze || s.timeline?.journey) return [];
  const rows = [];
  const tree = treeView(s);
  if (tree) for (const a of tree.rows.filter(a => !a.learned && a.reason !== 'Not your calling.')) rows.push({ id: `battlecraft_learn_${a.id}`, label: `Learn ${low(a.name)}`, description: `${a.line} ${LEARN[a.tier].days} days and ${LEARN[a.tier].gold} gold.`, days: LEARN[a.tier].days, cost: LEARN[a.tier].gold, category: 'training', ...(a.reason ? { disabledReason: a.reason } : {}) });
  for (const i of activeInjuries(s).filter(i => !i.treated && !i.permanent && i.id !== 'bruised')) {
    const fee = 8;
    rows.push({ id: `battlecraft_treat_${i.id}`, label: `Have the healer see to ${low(INJURIES[i.id].name)}`, description: `Two days and ${fee} gold. Set, cleaned and bound: it mends in half the time and does not go bad.`, days: 2, cost: fee, category: 'recovery', ...(s.hero.gold < fee ? { disabledReason: `Requires ${fee} gold.` } : {}) });
  }
  const archive = s.world?.locations?.find(l => l.id === s.locationId), hasArchive = /city|citadel|sanctuary|tower/.test(archive?.type || '') || (archive?.services || []).some(x => /archiv|librar|school/.test(String(x)));
  if (hasArchive && s.age >= 12) rows.push({ id: 'battlecraft_read_bestiary', label: 'Read what the archive has on the creatures of this country', description: 'Two days and 5 gold with the bestiaries. What lives here, and what it fears, is written down for those who can read it.', days: 2, cost: 5, category: 'study', ...(!isLiterateLike(s) ? { disabledReason: 'You cannot read.' } : {}) });
  return rows;
}
const isLiterateLike = s => !s.education?.schooling || s.education.schooling.literate === true;
/** The engine has spent the days and the fee before this runs. */
export function applyBattlecraftAction(s, id, ctx = {}) {
  if (!s.battlecraft) return false;
  if (id.startsWith('battlecraft_learn_')) {
    const a = artById(id.slice(18)); if (!a || learnReason(s, a, { purse: false })) return false; // the engine took the fee already
    s.battlecraft.arts = [...new Set([...s.battlecraft.arts, a.id])].slice(-40);
    ctx.journalLiteral?.(a.name, `${LEARN[a.tier].days} days with ${s.progression?.mentors?.[a.calling]?.name || 'the one who teaches it'} and it is yours: ${low(a.line)}`, 'progress');
    return true;
  }
  if (id.startsWith('battlecraft_treat_')) {
    const i = s.battlecraft.injuries.find(i => i.id === id.slice(18) && !i.treated && !i.permanent); if (!i) return false;
    i.treated = true; i.until = s.day + Math.max(1, Math.ceil((i.until - s.day) / 2));
    ctx.journalLiteral?.('Set and bound', `The healer sees to ${low(INJURIES[i.id].name)}. It will mend straight now, and sooner.`, 'health');
    return true;
  }
  if (id === 'battlecraft_read_bestiary') {
    const families = ['beast', 'undead', 'spirit', 'construct', 'aberration'], here = s.world?.locations?.find(l => l.id === s.locationId);
    const studied = families.filter((f, i) => seededRoll(s.seed, `bestiary:${s.locationId}:${s.day}:${i}`, 3) > 0);
    for (const f of studied.length ? studied : [families[0]]) for (const row of ENEMY_SPECIES.filter(r => r[4] === f && r[2] !== 'bosses')) { const e = entry(s, row[0]); e.studied = true; }
    ctx.journalLiteral?.('Pages from the bestiaries', `Two days in ${here?.name || 'the archive'} with the bestiaries. ${studied.map(f => FAMILY[f].plural).join(', ') || 'The beasts'}: what they are, where they lie up, and what they fear. You will know it when you see it.`, 'education');
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- the bestiary
const FAMILY = { beast: { plural: 'the beasts', weakness: 'ice', line: 'Flesh and appetite. Cold slows them; fire they fear.' }, undead: { plural: 'the dead', weakness: 'radiance', line: 'What should have stayed buried. Light undoes them; they carry no blood to spill.' }, spirit: { plural: 'the unquiet', weakness: 'radiance', line: 'Not flesh at all. Armour means nothing to them and theirs to you; light and a word spoken right.' }, construct: { plural: 'the made things', weakness: 'lightning', line: 'Stone, clay, wood and old instruction. Lightning breaks what holds them.' }, aberration: { plural: 'the wrong things', weakness: 'fire', line: 'Nothing a bestiary agrees on. Fire, and do not let them speak.' }, humanoid: { plural: 'people', weakness: 'physical', line: 'The most dangerous thing in the country, as ever.' } };
function entry(s, species) { return s.battlecraft.bestiary[species] ||= { met: 0, fought: 0, killed: 0, studied: false }; }
export function speciesOf(actor) {
  if (actor?.illustration?.kind === 'foe' && actor.illustration.species) return actor.illustration.species;
  if (actor?.illustration?.kind === 'person' || actor?.role === 'humanoid') return null;
  const n = String(actor?.name || '').toLowerCase();
  return ENEMY_SPECIES.find(r => n === r[1].toLowerCase() || n.endsWith(' ' + r[1].toLowerCase()))?.[0] || null;
}
/** What a life knows of a species: 0 nothing, 1 met, 2 fought, 3 known (its weakness and its habits). */
export function knowledgeOf(s, species) {
  if (!s.battlecraft || !species) return 0;
  const e = s.battlecraft.bestiary[species]; const schooled = studyLevel(s, 'natural_philosophy') >= 2;
  if (schooled || e?.studied || (e?.killed || 0) >= 2) return 3;
  if (e?.fought) return 2; if (e?.met) return 1; return 0;
}
export function bestiaryView(s) {
  if (!s.battlecraft) return null;
  const rows = Object.entries(s.battlecraft.bestiary).map(([id, e]) => { const r = ENEMY_SPECIES.find(r => r[0] === id); if (!r) return null; const level = knowledgeOf(s, id); return { id, name: r[1], family: r[4], level, met: e.met, fought: e.fought, killed: e.killed, studied: e.studied, description: level >= 1 ? ENEMY_DESCRIPTIONS[id] || null : null, habits: level >= 3 ? FAMILY[r[4]]?.line : null, weakness: level >= 3 ? FAMILY[r[4]]?.weakness : null }; }).filter(Boolean);
  rows.sort((a, b) => b.level - a.level || b.killed - a.killed || a.name.localeCompare(b.name));
  return { rows, schooled: studyLevel(s, 'natural_philosophy') >= 2, families: FAMILY };
}

// ---------------------------------------------------------------- companions
export const loyaltyOf = c => number(c?.loyalty, 50);
const PARTING = 20, BOND = 80;
function shiftLoyalty(s, c, n) { c.loyalty = clamp(Math.round(loyaltyOf(c) + n)); return c.loyalty; }
/** A deed the party saw. kind: 'greed' | 'cruelty' | 'cowardice' | 'mercy' | 'honour' | 'valor'. */
export function companionOpinion(s, kind, ctx = {}) {
  if (!s.battlecraft) return;
  const care = c => (c.values || []).some(v => /protect|consent|heal|mercy|never bind|honest|vulnerable/i.test(v));
  for (const c of (s.companions || []).filter(c => c.recruited && c.active && c.alive !== false)) {
    const n = kind === 'cruelty' ? (care(c) ? -10 : -4) : kind === 'greed' ? (care(c) ? -6 : -2) : kind === 'cowardice' ? -5 : kind === 'mercy' ? (care(c) ? 5 : 2) : kind === 'honour' ? (care(c) ? 4 : 1) : kind === 'valor' ? 3 : 0;
    if (n) shiftLoyalty(s, c, n);
  }
}
function companionDies(s, c, cause, ctx) {
  // The family book keeps a record of every companion; the death goes through it (lineage's
  // killNamedPerson, by way of the context) so the book and the roster agree.
  const written = ctx.killPerson?.(c.id, cause, s.day, { title: `${c.name} is dead`, text: `${cause} ${c.name} did not get up. You have carried their pack long enough to know what was in it.` });
  c.alive = false; c.active = false; c.recruited = false; c.hp = 0; c.deathDay = s.day; c.woundedUntil = 0;
  if (s.rpg?.companionStages?.[c.id]) { s.rpg.companionStages[c.id].status = 'dead'; s.rpg.companionStages[c.id].awayUntil = null; }
  if (s.life) { s.life.happiness = clamp(number(s.life.happiness) - 15); s.life.stress = clamp(number(s.life.stress) + 10); }
  for (const other of (s.companions || []).filter(o => o.id !== c.id && o.recruited && o.alive !== false)) shiftLoyalty(s, other, -5);
  if (!written) ctx.journalLiteral?.(`${c.name} is dead`, `${cause} ${c.name} did not get up. You have carried their pack long enough to know what was in it.`, 'personal');
  s.battlecraft.pending = { kind: 'fallen', companionId: c.id, name: c.name, day: s.day };
}

// ---------------------------------------------------------------- the field: rows and reach
const BACK_ROLES = ['mage', 'healer'], BACK_KEYS = ['sniper', 'hexer', 'warder', 'archivist'];
export function assignRows(battle, game) {
  const party = battle.actors.filter(a => a.side === 'party'), foes = battle.actors.filter(a => a.side === 'enemy');
  for (const a of party) a.row = BACK_ROLES.includes(a.role) ? 'back' : 'front';
  if (party.length && party.every(a => a.row === 'back')) party[0].row = 'front';
  const keyOf = e => ENEMY_SPECIES.find(r => r[0] === e.illustration?.species)?.[5] || e.aiKey;
  for (const e of foes) e.row = foes.length > 1 && e.role !== 'beast' && (BACK_KEYS.includes(keyOf(e)) || e.role === 'spirit' && keyOf(e) !== 'striker') ? 'back' : 'front';
  if (foes.length && foes.every(e => e.row === 'back')) foes[0].row = 'front';
  // People who have fought before take the measure of a stroke repeated at them.
  for (const e of foes) if (e.role === 'humanoid' || e.illustration?.kind === 'person' || /veteran|captain|inquisitor|huntsman|warden$/i.test(e.name)) e.parry = true;
  if (game?.battlecraft) for (const e of foes) { const sp = speciesOf(e); if (sp && knowledgeOf(game, sp) >= 3) e.status.inspected = true; }
}
export { reaches, livingRow };
/** What the melee foes of a wolf pack can do that a lone one cannot. */
export const packFlanks = (battle, actor) => actor.role === 'beast' && battle.actors.filter(a => a.side === 'enemy' && a.role === 'beast' && alive(a)).length >= 2;

// ---------------------------------------------------------------- the field: actions
const trivial = (battle, power) => {
  if (battle.mortality?.lethal === false || battle.actors.some(a => a.side === 'enemy' && (a.bossId || a.namedTarget || /keeper|archivist|thornheart|captain|warden|covenant/.test(a.aiKey || '')))) return false;
  const weight = list => list.reduce((n, a) => n + a.hp + 3 * (a.side === 'party' && !Number.isFinite(a.attackPower) && power ? power(a) : number(a.attackPower, 8)) + 4 * number(a.armor), 0);
  const party = battle.actors.filter(a => a.side === 'party' && alive(a)), foes = battle.actors.filter(a => a.side === 'enemy' && alive(a));
  return party.length > 0 && foes.length > 0 && weight(party) >= 2.2 * weight(foes);
};
export function fieldActions(battle, actor, power) {
  if (battle.fieldVersion !== FIELD_VERSION || actor.side !== 'party') return [];
  const rows = [];
  if (battle.round === 1 && !battle.actors.some(a => a.hp < a.maxHp && a.side === 'enemy') && !battle.actors.some(a => a.side === 'party' && a.id !== actor.id && a.status?.acted) && trivial(battle, power)) rows.push({ id: 'settle', label: 'Settle it quickly', description: 'They are not worth the telling. The party deals with them and comes away with a few scratches; no potions spent, the spoils as usual.', cost: 'Free', needsTarget: false });
  const arts = actor.id === 'hero' ? (actor.arts || []) : [];
  for (const id of arts) {
    const a = artById(id); if (!a || a.calling !== actor.specialization) continue;
    let reason = actor.mp < a.cost ? 'Not enough MP.' : null;
    if (a.fx.oath && actor.oathBroken) reason = 'Your broken oath suppresses this power. Seek atonement.';
    if (a.fx.hp && actor.hp <= a.fx.hp) reason = 'You need enough health to survive its cost.';
    if (a.fx.once && (battle.artsUsed || []).includes(a.id)) reason = 'Once a fight.';
    if (a.fx.front && actor.row !== 'front') reason = 'Only from the front rank.';
    if (a.fx.desperate && actor.hp > actor.maxHp / 3) reason = 'Only below a third of your health.';
    if (actor.status?.silenced && (MAGIC_CALLINGS.includes(a.calling) || SACRED_CALLINGS.includes(a.calling) || a.calling === 'bard')) reason = 'Silenced for this action.';
    rows.push({ id: 'art_' + a.id, label: a.name, description: a.line, cost: a.cost ? `${a.cost} MP${a.fx.hp ? ' · ' + a.fx.hp + ' HP' : ''}` : 'Free', mpCost: a.cost, needsTarget: a.target === 'enemy' || a.target === 'party', targetSide: a.target === 'enemy' || a.target === 'all_enemies' ? 'enemy' : 'party', art: true, ...(reason ? { disabledReason: reason } : {}) });
  }
  if (actor.id === 'hero') for (const c of battle.actors.filter(a => a.side === 'party' && a.id !== 'hero' && alive(a) && number(a.loyalty) >= BOND)) {
    const j = JOINT[c.specialization || c.role]; if (!j) continue;
    let reason = actor.mp < 5 ? 'Not enough MP.' : (battle.artsUsed || []).includes('joint_' + c.id) ? 'Once a fight.' : null;
    rows.push({ id: 'joint_' + c.id, label: `${j.name} (with ${c.name})`, description: j.line, cost: '5 MP', mpCost: 5, needsTarget: j.target === 'enemy', targetSide: j.target === 'enemy' ? 'enemy' : 'party', art: true, ...(reason ? { disabledReason: reason } : {}) });
  }
  const other = actor.row === 'front' ? 'back' : 'front';
  rows.push({ id: 'shift', label: actor.row === 'front' ? 'Step back' : 'Step up', description: actor.row === 'front' ? 'Out of reach of anything without a bow or a spell, while someone stands in front of you.' : 'Into the front rank, where the blows land and the shield is worth something.', cost: 'Your action', needsTarget: false, ...(actor.row === 'front' && !battle.actors.some(a => a.side === 'party' && a.id !== actor.id && alive(a) && a.row === 'front') ? { disabledReason: 'Someone must hold the front.' } : {}) });
  void other;
  return rows;
}
const JOINT = {
  guardian: { name: 'Shield and spear', target: 'enemy', line: 'They take the blow and you take the opening: 8 ward on you, and both of you strike.' },
  elementalist: { name: 'Fire on the oil', target: 'enemy', line: 'Their spark on your stroke: fire, and burning 3 for two turns.' },
  ranger: { name: 'The mark and the blade', target: 'enemy', line: 'Their arrow finds it, your blade follows: two openings and a piercing strike.' },
  healer: { name: 'Hands and voice', target: 'party', line: 'Fourteen health to every ally and every wound closed.' },
  knight: { name: 'The wedge', target: 'enemy', line: 'Two blows as one; an ordinary foe loses its action.' },
  bard: { name: 'The old song', target: 'party', line: 'Six ward and 3 Focus to every ally; every foe\'s next stroke weakened by 2.' },
};

/** Resolves an art, a joint art, a shift or a settling. Returns true when it handled the command. */
export function applyFieldCommand(battle, actor, actionId, target, h) {
  if (battle.fieldVersion !== FIELD_VERSION) return false;
  const allies = battle.actors.filter(a => a.side === 'party' && alive(a)), foes = battle.actors.filter(a => a.side === 'enemy' && alive(a));
  const stopped = () => h.stopped?.() || false;
  const ward = (a, n) => { if (!stopped()) a.status.ward = Math.min(100, number(a.status.ward) + n); };
  const cleanse = a => { for (const k of ['bleed', 'bleedTurns', 'burn', 'burnTurns', 'poison', 'poisonTurns', 'weakened', 'fear', 'silenced', 'rooted', 'frozen', 'oiled']) delete a.status[k]; };
  const status = (a, key, n, turns) => !stopped() && applyStatus(a, key, n, turns, h.log);
  const stun = e => { if (!e.bossId && !/keeper|archivist|thornheart|captain|warden|covenant/.test(e.aiKey || '')) status(e, 'stunned', 1); else h.log(`${e.name} is too great a thing to stagger.`); };
  const interrupt = e => { if (e.status.charged) { delete e.status.charged; h.log(`${e.name}'s preparation is lost.`); } delete e.status.stolenWard; };
  if (actionId === 'shift') { actor.row = actor.row === 'front' ? 'back' : 'front'; h.log(`${actor.name} ${actor.row === 'back' ? 'steps back out of reach' : 'steps up into the front rank'}.`); return true; }
  if (actionId === 'settle') {
    battle.settled = true;
    for (const [i, a] of allies.entries()) { const cost = Math.max(1, Math.round(a.maxHp * (0.04 + seededRoll(battle.instanceId || 'settle', `settle:${i}`, 7) / 100))); if (a.hp > cost) a.hp -= cost; else a.hp = 1; }
    for (const e of foes) e.hp = 0;
    h.log('It is over before it is a story: a few scratches, and the road is clear.');
    return true;
  }
  if (actionId.startsWith('joint_')) {
    const c = battle.actors.find(a => a.id === actionId.slice(6)); const j = JOINT[c?.specialization || c?.role]; if (!c || !j) return false;
    actor.mp -= 5; battle.artsUsed = [...(battle.artsUsed || []), actionId];
    const p = h.power(actor);
    switch (c.specialization || c.role) {
      case 'guardian': ward(actor, 8); h.damage(actor, target, p + 4); if (!stopped() && alive(target)) h.damage(c, target, number(c.attackPower, 10)); break;
      case 'elementalist': h.damage(actor, target, p + 6, { pierce: true }); status(target, 'burn', 3, 2); break;
      case 'ranger': target.status.marked = number(target.status.marked) + 2; h.damage(actor, target, p + 8, { pierce: true }); break;
      case 'healer': for (const a of allies) { h.heal(a, 14); cleanse(a); } break;
      case 'knight': h.damage(actor, target, p + 2); if (!stopped() && alive(target)) h.damage(c, target, number(c.attackPower, 10)); if (alive(target)) stun(target); break;
      case 'bard': for (const a of allies) { ward(a, 6); a.mp = Math.min(a.maxMp, a.mp + 3); } for (const e of foes) status(e, 'weakened', 2); break;
      default: return false;
    }
    h.log(`${actor.name} and ${c.name}: ${low(j.name)}.`);
    return true;
  }
  if (!actionId.startsWith('art_')) return false;
  const a = artById(actionId.slice(4)); if (!a) return false;
  const f = a.fx;
  actor.mp -= a.cost; if (f.once) battle.artsUsed = [...(battle.artsUsed || []), a.id];
  if (f.hp) { h.loseHealth(actor, f.hp); if (stopped()) return true; }
  const base = MAGIC_CALLINGS.includes(a.calling) ? arcanePower(actor) : SACRED_CALLINGS.includes(a.calling) ? sacredPower(actor) : h.power(actor) + (f.ranged ? number(actor.rangedMod) : 0);
  const hit = (e, extra = 0, oiled = !!e.status.oiled) => {
    if (stopped() || !alive(e)) return 0;
    let n = base + number(f.power) + extra;
    if (f.opening && (e.status.marked || e.status.weakened)) n += f.opening;
    if (f.finisher && e.hp <= e.maxHp * 0.35) n += f.finisher;
    if (f.desperate && actor.hp <= actor.maxHp / 3) n += f.desperate;
    if (f.element && (e.resistances || []).includes(f.element)) n = Math.round(n * 0.7);
    if (f.element && e.weakness === f.element) { n += 7; h.log(`${actor.name} finds what ${e.name} fears: ${f.element}.`); }
    if (f.element === 'fire' && oiled) { n += 6; delete e.status.oiled; h.log(`The oil on ${e.name} goes up.`); }
    if (!f.element && e.status.frozen) { n = Math.round(n * 1.5); delete e.status.frozen; h.log(`${e.name} shatters where the cold held it.`); }
    const dealt = h.damage(actor, e, n, { pierce: !!f.pierce });
    if (f.drain && dealt > 0) h.heal(actor, Math.ceil(dealt / f.drain));
    return dealt;
  };
  const afflict = (e, oiled = !!e.status.oiled) => {
    if (!alive(e) || stopped()) return;
    for (const [k, [n, turns]] of Object.entries(f.status || {})) { const doubled = k === 'burn' && oiled; if (doubled) delete e.status.oiled; status(e, k, doubled ? n * 2 : n, turns); }
    if (f.frozen) e.status.frozen = 1; if (f.oiled) e.status.oiled = 1;
    if (f.mark) e.status.marked = number(e.status.marked) + f.mark;
    if (f.strip) e.status.ward = Math.max(0, number(e.status.ward) - f.strip);
    if (f.exposeArmor) e.status.exposedArmor = Math.max(number(e.status.exposedArmor), f.exposeArmor);
    if (f.stun) stun(e); if (f.interrupt) interrupt(e);
    if (f.inspect) { e.status.inspected = true; e.status.marked = number(e.status.marked) + 1; h.log(`${actor.name} reads ${e.name}: ${e.weakness ? 'it fears ' + e.weakness : 'nothing it fears'}.`); }
    if (f.pull && e.row === 'back') { e.row = 'front'; h.log(`${e.name} is dragged into the front rank.`); }
  };
  if (a.target === 'enemy' && target) { const oiled = !!target.status.oiled; hit(target, 0, oiled); afflict(target, oiled); }
  if (a.target === 'all_enemies') for (const e of foes) { if (stopped()) break; const oiled = !!e.status.oiled; if (f.power !== undefined) hit(e, 0, oiled); afflict(e, oiled); }
  if (a.target === 'party' && target) { if (f.heal) h.heal(target, f.heal); if (f.ward) ward(target, f.ward); if (f.mp) target.mp = Math.min(target.maxMp, target.mp + f.mp); if (f.cleanse) cleanse(target); }
  if (f.partyWard || f.partyHeal || f.partyMp || f.partyCleanse || f.partyStatus) for (const al of allies) { if (stopped()) break; if (f.partyWard) ward(al, f.partyWard); if (f.partyHeal) h.heal(al, f.partyHeal); if (f.partyMp) al.mp = Math.min(al.maxMp, al.mp + f.partyMp); if (f.partyCleanse) cleanse(al); for (const [k, [n, turns]] of Object.entries(f.partyStatus || {})) { al.status[k] = n; if (turns !== undefined) al.status[k + 'Turns'] = turns; } }
  if (f.enemiesStatus) for (const e of foes) for (const [k, [n, turns]] of Object.entries(f.enemiesStatus)) status(e, k, n, turns);
  if (f.silenceCasters) for (const e of foes) if (['spirit', 'mage', 'undead'].includes(e.role) || BACK_KEYS.includes(e.aiKey)) status(e, 'silenced', 1);
  if (f.markAll) for (const e of foes) e.status.marked = number(e.status.marked) + f.markAll;
  if (f.inspectAll) for (const e of foes) e.status.inspected = true;
  if (f.selfWard) ward(actor, f.selfWard); if (f.selfMp) actor.mp = Math.min(actor.maxMp, actor.mp + f.selfMp);
  if (f.selfStatus) for (const [k, [n, turns]] of Object.entries(f.selfStatus)) { actor.status[k] = n; if (turns !== undefined) actor.status[k + 'Turns'] = turns; }
  if (f.defend) { actor.defending = true; actor.status.protecting = true; }
  if (f.shiftBack && actor.row === 'front' && allies.some(al => al.id !== actor.id && al.row === 'front')) actor.row = 'back';
  h.log(`${actor.name} uses ${low(a.name)}.`);
  return true;
}
/** A plain attack on the field: the foe's measure of a stroke repeated, and the cold that shatters. Returns the strike's adjustments. */
export function fieldAttack(battle, actor, target, h) {
  const r = { bonus: 0, multiplier: 1, riposte: 0 };
  if (battle.fieldVersion !== FIELD_VERSION) return r;
  if (number(actor.status.inspired)) { r.bonus += actor.status.inspired; delete actor.status.inspired; }
  if (target.status.frozen) { r.multiplier = 1.5; delete target.status.frozen; h.log(`${target.name} shatters where the cold held it.`); }
  if (target.parry) {
    if (target.measuredBy === actor.id && number(target.status.measure) >= 2) { r.multiplier *= 0.5; r.riposte = Math.max(1, Math.round(number(target.attackPower, 6) * 0.7)); target.status.measure = 0; h.log(`${target.name} has ${actor.name}'s measure: the same stroke a third time is turned, and answered.`); }
    else if (target.measuredBy === actor.id) target.status.measure = number(target.status.measure) + 1;
    else { target.measuredBy = actor.id; target.status.measure = 1; }
  }
  return r;
}
export function fieldIntentNote(target) {
  return target.parry && number(target.status?.measure) >= 2 ? ' It has the measure of the last stroke; the same again will be turned.' : '';
}
export const fieldOpening = battle => {
  const back = battle.actors.filter(a => a.side === 'party' && a.row === 'back').map(a => a.name);
  return `The field: ${back.length ? back.join(' and ') + ' at the back, the rest in front' : 'everyone in the front rank'}. Nothing without a bow, a spell or a pack reaches the back rank while the front stands.`;
};
export const fieldDefeatLine = battle => battle.context?.kind === 'delve' ? 'The dark closes over you.' : 'Your party is overwhelmed. What it costs is counted when you come to.';

// ---------------------------------------------------------------- after a fight
/** Injuries, the fallen, loyalty and the bestiary, read from the completed battle. Runs after the engine's own outcome branch. */
export function afterBattlecraftBattle(s, pending, completed, ctx = {}) {
  if (!s.battlecraft || pending.fieldVersion !== FIELD_VERSION || pending.tournamentRulesVersion !== undefined || s.phase === 'retired') return;
  const rec = s.battlecraft.record, out = completed.outcome, gentle = s.difficulty === 'gentle';
  rec.fights++; if (out === 'victory') rec.won++; else if (out === 'defeat') rec.lost++; else if (out === 'retreat') rec.fled++; if (completed.settled) rec.settled++;
  // the bestiary
  for (const e of completed.actors.filter(a => a.side === 'enemy')) { const sp = speciesOf(e); if (!sp) continue; const b = entry(s, sp); b.met++; if (!completed.settled) b.fought++; if (e.hp <= 0 && out === 'victory') { b.killed++; rec.kills[sp] = (rec.kills[sp] || 0) + 1; if (b.killed === 2 && !b.studied && studyLevel(s, 'natural_philosophy') < 2) ctx.journalLiteral?.(`What a ${low(ENEMY_SPECIES.find(r => r[0] === sp)?.[1] || 'thing')} fears`, 'Twice now. You know how it moves, where it is soft, and what it will not come near.', 'education'); } }
  if (completed.settled) return;
  const hero = completed.actors.find(a => a.id === 'hero'), fraction = hero ? hero.hp / Math.max(1, hero.maxHp) : 1;
  // what it cost you
  const salt = `wound:${pending.instanceId}`, roll = seededRoll(s.seed, salt, 100);
  const pick = table => { const r = seededRoll(s.seed, salt + ':kind', 100); let acc = 0; for (const [id, w] of table) { acc += w; if (r < acc) return id; } return table[0][0]; };
  const cause = `${out === 'defeat' ? 'Beaten' : 'Hurt'} in ${low(pending.title || 'a fight')}.`;
  if (out === 'defeat' && !gentle) wound(s, pick([['broken_arm', 30], ['cracked_ribs', 25], ['gashed_leg', 25], ['lost_eye', 10], ['bruised', 10]]), ctx, cause);
  else if (out === 'defeat') wound(s, pick([['bruised', 60], ['gashed_leg', 20], ['cracked_ribs', 20]]), ctx, cause);
  else if (fraction <= 0.1) wound(s, pick([['bruised', 40], ['broken_arm', 20], ['cracked_ribs', 20], ['gashed_leg', 20]]), ctx, cause);
  else if (fraction < 0.25 && roll < 40) wound(s, pick([['bruised', 40], ['broken_arm', 20], ['cracked_ribs', 20], ['gashed_leg', 20]]), ctx, cause);
  else if (fraction < 0.5 && roll < 15) wound(s, pick([['bruised', 60], ['gashed_leg', 20], ['cracked_ribs', 20]]), ctx, cause);
  // who stood beside you
  for (const c of (s.companions || []).filter(c => c.recruited && c.alive !== false)) {
    const a = completed.actors.find(x => x.id === c.id && x.side === 'party'); if (!a) continue;
    if (a.hp <= 0 && (out === 'defeat' || out === 'retreat')) {
      if (!gentle && seededRoll(s.seed, `fall:${pending.instanceId}:${c.id}`, 100) < 50) { companionDies(s, c, out === 'retreat' ? `You came away from ${low(pending.title || 'the fight')} without ${c.name}.` : `${low(pending.title || 'The fight')} went against you.`, ctx); continue; }
      c.hp = 1; c.woundedUntil = s.day + 14; shiftLoyalty(s, c, out === 'retreat' ? -8 : -4);
      ctx.journalLiteral?.(`${c.name}, carried`, `${c.name} is alive, and will not hold a weapon for a fortnight.`, 'personal');
    } else if (a.hp <= 0) { c.hp = 1; c.woundedUntil = s.day + 14; ctx.journalLiteral?.(`${c.name}, carried`, `${c.name} went down and is carried out. A fortnight before they fight again.`, 'personal'); }
    else if (out === 'victory') shiftLoyalty(s, c, 3);
    else if (out === 'retreat') shiftLoyalty(s, c, -1);
    if (c.alive !== false && loyaltyOf(c) < PARTING && !s.battlecraft.pending && !c.partingAsked) s.battlecraft.pending = { kind: 'parting', companionId: c.id, name: c.name, day: s.day };
  }
}

// ---------------------------------------------------------------- the seasons and the days
export function onBattlecraftTime(s, { oldDay, newDay = s.day } = {}, ctx = {}) {
  if (!s.battlecraft) return;
  const before = s.battlecraft.lastDay ?? oldDay; s.battlecraft.lastDay = newDay;
  for (const i of [...s.battlecraft.injuries]) {
    const d = INJURIES[i.id]; if (!d || i.permanent) continue;
    if (!i.treated && i.id !== 'bruised' && !i.fevered && newDay >= i.day + FEVER_DAYS) { i.fevered = true; ctx.inflictCondition?.('infection', 2, 'combat'); }
    if (i.until <= newDay && i.until > before) {
      if (d.leaves && !i.treated) { s.battlecraft.injuries = s.battlecraft.injuries.filter(x => x !== i); wound(s, d.leaves, ctx, `${d.name} left to itself.`); }
      else ctx.journalLiteral?.(`${d.name}, mended`, `${d.name} has knit. You notice it one morning by not noticing it.`, 'health');
    }
  }
  s.battlecraft.injuries = s.battlecraft.injuries.filter(i => i.permanent || i.until > newDay - 400);
  for (const c of (s.companions || []).filter(c => c.recruited && c.alive !== false)) {
    if (c.woundedUntil && c.woundedUntil <= newDay && c.woundedUntil > before) { c.woundedUntil = 0; c.hp = Math.max(c.hp, Math.ceil(c.maxHp / 2)); }
    if (Math.floor(newDay / 92) > Math.floor(before / 92) && c.active && s.timeline?.journey) shiftLoyalty(s, c, 2);
  }
}

// ---------------------------------------------------------------- the scenes
export const BATTLECRAFT_EVENTS = { ids: () => ({ battlecraft_parting: ['release', 'pay', 'promise', 'continue'], battlecraft_fallen: ['bury', 'carry', 'continue'] }) };
export function flushBattlecraftEvent(s, ctx = {}) {
  const p = s.battlecraft?.pending; if (!p || s.event || s.battle || s.phase === 'retired') return false;
  const c = (s.companions || []).find(c => c.id === p.companionId); if (!c) { s.battlecraft.pending = null; return false; }
  if (p.kind === 'fallen') ctx.setEvent?.('battlecraft_fallen', `${c.name} is dead`, 'The fallen', `${c.name} is dead. You knew what they carried, who they wrote to, what they would not do for money. The others are watching what you do with the body.`, [
    { id: 'bury', label: 'Bury them here, properly', description: 'A day. The others will remember that you stopped.' },
    { id: 'carry', label: 'Carry them home', description: 'Three days and twelve gold for the rites. The others will remember that too.' },
    { id: 'continue', label: 'There is no time', description: 'The road does not wait. The others will remember that most of all.' },
  ]);
  else if (p.kind === 'parting') ctx.setEvent?.('battlecraft_parting', `${c.name} has had enough`, 'A word at the fire', `${c.name} says it plainly: they did not sign on for this, or for you, the way it has gone. They will go in the morning unless something changes.`, [
    { id: 'release', label: 'Let them go', description: 'They leave with your thanks and nothing else.' },
    { id: 'pay', label: 'Thirty gold and a better share after', description: 'Gold is an answer. Not the whole of one.', ...(s.hero.gold < 30 ? { disabledReason: 'Requires 30 gold.' } : {}) },
    { id: 'promise', label: 'Promise it will be different', description: 'They will hold you to it: leave them lying once more and they are gone without a word.' },
    { id: 'continue', label: 'Say nothing', description: 'They go in the morning.' },
  ]);
  return !!s.event;
}
export function applyBattlecraftChoice(s, eventId, pick, ctx = {}) {
  const p = s.battlecraft?.pending; if (!p || !eventId.startsWith('battlecraft_')) return false;
  const c = (s.companions || []).find(c => c.id === p.companionId); s.battlecraft.pending = null; if (!c) return true;
  const others = (s.companions || []).filter(o => o.id !== c.id && o.recruited && o.alive !== false);
  if (eventId === 'battlecraft_fallen') {
    if (pick === 'bury') { ctx.spendDays?.(1); for (const o of others) shiftLoyalty(s, o, 3); if (s.life) s.life.happiness = clamp(number(s.life.happiness) + 4); ctx.journalLiteral?.(`${c.name}, buried`, `A day with a spade. You put what they carried in with them, all but the letters.`, 'personal'); }
    else if (pick === 'carry') { ctx.spendDays?.(3); s.hero.gold = Math.max(0, s.hero.gold - 12); for (const o of others) shiftLoyalty(s, o, 6); if (s.life) s.life.happiness = clamp(number(s.life.happiness) + 6); ctx.journalLiteral?.(`${c.name}, carried home`, `Three days with the weight of them, and the rites paid for. Their people know.`, 'personal'); }
    else { for (const o of others) shiftLoyalty(s, o, -8); ctx.journalLiteral?.(`${c.name}, left`, `You left them where they fell. Nobody says anything. That is the saying.`, 'personal'); }
    return true;
  }
  if (eventId === 'battlecraft_parting') {
    c.partingAsked = true;
    if (pick === 'pay' && s.hero.gold >= 30) { s.hero.gold -= 30; shiftLoyalty(s, c, 25); ctx.journalLiteral?.(`${c.name} stays`, `Thirty gold on the table, and a better share promised. ${c.name} counts it and stays. For now.`, 'personal'); }
    else if (pick === 'promise') { shiftLoyalty(s, c, 10); c.promised = true; ctx.journalLiteral?.(`${c.name} stays, on a word`, `${c.name} will hold you to it.`, 'personal'); }
    else { c.recruited = false; c.active = false; if (s.rpg?.companionStages?.[c.id]) s.rpg.companionStages[c.id].status = 'departed'; ctx.journalLiteral?.(`${c.name} goes`, `${c.name} is gone in the morning, pack and all. ${pick === 'release' ? 'You shook hands.' : 'There was no handshake.'}`, 'personal'); }
    return true;
  }
  return true;
}

// ---------------------------------------------------------------- read models
export function battlecraftView(s) {
  if (!s.battlecraft) return null;
  const b = s.battlecraft, m = injuryModifiers(s);
  return { arts: b.arts.map(id => artById(id)).filter(Boolean), record: { ...b.record }, injuries: activeInjuries(s).map(i => ({ ...i, name: INJURIES[i.id].name, line: INJURIES[i.id].line, daysLeft: i.permanent ? null : Math.max(0, i.until - s.day) })), modifiers: m, companions: (s.companions || []).filter(c => c.recruited).map(c => ({ id: c.id, name: c.name, loyalty: loyaltyOf(c), bond: loyaltyOf(c) >= BOND, wounded: c.woundedUntil > s.day, alive: c.alive !== false })) };
}
/** Three to five situations for Right now. */
export function battlecraftRightNow(s) {
  const rows = []; if (!s.battlecraft) return rows;
  for (const i of activeInjuries(s)) rows.push({ id: 'injury:' + i.id, text: i.permanent ? `${INJURIES[i.id].name}, for good.` : `${INJURIES[i.id].name}${i.treated ? ', set and mending' : ', untended'}: ${Math.max(0, i.until - s.day)} days.` });
  for (const c of (s.companions || []).filter(c => c.recruited && c.alive !== false)) { if (c.woundedUntil > s.day) rows.push({ id: 'wounded:' + c.id, text: `${c.name} is mending; ${c.woundedUntil - s.day} days before they fight.` }); else if (loyaltyOf(c) < PARTING + 10) rows.push({ id: 'loyalty:' + c.id, text: `${c.name} is close to walking.` }); }
  return rows;
}
export function battlecraftSummary(s) {
  if (!s.battlecraft) return null;
  const r = s.battlecraft.record;
  return { fights: r.fights, won: r.won, lost: r.lost, fled: r.fled, settled: r.settled, injuries: s.battlecraft.injuries.length, permanent: s.battlecraft.injuries.filter(i => i.permanent).length, arts: s.battlecraft.arts.length, species: Object.keys(s.battlecraft.bestiary).length, known: Object.keys(s.battlecraft.bestiary).filter(id => knowledgeOf(s, id) >= 3).length, dead: (s.companions || []).filter(c => c.alive === false && c.deathDay).length };
}
export function validateBattlecraft(s) {
  const b = s.battlecraft; if (b === undefined) return true;
  if (!b || typeof b !== 'object' || b.version !== 1 || !Array.isArray(b.arts) || b.arts.length > 40 || !b.arts.every(id => artById(id))) return false;
  if (!Array.isArray(b.injuries) || b.injuries.length > 8 || !b.injuries.every(i => INJURIES[i.id] && Number.isInteger(i.day) && (i.permanent === true ? i.until === null : Number.isInteger(i.until)) && typeof i.treated === 'boolean')) return false;
  if (!b.bestiary || typeof b.bestiary !== 'object' || Object.keys(b.bestiary).length > 200 || !Object.entries(b.bestiary).every(([id, e]) => ENEMY_SPECIES.some(r => r[0] === id) && Number.isInteger(e.met) && Number.isInteger(e.fought) && Number.isInteger(e.killed) && typeof e.studied === 'boolean')) return false;
  if (!b.record || !['fights', 'won', 'lost', 'fled', 'settled'].every(k => Number.isInteger(b.record[k]) && b.record[k] >= 0) || !b.record.kills || typeof b.record.kills !== 'object') return false;
  if (b.pending !== null && !(b.pending && ['fallen', 'parting'].includes(b.pending.kind) && typeof b.pending.companionId === 'string')) return false;
  for (const c of s.companions || []) if (c.loyalty !== undefined && !(Number.isFinite(c.loyalty) && c.loyalty >= 0 && c.loyalty <= 100)) return false;
  return true;
}
/** The heir takes the family's knowledge of what lives in the dark; the wounds and the arts were the parent's. */
export function inheritBattlecraft(old, s) {
  if (!old.battlecraft || !s.battlecraft) return;
  for (const [id, e] of Object.entries(old.battlecraft.bestiary)) if (knowledgeOf(old, id) >= 3) s.battlecraft.bestiary[id] = { met: 0, fought: 0, killed: 0, studied: true };
}
/** Danger by place: the tier a roaming fight takes from where you stand, not from your level. */
export function placeTier(s) {
  const here = s.world?.locations?.find(l => l.id === s.locationId);
  if (!here) return 2;
  if (/ruin|tower|mountain|crypt|barrow|cave/.test(`${here.type} ${here.id}`)) return 3;
  if (/village|town|city|citadel|sanctuary|camp|coast/.test(here.type || '')) return 1;
  return 2;
}
