import test from 'node:test';
import {checkPublicChildhoods} from './helpers/childhood-cohort.mjs';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { birthEvent, applyBirthChoice, validateTimeline } from '../dist/js/birth.js';
import { childhoodScene, snapshotChildhoodScene, applyChildhoodScene, validateChildhoodStories } from '../dist/js/childhood-stories.js';

const birthFixtures=new Map();
function atAge(seed, age, flags = {}) {
  if(!birthFixtures.has(seed))birthFixtures.set(seed,engine.createBirthGame({seed,household:'poor'}));
  const s=structuredClone(birthFixtures.get(seed));
  s.age = age; s.day = age * 365; s.event = null;
  s.timeline.yearStartDay = s.day;
  s.timeline.storybook = { version: 1, records: [], flags: structuredClone(flags), items: {}, pending: null };
  return s;
}
const stub = s => ({
  setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; },
  journal() {}, onBirthday() {}, remember() {}, standing() {}, finishObligation() {},
});

test('fresh infancy names the actual caregiver and does not advertise statistical rewards', () => {
  for (const familySetup of ['two_parents', 'single_parent', 'orphan', 'homeless']) {
    for (let n = 0; n < 12; n++) {
      const s = engine.createBirthGame({ seed: `nursery-v9-${n}`, familySetup });
      assert.equal(s.timeline.contentVersion, 7);
      assert.ok(s.event.body.includes(s.life.people.find(p => p.id === 'kin').name));
      assert.equal(s.timeline.storybook.pending.age, 0);
      assert.ok(s.event.choices.every(c => !/\bgain\b|bond|stat|skill|consequence|your identity|your path/i.test(c.description)));
      assert.equal(engine.validateSave(JSON.parse(JSON.stringify(s))), true);
    }
  }
});

test('legacy birth snapshots and fifth-year returns retain the recorded campaign omen without assigning it to heirs', () => {
  const motifs = {
    ember: [/Cold ash warms your blanket/, /cold hearth warms beneath your hand/],
    echo: [/An unpulled bell answers your first cry/, /the unpulled bell answered/],
    thorn: [/A winter seed sprouts beside your cradle/, /Roots from the winter seed beside your cradle/],
  };
  for (const [fate, patterns] of Object.entries(motifs)) {
    for (let n = 0; n < 9; n++) {
      const s = atAge(`canonical-birth-${n}`, 0);delete s.narrativeEdition; // retained pre-grounded authored birth contract
      s.campaign.fate = fate;
      birthEvent(s, stub(s), true);
      assert.match(s.event.body, patterns[0]);
      assert.equal(s.event.body, s.timeline.storybook.pending.scene.body);
      const effects = structuredClone(s.timeline.storybook.pending.scene.choices.map(c => c.effect));
      applyChildhoodScene(s, 'care');
      s.age = 5; s.day = 5 * 365;
      assert.match(childhoodScene(s).body, patterns[1]);
      const heir = atAge(`canonical-birth-${n}`, 0);delete heir.narrativeEdition;
      heir.campaign.fate = fate;
      heir.campaign.facts.inheritedResolution = true;
      const heirBirth = childhoodScene(heir);
      assert.ok(!patterns[0].test(heirBirth.body));
      assert.deepEqual(heirBirth.choices.map(c => c.effect), effects, 'the motif edition must not change birth effects');
      snapshotChildhoodScene(heir, heirBirth); applyChildhoodScene(heir, 'care');
      heir.age = 5; heir.day = 5 * 365;
      assert.ok(!patterns[1].test(childhoodScene(heir).body));
    }
  }
});

test('seeded new childhood offers over thirty authored situations with genuinely different stakes', () => {
  const ids = new Set(), effectShapes = new Set();
  for (let n = 0; n < 120; n++) {
    for (const age of [0, 1, 2, 3, 6, 10, 14]) {
      const s = atAge(`story-pool-v9-${n}`, age);
      if(age>=6&&n%2===0){s.education.enrolled=true;s.education.attendance=1;s.education.attendanceThisYear=1;}
      const chapter = childhoodScene(s);
      ids.add(chapter.id);
      assert.equal(chapter.choices.length, 3);
      assert.equal(new Set(chapter.choices.map(c => c.label)).size, 3);
      snapshotChildhoodScene(s, chapter);
      assert.equal(validateChildhoodStories(s.timeline.storybook, s), true);
      for (const pick of ['care', 'curiosity', 'courage']) {
        const fork = structuredClone(s);
        const result = applyChildhoodScene(fork, pick);
        assert.ok(result.outcome);
        assert.equal(fork.timeline.storybook.pending, null);
        assert.equal(fork.timeline.storybook.records.length, 1);
        assert.equal(validateChildhoodStories(fork.timeline.storybook, fork), true);
        effectShapes.add(JSON.stringify(fork.timeline.storybook.flags));
      }
    }
  }
  assert.ok(ids.size>=39,'the original 37 situations remain reachable alongside the new growth milestones: '+ids.size+' '+[...ids].sort().join(', '));
  assert.ok(effectShapes.size > 80);
});

test('earlier decisions change later encounters and each callback closes its own thread', () => {
  const callbacks = [
    [6, 'hare', ['hidden', 'shared'], 'hare-return', 'hareReturned'],
    [9, 'cup', ['covered', 'told'], 'cup-return', 'cupReturned'],
    [8, 'fox', ['fed', 'chased'], 'fox-return', 'foxReturned'],
    [12, 'borrowedPage', ['kept', 'given'], 'page-return', 'pageReturned'],
    [15, 'attendanceSecret', ['kept', 'reported'], 'attendance-return', 'attendanceReturned'],
    [14, 'householdDebt', ['read', 'unread'], 'debt-return', 'debtReturned'],
    [16, 'firstAffection', ['met', 'silent'], 'affection-return', 'affectionReturned'],
    [5, 'birthThread', ['registered', 'burned'], 'birth-sign', 'fateResponse'],
  ];
  for (const [age, key, values, id, closed] of callbacks) {
    const branches = values.map(value => atAge(`callback-${key}`, age, { [key]: value }));
    const chapters = branches.map(s => childhoodScene(s));
    assert.equal(chapters[0].id, id);
    assert.equal(chapters[1].id, id);
    assert.notEqual(chapters[0].body, chapters[1].body, key);
    for (let n = 0; n < branches.length; n++) {
      snapshotChildhoodScene(branches[n], chapters[n]);
      applyChildhoodScene(branches[n], ['care', 'courage'][n]);
      assert.ok(branches[n].timeline.storybook.flags[closed]);
      if (age !== 5) assert.notEqual(childhoodScene(branches[n]).id, id);
    }
  }
});

test('saved new birthday scenes retain their wording and effects if other contact records later change', () => {
  const s = atAge('snapshot-new-v9', 7);
  birthEvent(s, stub(s));
  const saved = JSON.parse(JSON.stringify(s));
  for (const p of saved.life.people) p.name = `Changed ${p.id}`;
  const before = structuredClone(saved.timeline.storybook.pending.scene);
  assert.deepEqual(childhoodScene(saved), before);
  const eventId = saved.event.id; saved.event = null;
  assert.equal(applyBirthChoice(saved, eventId, 'courage', stub(saved)), true);
  assert.equal(saved.timeline.yearHistory.at(-1).summary, before.choices[2].outcome);
  assert.equal(saved.timeline.storybook.pending, null);
  assert.equal(validateTimeline(saved.timeline, saved), true);
});

test('v4 and v6 pending birthdays settle their original effects before the prospective v7 update', () => {
  for (const version of [4, 6]) {
    const original = atAge(`pending-v${version}`, 11);
    delete original.timeline.storybook;
    original.timeline.contentVersion = version;
    birthEvent(original, stub(original));
    const upgraded = structuredClone(original);
    upgraded.timeline.nextContentVersion = 7;
    const id = original.event.id;
    original.event = null; upgraded.event = null;
    assert.equal(applyBirthChoice(original, id, 'courage', stub(original)), true);
    assert.equal(applyBirthChoice(upgraded, id, 'courage', stub(upgraded)), true);
    assert.deepEqual(upgraded.hero, original.hero);
    assert.deepEqual(upgraded.life, original.life);
    assert.deepEqual(upgraded.timeline.yearHistory, original.timeline.yearHistory);
    assert.equal(upgraded.timeline.contentVersion, 7);
    assert.equal(upgraded.timeline.storybook, undefined);
    assert.equal(validateTimeline(upgraded.timeline, upgraded), true);
  }
});

test('v7 adult chapters use reactions rather than benefit previews and preserve v6 gameplay effects', () => {
  const titles = new Set();
  for (let age = 19; age < 35; age++) {
    const modern = atAge('adult-edition-v9', age);
    delete modern.timeline.storybook;
    modern.hero.gold = 100;
    const old = structuredClone(modern); old.timeline.contentVersion = 6;
    birthEvent(modern, stub(modern)); birthEvent(old, stub(old));
    titles.add(modern.event.title);
    // Current grounded titles may differ from the saved v6 wording; the snapshot and effects must remain exact.
    assert.equal(modern.event.title,modern.timeline.annualScene.title);
    assert.equal(modern.event.body,modern.timeline.annualScene.body);
    assert.ok(!/Gain |bond|household knows|identity remains|you are eighteen|recorded; one shared/i.test(modern.event.body));
    assert.ok(modern.event.choices.every(c => !/\bgain\b|bond|experience|stress|skill/i.test(c.description)));
    for (const pick of ['care', 'curiosity', 'courage']) {
      const a = structuredClone(modern), b = structuredClone(old), id = a.event.id;
      a.event = b.event = null;
      assert.equal(applyBirthChoice(a, id, pick, stub(a)), true);
      assert.equal(applyBirthChoice(b, id, pick, stub(b)), true);
      assert.deepEqual(a.hero, b.hero);
      assert.deepEqual(a.life, b.life);
      assert.deepEqual(a.flags, b.flags);
      const oldChoice = old.event.choices.find(c => c.id === pick);
      const fee = oldChoice.description.match(/\bSpend (\d+) gold/);
      if (fee) {
        assert.match(modern.event.choices.find(c => c.id === pick).description, new RegExp(`${fee[1]} gold`));
        assert.equal(a.hero.gold, 100 - Number(fee[1]));
      }
      assert.ok(!/\bGain\b|bond|career experience|stress falls|gain a professional/i.test(a.timeline.yearHistory.at(-1).summary));
    }
  }
  assert.equal(titles.size, 16);
});

test('one current public-engine childhood validates all decision forks and reaches adulthood', () => {
  assert.equal(checkPublicChildhoods([0],{requireVariety:false}).lives,1);
});

test('malformed story snapshots and duplicate age records are rejected by save validation', () => {
  const s = engine.createBirthGame({ seed: 'invalid-story-v9' });
  const bad = structuredClone(s);
  bad.timeline.storybook.pending.scene.choices[0].effect.gameFlags = { oathBroken: true };
  assert.equal(engine.validateSave(bad), false);
  const wrongAge = structuredClone(s);
  wrongAge.timeline.storybook.pending.age = 1;
  assert.equal(engine.validateSave(wrongAge), false);
  const settled = engine.chooseEventOption(s, 'continue');
  settled.timeline.storybook.records.push(structuredClone(settled.timeline.storybook.records[0]));
  assert.equal(engine.validateSave(settled), false);
});
