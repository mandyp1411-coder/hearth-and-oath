import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { townNpc, serviceNpc, initializeNpcContinuity, observeNpcContinuity, reconcileNpcContinuity, projectNpcPerson, retiredNpcContacts, npcContinuationAvailable, retiredNpcAvailabilityUnknown, validateNpcContinuity, NPC_FAVOR_RETURN_DAYS } from '../dist/js/npc-continuity.js';
import { residentContacts, socialLifeActions, applySocialLifeAction, projectLifePerson } from '../dist/js/world-people-v31.js';
import { localActivityPeople } from '../dist/js/daylife-v35.js';
import { generateCharacter } from '../dist/js/characters.js';

const clone=v=>structuredClone(v),YEAR=365;
function state(day=54*YEAR+364){return {seed:'individual-npc-continuity-fixture',day,age:22,phase:'adult',locationId:'home',world:{locations:[{id:'home',name:'Alderwick',type:'village',status:'stable',services:['hearth','market']}]},hero:{gold:0},life:{people:[],children:[]},family:{members:[]},realm:{sites:{},politics:{holds:[]}},socialLife:{met:{},known:{},favors:[],lastDiceDay:null},conversations:{threads:{},relationships:{},meetings:{},pending:null},cartography:{sites:{home:{kind:'Visited'}},interior:{siteId:'home',roomId:'gate'}},equipment:{materials:{cloth:2}},flags:{}};}
function adopt(s,people=Array.from({length:10},(_,i)=>townNpc(s,'home',i))){initializeNpcContinuity(s);observeNpcContinuity(s,people);assert.ok(validateNpcContinuity(s));return s;}
function knownFavor(s,index=0){
 const p=townNpc(s,'home',index);s.socialLife.met[p.id]=clone(p);s.conversations.relationships[p.id]={bond:75,memories:['A private confidence.'],knownFacts:['a private fact']};s.socialLife.favors.push({id:'favor-'+p.id,personId:p.id,name:p.name,locationId:'home',item:'cloth',status:'active',acceptedDay:s.day,completedDay:null});return p;
}
function retireFavor(){const s=adopt(state()),p=knownFavor(s),r=s.npcContinuity.people[p.id];s.day=r.retireDay;const notes=[];reconcileNpcContinuity(s,{journalLiteral:(...args)=>notes.push(args)});return {s,p,r,notes};}

test('prospective adoption keeps exact legacy identities and independent future terms',()=>{
 const s=state(),people=Array.from({length:10},(_,i)=>townNpc(s,'home',i)),before=clone(people);adopt(s,people);
 for(let i=0;i<10;i++){const p=townNpc(s,'home',i),r=s.npcContinuity.people[p.id];assert.equal(p.id,before[i].id);assert.equal(p.name,before[i].name);assert.deepEqual(p.appearance,before[i].appearance);assert.equal(p.baseAge,before[i].baseAge);assert.equal(r.termStartDay,null);assert.ok(r.retireDay>=s.day+8*YEAR);}
 assert.ok(new Set(Object.values(s.npcContinuity.people).map(r=>r.retireDay)).size>1);
 const stable=clone(s);initializeNpcContinuity(s);observeNpcContinuity(s,people);assert.deepEqual(s,stable);
});
test('the old 55-year boundary changes neither the whole town nor any adopted incumbent',()=>{
 const s=adopt(state()),ids=Object.values(s.npcContinuity.slots).map(r=>r.personId);s.day=55*YEAR;reconcileNpcContinuity(s);assert.deepEqual(Object.values(s.npcContinuity.slots).map(r=>r.personId),ids);assert.ok(validateNpcContinuity(s));
});
test('roster views are pure, and individual handover retains only the original private relationship',()=>{
 const {s,p,r,notes}=retireFavor(),next=townNpc(s,'home',0),before=clone(s);
 assert.notEqual(next.id,p.id);assert.equal(r.retiredDay,r.retireDay);assert.equal(r.successorId,next.id);assert.equal(r.successorName,next.name);assert.equal(notes.filter(n=>n[0]==='A public role passes to another person').length,1);
 assert.deepEqual(s.conversations.relationships[p.id],{bond:75,memories:['A private confidence.'],knownFacts:['a private fact']});assert.equal(s.conversations.relationships[next.id],undefined);
 assert.ok(!['bond','memories','knownFacts','met','lessons'].some(k=>Object.hasOwn(s.npcContinuity.people[next.id].snapshot,k)));
 const old=retiredNpcContacts(s).find(q=>q.id===p.id);assert.equal(old.name,p.name);assert.deepEqual(old.appearance,p.appearance);assert.equal(old.age,old.ageAtRetirement);assert.ok(!Object.hasOwn(old,'deathDay'));assert.notEqual(old.alive,false);
 townNpc(s,'home',0);projectNpcPerson(s,p);retiredNpcContacts(s);assert.deepEqual(s,before);reconcileNpcContinuity(s,{journalLiteral:(...args)=>notes.push(args)});assert.equal(notes.length,1);assert.ok(validateNpcContinuity(s));
});
test('an ignored accepted favor never freezes tenure, and its grace is explicit and prospective',()=>{
 const {s,p,r,notes}=retireFavor(),f=s.socialLife.favors[0];assert.notEqual(townNpc(s,'home',0).id,p.id);assert.deepEqual(f.returnWindow,{retiredDay:r.retireDay,untilDay:r.retireDay+NPC_FAVOR_RETURN_DAYS});assert.match(notes[0][1],new RegExp('world day '+f.returnWindow.untilDay));assert.equal(npcContinuationAvailable(s,p),true);
 s.day=f.returnWindow.untilDay+1;assert.equal(npcContinuationAvailable(s,p),false);assert.equal(f.status,'active');assert.equal(f.completedDay,null);assert.equal(f.failed,undefined);
});
test('a scoped return is not a new social, crime or circle presence',()=>{
 const {s,p}=retireFavor();s.cartography.interior.roomId=p.roomId;const returns=retiredNpcContacts(s),actions=socialLifeActions(s,[]);
 assert.ok(actions.some(a=>a.id==='people_deliver_'+p.id));for(const kind of ['orientation','court','hang','favor'])assert.ok(!actions.some(a=>a.id==='people_'+kind+'_'+p.id));assert.deepEqual(localActivityPeople(s,returns),[]);
});
test('the same named favor can deliver once inside its captured return window',()=>{
 const {s,p}=retireFavor();s.cartography.interior.roomId=p.roomId;const ctx={journal(){}};
 assert.equal(applySocialLifeAction(s,'people_deliver_'+p.id,ctx,[]),true);assert.equal(s.hero.gold,12);assert.equal(s.equipment.materials.cloth,0);assert.equal(s.socialLife.favors[0].status,'completed');assert.equal(s.conversations.relationships[p.id].bond,80);
 assert.equal(applySocialLifeAction(s,'people_deliver_'+p.id,ctx,[]),false);assert.equal(s.hero.gold,12);
});
test('withdrawal works without a current person, payment, reward or failure',()=>{
 const {s,p}=retireFavor();s.day+=NPC_FAVOR_RETURN_DAYS+1;s.world.locations[0].status='destroyed';const before={gold:s.hero.gold,cloth:s.equipment.materials.cloth,bond:s.conversations.relationships[p.id].bond};
 assert.equal(applySocialLifeAction(s,'people_withdraw_'+p.id,{journal(){}},[]),true);const f=s.socialLife.favors[0];assert.equal(f.status,'withdrawn');assert.equal(f.completedDay,null);assert.equal(f.endedDay,s.day);assert.equal(f.failed,undefined);assert.deepEqual({gold:s.hero.gold,cloth:s.equipment.materials.cloth,bond:s.conversations.relationships[p.id].bond},before);
});
test('actual death, absence, destruction, closure and occupation override a scoped return',()=>{
 for(const mode of ['death','absence','destroyed','closed','held']){const {s,p}=retireFavor();if(mode==='death')s.life.people.push({id:p.id,alive:false});if(mode==='absence')s.family.members.push({personId:p.id,availability:'missing'});if(mode==='destroyed')s.world.locations[0].status='destroyed';if(mode==='closed')s.world.locations[0].servicesAvailable=false;if(mode==='held')s.realm.politics.holds.push({siteId:'home',status:'held'});assert.equal(npcContinuationAvailable(s,p),false,mode);assert.ok(validateNpcContinuity(s),mode);}
});
test('a pending dialogue pins only its original participant and leaves its snapshot untouched',()=>{
 const s=adopt(state(),[townNpc(state(),'home',0),townNpc(state(),'home',1)]),slots=Object.values(s.npcContinuity.slots),first=slots[0].personId,second=slots[1].personId;
 s.conversations.pending={personId:first,snapshot:{body:'Original authored body.',choices:[{id:'leave',response:'Original response.'}]}};const pending=clone(s.conversations.pending);s.day=Math.max(...Object.values(s.npcContinuity.people).map(r=>r.retireDay))+1;
 reconcileNpcContinuity(s);assert.equal(slots[0].personId,first);assert.notEqual(slots[1].personId,second);assert.deepEqual(s.conversations.pending,pending);s.conversations.pending=null;reconcileNpcContinuity(s);assert.notEqual(slots[0].personId,first);assert.ok(validateNpcContinuity(s));
});
test('historical slots remain valid when the settlement no longer operates',()=>{
 for(const status of ['destroyed','evacuated','closed']){const s=adopt(state());if(status==='closed')s.world.locations[0].servicesAvailable=false;else s.world.locations[0].status=status;assert.ok(validateNpcContinuity(s),status);}
 const citadel=state();citadel.locationId='citadel';citadel.world.locations[0]={id:'citadel',name:'The Citadel',type:'citadel',status:'stable',services:['market']};adopt(citadel,[townNpc(citadel,'citadel',0),serviceNpc(citadel,'doctor','citadel')]);citadel.world.locations[0].status='destroyed';citadel.world.locations[0].services=[];assert.ok(validateNpcContinuity(citadel),'a destroyed citadel can lose every current service');
});
test('prospective ancestry terms use actual saved identity rather than a universal human schedule',()=>{
 const dates={};for(const ancestry of ['elf','orc']){const s=state(0),p=townNpc(s,'home',0);s.socialLife.met[p.id]={...p,...generateCharacter(s.seed,p.id,{role:p.role,age:p.age,ancestry})};adopt(s,[p]);dates[ancestry]=s.npcContinuity.people[p.id].retireDay;assert.equal(townNpc(s,'home',0).appearance.ancestry,ancestry);assert.ok(validateNpcContinuity(s));}assert.ok(dates.elf>dates.orc);
});
test('a prospective replacement keeps its actual birthday when it becomes a life person',()=>{
 const {s}=retireFavor(),p={...townNpc(s,'home',0),bond:25};assert.ok(Number.isSafeInteger(p.bornDay));s.day+=17;const person=projectLifePerson(s,p);assert.equal(person.bornDay,p.bornDay);
});
test('legacy people already unavailable before adoption are not resurrected or given a grace',()=>{
 const s=state(20*YEAR),old=townNpc(s,'home',0);s.socialLife.met[old.id]=clone(old);s.socialLife.favors.push({id:'favor-'+old.id,personId:old.id,name:old.name,locationId:'home',item:'cloth',status:'active',acceptedDay:s.day,completedDay:null});s.day=55*YEAR;
 const before=residentContacts(s).find(p=>p.id===old.id);assert.equal(before.available,false);adopt(s);const after=residentContacts(s).find(p=>p.id===old.id);assert.equal(after.available,false);assert.equal(s.npcContinuity.people[old.id],undefined);assert.equal(s.socialLife.favors[0].returnWindow,undefined);assert.equal(npcContinuationAvailable(s,after),false);
});
test('a private agreement does not establish current presence after public retirement',()=>{
 const {s,p}=retireFavor();s.sanctuaries={agreements:[{contactId:p.id,status:'active'}],plans:[]};assert.equal(retiredNpcAvailabilityUnknown(s,p.id),true);assert.deepEqual(s.sanctuaries.agreements,[{contactId:p.id,status:'active'}]);
 s.life.people.push({id:p.id,alive:true,locationId:'home'});assert.equal(retiredNpcAvailabilityUnknown(s,p.id),false);s.life.people[0].alive=false;assert.equal(retiredNpcAvailabilityUnknown(s,p.id),false);
});
test('invalid slot identities, construction ages, chronology and private snapshot fields are rejected',()=>{
 const {s}=retireFavor(),current=Object.values(s.npcContinuity.slots).find(d=>d.generation>0),id=current.personId;
 for(const mutate of [
  x=>{x.npcContinuity.people[id].snapshot.memories=['not public'];},
  x=>{x.npcContinuity.people[id].ageBasis.bornDay=x.day;},
  x=>{x.npcContinuity.slots[x.npcContinuity.people[id].slotKey].generation=3500;},
  x=>{const r=x.npcContinuity.people[id];delete x.npcContinuity.people[id];const wrong=id.replace(/r\d+$/,'r999');r.snapshot.id=wrong;x.npcContinuity.people[wrong]=r;x.npcContinuity.slots[r.slotKey].personId=wrong;},
 ]){const bad=clone(s);mutate(bad);assert.equal(validateNpcContinuity(bad),false);}
});
test('merchant owners, stock seasons, stolen provenance and private mentor records are untouched',()=>{
 const s=state();s.realm.sites.home={merchant:{id:'merchant:home:7',name:'Original Merchant',stock:{iron_sword:1},season:33}};s.equipment.instances=[{id:'stolen_1',provenance:{ownerId:'merchant:home:7',propertyId:'original-property'}}];s.progression={mentors:{guardian:{id:'calling-mentor-guardian',met:true,lessons:5}}};const before=clone({sites:s.realm.sites,equipment:s.equipment,progression:s.progression});
 adopt(s,[townNpc(s,'home',0),serviceNpc(s,'doctor','home')]);s.day=Math.max(...Object.values(s.npcContinuity.people).map(r=>r.retireDay))+1;reconcileNpcContinuity(s);assert.deepEqual({sites:s.realm.sites,equipment:s.equipment,progression:s.progression},before);
});

test('genuine pre-feature saves migrate stably without changing current pending/travel payloads',async()=>{
 const E=await import('../dist/js/engine.js');
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
 for(const [key,raw]of Object.entries(fixture.states)){
  const first=E.migrateSave(raw);assert.ok(first,key);assert.ok(E.validateSave(first),key);const before=clone(first);assert.deepEqual(E.migrateSave(clone(first)),before,key+' repeated migration');
  // This is a genuine current migrated state, not an invented pending author.
  // Re-adoption is isolated by removing only the feature marker, before any
  // successor IDs exist. The rest of this current save must be unchanged.
  const legacy=clone(first);delete legacy.npcContinuity;const adopted=E.migrateSave(legacy);assert.ok(adopted,key+' adoption');delete adopted.npcContinuity;assert.deepEqual(adopted,legacy,key+' all nonfeature payloads');
 }
});

test('a real public-engine conversation remains valid with its exact pending author and identity on adoption',async()=>{
 const E=await import('../dist/js/engine.js'),{getContacts}=await import('../dist/js/conversations.js'),{settlementWalkPath}=await import('../dist/js/exploration-ui.js');
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));let s=E.migrateSave(fixture.states.base);
 const p=getContacts(s).find(p=>p.population&&p.locationId===s.locationId);assert.ok(p);
 for(const room of settlementWalkPath(s,p.roomId))s=E.chooseAction(s,'atlas_room_'+room);
 s=E.chooseAction(s,'talk_'+p.id);assert.ok(s.conversations.pending);assert.ok(E.validateSave(s));
 const pending=clone(s.conversations.pending),known=clone(s.socialLife.met[p.id]),relationship=clone(s.conversations.relationships[p.id]);delete s.npcContinuity;
 const adopted=E.migrateSave(s);assert.ok(adopted);assert.deepEqual(adopted.conversations.pending,pending);assert.deepEqual(adopted.socialLife.met[p.id],known);assert.deepEqual(adopted.conversations.relationships[p.id],relationship);assert.ok(E.validateSave(adopted));assert.deepEqual(E.migrateSave(clone(adopted)),adopted);
});

test('diagnostic private-agreement fixtures pause unknown retirees and never grant historical sessions or watches',async()=>{
 const E=await import('../dist/js/engine.js'),{getContacts}=await import('../dist/js/conversations.js'),{onSanctuaryTime,sanctuaryActions,sanctuaryView,sanctuaryMoonPrepared}=await import('../dist/js/sanctuaries.js');
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
 for(const kind of ['donor','watch']){
  const s=E.migrateSave(fixture.states.base),p=getContacts(s).find(p=>p.population&&p.locationId===s.locationId),original=residentContacts(s).find(q=>q.id===p.id);s.socialLife.met[p.id]=clone(original);s.conversations.relationships[p.id]={bond:70,memories:['An existing private agreement.'],knownFacts:[kind==='donor'?'vampire':'lycanthrope']};
  const retirement=s.npcContinuity.people[p.id].retireDay;s.day=retirement;reconcileNpcContinuity(s);assert.equal(getContacts(s).some(q=>q.id===p.id),false);
  // Explicit diagnostic calendar/condition setup, not a claimed natural life.
  s.hero.condition={type:kind==='donor'?'vampire':'lycanthrope',hunger:50,preparedUntil:s.day+100};s.sanctuaries.cases=[];s.sanctuaries.agreements=[];s.sanctuaries.plans=[];
  const agreement=kind==='donor'?{id:'donor-1',contactId:p.id,contactName:p.name,locationId:s.locationId,agreedDay:retirement-30,status:'active',endedDay:null,endReason:null,fee:8,intervalDays:14,nextSessionDay:retirement-1,sessions:0,lastSessionDay:null}:{id:'moon-plan-1',kind:'pack',contactId:p.id,contactName:p.name,locationId:s.locationId,agreedDay:retirement-30,status:'active',endedDay:null,endReason:null,preparedMoon:retirement+50,lastPreparedDay:retirement-2,watches:0};
  (kind==='donor'?s.sanctuaries.agreements:s.sanctuaries.plans).push(agreement);const before=clone(agreement),hunger=s.hero.condition.hunger;s.day++;
  onSanctuaryTime(s,{oldDay:s.day-1,newDay:s.day},{journal(){}});assert.deepEqual(agreement,before);assert.equal(s.hero.condition.hunger,hunger);
  const view=sanctuaryView(s),record=kind==='donor'?view.agreements[0]:view.plans[0];assert.equal(record.availability,'paused');assert.equal(sanctuaryMoonPrepared(s,agreement.preparedMoon||s.day),false);
  const action=sanctuaryActions(s).find(a=>a.id===(kind==='donor'?'sanctuary_feed_':'sanctuary_prepare_')+agreement.id);assert.ok(action?.disabledReason);assert.match(action.disabledReason,/Paused/);
 }
});
