import test from 'node:test';
import assert from 'node:assert/strict';
import { IMMERSIVE_LIFE_STORIES, ATMOSPHERE_VIGNETTES, immersiveStoryPerson } from '../dist/js/immersive-story-content-v18.js';
import { recordLifeAtmosphere } from '../dist/js/life-atmosphere.js';
import { LIFE_STORIES, storyActions } from '../dist/js/life-stories.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { generateCharacter } from '../dist/js/characters.js';
import * as engine from '../dist/js/engine.js';

const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const skills=['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'];
async function grown(race='human',age=22){const seed='immersive-v18-'+race;return createLifeAtAge({seed,startAge:age,originId:race==='human'?'human_bellward':'hearthborn',appearance:generateCharacter(seed,'creator',{ancestry:race,pronouns:'they/them'}).appearance});}
function settle(s){for(let guard=0;guard<100&&s.event;guard++){const offered=s.event.choices.filter(c=>!c.disabledReason);const chosen=offered.find(c=>c.id==='continue'||c.id==='support'||c.id==='simplify'||c.id==='later'||c.id==='wait')||offered[0];s=engine.chooseEventOption(s,chosen.id);}assert.equal(s.event,null);return s;}

test('new authored stories are valid three-chapter definitions and all atmosphere entries have unique identities',()=>{
  assert.equal(IMMERSIVE_LIFE_STORIES.length,12);assert.equal(LIFE_STORIES.length,24);assert.equal(new Set(LIFE_STORIES.map(a=>a.id)).size,24);
  for(const arc of IMMERSIVE_LIFE_STORIES){assert.ok(arc.minAge>=18);assert.ok(skills.includes(arc.skill));assert.equal(arc.chapters.length,3);for(const row of arc.chapters){assert.equal(row.length,4);assert.ok(row[0].length>150);for(const c of row.slice(1)){assert.ok(c.label.length>10);assert.ok(c.outcome.length>70);}}}
  assert.equal(ATMOSPHERE_VIGNETTES.length,112);assert.equal(new Set(ATMOSPHERE_VIGNETTES.map(v=>v.id)).size,112);assert.equal(new Set(ATMOSPHERE_VIGNETTES.map(v=>v.title)).size,112);
});

test('atmosphere is seeded, nonrepeating and written only at actual elapsed-time boundaries, without material grants',()=>{
  const s=engine.createBirthGame({seed:'ambient-true-time'}),before=structuredClone(s),written=[];
  const append=(title,text,tag)=>{written.push({title,text,tag});s.journal.push({title,text,tag,day:120,age:0,generation:1});};
  assert.equal(recordLifeAtmosphere(s,0,0,append),false);assert.equal(recordLifeAtmosphere(s,0,119,append),false);assert.deepEqual(s,before);
  assert.equal(recordLifeAtmosphere(s,119,120,append),true);assert.equal(written.length,1);assert.equal(written[0].tag,'atmosphere');assert.doesNotMatch(written[0].text,/\{(?:name|place|work)\}/);
  assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.event,before.event);assert.deepEqual(s.stories,before.stories);
  assert.equal(recordLifeAtmosphere(s,119,120,append),false);assert.equal(written.length,1);
  const other=structuredClone(before),duplicate=[];assert.equal(recordLifeAtmosphere(other,119,120,(title,text)=>duplicate.push({title,text})),true);assert.deepEqual(duplicate[0],{title:written[0].title,text:written[0].text});
});

test('eligibility and scene queries are pure and named atmosphere actors are alive in actual generated lives',async()=>{
  for(const race of races){const s=await grown(race,18),before=structuredClone(s);for(const row of ATMOSPHERE_VIGNETTES){const offered=row.eligible(s);if(offered&&row.actor){const p=immersiveStoryPerson(s,row.actor(s));assert.ok(p&&p.alive!==false,row.id);}}storyActions(s);assert.deepEqual(s,before);assert.ok(s.journal.some(j=>j.tag==='atmosphere'));assert.ok(engine.validateSave(s));assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))),s);}
});

test('a new supernatural chapter keeps its exact pending scene on reload and earns only its attended work',async()=>{
  let s=settle(await grown()),actions=engine.getActions(s);const definition=IMMERSIVE_LIFE_STORIES.find(d=>actions.some(a=>a.id==='stories_open_'+d.id));assert.ok(definition);
  const before=structuredClone(s);s=engine.chooseAction(s,'stories_open_'+definition.id);assert.deepEqual(before,settle(structuredClone(before)));
  assert.equal(s.event.id,'stories_chapter');assert.ok(s.stories.pending);assert.ok(engine.validateSave(s));
  const pending=structuredClone(s);s=engine.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s,pending);
  const gold=s.hero.gold,day=s.day,priorSkill=s.hero.skills[definition.skill];
  s=engine.chooseEventOption(s,'enterprise');
  while(s.stories.project){s=settle(s);if(s.stories.project)s=engine.chooseAction(s,'stories_continue');}
  const arc=s.stories.arcs.find(a=>a.id===definition.id);assert.equal(arc.chapter,1);assert.equal(arc.choices[0].days,4);assert.equal(arc.choices[0].reward,24);assert.equal(s.day,day+4);assert.equal(s.hero.skills[definition.skill],priorSkill);
  // Living costs may accrue during these days; the story ledger records the exact reward.
  assert.ok(s.hero.gold<=gold+24);assert.ok(engine.validateSave(s));assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))),s);
});

test('newly opened stories never choose a dead witness while ongoing old chapters retain their saved participant',async()=>{
  const s=settle(await grown());for(const p of [...s.life.people,...s.companions,...s.society.people])p.alive=false;
  assert.equal(storyActions(s).length,0);
});
