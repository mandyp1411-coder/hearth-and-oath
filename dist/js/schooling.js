// Schooling: being educated is rare, earned and worth it. This module decides
// who gets letters and how, what a school costs and whom it admits, the
// scholarship examination with its handful of places, the electives of the
// grammar years, and the credentials that gate the learned trades. It layers
// over the course machinery in household.js and education-progress.js, and
// applies to new-edition lives only.
//
// Second slice (v0.64.1): the institutions of the capitals above the grammar
// school, studies that fade without use, classmates who stay in a life, and
// the apprenticeship as a bond with a master rather than a free course.
import { seededRoll, generatePersonName } from './world.js';
import { hasNature } from './personality.js';
import { addStationTie } from './station.js';

export const TIERS = Object.freeze({ community: 1, shrine: 1, apprenticeship: 1, academy: 2 });
// Tuition a school year, in gold. The shrine teaches for nothing, and chooses.
export const TUITION = Object.freeze({ community: 10, shrine: 0, apprenticeship: 0, academy: 40 });
export const LETTERS_LESSONS = 4; // an adult learning letters at the archive

// The grammar years offer one elective a year. Each feeds a skill and, later,
// a door: anatomy to the healers, accounting to the counting house, law to
// the clerks, siegecraft to the war college.
export const ELECTIVES = Object.freeze([
  Object.freeze({ id: 'rhetoric', label: 'Rhetoric', skill: 'persuasion', line: 'How to be believed.' }),
  Object.freeze({ id: 'anatomy', label: 'Anatomy', skill: 'devotion', line: 'What is under the skin, and what goes wrong with it.' }),
  Object.freeze({ id: 'heraldry', label: 'Heraldry', skill: 'persuasion', line: 'Whose arms are whose, and who owes whom.' }),
  Object.freeze({ id: 'accounting', label: 'Accounting', skill: 'scholarship', line: 'Ledgers, and the lies they can hide.' }),
  Object.freeze({ id: 'astronomy', label: 'Astronomy', skill: 'arcana', line: 'The sky as a clock and a map.' }),
  Object.freeze({ id: 'theology', label: 'Theology', skill: 'devotion', line: 'What the temples say, and what they argue about.' }),
  Object.freeze({ id: 'old_elvish', label: 'Old Elvish', skill: 'scholarship', line: 'The tongue the oldest books are written in.' }),
  Object.freeze({ id: 'siegecraft', label: 'Siegecraft', skill: 'defense', line: 'Walls, and how they fall.' }),
  Object.freeze({ id: 'natural_philosophy', label: 'Natural philosophy', skill: 'arcana', line: 'Why things burn, float and rot.' }),
  Object.freeze({ id: 'law', label: 'Law', skill: 'scholarship', line: 'What the court will hear, and what it will not.' }),
]);
export const electiveById = id => ELECTIVES.find(e => e.id === id) || null;

// Subjects a life can study, grouped in families. The eight skills stay the
// combat and livelihood measures; a study is finer than a skill, fades when it
// is not used, and is what a credential actually asks for.
export const SUBJECTS = Object.freeze({
  rhetoric: { label: 'Rhetoric', family: 'letters' }, heraldry: { label: 'Heraldry', family: 'letters' }, old_elvish: { label: 'Old Elvish', family: 'letters' }, history: { label: 'History', family: 'letters' },
  law: { label: 'Law', family: 'law' }, advocacy: { label: 'Advocacy', family: 'law' },
  anatomy: { label: 'Anatomy', family: 'medicine' }, medicine: { label: 'Medicine', family: 'medicine' },
  accounting: { label: 'Accounting', family: 'numbers' }, astronomy: { label: 'Astronomy', family: 'numbers' },
  natural_philosophy: { label: 'Natural philosophy', family: 'philosophy' }, thaumaturgy: { label: 'Thaumaturgy', family: 'philosophy' },
  theology: { label: 'Theology', family: 'faith' }, liturgy: { label: 'Liturgy', family: 'faith' },
  siegecraft: { label: 'Siegecraft', family: 'war' }, command: { label: 'Command', family: 'war' },
});
export const STUDY_FADE_YEARS = 3; // unused this long, a study begins to go

// The institutions of the capitals: a third tier above the grammar school.
// Each wants the certificate below it, an entrance examination, and the fee or
// a scholarship or a patron; each can turn a birth away at the door.
export const INSTITUTIONS = Object.freeze([
  Object.freeze({ id: 'university', label: 'The University', place: 'city', seat: 'the city', subjects: ['medicine', 'law', 'history', 'natural_philosophy'], tuition: 120, years: 3, lessons: 6, credential: 'degree', door: 'A certificate from a grammar school, and the fee.' }),
  Object.freeze({ id: 'war_college', label: 'The War College', place: 'citadel', seat: 'the citadel', subjects: ['command', 'siegecraft'], tuition: 120, years: 3, lessons: 6, credential: 'commission', door: 'Gentle birth, or a name made with a weapon; the bound and the owned are not taken.' }),
  Object.freeze({ id: 'collegium', label: 'The Collegium', place: 'tower', seat: 'the tower', subjects: ['thaumaturgy', 'natural_philosophy', 'astronomy'], tuition: 120, years: 3, lessons: 6, credential: 'licence', door: 'Some arcana already, and a region whose law allows the work.' }),
  Object.freeze({ id: 'seminary', label: 'The Seminary', place: 'sanctuary', seat: 'the sanctuary', subjects: ['theology', 'liturgy'], tuition: 60, years: 3, lessons: 6, credential: 'orders', door: 'Devotion the keepers can see, and three years of obedience.' }),
  Object.freeze({ id: 'law_school', label: 'The School of Law', place: 'city', seat: 'the city', subjects: ['law', 'advocacy', 'rhetoric'], tuition: 120, years: 3, lessons: 6, credential: 'clerkship', door: 'Letters, the certificate, and a tongue that has studied rhetoric or law.' }),
]);
export const institutionById = id => INSTITUTIONS.find(i => i.id === id) || null;
export const CREDENTIAL_LABELS = Object.freeze({ degree: 'a doctor of the University', commission: 'an officer’s commission', licence: 'a mage’s licence', orders: 'holy orders', clerkship: 'a clerk of the court' });

// What becomes of a classmate: told at twenty-five and again at forty.
const FATES = Object.freeze([
  { kind: 'risen', early: 'has a clerk’s stool at the chancery and a better coat than you', late: 'sits as a magistrate, and the people who were at school with you say so carefully' },
  { kind: 'risen', early: 'was taken into a counting house in the city', late: 'is master of a guild, and does not answer letters from school friends' },
  { kind: 'risen', early: 'holds a lieutenant’s place in the garrison', late: 'commands the garrison, and is said to be hard' },
  { kind: 'ordinary', early: 'married, and keeps the family shop', late: 'keeps the shop still, and talks about school as if it were a war you were both in' },
  { kind: 'ordinary', early: 'teaches small children their letters in a village you have not heard of', late: 'still teaches there, and is loved by people you will never meet' },
  { kind: 'fallen', early: 'drinks, and borrows', late: 'is dead of drink, and owed money to everyone who ever liked them' },
  { kind: 'fallen', early: 'was put out of the archive for a forgery nobody could prove', late: 'is on trial for heresy in the capital, and the pamphlets use the name you knew' },
  { kind: 'dead', early: 'died of a fever the winter after you left school', late: 'has been dead fifteen years; you are one of the few who remembers the voice' },
]);

// The crafts a master will take an apprentice for.
export const BOND_CRAFTS = Object.freeze(['blacksmith', 'miner', 'herbalist', 'farmer', 'innkeeper']);
export const BOND_YEARS = 3;

export const SCHOOLING_EVENTS = { ids: () => ({ schooling_rival: ['contest', 'yield', 'cheat'], schooling_temper: ['endure', 'answer', 'run'] }) };

const edition = s => !!s?.hero?.station;
const means = s => s.hero.station?.id;
const wealthy = s => ['trade', 'gentry', 'noble', 'royal'].includes(means(s));
const high = s => ['gentry', 'noble', 'royal'].includes(means(s));
// A line in the book. Written literal, so the engine's action receipt ("Sit the examination. 2 days passed.") does not overwrite it.
const note = (ctx, title, text, tag = 'education') => (ctx?.journalLiteral || ctx?.journal)?.(title, text, tag);

export function initializeSchooling(s) {
  if (!edition(s) || !s.education) return;
  if (!s.education.schooling) s.education.schooling = { version: 1, literate: false, letters: null, shrinePlace: null, tuitionPaid: {}, electives: [], scholarship: null, entrance: {}, lettersLessons: 0, studies: {}, classmates: [], institution: null, bond: null, pending: null, credentials: [] };
}
/** The schooling record. A first-slice record (v0.64.0) gains the second slice's fields empty. */
export const schooling = s => {
  const k = s.education?.schooling; if (!k) return null;
  if (!k.studies) { k.studies = {}; k.classmates = []; k.institution = null; k.bond = null; k.pending = null; k.credentials = []; }
  return k;
};
/** Older saves could always read; on a new life letters are earned. */
export function isLiterate(s) { const k = schooling(s); return !k || k.literate; }
export function tier1Certificate(s) { return (s.education?.qualifications || []).some(q => TIERS[q.route] === 1 && q.route !== 'apprenticeship'); }
export function tier2Certificate(s) { return (s.education?.qualifications || []).some(q => TIERS[q.route] === 2); }
export function hasElective(s, id) { return (schooling(s)?.electives || []).some(e => e.id === id && e.grade !== null); }

function learnLetters(s, how, ctx, text) {
  const k = schooling(s); if (!k || k.literate) return false;
  k.literate = true; k.letters = how;
  note(ctx, 'Letters', text, 'education');
  return true;
}

/** Who teaches a child to read without a school: a tutor in a high house, a
 * literate trade household at its own table. Called on birthdays. */
export function onSchoolingBirthday(s, ctx = {}) {
  const k = schooling(s); if (!k || s.phase === 'retired') return;
  if (!k.literate && high(s) && s.age >= 8) learnLetters(s, 'tutor', ctx, 'A tutor comes to the house three mornings a week. By eight you can read the family’s own name on its deeds, and most of what is under it.');
  else if (!k.literate && means(s) === 'trade' && s.family?.literate && s.age >= 10 && seededRoll(s.seed, 'letters:trade', 100) < 70) learnLetters(s, 'home', ctx, 'You learned your letters at the counting table, between the columns, because the house needed another pair of eyes that could read a bill.');
  // The shrine keeper takes one pupil in a while. Whether that is you is decided once.
  if (k.shrinePlace === null && s.age >= 6) {
    const chance = high(s) ? 100 : means(s) === 'trade' ? 60 : means(s) === 'common' ? 40 : s.family?.literate ? 20 : 8;
    const tie = s.hero.station?.ties?.some(t => t.kind === 'knows') ? 10 : 0;
    k.shrinePlace = seededRoll(s.seed, 'letters:shrine-place', 100) < chance + tie;
  }
}

/** Why a school will not have you, beyond station: letters, money, a place. */
export function schoolingAdmissionReason(s, route) {
  const k = schooling(s); if (!k) return null;
  if (route === 'shrine') return k.shrinePlace === false ? 'The keeper has his one pupil, and it is not you.' : null;
  if (route === 'community') return canPayTuition(s, route) ? null : `The schoolmaster wants ${TUITION.community} gold a year, and the house has not got it.`;
  if (route === 'academy') {
    if (!k.literate) return 'The grammar school does not teach letters; it expects them.';
    if (k.entrance.academy !== 'passed') return k.entrance.academy === 'failed' && k.entrance.academyYear === s.age ? 'You failed the entrance examination this year. Next year, if you dare.' : 'Sit the entrance examination first.';
    if (!s.education.scholarship && !canPayTuition(s, route)) return `Tuition is ${TUITION.academy} gold a year, and nobody will pay it for you.`;
  }
  return null;
}
/** What the school asks for today: the year's fee, unless it is already paid, the
 * scholarship covers it, or a wealthy house pays for its child. Zero for older saves. */
export function tuitionDue(s, route) {
  const k = schooling(s); if (!k) return 0;
  const fee = TUITION[route] || 0;
  if (!fee || (route === 'academy' && s.education.scholarship) || k.tuitionPaid[route] === s.age) return 0;
  if (s.age < 18 && wealthy(s)) return 0;
  return fee;
}
export function canPayTuition(s, route) { return s.hero.gold >= tuitionDue(s, route); }
/** Tuition is paid once a school year, at enrolment and at the first lesson of each year after.
 * The fee is the action's displayed cost, so the engine has usually taken it already
 * (`charged`); this records the year and writes the line. */
export function payTuition(s, route, ctx = {}, { charged = false } = {}) {
  const k = schooling(s); if (!k) return true;
  const fee = tuitionDue(s, route);
  if (!fee) { if (TUITION[route]) k.tuitionPaid[route] = s.age; return true; }
  if (!charged) { if (s.hero.gold < fee) return false; s.hero.gold -= fee; }
  k.tuitionPaid[route] = s.age;
  note(ctx, 'Tuition', `${fee} gold to the schoolmaster, for the year. Letters are not given away.`, 'education');
  return true;
}

/** A pass at a tier-one school is letters. */
export function onQualification(s, route, ctx = {}) {
  if (TIERS[route] === 1 && route !== 'apprenticeship') learnLetters(s, 'school', ctx, 'You can read. Most of the people you know cannot, and will ask you to.');
}

// Aptitude: what a lesson is worth to this pupil.
export function lessonPerformance(s) {
  let gain = 4;
  if (hasNature(s, 'curious') || hasNature(s, 'diligent')) gain += 2;
  if (hasNature(s, 'impatient') || hasNature(s, 'indolent')) gain -= 2;
  if ((s.life?.stress || 0) >= 70) gain -= 2;
  return Math.max(1, gain);
}
function examChance(s, base) {
  const intellect = s.hero.attributes?.intellect || 3, perf = s.education?.performance || 50;
  let chance = base + (intellect - 3) * 6 + Math.round((perf - 50) / 4);
  if (hasNature(s, 'curious') || hasNature(s, 'diligent')) chance += 10;
  if (hasNature(s, 'impatient')) chance -= 10;
  if ((s.life?.stress || 0) >= 70) chance -= 10;
  return Math.max(5, Math.min(95, chance));
}

/** The scholarship examination: a handful of places, once in a life. */
export function scholarshipExam(s, ctx = {}) {
  const k = schooling(s); if (!k || k.scholarship || !k.literate || s.age < 12 || s.age > 15) return false;
  const chance = examChance(s, 25), passed = seededRoll(s.seed, `exam:scholarship:${s.age}`, 100) < chance;
  k.scholarship = passed ? 'passed' : 'failed';
  if (passed) { s.education.scholarship = true; k.entrance.academy = 'passed'; }
  note(ctx, passed ? 'A place' : 'No place', passed
    ? 'Three places, forty children, and one of them was yours. The grammar school will take you without a fee, and will remind you of it.'
    : 'Three places, forty children. You were not one of the three. There is no second sitting.', 'education');
  return passed;
}
/** The grammar school's entrance examination, once a year from twelve. */
export function entranceExam(s, ctx = {}) {
  const k = schooling(s); if (!k || !k.literate || s.age < 12 || k.entrance.academy === 'passed' || k.entrance.academyYear === s.age) return false;
  const chance = examChance(s, 45), passed = seededRoll(s.seed, `exam:entrance:${s.age}`, 100) < chance;
  k.entrance.academy = passed ? 'passed' : 'failed'; k.entrance.academyYear = s.age;
  note(ctx, passed ? 'Admitted' : 'Turned away', passed
    ? 'A page read aloud, a sum, a question about the old kings. The master nods once. You are in, if the fee is paid.'
    : 'A page read aloud, a sum you could not finish. The master does not look up when he says next year.', 'education');
  return passed;
}

/** Electives: one a year in the grammar years, four lessons each, then a grade. */
export function electiveOffer(s) {
  const k = schooling(s); if (!k || s.education?.route !== 'academy' || !s.education.enrolled || s.age < 12) return null;
  if (k.electives.some(e => e.age === s.age)) return null;
  const taken = new Set(k.electives.map(e => e.id)), pool = ELECTIVES.filter(e => !taken.has(e.id));
  if (!pool.length) return null;
  const start = seededRoll(s.seed, `elective:offer:${s.age}`, pool.length), rows = [];
  for (let i = 0; i < Math.min(4, pool.length); i++) rows.push(pool[(start + i) % pool.length]);
  return rows;
}
export function chooseElective(s, id, ctx = {}) {
  const k = schooling(s), e = electiveById(id); if (!k || !e || k.electives.some(r => r.age === s.age)) return false;
  k.electives.push({ id, age: s.age, lessons: 0, grade: null });
  note(ctx, e.label, `This year’s elective: ${e.label.toLowerCase()}. ${e.line}`, 'education');
  return true;
}
export function onElectiveLesson(s, ctx = {}) {
  const k = schooling(s); if (!k) return;
  const current = k.electives.find(r => r.age === s.age && r.grade === null); if (!current) return;
  current.lessons++;
  if (current.lessons >= 4) {
    const e = electiveById(current.id), perf = s.education.performance || 50;
    // The master's grade: effort shows, aptitude shows, and nobody gets a hundred for turning up.
    const grade = Math.max(20, Math.min(100, 40 + Math.round((perf - 50) * 0.8) + ((s.hero.attributes?.intellect || 3) - 3) * 3 + (hasNature(s, 'curious') ? 8 : 0) - (hasNature(s, 'impatient') ? 8 : 0) + seededRoll(s.seed, `elective:grade:${current.id}:${s.age}`, 15) - 7));
    current.grade = grade;
    if (e && Number.isFinite(s.hero.skills[e.skill])) s.hero.skills[e.skill] += grade >= 70 ? 2 : 1;
    advanceStudy(s, current.id, grade >= 70 ? 3 : 2);
    note(ctx, `${e.label}, examined`, grade >= 80 ? `${e.label}: the master wrote "excellent" and underlined it, which he does not do.` : grade >= 60 ? `${e.label}: a fair grade, honestly earned.` : `${e.label}: you passed, barely. The master remembers the ones who barely pass.`, 'education');
  }
}

/** Adults learn their letters at the archive, four lessons at a time. */
export function lettersLesson(s, ctx = {}) {
  const k = schooling(s); if (!k || k.literate) return false;
  k.lettersLessons = (k.lettersLessons || 0) + 1;
  if (k.lettersLessons >= LETTERS_LESSONS) learnLetters(s, 'self', ctx, 'Four afternoons with the archivist and a slate. The letters stopped swimming. You are the first in your family who can read, and you are not sure yet what it is for.');
  else note(ctx, 'The slate', `Lesson ${k.lettersLessons} of ${LETTERS_LESSONS}. The archivist is patient; the letters are not.`, 'education');
  return true;
}

/** The learned trades ask for letters and schooling the unlettered do not have. */
export function credentialReason(s, professionId) {
  if (!edition(s) || !schooling(s)) return null;
  const literate = isLiterate(s);
  const bond = bondReason(s, professionId); if (bond) return bond;
  switch (professionId) {
    case 'healer': return literate && (tier2Certificate(s) || hasElective(s, 'anatomy') || studyLevel(s, 'medicine') >= 3) ? null : 'The healers ask for letters and a schooling you do not have.';
    case 'scholar': return literate && (tier2Certificate(s) || hasCredential(s, 'degree')) ? null : literate ? 'The archive takes no one without a grammar school certificate.' : 'The archive takes no one who cannot read.';
    case 'cartographer': return literate ? null : 'A map is letters and numbers before it is anything else.';
    case 'merchant': return literate || wealthy(s) ? null : 'A merchant who cannot read a bill of lading is a mark, and the guild knows it.';
    case 'alchemist': return literate && (hasElective(s, 'natural_philosophy') || studyLevel(s, 'natural_philosophy') >= 3 || hasCredential(s, 'licence') || (s.hero.skills?.arcana || 0) >= 2) ? null : 'The alchemists want letters and some natural philosophy before they let you near the fire.';
    default: return null;
  }
}


// ---------------------------------------------------------------------------
// Studies: finer than a skill, and they fade.
export function studyLevel(s, id) { return schooling(s)?.studies?.[id]?.level || 0; }
export function advanceStudy(s, id, amount = 1) {
  const k = schooling(s); if (!k || !SUBJECTS[id]) return 0;
  const row = k.studies[id] || (k.studies[id] = { level: 0, peak: 0, lastDay: s.day });
  row.level = Math.min(10, row.level + amount); row.peak = Math.max(row.peak, row.level); row.lastDay = s.day;
  return row.level;
}
/** A study unused for three years loses a level a year, down to half of what it reached. What was learned to the bone stays. */
export function fadeStudies(s, ctx = {}) {
  const k = schooling(s); if (!k) return;
  const gone = [];
  for (const [id, row] of Object.entries(k.studies)) {
    const floor = Math.ceil(row.peak / 2);
    if (row.level > floor && s.day - row.lastDay >= STUDY_FADE_YEARS * 365) { row.level--; if (row.level === floor) gone.push(SUBJECTS[id]?.label || id); }
  }
  if (gone.length) note(ctx, 'What the years took', `${gone.join(', ')}: you reach for it and find the shape of it, not the thing. What you learned to the bone is still there.`, 'education');
}
/** Using a study in life keeps it: called by anything that leans on a subject. */
export function useStudy(s, id) { const row = schooling(s)?.studies?.[id]; if (row) row.lastDay = s.day; }

// ---------------------------------------------------------------------------
// Credentials: what an institution's examination gives, and what it opens.
export function hasCredential(s, kind) { return (schooling(s)?.credentials || []).some(c => c.kind === kind); }
export function credentials(s) { return (schooling(s)?.credentials || []).map(c => ({ ...c, label: CREDENTIAL_LABELS[c.kind] || c.kind, institution: institutionById(c.institution)?.label || c.institution, majorLabel: SUBJECTS[c.major]?.label || c.major })); }

/** Where an institution sits in this world: the first settlement of its kind. */
export function institutionLocation(s, inst) {
  const def = typeof inst === 'string' ? institutionById(inst) : inst; if (!def) return null;
  const rows = s.world?.locations || [];
  return (rows.find(l => l.type === def.place && l.id !== 'spire') || rows.find(l => l.type === 'city'))?.id || null;
}
/** Why the door is shut, before the examination: birth, the tier below, the subject's own demands, the law. */
export function institutionDoorReason(s, inst, { publicMagic = null } = {}) {
  const k = schooling(s), def = typeof inst === 'string' ? institutionById(inst) : inst; if (!k || !def) return 'There is no such place.';
  if (s.age < 16) return 'The institutions take no one under sixteen.';
  if (s.age > 30) return 'Past thirty nobody sits the entrance; the benches are for the young.';
  if (!tier2Certificate(s)) return 'A grammar school certificate first. They do not teach what the grammar school teaches.';
  switch (def.id) {
    case 'war_college': if (s.hero.station?.freedom !== 'free') return 'The War College does not commission the bound.'; if (!high(s) && (s.hero.skills?.weapons || 0) < 3) return 'The War College wants gentle birth, or a name already made with a weapon.'; break;
    case 'collegium': if ((s.hero.skills?.arcana || 0) < 2) return 'The Collegium wants to see some arcana before it teaches any.'; if (publicMagic === 'forbidden') return 'The law here forbids the work; the Collegium teaches where it is allowed.'; break;
    case 'seminary': if ((s.hero.skills?.devotion || 0) < 2) return 'The keepers want devotion they can see before they take a novice.'; break;
    case 'law_school': if (!hasElective(s, 'law') && !hasElective(s, 'rhetoric') && studyLevel(s, 'law') < 2 && studyLevel(s, 'rhetoric') < 2) return 'The School of Law wants a tongue that has studied rhetoric or law already.'; break;
    default: break;
  }
  return null;
}
/** The entrance examination of an institution, once a year. */
export function institutionEntrance(s, instId, ctx = {}) {
  const k = schooling(s), def = institutionById(instId); if (!k || !def || k.entrance[instId] === 'passed' || k.entrance[`${instId}Year`] === s.age) return false;
  const chance = examChance(s, 40), passed = seededRoll(s.seed, `exam:${instId}:${s.age}`, 100) < chance;
  k.entrance[instId] = passed ? 'passed' : 'failed'; k.entrance[`${instId}Year`] = s.age;
  note(ctx, passed ? `${def.label} will have you` : `${def.label} will not`, passed
    ? `Three examiners, a long table, and your name read out at the end with the ones who are in. ${def.tuition} gold a year, unless someone else pays it.`
    : 'Three examiners, a long table, and your name not among the ones read out. There is next year, and the fee for the sitting is not returned.', 'education');
  return passed;
}
/** Who might pay: the scholarship (one place, one sitting), a classmate who rose, a family friend, or a high house for its own child. */
export function institutionPatron(s, instId) {
  const k = schooling(s); if (!k) return null;
  if (k.institution?.id === instId && k.institution.patron) return k.institution.patron;
  if (s.age <= 25 && high(s)) return { kind: 'house', name: 'the house' };
  const risen = (k.classmates || []).find(c => c.fate?.kind === 'risen' && c.standing >= 0);
  if (risen && seededRoll(s.seed, `patron:classmate:${instId}`, 100) < 60) return { kind: 'classmate', name: risen.name };
  const friend = s.hero.station?.ties?.find(t => t.kind === 'knows');
  if (friend && seededRoll(s.seed, `patron:friend:${instId}`, 100) < 30) return { kind: 'friend', name: friend.name };
  return null;
}
export function institutionScholarship(s, instId, ctx = {}) {
  const k = schooling(s), def = institutionById(instId); if (!k || !def || k.entrance[instId] !== 'passed' || k.entrance[`${instId}Scholarship`]) return false;
  const chance = examChance(s, 15), passed = seededRoll(s.seed, `exam:${instId}:scholarship`, 100) < chance;
  k.entrance[`${instId}Scholarship`] = passed ? 'passed' : 'failed';
  note(ctx, passed ? 'The one place' : 'Not the one place', passed ? `${def.label} keeps one place a year for someone who cannot pay. This year it is yours.` : `${def.label} keeps one place a year for someone who cannot pay. It went to someone else.`, 'education');
  return passed;
}
/** The year's fee at an institution: nothing if the scholarship or a patron carries it. */
export function institutionDue(s, instId) {
  const k = schooling(s), def = institutionById(instId); if (!k || !def) return 0;
  if (k.entrance[`${instId}Scholarship`] === 'passed') return 0;
  if (k.institution?.id === instId) { if (k.institution.tuitionPaid === s.age) return 0; if (k.institution.patron) return 0; return def.tuition; }
  return institutionPatron(s, instId) ? 0 : def.tuition;
}
/** Enrol: the first year's fee is the action's cost (taken by the engine), a major is chosen, the years begin. */
export function enrolInstitution(s, instId, major, ctx = {}) {
  const k = schooling(s), def = institutionById(instId); if (!k || !def || k.institution || k.entrance[instId] !== 'passed' || !def.subjects.includes(major)) return false;
  const patron = k.entrance[`${instId}Scholarship`] === 'passed' ? null : institutionPatron(s, instId);
  k.institution = { id: instId, major, from: s.age, lessons: 0, lessonsThisYear: 0, year: s.age, tuitionPaid: s.age, patron, scholarship: k.entrance[`${instId}Scholarship`] === 'passed', degree: null, sat: null };
  const who = k.institution.scholarship ? 'The scholarship pays.' : patron ? (patron.kind === 'house' ? 'The house pays, and says so at supper.' : patron.kind === 'classmate' ? `${patron.name}, who was at school with you, pays the fee and expects to be remembered.` : `${patron.name}, who knew your family, pays the fee and will want something one day.`) : `${def.tuition} gold a year, from your own purse.`;
  note(ctx, def.label, `You are read into the rolls of ${def.label} in ${SUBJECTS[major]?.label.toLowerCase() || major}. ${who} Three years, if you last them.`, 'education');
  ctx.standing?.('academy', 4);
  return true;
}
/** A lesson at the institution: five days, six a year; the major deepens. */
export function institutionLesson(s, ctx = {}) {
  const k = schooling(s), i = k?.institution; if (!i || i.degree) return false;
  if (i.year !== s.age) { i.year = s.age; i.lessonsThisYear = 0; }
  if (i.lessonsThisYear >= institutionById(i.id).lessons) return false;
  i.lessons++; i.lessonsThisYear++;
  s.education.performance = Math.max(0, Math.min(100, (s.education.performance || 50) + lessonPerformance(s) - 1));
  if (i.lessons % 2 === 0) advanceStudy(s, i.major, 1);
  if (i.lessons % 3 === 0) { const second = institutionById(i.id).subjects.find(x => x !== i.major); if (second) advanceStudy(s, second, 1); }
  const skill = { medicine: 'devotion', law: 'scholarship', history: 'scholarship', natural_philosophy: 'arcana', command: 'weapons', siegecraft: 'defense', thaumaturgy: 'arcana', astronomy: 'arcana', theology: 'devotion', liturgy: 'devotion', advocacy: 'persuasion', rhetoric: 'persuasion' }[i.major];
  if (skill && i.lessons % 3 === 0 && Number.isFinite(s.hero.skills[skill])) s.hero.skills[skill]++;
  note(ctx, 'A lecture', i.lessons === 1 ? 'The first lecture. You understand one sentence in three and write all of them down.' : `Lecture ${i.lessons}. ${i.lessons % 6 === 0 ? 'The year’s last; the examiners’ names are posted.' : 'You understand more than you did.'}`, 'education');
  return true;
}
/** The year's fee comes due with the first lecture of each new year. */
export function institutionYearDue(s) {
  const k = schooling(s), i = k?.institution; if (!i || i.degree || i.tuitionPaid === s.age || i.scholarship || i.patron) return 0;
  return institutionById(i.id).tuition;
}
export function payInstitutionYear(s, ctx = {}) {
  const i = schooling(s)?.institution; if (!i) return;
  if (i.tuitionPaid !== s.age) { const fee = institutionYearDue(s); i.tuitionPaid = s.age; if (fee) note(ctx, 'The fee', `${fee} gold to the bursar for the year. He counts it twice.`, 'education'); }
}
export function institutionExamReason(s) {
  const k = schooling(s), i = k?.institution; if (!i) return 'You are not read into any institution.';
  if (i.degree) return 'You have your degree.';
  const def = institutionById(i.id);
  if (s.age < i.from + def.years) return `The final examination comes after ${def.years} years; you have ${s.age - i.from}.`;
  if (i.lessons < def.lessons * def.years - 3) return `You have missed too many lectures (${i.lessons} of ${def.lessons * def.years}).`;
  if (i.sat === s.age) return 'You sat this year. Next year, if you dare.';
  return null;
}
/** The final examination: the degree, or another year's fee. */
export function institutionExam(s, ctx = {}) {
  const k = schooling(s), i = k?.institution; if (!i || institutionExamReason(s)) return false;
  const def = institutionById(i.id), chance = examChance(s, 55) + studyLevel(s, i.major) * 2, passed = seededRoll(s.seed, `exam:${i.id}:final:${s.age}`, 100) < Math.min(95, chance);
  i.sat = s.age;
  if (!passed) { note(ctx, 'Not this year', `The examiners confer for a long time and tell you to come back in a year. ${i.patron ? i.patron.name + ' will hear of it.' : 'The bursar will want another year’s fee.'}`, 'education'); s.life && (s.life.stress = Math.min(100, (s.life.stress || 0) + 8)); return false; }
  const grade = Math.max(60, Math.min(100, 55 + Math.round(((s.education.performance || 50) - 50) / 2) + studyLevel(s, i.major) + seededRoll(s.seed, `degree:grade:${i.id}`, 12)));
  i.degree = { age: s.age, grade };
  k.credentials.push({ kind: def.credential, institution: def.id, major: i.major, age: s.age, grade });
  applyCredential(s, def, ctx);
  note(ctx, CREDENTIAL_LABELS[def.credential][0].toUpperCase() + CREDENTIAL_LABELS[def.credential].slice(1), `${def.label} makes you ${CREDENTIAL_LABELS[def.credential]}, in ${SUBJECTS[i.major]?.label.toLowerCase() || i.major}, with a grade of ${grade}. Most of the people you grew up with will never know what that means, and some of them will hate it.`, 'education');
  ctx.standing?.('academy', 12);
  return true;
}
function applyCredential(s, def, ctx) {
  switch (def.credential) {
    case 'degree': s.flags.certified = true; break;                       // the healers' and the archive's wages know a doctor
    case 'commission': if (s.life?.career) s.life.career.rank = Math.max(s.life.career.rank || 0, 1); break; // an officer draws an officer's pay
    case 'licence': s.flags.mageLicence = true; break;                    // the law's word for a mage who may work in the open
    case 'orders': s.flags.ordained = true; break;
    case 'clerkship': s.flags.certified = true; break;                    // a clerk reads every paper put in front of them
    default: break;
  }
}
/** Standing for the educated: a degree is received at court and by the guilds, and resented in the street. Called on birthdays. */
export function educatedStanding(s, ctx = {}) {
  const k = schooling(s); if (!k || !k.credentials.length) return;
  ctx.standing?.('academy', 1);
  if (!wealthy(s) && seededRoll(s.seed, `resent:${s.age}`, 100) < 20) {
    s.life && (s.life.stress = Math.min(100, (s.life.stress || 0) + 3));
    note(ctx, 'Scholar', 'Someone you grew up with calls you scholar in the street, and does not mean it kindly. Your coat is better than theirs and you both know how.', 'education');
  }
}

// ---------------------------------------------------------------------------
// Classmates: the two who sat beside you at the grammar school, and stayed in the story.
export function makeClassmates(s, ctx = {}) {
  const k = schooling(s); if (!k || k.classmates.length || s.education?.route !== 'academy') return [];
  const subjects = ['rhetoric', 'law', 'astronomy', 'anatomy', 'accounting', 'heraldry'];
  for (let i = 0; i < 2; i++) {
    const name = generatePersonName(s.seed, `classmate:${i}`), subject = subjects[seededRoll(s.seed, `classmate:subject:${i}`, subjects.length)];
    const natures = ['proud', 'quiet', 'quick', 'kind', 'sly'].filter(n => !k.classmates.some(c => c.nature === n));
    const nature = natures[seededRoll(s.seed, `classmate:nature:${i}`, natures.length)];
    k.classmates.push({ id: `classmate-${i}`, name, subject, nature, standing: 0, bornDay: s.day - s.age * 365 + (seededRoll(s.seed, `classmate:born:${i}`, 365) - 182), fate: null, contests: [], memories: [] });
  }
  note(ctx, 'The bench', `Two names you will know for the rest of your life: ${k.classmates[0].name}, ${k.classmates[0].nature}, and ${k.classmates[1].name}, ${k.classmates[1].nature}. You sit between them because nobody else would.`, 'education');
  return k.classmates;
}
/** Once a year at the grammar school, a prize is contested with a classmate. Set when the year's lessons pass the halfway mark. */
export function queueRivalry(s) {
  const k = schooling(s); if (!k || !k.classmates.length || s.education?.route !== 'academy' || !s.education.enrolled || k.pending) return;
  if (k.classmates.some(c => c.contests.some(x => x.age === s.age))) return;
  const who = k.classmates[seededRoll(s.seed, `rival:who:${s.age}`, k.classmates.length)];
  k.pending = { kind: 'rival', classmateId: who.id, age: s.age };
}
export function flushSchoolingEvent(s, ctx = {}) {
  const k = s.education?.schooling; if (!k?.pending || s.event || s.battle || s.phase === 'retired') return false;
  const p = k.pending;
  if (p.kind === 'rival') {
    const c = k.classmates.find(x => x.id === p.classmateId); if (!c) { k.pending = null; return false; }
    const subject = SUBJECTS[c.subject]?.label.toLowerCase() || c.subject;
    ctx.setEvent?.('schooling_rival', `The ${subject} prize`, 'At school', `The master has set the ${subject} prize between you and ${c.name}${c.nature === 'proud' ? ', who has already told people it is theirs' : c.nature === 'quiet' ? ', who has said nothing and worked all winter' : c.nature === 'sly' ? ', who has been very friendly lately' : c.nature === 'kind' ? ', who would be glad for you if you won, which is worse' : ', who is quicker than you and knows it'}. The school will remember who took it.`, [
      { id: 'contest', label: 'Contest it', description: 'Your work against theirs, before the master.' },
      { id: 'yield', label: `Let ${c.name} have it`, description: 'Say your piece badly on purpose. They will know, or they will not.' },
      ...(hasNature(s, 'deceitful') ? [{ id: 'cheat', label: 'Get their notes the night before', description: 'The sly way. If it comes out, the master does not forget.', nature: 'deceitful' }] : []),
    ]);
    return true;
  }
  if (p.kind === 'temper') {
    const b = k.bond; if (!b) { k.pending = null; return false; }
    ctx.setEvent?.('schooling_temper', 'The master’s temper', 'At the bench', `${b.master} has a temper, and today it is yours. A piece spoiled, a word said wrong, a morning late. The hand comes down. Everyone in the yard has had it; the bond says you take it.`, [
      { id: 'endure', label: 'Take it', description: 'As every apprentice has. It passes, and the work goes on.' },
      { id: 'answer', label: 'Answer back', description: 'Say what is fair. The master is not used to it, and the yard is listening.' },
      { id: 'run', label: 'Walk out of the yard', description: 'Break the bond here, with nothing settled. The master will not forgive it and the guild will know.' },
    ]);
    return true;
  }
  k.pending = null; return false;
}
export function applySchoolingChoice(s, eventId, pick, ctx = {}) {
  const k = schooling(s); if (!k?.pending) return false;
  if (eventId === 'schooling_rival' && k.pending.kind === 'rival') {
    const c = k.classmates.find(x => x.id === k.pending.classmateId); k.pending = null; if (!c) return true;
    const subject = SUBJECTS[c.subject]?.label.toLowerCase() || c.subject;
    // Peers: the two beside you were admitted the same way, and work as hard as the school asks of everyone.
    const perf = s.education.performance || 50;
    const mine = perf + ((s.hero.attributes?.intellect || 3) - 3) * 4 + studyLevel(s, c.subject) * 2 + seededRoll(s.seed, `rival:mine:${s.age}`, 30);
    const theirs = 20 + Math.round(perf * 0.8) + (c.nature === 'quick' ? 12 : c.nature === 'quiet' ? 10 : c.nature === 'proud' ? 6 : 0) + c.contests.filter(x => !x.won).length * 2 + seededRoll(s.seed, `rival:theirs:${s.age}`, 30);
    let won = false, text;
    if (pick === 'yield') { c.standing++; text = `You let ${c.name} take the ${subject} prize, and said your piece badly enough that nobody but ${c.name} knew. They knew.`; c.memories.push(`You let them have the ${subject} prize at ${s.age}.`); }
    else if (pick === 'cheat') { won = seededRoll(s.seed, `rival:cheat:${s.age}`, 100) < 70; if (won) { c.standing -= 2; text = `You took the ${subject} prize with ${c.name}’s own notes, copied by candle. ${c.name} does not know how. The master, perhaps, suspects.`; } else { c.standing -= 2; s.education.performance = Math.max(0, (s.education.performance || 50) - 10); text = `The master found ${c.name}’s notes in your hand. The prize went to ${c.name}; your name went into a book the master keeps.`; } c.memories.push(`Their notes went missing before the ${subject} prize at ${s.age}.`); }
    else { won = mine >= theirs; text = won ? `The ${subject} prize is yours. ${c.name} shook your hand in front of the master and did not look at you for a week.` : `${c.name} took the ${subject} prize. You were second, which is the same as last.`; if (won) c.standing--; else c.standing++; c.memories.push(won ? `You beat them to the ${subject} prize at ${s.age}.` : `They beat you to the ${subject} prize at ${s.age}.`); }
    c.standing = Math.max(-3, Math.min(3, c.standing));
    c.contests.push({ age: s.age, subject: c.subject, won, pick });
    if (won) { advanceStudy(s, c.subject, 2); s.education.performance = Math.min(100, (s.education.performance || 50) + 4); }
    useStudy(s, c.subject);
    note(ctx, `The ${subject} prize`, text, 'education');
    return true;
  }
  if (eventId === 'schooling_temper' && k.pending.kind === 'temper') {
    const b = k.bond; k.pending = null; if (!b) return true;
    if (pick === 'endure') { s.life && (s.life.stress = Math.min(100, (s.life.stress || 0) + 6)); s.hero.hp = Math.max(1, s.hero.hp - 2); note(ctx, 'The master’s temper', `${b.master}’s hand came down and you took it, as the bond says. The yard went back to work. So did you.`, 'education'); }
    else if (pick === 'answer') { const held = seededRoll(s.seed, `temper:answer:${s.age}`, 100) < 50; s.life && (s.life.stress = Math.min(100, (s.life.stress || 0) + (held ? 2 : 10))); b.temper = (b.temper || 0) + (held ? -1 : 1); note(ctx, 'The master’s temper', held ? `You said what was fair, and ${b.master} looked at you a long moment and said nothing. The yard noticed. The hand has not come down since.` : `You said what was fair and ${b.master} made you sorry for it in front of the yard. The bond has a year less of patience in it.`, 'education'); }
    else { breakBond(s, ctx, 'ran'); }
    return true;
  }
  k.pending = null; return false;
}
/** What became of them: told at twenty-five, and again at forty. Called on birthdays. */
export function classmateFates(s, ctx = {}) {
  const k = schooling(s); if (!k?.classmates.length) return;
  for (const [i, c] of k.classmates.entries()) {
    if (s.age >= 25 && !c.fate) {
      let idx = seededRoll(s.seed, `fate:${i}`, FATES.length);
      while (k.classmates.some(o => o !== c && o.fate && o.fate.early === FATES[idx].early)) idx = (idx + 1) % FATES.length; // two lives, two fates
      const fate = FATES[idx];
      c.fate = { kind: fate.kind, early: fate.early, late: fate.late, told: 'early' };
      const beat = c.contests.filter(x => x.won).length, lost = c.contests.filter(x => !x.won && x.pick === 'contest').length;
      note(ctx, c.name, `Word of ${c.name}${beat > lost ? ', whom you beat for the prize' : lost > beat ? ', who beat you for the prize' : ''}: ${c.name} ${fate.early}.`, 'education');
    } else if (s.age >= 40 && c.fate && c.fate.told === 'early') {
      c.fate.told = 'late';
      note(ctx, c.name, `${c.name}, who sat beside you at school, ${c.fate.late}.`, 'education');
      if (c.fate.kind === 'risen' && c.standing >= 1) ctx.standing?.('academy', 3);
    }
  }
}

// ---------------------------------------------------------------------------
// The apprenticeship as a bond: years of low pay, a master's temper, and a bond to break.
export function bondCraft(s) { return BOND_CRAFTS[seededRoll(s.seed, 'bond:craft', BOND_CRAFTS.length)]; }
export function bindApprentice(s, master, ctx = {}) {
  const k = schooling(s); if (!k || k.bond) return false;
  const craft = bondCraft(s); master = String(master).replace(/^Tutor /, 'Master ');
  k.bond = { craft, master, from: s.day, fromAge: s.age, until: s.day + BOND_YEARS * 365, lessons: 0, broken: null, temper: 0, done: false };
  note(ctx, 'The bond', `Your mark on ${master}’s paper, and ${master}’s on yours. ${BOND_YEARS} years at the ${craft === 'blacksmith' ? 'forge' : craft === 'miner' ? 'face' : craft === 'herbalist' ? 'drying racks' : craft === 'farmer' ? 'plough' : 'taproom'}, bed and board and two gold a lesson, and the trade at the end of it if you last. Break it and the guild will know your name.`, 'education');
  return true;
}
export function bondReason(s, professionId) {
  const b = schooling(s)?.bond; if (!b || b.broken || b.done) return null;
  if (professionId && professionId === b.craft) return null;
  const years = Math.max(1, Math.ceil((b.until - s.day) / 365));
  return `You are bound to ${b.master}’s bench for ${years} more year${years === 1 ? '' : 's'}.`;
}
/** A lesson at the bench: low pay, the trade's own skill, and once a year the master's temper. */
export function onBondLesson(s, ctx = {}) {
  const k = schooling(s), b = k?.bond; if (!b || b.broken || b.done) return;
  b.lessons++; s.hero.gold += 2;
  const skill = { blacksmith: 'defense', miner: 'survival', herbalist: 'survival', farmer: 'survival', innkeeper: 'persuasion' }[b.craft];
  if (skill && b.lessons % 3 === 0 && Number.isFinite(s.hero.skills[skill])) s.hero.skills[skill]++;
  if (!k.pending && b.lessons % 4 === 2 && !(b.temperYears || []).includes(s.age) && seededRoll(s.seed, `temper:${s.age}`, 100) < 60 + b.temper * 10) { b.temperYears = [...(b.temperYears || []), s.age]; k.pending = { kind: 'temper', age: s.age }; }
}
/** Breaking the bond: a forfeit if you can pay it, the master's hatred if you cannot. */
export function breakBond(s, ctx = {}, how = 'paid') {
  const k = schooling(s), b = k?.bond; if (!b || b.broken || b.done) return false;
  b.broken = { day: s.day, how };
  if (s.education.route === 'apprenticeship') { s.education.enrolled = false; }
  if (how === 'paid') { note(ctx, 'The bond, bought back', `Thirty gold on ${b.master}’s bench and your paper torn in two. ${b.master} says nothing, which is the worst thing ${b.master} could have said.`, 'education'); ctx.standing?.('villagers', -3); }
  else { addStationTie(s, { kind: 'hates', name: b.master, note: 'an apprentice who walked out of the yard' }); ctx.standing?.('villagers', -10); note(ctx, 'The bond, broken', `You walked out of ${b.master}’s yard with the bond unserved. The guild will hear it by the week’s end, and no master in this town will take your mark again.`, 'education'); }
  return true;
}
/** Three years served: the certificate, and a journeyman's start in the craft. */
export function completeBond(s, ctx = {}) {
  const k = schooling(s), b = k?.bond; if (!b || b.broken || b.done || s.day < b.until || b.lessons < 10) return false;
  b.done = true;
  const name = { blacksmith: 'Blacksmith', miner: 'Miner', herbalist: 'Herbalist', farmer: 'Farmer', innkeeper: 'Innkeeper' }[b.craft];
  const r = s.careers?.records?.[name]; if (r && r.experience < 90) { r.experience = 90; r.mastery = Math.max(r.mastery, 1); }
  k.credentials.push({ kind: 'journeyman', institution: 'apprenticeship', major: b.craft, age: s.age, grade: 60 + Math.min(40, b.lessons * 2) });
  note(ctx, 'Journeyman', `${BOND_YEARS} years served. ${b.master} gives you the paper and, after a moment, a hand. You are a journeyman ${b.craft}, and may hire your own.`, 'education');
  ctx.standing?.('villagers', 4);
  return true;
}
/** Birthdays: studies fade, fates arrive, the bond runs out, standing for the educated. */
export function onSchoolingYear(s, ctx = {}) {
  const k = schooling(s); if (!k || s.phase === 'retired') return;
  fadeStudies(s, ctx);
  classmateFates(s, ctx);
  educatedStanding(s, ctx);
  if (k.bond && !k.bond.broken && !k.bond.done && s.day >= k.bond.until) completeBond(s, ctx);
}

export function schoolingView(s) {
  const k = schooling(s); if (!k) return null;
  const i = k.institution, def = i ? institutionById(i.id) : null;
  return { literate: k.literate, letters: k.letters, scholarship: k.scholarship, entrance: k.entrance.academy || null, electives: k.electives.map(e => ({ ...e, label: electiveById(e.id)?.label || e.id })), tier: k.credentials.some(c => c.kind !== 'journeyman') ? 3 : tier2Certificate(s) ? 2 : tier1Certificate(s) ? 1 : 0,
    studies: Object.entries(k.studies).filter(([, r]) => r.level > 0).map(([id, r]) => ({ id, label: SUBJECTS[id]?.label || id, family: SUBJECTS[id]?.family, level: r.level, fading: r.level < r.peak })).sort((a, b) => b.level - a.level),
    credentials: credentials(s),
    institution: i ? { id: i.id, label: def?.label, major: SUBJECTS[i.major]?.label || i.major, year: Math.min(def?.years || 3, s.age - i.from + 1), years: def?.years || 3, lessons: i.lessons, degree: i.degree, patron: i.patron, scholarship: i.scholarship, locationId: institutionLocation(s, i.id) } : null,
    classmates: k.classmates.map(c => ({ ...c, subjectLabel: SUBJECTS[c.subject]?.label || c.subject, age: Math.max(0, Math.floor((s.day - c.bornDay) / 365)) })),
    bond: k.bond ? { ...k.bond, yearsLeft: Math.max(0, Math.ceil((k.bond.until - s.day) / 365)) } : null };
}

/** What each school is, on a new life, told as the town would tell it. Null for older saves. */
export function schoolDescription(s, route) {
  if (!schooling(s)) return null;
  const paid = s.age < 18 && wealthy(s);
  switch (route) {
    case 'community': return `Letters, numbers and the parish’s own history, in the schoolroom behind the hall. ${TUITION.community} gold a year${paid ? ', which the house pays for its children' : ', from your own purse'}. The certificate is letters.`;
    case 'shrine': return 'The keeper teaches letters, care and devotion for nothing, and takes one pupil at a time. Whether that is you was decided at six.';
    case 'academy': return `The grammar school: rhetoric, anatomy, law, the stars, one elective a year beside the core. It expects letters and an entrance examination, and ${TUITION.academy} gold a year unless you hold the scholarship${paid ? ' or the house pays' : ''}.`;
    case 'apprenticeship': return 'A craft learned at a master’s bench. No fee and no letters needed; years of low pay and a temper to live under.';
    default: return null;
  }
}

/** The one-line state of a schooling, for the school panel. */
export function schoolingSummary(s) {
  const k = schooling(s); if (!k) return null;
  const v = schoolingView(s);
  const letters = v.literate ? (v.letters === 'tutor' ? 'You read; a tutor saw to it.' : v.letters === 'home' ? 'You read; the house taught you at its own table.' : v.letters === 'school' ? 'You read, because you were schooled.' : v.letters === 'self' ? 'You read, late and hard-won.' : 'You read.') : s.age < 6 ? 'Nobody has taught you your letters yet.' : s.age < 18 ? 'You cannot read. A school would change that, if one will have you and the fee can be found.' : 'You cannot read. The archivist teaches grown people, four afternoons at a time.';
  const standing = v.tier >= 2 ? ' You hold a grammar school certificate.' : v.tier === 1 ? ' You hold a school certificate.' : '';
  const taken = v.electives.filter(e => e.grade !== null);
  const learned = taken.length ? ` Examined in ${taken.map(e => e.label).join(', ')}.` : '';
  const money = v.scholarship === 'passed' ? ' The scholarship pays your way at the grammar school.' : v.entrance === 'passed' && !tier2Certificate(s) ? ' You passed the grammar school’s entrance examination.' : '';
  return `${letters}${standing}${learned}${money}`;
}

export function validateSchooling(k, s) {
  if (k === undefined) return true;
  const int = (n, max = 1000) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  if (!k || typeof k !== 'object' || k.version !== 1 || typeof k.literate !== 'boolean') return false;
  if (!(k.letters === null || ['tutor', 'home', 'school', 'self'].includes(k.letters)) || !(k.shrinePlace === null || typeof k.shrinePlace === 'boolean')) return false;
  if (!(k.scholarship === null || ['passed', 'failed'].includes(k.scholarship))) return false;
  if (!k.tuitionPaid || typeof k.tuitionPaid !== 'object' || !Object.entries(k.tuitionPaid).every(([route, age]) => TIERS[route] !== undefined && int(age, 300))) return false;
  if (!k.entrance || typeof k.entrance !== 'object' || !(k.entrance.academy === undefined || ['passed', 'failed'].includes(k.entrance.academy)) || !(k.entrance.academyYear === undefined || int(k.entrance.academyYear, 300))) return false;
  if (!int(k.lettersLessons || 0, LETTERS_LESSONS)) return false;
  if (!Object.entries(k.entrance).every(([key, v]) => key === 'academy' || key === 'academyYear' ? true : INSTITUTIONS.some(i => key === i.id || key === `${i.id}Year` || key === `${i.id}Scholarship`) && (key.endsWith('Year') ? int(v, 300) : ['passed', 'failed'].includes(v)))) return false;
  if (k.studies !== undefined) {
    if (!k.studies || typeof k.studies !== 'object' || !Object.entries(k.studies).every(([id, r]) => SUBJECTS[id] && r && int(r.level, 10) && int(r.peak, 10) && r.level <= r.peak && Number.isSafeInteger(r.lastDay) && (!s || r.lastDay <= s.day))) return false;
    if (!Array.isArray(k.classmates) || k.classmates.length > 2 || !k.classmates.every(c => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.length <= 80 && SUBJECTS[c.subject] && typeof c.nature === 'string' && Number.isSafeInteger(c.standing) && Math.abs(c.standing) <= 3 && Number.isSafeInteger(c.bornDay) && Array.isArray(c.contests) && c.contests.length <= 12 && Array.isArray(c.memories) && c.memories.length <= 24 && (c.fate === null || c.fate && ['risen', 'ordinary', 'fallen', 'dead'].includes(c.fate.kind) && ['early', 'late'].includes(c.fate.told)))) return false;
    const i = k.institution;
    if (i !== null && !(i && institutionById(i.id) && institutionById(i.id).subjects.includes(i.major) && int(i.from, 300) && int(i.lessons, 60) && int(i.lessonsThisYear, 8) && int(i.year, 300) && int(i.tuitionPaid, 300) && typeof i.scholarship === 'boolean' && (i.patron === null || i.patron && ['house', 'classmate', 'friend'].includes(i.patron.kind)) && (i.degree === null || i.degree && int(i.degree.age, 300) && int(i.degree.grade, 100)) && (i.sat === null || int(i.sat, 300)))) return false;
    const b = k.bond;
    if (b !== null && !(b && BOND_CRAFTS.includes(b.craft) && typeof b.master === 'string' && Number.isSafeInteger(b.from) && Number.isSafeInteger(b.until) && b.until > b.from && int(b.fromAge, 300) && int(b.lessons, 400) && typeof b.done === 'boolean' && (b.broken === null || b.broken && ['paid', 'ran'].includes(b.broken.how) && Number.isSafeInteger(b.broken.day)))) return false;
    if (!(k.pending === null || k.pending && ['rival', 'temper'].includes(k.pending.kind) && int(k.pending.age, 300))) return false;
    if (!Array.isArray(k.credentials) || k.credentials.length > 6 || !k.credentials.every(c => c && (Object.hasOwn(CREDENTIAL_LABELS, c.kind) || c.kind === 'journeyman') && typeof c.institution === 'string' && int(c.age, 300) && int(c.grade, 100))) return false;
    if (s?.event?.id?.startsWith('schooling_') && !(k.pending && k.pending.kind === (s.event.id === 'schooling_rival' ? 'rival' : 'temper'))) return false;
  }
  return Array.isArray(k.electives) && k.electives.length <= 12 && k.electives.every(e => e && electiveById(e.id) && int(e.age, 300) && int(e.lessons, 8) && (e.grade === null || int(e.grade, 100)));
}
