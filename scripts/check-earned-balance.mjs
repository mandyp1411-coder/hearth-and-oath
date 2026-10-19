// Finite paired regression evidence. Never interpret these policy cases as win rates.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => structuredClone(value);
const read = path => JSON.parse(path.endsWith('.gz') ? gunzipSync(readFileSync(path)).toString('utf8') : readFileSync(path, 'utf8'));
const readGzip = path => JSON.parse(gunzipSync(readFileSync(path)));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
export const fixtureDirectory = resolve('tests/fixtures/earned-balance');
export const matrix = read(join(fixtureDirectory, 'matrix.json'));
const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;

export function describeState(s) {
  return {
    seed:s.seed, difficulty:s.difficulty, day:s.day, age:s.age, locationId:s.locationId,
    hero:{calling:s.hero.specialization, path:s.hero.path, traits:s.hero.personality?.traits || [],
      level:s.hero.level, exp:s.hero.exp, hp:s.hero.hp, maxHp:s.hero.maxHp, mp:s.hero.mp, maxMp:s.hero.maxMp,
      gold:s.hero.gold, potions:s.hero.potions, attributes:copy(s.hero.attributes), skills:copy(s.hero.skills)},
    learnedCallings:copy(s.progression?.learnedClassIds || []), trainedTechniques:copy(s.rpg?.trainedTechniques || []),
    equipped:copy(s.equipment?.equipped || {}), ownedGear:copy(s.equipment?.owned || []),
    companions:(s.companions || []).filter(c => c.recruited).map(c => ({id:c.id, active:c.active, alive:c.alive,
      hp:c.hp,maxHp:c.maxHp,mp:c.mp,maxMp:c.maxMp,combatExperience:c.combatExperience || 0,
      status:s.rpg?.companionStages?.[c.id]?.status, techniques:s.rpg?.companionStages?.[c.id]?.trainedTechniques || []})),
    supplies:{rations:s.adventuring?.rations || 0, potions:s.hero.potions,
      kitNights:(s.trail?.kits || []).reduce((n,k) => n+k.remaining, 0), kits:copy(s.trail?.kits || [])},
    livingCosts:copy(s.householdBudget || null), maze:s.maze ? {id:s.maze.id,tier:s.maze.tier,steps:s.maze.steps,
      visited:s.maze.visited.length,cleared:s.maze.cleared.length,collected:s.maze.collected.length,objective:s.maze.objective} : null,
  };
}

export function validateRoot(root, index) {
  assert.equal(root.evidenceClass, 'action-earned-root');
  assert.equal(root.stateHash, hash(root.state), 'unchanged historical earned root');
  assert.equal(root.state.seed, matrix.rootSeeds[index]);
  assert.equal(root.source.config.seed, root.state.seed);
  assert.ok(root.source.commands.length > 0 && root.source.script && root.source.commit);
  return true;
}

export function validateEvidence(fixture, E, root) {
  if (root) {validateRoot(root, fixture.root);assert.equal(fixture.rootHash, root.stateHash, 'trace anchored to checked-in earned root');}
  assert.equal(fixture.evidenceClass, 'action-earned');
  assert.equal(hash(fixture.state), fixture.stateHash, `${fixture.id}: snapshot checksum`);
  assert.ok(E.validateSave(copy(fixture.state)), `${fixture.id}: valid save before combat`);
  assert.equal(fixture.state.seed, matrix.rootSeeds[fixture.root]);
  assert.equal(fixture.state.hero.specialization, fixture.calling);
  assert.ok(fixture.state.progression.learnedClassIds.includes(fixture.calling), 'calling actually learned');
  assert.ok(fixture.state.hero.hp > 0 && fixture.state.hero.hp <= fixture.state.hero.maxHp);
  assert.ok(fixture.state.hero.mp >= 0 && fixture.state.hero.mp <= fixture.state.hero.maxMp);
  assert.ok(!fixture.state.battle && !fixture.state.maze && !fixture.state.timeline.journey && !fixture.state.event);
  assert.ok(fixture.trace.length <= matrix.bounds.setupTransitionsPerForm, 'bounded earned setup');
  let previous = fixture.rootHash;
  for (const step of fixture.trace) {
    assert.equal(step.beforeHash, previous, `${fixture.id}: continuous public action trace`);
    assert.ok(['chooseAction','chooseEventOption','replyMessage','travelTo','continueJourney','ageUp','continueAgeUp',
      'equipGear','recruitCompanion','toggleCompanion','completeTrade','chooseBattleAction','resolveBattle'].includes(step.method));
    assert.ok(Number.isFinite(step.days) && step.days >= 0);
    previous = step.afterHash;
  }
  assert.equal(previous, fixture.stateHash, `${fixture.id}: trace ends at recorded state, no stat grant`);
  const owned = fixture.state.equipment.owned;
  for (const id of Object.values(fixture.state.equipment.equipped).filter(Boolean)) assert.ok(owned.includes(id), 'equipped gear owned');
  for (const c of fixture.state.companions.filter(c => c.active)) assert.ok(c.recruited && c.alive !== false);
  return true;
}


export function verifyFixtureTrace(fixture, root, E) {
  validateEvidence(fixture,E,root);let state=copy(root.state);
  for(const step of fixture.trace) {
    assert.equal(hash(state),step.beforeHash);const before=hash(state);
    const next=E[step.method](state,...step.args);
    assert.equal(hash(state),before,'setup replay input immutable');
    assert.equal(hash(next),step.afterHash,`${fixture.id}: ${step.method} historical setup drift or unearned edit`);
    state=next;
  }
  assert.equal(hash(state),fixture.stateHash,'earned state is exactly the public-action replay');
  return true;
}

export function validateCertificate(data, certificate) {
  assert.equal(certificate.fixtureSetHash,hash(data),'fixture content matches historical public-replay certificate');
  assert.equal(certificate.matrixHash,hash(matrix));
  assert.equal(certificate.sourceRevision,data.fixtures[0]?.sourceCommit,'known historical preparation revision');
  assert.deepEqual(certificate.replayed,data.fixtures.map(f=>({id:f.id,stateHash:f.stateHash,traceHash:hash(f.trace)})));
  assert.equal(certificate.notRun.length,0,'certificate has no unexecuted setup cases');
  return true;
}

const incidentalChoice = event => {
  const preferred = {life_birthday:'people',career_year:'care',health_concern:'support',lineage_bereavement:'share',
    retirement:'settle',calling_initiation:'independent',road_bandits:'avoid',road_beasts:'avoid',
    travel_bandits:'avoid',travel_beasts:'avoid',travel_weather:'shelter',plague_letter:'later'};
  return [preferred[event.id], 'care','support','listen','honest','quiet','record','people','pause','later','decline','rest','wait','leave','remember','share']
    .find(id => event.choices.some(c => c.id === id && !c.disabledReason)) || event.choices.find(c => !c.disabledReason)?.id;
};
const partyActors = battle => battle.actors.filter(a => a.side === 'party' && !a.ephemeral);
const reserves = battle => partyActors(battle).map(a => ({id:a.id,hp:a.hp,maxHp:a.maxHp,mp:a.mp,maxMp:a.maxMp,ward:a.status?.ward || 0}));
export function validateReserves(battle) {
  for (const a of battle.actors) for (const [field,max] of [['hp','maxHp'],['mp','maxMp']]) {
    assert.ok(Number.isFinite(a[field]) && Number.isFinite(a[max]) && a[field] >= 0 && a[field] <= a[max], `${a.id} finite ${field}`);
  }
  assert.ok(Number.isInteger(battle.potions) && battle.potions >= 0);
}

// Uses only legal visible actions and current visible enemy status. This is a
// repeatable, deliberately simple policy, not optimal play or an enemy oracle.
export function chooseMove(b, C, policy, counts = {}, retreatAtRisk = false) {
  const actor=b.actors.find(a => a.id === b.currentActorId), options=C.getBattleActions(b).filter(a => !a.disabledReason);
  const option=id => options.find(a => a.id === id), foes=b.actors.filter(a => a.side==='enemy' && a.hp>0).sort((a,z) => a.hp-z.hp);
  const target=foes[0], allies=partyActors(b).filter(a => a.hp>0), injured=[...allies].sort((a,z) => a.hp/a.maxHp-z.hp/z.maxHp)[0];
  const pick=(id,t) => ({id,target:t});
  if (retreatAtRisk && (partyActors(b).some(a => a.id==='hero' && a.hp/a.maxHp<.22) || partyActors(b).filter(a=>a.hp<=0).length>=2)) return pick('retreat');
  if (policy==='attack-diagnostic') return pick('attack',target?.id);
  if (injured?.hp < injured?.maxHp*.40 && option('potion')) return pick('potion',injured.id);
  if (injured && injured.hp <= injured.maxHp-20 && option('skill')?.targetSide==='party' && actor.specialization!=='bard') return pick('skill',injured.id);
  if (injured && injured.hp <= injured.maxHp-8 && option('tech_second_wind')) return pick('tech_second_wind',injured.id);
  if (injured && injured.hp <= injured.maxHp-6 && actor.specialization==='bard' && option('skill')) return pick('skill',injured.id);
  const charged=foes.find(a => a.status?.charged || a.status?.stolenWard);
  if (charged && option('weapon_counter')) return pick('weapon_counter',charged.id);
  if (charged && option('inspect')) return pick('inspect',charged.id);
  if (actor.mp<5 && (actor.role==='mage' || actor.role==='healer') && (counts[actor.id+':defend'] || 0)<3) return pick('defend');
  if (option('skill')?.targetSide==='enemy') return pick('skill',target?.id);
  if (option('tactic')?.targetSide==='enemy' && (counts[actor.id+':tactic'] || 0)<2) return pick('tactic',target?.id);
  if (actor.specialization==='guardian' && option('tactic') && injured && injured.hp<injured.maxHp*.7 && (injured.status?.ward || 0)<5) return pick('tactic',injured.id);
  return pick('attack',target?.id);
}

function fight(initial, C, policy, {retreatAtRisk=false, limit=matrix.bounds.partyActionsPerEncounter}={}) {
  let battle=copy(initial), actions=0; const counts={}, commands=[], opening=reserves(initial);
  validateReserves(battle);
  while (!battle.outcome && actions<limit) {
    const pick=chooseMove(battle,C,policy,counts,retreatAtRisk), actor=battle.currentActorId;
    assert.ok(C.getBattleActions(battle).some(a => a.id===pick.id && !a.disabledReason), `legal ${pick.id}`);
    const beforeHash=hash(battle), next=C.takeBattleAction(battle,pick.id,pick.target);
    assert.equal(hash(battle),beforeHash,'combat input immutable');
    assert.notEqual(hash(next),beforeHash,'selected action progresses');
    validateReserves(next); battle=next; actions++;
    counts[actor+':'+pick.id]=(counts[actor+':'+pick.id] || 0)+1;
    commands.push({actor,...pick});
  }
  return {battle, report:{outcome:battle.outcome || 'unresolved',stopReason:battle.outcome?'resolved':'finite-action-limit',
    actions,rounds:battle.round,opening,ending:reserves(battle),potionsOpening:initial.potions,potionsEnding:battle.potions,
    potionsUsed:battle.potionsUsed,counts,commands,finalBattleHash:hash(battle)}};
}

async function modules(directory) {
  const base=pathToFileURL(resolve(directory)+'/').href;
  const [E,C,W,K,T,M]=await Promise.all(['engine','combat','world-services','classes','trading','maze-v31'].map(id => import(new URL(id+'.js',base))));
  return {E,C,W,K,T,M};
}
function makeRun(initial, graph, trace=[]) {
  const {E,C,W}=graph, run={state:copy(initial),trace:copy(trace)};
  run.step=(method,...args) => {
    assert.ok(run.trace.length<matrix.bounds.setupTransitionsPerForm,'setup budget exhausted; report NOT RUN rather than invent stats');
    const before=run.state,beforeHash=hash(before), next=E[method](before,...args);
    assert.equal(hash(before),beforeHash,'public input immutable');
    assert.ok(E.validateSave(copy(next)),`${method}: invalid save ${next.notice}`);
    assert.ok(next.hero.gold>=0,'no negative gold');
    run.trace.push({method,args:copy(args),beforeHash,afterHash:hash(next),days:next.day-before.day,goldDelta:next.hero.gold-before.hero.gold,
      hpDelta:next.hero.hp-before.hero.hp,mpDelta:next.hero.mp-before.hero.mp,notice:next.notice,
      interruption:next.event?.id || next.conversations?.pending?.personId || null});
    run.state=next; return run;
  };
  run.settle=() => {
    for(let n=0;n<100;n++) {
      if(run.state.battle) {const {battle}=fight(run.state.battle,C,'resource-aware-v1',{retreatAtRisk:true});if(!battle.outcome)throw Error('Setup travel battle reached bounded limit');run.step('resolveBattle',battle);continue;}
      if(run.state.event) {run.step('chooseEventOption',incidentalChoice(run.state.event));continue;}
      if(run.state.conversations?.pending) throw Error('Setup needs an explicit pending conversation policy; no guessing');
      return run;
    }
    throw Error('Setup interruption budget exhausted');
  };
  run.walk=room => {for(const id of W.serviceWalkPath(run.state,room) || [])run.step('chooseAction','atlas_room_'+id).settle();return run;};
  run.act=id => {
    run.settle(); const offer=E.getActions(run.state).find(a=>a.id===id);assert.ok(offer,`${id} offered at ${run.state.locationId}`);
    if(offer.disabledReason?.includes('birthday')) {run.step('ageUp').settle();return run.act(id);}
    const owner=W.settlementServices(run.state).find(s=>W.serviceAccepts(s,id));
    if(owner)run.walk(owner.roomId);else if(/^(gear_buy_|realm_)/.test(id))run.walk('market');
    const fresh=E.getActions(run.state).find(a=>a.id===id);assert.ok(fresh&&!fresh.disabledReason,`${id}: ${fresh?.disabledReason}`);
    run.step('chooseAction',id).settle();
    for(let n=0;run.state.rpg?.project&&n<12;n++)run.step('chooseAction','rpg_continue').settle();
    return run;
  };
  run.move=id => {
    run.settle();if(run.state.locationId===id)return run;
    run.walk('gate');run.step('travelTo',id);
    for(let n=0;n<100;n++) {
      run.settle();if(!run.state.timeline.journey){assert.equal(run.state.locationId,id,run.state.notice);return run;}
      const camp=E.getActions(run.state).find(a=>a.id==='trail_camp'&&!a.disabledReason);
      if(run.state.hero.mp<run.state.hero.maxMp*.25&&camp)run.step('chooseAction','trail_camp');else run.step('continueJourney');
    }
    throw Error('Setup travel budget exhausted');
  };
  return run;
}
function selectParty(state, ids, E) {
  let s=copy(state);
  for(const c of s.companions.filter(c=>c.active && !ids.includes(c.id)))s=E.toggleCompanion(s,c.id);
  for(const id of ids)if(!s.companions.find(c=>c.id===id).active)s=E.toggleCompanion(s,id);
  assert.deepEqual(s.companions.filter(c=>c.active).map(c=>c.id).sort(),[...ids].sort(),'legal exact party selection');
  assert.ok(E.validateSave(copy(s)));return s;
}

async function prepare(graph, directory) {
  const {E,K}=graph, fixtures=[], notRun=[];
  for(const form of matrix.forms.filter(f=>!arg('only','') || arg('only','').split(',').includes(f.id))) {
    const root=readGzip(join(directory,'root-0.json.gz'));validateRoot(root,0);const run=makeRun(root.state,graph);
    const save=stage => {
      assert.ok(stage!=='low'||run.state.hero.level<matrix.midLevel,'low fixture must precede actual mid progression');
      assert.ok(stage!=='mid'||run.state.hero.level===matrix.midLevel,'mid fixture is genuinely earned at the declared level');
      const state=copy(run.state),f={id:form.id+'-'+stage,evidenceClass:'action-earned',root:0,rootHash:root.stateHash,
        calling:form.calling,stage,sourceCommit:arg('revision','UNSPECIFIED'),state,stateHash:hash(state),trace:copy(run.trace),
        setup:{rootDays:root.state.day-root.source.opening.day,extensionDays:state.day-root.state.day,
          extensionGoldDelta:state.hero.gold-root.state.hero.gold,transitions:run.trace.length}};
      validateEvidence(f,E);fixtures.push(f);console.log('earned',f.id,'level',state.hero.level,'transitions',run.trace.length);
    };
    try {
      if(run.state.hero.specialization!==form.calling) {
        run.move(K.classView(run.state).callings.find(c=>c.id===form.calling).locationId);run.act('calling_meet_'+form.calling);
        for(let n=0;n<40&&K.classView(run.state).callings.find(c=>c.id===form.calling).requirements.some(r=>!r.met);n++)run.act('calling_train_'+form.calling);
        run.act('calling_seek_'+form.calling);assert.equal(run.state.hero.specialization,form.calling);
      }
      run.move('city');
      while(run.state.hero.gold<150)run.act('work');
      const item=form.gear.find(id=>run.state.equipment.owned.includes(id)||E.getActions(run.state).some(a=>a.id==='gear_buy_'+id&&!a.disabledReason));
      if(item) {if(!run.state.equipment.owned.includes(item))run.act('gear_buy_'+item);run.step('equipGear',item);}
      for(const id of ['mira','orrin','kest'])if(!run.state.companions.find(c=>c.id===id).recruited)run.step('recruitCompanion',id).settle();
      run.act('rest');save('low');
      const wanted=new Set([3,4,5]);
      while(run.state.hero.level<=5) {
        if(wanted.has(run.state.hero.level)) {
          if(run.state.hero.level===matrix.midLevel){run.act('rest');save('mid');}
          if(form.id===matrix.targeted.boundaryForm && matrix.targeted.earnedBoundaryLevels.includes(run.state.hero.level)) {run.act('rest');save('boundary-'+run.state.hero.level);}
          wanted.delete(run.state.hero.level);
        }
        if(run.state.hero.level>=5)break;
        if(run.state.hero.gold<30)run.act('work');else run.act('train');
      }
      if(!fixtures.some(f=>f.id===form.id+'-mid'))notRun.push({id:form.id+'-mid',reason:`genuine level ${matrix.midLevel} not reached within setup budget`});
    } catch(error) {notRun.push({form:form.id,reason:error.message});console.error('NOT RUN',form.id,error.message);}
  }
  for(const index of (arg('only','') ? [] : matrix.targeted.secondaryRoots)) {
    const root=readGzip(join(directory,`root-${index}.json.gz`));validateRoot(root,index);const run=makeRun(root.state,graph);
    try {
      run.move('city');for(const id of ['mira','orrin','kest'])if(!run.state.companions.find(c=>c.id===id).recruited)run.step('recruitCompanion',id).settle();
      const state=copy(run.state), f={id:'support-traits-'+index,evidenceClass:'action-earned',root:index,rootHash:root.stateHash,calling:'bard',stage:'low',
        sourceCommit:arg('revision','UNSPECIFIED'),state,stateHash:hash(state),trace:run.trace,setup:{rootDays:root.state.day-root.source.opening.day,
          extensionDays:state.day-root.state.day,extensionGoldDelta:state.hero.gold-root.state.hero.gold,transitions:run.trace.length}};
      validateEvidence(f,E);fixtures.push(f);
    }catch(error){notRun.push({id:'support-traits-'+index,reason:error.message});}
  }
  const data={schemaVersion:1,matrixHash:hash(matrix),fixtures,notRun};
  const replayed=[];for(const f of fixtures){verifyFixtureTrace(f,readGzip(join(directory,`root-${f.root}.json.gz`)),E);replayed.push({id:f.id,stateHash:f.stateHash,traceHash:hash(f.trace)});}
  writeFileSync(join(directory,'earned.json.gz'),gzipSync(JSON.stringify(data),{level:9}));
  write(join(directory,'earned-provenance.json'),{schemaVersion:1,fixtureSetHash:hash(data),matrixHash:hash(matrix),sourceRevision:arg('revision','UNSPECIFIED'),replayed,notRun});
  write(join(directory,'earned-index.json'),{schemaVersion:1,matrixHash:hash(matrix),notRun,fixtures:fixtures.map(f=>({id:f.id,evidenceClass:f.evidenceClass,
    root:f.root,stateHash:f.stateHash,setup:f.setup,actual:describeState(f.state)}))});
  assert.equal(notRun.length,0,'some earned setup cases are NOT RUN; inspect index before claiming gate coverage');
}

export function encounterCases(fixtures) {
  const cases=[];
  const add=(fixture,encounters,sensitivity='earned-balanced') => {
    for(const [party,ids]of Object.entries(matrix.parties))for(const encounter of encounters)for(const policy of matrix.policies)
      cases.push({id:`${fixture.id}/${party}/${encounter.id}/${policy}/${sensitivity}`,fixture:fixture.id,party,ids,encounter,policy,sensitivity});
  };
  for(const f of fixtures.filter(f=>['low','mid'].includes(f.stage)&&f.root===0))add(f,matrix.encounters);
  for(const f of fixtures.filter(f=>f.stage.startsWith('boundary-')))add(f,matrix.targeted.boundaryEncounters.map(id=>({id,intentBand:'procedural-current-tier'})));
  for(const f of fixtures.filter(f=>f.root!==0))for(const sensitivity of matrix.targeted.secondarySensitivities)
    add(f,[{id:matrix.targeted.secondaryEncounter,intentBand:'procedural-current-tier'}],sensitivity);
  assert.ok(cases.length<=matrix.bounds.primaryCases+matrix.bounds.targetedCases);return cases;
}

// Graph inspection is restricted to the room currently occupied and previously
// visited doors. Unknown room kinds/goal locations never guide this explorer.
function pathThroughKnown(s, M, goal) {
  const visited=new Set(s.maze.visited),queue=[[s.maze.position]],seen=new Set([s.maze.position]);
  for(const path of queue) {
    const at=path.at(-1);if(goal(at))return path.slice(1);
    for(const to of M.mazeLayout(s.maze).cells[at].doors)if(visited.has(to)&&!seen.has(to)){seen.add(to);queue.push([...path,to]);}
  }
  return null;
}
async function expedition(fixture, party, graph) {
  const {E,C,M}=graph, run=makeRun(selectParty(fixture.state,matrix.parties[party],E),graph), preparationInputHash=hash(run.state),preparationStart=describeState(run.state);
  // Buy actual supplies at the actual market. No post-entry refill or stat edits.
  run.move('city');while(run.state.hero.gold<100)run.act('work');run.walk('market');
  const draft=graph.T.newTradeDraft(run.state,'market');draft.buy=[{id:'camp:tent',quantity:1},{id:'supply:rations',quantity:1}];
  const quote=graph.T.quoteTrade(run.state,draft);assert.ok(!quote.disabledReason,quote.disabledReason);run.step('completeTrade',quote).settle();
  if(run.state.hero.potions<2)for(let n=run.state.hero.potions;n<2;n++){
    const offer=E.getActions(run.state).find(a=>a.id==='realm_potion'&&!a.disabledReason);if(offer)run.act('realm_potion');
  }
  const beforeEntry=describeState(run.state);run.act('adventure_descend');assert.ok(run.state.maze,'natural offered entry created maze');
  const layout=M.mazeLayout(run.state.maze), topologyHash=hash(layout.cells.map(c=>({id:c.id,doors:c.doors}))), visitedRooms=new Set(),commands=[],battles=[],interruptions=[];
  assert.equal(layout.cells.length,121);for(const c of layout.cells)for(const to of c.doors)assert.ok(layout.cells[to].doors.includes(c.id));
  const reachable=new Set([0]),queue=[0];for(const at of queue)for(const to of layout.cells[at].doors)if(!reachable.has(to)){reachable.add(to);queue.push(to);}assert.equal(reachable.size,121,'all maze rooms remain connected');
  let withdrawing=false,reason='exploring',movements=0,camps=0,commandCount=0;
  const apply=id=>{
    const before=run.state,beforeHash=hash(before);let next=E.chooseAction(before,id);assert.equal(hash(before),beforeHash);
    assert.ok(E.validateSave(copy(next)),`expedition ${id}: valid save`);
    commandCount++;commands.push({id,kind:'maze',day:before.day,days:next.day-before.day,goldDelta:next.hero.gold-before.hero.gold,
      hpDelta:next.hero.hp-before.hero.hp,mpDelta:next.hero.mp-before.hero.mp,kitNightsBefore:(before.trail.kits||[]).reduce((a,k)=>a+k.remaining,0),
      kitNightsAfter:(next.trail.kits||[]).reduce((a,k)=>a+k.remaining,0)});run.state=next;
  };
  while(run.state.maze && commandCount<matrix.bounds.expeditionCommands) {
    if(run.state.event) {const id=incidentalChoice(run.state.event),before=run.state,beforeHash=hash(before);interruptions.push({event:before.event.id,choice:id,day:before.day});
      run.state=E.chooseEventOption(before,id);assert.equal(hash(before),beforeHash);assert.ok(E.validateSave(copy(run.state)));commandCount++;commands.push({kind:'interruption',id,event:before.event.id,day:before.day,days:run.state.day-before.day});continue;}
    if(run.state.battle) {
      const returnDistance=(pathThroughKnown(run.state,M,id=>id===0)||[]).length;
      const available=Math.max(0,matrix.bounds.expeditionCommands-commandCount-returnDistance-6);
      const result=fight(run.state.battle,C,'resource-aware-v1',{retreatAtRisk:true,limit:Math.min(matrix.bounds.partyActionsPerEncounter,available)});
      commandCount+=result.report.actions;commands.push(...result.report.commands.map(p=>({kind:'combat',...p})));
      if(!result.battle.outcome) {result.battle=C.takeBattleAction(result.battle,'retreat');result.report.forcedRetreatAfterLimit=true;commandCount++;commands.push({kind:'combat',id:'retreat',reason:'bounded-reserve-return'});}
      battles.push({...result.report,outcome:result.battle.outcome});const before=run.state,beforeHash=hash(before);run.state=E.resolveBattle(before,result.battle);assert.equal(hash(before),beforeHash);assert.ok(E.validateSave(copy(run.state)));commandCount++;commands.push({kind:'resolve-battle',id:result.battle.outcome});
      if(result.battle.outcome!=='victory'){withdrawing=true;reason='battle-'+result.battle.outcome;}continue;
    }
    const s=run.state,m=s.maze,c=M.mazeLayout(m).cells[m.position], options=E.getActions(s).filter(a=>!a.disabledReason),has=id=>options.some(a=>a.id===id);
    const back=pathThroughKnown(s,M,id=>id===0) || [];
    // Reserve enough movement/commands to walk back, not an arbitrary teleport.
    if(movements+back.length+2>=matrix.bounds.expeditionMovements||commandCount+back.length+8>=matrix.bounds.expeditionCommands){withdrawing=true;reason='route-budget-reserved-return';}
    if(s.hero.hp<s.hero.maxHp*.35){withdrawing=true;reason='low-health';}
    if(m.objective&&has('maze_exit')){apply('maze_exit');reason='objective-complete';continue;}
    if(withdrawing) {if(m.position===0){apply('maze_exit');continue;}const to=back[0];assert.ok(to!==undefined,'known return path');apply('maze_step_'+to);movements++;continue;}
    if(has('maze_camp')&&(s.hero.mp<s.hero.maxMp*.45||s.companions.some(p=>p.active&&p.hp>0&&p.mp<p.maxMp*.25))&&camps<8){apply('maze_camp');camps++;continue;}
    if(has('maze_fight')){apply('maze_fight');continue;}
    const local=['maze_disarm','maze_search','maze_read','maze_objective'].find(has);if(local){apply(local);continue;}
    visitedRooms.add(m.position);
    const unexplored=c.doors.filter(id=>!m.visited.includes(id)).sort((a,b)=>a-b)[0];
    let to=unexplored;
    if(to===undefined){const path=pathThroughKnown(s,M,id=>!visitedRooms.has(id)||M.mazeLayout(m).cells[id].doors.some(n=>!m.visited.includes(n)));to=path?.[0];}
    if(to===undefined){withdrawing=true;reason='known-frontier-exhausted';continue;}
    apply('maze_step_'+to);movements++;
  }
  assert.ok(!run.state.maze,'bounded expedition must complete or really return, never report an open route as finished');
  assert.ok(movements<=matrix.bounds.expeditionMovements);assert.ok(commandCount<=matrix.bounds.expeditionCommands,'all maze, battle, outcome and event commands bounded');
  const record=run.state.mazeBook.records.at(-1);assert.equal(hash(M.mazeLayout(record).cells.map(c=>({id:c.id,doors:c.doors}))),topologyHash);
  const reload=JSON.parse(JSON.stringify(run.state));assert.ok(E.validateSave(reload));
  return {id:`expedition/${fixture.id}/${party}`,fixture:fixture.id,party,evidenceClass:'resource-carrying-expedition',
    inputHash:preparationInputHash,earnedBasisHash:fixture.stateHash,preparationStart,preparationEnd:beforeEntry,preparation:run.trace,
    opening:beforeEntry,ending:describeState(run.state),outcome:record.status,stopReason:reason,
    movements,commandCount,commands,camps,battles,interruptions,topologyHash,record:{id:record.id,steps:record.steps,visited:record.visited.length,
      cleared:record.cleared.length,collected:record.collected.length,objective:record.objective},saveRoundTripValid:true};
}

async function runSuite(graph, directory, output) {
  const data=readGzip(join(directory,'earned.json.gz'));assert.equal(data.matrixHash,hash(matrix));assert.equal(data.notRun.length,0,'fixture gaps remain NOT RUN');
  const certificate=read(join(directory,'earned-provenance.json'));validateCertificate(data,certificate);
  for(const f of data.fixtures) {const root=readGzip(join(directory,`root-${f.root}.json.gz`));validateEvidence(f,graph.E,root);}
  for(const form of matrix.forms)for(const stage of matrix.stages)assert.ok(data.fixtures.some(f=>f.id===form.id+'-'+stage),`NOT RUN: missing primary ${form.id}-${stage}`);
  assert.equal(encounterCases(data.fixtures).length,matrix.bounds.primaryCases+matrix.bounds.targetedCases,'complete approved encounter matrix');
  const results=[];
  for(const row of encounterCases(data.fixtures)) {
    const f=data.fixtures.find(f=>f.id===row.fixture);let s=selectParty(f.state,row.ids,graph.E);const exactEarnedInputHash=hash(s);
    const counterfactualEdits=[];
    if(row.sensitivity==='counterfactual-perilous-level8') {s=copy(s);counterfactualEdits.push({field:'hero.level',from:s.hero.level,to:8},{field:'difficulty',from:s.difficulty,to:'perilous'});s.hero.level=8;s.difficulty='perilous';}
    const {report}=fight(graph.C.createBattle(s,row.encounter.id),graph.C,row.policy);
    results.push({...row,evidenceClass:row.sensitivity.startsWith('counterfactual')?'counterfactual-sensitivity':'action-earned-encounter',
      inputHash:hash(s),earnedBasisHash:exactEarnedInputHash,counterfactualEdits,actual:describeState(s),...report});
  }
  const expeditions=[];
  if(!process.argv.includes('--encounters-only'))for(const row of matrix.expeditionCases) {
    const f=data.fixtures.find(f=>f.id===row.fixture);assert.ok(f,`required ${row.fixture}`);
    expeditions.push(await expedition(f,row.party,graph));console.log('expedition',expeditions.at(-1).id,expeditions.at(-1).outcome,expeditions.at(-1).movements,'moves');
  }
  const report={schemaVersion:1,label:arg('label','candidate'),sourceRevision:arg('revision','UNSPECIFIED'),moduleDirectory:arg('modules','dist/js'),matrixHash:hash(matrix),
    fixtureSetHash:hash(data),provenance:{rootChecksumsVerified:true,certificateHash:hash(certificate),setupReplayedAtRevision:certificate.sourceRevision,setupReplayed:certificate.replayed.map(f=>f.id)},method:matrix.purpose,syntheticInvariantCommand:'node --test tests/second-wind-balance.test.js tests/earned-balance-gate.test.js',
    scope:{encounters:results.length,expeditions:expeditions.length,notRun:process.argv.includes('--encounters-only')?['resource-carrying-expeditions']:[]},results,expeditions};
  mkdirSync(resolve(output,'..'),{recursive:true});write(output,report);console.log('saved',output,results.length,'encounter cases',expeditions.length,'real expeditions');return report;
}

async function verifyReplay(report, graph, directory, output) {
  const data=readGzip(join(directory,'earned.json.gz'));validateCertificate(data,read(join(directory,'earned-provenance.json')));
  assert.equal(hash(data),report.fixtureSetHash);assert.equal(report.matrixHash,hash(matrix));
  const selected=matrix.forms.map(form=>report.results.find(r=>r.fixture.startsWith(form.id+'-')&&r.party==='one'&&r.policy==='resource-aware-v1'));
  selected.push(report.results.find(r=>r.sensitivity.startsWith('counterfactual')));
  const checks=[];
  for(const row of selected) {
    assert.ok(row,'required representative replay case');const fixture=data.fixtures.find(f=>f.id===row.fixture);
    let state=selectParty(fixture.state,row.ids,graph.E);
    for(const edit of row.counterfactualEdits||[]) {assert.ok(['hero.level','difficulty'].includes(edit.field));if(edit.field==='hero.level')state.hero.level=edit.to;else state.difficulty=edit.to;}
    assert.equal(hash(state),row.inputHash);let battle=graph.C.createBattle(state,row.encounter.id);
    for(const command of row.commands){assert.equal(command.actor,battle.currentActorId);battle=graph.C.takeBattleAction(battle,command.id,command.target);validateReserves(battle);}
    assert.equal(hash(battle),row.finalBattleHash,'same saved input + exact commands reproduce final battle');
    checks.push({id:row.id,commands:row.commands.length,finalBattleHash:hash(battle),matched:true});
  }
  const result={schemaVersion:1,baselineRevision:report.sourceRevision,replayRevision:arg('revision','UNSPECIFIED'),replayModuleDirectory:arg('modules','dist/js'),fixtureSetHash:report.fixtureSetHash,method:'Five representative exact-command replays, not a second full matrix or a separate candidate balance run.',checks};
  mkdirSync(resolve(output,'..'),{recursive:true});write(output,result);console.log('reproduced',checks.length,'representative command traces');return result;
}

export function compareReports(base, candidate, accepted=[]) {
  assert.equal(base.matrixHash,candidate.matrixHash,'same matrix');assert.equal(base.fixtureSetHash,candidate.fixtureSetHash,'identical saved fixture set');
  assert.deepEqual(base.provenance,candidate.provenance,'same verified earned provenance');
  assert.equal(candidate.scope.notRun.length,0,'an incomplete run cannot pass the full gate');
  const review=[],threshold=matrix.reviewThresholds,approval=new Map(accepted.map(a=>{assert.ok(a.id&&a.reason?.trim().length>=12,'review acceptance needs case and substantive design reason');return[a.id,a.reason];}));
  const metric=(id,field,a,b,tolerance) => {if(Math.abs(a-b)>tolerance)review.push({id,field,baseline:a,candidate:b,tolerance,acceptedReason:approval.get(id)||null});};
  assert.equal(base.results.length,candidate.results.length);
  for(const a of base.results) {
    const b=candidate.results.find(b=>b.id===a.id);assert.ok(b,`same case ${a.id}`);assert.equal(a.inputHash,b.inputHash,'same encounter input');
    if(a.outcome!==b.outcome)review.push({id:a.id,field:'outcome',baseline:a.outcome,candidate:b.outcome,acceptedReason:approval.get(a.id)||null});
    metric(a.id,'partyActions',a.actions,b.actions,Math.max(threshold.partyActionsFloor,a.actions*threshold.partyActionsFraction));
    for(const hero of a.ending.filter(p=>p.id==='hero'))metric(a.id,'heroHpFraction',hero.hp/hero.maxHp,b.ending.find(p=>p.id==='hero').hp/b.ending.find(p=>p.id==='hero').maxHp,threshold.heroHpFraction);
    const mp=r=>r.ending.reduce((n,a)=>n+a.mp,0)/Math.max(1,r.ending.reduce((n,a)=>n+a.maxMp,0));metric(a.id,'partyMpFraction',mp(a),mp(b),threshold.partyMpFraction);
    metric(a.id,'potionsSpent',a.potionsOpening-a.potionsEnding,b.potionsOpening-b.potionsEnding,0);
  }
  assert.equal(base.expeditions.length,candidate.expeditions.length,'same expedition scope');
  for(const a of base.expeditions) {
    const b=candidate.expeditions.find(b=>b.id===a.id);assert.ok(b);assert.equal(a.inputHash,b.inputHash,'same earned expedition input');assert.equal(a.topologyHash,b.topologyHash,'maze topology unchanged');
    if(a.outcome!==b.outcome)review.push({id:a.id,field:'expeditionOutcome',baseline:a.outcome,candidate:b.outcome,acceptedReason:approval.get(a.id)||null});
    const hp=r=>r.ending.hero.hp/r.ending.hero.maxHp;metric(a.id,'heroHpFraction',hp(a),hp(b),threshold.heroHpFraction);
    const mp=r=>{const p=[r.ending.hero,...r.ending.companions.filter(c=>c.active&&c.alive!==false)];return p.reduce((n,c)=>n+c.mp,0)/Math.max(1,p.reduce((n,c)=>n+c.maxMp,0));};metric(a.id,'partyMpFraction',mp(a),mp(b),threshold.partyMpFraction);
    const gold=r=>r.ending.hero.gold-r.opening.hero.gold;metric(a.id,'netGoldDelta',gold(a),gold(b),Math.max(10,Math.abs(gold(a))*.25));
    const days=r=>r.ending.day-r.opening.day;metric(a.id,'attendedDays',days(a),days(b),Math.max(threshold.calendarDaysFloor,days(a)*threshold.calendarDaysFraction));
    for(const field of ['kitNights','potions','rations'])metric(a.id,field+'Spent',a.opening.supplies[field]-a.ending.supplies[field],b.opening.supplies[field]-b.ending.supplies[field],0);
  }
  return {schemaVersion:1,status:review.some(r=>!r.acceptedReason)?'REVIEW REQUIRED':'PASS',baselineRevision:base.sourceRevision,candidateRevision:candidate.sourceRevision,
    scope:candidate.scope,review,limits:'Thresholds request design review, not fixed output golden tests or automatic retuning. PASS establishes regression contracts within the stated matrix only.'};
}

async function main() {
  const mode=process.argv[2] || 'plan',directory=resolve(arg('fixtures',fixtureDirectory)),output=resolve(arg('out',`artifacts/earned-balance/${arg('label','candidate')}.json`));
  if(mode==='plan') {console.log(JSON.stringify(matrix,null,2));return;}
  if(mode==='compare') {
    const result=compareReports(read(arg('baseline','artifacts/earned-balance/baseline.json')),read(arg('candidate','artifacts/earned-balance/candidate.json')),
      arg('accepted','')?read(arg('accepted','')):[]);mkdirSync(resolve(output,'..'),{recursive:true});write(output,result);console.log(result.status,result.review.length,'review findings');if(result.status!=='PASS')process.exitCode=1;return;
  }
  if(['prepare','run'].includes(mode))assert.notEqual(arg('revision','UNSPECIFIED'),'UNSPECIFIED','record --revision=EXACT_SOURCE_COMMIT for reproducibility');
  const graph=await modules(arg('modules','dist/js'));
  if(mode==='prepare')return prepare(graph,directory);
  if(mode==='verify-replay')return verifyReplay(read(arg('report','artifacts/earned-balance/baseline.json')),graph,directory,output);
  if(mode==='validate') {const data=readGzip(join(directory,'earned.json.gz'));validateCertificate(data,read(join(directory,'earned-provenance.json')));assert.equal(data.matrixHash,hash(matrix));for(const f of data.fixtures){const root=readGzip(join(directory,`root-${f.root}.json.gz`));validateEvidence(f,graph.E,root);verifyFixtureTrace(f,root,graph.E);}assert.equal(data.notRun.length,0);console.log('validated and replayed',data.fixtures.length,'action-earned fixtures');return;}
  if(mode==='replay-setup') {
    const data=readGzip(join(directory,'earned.json.gz'));
    for(const f of data.fixtures) {const root=readGzip(join(directory,`root-${f.root}.json.gz`));verifyFixtureTrace(f,root,graph.E);console.log('replayed',f.id,f.trace.length,'public transitions');}return;
  }
  assert.equal(mode,'run','Use plan, prepare, validate, replay-setup, verify-replay, run or compare');return runSuite(graph,directory,output);
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
