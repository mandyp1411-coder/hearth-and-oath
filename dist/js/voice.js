import { settlementServices } from './world-services.js';
import { schooling, isLiterate, tuitionDue, electiveOffer, institutionYearDue } from './schooling.js';
import { member as guildMember, BUY_IN } from './guild.js';
import { activeInjuries, INJURIES, loyaltyOf } from './battlecraft.js';
import { cloth, faithRightNow } from './faith.js';

// Voice: the game speaks as a terse, grim chronicle with a dry edge, in the
// register of its engraved art. This module rewrites what the player reads
// at the edge of the UI; the engine's own text (with its numbers) is kept
// as `detail` and shown to those who ask for it. Nothing here changes what
// an action or a choice does.

const edition = s => !!s?.hero?.station || s?.householdBudget?.debt !== undefined;
const nameOf = (s, id) => s.life?.people.find(p => p.id === id)?.name || s.companions?.find(p => p.id === id)?.name || s.society?.people?.find(p => p.id === id)?.name || null;
const after = (label, prefix) => label.startsWith(prefix) ? label.slice(prefix.length) : null;

// Exact ids, then patterns. A line is a short situation; the label stays a verb.
const EXACT = {
  atlas_rumors: ['Ask about the roads', 'A day spent listening to people who have been somewhere.'],
  atlas_room_market: ['The market', 'Stalls, prices, and whoever is shouting them.'],
  atlas_room_tavern: ['The tavern', 'Low beams, loud talk, and a fire someone else paid for.'],
  atlas_room_shrine: ['The shrine', 'Candle smoke and the names of the dead.'],
  atlas_room_watch: ['The watchhouse', 'Where the law keeps its ledgers and its cells.'],
  atlas_room_archive: ['The school and archive', 'Ink, dust, and the people who can read.'],
  atlas_room_homes: ['Home', 'Your own door, or the door you were raised behind.'],
  atlas_room_workyard: ['The work yard', 'Where hands are hired by the day.'],
  atlas_room_gate: ['The gate', 'The road out, and the people watching it.'],
  grow_play: ['Play outdoors', 'The paths near home, and what lives along them.'],
  grow_read: ['Read what you can find', 'Whatever has words on it. Nobody is checking.'],
  grow_survival: ['Learn the woods', 'Snares, firewood, which berries kill you.'],
  grow_stealth: ['Learn to go unseen', 'Quiet feet and a straight face.'],
  grow_defense: ['Learn to take a blow', 'And where to stand so you take fewer.'],
  grow_weapons: ['Learn the stick', 'Before anyone lets you near a blade.'],
  grow_devotion: ['Sit with the shrine keeper', 'Prayers, and the reasons for them.'],
  grow_arcana: ['Watch the one who knows signs', 'Marks on a door that mean something.'],
  grow_school: ['Go to the lessons', 'If there are any, and if they will have you.'],
  upbringing_discovery: ['Explore & play', 'A year outside with the other children, learning the paths.'],
  upbringing_learning: ['Lessons & curiosity', 'A year with books and lessons, if there are any to be had.'],
  upbringing_friendship: ['Family & friends', 'A year with the people you are growing up beside.'],
  upbringing_practice: ['Work & practice', 'A year of hands, tools, and being told you are doing it wrong.'],
  health_rest: ['Take to bed', 'Three days of rest, clean water, and quiet.'],
  health_support: ['Find someone to talk to', 'Two days with someone who will listen.'],
  health_routine: ['Mind yourself', 'Three days of meals, sleep, and walking.'],
  health_clinic: ['Send for the healer', 'Two days, and the fee.'],
  health_herbs: ['Prepare the herbs', 'What the hedge grows, boiled and strained.'],
  social_gather: ['An afternoon with your circle', 'Whoever turns up.'],
  pastime_interest: ['Find something you enjoy', 'A book, a board, a garden, a tune. Something that is yours.'],
  pastime_fair: ['The travelling fair', 'Lanterns, puppets, and borrowed luck.'],
  pastime_pet: ['The animal keeper', 'Whether the house has room for one more mouth.'],
  pastime_relax: ['An idle day', 'Nothing asked of you.'],
  fun_pairs: ['Runestone pairs', 'A game of memory, and a day lost to it.'],
  fun_prank: ['A harmless prank', 'Festival masks, swapped. Nobody is hurt.'],
  leisure_outdoors: ['A day outdoors', 'Air, and nothing asked of you.'],
  leisure_sketch: ['Sketch what you see', 'A day drawing what is in front of you.'],
  leisure_picnic: ['A picnic', 'Bread, a blanket, and a hill.'],
  leisure_walk: ['A walk', 'The paths around the town, taken slowly.'],
  leisure_read: ['Read', 'A day with a book and the door shut.'],
  leisure_circle: ['Sit with your circle', 'Talk, and a fire.'],
  career_work: ['Work a shift', 'Three days of it. The pay comes after.'],
  career_practice: ['Practise the trade', 'A day at the bench with no customer waiting.'],
  career_batch_continue: ['Back to the work', 'The commission is not finished.'],
  school_attend: ['Go to a lesson', 'Four days. Someone who can read, teaching those who cannot.'],
  school_exam: ['Sit the examination', 'Two days. The result is written down and kept.'],
  school_path: ['Choose what you study', 'Inquiry, service, or the practical.'],
  school_dilemma: ['Trouble at school', 'Among teachers and classmates, something needs an answer.'],
  school_scholarship: ['Sit the scholarship examination', 'Three places, forty children, one sitting in a life.'],
  school_entrance: ['Sit the entrance examination', 'Letters, numbers and a little history, before the master.'],
  school_letters: ['Learn your letters', 'Four afternoons with the archivist and a slate. Most grown people never do.'],
  school_lecture: ['Hear a lecture', 'Five days in the capital, understanding more than last time.'],
  school_degree: ['Sit the final examination', 'Three examiners, a long table, three years of your life on it.'],
  school_break_bond: ['Buy back your bond', 'Thirty gold on the bench and the paper torn. Cheaper than walking out.'],
  school_service: ['Keep the reading-room promise', 'Three days of shelving and quiet.'],
  guild_join: ['Put your name on the rolls', 'A day at the hall. The dues start with the season.'],
  guild_buy_in: ['Buy a place on the rolls', 'Eighty gold on the table. They will remember what you paid.'],
  guild_dues: ['Settle your dues', 'What the hall is owed, into the chest.'],
  guild_assignment: ['Do the hall’s work', 'Six days, the hall’s pay, the warden’s book.'],
  guild_wander: ['Work a season on the road', 'Six days at a strange bench, for the book.'],
  guild_masterpiece: ['Make your masterpiece', 'Fourteen days with the door shut. Then the wardens.'],
  guild_apprentice: ['Take an apprentice', 'A child from the lower houses, three years at your bench.'],
  guild_leave: ['Walk out of the hall', 'Your name off the rolls, and the hall’s long memory.'],
  adventure_descend: ['Go down', 'A day and a ration. Six gold at the door for the pack.'],
  delve_search: ['Search the room', 'An hour of light, and some noise.'],
  delve_take: ['Take it', 'What is here, into the pack.'],
  delve_claim: ['Do what you came for', 'The reason you went down.'],
  delve_torch: ['Light a torch', 'Four hours. The corners come back.'],
  delve_oil: ['Fire the nest', 'The oil and a torch. Everything hears it.'],
  delve_camp: ['Camp here', 'Eight hours, a ration, your back to a checked wall.'],
  delve_descend: ['Go down', 'Worse odds, better finds.'],
  delve_out: ['Climb out', 'Daylight, and what you carry.'],
  battlecraft_read_bestiary: ['Read the bestiaries', 'Two days and five gold in the archive. What lives here, and what it fears.'],
  faith_novice: ['Ask for the novice’s place', 'A year of the offices, then the vows, if the house will have you.'],
  faith_ordain: ['Present your orders', 'The Seminary’s paper, read aloud at the shrine.'],
  faith_offices: ['Keep the offices', 'Three days of the shrine’s work.'],
  faith_penance: ['Do your penance', 'The floor, the lamps, the silence.'],
  faith_tithe_pay: ['Pay the tithe owed', 'Into the house’s box.'],
  faith_vows: ['Take the vows', 'Poverty, chastity, obedience, on the shrine floor.'],
  faith_assignment: ['The prior’s work', 'Four days, and the house’s regard.'],
  faith_keep: ['Ask for a shrine to keep', 'The lamps, the flock, a stipend, a roof.'],
  faith_hear: ['Hear a confession', 'A day, and whatever they carry.'],
  faith_leave: ['Leave the cloth', 'The grey handed back.'],
  family_support: ['Ask for what you need', 'A conversation with the person who raises you.'],
  family_shelter: ['Find a roof', 'Somewhere with walls, for now.'],
  family_dilemma: ['Trouble at home', 'Something in the house needs an answer.'],
  life_rest: ['A quiet week', 'Seven days of nothing asked of you.'],
  life_family: ['Start a household', 'A door of your own, and whoever you share it with.'],
  life_career_train: ['Practise your craft', 'Four days at it, unpaid.'],
  life_promotion: ['Ask the guild to recognise you', 'Two days of asking. They have seen your work, or they have not.'],
  life_home_cottage: ['Buy a cottage', 'Four walls that are yours, and the upkeep that comes with them.'],
  life_home_townhouse: ['Buy a townhouse', 'A street address, and the neighbours that come with it.'],
  life_home_estate: ['Buy an estate', 'Land, a hall, and everyone who will want something from you.'],
  budget_repay: ['Pay down what you owe', 'Hand the lender what you can. Interest stops on what is paid.'],
  budget_lifestyle_frugal: ['Live frugally', 'Thin soup, patched clothes, a roof.'],
  budget_lifestyle_comfortable: ['Live comfortably', 'Meat some days, a second shirt, a fire in the evening.'],
  budget_lifestyle_generous: ['Live generously', 'Guests, wine, and a name for both.'],
  budget_focus_livelihood: ['Put the work first', 'The year goes to earning.'],
  budget_focus_family: ['Put the family first', 'The year goes to the people at home.'],
  budget_focus_education: ['Put learning first', 'The year goes to books, and costs more for it.'],
  budget_focus_adventure: ['Put the road first', 'The year goes to going.'],
  budget_focus_balanced: ['Keep a balance', 'A little of everything, and not much of anything.'],
  nature_reckoning: ['An uneasy word', 'An old grievance wants an answer.'],
  work: ['Work for the day', 'Three days of whatever pays.'],
  rest: ['Rest at a hearth', 'Two days, and a few coins for the fire.'],
  study: ['Study with a teacher', 'Five days and twelve gold. Letters do not come free.'],
  train: ['Train', 'Three days of bruises.'],
  choose_profession: ['Find an apprenticeship', 'Two days of asking who needs hands.'],
};
const PATTERNS = [
  [/^atlas_room_(.+)$/, (s, a, m) => [after(a.label, 'Enter ') || a.label, 'Walk there. It costs no days.']],
  [/^talk_(.+)$/, (s, a) => [a.label, 'A few words. What you say will be remembered.']],
  [/^grow_family$/, (s, a) => [a.label.replace(/^Make time for /, 'Time with '), 'The people who are raising you, such as they are.']],
  [/^family_time_(.+)$/, (s, a) => [a.label.replace(/^(Spend time with|Make room for care with|Visit) /, 'Time with ').replace(/ at their home$/, ''), 'Whatever they have time for.']],
  [/^social_join_/, (s, a) => [a.label, 'There is an empty place beside them.']],
  [/^social_reconcile_/, (s, a) => [a.label.replace(/^Talk with /, 'Hear out '), 'Two people who are not speaking, and you between them.']],
  [/^social_introduce_/, (s, a) => [a.label.replace(/^Spend time with /, 'Bring together '), 'An ordinary afternoon that might start something.']],
  [/^misdeed_prank_/, (s, a) => [a.label.replace(/^Pull a Prank — /, 'A prank on '), 'A joke at their expense. They may not laugh.']],
  [/^career_choose_(?!unemployed)/, (s, a) => [a.label.replace(/^(Become|Train as|Apprentice as) /, 'Apprentice as '), 'Years of someone else’s orders, and a trade at the end of them.']],
  [/^school_enroll_/, (s, a) => [a.label.replace(/^Enroll at /, 'Enrol at ').replace(/^Transfer to /, 'Move to '), 'If they will take you.']],
  [/^school_project_/, (s, a) => [a.label, 'Supervised work with the school’s tools, and a result that is kept.']],
  [/^school_elective_/, (s, a) => [a.label, a.description.split(' Four lessons')[0]]],
  [/^school_sit_/, (s, a) => [a.label.replace(/^Sit the entrance examination of /, 'Sit the entrance of '), 'Once a year, before three examiners. The fee for the sitting is not returned.']],
  [/^school_place_/, (s, a) => [a.label.replace(/^Sit for the one free place at /, 'Sit for the free place at '), 'One place a year for someone who cannot pay. Everyone who cannot pay sits for it.']],
  [/^school_read_/, (s, a) => [a.label.replace(/^Be read into /, 'Be read into '), a.description.split('. ').slice(-1)[0]]],
  [/^lineage_continue_/, (s, a) => [a.label, 'The next volume.']],
];

/** The voiced action: a short situation to read, the engine's figures kept as detail. */
export function voiceAction(s, a) {
  if (!a || !edition(s)) return a;
  const exact = EXACT[a.id];
  let line = exact ? exact : null;
  if (!line) for (const [re, fn] of PATTERNS) { const m = a.id.match(re); if (m) { line = fn(s, a, m); break; } }
  if (!line) return a;
  const [label, description] = line;
  return { ...a, label: label || a.label, description, detail: a.description };
}
export function voiceActions(s, actions) { return edition(s) ? actions.map(a => voiceAction(s, a)) : actions; }

// Events: the same treatment for the moments every life meets. The choice ids
// and effects are the engine's; only the words change.
const CONDITION = { fever: 'A fever', infection: 'A wound gone bad', injury: 'An injury', chronic: 'The old complaint', distress: 'A black mood', anxiety: 'A dread that will not settle', depression: 'A weight that does not lift' };
function voiceHealth(s, ev) {
  const pending = s.health?.pending, condition = pending && [...(s.health.physical || []), ...(s.health.mental || [])].find(c => c.id === pending.conditionId);
  if (!condition) return ev;
  const name = CONDITION[condition.type] || 'A sickness', bad = condition.severity >= 3 ? ' It is as bad as it gets.' : condition.severity === 2 ? ' It is getting worse.' : '';
  const where = condition.circumstance === 'winter' ? ' It came with the winter, in a house with little to fight it with.' : condition.circumstance === 'outdoors' ? ' You caught it on the road.' : condition.circumstance === 'stress' ? ' The strain brought it on.' : '';
  const body = s.age < 3 ? `${name.toLowerCase()} in the cradle. The adults sit up with you.` : `${name}.${bad}${where}${condition.careUntil > s.day ? ' You are being seen to.' : ' Nobody has seen to it yet.'}`;
  const words = {
    rest: ['Take to bed', 'Three days. The body does most of the work.'],
    care: ['Send for the healer', s.age < 18 ? 'Two days. The house pays, if it can.' : `Two days, and the healer’s fee.`],
    support: ['Find someone to sit with you', 'Two days with someone who will listen.'],
    routine: ['Mind yourself', 'Three days of meals, sleep, and walking.'],
    continue: ['Carry on', 'Name it and keep working. It will not thank you.'],
  };
  return { ...ev, title: s.age < 3 ? 'A sickness in the cradle' : pending.kind === 'mental' ? 'The mind' : 'The body', category: pending.kind === 'mental' ? 'The mind' : 'The body', body, choices: ev.choices.map(c => words[c.id] ? { ...c, label: words[c.id][0], description: words[c.id][1], detail: c.description } : c) };
}
function voiceDeadline(s, ev) {
  const o = s.obligations.find(o => !o.resolved && ev.body.includes(o.title));
  const days = o ? Math.max(0, o.dueDay - s.day) : null;
  return { ...ev, title: 'A promise coming due', category: 'A promise', body: `${o ? `“${o.title}” is due${days === 0 ? ' today' : days === 1 ? ' tomorrow' : ` in ${days} days`}. ${o.description || ''}` : ev.body} The year stops here until you say otherwise.`,
    choices: ev.choices.map(c => c.id === 'pause' ? { ...c, label: 'Keep the promise', description: 'Stop the year and see to it.', detail: c.description } : c.id === 'continue' ? { ...c, label: 'Let it go', description: 'Keep the year moving and take what comes of a promise broken.', detail: c.description } : c) };
}
const FAMILY = {
  'A little space beside the hearth': ['Beside the hearth', 'The house settles for the evening. There is room beside the fire for a small person.', { help: ['The story', 'The one you know by heart.'], ask: ['A lap', 'Warm, and not going anywhere.'], boundary: ['A quiet corner', 'Yours, for a little while.'] }],
  'The work that keeps a roof above you': ['The work that keeps the roof on', null, { help: ['Take a share of it', 'Chores a child can do, and a house that notices.'], ask: ['Ask for time for lessons', 'The work is there either way. So is the learning, if you ask.'], boundary: ['Ask a neighbour to share the load', 'Someone owes the house a favour.'] }],
  'A familiar voice, with help nearby': ['A familiar voice', null, { help: ['Stay close', 'The care that is there, taken.'], ask: ['Bring a story into it', 'Learning that does not need a school.'], boundary: ['Let the neighbours in', 'Other hands, other voices.'] }],
  'A sibling’s own plan': ['A sibling’s plan', null, { help: ['Speak for them', 'They want to be heard, not decided for.'], ask: ['Ask what they hope for', 'And listen to the answer.'], boundary: ['Back them, without promising', 'You cannot fix it. You can stand beside it.'] }],
  'The person who once carried you': ['The one who carried you', null, { help: ['Arrange help, with their say-so', 'Practical, and theirs to refuse.'], ask: ['Ask what they want changed', 'Not what you think they need.'], boundary: ['Share it with the others', 'You are not the only one who owes them.'] }],
};
function voiceFamily(s, ev) {
  const row = FAMILY[ev.title]; if (!row) return ev;
  const [title, body, choices] = row, carer = s.life?.people.find(p => p.id === 'kin' && p.alive !== false)?.name;
  return { ...ev, title, category: 'At home', body: body || ev.body.replace(/\s*(This does not invent|No wages or materials|accepting help need not)[^.]*\./g, ''), choices: ev.choices.map(c => choices[c.id] ? { ...c, label: choices[c.id][0], description: choices[c.id][1], detail: c.description } : c) };
}
const SCHOOL = {
  'The answer left on the teacher’s table': ['The answers on the table', 'Tomorrow’s answers, left where a frightened classmate found them. The teacher would help anyone who asked. Asking means admitting you need it.', { help: ['Ask for help', 'And let the teacher see you do not know.'], ask: ['Teach what you know', 'To the one who is frightened. It is not everything.'], boundary: ['Leave the answers where they are', 'And say nothing about who found them.'] }],
  'Two names on the lesson project': ['Two names, one label', null, { help: ['Both names', 'It was both of you.'], ask: ['Say who did what', 'Exactly, and let the patron make of it what he will.'], boundary: ['Refuse the praise', 'Until the label is right.'] }],
  'Whose memory belongs in the lesson?': ['A lesson with the dead', null, { help: ['Ask the dead first', 'Nothing is done without their leave.'], ask: ['Read the law', 'What is written, against what is wanted.'], boundary: ['Keep it on the page', 'No rite. Not today.'] }],
  'The lesson outside the classroom': ['The hum under the garden', null, { help: ['Mark the roots', 'And keep the spades off them.'], ask: ['Find the old account', 'Someone wrote about this once.'], boundary: ['Watch and write', 'Touch nothing you do not understand.'] }],
  'A seat for someone without tuition': ['A seat without a fee', null, { help: ['Share the books', 'Without taking over.'], ask: ['Ask for a fair timetable', 'So nobody’s lessons are the price.'], boundary: ['Offer what you can keep up', 'And no more than that.'] }],
};
function voiceSchool(s, ev) {
  const row = SCHOOL[ev.title]; if (!row) return ev;
  const [title, body, choices] = row;
  return { ...ev, title, category: 'At school', body: body || ev.body, choices: ev.choices.map(c => choices[c.id] ? { ...c, label: choices[c.id][0], description: choices[c.id][1], detail: c.description } : c) };
}
export function voiceEvent(s, ev) {
  if (!ev || !edition(s)) return ev;
  if (ev.id === 'health_concern') return voiceHealth(s, ev);
  if (ev.id === 'annual_deadline_review') return voiceDeadline(s, ev);
  if (ev.id === 'family_dilemma') return voiceFamily(s, ev);
  if (ev.id === 'school_dilemma') return voiceSchool(s, ev);
  return ev;
}

// The book. Each age band is a chapter; the journal reads under its heading.
export const CHAPTERS = Object.freeze([
  [0, 'The cradle'], [6, 'The yard'], [13, 'The threshold'], [18, 'The road'], [30, 'The work'], [45, 'The weight'], [60, 'The long evening'],
]);
export function chapterOf(age) { let found = CHAPTERS[0]; for (const row of CHAPTERS) if (age >= row[0]) found = row; return { number: CHAPTERS.indexOf(found) + 1, title: found[1], from: found[0] }; }
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export function chapterHeading(age) { const c = chapterOf(age); return `Chapter ${ROMAN[c.number - 1]} · ${c.title}`; }

/** The epitaph judges the life against what it set out to do, in a line.
 * "Ishkaren Javulessa, smith of Iron Hold. He never saw the sea." */
export function epitaph(s, reason = '') {
  const h = s.hero, name = h.name, pronoun = h.pronouns === 'she/her' ? 'She' : h.pronouns === 'he/him' ? 'He' : 'They', were = pronoun === 'They' ? 'were' : 'was';
  const home = s.world?.locations.find(p => p.id === (s.life?.home?.locationId || h.birthplaceId))?.name || s.world?.locations.find(p => p.id === h.birthplaceId)?.name || 'nowhere in particular';
  const trade = h.profession && h.profession !== 'Unemployed' ? h.profession.toLowerCase() : null;
  const who = `${name}, ${trade ? `${trade} of ${home}` : s.age < 18 ? `child of ${home}` : `of ${home}`}.`;
  const children = (s.life?.children || []), buried = children.filter(c => c.alive === false).length, raised = children.length - buried;
  const far = Object.values(s.cartography?.sites || {}).filter(r => r?.kind === 'Visited').length;
  const debt = s.householdBudget?.debt || 0, lender = h.station?.ties?.find(t => t.kind === 'owes')?.name;
  const cause = s.health?.deathCause || reason || '';
  const lines = [];
  if (s.age < 6) lines.push(`${pronoun} did not see the thaw.`);
  else if (s.age < 18) lines.push(`${pronoun} ${were} ${s.age}. The book is short.`);
  if (/winter fever/i.test(cause) && s.age >= 6) lines.push(`The winter took ${pronoun.toLowerCase() === 'they' ? 'them' : pronoun === 'He' ? 'him' : 'her'}.`);
  if (/left untreated/i.test(cause)) lines.push(`${pronoun} would not be seen to, and it ran its course.`);
  if (debt > 0) lines.push(`${pronoun} died owing ${lender ? lender : 'the lender'}.`);
  if (s.householdBudget?.fledDebt) lines.push(`${pronoun} left a debt and a name behind in another town.`);
  if (raised || buried) lines.push(`${pronoun} raised ${raised || 'no'} child${raised === 1 ? '' : 'ren'}${buried ? ` and buried ${buried}` : ''}.`);
  if (s.age >= 18 && far <= 1) lines.push(`${pronoun} never went further than ${home}.`);
  else if (far >= 8) lines.push(`${pronoun} saw more of the world than most.`);
  if (h.marks?.some(m => m.id === 'drinker')) lines.push(`Drink had the last years.`);
  if (h.marks?.some(m => m.id === 'devout')) lines.push(`${pronoun} kept the faith to the end.`);
  if (s.age >= 80) lines.push(`${pronoun} ${were} old, which is rarer than it sounds.`);
  if (!lines.length) lines.push(reason === 'retirement' ? `${pronoun} put the work down while ${pronoun === 'They' ? 'they' : pronoun.toLowerCase()} still could.` : `${pronoun} ${were} ${s.age}. It was a life.`);
  return `${who} ${lines.slice(0, 2).join(' ')}`;
}
export function validateEpitaph(v) { return v === undefined || (typeof v === 'string' && v.length > 0 && v.length <= 400); }

// Right now: the three to five things that matter today, written as
// situations, chosen from what the engine already offers. The full menu
// stays beneath; this is the page you read first.
export function whatMatters(s, actions) {
  if (!edition(s) || !Array.isArray(actions) || s.event || s.battle) return [];
  const open = id => actions.find(a => (typeof id === 'string' ? a.id === id : id.test(a.id)) && !a.disabledReason);
  let services = null; const roomFor = kind => { services ||= (() => { try { return settlementServices(s); } catch { return []; } })(); const row = services.find(r => r.kind === kind); return row ? open('atlas_room_' + row.roomId) : null; };
  const rows = [], take = (a, why) => { if (a && !rows.some(r => r.id === a.id) && rows.length < 5) rows.push({ ...a, why }); };
  const b = s.householdBudget || {}, life = s.life || {}, health = s.health || {};
  const sick = (health.physical || []).find(c => c.careUntil <= s.day), low = (health.mental || []).find(c => c.careUntil <= s.day);
  if (sick) take(open('health_rest'), `${sick.severity >= 2 ? 'You are getting worse' : 'You are not well'}, and nobody has seen to it.`);
  if (low) take(open('health_support'), 'The mind is not right, and it will not mend alone.');
  if ((b.debt || 0) > 0 && s.hero.gold >= 20) take(open('budget_repay'), `You owe ${b.debt} gold and the interest is running.`);
  if ((b.bondedUntil || 0) > s.day) take(open('career_work'), 'Your days belong to the creditor until the bond is worked off.');
  if (s.age >= 18 && s.hero.profession !== 'Unemployed') take(open('career_work') || roomFor('work'), s.hero.gold < 40 ? `${s.hero.gold} gold in your purse. The work is there.` : 'The work is there.');
  if (s.age >= 16 && s.hero.profession === 'Unemployed') take(open(/^career_choose_(?!unemployed)/) || open('choose_profession') || roomFor('work'), 'You have no trade. Someone needs hands.');
  const k = schooling(s);
  if (k && s.age >= 12 && s.age < 18 && s.education?.enrolled && electiveOffer(s)) take(open(/^school_elective_/), 'The master wants to know what you will study this year.');
  if (k && s.age >= 12 && s.age <= 15 && k.scholarship === null) take(open('school_scholarship'), 'Three places at the grammar school, and one sitting in a life.');
  if (k && s.age >= 12 && s.age < 18 && k.literate && k.entrance.academy !== 'passed' && k.entrance.academyYear !== s.age) take(open('school_entrance'), 'The grammar school examines at its door, once a year.');
  if (s.age >= 6 && s.age < 18 && s.education?.enrolled) { const fee = k ? tuitionDue(s, s.education.route) : 0; take(open('school_attend') || roomFor('school'), fee ? `The schoolmaster wants his ${fee} gold before the first lesson of the year.` : 'There is a lesson, and you are not at it.'); }
  if (k && s.age >= 6 && s.age < 18 && !s.education?.enrolled && k.shrinePlace === false && s.hero.gold < tuitionDue(s, 'community') && s.hero.station?.freedom !== 'owned') take(open('school_enroll_apprenticeship') || open('grow_read') || open('grow_survival') || open('grow_play'), 'The keeper has his pupil and the schoolmaster wants his fee. No school this year.');
  if (s.age >= 6 && s.age < 18 && !s.education?.enrolled && (s.hero.station?.id !== 'bound' || s.family?.literate) && s.hero.station?.freedom !== 'owned') take(open('school_enroll_shrine') || open('school_enroll_community') || open('school_enroll_apprenticeship') || roomFor('school'), 'No school yet. Some doors are still open.');
  if (k && s.age >= 18 && !isLiterate(s) && s.hero.gold >= 3) take(open('school_letters') || roomFor('school'), 'You cannot read. The archivist teaches grown people, for a little.');
  if (k?.institution && !k.institution.degree) { const fee = institutionYearDue(s); take(open('school_degree') || open('school_lecture'), open('school_degree') ? 'The examiners sit this year. Three years of your life on the table.' : fee ? `The bursar wants ${fee} gold before the year’s first lecture.` : 'There are lectures you have not heard.'); }
  if (k?.bond && !k.bond.broken && !k.bond.done) take(open('school_attend'), `${k.bond.master}’s bench, and ${Math.max(1, Math.ceil((k.bond.until - s.day) / 365))} more year${Math.ceil((k.bond.until - s.day) / 365) === 1 ? '' : 's'} of the bond.`);
  const gm = guildMember(s);
  if (gm?.dues.arrears >= 2) take(open('guild_dues'), `${gm.dues.arrears} seasons of dues owed to the hall. At four the name comes off the rolls.`);
  if (gm?.assignment && !gm.assignment.done) take(open('guild_assignment'), 'The hall has given you its work for the year, and the warden keeps a book.');
  if (gm?.rank === 'journeyman' && gm.wander.done) take(open('guild_masterpiece'), 'The road years are served. The wardens will look at a masterpiece.');
  if (!gm && s.guild && s.age >= 16) take(open('guild_join'), 'The hall has a place for your name, if you take up the trade.');
  if (!gm && s.guild && s.age >= 18 && s.hero.gold >= BUY_IN * 2) take(open('guild_buy_in'), `The hall sells places at ${BUY_IN} gold, to those whose work it has seen.`);
  for (const i of activeInjuries(s).filter(i => !i.treated && !i.permanent && i.id !== 'bruised')) take(open('battlecraft_treat_' + i.id) || open('health_rest'), `${INJURIES[i.id].name}, untended. A healer would set it; left alone it goes bad.`);
  for (const c of (s.companions || []).filter(c => c.recruited && c.alive !== false && loyaltyOf(c) < 30)) take(open(/^talk_/), `${c.name} has had about enough of this.`);
  if (s.battlecraft && s.hero.specialization && s.age >= 18) take(open(/^battlecraft_learn_/), 'There is more to your calling than you know yet.');
  for (const row of faithRightNow(s)) take(open(row.id), row.text);
  if (!cloth(s) && s.faith && s.realm?.faithId && s.age >= 16 && (s.hero.skills?.devotion || 0) >= 3) take(open('faith_novice'), 'The house would take you, if you asked at the shrine.');
  if (k && s.age >= 16 && s.age <= 30 && !k.institution) take(open(/^school_read_/) || open(/^school_sit_/), open(/^school_read_/) ? 'An institution will have you, if the fee is found.' : 'The capitals examine at their doors. You hold the certificate they ask for.');
  if (s.age >= 6 && s.age < 18 && !s.education?.enrolled && (s.hero.station?.freedom === 'owned' || s.hero.station?.id === 'bound' && !s.family?.literate)) take(open('grow_survival') || open('grow_play') || open(/^upbringing_(practice|discovery)$/), 'No school for the likes of you. The woods and the field, then.');
  if ((life.stress || 0) >= 60 || (life.health ?? 80) < 50) take(open('life_rest') || open('health_routine'), (life.stress || 0) >= 60 ? 'Your hands shake. A week of nothing would help.' : 'You are worn thin.');
  if (s.family && s.family.support < 40 && s.age < 18) take(open('family_support') || open(/^family_time_/), 'The house is cold toward you. Say what you need.');
  if ((life.happiness ?? 60) < 35) take(open('social_gather') || open('pastime_interest') || open(/^leisure_/), 'There has been no joy in a long while.');
  if (rows.length < 3) take(open(/^talk_/), 'Someone you know is within earshot.');
  if (rows.length < 3) take(open('social_gather') || open('pastime_interest') || open(/^leisure_/) || open('grow_play'), 'An afternoon with nothing owed on it.');
  if (rows.length < 3 && s.age >= 18) take(open(/^life_home_/), 'A roof of your own is for sale.');
  return rows.slice(0, 5);
}
