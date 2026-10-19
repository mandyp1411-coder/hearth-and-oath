import { STORY_FLAVOR } from './story-flavor.js';
import { editionStoryRow } from './narrative-edition.js';
import { groundedQuest } from './grounded-narrative-content.js';
import { PERSONAL_STORIES_V27 } from './personal-stories-v27.js';
import { personalServiceActions, recordPersonalService, usePersonalService } from './personal-services.js';
import { personalAllegationPlan, recordPersonalAllegation, applyPersonalAllegationChoice, allegationAwareRow, validateStoryAllegations } from './story-allegations.js';
import { addRpgService } from './rpg-depth-v27.js';
import { branchRow } from './audit-content-v25.js';
import { storyRepairContext } from './people-context.js';
import { captureStoryRow, chapterTerms, recordedDeed, validStoryTerms } from './story-continuity.js';
// Personal chapters are saved decisions, paid work, named witnesses and later returns.
// Modules mutate only the independent copy supplied by the public engine.
import { isSettlement } from './world.js';
import { IMMERSIVE_LIFE_STORIES } from './immersive-story-content-v18.js';

const YEARS=365, clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const person=(s,id)=>[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[]),...(s.life?.children||[])].find(p=>p.id===id);
const adultChild=s=>(s.life?.children || []).find(c=>c.alive!==false&&(Number.isSafeInteger(c.bornDay)?Math.floor((s.day-c.bornDay)/YEARS):c.age)>=18);
const workDays=s=>s.careers?.records?.[s.hero.profession]?.workedDays||0;
const choice=(label,outcome)=>({label,outcome});
// Each row: situation, constructive branch, self-interested branch, coercive branch.
export const LIFE_STORIES=Object.freeze([
  {id:'cracked_mark',title:'The Cracked Mark',kind:'work',minAge:18,skill:'scholarship',eligible:s=>s.hero.profession!=='Unemployed'&&workDays(s)>=30,actor:s=>s.society?.people?.find(p=>p.role==='customer'&&p.alive!==false)?.id||'fellow',chapters:[
    ['{name} returns with an account of something that went wrong in your {work}. The original tally bears your mark. A patron would prefer a quiet replacement; the household wants to know what happened.',choice('Inspect and repair it openly','You compare the damaged piece with your working notes. The customer receives a repair and a written account of the uncertainty.'),choice('Negotiate a limited replacement','You agree a replacement within a stated limit. The patron pays for the work, but the wider fault remains unexamined.'),choice('Blame the customer and sell silence','You turn the missing explanation into leverage. The customer pays to avoid a public argument and keeps the original tally.')],
    ['A year later, {name} brings a second account. Another household has the same problem. Your earlier response is in the margin of their letter, and the patron now asks whose name should bear the cost.',choice('Trace the other affected work','You visit the second household and record the repeated fault. Both households can see what you know before choosing their remedy.'),choice('Keep your service within the contract','You fulfill the written replacement terms and take a paid inspection. The second household must seek its own agreement.'),choice('Pressure the witness to withdraw','You threaten the witness with the patron’s displeasure. They withdraw their public complaint and retain a private copy.')],
    ['The old tally has reached the local trade table. {name} wants the next learner to see it. The patron offers to close the matter if the record disappears. The choice will outlive this commission.',choice('Publish the fault and teach the correction','The correction becomes part of the local workshop record, with the households’ names included by agreement.'),choice('Pay for a final private settlement','A written settlement closes your commission. The household keeps its own account; you retain a smaller paid practice.'),choice('Buy the record and control its use','You acquire the patron’s copy and restrict access. The witness remembers what was hidden, and your authority rests on keeping it hidden.')],
  ]},
  {id:'two_names',title:'Two Names on the Atlas',kind:'rivalry',minAge:18,skill:'persuasion',eligible:s=>!!person(s,'rival')&&person(s,'rival').alive!==false,actor:()=> 'rival',chapters:[
    ['{name} has mapped a safe path near {place}. A patron offers to pay for a clean copy bearing your signature alone. Their field marks are still visible beneath the new ink.',choice('Put both names on the account','You keep the field marks and share authorship. Your rival agrees to compare later discoveries without promising agreement.'),choice('Buy a clearly credited copy','You negotiate a fee and retain the fieldworker’s credit. The patron pays you to prepare the final account.'),choice('Erase their name for the patron','You claim the survey as your own. Your rival keeps the original field pages and begins looking for another patron.')],
    ['{name} returns with a different route and a different patron. A crossing on your old map has changed. Both accounts cannot remain accurate, and the caravan leaves tomorrow.',choice('Compare the evidence together','You mark the changed crossing and credit the new observations. The caravan keeper receives one correction with two names.'),choice('Test only the route you sell','You inspect your own route and publish the limits of your account. Your rival’s competing map remains in circulation.'),choice('Undermine their patron with a false report','You send a false report about the rival’s work. The patron suspends their support; your rival knows which claim was invented.')],
    ['The keeper at {place} asks whose account should enter the permanent archive. {name} brings the old field pages. A shared correction could end the argument; sole credit could make your name famous.',choice('Keep the disagreement beside a joint correction','The archive keeps both earlier accounts and the joint correction. Rivalry becomes a continuing exchange of evidence.'),choice('Establish a separate honest practice','Each of you signs only your own observations. The keeper keeps both maps, with their differences visible to travelers.'),choice('Use your influence to exclude their account','The keeper accepts your account alone under pressure. Your rival carries the surviving pages to readers beyond your reach.')],
  ]},
  {id:'winter_commons',title:'The Winter Commons',kind:'place',minAge:20,skill:'survival',eligible:s=>isSettlement(s.world,s.locationId),actor:()=> 'fellow',chapters:[
    ['A blocked drain at {place} threatens the common beds. {name} has a list of households who use them. A private estate wants the same labor before the next rain.',choice('Clear the drain with the households','The beds drain before the rain. Each helper’s name stays beside their share in the seed account.'),choice('Take the estate’s paid work','You finish the estate’s repairs for a written fee. The common beds depend on the households who can still spare time.'),choice('Divert the water to a competing plot','You protect your favored beds by redirecting the flood. The neighbor whose plot is damaged records who changed the channel.')],
    ['Winter returns to {place}. {name} has counted what survived in storage and what spoiled. The households disagree over whether the seed should feed people now or remain for the thaw.',choice('Agree a shared ration and protect seed','The households choose their ration together. A smaller protected seed stock remains for the thaw.'),choice('Trade your share at a stated price','You sell your share through an open agreement. The buyer chooses what to reserve; you keep the proceeds.'),choice('Withhold supplies to demand obedience','You hold supplies until households accept your terms. They eat, but the winter list now records who depended on your permission.')],
    ['Three growing seasons have made the seed account valuable. {name} asks where it will live and who can read it. A patron offers you a private deed in exchange for excluding the old helpers.',choice('Give the commons a charter of its own','The seed account belongs to the participating households. New members can see how shares and disagreements are recorded.'),choice('Keep a private plot with clear boundaries','You separate your own plot from the common beds. Neither agreement gives you a claim over another household’s harvest.'),choice('Take the patron’s exclusive deed','The patron’s deed gives you control of the favored ground. The excluded helpers remember whose names were removed.')],
  ]},
  {id:'hearth_letter',title:'The Letter Beneath the Hearth',kind:'household',minAge:18,skill:'scholarship',eligible:s=>s.life.people.some(p=>p.alive!==false),actor:s=>s.life.people.find(p=>p.role==='relative'&&p.alive!==false)?.id||'fellow',chapters:[
    ['{name} finds a folded household agreement beneath an old hearthstone. A creditor says it binds the family to years of service. The written amount is small; the demanded obedience is not.',choice('Inspect the original terms and witnesses','You copy the amount and ask a living witness what was agreed. No new debt or hereditary obligation is accepted.'),choice('Settle the verified amount privately','You settle the small verified sum through a paid accounting job. The demand for obedience stays outside the agreement.'),choice('Trade a relative’s confidence for relief','You sell the creditor a private household account. The relative learns who disclosed it and refuses to trust that confidence again.')],
    ['A year later, the witness’s account reaches {name}. It names a room, a payment, and a promise that was never written. Two relatives want the room for different reasons.',choice('Hear both claims before proposing a share','The relatives describe what they actually need. A shared-use agreement records hours and keys, with neither person owing service.'),choice('Arrange a paid lease with explicit limits','You prepare a lease covering the room alone. The tenant keeps control of their work and private life.'),choice('Forge a claim that gives you the only key','You alter the claim and obtain the key. A witness retains a copy of the earlier agreement.')],
    ['The creditor returns to {place} with a copy of the household account. {name} wants the argument settled before another generation grows around it. The earlier witness can still be heard.',choice('Resolve the claim in front of willing witnesses','The remaining terms are read aloud and limited to what was actually agreed. The household keeps a copy beside its own names.'),choice('Separate your property from the family agreement','You record what is yours and what is not. The relatives make their own arrangement without your signature.'),choice('Use the claim to control the household','You demand that the household answer to you. The witness records the pressure, and affection cannot be assumed from compliance.')],
  ]},
  {id:'night_door',title:'The Door After Nightfall',kind:'road',minAge:20,skill:'survival',eligible:s=>(s.travel?.history||[]).some(h=>h.result==='arrived')||s.age>=25,actor:s=>s.society?.people?.find(p=>p.role==='neighbor'&&p.alive!==false)?.id||'fellow',chapters:[
    ['A traveler arrives after the gates close at {place}. {name} knows a household with a spare room. A toll keeper asks where the traveler intends to go next.',choice('Arrange shelter without selling their route','The household offers a room by agreement. The traveler keeps their route private and leaves a grateful letter.'),choice('Offer a room for an agreed price','The traveler accepts a clear price for room and supper. The toll keeper receives no private account from you.'),choice('Sell the traveler’s route to the keeper','You sell the route for coin. The traveler learns why the keeper waited at the next crossing.')],
    ['The traveler’s household writes to {name} a year later. They have found work near {place}, but the old gate account still follows them. They ask whose help is safe to accept.',choice('Help them answer the record in their own words','You carry their chosen account to the gate table. Their household decides which details may be copied.'),choice('Offer paid work with clear terms','You prepare a paid work agreement with hours, fees, and an end date. Their route remains their own.'),choice('Demand service in exchange for protection','You make shelter depend on their service. They accept under pressure and remember the terms you imposed.')],
    ['The old gatekeeper is leaving. {name} brings three possible charters for the door at {place}: a shared refuge, a private inn, or a gate controlled by a patron and their allies.',choice('Give the door to a shared refuge','The charter leaves a place for travelers who need time to decide. Its keepers must ask before recording a private route.'),choice('Open a private inn with honest terms','The private charter names prices and guest boundaries. A room does not give its owner authority over a guest’s life.'),choice('Take the patron’s exclusive gate charter','You gain the patron’s support and control of the door. Households outside the agreement begin planning another crossing.')],
  ]},
  {id:'own_key',title:'The Apprentice’s Own Key',kind:'legacy',minAge:30,skill:'persuasion',eligible:s=>workDays(s)>=150,actor:s=>s.society?.people?.find(p=>p.role==='colleague'&&p.alive!==false)?.id||'fellow',chapters:[
    ['{name} asks to learn from your {work}. They bring their own tools and want a practice that can eventually bear their own name. A patron offers more money if the learner’s work bears yours.',choice('Teach with credit and an agreed limit','The learner keeps their name on completed work and a written end to the arrangement. Teaching is actual time, not a claim on their future.'),choice('Agree paid assistance with shared credit','You negotiate a paid commission and identify each contribution. Both of you can use your own work as evidence of experience.'),choice('Take their credit and demand exclusivity','You take sole credit and demand that their next work remain yours. The learner keeps a dated account of their contributions.')],
    ['A year later, {name} wins a commission you also wanted. Their work has changed since your first lesson. A patron asks whether you will endorse the new practice.',choice('Endorse the work they actually completed','You name the strengths and limits you saw. Their independent practice gains an honest reference.'),choice('Compete under your own name','You submit your own terms without claiming their methods. The buyer chooses between two independent practices.'),choice('Damage their reputation with an invented fault','You invent a fault to keep the commission. The learner remembers the claim and asks earlier customers for their own accounts.')],
    ['{name} returns with a learner of their own. They ask which records should pass to the next workbench. Your old agreement is still folded inside the tool chest.',choice('Create a shared teaching record','The record includes what each generation changed, including your disagreements. No signature owns the next learner’s work.'),choice('Keep separate schools with clear credit','Each practice keeps its methods and credits borrowed lessons. Competition leaves room for the people who choose between them.'),choice('Buy exclusive access to the teaching record','You reserve the patron’s archive and exclude the other practice. Their learners begin keeping a record beyond your control.')],
  ]},
  ...IMMERSIVE_LIFE_STORIES,
  ...PERSONAL_STORIES_V27.newFamilies.map(d=>({...d,
    eligible:s=>d.id==='marriage_second_chair'?!!person(s,s.life?.partnerId)&&person(s,s.life.partnerId).alive!==false:d.id==='deserter_unfinished_boot'?(s.realm?.wars||[]).length>0:d.id==='false_accusation_ash_coat'?(s.legal?.incidents||[]).some(i=>i.evidence>0):d.id==='child_other_road'?!!adultChild(s):d.id==='curse_survivor_last_lamp'?(s.rpg?.curseSurvivors||[]).some(v=>person(s,v.personId)?.alive!==false):isSettlement(s.world,s.locationId),
    actor:s=>d.id==='marriage_second_chair'?s.life.partnerId:d.id==='child_other_road'?adultChild(s)?.id:d.id==='curse_survivor_last_lamp'?s.rpg.curseSurvivors.find(v=>person(s,v.personId)?.alive!==false)?.personId:'fellow',
  })),
]);
const find=id=>LIFE_STORIES.find(a=>a.id===id);
const chapterCount=a=>a.contentVersion===3?5:3;
function baseRow(a,d){return a.contentVersion===3&&a.chapter>=3&&PERSONAL_STORIES_V27.extraChapters[d.id]?PERSONAL_STORIES_V27.extraChapters[d.id][a.chapter-3]:d.chapters[a.chapter];}
// A pending older proposal without a snapshot still resolves under its original wording.
function legacyStoryRow(a,d){const row=baseRow(a,d),resolved=branchRow({...a,contentVersion:a.contentVersion===3?2:a.contentVersion},row),prior=a.choices.at(-1);if(a.contentVersion===3&&prior&&PERSONAL_STORIES_V27.branchPremises[d.id]?.[prior.id])return [resolved[0]+'\n\n'+PERSONAL_STORIES_V27.branchPremises[d.id][prior.id],...resolved.slice(1)];return resolved;}
function storyRow(s,a,d){return editionStoryRow(s,a,captureStoryRow(storyRepairContext(s,a),allegationAwareRow(a,baseRow(a,d))),{prospective:true});}
const startingActor=(s,d)=>{
  const chosen=person(s,d.actor(s));
  return chosen&&chosen.alive!==false?chosen:[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[])].find(p=>p.alive!==false);
};
const ready=s=>s.stories&&s.age>=18&&s.phase==='adult'&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.dungeon&&!s.timeline?.journey&&!s.workshop?.project&&!s.careers?.batch&&!s.life?.plan;
export function initializeLifeStories(s){if(!s.stories)s.stories={version:1,introducedDay:s.day,arcs:[],project:null,pending:null,history:[],reputation:{care:0,enterprise:0,coercion:0}};}
const duration=pick=>({care:6,enterprise:4,coercion:3,leave:0}[pick]);
const learnedWork=s=>{const past=Object.entries(s.careers?.records||{}).filter(([name,r])=>name!=='Unemployed'&&r.workedDays>0).sort((a,b)=>b[1].workedDays-a[1].workedDays)[0];if(past)return `earlier work as ${/^[aeiou]/i.test(past[0])?'an':'a'} ${past[0].toLowerCase()}`;const skill=Object.entries(s.hero.skills).sort((a,b)=>b[1]-a[1])[0];return skill?.[1]>0?`${skill[0]} practice`:'ordinary household experience';};
const replace=(s,a,text)=>text.replaceAll('{name}',a.personName).replaceAll('{place}',s.world.locations.find(p=>p.id===a.locationId)?.name||'the old settlement').replaceAll('{work}',a.workSubject||(a.profession==='Unemployed'?learnedWork(s):`work as ${/^[aeiou]/i.test(a.profession)?'an':'a'} ${a.profession.toLowerCase()}`));
export function storyInvitations(s){
  if(!s.stories)return [];
  return LIFE_STORIES.flatMap(d=>{
    if(s.stories.arcs.some(a=>a.id===d.id)||s.age<d.minAge||!d.eligible(s))return [];
    const who=startingActor(s,d);if(!who)return [];
    const preview={personName:who.name,locationId:s.locationId,profession:s.hero.profession};
    return [{...groundedQuest(s,{id:d.id,title:d.title,personName:who.name,locationId:s.locationId},{kind:'personal'}),id:d.id,title:s.narrativeEdition===30?groundedQuest(s,{id:d.id,title:d.title},{kind:'personal'}).title:d.title,personId:who.id,personName:who.name,locationId:s.locationId,locationName:s.world.locations.find(p=>p.id===s.locationId)?.name||'Your settlement',premise:s.narrativeEdition===30?groundedQuest(s,{id:d.id,title:d.title,personName:who.name,locationId:s.locationId},{kind:'personal'}).premise:replace(s,preview,d.chapters[0][0]).split(/(?<=[.!?])\s+/)[0],status:s.stories.invitations?.[d.id]?.status||'offered'}];
  });
}
function delivery(s,a){
  const here=s.world.locations.find(p=>p.id===s.locationId)?.name||'your current stop',there=s.world.locations.find(p=>p.id===a.locationId)?.name||'the original settlement',actor=person(s,a.personId);
  if(actor?.alive===false)return `A surviving account of ${a.personName}’s work reaches you in ${here}. Its keepers ask about the recorded work at ${there}.`;
  if(s.locationId!==a.locationId&&actor?.locationId===s.locationId)return `In ${here}, ${a.personName} brings a remembered account of the work at ${there}. The proposal concerns that earlier place.`;
  if(s.locationId!==a.locationId||actor?.locationId&&actor.locationId!==s.locationId)return `A letter from ${a.personName} reaches you in ${here}. It carries the following proposal about ${there}; any hands-on work there still requires a visit.`;
  return `At ${here}, ${a.personName} brings the next proposal. The agreement below names the work and its limits.`;
}
export function storyChoiceReason(s,id){
  if(s.event?.id!=='stories_chapter'||!['care','enterprise','coercion'].includes(id)||!s.stories?.pending)return null;
  const a=s.stories.arcs.find(a=>a.id===s.stories.pending.arcId);if(!a)return 'This recorded chapter is unavailable.';
  const row=s.stories.pending.rowSnapshot||legacyStoryRow(a,find(a.id)),terms=chapterTerms(a,id,row);
  if(terms.visit&&s.locationId!==a.locationId)return `Travel to ${s.world.locations.find(p=>p.id===a.locationId)?.name} for this hands-on work. Read it later to keep the proposal while you travel.`;
  return s.hero.gold<terms.cost?`Requires ${terms.cost} gold for the stated fee. No time or payment has been taken.`:null;
}
function scene(s,a,row){
  const d=find(a.id), prior=a.choices.at(-1);
  const recall=prior?`\n\nLast time, you chose: ${prior.label}. ${prior.outcome}`:'';
  const actor=person(s,a.personId), absent=actor?.alive===false?`\n\n${a.personName} has died. Their saved account remains; the people carrying it forward ask you to decide.`:'';
  const signed=n=>(n>=0?'+':'')+n;
  return {id:'stories_chapter',title:`${d.title} · ${['The opening','The return','What remains','The living aftermath','What the next generation keeps'][a.chapter]}`,body:delivery(s,a)+'\n\n'+replace(s,a,row[0])+recall+absent,choices:[
    ...['care','enterprise','coercion'].map((id,i)=>{const t=chapterTerms(a,id,row);const reason=t.visit&&s.locationId!==a.locationId?'Travel to '+s.world.locations.find(p=>p.id===a.locationId)?.name+' for this hands-on work.':s.hero.gold<t.cost?'Requires '+t.cost+' gold for the stated fee.':null;return {id,deed:row[i+1].deed||recordedDeed(a,{...row[i+1],id}),...(row[i+1].narrativeFlavor?{narrativeFlavor:row[i+1].narrativeFlavor}:{}),label:row[i+1].label,days:t.days,cost:t.cost,reward:t.reward,...(reason?{disabledReason:reason}:{}),description:`${t.days} committed days · ${t.cost} gold fee on first attendance · ${t.reward} gold proceeds on completion. ${person(s,a.personId)?.alive===false?'No living participant trust change':'Participant trust '+signed(t.bond)+' (within existing limits)'}; local standing ${signed(t.standing)}${s.careers?.records?.[a.profession]?`; professional reputation ${signed(t.career)} (within its existing limits)`:''}.${t.visit?' Hands-on work at '+(s.world.locations.find(p=>p.id===a.locationId)?.name||'the recorded site')+'; travel is separate.':' This agreement can be attended through correspondence.'}`};}),
    {id:'defer',label:'Read this later',description:'Keep the chapter and its earlier decisions. No time, fee or reward; you may travel before returning to the proposal.'},
    {id:'leave',label:'Leave this chapter behind',description:'No time or fee. Close this story without receiving its rewards; the earlier decisions remain.'},
  ]};
}
export function storyActions(s){
  if(!ready(s))return [];
  const p=s.stories.project;
  if(p){const arc=s.stories.arcs.find(a=>a.id===p.arcId),t=chapterTerms(arc,p.choice,p.rowSnapshot||legacyStoryRow(arc,find(arc.id)));return [{id:'stories_continue',label:'Keep the time you agreed',description:`${p.remainingDays} days remain. Attendance pauses for birthdays, obligations, hunger, and full moons. Dedicated days do not earn automatic yearly wages.`,days:p.remainingDays,cost:p.paid?0:p.cost,group:'Personal stories',...(t.visit&&s.locationId!==p.locationId?{disabledReason:'Return to the recorded site for this hands-on work.'}:{})}, {id:'stories_cancel',label:'Withdraw from this commitment',description:'Keep the days and fees already spent. No unfinished chapter reward; you may reconsider the chapter later.',days:0,cost:0,group:'Personal stories'}];}
  const actions=LIFE_STORIES.flatMap(d=>{
    const a=s.stories.arcs.find(a=>a.id===d.id);
    if(a?.status==='completed'||a?.status==='abandoned')return [];
    if(a?.paused)return [];
    if(a&&s.age<a.nextAge)return [];
    if(!a&&(s.age<d.minAge||!d.eligible(s)||!startingActor(s,d)))return [];
    if(!a&&s.stories.invitations?.[d.id]?.status==='declined')return [{id:`stories_reconsider_${d.id}`,label:`Reconsider: ${d.title}`,description:'Put this invitation back among your offers without accepting it.',days:0,cost:0,group:'Personal stories'}];
    return [{id:`stories_open_${d.id}`,label:a?`Return to ${d.title}`:d.title,description:a?(s.age===a.startedAge?'Review the saved proposal. No new work has been accepted.':`${a.personName}’s earlier account returns after ${s.age-a.startedAge} years. Your choices remain part of this chapter.`):'Read the first proposal in a short, optional three-chapter story. Time and fees are chosen afterward.',days:0,cost:0,group:'Personal stories'},...(!a?[{id:`stories_decline_${d.id}`,label:`Decline: ${d.title}`,description:'Set aside this invitation without beginning a story. You can reconsider it later.',days:0,cost:0,group:'Personal stories'}]:[])];
  });
  actions.push(...personalServiceActions(s));return actions;
}
function note(s,ctx,a,title,text,choiceId=null){
  if(s.stories.project?.rowSnapshot?.[1]?.narrativeFlavor===STORY_FLAVOR)title='The Family’s Old Debt';
  const h={id:`story-${s.stories.history.length}-${s.day}`,day:s.day,title,text,arcId:a.id,personId:a.personId,personName:a.personName,locationId:a.locationId,chapter:a.chapter,choice:choiceId};
  s.stories.history.push(h);s.stories.history=s.stories.history.slice(-100);(s.stories.project?.rowSnapshot?.[1]?.narrativeFlavor===STORY_FLAVOR?ctx.journalLiteral||ctx.journal:ctx.journalLiteral||ctx.journal)?.(title,text,'personal',s.stories.project?.rowSnapshot?.[1]?.narrativeFlavor===STORY_FLAVOR?{narrativeEdition:30}:{});s.notice=text;
}
function finish(s,ctx){
  const p=s.stories.project,a=s.stories.arcs.find(a=>a.id===p.arcId),d=find(a.id),row=p.rowSnapshot||legacyStoryRow(a,d);
  const outcome=replace(s,a,row[['care','enterprise','coercion'].indexOf(p.choice)+1].outcome);
  const label=row[['care','enterprise','coercion'].indexOf(p.choice)+1].label;
  const terms=chapterTerms(a,p.choice,row),reward=terms.reward;
  const record=s.careers?.records?.[a.profession],who=person(s,a.personId),before={career:record?.reputation||0,standing:s.factions.villagers,bond:Number.isFinite(who?.bond)?who.bond:Number.isFinite(who?.relationship)?who.relationship:0,skill:s.hero.skills[d.skill]};
  if(p.choice==='coercion')ctx.breakOath?.(`You pressured ${a.personName} during ${d.title}.`);
  s.hero.gold+=reward;s.stories.reputation[p.choice]=clamp(s.stories.reputation[p.choice]+1,0,1000);
  if(record){record.reputation=clamp(record.reputation+terms.career);if(a.id==='cracked_mark')record.safety=clamp(record.safety+(p.choice==='care'?8:p.choice==='coercion'?-10:0));}
  if(who&&who.alive!==false){
    const delta=terms.bond;
    if(Number.isFinite(who.bond))who.bond=clamp(who.bond+delta);
    if(Number.isFinite(who.relationship))who.relationship=clamp(who.relationship+delta,-100,100);
    who.memories||=[];who.memories.push(outcome);who.memories=who.memories.slice(-30);
    who.knownFacts||=[];const fact=`story_${a.id}_${a.chapter}_${p.choice}`;if(!who.knownFacts.includes(fact))who.knownFacts.push(fact);who.knownFacts=who.knownFacts.slice(-60);
  }
  ctx.standing?.('villagers',terms.standing);
  if(terms.skill)s.hero.skills[d.skill]=Math.min(10000,s.hero.skills[d.skill]+terms.skill);
  const consequences={bond:who?.alive===false?0:(Number.isFinite(who?.bond)?who.bond:Number.isFinite(who?.relationship)?who.relationship:before.bond)-before.bond,standing:s.factions.villagers-before.standing,career:(record?.reputation||0)-before.career,skill:s.hero.skills[d.skill]-before.skill};
  const signed=n=>(n>=0?'+':'')+n;
  const text=`${outcome} ${p.totalDays} actual days${p.cost?` and ${p.cost} gold`:''} were committed.${reward?` The agreed proceeds were ${reward} gold.`:''} Participant trust ${signed(consequences.bond)}; local standing ${signed(consequences.standing)}${record?`; professional reputation ${signed(consequences.career)}`:''}.${row[1]?.narrativeFlavor===STORY_FLAVOR?` ${d.skill} ${signed(consequences.skill)}.`:''}${p.choice==='coercion'?` ${who?.alive===false&&row[1]?.narrativeFlavor===STORY_FLAVOR?'The household keeps':a.personName+' retains'} the account of your pressure.`:''}`;
  note(s,ctx,a,d.title,text,p.choice);
  a.choices.push({id:p.choice,label,outcome,day:s.day,days:p.totalDays,cost:p.cost,reward,...(row[['care','enterprise','coercion'].indexOf(p.choice)+1].terms?{terms:{...terms}}:{}),deed:recordedDeed(a,{...row[['care','enterprise','coercion'].indexOf(p.choice)+1],id:p.choice}),consequences,...(p.legalPlan?{legalNoticeVersion:1}:{})});if(p.legalPlan)recordPersonalAllegation(s,a,p.legalPlan);a.chapter++;
  a.nextAge=s.age+(a.chapter===1?1:2);a.status=a.chapter===chapterCount(a)?'completed':'active';
  if(a.status==='completed'){
    a.outcome=p.choice;
    const site=s.realm?.sites[a.locationId];if(site&&[2,3,4].includes(a.contentVersion)&&['night_door','own_key','winter_commons'].includes(a.id)){recordPersonalService(s,a);if(p.choice==='coercion'){site.resistance=(site.resistance||0)+1;}}
    s.world.changes.push({id:`personal-${s.dynasty?.generation||1}-${a.id}`,day:s.day,locationId:a.locationId,title:d.title,text:outcome});
    s.world.changes=s.world.changes.slice(-500);
  }
  if([3,4].includes(a.contentVersion)&&row[['care','enterprise','coercion'].indexOf(p.choice)+1].effect)addRpgService(s,{kind:row[['care','enterprise','coercion'].indexOf(p.choice)+1].effect,rule:p.choice==='coercion'?'controlled':p.choice==='enterprise'?'priced':'shared',locationId:a.locationId,ownerId:a.personId,source:a.id+'-'+(a.chapter-1)});
  s.stories.project=null;
}
function attend(s,ctx){
  const p=s.stories.project,old=s.day,fee=p.paid?0:p.cost;
  const a=s.stories.arcs.find(a=>a.id===p.arcId),terms=chapterTerms(a,p.choice,p.rowSnapshot||legacyStoryRow(a,find(a.id)));
  if(terms.visit&&s.locationId!==p.locationId){s.notice='Return to the recorded site to keep this hands-on commitment. Its attended days and fee remain recorded.';return true;}
  if(s.hero.gold<fee){s.notice=`The remaining agreement requires ${fee} gold. No time was spent; withdraw or return after earning it.`;return true;}
  // Reserve the fee while ordinary living costs are settled; refund if no day occurs.
  if(!p.paid)s.hero.gold-=fee;
  const actual=ctx.spendDays(Math.min(7,p.remainingDays),{outdoors:false});
  const days=Math.min(p.remainingDays,Math.max(0,s.day-old),Math.max(0,actual||0));
  if(!days){if(!p.paid)s.hero.gold+=fee;s.notice='The story commitment waits for the current calendar decision. No fee or chapter reward was paid.';return true;}
  p.paid=true;
  p.remainingDays-=days;p.completedDays+=days;
  if(s.phase==='retired'){s.stories.project=null;return true;}
  if(p.remainingDays===0)finish(s,ctx);else s.notice=`${p.completedDays}/${p.totalDays} days kept. The next part waits after this calendar decision.`;
  return true;
}
export function applyStoryAction(s,id,ctx={}){
  if(!storyActions(s).some(a=>a.id===id))return false;
  const invitation=id.match(/^stories_(decline|reconsider)_(.+)$/);
  if(invitation){s.stories.invitations||={};s.stories.invitations[invitation[2]]={status:invitation[1]==='decline'?'declined':'offered',day:s.day};s.notice=invitation[1]==='decline'?'Invitation declined. No story was accepted.':'The invitation is available again. It remains unaccepted.';ctx.journal?.('A personal invitation considered',s.notice,'quest');return true;}
  if(id==='stories_service'||id.startsWith('stories_service_'))return usePersonalService(s,id,ctx);
  if(id==='stories_continue')return attend(s,ctx);
  if(id==='stories_cancel'){const p=s.stories.project,a=s.stories.arcs.find(a=>a.id===p.arcId);note(s,ctx,a,'A limit stated before the work was finished',`${p.completedDays} actual days and ${p.paid?p.cost:0} gold remain recorded. You withdrew before earning the chapter’s reward.`);s.stories.project=null;return true;}
  const d=find(id.slice('stories_open_'.length));let a=s.stories.arcs.find(a=>a.id===d.id);
  if(!a){const who=startingActor(s,d);if(!who)return false;a={id:d.id,personId:who.id,personName:who.name,locationId:s.locationId,contentVersion:4,profession:s.hero.profession,workSubject:s.hero.profession==='Unemployed'?learnedWork(s):null,startedDay:s.day,startedAge:s.age,nextAge:s.age,chapter:0,status:'active',choices:[],outcome:null};s.stories.arcs.push(a);}
  const row=storyRow(s,a,d),v=scene(s,a,row),legalPlan=personalAllegationPlan(s,a,person(s,a.personId));
  if(legalPlan)v.choices.find(c=>c.id==='coercion').description+=' A retained agreement may become a named local forgery allegation after at least seven days. It is not a conviction; correction costs a 12-gold filing fee, and a free hearing response remains available.';
  s.stories.pending={arcId:a.id,chapter:a.chapter,rowSnapshot:row,...(legalPlan?{legalPlan}:{})};ctx.setEvent(v.id,v.title,'A personal story',v.body,v.choices);return true;
}
export function applyStoryChoice(s,eventId,id,ctx={}){
  if(eventId==='stories_allegation')return applyPersonalAllegationChoice(s,id,ctx);
  if(eventId!=='stories_chapter'||!s.stories?.pending||!['care','enterprise','coercion','leave','defer'].includes(id))return false;
  const a=s.stories.arcs.find(a=>a.id===s.stories.pending.arcId);if(!a||a.status!=='active'||a.chapter!==s.stories.pending.chapter)return false;
  if(id==='leave'){a.status='abandoned';note(s,ctx,a,'A story you chose to leave',`${a.personName}’s earlier account remains. You leave the next chapter without claiming its rewards.`,id);s.stories.pending=null;return true;}
  if(id==='defer'){s.stories.pending=null;s.notice='The proposal remains in your quest journal. No time, fee or reward was taken.';return true;}
  const row=s.stories.pending.rowSnapshot||legacyStoryRow(a,find(a.id)),terms=chapterTerms(a,id,row),cost=terms.cost;if(s.hero.gold<cost||terms.visit&&s.locationId!==a.locationId)return false;
  s.stories.project={arcId:a.id,choice:id,title:find(a.id).title,locationId:a.locationId,totalDays:terms.days,remainingDays:terms.days,completedDays:0,cost,paid:false,startedDay:s.day,rowSnapshot:row,...(id==='coercion'&&s.stories.pending.legalPlan?{legalPlan:{...s.stories.pending.legalPlan}}:{})};s.stories.pending=null;return attend(s,ctx);
}
export function storyEventIds(){return {stories_chapter:['care','enterprise','coercion','leave','defer'],stories_allegation:['correct','defend','pressure']};}
export function storyView(s){return s.stories?{arcs:s.stories.arcs.map(a=>({...a,status:a.paused?'paused':a.status,title:s.narrativeEdition===30?groundedQuest(s,a,{kind:'personal'}).title:find(a.id).title,totalChapters:chapterCount(a)})),invitations:storyInvitations(s),history:s.stories.history.slice(-12),reputation:{...s.stories.reputation},actions:storyActions(s)}:null;}
export function validateStories(v,s){
  const int=(n,min=0,max=100000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max,str=(t,n=1000)=>typeof t==='string'&&t.length>0&&t.length<=n,obj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
  const deed=d=>str(d,100)&&/^[a-z0-9_:]+$/.test(d);
  const effects=c=>obj(c)&&['bond','standing','career'].every(k=>int(c[k],-25,25))&&int(c.skill,0,2);
  const savedRow=(row,a)=>Array.isArray(row)&&row.length===4&&str(row[0],2000)&&row.slice(1).every(c=>obj(c)&&str(c.label,180)&&str(c.outcome,2000)&&(c.deed===undefined||deed(c.deed))&&(c.terms===undefined||validStoryTerms(c.terms))&&(a.contentVersion!==4||deed(c.deed)&&validStoryTerms(c.terms)));
  if(!obj(v)||v.version!==1||!int(v.introducedDay,0,s.day)||!Array.isArray(v.arcs)||v.arcs.length>LIFE_STORIES.length||new Set(v.arcs.map(a=>a.id)).size!==v.arcs.length||!obj(v.reputation)||!['care','enterprise','coercion'].every(k=>int(v.reputation[k],0,1000))||!Array.isArray(v.history)||v.history.length>100)return false;
  if(v.invitations!==undefined&&(!obj(v.invitations)||Object.keys(v.invitations).length>LIFE_STORIES.length||!Object.entries(v.invitations).every(([id,row])=>find(id)&&obj(row)&&['offered','declined'].includes(row.status)&&int(row.day,0,s.day))))return false;
  if(v.arcs.some(a=>a.paused!==undefined&&(typeof a.paused!=='boolean'||a.paused&&(a.status!=='active'||v.project?.arcId===a.id||v.pending?.arcId===a.id))))return false;
  for(const a of v.arcs){if(a.contentVersion!==undefined&&![1,2,3,4].includes(a.contentVersion))return false;if(a.workSubject!==undefined&&a.workSubject!==null&&!str(a.workSubject,180))return false;if(!obj(a)||!find(a.id)||!str(a.personId,80)||!str(a.personName,100)||!s.world.locations.some(p=>p.id===a.locationId)||!str(a.profession,100)||!int(a.startedDay,0,s.day)||!int(a.startedAge,18,s.age)||!int(a.nextAge,a.startedAge,5000)||!int(a.chapter,0,chapterCount(a))||!['active','completed','abandoned'].includes(a.status)||a.status==='completed'&&a.chapter!==chapterCount(a)||a.status==='active'&&a.chapter===chapterCount(a)||!Array.isArray(a.choices)||a.choices.length!==a.chapter||!a.choices.every(c=>obj(c)&&['care','enterprise','coercion'].includes(c.id)&&str(c.label)&&str(c.outcome)&&int(c.day,a.startedDay,s.day)&&(c.terms===undefined?c.days===duration(c.id):validStoryTerms(c.terms)&&c.days===c.terms.days&&c.cost===c.terms.cost&&c.reward===c.terms.reward)&&int(c.cost)&&int(c.reward)&&(c.deed===undefined||deed(c.deed))&&(c.consequences===undefined||effects(c.consequences))&&(a.contentVersion!==4||deed(c.deed)&&effects(c.consequences)&&validStoryTerms(c.terms)))||!(a.outcome===null||['care','enterprise','coercion'].includes(a.outcome)))return false;}
  if(!v.history.every(h=>obj(h)&&str(h.id,100)&&find(h.arcId)&&str(h.personId,80)&&str(h.personName,100)&&int(h.day,0,s.day)&&int(h.chapter,0,chapterCount(v.arcs.find(a=>a.id===h.arcId)||{contentVersion:1})-1)&&str(h.title)&&str(h.text,2000)&&s.world.locations.some(p=>p.id===h.locationId)&&[null,'care','enterprise','coercion','leave'].includes(h.choice)))return false;
  if(v.pending!==null){const p=v.pending,a=v.arcs.find(a=>a.id===p?.arcId);if(!obj(p)||!a||a.status!=='active'||p.chapter!==a.chapter||s.event?.id!=='stories_chapter'||v.project||p.rowSnapshot!==undefined&&!savedRow(p.rowSnapshot,a)||a.contentVersion===4&&!savedRow(p.rowSnapshot,a))return false;}
  if(v.project!==null){const p=v.project,a=v.arcs.find(a=>a.id===p?.arcId);if(!obj(p)||!a||a.status!=='active'||!['care','enterprise','coercion'].includes(p.choice)||!str(p.title)||p.locationId!==a.locationId||p.rowSnapshot!==undefined&&!savedRow(p.rowSnapshot,a)||a.contentVersion===4&&!savedRow(p.rowSnapshot,a))return false;const t=chapterTerms(a,p.choice,p.rowSnapshot||legacyStoryRow(a,find(a.id)));if(p.totalDays!==t.days||!int(p.remainingDays,1,p.totalDays)||!int(p.completedDays,0,p.totalDays)||p.completedDays+p.remainingDays!==p.totalDays||p.cost!==t.cost||typeof p.paid!=='boolean'||!int(p.startedDay,a.startedDay,s.day))return false;}
  return validateStoryAllegations(v,s);
}
