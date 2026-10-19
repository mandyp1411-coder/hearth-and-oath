import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import * as engine from '../dist/js/engine.js';
import { careerView, getProfession, masterworkMaterials } from '../dist/js/careers.js';

// Genuine, deterministic public-API journeys. No state, age, resource, or fixture
// mutation is used. Every call and the actual offered decision is retained.
const profiles = [
  { name:'Tamsin Hearth', profession:'Blacksmith', seed:'career-audit-hinge-71', birthplace:'village', household:'poor', familySetup:'homeless', birth:'courage', ethics:'care', invoice:'honest', legacy:'teach', family:true, staff:'apprentice', retirement:55, intention:'A homeless child builds a fair smithy, teaches another maker, and leaves a household rather than a conquest.' },
  { name:'Maren Reed', profession:'Farmer', seed:'career-audit-seed-203', birthplace:'brook', household:'tradesfolk', familySetup:'two_parents', birth:'care', ethics:'community', invoice:'community', legacy:'community', family:true, staff:'worker', retirement:60, intention:'Feed neighbors, support a family, and preserve shared seed knowledge.' },
  { name:'Osric Door', profession:'Innkeeper', seed:'career-audit-door-619', birthplace:'coast', household:'poor', familySetup:'single_parent', birth:'care', ethics:'community', invoice:'honest', legacy:'household', family:true, staff:'apprentice', retirement:58, intention:'An innkeeper makes a reliable home for travelers and teaches an apprentice without becoming an adventurer.' },
  { name:'Sable Coin', profession:'Merchant', seed:'career-audit-price-937', birthplace:'city', household:'noble', familySetup:'two_parents', birth:'courage', ethics:'profit', invoice:'conceal', legacy:'household', family:false, staff:'worker', retirement:50, intention:'A wealthy upbringing becomes an ambitious merchant who prioritizes contracts and money; poor work is knowingly concealed.' },
  { name:'Liora Witness', profession:'Bard', seed:'career-audit-song-1211', birthplace:'camp', household:'poor', familySetup:'orphan', birth:'care', ethics:'community', invoice:'community', legacy:'teach', family:false, staff:'apprentice', retirement:52, intention:'An orphan keeps living memories in songs and gives a younger performer a credited place.' },
  { name:'Aster Paths', profession:'Cartographer', seed:'career-audit-atlas-1637', birthplace:'sanctuary', household:'tradesfolk', familySetup:'single_parent', birth:'curiosity', ethics:'care', invoice:'honest', legacy:'community', family:false, staff:'worker', retirement:54, explore:true, intention:'Learn the actual region, walk safe roads, and publish accessible maps instead of fighting for renown.' },
  { name:'Edda Vial', profession:'Alchemist', seed:'career-audit-formula-1879', birthplace:'citadel', household:'noble', familySetup:'two_parents', birth:'curiosity', ethics:'care', invoice:'honest', legacy:'teach', family:false, staff:'apprentice', retirement:56, intention:'A careful alchemist values tested labels, practical education, and freely shared methods.' },
  { name:'Wren Care', profession:'Healer', seed:'career-audit-consent-2381', birthplace:'village', household:'poor', familySetup:'single_parent', birth:'care', ethics:'care', invoice:'community', legacy:'community', family:true, staff:'worker', retirement:62, intention:'A healer supports their own household and neighbors, takes recovery seriously, and keeps patient care independent of a combat class.' },
];
const edition=process.argv.includes('--improved')?'improved':'baseline';
const output=new URL(`../docs/playtest/careers-${edition}.json`,import.meta.url);
const all=process.argv.includes('--resume')?JSON.parse(await readFile(output,'utf8')).lives:[];

class Journey {
  constructor(profile) {
    this.profile=profile;
    this.state=engine.createBirthGame(profile);
    this.entries=[];this.unclassified=[];this.checks=0;
    this.check('birth');
  }
  check(label) {
    assert.ok(engine.validateSave(this.state),`${this.profile.profession}: ${label}, day ${this.state.day}, event ${this.state.event?.id}`);
    assert.ok(this.state.hero.gold>=0);this.checks++;
  }
  call(operation,id,fn) {
    const before=this.state, previous=JSON.stringify(before);
    const offered=operation==='choice'?before.event.choices.find(c=>c.id===id):operation==='action'?engine.getActions(before).find(a=>a.id===id):null;
    this.state=fn(before);
    assert.equal(JSON.stringify(before),previous,'public calls never mutate the previous save');
    this.check(`${operation}:${id}`);
    const profession=this.state.hero.profession;
    this.entries.push({n:this.entries.length+1,operation,id,label:offered?.label || id,event:before.event?.id || null,eventTitle:before.event?.title || null,eventBody:before.event?.body || null,choices:before.event?.choices || null,from:{day:before.day,age:before.age,gold:before.hero.gold,location:before.locationId,health:before.life.health,happiness:before.life.happiness,stress:before.life.stress},to:{day:this.state.day,age:this.state.age,gold:this.state.hero.gold,location:this.state.locationId,health:this.state.life.health,happiness:this.state.life.happiness,stress:this.state.life.stress,skills:{...this.state.hero.skills},profession,career:this.state.careers.records[profession]},notice:this.state.notice});
    assert.ok(previous!==JSON.stringify(this.state),`${operation}:${id} must actually change the journey`);
    return this.state;
  }
  has(id) {return engine.getActions(this.state).find(a=>a.id===id && !a.disabledReason);}
  act(id) {
    const descriptor=engine.getActions(this.state).find(a=>a.id===id);
    assert.ok(descriptor,`${this.profile.profession}: ${id} is offered at ${this.state.age}`);
    if(descriptor.disabledReason?.includes('birthday')){this.grow(this.state.age+1);return this.act(id);}
    assert.equal(descriptor.disabledReason,undefined,`${id}: ${descriptor.disabledReason}`);
    return this.call('action',id,s=>engine.chooseAction(s,id));
  }
  choose(id) {assert.ok(this.state.event?.choices.some(c=>c.id===id),`${this.state.event?.id} offers ${id}`);return this.call('choice',id,s=>engine.chooseEventOption(s,id));}
  policy() {
    const e=this.state.event,p=this.profile;
    const explicit={career_year:p.ethics,career_invoice:p.invoice,career_staff:p.staff,career_legacy:p.legacy,school_exam:'present',life_courtship:'yes',life_commitment:'pledge',lineage_marriage:'vow',lineage_school:p.profession==='Healer'?'shrine':'public',lineage_childhood:p.birth,lineage_bereavement:p.ethics==='profit'?'private':'share',health_concern:p.ethics==='profit'?'continue':'support',plague_letter:'later',deadline_review:'pause',retirement:'settle',travel_bandits:'avoid',travel_beasts:'avoid',travel_weather:'shelter',travel_caravan:'share',travel_witness:'listen',travel_sick_traveler:p.profession==='Healer'?'aid':'continue',travel_lore:'record',travel_delay:'continue',life_hunger:'animal',life_budget:'simplify'};
    if(/^birth_|^fate_/.test(e.id))return e.choices.some(c=>c.id===p.birth)?p.birth:e.choices[0].id;
    if(explicit[e.id] && e.choices.some(c=>c.id===explicit[e.id]))return explicit[e.id];
    // For authored adult scenarios, the roleplay intent chooses an actually
    // offered response by its meaning. The full alternatives are recorded.
    const expression=p.ethics==='profit'?/pay|premium|private|work|contract|leave|keep|profit/i:p.birth==='curiosity'?/study|learn|record|listen|investigate|explain|question|support|help/i:/care|help|listen|support|share|honest|repair|people|rest|safe|protect/i;
    const chosen=e.choices.find(c=>expression.test(`${c.label} ${c.description}`)) || e.choices[0];
    this.unclassified.push({event:e.id,age:this.state.age,choice:chosen.id,label:chosen.label});return chosen.id;
  }
  settle() {for(let n=0;this.state.event && n<120;n++)this.choose(this.policy());assert.equal(this.state.event,null);return this.state;}
  grow(age) {
    for(let n=0;n<600 && (this.state.age<age || this.state.timeline.yearTarget!==null || this.state.event);n++){
      if(this.state.phase==='retired')break;
      if(this.state.event)this.settle();
      else if(this.state.careers.batch)this.finishBatch();
      else this.call('age',this.state.timeline.yearTarget===null?'ageUp':'continueAgeUp',s=>s.timeline.yearTarget===null?engine.ageUp(s):engine.continueAgeUp(s));
    }
    assert.ok(this.state.phase==='retired' || this.state.age===age,`grow to ${age}`);return this.state;
  }
  finishBatch() {
    for(let n=0;n<180 && (this.state.careers.batch || this.state.event);n++) {
      if(this.state.phase==='retired')break;
      if(this.state.event)this.settle();else this.act('career_batch_continue');
    }
    assert.equal(this.state.careers.batch,null);return this.state;
  }
  materials(requirements) {for(const [id,count] of Object.entries(requirements))while(this.state.equipment.materials[id]<count){this.act(`career_buy_${id}`);this.settle();}}
  commission(index) {
    for(let n=0;n<8;n++) {
      const offers=careerView(this.state).commissions;
      const offer=offers.find(o=>!o.gearId) || offers[0];
      if(offer){this.act(offer.actionId);break;}
      this.act('career_batch_month');this.finishBatch();
    }
    assert.ok(this.state.careers.active,'a real commission was accepted');
    const c=this.state.careers.active;
    const style=this.profile.ethics==='profit'&&index===0?'rush':index%3===0?'fine':'standard';
    const materials={...c.materials};if(style==='fine'){const id=Object.keys(materials)[0] || 'cloth';materials[id]=(materials[id] || 0)+1;}
    this.materials(materials);this.act(`career_make_${style}`);this.settle();this.act('career_invoice');this.settle();
  }
  family() {
    const workplace=this.state.locationId;
    if(!this.has('life_home_cottage'))this.travel('home');
    this.act('life_home_cottage');this.settle();
    for(let n=0;this.state.life.people.find(p=>p.id==='fellow').bond<55&&n<10;n++){this.act('life_visit_fellow');this.settle();}
    this.act('life_court_fellow');this.settle();
    for(let n=0;this.state.life.people.find(p=>p.id==='fellow').bond<70&&n<10;n++){this.act('life_visit_fellow');this.settle();}
    this.act('life_commit_fellow');this.settle();this.act('lineage_marry');this.settle();
    for(let n=0;this.state.life.health<40&&n<10;n++){this.act('health_clinic');this.settle();}
    this.act('life_family');this.choose(this.profile.profession==='Healer'?'adopt':'welcome');this.settle();
    if(this.state.locationId!==workplace)this.travel(workplace);
  }
  travel(id) {
    this.call('travelPlan','cautious',s=>engine.updateTravelPlan(s,{pace:'cautious',supplies:true,scout:true,escort:true,night:false}));
    this.call('travel',id,s=>engine.travelTo(s,id));
    for(let n=0;(this.state.timeline.journey || this.state.event || this.state.timeline.yearTarget!==null)&&n<150;n++) {
      if(this.state.event)this.settle();
      else if(this.state.timeline.yearTarget!==null)this.call('age','continueAgeUp',s=>engine.continueAgeUp(s));
      else this.call('travel','continueJourney',s=>engine.continueJourney(s));
    }
    assert.equal(this.state.locationId,id);
  }
  summary() {
    const s=this.state,r=s.careers.records[this.profile.profession];
    return {profile:this.profile,completed:s.phase==='retired',terminalAge:s.age,terminalDay:s.day,terminalReason:s.lineage.heroDeath?.cause || 'voluntary retirement',gold:s.hero.gold,calling:s.hero.path,specialization:s.hero.specialization,skills:s.hero.skills,career:r,shop:s.careers.shop,masterworks:s.careers.masterworks,publicWorks:s.careers.publicWorks || [],householdBudget:s.householdBudget || null,children:s.life.children,partner:s.life.partnerId,happiness:s.life.happiness,health:s.life.health,stress:s.life.stress,mentalConditions:s.health.mental,physicalConditions:s.health.physical,factions:s.factions,world:s.world.name,mapNodes:s.world.locations.length,checks:this.checks,actions:this.entries.length,events:this.entries.filter(e=>e.operation==='choice').length,professionalStories:this.entries.filter(e=>e.event==='career_year').map(e=>({age:e.from.age,body:e.eventBody,choice:e.id})),unclassified:this.unclassified,entries:this.entries,finalSave:s};
  }
}

for(const profile of profiles) {
  if(all.some(life=>life.profile.seed===profile.seed && life.completed))continue;
  const j=new Journey(profile);j.settle();
  if(j.has('family_shelter')){j.act('family_shelter');j.settle();}
  j.grow(6);j.act('school_enroll_community');j.settle();
  for(let lesson=0;lesson<6;lesson++){j.act('school_attend');j.settle();}
  j.grow(10);j.act('school_exam');j.settle();j.grow(16);
  j.act(`career_choose_${getProfession(profile.profession).id}`);j.settle();
  const skillBefore=j.state.hero.skills[getProfession(profile.profession).skill];
  j.act('career_batch_month');j.finishBatch();
  const monthSkillGain=j.state.hero.skills[getProfession(profile.profession).skill]-skillBefore;
  j.grow(18);j.act('career_open_shop');j.settle();j.act('career_hire');j.settle();
  for(let lesson=0;lesson<3;lesson++){j.act('career_batch_month');j.finishBatch();j.act('career_mentor');j.settle();}
  j.act('career_shop_operate');j.settle();
  for(let commission=0;commission<5;commission++)j.commission(commission);
  j.materials({wood:8,stone:4,ore:3});j.act('career_shop_upgrade');j.settle();
  if(profile.family)j.family();
  if(profile.explore){j.travel('city');j.travel('coast');j.travel('brook');j.travel(profile.birthplace==='sanctuary'?'sanctuary':'home');}
  while(j.state.age<30 && j.state.phase!=='retired'){j.act('career_batch_year');j.finishBatch();}
  const child=j.state.life.children[0];
  if(child?.age>=6){
    const workplace=j.state.locationId;
    if(!j.has(`lineage_school_${child.id}`))j.travel('home');
    j.act(`lineage_nurture_${child.id}`);j.settle();j.act(`lineage_school_${child.id}`);j.settle();
    for(let lesson=0;lesson<6;lesson++){if(lesson){j.act('career_batch_month');j.finishBatch();}j.act(`lineage_lesson_${child.id}`);j.settle();}
    if(j.state.locationId!==workplace)j.travel(workplace);
  }
  j.materials(masterworkMaterials(j.state));j.act('career_masterwork');j.finishBatch();
  if(edition==='improved' && profile.ethics!=='profit') {
    const requirements=Object.fromEntries(Object.entries(masterworkMaterials(j.state)).map(([id,n])=>[id,Math.max(1,Math.ceil(n/2))]));
    j.materials(requirements);j.act('career_public_work');j.settle();
  }
  while(j.state.age<profile.retirement && j.state.phase!=='retired') {
    j.act('career_batch_year');j.finishBatch();
    if(j.state.phase==='retired')break;
    if(profile.ethics!=='profit'){j.act('health_clinic');j.settle();j.act('health_support');j.settle();}
    if(j.state.life.partnerId){const id=`life_visit_${j.state.life.partnerId}`;if(j.has(id)){j.act(id);j.settle();}}
    const mentor=j.has('career_mentor');if(mentor){j.act(mentor.id);j.settle();}
    if(j.has('career_shop_operate')){j.act('career_shop_operate');j.settle();}
  }
  if(j.state.phase!=='retired'){j.act('retire');j.settle();}
  const summary=j.summary();summary.firstMonthRelevantSkillGain=monthSkillGain;
  all.push(summary);
  console.log(`${edition}: ${profile.profession} completed at age ${summary.terminalAge}; ${summary.actions} real calls; ${summary.gold} gold; ${summary.events} decisions`);
  await mkdir(new URL('../docs/playtest/',import.meta.url),{recursive:true});
  await mkdir(new URL('../artifacts/playtest/',import.meta.url),{recursive:true});
  await writeFile(new URL(`../artifacts/playtest/career-${getProfession(profile.profession).id}-${edition}.json`,import.meta.url),JSON.stringify(summary,null,2));
  await writeFile(output,JSON.stringify({edition,version:edition==='baseline'?'v0.6 baseline':'v0.7 integrated replay',method:'Only createBirthGame and public engine APIs; original saves validated after every operation. Profiles begin at age 0 and end in genuine retirement or death. Replayed identities are not counted as additional distinct baseline lives.',completed:all.filter(l=>l.completed).length,lives:all.map(({entries,finalSave,...life})=>life)},null,2));
}
assert.equal(all.filter(l=>l.completed).length,8);
