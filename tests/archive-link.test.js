import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {migrateSave,validateSave} from '../dist/js/engine.js';
import {ARCHIVE_URL} from '../dist/js/archive-link.js';
import {rulesOf,exportFileName,OLD,NEW} from '../dist/js/edition.js';
import {mountApp} from './helpers/ui-surface.mjs';

const KEY='hearth-and-oath:slots:v1';
// Real exports from each release's own engine, not current lives edited to
// imitate old rules. This checks the route people use with their actual saves.
const release=version=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${version}.json.gz`,import.meta.url)))).states.eighteen;
const oldRaw=release('0600'),newRaw=release('0690');
function ready(raw,rules){const s=migrateSave(structuredClone(raw));assert.ok(s&&validateSave(s));assert.equal(rulesOf(s),rules);return s;}
function archiveAnchor(host){
  const link=host?.querySelector('a[href]');assert.ok(link,'the actual archive note offers a navigable link');
  assert.equal(link.getAttribute('href'),ARCHIVE_URL,'the rendered link opens the published archive configured by this release');
  assert.equal(new URL(link.getAttribute('href')).protocol,'https:');
  assert.equal(link.getAttribute('target'),'_blank');assert.match(link.getAttribute('rel')||'',/\bnoopener\b/);
  return link;
}
function captureDownloads(t,ui){
  const blobs=[],anchors=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:archive-link-test';};URL.revokeObjectURL=()=>{};
  ui.document.createElement=()=>{const anchor={click(){}};anchors.push(anchor);return anchor;};
  t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});return {blobs,anchors};
}

test('an actual old-rules save has the published archive route on its slot and import review, without changing its life',async t=>{
  const old=ready(oldRaw,OLD),newer=ready(newRaw,NEW),ui=await mountApp(t,{states:[newer,old]});
  const durable=ui.storage.getItem(KEY),current=ui.current(),oldBefore=structuredClone(old),rawBefore=structuredClone(oldRaw);
  await ui.click('title-load');
  const row=ui.root.querySelector('[data-op="slot-load"][data-id="1"]').closest('.save-slot-row');
  const note=row.querySelector('[data-archive-note]');assert.ok(note);
  const exporter=note.querySelector('[data-op="export-session"]');assert.ok(exporter);assert.equal(exporter.dataset.id,'1');
  const downloads=captureDownloads(t,ui);await ui.fire('click',exporter);
  assert.equal(downloads.blobs.length,1);assert.deepEqual(JSON.parse(await downloads.blobs[0].text()),oldBefore,'the archive export retains the complete migrated saved life');
  assert.equal(downloads.anchors[0].download,exportFileName(oldBefore));
  assert.equal(ui.storage.getItem(KEY),durable);assert.deepEqual(ui.current(),current);
  archiveAnchor(note);
  await ui.import(JSON.stringify(oldRaw));
  const review=ui.root.querySelector('.modal');assert.ok(review.querySelector('[data-op="confirm-import"]'));
  assert.ok(review.querySelector('[data-rules="old"]'));archiveAnchor(review);
  assert.equal(ui.storage.getItem(KEY),durable,'reviewing the route cannot replace a slot');assert.deepEqual(ui.current(),current);
  await ui.click('close-modal');
  assert.equal(ui.storage.getItem(KEY),durable);assert.deepEqual(ui.lives(),[newer,oldBefore,null]);assert.deepEqual(ui.current(),current);
  assert.deepEqual(old,oldBefore);assert.deepEqual(oldRaw,rawBefore);
});

test('a genuine new-rules life keeps its normal export and has no archive direction in its slot or import review',async t=>{
  const newer=ready(newRaw,NEW),ui=await mountApp(t,{states:[newer]}),durable=ui.storage.getItem(KEY),current=ui.current();
  await ui.click('title-load');
  const row=ui.root.querySelector('[data-op="slot-load"][data-id="0"]').closest('.save-slot-row');
  assert.ok(row.querySelector('[data-rules="new"]'));assert.ok(row.querySelector('[data-op="export-session"]'));
  assert.equal(row.querySelector('[data-archive-note]'),null);assert.equal(row.querySelector(`a[href="${ARCHIVE_URL}"]`),null);
  assert.doesNotMatch(row.textContent,/Export for the archive/);
  await ui.import(JSON.stringify(newRaw));
  const review=ui.root.querySelector('.modal');assert.ok(review.querySelector('[data-op="confirm-import"]'));
  assert.ok(review.querySelector('[data-rules="new"]'));assert.equal(review.querySelector('[data-archive-note]'),null);
  assert.equal(review.querySelector(`a[href="${ARCHIVE_URL}"]`),null);assert.doesNotMatch(review.textContent,/Export for the archive/);
  assert.equal(ui.storage.getItem(KEY),durable);assert.deepEqual(ui.current(),current);
  await ui.click('close-modal');assert.equal(ui.storage.getItem(KEY),durable);assert.deepEqual(ui.current(),current);
});
