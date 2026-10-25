import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeLife } from '../dist/js/life.js';
import { initializeSchooling } from '../dist/js/schooling.js';
import { initializeHousehold, householdActions, applyHouseholdAction, applyHouseholdChoice, householdEventIds, householdView, householdContext, educationTeacher, onHouseholdAge, validateHousehold, validateEducation } from '../dist/js/household.js';

function fixture(seed = 'a-family', setup = 'two_parents', age = 0, options = {}) {
  const s = { seed, age, day: age * 365, phase: age < 16 ? 'childhood' : 'adult', timeline: { mode: 'birth' }, locationId: 'home', world: generateWorld(seed, { expanded: true }), hero: { name: 'Rowan', origin: 'village', household: options.wealth || 'poor', path: 'unformed', specialization: null, profession: 'Unemployed', gold: 40, appearance: { ancestry: 'elf', hair: 'copper', skin: 'warm', hairStyle: 'long' }, skills: { scholarship: 0, arcana: 0, persuasion: 0, survival: 0, devotion: 0, defense: 0 } }, flags: {}, obligations: [], conversations: { threads: {}, relationships: {}, seen: [], pending: null }, companions: [], event: null, battle: null, dungeon: null };
  initializeLife(s);
  if (!options.skip) initializeHousehold(s, { config: { familySetup: setup } });
  // Every life has schooling (v0.72.3): this child is read with it, so past six it reads.
  if (!options.skip) initializeSchooling(s);
  return s;
}
function context(s) {
  return { journal(title, text, tag) { (s.journal ||= []).push({ title, text, tag, day: s.day }); }, setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; }, addObligation(id, title, days, description) { s.obligations.push({ id, title, description, dueDay: s.day + days, resolved: false }); }, finishObligation(id) { s.obligations.filter(o => o.id === id && !o.resolved).forEach(o => o.resolved = true); } };
}
function perform(s, id, ctx = context(s)) {
  const a = householdActions(s).find(a => a.id === id);
  assert.ok(a && !a.disabledReason, `${id} is usable: ${a?.disabledReason}`);
  const previousGold = s.hero.gold;
  s.hero.gold -= a.cost; s.day += a.days;
  assert.equal(applyHouseholdAction(s, id, ctx), true);
  assert.equal(s.hero.gold, previousGold - a.cost, 'generic descriptor fee is charged exactly once');
  return ctx;
}
function pick(s, id, ctx = context(s)) {
  const event = s.event;
  assert.ok(event.choices.some(c => c.id === id)); s.event = null;
  assert.equal(applyHouseholdChoice(s, event.id, id, ctx), true);
}
function ageTo(s, age, ctx = context(s)) {
  s.age = age; s.day = age * 365; s.phase = age < 16 ? 'childhood' : 'adult';
  for (const p of s.life.people) p.age = p.baseAge + age;
  onHouseholdAge(s, ctx);
}

test('all seeded and selected starts contain actual caregivers and appropriate absent-parent records', () => {
  const random = new Set();
  for (let n = 0; n < 50; n++) random.add(fixture(`family-${n}`, 'random').family.setup);
  assert.deepEqual(random, new Set(['two_parents', 'single_parent', 'orphan', 'homeless']));
  for (const setup of random) {
    const s = fixture('specific-start', setup);
    assert.equal(s.family.setup, setup);
    assert.equal(validateHousehold(s.family, s), true); assert.equal(validateEducation(s.education, s), true);
    const primary = s.life.people.find(p => p.id === 'kin');
    assert.equal(primary.alive, true);
    assert.equal(primary.familyRole, ['orphan', 'homeless'].includes(setup) ? 'guardian' : 'parent');
    if (['orphan', 'homeless'].includes(setup)) {
      assert.equal(s.life.people.some(p => p.familyRole === 'parent'), false);
      assert.equal(s.family.members.filter(m => m.relationship === 'birth parent').length, 2);
      assert.ok(s.family.members.filter(m => m.relationship === 'birth parent').every(m => m.personId === null && m.availability !== 'present'));
    }
    if (setup === 'two_parents') assert.equal(s.life.people.filter(p => p.familyRole === 'parent').length, 2);
  }
});

test('family setup is independent of wealth except homeless humble means, and siblings are named relatives', () => {
  for (const wealth of ['poor', 'tradesfolk', 'noble']) {
    const s = fixture('two-siblings', 'single_parent', 0, { wealth });
    assert.equal(s.hero.household, wealth); assert.equal(s.hero.gold, 40);
    assert.ok(s.life.people.filter(p => p.familyRole).every(p => p.role === 'relative' && p.relation === 'family'));
    assert.equal(new Set(s.life.people.map(p => p.name)).size, s.life.people.length);
  }
  const homeless = fixture('homeless', 'homeless', 0, { wealth: 'noble' });
  assert.equal(homeless.hero.household, 'poor'); assert.equal(homeless.hero.gold, 0); assert.equal(homeless.family.housing, 'unsheltered');
});

test('caregivers secure shelter for a homeless infant without player household management', () => {
  const s = fixture('shelter-child', 'homeless'), ctx = context(s), kinName = s.life.people.find(p => p.id === 'kin').name;
  assert.deepEqual(householdActions(s),[]);assert.equal(applyHouseholdAction(s,'family_shelter',ctx),false);
  onHouseholdAge(s,ctx);
  assert.equal(s.family.housing, 'shelter'); assert.equal(s.hero.gold, 0);
  assert.equal(s.life.people.find(p => p.id === 'kin').name, kinName);
  assert.equal(s.life.people.some(p => p.familyRole === 'parent'), false);
  assert.ok(!householdActions(s).some(a => a.id.startsWith('school_')));
});

test('an orphan’s caregiver is a real guardian and contextual dilemmas never revive missing parents', () => {
  const s = fixture('orphan-story', 'orphan', 7), ctx = context(s);
  perform(s, 'family_dilemma', ctx);
  const before = s.life.people.length;
  pick(s, 'ask', ctx);
  assert.equal(s.life.people.length, before);
  assert.equal(s.life.people.some(p => p.familyRole === 'parent'), false);
  assert.ok(s.life.people.find(p => p.id === 'kin').memories.length);
  assert.ok(householdContext(s).familySummary.includes('deceased'));
});

test('a community-school journey pays its year once and records enrollment, attendance, skills, dilemma and a qualification', () => {
  const s = fixture('free-school', 'homeless', 6), ctx = context(s);
  // The village school wants its year at enrolment (v0.64, every life's from v0.72.3): this child has it.
  s.hero.gold = 10;
  perform(s, 'family_shelter', ctx); perform(s, 'school_enroll_community', ctx); assert.equal(s.hero.gold, 0);
  for (let i = 0; i < 6; i++) perform(s, 'school_attend', ctx);
  assert.equal(s.education.attendance, 6); assert.equal(s.education.progress, 6);
  assert.equal(s.hero.skills.scholarship, 6); assert.equal(s.hero.skills.persuasion, 6);
  perform(s, 'school_dilemma', ctx); pick(s, 'ask', ctx);
  const teacher = educationTeacher(s);
  assert.ok(s.conversations.relationships[teacher.id].memories.length);
  ageTo(s, 10, ctx); s.hero.gold = 10; perform(s, 'school_attend', ctx); assert.equal(s.hero.gold, 0, 'a new year’s first lesson pays the schoolmaster');
  perform(s, 'school_exam', ctx); pick(s, 'present', ctx);
  assert.equal(s.education.qualifications.length, 1); assert.equal(s.education.qualifications[0].route, 'community');
  assert.equal(s.flags.literacyCertificate, true); assert.equal(s.flags.certified, undefined);
  assert.equal(s.hero.gold, 0); assert.equal(s.hero.path, 'unformed');
  assert.equal(validateEducation(s.education, s), true);
});

test('school absence and an unsuccessful exam preserve learned skills and a clear return route', () => {
  const s = fixture('revision-plan', 'single_parent', 10), ctx = context(s);
  perform(s, 'school_enroll_shrine', ctx);
  for (let i = 0; i < 4; i++) perform(s, 'school_attend', ctx);
  const devotion = s.hero.skills.devotion;
  perform(s, 'school_exam', ctx); pick(s, 'present', ctx);
  assert.equal(s.education.qualifications.length, 0); assert.equal(s.hero.skills.devotion, devotion);
  assert.ok(householdActions(s).find(a => a.id === 'school_exam').disabledReason);
  ageTo(s, 11, ctx);
  for (let i = 0; i < 2; i++) perform(s, 'school_attend', ctx);
  perform(s, 'school_exam', ctx); pick(s, 'present', ctx);
  assert.equal(s.education.qualifications[0].route, 'shrine');
});

test('an unavailable exam revision leaves the pending scene and preparation untouched', () => {
  const s = fixture('revision-limit', 'two_parents', 10), ctx = context(s);
  perform(s, 'school_enroll_community', ctx);
  for (let i = 0; i < 4; i++) perform(s, 'school_attend', ctx);
  for (let i = 0; i < 2; i++) { perform(s, 'school_exam', ctx); pick(s, 'revise', ctx); }
  perform(s, 'school_exam', ctx);
  assert.ok(!s.event.choices.some(c => c.id === 'revise'));
  const original = structuredClone(s);
  assert.equal(applyHouseholdChoice(s, 'school_exam', 'revise', ctx), false);
  assert.deepEqual(s, original);
});

test('a scholarship promise captured before schooling stays fulfillable, and the scholarship is now an examination', () => {
  const s = fixture('academy-poverty', 'orphan', 12), ctx = context(s);
  s.hero.gold = 0;
  assert.match(householdActions(s).find(a => a.id === 'school_enroll_academy').disabledReason, /gold/);
  const exam = householdActions(s).find(a => a.id === 'school_scholarship');
  assert.equal(exam.label, 'Sit the scholarship examination'); assert.equal(exam.cost, 0);
  // A v0.61–v0.63 life could have promised the reading-room service for its funded place; that promise is kept.
  s.education.scholarship = true; s.flags.scholarship = true;
  ctx.addObligation('school_service', 'Complete the scholarship’s supervised service', 60, 'Help in the reading room through the school service action.');
  perform(s, 'school_service', ctx);
  assert.ok(s.obligations.find(o => o.id === 'school_service').resolved);
  assert.ok(!householdActions(s).some(a => a.id === 'school_service'), 'a kept promise is not offered twice');
});

test('normal tuition is paid once and transfers cannot reset annual lesson or revision limits', () => {
  const s = fixture('paid-academy', 'two_parents', 14), ctx = context(s); s.locationId = 'city'; s.hero.gold = 50;
  perform(s, 'school_enroll_academy', ctx); assert.equal(s.hero.gold, 10, 'the grammar school takes its forty once');
  perform(s, householdActions(s).find(a => a.id.startsWith('school_elective_')).id, ctx); // the grammar school wants a year's elective chosen
  for (let i = 0; i < 8; i++) perform(s, 'school_attend', ctx);
  assert.equal(s.hero.gold, 10, 'lessons in a paid year cost nothing more');
  s.locationId = 'home'; perform(s, 'school_enroll_community', ctx); assert.equal(s.hero.gold, 0);
  assert.equal(s.education.lessonsThisYear, 8);
  assert.ok(householdActions(s).find(a => a.id === 'school_attend').disabledReason);
  ageTo(s, 15, ctx);
  assert.equal(s.education.lessonsThisYear, 0);
  assert.match(householdActions(s).find(a => a.id === 'school_attend').disabledReason, /tuition is 10 gold/);
  s.hero.gold = 10; // the new year's fee found, its eight lessons open
  assert.ok(!householdActions(s).find(a => a.id === 'school_attend').disabledReason);
});

test('age and location requirements are real mechanics, and a child who cannot read is told how letters are found', () => {
  const s = fixture('age-gates', 'two_parents', 5), ctx = context(s);
  assert.equal(applyHouseholdAction(s, 'school_enroll_community', ctx), false);
  ageTo(s, 6, ctx);
  assert.ok(householdActions(s).find(a => a.id === 'school_enroll_academy').disabledReason);
  assert.equal(applyHouseholdAction(s, 'school_enroll_academy', ctx), false);
  assert.equal(applyHouseholdAction(s, 'school_attend', ctx), false);
  assert.equal(s.hero.skills.scholarship, 0);
  assert.match(householdContext(s).schoolSummary, /cannot read/);
});

test('family support and visits are bounded per year while birthday hooks never replace a scene', () => {
  const s = fixture('bounded-care', 'two_parents', 6), ctx = context(s);
  for (let i = 0; i < 3; i++) perform(s, 'family_time_kin', ctx);
  assert.equal(applyHouseholdAction(s, 'family_time_kin', ctx), false);
  perform(s, 'family_support', ctx); assert.equal(applyHouseholdAction(s, 'family_support', ctx), false);
  s.event = { id: 'birth_year_7', choices: [{ id: 'care' }] }; const existing = structuredClone(s.event);
  ageTo(s, 7, ctx); const history = structuredClone(s.family.history), support = s.family.support;
  onHouseholdAge(s, ctx);
  assert.deepEqual(s.event, existing); assert.deepEqual(s.family.history, history); assert.equal(s.family.support, support);
  s.event = null; assert.ok(!householdActions(s).find(a => a.id === 'family_time_kin').disabledReason);
});

test('school and household dilemmas are varied, seeded, participant-specific, and once per year', () => {
  const seen = new Set();
  for (let n = 0; n < 40; n++) {
    const s = fixture(`dilemma-${n}`, 'orphan', 12), ctx = context(s);
    perform(s, 'school_enroll_community', ctx); perform(s, 'school_dilemma', ctx);
    seen.add(s.education.pending.sceneId); pick(s, 'help', ctx);
    assert.equal(applyHouseholdAction(s, 'school_dilemma', ctx), false);
    assert.ok(s.conversations.relationships[educationTeacher(s).id].memories.length);
    assert.ok(!s.life.people.find(p => p.id === 'kin').knownFacts.includes('schoolConsentDiscussed'));
  }
  assert.equal(seen.size, 5);
});

test('genuine migration keeps old people, money, events and threads exact and only references the recorded guardian', () => {
  const s = fixture('old-history', 'two_parents', 18, { skip: true });
  s.timeline.mode = 'legacy'; s.day = 30; s.flags.certified = true;
  s.event = { id: 'old-event', choices: [{ id: 'old-pick' }] }; s.battle = { turn: 4 }; s.conversations.pending = { personId: 'kin', replies: ['old-reply'] };
  const original = structuredClone(s);
  initializeHousehold(s, { migration: true, config: { familySetup: 'homeless' } });
  assert.equal(s.family.setup, 'legacy'); assert.equal(s.family.members.length, 1); assert.equal(s.family.members[0].relationship, 'recorded caregiver');
  assert.deepEqual(s.life.people, original.life.people); assert.deepEqual(s.hero, original.hero); assert.deepEqual(s.event, original.event); assert.deepEqual(s.battle, original.battle); assert.deepEqual(s.conversations, original.conversations);
  assert.equal(s.education.qualifications[0].route, 'academy'); assert.equal(s.education.enrolled, false);
  const migrated = structuredClone(s); initializeHousehold(s, { migration: true }); assert.deepEqual(s, migrated);
});

test('named view data matches actual descriptors, people and schools rather than invented eligibility', () => {
  const s = fixture('actual-view', 'homeless', 12), ctx = context(s); perform(s, 'family_shelter', ctx);
  const view = householdView(s), contextView = householdContext(s);
  assert.equal(view.family.members.find(m => m.personId === 'kin').age, s.life.people.find(p => p.id === 'kin').age);
  assert.equal(view.family.members.filter(m => !m.personId).every(m => m.age === null && m.bond === null), true);
  assert.equal(view.education.routes.find(r => r.id === 'academy').disabledReason, householdActions(s).find(a => a.id === 'school_enroll_academy').disabledReason);
  assert.match(view.education.routes.find(r => r.id === 'academy').disabledReason, /40 gold/);
  assert.equal(contextView.caregiverName, s.life.people.find(p => p.id === 'kin').name);
  assert.notEqual(householdView(fixture('other-view', 'homeless', 12)).education.routes[0].name, view.education.routes[0].name);
});

test('household and education validators reject invalid relatives, forged age access and malformed nested saves', () => {
  const base = fixture();
  for (const change of [s => s.family.members.push({ personId: 'fellow', name: 'fake', relationship: 'parent', availability: 'present', biological: true }), s => s.family.support = Infinity, s => s.family.members[0].availability = 'deceased', s => s.family.pending = { personId: 'stranger', sceneId: 'care' }, s => s.family.history.push(null)]) {
    const s = structuredClone(base); change(s); assert.equal(validateHousehold(s.family, s), false);
  }
  for (const change of [s => s.education.progress = -1, s => s.education.route = 'academy', s => s.education.pending = { sceneId: 'unknown' }, s => s.education.qualifications.push(null), s => { s.education.route = 'academy'; s.education.schoolId = 'school-academy'; s.education.enrolled = true; }]) {
    const s = structuredClone(base); change(s); assert.equal(validateEducation(s.education, s), false);
  }
  assert.deepEqual(householdEventIds().school_exam, ['present', 'revise', 'defer']);
});

test('pending family and school scenes roundtrip only with matching resolvable scene data', () => {
  const family = fixture('pending-family', 'homeless', 12), familyCtx = context(family);
  perform(family, 'family_dilemma', familyCtx);
  assert.equal(validateHousehold(family.family, family), true);
  for (const change of [s => s.family.pending = null, s => s.event = null, s => s.event.id = 'school_dilemma', s => s.family.interactionUses.dilemma = 1]) {
    const s = structuredClone(family); change(s); assert.equal(validateHousehold(s.family, s), false);
  }
  // The scholarship is an examination for every life (v0.64, v0.72.3), not a scene.
  for (const id of ['school_dilemma', 'school_exam']) {
    const original = fixture(`pending-${id}`, 'orphan', 12), ctx = context(original); original.hero.gold = 10;
    perform(original, 'school_enroll_community', ctx); for (let i = 0; i < 4; i++) perform(original, 'school_attend', ctx);
    perform(original, id, ctx);
    assert.equal(validateEducation(original.education, original), true);
    for (const change of [s => s.education.pending = null, s => s.event = null, s => s.event.id = 'family_dilemma', s => s.education.pending.sceneId = 'scholarship']) {
      const s = structuredClone(original); change(s); assert.equal(validateEducation(s.education, s), false);
    }
  }
});

test('family and education histories, qualifications and birthday records cannot come from the future', () => {
  const base = fixture('history-clock', 'two_parents', 12), ctx = context(base);
  perform(base, 'school_enroll_community', ctx);
  for (let i = 0; i < 6; i++) perform(base, 'school_attend', ctx);
  perform(base, 'school_exam', ctx); pick(base, 'present', ctx);
  perform(base, 'family_support', ctx);
  assert.equal(validateHousehold(base.family, base), true); assert.equal(validateEducation(base.education, base), true);
  for (const change of [s => s.family.lastAge = 13, s => s.family.history[0].day = s.day + 1, s => s.family.history[0].age = 13]) {
    const s = structuredClone(base); change(s); assert.equal(validateHousehold(s.family, s), false);
  }
  for (const change of [s => s.education.lastAge = 13, s => s.education.examinedYear = 13, s => s.education.history[0].day = s.day + 1, s => s.education.history[0].age = 13, s => s.education.qualifications[0].day = s.day + 1, s => s.education.qualifications[0].age = 13]) {
    const s = structuredClone(base); change(s); assert.equal(validateEducation(s.education, s), false);
  }
});

test('new school teachers have seeded names and absolute birth dates while old teachers keep their identity',()=>{
 const names=new Set();
 for(let index=0;index<25;index++){
  const s=fixture(`fresh-teacher-${index}`,'two_parents',0,{skip:true});s.revision=5;initializeHousehold(s,{config:{familySetup:'two_parents'}});
  const teacher=educationTeacher(s);names.add(teacher.name);assert.ok(s.education.teachers.community.name.startsWith('Tutor '));assert.equal(validateEducation(s.education,s),true);
  s.day=20*365;s.age=5;s.timeline.birthDay=15*365;const later=educationTeacher(s);assert.equal(later.age,teacher.age+20,'the actual teacher ages with the world calendar');
 }
 assert.ok(names.size>20);
 const old=fixture('old-teacher', 'two_parents',7);const teacher=educationTeacher(old);old.revision=5;initializeHousehold(old,{migration:true});assert.equal(old.education.teachers,undefined);assert.equal(educationTeacher(old).name,teacher.name);
});

test('household class creates explicit tradeoffs without deciding the child’s combat identity',()=>{
 const scenes=new Set();
 for(const wealth of ['poor','noble'])for(let n=0;n<30;n++){
  const s=fixture(`family-expectation-${n}`,'two_parents',12,{wealth});s.timeline.roleplayVersion=1;s.factions={villagers:0};const ctx=context(s);
  perform(s,'family_dilemma',ctx);const scene=s.family.pending.sceneId;scenes.add(scene);
  const before={gold:s.hero.gold,support:s.family.support,path:s.hero.path};pick(s,'boundary',ctx);
  if(scene==='expectations'){assert.equal(s.family.support,before.support-4);assert.match(s.family.history.at(-1).text,/Decline the invitation/);}
  if(scene==='winter'){assert.equal(s.family.support,before.support-3);assert.equal(s.hero.skills.scholarship,1);}
  assert.equal(s.hero.gold,before.gold);assert.equal(s.hero.path,before.path);assert.equal(s.hero.specialization,null);assert.equal(validateHousehold(s.family,s),true);
 }
 assert.ok(scenes.has('expectations'));assert.ok(scenes.has('winter'));
});
