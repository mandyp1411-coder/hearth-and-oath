// Compare a checked-out baseline against this working tree without changing
// either version. Only display prose and the new narrativeFlavor marker are
// normalized. IDs, dates, terms, resources, effects and all other state remain.
// Example baseline preparation:
//   mkdir -p /tmp/hearth-story-baseline
//   git archive c709a98 dist/js package.json | tar -x -C /tmp/hearth-story-baseline
//   node scripts/compare-story-flavor.mjs /tmp/hearth-story-baseline
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

if(!process.argv[2])throw Error('Usage: node scripts/compare-story-flavor.mjs BASELINE_DIRECTORY');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline=resolve(process.argv[2]);
if(baseline===root)throw Error('The baseline must be a separate source tree.');
async function modules(path){
 const load=name=>import(pathToFileURL(resolve(path,'dist/js',name+'.js')).href);
 return {E:await load('engine'),P:await load('life-stories'),R:await load('rpg-depth-v27'),N:await load('narrative-edition'),A:await load('story-allegations'),C:await load('cartography')};
}
const old=await modules(baseline),now=await modules(root);
const fixture=JSON.parse(gunzipSync(readFileSync(resolve(root,'tests/fixtures/v30-explore-travel.json.gz')))).states.base;
const base=now.E.migrateSave(fixture);
assert.ok(base,'The shared starting fixture imports successfully.');
function fresh(){
 const s=structuredClone(base);
 s.hero.gold=10000;s.hero.profession='Scholar';s.careers.records.Scholar.reputation=40;s.factions.villagers=0;
 for(const p of s.life.people)if(p.alive!==false){p.bond=45;if(Number.isFinite(p.relationship))p.relationship=45;}
 return s;
}
const prose=new Set(['title','text','description','body','label','notice','summary']);
function mechanics(value,key=''){
 if(typeof value==='string'&&(prose.has(key)||key==='outcome'&&value.length>25||key==='memories'||key==='rowSnapshot'))return '<prose>';
 if(Array.isArray(value))return value.map(item=>mechanics(item,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([name])=>name!=='narrativeFlavor').map(([name,item])=>[name,mechanics(item,name)]));
 return value;
}
function context(s,m,limit=Infinity){
 return {
  setEvent(id,title,category,body,choices){s.event=m.N.editionEvent(s,{id,title,category,body,choices});},
  spendDays(n){const days=Math.min(n,limit);s.day+=days;return days;},
  standing(key,n){s.factions[key]=Math.max(-100,Math.min(100,s.factions[key]+n));},
  journal(){},journalLiteral(){},
  addEvidence(n,description){
   let record=s.legal.incidents.find(item=>item.locationId===s.locationId);
   if(!record){record={locationId:s.locationId,evidence:0,description};s.legal.incidents.push(record);}
   record.evidence+=n;record.description=description;
  },
  breakOath(){s.flags.flavorOath=true;}
 };
}
let checks=0;
function compare(states,label){assert.deepEqual(mechanics(states[0]),mechanics(states[1]),label);checks++;}
const versions=[old,now],personalId='hearth_letter',regionalId='rainward_last_lantern';
function openPersonal(s,m){
 const arc=s.stories.arcs.find(a=>a.id===personalId);
 // Calendar eligibility is controlled here; actual interruption behavior is
 // exercised separately by tests/story-flavor.test.js.
 if(arc)arc.nextAge=s.age;
 assert.ok(m.P.applyStoryAction(s,'stories_open_'+personalId,context(s,m)));
}
function choosePersonal(s,m,pick){s.event=null;assert.ok(m.P.applyStoryChoice(s,'stories_chapter',pick,context(s,m)));}

for(const pick of ['care','enterprise','coercion']){
 const states=[fresh(),fresh()];
 for(let chapter=0;chapter<3;chapter++){
  for(const [i,m]of versions.entries())openPersonal(states[i],m);
  compare(states,`personal ${pick} chapter ${chapter}: proposal`);
  for(const [i,m]of versions.entries())choosePersonal(states[i],m,pick);
  compare(states,`personal ${pick} chapter ${chapter}: completed`);
 }
}
for(const pick of ['aid','trade','scheme','investigate']){
 const states=[fresh(),fresh()];
 for(const [i,m]of versions.entries()){
  const s=states[i];s.locationId=m.R.regionalAnchor(s,'rainward').id;m.C.syncCartography(s);
  s.hero.skills.stealth=4;s.hero.skills.survival=4;
  assert.ok(m.R.applyRpgAction(s,'rpg_regional_'+regionalId,context(s,m)));
 }
 compare(states,`regional ${pick}: proposal`);
 for(const [i,m]of versions.entries()){
  const s=states[i];s.event=null;assert.ok(m.R.applyRpgChoice(s,'rpg_regional',pick,context(s,m,1)));
 }
 compare(states,`regional ${pick}: interrupted`);
 for(const [i,m]of versions.entries())assert.ok(m.R.applyRpgAction(states[i],'rpg_continue',context(states[i],m)));
 compare(states,`regional ${pick}: completed`);
}
for(const pick of ['care','enterprise','coercion']){
 const states=[fresh(),fresh()];
 for(const [i,m]of versions.entries()){
  const s=states[i];
  for(const prior of ['care','coercion']){openPersonal(s,m);choosePersonal(s,m,prior);}
  s.day=s.stories.allegations[0].readyDay;
  assert.ok(m.A.flushPersonalAllegation(s,context(s,m)));s.event=null;
  assert.ok(m.A.applyPersonalAllegationChoice(s,'correct',context(s,m)));
  openPersonal(s,m);
 }
 compare(states,`corrected claim ${pick}: proposal`);
 for(const [i,m]of versions.entries())choosePersonal(states[i],m,pick);
 compare(states,`corrected claim ${pick}: completed`);
}
console.log(`PASS: ${checks} full-state mechanical comparisons against ${baseline}; only prose strings and narrativeFlavor metadata normalized.`);
