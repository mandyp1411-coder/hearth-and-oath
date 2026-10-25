import { deploymentFor } from './regional-world-v33.js';
import { generateCharacter } from './characters.js';
import { FAITHS } from './realm-content-v18.js';
import { seededRoll, generatePersonName } from './world.js';
import { familyVisitReason, familyResidence } from './household-residence.js';
import { settlementServices } from './world-services.js';
import { originById } from './origins.js';
import { recordEvidenceOnce, evidenceFor, validateObjectiveEvidence, finishObjectiveOnce } from './objective-evidence.js';

export const FAMILY_ORIGIN_FLAVOR = 'family-origin-1';
export const FAMILY_ORIGIN_TITLE = 'The Fold in the Page';
const KEYS={birthThread:['registered','hidden','burned'],birthVisitor:['bird','name','closed'],birthName:['household','margin','blank'],cradleSong:['kept','changed','silenced'],firstWord:['recorded','game','corrected']};
const TOKEN_IDS=['guardian_account','guardian_unavailable','register_inspected','register_unavailable','counterfoil_reference','custodian_verified','custodian_consent','custodian_refusal','custodian_account'];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=v=>structuredClone(v);
const int=(n,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const str=(v,max=160)=>typeof v==='string'&&v.length>0&&v.length<=max;
const safe=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const site=(s,id)=>s.world.locations.find(p=>p.id===id);
const room=s=>s.cartography?.interior?.siteId===s.locationId?s.cartography.interior.roomId:'gate';
const guardian=s=>{const candidates=(s.life?.people||[]).filter(p=>(['guardian','parent'].includes(p.familyRole)||p.id==='kin'&&p.role==='relative')&&s.family?.members.some(m=>m.personId===p.id));return candidates.find(p=>p.alive!==false&&s.family.members.some(m=>m.personId===p.id&&m.availability==='present'))||candidates.find(p=>p.id==='kin')||candidates[0]||null;};
const absent=s=>(s.family?.members||[]).some(m=>m.biological&&m.relationship==='birth parent'&&m.availability!=='present');
const otherWork=s=>s.rpg?.project||s.stories?.project||s.health?.recovery||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.conversations?.project;
const ready=s=>s.familyOrigins&&s.age>=12&&s.phase!=='retired'&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.maze&&!s.timeline?.journey&&!s.cartography?.pending&&!s.cartography?.offsite&&!s.justice?.prison&&!s.workshop?.project&&!s.careers?.batch&&!s.life?.plan&&!otherWork(s);
const eligible=s=>!!s.family&&(s.flags.familyOriginInterest===true||absent(s));
export function initializeFamilyOrigins(s){if(!s.familyOrigins&&s.family)s.familyOrigins={version:1,introducedDay:s.day,invitation:'offered',run:null,pending:null,project:null};}
function sourceAnchor(s){
 const flags={};for(const [key,values]of Object.entries(KEYS))if(values.includes(s.timeline?.storybook?.flags?.[key]))flags[key]=s.timeline.storybook.flags[key];
 const id=s.hero.lifeOrigin?.id;
 return {flags,items:{boneBird:s.timeline?.storybook?.items?.boneBird===true},originId:originById(id)?id:null};
}
function anchorText(a){
 const f=a.flags;
 if(f.birthThread==='registered')return {kind:'registered_thread',name:'the thread in the register',object:'thread-packet',lead:true,body:'The silver thread is still described in the small line beneath your birth entry. Its paper wrapper matters almost as much as the thread.',finding:'The packet was kept beside a child’s entry, not entered as a family seal. A mark on its wrapper points to the shrine’s store of communal blankets.',account:'The keeper turns the wrapper toward the light. “That mark belongs to the blankets we shared, not to a bloodline.” The thread remains strange; the careful wrapping tells you who made room for it.'};
 if(f.birthThread==='hidden')return {kind:'hidden_thread',name:'the thread kept at home',object:'household-thread',lead:false,body:'The household once put the thread in its own box. There is no claim that the archive ever held it.',finding:'The household keepsake and the public entry are different sources. The copied register cannot authenticate a thread it never received.',account:null};
 if(f.birthThread==='burned')return {kind:'burned_thread',name:'the thread that burned',object:'household-copy',lead:false,body:'The thread fell into the hearth on your first night. There is no secret packet waiting to give it back.',finding:'No thread survives to compare. The remembered decision is part of your history; the register supplies no material proof of where the thread came from.',account:null};
 if(f.birthVisitor==='bird'&&a.items.boneBird)return {kind:'kept_bird',name:'the little bone bird',object:'bone-bird',lead:true,body:'The little bone bird from your cradle is small enough to rest across the fold of the page. You do not know who carved it.',finding:'The register records a gift for the child, not the giver’s relationship to the child. Its wrapping mark points to a communal store.',account:'The keeper sets a similar rough practice carving beside your bird. “People leave gifts here for children they have never met.” You learn how such gifts were shared, but the carver’s name stays unknown.'};
 if(f.birthVisitor==='name')return {kind:'visitor_name',name:'the visitor’s uncertain name',object:'birth-copy',lead:false,body:'A name that sounded more like a place was written on the back of the birth record. It was never established as a parent’s name.',finding:'The old notation remains uncertain. A sound like a place is not a verified person, and no present whereabouts can be read from it.',account:null};
 if(f.birthVisitor==='closed'||f.birthVisitor==='bird')return {kind:'visitor_trace',name:'the visitor at the door',object:'birth-copy',lead:false,body:'The old account remembers a visitor and a bird. It does not establish that the bird is still in your possession.',finding:'The visitor’s gift establishes neither parentage nor present survival. No living lead can be verified from this entry.',account:null};
 if(f.birthName==='margin'||f.birthName==='household')return {kind:'margin_name',name:'the other name in the register',object:'birth-copy',lead:true,body:f.birthName==='margin'?'The unused name remains in the margin, just where your household asked the keeper to leave it.':'The household’s chosen name remains. The earlier pencil mark was crossed out; it was not a second parent’s signature.',finding:'The second line is an unused household naming entry, not a birth-parent identity. Its copying mark refers to the shrine’s naming book.',account:'The keeper opens the naming book to its ruled examples. “Sometimes a name was offered before a household chose its own.” The margin records a choice made around your cradle, not a hidden claim on your life.'};
 if(f.birthName==='blank')return {kind:'blank_name',name:'the line left blank',object:'birth-copy',lead:false,body:'The second name was left unwritten. No rubbed-out answer waits underneath the blank line.',finding:'The entry preserves the name your household used. The unwritten line supplies no second identity to trace.',account:null};
 if(f.cradleSong==='kept'||f.cradleSong==='changed')return {kind:'cradle_song',name:'the song at the cradle',object:'song-notation',lead:true,body:f.cradleSong==='kept'?'You remember the tune the household kept singing, more quietly after the visiting relative left.':'You remember exactly where the replacement words never quite fitted the old tune. The missing words have not returned.',finding:'A short notation matches the familiar rhythm. It is indexed among songs shared at the shelter, not under a family name.',account:f.cradleSong==='kept'?'The keeper taps the rhythm on the table, then stops for you to join or simply listen. “More than one household sang this.” The song reaches further than the room where you first heard it; it still does not name a parent.':'The keeper taps only the rhythm you recognize. No one supplies the words your household changed. You discover that the tune was shared between shelters, while the missing words remain missing.'};
 if(f.cradleSong==='silenced')return {kind:'silenced_song',name:'the song put away',object:'household-copy',lead:false,body:'The songbook was turned face down. You can ask about that quiet without being made to sing forgotten words.',finding:'The register contains no authenticated words or melody for the song your household put away. The silence is remembered without being filled with a convenient answer.',account:null};
 if(f.firstWord)return {kind:'first_word',name:'the first word and its limits',object:'birth-copy',lead:false,body:f.firstWord==='recorded'?'The scrap with the strange sound was kept with the birth record. Nobody established what it meant.':'Your household turned the strange sound into a game or taught you the ordinary word. No reliable transcript was preserved.',finding:'An uncertain early sound is not a name or a translated message. The record does not turn it into proof of ancestry.',account:null};
 const origin=originById(a.originId);
 if(origin?.id==='shrine_foundling')return {kind:'shrine_copy',name:'the shelter’s folded entry',object:'household-copy',lead:true,body:'The entry begins at the shrine door. Its two parent-name spaces are still blank.',finding:'The folded entry was kept with the shelter’s care accounts. Its small mark tracks a child’s bundle, not the identity of whoever brought it.',account:'The keeper opens a drawer of empty wrappers. “We kept small things together so they would still belong to the child.” You learn why the bundle was preserved. No one claims to know who left it at the door.'};
 if(origin&&/human_bellward|dwarf_makersward|goblin_patchwork|orc_carvedbowl|elf_rootsong/.test(origin.id))return {kind:'community_origin',name:'the household’s old mark',object:'household-copy',lead:true,body:origin.description,finding:'The copied mark belongs to the community’s care for the cradle: shared bread, seeds or makers’ work. It is not recorded as a hereditary seal.',account:'The keeper follows the small mark across the copied account. “These are the people who contributed. That is a different question from who your parents were.” A piece of the household’s beginning becomes clearer without changing the family record.'};
 return {kind:'household_copy',name:'the household copy',object:'household-copy',lead:false,body:'Only the household copy remains. You smooth its familiar folds. There is no first-night keepsake beside it.',finding:'The surviving copy repeats the recorded household facts. It carries no authenticated clue to another identity or a living person’s whereabouts.',account:null};
}
function personRef(p,locationId,roomId,source,day){return p?{id:p.id,name:p.name,locationId,roomId,source,capturedDay:day,identity:source==='keeper'?{generation:p.generation,createdDay:p.createdDay,baseAge:p.baseAge,role:p.role}:null}:null;}
function liveGuardian(s,r){const p=r.cast.guardian&&s.life.people.find(p=>p.id===r.cast.guardian.id);return p&&p.alive!==false&&!deploymentFor(s,p.id)&&!['destroyed','evacuated'].includes(site(s,r.cast.guardian.locationId)?.status)&&familyResidence(s,p)===r.cast.guardian.locationId&&s.family.members.some(m=>m.personId===p.id&&m.availability==='present')?p:null;}
function currentProvider(s,ref){
 if(!ref||deploymentFor(s,ref.id)||s.life.people.some(p=>p.id===ref.id&&p.alive===false))return null;
 return settlementServices(s,{siteId:ref.locationId}).find(p=>p.personId===ref.id&&p.kind===ref.source&&p.roomId===ref.roomId&&p.person.alive!==false&&p.person.available!==false&&(p.person.serviceEndDay===undefined||s.day<p.person.serviceEndDay))||null;
}
function atRef(s,ref){if(!ref)return false;return s.locationId===ref.locationId&&room(s)===ref.roomId&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey;}
function providerReason(s,ref){return !currentProvider(s,ref)?'The exact recorded custodian is unavailable. Keep the uncertain account or close the search; no successor inherits their testimony.':!atRef(s,ref)?`Visit ${ref.name} at the ${ref.roomId==='archive'?'School & Archive':'Shrine & Healing Room'} in ${site(s,ref.locationId)?.name||ref.locationId}.`:null;}
const describeParents=r=>r.family.members.length?r.family.members.map(m=>`${m.name}: ${m.availability}`).join('; ')+'. These entries do not establish a living contact.':'The older household copy supplies no additional birth-parent identity.';
function token(s,r,id,kind,actorIds,objectId,disposition='observed'){return recordEvidenceOnce(r,{id,kind,day:s.day,locationId:r.locationId,actorIds,objectId,verified:true,disposition});}
function note(s,ctx,r,title,text){const record={day:s.day,title,text};r.history.push(record);r.history=r.history.slice(-32);s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'family',{narrativeEdition:30,familyOriginRun:r.id});}
function offer(id,label,description,reason=null,days=0){return {id,label,description,days,cost:0,group:'Family & belonging',...(reason?{disabledReason:reason}:{})};}
const sourceFamily=s=>({setup:s.family.setup,parentage:s.family.parentage||null,members:s.family.members.filter(m=>m.biological&&m.relationship==='birth parent'&&m.availability!=='present').map((m,i)=>({key:`parent-${i+1}`,name:m.name,availability:m.availability}))});
const archivistNames=new Map();
const archivistName=(s,p)=>{const key=s.seed+':'+p.id;if(!archivistNames.has(key)){if(archivistNames.size>256)archivistNames.clear();archivistNames.set(key,generateCharacter(s.seed,p.id,{role:'Archivist',age:28+seededRoll(s.seed,p.id+':age',27)}).name);}return archivistNames.get(key);};
function captureRun(s){
 const p=guardian(s),locationId=(p?familyResidence(s,p):null)||s.hero.birthplaceId||s.locationId,archivist=settlementServices(s,{siteId:locationId}).find(p=>p.kind==='archivist');
 return {id:`family-origin-${s.dynasty?.generation||1}-${s.day}`,contentVersion:1,generation:s.dynasty?.generation||1,acceptedDay:s.day,acceptedAge:s.age,status:'active',step:'guardian',locationId,family:sourceFamily(s),anchor:sourceAnchor(s),focus:null,cast:{guardian:personRef(p,locationId,'homes','family',s.day),archivist:personRef(archivist?.person,locationId,'archive','archivist',s.day),lead:null},evidence:[],findings:[],choices:[],history:[],ending:null,completedDay:null};
}
function scene(run,sceneId,mode){
 const a=anchorText(run.anchor),who=run.cast.guardian?.name||'your recorded caregiver';
 const c=(id,label,description,days=0)=>({id,label,description:description+' No Gold fee.'+(days?' Household living costs accrue separately.':''),days,cost:0,narrativeFlavor:FAMILY_ORIGIN_FLAVOR});
 let title,body,choices;
 if(sceneId==='guardian'){
  title='What was kept';body=`${a.body}\n\n${mode==='living'?`${who} sets the papers between you. “I kept what I could. That is not the same as knowing where everything began.”`:`${who} cannot give a living interview now. Their earlier record can be read, but it cannot answer a new question.`}\n\n${describeParents(run)}`;
  choices=[c('object','Ask about '+a.name,mode==='living'?'Spend one day hearing this caregiver’s actual account. No parent is discovered by asking.':'Use only the surviving household account. No interview, time or new bond is claimed.',mode==='living'?1:0),c('names','Ask what the names actually tell us',mode==='living'?'Spend one day separating what was remembered from what was copied.':'Keep the recorded names and their limits without inventing a conversation.',mode==='living'?1:0),c('stop','Reading this is enough for today','Close this search respectfully. Keep what was already recorded; no failure or penalty.'),c('later','Put the papers aside for now','Keep the accepted search without spending time.')];
 }else if(sceneId==='register'){
  title='The mark beside the names';body=mode==='available'?`${run.cast.archivist.name} opens the register at its old fold. The line you want has been rubbed smooth by other readers’ thumbs. “Let us start with what is actually on the page.”\n\n${a.body}\n\n${describeParents(run)}`:'The recorded archive or its exact named archivist is no longer available. The household copy is still yours. An unavailable source cannot be treated as an inspection.';
  choices=[c('inspect',mode==='available'?'Compare the entry with your household copy':'Record the limit of the surviving copy',mode==='available'?'Spend one day inspecting the actual register. Gain one practiced Scholarship; a discovery is not a promise of parent survival.':'No time or skill. Record that the source could not be inspected; no replacement witness is invented.',mode==='available'?1:0),c('later','Return to this page another day','Keep the accepted search without spending time.'),c('stop','Close the search here','Keep the existing account. No failure or penalty.')];
 }else if(sceneId==='decision'){
  title='What you carry forward';body=`${run.findings.at(-1)?.claim||'The surviving source cannot settle the question.'}\n\n${run.cast.lead?`${run.cast.lead.name}, the current custodian at the shrine, can be asked about the referenced account. They are not claimed as a witness to your birth. You can visit them, or keep the record you have.`:'No surviving person has been verified from this source. You need not turn a gap into a promise.'}\n\nYou lay the papers so that neither account covers the other.`;
  choices=[c('keep','Keep both accounts and their uncertainty','Finish this investigation with an honest, personal account. No claim about parent survival.'),c('stop','Let the question rest here','Close the search respectfully; preserve what you learned.'),c('later','Leave the decision for another day','No deadline, time or penalty.')];
 }else if(sceneId==='contact'){
  title='A small thing, kept safely';body=`${run.cast.lead.name} brings the referenced book to the shrine table. “I can look at what is in my keeping. I cannot promise to tell you whose hands first held it.”\n\n${run.findings.at(-1)?.claim||a.finding}`;
  choices=[c('ask','Ask what the surviving account can show','Spend one day asking this exact living custodian. They may share a bounded account or refuse; neither response establishes a living parent.',1),c('keep','Keep what you already know','Complete the uncertain account without asking for another person’s story.'),c('later','Come back when you are ready','Keep the search without spending time.'),c('stop','Close the search here','Keep the evidence already gathered; no failure or penalty.')];
 }
 return {id:'origin_'+sceneId,title,category:FAMILY_ORIGIN_TITLE,body,choices};
}
function openScene(s,ctx,sceneId,mode){const r=s.familyOrigins.run,snapshot=scene(r,sceneId,mode);s.familyOrigins.pending={runId:r.id,sceneId,mode,sceneSnapshot:snapshot};ctx.setEvent(snapshot.id,snapshot.title,snapshot.category,snapshot.body,copy(snapshot.choices));}
function close(s,ctx,ending,text){
 const v=s.familyOrigins,r=v.run,requiredIds=ending==='custodian_account'?['register_inspected','counterfoil_reference','custodian_verified','custodian_consent','custodian_account']:[];
 if(ending==='custodian_account'&&evidenceFor(r,'custodian_consent')?.disposition!=='willing')return false;
 if(!finishObjectiveOnce(r,{day:s.day,ending,requiredIds}))return false;
 if(s.questLog?.tracked==='family-origin')s.questLog.tracked=null;
 if(ending==='respectful_stop')r.status='stopped';r.step='closed';v.pending=null;v.project=null;
 note(s,ctx,r,FAMILY_ORIGIN_TITLE,text);return true;
}
function uncertainText(r){const a=anchorText(r.anchor);return `${r.findings.at(-1)?.claim||'The household copy keeps the names and gaps that were actually recorded.'}\n\nYou keep the remembered ${a.name} beside the written account. The tune may be familiar and the handwriting strange; neither has to silence the other. Beneath them you add the date of this search. What remains unknown is left honestly unknown.`;}
const stopText=r=>`You fold the page along its old crease. ${r.cast.guardian?.name||'The people who raised you'} has a place in your history; the recorded losses and gaps remain as they were. Not every unanswered question has to become tomorrow’s work.`;
function finishStep(s,ctx,p){
 const v=s.familyOrigins,r=v.run,a=anchorText(r.anchor),g=liveGuardian(s,r);v.project=null;
 if(p.kind==='guardian'){
  if(p.mode==='living'&&g){token(s,r,'guardian_account','testimony',[g.id],'household-copy');g.bond=Math.min(100,g.bond+3);const memory=`You asked about ${p.choice==='object'?a.name:'the recorded names'} without asking me to invent an answer.`;if(!g.memories.includes(memory))g.memories.push(memory);g.memories=g.memories.slice(-30);}
  else token(s,r,'guardian_unavailable','record',[],'household-copy');
  r.focus=p.choice;r.step='register';note(s,ctx,r,'What was kept',`${p.mode==='living'&&g?`${g.name} shared the limits of the remembered account.`:'Only the surviving household account was used; no living interview took place.'} ${a.body} ${describeParents(r)}`);
 }else if(p.kind==='register'){
  const provider=currentProvider(s,r.cast.archivist);
  if(p.mode==='available'&&provider){
   token(s,r,'register_inspected','inspection',[provider.personId],a.object);s.hero.skills.scholarship=Math.min(10000,s.hero.skills.scholarship+1);
   r.findings.push({id:'register-finding',day:s.day,source:'register_inspected',certainty:'documented',claim:a.finding});
   const keeper=a.lead&&settlementServices(s,{siteId:r.locationId}).find(p=>p.kind==='keeper'&&p.person.alive!==false&&p.person.available!==false&&!deploymentFor(s,p.personId)&&!s.life.people.some(x=>x.id===p.personId&&x.alive===false));
   if(keeper){r.cast.lead=personRef(s.realm.sites[r.locationId].keeper,r.locationId,'shrine','keeper',s.day);token(s,r,'counterfoil_reference','record',[provider.personId],a.object);token(s,r,'custodian_verified','inspection',[provider.personId,keeper.personId],a.object);}
  }else{token(s,r,'register_unavailable','record',[],'household-copy');r.findings.push({id:'register-finding',day:s.day,source:'register_unavailable',certainty:'unresolved',claim:'The exact recorded archive source was unavailable. The household copy was preserved; no register inspection or new identity was claimed.'});}
  r.step='decision';note(s,ctx,r,'The mark beside the names',r.findings.at(-1).claim+(r.cast.lead?` The surviving reference identifies ${r.cast.lead.name} as a current custodian, not an eyewitness to your birth.`:''));
 }else if(p.kind==='contact'){
  const provider=currentProvider(s,r.cast.lead);
  if(!provider)return close(s,ctx,'uncertain_account',`The exact named custodian became unavailable before an account could be heard. No testimony or consent is claimed.\n\n${uncertainText(r)}`);
  const willing=seededRoll(s.seed,r.id+':custodian-response',5)!==0;
  token(s,r,willing?'custodian_consent':'custodian_refusal','consent',[provider.personId],a.object,willing?'willing':'refused');
  if(!willing)return close(s,ctx,'uncertain_account',`${provider.name} keeps the referenced account closed. “I can look after a thing without being able to tell its whole story.” Their refusal is not evidence of a concealed parent.\n\n${uncertainText(r)}`);
  token(s,r,'custodian_account','testimony',[provider.personId],a.object,'willing');r.findings.push({id:'custodian-finding',day:s.day,source:'custodian_account',certainty:'attributed',claim:a.account});
  return close(s,ctx,'custodian_account',`${a.account}\n\nYou write down who showed you the account and what it cannot prove. ${describeParents(r)} A beginning can belong to more people than the names a register can supply.`);
 }
 return true;
}
function attend(s,ctx){const v=s.familyOrigins,p=v.project,r=v.run;if(!p||r.status!=='active')return false;
 const ref=p.kind==='guardian'?r.cast.guardian:p.kind==='register'?r.cast.archivist:r.cast.lead;
 const available=p.kind==='guardian'?liveGuardian(s,r):currentProvider(s,ref);
 if(p.mode==='living'||p.mode==='available'){
  if(!available){p.completedDays=p.totalDays;p.remainingDays=0;return finishStep(s,ctx,p);}
  const reason=p.kind==='guardian'?familyVisitReason(s,available):providerReason(s,ref);if(reason){s.notice=reason;return true;}
 }
 const days=ctx.spendDays(p.remainingDays);p.completedDays+=days;p.remainingDays-=days;
 if(s.phase==='retired')return true;
 if(p.remainingDays)return true;
 return finishStep(s,ctx,p);
}
export function originActions(s){
 if(!ready(s))return [];const v=s.familyOrigins,r=v.run;
 if(v.project)return [offer('origin_continue','Continue the agreed search step','Attend only its remaining day. No automatic annual wages; interruptions and actual living costs remain real.',null,v.project.remainingDays),offer('origin_cancel','Put this unfinished step aside','Keep earlier evidence. No unfinished inspection or testimony is acquired.')];
 if(!r){if(!eligible(s))return [];return v.invitation==='declined'?[offer('origin_reconsider','Reconsider the family-record invitation','Return this offer to Journal without accepting a search.')]:[offer('origin_accept',FAMILY_ORIGIN_TITLE,'Begin one optional family-record investigation. Reading the invitation made no commitment. Interviews and inspection are quoted separately; no reunion is promised.'),offer('origin_decline','Decline the family-record invitation','Set it aside without a failed task or penalty.')];}
 if(r.status==='paused')return [offer('origin_resume','Resume the family-record search','Keep the exact people, evidence and earlier questions. No new work is accepted.')];
 if(r.status!=='active')return [];
 const rows=[];
 if(r.step==='guardian'){const p=liveGuardian(s,r);rows.push(offer('origin_guardian','Read what the household kept','Open the first scene. Actual questions cost one day; the record alone is free.',p?familyVisitReason(s,p):null));}
 if(r.step==='register'){const p=currentProvider(s,r.cast.archivist);rows.push(offer('origin_register','Inspect the family register','Read the proposal with the exact recorded archivist. Actual inspection costs one day.',p?providerReason(s,r.cast.archivist):null));}
 if(r.step==='decision'){
  if(r.cast.lead)rows.push(offer('origin_contact','Ask '+r.cast.lead.name+' about the surviving account','Read a bounded request at the actual shrine. Hearing a willing account takes one day; no parent survival is promised.',providerReason(s,r.cast.lead)));
  rows.push(offer('origin_decide','Decide what to carry forward','Keep an honest uncertain account, or close the search respectfully. No additional days or fee.'));
 }
 rows.push(offer('origin_pause','Pause the family-record search','Keep your evidence and exact participants without a deadline.'),offer('origin_stop','Close the family-record search','Respectfully stop. Preserve what you learned; no failure or penalty.'));return rows;
}
export function applyOriginAction(s,id,ctx){
 const a=originActions(s).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;const v=s.familyOrigins,r=v.run;
 if(id==='origin_decline'){v.invitation='declined';s.notice='The invitation is set aside. You never accepted a search; no task failed.';return true;}
 if(id==='origin_reconsider'){v.invitation='offered';s.notice='The invitation is available again. No search has begun.';return true;}
 if(id==='origin_accept'){v.run=captureRun(s);note(s,ctx,v.run,FAMILY_ORIGIN_TITLE,'You chose to compare the household account with the register. The search promises no reunion. Its named people, childhood choices and starting family facts are now recorded.');return true;}
 if(id==='origin_pause'||id==='origin_resume'){r.status=id==='origin_pause'?'paused':'active';if(s.questLog?.tracked==='family-origin')s.questLog.tracked=null;s.notice=r.status==='paused'?'The search can wait. Its evidence and people stay recorded.':'The search resumes from its recorded next step.';return true;}
 if(id==='origin_stop')return close(s,ctx,'respectful_stop',stopText(r));
 if(id==='origin_continue')return attend(s,ctx);
 if(id==='origin_cancel'){v.project=null;s.notice='The unfinished step is put aside. Earlier evidence remains; no new account is claimed.';return true;}
 if(id==='origin_guardian')openScene(s,ctx,'guardian',liveGuardian(s,r)?'living':'record');
 else if(id==='origin_register')openScene(s,ctx,'register',currentProvider(s,r.cast.archivist)?'available':'unavailable');
 else if(id==='origin_decide')openScene(s,ctx,'decision','decision');
 else if(id==='origin_contact')openScene(s,ctx,'contact','available');else return false;
 return true;
}
export function originChoiceReason(s,eventId,id){
 if(!eventId?.startsWith('origin_'))return null;const v=s.familyOrigins,p=v?.pending,r=v?.run;if(!p||!r||r.status!=='active'||p.sceneSnapshot.id!==eventId)return 'This saved search proposal is unavailable.';
 const c=p.sceneSnapshot.choices.find(c=>c.id===id);if(!c)return 'This is not a choice in the saved proposal.';
 if(c.days){const ref=p.sceneId==='guardian'?r.cast.guardian:p.sceneId==='register'?r.cast.archivist:r.cast.lead;return p.sceneId==='guardian'?liveGuardian(s,r)?familyVisitReason(s,liveGuardian(s,r)):null:currentProvider(s,ref)?providerReason(s,ref):null;}
 return null;
}
export function applyOriginChoice(s,eventId,id,ctx){
 const v=s.familyOrigins,p=v?.pending,r=v?.run;if(!p||!r||r.status!=='active'||eventId!==p.sceneSnapshot.id||originChoiceReason(s,eventId,id))return false;
 const c=p.sceneSnapshot.choices.find(c=>c.id===id);if(!c)return false;
 v.pending=null;
 if(id!=='later'){
  // Reopening an unworked proposal is not another acquired account. Keep the
  // most recent selected terms for each question without evicting earlier proof.
  const previous=r.choices.findIndex(x=>x.sceneId===p.sceneId&&x.id===id);if(previous>=0)r.choices.splice(previous,1);
  r.choices.push({sceneId:p.sceneId,id,day:s.day,label:c.label,days:c.days});
 }
 if(id==='later'){s.notice='The papers wait in your Journal. No time, fee or evidence was taken.';return true;}
 if(id==='stop')return close(s,ctx,'respectful_stop',stopText(r));
 if(id==='keep')return close(s,ctx,'uncertain_account',uncertainText(r));
 if(c.days===0)return finishStep(s,ctx,{kind:p.sceneId,choice:id,mode:p.mode});
 v.project={runId:r.id,kind:p.sceneId,choice:id,mode:p.mode,title:p.sceneSnapshot.title,locationId:r.locationId,totalDays:1,completedDays:0,remainingDays:1,startedDay:s.day,proposal:copy(p)};s.notice='The agreed search step waits for its one actual day; no evidence is acquired before attendance.';return attend(s,ctx);
}
export function originEventIds(){return {origin_guardian:['object','names','stop','later'],origin_register:['inspect','stop','later'],origin_decision:['keep','stop','later'],origin_contact:['ask','keep','stop','later']};}
export function preserveOriginEvent(s,event){const p=s.familyOrigins?.pending;return !!p&&event?.id===p.sceneSnapshot.id&&same({...event,narrativeEdition:undefined},{...p.sceneSnapshot,narrativeEdition:undefined});}
export function originTransition(before,after){return !!before.familyOrigins?.run&&(before.familyOrigins.pending||before.familyOrigins.project)&&!same(before.familyOrigins,after.familyOrigins);}
export function closeFamilyOrigins(s){const v=s.familyOrigins;if(!v)return;v.pending=null;v.project=null;if(v.run&&['active','paused'].includes(v.run.status)){v.run.status='left_unfinished';v.run.step='closed';v.run.completedDay=s.day;}}
export function originView(s){const v=s.familyOrigins,r=v?.run;return {title:FAMILY_ORIGIN_TITLE,offered:!r&&s.age>=12&&eligible(s),declined:v?.invitation==='declined',premise:'Compare a remembered childhood detail with the household record. A short optional search, not a promise that a parent survives.',run:r,anchor:r?anchorText(r.anchor):null};}
export function originJournalRows(s){
 const r=s.familyOrigins?.run;if(!r||!['active','paused'].includes(r.status)||s.phase==='retired')return [];
 const ref=r.step==='guardian'?(liveGuardian(s,r)?r.cast.guardian:null):r.step==='register'?(currentProvider(s,r.cast.archivist)?r.cast.archivist:null):r.cast.lead;
 return [{key:'family-origin',kind:'personal',commitment:true,title:FAMILY_ORIGIN_TITLE,status:r.status,paused:r.status==='paused',personName:ref?.name,personId:ref?.id,exactPerson:true,locationId:ref?.locationId||r.locationId,roomId:ref?.roomId,objective:r.step==='guardian'?'Ask the actual caregiver, or use only the surviving household account.':r.step==='register'?'Compare the household account with the exact recorded archive source.':r.cast.lead?'Ask the verified current custodian, keep the uncertainty, or respectfully stop.':'Keep an honest uncertain account, or respectfully stop.',details:[`Anchor: ${anchorText(r.anchor).name}.`,...r.findings.map(f=>f.claim),'No deadline or promised reunion.'],actionId:s.familyOrigins.project?'origin_continue':r.step==='guardian'?'origin_guardian':r.step==='register'?'origin_register':r.cast.lead?'origin_contact':'origin_decide',actionLabel:s.familyOrigins.project?'Continue agreed search step':'Read the next search step',trackId:'journal_track_family-origin',...(r.step==='decision'&&r.cast.lead&&!s.familyOrigins.project?{alternateId:'origin_decide'}:{}),pauseId:r.status==='paused'?'origin_resume':'origin_pause',cancelId:s.familyOrigins.project?'origin_cancel':'origin_stop'}];
}

// This validator owns the meaning and acquisition order of every token. The
// shared vocabulary alone cannot authenticate a family fact or willing consent.
export function validateFamilyOrigins(v,s,{npcRecord}={}){
 try{
  if(v===undefined)return !s.event?.id.startsWith('origin_');
  const exact=(o,keys)=>obj(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
  if(!exact(v,['version','introducedDay','invitation','run','pending','project'])||v.version!==1||!int(v.introducedDay,0,s.day)||!['offered','declined'].includes(v.invitation))return false;
  if(v.run===null)return v.pending===null&&v.project===null&&!s.event?.id.startsWith('origin_');
  const r=v.run,a=anchorText(r.anchor),has=id=>!!evidenceFor(r,id),g=has('guardian_account')||has('guardian_unavailable'),reg=has('register_inspected')||has('register_unavailable');
  if(!exact(r,['id','contentVersion','generation','acceptedDay','acceptedAge','status','step','locationId','family','anchor','focus','cast','evidence','findings','choices','history','ending','completedDay'])||r.contentVersion!==1||!int(r.generation,1,5000)||r.generation!==(s.dynasty?.generation||1)||!int(r.acceptedDay,v.introducedDay,s.day)||r.id!==`family-origin-${r.generation}-${r.acceptedDay}`||!int(r.acceptedAge,12,s.age)||!site(s,r.locationId)||!['active','paused','completed','stopped','left_unfinished'].includes(r.status)||!['guardian','register','decision','closed'].includes(r.step))return false;
  const expectedAge=s.timeline?.mode==='birth'?Math.floor((r.acceptedDay-(s.timeline.birthDay||0))/365):18+Math.floor(r.acceptedDay/365);if(r.acceptedAge!==expectedAge)return false;
  if(!exact(r.family,['setup','parentage','members'])||!['two_parents','single_parent','orphan','homeless','legacy'].includes(r.family.setup)||![null,'unrecorded'].includes(r.family.parentage)||r.family.parentage==='unrecorded'&&r.family.setup!=='orphan'||!Array.isArray(r.family.members)||r.family.members.length>2||!r.family.members.every((m,i)=>exact(m,['key','name','availability'])&&m.key===`parent-${i+1}`&&str(m.name,100)&&['unknown','missing','deceased'].includes(m.availability)&&s.family.members.some(actual=>actual.biological&&actual.relationship==='birth parent'&&actual.name===m.name&&actual.availability===m.availability))||r.family.parentage==='unrecorded'&&r.family.members.some(m=>m.availability!=='unknown'))return false;
  if(!same(r.family,sourceFamily(s)))return false;
  if(!exact(r.anchor,['flags','items','originId'])||!obj(r.anchor.flags)||!Object.entries(r.anchor.flags).every(([key,value])=>KEYS[key]?.includes(value))||!exact(r.anchor.items,['boneBird'])||typeof r.anchor.items.boneBird!=='boolean'||r.anchor.originId!==null&&!originById(r.anchor.originId)||!same(r.anchor,sourceAnchor(s)))return false;
  if(!exact(r.cast,['guardian','archivist','lead']))return false;
  const keeperHistory=p=>{if(!exact(p.identity,['generation','createdDay','baseAge','role'])||!int(p.identity.generation,0,10000)||p.id!==`keeper-${p.locationId}-${p.identity.generation}`||!int(p.identity.createdDay,0,p.capturedDay)||!int(p.identity.baseAge,18,200)||!FAITHS.some(f=>f.templeKeeperRole===p.identity.role))return false;const known=[s.realm?.sites[p.locationId]?.keeper,...(s.realm?.sites[p.locationId]?.keeperArchive||[])].find(x=>x?.id===p.id);if(known)return known.name===p.name&&known.generation===p.identity.generation&&known.createdDay===p.identity.createdDay&&known.baseAge===p.identity.baseAge;const age=28+seededRoll(s.seed,p.id+':age',22);return p.identity.baseAge===age&&p.identity.generation<=Math.floor(p.capturedDay/365)+1&&p.name===generatePersonName(s.seed,p.id,generateCharacter(s.seed,p.id,{role:p.identity.role,age}));};
  const publicArchivist=p=>{const n=typeof npcRecord==='function'?npcRecord(p.id):null;if(!n||n.slotKey!==`service:${p.locationId}:archivist:`||n.snapshot?.id!==p.id||n.snapshot?.name!==p.name||n.snapshot?.role!=='Archivist'||n.snapshot?.locationId!==p.locationId||!int(n.observedDay,0,p.capturedDay)||!int(n.retireDay,p.capturedDay+1)||n.retiredDay!==null&&!int(n.retiredDay,p.capturedDay+1))return null;return n;};
  const canonicalArchivist=p=>typeof npcRecord==='function'&&npcRecord(p.id)?!!publicArchivist(p):p.id===`resident-archivist-${p.locationId}-${Math.floor(p.capturedDay/(55*365))}`&&p.name===archivistName(s,p);
  const validRef=(p,kind)=>p===null||exact(p,['id','name','locationId','roomId','source','capturedDay','identity'])&&safe(p.id)&&str(p.name,100)&&p.locationId===r.locationId&&p.source===kind&&p.roomId===({family:'homes',archivist:'archive',keeper:'shrine'})[kind]&&int(p.capturedDay,r.acceptedDay,s.day)&&(kind==='family'?s.life.people.some(x=>x.id===p.id&&x.name===p.name&&(['parent','guardian'].includes(x.familyRole)||x.id==='kin'&&x.role==='relative')):kind==='archivist'?canonicalArchivist(p):keeperHistory(p))&&(kind==='keeper'||p.identity===null);
  if(!validRef(r.cast.guardian,'family')||!validRef(r.cast.archivist,'archivist')||!validRef(r.cast.lead,'keeper')||r.cast.guardian&&r.cast.guardian.capturedDay!==r.acceptedDay||r.cast.archivist&&r.cast.archivist.capturedDay!==r.acceptedDay)return false;
  const actorIds=Object.values(r.cast).filter(Boolean).map(p=>p.id),objectIds=['household-copy',a.object];
  if(!validateObjectiveEvidence(r.evidence,{day:s.day,site:id=>id===r.locationId,actor:id=>actorIds.includes(id),allowedIds:TOKEN_IDS,objectId:id=>objectIds.includes(id)}))return false;
  const expected={guardian_account:['testimony',r.cast.guardian?[r.cast.guardian.id]:null,'household-copy','observed'],guardian_unavailable:['record',[],'household-copy','observed'],register_inspected:['inspection',r.cast.archivist?[r.cast.archivist.id]:null,a.object,'observed'],register_unavailable:['record',[],'household-copy','observed'],counterfoil_reference:['record',r.cast.archivist?[r.cast.archivist.id]:null,a.object,'observed'],custodian_verified:['inspection',r.cast.archivist&&r.cast.lead?[r.cast.archivist.id,r.cast.lead.id]:null,a.object,'observed'],custodian_consent:['consent',r.cast.lead?[r.cast.lead.id]:null,a.object,'willing'],custodian_refusal:['consent',r.cast.lead?[r.cast.lead.id]:null,a.object,'refused'],custodian_account:['testimony',r.cast.lead?[r.cast.lead.id]:null,a.object,'willing']};
  if(!r.evidence.every(e=>{const x=expected[e.id];return e.verified===true&&e.day>=r.acceptedDay&&x[1]!==null&&e.kind===x[0]&&same(e.actorIds,x[1])&&e.objectId===x[2]&&e.disposition===x[3];}))return false;
  if(has('guardian_account')&&has('guardian_unavailable')||has('register_inspected')&&has('register_unavailable')||has('custodian_consent')&&has('custodian_refusal')||reg&&!g||has('counterfoil_reference')!==has('custodian_verified')||!!r.cast.lead!==has('custodian_verified')||has('custodian_verified')&&(!has('register_inspected')||!a.lead)||has('custodian_consent')&&!has('custodian_verified')||has('custodian_refusal')&&!has('custodian_verified')||has('custodian_account')!==has('custodian_consent'))return false;
  const order={guardian_account:0,guardian_unavailable:0,register_inspected:1,register_unavailable:1,counterfoil_reference:2,custodian_verified:3,custodian_consent:4,custodian_refusal:4,custodian_account:5};
  if(r.evidence.some((e,i)=>i&&(e.day<r.evidence[i-1].day||order[e.id]<order[r.evidence[i-1].id])))return false;
  if(r.focus!==null&&!['object','names'].includes(r.focus)||g!==(r.focus!==null))return false;
  if(!Array.isArray(r.findings)||r.findings.length!==(reg?has('custodian_account')?2:1:0))return false;
  const unavailable='The exact recorded archive source was unavailable. The household copy was preserved; no register inspection or new identity was claimed.';
  if(!r.findings.every((f,i)=>exact(f,['id','day','source','certainty','claim'])&&f.id===(i?'custodian-finding':'register-finding')&&f.source===(i?'custodian_account':has('register_inspected')?'register_inspected':'register_unavailable')&&f.day===evidenceFor(r,f.source)?.day&&f.certainty===(i?'attributed':has('register_inspected')?'documented':'unresolved')&&f.claim===(i?a.account:has('register_inspected')?a.finding:unavailable)))return false;
  const terminal=['completed','stopped','left_unfinished'].includes(r.status);
  if(terminal?r.step!=='closed'||!int(r.completedDay,r.acceptedDay,s.day):r.completedDay!==null||r.ending!==null||r.step!==(reg?'decision':g?'register':'guardian'))return false;
  if(r.status==='completed'&&(!['custodian_account','uncertain_account'].includes(r.ending)||!reg)||r.status==='stopped'&&r.ending!=='respectful_stop'||r.status==='left_unfinished'&&(r.ending!==null||s.phase!=='retired')||r.ending==='custodian_account'&&!has('custodian_account')||has('custodian_account')&&r.ending!=='custodian_account')return false;
  if(!(s.flags.familyOriginInterest===true||r.family.members.length))return false;
  if(!Array.isArray(r.choices)||r.choices.length>32||!r.choices.every(c=>exact(c,['sceneId','id','day','label','days'])&&['guardian','register','decision','contact'].includes(c.sceneId)&&originEventIds()['origin_'+c.sceneId].includes(c.id)&&int(c.day,r.acceptedDay,s.day)&&str(c.label,200)&&int(c.days,0,1))||!Array.isArray(r.history)||r.history.length>32||!r.history.every(h=>exact(h,['day','title','text'])&&int(h.day,r.acceptedDay,s.day)&&str(h.title,160)&&str(h.text,5000)))return false;
  if(new Set(r.choices.map(c=>c.sceneId+':'+c.id)).size!==r.choices.length||r.choices.some((c,i)=>i&&c.day<r.choices[i-1].day)||r.choices.some(c=>!({guardian:['living','record'],register:['available','unavailable'],decision:['decision'],contact:['available']})[c.sceneId].some(mode=>scene(r,c.sceneId,mode).choices.some(x=>x.id===c.id&&x.label===c.label&&x.days===c.days))))return false;
  const acquired=(id,sceneId,pick,timed)=>!has(id)||r.choices.some(c=>c.sceneId===sceneId&&pick.includes(c.id)&&c.day<=evidenceFor(r,id).day-(timed?1:0)&&(!timed||c.days===1));
  if(!acquired('guardian_account','guardian',['object','names'],true)||!acquired('guardian_unavailable','guardian',['object','names'],false)||!acquired('register_inspected','register',['inspect'],true)||!acquired('register_unavailable','register',['inspect'],false)||!acquired('custodian_account','contact',['ask'],true)||!acquired('custodian_refusal','contact',['ask'],true))return false;
  if(r.choices.some(c=>c.sceneId==='register'&&(!g||c.day<evidenceFor(r,has('guardian_account')?'guardian_account':'guardian_unavailable').day)||c.sceneId==='contact'&&(!has('custodian_verified')||c.day<evidenceFor(r,'custodian_verified').day)))return false;
  const guardianPerson=r.cast.guardian&&s.life.people.find(p=>p.id===r.cast.guardian.id),knownKeeper=r.cast.lead&&[s.realm?.sites[r.locationId]?.keeper,...(s.realm?.sites[r.locationId]?.keeperArchive||[])].find(p=>p?.id===r.cast.lead.id);
  if(has('guardian_account')&&guardianPerson?.alive===false&&int(guardianPerson.deathDay)&&evidenceFor(r,'guardian_account').day>=guardianPerson.deathDay)return false;
  if(has('register_inspected')){const n=publicArchivist(r.cast.archivist),end=n?Math.min(n.retireDay,n.retiredDay??Infinity):(Math.floor(r.cast.archivist.capturedDay/(55*365))+1)*55*365;if(evidenceFor(r,'register_inspected').day>=end)return false;}
  if(has('custodian_account')&&knownKeeper?.retiredDay!==undefined&&evidenceFor(r,'custodian_account').day>=knownKeeper.retiredDay)return false;
  if(has('custodian_verified')&&(evidenceFor(r,'counterfoil_reference').day!==evidenceFor(r,'register_inspected').day||evidenceFor(r,'custodian_verified').day!==evidenceFor(r,'register_inspected').day))return false;
  if(has('custodian_consent')&&evidenceFor(r,'custodian_consent').day!==evidenceFor(r,'custodian_account').day)return false;
  if(r.cast.lead&&r.cast.lead.capturedDay!==evidenceFor(r,'custodian_verified').day||terminal&&[...r.evidence,...r.history,...r.choices].some(e=>e.day>r.completedDay))return false;
  const validProposal=p=>exact(p,['runId','sceneId','mode','sceneSnapshot'])&&p.runId===r.id&&['guardian','register','decision','contact'].includes(p.sceneId)&&({guardian:['living','record'],register:['available','unavailable'],decision:['decision'],contact:['available']})[p.sceneId].includes(p.mode)&&same(p.sceneSnapshot,scene(r,p.sceneId,p.mode))&&(p.sceneId==='guardian'?r.step==='guardian':p.sceneId==='register'?r.step==='register':r.step==='decision')&&(p.sceneId!=='guardian'||p.mode!=='living'||!!r.cast.guardian)&&(p.sceneId!=='register'||p.mode!=='available'||!!r.cast.archivist)&&(p.sceneId!=='contact'||!!r.cast.lead);
  if(v.pending!==null&&(!validProposal(v.pending)||r.status!=='active'||v.project!==null||!preserveOriginEvent(s,s.event)))return false;
  if((v.pending!==null)!==!!s.event?.id.startsWith('origin_'))return false;
  if(v.project!==null){const p=v.project;if(!exact(p,['runId','kind','choice','mode','title','locationId','totalDays','completedDays','remainingDays','startedDay','proposal'])||r.status!=='active'||v.pending!==null||p.runId!==r.id||!['guardian','register','contact'].includes(p.kind)||!validProposal(p.proposal)||p.proposal.sceneId!==p.kind||p.mode!==p.proposal.mode||p.locationId!==r.locationId||p.title!==p.proposal.sceneSnapshot.title||p.totalDays!==1||p.completedDays!==0||p.remainingDays!==1||!int(p.startedDay,r.acceptedDay,s.day)||!p.proposal.sceneSnapshot.choices.some(c=>c.id===p.choice&&c.days===1))return false;}
  return true;
 }catch{return false;}
}
