import { receiveNotification } from './notifications-v40.js';
import { observationalInfancy } from './development.js';
import { editionScene } from './narrative-edition.js';
import { seededRoll, worldCalendarContext } from './world.js';
import { addCareerExperience, professionSkill } from './careers.js';
import { familyAnnualScene, applyFamilyAnnualChoice } from './life.js';
import { childhoodScene, snapshotChildhoodScene, applyChildhoodScene, validateChildhoodStories } from './childhood-stories.js';
import { adultYearNarrative } from './adult-year-narrative.js';
import { birthdayGift, comeOfAge, stationSummary } from './station.js';
import { rememberAnnualScene, captureAnnualScene, annualSceneAtChoice, validateAnnualScene } from './annual-world-memory.js';

const YEAR = 365;
const PICKS = ['care', 'curiosity', 'courage'];
const choice = (id, label, description) => ({ id, label, description });
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const YEARS = [
  ['The arms that first held you', 'Your guardians decide what kind of shelter to make around this new life.'],
  ['A first winter', 'A hard winter tests the household. Your guardians have little time, but choose what to make room for.'],
  ['The words you keep', 'You begin naming the people and things around you. A remembered voice helps make the world feel familiar.'],
  ['Beyond the garden gate', 'You and Mira follow a trail of bright leaves beyond the garden. Someone must decide whether to wander, watch, or call for help.'],
  ['A little thing worth saving', 'A frightened fox cub hides beneath a cart. Other children want to drive it away before the carter returns.'],
  ['The light beneath the hill', 'At dusk, you see a strange light under an old standing stone. A sound like a distant song follows you home.'],
  ['A place at the school table', 'A teacher offers a place at the village school. Your family can contribute work instead of coin; your household does not decide whether you may learn.'],
  ['The missing silver charm', 'Older children blame Mira for a missing silver charm. You saw it fall into the mud. What you do becomes part of your friendship.'],
  ['Orrin’s borrowed book', 'Orrin brings a book whose margins contain a second story. The teacher asks whether you read the lesson or the handwriting around it.'],
  ['The bridge in the rain', 'Floodwater traps a neighbor on the other bank. Adults are coming, but a small choice can help before they arrive.'],
  ['A teacher asks what you want', 'A retired guard, a shrine keeper, and an academy visitor offer different kinds of practice. None requires a class or family title.'],
  ['The answer you could copy', 'A difficult examination lies open on the teacher’s desk. Your friend is worried about failing and asks what you will do.'],
  ['An education with open doors', 'Your household discusses the next stage of learning. A service scholarship, practical apprenticeship, and community teaching are all real routes.'],
  ['The path through the brambles', 'Kest has found a narrow trail into the forest and asks you to help map it. There is a safer route, and an interesting one.'],
  ['The first road taken alone', 'Your guardians trust you with a message to another settlement. The region is larger than the view from your window.'],
  ['A page the academy forbids', 'Your teacher finds a page describing conversations with willing ancestors. Studying it is a question, not a criminal record known to the whole world.'],
  ['Work with a name attached', 'A craftsperson offers your first paid responsibility. Mira is also choosing her training, and asks whether you will still make time for old friends.'],
  ['The promise before leaving', 'Your family asks what sort of life you mean to build. They can advise you; they cannot choose your calling.'],
  ['A life you choose for yourself', 'You are eighteen. Your education, mistakes, friendships, and the strange things you saw are yours to carry into adult life. A calling must still be earned.'],
];
const FLAVORS = [
  'The household keeps a blue ribbon from this day.',
  'The rain leaves the courtyard smelling of rosemary.',
  'A traveling storyteller remembers your name.',
  'The festival bells sound late that evening.',
  'Your family later tells this story at the hearth.',
  'A handwritten note survives in a schoolbook.',
  'The candle gutters when the last visitor leaves.',
  'A mended cloak is folded beside the door that night.',
  'Someone keeps your question in the margin of a household book.',
  'The watch bell carries through the wet roofs.',
  'A carved wooden bird marks the memory on a shelf.',
  'A neighbor repeats the story differently, and leaves room for your account.',
  'A scrap of green thread survives in a family ledger.',
  'Your name is spoken once beside the public hearth.',
  'The road dust settles before anyone agrees what the day meant.',
  'A repaired cup becomes a small reminder of the choice.',
  'The keeper writes the date beside an unanswered question.',
  'A child from another household remembers your kindness.',
];

const SCENARIO_AGES = new Set([3, 4, 6, 8, 9, 11, 13, 14, 16, 17]);
const ordinary = (title, body, rows) => ({ title, body, choices: rows.map((row, index) => ({ id: PICKS[index], label: row[0], description: row[1], effect: row[2], memory: row[3] || row[0].toLowerCase() })) });
const CHILD_SCENES = [
  ordinary('The seedling under the broken cart', 'A delivery cart overturns beside the school garden. Its owner needs help; a rare seedling lies crushed beneath one wheel. Mira thinks both can be saved, but the adults are arguing about whose mistake it was.', [
    ['Help the owner and ask Mira to protect the roots', 'Gain persuasion and defense. Mira remembers that you shared the responsibility.', { skills: ['persuasion', 'defense'], companion: 'mira', bond: 5 }, 'share the work of saving the cart and garden'],
    ['Find a way to lift the wheel without breaking the roots', 'Gain scholarship and survival. A careful repair becomes part of your education.', { skills: ['scholarship', 'survival'] }, 'find a careful repair instead of assigning blame'],
    ['Mark a safer route and fetch a lever', 'Gain weapons and survival through practical problem solving.', { skills: ['weapons', 'survival'] }, 'bring a lever and make a safer route'],
  ]),
  ordinary('The tune that did not belong to the festival', 'A traveling musician plays a tune that no one at the festival recognizes. Your peer says the old words name a person erased from the shrine register. The musician will answer a sincere question, but wants the crowd to stop shouting.', [
    ['Make room for the musician to speak', 'Gain persuasion and devotion. Your friend remembers that you listened to an unfamiliar person.', { skills: ['persuasion', 'devotion'], social: 'fellow', bond: 6 }, 'make room for an unfamiliar voice'],
    ['Compare the song with the school’s oldest book', 'Gain scholarship and arcana. Keep a remembered discrepancy for later research.', { skills: ['scholarship', 'arcana'], fact: 'songDiscrepancy' }, 'notice a missing name in the old song'],
    ['Learn the rhythm and lead a quieter dance', 'Gain stealth and persuasion. Redirecting attention can solve a conflict without force.', { skills: ['stealth', 'persuasion'] }, 'calm the crowd through a shared dance'],
  ]),
  ordinary('The keeper’s missing fox', 'The forest keeper asks the schoolchildren to help find an injured fox before a storm. One trail leads to fresh footprints; another passes a flooded stream. Kest has an idea but waits to see whether anyone will take them seriously.', [
    ['Listen to Kest and organize a safe search', 'Gain defense and persuasion. Kest remembers being heard.', { skills: ['defense', 'persuasion'], companion: 'kest', bond: 5 }, 'listen to Kest before planning the search'],
    ['Study the tracks and prepare a gentle remedy', 'Gain survival and arcana. Find one useful herb bundle.', { skills: ['survival', 'arcana'], herbs: 1 }, 'read the tracks and bring a gentle remedy'],
    ['Follow the narrow trail and mark the return path', 'Gain stealth and survival. Safe return matters as much as finding the animal.', { skills: ['stealth', 'survival'], fact: 'markedSafeTrail' }, 'mark a safe trail through the storm'],
  ]),
  ordinary('A teacher accused without a hearing', 'An expensive academy lamp is found broken after your lesson. A visiting patron blames your local teacher and threatens to end community classes. Orrin knows who moved the lamp, but is afraid of the patron’s household.', [
    ['Ask for a hearing where Orrin can speak safely', 'Gain devotion and persuasion. Orrin remembers you respected his fear.', { skills: ['devotion', 'persuasion'], companion: 'orrin', bond: 5 }, 'protect Orrin’s chance to speak'],
    ['Inspect the lamp and reconstruct the accident', 'Gain scholarship and arcana. Evidence keeps community classes open.', { skills: ['scholarship', 'arcana'], fact: 'schoolPreserved' }, 'preserve the school through patient evidence'],
    ['Demonstrate how the unstable stand could fall', 'Gain weapons and defense through a careful practical demonstration.', { skills: ['weapons', 'defense'] }, 'test the claim before accepting the accusation'],
  ]),
];
CHILD_SCENES.push(
  ordinary('A bell without its clapper', 'The settlement’s small warning bell has lost its clapper. A maker can repair it, but the watch wants a replacement immediately and a neighbor needs the same scrap metal for a cooking pot. You are invited to help decide whose need is urgent.',[
    ['Ask the maker and neighbor to agree on a repair order','Gain persuasion and devotion. The public need is discussed with the people it affects.',{skills:['persuasion','devotion'],fact:'bellRepairAgreed'},'help neighbors agree on the warning bell'],
    ['Study the broken fitting before using another piece','Gain scholarship and defense. Careful inspection saves useful metal.',{skills:['scholarship','defense']},'inspect the fitting before replacing it'],
    ['Fetch spare iron and help test the repaired bell','Gain weapons and survival through supervised practical work.',{skills:['weapons','survival']},'help test a useful repair'],
  ]),
  ordinary('A stranger’s name at supper', 'A traveler reaches the communal meal after every place has been counted. One neighbor says an unknown household should wait outside. Your caregiver asks you to think about a welcome with clear boundaries.',[
    ['Make space and ask what help the traveler needs','Gain persuasion and a warmer household bond. Your caregiver remembers your thoughtful welcome.',{skills:['persuasion'],social:'kin',bond:7,happiness:3},'offer a welcome with clear boundaries'],
    ['Ask about the route and record their account','Gain scholarship and survival. Keep a road account without pretending every rumor is true.',{skills:['scholarship','survival'],fact:'firstTravelerAccount'},'listen carefully to a traveler’s account'],
    ['Help prepare another meal before asking for a story','Gain survival and devotion. Practical hospitality becomes a skill.',{skills:['survival','devotion']},'make hospitality useful'],
  ]),
  ordinary('The ferryman’s paper boat', 'A ferryman folds a toy boat from a spoiled receipt. Another child notices that it carries a household name and wants to display it as a joke. The ferryman asks what the paper should become.',[
    ['Keep the private name out of the game','Gain devotion and persuasion. Respecting privacy becomes a remembered choice.',{skills:['devotion','persuasion'],fact:'protectedReceiptName'},'protect a private name from a joke'],
    ['Ask how receipts and tides are read','Gain scholarship and survival through the ferryman’s patient lesson.',{skills:['scholarship','survival']},'learn how a journey is recorded'],
    ['Make a new boat from clean scrap paper','Gain stealth and defense through careful observation and a useful replacement.',{skills:['stealth','defense']},'replace a careless joke with a useful craft'],
  ]),
  ordinary('The apprentice’s first bent nail', 'An apprentice bends a nail during a public demonstration. Older children laugh, while the craftsperson asks whether an error should be hidden or used as part of the lesson. You can take a small practical role.',[
    ['Stay beside the apprentice and ask to try together','Gain persuasion and defense. Shared practice makes failure less isolating.',{skills:['persuasion','defense'],social:'fellow',bond:6},'make room for an apprentice’s first mistake'],
    ['Compare the damaged nail with a sound one','Gain scholarship and weapons through supervised inspection.',{skills:['scholarship','weapons'],fact:'firstMakerLesson'},'study what the failed work can teach'],
    ['Help straighten scrap for a second attempt','Gain weapons and survival. A useful repair matters more than a perfect performance.',{skills:['weapons','survival']},'help make a second attempt possible'],
  ]),
  ordinary('A lesson painted on a wall', 'A traveling reader paints letters on a public wall for children who cannot attend regular school. A shopkeeper wants the wall cleared before market day. Your peer asks whether the lesson can survive somewhere else.',[
    ['Ask the shopkeeper to share the space for one day','Gain persuasion and scholarship. Your peer remembers that you asked rather than took.',{skills:['persuasion','scholarship'],social:'fellow',bond:5},'negotiate space for a public lesson'],
    ['Copy the letters onto boards that can be carried','Gain scholarship and arcana. The lesson can move between households.',{skills:['scholarship','arcana'],fact:'portableWallLesson'},'make a lesson portable'],
    ['Build a stand from discarded wood with adult help','Gain survival and defense. Learning can be protected through practical craft.',{skills:['survival','defense']},'build a place for shared learning'],
  ]),
  ordinary('The cloak claimed by two children', 'A donated cloak is promised to two children by different helpers. Neither child made the mistake, and both need warmth. Your caregiver offers to help carry out a fair plan.',[
    ['Hear both children and find another warm covering','Gain persuasion and devotion. Care begins with the people affected.',{skills:['persuasion','devotion'],villagers:2},'listen before settling the shared cloak'],
    ['Check the donation marks and the helpers’ notes','Gain scholarship and stealth. An honest record can reveal an ordinary error.',{skills:['scholarship','stealth']},'trace an ordinary error through its records'],
    ['Help mend a second coat from usable cloth','Gain survival and defense. Repair creates another option instead of assigning blame.',{skills:['survival','defense'],fact:'firstSharedMending'},'help mend another warm coat'],
  ]),
  ordinary('Footprints around the garden', 'Fresh footprints circle a household garden, and a neighbor blames the first unfamiliar traveler. A child admits they may have wandered there after dusk but is frightened to speak publicly.',[
    ['Give the child a quiet chance to explain','Gain persuasion and devotion. A fair hearing becomes a remembered habit.',{skills:['persuasion','devotion'],social:'fellow',bond:5},'make room for a frightened account'],
    ['Compare the prints without naming a suspect','Gain survival and scholarship. Observation comes before accusation.',{skills:['survival','scholarship'],fact:'gardenPrintsExamined'},'inspect the evidence before repeating blame'],
    ['Help repair the trampled edge with permission','Gain defense and survival. Repair does not require a public confession.',{skills:['defense','survival']},'repair damage without demanding a spectacle'],
  ]),
  ordinary('A candle for an absent friend', 'A neighbor sets a festival candle for someone who has not returned. Other children insist that the candle must mean the person died. The keeper says absence and certainty are different things.',[
    ['Ask the neighbor what remembrance they want','Gain devotion and persuasion. Respect their account without inventing an ending.',{skills:['devotion','persuasion'],happiness:2},'let a neighbor choose their remembrance'],
    ['Learn how the keeper records missing people','Gain scholarship and arcana. Keep the difference between a record and a rumor.',{skills:['scholarship','arcana'],fact:'absenceIsNotProof'},'learn what an unanswered record can mean'],
    ['Carry the candle safely through the wind','Gain defense and survival. A careful practical task supports someone’s chosen ritual.',{skills:['defense','survival']},'protect a chosen remembrance from the wind'],
  ]),
  ordinary('The map with a path missing', 'A worn local map omits the path used by a small keeper household. A guide says maps often preserve the names of patrons more carefully than the routes of ordinary neighbors.',[
    ['Ask the household what may be marked publicly','Gain persuasion and devotion. Their private refuge stays private.',{skills:['persuasion','devotion']},'ask permission before placing a household on a map'],
    ['Copy the public path and compare two older maps','Gain scholarship and survival. Keep the disagreement beside the correction.',{skills:['scholarship','survival'],fact:'missingPathRecorded'},'record a missing public path'],
    ['Walk the safe section with a guide and mark hazards','Gain stealth and survival. Exploration begins with a route home.',{skills:['stealth','survival']},'check the safe way home before wandering'],
  ]),
  ordinary('The herb that looks almost right', 'A remedy gatherer shows two plants with similar leaves. A hurried visitor wants the children to collect whichever grows closer. The gatherer explains why speed cannot replace a careful identification.',[
    ['Ask the visitor to wait for a safe check','Gain persuasion and devotion. A patient refusal protects someone’s health.',{skills:['persuasion','devotion']},'choose a safe check over a hurried demand'],
    ['Draw both leaves beside the gatherer’s notes','Gain scholarship and survival. Find one correctly identified herb bundle.',{skills:['scholarship','survival'],herbs:1,fact:'herbDifferenceLearned'},'learn the difference between similar remedies'],
    ['Mark the verified patch and gather with supervision','Gain survival and defense. Useful work includes knowing when to stop.',{skills:['survival','defense'],herbs:1},'gather only from a verified patch'],
  ]),
  ordinary('A name beneath a maker’s mark', 'A repaired bowl carries a famous workshop seal over a smaller scratched name. The potter explains that apprentices often did the patient work patrons never saw. Your rival has already noticed the second mark.',[
    ['Invite your rival to explain what they found','Gain persuasion and scholarship. Your rival remembers fair credit.',{skills:['persuasion','scholarship'],social:'rival',bond:8},'give your rival credit for an observation'],
    ['Ask the potter to teach you how marks are read','Gain scholarship and stealth. Keep a small fact about work and recognition.',{skills:['scholarship','stealth'],fact:'secondMakerMark'},'read the name beneath a public seal'],
    ['Help make a new label naming both makers','Gain devotion and defense. A public repair can carry an honest account.',{skills:['devotion','defense']},'restore both makers’ names'],
  ]),
  ordinary('The watch-keeper’s tired horse', 'A watch-keeper arrives with a horse too tired for another message run. The official asks for speed, while a stable worker suggests a fresh animal and a short delay. You can help without becoming a soldier.',[
    ['Ask the watch-keeper to hear the stable worker','Gain persuasion and devotion. Duty includes listening to the people who do the work.',{skills:['persuasion','devotion']},'hear the worker behind an urgent order'],
    ['Check the route and prepare a clearer message','Gain scholarship and defense. Better information can save needless travel.',{skills:['scholarship','defense'],fact:'firstWatchMessage'},'make an urgent message clearer'],
    ['Bring water and help prepare the fresh horse','Gain survival and weapons through supervised stable work.',{skills:['survival','weapons']},'prepare useful help before a difficult road'],
  ]),
  ordinary('A story with your household left out', 'A festival storyteller praises the families who kept the settlement warm through an old winter. Your caregiver’s household is absent from the account. The storyteller welcomes corrections but asks for a source.',[
    ['Ask your caregiver which memory they want shared','Gain persuasion and a named household bond. Privacy remains their choice.',{skills:['persuasion'],social:'kin',bond:8},'ask before sharing your household’s memory'],
    ['Find a witnessed note and compare the accounts','Gain scholarship and devotion. Evidence adds a name without erasing another household.',{skills:['scholarship','devotion'],fact:'householdWinterAccount'},'preserve a household name with a source'],
    ['Help tell the story through a useful household craft','Gain survival and defense. A made thing can carry a quiet remembrance.',{skills:['survival','defense']},'carry a household memory through useful work'],
  ]),
  ordinary('The animal caught in the old snare', 'A small animal is trapped in a neglected snare beside a public path. A guide explains that freeing it safely matters more than proving you are brave. Kest wants to help but has not handled a spring trap before.',[
    ['Give Kest a safe role and call the guide closer','Gain persuasion and defense. Kest remembers being included without pressure.',{skills:['persuasion','defense'],companion:'kest',bond:5},'make a safe role for Kest'],
    ['Study the mechanism before anyone touches it','Gain scholarship and stealth. A trapped mechanism is not a test of worth.',{skills:['scholarship','stealth']},'inspect a danger before reaching into it'],
    ['Mark the path and help the guide release the animal','Gain survival and defense. Keep a memory of a hazard removed from the common way.',{skills:['survival','defense'],fact:'oldSnareRemoved'},'make a common path safer'],
  ]),
  ordinary('A question the old prayer leaves open', 'A shrine verse promises shelter to every willing guest, but a later note narrows the welcome to registered households. The keeper admits the texts disagree and asks how a learner should approach them.',[
    ['Ask who the narrower rule excluded','Gain devotion and persuasion. Belief can include a careful question.',{skills:['devotion','persuasion'],fact:'shrineWelcomeQuestion'},'ask who a promise was meant to protect'],
    ['Copy both versions with their dates and witnesses','Gain scholarship and arcana. Keep the disagreement visible.',{skills:['scholarship','arcana']},'preserve both versions of a disputed promise'],
    ['Help prepare a meal for a guest who needs one now','Gain survival and devotion. A present need can be met while the old debate remains open.',{skills:['survival','devotion'],villagers:2},'offer practical care while a rule is questioned'],
  ]),
  ordinary('A game of guards and gates', 'Children turn an abandoned cart into a pretend fortress. One child declares that only noble names may enter. Mira asks whether the game can be changed before anyone is left outside.',[
    ['Ask everyone to agree on fair rules','Gain persuasion and defense. Mira remembers you made room in the game.',{skills:['persuasion','defense'],companion:'mira',bond:5},'make fair rules for a shared game'],
    ['Invent a puzzle gate that anyone can learn to open','Gain scholarship and arcana. A clever rule can create participation.',{skills:['scholarship','arcana']},'make an open puzzle instead of an inherited privilege'],
    ['Build another entrance and invite a new team','Gain survival and stealth. An alternative route changes the possibilities.',{skills:['survival','stealth']},'find another entrance to a closed game'],
  ]),
  ordinary('The ink spilled before a letter', 'Your caregiver is preparing a letter to someone far away when the household’s last ink is spilled. A reader offers a shared bottle, but asks that the private letter stay folded while others work nearby.',[
    ['Help your caregiver keep the letter private','Gain persuasion and a household bond. Their story remains theirs to share.',{skills:['persuasion'],social:'kin',bond:7},'protect a household letter’s privacy'],
    ['Learn to mix a small replacement with the reader','Gain scholarship and survival through supervised craft.',{skills:['scholarship','survival'],fact:'firstInkMixture'},'learn a useful way to replace what was lost'],
    ['Carry a request for supplies to a trusted neighbor','Gain survival and devotion. Asking honestly becomes part of practical courage.',{skills:['survival','devotion']},'ask a trusted neighbor for useful help'],
  ]),
  ordinary('The child who chose another name', 'A child asks the lesson group to use a new name. Another pupil insists that the household register cannot change. The teacher says a book can preserve an old record without deciding how a person must be addressed.',[
    ['Use the name they asked for and make room beside you','Gain persuasion and devotion. Your peer remembers the welcome.',{skills:['persuasion','devotion'],social:'fellow',bond:8},'respect a peer’s chosen name'],
    ['Ask how public records can preserve corrections','Gain scholarship and arcana. A record can change without pretending its history vanished.',{skills:['scholarship','arcana'],fact:'chosenNameLesson'},'learn how a record can carry a correction'],
    ['Make a new name token with the child’s permission','Gain survival and defense through a small useful craft.',{skills:['survival','defense']},'make a token for a name freely chosen'],
  ]),
);

function caregiver(s) {return s.life.people.find(p=>p.id==='kin'&&p.alive!==false) || s.life.people.find(p=>p.alive!==false&&['parent','guardian'].includes(p.familyRole)) || s.life.people.find(p=>p.id===s.life.partnerId&&p.alive!==false) || s.life.people.find(p=>p.alive!==false&&p.role==='relative') || s.life.people.find(p=>p.alive!==false) || s.life.people.find(p=>p.id==='kin');}
function contentVersion(s) { return s.timeline?.contentVersion || 4; }
function scheduledIndex(s,prefix,entries,slot) {
  const salt=`${prefix}-generation-${s.dynasty?.generation ?? 1}-born-${s.timeline?.birthDay || 0}`;
  const order=entries.map((_,i)=>i).sort((a,b)=>seededRoll(s.seed,`${salt}-${a}`,1000000)-seededRoll(s.seed,`${salt}-${b}`,1000000)||a-b);
  return order[((slot%order.length)+order.length)%order.length];
}
function childScene(s) {
  const inherited=contentVersion(s)>=6 && s.campaign?.facts?.inheritedResolution===true;
  const ages=inherited ? new Set([...SCENARIO_AGES,10,15]) : SCENARIO_AGES;
  if (!ages.has(s.age)) return null;
  const index = contentVersion(s)<6 ? seededRoll(s.seed, `childhood-situation-${s.age}`, 4) : scheduledIndex(s,'childhood-situations',CHILD_SCENES,[...ages].sort((a,b)=>a-b).indexOf(s.age));
  const scene = CHILD_SCENES[index];
  const householdCarer = caregiver(s);
  const context = s.age < 6
    ? `${s.revision >= 4 && s.family?.setup !== 'legacy' ? householdCarer.name : 'Your guardian'} stays nearby and helps you carry out the choice.`
    : s.age < 10
      ? s.revision >= 4 && !s.education?.enrolled ? 'A local reader helps you explore the lesson outside formal enrollment.' : 'This becomes a lesson your teacher returns to through the school year.'
      : 'Your learned skills can shape the practical part you take in this situation.';
  const geography=contentVersion(s)>=6 ? ` In ${s.world.locations.find(l=>l.id===(inherited ? s.locationId : s.hero.birthplace ? s.hero.birthplace==='village'?'home':s.hero.birthplace : s.hero.origin==='city'?'city':'home'))?.name || s.world.locations.find(l=>l.id===s.locationId)?.name || s.world.name}, ${worldCalendarContext(s.world,s.day,s.seed).weather} marks the season of ${worldCalendarContext(s.world,s.day,s.seed).season}.` : '';
  return { ...scene, body: `${scene.body} ${context}${geography}`, scenarioId: `child-${index}` };
}
function adultScenes(s) {
  const careerSkill = professionSkill(s.hero.profession) || { Blacksmith:'weapons', Carpenter:'survival', Tailor:'defense', Farmer:'survival', Miner:'survival', Cook:'survival', Alchemist:'arcana', Scribe:'scholarship', Bard:'persuasion', Guide:'survival', Fisher:'survival', Healer: 'devotion', Scholar: 'scholarship', Merchant: 'persuasion', Herbalist: 'survival', Soldier: 'weapons' }[s.hero.profession] || 'persuasion';
  const kin = caregiver(s);
  const friend = s.life.people.find(p => p.id === 'fellow' && p.alive!==false) || s.life.people.find(p=>p.alive!==false&&p.role!=='relative') || kin;
  const rows = [
    ordinary('Someone asks to learn your work', `A younger neighbor has watched your ${s.hero.profession === 'Unemployed' ? 'day labor and community work' : s.hero.profession.toLowerCase() + ' practice'}. They ask for teaching, while your own household could use another paid commission. Both uses of your time have a cost.`, [
      ['Teach them and share credit for the work', 'Gain a professional skill, six career experience, and local trust. Earn 12 gold from the shared commission.', { skills: [careerSkill], career: 6, gold: 12, villagers: 3 }],
      ['Take the commission and keep a written lesson for later', 'Earn 28 gold and gain scholarship. The longer work raises stress by 8.', { skills: ['scholarship'], gold: 28, stress: 8 }],
      ['Rest, and introduce them to another willing teacher', 'Reduce stress by 12 and gain persuasion. Declining honestly leaves the relationship open.', { skills: ['persuasion'], stress: -12, happiness: 4 }],
    ]),
    ordinary('A name missing from the reading room', 'An old book reaches the community reading room with a former owner’s name cut away. A patron offers to buy it, while a teacher asks you to help recover its history. Scholarship and ordinary work compete for the same attention.', [
      ['Return the history to the public reading room', 'Gain scholarship, academy trust, and a memory of accessible learning.', { skills: ['scholarship'], academy: 4, fact: 'publicReadingRoom' }],
      ['Study the unfamiliar magical notes carefully', 'Gain arcana and scholarship. The research remains private until you choose to share it.', { skills: ['arcana', 'scholarship'], fact: 'privateAnnualResearch' }],
      ['Sell a lawful copy and preserve the original', 'Earn 18 gold, gain persuasion, and keep the owner’s name with the book.', { skills: ['persuasion'], gold: 18 }],
    ]),
    ordinary('The evening your friend had been waiting for', `${friend.name} asks to tell you about a difficult year of their own. ${kin.name} also hopes to see you. Neither knows your private discoveries simply because you have grown older. You decide whose ordinary life gets your attention.`, [
      [`Make time for ${friend.name}`, 'Gain 10 friendship bond and persuasion. Your friend remembers being heard, without learning a hidden condition.', { skills: ['persuasion'], social: 'fellow', bond: 10, happiness: 4 }],
      ['Bring family and friend together for an ordinary meal', 'Spend 10 gold if available; otherwise share time and a simple meal. Both remember the invitation.', { social: 'kin', bond: 8, alsoSocial: 'fellow', cost: 10, stress: -6 }],
      ['Explain your limits and arrange another meeting', 'Gain Willpower, preserve the friendship, and reduce stress by 8.', { attribute: 'willpower', social: 'fellow', bond: 3, stress: -8 }],
    ]),
    ordinary('Your rival’s name beside yours', 'Your former rival completes a useful community survey with you. A patron offers to publish it under your name alone. The choice affects an actual person who may later be willing to help your research.', [
      ['Insist that the survey carry both names', 'Gain 12 rival bond and academy trust. They remember fair credit.', { social: 'rival', bond: 12, academy: 4, fact: 'annualSharedCredit' }],
      ['Release the survey for anyone to use', 'Gain scholarship and village trust. Both names remain in the record.', { skills: ['scholarship'], villagers: 4, social: 'rival', bond: 6 }],
      ['Accept the patron’s terms', 'Earn 25 gold but lose 15 rival bond. The rival remembers the missing credit.', { gold: 25, social: 'rival', bond: -15, stress: 5 }],
    ]),
  ];
  if (s.hero.condition?.type === 'vampire') rows.push(ordinary('A household routine after dusk', 'An acquaintance invites you to a midday meal. Hunger and daylight make an ordinary invitation complicated. Your condition is still known only to people you have told or who witnessed it.', [
    ['Suggest an evening meal and arrange animal blood', 'Reduce hunger by 40 without disclosure or official evidence. A humane routine eases stress.', { hunger: -40, stress: -5 }],
    [`Explain the hunger privately to ${kin.name}`, 'Only your guardian learns your condition. Gain 8 bond and a remembered offer of household refuge.', { disclose: 'kin', social: 'kin', bond: 8, fact: 'annualConditionConfidant' }],
    ['Keep your condition private and decline honestly', 'Preserve secrecy. Gain persuasion, but your visible hunger still needs attention.', { skills: ['persuasion'], stress: 3 }],
  ]));
  if (s.hero.condition?.type === 'lycanthrope') rows.push(ordinary('A refuge that becomes a routine', 'The lunar calendar has become part of your life. A safe room, deliberate restraint, and the help of one trusted person offer different ways to prepare without revealing your condition to everyone.', [
    ['Repair the refuge before the next full moon', 'Prepare the next full moon and gain 8 control. No outsider learns your condition.', { refuge: true, control: 8 }],
    ['Practice restraint through ordinary work', 'Gain 15 control and one survival skill. Your condition stays private.', { control: 15, skills: ['survival'] }],
    [`Ask ${kin.name} to help you prepare`, 'Only your guardian learns lycanthropy. Gain 10 bond and 5 control; no official report appears.', { disclose: 'kin', social: 'kin', bond: 10, control: 5 }],
  ]));
  if (s.hero.specialization === 'paladin') rows.push(ordinary('A duty written in plain words', `Your oath remains visible: ${s.flags.oath || 'Protect the vulnerable and respect the willing.'} An order representative asks for service, while a vulnerable household asks whether the institution will hear their account.`, [
    ['Protect the household and give an honest account', 'Complete outstanding order service, restore an oath through service if needed, and gain devotion.', { service: true, skills: ['devotion'], villagers: 4 }],
    ['Ask the order to hear the household directly', 'Gain persuasion and order trust. The people involved retain their own voices.', { skills: ['persuasion'], order: 4 }],
    ['Keep the ordinary work you have already promised', 'Gain a professional skill and earn 18 gold. Your outstanding order deadline still has its stated consequence.', { skills: [careerSkill], gold: 18 }],
  ]));
  if (s.world.locations.some(p => ['destroyed', 'evacuated'].includes(p.status))) rows.push(ordinary('Tools beside an empty hearth', 'Survivors are building ordinary lives beside the places the covenant damaged. A carpenter needs help, and your own household also has claims on your time. Reconstruction cannot undo the remembered loss.', [
    ['Volunteer with the people rebuilding', 'Gain defense, four career experience, and village trust. The damaged places remain visibly changed.', { skills: ['defense'], career: 4, villagers: 5, fact: 'annualReconstruction' }],
    ['Share materials and let the carpenter choose the work', 'Contribute 15 gold if available, or time if not. Gain persuasion and local trust.', { skills: ['persuasion'], cost: 15, villagers: 6 }],
    ['Make a stable home in the surviving community', 'Gain survival and reduce stress by 10. Your family remembers the practical support.', { skills: ['survival'], social: 'kin', bond: 6, stress: -10 }],
  ]));
  if(contentVersion(s)>=6) rows.push(
    ordinary('A commission with an unnamed buyer',`Someone offers a generous commission for your ${s.hero.profession==='Unemployed'?'practical skills':s.hero.profession.toLowerCase()+' work'}, but refuses to name who will use the result. Another household offers less coin for work whose purpose is plain.`,[
      ['Take the honest household’s commission','Earn 22 gold, gain a professional skill and six career experience. Local trust rises by 3.',{skills:[careerSkill],gold:22,career:6,villagers:3},'choose useful work with an honest purpose'],
      ['Ask for written terms before deciding','Gain scholarship and persuasion. A careful question keeps the choice open.',{skills:['scholarship','persuasion'],fact:'commissionTermsRequested'},'ask what a commission will be used for'],
      ['Decline both and preserve time for your own craft','Gain a professional skill and four career experience. Reduce stress by 8.',{skills:[careerSkill],career:4,stress:-8},'keep time for the craft you chose'],
    ]),
    ordinary('The useful work that will not make you famous','A public repair needs patient hands and offers a modest fee. A patron invites you to a prestigious evening where your name may travel farther. Neither opportunity erases the value of the other.',[
      ['Finish the repair and name everyone who helped','Earn 20 gold, gain a professional skill, eight career experience, and village trust.',{skills:[careerSkill],gold:20,career:8,villagers:4},'finish useful work and share its credit'],
      ['Attend the gathering and make an honest introduction','Gain persuasion, four career experience, and academy trust.',{skills:['persuasion'],career:4,academy:3},'make an honest introduction beyond your neighborhood'],
      ['Arrange a shared repair and keep the evening free','Gain defense and persuasion. Reduce stress by 10 and happiness rises by 4.',{skills:['defense','persuasion'],stress:-10,happiness:4},'share a repair without filling every evening'],
    ]),
    ordinary('A tool inherited with a disagreement','An older neighbor leaves a useful tool to the community workshop. Their relatives disagree over whether the gift was witnessed. The keeper asks for help preserving both the tool and the people’s accounts.',[
      ['Hear the relatives before arranging its shared use','Gain persuasion and devotion. Village trust rises by 4.',{skills:['persuasion','devotion'],villagers:4},'hear a household’s account before using its inheritance'],
      ['Find the witness marks and compare the copies','Gain scholarship and a professional skill. Keep a remembered inheritance question.',{skills:['scholarship',careerSkill],fact:'toolInheritanceWitnessed'},'check the record behind an inherited tool'],
      ['Offer your own labor while ownership is settled','Earn 16 gold and six career experience. No one is forced to settle a private grief today.',{gold:16,career:6,stress:3},'offer useful work while an inheritance is discussed'],
    ]),
    ordinary('Your friend’s life beside your own',`${friend.name} has plans that do not follow your calling. They ask for help with an ordinary household move, while you have questions about your own future. A friend can share a life without sharing every ambition.`,[
      [`Help ${friend.name} with the move`,'Gain ten friendship bond and defense. Happiness rises by 5.',{skills:['defense'],social:'fellow',bond:10,happiness:5},'support a friend’s different future'],
      ['Exchange honest plans while packing together','Gain persuasion and scholarship. Your friend remembers being heard.',{skills:['persuasion','scholarship'],social:'fellow',bond:6},'listen to a future different from your own'],
      ['Explain your limits and offer a smaller useful task','Gain Willpower, reduce stress by 8, and preserve a named friendship.',{attribute:'willpower',social:'fellow',bond:4,stress:-8},'offer help within honest limits'],
    ]),
    ordinary('The lesson you can afford to give',`A learner cannot pay your usual fee for ${s.hero.profession==='Unemployed'?'practical instruction':s.hero.profession.toLowerCase()+' instruction'}. They offer useful work in exchange, while a patron would pay to reserve all your teaching time.`,[
      ['Agree on a fair exchange the learner can refuse','Gain a professional skill, ten career experience, and village trust.',{skills:[careerSkill],career:10,villagers:4},'teach through an exchange freely agreed'],
      ['Share a public written lesson and take a paid commission','Earn 24 gold and gain scholarship. Add four career experience.',{skills:['scholarship'],gold:24,career:4},'keep useful knowledge public while earning a living'],
      ['Reserve time for your own unfinished education','Gain scholarship and arcana. Reduce stress by 4.',{skills:['scholarship','arcana'],stress:-4},'continue learning before promising another lesson'],
    ]),
    ordinary('A warning before the long road','A guide reports damaged supports on a trade road. A merchant asks you to dismiss the warning because delays will hurt their business. You have time to choose whose account to hear before anyone sets out.',[
      ['Help the guide record the hazard publicly','Gain survival and persuasion. Village trust rises by 4.',{skills:['survival','persuasion'],villagers:4,fact:'annualRoadWarning'},'preserve a guide’s warning before travel'],
      ['Inspect the local repair records','Gain scholarship and defense. A claim can be checked without inventing proof.',{skills:['scholarship','defense']},'check the record behind a dangerous road'],
      ['Prepare supplies and take a safer commission','Earn 18 gold, gain survival and four career experience.',{skills:['survival'],gold:18,career:4},'prepare for a safer road instead of a hurried promise'],
    ]),
    ordinary('A household asks for quiet company','A neighbor recovering from a difficult season asks for quiet company rather than advice. A healer can offer support, but no one claims that one kind conversation can cure an illness.',[
      ['Spend time listening without demanding a confession','Gain persuasion and devotion. Happiness rises by 3 and stress falls by 5.',{skills:['persuasion','devotion'],happiness:3,stress:-5},'offer company without demanding a private story'],
      ['Help arrange the support they choose','Gain scholarship and village trust. Their decision remains their own.',{skills:['scholarship'],villagers:4},'help a neighbor choose useful support'],
      ['Offer a practical errand and keep clear limits','Gain survival, four career experience, and reduce stress by 4.',{skills:['survival'],career:4,stress:-4},'offer practical support within honest limits'],
    ]),
    ordinary('The festival work nobody planned','The public gathering has songs and speeches but no one to repair the benches or prepare safe lantern hooks. The keeper asks whether the makers’ work should be paid before patrons decorate another banner.',[
      ['Take a paid repair and put every helper in the account','Earn 26 gold, gain a professional skill and eight career experience.',{skills:[careerSkill],gold:26,career:8,villagers:3},'put the makers’ work into the public account'],
      ['Ask patrons to fund safety before decoration','Gain persuasion and defense. Village trust rises by 4.',{skills:['persuasion','defense'],villagers:4},'ask a gathering to pay for the work that keeps it safe'],
      ['Teach volunteers a small repair and rest afterward','Gain scholarship and a professional skill. Reduce stress by 6.',{skills:['scholarship',careerSkill],stress:-6},'share a useful repair without accepting every task'],
    ]),
    ordinary('Your rival returns with a different account','Your former rival has found a correction to an account you once trusted. They could embarrass you publicly, but bring the source to you first. The disagreement need not decide the whole relationship.',[
      ['Thank them and publish the correction together','Gain scholarship, ten rival bond, and academy trust.',{skills:['scholarship'],social:'rival',bond:10,academy:3},'share credit for a correction'],
      ['Compare the sources before either account is repeated','Gain scholarship and arcana. Keep a careful remembered revision.',{skills:['scholarship','arcana'],social:'rival',bond:5,fact:'annualAccountCorrected'},'compare evidence before defending an old claim'],
      ['Acknowledge the uncertainty and keep your practical work','Earn 18 gold and four career experience. Rival bond rises by 3.',{gold:18,career:4,social:'rival',bond:3},'admit uncertainty while continuing useful work'],
    ]),
    ordinary('A room for the next household','A newly arrived household needs a safe room while finding regular work. Your neighbors disagree over rent, repairs, and whether a welcome creates a lasting obligation.',[
      ['Help agree on a clear temporary welcome','Gain persuasion and devotion. Village trust rises by 5.',{skills:['persuasion','devotion'],villagers:5},'offer refuge with clear and humane terms'],
      ['Inspect the repairs and prepare a public estimate','Gain scholarship and a professional skill. Earn 16 gold for useful work.',{skills:['scholarship',careerSkill],gold:16,career:4},'make the practical cost of a welcome visible'],
      ['Contribute what you can and keep your household secure','Spend 8 gold if available; otherwise contribute time. Reduce stress by 4.',{cost:8,stress:-4,social:'kin',bond:5},'support another household within your own limits'],
    ]),
    ordinary('The craft you still want to learn','A visiting maker offers a lesson in a discipline outside your usual work. Taking it will not change your identity unless you choose a new calling; an ordinary life can hold more than one interest.',[
      ['Learn enough to collaborate with another maker','Gain scholarship and a professional skill. Add six career experience.',{skills:['scholarship',careerSkill],career:6},'learn another maker’s method without abandoning your own'],
      ['Ask about the history behind the technique','Gain scholarship and arcana. Keep a question for future research.',{skills:['scholarship','arcana'],fact:'annualSecondCraft'},'learn the history carried by another craft'],
      ['Share your own method and keep a quieter schedule','Gain persuasion, four career experience, and reduce stress by 8.',{skills:['persuasion'],career:4,stress:-8},'exchange a method within a sustainable routine'],
    ]),
    ordinary('A letter addressed to the person you were',`${kin.name} finds an old letter describing the future someone once expected of you. Your present life may have followed a different route. Neither a quiet profession nor an unfinished question makes the years meaningless.`,[
      ['Tell your family what your present life means to you','Gain eight household bond, persuasion, and happiness.',{skills:['persuasion'],social:'kin',bond:8,happiness:6},'name the life you chose for yourself'],
      ['Keep the letter beside an honest account of these years','Gain scholarship and Willpower. Reduce stress by 6.',{skills:['scholarship'],attribute:'willpower',stress:-6},'preserve an old expectation without surrendering to it'],
      ['Mark the day with the useful work you enjoy','Gain a professional skill, eight career experience, and 18 gold.',{skills:[careerSkill],career:8,gold:18},'honor your chosen life through its ordinary work'],
    ]),
  );
  if(contentVersion(s)>=6) {
    for(const scene of rows) for(const c of scene.choices) {if(c.effect.social==='kin')c.effect.social=kin.id;if(c.effect.alsoSocial==='kin')c.effect.alsoSocial=kin.id;if(c.effect.social==='fellow')c.effect.social=friend.id;if(c.effect.alsoSocial==='fellow')c.effect.alsoSocial=friend.id;}
    const unavailable=[];
    if(s.life.people.find(p=>p.id==='rival')?.alive===false)unavailable.push('Your rival’s name beside yours','Your rival returns with a different account');
    if(kin.alive===false) unavailable.push('The evening your friend had been waiting for','A household routine after dusk','A refuge that becomes a routine','Tools beside an empty hearth','A letter addressed to the person you were');
    return rows.filter(scene=>!unavailable.includes(scene.title));
  }
  return rows;
}
function adultScene(s) {
  if (s.timeline.roleplayVersion === 1 && s.age % 3 === 0) {
    const family = familyAnnualScene(s);
    if (family) {
      const scene = { ...family, scenarioId: `family-${family.kind}-${family.personId}` };
      return contentVersion(s) >= 7 ? adultYearNarrative(s, scene) : scene;
    }
  }
  const scenes = adultScenes(s);
  const index = contentVersion(s)<6 ? seededRoll(s.seed, `adult-year-situation-${s.age}`, scenes.length) : scheduledIndex(s,'adult-situations',scenes,s.age-19);
  const scene = { ...scenes[index], scenarioId: `adult-${index}` };
  return contentVersion(s) >= 7 ? adultYearNarrative(s, scene) : scene;
}
function rememberedEffect(s, ctx, sceneChoice) {
  const e = sceneChoice.effect || {};
  if (e.familyRoleplay) { applyFamilyAnnualChoice(s, e.familyRoleplay, ctx); return; }
  for (const key of e.skills || []) s.hero.skills[key]++;
  if (e.attribute) s.hero.attributes[e.attribute]++;
  if (e.gold) s.hero.gold += e.gold;
  if (e.cost && s.hero.gold >= e.cost) s.hero.gold -= e.cost;
  if (e.herbs) s.flags.herbs = (s.flags.herbs || 0) + e.herbs;
  if (e.career) {s.life.career.experience += e.career;addCareerExperience(s,e.career);}
  for (const key of ['stress', 'happiness']) if (e[key]) s.life[key] = clamp(s.life[key] + e[key], 0, 100);
  for (const [field, amount] of [['villagers', e.villagers], ['academy', e.academy], ['order', e.order]]) if (amount) ctx.standing(field, amount);
  if (e.companion) ctx.remember(e.companion, `At age ${s.age}, you chose to ${sceneChoice.memory}.`, e.bond || 0);
  for (const id of [e.social, e.alsoSocial].filter(Boolean)) {
    const p = id==='kin' && contentVersion(s)>=6 ? caregiver(s) : s.life.people.find(p => p.id === id);
    if(!p || p.alive===false) continue;
    p.bond = clamp(p.bond + (e.bond || 5), 0, 100);
    p.memories.push(`At age ${s.age}, you chose to ${sceneChoice.memory}.`); p.memories = p.memories.slice(-30);
  }
  if (e.fact) s.timeline.childhoodFacts[`year_${s.age}_detail`] = e.fact;
  if (e.hunger && s.hero.condition?.type === 'vampire') s.hero.condition.hunger = clamp(s.hero.condition.hunger + e.hunger, 0, 100);
  if (e.control && s.hero.condition?.type === 'lycanthrope') s.hero.condition.control = clamp(s.hero.condition.control + e.control, 0, 100);
  if (e.refuge && s.hero.condition?.type === 'lycanthrope') s.hero.condition.preparedUntil = Math.max(14, 14 + 28 * Math.ceil((s.day + 1 - 14) / 28));
  if (e.disclose && s.hero.condition) {
    const p = s.life.people.find(p => p.id === e.disclose);
    if (!p.knownFacts.includes(s.hero.condition.type)) p.knownFacts.push(s.hero.condition.type);
    if (e.disclose === 'kin') { s.flags.conditionDisclosed = true; s.flags.familyRefuge = true; }
  }
  if (e.service) { s.flags.oathBroken = false; ctx.finishObligation('order_service'); ctx.finishObligation('oath_service'); ctx.standing('order', 8); }
}

export function initializeTimeline(state, { migration = false } = {}) {
  if (state.timeline) return;
  state.timeline = { mode: migration ? 'legacy' : 'birth', ...(migration ? {} : {birthDay:0,contentVersion:7,roleplayVersion:1}), yearTarget: null, yearStartDay: state.day,
    yearHistory: [], activityUses: {}, childhoodFacts: {}, journey: null, lastJourney: null };
}
export function getLifeStage(state) {
  const age = typeof state === 'number' ? state : state?.age || 0;
  return age < 3 ? 'Infancy' : age < 10 ? 'Childhood' : age < 18 ? 'Adolescence' : 'Adulthood';
}
export function getAgeUnlocks(state) {
  return [
    ['family', 'Family and familiar voices', 0, 'Your guardians shape your early circumstances.'],
    ['play', 'Play and childhood friends', 3, 'Explore, make friends, and begin learning through play.'],
    ['school', 'School and reading', 6, 'Learn scholarship, languages, and the first ideas of magic.'],
    ['practice', 'Deliberate skill practice', 10, 'Practice martial, magical, devotional, or wilderness skills without choosing a class.'],
    ['travel', 'Regional travel', 14, 'Follow real roads between settlements and landmarks.'],
    ['work', 'Work, mentors, and expeditions', 16, 'Earn wages, recruit companions, investigate quests, and enter dungeons.'],
    ['adult', 'Earned callings and courtship', 18, 'Choose a commitment, seek a calling through its mentor, and build your own household.'],
  ].map(([id, label, minAge, description]) => ({ id, label, minAge, description, unlocked: (state?.age || 0) >= minAge }));
}
const activity = (s, id, label, description, minAge, days, skill, uses = 2) => {
  const count = s.timeline.activityUses[`${s.age}:${id}`] || 0;
  return { id, label, description, minAge, days, cost: 0, group: minAge < 6 ? 'Growing up' : minAge < 10 ? 'Education' : 'Practice',
    ...(count >= uses ? { disabledReason: `You have already made time for this ${uses === 1 ? 'once' : 'twice'} this year. Age up opens a new year.` } : {}), skill };
};
export function getAgeActivities(s) {
  if (!s?.timeline || s.timeline.mode !== 'birth' || observationalInfancy(s) || s.phase === 'retired' || s.event || s.battle || s.conversations?.pending || s.maze || s.dungeon || s.timeline.journey) return [];
  const rows = [
    activity(s, 'grow_family', s.age < 3 ? 'Make room for care' : 'Make time for family', s.age < 3 ? 'Your guardians spend time with you. Build security and a remembered household bond.' : 'Spend a quiet day with family. Gain persuasion and ease stress; family remembers the time.', 0, 1, 'persuasion'),
    {...activity(s,'grow_nursery','Share stories and counting','A willing adult nearby shares a story, counting game or picture book. Gain scholarship through two real days together. Two sessions before age six can support the learning focus; this is not formal school attendance.',3,2,'scholarship'),maxAge:5},
    activity(s, 'grow_play', s.age >= 12 ? 'Take a Walk' : 'Play Outdoors', 'Follow familiar paths, stretch your legs and practice finding your way. This is your own outing.', 3, 2, 'survival'),
    activity(s, 'grow_read', 'Read with a teacher', 'Gain scholarship and intellect. Books remain available through community teaching regardless of household wealth.', 6, 3, 'scholarship'),
    activity(s, 'grow_school', s.age >= 18 ? 'Join community lessons' : 'Attend community lessons', 'Gain arcana or persuasion through seeded school lessons. Your learned skills shape later callings.', 6, 4, 'arcana'),
    activity(s, 'grow_weapons', s.age >= 16 ? 'Practice weapon control' : 'Practice with a wooden sword', 'Gain weapons. A practical martial skill; you have not committed to a combat path.', 10, 3, 'weapons'),
    activity(s, 'grow_defense', 'Practice guarding another person', 'Practice footwork and safe defensive stances. No partner or relationship is assumed.', 10, 3, 'defense'),
    activity(s, 'grow_arcana', s.age >= 16 ? 'Practice controlled spellcraft' : 'Practice the small lights spell', 'Gain arcana through controlled magical practice.', 10, 3, 'arcana'),
    activity(s, 'grow_devotion', 'Learn the shrine’s rites', 'Gain devotion and order trust. Belief and calling remain your choices.', 10, 2, 'devotion'),
    activity(s, 'grow_stealth', 'Map the quiet ways', 'Gain stealth through observation and patient movement. No theft or evidence is implied.', 10, 3, 'stealth'),
    activity(s, 'grow_survival', 'Learn herbs and safe trails', 'Gain survival and one herb bundle. A useful skill for civilian life and future expeditions.', 10, 3, 'survival'),
  ];
  if (s.revision >= 4) {
    const school = rows.find(row => row.id === 'grow_school');
    if (!s.education?.enrolled) school.disabledReason = 'Enroll in a named community, shrine, academy, or apprenticeship route first. Independent reading remains free.';
    else { school.label = 'Review your school notes'; school.skill = { community: 'scholarship', shrine: 'devotion', academy: 'arcana', apprenticeship: 'survival' }[s.education.route] || 'scholarship'; school.description = `Review your ${s.education.route} lessons and gain ${school.skill}. Formal attendance and qualifications progress through Attend lessons in Family & school.`; }
    const family = rows.find(row => row.id === 'grow_family');
    const householdCarer = caregiver(s);
    family.label = s.age < 3 ? `Make room for care with ${householdCarer.name}` : `Make time for ${householdCarer.name}`;
    family.description = s.family?.setup === 'orphan' || s.family?.setup === 'homeless' ? 'Your actual shelter guardian shares care and practical support. This does not invent a living parent.' : 'Your caregiver remembers time spent together. Build a named relationship and ease stress.';
  }
  const nursery=rows.find(r=>r.id==='grow_nursery'),adult=s.life.people.find(p=>p.alive!==false&&p.age>=18&&p.locationId===s.locationId);
  if(!adult)nursery.disabledReason='A willing adult must be nearby for shared stories and counting.';
  else nursery.label=`Share stories and counting with ${adult.name}`;
  return rows.filter(row => (row.id!=='grow_read'||s.age<18&&s.education?.enrolled)&&s.age >= row.minAge&&(row.maxAge===undefined||s.age<=row.maxAge));
}
export function applyBirthAction(s, id, ctx) {
  const row = getAgeActivities({ ...s, event: null }).find(item => item.id === id);
  if (!row || row.disabledReason) return false;
  const key = `${s.age}:${id}`;
  s.timeline.activityUses[key] = (s.timeline.activityUses[key] || 0) + 1;
  if (s.age >= 3 && row.skill) s.hero.skills[row.skill]++;
  if (id === 'grow_read' && s.timeline.activityUses[key] === 1) s.hero.attributes.intellect++;
  if (id === 'grow_play' && s.timeline.activityUses[key] === 1) s.hero.attributes.agility++;
  if (id === 'grow_family') { s.life.stress = Math.max(0, s.life.stress - 5); caregiver(s).bond = Math.min(100, caregiver(s).bond + 5); }

  if (id === 'grow_devotion') ctx.standing('order', 2);
  if (id === 'grow_survival') s.flags.herbs = (s.flags.herbs || 0) + 1;
  s.notice = `${row.label}: ${s.age >= 3 ? `your ${row.skill} skill grew` : 'your family made time for care'}. Your identity remains yours to choose.`;
  ctx.journal(row.label, s.notice, 'childhood');
  return true;
}
function choicesFor(age) {
  if (age < 3) return [choice('care', 'Keep familiar care close', 'Your guardians build security, Presence, and a close family bond.'), choice('curiosity', 'Bring stories and music into the home', 'Your guardians nurture Intellect and your first scholarship.'), choice('courage', 'Let the village help raise you', 'Your guardians build Vitality, practical curiosity, and village connections.')];
  if (age === 7) return [choice('care', 'Speak up for Mira', 'Gain devotion and Presence. Mira remembers you defended her.'), choice('curiosity', 'Recover the charm and explain', 'Gain scholarship and Agility. Mira remembers you sought the truth.'), choice('courage', 'Ask the older children to help search', 'Gain persuasion and Willpower. You turn an accusation into cooperation.')];
  if (age === 10) return [choice('care', 'Learn to protect with the retired guard', 'Gain weapons and defense. Your skills can later open a martial calling.'), choice('curiosity', 'Study the academy visitor’s spellbook', 'Gain arcana and scholarship. Your skills can later open a magical calling.'), choice('courage', 'Learn the ranger’s hidden trails', 'Gain stealth and survival. Your skills can later open a wilderness or quiet calling.')];
  if (age === 12) return [choice('care', 'Earn a service scholarship', 'Gain arcana and scholarship. Community service pays tuition; household wealth never closes this route.'), choice('curiosity', 'Study through a practical apprenticeship', 'Gain survival and persuasion. Your family remembers your useful work.'), choice('courage', 'Study under the retired guard', 'Gain weapons and devotion. Training becomes a connection to the order, not an automatic class.')];
  if (age === 15) return [choice('care', 'Ask whether the dead gave consent', 'Gain devotion and Willpower; establish your interest in ethical magic.'), choice('curiosity', 'Ask why the research was prohibited', 'Gain arcana and scholarship. Discover an ancestral mentor route without broadcasting your research.'), choice('courage', 'Keep the page and investigate quietly', 'Gain stealth and scholarship. You keep this fact private.')];
  if (age === 18) return [choice('care', 'Build a life around people I care for', 'Gain persuasion and devotion. You can pursue civilian work, an earned calling, or the fate campaign.'), choice('curiosity', 'Follow the questions I have carried', 'Gain arcana and scholarship. Fate is a question you may embrace or defy.'), choice('courage', 'Make my own way through the world', 'Gain weapons and survival. Your first adult identity still depends on your actions.')];
  return [choice('care', 'Make time for the people involved', 'Gain persuasion or devotion and a remembered relationship. Compassion grows an actual skill.'), choice('curiosity', 'Ask a question and investigate', 'Gain scholarship or arcana. Curiosity creates knowledge you can use later.'), choice('courage', 'Try the unfamiliar path carefully', 'Gain survival or weapons and a little physical confidence. Courage is learned through action.')];
}
export function observationalBirthEvent(s,event){
  if(!observationalInfancy(s)||!event||!(event.id==='birth_arrival'||/^birth_year_[012]$/.test(event.id)))return event;
  return {...event,observationVersion:1,choices:[{id:'continue',label:'Continue watching',description:'The people raising you make their own decisions. Familiar voices, care and the passing seasons shape your early years.',owner:'observer'}]};
}
function birthChoices(s,eventId,choices){return observationalBirthEvent(s,{id:eventId,choices}).choices;}
export function birthEvent(s, ctx, arrival = false) {
  const age = s.age;
  if (contentVersion(s) >= 7 && age <= 18) {
    const story = editionScene(s,childhoodScene(s),arrival?'birth_arrival':`birth_year_${age}`);
    snapshotChildhoodScene(s, story);
    ctx.setEvent(arrival ? 'birth_arrival' : `birth_year_${age}`, story.title, `${getLifeStage(s)} · age ${age}`, story.body,
      birthChoices(s,arrival?'birth_arrival':`birth_year_${age}`,story.choices.map(({ id, label, description,intentTags }) => ({ id, label, description,...(intentTags?{intentTags}:{}),owner:age<3?'guardian':'hero' }))));
    return;
  }
  if (contentVersion(s) >= 7 && age > 18) {
    const story = editionScene(s,s.narrativeEdition===30?adultScene(s):rememberAnnualScene(s,adultScene(s)),'birth_adult_year');captureAnnualScene(s,story);
    ctx.setEvent('birth_adult_year', story.title, `${getLifeStage(s)} · age ${age}`, story.body,
      story.choices.map(({ id, label, description,intentTags }) => ({ id, label, description,...(intentTags?{intentTags}:{}),owner:age<3?'guardian':'hero' })));
    return;
  }
  const scenario = age > 18 ? adultScene(s) : childScene(s);
  const [title, body] = scenario ? [scenario.title, scenario.body] : YEARS[Math.min(age, 18)];
  const flavorSalt=contentVersion(s)>=6 ? `birth-scene-${age}-${s.timeline.birthDay || 0}-generation-${s.dynasty?.generation ?? 1}` : `birth-scene-${age}`;
  const variant = seededRoll(s.seed, flavorSalt, contentVersion(s)>=6 ? FLAVORS.length : 6);
  const detail = age > 0 && s.timeline.childhoodFacts[`year_${age - 1}`]
    ? ` Last year, your choice to ${s.timeline.childhoodFacts[`year_${age - 1}`]} was remembered.` : '';
  const options = scenario ? scenario.choices.map(({ id, label, description }) => ({ id, label, description })) : choicesFor(age);
  if(age===18 && contentVersion(s)>=6 && s.campaign?.facts?.inheritedResolution===true) {
    options[0]=choice('care','Build a life around people I care for','Gain persuasion and devotion. Choose civilian work, relationships, or an earned calling in the world your family helped shape.');
    options[1]=choice('curiosity','Choose questions of my own','Gain arcana and scholarship. Your family’s covenant history is recorded; decide what you want to learn next.');
    options[2]=choice('courage','Make my own future among these consequences','Gain weapons and survival. An earlier generation’s choices do not assign your profession or your commitments.');
  }
  if (s.revision >= 4 && s.family?.setup !== 'legacy' && age === 12) {
    options[0] = choice('care', 'Prepare a service scholarship application', 'Gain arcana and scholarship through practical preparation. Apply for actual academy support through Family & school; this choice alone does not enroll you.');
    options[1] = choice('curiosity', 'Try useful work before choosing an apprenticeship', 'Gain survival and persuasion. A named apprenticeship remains an actual enrollment decision.');
  }
  const household = ctx.householdContext?.();
  const caregiverName = household?.caregiverName || 'Your caregiver';
  if (s.revision >= 4 && s.family?.setup !== 'legacy') for (const option of options) option.description = option.description.replace(/Your guardians build/g, `${caregiverName} builds`).replace(/Your guardians nurture/g, `${caregiverName} nurtures`).replace(/Only your guardian/g, `Only ${caregiverName}`);
  const contextualBody = household && s.family?.setup !== 'legacy'
    ? body.replace(/Your guardians decide/g, `${caregiverName} decides`).replace(/Your guardians have little time, but choose/g, `${caregiverName} has little time, but chooses`).replace(/Your guardians trust/g, `${caregiverName} trusts`).replace(/Your guardians/g, caregiverName).replace(/your guardians/g, caregiverName)
    : body;
  ctx.setEvent(arrival ? 'birth_arrival' : age > 18 ? 'birth_adult_year' : `birth_year_${age}`, title, `${getLifeStage(s)} · age ${age}`,
    `${contextualBody} ${FLAVORS[variant]}${detail}${s.hero.station ? ` ${stationSummary(s)}` : s.hero.household === 'noble' ? ' Your household has connections and expectations.' : s.hero.household === 'poor' ? ' Your household has little money, but people can offer time and teaching.' : ' Your household knows the value of patient work.'}${household ? ` ${household.summary}` : ''}`, birthChoices(s,arrival?'birth_arrival':`birth_year_${age}`,options));
}
export function applyBirthChoice(s, eventId, pick, ctx) {
  if (!(eventId === 'birth_arrival' || /^birth_year_\d+$/.test(eventId) || eventId === 'birth_adult_year')) return false;
  const age = s.age;
  if(observationalInfancy(s)){
    if(pick!=='continue')return false;
    const scene=s.timeline.storybook?.pending?.scene;
    pick=PICKS[seededRoll(s.seed,`caregiver-outcome:${s.timeline.birthDay||0}:${s.dynasty?.generation||1}:${age}:${scene?.id||eventId}`,PICKS.length)];
  }else if(!PICKS.includes(pick))return false;
  if (contentVersion(s) >= 7 && age <= 18) {
    if (!s.timeline.storybook?.pending) snapshotChildhoodScene(s, childhoodScene(s));
    const lived = applyChildhoodScene(s, pick);
    if (!lived) return false;
    s.timeline.childhoodFacts[`year_${age}`] = lived.memory;
    s.timeline.childhoodFacts[`year_${age}_detail`] = lived.sceneId;
    if (age === 12) {
      s.flags.scholarship = Boolean(s.education?.scholarship);
      s.flags.apprenticeship = s.education?.route === 'apprenticeship';
    }
    // Household pocket money is separate from the incident, and never buys an
    // enrollment or a calling. The actual scene is what enters the chronicle.
    if (age >= 6) {const gift=birthdayGift(s);if(gift){s.hero.gold+=gift;receiveNotification(s,{kind:'gift',sourceId:'birthday-gift:'+s.age,title:'A Birthday Gift',body:'You received '+gift+' Gold for your birthday.'});}if(age===18)comeOfAge(s,ctx);}
    s.timeline.yearHistory.push({ id: s.timeline.birthDay ? `birthday-${s.timeline.birthDay}-${age}` : `birthday-${age}`, age, day: s.day, title: lived.title, summary: lived.outcome, choice: pick });
    s.timeline.yearTarget = null;
    s.timeline.yearStartDay = s.day;
    if ([6, 7].includes(s.timeline.nextContentVersion)) { s.timeline.contentVersion = s.timeline.nextContentVersion; delete s.timeline.nextContentVersion; }
    if (s.timeline.nextRoleplayVersion === 1) { s.timeline.roleplayVersion = 1; delete s.timeline.nextRoleplayVersion; }
    s.flags.childhoodStage = age >= 18 ? 3 : Math.min(2, Math.floor(age / 6));
    s.phase = age >= 18 ? 'adult' : 'childhood';
    s.hero.maxHp = Math.max(s.hero.maxHp, 44 + s.hero.attributes.vitality * 3);
    s.hero.maxMp = Math.max(s.hero.maxMp, 16 + s.hero.attributes.intellect * 3);
    s.hero.hp = s.hero.maxHp; s.hero.mp = s.hero.maxMp;
    s.notice = lived.outcome;
    (ctx.journalLiteral || ctx.journal)(lived.title, lived.outcome, age < 18 ? 'childhood' : 'birthday');
    ctx.onBirthday?.();
    return true;
  }
  const scenario = age > 18 ? annualSceneAtChoice(s,adultScene(s)) : childScene(s);
  const picked = scenario?.choices.find(c => c.id === pick);
  let skills = pick === 'care' ? ['persuasion', 'devotion'] : pick === 'curiosity' ? ['scholarship', 'arcana'] : ['survival', 'weapons'];
  if (age === 10) skills = pick === 'care' ? ['weapons', 'defense'] : pick === 'curiosity' ? ['arcana', 'scholarship'] : ['stealth', 'survival'];
  if (age === 12) skills = pick === 'care' ? ['arcana', 'scholarship'] : pick === 'curiosity' ? ['survival', 'persuasion'] : ['weapons', 'devotion'];
  if (age === 15) skills = pick === 'care' ? ['devotion', 'persuasion'] : pick === 'curiosity' ? ['arcana', 'scholarship'] : ['stealth', 'scholarship'];
  if (scenario) { skills = picked.effect?.skills || []; rememberedEffect(s, ctx, picked); }
  if (!scenario && age >= 3) for (const key of skills) s.hero.skills[key]++;
  const attr = pick === 'care' ? 'presence' : pick === 'curiosity' ? 'intellect' : 'vitality';
  if (!scenario && (age < 3 || age % 3 === 0)) s.hero.attributes[attr]++;
  s.timeline.childhoodFacts[`year_${age}`] = picked?.memory || (pick === 'care' ? 'make time for others' : pick === 'curiosity' ? 'ask and investigate' : 'try an unfamiliar path');
  if (age === 7) { s.flags.childhoodFriend = true; ctx.remember('mira', `At seven, you ${pick === 'care' ? 'defended me when I was blamed for the silver charm' : pick === 'curiosity' ? 'looked for the truth about the missing charm' : 'helped turn an accusation into cooperation'}.`, 12); }
  if (age === 12) { s.flags.scholarship = s.revision >= 4 && s.family?.setup !== 'legacy' ? s.education.scholarship : pick === 'care'; s.flags.apprenticeship = s.revision >= 4 && s.family?.setup !== 'legacy' ? s.education.route === 'apprenticeship' : pick === 'curiosity'; s.flags.childhoodMentor = true; }
  if (age === 15 && !scenario) { s.flags.ancestralMentor = pick === 'curiosity'; s.flags.hiddenPage = pick === 'courage'; }
  if (age >= 6 && age <= 18) {const gift=birthdayGift(s);if(gift){s.hero.gold+=gift;receiveNotification(s,{kind:'gift',sourceId:'birthday-gift:'+s.age,title:'A Birthday Gift',body:'You received '+gift+' Gold for your birthday.'});}if(age===18)comeOfAge(s,ctx);}
  const title = scenario?.title || YEARS[Math.min(age, 18)][0];
  const summary = contentVersion(s) >= 7 && picked?.outcome ? picked.outcome : scenario ? `${picked.label}. ${picked.description}` : `${age < 3 ? s.revision >= 4 && s.family?.setup !== 'legacy' ? `${caregiver(s).name} chose` : 'Your guardians chose' : 'You chose'} to ${s.timeline.childhoodFacts[`year_${age}`]}. ${age >= 3 ? `You developed ${skills.join(' and ')}.` : `Your ${attr} grew through care and experience.`}`;
  s.timeline.yearHistory.push({ id: s.timeline.birthDay ? `birthday-${s.timeline.birthDay}-${age}` : `birthday-${age}`, age, day: s.day, title, summary, choice: pick,...(age>18&&s.timeline.annualScene?{locationId:s.locationId}:{}) });
  delete s.timeline.annualScene;
  s.timeline.yearTarget = null;
  s.timeline.yearStartDay = s.day;
  if([6,7].includes(s.timeline.nextContentVersion)) {s.timeline.contentVersion=s.timeline.nextContentVersion;delete s.timeline.nextContentVersion;}
  if(s.timeline.nextRoleplayVersion===1) {s.timeline.roleplayVersion=1;delete s.timeline.nextRoleplayVersion;}
  s.flags.childhoodStage = age >= 18 ? 3 : Math.min(2, Math.floor(age / 6));
  s.phase = age >= 18 ? 'adult' : 'childhood';
  s.hero.maxHp = Math.max(s.hero.maxHp, 44 + s.hero.attributes.vitality * 3);
  s.hero.maxMp = Math.max(s.hero.maxMp, 16 + s.hero.attributes.intellect * 3);
  s.hero.hp = s.hero.maxHp; s.hero.mp = s.hero.maxMp;
  s.notice = age === 18 ? s.campaign?.facts?.inheritedResolution && contentVersion(s)>=6 ? 'Adulthood opens in the world your family helped shape. Choose your own livelihood, relationships, or earned calling; your parent’s covenant commitment has not become yours.' : 'Adulthood opens. Choose a livelihood, seek a mentor, or decide what the childhood signs mean. Your path remains unformed until you earn a calling.' : summary;
  (contentVersion(s) >= 7 && ctx.journalLiteral || ctx.journal)(title, summary, age < 18 ? 'childhood' : 'birthday');
  ctx.onBirthday?.();
  return true;
}
function pending(s) { return Boolean(s.event || s.battle || s.conversations?.pending || s.maze || s.dungeon || s.timeline.journey || s.workshop?.project || s.careers?.batch); }
export function startAgeYear(s, ctx) {
  if (s.phase === 'retired' || pending(s) || s.life?.plan) { s.notice = s.careers?.batch ? 'Finish or abandon your committed work before aging up.' : s.workshop?.project ? 'Finish or cancel your committed workshop project before aging up.' : 'Finish the waiting decision, conversation, expedition, journey, or saved annual plan before aging up.'; return false; }
  if (s.timeline.yearTarget === null) {
    s.timeline.yearStartDay = s.day;
    const born=s.timeline.birthDay || 0;
    s.timeline.yearTarget = born + (Math.floor((s.day-born) / YEAR) + 1) * YEAR;
  }
  return continueAgeYear(s, ctx);
}
export function continueAgeYear(s, ctx) {
  if (pending(s) || s.phase === 'retired') { s.notice = 'Your year is waiting for the current decision. Time has not advanced.'; return false; }
  const target = s.timeline.yearTarget;
  if (target === null) { s.notice = 'Choose Age up to begin the next year.'; return false; }
  if (ctx.pendingNeed()) { ctx.afterAction(); return true; }
  while (s.day < target && !pending(s)) {
    const actual = ctx.spendDays(Math.min(30, target - s.day));
    // Mortality can close the chapter during elapsed time. Never open a new
    // birthday, credit later income, or run another decision after death.
    if (s.phase === 'retired' || s.hero.alive === false) return true;
    if (actual <= 0) { ctx.afterAction(); return true; }
    if (s.age >= 18 && typeof ctx.annualIncome === 'function') ctx.annualIncome(actual,s.day-actual);
    else if (s.age >= 18) {
      // Yearly wages belong to elapsed time, not button clicks. Civilian work remains viable.
      const rate = s.hero.profession === 'Unemployed' ? 0.25 : 0.55 + (s.life.career.rank || 0) * 0.1;
      const before = Math.floor((s.day - actual - s.timeline.yearStartDay) * rate);
      const after = Math.floor((s.day - s.timeline.yearStartDay) * rate);
      s.hero.gold += Math.max(0, after - before);
      s.life.career.experience += s.hero.profession === 'Unemployed' ? 0 : Math.floor(actual / 10);
    }
    ctx.afterAction();
    if (s.phase === 'retired' || s.hero.alive === false || ctx.pendingNeed() || pending(s)) return true;
  }
  if (s.day === target) {
    if (s.timeline.mode === 'birth') birthEvent(s, ctx);
    else {
      const age = s.age;
      s.timeline.yearHistory.push({ id: `birthday-${age}-${s.day}`, age, day: s.day, title: `A year in your own life`, summary: `You reached age ${age}. Your work, friendships, promises, and private knowledge continue.`, choice: 'lived' });
      s.timeline.yearTarget = null; s.timeline.yearStartDay = s.day;
      ctx.journal(`Your ${age}${age === 21 ? 'st' : 'th'} birthday`, 'Another year becomes part of the life you are making. Your next decisions remain open.', 'birthday');
      ctx.onBirthday?.();
    }
  }
  return true;
}
export function birthEventIds() {
  return Object.fromEntries(['birth_arrival', 'birth_adult_year', ...Array.from({ length: 19 }, (_, i) => `birth_year_${i}`)].map(id => [id, ['birth_arrival','birth_year_0','birth_year_1','birth_year_2'].includes(id)?[...PICKS,'continue']:[...PICKS]]));
}
const obj = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const int = (x, min = 0, max = 1000000) => Number.isSafeInteger(x) && x >= min && x <= max;
const text = (x, max = 5000) => typeof x === 'string' && x.length <= max;
export function validateTimeline(t, s) {
  if(!validateAnnualScene(t?.annualScene,s))return false;
  if (!obj(t) || !['birth', 'legacy'].includes(t.mode) || !(t.birthDay===undefined || int(t.birthDay,0,s.day)) || !(t.contentVersion===undefined || [4,6,7].includes(t.contentVersion)) || !(t.nextContentVersion===undefined || [6,7].includes(t.nextContentVersion)) || !(t.roleplayVersion===undefined || t.roleplayVersion===1) || !(t.nextRoleplayVersion===undefined || t.nextRoleplayVersion===1) || !int(t.yearStartDay) || t.yearStartDay > s.day || !(t.yearTarget === null || int(t.yearTarget, s.day) && (t.yearTarget-(t.birthDay || 0)) % YEAR === 0 && t.yearTarget - t.yearStartDay <= YEAR)) return false;
  if (!validateChildhoodStories(t.storybook, s)) return false;
  if (!obj(t.activityUses) || !Object.entries(t.activityUses).every(([k, v]) => /^\d+:grow_[a-z_]+$/.test(k) && int(v, 0, 2)) || !obj(t.childhoodFacts) || !Object.entries(t.childhoodFacts).every(([k, v]) => /^year_\d+(_detail)?$/.test(k) && text(v, 500))) return false;
  if (!Array.isArray(t.yearHistory) || t.yearHistory.length > 5000 || !t.yearHistory.every(y => obj(y) && text(y.id, 120) && int(y.age, 0, 5000) && int(y.day, 0, s.day) && text(y.title, 500) && text(y.summary, 5000) && text(y.choice, 80)) || new Set(t.yearHistory.map(y => y.id)).size !== t.yearHistory.length) return false;
  if(t.yearHistory.some(y=>y.locationId!==undefined&&!s.world.locations.some(p=>p.id===y.locationId)))return false;
  if (!(t.journey === null || obj(t.journey))) return false;
  if (t.journey) {
    const j = t.journey, ids = s.world.locations.map(p => p.id);
    if (!ids.includes(j.destinationId) || !Array.isArray(j.route) || j.route.length < 2 || !j.route.every(id => ids.includes(id)) || j.route.at(-1) !== j.destinationId || !int(j.legIndex, 0, j.route.length - 2) || !int(j.legProgress) || !int(j.startedDay, 0, s.day) || !Array.isArray(j.traversedIds) || j.traversedIds.join(',') !== j.route.slice(0, j.legIndex + 1).join(',') || s.locationId !== j.route[j.legIndex]) return false;
    for (let i = 1; i < j.route.length; i++) if (!s.world.roads.some(r => [r.from, r.to].includes(j.route[i - 1]) && [r.from, r.to].includes(j.route[i]))) return false;
    const road = s.world.roads.find(r => [r.from, r.to].includes(j.route[j.legIndex]) && [r.from, r.to].includes(j.route[j.legIndex + 1]));
    const planned=j.legs?.[j.legIndex];
    if(planned) {if(!int(planned.totalDays,1,30) || j.legProgress>planned.totalDays)return false;}
    else if (j.legProgress >= road.days) return false;
  }
  if (!(t.lastJourney === null || obj(t.lastJourney) && int(t.lastJourney.day, 0, s.day) && Array.isArray(t.lastJourney.route) && t.lastJourney.route.every(id => s.world.locations.some(p => p.id === id)))) return false;
  return true;
}
