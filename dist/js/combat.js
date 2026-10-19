import {humanDuelProfile,isTournamentBattle,tournamentActionPolicy,tournamentCommandReason} from './tournament-duel-rules.js';
import { captureBattleMortality, recordCombatZero, combatDead, ironmanCombatStopped, validPaladinTrialContext, validateBattleMortality } from './ironman.js';
import {validTournamentContext} from './adult-tournament-state.js';
import { resolveEnemyTargets } from './enemy-targets.js';
import { companionCombatProfile } from './companion-combat-profile.js';
import { skillOf, tacticOf } from './combat-moves.js';
import { arcanePower, applyStatus, resistanceReadout, healingPotionAmount } from './combat-rules.js';
import { TECHNIQUES_V27, advancedTechnique, advancedBattleActions, applyAdvancedTechnique } from './techniques-v27.js';
import { attachEnemyPlan, planIntent, executeEnemyPlan } from './enemy-plans-v27.js';
import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
import { enemyIllustration, enemyDisplayName } from './enemies.js';
import { generateCharacter } from './characters.js';
import { BLOOD_LINEAGES, bloodLineage, curseModifiers, curseCombatNote } from './curses.js';
// Small, deterministic party battles. The simulation owns their consequences;
// this module owns only the encounter and its remaining resources.
import { getGearItem, gearBonuses } from './gear.js';
import { seededRoll } from './world.js';
import { identifyEnemy, proceduralEnemies } from './enemies.js';
import { adventureEncounter } from './adventuring.js';

const ENCOUNTERS = {
  forest: {
    title: 'Trouble on the forest road',
    rewards: { gold: 18, exp: 24 },
    enemies: [
      { name: 'Briar wolf', role: 'beast', hp: 22, attackPower: 6, agility: 5, armor: 0 },
      { name: 'Road scavenger', role: 'skirmisher', hp: 18, attackPower: 5, agility: 4, armor: 0 },
    ],
  },
  ruin: {
    title: 'The watch beneath the ruin',
    rewards: { gold: 32, exp: 40 },
    enemies: [
      { name: 'Stone sentinel', role: 'guardian', hp: 32, attackPower: 7, agility: 3, armor: 2 },
      { name: 'Restless echo', role: 'spirit', hp: 22, attackPower: 6, agility: 6, armor: 0 },
    ],
  },
  initiation: {
    title: 'The final initiation',
    rewards: { gold: 25, exp: 45 },
    enemies: [
      { name: 'Trial guardian', role: 'guardian', hp: 38, attackPower: 8, agility: 4, armor: 2 },
      { name: 'Trial shade', role: 'spirit', hp: 24, attackPower: 6, agility: 6, armor: 0 },
    ],
  },
};

const foe = (name, hp, attackPower, agility, armor = 0, aiKey = 'striker', role = 'guardian') => ({ name, hp, attackPower, agility, armor, aiKey, aiStep: 0, role });
const encounter = (title, gold, exp, enemies) => ({ title, rewards: { gold, exp }, enemies });
Object.assign(ENCOUNTERS, {
  vampire_hunters: encounter('The shuttered lanterns',16,35,[foe('Silver inquisitor',50,11,6,2,'hexer'),foe('Dawn vigil',35,9,5,1,'warder')]),
  wolf_hunters: encounter('The silver jaws of the hunt',16,35,[foe('Silver huntsman',52,11,6,2,'sniper'),foe('Chain warden',36,9,4,2,'hexer')]),
  feral_vampire: encounter('The mouth below the stairs',12,24,[foe('Feral blood-carrier',34,8,7,0,'leech','undead')]),
  moon_mauler: encounter('The shape behind the pines',12,24,[foe('Moon-cursed mauler',38,9,6,1,'barbed','beast')]),
  road_bandits: encounter('The toll that was never agreed', 12, 16, [foe('Road extortioner', 22, 6, 5, 0, 'striker', 'skirmisher')]),
  road_beasts: encounter('Hungry shapes across the path', 10, 16, [foe('Hollow-road wolf', 18, 5, 5, 0, 'striker', 'beast'), foe('Briar scavenger', 18, 5, 4, 0, 'striker', 'beast')]),
  cistern_sluice: encounter('Creatures at the sluice', 10, 18, [foe('Marsh leech', 22, 5, 5, 0, 'leech', 'beast'), foe('Bog wisp', 18, 5, 4, 0, 'hexer', 'spirit')]),
  cistern_flooded: encounter('The flooded nest', 10, 18, [foe('Plague rat', 19, 5, 6, 0, 'barbed', 'beast'), foe('Water leech', 22, 5, 4, 0, 'leech', 'beast')]),
  cistern_keeper: encounter('The bound cistern keeper', 35, 50, [foe('Cistern keeper', 64, 9, 4, 2, 'keeper'), foe('Sluice echo', 20, 5, 5, 0, 'warder', 'spirit')]),
  archive_scriptoria: encounter('The defended scriptoria', 12, 20, [foe('Record adept', 24, 5, 4, 0, 'warder', 'spirit'), foe('Pale echo', 21, 6, 5, 0, 'hexer', 'spirit')]),
  archive_vault: encounter('The vault guardians', 14, 22, [foe('Grave guardian', 30, 7, 3, 2), foe('Seal adept', 22, 5, 5, 0, 'warder', 'spirit')]),
  archive_warden: encounter('The last archivist’s test', 38, 54, [foe('The last archivist', 66, 9, 4, 1, 'archivist', 'spirit'), foe('Bound page', 20, 5, 5, 0, 'hexer', 'spirit')]),
  root_spoor: encounter('The moonroot hunting den', 11, 18, [foe('Den wolf', 24, 6, 6, 0, 'striker', 'beast'), foe('Wild boar', 27, 6, 3, 1, 'striker', 'beast')]),
  root_thorns: encounter('The living thorn passage', 11, 20, [foe('Thorn sprite', 20, 5, 6, 0, 'barbed', 'spirit'), foe('Root spider', 22, 6, 5, 0, 'hexer', 'beast')]),
  thornheart: encounter('The wounded Thornheart', 34, 52, [foe('Thornheart', 68, 9, 3, 2, 'thornheart', 'beast'), foe('Living sprout', 18, 5, 5, 0, 'warder', 'beast')]),
  tower_cliff: encounter('The cliff patrol', 14, 22, [foe('Tower veteran', 30, 7, 3, 2), foe('Cliff slinger', 22, 6, 6, 0, 'sniper', 'skirmisher')]),
  tower_cells: encounter('The watchtower jailer', 14, 22, [foe('The jailer', 28, 7, 4, 1, 'hexer'), foe('Cell cutpurse', 22, 6, 6, 0, 'barbed', 'skirmisher')]),
  tower_captain: encounter('The captain’s last command', 42, 60, [foe('Tower captain', 64, 9, 5, 1, 'captain'), foe('Captain’s shieldbearer', 23, 5, 3, 1, 'warder'), foe('Captain’s slinger', 19, 5, 6, 0, 'sniper', 'skirmisher')]),
  core_hall: encounter('The covenant procession', 16, 24, [foe('Iron husk', 32, 7, 3, 2), foe('Anchor acolyte', 23, 6, 5, 0, 'warder', 'spirit')]),
  core_forge: encounter('The broken rune forge', 16, 24, [foe('Rune golem', 34, 8, 3, 3), foe('Living spark', 21, 6, 6, 0, 'hexer', 'spirit')]),
  core_warden: encounter('The anchor warden', 45, 64, [foe('Anchor warden', 76, 10, 4, 2, 'warden', 'spirit'), foe('Anchor seal', 22, 5, 5, 0, 'warder', 'spirit')]),
  covenant_guardian: encounter('The covenant’s final guardian', 55, 75, [foe('Covenant guardian', 82, 10, 4, 2, 'covenant', 'spirit'), foe('Ember echo', 22, 5, 5, 0, 'hexer', 'spirit'), foe('Thorn echo', 22, 5, 6, 0, 'barbed', 'beast')]),
});

const CLASS_ROLES = { guardian: 'warrior', berserker: 'warrior', knight: 'warrior', paladin: 'warrior', healer: 'healer', elementalist: 'mage', druid: 'mage', necromancer: 'mage', thief: 'rogue', ranger: 'rogue', assassin: 'rogue', bard: 'rogue' };

const clone = (value) => structuredClone(value);
const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const alive = (actor) => actor.hp > 0;
const party = (battle) => battle.actors.filter((actor) => actor.side === 'party' && alive(actor) && !combatDead(battle, actor.id));
const enemies = (battle) => battle.actors.filter((actor) => actor.side === 'enemy' && alive(actor));
const current = (battle) => battle.actors.find((actor) => actor.id === battle.currentActorId);

/** Visible combat labels never change the actor or its captured battle record. */
export function battleActorDisplayName(actor,battle){
  if(!actor)return '';
  if(actor.side!=='enemy'||actor.namedTarget||actor.bossId||battle?.namedTargetId===actor.id)return actor.name;
  // Scripted human-looking foes have descriptive labels rather than NPC names.
  return enemyDisplayName(Object.hasOwn(ENCOUNTERS,battle?.encounterId)&&!actor.naming?actor.name:actor);
}
export function battleNamedTargetId(game,battle){
  if(!battle?.context)return null;
  const target=adventureEncounter(game,battle.context);
  return target.targetName||target.targetPerson?'enemy-1':null;
}

function roleOf(role = '') {
  const value = role.toLowerCase();
  if (/heal|herbal|medic|priest/.test(value)) return 'healer';
  if (/mage|scholar|caster|arcan|ritual/.test(value)) return 'mage';
  if (/rogue|scout|ranger|thief|assassin|bard/.test(value)) return 'rogue';
  return 'warrior';
}

// Training remains uncapped in the life record; battle conversion rewards practice
// with diminishing returns so old age does not erase tactical decisions.
export function combatTraining(value){const n=Math.max(0,number(value));return n<=12?n:12+Math.min(24,Math.sqrt(n-12)*.8);}
function makeHero(game) {
  const hero = game.hero;
  const attributes = clone(hero.attributes || {});
  const skills = clone(hero.skills || {});
  for(const [k,v] of Object.entries(curseModifiers(hero.condition)))attributes[k]=Math.max(1,number(attributes[k],3)+v);
  if(game.revision>=5){for(const k of Object.keys(attributes))attributes[k]=combatTraining(attributes[k]);for(const k of Object.keys(skills))skills[k]=combatTraining(skills[k]);}
  const maxHp = Math.max(1, number(hero.maxHp, 56));
  const maxMp = Math.max(0, number(hero.maxMp, 25));
  const role = CLASS_ROLES[hero.specialization] || (hero.path === 'unformed' ? 'civilian' : roleOf(hero.path));
  const gear = gearBonuses(game);
  return {
    id: 'hero', name: hero.name || 'You', side: 'party', role,
    path: hero.path || 'warrior', specialization: hero.specialization || null,
    hp: clamp(number(hero.hp, maxHp), 0, maxHp), maxHp,
    mp: clamp(number(hero.mp, maxMp), 0, maxMp), maxMp,
    agility: Math.max(1, Math.floor(number(attributes.agility, 3) + (role === 'rogue' ? 2 : 0) + gear.agility)),
    armor: Math.max(0, Math.floor(number(skills.defense) / 3) + gear.armor),
    gear, equipment: {...clone(game.equipment?.equipped || { weapon: null, armor: null, trinket: null }),weapon:getGearItem(game,game.equipment?.equipped?.weapon)?.baseId||game.equipment?.equipped?.weapon||null},
    attributes, skills, condition: hero.condition ? clone(hero.condition) : null,
    oathBroken: Boolean(game.flags?.oathBroken || game.flags?.paladinOathBroken),
    defending: false, status: {},
  };
}

function addLog(battle, text) {
  battle.log.push(text);
  if (battle.log.length > 70) battle.log.splice(0, battle.log.length - 70);
}

function setHealth(battle, actor, value) {
  const before = actor.hp;
  actor.hp = value;
  if (recordCombatZero(battle, actor.id, before)) addLog(battle, actor.id === 'hero'
    ? `${actor.name} dies in combat. This Ironman run has ended.`
    : `${actor.name} dies in combat. Their death is permanent in this Ironman run.`);
  return before - actor.hp;
}

function restoreHealth(battle, actor, amount) {
  if (combatDead(battle, actor.id) || ironmanCombatStopped(battle)) return 0;
  const restored = Math.min(actor.maxHp - actor.hp, amount);
  // Accepted captured magic may make a nominal restoration negative. Keep the
  // old Standard arithmetic, but do not let that HP decrement bypass Ironman.
  if (restored < 0 && battle.mortality) {
    const before = actor.hp; setHealth(battle, actor, actor.hp + restored); return actor.hp - before;
  }
  actor.hp += restored;
  return restored;
}

function finishIfNeeded(battle) {
  battle.turnOrder = battle.turnOrder.filter((id) => battle.actors.some((actor) => actor.id === id && alive(actor)));
  if (ironmanCombatStopped(battle)) { battle.currentActorId = null; return true; }
  if (!party(battle).length) battle.outcome = 'defeat';
  else if (!enemies(battle).length) battle.outcome = 'victory';
  if (battle.outcome) {
    battle.currentActorId = null;
    addLog(battle,isTournamentBattle(battle)?battle.outcome==='victory'?'The marshal calls the bout for you. Both entrants leave it alive.':'The marshal stops the bout. This is a loss, not the end of your life.':battle.outcome === 'victory'
      ? 'The encounter is won. Your party can return to its life.'
      : 'Your party is overwhelmed. You will survive, but recovery takes time.');
    return true;
  }
  return false;
}

function beginTurn(battle) {
  if (ironmanCombatStopped(battle)) return;
  const actor = current(battle);
  if (!actor) return;
  actor.status ||= {};
  actor.defending = false;
  delete actor.status.protecting;
  if(battle.effectsVersion===27){
    for(const key of ['veilTurns','brambleTurns'])if(actor.status[key]>0&&--actor.status[key]===0){delete actor.status[key];delete actor.status[key==='veilTurns'?'veil':'bramble'];}
    if(actor.status.poisonTurns>0){const order=battle.mortality?[...battle.turnOrder]:null,n=Math.min(actor.hp,actor.status.poison||2);setHealth(battle,actor,actor.hp-n);actor.status.poisonTurns--;addLog(battle,actor.name+' loses '+n+' health to poison.');if(!actor.status.poisonTurns){delete actor.status.poison;delete actor.status.poisonTurns;}if(!alive(actor)){if(!finishIfNeeded(battle))advanceTurn(battle,actor.id,order||[...battle.turnOrder]);return;}}
    if(actor.status.stunned){delete actor.status.stunned;addLog(battle,actor.name+' misses one action while stunned.');advanceTurn(battle,actor.id,[...battle.turnOrder]);return;}
  }
  if (number(actor.status.bleed) > 0 && number(actor.status.bleedTurns) > 0) {
    const order = [...battle.turnOrder];
    const damage = Math.min(actor.hp, actor.status.bleed);
    setHealth(battle, actor, actor.hp - damage);
    actor.status.bleedTurns -= 1;
    addLog(battle, `${actor.name} bleeds for ${damage} damage before acting.`);
    if (actor.status.bleedTurns <= 0) { delete actor.status.bleed; delete actor.status.bleedTurns; }
    if (!alive(actor)) {
      addLog(battle, `${actor.name} is out of the fight.`);
      if (!finishIfNeeded(battle)) advanceTurn(battle, actor.id, order);
    }
  }
  if (alive(actor) && number(actor.status.burn) > 0 && number(actor.status.burnTurns) > 0) {
    const order = [...battle.turnOrder];
    const damage = Math.min(actor.hp, actor.status.burn);
    setHealth(battle, actor, actor.hp - damage);
    actor.status.burnTurns -= 1;
    addLog(battle, `${actor.name} burns for ${damage} damage before acting.`);
    if (actor.status.burnTurns <= 0) { delete actor.status.burn; delete actor.status.burnTurns; }
    if (!alive(actor)) {
      addLog(battle, `${actor.name} is out of the fight.`);
      if (!finishIfNeeded(battle)) advanceTurn(battle, actor.id, order);
    }
  }
}

function advanceTurn(battle, previousId = battle.currentActorId, order = [...battle.turnOrder]) {
  if (ironmanCombatStopped(battle)) return;
  const index = order.indexOf(previousId);
  let offset = 1;
  while (offset <= order.length && !battle.turnOrder.includes(order[(index + offset) % order.length])) offset += 1;
  if (offset > order.length) return;
  const next = (index + offset) % order.length;
  if (index + offset >= order.length) {
    battle.round += 1;
    addLog(battle, `Round ${battle.round}.`);
  }
  battle.currentActorId = order[next];
  beginTurn(battle);
}

function dealDamage(battle, source, target, rawDamage, { pierce = false, nonlethal = false, maxDamage = Infinity } = {}) {
  if (ironmanCombatStopped(battle) || combatDead(battle, source.id) || combatDead(battle, target.id)) return 0;
  source.status ||= {};
  target.status ||= {};
  if(battle.tacticsVersion===25&&source.side==='enemy'&&source.aiKey==='hexer'&&number(target.status.ward)>0){const removed=Math.min(3,target.status.ward);target.status.ward-=removed;addLog(battle,`${source.name} unravels ${removed} ward before striking. Defense still reduces the hit.`);}
  const weakness = number(source.status.weakened)+(battle.effectsVersion===27?number(source.status.fear)+number(source.status.rooted):0);
  if(battle.effectsVersion===27){delete source.status.fear;delete source.status.rooted;if(target.status.veil){rawDamage-=number(target.status.veil);delete target.status.veil;}if(source.side==='party'&&target.side==='enemy'){battle.lastAttackerId=source.id;if(number(target.status.marked)>0||target.status.inspected){delete target.status.charged;delete target.status.stolenWard;}}}
  delete source.status.weakened;
  if (source.side === 'party' && target.side === 'enemy' && number(target.status.marked) > 0) {
    rawDamage += 4;
    target.status.marked -= 1;
    if (!target.status.marked) delete target.status.marked;
    addLog(battle, `${source.name} exploits ${target.name}'s marked opening for 4 extra damage.`);
  }
  let damage = Math.max(1, Math.round(rawDamage) - weakness - (pierce ? 0 : Math.max(0,number(target.armor)-number(target.status.exposedArmor))));
  if (target.defending) damage = Math.max(1, Math.ceil(damage * 0.35));
  if (number(target.status.ward) > 0) {
    const absorbed = Math.min(damage, target.status.ward);
    damage -= absorbed;
    target.status.ward -= absorbed;
    addLog(battle, `${target.name}'s ward absorbs ${absorbed} damage.`);
  }
  damage=Math.min(damage,maxDamage,nonlethal?Math.max(0,target.hp-1):Infinity);
  const actualDamage = Math.min(target.hp, damage);
  setHealth(battle, target, Math.max(0, target.hp - damage));
  // Primary and retaliatory damage are one strike. Both may reach zero, but
  // the hero's death latch always takes precedence over a simultaneous victory.
  if(battle.effectsVersion===27&&source.side==='enemy'&&target.status.bramble&&actualDamage>0){const n=Math.min(source.hp,number(target.status.bramble));setHealth(battle,source,source.hp-n);addLog(battle,source.name+' takes '+n+' damage from the living bramble ward.');}
  addLog(battle, `${source.name} hits ${target.name} for ${damage}.`);
  if (!alive(target)) addLog(battle, `${target.name} is out of the fight.`);
  return actualDamage;
}

function enemyIntent(actor) {
  if(actor.planCycle)return planIntent(actor);
  const step = number(actor.aiStep);
  const patterns = {
    keeper: ['Raises an 8-point ward on itself.', 'Surges against every ally. Party wards and personal defense reduce the damage.', 'Smashes the most injured ally; a defender can draw the strike.'],
    archivist: ['Seals a target’s next strike with weakness.', 'Raises an 8-point ward on itself.', 'Releases a magical pulse against the entire party.'],
    thornheart: ['A barbed strike causes bleeding; cleansing wards remove it.', 'Draws from its roots to heal 6 health and gain a 4-point ward.'],
    captain: ['A heavy strike hits the most injured ally; guard to draw and blunt it.', 'Commands every living enemy to gain a 4-point ward.', 'Orders a volley against the whole party.'],
    warden: ['Charges an armor-piercing strike; defend or weaken it before its turn.', 'Raises a 10-point ward on itself.', 'Pulses against every ally and weakens their next strikes.'],
    covenant: ['Sends a pulse across the entire party.', 'A charged strike leaves its target bleeding.', 'Raises a 12-point ward on itself.'],
  };
  if (patterns[actor.aiKey]) return patterns[actor.aiKey][step % patterns[actor.aiKey].length];
  if (actor.aiKey === 'warder') return step % 2 === 0 ? 'Grants a 5-point ward to the most injured enemy. Defeat it to stop the support.' : 'Strikes the most injured ally; a defender can draw the hit.';
  if (actor.aiKey === 'leech') return 'Drains the most injured ally and restores half the damage as health.';
  if (actor.aiKey === 'sniper') return 'Targets the ally with the largest magic reserves unless a defender draws the shot.';
  if (actor.aiKey === 'hexer') return 'Strikes and weakens the target’s next attack by 3.';
  if (actor.aiKey === 'barbed') return 'Strikes and causes 2 bleeding damage for two turns. Wards can cleanse it.';
  return 'Attacks the most injured ally; a defender can draw the attack.';
}

function enemyTurn(battle, actor) {
  if(battle.effectsVersion===27&&executeEnemyPlan(battle,actor,{damage:(a,t,n,o)=>dealDamage(battle,a,t,n,o),heal:(a,n)=>restoreHealth(battle,a,n),stopped:()=>ironmanCombatStopped(battle),log:t=>addLog(battle,t)}))return;
  const selection = resolveEnemyTargets(battle, actor, { planned: false });
  const target = selection.target;
  if (!target) return;
  const weak = number(actor.status.weakened);
  if (weak) addLog(battle, `${actor.name}'s next attack is weakened.`);
  const step = number(actor.aiStep);
  const attack = number(actor.attackPower, 5);
  let victims = [target];
  const strike = (victim, power = attack) => dealDamage(battle, actor, victim, power, { pierce: actor.role === 'spirit' });
  const wave = (power) => {
    victims = [...selection.recipients];
    for (const ally of victims) { if (ironmanCombatStopped(battle)) break; if (weak) actor.status.weakened = weak; strike(ally, power); }
    delete actor.status.weakened;
  };
  const ward = (ally, amount) => { ally.status.ward = number(ally.status.ward) + amount; addLog(battle, `${actor.name} grants ${ally.name} a ${amount}-point ward.`); victims = []; };
  if (actor.aiKey === 'warder' && step % 2 === 0) ward(selection.recipients[0], 5);
  else if (actor.aiKey === 'keeper' && step % 3 === 0) ward(actor, 8);
  else if (actor.aiKey === 'keeper' && step % 3 === 1) wave(Math.max(3, attack - 3));
  else if (actor.aiKey === 'keeper') strike(target, attack + 3);
  else if (actor.aiKey === 'archivist' && step % 3 === 1) ward(actor, 8);
  else if (actor.aiKey === 'archivist' && step % 3 === 2) wave(Math.max(3, attack - 3));
  else if (actor.aiKey === 'thornheart' && step % 2 === 1) {
    restoreHealth(battle, actor, 6);
    ward(actor, 4);
    addLog(battle, `${actor.name}'s roots restore up to 6 health.`);
  } else if (actor.aiKey === 'captain' && step % 3 === 1) { for (const ally of selection.recipients) ward(ally, 4); }
  else if (actor.aiKey === 'captain' && step % 3 === 2) wave(Math.max(3, attack - 3));
  else if (actor.aiKey === 'warden' && step % 3 === 1) ward(actor, 10);
  else if (actor.aiKey === 'warden' && step % 3 === 2) wave(Math.max(3, attack - 3));
  else if (actor.aiKey === 'covenant' && step % 3 === 0) wave(Math.max(3, attack - 6));
  else if (actor.aiKey === 'covenant' && step % 3 === 2) ward(actor, 12);
  else {
    const damage = strike(target, attack + (['captain', 'warden', 'covenant', 'keeper'].includes(actor.aiKey) ? 3 : 0));
    if (ironmanCombatStopped(battle)) return;
    if (actor.aiKey === 'leech') { const amount = restoreHealth(battle, actor, Math.ceil(damage / 2)); addLog(battle, `${actor.name} drains ${amount} health back.`); }
  }
  if (ironmanCombatStopped(battle)) return;
  for (const victim of victims.filter(alive)) {
    if (['hexer', 'archivist'].includes(actor.aiKey) || actor.aiKey === 'warden' && step % 3 === 2) { applyStatus(victim,'weakened',3,undefined,t=>addLog(battle,t)); addLog(battle, `${victim.name}'s next strike is weakened by 3.`); }
    if (['barbed', 'thornheart'].includes(actor.aiKey) || actor.aiKey === 'covenant' && step % 3 === 1) { if(applyStatus(victim,'bleed',2,2,t=>addLog(battle,t)))addLog(battle, `${victim.name} is bleeding. Cleansing magic removes the wound.`); }
  }
  if (alive(target) && actor.trait === 'snare' && battle.round % 2 === 1) {
    applyStatus(target,'weakened',2,undefined,t=>addLog(battle,t));
    addLog(battle, `${actor.name}'s snare weakens ${target.name}'s next strike by 2.`);
  }
  if (alive(target) && actor.trait === 'barbed' && battle.round % 2 === 1) {
    if(applyStatus(target,'bleed',2,2,t=>addLog(battle,t)))addLog(battle, `${actor.name} leaves ${target.name} bleeding for the next 2 turns. A warding spell can cleanse it.`);
  }
  if (actor.aiKey) { actor.aiStep = step + 1; actor.intent = enemyIntent(actor); }
}

function processEnemyTurns(battle) {
  while (!battle.outcome && current(battle)?.side === 'enemy') {
    const actor = current(battle);
    const order = [...battle.turnOrder];
    enemyTurn(battle, actor);
    if (finishIfNeeded(battle)) return;
    advanceTurn(battle, actor.id, order);
  }
}

function createHumanDuel(game,context,{openingTurns=true}={}) {
  if(!validTournamentContext(game,context))throw new Error('The local challenge has no matching active bout.');
  const t=game.adultTournament,p=t.opponents[t.results.length],profile=humanDuelProfile(p.profileId,t.difficulty),hero=makeHero(game);
  if(game.rpg)hero.trainedTechniques=[...game.rpg.trainedTechniques];
  const enemy={id:'enemy-1',name:p.name,side:'enemy',role:'humanoid',hp:profile.hp,maxHp:profile.hp,mp:0,maxMp:0,attackPower:profile.attackPower,agility:profile.agility,armor:profile.armor,aiKey:'striker',aiStep:0,defending:false,status:{},namedTarget:true,sourcePersonId:p.id,duelPlanId:p.profileId,duelDifficulty:t.difficulty,planCycle:profile.cycle,illustration:{kind:'person',age:p.age,appearance:clone(p.appearance)},bloodless:false};
  enemy.intent=enemyIntent(enemy);
  const actors=[hero,enemy],turnOrder=actors.map((actor,index)=>({actor,index})).sort((a,b)=>b.actor.agility-a.actor.agility||a.index-b.index).map(x=>x.actor.id);
  const battle={encounterId:'watchhouse_duel',title:'The Watchhouse Challenge · Bout '+(t.results.length+1)+' of 3',actors,startingHeroHp:game.hero.hp,turnOrder,variant:0,currentActorId:turnOrder[0],round:1,log:['A supervised solo bout. Zero bout Health is a stopped contest, never a death. Your real remaining Health, Focus and potions carry back.'],potions:Math.max(0,Math.floor(number(game.hero.potions))),tacticsVersion:25,formationEarned:false,coverUsed:false,outcome:null,rewards:{gold:0,exp:0},potionsUsed:0,balanceVersion:21,effectsVersion:27,attendantUsed:false,rulesVersion:18,tournamentRulesVersion:1,context:clone(context)};
  const mortality=captureBattleMortality(game,{nonlethal:true,solo:true});if(mortality){battle.mortality=mortality;if(!validateBattleMortality(battle,game))throw new Error('The captured mortality participants do not match this solo bout.');}
  if(openingTurns){beginTurn(battle);processEnemyTurns(battle);}return battle;
}
export function createBattle(game, encounterId = 'forest', context = null, { openingTurns = true } = {}) {
  if(encounterId==='watchhouse_duel')return createHumanDuel(game,context,{openingTurns});
  const supervisedTrial = encounterId === 'initiation' && validPaladinTrialContext(game, context);
  if (context?.kind === 'initiation' && !supervisedTrial) throw new Error('The supervised trial has no matching accepted Paladin oath.');
  const free=/^free_(beast|undead|spirit|construct|bandit|aberration)$/.test(encounterId);
  const rpg=/^rpg_(guardian|pursuit)$/.test(encounterId);
  const id = rpg||free?encounterId:Object.hasOwn(ENCOUNTERS, encounterId) ? encounterId : 'forest';
  const spec=free?adventureEncounter(game,context):null;
  const boss=rpg?ENCOUNTER_DESIGN_V27.bosses.find(b=>b.id===context?.bossId):null;
  const rpgEncounter=rpg?{title:boss?.name||'The lower guard',rewards:{gold:boss?35:18,exp:boss?60:24},enemies:boss?[attachEnemyPlan({name:boss.name,role:boss.family==='bandit'?'humanoid':boss.family,hp:72,attackPower:9,agility:5,armor:2,aiKey:'striker',illustration:enemyIllustration(boss.speciesId,game.seed,'boss:'+boss.id)},boss.speciesId,{bossId:boss.id}),...proceduralEnemies(game,boss.family==='bandit'?'bandit':boss.family,1,'support:'+boss.id).slice(0,1)]:proceduralEnemies(game,'construct',2,'rpg:'+context?.dungeonId)}:null;
  const encounter = rpg?rpgEncounter:free?{title:spec.title,rewards:{gold:10+spec.tier*5,exp:18+spec.tier*8},enemies:proceduralEnemies(game,id.slice(5),spec.tier,spec.salt,spec.targetName,spec.targetPerson)}:ENCOUNTERS[id];
  const hero = makeHero(game);
  if(game.rpg)hero.trainedTechniques=[...game.rpg.trainedTechniques];
  const recruited = (game.companions || []).filter((companion) => companion.recruited && companion.active).slice(0, 3).filter(c=>!(game.revision>=5)||c.alive!==false&&c.hp>0);
  const actors = [hero, ...recruited.map(c=>companionCombatProfile(game,c).actor), ...encounter.enemies.map((enemy, index) => ({
    ...enemy, id: `enemy-${index + 1}`, side: 'enemy', maxHp: enemy.hp,
    ...(index===0&&(spec?.targetName||spec?.targetPerson)?{namedTarget:true}:{}),
    mp: 0, maxMp: 0, defending: false, status: {},
    intent: enemyIntent(enemy),
    ...(id==='feral_vampire'||id==='moon_mauler'?{illustration:{kind:'curse',age:35,appearance:generateCharacter(game.seed,'curse-enemy:'+id,{age:35,role:'Exile'}).appearance,condition:id==='feral_vampire'?{type:'vampire',curseVersion:1,stage:'changed',form:'feral',hunger:100,humanity:10,bloodline:BLOOD_LINEAGES[seededRoll(game.seed,'feral-lineage:'+number(game.flags?.battlesStarted),BLOOD_LINEAGES.length)].id}:{type:'lycanthrope',curseVersion:1,stage:'changed',form:'feral'}}}:{}),
    ...(/_hunters$/.test(id)?{illustration:{kind:'person',age:40,appearance:generateCharacter(game.seed,'hunter:'+id+':'+index,{role:'Soldier',age:40}).appearance}}:{}),
    ...(game.revision >= 5 ? { bloodless: typeof enemy.bloodless==='boolean'?enemy.bloodless:['undead','construct','spirit'].includes(enemy.role) || /sentinel|golem|husk|keeper|archivist|guardian|thornheart|sprout|seal|spark/i.test(enemy.name) } : {}),
  }))];
  // Old battle saves keep their exact actors. New revision-2 encounters vary by
  // seed and encounter count, while the original low-level tuning stays useful.
  const expanded = game.revision >= 2 || ['gentle', 'balanced', 'perilous'].includes(game.difficulty);
  let variant = 0;
  if (expanded) {
    variant = seededRoll(game.seed, `${id}:${number(game.flags?.battlesStarted)}:formation`, 3);
    const growth = Math.min(8, Math.max(0, number(game.hero.level, 1) - 1) * 2);
    const strength = Math.min(2, Math.floor(Math.max(0, number(game.hero.level, 1) - 1) / 3));
    const difficulty = game.difficulty === 'gentle' ? -1 : game.difficulty === 'perilous' ? 1 : 0;
    for (const enemy of actors.filter((actor) => actor.side === 'enemy')) {
      enemy.hp = Math.max(10, enemy.hp + growth + difficulty * 3);
      enemy.maxHp = enemy.hp;
      enemy.attackPower = Math.max(2, enemy.attackPower + strength + difficulty);
    }
    const first = actors.find((actor) => actor.id === 'enemy-1');
    const second = actors.find((actor) => actor.id === 'enemy-2');
    const legacyEncounter = ['forest', 'ruin', 'initiation'].includes(id);
    if (variant === 1 && legacyEncounter) {
      second.trait = 'snare';
      second.name = id === 'forest' ? 'Road trapper' : id === 'ruin' ? 'Binding echo' : 'Binding shade';
      second.intent += ' Every other round, it weakens the target’s next strike.';
    } else if (variant === 2 && legacyEncounter) {
      first.status.ward = 4;
      first.name = id === 'forest' ? 'Thornback wolf' : id === 'ruin' ? 'Runic sentinel' : 'Warded trial guardian';
      second.trait = 'barbed';
      second.intent += ' Every other round, its attack causes bleeding. Warding magic cleanses bleeding.';
    } else if (variant === 1) {
      first.status.ward = 3;
    } else if (variant === 2) {
      if (second) second.status.ward = 3;
    }
  }
  if(game.realm)for(const enemy of actors.filter(a=>a.side==='enemy'))if(!enemy.illustration)enemy.illustration=identifyEnemy(enemy,game.seed,`${id}:${game.flags?.battlesStarted||0}:${enemy.id}`);
  for(const enemy of actors.filter(a=>a.side==='enemy'&&a.illustration?.condition?.type==='vampire')){
    const lineage=bloodLineage(enemy.illustration.condition);
    enemy.name=`Feral vampire of ${lineage.name}`;
    enemy.aiKey={velvet_sepulchre:'hexer',ashen_choir:'warder',gloamwing:'sniper',blackroot:'leech'}[lineage.id];
    enemy.intent=enemyIntent(enemy);
  }
  if(game.revision>=5)for(const enemy of actors.filter(a=>a.side==='enemy'))enemy.name=battleActorDisplayName(enemy,{encounterId:id});
  if(game.rpg){
    for(let i=0;i<actors.length;i++)if(actors[i].side==='enemy'&&!actors[i].planCycle&&actors[i].illustration?.kind==='foe')actors[i]=attachEnemyPlan(actors[i],actors[i].illustration.species);
    for(const a of actors.filter(a=>a.side==='enemy'))a.intent=enemyIntent(a);
    if(hero.trainedTechniques.includes('grave_attendant'))actors.push({id:'ash_attendant',name:'Ash attendant',side:'party',role:'warrior',hp:0,maxHp:18,mp:0,maxMp:0,agility:3,armor:1,attackPower:7,defending:false,status:{},ephemeral:true});
  }
  // Fixed encounter tuning: bringing companions or earning a stronger build never
  // raises enemy stats. Existing saved actors are never rebuilt.
  if (game.revision >= 5 && game.difficulty === 'perilous' &&
      (boss || spec?.tier >= 3 || /keeper$|warden$|captain$|thornheart$|covenant_guardian$/.test(id))) {
    for (const enemy of actors.filter(a => a.side === 'enemy')) {
      enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * 1.45);
    }
  }
  const turnOrder = actors.filter(alive).map((actor, index) => ({ actor, index }))
    .sort((a, b) => b.actor.agility - a.actor.agility || a.index - b.index)
    .map(({ actor }) => actor.id);
  const battle = {
    encounterId: id, title: encounter.title, actors,startingHeroHp:game.hero.hp, turnOrder, variant,
    currentActorId: turnOrder[0] || null, round: 1,
    log: ['The danger is visible. Defend to draw attacks and reduce damage; retreat is always available.'],
    potions: Math.max(0, Math.floor(number(game.hero.potions))),
    tacticsVersion:25,formationEarned:Object.values(game.fellowship?.formations||{}).some(f=>f.stage==='completed')||false,coverUsed:false,
    outcome: null, rewards: clone(encounter.rewards), potionsUsed: 0,
  };
  const mortality = captureBattleMortality(game, { nonlethal: supervisedTrial }); if (mortality) battle.mortality = mortality;
  if (supervisedTrial) battle.context = clone(context);
  if (mortality && !validateBattleMortality(battle, game)) throw new Error('The captured mortality participants do not match this party.');
  if(game.revision>=5)battle.balanceVersion=21;
  if(game.rpg){battle.effectsVersion=27;battle.attendantUsed=false;}
  if(spec&&spec.tier>=3&&game.revision>=5)for(const foe of actors.filter(a=>a.side==='enemy'))foe.hp=foe.maxHp=Math.round(foe.maxHp*(1+Math.min(.6,(spec.tier-2)*.15)));
  if(game.realm){battle.rulesVersion=18;if(spec?.captureAllowed)battle.captureAllowed=true;}
  if (expanded) addLog(battle, `Formation ${variant + 1}; ${game.difficulty || 'balanced'} danger. Marks add damage; wards absorb hits; feints weaken attacks; bleeding can be cleansed.`);
  if (id === 'initiation') {
    battle.title = hero.role === 'warrior' ? 'The oathkeeper’s trial'
      : hero.role === 'mage' ? 'The forbidden study’s guardian' : 'The silent contract';
  }
  if (!finishIfNeeded(battle)) {
    if (openingTurns) { beginTurn(battle); processEnemyTurns(battle); }
  }
  return battle;
}

export function getBattleActions(battle) {
  if (!battle || battle.outcome) return [];
  const actor = current(battle);
  if (!actor || !alive(actor) || actor.side !== 'party' || combatDead(battle, actor.id)) return [];
  const skill = skillOf(actor);
  const tactic = tacticOf(actor);
  const actions = [...advancedBattleActions(battle,actor),
    { id: 'attack', label: 'Attack', description: 'Strike a living enemy without spending magic.', cost: 'Free', needsTarget: true, targetSide: 'enemy' },
    { id: 'skill', label: skill.label, description: skill.description, cost: `${skill.cost} MP${actor.specialization === 'berserker' ? ' · 4 HP' : ''}`, needsTarget: true, targetSide: skill.targetSide,
      ...(actor.role==='healer'&&party(battle).every(a=>a.hp===a.maxHp&&(actor.specialization!=='healer'||number(a.status.ward)>=3))?{disabledReason:'Every living ally is healthy and already warded.'}:{}),
      ...(actor.mp < skill.cost ? { disabledReason: 'Not enough MP.' } : {}),
      ...(actor.specialization === 'berserker' && actor.hp <= 4 ? { disabledReason: 'You need more than 4 health for a reckless cleave.' } : {}),
      ...(actor.specialization === 'paladin' && actor.oathBroken ? { disabledReason: 'Your broken oath suppresses this power. Seek atonement.' } : {}),
    },
    { id: 'tactic', label: tactic.label, description: tactic.description, cost: `${tactic.cost} MP`, mpCost: tactic.cost, needsTarget: tactic.needsTarget !== false, targetSide: tactic.targetSide,
      ...(actor.mp < tactic.cost ? { disabledReason: 'Not enough MP.' } : {}),
      ...(actor.specialization === 'paladin' && actor.oathBroken ? { disabledReason: 'Your broken oath suppresses this power. Seek atonement.' } : {}),
    },
    { id: 'defend', label: 'Defend', description: 'Draw enemy attacks and reduce incoming damage by 65% until your next turn. Recover 2 MP.', cost: 'Free', needsTarget: false },
    { id: 'potion', label: 'Use potion', description: 'Restore up to 30 health to a living ally from the shared supply.', cost: '1 potion', needsTarget: true, targetSide: 'party',
      ...(battle.potions < 1 ? { disabledReason: 'No potions left.' } : party(battle).every((ally) => ally.hp === ally.maxHp) ? { disabledReason: 'Everyone is already at full health.' } : {}),
    },
    { id: 'retreat', label: 'Retreat', description: 'Leave safely with no reward. The approach time has already passed; retreat adds no extra days.', cost: 'No reward', needsTarget: false },
  ];
  if(battle.tacticsVersion===25){if(battle.formationEarned&&!battle.coverUsed&&party(battle).length>1)actions.push({id:'party_cover',label:'Practiced covering formation',description:'An earned formation grants all living allies 5 ward and cleanses bleeding. Once per battle; spend 6 MP.',cost:'6 MP',needsTarget:false,...(actor.mp<6?{disabledReason:'Requires 6 MP.'}:{})});if(actor.id==='hero'&&actor.equipment?.weapon)actions.push({id:'weapon_counter',label:/staff|wand/.test(actor.equipment.weapon)?'Disrupt the spell guard':/bow/.test(actor.equipment.weapon)?'Pin the approach':/hammer|mace/.test(actor.equipment.weapon)?'Crush the ward':/spear/.test(actor.equipment.weapon)?'Brace and thrust':'Riposte through the opening',description:/staff|wand/.test(actor.equipment.weapon)?'Spend 3 MP. Remove up to 8 ward, weaken its next strike by 3 and cancel its prepared charge or stolen power. An uncharged physical strike can still land.':'Spend 3 MP. Bows weaken and mark; blunt weapons strip 6 ward and strike; spears brace and strike; blades mark two openings and strike.',cost:'3 MP',needsTarget:true,targetSide:'enemy',...(actor.mp<3?{disabledReason:'Requires 3 MP.'}:{})});}
  if(battle.rulesVersion===18){
    actions.push({id:'inspect',label:'Read the enemy',description:'Spend a turn studying a foe. Reveal its weakness and status resistances, break a prepared charge and mark one opening.',cost:'Free',needsTarget:true,targetSide:'enemy'});
    if(actor.id==='hero'&&number(actor.skills?.arcana)>=3)for(const [element,label] of [['fire','Cinder lance'],['ice','Winter seal'],['lightning','Storm needle']])actions.push({id:'spell_'+element,label,description:'An armor-piercing spell. Matching an enemy’s weakness strengthens the hit.',cost:'5 MP',needsTarget:true,targetSide:'enemy',...(actor.mp<5?{disabledReason:'Requires 5 MP.'}:{})});
    if(actor.id==='hero'&&number(actor.skills?.devotion)>=3)actions.push({id:'spell_radiance',label:'Lantern ray',description:'Spend 5 MP on a piercing sacred strike. A recorded radiance weakness strengthens the hit.',cost:'5 MP',needsTarget:true,targetSide:'enemy',...(actor.specialization==='paladin'&&actor.oathBroken?{disabledReason:'Your broken oath suppresses this sacred power. Seek atonement.'}:{}),...(actor.mp<5?{disabledReason:'Requires 5 MP.'}:{})});
    if(battle.captureAllowed){const targets=enemies(battle).filter(e=>e.id==='enemy-1'&&e.hp<=Math.ceil(e.maxHp*.35)).map(e=>e.id);actions.push({id:'capture',label:'Take the bounty alive',description:'Restrain the named target below 35% health. Other enemies must still be overcome; a living captive earns a bonus.',cost:'3 MP',needsTarget:true,targetSide:'enemy',targetIds:targets,...(actor.mp<3?{disabledReason:'Requires 3 MP.'}:!targets.length?{disabledReason:'Weaken the named target below 35% health first.'}:{})});}
  }
  if(battle.balanceVersion===21&&battle.captureAllowed)actions.push({id:'hold_back',label:'A controlled strike',description:'Strike the named bounty target for at most a fifth of its maximum health. This strike leaves at least 1 HP; existing burning or bleeding can still kill.',cost:'Free',needsTarget:true,targetSide:'enemy',targetIds:['enemy-1']});
  if (actor.condition?.type === 'vampire'&&actor.condition.stage!=='incubating') {
    if(actor.condition.curseVersion===1)actions.push({id:'bloodline',label:bloodLineage(actor.condition).gift,description:bloodLineage(actor.condition).power+' Costs 6 MP and adds 4 hunger.',cost:'6 MP · 4 hunger',needsTarget:!(battle.effectsVersion===27&&actor.condition.bloodline==='ashen_choir'),targetSide:'enemy',...(actor.mp<6?{disabledReason:'Requires 6 MP.'}:{})});
    const targetIds = enemies(battle).filter(target => target.bloodless !== true).map(target => target.id);
    actions.splice(2, 0, {
      id: 'blood', label: 'Blood draw', description: 'Drain a living, flesh-bearing enemy to restore your health and ease blood hunger. Stone constructs, spirits, and rooted guardians provide no blood.', cost: '4 MP', needsTarget: true, targetSide: 'enemy', targetIds,
      ...(actor.mp < 4 ? { disabledReason: 'Not enough MP.' } : targetIds.length === 0 ? { disabledReason: 'No remaining enemy carries blood. Use your other trained abilities.' } : {}),
    });
  }
  if (actor.condition?.type === 'lycanthrope'&&actor.condition.stage!=='incubating') actions.splice(3, 0, {
    id: 'feral', label: 'Feral surge', description: 'Spend 12 control and 3 health for a powerful armor-piercing strike. Your education and combat path remain.', cost: '12 control · 3 HP', needsTarget: true, targetSide: 'enemy',
    ...(number(actor.condition.control) < 12 ? { disabledReason: 'Requires 12 control. Center your instincts or practice restraint outside battle.' } : actor.hp <= 3 ? { disabledReason: 'You need more than 3 health to risk a surge.' } : {}),
  }, {
    id: 'steady', label: 'Center instincts', description: 'Recover up to 4 control and gain a 3-point ward. Enemies still take their turns.', cost: '4 MP', needsTarget: false,
    ...(actor.mp < 4 ? { disabledReason: 'Not enough MP.' } : number(actor.condition.control) >= 100 ? { disabledReason: 'Your control is already complete.' } : {}),
  });
  if(battle.effectsVersion===27){
    const surrender=enemies(battle).filter(e=>e.status.surrenderable).map(e=>e.id);if(surrender.length)actions.push({id:'surrender',label:'Accept the conscript’s surrender',description:'Spend this action accepting a real offered surrender. The living conscript no longer fights or grants pack support.',cost:'Free',needsTarget:true,targetSide:'enemy',targetIds:surrender});
    if(actor.sealedTechnique)for(const a of actions)if(a.id===actor.sealedTechnique)a.disabledReason='This technique is sealed for one action. Choose another approach.';
    if(actor.status.silenced)for(const a of actions)if(a.id.startsWith('spell_')||['skill','tactic'].includes(a.id)&&(['mage','healer'].includes(actor.role)||['paladin','bard'].includes(actor.specialization)))a.disabledReason='Silenced for this action. Choose a physical attack, defense or supplies.';
  }
  return tournamentActionPolicy(battle,actor.role === 'civilian' ? actions.filter((action) => !['skill', 'tactic'].includes(action.id)) : actions);
}

function basicPower(actor) {
  if (Number.isFinite(actor.attackPower)) return actor.attackPower;
  const attributes = actor.attributes || {};
  const skills = actor.skills || {};
  const extra = number(actor.gear?.attack);
  if (actor.role === 'civilian') return 5 + Math.floor(number(attributes.strength, 3) / 2) + number(skills.weapons) + extra;
  if (actor.role === 'rogue') return 5 + number(attributes.agility, 3) + number(skills.stealth) + extra;
  if (actor.role === 'mage' || actor.role === 'healer') return 4 + Math.floor(number(attributes.strength, 3) / 2) + number(skills.weapons) + extra;
  return 6 + number(attributes.strength, 3) + number(skills.weapons) + extra;
}

function useSkill(battle, actor, target) {
  const skill = skillOf(actor);
  actor.mp -= skill.cost;
  addLog(battle, `${actor.name} uses ${skill.label}.`);
  const attributes = actor.attributes || {};
  const skills = actor.skills || {};
  const physical = basicPower(actor);
  const magic = arcanePower(actor);
  if (actor.specialization === 'guardian') {
    dealDamage(battle, actor, target, physical + 3);
    actor.status.ward = number(actor.status.ward) + 5;
    actor.defending = true; actor.status.protecting = true;
  } else if (actor.specialization === 'berserker') {
    setHealth(battle, actor, actor.hp - 4);
    if (ironmanCombatStopped(battle)) return;
    dealDamage(battle, actor, target, physical + 10);
    addLog(battle, `${actor.name} risks 4 health in the cleave.`);
  } else if (actor.specialization === 'knight') {
    dealDamage(battle, actor, target, physical + 6);
    applyStatus(target, 'weakened', 3, undefined, text => addLog(battle, text));
    actor.defending = true; actor.status.protecting = true;
  } else if (actor.specialization === 'healer') {
    const amount = restoreHealth(battle, target, 20 + number(actor.gear?.magic));
    if (combatDead(battle, target.id) || ironmanCombatStopped(battle)) return;
    target.status.ward = number(target.status.ward) + 3;
    addLog(battle, `${target.name} recovers ${amount} health and gains a 3-point ward.`);
  } else if (actor.specialization === 'elementalist') {
    dealDamage(battle, actor, target, magic + 2, { pierce: true });
    applyStatus(target, 'burn', 2, 2, text => addLog(battle, text));
  } else if (actor.specialization === 'druid') {
    dealDamage(battle, actor, target, magic - 2, { pierce: true });
    applyStatus(target, 'weakened', 4, undefined, text => addLog(battle, text)); target.status.marked = 1;
    restoreHealth(battle, actor, 3);
  } else if (actor.specialization === 'thief') {
    const stolen = Math.min(4, number(target.status.ward));
    target.status.ward = number(target.status.ward) - stolen;
    actor.status.ward = number(actor.status.ward) + stolen;
    dealDamage(battle, actor, target, physical + 3, { pierce: true });
    applyStatus(target, 'weakened', 3, undefined, text => addLog(battle, text));
    addLog(battle, `${actor.name} steals ${stolen} ward from ${target.name}.`);
  } else if (actor.specialization === 'ranger') {
    dealDamage(battle, actor, target, physical + 5, { pierce: true });
    target.status.marked = 2;
  } else if (actor.specialization === 'bard') {
    restoreHealth(battle, target, 6);
    target.mp = Math.min(target.maxMp, target.mp + 3);
    target.status.ward = number(target.status.ward) + 4;
    addLog(battle, `${target.name} rallies: up to 6 health, 3 MP, and a 4-point ward.`);
  } else if (actor.specialization === 'paladin') {
    dealDamage(battle, actor, target, physical + 8 + number(skills.devotion) + number(actor.gear?.magic), { pierce: true });
    actor.defending = true;
    actor.status.protecting = true;
    party(battle).forEach((ally) => { ally.status.ward = number(ally.status.ward) + 2; });
  } else if (actor.specialization === 'necromancer') {
    const drained=dealDamage(battle, actor, target, magic + 3, { pierce: true });
    if(battle.effectsVersion===27)restoreHealth(battle,actor,Math.min(10,Math.ceil(drained/3)));
    applyStatus(target, 'weakened', 3, undefined, text => addLog(battle, text));
    actor.status.ward = number(actor.status.ward) + 5;
  } else if (actor.specialization === 'assassin') {
    dealDamage(battle, actor, target, physical + 7 + (target.hp < target.maxHp ? 5 : 0), { pierce: true });
  } else if (actor.role === 'healer') {
    const amount = restoreHealth(battle, target, 20);
    addLog(battle, `${target.name} recovers ${amount} health.`);
  } else if (actor.role === 'mage') {
    dealDamage(battle, actor, target, magic, { pierce: true });
    actor.status.ward = number(actor.status.ward) + 3;
  } else if (actor.role === 'rogue') {
    dealDamage(battle, actor, target, physical + 5, { pierce: true });
    applyStatus(target, 'weakened', 3, undefined, text => addLog(battle, text));
  } else {
    dealDamage(battle, actor, target, physical + 5);
    actor.defending = true;
    actor.status.protecting = true;
  }
}

function useTactic(battle, actor, target) {
  if(battle.effectsVersion===27&&target?.side==='party'){for(const k of ['poison','poisonTurns','fear','silenced','rooted'])delete target.status[k];}
  const tactic = tacticOf(actor);
  actor.mp -= tactic.cost;
  addLog(battle, `${actor.name} uses ${tactic.label}.`);
  if (actor.specialization === 'berserker') {
    for (const foe of enemies(battle)) { foe.status.marked = Math.max(1, number(foe.status.marked)); applyStatus(foe,'weakened',2,undefined,t=>addLog(battle,t)); }
    return;
  }
  if (actor.specialization === 'elementalist') {
    const removed = Math.min(8, number(target.status.ward)); target.status.ward = number(target.status.ward) - removed;
    applyStatus(target, 'weakened', 4, undefined, text => addLog(battle, text));
    addLog(battle, `${target.name} loses ${removed} ward and its next attack is weakened.`);
    return;
  }
  if (actor.specialization === 'thief') { applyStatus(target, 'weakened', 5, undefined, text => addLog(battle, text)); target.status.marked = 1; return; }
  if (actor.specialization === 'ranger') {
    dealDamage(battle, actor, target, Math.ceil(basicPower(actor) * 0.55), { pierce: true });
    applyStatus(target, 'weakened', 4, undefined, text => addLog(battle, text)); applyStatus(target, 'bleed', 2, 2, text => addLog(battle, text));
    return;
  }
  if (actor.specialization === 'knight') {
    target.status.marked = 2; applyStatus(target, 'weakened', 4, undefined, text => addLog(battle, text));
    actor.defending = true; actor.status.protecting = true;
    return;
  }
  if (actor.specialization === 'bard') {
    target.status.marked = 2; applyStatus(target, 'weakened', 3, undefined, text => addLog(battle, text));
    party(battle).forEach((ally) => { ally.status.ward = number(ally.status.ward) + 2; });
    return;
  }
  if (tactic.targetSide === 'party') {
    const healing = restoreHealth(battle, target, actor.specialization === 'paladin' ? 10 : actor.specialization === 'druid' ? 12 + number(actor.gear?.magic) : actor.specialization === 'healer' ? 4 : 0);
    if (combatDead(battle, target.id) || ironmanCombatStopped(battle)) return;
    target.status.ward = number(target.status.ward) + (actor.specialization === 'paladin' ? 8 : actor.specialization === 'guardian' ? 10 : actor.specialization === 'druid' ? 3 : 9) + number(actor.gear?.magic);
    delete target.status.bleed;
    delete target.status.bleedTurns;
    delete target.status.burn;
    delete target.status.burnTurns;
    delete target.status.weakened;
    if (actor.specialization === 'guardian') { actor.defending = true; actor.status.protecting = true; }
    addLog(battle, `${target.name} gains a protective ward and is cleansed${healing ? `, recovering ${healing} health` : ''}.`);
  } else if (actor.role === 'rogue') {
    dealDamage(battle, actor, target, Math.ceil(basicPower(actor) * 0.55), { pierce: true });
    const bleeding=applyStatus(target, 'bleed', actor.specialization === 'assassin' ? 4 : 3, 2, text => addLog(battle, text));
    target.status.marked = Math.max(1, number(target.status.marked));
    addLog(battle, `${target.name}${bleeding?' will bleed before its next two turns and is marked':' is marked'} for a party follow-up.`);
  } else {
    target.status.marked = 2;
    applyStatus(target,'weakened',actor.specialization === 'necromancer' ? 4 : 3,undefined,t=>addLog(battle,t));
    addLog(battle, `${target.name} has two marked openings and a weakened next strike.`);
  }
}

function commandTarget(battle, action, targetId) {
  const actor = current(battle);
  return action.needsTarget ? battle.actors.find(a => a.id === (targetId || (action.targetSide === 'party' ? actor?.id : null))) : null;
}
function commandReason(battle, action, target) {
  if(action&&tournamentCommandReason(battle,action.id))return tournamentCommandReason(battle,action.id);
  if (!action) return 'That action is unavailable.';
  if (action.disabledReason) return action.disabledReason;
  if (!action.needsTarget) return null;
  if (!target || !alive(target) || combatDead(battle, target.id) || target.side !== action.targetSide) return `Choose a living ${action.targetSide === 'party' ? 'ally' : 'enemy'} as the target.`;
  if (action.targetIds && !action.targetIds.includes(target.id)) return action.id === 'blood' ? `${battleActorDisplayName(target,battle)} carries no blood. Choose a flesh-bearing enemy or another ability; no magic or turn was spent.` : ['capture','hold_back'].includes(action.id) ? 'Choose the named bounty target eligible for this action. No magic or turn was spent.' : 'Choose an eligible opponent for this ability. No magic or turn was spent.';
  const actor = current(battle);
  if ((action.id === 'potion' || action.id === 'skill' && actor.role === 'healer' && (actor.specialization !== 'healer' || number(target.status.ward) >= 3)) && target.hp === target.maxHp) return `${battleActorDisplayName(target,battle)} is already at full health.`;
  return null;
}
function applyBattleCommand(updated, actor, actionId, target) {
  if (actionId === 'retreat') {
    updated.outcome = 'retreat';
    updated.currentActorId = null;
    addLog(updated,isTournamentBattle(updated)?'You lower your weapon. The marshal records a withdrawal; both entrants remain alive.':'Your party leaves together. You live to choose another day.');
    return;
  }
  if(actionId.startsWith('tech_'))applyAdvancedTechnique(updated,actor,advancedTechnique(actionId.slice(5)),target,{damage:(a,t,n,o)=>dealDamage(updated,a,t,n,o),loseHealth:(a,n)=>setHealth(updated,a,a.hp-n),heal:(a,n)=>restoreHealth(updated,a,n),stopped:()=>ironmanCombatStopped(updated),power:basicPower,log:t=>addLog(updated,t)});
  else if(actionId==='surrender'){target.hp=0;target.status.captured=true;delete target.status.surrenderable;addLog(updated,target.name+' leaves the fighting alive through an accepted surrender.');}
  else if(actionId==='party_cover'){actor.mp-=6;updated.coverUsed=true;for(const ally of party(updated)){ally.status.ward=number(ally.status.ward)+5;delete ally.status.bleed;delete ally.status.bleedTurns;}addLog(updated,'The earned covering formation grants five ward and cleanses bleeding.');}
  else if(actionId==='weapon_counter'){actor.mp-=3;const weapon=actor.equipment.weapon;if(/staff|wand/.test(weapon)){target.status.ward=Math.max(0,number(target.status.ward)-8);applyStatus(target,'weakened',3,undefined,t=>addLog(updated,t));delete target.status.charged;delete target.status.stolenWard;}else if(/bow/.test(weapon)){applyStatus(target,'weakened',4,undefined,t=>addLog(updated,t));target.status.marked=1;}else if(/hammer|mace/.test(weapon)){target.status.ward=Math.max(0,number(target.status.ward)-6);dealDamage(updated,actor,target,basicPower(actor)+2);}else if(/spear/.test(weapon)){actor.defending=true;actor.status.ward=number(actor.status.ward)+4;dealDamage(updated,actor,target,basicPower(actor));}else{target.status.marked=2;dealDamage(updated,actor,target,basicPower(actor)-2);}addLog(updated,'The equipped weapon determines the counter.');}
  else if(actionId==='inspect'){target.status.inspected=true;delete target.status.charged;delete target.status.stolenWard;target.status.marked=number(target.status.marked)+1;addLog(updated,`${actor.name} reads ${target.name}: ${target.weakness?'vulnerable to '+target.weakness:'no elemental weakness found'}. ${resistanceReadout(target)} ${curseCombatNote(target.condition||target.illustration?.condition,target)} One opening is marked.`);}
  else if(actionId.startsWith('spell_')){const element=actionId.slice(6),match=target.weakness===element;actor.mp-=5;const sacred=element==='radiance';const power=10+Math.floor(number(actor.attributes?.[sacred?'willpower':'intellect'],3)/2)+number(actor.skills?.[sacred?'devotion':'arcana'])+number(actor.gear?.magic)+(match?7:0);dealDamage(updated,actor,target,power*((target.resistances||[]).includes(element)?.7:1),{pierce:true});if(element==='ice')applyStatus(target,'weakened',3,undefined,t=>addLog(updated,t));if(element==='fire')applyStatus(target,'burn',2,2,t=>addLog(updated,t));addLog(updated,`${actor.name} calls ${element}${match?' into an exposed weakness':''}.`);}
  else if(actionId==='capture'){actor.mp-=3;target.hp=0;target.status.captured=true;addLog(updated,`${target.name} is restrained alive. The bounty can be returned after the remaining fight.`);}
  else if(actionId==='hold_back')dealDamage(updated,actor,target,basicPower(actor),{nonlethal:true,maxDamage:Math.ceil(target.maxHp*.2)});
  else if (actionId === 'attack') {
    const physicalWeakness=updated.effectsVersion===27&&target.weakness==='physical';
    dealDamage(updated, actor, target, basicPower(actor)+(physicalWeakness?4:0));
    if(physicalWeakness)addLog(updated,`${actor.name} strikes into a physical weakness.`);
  }
  else if (actionId === 'skill') useSkill(updated, actor, target);
  else if (actionId === 'tactic'){useTactic(updated, actor, target);if(updated.effectsVersion===27&&target?.bloodless&&(target.status.bleed||actor.role==='rogue'&&!['thief','bard'].includes(actor.specialization))){delete target.status.bleed;delete target.status.bleedTurns;target.status.marked=2;addLog(updated,target.name+' carries no blood; the technique exposes its guard instead.');}}
  else if (actionId === 'feral') {
    actor.condition.control = clamp(number(actor.condition.control) - 12, 0, 100);
    setHealth(updated, actor, actor.hp - 3);
    if (ironmanCombatStopped(updated)) return;
    dealDamage(updated, actor, target, basicPower(actor) + 8, { pierce: true });
    addLog(updated, `${actor.name} pays 3 health and 12 control to contain a feral surge.`);
  } else if (actionId === 'steady') {
    actor.mp -= 4;
    const regained=Math.min(actor.condition.curseVersion===1?4:18,100-number(actor.condition.control));actor.condition.control = clamp(number(actor.condition.control) + regained, 0, 100);
    actor.status.ward = number(actor.status.ward) + 3;
    addLog(updated, `${actor.name} centers their instincts, recovering ${regained} control.`);
  }
  else if(actionId==='bloodline'){actor.mp-=6;actor.condition.hunger=clamp(actor.condition.hunger+4,0,100);const line=actor.condition.bloodline;if(line==='ashen_choir'){for(const ally of party(updated)){ally.status.ward=number(ally.status.ward)+6;delete ally.status.bleed;delete ally.status.bleedTurns;}addLog(updated,'The funeral hush grants the living party six ward and stills bleeding.');}else if(line==='velvet_sepulchre'){applyStatus(target,'weakened',6,undefined,t=>addLog(updated,t));actor.mp=Math.min(actor.maxMp,actor.mp+2);addLog(updated,'The predator’s allure weakens the next strike; two MP return.');}else {const damage=dealDamage(updated,actor,target,basicPower(actor)+(line==='gloamwing'?6:3),{pierce:true});if(line==='gloamwing')target.status.marked=2;else {restoreHealth(updated,actor,Math.ceil(damage/3));applyStatus(target,'weakened',3,undefined,t=>addLog(updated,t));}}}
  else if (actionId === 'blood') {
    actor.mp -= 4;
    const damage = dealDamage(updated, actor, target, 12 + Math.floor(number(actor.attributes?.willpower, 3) / 2), { pierce: true });
    const amount = restoreHealth(updated, actor, Math.ceil(damage * 0.7));
    actor.condition.hunger = Math.max(0, number(actor.condition.hunger) - 8);
    addLog(updated, `${actor.name} restores ${amount} health; blood hunger eases.`);
  } else if (actionId === 'defend') {
    actor.defending = true;
    actor.status.protecting = true;
    actor.mp = Math.min(actor.maxMp, actor.mp + 2);
    addLog(updated, `${actor.name} guards the party and recovers 2 MP.`);
  } else if (actionId === 'potion') {
    const amount = restoreHealth(updated, target, healingPotionAmount(target));
    updated.potions -= 1;
    updated.potionsUsed += 1;
    addLog(updated, `${actor.name} gives ${target.name} a potion, restoring ${amount} health.`);
  }
}

function resolveBattleAction(battle, actionId, targetId, report = null) {
  const updated = clone(battle);
  if (!updated || updated.outcome) {
    if (report) report.reason = 'There is no active encounter.';
    return updated;
  }
  const actor = current(updated);
  const action = getBattleActions(updated).find(candidate => candidate.id === actionId);
  const target = action ? commandTarget(updated, action, targetId) : null;
  const reason = commandReason(updated, action, target);
  if (reason) { if (report) report.reason = reason; addLog(updated, reason); return updated; }
  applyBattleCommand(updated, actor, actionId, target);
  // A seal constrains a real decision, not turn entry or a rejected command.
  if (actor.status.sealed > 0 && --actor.status.sealed === 0) { delete actor.status.sealed; delete actor.sealedTechnique; }
  delete actor.status.silenced;
  for (const enemy of enemies(updated)) enemy.intent = enemyIntent(enemy);
  // Only detached teaching/inspection callers request this extra snapshot. Real
  // battles retain their original one-clone path and exact returned position.
  if (report) {
    report.accepted = true;
    report.actorId = actor.id;
    report.targetId = target?.id || null;
    report.afterCommand = clone(updated);
  }
  if (updated.outcome) return updated;
  const order = [...updated.turnOrder];
  if (updated.effectsVersion === 27 && target?.side === 'enemy' && target.hp < battle.actors.find(a => a.id === target.id).hp) updated.lastDamagingAction = actionId;
  if (!finishIfNeeded(updated)) {
    advanceTurn(updated, actor.id, order);
    processEnemyTurns(updated);
  }
  return updated;
}

export function takeBattleAction(battle, actionId, targetId) {
  return resolveBattleAction(battle, actionId, targetId);
}

/** Actual command evidence before automatic turn effects, plus the usual result.
 * Neither snapshot is installed in a life or persisted by this module. */
export function takeBattleActionDetailed(battle, actionId, targetId) {
  const report = { accepted: false, actionId, actorId: null, targetId: null, reason: null, afterCommand: null };
  const result = resolveBattleAction(battle, actionId, targetId, report);
  return { ...report, battle: result };
}

export function partyPreparation(game){const active=(game.companions||[]).filter(p=>p.recruited&&p.active).slice(0,3),ready=active.filter(p=>p.alive!==false&&p.hp>0);return {participants:[{id:'hero',name:game.hero.name,role:game.hero.specialization||game.hero.path,hp:game.hero.hp,maxHp:game.hero.maxHp,mp:game.hero.mp,maxMp:game.hero.maxMp},...ready.map(p=>({id:p.id,name:p.name,role:p.role,hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp}))],unready:active.filter(p=>!ready.includes(p)).map(p=>({id:p.id,name:p.name,reason:p.alive===false?'Deceased':'Recover health before entry'})),potions:game.hero.potions,equipment:structuredClone(game.equipment?.equipped||{}),formationEarned:Object.values(game.fellowship?.formations||{}).some(f=>f.stage==='completed')||false};}

export function combatProfile(game) {
  const actor = makeHero(game);
  return { actor, attack: basicPower(actor), arcane: arcanePower(actor), armor: actor.armor };
}

// Resolve only the proposed command on a detached snapshot. This is the same
// resolver used by takeBattleAction; no turn, enemy, inventory or save advances.
export function previewBattleAction(battle, actionId, targetId) {
  const action = getBattleActions(battle).find(a => a.id === actionId);
  const target = action ? commandTarget(battle, action, targetId) : null;
  const reason = commandReason(battle, action, target);
  if (reason) return { legal: false, reason, summary: reason, effects: [] };
  const after = clone(battle);
  for(const member of after.actors)member.name=battleActorDisplayName(member,battle);
  const actor = current(after);
  const copyTarget = target ? after.actors.find(a => a.id === target.id) : null;
  // Isolate command messages even when the existing battle log has reached its cap.
  after.log = [];
  applyBattleCommand(after, actor, actionId, copyTarget);
  const effects = [];
  const labels = { bleed: 'bleeding', burn: 'burning', poison: 'poison', weakened: 'weakened', marked: 'openings', rooted: 'rooted strike', stunned: 'missed action', silenced: 'silenced action', fear: 'fear', veil: 'veil', bramble: 'retaliatory thorns', protecting: 'guarding', inspected: 'studied', captured: 'leaves fighting alive', charged: 'charge', stolenWard: 'stolen power' };
  for (const next of after.actors) {
    const before = battle.actors.find(a => a.id === next.id), parts = [];
    const hp = next.hp - before.hp, mp = next.mp - before.mp, ward = number(next.status.ward) - number(before.status.ward);
    if (next.status.captured && !before.status.captured) parts.push('leaves fighting alive');
    else if (hp) parts.push(hp > 0 ? `+${hp} HP` : `${-hp} HP damage`);
    if (mp && (next.id !== actor.id || mp > 0)) parts.push(`${mp > 0 ? '+' : ''}${mp} MP`);
    if (ward) parts.push(`${ward > 0 ? '+' : ''}${ward} ward`);
    for (const [key, label] of Object.entries(labels)) {
      if (key === 'captured') continue;
      if (next.status[key] && next.status[key] !== before.status[key]) parts.push(`${label}${typeof next.status[key] === 'number' ? ' ' + next.status[key] : ''}${next.status[key + 'Turns'] ? ' for ' + next.status[key + 'Turns'] + ' turns' : ''}`);
      else if (before.status[key] && !next.status[key]) parts.push(`${label} cleared`);
    }
    if (next.defending && !before.defending) parts.push('65% less incoming damage until next turn');
    if (parts.length) effects.push({ id: next.id, name: next.name, hp, mp, ward, text: parts.join(' · ') });
  }
  const notes = after.log.filter(line => /resists|reads .*:/.test(line));
  if (actionId.startsWith('spell_') && target && (target.resistances || []).includes(actionId.slice(6))) notes.push('Elemental resistance reduces this hit by 30%.');
  if (actionId.startsWith('tech_') && target) {
    const element = { winter_prison: 'ice', chain_lightning: 'lightning', judgment_vow: 'radiance' }[actionId.slice(5)];
    if (element && (target.resistances || []).includes(element)) notes.push('Elemental resistance reduces this hit by 30%.');
  }
  if (actionId === 'retreat') notes.push('Leave now without another enemy action or extra recovery days. No encounter reward.');
  const cost = action.cost || 'Free';
  const summary = [...effects.map(row => `${row.name}: ${row.text}.`), ...notes].join(' ') || 'No immediate health or ward change. ' + action.description;
  return { legal: true, reason: null, targetName: target?battleActorDisplayName(target,battle):null, cost, effects, summary };
}
