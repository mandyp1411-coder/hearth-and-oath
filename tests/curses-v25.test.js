import test from 'node:test';
import { needsReferenceArt } from './helpers/reference-art.mjs';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import * as e from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { normalizeAppearance,portraitLayers,renderAvatar } from '../dist/js/avatar.js';
import { contractCurse,feedBlood,onCurseTime,curseTimeBudget,recordCurseExposure,flushCurseEvent,BLOOD_LINEAGES,curseActions } from '../dist/js/curses.js';
import { healthChoiceReason,flushHealthEvent } from '../dist/js/health.js';
import { fieldActions,applyFieldAction,applyFieldChoice } from '../dist/js/field-notes-v25.js';
import { isSettlement } from '../dist/js/world.js';
import { syncCartography } from '../dist/js/cartography.js';
import { applyCartographyAction } from '../dist/js/cartography.js';
import { PORTRAIT_LIBRARY,legacyCursePortraitFamily } from '../dist/js/portrait-library.js';
import { createBattle,getBattleActions,takeBattleAction,partyPreparation } from '../dist/js/combat.js';
import { acyclicAllegiance,initializeRealm,realmActions,applyRealmAction,lootBasketQuote,sellLootBasket } from '../dist/js/realm.js';
import { branchRow } from '../dist/js/audit-content-v25.js';
import { adultYearNarrative } from '../dist/js/adult-year-narrative.js';
import { personalityImpact } from '../dist/js/personality.js';
import { audioSceneFor } from '../dist/js/audio.js';
import { projectSupplyGuide } from '../dist/js/workshop.js';
let baseline;
async function adult(){if(!baseline){baseline=await createLifeAtAge({seed:'v25-regression-base',startAge:18});for(let n=0;baseline.event&&n<50;n++)baseline=e.chooseEventOption(baseline,baseline.event.choices.find(c=>c.id==='continue')?.id||baseline.event.choices[0].id);}return structuredClone(baseline);}
function reload(s){assert.ok(e.validateSave(s),s.notice);const r=e.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(r,'valid save reload');assert.deepEqual(r,s);return r;}
const eventCtx=s=>({setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},journal:()=>{},addEvidence:()=>{},endLife:cause=>{s.phase='retired';s.cause=cause;}});

test('32 whole transformation atlases have exact native geometry, with no layered pieces',{skip:needsReferenceArt},()=>{
  let files=0;for(const race of ['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'])for(const presentation of ['masculine','feminine','androgynous']){
    const name=`art/curses/vampire-${race}-${presentation}.png`,bytes=readFileSync(new URL('../reference-art/curses-v23/'+name.split('/').pop(),import.meta.url));assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);files++;
    for(const [column,lineage] of BLOOD_LINEAGES.entries())for(const [row,hunger] of [20,60,85,100].entries()){
      const person={appearance:normalizeAppearance({ancestry:race,portraitPresentation:presentation}),condition:{type:'vampire',curseVersion:1,stage:'changed',form:'human',bloodline:lineage.id,hunger,humanity:90}};
      const before=JSON.stringify(person),p=portraitLayers(person,{age:35});assert.ok(existsSync(new URL('../dist/'+p.preset.src,import.meta.url)));if(p.preset.familyId){assert.equal(p.preset.ancestry,race);assert.equal(p.preset.presentation,presentation);assert.equal(p.preset.cell%4,Math.min(row,2));assert.equal(p.preset.columns,8);}else{if(race!=='beastfolk'){assert.equal(p.preset.src,'./'+name.replace('.png','.avif'));assert.equal(p.preset.cell,row*4+column);}else assert.equal(Math.floor(p.preset.cell/4),row);assert.equal(p.preset.columns,4);}assert.equal(p.hair,null);assert.equal(p.beard,null);assert.equal((renderAvatar(person,{age:35}).match(/<img /g)||[]).length,1);assert.equal(JSON.stringify(person),before);
    }
  }for(const age of ['adult','elder'])for(const half of ['a','b']){const bytes=readFileSync(new URL(`../reference-art/curses-v23/wolf-${age}-${half}.png`,import.meta.url));assert.equal(bytes.readUInt32BE(16),1254);files++;}for(const name of ['vampire-beastfolk-supplement-masculine','vampire-beastfolk-supplement-feminine','vampire-beastfolk-supplement-androgynous','vampire-beastfolk-mustelid']){const bytes=readFileSync(new URL('../reference-art/curses-v23/'+name+'.png',import.meta.url));assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);files++;}assert.equal(files,32);
});
test('an ordinary moonbound day keeps the exact mortal face and a real transformation selects the beast',async()=>{
  const s=await adult(),mortal=portraitLayers(s.hero,{age:s.age}).preset.src;contractCurse(s,'lycanthrope','A test wound');s.hero.condition.stage='changed';assert.equal(portraitLayers(s.hero,{age:s.age}).preset.src,mortal);s.hero.condition.form='beast';const beast=portraitLayers(s.hero,{age:s.age}),family=legacyCursePortraitFamily(s.hero.appearance,{age:s.age});
  if(family){assert.equal(beast.preset.familyId,family.id);assert.equal(beast.preset.cell%4,3);assert.equal(beast.preset.columns,8);assert.equal(beast.preset.rows,8);}else{assert.match(beast.preset.src,/wolf-adult/);assert.equal(beast.preset.columns,4);assert.equal(beast.preset.rows,4);}
});
test('a bite is a three-day disease with a specific blood lineage, while feeding has consistent source effects',async()=>{
  const s=await adult(),day=s.day;assert.ok(contractCurse(s,'vampire','A feral wound',{},'gloamwing'));assert.equal(s.hero.condition.stage,'incubating');assert.equal(s.hero.condition.bloodline,'gloamwing');s.day+=2;onCurseTime(s,day,s.day,{},eventCtx(s));assert.equal(s.hero.condition.stage,'incubating');const old=s.day;s.day++;onCurseTime(s,old,s.day,{},eventCtx(s));assert.equal(s.hero.condition.stage,'changed');s.hero.condition.hunger=90;const humanity=s.hero.condition.humanity;assert.equal(feedBlood(s,'animal',40),30);assert.equal(s.hero.condition.hunger,60);feedBlood(s,'predation',70);assert.equal(s.hero.condition.hunger,0);assert.equal(s.hero.condition.humanity,humanity+1-12);
});
test('starvation damage is independent of clock chunk size and clips a fatal span to the actual day',async()=>{
  const s=await adult();contractCurse(s,'vampire','A test wound',{},'velvet_sepulchre');s.hero.condition.stage='changed';s.hero.condition.hunger=100;s.hero.hp=40;const a=structuredClone(s),b=structuredClone(s);for(let i=0;i<8;i++){const old=a.day;a.day++;onCurseTime(a,old,a.day,{},eventCtx(a));}const old=b.day;b.day+=8;onCurseTime(b,old,b.day,{},eventCtx(b));assert.equal(a.hero.hp,b.hero.hp);assert.equal(a.hero.condition.humanity,b.hero.condition.humanity);s.hero.hp=1;assert.equal(curseTimeBudget(s,30),2);
});
test('real hunger and humanity select a feral face and offer containment without invented victims',async()=>{
  const s=await adult();contractCurse(s,'vampire','A test wound');s.hero.condition.stage='changed';s.hero.condition.hunger=100;s.hero.condition.starvedDays=14;s.hero.condition.humanity=15;const before=JSON.stringify(s.life.people);assert.ok(flushCurseEvent(s,eventCtx(s)));assert.equal(s.event.id,'curse_frenzy');assert.deepEqual(s.event.choices.map(c=>c.id),['contain','feed','hunt']);assert.equal(JSON.stringify(s.life.people),before);
  const art=portraitLayers(s.hero,{age:s.age}).preset,family=legacyCursePortraitFamily(s.hero.appearance,{age:s.hero.condition.apparentAge??s.age});if(family){assert.equal(art.familyId,family.id);assert.equal(art.cell%4,2);assert.equal(art.columns,8);assert.equal(art.rows,8);}else{assert.equal(Math.floor(art.cell/4),3);assert.equal(art.columns,4);assert.equal(art.rows,4);}reload(s);
});
test('a witnessed hunter report stays local and capital judgment ends a life with a valid legacy',async()=>{
  const s=await adult(),place=Object.values(s.realm.sites).find(p=>p.regionId==='highstone');s.locationId=place.id;contractCurse(s,'vampire','A test wound');recordCurseExposure(s,eventCtx(s),'A named local assault',3);const c=s.hero.condition;assert.equal(c.hunts.length,1);assert.equal(c.hunts[0].policy,'execution');s.event=null;c.hunts[0].status='custody';s.event={id:'curse_trial',title:'Court',category:'Curse hearing',body:'The recorded assault.',choices:[{id:'accept',label:'Accept the judgment',description:'Execution ends this life.'}]};const next=e.chooseEventOption(s,'accept');assert.equal(next.phase,'retired');assert.match(next.lineage.heroDeath.cause,/Executed/);assert.equal(next.battle,null);assert.equal(next.justice.prison,null);assert.ok(e.validateSave(next));
});
test('all four lineages have different earned battle powers and a bloodless target cannot feed the body',async()=>{
  const base=await adult(),effects=[];for(const line of BLOOD_LINEAGES){const s=structuredClone(base);contractCurse(s,'vampire','A test wound',{},line.id);s.hero.condition.stage='changed';s.hero.mp=s.hero.maxMp=40;let b=createBattle(s,'forest');while(b.currentActorId!=='hero'&&!b.outcome){const a=getBattleActions(b).find(a=>a.id==='defend');b=takeBattleAction(b,a.id);}const a=getBattleActions(b).find(a=>a.id==='bloodline');assert.equal(a.label,line.gift);const target=b.actors.find(a=>a.side==='enemy'&&a.hp>0);b=takeBattleAction(b,'bloodline',target.id);effects.push(JSON.stringify(b.actors.map(a=>[a.hp,a.mp,a.status])));}assert.equal(new Set(effects).size,4);const s=structuredClone(base);contractCurse(s,'vampire','A test wound');const b=createBattle(s,'ruin'),blood=getBattleActions(b).find(a=>a.id==='blood');if(blood)assert.equal(blood.disabledReason,'No remaining enemy carries blood. Use your other trained abilities.');
});
test('preparation lists exactly the living party that can enter and a full-health ally can receive the healer ward',async()=>{
  const s=await adult();for(const p of s.companions){p.recruited=p.active=true;p.hp=0;}s.companions[1].hp=20;const preview=partyPreparation(s),b=createBattle(s,'forest');assert.deepEqual(preview.participants.map(p=>p.id),b.actors.filter(p=>p.side==='party').map(p=>p.id));assert.equal(preview.unready.length,2);const hero=b.actors.find(a=>a.id==='hero');hero.role='healer';hero.specialization='healer';hero.hp=hero.maxHp;hero.status.ward=3;hero.mp=20;const ally=b.actors.find(a=>a.side==='party'&&a.id!=='hero');ally.hp=ally.maxHp;ally.status={};b.currentActorId='hero';assert.ok(!getBattleActions(b).find(a=>a.id==='skill').disabledReason);const after=takeBattleAction(b,'skill',ally.id);assert.ok(after.actors.find(a=>a.id===ally.id).status.ward>0||after.log.some(t=>t.includes('ward absorbs')));
});
test('new allegiance rejects cycles and a genuine older cycle is repaired without rewriting geography',async()=>{
  const s=await adult(),[a,b]=s.realm.regions;a.liege=b.id;b.liege=a.id;assert.equal(acyclicAllegiance(s.realm.regions),false);assert.equal(e.validateSave(s),false);delete s.realm.allegianceVersion;assert.ok(e.validateSave(s));const before=JSON.stringify(s.world);initializeRealm(s);assert.ok(acyclicAllegiance(s.realm.regions));assert.equal(JSON.stringify(s.world),before);assert.ok(e.validateSave(s));
});
test('a stolen merchant item goes to a different buyer and an ordinary basket rejects stale prices atomically',async()=>{
  const s=await adult(),place=s.world.locations.find(p=>isSettlement(s.world,p.id)&&s.realm.sites[p.id]?.merchant&&!s.realm.politics.holds.some(h=>h.siteId===p.id&&h.status==='held'));assert.ok(place,'Use a real open market rather than assuming every origin has a merchant');s.locationId=place.id;s.cartography.offsite=false;syncCartography(s);const site=s.realm.sites[s.locationId],m=site.merchant;assert.ok(m);s.adventuring.loot.push({id:'owner-test',name:'Named silver',value:80,stolen:true,source:s.locationId,day:s.day,ownerId:m.id,ownerName:m.name});const a=realmActions(s).find(a=>a.id==='realm_sellloot_owner-test');assert.ok(a.description.includes('the fence'));assert.ok(!a.description.startsWith(m.name+' '));const before=s.hero.gold;assert.ok(applyRealmAction(s,a.id,eventCtx(s)));assert.ok(s.hero.gold>before);assert.ok(!applyRealmAction(s,a.id,eventCtx(s)));const q=lootBasketQuote(s);if(q.items.length){q.items[0].quotedPrice++;const old=JSON.stringify(s);assert.equal(sellLootBasket(s,q,eventCtx(s)),false);assert.equal(JSON.stringify(s),old);}
});
test('three returning stories use genuinely different later choices from prior care, trade or coercion',()=>{
  for(const id of ['two_names','night_door','own_key']){const rows=['care','enterprise','coercion'].map(choice=>branchRow({id,contentVersion:2,choices:[{id:choice}]},['old',{}, {},{}]));assert.equal(new Set(rows.map(r=>r[0])).size,3);assert.equal(new Set(rows.map(r=>r[2].label)).size,3);assert.equal(branchRow({id,choices:[{id:'coercion'}]},['old'])[0],'old');}
});
test('one living host is one invitation and a wholly deceased circle gets a memorial',()=>{
  const p={id:'kin',name:'One keeper',alive:true,familyRole:'parent'},s={hero:{profession:'Unemployed'},life:{people:[p]}};const source={title:'The evening your friend had been waiting for',choices:[]};assert.match(adultYearNarrative(s,source).body,/one invitation/);p.alive=false;assert.match(adultYearNarrative(s,source).body,/has died/);assert.ok(!adultYearNarrative(s,source).body.includes('second invitation'));
});
test('a guardian decision cannot stress a newborn and explicit adult intent overrides misleading IDs',async()=>{
  const s=await adult();s.hero.personality.traits=['compassionate'];s.hero.personality.applied=['compassionate'];const tags=personalityImpact(s,{kind:'choice',eventId:'birth_adult_year',id:'care',intentTags:['work','aspiration']}).tags;assert.deepEqual(tags,['work','aspiration']);s.age=0;assert.equal(personalityImpact(s,{kind:'choice',eventId:'birth_arrival',id:'care',intentTags:['cruelty']}).delta,0);
});
test('region and faith cues derive from actual place, while before a gesture they only select a scene',async()=>{
  const s=await adult(),ids=new Set();for(const region of s.realm.regions){const site=Object.values(s.realm.sites).find(p=>p.regionId===region.id);if(!site)continue;s.locationId=site.id;s.world.locations.find(p=>p.id===site.id).type='village';s.cartography.offsite=false;s.cartography.interior=null;ids.add(audioSceneFor(s));s.cartography.interior={roomId:'shrine'};assert.equal(audioSceneFor(s),'faith_'+region.faithId);}assert.ok(ids.size>=5);
});
test('project supply planning shows exact shortfalls and only already known sources without spending anything',async()=>{
  const s=await adult();s.community.project={locationId:s.locationId,step:0,stages:[{title:'A real foundation',materials:{wood:99},cost:200}]};const before=JSON.stringify(s);const g=projectSupplyGuide(s);assert.equal(g.shortfall.wood,99-s.equipment.materials.wood);assert.ok(g.sources.every(p=>s.cartography.sites[p.siteId]));assert.equal(JSON.stringify(s),before);
});

test('Beastfolk vampires retain their known animal family through starvation and use contained native crops',()=>{
  for(const morphology of ['canine','feline','bear','horned','long_eared','other'])for(const presentation of ['masculine','feminine','androgynous']){
    const anchor=PORTRAIT_LIBRARY.find(p=>p.ancestry==='beastfolk'&&p.stage==='adult'&&p.morphology===morphology&&p.presentation===presentation);assert.ok(anchor);
    const a=normalizeAppearance({ancestry:'beastfolk',portraitPresentation:presentation,portraitSelections:{adult:anchor.key}}),person={appearance:a,condition:{type:'vampire',curseVersion:1,stage:'changed',hunger:20,humanity:90,bloodline:'blackroot'}};
    const first=portraitLayers(person,{age:35}).preset;person.condition.hunger=100;const last=portraitLayers(person,{age:35}).preset;
    if(first.familyId){assert.equal(first.familyId,last.familyId);assert.equal(first.morphology,morphology);assert.equal(Math.floor(first.cell/4),Math.floor(last.cell/4));assert.equal(first.cell%4,0);assert.equal(last.cell%4,2);}else{assert.equal(first.family,last.family);assert.equal(first.cell%4,last.cell%4);}assert.equal(first.src,last.src);assert.ok(first.sourceRect.x>=0&&first.sourceRect.y>=0&&first.sourceRect.x+first.sourceRect.width<=100&&first.sourceRect.y+first.sourceRect.height<=100);
    assert.ok(existsSync(new URL('../dist/'+first.src,import.meta.url)));
  }
});
test('urgent hunger defers a new routine health scene and an already saved concern offers a visible recovery path',async()=>{
  const s=await adult();contractCurse(s,'vampire','A test wound');s.hero.condition.hunger=84;
  s.health.physical=[{id:'test-injury',type:'injury',severity:1,startedDay:s.day,lastEffectDay:s.day,careUntil:s.day,acknowledged:false}];s.health.pending={eventId:'health_concern',conditionId:'test-injury',kind:'physical',offeredDay:s.day};
  assert.equal(flushHealthEvent(s,{...eventCtx(s),pendingNeed:()=> 'vampire'}),false);assert.equal(s.event,null);
  s.event={id:'health_concern',title:'Care',body:'A saved concern',category:'Health',choices:[{id:'rest',label:'Rest',description:'Three days'},{id:'continue',label:'Acknowledge',description:'No days'}]};
  assert.match(healthChoiceReason(s,'health_concern','rest'),/Blood hunger/);assert.equal(healthChoiceReason(s,'health_concern','continue'),'');
  const blocked=e.chooseEventOption(s,'rest');assert.equal(blocked.day,s.day);assert.deepEqual(blocked.event,s.event);assert.equal(blocked.hero.gold,s.hero.gold);
  const acknowledged=e.chooseEventOption(s,'continue');assert.equal(acknowledged.health.pending,null);assert.ok(e.getActions(acknowledged).some(a=>a.id==='curse_animal'||a.id==='feed_vampire')||acknowledged.event?.id==='life_hunger');
});
test('a local hunter warrant waits for return instead of appearing at a remote dungeon door',async()=>{
  const s=await adult();contractCurse(s,'vampire','A test wound');recordCurseExposure(s,eventCtx(s),'A real witnessed transformation',2);s.hero.condition.hunts[0].nextDay=s.day;
  s.cartography.offsite=true;assert.equal(flushCurseEvent(s,eventCtx(s)),false);s.cartography.offsite=false;s.dungeon={};assert.equal(flushCurseEvent(s,eventCtx(s)),false);s.dungeon=null;s.world.locations.find(p=>p.id===s.locationId).type='village';assert.ok(flushCurseEvent(s,eventCtx(s)));assert.equal(s.event.id,'curse_hunters');
});
test('interrupted field care can be reopened on the same hex and completed shelter has a real rest benefit',async()=>{
  const s=await adult(),c=s.cartography,key=c.position;c.hooks={[key]:{id:'refuge',version:25,terrain:'forest',day:s.day,nearbyKnownSiteId:s.locationId,resolution:null,resolvedDay:null}};
  assert.ok(applyFieldAction(s,'way_revisit',eventCtx(s)));const gold=s.hero.gold;s.event=null;
  assert.ok(applyFieldChoice(s,'way_encounter','care',{spendDays:()=>0}));assert.equal(c.hooks[key].resolution,null);assert.equal(s.hero.gold,gold);assert.ok(fieldActions(s).some(a=>a.id==='way_revisit'));
  applyFieldAction(s,'way_revisit',eventCtx(s));s.event=null;applyFieldChoice(s,'way_encounter','care',{spendDays:n=>{s.day+=n;return n;}});assert.equal(s.hero.gold,gold-4);assert.equal(c.hooks[key].usable,true);
  c.offsite=true;s.hero.hp=s.hero.maxHp-20;const hp=s.hero.hp;applyCartographyAction(s,'atlas_rest',{spendDays:n=>{s.day+=n;return n;}});assert.equal(s.hero.hp-hp,10);assert.equal(fieldActions(s).length,0);
});
test('a transformed face explains its condition instead of offering a portrait selection that cannot show',async()=>{
  const s=await adult();contractCurse(s,'vampire','A test wound');s.hero.condition.stage='changed';assert.match(e.portraitSelectionReason(s),/hunger, humanity/);const key=PORTRAIT_LIBRARY.find(p=>p.ancestry===s.hero.appearance.ancestry&&p.stage==='adult').key,before=structuredClone(s.hero.appearance);assert.deepEqual(e.selectCharacterPortrait(s,key).hero.appearance,before);
});
test('feral vampire appearances carry the same seeded lineage as their distinct battle behavior',async()=>{
  const s=await adult(),seen=new Set();for(let n=0;n<40;n++){
    s.flags.battlesStarted=n;const b=createBattle(s,'feral_vampire'),enemy=b.actors.find(p=>p.side==='enemy'),line=enemy.illustration.condition.bloodline;
    seen.add(line);assert.equal(enemy.aiKey,{velvet_sepulchre:'hexer',ashen_choir:'warder',gloamwing:'sniper',blackroot:'leech'}[line]);assert.ok(enemy.name.toLocaleLowerCase().includes(BLOOD_LINEAGES.find(l=>l.id===line).name.toLocaleLowerCase()));
  }assert.equal(seen.size,4);
});
