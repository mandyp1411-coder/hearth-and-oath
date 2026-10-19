import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFERENCE_OPTIONS, DEFAULT_PREFERENCES, initializePreferences, normalizePreferences, preferenceFields, preferencesFromForm, preferenceView, applyPreferenceActivity, validatePreferences } from '../dist/js/preferences.js';

function fixture(values={}) { const s={day:10,age:6,hero:{name:'Rowan',preferences:values,path:'unformed',profession:'Unemployed',gold:30,exp:5,attributes:{intellect:5},skills:{scholarship:2}},life:{happiness:50,stress:20},workshop:{project:null},battle:null};initializePreferences(s);return s; }

test('preferences are complete canonical choices with independent safe defaults',()=>{
  assert.deepEqual(normalizePreferences(null),DEFAULT_PREFERENCES);assert.notEqual(normalizePreferences(null),DEFAULT_PREFERENCES);
  assert.deepEqual(normalizePreferences({pursuit:'Knowledge',socialStyle:'Warm',value:'Mercy',food:'Plant'}),{pursuit:'knowledge',socialStyle:'warm',value:'mercy',food:'plant'});
  assert.deepEqual(normalizePreferences({pursuit:'<script>',socialStyle:{},value:['duty'],food:'" onload="bad'}),DEFAULT_PREFERENCES);
  for(const f of PREFERENCE_OPTIONS)for(const o of f.options)assert.equal(normalizePreferences({[f.key]:o.value})[f.key],o.value);
});

test('migration and free initialization add no stats, resources, experience, wellbeing, or invented memories',()=>{
  const s={day:25,age:18,hero:{gold:8,exp:41,attributes:{strength:8},skills:{weapons:5}},life:{happiness:40,stress:30}};const before=structuredClone(s);initializePreferences(s,{migration:true});assert.deepEqual({...s.hero,preferences:undefined},{...before.hero,preferences:undefined});assert.deepEqual(s.life,before.life);assert.deepEqual(s.preferenceHistory,{lastEnjoymentDay:null,memories:[]});const original=structuredClone(s.preferenceHistory);initializePreferences(s,{values:{pursuit:'combat',food:'spiced'}});assert.equal(s.hero.preferences.pursuit,'combat');assert.deepEqual(s.preferenceHistory,original);assert.deepEqual(s.life,before.life);
});

test('controls and FormData round-trip with descriptions and escaped native HTML',()=>{
  const values={pursuit:'nature',socialStyle:'bold',value:'freedom',food:'sweet'};const fields=preferenceFields(values);assert.equal((fields.match(/<select /g)||[]).length,4);assert.equal((fields.match(/ selected/g)||[]).length,4);assert.ok(!preferenceFields({food:'<img src=x>'}).includes('<img'));
  const data=new FormData();for(const[k,v]of Object.entries(values))data.set(k,v);assert.deepEqual(preferencesFromForm(data),values);assert.deepEqual(preferencesFromForm(Object.fromEntries(data)),values);assert.deepEqual(preferencesFromForm(null),DEFAULT_PREFERENCES);
});

test('a completed favorite pursuit brings small recorded pleasure without boosting the character',()=>{
  const s=fixture({pursuit:'knowledge',socialStyle:'quiet',value:'duty',food:'hearty'}),hero=structuredClone(s.hero),entries=[];assert.equal(applyPreferenceActivity(s,'grow_read',{journal:(...entry)=>entries.push(entry)}),true);assert.equal(s.life.happiness,53);assert.equal(s.life.stress,19);assert.deepEqual(s.hero,hero);assert.equal(s.preferenceHistory.lastEnjoymentDay,10);assert.equal(s.preferenceHistory.memories.length,1);assert.match(s.preferenceHistory.memories[0],/reading/);assert.equal(entries.length,1);assert.equal(validatePreferences(s.hero.preferences,s.preferenceHistory,s),true);
});

test('the 30-day cap survives repeated actions and edits and permits a later real pleasure',()=>{
  const s=fixture();applyPreferenceActivity(s,'grow_read');const before=structuredClone(s.life);for(let i=0;i<10;i++)assert.equal(applyPreferenceActivity(s,'grow_read'),false);assert.deepEqual(s.life,before);
  initializePreferences(s,{values:{pursuit:'combat',socialStyle:'bold',value:'ambition',food:'sweet'}});assert.equal(applyPreferenceActivity(s,'grow_weapons'),false);s.day=39;assert.equal(applyPreferenceActivity(s,'grow_weapons'),false);s.day=40;assert.equal(applyPreferenceActivity(s,'grow_weapons'),true);assert.equal(s.preferenceHistory.memories.length,2);assert.equal(s.life.happiness,56);
});

test('unfinished projects, battles, cosmetics, and explicitly incomplete actions grant no enjoyment',()=>{
  const s=fixture({pursuit:'craft',socialStyle:'quiet',value:'ambition'});assert.equal(applyPreferenceActivity(s,'update_preferences'),false);assert.equal(applyPreferenceActivity(s,'appearance'),false);assert.equal(applyPreferenceActivity(s,'gear_craft_unknown'),false);assert.equal(applyPreferenceActivity(s,'grow_read',{completed:false}),false);
  s.workshop.project={remainingDays:2};assert.equal(applyPreferenceActivity(s,'workshop_build_shelter'),false);s.workshop.project=null;s.battle={outcome:null};assert.equal(applyPreferenceActivity(s,'grow_weapons'),false);assert.equal(s.preferenceHistory.lastEnjoymentDay,null);assert.deepEqual(s.life,{happiness:50,stress:20});
});

test('real workshop completion uses its remembered action rather than awarding on continuation clicks',()=>{
  const s=fixture({pursuit:'craft',socialStyle:'bold',value:'freedom'});assert.equal(applyPreferenceActivity(s,'workshop_continue'),false);assert.equal(applyPreferenceActivity(s,'workshop_continue',{completedActionId:'workshop_build_cottage'}),true);assert.match(s.preferenceHistory.memories[0],/finishing a cottage/);assert.equal(s.life.happiness,53);assert.equal(applyPreferenceActivity(s,'workshop_continue',{completedActionId:'workshop_build_cottage'}),false);
});

test('food, conversation style, and values offer distinct bounded reasons for enjoyment',()=>{
  const sweet=fixture({pursuit:'combat',socialStyle:'quiet',value:'ambition',food:'sweet'});assert.equal(applyPreferenceActivity(sweet,'meal_plant'),false);assert.equal(applyPreferenceActivity(sweet,'meal_sweet'),true);assert.equal(sweet.life.happiness,53);
  const warm=fixture({pursuit:'combat',socialStyle:'warm',value:'ambition',food:'plant'});assert.equal(applyPreferenceActivity(warm,'visit_family'),true);assert.equal(warm.life.happiness,52);
  const mercy=fixture({pursuit:'trade',socialStyle:'bold',value:'mercy',food:'spiced'});assert.equal(applyPreferenceActivity(mercy,'help_clinic'),true);assert.equal(mercy.life.happiness,52);
});

test('view is pure, wellbeing remains bounded, and invalid preference histories fail validation',()=>{
  const s=fixture();const before=structuredClone(s);const view=preferenceView(s);assert.equal(view.items.length,4);assert.ok(view.items.every(i=>i.description.length>10));assert.deepEqual(s,before);s.life.happiness=99;s.life.stress=0;applyPreferenceActivity(s,'grow_read');assert.equal(s.life.happiness,100);assert.equal(s.life.stress,0);
  for(const bad of [{...s.hero.preferences,pursuit:'power'},{...s.hero.preferences,other:'value'},null])assert.equal(validatePreferences(bad),false);
  for(const bad of [{lastEnjoymentDay:s.day+1,memories:[]},{lastEnjoymentDay:-1,memories:[]},{lastEnjoymentDay:null,memories:['invented']},{lastEnjoymentDay:null,memories:[{}]}])assert.equal(validatePreferences(s.hero.preferences,bad,s),false);
});

test('all twelve professions connect completed work to an appropriate favorite pursuit',()=>{
 const jobs={Healer:'community',Merchant:'trade',Scholar:'knowledge',Herbalist:'nature',Soldier:'combat',Blacksmith:'craft',Farmer:'nature',Alchemist:'knowledge',Innkeeper:'community',Miner:'craft',Bard:'community',Cartographer:'knowledge'};
 for(const[profession,pursuit]of Object.entries(jobs)){
  const s=fixture({pursuit,socialStyle:'bold',value:'freedom'});s.hero.profession=profession;
  assert.equal(applyPreferenceActivity(s,'work'),true,`${profession} should enjoy their chosen work`);assert.equal(s.life.happiness,53);
  assert.match(s.preferenceHistory.memories[0],new RegExp(profession.toLowerCase()));
 }
});

test('completed commissions and committed batches award bounded joy; menus and partial commitments do not',()=>{
 const s=fixture({pursuit:'craft',socialStyle:'bold',value:'freedom'});s.hero.profession='Blacksmith';
 for(const id of ['career_choose_blacksmith','career_batch_month','career_batch_year','career_batch_continue','career_batch_cancel','career_masterwork'])assert.equal(applyPreferenceActivity(s,id),false);
 assert.equal(applyPreferenceActivity(s,'career_work_completed',{completed:false}),false);
 assert.equal(applyPreferenceActivity(s,'career_work_completed'),true);assert.equal(s.life.happiness,53);
 s.day+=30;assert.equal(applyPreferenceActivity(s,'career_make_fine'),true);assert.match(s.preferenceHistory.memories.at(-1),/named commission/);
 s.day+=30;assert.equal(applyPreferenceActivity(s,'career_masterwork_completed'),true);assert.match(s.preferenceHistory.memories.at(-1),/lasting blacksmith masterwork/);
 assert.equal(applyPreferenceActivity(s,'career_make_fine'),false);assert.equal(s.life.happiness,59);
 const other=fixture({pursuit:'craft',socialStyle:'bold',value:'freedom'});other.hero.profession='Alchemist';assert.equal(applyPreferenceActivity(other,'career_make_standard'),true);
 other.hero.profession='Fabricated';other.day+=30;assert.equal(applyPreferenceActivity(other,'career_work_completed'),false);
});
