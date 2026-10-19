import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { CLASS_CATALOG, initializeProgression, callingActions, applyCallingAction, applyCallingChoice, callingEventIds, validateProgression, classView } from '../dist/js/classes.js';

function fixture(age=18) {
  const state={seed:'calling-test',age,day:age*365,phase:age<18?'childhood':'adult',timeline:{mode:'birth'},locationId:'city',world:generateWorld('calling-test'),hero:{path:'unformed',specialization:null,gold:0,exp:0,skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0])),attributes:{strength:3,intellect:3}},flags:{},obligations:[],journal:[],event:null,battle:null};
  initializeProgression(state);
  return state;
}
function context(state) {return {journal:(title,text,tag)=>state.journal.push({title,text,tag}),earnExperience:amount=>{state.hero.exp+=amount;},setEvent:(id,title,category,body,choices)=>{state.event={id,title,category,body,choices};},addObligation:(id,title,days,description)=>{state.obligations.push({id,title,dueDay:state.day+days,description,resolved:false});}};}
function meet(state,id) {state.locationId=classView(state).callings.find(c=>c.id===id).locationId; assert.equal(applyCallingAction(state,`calling_meet_${id}`,context(state)),true);}
function earn(state,id) {meet(state,id); Object.assign(state.hero.skills,CLASS_CATALOG.find(c=>c.id===id).skills); applyCallingAction(state,`calling_seek_${id}`,context(state)); assert.equal(state.event.id,'calling_initiation'); applyCallingChoice(state,'calling_initiation','accept',context(state)); state.event=null;}

test('birth initializes no combat identity, resources, or weapon; twelve skills-based callings are concrete',()=>{
  const s=fixture(0); assert.equal(s.hero.path,'unformed'); assert.equal(s.hero.specialization,null); assert.deepEqual(s.progression.learnedClassIds,[]); assert.equal(s.hero.gold,0);
  assert.equal(CLASS_CATALOG.length,12); assert.equal(new Set(CLASS_CATALOG.map(c=>c.id)).size,12);
  for(const c of CLASS_CATALOG){assert.ok(Object.keys(c.skills).length>=2);assert.equal(c.minAge,18);assert.ok(c.ability.length>15);assert.ok(s.world.locations.some(p=>p.id===classView(s).callings.find(q=>q.id===c.id).locationId));}
  assert.equal(validateProgression(s.progression,s),true);
});

test('age, learned skills, actual mentor meeting, and location each gate initiation',()=>{
  const s=fixture(15); const ctx=context(s); s.hero.skills.weapons=20;s.hero.skills.defense=20;
  meet(s,'guardian');assert.equal(s.progression.mentors.guardian.met,false);assert.match(s.notice,/age 16/);
  s.age=18;meet(s,'guardian');assert.equal(s.progression.mentors.guardian.met,true);
  s.hero.skills.weapons=0;applyCallingAction(s,'calling_seek_guardian',ctx);assert.equal(s.event,null);assert.match(s.notice,/weapons 3/);
  s.hero.skills.weapons=3;s.locationId='ruin';applyCallingAction(s,'calling_seek_guardian',ctx);assert.equal(s.event,null);
  s.locationId=classView(s).callings.find(c=>c.id==='guardian').locationId;applyCallingAction(s,'calling_seek_guardian',ctx);assert.equal(s.event.id,'calling_initiation');
  applyCallingChoice(s,'calling_initiation','defer',ctx);s.event=null;assert.deepEqual(s.progression.learnedClassIds,[]);assert.equal(s.hero.path,'unformed');assert.equal(s.progression.pendingCalling,null);
});

test('supervised mentor practice advances one unmet skill and engine alone charges time and gold',()=>{
  const s=fixture(16);meet(s,'healer');const before={day:s.day,gold:s.hero.gold};const action=callingActions(s).find(a=>a.id==='calling_train_healer');
  assert.equal(action.days,4);assert.equal(action.cost,0);applyCallingAction(s,action.id,context(s));assert.equal(s.hero.skills.arcana,1);assert.equal(s.hero.skills.scholarship,0);assert.deepEqual({day:s.day,gold:s.hero.gold},before);assert.equal(s.progression.mentors.healer.lessons,1);
  assert.match(callingActions(s).find(a=>a.id==='calling_seek_healer').disabledReason,/age 18/);
});

test('each calling is earnable by an unformed civilian with genuine preparation',()=>{
  for(const item of CLASS_CATALOG){const s=fixture();earn(s,item.id);assert.equal(s.hero.specialization,item.id);assert.equal(s.hero.path,item.role);assert.deepEqual(s.progression.learnedClassIds,[item.id]);assert.equal(validateProgression(s.progression,s),true);assert.ok(s.journal.some(j=>j.title===`Earned calling: ${item.name}`));}
  assert.deepEqual(callingEventIds(),{calling_initiation:['accept','defer','service','independent']});
});

test('cross-training and switching earned callings never stack attributes or grant rewards twice',()=>{
  const s=fixture();const attrs=structuredClone(s.hero.attributes);earn(s,'guardian');earn(s,'elementalist');assert.equal(s.hero.path,'mage');assert.deepEqual(new Set(s.progression.learnedClassIds),new Set(['guardian','elementalist']));
  const exp=s.hero.exp;assert.equal(applyCallingAction(s,'calling_switch_guardian',context(s)),true);assert.equal(s.hero.path,'warrior');assert.equal(s.hero.specialization,'guardian');assert.deepEqual(s.hero.attributes,attrs);assert.equal(s.hero.exp,exp);
  applyCallingChoice(s,'calling_initiation','accept',context(s));assert.equal(s.hero.exp,exp);assert.equal(applyCallingAction(s,'calling_switch_healer',context(s)),true);assert.equal(s.hero.specialization,'guardian');
});

test('migration recognizes existing callings and preserves the original pending life exactly',()=>{
  const s=fixture();delete s.progression;s.hero.path='mage';s.hero.specialization='necromancer';s.event={id:'legacy',choices:[{id:'later'}]};s.hero.gold=47;
  const before=structuredClone(s);initializeProgression(s,{migration:true});assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.event,before.event);assert.deepEqual(s.progression.learnedClassIds,['necromancer']);const progress=structuredClone(s.progression);initializeProgression(s,{migration:true});assert.deepEqual(s.progression,progress);
});

test('displaced mentors have a reachable alternative after their settlement is destroyed',()=>{
  const s=fixture();const before=classView(s).callings.find(c=>c.id==='paladin');s.world.locations.find(p=>p.id===before.locationId).status='destroyed';const after=classView(s).callings.find(c=>c.id==='paladin');assert.notEqual(after.locationId,before.locationId);assert.ok(s.world.locations.some(p=>p.id===after.locationId));meet(s,'paladin');assert.equal(s.progression.mentors.paladin.met,true);
});

test('oaths remain visible, a broken oath survives switching, and consensual necromancy creates no evidence',()=>{
  const s=fixture();earn(s,'paladin');assert.match(s.flags.oath,/never bind/);assert.equal(s.flags.oathType,'protection');assert.equal(s.obligations.length,1);s.flags.oathBroken=true;earn(s,'necromancer');assert.equal(s.flags.knowsAncestralRite,true);assert.equal(s.flags.oathBroken,true);applyCallingAction(s,'calling_switch_paladin',context(s));assert.equal(s.flags.oathBroken,true);assert.equal(s.legal,undefined);
});

test('catalog views are pure and progression validation rejects forged identities and unknown mentors',()=>{
  const s=fixture();const before=structuredClone(s);classView(s);callingActions(s);assert.deepEqual(s,before);
  for(const change of [p=>p.learnedClassIds.push('dragon'),p=>p.learnedClassIds.push('healer','healer'),p=>p.pendingCalling='dragon',p=>p.mentors.healer.met='yes',p=>p.mentors.healer.locationId='outside',p=>p.mentors.extra={id:'extra'}]){const p=structuredClone(s.progression);change(p);assert.equal(validateProgression(p,s),false);}
  assert.equal(applyCallingAction(s,'calling_seek_unknown',context(s)),false);
});

function roleplayFixture(id='healer') {
 const s=fixture();s.revision=5;s.timeline.roleplayVersion=1;s.conversations={relationships:{}};s.factions={villagers:0,order:0};delete s.progression;initializeProgression(s);
 meet(s,id);Object.assign(s.hero.skills,CLASS_CATALOG.find(c=>c.id===id).skills);
 return s;
}
function serviceContext(s) {return {...context(s),standing:(id,n)=>s.factions[id]+=n,finishObligation:id=>{const o=s.obligations.find(o=>o.id===id);if(o)o.resolved=true;}};}

test('new calling trials offer a real service commitment or an independent practice without stacking gifts',()=>{
 for(const item of CLASS_CATALOG){
  const s=roleplayFixture(item.id),ctx=serviceContext(s);applyCallingAction(s,`calling_seek_${item.id}`,ctx);
  assert.deepEqual(s.event.choices.map(c=>c.id),['accept','service','independent','defer']);
  assert.ok(s.event.choices.find(c=>c.id==='service').description.includes('six further days'));
  s.event=null;applyCallingChoice(s,'calling_initiation','service',ctx);
  assert.equal(s.progression.initiations[0].approach,'service');assert.equal(s.hero.specialization,item.id);
  const promise=s.obligations.find(o=>o.id===`calling_service_${item.id}`);assert.equal(promise.dueDay,s.day+60);
  const before=structuredClone({attributes:s.hero.attributes,skills:s.hero.skills,exp:s.hero.exp,gold:s.hero.gold});
  const task=callingActions(s).find(a=>a.id===`calling_service_${item.id}`);assert.equal(task.days,6);assert.equal(task.cost,0);
  s.day+=6;applyCallingAction(s,task.id,ctx);assert.equal(promise.resolved,true);assert.equal(s.factions.villagers,4);assert.equal(s.progression.initiations[0].fulfilledDay,s.day);
  assert.deepEqual({attributes:s.hero.attributes,skills:s.hero.skills,exp:s.hero.exp,gold:s.hero.gold},before);
  assert.equal(s.conversations.relationships[s.progression.mentors[item.id].id].bond,48);
  assert.ok(!callingActions(s).some(a=>a.id===task.id));assert.equal(validateProgression(s.progression,s),true);
 }
 const independent=roleplayFixture('paladin'),ctx=serviceContext(independent);applyCallingAction(independent,'calling_seek_paladin',ctx);independent.event=null;applyCallingChoice(independent,'calling_initiation','independent',ctx);
 assert.equal(independent.conversations.relationships[independent.progression.mentors.paladin.id].bond,35);assert.match(independent.flags.oath,/mercy/);assert.ok(!independent.obligations.some(o=>o.id==='calling_service_paladin'));assert.equal(independent.hero.exp,12);
});

test('a late calling service preserves its missed deadline and earns less trust through actual work',()=>{
 const s=roleplayFixture(),ctx=serviceContext(s);applyCallingAction(s,'calling_seek_healer',ctx);s.event=null;applyCallingChoice(s,'calling_initiation','service',ctx);
 const promise=s.obligations.find(o=>o.id==='calling_service_healer');s.day+=61;promise.missed=true;promise.resolved=true;
 assert.match(callingActions(s).find(a=>a.id==='calling_service_healer').description,/gain 3 mentor trust/);
 s.day+=6;applyCallingAction(s,'calling_service_healer',ctx);assert.equal(promise.missed,true);assert.equal(s.conversations.relationships[s.progression.mentors.healer.id].bond,43);
 const invalid=structuredClone(s.progression);invalid.initiations[0].fulfilledDay=s.day+1;assert.equal(validateProgression(invalid,s),false);
});

test('an old pending initiation keeps its original choices and only upgrades future trials after resolution',()=>{
 const s=fixture(),ctx=context(s);meet(s,'healer');Object.assign(s.hero.skills,CLASS_CATALOG.find(c=>c.id==='healer').skills);applyCallingAction(s,'calling_seek_healer',ctx);
 const event=structuredClone(s.event);s.progression.nextTrialVersion=1;assert.deepEqual(s.event,event);
 assert.equal(applyCallingChoice(s,'calling_initiation','service',ctx),false);s.event=null;applyCallingChoice(s,'calling_initiation','accept',ctx);
 assert.equal(s.progression.trialVersion,1);assert.equal(s.progression.nextTrialVersion,undefined);assert.equal(s.progression.initiations,undefined);assert.equal(s.hero.specialization,'healer');
});
