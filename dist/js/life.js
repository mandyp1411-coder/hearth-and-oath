import { adultChildLifeView } from './adult-child-view.js';
import { familyResidence, familyVisitReason, originFamilyMember } from './household-residence.js';
import { HOME_DEFINITIONS, householdHome, homePurchaseReason } from './home-ownership.js';
import { romanceReason } from './world-people-v31.js';
import { conditionConfidenceScene } from './story-presence-v26.js';
import { feedBlood,recordCurseExposure } from './curses.js';
import { generateCharacter } from './characters.js';
import { familyNameOf } from './names.js';
import { seededRoll, generatePersonName, isSettlement } from './world.js';
import { registerChild, recordPartnership } from './lineage.js';
import { professionAnnualWage, professionSkill, addCareerExperience } from './careers.js';
import { compatibilityView, compatibilityConversation, relationshipDepthReason, validateRelationshipDepth } from './family-depth.js';

import { personalReadiness } from './people-context.js';
export function lifeChoiceReason(s,eventId,id){
  if((eventId==='life_commitment'&&id==='pledge'||eventId==='life_courtship'&&id==='yes')&&s.socialLife){const p=s.life.people.find(p=>p.id===s.life?.pendingEvent?.personId);if(!p)return 'This person is no longer available.';return romanceReason(s,p);}
  if(eventId==='life_commitment'&&id==='pledge'||eventId==='life_courtship'&&id==='yes')return personalReadiness(s,s.life?.pendingEvent?.personId);
  return null;
}

export const YEAR_FOCI = [
  { id: 'livelihood', label: 'Build a livelihood', description: 'Steady work, guild experience, savings, and decisions about the people you serve.' },
  { id: 'education', label: 'Follow your curiosity', description: 'Part-time work funds lessons. Gain scholarship, path knowledge, and academic contacts.' },
  { id: 'relationships', label: 'Put people first', description: 'Work fewer shifts and make room for friendships, a household, and community obligations.' },
  { id: 'adventure', label: 'Train for the wider world', description: 'Earn from local assignments while practicing your combat path. Expeditions remain separate playable battles.' },
  { id: 'rest', label: 'Recover and find balance', description: 'A lighter work schedule restores health and peace of mind, with less income.' },
];
export const LIFESTYLES = [
  { id: 'frugal', label: 'A humble hearth', description: 'Simple food, shared lodgings, and public festivities. Base living cost: 120 gold per year.' },
  { id: 'comfortable', label: 'A comfortable life', description: 'Good meals, private space, and modest hospitality. Base living cost: 300 gold per year.' },
  { id: 'generous', label: 'An open and splendid house', description: 'Fine provisions and frequent hospitality. Base living cost: 600 gold per year; no inherited title is required.' },
];
const HOME_PRICES = { cottage: 120, townhouse: 340, estate: 900 };
const HOME_ORDER = ['lodgings', 'cottage', 'townhouse', 'estate'];
const GOALS = {
  settle: { label: 'A hearth of my own', target: 1 },
  mastery: { label: 'Gain full guild recognition', target: 3 },
  community: { label: 'Become a trusted neighbor', target: 50 },
  household: { label: 'Build a caring household', target: 1 },
};
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const option = (id, label, description) => ({ id, label, description });
const atSettlement = state => isSettlement(state.world, state.locationId);
const person = (s, id) => s.life.people.find(p => p.id === id && p.alive !== false);
const named = (s, id) => person(s, id)?.name || 'a neighbor';
const note = (s, ctx, title, text) => { s.notice = text; (ctx.journalLiteral||ctx.journal)(title, text, 'life'); };
const wellbeing = (s, happiness = 0, stress = 0, health = 0) => {
  s.life.happiness = clamp(s.life.happiness + happiness);
  s.life.stress = clamp(s.life.stress + stress);
  s.life.health = clamp(s.life.health + health);
};
const bond = (s, id, amount, memory) => {
  const p = person(s, id);
  if (!p) return;
  p.bond = clamp(p.bond + amount);
  if (memory && !p.memories.includes(memory)) p.memories.push(memory);
  p.memories = p.memories.slice(-30);
};
const know = (s, id, fact) => {
  const p = person(s, id);
  if (p && !p.knownFacts.includes(fact)) p.knownFacts.push(fact);
};
const gainSkill = (s, key, n = 1) => { s.hero.skills[key] += n; };
const earn = (s, n) => { s.hero.gold += n; if (s.life.plan) s.life.plan.income += n; };
const pay = (s, n) => {
  if (s.hero.gold < n) return false;
  s.hero.gold -= n;
  if (s.life.plan) s.life.plan.expenses += n;
  return true;
};
const setFlag = (s, key, value = true) => { s.flags[key] = value; };

export function initializeLife(state, { migration = false } = {}) {
  if (state.life) return;
  const first = ['Tamsin', 'Avel', 'Sera', 'Bram', 'Neris', 'Wren', 'Elowen', 'Corin'];
  const surname = ['Reed', 'Vale', 'Hearth', 'Brindle', 'Moss', 'Bell', 'Thorne', 'Ash'];
  const make = (id, role, baseAge, relation, disposition, initialBond) => ({
    id, name: migration ? `${first[seededRoll(state.seed, `life-${id}`, first.length)]} ${surname[seededRoll(state.seed, `family-${id}`, surname.length)]}` : generatePersonName(state.seed, `life-${id}`),
    role, baseAge, age: baseAge + Math.floor(state.day / 365), relation, disposition,
    bond: initialBond, memories: [], knownFacts: [],
  });
  state.life = {
    focus: 'livelihood', lifestyle: 'frugal', happiness: 60, stress: 20, health: 80,
    career: { rank: 0, experience: 0 }, home: { tier: 'lodgings' },
    people: [
      make('kin', 'relative', 43, 'family', 'kind', 55),
      make('fellow', 'friend', 19, 'friend', 'kind', 35),
      make('rival', 'rival', 21, 'rival', 'driven', 18),
      make('river', 'suitor', 22, 'acquaintance', 'reserved', 30),
    ],
    partnerId: null, courtshipId: null, children: [], goals: [], achievements: [],
    yearHistory: [], eventHistory: [], yearlyDecisions: [], pendingEvent: null,
    householdSupport: false, plan: null,
  };
}

function rates(state, config = {}) {
  const focus = YEAR_FOCI.some(f => f.id === config.focus) ? config.focus : state.life.focus;
  const lifestyle = LIFESTYLES.some(l => l.id === config.lifestyle) ? config.lifestyle : state.life.lifestyle;
  const wages = { Unemployed: 480, Healer: 640, Merchant: 760, Scholar: 620, Herbalist: 600, Soldier: 700 };
  const ratio = { livelihood: 1, education: .45, relationships: .6, adventure: .5, rest: .35 }[focus];
  const homeCost = { lodgings: 0, cottage: 30, townhouse: 90, estate: 240 }[state.life.home.tier];
  const income = (state.careers ? professionAnnualWage(state) : (wages[state.hero.profession] || 480) + state.life.career.rank * 120 + (state.flags.certified ? 50 : 0)) * ratio;
  const dependents = state.lineage ? state.life.children.filter(c => c.alive !== false && c.age < 18).length : state.life.children.length;
  const expenses = ({ frugal: 120, comfortable: 300, generous: 600 })[lifestyle] + homeCost + dependents * 45 + (focus === 'education' ? 60 : 0);
  return { focus, lifestyle, income, expenses };
}

export function yearPreview(state, config = {}) {
  const days = (Math.floor(state.day / 365) + 1) * 365 - state.day;
  const r = rates(state, config);
  const income = Math.floor(r.income * days / 365);
  const expenses = Math.floor(r.expenses * days / 365);
  const warnings = [];
  if (state.hero.gold + income < expenses) warnings.push('Savings and expected earnings do not cover this plan. You can change your living standard or take extra work when the household budget interrupts you.');
  for (const o of state.obligations.filter(o => !o.resolved && o.dueDay <= state.day + days)) warnings.push(`“${o.title}” is due in ${Math.max(0, o.dueDay - state.day)} days; the plan pauses before its deadline.`);
  if (state.hero.condition?.type === 'vampire') warnings.push('Blood hunger pauses the plan at 75. Animal feeding is free; willing donors cost 8 gold. These pauses and choices change the forecast.');
  if (state.hero.condition?.type === 'lycanthrope') warnings.push('The plan stops for known full moons. Prepare your refuge or resolve the transformation before continuing.');
  if (!atSettlement(state)) warnings.push('Local assignments and camp life are represented here. Return to a settlement for purchases, school enrollments, and household actions.');
  return { days, income, expenses, description: `${days} days until age ${18 + Math.floor((state.day + days) / 365)}. Forecast includes ${state.life.children.length ? 'children’s support, ' : ''}housing upkeep and ${r.focus === 'education' ? 'lessons. ' : 'provisions. '}Optional purchases, event choices, and time spent on other activities change the outcome.`, warnings };
}

function action(s, id, label, description, days = 0, cost = 0, group = 'Life & livelihood', reason) {
  return { id, label, description, days, cost, group, ...(reason || s.hero.gold < cost ? { disabledReason: reason || `Requires ${cost} gold; you have ${s.hero.gold}.` } : {}) };
}

export function lifeActions(s) {
  if (!s.life || s.phase !== 'adult' || s.event || s.battle) return [];
  const actions = [];
  if (atSettlement(s)) {
    actions.push(action(s, 'life_career_train', 'Practice your civilian craft', 'Gain 8 career experience, one professional skill, and a little confidence. Promotion requires proven work, not your combat level.', 4, 10, 'Career', s.hero.profession === 'Unemployed' ? 'Choose an apprenticeship first.' : undefined));
    actions.push(action(s, 'life_promotion', 'Ask your guild to recognize your work', `Guild recognition ${s.life.career.rank + 1} adds 120 gold to a full working-year forecast, before household priorities and living costs, and 4 gold to a three-day shift. Requires ${(s.life.career.rank + 1) * 20} guild experience. Technical mastery develops separately through your recorded professional work.`, 2, 0, 'Career', s.hero.profession === 'Unemployed' ? 'Choose a profession first.' : s.life.career.rank >= 3 ? 'You have full recognition from the guild. Technical mastery can still develop through professional work.' : s.life.career.experience < (s.life.career.rank + 1) * 20 ? 'Keep practicing your profession or devote a year to work.' : undefined));
    for (const [tier,home] of Object.entries(HOME_DEFINITIONS)) {
      if(homePurchaseReason(s,tier))continue;
      actions.push(action(s, `life_home_${tier}`, `${householdHome(s).owned?'Upgrade to':'Buy'} ${tier==='estate'?'an':'a'} ${tier}`, `Your one household home becomes a ${tier} in this settlement. Annual upkeep: ${home.upkeep} gold. The full ${home.price}-gold price applies; no refund or trade-in credit. Family, belongings and earlier building records stay intact.`, home.days, home.price, 'Home'));
    }
    actions.push(action(s, 'life_counsel', 'Talk with a trusted hearth-keeper', 'Spend time with a discreet listener. Reduce stress by 22 and restore 10 happiness; no hidden condition is disclosed.', 3, 6, 'Wellbeing'));
    actions.push(action(s, 'life_family', 'Discuss welcoming a child', 'Meet a local guardian about adoption, or discuss a new child with a willing partner. A cottage or larger, 40 health, and 30 gold provide a safe start; each child adds 45 gold in yearly support.', 7, 30, 'Family', s.life.children.length >= 3 ? 'This household is caring for three children already.' : s.life.home.tier === 'lodgings' ? 'Establish a cottage or larger first.' : s.life.health < 40 ? 'Recover to 40 health before expanding your household.' : undefined));
  }
  actions.push(action(s, 'life_rest', 'Keep a quiet week for yourself', 'Free recovery: restore 12 health, 10 happiness, 18 bodily health, and reduce stress by 16. A shorter paid recovery remains available at a hearth.', 7, 0, 'Wellbeing'));
  if (atSettlement(s)) for (const p of s.life.people.filter(p => p.alive !== false)) {
    if (p.compatibility) actions.push(action(s, `life_values_${p.id}`, `Ask ${p.name} about values and everyday wishes`, 'Spend two real days listening to one wish they choose to share. Later discussions can reveal more. Known similarities and differences become visible; neither is a score deciding whether a life together is worthwhile.', 2, 0, 'Relationships', (originFamilyMember(s,p)&&familyVisitReason(s,p))||relationshipDepthReason(s, originFamilyMember(s,p)||p.id===s.life.partnerId?{...p,locationId:familyResidence(s,p)}:p)));
    actions.push(action(s, `life_visit_${p.id}`, `Spend time with ${p.name}`, `Listen to this ${p.role}'s life. Gain 10 bond, restore 3 happiness, and make a shared memory.`, 2, 0, 'Relationships', originFamilyMember(s,p)?familyVisitReason(s,p):undefined));
    actions.push(action(s, `life_gift_${p.id}`, `Choose a thoughtful gift for ${p.name}`, 'A useful gift or shared meal earns 14 bond. It does not purchase love or agreement.', 1, 8, 'Relationships', originFamilyMember(s,p)?familyVisitReason(s,p):undefined));
    if (p.role !== 'relative' && !p.familyRole) {
      actions.push(action(s, `life_court_${p.id}`, `Ask ${p.name} about courtship`, 'Speak openly about your intentions. A close adult friendship can become a consensual courtship; you can also keep the friendship.', 2, 0, 'Courtship', s.life.partnerId ? 'You have a committed partner; tend that relationship.' : s.life.courtshipId === p.id ? 'You are already courting.' : p.bond < 55 ? 'Build a friendship of at least 55 bond first.' : personalReadiness(s,p.id)));
      actions.push(action(s, `life_commit_${p.id}`, `Discuss a shared life with ${p.name}`, 'A willing partner with 70 bond can pledge a shared household. Marriage is a choice, and a partner keeps their own values.', 2, 0, 'Courtship', s.life.partnerId ? 'You have already made a household pledge.' : s.life.courtshipId !== p.id ? 'Begin a mutually agreed courtship first.' : p.bond < 70 ? 'Deepen your courtship to 70 bond first.' : personalReadiness(s,p.id)));
      if (s.life.partnerId === p.id) actions.push(action(s, `life_separate_${p.id}`, `Discuss ending the partnership with ${p.name}`, 'Speak about a separation or choose to stay. Ending the relationship keeps real co-parent links, children, family property and earlier memories; it creates no crime or bereavement.', 2, 0, 'Relationships'));
      if (s.life.courtshipId === p.id) actions.push(action(s, `life_endcourt_${p.id}`, `Discuss ending courtship with ${p.name}`, 'Close a courtship honestly or leave the question open. Neither affection nor a gift makes a continuing relationship compulsory.', 1, 0, 'Relationships'));
    }
  }
  for (const [id, goal] of Object.entries(GOALS)) if (!s.life.goals.some(g => g.id === id)) actions.push(action(s, `life_goal_${id}`, `Set an ambition: ${goal.label.toLowerCase()}`, 'Choose a personal goal. Progress follows real purchases, work, trust, and relationships; completion leaves an achievement in your life story.', 0, 0, 'Ambitions'));
  return actions;
}

function updateGoals(s, ctx) {
  const progress = { settle: s.life.home.tier !== 'lodgings' ? 1 : 0, mastery: s.life.career.rank, community: Math.max(0, s.factions.villagers), household: s.life.partnerId || s.life.children.length ? 1 : 0 };
  for (const goal of s.life.goals) {
    goal.progress = Math.min(goal.target, progress[goal.id] || 0);
    if (!goal.completed && goal.progress >= goal.target) {
      goal.completed = true;
      s.life.achievements.push({ id: `goal-${goal.id}`, label: goal.label, day: s.day });
      wellbeing(s, 12, -8);
      ctx.journal('An ambition fulfilled', goal.label + '. The years of choices behind it belong to your chronicle.', 'achievement');
    }
  }
}

export function applyLifeAction(s, id, ctx) {
  if (!id.startsWith('life_')) return false;
  initializeLife(s);
  if (id === 'life_career_train') {
    s.life.career.experience += 8;
    if (s.careers) addCareerExperience(s, 8);
    const key = professionSkill(s.hero.profession) || { Healer: 'devotion', Scholar: 'scholarship', Merchant: 'persuasion', Herbalist: 'survival', Soldier: 'weapons' }[s.hero.profession];
    if (key) gainSkill(s, key);
    wellbeing(s, 2, 3);
    note(s, ctx, 'Hands learning their calling', `Focused ${s.hero.profession.toLowerCase()} practice added eight career experience.`);
  } else if (id === 'life_promotion') {
    if (s.life.career.rank < 3 && s.life.career.experience >= (s.life.career.rank + 1) * 20 && s.hero.profession !== 'Unemployed') {
      s.life.career.rank++;
      wellbeing(s, 10, -4);
      note(s, ctx, 'Recognition earned', `The guild recognizes you as a ${['beginning member', 'recognized practitioner', 'recognized journeyworker', 'senior guild member'][s.life.career.rank]} in ${s.hero.profession.toLowerCase()} work. Your labor now commands better wages. This standing is distinct from the technical mastery earned through recorded professional practice.`);
    }
  } else if (id.startsWith('life_home_')) {
    const tier = id.slice(10);
    if (homePurchaseReason(s,tier)) return false;
    const prior=householdHome(s);
    s.life.home.tier = tier;
    if (s.revision >= 4) { s.life.home.source = 'purchase'; s.life.home.locationId = s.locationId; }
    if(s.family)s.family.housing='secure';
    wellbeing(s, 12, -8);
    note(s, ctx, prior.owned?'A larger hearth':'A key of your own', `${prior.owned?'You upgraded from a '+prior.tier+' to':'You bought'} ${tier==='estate'?'an':'a'} ${tier}. This is your one household home. Your family and belongings remain; upkeep is visible in each annual forecast.`);
  } else if (id === 'life_rest') {
    wellbeing(s, 10, -16, 18);
    s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + 12);
    note(s, ctx, 'A quieter week', 'You slept, mended what you could, and made room to breathe. Recovery restored health and eased stress.');
  } else if (id === 'life_counsel') {
    wellbeing(s, 10, -22, 5);
    note(s, ctx, 'Someone to listen', 'A hearth-keeper listened without demanding a confession. You found a clearer way to carry your worries.');
  } else if (id.startsWith('life_separate_') || id.startsWith('life_endcourt_')) {
    const separation = id.startsWith('life_separate_'), target = id.slice(separation ? 'life_separate_'.length : 'life_endcourt_'.length);
    const p = person(s, target);
    if (!p || s.age < 18 || (separation ? s.life.partnerId : s.life.courtshipId) !== target) return false;
    s.life.pendingEvent = { personId: target };
    ctx.setEvent(separation ? 'life_separation' : 'life_courtship_end', separation ? 'A promise that may need another shape' : 'An honest ending to courtship', 'Relationships & boundaries', `${p.name} listens as you talk about ${separation ? 'the life you have pledged to share' : 'your courtship'}. Continuing affection is a choice, and either person can set a boundary. ${separation ? 'Your real children and their recorded parents remain part of the family; separation does not erase them or silently divide the recorded estate.' : 'A friendship can remain in the record without promising another romance.'}`, [option('end', separation ? 'End my partnership and keep family responsibilities clear' : 'End this courtship honestly', separation ? 'Close the active household pledge or marriage. Keep co-parent links and earlier memories; lose 10 bond, add 8 stress and lose 5 happiness.' : 'End courtship, retain remembered friendship and lose 5 bond. Future relationships remain possible.'), option('stay', separation ? 'Keep the partnership and discuss one practical change' : 'Keep courting while discussing our boundaries', 'Make a specific conversation memory and gain 3 bond. No new pledge or marriage is made.')]);
  } else if (id.startsWith('life_values_')) {
    const target = id.slice('life_values_'.length), p = person(s, target);
    if (!p?.compatibility || originFamilyMember(s,p)&&familyVisitReason(s,p) || relationshipDepthReason(s, originFamilyMember(s,p)||p.id===s.life.partnerId?{...p,locationId:familyResidence(s,p)}:p)) return false;
    s.life.pendingEvent = { personId: target, compatibilityVersion: s.narrativeEdition===30?2:1 };
    const view = compatibilityView(s, p);
    ctx.setEvent('life_values', `The life ${p.name} wants to keep`, 'Values and everyday wishes', `${p.name} talks about the things that make a day worthwhile and the promises they want others to understand. ${view.known.length ? view.differences.length ? `You already know some differences: ${view.differences.join('; ')}.` : 'Some of your tastes are already shared.' : 'Their tastes have not yet been recorded; asking is the start of a conversation.'} ${p.memories.length ? `An earlier memory still matters: ${p.memories.at(-1)}` : 'Neither gifts nor affection require them to share your beliefs.'}`, [option('listen', 'Listen without requiring an agreement', 'Learn one new preference and remember a respectful conversation. Gain 2 bond; differences remain open for future discussion.'), option('share', `Explain your own ${s.hero.preferences?.value || 'duty'} while asking about theirs`, 'Learn one new preference. A shared value gives 4 bond; a respectful difference gives 2. The response is explained, without a hidden compatibility score.'), option('dismiss', 'Say your plans should decide for both of you', 'Hear one stated wish, but lose 7 bond for dismissing them. Their boundary is remembered.')]);
  } else if (id.startsWith('life_visit_') || id.startsWith('life_gift_')) {
    const gift = id.startsWith('life_gift_');
    const target = id.slice(gift ? 10 : 11);
    if (!person(s, target) || person(s, target).alive === false || originFamilyMember(s,person(s,target))&&familyVisitReason(s,person(s,target))) return false;
    bond(s, target, gift ? 14 : 10, gift ? 'You chose something useful for me, without asking for anything in return.' : `At age ${s.age}, you made time to listen to my own worries and hopes.`);
    wellbeing(s, 3, -4);
    note(s, ctx, 'A person, not a role', `${named(s, target)} remembers ${gift ? 'your thoughtful gift' : 'an unhurried conversation'}. Their bond with you is now ${person(s, target).bond}.`);
  } else if (id.startsWith('life_court_') || id.startsWith('life_commit_')) {
    const commit = id.startsWith('life_commit_');
    const target = id.slice(commit ? 12 : 11);
    if (!person(s, target) || person(s, target).role === 'relative' || person(s, target).familyRole || person(s, target).alive === false || person(s, target).age < 18 || s.age < 18) return false;
    if(personalReadiness(s,target))return false;
    s.life.pendingEvent = { personId: target, ...(person(s,target).compatibility ? { compatibilityVersion: 1 } : {}) };
    if (commit) ctx.setEvent('life_commitment', 'Two lives, one hearth', 'Courtship', `${named(s, target)} wants a shared life, while keeping their work and convictions. They ask whether your promise leaves room for both of you.`, [option('pledge', 'Make a mutual household pledge', 'Become committed partners. A pledge grants no ownership over someone else’s choices.'), option('wait', 'Keep courting while you find your footing', 'Preserve the relationship and leave commitment for another time.')]);
    else {
      const view = compatibilityView(s, person(s,target));
      ctx.setEvent('life_courtship', 'An honest invitation', 'Courtship', `${named(s, target)} has come to trust your company. When you ask about courtship, they say they would welcome it if you want the same.${view.enabled ? view.known.length ? ` Known differences remain things to discuss: ${view.differences.join('; ') || 'you share the preferences you have discussed'}.` : ' Their individual values are still unknown to you; you can ask before promising romance.' : ''}`, [option('yes', 'Begin a mutually agreed courtship', 'Let this adult friendship grow into romance.'), ...(view.enabled ? [option('discuss', 'Discuss our values before deciding about romance', 'Learn actual preferences and keep this a friendship for now. A respectful conversation grants 2 bond; no courtship is assumed.')] : []), option('friends', 'Say you treasure the friendship', 'Keep a valued friend without turning affection into an obligation.')]);
    }
  } else if (id === 'life_family') {
    const partner = person(s, s.life.partnerId);
    ctx.setEvent('life_family_start', 'Room beside the hearth', 'Family', `The guardian explains that a child needs time, steady support, and a person who will stay. ${partner ? `${partner.name} is ${partner.bond >= 65 ? 'willing to welcome a child together' : 'asking to rebuild your bond before expanding the household'}.` : 'You may adopt as a single parent; a marriage is not required.'} You have spent thirty gold preparing the home and consulting the guardian.`, [option('adopt', 'Offer a child a permanent home', 'Adopt a child through the village guardian. Support costs 45 gold per year.'), ...(partner?.bond >= 65 ? [option('welcome', 'Welcome a child together', 'Welcome a child into a shared household with your partner’s freely given agreement. Support costs 45 gold per year.')] : []), option('wait', 'Keep the preparations and wait', 'Add no child yet. The consultation and home supplies have already been paid for.')]);
  } else if (id.startsWith('life_goal_')) {
    const target = id.slice(10);
    if (!GOALS[target]) return false;
    if (!s.life.goals.some(g => g.id === target)) s.life.goals.push({ id: target, ...GOALS[target], progress: 0, completed: false });
    note(s, ctx, 'A direction of your own', `You set your sights on “${GOALS[target].label}.”`);
  } else return false;
  updateGoals(s, ctx);
  return true;
}

const childLearning = (s, id) => s.lineage?.people.find(p => p.source === 'child' && p.localId === id && p.alive)?.development;
const childIdentity = (s, id) => s.lineage?.people.find(p => p.source === 'child' && p.localId === id && p.alive);
const pursuitSkill = pursuit => ({ knowledge: 'scholarship', craft: 'survival', nature: 'survival', combat: 'defense', community: 'persuasion', trade: 'persuasion' })[pursuit] || 'scholarship';
const familyChoice = (id, label, description, kind, personId, memory) => ({ id, label, description, effect: { familyRoleplay: { kind, personId, choiceId: id } }, memory });

// Birth-mode years use these scenes directly. A child learns their own skills;
// annual family care neither supplies six school sessions nor trains a parent.
export function familyAnnualScene(s) {
  if (s.revision < 5 || s.age < 19 || !s.lineage || s.phase === 'retired') return null;
  const candidates = [];
  for (const child of s.life.children.filter(c => c.alive !== false && childLearning(s, c.id))) {
    const record = childIdentity(s, child.id), pursuit = record.preferences?.pursuit || 'knowledge';
    const kind = child.age < 6 ? 'small_child' : child.age < 12 ? 'school_child' : child.age < 18 ? 'teen_child' : 'adult_child';
    const title = kind === 'small_child' ? `${child.name} needs a familiar voice` : kind === 'school_child' ? `${child.name}'s question beyond the school gate` : kind === 'teen_child' ? `${child.name} asks for a future of their own` : `${child.name}'s life beside your own`;
    let body = kind === 'small_child' ? `${child.name}, age ${child.age}, is beginning to explore. Your ${s.hero.profession === 'Unemployed' ? 'ordinary work' : s.hero.profession.toLowerCase() + ' work'} still needs time, but this child needs someone who notices their own questions.` : kind === 'school_child' ? `${child.name}, age ${child.age}, brings a question their lessons have not settled. ${record.development.education.route ? `Their ${record.development.education.route} sessions are recorded; one shared evening does not replace that education.` : 'A public school remains available; this conversation cannot substitute for actual attendance.'}` : kind === 'teen_child' ? `${child.name}, age ${child.age}, is drawn to ${pursuit}. They ask whether your household will welcome a future different from your ${s.hero.profession === 'Unemployed' ? 'own path' : s.hero.profession.toLowerCase() + ' calling'}. Support can help them practice without assigning a combat class or a lifelong occupation.` : `${child.name}, age ${child.age}, has their own interests in ${pursuit}. They offer news of a project and ask for company, a useful conversation, or space. An adult child's life is not a spare version of your own.`;
    if(record.adoptionBackground)body+=` Their earlier life with ${record.adoptionBackground.guardianName} remains in the family record. ${s.day-record.adoptionBackground.arrivalDay<365?'They are still settling into this home; keeping familiar friendships matters alongside your new routines.':'Joining your household did not erase their earlier name, learning, or chosen interests.'}`;
    const adult=child.age>=18&&adultChildLifeView(s,record);if(adult)body+=` ${adult.summary} ${adult.progress} ${adult.residence} ${adult.support}`;
    const project=record.development.history.filter(h=>h.title==='A supervised project, personally chosen').at(-1);
    if(project)body+=` They remember the project you heard: ${project.text}`;
    candidates.push({ kind, personId: child.id, title, body, choices: [
      familyChoice('care', 'Listen and support the interest they bring', `${child.age < 3 ? 'Their care grows through familiar comfort' : `Their care and ${pursuitSkill(pursuit)} practice grow`}; restore 4 family happiness. Their preference remains their own.`, kind, child.id, `support ${child.name}'s own interests`),
      familyChoice('curiosity', 'Investigate their question together', `${child.age < 3 ? 'Develop curiosity through gentle exploration. Practiced skills begin from age three' : 'Develop this child’s curiosity and scholarship'}. From age six, also practice arcana. No school certificate is awarded for a conversation.`, kind, child.id, `make room for ${child.name}'s questions`),
      familyChoice('courage', kind === 'adult_child' ? 'Help with a task they chose, then leave them room' : 'Try a safe practical task without choosing their future', `${child.age < 3 ? 'Develop courage through supported exploration. Practiced skills begin from age three' : 'Develop this child’s courage and survival'}. From age ten, practice defense. Your profession and their eventual class remain open.`, kind, child.id, `practice a safe task with ${child.name}`),
    ] });
  }
  const partner = person(s, s.life.partnerId);
  if (partner) candidates.push({ kind: 'partner_time', personId: partner.id, title: 'The evenings your household keeps losing', body: `${partner.name} asks how your ${s.hero.profession === 'Unemployed' ? 'work' : s.hero.profession.toLowerCase() + ' work'} and your shared life can fit together. Your current bond is ${partner.bond}; promises require room in an actual calendar. They ask for an agreement, not possession of your time or convictions.`, choices: [
    familyChoice('care', 'Protect a regular evening together', 'Gain 8 partner bond and 5 happiness; reduce stress by 6. Make a specific shared memory.', 'partner_time', partner.id, `protect a regular evening with ${partner.name}`),
    familyChoice('curiosity', 'Share the ledger and ask what each person needs', 'Gain 5 partner bond and persuasion. Agree on practical limits without disclosing a private supernatural condition.', 'partner_time', partner.id, `hear ${partner.name}'s needs beside your own`),
    familyChoice('courage', 'Explain one busy season and promise no false certainty', 'Gain 6 professional experience; lose 3 partner bond and add 4 stress. Your partner remembers the cost of the work you chose.', 'partner_time', partner.id, `name a busy season honestly to ${partner.name}`),
  ] });
  const elder = s.life.people.find(p => p.alive !== false && ['parent', 'guardian'].includes(p.familyRole) && p.age >= 70);
  if (elder) candidates.push({ kind: 'elder_care', personId: elder.id, title: `${elder.name}'s place at the table`, body: `${elder.name}, age ${elder.age}, asks for help with an ordinary errand. They remember your upbringing, but have wishes beyond being useful to the household. Their remaining years are not a resource to spend.`, choices: [
    familyChoice('care', 'Ask what help they want and make time for it', 'Gain 8 bond and devotion. Restore 4 happiness without deciding their wishes for them.', 'elder_care', elder.id, `offer the help ${elder.name} asked for`),
    familyChoice('curiosity', 'Keep an account of the stories they choose to share', 'Gain scholarship and 6 bond. Their specific memory becomes part of the family, while private knowledge stays private.', 'elder_care', elder.id, `preserve the stories ${elder.name} chose to share`),
    familyChoice('courage', 'Arrange a small practical task together', 'Gain survival and 5 bond. Keep their independence and your own limits visible.', 'elder_care', elder.id, `share a practical errand with ${elder.name}`),
  ] });
  const widowed = [...s.lineage.unions].reverse().find(u => u.endReason === 'widowed');
  const lost = widowed && s.lineage.people.find(p => p.id === widowed.partnerId);
  if (!partner && lost) candidates.push({ kind: 'widow_memory', personId: lost.id, title: `A remembered season with ${lost.name}`, body: `${lost.name}'s death remains in your family record. A familiar season brings back something you shared. Continuing a life, or choosing a new relationship, need not erase a named person.`, choices: [
    familyChoice('care', 'Share a particular memory with willing company', 'Restore 5 happiness and reduce stress by 6; keep a named account of your shared life.', 'widow_memory', lost.id, `share a particular memory of ${lost.name}`),
    familyChoice('curiosity', 'Copy a story they wanted the household to keep', 'Gain scholarship and restore 3 happiness. Their memory becomes an actual recorded family account.', 'widow_memory', lost.id, `preserve a story from ${lost.name}'s life`),
    familyChoice('courage', 'Keep a private remembrance and return to chosen work', 'Reduce stress by 5 and gain 4 career experience. Grief does not force retirement or another relationship.', 'widow_memory', lost.id, `remember ${lost.name} within your own boundaries`),
  ] });
  if (!candidates.length) return null;
  const recent = s.life.yearlyDecisions.slice(-4).map(d => d.event);
  const unused = candidates.filter(c => !recent.includes(`family_${c.kind}_${c.personId}`));
  const pool = unused.length ? unused : candidates;
  return pool[seededRoll(s.seed, `family-roleplay-g${s.dynasty.generation}-birth${s.timeline.birthDay || 0}-age${s.age}`, pool.length)];
}

export function applyFamilyAnnualChoice(s, payload, ctx) {
  if (!payload || !['care', 'curiosity', 'courage'].includes(payload.choiceId) || s.revision < 5 || s.age < 19 || s.phase === 'retired') return false;
  const { kind, personId, choiceId } = payload;
  const eventId = `family_${kind}_${personId}`;
  if (s.life.yearlyDecisions.some(d => d.event === eventId && d.day === s.day)) return false;
  let text;
  if (['small_child', 'school_child', 'teen_child', 'adult_child'].includes(kind)) {
    const child = s.life.children.find(c => c.id === personId && c.alive !== false), record = child && childIdentity(s, child.id);
    const actualKind = child && (child.age < 6 ? 'small_child' : child.age < 12 ? 'school_child' : child.age < 18 ? 'teen_child' : 'adult_child');
    if (!record?.development || kind !== actualKind) return false;
    const d = record.development;
    d.traits[choiceId]++;
    if (child.age >= 3) d.skills[choiceId === 'care' ? pursuitSkill(record.preferences?.pursuit) : choiceId === 'curiosity' ? 'scholarship' : 'survival']++;
    if (choiceId === 'curiosity' && child.age >= 6) d.skills.arcana++;
    if (choiceId === 'courage' && child.age >= 10) d.skills.defense++;
    wellbeing(s, 4, -3);
    text = `${child.name}'s own ${choiceId} and practiced skills grew through a remembered ${child.age >= 18 ? 'adult family conversation' : 'day together'}. Their interests remain their own; no class or school certificate was assigned.`;
    d.history.push({ day: s.day, title: 'A family year that belongs to this child', text, choice: choiceId }); d.history = d.history.slice(-60);
  } else if (kind === 'partner_time') {
    const p = person(s, personId); if (!p || s.life.partnerId !== personId) return false;
    if (choiceId === 'care') { bond(s, personId, 8, `At your age ${s.age}, we protected a regular evening for our own shared life.`); wellbeing(s, 5, -6); }
    if (choiceId === 'curiosity') { bond(s, personId, 5, `At your age ${s.age}, we compared our needs and agreed on practical household limits.`); gainSkill(s, 'persuasion'); }
    if (choiceId === 'courage') { bond(s, personId, -3, `At your age ${s.age}, you named a busy work season honestly. It still cost us shared time.`); s.life.career.experience += 6; addCareerExperience(s, 6); wellbeing(s, 0, 4); }
    text = `${p.name} remembers the household agreement you chose. The relationship and your professional work carry its actual effects.`;
  } else if (kind === 'elder_care') {
    const p = person(s, personId); if (!p || !['parent', 'guardian'].includes(p.familyRole) || p.age < 70) return false;
    bond(s, personId, choiceId === 'care' ? 8 : choiceId === 'curiosity' ? 6 : 5, `At your age ${s.age}, we made room for my own wishes and shared an ordinary errand or story.`);
    gainSkill(s, choiceId === 'care' ? 'devotion' : choiceId === 'curiosity' ? 'scholarship' : 'survival'); wellbeing(s, choiceId === 'care' ? 4 : 2, -3);
    text = `${p.name}'s own wishes and a named shared memory remain in the family record.`;
  } else if (kind === 'widow_memory') {
    const p = s.lineage.people.find(p => p.id === personId && !p.alive);
    if (!p || s.life.partnerId || !s.lineage.unions.some(u => u.partnerId === personId && u.endReason === 'widowed')) return false;
    wellbeing(s, choiceId === 'care' ? 5 : choiceId === 'curiosity' ? 3 : 0, choiceId === 'care' ? -6 : -5);
    if (choiceId === 'curiosity') gainSkill(s, 'scholarship');
    if (choiceId === 'courage') { s.life.career.experience += 4; addCareerExperience(s, 4); }
    text = `You kept a ${choiceId === 'care' ? 'shared memory' : choiceId === 'curiosity' ? 'written family account' : 'private remembrance'} of ${p.name}. Their death remains recorded; a future life can include this memory.`;
  } else return false;
  s.life.yearlyDecisions.push({ day: s.day, event: eventId, choice: choiceId }); s.life.yearlyDecisions = s.life.yearlyDecisions.slice(-120);
  note(s, ctx, 'A family year, with actual consequences', text);
  updateGoals(s, ctx);
  return true;
}

// Authored situations ask about an actual profession, household, belief, or remembered choice.
// Eligibility controls relevance; independent seeded rolls select among unused situations.
const EVENTS = [
  { id: 'life_trade_shortage', title: 'The price of an empty granary', test: s => s.hero.profession === 'Merchant', body: s => `A grain caravan reaches ${s.world.locations.find(p => p.id === s.locationId)?.name}. Hungry households need it, but merchants could charge more while the roads are troubled. Your guild asks which customers you will serve.`, choices: [option('fair', 'Sell at an ordinary margin', 'Earn 12 gold, gain village trust, and avoid exploiting scarcity.'), option('profit', 'Accept the wealthy buyers’ higher offer', 'Earn 45 gold. Villagers resent being left at the back of the queue.'), option('reserve', 'Keep grain for households you know', 'Earn 5 gold; strengthen family ties and make a provision pact.')], apply(s, id, c) { if (id === 'fair') { earn(s, 12); c.standing('villagers', 7); } if (id === 'profit') { earn(s, 45); c.standing('villagers', -6); wellbeing(s, 3, 5); } if (id === 'reserve') { earn(s, 5); bond(s, 'kin', 8, 'You kept grain for our household during the shortage.'); setFlag(s, 'lifeProvisionPact'); } } },
  { id: 'life_healer_consent', title: 'A remedy with a voice', test: s => s.hero.profession === 'Healer' || s.hero.specialization === 'necromancer', body: () => 'A dying patient asks you to hear their ancestor’s advice. Their sibling fears any rite involving the dead. Neither person’s wishes can be reduced to a law or a spellbook.', choices: [option('consent', 'Explain the rite and seek informed consent', 'Gain devotion and clinic trust. The patient and sibling know what you discussed.'), option('living', 'Seek a living specialist instead', 'Gain scholarship and modest academy standing.'), option('private', 'Decline the rite and remain at their bedside', 'Protect a boundary while offering care; reduce stress and gain village trust.')], apply(s, id, c) { if (id === 'consent') { gainSkill(s, 'devotion'); c.standing('villagers', 5); setFlag(s, 'lifeConsentClinic'); } if (id === 'living') { gainSkill(s, 'scholarship'); c.standing('academy', 4); } if (id === 'private') { wellbeing(s, 4, -5); c.standing('villagers', 3); } } },
  { id: 'life_scholar_citation', title: 'A name in the margin', test: s => s.hero.profession === 'Scholar' || s.life.focus === 'education', body: s => `${named(s, 'rival')} finds that an academy patron intends to publish your joint notes under their own name. Your rival asks whether you will challenge someone whose favor might advance your career.`, choices: [option('challenge', 'Ask for both researchers to be credited', 'Gain scholarship, earn your rival’s trust, and establish a research partnership.'), option('bargain', 'Trade silence for a paid teaching position', 'Earn 30 gold and 6 career experience; damage the rival’s trust.'), option('publish', 'Share the notes at the public reading room', 'Gain village standing and your rival’s friendship; forego the patron’s payment.')], apply(s, id, c) { if (id === 'challenge') { gainSkill(s, 'scholarship'); bond(s, 'rival', 12, 'You stood up for both our names on the research.'); setFlag(s, 'lifeResearchPartners'); } if (id === 'bargain') { earn(s, 30); s.life.career.experience += 6; bond(s, 'rival', -12, 'You took the patron’s favor while my work went uncredited.'); } if (id === 'publish') { c.standing('villagers', 6); bond(s, 'rival', 8, 'You made our research freely available.'); } } },
  { id: 'life_soldier_orders', title: 'The bridge checkpoint', test: s => s.hero.profession === 'Soldier' || s.hero.specialization === 'paladin', body: () => 'Your captain asks for a bridge toll from refugees who have little left. The posted rule is real; so is the family shivering before your lantern. You can challenge the order without pretending the captain never gave it.', choices: [option('appeal', 'Appeal for a documented exemption', 'Gain persuasion and order standing. Help the family through lawful advocacy.'), option('waive', 'Waive the toll and give your name', 'Gain village trust and lose order favor. Mercy is visible, not a secret act.'), option('enforce', 'Enforce the toll without taking extra payment', 'Earn 18 gold in wages and order standing; neighbors remember the hardship.')], apply(s, id, c) { if (id === 'appeal') { gainSkill(s, 'persuasion'); c.standing('order', 4); } if (id === 'waive') { c.standing('villagers', 8); c.standing('order', -4); setFlag(s, 'lifeBridgeMercy'); } if (id === 'enforce') { earn(s, 18); c.standing('order', 3); c.standing('villagers', -4); } } },
  { id: 'life_herbalist_grove', title: 'The last moonroot patch', test: s => (s.hero.profession === 'Herbalist' || s.hero.belief === 'wilds') && !s.flags.lifeGroveTended && !s.flags.lifeGroveShared && !s.flags.lifeGroveStripped, body: () => 'You find a grove of medicinal moonroot, with enough mature plants for this season’s remedies. Taking the young roots would bring a quick profit but leave the grove bare next spring.', choices: [option('tend', 'Harvest lightly and plant the seed pods', 'Gain one herb, survival, and a tended grove for future seasons.'), option('harvest', 'Gather the whole patch', 'Gain three herbs and 15 gold. The grove cannot provide a later harvest.'), option('teach', 'Show the grove to the village gardeners', 'Gain village trust and scholarship; the grove becomes a shared resource.')], apply(s, id, c) { if (id === 'tend') { s.flags.herbs = (s.flags.herbs || 0) + 1; gainSkill(s, 'survival'); setFlag(s, 'lifeGroveTended'); } if (id === 'harvest') { s.flags.herbs = (s.flags.herbs || 0) + 3; earn(s, 15); setFlag(s, 'lifeGroveStripped'); } if (id === 'teach') { c.standing('villagers', 6); gainSkill(s, 'scholarship'); setFlag(s, 'lifeGroveShared'); } } },
  { id: 'life_grove_return', title: 'What returned in spring', test: s => !s.flags.lifeGroveStripped && (s.flags.lifeGroveTended || s.flags.lifeGroveShared), body: () => 'The grove you protected has flowered again. An apprentice asks to learn from the decisions that kept it alive. A remembered act has become an opportunity.', choices: [option('mentor', 'Teach the apprentice to care for it', 'Gain 6 career experience and village trust.'), option('gather', 'Gather the mature roots for your own clinic', 'Gain two herbs and restore 5 happiness.'), option('festival', 'Make its return part of the wilds festival', 'Gain devotion and strengthen a friendship.')], apply(s, id, c) { if (id === 'mentor') { s.life.career.experience += 6; c.standing('villagers', 4); } if (id === 'gather') { s.flags.herbs = (s.flags.herbs || 0) + 2; wellbeing(s, 5); } if (id === 'festival') { gainSkill(s, 'devotion'); bond(s, 'fellow', 7, 'We celebrated the returning grove together.'); } } },
  { id: 'life_family_roof', title: 'Rain through the old roof', test: () => true, body: s => `${named(s, 'kin')} writes that the family roof is leaking. They need help, but do not want to turn every visit into a request for money. How will you make room for them?`, choices: [option('hands', 'Repair it together on a free evening', 'Strengthen your family bond; gain survival and a little stress.'), option('money', 'Pay a carpenter twenty gold', 'Spend 20 gold and strengthen your bond while keeping your work schedule.'), option('honest', 'Explain what you can manage and find neighbors', 'Gain persuasion and preserve trust without promising money you lack.')], apply(s, id) { if (id === 'hands') { bond(s, 'kin', 12, 'You repaired the old roof beside me.'); gainSkill(s, 'survival'); wellbeing(s, 3, 4); } if (id === 'money') { pay(s, 20); bond(s, 'kin', 14, 'You arranged a carpenter when our roof failed.'); } if (id === 'honest') { gainSkill(s, 'persuasion'); bond(s, 'kin', 5, 'You told me honestly what help you could offer.'); } } },
  { id: 'life_friend_ambition', title: 'Your friend’s own road', test: () => true, body: s => `${named(s, 'fellow')} hopes to study ward-making, but worries that leaving familiar work behind is foolish. They ask for your perspective, not an order.`, choices: [option('encourage', 'Encourage them and share your notes', 'Gain scholarship and friendship; remember their new ambition.'), option('practical', 'Help them plan a safer apprenticeship', 'Gain career experience and friendship.'), option('listen', 'Ask what they want before giving advice', 'Gain persuasion, happiness, and a stronger bond.')], apply(s, id) { bond(s, 'fellow', 8, `You supported my plans for ward-making by choosing to ${id}.`); setFlag(s, 'lifeFriendWard'); if (id === 'encourage') gainSkill(s, 'scholarship'); if (id === 'practical') s.life.career.experience += 5; if (id === 'listen') { gainSkill(s, 'persuasion'); wellbeing(s, 5); } } },
  { id: 'life_friend_ward', title: 'A ward over your threshold', test: s => s.flags.lifeFriendWard, body: s => `${named(s, 'fellow')} returns with their first finished hearth ward. Your earlier support is part of its story. They ask where it should hang.`, choices: [option('home', 'Give it a place at your hearth', 'Restore health and happiness; make a shared memory.'), option('clinic', 'Ask whether the clinic could receive it', 'Gain village trust with your friend’s agreement.'), option('craft', 'Ask them to teach you the making', 'Gain arcana and 6 career experience.')], apply(s, id, c) { bond(s, 'fellow', 8, `My first ward found a place through your choice of ${id}.`); if (id === 'home') { wellbeing(s, 10, -5, 10); s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + 10); } if (id === 'clinic') c.standing('villagers', 7); if (id === 'craft') { gainSkill(s, 'arcana'); s.life.career.experience += 6; } } },
  { id: 'life_rival_race', title: 'The lantern-course challenge', test: s => s.life.focus === 'adventure' || s.hero.temperament === 'ambitious', body: s => `${named(s, 'rival')} challenges you to the old training course. The winners earn a small purse, but a junior trainee has been given a dangerous route. Your rival notices it too.`, choices: [option('compete', 'Compete while warning the steward', 'Earn 15 gold and gain a path skill.'), option('together', 'Give up your start to help the trainee together', 'Gain defense and turn rivalry toward friendship.'), option('watch', 'Judge the course and study its weaknesses', 'Gain survival and reduce stress.')], apply(s, id) { if (id === 'compete') { earn(s, 15); gainSkill(s, s.hero.path === 'mage' ? 'arcana' : s.hero.path === 'rogue' ? 'stealth' : 'weapons'); } if (id === 'together') { gainSkill(s, 'defense'); bond(s, 'rival', 12, 'We helped the young trainee instead of chasing the purse.'); } if (id === 'watch') { gainSkill(s, 'survival'); wellbeing(s, 3, -6); } } },
  { id: 'life_lantern_vigil', title: 'Whose lantern stays lit?', test: s => s.hero.belief === 'lantern' || s.hero.specialization === 'paladin', body: () => 'The Lantern shrine holds a vigil for people lost to the fever. The keeper asks whether the names of outlaws should be read with the others. Grieving households wait for your answer.', choices: [option('all', 'Read every name; grief does not revoke belonging', 'Gain devotion and village trust. The keeper witnesses your position.'), option('private', 'Offer separate private remembrances', 'Gain persuasion and order standing; families receive a place to mourn.'), option('family', 'Let each family decide how to remember', 'Strengthen your family bond and reduce stress.')], apply(s, id, c) { if (id === 'all') { gainSkill(s, 'devotion'); c.standing('villagers', 5); } if (id === 'private') { gainSkill(s, 'persuasion'); c.standing('order', 4); } if (id === 'family') { bond(s, 'kin', 6, 'You left room for every family’s remembrance.'); wellbeing(s, 4, -5); } } },
  { id: 'life_ancestor_chair', title: 'An empty chair at supper', test: s => s.hero.belief === 'ancestors' || s.hero.specialization === 'necromancer', body: s => `${named(s, 'kin')} sets a place for an ancestor at the harvest supper. One guest asks for an actual summoning; another asks that the evening remain an ordinary family remembrance.`, choices: [option('stories', 'Invite everyone to share remembered stories', 'Strengthen your family bond; no supernatural secret is revealed.'), option('permission', 'Explain a willing rite without performing it', 'Gain scholarship and an informed family conversation about ancestral study.'), option('boundary', 'Keep this supper separate from your studies', 'Restore happiness and keep the boundary kindly.')], apply(s, id) { bond(s, 'kin', 7, `At the harvest supper, you chose ${id} and respected the family’s differing wishes.`); if (id === 'stories') wellbeing(s, 5); if (id === 'permission') { gainSkill(s, 'scholarship'); know(s, 'kin', 'ancestral-study-discussed'); } if (id === 'boundary') wellbeing(s, 8, -5); } },
  { id: 'life_secular_debate', title: 'The lamp and the proof', test: s => s.hero.belief === 'secular' || s.hero.temperament === 'curious', body: () => 'A shrine miracle and a scholar’s remedy seem to have healed the same patient. The town asks for a verdict, but the patient would rather discuss what help comes next.', choices: [option('evidence', 'Record what happened before claiming a cause', 'Gain scholarship and academy standing.'), option('care', 'Keep the next patient’s care at the center', 'Gain village standing and happiness.'), option('dialogue', 'Invite keeper and scholar to a shared discussion', 'Gain persuasion and modest standing with both institutions.')], apply(s, id, c) { if (id === 'evidence') { gainSkill(s, 'scholarship'); c.standing('academy', 4); } if (id === 'care') { c.standing('villagers', 5); wellbeing(s, 4); } if (id === 'dialogue') { gainSkill(s, 'persuasion'); c.standing('academy', 2); c.standing('order', 2); } } },
  { id: 'life_noble_table', title: 'A place at the high table', test: s => s.hero.household === 'noble' || s.life.home.tier === 'estate' || s.life.lifestyle === 'generous', body: s => `A patron invites you to dinner, but expects you to leave ${named(s, 'fellow')} outside with the servants. The invitation offers contacts at a price that is social rather than financial.`, choices: [option('insist', 'Ask that your friend be welcomed too', 'Gain persuasion and friendship; the invitation may be withdrawn.'), option('attend', 'Attend alone and explain your choice honestly', 'Earn 25 gold in patron work; your friend is disappointed.'), option('own', 'Hold your own supper for the people you value', 'Spend 15 gold, restore happiness, and strengthen friendships.')], apply(s, id) { if (id === 'insist') { gainSkill(s, 'persuasion'); bond(s, 'fellow', 10, 'You asked the patron to welcome me alongside you.'); } if (id === 'attend') { earn(s, 25); bond(s, 'fellow', -8, 'You accepted the patron’s invitation while I was excluded.'); } if (id === 'own') { pay(s, 15); wellbeing(s, 10, -4); bond(s, 'fellow', 10, 'You opened your own table to the people you valued.'); } } },
  { id: 'life_budget_feast', title: 'The harvest lantern fair', test: () => true, body: () => 'The harvest fair fills the streets with paper dragons and spiced cider. You could work the stalls, spend a little on a happy evening, or help set out the free community supper.', choices: [option('work', 'Work the stalls', 'Earn 22 gold and 4 career experience; add a little stress.'), option('celebrate', 'Spend ten gold on an evening with friends', 'Restore 12 happiness and strengthen a friendship.'), option('help', 'Help make the free supper', 'Gain village trust and happiness without spending gold.')], apply(s, id, c) { if (id === 'work') { earn(s, 22); s.life.career.experience += 4; wellbeing(s, 2, 5); } if (id === 'celebrate') { pay(s, 10); wellbeing(s, 12, -6); bond(s, 'fellow', 7, 'We shared the lantern fair together.'); } if (id === 'help') { c.standing('villagers', 5); wellbeing(s, 6, -3); } } },
  { id: 'life_smuggler_offer', title: 'A parcel with no seal', test: s => s.hero.path === 'rogue' || s.hero.temperament === 'rebellious' || s.factions.underworld > 0, body: () => 'A discreet broker offers gold to move a sealed parcel of prohibited spell-paper. They promise no one will know. The receiving clerk, however, wants your name on a delivery receipt.', choices: [option('decline', 'Decline without giving the broker away', 'Preserve boundaries and reduce stress.'), option('license', 'Ask whether the material can be licensed', 'Gain scholarship and academy trust; no crime is committed.'), option('smuggle', 'Sign the receipt and deliver it', 'Earn 42 gold and underworld favor. The clerk holds evidence of your involvement.')], apply(s, id, c) { if (id === 'decline') wellbeing(s, 3, -6); if (id === 'license') { gainSkill(s, 'scholarship'); c.standing('academy', 5); } if (id === 'smuggle') { earn(s, 42); c.standing('underworld', 6); c.addEvidence(1, 'A delivery clerk holds your signed receipt for prohibited spell-paper.'); setFlag(s, 'lifeSignedParcel'); } } },
  { id: 'life_receipt_returns', title: 'The clerk kept a copy', test: s => s.flags.lifeSignedParcel, body: () => 'The parcel clerk produces your signed receipt during a local inquiry. They offer you a chance to account for it before making their report public. Knowledge has a real source.', choices: [option('account', 'Give an honest account and return the fee', 'Spend 20 gold, gain village trust, and record your cooperation. Existing evidence still requires ordinary restitution.'), option('defend', 'Ask for a lawful hearing', 'Gain persuasion. The inquiry retains the receipt as evidence.'), option('pressure', 'Threaten the clerk to destroy the copy', 'Gain underworld standing, more local evidence, stress, and an oath breach.')], apply(s, id, c) { if (id === 'account') { pay(s, 20); c.standing('villagers', 5); setFlag(s, 'lifeParcelAccount'); } if (id === 'defend') gainSkill(s, 'persuasion'); if (id === 'pressure') { c.addEvidence(2, 'The delivery clerk reports your threat and retains the receipt.'); c.standing('underworld', 4); c.breakOath('You threatened a witness to hide a delivery.'); wellbeing(s, -4, 12); } } },
  { id: 'life_vampire_guest', title: 'Supper after sunset', test: s => s.hero.condition?.type === 'vampire'&&(s.hero.condition.curseVersion!==1||s.hero.condition.stage==='changed'), body: s => `${named(s, 'fellow')} invites you to a sunrise picnic. They have not guessed why you prefer evenings. You decide what to explain, and to whom.`, choices: [option('dusk', 'Suggest a twilight supper without disclosure', 'Strengthen friendship and keep your condition private.'), option('truth', 'Tell this friend why daylight is difficult', 'Your friend learns about vampirism; gain bond and a discreet evening invitation.'), option('decline', 'Decline and keep some distance', 'Keep secrecy, but lose some bond and happiness.')], apply(s, id) { if (id === 'dusk') bond(s, 'fellow', 6, 'You made an evening invitation of your own.'); if (id === 'truth') { know(s, 'fellow', 'vampire'); bond(s, 'fellow', 10, s.life.people.find(p=>p.id==='fellow')?.knownFacts.includes('vampire')&&s.life.pendingEvent?.confidenceKnown?'We discussed the feeding boundaries of the private confidence you had already shared.':'You trusted me with your vampirism and asked for discretion.'); wellbeing(s, 6, -8); } if (id === 'decline') { bond(s, 'fellow', -5, 'You turned down the picnic without making another plan.'); wellbeing(s, -3); } } },
  { id: 'life_wolf_confidant', title: 'A friend beneath the moon', test: s => s.hero.condition?.type === 'lycanthrope', body: s => `${named(s, 'river')} asks why you leave supper early whenever the moon grows round. Their concern offers a possible confidant, but no one has learned your secret by magic.`, choices: [option('tell', 'Explain the condition and your safety plan', 'This person learns about lycanthropy; gain trust and 5 control.'), option('boundary', 'Ask for privacy and promise a different supper', 'Keep the condition secret and preserve the bond.'), option('train', 'Keep your confidence and practice restraint', 'Gain 8 control and a little stress.')], apply(s, id) { if (id === 'tell') { know(s, 'river', 'lycanthrope'); bond(s, 'river', 10, 'You explained your lunar refuge and trusted me with the truth.'); if(s.life.pendingEvent?.conditionStoryVersion!==26)s.hero.condition.control = clamp(s.hero.condition.control + 5); } if (id === 'boundary') bond(s, 'river', 4, 'You asked for privacy and still made time for me.'); if (id === 'train') { if(s.life.pendingEvent?.conditionStoryVersion!==26)s.hero.condition.control = clamp(s.hero.condition.control + 8); wellbeing(s, 0, 4); } } },
  { id: 'life_partner_time', title: 'The chair you keep missing', test: s => Boolean(s.life.partnerId), body: s => `${named(s, s.life.partnerId)} says your work matters, but so do the evenings you promised to share. They ask for a practical change rather than a dramatic declaration.`, choices: [option('time', 'Protect a regular evening together', 'Gain partner bond and happiness; change the annual focus to relationships.'), option('explain', 'Discuss a temporary busy season together', 'Gain a smaller bond; agree to revisit the schedule next season.'), option('dismiss', 'Say your work must come first', 'Gain 8 career experience, but damage your partner’s trust and add stress.')], apply(s, id) { const p = s.life.partnerId; if (id === 'time') { bond(s, p, 12, 'You protected regular time for our life together.'); wellbeing(s, 8, -6); s.life.focus = 'relationships'; if (s.life.plan) s.life.plan.focus = 'relationships'; } if (id === 'explain') { bond(s, p, 4, 'We talked honestly about a difficult work season.'); setFlag(s, 'lifePartnerSchedule'); } if (id === 'dismiss') { bond(s, p, -14, 'You dismissed my request for time together.'); s.life.career.experience += 8; wellbeing(s, -4, 8); } } },
  { id: 'life_child_school', title: 'A child’s first teacher', test: s => s.life.children.some(c => c.alive !== false && c.age >= 5), body: s => `${s.life.children.find(c => c.alive !== false && c.age >= 5)?.name} is old enough for lessons. The shrine offers practical reading, the academy charges for specialist teaching, and a traveling craftsperson welcomes an apprentice. Your child has questions of their own.`, choices: [option('public', 'Visit the free shrine school together', 'Support the child’s curiosity and gain family happiness.'), option('academy', 'Pay thirty gold for academy lessons', 'Spend 30 gold and make scholarship part of the household story.'), option('craft', 'Let the child try a craft before choosing', 'Gain career experience and honor their emerging interests.')], apply(s, id) { setFlag(s, 'lifeChildEducation', id); wellbeing(s, 8, -3); if (id === 'academy') { pay(s, 30); gainSkill(s, 'scholarship'); } if (id === 'craft') s.life.career.experience += 5; if (s.life.partnerId) bond(s, s.life.partnerId, 5, 'We made time to choose lessons with our child.'); } },
  { id: 'life_child_question', title: 'What do you do all day?', test: s => s.life.children.some(c => c.alive !== false), body: s => `${s.life.children.find(c => c.alive !== false).name} asks why people call you a ${s.hero.profession === 'Unemployed' ? s.hero.path : s.hero.profession.toLowerCase()}. A child sees the person who comes home, while the world sees a profession.`, choices: [option('show', 'Show the safe parts of your work', 'Gain career experience and make a household memory.'), option('story', 'Tell a story about someone you helped', 'Gain happiness and persuasion.'), option('ask', 'Ask what kind of life they imagine', 'Reduce stress and give their own interests room to grow.')], apply(s, id) { if (id === 'show') s.life.career.experience += 5; if (id === 'story') { gainSkill(s, 'persuasion'); wellbeing(s, 6); } if (id === 'ask') wellbeing(s, 6, -7); setFlag(s, 'lifeChildDream', id); } },
  { id: 'life_overwork', title: 'The hands that will not stop shaking', test: s => s.life.stress >= 50 || s.life.health < 50 || s.life.focus === 'livelihood', body: () => 'A familiar task takes twice as long. The hearth-keeper calls it exhaustion, not weakness. There is work waiting, but your body is also part of this life.', choices: [option('rest', 'Make recovery this year’s priority', 'Change focus to rest, reduce stress, and restore health.'), option('share', 'Ask a colleague to share the load', 'Gain friendship and restore some health; no hidden secret is shared.'), option('push', 'Finish one more paid commission', 'Earn 35 gold and career experience; lose health and add stress.')], apply(s, id) { if (id === 'rest') { s.life.focus = 'rest'; if (s.life.plan) s.life.plan.focus = 'rest'; wellbeing(s, 8, -20, 15); } if (id === 'share') { bond(s, 'fellow', 8, 'You asked me for help when your workload became too much.'); wellbeing(s, 4, -8, 8); } if (id === 'push') { earn(s, 35); s.life.career.experience += 6; wellbeing(s, -3, 15, -12); } } },
  { id: 'life_open_hearth', title: 'A knock during the storm', test: s => s.life.home.tier !== 'lodgings' || s.hero.temperament === 'compassionate', body: () => 'A soaked traveler asks for a night under your roof. They offer work instead of money. You can welcome someone while still setting clear household boundaries.', choices: [option('shelter', 'Offer the spare bench and a meal', 'Gain village trust and happiness; no gold reward is promised.'), option('work', 'Agree on a fair exchange for repairs', 'Gain survival and 10 gold saved through practical help.'), option('inn', 'Guide them to the communal shelter', 'Gain persuasion and modest village trust.')], apply(s, id, c) { if (id === 'shelter') { c.standing('villagers', 6); wellbeing(s, 6); } if (id === 'work') { gainSkill(s, 'survival'); earn(s, 10); } if (id === 'inn') { gainSkill(s, 'persuasion'); c.standing('villagers', 3); } } },
  { id: 'life_border_story', title: 'A road drawn from memory', test: s => s.life.focus === 'adventure' || s.hero.temperament === 'cautious', body: () => 'A retired scout offers an old map. The road on it crosses a family burial grove. The cheapest route and the most respectful route are not quite the same.', choices: [option('around', 'Mark a route around the graves', 'Gain survival and village trust.'), option('survey', 'Ask the family to help survey the boundary', 'Gain persuasion and defense; remember a respectful agreement.'), option('archive', 'Copy the map into the public archive', 'Gain scholarship and academy standing without claiming a route is safe.')], apply(s, id, c) { if (id === 'around') { gainSkill(s, 'survival'); c.standing('villagers', 4); } if (id === 'survey') { gainSkill(s, 'persuasion'); gainSkill(s, 'defense'); setFlag(s, 'lifeBoundarySurvey'); } if (id === 'archive') { gainSkill(s, 'scholarship'); c.standing('academy', 3); } } },
  { id: 'life_birthday', title: 'Another candle at the hearth', test: () => false, body: s => `You turn ${s.age}. ${named(s, 'kin')} asks what you want the coming year to stand for. The completed year is recorded in your yearbook; this answer is a direction rather than a destiny.`, choices: [option('calling', 'I want to become better at my calling', 'Gain 5 career experience and choose livelihood as your next default focus.'), option('people', 'I want to be present for my people', 'Choose relationships as your next default; strengthen a family bond.'), option('self', 'I want room to discover who I am', 'Restore happiness and choose education as your next default focus.')], apply(s, id) { if (id === 'calling') { s.life.career.experience += 5; s.life.focus = 'livelihood'; } if (id === 'people') { s.life.focus = 'relationships'; bond(s, 'kin', 8, 'At your birthday, you chose to make more room for the people who know you.'); } if (id === 'self') { s.life.focus = 'education'; wellbeing(s, 8, -5); } } },
];
const EVENT_COSTS = { life_family_roof: { money: 20 }, life_noble_table: { own: 15 }, life_budget_feast: { celebrate: 10 }, life_receipt_returns: { account: 20 }, life_child_school: { academy: 30 } };

function openAuthoredEvent(s, event, ctx) {
  const conditionStory=['life_vampire_guest','life_wolf_confidant'].includes(event.id),profile=conditionStory?conditionConfidenceScene(s,event):{body:event.body(s),choices:event.choices};
  s.life.pendingEvent = { eventId: event.id,...(conditionStory?{conditionStoryVersion:26,confidenceKnown:s.life.people.find(p=>p.id===(event.id==='life_vampire_guest'?'fellow':'river'))?.knownFacts.includes(s.hero.condition?.type)||false}:{}) };
  const choices = profile.choices.filter(c => s.hero.gold >= (EVENT_COSTS[event.id]?.[c.id] || 0));
  ctx.setEvent(event.id, event.title, event.id === 'life_birthday' ? 'Annual turning point' : 'A year in your life', profile.body, choices);
}

function nextDilemma(s, ctx) {
  const recent = s.life.eventHistory.slice(-8).map(e => e.id);
  const participants = { life_family_roof: 'kin', life_friend_ambition: 'fellow', life_friend_ward: 'fellow', life_scholar_citation: 'rival', life_rival_race: 'rival', life_ancestor_chair: 'kin', life_noble_table: 'fellow', life_vampire_guest: 'fellow', life_wolf_confidant: 'river' };
  const eligible = e => e.test(s) && (!participants[e.id] || person(s, participants[e.id]));
  let candidates = EVENTS.filter(e => eligible(e) && !recent.includes(e.id));
  if (!candidates.length) candidates = EVENTS.filter(eligible);
  const relevant = candidates.filter(e => !['life_family_roof', 'life_friend_ambition', 'life_budget_feast'].includes(e.id));
  if (relevant.length && seededRoll(s.seed, `relevance-${s.day}`, 3) > 0) candidates = relevant;
  const selected = candidates[seededRoll(s.seed, `annual-${s.day}-${s.life.eventHistory.length}`, candidates.length)];
  openAuthoredEvent(s, selected, ctx);
}

function openNeed(s, ctx) {
  if (s.event || s.battle) return true;
  const need = ctx.pendingNeed?.();
  if (need === 'vampire' || s.hero.condition?.type === 'vampire' && s.hero.condition.hunger >= 75) {
    ctx.setEvent('life_hunger', 'A life still needs sustenance', 'Annual interruption · vampirism', `Hunger has reached ${s.hero.condition.hunger}/100. Your planned year waits for a decision. Animal blood is a viable free route; no person or faction learns your condition through this private arrangement.`, [option('animal', 'Arrange careful animal feeding', 'Take one day and reduce hunger by 45; spend no gold.'), ...(s.hero.gold >= 8 ? [option('donor', 'Pay a consenting donor eight gold', 'Take one day and reduce hunger by 65; no assault or public evidence.')] : []), option('pause', 'Leave the year paused while you decide', 'Keep your hunger unchanged and return to day activities.')]);
    return true;
  }
  if (need) {
    ctx.afterAction?.();
    if (!s.event) s.notice = 'The annual plan is paused for a known obligation or lunar need. Resolve it through day activities before continuing.';
    return true;
  }
  return false;
}

function completeYear(s, ctx) {
  const p = s.life.plan;
  if (!p) return;
  const id = `year-${p.targetDay}`;
  if (!s.life.yearHistory.some(y => y.id === id)) {
    const summary = `${p.steps} periods of ${p.focus}; earned ${p.income} gold and spent ${p.expenses} on living costs and decisions. ${p.decisions.length ? p.decisions.slice(-4).join(' ') : 'You kept an ordinary, steady season.'}`;
    s.life.yearHistory.push({ id, age: 18 + Math.floor(p.targetDay / 365), day: p.targetDay, focus: p.focus, income: p.income, expenses: p.expenses, title: `The year you turned ${18 + Math.floor(p.targetDay / 365)}`, summary });
    ctx.journal('A year remembered', summary, 'yearbook');
  }
  s.life.plan = null;
  updateGoals(s, ctx);
  openAuthoredEvent(s, EVENTS.find(e => e.id === 'life_birthday'), ctx);
}

export function startYearPlan(s, config = {}, ctx) {
  initializeLife(s);
  if (s.phase !== 'adult' || s.event || s.battle) { s.notice = 'Resolve the current situation before beginning a year.'; return; }
  if (s.life.plan) { s.notice = 'A year is already planned. Continue it after resolving any interruption.'; return; }
  const r = rates(s, config);
  s.life.focus = r.focus;
  s.life.lifestyle = r.lifestyle;
  s.life.plan = { id: `plan-${s.day}`, startDay: s.day, targetDay: (Math.floor(s.day / 365) + 1) * 365, focus: r.focus, lifestyle: r.lifestyle, nextDecisionDay: s.day + 90, income: 0, expenses: 0, steps: 0, decisions: [], earnedAccrual: 0, expenseAccrual: 0, incomePaid: 0, expensesPaid: 0, pausedReason: '' };
  ctx.journal('A year with intention', `You chose ${YEAR_FOCI.find(f => f.id === r.focus).label.toLowerCase()} and ${LIFESTYLES.find(l => l.id === r.lifestyle).label.toLowerCase()}. ${yearPreview(s, r).description}`, 'yearbook');
  continueYearPlan(s, ctx);
}

function periodBenefits(s, days, ctx) {
  const p = s.life.plan;
  const before = Math.floor((s.day - days - p.startDay) / 30);
  const after = Math.floor((s.day - p.startDay) / 30);
  const periods = Math.max(0, after - before);
  if (!periods) return;
  const focus = p.focus;
  if (focus === 'livelihood') { s.life.career.experience += periods * 4; wellbeing(s, 0, periods * 3, -periods); }
  if (focus === 'education') { gainSkill(s, 'scholarship', periods); gainSkill(s, s.hero.path === 'mage' ? 'arcana' : 'persuasion', periods); s.flags.education += periods; wellbeing(s, periods * 2, periods * 2); }
  if (focus === 'relationships') { for (const npc of s.life.people) bond(s, npc.id, periods * 2); wellbeing(s, periods * 3, -periods * 2); }
  if (focus === 'adventure') { gainSkill(s, s.hero.path === 'warrior' ? 'weapons' : s.hero.path === 'mage' ? 'arcana' : 'stealth', periods); gainSkill(s, 'survival', periods); ctx.earnExperience(periods * 12); wellbeing(s, periods, periods * 2, -periods); }
  if (focus === 'rest') { wellbeing(s, periods * 3, -periods * 4, periods * 4); s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + periods * 10); s.hero.mp = Math.min(s.hero.maxMp, s.hero.mp + periods * 8); }
  if (p.lifestyle === 'comfortable') wellbeing(s, periods, -periods, periods);
  if (p.lifestyle === 'generous') wellbeing(s, periods * 2, -periods, periods);
  if (s.life.stress >= 80) { wellbeing(s, -periods * 2, 0, -periods * 2); s.hero.hp = Math.max(1, s.hero.hp - periods * 2); }
  if (s.life.health < 30) s.hero.hp = Math.max(1, s.hero.hp - periods * 2);
}

export function continueYearPlan(s, ctx) {
  initializeLife(s);
  if (!s.life.plan || s.phase !== 'adult' || s.event || s.battle) return;
  s.notice = '';
  for (let guard = 0; guard < 100; guard++) {
    const p = s.life.plan;
    if (!p) return;
    if (s.day >= p.targetDay) { completeYear(s, ctx); return; }
    if (openNeed(s, ctx)) return;
    if (s.day >= p.nextDecisionDay) { p.nextDecisionDay += 90; nextDilemma(s, ctx); return; }
    const interruption = ctx.nextInterruptionDay?.();
    const days = Math.min(30, p.targetDay - s.day, p.nextDecisionDay - s.day, interruption == null ? 30 : Math.max(0, interruption - s.day));
    if (days <= 0) { ctx.afterAction?.(); return; }
    const r = rates(s, p);
    const incomeDue = Math.floor(p.earnedAccrual + r.income * days / 365) - p.incomePaid;
    const costDue = Math.floor(p.expenseAccrual + r.expenses * days / 365) - p.expensesPaid;
    if (s.hero.gold + incomeDue < costDue) {
      ctx.setEvent('life_budget', 'The household ledger runs short', 'Annual interruption · living costs', `The next ${days}-day period expects ${incomeDue} gold in wages and ${costDue} in expenses. Your ${s.hero.gold} gold in savings cannot cover the difference. Time will wait while you choose a viable adjustment.`, [option('simplify', 'Use humble provisions and take steadier work', 'Change to frugal living and livelihood focus. Your home and relationships remain.'), option('work', 'Take an extra short commission', 'Earn 25 gold through a three-day assignment; add 8 stress. Promises and supernatural needs still apply.'), option('pause', 'Pause the plan and arrange matters yourself', 'No time or gold is spent. Day activities remain available.')]);
      return;
    }
    const oldDay = s.day;
    ctx.spendDays(days, {});
    const actual = Math.max(0, s.day - oldDay);
    if (s.phase === 'retired') return;
    if (!actual) { ctx.afterAction?.(); return; }
    p.earnedAccrual += r.income * actual / 365;
    p.expenseAccrual += r.expenses * actual / 365;
    const wages = Math.floor(p.earnedAccrual + 1e-8) - p.incomePaid;
    const expenses = Math.floor(p.expenseAccrual + 1e-8) - p.expensesPaid;
    s.hero.gold += wages - expenses;
    p.income += wages; p.expenses += expenses;
    p.incomePaid += wages; p.expensesPaid += expenses; p.steps++;
    periodBenefits(s, actual, ctx);
    updateGoals(s, ctx);
    ctx.afterAction?.();
    if (s.event || s.battle) return;
  }
  s.notice = 'The year is safely paused. Continue when you are ready.';
}

export function applyLifeChoice(s, eventId, choiceId, ctx) {
  if (!eventId.startsWith('life_') || !lifeEventIds()[eventId]?.includes(choiceId)) return false;
  initializeLife(s);
  const pending = s.life.pendingEvent;
  if (eventId === 'life_values') {
    const p = person(s, pending?.personId);
    if (!p?.compatibility || ![1,2].includes(pending?.compatibilityVersion)) return false;
    const response = compatibilityConversation(s, p, 'values', choiceId === 'share' ? s.hero.preferences?.value || 'duty' : choiceId,{revealOne:pending.compatibilityVersion===2});
    note(s, ctx, 'Two people, with known wishes', `${response.text} ${compatibilityView(s,p).differences.length ? 'Your known differences remain visible and can be respected without being erased.' : 'You have learned what they actually enjoy and value.'}`);
  } else if (eventId === 'life_courtship') {
    const target = pending?.personId;
    if (!person(s, target)) return false;
    if (choiceId === 'yes') {
      if(personalReadiness(s,target))return false;
      if (person(s, target).role === 'relative' || person(s, target).familyRole || person(s, target).alive === false || person(s, target).age < 18 || person(s, target).bond < 55 || s.life.partnerId) return false;
      if (s.life.courtshipId && s.life.courtshipId !== target) person(s, s.life.courtshipId).relation = 'friend';
      s.life.courtshipId = target; person(s, target).relation = 'courtship'; bond(s, target, 7, 'We freely agreed to begin a courtship.');
    }
    if (choiceId === 'friends') bond(s, target, 4, 'You spoke honestly and treasured our friendship.');
    if (choiceId === 'discuss') {
      if (pending?.compatibilityVersion !== 1 || !person(s,target).compatibility) return false;
      compatibilityConversation(s, person(s,target), 'values', 'listen');
    }
    note(s, ctx, 'Affection with a choice', `${named(s, target)} and you agreed to ${choiceId === 'yes' ? 'begin a courtship' : choiceId === 'discuss' ? 'discuss your values while remaining friends for now' : 'remain friends'}.`);
  } else if (eventId === 'life_commitment') {
    const target = pending?.personId;
    if (!person(s, target)) return false;
    if (choiceId === 'pledge') {
      if(personalReadiness(s,target))return false;
      if (s.life.partnerId || s.life.courtshipId !== target || person(s, target).bond < 70 || person(s, target).role === 'relative' || person(s, target).familyRole || person(s, target).alive === false || person(s, target).age < 18 || s.age < 18) return false;
      s.life.partnerId = target; s.life.courtshipId = null; person(s, target).relation = 'partner'; bond(s, target, 10, 'We made a mutual household pledge while keeping our own convictions.'); wellbeing(s, 10, -8);
      recordPartnership(s);
    }
    note(s, ctx, 'A shared future considered', choiceId === 'pledge' ? `You and ${named(s, target)} became committed partners.` : `You and ${named(s, target)} agreed to keep courting.`);
  } else if (eventId === 'life_separation' || eventId === 'life_courtship_end') {
    const target = pending?.personId, p = person(s, target), separation = eventId === 'life_separation';
    if (!p || s.age < 18 || (separation ? s.life.partnerId : s.life.courtshipId) !== target) return false;
    if (choiceId === 'end') {
      if (separation) {
        s.life.partnerId = null;
        const record = s.lineage?.people.find(a => a.source === 'life' && a.localId === target);
        for (const union of s.lineage?.unions || []) if (union.partnerId === record?.id && union.endedDay === null) { union.endedDay = s.day; union.endReason = 'separation'; }
        wellbeing(s, -5, 8);
      } else s.life.courtshipId = null;
      p.relation = 'friend';
      bond(s, target, separation ? -10 : -5, `At your age ${s.age}, we ended our ${separation ? 'partnership' : 'courtship'} honestly. Earlier memories and actual family responsibilities were not erased.`);
    } else bond(s, target, 3, `At your age ${s.age}, we chose to continue our ${separation ? 'partnership' : 'courtship'} while speaking plainly about our boundaries.`);
    note(s, ctx, choiceId === 'end' ? 'A relationship, honestly ended' : 'A relationship, chosen again', `You and ${p.name} ${choiceId === 'end' ? `ended the ${separation ? 'partnership' : 'courtship'}` : 'chose to continue after discussing your boundaries'}. ${separation ? 'The real children, co-parent links, family property and shared past remain recorded.' : 'A remembered friendship is not an obligation to resume romance.'}`);
  } else if (eventId === 'life_family_start') {
    if (choiceId === 'welcome' && (!s.life.partnerId || person(s, s.life.partnerId).bond < 65)) return false;
    if (choiceId !== 'wait' && s.life.children.length < 3) {
      const salt=`child-${s.dynasty?.generation || 1}-${s.day}-${s.life.children.length}`,familyAppearance=choiceId==='adopt'?undefined:s.life.people.find(p=>p.id===s.life.partnerId)?.appearance&&seededRoll(s.seed,salt+':parent',2)?s.life.people.find(p=>p.id===s.life.partnerId).appearance:s.hero.appearance;
      const identity=generateCharacter(s.seed,salt,{age:0,role:'child',familyAppearance});
      const child = { id: `child-${s.life.children.length + 1}`, name: generatePersonName(s.seed,salt,{...identity,familyName:choiceId==='adopt'?undefined:familyNameOf(s.hero)||undefined}), age: 0, bornDay: s.day };
      s.life.children.push(child); s.life.householdSupport = true;
      if (s.life.partnerId) bond(s, s.life.partnerId, 8, `We welcomed ${child.name} into our household.`);
      wellbeing(s, 12, 6);
      note(s, ctx, 'A new place at the hearth', `${child.name} joined your household ${choiceId === 'adopt' ? 'through adoption' : 'with your partner’s freely given agreement'}. Their years and support now belong to your calendar.`);
      registerChild(s, child, { welcome: choiceId === 'welcome', newArrival: true,ownAppearance:identity.appearance,ownPronouns:identity.pronouns });
    } else note(s, ctx, 'A family decision', 'You kept the prepared supplies and chose to wait before welcoming a child.');
  } else if (eventId === 'life_hunger') {
    if(choiceId==='endure'&&s.hero.condition?.type==='vampire'){
      const before=s.day;ctx.spendDays(1,{outdoors:false,night:true});
      if(s.phase==='retired')return true;
      note(s,ctx,'A night refused',`${s.day-before} real day passed without blood. Hunger is ${s.hero.condition.hunger}/100. The appetite remains, and the calendar keeps its claims on your life.`);
    } else if (choiceId !== 'pause' && s.hero.condition?.type === 'vampire') {
      if (choiceId === 'donor' && s.hero.gold < 8 || choiceId==='jailer'&&!s.justice?.prison) return false;
      const before = s.day;
      ctx.spendDays(1, {});
      if (s.phase === 'retired') return true;
      if (s.day === before) {
        s.life.pendingEvent = null;
        s.notice = 'The feeding waits for the current birthday or deadline. No fee was charged and hunger has not been reduced.';
        return true;
      }
      if (choiceId === 'donor' && !pay(s, 8)) return false;
      feedBlood(s,choiceId==='donor'?'donor':'animal',ctx.meal?.baseAmount??(choiceId==='donor'?65:choiceId==='jailer'?30:45),ctx);
      if(choiceId==='jailer')recordCurseExposure(s,ctx,'The infirmary jailer heard your disclosed blood hunger.',1);
      note(s, ctx, 'A need met carefully', `A ${choiceId==='jailer'?'locally recorded prison ration':choiceId === 'donor' ? 'private consenting donor meal' : 'private animal feeding'} used ${s.day - before} actual day and lowered hunger to ${s.hero.condition.hunger}. Your plan will resume only when you choose Continue.`);
    } else s.notice = 'The annual plan remains paused; take day activities before you continue.';
  } else if (eventId === 'life_budget') {
    if (choiceId === 'simplify') { s.life.focus = 'livelihood'; s.life.lifestyle = 'frugal'; if (s.life.plan) { s.life.plan.focus = 'livelihood'; s.life.plan.lifestyle = 'frugal'; } wellbeing(s, 0, -4); }
    if (choiceId === 'work') {
      const deadline = ctx.nextInterruptionDay?.();
      const before = s.day;
      ctx.spendDays(Math.max(0, Math.min(3, deadline == null ? 3 : deadline - s.day)), {});
      const actual = s.day - before;
      if (actual > 0) { earn(s, Math.floor(25 * actual / 3)); wellbeing(s, 0, Math.ceil(8 * actual / 3)); }
    }
    s.notice = 'Your adjustment is made. Continue the planned year when you are ready.';
  } else {
    const event = EVENTS.find(e => e.id === eventId);
    if (!event || !event.choices.some(c => c.id === choiceId)) return false;
    const cost = EVENT_COSTS[eventId]?.[choiceId] || 0;
    if (s.hero.gold < cost) return false;
    event.apply(s, choiceId, ctx);
    const text = `${event.title}: ${event.choices.find(c => c.id === choiceId).label}.`;
    if (s.life.plan) s.life.plan.decisions.push(text);
    s.life.yearlyDecisions.push({ day: s.day, event: eventId, choice: choiceId });
    s.life.yearlyDecisions = s.life.yearlyDecisions.slice(-120);
    note(s, ctx, event.title, text + ' Your year waits until you choose Continue.');
  }
  s.life.eventHistory.push({ id: eventId, day: s.day, choice: choiceId });
  s.life.eventHistory = s.life.eventHistory.slice(-160);
  s.life.pendingEvent = null;
  updateGoals(s, ctx);
  return true;
}

export function lifeEventIds() {
  return Object.fromEntries([...EVENTS.map(e => [e.id, e.choices.map(c => c.id)]), ['life_values', ['listen', 'share', 'dismiss']], ['life_courtship', ['yes', 'friends', 'discuss']], ['life_commitment', ['pledge', 'wait']], ['life_separation', ['end', 'stay']], ['life_courtship_end', ['end', 'stay']], ['life_family_start', ['adopt', 'welcome', 'wait']], ['life_hunger', ['animal', 'donor', 'pause', 'endure', 'jailer']], ['life_budget', ['simplify', 'work', 'pause']]]);
}

const bounded = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => Number.isFinite(n) && n >= lo && n <= hi;
const integer = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => Number.isInteger(n) && n >= lo && n <= hi;
const string = (v, limit = 5000) => typeof v === 'string' && v.length <= limit;
function validLife(v, state) {
  if (!v || typeof v !== 'object' || !YEAR_FOCI.some(f => f.id === v.focus) || !LIFESTYLES.some(l => l.id === v.lifestyle)) return false;
  if (![v.happiness, v.stress, v.health].every(n => bounded(n, 0, 100))) return false;
  if (!v.career || !integer(v.career.rank, 0, 3) || !integer(v.career.experience) || !HOME_ORDER.includes(v.home?.tier)) return false;
  if (v.home.source !== undefined && !['construction', 'purchase'].includes(v.home.source)) return false;
  if (v.home.locationId !== undefined && (typeof v.home.locationId !== 'string' || state && !state.world?.locations.some(site => site.id === v.home.locationId))) return false;
  if (!Array.isArray(v.people) || v.people.length < 4 || v.people.length > (state?.socialLife ? 128 : state?.revision >= 5 ? 30 : 12)) return false;
  const ids = new Set();
  for (const p of v.people) {
    if (!validateRelationshipDepth(p,state)) return false;
    if (!p || !(['kin', 'fellow', 'rival', 'river', 'family_parent', 'family_sibling_1', 'family_sibling_2'].includes(p.id) || state?.revision >= 5 && /^family_(guardian|sibling_[1-9][0-9]?)$/.test(p.id) || state?.socialLife&&p.worldSource===true&&/^[a-z][a-z0-9_-]{0,79}$/.test(p.id)&&!['constructor','prototype','__proto__'].includes(p.id)) || ids.has(p.id) || !string(p.name, 80) || !p.name.trim()) return false;
    if (!['relative', 'friend', 'rival', 'suitor', 'acquaintance'].includes(p.role) || !['family', 'friend', 'rival', 'acquaintance', 'courtship', 'partner'].includes(p.relation) || !['kind', 'driven', 'reserved', 'bold'].includes(p.disposition)) return false;
    if (!integer(p.baseAge, state?.timeline?.mode === 'birth' || state?.revision >= 5 && p.bornDay !== undefined ? 0 : 18, state?.revision >= 5 ? 5000 : 100) || !integer(p.age, state?.timeline?.mode === 'birth' || state?.revision >= 5 && p.bornDay !== undefined ? 0 : 18) || !bounded(p.bond, 0, 100)) return false;
    if (p.bornDay !== undefined && (!integer(p.bornDay, -10000000) || state && p.bornDay > state.day)) return false;
    if (p.deathDay !== undefined && (!integer(p.deathDay) || p.alive !== false || state && p.deathDay > state.day)) return false;
    for (const field of ['knownFactsByPerson', 'memoriesByPerson']) if (p[field] !== undefined && (!p[field] || typeof p[field] !== 'object' || Array.isArray(p[field]) || Object.keys(p[field]).length > 200 || !Object.entries(p[field]).every(([id, values]) => /^[a-z][a-z0-9_-]{0,159}$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id) && Array.isArray(values) && values.length <= 60 && values.every(x => string(x, 1000))))) return false;
    if (![p.memories, p.knownFacts].every(a => Array.isArray(a) && a.length <= 60 && a.every(x => string(x, 1000)))) return false;
    if (p.familyRole !== undefined && (!['parent', 'guardian', 'sibling'].includes(p.familyRole) || p.role !== 'relative' || p.relation !== 'family')) return false;
    if (p.alive !== undefined && typeof p.alive !== 'boolean') return false;
    if (p.description !== undefined && !string(p.description, 1200)) return false;
    if (p.occupation !== undefined && !string(p.occupation, 160)) return false;
    if (p.locationId !== undefined && state && !state.world.locations.some(l => l.id === p.locationId)) return false;
    ids.add(p.id);
  }
  if (!['kin', 'fellow', 'rival', 'river'].every(id => ids.has(id))) return false;
  if (v.relationshipVersion !== undefined && v.relationshipVersion !== 1) return false;
  if (v.people.some(p => p.id.startsWith('family_') && (p.role !== 'relative' || !p.familyRole))) return false;
  if (![v.partnerId, v.courtshipId].every(id => id === null || ids.has(id) && v.people.some(p => p.id === id && p.role !== 'relative' && !p.familyRole && p.alive !== false && p.age >= 18))) return false;
  if (!Array.isArray(v.children) || v.children.length > 3 || new Set(v.children.map(c => c.id)).size !== v.children.length) return false;
  for (const c of v.children) if (!c || !string(c.id, 30) || !string(c.name, 60) || !integer(c.age) || !integer(c.bornDay, c.adoptionArrivalDay !== undefined ? -10000000 : 0) || c.adoptionArrivalDay !== undefined && (!integer(c.adoptionArrivalDay) || state && c.adoptionArrivalDay > state.day) || state && c.bornDay > state.day || c.alive !== undefined && typeof c.alive !== 'boolean' || c.deathDay !== undefined && (!integer(c.deathDay) || c.alive !== false || state && c.deathDay > state.day)) return false;
  if (!Array.isArray(v.goals) || v.goals.length > 4 || new Set(v.goals.map(g => g.id)).size !== v.goals.length || !v.goals.every(g => GOALS[g.id] && string(g.label, 200) && integer(g.progress, 0, g.target) && g.target === GOALS[g.id].target && typeof g.completed === 'boolean')) return false;
  if (!Array.isArray(v.achievements) || v.achievements.length > 10 || !v.achievements.every(a => string(a.id, 100) && string(a.label, 200) && integer(a.day))) return false;
  if (!Array.isArray(v.yearHistory) || v.yearHistory.length > 300 || new Set(v.yearHistory.map(y => y.id)).size !== v.yearHistory.length || !v.yearHistory.every(y => string(y.id, 100) && integer(y.age, 18) && integer(y.day) && YEAR_FOCI.some(f => f.id === y.focus) && integer(y.income) && integer(y.expenses) && string(y.title, 200) && string(y.summary))) return false;
  const events = lifeEventIds();
  if (!Array.isArray(v.eventHistory) || v.eventHistory.length > 160 || !v.eventHistory.every(e => events[e.id]?.includes(e.choice) && integer(e.day))) return false;
  const familyRecord = e => {
    if (!['care', 'curiosity', 'courage'].includes(e.choice) || !string(e.event, 200)) return false;
    const child = /^family_(small_child|school_child|teen_child|adult_child)_(child-[1-3])$/.exec(e.event);
    if (child) return !state || state.revision >= 5 && v.children.some(c => c.id === child[2]);
    const contact = /^family_(partner_time|elder_care)_([a-z][a-z0-9_-]*)$/.exec(e.event);
    if (contact) return !state || state.revision >= 5 && v.people.some(p => p.id === contact[2] && (contact[1] === 'elder_care' ? ['parent', 'guardian'].includes(p.familyRole) : p.role !== 'relative' && !p.familyRole));
    const widow = /^family_widow_memory_(.+)$/.exec(e.event);
    return Boolean(widow && (!state || state.revision >= 5 && state.lineage?.unions.some(u => u.partnerId === widow[1] && u.endReason === 'widowed')));
  };
  if (!Array.isArray(v.yearlyDecisions) || v.yearlyDecisions.length > 120 || !v.yearlyDecisions.every(e => (events[e.event]?.includes(e.choice) || familyRecord(e)) && integer(e.day) && (!state || e.day <= state.day))) return false;
  if (typeof v.householdSupport !== 'boolean' || !(v.pendingEvent === null || v.pendingEvent && (ids.has(v.pendingEvent.personId) || events[v.pendingEvent.eventId]))) return false;
  if (state && ['life_separation', 'life_courtship_end'].includes(state.event?.id)) {
    const target = state.event.id === 'life_separation' ? v.partnerId : v.courtshipId;
    if (state.age < 18 || !target || v.pendingEvent?.personId !== target || !v.people.some(p => p.id === target && p.alive !== false && p.role !== 'relative' && !p.familyRole && p.age >= 18)) return false;
  }
  if (v.plan !== null) {
    const p = v.plan;
    if (!p || !string(p.id, 100) || !integer(p.startDay) || !integer(p.targetDay, p.startDay + 1) || p.targetDay % 365 !== 0 || !integer(p.nextDecisionDay, p.startDay) || !integer(p.income) || !integer(p.expenses) || !integer(p.steps)) return false;
    if (!YEAR_FOCI.some(f => f.id === p.focus) || !LIFESTYLES.some(l => l.id === p.lifestyle) || !Array.isArray(p.decisions) || p.decisions.length > 30 || !p.decisions.every(d => string(d, 1000))) return false;
    if (![p.earnedAccrual, p.expenseAccrual, p.incomePaid, p.expensesPaid].every(n => bounded(n)) || !string(p.pausedReason, 500)) return false;
    if (state && p.startDay > state.day) return false;
  }
  return true;
}

export function validateLife(value, state) {
  try { return validLife(value, state); } catch { return false; }
}
