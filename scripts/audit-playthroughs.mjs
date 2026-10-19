// Reproducible, public-engine journeys. No stats, clocks, rewards or saves are patched.
// Run: node scripts/audit-playthroughs.mjs [count=120] [output=docs/audit-v13.json] [startIndex=0] [priority]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { BIRTHPLACES, seededRoll, isSettlement } from '../dist/js/world.js';
import { PROFESSION_CATALOG } from '../dist/js/careers.js';
import { getContacts } from '../dist/js/conversations.js';
import { portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { generateCharacter } from '../dist/js/characters.js';
import { getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { travelPlanPreview } from '../dist/js/travel.js';

const total=Number(process.argv[2] || 120), output=process.argv[3] || 'docs/audit-v13.json', startIndex=Number(process.argv[4] || 0);
const variedPriority=process.argv[5]==='priority';
const ancestries=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const temperaments=['compassionate','ambitious','curious','cautious','rebellious'];
const reports=[], started=new Date().toISOString();
const count=(o,k)=>{o[k]=(o[k]||0)+1;};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const coverage={operations:{},events:{},choices:{},conversationNodes:{},travelTypes:{},journeyOutcomes:{},locations:{},professions:{},portraitStages:{},schoolRoutes:{},battleOutcomes:{}};
let transitions=0, reloads=0, portraitChecks=0, immutableChecks=0;

function run(index) {
  const seed=`hearth-v13-audit-${String(index+1).padStart(3,'0')}`;
  const pronouns=['they/them','she/her','he/him'][index%3], ancestry=ancestries[index%8];
  const generated=generateCharacter(seed,'player',{ancestry,pronouns,age:27});
  const config={seed,name:`Wayfarer ${index+1}`,pronouns,appearance:generated.appearance,
    birthplace:BIRTHPLACES[index%12].id,household:['poor','tradesfolk','noble'][Math.floor(index/3)%3],
    familySetup:['two_parents','single_parent','orphan','homeless'][Math.floor(index/8)%4],
    temperament:temperaments[index%5],difficulty:['gentle','balanced','perilous'][Math.floor(index/4)%3]};
  const job=PROFESSION_CATALOG[index%PROFESSION_CATALOG.length];
  const goalAge=variedPriority?35:35+(index%6)*10;
  const focus=variedPriority?['livelihood','education','relationships','adventure','rest'][index%5]:'livelihood';
  const lifestyle=variedPriority?['frugal','comfortable','generous'][Math.floor(index/5)%3]:'frugal';
  const r={index:index+1,seed,config,job:job.name,goalAge,focus,lifestyle,status:'running',steps:0,reloads:0,visits:[],choices:[],notes:[],children:0};
  let s=engine.createBirthGame(config);
  let lastCheckDay=-1;
  const people=new Map();
  function checkPeople() {
    const all=[{...s.hero,age:s.age,id:'hero'},...getContacts(s)];
    for(const person of all){
      if(!person.appearance)continue;
      const p=portraitLayers(person),saved=JSON.stringify(person.appearance);
      const key=person.id==='hero'?`hero-${s.dynasty.generation}`:`${person.id}:${person.name}`;
      if(people.has(key))assert.equal(saved,people.get(key),`${key} must keep its chosen likeness while aging`);
      else people.set(key,saved);
      if(person.age<18){
        assert.equal(p.beard,null,'young people must never render adult beards');
        assert.ok(['infants','children','adolescents'].includes(p.baseAtlas),'young ancestry uses an illustrated age plate');
      }
      if(person.age<3){assert.equal(p.cover,null);assert.equal(p.mask,null);assert.equal(p.hair,null);}
      assert.equal(renderAvatar(person),renderAvatar(JSON.parse(JSON.stringify(person))),'portrait survives JSON reload');
      count(coverage.portraitStages,p.baseAtlas);portraitChecks++;
    }
  }
  function step(label,fn,{reload=false}={}) {
    assert.ok(++r.steps<6500,'bounded journey cannot silently loop');
    const before=JSON.stringify(s), oldDay=s.day;
    const next=fn(s);
    assert.equal(JSON.stringify(s),before,`${label} mutated the previous save`);immutableChecks++;
    assert.notEqual(next,s,`${label} returns a new save`);
    assert.equal(engine.validateSave(next),true,`${label} returned an invalid save at age ${next.age}: ${next.event?.id || next.notice}`);
    assert.ok(next.day>=oldDay,'world time cannot reverse');
    assert.ok(next.hero.gold>=0,'currency cannot go negative');
    assert.ok(next.hero.hp>=0 && next.hero.hp<=next.hero.maxHp,'bounded bodily health');
    const reloaded=JSON.parse(JSON.stringify(next));
    assert.equal(engine.validateSave(reloaded),true,`${label} cannot be exported`);
    if(reload || r.steps%11===0){
      const restored=engine.migrateSave(reloaded);
      assert.deepEqual(JSON.parse(JSON.stringify(restored)),reloaded,'reload must not reroll a pending decision or portrait');
      s=restored;reloads++;r.reloads++;
    } else s=next;
    transitions++;count(coverage.operations,label);count(coverage.locations,s.locationId);
    count(coverage.professions,s.hero.profession);
    if(s.day!==lastCheckDay && (s.day%365===0 || label.startsWith('event:') || reload)){
      checkPeople();lastCheckDay=s.day;
    }
    return s;
  }
  function act(id,required=false) {
    const a=engine.getActions(s).find(a=>a.id===id&&!a.disabledReason);
    if(!a){if(required)throw new Error(`Missing advertised action ${id} at age ${s.age}: ${s.notice}`);return false;}
    step(`action:${id}`,v=>engine.chooseAction(v,id));return true;
  }
  function pick(id) {
    assert.ok(s.event?.choices.some(c=>c.id===id),`an offered ${id} choice is required`);
    const eventId=s.event.id;
    r.choices.push(`${s.age}:${eventId}:${id}`);
    count(coverage.events,eventId);count(coverage.choices,`${eventId}:${id}`);
    if(eventId.startsWith('travel_'))count(coverage.travelTypes,eventId.slice(7));
    step(`event:${eventId}:${id}`,v=>engine.chooseEventOption(v,id),{reload:true});
  }
  function battle() {
    let b=s.battle;
    for(let turn=0;!b.outcome&&turn<240;turn++){
      const choices=getBattleActions(b).filter(a=>!a.disabledReason);
      const actor=b.actors.find(a=>a.id===b.currentActorId);
      const low=b.actors.find(a=>a.side==='party'&&a.hp>0&&a.hp<a.maxHp*.45);
      const action=low?choices.find(a=>a.id==='potion'):null;
      const selected=action || choices.find(a=>a.id===(index%8===0?'retreat':'skill')) || choices.find(a=>a.id==='attack') || choices.find(a=>a.id==='retreat');
      assert.ok(selected,'battle exposes an available action');
      const target=selected.needsTarget?(selected.targetSide==='party'?(low||actor||b.actors.find(a=>a.side==='party'&&a.hp>0)):b.actors.find(a=>a.side==='enemy'&&a.hp>0&&(!selected.targetIds||selected.targetIds.includes(a.id)))):null;
      const input=b, prior=JSON.stringify(input);b=takeBattleAction(input,selected.id,target?.id);
      assert.equal(JSON.stringify(input),prior,'battle command preserves the previous turn');
      assert.notEqual(JSON.stringify(b),prior,'battle turn must progress');
    }
    assert.ok(b.outcome,'battle ends within its turn limit');count(coverage.battleOutcomes,b.outcome);
    step(`battle:${b.outcome}`,v=>engine.resolveBattle(v,b),{reload:true});
  }
  function settle() {
    const seen=new Map();
    for(let n=0;n<180;n++){
      if(s.phase==='retired')return;
      if(s.battle){battle();continue;}
      if(s.event){
        const id=s.event.id, hits=seen.get(id)||0;seen.set(id,hits+1);
        assert.ok(hits<9,`decision ${id} repeatedly made no progress: ${s.notice}`);
        const offered=s.event.choices.filter(c=>!c.disabledReason);
        assert.ok(offered.length,`${id} has no available exit`);
        let preferred;
        if(id.startsWith('birth_') || id.startsWith('fate_'))preferred=['care','curiosity','courage'][(index+s.age)%3];
        else if(id==='plague_letter')preferred='later';
        else if(id==='deadline_review')preferred='pause';
        else if(id==='health_concern')preferred='support';
        else if(id==='lineage_bereavement')preferred=['share','private','memorial'][index%3];
        else if(id==='life_budget')preferred='simplify';
        else if(id==='career_staff')preferred='decline';
        else if(id==='society_customer')preferred='decline';
        else if(id==='society_staff')preferred='boundary';
        else if(id==='society_neighbor')preferred='welcome';
        else if(id==='retirement')preferred='settle';
        // Road personalities test aid, curiosity, boundaries and darker routes.
        else if(id.startsWith('travel_')){
          const type=id.slice(7);
          preferred=index%4===0?({messenger:'extort',grave_robber:'join',relic:'pocket',bandits:'fight',beasts:'fight',weather:'press',wagon:'labor'}[type]):index%4===1?({messenger:'aid',wagon:'aid',sick_traveler:'herb',pilgrims:'offering',relic:'donate',bandits:'avoid',beasts:'avoid',weather:'shelter'}[type]):index%4===2?({messenger:'ask',pilgrims:'pray',fortune:'reading',lore:'record',grave_robber:'study',relic:'rest',bandits:'avoid',beasts:'avoid',weather:'shelter'}[type]):null;
          if(!preferred || hits>0)preferred=offered.some(c=>c.id==='continue')?'continue':offered.some(c=>c.id==='avoid')?'avoid':null;
        }
        const selected=offered.find(c=>c.id===preferred) || offered[(seededRoll(seed,`${id}:${s.age}:${n}`,offered.length)+hits)%offered.length];
        pick(selected.id);continue;
      }
      if(s.conversations?.pending){
        const p=s.conversations.pending;
        count(coverage.conversationNodes,p.nodeId);
        const id=p.replies[(index+s.age)%p.replies.length].id;
        step(`reply:${p.nodeId}:${id}`,v=>engine.replyMessage(v,p.personId,id),{reload:true});continue;
      }
      if(s.travel?.pending?.remainingDays){
        if(act('travel_continue_response'))continue;
      }
      if(s.timeline.journey){step('journey:continue',engine.continueJourney);continue;}
      if(s.careers.batch){if(act('career_batch_continue'))continue;throw new Error('Saved work has no continue action');}
      if(s.timeline.yearTarget!==null){step('age:continue',engine.continueAgeUp);continue;}
      return;
    }
    throw new Error(`Interruption cannot settle at age ${s.age}: ${s.event?.id || s.notice}`);
  }
  function doAct(id){const result=act(id);if(result)settle();return result;}
  function recover(){
    for(let care=0;care<7 && s.phase!=='retired' && (s.life.health<60 || s.life.stress>65);care++){
      if(!doAct('life_rest'))break;
    }
  }
  function commission(){
    const offer=engine.getActions(s).find(a=>a.id.startsWith('career_accept_')&&!a.disabledReason);
    if(!offer)return;
    doAct(offer.id);
    const active=s.careers.active;
    if(!active)return;
    for(const [material,amount] of Object.entries(active.materials)){
      for(let purchase=0;purchase<8 && s.equipment.materials[material]<amount+2;purchase++){
        if(!doAct(`career_buy_${material}`))break;
      }
    }
    const order=index%4===0?['rush','standard','fine']:['fine','standard','rush'];
    let made=false;
    for(const method of order){if(doAct(`career_make_${method}`)){made=true;break;}}
    if(made && act('career_invoice')){
      const selected=index%4===0?'conceal':index%4===1?'community':'honest';
      if(s.event?.choices.some(c=>c.id===selected))pick(selected);settle();
    } else doAct('career_abandon');
  }
  function trip(id) {
    if(s.phase==='retired'||s.locationId===id)return;
    const preview=travelPlanPreview(s,id);
    if(preview.disabledReason || preview.cost>s.hero.gold)return;
    const start=s.locationId;step(`journey:depart:${id}`,v=>engine.travelTo(v,id),{reload:true});settle();
    const outcome=s.phase==='retired'?'life-ended':s.locationId===id?'arrived':'turned-back';
    if(outcome==='turned-back')assert.ok(s.travel.history.some(h=>['returned','abandoned'].includes(h.result)),'only a chosen return can end a trip before arrival');
    count(coverage.journeyOutcomes,outcome);r.visits.push(`${start}>${id}:${outcome}@${s.locationId}`);
  }
  function conversation(){
    const choices=engine.getActions(s).filter(a=>a.id.startsWith('talk_')&&!a.disabledReason);
    if(choices.length)doAct(choices[(index+s.age)%choices.length].id);
  }
  function household(){
    if(s.age<20||s.age>45||!isSettlement(s.world,s.locationId))return;
    if(s.life.home.tier==='lodgings')doAct('life_home_cottage');
    if(index%3 && !s.life.partnerId && s.age===21){
      const person=s.life.people.find(p=>p.role!=='relative'&&!p.familyRole&&p.age>=18&&p.alive!==false);
      if(person){
        for(let n=0;n<8&&(s.life.people.find(p=>p.id===person.id)?.bond||0)<55;n++){
          if(!doAct(`life_visit_${person.id}`))break;
        }
        if(act(`life_court_${person.id}`)){if(s.event?.choices.some(c=>c.id==='yes'))pick('yes');settle();}
        for(let n=0;n<5&&(s.life.people.find(p=>p.id===person.id)?.bond||0)<70;n++)doAct(`life_visit_${person.id}`);
        if(act(`life_commit_${person.id}`)){if(s.event?.choices.some(c=>c.id==='pledge'))pick('pledge');settle();}
        if(index%2===0 && act('lineage_marry')){if(s.event?.choices.some(c=>c.id==='vow'))pick('vow');settle();}
      }
    }
    if([23,28].includes(s.age)&&s.life.children.length<(index%4===0?2:1)){
      if(act('life_family')){
        const id=s.life.partnerId && index%2===0 && s.event?.choices.some(c=>c.id==='welcome')?'welcome':'adopt';
        if(s.event?.choices.some(c=>c.id===id))pick(id);settle();
      }
    }
    for(const child of s.life.children.filter(c=>c.alive!==false)){
      doAct(`lineage_nurture_${child.id}`);
      const record=s.lineage.people.find(p=>p.source==='child'&&p.localId===child.id);
      if(child.age>=6 && child.age<18 && !record?.development?.education?.route && act(`lineage_school_${child.id}`)){
        if(s.event?.choices.some(c=>c.id==='public'))pick('public');settle();
      }
      doAct(`lineage_lesson_${child.id}`);
    }
  }
  try {
    assert.equal(engine.validateSave(s),true);checkPeople();settle();
    doAct('family_shelter');
    const visitedAges=new Set();
    while(s.age<goalAge && s.phase!=='retired'){
      settle();if(s.phase==='retired')break;
      if(!visitedAges.has(s.age)){
        visitedAges.add(s.age);
        if(s.age>=3 && s.age<18){
          const skills=['grow_play','grow_read','grow_weapons','grow_arcana','grow_devotion','grow_stealth','grow_survival'];
          doAct(skills[(index+s.age)%skills.length]);conversation();
        }
        if([6,12,14].includes(s.age)){
          const route=['community','shrine','academy','apprenticeship',null][index%5];
          if(route && (doAct(`school_enroll_${route}`)||doAct('school_enroll_community')))count(coverage.schoolRoutes,s.education.route);
        }
        if(s.age>=6&&s.age<18&&s.education.enrolled){
          for(let lesson=0;lesson<2+(index%3);lesson++)doAct('school_attend');
          if(s.age===10||s.age===17)doAct('school_exam');
        }
        if(s.age===16 && job.id!=='unemployed')doAct(`career_choose_${job.id}`);
        if(s.age>=18){
          if(s.hero.profession!==job.name && s.age===18)doAct(`career_choose_${job.id}`);
          if(s.age===18 && variedPriority){
            if(s.life.focus!==focus){act(`budget_focus_${focus}`,true);settle();}
            if(s.life.lifestyle!==lifestyle){act(`budget_lifestyle_${lifestyle}`,true);settle();}
            assert.equal(s.life.focus,focus);assert.equal(s.life.lifestyle,lifestyle);
          }
          recover();
          conversation();household();
          if(s.age%5===0){doAct('career_batch_month');doAct('life_promotion');if(index%3===0)doAct('career_open_shop');if(s.careers.shop)doAct('career_shop_operate');}
          if(s.age===19)doAct(['life_goal_settle','life_goal_mastery','life_goal_community','life_goal_household'][index%4]);
          if(s.age===22 || s.age===32)commission();
        }
        if([14,19,24,29,34,44,54].includes(s.age)){
          const destination=['city','brook','coast','camp','tower','sanctuary','gate'][(index+Math.floor(s.age/5))%7];
          step('journey:prepare',v=>engine.updateTravelPlan(v,{pace:['steady','cautious','fast'][index%3],supplies:index%3===1&&s.hero.gold>30,scout:index%3===1&&s.hero.gold>30,escort:index%6===1&&s.hero.gold>50}));
          trip(destination);trip('home');
        }
      }
      const oldAge=s.age;
      step('age:begin',engine.ageUp);settle();
      assert.ok(s.phase==='retired'||s.age>oldAge,`a year cannot get stuck at age ${oldAge}`);
    }
    settle();
    if(s.phase!=='retired'){act('retire',true);pick('settle');settle();}
    assert.equal(s.phase,'retired');assert.ok(s.chronicle?.length>40,'finished life leaves its real chronicle');
    r.status='passed';r.ending=s.hero.alive===false?'death':'retirement';r.endAge=s.age;r.endDay=s.day;
    r.children=s.life.children.length;r.schools=s.education.qualifications.length;r.profession=s.hero.profession;
    r.gold=s.hero.gold;r.lifeHash=hash({config,choices:r.choices,visits:r.visits,endDay:r.endDay,chronicle:s.chronicle});
    r.decisionTraceHash=hash({choices:r.choices,visits:r.visits});
    r.chronicle=s.chronicle;r.topologyHash=hash(s.world.roads);r.region=s.world.region?.name || s.world.profile?.name;
    // Twelve parent journeys also exercise the actual handoff into an existing child.
    if(index%10===0 && s.life.children.some(c=>c.alive!==false)){
      const child=s.life.children.find(c=>c.alive!==false), born=child.bornDay, expected=child.age;
      const record=s.lineage.people.find(p=>p.source==='child'&&p.localId===child.id),appearance=structuredClone(record.appearance);
      step('dynasty:continue',v=>engine.continueAsChild(v,child.id),{reload:true});
      assert.equal(s.age,expected);assert.equal(s.timeline.birthDay,born);assert.deepEqual(s.hero.appearance,appearance);
      if(record.pronouns)assert.equal(s.hero.pronouns,record.pronouns);
      const priorAge=s.age;settle();step('heir:age',engine.ageUp);settle();assert.equal(s.age,priorAge+1);
      r.heir={age:s.age,bornDay:born,appearancePreserved:true};
    }
  } catch(error){r.status='failed';r.error=String(error.stack);r.endAge=s.age;r.endDay=s.day;r.pending=s.event?.id || s.battle?.encounterId || s.notice;}
  return r;
}

function save(){
  const summary={requested:total,completed:reports.length,passed:reports.filter(r=>r.status==='passed').length,failed:reports.filter(r=>r.status==='failed').length,
    uniqueSeeds:new Set(reports.map(r=>r.seed)).size,uniqueFinishedLives:new Set(reports.filter(r=>r.status==='passed').map(r=>r.lifeHash)).size,
    uniqueDecisionTraces:new Set(reports.filter(r=>r.status==='passed').map(r=>r.decisionTraceHash)).size,
    transitions,reloads,portraitChecks,immutableChecks,heirs:reports.filter(r=>r.heir).length,
    retirement:reports.filter(r=>r.ending==='retirement').length,deaths:reports.filter(r=>r.ending==='death').length};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({edition:'0.13.0',started,finished:new Date().toISOString(),method:'Public JavaScript game-engine actions; real birth-to-retirement/death journeys, not manual browser sessions. No direct save edits or stat grants.',summary,coverage,reports},null,2)+'\n');
  return summary;
}
for(let index=startIndex;index<startIndex+total;index++){
  const r=run(index);reports.push(r);
  console.log(`Journey ${r.index}/${startIndex+total}: ${r.status}, age ${r.endAge}, ${r.children} children, ${r.steps} actions.`);
  if(r.status==='failed')console.log(`FAIL ${r.index} age ${r.endAge}: ${r.pending}\n${r.error}`);
  if(reports.length%10===0 || reports.length===total)console.log(JSON.stringify(save()));
}
const summary=save();
assert.equal(summary.failed,0,'audit failures must be investigated');
assert.equal(summary.uniqueFinishedLives,total,'each finished journey has its own seed, choices and chronicle');
