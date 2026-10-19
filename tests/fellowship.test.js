import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_CATALOG, initializeProgression, classView } from '../dist/js/classes.js';
import { generateWorld } from '../dist/js/world.js';
import { initializeFellowship, fellowshipActions, applyFellowshipAction, fellowshipEventIds, applyFellowshipChoice, onFellowshipTime, flushFellowshipEvent, fellowshipView, validateFellowship, inheritFellowship } from '../dist/js/fellowship.js';

function fixture(id='guardian') {
 const c=CLASS_CATALOG.find(c=>c.id===id);
 const s={revision:5,seed:`fellowship-${id}`,day:18*365+30,age:18,phase:'adult',timeline:{mode:'birth',birthDay:0,yearTarget:null},world:generateWorld(`fellowship-${id}`,{expanded:true}),hero:{name:'Aren',path:c.role,specialization:id,profession:'Blacksmith',birthplaceId:'home',gold:300,attributes:{strength:3,agility:3,vitality:3,intellect:3,willpower:3,presence:3},skills:{...c.skills},condition:null},flags:{},obligations:[],event:null,battle:null,conversations:{relationships:{}},companions:['mira','orrin','kest'].map((id,i)=>({id,name:['Maelin','Thessa','Iven'][i],role:['warrior','mage','rogue'][i],recruited:true,active:true,alive:true,relationship:20,memories:[],knownFacts:[]})),factions:{villagers:0,academy:0,order:0,underworld:0},journal:[]};
 initializeProgression(s,{migration:true});initializeFellowship(s);s.locationId=classView(s).callings.find(c=>c.id===id).locationId;
 return s;
}
function context(s,{limitDay=Infinity,dieDay=Infinity}={}) {
 return {spendDays(n){const old=s.day;const actual=Math.max(0,Math.min(n,limitDay-s.day,dieDay-s.day));s.day+=actual;if(s.day===dieDay)s.phase='retired';return s.day-old;},journal:(title,text)=>s.journal.push({title,text}),standing:(id,n)=>s.factions[id]+=n,setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},addObligation:(id,title,days,description)=>{s.obligations.push({id,title,dueDay:s.day+days,description,resolved:false});},finishObligation:id=>{for(const o of s.obligations.filter(o=>o.id===id&&!o.resolved))o.resolved=true;}};
}
function choose(s,id,ctx=context(s)) {
 const event=s.event;assert.ok(event?.choices.some(c=>c.id===id),`${event?.id} lacks ${id}`);s.event=null;
 assert.equal(applyFellowshipChoice(s,event.id,id,ctx),true);
}
function formation(s,id,approach='service',interpretation='a',recognition='public') {
 applyFellowshipAction(s,`fellowship_formation_${id}`,context(s));choose(s,approach);choose(s,interpretation);choose(s,recognition);
}

test('all twelve earned callings have distinct optional formation stories with actual sixteen-day work and bounded recognition',()=>{
 const titles=new Set(),techniques=new Set();
 for(const c of CLASS_CATALOG)for(const branch of ['a','b']) {
  const s=fixture(c.id),before=structuredClone(s.hero),day=s.day;
  const a=fellowshipActions(s).find(a=>a.id===`fellowship_formation_${c.id}`);assert.equal(a.days,0);assert.equal(a.durationDays,16);assert.equal(a.cost,0);
  applyFellowshipAction(s,a.id,context(s));assert.equal(s.day,day);assert.equal(s.event.id,'fellowship_formation_start');titles.add(s.event.title);
  choose(s,branch==='a'?'service':'independent');assert.equal(s.day,day+6);assert.equal(s.event.id,'fellowship_formation_decision');
  choose(s,branch);assert.equal(s.day,day+14);assert.equal(s.event.id,'fellowship_formation_review');
  choose(s,branch==='a'?'public':'private');assert.equal(s.day,day+16);assert.equal(s.event,null);
  const r=s.fellowship.formations[c.id];assert.equal(r.stage,'completed');assert.equal(r.workDays,16);assert.equal(r.completedDay,s.day);techniques.add(r.technique);
  assert.deepEqual(s.hero,before,'formation never stacks attributes, skills, gold or initial class gifts');assert.equal(Object.values(s.factions).reduce((a,b)=>a+b),5);
  assert.equal(validateFellowship(s.fellowship,s),true);assert.ok(!fellowshipActions(s).some(a=>a.id===`fellowship_formation_${c.id}`));
  const after=structuredClone(s);assert.equal(applyFellowshipChoice(s,'fellowship_formation_review','public',context(s)),false);assert.deepEqual(s,after);
 }
 assert.equal(titles.size,12);assert.equal(techniques.size,12);
});

test('formation continuations keep partial work across birthday interruptions; zero-day choices cannot grant completion',()=>{
 const s=fixture(),start=s.day,limited=context(s,{limitDay:start+2});
 applyFellowshipAction(s,'fellowship_formation_guardian',limited);choose(s,'service',limited);
 assert.equal(s.fellowship.project.workedDays,2);assert.equal(s.fellowship.formations.guardian.workDays,2);assert.equal(s.event,null);assert.equal(s.factions.villagers,0);
 applyFellowshipAction(s,'fellowship_continue',limited);assert.equal(s.day,start+2);assert.equal(s.fellowship.project.workedDays,2);assert.equal(s.event,null);assert.equal(validateFellowship(s.fellowship,s),true);
 applyFellowshipAction(s,'fellowship_continue',context(s));assert.equal(s.day,start+6);assert.equal(s.event.id,'fellowship_formation_decision');
 choose(s,'b');choose(s,'private');assert.equal(s.day,start+16);assert.equal(s.fellowship.formations.guardian.workDays,16);
});

test('actual death during a committed formation never completes a technique or grants a standing reward',()=>{
 const s=fixture('paladin'),day=s.day,ctx=context(s,{dieDay:day+2});
 applyFellowshipAction(s,'fellowship_formation_paladin',ctx);choose(s,'service',ctx);
 assert.equal(s.phase,'retired');assert.equal(s.fellowship.formations.paladin.completedDay,null);assert.equal(s.fellowship.formations.paladin.technique,null);assert.equal(Object.values(s.factions).reduce((a,b)=>a+b),0);
 onFellowshipTime(s,{oldDay:day,newDay:s.day},ctx);assert.equal(s.fellowship.project,null);assert.equal(s.fellowship.formations.paladin.stage,'withdrawn');assert.equal(fellowshipActions(s).length,0);assert.equal(validateFellowship(s.fellowship,s),true);
});

test('explicit withdrawal preserves actual progress, closes a promise honestly, and resuming charges only remaining days',()=>{
 const s=fixture('healer'),start=s.day,limited=context(s,{limitDay:start+3});
 applyFellowshipAction(s,'fellowship_formation_healer',limited);choose(s,'service',limited);
 applyFellowshipAction(s,'fellowship_withdraw',limited);assert.equal(s.event.id,'fellowship_withdraw');choose(s,'withdraw',limited);
 assert.equal(s.fellowship.project,null);assert.equal(s.fellowship.formations.healer.pausedWork,3);assert.equal(s.fellowship.formations.healer.stage,'withdrawn');assert.ok(s.obligations[0].resolved);
 applyFellowshipAction(s,'fellowship_resume_healer',context(s));choose(s,'independent');assert.equal(s.day,start+6);assert.equal(s.fellowship.formations.healer.workDays,6);
 choose(s,'a');choose(s,'public');assert.equal(s.day,start+16);assert.equal(s.fellowship.formations.healer.workDays,16);assert.equal(validateFellowship(s.fellowship,s),true);
});

test('three companion requests have negotiated outcomes, actual eight-day work and enduring consent boundaries',()=>{
 const outcomes={mira:['neighborhood','order-agreement'],orrin:['shared-rota','teach-relief'],kest:['private-letter','careful-record']};
 for(const [id,resolutions] of Object.entries(outcomes))for(const resolution of resolutions) {
  const s=fixture(),p=s.companions.find(p=>p.id===id),start=s.day,before=structuredClone(s.hero);
  applyFellowshipAction(s,`fellowship_companion_${id}`,context(s));assert.equal(s.day,start);assert.match(s.event.body,/six days/);
  choose(s,'promise');assert.equal(s.day,start+6);assert.equal(s.event.id,'fellowship_companion_decision');
  choose(s,resolution);assert.equal(s.day,start+8);assert.equal(s.fellowship.companions[id].completedDay,s.day);assert.equal(s.fellowship.companions[id].resolution,resolution);assert.equal(s.fellowship.companions[id].workDays,8);
  assert.ok(p.memories.length);assert.equal(p.relationship,28);assert.ok(s.fellowship.companions[id].boundary);assert.equal(s.fellowship.facts.length,1);assert.deepEqual(s.hero,before);assert.ok(s.obligations[0].resolved);assert.equal(validateFellowship(s.fellowship,s),true);
 }
});

test('private condition and earlier memories flavor requests only for actual confidants',()=>{
 const s=fixture(),m=s.companions[0];s.hero.condition={type:'vampire'};m.memories=['You kept a promise and protected my family.'];
 applyFellowshipAction(s,'fellowship_companion_mira',context(s));assert.match(s.event.body,/protected my family/);assert.doesNotMatch(s.event.body,/vampirism/);
 choose(s,'decline');assert.equal(s.day,6600);assert.equal(s.fellowship.companions.mira.stage,'declined');assert.equal(m.active,true);assert.equal(s.fellowship.project,null);assert.equal(s.obligations.length,0);
 const known=fixture();known.hero.condition={type:'vampire'};known.companions[0].knownFacts=['condition_vampire'];
 applyFellowshipAction(known,'fellowship_companion_mira',context(known));assert.match(known.event.body,/already knows about your vampirism/);assert.equal(known.legal,undefined);assert.deepEqual(known.companions[1].knownFacts,[]);
});

test('dead and absent companions cannot complete requests, and no annual time jump invents labor',()=>{
 const s=fixture();s.companions[1].alive=false;assert.ok(!fellowshipActions(s).some(a=>a.id==='fellowship_companion_orrin'));
 applyFellowshipAction(s,'fellowship_companion_kest',context(s));choose(s,'no-deadline',context(s,{limitDay:s.day+2}));
 const r=s.fellowship.companions.kest;assert.equal(r.workDays,2);
 onFellowshipTime(s,{oldDay:s.day,newDay:s.day+365},context(s));assert.equal(r.workDays,2);assert.equal(r.completedDay,null);
 s.companions[2].alive=false;applyFellowshipAction(s,'fellowship_continue',context(s));assert.equal(s.fellowship.project,null);assert.equal(r.stage,'withdrawn');assert.equal(r.completedDay,null);
});

test('a companion who dies during the final shared days is never awarded a completed request or renewed loyalty',()=>{
 const s=fixture(),ctx=context(s);applyFellowshipAction(s,'fellowship_companion_orrin',ctx);choose(s,'promise',ctx);
 const p=s.companions[1],before=p.relationship;
 const deathContext={...ctx,spendDays(n){s.day+=n;p.alive=false;return n;}};
 choose(s,'shared-rota',deathContext);
 assert.equal(s.fellowship.companions.orrin.stage,'withdrawn');assert.equal(s.fellowship.companions.orrin.completedDay,null);assert.equal(s.fellowship.project,null);assert.equal(p.relationship,before);assert.ok(!s.fellowship.facts.some(f=>f.startsWith('companion:orrin:')));assert.equal(validateFellowship(s.fellowship,s),true);
});

test('module initialization preserves original pending initiation and inheritance conveys stories without personal achievements',()=>{
 const s=fixture('necromancer');delete s.fellowship;s.event={id:'calling_initiation',body:'Original restricted rite',choices:[{id:'accept'},{id:'defer'}]};s.progression.pendingCalling='necromancer';
 const before=structuredClone(s);initializeFellowship(s,{migration:true});assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.event,before.event);assert.deepEqual(s.progression,before.progression);
 s.event=null;s.progression.pendingCalling=null;formation(s,'necromancer','independent','a','private');
 const child=fixture('bard');child.day=s.day;child.hero.name='Their child';inheritFellowship(s,child);
 assert.deepEqual(child.fellowship.formations,{});assert.deepEqual(child.fellowship.companions,{});assert.equal(child.fellowship.project,null);assert.equal(child.fellowship.inherited.length,1);assert.match(child.fellowship.inherited[0].summary,/released testimony/);assert.equal(child.hero.specialization,'bard');assert.equal(validateFellowship(child.fellowship,child),true);
});

test('views are pure and validation rejects unearned/forged history, impossible work and mismatched pending scenes',()=>{
 const s=fixture();formation(s,'guardian');const before=structuredClone(s);fellowshipActions(s);fellowshipView(s);assert.deepEqual(s,before);
 for(const mutate of [f=>f.formations.guardian.workDays=0,f=>f.formations.guardian.completedDay=s.day+1,f=>f.formations.guardian.interpretation='oppression',f=>f.formations.guardian.technique='All combat gifts',f=>f.formations.guardian.mentorId='kin',f=>f.formations.healer=structuredClone(f.formations.guardian),f=>f.facts.push(...f.facts),f=>f.pending={kind:'formation',subjectId:'dragon',node:'decision'}]) {
  const forged=structuredClone(s.fellowship);mutate(forged);assert.equal(validateFellowship(forged,s),false);
 }
 assert.equal(Object.keys(fellowshipEventIds()).length,8);assert.deepEqual(fellowshipEventIds().fellowship_formation_handover,['accept','later']);
});
