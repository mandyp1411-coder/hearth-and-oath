import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSave } from '../dist/js/engine.js';
import { AVATAR_OPTIONS, PORTRAIT_FIELDS } from '../dist/js/avatar.js';
import { availableOrigins, originById } from '../dist/js/origins.js';
import { portraitEntry } from '../dist/js/portrait-library.js';
import { portraitLayers } from '../dist/js/avatar.js';

import { fakeSurface } from './helpers/ui-surface.mjs';
import { readFileSync } from 'node:fs';
const oldRulesLife = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url), 'utf8')).states.adult18;

test('the actual entry handlers create, resume and protect three lives through the game menu', async t => {
  const surface = fakeSurface(), originals = new Map();
  const globals = {
    document: surface.document, localStorage: surface.storage, FormData: surface.FormData,
    window: { innerWidth: 1440, scrollTo() {}, scrollBy() {} },
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout: () => 1, clearTimeout() {},
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => { for (const [key, descriptor] of originals) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
  await import(`../dist/js/app.js?entry-flow=${Date.now()}`);
  assert.ok(surface.bodyClasses.has('title-mode'));
  assert.match(surface.root.innerHTML, /class="title-screen"/);
  assert.equal(surface.root.form, null, 'the game opens on a title menu');
  assert.equal(surface.storage.getItem('hearth-and-oath-legacy:life:v1'), null);

  await surface.click('title-new');
  assert.match(surface.root.innerHTML, /Choose a place for your life/);
  await surface.click('slot-new', 0);
  assert.ok(surface.bodyClasses.has('creation-mode'));
  assert.match(surface.root.innerHTML, /<img class="preset-portrait-img"/);
  surface.set('ancestry','human');await surface.fire('input',surface.root.querySelector('[name="ancestry"]'));
  const humanOrigin=availableOrigins('human').find(o=>o.ancestries.includes('human'));
  await surface.click('creator-origin',humanOrigin.id);
  assert.equal(surface.root.form.controls.find(c=>c.name==='originId').value,humanOrigin.id);
  surface.set('ancestry','elf');
  await surface.fire('input',surface.root.querySelector('[name="ancestry"]'));
  assert.equal(surface.root.form.controls.find(c=>c.name==='originId').value,'random','switching peoples clears an incompatible origin');
  const elfOptions=surface.root.querySelector('[data-origin-options]').innerHTML;
  assert.ok(!elfOptions.includes(`data-id="${humanOrigin.id}"`));
  for(const origin of availableOrigins('elf'))assert.ok(elfOptions.includes(`data-id="${origin.id}"`));
  assert.match(surface.preview.innerHTML,/data-ancestry="elf"/);
  surface.set('ancestry','human');await surface.fire('input',surface.root.querySelector('[name="ancestry"]'));
  await surface.click('creator-origin', humanOrigin.id);
  surface.set('startAge', '7');
  const slider=surface.root.querySelector('#start-age');slider.focus();
  await surface.fire('input',slider);
  assert.equal(surface.root.querySelector('#start-age'),slider,'dragging age preserves the focused slider');
  assert.equal(surface.document.activeElement,slider);
  assert.equal(surface.ageValue.textContent,'7');
  assert.match(surface.preview.innerHTML,/data-age="7"/);
  assert.match(surface.preview.innerHTML,/stage-child/);
  await surface.click('creator-step', 1);
  for(const name of ['facialHair','facewear','hairStyle','heritage','skin','faceVariant'])assert.equal(surface.root.querySelector(`[name="${name}"]`),null);
  assert.match(surface.root.innerHTML,/Character attributes/);
  surface.set('startAge','18');await surface.fire('input',surface.root.querySelector('#start-age'));
  await surface.click('creator-random');
  assert.equal(surface.root.querySelector('[name="ancestry"]').value,'human');
  await surface.click('creator-step',0);
  const chosenName='Aster of the Long Road';surface.set('name',chosenName);await surface.fire('input',surface.root.querySelector('[name="name"]'));
  const beforePronouns=surface.preview.innerHTML;
  surface.set('identity','she/her');await surface.fire('input',surface.root.querySelector('[name="identity"]'));
  assert.equal(surface.preview.innerHTML,beforePronouns,'pronouns do not choose a portrait presentation');
  surface.set('ancestry','tiefling');await surface.fire('input',surface.root.querySelector('[name="ancestry"]'));
  // Select a currently offered origin, rather than smuggling a retired shared option.
  await surface.click('creator-step',0);
  const selectedOrigin=availableOrigins('tiefling')[0];await surface.click('creator-origin',selectedOrigin.id);
  await surface.click('creator-step',1);
  await surface.click('creator-portraits');const filter=surface.root.querySelector('[data-gallery-filter="presentation"]');filter.value='feminine';await surface.fire('change',filter);
  const candidate=surface.root.controls.find(c=>c.dataset.op==='gallery-preview');assert.ok(candidate);await surface.click('gallery-preview',candidate.dataset.id);await surface.click('gallery-select',candidate.dataset.id);
  const selectedPreset=candidate.dataset.id;
  assert.equal(surface.root.querySelector('.creator-portrait [data-preset]')?.['data-preset'],selectedPreset,'the creator renders the committed gallery selection');
  await surface.click('creator-back');
  assert.equal(surface.root.querySelector('[name="startAge"]').value,'18');
  await surface.click('creator-step',1);
  await surface.submit();assert.ok(surface.root.querySelector('[data-creator-review]'));await surface.submit();
  assert.ok(surface.bodyClasses.has('game-mode'));
  const aster=surface.current();assert.ok(validateSave(aster));
  assert.equal(aster.age,18);assert.equal(aster.day,18*365);assert.equal(aster.hero.name,chosenName);
  assert.equal(aster.hero.lifeOrigin.id,selectedOrigin.id);assert.equal(aster.hero.appearance.ancestry,'tiefling');
  assert.equal(aster.hero.appearance.portraitSelections.adult,selectedPreset);assert.equal(aster.hero.appearance.portraitPresentation,'feminine');assert.equal(aster.hero.path,'unformed');
  assert.equal(aster.timeline.yearHistory.length,18);
  assert.ok(aster.event,'its opening birthday remains a real waiting choice');
  await surface.click('choice',aster.event.choices[0].id);
  const beforePortrait=surface.current();
  await surface.click('tab','character');await surface.click('portraits');
  assert.match(surface.root.innerHTML,/portrait-gallery-modal/);
  const allPages=surface.root.controls.filter(c=>c.dataset.op==='gallery-preview');assert.ok(allPages.length<=24);
  await surface.click('gallery-page',1);
  const pick=surface.root.controls.find(c=>c.dataset.op==='gallery-preview'&&!c.disabled);
  assert.ok(pick);const selectedArt=portraitEntry(pick.dataset.id);await surface.click('gallery-preview',pick.dataset.id);await surface.click('gallery-select',pick.dataset.id);
  const progressed=surface.current();assert.ok(validateSave(progressed));
  assert.equal(progressed.day,beforePortrait.day);assert.deepEqual(progressed.event,beforePortrait.event);assert.deepEqual(progressed.hero.attributes,beforePortrait.hero.attributes);
  assert.equal(portraitLayers(progressed.hero,{age:progressed.age}).preset.key,selectedArt.key);
  assert.equal(surface.root.querySelector('[role="dialog"]'),null,'confirming the face closes the portrait book');
  await surface.click('title-menu');assert.ok(surface.bodyClasses.has('title-mode'));assert.deepEqual(surface.current(),progressed);
  await surface.click('title-continue');assert.deepEqual(surface.current(),progressed,'Continue resumes exact decisions and time');

  for(const [slot,age] of [[1,0],[2,7]]){
    await surface.click('title-menu');await surface.click('title-new');await surface.click('slot-new',slot);
    surface.set('startAge',String(age));
    if(age===0){
      surface.set('ancestry','dwarf');await surface.fire('input',surface.root.querySelector('[name="ancestry"]'));
      const origin=availableOrigins('dwarf').find(o=>o.ancestries.includes('dwarf'));
      const cards=surface.root.querySelector('[data-origin-options]').innerHTML;
      assert.ok(cards.includes(origin.birthDescription));
      assert.match(surface.preview.innerHTML,/data-age="0"/);
      await surface.click('creator-origin',origin.id);
      surface.set('heritageChoice','sunlands');
      await surface.click('creator-portraits');
      assert.match(surface.root.innerHTML,/Cinder halls|Sunforge clans/);
      const face=surface.root.controls.find(c=>c.dataset.op==='gallery-preview'&&!c.disabled);assert.ok(face);
      await surface.click('gallery-preview',face.dataset.id);await surface.click('gallery-select',face.dataset.id);
      assert.match(surface.root.innerHTML,/Sunforge clans/);
    }
    await surface.submit();await surface.submit();
    assert.equal(surface.current().age,age);assert.ok(validateSave(surface.current()));
    if(age===0){const life=surface.current(),origin=originById(life.hero.lifeOrigin.id);assert.equal(life.hero.appearance.ancestry,'dwarf');assert.equal(life.hero.appearance.heritage,'sunlands');assert.ok(life.hero.appearance.portraitSelections.infant);assert.equal(portraitLayers(life.hero,{age:0}).preset.key,life.hero.appearance.portraitSelections.infant);assert.ok(origin.ancestries.includes('dwarf'));assert.ok(life.event.body.includes(origin.birthDescription));}
    assert.deepEqual(surface.lives()[0],progressed,'other lives stay independent');
  }
  const threeLives = surface.lives();
  await surface.click('title-menu');
  await surface.click('title-new');
  await surface.click('slot-new', 0);
  assert.match(surface.root.innerHTML, /REPLACE A SAVED LIFE/);
  await surface.click('close-modal');
  assert.deepEqual(surface.lives(), threeLives, 'canceling the overwrite preserves every world');
  await surface.click('slot-new', 0);
  await surface.click('confirm-overwrite');
  surface.set('startAge','65');await surface.fire('input',surface.root.querySelector('#start-age'));
  await surface.click('title-menu');await surface.click('creator-discard');
  assert.deepEqual(surface.lives(), threeLives, 'an unfinished replacement never erases its saved life');

  await surface.click('title-settings');
  assert.match(surface.root.innerHTML, /Sound &amp; display/);
  await surface.click('music-toggle');
  await surface.click('sound-toggle');
  assert.ok(surface.storage.getItem('hearth-and-oath-legacy:audio:v1'));
  assert.deepEqual(surface.lives(), threeLives, 'audio settings are independent from all lives');
  await surface.click('title-menu');
  await surface.click('title-load');
  // This build is the archive: a life that lives by the new rules is turned away in a line; one under the old rules is reviewed and labelled.
  await surface.import(JSON.stringify(aster));
  assert.doesNotMatch(surface.root.innerHTML, /REVIEW AN IMPORTED LIFE/);
  assert.match(surface.toast.textContent, /lives by the new rules/);
  await surface.import(JSON.stringify(oldRulesLife));
  assert.match(surface.root.innerHTML, /REVIEW AN IMPORTED LIFE/);
  assert.match(surface.root.innerHTML, /Choose where this life belongs/);
  assert.match(surface.root.innerHTML, /Old rules/);
  await surface.click('close-modal');
  assert.deepEqual(surface.lives(), threeLives, 'an import with no chosen replacement preserves all occupied slots');
  await surface.click('slot-load', 0);
  assert.deepEqual(surface.current(), progressed);
  const beforeInvalid = surface.storage.getItem('hearth-and-oath-legacy:slots:v1');
  await surface.import('{bad json');
  assert.equal(surface.storage.getItem('hearth-and-oath-legacy:slots:v1'), beforeInvalid);
  assert.match(surface.toast.textContent, /not a compatible/);
});
