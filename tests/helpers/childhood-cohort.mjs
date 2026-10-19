import assert from 'node:assert/strict';
import * as engine from '../../dist/js/engine.js';

// Shared assertions are unchanged from the original twelve-life regression.
// Core runs a representative life; full/stress retains the entire original cohort.
export function checkPublicChildhoods(seeds,{requireVariety=true}={}) {
  const titles = new Set();
  for (const n of seeds) {
    let s = engine.createBirthGame({ seed: `public-childhood-v9-${n}`, household: 'poor' });
    let operations = 0;
    while ((s.age < 18 || s.event) && operations++ < 300) {
      if (s.event) {
        if (s.event.id.startsWith('birth_')) {
          const original = structuredClone(s);
          for (const pick of s.age<3?['continue']:['care', 'curiosity', 'courage']) {
            const fork = engine.chooseEventOption(s, pick);
            assert.equal(engine.validateSave(JSON.parse(JSON.stringify(fork))), true, `${n}/${s.age}/${pick}`);
            assert.deepEqual(s, original);
            assert.equal(fork.timeline.storybook.records.length, s.age + 1);
          }
          titles.add(s.event.title);
          s = engine.chooseEventOption(s, s.age<3?'continue':['care', 'curiosity', 'courage'][(n + s.age) % 3]);
        } else s = engine.chooseEventOption(s, s.event.choices.find(c => !c.disabledReason).id);
      } else s = s.timeline.yearTarget === null ? engine.ageUp(s) : engine.continueAgeUp(s);
      assert.equal(engine.validateSave(s), true);
    }
    assert.ok(operations < 300);
    assert.equal(s.age, 18);
    assert.equal(s.timeline.storybook.records.length, 19);
    assert.equal(new Set(s.timeline.storybook.records.map(r => r.sceneId)).size, 19);
    assert.equal(s.hero.path, 'unformed');
    assert.equal(s.education.enrolled, false);
    assert.equal(s.timeline.yearTarget, null);
    assert.equal(s.timeline.storybook.pending, null);
  }
  if (requireVariety) assert.ok(titles.size > 30);
  return {lives:seeds.length,titles:titles.size};
}
