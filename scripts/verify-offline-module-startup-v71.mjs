import { householdCostPreview } from '../dist/js/budget.js';
// Exact complete downloaded module, including its top-level await. One bounded
// semantic VM session; controlled fixture resources are not a lifetime playtest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createContext, Script } from 'node:vm';
import { compileOfflineModule, controlledTimers } from './lib/offline-module-vm.mjs';
import { validateOfflineIdentity, validateUnchangedOfflineIdentity, verificationIdentity } from './lib/release-identity.mjs';
import { fakeSurface, installOfflineDocument } from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { exportFileName } from '../dist/js/edition.js';

const root = new URL('../', import.meta.url), read = path => readFileSync(new URL(path, root));
const identity = await validateOfflineIdentity(root.pathname), verification = await verificationIdentity(root.pathname);
let html = installOfflineDocument(read('artifacts/hearth-and-oath.html').toString('utf8'));
const tag = '<script type="module">', start = html.indexOf(tag), end = html.indexOf('</script>', start + tag.length);
assert.ok(start >= 0 && end > start);
let code = html.slice(start + tag.length, end); html = null;
assert.doesNotMatch(code, /^import\s/m);
const compiled = compileOfflineModule(code, { filename: 'exact-full-module-v71.js' }); code = null;
// This genuine v0.71 export still contains the old generic captions. The
// compiled game must improve only their presentation, keeping the capture.
const opening = E.migrateSave(JSON.parse(read('docs/playtests/farmer-v071/common-freeholder-age16.json')));
assert.equal(opening.age, 16); assert.equal(opening.event?.id, 'birth_year_16'); assert.ok(E.validateSave(opening));
const old = E.migrateSave(JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz'))).states.base);
assert.ok(E.validateSave(old)); assert.equal(old.farm, undefined, 'an old life acquires no invented field');
function adultFarmerCostFixture(){
 const seed='farm-ui-v071';
 let s=E.createBirthGame({seed,name:'Edra Merrow',difficulty:'gentle',household:'poor',station:rollBirthCircumstances(seed,'common','human')});
 function answer(s){
  const preferred={farm_due:'pay',farm_reckoning:'pay',hard_winter:'endure',debt_reckoning:'plead'}[s.event.id];
  const c=s.event.choices.find(c=>c.id===preferred&&!c.disabledReason)||s.event.choices.find(c=>['continue','endure','plead'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);
  assert.ok(c,'the controlled public cost fixture has a lawful continuation');
  return E.chooseEventOption(s,c.id);
 }
 // The controlled purse isolates price disclosure, not earned wealth/balance.
 for(let guard=0;guard<600&&(s.age<18||s.event||s.timeline.yearTarget!==null)&&s.phase!=='retired';guard++){
  s.hero.gold=1000;
  s=s.event?answer(s):s.timeline.yearTarget!==null?E.continueAgeUp(s):E.ageUp(s);
 }
 assert.equal(s.age,18);assert.equal(s.event,null);assert.equal(s.timeline.yearTarget,null);assert.notEqual(s.phase,'retired');
 for(let guard=0;guard<100&&!E.getActions(s).some(a=>a.id==='farm_sow'&&!a.disabledReason)&&s.phase!=='retired';guard++){
  s.hero.gold=100;
  s=s.event?answer(s):s.timeline.yearTarget!==null?E.continueAgeUp(s):E.liveSeason(s);
 }
 s.hero.gold=100;assert.ok(E.validateSave(s));
 const sow=E.getActions(s).find(a=>a.id==='farm_sow'&&!a.disabledReason);assert.ok(sow);
 return s;
}
const wanted = [opening, adultFarmerCostFixture(), old], ui = fakeSurface(), clock = controlledTimers();
const KEY = 'hearth-and-oath:slots:v1', MIRROR = 'hearth-and-oath:life:v1';
const envelope = { version: 1, activeSlot: 0, slots: wanted.map((state, id) => ({ id, state, revision: 'full-module-v71-' + id, updatedAt: '2026-10-24T00:00:00.000Z' })), backups: Object.fromEntries(wanted.map((state, id) => [id, { state: structuredClone(state), updatedAt: '2026-10-24T00:00:00.000Z' }])) };
ui.storage.setItem(KEY, JSON.stringify(envelope)); ui.storage.setItem(MIRROR, JSON.stringify(opening));
let networkAttempts = 0, exportCount = 0, exported = null, anchor = null;
const forbidden = () => { networkAttempts++; throw Error('Network is forbidden during exact full-module verification'); };
class OfflineURL extends URL { static createObjectURL(blob) { exported = blob; return 'blob:full-module-v71'; } static revokeObjectURL(url) { assert.equal(url, 'blob:full-module-v71'); } }
ui.document.createElement = tag => { assert.equal(tag, 'a'); return anchor = { click() { exportCount++; } }; };
const context = createContext({ document: ui.document, localStorage: ui.storage, FormData: ui.FormData, window: { innerWidth: 390, innerHeight: 844, scrollTo() {}, scrollBy() {}, addEventListener() {} }, location: { href: 'file:///hearth-and-oath.html', protocol: 'file:' }, requestAnimationFrame: fn => { fn(); return 1; }, getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }), setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, Blob, URL: OfflineURL, TextEncoder, TextDecoder, console, queueMicrotask, fetch: forbidden, XMLHttpRequest: class { constructor() { forbidden(); } }, WebSocket: class { constructor() { forbidden(); } } });
new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
assert.match(new Script('Function.prototype.toString.call(JSON.parse)').runInContext(context), /\[native code\]/, 'the actual full-module check retains native JSON parsing');
const module = await compiled.evaluate(context);
assert.match(new Script('Function.prototype.toString.call(JSON.parse)').runInContext(context), /\[native code\]/, 'app startup retains native JSON parsing');
assert.equal(module.status, 'evaluated');
const openedDisk = JSON.parse(ui.storage.getItem(KEY));
assert.deepEqual(openedDisk, envelope, 'startup preserves every state, revision, timestamp and backup value');
// Storage normalizes JSON object property order. Every neighboring state and
// metadata value, plus every backup, must stay equal through actual handlers.
const untouched = structuredClone(envelope.slots.slice(1)), backups = structuredClone(envelope.backups);
assert.equal(new Script('typeof __engine').runInContext(context), 'undefined', 'the complete graph keeps actual module lexical scope');
function parity(label) {
  assert.deepEqual(ui.current(), wanted[0], label + ': full active state parity');
  const disk = JSON.parse(ui.storage.getItem(KEY));
  assert.deepEqual(disk.slots.map(row => row.state), wanted, label + ': all three complete lives');
  assert.deepEqual(disk.slots.slice(1), untouched, label + ': neighboring states and metadata');
  assert.deepEqual(disk.backups, backups, label + ': every backup');
  assert.equal(networkAttempts, 0);
}
await ui.click('title-continue'); parity('resume');
assert.ok(ui.root.querySelector('[data-farmer-day]'));
assert.doesNotMatch(ui.root.markup, /Choose this (?:action|approach)\./, 'compiled birthday cards do not show the old filler');
for (const row of ui.root.querySelectorAll('.choice-card')) assert.match(row.textContent, /No time passes\. No gold to pay\./);
const birthdayCare = ui.root.querySelector('[data-op="choice"][data-id="care"]');
assert.match(birthdayCare.textContent, /Strain may rise\./);
assert.match(birthdayCare.textContent, /A bond may fray\./);
assert.doesNotMatch(ui.root.markup, /Stress \+3|bond −2/, 'exact effect numbers stay behind the numbers setting');
assert.equal(wanted[0].event.choices[0].description, 'Choose this action.', 'reading keeps the actual old caption in the saved state');
wanted[0] = E.chooseEventOption(wanted[0], 'care');
await ui.click('choice', 'care'); parity('actual captured birthday choice');
assert.equal(wanted[0].hero.gold, 44, 'the existing one-gold birthday gift is paid once');
assert.equal(wanted[0].event?.id, 'farm_ambition');
for (const row of ui.root.querySelectorAll('.farm-choice')) assert.ok(row.querySelector('[data-farm-choice-cost]'));
wanted[0] = E.chooseEventOption(wanted[0], 'keep');
await ui.click('choice', 'keep'); parity('actual ambition choice');
const beforeBook = JSON.stringify(ui.current());
await ui.click('tab', 'journal'); assert.ok(ui.root.querySelector('[data-farm-book]'));
assert.equal(JSON.stringify(ui.current()), beforeBook); parity('Book reading');
await ui.click('menu', 'header'); await ui.click('export');
assert.equal(exportCount, 1); assert.equal(anchor.download, exportFileName(wanted[0]));
assert.deepEqual(JSON.parse(await exported.text()), wanted[0]); parity('exact export');

// Reuse this exact full-module realm for the adult price disclosure. The second
// farmer's controlled purse isolates the quote; its history came through public
// engine commands. No second media realm or invented past is needed.
const beforeAdult = JSON.parse(ui.storage.getItem(KEY));
await ui.click('title-menu'); await ui.click('title-load'); await ui.click('slot-load', '1');
assert.deepEqual(ui.current(), wanted[1], 'normal slot load reaches the exact adult price fixture');
// Workspace preferences may reopen the Book for this same seeded person.
await ui.click('tab', 'life');
assert.ok(ui.root.querySelector('[data-farmer-day]'), 'the ordinary Day navigation exposes the current farmer plays');
assert.deepEqual(ui.current(), wanted[1], 'Day navigation is free and preserves the complete adult life');
const adultSow = E.getActions(wanted[1]).find(a => a.id === 'farm_sow' && !a.disabledReason);
assert.ok(adultSow); wanted[1] = E.chooseAction(wanted[1], adultSow.id);
await ui.click('activity', adultSow.id);
assert.deepEqual(ui.current(), wanted[1], 'opening sowing is exactly the public command');
const barley = wanted[1].event.choices.find(c => c.id === 'barley' && !c.disabledReason);
assert.ok(barley); assert.equal(barley.days, 3); assert.equal(barley.cost, 3);
const keep = householdCostPreview(wanted[1], barley.days).totalDue;
assert.equal(keep, 1, 'this controlled adult moment has a real household amount due');
const card = ui.root.querySelector('[data-op="choice"][data-id="barley"]');
assert.ok(card); assert.ok(card.querySelector('[data-farm-choice-cost]').textContent.includes('3 days · 3 gold to pay'));
assert.equal(card.querySelector('[data-farm-household-cost]')?.textContent, 'The house needs about 1 gold over this work.', 'the current compiled card discloses house keep with default number settings');
assert.deepEqual(ui.current(), wanted[1], 'reading the full price changes no person, farm, day or purse');
const beforeBarley = wanted[1], afterBarley = E.chooseEventOption(beforeBarley, barley.id);
assert.equal(beforeBarley.hero.gold, 100); assert.equal(afterBarley.day, beforeBarley.day + barley.days);
assert.equal(afterBarley.hero.gold, beforeBarley.hero.gold - barley.cost - keep, 'one action fee and the actual household day settle once');
wanted[1] = afterBarley; await ui.click('choice', barley.id);
assert.deepEqual(ui.current(), wanted[1], 'the actual paid farmer choice matches the whole public-command result');
const afterAdult = JSON.parse(ui.storage.getItem(KEY));
assert.equal(afterAdult.activeSlot, 1); assert.deepEqual(afterAdult.slots.map(row => row.state), wanted);
for (const id of [0, 2]) assert.deepEqual(afterAdult.slots[id], beforeAdult.slots[id], 'the adult work preserves every neighboring state and metadata value');
assert.deepEqual(afterAdult.backups, beforeAdult.backups, 'the adult work preserves all three backups');
assert.equal(networkAttempts, 0);

await validateUnchangedOfflineIdentity(root.pathname, identity);
assert.deepEqual(await verificationIdentity(root.pathname), verification, 'checker/helper/source/fixture inputs remain frozen throughout');
console.log(JSON.stringify({ status: 'PASS', mode: 'complete unchanged SourceTextModule', version: identity.version, artifactSha256: identity.sha256, sessions: 1, cases: ['actual async startup', 'module lexical privacy', 'captured old birthday has useful default cost and risk captions', 'old birthday capture remains unchanged until chosen', 'exact captured birthday command and single gift', 'farmer first choice and visible costs', 'whole-state ambition parity', 'Book read immutability', 'exact current-life export', 'three-slot metadata and backup preservation', 'old-save no invented farm', 'adult compiled own-fee and household-keep disclosure', 'adult complete paid-command parity', 'zero network attempts'], limits: 'A bounded semantic fake DOM session; browser layout and human farmer playtest remain separate.' }, null, 2));
