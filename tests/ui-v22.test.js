import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame, chooseAction, chooseEventOption, replyMessage, getActions, migrateSave, validateSave, continueAgeUp } from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { nearbyContacts } from '../dist/js/dialogue-ui-v22.js';
import { hexAtlas } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';

// These exercise the production app's delegated handlers over a small semantic
// surface. They do not measure CSS, browser geometry or real device behavior.
const views = ['life','activities','relationships','map','legacy','character','party','inventory','journal'];
const copy = value => structuredClone(value);
const clean = state => ({ ...state, notice: '' });
let adult;
async function adultLife() {
  if (!adult) {
    let state = await createLifeAtAge({ seed: 'hearth-v22-ui-handlers', originId: 'hearthborn', name: 'Aster of the Long Road', startAge: 18 });
    for (let n = 0; n < 80 && (state.event || state.conversations?.pending || state.timeline?.yearTarget !== null); n++) {
      if (state.event) state = chooseEventOption(state, state.event.choices.find(choice => !choice.disabledReason).id);
      else if (state.conversations?.pending) { const pending = state.conversations.pending; state = replyMessage(state, pending.personId, pending.replies[0].id); }
      else state = continueAgeUp(state);
    }
    assert.equal(state.event, null); assert.equal(state.conversations.pending, null);
    assert.ok(validateSave(state)); adult = state;
  }
  return copy(adult);
}
async function resume(t, state = null, options = {}) {
  const surface = await mountApp(t, { states: [state || await adultLife()], ...options });
  await surface.click('title-continue');
  return surface;
}
async function forged(surface, op, id, other = {}) {
  const target = { disabled: false, dataset: { op, id, ...other }, closest(selector) { return selector === '[data-op]' ? this : null; } };
  await surface.fire('click', target);
}

test('all current production menu destinations remain reachable and navigation never changes the saved life', async t => {
  const surface = await resume(t), baseline = surface.current(), slots = surface.lives();
  await surface.click('menu', 'header');
  const menu = surface.root.querySelector('#menu-drawer'); assert.ok(menu);
  const destinations = menu.querySelectorAll('[data-op="tab"]').map(control => control.dataset.id);
  assert.deepEqual(new Set(destinations), new Set(views));
  assert.equal(destinations.length, views.length, 'the all-views menu does not duplicate destinations');
  await surface.click('close-modal');
  for (const id of views) {
    await surface.click('menu', 'header'); await surface.click('tab', id);
    assert.deepEqual(surface.current(), baseline, `opening ${id} cannot change time, gold, identity or discoveries`);
    assert.deepEqual(surface.lives(), slots, `opening ${id} cannot mutate another slot`);
    assert.ok(surface.root.querySelector('.workspace-body'));
  }
  const oldWorkspace = surface.storage.getItem(`hearth-and-oath-legacy:workspace:${baseline.seed}:${baseline.dynasty.generation}`);
  await forged(surface, 'tab', 'not-a-game-view');
  assert.equal(surface.storage.getItem(`hearth-and-oath-legacy:workspace:${baseline.seed}:${baseline.dynasty.generation}`), oldWorkspace);
  assert.deepEqual(surface.current(), baseline);
});

test('Menu Enter activation, Escape, modal focus boundaries and focus return preserve the life', async t => {
  const surface = await resume(t), baseline = surface.current();
  const opener = surface.root.controls.find(control => control.dataset.op === 'menu' && control.dataset.id === 'header');
  opener.focus(); await surface.key('Enter');
  const dialog = surface.root.querySelector('#menu-drawer'); assert.ok(dialog);
  assert.equal(dialog.role, 'dialog'); assert.equal(dialog['aria-modal'], 'true');
  assert.equal(surface.root.querySelector('.game-frame').inert, true);
  assert.equal(surface.document.activeElement.dataset.op, 'close-modal');
  const controls = surface.root.querySelectorAll('.modal button:not(:disabled), .modal a[href], .modal input:not(:disabled), .modal select:not(:disabled), .modal textarea:not(:disabled), .modal [tabindex="0"]').filter(control => control.getClientRects().length);
  controls.at(-1).focus(); await surface.key('Tab'); assert.equal(surface.document.activeElement, controls[0]);
  controls[0].focus(); await surface.key('Tab', { shiftKey: true }); assert.equal(surface.document.activeElement, controls.at(-1));
  await surface.key('Escape');
  assert.equal(surface.root.querySelector('#menu-drawer'), null);
  assert.ok(!surface.root.querySelector('.game-frame').inert);
  assert.equal(surface.document.activeElement.dataset.op, 'menu');
  assert.equal(surface.document.activeElement.dataset.id, 'header');
  assert.deepEqual(surface.current(), baseline);
});

test('Escape still opens Menu from an editor, while numeric shortcuts cannot commit its event', async t => {
  const state = await createLifeAtAge({ seed: 'v22-pending-editor-shortcuts', startAge: 18 });
  assert.ok(state.event);
  const surface = await resume(t, state), baseline = surface.current();
  surface.document.activeElement = { tagName: 'INPUT', value: '1' };
  await surface.key('1'); assert.deepEqual(surface.current(), baseline);
  await surface.key('Escape'); assert.ok(surface.root.querySelector('#menu-drawer'));
  assert.deepEqual(surface.current(), baseline);
});

test('destination exploration and the illustrated location list preserve knowledge',async t=>{
 const surface=await resume(t),baseline=surface.current();await surface.click('tab','map');assert.ok(surface.root.querySelector('.destination-exploration'));assert.equal(surface.root.querySelector('[data-op="spatial-pane"]'),null);assert.equal(surface.root.querySelector('[data-op="spatial-mode"]'),null);assert.deepEqual(surface.current(),baseline);
 const key=`hearth-and-oath-legacy:workspace:${baseline.seed}:${baseline.dynasty.generation}`,before=surface.storage.getItem(key);await forged(surface,'spatial-pane','hidden-debug-view');assert.equal(surface.storage.getItem(key),before);const local=nearbyContacts(baseline)[0];assert.ok(local);await surface.click('place-open');assert.ok(surface.root.querySelector('.place-areas'));await surface.click('spatial-contact',local.id);assert.ok(surface.root.querySelector('.settlement-meeting .dialogue-scene'));assert.deepEqual(surface.current(),baseline);
});

test('settlement selection opens the existing NPC thread; its actual talk and reply IDs drive the engine', async t => {
  const surface = await resume(t), baseline = surface.current();
  const contact = nearbyContacts(baseline).find(person => getActions(baseline).some(action => action.id === `talk_${person.id}` && !action.disabledReason));
  assert.ok(contact, 'a real nearby contact has an offered ordinary conversation');
  await surface.click('place-open');
  await surface.click('spatial-contact', contact.id);
  assert.deepEqual(surface.current(), baseline, 'inspecting someone cannot open, read or reward a thread');
  const panel = surface.root.querySelector(`.dialogue-scene[data-contact-id="${contact.id}"]`);
  assert.ok(panel); assert.match(surface.root.innerHTML, /In person/);
  assert.ok(!surface.current().conversations.pending);
  const expected = chooseAction(baseline, `talk_${contact.id}`);
  await surface.click('activity', `talk_${contact.id}`);
  assert.deepEqual(clean(surface.current()), clean(expected));
  const beforeReply = surface.current(), thread = getThread(beforeReply, contact.id), reply = thread.replies[0];
  assert.ok(reply);
  const command = surface.root.controls.find(control => control.dataset.op === 'reply' && control.dataset.person === contact.id && control.dataset.id === reply.id);
  assert.ok(command && !command.disabled);
  await surface.fire('click', command);
  assert.deepEqual(clean(surface.current()), clean(replyMessage(beforeReply, contact.id, reply.id)));
  assert.ok(validateSave(surface.current()));
});

test('invalid, unavailable and offsite settlement contact commands cannot move time or create a thread', async t => {
  const base = await adultLife(), available = nearbyContacts(base); assert.ok(available.length);
  let offsite = null;
  const atlas = hexAtlas(base);
  for (const action of getActions(base).filter(action => action.id.startsWith('atlas_step_') && !action.disabledReason)) {
    const [, , q, r] = action.id.split('_'); if (atlas.byKey[`${q},${r}`]?.siteId) continue;
    let next = chooseAction(base, action.id);
    for (let n = 0; n < 30 && (next.event || next.cartography.pending); n++) {
      if (next.event) next = chooseEventOption(next, next.event.choices.find(choice => !choice.disabledReason).id);
      else next = chooseAction(next, 'atlas_continue');
      if (next.battle || next.conversations?.pending) break;
    }
    if (next.cartography.offsite && !next.event && !next.battle) { offsite = next; break; }
  }
  assert.ok(offsite && validateSave(offsite), 'the offsite fixture is reached through a real hex crossing');
  await t.test('unknown ID is ignored at an occupied settlement', async t => {
    const surface = await resume(t, base), before = surface.current();
    await forged(surface, 'spatial-contact', 'a-fabricated-person'); assert.deepEqual(surface.current(), before);
    assert.ok(!surface.root.innerHTML.includes('a-fabricated-person'));
  });
  await t.test('a contact unavailable by player age cannot be forged into the inspector', async t => {
    const infant = createBirthGame({ seed: 'v22-age-contact-guard' }); assert.ok(validateSave(infant));
    assert.ok(!getContacts(infant).some(person => person.id === 'fellow'));
    const surface = await resume(t, infant), before = surface.current();
    await forged(surface, 'spatial-contact', 'fellow'); assert.deepEqual(surface.current(), before);
    assert.ok(!surface.root.querySelector('.dialogue-scene[data-contact-id="fellow"]'));
  });
  await t.test('the last hearth contact is unavailable on an actual trail', async t => {
    assert.deepEqual(nearbyContacts(offsite), []);
    const surface = await resume(t, offsite), before = surface.current();
    await forged(surface, 'spatial-contact', available[0].id); assert.deepEqual(surface.current(), before);
    assert.ok(!surface.root.querySelector(`.dialogue-scene[data-contact-id="${available[0].id}"]`));
  });
});

test('changing the person inspected keeps an unfinished reply recoverable with its original target', async t => {
  const state = await adultLife(), local = nearbyContacts(state);
  const person = local.find(contact => getActions(state).some(action => action.id === `talk_${contact.id}` && !action.disabledReason));
  const other = local.find(contact => contact.id !== person.id); assert.ok(other);
  const pending = chooseAction(state, `talk_${person.id}`); assert.ok(pending.conversations.pending);
  const surface = await resume(t, pending), before = surface.current();
  await forged(surface, 'spatial-contact', other.id);
  assert.deepEqual(surface.current(), before);
  await forged(surface, 'spatial-back', '');
  assert.deepEqual(surface.current(), before, 'a view-only Back command cannot discard the required reply');
  const replyShown = surface.root.controls.some(control => control.dataset.op === 'reply' && control.dataset.person === person.id && !control.disabled);
  if (!replyShown) {
    assert.match(surface.root.innerHTML, /waiting for your reply/);
    const recovery = surface.root.controls.find(control => ['spatial-contact','contact'].includes(control.dataset.op) && control.dataset.id === person.id);
    assert.ok(recovery && !recovery.disabled, 'the pending speaker has an explicit recovery command');
    await surface.fire('click', recovery);
  }
  const commands = surface.root.controls.filter(control => control.dataset.op === 'reply' && !control.disabled);
  assert.ok(commands.length); assert.ok(commands.every(control => control.dataset.person === person.id));
  await surface.fire('click', commands[0]);
  assert.equal(surface.current().conversations.pending, null);
  assert.ok(validateSave(surface.current()));
});

test('map selection, zoom and workspace reload preserve UI preferences without changing discoveries or life', async t => {
  const base = await adultLife(), key = Object.keys(base.cartography.sites).find(id=>id!==base.locationId)||base.locationId;
  let stored = [];
  await t.test('production selection and zoom handlers only persist workspace preferences', async t => {
    const surface = await resume(t, base), before = surface.current(), slots = surface.lives();
    await surface.click('tab','map');await surface.click('tab','map'); await surface.click('destination-select', key);
    const workspaceKey = `hearth-and-oath-legacy:workspace:${before.seed}:${before.dynasty.generation}`;
    for (let n = 0; n < 12; n++) await surface.key('+',{target:surface.root.querySelector('[data-map-viewport]')});
    assert.equal(JSON.parse(surface.storage.getItem(workspaceKey)).mapScale, 4);
    for (let n = 0; n < 12; n++) await surface.key('-',{target:surface.root.querySelector('[data-map-viewport]')});
    assert.equal(JSON.parse(surface.storage.getItem(workspaceKey)).mapScale, 1);
    await surface.key('Home',{target:surface.root.querySelector('[data-map-viewport]')}); assert.equal(JSON.parse(surface.storage.getItem(workspaceKey)).mapScale, 1);
    await surface.key('+',{target:surface.root.querySelector('[data-map-viewport]')}); await surface.key('+',{target:surface.root.querySelector('[data-map-viewport]')});
    const workspace = JSON.parse(surface.storage.getItem(workspaceKey));
    assert.equal(workspace.selectedLocation, key);assert.equal(workspace.selectedHex,null); assert.equal(workspace.mapScale, 1.5); assert.equal(workspace.spatialMode, 'country'); assert.equal(workspace.tab, 'map');
    assert.deepEqual(surface.current(), before); assert.deepEqual(surface.lives(), slots);
    assert.deepEqual(surface.current().cartography.cells, before.cartography.cells, 'inspection cannot turn a chart into a visit or reveal a fogged cell');
    const unchanged = surface.storage.getItem(workspaceKey);
    await forged(surface, 'destination-select', 'a-fabricated-destination'); await forged(surface, 'map-zoom', 'unknown');
    const unknownPlace = before.world.locations.find(place => !before.cartography.sites[place.id]); assert.ok(unknownPlace);
    await forged(surface, 'destination-select', unknownPlace.id);
    assert.equal(surface.storage.getItem(workspaceKey), unchanged); assert.deepEqual(surface.current(), before);
    stored = [[workspaceKey, unchanged]];
  });
  await t.test('a fresh app module restores the selected destination and scale from separate workspace storage', async t => {
    const surface = await resume(t, base, { storageEntries: stored });
    const selected = surface.root.controls.find(control => control.dataset.op === 'destination-select' && control.dataset.id === key);
    assert.ok(selected && selected.classList.contains('selected'));
    assert.ok(surface.root.querySelector('.destination-exploration'));
    const workspace = JSON.parse(surface.storage.getItem(stored[0][0])); assert.equal(workspace.mapScale, 1.5); assert.equal(workspace.selectedLocation, key);assert.equal(workspace.selectedHex,null);
    assert.deepEqual(clean(surface.current()), clean(migrateSave(base)));
  });
});

test('display preference changes remain separate from saves and reviewed imports still protect occupied lives', async t => {
  const surface = await resume(t), before = surface.current(), slots = surface.lives();
  await surface.click('menu', 'header');await surface.click('game-settings');
  const scale = surface.root.querySelector('#reading-size'); scale.value = '1.5'; await surface.fire('input', scale);
  const font = surface.root.querySelector('#reading-font'); font.value = 'plain'; await surface.fire('change', font);
  assert.deepEqual(JSON.parse(surface.storage.getItem('hearth-and-oath-legacy:display:v1')), { scale: 1.5, font: 'plain', singleKeyShortcuts:true });
  assert.equal(surface.documentStyle.get('--reading-scale'), '1.5');
  assert.deepEqual(surface.current(), before); assert.deepEqual(surface.lives(), slots);
  await surface.click('close-modal');
  // This build is the archive: a life that lives by the new rules is turned away; one under the old rules is reviewed.
  const born = createBirthGame({ seed: 'v22-reviewed-import', name: 'A separately imported child' });
  await surface.import(JSON.stringify(born)); assert.match(surface.toast.textContent, /lives by the new rules/); assert.deepEqual(surface.lives(), slots);
  const incoming = structuredClone(born); for (const k of ['debt','borrowedGold','debtInterestPaid','lastInterestYear','graceUsed']) delete incoming.householdBudget[k]; delete incoming.hero.station; delete incoming.edition;
  await surface.import(JSON.stringify(incoming));
  assert.match(surface.root.innerHTML, /Choose where this life belongs/); assert.deepEqual(surface.lives(), slots);
  await surface.key('Escape'); assert.deepEqual(surface.lives(), slots);
  await surface.import('{bad json'); assert.deepEqual(surface.lives(), slots); assert.match(surface.toast.textContent, /not a compatible/);
});
