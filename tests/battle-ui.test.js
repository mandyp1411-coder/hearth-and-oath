import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBattleReadModel, renderBattleWorkspace } from '../dist/js/battle-ui.js';
import { createTacticsPractice, takeTacticsPracticeAction } from '../dist/js/tactics-practice.js';
import { previewBattleAction } from '../dist/js/combat.js';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ui = { e, title: value => String(value || ''), meter: (value, max, label) => `<div role="meter" aria-label="${e(label)}" aria-valuenow="${value}" aria-valuemax="${max}"></div>`, chapter: (name, description, label) => `<span>${e(label)}</span><h1>${e(name)}</h1><p>${e(description)}</p>` };
const portraitFor = a => `<span>${e(a.name)}</span>`;

test('shared read model defaults targets and calls actual command previews without mutating the battle', () => {
  const s = createTacticsPractice('cleanse_wound'), before = structuredClone(s.battle);
  const model = buildBattleReadModel(s.battle, { selectedEnemy: 'missing', selectedAlly: 'practice-ally' });
  assert.equal(model.selectedEnemy, 'enemy-1'); assert.equal(model.selectedAlly, 'practice-ally');
  for (const action of model.actions) assert.deepEqual(action.preview, previewBattleAction(s.battle, action.id, action.targetSide === 'party' ? 'practice-ally' : 'enemy-1'));
  assert.deepEqual(s.battle, before);
});

test('life mode retains existing action/radio/preview identities and explicit caller outcome content', () => {
  const s = createTacticsPractice('protect_ally'), html = renderBattleWorkspace(buildBattleReadModel(s.battle), ui, { portraitFor });
  assert.match(html, /data-op="battle-action"/); assert.match(html, /name="battle-target"/); assert.match(html, /name="battle-ally-target"/);
  assert.match(html, /id="battle-preview-defend"/); assert.doesNotMatch(html, /data-practice-session/);
  s.battle.outcome = 'retreat';
  const result = renderBattleWorkspace(buildBattleReadModel(s.battle), ui, { portraitFor, outcomeContent: '<p>Actual caller result</p>' });
  assert.match(result, /Actual caller result/); assert.doesNotMatch(result, /data-op="battle-action"/);
});

test('practice mode namespaces every command and target, and completion stops commands before battle victory', () => {
  const s = createTacticsPractice('protect_ally');
  const options = { portraitFor, sessionId: 'practice-7', idPrefix: 'practice-7', actionOp: 'practice-action', enemyTargetName: 'practice-7-enemy-target', allyTargetName: 'practice-7-ally-target' };
  const html = renderBattleWorkspace(buildBattleReadModel(s.battle), ui, options);
  assert.doesNotMatch(html, /data-op="battle-action"|name="battle-target"|id="battle-preview/);
  for (const control of html.matchAll(/<(?:button|input)\b[^>]*>/g)) assert.match(control[0], /data-practice-session="practice-7"/);
  const complete = takeTacticsPracticeAction(s, 'defend'); assert.equal(complete.battle.outcome, null);
  const ended = renderBattleWorkspace(buildBattleReadModel(complete.battle, { commandsEnabled: false }), ui, { ...options, outcomeContent: '<p>Lesson completed. No life changes.</p>' });
  assert.match(ended, /Lesson completed/); assert.doesNotMatch(ended, /data-op="practice-action"|name="practice-7-(?:enemy|ally)-target"/);
});
