import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { PORTRAIT_FIELDS, appearanceAtAge, portraitOptions, portraitLockReason, portraitLayers, renderAvatar, normalizeAppearance } from '../dist/js/avatar.js';
import { defaultCreatorDraft, captureCreatorDraft, randomizeCreatorDraft, randomizeCreatorPortrait, renderCharacterCreator, creatorStepTitles } from '../dist/js/creator.js';
import { STARTING_ORIGINS, availableOrigins, rollLifeCircumstances } from '../dist/js/origins.js';

test('origins have coherent but varied hidden circumstances, names, beliefs and tastes',()=>{
  for(const origin of STARTING_ORIGINS){
    const ancestry=origin.ancestries[0]||'human';
    const places=new Set(),means=new Set(),beliefs=new Set(),names=new Set(),tastes=new Set();
    for(let i=0;i<60;i++){
      const f=rollLifeCircumstances(`variety-${i}`,origin.id,ancestry);assert.deepEqual(f,rollLifeCircumstances(`variety-${i}`,origin.id,ancestry));
      assert.equal(f.originId,origin.id);assert.equal(f.ancestry,ancestry);
      assert.ok(origin.places.includes(f.birthplace));assert.ok(origin.families.includes(f.familySetup));assert.ok(origin.means.includes(f.household));
      places.add(f.birthplace);means.add(f.household);beliefs.add(f.belief);names.add(f.name);tastes.add(JSON.stringify(f.preferences));
    }
    assert.ok(places.size>=Math.min(3,origin.places.length));assert.ok(means.size>=Math.min(2,origin.means.length));assert.equal(beliefs.size,4);assert.ok(names.size>40);assert.ok(tastes.size>40);
  }
});
