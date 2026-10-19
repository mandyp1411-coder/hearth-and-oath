import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, getBattleActions, takeBattleAction, previewBattleAction } from '../dist/js/combat.js';
import { advancedTechnique } from '../dist/js/techniques-v27.js';

// Small command-effect fixtures, not evidence of earned progression or win rate.
function battle(specialization='bard') {
 const b=createBattle({revision:5,seed:'second-wind-contract',difficulty:'balanced',flags:{},rpg:{trainedTechniques:['second_wind'],companionStages:{}},hero:{name:'Bard',path:specialization==='guardian'?'warrior':'rogue',specialization,hp:35,maxHp:56,mp:10,maxMp:25,potions:0,level:1,attributes:{strength:3,agility:8,vitality:4,intellect:3,willpower:3,presence:3},skills:{weapons:0,defense:0,arcana:0,devotion:0,stealth:1,survival:0,scholarship:2,persuasion:8}},companions:[{id:'mira',name:'Mira',role:'warrior',recruited:true,active:true,hp:25,maxHp:58,mp:4,maxMp:22,agility:5}]},'road_bandits',null,{openingTurns:false});
 // Another living party member is next, so no enemy reply obscures command deltas.
 b.currentActorId='hero';b.turnOrder=['hero','mira',...b.actors.filter(a=>a.side==='enemy').map(a=>a.id)];
 return b;
}
const actor=(b,id='hero')=>b.actors.find(a=>a.id===id);
const withoutLog=b=>({...b,log:[]});
for(const target of ['hero',undefined])test(`Second Wind ${target||'default self'} pays its full self cost and keeps recovery`,()=>{
 const b=battle(),a=actor(b);a.mp=5;a.status={fear:2,ward:2};const saved=structuredClone(b),preview=previewBattleAction(b,'tech_second_wind',target),n=takeBattleAction(b,'tech_second_wind',target);
 assert.deepEqual(b,saved);assert.equal(preview.legal,true);assert.equal(actor(n).mp,0);assert.equal(actor(n).hp,a.hp+8);assert.equal(actor(n).status.ward,6);assert.equal(actor(n).status.fear,undefined);assert.equal(n.currentActorId,'mira');assert.equal(getBattleActions(n).some(a=>a.id==='tech_second_wind'),false); // The next party member does not inherit this learned action.
 const effect=preview.effects.find(e=>e.id==='hero');assert.deepEqual([effect.hp,effect.mp,effect.ward],[8,-5,4]);
});
test('Second Wind transfers 5 MP to another ally without refunding its caster',()=>{
 const b=battle();actor(b,'mira').status={fear:2,ward:1};const p=previewBattleAction(b,'tech_second_wind','mira'),n=takeBattleAction(b,'tech_second_wind','mira');
 assert.equal(actor(n).mp,5);assert.equal(actor(n,'mira').mp,9);assert.equal(actor(n,'mira').hp,33);assert.equal(actor(n,'mira').status.ward,5);assert.equal(actor(n,'mira').status.fear,undefined);assert.deepEqual([p.effects.find(e=>e.id==='mira').hp,p.effects.find(e=>e.id==='mira').mp],[8,5]);
});
test('ally and self healing, MP and ward stay capped',()=>{
 for(const id of ['hero','mira']){const b=battle(),a=actor(b,id);a.hp=a.maxHp-1;a.mp=a.maxMp-1;a.status.ward=99;const n=takeBattleAction(b,'tech_second_wind',id);assert.equal(actor(n,id).hp,a.maxHp);assert.equal(actor(n,id).status.ward,100);assert.equal(actor(n,id).mp,id==='hero'?a.maxMp-6:a.maxMp);}
});
for(const target of ['missing','enemy-1','dead'])test(`invalid ${target} target never spends resources or a turn`,()=>{
 const b=battle();if(target==='dead')actor(b,'mira').hp=0;const id=target==='dead'?'mira':target,p=previewBattleAction(b,'tech_second_wind',id),n=takeBattleAction(b,'tech_second_wind',id);assert.equal(p.legal,false);assert.deepEqual(withoutLog(n),withoutLog(b));
});
for(const state of ['insufficient','silenced','sealed','untrained'])test(`${state} Second Wind is a safe no-op, including stale requests`,()=>{
 const b=battle();if(state==='insufficient')actor(b).mp=4;if(state==='silenced')actor(b).status.silenced=1;if(state==='sealed'){actor(b).status.sealed=1;actor(b).sealedTechnique='tech_second_wind';}if(state==='untrained')actor(b).trainedTechniques=[];
 const n=takeBattleAction(b,'tech_second_wind','hero');assert.equal(previewBattleAction(b,'tech_second_wind','hero').legal,false);assert.deepEqual(withoutLog(n),withoutLog(b));
});
test('retained Bard training obeys the same cost under an active Guardian calling',()=>{
 const b=battle('guardian'),n=takeBattleAction(b,'tech_second_wind','hero');assert.ok(getBattleActions(b).some(a=>a.id==='tech_second_wind'));assert.equal(actor(n).mp,5);assert.equal(actor(n).hp,43);
});
test('a companion self-cast has no refund, but their ally transfer remains intact',()=>{
 for(const id of ['mira','hero']){const b=battle();actor(b,'mira').trainedTechniques=['second_wind'];actor(b,'mira').mp=8;b.currentActorId='mira';b.turnOrder=['mira','hero',...b.actors.filter(a=>a.side==='enemy').map(a=>a.id)];const n=takeBattleAction(b,'tech_second_wind',id);assert.equal(actor(n,'mira').mp,3);assert.equal(actor(n,'hero').mp,id==='hero'?15:10);}
});
test('a stale repeat after an exact-cost self-cast cannot recast on the next actor',()=>{
 const b=battle();actor(b).mp=5;const once=takeBattleAction(b,'tech_second_wind','hero'),again=takeBattleAction(once,'tech_second_wind','hero');assert.deepEqual(withoutLog(again),withoutLog(once));const returned=takeBattleAction(once,'defend');assert.equal(returned.currentActorId,'hero');assert.match(getBattleActions(returned).find(a=>a.id==='tech_second_wind').disabledReason,/MP/);
});
test('Defend retains its explicit 2 MP recovery and guarded turn',()=>{
 const b=battle();actor(b).mp=0;const n=takeBattleAction(b,'defend');assert.equal(actor(n).mp,2);assert.equal(actor(n).defending,true);assert.equal(actor(n).status.protecting,true);assert.equal(n.currentActorId,'mira');
});
test('Second Wind tells the player that only another ally receives MP',()=>{
 assert.match(advancedTechnique('second_wind').description,/another ally|other ally/i);assert.match(advancedTechnique('second_wind').description,/8 HP/);assert.match(advancedTechnique('second_wind').description,/4 ward/);
});

test('an ally without a magic pool still receives the non-MP benefits',()=>{const b=battle();actor(b,'mira').mp=actor(b,'mira').maxMp=0;const n=takeBattleAction(b,'tech_second_wind','mira');assert.equal(actor(n,'mira').mp,0);assert.equal(actor(n,'mira').hp,33);assert.equal(actor(n,'mira').status.ward,4);assert.equal(actor(n).mp,5);});

test('full-health fully warded self use remains legal and still pays its cost',()=>{const b=battle();actor(b).hp=actor(b).maxHp;actor(b).status.ward=100;const n=takeBattleAction(b,'tech_second_wind','hero');assert.equal(actor(n).hp,actor(b).hp);assert.equal(actor(n).mp,5);assert.equal(actor(n).status.ward,100);assert.equal(n.currentActorId,'mira');});

test('basic Rallying Verse retains its separate one-MP self tradeoff',()=>{const b=battle(),n=takeBattleAction(b,'skill','hero');assert.equal(actor(n).hp,41);assert.equal(actor(n).mp,9);assert.equal(actor(n).status.ward,4);});

test('a JSON round trip preserves accepted and rejected Second Wind behavior',()=>{const b=battle();actor(b).mp=5;const copy=JSON.parse(JSON.stringify(b));assert.deepEqual(takeBattleAction(copy,'tech_second_wind','hero'),takeBattleAction(b,'tech_second_wind','hero'));const n=takeBattleAction(takeBattleAction(copy,'tech_second_wind','hero'),'defend');assert.equal(n.currentActorId,'hero');assert.equal(actor(n).mp,0);const rejected=takeBattleAction(JSON.parse(JSON.stringify(n)),'tech_second_wind','hero');assert.deepEqual(rejected,takeBattleAction(n,'tech_second_wind','hero'));assert.deepEqual(withoutLog(rejected),withoutLog(n));});

test('two trained allies retain MP-neutral mutual support, rather than self refunds',()=>{
 const b=battle();actor(b,'mira').trainedTechniques=['second_wind'];actor(b,'mira').mp=10;
 const first=takeBattleAction(b,'tech_second_wind','mira');assert.deepEqual([actor(first).mp,actor(first,'mira').mp],[5,15]);
 const second=takeBattleAction(first,'tech_second_wind','hero');assert.deepEqual([actor(second).mp,actor(second,'mira').mp],[10,10]);
});
