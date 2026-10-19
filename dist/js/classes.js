import { familyResidence, originFamilyMember } from './household-residence.js';
import { generateCharacter } from './characters.js';
import { currentMentorNpc, canonicalMentorId } from './npc-continuity.js';
import { seededRoll, generatePersonName } from './world.js';

const calling = (id, name, role, description, skills, locationId, ability, trial) => Object.freeze({ id, name, role, description, skills: Object.freeze(skills), minAge: 18, locationId, ability, trial });
export const CLASS_CATALOG = Object.freeze([
  calling('guardian', 'Guardian', 'warrior', 'Stand between danger and people who cannot withstand it.', { weapons: 3, defense: 3 }, 'camp', 'Intercept: brace with a stronger ward and protect the party.', 'A wagon overturns during the evacuation drill. Hold the shield line while the apprentices carry an injured traveler clear.'),
  calling('berserker', 'Berserker', 'warrior', 'Channel fierce strength without surrendering responsibility for it.', { weapons: 5, survival: 2 }, 'mountain', 'Reckless cleave: trade health for force; a battle cry unsettles enemies.', 'Cross the wind-scoured ridge carrying the rescue rope. When anger rises, choose where it ends: at the threat, never at the person beside you.'),
  calling('knight', 'Knight', 'warrior', 'Practice disciplined combat and answer for those under your protection.', { weapons: 4, defense: 4, persuasion: 2 }, 'citadel', 'Challenge: weaken and mark a dangerous opponent.', 'Negotiate passage for a convoy and take the exposed position yourself. Your mentor asks whom your authority is meant to serve.'),
  calling('paladin', 'Paladin', 'warrior', 'Earn sacred gifts through a visible oath of mercy and protection.', { weapons: 5, devotion: 3 }, 'city', 'Sacred judgment: sacred attacks and an oath-bound protective tactic.', 'Escort frightened pilgrims across a disputed boundary. Promise to protect the vulnerable and never bind an unwilling soul.'),
  calling('healer', 'Healer', 'mage', 'Join magical understanding with consent and practical patient care.', { arcana: 3, scholarship: 3 }, 'brook', 'Mend & ward: restore an ally’s health and raise a protective ward.', 'Treat a fevered patient under supervision. Explain the spell, ask permission, and stay until the patient can drink unaided.'),
  calling('elementalist', 'Elementalist', 'mage', 'Shape unstable forces through observation rather than spectacle alone.', { arcana: 5, scholarship: 2 }, 'tower', 'Elemental burst: burn enemies and break a ward.', 'Stabilize a cracked storm vessel while your mentor maintains the outer circle. Release its lightning into the grounding stones, away from the homes below.'),
  calling('druid', 'Druid', 'mage', 'Listen to living places and keep the bargains that let them flourish.', { arcana: 3, survival: 4, devotion: 2 }, 'forest', 'Entangling roots: restrain a foe; restorative growth supports an ally.', 'Follow the damaged stream to its source and mend its channel without uprooting the nesting trees. The grove recognizes the care you take.'),
  calling('necromancer', 'Necromancer', 'mage', 'Study the dead as persons with wishes, histories, and disputed rights.', { arcana: 5, scholarship: 3 }, 'ruin', 'Grave servant: drain an enemy, weaken its next attack and gain a protective ward.', 'Prepare a named memorial circle. A willing ancestor answers; receive their testimony and release them when they ask to leave.'),
  calling('thief', 'Thief', 'rogue', 'Read a guarded room, find an opening, and decide what is worth taking.', { stealth: 3, persuasion: 2 }, 'city', 'Feint & pilfer: disarm an enemy and steal its ward.', 'Recover a planted token from a watched counting house. Your teacher sets a condition: take the token alone and leave the workers unharmed.'),
  calling('ranger', 'Ranger', 'rogue', 'Guide others through wild country and make a dangerous road knowable.', { survival: 4, weapons: 2, stealth: 2 }, 'forest', 'Marked shot: expose a target; a pinning tactic weakens its next strike.', 'Track a missing courier through rain, mark a safe return trail, and bring them home. The proof is the person beside you, not a trophy.'),
  calling('assassin', 'Assassin', 'rogue', 'Master precision and discretion, with responsibility for every commission.', { stealth: 5, survival: 3 }, 'city', 'Venom strike: precise attacks and a bleeding tactic that marks an opening.', 'Enter a guarded archive and recover evidence of a planned murder. Your initiation needs patience and a clean escape; killing is not a requirement.'),
  calling('bard', 'Bard', 'rogue', 'Keep memory alive, move a divided crowd, and give companions courage.', { persuasion: 4, scholarship: 2, stealth: 1 }, 'coast', 'Rallying verse: restore party magic and ward; dissonance weakens a foe.', 'Learn the verses both sides of a harbor dispute have forgotten. Sing them back together, then help the injured singer finish the final line.'),
]);

const findClass = id => CLASS_CATALOG.find(c => c.id === id);
const SERVICE_TASKS = Object.freeze({
 guardian:'Lead an evacuation practice and repair the shield shelter with local helpers.',
 berserker:'Teach restraint and secure rescue ropes on the wind-scoured ridge.',
 knight:'Escort a civilian convoy and hear the drivers’ account of the road.',
 paladin:'Provide a meal and a safe escort to pilgrims who ask for your protection.',
 healer:'Work a supervised clinic rota with consenting patients and document their chosen care.',
 elementalist:'Inspect and ground the settlement’s storm wards before the next squall.',
 druid:'Repair the stream’s public crossing while preserving the grove’s nesting trees.',
 necromancer:'Copy willing ancestors’ testimony into named records and release every speaker.',
 thief:'Recover lost wages from a planted exercise cache and return them to the named workers.',
 ranger:'Survey an accessible route and guide a household safely back to the settlement.',
 assassin:'Recover evidence of a threatened household’s attackers without a lethal commission.',
 bard:'Rehearse a harbor memorial with the families whose names the song will carry.',
});
function mentorMemory(state,item,text,amount=0) {
 const relationships=state.conversations?.relationships;
 if (!relationships) return;
 const mentor=mentorFor(state,item);
 const record=state.life?.people?.find(p=>p.id===mentor.id)||(relationships[mentor.id] ||= {bond:40,memories:[],knownFacts:[]});
 record.bond=Math.max(0,Math.min(100,record.bond+amount));
 if(!record.memories.includes(text))record.memories.push(text);
 record.memories=record.memories.slice(-30);
}
const enableNextTrial = state => { if(state.progression?.nextTrialVersion===1) {state.progression.trialVersion=1;delete state.progression.nextTrialVersion;} };
const livingPlace = p => p && !['destroyed', 'evacuated'].includes(p.status);
const availableLocation = (state, preferred) => {
  const places = state.world?.locations || [];
  const priorities = [preferred, 'sanctuary', 'camp', 'brook', 'city', 'home', 'tower', 'forest', 'ruin'];
  return priorities.map(id => places.find(p => p.id === id)).find(livingPlace)?.id || places.find(Boolean)?.id || preferred;
};
const mentorName = (state, id) => {
  const existing = state.world?.mentors?.find(p => p.specialization === id);
  if (existing?.name) return existing.name;
  if (state.revision >= 5 && state.timeline?.roleplayVersion===1) return generatePersonName(state.seed,`calling-mentor-${id}`);
  const names = ['Aster Vale', 'Toren Ash', 'Sable Reed', 'Neris Bell', 'Iona Fen', 'Merrin Grey', 'Elowen Moss', 'Dame Corin', 'Hadrin Clay', 'Ysra Thorn', 'Sorin Tide', 'Vessa Wren', 'Maelin Frost', 'Dara Flint', 'Quill Rowan', 'Eren Briar'];
  return names[(seededRoll(state.seed, 'calling-mentor-roster', names.length) + CLASS_CATALOG.findIndex(item => item.id === id)) % names.length];
};
export const mentorFor = (state, item) => {
  const saved = state.progression?.mentors?.[item.id],publicMentor=currentMentorNpc(state,item.id),id=publicMentor?.id||saved?.id||`calling-mentor-${item.id}`;
  const privateRecord=saved?.id===id?saved:null,life=state.life?.people?.find(p=>p.id===id),remembered=state.socialLife?.met?.[id]||state.conversations?.servicePeople?.[id],family=state.family?.members?.find(m=>m.personId===id);
  const legacyAge=30+seededRoll(state.seed,`mentor-age-${item.id}`,18)+Math.floor((state.day||0)/365);
  const p=publicMentor||{...generateCharacter(state.seed,id,{role:item.id,age:30}),id,name:saved?.name||mentorName(state,item.id),age:legacyAge,baseAge:legacyAge-Math.floor((state.day||0)/365),locationId:saved?.locationId||item.locationId};
  const identity=life||remembered,resolvedLocation=life?(originFamilyMember(state,life)||life.id===state.life.partnerId?familyResidence(state,life):life.locationId||availableLocation(state,p.locationId)):availableLocation(state,p.locationId);
  return {...p,...Object.fromEntries(['name','appearance','pronouns','disposition','character'].filter(k=>identity?.[k]!==undefined).map(k=>[k,identity[k]])),role:item.name+' Mentor',
    age:life?.age??p.age,...(life?.bornDay!==undefined?{baseAge:life.age-Math.floor((state.day||0)/365)}:{}),locationId:resolvedLocation,...(life?{roomId:originFamilyMember(state,life)||life.id===state.life.partnerId?'homes':life.roomId}:{}),met:Boolean(privateRecord?.met),lessons:privateRecord?.lessons||0,
    available:life?.alive!==false&&(!family||family.availability==='present'),npcSlot:{kind:'mentor',classId:item.id,siteId:publicMentor?.locationId||resolvedLocation},
  };
};
const actorSummary=m=>({id:m.id,name:m.name,locationId:m.locationId});
const serviceSupervisor=(state,item,r)=>r?.supervisor||{id:r?.mentorId||`calling-mentor-${item.id}`,name:r?.mentorName||state.progression?.mentorHistory?.[`calling-mentor-${item.id}`]?.name||mentorName(state,item.id),locationId:r?.locationId||item.locationId};
export function capturePendingMentor(state){
 if(state.progression?.pendingCalling&&!state.progression.pendingMentor){const item=findClass(state.progression.pendingCalling);if(item)state.progression.pendingMentor=actorSummary(mentorFor(state,item));}
}

const prerequisites = (state, item) => Object.entries(item.skills).map(([skill, required]) => ({ skill, required, current: state.hero?.skills?.[skill] || 0, met: (state.hero?.skills?.[skill] || 0) >= required }));
const barrier = state => Boolean(state.flags?.legacyMentorTrial&&!['recognized','withdrawn'].includes(state.flags.legacyMentorTrial.stage)||state.event || state.battle || state.conversations?.pending || state.dungeon?.pendingRoom || state.phase === 'retired');
const reasonFor = (state, item, { requireMentor = true } = {}) => {
  if ((state.age || 0) < item.minAge) return `An adult initiation requires age ${item.minAge}.`;
  if (barrier(state)) return 'Finish the current moment before beginning an initiation.';
  const requirements = prerequisites(state, item).filter(r => !r.met);
  if (requirements.length) return `Requires ${requirements.map(r => `${r.skill} ${r.required} (you have ${r.current})`).join(', ')}.`;
  const mentor = mentorFor(state, item);
  if(mentor.available===false)return `${mentor.name} cannot currently take part; their earlier teaching remains recorded.`;
  if (state.locationId !== mentor.locationId) return `Find ${mentor.name} in ${state.world?.locations?.find(p => p.id === mentor.locationId)?.name || mentor.locationId}.`;
  if (requireMentor && !mentor.met) return `Meet ${mentor.name} before asking for initiation.`;
};
const note = (state, ctx, title, text) => { state.notice = text; ctx?.journal?.(title, text, 'calling'); };

export function initializeProgression(state, { migration = false } = {}) {
  if (!state.progression) state.progression = { learnedClassIds: [], pendingCalling: null, mentors: {}, ...(!migration && state.revision>=5 ? {trialVersion:1,initiations:[]} : {}) };
  const progression = state.progression;
  for (const item of CLASS_CATALOG) if (!progression.mentors[item.id]) progression.mentors[item.id] = {
    id: `calling-mentor-${item.id}`, name: mentorName(state, item.id), locationId: availableLocation(state, item.locationId), met: false, lessons: 0,
  };
  // Legacy identities are recognized; migration never changes a path, gold, skills, or a pending scene.
  if (migration && findClass(state.hero?.specialization) && !progression.learnedClassIds.includes(state.hero.specialization)) progression.learnedClassIds.push(state.hero.specialization);
}

export function classView(state) {
  const learned = state.progression?.learnedClassIds || [];
  const callings = CLASS_CATALOG.map(item => {
    const mentor = mentorFor(state, item);
    const disabledReason = reasonFor(state, item);
    return { ...item, mentor, locationId: mentor.locationId, requirements: prerequisites(state, item), learned: learned.includes(item.id), active: state.hero?.specialization === item.id, eligible: !disabledReason, disabledReason, initiation:state.progression?.initiations?.find(r=>r.classId===item.id) || null, formation:state.fellowship?.formations?.[item.id]?structuredClone(state.fellowship.formations[item.id]):null, formationActionId:`fellowship_formation_${item.id}`, actionId: `calling_seek_${item.id}` };
  });
  return { active: findClass(state.hero?.specialization) || null, learned: CLASS_CATALOG.filter(item => learned.includes(item.id)), callings };
}

export function callingActions(state) {
  if (!state.progression || barrier(state)) return [];
  const actions = [];
  for (const item of CLASS_CATALOG) {
    const mentor = mentorFor(state, item), place = state.world?.locations?.find(p => p.id === mentor.locationId);
    const local = state.locationId === mentor.locationId;
    const learned = state.progression.learnedClassIds.includes(item.id);
    if (learned && state.hero.specialization !== item.id) actions.push({ id: `calling_switch_${item.id}`, label: `Practice as a ${item.name.toLowerCase()}`, description: `${item.ability} This becomes your one active combat calling; all learned callings stay in your history.`, days: 0, cost: 0, group: 'Earned callings', ...((state.age || 0) < 18 ? { disabledReason: 'Active advanced callings require adulthood.' } : {}) });
    const initiation=state.progression.initiations?.find(r=>r.classId===item.id);
    if (learned && initiation?.approach==='service' && initiation.fulfilledDay===null) {
      const promise=state.obligations?.find(o=>o.id===`calling_service_${item.id}`);
      const late=Boolean(promise?.missed),supervisor=serviceSupervisor(state,item,initiation),needsHandover=supervisor.id!==mentor.id;
      if(needsHandover)actions.push({id:`calling_handover_${item.id}`,label:`Ask ${mentor.name} to take over service supervision`,description:`${supervisor.name} remains the original initiation mentor. Explicitly agree to ${mentor.name} supervising the unfinished six-day service; preserve the original deadline and work, with no time, fee, reward or transferred private relationship.`,days:0,cost:0,group:'Calling commitments',...(!local||mentor.available===false?{disabledReason:mentor.available===false?'The current mentor cannot take part.':`Meet ${mentor.name} in ${place?.name||mentor.locationId}.`}:{})});
      actions.push({id:`calling_service_${item.id}`,label:`${late?'Return to':'Keep'} your ${item.name.toLowerCase()} service promise`,description:`${SERVICE_TASKS[item.id]} Six actual days complete the remembered promise; gain ${late?3:8} mentor trust and 4 village standing.${late?' Its missed deadline remains in your history.':' The work is due on day '+promise?.dueDay+'.'}`,days:6,cost:0,group:'Calling commitments',...(needsHandover?{disabledReason:`First explicitly agree the supervision handover from ${supervisor.name} to ${mentor.name}.`}:mentor.available===false?{disabledReason:'The mentor cannot currently take part.'}:!local?{disabledReason:`Return to ${mentor.name} in ${place?.name || mentor.locationId}.`}:{})});
    }
    if (!local||mentor.available===false) continue;
    if (!mentor.met) actions.push({ id: `calling_meet_${item.id}`, label: `Meet ${mentor.name}, ${item.name.toLowerCase()} mentor`, description: `Ask about the ${item.name.toLowerCase()} discipline and its commitments. Your upbringing and current path do not exclude you.`, days: 1, cost: 0, group: 'Mentors & callings', ...((state.age || 0) < 16 ? { disabledReason: 'Formal mentorship opens at age 16.' } : {}) });
    if(learned)continue;
    const missing = prerequisites(state, item).filter(r => !r.met);
    if (mentor.met && missing.length) actions.push({ id: `calling_train_${item.id}`, label: `Practice with ${mentor.name}`, description: `Four days of supervised service advance ${missing[0].skill} by 1 toward ${item.name.toLowerCase()} initiation. Teaching is earned through service and costs no gold.`, days: 4, cost: 0, group: 'Mentors & callings', ...((state.age || 0) < 16 ? { disabledReason: 'Supervised calling practice opens at age 16.' } : {}) });
    actions.push({ id: `calling_seek_${item.id}`, label: `Seek ${item.name.toLowerCase()} initiation`, description: `${item.trial} Mentor: ${mentor.name} in ${place?.name || mentor.locationId}. ${item.ability}`, days: 2, cost: 0, group: 'Mentors & callings', ...(reasonFor(state, item) ? { disabledReason: reasonFor(state, item) } : {}) });
  }
  return actions;
}

export function applyCallingAction(state, id, ctx = {}) {
  if (typeof id !== 'string' || !id.startsWith('calling_')) return false;
  const match = /^calling_(meet|train|seek|switch|service|handover)_([a-z]+)$/.exec(id);
  const item = match && findClass(match[2]);
  if (!item) return false;
  if (!state.progression || barrier(state)) return true;
  const action = callingActions(state).find(a => a.id === id);
  if (!action || action.disabledReason) { state.notice = action?.disabledReason || 'This mentor is not available here.'; return true; }
  const savedMentor = state.progression.mentors[item.id];
  if(match[1]==='handover'){
    const r=state.progression.initiations?.find(r=>r.classId===item.id),from=serviceSupervisor(state,item,r),to=mentorFor(state,item);
    if(!r||r.fulfilledDay!==null||r.approach!=='service')return true;
    if(r.mentorId===undefined){r.mentorId=from.id;r.mentorName=from.name;}r.handovers ||= [];r.handovers.push({day:state.day,fromId:from.id,fromName:from.name,toId:to.id,toName:to.name,locationId:to.locationId});r.supervisor=actorSummary(to);savedMentor.met=true;
    note(state,ctx,'A named service supervision handover',`${from.name} remains the original ${item.name.toLowerCase()} initiation mentor. You and ${to.name} explicitly agree that ${to.name} will supervise the unfinished service. Its original deadline, terms and completed work remain; no fee, time, reward, confidence or private Bond transfers.`);
  } else if (match[1] === 'service') {
    const initiation=state.progression.initiations?.find(r=>r.classId===item.id);
    if(!initiation || initiation.approach!=='service' || initiation.fulfilledDay!==null) return false;
    const promise=state.obligations?.find(o=>o.id===`calling_service_${item.id}`);
    if(!promise)return false;
    const late=Boolean(promise.missed);initiation.fulfilledDay=state.day;
    ctx.finishObligation?.(promise.id);mentorMemory(state,item,`You completed your ${item.name.toLowerCase()} service: ${SERVICE_TASKS[item.id]}`,late?3:8);
    ctx.standing?.('villagers',4);
    if(item.id==='paladin'){ctx.finishObligation?.('order_service');ctx.finishObligation?.('oath_service');ctx.standing?.('order',5);}
    note(state,ctx,'A calling lived in ordinary work',`${mentorFor(state,item).name} records six days of actual service. ${SERVICE_TASKS[item.id]}${late?' You returned after the deadline; its earlier missed promise remains recorded.':''} Your profession and active calling remain your own.`);
  } else if (match[1] === 'meet') {
    savedMentor.met = true;
    savedMentor.locationId = mentorFor(state, item).locationId;
    note(state, ctx, `A ${item.name.toLowerCase()} mentor`, `${savedMentor.name} agrees to teach you. ${item.description} Initiation needs ${Object.entries(item.skills).map(([key,n])=>`${key} ${n}`).join(', ')} and adulthood; supervised service can help you prepare.`);
  } else if (match[1] === 'train') {
    const next = prerequisites(state, item).find(r => !r.met);
    if (!next) return true;
    state.hero.skills[next.skill] = next.current + 1;
    savedMentor.lessons = Math.min(10000, savedMentor.lessons + 1);
    ctx.earnExperience?.(8);
    note(state, ctx, 'A discipline practiced', `${savedMentor.name} sees you practice ${next.skill}. It reaches ${next.current + 1}; the lesson leaves your other learned skills intact.`);
  } else if (match[1] === 'switch') {
    state.hero.path = item.role; state.hero.specialization = item.id;
    note(state, ctx, 'A learned calling resumed', `You resume your ${item.name.toLowerCase()} practice. ${item.ability} Your other earned callings remain in your history; their combat gifts do not stack.`);
  } else {
    state.progression.pendingCalling = item.id;state.progression.pendingMentor=actorSummary(mentorFor(state,item));
    ctx.setEvent?.('calling_initiation', `The ${item.name.toLowerCase()} trial`, 'An earned calling', `${mentorFor(state,item).name} has watched your preparation. ${item.trial}\nThis is a choice about the discipline you intend to practice. Your livelihood, old friendships, and all trained skills continue.`, [
      { id: 'accept', label: `Complete the ${item.name.toLowerCase()} initiation`, description: `${item.ability}${item.id === 'paladin' ? ' Your oath of mercy and protection becomes a visible commitment.' : ''}` },
      ...(state.progression.trialVersion===1?[
        {id:'service',label:`Earn the ${item.name.toLowerCase()} calling and promise community service`,description:`Keep the same combat gifts and pledge six further days within 60 days: ${SERVICE_TASKS[item.id]} Completing the actual work builds mentor trust; the promise is recorded if missed.`},
        {id:'independent',label:'Earn the discipline while keeping an independent practice',description:`Keep the same combat gifts without an extra community-service deadline. Your mentor loses 5 trust and remembers your boundary.${item.id==='paladin'?' Your personal oath of mercy still applies.':''}`},
      ]:[]),
      { id: 'defer', label: 'Keep training, without making this commitment', description: 'Leave with your skills and mentor intact. You can return to seek initiation later.' },
    ]);
  }
  return true;
}

export function applyCallingChoice(state, eventId, choiceId, ctx = {}) {
  if (eventId !== 'calling_initiation') return false;
  if (!['accept','defer','service','independent'].includes(choiceId)) return false;
  if (['service','independent'].includes(choiceId) && state.progression?.trialVersion!==1) return false;
  const item = findClass(state.progression?.pendingCalling);
  if (!item) return true;
  const mentor=state.progression.pendingMentor||mentorFor(state,item),current=mentorFor(state,item);
  if (choiceId === 'defer') {
    state.progression.pendingCalling = null;delete state.progression.pendingMentor;enableNextTrial(state);
    note(state, ctx, 'A calling can wait', `You thank ${mentor.name} and leave the ${item.name.toLowerCase()} commitment for another day. Your preparation remains.`);
    return true;
  }
  // The engine has an event barrier while handling this choice; check concrete requirements directly.
  if ((state.age || 0) < item.minAge || prerequisites(state,item).some(r => !r.met) || mentor.id!==current.id||current.available===false||!current.met || state.locationId !== mentor.locationId) {
    state.notice = 'The initiation requirements are no longer met. Return to your mentor when you are ready.';
    state.progression.pendingCalling = null;delete state.progression.pendingMentor;
    return true;
  }
  if (!state.progression.learnedClassIds.includes(item.id)) state.progression.learnedClassIds.push(item.id);
  state.hero.path = item.role; state.hero.specialization = item.id;
  state.progression.pendingCalling = null;delete state.progression.pendingMentor;
  if(state.progression.trialVersion===1) {
    state.progression.initiations ||= [];
    state.progression.initiations.push({classId:item.id,approach:choiceId,day:state.day,locationId:state.locationId,fulfilledDay:null,mentorId:mentor.id,mentorName:mentor.name,supervisor:actorSummary(mentor)});
    if(choiceId==='service') {ctx.addObligation?.(`calling_service_${item.id}`,`Keep your ${item.name.toLowerCase()} community service promise`,60,`Return to ${mentorFor(state,item).name} for six days of actual service. ${SERVICE_TASKS[item.id]} A missed deadline remains in your history; late service brings less mentor trust.`);mentorMemory(state,item,`You earned your ${item.name.toLowerCase()} calling and promised a further six days of community service.`);}
    else if(choiceId==='independent')mentorMemory(state,item,`You earned the ${item.name.toLowerCase()} discipline but chose an independent practice instead of another service promise.`,-5);
    else mentorMemory(state,item,`You completed a supervised ${item.name.toLowerCase()} initiation and kept its ordinary commitments.`);
  }
  enableNextTrial(state);
  if (item.id === 'paladin') {
    state.flags ||= {};
    state.flags.oath ||= 'Protect the vulnerable; offer mercy; never bind an unwilling soul.';
    state.flags.oathType ||= 'protection';
    if (state.flags.oathBroken == null) state.flags.oathBroken = false;
    if (!state.obligations?.some(o => o.id === 'order_service' && !o.resolved)) ctx.addObligation?.('order_service', 'Serve the oathbound order', 60, 'Carry out a service to the vulnerable, or return to your order to discuss the commitment.');
  }
  if (item.id === 'necromancer') { state.flags ||= {}; state.flags.knowsAncestralRite = true; }
  ctx.earnExperience?.(12);
  note(state, ctx, `Earned calling: ${item.name}`, `${mentor.name} recognizes your ${item.name.toLowerCase()} initiation. ${item.trial} ${item.ability} You now fight as a ${item.role}; your earlier life remains your own.`);
  return true;
}

export function callingEventIds() { return { calling_initiation: ['accept','defer','service','independent'] }; }

export function validateProgression(value, state) {
  const plain = v => Boolean(v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null));
  const text = (v,n=100) => typeof v === 'string' && v.length > 0 && v.length <= n;
  const number = (v,max=10000) => Number.isInteger(v) && v >= 0 && v <= max;
  if (!plain(value) || !Array.isArray(value.learnedClassIds) || value.learnedClassIds.length > CLASS_CATALOG.length || new Set(value.learnedClassIds).size !== value.learnedClassIds.length || !value.learnedClassIds.every(id => Boolean(findClass(id)))) return false;
  if (!(value.trialVersion===undefined || value.trialVersion===1) || !(value.nextTrialVersion===undefined || value.nextTrialVersion===1)) return false;
  if(value.initiations!==undefined) {
    if(!Array.isArray(value.initiations) || value.initiations.length>CLASS_CATALOG.length || new Set(value.initiations.map(r=>r.classId)).size!==value.initiations.length)return false;
    for(const r of value.initiations) if(!plain(r) || !findClass(r.classId) || !value.learnedClassIds.includes(r.classId) || !['accept','service','independent'].includes(r.approach) || !number(r.day,2000000) || !text(r.locationId,80) || !(r.fulfilledDay===null || number(r.fulfilledDay,2000000)&&r.fulfilledDay>=r.day) || state && (r.day>state.day || r.fulfilledDay!==null&&r.fulfilledDay>state.day || !state.world.locations.some(p=>p.id===r.locationId) || r.approach==='service'&&!state.obligations?.some(o=>o.id===`calling_service_${r.classId}`)))return false;
  }
  const validActor=(a,classId)=>plain(a)&&Object.keys(a).every(k=>['id','name','locationId'].includes(k))&&canonicalMentorId(state,classId,a.id)&&text(a.name,80)&&text(a.locationId,80)&&(!state||state.world.locations.some(p=>p.id===a.locationId));
  const validHandovers=(rows,classId,originalId,startDay)=>Array.isArray(rows)&&rows.length<=3500&&rows.every((h,i)=>plain(h)&&Object.keys(h).every(k=>['day','fromId','fromName','toId','toName','locationId'].includes(k))&&number(h.day,state?.day??2000000)&&h.day>=startDay&&canonicalMentorId(state,classId,h.fromId)&&canonicalMentorId(state,classId,h.toId)&&h.fromId!==h.toId&&text(h.fromName,80)&&text(h.toName,80)&&text(h.locationId,80)&&(!state||state.world.locations.some(p=>p.id===h.locationId))&&h.fromId===(i?rows[i-1].toId:originalId)&&(i===0||h.day>=rows[i-1].day));
  for(const r of value.initiations||[]){
    if(r.mentorId!==undefined&&(!canonicalMentorId(state,r.classId,r.mentorId)||!text(r.mentorName,80))||r.supervisor!==undefined&&!validActor(r.supervisor,r.classId)||r.handovers!==undefined&&!validHandovers(r.handovers,r.classId,r.mentorId||`calling-mentor-${r.classId}`,r.day))return false;
    if(r.handovers?.length&&r.supervisor?.id!==r.handovers.at(-1).toId||r.supervisor&&r.supervisor.id!==(r.mentorId||`calling-mentor-${r.classId}`)&&!r.handovers?.length)return false;
  }
  if(value.pendingCalling&&value.pendingMentor===undefined&&currentMentorNpc(state,value.pendingCalling)?.id!==undefined&&value.mentors?.[value.pendingCalling]?.id!==`calling-mentor-${value.pendingCalling}`)return false;
  if(value.pendingMentor!==undefined&&(!value.pendingCalling||!validActor(value.pendingMentor,value.pendingCalling)||value.pendingMentor.id!==value.mentors?.[value.pendingCalling]?.id&&state?.npcContinuity?.people?.[value.pendingMentor.id]?.vacancyReason!=='recorded-death'))return false;
  if(value.mentorHistory!==undefined){
    if(!plain(value.mentorHistory)||Object.keys(value.mentorHistory).length>4096)return false;
    for(const [id,m]of Object.entries(value.mentorHistory))if(!plain(m)||Object.keys(m).some(k=>!['id','name','locationId','met','lessons','classId','retiredDay'].includes(k))||m.id!==id||!canonicalMentorId(state,m.classId,id)||!text(m.name,80)||!text(m.locationId,80)||typeof m.met!=='boolean'||!number(m.lessons)||!number(m.retiredDay,state?.day??2000000)||state&&state.npcContinuity?.people[id]?.retiredDay!==m.retiredDay)return false;
  }
  if (value.pendingCalling !== null && !findClass(value.pendingCalling)) return false;
  if (!plain(value.mentors) || Object.keys(value.mentors).length > CLASS_CATALOG.length) return false;
  for (const item of CLASS_CATALOG) {
    const mentor = value.mentors[item.id];
    if (!plain(mentor) || !canonicalMentorId(state,item.id,mentor.id) || !text(mentor.name,80) || !text(mentor.locationId,80) || typeof mentor.met !== 'boolean' || !number(mentor.lessons)) return false;
    if (state && (!state.world?.locations?.some(p => p.id === mentor.locationId)||currentMentorNpc(state,item.id)&&currentMentorNpc(state,item.id).id!==mentor.id)) return false;
  }
  if (state?.hero?.specialization && findClass(state.hero.specialization) && !value.learnedClassIds.includes(state.hero.specialization)) return false;
  if (state?.timeline?.mode === 'birth' && (state.age || 0) < 18 && (state.hero?.specialization || value.learnedClassIds.length)) return false;
  if (state?.timeline?.mode === 'birth' && state.hero?.specialization && findClass(state.hero.specialization)?.role !== state.hero.path) return false;
  if (state?.event?.id === 'calling_initiation' && value.pendingCalling === null) return false;
  return true;
}
