import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { GEAR_CATALOG, MATERIAL_IDS } from '../dist/js/gear.js';
import { itemArtwork, resolveFoundItem } from '../dist/js/gear-loot.js';
import { CAMP_KITS } from '../dist/js/travel-energy.js';
import { INN_GOODS } from '../dist/js/hospitality-v36.js';
import { DESCENT_PREMISES } from '../dist/js/field-notes-v25.js';
import { inventoryEntries, renderPlayerInventory } from '../dist/js/inventory-ui.js';
import { renderTradeTable } from '../dist/js/shop-ui.js';
import { tradeInventory, newTradeDraft } from '../dist/js/trading.js';
import { carriedArtwork, renderGearArt, renderCarriedArt } from '../dist/js/item-art.js';
import { INVENTORY_ART_GRID, INVENTORY_ART_ATLASES, GEAR_ART_MANIFEST, SUPPLIES_ART_MANIFEST, resolveGearArtwork, resolveCarriedArtwork, resolveInventoryArtwork } from '../dist/js/inventory-art-v39.js';
import { syncCartography } from '../dist/js/cartography.js';
import { fakeSurface } from './helpers/ui-surface.mjs';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { e, button: (label, op, id = '', cls = 'secondary', disabled = false) => `<button type="button" class="${e(cls)}" data-op="${e(op)}" data-id="${e(id)}" ${disabled ? 'disabled' : ''}>${e(label)}</button>` };
const parse = html => { const { root } = fakeSurface(); root.innerHTML = html; return root; };
const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url))));
function fresh() {
  const s = structuredClone(fixture.states.base);
  s.locationId = 'home'; s.cartography.offsite = false; s.cartography.interior = null;
  syncCartography(s);
  // Isolated render fixture: no movement, merchant transaction or recovery runs.
  s.cartography.interior = { siteId: s.locationId, roomId: 'market' };
  s.hero.gold = 1000;
  return s;
}
function assertArt(node, expected, message) {
  assert.ok(node, message);
  assert.equal(node.dataset.artAtlas, expected.atlas, message);
  assert.equal(node.dataset.artKey, expected.key, message);
  assert.equal(+node.dataset.artIndex, expected.index, message);
  assert.equal(+node.dataset.artColumn, expected.column, message);
  assert.equal(+node.dataset.artRow, expected.row, message);
  assert.equal(node.getAttribute('aria-label'), `${expected.label} illustration`, message);
}

test('both 8×8 manifests define 64 disjoint native source rectangles in generation order', () => {
  assert.deepEqual(INVENTORY_ART_GRID, { columns: 8, rows: 8 });
  for (const [atlas, entries] of [['gear', GEAR_ART_MANIFEST], ['supplies', SUPPLIES_ART_MANIFEST]]) {
    assert.equal(entries.length, 64);
    assert.equal(new Set(entries.map(a => a.key)).size, 64);
    assert.equal(new Set(entries.map(a => JSON.stringify(a.sourceRect))).size, 64);
    assert.equal(INVENTORY_ART_ATLASES[atlas].asset, `./art/${atlas}-atlas-v39.webp`);
    for (const art of entries) {
      assert.ok(art.label.length > 2);
      assert.equal(art.atlas, atlas);
      assert.equal(art.column, art.index % 8);
      assert.equal(art.row, Math.floor(art.index / 8));
      assert.deepEqual(art.gridRect, { x: art.column / 8, y: art.row / 8, width: .125, height: .125 });
      const native = INVENTORY_ART_ATLASES[atlas].native, p = art.sourcePixels;
      assert.equal(p.x, native.columns[art.column] + native.inset);
      assert.equal(p.y, native.rows[art.row] + native.inset);
      assert.equal(p.x + p.width, native.columns[art.column + 1] - native.inset);
      assert.equal(p.y + p.height, native.rows[art.row + 1] - native.inset);
      assert.deepEqual(art.sourceRect, { x: p.x / native.width, y: p.y / native.height, width: p.width / native.width, height: p.height / native.height });
      assert.ok(art.sourceRect.x + art.sourceRect.width <= 1 && art.sourceRect.y + art.sourceRect.height <= 1);
      // Recover the source crop from actual CSS sprite size and position. This
      // catches the lower-row truncation caused by assuming a uniform 800% grid.
      const [sx, sy] = art.backgroundSize.split(' ').map(n => parseFloat(n) / 100);
      const [px, py] = art.backgroundPosition.split(' ').map(n => parseFloat(n) / 100);
      const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);
      close(native.width / sx, p.width); close(native.height / sy, p.height);
      close((sx - 1) * px * native.width / sx, p.x); close((sy - 1) * py * native.height / sy, p.y);
    }
    assert.deepEqual(entries[7].gridRect, { x: .875, y: 0, width: .125, height: .125 });
    assert.deepEqual(entries[8].gridRect, { x: 0, y: .125, width: .125, height: .125 });
    assert.deepEqual(entries[63].gridRect, { x: .875, y: .875, width: .125, height: .125 });
    const evidence = JSON.parse(readFileSync(new URL('../docs/art-v39/inventory-grids.json', import.meta.url))).atlases[atlas];
    assert.deepEqual(INVENTORY_ART_ATLASES[atlas].native.columns, evidence.x);
    assert.deepEqual(INVENTORY_ART_ATLASES[atlas].native.rows, evidence.y);
  }
});

test('every actual gear catalog item has its own matching illustration regardless of legacy art collisions', () => {
  assert.equal(GEAR_CATALOG.length, 44, 'Review the ordered generation manifest when real gear changes');
  const before = structuredClone(GEAR_CATALOG), resolved = GEAR_CATALOG.map(resolveGearArtwork);
  assert.deepEqual(resolved.map(a => a.key), GEAR_CATALOG.map(i => i.id));
  assert.equal(new Set(resolved.map(a => a.index)).size, GEAR_CATALOG.length);
  for (const item of GEAR_CATALOG) {
    assert.equal(resolveInventoryArtwork(item).key, item.id);
    assert.equal(itemArtwork(item), resolveGearArtwork(item).index, 'Legacy numeric API uses the shared resolver');
    assert.equal(resolveGearArtwork({ ...item, art: 4 }).key, item.id, 'Old art hints cannot turn rings into shields');
  }
  assert.deepEqual(GEAR_CATALOG, before, 'Resolving art never updates a gameplay item');
  assert.notEqual(itemArtwork(GEAR_CATALOG.find(i => i.id === 'iron_ring')), itemArtwork(GEAR_CATALOG.find(i => i.id === 'oak_shield')));
  assert.notEqual(itemArtwork(GEAR_CATALOG.find(i => i.id === 'woodland_spear')), itemArtwork(GEAR_CATALOG.find(i => i.id === 'starter_sword')));
});

test('found and crafted gear retain their exact base-item picture and their full accessible name', () => {
  for (const baseId of ['woodland_spear', 'focus_ring', 'iron_ring', 'rune_gloves', 'iron_boots']) {
    for (const crafted of [false, true]) {
      const item = resolveFoundItem({ id: 'found_example_1', baseId, quality: 'uncommon', affix: 'duelist', tier: 1, crafted, source: 'home', day: 20 }, GEAR_CATALOG);
      const before = structuredClone(item), art = resolveGearArtwork(item);
      assert.equal(art.key, baseId);
      assert.equal(art.label, item.name);
      assert.equal(art.index, itemArtwork(GEAR_CATALOG.find(i => i.id === baseId)));
      assertArt(parse(renderGearArt(item)).querySelector('.item-art'), art);
      assert.deepEqual(item, before);
    }
  }
  assert.equal(resolveGearArtwork({ id: 'unknown-item', slot: 'ring', art: 4 }).key, 'category_ring');
  assert.equal(resolveGearArtwork({ id: 'old-unknown-item', art: 15 }).key, 'bone_focus');
  assert.equal(resolveGearArtwork({ id: 'travellers-spear', slot: 'weapon' }).key, 'category_spear');
  assert.equal(resolveGearArtwork({ name: 'Ancient crossbow', slot: 'weapon' }).key, 'category_crossbow');
});

test('real carried resources, inn meals and all three camping sizes choose distinct semantic cells', () => {
  const ids = ['potions', 'rations', 'herbs', ...MATERIAL_IDS, ...INN_GOODS.map(g => g.id)];
  const arts = ids.map(id => resolveCarriedArtwork({ id: `supply:${id}` }));
  assert.deepEqual(arts.map(a => a.key), ids);
  assert.equal(new Set(arts.map(a => a.index)).size, ids.length);
  assert.deepEqual(['potions', 'rations', 'herbs', 'ore', 'cloth', 'wood', 'stone', 'hide', 'crystal'].map(id => carriedArtwork({ id: `supply:${id}` })), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const s = fresh();
  s.trail.kits = CAMP_KITS.map((kit, i) => ({ id: `camp-${i + 1}`, kind: kit.id, remaining: kit.nights }));
  s.trail.nextKit = 4;
  const owned = inventoryEntries(s).filter(row => row.id.startsWith('camp:'));
  const offered = tradeInventory(s).buy.filter(row => row.id.startsWith('camp:'));
  assert.equal(owned.length, 3); assert.equal(offered.length, 3);
  assert.deepEqual(owned.map(resolveCarriedArtwork).map(a => a.key), CAMP_KITS.map(k => k.id));
  assert.deepEqual(offered.map(resolveCarriedArtwork).map(a => a.key), CAMP_KITS.map(k => k.id));
  assert.equal(new Set(owned.map(carriedArtwork)).size, 3);
  assert.ok(owned.every(row => carriedArtwork(row) !== carriedArtwork({ id: 'supply:rations' }) && carriedArtwork(row) !== carriedArtwork({ id: 'supply:meals' })));
});

test('all actual random loot families, descent relics and unique boss properties depict their carried object', () => {
  const loot = [['reliquary', 'reliquary'], ['seal', 'seal'], ['idol', 'idol'], ['chalice', 'chalice'], ['coin hoard', 'coin_hoard'], ['bone comb', 'bone_comb'], ['iron mask', 'iron_mask'], ['star lens', 'star_lens']];
  for (const prefix of ['Ashen', 'Buried', 'Moon-worn', 'Gilded', 'Cracked', 'Saint’s', 'Serpent’s', 'Salt-black']) for (const [noun, key] of loot) {
    assert.equal(resolveCarriedArtwork({ id: 'loot:generated', name: `${prefix} ${noun}` }).key, key);
  }
  assert.deepEqual(DESCENT_PREMISES.map(p => resolveCarriedArtwork({ id: 'loot:story-record', name: p.relic }).key), ['burial_register', 'hearth_bell', 'road_tally']);
  for (const [kind, name, key] of [
    ['egg', 'The Furnace Widow’s last egg', 'furnace_egg'], ['lens', 'The complete Glass-Tide lens', 'glass_tide_lens'],
    ['crown', 'The borrowed ash crown', 'ash_crown'], ['cup_lead', 'The patron’s dangerous cup receipt', 'cup_receipt'],
  ]) {
    assert.equal(resolveCarriedArtwork({ id: `property:property-boss-${kind}`, name }).key, key);
    assert.equal(resolveCarriedArtwork({ id: `property:property-boss-${kind}` }).key, key, 'Stable property kind works without display text');
  }
  assert.equal(resolveCarriedArtwork({ id: 'loot:theft-1', name: 'Alis’s engraved household silver' }).key, 'household_silver');
  assert.equal(resolveCarriedArtwork({ id: 'loot:theft-2', name: 'Alis’s silver-inlaid dagger' }).key, 'silver_dagger');
  assert.equal(resolveCarriedArtwork({ id: 'loot:unknown', name: 'Silver locket' }).key, 'locket');
  assert.equal(resolveCarriedArtwork({ id: 'loot:unknown', name: 'Silver ring' }).key, 'category_ring');
  assert.equal(resolveCarriedArtwork({ id: 'loot:unknown', name: 'Unidentified carrying bundle' }).key, 'carried_bundle');
  assert.equal(resolveCarriedArtwork({ name: 'Medicinal salve' }).key, 'salve');
  assert.equal(resolveCarriedArtwork({ name: 'Linen bandages' }).key, 'bandages');
});

test('production inventory cells, equipped slots and details share the exact resolver without changing the save', () => {
  const s = fresh();
  s.equipment.owned = GEAR_CATALOG.map(i => i.id);
  s.equipment.equipped.ring = 'iron_ring'; s.equipment.equipped.offhand = 'field_shield';
  s.hero.potions = 2; s.flags.herbs = 3; s.adventuring.rations = 4;
  s.hospitality = { version: 1, bag: { meals: 2, ale: 1 }, used: {}, sites: {} };
  for (const id of MATERIAL_IDS) s.equipment.materials[id] = 2;
  s.trail.kits = CAMP_KITS.map((kit, i) => ({ id: `camp-${i + 1}`, kind: kit.id, remaining: kit.nights })); s.trail.nextKit = 4;
  const before = structuredClone(s), entries = inventoryEntries(s);
  const root = parse(renderPlayerInventory(s, ui, { selectedId: 'gear:iron_ring' }));
  for (const row of entries) assertArt(root.querySelector(`[data-op="inventory-item"][data-id="${row.id}"] .item-art`), resolveCarriedArtwork(row), row.name);
  assertArt(root.querySelector('[data-equipment-slot="ring"] .item-art'), resolveGearArtwork(GEAR_CATALOG.find(i => i.id === 'iron_ring')));
  assertArt(root.querySelector('[data-equipment-slot="offhand"] .item-art'), resolveGearArtwork(GEAR_CATALOG.find(i => i.id === 'field_shield')));
  assertArt(root.querySelector('.inventory-detail .item-art'), resolveGearArtwork(GEAR_CATALOG.find(i => i.id === 'iron_ring')));
  const campRoot = parse(renderPlayerInventory(s, ui, { selectedId: 'camp:camp-3' }));
  assert.equal(campRoot.querySelector('.inventory-detail .item-art').dataset.artKey, 'expedition');
  assert.deepEqual(s, before, 'Rendering cells, equipment and both inspectors consumes no time, resources or stock');
});

test('production shop stock and selected-item detail use the same image as the eventual carried item', () => {
  const s = fresh(), m = s.realm.sites[s.locationId].merchant;
  s.equipment.owned = s.equipment.owned.filter(id => id !== 'glass_ring');
  m.stock.glass_ring = 2; m.potions = 3; m.rations = 5;
  const before = structuredClone(s), session = { vendor: 'market', selected: 'buy:gear:glass_ring', draft: newTradeDraft(s) };
  const root = parse(renderTradeTable(s, session, ui));
  const gearRow = tradeInventory(s).buy.find(r => r.id === 'gear:glass_ring');
  assertArt(root.querySelector('[data-op="shop-item"][data-id="buy:gear:glass_ring"] .item-art'), resolveCarriedArtwork(gearRow));
  assertArt(root.querySelector('.trade-inspector .item-art'), resolveCarriedArtwork(gearRow));
  for (const kit of CAMP_KITS) {
    session.selected = 'buy:camp:' + kit.id;
    const kitRoot = parse(renderTradeTable(s, session, ui));
    assert.equal(kitRoot.querySelector('.trade-inspector .item-art').dataset.artKey, kit.id);
    assert.equal(kitRoot.querySelector(`[data-id="buy:camp:${kit.id}"] .item-art`).dataset.artKey, kit.id);
  }
  assert.deepEqual(s, before, 'Inspecting stock changes neither pricing nor inventory');
});

test('native cropping keeps bottom-row subjects whole and removes atlas dividers', () => {
  const gear = resolveGearArtwork({ id: 'category_ring' });
  const supply = resolveCarriedArtwork({ id: 'loot:unknown', name: 'Unidentified bundle' });
  assert.deepEqual(gear.sourcePixels, { x: 1099, y: 1082, width: 153, height: 170 });
  assert.deepEqual(supply.sourcePixels, { x: 1099, y: 1095, width: 153, height: 157 });
  assert.ok(gear.sourcePixels.y < 1254 * 7 / 8 - 15, 'Preserve the actual top of the final gear row');
  for (const [art, html] of [[gear, renderGearArt({ id: 'category_ring' })], [supply, renderCarriedArt({ id: 'loot:unknown', name: 'Unidentified bundle' })]]) {
    assert.ok(html.includes(`data-art-atlas="${art.atlas}"`));
    assert.doesNotMatch(html,/background-image|data:image/,'Atlas data must be shared in CSS rather than copied into every item');
    assert.ok(readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8').includes("url('"+art.asset+"')"));
    assert.ok(html.includes(`background-size:${art.backgroundSize}`));
    assert.ok(html.includes(`background-position:${art.backgroundPosition}`));
    assert.doesNotMatch(html, /atlas-v28|atlas-v29|background-size:800% 800%/);
  }
});

test('image labels identify each item and escape user-supplied text', () => {
  const unsafe = 'A "named" <relic> & keepsake';
  for (const html of [renderGearArt({ id: 'iron_ring', name: unsafe }), renderCarriedArt({ id: 'loot:x', name: unsafe })]) {
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="A &quot;named&quot; &lt;relic&gt; &amp; keepsake illustration"/);
    assert.doesNotMatch(html, /<relic>/);
  }
});
