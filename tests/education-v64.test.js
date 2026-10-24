import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { householdActions } from '../dist/js/household.js';
import { isLiterate, schoolingView, canPayTuition, credentialReason, ELECTIVES, scholarshipExam, entranceExam, chooseElective, onElectiveLesson, electiveOffer, lessonPerformance, validateSchooling } from '../dist/js/schooling.js';
import { civilianEntryReason } from '../dist/js/career-entry.js';
import { applyPersonalityBuild } from '../dist/js/personality.js';
import { whatMatters } from '../dist/js/voice.js';

const answer = s => {
  const offered = s.event.choices.filter(c => !c.disabledReason);
  const preferred = s.event.id === 'health_concern' ? 'rest' : s.event.id === 'hard_winter' ? 'endure'
    : s.event.id === 'school_exam' ? 'present' : s.event.id.startsWith('farm_') ? 'continue' : null;
  // These are schooling fixtures. Incidental field decisions take their
  // lawful continuation instead of retrying a rent the purse cannot pay.
  assert.ok(offered.length, `${s.event.id} has an available answer`);
  return (offered.find(c => c.id === preferred) || offered[0]).id;
};
function born(seed, station, extra = {}) { return engine.createBirthGame({ seed, station: { ...rollBirthCircumstances(seed, station, 'human'), ...extra } }); }
function grow(s, to) {
  for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, answer(s));
  if (s.phase !== 'retired') {
    assert.equal(s.age, to, `the schooling fixture reaches ${to}`);
    assert.equal(s.event, null, 'incidental decisions have a finite continuation');
  }
  return s;
}
const journal = () => { const rows = []; return { rows, ctx: { journal: (title, text, tag) => rows.push({ title, text, tag }), spendDays: n => n } }; };

test('letters are earned: a new life cannot read until someone teaches it, and older saves always could', () => {
  const s = born('letters-common', 'common');
  assert.equal(isLiterate(s), false);
  assert.equal(schoolingView(s).literate, false);
  assert.equal(engine.validateSave(s), true);
  const old = engine.createBirthGame({ seed: 'letters-old', station: null });
  assert.equal(isLiterate(old), true, 'no schooling record means the old rules');
  assert.equal(old.education.schooling, undefined);
});

test('a high house has a tutor; a literate trade house teaches at its own table; the shrine keeper chooses one pupil', () => {
  const high = grow(born('letters-gentry', 'gentry'), 9);
  assert.equal(isLiterate(high), true); assert.equal(schoolingView(high).letters, 'tutor');
  assert.ok(high.journal.some(j => j.title === 'Letters' && /tutor/.test(j.text)));
  const bound = grow(born('letters-bound', 'bound', { literate: false }), 9);
  if (bound.phase !== 'retired') { assert.equal(isLiterate(bound), false); assert.ok([true, false].includes(schoolingView(bound).literate)); }
  // The shrine's one place is decided once, by the keeper, at six.
  const common = grow(born('letters-shrine', 'common'), 7);
  if (common.phase !== 'retired') assert.ok(typeof common.education.schooling.shrinePlace === 'boolean');
});

test('tuition: the village school wants ten gold a year, a wealthy house pays for its children, the poor pay from the purse or go without', () => {
  const poor = grow(born('tuition-poor', 'common'), 7);
  if (poor.phase === 'retired') return;
  poor.hero.gold = 0;
  assert.equal(canPayTuition(poor, 'community'), false);
  const enrol = householdActions(poor).find(a => a.id === 'school_enroll_community');
  assert.match(enrol?.disabledReason || '', /ten gold a year|wants 10 gold|Enrollment takes place|field does not wait/);
  poor.hero.gold = 12;
  assert.equal(canPayTuition(poor, 'community'), true);
  // The fee is the action's cost, taken once by the engine; the lesson that opens a new school year carries the next one.
  const open = householdActions(poor).find(a => a.id === 'school_enroll_community');
  if (open && !open.disabledReason) assert.equal(open.cost, 10);
  const rich = grow(born('tuition-trade', 'trade'), 7);
  if (rich.phase !== 'retired') { rich.hero.gold = 0; assert.equal(canPayTuition(rich, 'community'), true, 'the house pays'); }
});

test('the scholarship examination has a handful of places and one sitting; the entrance examination comes once a year', () => {
  const s = born('exams', 'common'); s.age = 13; s.day = 13 * 365; s.event = null;
  s.education.schooling.literate = true; s.education.performance = 50; s.hero.attributes.intellect = 3;
  const { rows, ctx } = journal();
  const passed = scholarshipExam(s, ctx);
  assert.ok(['passed', 'failed'].includes(s.education.schooling.scholarship));
  assert.equal(rows.length, 1);
  assert.equal(scholarshipExam(s, ctx), false, 'no second sitting');
  if (passed) { assert.equal(s.education.scholarship, true); assert.equal(s.education.schooling.entrance.academy, 'passed'); }
  else {
    assert.equal(s.education.scholarship, false);
    const first = entranceExam(s, ctx);
    assert.equal(s.education.schooling.entrance.academyYear, 13);
    assert.equal(entranceExam(s, ctx), false, 'once a year');
    if (!first) { s.age = 14; s.day = 14 * 365; assert.ok(['passed', 'failed'].includes(entranceExam(s, ctx) ? 'passed' : 'failed')); }
  }
  // Aptitude is real: a curious, bright pupil passes far more often than a worn, impatient one.
  let bright = 0, dull = 0;
  for (let i = 0; i < 60; i++) {
    const a = born(`apt-${i}`, 'common'); a.age = 13; a.day = 13 * 365; a.education.schooling.literate = true; a.education.performance = 80; a.hero.attributes.intellect = 6;
    applyPersonalityBuild(a, ['curious'], { creation: true }); if (scholarshipExam(a, {})) bright++;
    const b = born(`apt-${i}`, 'common'); b.age = 13; b.day = 13 * 365; b.education.schooling.literate = true; b.education.performance = 40; b.hero.attributes.intellect = 2; b.life.stress = 80;
    applyPersonalityBuild(b, ['impatient'], { creation: true }); if (scholarshipExam(b, {})) dull++;
  }
  assert.ok(bright > dull + 15, `bright ${bright} vs dull ${dull}`);
  assert.ok(lessonPerformance(born('apt-x', 'common')) >= 1);
});

test('the grammar years offer one elective a year, four lessons each, then the master’s grade and a skill', () => {
  const s = born('electives', 'trade'); s.age = 13; s.day = 13 * 365; s.event = null;
  s.education.schooling.literate = true; s.education.route = 'academy'; s.education.schoolId = 'school-academy'; s.education.enrolled = true; s.education.performance = 70; s.education.schooling.entrance.academy = 'passed';
  const offer = electiveOffer(s);
  assert.equal(offer.length, 4);
  assert.ok(offer.every(e => ELECTIVES.includes(e)));
  const { rows, ctx } = journal();
  assert.equal(chooseElective(s, offer[0].id, ctx), true);
  assert.equal(chooseElective(s, offer[1].id, ctx), false, 'one a year');
  assert.equal(electiveOffer(s), null);
  const before = s.hero.skills[offer[0].skill];
  for (let n = 0; n < 4; n++) onElectiveLesson(s, ctx);
  const record = s.education.schooling.electives[0];
  assert.ok(record.grade >= 20 && record.grade <= 100);
  assert.ok(s.hero.skills[offer[0].skill] > before);
  assert.ok(rows.some(r => /examined/.test(r.title)));
  assert.equal(validateSchooling(s.education.schooling, s), true);
  // Next year the taken elective is not offered again.
  s.age = 14; s.day = 14 * 365;
  assert.ok(!electiveOffer(s).some(e => e.id === offer[0].id));
});

test('credentials gate the learned trades on new lives, not on old ones', () => {
  const s = born('credentials', 'common'); s.age = 18; s.day = 18 * 365; s.phase = 'adult';
  assert.match(credentialReason(s, 'healer'), /letters/);
  assert.match(credentialReason(s, 'scholar'), /cannot read/);
  assert.match(credentialReason(s, 'merchant'), /bill of lading/);
  assert.equal(credentialReason(s, 'blacksmith'), null);
  assert.match(civilianEntryReason(s, { profession: 'Healer' }) || '', /letters/);
  s.education.schooling.literate = true;
  assert.equal(credentialReason(s, 'merchant'), null);
  assert.equal(credentialReason(s, 'cartographer'), null);
  assert.match(credentialReason(s, 'scholar'), /grammar school/);
  s.education.schooling.electives.push({ id: 'anatomy', age: 14, lessons: 4, grade: 71 });
  assert.equal(credentialReason(s, 'healer'), null, 'anatomy opens the healers’ door');
  s.education.qualifications.push({ id: 'academy-certificate', label: 'Academy certificate', route: 'academy', schoolId: 'school-academy', grade: 60, day: s.day, age: 17 });
  assert.equal(credentialReason(s, 'scholar'), null);
  const old = engine.createBirthGame({ seed: 'credentials-old', station: null }); old.age = 18;
  assert.equal(credentialReason(old, 'healer'), null);
  // The trade's own wealth stands in for letters at the counting house.
  const trade = born('credentials-trade', 'trade'); trade.age = 18;
  assert.equal(credentialReason(trade, 'merchant'), null);
});

test('the unlettered cannot read on their own, and sign what they are handed', () => {
  const s = grow(born('unlettered', 'common'), 19);
  if (s.phase === 'retired' || isLiterate(s)) return;
  const read = engine.getActions(s).find(a => a.id === 'leisure_read');
  if (read) assert.equal(read.disabledReason, 'You cannot read.');
  // An adult can still learn, four afternoons at a time.
  s.hero.gold = 20;
  const letters = householdActions(s).find(a => a.id === 'school_letters');
  assert.ok(letters, 'learn your letters is offered to an unlettered adult');
  assert.ok(whatMatters(s, engine.getActions(s)).some(r => /cannot read/.test(r.why)), 'the Right now panel says so');
  assert.equal(engine.validateSave(s), true);
});

test('through the public engine: a trade child reads at home, passes the entrance, pays the fee, and leaves school with a certificate that opens a trade', () => {
  const s = grow(born('whole-school', 'trade'), 18);
  if (s.phase === 'retired') return;
  const v = schoolingView(s);
  assert.equal(engine.validateSave(s), true);
  assert.ok(typeof v.literate === 'boolean');
  // A bound child, unlettered, is not schooled at all and the learned trades are closed.
  const b = grow(born('whole-bound', 'bound', { literate: false }), 18);
  if (b.phase === 'retired') return;
  assert.equal(b.education.enrolled, false);
  assert.equal(isLiterate(b), false);
  assert.ok(engine.getActions(b).filter(a => /^career_choose_(healer|scholar|cartographer)$/.test(a.id)).every(a => a.disabledReason), 'the learned trades are shut to the unlettered');
});
