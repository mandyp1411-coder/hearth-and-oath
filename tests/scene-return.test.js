import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSceneReturn, validSceneReturn, sceneReturnForNavigation, sceneReturnPresentation, sceneReturnSource, sceneUtilityTab } from '../dist/js/scene-return.js';

// Pure fixtures only: no engine import, DOM, life generation, save migration,
// build, VM or browser. Handler integration is in scene-return-ui.test.js.
function setup(kind='work'){
 const game={seed:'one-seed',phase:'adult',day:8000,age:22,hero:{id:'hero',name:'Rowan',alive:true},locationId:'village',timeline:{birthDay:1},dynasty:{generation:1},cartography:{position:'1,2',interior:{siteId:'village',roomId:'workyard'}}};
 const person={id:'actual-'+kind,name:'Avery',age:40,alive:true,available:true,locationId:'village',roomId:'workyard'};
 const provider={id:kind+'-village',kind,personId:person.id,person,name:person.name,here:true,locationId:'village',roomId:'workyard'};
 const calls={services:0,people:0};
 const readers={services(){calls.services++;return [provider];},people(){calls.people++;return [person];}};
 const context={game,slot:0,revision:7,conflict:false},origin={kind:'service',id:provider.id};
 return {game,person,provider,readers,calls,context,origin};
}
const capture=f=>captureSceneReturn(f.context,f.origin,f.readers,{serviceTopic:'commissions'});
function outdoorSetup(){
 const f=setup('mentor');f.game.locationId='forest';f.game.cartography.interior=null;
 f.game.world={locations:[{id:'forest',type:'forest',status:'thriving',services:['guide','herbs']}]};
 Object.assign(f.person,{locationId:'forest',npcSlot:{kind:'mentor',classId:'druid',siteId:'forest'}});delete f.person.roomId;
 Object.assign(f.provider,{id:'mentor-druid',subjectId:'druid',locationId:'forest',roomId:'trail'});f.origin.id=f.provider.id;
 return f;
}

test('an actual outdoor mentor binds their class identity and trail without inventing an interior',()=>{
 const f=outdoorSetup(),trail=capture(f);assert.ok(trail);assert.equal(trail.source.provider.roomId,'trail');assert.equal(validSceneReturn(trail,f.context,f.readers),true);assert.equal(f.game.cartography.interior,null);
});

for(const [name,change] of [
 ['location',f=>f.game.locationId='ruin'],['person location',f=>f.person.locationId='ruin'],['provider location',f=>f.provider.locationId='ruin'],['provider person',f=>f.provider.personId='replacement'],['person identity',f=>f.person.id='replacement'],['class identity',f=>f.person.npcSlot.classId='ranger'],['provider identity',f=>f.provider.id='mentor-ranger'],['provider kind',f=>f.provider.kind='work'],['provider room',f=>f.provider.roomId='workyard'],['availability',f=>f.person.available=false],['here-only status',f=>f.provider.here=false],['settlement',f=>f.game.world.locations[0].type='village'],['interior',f=>f.game.cartography.interior={siteId:'forest',roomId:'gate'}],
])test('an outdoor mentor rejects changed '+name+', rather than relaxing ordinary room ownership',()=>{
 const f=outdoorSetup(),trail=capture(f);assert.ok(trail);change(f);assert.equal(validSceneReturn(trail,f.context,f.readers),false);assert.equal(capture(f),null);
});

test('an outdoor non-mentor cannot bypass the exact provider room check',()=>{
 const f=outdoorSetup();f.provider.kind='work';assert.equal(capture(f),null);
});

test('a one-entry trail reopens only the exact unchanged source and retains no full-save clone',()=>{
 const f=setup();Object.defineProperty(f.game,'unrelated',{enumerable:true,get(){throw Error('No full-save serialization is permitted');}});
 const trail=capture(f);assert.equal(trail.game,f.game);assert.equal(trail.hero,f.game.hero);assert.equal(trail.source.personId,f.person.id);assert.equal(trail.presentation.topic,'commissions');assert.equal(validSceneReturn(trail,f.context,f.readers),true);assert.deepEqual(f.calls,{services:2,people:0});
});

for(const tab of ['inventory','journal','quests','lore'])test(tab+' starts a detour from an actual place only',()=>{
 const f=setup(),trail=sceneReturnForNavigation(null,'place',tab,f.context,f.origin,f.readers);
 assert.ok(trail);assert.equal(sceneUtilityTab(tab),true);assert.equal(sceneReturnForNavigation(null,'relationships',tab,f.context,f.origin,f.readers),null);
});

test('Inventory ↔ Journal keeps one exact origin and unrelated navigation discards it',()=>{
 const f=setup(),trail=capture(f);
 for(const [from,to] of [['inventory','journal'],['journal','inventory'],['journal','notes'],['inventory','place'],['inventory','life'],['inventory','map'],['inventory','relationships']]){
  assert.equal(sceneReturnForNavigation(trail,from,to,f.context,null,f.readers),sceneUtilityTab(to)?trail:null);
 }
});

for(const [name,change] of [
 ['slot',f=>f.context.slot++],['revision',f=>f.context.revision++],['exact game object',f=>f.context.game={...f.game}],['active hero object',f=>f.game.hero={...f.game.hero}],['hero identity',f=>f.game.hero.name='Successor'],['generation',f=>f.game.dynasty.generation++],['seed',f=>f.game.seed='other'],['birth day',f=>f.game.timeline.birthDay++],['day',f=>f.game.day++],['age',f=>f.game.age++],['location',f=>f.game.locationId='elsewhere'],['room',f=>f.game.cartography.interior.roomId='market'],['interior site',f=>f.game.cartography.interior.siteId='elsewhere'],['physical position',f=>f.game.cartography.position='3,4'],['save conflict',f=>f.context.conflict=true],
 ['absent provider',f=>f.readers.services=()=>[]],['replacement provider',f=>f.provider.personId='successor'],['provider subject',f=>f.provider.subjectId='different-service'],['provider role',f=>f.provider.kind='smith'],['provider not here',f=>f.provider.here=false],['participant change',f=>f.person.name='Changed name'],['unavailable participant',f=>f.person.available=false],['dead participant',f=>f.person.alive=false],['retired participant',f=>f.person.retired=true],
])test(name+' invalidates a previously captured scene',()=>{
 const f=setup(),trail=capture(f);assert.ok(trail);change(f);assert.equal(validSceneReturn(trail,f.context,f.readers),false);assert.equal(sceneReturnForNavigation(trail,'inventory','journal',f.context,null,f.readers),null);
});

for(const [name,change] of [
 ['event',f=>f.game.event={id:'mandatory'}],['battle',f=>f.game.battle={id:'actual'}],['pending reply',f=>f.game.conversations={pending:{personId:f.person.id}}],['journey',f=>f.game.timeline.journey={destination:'elsewhere'}],['offsite',f=>f.game.cartography.offsite=true],['pending crossing',f=>f.game.cartography.pending={}],['prison',f=>f.game.justice={prison:{}}],['maze',f=>f.game.maze={}],['dungeon',f=>f.game.dungeon={}],['expedition',f=>f.game.rpg={expedition:{}}],['adventuring descent',f=>f.game.adventuring={expedition:{}}],['ended life',f=>f.game.hero.alive=false],['retirement',f=>f.game.phase='retired'],
])test(name+' wins without looking up any provider',()=>{
 const f=setup(),trail=capture(f);change(f);const before={...f.calls};assert.equal(validSceneReturn(trail,f.context,f.readers),false);assert.equal(capture(f),null);assert.deepEqual(f.calls,before);
});

test('ordinary people must still be exactly present; a known remote record is not a scene',()=>{
 const f=setup();f.origin={kind:'person',id:f.person.id};f.readers.services=()=>[];
 const trail=capture(f);assert.ok(trail);assert.equal(validSceneReturn(trail,f.context,f.readers),true);
 f.person.locationId='distant';assert.equal(validSceneReturn(trail,f.context,f.readers),false);assert.equal(capture(f),null);
});

test('a person who is also a provider cannot return to an archived or replacement provider',()=>{
 const f=setup();f.origin={kind:'person',id:f.person.id};const trail=capture(f);assert.ok(trail);
 f.readers.services=()=>[];assert.equal(validSceneReturn(trail,f.context,f.readers),false);
});

test('an unavailable, underage or different-room person never creates a trail',()=>{
 for(const change of [f=>f.person.available=false,f=>f.person.minAge=50,f=>f.person.roomId='market',f=>f.readers.people=()=>[]]){
  const f=setup();f.readers.services=()=>[];f.origin={kind:'person',id:f.person.id};change(f);assert.equal(capture(f),null);
 }
});

test('trade projection keeps only browsing preferences, never draft/selection/quote or confirmation',()=>{
 const f=setup('materials'),source=sceneReturnSource(f.game,f.origin,f.readers),shopSession={vendor:'materials',mode:'trade',query:'hide',filter:'materials',selected:'buy:material:hide',draft:{buy:[{id:'material:hide',quantity:1}],sell:[]},quote:{goldDue:15},confirmation:true};
 const before=JSON.stringify(shopSession),view=sceneReturnPresentation(source,{shopSession});
 assert.deepEqual(view,{topic:null,craft:null,shop:{vendor:'materials',mode:'trade',filter:'materials',query:'hide'}});assert.equal(JSON.stringify(shopSession),before);assert.equal(view.shop.draft,undefined);assert.equal(view.shop.selected,undefined);assert.equal(view.shop.quote,undefined);
 shopSession.vendor='outfitter';assert.equal(sceneReturnPresentation(source,{shopSession}).shop,null);
});

test('craft projection drops the selected design and quote, and cannot claim a different artisan',()=>{
 const f=setup('smith'),source=sceneReturnSource(f.game,f.origin,f.readers),craftSession={serviceId:f.provider.id,personId:f.person.id,locationId:'village',mode:'craft',category:'equipment',filter:'all',query:'gambeson',finish:'plain',selected:'workshop_craft_padded_gambeson',quote:'old-quote',confirmation:true};
 const view=sceneReturnPresentation(source,{craftSession});assert.deepEqual(view.craft,{category:'equipment',filter:'all',query:'gambeson',finish:'plain'});assert.equal(view.craft.selected,undefined);assert.equal(view.craft.quote,undefined);assert.equal(craftSession.quote,'old-quote');
 craftSession.personId='successor';assert.equal(sceneReturnPresentation(source,{craftSession}).craft,null);
});

test('a fresh scene replaces rather than stacks the old scene, and clearing is represented by null',()=>{
 const f=setup(),old=capture(f);f.provider.kind='smith';const next=sceneReturnForNavigation(old,'place','inventory',f.context,f.origin,f.readers);
 assert.notEqual(next,old);assert.equal(next.source.provider.kind,'smith');assert.equal(validSceneReturn(null,f.context,f.readers),false);assert.equal(sceneReturnForNavigation(null,'inventory','journal',f.context,null,f.readers),null);
});


test('a person view never inherits a leftover service, shop or workbench view',()=>{
 const f=setup('smith');f.origin={kind:'person',id:f.person.id};const source=sceneReturnSource(f.game,f.origin,f.readers);
 assert.deepEqual(sceneReturnPresentation(source,{serviceTopic:'commissions',craftSession:{serviceId:f.provider.id,personId:f.person.id,mode:'craft',selected:'old'},shopSession:{vendor:'materials',mode:'trade'}}),{topic:null,craft:null,shop:null});
});

test('an exact inn repertoire scene keeps only its read-only topic, not a performance draft or quote',()=>{
 const f=setup('inn'),source=sceneReturnSource(f.game,f.origin,f.readers),presentation={serviceTopic:'repertoire',performance:{pieceId:'private',revision:4},quote:{days:2},permission:{copy:true}};
 const before=structuredClone(presentation);assert.deepEqual(sceneReturnPresentation(source,presentation),{topic:'repertoire',craft:null,shop:null});assert.deepEqual(presentation,before);
});

test('service-topic projection rejects other providers and mismatched topics',()=>{
 for(const [kind,topic] of [['work','repertoire'],['inn','commissions'],['inn','unknown'],['smith','repertoire'],['merchant','repertoire']]){
  const f=setup(kind),source=sceneReturnSource(f.game,f.origin,f.readers);assert.equal(sceneReturnPresentation(source,{serviceTopic:topic}).topic,null);
 }
});

test('a person view of an innkeeper cannot inherit the repertoire service topic',()=>{
 const f=setup('inn');f.origin={kind:'person',id:f.person.id};const source=sceneReturnSource(f.game,f.origin,f.readers);assert.equal(sceneReturnPresentation(source,{serviceTopic:'repertoire'}).topic,null);
});
