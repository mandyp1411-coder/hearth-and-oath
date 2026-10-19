import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { mazeLayout } from '../dist/js/maze-v31.js';
import { expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { discardGear } from '../dist/js/gear.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled rooms, real entry/cache/return handlers. This is semantic handler
// coverage, not a browser/layout or earned maze route/difficulty test.
let base;
function drain(s){for(let n=0;s.event&&n<40;n++){const c=s.event.choices.find(c=>['withdraw','continue','care','keep','later','pause','ask','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}assert.equal(s.event,null);assert.ok(E.validateSave(s));return s;}
function returnedGear(){
 if(!base){const old=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent;base=E.migrateSave(old);assert.ok(base);base=drain(E.chooseEventOption(base,'withdraw'));}
 let s=structuredClone(base);s.hero.hp=s.hero.maxHp;s.hero.mp=s.hero.maxMp;s.adventuring.rations=5;s=drain(E.chooseAction(s,'adventure_descend'));
 const caches=mazeLayout(s.maze).cells.filter(c=>c.kind==='cache');let id;
 for(const c of caches){s.maze.position=c.id;s.maze.previous=c.doors[0];s.maze.visited=[...new Set([...s.maze.visited,c.id,c.doors[0]])];assert.ok(E.validateSave(s));s=drain(E.chooseAction(s,'maze_search'));id=expeditionVisitTotals(s.maze.expeditionVisit).gains.gear[0]?.id;if(id)break;}
 assert.ok(id,'fixed saved world yields an actual finite cache gear drop');s.maze.position=0;s.maze.previous=0;s=drain(E.chooseAction(s,'maze_exit'));return {s,id};
}

test('receipt comparison opens the exact owned item after stale inventory filters without gameplay mutation',async t=>{
 const {s,id}=returnedGear(),ui=await mountApp(t,{states:[s],width:390,height:844});await ui.click('title-continue');const before=ui.current();
 await ui.click('tab','inventory');await ui.click('inventory-favorites');assert.equal(ui.root.querySelector('[data-op="inventory-favorites"]').getAttribute('aria-pressed'),'true');await ui.click('inventory-category','supplies');
 ui.root.querySelector('#inventory-query').value='no-such-item';ui.root.querySelector('#inventory-slot').value='feet';await ui.fire('submit',ui.root.querySelector('#inventory-search'));
 await ui.click('tab','life');const receiptId=s.mazeBook.expeditionReceipts.at(-1).id;ui.root.querySelector(`[data-disclosure="latest-expedition-receipt:${receiptId}"]`).open=true;ui.root.querySelector(`[data-disclosure="receipt-spoils:${receiptId}"]`).open=true;const control=ui.root.querySelector(`[data-op="receipt-gear"][data-id="${id}"]`);assert.ok(control);control.focus();await ui.key('Enter',{target:control});
 assert.equal(ui.root.querySelector('.inventory-detail').dataset.inventorySelected,'gear:'+id);assert.equal(ui.root.querySelector('.inventory-comparison').open,true);assert.equal(ui.document.activeElement.id,'inventory-item-heading');
 assert.equal(ui.root.querySelector('#inventory-query').value,'');assert.equal(ui.root.querySelector('#inventory-slot').value,'all');assert.equal(ui.root.querySelector('[data-op="inventory-favorites"]').getAttribute('aria-pressed'),'false');assert.deepEqual(ui.current(),before);
 await ui.click('tab','journal');await ui.click('workspace-section','journal:archive');assert.ok(ui.root.querySelector('.expedition-receipts'));assert.deepEqual(ui.current(),before);
});

test('historical sold or unavailable gear remains named without a dead comparison action',async t=>{
 const {s,id}=returnedGear();discardGear(s,id);assert.ok(E.validateSave(s));const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');const before=ui.current();
 await ui.click('tab','journal');await ui.click('workspace-section','journal:archive');assert.ok(ui.root.querySelector('.expedition-receipts'));assert.equal(ui.root.querySelector(`[data-op="receipt-gear"][data-id="${id}"]`),null);
 assert.match(ui.root.querySelector('.expedition-receipts').textContent,/No longer carried/);assert.deepEqual(ui.current(),before);
});
