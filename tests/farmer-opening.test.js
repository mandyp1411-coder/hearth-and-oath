import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {farmerOpeningEvent} from '../dist/js/farmer-opening.js';
import {voiceEvent} from '../dist/js/voice.js';
import {mountApp} from './helpers/ui-surface.mjs';
import {EDITION_STEP} from '../dist/js/edition.js';

// These are the two genuine v0.71.0 exports distributed for the farmer
// playtest. They retain their original pending birthday and captured words.
const specs=[
  {file:'common-freeholder-age16.json',seed:'farmer-v071-first-hearth',station:'common',gift:1,captions:[
    'The well has been dry for years.',
    'There may be a passage beneath the well.',
    'Neither of you needs to stay here.'
  ]},
  {file:'bound-tenant-age16.json',seed:'farmer-v071-low-ditch',station:'bound',gift:0,captions:[
    'The ladder is behind the granary.',
    'You can speak before anyone climbs a ladder.',
    'It may be easier to pretend it did not arrive.'
  ]}
];
const archived=specs.map(spec=>JSON.parse(readFileSync(new URL('../docs/playtests/farmer-v071/'+spec.file,import.meta.url),'utf8')));
const clone=value=>structuredClone(value),generic=/Choose this (?:action|approach)\./;
function saved(index=0){return clone(archived[index]);}
// A v0.71 kit life is brought through the later steps (step 72 adds nothing it lacks); every captured value stays.
function imported(index=0){const old=saved(index),before=clone(old),s=engine.migrateSave(old);assert.deepEqual(old,before);assert.ok(engine.validateSave(s));assert.deepEqual(s,{...before,edition:{...before.edition,step:EDITION_STEP}},'import keeps every captured value, not just the mechanical projection');return s;}
function pending(s){return s.timeline.storybook.pending.scene;}
function presentationOnly(s){
  const v=clone(s);delete v.edition.began;
  // These are the only producer fields the repair may change. No historical
  // prose, outcome, effect, fee, person, or timeline value is discarded.
  if(v.event?.id==='birth_year_16')for(const c of v.event.choices)delete c.description;
  if(v.timeline.storybook?.pending?.age===16)for(const c of pending(v).choices)delete c.description;
  return v;
}
function unchangedExceptWords(before,after){
  assert.notEqual(after,before,'a repaired display is a copy');
  const stripped=value=>{const v=clone(value);for(const c of v.choices){delete c.description;delete c.detail;}return v;};
  assert.deepEqual(stripped(after),stripped(before),'the read model preserves all offer metadata');
}

for(const [index,spec] of specs.entries()){
  test(`${spec.station} original opening imports exactly and has a useful immutable display copy`,async t=>{
    const s=imported(index),before=clone(s);
    assert.equal(s.event.id,'birth_year_16');assert.ok(s.event.choices.every(c=>generic.test(c.description)));
    const shown=farmerOpeningEvent(s,s.event);
    unchangedExceptWords(s.event,shown);
    assert.ok(shown.choices.every(c=>c.description.trim()&&!generic.test(c.description)));
    assert.equal(farmerOpeningEvent(s,shown),shown,'a second rendering does not duplicate the warning');
    assert.deepEqual(voiceEvent(s,s.event),shown,'the production voice surface uses the same reader');
    assert.deepEqual(s,before,'reading does not rewrite the save or its pending story');
    const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');
    assert.ok(ui.root.querySelector('[data-farmer-day]'));
    assert.doesNotMatch(ui.root.markup,generic,'the actual opening choice cards contain no default caption');
    assert.deepEqual(ui.current().event,before.event,'the handler surface still owns the original saved event');
    assert.deepEqual(ui.current().timeline.storybook.pending,before.timeline.storybook.pending);
    assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);
  });
}

test('a mismatched birthday never borrows descriptions from a different captured scene',()=>{
  const cases={
    age:s=>s.age++,
    day:s=>s.day++,
    pendingAge:s=>s.timeline.storybook.pending.age++,
    pendingDay:s=>s.timeline.storybook.pending.day++,
    title:s=>s.event.title+=' changed',
    body:s=>s.event.body+=' A different account.',
    choiceId:s=>s.event.choices[0].id='some-other-choice',
    duplicateId:s=>s.event.choices[1].id=s.event.choices[0].id,
    choiceOrder:s=>s.event.choices.reverse(),
    label:s=>s.event.choices[0].label='A different deed',
    missingChoice:s=>s.event.choices.pop(),
    differentEvent:s=>s.event.id='birth_year_17',
    oldContent:s=>s.timeline.contentVersion=6,
    notBirth:s=>s.timeline.mode='legacy',
    noFarm:s=>delete s.farm
  };
  // These controlled copies isolate authentication failures; they are not
  // played lives or fabricated save histories and are never passed as such.
  for(const [name,alter] of Object.entries(cases)){
    const s=saved();alter(s);const before=clone(s);
    assert.equal(farmerOpeningEvent(s,s.event),s.event,name);
    assert.deepEqual(s,before,name+' must remain untouched');
  }
});

test('existing time and fee quotes are retained instead of being replaced by an inferred free choice',()=>{
  for(const [where,key,value] of [
    ['event','days',1],['event','durationDays',2],['event','cost',6],['event','quotedCost',8],
    ['captured','days',1],['captured','durationDays',2],['captured','cost',6],['captured','quotedCost',8]
  ]){
    const s=saved(),choice=where==='event'?s.event.choices[0]:pending(s).choices[0];
    choice[key]=value;const before=clone(s);
    assert.equal(farmerOpeningEvent(s,s.event),s.event,`${where}.${key}`);
    assert.deepEqual(s,before);
  }
});

function negativeFixture(){
  // A controlled typed-effect unit fixture based on the actual bound export.
  // Its zero birthday gift isolates the incident's gold loss from gift income.
  const s=saved(1);s.hero.gold=3;s.life.health=2;s.life.stress=98;
  const person=s.life.people.find(p=>p.id==='fellow'&&p.alive!==false);assert.ok(person);person.bond=2;
  pending(s).choices[0].effect={money:-12,health:-7,stress:5,bonds:{[person.id]:-12}};
  assert.ok(engine.validateSave(s));return {s,person};
}

test('captured losses show the clamped consequences and public commands pay no invented fee',()=>{
  const {s,person}=negativeFixture(),before=clone(s),shown=farmerOpeningEvent(s,s.event),choice=shown.choices[0];
  assert.doesNotMatch(choice.description,generic);assert.match(choice.description,/gold|purse|coin/i);
  assert.match(choice.description,/health|body/i);assert.match(choice.description,/strain|stress/i);
  assert.ok(choice.detail.includes(person.name),'the closer account names the actual affected person');
  assert.match(choice.detail,/3\s+(?:gold|Gold)/);assert.match(choice.detail,/Bodily wellbeing\s*[−-]2/);assert.match(choice.detail,/Stress\s*\+2/);
  assert.ok(choice.detail.includes(`${person.name}: bond −2.`),'the displayed bond loss is clamped to the living bond');
  assert.doesNotMatch(choice.description+' '+choice.detail,/12.gold fee|7\s+(?:health|Health)|\bHP\b/);
  const next=engine.chooseEventOption(s,'care');
  assert.deepEqual(s,before);assert.ok(engine.validateSave(next));assert.equal(next.day,before.day);
  assert.equal(next.hero.gold,0);assert.equal(next.life.health,0);assert.equal(next.life.stress,100);
  assert.equal(next.life.people.find(p=>p.id===person.id).bond,0);
  assert.equal(next.hero.hp,next.hero.maxHp,'the health consequence belongs to life.health, not combat HP');
  assert.equal(next.householdBudget.debt,before.householdBudget.debt);
  assert.equal(next.event?.id,'farm_ambition');assert.equal(next.farm.ambition,null);
});

test('a missing or dead person is not invented as a living relationship risk',()=>{
  for(const missing of [false,true]){
    const {s,person}=negativeFixture();pending(s).choices[0].effect={bonds:{[person.id]:-12}};
    if(missing)s.life.people=s.life.people.filter(p=>p.id!==person.id);else person.alive=false;
    const before=clone(s),shown=farmerOpeningEvent(s,s.event);
    assert.ok(!shown.choices[0].description.includes(person.name));assert.ok(!String(shown.choices[0].detail).includes(person.name));
    assert.doesNotMatch(shown.choices[0].description+' '+shown.choices[0].detail,/bond/i);
    assert.deepEqual(s,before);
  }
});

test('opaque choice metadata survives and fake event effects cannot replace the captured incident',()=>{
  const {s}=negativeFixture();s.event.opaque={source:'a saved display',nested:[3,1]};
  s.event.choices[0].opaque={receipt:'kept',nested:[true,false]};
  s.event.choices[0].effect={money:-999,health:-99,bonds:{invented:-88}};
  s.event.choices[0].disabledReason='Previously captured condition';
  const before=clone(s),shown=farmerOpeningEvent(s,s.event);
  unchangedExceptWords(s.event,shown);
  assert.deepEqual(shown.choices[0].effect,before.event.choices[0].effect);
  assert.deepEqual(shown.choices[0].opaque,before.event.choices[0].opaque);
  assert.equal(shown.choices[0].disabledReason,'Previously captured condition');
  assert.match(shown.choices[0].detail,/3\s+(?:gold|Gold)/);
  assert.doesNotMatch(shown.choices[0].description+' '+shown.choices[0].detail,/999|99|88|invented/);
  assert.deepEqual(s,before);
});

test('two new age-sixteen creations keep their authored captions and every original choice effect',async()=>{
  let creations=0;
  for(const [index,spec] of specs.entries()){
    assert.ok(++creations<=2,'the focused check generates exactly these two lives');
    const fresh=await createLifeAtAge({seed:spec.seed,startAge:16,originId:'human_bellward',appearance:{ancestry:'human'},difficulty:'balanced'});
    assert.ok(engine.validateSave(fresh));assert.equal(fresh.age,16);assert.equal(fresh.day,5840);assert.equal(fresh.hero.station.id,spec.station);
    assert.deepEqual(fresh.event.choices.map(c=>c.description),spec.captions);
    assert.deepEqual(pending(fresh).choices.map(c=>c.description),spec.captions);
    const old=imported(index);assert.deepEqual(presentationOnly(fresh),presentationOnly(old),'only the two current caption surfaces and birth-version label may differ');
    const shown=farmerOpeningEvent(fresh,fresh.event);
    for(const [i,c] of shown.choices.entries())assert.ok(c.description.startsWith(spec.captions[i]),'the visible warning retains the actual authored caption');
    for(const pick of ['care','curiosity','courage']){
      const input=clone(fresh),before=clone(input),oldInput=clone(old),oldBefore=clone(oldInput);
      const actual=engine.chooseEventOption(input,pick),original=engine.chooseEventOption(oldInput,pick);
      assert.deepEqual(input,before);assert.deepEqual(oldInput,oldBefore);
      assert.ok(engine.validateSave(actual));assert.ok(engine.validateSave(original));
      assert.equal(actual.day,before.day);assert.equal(actual.hero.gold,before.hero.gold+spec.gift);
      assert.equal(actual.event?.id,'farm_ambition');assert.equal(actual.farm.ambition,null);
      assert.equal(actual.farm.promises.length,0);assert.equal(actual.farm.field.status,'held');
      assert.deepEqual(presentationOnly(actual),presentationOnly(original),`${spec.station}/${pick}: all stored mechanics and history stay exact`);
    }
  }
  assert.equal(creations,2);
});
