import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { farmerDayVisible, renderFarmerChoices, renderFarmerScene, renderFarmerDay, renderFarmerBook } from '../dist/js/farmer-ui.js';

const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ui = {
  e,
  paragraphs: text => String(text || '').split('\n').filter(Boolean).map(line => `<p>${e(line)}</p>`).join(''),
  button: (text, op, id = '', cls = '', disabled = false) => `<button type="button" class="${cls}" data-op="${op}" data-id="${e(id)}"${disabled ? ' disabled' : ''}>${text}</button>`,
};
const state = () => ({ age: 20, day: 7300, hero: { name: 'Rowan <Ash>' }, farm: { promises: [{ text: 'I will keep the grain for our child.', status: 'kept' }] } });
const model = () => ({
  title: 'The field at dawn', summary: 'One strip by the old willow.', tenure: 'freeholder',
  field: { status: 'held', strips: 1, grain: 3, crop: 'barley' },
  ambition: { id: 'keep', title: 'Keep the family field', text: 'A field left to the child.', fulfilled: false },
  people: [{ id: 'neighbour-1', name: '<Mara>', role: 'Neighbour', want: 'She wants the lower strip.', opinion: -20, bond: 90, memories: ['You left the boundary stone alone.'], voice: 'blunt' }],
  chapters: [{ title: 'The first field', paragraphs: ['You planted barley. Mara lent you the ox.'] }],
  plan: { title: 'The boundary stone', text: 'Mara will meet you after the thaw.', stage: 1 },
  inheritance: { parentName: 'Oswin', story: 'Your father left one narrow strip.', saying: 'The land outlasts the hand.' },
});
const offer = (extra = {}) => ({ id: 'farm_sow', label: 'Sow barley', description: 'The low field drinks the rain.', days: 4, cost: 6, risk: 'Blight may take the crop.', detail: 'Forty in a hundred.', ...extra });
const deepFreeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };

test('the farmer Day is scoped to the new farmer and does not replace a fight or descent', () => {
  assert.equal(farmerDayVisible(state()), true);
  assert.equal(farmerDayVisible({ ...state(), age: 15 }), false);
  assert.equal(farmerDayVisible({ ...state(), farm: undefined }), false);
  // The older walks (the room engine, the v0.27 rooms, the descent's rooms) left in v0.72.4.
  for (const fields of [{ battle: {} }, { delve: {} }, { maze: {} }]) assert.equal(farmerDayVisible({ ...state(), ...fields }), false);
});

test('serious risk and the actual time and fee stay on every choice with numbers hidden', () => {
  const markup = renderFarmerChoices([offer(), offer({ id: 'farm_wait', days: 0, cost: 0, risk: 'Winter may reach the grain.' })], ui);
  assert.match(markup, /data-farm-choice-cost>4 days · 6 gold to pay · Blight may take the crop\./);
  assert.match(markup, /data-farm-choice-cost>Now · No gold to pay · Winter may reach the grain\./);
  assert.doesNotMatch(markup, /Forty in a hundred/);
  assert.match(renderFarmerChoices([offer()], ui, { showNumbers: true }), /Forty in a hundred/);
  assert.match(renderFarmerChoices([offer({ disabledReason: 'The chest is empty.' })], ui), /disabled[^>]*>.*The chest is empty\./);
});

test('a farmer scene keeps its full account and the public choice command', () => {
  const scene = { id: 'farm_due', title: 'The reeve at the door', body: 'The reeve has come. Mara stands beside the cart, and the grain is still wet.', choices: [offer({ id: 'continue', days: undefined, cost: { days: 2, gold: 8 } })] };
  const markup = renderFarmerScene(scene, ui);
  assert.match(markup, /data-op="choice" data-id="continue"/);
  assert.match(markup, /2 days · 8 gold to pay/);
  assert.match(markup, /The reeve has come\./);
  assert.match(markup, /Mara stands beside the cart, and the grain is still wet\./);
  assert.ok(markup.indexOf('data-op="choice"') < markup.indexOf('farm-scene-account'));
});

test('the Day and Book are immutable readers and the decision precedes the ledgers', () => {
  const s = deepFreeze(state()), view = deepFreeze(model()), actions = deepFreeze([offer()]);
  const before = JSON.stringify({ s, view, actions });
  const day = renderFarmerDay(s, view, actions, ui);
  const book = renderFarmerBook(s, view, ui);
  assert.equal(JSON.stringify({ s, view, actions }), before);
  assert.ok(day.indexOf('data-op="activity"') < day.indexOf('The people at your door'));
  assert.ok(day.indexOf('data-op="activity"') < day.indexOf('data-farm-book'));
  assert.match(day, /&lt;Mara&gt;/);
  assert.match(day, /Keeps their distance\. A close bond\./, 'opinion and bond remain distinct');
  assert.match(book, /The Book of Rowan &lt;Ash&gt;/);
  assert.match(book, /You planted barley\. Mara lent you the ox\./);
  assert.match(book, /I will keep the grain for our child\. Kept\./);
  assert.doesNotMatch(day + book, /<ul|<ol|\[object Object\]|undefined|Choose this action/);
});

test('the farmer Day keeps other routes reachable and reveals the Book after death', () => {
  const day = renderFarmerDay(state(), model(), [], ui);
  for (const id of ['activities', 'life:plans', 'journal']) assert.match(day, new RegExp(`data-id="${id}"`));
  assert.match(day, /data-op="place-open"/);
  assert.match(day, /data-op="live-season"/);
  assert.match(renderFarmerBook({ ...state(), phase: 'retired' }, model(), ui), /You planted barley/);
  assert.equal(renderFarmerBook(state(), null, ui), '');
});

test('the app sends farmer scenes through their reader and keeps the first guide out of the farmer decision path', () => {
  const app = readFileSync(new URL('../dist/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if\(event\.id\.startsWith\('farm_'\)\)return renderFarmerScene/);
  assert.match(app, /if\(farmerDayVisible\(game\)\)return '';/);
  assert.match(app, /if\(farmer&&farmerDayVisible\(game\)&&ui\.section==='present'\)/);
  assert.match(app, /farmerDay\?notice:''/);
});
