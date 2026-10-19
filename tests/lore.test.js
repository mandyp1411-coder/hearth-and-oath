import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, validateWorld } from '../dist/js/world.js';
import { ANCESTRY_LORE, initializeLore, regionalLoreContext, loreActions, applyLoreAction, applyLoreChoice, loreEventIds, loreView, validateLore } from '../dist/js/lore.js';

function state(seed='ink-and-river',years=8) {
  return {seed,day:years*365,age:years,phase:'adult',locationId:'home',timeline:{mode:'birth'},hero:{name:'Ari',gold:12,appearance:{ancestry:'human'},skills:{scholarship:3,survival:2}},flags:{},world:generateWorld(seed,{expanded:true}),life:{people:[{id:'kin',name:'Lena Reed',role:'relative',locationId:'home'}]},factions:{academy:0,order:0,villagers:0},event:null,battle:null,conversations:{pending:null},journal:[],companions:[{id:'mira',recruited:true,active:true,memories:[],knownFacts:['private-secret']}],notice:''};
}
function context(s) {
  return {
    setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},
    journal(title,text,tag){s.journal.push({title,text,tag,day:s.day});},
    standing(id,amount){s.factions[id]+=amount;},
    witnesses(){return s.companions.filter(p=>p.active&&p.recruited);},
    remember(id,text){s.companions.find(p=>p.id===id).memories.push(text);},
  };
}
function discover(s,id,pick='record') {
  const ctx=context(s);
  assert.equal(applyLoreAction(s,`lore_read_${id}`,ctx),true);
  assert.equal(validateLore(s.lore,s),true,'the pending research is saveable');
  const event=s.event;
  s.event=null;
  assert.equal(applyLoreChoice(s,event.id,pick,ctx),true);
  assert.equal(validateLore(s.lore,s),true,'the completed record is saveable');
}

test('eight ancestries offer distinct customs and origins without stat rules',()=>{
  assert.equal(ANCESTRY_LORE.length,8);
  assert.deepEqual(ANCESTRY_LORE.map(a=>a.id),['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk']);
  for(const a of ANCESTRY_LORE){assert.ok(a.name&&a.summary&&a.customs&&a.origin);const s=state();s.hero.appearance.ancestry=a.id;initializeLore(s);assert.equal(loreView(s).ancestry.name,a.name);assert.deepEqual(s.hero.skills,{scholarship:3,survival:2});}
});

test('seeded foundations and institutions vary coherently while geometry, laws and resources stay exact',()=>{
  const foundations=new Set();
  for(let i=0;i<60;i++) {
    const s=state(`lore-${i}`),before=structuredClone(s);
    initializeLore(s);
    const twin=state(`lore-${i}`);initializeLore(twin);
    assert.deepEqual(s.lore,twin.lore);
    assert.deepEqual(s.world.locations.map(p=>p.institutions),twin.world.locations.map(p=>p.institutions));
    assert.deepEqual(s.world.map,before.world.map);
    assert.deepEqual(s.world.roads,before.world.roads);
    assert.deepEqual(s.world.locations.map(p=>[p.name,p.necromancyLaw,p.status]),before.world.locations.map(p=>[p.name,p.necromancyLaw,p.status]));
    assert.deepEqual(s.hero,before.hero);
    assert.deepEqual(s.journal,[]);
    assert.equal(s.world.crisis,'Ashfall fever');
    assert.equal(validateWorld(s.world),true);
    assert.equal(validateLore(s.lore,s),true);
    foundations.add(`${s.lore.cultureId}/${s.lore.traditionId}/${s.lore.historyId}`);
    const view=loreView(s);
    assert.ok(view.culture.description.includes(s.world.locations.find(p=>p.id==='home').name));
    assert.ok(view.culture.description.includes(s.world.locations.find(p=>p.id==='city').name));
    for(const site of s.world.locations)for(const institution of site.institutions)assert.ok(institution.name.includes(site.name));
  }
  assert.ok(foundations.size>25);
});

test('migration adds unread research without inventing childhood or changing existing institutions',()=>{
  const s=state();s.world.locations[0].institutions=[{id:'home_old',kind:'community',name:'The Remembered Hall',witness:'Old Mara',history:'An existing witnessed account.'}];
  s.journal.push({day:0,title:'An old life',text:'Exactly preserved.',tag:'life'});
  const before=structuredClone(s);
  initializeLore(s,{migration:true});
  assert.deepEqual(s.journal,before.journal);
  assert.deepEqual(s.life,before.life);
  assert.deepEqual(s.world.locations[0].institutions,before.world.locations[0].institutions);
  assert.deepEqual(s.lore.discovered,[]);assert.deepEqual(s.lore.records,[]);
  const once=structuredClone(s);initializeLore(s,{migration:true});assert.deepEqual(s,once);
});

test('an actual source opens a saveable decision and grants knowledge only once on completion',()=>{
  const s=state();initializeLore(s);
  const descriptor=loreActions(s).find(a=>a.id==='lore_read_founding');
  assert.equal(descriptor.days,1);assert.equal(descriptor.cost,0);
  const beforeDay=s.day;
  discover(s,'founding');
  assert.equal(s.day,beforeDay,'generic engine owns this descriptor’s time');
  assert.equal(s.hero.gold,12);
  assert.equal(s.hero.skills.scholarship,5);
  assert.equal(s.lore.records.length,1);
  assert.equal(s.lore.records[0].witness,'Lena Reed');
  assert.equal(s.lore.records[0].locationId,'home');
  assert.equal(s.lore.records[0].day,s.day);
  assert.match(s.lore.records[0].text,/Lead:/);
  assert.equal(s.journal.length,1);
  assert.equal(applyLoreAction(s,'lore_read_founding',context(s)),false);
  assert.equal(applyLoreChoice(s,'lore_founding','record',context(s)),false);
  assert.equal(s.hero.skills.scholarship,5);
});

test('public sharing remembers actual present companions and never spreads private facts',()=>{
  const s=state();initializeLore(s);s.locationId='city';
  const law=s.world.locations.find(p=>p.id==='city').necromancyLaw;
  discover(s,'academy','share');
  assert.equal(s.factions.academy,2);
  assert.equal(s.hero.skills.scholarship,4);
  assert.equal(s.companions[0].memories.length,1);
  assert.deepEqual(s.companions[0].knownFacts,['private-secret']);
  assert.equal(loreView(s).histories.find(h=>h.id==='academy').discovered,true);
  const text=s.lore.records[0].text;
  assert.ok(text.includes(law==='permitted'?'Willing ancestral rites are permitted':law==='regulated'?'require a witness or license':'Public necromantic practice is prohibited'));
});

test('rumor research yields a practical lead without completing campaigns, entering dungeons or granting materials',()=>{
  const s=state();initializeLore(s);s.locationId='marsh';
  s.campaign={completed:[],facts:{}};s.equipment={materials:{ore:0,crystal:0}};
  discover(s,'cistern','follow');
  assert.equal(s.flags.loreLead_marsh,true);
  assert.equal(s.hero.skills.survival,3);
  assert.deepEqual(s.campaign,{completed:[],facts:{}});
  assert.deepEqual(s.equipment.materials,{ore:0,crystal:0});
  assert.equal(s.dungeon,undefined);
  assert.match(s.lore.records[0].text,/Drowned Cistern from sixteen, with at least 16 health/);
  assert.equal(loreView(s).rumors.find(r=>r.id==='cistern').discovered,true);
});

test('fate context quotes an actual remembered clue, and never creates one for a migrated legacy life',()=>{
  const s=state();s.campaign={fate:'thorn',ageClues:[]};initializeLore(s);s.locationId='forest';
  assert.match(loreView(s).summary,/Rootremembered/);
  applyLoreAction(s,'lore_read_grove',context(s));
  assert.ok(!s.event.body.includes('At four, you saw roots'));
  s.event=null;s.lore.pending=null;s.campaign.ageClues=[4];
  applyLoreAction(s,'lore_read_grove',context(s));
  assert.match(s.event.body,/At four, you saw roots/);
  assert.match(s.event.body,/not proof/);
  const old=state();old.timeline.mode='legacy';old.campaign={fate:'thorn',ageClues:[4]};initializeLore(old,{migration:true});old.locationId='forest';
  applyLoreAction(old,'lore_read_grove',context(old));
  assert.ok(!old.event.body.includes('At four, you saw roots'));
  assert.ok(!loreView(old).summary.includes('Your Rootremembered birth omen'));
  assert.equal(regionalLoreContext(old).knownOmen,null);
});

test('age, location, destruction and pending moments prevent false research or scene replacement',()=>{
  const s=state('closed',0);initializeLore(s);
  assert.deepEqual(loreActions(s),[]);
  assert.equal(applyLoreAction(s,'lore_read_founding',context(s)),false);
  s.age=8;s.day=8*365;s.event={id:'birth_8',title:'Keep this moment'};
  assert.equal(applyLoreAction(s,'lore_read_founding',context(s)),false);
  assert.equal(s.event.title,'Keep this moment');
  s.event=null;s.world.locations.find(p=>p.id==='home').status='destroyed';
  assert.ok(loreActions(s)[0].disabledReason);
  assert.equal(applyLoreAction(s,'lore_read_founding',context(s)),false);
  s.locationId='forest';
  assert.equal(applyLoreAction(s,'lore_read_academy',context(s)),false);
  assert.equal(applyLoreAction(s,'lore_fake',context(s)),false);
  assert.equal(s.lore.records.length,0);
});

test('validation rejects invented discoveries, mismatched pending scenes, future records and malformed institutions',()=>{
  const s=state();initializeLore(s);discover(s,'founding');
  for(const mutate of [v=>v.discovered.push('imaginary'),v=>v.records[0].day=s.day+1,v=>v.records[0].locationId='city',v=>v.records=[],v=>v.pending={eventId:'lore_river',entryId:'river',locationId:'home'}]) {
    const v=structuredClone(s.lore);mutate(v);assert.equal(validateLore(v,s),false);
  }
  const pending=state();initializeLore(pending);applyLoreAction(pending,'lore_read_founding',context(pending));
  const restored=JSON.parse(JSON.stringify(pending));assert.equal(validateLore(restored.lore,restored),true);
  restored.event.id='birth_8';assert.equal(validateLore(restored.lore,restored),false);
  const world=structuredClone(s.world);world.locations[0].institutions[0].kind='madeup';assert.equal(validateWorld(world),false);
  assert.equal(loreEventIds().lore_founding.length,3);
  assert.ok(regionalLoreContext(s).pressure);
});

test('expanded craft and household accounts create useful civilian records without granting a career or property',()=>{
  const s=state('civilian-records');initializeLore(s);s.locationId='city';s.hero.profession='Blacksmith';s.hero.path='unformed';s.workshop={structures:[]};s.careers={job:'Blacksmith',experience:0};
  const before=structuredClone({workshop:s.workshop,careers:s.careers,profession:s.hero.profession,path:s.hero.path});
  const source=loreActions(s).find(a=>a.id==='lore_read_craft');assert.ok(source);discover(s,'craft','follow');
  assert.match(s.lore.records[0].text,/professional life can remain civilian/);assert.equal(s.hero.path,'unformed');assert.equal(s.hero.profession,'Blacksmith');assert.deepEqual(s.workshop,before.workshop);assert.deepEqual(s.careers,before.careers);
  assert.ok(loreView(s).histories.some(e=>e.id==='craft'&&e.discovered));
});

test('every optional settlement has its own sourced account with a real reachable lead',()=>{
  const optional=new Set();
  const entries={mill:'millwright',quarry:'stonework',island:'islanders',border:'border_seals',abbey:'abbey_letters',orchard:'orchard_seeds',crypt:'crypt_names',foundry:'furnace'};
  for(let n=0;n<20;n++) {
    const s=state(`optional-lore-${n}`);initializeLore(s);
    for(const site of s.world.locations.filter(p=>entries[p.id])) {
      optional.add(site.id);s.locationId=site.id;const id=entries[site.id];assert.ok(loreActions(s).some(a=>a.id===`lore_read_${id}`));discover(s,id);
      const record=s.lore.records.find(r=>r.id===id);assert.equal(record.locationId,site.id);assert.ok(record.witness!=='the local record keeper');assert.equal(validateLore(s.lore,s),true);
    }
  }
  assert.equal(optional.size,8);assert.equal(Object.keys(loreEventIds()).length,27);
});

test('a child inheriting an old world cannot read adult lore before their own sixth birthday',()=>{
  const s=state('heir-reader',4);s.timeline.birthDay=40*365+137;s.day=s.timeline.birthDay+4*365;s.age=4;initializeLore(s);
  assert.deepEqual(loreActions(s),[]);s.age=6;s.day=s.timeline.birthDay+6*365;assert.ok(loreActions(s).length);
});

test('completed-world heirs preserve regional lore without claiming their parent’s personal birth omen',()=>{
  const s=state('inherited-lore',8);s.timeline.contentVersion=6;s.timeline.birthDay=40*365+137;s.day=s.timeline.birthDay+8*365;s.campaign={fate:'thorn',ageClues:[],facts:{inheritedResolution:true}};initializeLore(s);
  assert.equal(regionalLoreContext(s).knownOmen,null);assert.equal(regionalLoreContext(s).fateName,null);assert.ok(!loreView(s).summary.includes('Your Rootremembered birth omen'));
  const before=structuredClone(s.lore);s.locationId='forest';applyLoreAction(s,'lore_read_grove',context(s));assert.ok(!s.event.body.includes('At four, you saw roots'));s.event=null;s.lore.pending=null;assert.deepEqual(s.lore,before);
  s.timeline.contentVersion=4;assert.equal(regionalLoreContext(s).fateName,'Rootremembered','old pending content retains its original personal context');
});
