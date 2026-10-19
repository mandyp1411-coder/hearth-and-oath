import { canonicalMentorId } from './npc-continuity.js';
import { CLASS_CATALOG, classView } from './classes.js';
import { seededRoll, generatePersonName } from './world.js';

// Formation follows an earned calling. It never removes an old qualification,
// replays initiation rewards, or applies twelve simultaneous combat bonuses.
const FORMATIONS = Object.freeze({
 guardian: { title:'The door left open', problem:'An evacuation shelter has one broad door and a narrow stair. The watch wants a single orderly queue; several injured residents cannot stand in it.', first:'Spend six days walking the shelter routes with the residents and recording the places where a shield line would trap them.', dilemma:'Your mentor asks whether protection means controlling the crowd or making the escape usable by the people in it.', a:['access','Build a second accessible evacuation route','Keep resident choice and assign helpers to the difficult stair. Village standing +5; your mentor records an adaptable practice.'], b:['accountability','Give the watch a named responsibility for every household','Make a public roster and a clear handover instead of treating anyone as expendable. Order standing +5; your mentor records accountable command.'], practice:'Spend eight days testing the agreed evacuation with volunteers. Nobody is ordered to play a casualty.', technique:'The open-door formation', faction:'order' },
 berserker: { title:'Where the anger ends', problem:'A ridge rescuer has been using battle fury to work through every injury. The rescued families praise the rescuer; the rope team is afraid to speak.', first:'Spend six days with the ridge team learning its stop signals and hearing the rescuer’s account away from an audience.', dilemma:'Power has kept people alive, but exhaustion has begun to endanger the next person on the rope.', a:['restraint','Agree on a stop signal the whole team can use','No rescuer has to surrender dignity to admit a limit. Village standing +5; your practice centers shared restraint.'], b:['rotation','Share the dangerous work across a trained rotation','Teach others instead of making one furious body carry every rescue. Order standing +5; your practice centers responsibility.'], practice:'Spend eight days rehearsing the agreed rescue routine without inducing fury or demanding anyone work injured.', technique:'The returning breath', faction:'order' },
 knight: { title:'The seal and the wagon', problem:'A sealed convoy order gives wealthy passengers first passage over a damaged bridge. Its drivers know that the unlisted households behind them have nowhere safe to wait.', first:'Spend six days checking the bridge and taking separate statements from drivers and waiting households.', dilemma:'Your mentor can certify an orderly convoy. The order’s seal cannot make its priorities fair.', a:['petition','Challenge the priority openly with named witnesses','Keep a public challenge in the order’s record. Village standing +5; your authority is answerable to the people delayed.'], b:['shared-duty','Negotiate a shared escort while the seal is reviewed','The drivers and watch explicitly agree who will protect each group. Order standing +5; your practice values negotiated duty.'], practice:'Spend eight days carrying out the agreed escort and returning the drivers’ account, including its disagreements.', technique:'The witnessed challenge', faction:'order' },
 paladin: { title:'Mercy before the bell', problem:'The order offers sanctuary to frightened travelers but wants a blanket confession before opening the gate. Your oath protects the vulnerable; it does not grant ownership of another person’s secrets.', first:'Spend six days hearing what sanctuary seekers need and which questions they freely agree to answer.', dilemma:'The bellkeeper says exceptions weaken the order. A traveler asks whether mercy must always be bought with disclosure.', a:['sanctuary','Defend sanctuary without compulsory disclosure','Your personal oath takes precedence over this gate rule. Village standing +5; an explicit disagreement remains with the order.'], b:['reform','Ask the order to adopt a witnessed consent rule','Build an accountable institutional reform with those seeking shelter. Order standing +5; willing disclosure remains optional.'], practice:'Spend eight days serving the agreed sanctuary rota. Never name a person who refused to be named.', technique:'The unclaimed sanctuary', faction:'order' },
 healer: { title:'The remedy someone refused', problem:'A proven remedy would ease a patient’s pain. The patient refuses it after an earlier treatment was imposed without explanation; the clinic wants you to record the refusal as ignorance.', first:'Spend six days listening to consenting patients and documenting what each treatment actually offers.', dilemma:'Your mentor asks how a healer remains useful when a patient makes a choice the healer would not make.', a:['consent','Offer a different care plan and honor the refusal','The patient retains control of treatment. Village standing +5; your notes preserve consent and uncertainty.'], b:['advocacy','Make the clinic answer for the earlier imposed treatment','A willing patient advocate joins the review; nobody’s details are published without permission. Academy standing +5; your notes preserve accountability.'], practice:'Spend eight days delivering the care patients chose and handing over their actual instructions to the next shift.', technique:'The patient’s ward', faction:'academy' },
 elementalist: { title:'The storm below the roof', problem:'A storm ward protects the academy by grounding its excess force below a riverside workers’ quarter. The diagram calls that quarter an unoccupied outlet.', first:'Spend six days measuring the ward and comparing its diagram with the households actually living beneath it.', dilemma:'The ward works exactly as written. Its written purpose has concealed the people who bear its cost.', a:['redesign','Ground the force through a safer shared route','The affected households approve the new outlet. Village standing +5; your practice prioritizes the lived terrain.'], b:['disclose','Require a public corrected diagram and accountable inspection','Name the false assumption before an independent inspection. Academy standing +5; your practice prioritizes evidence.'], practice:'Spend eight days supervised by your mentor safely re-grounding and testing the agreed ward. No house is used as a trial target.', technique:'The named grounding', faction:'academy' },
 druid: { title:'A crossing and a nest', problem:'The grove keeps a nesting bank undisturbed. A displaced household needs an accessible crossing; keeping the old path closed is beginning to exclude them from the settlement.', first:'Spend six days observing the nesting bank and planning a crossing with the household who must use it.', dilemma:'A bargain with a living place also has to make room for the people who live beside it.', a:['adapt','Build an alternate crossing and keep the nesting bank quiet','Protect access and habitat together. Village standing +5; your practice learns a new path.'], b:['seasonal','Agree on a seasonal crossing with a real maintenance promise','The household and grove keeper explicitly share the upkeep. Academy standing +5; your practice keeps a negotiated calendar.'], practice:'Spend eight days marking and maintaining the agreed crossing with local volunteers; the nesting trees remain intact.', technique:'The two-way bargain', faction:'academy' },
 necromancer: { title:'The witness who leaves', problem:'A willing ancestor can identify the people responsible for a vanished record. Their descendants want every detail; the ancestor agrees to answer one question and then depart.', first:'Spend six days checking the named record with living witnesses before asking the ancestor to speak.', dilemma:'The answer may help the region. Your teacher reminds you that a willing witness does not become your property.', a:['release','Ask the agreed question and honor the requested release','Keep the testimony within its stated permission. Village standing +5; your discipline records a limit it will not cross.'], b:['living-proof','Use living evidence and let the ancestor decline entirely','Preserve a case the living can answer without summoning. Academy standing +5; your discipline records an alternative to power.'], practice:'Spend eight days preserving the permitted evidence and the witness’s explicit boundary. This work neither binds a soul nor announces secret research to guards.', technique:'The released testimony', faction:'academy' },
 thief: { title:'The workers’ empty purse', problem:'Your teacher finds the ledger of wages a counting house has withheld. Stealing its strongbox would recover more coin than the workers are owed and leave the clerk accused.', first:'Spend six days comparing the copied ledger with the workers’ accounts and the clerk’s own record.', dilemma:'An opening is an opportunity. It is not permission to make the nearest powerless person carry the blame.', a:['restitution','Recover the named wages through a witnessed negotiated return','Workers receive an accountable settlement; no extra purse is taken. Village standing +5; your practice refuses a convenient scapegoat.'], b:['evidence','Carry the evidence to an advocate chosen by the workers','Let the workers control the case and its publicity. Underworld standing +5; your practice values discreet evidence.'], practice:'Spend eight days supporting the agreed return or case. These are lawful recovery exercises, not an automatic profitable theft.', technique:'The unburdened opening', faction:'underworld' },
 ranger: { title:'A road whose names were lost', problem:'A map marks the forest road safe, but its maker never asked the household that cannot use its steepest ford. A courier disappeared while trying the unmapped alternative.', first:'Spend six days surveying both trails with people who will actually travel them and checking the courier’s last known route.', dilemma:'Your mentor asks whether the best route is the quickest line on the page or a path others can reliably follow.', a:['accessible','Mark the accessible route and its honest travel costs','Keep the longer safe route visible to everyone. Village standing +5; your practice treats access as part of survival.'], b:['local-guides','Train willing local guides and preserve their route knowledge','Name the guides instead of claiming their work as your discovery. Underworld standing +5; your practice respects local knowledge.'], practice:'Spend eight days guiding real volunteers over the agreed route and correcting the posted map; a missing person is not declared found without evidence.', technique:'The return trail', faction:'underworld' },
 assassin: { title:'The commission without a name', problem:'A patron offers an urgent contract against a supposed plotter. The dossier omits the target’s testimony and the patron’s interest in their death.', first:'Spend six days checking the evidence discreetly and hearing the threatened household’s account; accept no lethal contract.', dilemma:'Your teacher asks whose purpose precision serves when the most convenient story belongs to the person paying.', a:['refuse','Refuse the lethal commission and warn the threatened household','Keep an explicit boundary against an unverified killing. Village standing +5; your practice values informed restraint.'], b:['expose','Preserve the false dossier for an advocate the household chooses','The household decides how much of the case becomes public. Underworld standing +5; your practice uses discretion to protect evidence.'], practice:'Spend eight days securing the agreed warning or evidence transfer. Nobody is killed by a menu choice.', technique:'The withheld blade', faction:'underworld' },
 bard: { title:'The verse that is not yours', problem:'The harbor council wants a triumphant memorial. A bereaved singer wrote a quieter verse and asks that their family’s names not be performed to an audience.', first:'Spend six days listening to willing singers and separating public verses from words their authors want kept private.', dilemma:'A song can preserve a memory and still take something from the person whose memory it claims to honor.', a:['private-verse','Keep the private verse private and perform what was freely offered','The memorial does not purchase another person’s grief. Village standing +5; your practice honors authorship.'], b:['shared-authorship','Give willing singers control of the performance and its credits','The council shares authorship instead of speaking for every household. Underworld standing +5; your practice makes its sources visible.'], practice:'Spend eight days rehearsing the agreed memorial with willing singers and returning copies to their actual authors.', technique:'The unborrowed verse', faction:'underworld' },
});

const COMPANION_IDS = ['mira','orrin','kest'];
const FORMATION_STAGES = ['field','decision','practice','review','attest','completed','withdrawn'];
const COMPANION_STAGES = ['request','field','decision','finalize','completed','declined','withdrawn'];
const plain = v => Boolean(v && typeof v==='object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v)));
const integer = (v,max=2000000) => Number.isInteger(v) && v>=0 && v<=max;
const text = (v,max=2000) => typeof v==='string' && v.length>0 && v.length<=max;
const hasCalling = (s,id) => s.progression?.learnedClassIds?.includes(id);
const person = (s,id) => s.companions?.find(p=>p.id===id);
const definition = id => CLASS_CATALOG.find(c=>c.id===id);
const place = (s,id) => s.world?.locations?.find(p=>p.id===id);
const livingPlace = p => p && !['destroyed','evacuated'].includes(p.status);
const mentor = (s,id) => classView(s).callings.find(c=>c.id===id)?.mentor;
const actorSummary=m=>({id:m.id,name:m.name,locationId:m.locationId});
const supervisor=r=>r.supervisor||{id:r.mentorId,name:r.mentorName,locationId:r.locationId};
const supervisionNeeded=(s,id)=>{const r=s.fellowship.formations[id],m=mentor(s,id);return !!r&&(supervisor(r).id!==m.id||m.available===false);};
const supervisionReason=(s,id)=>{const r=s.fellowship.formations[id],m=mentor(s,id);return m.available===false?`${m.name} cannot currently supervise; their earlier record is preserved.`:`Explicitly agree the supervision handover from ${supervisor(r).name} to ${m.name} before continuing.`;};
function handoverAction(s,id){const m=mentor(s,id),r=s.fellowship.formations[id];return {...action(s,`fellowship_handover_${id}`,`Ask ${m.name} to take over formation supervision`,`${r.mentorName} remains the original mentor. Preserve all ${r.workDays} completed days, choices, deadline and witness permissions; no fee or reward is added and no private relationship transfers.`,m.locationId),...(m.available===false?{disabledReason:'The current mentor cannot take part.'}:{})};}

const blocked = s => s.phase==='retired' || s.event || s.battle || s.dungeon || s.conversations?.pending || s.timeline?.journey || s.workshop?.project || s.careers?.batch || s.life?.plan;
const eligibleAge = s => (s.age || 0)>=18 && s.phase!=='retired';
const addFact = (s,fact) => { if(!s.fellowship.facts.includes(fact))s.fellowship.facts.push(fact); };
const notice = (s,ctx,title,body) => {s.notice=body;ctx.journal?.(title,body,'relationship');};
const remember = (s,id,body,n,ctx) => {
 const p=person(s,id);if(!p)return;
 if(ctx.remember)ctx.remember(id,body,n);
 else {p.memories ||= [];if(!p.memories.includes(body))p.memories.push(body);p.memories=p.memories.slice(-30);p.relationship=Math.max(-100,Math.min(100,(p.relationship||0)+n));}
};
function mentorMemory(s,id,body,n=0) {
 if(!s.conversations?.relationships)return;
 const m=s.fellowship?.formations?.[id]?supervisor(s.fellowship.formations[id]):mentor(s,id);if(!m)return;
 const r=s.life?.people?.find(p=>p.id===m.id)||(s.conversations.relationships[m.id] ||= {bond:40,memories:[],knownFacts:[]});
 r.bond=Math.max(0,Math.min(100,r.bond+n));
 if(!r.memories.includes(body))r.memories.push(body);r.memories=r.memories.slice(-30);
}
function safeLocation(s,preferred) {
 return [preferred,s.life?.home?.locationId,s.hero?.birthplaceId,'home','brook','camp','sanctuary','city'].map(id=>place(s,id)).find(livingPlace)?.id || s.world?.locations?.find(livingPlace)?.id || preferred;
}
function companionLocation(s,id) {
 const p=person(s,id);
 return p?.recruited && p.active ? s.locationId : safeLocation(s,s.hero?.birthplaceId);
}
// Journal directions must use the same destination as this undertaking's own actions.
export const fellowshipCompanionLocation = companionLocation;
function companionContext(s,id) {
 const p=person(s,id),r=s.fellowship.companions[id];
 const facts=p?.knownFacts || [];
 const knownCondition=s.hero?.condition && (facts.includes(s.hero.condition.type) || facts.includes(`condition_${s.hero.condition.type}`) || id==='mira'&&s.flags?.miraKnowsCondition);
 const condition=knownCondition?` ${p.name} already knows about your ${s.hero.condition.type==='vampire'?'vampirism':'moonbound condition'} and asks you to agree on safe hours; this private knowledge is not sent to any official.`:'';
 const history=(p?.memories || []).find(m=>/saved|protect|help|promise|consent/i.test(m));
 const memory=history?` One memory informs the request: “${history}”`:'';
 const ending=s.campaign?.ending?` Your region still lives with ${s.campaign.ending.title}; ${id==='mira'?'protection now includes the survivors of that decision':id==='orrin'?'the clinic cannot erase those losses':'missing and displaced households must be distinguished from confirmed deaths'}.`:'';
 const refusal=id==='mira'&&s.flags?.miraWithdrawn?' Their stated refusal to travel after unwilling soul binding remains. This local request does not erase that boundary.':'';
 return `${condition}${memory}${ending}${refusal}${id==='kest'&&r?` The record names ${r.subjectName}; it does not grant you ownership of their future.`:''}`;
}

export function initializeFellowship(s,{reset=false}={}) {
 if(reset || s.fellowship===undefined)s.fellowship={version:1,formations:{},companions:{},project:null,pending:null,facts:[],inherited:[]};
}

function action(s,id,label,description,locationId,days=0) {
 const reason=!eligibleAge(s)?'Longer calling and companion commitments open in adulthood.':locationId&&s.locationId!==locationId?`Meet here in ${place(s,locationId)?.name || locationId}.`:null;
 return {id,label,description,days:0,cost:0,durationDays:days,quotedCost:0,timeDescription:days?`${days} actual days; pauses at a birthday or known calendar need.`:'A decision; no day passes.',group:'Fellowship & formation',...(reason?{disabledReason:reason}:{})};
}
export function fellowshipActions(s) {
 if(!s.fellowship || blocked(s))return [];
 const f=s.fellowship;
 if(f.project){
  const p=f.project,needs=p.kind==='formation'&&supervisionNeeded(s,p.subjectId),next=action(s,'fellowship_continue',`Continue ${projectTitle(s)}`,`${p.workedDays}/${p.totalDays} actual days completed. Keep the same task, location and chosen agreement. No extra fee or reward is charged at an interruption.`,p.locationId,p.totalDays-p.workedDays);
  return [...(needs?[handoverAction(s,p.subjectId)]:[]),{...next,...(needs?{disabledReason:supervisionReason(s,p.subjectId)}:{})},action(s,'fellowship_withdraw','Discuss withdrawing from this commitment','Leave the project without losing earned classes or companions. The unfinished agreement and completed work remain in your history.',null)];
 }
 if(f.pending)return [];
 const result=[];
 for(const c of CLASS_CATALOG) {
  if(!hasCalling(s,c.id))continue;
  const r=f.formations[c.id],m=mentor(s,c.id);
  if(r&&!['completed'].includes(r.stage)&&supervisionNeeded(s,c.id)){result.push(handoverAction(s,c.id));continue;}
  if(!r&&m.available===false)continue;
  if(!r)result.push(action(s,`fellowship_formation_${c.id}`,`Learn the longer ${c.name.toLowerCase()} practice`,`${FORMATIONS[c.id].title}. ${FORMATIONS[c.id].problem} Your earned calling stays intact. A chosen formation takes 6 days of inquiry, 8 days of practice and 2 days of review; no combat gifts stack. Mentor: ${m.name}.`,m.locationId,16));
  else if(r.stage==='withdrawn')result.push(action(s,`fellowship_resume_${c.id}`,`Return to the unfinished ${c.name.toLowerCase()} formation`,'Discuss a new agreement before continuing the remaining work. Your earlier days and disagreements remain recorded.',m.locationId));
  else if(r.stage==='decision'||r.stage==='review')result.push(action(s,`fellowship_discuss_${c.id}`,r.stage==='decision'?'Discuss what your inquiry found':'Bring the practiced formation to your mentor','Use the actual field record and decide what kind of recognition to seek.',m.locationId));
 }
 for(const id of COMPANION_IDS) {
  const p=person(s,id),r=f.companions[id];if(!p || p.alive===false || p.refused)continue;
  if(!r)result.push(action(s,`fellowship_companion_${id}`,`Ask what ${p.name} needs time for`,id==='mira'?'A protector is being asked to serve an institution and a neighborhood at once. Negotiate whose safety the promise covers.':id==='orrin'?'The clinic is relying on one exhausted healer. Negotiate a rota or teach willing relief staff.':'A route ledger may explain what happened to their sibling. Help without assuming a family reunion is owed.',companionLocation(s,id),8));
  else if(r.stage==='decision')result.push(action(s,`fellowship_companion_${id}`,`Talk with ${p.name} about the next step`,'Your shared work is complete. Their wishes decide what can be made public and what remains private.',companionLocation(s,id)));
 }
 return result;
}
function projectTitle(s) {
 const p=s.fellowship.project;
 return p.kind==='formation'?`${definition(p.subjectId).name.toLowerCase()} ${p.phase}`:`${person(s,p.subjectId)?.name || p.subjectId}’s request`;
}
function startProject(s,kind,subjectId,phase,totalDays,ctx) {
 const record=kind==='formation'?s.fellowship.formations[subjectId]:s.fellowship.companions[subjectId];
 const locationId=kind==='formation'?supervisor(record).locationId:companionLocation(s,subjectId);
 record.locationId=locationId;
 s.fellowship.pending=null;
 s.fellowship.project={kind,subjectId,phase,locationId,totalDays,workedDays:0,startedDay:s.day};
 continueProject(s,ctx);
}
function completeFormation(s,id,ctx) {
 const r=s.fellowship.formations[id],c=definition(id);
 if(r.completedDay!==null)return;
 r.stage='completed';r.completedDay=s.day;r.technique=FORMATIONS[id].technique;
 addFact(s,`formation:${id}:${r.interpretation}`);addFact(s,`formation:${id}:${r.recognition}`);
 const branch=FORMATIONS[id][r.interpretation===FORMATIONS[id].a[0]?'a':'b'];
 ctx.standing?.(r.interpretation===FORMATIONS[id].a[0]?'villagers':FORMATIONS[id].faction,5);
 const late=s.obligations?.some(o=>o.id===`fellowship_formation_${id}`&&o.missed);
 mentorMemory(s,id,`You completed ${FORMATIONS[id].title} through ${r.approach} practice, chose ${r.interpretation}, and asked for ${r.recognition} recognition.${late?' We kept the earlier missed deadline in the account.':''}`,r.recognition==='public'?6:4);
 for(const p of s.companions || [])if(p.alive!==false&&p.recruited&&p.active)remember(s,p.id,`Formation: ${id}. I watched you keep the ${r.interpretation} agreement through real work, without taking ownership of its witnesses.`,1,ctx);
 ctx.finishObligation?.(`fellowship_formation_${id}`);
 notice(s,ctx,`${c.name} formation: ${r.technique}`,`${supervisor(r).name} recognizes sixteen actual days of inquiry, practice and review. ${branch[1]}. ${r.recognition==='public'?'The permitted account and your technique are publicly credited.':'Your mentor keeps a private signed account; household and witness names remain private.'}${late?' The earlier missed service deadline stays in the account; recognition does not rewrite it.':''} The completed practice also earns a covering formation: once per battle, a living party can spend 6 MP to share five ward and cleanse bleeding.`);
}
function completeCompanion(s,id,ctx) {
 const r=s.fellowship.companions[id],p=person(s,id);
 if(r.completedDay!==null)return;
 r.stage='completed';r.completedDay=s.day;
 addFact(s,`companion:${id}:${r.resolution}`);
 ctx.finishObligation?.(`fellowship_companion_${id}`);
 const memories={mira:r.resolution==='neighborhood'?'You helped me protect a neighborhood without making its residents surrender their choices.':'You helped me negotiate a public protection agreement the order could answer for.',orrin:r.resolution==='shared-rota'?'We made a clinic rota that allowed me to rest and kept consenting patients’ instructions intact.':'We taught willing relief staff and gave them credit instead of making one healer indispensable.',kest:r.resolution==='private-letter'?`You helped me send ${r.subjectName} a private letter and left the answer to them.`:`You helped me keep a careful route record for ${r.subjectName}, without publishing a reunion claim.`};
 const late=s.obligations?.some(o=>o.id===`fellowship_companion_${id}`&&o.missed);
 remember(s,id,memories[id]+(late?' The work was eventually done; the earlier missed deadline remains part of that memory.':''),8,ctx);
 notice(s,ctx,'A companion’s life has room to move',`${p.name} completes the agreed eight-day request with you. ${memories[id]} ${r.boundary}${late?' Their earlier missed deadline remains recorded, even though you eventually did the work.':''} No agreement makes a companion consent to every future action.`);
}
function continueProject(s,ctx) {
 const f=s.fellowship,p=f.project;if(!p || s.phase==='retired')return;
 const r=p.kind==='formation'?f.formations[p.subjectId]:f.companions[p.subjectId];
 if(p.kind==='formation'&&supervisionNeeded(s,p.subjectId)){s.notice=supervisionReason(s,p.subjectId);return;}
 if(p.kind==='companion' && person(s,p.subjectId)?.alive===false) {r.stage='withdrawn';f.project=null;notice(s,ctx,'An unfinished request',`The work with ${person(s,p.subjectId)?.name || p.subjectId} remains unfinished after their death. No completion or reward is granted.`);return;}
 if(!livingPlace(place(s,p.locationId))) {
  const next=p.kind==='formation'?mentor(s,p.subjectId).locationId:safeLocation(s,p.locationId);
  p.locationId=next;r.locationId=next;if(p.kind==='formation'&&r.supervisor)r.supervisor.locationId=next;
  notice(s,ctx,'A commitment displaced',`The work cannot continue at a lost place. Its ${p.workedDays} completed days remain; meet again in ${place(s,next)?.name || next}.`);
 }
 if(s.locationId!==p.locationId) {s.notice=`Continue the agreed work in ${place(s,p.locationId)?.name || p.locationId}.`;return;}
 const before=s.day;
 ctx.spendDays?.(p.totalDays-p.workedDays,{outdoors:false});
 const actual=Math.max(0,Math.min(p.totalDays-p.workedDays,s.day-before));
 p.workedDays+=actual;r.workDays+=actual;
 if(s.phase==='retired') {r.stage='withdrawn';f.project=null;f.pending=null;return;}
 if(p.kind==='companion'&&person(s,p.subjectId)?.alive===false) {
  r.stage='withdrawn';f.project=null;f.pending=null;
  notice(s,ctx,'Work that cannot be completed together',`${person(s,p.subjectId)?.name || p.subjectId} died during the agreed time. The actual days remain recorded, but no completion or relationship reward is granted.`);
  return;
 }
 if(p.kind==='formation'&&supervisionNeeded(s,p.subjectId)){s.notice='The exact supervisor became unavailable during this segment. Its actual completed days remain; no recognition or relationship reward is granted. Arrange an explicit living supervision handover.';return;}
 if(p.workedDays<p.totalDays) {s.notice=`${projectTitle(s)} pauses after ${p.workedDays}/${p.totalDays} actual days. The remaining work is still owed; a birthday or calendar need is not a completed task.`;return;}
 f.project=null;
 if(p.kind==='formation') {
  if(p.phase==='field')r.stage='decision';
  else if(p.phase==='practice')r.stage='review';
  else completeFormation(s,p.subjectId,ctx);
 } else if(p.phase==='field')r.stage='decision';
 else completeCompanion(s,p.subjectId,ctx);
 flushFellowshipEvent(s,ctx);
}

export function applyFellowshipAction(s,id,ctx={}) {
 if(typeof id!=='string' || !id.startsWith('fellowship_'))return false;
 if(!s.fellowship || blocked(s))return true;
 const available=fellowshipActions(s).find(a=>a.id===id);
 if(!available || available.disabledReason) {s.notice=available?.disabledReason || 'That fellowship commitment is not available.';return true;}
 const f=s.fellowship;
 if(id.startsWith('fellowship_handover_')){const subjectId=id.slice('fellowship_handover_'.length);f.pending={kind:'formation',subjectId,node:'handover',mentor:actorSummary(mentor(s,subjectId))};flushFellowshipEvent(s,ctx);return true;}
 if(id==='fellowship_continue') {continueProject(s,ctx);return true;}
 if(id==='fellowship_withdraw') {
  const p=f.project;
  f.pending={kind:p.kind,subjectId:p.subjectId,node:'withdraw'};
  flushFellowshipEvent(s,ctx);return true;
 }
 const match=/^fellowship_(formation|resume|discuss|companion)_([a-z]+)$/.exec(id);
 if(!match)return false;
 const subjectId=match[2];
 if(match[1]==='companion') {
  if(!f.companions[subjectId])f.companions[subjectId]={stage:'request',approach:null,resolution:null,requestedDay:s.day,completedDay:null,workDays:0,locationId:companionLocation(s,subjectId),boundary:null,subjectName:subjectId==='kest'?generatePersonName(s.seed,`kest-sibling-${s.dynasty?.generation || 1}`,person(s,'kest')):person(s,subjectId).name,caseVariant:seededRoll(s.seed,`fellowship-${subjectId}-${s.dynasty?.generation || 1}`,3)};
  f.pending={kind:'companion',subjectId,node:f.companions[subjectId].stage==='decision'?'decision':'request'};
 } else {
  if(!f.formations[subjectId]) {
   const m=mentor(s,subjectId);
   f.formations[subjectId]={stage:'field',approach:null,interpretation:null,recognition:null,mentorId:m.id,mentorName:m.name,supervisor:actorSummary(m),locationId:m.locationId,startedDay:s.day,completedDay:null,workDays:0,technique:null};
  }
  const r=f.formations[subjectId];
  f.pending={kind:'formation',subjectId,mentor:actorSummary(supervisor(r)),node:match[1]==='resume'?'resume':match[1]==='formation'?'start':r.stage==='review'?'review':'decision'};
 }
 flushFellowshipEvent(s,ctx);return true;
}

function choice(id,label,description) {return {id,label,description};}
function formationScene(s,id,node) {
 const r=s.fellowship.formations[id],c=definition(id),d=FORMATIONS[id];
 const companions=(s.companions || []).filter(p=>p.alive!==false&&p.recruited&&p.active);
 const voices=companions.map(p=>`${p.name} ${p.id==='mira'?'asks which vulnerable people your agreement will protect':p.id==='orrin'?'asks what rest, care and willing participation the work allows':'asks who controls the record and whose private life it might expose'}.`).join(' ');
 const expedition=Object.entries(s.flags?.dungeonRecords || {}).find(([,record])=>record.complete&&record.facts?.objectiveMethod);
 const discovery=expedition?` Your ${expedition[1].facts.objectiveMethod} approach to an earlier expedition is in the account; this practice must answer for what it preserves as well as what it takes.`:'';
 const m=supervisor(r);
 const context=`${m.name} is teaching in ${place(s,r.locationId)?.name || r.locationId}. Your earned ${c.name.toLowerCase()} gifts and livelihood remain intact.${s.campaign?.ending?` This work takes place after ${s.campaign.ending.title}; it does not undo the region’s losses.`:''}${discovery}${voices?' '+voices:''}`;
 if(node==='start'||node==='resume')return {title:d.title,body:`${context}\n\n${d.problem}\n${d.first}\nYou will then choose a practice, spend eight further days carrying it out, and return for two days of review. A service route creates a visible 90-day promise; an independent route has no institution-owned deadline. Both can earn the same named technique.`,choices:[choice('service','Make a named service commitment','Sixteen actual days, with a 90-day promise. Mentor trust is strengthened by completing the work; no technique is removed if the deadline is missed.'),choice('independent','Agree to an independent supervised practice','Sixteen actual days without a new service deadline. Keep your own pace and record who you are accountable to.'),choice('later','Leave the formation for another time','Keep your earned calling and all previous work. No new promise, time or reward is granted.')]};
 if(node==='decision')return {title:`${d.title}: the difficult part`,body:`${context}\n\nYour six-day inquiry is complete. ${d.dilemma}\n${d.practice}`,choices:[choice('a',d.a[1],d.a[2]+' Eight actual practice days follow; standing is awarded only after final review.'),choice('b',d.b[1],d.b[2]+' Eight actual practice days follow; standing is awarded only after final review.')]};
 return {title:`${d.title}: whose account survives`,body:`${context}\n\nYou have completed the inquiry and eight days of ${r.interpretation} practice. ${m.name} offers recognition of “${d.technique}.” The final two-day review can keep a private signed account or a public account using only material its witnesses permitted.`,choices:[choice('public','Seek public, accountable recognition','Spend two actual days reviewing the permitted account. Earn one named technique, 5 standing and 6 mentor trust; no combat or attribute bonus is stacked.'),choice('private','Keep an independent signed account','Spend two actual days with your mentor and retain a private practice. Earn the same technique and 5 standing, with 4 mentor trust. Private witness names stay private.')]};
}
function companionScene(s,id,node) {
 const p=person(s,id),r=s.fellowship.companions[id],context=companionContext(s,id);
 if(node==='request') {
  const body={mira:`${p.name} is asked to protect an official storehouse while the nearby residents wait without an agreed refuge. “I want a promise that names the people it protects. I cannot promise the order every hour I have.”`,orrin:`${p.name} has become the clinic’s answer to every empty shift. “I want people cared for. I also want to be allowed to stop working. Help me make a plan that does not depend on my collapse.”`,kest:`${p.name} finds a route ledger that names ${r.subjectName}, their sibling. ${['A later entry suggests they chose another household and stopped sending letters.','The last reliable entry shows them helping a displaced caravan; later rumors contradict one another.','A porter recalls that they asked not to have their new address posted on a public board.'][r.caseVariant]} “Help me find what is true. An answer is not the same as a right to bring them home.”`};
  return {title:`${p.name}: time for a life of their own`,body:`${body[id]}${context}\n\nAn agreed request takes six days of shared work and two days to carry out the final decision. Promising makes a visible 60-day obligation; an honest refusal changes no combat slot and does not invent a betrayal.`,choices:[choice('promise','Promise the eight-day shared request','Work together for six actual days, then negotiate the next step. Record a 60-day promise.'),choice('no-deadline','Offer the work without promising a deadline','They accept a clear agreement about what you can manage. Do the same actual work without an extra deadline.'),choice('decline','Explain that I cannot take this on','They keep their goal and a remembered honest boundary. No promised time or reward is granted.')]};
 }
 const decisions={mira:[['neighborhood','Make a resident-led refuge agreement','The residents decide the refuge rules. The order hears a clear boundary rather than owning the neighborhood.'],['order-agreement','Make the order answer for a written protection rota','Publish the agreed duties with consenting residents and named responsible officers.']],orrin:[['shared-rota','Keep a shared rota with protected rest','Patients choose their care; named relief staff take real turns, and no one is required to work through illness.'],['teach-relief','Teach willing relief staff and give them credit','Create a small supervised care routine that shares knowledge without forcing patients to become teaching examples.']],kest:[['private-letter','Send one private letter without demanding a reunion',`Give ${r.subjectName} a way to answer or remain silent. A reply and a reunion are never guaranteed by this choice.`],['careful-record','Keep a careful private record and stop following rumors','Preserve what is known and what is uncertain. Do not publish an address, death claim or reunion story.']]};
 return {title:`${p.name}: the promise has a boundary`,body:`Six real days of work are in the record.${context}\n\n${id==='kest'?'The reliable evidence supports a private invitation or a careful pause. It cannot require someone to return.':id==='orrin'?'The clinic can keep caring for people without making its whole future depend on one exhausted person.':'The people protected by an agreement must be able to say what safety means to them.'} Spend two further days carrying out an agreed answer.`,choices:decisions[id].map(([key,label,description])=>choice(key,label,description+' The completed request and its boundary stay in your companion’s memories.'))};
}
export function flushFellowshipEvent(s,ctx={}) {
 if(!s.fellowship || s.phase==='retired' || s.event || s.battle || s.conversations?.pending || s.dungeon || ctx.pendingNeed?.())return false;
 const f=s.fellowship;
 if(!f.pending && !f.project) {
  const formation=Object.entries(f.formations).find(([id,r])=>['decision','review'].includes(r.stage)&&!supervisionNeeded(s,id)&&s.locationId===mentor(s,id).locationId);
  const companion=Object.entries(f.companions).find(([id,r])=>r.stage==='decision'&&person(s,id)?.alive!==false&&s.locationId===companionLocation(s,id));
  if(formation)f.pending={kind:'formation',subjectId:formation[0],node:formation[1].stage,mentor:actorSummary(supervisor(formation[1]))};
  else if(companion)f.pending={kind:'companion',subjectId:companion[0],node:'decision'};
 }
 if(!f.pending)return false;
 const p=f.pending;
 if(p.node==='handover'){
  const r=f.formations[p.subjectId],from=supervisor(r),to=p.mentor;
  ctx.setEvent?.('fellowship_formation_handover','A named supervision handover','The earlier account remains',`${r.mentorName} remains the original formation mentor; ${from.name} was the last agreed supervisor. You have completed ${r.workDays} actual days. Ask ${to.name} to take over the remaining supervision in ${place(s,to.locationId)?.name||to.locationId}. Earlier work, choices, deadlines and witness permissions remain unchanged. No fee, reward, private confidence or relationship is inherited.`,[choice('accept',`Agree to ${to.name} as the new supervisor`,'Record this named handover and continue only the actual remaining work.'),choice('later','Leave supervision undecided','Keep the unfinished record paused; no day, fee, failure or reward is added.')]);return true;
 }
 if(p.node==='withdraw') {
  ctx.setEvent?.('fellowship_withdraw','An agreement can be renegotiated','Fellowship · an explicit boundary',`You have done ${f.project?.workedDays || 0} actual days of this segment. Withdrawing records the unfinished work without revoking any earned calling or making a companion your enemy. A promised deadline remains an honest part of the record.`,[choice('stay','Keep the agreed commitment','Continue the same work after this decision; no day or reward is granted by this answer.'),choice('withdraw','Withdraw and explain the boundary','Keep completed work and explicitly close the unfinished commitment. No completion reward is granted.')]);
  return true;
 }
 const scene=p.kind==='formation'?formationScene(s,p.subjectId,p.node):companionScene(s,p.subjectId,p.node);
 ctx.setEvent?.(`fellowship_${p.kind}_${p.node}`,scene.title,p.kind==='formation'?'A discipline after initiation':'Companion · a life beside yours',scene.body,scene.choices);
 return true;
}

export function applyFellowshipChoice(s,eventId,id,ctx={}) {
 if(!eventId?.startsWith('fellowship_') || !s.fellowship?.pending || s.phase==='retired')return false;
 const f=s.fellowship,p=f.pending;
 if(eventId!==`fellowship_${p.kind}_${p.node}` && !(p.node==='withdraw'&&eventId==='fellowship_withdraw'))return false;
 const legal=fellowshipEventIds()[eventId];if(!legal?.includes(id))return false;
 const r=p.kind==='formation'?f.formations[p.subjectId]:f.companions[p.subjectId];
 if(p.node==='withdraw') {
  f.pending=null;
  if(id==='stay') {s.notice='The same agreement continues. Its real remaining days have not been completed by this answer.';return true;}
  if(p.kind==='formation') {r.pausedPhase=f.project.phase;r.pausedWork=f.project.workedDays;r.stage='withdrawn';mentorMemory(s,p.subjectId,'You explicitly withdrew from an unfinished formation and kept its actual completed work in the record.');}
  else {r.stage='withdrawn';r.boundary='You explicitly withdrew from an unfinished request instead of claiming it was completed.';remember(s,p.subjectId,r.boundary,0,ctx);}
  f.project=null;ctx.finishObligation?.(`fellowship_${p.kind}_${p.subjectId}`);
  notice(s,ctx,'An unfinished agreement honestly closed','The completed days and earlier promise remain recorded. No technique, standing or relationship completion reward is granted.');return true;
 }
 if(p.kind==='formation') {
  const current=mentor(s,p.subjectId);
  if(p.node==='handover'){
   f.pending=null;if(id==='later'){s.notice='The unfinished formation remains paused with its actual completed work.';return true;}
   if(!p.mentor||p.mentor.id!==current.id||current.available===false||s.locationId!==p.mentor.locationId){s.notice='The named new supervisor cannot currently take part. No work or reward is credited.';return true;}
   const from=supervisor(r),to=actorSummary(current);r.handovers ||= [];r.handovers.push({day:s.day,fromId:from.id,fromName:from.name,toId:to.id,toName:to.name,locationId:to.locationId});r.supervisor=to;r.locationId=to.locationId;
   if(f.project?.kind==='formation'&&f.project.subjectId===p.subjectId)f.project.locationId=to.locationId;
   s.progression.mentors[p.subjectId].met=true;
   notice(s,ctx,'A named formation supervision handover',`${r.mentorName} remains the original formation mentor. You and ${to.name} explicitly agree that ${to.name} takes over supervision from ${from.name}. All ${r.workDays} actual completed days, earlier choices, original deadline and witness permissions remain. No time, fee, reward, private bond or confidence transfers.`);return true;
  }
  const actor=p.mentor||supervisor(r);
  if(actor.id!==supervisor(r).id||supervisionNeeded(s,p.subjectId)||current.available===false||s.locationId!==actor.locationId){f.pending=null;s.notice='The original supervisor cannot currently take part. The authored meeting and actual work remain recorded; explicitly arrange supervision before continuing.';return true;}
  if(['start','resume'].includes(p.node)) {
   if(id==='later') {r.stage='withdrawn';f.pending=null;s.notice='The optional formation can wait. Your earned calling remains intact.';return true;}
   r.approach=id;
   if(id==='service')ctx.addObligation?.(`fellowship_formation_${p.subjectId}`,`Complete the ${definition(p.subjectId).name.toLowerCase()} formation`,90,'Six days of inquiry, eight days of the chosen practice, and two days of review. Missing this date is recorded; it does not remove an earned calling.');
   const phase=r.pausedPhase || 'field',already=r.pausedWork || 0,total=phase==='field'?6:phase==='practice'?8:2;
   r.stage=phase==='attest'?'attest':phase;f.pending=null;
   const locationId=supervisor(r).locationId;r.locationId=locationId;
   f.project={kind:'formation',subjectId:p.subjectId,phase,locationId,totalDays:total,workedDays:already,startedDay:s.day};
   delete r.pausedPhase;delete r.pausedWork;
   continueProject(s,ctx);return true;
  }
  if(p.node==='decision') {r.interpretation=FORMATIONS[p.subjectId][id][0];r.stage='practice';startProject(s,'formation',p.subjectId,'practice',8,ctx);return true;}
  r.recognition=id;r.stage='attest';startProject(s,'formation',p.subjectId,'attest',2,ctx);return true;
 }
 const companion=person(s,p.subjectId);
 if(!companion || companion.alive===false) {f.pending=null;r.stage='withdrawn';s.notice='That companion cannot take part. The unfinished request remains a memory.';return true;}
 if(p.node==='request') {
  if(id==='decline') {r.stage='declined';r.boundary='You honestly said you could not take on this request. My goal remains my own.';f.pending=null;remember(s,p.subjectId,r.boundary,1,ctx);notice(s,ctx,'A clear answer to a real request',`${companion.name} hears your honest limit. No deadline, departure or reward is invented.`);return true;}
  r.approach=id;r.stage='field';
  if(id==='promise')ctx.addObligation?.(`fellowship_companion_${p.subjectId}`,`Make eight days for ${companion.name}’s request`,60,'Six days of shared work and two days carrying out the negotiated decision. A missed promise is recorded; honest renegotiation remains possible.');
  startProject(s,'companion',p.subjectId,'field',6,ctx);return true;
 }
 const allowed={mira:['neighborhood','order-agreement'],orrin:['shared-rota','teach-relief'],kest:['private-letter','careful-record']};
 if(!allowed[p.subjectId].includes(id))return false;
 r.resolution=id;r.boundary=p.subjectId==='mira'?'Protection does not mean obedience to every institutional order.':p.subjectId==='orrin'?'Care does not require endless work or treatments imposed without consent.':'A person can answer a letter or decline a reunion; their location stays private.';
 r.stage='finalize';startProject(s,'companion',p.subjectId,'finalize',2,ctx);return true;
}

export function onFellowshipTime(s,{oldDay,newDay},ctx={}) {
 if(!s.fellowship || newDay<=oldDay)return;
 // Only continueProject credits labor. Years elsewhere do not complete a quest.
 if(s.phase==='retired' && s.fellowship.project) {
  const p=s.fellowship.project,r=p.kind==='formation'?s.fellowship.formations[p.subjectId]:s.fellowship.companions[p.subjectId];
  r.stage='withdrawn';s.fellowship.project=null;s.fellowship.pending=null;
 }
}
export function fellowshipEventIds() {
 return {fellowship_formation_handover:['accept','later'],fellowship_formation_start:['service','independent','later'],fellowship_formation_resume:['service','independent','later'],fellowship_formation_decision:['a','b'],fellowship_formation_review:['public','private'],fellowship_companion_request:['promise','no-deadline','decline'],fellowship_companion_decision:['neighborhood','order-agreement','shared-rota','teach-relief','private-letter','careful-record'],fellowship_withdraw:['stay','withdraw']};
}
export function fellowshipView(s) {
 if(!s.fellowship)return {formations:[],companions:[],project:null,inherited:[]};
 const f=s.fellowship;
 return {formations:Object.entries(f.formations).map(([id,r])=>({...r,classId:id,name:definition(id).name,title:FORMATIONS[id].title,totalDays:16,remainingDays:Math.max(0,16-r.workDays)})),companions:Object.entries(f.companions).map(([id,r])=>({...r,id,name:person(s,id)?.name || id,totalDays:8,remainingDays:Math.max(0,8-r.workDays)})),project:f.project?{...f.project,title:projectTitle(s),remainingDays:f.project.totalDays-f.project.workedDays}:null,inherited:[...f.inherited],facts:[...f.facts],actions:fellowshipActions(s)};
}
export function inheritFellowship(previous,next) {
 initializeFellowship(next,{reset:true});
 const own=Object.entries(previous.fellowship?.formations || {}).filter(([,r])=>r.completedDay!==null).map(([id,r])=>({kind:'formation',name:definition(id).name,day:r.completedDay,summary:`${previous.hero.name} practiced ${r.technique} through ${r.interpretation}; ${r.recognition} recognition.`}));
 const companions=Object.entries(previous.fellowship?.companions || {}).filter(([,r])=>r.completedDay!==null).map(([id,r])=>({kind:'companion',name:person(previous,id)?.name || id,day:r.completedDay,summary:`${previous.hero.name} helped with ${r.resolution}. ${r.boundary}`}));
 next.fellowship.inherited=[...(previous.fellowship?.inherited || []),...own,...companions].slice(-48);
}
export function validateFellowship(f,s) {
 if(!plain(f) || f.version!==1 || !plain(f.formations) || !plain(f.companions) || !Array.isArray(f.facts) || f.facts.length>60 || new Set(f.facts).size!==f.facts.length || !f.facts.every(v=>text(v,100)) || !Array.isArray(f.inherited) || f.inherited.length>48)return false;
 const currentDay=s?.day ?? 2000000,locations=s?.world?.locations;
 const validPlace=id=>text(id,80)&&(!locations || locations.some(p=>p.id===id));
 const nullableChoice=(v,allowed)=>v===null || allowed.includes(v);
 if(Object.keys(f.formations).length>12 || Object.keys(f.companions).length>3)return false;
 for(const [id,r] of Object.entries(f.formations)) {
  const d=FORMATIONS[id];
  if(!d || !plain(r) || s&&!hasCalling(s,id) || !FORMATION_STAGES.includes(r.stage) || !nullableChoice(r.approach,['service','independent']) || !nullableChoice(r.interpretation,[d.a[0],d.b[0]]) || !nullableChoice(r.recognition,['public','private']) || !canonicalMentorId(s,id,r.mentorId) || !text(r.mentorName,80) || !validPlace(r.locationId) || !integer(r.startedDay,currentDay) || !(r.completedDay===null || integer(r.completedDay,currentDay)&&r.completedDay>=r.startedDay) || !integer(r.workDays,16) || !(r.technique===null || r.technique===d.technique))return false;
  const validActor=a=>plain(a)&&Object.keys(a).every(k=>['id','name','locationId'].includes(k))&&canonicalMentorId(s,id,a.id)&&text(a.name,80)&&validPlace(a.locationId);
  if(r.supervisor!==undefined&&!validActor(r.supervisor))return false;
  if(r.handovers!==undefined){if(!Array.isArray(r.handovers)||r.handovers.length>3500||!r.handovers.every((h,i)=>plain(h)&&Object.keys(h).every(k=>['day','fromId','fromName','toId','toName','locationId'].includes(k))&&integer(h.day,currentDay)&&h.day>=r.startedDay&&canonicalMentorId(s,id,h.fromId)&&canonicalMentorId(s,id,h.toId)&&h.fromId!==h.toId&&text(h.fromName,80)&&text(h.toName,80)&&validPlace(h.locationId)&&h.fromId===(i?r.handovers[i-1].toId:r.mentorId)&&(i===0||h.day>=r.handovers[i-1].day))||r.handovers.length&&r.supervisor?.id!==r.handovers.at(-1).toId)return false;}
  if(r.supervisor&&r.supervisor.id!==r.mentorId&&!r.handovers?.length)return false;
  if(r.stage==='completed' && (r.completedDay===null || r.workDays!==16 || r.technique!==d.technique || !r.interpretation || !r.recognition) || r.stage!=='completed'&&r.completedDay!==null)return false;
  if(r.pausedPhase!==undefined && !['field','practice','attest'].includes(r.pausedPhase) || r.pausedWork!==undefined && !integer(r.pausedWork,8))return false;
 }
 for(const [id,r] of Object.entries(f.companions)) {
  if(!COMPANION_IDS.includes(id) || !plain(r) || !COMPANION_STAGES.includes(r.stage) || !nullableChoice(r.approach,['promise','no-deadline']) || !nullableChoice(r.resolution,{mira:['neighborhood','order-agreement'],orrin:['shared-rota','teach-relief'],kest:['private-letter','careful-record']}[id]) || !integer(r.requestedDay,currentDay) || !(r.completedDay===null || integer(r.completedDay,currentDay)&&r.completedDay>=r.requestedDay) || !integer(r.workDays,8) || !validPlace(r.locationId) || !(r.boundary===null || text(r.boundary,1000)) || !text(r.subjectName,80) || !integer(r.caseVariant,2))return false;
  if(r.stage==='completed'&&(r.completedDay===null || r.workDays!==8 || !r.resolution || !r.boundary) || r.stage!=='completed'&&r.completedDay!==null)return false;
 }
 if(f.project!==null) {
  const p=f.project,r=p?.kind==='formation'?f.formations[p.subjectId]:f.companions[p.subjectId];
  if(!plain(p) || !['formation','companion'].includes(p.kind) || !r || !['field','practice','attest','finalize'].includes(p.phase) || !validPlace(p.locationId) || !integer(p.totalDays,8) || p.totalDays<1 || !integer(p.workedDays,p.totalDays) || !integer(p.startedDay,currentDay) || r.workDays<p.workedDays)return false;
  if(p.kind==='formation' && !['field','practice','attest'].includes(p.phase) || p.kind==='companion' && !['field','finalize'].includes(p.phase) || p.totalDays!==(p.phase==='field'?6:p.phase==='practice'?8:2))return false;
 }
 if(f.pending!==null) {
  const p=f.pending,r=p?.kind==='formation'?f.formations[p.subjectId]:f.companions[p.subjectId];
  if(!plain(p) || !r || !['formation','companion'].includes(p.kind) || !(p.node==='withdraw' || p.kind==='formation'&&['start','resume','decision','review','handover'].includes(p.node) || p.kind==='companion'&&['request','decision'].includes(p.node)) || p.node==='withdraw'&&!f.project)return false;
  if(p.mentor!==undefined&&(p.kind!=='formation'||!plain(p.mentor)||Object.keys(p.mentor).some(k=>!['id','name','locationId'].includes(k))||!canonicalMentorId(s,p.subjectId,p.mentor.id)||!text(p.mentor.name,80)||!validPlace(p.mentor.locationId)||p.mentor.id!==(p.node==='handover'?mentor(s,p.subjectId).id:supervisor(r).id)&&s?.npcContinuity?.people?.[p.mentor.id]?.vacancyReason!=='recorded-death'))return false;
  if(p.node==='handover'&&!p.mentor)return false;
  if(s?.event?.id?.startsWith('fellowship_') && s.event.id!==(p.node==='withdraw'?'fellowship_withdraw':`fellowship_${p.kind}_${p.node}`))return false;
 }
 if(s?.event?.id?.startsWith('fellowship_') && !f.pending)return false;
 return f.inherited.every(r=>plain(r)&&['formation','companion'].includes(r.kind)&&text(r.name,80)&&integer(r.day,currentDay)&&text(r.summary));
}
