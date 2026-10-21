import { peopleScene } from '../dist/js/people-dialogue.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { syncCartography } from '../dist/js/cartography.js';
import { LIFE_STORIES, applyStoryChoice, applyStoryAction, storyChoiceReason } from '../dist/js/life-stories.js';
import { captureStoryRow, storyDeeds } from '../dist/js/story-continuity.js';
import { enterDungeon, explorationActions, dungeonView, negotiationChecklist } from '../dist/js/exploration.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { mountApp } from './helpers/ui-surface.mjs';

function settle(state){
  for(let i=0;i<240;i++){
    if(state.event){const available=state.event.choices.filter(c=>!c.disabledReason);const physical=state.event.id==='health_concern'&&state.health?.pending?.kind==='physical';state=E.chooseEventOption(state,(physical&&available.find(c=>c.id==='rest')||available.find(c=>['care','continue','later','keep','wait','support'].includes(c.id))||available[0]).id);}
    else if(state.conversations?.pending)state=E.replyMessage(state,state.conversations.pending.personId,state.conversations.pending.replies[0].id);
    else if(state.stories?.project)state=E.chooseAction(state,'stories_continue');
    else if(state.timeline?.yearTarget!=null)state=E.continueAgeUp(state);
    else {assert.ok(E.validateSave(state));return state;}
    assert.ok(E.validateSave(state));
  }
  throw Error('Fixture did not settle through public decisions');
}
const base=settle(await createLifeAtAge({seed:'continuity-focus-three',startAge:30,difficulty:'gentle'}));
function fresh(){
  const s=structuredClone(base);s.hero.gold=10000;
  // Controlled prior employment/affordability fixture; not an additional audited life.
  s.hero.profession='Blacksmith';Object.assign(s.careers.records.Blacksmith,{workedDays:180,paidWorkedDays:180,unpaidWorkedDays:0,experience:180,mastery:1,reputation:40});
  assert.ok(E.validateSave(s));return s;
}
const roundtrip=s=>{assert.ok(E.validateSave(s));const loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded,s);return loaded;};
function open(s,id){s=E.chooseAction(s,'stories_open_'+id);assert.equal(s.event?.id,'stories_chapter');return s;}
function next(s,id){for(let guard=0;s.age<s.stories.arcs.find(a=>a.id===id).nextAge;guard++){assert.ok(guard<80&&s.phase!=='retired',`the fixture life must reach the next chapter alive (age ${s.age}, ${s.health?.deathCause||'alive'})`);s=settle(E.ageUp(s));}return open(s,id);}
function complete(s,pick){return settle(E.chooseEventOption(s,pick));}

test('a credited commission followed by unpaid work returns as a wage grievance, with credit intact',()=>{
  let s=complete(open(fresh(),'two_names'),'enterprise');s=next(s,'two_names');
  assert.match(s.event.body,/without paying|without a new fee/);
  s=complete(s,'coercion');s=roundtrip(s);s=next(s,'two_names');
  assert.match(s.event.body,/unpaid-work tally/);assert.match(s.event.body,/shared credit remains/);
  assert.doesNotMatch(s.event.body,/invented report|signature beside the lie|credit you took/);
  const before=s.hero.gold;s=complete(s,'care');const arc=s.stories.arcs.find(a=>a.id==='two_names');
  assert.equal(arc.choices[2].cost,18);assert.equal(arc.choices[2].reward,0);assert.ok(s.hero.gold<=before-18);
  assert.equal(storyDeeds(arc).unpaid,false);assert.equal(storyDeeds(arc).credit,false);
  assert.equal(arc.status,'completed');assert.equal(arc.choices.length,3);roundtrip(s);
});

test('restricting an already credited teaching archive is remembered as exclusion rather than credit theft',()=>{
  let s=complete(open(fresh(),'own_key'),'enterprise');s=next(s,'own_key');s=complete(s,'coercion');s=next(roundtrip(s),'own_key');
  assert.match(s.event.body,/restriction still blocks access/);assert.match(s.event.body,/names already on the work/);
  assert.doesNotMatch(s.event.body,/work whose credit you took|stole their credit|invented fault/);
  s=complete(s,'care');const arc=s.stories.arcs.find(a=>a.id==='own_key');
  assert.equal(storyDeeds(arc).archive,false);assert.equal(storyDeeds(arc).credit,false);roundtrip(s);
});

test('repair of an actual authorship theft restores the maker while recording the hero’s stated reputation cost',()=>{
  let s=complete(open(fresh(),'two_names'),'coercion');s=next(s,'two_names');
  const care=s.event.choices.find(c=>c.id==='care');assert.match(care.description,/local standing -3/);assert.match(care.description,/professional reputation -5/);
  s=complete(s,'care');const arc=s.stories.arcs.find(a=>a.id==='two_names'),repair=arc.choices[1];
  assert.equal(repair.consequences.standing,-3);assert.equal(repair.consequences.career,-5);assert.ok(repair.consequences.bond>0);
  assert.equal(storyDeeds(arc).credit,false);s=next(roundtrip(s),'two_names');
  assert.doesNotMatch(s.event.body,/claim to their authorship is still unresolved/);roundtrip(s);
});

test('old labels distinguish unpaid labor, false allegations and suppression without inventing a different action',()=>{
  const baseRow=LIFE_STORIES.find(d=>d.id==='two_names').chapters[2];
  const a={id:'two_names',chapter:2,contentVersion:2,choices:[{id:'enterprise',label:'Buy a clearly credited copy',outcome:'The fieldworker kept credit.'},{id:'coercion',label:'Force the colleague to finish unpaid work',outcome:'A dated grievance records imposed unpaid work.'}]};
  const row=captureStoryRow(a,baseRow);assert.match(row[0],/unpaid/);assert.doesNotMatch(row[0],/false report/);
  a.choices[1]={id:'coercion',label:'Undermine their patron with a false report',outcome:'You sent an invented report.'};assert.match(captureStoryRow(a,baseRow)[0],/false report/);
  a.choices[1]={id:'coercion',label:'Buy the patron’s silence and maintain the false claim',outcome:'The account was suppressed.'};assert.match(captureStoryRow(a,baseRow)[0],/suppress/);assert.doesNotMatch(captureStoryRow(a,baseRow)[0],/false report you sent/);
  a.choices[1]={id:'coercion',label:'Reserve the record and control who may learn',outcome:'The archive excluded independent learners.'};
  const own={...a,id:'own_key'};assert.match(captureStoryRow(own,LIFE_STORIES.find(d=>d.id==='own_key').chapters[2])[0],/restriction/);
  assert.equal(storyDeeds(own).credit,false);
});

test('each three-chapter arc adds different work and outcomes even when the same approach is repeated',()=>{
  for(const definition of LIFE_STORIES){
    for(const pick of ['care','enterprise','coercion']){
      const arc={id:definition.id,chapter:0,contentVersion:4,choices:[]},premises=[],labels=[],outcomes=[];
      for(let chapter=0;chapter<3;chapter++){
        arc.chapter=chapter;const row=captureStoryRow(arc,definition.chapters[chapter]),option=row[['care','enterprise','coercion'].indexOf(pick)+1];
        premises.push(row[0]);labels.push(option.label);outcomes.push(option.outcome);
        arc.choices.push({id:pick,label:option.label,outcome:option.outcome,deed:option.deed});
      }
      assert.equal(new Set(premises).size,3,definition.id+' '+pick+' premises');
      assert.equal(new Set(labels).size,3,definition.id+' '+pick+' work');
      assert.equal(new Set(outcomes).size,3,definition.id+' '+pick+' outcomes');
    }
  }
});

test('authored terms vary by dilemma; paid work remains credible and pressure is not always a quick payment',()=>{
  const first=id=>captureStoryRow({id,chapter:0,contentVersion:4,choices:[]},LIFE_STORIES.find(d=>d.id===id).chapters[0]);
  assert.equal(first('two_names')[2].terms.days,2);assert.equal(first('two_names')[2].terms.reward,22);
  assert.equal(first('cracked_mark')[2].terms.days,3);assert.equal(first('cracked_mark')[2].terms.reward,28);
  assert.equal(first('child_other_road')[2].terms.reward,0);
  assert.equal(first('deserter_unfinished_boot')[3].terms.reward,0);
  const ending=captureStoryRow({id:'own_key',chapter:2,contentVersion:4,choices:[]},LIFE_STORIES.find(d=>d.id==='own_key').chapters[2]);
  assert.equal(ending[3].terms.days,5);assert.equal(ending[3].terms.cost,18);assert.equal(ending[3].terms.reward,0);
});

test('a captured proposal retains its fee, duration, outcome and consequence terms through import',()=>{
  let s=open(fresh(),'two_names');const captured=structuredClone(s.stories.pending.rowSnapshot);s=roundtrip(s);
  const before=s.hero.gold;s=complete(s,'enterprise');const row=s.stories.arcs[0].choices[0];
  assert.equal(row.days,2);assert.equal(row.cost,4);assert.equal(row.reward,22);assert.equal(row.outcome,captured[2].outcome.replaceAll('{name}',s.stories.arcs[0].personName));
  assert.ok(s.hero.gold<=before-4+22);assert.equal(row.consequences.career,2);roundtrip(s);
});

test('no attendance charges no fee; the first real day reserves the agreed payment only once',()=>{
  let s=open(fresh(),'two_names');const originalGold=s.hero.gold,originalDay=s.day;s.event=null;
  assert.equal(applyStoryChoice(s,'stories_chapter','care',{spendDays:()=>0}),true);
  assert.equal(s.hero.gold,originalGold);assert.equal(s.day,originalDay);assert.equal(s.stories.project.paid,false);roundtrip(s);
  const context={spendDays(){assert.equal(s.hero.gold,originalGold-8);s.day++;return 1;}};
  assert.equal(applyStoryAction(s,'stories_continue',context),true);assert.equal(s.hero.gold,originalGold-8);assert.equal(s.stories.project.paid,true);
  assert.equal(applyStoryAction(s,'stories_continue',context),true);assert.equal(s.hero.gold,originalGold-8);assert.equal(s.stories.project.completedDays,2);roundtrip(s);
});

test('a captured proposal keeps its terms away; a new remote chapter requires the recorded site',()=>{
  let s=complete(open(fresh(),'cracked_mark'),'enterprise');s=next(s,'cracked_mark');
  const arc=s.stories.arcs[0],oldSite=arc.locationId,captured=structuredClone(s.event),other=s.world.locations.find(p=>p.id!==oldSite&&['city','town','village'].includes(p.type));
  // Controlled relocation isolates saved-proposal attendance, not earned travel.
  s.locationId=other.id;syncCartography(s);s=E.migrateSave(s);const before=structuredClone(s);roundtrip(s);assert.deepEqual(s.event,captured);
  assert.match(storyChoiceReason(s,'care'),/Travel to/);
  const rejected=E.chooseEventOption(s,'care');assert.equal(rejected.day,s.day);assert.equal(rejected.hero.gold,s.hero.gold);assert.deepEqual(rejected.stories,s.stories);
  s=E.chooseEventOption(s,'defer');assert.equal(s.event,null);assert.equal(s.locationId,other.id);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.stories.arcs[0].chapter,1);assert.equal(s.stories.arcs[0].status,'active');
  const blocked=E.chooseAction(s,'stories_open_cracked_mark');assert.equal(blocked.event,null);assert.equal(blocked.day,s.day);assert.deepEqual(blocked.stories,s.stories);
  s.locationId=oldSite;syncCartography(s);s=open(E.migrateSave(s),'cracked_mark');s=complete(s,'enterprise');assert.equal(s.locationId,oldSite);roundtrip(s);
});

test('a captured legacy letter preserves its original words, reply and privacy without offering a new remote meeting',()=>{
  let s=fresh();const p=getContacts(s).find(p=>p.locationId!==s.locationId&&p.age>=16&&peopleScene(s,p));assert.ok(p);assert.ok(!E.getActions(s).some(a=>a.id==='talk_'+p.id&&!a.disabledReason));
  const scene=peopleScene(s,p),campaign=structuredClone(s.campaign),day=s.day,place=s.locationId;
  s.conversations.pending={personId:p.id,nodeId:scene.nodeId,topic:scene.topic,replies:scene.choices.map(({id,label,description})=>({id,label,description})),snapshot:structuredClone(scene)};
  const id='letter-'+(++s.conversations.sequence);(s.conversations.threads[p.id]||=[]).push({id,speaker:p.id,text:scene.body,day:s.day,age:s.age});
  assert.match(scene.body,/A letter from/);assert.doesNotMatch(scene.body,/between their fingers|saved a chair|kept the better chair/);
  const words=structuredClone(s.conversations.pending.snapshot);s=roundtrip(s);assert.deepEqual(s.conversations.pending.snapshot,words);
  s=E.replyMessage(s,p.id,'share');assert.equal(s.day,day);assert.equal(s.locationId,place);assert.deepEqual(s.campaign,campaign);assert.equal(getThread(s,p.id).messages.at(-1).text,scene.choices.find(c=>c.id==='share').response);roundtrip(s);
});

test('legacy proposals and five-chapter records retain their saved words and original work schedule',()=>{
  let s=open(fresh(),'two_names');s.stories.arcs[0].contentVersion=3;delete s.stories.pending.rowSnapshot;
  s.event.body='A saved older proposal with its original words.';s.event.choices=s.event.choices.filter(c=>c.id!=='defer');
  s.event.choices.find(c=>c.id==='enterprise').description='Four committed days, no fee, 24 gold proceeds.';
  const pending=structuredClone(s.event);s=roundtrip(s);assert.deepEqual(s.event,pending);
  s=complete(s,'enterprise');const arc=s.stories.arcs[0];assert.equal(arc.choices[0].days,4);assert.equal(arc.choices[0].cost,0);assert.equal(arc.choices[0].reward,24);
  arc.chapter=5;arc.status='completed';arc.outcome='enterprise';arc.choices=Array.from({length:5},(_,i)=>({...arc.choices[0],label:'Original legacy decision '+(i+1),outcome:'Original legacy outcome '+(i+1)}));
  const old=structuredClone(arc.choices);s=roundtrip(s);assert.deepEqual(s.stories.arcs[0].choices,old);
});

test('malformed or missing captured terms cannot become a live imported story commitment',()=>{
  const s=open(fresh(),'two_names');
  for(const mutate of [v=>v.stories.pending.rowSnapshot[1].terms.days=0,v=>v.stories.pending.rowSnapshot[1].terms.reward=-1,v=>delete v.stories.pending.rowSnapshot,v=>v.stories.pending.rowSnapshot[1].terms.career=Infinity]){
    const bad=structuredClone(s);mutate(bad);assert.equal(E.migrateSave(JSON.parse(JSON.stringify(bad))),null);
  }
  roundtrip(s);
});

test('a new return in an older five-chapter arc quotes real review costs without changing its chapter count',()=>{
  let s=open(fresh(),'two_names');s.stories.arcs[0].contentVersion=3;delete s.stories.pending.rowSnapshot;s=complete(s,'enterprise');
  s=next(s,'two_names');s=complete(s,'coercion');s=next(roundtrip(s),'two_names');
  const quote=s.stories.pending.rowSnapshot[2].terms;assert.ok(quote.cost>0);assert.equal(quote.reward,0);
  s=complete(s,'enterprise');assert.equal(s.stories.arcs[0].contentVersion,3);assert.equal(s.stories.arcs[0].status,'active');assert.equal(s.stories.arcs[0].choices[2].cost,quote.cost);roundtrip(s);
});

test('campaign refuge preparation records an explicit pledge using existing capacity rather than free construction',()=>{
  let s=fresh();s.locationId='home';syncCartography(s);s.campaign.stage='prepare';s.campaign.act=4;s.campaign.facts.plannedEnding='haven';s.campaign.facts.refugeeShelter=true;
  s=E.chooseAction(s,'journal_main_accept');s=E.chooseAction(s,'quest_begin_prepare');assert.equal(s.event.id,'quest_prepare');
  const option=s.event.choices.find(c=>c.id==='refuge');assert.match(option.label,/pledge/);assert.match(option.description,/existing rooms|donated reserves/);assert.doesNotMatch(option.label,/Build/);
  const before=structuredClone(s);s=E.chooseEventOption(s,'refuge');
  assert.equal(s.campaign.facts.preparationBasis,'pledged_existing_capacity');assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);
  assert.deepEqual(s.equipment.materials,before.equipment.materials);assert.deepEqual(s.world.locations,before.world.locations);roundtrip(s);
});

function dungeonFixture(){
  const s=fresh();s.locationId='marsh';syncCartography(s);for(const key of Object.keys(s.hero.skills))s.hero.skills[key]=5;
  const context={setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},journal:()=>{}};
  assert.equal(enterDungeon(s,'cistern',null,context),true);assert.ok(E.validateSave(s));return s;
}
function pick(s,id){assert.ok(s.event.choices.some(c=>c.id===id&&!c.disabledReason),id);const before=s.day;s=E.chooseEventOption(s,id);assert.ok(E.validateSave(s));assert.ok(s.day>=before);return s;}
function walk(s,target){
  for(let n=0;n<30&&s.dungeon.roomId!==target;n++){
    const current=s.dungeon.definition.rooms.find(r=>r.id===s.dungeon.roomId);
    if(!s.dungeon.cleared.includes(current.id)&&current.kind!=='safe'&&current.kind!=='boss'){
      if(current.kind==='fight'){if(!s.dungeon.facts['listened_'+current.id])s=pick(s,'listen');s=pick(s,'parley');}
      else if(current.kind==='hazard')s=pick(s,'search');
      else if(current.kind==='treasure')s=pick(s,'take');
      else if(current.kind==='witness'){if(!s.dungeon.facts.witnessHeard)s=pick(s,'hear_witness');s=pick(s,'record_witness');}
      else if(current.kind==='dilemma')s=pick(s,'preserve');
    }
    const offered=new Set(s.event.choices.filter(c=>c.id.startsWith('route_')).map(c=>c.id.slice(6)));
    const queue=[[s.dungeon.roomId]],seen=new Set();let path;
    while(queue.length){const candidate=queue.shift(),id=candidate.at(-1);if(id===target){path=candidate;break;}if(seen.has(id))continue;seen.add(id);const room=s.dungeon.definition.rooms.find(r=>r.id===id);for(const exit of room.exits)if(candidate.length>1||offered.has(exit))queue.push([...candidate,exit]);}
    assert.ok(path?.[1],'Fixture has a reachable offered route');s=pick(s,'route_'+path[1]);
  }
  assert.equal(s.dungeon.roomId,target);return s;
}

test('recovered cache objects stay distinct from examined testimony, actual aid and trusted judgment',()=>{
  let s=walk(dungeonFixture(),'cache');s=pick(s,'take');assert.equal(Boolean(s.dungeon.facts.variantProof),false);s=walk(s,'keeper');s=pick(s,'listen');
  const initial=negotiationChecklist(s);assert.equal(initial.find(r=>r.id==='account').met,true);assert.equal(initial.find(r=>r.id==='proof').met,false);assert.equal(initial.find(r=>r.id==='aid').met,false);assert.equal(initial.find(r=>r.id==='judgment').met,true);
  assert.match(s.event.choices.find(c=>c.id==='parley').disabledReason,/Missing preserved account/);assert.match(s.event.choices.find(c=>c.id==='parley').disabledReason,/Missing practical aid/);
  const evidence=s.dungeon.definition.rooms.find(r=>r.optional&&['witness','dilemma'].includes(r.kind));s=walk(s,evidence.id);
  if(evidence.kind==='witness'){s=pick(s,'hear_witness');s=pick(s,'record_witness');}else s=pick(s,'preserve');
  s=walk(roundtrip(s),'keeper');assert.equal(negotiationChecklist(s).find(r=>r.id==='proof').met,true);assert.equal(negotiationChecklist(s).find(r=>r.id==='aid').met,false);
  assert.doesNotMatch(s.event.choices.find(c=>c.id==='parley').disabledReason,/Missing preserved account/);
  const aid=evidence.kind==='witness'?evidence:s.dungeon.definition.rooms.find(r=>r.id==='service');s=walk(s,aid.id);
  const material=aid.id==='service'?'ore':'cloth',amount=s.equipment.materials[material],day=s.day;s=pick(s,'aid_only');assert.equal(s.equipment.materials[material],amount-1);assert.equal(s.day,day+1);
  s=walk(roundtrip(s),'keeper');assert.ok(negotiationChecklist(s).every(r=>r.met));const gold=s.hero.gold,exp=s.hero.exp;s=pick(s,'parley');assert.ok(s.dungeon.cleared.includes('keeper'));assert.ok(s.hero.gold<=gold);assert.equal(s.hero.exp,exp);roundtrip(s);
});

test('negotiation hints expose only known rooms and views do not create evidence or move the life',()=>{
  const s=dungeonFixture(),before=structuredClone(s),view=dungeonView(s);
  for(const room of view.rooms.filter(r=>!r.visited)){const actual=s.dungeon.definition.rooms.find(r=>r.id===room.id);assert.notEqual(room.title,actual.title);assert.ok(room.title.startsWith('Unexplored passage'));}
  dungeonView(s);negotiationChecklist(s);explorationActions(s);assert.deepEqual(s,before);
});

test('production UI explains physical attendance and lets the player defer without losing the saved chapter',async t=>{
  let s=complete(open(fresh(),'cracked_mark'),'enterprise');s=next(s,'cracked_mark');
  const oldSite=s.stories.arcs[0].locationId;s.locationId=s.world.locations.find(p=>p.id!==oldSite&&p.type==='city').id;syncCartography(s);s=E.migrateSave(s);
  const surface=await mountApp(t,{states:[s]});await surface.click('title-continue');const before=surface.current();
  assert.ok(surface.root.controls.find(c=>c.dataset.op==='choice'&&c.dataset.id==='care').disabled);assert.match(surface.root.innerHTML,/Travel to/);
  await surface.click('choice','defer');assert.equal(surface.current().day,before.day);assert.equal(surface.current().hero.gold,before.hero.gold);assert.equal(surface.current().stories.arcs[0].chapter,1);
});

test('production dungeon preview shows separate requirement states without rewriting an older saved scene',async t=>{
  let s=walk(dungeonFixture(),'keeper');s=pick(s,'listen');s.event.body='An older saved guardian scene.';const body=s.event.body;
  const surface=await mountApp(t,{states:[s]});await surface.click('title-continue');
  assert.ok(surface.root.querySelector('[data-negotiation-checklist]'));assert.match(surface.root.innerHTML,/Examined negotiation evidence/);assert.match(surface.root.innerHTML,/Practical aid/);assert.match(surface.root.innerHTML,/Judgment or trusted support/);
  assert.equal(surface.current().event.body,body);
});
