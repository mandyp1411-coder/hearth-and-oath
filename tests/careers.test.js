import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeWorkshop } from '../dist/js/workshop.js';
import {
  PROFESSION_CATALOG, getProfession, initializeCareers, careerActions, applyCareerAction,
  applyCareerChoice, onCareerTime, flushCareerEvent, careerView, validateCareers,
  professionWage, professionAnnualWage, professionSkill, recordCareerWork,
  addCareerExperience, resetCareerForSuccessor, masterworkMaterials,
} from '../dist/js/careers.js';
import { PROFESSION_CATALOG as entryCatalog, getProfession as entryGetProfession, professionSkill as entryProfessionSkill } from '../dist/js/career-entry.js';

test('career public catalog and lookup exports retain exact entry references', () => {
  assert.strictEqual(PROFESSION_CATALOG, entryCatalog);
  assert.strictEqual(getProfession, entryGetProfession);
  assert.strictEqual(professionSkill, entryProfessionSkill);
  for (const profession of entryCatalog) {
    assert.strictEqual(getProfession(profession.id), profession);
    assert.strictEqual(getProfession(profession.name), profession);
    assert.equal(professionSkill(profession.id), profession.skill);
  }
});

function life(seed='a civilian maker', profession='Blacksmith', gold=0) {
  const s={seed,revision:5,day:18*365,age:18,phase:'adult',locationId:'home',
    world:generateWorld(seed,{expanded:true}),timeline:{mode:'birth',birthDay:0,yearTarget:null,journey:null},
    hero:{name:'Ari Reed',profession,path:'unformed',specialization:null,condition:null,gold,alive:true,hp:60,maxHp:60,mp:20,maxMp:20,
      attributes:{strength:3,agility:3,vitality:3,intellect:3,willpower:3,presence:3},
      skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0]))},
    life:{career:{experience:0,rank:0},plan:null,stress:20,health:70,happiness:50,people:[{id:'kin',name:'Actual Keeper',knownFacts:[]}]},
    flags:{},factions:{villagers:0,academy:0,order:0},event:null,battle:null,dungeon:null,conversations:{pending:null},obligations:[],journal:[]};
  initializeWorkshop(s);initializeCareers(s);return s;
}
function context(s,{stopDay=Infinity,flush=false}={}) {
  return {
    spendDays(n){const days=Math.min(n,Math.max(0,stopDay-s.day));s.day+=days;s.age=Math.floor((s.day-s.timeline.birthDay)/365);onCareerTime(s,days,this);return days;},
    setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},
    journal(title,text,kind){s.journal.push({title,text,kind,day:s.day});},
    standing(id,n){s.factions[id]+=n;},
    addObligation(id,title,days,description){s.obligations.push({id,title,dueDay:s.day+days,description,resolved:false});},
    finishObligation(id){const obligation=s.obligations.find(o=>o.id===id);if(obligation)obligation.resolved=true;},
    pendingNeed(){return false;},
    afterAction(){if(s.day>=stopDay&&!s.event)s.event={id:'birthday',choices:[{id:'review'}]};if(flush)flushCareerEvent(s,this);},
  };
}
function perform(s,id,options={}) {
  const a=careerActions(s).find(a=>a.id===id);
  assert.ok(a,`${id} offered at age ${s.age}`);assert.equal(a.disabledReason,undefined,a.disabledReason);
  const ctx=context(s,options);s.hero.gold-=a.cost;
  if(a.days)ctx.spendDays(a.days);
  assert.equal(applyCareerAction(s,id,ctx),true,`${id} applied`);
  assert.ok(s.hero.gold>=0,'civilian work never spends unaffordable gold');
  assert.equal(validateCareers(s.careers,s),true,`${id} remains saveable`);return a;
}
function decide(s,id) {
  const eventId=s.event?.id;assert.ok(eventId);assert.equal(applyCareerChoice(s,eventId,id,context(s)),true);s.event=null;
  assert.equal(validateCareers(s.careers,s),true);
}
function finishBatch(s) {
  for(let i=0;i<80 && (s.careers.batch || s.event);i++) {
    if(s.event){assert.equal(s.event.id,'career_year');decide(s,'care');}
    else perform(s,'career_batch_continue',{flush:true});
  }
  assert.equal(s.careers.batch,null);
}
function fillMaterials(s,required) {
  for(const [id,count] of Object.entries(required))while(s.equipment.materials[id]<count)perform(s,`career_buy_${id}`);
}
function deliver(s,decision='honest',style='standard') {
  const offer=careerView(s).commissions.find(o=>!o.gearId || s.workshop.crafting>=2);
  assert.ok(offer,'quarterly seeded work is available');
  perform(s,offer.actionId);const required={...s.careers.active.materials};
  if(style==='fine'){const key=Object.keys(required)[0]||'cloth';required[key]=(required[key]||0)+1;}
  fillMaterials(s,required);perform(s,`career_make_${style}`);perform(s,'career_invoice');decide(s,decision);
}

test('additive migration invents no labor, income, shop, materials or past story and preserves an old wage agreement',()=>{
  const s=life('old practice','Scholar',11);delete s.careers;s.life.career.rank=2;s.flags.certified=true;
  s.life.plan={activity:'work',remainingDays:90,wages:711};const before=structuredClone(s);
  initializeCareers(s,{migration:true});
  for(const key of Object.keys(before))assert.deepEqual(s[key],before[key],`${key} stays exact`);
  assert.equal(professionWage(s),23+8+8);assert.equal(professionAnnualWage(s),620+240+50);
  const sidecar=structuredClone(s.careers);initializeCareers(s,{migration:true});assert.deepEqual(s.careers,sidecar);
  assert.equal(validateCareers(s.careers,s),true);assert.equal(s.careers.shop,null);assert.equal(s.careers.history.length,0);
  assert.ok(Object.values(s.careers.records).every(r=>r.experience===0&&r.workedDays===0&&r.earnedGold===0));
  assert.deepEqual(careerActions(s),[],'old committed plans cannot overlap new work');
  addCareerExperience(s,500);assert.equal(professionAnnualWage(s),910,'new mastery cannot change an old committed rate');
  s.life.plan=null;onCareerTime(s,1,context(s));assert.equal(professionAnnualWage(s),1150);
});

test('paid days and supervised learning prorate consistently across interruptions; birthday learning claims no wages or work',()=>{
  const a=life('proration'),b=structuredClone(a),gold=a.hero.gold;
  recordCareerWork(a,{days:14,paid:false});for(let i=0;i<14;i++)recordCareerWork(b,{days:1,paid:false});
  assert.deepEqual(a.careers.records,b.careers.records);
  assert.equal(a.careers.records.Blacksmith.experience,10);assert.equal(a.careers.records.Blacksmith.unpaidWorkedDays,14);
  assert.equal(a.hero.gold,gold);assert.equal(a.workshop.crafting,1);
  const days=a.careers.records.Blacksmith.workedDays,materials=structuredClone(a.equipment.materials);
  assert.equal(addCareerExperience(a,1790),true);assert.equal(a.careers.records.Blacksmith.mastery,4);
  assert.equal(a.careers.records.Blacksmith.workedDays,days);assert.equal(a.hero.gold,gold);assert.deepEqual(a.equipment.materials,materials);
  assert.equal(addCareerExperience(a,-3),false);assert.equal(addCareerExperience({hero:{profession:'Blacksmith'},careers:{batch:null}},6),false);
});

test('every old livelihood keeps its base wages while all new work and views are seeded, pure and skill-specific',()=>{
  const old={Unemployed:[18,480],Healer:[24,640],Merchant:[28,760],Scholar:[23,620],Herbalist:[23,600],Soldier:[26,700]};
  for(const [name,[shift,annual]] of Object.entries(old)){const s=life('old wages',name);assert.equal(professionWage(s),shift);assert.equal(professionAnnualWage(s),annual);}
  assert.equal(PROFESSION_CATALOG.length,13);assert.equal(professionSkill('Blacksmith'),'survival');assert.equal(professionSkill('Cartographer'),'scholarship');
  const a=life('consistent board'),b=life('consistent board'),different=life('another board');const before=structuredClone(a);
  assert.deepEqual(careerView(a),careerView(b));assert.deepEqual(a,before,'opening a career view generates no history or resource');
  assert.notDeepEqual(careerView(a).commissions,careerView(different).commissions);
  for(const job of PROFESSION_CATALOG){a.hero.profession=job.name;assert.ok(careerActions(a).some(x=>x.id==='career_work'));assert.ok(careerView(a).commissions.every(c=>c.pay>0&&c.days>0));}
});

test('a penniless civilian makes and delivers real local goods; concealed defects affect only professional trust',()=>{
  const s=life('civilian defects');perform(s,'career_work');
  const offer=careerView(s).commissions.find(o=>!o.gearId);const gold=s.hero.gold,owned=structuredClone(s.equipment.owned),knowledge=structuredClone(s.life.people),factions=structuredClone(s.factions);
  perform(s,offer.actionId);assert.equal(s.hero.gold,gold,'accepting work grants no pay');assert.equal(s.careers.active.status,'accepted');
  assert.equal(applyCareerAction(s,offer.actionId,context(s)),false,'a promised commission cannot be accepted twice');
  fillMaterials(s,s.careers.active.materials);const materials=structuredClone(s.equipment.materials),required=structuredClone(s.careers.active.materials);
  perform(s,'career_make_rush');assert.ok(s.careers.active.quality<s.careers.active.targetQuality);
  for(const [id,n] of Object.entries(required))assert.equal(s.equipment.materials[id],materials[id]-n);
  assert.deepEqual(s.equipment.owned,owned,'a customer’s goods are delivered to the customer rather than duplicated as owned gear');
  perform(s,'career_invoice');const beforePay=s.hero.gold,pay=s.careers.active.pay;decide(s,'conceal');assert.equal(s.hero.gold,beforePay+pay);
  assert.equal(s.careers.records.Blacksmith.reputation,18);assert.equal(s.careers.records.Blacksmith.safety,60);assert.equal(s.careers.records.Blacksmith.commissions,1);
  assert.deepEqual(s.life.people,knowledge);assert.deepEqual(s.factions,factions);assert.equal(s.hero.path,'unformed');assert.equal(s.hero.specialization,null);
  assert.equal(applyCareerChoice(s,'career_invoice','conceal',context(s)),false);assert.equal(applyCareerAction(s,'career_invoice',context(s)),false);
  assert.equal(s.obligations.at(-1).resolved,true);
});

test('real deadlines cost professional trust once and honest shortfalls cannot claim full payment',()=>{
  const s=life('lateness','Blacksmith',100),offer=careerView(s).commissions.find(o=>!o.gearId);perform(s,offer.actionId);
  const a=s.careers.active,rep=s.careers.records.Blacksmith.reputation;s.day=a.dueDay+1;s.age=Math.floor(s.day/365);
  onCareerTime(s,1,context(s));onCareerTime(s,7,context(s));assert.equal(s.careers.records.Blacksmith.reputation,rep-5);assert.equal(s.careers.records.Blacksmith.failures,1);
  fillMaterials(s,a.materials);perform(s,'career_make_rush');perform(s,'career_invoice');const before=s.hero.gold,expected=Math.floor(a.pay*.75*.65);decide(s,'honest');
  assert.equal(s.hero.gold,before+expected);assert.equal(s.obligations.at(-1).resolved,true);
});

test('saved year commitments pay only completed time, preserve agreed rates, and finish with exact cumulative earnings',()=>{
  const s=life('work interruption');const start=s.day,wage=professionWage(s),stop=start+9;
  perform(s,'career_batch_year',{stopDay:stop,flush:true});assert.equal(s.day,stop);assert.equal(s.careers.batch.completedDays,9);assert.equal(s.careers.batch.remainingDays,356);
  assert.equal(s.hero.gold,Math.floor(9*wage/3));assert.equal(s.life.career.experience,6);
  const loaded=JSON.parse(JSON.stringify(s));assert.equal(validateCareers(loaded.careers,loaded),true);assert.equal(applyCareerAction(s,'career_batch_continue',context(s)),false,'a current decision blocks direct continuation');
  s.event=null;loaded.event=null;finishBatch(s);finishBatch(loaded);assert.deepEqual(s,loaded,'the same saved choices resume the same work');
  assert.equal(s.day,start+365);assert.equal(s.hero.gold,Math.floor(365*wage/3));assert.equal(s.careers.records.Blacksmith.earnedGold,s.hero.gold);
  assert.equal(s.careers.records.Blacksmith.workedDays,365);assert.equal(s.life.career.experience,Math.floor(365*2/3));assert.equal(s.careers.records.Blacksmith.mastery,2);
  assert.equal(s.hero.path,'unformed');
});

test('a shop uses real materials and paid staff; teaching creates an actual credited journeyworker with fair wages',()=>{
  const s=life('a staffed smithy','Blacksmith',1000);perform(s,'career_batch_month',{flush:true});finishBatch(s);perform(s,'career_open_shop');
  assert.equal(s.workshop.structures.length,0,'renting a shop cannot conjure a forge');perform(s,'career_hire');const before=s.hero.gold;decide(s,'apprentice');
  const apprentice=s.careers.shop.staff[0];assert.equal(s.hero.gold,before-24);assert.ok(apprentice.age>=16&&apprentice.age<=19);assert.equal(apprentice.wage,4);
  for(let lesson=0;lesson<7;lesson++){if(lesson)context(s).spendDays(14);perform(s,'career_mentor');}
  assert.equal(apprentice.role,'journeyworker');assert.equal(apprentice.wage,6);assert.equal(apprentice.skill,31);
  const lesson=careerActions(s).find(a=>a.id==='career_mentor');assert.ok(lesson.disabledReason,'learning has time to become practice');
  const expense=careerActions(s).find(a=>a.id==='career_shop_operate').cost;assert.equal(expense,16);const gold=s.hero.gold;perform(s,'career_shop_operate');
  assert.equal(s.careers.shop.weeks,1);assert.equal(s.hero.gold,gold-expense+s.careers.shop.turnover);assert.equal(apprentice.skill,32);
  fillMaterials(s,{wood:8,stone:4,ore:3});const oldMaterials=structuredClone(s.equipment.materials);perform(s,'career_shop_upgrade');assert.equal(s.careers.shop.tier,2);
  for(const [id,n] of Object.entries({wood:8,stone:4,ore:3}))assert.equal(s.equipment.materials[id],oldMaterials[id]-n);
  const exp=s.careers.records.Blacksmith.experience;s.day=apprentice.bornDay+70*365;s.age=Math.floor(s.day/365);onCareerTime(s,1,context(s));
  assert.equal(apprentice.status,'retired');assert.equal(careerActions(s).find(a=>a.id==='career_shop_operate').cost,10);assert.equal(s.careers.records.Blacksmith.experience,exp,'elapsed nonworking years create no imaginary labor');
});

test('a whole civilian smith’s life earns mastery, five real commissions and an interrupted signed legacy that descendants do not inherit as skill',()=>{
  const s=life('lifelong smith','Unemployed');perform(s,'career_choose_blacksmith');
  for(let year=0;year<13;year++){perform(s,'career_batch_year',{flush:true});finishBatch(s);}
  assert.ok(s.age>=30);assert.equal(s.careers.records.Blacksmith.mastery,4);assert.ok(s.hero.gold>1000);assert.equal(s.hero.path,'unformed');
  for(let count=0;count<5;count++){if(!careerView(s).commissions.length){perform(s,'career_batch_month',{flush:true});finishBatch(s);count--;continue;}deliver(s);}
  assert.equal(s.careers.records.Blacksmith.commissions,5);fillMaterials(s,{ore:4,wood:4,cloth:3});
  const before={day:s.day,gold:s.hero.gold,materials:structuredClone(s.equipment.materials)};
  perform(s,'career_masterwork',{stopDay:s.day+5,flush:true});assert.equal(s.careers.batch.remainingDays,9);assert.equal(s.careers.masterworks.length,0);assert.equal(s.hero.gold,before.gold-35);
  for(const [id,n] of Object.entries({ore:4,wood:4,cloth:3}))assert.equal(s.equipment.materials[id],before.materials[id]-n);
  s.event=null;perform(s,'career_batch_continue',{flush:true});assert.equal(s.day,before.day+14);assert.equal(s.event.id,'career_legacy');decide(s,'teach');
  assert.equal(s.careers.masterworks.length,1);assert.equal(s.careers.masterworks[0].authorName,'Ari Reed');assert.equal(s.careers.masterworks[0].apprenticeName,null,'a teaching legacy cannot invent an apprentice');
  assert.ok(careerActions(s).find(a=>a.id==='career_masterwork').disabledReason);
  const artifact=structuredClone(s.careers.masterworks[0]);s.timeline.birthDay=s.day-18*365;s.age=18;s.hero.name='Actual Child';s.hero.profession='Unemployed';resetCareerForSuccessor(s);
  assert.deepEqual(s.careers.masterworks[0],artifact);assert.equal(s.careers.records.Blacksmith.experience,0);assert.notEqual(s.careers.ownerId,artifact.ownerId);assert.equal(validateCareers(s.careers,s),true);
});

test('commission and event validation reject fabricated payouts, customers, goods, dates and incorrect pending decisions',()=>{
  const s=life('strict commissions','Blacksmith',100);perform(s,careerView(s).commissions[0].actionId);
  for(const mutate of [v=>v.active.pay=999,v=>v.active.customerName='Imaginary Buyer',v=>v.active.goodId='free-gold',v=>v.active.dueDay+=1,v=>v.active.period+=1,v=>v.active.offeredMastery=4,v=>v.active.materials={},v=>v.ownerId='birth-999']){
    const c=structuredClone(s.careers);mutate(c);assert.equal(validateCareers(c,s),false);
  }
  fillMaterials(s,s.careers.active.materials);s.workshop.crafting=10;perform(s,'career_make_standard');perform(s,'career_invoice');
  const wrong=structuredClone(s);wrong.event.id='career_staff';assert.equal(validateCareers(wrong.careers,wrong),false);
  const p=structuredClone(s.careers);p.pending.commissionId='another';assert.equal(validateCareers(p,s),false);
  assert.equal(validateCareers(null,s),false);assert.equal(validateCareers([],s),false);
});

test('new civilian commitments train the same relevant skill as equal individual shifts, including interrupted saved progress',()=>{
  for(const profession of ['Blacksmith','Farmer','Innkeeper','Merchant','Bard','Cartographer','Alchemist','Healer']) {
    const a=life(`equal lived work ${profession}`,profession),b=structuredClone(a);
    perform(a,'career_batch_month',{stopDay:a.day+9});
    const loaded=JSON.parse(JSON.stringify(a));
    assert.equal(a.event.id,'birthday');a.event=null;loaded.event=null;
    finishBatch(a);finishBatch(loaded);
    for(let shift=0;shift<10;shift++)perform(b,'career_work');
    const trained=professionSkill(profession);
    assert.equal(a.hero.skills[trained],2,`${profession} learns from thirty actual days`);
    assert.equal(b.hero.skills[trained],a.hero.skills[trained],'splitting time does not farm extra skills');
    assert.equal(a.careers.records[profession].workedDays,30);
    assert.equal(a.careers.records[profession].experience,b.careers.records[profession].experience);
    assert.deepEqual(a,loaded,'saved interruptions do not duplicate learning');
  }
});

test('new professional mastery is a longer earned path while earlier saves retain their earned thresholds and agreements',()=>{
  const s=life('patient learning');addCareerExperience(s,500);
  assert.equal(s.careers.records.Blacksmith.mastery,2);
  assert.equal(careerView(s).progress.nextMastery,900);
  addCareerExperience(s,1299);assert.equal(s.careers.records.Blacksmith.mastery,3);
  addCareerExperience(s,1);assert.equal(s.careers.records.Blacksmith.mastery,4);
  const old=life('saved earlier mastery');delete old.careers.contentVersion;
  addCareerExperience(old,500);assert.equal(old.careers.records.Blacksmith.mastery,4);
  const offered=careerView(old).commissions[0];perform(old,offered.actionId);
  const exact=structuredClone(old);initializeCareers(old,{migration:true});
  assert.deepEqual(old,exact,'an old accepted board and mastery never change on additive migration');
  assert.equal(validateCareers(old.careers,old),true);
  recordCareerWork(old,{days:14});assert.equal(old.hero.skills.survival,0,'old shift learning stays under the old rule');
});

test('new quarterly boards vary named goods without duplicate offerings and remain stable after reloading',()=>{
  for(let seed=0;seed<30;seed++)for(const profession of PROFESSION_CATALOG) {
    const s=life(`three real customers ${seed}`,profession.name),before=structuredClone(s);
    const goods=careerView(s).commissions;
    assert.equal(new Set(goods.map(g=>g.goodId)).size,3,`${profession.name} offers three distinct useful goods`);
    assert.deepEqual(careerView(s),careerView(JSON.parse(JSON.stringify(s))));
    assert.deepEqual(s,before,'browsing creates no promises or income');
    perform(s,goods[1].actionId);assert.equal(validateCareers(s.careers,s),true);
  }
});

test('all twelve professional lives have distinct work stories grounded in the actual season, workplace and named colleagues',()=>{
  const scenes=new Set();
  for(const profession of PROFESSION_CATALOG.filter(p=>p.name!=='Unemployed')) {
    const s=life(`work stories ${profession.id}`,profession.name,1000);
    perform(s,'career_batch_month',{flush:true});finishBatch(s);perform(s,'career_open_shop');perform(s,'career_hire');decide(s,'apprentice');
    for(let year=0;year<4;year++) {
      perform(s,'career_batch_year',{flush:true});
      assert.equal(s.event.id,'career_year');
      assert.ok(s.event.body.includes(s.careers.shop.name));
      assert.ok(s.event.body.includes(s.careers.shop.staff[0].name));
      const scene=s.event.body.match(/can help carry careful work and remember how you teach\. (.*) The decision changes/)[1];
      scenes.add(scene);decide(s,'care');finishBatch(s);
    }
  }
  assert.equal(scenes.size,48,'each profession has four authored situations instead of shared generic scenes');
});

test('lifetime recipes fit the earned profession and old pending work keeps its original materials',()=>{
  const bard=life('a written witness','Bard'),healer=life('a care folio','Healer'),smith=life('a lasting hinge');
  assert.deepEqual(masterworkMaterials(bard),{wood:2,cloth:4});
  assert.deepEqual(masterworkMaterials(healer),{cloth:5,wood:2,crystal:1});
  assert.deepEqual(masterworkMaterials(smith),{ore:4,wood:4,cloth:3});
  const before=structuredClone(bard);masterworkMaterials(bard).wood=999;
  assert.deepEqual(bard,before,'recipe views expose copies');
  delete bard.careers.contentVersion;
  assert.deepEqual(masterworkMaterials(bard),{ore:4,wood:4,cloth:3},'original civilian lives retain their exact recipe');
});

test('a funded local public work spends actual time, materials and coin, credits actual colleagues, and cannot be repeated early',()=>{
  const s=life('service beyond my door','Healer',2000);
  for(let month=0;month<3;month++){perform(s,'career_batch_month',{flush:true});finishBatch(s);}
  perform(s,'career_open_shop');perform(s,'career_hire');decide(s,'worker');fillMaterials(s,{cloth:3,wood:1,crystal:1});
  const before=structuredClone(s),w=s.careers.shop.staff[0];perform(s,'career_public_work');
  assert.equal(s.day-before.day,7);assert.equal(before.hero.gold-s.hero.gold,180);
  assert.equal(s.equipment.materials.cloth,before.equipment.materials.cloth-3);
  assert.equal(s.equipment.materials.wood,before.equipment.materials.wood-1);
  assert.equal(s.equipment.materials.crystal,before.equipment.materials.crystal-1);
  assert.equal(s.careers.records.Healer.workedDays,before.careers.records.Healer.workedDays+7);
  assert.equal(s.careers.records.Healer.unpaidWorkedDays,before.careers.records.Healer.unpaidWorkedDays+7);
  assert.equal(w.skill,before.careers.shop.staff[0].skill+2);
  const project=s.careers.publicWorks[0];assert.equal(project.authorName,s.hero.name);assert.deepEqual(project.colleagueNames,[w.name]);
  assert.equal(project.locationId,'home');assert.equal(project.name,'a free follow-up care clinic');
  assert.ok(careerActions(s).find(a=>a.id==='career_public_work').disabledReason.includes('90'));
  const exact=structuredClone(s);assert.equal(applyCareerAction(s,'career_public_work',context(s)),false);assert.deepEqual(s,exact);
  const exposed=careerView(s);exposed.publicWorks[0].materials.cloth=999;exposed.publicWorks[0].colleagueNames.push('Invented');
  assert.deepEqual(s,exact,'public records expose copies');
  for(const alter of [v=>v.publicWorks[0].gold=999,v=>v.publicWorks[0].materials={},v=>v.records.Healer.lastPublicWorkDay++]){const corrupt=structuredClone(s.careers);alter(corrupt);assert.equal(validateCareers(corrupt,s),false);}
});

test('fractional ordinary wages may credit real earnings without fabricating a completed workday',()=>{
  const s=life('a partial mixed day');const before=structuredClone(s);
  assert.equal(recordCareerWork(s,{days:0,gold:2,source:'year'}),true);
  assert.equal(s.careers.records.Blacksmith.earnedGold,2);
  for(const key of ['experience','workedDays','paidWorkedDays','unpaidWorkedDays'])assert.equal(s.careers.records.Blacksmith[key],before.careers.records.Blacksmith[key]);
  assert.deepEqual(s.hero.skills,before.hero.skills);
  assert.equal(recordCareerWork(s,{days:0,gold:2,paid:false}),false);
  const old=life('an existing wage record');delete old.careers.contentVersion;assert.equal(recordCareerWork(old,{days:0,gold:2}),false);
});

test('existing characters receive additive public work without changing accepted contracts, and an actual new heir uses fresh learning rules',()=>{
  const old=life('a living older healer','Healer',1000);delete old.careers.contentVersion;delete old.careers.publicWorks;
  perform(old,'career_batch_month',{flush:true});finishBatch(old);
  const offer=careerView(old).commissions[0];perform(old,offer.actionId);const agreed=structuredClone(old.careers.active);
  fillMaterials(old,{cloth:3,wood:1,crystal:1});perform(old,'career_public_work');
  assert.deepEqual(old.careers.active,agreed,'service does not renegotiate an accepted invoice');
  assert.equal(old.careers.contentVersion,undefined);assert.equal(validateCareers(old.careers,old),true);
  assert.deepEqual(old.careers.publicWorks[0].materials,{cloth:3,wood:1,crystal:1});
  const oldWork=structuredClone(old.careers.publicWorks);
  old.timeline.birthDay=old.day-18*365;old.age=18;old.hero.name='A Different Healer';resetCareerForSuccessor(old);
  assert.equal(old.careers.contentVersion,2);assert.equal(old.careers.records.Healer.experience,0);
  assert.deepEqual(old.careers.publicWorks,oldWork,'physical and signed public work survives a new personal life');
  assert.equal(validateCareers(old.careers,old),true);
});
