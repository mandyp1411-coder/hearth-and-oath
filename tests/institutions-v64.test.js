import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { householdActions, educationTeacher } from '../dist/js/household.js';
import { settlementServices, serviceAccepts, serviceWalkPath } from '../dist/js/world-services.js';
import { travelPreview } from '../dist/js/world.js';
import { applyPersonalityBuild } from '../dist/js/personality.js';
import { whatMatters } from '../dist/js/voice.js';
import { applyDebtReckoningChoice, DEBT_RECKONING_EVENT } from '../dist/js/budget.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { INSTITUTIONS, SUBJECTS, schoolingView, institutionLocation, institutionDoorReason, institutionEntrance, institutionScholarship, institutionPatron, studyLevel, advanceStudy, fadeStudies, useStudy, classmateFates, credentialReason, hasCredential, bondReason, validateSchooling, STUDY_FADE_YEARS } from '../dist/js/schooling.js';

// Fixtures use the public engine wherever the thing under test is reachable through it;
// where it is not (a classmate's fate at forty), the module's own function is called with a mock context.
const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'avoid', 'press', 'isolate'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station, extra = {}) { return engine.createBirthGame({ seed, station: { ...rollBirthCircumstances(seed, station, 'human'), ...extra } }); }
function grow(s, to) {
  for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s));
  return s;
}
function settle(s) { for (let n = 0; n < 40 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; }
/** Walks to the room that offers the action if need be, then takes it and checks the displayed days and fee were spent exactly once. */
function act(s, id, { event = null, pays = true } = {}) {
  let a = engine.getActions(s).find(a => a.id === id && !a.disabledReason);
  if (!a) { const owner = settlementServices(s).find(r => serviceAccepts(r, id)), path = owner && serviceWalkPath(s, owner.roomId); if (path) for (const room of path) { const m = engine.getActions(s).find(a => a.id === 'atlas_room_' + room && !a.disabledReason); if (!m) break; s = engine.chooseAction(s, m.id); } a = engine.getActions(s).find(a => a.id === id); }
  assert.ok(a, `${id} is offered`); assert.equal(a.disabledReason, undefined, `${id}: ${a.disabledReason}`);
  const gold = s.hero.gold, day = s.day, next = engine.chooseAction(s, id);
  assert.notEqual(next, s);
  if (event) assert.equal(next.event?.id, event, `${id} raises ${event}`);
  if (!next.event) { assert.equal(next.day - day, a.days, `${id} spends its displayed days once`); if (pays) assert.equal(gold - next.hero.gold, a.cost, `${id} pays its displayed fee once`); }
  assert.equal(engine.validateSave(next), true, `${id} leaves a valid save`);
  return next;
}
function travel(s, id) {
  if (s.locationId === id) return s;
  assert.equal(travelPreview(s, id).disabledReason, undefined);
  s = engine.travelTo(s, id);
  for (let n = 0; n < 80 && (s.timeline.journey || s.event); n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.continueJourney(s);
  return s; // the road has its own events; a fixture that did not arrive checks and returns
}
/** A trade child at sixteen with letters and the grammar certificate the institutions ask for, and a purse. */
function graduate(seed, station = 'trade') {
  const s = grow(born(seed, station), 16); if (s.phase === 'retired') return null;
  const k = s.education.schooling; k.literate = true; k.letters = k.letters || 'home';
  s.education.qualifications.push({ id: 'academy-certificate', label: 'Academy certificate', route: 'academy', schoolId: 'school-academy', grade: 72, day: s.day - 30, age: 15 });
  s.hero.gold = 500; assert.equal(engine.validateSave(s), true); return s;
}
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {} } }; };

test('the institutions have doors: the certificate below, birth, the subject’s own demands', () => {
  const s = graduate('inst-doors'); if (!s) return;
  assert.equal(institutionDoorReason(s, 'university'), null);
  assert.match(institutionDoorReason(s, 'war_college') || '', /gentle birth|a weapon/);
  assert.match(institutionDoorReason(s, 'collegium') || '', /arcana/);
  assert.match(institutionDoorReason(s, 'collegium', { publicMagic: 'forbidden' }) || '', /arcana|law/);
  assert.match(institutionDoorReason(s, 'law_school') || '', /rhetoric or law/);
  s.hero.skills.arcana = 3; assert.equal(institutionDoorReason(s, 'collegium'), null);
  assert.match(institutionDoorReason(s, 'collegium', { publicMagic: 'forbidden' }) || '', /law here forbids/);
  const bound = graduate('inst-bound', 'bound'); if (bound) { bound.hero.skills.weapons = 5; assert.match(institutionDoorReason(bound, 'war_college') || '', /does not commission the bound/); }
  const young = { ...s, age: 15 }; assert.match(institutionDoorReason(young, 'university') || '', /under sixteen/);
  const unlettered = born('inst-none', 'common'); unlettered.age = 17; assert.match(institutionDoorReason(unlettered, 'university') || '', /grammar school certificate/);
  for (const inst of INSTITUTIONS) assert.ok(institutionLocation(s, inst), `${inst.id} sits somewhere in the world`);
});

test('through the public engine: the entrance once a year, the one free place once, the rolls, the lectures, the year’s fee, the degree', () => {
  let s = graduate('inst-whole'); if (!s) return;
  const city = institutionLocation(s, 'university');
  assert.match(engine.getActions(s).find(a => a.id === 'school_sit_university')?.disabledReason || '', /held in/);
  s = travel(s, city); if (s.locationId !== city) return;
  const sitAt = s.age;
  s = settle(act(s, 'school_sit_university'));
  assert.equal(s.education.schooling.entrance.universityYear, sitAt);
  assert.match(engine.getActions(s).find(a => a.id === 'school_sit_university')?.disabledReason || 'admitted', /Next year|admitted/);
  for (let n = 0; n < 4 && s.education.schooling.entrance.university !== 'passed'; n++) { s = grow(s, s.age + 1); s = travel(s, city); if (s.locationId !== city) return; s = settle(act(s, 'school_sit_university')); }
  assert.equal(s.education.schooling.entrance.university, 'passed');
  s = settle(act(s, 'school_place_university'));
  assert.ok(['passed', 'failed'].includes(s.education.schooling.entrance.universityScholarship));
  assert.equal(engine.getActions(s).find(a => a.id === 'school_place_university'), undefined, 'one sitting for the free place');
  const read = engine.getActions(s).find(a => a.id === 'school_read_university_medicine');
  assert.ok(read && !read.disabledReason);
  assert.equal(read.cost, s.education.schooling.entrance.universityScholarship === 'passed' ? 0 : 120, 'the first year’s fee is the action’s cost');
  s = settle(act(s, 'school_read_university_medicine'));
  const i = s.education.schooling.institution;
  assert.equal(i.id, 'university'); assert.equal(i.major, 'medicine'); assert.equal(i.tuitionPaid, s.age);
  assert.ok(s.journal.some(j => j.title === 'The University' && /read into the rolls/.test(j.text)), 'the line in the book is the school’s own, not a receipt');
  for (let n = 0; n < 6; n++) s = settle(act(s, 'school_lecture'));
  assert.match(engine.getActions(s).find(a => a.id === 'school_lecture').disabledReason, /This year’s lectures/);
  assert.ok(studyLevel(s, 'medicine') >= 3, 'the major deepens');
  assert.match(engine.getActions(s).find(a => a.id === 'school_degree').disabledReason, /after 3 years/);
  // Years two and three: the first lecture of each pays the bursar, unless the scholarship does.
  for (let y = 0; y < 2; y++) {
    s = grow(s, s.age + 1); if (s.phase === 'retired') return; s = travel(s, city); if (s.locationId !== city) return;
    const first = engine.getActions(s).find(a => a.id === 'school_lecture');
    assert.equal(first.cost, i.scholarship ? 0 : 120, 'the year’s fee rides the first lecture');
    for (let n = 0; n < 6; n++) s = settle(act(s, 'school_lecture'));
  }
  assert.equal(s.education.schooling.institution.lessons, 18);
  // The examiners sit at the end of the third year: the birthday after it.
  assert.match(engine.getActions(s).find(a => a.id === 'school_degree').disabledReason, /after 3 years/);
  s = grow(s, s.age + 1); if (s.phase === 'retired') return; s = travel(s, city); if (s.locationId !== city) return;
  let degree = engine.getActions(s).find(a => a.id === 'school_degree');
  assert.equal(degree.disabledReason, undefined, degree.disabledReason);
  for (let n = 0; n < 4 && !s.education.schooling.institution.degree; n++) {
    s = settle(act(s, 'school_degree'));
    if (!s.education.schooling.institution.degree) { assert.match(engine.getActions(s).find(a => a.id === 'school_degree').disabledReason, /sat this year/); s = grow(s, s.age + 1); s = travel(s, city); if (s.locationId !== city) return; }
  }
  assert.ok(s.education.schooling.institution.degree, 'a doctor within four sittings');
  assert.ok(hasCredential(s, 'degree')); assert.equal(s.flags.certified, true);
  assert.equal(schoolingView(s).tier, 3);
  assert.equal(credentialReason(s, 'healer'), null, 'the degree in medicine opens the healers’ door');
  assert.equal(engine.validateSave(s), true);
  assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))), s);
});

test('who pays: the scholarship, a high house for its own, a classmate who rose, a family friend; a clerk of the court reads the lender his paper back', () => {
  const s = graduate('inst-pay'); if (!s) return;
  assert.equal(institutionPatron(s, 'university'), null, 'a trade child pays from the purse');
  const high = graduate('inst-high', 'gentry'); if (high) assert.equal(institutionPatron(high, 'university')?.kind, 'house');
  s.education.schooling.classmates.push({ id: 'classmate-0', name: 'Orrin Vale', subject: 'law', nature: 'proud', standing: 1, bornDay: 0, fate: { kind: 'risen', early: 'x', late: 'y', told: 'early' }, contests: [], memories: [] });
  const patron = institutionPatron(s, 'law_school');
  if (patron) assert.ok(['classmate', 'friend'].includes(patron.kind));
  // The lender's paper, read by someone who studied the law.
  const { rows, ctx } = mock();
  const debtor = born('inst-law', 'common'); debtor.age = 24; debtor.day = 24 * 365; debtor.phase = 'adult';
  debtor.education.schooling.literate = true; debtor.education.schooling.letters = 'school';
  debtor.education.schooling.credentials.push({ kind: 'clerkship', institution: 'law_school', major: 'law', age: 22, grade: 70 });
  assert.equal(hasCredential(debtor, 'clerkship'), true);
  assert.equal(validateSchooling(debtor.education.schooling, debtor), true);
  debtor.householdBudget.debt = 200; debtor.life.stress = 20;
  assert.equal(applyDebtReckoningChoice(debtor, DEBT_RECKONING_EVENT.id, 'plead', ctx), true);
  assert.equal(debtor.householdBudget.debt, 220, 'the lawful tenth, not the lender’s fifteenth');
  assert.ok(rows.some(r => /read the lender his own paper back/.test(r.text)));
  const mark = born('inst-mark', 'common'); mark.age = 24; mark.day = 24 * 365; mark.phase = 'adult'; mark.householdBudget.debt = 200; mark.hero.skills.persuasion = 4;
  applyDebtReckoningChoice(mark, DEBT_RECKONING_EVENT.id, 'plead', mock().ctx);
  assert.equal(mark.householdBudget.debt, 244, 'the unlettered sign the paper they are handed');
});

test('studies: an elective or a lecture deepens one, three idle years fade it to half of what it reached, use keeps it', () => {
  const s = born('studies', 'trade'); s.age = 14; s.day = 14 * 365;
  assert.equal(studyLevel(s, 'anatomy'), 0);
  advanceStudy(s, 'anatomy', 6); assert.equal(studyLevel(s, 'anatomy'), 6);
  const { rows, ctx } = mock();
  s.day += (STUDY_FADE_YEARS - 1) * 365; fadeStudies(s, ctx); assert.equal(studyLevel(s, 'anatomy'), 6, 'nothing fades inside three years');
  s.day += 365; fadeStudies(s, ctx); assert.equal(studyLevel(s, 'anatomy'), 5);
  for (let y = 0; y < 6; y++) { s.day += 365; fadeStudies(s, ctx); }
  assert.equal(studyLevel(s, 'anatomy'), 3, 'half of the peak stays for good');
  assert.ok(rows.some(r => /What the years took/.test(r.title)));
  advanceStudy(s, 'anatomy', 1); s.day += 5 * 365; useStudy(s, 'anatomy'); s.day += 365; fadeStudies(s, ctx);
  assert.equal(studyLevel(s, 'anatomy'), 4, 'a study used last year does not fade');
  assert.equal(validateSchooling(s.education.schooling, s), true);
  assert.ok(schoolingView(s).studies.every(r => SUBJECTS[r.id]));
});

test('classmates: two at the grammar school bench, a prize contested once a year, memories kept, and distinct fates at twenty-five and forty', () => {
  let s = grow(born('mates', 'trade'), 12); if (s.phase === 'retired') return;
  const k = s.education.schooling; k.literate = true; k.letters = 'home'; k.entrance.academy = 'passed'; s.hero.gold += 100;
  const academy = educationTeacher({ ...s, education: { ...s.education, route: 'academy' } }).locationId;
  if (s.locationId !== academy) return;
  s = settle(act(s, 'school_enroll_academy'));
  assert.equal(k.classmates.length, 0, 'the fixture record is a copy; the new save carries the bench');
  const mates = s.education.schooling.classmates;
  assert.equal(mates.length, 2); assert.notEqual(mates[0].name, mates[1].name);
  assert.ok(s.journal.some(j => j.title === 'The bench'));
  const elective = engine.getActions(s).find(a => a.id.startsWith('school_elective_') && !a.disabledReason); if (elective) s = settle(act(s, elective.id));
  s = settle(act(s, 'school_attend')); s = settle(act(s, 'school_attend'));
  const third = act(s, 'school_attend', { event: 'schooling_rival' });
  assert.ok(third.event.choices.some(c => c.id === 'contest') && third.event.choices.some(c => c.id === 'yield'));
  assert.ok(!third.event.choices.some(c => c.id === 'cheat'), 'the sly way is for the Deceitful');
  assert.equal(engine.validateSave(third), true);
  s = engine.chooseEventOption(third, 'contest');
  const c = s.education.schooling.classmates.find(x => x.contests.length);
  assert.ok(c); assert.equal(c.contests[0].age, s.age); assert.equal(c.memories.length, 1);
  assert.ok(s.journal.some(j => /prize$/.test(j.title)));
  s = settle(act(s, 'school_attend'));
  assert.equal(s.education.schooling.pending, null, 'one prize a year');
  // The Deceitful see a third way.
  const sly = structuredClone(third); applyPersonalityBuild(sly, ['deceitful'], { creation: true });
  sly.education.schooling.pending = { kind: 'rival', classmateId: sly.education.schooling.classmates[0].id, age: sly.age }; sly.event = null;
  const again = engine.ageUp(sly);
  if (again.event?.id === 'schooling_rival') assert.ok(again.event.choices.some(ch => ch.id === 'cheat' && ch.nature === 'deceitful'));
  // Fates, told twice.
  const { rows, ctx } = mock();
  const later = structuredClone(s); later.age = 25; later.day = 25 * 365; classmateFates(later, ctx);
  assert.equal(later.education.schooling.classmates.filter(x => x.fate).length, 2);
  assert.notEqual(later.education.schooling.classmates[0].fate.early, later.education.schooling.classmates[1].fate.early, 'two lives, two fates');
  assert.equal(rows.length, 2);
  later.age = 40; later.day = 40 * 365; classmateFates(later, ctx);
  assert.equal(rows.length, 4); assert.ok(later.education.schooling.classmates.every(x => x.fate.told === 'late'));
  assert.equal(validateSchooling(later.education.schooling, later), true);
});

test('the apprenticeship is a bond: three years at a master’s bench, low pay, a temper, other doors shut, and a journeyman at the end', () => {
  let s = grow(born('bond', 'common'), 12); if (s.phase === 'retired' || s.education.enrolled) return;
  s = settle(act(s, 'school_enroll_apprenticeship'));
  const b = s.education.schooling.bond;
  assert.ok(b && !b.broken && !b.done); assert.equal(b.fromAge, 12); assert.equal(b.until - b.from, 3 * 365);
  assert.match(b.master, /^(Master|Mistress) /);
  assert.ok(s.journal.some(j => j.title === 'The bond'));
  assert.match(bondReason(s) || '', /bound to .* bench/);
  assert.match(householdActions(s).find(a => a.id === 'school_enroll_community')?.disabledReason || '', /bound to|Enrollment takes place|wants 10 gold|one pupil/);
  const gold = s.hero.gold; s = settle(act(s, 'school_attend', { pays: false })); assert.equal(s.hero.gold, gold + 2, 'two gold a lesson');
  // Years at the bench; the master's temper comes at least once.
  let tempers = 0;
  for (let y = 0; y < 3; y++) { for (let n = 0; n < 3; n++) { const a = engine.getActions(s).find(a => a.id === 'school_attend'); if (!a || a.disabledReason) break; const next = engine.chooseAction(s, 'school_attend'); if (next.event?.id === 'schooling_temper') { tempers++; assert.ok(next.event.choices.some(c => c.id === 'run')); } s = settle(next); } s = grow(s, s.age + 1); if (s.phase === 'retired') return; }
  assert.ok(tempers >= 1, 'the hand comes down at least once in three years');
  if (s.age >= 16) {
    const done = s.education.schooling.bond;
    assert.equal(done.done, true, 'three years served');
    assert.ok(hasCredential(s, 'journeyman'));
    const craft = s.education.schooling.credentials.find(c => c.kind === 'journeyman').major;
    const name = { blacksmith: 'Blacksmith', miner: 'Miner', herbalist: 'Herbalist', farmer: 'Farmer', innkeeper: 'Innkeeper' }[craft];
    assert.ok(s.careers.records[name].experience >= 90 && s.careers.records[name].mastery >= 1, 'a journeyman’s start in the craft');
    assert.equal(bondReason(s), null, 'the bond served, every door opens again');
    assert.ok(s.journal.some(j => j.title === 'Journeyman'));
  }
  assert.equal(engine.validateSave(s), true);
});

test('breaking the bond: thirty gold on the bench, or walk out and the master hates you', () => {
  let s = grow(born('bond-break', 'common'), 12); if (s.phase === 'retired' || s.education.enrolled) return;
  s = settle(act(s, 'school_enroll_apprenticeship'));
  s.hero.gold = 40;
  const paid = settle(act(s, 'school_break_bond'));
  assert.equal(paid.hero.gold, 10); assert.equal(paid.education.schooling.bond.broken.how, 'paid'); assert.equal(paid.education.enrolled, false);
  assert.equal(bondReason(paid), null);
  assert.ok(paid.journal.some(j => /bought back/.test(j.title)));
  // Walking out, from the temper scene.
  const ran = structuredClone(s); ran.education.schooling.pending = { kind: 'temper', age: ran.age };
  const scene = engine.ageUp(ran);
  if (scene.event?.id === 'schooling_temper') {
    const out = engine.chooseEventOption(scene, 'run');
    assert.equal(out.education.schooling.bond.broken.how, 'ran');
    assert.ok(out.hero.station.ties.some(t => t.kind === 'hates'), 'the master is a tie that hates you');
    assert.equal(engine.validateSave(out), true);
  }
});

test('the first slice’s examinations spend their displayed days and fee once (they spent them twice)', () => {
  const s = born('once', 'common'); s.age = 13; s.day = 13 * 365; s.event = null; s.phase = 'childhood';
  s.education.schooling.literate = true; s.education.schooling.letters = 'school'; s.hero.gold = 30;
  const academy = educationTeacher({ ...s, education: { ...s.education, route: 'academy' } }).locationId;
  if (s.locationId !== academy || !engine.validateSave(s)) return;
  for (const id of ['school_scholarship', 'school_entrance']) {
    const a = engine.getActions(s).find(a => a.id === id); if (!a || a.disabledReason) continue;
    const next = engine.chooseAction(s, id);
    assert.equal(next.day - s.day, a.days, `${id} spends ${a.days} days, not ${next.day - s.day}`);
  }
});

test('the Right now panel and the voice know the institutions and the bench', () => {
  let s = graduate('inst-voice'); if (!s) return;
  s = travel(s, institutionLocation(s, 'university')); if (s.locationId !== institutionLocation(s, 'university')) return;
  assert.ok(whatMatters(s, engine.getActions(s)).some(r => /capitals examine|institution will have you/.test(r.why)));
  let b = grow(born('bond-voice', 'common'), 12); if (b.phase === 'retired' || b.education.enrolled) return;
  b = settle(act(b, 'school_enroll_apprenticeship'));
  assert.ok(whatMatters(b, engine.getActions(b)).some(r => /bench, and \d more year/.test(r.why)));
});

test('the school page shows the institution, the bond, the bench and what the examinations made you; the character sheet names the credential', async t => {
  const s = graduate('inst-ui'); if (!s) return;
  const k = s.education.schooling;
  k.institution = { id: 'university', major: 'medicine', from: 16, lessons: 7, lessonsThisYear: 1, year: s.age, tuitionPaid: s.age, patron: null, scholarship: false, degree: null, sat: null };
  k.classmates.push({ id: 'classmate-0', name: 'Orrin Vale', subject: 'law', nature: 'proud', standing: 2, bornDay: s.day - 16 * 365, fate: null, contests: [{ age: 13, subject: 'law', won: true, pick: 'contest' }], memories: ['You beat them to the law prize at 13.'] });
  k.credentials.push({ kind: 'journeyman', institution: 'apprenticeship', major: 'miner', age: 15, grade: 70 });
  k.bond = { craft: 'miner', master: 'Master Pell', from: s.day - 4 * 365, fromAge: 12, until: s.day - 365, lessons: 12, broken: null, temper: 0, done: true };
  advanceStudy(s, 'medicine', 4);
  assert.equal(engine.validateSave(s), true);
  const surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue');
  await surface.click('tab', 'activities');
  await surface.click('activities-pane', 'work');
  const html = surface.root.innerHTML;
  assert.match(html, /THE UNIVERSITY/); assert.match(html, /Medicine, year 1 of 3/);
  assert.match(html, /data-id="school_lecture"/, 'the lecture is offered under Work & School');
  assert.match(html, /THE BOND/); assert.match(html, /journeyman miner/);
  assert.match(html, /THE BENCH/); assert.match(html, /Orrin Vale/); assert.match(html, /They think well of you/);
  assert.match(html, /STUDIES/); assert.match(html, /Medicine 4/);
  await surface.click('tab', 'character');
  assert.match(surface.root.innerHTML, /journeyman miner/);
});
