import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializePastimes, pastimeActions, applyPastimeAction, applyPastimeChoice, onPastimeTime, flushPastimeEvent, pastimeEventIds, pastimeView, validatePastimes, inheritPastimes } from '../dist/js/pastimes.js';

function fixture(age=16,seed='pastime-test'){
 const s={revision:5,seed,day:age*365+30,age,phase:age<18?'childhood':'adult',timeline:{mode:'birth',birthDay:0},world:generateWorld(seed,{expanded:true}),locationId:'home',hero:{name:'Aren',gold:100,skills:{weapons:1,defense:1,arcana:1,devotion:1,stealth:1,survival:1,scholarship:1,persuasion:1}},life:{happiness:55,stress:30,people:[{id:'kin',name:'Edda',age:age+27,familyRole:'parent',role:'relative',bond:50,memories:[],alive:true,locationId:'home'},{id:'fellow',name:'Mallow',age,role:'friend',bond:35,memories:[],alive:true,locationId:'home'}]},education:{enrolled:true,route:'community',progress:4,performance:60,preparationsThisYear:0},family:{support:50},event:null,battle:null,journal:[]};initializePastimes(s);return s;
}
function context(s,{limitDay=Infinity,dieDay=Infinity}={}){
 return{spendDays(n){const oldDay=s.day;s.day+=Math.max(0,Math.min(n,limitDay-s.day,dieDay-s.day));s.age=Math.floor(s.day/365);if(s.day===dieDay)s.phase='retired';onPastimeTime(s,{oldDay,newDay:s.day},this);return s.day-oldDay;},journal(title,text){s.journal.push({title,text});},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}};
}
function action(s,id,ctx=context(s)){assert.equal(applyPastimeAction(s,`pastime_${id}`,ctx),true);assert.equal(validatePastimes(s.pastimes,s),true);}
function choose(s,pick,ctx=context(s)){const event=s.event;assert.ok(event?.choices.some(c=>c.id===pick));s.event=null;assert.equal(applyPastimeChoice(s,event.id,pick,ctx),true);assert.equal(validatePastimes(s.pastimes,s),true);}
function interest(s,id){action(s,'interest');choose(s,id);}

test('birth and early childhood expose no adult outings, school mischief, romance or pet obligations',()=>{
 for(let age=0;age<4;age++)assert.deepEqual(pastimeActions(fixture(age)),[]);
 const s=fixture(4);assert.deepEqual(pastimeActions(s).map(a=>a.id),['pastime_interest']);
 for(const [age,required,forbidden] of [[6,'fair','pet'],[7,'pet','club'],[8,'club','prank'],[10,'prank','skip'],[12,'skip','night'],[14,'night','crush'],[16,'crush','dinner'],[18,'dinner','crush']]){
  const ids=pastimeActions(fixture(age)).filter(a=>!a.disabledReason).map(a=>a.id);assert.ok(ids.includes(`pastime_${required}`));assert.ok(!ids.includes(`pastime_${forbidden}`));
 }
});

test('a first interest belongs to the player and switching it preserves genuinely practiced days',()=>{
 const s=fixture(8),day=s.day;interest(s,'music');assert.equal(s.day,day);assert.equal(s.pastimes.interests.music.practiceDays,0);
 action(s,'practice');choose(s,'together');assert.equal(s.day,day+3);assert.equal(s.pastimes.interests.music.practiceDays,3);assert.equal(s.hero.skills.persuasion,1);
 action(s,'practice');choose(s,'solo');assert.equal(s.pastimes.interests.music.level,1);assert.equal(s.hero.skills.persuasion,2);
 interest(s,'gardening');assert.equal(s.pastimes.activeInterestId,'gardening');assert.equal(s.pastimes.interests.music.practiceDays,6);
 const before=structuredClone(s);pastimeActions(s);pastimeView(s);assert.deepEqual(s,before,'tabs and views never create practice or people');
});

test('all six interests offer distinct seeded situations and bounded progress without class selection',()=>{
 const titles=new Set();
 for(const id of ['manuscripts','sketching','music','gardening','storytelling','strategy']){
  const variants=new Set();for(let i=0;i<40;i++){
   const s=fixture(10,`hobby-${id}-${i}`);interest(s,id);action(s,'practice');variants.add(s.pastimes.pending.sceneId);titles.add(s.event.title);choose(s,s.event.choices[0].id);assert.equal(s.pastimes.interests[id].practiceDays,3);assert.equal(s.hero.path,undefined);
  }assert.equal(variants.size,2,id);
 }assert.equal(titles.size,12);
});

test('practice uses are per actual age, three sessions never become an unlimited skill farm',()=>{
 const s=fixture(8);interest(s,'strategy');for(let i=0;i<3;i++){action(s,'practice');choose(s,'old-rule');}
 assert.ok(pastimeActions(s).find(a=>a.id==='pastime_practice').disabledReason);assert.equal(s.pastimes.interests.strategy.practiceDays,9);assert.equal(s.hero.skills.defense,2);
 const oldDay=s.day;s.day=9*365;s.age=9;onPastimeTime(s,{oldDay,newDay:s.day},context(s));assert.ok(!pastimeActions(s).find(a=>a.id==='pastime_practice').disabledReason);
});

test('birthdays interrupt an ordinary afternoon without charging twice or awarding its ending early',()=>{
 const s=fixture(18);s.day=19*365-1;const start=s.day,gold=s.hero.gold,ctx=context(s,{limitDay:19*365});action(s,'dinner',ctx);choose(s,'listen',ctx);
 assert.equal(s.day,start+1);assert.equal(s.pastimes.project.completedDays,1);assert.equal(s.pastimes.project.remainingDays,1);assert.equal(s.hero.gold,gold-5);assert.equal(s.life.people[1].bond,35);assert.equal(s.pastimes.history.length,0);
 const before=structuredClone(s);action(s,'continue',ctx);assert.deepEqual(s.pastimes.project,before.pastimes.project);assert.equal(s.hero.gold,gold-5);
 action(s,'continue');assert.equal(s.day,start+2);assert.equal(s.hero.gold,gold-5);assert.equal(s.pastimes.project,null);assert.equal(s.life.people[1].bond,41);
});

test('zero available days keep an unpaid undertaking which can resume without a fabricated reward',()=>{
 const s=fixture(18),day=s.day,gold=s.hero.gold,ctx=context(s,{limitDay:day});action(s,'fair',ctx);choose(s,s.event.choices[0].id,ctx);
 assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.pastimes.project.paidCost,0);assert.equal(s.pastimes.project.completedDays,0);assert.equal(s.pastimes.history.length,0);
 action(s,'continue');assert.equal(s.day,day+2);assert.equal(s.hero.gold,gold-3);assert.equal(s.pastimes.project,null);
});

test('an outing reserves its fee before actual provision costs, and daylight follows the outdoor activity',()=>{
 const s=fixture(18);s.hero.gold=3;const ctx=context(s),base=ctx.spendDays,options=[];
 ctx.spendDays=function(n,o){options.push(o);const days=base.call(this,n);s.hero.gold=Math.max(0,s.hero.gold-2);return days;};
 action(s,'fair',ctx);choose(s,s.event.choices[0].id,ctx);assert.equal(s.hero.gold,0);assert.equal(options[0].outdoors,true);
 const night=fixture(16),nctx=context(night),nightBase=nctx.spendDays,nightOptions=[];nctx.spendDays=function(n,o){nightOptions.push(o);return nightBase.call(this,n);};action(night,'night',nctx);choose(night,'stay',nctx);assert.equal(nightOptions[0].night,true);
});

test('death during the shared days consumes real time but never creates a pet, hobby level or completed supper',()=>{
 for(const id of ['pet','practice','dinner']){
  const s=fixture(18);if(id==='practice')interest(s,'music');const start=s.day,ctx=context(s,{dieDay:start+1});action(s,id,ctx);choose(s,s.event.choices[0].id,ctx);
  assert.equal(s.phase,'retired');assert.equal(s.day,start+1);assert.equal(s.pastimes.project,null);assert.equal(s.pastimes.pet,null);assert.equal(s.pastimes.history.filter(h=>h.day>start).length,0);
  if(id==='practice')assert.equal(s.pastimes.interests.music.practiceDays,0);
 }
});

test('an interrupted outing may be abandoned; completed days and its once-per-year use remain',()=>{
 const s=fixture(16),start=s.day,ctx=context(s,{limitDay:start+1});action(s,'night',ctx);choose(s,'stay',ctx);action(s,'abandon');
 assert.equal(s.day,start+1);assert.equal(s.pastimes.project,null);assert.equal(s.pastimes.uses['16:night'],1);assert.ok(pastimeActions(s).find(a=>a.id==='pastime_night').disabledReason);assert.equal(s.life.people[1].bond,35);
});

test('school truancy changes the real record, returns as a conversation, and does not erase attended learning',()=>{
 const s=fixture(14),progress=s.education.progress;action(s,'skip');choose(s,'cover');assert.equal(s.education.progress,progress);assert.equal(s.education.performance,53);assert.ok(s.pastimes.facts.includes('school-absence:14:cover'));
 const cb=s.pastimes.callbacks.find(c=>c.kind==='absence');const oldDay=s.day;s.day=cb.dueDay;onPastimeTime(s,{oldDay,newDay:s.day},context(s));assert.equal(flushPastimeEvent(s,context(s)),true);assert.match(s.event.body,/pupils by the gate/);choose(s,'answer');assert.equal(s.education.performance,55);assert.ok(cb.resolved);assert.equal(flushPastimeEvent(s,context(s)),false);
});

test('pranks have materially different friendship and teacher responses rather than three identical virtues',()=>{
 const results=[];for(const pick of ['join','name','return']){const s=fixture(12);action(s,'prank');choose(s,pick);results.push([s.life.people[1].bond,s.education.performance]);assert.ok(s.pastimes.callbacks.some(c=>c.kind==='prank'));}
 assert.deepEqual(results,[[42,56],[27,60],[37,60]]);
});

test('revision consumes actual preparation days and honors the existing school preparation cap',()=>{
 const s=fixture(12),start=s.day;action(s,'revision');choose(s,'practice');assert.equal(s.day,start+3);assert.equal(s.education.progress,5);assert.equal(s.education.preparationsThisYear,1);
 action(s,'revision');choose(s,'alone');assert.equal(s.education.progress,6);assert.equal(s.education.preparationsThisYear,2);
 const t=fixture(12);t.education.preparationsThisYear=2;action(t,'revision');choose(t,'practice');assert.equal(t.education.progress,4);assert.equal(t.education.preparationsThisYear,2);
 const copy=fixture(12);action(copy,'revision');choose(copy,'copy');assert.equal(copy.education.progress,4);assert.ok(copy.pastimes.callbacks.some(c=>c.kind==='answers'));
});

test('a minor’s crush needs an unrelated nearby peer and never silently creates a marriage or adult partner',()=>{
 const s=fixture(16);action(s,'crush');assert.match(s.event.body,/Mallow/);choose(s,'tell');assert.ok(s.pastimes.facts.some(f=>f.startsWith('first-affection:fellow:')));assert.equal(s.life.partnerId,undefined);assert.equal(s.life.courtshipId,undefined);
 const kin=fixture(16);kin.life.people[1].familyRole='sibling';assert.ok(pastimeActions(kin).find(a=>a.id==='pastime_crush').disabledReason);
 const absent=fixture(16);absent.life.people[1].locationId='city';assert.ok(pastimeActions(absent).find(a=>a.id==='pastime_crush').disabledReason);
});

test('wagers cannot mint coins without an actual stake; story games remain free',()=>{
 const outcomes=new Set();for(let i=0;i<40;i++){const s=fixture(18,`stakes-${i}`),gold=s.hero.gold,day=s.day;action(s,'games');choose(s,'coins');assert.equal(s.day,day+1);assert.ok([gold-2,gold+2].includes(s.hero.gold));outcomes.add(s.hero.gold-gold);}assert.deepEqual([...outcomes].sort((a,b)=>a-b),[-2,2]);
 const s=fixture(18);s.hero.gold=0;action(s,'games');assert.ok(s.event.choices.find(c=>c.id==='coins').disabledReason);const event=s.event;s.event=null;assert.equal(applyPastimeChoice(s,event.id,'coins',context(s)),false);s.event=event;choose(s,'story');assert.equal(s.hero.gold,0);
});

test('pets are real continuing companions, with finite lives, care and a genuine loss record',()=>{
 for(const species of ['cat','hound','raven']){
  const s=fixture(8),start=s.day;action(s,'pet');choose(s,species);const pet=s.pastimes.pet;assert.equal(s.day,start+2);assert.equal(pet.species,species);assert.equal(pet.age,1);assert.ok(pet.deathDay>s.day);assert.equal(pet.caregiverId,'kin');
  action(s,'petcare');choose(s,'groom');assert.equal(pet.bond,38);assert.equal(pet.lastCareDay,s.day);
  let oldDay=s.day;s.day+=100;s.age=Math.floor(s.day/365);onPastimeTime(s,{oldDay,newDay:s.day},context(s));assert.equal(pet.health,100);assert.equal(pet.bond,38,'a present caregiver continues basic care without granting the child more bond');
  s.life.people[0].alive=false;oldDay=s.day;s.day+=100;s.age=Math.floor(s.day/365);onPastimeTime(s,{oldDay,newDay:s.day},context(s));assert.equal(pet.health,88);assert.equal(pet.bond,32);
  oldDay=s.day;s.day=pet.deathDay+100;s.age=Math.floor(s.day/365);onPastimeTime(s,{oldDay,newDay:s.day},context(s));assert.equal(s.pastimes.pet,null);assert.equal(s.pastimes.petHistory.length,1);assert.equal(s.pastimes.petHistory[0].endedDay,pet.deathDay);assert.equal(validatePastimes(s.pastimes,s),true);
 }
});

test('pet inheritance carries the same animal and birth date, never the parent’s hobby levels or life span reset',()=>{
 const parent=fixture(18);interest(parent,'music');action(parent,'practice');choose(parent,'solo');action(parent,'pet');choose(parent,'hound');const pet=parent.pastimes.pet;
 const child=fixture(6);child.day=parent.day+365;child.timeline.birthDay=child.day-6*365;inheritPastimes(parent,child);assert.equal(child.pastimes.pet.id,pet.id);assert.equal(child.pastimes.pet.bornDay,pet.bornDay);assert.equal(child.pastimes.pet.deathDay,pet.deathDay);assert.deepEqual(child.pastimes.interests,{});assert.deepEqual(child.pastimes.history,[]);assert.equal(validatePastimes(child.pastimes,child),true);
 child.day=pet.deathDay;inheritPastimes(parent,child);assert.equal(child.pastimes.pet,null);
});

test('a pet remains in its real household rather than teleporting to every place the player visits',()=>{
 const s=fixture(18);action(s,'pet');choose(s,'cat');const pet=s.pastimes.pet;s.locationId='city';assert.equal(pet.locationId,'home');assert.ok(pastimeActions(s).find(a=>a.id==='pastime_petcare').disabledReason);s.locationId='home';assert.ok(!pastimeActions(s).find(a=>a.id==='pastime_petcare').disabledReason);
});

test('migration is prospective and keeps an existing school, birth or dialogue event byte for byte',()=>{
 for(const id of ['birth_year_12','school_exam','old_dialogue']){const s=fixture(12);delete s.pastimes;s.event={id,body:'The exact old promise',choices:[{id:'continue',label:'Same choice'}]};const before=structuredClone(s);initializePastimes(s,{migration:true});assert.deepEqual(s.event,before.event);assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.education,before.education);assert.equal(s.pastimes.startedDay,s.day);assert.equal(validatePastimes(s.pastimes,s),true);}
 assert.equal(validatePastimes(undefined,fixture()),true);
});

test('callbacks wait behind an active commitment or urgent event and never resurrect a dead acquaintance',()=>{
 const s=fixture(12);action(s,'prank');choose(s,'join');const cb=s.pastimes.callbacks[0];s.day=cb.dueDay;
 s.event={id:'urgent',body:'An unchanged deadline',choices:[]};const original=structuredClone(s.event);assert.equal(flushPastimeEvent(s,context(s)),false);assert.deepEqual(s.event,original);s.event=null;
 s.life.people[1].alive=false;assert.equal(flushPastimeEvent(s,context(s)),false);assert.equal(cb.resolved,true);assert.equal(s.event,null);
});

test('save validation rejects forged practice, past/future pets, mismatched scene choices and impossible commitments',()=>{
 const s=fixture(16);interest(s,'music');action(s,'practice');choose(s,'solo',context(s,{limitDay:s.day+1}));assert.equal(validatePastimes(s.pastimes,s),true);
 for(const mutate of [p=>p.project.completedDays=3,p=>p.project.remainingDays=9,p=>p.project.sceneId='pet_arrival',p=>p.project.actionId='bank',p=>p.interests.music.level=8,p=>p.startedDay=s.day+1,p=>p.uses['1:prank']=100]){const v=structuredClone(s.pastimes);mutate(v);assert.equal(validatePastimes(v,s),false);}
 const p=fixture(8);action(p,'pet');choose(p,'cat');for(const mutate of [v=>v.pet.deathDay=p.day,v=>v.pet.age=999,v=>v.pet.lastCareDay=p.day+1,v=>v.pet.alive=false]){const v=structuredClone(p.pastimes);mutate(v);assert.equal(validatePastimes(v,p),false);}
 const pending=fixture(12);action(pending,'club');pending.event.choices[0].id='invent';assert.equal(validatePastimes(pending.pastimes,pending),false);
 assert.equal(Object.keys(pastimeEventIds()).length,4);
});

test('the everyday scene deck contains more than a dozen genuinely different situations and gives each an exact choice set',()=>{
 const titles=new Set();for(let seed=0;seed<50;seed++)for(const id of ['fair','club','prank','revision','skip','games','night','crush']){
  const s=fixture(16,`scenes-${seed}`);action(s,id);titles.add(s.event.title);const event=structuredClone(s.event);const invalid=structuredClone(s);invalid.event=null;assert.equal(applyPastimeChoice(invalid,event.id,'unlisted',context(invalid)),false);assert.deepEqual(invalid.pastimes,s.pastimes);choose(s,event.choices[0].id);
 }assert.ok(titles.size>=17,titles.size);
});
