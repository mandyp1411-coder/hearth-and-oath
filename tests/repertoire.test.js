import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPERTOIRE_WORKS,REPERTOIRE_VENUES,createRepertoirePiece,reviseRepertoirePiece,setRepertoirePrivacy,deleteRepertoirePiece,
  repertoireCircuitReason,acceptRepertoireCircuit,withdrawRepertoireCircuit,repertoireReception,startRepertoireRehearsal,startRepertoireRecital,
  repertoireProjectReason,attendRepertoireProject,cancelRepertoireProject,repertoireRecall,openRepertoireRecall,acknowledgeRepertoireRecall,repertoireView,validateRepertoire,
} from '../dist/js/repertoire.js';

// Tiny source-shaped data only. No engine, world generation, browser or timer.
function fixture() {
  return {age:24,day:9000,phase:'adult',locationId:'home',timeline:{birthDay:240},lineage:{currentPersonId:'hero-1'},
    hero:{name:'Aren',profession:'Bard',gold:100,skills:{persuasion:8}},life:{happiness:50,people:[]},careers:{records:{Bard:{workedDays:12,paidWorkedDays:9,unpaidWorkedDays:3,earnedGold:69}},active:{pay:47,status:'accepted'}},
    pastimes:{project:null,pending:null,uses:{'24:performance':1}},event:null,battle:null,conversations:{pending:null},
    npcContinuity:{slots:{},people:Object.fromEntries(['home','brook','city'].map((id,i)=>[`resident-inn-${id}-0`,{retiredDay:null,retireDay:100000,snapshot:{id:`resident-inn-${id}-0`,name:['Edda','Iven','Anwen'][i],role:'Innkeeper',locationId:id}}]))},
    cartography:{interior:{siteId:'home',roomId:'tavern'}},world:{locations:[{id:'home',name:'Hearthmere',type:'village'},{id:'brook',name:'Reedcross',type:'village'},{id:'city',name:'Alderwatch',type:'city'}],roads:[{from:'home',to:'brook'},{from:'brook',to:'city'}]}};
}
function services(s) {
  return REPERTOIRE_VENUES.filter(row=>s.world.locations.some(p=>p.id===row.locationId)).map(row=>{
    const id=`resident-inn-${row.locationId}-0`,name={home:'Edda',brook:'Iven',city:'Anwen'}[row.locationId];
    return {kind:'inn',personId:id,name,roomId:'tavern',locationId:row.locationId,here:s.locationId===row.locationId&&s.cartography.interior.roomId==='tavern',person:{id,name,role:'Innkeeper',locationId:row.locationId,roomId:'tavern',bond:40,available:true,alive:true}};
  });
}
function valid(s) { assert.equal(validateRepertoire(s.repertoire,s),true);return s; }
function add(s,workId='open-chair') { const a=createRepertoirePiece(s,{workId});assert.equal(a.ok,true,a.reason);valid(s);return a.piece.id; }
function accept(s) { const a=acceptRepertoireCircuit(s,services(s));assert.equal(a.ok,true,a.reason);valid(s); }
function go(s,id) { s.locationId=id;s.cartography.interior={siteId:id,roomId:'tavern'}; }
function attend(s,days,{rows=null,event=null}={}) {
  const p=s.repertoire.project,id=p.id,fromDay=s.day;s.day+=days;s.event=event;
  const a=attendRepertoireProject(s,{projectId:id,fromDay,days,services:rows||services(s)});valid(s);return a;
}
function rehearse(s,id,arrangement='solo') { assert.equal(startRepertoireRehearsal(s,id,arrangement).ok,true);assert.equal(attend(s,1).completed,true); }
function perform(s,id,arrangement='solo',permission='once') {
  const a=startRepertoireRecital(s,id,arrangement,permission,services(s));assert.equal(a.ok,true,a.reason);valid(s);
  const result=attend(s,2);assert.equal(result.completed,true,result.reason);return result.receipt;
}

test('views and invalid actions are pure and old saves acquire no speculative art metadata',()=>{
  const s=fixture(),before=structuredClone(s);assert.equal(validateRepertoire(undefined,s),true);
  assert.deepEqual(repertoireView(s).pieces,[]);assert.equal(repertoireCircuitReason(s,services(s)),null);
  assert.equal(createRepertoirePiece(s,{workId:'borrowed-song'}).ok,false);assert.equal(startRepertoireRehearsal(s,'missing','solo').ok,false);
  assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'repertoire'),false);
  const child=fixture();child.age=17;assert.equal(createRepertoirePiece(child,{workId:'open-chair'}).ok,false);assert.equal(Object.hasOwn(child,'repertoire'),false);
});

test('three original drafts have honest fiction sources, actual places and bounded self credits without a class lock',()=>{
  const s=fixture();s.hero.profession='Unemployed';s.hero.path='unformed';const old=structuredClone(s);
  for (const row of REPERTOIRE_WORKS) {const id=add(s,row.id),p=s.repertoire.pieces.find(p=>p.id===id);assert.equal(p.privacy,'private');assert.equal(p.source.kind,'original-fiction');assert.equal(p.source.locationId,'home');assert.deepEqual(p.credits,[{personId:'hero-1',name:'Aren',role:'words'}]);assert.equal(p.verse.split('\n').length,4);}
  assert.equal(createRepertoirePiece(s,{workId:'open-chair'}).ok,false);valid(s);
  const own=structuredClone(s);delete own.repertoire;assert.deepEqual(own,old);assert.equal(Object.isFrozen(REPERTOIRE_WORKS[0].lines),true);
});

test('revisions are private and unprepared, while explicit public-copy permission is separate from a public rendition',()=>{
  const s=fixture(),id=add(s);accept(s);rehearse(s,id);
  assert.equal(startRepertoireRecital(s,id,'solo',undefined,services(s)).ok,false);
  assert.equal(startRepertoireRecital(s,id,'solo','manuscript',services(s)).ok,false);
  assert.equal(setRepertoirePrivacy(s,id,'public').ok,true);assert.equal(s.repertoire.pieces[0].privacy,'public');
  assert.equal(reviseRepertoirePiece(s,id,{endingId:'quiet'}).ok,true);const p=s.repertoire.pieces[0];assert.equal(p.revision,2);assert.equal(p.privacy,'private');assert.equal(p.rehearsal,null);
  const receipt=perform(s,id);assert.equal(receipt.permission,'once');assert.equal(p.privacy,'private');assert.equal(receipt.piece.revision,2);
  go(s,'brook');assert.equal(setRepertoirePrivacy(s,id,'public').ok,true);const copy=perform(s,id,'refrain','manuscript');assert.equal(copy.permission,'manuscript');assert.equal(p.privacy,'public');valid(s);
});

test('a circuit requires all three actual operating Taverns and open road reachability before acceptance',()=>{
  for (const edit of [s=>s.world.locations=s.world.locations.filter(p=>p.id!=='brook'),s=>s.world.locations[1].status='destroyed',s=>s.world.locations[2].servicesAvailable=false,s=>s.world.roads[1].closed=true,s=>s.world.roads=[]]) {
    const s=fixture();edit(s);const before=structuredClone(s),a=acceptRepertoireCircuit(s,services(s));assert.equal(a.ok,false);assert.match(a.reason,/missing|operating|open road/);assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'repertoire'),false);
  }
  const s=fixture();assert.equal(acceptRepertoireCircuit(s,services(s).slice(0,2)).ok,false);s.cartography.interior.roomId='gate';assert.equal(acceptRepertoireCircuit(s,services(s)).ok,false);
  go(s,'home');accept(s);assert.deepEqual(s.repertoire.circuit.targets.map(p=>p.locationId),['home','brook','city']);assert.deepEqual(s.repertoire.circuit.targets.map(p=>p.name),['Tavern at Hearthmere','Tavern at Reedcross','Tavern at Alderwatch']);
  assert.equal(acceptRepertoireCircuit(s,services(s)).ok,false);
});

test('accepted targets never change on closure and an impossible stop can be withdrawn without a replacement',()=>{
  const s=fixture(),id=add(s);accept(s);const targets=structuredClone(s.repertoire.circuit.targets);
  s.world.locations[0].status='evacuated';assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,false);
  assert.deepEqual(s.repertoire.circuit.targets,targets);assert.equal(withdrawRepertoireCircuit(s).ok,true);assert.equal(s.repertoire.circuit.withdrawnDay,s.day);
  assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,false);assert.equal(s.repertoire.performances.length,0);valid(s);
});

test('the same piece and arrangement have genuinely different audience reception, with visible preparation and experience factors',()=>{
  const piece={workId:'open-chair'},home=repertoireReception(piece,'solo','home',{rehearsed:true}),brook=repertoireReception(piece,'solo','brook',{rehearsed:true});
  assert.deepEqual([home.score,home.reception,home.joy],[4,'warm',4]);assert.deepEqual([brook.score,brook.reception,brook.joy],[1,'divided',1]);assert.notEqual(home.context,brook.context);
  assert.equal(repertoireReception(piece,'refrain','brook',{rehearsed:true}).reception,'attentive');assert.equal(repertoireReception(piece,'refrain','brook',{rehearsed:true,priorPerformance:true}).reception,'warm');
  assert.equal(repertoireReception({workId:'two-banks'},'refrain','brook').reception,'warm');assert.equal(repertoireReception(piece,'solo','invented-inn'),null);
});

test('actual rehearsal and recital days pause across a birthday; no global skill, income or old performance terms change',()=>{
  const s=fixture(),old=structuredClone({hero:s.hero,careers:s.careers,pastimes:s.pastimes}),id=add(s);accept(s);
  assert.equal(startRepertoireRehearsal(s,id,'solo').ok,true);let a=attend(s,0);assert.equal(a.completed,false);assert.equal(s.repertoire.pieces[0].rehearsal,null);
  a=attend(s,1);assert.equal(a.completed,true);assert.equal(s.repertoire.pieces[0].rehearsal.attendedDays,1);
  assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);
  a=attend(s,1,{event:{id:'birth_adult_year',title:'Exact birthday'}});assert.equal(a.completed,false);assert.equal(s.repertoire.project.completedDays,1);assert.equal(s.repertoire.performances.length,0);assert.equal(s.life.happiness,50);
  assert.equal(repertoireProjectReason(s,services(s)),'Finish the current moment first.');s.event=null;s.day+=1;
  a=attend(s,1);assert.equal(a.completed,true);assert.equal(a.receipt.attendedDays,2);assert.equal(s.life.happiness,54);
  assert.deepEqual({hero:s.hero,careers:s.careers,pastimes:s.pastimes},old);valid(s);
});

test('frozen pending and completed versions survive edit, privacy change and deletion; old words never resolve through a mutable manuscript',()=>{
  const s=fixture(),id=add(s);accept(s);rehearse(s,id);assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);
  const booked=structuredClone(s.repertoire.project.piece);assert.equal(reviseRepertoirePiece(s,id,{title:'A Different Title',endingId:'quiet'}).ok,true);assert.equal(setRepertoirePrivacy(s,id,'public').ok,true);
  assert.equal(deleteRepertoirePiece(s,id).ok,true);assert.deepEqual(s.repertoire.project.piece,booked);valid(s);
  const receipt=attend(s,2).receipt;assert.deepEqual(receipt.piece,booked);assert.equal(receipt.permission,'once');assert.equal(s.repertoire.pieces.length,0);
  const frozen=structuredClone(receipt);s.day++;const host=services(s)[0].person;assert.equal(repertoireRecall(s,host).piece.title,booked.title);assert.deepEqual(receipt,frozen);valid(s);
});

test('JSON reload, stale and repeated settlement cannot duplicate attendance, Joy, receipts or circuit completion',()=>{
  let s=fixture();const id=add(s);accept(s);rehearse(s,id);assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);
  const projectId=s.repertoire.project.id,fromDay=s.day;attend(s,1);s=structuredClone(JSON.parse(JSON.stringify(s)));valid(s);
  const before=structuredClone(s);assert.equal(attendRepertoireProject(s,{projectId,fromDay,days:1,services:services(s)}).ok,false);assert.deepEqual(s,before);
  attend(s,1);const completed=structuredClone(s);assert.equal(attendRepertoireProject(s,{projectId,fromDay:s.day-1,days:1,services:services(s)}).ok,false);assert.deepEqual(s,completed);
  go(s,'brook');perform(s,id);go(s,'city');perform(s,id);assert.equal(s.repertoire.circuit.completedDay,s.day);assert.equal(s.repertoire.performances.length,3);assert.equal(s.repertoire.performances[1].priorPerformanceId,s.repertoire.performances[0].id);
  assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,false);assert.equal(withdrawRepertoireCircuit(s).ok,false);valid(s);
});

test('cancellation and death preserve actual time but grant no unfinished recital or rehearsal award',()=>{
  const s=fixture(),id=add(s);accept(s);assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);attend(s,1);
  assert.deepEqual(cancelRepertoireProject(s),{ok:true,completedDays:1});assert.equal(s.repertoire.performances.length,0);assert.equal(s.life.happiness,50);
  assert.equal(startRepertoireRehearsal(s,id,'solo').ok,true);const projectId=s.repertoire.project.id,fromDay=s.day;s.day++;s.phase='retired';assert.equal(attendRepertoireProject(s,{projectId,fromDay,days:1,services:services(s)}).retired,true);
  assert.equal(s.repertoire.project,null);assert.equal(s.repertoire.pieces[0].rehearsal,null);assert.equal(s.life.happiness,50);valid(s);
});

test('an innkeeper successor never inherits a booking or recognition and the real heard host is not pinned immortal',()=>{
  const s=fixture(),id=add(s);accept(s);assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);
  const rows=services(s),replacement=rows[0];replacement.personId='resident-npc16-inn-home-r1';replacement.person={...replacement.person,id:replacement.personId};
  assert.match(repertoireProjectReason(s,rows),/exact booked listener/);const old=structuredClone(s.repertoire);s.day+=2;
  assert.equal(attendRepertoireProject(s,{projectId:old.project.id,fromDay:s.day-2,days:2,services:rows}).ok,false);assert.deepEqual(s.repertoire,old);assert.equal(s.life.happiness,50);
  assert.equal(cancelRepertoireProject(s).ok,true);perform(s,id);s.day++;const host=services(s)[0].person;
  assert.ok(repertoireRecall(s,host));assert.equal(repertoireRecall(s,{...host,id:replacement.personId}),null);
  s.npcContinuity={people:{[host.id]:{retiredDay:s.day,retireDay:s.day,snapshot:host}}};assert.equal(repertoireRecall(s,host),null);valid(s);
});

test('explicit receipt-backed recall respects pending, hostility, readiness and actual presence without consuming generic topics',()=>{
  const s=fixture(),id=add(s);accept(s);const receipt=perform(s,id),host=services(s)[0].person;
  assert.equal(repertoireRecall(s,host),null);s.day++;const before=structuredClone(s),scene=repertoireRecall(s,host);assert.deepEqual(s,before);assert.equal(scene.title,'Talk about The Open Chair');assert.ok(scene.body.includes(receipt.piece.verse.split('\n').at(-1)));
  for (const p of [{...host,roomId:'gate'},{...host,available:false},{...host,alive:false},{...host,retired:true},{...host,bond:14},{...host,id:'same-name-other-person'},{...host,name:'A Name They Never Had'}]) assert.equal(repertoireRecall(s,p),null);
  assert.equal(repertoireRecall(s,host,{hostile:true}),null);assert.equal(repertoireRecall(s,host,{readinessReason:'unresolved account'}),null);
  s.conversations.pending={nodeId:'person_v30',body:'An exact earlier conversation'};assert.equal(repertoireRecall(s,host),null);assert.equal(acknowledgeRepertoireRecall(s,host,receipt.id,'listen').ok,false);s.conversations.pending=null;
  const noReward=structuredClone({hero:s.hero,life:s.life,careers:s.careers,pastimes:s.pastimes,conversations:s.conversations});assert.equal(acknowledgeRepertoireRecall(s,host,receipt.id,'ending').ok,true);assert.equal(repertoireRecall(s,host),null);assert.equal(acknowledgeRepertoireRecall(s,host,receipt.id,'ending').ok,false);
  assert.deepEqual({hero:s.hero,life:s.life,careers:s.careers,pastimes:s.pastimes,conversations:s.conversations},noReward);valid(s);
});

test('save validation rejects invented words, credits, venues, readiness, dates, reception and receipt attribution',()=>{
  const s=fixture(),id=add(s);accept(s);rehearse(s,id);perform(s,id);s.day++;valid(s);
  const edits=[r=>r.extra=true,r=>r.ownerId='another-hero',r=>r.sequence=0,r=>r.pieces.push(...r.pieces,...r.pieces,...r.pieces),r=>r.pieces[0].verse='Borrowed words',r=>r.pieces[0].credits[0].personId='someone-else',r=>r.pieces[0].rehearsal.attendedDays=0,r=>r.pieces[0].rehearsal.completedDay=s.day+1,r=>r.circuit.targets[0].locationId='invented',r=>r.circuit.targets[0].name='Invented Inn',r=>r.circuit.completedDay=s.day,r=>r.circuit.stops.push(r.circuit.stops[0]),r=>r.performances[0].score=99,r=>r.performances[0].joy=50,r=>r.performances[0].piece.verse='Changed memory',r=>r.performances[0].performedDay=r.performances[0].startedDay,r=>r.performances[0].listener.locationId='city',r=>r.performances[0].priorPerformanceId=r.performances[0].id,r=>r.recall.personId='another-person',r=>r.recall.acknowledgedDay=s.day];
  for (const edit of edits) {const r=structuredClone(s.repertoire);edit(r);assert.equal(validateRepertoire(r,s),false,edit.toString());}
});

test('historical receipts remain valid when manuscripts disappear or venues close, and never authorize an heir',()=>{
  const s=fixture(),id=add(s);accept(s);perform(s,id);deleteRepertoirePiece(s,id);s.world.locations[0].status='destroyed';valid(s);
  const heir=structuredClone(s);heir.lineage.currentPersonId='hero-2';assert.equal(validateRepertoire(heir.repertoire,heir),false);assert.equal(createRepertoirePiece(heir,{workId:'two-banks'}).ok,false);
  delete heir.repertoire;assert.equal(validateRepertoire(undefined,heir),true);assert.equal(repertoireView(heir).pieces.length,0);assert.equal(Object.hasOwn(heir,'repertoire'),false);
});

test('a name alone cannot invent a listener and inconsistent versions cannot rewrite the same historical piece',()=>{
  const s=fixture(),id=add(s);accept(s);const unknown=structuredClone(s);delete unknown.npcContinuity.people['resident-inn-home-0'];
  const before=structuredClone(unknown);assert.equal(startRepertoireRecital(unknown,id,'solo','once',services(unknown)).ok,false);assert.deepEqual(unknown,before);
  perform(s,id);valid(s);
  for (const edit of [r=>r.performances[0].listener.id='same-name-invented-person',r=>r.performances[0].piece.title='Rewritten old title',r=>r.performances[0].piece.credits[0].name='Different author',r=>r.pieces[0].id=r.circuit.id.replace('circuit','piece')]) {
    const r=structuredClone(s.repertoire);edit(r);assert.equal(validateRepertoire(r,s),false,edit.toString());
  }
  assert.equal(reviseRepertoirePiece(s,id,{title:'An Actual New Revision'}).ok,true);valid(s);go(s,'brook');assert.equal(startRepertoireRecital(s,id,'solo','once',services(s)).ok,true);
  assert.equal(s.repertoire.project.priorPerformanceId,null,'a new revision cannot claim the old version’s performed confidence');
  const future=structuredClone(s.repertoire);future.project.piece.pieceId='repertoire-piece-500000';assert.equal(validateRepertoire(future,s),false);
  const overlap=structuredClone(s);overlap.careers.batch={kind:'work'};assert.equal(validateRepertoire(overlap.repertoire,overlap),false);
  const view=repertoireView(s);view.project.piece.title='Not a real edit';assert.notEqual(view.project.piece.title,s.repertoire.project.piece.title);
});

test('only an explicitly opened recollection captures a frozen scene; its exact choices and words survive reload',()=>{
  const s=fixture(),id=add(s);accept(s);const heard=perform(s,id);s.day++;const host=services(s)[0].person;
  assert.equal(Object.hasOwn(s.repertoire,'pending'),false,'merely completing a recital does not open a conversation');
  const opened=openRepertoireRecall(s,host);assert.equal(opened.ok,true);const scene=opened.scene;
  s.event={id:'repertoire_recall',title:scene.title,body:scene.body,choices:scene.choices.map(({id,label,description})=>({id,label,description}))};
  valid(s);const loaded=JSON.parse(JSON.stringify(s));valid(loaded);assert.deepEqual(loaded.repertoire.pending,s.repertoire.pending);assert.deepEqual(loaded.event,s.event);
  opened.scene.body='A changed caller object';assert.notEqual(s.repertoire.pending.snapshot.body,opened.scene.body);
  for(const edit of [r=>r.pending.termsVersion=2,r=>r.pending.personId='same-name-successor',r=>r.pending.snapshot.body='A different memory',r=>r.pending.snapshot.choices[0].effect={gold:99},r=>r.pending.openedDay=heard.performedDay]){
    const r=structuredClone(s.repertoire);edit(r);assert.equal(validateRepertoire(r,s),false,edit.toString());
  }
  const changed=structuredClone(s);changed.event.choices[0].label='Different saved terms';assert.equal(validateRepertoire(changed.repertoire,changed),false);
  const noScene=structuredClone(s);noScene.event=null;assert.equal(validateRepertoire(noScene.repertoire,noScene),false);
  s.event=null;assert.equal(acknowledgeRepertoireRecall(s,host,heard.id,'leave').ok,true);s.repertoire.pending=null;valid(s);
});
