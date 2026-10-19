import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LifeRun, engine, ordinaryChoice } from './playtest-utils.mjs';
import { getBattleActions } from '../dist/js/combat.js';
import { travelPlanPreview } from '../dist/js/travel.js';
import { BUILDING_CATALOG } from '../dist/js/workshop.js';

const suffix = process.argv.includes('--replay') ? '-replay' : '';
const plans = [
  { id:'adventure-guardian',name:'Avel',seed:'thirty-lives-road-warden',birthplace:'camp',household:'poor',familySetup:'two-parents',calling:'guardian',theme:'care',route:'warden' },
  { id:'adventure-berserker',name:'Brann',seed:'thirty-lives-humbled-fury',birthplace:'mountain',household:'tradesfolk',familySetup:'single-parent',calling:'berserker',theme:'courage',route:'humbled' },
  { id:'adventure-knight',name:'Cerys',seed:'thirty-lives-elder-watch',birthplace:'citadel',household:'noble',familySetup:'two-parents',calling:'knight',theme:'care',route:'elder' },
  { id:'adventure-elementalist',name:'Dara',seed:'thirty-lives-storm-archaeologist',birthplace:'tower',household:'poor',familySetup:'orphan',calling:'elementalist',theme:'curiosity',route:'dungeons' },
  { id:'adventure-necromancer',name:'Eiren',seed:'thirty-lives-willing-dead',birthplace:'sanctuary',household:'tradesfolk',familySetup:'single-parent',calling:'necromancer',theme:'curiosity',route:'consent-vampire' },
  { id:'adventure-thief',name:'Fenn',seed:'thirty-lives-a-thief-with-boundaries',birthplace:'gate',household:'poor',familySetup:'homeless',calling:'thief',theme:'courage',route:'thief' },
  { id:'adventure-ranger',name:'Galen',seed:'thirty-lives-moon-refuge',birthplace:'forest',household:'poor',familySetup:'two-parents',calling:'ranger',theme:'care',route:'moon-refuge' },
  { id:'adventure-assassin',name:'Hedra',seed:'thirty-lives-the-price-of-instinct',birthplace:'marsh',household:'tradesfolk',familySetup:'orphan',calling:'assassin',theme:'courage',route:'reckless-moon' },
];

function policyFor(plan) {
  return (event,state,run) => {
    const has = id=>event.choices.some(c=>c.id===id);
    if(event.id==='health_concern') return has('rest')?'rest':'support';
    if(event.id==='lycan_fullmoon') return plan.route==='reckless-moon'&&has('roam')?'roam':has('safe')?'safe':has('resist')&&state.hero.condition.control>=65?'resist':'isolate';
    if(event.id==='life_hunger') return state.hero.gold>=8&&has('donor')?'donor':'animal';
    if(event.id==='vampire_feeding') return state.hero.gold>=8?'donor':'animal';
    if(/^birth_/.test(event.id)) return has(plan.theme)?plan.theme:ordinaryChoice(event);
    if(event.id==='lycan_confidant')return event.choices.find(c=>c.id.startsWith('person_')).id;
    if(event.id.startsWith('conversation_')&&has('confide'))return 'confide';
    if(event.id==='calling_initiation' && has('service') && ['warden','elder'].includes(plan.route))return 'service';
    if(event.id==='calling_initiation' && has('independent') && ['humbled','dungeons'].includes(plan.route))return 'independent';
    const explicit={retirement:'settle',calling_initiation:'accept',vampire_offer:'accept',lycan_offer:'accept',orrin_request:'honest',travel_bandits:plan.route==='warden'?'fight':'avoid',travel_beasts:plan.route==='warden'?'fight':'avoid',travel_weather:'shelter',travel_caravan:'share',travel_witness:'listen',travel_sick_traveler:'aid',travel_lore:'record',travel_delay:'continue',family_visit:'time',lineage_bereavement:'share',career_year:'care',life_birthday:'people',annual_deadline_review:'continue',plague_letter:'later',quest_decline:'pause'};
    if(explicit[event.id]&&has(explicit[event.id]))return explicit[event.id];
    const ordinary=ordinaryChoice(event); if(ordinary)return ordinary;
    // Deliberate incidental policy: choose the offered response whose language
    // best matches this person's values; record the entire scene and decision.
    const words=plan.theme==='care'?/help|care|honest|support|listen|fair|share|consent|protect|community/gi:plan.theme==='curiosity'?/study|learn|ask|research|record|question|evidence|understand|teach/gi:/try|risk|challenge|fight|free|alone|daring|own|explore/gi;
    return [...event.choices].map((c,i)=>({id:c.id,score:(`${c.label} ${c.description}`.match(words)||[]).length,i})).sort((a,b)=>b.score-a.score||a.i-b.i)[0].id;
  };
}

function act(run,id) {
  run.settle();
  const offered=engine.getActions(run.state).find(a=>a.id===id);
  if(offered?.disabledReason?.includes('birthday'))run.grow(run.state.age+1);
  run.act(id).settle();
  for(let i=0;run.state.workshop?.project&&i<40;i++)run.act('workshop_continue').settle();
  assert.equal(run.state.workshop.project,null,'a project actually completes');
  return run;
}
function earn(run,amount) { for(let i=0;run.state.hero.gold<amount&&i<80;i++){run.move('city');act(run,'work');}assert.ok(run.state.hero.gold>=amount); }
function equip(run,id){return run.step(`equip:${id}`,s=>engine.equipGear(s,id));}
function calling(run,id){
  const location=run.state.progression.mentors[id].locationId;
  run.move(location);act(run,`calling_meet_${id}`);
  for(let i=0;run.available(`calling_train_${id}`)&&i<35;i++)act(run,`calling_train_${id}`);
  act(run,`calling_seek_${id}`);assert.equal(run.state.hero.specialization,id);
  if(run.available(`calling_service_${id}`))act(run,`calling_service_${id}`);
  return run;
}
function planRoad(run,values){return run.step('plan-road',s=>engine.updateTravelPlan(s,values),{plan:values});}
function recruit(run){run.move('city');for(const id of ['mira','orrin','kest'])run.step(`recruit:${id}`,s=>engine.recruitCompanion(s,id));assert.equal(run.state.companions.filter(c=>c.recruited).length,3);}
function battleAct(run,id,mode='win',chooser){run.settle().act(id);assert.ok(run.state.battle);run.fight(mode,chooser).settle();}
function craftBuilding(run,id){
  const building=BUILDING_CATALOG.find(b=>b.id===id);
  earn(run,building.cost+50);run.move('city');
  for(const [material,count]of Object.entries(building.materials))for(let i=0;run.state.equipment.materials[material]<count&&i<20;i++)act(run,`career_buy_${material}`);
  if(run.state.workshop.crafting<building.skill)act(run,'workshop_practice');
  act(run,`workshop_build_${id}`);assert.ok(run.state.workshop.structures.some(s=>s.type===id&&s.condition==='sound'));
}
function questConversation(run,id,pick){run.move(run.state.campaign.quests.find(q=>q.id===id)?.locationId||'home');act(run,`quest_begin_${id}`);if(run.state.event)run.choose(pick).settle();}
function crawl(run,id,route,combat=true){
  const site={cistern:'marsh',buried_archive:'ruin',root_caverns:'forest',watchtower:'tower',covenant_core:'citadel'}[id];
  run.move(site);run.settle();run.act(`explore_enter_${id}`);
  for(const room of route){
    assert.ok(run.state.event?.choices.some(c=>c.id===`route_${room}`),`${id} opens ${room}`);
    run.choose(`route_${room}`);
    if(run.state.event.choices.some(c=>c.id==='listen'))run.choose('listen');
    const event=run.state.event;
    if(event.choices.some(c=>c.id==='take'))run.choose('take');
    else if(event.choices.some(c=>c.id==='finish'))run.choose('finish');
    else if(event.choices.some(c=>c.id==='search'))run.choose('search');
    else if(event.choices.some(c=>c.id==='parley')&&!combat)run.choose('parley');
    else if(event.choices.some(c=>c.id==='fight'))run.choose('fight').fight();
  }
  run.choose('leave').settle();assert.ok(run.state.flags.dungeonRecords[id].complete);
}

function life(plan){
  const run=new LifeRun(plan.id+suffix,{name:plan.name,seed:plan.seed,birthplace:plan.birthplace,household:plan.household,familySetup:plan.familySetup,difficulty:'balanced'},policyFor(plan));
  run.settle().grow(18);
  if(plan.route==='humbled'){
    run.move('forest');battleAct(run,'forest_expedition','defeat');act(run,'camp_rest');battleAct(run,'forest_expedition','retreat');
    run.findings.push('Defeat and retreat are survivable and preserve childhood and civilian identity; repeated defending can deliberately lose a real encounter.');
  }
  calling(run,plan.calling);
  if(plan.route==='warden'){
    recruit(run);earn(run,130);act(run,'gear_buy_chain_mail');equip(run,'chain_mail');
    planRoad(run,{pace:'cautious',supplies:true,scout:true,escort:true});
    const quote=travelPlanPreview(run.state,'forest');run.log.push({operation:'review-real-road-quote',quote});
    run.move('forest');battleAct(run,'forest_expedition');run.move('ruin');battleAct(run,'ruin_expedition');run.move('tower');crawl(run,'watchtower',['cells','cache','captain','signal'],false);
    planRoad(run,{pace:'fast',supplies:false,scout:false,escort:false});
    const patrol=['marsh','forest','city','mountain','ruin','brook','tower','camp'];
    for(let i=0;i<40;i++){
      run.move(patrol[i%patrol.length]);
      const fought=new Set(run.log.filter(l=>l.outcome).map(l=>l.operation));
      if([...fought].some(id=>id.includes('road_bandits'))&&[...fought].some(id=>id.includes('road_beasts')))break;
      if(run.state.hero.hp<run.state.hero.maxHp*.65)act(run,'camp_rest');
    }
    assert.ok(run.log.some(l=>l.operation==='battle-result:road_bandits:victory'),'an actual seeded patrol resolves a road bandit encounter');
    assert.ok(run.log.some(l=>l.operation==='battle-result:road_beasts:victory'),'an actual seeded patrol resolves a road beast encounter');
    act(run,'health_routine');run.grow(45);
  }else if(plan.route==='humbled'){
    recruit(run);run.move('forest');battleAct(run,'forest_expedition');run.move('mountain');
    for(let i=0;i<8&&run.available('workshop_gather_ore');i++)act(run,'workshop_gather_ore');
    assert.ok(engine.getActions(run.state).find(a=>a.id==='workshop_gather_ore').disabledReason,'actual ore reserves become exhausted');
    if(run.available('gear_gather_ore')){
      act(run,'gear_gather_ore');
      run.findings.push('Observed: exhausted workshop stock can be bypassed through the simultaneously offered legacy unlimited ore action.');
    }else run.findings.push('After improvement, depleted stock cannot be bypassed through legacy equipment gathering.');
    run.grow(37);
  }else if(plan.route==='elder'){
    recruit(run);run.move('forest');battleAct(run,'forest_expedition');run.move('city');act(run,'health_clinic');
    run.grow(130);assert.equal(run.state.phase,'retired','advanced age eventually ends a mortal life');
    run.findings.push('An advanced-age life exercises actual mortality, grieving relatives and companion deaths.');
  }else if(plan.route==='dungeons'){
    recruit(run);earn(run,170);act(run,'gear_buy_ash_staff');equip(run,'ash_staff');act(run,'gear_buy_leather_armor');equip(run,'leather_armor');
    for(const [id,route]of [['cistern',['flooded','cache','keeper','source']],['buried_archive',['trap','vault','archivist','seal']],['root_caverns',['thorns','refuge','thornheart','spring']],['watchtower',['cliff','cache','captain','signal']],['covenant_core',['forge','library','warden','anchor']]]){
      run.move('city');act(run,'rest');crawl(run,id,route);
    }
    run.grow(35);run.findings.push('All five authored dungeons have persistent cleared rooms and one-time caches; the five layouts remain mostly fixed across seeds.');
  }else if(plan.route==='consent-vampire'){
    run.move('city');act(run,'vampire_invitation');assert.equal(run.state.hero.condition?.type,'vampire');
    act(run,'feed_vampire');act(run,'night_travel');planRoad(run,{pace:'steady',supplies:true,night:true});
    recruit(run);run.move('ruin');battleAct(run,'ruin_expedition','win',(battle,options)=>options.some(a=>a.id==='blood')?{id:'blood',target:battle.actors.find(a=>a.side==='enemy'&&a.hp>0).id}:null);
    run.move(run.state.hero.birthplaceId);act(run,'grow_family');act(run,'talk_kin');
    run.move('forest');act(run,'gather_herbs');act(run,'gather_herbs');run.move('city');earn(run,20);act(run,'seek_cure');assert.equal(run.state.hero.condition,null);
    assert.equal(run.state.hero.specialization,'necromancer');run.grow(32);
  }else if(plan.route==='thief'){
    run.move('city');for(let i=0;i<12;i++)act(run,'lift_purse');
    act(run,'vampire_invitation'); assert.equal(run.state.hero.condition?.type,'vampire');
    act(run,'night_travel'); calling(run,'paladin');
    run.act('feed_vampire').choose('predation').settle();
    assert.equal(run.state.flags.oathBroken,true,'an actual unwilling feeding breaks the visible protective oath');
    act(run,'fulfill_oath'); assert.equal(run.state.flags.oathBroken,false,'actual restorative service regains the oath');
    act(run,'calling_switch_thief');
    const charged=run.state.legal.evidence;assert.ok(charged>0,'repeated theft creates real witnessed evidence');
    run.move('brook');assert.equal(run.state.legal.evidence,0,'known evidence remains local');
    run.move('city');earn(run,charged*12);act(run,'settle_fine');assert.equal(run.state.legal.evidence,0);
    run.move('forest');battleAct(run,'forest_expedition','retreat');act(run,'camp_rest');
    for(let i=0;i<2;i++)act(run,'gather_herbs');run.move('city');earn(run,20);act(run,'seek_cure');
    assert.equal(run.state.hero.condition,null);run.grow(39);
    run.findings.push('Local evidence follows the actual location. The fine is real, but the law currently offers no arrest, restitution scene or criminal social network.');
  }else if(plan.route==='moon-refuge'){
    run.move('forest');act(run,'lycan_invitation');assert.equal(run.state.hero.condition?.type,'lycanthrope');
    act(run,'lycan_prepare');act(run,'lycan_control');
    run.move('city');act(run,'lycan_confide');
    craftBuilding(run,'shelter');craftBuilding(run,'refuge');craftBuilding(run,'garden');
    act(run,'workshop_prepare_refuge');run.grow(20);run.move('city');
    if(run.available('workshop_harvest'))act(run,'workshop_harvest');
    assert.ok(run.state.flags.herbs>=3);
    if(run.available('health_herbs')){run.move('forest');act(run,'gather_herbs');run.move('city');act(run,'health_herbs');}
    act(run,'lycan_cure');assert.equal(run.state.hero.condition,null);
    craftBuilding(run,'forge');earn(run,100);
    for(const [material,count]of Object.entries({wood:4,hide:2,cloth:1}))while(run.state.equipment.materials[material]<count)act(run,`career_buy_${material}`);
    act(run,'workshop_craft_hunting_bow');equip(run,'hunting_bow');run.move('forest');battleAct(run,'forest_expedition');run.grow(50);
  }else if(plan.route==='reckless-moon'){
    run.move('brook');act(run,'lycan_invitation');assert.equal(run.state.hero.condition?.type,'lycanthrope');
    run.move('city');run.grow(19);assert.ok(run.state.flags.lycanDiscovered,'reckless runs among neighbors are witnessed');
    act(run,'lycan_control');run.move('forest');
    battleAct(run,'forest_expedition','win',(battle,options)=>options.some(a=>a.id==='feral')?{id:'feral',target:battle.actors.find(a=>a.side==='enemy'&&a.hp>0).id}:options.some(a=>a.id==='steady')?{id:'steady'}:null);
    for(let i=0;i<3;i++)act(run,'gather_herbs');run.move('city');earn(run,25);act(run,'lycan_cure');assert.equal(run.state.hero.condition,null);
    run.grow(34);
  }
  run.retire();assert.equal(run.state.phase,'retired');
  const summary=run.save();console.log(JSON.stringify({id:run.id,age:run.state.age,operations:run.log.length,calling:run.state.hero.specialization,battles:summary.battleOutcomes.length,terminal:summary.terminal}));return summary;
}

const results=[];
const selected=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
for(const plan of plans.filter(p=>!selected||selected.split(',').includes(p.id)))results.push(life(plan));
mkdirSync('docs/playtest',{recursive:true});
writeFileSync(`docs/playtest/adventure${suffix}.json`,JSON.stringify({method:'Eight distinct age-zero public-API lives. No state, time, money, skill or battle-result grants; all battles use takeBattleAction before engine.resolveBattle.',results},null,2)+'\n');
