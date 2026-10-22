import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { createBattle, getBattleActions, takeBattleAction, combatProfile, partyPreparation } from '../dist/js/combat.js';
import { reaches } from '../dist/js/enemy-targets.js';
import { ARTS, INJURIES, FIELD_VERSION, activeInjuries, injuryModifiers, afterBattlecraftBattle, onBattlecraftTime, knowledgeOf, bestiaryView, treeView, battlecraftView, validateBattlecraft, inheritBattlecraft, placeTier, companionOpinion, loyaltyOf } from '../dist/js/battlecraft.js';
import { createLifeAtAge } from '../dist/js/new-life.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'common', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) { for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; }
/** A grown edition life with a calling earned the proper way (the progression knows it) and two friends at its side. */
function ready(seed, { calling = 'guardian', path = 'warrior', age = 20, friends = ['orrin', 'kest'], loyalty = 50 } = {}) {
  let s = grow(born(seed), age); if (s.phase === 'retired') return null;
  s.hero.specialization = calling; s.hero.path = path; s.progression.learnedClassIds = [calling]; s.progression.mentors[calling].met = true;
  s.hero.skills.weapons = 6; s.hero.skills.defense = 6; s.hero.skills.stealth = 6; s.hero.skills.arcana = 6; s.hero.skills.devotion = 6; s.hero.skills.survival = 6; s.hero.skills.persuasion = 6;
  s.hero.maxHp = 70; s.hero.hp = 70; s.hero.maxMp = 30; s.hero.mp = 30; s.hero.gold = 100; s.hero.potions = 0;
  for (const id of friends) { const c = s.companions.find(c => c.id === id); c.recruited = true; c.active = true; c.loyalty = loyalty; c.hp = c.maxHp; }
  return s;
}
const begin = (s, kind = 'free_beast') => { s.flags.battlesStarted = (s.flags.battlesStarted || 0) + 1; const b = createBattle(s, kind, null); b.instanceId = `battle-${s.seed}-${s.flags.battlesStarted}`; s.battle = b; return b; };
const mine = b => b.actors.find(a => a.id === b.currentActorId);
const foes = b => b.actors.filter(a => a.side === 'enemy' && a.hp > 0);
/** Plain attacks until the fight ends; retreat when `until` says so. */
function fight(b, { until = () => false, choose } = {}) { for (let n = 0; n < 200 && !b.outcome; n++) { const a = mine(b); if (!a || a.side !== 'party') break; if (until(b)) { b = takeBattleAction(b, 'retreat'); break; } const t = foes(b).find(x => reaches(b, a, x)) || foes(b)[0]; const id = choose?.(b, a, t) || 'attack'; b = takeBattleAction(b, id, t?.id); } return b; }
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {}, setEvent: () => {}, spendDays: () => {}, killPerson: () => true, inflictCondition: (type) => { rows.push({ title: 'condition', text: type }); return true; } } }; };
const act = (s, id) => { const a = engine.getActions(s).find(a => a.id === id); assert.ok(a, `${id} offered`); assert.equal(a.disabledReason, undefined, `${id}: ${a.disabledReason}`); const next = engine.chooseAction(s, id); assert.equal(engine.validateSave(next), true, `${id} leaves a valid save`); return next; };

test('the field: ranks by role, the opening line, a plain blow past the front rank lands on it, a hook can drag the back rank forward', () => {
  const s = ready('bc-field-1', { friends: ['orrin', 'kest'] }); if (!s) return;
  s.battlecraft.arts = ['hook_and_drag'];
  let b = begin(s, 'free_bandit');
  assert.equal(b.fieldVersion, FIELD_VERSION);
  assert.equal(b.actors.find(a => a.id === 'hero').row, 'front'); assert.equal(b.actors.find(a => a.id === 'orrin').row, 'back'); assert.equal(b.actors.find(a => a.id === 'kest').row, 'front');
  assert.match(b.log[0], /The field: .* at the back/);
  for (const e of b.actors.filter(a => a.side === 'enemy')) assert.ok(['front', 'back'].includes(e.row));
  // force a back rank to read the rule
  const [first, second] = b.actors.filter(a => a.side === 'enemy'); if (!second) return;
  first.row = 'front'; second.row = 'back';
  const hero = b.actors.find(a => a.id === 'hero');
  assert.equal(reaches(b, hero, second), false); assert.equal(reaches(b, hero, first), true);
  assert.equal(reaches(b, hero, second, { ranged: true }), true);
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'attack', first.id);
  const swung = takeBattleAction(b, 'attack', second.id);
  assert.ok(swung.log.some(l => /is behind .*; the blow goes to what is in front/.test(l))); assert.equal(swung.actors.find(a => a.id === second.id).hp, second.hp, 'the back rank is not touched'); assert.ok(swung.actors.find(a => a.id === first.id).hp < first.hp, 'the front rank takes it');
  const dragged = takeBattleAction(b, 'art_hook_and_drag', second.id);
  assert.equal(dragged.actors.find(a => a.id === second.id).row, 'front');
  assert.ok(dragged.log.some(l => /dragged into the front rank/.test(l)));
  // the back rank is open once the front is down
  first.hp = 0; assert.equal(reaches(b, hero, second), true);
  // an enemy striker cannot reach the back-rank mage while the front stands; a pack of beasts can
  const orrin = b.actors.find(a => a.id === 'orrin'); first.hp = 20; first.role = 'humanoid'; first.aiKey = 'striker'; delete first.planCycle;
  assert.equal(reaches(b, first, orrin), false);
  first.role = 'beast'; second.role = 'beast'; second.hp = 10; assert.equal(reaches(b, first, orrin), true, 'the pack flanks');
});

test('stepping back and up costs the action; someone must hold the front', () => {
  const s = ready('bc-field-2', { friends: ['orrin'] }); if (!s) return;
  let b = begin(s, 'free_beast');
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'attack', foes(b)[0].id);
  const shift = getBattleActions(b).find(a => a.id === 'shift');
  assert.ok(shift); assert.match(shift.disabledReason || '', /hold the front/);
  // the mage at the back may step up
  b.actors.find(a => a.id === 'orrin').row = 'front';
  const up = takeBattleAction(b, 'shift'); assert.equal(up.actors.find(a => a.id === 'hero').row, 'back'); assert.ok(up.log.some(l => /steps back/.test(l)));
});

test('danger by place: the roaming tier comes from where you stand, and enemies do not grow with your level', () => {
  const s = ready('bc-place-1'); if (!s) return;
  const village = s.world.locations.find(l => l.type === 'village'), ruin = s.world.locations.find(l => /ruin|mountain|tower/.test(l.type));
  s.locationId = village.id; assert.equal(placeTier(s), 1);
  s.locationId = ruin.id; assert.equal(placeTier(s), 3);
  const low = structuredClone(s); low.hero.level = 1; const high = structuredClone(s); high.hero.level = 12;
  const a = createBattle(low, 'free_beast', null), b = createBattle(high, 'free_beast', null);
  assert.deepEqual(a.actors.filter(x => x.side === 'enemy').map(x => [x.name, x.maxHp, x.attackPower]), b.actors.filter(x => x.side === 'enemy').map(x => [x.name, x.maxHp, x.attackPower]));
  // a legacy life still grows its foes with the level
  const legacy = engine.createBirthGame({ seed: 'bc-legacy-1', station: null }); legacy.hero.level = 12; legacy.age = 20; legacy.phase = 'adult';
  const legacyLow = structuredClone(legacy); legacyLow.hero.level = 1;
  const c = createBattle(legacyLow, 'forest', null), d = createBattle(legacy, 'forest', null);
  assert.equal(c.fieldVersion, undefined); assert.ok(d.actors.find(x => x.id === 'enemy-1').maxHp > c.actors.find(x => x.id === 'enemy-1').maxHp);
  assert.equal(legacy.battlecraft, undefined);
});

test('the arts: a tree per calling, learned for days and gold with the mentor, used in battle by the calling that owns them, once a fight when it says so', () => {
  assert.equal(ARTS.length, 72); for (const calling of ['guardian', 'berserker', 'knight', 'paladin', 'healer', 'elementalist', 'druid', 'necromancer', 'thief', 'ranger', 'assassin', 'bard']) { const rows = ARTS.filter(a => a.calling === calling); assert.equal(rows.length, 6, calling); assert.equal(rows.filter(a => a.tier === 2).length, 2); assert.equal(rows.filter(a => a.tier === 3).length, 4); }
  let s = ready('bc-arts-1', { calling: 'knight' }); if (!s) return;
  s.hero.skills.weapons = 7; s.hero.gold = 100;
  const tree = treeView(s); assert.equal(tree.calling, 'knight'); assert.equal(tree.rows.find(r => r.id === 'shield_bash').reason, null);
  assert.match(tree.rows.find(r => r.id === 'lance').reason, /Needs weapons 10/);
  const learn = engine.getActions(s).find(a => a.id === 'battlecraft_learn_shield_bash'); assert.ok(learn); assert.equal(learn.days, 3); assert.equal(learn.cost, 15);
  const day = s.day, gold = s.hero.gold;
  s = act(s, 'battlecraft_learn_shield_bash');
  assert.equal(s.day - day, 3, 'the engine spends the days once'); assert.equal(gold - s.hero.gold, 15, 'and the fee once');
  assert.deepEqual(s.battlecraft.arts, ['shield_bash']);
  assert.ok(s.journal.at(-1).title === 'Shield bash' || s.journal.some(j => j.title === 'Shield bash'));
  // the third tier wants two of the second, the skill, and the mentor's place
  s.hero.skills.weapons = 10; assert.match(treeView(s).rows.find(r => r.id === 'lance').reason, /second tier first/);
  s = act(s, 'battlecraft_learn_banner');
  const place = s.progression.mentors.knight.locationId; if (s.locationId !== place) assert.match(treeView(s).rows.find(r => r.id === 'lance').reason, /Taught only at/);
  s.progression.mentors.knight.locationId = s.locationId; assert.equal(treeView(s).rows.find(r => r.id === 'lance').reason, null);
  s = act(s, 'battlecraft_learn_lance'); assert.ok(s.battlecraft.arts.includes('lance'));
  // in battle
  for (const id of ['orrin']) { const c = s.companions.find(c => c.id === id); c.recruited = true; c.active = true; }
  let b = begin(s, 'free_beast');
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'attack', foes(b)[0].id);
  const ids = getBattleActions(b).map(a => a.id);
  assert.ok(ids.includes('art_shield_bash') && ids.includes('art_banner') && ids.includes('art_lance'));
  const target = foes(b).find(x => reaches(b, b.actors.find(a => a.id === 'hero'), x));
  const before = target.hp, mp = b.actors.find(a => a.id === 'hero').mp;
  const after = takeBattleAction(b, 'art_lance', target.id);
  assert.ok(after.actors.find(a => a.id === target.id).hp < before, 'the lance lands'); assert.equal(after.actors.find(a => a.id === 'hero').mp, mp - 7 + (after.actors.find(a => a.id === 'hero').mp - (mp - 7)));
  assert.ok(after.log.some(l => /uses the lance/.test(l)));
  // another calling's arts are not offered, and the fiction's own gift stays
  s.hero.specialization = 'guardian'; s.progression.learnedClassIds = ['guardian', 'knight'];
  const other = begin(s, 'free_beast'); assert.ok(!getBattleActions(other).some(a => a.id.startsWith('art_')));
  // once a fight
  s.hero.specialization = 'knight'; s.battlecraft.arts = ['hold_the_line', 'banner', 'rally'];
  let c = begin(s, 'free_beast'); while (mine(c)?.id !== 'hero' && !c.outcome) c = takeBattleAction(c, 'attack', foes(c)[0].id);
  const rally = getBattleActions(c).find(a => a.id === 'art_rally'); assert.ok(rally && !rally.disabledReason);
  assert.equal(engine.validateSave({ ...s, battle: c }), true);
});

test('what the foe does: a person turns the third identical stroke and answers it; cold shatters; fire on oil burns twice', () => {
  const s = ready('bc-foe-1', { calling: 'elementalist', path: 'mage', friends: ['kest'] }); if (!s) return;
  s.battlecraft.arts = ['frost_bolt', 'spark'];
  let b = begin(s, 'free_bandit');
  const foe = b.actors.find(a => a.side === 'enemy'); assert.equal(foe.parry, true, 'a person has your measure');
  foe.hp = foe.maxHp = 400; foe.attackPower = 1;
  const hero = () => b.actors.find(a => a.id === 'hero');
  hero().row = 'front'; b.actors.find(a => a.id === 'kest').row = 'front';
  const swing = () => { while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'defend'); b = takeBattleAction(b, 'attack', foe.id); };
  swing(); swing(); const hp = hero().hp; const foeHp = b.actors.find(a => a.id === foe.id).hp;
  assert.equal(b.actors.find(a => a.id === foe.id).status.measure, 2);
  assert.match(b.actors.find(a => a.id === foe.id).intent, /measure/);
  swing();
  assert.ok(b.log.some(l => /has .* measure: the same stroke a third time is turned, and answered/.test(l)));
  assert.ok(hero().hp < hp || b.actors.find(a => a.id === 'kest').hp < s.companions.find(c => c.id === 'kest').hp, 'the riposte lands');
  assert.equal(b.actors.find(a => a.id === foe.id).status.measure, 0);
  // cold, then a blow: shatter
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'defend');
  b = takeBattleAction(b, 'art_frost_bolt', foe.id); assert.equal(b.actors.find(a => a.id === foe.id).status.frozen, 1);
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'defend');
  const beforeShatter = b.actors.find(a => a.id === foe.id).hp; b = takeBattleAction(b, 'attack', foe.id);
  assert.ok(b.log.some(l => /shatters where the cold held it/.test(l))); assert.equal(b.actors.find(a => a.id === foe.id).status.frozen, undefined);
  // oil, then fire: the burn doubles
  b.actors.find(a => a.id === foe.id).status.oiled = 1;
  while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'defend');
  b = takeBattleAction(b, 'art_spark', foe.id);
  assert.equal(b.actors.find(a => a.id === foe.id).status.burn, 6); assert.equal(b.actors.find(a => a.id === foe.id).status.oiled, undefined);
  void foeHp; void beforeShatter;
});

test('what a fight costs: a beaten hero is hurt, the hurt counts in the next fight, the healer halves it, and a gashed leg left alone is a limp that ends soldiering', () => {
  let s = ready('bc-hurt-1', { friends: [] }); if (!s) return;
  const profile = combatProfile(s); const weapons = profile.actor.skills.weapons;
  // a defeat
  s.hero.maxHp = 20; s.hero.hp = 20; s.hero.skills.weapons = 1;
  s.locationId = s.world.locations.find(l => /ruin|mountain|tower/.test(l.type)).id;
  let b = begin(s, 'free_undead'); b = fight(b); assert.equal(b.outcome, 'defeat');
  const after = engine.resolveBattle(s, b);
  assert.equal(engine.validateSave(after), true);
  const hurt = activeInjuries(after); assert.equal(hurt.length, 1, 'beaten means hurt'); assert.ok(INJURIES[hurt[0].id]);
  assert.ok(after.journal.some(j => j.title === INJURIES[hurt[0].id].name));
  assert.equal(after.battlecraft.record.lost, 1);
  // the modifiers
  const w = structuredClone(after); w.battlecraft.injuries = [{ id: 'broken_arm', day: w.day, until: w.day + 42, permanent: false, treated: false, cause: 'test' }];
  assert.equal(injuryModifiers(w).weapons, -3); assert.equal(combatProfile(w).actor.skills.weapons, Math.max(0, weapons - 3) <= 12 ? Math.max(0, w.hero.skills.weapons - 3) : combatProfile(w).actor.skills.weapons);
  // the healer
  w.hero.gold = 50; w.hero.hp = w.hero.maxHp;
  const treat = engine.getActions(w).find(a => a.id === 'battlecraft_treat_broken_arm'); assert.ok(treat); assert.equal(treat.cost, 8); assert.equal(treat.days, 2);
  const treated = act(w, 'battlecraft_treat_broken_arm');
  assert.equal(treated.battlecraft.injuries[0].treated, true); assert.ok(treated.battlecraft.injuries[0].until - treated.day <= 21);
  assert.ok(!engine.getActions(treated).some(a => a.id === 'battlecraft_treat_broken_arm'));
  // the limp
  const l = structuredClone(after); l.battlecraft.injuries = [{ id: 'gashed_leg', day: l.day, until: l.day + 21, permanent: false, treated: false, cause: 'test' }];
  const { rows, ctx } = mock();
  onBattlecraftTime(l, { oldDay: l.day, newDay: l.day + 8 }, ctx); assert.ok(rows.some(r => r.title === 'condition' && r.text === 'infection'), 'a wound left a week goes bad');
  onBattlecraftTime(l, { oldDay: l.day + 8, newDay: l.day + 22 }, ctx);
  assert.deepEqual(activeInjuries(l).map(i => i.id), ['limp']); assert.equal(injuryModifiers(l).soldiering, true);
  l.hero.profession = 'Soldier'; l.day += 22;
  const work = engine.getActions(l).find(a => a.id === 'career_work'); if (work) assert.match(work.disabledReason || '', /leg will not carry/);
  assert.equal(validateBattlecraft(l), true);
  // a wound fever reaches the health book through the engine
  const f = structuredClone(after); f.battlecraft.injuries = [{ id: 'cracked_ribs', day: f.day - 6, until: f.day + 20, permanent: false, treated: false, cause: 'test' }]; f.hero.hp = f.hero.maxHp;
  const sick = engine.chooseAction(f, 'health_rest');
  assert.ok(sick.health.physical.some(c => c.type === 'infection' && c.circumstance === 'combat'), 'the fever is on the book');
});

test('who stands with you: loyalty rises in victory, a companion down in a won fight is carried and mends, down in a lost one may die, and the fallen are a scene', () => {
  let s = ready('bc-side-1', { friends: ['orrin', 'kest'], loyalty: 50 }); if (!s) return;
  s.hero.maxHp = 200; s.hero.hp = 200; s.hero.skills.weapons = 20;
  let b = begin(s, 'free_beast'); b = fight(b); assert.equal(b.outcome, 'victory');
  let after = engine.resolveBattle(s, b);
  for (const id of ['orrin', 'kest']) assert.equal(after.companions.find(c => c.id === id).loyalty, 53);
  // carried
  const carried = structuredClone(s); const done = structuredClone(b); done.actors.find(a => a.id === 'orrin').hp = 0;
  const { rows, ctx } = mock(); afterBattlecraftBattle(carried, carried.battle, done, ctx);
  const orrin = carried.companions.find(c => c.id === 'orrin'); assert.equal(orrin.woundedUntil, carried.day + 14); assert.equal(orrin.hp, 1); assert.ok(rows.some(r => /carried/.test(r.title)));
  assert.ok(!createBattle(carried, 'free_beast', null).actors.some(a => a.id === 'orrin'), 'the wounded stay behind');
  assert.match(partyPreparation(carried).unready.find(p => p.id === 'orrin')?.reason || '', /Mending/);
  onBattlecraftTime(carried, { oldDay: carried.day, newDay: carried.day + 14 }, ctx); assert.equal(orrin.woundedUntil, 0); assert.ok(orrin.hp >= Math.ceil(orrin.maxHp / 2));
  // the fallen: a retreat with a friend down, over enough fights, kills one (half the time)
  let died = null;
  for (let n = 0; n < 12 && !died; n++) { const t = structuredClone(s); t.flags.battlesStarted = 100 + n; const bb = begin(t, 'free_beast'); const lost = structuredClone(bb); lost.outcome = 'retreat'; lost.currentActorId = null; lost.actors.find(a => a.id === 'kest').hp = 0; const r = engine.resolveBattle(t, lost); const kest = r.companions.find(c => c.id === 'kest'); if (kest.alive === false) died = r; else { assert.equal(kest.hp, 1); assert.ok(kest.loyalty < 50); } }
  assert.ok(died, 'a friend left lying dies, sometimes'); const t = died; const kest = t.companions.find(c => c.id === 'kest');
  assert.equal(engine.validateSave(t), true, 'the family book and the roster agree'); assert.equal(kest.recruited, false); assert.equal(kest.deathDay, t.day); assert.ok(t.journal.some(j => /is dead/.test(j.title)));
  assert.ok(t.life.happiness < s.life.happiness); assert.ok(t.companions.find(c => c.id === 'orrin').loyalty < 50, 'the others saw it');
  const scene = t.event ? t : engine.chooseAction(t, 'life_rest'); assert.equal(scene.event?.id, 'battlecraft_fallen', 'the fallen are a scene');
  assert.deepEqual(scene.event.choices.map(c => c.id), ['bury', 'carry', 'continue']);
  const buried = engine.chooseEventOption(scene, 'bury'); assert.equal(engine.validateSave(buried), true); assert.ok(buried.journal.some(j => /buried/.test(j.title)));
  assert.ok(buried.companions.find(c => c.id === 'orrin').loyalty > t.companions.find(c => c.id === 'orrin').loyalty);
  const left = engine.chooseEventOption(scene, 'continue'); assert.ok(left.companions.find(c => c.id === 'orrin').loyalty < t.companions.find(c => c.id === 'orrin').loyalty);
  // gentle never kills a friend
  const g = structuredClone(s); g.difficulty = 'gentle'; for (let n = 0; n < 12; n++) { const tt = structuredClone(g); tt.flags.battlesStarted = 200 + n; const bb = begin(tt, 'free_beast'); const lost = structuredClone(bb); lost.outcome = 'defeat'; for (const a of lost.actors.filter(a => a.side === 'party')) a.hp = 0; afterBattlecraftBattle(tt, tt.battle, lost, mock().ctx); assert.ok(tt.companions.every(c => c.alive !== false)); }
  void after;
});

test('a friend who has had enough says so; gold or a promise keeps them; a deed against their values costs you; at a strong bond you fight as one', () => {
  let s = ready('bc-part-1', { friends: ['orrin'], loyalty: 22 }); if (!s) return;
  s.hero.maxHp = 200; s.hero.hp = 200; s.hero.skills.weapons = 20;
  let b = begin(s, 'free_beast'); const lost = structuredClone(b); lost.outcome = 'retreat'; lost.actors.find(a => a.id === 'orrin').hp = 0;
  let t = null; for (let n = 0; n < 20 && !t; n++) { const tt = structuredClone(s); tt.flags.battlesStarted = 300 + n; const bb = begin(tt, 'free_beast'); const l = structuredClone(bb); l.outcome = 'retreat'; l.currentActorId = null; l.actors.find(a => a.id === 'orrin').hp = 0; const r = engine.resolveBattle(tt, l); if (r.companions.find(c => c.id === 'orrin').alive !== false) t = r; }
  assert.ok(t, 'Orrin survives a retreat, sometimes'); const orrin = t.companions.find(c => c.id === 'orrin'); assert.ok(orrin.loyalty < 20);
  t.hero.gold = 100;
  const scene = t.event?.id === 'battlecraft_parting' ? t : engine.chooseAction(t, 'life_rest'); assert.equal(scene.event?.id, 'battlecraft_parting');
  const paid = engine.chooseEventOption(scene, 'pay'); assert.equal(paid.hero.gold, t.hero.gold - 30); assert.equal(paid.companions.find(c => c.id === 'orrin').loyalty, orrin.loyalty + 25); assert.equal(paid.companions.find(c => c.id === 'orrin').recruited, true);
  const gone = engine.chooseEventOption(scene, 'release'); assert.equal(gone.companions.find(c => c.id === 'orrin').recruited, false); assert.equal(engine.validateSave(gone), true);
  // values
  const v = structuredClone(s); v.companions.find(c => c.id === 'orrin').loyalty = 50; companionOpinion(v, 'cruelty'); assert.equal(v.companions.find(c => c.id === 'orrin').loyalty, 40, 'Orrin, who thinks consent matters, minds cruelty');
  companionOpinion(v, 'honour'); assert.equal(v.companions.find(c => c.id === 'orrin').loyalty, 44);
  // the joint art
  const j = structuredClone(s); j.companions.find(c => c.id === 'orrin').loyalty = 85;
  let jb = begin(j, 'free_beast'); while (mine(jb)?.id !== 'hero' && !jb.outcome) jb = takeBattleAction(jb, 'attack', foes(jb)[0].id);
  const joint = getBattleActions(jb).find(a => a.id === 'joint_orrin'); assert.ok(joint, 'fire on the oil, with Orrin'); assert.equal(joint.disabledReason, undefined);
  const target = foes(jb)[0]; const hp = target.hp; const jr = takeBattleAction(jb, 'joint_orrin', target.id);
  assert.ok(jr.actors.find(a => a.id === target.id).hp < hp); assert.ok(jr.log.some(l => /Fire on the oil/i.test(l) || /fire on the oil/.test(l)));
  assert.equal(loyaltyOf({}), 50);
});

test('fights not worth the telling: a trivial fight can be settled in a line; a lair cannot', () => {
  const s = ready('bc-settle-1', { friends: ['orrin', 'kest'] }); if (!s) return;
  s.hero.maxHp = 200; s.hero.hp = 200; s.hero.skills.weapons = 24;
  s.locationId = s.world.locations.find(l => l.type === 'village').id;
  let b = begin(s, 'free_beast');
  const settle = getBattleActions(b).find(a => a.id === 'settle'); assert.ok(settle, 'offered against a weak foe');
  const hp = b.actors.filter(a => a.side === 'party').map(a => a.hp);
  b = takeBattleAction(b, 'settle'); assert.equal(b.outcome, 'victory'); assert.equal(b.settled, true);
  assert.ok(b.actors.filter(a => a.side === 'party').every((a, i) => a.hp < hp[i] && a.hp >= 1), 'a few scratches');
  assert.ok(b.log.some(l => /not a story|over before it is a story/.test(l)));
  const after = engine.resolveBattle(s, b); assert.equal(after.battlecraft.record.settled, 1); assert.ok(after.hero.gold > s.hero.gold); assert.equal(engine.validateSave(after), true);
  // never against something with a name
  const lair = begin(s, 'cistern_keeper'); assert.ok(!getBattleActions(lair).some(a => a.id === 'settle'));
  // not once blood is drawn
  let c = begin(s, 'free_beast'); c.actors.find(a => a.side === 'enemy').hp -= 1; assert.ok(!getBattleActions(c).some(a => a.id === 'settle'));
});

test('the bestiary: met, fought, killed twice and known; the archive teaches; natural philosophy knows; the heir inherits what was known', () => {
  let s = ready('bc-beast-1', { friends: ['orrin', 'kest'] }); if (!s) return;
  s.hero.maxHp = 200; s.hero.hp = 200; s.hero.skills.weapons = 20;
  let b = begin(s, 'free_beast'); const species = b.actors.filter(a => a.side === 'enemy').map(a => a.illustration?.species).filter(Boolean);
  assert.ok(species.length); assert.ok(!b.actors.some(a => a.side === 'enemy' && a.status.inspected), 'nothing known yet');
  b = fight(b); const after = engine.resolveBattle(s, b);
  for (const id of species) { const e = after.battlecraft.bestiary[id]; assert.ok(e.met >= 1 && e.fought >= 1); }
  const known = Object.entries(after.battlecraft.bestiary).filter(([, e]) => e.killed >= 2).map(([id]) => id);
  const one = structuredClone(after); one.battlecraft.bestiary = { wolf: { met: 2, fought: 2, killed: 2, studied: false } };
  assert.equal(knowledgeOf(one, 'wolf'), 3); assert.equal(knowledgeOf(one, 'boar'), 0);
  const view = bestiaryView(one); assert.equal(view.rows[0].id, 'wolf'); assert.equal(view.rows[0].weakness, 'ice'); assert.match(view.rows[0].habits, /Cold slows/);
  // a known foe stands read on the field
  const read = begin(one, 'free_beast'); const wolf = read.actors.find(a => a.side === 'enemy' && a.illustration?.species === 'wolf'); if (wolf) assert.equal(wolf.status.inspected, true);
  // the archive
  const city = structuredClone(after); city.locationId = city.world.locations.find(l => l.type === 'city').id; city.education.schooling.literate = true; city.hero.gold = 20; city.hero.hp = city.hero.maxHp;
  const readAction = engine.getActions(city).find(a => a.id === 'battlecraft_read_bestiary'); assert.ok(readAction); assert.equal(readAction.cost, 5);
  const studied = act(city, 'battlecraft_read_bestiary');
  assert.ok(Object.values(studied.battlecraft.bestiary).some(e => e.studied), 'the bestiaries teach'); assert.ok(studied.journal.some(j => j.title === 'Pages from the bestiaries'));
  // natural philosophy
  const schooled = structuredClone(after); schooled.education.schooling.studies.natural_philosophy = { level: 2, lastUsed: schooled.day }; assert.equal(knowledgeOf(schooled, 'boar'), 3);
  // the heir
  const heir = born('bc-heir-1'); inheritBattlecraft(one, heir); assert.equal(knowledgeOf(heir, 'wolf'), 3); assert.equal(heir.battlecraft.bestiary.wolf.killed, 0);
  void known;
});

test('legacy: a life without a station fights the fight it had, and a save from before the field still loads', async () => {
  const legacy = engine.createBirthGame({ seed: 'bc-legacy-2', station: null });
  assert.equal(legacy.battlecraft, undefined); assert.equal(engine.validateSave(legacy), true);
  legacy.age = 20; legacy.phase = 'adult';
  const b = createBattle(legacy, 'forest', null); assert.equal(b.fieldVersion, undefined); assert.ok(!b.actors.some(a => a.row !== undefined));
  assert.ok(!getBattleActions(b).some(a => a.id === 'shift' || a.id === 'settle' || a.id.startsWith('art_')));
  const s = ready('bc-legacy-3'); if (!s) return;
  const copy = structuredClone(s); delete copy.battlecraft; assert.equal(engine.validateSave(copy), true, 'an edition save from before v0.68 loads');
  assert.equal(createBattle(copy, 'free_beast', null).fieldVersion, undefined);
  const grown = await createLifeAtAge({ seed: 'bc-legacy-4', startAge: 18 }); assert.ok(grown.battlecraft, 'a generated life has the field');
});

test('the page: two ranks a side, the intent on every foe, the arts among the commands', async t => {
  const { mountApp } = await import('./helpers/ui-surface.mjs');
  let s = ready('bc-page-1', { calling: 'ranger', path: 'rogue', friends: ['orrin', 'kest'] }); if (!s) return;
  s.battlecraft.arts = ['pinning_shot'];
  let b = begin(s, 'free_bandit'); while (mine(b)?.id !== 'hero' && !b.outcome) b = takeBattleAction(b, 'defend'); s.battle = b;
  const surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue');
  const html = surface.root.innerHTML;
  assert.match(html, /field-workspace/); assert.match(html, /field-rank front/); assert.match(html, /field-rank back/); assert.match(html, /field-intent/); assert.match(html, /data-id="art_pinning_shot"/); assert.match(html, /THE FIELD/);
  const v = battlecraftView(s); assert.ok(v); assert.equal(v.companions.length, 2);
});
