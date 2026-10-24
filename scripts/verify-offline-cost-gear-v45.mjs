import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// Execute the exact downloaded module graph against controlled synthetic lives.
// This is actual-handler semantic parity, not browser layout or physical touch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import { actionCostView, actionCostSummary, actionCostDetails } from '../dist/js/action-costs.js';
import { householdCostPreview } from '../dist/js/budget.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { GEAR_CATALOG, ownedGear, gearBonuses } from '../dist/js/gear.js';
import { inventoryEntries } from '../dist/js/inventory-ui.js';
import { lootBasketQuote } from '../dist/js/realm.js';
import { newTradeDraft, quoteTrade } from '../dist/js/trading.js';

const root = new URL('../', import.meta.url), read = path => readFileSync(new URL(path, root));
const version = JSON.parse(read('package.json')).version;
const manifest = JSON.parse(read('dist/offline/manifest.json'));
let bytes = read('artifacts/hearth-and-oath.html');
assert.equal(manifest.version, version, 'manifest identifies this source release');
assert.equal(manifest.bytes, bytes.length, 'manifest exact standalone byte length');
assert.ok(manifest.parts.length > 0, 'standalone parts exist');
const sha256 = createHash('sha256').update(bytes).digest('hex'), partHash = createHash('sha256');
let offset = 0;
for (const [index, entry] of manifest.parts.entries()) {
  assert.equal(entry.file, `game-${String(index + 1).padStart(2, '0')}.part`, 'ordered current parts');
  const part = read('dist/offline/' + entry.file);
  assert.equal(part.length, entry.bytes, entry.file + ' byte length');
  assert.ok(part.equals(bytes.subarray(offset, offset + part.length)), entry.file + ' exact artifact bytes');
  offset += part.length; partHash.update(part);
}
assert.equal(offset, manifest.bytes, 'parts cover the complete standalone');
assert.equal(partHash.digest('hex'), sha256, 'artifact and ordered parts have identical SHA-256');
let html = installOfflineDocument(bytes.toString('utf8')); bytes = null;
assert.ok(html.includes('v' + version), 'standalone labels the release');
const startTag = '<script type="module">', start = html.indexOf(startTag);
assert.ok(start >= 0, 'standalone embeds its module graph');
const end = html.indexOf('</script>', start + startTag.length);
assert.ok(end > start, 'embedded module graph has a closing tag');
let code = html.slice(start + startTag.length, end); html = null;
assert.doesNotMatch(code, /^import\s/m, 'standalone has no external static module import');
let compiled = compileOfflineModule(code,{filename: 'standalone-cost-gear-v45.js' }); code = null;
globalThis.gc?.();

function valid(state) {
  assert.ok(E.validateSave(state), 'complete valid synthetic save: ' + state.notice);
  return state;
}
function roundtrip(state) {
  valid(state);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(state))), state, 'source migration is lossless');
  return state;
}
const base = roundtrip(E.migrateSave(JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz'))).states.base));
function walk(state, room) {
  const path = settlementWalkPath(state, room);
  assert.ok(path, 'reachable synthetic room ' + room);
  for (const id of path) state = valid(E.chooseAction(state, 'atlas_room_' + id));
  return state;
}
function sourceAction(state, id) {
  const action = E.getActions(state).find(row => row.id === id);
  assert.ok(action && !action.disabledReason, 'source offers enabled ' + id);
  return valid(E.chooseAction(state, id));
}
const piece = state => ownedGear(state).find(item => item.stolen);
const crime = roundtrip(walk(structuredClone(base), 'market'));
// Same genuine public-engine sequence as stolen-equipment.test.js. These are
// fixture copies, not a real player's save, and no success is forced by a roll.
let earned = sourceAction(structuredClone(crime), 'justice_steal');
for (const id of ['cooperate', 'pay', 'account']) earned = valid(E.chooseEventOption(earned, id));
earned = roundtrip(sourceAction(earned, 'justice_steal'));
assert.ok(piece(earned), 'source fixture earned an actual stolen piece');
let inn = walk(structuredClone(earned), settlementServices(earned).find(row => row.kind === 'inn').roomId);
inn.hero.gold = 1000;
inn.householdBudget.accruedUnits += 100 * 365; // Explicit earlier outstanding-cost fixture.
roundtrip(inn);
let craft = structuredClone(base);
for (const key of Object.keys(craft.equipment.materials)) craft.equipment.materials[key] = 30;
craft = walk(craft, settlementServices(craft).find(row => row.kind === 'smith').roomId);
craft.day = craft.timeline.birthDay + 23 * 365 - 1;
craft.age = 22; craft.timeline.yearStartDay = craft.day - 364; craft.timeline.yearTarget = null;
syncCartography(craft);
const craftId = 'workshop_craft_padded_gambeson';
craft.hero.gold = E.getActions(craft).find(row => row.id === craftId).cost;
craft.householdBudget.accruedUnits += 100 * 365;
roundtrip(craft);

const ui = fakeSurface(), expectedSlots = [inn, craft, crime].map(state => structuredClone(state));
ui.storage.setItem('hearth-and-oath:slots:v1', JSON.stringify({ version: 1, activeSlot: 0, backups: {}, slots: expectedSlots.map((state, id) => ({ id, state, updatedAt: '2026-10-17T00:00:00.000Z' })) }));
ui.storage.setItem('hearth-and-oath:life:v1', JSON.stringify(inn));
let networkAttempts = 0;
const context = createContext({
  document: ui.document, localStorage: ui.storage, FormData: ui.FormData,
  window: { innerWidth: 390, innerHeight: 844, scrollTo() {}, scrollBy() {} },
  requestAnimationFrame: callback => { callback(); return 1; },
  getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  setTimeout: () => 1, clearTimeout() {}, Blob, URL, TextEncoder, TextDecoder, console, queueMicrotask,
  fetch() { networkAttempts++; throw Error('Network forbidden during standalone verification'); },
});
new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
await compiled.evaluate(context); compiled = null; globalThis.gc?.();
let slot = 0;
const expected = () => expectedSlots[slot];
function parity(label) {
  valid(ui.current());
  assert.deepEqual(ui.current(), expected(), label + ': embedded/source full-state parity');
  assert.deepEqual(ui.lives(), expectedSlots, label + ': all three saved lives preserved independently');
  assert.equal(networkAttempts, 0, label + ': no network attempted');
}
function control(op, id) {
  const node = ui.root.querySelector(`[data-op="${op}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
  assert.ok(node, 'rendered command ' + op + '/' + (id ?? ''));
  return node;
}
async function preview(op, id) { await ui.click(op, id); parity('read-only ' + op + '/' + (id ?? '')); }
async function act(id, op = 'activity') {
  expectedSlots[slot] = sourceAction(expected(), id);
  await ui.click(op, id); parity(op + '/' + id);
}
async function choice(id) {
  assert.ok(expected().event?.choices.some(row => row.id === id && !row.disabledReason), 'source offers choice ' + id);
  expectedSlots[slot] = valid(E.chooseEventOption(expected(), id));
  await ui.click('choice', id); parity('choice/' + id);
}
async function settle() {
  for (let count = 0; expected().event && count < 12; count++) {
    const rows = expected().event.choices;
    const next = rows.find(row => row.id === 'continue' && !row.disabledReason) || rows.find(row => !row.disabledReason);
    assert.ok(next, 'bounded synthetic interruption has an enabled response');
    await choice(next.id);
  }
  assert.equal(expected().event, null, 'bounded fixture interruptions resolved');
}
async function service(kind) {
  await preview('place-open');
  const row = settlementServices(expected()).find(row => row.kind === kind && row.here);
  assert.ok(row, 'actual local provider ' + kind);
  const before = expected();
  expectedSlots[slot] = valid(E.visitService(before, row.id));
  await ui.click('service-open', row.id); parity('visit actual ' + kind);
  assert.equal(expected().day, before.day, 'provider meeting takes no calendar time');
  assert.equal(expected().hero.gold, before.hero.gold, 'provider meeting takes no fee');
  return row;
}
async function load(id) {
  await ui.click('title-menu'); await ui.click('title-load'); await ui.click('slot-load', String(id));
  slot = id; parity('load synthetic slot ' + id); globalThis.gc?.();
}
function quote(id) {
  const action = E.getActions(expected()).find(row => row.id === id);
  assert.ok(action, 'source cost offer ' + id);
  const view = actionCostView(expected(), action), row = control('activity', id);
  assert.ok(row.textContent.includes(actionCostSummary(expected(), action)), id + ' exact direct fee/time');
  const details = actionCostDetails(expected(), action);
  if (details) assert.ok(row.textContent.includes(details), id + ' exact separate materials/accrual details');
  if (view.days > 0) {
    assert.deepEqual(view.household, householdCostPreview(expected(), view.days), id + ' authoritative household estimate');
    assert.ok(row.textContent.includes('Household estimate: +' + view.household.additionalCost + ' Gold'), id + ' new accrual only');
    assert.ok(row.textContent.includes('settled separately from the fee'), id + ' estimate is not the upfront fee');
  }
  return view;
}
function noCarriedPiece(state, item) {
  assert.equal(state.equipment.instances.some(row => row.id === item.id), false);
  assert.equal(state.equipment.owned.includes(item.id), false);
  assert.equal(inventoryEntries(state).some(row => row.item?.id === item.id), false);
  assert.equal(state.adventuring.loot.some(row => row.id === item.provenance.lootId), false, 'no duplicate provenance loot token');
}
async function staleAction(node, id) {
  assert.equal(node.isConnected, false, 'saved activation is detached/stale');
  const before = structuredClone(expectedSlots);
  await ui.fire('click', node); parity('detached activation ignored ' + id);
  assert.deepEqual(ui.lives(), before, id + ': detached activation changes no saved field or receipt');
}

await ui.click('title-continue'); parity('continue initial synthetic life');
await preview('tab', 'activities'); await preview('activities-pane', 'fun');
assert.ok(ui.root.querySelector('.action-cost-help'));
quote('leisure_walk');
await service('inn');
const innQuote = quote('inn_room'), innBefore = expected();
assert.ok(innQuote.household.outstanding >= 100, 'earlier accrued cost is explicitly separate');
assert.ok(ui.root.querySelector('.action-cost-help').textContent.includes(innQuote.household.outstanding + ' Gold has already accrued'));
quote('inn_rumor');
assert.ok(control('activity', 'inn_rumor').textContent.includes('No Time · No Fee'));
await act('inn_room');
assert.equal(expected().day, innBefore.day + 1);
assert.equal(innBefore.hero.gold - expected().hero.gold, innQuote.fee + expected().householdBudget.paidGold - innBefore.householdBudget.paidGold, 'only direct inn fee plus separately settled actual living costs');
assert.equal(expected().householdBudget.accruedUnits - innBefore.householdBudget.accruedUnits, householdCostPreview(innBefore, 1).annual, 'one actual adult day of household accrual');

// Successful return and both stale routes use the same earned piece, no payment.
await preview('place-open');
expectedSlots[slot] = walk(expected(), 'market');
await ui.click('place-area', 'market'); parity('real free walk back to merchant');
await preview('tab', 'inventory');
const returnedItem = piece(expected()), returnId = 'realm_returngear_' + returnedItem.id;
await preview('inventory-item', 'gear:' + returnedItem.id);
const staleReturn = control('activity', returnId), staleReturnSale = control('activity', 'realm_sellgear_' + returnedItem.id);
const returnBefore = expected(), returnStock = returnBefore.realm.sites[returnBefore.locationId].merchant.stock[returnedItem.baseId];
await act(returnId);
assert.equal(expected().hero.gold, returnBefore.hero.gold, 'return pays no gold');
assert.deepEqual(expected().legal, returnBefore.legal, 'return does not erase the criminal report');
assert.equal(expected().realm.sites[expected().locationId].merchant.stock[returnedItem.baseId], returnStock + 1, 'same-season original merchant receives exactly one piece');
noCarriedPiece(expected(), returnedItem);
assert.equal(expected().justice.propertyTransfers.filter(row => row.id === returnedItem.id).length, 1);
assert.equal(expected().justice.propertyTransfers.find(row => row.id === returnedItem.id).outcome, 'returned');
await staleAction(staleReturn, returnId);
await staleAction(staleReturnSale, 'realm_sellgear_' + returnedItem.id);
assert.equal(expected().hero.gold, returnBefore.hero.gold);
assert.equal(expected().realm.sites[expected().locationId].merchant.stock[returnedItem.baseId], returnStock + 1);
roundtrip(expected()); globalThis.gc?.();

await load(1); await service('smith');
await preview('craft-browse'); await preview('craft-item', craftId);
const offer = E.getActions(expected()).find(row => row.id === craftId), review = actionCostView(expected(), offer);
const craftDetail = ui.root.querySelector('.craft-detail'), craftBefore = expected();
assert.ok(craftDetail);
assert.ok(craftDetail.textContent.includes('Direct Fee'));
assert.ok(craftDetail.textContent.includes(review.fee + ' Gold'));
assert.ok(craftDetail.textContent.includes(review.days + ' Days'));
assert.ok(craftDetail.textContent.includes('Expected Living-Cost Accrual'));
assert.ok(craftDetail.textContent.includes('+' + review.household.additionalCost + ' Gold over this time'));
assert.ok(craftDetail.textContent.includes('Settled separately from the fee'));
assert.ok(craftDetail.textContent.includes('Materials Needed'));
for (const material of review.materials) assert.ok(craftDetail.textContent.includes(material.amount + ' Required'));
assert.equal(craftBefore.hero.gold, review.fee, 'controlled exact-direct-fee affordability fixture');
assert.ok(review.household.outstanding >= 100);
let staleCraft = control('craft-confirm', craftId);
assert.equal(staleCraft.disabled, false, 'earlier accrual and new estimate do not enlarge upfront fee');
await act(craftId, 'craft-confirm');
assert.equal(expected().day, craftBefore.day + 1, 'birthday attends only one of the quoted work days');
assert.ok(expected().workshop.project, 'paid project survives birthday interruption');
assert.equal(expected().workshop.project.cost, review.fee);
assert.equal(expected().workshop.project.remainingDays, review.days - 1);
assert.equal(craftBefore.hero.gold - expected().hero.gold, review.fee + expected().householdBudget.paidGold - craftBefore.householdBudget.paidGold, 'one direct fee, separate actual settlement');
for (const material of review.materials) assert.equal(expected().equipment.materials[material.id], craftBefore.equipment.materials[material.id] - material.amount);
await ui.fire('click', staleCraft); parity('detached craft confirmation cannot repeat payment'); staleCraft = null;
await settle();
await preview('tab', 'life'); await preview('workspace-section', 'life:years');
assert.equal(control('workspace-open', 'life:present').closest('.view-attention')?.classList.contains('view-attention'), true, 'current moment Return targets Today, not a retired workshop screen');
await preview('workspace-open', 'life:present');
assert.equal(ui.root.querySelector('.workspace-page').dataset.workspaceSection, 'present');
const continuation = control('activity', 'workshop_continue'), resumeBefore = expected();
await act('workshop_continue');
assert.equal(expected().hero.gold, resumeBefore.hero.gold - (expected().householdBudget.paidGold - resumeBefore.householdBudget.paidGold), 'continuation never repeats prepaid fee');
assert.deepEqual(expected().equipment.materials, resumeBefore.equipment.materials, 'continuation never repeats prepaid materials');
assert.equal(expected().workshop.project, null, 'remaining attendance completes the bounded project');
await staleAction(continuation, 'workshop_continue');
roundtrip(expected()); globalThis.gc?.();

await load(2); await preview('tab', 'activities'); await preview('activities-pane', 'crime');
assert.ok(ui.root.querySelector('[data-disclosure="crime:property"]'));
quote('justice_steal'); quote('justice_burglary'); // Includes the ID8 shared-cost integration correction.
assert.ok(ui.root.querySelector('[data-disclosure="crime:property"]').textContent.includes('not the pickpocket d20'));
const stockBefore = expected().realm.sites[expected().locationId].merchant.stock.iron_sword;
await act('justice_steal');
for (const id of ['cooperate', 'pay', 'account']) await choice(id);
await preview('tab', 'activities'); await preview('activities-pane', 'crime');
await act('justice_steal');
const item = piece(expected()), merchant = expected().realm.sites[expected().locationId].merchant;
assert.ok(item, 'embedded real stall theft yields equipment');
const catalog = GEAR_CATALOG.find(row => row.id === 'iron_sword');
assert.equal(item.baseId, catalog.id); assert.equal(item.name, catalog.name);
assert.deepEqual(item.bonuses, catalog.bonuses); assert.equal(item.price, catalog.price);
assert.equal(item.provenance.ownerId, merchant.id); assert.equal(item.provenance.ownerName, merchant.name);
assert.equal(item.provenance.propertyId, `stock-${merchant.id}-${merchant.season}-iron_sword`);
assert.equal(item.provenance.stockSeason, merchant.season);
assert.equal(item.provenance.value, merchant.prices.iron_sword);
assert.equal(merchant.stock.iron_sword, stockBefore - 1);
assert.equal(expected().adventuring.loot.length, crime.adventuring.loot.length, 'the usable item is not a second saleable loot object');
assert.equal(inventoryEntries(expected()).filter(row => row.item?.id === item.id).length, 1);
assert.equal(lootBasketQuote(expected()).items.some(row => row.id === item.id), false, 'ordinary bulk basket excludes stolen gear');
const draft = newTradeDraft(expected()); draft.sell = [{ id: 'gear:' + item.id, quantity: 1 }];
assert.match(quoteTrade(expected(), draft).disabledReason, /Stolen property/);

await service('merchant'); await preview('shop-browse'); await preview('shop-item', 'sell:gear:' + item.id);
assert.match(ui.root.querySelector('.trade-inspector').textContent, /Stolen property.*will not barter/);
const refused = control('shop-add', 'sell:gear:' + item.id);
assert.equal(refused.disabled, true, 'ordinary shop cannot stage this stolen piece');
await ui.fire('click', refused); parity('disabled ordinary shop staging is free');
// A forged enabled activation still goes through the unmodified production
// handler, which rechecks the current tradeInventory row. No save is altered.
await ui.fire('click', Object.assign(Object.create(refused), { disabled: false }));
parity('fresh ordinary-shop row validation rejects forged staging');
assert.equal(control('shop-confirm').disabled, true, 'no stolen offer can become a payable ordinary trade');

await preview('tab', 'inventory'); await preview('inventory-item', 'gear:' + item.id);
assert.ok(ui.root.querySelector('.inventory-provenance').textContent.includes('Original owner: ' + item.provenance.ownerName));
assert.ok(ui.root.querySelector('.inventory-provenance').textContent.includes('Equipping it does not erase its origin'));
expectedSlots[slot] = valid(E.equipGear(expected(), item.id)); await ui.click('equip', item.id); parity('equip same stolen instance');
assert.deepEqual(gearBonuses(expected()), item.bonuses);
assert.deepEqual(piece(expected()).provenance, item.provenance);
assert.equal(control('activity', 'realm_sellgear_' + item.id).disabled, true, 'equipped stolen piece cannot be sold');
roundtrip(expected());
expectedSlots[slot] = valid(E.equipGear(expected(), 'unequip_weapon')); await ui.click('equip', 'unequip_weapon'); parity('unequip same stolen instance');
const sellId = 'realm_sellgear_' + item.id, sellBefore = expected(), stock = structuredClone(expected().realm.sites[expected().locationId].merchant.stock);
const staleSale = control('activity', sellId), staleSoldReturn = control('activity', 'realm_returngear_' + item.id);
assert.match(ui.root.querySelector('.inventory-property-actions').textContent, /the fence/);
await act(sellId);
assert.equal(expected().day, sellBefore.day, 'fence sale takes no calendar days');
assert.equal(expected().hero.gold, sellBefore.hero.gold + Math.floor(item.provenance.value * .55), 'current local fence pays the recorded original value once');
assert.deepEqual(expected().realm.sites[expected().locationId].merchant.stock, stock, 'fence sale cannot restock the victim or an ordinary merchant');
noCarriedPiece(expected(), item);
const transfers = expected().justice.propertyTransfers.filter(row => row.id === item.id);
assert.equal(transfers.length, 1); assert.equal(transfers[0].outcome, 'sold');
assert.equal(transfers[0].recipientId, 'fence:' + expected().locationId);
assert.deepEqual(transfers[0].provenance, item.provenance);
const soldGold = expected().hero.gold;
await staleAction(staleSale, sellId); await staleAction(staleSoldReturn, 'realm_returngear_' + item.id);
assert.equal(expected().hero.gold, soldGold, 'repeat sale and post-sale return cannot pay again');
assert.deepEqual(expected().realm.sites[expected().locationId].merchant.stock, stock, 'post-sale restitution cannot duplicate inventory stock');
assert.equal(expected().justice.propertyTransfers.filter(row => row.id === item.id).length, 1);
roundtrip(expected()); parity('final bounded cost and stolen-gear gate'); globalThis.gc?.();

console.log(JSON.stringify({ version, bytes: manifest.bytes, parts: manifest.parts.length, sha256,
  checks: ['exact artifact/ordered-part bytes and SHA-256', 'actual embedded Activities/service/craft fee and separate authoritative household estimate', 'read-only reviews including exact-fee affordability despite prior accrual', 'birthday-paused prepaid work and current Life Today Return', 'single-payment/material continuation and stale activation', 'actual embedded stall theft and ordinary catalog item/provenance', 'ordinary shop staging refusal and bulk-basket exclusion', 'same-instance equip/unequip', 'successful no-payment original-owner return exactly once', 'current-fence sale exactly once without ordinary restock or post-sale restitution', 'all three synthetic slots have full source-engine state parity'],
  network: 'forbidden; no attempts', vmProcesses: 1,
  surface: 'semantic DOM handlers only; no browser geometry, CSS visibility, touch or screen-reader claim',
  limits: 'bounded synthetic fixtures only; no real-save mutation/import, exhaustive migration/justice/contraband matrix, hosted deployment or physical browser asset-loading verification',
}, null, 2));
