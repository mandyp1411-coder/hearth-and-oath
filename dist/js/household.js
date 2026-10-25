import { familyVisitReason, independentHousehold } from './household-residence.js';
import { observationalInfancy } from './development.js';
import { ensureCourseBook, activateCourse, recordCourseAttendance, courseYearSummary, openCourseYear, courseRecords, courseTransferDetails, validateCourseBook } from './education-progress.js';
import { culturalName, familyNameOf } from './names.js';
import { generateCharacter } from './characters.js';
import { seededRoll, generatePersonName, isSettlement } from './world.js';
import { normalizeAppearance } from './avatar.js';
import { initializeRelationshipDepth } from './family-depth.js';
import { communitySupport } from './community.js';
import { publicMagicAt } from './law-text-v25.js';
import { INSTITUTIONS, SUBJECTS, institutionById, institutionLocation, institutionDoorReason, institutionEntrance, institutionScholarship, institutionDue, institutionPatron, enrolInstitution, institutionLesson, institutionYearDue, payInstitutionYear, institutionExamReason, institutionExam, makeClassmates, queueRivalry, bindApprentice, bondReason, onBondLesson, breakBond, BOND_YEARS, hasCredential } from './schooling.js';
import { schooling, schoolingAdmissionReason, canPayTuition, payTuition, tuitionDue, onQualification, lessonPerformance, scholarshipExam, entranceExam, electiveOffer, chooseElective, onElectiveLesson, lettersLesson, isLiterate, TUITION, LETTERS_LESSONS, schoolDescription, schoolingSummary } from './schooling.js';

const SETUPS = ['two_parents', 'single_parent', 'orphan', 'homeless', 'legacy'];
const FAMILY_IDS = ['kin', 'family_parent', 'family_sibling_1', 'family_sibling_2'];
const SETUP_LABELS = { two_parents: 'Two parents', single_parent: 'One present parent', orphan: 'An orphan’s shelter household', homeless: 'An unsettled shelter household', legacy: 'Your recorded caregiver' };
const setupLabel=f=>f.parentage==='unrecorded'?'A shrine guardian’s household':SETUP_LABELS[f.setup];
const HOUSING_LABELS = { secure: 'A secure roof', shelter: 'A shared shelter', unsheltered: 'No secure roof yet' };
const FIRST = ['Avel', 'Tamsin', 'Elowen', 'Bram', 'Neris', 'Corin', 'Anwen', 'Iven', 'Mara', 'Pell', 'Sable', 'Edda'];
const WORK = ['herbalist', 'carpenter', 'weaver', 'shrine keeper', 'ferryman', 'cook', 'ward-maker', 'gardener'];
const ROUTES = [
  { id: 'community', label: 'Community school', minAge: 6, examAge: 10, description: 'Free reading, numbers, local history, and shared practical lessons. Every household can enroll.', skills: ['scholarship', 'persuasion'], qualification: 'Community literacy certificate' },
  { id: 'shrine', label: 'Shrine school', minAge: 6, examAge: 10, description: 'Free lessons in care, devotion, and protecting neighbors. Ancestral customs can be discussed without requiring your belief to change.', skills: ['devotion', 'defense'], qualification: 'Shrine care certificate' },
  { id: 'academy', label: 'Academy studies', minAge: 12, examAge: 14, description: 'Arcana and scholarship. Enrollment costs 20 gold, or nothing with a scholarship; a visiting tutor teaches younger students locally.', skills: ['arcana', 'scholarship'], qualification: 'Academy certificate' },
  { id: 'apprenticeship', label: 'Craft apprenticeship', minAge: 12, examAge: 14, description: 'Free supervised practical learning with a named craft teacher. Training is not paid employment and does not assign your combat class.', skills: ['survival', 'persuasion'], qualification: 'Practical apprenticeship certificate' },
];
const clamp = (n, low = 0, high = 100) => Math.max(low, Math.min(high, n));
const choice = (id, label, description) => ({ id, label, description });
const yearAge = s => s.age;
const caregiver = s => s.life.people.find(p => p.id === 'kin' && p.alive !== false) || s.life.people.find(p => ['parent', 'guardian'].includes(p.familyRole) && p.alive !== false) || s.life.people.find(p => p.role === 'relative' && p.alive !== false) || s.life.people.find(p => p.id === 'kin');
const householdHelpReason = s => {
  const p=caregiver(s);
  if(p?.alive!==false&&p)return familyVisitReason(s,p);
  // Earlier lives without a living caregiver can still turn to local neighbors.
  if(!isSettlement(s.world,s.locationId)||s.cartography?.offsite||s.cartography?.pending||s.timeline?.journey||s.maze)return 'Visit a settlement to ask local neighbors for help.';
  if(s.worldServicesVersion===1&&(s.cartography?.interior?.siteId!==s.locationId||s.cartography?.interior?.roomId!=='homes'))return 'Visit the Homes area to ask local neighbors for help.';
  return null;
};
const actor = (s, id) => s.life.people.find(p => p.id === id);
const location = (s, id) => s.world.locations.find(p => p.id === id);
const homeId = s => caregiver(s)?.locationId || s.hero.birthplaceId || (s.hero.origin === 'city' ? 'city' : 'home');
const peopleAtHome = s => s.family.members.filter(m => m.availability === 'present' && m.personId).map(m => actor(s, m.personId)).filter(p => p && p.alive !== false);
const history = (s, type, title, text, ctx) => {
  const record = { day: s.day, age: yearAge(s), title, text };
  s[type].history.push(record); s[type].history = s[type].history.slice(-80);
  s.notice = text; ctx?.journal(title, text, type === 'family' ? 'family' : 'education');
};
const memory = (s, id, text, amount = 0) => {
  const p = actor(s, id);
  if (!p || p.alive === false) return;
  p.bond = clamp(p.bond + amount);
  if (!p.memories.includes(text)) p.memories.push(text);
  p.memories = p.memories.slice(-30);
};
const skill = (s, id, amount = 1) => { if (Number.isFinite(s.hero.skills[id])) s.hero.skills[id] += amount; };

const PROJECTS = [
  { id: 'oral_history', route: 'community', title: 'The history beneath the street names', days: 3, body: 'Two neighbors remember the old flood differently. Your class must decide how to preserve disagreement without making either person an exhibit.', research: 'Compare their accounts against the old maps', care: 'Let each neighbor approve their own recorded account', practical: 'Mark a safe route that uses both accounts', skills: { research: 'scholarship', care: 'persuasion', practical: 'survival' } },
  { id: 'river_crossing', route: 'community', title: 'A crossing the youngest pupils can use', days: 4, body: 'The lesson route crosses a swollen stream. The teacher gives your group a real surveying task; younger pupils will need a safe way across.', research: 'Measure the current and publish the limits', care: 'Plan an escorted route for the youngest pupils', practical: 'Build a small practice bridge with supervised tools', skills: { research: 'scholarship', care: 'defense', practical: 'survival' } },
  { id: 'healing_garden', route: 'shrine', title: 'The names on the healing beds', days: 4, body: 'The shrine garden has seedlings enough for several households. Not everyone can travel to collect medicine; your class is asked to plan what happens after harvest.', research: 'Record the herbs and their limits carefully', care: 'Arrange access with the households who need it', practical: 'Grow and label the beds with the garden keeper', skills: { research: 'scholarship', care: 'devotion', practical: 'survival' } },
  { id: 'ancestral_accounts', route: 'shrine', title: 'A willing ancestor and an unwilling family', days: 3, body: 'A written ancestral account may help settle a boundary, but the living family does not want it read in public. A school lesson can examine evidence without binding a soul or exposing a private name.', research: 'Study an anonymized account and its uncertain parts', care: 'Ask the family what they consent to share', practical: 'Map the disputed ground without invoking the dead', skills: { research: 'scholarship', care: 'devotion', practical: 'survival' } },
  { id: 'ward_trial', route: 'academy', title: 'The ward that protects the wrong door', days: 6, body: 'A training ward has been copied perfectly and still blocks the infirmary entrance. Your group must explain what the design protects and who it excludes before it is used beyond the classroom.', research: 'Test the ward with a clear record of its failures', care: 'Redesign it with the infirmary attendants', practical: 'Make a supervised model with a safe release', skills: { research: 'arcana', care: 'devotion', practical: 'defense' } },
  { id: 'restricted_index', route: 'academy', title: 'An index with missing names', days: 5, body: 'The library index omits researchers whose work was prohibited. The tutor allows a supervised review of citations; this is a question about truthful records, not an automatic lesson in forbidden spells.', research: 'Compare sources and record where certainty ends', care: 'Ask whose living descendants may be affected', practical: 'Create a public index that marks restricted access', skills: { research: 'scholarship', care: 'persuasion', practical: 'arcana' } },
  { id: 'tool_repair', route: 'apprenticeship', title: 'Tools the owner cannot afford to replace', days: 5, body: 'A worker brings a broken tool with a repair that would cost more than their next week of wages. The craft teacher asks your group to show a safe, honest repair using school-provided materials.', research: 'Test the fracture and explain the limits', care: 'Discuss a repair the owner can actually maintain', practical: 'Make the repair under the teacher’s supervision', skills: { research: 'scholarship', care: 'persuasion', practical: 'survival' } },
  { id: 'fair_weights', route: 'apprenticeship', title: 'The weight of an honest measure', days: 4, body: 'Two market measures disagree. An apprentice can improve the tools, but blaming a trader before checking the weights would turn a lesson into an accusation.', research: 'Calibrate both measures and publish the findings', care: 'Hear both traders before naming a fault', practical: 'Make a matched set of supervised practice weights', skills: { research: 'scholarship', care: 'persuasion', practical: 'survival' } },
];
const ACADEMIC_PATHS = { inquiry: { label: 'Inquiry and research', skill: 'scholarship' }, service: { label: 'Care and public service', skill: 'devotion' }, practical: { label: 'Practical and field learning', skill: 'survival' } };

export function initializeFamilyDepth(s) {
  if (!s.family || !s.education || !s.life) return;
  initializeRelationshipDepth(s);
  if(s.lineage&&!s.lineage.adoption)s.lineage.adoption={version:1,nextCandidate:1,candidates:[],preparation:null,history:[]};
  const e = s.education;
  if (e.depthVersion === 1) return;
  if(e.pending || /^school-(?:tutor|[a-z]+-tutor)/.test(s.conversations?.pending?.personId || '')){e.nextDepthVersion=1;return;}
  delete e.nextDepthVersion;
  e.depthVersion = 1; e.depthStartedDay = s.day; e.academicPath = null; e.projects = []; e.teacherHistory = [];
  if (!e.teachers) e.teachers = Object.fromEntries(ROUTES.map(r => {
    const existing=educationTeacher({...s,education:{...e,route:r.id}});
    return [r.id, { name: existing.name, bornDay: s.day - existing.age * 365 }];
  }));
}

export function advanceEducationPeople(s, ctx) {
  const e = s.education;
  if (e?.depthVersion !== 1 || e.pending) return;
  for (const route of ROUTES) {
    let t = e.teachers[route.id], count = 0;
    const activeId=t.id||(route.id==='community'?'school-tutor':`school-${route.id}-tutor`);
    if(s.conversations?.pending?.personId===activeId)continue;
    while (s.day >= t.bornDay + 70 * 365 && count++ < 150) {
      const retiredDay = Math.max(e.depthStartedDay, t.bornDay + 70 * 365);
      const old = { ...(t.appearance?{appearance:t.appearance,pronouns:t.pronouns,character:t.character}:{}), id: t.id || (route.id === 'community' ? 'school-tutor' : `school-${route.id}-tutor`), name: t.name, bornDay: t.bornDay, route: route.id, retiredDay };
      e.teacherHistory.push(old); e.teacherHistory = e.teacherHistory.slice(-80);
      const epoch = (t.epoch || 0) + 1, salt = `school-replacement-${route.id}-${retiredDay}-${epoch}`;
      const age = 32 + seededRoll(s.seed, `${salt}-age`, 15);
      t = { id: `${route.id === 'community' ? 'school-tutor' : `school-${route.id}-tutor`}-r${epoch}`, epoch, ...generateCharacter(s.seed,salt,{role:'teacher',age}), name: `Tutor ${generatePersonName(s.seed, salt)}`, bornDay: retiredDay - age * 365 };
      e.teachers[route.id] = t;
      if (e.route === route.id) history(s, 'education', 'A teacher hands on the lessons', `${old.name} retired from teaching. ${t.name} took over the same school; your attended work, qualifications, and the earlier teacher’s conversations remain.`, ctx);
    }
  }
}

export function educationRetiredTeachers(s) {
  return (s.education?.teacherHistory || []).map(t => ({ ...t, age: Math.max(0, Math.floor((s.day - t.bornDay) / 365)), locationId: schoolLocation(s, t.route), schoolName: schoolRecord(s, t.route)?.name || 'Recorded school', available: false, retired: true, alive: true }));
}

export function educationDepthView(s) {
  const e = s.education;
  return { enabled: e?.depthVersion === 1, academicPath: ACADEMIC_PATHS[e?.academicPath]?.label || 'No academic direction chosen', projects: [...(e?.projects || [])], teacherHistory: educationRetiredTeachers(s), projectActions: householdActions(s).filter(a => a.id === 'school_path' || a.id.startsWith('school_project_')) };
}

function makeRelative(s, id, familyRole, baseAge, surname) {
  const original = actor(s, id);
  const occupation = familyRole === 'guardian' ? 'shelter keeper' : familyRole === 'sibling' ? 'schoolchild' : WORK[seededRoll(s.seed, `family-work-${id}`, WORK.length)];
  const salt=`family-${s.dynasty?.generation || 1}-${id}`;
  const identity=s.flags.portraitGeneration===1?generateCharacter(s.seed,salt,{role:occupation,age:baseAge+yearAge(s),familyAppearance:familyRole==='guardian'?undefined:s.hero.appearance,disposition:original?.disposition}):null;
  const naming=culturalName(s.seed,salt,{...(identity||{appearance:s.hero.appearance}),familyName:familyRole==='guardian'?undefined:surname,usedNames:s.life.people.filter(p=>p.id!==id).map(p=>p.name)});
  const name=original?.appearance?original.name:identity?naming.name:original?.name||`${FIRST[seededRoll(s.seed,`family-name-${id}`,FIRST.length)]} ${surname}`;
  const appearance=original?.appearance || identity?.appearance || normalizeAppearance({...s.hero.appearance,hairStyle:familyRole==='sibling'?'short':s.hero.appearance?.hairStyle});
  const p = { ...(original || {}), ...(identity || {}), id, name, ...(identity?{naming:{...naming,name}}:{}), role: 'relative', familyRole, relation: 'family', disposition: original?.disposition || ['kind', 'driven', 'reserved', 'bold'][seededRoll(s.seed, `family-manner-${id}`, 4)], baseAge, age: baseAge + yearAge(s), bond: original?.bond ?? (familyRole === 'sibling' ? 40 : 55), memories: original?.memories || [], knownFacts: original?.knownFacts || [], appearance, alive: true, locationId: s.hero.birthplaceId || (s.hero.origin === 'city' ? 'city' : 'home'), occupation, description: familyRole === 'guardian' ? 'A named shelter guardian who cares for you; they are not your absent birth parent.' : familyRole === 'sibling' ? 'A sibling with their own friendships, questions, and hopes.' : `Your parent earns a living as a ${occupation} and remembers the small details of your earliest years.` };
  if (original) Object.assign(original, p); else s.life.people.push(p);
  return p;
}

export function initializeHousehold(s, { config = {}, migration = false } = {}) {
  if (s.family && s.education) return;
  if (!s.life?.people?.some(p => p.id === 'kin')) return;
  const age = yearAge(s), primary = caregiver(s);
  if (!s.family) {
    if (migration) {
      s.family = { setup: 'legacy', housing: 'secure', support: clamp(Math.round(primary.bond)), members: [{ personId: 'kin', name: primary.name, relationship: 'recorded caregiver', availability: 'present', biological: false }], history: [], pending: null, lastAge: age, interactionUses: {} };
    } else {
      const requested = config.familySetup || 'random';
      const outcomes = ['two_parents', 'two_parents', 'single_parent', 'orphan', 'homeless'];
      const setup = SETUPS.includes(requested) && requested !== 'legacy' ? requested : outcomes[seededRoll(s.seed, 'household-start', outcomes.length)];
      const surname = familyNameOf(s.hero)||'Vale';
      const guardian = ['orphan', 'homeless'].includes(setup),unrecorded=setup==='orphan'&&config.originId==='shrine_foundling';
      const first = makeRelative(s, 'kin', guardian ? 'guardian' : 'parent', 24 + seededRoll(s.seed, 'caregiver-age', 12), surname);
      const members = [{ personId: first.id, name: first.name, relationship: guardian ? 'shelter guardian' : 'parent', availability: 'present', biological: !guardian }];
      if (setup === 'two_parents') {
        const second = makeRelative(s, 'family_parent', 'parent', 25 + seededRoll(s.seed, 'second-parent-age', 13), surname);
        members.push({ personId: second.id, name: second.name, relationship: 'parent', availability: 'present', biological: true });
      } else if (setup === 'single_parent') {
        const availability = ['unknown', 'missing', 'deceased'][seededRoll(s.seed, 'absent-parent-status', 3)];
        const name = availability === 'deceased' && s.revision >= 5 ? generatePersonName(s.seed,'absent-parent-name',{appearance:s.hero.appearance,familyName:surname}) : 'Other birth parent';
        members.push({ personId: null, name, relationship: 'birth parent', availability, biological: true });
      }
      else if (guardian) {
        for (const n of [1, 2]) members.push({ personId: null, name: unrecorded ? `Birth parent ${n} · identity unrecorded` : setup === 'orphan' ? s.revision>=5?generatePersonName(s.seed,`lost-parent-${n}`,{appearance:s.hero.appearance,familyName:surname}):`${FIRST[seededRoll(s.seed,`lost-parent-${n}`,FIRST.length)]} ${surname}` : `Birth parent ${n} · identity unrecorded`, relationship: 'birth parent', availability: unrecorded ? 'unknown' : setup === 'orphan' ? 'deceased' : n === 1 ? 'missing' : 'unknown', biological: true });
      }
      const siblingCount = seededRoll(s.seed, 'family-siblings', 3);
      for (let n = 1; n <= siblingCount; n++) {
        const sibling = makeRelative(s, `family_sibling_${n}`, 'sibling', 1 + seededRoll(s.seed, `sibling-age-${n}`, 7), surname);
        members.push({ personId: sibling.id, name: sibling.name, relationship: 'sibling', availability: 'present', biological: true });
      }
      s.family = { setup, ...(unrecorded?{parentage:'unrecorded'}:{}), housing: setup === 'homeless' ? 'unsheltered' : setup === 'orphan' ? 'shelter' : 'secure', support: setup === 'homeless' ? 25 : setup === 'orphan' ? 50 : s.hero.household === 'poor' ? 55 : 65, members, history: [], pending: null, lastAge: age, interactionUses: {} };
      if (setup === 'homeless') { s.hero.household = 'poor'; s.hero.gold = 0; }
    }
  }
  if (!s.education) {
    const certified = migration && !!s.flags.certified;
    s.education = { route: certified ? 'academy' : null, schoolId: certified ? schoolRecord(s, 'academy').id : null, enrolled: false, year: 0, attendance: 0, progress: 0, performance: 50, scholarship: migration && !!s.flags.scholarship, qualifications: certified ? [{ id: 'academy-certificate', label: 'Academy certificate', route: 'academy', schoolId: schoolRecord(s, 'academy').id, grade: 60, day: s.day, age }] : [], history: [], pending: null, lastAge: age, lessonsThisYear: 0, attendanceThisYear: 0, preparationsThisYear: 0, examinedYear: null };
    if (!migration && s.revision >= 5) s.education.teachers = Object.fromEntries(ROUTES.map(route => {
      const salt = `school-teacher-${route.id}-generation-${s.dynasty?.generation || 1}-born-${s.timeline?.birthDay || 0}`;
      const baseAge = 30 + seededRoll(s.seed, `${salt}-age`, 15);
      return [route.id, {...generateCharacter(s.seed,salt,{role:'teacher',age:baseAge}),name:`Tutor ${generatePersonName(s.seed,salt)}`,bornDay:s.day-baseAge*365}];
    }));
  }
}

function schoolLocation(s, route) {
  if (route === 'academy' && yearAge(s) >= 14 && isSettlement(s.world,'city')) return 'city';
  const candidates = [homeId(s), 'brook', 'camp', 'sanctuary', 'city', ...s.world.locations.map(p=>p.id)];
  return candidates.find(id => isSettlement(s.world,id)) || homeId(s);
}
function schoolRecord(s, route) {
  const def = ROUTES.find(r => r.id === route);
  if (!def) return null;
  const origin = s.hero.birthplaceId || (s.hero.origin === 'city' ? 'city' : 'home');
  const site = location(s, route === 'academy' ? 'city' : isSettlement(s.world,origin)?origin:schoolLocation(s,route));
  const institution = site?.institutions?.find(i => i.kind === ({ community: 'community', shrine: 'shrine', academy: 'academy', apprenticeship: 'workshop' })[route]);
  const endings = { community: ['Common School', 'Reading Hall', 'Hearth School'], shrine: ['Lantern Lessons', 'Shrine School', 'Hall of Care'], academy: ['Wren Academy', 'Glass Academy', 'Rowan Academy'], apprenticeship: ['Craft Circle', 'Guild Workshop', 'Practical School'] };
  const name = institution?.name || `${site?.name || 'The village'} ${endings[route][seededRoll(s.seed, `school-name-${route}`, 3)]}`;
  return { ...def, id: `school-${route}`, name, locationId: schoolLocation(s, route) };
}
export function educationTeacher(s) {
  const route = s.education?.route || 'community';
  const row = schoolRecord(s, route);
  if (!row) return null;
  const names = ['Mistress Edda', 'Tutor Iven', 'Master Rowan', 'Mistress Anwen', 'Tutor Sable', 'Master Pell'];
  const recorded = s.education?.teachers?.[route];
  const name = recorded?.name || names[seededRoll(s.seed, route === 'community' ? 'conversation-tutor' : `school-teacher-${route}`, names.length)];
  const baseAge = 30 + seededRoll(s.seed, `teacher-age-${route}`, 15);
  return { ...(recorded?.appearance?{appearance:recorded.appearance,pronouns:recorded.pronouns,character:recorded.character}:{}), id: recorded?.id || (route === 'community' ? 'school-tutor' : `school-${route}-tutor`), name, baseAge, age: recorded ? Math.max(0, Math.floor((s.day-recorded.bornDay)/365)) : baseAge + (s.timeline?.mode === 'birth' ? yearAge(s) : Math.floor(s.day / 365)), locationId: row.locationId, schoolName: row.name, route, available: true, alive: true };
}

/** Whether a school action is shut for any reason but the purse: the engine has already taken the displayed cost by the time a handler runs. */
function blocked(s, id) { const a = householdActions(s).find(a => a.id === id); return !a || !!(a.disabledReason && !/^Requires \d+ gold/.test(a.disabledReason)); }
function action(s, id, label, description, days, cost = 0, reason) {
  return { id, label, description, days, cost, group: id.startsWith('school_') ? 'School & education' : 'Family & belonging', ...(reason || s.hero.gold < cost ? { disabledReason: reason || `Requires ${cost} gold; you have ${s.hero.gold}.` } : {}) };
}
/** Which schools would admit you is decided at birth. The bound are not
 * schooled unless someone at home reads and argues for it; the academy does
 * not take them at all; an owned child's labour is already spoken for. */
function admissionReason(s, route) {
  const st = s.hero.station; if (!st) return null;
  if (st.freedom === 'owned') return 'Your labour is spoken for; the bond does not allow for lessons.';
  if (st.id === 'bound' && route === 'academy') return 'The academy does not take the bound.';
  if (st.id === 'bound' && route !== 'apprenticeship' && !s.family?.literate) return 'The field does not wait, and no one at home reads to argue otherwise.';
  if (bondReason(s) && route !== 'apprenticeship') return bondReason(s);
  return schoolingAdmissionReason(s, route);
}
/** `feeCharged`: the year's first lesson carries the tuition as its own cost, which the engine has
 * already taken when the handler runs, so the purse is not asked again. */
function schoolReason(s, { feeCharged = false } = {}) {
  const row = schoolRecord(s, s.education.route);
  if (!s.education.enrolled || !row) return 'Enroll in a school or apprenticeship first. Independent reading remains available.';
  if (yearAge(s) < row.minAge) return `This route opens at age ${row.minAge}.`;
  if (s.locationId !== row.locationId) return `Lessons take place at ${location(s, row.locationId)?.name || row.locationId}.`;
  if (!feeCharged && tuitionDue(s, s.education.route) > s.hero.gold) return `This year’s tuition is ${TUITION[s.education.route]} gold, and it is not paid.`;
  return null;
}
function transferExplanation(s,route) {
  const q=courseTransferDetails(s.education,route);
  return `Your current ${q.current.attendance} sessions, ${q.current.progress} progress and ${q.current.performance}/100 performance stay with that route. ${q.returning?`Returning resumes ${q.prepared.attendance} sessions, ${q.prepared.progress} progress and ${q.prepared.performance}/100 performance.`:'The new course starts with zero attendance, zero progress and 50/100 performance.'} Learned skills and qualifications remain. Annual lesson, revision and exam limits do not reset.`;
}
export function educationTransferPreview(s,route) {
  if(!s.education?.enrolled||s.education.route===route)return null;
  const row=schoolRecord(s,route);if(!row)return null;
  const a=householdActions(s).find(a=>a.id===`school_enroll_${route}`),details=courseTransferDetails(s.education,route);
  const result={...details,actionId:`school_enroll_${route}`,schoolName:row.name,siteId:row.locationId,siteName:location(s,row.locationId)?.name || row.locationId,cost:a?.cost || 0,days:a?.days || 1,day:s.day,locationId:s.locationId,explanation:transferExplanation(s,route),disabledReason:a?.disabledReason || (!a?'Resolve the waiting moment before transferring.':null)};
  return {...result,signature:JSON.stringify(result)};
}

export function householdActions(s) {
  if (observationalInfancy(s)||!s.family || !s.education || s.event || s.battle || s.conversations?.pending) return [];
  const age = yearAge(s), e = s.education, f = s.family, actions = [];
  for (const p of peopleAtHome(s)) actions.push(action(s, `family_time_${p.id}`, age < 3 ? `Make room for care with ${p.name}` : independentHousehold(s)?`Visit ${p.name} at their home`:`Spend time with ${p.name}`, `${p.familyRole === 'sibling' ? 'Listen, play, or solve a small problem with your sibling.' : 'Share time with the person who actually cares for you.'} Gain 7 bond and 3 support; restore 3 happiness. Three meaningful visits per person each year.`, 1, 0, (f.interactionUses[p.id] || 0) >= 3 ? 'You have made three focused visits this year; ordinary conversation is still available.' : familyVisitReason(s,p)));
  if(age>=6)actions.push(action(s, 'family_support', 'Ask for the support you actually need', 'Have a specific discussion with your caregiver. Once per year, raise household support by 10 and reduce stress by 6. No unrecorded parent appears and no money is created.', 2, 0, f.interactionUses.support ? 'This year’s support conversation is already remembered.' : householdHelpReason(s)));
  if (age>=6&&f.housing === 'unsheltered') actions.push(action(s, 'family_shelter', 'Seek a safe temporary roof together', 'A local shelter offers space without a fee. Change unsheltered housing to shelter, raise support by 8, and preserve the actual caregiver’s identity. A built home can later provide secure housing.', 2, 0, householdHelpReason(s)));
  actions.push(action(s, 'family_dilemma', age<6?'A small moment at home':'A decision within your household', age<6?'Choose a familiar story, ask for comfort, or say you need a quiet moment. The adults remain responsible for your care.':'Face a specific household problem involving the people and circumstances you actually have. One dilemma each year; your choice becomes a participant’s memory.', 1, 0, caregiver(s)?.alive === false ? 'Your recorded caregivers have died; their names remain in your legacy.' : f.interactionUses.dilemma ? 'Your household has already faced its special decision this year.' : familyVisitReason(s,caregiver(s))));
  if (age < 6) return actions;
  for (const def of ROUTES) {
    const row = schoolRecord(s, def.id), cost = tuitionDue(s, def.id);
    actions.push(action(s, `school_enroll_${def.id}`, `${e.enrolled ? 'Transfer to' : 'Enroll at'} ${row.name}`, `${schoolDescription(s, def.id)} Enrolment takes a day${cost?` and the year’s ${cost} gold`:''}.${e.enrolled&&e.route!==def.id?' '+transferExplanation(s,def.id):''}`, 1, cost, age < def.minAge ? `Opens at age ${def.minAge}.` : e.enrolled && e.route === def.id ? 'You are already enrolled here.' : admissionReason(s, def.id) || (s.locationId !== row.locationId ? `Enrollment takes place at ${location(s, row.locationId)?.name || row.locationId}.` : undefined)));
  }
  const reason = schoolReason(s), row = schoolRecord(s, e.route);
  if (e.depthVersion === 1) {
    actions.push(action(s, 'school_path', 'Discuss the direction of your studies', 'Choose inquiry, public service, or practical field learning. A direction changes future supervised project practice; choosing a label grants no skill or class.', 1, 0, reason || (age < 12 ? 'A considered academic direction opens at age twelve.' : undefined)));
    for (const project of PROJECTS.filter(p => p.route === e.route)) {
      const done = e.projects.some(p => p.id === project.id && p.age === age);
      actions.push(action(s, `school_project_${project.id}`, project.title, 'Complete a distinct supervised project with school-provided tools, then decide how the work serves people. Gain two course progress through actual practice and a remembered outcome. Once per project each school year.', project.days, 0, reason || (e.progress < 2 ? 'Attend two supervised sessions before undertaking this project.' : done ? 'You already completed this project this school year.' : undefined)));
    }
  }
  const yearFee = e.enrolled ? tuitionDue(s, e.route) : 0;
  actions.push(action(s, 'school_attend', 'Attend a real lesson and practical session', yearFee ? `Add one attendance and one course progress, gain the route’s actual skills, and improve performance. Eight supervised sessions per year. The first lesson of the year pays the schoolmaster his ${yearFee} gold.` : 'Add one attendance and one course progress, gain the route’s actual skills, and improve performance. Eight supervised sessions per year; no tuition per lesson.', 4, yearFee, reason || (e.lessonsThisYear >= 8 ? 'You completed eight supervised sessions this year; return next year or read independently.' : electiveOffer(s) ? 'Choose this year’s elective first.' : undefined)));
  actions.push(action(s, 'school_exam', 'Present your term examination', `Four progress opens an attempt; six progress guarantees a pass through preparation. ${row?.qualification || 'A qualification'} records its route, grade, and teacher’s school. One completed exam per year; public exams are free.`, 2, 0, reason || (row && age < row.examAge ? `Examinations for this route open at ${row.examAge}.` : e.examinedYear === age ? 'You completed an examination this year.' : e.qualifications.some(q => q.route === e.route) ? 'You already hold this route’s qualification.' : e.progress < 4 ? `Attend ${4 - e.progress} more sessions to open an attempt.` : undefined)));
  actions.push(action(s, 'school_dilemma', 'A decision among teachers and classmates', 'Respond to a specific school situation. Teacher and classmate memories follow the actual participants; no automatic disclosure of forbidden research.', 1, 0, reason || (f.interactionUses.schoolDilemma ? 'This year’s school dilemma is already remembered.' : undefined)));
  const k = schooling(s), academy = schoolRecord(s, 'academy');
  if (k) {
    if (age >= 12 && age <= 15) actions.push(action(s, 'school_scholarship', 'Sit the scholarship examination', 'Three funded places at the grammar school, forty children, one sitting in a life. A page read aloud, a sum, a question about the old kings.', 2, 0, k.scholarship ? 'There is no second sitting.' : !k.literate ? 'The examination is in writing. You cannot read.' : s.locationId !== academy?.locationId ? `The examination is held at ${location(s, academy?.locationId)?.name || 'the grammar school'}.` : undefined));
    if (age >= 12 && age < 18) actions.push(action(s, 'school_entrance', 'Sit the grammar school entrance examination', 'Letters, numbers and a little history, before the master. Once a year.', 1, 0, k.entrance.academy === 'passed' ? 'You are already admitted.' : !k.literate ? 'The grammar school does not teach letters; it expects them.' : k.entrance.academyYear === age ? 'You failed this year. Next year, if you dare.' : s.locationId !== academy?.locationId ? `The examination is held at ${location(s, academy?.locationId)?.name || 'the grammar school'}.` : undefined));
    if (age >= 18 && !k.literate) actions.push(action(s, 'school_letters', 'Learn your letters', `Four afternoons with the archivist and a slate, three gold each. Most grown people never do.`, 4, 3, s.locationId !== schoolRecord(s, 'community')?.locationId ? 'The archivist keeps the slate at the school and archive.' : undefined));
    // The institutions of the capitals: the door, the examination, the one place, the rolls, the lectures, the degree.
    if (age >= 16 && !k.institution) for (const inst of INSTITUTIONS) {
      const site = institutionLocation(s, inst), here = s.locationId === site, door = institutionDoorReason(s, inst, { publicMagic: inst.id === 'collegium' && site ? publicMagicAt(s, site) : null });
      if (door && age > 30) continue;
      const seat = location(s, site)?.name || inst.seat;
      if (k.entrance[inst.id] !== 'passed') actions.push(action(s, `school_sit_${inst.id}`, `Sit the entrance examination of ${inst.label}`, `${inst.door} The examination is held once a year in ${seat}; the sitting costs 5 gold whatever comes of it.`, 2, 5, door || (!here ? `The examination is held in ${seat}.` : k.entrance[`${inst.id}Year`] === age ? 'You sat this year. Next year, if you dare.' : undefined)));
      else {
        if (!k.entrance[`${inst.id}Scholarship`]) actions.push(action(s, `school_place_${inst.id}`, `Sit for the one free place at ${inst.label}`, 'One place a year for someone who cannot pay. Everyone who cannot pay sits for it.', 2, 0, !here ? `The sitting is in ${seat}.` : undefined));
        const due = institutionDue(s, inst.id), patron = due ? null : institutionPatron(s, inst.id);
        for (const subject of inst.subjects) actions.push(action(s, `school_read_${inst.id}_${subject}`, `Be read into ${inst.label}: ${SUBJECTS[subject].label.toLowerCase()}`, `${inst.years} years, ${inst.lessons} lectures a year, the final examination at the end. ${due ? `${due} gold a year from your own purse.` : k.entrance[`${inst.id}Scholarship`] === 'passed' ? 'The scholarship pays.' : patron ? `${patron.kind === 'house' ? 'The house' : patron.name} pays the fee.` : 'No fee is owed.'}`, 1, due, !here ? `The rolls are kept in ${seat}.` : undefined));
      }
    }
    if (k.institution && !k.institution.degree) {
      const inst = institutionById(k.institution.id), site = institutionLocation(s, inst), here = s.locationId === site, seat = location(s, site)?.name || inst.seat, yearFee = institutionYearDue(s);
      const left = inst.lessons - (k.institution.year === age ? k.institution.lessonsThisYear : 0);
      actions.push(action(s, 'school_lecture', `Attend a lecture at ${inst.label}`, `Five days in ${seat}. ${left} of this year’s ${inst.lessons} lectures remain.${yearFee ? ` The first lecture of the year pays the bursar his ${yearFee} gold.` : ''}`, 5, yearFee, !here ? `The lectures are given in ${seat}.` : left <= 0 ? 'This year’s lectures are given. The rest is reading.' : undefined));
      actions.push(action(s, 'school_degree', `Sit the final examination of ${inst.label}`, 'Three examiners, a long table, and three years of your life on it.', 3, 0, !here ? `The examination is held in ${seat}.` : institutionExamReason(s) || undefined));
    }
    if (k.bond && !k.bond.broken && !k.bond.done) actions.push(action(s, 'school_break_bond', `Buy back your bond from ${k.bond.master}`, `Thirty gold on the bench and the paper torn. ${Math.max(1, Math.ceil((k.bond.until - s.day) / 365))} years of the ${BOND_YEARS} remain. Cheaper than walking out, which the guild never forgets.`, 1, 30));
    const offer = electiveOffer(s);
    if (offer && !reason) for (const el of offer) actions.push(action(s, `school_elective_${el.id}`, `Elective: ${el.label}`, `${el.line} Four lessons this year, then the master’s grade. Choose one.`, 0, 0));
  }
  if (s.obligations.some(o => o.id === 'school_service' && !o.resolved)) actions.push(action(s, 'school_service', 'Complete the promised reading-room service', 'Spend three days helping with supervised reading and supplies. Fulfill the scholarship promise, gain persuasion, and keep your funded place.', 3));
  return actions;
}

const FAMILY_SCENES = {
  early_child:{title:'A little space beside the hearth',body:s=>`${caregiver(s).name} sits nearby while the household settles for the evening. There is time for a familiar story, a cuddle, or a quiet little corner. You can say what would feel good just now. The adults look after the rest.`,choices:[choice('help','Point to your favorite story','Listen together to the story you know.'),choice('ask','Ask for a cuddle','Stay close to a familiar caregiver.'),choice('boundary','Say you would like some quiet','Rest nearby with room to be quiet.')],effect(s,p){s.life.happiness=clamp(s.life.happiness+4);if(p==='ask')s.family.support=clamp(s.family.support+3);if(p==='boundary')s.life.stress=clamp(s.life.stress-4);}},
  expectations: { title: 'The household name on an invitation', body: s => `${caregiver(s).name} brings an invitation bearing your noble household's seal. A patron wants you to represent the family in a dispute over access to the common well. The name opens a door, but speaking for it means being answerable to people outside the family. Your learning and future calling remain yours.`, choices: [choice('help', 'Represent the household and hear both accounts', 'Gain persuasion and 6 support; add 6 stress from a public responsibility.'), choice('ask', 'Ask the household to support a classmate instead', 'Contribute 6 gold if available, or help write their application. Gain scholarship, 3 village trust and a named classmate memory; no school enrollment is invented.'), choice('boundary', 'Decline the invitation and explain the life you want', 'Restore 4 happiness and reduce stress by 6. Household support falls by 4 while expectations are discussed; your caregiver remembers the honest boundary.')], effect(s, p) { if (p === 'help') { skill(s, 'persuasion'); s.family.support = clamp(s.family.support + 6); s.life.stress = clamp(s.life.stress + 6); } else if (p === 'ask') { if(s.hero.gold>=6)s.hero.gold-=6;skill(s,'scholarship');s.factions.villagers=clamp(s.factions.villagers+3,-100,100);memory(s,'fellow','You asked your household to support my learning without deciding my future.',7); } else {s.family.support=clamp(s.family.support-4);s.life.happiness=clamp(s.life.happiness+4);s.life.stress=clamp(s.life.stress-6);} } },
  winter: { title: 'What the household can keep through winter', body: s => `${caregiver(s).name} spreads a short list beside the lamp: warm coverings, repairs, and time for learning. Your household has little money. A neighbor offers shared tools and space at the communal hearth; accepting help need not give anyone ownership of your future.`, choices: [choice('help', 'Help repair what can be repaired', 'Gain survival and 6 support through an age-appropriate practical task. No wages or materials appear from nowhere.'), choice('ask', 'Ask for shared warmth and a fair schedule', 'Gain persuasion, reduce stress by 4 and raise village trust by 3. The household records a community arrangement; housing and gold stay real.'), choice('boundary', 'Keep time for lessons while asking others to share repairs', 'Gain scholarship and restore 4 happiness. Household support falls by 3 because an immediate task still needs help; free learning remains available.')], effect(s, p) {if(p==='help'){skill(s,'survival');s.family.support=clamp(s.family.support+6);}else if(p==='ask'){skill(s,'persuasion');s.life.stress=clamp(s.life.stress-4);s.factions.villagers=clamp(s.factions.villagers+3,-100,100);}else{skill(s,'scholarship');s.life.happiness=clamp(s.life.happiness+4);s.family.support=clamp(s.family.support-3);}} },
  shelter: { title: 'Space before the winter', body: s => `${caregiver(s).name}, your actual shelter guardian, has found room near a communal hearth. It is not a new parent or a permanent home. How should the household make use of the help?`, choices: [choice('help', 'Help arrange a safe corner for everyone', 'Move into temporary shelter and gain survival and support.'), choice('ask', 'Ask for quiet space and a stable school address', 'Move into shelter and improve confidence in future lessons.'), choice('boundary', 'Set clear boundaries with the shelter keeper', 'Move into shelter while protecting household privacy; gain persuasion.')], effect(s, p) { s.family.housing = 'shelter'; s.family.support = clamp(s.family.support + 8); skill(s, p === 'help' ? 'survival' : p === 'ask' ? 'scholarship' : 'persuasion'); } },
  origins: { title: 'A name in the shelter record', body: s => `${caregiver(s).name} offers to show you the record of your birth household. ${s.family.members.some(m=>m.biological&&m.relationship==='birth parent'&&m.availability==='deceased') ? `It records ${s.family.members.filter(m=>m.biological&&m.relationship==='birth parent'&&m.availability==='deceased').map(m=>m.name).join(' and ')} as deceased. The guardian keeps their names beside what is still unknown.` : 'It contains missing names and uncertain whereabouts. The guardian will not invent an answer to comfort you.'} You decide what you want to ask today.`, choices: [choice('help', 'Preserve what is known and honor what was lost', 'Gain scholarship and a remembered conversation about your origins.'), choice('ask', 'Ask what help a careful future search would need', 'Record a future search interest and gain persuasion; no parent suddenly appears.'), choice('boundary', 'Say you are not ready to read the record', 'Restore happiness and preserve a trusting boundary.')], effect(s, p) { if (p === 'ask') s.flags.familyOriginInterest = true; if (p !== 'boundary') skill(s, p === 'help' ? 'scholarship' : 'persuasion'); else s.life.happiness = clamp(s.life.happiness + 6); } },
  sibling: { title: 'A sibling’s own plan', body: s => `${peopleAtHome(s).find(p => p.familyRole === 'sibling')?.name} wants to learn something different from the household’s familiar work. They ask whether you will help them be heard rather than choose for them.`, choices: [choice('help', 'Help them explain the plan to your caregiver', 'Gain persuasion and strengthen the actual sibling’s bond.'), choice('ask', 'Ask what they hope the new learning will change', 'Gain scholarship and listen to a sibling’s own ambition.'), choice('boundary', 'Support them without promising to solve everything', 'Reduce stress and preserve an honest family boundary.')], effect(s, p) { const sib = peopleAtHome(s).find(p => p.familyRole === 'sibling'); memory(s, sib.id, 'You listened to my own learning plans instead of assigning me a future.', 10); if (p !== 'boundary') skill(s, p === 'help' ? 'persuasion' : 'scholarship'); else s.life.stress = clamp(s.life.stress - 8); } },
  livelihood: { title: 'The work that keeps a roof above you', body: s => `${caregiver(s).name} has been working longer hours ${s.family.setup === 'legacy' ? 'to maintain the household' : `as a ${caregiver(s).occupation || 'caregiver'}`}. They ask for practical help, while you also have lessons and friendships to maintain.`, choices: [choice('help', 'Take an age-appropriate part in the household chores', 'Gain survival and support without becoming a child wage laborer.'), choice('ask', 'Discuss a schedule that leaves room for learning', 'Gain persuasion and preserve household support.'), choice('boundary', 'Ask another trusted neighbor to share the load', 'Reduce stress and build a remembered community connection.')], effect(s, p) { s.family.support = clamp(s.family.support + (p === 'help' ? 8 : 4)); if (p === 'help') skill(s, 'survival'); if (p === 'ask') skill(s, 'persuasion'); if (p === 'boundary') s.life.stress = clamp(s.life.stress - 6); } },
  care: { title: 'A familiar voice, with help nearby', body: s => `${caregiver(s).name} wants you to know that asking for help does not make this household less real. ${yearAge(s) < 3 ? 'The adults decide what pattern of care to build around you.' : 'You can discuss what makes you feel safe and what you want to learn.'}`, choices: [choice('help', 'Make room for familiar care', 'Gain support and restore household happiness.'), choice('ask', 'Bring stories and learning into the shared hours', 'Gain scholarship through care, not a forced school enrollment.'), choice('boundary', 'Let trusted neighbors share some of the care', 'Gain persuasion and improve a real community connection.')], effect(s, p) { s.family.support = clamp(s.family.support + 5); if (p === 'help') s.life.happiness = clamp(s.life.happiness + 6); else skill(s, p === 'ask' ? 'scholarship' : 'persuasion'); } },
  aging: { title: 'The person who once carried you', body: s => `${caregiver(s).name} tires more quickly these days. They ask for companionship and practical help without surrendering their right to choose how they live.`, choices: [choice('help', 'Arrange practical help with their agreement', 'Gain support and a caring memory.'), choice('ask', 'Ask which changes they actually want', 'Gain persuasion and respect their independence.'), choice('boundary', 'Share the responsibility with willing relatives or neighbors', 'Reduce stress without pretending you can do everything alone.')], effect(s, p) { s.family.support = clamp(s.family.support + 5); if (p === 'ask') skill(s, 'persuasion'); if (p === 'boundary') s.life.stress = clamp(s.life.stress - 8); } },
};
const SCHOOL_SCENES = [
  { id: 'copy', title: 'The answer left on the teacher’s table', body: () => 'A classmate finds tomorrow’s answers and asks whether a frightened student should use them. Your teacher offers extra help to anyone willing to ask, but it means admitting uncertainty.', choices: [choice('help', 'Ask for help and share an honest study plan', 'Improve progress and performance; your teacher records a sincere effort.'), choice('ask', 'Teach the part you understand to the worried classmate', 'Gain persuasion and a classmate memory without claiming to know everything.'), choice('boundary', 'Decline the copied answer without reporting the classmate', 'Gain willful restraint and protect trust; no universal morality score changes.')], effect(s, p) { if (p === 'help') { s.education.progress++; s.education.performance = clamp(s.education.performance + 8); } if (p === 'ask') { skill(s, 'persuasion'); memory(s, 'fellow', 'You helped me study instead of using the copied answer.', 8); } if (p === 'boundary') skill(s, 'devotion'); } },
  { id: 'credit', title: 'Two names on the lesson project', body: s => `${pname(s, 'rival')} worked beside you on a ward diagram. A patron praises your work alone. The teacher asks what should be written on the project’s label.`, choices: [choice('help', 'Put both names beside the work', 'Gain scholarship and your rival’s trust.'), choice('ask', 'Explain the different parts each person contributed', 'Gain persuasion and a precise account of shared work.'), choice('boundary', 'Decline the patron’s praise until the label is corrected', 'Gain performance and protect a classmate’s credit.')], effect(s, p) { memory(s, 'rival', 'You preserved my credit on our school project.', 9); if (p !== 'boundary') skill(s, p === 'help' ? 'scholarship' : 'persuasion'); else s.education.performance = clamp(s.education.performance + 6); } },
  { id: 'rite', title: 'Whose memory belongs in the lesson?', body: () => 'An old lesson demonstrates speaking with the dead. The teacher asks whose permission would be needed before an actual rite. A student says an interesting question is reason enough to proceed.', choices: [choice('help', 'Ask for the dead person’s willing agreement', 'Gain devotion and an ethical study memory; no rite is performed.'), choice('ask', 'Compare the lesson with the local written law', 'Gain scholarship and retain the distinction between law and consent.'), choice('boundary', 'Keep the lesson theoretical until consent can be established', 'Gain defense through careful boundaries; hidden studies remain private.')], effect(s, p) { skill(s, p === 'help' ? 'devotion' : p === 'ask' ? 'scholarship' : 'defense'); s.flags.schoolConsentDiscussed = true; } },
  { id: 'garden', title: 'The lesson outside the classroom', body: () => 'The school garden’s roots have begun carrying an unfamiliar hum. The gardener asks students to observe before digging. A practical lesson can preserve a living place instead of treating it as equipment.', choices: [choice('help', 'Help mark and protect the roots', 'Gain survival and a useful garden memory.'), choice('ask', 'Compare the hum with the oldest local account', 'Gain arcana and a lead toward the region’s remembered history.'), choice('boundary', 'Observe without disturbing what you do not understand', 'Gain scholarship and improve performance through careful notes.')], effect(s, p) { skill(s, p === 'help' ? 'survival' : p === 'ask' ? 'arcana' : 'scholarship'); s.education.performance = clamp(s.education.performance + 4); } },
  { id: 'fees', title: 'A seat for someone without tuition', body: () => 'A new student has no coins for books. The teacher proposes shared materials and a supervised service route. Some classmates worry that this will take time away from their own lessons.', choices: [choice('help', 'Help organize shared books without taking over the student’s work', 'Gain support and a community learning memory.'), choice('ask', 'Ask the teacher to preserve a clear fair schedule', 'Gain persuasion and improve performance.'), choice('boundary', 'Offer the help you can honestly sustain', 'Reduce stress while respecting the student’s independence.')], effect(s, p) { if (p === 'help') s.family.support = clamp(s.family.support + 5); if (p === 'ask') { skill(s, 'persuasion'); s.education.performance = clamp(s.education.performance + 5); } if (p === 'boundary') s.life.stress = clamp(s.life.stress - 6); } },
];
const pname = (s, id) => actor(s, id)?.name || 'your classmate';
function familyScene(s) {
  if(yearAge(s)<6)return 'early_child';
  if (s.family.housing === 'unsheltered') return 'shelter';
  if (yearAge(s) < 3) return 'care';
  const candidates = ['livelihood', 'care'];
  if(s.timeline?.roleplayVersion===1 && yearAge(s)>=6) {
    if(s.hero.household==='noble' && yearAge(s)>=10)candidates.push('expectations');
    if(s.hero.household==='poor')candidates.push('winter');
  }
  if (['orphan', 'homeless'].includes(s.family.setup)) candidates.push('origins');
  if (peopleAtHome(s).some(p => p.familyRole === 'sibling')) candidates.push('sibling');
  if (caregiver(s).age >= 60) candidates.push('aging');
  return candidates[seededRoll(s.seed, `family-decision-${yearAge(s)}`, candidates.length)];
}
function teacherMemory(s, text) {
  const teacher = educationTeacher(s);
  const relations = s.conversations?.relationships;
  if (!teacher || !relations) return;
  const r = relations[teacher.id] ||= { bond: 35, memories: [], knownFacts: [] };
  r.bond = clamp(r.bond + 5); if (!r.memories.includes(text)) r.memories.push(text); r.memories = r.memories.slice(-30);
}

export function applyHouseholdAction(s, id, ctx) {
  if (observationalInfancy(s)||typeof id !== 'string' || !/^(family_|school_)/.test(id) || !s.family || !s.education) return false;
  const f = s.family, e = s.education, age = yearAge(s);
  if(age<6&&['family_support','family_shelter'].includes(id))return false;
  if (id.startsWith('family_time_')) {
    const personId = id.slice(12), p = actor(s, personId);
    if (!f.members.some(m => m.personId === personId && m.availability === 'present') || !p || p.alive === false || familyVisitReason(s,p) || (f.interactionUses[personId] || 0) >= 3) return false;
    f.interactionUses[personId] = (f.interactionUses[personId] || 0) + 1; f.support = clamp(f.support + 3); s.life.happiness = clamp(s.life.happiness + 3);
    memory(s, personId, age < 3 ? `In your earliest years, I made time for familiar care at age ${age}.` : `At age ${age}, you made time for my own life and questions.`, 7);
    history(s, 'family', 'A familiar person, heard', `${p.name} remembers shared time. Their bond is now ${p.bond}; household support is ${f.support}.`, ctx); return true;
  }
  if (id === 'family_support') {
    if (f.interactionUses.support || householdHelpReason(s)) return false;
    f.interactionUses.support = 1; f.support = clamp(f.support + 10); s.life.stress = clamp(s.life.stress - 6);
    memory(s, caregiver(s)?.id, 'We spoke honestly about what help this household needed.', 5);
    history(s, 'family', 'Support with a real name', `${!caregiver(s)||caregiver(s).alive === false ? 'You and local neighbors' : caregiver(s).name} helped arrange practical support. The people recorded in your household remain the people who are actually present.`, ctx); return true;
  }
  if (id === 'family_shelter') {
    if(householdHelpReason(s))return false;
    if (f.housing !== 'unsheltered') return false;
    f.housing = 'shelter'; f.support = clamp(f.support + 8);
    memory(s, caregiver(s)?.id, 'We found a safe temporary roof together.', 8);
    history(s, 'family', 'A temporary roof', `${!caregiver(s)||caregiver(s).alive === false ? 'You and local neighbors' : caregiver(s).name} secured local shelter without a fee. Secure ownership can grow later through an actual home or building project.`, ctx); return true;
  }
  if (id === 'family_dilemma') {
    if(familyVisitReason(s,caregiver(s)))return false;
    if (f.interactionUses.dilemma || caregiver(s)?.alive === false) return false;
    const sceneId = familyScene(s), scene = FAMILY_SCENES[sceneId];
    f.pending = { personId: caregiver(s).id, sceneId };
    ctx.setEvent('family_dilemma', scene.title, 'Family and belonging', scene.body(s), scene.choices); return true;
  }
  if (age < 6) return false;
  if (id.startsWith('school_enroll_')) {
    const route = id.slice(14), row = schoolRecord(s, route);
    if (!row || age < row.minAge || s.locationId !== row.locationId || e.enrolled && e.route === route) return false;
    if (bondReason(s)) return false;
    const transfer=activateCourse(s,route);
    payTuition(s, route, ctx, { charged: true });
    const teacher = educationTeacher(s); teacherMemory(s, `You enrolled at ${row.name} and began with a question of your own.`);
    if (route === 'academy') makeClassmates(s, ctx);
    if (route === 'apprenticeship') bindApprentice(s, teacher.name, ctx);
    history(s, 'education', 'A named place to learn', `${row.name} enrolled you with ${teacher.name}. ${transfer.returning?`Your ${e.attendance} recorded sessions, ${e.progress} course progress and ${e.performance}/100 performance resume.`: 'This route begins with zero attended sessions and zero course progress.'} ${transfer.from?`Earlier course preparation is kept; your ${e.lessonsThisYear}/8 annual lessons, ${e.preparationsThisYear}/2 revisions and examination limit are shared across routes.`:''} Your combat identity and independent reading remain your choices.`, ctx); return true;
  }
  if (id === 'school_scholarship') {
    if (blocked(s, id)) return false;
    const passed = scholarshipExam(s, ctx);
    s.notice = passed ? 'A place at the grammar school, without a fee. One of three.' : 'You were not one of the three. There is no second sitting.';
    return true;
  }
  if (id === 'school_entrance') {
    if (blocked(s, id)) return false;
    const passed = entranceExam(s, ctx);
    s.notice = passed ? 'Admitted, if the fee is paid.' : 'Turned away. Next year, if you dare.';
    return true;
  }
  if (id === 'school_letters') {
    if (blocked(s, id)) return false;
    lettersLesson(s, ctx);
    s.notice = isLiterate(s) ? 'You can read.' : `Lesson ${schooling(s).lettersLessons} of ${LETTERS_LESSONS} with the archivist.`;
    return true;
  }
  if (id.startsWith('school_sit_')) {
    const inst = institutionById(id.slice(11)); if (!inst || !householdActions(s).some(a => a.id === id && !a.disabledReason)) return false;
    institutionEntrance(s, inst.id, ctx); return true;
  }
  if (id.startsWith('school_place_')) {
    const inst = institutionById(id.slice(13)); if (!inst || !householdActions(s).some(a => a.id === id && !a.disabledReason)) return false;
    institutionScholarship(s, inst.id, ctx); return true;
  }
  if (id.startsWith('school_read_')) {
    const inst = INSTITUTIONS.find(i => id.startsWith(`school_read_${i.id}_`)); if (!inst) return false;
    const subject = id.slice(13 + inst.id.length);
    if (blocked(s, id)) return false;
    return enrolInstitution(s, inst.id, subject, ctx);
  }
  if (id === 'school_lecture') {
    if (blocked(s, id)) return false;
    payInstitutionYear(s, ctx);
    return institutionLesson(s, ctx);
  }
  if (id === 'school_degree') {
    if (blocked(s, id)) return false;
    institutionExam(s, ctx); return true;
  }
  if (id === 'school_break_bond') {
    if (blocked(s, id)) return false;
    return breakBond(s, ctx, 'paid');
  }
  if (id.startsWith('school_elective_')) {
    if (blocked(s, id)) return false;
    if (!chooseElective(s, id.slice('school_elective_'.length), ctx)) return false;
    s.notice = 'Chosen. Four lessons, then the master’s grade.';
    return true;
  }
  // A scholarship promise made before schooling (v0.64) is still kept: the service it captured stays open.
  if (id === 'school_service') {
    if (age < 12 || !s.obligations.some(o => o.id === 'school_service' && !o.resolved)) return false;
    ctx.finishObligation('school_service'); skill(s, 'persuasion'); e.performance = clamp(e.performance + 5);
    history(s, 'education', 'A scholarship promise fulfilled', 'You helped with supervised reading and supplies, kept your funding, and fulfilled the promised service.', ctx); return true;
  }
  if (schoolReason(s, { feeCharged: id === 'school_attend' })) return false;
  const row = schoolRecord(s, e.route);
  if (id === 'school_path') {
    if (e.depthVersion !== 1 || age < 12) return false;
    e.pending = { sceneId: 'path' };
    ctx.setEvent('school_path', 'What you want your learning to do', 'A direction within education', `${educationTeacher(s).name} offers several ways to use the learning you already practice. A direction can change; it is not a combat class or a promise that every pupil wants the same future.`, Object.entries(ACADEMIC_PATHS).map(([key,value]) => choice(key, value.label, `Future completed projects add practiced ${value.skill}. Choosing a direction now gives no skill or qualification.`)));
    return true;
  }
  if (id.startsWith('school_project_')) {
    const project = PROJECTS.find(p => p.id === id.slice('school_project_'.length) && p.route === e.route);
    if (e.depthVersion !== 1 || !project || e.progress < 2 || e.projects.some(p => p.id === project.id && p.age === age)) return false;
    e.pending = { sceneId: 'project', projectId: project.id, route: e.route };
    ctx.setEvent('school_project', project.title, `${row.name} · supervised project`, `${project.body} ${educationTeacher(s).name} has supervised your ${project.days}-day work; now your group must choose what to present.`, ['research','care','practical'].map(key => choice(key, project[key], `Gain two course progress and two practiced ${project.skills[key]}; ${e.academicPath ? `your ${ACADEMIC_PATHS[e.academicPath].label.toLowerCase()} direction adds one ${ACADEMIC_PATHS[e.academicPath].skill}` : 'no academic direction is required'}. The specific outcome and participants are remembered.`)));
    return true;
  }
  if (id === 'school_attend') {
    if (e.lessonsThisYear >= 8) return false;
    payTuition(s, e.route, ctx, { charged: true });
    ensureCourseBook(s);recordCourseAttendance(s);
    e.lessonsThisYear++; e.attendanceThisYear++; e.attendance++; e.progress++; e.performance = clamp(e.performance + lessonPerformance(s));
    onElectiveLesson(s, ctx);
    if (e.route === 'apprenticeship') onBondLesson(s, ctx); if (e.route === 'academy' && e.lessonsThisYear === 3) queueRivalry(s);
    skill(s, row.skills[0]); skill(s, row.skills[1]);
    s.flags.education = (s.flags.education || 0) + 1;
    teacherMemory(s, `At age ${age}, you took part in a real ${row.label.toLowerCase()} lesson.`);
    history(s, 'education', 'A lesson actually attended', `${row.name}: session ${e.attendance}, course progress ${e.progress}. ${row.skills.join(' and ')} grew through the lesson and practical work.`, ctx); return true;
  }
  if (id === 'school_exam') {
    if (age < row.examAge || e.progress < 4 || e.examinedYear === age || e.qualifications.some(q => q.route === e.route)) return false;
    e.pending = { sceneId: 'exam', route: e.route };
    ctx.setEvent('school_exam', 'The work you can actually show', 'School examination', `${educationTeacher(s).name} asks for a reading and a practical demonstration. Your course progress is ${e.progress}; six progress guarantees a prepared pass. With less preparation, you can still attempt the examination or revise first.`, [choice('present', 'Present the work honestly', 'Six progress passes; otherwise receive a clear revision plan without losing learned skills.'), ...(e.preparationsThisYear < 2 ? [choice('revise', 'Ask for a focused revision before presenting', 'Add one course progress and scholarship through a supervised revision. Up to two revisions this year.')] : []), choice('defer', 'Defer until you are ready', 'Keep your course progress and postpone without gaining a qualification.')]); return true;
  }
  if (id === 'school_dilemma') {
    if (f.interactionUses.schoolDilemma) return false;
    const scene = SCHOOL_SCENES[seededRoll(s.seed, `school-dilemma-${e.route}-${age}`, SCHOOL_SCENES.length)];
    e.pending = { sceneId: scene.id };
    ctx.setEvent('school_dilemma', scene.title, `${row.name} · a lesson with consequences`, scene.body(s), scene.choices); return true;
  }
  return false;
}

export function applyHouseholdChoice(s, eventId, pick, ctx) {
  if (observationalInfancy(s)||!householdEventIds()[eventId]?.includes(pick) || !s.family || !s.education) return false;
  const f = s.family, e = s.education, age = yearAge(s);
  if (eventId === 'family_dilemma') {
    if(age<6&&f.pending?.sceneId!=='early_child')return false;
    const scene = FAMILY_SCENES[f.pending?.sceneId];
    if (!scene || f.interactionUses.dilemma) return false;
    scene.effect(s, pick); memory(s, f.pending.personId, `${scene.title}: you chose to ${scene.choices.find(c => c.id === pick).label.toLowerCase()}.`, 7);
    f.interactionUses.dilemma = 1; f.pending = null;
    history(s, 'family', scene.title, `${scene.choices.find(c => c.id === pick).label}. This household remembers the decision.`, ctx); return true;
  }
  if (age < 6) return false;
  if (eventId === 'school_path') {
    if (e.depthVersion !== 1 || e.pending?.sceneId !== 'path' || !ACADEMIC_PATHS[pick] || age < 12) return false;
    e.academicPath = pick; e.pending = null;
    history(s, 'education', 'A direction chosen in conversation', `You chose ${ACADEMIC_PATHS[pick].label.toLowerCase()}. Future completed projects will practice its skills; changing a label did not award an ability.`, ctx); return true;
  }
  if (eventId === 'school_project') {
    const project = PROJECTS.find(p => p.id === e.pending?.projectId && p.route === e.route);
    if (e.depthVersion !== 1 || e.pending?.sceneId !== 'project' || !project || e.projects.some(p => p.id === project.id && p.age === age)) return false;
    const beneficiary = peopleAtHome(s).find(p => p.familyRole === 'sibling') || actor(s, 'fellow');
    const practiceSupport=e.route==='apprenticeship'?communitySupport(s,schoolRecord(s,e.route).locationId).schoolPreparationBonus:0;
    e.pending = null; e.progress += 2; e.performance = clamp(e.performance + 5); skill(s, project.skills[pick], 2+practiceSupport);
    if (ACADEMIC_PATHS[e.academicPath]) skill(s, ACADEMIC_PATHS[e.academicPath].skill);
    const outcome = `${project[pick]}. ${beneficiary && beneficiary.alive !== false ? `${beneficiary.name} saw what you presented` : 'The class kept an account of the work'}; the outcome was supervised learning, not a combat initiation.${practiceSupport?' An operating local apprentice hall supported two additional practiced skill points.':''}`;
    e.projects.push({ id: project.id, route: e.route, day: s.day, age, choice: pick, outcome, beneficiaryId: beneficiary?.alive !== false ? beneficiary?.id || null : null }); e.projects = e.projects.slice(-40);
    teacherMemory(s, `${project.title}: ${project[pick].toLowerCase()}.`);
    if (beneficiary?.alive !== false) memory(s, beneficiary?.id, `I remember your school project: ${project.title}, where you chose to ${project[pick].toLowerCase()}.`, pick === 'care' ? 6 : 3);
    history(s, 'education', project.title, outcome, ctx); return true;
  }
  // A scholarship scene left open before schooling (v0.64) is answered as it was offered.
  if (eventId === 'school_scholarship') {
    if (e.pending?.sceneId !== 'scholarship' || age < 12 || e.scholarship || pick === 'study' && s.hero.skills.scholarship < 2) return false;
    e.pending = null;
    if (pick !== 'wait') { e.scholarship = true; s.flags.scholarship = true; if (pick === 'service') ctx.addObligation('school_service', 'Complete the scholarship’s supervised service', 60, 'Help in the reading room through the school service action.'); }
    history(s, 'education', 'An education route kept open', pick === 'wait' ? 'You chose to keep learning freely before seeking a scholarship.' : `A free scholarship funds academy enrollment${pick === 'service' ? ' through the reading-room service you promised' : ' through your prepared questions and independent reading'}.`, ctx); return true;
  }
  if (eventId === 'school_exam') {
    if (e.pending?.sceneId !== 'exam' || e.pending.route !== e.route || !e.enrolled) return false;
    if (pick === 'revise' && e.preparationsThisYear >= 2) return false;
    e.pending = null;
    if (pick === 'revise') {
      e.preparationsThisYear++; e.progress++; skill(s, 'scholarship');
      history(s, 'education', 'A focused revision', 'You revised with the teacher instead of claiming a result before you were prepared. Course progress grew by one.', ctx); return true;
    }
    if (pick === 'defer') { history(s, 'education', 'The examination can wait', 'You kept your learned skills and course progress, and postponed the examination.', ctx); return true; }
    e.examinedYear = age;
    if (e.progress < 6) { e.performance = clamp(e.performance - 5); history(s, 'education', 'A revision plan, not an erased education', 'The examination showed gaps in your preparation. No qualification was granted, and no learned skill was erased. Return with six progress in a future term.', ctx); return true; }
    const row = schoolRecord(s, e.route), grade = clamp(60 + Math.floor(e.performance / 4) + Math.floor(f.support / 10), 60, 100);
    if (!e.qualifications.some(q => q.route === e.route)) { e.qualifications.push({ id: `${e.route}-certificate`, label: row.qualification, route: e.route, schoolId: row.id, grade, day: s.day, age }); onQualification(s, e.route, ctx); }
    if (e.route === 'academy') s.flags.certified = true;
    if (e.route === 'community') s.flags.literacyCertificate = true;
    if (e.route === 'shrine') s.flags.devotionalCertificate = true;
    if (e.route === 'apprenticeship') { s.flags.apprenticeship = true; if (age >= 16) s.life.career.experience += 8; }
    teacherMemory(s, `You earned the ${row.qualification.toLowerCase()} through prepared work, with grade ${grade}.`);
    history(s, 'education', 'A qualification earned', `${row.qualification} from ${row.name}, grade ${grade}. It records real preparation and does not assign a combat class.`, ctx); return true;
  }
  if (eventId === 'school_dilemma') {
    const scene = SCHOOL_SCENES.find(row => row.id === e.pending?.sceneId);
    if (!scene || f.interactionUses.schoolDilemma || !e.enrolled) return false;
    scene.effect(s, pick); teacherMemory(s, `${scene.title}: you chose ${scene.choices.find(c => c.id === pick).label.toLowerCase()}.`);
    f.interactionUses.schoolDilemma = 1; e.pending = null;
    history(s, 'education', scene.title, `${scene.choices.find(c => c.id === pick).label}. Your teacher remembers the specific choice.`, ctx); return true;
  }
  return false;
}

export function onHouseholdAge(s, ctx) {
  if (!s.family || !s.education) return;
  const age=yearAge(s),f=s.family,e=s.education;
  const birthday=s.timeline?.yearHistory?.findLast(r=>r.age===age&&r.day===s.day),personalNotice=s.notice;
  if(age<6&&f.housing==='unsheltered'&&caregiver(s)?.alive!==false){
    f.housing='shelter';f.support=clamp(f.support+8);
    memory(s,caregiver(s)?.id,'I found a safe temporary roof for you while you were too young to arrange your own care.',8);
    history(s,'family','Shelter around a small life',`${caregiver(s).name} arranged a place at the communal shelter. You were kept warm while familiar voices settled around you. Your recorded caregiver remains the person caring for you.`,ctx);
  }
  let schoolOutcome='';
  if(e.nextDepthVersion===1&&!e.pending&&!/^school-(?:tutor|[a-z]+-tutor)/.test(s.conversations?.pending?.personId || ''))initializeFamilyDepth(s);
  advanceEducationPeople(s,ctx);
  if(age>f.lastAge){
    f.lastAge=age;f.interactionUses={};f.support=clamp(f.support+(f.housing!=='unsheltered'?1:-2));
    if(age===6)history(s,'family','A door into named lessons','Community and shrine schools now offer free enrollment. Independent reading remains available if you do not enroll.',ctx);
    if(age===12)history(s,'family','More than one route into education','Academy study and practical apprenticeships are now open. A free scholarship can fund academy enrollment.',ctx);
  }
  if(age>e.lastAge){
    if(e.enrolled){
      const book=ensureCourseBook(s),attended=(book.attendance[e.route] || 0)+(book.priorCourse===e.route?book.priorAttendance:0);
      e.year++;e.performance=clamp(e.performance+(attended?4:-4));
      schoolOutcome=`${courseYearSummary(s,route=>schoolRecord(s,route).name)} Your course progress and learned skills remain; a new term is available.`;
      history(s,'education','A school year remembered',schoolOutcome,ctx);
    }
    e.lastAge=age;e.lessonsThisYear=0;e.preparationsThisYear=0;e.attendanceThisYear=0;
    if(e.courseBook)openCourseYear(s);
  }
  // Bookkeeping sits beside the actual birthday outcome instead of replacing it.
  if(birthday)s.notice=[birthday.summary,personalNotice,schoolOutcome].filter((v,i,a)=>v&&a.indexOf(v)===i).join('\n\n');
}

export function householdContext(s) {
  if (!s.family || !s.education) return { summary: '', caregiverName: caregiver(s)?.name || 'your recorded caregiver', familySummary: '', schoolSummary: '', housingSummary: '' };
  const f = s.family, e = s.education, present = f.members.filter(m => m.availability === 'present').map(m => `${m.name} (${m.relationship})`).join(', ');
  const missing = f.members.filter(m => m.availability !== 'present');
  const familySummary = `${setupLabel(f)}: ${present}.${missing.length ? ` ${missing.map(m => `${m.name}: ${m.availability}`).join('; ')}. These people are not offered as living contacts.` : ''}`;
  const housingSummary = `${HOUSING_LABELS[f.housing]}; household support ${f.support}/100.`;
  const edition = schoolingSummary(s);
  const schoolSummary = edition ? `${e.enrolled ? `Enrolled at ${schoolRecord(s, e.route).name}, ${e.attendance} lessons so far. ` : ''}${edition}` : e.enrolled ? `Enrolled at ${schoolRecord(s, e.route).name}, with ${e.attendance} actual sessions attended.` : yearAge(s)<6?'Named schools open at six. Before then, shared stories, pictures and counting are age-appropriate learning; they do not award school attendance.':'Not currently enrolled; free schools open at six, and independent reading remains a choice.';
  return { summary: `${familySummary} ${housingSummary} ${schoolSummary}`, caregiverName: caregiver(s).name, familySummary, schoolSummary, housingSummary };
}

export function householdView(s) {
  const context = householdContext(s), f = s.family, e = s.education;
  if (!f || !e) return { family: { setupLabel: 'Recorded household', housingLabel: 'Recorded home', summary: '', support: 0, members: [], history: [] }, education: { schoolName: 'No enrollment recorded', routeLabel: 'Independent learning', summary: '', enrolled: false, attendance: 0, progress: 0, performance: 50, scholarship: false, qualifications: [], history: [], routes: [] } };
  const available = householdActions(s);
  return { family: { setupLabel: setupLabel(f), housingLabel: HOUSING_LABELS[f.housing], summary: context.familySummary, support: f.support, members: f.members.map(m => { const p = m.personId ? actor(s, m.personId) : null; return { ...m, age: p?.age ?? null, bond: p?.bond ?? null, ...(p?.appearance ? { appearance: p.appearance, pronouns:p.pronouns } : {}) }; }), history: f.history }, education: { schoolName: e.route ? schoolRecord(s, e.route).name : 'No current enrollment', routeLabel: ROUTES.find(r => r.id === e.route)?.label || 'Independent learning', summary: context.schoolSummary, enrolled: e.enrolled, attendance: e.attendance, progress: e.progress, performance: e.performance, scholarship: e.scholarship, qualifications: e.qualifications, history: e.history, courses:courseRecords(s), teacher: educationTeacher(s), depth: educationDepthView(s), routes: ROUTES.map(r => { const row = schoolRecord(s, r.id), actual = available.find(a => a.id === `school_enroll_${r.id}`); return { id: r.id, name: row.name, description: (schoolDescription(s, r.id) || r.description)+(e.enrolled&&e.route!==r.id?' '+transferExplanation(s,r.id):''), minAge: r.minAge, actionId: `school_enroll_${r.id}`, ...(actual?.disabledReason ? { disabledReason: actual.disabledReason } : yearAge(s) < r.minAge ? { disabledReason: `Opens at age ${r.minAge}.` } : {}) }; }) } };
}

export function householdEventIds() { return { family_dilemma: ['help', 'ask', 'boundary'], school_dilemma: ['help', 'ask', 'boundary'], school_exam: ['present', 'revise', 'defer'], school_scholarship: ['study', 'service', 'wait'], school_project: ['research', 'care', 'practical'], school_path: ['inquiry', 'service', 'practical'] }; }
const int = (n, low = 0, high = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= low && n <= high;
const text = (s, max = 3000) => typeof s === 'string' && s.length <= max;
const validHistory = (h, s) => Array.isArray(h) && h.length <= 80 && h.every(r => r && int(r.day) && int(r.age, 0, 300) && text(r.title, 160) && text(r.text) && (!s || r.day <= s.day && r.age <= yearAge(s)));
export function validateHousehold(v, s) {
  try {
    if(v?.parentage!==undefined&&(v.parentage!=='unrecorded'||v.setup!=='orphan'))return false;
    const validId = id => FAMILY_IDS.includes(id) || s?.revision >= 5 && /^family_(guardian|sibling_[1-9][0-9]?)$/.test(id);
    if (!v || !SETUPS.includes(v.setup) || !['secure', 'shelter', 'unsheltered'].includes(v.housing) || !int(v.support, 0, 100) || !int(v.lastAge, 0, 300) || !validHistory(v.history, s) || s && v.lastAge > yearAge(s)) return false;
    if(v.parentage==='unrecorded'&&v.members.some(m=>m.biological&&m.relationship==='birth parent'&&m.availability!=='unknown'))return false;
    if(v.literate!==undefined&&typeof v.literate!=='boolean')return false;
    if (!Array.isArray(v.members) || v.members.length < 1 || v.members.length > 6 || !v.members.every(m => m && (m.personId === null || validId(m.personId)) && text(m.name, 100) && m.name.trim() && text(m.relationship, 80) && ['present', 'missing', 'deceased', 'unknown'].includes(m.availability) && typeof m.biological === 'boolean' && (m.availability === 'present' ? m.personId !== null : s?.revision >= 5 && m.availability === 'deceased' ? true : m.personId === null))) return false;
    const ids = v.members.filter(m => m.personId).map(m => m.personId);
    if (new Set(ids).size !== ids.length || !ids.includes('kin')) return false;
    if (s && !v.members.filter(m => m.personId).every(m => s.life.people.some(p => p.id === m.personId && p.name === m.name && p.role === 'relative' && (m.availability === 'deceased' ? p.alive === false : p.alive !== false)))) return false;
    if (['orphan', 'homeless'].includes(v.setup) && v.members.some(m => m.availability === 'present' && m.relationship.includes('parent'))) return false;
    if (!v.interactionUses || typeof v.interactionUses !== 'object' || Array.isArray(v.interactionUses) || !Object.entries(v.interactionUses).every(([k, n]) => (validId(k) || ['support', 'dilemma', 'schoolDilemma'].includes(k)) && int(n, 0, 3))) return false;
    if (v.pending !== null && (!v.pending || !ids.includes(v.pending.personId) || !Object.hasOwn(FAMILY_SCENES, v.pending.sceneId) || s && !s.life.people.some(p => p.id === v.pending.personId && p.alive !== false))) return false;
    if (s && ((v.pending !== null) !== (s.event?.id === 'family_dilemma') || v.pending !== null && v.interactionUses.dilemma)) return false;
    return true;
  } catch { return false; }
}
export function validateEducation(v, s) {
  try {
    if(v&&!validateCourseBook(v,s))return false;
    if(v?.nextDepthVersion!==undefined&&(v.nextDepthVersion!==1||v.depthVersion!==undefined))return false;
    if (v?.depthVersion !== undefined) {
      if (v.depthVersion !== 1 || !int(v.depthStartedDay, 0, s?.day) || !(v.academicPath === null || Object.hasOwn(ACADEMIC_PATHS, v.academicPath)) || !Array.isArray(v.projects) || v.projects.length > 40 || !v.projects.every(p => p && PROJECTS.some(d => d.id === p.id && d.route === p.route) && int(p.day, v.depthStartedDay, s?.day) && int(p.age, 6, 300) && ['research','care','practical'].includes(p.choice) && text(p.outcome, 1800) && (p.beneficiaryId === null || typeof p.beneficiaryId === 'string' && (!s || s.life.people.some(a => a.id === p.beneficiaryId))))) return false;
      if (!Array.isArray(v.teacherHistory) || v.teacherHistory.length > 80 || new Set(v.teacherHistory.map(t => t.id)).size !== v.teacherHistory.length || !v.teacherHistory.every(t => t && text(t.id, 80) && text(t.name, 80) && Number.isSafeInteger(t.bornDay) && t.bornDay >= -10000000 && ROUTES.some(r => r.id === t.route) && int(t.retiredDay, v.depthStartedDay, s?.day))) return false;
    }
    if (v?.teachers !== undefined && (!v.teachers || typeof v.teachers !== 'object' || Array.isArray(v.teachers) || Object.keys(v.teachers).length !== ROUTES.length || !ROUTES.every(route => { const t=v.teachers[route.id];return t && text(t.name,80) && t.name.trim() && Number.isSafeInteger(t.bornDay) && t.bornDay >= -100000 && (!s || t.bornDay <= s.day); }))) return false;
    if (!v || !(v.route === null || ROUTES.some(r => r.id === v.route)) || !(v.schoolId === null || ROUTES.some(r => `school-${r.id}` === v.schoolId)) || typeof v.enrolled !== 'boolean' || typeof v.scholarship !== 'boolean' || !int(v.year) || !int(v.attendance) || !int(v.progress) || !int(v.performance, 0, 100) || !int(v.lastAge, 0, 300) || !int(v.lessonsThisYear, 0, 8) || !int(v.attendanceThisYear, 0, 8) || !int(v.preparationsThisYear, 0, 2) || !(v.examinedYear === null || int(v.examinedYear, 0, 300))) return false;
    if (v.route === null ? v.schoolId !== null || v.enrolled : v.schoolId !== `school-${v.route}`) return false;
    if (s && v.enrolled && yearAge(s) < ROUTES.find(r => r.id === v.route).minAge) return false;
    if (s && (v.lastAge > yearAge(s) || v.examinedYear !== null && v.examinedYear > yearAge(s))) return false;
    if (!validHistory(v.history, s) || !Array.isArray(v.qualifications) || v.qualifications.length > 4 || new Set(v.qualifications.map(q => q.route)).size !== v.qualifications.length || !v.qualifications.every(q => q && ROUTES.some(r => r.id === q.route) && q.id === `${q.route}-certificate` && q.schoolId === `school-${q.route}` && text(q.label, 100) && int(q.grade, 60, 100) && int(q.day) && int(q.age, 0, 300) && (!s || q.day <= s.day && q.age <= yearAge(s)))) return false;
    if (v.pending !== null && (!v.pending || !['scholarship', 'exam', ...SCHOOL_SCENES.map(r => r.id), ...(v.depthVersion === 1 ? ['project','path'] : [])].includes(v.pending.sceneId) || ['exam','project'].includes(v.pending.sceneId) && v.pending.route !== v.route || v.pending.sceneId === 'project' && !PROJECTS.some(p => p.id === v.pending.projectId && p.route === v.route))) return false;
    if (s) {
      const eventId = v.pending?.sceneId === 'scholarship' ? 'school_scholarship' : v.pending?.sceneId === 'exam' ? 'school_exam' : v.pending?.sceneId === 'project' ? 'school_project' : v.pending?.sceneId === 'path' ? 'school_path' : v.pending ? 'school_dilemma' : null;
      if ((['school_scholarship', 'school_exam', 'school_dilemma', 'school_project', 'school_path'].includes(s.event?.id) ? s.event.id : null) !== eventId) return false;
      if (eventId === 'school_scholarship' && (yearAge(s) < 12 || v.scholarship)) return false;
      if (eventId && eventId !== 'school_scholarship' && (!v.enrolled || yearAge(s) < 6)) return false;
      if (eventId === 'school_dilemma' && s.family?.interactionUses.schoolDilemma) return false;
      if (eventId === 'school_path' && yearAge(s) < 12) return false;
    }
    return true;
  } catch { return false; }
}
