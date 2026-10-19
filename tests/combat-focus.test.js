import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, getBattleActions, takeBattleAction, previewBattleAction, combatTraining } from '../dist/js/combat.js';
import { combatOutlook, encounterOutlook, combatTrainingView, defeatGuidance } from '../dist/js/combat-guidance.js';
import { applyStatus, resistanceReadout } from '../dist/js/combat-rules.js';
import { attachEnemyPlan, executeEnemyPlan, planIntent } from '../dist/js/enemy-plans-v27.js';
import { TECHNIQUES_V27 } from '../dist/js/techniques-v27.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import * as E from '../dist/js/engine.js';
import { enterDungeon, applyExplorationChoice } from '../dist/js/exploration.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled combat fixtures isolate command effects. They are not audit lives
// or measurements of human play or browser geometry.
function source(specialization='elementalist',count=1,difficulty='balanced'){
 const mage=['elementalist','druid','necromancer'].includes(specialization),healer=specialization==='healer';
 return {seed:'combat-focus-five',revision:5,difficulty,flags:{},realm:{},rpg:{trainedTechniques:TECHNIQUES_V27.map(t=>t.id),companionStages:{}},hero:{name:'Ash',path:mage||healer?'mage':'warrior',specialization,hp:160,maxHp:160,mp:100,maxMp:100,potions:2,level:3,attributes:{strength:5,agility:12,vitality:5,intellect:6,willpower:6,presence:4},skills:{weapons:3,defense:3,arcana:4,devotion:4,stealth:2,survival:3,scholarship:3,persuasion:3}},companions:Array.from({length:count},(_,i)=>({id:['mira','orrin','kest'][i],name:['Mira','Orrin','Kest'][i],role:['guardian','mage','scout'][i],recruited:true,active:true,alive:true,hp:44,maxHp:44,mp:24,maxMp:24,agility:6-i}))};
}
function isolated(specialization='elementalist'){
 const b=createBattle(source(specialization),'ruin',null,{openingTurns:false});
 b.currentActorId='hero';b.turnOrder=['hero','mira',...b.actors.filter(a=>a.side==='enemy').map(a=>a.id)];
 for(const e of b.actors.filter(a=>a.side==='enemy')){e.hp=e.maxHp=500;e.status={};e.resistances=[];e.weakness='physical';}
 return b;
}
const hero=b=>b.actors.find(a=>a.id==='hero'),foe=b=>b.actors.find(a=>a.id==='enemy-1');
const damage=(b,id)=>foe(b).hp-foe(takeBattleAction(b,id,'enemy-1')).hp;
for(const id of ['judgment_vow','winter_prison','chain_lightning','rootbound','soul_unmake'])test(`${id} rewards its caster investment and cannot borrow physical weapon scaling`,()=>{
 const t=TECHNIQUES_V27.find(t=>t.id===id),b=isolated(t.classId),cast=structuredClone(b),physical=structuredClone(b),gear=structuredClone(b);
 const faith=t.classId==='paladin';hero(cast).attributes[faith?'willpower':'intellect']+=8;hero(cast).skills[faith?'devotion':'arcana']+=6;
 hero(physical).attributes.strength+=20;hero(physical).skills.weapons+=20;hero(physical).gear.attack+=20;
 hero(gear).gear.magic+=8;
 assert.ok(damage(cast,'tech_'+id)>damage(b,'tech_'+id));assert.ok(damage(gear,'tech_'+id)>damage(b,'tech_'+id));assert.equal(damage(physical,'tech_'+id),damage(b,'tech_'+id));
});
for(const id of ['shared_renewal','purifying_touch'])test(`${id} converts devotion, willpower and magic into actual healing`,()=>{
 const b=isolated('healer');for(const a of b.actors.filter(a=>a.side==='party'))a.hp=1;
 const trained=structuredClone(b);hero(trained).attributes.willpower+=8;hero(trained).skills.devotion+=6;hero(trained).gear.magic+=4;
 const base=previewBattleAction(b,'tech_'+id,'mira'),bonus=previewBattleAction(trained,'tech_'+id,'mira');
 assert.ok(bonus.effects.find(e=>e.id==='mira').hp>base.effects.find(e=>e.id==='mira').hp);
});
test('an enemy seals the actual last damaging technique for exactly the next accepted decision',()=>{
 let b=isolated();b.actors=b.actors.filter(a=>['hero','enemy-1'].includes(a.id));b.turnOrder=['hero','enemy-1'];
 const e=attachEnemyPlan(foe(b),'oracle',{bossId:'listener_drowned_door'});b.actors[1]=e;e.status={};
 b=takeBattleAction(b,'tech_winter_prison','enemy-1');
 assert.equal(b.currentActorId,'hero');assert.equal(hero(b).sealedTechnique,'tech_winter_prison');
 assert.match(getBattleActions(b).find(a=>a.id==='tech_winter_prison').disabledReason,/sealed/);
 const mp=hero(b).mp,round=b.round;let rejected=takeBattleAction(b,'tech_winter_prison','enemy-1');
 assert.equal(hero(rejected).mp,mp);assert.equal(rejected.round,round);assert.equal(hero(rejected).status.sealed,1);
 b=takeBattleAction(rejected,'defend');assert.equal(hero(b).sealedTechnique,undefined);assert.equal(getBattleActions(b).find(a=>a.id==='tech_winter_prison').disabledReason,undefined);
});
test('a different companion action and rejected target do not consume the sealed actor’s decision',()=>{
 let b=isolated();hero(b).status.sealed=1;hero(b).sealedTechnique='tech_winter_prison';b.currentActorId='mira';b.turnOrder=['mira','hero','enemy-1','enemy-2'];
 b=takeBattleAction(b,'defend');assert.equal(b.currentActorId,'hero');assert.equal(hero(b).status.sealed,1);
 b=takeBattleAction(b,'spell_fire','mira');assert.equal(hero(b).status.sealed,1);b=takeBattleAction(b,'inspect','enemy-1');assert.equal(hero(b).sealedTechnique,undefined);
});
test('burn resistance is honored by both basic fire and the elementalist ability, and study reveals it',()=>{
 for(const action of ['spell_fire','skill']){
  const b=isolated();foe(b).resistances=['burn'];const saved=structuredClone(b),preview=previewBattleAction(b,action,'enemy-1'),after=takeBattleAction(b,action,'enemy-1');
  assert.deepEqual(b,saved);assert.match(preview.summary,/resists burning/);assert.equal(foe(after).status.burn,undefined);assert.ok(foe(after).hp<500);
  const open=structuredClone(b);foe(open).resistances=[];assert.equal(foe(takeBattleAction(open,action,'enemy-1')).status.burn,2);
 }
 const b=isolated();foe(b).resistances=['burn','poison'];const after=takeBattleAction(b,'inspect','enemy-1');assert.match(after.log.join(' '),/Resists status: .*poison, burning/);assert.match(resistanceReadout(foe(after)),/poison/);
});
test('venom respects declared poison resistance on flesh, and bloodless targets lose ward instead',()=>{
 const b=isolated('assassin');foe(b).bloodless=false;foe(b).resistances=['poison'];assert.equal(foe(takeBattleAction(b,'tech_venom_edge','enemy-1')).status.poison,undefined);
 foe(b).resistances=[];assert.equal(foe(takeBattleAction(b,'tech_venom_edge','enemy-1')).status.poison,3);
 foe(b).bloodless=true;foe(b).status.ward=20;const a=takeBattleAction(b,'tech_venom_edge','enemy-1');assert.equal(foe(a).status.poison,undefined);assert.ok(foe(a).status.ward<20);
});
test('enemy strikes and waves share the declared status-resistance contract',()=>{
 for(const [action,status]of [['poisoning_strike','poison'],['poisoning_wave','poison'],['burning_strike','burn'],['burning_wave','burn'],['fear_strike','fear']]){
  for(const resistant of [false,true]){
   const b=isolated(),a=hero(b),e=foe(b);a.resistances=resistant?[status]:[];e.planCycle=[{action,target:'most_injured'}];e.aiStep=0;e.status.charged=4;
   b.actors=b.actors.filter(a=>a.id!=='mira');executeEnemyPlan(b,e,{damage:(_,t,n)=>{t.hp-=n;return n;},log:()=>{}});
   assert.equal(Boolean(a.status[status]),!resistant,action);
  }
 }
 for(const status of ['bleed','poison','burn','fear','silenced','rooted','stunned','weakened']){
  const target={name:'Target',hp:10,status:{},resistances:[status]};assert.equal(applyStatus(target,status,2,2),false);assert.deepEqual(target.status,{});
 }
});
test('staff disruption cancels a real prepared breath and refreshes the announced intent',()=>{
 let b=isolated();hero(b).equipment.weapon='oak_staff';const e=foe(b);e.planCycle=[{action:'burning_wave',target:'all_party'}];e.aiStep=0;e.status.charged=4;e.status.stolenWard=3;e.status.ward=10;e.intent=planIntent(e);
 const preview=previewBattleAction(b,'weapon_counter','enemy-1');assert.match(preview.summary,/charge cleared/);b=takeBattleAction(b,'weapon_counter','enemy-1');
 assert.equal(foe(b).status.charged,undefined);assert.equal(foe(b).status.stolenWard,undefined);assert.equal(foe(b).status.ward,2);assert.match(foe(b).intent,/charge is broken/);
 // The next enemy action cannot turn the interrupted breath into party damage.
 const before=hero(b).hp;b=takeBattleAction(b,'defend');assert.equal(hero(b).hp,before);assert.ok(b.log.some(t=>/broken breath/.test(t)));
});
test('target previews use the command resolver for damage, healing, wards and cleanses without side effects',()=>{
 for(const [specialization,action,target]of [['elementalist','spell_fire','enemy-1'],['elementalist','tech_chain_lightning','enemy-2'],['guardian','tactic','mira'],['healer','skill','mira'],['bard','skill','mira'],['healer','tech_purifying_touch','mira'],['ranger','tactic','enemy-1']]){
  const b=isolated(specialization);const ally=b.actors.find(a=>a.id==='mira');ally.hp=20;ally.status=action==='tech_purifying_touch'?{poison:3,poisonTurns:2}:{};foe(b).status.ward=5;const original=structuredClone(b);
  const p=previewBattleAction(b,action,target),after=takeBattleAction(b,action,target);assert.equal(p.legal,true);assert.deepEqual(b,original);
  for(const row of p.effects){const x=b.actors.find(a=>a.id===row.id),y=after.actors.find(a=>a.id===row.id);assert.equal(row.hp,y.hp-x.hp);assert.equal(row.ward,(y.status.ward||0)-(x.status.ward||0));}
 }
});
test('a full-health heal, wrong-side target, potion and elemental resistance explain the actual selected result',()=>{
 const b=isolated('healer');b.actors.find(a=>a.id==='mira').hp=12;
 assert.equal(previewBattleAction(b,'skill','hero').legal,true,'a new ward is useful even at full health');
 hero(b).status.ward=3;assert.match(previewBattleAction(b,'skill','hero').reason,/full health/);
 assert.equal(previewBattleAction(b,'skill','enemy-1').legal,false);assert.equal(previewBattleAction(b,'potion','hero').legal,false);
 const p=previewBattleAction(b,'potion','mira');assert.equal(p.cost,'1 potion');assert.match(p.summary,/\+30 HP/);
 foe(b).resistances=['fire'];const fire=previewBattleAction(b,'spell_fire','enemy-1');assert.match(fire.summary,/reduces this hit by 30%/);
});
test('silence constrains a real spell choice and clears after a legal physical action',()=>{
 let b=isolated();hero(b).status.silenced=1;
 for(const id of ['skill','spell_fire','tech_winter_prison'])assert.match(getBattleActions(b).find(a=>a.id===id).disabledReason,/Silenced/);
 b=takeBattleAction(b,'attack','enemy-1');assert.equal(hero(b).status.silenced,undefined);
});
test('life training presents uncapped records beside bounded combat values and actual armor',()=>{
 const s=source();s.hero.skills.scholarship=900;s.hero.skills.defense=900;s.hero.attributes.intellect=900;const before=structuredClone(s),v=combatTrainingView(s);
 assert.deepEqual(s,before);assert.equal(v.rows.find(r=>r.id==='scholarship').raw,900);assert.equal(v.rows.find(r=>r.id==='scholarship').effective,combatTraining(900));assert.equal(v.armor,Math.floor(combatTraining(900)/3));assert.match(v.explanation,/up to 36/);assert.ok(v.arcane<100);
});
test('solo and full-party outlooks count real actions and preserve the inspected source',()=>{
 const solo=source('guardian',0),full=source('guardian',3),before=structuredClone(full);const a=encounterOutlook(solo,'covenant_guardian'),b=encounterOutlook(full,'covenant_guardian');
 assert.equal(a.partyActions,1);assert.equal(b.partyActions,4);assert.equal(b.enemyActions,3);assert.notEqual(a.mode,b.mode);assert.deepEqual(full,before);assert.match(b.caveat,/Rough estimate/);
});
test('perilous guardian durability is fixed across party sizes and leaves earned offensive investment intact',()=>{
 const s=source('guardian',0,'perilous'),full=source('guardian',3,'perilous');const solo=createBattle(s,'covenant_guardian',null,{openingTurns:false}),party=createBattle(full,'covenant_guardian',null,{openingTurns:false});
 assert.deepEqual(solo.actors.filter(a=>a.side==='enemy'),party.actors.filter(a=>a.side==='enemy'));
 const balanced=createBattle({...s,difficulty:'balanced'},'covenant_guardian',null,{openingTurns:false});assert.ok(foe(solo).maxHp>foe(balanced).maxHp*1.4);
 const normal=isolated('guardian'),earned=structuredClone(normal);hero(earned).gear.attack+=20;assert.ok(damage(earned,'attack')>damage(normal,'attack'));
});
test('defeat gives a reason and optional next route for a solo civilian',()=>{
 const b=createBattle(source('guardian',0),'ruin',null,{openingTurns:false});hero(b).role='civilian';hero(b).hp=0;
 assert.match(defeatGuidance(b),/alone/);assert.match(defeatGuidance(b),/Health & care/);assert.match(defeatGuidance(b),/negotiated passage or another route/);
});

let baseline=await createLifeAtAge({seed:'combat-public-handlers-five',startAge:18,difficulty:'gentle'});
for(let i=0;baseline.event&&i<20;i++)baseline=E.chooseEventOption(baseline,(baseline.event.choices.find(c=>['care','later','keep','continue'].includes(c.id)&&!c.disabledReason)||baseline.event.choices.find(c=>!c.disabledReason)).id);
function publicBattle(){const s=structuredClone(baseline);s.event=null;s.battle={...createBattle(s,'forest'),instanceId:'focus-five-public'};assert.ok(E.validateSave(s));return s;}
test('new and old battle snapshots remain importable before and after real actions',()=>{
 let s=publicBattle();const before=structuredClone(s);for(let i=0;s.battle&&!s.battle.outcome&&i<3;i++){s=E.chooseBattleAction(s,'defend');assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);}
 assert.deepEqual(before,publicBattle());const malformed=structuredClone(s);malformed.battle.actors.find(a=>a.side==='enemy').resistances=['invented'];assert.equal(E.validateSave(malformed),false);
});
test('public defeat resolution records actionable recovery once and still validates',()=>{
 let s=publicBattle();for(const a of s.battle.actors.filter(a=>a.side==='party'))a.hp=0;s.battle.outcome='defeat';s.battle.currentActorId=null;s.battle.turnOrder=s.battle.actors.filter(a=>a.hp>0).map(a=>a.id);
 const complete=structuredClone(s.battle),day=s.day;s=E.resolveBattle(s,complete);assert.ok(E.validateSave(s));assert.ok(s.journal.some(j=>/Next: recover health/.test(j.text)));assert.ok(s.day>=day);const again=E.resolveBattle(s,complete);assert.equal(again.hero.gold,s.hero.gold);
});
test('peaceful proof, repair, safe passage and the final objective report concrete progress without combat spoils',()=>{
 const s=structuredClone(baseline);s.locationId='marsh';syncCartography(s);s.hero.skills.scholarship=10;s.hero.skills.survival=10;s.hero.skills.persuasion=10;for(const key of Object.keys(s.hero.skills))s.hero.skills[key]=10;s.equipment.materials.ore=5;s.equipment.materials.cloth=5;
 const ctx={setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},spendDays:()=>{s.day++;},journal:(title,text)=>s.journal.push({title,text}),standing:()=>{}};
 assert.equal(enterDungeon(s,'cistern',null,ctx),true);
 function choose(id){const e=s.event;assert.ok(e.choices.find(c=>c.id===id&&!c.disabledReason),id);s.event=null;assert.equal(applyExplorationChoice(s,e.id,id,ctx),true);}
 const gold=s.hero.gold,exp=s.hero.exp;
 choose('route_service');choose('repair_route');assert.match(s.notice,/Passage secured/);assert.match(s.notice,/Practical aid completed/);assert.match(s.notice,/Negotiation evidence preserved/);
 assert.equal(s.hero.gold,gold);assert.equal(s.hero.exp,exp);
 // The generated layout has a stable maintenance route to the optional cache,
 // then its boss. Follow actual offered room IDs rather than inventing passage.
 const definition=s.dungeon.definition;const boss=definition.rooms.find(r=>r.kind==='boss');
 const path=(from,to)=>{const queue=[[from]],seen=new Set();while(queue.length){const p=queue.shift(),last=p.at(-1);if(last===to)return p;seen.add(last);for(const n of definition.rooms.find(r=>r.id===last).exits)if(!seen.has(n))queue.push([...p,n]);}};
 for(const id of path(s.dungeon.roomId,boss.id).slice(1)){if(!s.event.choices.some(c=>c.id==='route_'+id)){const offered=s.event.choices.find(c=>['take','preserve','search','parley'].includes(c.id)&&!c.disabledReason);assert.ok(offered);choose(offered.id);}choose('route_'+id);}
 const beforeParley=s.hero.gold;if(s.event.choices.some(c=>c.id==='listen'))choose('listen');choose('parley');assert.equal(s.hero.gold,beforeParley);assert.match(s.notice,/Progress is kept on return/);assert.equal(s.battle,null);
 const objective=definition.rooms.find(r=>r.kind==='objective');for(const id of path(s.dungeon.roomId,objective.id).slice(1))choose('route_'+id);choose('finish');assert.match(s.notice,/Expedition objective completed/);assert.equal(s.hero.gold,beforeParley);assert.equal(s.hero.exp,exp);
});
test('production combat controls expose target previews and update them when a support target changes',async t=>{
 const s=publicBattle();s.battle.currentActorId='hero';const a=hero(s.battle);a.role='healer';a.specialization='healer';a.mp=20;a.status={};a.hp=a.maxHp;a.skills.devotion=4;
 const friend=s.companions[0];friend.recruited=true;friend.active=true;friend.hp=12;const b=createBattle({...s,hero:{...s.hero,specialization:'healer',path:'mage'}},'forest',null,{openingTurns:false});
 // Captured actors are QA fixtures; the handler still reads the production UI.
 s.battle=b;s.battle.instanceId='focus-five-ui';s.battle.currentActorId='hero';hero(s.battle).hp=hero(s.battle).maxHp;hero(s.battle).status.ward=3;assert.ok(E.validateSave(s));
 const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');assert.match(ui.root.innerHTML,/data-action-preview="skill"/);assert.match(ui.root.innerHTML,/already at full health/);
 const control=ui.root.querySelector(`[name="battle-ally-target"][value="${friend.id}"]`);assert.ok(control);control.checked=true;await ui.fire('change',control);
 const preview=ui.root.querySelector('[data-action-preview="skill"]');assert.ok(preview);assert.ok(!ui.root.querySelector('[data-op="battle-action"][data-id="skill"]').disabled);
 await ui.click('battle-action','skill');assert.ok(ui.current().battle.log.some(l=>/recovers/.test(l)));assert.ok(E.validateSave(ui.current()));
});
