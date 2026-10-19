import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeConversations, getContacts, validateConversations } from '../dist/js/conversations.js';
import { initializeSocial, inheritSocial, socialActions, applySocialAction, onSocialTime, flushSocialEvent, applySocialChoice, socialEventIds, socialView, validateSocial } from '../dist/js/social.js';
import { LifeRun, ordinaryChoice } from '../scripts/playtest-utils.mjs';

function fixture(age=11,seed='three chairs',setup='parents') {
  const day=age*365;
  const person=(id,name,role,baseAge,extra={})=>({id,name,role,baseAge,age:age+baseAge,bornDay:-baseAge*365 || 0,bond:45,alive:true,locationId:'home',memories:[],knownFacts:[],disposition:'kind',relation:role==='relative'?'family':role==='rival'?'rival':'friend',...extra});
  const people=[person('kin','Anwen Reed','relative',27,{familyRole:setup==='parents'?'parent':'guardian'}),person('fellow','Tamsin Vale','friend',0),person('rival','Bram Ash','rival',1),person('river','Sera Moss','friend',2)];
  if(setup==='parents')people.push(person('family_parent','Iven Reed','relative',29,{familyRole:'parent'}),person('family_sibling_1','Neris Reed','relative',2,{familyRole:'sibling'}));
  const s={revision:5,seed,day,age,phase:age<18?'childhood':'adult',locationId:'home',world:generateWorld(seed,{expanded:true}),timeline:{birthDay:0,mode:'birth',journey:null,yearTarget:null},hero:{name:'Ari Reed',alive:true,origin:'village',birthplaceId:'home',gold:50,skills:{persuasion:0,scholarship:0}},life:{people,children:[],plan:null,health:80,happiness:60,stress:10},family:{setup,members:people.filter(p=>p.role==='relative').map(p=>({personId:p.id,availability:'present'}))},education:{enrolled:true,route:'community',performance:55,teachers:{community:{name:'Tutor Wren Bell',bornDay:-32*365}}},companions:[{id:'mira',name:'Elowen Stone',age,baseAge:0,bornDay:0,role:'warrior',relationship:0,memories:[],alive:true,recruited:false},{id:'orrin',name:'Corin Thorne',age:age+1,baseAge:1,bornDay:-365,role:'mage',relationship:0,memories:[],alive:true,recruited:false},{id:'kest',name:'Pell Brindle',age:age+2,baseAge:2,bornDay:-730,role:'rogue',relationship:0,memories:[],alive:true,recruited:false}],society:age>=16?{people:[{id:'society-colleague-work',name:'Edda Flint',role:'colleague',profession:'Blacksmith',age:age+3,bornDay:-3*365,locationId:'home',bond:45,alive:true,memories:[],knownFacts:[],sourcePersonId:null}],archive:[]}:undefined,event:null,battle:null,dungeon:null,journal:[],flags:{}};
  initializeConversations(s);initializeSocial(s);return s;
}
function context(s,limit=Infinity) {return {spendDays(n){const oldDay=s.day,actual=Math.min(n,Math.max(0,limit-s.day));s.day+=actual;s.age=Math.floor(s.day/365);for(const p of [...s.life.people,...s.companions,...(s.society?.people || [])])p.age=Math.floor((s.day-p.bornDay)/365);onSocialTime(s,{oldDay,newDay:s.day},this);return actual;},journal(title,text,tag){s.journal.push({title,text,tag});},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}};}
function choose(s,id) {const eventId=s.event.id;s.event=null;assert.equal(applySocialChoice(s,eventId,id,context(s)),true);assert.equal(validateSocial(s.social,s),true);}
function join(s) {const row=socialActions(s).find(a=>!a.disabledReason);assert.ok(row);assert.equal(applySocialAction(s,row.id,context(s)),true);assert.ok(s.event);assert.equal(validateSocial(s.social,s),true);return s.event;}

test('prospective migration preserves every old actor, pending scene, message and resource',()=>{
 const s=fixture(42);delete s.social;s.event={id:'academy_remedy',body:'A saved promise',choices:[{id:'field',label:'An exact option',description:'An exact description'}]};s.conversations.pending={personId:'fellow',replies:[{id:'listen'}]};
 const before=structuredClone(s);initializeSocial(s,{migration:true});for(const k of Object.keys(before))assert.deepEqual(s[k],before[k],k);
 assert.equal(s.social.startedDay,s.day);assert.deepEqual(s.social.history,[]);assert.ok(s.social.edges.every(e=>!e.known&&e.memories.length===0));assert.equal(validateSocial(s.social,s),true);
 const snapshot=structuredClone(s.social);initializeSocial(s);assert.deepEqual(s.social,snapshot);
});

test('looking at circles is pure, uses only real contact names and reveals no private ties',()=>{
 const s=fixture(),before=structuredClone(s);socialActions(s);const view=socialView(s);assert.deepEqual(s,before);assert.equal(view.ties.length,0);assert.equal(view.notices.length,0);
 const ids=new Set(getContacts(s).map(p=>p.id));assert.ok(s.social.nodes.every(p=>ids.has(p.sourceId)));assert.equal(new Set(s.social.nodes.map(n=>n.name)).size,s.social.nodes.length);
 join(s);const after=socialView(s);assert.equal(after.ties.length,1);assert.ok(after.ties.every(e=>ids.has(e.personId)&&ids.has(e.otherPersonId)));assert.ok(s.event.choices.every(c=>!/\b(gain|lose|bond|reputation|reward)\b/i.test(c.description)));
});

test('NPCs act between themselves while annual time remains free of forced new popups',()=>{
 const s=fixture(),before=s.social.edges.map(e=>e.affinity),ctx=context(s);ctx.spendDays(365);
 assert.equal(s.event,null);assert.equal(s.social.pending,null);assert.equal(flushSocialEvent(s,ctx),false);assert.ok(s.social.edges.some((e,i)=>e.affinity!==before[i]));assert.ok(s.social.edges.some(e=>e.developments));
 assert.ok(socialView(s).notices.length);assert.ok(socialActions(s).some(a=>a.id.startsWith('social_join_')));assert.equal(validateSocial(s.social,s),true);
 const count=s.social.nodes.length;ctx.spendDays(1);assert.equal(s.social.nodes.length,count,'fractional years cannot regenerate everyone’s identity');
});

test('an unwitnessed development never leaks into journal, contact secrets or observed relationships',()=>{
 const s=fixture(),ctx=context(s),privateKnowledge=s.life.people.map(p=>[p.id,structuredClone(p.knownFacts)]);s.locationId='city';
 ctx.spendDays(365);assert.ok(s.social.edges.some(e=>e.developments));assert.deepEqual(socialView(s).ties,[]);assert.deepEqual(socialView(s).notices,[]);assert.deepEqual(s.journal,[]);
 assert.deepEqual(s.life.people.map(p=>[p.id,p.knownFacts]),privateKnowledge);assert.equal(s.social.queued.length,0);
 const local=fixture(18);join(local);choose(local,local.event.choices[0].id);const observed=structuredClone(socialView(local).ties);local.locationId='city';context(local).spendDays(365);assert.deepEqual(socialView(local).ties,observed,'observed ties retain the last witnessed state');
});

test('named invitations consume actual time and preserve exact choices across saves and moves',()=>{
 const s=fixture(),ctx=context(s),day=s.day,cash=s.hero.gold;const e=join(s);
 assert.equal(s.day,day+1);assert.equal(s.hero.gold,cash);const saved=structuredClone(s);initializeSocial(saved,{migration:true});assert.deepEqual(saved.event,e);assert.deepEqual(saved.social.pending,s.social.pending);
 const q=s.social.pending;assert.equal(q.aId,s.social.edges.find(a=>a.id===q.edgeId).aId);assert.ok(s.event.body.includes(s.social.nodes.find(p=>p.id===q.aId).name));
 const before=structuredClone(s);assert.equal(applySocialChoice(s,e.id,'invented',ctx),false);assert.deepEqual(s,before);choose(s,e.choices[0].id);assert.ok(s.social.callbacks.length);assert.equal(validateConversations(s.conversations,s),true);
});

test('a birthday or urgent need can pause an afternoon without paying out an interaction',()=>{
 const s=fixture(),before=structuredClone(s),row=socialActions(s).find(a=>!a.disabledReason);assert.equal(applySocialAction(s,row.id,context(s,s.day)),true);
 assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.deepEqual(s.social,before.social);assert.equal(s.event,null);assert.deepEqual(s.life,before.life);
 assert.ok(!socialActions(fixture(3)).some(a=>a.id==='social_gather'),'a button requires an actual age-appropriate encounter');
});

test('taking different sides changes both actual people and their relationship, with a later observable echo',()=>{
 let source;
 for(let i=0;i<80;i++){const s=fixture(11,`side-${i}`);join(s);if(s.event.choices.some(c=>c.id==='a')&&s.event.choices.some(c=>c.id==='b')){source=s;break;}}
 assert.ok(source);const left=structuredClone(source),right=structuredClone(source),pair=source.social.pending;
 choose(left,'a');choose(right,'b');assert.notDeepEqual(left.life.people.map(p=>p.bond),right.life.people.map(p=>p.bond));assert.ok(left.social.edges.find(e=>e.id===pair.edgeId).memories.length);
 context(left).spendDays(90);assert.equal(left.event,null,'echo is a notice and optional conversation');assert.ok(socialView(left).notices.some(n=>n.title==='Something familiar, seen again'));
 const q=left.social.queued.find(q=>q.scene==='echo');assert.ok(q);assert.ok(q.body.includes(left.social.nodes.find(p=>p.id===pair.aId).name));assert.ok(q.body.includes(left.social.nodes.find(p=>p.id===pair.bId).name));
 assert.equal(applySocialAction(left,`social_join_${q.edgeId}`,context(left)),true);assert.equal(left.event.id,'social_echo');choose(left,'ask');assert.equal(validateSocial(left.social,left),true);
});

test('dead or absent people cannot reappear at a gathering, and orphan scenes invent no parents',()=>{
 const s=fixture(9,'no invented family','orphan');context(s).spendDays(365);assert.ok(!s.social.queued.some(q=>q.scene==='household'));assert.ok(s.social.nodes.filter(n=>n.role==='parent').length===0);
 const p=s.life.people.find(p=>p.id==='fellow');p.alive=false;context(s).spendDays(1);const dead=s.social.nodes.find(n=>n.sourceId==='fellow');assert.equal(dead.alive,false);assert.ok(socialActions(s).every(a=>!a.label.includes(p.name)));
});

test('successor keeps the existing world graph but earns personal knowledge rather than inheriting confidence',()=>{
 const old=fixture(38);join(old);choose(old,old.event.choices[0].id);const oldPeople=structuredClone(old.life.people),next=fixture(18,'three chairs');next.day=old.day;next.timeline.birthDay=next.day-18*365;next.hero.name='The successor';next.life.people=oldPeople;for(const p of next.life.people)p.locationId='home';
 inheritSocial(old,next);assert.ok(next.social.edges.some(e=>e.id===old.social.edges[0].id));assert.ok(next.social.edges.every(e=>!e.known));assert.deepEqual(next.social.history,[]);assert.deepEqual(next.social.callbacks,[]);assert.equal(next.social.pending,null);assert.deepEqual(socialView(next).ties,[]);assert.equal(validateSocial(next.social,next),true);
 const oldNode=next.social.nodes.find(p=>p.name==='Tamsin Vale');assert.equal(oldNode.name,'Tamsin Vale');assert.equal(oldNode.bornDay,0);
});

test('a surviving friend rebinds from a life slot to a society neighbor without losing their graph',()=>{
 const old=fixture(38);join(old);choose(old,old.event.choices[0].id);const previous=old.social.nodes.find(n=>n.sourceId==='fellow'),oldEdges=old.social.edges.filter(e=>[e.aId,e.bId].includes(previous.id)).map(e=>e.id);
 const next=fixture(6);next.day=old.day;next.timeline.birthDay=next.day-6*365;next.life.people.find(p=>p.id==='fellow').name='A genuinely new school friend';
 next.society={people:[{id:'society-peer-old-fellow',name:previous.name,bornDay:previous.bornDay,age:38,bond:20,role:'neighbor',locationId:'home',alive:true,memories:[],knownFacts:[],sourcePersonId:null,sourceLineageId:'stable-old-fellow'}],archive:[]};
 next.lineage={people:[{id:'stable-old-fellow',name:previous.name,bornDay:previous.bornDay,source:'ancestor',localId:'fellow',alive:true}]};
 inheritSocial(old,next);assert.equal(next.social.nodes.find(n=>n.id===previous.id).alive,false,'old neighbor is not introduced at school age');
 next.age=16;next.day+=10*365;onSocialTime(next,{oldDay:next.day-1,newDay:next.day},context(next));
 const rebound=next.social.nodes.filter(n=>n.name===previous.name&&n.bornDay===previous.bornDay);assert.equal(rebound.length,1);assert.equal(rebound[0].id,previous.id);assert.equal(rebound[0].sourceId,'society-peer-old-fellow');assert.equal(rebound[0].source,'society');assert.equal(rebound[0].alive,true);
 assert.ok(oldEdges.every(id=>next.social.edges.some(e=>e.id===id)));assert.equal(validateSocial(next.social,next),true);
 assert.ok(next.social.nodes.some(n=>n.sourceId==='fellow'&&n.name==='A genuinely new school friend'&&n.id!==previous.id));
});

test('all 16 situation families are reachable with their actual age and household requirements',()=>{
 const seen=new Map();
 for(const age of [5,8,11,15,19,35])for(let i=0;i<120;i++) {
   const s=fixture(age,`social-repertoire-${age}-${i}`);context(s).spendDays(360);
   for(const q of s.social.queued)if(!seen.has(q.scene))seen.set(q.scene,structuredClone(s));
 }
 const required=Object.keys(socialEventIds()).map(id=>id.slice('social_'.length)).filter(id=>id!=='echo');assert.deepEqual(required.filter(id=>!seen.has(id)),[]);
 for(const scene of required) {
   const original=seen.get(scene),q=original.social.queued.find(q=>q.scene===scene);
   for(const choice of q.choices) {
     const s=structuredClone(original);s.social.queued=[structuredClone(q)];assert.equal(applySocialAction(s,`social_join_${q.edgeId}`,context(s)),true);assert.equal(s.event.id,`social_${scene}`);choose(s,choice.id);
     assert.equal(validateSocial(s.social,s),true,`${scene}/${choice.id}`);assert.ok(s.social.history.some(h=>h.visible&&h.actorIds.includes(q.aId)&&h.actorIds.includes(q.bId)));assert.ok(s.social.callbacks.some(c=>c.scene===scene&&c.outcome===choice.id));
   }
 }
});

test('malformed graph, forged option, unobserved knowledge and mismatched saved popup are rejected',()=>{
 const s=fixture();join(s);
 for(const edit of [x=>x.social.edges[0].aId='invented',x=>x.social.nodes.push({...x.social.nodes[0]}),x=>x.social.pending.choices[0].id='forged',x=>x.social.edges[0].known=true,x=>x.social.callbacks.push({scene:'missing'}),x=>x.event.choices[0].label='A swapped choice']) {
   const altered=structuredClone(s);edit(altered);assert.equal(validateSocial(altered.social,altered),false);
 }
});

test('public births grow to adulthood, then join a witnessed interaction without forced social annual scenes',()=>{
 for(let i=0;i<8;i++) {
   const run=new LifeRun(`social-public-${i}`,{seed:`social-public-threshold-${i}`,name:'Ari Reed',birthplaceId:'home',familySetup:i%2?'orphan':'two_parents'},event=>ordinaryChoice(event)||event.choices[0]?.id);
   run.grow(18);assert.equal(run.state.age,18);assert.ok(run.state.social.edges.some(e=>e.developments));assert.ok(!run.log.some(e=>e.nextEvent?.startsWith('social_')),'Age Up never forces social popups');
   const row=socialActions(run.state).find(a=>!a.disabledReason);assert.ok(row);const oldDay=run.state.day;run.act(row.id);assert.equal(run.state.day,oldDay+1);assert.ok(run.state.event?.id.startsWith('social_'));
   run.choose(run.state.event.choices[i%run.state.event.choices.length].id);assert.ok(run.state.social.callbacks.length);assert.equal(validateSocial(run.state.social,run.state),true);
   assert.equal(run.state.social.nodes.filter(p=>p.sourceId==='fellow').length,1,'a known peer keeps one identity across real years and days');
 }
});
