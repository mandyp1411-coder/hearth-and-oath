// Schooling: being educated is rare, earned and worth it. This module decides
// who gets letters and how, what a school costs and whom it admits, the
// scholarship examination with its handful of places, the electives of the
// grammar years, and the credentials that gate the learned trades. It layers
// over the course machinery in household.js and education-progress.js, and
// applies to new-edition lives only.
import { seededRoll } from './world.js';
import { hasNature } from './personality.js';

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

const edition = s => !!s?.hero?.station;
const means = s => s.hero.station?.id;
const wealthy = s => ['trade', 'gentry', 'noble', 'royal'].includes(means(s));
const high = s => ['gentry', 'noble', 'royal'].includes(means(s));

export function initializeSchooling(s) {
  if (!edition(s) || !s.education) return;
  if (!s.education.schooling) s.education.schooling = { version: 1, literate: false, letters: null, shrinePlace: null, tuitionPaid: {}, electives: [], scholarship: null, entrance: {}, lettersLessons: 0 };
}
export const schooling = s => s.education?.schooling || null;
/** Older saves could always read; on a new life letters are earned. */
export function isLiterate(s) { const k = schooling(s); return !k || k.literate; }
export function tier1Certificate(s) { return (s.education?.qualifications || []).some(q => TIERS[q.route] === 1 && q.route !== 'apprenticeship'); }
export function tier2Certificate(s) { return (s.education?.qualifications || []).some(q => TIERS[q.route] === 2); }
export function hasElective(s, id) { return (schooling(s)?.electives || []).some(e => e.id === id && e.grade !== null); }

function learnLetters(s, how, ctx, text) {
  const k = schooling(s); if (!k || k.literate) return false;
  k.literate = true; k.letters = how;
  ctx?.journal?.('Letters', text, 'education');
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
/** A wealthy house pays its children's tuition; everyone else pays from the purse. */
export function canPayTuition(s, route) {
  const fee = TUITION[route] || 0;
  if (!fee || (route === 'academy' && s.education?.scholarship)) return true;
  if (s.age < 18 && wealthy(s)) return true;
  return s.hero.gold >= fee;
}
/** Tuition is paid once a school year, at enrolment and at the first lesson of each year after. */
export function payTuition(s, route, ctx = {}) {
  const k = schooling(s); if (!k) return true;
  const fee = TUITION[route] || 0;
  if (!fee || (route === 'academy' && s.education.scholarship) || k.tuitionPaid[route] === s.age) return true;
  if (s.age < 18 && wealthy(s)) { k.tuitionPaid[route] = s.age; return true; }
  if (s.hero.gold < fee) return false;
  s.hero.gold -= fee; k.tuitionPaid[route] = s.age;
  ctx.journal?.('Tuition', `${fee} gold to the schoolmaster, for the year. Letters are not given away.`, 'education');
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
  ctx.journal?.(passed ? 'A place' : 'No place', passed
    ? 'Three places, forty children, and one of them was yours. The grammar school will take you without a fee, and will remind you of it.'
    : 'Three places, forty children. You were not one of the three. There is no second sitting.', 'education');
  return passed;
}
/** The grammar school's entrance examination, once a year from twelve. */
export function entranceExam(s, ctx = {}) {
  const k = schooling(s); if (!k || !k.literate || s.age < 12 || k.entrance.academy === 'passed' || k.entrance.academyYear === s.age) return false;
  const chance = examChance(s, 45), passed = seededRoll(s.seed, `exam:entrance:${s.age}`, 100) < chance;
  k.entrance.academy = passed ? 'passed' : 'failed'; k.entrance.academyYear = s.age;
  ctx.journal?.(passed ? 'Admitted' : 'Turned away', passed
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
  ctx.journal?.(e.label, `This year’s elective: ${e.label.toLowerCase()}. ${e.line}`, 'education');
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
    ctx.journal?.(`${e.label}, examined`, grade >= 80 ? `${e.label}: the master wrote "excellent" and underlined it, which he does not do.` : grade >= 60 ? `${e.label}: a fair grade, honestly earned.` : `${e.label}: you passed, barely. The master remembers the ones who barely pass.`, 'education');
  }
}

/** Adults learn their letters at the archive, four lessons at a time. */
export function lettersLesson(s, ctx = {}) {
  const k = schooling(s); if (!k || k.literate) return false;
  k.lettersLessons = (k.lettersLessons || 0) + 1;
  if (k.lettersLessons >= LETTERS_LESSONS) learnLetters(s, 'self', ctx, 'Four afternoons with the archivist and a slate. The letters stopped swimming. You are the first in your family who can read, and you are not sure yet what it is for.');
  else ctx.journal?.('The slate', `Lesson ${k.lettersLessons} of ${LETTERS_LESSONS}. The archivist is patient; the letters are not.`, 'education');
  return true;
}

/** The learned trades ask for letters and schooling the unlettered do not have. */
export function credentialReason(s, professionId) {
  if (!edition(s) || !schooling(s)) return null;
  const literate = isLiterate(s);
  switch (professionId) {
    case 'healer': return literate && (tier2Certificate(s) || hasElective(s, 'anatomy')) ? null : 'The healers ask for letters and a schooling you do not have.';
    case 'scholar': return literate && tier2Certificate(s) ? null : literate ? 'The archive takes no one without a grammar school certificate.' : 'The archive takes no one who cannot read.';
    case 'cartographer': return literate ? null : 'A map is letters and numbers before it is anything else.';
    case 'merchant': return literate || wealthy(s) ? null : 'A merchant who cannot read a bill of lading is a mark, and the guild knows it.';
    case 'alchemist': return literate && (hasElective(s, 'natural_philosophy') || (s.hero.skills?.arcana || 0) >= 2) ? null : 'The alchemists want letters and some natural philosophy before they let you near the fire.';
    default: return null;
  }
}

export function schoolingView(s) {
  const k = schooling(s); if (!k) return null;
  return { literate: k.literate, letters: k.letters, scholarship: k.scholarship, entrance: k.entrance.academy || null, electives: k.electives.map(e => ({ ...e, label: electiveById(e.id)?.label || e.id })), tier: tier2Certificate(s) ? 2 : tier1Certificate(s) ? 1 : 0 };
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
  return Array.isArray(k.electives) && k.electives.length <= 12 && k.electives.every(e => e && electiveById(e.id) && int(e.age, 300) && int(e.lessons, 8) && (e.grade === null || int(e.grade, 100)));
}
