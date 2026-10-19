import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld} from '../dist/js/world.js';
import {initializeCareers} from '../dist/js/careers.js';
import {initializeTimeline,birthEvent,applyBirthChoice,startAgeYear,continueAgeYear,validateTimeline,getAgeActivities} from '../dist/js/birth.js';

function state(seed='new-leaves',age=0,birthDay=0,version=6) {
  const s={seed,revision:5,age,day:birthDay+age*365,phase:age<18?'childhood':'adult',locationId:'home',world:generateWorld(seed,{expanded:true}),hero:{name:'Ari',origin:'village',birthplace:'village',household:'poor',profession:'Blacksmith',path:'unformed',specialization:null,condition:null,gold:40,hp:40,maxHp:40,mp:20,maxMp:20,attributes:Object.fromEntries(['strength','agility','vitality','intellect','willpower','presence'].map(k=>[k,3])),skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0]))},family:{setup:'two_parents'},education:{enrolled:false,scholarship:false,route:null},life:{people:['kin','fellow','rival'].map(id=>({id,name:`Person ${id}`,role:id==='kin'?'relative':'friend',familyRole:id==='kin'?'parent':undefined,bond:60,memories:[],knownFacts:[],alive:true})),career:{experience:0,rank:0},stress:30,happiness:50,plan:null},flags:{},factions:{villagers:0,academy:0,order:0},event:null,battle:null,conversations:{pending:null},dungeon:null,journal:[],careers:{batch:null}};
  initializeTimeline(s);s.timeline.birthDay=birthDay;s.timeline.contentVersion=version;return s;
}
function context(s) {
  return {setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},journal(title,text,kind){s.journal.push({day:s.day,age:s.age,title,text,kind});},standing(id,n){s.factions[id]+=n;},remember(){},finishObligation(){},pendingNeed(){return false;},afterAction(){},spendDays(n){s.day+=n;s.age=Math.floor((s.day-s.timeline.birthDay)/365);return n;},householdContext(){return {caregiverName:'Person kin',summary:'Your named caregiver shares this household.'};}};
}
function choose(s,id='curiosity') {const ctx=context(s);birthEvent(s,ctx,s.age===0);const e=s.event;s.event=null;assert.equal(applyBirthChoice(s,e.id,s.age<3?'continue':id,ctx),true);return e;}

test('expanded childhoods use nonrepeating situations with different real effects and remembered choices',()=>{
  const slots=[3,4,6,8,9,11,13,14,16,17],acrossSeeds=new Set(),gains=new Set();
  for(let n=0;n<60;n++){
    const s=state(`child-content-${n}`),titles=new Set();
    for(const age of slots){s.age=age;s.day=age*365;const before=structuredClone(s.hero.skills),event=choose(s,['care','curiosity','courage'][(n+age)%3]);titles.add(event.title);acrossSeeds.add(event.title);gains.add(Object.keys(before).filter(k=>s.hero.skills[k]>before[k]).join(','));assert.ok(s.timeline.childhoodFacts[`year_${age}`]);}
    assert.equal(titles.size,slots.length,'one childhood should not repeat the same ordinary annual scenario');
    assert.equal(validateTimeline(s.timeline,s),true);
  }
  assert.equal(acrossSeeds.size,22);assert.ok(gains.size>=8);
});

test('a long civilian blacksmith life receives varied professional dilemmas and can stay unformed',()=>{
  const s=state('maker-forever',19),titles=new Set();delete s.careers;initializeCareers(s);
  for(let age=19;age<35;age++){s.age=age;s.day=age*365;titles.add(choose(s,'care').title);}
  assert.equal(titles.size,16);assert.equal(s.hero.path,'unformed');assert.equal(s.hero.profession,'Blacksmith');assert.ok(s.life.career.experience>=20);assert.ok(s.hero.gold>40);assert.ok(s.hero.skills.survival>0);assert.ok(s.factions.villagers>0);assert.ok(s.careers.records.Blacksmith.experience>=20);
});

test('older pending birthday effects remain unchanged before next-content transition',()=>{
  const old=state('legacy-pending-choice',3,0,4),upgraded=structuredClone(old);upgraded.timeline.nextContentVersion=6;
  const a=choose(old),b=choose(upgraded);assert.equal(a.title,b.title);assert.deepEqual(old.hero,upgraded.hero);assert.deepEqual(old.life,upgraded.life);assert.deepEqual(old.timeline.yearHistory,upgraded.timeline.yearHistory);assert.equal(upgraded.timeline.contentVersion,6);assert.equal(upgraded.timeline.nextContentVersion,undefined);
});

test('successor birthdays use their own birth offset and retain the absolute world calendar',()=>{
  const s=state('later-generation',18,137),start=s.day,ctx=context(s),w=structuredClone(s.world);
  s.day+=17;s.timeline.yearStartDay=s.day;
  assert.equal(startAgeYear(s,ctx),true);assert.equal(s.age,19);assert.equal(s.day,137+19*365);assert.equal(s.event.id,'birth_adult_year');assert.equal(validateTimeline(s.timeline,s),true);
  const event=s.event;s.event=null;applyBirthChoice(s,event.id,'care',ctx);assert.equal(s.timeline.yearHistory[0].id,'birthday-137-19');assert.deepEqual(s.world,w);assert.ok(s.day>start);
  const wrong=structuredClone(s.timeline);wrong.yearTarget=(20*365);assert.equal(validateTimeline(wrong,s),false);
});

test('annual income is credited only through elapsed-time hook when provided',()=>{
  const s=state('annual-hook',18),ctx=context(s),calls=[];ctx.annualIncome=(days,before)=>{calls.push({days,before});s.hero.gold+=days;s.life.career.experience+=days;};
  assert.equal(startAgeYear(s,ctx),true);assert.equal(calls.reduce((n,c)=>n+c.days,0),365);assert.equal(s.hero.gold,405);assert.equal(s.life.career.experience,365);
  const gold=s.hero.gold;assert.equal(continueAgeYear(s,ctx),false);assert.equal(s.hero.gold,gold,'the pending birthday must not pay another year');
});

test('committed career batches block age-up and living guardians replace deceased parents for care',()=>{
  const s=state('committed-year',8);s.careers.batch={remainingDays:4};const day=s.day;assert.equal(startAgeYear(s,context(s)),false);assert.equal(s.day,day);assert.match(s.notice,/committed work/);
  s.timeline.yearTarget=s.day+365;assert.equal(continueAgeYear(s,context(s)),false);assert.equal(s.day,day);
  s.careers.batch=null;s.life.people[0].alive=false;s.life.people.push({id:'family_guardian',name:'Living Keeper',familyRole:'guardian',role:'relative',alive:true,bond:55,memories:[],knownFacts:[]});
  assert.match(getAgeActivities(s).find(a=>a.id==='grow_family').label,/Living Keeper/);
});

test('planned road-end interruptions remain saveable at the snapshot duration before the pawn moves',()=>{
  const s=state('planned-leg-end',18),road=s.world.roads.find(r=>r.from==='home'||r.to==='home'),to=road.from==='home'?road.to:road.from,totalDays=road.days+2;
  s.timeline.journey={destinationId:to,route:['home',to],legIndex:0,legProgress:totalDays,startedDay:s.day,traversedIds:['home'],legs:[{totalDays}]};
  assert.equal(validateTimeline(s.timeline,s),true);
  s.timeline.journey.legProgress++;assert.equal(validateTimeline(s.timeline,s),false);
  delete s.timeline.journey.legs;s.timeline.journey.legProgress=road.days;assert.equal(validateTimeline(s.timeline,s),false,'legacy journeys retain their stricter unplanned geometry invariant');
});

test('successor generation salt varies childhood stories while world seed and geography stay exact',()=>{
  const a=state('generation-story',3),b=structuredClone(a);a.dynasty={generation:1};b.dynasty={generation:2};
  const original=structuredClone(a.world),storiesA=[],storiesB=[];
  for(const age of [3,4,6,8,9,11,13,14,16,17]){a.age=b.age=age;a.day=b.day=age*365;storiesA.push(choose(a).title);storiesB.push(choose(b).title);}
  assert.notDeepEqual(storiesA,storiesB);assert.equal(a.seed,b.seed);assert.deepEqual(a.world,original);assert.deepEqual(b.world,original);
});

test('completed-world heirs receive ordinary milestones without inherited forbidden-page promises',()=>{
  const s=state('heir-ordinary-milestones',0,40*365+137);s.campaign={facts:{inheritedResolution:true}};s.dynasty={generation:2};const titles=new Set();
  for(const age of [3,4,6,8,9,10,11,13,14,15,16,17]){s.age=age;s.day=s.timeline.birthDay+age*365;const event=choose(s,'curiosity');titles.add(event.title);if(age===10)assert.notEqual(event.title,'A teacher asks what you want');if(age===15)assert.notEqual(event.title,'A page the academy forbids');}
  assert.equal(titles.size,12);assert.equal(s.flags.ancestralMentor,undefined);assert.equal(s.flags.hiddenPage,undefined);
  s.age=18;s.day=s.timeline.birthDay+18*365;const adult=choose(s,'curiosity');assert.ok(adult.choices.every(c=>!c.description.includes('fate campaign')));assert.match(s.notice,/commitment has not become yours/);
  const old=state('old-pending-heir',15,0,4);old.campaign={facts:{inheritedResolution:true}};const event=choose(old,'curiosity');assert.equal(event.title,'A page the academy forbids');assert.equal(old.flags.ancestralMentor,true);
});

test('mortality during an age-up closes the life before another birthday or income',()=>{
  const s=state('mortal-birthday',103),ctx=context(s);let income=0,after=0;
  ctx.spendDays=n=>{s.day+=n;s.age=Math.floor((s.day-s.timeline.birthDay)/365);s.phase='retired';s.hero.alive=false;s.timeline.yearTarget=null;s.event=null;return n;};
  ctx.annualIncome=()=>income++;ctx.afterAction=()=>after++;
  assert.equal(startAgeYear(s,ctx),true);assert.equal(s.phase,'retired');assert.equal(s.event,null);assert.equal(income,0);assert.equal(after,0);
  assert.equal(s.timeline.yearHistory.length,0);
});
