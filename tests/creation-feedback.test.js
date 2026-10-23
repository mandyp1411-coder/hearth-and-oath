import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCreatorDraft,captureCreatorDraft,adjustCreatorAttribute,toggleCreatorTrait,renderCharacterCreator} from '../dist/js/creator.js';
import {STARTING_ATTRIBUTES,attributePointBudget,normalizeAttributePoints,attributePointsSpent,applyStartingAttributes} from '../dist/js/starting-attributes.js';
import {renderTraitSelection} from '../dist/js/personality-ui.js';
import {applyPersonalityBuild} from '../dist/js/personality.js';
import {availableOrigins} from '../dist/js/origins.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import * as E from '../dist/js/engine.js';
import {mountApp} from './helpers/ui-surface.mjs';

test('the six actual attributes get an increasing bounded age allowance with none at birth',()=>{
 assert.deepEqual([0,2,3,6,12,18,30,45,65,80].map(attributePointBudget),[0,0,1,2,4,6,10,15,18,18]);
 for(const age of [0,3,18,45,80]){const points=normalizeAttributePoints(Object.fromEntries(STARTING_ATTRIBUTES.map(k=>[k,500])),age);assert.ok(attributePointsSpent(points)<=attributePointBudget(age));assert.ok(Object.values(points).every(n=>Number.isInteger(n)&&n>=0&&n<=6));}
});
test('creator plus/minus commands cannot overspend, lower below zero or smuggle an unknown attribute',()=>{
 let d=captureCreatorDraft({startAge:18},defaultCreatorDraft('point-choices'));for(let i=0;i<10;i++)d=adjustCreatorAttribute(d,'strength',1);assert.equal(d.attributePoints.strength,6);assert.equal(attributePointsSpent(d.attributePoints),6);const before=structuredClone(d);d=adjustCreatorAttribute(d,'agility',1);assert.deepEqual(d,before);assert.deepEqual(adjustCreatorAttribute(d,'gold',1),before);d=adjustCreatorAttribute(d,'strength',-1);d=adjustCreatorAttribute(d,'vitality',1);assert.equal(d.attributePoints.vitality,1);assert.equal(attributePointsSpent(d.attributePoints),6);d=captureCreatorDraft({startAge:0},d);assert.equal(attributePointsSpent(d.attributePoints),0);
});
test('starting attribute bonuses add once to the same actually simulated past and retain save compatibility',async()=>{
 const config={seed:'attribute-receipt-feedback',startAge:18,difficulty:'gentle'},ordinary=await createLifeAtAge(config),chosen=await createLifeAtAge({...config,attributePoints:{strength:2,vitality:2,intellect:2}});for(const key of STARTING_ATTRIBUTES)assert.equal(chosen.hero.attributes[key],ordinary.hero.attributes[key]-ordinary.hero.startingAttributes.points[key]+({strength:2,vitality:2,intellect:2}[key]||0));assert.equal(chosen.hero.maxHp,ordinary.hero.maxHp-ordinary.hero.startingAttributes.points.vitality*3+6);assert.equal(chosen.hero.hp,Math.min(chosen.hero.maxHp,ordinary.hero.hp-ordinary.hero.startingAttributes.points.vitality*3+6));assert.equal(chosen.hero.maxMp,ordinary.hero.maxMp-ordinary.hero.startingAttributes.points.intellect*3+6);assert.equal(chosen.day,ordinary.day);assert.deepEqual(chosen.timeline,ordinary.timeline);assert.ok(E.validateSave(chosen));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(chosen))),chosen);const before=structuredClone(chosen);assert.equal(applyStartingAttributes(chosen,{strength:6},18),false);assert.deepEqual(chosen,before);delete ordinary.hero.startingAttributes;assert.ok(E.validateSave(ordinary));
});
test('malformed allocation receipts cannot pass import and older lives need no new receipt',async()=>{
 const s=await createLifeAtAge({seed:'attribute-import-feedback',startAge:3,difficulty:'gentle'});for(const changes of [{age:4},{points:{strength:2,agility:0,vitality:0,intellect:0,willpower:0,presence:0}},{points:{strength:0,agility:0,vitality:0,intellect:0,willpower:0,presence:0,gold:99}}]){const bad=structuredClone(s);Object.assign(bad.hero.startingAttributes,changes);assert.equal(E.validateSave(bad),false);}delete s.hero.startingAttributes;assert.ok(E.validateSave(s));
});
test('creation has three compact trait slots and no provisional result in Cast by Fate choices',()=>{
 const d=defaultCreatorDraft('random-private-feedback'),html=renderCharacterCreator(d,1);assert.equal((html.match(/class="trait-slot /g)||[]).length,3);assert.ok(!html.includes('class="trait-card'));assert.ok(!html.includes('Cast by Fate ·'));assert.equal((html.match(/<option value="fate"[^>]*>Cast by Fate<\/option>/g)||[]).length,3);assert.ok(!html.includes('Unwritten</strong>'));
});
test('three-trait creation rejects a fourth and opposing pairs before a real life begins',()=>{
 let d=captureCreatorDraft({startAge:45},defaultCreatorDraft('three-slots-feedback'));for(const id of ['brave','cautious','honest','curious','stoic'])d=toggleCreatorTrait(d,id);assert.deepEqual(d.personalityTraits,['brave','honest','curious']);const html=renderTraitSelection(['brave'],18);assert.ok(/data-id="cautious" disabled/.test(html));assert.ok(html.includes('Conflicts with Brave'));d=toggleCreatorTrait(d,'honest');d=toggleCreatorTrait(d,'deceitful');assert.deepEqual(d.personalityTraits,['brave','curious','deceitful']);
});
test('saved older personalities with more than three traits retain their earned bonuses and remain valid',async()=>{
 const s=await createLifeAtAge({seed:'older-nature-feedback',startAge:45,difficulty:'gentle'});assert.ok(applyPersonalityBuild(s,['brave','honest','curious','stoic']));assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
});
test('production creation opens the selectable trait list, blocks conflict, and applies attribute controls only to the draft',async t=>{
 const ui=await mountApp(t);await ui.click('title-new');await ui.click('slot-new','0');await ui.click('creator-step','1');const slots=ui.storage.getItem('hearth-and-oath-legacy:slots:v1');await ui.click('trait-picker','0');assert.ok(ui.root.querySelector('.trait-picker-modal'));await ui.click('creator-trait','brave');assert.equal(ui.root.querySelector('.trait-picker-modal'),null);await ui.click('trait-picker','1');const opposite=ui.root.querySelector('[data-op="creator-trait"][data-id="cautious"]');assert.ok(opposite.disabled);await ui.click('close-modal');const plus=ui.root.querySelector('[data-op="creator-attribute"][data-id="strength:1"]');assert.ok(!plus.disabled);await ui.click('creator-attribute','strength:1');assert.equal(ui.root.querySelector('output[aria-label="Strength bonus"]').textContent,'+1');assert.equal(ui.storage.getItem('hearth-and-oath-legacy:slots:v1'),slots);assert.equal(ui.current(),null);
});
test('choosing the ancestry already shown by Random reveals its origins and returning to Random clears a restricted origin',async t=>{
 const ui=await mountApp(t);await ui.click('title-new');await ui.click('slot-new','0');const race=ui.root.querySelector('[data-avatar-preview] [data-ancestry]').dataset.ancestry,origin=availableOrigins(race).find(o=>o.ancestries?.length);assert.ok(origin);ui.set('ancestry',race);await ui.fire('input',ui.root.querySelector('[name="ancestry"]'));assert.ok(ui.root.querySelector(`[data-op="creator-origin"][data-id="${origin.id}"]`));assert.match(ui.root.querySelector('[data-heritage-description]').textContent,/revealed when this life begins/);await ui.click('creator-origin',origin.id);ui.set('ancestry','fate');await ui.fire('input',ui.root.querySelector('[name="ancestry"]'));assert.equal(ui.root.querySelector(`[data-op="creator-origin"][data-id="${origin.id}"]`),null);assert.equal(ui.root.form.controls.find(c=>c.name==='originId').value,'random');assert.match(ui.root.querySelector('[data-heritage-description]').textContent,/revealed when this life begins/);assert.equal(ui.current(),null);
});
