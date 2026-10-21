import { closedLifePersonalNotes, validHistoryPersonalNotes } from './personal-notes.js';
import { isIronman, validateIronman, currentIronmanPerson, ironmanCombatStopped } from './ironman.js';
import { adultChildLifeView, adultChildChoiceOutcome, adultChildGoalText, adultChildOwnMemory } from './adult-child-view.js';
import { familyVisitReason } from './household-residence.js';
import { validateAdultChildLife, introduceAdultChildLife, advanceAdultChildLife, respondAdultChildLife, hearAdultChildMilestone, adultChildInheritance } from './adult-child-livelihoods.js';
import { synchronizeMentorContinuity } from './npc-continuity.js';
import { inheritTakenProperties } from './silver-property.js';
import { inheritCartography } from './cartography.js';
import { seededRoll, generatePersonName, isSettlement } from './world.js';
import { normalizeAppearance, isCanonicalAppearance, AVATAR_OPTIONS } from './avatar.js';
import { generateCharacter } from './characters.js';
import { normalizePreferences, PREFERENCE_OPTIONS } from './preferences.js';
import { initializeHealth } from './health.js';
import { initializeTravel } from './travel.js';
import { resetCareerForSuccessor } from './careers.js';
import { initializeHouseholdBudget } from './budget.js';
import { heirStation } from './station.js';
import { inheritCommunity, communitySupport } from './community.js';
import { inheritSociety } from './society.js';
import { inheritSocial } from './social.js';
import { inheritPastimes } from './pastimes.js';
import { initializeFamilyDepth } from './household.js';
import { inheritFellowship } from './fellowship.js';
import { initializeSanctuaries } from './sanctuaries.js';

const YEAR = 365;
const SKILLS = ['weapons', 'defense', 'arcana', 'devotion', 'stealth', 'survival', 'scholarship', 'persuasion'];
const TRAITS = ['care', 'curiosity', 'courage'];
const clamp = n => Math.max(0, Math.min(100, n));
const clone = value => structuredClone(value);
const opt = (id, label, description) => ({ id, label, description });
const blocked = s => Boolean(s.event || s.battle || s.conversations?.pending || s.dungeon || s.timeline?.journey || s.workshop?.project || s.careers?.batch);
const living = p => p && p.alive !== false;
const ageOf = (s, p) => p.bornDay === null ? null : Math.max(0, Math.floor(((p.alive === false && Number.isSafeInteger(p.deathDay) ? p.deathDay : s.day) - p.bornDay) / YEAR));
const heroBirth = s => Number.isSafeInteger(s.timeline?.birthDay) ? s.timeline.birthDay : s.timeline?.mode === 'birth' ? 0 : -18 * YEAR;
const findPerson = (s, source, localId) => s.lineage?.people.find(p => p.source === source && p.localId === localId);
const childRecord = (s, id) => findPerson(s, 'child', id);
const actualChild = (s, id) => s.life.children.find(c => c.id === id && c.alive !== false);
const atSettlement = s => isSettlement(s.world, s.locationId);
const deathAge = (s, id, age, ancestry = 'human') => {
  const base = ({ elf: 145, dwarf: 105, gnome: 110, halfling: 90 })[ancestry] || 76;
  return Math.max(age + 8, base + seededRoll(s.seed, `lineage-lifespan-${id}`, 19));
};
const developmentalRecord = () => ({ traits: { care: 0, curiosity: 0, courage: 0 }, skills: Object.fromEntries(SKILLS.map(k => [k, 0])), education: { route: null, attendance: 0, qualifications: [] }, history: [] });
function addPerson(s, source, localId, name, bornDay, alive = true, parentIds = []) {
  const existing = findPerson(s, source, localId);
  if (existing) return existing;
  const id = `${s.dynasty.id}-g${s.dynasty.generation}-${source}-${localId}`;
  const age = bornDay === null ? 0 : Math.max(0, Math.floor((s.day - bornDay) / YEAR));
  const actual = source === 'hero' ? s.hero : source === 'life' ? s.life.people.find(p => p.id === localId) : source === 'companion' ? s.companions.find(p => p.id === localId) : null;
  const ancestry = actual?.appearance?.ancestry || (source === 'child' ? s.hero.appearance?.ancestry : 'human');
  const p = { id, source, localId, name, bornDay: bornDay === 0 ? 0 : bornDay, alive, deathAge: bornDay === null ? null : deathAge(s, id, age, ancestry), deathDay: null, parentIds: [...parentIds] };
  if (source === 'child') p.development = developmentalRecord();
  s.lineage.people.push(p);
  return p;
}
export function registerChild(s, child, { welcome = false, newArrival = false, adopted, ownAppearance, ownPronouns, ownPreferences, priorDevelopment, adoptionBackground, recordPartner = true } = {}) {
  if (!s.lineage || !s.dynasty) return null;
  const parents = [s.dynasty.activePersonId];
  const partner = s.life.people.find(p => p.id === s.life.partnerId && living(p));
  if (recordPartner && partner && (welcome || partner.bond >= 65)) {
    const record = findPerson(s, 'life', partner.id);
    if (record) parents.push(record.id);
  }
  const p = addPerson(s, 'child', child.id, child.name, child.bornDay, child.alive !== false, parents);
  if (!p.development) p.development = developmentalRecord();
  if (typeof adopted === 'boolean') p.adopted = adopted;
  if (p.adopted === undefined) {
    const arrival = s.journal?.find(j => j.text?.includes(`${child.name} joined your household`));
    p.adopted = welcome ? false : arrival ? arrival.text.includes('through adoption') : null;
  }
  if (!p.appearance) {
    const legacyAppearance = newArrival && p.adopted === true
      ? Object.fromEntries(AVATAR_OPTIONS.filter(f => ['ancestry', 'skin', 'hair', 'hairStyle', 'eyes', 'face', 'build'].includes(f.key)).map(f => [f.key, f.options[seededRoll(s.seed, `adoptee-${p.id}-${f.key}`, f.options.length)].value]))
      : { ...s.hero.appearance, hair: ['chestnut', 'black', 'gold', 'silver', 'red'][seededRoll(s.seed, `child-hair-${p.id}`, 5)], eyes: ['hazel', 'brown', 'blue', 'green', 'grey'][seededRoll(s.seed, `child-eyes-${p.id}`, 5)] };
    if(newArrival && (s.flags?.portraitGeneration===1 || s.hero.appearance?.heritageVersion===1)){
      const familyAppearance=p.adopted===true?undefined:partner?.appearance&&seededRoll(s.seed,`child-parent-${p.id}`,2)?partner.appearance:s.hero.appearance;
      const identity=generateCharacter(s.seed,`child-identity-${p.id}`,{role:'child',age:child.age,familyAppearance});
      p.appearance=identity.appearance;p.pronouns=identity.pronouns;child.pronouns=identity.pronouns;
    } else p.appearance = normalizeAppearance(legacyAppearance);
    if (newArrival) p.deathAge = deathAge(s, p.id, child.age, p.appearance.ancestry);
  }
  if (newArrival && !p.preferences) p.preferences = normalizePreferences(Object.fromEntries(PREFERENCE_OPTIONS.map(f => [f.key, f.options[seededRoll(s.seed, `child-taste-${p.id}-${f.key}`, f.options.length)].value])));
  if (ownAppearance) { p.appearance = normalizeAppearance(ownAppearance); p.deathAge = deathAge(s, p.id, child.age, p.appearance.ancestry); }
  if(['they/them','she/her','he/him'].includes(ownPronouns)){p.pronouns=ownPronouns;child.pronouns=ownPronouns;}
  if (ownPreferences) p.preferences = normalizePreferences(ownPreferences);
  if (priorDevelopment) p.development = clone(priorDevelopment);
  if (adoptionBackground) p.adoptionBackground = clone(adoptionBackground);
  return p;
}

export function initializeAdoptionDepth(s) {
  if (s.lineage && !s.lineage.adoption) s.lineage.adoption = { version: 1, nextCandidate: 1, candidates: [], preparation: null, history: [] };
}
const adoptionAge = (s, c) => Math.max(0, Math.floor((s.day - c.bornDay) / YEAR));
function adoptionReason(s) {
  if (s.age < 18) return 'Offering a permanent home is an adult decision.';
  if (!atSettlement(s)) return 'Meet a guardian in a surviving settlement.';
  if (s.life.children.length >= 3) return 'The household is already caring for three recorded children.';
  if (s.life.home.tier === 'lodgings') return 'Establish a cottage or larger before offering a permanent home.';
  if (s.life.health < 40) return 'Recover to 40 health before expanding the household.';
  return null;
}
function makeAdoptionCandidate(s, requestedAge) {
  const a = s.lineage.adoption;
  const prior = a.candidates.find(c => c.requestedAge === requestedAge && c.status === 'waiting' && adoptionAge(s,c) < 18);
  if (prior) return prior;
  const sequence = a.nextCandidate++;
  const id = `adoptee-g${s.dynasty.generation}-${requestedAge}-${sequence}`, salt = `${id}-${s.day}`;
  const identity=s.flags?.portraitGeneration===1?generateCharacter(s.seed,`adoption-identity-${salt}`,{role:'child',age:requestedAge}):null;
  const appearance = identity?.appearance || normalizeAppearance(Object.fromEntries(AVATAR_OPTIONS.filter(f => ['ancestry','skin','hair','hairStyle','eyes','face','build'].includes(f.key)).map(f => [f.key,f.options[seededRoll(s.seed, `${salt}-${f.key}`, f.options.length)].value])));
  const preferences = normalizePreferences(Object.fromEntries(PREFERENCE_OPTIONS.map(f => [f.key,f.options[seededRoll(s.seed, `${salt}-${f.key}`, f.options.length)].value])));
  const circumstances = ['Their birth parents died during a recorded regional flood; a named shelter keeper has cared for them since.', 'Their birth parents are missing. Their identity is kept in the shelter register; adoption will not invent a death or erase earlier ties.', 'Their previous guardian died. They want a steady household while keeping the friendships and learning they already have.'];
  const circumstance = circumstances[seededRoll(s.seed, `${salt}-circumstance`, circumstances.length)];
  const d = developmentalRecord();
  d.traits.curiosity = requestedAge >= 12 ? 2 : 1; d.traits.care = seededRoll(s.seed, `${salt}-care`, 3);
  d.skills.scholarship = requestedAge >= 12 ? 3 : 1; d.skills.survival = requestedAge >= 16 ? 4 : requestedAge >= 12 ? 2 : 0; d.skills.persuasion = requestedAge >= 12 ? 2 : 0;
  // Prior attended learning is real background, not an adoption reward.
  d.education.route = 'public'; d.education.attendance = requestedAge >= 16 ? 4 : requestedAge >= 12 ? 3 : 1;
  const c = { id, requestedAge, name: generatePersonName(s.seed, salt,{appearance,pronouns:identity?.pronouns}), bornDay: s.day - requestedAge * YEAR - seededRoll(s.seed, `${salt}-birthday`, 365), appearance, ...(identity?{pronouns:identity.pronouns}:{}), preferences, circumstance, guardianName: `Keeper ${generatePersonName(s.seed, `${salt}-guardian`)}`, locationId: s.locationId, introducedDay: s.day, listenedDay: null, lastSupportDay: null, consent: null, openToHome: seededRoll(s.seed, `${salt}-readiness`, 5) !== 0, status: 'waiting', development: d };
  a.candidates.push(c); a.candidates = a.candidates.slice(-12); return c;
}
function adoptionEvent(s, c, ctx) {
  const listened = Number.isSafeInteger(c.listenedDay);
  s.lineage.pending = { type: 'adoption', personId: c.id };
  ctx.setEvent('lineage_adoption', `${c.name}, before any promise`, 'An older child’s own wishes', `${c.name} is ${adoptionAge(s,c)}, with their own ${c.appearance.ancestry} appearance, name and earlier learning. ${c.circumstance} ${c.guardianName} is present. ${listened ? c.consent ? `${c.name} says they would welcome your offer, provided they can keep their own name, friends, and learning. Their agreement is recorded; you must still prepare the home.` : `${c.name} asks to remain with their current guardian and friends. A permanent home cannot be forced by money or affection.` : 'Listen to the child before making an offer; meeting a guardian does not stand in for their agreement.'} ${s.life.partnerId ? 'Your existing partner remains an individual; this does not invent an agreement to become a second parent.' : 'A single parent can offer a permanent home.'}`, [ ...(!listened ? [opt('listen','Listen to the child and ask what they want','Spend two real days. Hear their own preferences and whether they consent; no child is added and no fee is charged.')] : []), ...(listened && c.consent && adoptionAge(s,c) < 18 ? [opt('offer','Offer the home they have agreed to consider','Spend three actual preparation days and 30 gold once the preparations finish. Preserve this child’s age, identity, prior skills, and original birth date.')] : []), ...(listened && (c.lastSupportDay === null || s.day-c.lastSupportDay>=30) ? [opt('support','Support their learning without changing their home','Spend two days and 10 gold once completed, at most once per thirty days. Respect their current household; no adoption, inheritance claim, or school qualification is created.')] : []), opt('wait','Respect their wishes and leave the question open','Keep the met child and their recorded wishes. No fee, new parent, or age reset.') ]);
}
function continueAdoptionPreparation(s, ctx) {
  const a = s.lineage.adoption, project = a.preparation;
  if (!project) return false;
  const reason = adoptionReason(s);
  if (reason) { s.notice = reason; return false; }
  const c = a.candidates.find(c => c.id === project.candidateId);
  if (!c || adoptionAge(s,c) >= 18) { a.preparation = null; s.notice = 'The young person is now an adult; the earlier wishes remain recorded, and no childhood adoption is made.'; return true; }
  const needed = project.stage === 'prepare' ? 3 : 2;
  if (project.stage === 'prepare' && s.hero.gold < 30 || project.stage === 'support' && s.hero.gold < 10) return false;
  const before = s.day; ctx.spendDays(needed - project.progress, {}); project.progress += s.day - before;
  if (s.phase === 'retired') { a.preparation = null; return true; }
  if (project.progress < needed) { s.notice = `${c.name}'s ${project.stage === 'prepare' ? 'home preparations' : project.stage === 'listen' ? 'listening time' : project.stage === 'support' ? 'learning support' : 'first meeting'} pause after ${project.progress} of ${needed} actual days. No child or fee has been added; resolve the calendar interruption, then continue or cancel.`; return true; }
  a.preparation = null;
  if (project.stage === 'meet') { c.introducedDay = s.day; adoptionEvent(s,c,ctx); return true; }
  if (project.stage === 'listen') {
    c.listenedDay = s.day; c.consent = c.openToHome;
    a.history.push({ day:s.day, candidateId:c.id, title:'The child’s own answer', text:`${c.name} said ${c.consent ? 'they would welcome a considered offer while keeping their own name and friendships' : 'they wanted to keep their current home'}. Their wishes were heard.` }); a.history = a.history.slice(-40);
    adoptionEvent(s,c,ctx); return true;
  }
  if (project.stage === 'support') {
    s.hero.gold -= 10; c.lastSupportDay=s.day; c.development.skills.scholarship++; c.development.history.push({day:s.day,title:'Learning supported without adoption',text:`You supported ${c.name}'s actual learning and respected their current household.`,choice:'support'}); c.development.history=c.development.history.slice(-60);
    journal(s,ctx,'Support without ownership',`You spent two actual days and 10 gold supporting ${c.name}'s learning. They remain in their own household; no child or qualification was added.`); return true;
  }
  if (!c.consent || s.life.children.length >= 3) return false;
  s.hero.gold -= 30;
  const child = { id:`child-${s.life.children.length+1}`,name:c.name,bornDay:c.bornDay,age:adoptionAge(s,c),adoptionArrivalDay:s.day };
  s.life.children.push(child); s.life.householdSupport = true; c.status='adopted';
  journal(s,ctx,'A home that welcomes an existing life',`${child.name} joined your household through adoption at age ${child.age}, after their freely given agreement. Their name, prior learning, friendships and original birth date remain their own.`);
  const p = registerChild(s,child,{newArrival:true,adopted:true,recordPartner:false,ownAppearance:c.appearance,ownPronouns:c.pronouns,ownPreferences:c.preferences,priorDevelopment:c.development,adoptionBackground:{arrivalDay:s.day,circumstance:c.circumstance,guardianName:c.guardianName,consentedDay:c.listenedDay}});
  p.development.history.push({day:s.day,title:'A consented permanent home',text:s.notice,choice:'adopt'});p.development.history=p.development.history.slice(-60);
  a.history.push({day:s.day,candidateId:c.id,title:'A consented permanent home',text:s.notice});a.history=a.history.slice(-40);
  familyMood(s,12,4); return true;
}
export function adoptionView(s) {
  const a=s.lineage?.adoption;
  return {enabled:Boolean(a),preparation:a?.preparation?clone(a.preparation):null,candidates:(a?.candidates||[]).map(c=>({id:c.id,name:c.name,age:adoptionAge(s,c),appearance:clone(c.appearance),preferences:c.listenedDay!==null?clone(c.preferences):null,circumstance:c.circumstance,guardianName:c.guardianName,consent:c.consent,status:c.status,learning:clone(c.development.education)})),history:clone(a?.history||[])};
}
export function recordPartnership(s) {
  if (!s.lineage || !s.life.partnerId) return;
  const p = findPerson(s, 'life', s.life.partnerId);
  if (p && !s.lineage.unions.some(u => u.partnerId === p.id && u.endedDay === null)) s.lineage.unions.push({ partnerId: p.id, startedDay: s.day, kind: 'pledge', endedDay: null, endReason: null });
}
export function registerWorldLifeRecord(s,p){if(!s.lineage||!p)return;const prior=s.lineage.people.find(r=>r.localId===p.id&&r.source==='companion'),record=addPerson(s,'life',p.id,p.name,p.bornDay,p.alive!==false);if(prior)record.deathAge=prior.deathAge;}
export function registerCompanionRecord(s,id){const p=s.companions.find(p=>p.id===id);if(s.lineage&&p&&!s.lineage.people.some(v=>v.source==='companion'&&v.localId===id))addPerson(s,'companion',p.id,p.name,Number.isSafeInteger(p.bornDay)?p.bornDay:-p.baseAge*YEAR,p.alive!==false);}
export function initializeLineage(s, { migration = false, startingAge = 0 } = {}) {
  if (!s.dynasty) s.dynasty = { id: `line-${seededRoll(s.seed, 'dynasty-id', 1000000)}`, generation: 1, activePersonId: '', history: [], inheritedFrom: null };
  if (s.lineage) return;
  s.lineage = { lastDay: s.day, people: [], unions: [], grief: [], nurtureUses: {}, pending: null, queue: [], heirId: null, heroDeath: null };
  const hero = addPerson(s, 'hero', 'hero', s.hero.name, heroBirth(s));
  // A newly generated elder has already survived to their chosen opening age.
  // Match the same eight-year minimum horizon used when generating adult heirs.
  if(!migration && Number.isSafeInteger(startingAge) && startingAge>=0 && startingAge<=80)hero.deathAge=Math.max(hero.deathAge,startingAge+8);
  s.dynasty.activePersonId = hero.id;
  for (const p of s.life.people) {
    const born = Number.isSafeInteger(p.bornDay) ? p.bornDay : -p.baseAge * YEAR;
    addPerson(s, 'life', p.id, p.name, born, p.alive !== false);
  }
  for (const p of s.companions || []) addPerson(s, 'companion', p.id, p.name, Number.isSafeInteger(p.bornDay) ? p.bornDay : -(p.baseAge || 0) * YEAR, p.alive !== false);
  for (const c of s.life.children) registerChild(s, c);
  for (const [index, m] of (s.family?.members || []).entries()) if (m.availability === 'deceased' && !m.personId) {
    addPerson(s, 'ancestor', `recorded-parent-${index}`, m.name, null, false);
  }
  hero.parentIds = (s.family?.members || []).flatMap((m, index) => {
    if (m.biological !== true || !m.relationship.includes('parent')) return [];
    const p = m.personId ? findPerson(s, 'life', m.personId) : findPerson(s, 'ancestor', `recorded-parent-${index}`);
    return p ? [p.id] : [];
  }).slice(0, 2);
  recordPartnership(s);
  // Imported histories have unknown dates. Existing death records remain records,
  // and a lifespan starts safely beyond the age at which this save was imported.
  if (migration) s.lineage.lastDay = s.day;
}
function descriptor(s, id, label, description, days = 0, cost = 0, reason) {
  return { id, label, description, days, cost, group: 'Family & legacy', ...(reason || s.hero.gold < cost ? { disabledReason: reason || `Requires ${cost} gold; you have ${s.hero.gold}.` } : {}) };
}
function nurtureReason(s, child) {
  if (!living(child)) return 'This child is remembered among the deceased.';
  const last = s.lineage.nurtureUses[child.id];
  return Number.isSafeInteger(last) && s.day - last < 30 ? `Make room for their own life. Shared care becomes available in ${30 - (s.day - last)} days.` : null;
}
export function lineageActions(s) {
  if (!s.lineage || blocked(s)) return [];
  if (s.phase === 'retired') return s.life.children.filter(living).map(c => descriptor(s, `lineage_continue_${c.id}`, `Continue as ${c.name}`, `Take up this actual child's life at age ${c.age}. The world stays on day ${s.day}; cash is divided among living children and the selected successor receives the recorded household property. Only their learned skills carry over.`));
  const actions = [];
  if(s.age>=6)for(const a of s.lineage.heirAccounts||[])if(a.readDay===null)actions.push(descriptor(s,'lineage_read_account_'+a.id,'Read '+a.personName+'’s unfinished account','An optional document from a real unfinished story. Reading grants knowledge of this account; it repeats no parent reward or commitment.'));
  const adoption = s.lineage.adoption;
  if (adoption?.preparation) {
    const p = adoption.preparation, c = adoption.candidates.find(c => c.id === p.candidateId);
    actions.push(descriptor(s,'lineage_adoption_continue',`Continue ${c?.name || 'the child'}'s ${p.stage === 'prepare' ? 'home preparations' : p.stage === 'listen' ? 'listening time' : p.stage === 'support' ? 'learning support' : 'first meeting'}`,'Complete the remaining actual days. The 30-gold preparation fee is charged only once a complete, consented home preparation finishes.',0,0,adoptionReason(s) || (p.stage === 'prepare' && s.hero.gold < 30 ? 'Keep 30 gold available to finish preparing the home.' : p.stage === 'support' && s.hero.gold < 10 ? 'Keep 10 gold available to finish the learning support.' : undefined)));
    actions.push(descriptor(s,'lineage_adoption_cancel','Pause these preparations without making a promise','Keep the child’s recorded identity and wishes. No new child, fee, or inherited claim is created.',0));
    return actions;
  }
  if (adoption) for (const age of [6,12,16]) actions.push(descriptor(s,`lineage_adoption_${age}`,`Meet a child around age ${age} with their guardian`,'Spend two real days meeting an existing young person. Listen before making an offer; adoption preserves their own appearance, name, original birth date, and prior learning. Single parents are welcome. No meeting fee.',2,0,adoptionReason(s)));
  const partner = s.life.people.find(p => p.id === s.life.partnerId && living(p));
  if (partner) actions.push(descriptor(s, 'lineage_marry', `Discuss marriage with ${partner.name}`, 'A wedding requires an existing freely agreed partnership and 70 bond. Commit publicly or keep your household pledge; neither person loses their own identity.', 2, 12, s.age < 18 ? 'Marriage is an adult decision.' : s.lineage.unions.some(u => u.partnerId === findPerson(s, 'life', partner.id)?.id && u.kind === 'marriage' && u.endedDay === null) ? 'You are already married to this partner.' : partner.bond < 70 ? 'Rebuild your mutual bond to 70 before making this commitment.' : !atSettlement(s) ? 'Meet your partner in a surviving settlement.' : undefined));
  if (s.age >= 18) for (const c of s.life.children.filter(living)) {
    const adult=childRecord(s,c.id)?.adultLife;
    if(c.age>=18 && (!adult || adult.response===null && adult.milestoneDay===null))actions.push(descriptor(s,`lineage_future_${c.id}`,`Hear ${c.name}'s own plans`,'Listen to this adult’s chosen work or free study goal. Offer an explicitly priced 20-gold start, listen without a financial promise, or explain a funding limit. Their identity is not yours to assign.',0,0,familyVisitReason(s,c)));
    if(adult?.status==='milestoneReady')actions.push(descriptor(s,`lineage_independence_${c.id}`,`Hear about ${c.name}'s independent life`,'A one-time return to their actual placement, learning and independent lodgings. Recall the support or financial boundary you really chose; no new funding request or deed.',0,0,familyVisitReason(s,c)));
    actions.push(descriptor(s, `lineage_nurture_${c.id}`, c.age >= 18 ? `Make time for ${c.name}'s adult life` : `Help ${c.name} grow`, 'Listen, explore, or practice together. The choice develops this child’s actual traits and skills, once per thirty days; it does not train the parent.', 2, 0, nurtureReason(s, c)));
    if (c.age >= 6 && c.age < 18) {
      actions.push(descriptor(s, `lineage_school_${c.id}`, `Discuss ${c.name}'s education`, 'Choose a free community or shrine school, or academy study from age twelve. A route gives access; actual lesson sessions earn skills and a qualification.', 1, 0, !atSettlement(s) ? 'School arrangements need a surviving settlement.' : undefined));
      const d = childRecord(s, c.id)?.development;
      actions.push(descriptor(s, `lineage_lesson_${c.id}`, `Support ${c.name}'s next school session`, 'One real session develops the chosen school skills. Six attended sessions earn a recorded school qualification; sessions become available every thirty days. An operating learning hall can cover the session fee.', 2, d?.education.route === 'academy' ? Math.max(0,4-communitySupport(s).schoolFeeDiscount) : 0, !d?.education.route ? 'Agree on a learning route first.' : !atSettlement(s) ? 'Lessons need a surviving settlement.' : Number.isSafeInteger(s.lineage.nurtureUses[`lesson-${c.id}`]) && s.day - s.lineage.nurtureUses[`lesson-${c.id}`] < 30 ? 'Allow thirty days between supported school sessions.' : undefined));
      if(s.education?.depthVersion===1)actions.push(descriptor(s,`lineage_project_${c.id}`,`Hear ${c.name}'s supervised school project`,'Spend four real days supporting this child’s practical inquiry, care project, or own preferred pursuit. Their skills and project memory develop; no parent skill or school certificate is granted.',4,0,!d?.education.route||d.education.attendance<2?'Two actual sessions in a chosen school open a supervised project.':!atSettlement(s)?'Meet at a surviving school settlement.':Number.isSafeInteger(s.lineage.nurtureUses[`project-${c.id}`])&&s.day-s.lineage.nurtureUses[`project-${c.id}`]<90?'Allow ninety days between these substantial projects.':undefined));
    }
    actions.push(descriptor(s, `lineage_heir_${c.id}`, `Name ${c.name} as your preferred successor`, 'Record who you hope will carry the household story. Living children still receive equal cash shares; the child you actually choose at the end receives the physical household estate.', 0, 0, s.lineage.heirId === c.id ? 'This is your recorded preference.' : undefined));
  }
  for (const g of s.lineage.grief.filter(g => !g.remembered)) actions.push(descriptor(s, `lineage_mourn_${g.personId}`, `Remember ${g.name}`, 'Choose a memorial, ask someone to listen, or keep a private remembrance. Grief changes wellbeing; taking time for it can ease its weight.', 2, 0));
  return actions;
}
const familyMood = (s, joy, stress) => { s.life.happiness = clamp(s.life.happiness + joy); s.life.stress = clamp(s.life.stress + stress); };
function journal(s, ctx, title, text,meta={}) { s.notice = text; ctx.journal(title, text, 'family',meta); }
export function applyLineageAction(s, id, ctx) {
  if (!s.lineage || !id.startsWith('lineage_') || blocked(s)) return false;
  if(id.startsWith('lineage_read_account_')){const a=s.lineage.heirAccounts?.find(a=>a.id===id.slice(21));if(!a||a.readDay!==null||s.age<6)return false;a.readDay=s.day;journal(s,ctx,'An unfinished family account',`${a.personName}’s account of ${a.storyId.replaceAll('_',' ')}: ${a.excerpt} This reading grants no earlier reward or obligation.`);return true;}
  if (id.startsWith('lineage_continue_')) {
    const childId = id.slice('lineage_continue_'.length);
    if (s.phase !== 'retired' || !actualChild(s, childId) || !ctx.createSuccessor) return false;
    const next = ctx.createSuccessor(childId);
    if (!next) return false;
    for (const key of Object.keys(s)) delete s[key]; Object.assign(s, next);
    return true;
  }
  if (s.phase === 'retired') return false;
  const adultMode=id.startsWith('lineage_future_')?'future':id.startsWith('lineage_independence_')?'independence':null;
  if(adultMode) {
    const c=actualChild(s,id.slice(`lineage_${adultMode}_`.length)),p=c&&childRecord(s,c.id);
    if(!c||!p||c.age<18||s.age<18||familyVisitReason(s,c))return false;
    const v=introduceAdultChildLife(s,p,{source:'conversation'});if(!v)return false;
    if(adultMode==='future'&&(v.response!==null||v.milestoneDay!==null)||adultMode==='independence'&&v.status!=='milestoneReady')return false;
    if(adultMode==='future'&&v.lastDay<s.day)advanceAdultChildLife(s,p,{oldDay:s.day,newDay:s.day});
    const view=adultChildLifeView(s,p);
    s.lineage.pending={type:adultMode,personId:c.id,sourcePersonId:p.id};
    if(adultMode==='future') {
      const fund=opt('fund','Provide the 20-gold start they requested','Spend 20 gold once on materials and lodgings preparation. Their independent-residence preparation becomes sixty rather than ninety eligible days. Their own chosen work or study remains unchanged.');
      if(s.hero.gold<20||v.residence||!isSettlement(s.world,v.destinationId))fund.disabledReason=s.hero.gold<20?'Keep 20 gold available for this optional support.':v.residence?'Their independent lodgings are already established.':'Their preparation needs an operating settlement.';
      ctx.setEvent('lineage_future',`${c.name}'s plan, not your assignment`,'An adult child’s chosen beginning',`${view.summary} ${view.educationEvidence} ${view.progress} They ask what support you can honestly offer, not which identity you will permit. No earlier years or income are invented.`,[fund,opt('listen','Listen without making a financial promise','Ask about their first weeks and what they want their work to serve. No gold is spent; their chosen path remains open.'),opt('decline','Explain that you cannot fund the start','Keep your money and an honest boundary. They keep their chosen direction; no failure or affection penalty is imposed.'),opt('leave','Leave the question for another conversation','No fee, new promise or change to their existing progress.')]);
    } else ctx.setEvent('lineage_independence',`${c.name} has an address of their own`,'A recorded independent beginning',`${view.progress} ${view.residence} ${view.support} They offer the news as a person with their own work and limits, not another holding in your estate.`,[opt('company','Hear the part of their first weeks they want to share','Accept company without claiming their work, home or every evening.'),opt('celebrate','Celebrate their own learning and effort','Keep the actual earlier support or financial boundary in the account. No new fee or inherited mastery.'),opt('space','Wish them well and let them choose the next invitation','Respect their independent address and keep a warm boundary around company.'),opt('leave','Keep the news for another conversation','Leave the milestone unread. No fee or reward is granted.')]);
    return true;
  }
  if (id.startsWith('lineage_adoption_')) {
    const a=s.lineage.adoption;
    if (!a || s.age < 18) return false;
    if (id === 'lineage_adoption_cancel') { if(!a.preparation)return false;a.preparation=null;journal(s,ctx,'Preparations paused without ownership','You paused the preparations. The child’s own wishes and actual earlier learning remain; no fee or adoption was made.');return true; }
    if (id === 'lineage_adoption_continue') return continueAdoptionPreparation(s,ctx);
    const age=Number(id.slice('lineage_adoption_'.length));
    if(![6,12,16].includes(age)||a.preparation||adoptionReason(s))return false;
    const c=makeAdoptionCandidate(s,age);a.preparation={stage:'meet',candidateId:c.id,requestedAge:age,progress:0};return continueAdoptionPreparation(s,ctx);
  }
  if (id === 'lineage_marry') {
    const p = s.life.people.find(p => p.id === s.life.partnerId && living(p));
    if (!p || s.age < 18 || p.bond < 70 || !atSettlement(s)) return false;
    s.lineage.pending = { type: 'marriage', personId: p.id };
    ctx.setEvent('lineage_marriage', 'The promise you make in daylight', 'Marriage', `${p.name} asks what marriage will mean in the life you have already shared. Work, convictions, and friendships remain your own. Twelve gold has paid for the meeting and modest preparations.`, [opt('vow', 'Make a mutual marriage vow', 'Become married partners; keep each person’s wishes and identity.'), opt('wait', 'Keep your household pledge for now', 'Remain committed partners without making a wedding vow.')]);
    return true;
  }
  if (id.startsWith('lineage_heir_')) {
    const c = actualChild(s, id.slice('lineage_heir_'.length));
    if (!c) return false;
    s.lineage.heirId = c.id; journal(s, ctx, 'A name in the family book', `You named ${c.name} as your preferred successor. Their choice and your other children’s cash shares still matter.`); return true;
  }
  if (id.startsWith('lineage_mourn_')) {
    const g = s.lineage.grief.find(g => g.personId === id.slice('lineage_mourn_'.length) && !g.remembered);
    if (!g) return false;
    s.lineage.pending = { type: 'bereavement', personId: g.personId };
    ctx.setEvent('lineage_bereavement', `The place ${g.name} leaves behind`, 'Loss & remembrance', `${g.name} died on day ${g.day}. A particular person is missing from your life; a number cannot replace them. There is room to grieve without abandoning the rest of your household.`, [opt('memorial', 'Make a place for their memory', 'Keep a named memorial and ease stress.'), opt('share', 'Ask a trusted person to sit with you', 'Seek companionship; the loss remains part of the family story.'), opt('private', 'Remember them in your own way', 'Keep a private memory and a boundary around your grief.')]);
    return true;
  }
  const mode = id.startsWith('lineage_nurture_') ? 'nurture' : id.startsWith('lineage_school_') ? 'school' : id.startsWith('lineage_lesson_') ? 'lesson' : id.startsWith('lineage_project_') ? 'project' : null;
  if (!mode) return false;
  const c = actualChild(s, id.slice(`lineage_${mode}_`.length)), p = c && childRecord(s, c.id);
  if (!c || !p?.development || s.age < 18) return false;
  const d = p.development;
  if(mode==='project') {
    const last=s.lineage.nurtureUses[`project-${c.id}`];
    if(s.education?.depthVersion!==1||c.age<6||c.age>=18||!d.education.route||d.education.attendance<2||!atSettlement(s)||Number.isSafeInteger(last)&&s.day-last<90)return false;
    s.lineage.pending={type:'project',personId:c.id};
    ctx.setEvent('lineage_project',`${c.name}'s work, in their own words`,'A child’s supervised project',`${c.name} has worked on ${d.education.route==='shrine'?'a garden-care plan for households who cannot reach the shrine':d.education.route==='academy'?'a safe model of a ward that must leave an infirmary door open':'a map of a route the youngest pupils can follow'}. They have ${d.education.attendance} attended sessions behind the work. ${p.adoptionBackground?'Their learning began before joining your household; that earlier life remains theirs. ':''}Their own favorite pursuit is ${p.preferences?.pursuit||'knowledge'}. Hear what they want the project to become, rather than turning it into a copy of your calling.`,[opt('inquiry','Help them test an unanswered question','This child practices scholarship and arcana, gains curiosity, and keeps their own project memory.'),opt('service','Help them ask the people the work will serve','This child practices persuasion and devotion, gains care, and keeps the participants’ wishes in the project.'),opt('own','Support the pursuit they actually prefer','Practice skills connected to this child’s own known interests; gain courage. It awards no class, parent skill, or certificate.')]);return true;
  }
  if (mode === 'lesson') {
    const route = d.education.route;
    if (!route || c.age < 6 || c.age >= 18 || !atSettlement(s)) return false;
    const last = s.lineage.nurtureUses[`lesson-${c.id}`];
    if (Number.isSafeInteger(last) && s.day - last < 30) return false;
    s.lineage.nurtureUses[`lesson-${c.id}`] = s.day;
    d.education.attendance++;
    for (const key of route === 'shrine' ? ['devotion', 'defense'] : route === 'academy' ? ['scholarship', 'arcana'] : ['scholarship', 'persuasion']) d.skills[key]++;
    if (d.education.attendance >= 6 && !d.education.qualifications.some(q => q.route === route)) d.education.qualifications.push({ id: `${route}-certificate`, label: `${route === 'public' ? 'Community literacy' : route === 'shrine' ? 'Shrine care' : 'Academy'} certificate`, route, day: s.day, age: c.age, grade: 70 });
    d.history.push({ day: s.day, title: 'A session actually attended', text: `${c.name} attended ${route} lessons and practiced its skills.`, choice: 'lesson' }); d.history = d.history.slice(-60);
    journal(s, ctx, 'A child’s own learning', `${c.name} completed a ${route} school session. These are their skills, not yours.`); return true;
  }
  if (mode === 'school' && (c.age < 6 || c.age >= 18 || !atSettlement(s)) || mode === 'nurture' && nurtureReason(s, c)) return false;
  s.lineage.pending = { type: mode, personId: c.id };
  if (mode === 'school') {
    const academyFee=Math.max(0,20-communitySupport(s).schoolFeeDiscount),lessonFee=Math.max(0,4-communitySupport(s).schoolFeeDiscount);
    s.lineage.pending.academyFee=academyFee;
    ctx.setEvent('lineage_school', `A school place for ${c.name}`, 'A child’s education', `${c.name} has questions and preferences of their own. Choosing a school route gives them a place to learn; it does not instantly award an education.`, [opt('public', 'Choose the free community school', 'Lessons practice reading, scholarship, and speaking with others.'), opt('shrine', 'Choose free shrine lessons', 'Lessons practice care, devotion, and protecting others.'), ...(c.age >= 12 ? [opt('academy', 'Arrange academy tuition', `Pay ${academyFee} gold now; future sessions currently cost ${lessonFee} gold.${academyFee<20?' An operating local learning hall funds the difference.':''}${s.hero.gold < academyFee ? ' You need more savings first.' : ''}`)] : []), opt('wait', 'Listen and leave the decision open', 'Choose no new route today; preserve any actual previous schooling.')]);
  } else {
    const body = c.age < 3 ? `${c.name} is learning whose voice brings comfort, what feels new, and how to try safely. Small, repeated care becomes the beginning of a character.` : c.age < 6 ? `${c.name} wants to take a familiar story in a new direction. You can share, ask questions, or explore together without deciding their whole future.` : c.age < 12 ? `${c.name} has disagreed with another child and asks you what to do. Their own choices should have a place beside your advice.` : c.age < 18 ? `${c.name} wonders whether the path everyone expects is really theirs. You can offer support, encourage their questions, or practice something unfamiliar together.` : `${c.name} brings news of their adult life. You can be part of it while letting their decisions belong to them.`;
    ctx.setEvent('lineage_childhood', `${c.name}, a person becoming`, 'Family & nurture', body, [opt('care', 'Listen, support, and make room for others', 'Develop care and persuasion; from six, practice devotion too.'), opt('curiosity', 'Investigate and learn together', 'Develop curiosity and scholarship; from six, practice arcana too.'), opt('courage', 'Try a careful new challenge together', 'Develop courage and survival; from ten, practice weapon discipline too.')]);
  }
  return true;
}
export function applyLineageChoice(s, eventId, choiceId, ctx) {
  if (!lineageEventIds()[eventId]?.includes(choiceId) || !s.lineage.pending) return false;
  const pending = s.lineage.pending;
  if(['lineage_future','lineage_independence'].includes(eventId)) {
    const c=s.life.children.find(c=>c.id===pending.personId),p=c&&childRecord(s,c.id),mode=eventId==='lineage_future'?'future':'independence';
    if(pending.type!==mode||!p||pending.sourcePersonId!==p.id||!p.adultLife)return false;
    if(choiceId==='leave'){s.lineage.pending=null;s.notice=adultChildChoiceOutcome(s,p,eventId,choiceId);return true;}
    if(!living(c)||c.age<18||s.age<18||familyVisitReason(s,c))return false;
    const text=adultChildChoiceOutcome(s,p,eventId,choiceId);if(!text)return false;
    if(mode==='future') {
      const result=respondAdultChildLife(s,p,choiceId);if(!result)return false;
      s.hero.gold-=result.cost;familyMood(s,choiceId==='listen'?4:2,-2);
    } else {if(!hearAdultChildMilestone(s,p,choiceId))return false;familyMood(s,choiceId==='space'?2:4,-2);}
    p.development.history.push({day:s.day,title:mode==='future'?'A parent heard an adult’s own plan':'An independent beginning, personally shared',text:adultChildOwnMemory(s,p,eventId,choiceId),choice:choiceId});p.development.history=p.development.history.slice(-60);
    s.notice=text;(ctx.journalLiteral||ctx.journal)(mode==='future'?'Their plan, and the help you actually offered':'Their own work and address',text,'family',{narrativeEdition:30,eventId:mode==='future'?'adult_child_response':'adult_child_milestone',personId:p.id,personName:p.name});s.lineage.pending=null;return true;
  }

  if(eventId==='lineage_project') {
    const c=actualChild(s,pending.personId),p=c&&childRecord(s,c.id),d=p?.development;
    if(pending.type!=='project'||!d||c.age<6||c.age>=18||s.education?.depthVersion!==1)return false;
    const pursuit=p.preferences?.pursuit||'knowledge';
    const skills=choiceId==='inquiry'?['scholarship','arcana']:choiceId==='service'?['persuasion','devotion']:({knowledge:['scholarship','arcana'],craft:['survival','scholarship'],nature:['survival','defense'],combat:['weapons','defense'],community:['persuasion','devotion'],trade:['persuasion','scholarship']})[pursuit];
    for(const key of skills)d.skills[key]+=2;const practicalSupport=choiceId==='own'&&['craft','nature'].includes(pursuit)?communitySupport(s).schoolPreparationBonus:0;if(practicalSupport)d.skills.survival+=practicalSupport;d.traits[choiceId==='inquiry'?'curiosity':choiceId==='service'?'care':'courage']++;
    s.lineage.nurtureUses[`project-${c.id}`]=s.day;
    journal(s,ctx,'A project in the child’s own record',`${c.name} presented their ${d.education.route} school project through ${choiceId==='own'?`their own interest in ${pursuit}`:choiceId==='service'?'a conversation with the people it served':'an honest investigation'}. Their ${skills.join(' and ')} grew; no parent skill, class, or certificate was awarded.`);
    d.history.push({day:s.day,title:'A supervised project, personally chosen',text:s.notice,choice:choiceId});d.history=d.history.slice(-60);s.lineage.pending=null;return true;
  }
  if(eventId==='lineage_adoption') {
    const a=s.lineage.adoption,c=a?.candidates.find(c=>c.id===pending.personId);
    if(pending.type!=='adoption'||!c||a.preparation||adoptionReason(s))return false;
    if(choiceId==='wait'){s.lineage.pending=null;journal(s,ctx,'The child’s wishes remain their own',`You kept ${c.name}'s identity and ${c.listenedDay!==null?'recorded answer':'unanswered question'} in the record. No new parent, fee, or childhood was invented.`);return true;}
    if(choiceId==='listen'&&c.listenedDay!==null||choiceId==='offer'&&(!c.consent||c.listenedDay===null||s.hero.gold<30)||choiceId==='support'&&(c.listenedDay===null||s.hero.gold<10||Number.isSafeInteger(c.lastSupportDay)&&s.day-c.lastSupportDay<30))return false;
    s.lineage.pending=null;a.preparation={stage:choiceId==='offer'?'prepare':choiceId,candidateId:c.id,requestedAge:c.requestedAge,progress:0};return continueAdoptionPreparation(s,ctx);
  }
  if (eventId === 'lineage_marriage') {
    const p = s.life.people.find(p => p.id === pending.personId && p.id === s.life.partnerId && living(p));
    if (pending.type !== 'marriage' || !p || p.bond < 70 || s.age < 18) return false;
    if (choiceId === 'vow') {
      recordPartnership(s);
      const union = s.lineage.unions.find(u => u.partnerId === findPerson(s, 'life', p.id)?.id && u.endedDay === null);
      if (!union || union.kind === 'marriage') return false;
      union.kind = 'marriage'; union.marriedDay = s.day;
      p.memories.push('We freely made a mutual marriage vow.'); p.memories = p.memories.slice(-30); p.bond = clamp(p.bond + 5); familyMood(s, 10, -6);
    }
    journal(s, ctx, choiceId === 'vow' ? 'A marriage, freely chosen' : 'A pledge kept without a wedding', `You and ${p.name} ${choiceId === 'vow' ? 'made a mutual marriage vow' : 'kept your committed partnership and chose to wait'}.`);
  } else if (eventId === 'lineage_bereavement') {
    const g = s.lineage.grief.find(g => g.personId === pending.personId && !g.remembered);
    if (pending.type !== 'bereavement' || !g) return false;
    g.remembered = true; g.choice = choiceId; familyMood(s, choiceId === 'share' ? 7 : 4, choiceId === 'memorial' ? -12 : -8);
    journal(s, ctx, `${g.name} is remembered`, `You ${choiceId === 'memorial' ? 'made a place for a memorial' : choiceId === 'share' ? 'shared a quiet remembrance with someone you trust' : 'kept a private remembrance'} of ${g.name}. Their death and their name remain in the family record.`);
  } else {
    const c = actualChild(s, pending.personId), p = c && childRecord(s, c.id);
    if (!c || !p?.development || s.age < 18) return false;
    const d = p.development;
    if (eventId === 'lineage_school') {
      const academyFee=pending.academyFee??20;
      if (pending.type !== 'school' || c.age < 6 || c.age >= 18 || choiceId === 'academy' && (c.age < 12 || s.hero.gold < academyFee)) return false;
      if (choiceId !== 'wait') {
        if (choiceId === 'academy') s.hero.gold -= academyFee;
        if (d.education.route !== choiceId) d.education.attendance = 0;
        d.education.route = choiceId;
      }
      journal(s, ctx, 'Education with an actual place', `${c.name} ${choiceId === 'wait' ? 'kept the question open' : `chose ${choiceId} schooling`}. Attended sessions and qualifications will record what they learn.`);
    } else {
      if (pending.type !== 'nurture' || nurtureReason(s, c)) return false;
      d.traits[choiceId]++; const skill = choiceId === 'care' ? 'persuasion' : choiceId === 'curiosity' ? 'scholarship' : 'survival';
      if (c.age >= 3) d.skills[skill]++;
      if (c.age >= (choiceId === 'courage' ? 10 : 6)) d.skills[choiceId === 'care' ? 'devotion' : choiceId === 'curiosity' ? 'arcana' : 'weapons']++;
      s.lineage.nurtureUses[c.id] = s.day; familyMood(s, 4, -3);
      journal(s, ctx, 'The care that shapes a life', `You and ${c.name} made room for ${choiceId}. Their own ${choiceId} trait grew; their practiced skills are recorded for their future.`);
    }
    d.history.push({ day: s.day, title: eventId === 'lineage_school' ? 'A learning route considered' : 'A remembered day together', text: s.notice, choice: choiceId }); d.history = d.history.slice(-60);
  }
  s.lineage.pending = null;
  s.lineage.queue = s.lineage.queue.filter(q => !(q.eventId === eventId && q.personId === pending.personId));
  return true;
}
function death(s, record, ctx, actualDay=null) {
  record.alive = false; record.deathDay = actualDay ?? record.bornDay + record.deathAge * YEAR;
  const actual = record.source === 'life' ? s.life.people.find(p => p.id === record.localId) : record.source === 'child' ? s.life.children.find(p => p.id === record.localId) : record.source === 'companion' ? (s.companions || []).find(p => p.id === record.localId) : null;
  if (actual) { actual.alive = false; actual.deathDay = record.deathDay; actual.age = record.deathAge; if (record.source === 'companion') { actual.active = false; actual.recruited = false; } }
  for (const m of s.family?.members || []) if (m.personId === record.localId && record.source === 'life') m.availability = 'deceased';
  const widowed = record.source === 'life' && s.life.partnerId === record.localId;
  if (widowed) { s.life.partnerId = null; for (const u of s.lineage.unions) if (u.partnerId === record.id && u.endedDay === null) { u.endedDay = record.deathDay; u.endReason = 'widowed'; } }
  if (record.source === 'life' && s.life.courtshipId === record.localId) s.life.courtshipId = null;
  if (!s.lineage.grief.some(g => g.personId === record.id)) {
    s.lineage.grief.push({ personId: record.id, name: record.name, day: record.deathDay, untilDay: record.deathDay + YEAR, remembered: false });
    s.lineage.queue.push({ eventId: 'lineage_bereavement', personId: record.id });
    familyMood(s, widowed ? -20 : -10, widowed ? 18 : 10);
  }
  journal(s, ctx, widowed ? 'A partner’s empty place' : 'A named life ends', `${record.name} died at age ${ageOf(s, record)}. ${widowed ? 'You are widowed; your shared history remains, and a future relationship need not erase it.' : 'Their name, family ties, and remembered years remain in the record.'}`,{eventId:'person_died',personId:record.id,personName:record.name,personAge:ageOf(s,record)});
}
/** Accepted Ironman combat only: immutable current person, never a historical
 * local-ID match. The engine adds the matching casualty in the same cloned
 * acceptance boundary before exposing this state to a caller or persistence. */
export function killCurrentCompanionPerson(s, personId, cause, ctx = {}, actualDay = s.day) {
  if (!isIronman(s) || !validateIronman(s)) return false;
  const record = s.lineage.people.find(person => person.id === personId && person.source === 'companion');
  const actual = record && s.companions.find(person => person.id === record.localId);
  const stage = record && s.rpg?.companionStages?.[record.localId];
  if (!record || currentIronmanPerson(s, record.localId) !== record || record.alive !== true || !actual
      || actual.alive === false || actual.name !== record.name || actual.bornDay !== undefined && actual.bornDay !== record.bornDay
      || s.rpg && !stage || !Number.isSafeInteger(actualDay) || actualDay < s.ironman.startedDay
      || actualDay < record.bornDay || actualDay > s.day) return false;
  record.deathAge = Math.max(1, Math.floor((actualDay - record.bornDay) / YEAR));
  death(s, record, ctx, actualDay);
  actual.hp = 0;
  if (stage) { stage.status = 'dead'; stage.awayUntil = null; }
  ctx.journal?.('A combat death remembered', `${record.name}: ${cause}. Their death is permanent in this Ironman run.`, 'combat');
  return true;
}
export function killNamedPerson(s,localId,cause,ctx={},actualDay=s.day,wording=null){
  const record=s.lineage?.people.find(p=>(p.id===localId||p.localId===localId)&&p.alive);
  if(record){if(!Number.isInteger(actualDay)||actualDay<record.bornDay||actualDay>s.day)return false;record.deathAge=Math.max(1,Math.floor((actualDay-record.bornDay)/YEAR));death(s,record,ctx,actualDay);ctx.journal?.(wording?.title||'A violent death remembered',wording?.text||`${record.name}: ${cause}. The actual day and family ties remain.`,'condition');return true;}
  const p=s.society?.people.find(p=>p.id===localId&&p.alive!==false);if(!p)return false;p.alive=false;p.status='remembered';p.deathDay=s.day;p.memories||=[];p.memories.push(cause);ctx.journal?.('A named life ended',`${p.name}: ${cause}.`,'condition');return true;
}
export function onLineageTime(s, time, context) {
  const ctx = context || time;
  if (!s.lineage || s.day <= s.lineage.lastDay) return;
  const elapsed = s.day - s.lineage.lastDay; s.lineage.lastDay = s.day;
  for (const p of s.life.people) if (!findPerson(s, 'life', p.id)) addPerson(s, 'life', p.id, p.name, Number.isSafeInteger(p.bornDay) ? p.bornDay : -p.baseAge * YEAR, p.alive !== false);
  for (const c of s.life.children) registerChild(s, c);
  recordPartnership(s);
  for (const p of s.lineage.people) if (['life', 'child', 'companion', 'ancestor'].includes(p.source) && p.alive && p.bornDay !== null && ageOf(s, p) >= p.deathAge) death(s, p, ctx);
  // Recovery is elapsed-time based and cannot be farmed by pressing Continue.
  if (s.lineage.grief.some(g => !g.remembered && s.day >= g.untilDay)) {
    const recovery = Math.floor(s.day / 30) - Math.floor((s.day - elapsed) / 30);
    if (recovery > 0) familyMood(s, Math.min(3, recovery), -Math.min(3, recovery));
  }
}
export function flushLineageEvent(s, ctx) {
  if (!s.lineage || blocked(s) || s.phase === 'retired') return false;
  const next = s.lineage.queue.find(q => q.eventId === 'lineage_bereavement' && s.lineage.grief.some(g => g.personId === q.personId && !g.remembered));
  if (!next) return false;
  return applyLineageAction(s, `lineage_mourn_${next.personId}`, ctx);
}
export function completeLineageHistory(s, reason = 'retirement') {
  if (!s.dynasty || !s.lineage) return;
  const active = s.lineage.people.find(p => p.id === s.dynasty.activePersonId);
  const died = reason !== 'retirement';
  s.lineage.pending = null;
  if (died && active) { active.alive = false; active.deathDay = s.day; s.lineage.heroDeath = { day: s.day, cause: String(reason).slice(0, 500) }; }
  else if (active?.alive && active.deathAge <= s.age) active.deathAge = s.age + 8;
  if (!s.dynasty.history.some(h => h.personId === s.dynasty.activePersonId)) s.dynasty.history.push({ personId: s.dynasty.activePersonId, name: s.hero.name, generation: s.dynasty.generation, bornDay: heroBirth(s), endedDay: s.day, age: s.age, reason: died ? 'death' : 'retirement', cause: died ? String(reason).slice(0, 500) : '', chronicle: s.chronicle || '', inheritance: null });
}
export function lineageView(s) {
  if (!s.lineage) return { title: 'A family story', generation: 1, partner: null, children: [], deceased: [], history: [], grief: [], actions: [] };
  const partner = s.life.people.find(p => p.id === s.life.partnerId && living(p));
  const union = partner && s.lineage.unions.find(u => u.partnerId === findPerson(s, 'life', partner.id)?.id && u.endedDay === null);
  const children = s.life.children.map(c => { const p = childRecord(s, c.id); return { ...clone(c), alive: c.alive !== false, appearance: clone(p?.appearance || normalizeAppearance(s.hero.appearance)), preferences: clone(p?.preferences || c.preferences || s.hero.preferences), development: clone(p?.development || developmentalRecord()), adultLife:adultChildLifeView(s,p), preferred: s.lineage.heirId === c.id, inheritance: inheritanceFor(s, c.id)?.gold || 0 }; });
  return { title: 'The people who carry your story', generation: s.dynasty.generation, activePersonId: s.dynasty.activePersonId, partner: partner ? { id: partner.id, name: partner.name, bond: partner.bond, status: union?.kind === 'marriage' ? 'Married' : 'Committed partners' } : null, widowed: s.lineage.unions.some(u => u.endReason === 'widowed'), children, unrecordedParents:(s.family?.members || []).filter(m=>m.biological&&m.personId===null&&['unknown','missing'].includes(m.availability)).map(m=>({name:m.name,status:m.availability,relationship:m.relationship})), relatives: clone(s.lineage.people.filter(p => p.source === 'ancestor' && p.alive)), deceased: s.lineage.people.filter(p => !p.alive).map(p => ({ id: p.id, name: p.name, age: p.bornDay !== null && p.deathDay !== null ? Math.floor((p.deathDay - p.bornDay) / YEAR) : null, day: p.deathDay, relationship: p.source })), history: clone(s.dynasty.history), grief: clone(s.lineage.grief), actions: lineageActions(s), heroDeath: clone(s.lineage.heroDeath), heirId: s.lineage.heirId };
}
function inheritanceFor(s, childId) {
  const eligible = s.life.children.filter(living);
  if (!eligible.some(c => c.id === childId)) return null;
  const share = Math.floor(s.hero.gold / eligible.length);
  return { gold: share + (s.hero.gold % eligible.length), estateGold: s.hero.gold, shares: eligible.filter(c => c.id !== childId).map(c => ({ childId: c.id, name: c.name, gold: share })), homeTier: s.life.home.tier };
}
export function createSuccessor(original, childId, createBirthGame) {
  if (!original?.lineage || !original.dynasty || original.phase !== 'retired' || typeof createBirthGame !== 'function' || original.dynasty.history.length >= 200) return null;
  if (isIronman(original) && ironmanCombatStopped(original.battle)) return null;
  const child = actualChild(original, childId), record = child && childRecord(original, childId);
  if (!child || !record || !record.alive || !record.development) return null;
  const old = clone(original), inheritance = inheritanceFor(old, childId), generation = old.dynasty.generation + 1;
  const parentRecord = old.lineage.people.find(p => p.id === old.dynasty.activePersonId);
  const ownLife=adultChildInheritance(old,old.lineage.people.find(p=>p.id===record.id));
  const childAge = Math.max(0, Math.floor((old.day - child.bornDay) / YEAR));
  const start = createBirthGame({ name: child.name, pronouns:record.pronouns || child.pronouns, seed: old.seed, origin: old.hero.origin, station: old.householdBudget?.debt === undefined ? null : heirStation(old, `${old.seed}:heir:${generation}`, (record.appearance || old.hero.appearance)?.ancestry), household: inheritance.homeTier === 'estate' ? 'noble' : inheritance.homeTier === 'lodgings' ? 'poor' : 'tradesfolk', familySetup: 'single_parent', appearance: record.appearance || old.hero.appearance, difficulty: old.difficulty, belief: old.hero.belief, temperament: TRAITS.reduce((best, t) => record.development.traits[t] > record.development.traits[best] ? t : best, 'care') === 'curiosity' ? 'curious' : record.development.traits.courage > record.development.traits.care ? 'ambitious' : 'compassionate', preferences: record.preferences || child.preferences || old.hero.preferences });
  if (!start) return null;
  const s = clone(start);
  if (isIronman(old)) s.ironman = clone(old.ironman);
  s.revision = 5; s.day = old.day; s.age = childAge; s.phase = childAge >= 18 ? 'adult' : 'childhood'; s.event = null; s.battle = null; s.chronicle = null;
  s.timeline.birthDay = child.bornDay; s.timeline.contentVersion = 7; delete s.timeline.nextContentVersion; delete s.timeline.storybook; s.timeline.yearTarget = null; s.timeline.yearStartDay = s.day; s.timeline.yearHistory = []; s.timeline.activityUses = {}; s.timeline.childhoodFacts = {}; s.timeline.journey = null; s.timeline.lastJourney = null;
  s.hero.name = child.name; s.hero.gold = inheritance.gold; if (s.hero.station && childAge >= 18) s.hero.station.portionDay = s.day; s.hero.potions = old.hero.potions; s.hero.path = 'unformed'; s.hero.specialization = null; s.hero.condition = null; s.hero.profession = 'Unemployed';
  s.hero.attributes = Object.fromEntries(Object.keys(s.hero.attributes).map(k => [k, 3]));
  s.lineage.heirAccounts=(old.stories?.arcs||[]).filter(a=>a.status==='active').slice(0,8).map(a=>({id:a.id,storyId:a.id,personName:a.personName,sourceGeneration:old.dynasty.generation,excerpt:a.choices.at(-1)?.outcome||'The opening was heard, but no later agreement was completed.',readDay:null}));
  s.hero.upbringing={sourcePersonId:record.id,bornDay:record.bornDay,traits:clone(record.development.traits),skills:clone(record.development.skills),history:clone(record.development.history)};
  if(record.adultLife)s.hero.upbringing.adultLife=clone(record.adultLife);
  s.hero.skills = clone(record.development.skills); s.hero.level = 1; s.hero.exp = 0;
  s.hero.attributes.presence += Math.floor(record.development.traits.care / 3); s.hero.attributes.intellect += Math.floor(record.development.traits.curiosity / 3); s.hero.attributes.vitality += Math.floor(record.development.traits.courage / 3);
  s.hero.maxHp = 44 + s.hero.attributes.vitality * 3; s.hero.hp = s.hero.maxHp; s.hero.maxMp = 16 + s.hero.attributes.intellect * 3; s.hero.mp = s.hero.maxMp;
  s.world = clone(old.world); if(old.npcContinuity)s.npcContinuity=clone(old.npcContinuity);else delete s.npcContinuity; synchronizeMentorContinuity(s); s.lore = clone(old.lore); if (s.lore) s.lore.pending = null;
  if(old.realm){s.realm={...clone(old.realm),faithId:null,devotion:0,uses:{},petition:null};if(s.realm.politics)s.realm.politics.pending=null;}
  if(old.adventuring)s.adventuring={...clone(old.adventuring),season:Math.floor(s.day/92),contracts:[],runs:0,expedition:null,raid:null,claim:null};
  if (!inheritTakenProperties(old,s)) return null;
  s.workshop = clone(old.workshop);
  if (s.workshop) { s.workshop.project = null; s.workshop.crafting = 0; if(s.workshop.patterns)delete s.workshop.patterns; }
  s.careers = clone(old.careers);
  s.equipment = clone(old.equipment); if (childAge < 16) s.equipment.equipped = { weapon: null, armor: null, trinket: null };
  s.life.home = clone(old.life.home); s.life.children = []; s.life.partnerId = null; s.life.courtshipId = null; s.life.plan = null;
  const safeSite = id => s.world.locations.some(p => p.id === id && !['destroyed', 'evacuated'].includes(p.status) && p.servicesAvailable!==false);
  const childAddress=ownLife?.residence&&isSettlement(s.world,ownLife.residence.locationId)?ownLife.residence.locationId:null;
  s.locationId = [childAddress,old.life.home.locationId, old.locationId, 'camp', 'sanctuary', 'brook', 'city', 'home'].find(safeSite) || s.world.locations[0].id;
  s.hero.birthplaceId = s.locationId;
  if (old.campaign?.ending) {
    s.campaign = { ...s.campaign, act: 5, stage: 'complete', ending: clone(old.campaign.ending), completed: clone(old.campaign.completed), facts: { inheritedResolution: true, keeperActive: false }, decisions: [], pending: null, sidequests: {}, ageClues: [], followups: [], lastFollowupAge: childAge };
  }
  s.dynasty = clone(old.dynasty); s.dynasty.generation = generation; s.dynasty.inheritedFrom = old.dynasty.activePersonId; s.dynasty.activePersonId = record.id;
  for(const site of Object.values(s.realm?.sites||{}))if(site.owner==='hero'||site.owner===old.dynasty.activePersonId||old.dynasty.history.some(p=>p.personId===site.owner))site.owner=record.id;
  if(s.realm?.politics)for(const q of s.realm.politics.quests.filter(q=>q.ownerId===old.dynasty.activePersonId&&q.status==='active')){q.status='abandoned';q.endedDay=s.day;q.result='The earlier life ended before the work was finished. Its account remains in the family archive.';}
  completeLineageHistory(old, old.lineage.heroDeath?.cause || 'retirement'); s.dynasty.history = clone(old.dynasty.history);
  const closedNotes = closedLifePersonalNotes(old);
  const closedLife = s.dynasty.history.find(h => h.personId === old.dynasty.activePersonId);
  closedLife.inheritance = inheritance;
  if (closedNotes.personalNotes.length) closedLife.personalNotes = closedNotes.personalNotes;
  s.playerNotes = [];
  if (closedNotes.legacyPlayerNotes.length) s.legacyPlayerNotes = closedNotes.legacyPlayerNotes;
  s.lineage = { lastDay: s.day, people: clone(old.lineage.people).map(p => ({ ...p, source: 'ancestor' })), unions: [], grief: [], nurtureUses: {}, pending: null, queue: [], heirId: null, heroDeath: null };
  const active = s.lineage.people.find(p => p.id === record.id); active.source = 'hero'; active.localId = 'hero'; active.alive = true;
  const relative = (id, p, role, description, biological) => {
    const age = ageOf(s, p), member = { personId: id, name: p.name, relationship: role, availability: p.alive ? 'present' : 'deceased', biological };
    const priorMemories = p.source === 'life' ? clone(old.life.people.find(a => a.id === p.localId)?.memories || []) : [];
    const memories = priorMemories.filter(m => m.includes(child.name));
    if (!memories.length) memories.push(`You are part of ${child.name}'s actual recorded family.`);
    const source = p.source === 'life' ? old.life.people.find(a => a.id === p.localId) : null;
    const recordedHome=role==='sibling'?p.adultLife?.residence?.locationId||source?.locationId||old.life.home.locationId||old.hero.birthplaceId:null;
    const ownWork=p.adultLife?.work&&p.adultLife.work.introducedDay!==null?p.adultLife.goal.profession:p.adultLife?.study?.attendance?`${p.adultLife.study.route} student`:null;
    const actual = { ...(source ? clone(source) : {}), id, name: p.name, role: 'relative', familyRole: role === 'sibling' ? 'sibling' : role === 'guardian' ? 'guardian' : 'parent', relation: 'family', disposition: source?.disposition || 'kind', bornDay: p.bornDay, baseAge: Math.max(0, Math.floor((child.bornDay - (p.bornDay || 0)) / YEAR)), age: age || 0, bond: p.id===old.dynasty.activePersonId?(old.life.children.find(c=>c.id===childId)?.bond??65):Number.isInteger(source?.knownBondsByPerson?.[record.id])?source.knownBondsByPerson[record.id]:source?.id===childId?(source.bond??65):source?.id===old.life.partnerId?(old.conversations?.relationships?.[childId]?.bond??source.bond??65):65, memories, knownFacts: [], knownFactsByPerson: { ...clone(source?.knownFactsByPerson || {}), [old.dynasty.activePersonId]: clone(source?.knownFacts || []) }, memoriesByPerson: { ...clone(source?.memoriesByPerson || {}), [old.dynasty.activePersonId]: priorMemories }, alive: p.alive, ...(p.deathDay !== null ? { deathDay: p.deathDay } : {}), locationId: recordedHome||s.locationId, description, occupation: role==='sibling'&&ownWork?ownWork:source?.occupation || (role === 'sibling' ? 'young family member' : 'retired household member'), appearance: normalizeAppearance(source?.appearance || p.appearance || old.hero.appearance), ...(p.preferences ? { compatibility: { preferences: clone(p.preferences), known: [], history: [], lastDiscussionDay: null } } : {}) };
    const line = s.lineage.people.find(a => a.id === p.id); line.source = 'life'; line.localId = id;
    return { actual, member };
  };
  const biologicalParent = record.adopted === null ? null : record.adopted === false;
  const parent = relative('kin', parentRecord, 'parent', `${old.hero.name} is your actual ${old.lineage.heroDeath ? 'deceased' : 'retired'} parent. Their chronicle belongs to the dynasty.`, biologicalParent);
  s.life.people = s.life.people.filter(p => ['fellow', 'rival', 'river'].includes(p.id));
  for (const p of s.life.people) { p.name = generatePersonName(s.seed, `successor-peer-${generation}-${p.id}`,p); p.bornDay = child.bornDay - p.baseAge * YEAR; p.age = Math.max(0, Math.floor((s.day - p.bornDay) / YEAR)); p.locationId = s.locationId; }
  s.life.people.unshift(parent.actual); const members = [parent.member];
  const secondId = record.parentIds.find(id => id !== old.dynasty.activePersonId);
  const secondRecord = secondId && old.lineage.people.find(p => p.id === secondId);
  if (secondRecord) { const second = relative('family_parent', secondRecord, 'parent', 'Your other recorded parent, with a life and memories of their own.', biologicalParent); s.life.people.push(second.actual); members.push(second.member); }
  for (const [i, c] of old.life.children.filter(c => c.id !== childId).entries()) { const p = childRecord(old, c.id); if (p) { const biological = record.adopted === null || p.adopted === null ? null : record.adopted === false && p.adopted === false && record.parentIds.some(id => p.parentIds.includes(id)); const sibling = relative(`family_sibling_${i + 1}`, p, 'sibling', 'Your actual sibling shares this family history, with their own future.', biological); s.life.people.push(sibling.actual); members.push(sibling.member); } }
  if (childAge < 18 && !s.life.people.some(p => living(p) && ['parent', 'guardian'].includes(p.familyRole))) {
    const candidate = old.life.people.find(p => living(p) && p.age >= 18 && p.role !== 'relative') || old.life.people.find(p => living(p) && p.age >= 18);
    if (candidate) { const p = findPerson(old, 'life', candidate.id); const guardian = relative('family_guardian', p, 'guardian', 'This actual family contact agreed to care for you after your parents died.', false); s.life.people.push(guardian.actual); members.push(guardian.member); }
    else { const born = s.day - 35 * YEAR; const guardian = addPerson(s, 'life', 'family_guardian', generatePersonName(s.seed, `successor-guardian-${generation}`), born); const row = relative('family_guardian', guardian, 'guardian', 'A named shelter keeper cares for you without pretending to be your birth parent.', false); s.life.people.push(row.actual); members.push(row.member); }
  }
  s.family = { setup: 'legacy', housing: s.life.home.tier === 'lodgings' ? 'shelter' : 'secure', support: 55, members, history: [], pending: null, lastAge: childAge, interactionUses: {} };
  s.education = { route: null, schoolId: null, enrolled: false, year: 0, attendance: record.development.education.attendance, progress: record.development.education.attendance, performance: 50, scholarship: false, qualifications: record.development.education.qualifications.map(q => ({ ...clone(q), route: q.route === 'public' ? 'community' : q.route, id: `${q.route === 'public' ? 'community' : q.route}-certificate`, schoolId: `school-${q.route === 'public' ? 'community' : q.route}` })), history: [], pending: null, lastAge: childAge, lessonsThisYear: 0, attendanceThisYear: 0, preparationsThisYear: 0, examinedYear: null };
  if(ownLife?.study)Object.assign(s.education,clone(ownLife.study));
  if(old.education?.teachers)s.education.teachers=clone(old.education.teachers);
  if (s.education.qualifications.some(q => q.route === 'academy')) s.flags.certified = true;
  s.flags.childhoodStage = childAge >= 18 ? 3 : Math.min(2, Math.floor(childAge / 6)); s.flags.herbs = old.flags.herbs || 0;
  if(old.flags.dungeonRecords!==undefined)s.flags.dungeonRecords=clone(old.flags.dungeonRecords);else delete s.flags.dungeonRecords;
  if(old.flags.explorationVersion!==undefined)s.flags.explorationVersion=old.flags.explorationVersion;else delete s.flags.explorationVersion;
  for (const p of s.companions) { p.bornDay = child.bornDay - p.baseAge * YEAR; p.age = Math.max(0, Math.floor((s.day - p.bornDay) / YEAR)); p.name = generatePersonName(s.seed, `successor-companion-${generation}-${p.id}`,p); p.alive = true; p.active = false; p.recruited = false; }
  for (const p of s.life.people) if (!findPerson(s, 'life', p.id)) addPerson(s, 'life', p.id, p.name, p.bornDay, p.alive !== false);
  for (const p of s.companions) addPerson(s, 'companion', p.id, p.name, p.bornDay);
  s.journal = [...clone(old.journal), { id: `generation-${generation}-begins`, generation, day: s.day, age: s.age, title: 'An actual life carries the story onward', text: `${child.name} takes up the story at age ${childAge} on world day ${s.day}. ${inheritance.gold} gold and the recorded household property pass to them; ${inheritance.shares.length ? 'other living children receive their cash shares' : 'there are no other living child shares'}. Their own recorded learning remains. ${old.hero.name}'s chronicle is preserved in the dynasty; the changed world is the same world.`, tag: 'legacy' }];
  resetCareerForSuccessor(s, { journal(title, text, tag = 'career') { s.journal.push({ id: `generation-${generation}-career-inheritance`, generation, day: s.day, age: s.age, title, text, tag }); } },ownLife);
  if(ownLife) {
    const facts=ownLife.profession!=='Unemployed'?`${child.name}'s own ${ownLife.profession.toLowerCase()} introduction and ${ownLife.careerRecord.workedDays} recorded unpaid training days continue. No earlier wages or the parent's professional mastery are awarded.`:ownLife.study?`${child.name}'s ${record.adultLife.study.attendance} actual free-course sessions and distinct earlier school preparation continue. No new certificate or parent learning is awarded.`:`${child.name}'s plan to ${adultChildGoalText(ownLife.goal)} remains an intention, not a completed placement or invented wage.`;
    s.journal.push({id:`generation-${generation}-own-adult-beginning`,generation,day:s.day,age:s.age,title:'Their own beginning carries forward',text:facts,tag:'family',narrativeEdition:30,eventId:'child_livelihood_inherited',personId:record.id});
  }
  s.notice = `${child.name}'s life continues in the same world. No inherited oath, transformation, criminal evidence, or combat class follows them.`;
  initializeHealth(s, { reset: true }); initializeTravel(s, { reset: true });
  // An heir of a new-edition life stays in the new edition, debt ledger and all.
  initializeHouseholdBudget(s, { reset: true, edition: old.householdBudget?.debt !== undefined });
  if (s.fortune) s.fortune = { version: 1, lastSeason: Math.floor(s.day / 92), incomeFactor: 1, factorUntil: 0, history: [] };
  inheritCommunity(old,s); inheritSociety(old,s); inheritFellowship(old,s); initializeSanctuaries(s,{reset:true}); initializeFamilyDepth(s);
  inheritSocial(old,s); inheritPastimes(old,s);
  // A successor does not acquire private manuscripts, artistic preparation or personal recognition.
  delete s.repertoire;
  if(old.education?.depthVersion===1){s.education.depthStartedDay=old.education.depthStartedDay;s.education.teacherHistory=clone(old.education.teacherHistory);}
  for(const p of s.life.people)if(p.compatibility){p.compatibility.known=[];p.compatibility.history=[];p.compatibility.lastDiscussionDay=null;}
  inheritCartography(original,s);
  if(s.rpg)for(const c of Object.values(s.rpg.companionStages))if(!s.world.locations.some(p=>p.id===c.locationId))c.locationId=s.locationId;
  return s;
}
export function lineageEventIds() { return { lineage_marriage: ['vow', 'wait'], lineage_childhood: [...TRAITS], lineage_school: ['public', 'shrine', 'academy', 'wait'], lineage_bereavement: ['memorial', 'share', 'private'], lineage_adoption:['listen','offer','support','wait'], lineage_project:['inquiry','service','own'],lineage_future:['fund','listen','decline','leave'],lineage_independence:['company','celebrate','space','leave'] }; }
const obj = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const int = (n, low = 0, high = 100000000) => Number.isSafeInteger(n) && n >= low && n <= high;
const str = (v, max = 2000) => typeof v === 'string' && v.length <= max;
function validateAdoption(a,s) {
  if(!obj(a)||a.version!==1||!int(a.nextCandidate,1)||!Array.isArray(a.candidates)||a.candidates.length>12||new Set(a.candidates.map(c=>c?.id)).size!==a.candidates.length||!Array.isArray(a.history)||a.history.length>40)return false;
  for(const c of a.candidates) {
    if(!obj(c)||!str(c.id,80)||![6,12,16].includes(c.requestedAge)||!str(c.name,60)||!c.name.trim()||!int(c.bornDay,-10000000,s.day)||!str(c.circumstance,1000)||!str(c.guardianName,100)||!s.world.locations.some(l=>l.id===c.locationId)||!int(c.introducedDay,0,s.day)||!(c.listenedDay===null||int(c.listenedDay,c.introducedDay,s.day))||!(c.consent===null||typeof c.consent==='boolean')||typeof c.openToHome!=='boolean'||!['waiting','adopted'].includes(c.status))return false;
    if(c.listenedDay===null?c.consent!==null:c.consent===null)return false;
    if(!(c.lastSupportDay===null||int(c.lastSupportDay,c.introducedDay,s.day)))return false;
    if(!isCanonicalAppearance(c.appearance)||!obj(c.preferences)||Object.entries(normalizePreferences(c.preferences)).some(([k,v])=>c.preferences[k]!==v))return false;
    const d=c.development,e=d?.education;
    if(!obj(d)||!obj(d.traits)||!TRAITS.every(k=>int(d.traits[k],0,10000))||!obj(d.skills)||!SKILLS.every(k=>int(d.skills[k],0,10000))||!obj(e)||![null,'public','shrine','academy'].includes(e.route)||!int(e.attendance,0,10000)||!Array.isArray(e.qualifications)||e.qualifications.length>3||!Array.isArray(d.history)||d.history.length>60||!d.history.every(h=>obj(h)&&int(h.day,0,s.day)&&str(h.title,180)&&str(h.text,2000)&&str(h.choice,80)))return false;
  }
  if(!a.history.every(h=>obj(h)&&int(h.day,0,s.day)&&str(h.candidateId,80)&&str(h.title,180)&&str(h.text,2000)))return false;
  if(a.preparation!==null) {
    const p=a.preparation,c=a.candidates.find(c=>c.id===p?.candidateId);
    if(!obj(p)||!c||c.status!=='waiting'||!['meet','listen','prepare','support'].includes(p.stage)||p.requestedAge!==c.requestedAge||!int(p.progress,0,p.stage==='prepare'?2:1)||p.stage==='prepare'&&!c.consent||p.stage==='listen'&&c.listenedDay!==null||p.stage==='support'&&c.listenedDay===null)return false;
  }
  return true;
}
export function validateLineage(v, s) {
  try {
    if(v?.adoption!==undefined&&!validateAdoption(v.adoption,s))return false;
    if (!obj(v) || !obj(s.dynasty) || !str(s.dynasty.id, 80) || !s.dynasty.id || !int(s.dynasty.generation, 1, 200) || !str(s.dynasty.activePersonId, 160) || !(s.dynasty.inheritedFrom === null || str(s.dynasty.inheritedFrom, 160))) return false;
    if (!int(v.lastDay, 0, s.day) || !Array.isArray(v.people) || !v.people.length || v.people.length > 3000 || new Set(v.people.map(p => p.id)).size !== v.people.length) return false;
    for (const p of v.people) {
      if (!obj(p) || !str(p.id, 160) || !p.id || !['hero', 'life', 'child', 'companion', 'ancestor'].includes(p.source) || !str(p.localId, 80) || !str(p.name, 100) || !p.name.trim() || !(p.bornDay === null && p.source === 'ancestor' || int(p.bornDay, -10000000, s.day)) || typeof p.alive !== 'boolean' || !(p.deathAge === null && p.source === 'ancestor' || int(p.deathAge, 1, 5000)) || !(p.deathDay === null || int(p.deathDay, 0, s.day) && !p.alive) || !Array.isArray(p.parentIds) || p.parentIds.length > 2 || !p.parentIds.every(id => str(id, 160))) return false;
      if (p.development !== undefined) {
        const d = p.development, e = d?.education;
        if (!obj(d) || !obj(d.traits) || !TRAITS.every(k => int(d.traits[k], 0, 10000)) || !obj(d.skills) || !SKILLS.every(k => int(d.skills[k], 0, 10000)) || !obj(e) || ![null, 'public', 'shrine', 'academy'].includes(e.route) || !int(e.attendance, 0, 10000) || !Array.isArray(e.qualifications) || e.qualifications.length > 3 || new Set(e.qualifications.map(q => q?.route)).size !== e.qualifications.length || !e.qualifications.every(q => obj(q) && ['public', 'shrine', 'academy'].includes(q.route) && str(q.id, 100) && str(q.label, 120) && int(q.day, 0, s.day) && int(q.age, q.route === 'academy' ? 12 : 6, 1000) && int(q.grade, 60, 100)) || !Array.isArray(d.history) || d.history.length > 60 || !d.history.every(h => obj(h) && int(h.day, 0, s.day) && str(h.title, 180) && str(h.text, 2000) && str(h.choice, 80))) return false;
      }
      if (!validateAdultChildLife(p.adultLife,p,s)) return false;
      if (p.adopted !== undefined && p.adopted !== null && typeof p.adopted !== 'boolean') return false;
      if (p.appearance !== undefined && !isCanonicalAppearance(p.appearance)) return false;
      if (p.preferences !== undefined && (!obj(p.preferences) || Object.keys(p.preferences).length !== PREFERENCE_OPTIONS.length || Object.entries(normalizePreferences(p.preferences)).some(([key, value]) => p.preferences[key] !== value))) return false;
      if(p.adoptionBackground!==undefined&&(!obj(p.adoptionBackground)||p.adopted!==true||!int(p.adoptionBackground.arrivalDay,0,s.day)||!int(p.adoptionBackground.consentedDay,0,p.adoptionBackground.arrivalDay)||!str(p.adoptionBackground.circumstance,1000)||!str(p.adoptionBackground.guardianName,100)))return false;
      if (p.source === 'life' && !s.life.people.some(a => a.id === p.localId && a.name === p.name && (a.alive !== false) === p.alive)) return false;
      if (p.source === 'child' && !s.life.children.some(a => a.id === p.localId && a.name === p.name && a.bornDay === p.bornDay && (a.alive !== false) === p.alive) || p.source === 'child' && !p.development) return false;
      if (p.source === 'companion' && !s.companions.some(a => a.id === p.localId && a.name === p.name && (a.alive !== false) === p.alive)) return false;
    }
    const ids = new Set(v.people.map(p => p.id));
    const hero = v.people.find(p => p.id === s.dynasty.activePersonId && p.source === 'hero' && p.name === s.hero.name);
    if (v.people.filter(p => p.source === 'hero').length !== 1 || !hero || hero.bornDay !== heroBirth(s) || v.people.some(p => new Set(p.parentIds).size !== p.parentIds.length || p.parentIds.some(id => !ids.has(id) || id === p.id))) return false;
    for (const [source, actual] of [['life', s.life.people], ['child', s.life.children], ['companion', s.companions]]) if (actual.some(a => v.people.filter(p => p.source === source && p.localId === a.id).length !== 1)) return false;
    if (s.dynasty.inheritedFrom !== null && (!ids.has(s.dynasty.inheritedFrom) || s.dynasty.inheritedFrom === hero.id)) return false;
    if (!Array.isArray(v.unions) || v.unions.length > 100 || !v.unions.every(u => obj(u) && ids.has(u.partnerId) && int(u.startedDay, 0, s.day) && ['pledge', 'marriage'].includes(u.kind) && (u.endedDay === null ? u.endReason === null : int(u.endedDay, u.startedDay, s.day) && ['widowed', 'separation'].includes(u.endReason)) && (u.marriedDay === undefined || int(u.marriedDay, u.startedDay, s.day)))) return false;
    if (!Array.isArray(v.grief) || v.grief.length > 200 || new Set(v.grief.map(g => g?.personId)).size !== v.grief.length || !v.grief.every(g => obj(g) && v.people.some(p => p.id === g.personId && !p.alive && p.name === g.name && p.deathDay === g.day) && str(g.name, 100) && int(g.day, 0, s.day) && int(g.untilDay, g.day) && typeof g.remembered === 'boolean' && (g.choice === undefined || ['memorial', 'share', 'private'].includes(g.choice)))) return false;
    if (!obj(v.nurtureUses) || !Object.entries(v.nurtureUses).every(([id, day]) => /^(lesson-|project-)?child-[0-9]+$/.test(id) && int(day, 0, s.day))) return false;
    if (!(v.heirId === null || s.life.children.some(c => c.id === v.heirId)) || !(v.heroDeath === null ? hero.alive : obj(v.heroDeath) && !hero.alive && hero.deathDay === v.heroDeath.day && s.phase === 'retired' && int(v.heroDeath.day, 0, s.day) && str(v.heroDeath.cause, 500))) return false;
    const eventMap = { marriage: 'lineage_marriage', nurture: 'lineage_childhood', school: 'lineage_school', bereavement: 'lineage_bereavement', adoption:'lineage_adoption',project:'lineage_project',future:'lineage_future',independence:'lineage_independence' };
    if (!(v.pending === null || obj(v.pending) && Object.hasOwn(eventMap, v.pending.type) && str(v.pending.personId, 160))) return false;
    if (v.pending && s.event?.id !== eventMap[v.pending.type] || !v.pending && Object.values(eventMap).includes(s.event?.id)) return false;
    if (v.pending?.type === 'marriage' && (s.age < 18 || !s.life.people.some(p => p.id === v.pending.personId && p.id === s.life.partnerId && living(p) && p.bond >= 70))) return false;
    if (['nurture', 'school'].includes(v.pending?.type) && !actualChild(s, v.pending.personId)) return false;
    if(['future','independence'].includes(v.pending?.type)) {
      const c=s.life.children.find(c=>c.id===v.pending.personId),p=c&&childRecord(s,c.id);
      if(!c||!p?.adultLife||p.id!==v.pending.sourcePersonId||c.age<18||s.age<18)return false;
    }
    if(v.pending?.academyFee!==undefined&&!int(v.pending.academyFee,0,20))return false;
    if (v.pending?.type === 'school' && (s.age < 18 || actualChild(s, v.pending.personId).age < 6 || actualChild(s, v.pending.personId).age >= 18)) return false;
    if (v.pending?.type === 'bereavement' && !v.grief.some(g => g.personId === v.pending.personId && !g.remembered)) return false;
    if(v.pending?.type==='adoption'&&(!v.adoption||v.adoption.preparation||!v.adoption.candidates.some(c=>c.id===v.pending.personId&&c.status==='waiting')))return false;
    if(v.pending?.type==='project'&&(!actualChild(s,v.pending.personId)||actualChild(s,v.pending.personId).age<6||actualChild(s,v.pending.personId).age>=18||s.education?.depthVersion!==1))return false;
    if (!Array.isArray(v.queue) || v.queue.length > 200 || new Set(v.queue.map(q => q?.personId)).size !== v.queue.length || !v.queue.every(q => obj(q) && q.eventId === 'lineage_bereavement' && v.grief.some(g => g.personId === q.personId && !g.remembered))) return false;
    if (!Array.isArray(s.dynasty.history) || s.dynasty.history.length > 200 || new Set(s.dynasty.history.map(h => h?.personId)).size !== s.dynasty.history.length || !s.dynasty.history.every(h => obj(h) && validHistoryPersonalNotes(h) && ids.has(h.personId) && str(h.name, 100) && int(h.generation, 1, s.dynasty.generation) && int(h.bornDay, -10000000, s.day) && int(h.endedDay, 0, s.day) && int(h.age, 0, 5000) && ['death', 'retirement'].includes(h.reason) && str(h.cause, 500) && str(h.chronicle, 100000) && (h.inheritance === null || obj(h.inheritance) && int(h.inheritance.gold) && int(h.inheritance.estateGold) && ['lodgings', 'cottage', 'townhouse', 'estate'].includes(h.inheritance.homeTier) && Array.isArray(h.inheritance.shares) && h.inheritance.shares.length <= 2 && new Set(h.inheritance.shares.map(c => c.childId)).size === h.inheritance.shares.length && h.inheritance.shares.every(c => str(c.childId, 80) && str(c.name, 100) && int(c.gold)) && h.inheritance.gold + h.inheritance.shares.reduce((a, c) => a + c.gold, 0) === h.inheritance.estateGold))) return false;
    return true;
  } catch { return false; }
}
