import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { initializeGear, equipItem } from '../dist/js/gear.js';

function game(path = 'warrior', extra = {}) {
  const attributes = { strength: 3, agility: 3, vitality: 4, intellect: 3, willpower: 3, presence: 3 };
  const skills = { weapons: 0, defense: 1, arcana: 0, devotion: 0, stealth: 0, survival: 0, scholarship: 0, persuasion: 0 };
  if (path === 'warrior') { attributes.strength += 3; skills.weapons = 2; }
  if (path === 'mage') { attributes.intellect += 3; skills.arcana = 2; }
  if (path === 'rogue') { attributes.agility += 3; skills.stealth = 2; }
  return {
    seed: 'a consistent life', flags: {}, companions: [],
    hero: { name: 'Rice', path, specialization: null, hp: 56, maxHp: 56, mp: 25, maxMp: 25, attributes, skills, condition: null, potions: 2 },
    ...extra,
  };
}

const hero = (battle) => battle.actors.find((actor) => actor.id === 'hero');
const enemy = (battle, id = 'enemy-1') => battle.actors.find((actor) => actor.id === id);

test('battle creation is deterministic, isolated from its source, and exposes enemy opening turns', () => {
  const source = game('mage');
  const original = structuredClone(source);
  const first = createBattle(source, 'forest');
  assert.deepEqual(first, createBattle(source, 'forest'));
  assert.deepEqual(source, original);
  assert.equal(first.currentActorId, 'hero');
  assert.equal(hero(first).hp, 45);
  assert.ok(first.log.some((line) => line.startsWith('Briar wolf hits Rice')));
  hero(first).attributes.intellect = 100;
  assert.equal(source.hero.attributes.intellect, 6);
});

test('attack spends a turn, damages its target, runs enemies, and returns an independent battle', () => {
  const before = createBattle(game(), 'forest');
  const snapshot = structuredClone(before);
  const after = takeBattleAction(before, 'attack', 'enemy-1');
  assert.deepEqual(before, snapshot);
  assert.ok(enemy(after).hp < enemy(before).hp);
  assert.ok(hero(after).hp < hero(before).hp);
  assert.equal(after.currentActorId, 'hero');
  assert.equal(after.round, 2);
  assert.equal(hero(after).mp, hero(before).mp);
});

test('defending substantially reduces the next enemy attacks and restores MP', () => {
  const before = createBattle(game(), 'forest');
  hero(before).mp = 0;
  const attacked = takeBattleAction(before, 'attack', 'enemy-1');
  const defended = takeBattleAction(before, 'defend');
  assert.equal(hero(defended).mp, 2);
  assert.ok(hero(defended).hp > hero(attacked).hp);
  assert.equal(hero(before).hp - hero(defended).hp, 5);
  assert.equal(hero(defended).defending, false, 'defense expires as the next personal turn begins');
});

test('a guardian draws attacks from a critically injured ally', () => {
  const source = game();
  source.hero.attributes.agility = 9;
  source.companions = [{ id: 'friend', name: 'Mira', role: 'healer', recruited: true, active: true, hp: 2, maxHp: 34, mp: 20, maxMp: 20, agility: 3 }];
  const before = createBattle(source);
  const after = takeBattleAction(before, 'defend');
  assert.equal(after.actors.find((actor) => actor.id === 'friend').hp, 2);
  assert.equal(hero(after).hp, 51);
  assert.equal(after.currentActorId, 'friend');
});

test('potion consumption heals the chosen ally and tracks the shared inventory', () => {
  const before = createBattle(game());
  hero(before).hp = 10;
  const after = takeBattleAction(before, 'potion', 'hero');
  assert.equal(after.potions, before.potions - 1);
  assert.equal(after.potionsUsed, 1);
  assert.equal(hero(after).hp, 29);
  assert.ok(after.log.some((line) => line.includes('restoring 30 health')));
});

test('consumables and skills explain unavailable actions without spending a turn', () => {
  const before = createBattle(game());
  before.potions = 0;
  hero(before).mp = 0;
  const actions = getBattleActions(before);
  assert.equal(actions.find((action) => action.id === 'potion').disabledReason, 'No potions left.');
  assert.equal(actions.find((action) => action.id === 'skill').disabledReason, 'Not enough MP.');
  const after = takeBattleAction(before, 'skill', 'enemy-1');
  assert.equal(after.round, before.round);
  assert.equal(enemy(after).hp, enemy(before).hp);
  assert.equal(hero(after).hp, hero(before).hp);
});

test('retreat always finishes without another attack or reward claim', () => {
  const before = createBattle(game());
  const after = takeBattleAction(before, 'retreat');
  assert.equal(after.outcome, 'retreat');
  assert.equal(after.currentActorId, null);
  assert.equal(hero(after).hp, hero(before).hp);
  assert.deepEqual(getBattleActions(after), []);
  assert.deepEqual(takeBattleAction(after, 'attack', 'enemy-1'), after);
});

test('up to three active recruited companions join and dead actors never enter turn order', () => {
  const source = game();
  source.companions = [
    { id: 'inactive', recruited: true, active: false },
    { id: 'stranger', recruited: false, active: true },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `ally-${i}`, name: `Ally ${i}`, role: 'scout', recruited: true, active: true, hp: i === 0 ? 0 : 30, maxHp: 30, mp: 10, maxMp: 10, agility: 8 - i })),
  ];
  const battle = createBattle(source);
  assert.equal(battle.actors.filter((actor) => actor.side === 'party').length, 4);
  assert.ok(!battle.turnOrder.includes('ally-0'));
  assert.ok(!battle.actors.some((actor) => ['inactive', 'stranger', 'ally-3'].includes(actor.id)));
  assert.equal(battle.currentActorId, 'ally-1');
  assert.deepEqual(battle.turnOrder, ['ally-1', 'ally-2', 'enemy-1', 'enemy-2', 'hero']);
});

test('enemy turns run between companion and hero moves', () => {
  const source = game();
  source.companions = [{ id: 'friend', name: 'Mira', role: 'scout', recruited: true, active: true, hp: 34, maxHp: 34, mp: 20, maxMp: 20, agility: 7 }];
  const battle = createBattle(source);
  assert.equal(battle.currentActorId, 'friend');
  const after = takeBattleAction(battle, 'attack', 'enemy-1');
  assert.equal(after.currentActorId, 'hero');
  assert.equal(after.actors.find((actor) => actor.id === 'friend').hp, 23);
  assert.equal(hero(after).hp, 56);
  assert.equal(after.round, 1);
});

test('a defeated enemy is removed from order before it can attack', () => {
  const before = createBattle(game('rogue'));
  enemy(before).hp = 1;
  const after = takeBattleAction(before, 'attack', 'enemy-1');
  assert.equal(enemy(after).hp, 0);
  assert.ok(!after.turnOrder.includes('enemy-1'));
  assert.ok(!after.log.some((line) => line.startsWith('Briar wolf hits')));
  assert.equal(after.currentActorId, 'hero');
});

test('knocked out party members do not receive turns and complete defeat is nonlethal', () => {
  const source = game();
  source.companions = [{ id: 'friend', name: 'Mira', role: 'scout', recruited: true, active: true, hp: 1, maxHp: 34, mp: 20, maxMp: 20, agility: 7 }];
  const before = createBattle(source);
  const after = takeBattleAction(before, 'attack', 'enemy-1');
  assert.equal(after.actors.find((actor) => actor.id === 'friend').hp, 0);
  assert.ok(!after.turnOrder.includes('friend'));
  assert.equal(after.currentActorId, 'hero');
  const fragile = game();
  fragile.hero.hp = 1;
  const defeated = createBattle(fragile);
  assert.equal(defeated.outcome, 'defeat');
  assert.equal(defeated.currentActorId, null);
  assert.ok(defeated.log.some((line) => line.includes('You will survive')));
});

test('wrong-side and defeated targets never consume a turn or resources', () => {
  const before = createBattle(game());
  const wrong = takeBattleAction(before, 'attack', 'hero');
  assert.equal(hero(wrong).hp, hero(before).hp);
  assert.equal(wrong.round, before.round);
  enemy(before).hp = 0;
  const dead = takeBattleAction(before, 'skill', 'enemy-1');
  assert.equal(hero(dead).mp, hero(before).mp);
  assert.equal(dead.round, before.round);
});

test('a healer can restore an ally while a broken oath suppresses paladin power', () => {
  const source = game();
  source.companions = [{ id: 'friend', name: 'Mira', role: 'healer', recruited: true, active: true, hp: 34, maxHp: 34, mp: 20, maxMp: 20, agility: 9 }];
  const before = createBattle(source);
  hero(before).hp = 20;
  assert.equal(getBattleActions(before).find((action) => action.id === 'skill').targetSide, 'party');
  const healed = takeBattleAction(before, 'skill', 'hero');
  assert.ok(healed.log.some((line) => line.includes('Rice recovers 20 health')));
  assert.equal(healed.actors.find((actor) => actor.id === 'friend').mp, 15);
  const sworn = game();
  sworn.hero.specialization = 'paladin';
  sworn.flags.oathBroken = true;
  assert.match(getBattleActions(createBattle(sworn)).find((action) => action.id === 'skill').disabledReason, /broken oath/);
});

test('vampire blood power restores health and changes only battle hunger until resolution', () => {
  const source = game('rogue');
  source.hero.condition = { type: 'vampire', hunger: 48 };
  source.hero.hp = 30;
  const before = createBattle(source);
  assert.ok(getBattleActions(before).some((action) => action.id === 'blood'));
  const after = takeBattleAction(before, 'blood', 'enemy-1');
  assert.equal(hero(after).condition.hunger, 40);
  assert.equal(hero(after).mp, 21);
  assert.equal(source.hero.condition.hunger, 48);
  assert.ok(after.log.some((line) => line.includes('blood hunger eases')));
});

test('new vampire encounters distinguish blood-bearing opponents from stone and spirits without rewriting saved old battles', () => {
  const source = game('warrior', { revision:5 });
  source.hero.condition = {type:'vampire',hunger:60};
  let battle = createBattle(source,'ruin');
  const option = getBattleActions(battle).find(action=>action.id==='blood');
  assert.deepEqual(option.targetIds, []);
  assert.match(option.disabledReason,/carries blood/);
  const before = hero(battle).mp, turn = battle.currentActorId;
  battle = takeBattleAction(battle,'blood','enemy-1');
  assert.equal(hero(battle).mp,before); assert.equal(battle.currentActorId,turn);
  assert.equal(hero(battle).condition.hunger,60,'stone cannot satisfy hunger');
  const forest = createBattle(source,'forest');
  assert.ok(getBattleActions(forest).find(action=>action.id==='blood').targetIds.includes('enemy-1'));
  const drained = takeBattleAction(forest,'blood','enemy-1');
  assert.equal(hero(drained).condition.hunger,52,'a flesh-bearing beast provides the actual earned feeding');
  const oldSource = game('warrior'); oldSource.hero.condition={type:'vampire',hunger:60};
  const oldBattle = createBattle(oldSource,'ruin');
  assert.ok(oldBattle.actors.filter(actor=>actor.side==='enemy').every(actor=>actor.bloodless===undefined));
  assert.equal(getBattleActions(oldBattle).find(action=>action.id==='blood').disabledReason,undefined,'already saved old encounters retain their original capability');
});

function playTactically(battle) {
  let turns = 0;
  while (!battle.outcome && turns++ < 40) {
    const actor = battle.actors.find((member) => member.id === battle.currentActorId);
    const target = battle.actors.filter((member) => member.side === 'enemy' && member.hp > 0).sort((a, b) => a.hp - b.hp)[0];
    const actions = getBattleActions(battle);
    if (actor.hp < 18 && battle.potions > 0) battle = takeBattleAction(battle, 'potion', actor.id);
    else if (!actions.find((action) => action.id === 'skill').disabledReason) battle = takeBattleAction(battle, 'skill', target.id);
    else battle = takeBattleAction(battle, 'attack', target.id);
  }
  return battle;
}

for (const path of ['warrior', 'mage', 'rogue']) {
  for (const encounter of ['forest', 'ruin', 'initiation']) {
    test(`a baseline ${path} can win ${encounter} alone through skills and sensible potion use`, () => {
      const won = playTactically(createBattle(game(path), encounter));
      assert.equal(won.outcome, 'victory', JSON.stringify(won.log));
      assert.equal(won.currentActorId, null);
      assert.ok(hero(won).hp > 0);
      assert.ok(won.rewards.gold > 0 && won.rewards.exp > 0);
    });
  }
}

test('a warrior marks an opening that the next companion exploits, while weakening the counterattack', () => {
  const source = game();
  source.hero.attributes.agility = 9;
  source.companions = [{ id: 'friend', name: 'Kest', role: 'rogue', recruited: true, active: true, hp: 34, maxHp: 34, mp: 20, maxMp: 20, agility: 7 }];
  const before = createBattle(source);
  const prepared = takeBattleAction(before, 'tactic', 'enemy-1');
  assert.equal(prepared.currentActorId, 'friend');
  assert.equal(enemy(prepared).status.marked, 2);
  assert.equal(enemy(prepared).status.weakened, 3);
  assert.equal(hero(prepared).mp, 22);
  const followed = takeBattleAction(prepared, 'skill', 'enemy-1');
  assert.equal(enemy(followed).hp, 3);
  assert.equal(enemy(followed).status.marked, 1);
  assert.ok(followed.log.some((line) => line.includes('marked opening for 4 extra damage')));
  assert.ok(followed.log.some((line) => line.includes('next attack is weakened')));
});

test('bleeding finishes a wounded foe before its next attack without losing the next actor’s turn', () => {
  const before = createBattle(game('rogue'));
  enemy(before).hp = 10;
  const after = takeBattleAction(before, 'tactic', 'enemy-1');
  assert.equal(enemy(after).hp, 0);
  assert.ok(!after.turnOrder.includes('enemy-1'));
  assert.ok(!after.log.some((line) => line.startsWith('Briar wolf hits')));
  assert.equal(after.currentActorId, 'hero');
  assert.equal(hero(after).hp, 51);
  assert.ok(after.log.some((line) => line.includes('bleeds for 2 damage')));
});

test('a mage’s second ability wards an ally and cleanses bleeding and weakness', () => {
  const source = game('mage');
  source.hero.attributes.agility = 9;
  const before = createBattle(source);
  hero(before).status = { bleed: 2, bleedTurns: 2, weakened: 3 };
  const after = takeBattleAction(before, 'tactic', 'hero');
  assert.equal(hero(after).mp, 21);
  assert.equal(hero(after).status.bleed, undefined);
  assert.equal(hero(after).status.weakened, undefined);
  assert.equal(hero(after).hp, 54);
  assert.equal(hero(before).status.bleed, 2);
  assert.ok(after.log.some((line) => line.includes('ward absorbs')));
});

test('party bleeding can knock out a faster ally without exposing a dead control turn', () => {
  const source = game();
  source.hero.attributes.agility = 9;
  source.companions = [{ id: 'friend', name: 'Kest', role: 'rogue', recruited: true, active: true, hp: 2, maxHp: 34, mp: 20, maxMp: 20, agility: 7 }];
  const before = createBattle(source);
  before.actors.find((actor) => actor.id === 'friend').status = { bleed: 3, bleedTurns: 2 };
  const after = takeBattleAction(before, 'defend');
  assert.equal(after.actors.find((actor) => actor.id === 'friend').hp, 0);
  assert.equal(after.currentActorId, 'hero');
  assert.ok(!after.turnOrder.includes('friend'));
  assert.equal(after.outcome, null);
});

test('werewolf powers spend visible control and health; centering restores usable control', () => {
  const source = game();
  source.hero.attributes.agility = 9;
  source.hero.condition = { type: 'lycanthrope', control: 50, preparedUntil: 0, lastFullMoon: -1 };
  const before = createBattle(source);
  const surged = takeBattleAction(before, 'feral', 'enemy-1');
  assert.equal(hero(surged).condition.control, 38);
  assert.equal(enemy(surged).hp, 0);
  assert.equal(hero(surged).hp, 48);
  const steadied = takeBattleAction(surged, 'steady');
  assert.equal(hero(steadied).condition.control, 56);
  assert.equal(hero(steadied).mp, 21);
  assert.equal(source.hero.condition.control, 50);
  hero(before).condition.control = 0;
  assert.match(getBattleActions(before).find((action) => action.id === 'feral').disabledReason, /12 control/);
  const centered = takeBattleAction(before, 'steady');
  assert.equal(hero(centered).condition.control, 18);
  assert.equal(getBattleActions(centered).find((action) => action.id === 'feral').disabledReason, undefined);
});

test('equipment changes actual weapon damage, spell damage, armor and initiative without changing the hero base', () => {
  const swordLife = game();
  swordLife.hero.attributes.agility = 9;
  const base = createBattle(swordLife, 'ruin');
  initializeGear(swordLife);
  swordLife.equipment.owned = ['iron_sword', 'chain_mail'];
  equipItem(swordLife, 'iron_sword');
  equipItem(swordLife, 'chain_mail');
  const originalHero = structuredClone(swordLife.hero);
  const equipped = createBattle(swordLife, 'ruin');
  assert.deepEqual(hero(equipped).gear, { attack: 4, armor: 3, magic: 0, agility: -1 });
  assert.equal(hero(equipped).agility, 8);
  assert.equal(hero(equipped).armor, 3);
  const hit = takeBattleAction(base, 'attack', 'enemy-1');
  const stronger = takeBattleAction(equipped, 'attack', 'enemy-1');
  assert.equal(enemy(hit).hp - enemy(stronger).hp, 4);
  assert.ok(hero(stronger).hp > hero(hit).hp);
  assert.deepEqual(swordLife.hero, originalHero);

  const mageLife = game('mage');
  mageLife.hero.attributes.agility = 9;
  const nakedMage = createBattle(mageLife, 'ruin');
  initializeGear(mageLife);
  mageLife.equipment.owned = ['ash_staff'];
  equipItem(mageLife, 'ash_staff');
  const spell = takeBattleAction(nakedMage, 'skill', 'enemy-1');
  const runedSpell = takeBattleAction(createBattle(mageLife, 'ruin'), 'skill', 'enemy-1');
  assert.equal(enemy(spell).hp - enemy(runedSpell).hp, 4);

  const quickLife = game('mage');
  initializeGear(quickLife);
  quickLife.equipment.owned = ['hunter_dagger'];
  equipItem(quickLife, 'hunter_dagger');
  const quick = createBattle(quickLife);
  assert.equal(quick.turnOrder[0], 'hero');
  assert.equal(hero(quick).hp, 56);
});

test('new formations are seeded and varied; difficulty and level growth stay bounded and rewards stay stable', () => {
  const source = game();
  source.revision = 2;
  source.difficulty = 'balanced';
  const first = createBattle(source);
  assert.deepEqual(first, createBattle(source));
  const variants = new Set();
  for (let count = 0; count < 10; count++) {
    source.flags.battlesStarted = count;
    variants.add(createBattle(source).variant);
  }
  assert.ok(variants.size > 1);
  source.difficulty = 'gentle';
  const gentle = createBattle(source);
  source.difficulty = 'perilous';
  const perilous = createBattle(source);
  assert.equal(enemy(perilous).maxHp - enemy(gentle).maxHp, 6);
  assert.equal(enemy(perilous).attackPower - enemy(gentle).attackPower, 2);
  source.hero.level = 100;
  const experienced = createBattle(source);
  assert.equal(enemy(experienced).maxHp - enemy(perilous).maxHp, 8);
  assert.equal(enemy(experienced).attackPower - enemy(perilous).attackPower, 2);
  assert.deepEqual(experienced.rewards, { gold: 18, exp: 24 });
});

test('a legacy unfinished battle resumes without gear fields or new encounter scaling', () => {
  const before = createBattle(game());
  delete before.variant;
  for (const actor of before.actors) { delete actor.gear; delete actor.equipment; }
  const snapshot = structuredClone(before);
  const after = takeBattleAction(before, 'attack', 'enemy-1');
  assert.deepEqual(before, snapshot);
  assert.equal(enemy(after).maxHp, 22);
  assert.equal(enemy(after).attackPower, 6);
  assert.equal(after.currentActorId, 'hero');
  assert.equal(after.round, 2);
});

test('classless civilians can fight without receiving warrior abilities or a weapon', () => {
  const source = game('unformed');
  initializeGear(source);
  const before = createBattle(source);
  assert.equal(hero(before).role, 'civilian');
  assert.equal(hero(before).equipment.weapon, null);
  assert.ok(!getBattleActions(before).some((action) => ['skill', 'tactic'].includes(action.id)));
  assert.ok(getBattleActions(before).some((action) => action.id === 'attack'));
  const after = takeBattleAction(before, 'attack', 'enemy-1');
  assert.ok(enemy(after).hp < enemy(before).hp);
});

const classPaths = { guardian: 'warrior', berserker: 'warrior', knight: 'warrior', paladin: 'warrior', healer: 'mage', elementalist: 'mage', druid: 'mage', necromancer: 'mage', thief: 'rogue', ranger: 'rogue', assassin: 'rogue', bard: 'rogue' };
function callingBattle(id) {
  const source = game(classPaths[id]);
  source.hero.attributes.agility = 10;
  source.hero.hp = 40;
  source.hero.specialization = id;
  source.companions = [{ id: 'friend', name: 'Mira', role: 'mage', recruited: true, active: true, hp: 12, maxHp: 40, mp: 5, maxMp: 20, agility: 8 }];
  const battle = createBattle(source);
  enemy(battle).hp = 60; enemy(battle).maxHp = 60;
  if (['thief', 'elementalist'].includes(id)) enemy(battle).status.ward = 10;
  return battle;
}

for (const id of Object.keys(classPaths)) {
  test(`${id} skill changes real combat resources or statuses without touching base attributes`, () => {
    const before = callingBattle(id);
    const snapshot = structuredClone(before);
    const skill = getBattleActions(before).find((action) => action.id === 'skill');
    const after = takeBattleAction(before, 'skill', skill.targetSide === 'party' ? 'friend' : 'enemy-1');
    assert.deepEqual(before, snapshot);
    assert.deepEqual(hero(after).attributes, hero(before).attributes);
    assert.equal(after.currentActorId, 'friend');
    assert.ok(hero(after).mp < hero(before).mp);
    const friend = after.actors.find((actor) => actor.id === 'friend');
    const checks = {
      guardian: () => assert.equal(hero(after).status.ward, 5),
      berserker: () => { assert.equal(hero(after).hp, 36); assert.ok(enemy(after).hp <= 36); },
      knight: () => { assert.equal(enemy(after).status.weakened, 3); assert.equal(hero(after).defending, true); },
      paladin: () => { assert.equal(hero(after).status.ward, 2); assert.equal(friend.status.ward, 2); },
      healer: () => { assert.equal(friend.hp, 32); assert.equal(friend.status.ward, 3); },
      elementalist: () => { assert.equal(enemy(after).status.burn, 2); assert.equal(enemy(after).status.burnTurns, 2); },
      druid: () => { assert.equal(enemy(after).status.weakened, 4); assert.equal(hero(after).hp, 43); },
      necromancer: () => { assert.equal(enemy(after).status.weakened, 3); assert.equal(hero(after).status.ward, 5); },
      thief: () => { assert.equal(hero(after).status.ward, 4); assert.ok(after.log.some((line) => line.includes('steals 4 ward'))); },
      ranger: () => assert.equal(enemy(after).status.marked, 2),
      assassin: () => assert.ok(enemy(after).hp < 40),
      bard: () => { assert.equal(friend.hp, 18); assert.equal(friend.mp, 8); assert.equal(friend.status.ward, 4); },
    };
    checks[id]();
  });
  test(`${id} tactic provides its distinct support or suppression effect`, () => {
    const before = callingBattle(id);
    const action = getBattleActions(before).find((action) => action.id === 'tactic');
    const after = takeBattleAction(before, 'tactic', action.needsTarget ? action.targetSide === 'party' ? 'friend' : 'enemy-1' : undefined);
    assert.equal(after.currentActorId, 'friend');
    const friend = after.actors.find((actor) => actor.id === 'friend');
    const checks = {
      guardian: () => { assert.equal(friend.status.ward, 10); assert.equal(hero(after).defending, true); },
      berserker: () => assert.ok(after.actors.filter((actor) => actor.side === 'enemy').every((actor) => actor.status.marked === 1 && actor.status.weakened === 2)),
      knight: () => { assert.equal(enemy(after).status.weakened, 4); assert.equal(hero(after).defending, true); },
      paladin: () => { assert.equal(friend.hp, 22); assert.equal(friend.status.ward, 8); },
      healer: () => { assert.equal(friend.hp, 16); assert.equal(friend.status.ward, 9); },
      elementalist: () => { assert.equal(enemy(after).status.ward, 2); assert.equal(enemy(after).status.weakened, 4); },
      druid: () => { assert.equal(friend.hp, 24); assert.equal(friend.status.ward, 3); },
      necromancer: () => { assert.equal(enemy(after).status.marked, 2); assert.equal(enemy(after).status.weakened, 4); },
      thief: () => assert.equal(enemy(after).status.weakened, 5),
      ranger: () => { assert.equal(enemy(after).status.weakened, 4); assert.equal(enemy(after).status.bleed, 2); },
      assassin: () => assert.equal(enemy(after).status.bleed, 4),
      bard: () => { assert.equal(enemy(after).status.marked, 2); assert.equal(friend.status.ward, 2); },
    };
    checks[id]();
  });
}
