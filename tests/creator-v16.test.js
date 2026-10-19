import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_OPTIONS, isCanonicalAppearance, normalizeAppearance } from '../dist/js/avatar.js';
import { generateCharacter } from '../dist/js/characters.js';
import { availableOrigins, originAllowed, rollLifeCircumstances } from '../dist/js/origins.js';
import { defaultCreatorDraft, captureCreatorDraft, randomizeCreatorDraft, randomizeCreatorPortrait, renderCharacterCreator, renderCreatorOriginOptions } from '../dist/js/creator.js';

const ancestries=AVATAR_OPTIONS.find(field=>field.key==='ancestry').options.map(option=>option.value);

test('changing ancestry resets an unavailable origin to fate and redraws its hidden community',()=>{
  for(const ancestry of ancestries){
    const origin=availableOrigins(ancestry).find(o=>ancestries.some(other=>!originAllowed(o.id,other)));
    assert.ok(origin,`${ancestry} has an ancestry-bound beginning`);
    let d=captureCreatorDraft({ancestry,originId:origin.id,startAge:0},defaultCreatorDraft('boundary-birth'));
    assert.equal(d.originId,origin.id);
    assert.equal(d.originCommunity,rollLifeCircumstances(d.seed,origin.id,ancestry).originCommunity);
    const other=ancestries.find(value=>!originAllowed(origin.id,value));
    d=captureCreatorDraft({ancestry:other},d);
    assert.equal(d.originId,'random');
    assert.equal(d.appearance.ancestry,other);
    assert.equal(d.originCommunity,rollLifeCircumstances(d.seed,'random',other).originCommunity);
    const html=renderCreatorOriginOptions(d);
    assert.ok(!html.includes(`value="${origin.id}"`));
    assert.match(html,/<input type="hidden" name="originId" value="random"/);
    for(const offered of availableOrigins(other))assert.ok(html.includes(`data-id="${offered.id}"`));
  }
});

test('birth origin cards describe the guardians and community rather than adult deeds',()=>{
  for(const ancestry of ancestries){
    const d=captureCreatorDraft({ancestry,startAge:0},defaultCreatorDraft('first-breath'));
    const html=renderCreatorOriginOptions(d);
    for(const origin of availableOrigins(ancestry)){
      assert.ok(typeof origin.birthDescription==='string'&&origin.birthDescription.length>30);
      assert.ok(html.includes(origin.birthDescription.replace(/&/g,'&amp;').replace(/’/g,'’').replace(/'/g,'&#39;')));
      assert.ok(html.includes(origin.communityName));
    }
  }
});

