import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ENEMY_SPECIES, ENEMY_ATLASES, enemyIllustration, identifyEnemy, validEnemyIllustration, renderEnemyPortrait, proceduralEnemies, enemyDisplayName, enemySpeciesPool, enemyEncounterTerrains } from '../dist/js/enemies.js';
import { GROUNDED_ENEMY_SPECIES_V39, GROUNDED_ENEMY_PLAN_ALIASES_V39, GROUNDED_BOSS_ROWS_V39, GROUNDED_FOE_ATLASES_V39, enemyTerrainAliasesV39 } from '../dist/js/grounded-enemies-v39.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { executeEnemyPlan, validEnemyPlan } from '../dist/js/enemy-plans-v27.js';
import { generateCharacter } from '../dist/js/characters.js';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { hexAtlas, syncCartography } from '../dist/js/cartography.js';
import { mazeLayout } from '../dist/js/maze-v31.js';
import { queueWildernessEncounter } from '../dist/js/wilderness-v35.js';
import { createBattle, previewBattleAction, battleActorDisplayName, battleNamedTargetId } from '../dist/js/combat.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { refreshAdventureBoard } from '../dist/js/adventuring.js';

const families=['beast','undead','spirit','construct','aberration'];
const newIds=new Set(GROUNDED_ENEMY_SPECIES_V39.map(row=>row.id));
const siteGame=(id,type=id)=>({seed:'grounded-context',locationId:id,world:{locations:[{id,type}],roads:[]}});
const foeArt=(species,group,cell)=>({kind:'foe',species,group,cell});

test('forty new species have 320 bounded frames and six isolated atlas registrations',()=>{
  assert.equal(GROUNDED_ENEMY_SPECIES_V39.length,40);
  assert.equal(newIds.size,40);
  assert.equal(ENEMY_SPECIES.length,88);
  assert.equal(Object.keys(GROUNDED_FOE_ATLASES_V39).length,6);
  for(const [group,atlas] of Object.entries(GROUNDED_FOE_ATLASES_V39)){
    assert.equal(atlas.cells.length,64);
    assert.equal(new Set(atlas.cells.map(rect=>JSON.stringify(rect))).size,64);
    assert.equal(atlas.src,`./art/foes/${group}.avif`);
    for(const [x,y,w,h] of atlas.cells)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100);
  }
  for(const role of families){const rows=GROUNDED_ENEMY_SPECIES_V39.filter(row=>row.role===role);assert.equal(rows.length,8);assert.deepEqual(rows.map(row=>row.row),[0,1,2,3,4,5,6,7]);}
});

test('all legacy illustration bindings and the two rejected cells retain their exact interpretation',()=>{
  const ids=[
    ['beasts','wolf boar rat leech spider bat bear serpent'],
    ['undead','skeleton grave_knight ghoul mummy drowned bone_hound acolyte rotted_jailer'],
    ['spirits','wraith wisp shadow archivist shade seal ember watcher'],
    ['constructs','sentinel golem husk keeper root thornheart sprout guardian'],
    ['aberrations','moth fungus eye chimera fiend crawler eldritch_knight oracle'],
    ['bosses','captain last_archivist anchor_warden thorn_sovereign hollow_king death_cleric dragon witch'],
  ];
  for(const [group,names] of ids)for(const [row,species] of names.split(' ').entries()){
    assert.deepEqual(ENEMY_SPECIES.find(value=>value[0]===species).slice(2,4),[group,row]);
    for(let variant=0;variant<8;variant++){
      const art=foeArt(species,group,row*8+variant),excluded=species==='wisp'&&art.cell===14||species==='fungus'&&art.cell===13;
      assert.equal(validEnemyIllustration(art),!excluded);
      if(!excluded)assert.ok(renderEnemyPortrait({name:species,illustration:art}).includes(ENEMY_ATLASES[group].src));
    }
  }
  assert.equal(validEnemyIllustration(foeArt('wolf','grounded-beasts-39',0)),false);
  assert.equal(validEnemyIllustration(foeArt('marsh_toad','beasts',0)),false);
  assert.equal(validEnemyIllustration(foeArt('captain','grounded-beasts-39',0)),false);
});

test('each of the 320 new frames is selectable, renderable and bound to exactly one species row',()=>{
  for(const row of GROUNDED_ENEMY_SPECIES_V39){
    const seen=new Set();
    for(let seed=0;seed<256;seed++){
      const art=enemyIllustration(row.id,'grounded-art-'+seed,'portrait');
      assert.equal(art.group,row.group);assert.ok(validEnemyIllustration(art));seen.add(art.cell);
    }
    assert.equal(seen.size,8,row.id);
    for(const cell of seen){
      const art=foeArt(row.id,row.group,cell),html=renderEnemyPortrait({name:row.name,illustration:art});
      assert.ok(html.includes(GROUNDED_FOE_ATLASES_V39[row.group].src));
      assert.equal(validEnemyIllustration({...art,cell:(cell+8)%64}),false);
      assert.equal(validEnemyIllustration({...art,group:'grounded-bosses-39'}),false);
    }
    assert.equal(identifyEnemy({name:`Cautious ${row.name}`},'identify',row.id).species,row.id);
  }
});

test('all 64 new boss variants extend existing identities and no boss enters an ordinary pool',()=>{
  for(const [row,species] of GROUNDED_BOSS_ROWS_V39.entries()){
    const seen=new Set();
    for(let seed=0;seed<512;seed++){
      const art=enemyIllustration(species,'boss-art-'+seed,'portrait');
      assert.ok(validEnemyIllustration(art));assert.equal(Math.floor(art.cell/8),row);seen.add(`${art.group}:${art.cell}`);
    }
    assert.equal(seen.size,16,species);
  }
  for(const role of [...families,'bandit','humanoid'])for(const context of ['forest','marsh','mountain','ruin','coast','village']){
    assert.ok(enemySpeciesPool(siteGame(context),role).every(row=>!GROUNDED_BOSS_ROWS_V39.includes(row[0])));
  }
});

test('terrain aliases constrain new habitats while all legacy quest candidates remain available',()=>{
  for(const [id,expected] of [['quarry',['mountain']],['fenhold',['marsh']],['crypt',['ruin']],['port',['water','grassland']],['orchard',['forest','grassland']]])assert.deepEqual(enemyTerrainAliasesV39(id),expected);
  const reachable=new Set();
  for(const terrain of ['forest','marsh','mountain','ruin','water','grassland'])for(const role of families){
    const game=siteGame(terrain),pool=enemySpeciesPool(game,role);
    for(const row of ENEMY_SPECIES.slice(0,40).filter(row=>row[4]===role))assert.ok(pool.includes(row));
    for(const candidate of pool.filter(row=>newIds.has(row[0]))){
      const row=GROUNDED_ENEMY_SPECIES_V39.find(row=>row.id===candidate[0]);
      assert.ok(row.terrains.some(value=>enemyEncounterTerrains(game).includes(value)),row.id+' habitat');reachable.add(row.id);
    }
  }
  assert.equal(reachable.size,40);
  const dry=enemySpeciesPool(siteGame('quarry','mountain'),'beast');
  assert.ok(!dry.some(row=>['marsh_toad','marsh_crab','mud_crocodile'].includes(row[0])));
  assert.ok(dry.some(row=>row[0]==='crag_lynx'));
});

test('every new procedural creature uses its actual finite runtime plan and unchanged tier stat bounds',()=>{
  const unit=(id,side='enemy')=>({id,name:id,side,hp:1000,maxHp:1000,mp:0,maxMp:0,armor:0,agility:4,attackPower:5,status:{},aiStep:0});
  for(const row of GROUNDED_ENEMY_SPECIES_V39){
    const enemy=proceduralEnemies({...siteGame('quarry','mountain'),rpg:{}},row.role,3,'plan-'+row.id,row.name)[0];
    assert.equal(enemy.name,row.name);assert.equal(enemy.illustration.species,row.id);
    const alias=GROUNDED_ENEMY_PLAN_ALIASES_V39[row.id],base=ENCOUNTER_DESIGN_V27.species.find(value=>value.id===alias);
    assert.ok(base,row.id);assert.equal(enemy.planId,alias);assert.deepEqual(enemy.planCycle,base.cadence.cycle);assert.ok(validEnemyPlan(enemy));
    assert.ok(enemy.hp>=36&&enemy.hp<=44);assert.ok(enemy.attackPower>=7&&enemy.attackPower<=9);assert.ok(enemy.armor>=1&&enemy.armor<=2);
    const actor={...unit(row.id),...enemy,hp:1000,maxHp:1000},battle={actors:[unit('hero','party'),actor,unit('support')],log:[],lastDamagingAction:'attack',lastAttackerId:'hero'};
    const helpers={log:text=>battle.log.push(text),damage:(_,target,amount)=>{const damage=Math.min(target.hp,Math.max(0,amount));target.hp-=damage;return damage;}};
    for(let step=0;step<actor.planCycle.length*3;step++){
      assert.equal(executeEnemyPlan(battle,actor,helpers),true);
      for(const member of battle.actors){assert.ok(Number.isFinite(member.hp)&&member.hp>=0&&member.hp<=member.maxHp);for(const value of Object.values(member.status))assert.ok(typeof value==='boolean'||Number.isFinite(value)&&value>=0);}
    }
    assert.equal(actor.aiStep,actor.planCycle.length*3);
  }
});

test('display formatting is read-only and named targets retain exact names, ages, portraits and species',()=>{
  const legacy={name:'cautious iron-tusk boar',illustration:foeArt('boar','beasts',8)},before=structuredClone(legacy);
  assert.equal(enemyDisplayName(legacy),'Cautious Iron-Tusk Boar');assert.deepEqual(legacy,before);
  assert.equal(enemyDisplayName('the last archivist'),'The Last Archivist');
  assert.equal(enemyDisplayName('the watch of the old road'),'The Watch of the Old Road');
  const target={...generateCharacter('named-target','person',{age:37}),name:'Lea de Vries',age:37};
  const humanoid=proceduralEnemies({seed:'named-target',rpg:{}},'bandit',2,'named',target.name,target)[0];
  assert.equal(humanoid.name,target.name);assert.equal(enemyDisplayName(humanoid),target.name);assert.equal(humanoid.illustration.age,37);assert.deepEqual(humanoid.illustration.appearance,target.appearance);
  const suppliedOnly=proceduralEnemies({seed:'named-target'},'bandit',2,'person-only',null,target)[0];assert.equal(suppliedOnly.name,target.name);
  for(const name of ['Hunger ghoul','Mire Toad']){
    const role=name==='Mire Toad'?'beast':'undead',enemy=proceduralEnemies(siteGame('quarry','mountain'),role,2,'exact-target',name)[0];
    assert.equal(enemy.name,name);assert.equal(enemy.illustration.kind,'foe');assert.equal(enemy.illustration.species,name==='Mire Toad'?'marsh_toad':'ghoul');
  }
});

let adult;
async function fresh(){
  if(!adult){
    let s=await createLifeAtAge({seed:'grounded-release-v39',startAge:22,difficulty:'gentle'});
    s=drain(s);assert.ok(E.validateSave(s));adult=s;
  }
  const s=structuredClone(adult);
  // Survival resources and run counter are controlled QA fixtures. Routes,
  // admission, room actions and battle creation use the production APIs.
  s.hero.gold=5000;s.hero.maxHp=s.hero.hp=2000;s.hero.maxMp=s.hero.mp=1000;
  s.hero.skills.stealth=s.hero.skills.persuasion=s.hero.skills.survival=100;s.adventuring.rations=2;
  return s;
}
function drain(s){for(let n=0;s.event&&n<100;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','continue','keep','leave','pause','later'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
function route(m,to){const layout=mazeLayout(m),queue=[[m.position]],seen=new Set([m.position]);for(let i=0;i<queue.length;i++){const path=queue[i],at=path.at(-1);if(at===to)return path.slice(1);for(const next of layout.cells[at].doors)if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}return null;}
function walkTo(s,to){
  for(const next of route(s.maze,to)){
    s=drain(s);
    const clear=E.getActions(s).find(a=>['maze_sneak','maze_parley','maze_disarm'].includes(a.id)&&!a.disabledReason);
    if(clear)s=drain(E.chooseAction(s,clear.id));
    const step=E.getActions(s).find(a=>a.id==='maze_step_'+next&&!a.disabledReason);assert.ok(step,'a real adjoining room is offered');
    s=E.chooseAction(s,step.id);
  }
  return drain(s);
}

test('all 320 ordinary frames can spawn without explicit targets across real world habitats',async()=>{
  const s=await fresh(),seen=new Set(),sites=['forest','marsh','mountain','ruin','port','home'];
  for(let attempt=0;attempt<512&&seen.size<320;attempt++)for(const locationId of sites)for(const role of families){
    assert.ok(s.world.locations.some(site=>site.id===locationId));
    for(const enemy of proceduralEnemies({...s,locationId},role,2,'ordinary-art-'+attempt)){
      const art=enemy.illustration;
      if(newIds.has(art?.species))seen.add(`${art.species}:${art.cell}`);
    }
  }
  assert.equal(seen.size,320,'every ordinary atlas cell is reachable from a real habitat pool');
});

test('all five expanded families appear through offered maze fights and survive a save reload',async()=>{
  const witnessed=new Set();
  for(let run=1;run<=12&&witnessed.size<5;run++){
    let entered=await fresh();entered.mazeBook.nextRun=run;
    const offer=E.getActions(entered).find(a=>a.id==='adventure_descend'&&!a.disabledReason);assert.ok(offer);
    entered=drain(E.chooseAction(entered,offer.id));assert.ok(entered.maze);
    for(const room of mazeLayout(entered.maze).cells.filter(room=>room.kind==='enemy'&&families.includes(room.enemy)&&!witnessed.has(room.enemy))){
      const expected=proceduralEnemies(entered,room.enemy,entered.maze.tier,entered.maze.seed+':enemy:'+room.id);
      if(!expected.some(enemy=>newIds.has(enemy.illustration?.species)))continue;
      let s=walkTo(structuredClone(entered),room.id);
      assert.ok(E.getActions(s).some(a=>a.id==='maze_fight'&&!a.disabledReason));
      s=E.chooseAction(s,'maze_fight');assert.equal(s.battle.context.kind,'maze');
      assert.ok(s.battle.actors.some(actor=>actor.side==='enemy'&&newIds.has(actor.illustration?.species)));
      assert.ok(s.battle.actors.filter(actor=>actor.side==='enemy').every(actor=>validEnemyIllustration(actor.illustration)&&validEnemyPlan(actor)));
      assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))).battle,s.battle);
      witnessed.add(room.enemy);
    }
  }
  assert.deepEqual([...witnessed].sort(),[...families].sort());
});

test('offsite habitat comes from the actual wilderness hex and new foes join a natural danger',()=>{
  const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
  let found=false;
  for(let offset=1;offset<200&&!found;offset++){
    const s=E.migrateSave(structuredClone(fixture.states.offsite)),cell=hexAtlas(s).byKey[s.cartography.position];
    s.day+=offset;s.event=null;s.battle=null;
    assert.deepEqual(enemyEncounterTerrains(s),enemyTerrainAliasesV39(cell.terrain));
    const fired=queueWildernessEncounter(s,cell,{setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};}});
    if(!fired)continue;
    const n=E.chooseEventOption(s,'fight');
    if(!n.battle?.actors.some(actor=>actor.side==='enemy'&&newIds.has(actor.illustration?.species)))continue;
    assert.equal(n.battle.context.mode,'country');assert.ok(E.validateSave(n));
    assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(n))).battle,n.battle);found=true;
  }
  assert.ok(found,'a real natural encounter selects a habitat-appropriate new creature');
});

test('new scripted encounters capitalize their final formation and curse labels without changing source people',async()=>{
  const s=await fresh(),before=structuredClone(s),variants=new Set();
  for(let count=0;count<30&&variants.size<3;count++){
    const battle=createBattle({...s,flags:{...s.flags,battlesStarted:count}},'forest',null,{openingTurns:false});
    variants.add(battle.variant);
    const names=battle.actors.filter(actor=>actor.side==='enemy').map(actor=>actor.name);
    assert.ok(names.includes(battle.variant===2?'Thornback Wolf':'Briar Wolf'));
    assert.ok(names.includes(battle.variant===1?'Road Trapper':'Road Scavenger'));
  }
  assert.equal(variants.size,3);
  for(const id of ['feral_vampire','moon_mauler','vampire_hunters','wolf_hunters','archive_warden']){
    const battle=createBattle(s,id,null,{openingTurns:false});
    for(const actor of battle.actors.filter(actor=>actor.side==='enemy'))assert.equal(actor.name,battleActorDisplayName(actor,battle));
  }
  assert.deepEqual(s,before);
});

test('loaded enemy previews format affected names, inspection notes and blocked targets on a detached copy',async()=>{
  const s=await fresh();s.hero.name='Rook of dusk';
  const battle=createBattle(s,'ruin',null,{openingTurns:false});battle.currentActorId='hero';
  const first=battle.actors.find(actor=>actor.id==='enemy-1'),second=battle.actors.find(actor=>actor.id==='enemy-2');
  first.name='stone sentinel';second.name='Lea de Vries';
  battle.encounterId='free_bandit';
  second.illustration={kind:'person',appearance:generateCharacter('loaded-foe','person',{age:37}).appearance,age:37};
  second.bloodless=false;battle.log=['stone sentinel once struck Rook of dusk.'];
  const hero=battle.actors.find(actor=>actor.id==='hero');hero.condition={type:'vampire',stage:'changed',hunger:30};
  const before=structuredClone(battle);
  for(const action of ['attack','inspect']){
    const preview=previewBattleAction(battle,action,first.id);assert.ok(preview.legal);
    assert.equal(preview.targetName,'Stone Sentinel');assert.match(preview.summary,/Stone Sentinel/);assert.doesNotMatch(preview.summary,/stone sentinel/);
  }
  assert.match(previewBattleAction(battle,'inspect',first.id).summary,/Rook of dusk reads Stone Sentinel:/);
  assert.match(previewBattleAction(battle,'blood',first.id).reason,/^Stone Sentinel carries no blood/);
  assert.equal(previewBattleAction(battle,'attack',second.id).targetName,'Lea de Vries');
  assert.deepEqual(battle,before);
});

test('loaded combat UI formats enemy cards, turn chips and previews while party names and saved history stay exact',async t=>{
  const s=await fresh();
  s.battle={...createBattle(s,'forest',null,{openingTurns:false}),instanceId:'grounded-loaded-name-ui'};
  s.battle.currentActorId='hero';
  s.battle.actors.find(actor=>actor.id==='hero').name='Rook of dusk';
  s.battle.actors.find(actor=>actor.id==='enemy-1').name='briar wolf';
  s.battle.actors.find(actor=>actor.id==='enemy-2').name='road scavenger';
  s.battle.log=['briar wolf once struck Rook of dusk.'];
  assert.ok(E.validateSave(s));const before=structuredClone(s.battle);
  const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');
  assert.deepEqual(ui.root.querySelectorAll('.actor-card.enemy .actor-heading strong').map(node=>node.textContent),['Briar Wolf','Road Scavenger']);
  assert.match(ui.root.querySelectorAll('.actor-card.enemy [role="img"]')[1].getAttribute('aria-label'),/^Road Scavenger:/);
  const chips=ui.root.querySelectorAll('.turn-chip').map(node=>node.textContent);
  assert.ok(chips.includes('Briar Wolf'));assert.ok(chips.includes('Road Scavenger'));assert.ok(chips.includes('Rook of dusk'));
  assert.equal(ui.root.querySelector('.battle-command-panel h2').textContent,'Rook of dusk');
  assert.match(ui.root.querySelector('.battle-topline').textContent,/Round 1 · Rook of dusk has the next move/);
  assert.match(ui.root.querySelector('[data-action-preview="attack"]').textContent,/Briar Wolf/);
  assert.equal(ui.root.querySelector('.battle-recent-log p').textContent,before.log[0]);
  const target=ui.root.querySelector('[name="battle-target"][value="enemy-2"]');target.checked=true;await ui.fire('change',target);
  assert.match(ui.root.querySelector('[data-action-preview="attack"]').textContent,/Road Scavenger/);
  assert.deepEqual(ui.current().battle,before);
});

test('explicit named targets preserve spelling in new battles and older contract UI without a marker',async t=>{
  const s=await fresh();s.locationId='home';syncCartography(s);refreshAdventureBoard(s);
  const contract=s.adventuring.contracts[0];assert.ok(contract);
  Object.assign(contract,{flavorId:'bounty-returning-knight',type:'bounty',targetType:'undead',targetName:'Rook of dusk',status:'active',acceptedDay:s.day});
  delete contract.target;
  s.locationId=contract.destinationId;syncCartography(s);
  const context={kind:'adventure',mode:'contract',token:contract.id,locationId:s.locationId};
  s.battle={...createBattle(s,'free_undead',context,{openingTurns:false}),context,instanceId:'grounded-named-target-ui'};
  s.battle.currentActorId='hero';const target=s.battle.actors.find(actor=>actor.id==='enemy-1');
  assert.equal(target.name,contract.targetName);assert.equal(target.namedTarget,true);
  assert.equal(previewBattleAction(s.battle,'attack',target.id).targetName,contract.targetName);
  assert.ok(E.validateSave(s));
  delete target.namedTarget; // An older saved contract predates display metadata.
  assert.equal(battleNamedTargetId(s,s.battle),target.id);assert.ok(E.validateSave(s));
  const before=structuredClone(s.battle),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');
  assert.equal(ui.root.querySelector('.actor-card.enemy .actor-heading strong').textContent,contract.targetName);
  assert.match(ui.root.querySelector('[data-action-preview="attack"]').textContent,/Rook of dusk:/);
  assert.ok(ui.root.querySelectorAll('.turn-chip').some(node=>node.textContent===contract.targetName));
  assert.deepEqual(ui.current().battle,before);
});
