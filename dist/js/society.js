import { agingPolicy } from './aging-policy-v25.js';
import { generateCharacter } from './characters.js';
import { seededRoll, generatePersonName, isSettlement, worldCalendarContext } from './world.js';

// People enter the ledger when they actually meet this household. Calendar
// changes are prospective: importing a save never invents earlier meetings.
const PROFESSIONS=['Blacksmith','Farmer','Alchemist','Innkeeper','Miner','Bard','Cartographer','Healer','Scholar','Herbalist','Merchant','Soldier'];
const NEEDS={
  Blacksmith:['a hinge bearing your first maker’s mark has begun to catch','a widowed neighbor needs a safe tool, rather than another ceremonial blade','their child asks why the repair carries only the maker’s name'],
  Farmer:['the seed beds you prepared are sprouting unevenly after the black rain','their household wants to share a harvest without exhausting the soil','their daughter wants to keep the seed ledger in her own hand'],
  Alchemist:['a sealed preparation you supplied has clouded in the cellar','a well keeper needs the limits of your test explained plainly','a younger tester wants their observations signed beside yours'],
  Innkeeper:['a guest remembers a promise made in a room you repaired','a traveler cannot afford a bed on the night the marsh bells sound','their household wants a place at the table without being made a spectacle'],
  Miner:['the support timber you checked carries a new hairline split','a gallery worker wants a dangerous shift stopped before someone is buried','a younger miner wants the safety record to name the person who raised the alarm'],
  Bard:['a family disputes a verse in the song you made for them','someone asks you to omit a dead relative’s name from a public performance','a young singer wants credit for the melody they brought to rehearsal'],
  Cartographer:['a crossing marked safe on your map has shifted in the flood','a household needs a route usable by someone who cannot climb the old steps','a junior surveyor wants their warning marked on the final map'],
  Healer:['someone following your care plan needs another patient hearing','a household wants the reason for a treatment explained before agreeing','a recovering patient wants their own words included in the clinic record'],
  Scholar:['a copied account you supplied contradicts a surviving witness','a household wants lessons that make room for their working hours','a pupil asks why the archive names the patron but not the translator'],
  Herbalist:['a remedy wrap you supplied stayed damp in a leaking pantry','a neighbor wants a garden whose limits are honestly described','a young grower wants to preserve an old household remedy with proper credit'],
  Merchant:['a provision crate you sealed arrived with an uncertain tally','a customer asks for weights that can be checked by both households','a younger trader wants their name on the cooperative account'],
  Soldier:['a recruit remembers a drill differently from the watch report','a household wants a safe crossing without a demand for loyalty','a young watcher asks to be named for the warning that kept people alive'],
};
const MATERIALS={Blacksmith:{ore:1,wood:1},Farmer:{wood:1,cloth:1},Alchemist:{crystal:1,cloth:1},Innkeeper:{cloth:2},Miner:{wood:2},Bard:{cloth:1},Cartographer:{cloth:1},Healer:{cloth:1},Scholar:{wood:1},Herbalist:{cloth:1},Merchant:{wood:1},Soldier:{wood:1,cloth:1}};
const SKILLS={Blacksmith:'survival',Farmer:'survival',Alchemist:'arcana',Innkeeper:'persuasion',Miner:'survival',Bard:'persuasion',Cartographer:'scholarship',Healer:'devotion',Scholar:'scholarship',Herbalist:'survival',Merchant:'persuasion',Soldier:'weapons'};
const clamp=n=>Math.max(0,Math.min(100,n));
const place=(s,id=s.locationId)=>s.world?.locations?.find(p=>p.id===id);
const owner=s=>`birth-${s.timeline?.birthDay ?? -6570}`;
const blocked=s=>s.event || s.battle || s.conversations?.pending || s.dungeon || s.timeline?.journey || s.workshop?.project || s.life?.plan || s.careers?.batch;
const peerStage=age=>[18,30,45,65].filter(year=>age>=year).length;
const ready=s=>s.society && s.age>=16 && s.phase!=='retired' && s.hero.alive!==false && !blocked(s);
const person=(s,id)=>[...(s.society?.people || []),...(s.society?.archive || [])].find(p=>p.id===id);
const materialsText=m=>Object.entries(m).map(([id,n])=>`${n} ${id}`).join(', ') || 'no materials';
const choices=(...items)=>items.map(([id,label,description])=>({id,label,description}));
function journal(s,ctx,title,text) {
  const soc=s.society;
  soc.sequence++;
  soc.history.push({id:`society-record-${soc.sequence}`,day:s.day,title,text});
  soc.history=soc.history.slice(-160);
  ctx.journal?.(title,text,'relationships');
}
function remember(p,text,amount=0) {p.bond=clamp(p.bond+amount);if(!p.memories.includes(text))p.memories.push(text);p.memories=p.memories.slice(-30);}
function queue(s,q) {
  const soc=s.society;
  if(soc.project?.personId===q.personId || soc.pending?.personId===q.personId || soc.queued?.personId===q.personId)return;
  if(!soc.queued && !soc.pending)soc.queued=q;
  else if(!soc.deferred.some(other=>other.personId===q.personId) && soc.deferred.length<12)soc.deferred.push(q);
}
function addPerson(s,p) {
  if(s.society.people.length>=48)return null;
  const age=Math.max(0,Math.floor((s.day-p.bornDay)/365));
  const record={...generateCharacter(s.seed,p.id,{role:p.profession || p.role,age}),...p,age,introducedDay:s.day,bond:35,knownFacts:[],knownFactsByPerson:{},memories:[],alive:true,status:'working',stage:0,deliveries:0,lastDeliveryDay:null,lastStoryDay:null,sourcePersonId:null,sourceLineageId:null,staffId:null,deathAge:Math.max(age+8,83+seededRoll(s.seed,`society-lifespan:${p.id}`,24)),deathDay:null,requestDeferred:false};
  record.deathAge=Math.max(age+8,70,record.deathAge+agingPolicy(record).elder-65);s.society.people.push(record);return record;
}
export function initializeSociety(s,{migration=false}={}) {
  if(s.society)return;
  s.society={version:1,ownerId:owner(s),startedDay:s.day,lastDay:s.day,people:[],archive:[],pending:null,queued:null,deferred:[],project:null,sequence:0,history:[],lastCohort:Math.floor(s.day/(12*365))};
  attachPeers(s);
}
function attachPeers(s) {
  // Existing peers remain themselves; no age, household, partner or death changes.
  for(const p of s.life?.people || [])if(['friend','rival','suitor'].includes(p.role) && !p.familyRole && p.alive!==false) {
    if(s.society.people.some(record=>record.sourcePersonId===p.id))continue;
    const lineage=s.lineage?.people.find(a=>a.source==='life' && a.localId===p.id);
    const r=addPerson(s,{id:`society-peer-${p.id}-${Math.max(0,s.timeline?.birthDay || 0)}`,name:p.name,...(p.appearance?{appearance:p.appearance,pronouns:p.pronouns,character:p.character}:{}),role:'peer',profession:p.occupation || 'Scholar',locationId:p.locationId || s.hero.birthplaceId || 'home',bornDay:lineage?.bornDay ?? p.bornDay ?? s.day-(p.age || s.age)*365,goal:'Choose work and a place to belong without surrendering old friendships.'});
    if(r){r.sourcePersonId=p.id;r.sourceLineageId=lineage?.id || null;r.bond=p.bond || 35;r.stage=peerStage(r.age);}
  }
}
export function inheritSociety(previous,next) {
  if(!previous.society){initializeSociety(next,{migration:true});return;}
  next.society=structuredClone(previous.society);
  const soc=next.society;
  soc.ownerId=owner(next);soc.pending=null;soc.queued=null;soc.deferred=[];soc.project=null;soc.lastDay=next.day;
  // The world retains named people and their actual lives. Personal confidence
  // belongs to the child: they are not credited with the parent's conversations.
  for(const p of soc.people){
    p.knownFactsByPerson[previous.dynasty?.activePersonId || owner(previous)]=[...p.knownFacts];
    p.bond=20;p.knownFacts=[];p.memories.push(`I knew ${previous.hero.name}; ${next.hero.name} must become someone I know in their own right.`);p.memories=p.memories.slice(-30);
    if(p.sourcePersonId && !next.life?.people.some(actual=>actual.id===p.sourcePersonId && actual.name===p.name)) {
      const related=next.life?.people.find(actual=>actual.name===p.name && actual.bornDay===p.bornDay);
      const actual=previous.lineage?.people.find(actual=>actual.source==='life' && actual.localId===p.sourcePersonId);
      p.sourceLineageId=actual?.id || p.sourceLineageId;p.sourcePersonId=related?.id || null;if(!related)p.role='neighbor';
    }
  }
  attachPeers(next);
}
export function recurringCustomer(s,profession,locationId,index) {
  if(!s.society)return null;
  // One of three households returns across quarterly commissions. Name queries
  // never mutate the world; meeting is recorded only when the offer is accepted.
  const slot=`society-customer-${profession.toLowerCase()}-${locationId}-${index}-${Math.max(0,s.timeline?.birthDay || 0)}`;
  const previous=[...s.society.people,...s.society.archive].filter(p=>p.customerSlot===slot).sort((a,b)=>a.introducedDay-b.introducedDay);
  const existing=previous.at(-1);
  if(existing?.alive)return {id:existing.id,name:existing.name};
  if(s.society.people.length>=48)return null;
  const id=previous.length?`${slot}-r${previous.length}`:slot;
  const name=generateCharacter(s.seed,id,{role:profession}).name;
  return {id,name};
}
export function meetSocietyCustomer(s,offer,ctx={}) {
  if(!s.society || !offer.societyCustomerId)return;
  let p=person(s,offer.societyCustomerId);
  if(!p){p=addPerson(s,{id:offer.societyCustomerId,name:offer.customerName,role:'customer',profession:offer.profession,locationId:offer.locationId,bornDay:s.day-(26+seededRoll(s.seed,offer.societyCustomerId,25))*365,goal:'Keep an ordinary household safe, heard and able to choose.'});if(p)p.customerSlot=offer.societyCustomerId.replace(/-r\d+$/,'');}
  if(p && !p.memories.length)remember(p,`I entrusted ${offer.goodName} to ${s.hero.name}, with a stated price and deadline.`);
}
export function recordSocietyCommission(s,offer,decision,ctx={}) {
  const p=person(s,offer.societyCustomerId);if(!p)return;
  p.deliveries++;p.lastDeliveryDay=s.day;
  const flaw=offer.quality<offer.targetQuality;
  remember(p,`${offer.goodName}: ${decision==='conceal'&&flaw?'you hid a shortfall that I discovered':decision==='community'?'you named the limits and offered an affordable price':'you explained the actual work before I paid'}.`,decision==='conceal'&&flaw?-15:decision==='community'?8:5);
  const threshold=[1,3,6][p.stage];
  if(p.alive && !p.requestDeferred && threshold && p.deliveries>=threshold && (!p.stage || s.day-(p.lastStoryDay || 0)>=45))queue(s,{eventId:'society_customer',personId:p.id,stage:p.stage});
}
export function syncSocietyStaff(s,ctx={}) {
  if(!s.society)return;
  const shop=s.careers?.shop;
  for(const staff of shop?.staff || []) {
    let p=s.society.people.find(p=>p.staffId===staff.id);
    if(!p){p=[...s.society.archive].find(p=>p.staffId===staff.id);}
    if(!p){p=addPerson(s,{id:`society-colleague-${staff.id}`,name:staff.name,role:'colleague',profession:shop.profession,locationId:shop.locationId,bornDay:staff.bornDay,goal:'Earn skill, fair credit and the freedom to become an independent maker.'});if(p)p.staffId=staff.id;}
    if(!p)continue;
    if(!p.alive)continue;
    p.age=staff.age;
    if(staff.status==='retired' && p.status==='working')p.status=staff.retirementKind==='independent'?'independent':'retired';
    if(!p.requestDeferred && staff.status==='working' && staff.skill>=20 && p.stage===0 && s.day-p.introducedDay>=30)queue(s,{eventId:'society_staff',personId:p.id,stage:0});
    if(!p.requestDeferred && staff.status==='working' && staff.skill>=30 && p.stage===1 && s.day-(p.lastStoryDay || 0)>=90)queue(s,{eventId:'society_staff',personId:p.id,stage:1});
  }
}
export function societyRecipients(s,locationId=s.locationId) {return (s.society?.people || []).filter(p=>p.alive && p.locationId===locationId).map(p=>({...p,memories:[...p.memories],knownFacts:[...p.knownFacts]}));}
export function onSocietyTime(s,{oldDay,newDay},ctx={}) {
  const soc=s.society;if(!soc || newDay<=oldDay)return;
  soc.lastDay=newDay;
  syncSocietyStaff(s,ctx);
  for(const p of soc.people) {
    p.age=Math.max(0,Math.floor((newDay-p.bornDay)/365));
    if(p.sourcePersonId) {
      const actual=s.life?.people.find(a=>a.id===p.sourcePersonId);if(!actual)continue;
      p.alive=actual.alive!==false;p.age=actual.age;p.bond=actual.bond;p.locationId=actual.locationId || p.locationId;
      if(!p.alive){p.status='remembered';p.deathDay=actual.deathDay ?? newDay;continue;}
      if(actual.familyRole || actual.role==='relative'){p.stage=peerStage(p.age);continue;}
      const next=peerStage(p.age);
      if(next>p.stage) {
        const alternatives=(s.world?.locations || []).filter(a=>isSettlement(s.world,a.id));
        const milestone=next;
        p.stage=next;
        if(p.age>=65){p.status='retired';p.goal='Keep a chosen place in community life after paid work.';actual.occupation='retired '+p.profession.toLowerCase();}
        else {
          p.profession=PROFESSIONS[seededRoll(s.seed,`society-peer-work:${p.id}:${milestone}`,PROFESSIONS.length)];actual.occupation=p.profession.toLowerCase();
          if(alternatives.length>1 && seededRoll(s.seed,`society-peer-move:${p.id}:${milestone}`,3)===0){p.locationId=alternatives[seededRoll(s.seed,`society-peer-destination:${p.id}:${milestone}`,alternatives.length)].id;actual.locationId=p.locationId;}
          p.goal=`Build a ${p.profession.toLowerCase()} life in ${place(s,p.locationId)?.name || 'their chosen settlement'}, while keeping old connections.`;
        }
        remember(p,`At ${p.age}, I ${p.status==='retired'?'left paid work':`chose ${p.profession.toLowerCase()} work`} in ${place(s,p.locationId)?.name || 'the community'}.`);
        journal(s,ctx,'A familiar person chose another chapter',`${p.name} ${p.status==='retired'?'retired from paid work':`now practices ${p.profession.toLowerCase()} work`} in ${place(s,p.locationId)?.name || 'their community'}. Their work changes without asking you to choose it for them; correspondence and earlier memories remain.`);
      }
    } else if(p.sourceLineageId) {
      const actual=s.lineage?.people.find(actual=>actual.id===p.sourceLineageId);
      if(actual){p.alive=actual.alive;p.age=Math.max(0,Math.floor(((actual.deathDay ?? newDay)-p.bornDay)/365));if(!p.alive){p.status='remembered';p.deathDay=actual.deathDay;}}
    } else if(p.alive && p.age>=p.deathAge) {
      // This date lies after the actual meeting, never before an imported save.
      p.deathDay=p.bornDay+p.deathAge*365;p.age=p.deathAge;p.alive=false;p.status='remembered';
      const staff=s.careers?.shop?.staff.find(a=>a.id===p.staffId);if(staff){staff.status='retired';staff.retirementKind='death';}
      journal(s,ctx,'A name kept after a life ended',`${p.name} died in later life at ${p.deathAge}. Their own work, promises and correspondence remain; a future commission belongs to another actual household, never a revived copy.`);
    } else if(p.alive && p.age>=70+agingPolicy(p).elder-65 && p.status==='working') {
      p.status='retired';p.goal='Make room for younger households while remaining someone, rather than a vanished customer.';
      journal(s,ctx,'A customer has a life beyond the counter',`${p.name} retired from paid work. Their household, letters and past commissions remain in your life; retirement does not remove the person.`);
    }
  }
  const protectedIds=[soc.pending?.personId,soc.project?.personId];
  for(const p of [...soc.people])if(!p.alive && !protectedIds.includes(p.id) && soc.archive.length<512) {soc.people=soc.people.filter(other=>other.id!==p.id);soc.archive.push(p);}
  const cohort=Math.floor(newDay/(12*365));
  if(cohort>soc.lastCohort && s.age>=35 && s.phase!=='retired' && s.hero.alive!==false && isSettlement(s.world,s.locationId) && soc.people.length<48) {
    soc.lastCohort=cohort;
    const id=`society-neighbor-${cohort}-${Math.max(0,s.timeline?.birthDay || 0)}`;
    if(!person(s,id)) {
      const profession=PROFESSIONS[seededRoll(s.seed,`society-neighbor-work:${cohort}`,PROFESSIONS.length)];
      const p=addPerson(s,{id,name:generateCharacter(s.seed,id,{role:profession}).name,role:'neighbor',profession,locationId:s.locationId,bornDay:newDay-(28+seededRoll(s.seed,`society-neighbor-age:${cohort}`,28))*365,goal:['Find a home beyond a ruined road, without being treated as a rumor.','Learn a new livelihood after caring for someone through a long illness.','Keep a household custom alive in a place where no one yet knows its name.','Build friendships after the old watch, school and household have changed.'][seededRoll(s.seed,`society-neighbor-goal:${cohort}`,4)]});
      if(p)queue(s,{eventId:'society_neighbor',personId:p.id,stage:0});
    }
  }
}
function projectAdmission(s,p,type) {
  const specification=type==='launch'?{days:14,gold:600,materials:{wood:6,cloth:4,ore:2}}:type==='credit'?{days:2,gold:8,materials:{cloth:1}}:type==='hours'?{days:3,gold:12,materials:{}}:type==='teach'?{days:4,gold:12,materials:{...(MATERIALS[p?.profession] || {cloth:1})}}:{days:3,gold:6,materials:{...(MATERIALS[p?.profession] || {cloth:1})}};
  let reason=null;
  if(!p?.alive)reason='This exact person is no longer alive to agree to the work. No commitment was reserved.';
  else if(s.society.project)reason='Finish or release your existing commitment before reserving another one.';
  else if(!isSettlement(s.world,s.locationId)||s.locationId!==p.locationId)reason=`Meet ${p.name} at ${place(s,p.locationId)?.name || p.locationId} before reserving this work.`;
  else {
    const shortfalls=[];
    if(s.hero.gold<specification.gold)shortfalls.push(`${specification.gold-s.hero.gold} gold`);
    for(const [id,n] of Object.entries(specification.materials))if((s.equipment?.materials?.[id] || 0)<n)shortfalls.push(`${n-(s.equipment?.materials?.[id] || 0)} ${id}`);
    if(shortfalls.length)reason=`You still need ${shortfalls.join(', ')} to reserve this work with ${p.name}. Return after preparing, or explain your limit.`;
  }
  return {specification,reason};
}
export function societyCustomerChoiceReason(s,eventId,id) {
  if(eventId!=='society_customer'||!['repair','teach'].includes(id))return null;
  const q=s?.society?.pending,p=q?person(s,q.personId):null;
  if(q?.eventId!==eventId||p?.role!=='customer')return 'This exact customer request is no longer available. No commitment was reserved.';
  return projectAdmission(s,p,id).reason;
}
export function societyCustomerContext(s,event) {
  if(!s||event?.id!=='society_customer')return null;
  const q=s.society?.pending,p=person(s,q?.personId),ids=event?.choices?.map(c=>c.id);
  if(event?.id!=='society_customer'||q?.eventId!==event.id||p?.role!=='customer'||!ids||ids.length!==4||new Set(ids).size!==4||!ids.every(id=>societyEventIds().society_customer.includes(id)))return null;
  return {personId:p.id,name:p.name,locationId:p.locationId,locationName:place(s,p.locationId)?.name || p.locationId};
}
function customerChoices(s,p) {
  const repair=projectAdmission(s,p,'repair').specification,teach=projectAdmission(s,p,'teach').specification;
  return choices(['repair','Return to inspect and make the work dependable',`Reserve ${repair.gold} gold and ${materialsText(repair.materials)}; commit ${repair.days} actual days at ${place(s,p.locationId)?.name}. Gain personal trust only after completion.`],['teach','Teach the household to inspect and choose for itself',`Reserve ${teach.gold} gold and ${materialsText(teach.materials)}; commit ${teach.days} actual days. Their record remembers shared methods and their own agency.`],['prepare','Agree to discuss it after preparing supplies','Leave the decision open, buy or gather the stated materials, then use the named Return to the plan activity. No work or reward is granted.'],['decline','Explain a limit without selling another promise','No cost or invented work. They remember your honest limit and can seek another maker.']);
}
export function societyCustomerChoiceQuote(s,event,id) {
  const context=societyCustomerContext(s,event);if(!context)return null;
  const choice=customerChoices(s,person(s,context.personId)).find(c=>c.id===id);
  return choice?{description:choice.description}:null;
}
function beginProject(s,p,type,ctx) {
  const {specification,reason}=projectAdmission(s,p,type);
  if(reason)return false;
  s.hero.gold-=specification.gold;
  for(const [id,n] of Object.entries(specification.materials))s.equipment.materials[id]-=n;
  s.society.project={personId:p.id,type,locationId:p.locationId,profession:p.profession,startedDay:s.day,totalDays:specification.days,remainingDays:specification.days,completedDays:0,gold:specification.gold,materials:{...specification.materials}};
  journal(s,ctx,'A named commitment, with room to finish',`You reserved ${specification.gold} gold and ${materialsText(specification.materials)} for ${p.name}. ${specification.days} actual days remain. Birthdays and known needs preserve completed work; setting an intention does not finish it.`);
  return true;
}
function progressProject(s,ctx) {
  const q=s.society.project,p=person(s,q?.personId);
  if(!q || !p || !ready(s) || s.locationId!==q.locationId || !isSettlement(s.world,q.locationId))return false;
  const actual=Math.min(q.remainingDays,Math.max(0,ctx.spendDays?.(q.remainingDays) || 0));
  q.remainingDays-=actual;q.completedDays+=actual;
  if(q.remainingDays)return true;
  s.society.project=null;p.lastStoryDay=s.day;
  if(!p.alive || s.phase==='retired' || s.hero.alive===false){journal(s,ctx,'A promise kept in an unfinished chapter',`The preparation for ${p.name} reached ${q.completedDays} real days as a life ended. No finished workplace, new skill or refund is awarded.`);return true;}
  if(q.type==='launch') {const next={eventId:'society_launch',personId:p.id,stage:p.stage};if(s.society.queued)s.society.deferred.unshift(s.society.queued);s.society.queued=next;return true;}
  const staff=s.careers?.shop?.staff.find(a=>a.id===p.staffId);
  if(q.type==='credit'){remember(p,'You spent real time preserving my name beside the methods we developed.',9);if(staff)staff.wage=Math.min(30,staff.wage+1);}
  else if(q.type==='hours'){remember(p,'You rearranged the actual working week rather than asking me to endure it silently.',7);if(s.life)s.life.stress=clamp(s.life.stress-4);}
  else if(q.type==='teach'){remember(p,'You taught my household how to inspect the work and speak for itself.',10);p.knownFacts.push('shared_methods');}
  else remember(p,'You returned to inspect the work and repair what an earlier promise had missed.',8);
  p.stage=p.role==='customer'?Math.min(3,p.stage+1):Math.max(1,p.stage);
  const skill=SKILLS[q.profession];if(skill && Number.isFinite(s.hero.skills[skill]))s.hero.skills[skill]=Math.min(10000,s.hero.skills[skill]+1);
  journal(s,ctx,'The person behind an ordinary promise',`${p.name} remembers your ${q.type==='credit'?'signed credit and fair wage':q.type==='hours'?'changed working hours':q.type==='teach'?'shared household lesson':'return and careful follow-up'}. ${q.totalDays} actual days, ${q.gold} gold, and ${materialsText(q.materials)} were spent. No wage or refund appeared for clicking the choice.`);
  return true;
}
export function societyActions(s) {
  if(!ready(s))return [];
  const q=s.society.project;
  if(!q)return s.society.people.filter(p=>p.alive && p.requestDeferred && ['customer','colleague'].includes(p.role)).map(p=>({id:`society_revisit_${p.id}`,label:`Return to the plan with ${p.name}`,description:'Reopen the actual unfinished discussion. Its named person, materials and funding remain clear; no work or skill is granted by talking about the plan.',days:0,cost:0,group:'People & commitments',...(p.locationId!==s.locationId?{disabledReason:`Meet them at ${place(s,p.locationId)?.name || p.locationId}.`}:{})}));
  const p=person(s,q.personId),reason=s.locationId!==q.locationId?'Return to the named workplace.':!isSettlement(s.world,q.locationId)?'This workplace is unavailable; release the commitment.':null;
  return [{id:'society_continue',label:`Continue the commitment to ${p?.name || 'your colleague'}`,description:`${q.remainingDays} of ${q.totalDays} actual days remain. The agreed ${q.gold} gold and ${materialsText(q.materials)} were reserved once; no additional upfront payment.`,days:0,cost:0,durationDays:q.remainingDays,group:'People & commitments',...(reason?{disabledReason:reason}:{})},{id:'society_cancel',label:'Explain your limit and release the remaining work',description:'Keep the recorded partial days. Reserved funding and materials remain spent; there is no wage, refund or finished enterprise.',days:0,cost:0,group:'People & commitments'}];
}
export function applySocietyAction(s,id,ctx={}) {
  if(!s.society || !id?.startsWith('society_'))return false;
  if(id.startsWith('society_revisit_') && ready(s) && !s.society.project) {
    const p=person(s,id.slice('society_revisit_'.length));if(!p?.alive || !p.requestDeferred || p.locationId!==s.locationId)return false;
    p.requestDeferred=false;queue(s,{eventId:p.role==='customer'?'society_customer':'society_staff',personId:p.id,stage:p.stage});flushSocietyEvent(s,ctx);return true;
  }
  if(id==='society_continue')return progressProject(s,ctx);
  if(id==='society_cancel' && s.society.project && ready(s)) {
    const q=s.society.project,p=person(s,q.personId);s.society.project=null;if(p){remember(p,`You explained a limit after ${q.completedDays} real days; the promised work stayed unfinished.`,-4);p.lastStoryDay=s.day;p.stage=Math.max(1,p.stage);}
    journal(s,ctx,'An unfinished promise named honestly',`${p?.name || 'Your colleague'} heard why you released ${q.remainingDays} remaining days. The reserved supplies stay consumed and no finished work is recorded.`);return true;
  }
  return false;
}
export function societyEventIds() {return {society_customer:['repair','teach','decline','prepare'],society_staff:['credit','hours','boundary','launch','stay','release','prepare'],society_launch:['independent','partner','study'],society_neighbor:['welcome','work','private']};}
export function flushSocietyEvent(s,ctx={}) {
  const soc=s.society;if(!soc || soc.pending || soc.project || s.event || s.battle || s.conversations?.pending || s.phase==='retired' || s.dungeon || s.timeline?.journey || s.careers?.batch || s.workshop?.project || s.life?.plan || s.community?.project?.commitment || s.fellowship?.project || s.sanctuaries?.commitment)return false;
  if(!soc.queued)soc.queued=soc.deferred.shift() || null;
  let q=soc.queued,p=person(s,q?.personId);
  while(q && (!p || !p.alive || q.eventId==='society_staff' && q.stage!==p.stage)){soc.queued=soc.deferred.shift() || null;q=soc.queued;p=person(s,q?.personId);}
  if(!q || !p)return false;
  soc.queued=null;soc.pending=q;
  let title,body,offered;
  if(q.eventId==='society_customer') {
    title='The same household returns';
    body=`${p.name} has brought ${p.deliveries} delivered commissions into an ordinary household. Beneath the soot-dark eaves, ${NEEDS[p.profession]?.[Math.min(2,p.stage)] || 'they ask whether your earlier promise can make room for what has changed'}. “I remember how you spoke to me before I paid. This is about what happens after.” Their household has a voice beyond the invoice.`;
    offered=customerChoices(s,p);
  } else if(q.eventId==='society_staff' && q.stage===0) {
    title='A name beneath the maker’s mark';body=`${p.name} sets a practice piece beside the workbench. “I chose to learn here. I also want the parts I discover to carry my own name.” The lantern throws two shadows onto the same wall. They ask for credit or a safer rhythm, rather than praise that changes nothing.`;
    offered=choices(['credit','Make a signed record and improve their wage', 'Reserve 8 gold and 1 cloth; spend 2 actual days. Completed credit raises their operating-week wage by 1 gold.'],['hours','Rearrange the work around safe hours','Reserve 12 gold; spend 3 actual days on a safer shared rhythm.'],['prepare','Make room to prepare before promising the change','Keep this named discussion open. Return through the people’s plan after preparing supplies or time.'],['boundary','Admit that you cannot promise the change','No completed lesson or extra skill. They remember the limit and keep their own ambitions.']);
  } else if(q.eventId==='society_staff') {
    title='A key of their own';body=`${p.name} can now make work another household relies on. They ask to lease a small independent workplace: “I want your name in my history, not on every door I open.” The request puts your wealth, their skill and fourteen days of real preparation into the same decision.`;
    offered=choices(['launch','Fund and prepare their independent beginning','Reserve 600 gold, 6 wood, 4 cloth and 2 ore; commit 14 actual days. Decide the final relationship only when preparation is complete.'],['prepare','Prepare the funding before deciding','Keep their request open. Buy or gather supplies and earn the funding, then Return to the named plan. No wage increase or finished enterprise appears.'],['stay','Offer a better freely chosen colleague’s place','Raise their agreed operating-week wage by 2 gold; remember that staying was a choice. No enterprise or building appears.'],['release','Wish them well without funding a workplace','They leave the active staff roster and remain a named correspondent. No business or resources are conjured.']);
  } else if(q.eventId==='society_launch') {
    title='The door is ready to bear another name';body=`Fourteen actual days of preparation have passed. The tools and lease funded for ${p.name} are ready in ${place(s,p.locationId)?.name}. Their future is a relationship to negotiate, rather than a reward to equip.`;
    offered=choices(['independent','Give the key and let their own name lead','They leave your paid staff, become an independent maker and keep your support in memory. No income is siphoned back to you.'],['partner','Agree on two independent doors and shared methods','They establish their own workplace; both names remain in a cooperative teaching record. No passive payment or duplicate business appears.'],['study','Let them choose further study before opening','They leave active staff for a funded period of study, with the reserved preparation remembered. Their decision is not silently reversed.']);
  } else {
    title='Someone the old years did not know';body=`${p.name}, a ${p.profession.toLowerCase()}, has begun a household in ${place(s,p.locationId)?.name}. ${p.goal} Beyond the evening shutters, the bells count a year that belongs to neither your childhood nor theirs. An old life can still make room for a new person.`;
    offered=choices(['welcome','Offer a place in your circle','Remember a welcome between two adults. The conversation opens without a gift, class requirement or forced romance.'],['work','Ask about the work they chose','Learn their personal ambition and make a professional connection; no automatic job or commission is awarded.'],['private','Keep a kind boundary','They remain a real neighbor without becoming a close friend. No universal reputation penalty.']);
  }
  ctx.setEvent?.(q.eventId,title,'Lives around your own',body,offered);return true;
}
export function applySocietyChoice(s,eventId,id,ctx={}) {
  const q=s.society?.pending,p=person(s,q?.personId);if(!q || !p || q.eventId!==eventId || !societyEventIds()[eventId]?.includes(id) || s.event&&!s.event.choices?.some(c=>c.id===id))return false;
  const allowed=q.eventId==='society_staff'?(q.stage===0?['credit','hours','boundary','prepare']:['launch','stay','release','prepare']):societyEventIds()[eventId];if(!allowed.includes(id))return false;
  const refusal=societyCustomerChoiceReason(s,eventId,id);if(refusal){s.notice=refusal;return false;}
  if(id==='prepare'){p.requestDeferred=true;s.society.pending=null;s.notice=`${p.name}'s request stays open. Prepare the stated supplies, then Return to the named plan.`;return true;}
  if(['repair','teach','credit','hours','launch'].includes(id)) {if(!beginProject(s,p,id,ctx)){s.notice='Return to this person’s open workplace with the stated gold and materials. The promise stays undecided.';return false;}}
  else {
    p.lastStoryDay=s.day;
    if(eventId==='society_launch') {
      const staff=s.careers?.shop?.staff.find(a=>a.id===p.staffId);if(staff){staff.status='retired';staff.retirementKind=id==='study'?'study':'independent';}
      p.status=id==='study'?'retired':'independent';p.stage=3;
      p.goal=id==='study'?'Study on their own terms before choosing a workplace.':`Lead their own ${p.profession.toLowerCase()} workplace in ${place(s,p.locationId)?.name}.`;
      remember(p,id==='partner'?'You gave me a door of my own and asked to share knowledge as equals.':id==='study'?'You respected my choice to study before opening the prepared door.':'You gave me a beginning whose name belonged to me.',12);
    } else if(eventId==='society_staff') {
      const staff=s.careers?.shop?.staff.find(a=>a.id===p.staffId);
      if(id==='stay' && staff){staff.wage=Math.min(30,staff.wage+2);p.stage=2;remember(p,'We agreed on a better wage and I freely chose to remain a colleague.',7);}
      else if(id==='release' && staff){staff.status='retired';staff.retirementKind='independent';p.status='independent';p.stage=3;remember(p,'You wished me well, without pretending that a promise could pay for a workplace.',2);}
      else {p.stage=1;remember(p,'You admitted the limit of what you could offer beside the workbench.',-3);}
    } else if(eventId==='society_customer'){p.stage=Math.min(3,p.stage+1);remember(p,'You stated an honest limit; I could choose another maker without owing you gratitude.',-2);}
    else {p.stage=1;remember(p,id==='welcome'?'You made room for me among people who had known one another for decades.':id==='work'?'You asked about the livelihood I chose before offering advice.':'You kept a kind boundary while recognizing me as a neighbor.',id==='welcome'?8:id==='work'?5:1);}
    journal(s,ctx,'Another person kept a choice of their own',`${p.name}: ${p.memories.at(-1)} Their name, ambition and actual place remain part of this life.`);
  }
  s.society.pending=null;return true;
}
export function societyView(s) {
  const soc=s.society;if(!soc)return {people:[],history:[],project:null,actions:[]};
  return {summary:'Recurring households, colleagues and new neighbors remember particular promises. Their own lives continue as the calendar changes.',people:soc.people.filter(p=>!p.sourcePersonId).map(p=>({...p,locationName:place(s,p.locationId)?.name || p.locationId,memories:[...p.memories],knownFacts:[...p.knownFacts]})),remembered:soc.archive.filter(p=>!p.sourcePersonId).map(p=>({...p,memories:[...p.memories],knownFacts:[...p.knownFacts]})),history:soc.history.map(h=>({...h})),project:soc.project?{...soc.project,materials:{...soc.project.materials},personName:person(s,soc.project.personId)?.name}:null,actions:societyActions(s)};
}
export function validateSociety(v,s) {
  const plain=o=>!!o && typeof o==='object' && !Array.isArray(o);
  const int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n) && n>=0 && n<=max;
  const txt=(t,max=2200)=>typeof t==='string' && t.length>0 && t.length<=max;
  const when=n=>int(n) && (!s || n<=s.day);
  const location=id=>txt(id,80) && (!s || !!place(s,id));
  const mats=m=>plain(m) && Object.entries(m).every(([id,n])=>['ore','wood','cloth','stone','hide','crystal'].includes(id) && int(n,100));
  if(!plain(v) || v.version!==1 || !/^birth--?\d+$/.test(v.ownerId) || !when(v.startedDay) || !when(v.lastDay) || v.lastDay<v.startedDay || !int(v.sequence) || !int(v.lastCohort) || !Array.isArray(v.people) || v.people.length>48 || !Array.isArray(v.archive) || v.archive.length>512 || !Array.isArray(v.deferred) || v.deferred.length>12 || new Set([...v.people,...v.archive].map(p=>p?.id)).size!==v.people.length+v.archive.length || !Array.isArray(v.history) || v.history.length>160)return false;
  const allPeople=[...v.people,...v.archive];
  for(const p of allPeople)if(!plain(p) || !txt(p.id,80) || !/^society-[a-z0-9-]+$/.test(p.id) || !txt(p.name,100) || !['customer','colleague','neighbor','peer'].includes(p.role) || !txt(p.profession,80) || !location(p.locationId) || !Number.isSafeInteger(p.bornDay) || p.bornDay< -150000 || !int(p.age,5000) || !when(p.introducedDay) || p.introducedDay<v.startedDay || !int(p.bond,100) || !['working','retired','independent','remembered'].includes(p.status) || typeof p.alive!=='boolean' || typeof p.requestDeferred!=='boolean' || !int(p.stage,30) || !int(p.deliveries) || !(p.lastDeliveryDay===null || when(p.lastDeliveryDay)) || !(p.lastStoryDay===null || when(p.lastStoryDay)) || !(p.sourcePersonId===null || txt(p.sourcePersonId,80)) || !(p.sourceLineageId===null || txt(p.sourceLineageId,180)) || !plain(p.knownFactsByPerson) || Object.keys(p.knownFactsByPerson).length>200 || !Object.values(p.knownFactsByPerson).every(a=>Array.isArray(a) && a.length<=60 && a.every(t=>txt(t,1000))) || !(p.staffId===null || txt(p.staffId,80)) || !int(p.deathAge,6000) || p.deathAge<70 || !(p.deathDay===null || when(p.deathDay)) || !txt(p.goal,500) || ![p.memories,p.knownFacts].every(a=>Array.isArray(a) && a.length<=60 && a.every(t=>txt(t,1000))))return false;
  for(const h of v.history)if(!plain(h) || !txt(h.id,100) || !when(h.day) || !txt(h.title,180) || !txt(h.text,2200))return false;
  const pending=q=>plain(q) && Object.hasOwn(societyEventIds(),q.eventId) && allPeople.some(p=>p.id===q.personId) && int(q.stage,30);
  if(v.pending!==null && !pending(v.pending) || v.queued!==null && !pending(v.queued))return false;
  if(!v.deferred.every(pending))return false;
  if(v.archive.some(p=>p.alive || p.status!=='remembered' || p.deathDay===null))return false;
  if(s && (v.pending!==null)!==Object.hasOwn(societyEventIds(),s.event?.id))return false;
  if(v.project!==null) {
    const q=v.project;if(!plain(q) || !v.people.some(p=>p.id===q.personId) || !['repair','teach','credit','hours','launch'].includes(q.type) || !location(q.locationId) || !txt(q.profession,80) || !when(q.startedDay) || !int(q.totalDays,14) || q.totalDays<1 || !int(q.completedDays,q.totalDays) || !int(q.remainingDays,q.totalDays) || q.remainingDays<1 || q.completedDays+q.remainingDays!==q.totalDays || !int(q.gold,600) || !mats(q.materials))return false;
  }
  return true;
}
