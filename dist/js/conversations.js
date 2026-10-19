import { tournamentRecognition,tournamentRecognitionEligible } from './adult-tournament.js';
import { adultChildLifeView } from './adult-child-view.js';
import { isSettlement } from './world.js';
import { researchConversation, researchConversationEligible, authenticResearchConversation, recordResearchConversation, validateResearchPendingConversation } from './research-dialogue.js';
import { retiredNpcContacts } from './npc-continuity.js';
import { familyResidence, originFamilyMember } from './household-residence.js';
import { yardConversation, yardConversationEligible } from './yard-conversation.js';
import { receiveNotification } from './notifications-v40.js';
import { birthdayLetterText } from './birthday-correspondence.js';
import { observationalInfancy, personalCorrespondenceAllowed } from './development.js';
import { regionalCourtContacts, deploymentFor } from './regional-world-v33.js';
import { residentContacts } from './world-people-v31.js';
import { groundedDialogue } from './grounded-narrative-content.js';
import { recordConversationFollowUp, followUpAvailable, validateConversationFollowUps } from './conversation-followups.js';
import { isCanonicalAppearance } from './avatar.js';
import { serviceContacts } from './world-services.js';
import { characterConversation, voiceProfile } from './character-voice.js';
import { rpgContacts } from './rpg-depth-v27.js';
import { motiveFor } from './audit-content-v25.js';
import { generateCharacter, characterDetail } from './characters.js';
import { seededRoll } from './world.js';
import { classView } from './classes.js';
import { educationTeacher, educationRetiredTeachers } from './household.js';
import { compatibilityView } from './family-depth.js';
import { ANCESTRY_LORE, regionalLoreContext } from './lore.js';
import { normalizePreferences, PREFERENCE_OPTIONS, applyPreferenceActivity } from './preferences.js';
import { effectiveHeritage } from './portrait-library.js';
import { heritageById } from './heritages.js';
import { personalityImpactText } from './personality.js';
import { PERSONAL_TOPICS, personalScene } from './personal-dialogue.js';
import { companionRole, personalConcern, personalReadiness, reviewPersonalRepair, respectPersonalBoundaries } from './people-context.js';
import { peopleScene } from './people-dialogue.js';
import { validateRelationshipRepairs } from './relationship-repairs.js';
import { LEVY_NODES, levyScene, levyActions, levyEligible, levyHistoricalContacts, levyPendingAuthentic, recordLevyReply, validateLevyAftermath } from './winter-levy-aftermath.js';

const MAX_MESSAGES = 120;
const MAX_SEEN = 3000;
const ORDINARY_STORIES = Object.freeze([
  {id:'wages',title:'A name missing from the wage book',body:'has found their name missing from a payment ledger. Someone has been paid for work they did. They are deciding whether to challenge the keeper of the book.',question:'Ask what the ledger and witnesses actually show',reply:'I still have the original tally. I needed someone to ask before making the accusation for me.',skill:'scholarship',memory:'You helped me consider the evidence behind a missing wage.'},
  {id:'road',title:'The road they have never taken',body:'has been saving for a journey beyond the marsh. Their household calls it foolish, but staying has begun to feel like another kind of risk.',question:'Ask what they hope to find beyond the marsh',reply:'A place where I can be known for something I chose. I would still write home.',skill:'survival',memory:'You listened to the journey I wanted for myself.'},
  {id:'inheritance',title:'Something older than either of you',body:'has inherited a small household token and an argument about who should keep it. The object matters less than the old resentment attached to it.',question:'Ask whose memories the token holds',reply:'More than one person’s. Perhaps keeping it cannot mean keeping everyone else away from it.',skill:'persuasion',memory:'We spoke about an inherited token and the people it belonged to.'},
  {id:'burial',title:'The name beneath the moss',body:'has found an unfamiliar name on a stone in the old burial field. The household records disagree about who was buried there.',question:'Offer to compare the remembered accounts',reply:'I want their name remembered honestly. I can live with an unanswered question.',skill:'scholarship',memory:'You took an uncertain burial record seriously without inventing an answer.'},
  {id:'blade',title:'The blade offered at the door',body:'has been offered paid service to a minor lord. The coin is good. The lord refuses to say whose quarrel the service would settle.',question:'Ask what they would be willing to do for the coin',reply:'I need work. I also need to know whether I could bear the work afterward.',skill:'defense',memory:'We discussed the limits of service offered without honest terms.'},
  {id:'debt',title:'A letter folded too often',body:'carries a demand for an old household debt. They cannot tell whether its sender expects repayment or obedience.',question:'Ask which terms were actually agreed',reply:'The amount is written down. The demands for loyalty are not. I should answer them separately.',skill:'persuasion',memory:'We separated a recorded debt from a demand for loyalty.'},
  {id:'feast',title:'A chair at the winter table',body:'was left out of the winter feast after an argument with its host. Their anger has lasted longer than they expected.',question:'Ask what happened before choosing a side',reply:'I spoke harshly too. I want to return without pretending the argument never happened.',skill:'persuasion',memory:'You heard my part in an argument instead of choosing my side blindly.'},
  {id:'page',title:'The page nobody would sign',body:'has found an unsigned page inside a borrowed book. Its account of a local ritual contradicts the story taught at the shrine.',question:'Ask where the page came from',reply:'That is the question. An unsettling account still needs a source before it becomes a truth.',skill:'arcana',memory:'We questioned the source of an unsigned ritual manuscript.'},
]);
const clamp = n => Math.max(0, Math.min(100, n));
const sceneChoice = (id, label, description, text, response, effect = {}) => ({ id, label, description, text, response, effect });
const choicesForSave = choices => choices.map(({id,label,description}) => ({id,label,description}));
const tag = (personId, topic) => `${personId}:${topic}`;
const allPlaces = state => state.world?.locations || [];
const settledHome = state => {
  const preferred = state.hero?.birthplaceId || (state.hero?.origin === 'city' ? 'city' : 'home');
  return [preferred, 'brook', 'camp', 'sanctuary', 'city', 'home'].map(id => allPlaces(state).find(p => p.id === id)).find(p => p && !['destroyed','evacuated'].includes(p.status))?.id || preferred;
};
const elapsed = state => Math.floor((state.day || 0) / 365);
const safeAge = value => Math.max(0, Math.min(200, Math.floor(Number(value) || 0)));

function allContacts(state) {
  const contacts = [];
  for (const p of state.life?.people || []) {
    const minAge = p.id === 'kin' || p.role === 'relative' ? 0 : p.role === 'rival' || p.id === 'river' ? 6 : 3;
    const childRole = p.role === 'suitor' && (state.age || 0) < 18 ? 'school friend' : p.role;
    const familyRole = p.role === 'relative' ? p.familyRole || 'guardian' : null;
    const relativeDescription = familyRole === 'parent' ? 'Your parent, with their own work, worries, and memories of your earliest years.' : familyRole === 'sibling' ? 'A sibling with their own friendships, questions, and hopes.' : 'The caregiver who knows the small details of your earliest years.';
    const member = state.family?.members?.find(m=>m.personId===p.id);
    contacts.push({ id:p.id, name:p.name, role:childRole, familyRole, age:safeAge(p.age), bond:p.bond, minAge, locationId:originFamilyMember(state,p)||p.id===state.life.partnerId?familyResidence(state,p):p.locationId || settledHome(state), appearance:p.appearance, pronouns:p.pronouns, character:p.character, occupation:p.occupation,roomId:originFamilyMember(state,p)||p.id===state.life.partnerId?'homes':p.roomId, available:p.alive!==false && (!member || member.availability==='present'), description:p.description || (p.role === 'relative' ? relativeDescription : p.role === 'rival' ? 'A driven peer, whose arguments can become rivalry or respect.' : 'A familiar face with a life, worries, and hopes of their own.'), kind:'social', source:p });
  }
  contacts.push(...rpgContacts(state));
  contacts.push(...levyHistoricalContacts(state));
  for (const p of state.companions || []) {
    const minAge = {mira:3,orrin:6,kest:10}[p.id] || 6;
    contacts.push({ id:p.id, name:p.name, role:companionRole(p), age:safeAge(p.age), bond:clamp(50 + (p.relationship || 0)/2), minAge, locationId:p.recruited && p.active ? state.locationId : state.rpg?.companionStages[p.id]?.locationId || settledHome(state), appearance:p.appearance, pronouns:p.pronouns, character:p.character, available:p.alive!==false&&!['away','departed','dead'].includes(state.rpg?.companionStages[p.id]?.status), description:p.alive===false ? 'Their part in your life remains in memories and the family chronicle.' : p.goal || 'A companion with memories of the road you share.', kind:'companion', source:p });
  }
  const teachers = [];
  if (state.education) {
    const actual = educationTeacher(state);
    if (actual) teachers.push(actual);
    // An old teacher remains a real correspondent after a school change. Existing
    // threads and a pending legacy conversation retain their original identity.
    for (const route of ['community','shrine','academy','apprenticeship']) {
      const id=route==='community'?'school-tutor':`school-${route}-tutor`;
      if (id!==actual?.id && (state.conversations?.threads?.[id] || state.conversations?.relationships?.[id] || state.conversations?.pending?.personId===id)) teachers.push(educationTeacher({...state,education:{...state.education,route}}));
    }
  } else {
    const names = ['Mistress Edda', 'Tutor Iven', 'Master Rowan', 'Mistress Anwen', 'Tutor Sable', 'Master Pell'];
    teachers.push({id:'school-tutor',name:names[seededRoll(state.seed,'conversation-tutor',names.length)],age:32+elapsed(state),locationId:settledHome(state)});
  }
  for (const teacher of teachers.filter(Boolean)) {
    const tutor=state.conversations?.relationships?.[teacher.id];
    contacts.push({ ...teacher, role:'teacher', available:teacher.available!==false && teacher.alive!==false,bond:tutor?.bond ?? 35, minAge:6, description:`A patient teacher${teacher.schoolName?` at ${teacher.schoolName}`:''} who remembers questions as well as examination marks.`,kind:'extra',source:tutor });
  }
  for(const teacher of educationRetiredTeachers(state))if(state.conversations?.threads?.[teacher.id] || state.conversations?.relationships?.[teacher.id] || state.conversations?.pending?.personId===teacher.id) {
    const tutor=state.conversations?.relationships?.[teacher.id];
    contacts.push({...teacher,role:'retired teacher',bond:tutor?.bond ?? 35,minAge:6,available:state.conversations?.pending?.personId===teacher.id,description:'Their teaching and earlier correspondence remain in your history.',kind:'extra',source:tutor});
  }
  for (const item of classView(state).callings) {
    const data = state.conversations?.relationships?.[item.mentor.id];
    contacts.push({ ...item.mentor, role:`${item.name.toLowerCase()} mentor`, bond:data?.bond ?? (item.mentor.met?40:20), minAge:14, locationId:item.locationId, description:item.description, kind:'extra', source:data, callingId:item.id });
  }
  for (const child of state.life?.children || []) {
    const relationship = state.conversations?.relationships?.[child.id];
    const inherited=state.lineage?.people.find(person=>person.source==='child'&&person.localId===child.id);
    const adult=adultChildLifeView(state,inherited),residence=familyResidence(state,child);
    contacts.push({ ...(inherited?.appearance?{appearance:inherited.appearance,pronouns:inherited.pronouns}:{}), id:child.id, name:child.name, role:'your child', age:safeAge(child.age), bond:relationship?.bond ?? 65, minAge:18, locationId:residence, roomId:'homes', occupation:inherited?.adultLife?.work?.introducedDay!==null&&inherited?.adultLife?.work?inherited.adultLife.goal.profession:undefined, available:child.alive!==false&&(!inherited?.adultLife?.residence||isSettlement(state.world,residence)), description:child.alive===false?'Their life remains in the family chronicle and your remembered correspondence.':adult?`${adult.summary} ${adult.progress} ${adult.residence}`:'A child in your household, with wishes and questions of their own.', kind:'extra', source:relationship });
  }
  for(const p of [...(state.society?.people || []),...(state.society?.archive || [])])if(!p.sourcePersonId) {
    contacts.push({appearance:p.appearance,pronouns:p.pronouns,character:p.character,id:p.id,name:p.name,role:p.status==='independent'?'independent '+p.profession.toLowerCase():p.status==='retired'?'retired '+p.profession.toLowerCase():p.role==='colleague'?'workplace colleague':p.role==='customer'?'recurring customer':'new neighbor',age:safeAge(p.age),bond:p.bond,minAge:16,locationId:p.locationId,available:p.alive!==false,description:p.goal,occupation:p.profession,kind:'society',source:p});
  }
  for(const site of Object.values(state.realm?.sites||{}))for(const keeper of [site.keeper,...(site.keeperArchive||[])].filter(Boolean)){
    if(state.cartography?.sites[site.id]?.kind!=='Visited'&&!state.conversations?.threads?.[keeper.id]&&state.conversations?.pending?.personId!==keeper.id)continue;
    const record=state.conversations?.relationships?.[keeper.id];
    contacts.push({...keeper,age:safeAge(keeper.baseAge+Math.floor(((keeper.retiredDay??state.day)-keeper.createdDay)/365)),locationId:site.id,minAge:6,bond:record?.bond??30,available:(site.hasShrine!==false||state.realm.petition?.boardId===site.id||state.conversations?.pending?.personId===keeper.id)&&!keeper.retiredDay&&!['destroyed','evacuated'].includes(state.world.locations.find(p=>p.id===site.id)?.status),role:keeper.retiredDay?'archived keeper':keeper.role,description:keeper.retiredDay?'Their dated account remains in this institution’s history.':'A named keeper of local rites and copied accounts, with a life of their own.',kind:'extra',source:record});
  }
  if(state.worldServicesVersion===1)contacts.push(...serviceContacts(state));
  contacts.push(...regionalCourtContacts(state),...residentContacts(state),...retiredNpcContacts(state));
  return contacts.map(p=>{const assignment=deploymentFor(state,p.id);return assignment?{...p,available:false,description:'Serving away from home in the border war. Their identity, relationship and memories remain.'}:p;}).filter((p,index,array)=>typeof p.id==='string' && /^[a-z][a-z0-9_-]{0,79}$/.test(p.id) && !['constructor','prototype'].includes(p.id) && array.findIndex(other=>other.id===p.id)===index);
}
const contact = (state,id) => allContacts(state).find(p => p.id === id && p.available!==false&&!p.commitmentOnly && (state.age || 0) >= p.minAge);
const knowledge = p => p?.source?.knownFacts || [];
const knows = (p,fact) => knowledge(p).includes(fact);
const seen = (state,p,topic) => state.conversations?.seen?.includes(tag(p.id,topic));
const addSeen = (state,key) => { if (!state.conversations.seen.includes(key)) state.conversations.seen.push(key); state.conversations.seen = state.conversations.seen.slice(-MAX_SEEN); };
function relationRecord(state,p) {
  if (p.kind === 'extra') {
    if (!state.conversations.relationships[p.id]) state.conversations.relationships[p.id] = { bond:p.bond, memories:[], knownFacts:[] };
    return state.conversations.relationships[p.id];
  }
  return p.source;
}
function addMessage(state,p,speaker,text,provenance={}) {
  const thread = state.conversations.threads[p.id] ||= [];
  state.conversations.sequence += 1;
  thread.push({id:`letter-${state.conversations.sequence}`,speaker,text,day:state.day || 0,age:state.age || 0,channel:provenance.channel||(p.locationId===state.locationId?'spoken':'letter'),authoredDay:state.day||0,receivedDay:state.day||0});
  state.conversations.threads[p.id] = thread.slice(-MAX_MESSAGES);
}
function markRead(state,p) {
  for (const message of state.conversations.threads[p.id] || []) if (message.speaker !== 'hero') addSeen(state,`read:${message.id}`);
}
function memory(state,p,text,amount,ctx) {
  const record = relationRecord(state,p);
  if (p.kind === 'companion') {
    if (ctx.remember) ctx.remember(p.id,text,amount);
    else { record.relationship = Math.max(-100,Math.min(100,(record.relationship || 0)+amount)); if (!record.memories.includes(text)) record.memories.push(text); }
  } else {
    record.bond = clamp((record.bond || 0)+amount);
    if (!record.memories.includes(text)) record.memories.push(text);
  }
  record.memories = record.memories.slice(-30);
}
function learnFact(state,p,fact) {
  const record = relationRecord(state,p);
  record.knownFacts ||= [];
  if (!record.knownFacts.includes(fact)) record.knownFacts.push(fact);
  record.knownFacts = record.knownFacts.slice(-60);
}
function applyEffect(state,p,choice,ctx) {
  const effect = choice.effect;
  if(effect.review)reviewPersonalRepair(state,p.id);
  if(effect.agency&&p.source){p.source.agency={status:effect.agency,day:state.day,reason:choice.response};if(effect.pause&&p.kind==='companion'){p.source.active=false;}}
  const c=state.hero.condition;const charm=c?.type==='vampire'&&c.curseVersion===1&&c.stage==='changed'?(c.hunger<50&&(c.humanity??85)>=65?2:c.hunger>=85?-3:0):0;
  if(effect.bond>0&&charm)memory(state,p,'Your changed bearing affected this conversation.',charm,ctx);
  if (effect.bond || effect.memory) memory(state,p,effect.memory || `You said, “${choice.text}”`,effect.bond || 0,ctx);
  // Reflection supplements practice once a year; visiting every contact cannot replace training.
  if (effect.skill && !state.conversations.seen.includes(`insight:${state.age || 0}`) && state.hero?.skills && Number.isFinite(state.hero.skills[effect.skill])) {
    state.hero.skills[effect.skill] += 1;
    addSeen(state,`insight:${state.age || 0}`);
  }
  if (effect.happiness && state.life) state.life.happiness = clamp(state.life.happiness+effect.happiness);
  if (effect.fact) learnFact(state,p,effect.fact);
  if (effect.condition) {
    const type = state.hero.condition?.type;
    if (type) {
      learnFact(state,p,type); learnFact(state,p,`condition_${type}`);
      if (p.id === 'kin') { state.flags.conditionDisclosed = true; state.flags.familyRefuge = true; }
      if (p.id === 'mira') state.flags.miraKnowsCondition = true;
      if (type === 'lycanthrope') state.hero.condition.control = clamp(state.hero.condition.control+3);
    }
  }
  if (effect.research) {
    learnFact(state,p,'ancestral_research');
    if (p.id === 'mira') state.flags.miraKnowsResearch = true;
  }
  if (effect.campaign && state.campaign?.facts) {
    state.campaign.facts[effect.campaign] = true;
    learnFact(state,p,effect.campaign);
    if (p.id === 'mira') state.campaign.facts.confidedInMira = true;
  }
  if (effect.obligation) ctx.addObligation?.(`dialogue-notes-${p.id}`,`Bring your notes to ${p.name}`,60,'Return to this conversation with your observations. Honest notes are enough; no tuition is required.');
  if (effect.finish) ctx.finishObligation?.(`dialogue-notes-${p.id}`);
  if (effect.meal) applyPreferenceActivity(state,`meal_${effect.meal}`,{...ctx,completed:true,completedActionId:`meal_${effect.meal}`});
}

function ordinaryScene(state,p) {
  const age = state.age || 0, topic = `ordinary-${age}`;
  const roll = seededRoll(state.seed,`conversation-${p.id}-${age}`,4);
  const place = allPlaces(state).find(q=>q.id===p.locationId)?.name || 'home';
  const pendingNode=state.conversations?.pending?.nodeId;
  if (state.revision>=4 && p.familyRole==='sibling' && (!pendingNode || pendingNode==='sibling')) return {nodeId:'sibling',topic,title:age<3?'The other small life in your home':'A life beside your own',body:age<3?`${p.name}, your ${p.age>age?'older':'younger'} sibling, visits your blanket with a little carved bird. An adult stays close while your sibling talks about their own day; nobody asks a child to take a parent’s place.`:`${p.name}, your sibling, ${['has a different favorite story from yours','wants space for a friendship you do not share','is proud of something they made without your help','has been worrying about a lesson of their own'][roll]}. You share a household, but you are becoming different people.`,choices:[
    sceneChoice('share','Share a small moment','Build a sibling memory without making either child a caregiver.',age<3?'[You reach toward the little carved bird.]':'Show me what you have been making. I would like to hear about it.',age<3?'Look—the bird has a little blue wing. We can look together.':'I thought you would only want to tell me about your day. Thank you.',{bond:4,memory:'We made room for one another’s interests as siblings.'}),
    sceneChoice('curious','Notice what interests them','Respect that your sibling has a life of their own.',age<3?'[You watch the bird turn slowly above your blanket.]':'What do you like about it? You do not have to like the same things as me.','Perhaps we can teach each other something.',{bond:3,memory:'You asked about my interests without expecting them to match yours.'}),
    sceneChoice('space','Give each other quiet','Practice a kind boundary within your actual family.',age<3?'[You settle back while an adult makes the room peaceful.]':'We can have our own quiet for a while and come back later.','I like that. Being family does not mean doing everything together.',{bond:2,memory:'We respected each other’s need for space.'}),
  ]};
  if (state.revision>=4 && p.familyRole && age>=6 && (!pendingNode || pendingNode==='family')) return {nodeId:'family',topic,title:'The people who actually raise you',body:`${p.name}, your ${p.familyRole==='parent'?'parent':'caregiver'}, ${p.occupation?`sets aside their work as a ${p.occupation}`:'makes a little time beside the hearth'}. ${state.family?.housing==='unsheltered'?'Finding a safe roof is still a real worry for this household.':state.family?.setup==='orphan'?'The names of absent family are held in the household record; this guardian offers care without pretending to be your birth parent.':'They have worries and hopes beyond the plans they hold for you.'} “What do you need from our life together this year?”`,choices:[
    sceneChoice('ask','Ask about their own life','Listen to this actual parent or caregiver’s work and hopes.','What has been difficult for you? I want to understand your day too.','I worry about keeping enough time for care as well as work. It helps to be asked.',{bond:5,memory:'You asked about my own life, rather than only what I could do for you.'}),
    sceneChoice('belong','Talk about what makes a home','Acknowledge belonging without inventing money, shelter, or an absent parent.','I want a place where we can be honest about what we need.','Then let us begin with the people who are here, and keep a truthful place for those who are absent.',{bond:4,memory:'We spoke honestly about what makes a home and who is actually present.'}),
    sceneChoice('future','Ask for room to choose your future','Trust can coexist with a future different from family expectations.','I may choose a different life from the one you imagined. I still want you in it.','I may worry. That is not the same as owning your choices.',{bond:3,memory:'You asked for room to choose your future while keeping our relationship.'}),
  ]};
  if (age < 3) return {nodeId:'care',topic,title:'Before there are words',body:`${p.name} settles beside your cradle. ${['Rain sounds on the shutters, and a warm blanket smells of rosemary.','A painted wooden bird swings above you; a candle glows safely beyond reach.','The room is full of quiet singing while supper simmers at the hearth.','Someone laughs at the way your tiny fingers close around a offered thumb.'][roll]} Your guardian watches for what makes you comfortable.`,choices:[
    sceneChoice('comfort','Have your guardian hold you','Your guardian responds to your need for warmth and reassurance.','[Your guardian draws you close.]','You do not have to earn comfort. I am here.',{bond:3,happiness:2,memory:'I held you close through an ordinary, difficult evening.'}),
    sceneChoice('wonder','Let your guardian show you the room','A gentle moment of curiosity, guided by an adult.','[Your guardian names the colors around your cradle.]','That is the blue bowl. That is the lantern. One day you will have your own names for them.',{bond:2,memory:'We discovered small colors and sounds together before you had words.'}),
    sceneChoice('quiet','Let your guardian make the room quiet','Rest is a need, not a failure to explore.','[Your guardian lowers the lights and lets you rest.]','Sleep, little one. There will be more world tomorrow.',{bond:2,happiness:3,memory:'I made a quiet place for you to rest.'}),
  ]};
  if (p.role === 'your child') return {nodeId:'household',topic,title:'Questions at the kitchen table',body:`${p.name} ${p.age < 3 ? 'reaches for a storybook while you prepare supper' : 'asks whether a person has to follow the life their family expects'}. The question gives you a moment to decide what your home feels like.`,choices:[
    sceneChoice('support','Promise them room to become themselves','Strengthen your household’s trust.','You can try things. We will help you find your way.','Then I want to hear how you found yours.',{bond:6,happiness:3,memory:'You promised me room to choose my own life.'}),
    sceneChoice('story','Tell a true story from your childhood','Share one remembered part of your life.','When I was young, I did not know who I would become.','Will you tell me another part tomorrow?',{bond:5,memory:'You shared a real story from your childhood.'}),
    sceneChoice('duty','Explain that freedom comes with care for others','A household can hold both boundaries and affection.','Choose your path, and remember who your choices affect.','I think I understand. Can we learn it together?',{bond:3,memory:'You explained responsibility without demanding that I become you.'}),
  ]};
  if (age < 6) return {nodeId:'play',topic,title:'A kingdom made of chalk',body:`${p.name} ${p.role === 'relative' ? 'kneels beside the doorstep' : 'arrives with a piece of chalk'}. ${['A puddle has become a dragon’s lake.','The garden wall is now a castle.','Three fallen leaves are supposed to be a treasure.','An old crate is a ship bound for impossible islands.'][roll]} There is room in this make-believe kingdom for more than one kind of hero.`,choices:[
    sceneChoice('share','Make room for their idea','Practice listening and build a childhood memory.','You can choose what happens next.','Then our castle has a door that everyone can use.',{bond:4,skill:'persuasion',memory:'You made room for my idea in a childhood game.'}),
    sceneChoice('explore','Invent a path into the woods','Learn to notice routes and possibilities.','What if there is another way around the dragon?','Let us draw it before the rain comes.',{bond:2,skill:'survival',memory:'We invented a hidden path around an imaginary dragon.'}),
    sceneChoice('brave','Stand between the dragon and the village','Practice a protective instinct in a harmless game.','I will guard the door while you get everyone inside.','You can be brave without fighting everything.',{bond:2,skill:'defense',memory:'You guarded our chalk village while I rescued the pretend villagers.'}),
  ]};
  if (age < 10 && p.role === 'teacher') return {nodeId:'school',topic,title:'The question after the lesson',body:`${p.name} is putting away the slates when you ask about ${['a symbol that keeps appearing in old stories','why the village keeps a place for the dead at its feast','a traveler’s map with a river drawn in silver','a star that seems brighter after the evening bell'][roll]}. “An honest question is worth more than a copied answer.”`,choices:[
    sceneChoice('study','Ask how to find an answer','Practice scholarship through a patient question.','Show me where I can start looking.','Compare two accounts. Write down what each one leaves out.',{bond:3,skill:'scholarship',memory:'You stayed after the lesson to ask how evidence becomes knowledge.'}),
    sceneChoice('magic','Ask whether the answer might be magical','Practice arcana without choosing a permanent path.','Could there be a spell behind it?','Perhaps. First learn what happens when no spell is involved.',{bond:2,skill:'arcana',memory:'You were curious about magic before you knew what discipline you wanted.'}),
    sceneChoice('help','Help put the classroom in order','Care and practical effort also belong to education.','I can help before you go.','Thank you. The next pupil will find a clean slate because of you.',{bond:5,skill:'devotion',memory:'You helped prepare the schoolroom for someone who came after you.'}),
  ]};
  if (age < 10) return {nodeId:'school_friend',topic,title:'The walk home from school',body:`On the road through ${place}, ${p.name} admits ${p.role === 'rival' ? 'they hate getting an answer wrong in front of the class' : ['they lost a page of their exercise book','they are afraid of the next examination','they wish the lessons left more time for stories','someone called their family poor'][roll]}. You have time to answer before the paths divide.`,choices:[
    sceneChoice('kind','Offer to work through it together','Build trust without making a promise you cannot keep.','We can try it together. You do not have to pretend with me.','I thought you might laugh. I am glad you did not.',{bond:5,skill:'persuasion',memory:'You were kind when I admitted what worried me at school.'}),
    sceneChoice('curious','Ask what happened before giving advice','Practice attention and scholarship.','Tell me what happened first.','It is easier to explain when someone waits for the whole story.',{bond:3,skill:'scholarship',memory:'You listened before deciding what I should do.'}),
    sceneChoice('honest','Admit a worry of your own','A friendship can begin through mutual honesty.','There are things I am afraid of too.','Then perhaps neither of us has to be the fearless one.',{bond:4,memory:'You trusted me with a small worry of your own.'}),
  ]};
  if (age < 16) return {nodeId:'growing',topic,title:p.id === 'mira' ? 'Old games, new promises' : 'A future still taking shape',body:`${p.name} ${p.id==='mira' ? 'remembers the village you once defended in chalk. “I still want to protect real people. Do you?”' : p.role==='rival' ? 'has begun to practice in secret. “I want to be good at something that is mine.”' : 'asks what you enjoy practicing when no one is judging you'}. ${['The forge is lit across the lane.','Rain turns the schoolyard silver.','The evening bell carries over the river.','A traveling singer is packing away a borrowed lute.'][roll]}`,choices:[
    sceneChoice('martial','Talk about protecting people','Practice weapons through a discussion of discipline and care.','I want the skill to stand beside someone who needs help.','Then learn where to put your feet before you learn how to swing.',{bond:3,skill:'weapons',memory:'You said you wanted strength that could protect someone.'}),
    sceneChoice('arcane','Talk about understanding the unseen','Practice arcana; curiosity does not lock your future.','I want to understand what the old stories leave unexplained.','Keep your questions. Be careful about people who offer only easy answers.',{bond:3,skill:'arcana',memory:'You wanted to understand the unseen, not merely command it.'}),
    sceneChoice('quiet','Talk about finding another way','Practice stealth as observation rather than a moral label.','I like noticing the door no one else has seen.','That can save someone. It can also leave them wondering where you went.',{bond:3,skill:'stealth',memory:'You said there is often another way through a difficult situation.'}),
  ]};
  if (p.role==='teacher' || p.callingId) return {nodeId:'mentor',topic,title:'A lesson that needs no title',body:`${p.name} asks what you learned from the last person who disagreed with you. ${p.callingId ? '“An earned calling should enlarge your judgment, not replace it.”' : '“Examinations cannot tell me what kind of scholar you intend to be.”'} They offer to read your field notes when you have collected them.`,choices:[
    sceneChoice('notes','Promise to return with honest observations','Create a visible, finishable 60-day obligation. Return to this thread with your notes.','I will bring what I actually saw, including what I could not explain.','Good. A missing answer is better than an invented one.',{bond:3,obligation:true,memory:'You promised to bring honest observations, not an impressive story.'}),
    sceneChoice('ethics','Ask who the discipline is responsible to','Deepen trust and reflective knowledge.','Who is allowed to say that our work has harmed them?','The people who live with its consequences. Begin by listening.',{bond:4,skill:'scholarship',memory:'You asked whose voice the discipline should answer to.'}),
    sceneChoice('boundary','Keep your own counsel for now','Preserve a respectful relationship without owing a report.','I need time to decide what I want to practice.','Then take it. Your mind is not a debt you owe me.',{bond:2,memory:'You asked for time before committing your future to a teacher.'}),
  ]};
  const festival = state.world?.festival?.name || 'the lantern fair';
  if(state.flags?.portraitGeneration===1 && age>=16 && (!pendingNode || pendingNode.startsWith('ordinary_v12_'))) {
    const deck=[...ORDINARY_STORIES].sort((a,b)=>seededRoll(state.seed,`stories:${p.id}:${a.id}`,1000000)-seededRoll(state.seed,`stories:${p.id}:${b.id}`,1000000)||a.id.localeCompare(b.id));
    const story=pendingNode?ORDINARY_STORIES.find(item=>`ordinary_v12_${item.id}`===pendingNode):deck[(age-16)%deck.length];
    if(story)return {nodeId:`ordinary_v12_${story.id}`,topic,title:story.title,body:`In ${place}, ${p.name} ${story.body}${characterDetail(p)?` You know this much of their manner: ${characterDetail(p)}.`:''}`,choices:[
      sceneChoice('question',story.question,'Build trust and practice a skill through one considered conversation.', 'Tell me what you know, and what you still have to decide.',story.reply,{bond:5,skill:story.skill,fact:`story_${story.id}`,memory:story.memory}),
      sceneChoice('ambition','Share what you would hope to gain','State your own ambition while leaving their decision to them.',`I want to ${String(state.hero?.ambition || 'find my own place').replace(/^./,c=>c.toLowerCase()).slice(0,120)}. What would you hope to gain?`,'I will think about that. My answer may be different from yours.',{bond:3,fact:'personal_ambition',memory:`We compared our ambitions while discussing ${story.title.toLowerCase()}.`}),
      sceneChoice('boundary','Say you see it differently','Disagree without making an empty promise.','I see this differently. I can explain my view, but the decision is yours.','Then explain it. I would rather know where we disagree.',{bond:2,memory:`We disagreed about ${story.title.toLowerCase()} and kept speaking.`}),
      ...(age>=18?[sceneChoice('pressure','Use their worry to demand a favor','Lose 8 bond. This person remembers your attempt to use their worry.','I will hear you out if you agree to owe me something afterward.','So my worry is a bargaining piece to you. I will remember that.',{bond:-8,fact:'uses_vulnerability',memory:`You tried to make me owe you while I was worried about ${story.title.toLowerCase()}.`})]:[]),
    ]};
  }
  const body = p.id==='mira' && state.flags?.childhoodFriend ? `${p.name} remembers that you stood beside her when you were children. “I have never forgotten it. But I want to know the person you are now, too.”` : `${p.name} ${['has saved you a place at '+festival,'admits that ordinary work has become tiring','asks whether your ambitions still feel like your own','brings news of an old neighbor and stays for tea'][roll]}. The life around an adventure continues to need attention.`;
  return {nodeId:'ordinary',topic,title:'A place beside the hearth',body,choices:[
    sceneChoice('listen','Ask how they have been','Build trust by making room for their life.','Tell me how things have been for you.','Thank you for asking before telling me what I should do.',{bond:5,happiness:2,memory:'You made room for my life during an ordinary conversation.'}),
    sceneChoice('ambition','Talk honestly about your ambition','Share your stated ambition with this participant alone.',`I still want to ${String(state.hero?.ambition || 'find a place to belong').replace(/^./,c=>c.toLowerCase()).slice(0,120)}.`,'That sounds like something we should speak of again after you have tried it.',{bond:3,fact:'personal_ambition',memory:'You told me what you wanted your life to mean.'}),
    sceneChoice('disagree','Explore a difference without ending the friendship','Roleplay conviction without a universal morality penalty.','I think we see this differently. I want to understand why.','Then let us keep talking instead of pretending we agree.',{bond:2,memory:'We disagreed and still chose to understand one another.'}),
  ]};
}

function baseScene(state,p) {
  const age = state.age || 0;
  const notes = state.obligations?.find(o=>o.id===`dialogue-notes-${p.id}` && !o.resolved);
  if (notes) return {nodeId:'notes',topic:`notes-${notes.dueDay}`,title:'The notes you promised',body:`${p.name} makes space on the table. “You promised to bring me your observations. I would rather read something honest than something perfect.”`,choices:[
    sceneChoice('share','Share honest observations','Finish your notes obligation and practice scholarship.','Here is what I saw. I have marked the parts I could not explain.','These uncertainties tell me you were paying attention.',{bond:5,skill:'scholarship',finish:true,memory:'You returned with honest observations and kept your promise.'}),
    sceneChoice('release','Ask to be released from the promise','Finish the obligation honestly without gaining the lesson.','I cannot give this the time it deserves. May we set it aside?','Yes. Tell me sooner next time; an honest limit is better than a vanished pupil.',{bond:-2,finish:true,memory:'You admitted that you could not complete the notes you promised.'}),
  ]};
  if ((!state.conversations?.pending||state.conversations.pending.nodeId==='confidence') && age >= 18 && state.hero?.condition && !knows(p,state.hero.condition.type) && !seen(state,p,`confidence-${state.hero.condition.type}`)) return {nodeId:'confidence',topic:`confidence-${state.hero.condition.type}`,title:'A confidence offered',body:`${p.name} notices that you have been taking care over your routines. “You do not have to tell me everything. But if there is something you want help carrying, I can listen.” No one here knows your condition unless you choose to explain it.`,choices:[
    sceneChoice('confide',`Explain your ${state.hero.condition.type==='vampire'?'vampiric hunger':'lycanthropy'} privately`,'Only this named participant learns your condition. Gain trust; no official report or bystander knowledge is created.',state.hero.condition.type==='vampire'?'I live with a hunger that needs blood. I want to manage it without taking anyone’s choice away.':'The full moon changes me. I am making a plan to stay safe, and I want you to know the truth.','Thank you for trusting me. Let us be clear about the help you need and the boundaries we both want.',{bond:8,condition:true,memory:'You trusted me privately with your condition and explained your safety plan.'}),
    sceneChoice('private','Ask for privacy while keeping the friendship','Keep your secret and preserve a respectful bond.','I am not ready to explain it. I still want you in my life.','Then I will respect that. Tell me when you want company, not an interrogation.',{bond:3,memory:'You asked for privacy and still made room for our friendship.'}),
  ]};
  const damage = allPlaces(state).find(place=>[p.locationId,p.source?.birthplaceId,p.source?.homeId].includes(place.id) && ['scarred','evacuated','destroyed'].includes(place.status) && !seen(state,p,`damage-${place.id}-${place.status}`));
  if (damage && age >= 16) return {nodeId:'damage',topic:`damage-${damage.id}-${damage.status}`,title:'The place that changed',body:`${p.name} speaks of ${damage.name}. ${damage.status==='destroyed' ? '“There are doors there that no one will open again. People need a place to belong while we decide what comes next.”' : damage.status==='evacuated' ? '“Leaving kept people alive. It did not make leaving easy.”' : '“The marks on the walls are still there. Recovery will need more than a victorious story.”'} The change has reached ordinary households as well as the people in the campaign.`,choices:[
    sceneChoice('refuge','Ask them to help organize a safe refuge','Gain local trust and named refuge volunteers for the campaign.','Will you help me find safe beds and people willing to share them?','Yes. I can bring a list of households, and ask each one before adding its name.',{bond:6,campaign:'refugeVolunteers',fact:`world_${damage.id}_${damage.status}`,memory:`We discussed a refuge for people affected by ${damage.name}.`}),
    sceneChoice('listen','Make room for what they lost','Build personal trust without choosing a campaign strategy.','Tell me what you miss. We do not have to turn it into a plan today.','I miss the sound of the market before anyone had a reason to be afraid.',{bond:7,happiness:2,fact:`world_${damage.id}_${damage.status}`,memory:`You listened to what I lost when ${damage.name} changed.`}),
    sceneChoice('rebuild','Ask whose voice should guide rebuilding','Build support for a community-led response.','The people who lived there should decide what rebuilding means.','Then ask them before the councils start drawing clean lines over old lives.',{bond:4,campaign:'neighborSupport',fact:`world_${damage.id}_${damage.status}`,memory:'You said displaced people should shape the future of their own homes.'}),
  ]};
  if (state.campaign?.ending && age >= 16 && !seen(state,p,`ending-${state.campaign.ending.id}`)) return {nodeId:'ending',topic:`ending-${state.campaign.ending.id}`,title:'After the last great decision',body:`${p.name} has heard the public account of ${state.campaign.ending.title}. “People will tell this as a story about someone extraordinary. What do you want the ordinary years after it to be like?”`,choices:[
    sceneChoice('home','Say you want a life among people you know','Return the ending to your ongoing relationships.','I want somewhere to come home, and people whose lives I make time for.','Then come back when nothing dramatic has happened, too.',{bond:6,happiness:3,memory:'After the campaign, you wanted a life among people who knew you.'}),
    sceneChoice('service','Promise to keep listening to those affected','Build community trust after the final confrontation.','I want the people affected to have a voice in what follows.','Good. A last battle should not be the last time they are asked.',{bond:4,campaign:'neighborSupport',memory:'You wanted to remain answerable after the campaign ended.'}),
    sceneChoice('wander','Admit that you still need to find your place','Keep space for uncertainty and future roleplay.','I do not know yet. I want to keep finding out.','Then let this be one chapter, not the answer to everything.',{bond:3,memory:'You admitted that an ending had not answered every question in your life.'}),
  ]};
  if (age >= 18 && state.hero?.condition && !knows(p,state.hero.condition.type) && !seen(state,p,`confidence-${state.hero.condition.type}`)) return {nodeId:'confidence',topic:`confidence-${state.hero.condition.type}`,title:'A confidence offered',body:`${p.name} notices that you have been taking care over your routines. “You do not have to tell me everything. But if there is something you want help carrying, I can listen.” No one here knows your condition unless you choose to explain it.`,choices:[
    sceneChoice('confide',`Explain your ${state.hero.condition.type==='vampire'?'vampiric hunger':'lycanthropy'} privately`,'Only this named participant learns your condition. Gain trust; no official report or bystander knowledge is created.',state.hero.condition.type==='vampire'?'I live with a hunger that needs blood. I want to manage it without taking anyone’s choice away.':'The full moon changes me. I am making a plan to stay safe, and I want you to know the truth.','Thank you for trusting me. Let us be clear about the help you need and the boundaries we both want.',{bond:8,condition:true,memory:'You trusted me privately with your condition and explained your safety plan.'}),
    sceneChoice('private','Ask for privacy while keeping the friendship','Keep your secret and preserve a respectful bond.','I am not ready to explain it. I still want you in my life.','Then I will respect that. Tell me when you want company, not an interrogation.',{bond:3,memory:'You asked for privacy and still made room for our friendship.'}),
  ]};
  const research = state.flags?.forbiddenResearch || state.hero?.specialization==='necromancer';
  if (age >= 18 && research && !knows(p,'ancestral_research') && !seen(state,p,'research')) return {nodeId:'research',topic:'research',title:'What a book can ask of you',body:`${p.name} asks why you have spent so many evenings over old manuscripts. ${p.id==='mira' ? '“I believe that the dead have wishes, too. I want to understand what you are doing before deciding what I think.”' : '“A difficult subject is not the same as a simple answer. What does it mean to you?”'} Your reply can disclose the work to this person, or leave it private.`,choices:[
      sceneChoice('consent','Explain your research and the boundaries of consent',`This person learns about your ancestral research.${p.id==='mira' && state.flags?.soulBound ? ' Mira learns of the unwilling binding and withdraws from the active party.' : ' No official report is created.'}`,p.id==='mira' && state.flags?.soulBound ? 'I have studied ancestral rites. I bound an unwilling soul, and I know that crossed the boundary you asked me to keep.' : 'I have studied ancestral rites. I believe the dead should be asked, and allowed to leave.',state.flags?.soulBound && p.id==='mira' ? 'You bound someone who did not agree. I can hear you, but I cannot travel with you while you defend that choice.' : 'Then keep that boundary when it becomes inconvenient. I will remember the promise.',{bond:p.id==='mira'&&state.flags?.soulBound?-15:6,research:true,censure:p.id==='mira'&&Boolean(state.flags?.soulBound),...(p.id==='mira'&&state.flags?.soulBound?{fact:'unwilling_binding'}:{}),memory:'You explained your ancestral research to me privately.'}),
    sceneChoice('question','Ask about their beliefs without disclosing the manuscript','Keep your research private and learn where your views differ.','What do you think the living owe the dead?','At least an honest name, a remembered life, and the right not to be used.',{bond:3,memory:'We discussed what the living owe the dead, without pretending we agreed on everything.'}),
  ]};
  const facts = state.campaign?.facts || {};
  const revelation = facts.covenantExposed ? 'covenant' : facts.clue15 ? 'fifteen' : facts.clue10 ? 'ten' : facts.clue4 ? 'four' : null;
  if (revelation && !seen(state,p,`fate-${revelation}`)) {
    const fate = state.campaign?.fate || 'echo';
    const memory = {ember:'the warmth beneath a cold ember',echo:'a bell sounding where there was no bell',thorn:'a root that seemed to remember a vanished path'}[fate];
    return {nodeId:'fate',topic:`fate-${revelation}`,title:'Something the world remembers',body:`${p.name} ${p.id==='kin' ? `remembers the first time you spoke about ${memory}. “I did not know whether to call it a gift or a worry.”` : 'asks about the old signs you have been trying to understand'}. ${revelation==='covenant'?'Now that the covenant has been exposed, your question is about who should be trusted with its future.':'The signs offer a possibility, not an instruction about who you must become.'}`,choices:[
      sceneChoice('share','Share what you have learned with this person','This participant learns about your fate research; build support without advancing the quest.',`I have been trying to understand ${memory}. I want help, not a destiny chosen for me.`,'Then I will help you keep asking whose voice is missing.',{bond:5,campaign:age>=16?'volunteeredHelp':'neighborSupport',fact:`fate_${revelation}`,memory:'You shared your questions about the old signs and asked for help without surrendering your choices.'}),
      sceneChoice('ordinary','Say that you still want an ordinary life','Roleplay a life beyond the campaign; no class or quest is forced.','Whatever it means, I still want a life of my own.','You are allowed that. A sign does not own the person who notices it.',{bond:4,happiness:2,memory:'You insisted that the old signs did not own your future.'}),
      sceneChoice('careful','Keep the details private and ask for patience','Preserve secrecy without damaging the relationship.','I need to understand more before I explain the details.','Then take care, and remember that keeping a secret is not the same as being alone.',{bond:2,memory:'You asked for patience while you learned more about the old signs.'}),
    ]};
  }
  const pendingNode = state.conversations?.pending?.nodeId;
  const vocation = state.hero?.profession;
  const worked=state.careers?.records?.[vocation]?.workedDays||0;
  const workChapter=worked>=1080?'seasoned':worked>=360?'established':worked>=90?'practiced':'beginning';
  const vocationalTopic = pendingNode==='vocation'?state.conversations.pending.topic:state.stories?`vocation-${vocation}-${workChapter}`:`vocation-${vocation}-${age}`;
  if (state.timeline?.roleplayVersion===1 && age>=16 && vocation && vocation!=='Unemployed' && (!pendingNode || pendingNode==='vocation') && !seen(state,p,vocationalTopic)) return {nodeId:'vocation',topic:vocationalTopic,title:'The work your life is made of',body:`${p.name} asks about your ${vocation.toLowerCase()} work. ${state.careers?.records?.[vocation]?.workedDays || 0} actual working days and ${state.careers?.records?.[vocation]?.commissions || 0} delivered commissions stand behind the title. “Who do you want this work to serve, and what do you need it to give back?” A profession can be a whole life, alongside an earned calling or without one.`,choices:[
    sceneChoice('purpose','Explain whom you want your work to help','This person learns about your professional purpose; gain 4 bond without changing your profession or class.','I want my work to be useful to people whose names I know. I also need a life I can sustain.','Then keep asking both questions. Neither your customers nor your own needs should disappear.',{bond:4,fact:`profession_${vocation.toLowerCase()}`,memory:`You explained the purpose and limits of your ${vocation.toLowerCase()} work.`}),
    sceneChoice('balance','Ask what your work has cost the relationship','Gain 6 bond by making room for their account. No professional experience or invented agreement is granted.','Have I made enough room for your life beside mine? I want an honest answer.','Sometimes I need company more than another account of your achievements. Thank you for asking.',{bond:6,happiness:2,memory:`You asked what your ${vocation.toLowerCase()} work had cost our time together.`}),
    sceneChoice('private','Keep the work private and make time for their story','Keep the details of your work to yourself while preserving respectful company. Gain 2 bond.','I am still finding what I want from it. Tell me what has been happening in your life.','We can leave room for an unanswered question and still share this evening.',{bond:2,memory:'You kept your work private and made time to hear my own story.'}),
  ]};
  const ordinary = ordinaryScene(state,p);
  if (!seen(state,p,ordinary.topic)) return ordinary;
  const mealTopic=`meal-${age}`;
  if (state.revision>=4 && state.hero?.preferences && age>=6 && (p.familyRole || p.kind==='companion') && !seen(state,p,mealTopic)) return {nodeId:'meal',topic:mealTopic,title:'A taste of an ordinary life',body:`At the next shared table, ${p.name} sets out small bowls from a community supper. Warm barley broth, garden lentils, baked pears, and saffron grains carry different stories of the region. Choose what you actually eat; a favorite dish can bring a little extra joy, at most once every 30 days.`,choices:[
    sceneChoice('hearty','Share broth and warm bread','Eat a hearty meal. Favorite meals give bounded enjoyment; no gold, skills, or attributes are granted.','I will have the barley broth and warm bread.','There is something kind about a supper that leaves no one hungry.',{bond:1,meal:'hearty',memory:'We shared barley broth and warm bread at a community supper.'}),
    sceneChoice('plant','Share lentils and garden greens','Eat a plant-forward meal. Favorite meals give bounded enjoyment; no gold, skills, or attributes are granted.','I will have the garden lentils and roasted roots.','The garden keepers brought enough herbs for everyone’s bowl.',{bond:1,meal:'plant',memory:'We shared garden lentils, greens, and roasted roots.'}),
    sceneChoice('sweet','Share baked pears and a honey cake','Eat something sweet. Favorite meals give bounded enjoyment; no gold, skills, or attributes are granted.','I will have a baked pear and a little honey cake.','A little sweetness belongs in an ordinary day too.',{bond:1,meal:'sweet',memory:'We shared baked pears and a small honey cake.'}),
    sceneChoice('spiced','Share fragrant saffron grains','Eat a spiced bowl. Favorite meals give bounded enjoyment; no gold, skills, or attributes are granted.','I will have the saffron grains with warming spice.','The caravan cook taught us this one. Every household adds its own small change.',{bond:1,meal:'spiced',memory:'We shared fragrant saffron grains and a caravan cook’s recipe.'}),
  ]};
  return null;
}

function youngContactScene(state,p) {
  const stage=p.age<3?'infant':p.age<7?'small':'school',topic=`young-${p.age}-${state.age}`;
  if(seen(state,p,topic))return null;
  return {nodeId:'young_contact',topic,title:p.age<3?'A small life beside the hearth':'Their own growing world',
    body:p.age<3?`${p.name} watches the light beside a safe blanket. A caregiver stays nearby. Their sounds and gestures ask for company, not adult advice or responsibilities.`:p.age<7?`${p.name} shows you a little creature made from scraps of cloth. They have a story for its missing ear and want to decide where it will sleep tonight.`:`${p.name} has brought a page from their lessons. One question still troubles them, and there is a game they would rather be playing. Their growing world deserves room of its own.`,choices:[
      sceneChoice('share',p.age<3?'Offer gentle company':'Join their small discovery','Build a memory appropriate to their age.',p.age<3?'[You sit nearby while the caregiver makes the room comfortable.]':'Show me the part you like best.',p.age<3?'[They follow the soft light and settle.]':'This is the part I made myself.',{bond:3,memory:`You made room for my ${stage} years without asking me to carry adult worries.`}),
      sceneChoice('listen',p.age<3?'Notice their gestures':'Let them tell it in their own words','Pay attention without assigning a grown-up duty.',p.age<3?'[You answer a small gesture with a gentle smile.]':'I have time to listen.',p.age<3?'[A little hand reaches toward the light.]':'I was hoping you would wait for the whole story.',{bond:4,memory:'You listened at a pace that suited my age.'}),
      sceneChoice('space','Leave room for rest and play','Respect their limits; their caregiver remains responsible.',p.age<3?'[You leave them peaceful company and quiet.]':'We can come back to it after you rest.','[The small moment ends without a promise or a demand.]',{bond:2,memory:'You respected my need for quiet and play.'}),
    ]};
}

function motiveScene(state,p){
  const m=motiveFor(p),topic=`personal-${state.age}-0`,seen=state.conversations.seen.includes(`${p.id}:${topic}`);if(seen)return null;
  const facts=p.source?.knownFacts||p.knownFacts||[],hurt=facts.some(f=>/coercion|soul_bound|unwilling/.test(f))||(p.source?.memories||[]).some(t=>/pressured|unwilling/.test(t));
  const bound=!!state.campaign?.facts.compulsoryCovenant;
  const low=(p.bond??p.source?.bond??50)<35,refusal=(hurt||low)&&m.kind!=='power';
  const hunger=state.hero.condition?.type==='vampire'?state.hero.condition.hunger:0;
  return {nodeId:'personal_v25_motive',topic,title:'What '+p.name+' wants to keep',body:`${p.name}: “${m.voice} I want to ${m.desire}. I fear ${m.fear}.” ${hurt?'They refer to the pressure recorded in their own memories. They do not claim knowledge of your private deeds.':''} ${bound?'The compulsory covenant restricts their freedom; cooperation cannot be called consent.':''} ${hunger>=85?'You hear their pulse before you can attend to the words.':''}`,choices:[
    {id:'listen',label:'Hear the boundary in their own words',description:'Attend to this person’s desire and fear; the remembered bond changes.',text:'Tell me where the promise should end.',response:refusal?'Then begin with the account I kept. I will not forget it simply because you listened.':m.voice,effect:{bond:refusal?1:5,memory:'You listened to my stated desire: '+m.desire+'.'}},
    {id:'bargain',label:refusal?'Ask what could make a limited task possible':'Propose one limited task with agreed terms',description:refusal?'They can refuse the task they distrust. Their refusal is an actual constraint.':'A bounded bargain can be compatible with an ambitious or caring ally.',text:'What task would you freely agree to, with a right to stop?',response:refusal?'I refuse this task while that account stands. I will speak again; I will not travel for it.':m.kind==='power'?'I will take the profitable road with you. State my share and I will state my limit.':'One task, with a named end. I can agree to that.',effect:{bond:refusal?-1:3,memory:refusal?'I refused the proposed task because my recorded boundary remains.':'We agreed a limited task without claiming future obedience.',agency:bound?'constrained':refusal?'refusing':'bargaining'}},
    {id:'pressure',label:'Demand loyalty despite the boundary',description:'They witness this demand themselves. A compatible ambitious ally can bargain; a free companion can withdraw.',text:'I need your loyalty whether you like the terms or not.',response:bound?'The covenant keeps me here. That is compulsion, and I will name it as such.':m.kind==='power'?'Power has its price. I will stay if I benefit; do not mistake that for devotion.':'Then I will keep my distance. You have heard my limit.',effect:{bond:m.kind==='power'?1:-12,memory:'You demanded my obedience after I stated my own boundary.',agency:bound?'constrained':m.kind==='power'?'bargaining':'withdrawn',pause:m.kind!=='power'&&!bound}},
    {id:'leave',label:'Leave room for a different answer later',description:'No task or obedience is claimed. The person retains their own plans.',text:'I will leave the question open.',response:'Then let the next answer belong to the next meeting.',effect:{bond:1,memory:'You left a proposed task open instead of claiming my time.'}},
  ]};
}
function selectScene(state,p,{mode='personal'}={}) {
  // Captured old correspondence retains its node and replies. Newly met living
  // contacts speak about an actual goal and remembered work, not a stock hero.
  const oldPending=state.conversations?.pending;
  if(LEVY_NODES.includes(oldPending?.nodeId))return oldPending.snapshot;
  if(oldPending?.nodeId==='tournament_rival')return tournamentRecognitionEligible(state,p)?oldPending.snapshot:null;
  if(oldPending?.nodeId==='research_recall')return authenticResearchConversation(state,p,oldPending.snapshot)?oldPending.snapshot:null;
  if(oldPending?.nodeId==='yard_conversation')return yardConversationEligible(state,p)?oldPending.snapshot:null;
  if(oldPending?.nodeId==='person_v30')return oldPending.snapshot;
  if(!oldPending&&mode!=='quest'){const recognition=tournamentRecognition(state,p);if(recognition)return recognition;const shared=yardConversation(state,p);if(shared)return shared;}
  if(!oldPending&&mode!=='quest'){const recalled=researchConversation(state,p);if(recalled)return recalled;}
  if(!oldPending&&mode!=='quest'){const levy=levyScene(state,p);if(levy)return levy;}
  if(!oldPending&&mode!=='quest'&&state.age>=18&&p.age>=18){
    const returning=personalScene(state,p);
    if(returning?.nodeId==='personal_v14_return')return returning;
  }
  if(state.narrativeEdition===30&&!oldPending){
    const scene=groundedDialogue(state,p,{topic:mode==='quest'?'work':undefined,relationship:state.conversations?.relationships?.[p.id]||p.source||{bond:p.bond}}),concern=!scene.followUp&&state.age>=18&&p.age>=18?personalConcern(state,p):null;
    if(concern){scene.body+='\n\n'+concern.summary+(concern.last?'\nTheir recorded account: '+concern.last.slice(0,700):'')+(personalReadiness(state,p.id)?'\n'+personalReadiness(state,p.id):'');const ask=scene.choices.find(c=>c.id==='ask');if(ask)ask.response=concern.identity.answer;}
    const previous=(state.conversations?.threads?.[p.id]||[]).findLast(m=>m.speaker==='hero');
    if(!scene.followUp&&previous&&state.day-previous.day<7)for(const c of scene.choices)if(c.effect?.bond>1){c.effect.bond=1;c.description+=' Recent conversation means a smaller familiarity gain.';}
    return seen(state,p,scene.topic)?null:scene;
  }
  if(['personal_v25_motive','voice_v28','person_v29','person_v30','yard_conversation','tournament_rival'].includes(oldPending?.nodeId))return oldPending.snapshot;
  if(state.age>=16 && p.age<16 && (!oldPending||oldPending.nodeId==='young_contact'))return youngContactScene(state,p);
  if(state.characterDialogueVersion===28&&!oldPending&&mode!=='quest'&&state.age>=3){const important=baseScene(state,p),returning=state.age>=18&&personalScene(state,p)?.nodeId==='personal_v14_return';if(!returning&&!['notes','confidence','research'].includes(important?.nodeId)){return peopleScene(state,p)||characterConversation(state,p,{mode:p.locationId===state.locationId?'visit':'letter'});}}
  const societyMode=p.kind==='society' && (!oldPending || oldPending.nodeId==='society');
  const personal=state.stories && (state.age||0)>=18 && ((!oldPending&&mode!=='quest')||oldPending?.nodeId.startsWith('personal_v14_'));
  const timely=personal&&!oldPending?baseScene(state,p):null;
  const motive=personal&&!oldPending&&mode!=='quest'&&personalScene(state,p)?.nodeId!=='personal_v14_return'&&!(timely&&['notes','confidence','research'].includes(timely.nodeId))?motiveScene(state,p):null;
  const scene=motive|| (personal?(timely&&['notes','confidence','research'].includes(timely.nodeId)?timely:personalScene(state,p)):societyMode?livingPersonScene(state,p):baseScene(state,p));
  if (!scene || !state.hero?.preferences || (state.age || 0)<3) return scene;
  const preferences=normalizePreferences(state.hero.preferences);
  const pursuit=PREFERENCE_OPTIONS[0].options.find(o=>o.value===preferences.pursuit).label.toLowerCase();
  const style={quiet:'You find it easier to speak when there is room for a thoughtful pause.',warm:'You make a welcoming place for the conversation, glad of familiar company.',bold:'You meet the conversation directly, wanting room to say what you mean.'}[preferences.socialStyle];
  const value={mercy:'Care and restraint matter to you when someone is vulnerable.',freedom:'You want both people to have room to choose.',duty:'You listen for promises that can be kept, and responsibilities that are clear.',ambition:'You are drawn to the effort of becoming capable, without deciding another person’s future.'}[preferences.value];
  const ancestry=ANCESTRY_LORE.find(a=>a.id===state.hero.appearance?.ancestry);
  const culturalScene=['family','sibling','meal','school','mentor'].includes(scene.nodeId);
  const familyHeritage=effectiveHeritage(state.hero);
  const heritage=ancestry && culturalScene?` Your ${ancestry.name.toLowerCase()} heritage, ${familyHeritage?.name||ancestry.name}: ${familyHeritage?.custom||familyHeritage?.customs||ancestry.customs.split(/(?<=\.)\s/)[0]} You choose how to carry it forward.`:'';
  const regional=state.lore && culturalScene?regionalLoreContext(state):null;
  const culture=regional?` Around you, ${regional.cultureName} marks ${regional.traditionName}: ${regional.tradition}`:'';
  const lived=(p.source?.memories || []).filter(m=>typeof m==='string' && m.length>0).at(-1);
  const remembered=lived && ['ordinary','family','sibling'].includes(scene.nodeId)?` One real memory stays with this relationship: ${lived.slice(0,220)}`:'';
  const compatibility=p.kind==='social'?compatibilityView(state,p.source):null;
  const actualPreferences=compatibility?.known?.length && ['ordinary','family','sibling'].includes(scene.nodeId)?` You know their own preferences: ${compatibility.known.map(r=>`${r.label.toLowerCase()}: ${r.value.toLowerCase()}`).join('; ')}. ${compatibility.differences.length?'A difference does not make the relationship a mistake.':'Shared tastes still leave room for two people’s choices.'}`:'';
  const independentLife=p.kind==='social'?state.society?.people.find(person=>person.sourcePersonId===p.id):null;
  const peerChapter=independentLife && ['ordinary','vocation'].includes(scene.nodeId)?` Their own present chapter: ${independentLife.goal}`:'';
  const choices=scene.choices.map(choice=>choice.id==='ambition' && scene.nodeId==='ordinary'?{...choice,text:`${choice.text} I am especially drawn to ${pursuit}.`,effect:{...choice.effect,fact:'personal_ambition'}}:choice);
  return {...scene,body:`${scene.body}\n\n${style} ${value}${heritage}${culture}${remembered}${actualPreferences}${peerChapter}`,choices};
}

function livingPersonScene(state,p) {
  const person=p.source,topic=`society-${person.stage}-${person.status}-${state.age || 0}`;
  if(seen(state,p,topic))return null;
  const memory=person.memories.at(-1);
  const role=person.role==='customer'?`“An invoice is a small part of a household. I still remember what happened after yours.”`:person.role==='colleague'?`“The work we share is part of my life. I need its next chapter to have room for my own name.”`:`“People who have known each other for decades can forget how it feels to arrive.”`;
  return {nodeId:'society',topic,title:'A life on the other side of the table',body:`${p.name} has chosen ${person.profession.toLowerCase()} work${person.status==='retired'?', and now a life beyond paid shifts':person.status==='independent'?' behind a door bearing their own name':''}. ${role} Their present ambition: ${person.goal}${memory?` One particular memory remains: ${memory}`:''}`,choices:[
    sceneChoice('hear','Ask what has changed in their own life','Listen to this person, without choosing their profession or household for them.','Tell me what has changed since we last had time to sit together.','Thank you. I want my life to be something you ask about, not only something useful to your plans.',{bond:4,memory:'You asked how my own life had changed.'}),
    sceneChoice('method','Discuss the work without claiming their methods','Share professional respect; no skill or money appears for opening a thread.','What part of the work feels most like your own?','The part I learned by listening to someone whose name was missing from the account. I want to keep theirs beside mine.',{bond:3,fact:'professional_goal',memory:'You respected the part of my work that belongs to my own judgment.'}),
    sceneChoice('choice','Affirm that their next chapter is theirs','Keep a connection while recognizing that departure or a new ambition can be freely chosen.','You do not have to stay the person I first met. I would like to know who you become.','Then let us speak again after I have tried. A promise like that leaves room to breathe.',{bond:5,memory:'You left room for me to change instead of making friendship a debt.'}),
  ]};
}

export function initializeConversations(state) {
  for(const p of (state.life?.people||[]).slice(0,6))if(!p.motiveProfile)p.motiveProfile=p.familyRole?'family':p.id==='rival'?'rival':p.id==='fellow'?'ambitious':p.id==='river'?'keeper':'colleague';
  if (!state.conversations) state.conversations = {threads:{},seen:[],pending:null,relationships:{},sequence:0};
}

function contactSummary(state,p) {const study=state.progression?.mentorHistory?.[p.id]||Object.entries(state.progression?.mentors||{}).filter(([,m])=>m.id===p.id).map(([classId,m])=>({...m,classId}))[0];return {
    ...(study?{mentorStudy:{classId:study.classId,met:study.met,lessons:study.lessons}}:{}),
    id:p.id,name:p.name,kind:p.kind,...(p.recordedDeath?{recordedDeath:true,deathDay:p.deathDay}:{}),...(p.retired?{retired:true,retiredDay:p.retiredDay,ageAtRetirement:p.ageAtRetirement,availabilityReason:p.availabilityReason,successorId:p.successorId,successorName:p.successorName}:{}),...(p.commitmentOnly?{commitmentOnly:true}:{}),...(p.roomId?{roomId:p.roomId}:{}),...(p.population?{population:true}:{}),voice:voiceProfile(state,p).label,role:p.familyRole || p.role,age:p.age,bond:Math.round(p.kind==='extra'?(state.conversations?.relationships?.[p.id]?.bond??p.bond):p.bond),description:(p.population?p.description:state.narrativeEdition===30?`${p.name} is ${p.familyRole?'part of your family':p.role||'someone you know'}.`:p.description)+(state.narrativeEdition!==30&&characterDetail(p)?` ${characterDetail(p).replace(/^./,c=>c.toUpperCase())}.`:''), ...(p.bornDay!==undefined?{bornDay:p.bornDay}:{}),...(p.pronouns?{pronouns:p.pronouns}:{}), ...(p.occupation?{occupation:p.occupation}:{}),
    unread:(state.conversations?.threads?.[p.id] || []).filter(m=>m.age>=3&&m.speaker!=='hero' && !state.conversations?.seen?.includes(`read:${m.id}`)).length,
    ...(p.appearance?{appearance:p.appearance}:{}),...(p.locationId?{locationId:p.locationId}:{}),...(p.familyRole?{familyRole:p.familyRole}:{}),
    ...(p.kind==='social'?{compatibility:compatibilityView(state,p.source)}:{}),
    ...(state.characterDialogueVersion===28?{concern:personalConcern(state,p)?.summary||null,boundary:personalReadiness(state,p.id)}:{}),
  };}
export function upgradeDialogueEdition(state){
 const p=state.conversations?.pending;if(!p)return;
 if(LEVY_NODES.includes(p.nodeId))return;
 const who=contact(state,p.personId);if(!who){state.conversations.pending=null;return;}
 const scene=groundedDialogue(state,who,{relationship:state.conversations?.relationships?.[who.id]||who.source||{bond:who.bond}});
 state.conversations.pending={personId:who.id,nodeId:scene.nodeId,topic:scene.topic,replies:choicesForSave(scene.choices),snapshot:structuredClone(scene)};
 const t=state.conversations.threads[who.id]||[];if(t.length)t[t.length-1].text=scene.body;
}
export function getContacts(state) {return allContacts(state).filter(p=>p.available!==false&&!p.commitmentOnly && (state.age || 0)>=p.minAge).map(p=>contactSummary(state,p));}

export function rememberedContacts(state) {
 const originActors=Object.values(state.familyOrigins?.run?.cast||{}).map(p=>p?.id);
 const workActors=new Set([...originActors,...(state.rpg?.factions||[]).flatMap(f=>f.firstMission?[...Object.values(f.firstMission.cast||{}).map(p=>p.id),...(f.firstMission.custody||[]).flatMap(h=>[h.fromId,h.to?.id]),...(f.firstMission.evidence||[]).flatMap(e=>e.actorIds||[])]:[])]);
 const mentors=new Set([...classView(state).callings.filter(c=>c.mentor?.met).map(c=>c.mentor.id),...Object.values(state.progression?.mentorHistory||{}).filter(m=>m.met||m.lessons).map(m=>m.id)]);
 return allContacts(state).filter(p=>{
  const r=p.kind==='extra'?state.conversations?.relationships?.[p.id]||p.source:p.source;
  return workActors.has(p.id)||(state.stories?.arcs||[]).some(a=>a.personId===p.id&&a.choices?.length)||mentors.has(p.id)||state.conversations?.meetings?.[p.id]||state.conversations?.pending?.personId===p.id||(state.conversations?.threads?.[p.id]||[]).some(m=>m.speaker==='hero')||p.familyRole||p.kind==='companion'&&p.source?.recruited||r?.memories?.length||r?.knownFacts?.length;
 }).map(p=>{const r=p.kind==='extra'?state.conversations?.relationships?.[p.id]||p.source:p.source;return {...contactSummary(state,p),available:p.available!==false,memories:structuredClone(r?.memories||[]),knownFacts:structuredClone(r?.knownFacts||[])};});
}

export function getThread(state,personId) {
  if(observationalInfancy(state))return {messages:[],replies:[],pending:false};
  const p = allContacts(state).find(p=>p.id===personId), pending = state.conversations?.pending;
  const messages = p ? (state.conversations?.threads?.[personId] || []).filter(message=>message.age>=3).map(message=>({...message,speakerName:message.speaker==='hero'?state.hero?.name || 'You':p.name})) : [];
  return {messages,replies:pending?.personId===personId?pending.replies.map(reply=>({...reply,traitPreview:['yard_conversation','tournament_rival',...LEVY_NODES].includes(pending.nodeId)?'':personalityImpactText(state,{kind:'dialogue',eventId:pending.nodeId,id:reply.id})})):[],pending:Boolean(pending?.personId===personId)};
}

export function dialogueActions(state) {
  if (observationalInfancy(state)||!state.conversations || state.event || state.battle || state.phase==='retired') return [];
  return allContacts(state).filter(p=>p.available!==false&&!p.commitmentOnly && (state.age || 0)>=p.minAge).flatMap(p=>{
    const pending = state.conversations.pending;
    const scene = pending ? null : selectScene(state,p);
    const reason = pending && pending.personId!==p.id ? 'Finish your current conversation first.' : !pending && !scene ? (state.narrativeEdition===30?'You have caught up for today. Come back another day.':'You have shared this year’s ordinary conversation. Return after a new birthday or an important change.') : null;
    const remote=state.worldServicesVersion===1&&(p.locationId!==state.locationId||p.roomId&&p.roomId!==(state.cartography?.interior?.roomId||'gate')||state.cartography?.offsite||state.cartography?.pending||state.dungeon||state.maze||state.timeline?.journey);
    if(remote)return [];
    const normal={id:`talk_${p.id}`,label:pending?.personId===p.id?`Continue with ${p.name}`:`Speak with ${p.name}`,description:p.locationId===state.locationId?'Sit together and exchange a few words. Your reply will matter to this person.':'Send a letter or meet when your paths cross. This is a fantasy correspondence, with no automatic sharing of confidences.',days:0,cost:0,group:'Conversations',...(reason?{disabledReason:reason}:{})};
    const quest=state.narrativeEdition!==30&&!pending&&state.stories&&state.age>=18?selectScene(state,p,{mode:'quest'}):null;
    const confide=state.narrativeEdition===30&&state.hero.condition&&state.age>=16&&p.age>=16&&!knowledge(p).includes('condition_'+state.hero.condition.type)&&!pending?{id:'confide_'+p.id,label:`Tell ${p.name} about your condition`,description:'A private conversation. Only this person learns what you choose to tell them.',days:0,cost:0,group:'Conversations'}:null;
    const levy=levyActions(state,p).filter(a=>!allContacts(state).some(q=>q.id===a.id.slice(5)));
    return [normal,...levy,...(confide?[confide]:[]),...(quest? [{id:`talk_quest_${p.id}`,label:`Discuss ${quest.title.toLowerCase()} with ${p.name}`,description:'Choose this topic explicitly. Ordinary company remains available while quests and callings are unresolved.',days:0,cost:0,group:'Quest correspondence'}]:[])];
  });
}

export function applyDialogueAction(state,id,ctx={}) {
  if(observationalInfancy(state))return false;
  if(typeof id==='string'&&id.startsWith('confide_')){const p=contact(state,id.slice(8));if(!p||p.locationId!==state.locationId||p.roomId&&p.roomId!==(state.cartography?.interior?.roomId||'gate')||state.cartography?.offsite||state.cartography?.pending||state.timeline?.journey||state.dungeon||state.maze||state.event||state.battle||state.conversations.pending||state.age<16||p.age<16||!state.hero.condition)return true;const type=state.hero.condition.type;addMessage(state,p,'hero',`I need to tell you something. I have become a ${type==='vampire'?'vampire':'werewolf'}.`);addMessage(state,p,p.id,'Thank you for telling me. What help would you like?');applyEffect(state,p,{text:'I trusted you with this.',effect:{condition:true,bond:2,memory:'You trusted me with your condition.'}},ctx);const m=state.conversations.meetings ||= {},old=m[p.id];if(old||Object.keys(m).length<512)m[p.id]={locationId:state.locationId,firstDay:old?.firstDay??state.day,lastDay:state.day};state.notice=`You tell ${p.name} about your condition.`;return true;}
  if (typeof id!=='string' || !id.startsWith('talk_')) return false;
  const levyAction=/^talk_levy_(household|return)_([a-z][a-z0-9_-]{0,79})$/.exec(id),levy=levyAction&&!allContacts(state).some(p=>p.id===id.slice(5))?levyAction:null;
  const mode=id.startsWith('talk_quest_')?'quest':'personal';
  const p = contact(state,levy?levy[2]:id.slice(mode==='quest'?11:5));
  if (!p) return false;
  if(state.worldServicesVersion===1&&(p.locationId!==state.locationId||state.cartography?.offsite||state.cartography?.pending||state.dungeon||state.maze||p.roomId&&p.roomId!==(state.cartography?.interior?.roomId||'gate')||state.timeline?.journey))return true;
  if (!state.conversations || state.event || state.battle || state.phase==='retired' || state.conversations.project) return true;
  if (state.conversations.pending) { if (state.conversations.pending.personId===p.id) markRead(state,p); return true; }
  if(!state.conversations.threads[p.id]&&Object.keys(state.conversations.threads).length>=512){state.notice='Your relationship book is full.';return true;}
  markRead(state,p);
  const scene = levy?levyScene(state,p,levy[1]):selectScene(state,p,{mode});
  if (!scene) {state.notice=`You and ${p.name} have already spoken about this year’s ordinary worries. New birthdays and important changes bring new things to discuss.`;return true;}
  if(p.locationId===state.locationId&&!state.cartography?.offsite&&!state.cartography?.pending&&!state.timeline?.journey&&!state.dungeon&&!state.adventuring?.expedition&&!state.rpg?.expedition&&!state.justice?.prison){
    const meetings=state.conversations.meetings ||= {},old=meetings[p.id];
    if(old||Object.keys(meetings).length<512)meetings[p.id]={locationId:state.locationId,firstDay:old?.firstDay??state.day,lastDay:state.day};
  }
  addMessage(state,p,p.id,scene.body);
  state.conversations.pending = {personId:p.id,nodeId:scene.nodeId,topic:scene.topic,replies:choicesForSave(scene.choices),...(LEVY_NODES.includes(scene.nodeId)?{levyDay:state.day}:{}),...(['personal_v25_motive','voice_v28','person_v29','person_v30','yard_conversation','research_recall','tournament_rival',...LEVY_NODES].includes(scene.nodeId)?{snapshot:structuredClone(scene)}:{})};
  markRead(state,p);
  state.notice = `${scene.title} — ${p.name} is waiting for your reply.`;
  return true;
}

export function replyToConversation(state,personId,replyId,ctx={}) {
  if(observationalInfancy(state))return false;
  const pending = state.conversations?.pending;
  if (!pending || pending.personId!==personId || state.event || state.battle) return false;
  const p = contact(state,personId);
  if(LEVY_NODES.includes(pending.nodeId)&&pending.replies.some(r=>r.id===replyId)&&(!p||!levyEligible(state,p,pending.nodeId.slice(5))||!levyPendingAuthentic(state.conversations,state,p)||!(state.conversations.threads[personId]||[]).some(m=>m.speaker===personId&&m.text===pending.snapshot.body))){state.conversations.pending=null;state.notice='This exact person or circumstance is no longer available. The saved exchange remains in your records; no spoken reply, disclosure, acknowledgement or reward was made.';return true;}
  if(!p&&pending.replies.some(r=>r.id===replyId)&&allContacts(state).some(who=>who.id===personId&&who.available===false)){state.conversations.pending=null;state.notice='This exact person cannot currently take part. The earlier authored exchange remains in your records; no reply, promise, reward or new memory was made.';return true;}
  if(pending.snapshot?.followUp&&(!p||!followUpAvailable(state,p))){
    state.conversations.pending=null;state.notice='This person is not available to return to that conversation. No reply or promise was made.';return true;
  }
  if(pending.nodeId==='tournament_rival'&&(!p||!tournamentRecognitionEligible(state,p))){state.conversations.pending=null;state.notice='This exact person is not here to discuss the local card. No reply, promise or reward was made.';return true;}
  if(pending.nodeId==='yard_conversation'&&(!p||!yardConversationEligible(state,p))){
    state.conversations.pending=null;state.notice='This person is not here to discuss the bout. The conversation can wait.';return true;
  }
  if(pending.nodeId==='research_recall'&&(!p||!researchConversationEligible(state,p))){state.conversations.pending=null;state.notice='This exact recipient is not here to return to the folio. No spoken reply or new memory was claimed.';return true;}
  if (!p || !pending.replies.some(reply=>reply.id===replyId)) return false;
  const scene = selectScene(state,p);
  if (!scene || scene.nodeId!==pending.nodeId || scene.topic!==pending.topic) {
    state.conversations.pending = null;
    state.notice = 'The situation changed before this conversation was finished. Speak again when you are ready.';
    return true;
  }
  const choice = scene.choices.find(choice=>choice.id===replyId);
  if (!choice) return false;
  addMessage(state,p,'hero',choice.text);
  addMessage(state,p,p.id,choice.response);
  if(LEVY_NODES.includes(scene.nodeId))recordLevyReply(state,p,scene,choice);
  else applyEffect(state,p,choice,ctx);
  recordConversationFollowUp(state,p,scene,choice);
  recordResearchConversation(state,p,scene,choice);
  if(scene.nodeId==='tournament_rival'){state.adultTournament.recognition.consumedDay=state.day;state.adultTournament.recognition.replyId=replyId;}
  if(scene.nodeId==='yard_conversation'){state.yardTournament.discussedIds ||= [];state.yardTournament.discussedIds.push(p.id);}
  if(!LEVY_NODES.includes(scene.nodeId)){
   if(state.narrativeEdition===30&&choice.id==='ask')reviewPersonalRepair(state,p.id);
   respectPersonalBoundaries(state);
  }
  if (choice.effect.censure) { p.source.active=false; state.flags.miraWithdrawn=true; }
  addSeen(state,tag(p.id,scene.topic));
  state.conversations.pending = null;
  markRead(state,p);
  state.notice = `${p.name}: “${choice.response}”`;
  (['yard_conversation','research_recall','tournament_rival',...LEVY_NODES].includes(scene.nodeId)?(ctx.journalLiteral||ctx.journal):ctx.journal)?.(`A conversation with ${p.name}`,`${scene.title}. You said: “${choice.text}” ${p.name} replied: “${choice.response}”`,'relationships');
  if(state.narrativeEdition===30&&state.journal?.length)state.journal.at(-1).narrativeEdition=30;
  if(!LEVY_NODES.includes(scene.nodeId))ctx.touchCampaign?.();
  return true;
}

export function onConversationAge(state,ctx={}) {
  if (!state.conversations||!personalCorrespondenceAllowed(state)) return;
  const age=state.age || 0;
  // A delayed hook must not send an old birthday as today's news.
  if(state.timeline?.mode==='birth'){
    const anniversary=(state.timeline.birthDay||0)+age*365;
    if(state.day<anniversary||state.day>anniversary+1)return;
  }
  const livedLetters=state.timeline?.contentVersion>=7;
  // A birthday does not make every acquaintance send the same greeting.
  // These letters mark a few chapters; ordinary news comes from actual events.
  if(livedLetters&&!([0,6,12,16,18,21,30].includes(age)||age>30&&age%10===0))return;
  for (const p of allContacts(state).filter(p=>p.available!==false && age>=p.minAge && (p.kind==='social' || p.id==='mira') && p.bond>=20)) {
    const topic=`birthday-letter-${age}`;
    if (seen(state,p,topic)) continue;
    addMessage(state,p,p.id,birthdayLetterText(state,p),{channel:'letter'});
    const letter=state.conversations.threads[p.id].at(-1);
    const known=p.kind==='social'||p.source?.recruited||state.conversations.meetings?.[p.id]||(state.conversations.threads[p.id]||[]).some(m=>m.speaker==='hero');
    if(known)receiveNotification(state,{kind:'letter',sourceId:letter.id,title:'A Letter from '+p.name,body:letter.text,personId:p.id});
    addSeen(state,tag(p.id,topic));
  }
}

// Conversation choices live in their own threads; they never masquerade as engine events.
export function dialogueEventIds() { return {}; }

export function validateConversations(value,state) {
  const plain = v => Boolean(v && typeof v==='object' && !Array.isArray(v) && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null));
  const text = (v,max=1000) => typeof v==='string' && v.length>0 && v.length<=max;
  const number = (v,max=1000000) => Number.isInteger(v) && v>=0 && v<=max;
  const safeId = id => text(id,80) && /^[a-z][a-z0-9_-]*$/.test(id) && !['constructor','prototype'].includes(id);
  const replyIds = {young_contact:['share','listen','space'],care:['comfort','wonder','quiet'],play:['share','explore','brave'],school:['study','magic','help'],school_friend:['kind','curious','honest'],growing:['martial','arcane','quiet'],mentor:['notes','ethics','boundary'],ordinary:['listen','ambition','disagree'],household:['support','story','duty'],notes:['share','release'],damage:['refuge','listen','rebuild'],ending:['home','service','wander'],confidence:['confide','private'],research:['consent','question'],fate:['share','ordinary','careful'],family:['ask','belong','future'],sibling:['share','curious','space'],meal:['hearty','plant','sweet','spiced'],vocation:['purpose','balance','private'],society:['hear','method','choice']};
  for(const story of ORDINARY_STORIES)replyIds[`ordinary_v12_${story.id}`]=['question','ambition','boundary','pressure'];
  for(const story of PERSONAL_TOPICS)replyIds[`personal_v14_${story[0]}`]=['ask','share','differ','pressure'];
  replyIds.voice_v28=['listen','share','tease','leave'];
  replyIds.person_v29=['ask','share','boundary','leave'];
  replyIds.person_v30=['ask','share','tease','leave'];
  replyIds.tournament_rival=['review','perspective','quiet','leave'];
  replyIds.yard_conversation=['review','reflect','quiet','leave'];
  replyIds.research_recall=['source','limit','thanks','leave'];
  replyIds.levy_reaction=['question','opinion','subject','leave'];
  replyIds.levy_household=['honest','limited','private','leave'];
  replyIds.levy_return=['ask','humor','savor','leave'];
  replyIds.personal_v25_motive=['listen','bargain','pressure','leave'];
  replyIds.personal_v14_return=['listen','differ','boundary','pressure'];
  if(state&&state.age<18)for(const story of ORDINARY_STORIES)replyIds[`ordinary_v12_${story.id}`]=['question','ambition','boundary'];
  if (!plain(value) || !plain(value.threads) || Object.keys(value.threads).length>512 || !Array.isArray(value.seen) || value.seen.length>MAX_SEEN || !value.seen.every(x=>text(x,180)) || new Set(value.seen).size!==value.seen.length || !number(value.sequence,500000) || !plain(value.relationships) || Object.keys(value.relationships).length>512 || state&&!validateRelationshipRepairs(value,state)) return false;
  if(value.servicePeople!==undefined&&(!plain(value.servicePeople)||Object.keys(value.servicePeople).length>512||!Object.entries(value.servicePeople).every(([id,p])=>safeId(id)&&plain(p)&&p.id===id&&text(p.name,100)&&text(p.role,160)&&number(p.age,5000)&&Number.isInteger(p.baseAge)&&p.baseAge>=-5000&&p.baseAge<=5000&&(p.serviceEndDay===undefined||number(p.serviceEndDay,10000000))&&text(p.locationId,80)&&(!state||state.world.locations.some(l=>l.id===p.locationId))&&(p.appearance===undefined||isCanonicalAppearance(p.appearance)))))return false;
  if(value.meetings!==undefined&&(!plain(value.meetings)||Object.keys(value.meetings).length>512||!Object.entries(value.meetings).every(([id,m])=>safeId(id)&&plain(m)&&text(m.locationId,80)&&number(m.firstDay)&&number(m.lastDay)&&m.lastDay>=m.firstDay&&(!state||m.lastDay<=state.day&&state.world.locations.some(l=>l.id===m.locationId)&&allContacts(state).some(p=>p.id===id)))))return false;
  const messageIds = new Set();
  for (const [id,thread] of Object.entries(value.threads)) {
    if (!safeId(id) || !Array.isArray(thread) || thread.length>MAX_MESSAGES) return false;
    if (state && !allContacts(state).some(p=>p.id===id)) return false;
    for (const message of thread) {
      if (!plain(message) || !/^letter-\d+$/.test(message.id) || messageIds.has(message.id) || ![id,'hero'].includes(message.speaker) || !text(message.text,2200) || !number(message.day) || !number(message.age,5000)) return false;
      if(message.channel!==undefined&&!['spoken','letter','unknown'].includes(message.channel))return false;
      if(message.authoredDay!==undefined&&(!number(message.authoredDay)||message.authoredDay>message.day))return false;
      if(message.receivedDay!==undefined&&(!number(message.receivedDay)||message.receivedDay<message.day||state&&message.receivedDay>state.day))return false;
      if (Number(message.id.slice(7))>value.sequence) return false;
      if (state && (message.day>state.day || message.age>state.age)) return false;
      messageIds.add(message.id);
    }
  }
  for (const [id,record] of Object.entries(value.relationships)) {
    if (!safeId(id) || !plain(record) || !number(record.bond,100) || ![record.memories,record.knownFacts].every(a=>Array.isArray(a)&&a.length<=60&&a.every(x=>text(x,1000)))) return false;
    if (state && !allContacts(state).some(p=>p.id===id && p.kind==='extra')) return false;
  }
  if (value.pending!==null) {
    const p=value.pending;
    if (!plain(p) || !safeId(p.personId) || !Object.hasOwn(replyIds,p.nodeId) || !text(p.topic,100) || !Array.isArray(p.replies) || p.replies.length!==replyIds[p.nodeId].length || new Set(p.replies.map(r=>r.id)).size!==p.replies.length || !p.replies.every(r=>plain(r)&&replyIds[p.nodeId].includes(r.id)&&text(r.label,180)&&text(r.description,500))) return false;
    if(['yard_conversation','tournament_rival',...LEVY_NODES].includes(p.nodeId)&&(!Array.isArray(p.snapshot?.choices)||p.snapshot.choices.some(c=>!plain(c.effect)||Object.keys(c.effect).length)))return false;
    if(['personal_v25_motive','voice_v28','person_v29','person_v30','yard_conversation','research_recall','tournament_rival'].includes(p.nodeId)&&(!plain(p.snapshot)||p.snapshot.nodeId!==p.nodeId||p.snapshot.topic!==p.topic||!text(p.snapshot.body,4000)||!text(p.snapshot.title,180)||!Array.isArray(p.snapshot.choices)||p.snapshot.choices.length!==4||!p.snapshot.choices.every(c=>plain(c)&&text(c.text,1000)&&text(c.response,1800)&&plain(c.effect)&&(c.effect.memory===undefined||text(c.effect.memory,1000))&&Object.keys(c.effect).every(k=>['bond','memory','agency','pause',...(p.nodeId==='person_v29'?['review']:[])].includes(k))&&(c.effect.bond===undefined||Number.isInteger(c.effect.bond)&&Math.abs(c.effect.bond)<=20)&&(c.effect.agency===undefined||['constrained','refusing','bargaining','withdrawn'].includes(c.effect.agency))&&(c.effect.pause===undefined||typeof c.effect.pause==='boolean')&&(c.effect.review===undefined||typeof c.effect.review==='boolean'))))return false;
    if (state) {
      if(!levyPendingAuthentic(value,state,allContacts(state).find(who=>who.id===p.personId)))return false;
      const who=contact(state,p.personId), scene=who && selectScene({...state,conversations:value},who);
      if(p.nodeId==='tournament_rival'){const original=allContacts(state).find(w=>w.id===p.personId);if(!original||JSON.stringify(p.snapshot)!==JSON.stringify(tournamentRecognition(state,original,{historical:true})))return false;}
      if(who){if (!scene || scene.nodeId!==p.nodeId || scene.topic!==p.topic || JSON.stringify(choicesForSave(scene.choices))!==JSON.stringify(p.replies)) return false;}
      else if(!allContacts(state).some(who=>who.id===p.personId&&who.available===false))return false;
    }
  }
  if(state&&!validateResearchPendingConversation(value,state))return false;
  if(state&&!validateLevyAftermath(value,state))return false;
  if(!validateConversationFollowUps(value,state,state?new Set(allContacts(state).map(p=>p.id)):null))return false;
  return true;
}
