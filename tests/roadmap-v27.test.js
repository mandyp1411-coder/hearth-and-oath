import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { generateCharacter } from '../dist/js/characters.js';
import { LINKED_PORTRAIT_FAMILIES_V27 } from '../dist/js/linked-portraits-v27.js';
import { LINKED_CURSE_ATLASES_V27 } from '../dist/js/linked-curse-art-v27.js';
import { GROUNDED_PORTRAIT_FAMILIES_V39 } from '../dist/js/grounded-portraits-v39.js';
import { CURSE_STYLE_OVERRIDES_V39 } from '../dist/js/curse-style-v39.js';
import { linkedPortraitFamily, selectedPortraitArt } from '../dist/js/portrait-library.js';
import { REGIONAL_STORIES_V27 } from '../dist/js/regional-stories-v27.js';
import { TECHNIQUES_V27 } from '../dist/js/techniques-v27.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { COMPANION_DIALOGUE_V27 } from '../dist/js/companion-dialogue-v27.js';
import { regionalAnchor, rpgActions, addRpgService } from '../dist/js/rpg-depth-v27.js';
import { initializeBossStories, bossChoiceReason, resolveBossApproach } from '../dist/js/boss-stories-v27.js';
import { createBattle, takeBattleAction, getBattleActions } from '../dist/js/combat.js';
import { encounterIds } from '../dist/js/exploration.js';
import { linkedTransformationPortrait } from '../dist/js/linked-transformations-v27.js';
import { normalizeAppearance, renderAvatar } from '../dist/js/avatar.js';
import { attachEnemyPlan, executeEnemyPlan, planIntent } from '../dist/js/enemy-plans-v27.js';
import { refreshStoryTrade } from '../dist/js/realm.js';

const fresh=async seed=>{let s=await createLifeAtAge({seed,startAge:18,difficulty:'gentle'});while(s.event)s=E.chooseEventOption(s,s.event.choices.find(c=>c.id==='care')?.id||s.event.choices[0].id);return s;};
const settle=s=>{for(let i=0;i<100;i++){if(s.event){const c=s.event.choices.find(c=>['care','continue','leave','later','pause','animal'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}else if(s.rpg.project)s=E.chooseAction(s,'rpg_continue');else return s;assert.ok(E.validateSave(s));}throw Error('Could not settle actual interruption');};
test('new NPCs combine legacy and modern families across seven age stages in every race',()=>{
 assert.equal(LINKED_PORTRAIT_FAMILIES_V27.length,256);
 assert.equal(GROUNDED_PORTRAIT_FAMILIES_V39.length,216);const sources=new Set();
 for(const race of ['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'])for(let i=0;i<20;i++){const p=generateCharacter('age-identity',race+i,{ancestry:race,age:27}),family=linkedPortraitFamily(p.appearance);assert.ok(family);sources.add(family.modern?'modern':'legacy');assert.equal(Object.keys(p.appearance.portraitSelections).length,7);for(const [stage,age]of [['infant',0],['child',7],['adolescent',15],['adult',27],['mature',45],['older',58],['elder',70]]){const art=selectedPortraitArt(p.appearance,p.appearance.preset,{age});assert.equal(art.key,p.appearance.portraitSelections[stage]);assert.equal(art.ancestry,race);if(family.selections[stage])assert.equal(art.key,family.selections[stage]);if(['mature','older'].includes(stage)){assert.ok(art.modern);assert.notEqual(art.key,family.selections.adult);}}}
 assert.deepEqual([...sources].sort(),['legacy','modern']);
});
test('all linked adult and elder transformations retain their exact painted identity and bounded crop',()=>{
 const usedOverrides=new Set();
 for(const f of LINKED_PORTRAIT_FAMILIES_V27)for(const age of [27,70])for(const form of [0,1,2,3]){
  const appearance=normalizeAppearance({ancestry:f.ancestry,portraitPresentation:f.presentation,preset:f.selections.adult,portraitSelections:f.selections});
  const condition=form===3?{type:'lycanthrope',curseVersion:1,stage:'changed',form:'beast'}:{type:'vampire',curseVersion:1,stage:'changed',form:form===2?'feral':'composed',hunger:[20,65,90][form],humanity:90,apparentAge:age,bloodline:'blackroot'};
  const p={appearance,condition},art=linkedTransformationPortrait(p,appearance,age);assert.ok(art,f.id);assert.equal(art.familyId,f.id);assert.equal(art.ancestry,f.ancestry);assert.equal(art.speciesFamily,f.speciesFamily);assert.equal(art.cell%4,form);assert.equal(art.stage,age>=65?'elder':'adult');
  const original=LINKED_CURSE_ATLASES_V27.find(a=>a.ancestry===f.ancestry&&a.half===f.half&&a.age===art.stage),native=CURSE_STYLE_OVERRIDES_V39[original.id]||original,rect=native.cells[art.cell];
  if(CURSE_STYLE_OVERRIDES_V39[original.id])usedOverrides.add(original.id);
  assert.equal(art.src,native.src);assert.equal(art.width,native.width);assert.equal(art.height,native.height);assert.deepEqual(art.sourceRect,{x:rect[0],y:rect[1],width:rect[2],height:rect[3]});
  const r=art.sourceRect;assert.ok(r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=100.001&&r.y+r.height<=100.001);assert.equal((renderAvatar(p,{age}).match(/<img /g)||[]).length,1);
 }
 assert.deepEqual([...usedOverrides].sort(),Object.keys(CURSE_STYLE_OVERRIDES_V39).sort());assert.equal(usedOverrides.size,3);
});
test('each encounter can be captured as a valid immutable battle with canonical weakness names',async()=>{
 const s=await fresh('all-new-battle-snapshots');for(const id of encounterIds()){
  const before=structuredClone(s),b=createBattle(s,id);assert.deepEqual(s,before);assert.ok(E.validateSave({...s,battle:{...b,instanceId:'fixture-'+id}}),id);for(const a of b.actors)if(a.weakness)assert.ok(['fire','ice','lightning','radiance','physical'].includes(a.weakness),a.weakness);
 }
});
test('six companions have thirty different situations and ninety different outcomes',()=>{
 const rows=Object.values(COMPANION_DIALOGUE_V27).flat();assert.equal(rows.length,30);assert.equal(new Set(rows.map(r=>r[1])).size,30);assert.equal(new Set(rows.flatMap(r=>r.slice(2))).size,90);
});
test('regional branches preserve a paid interrupted commitment and its completed real service',async()=>{
 let s=await fresh('regional-project-real');const d=REGIONAL_STORIES_V27.find(d=>regionalAnchor(s,d.regionId)?.id===s.locationId)||REGIONAL_STORIES_V27[0];s.locationId=regionalAnchor(s,d.regionId).id;s.hero.gold=100; // Controlled affordability fixture; not a counted lifetime.
 const before=structuredClone(s);s=E.chooseAction(s,'rpg_regional_'+d.id);assert.ok(E.validateSave(s));assert.deepEqual(before.rpg.arcs,[]);const choice=s.event.choices.find(c=>c.id==='aid'&&!c.disabledReason)||s.event.choices.find(c=>c.id==='trade'&&!c.disabledReason);s=settle(E.chooseEventOption(s,choice.id));assert.equal(s.rpg.arcs[0].chapter,1);assert.equal(s.rpg.arcs[0].choices.length,1);assert.ok(s.rpg.services.length);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
});
test('all36 boss approaches require their own attended leads and real living participants',async()=>{
 const s=await fresh('boss-gates');s.hero.gold=1000;for(const k of Object.keys(s.hero.skills))s.hero.skills[k]=12;for(const k of Object.keys(s.equipment.materials))s.equipment.materials[k]=20;s.flags.herbs=20;s.adventuring.rations=20;s.realm.sites[s.locationId].owner=s.dynasty.activePersonId;
 for(const d of ENCOUNTER_DESIGN_V27.bosses){initializeBossStories(s,{regionId:d.regionId,locationId:s.locationId});const b=s.rpg.bosses.find(b=>b.id===d.id);for(const a of d.noncombatApproaches){assert.match(bossChoiceReason(s,d.id,a.id),/own archive/);for(const kind of ['archive','survey','contact'])b.leads[kind]={day:s.day,participantIds:b.people.map(p=>p.id)};assert.equal(bossChoiceReason(s,d.id,a.id),null);b.people[0].alive=false;assert.match(bossChoiceReason(s,d.id,a.id),/died/);b.people[0].alive=true;for(const kind of ['archive','survey','contact'])b.leads[kind]=null;}}
});
test('a completed boss agreement consumes actual food and cannot pay twice',async()=>{
 const s=await fresh('boss-supplies');initializeBossStories(s,{regionId:'highstone',locationId:s.locationId});const b=s.rpg.bosses.find(b=>b.id==='furnace_widow');for(const kind of ['archive','survey','contact'])b.leads[kind]={day:s.day,participantIds:b.people.map(p=>p.id)};s.adventuring.rations=3;const p={kind:'boss',id:b.id,choice:'winter_feed',cost:35,totalDays:4,paid:true};resolveBossApproach(s,p,{});assert.equal(s.adventuring.rations,0);const snapshot=structuredClone(s);resolveBossApproach(s,p,{});assert.equal(s.adventuring.rations,0);assert.equal(b.resolutions.length,1);assert.equal(s.hero.gold,snapshot.hero.gold);
});
test('finite story prices expire without compounding or restocking a sold item',async()=>{
 const s=await fresh('finite-market');const site=Object.values(s.realm.sites).find(p=>p.merchant&&p.merchant.prices.iron_sword);const m=site.merchant,base=m.prices.iron_sword;m.stock.iron_sword=0;s.rpg.bosses=[{id:'unfinished_son',locationId:site.id,resolutions:[{id:'close_shaft',day:s.day}]}];refreshStoryTrade(s,site.id);assert.equal(m.prices.iron_sword,Math.round(base*1.12));refreshStoryTrade(s,site.id);assert.equal(m.prices.iron_sword,Math.round(base*1.12));assert.equal(m.stock.iron_sword,0);s.day+=92;refreshStoryTrade(s,site.id);assert.equal(m.prices.iron_sword,base);assert.equal(m.stock.iron_sword,0);
});
test('new battle techniques reject nonexistent targets without spending resources or a turn',async()=>{
 const s=await fresh('safe-tech-target');s.rpg.trainedTechniques=['winter_prison'];const b=createBattle(s,'forest');if(b.currentActorId!=='hero')return assert.ok(b.actors.some(a=>a.id==='hero'));const after=takeBattleAction(b,'tech_winter_prison','ghost');assert.equal(after.currentActorId,b.currentActorId);assert.equal(after.actors[0].mp,b.actors[0].mp);
});
test('grave drain heals from actual damage and Ashen Choir has no irrelevant target',async()=>{
 const s=await fresh('grave-and-hush');s.hero.specialization='necromancer';s.hero.path='mage';s.hero.hp=12;s.hero.mp=s.hero.maxMp;const b=createBattle(s,'forest');b.currentActorId='hero';b.actors.find(a=>a.side==='enemy').hp=1;const a=takeBattleAction(b,'skill','enemy-1');assert.ok(a.actors[0].hp<=13,'one remaining enemy HP cannot produce ten healing');s.hero.condition={type:'vampire',curseVersion:1,stage:'changed',form:'composed',hunger:20,humanity:80,bloodline:'ashen_choir'};const v=createBattle(s,'forest');v.currentActorId='hero';assert.equal(getBattleActions(v).find(a=>a.id==='bloodline').needsTarget,false);
});
test('all48 enemy plans advertise and execute typed actions from the same cycle',()=>{
 for(const d of ENCOUNTER_DESIGN_V27.species){const e=attachEnemyPlan({id:'enemy',name:d.name,side:'enemy',hp:40,maxHp:40,mp:0,maxMp:0,attackPower:6,status:{}},d.id);const a={id:'hero',name:'Hero',side:'party',hp:80,maxHp:80,mp:20,maxMp:20,agility:4,armor:2,status:{}};const b={actors:[a,e],lastDamagingAction:'attack',lastAttackerId:'hero',round:1};for(let i=0;i<d.cadence.cycle.length;i++){assert.equal(e.intent||planIntent(e),planIntent(e));executeEnemyPlan(b,e,{damage:(_,t,n)=>{const hit=Math.min(t.hp,Math.max(1,n));t.hp-=hit;return hit;},log:()=>{}});a.hp=80;}assert.equal(e.aiStep,d.cadence.cycle.length);}
});
test('earned advanced techniques remain bounded and distinct from initial class abilities',()=>{assert.equal(TECHNIQUES_V27.length,24);assert.equal(new Set(TECHNIQUES_V27.map(t=>t.id)).size,24);assert.equal(new Set(TECHNIQUES_V27.map(t=>t.classId)).size,12);});
