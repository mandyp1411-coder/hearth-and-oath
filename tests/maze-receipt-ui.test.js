import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expeditionReceiptView, expeditionGearSelection, renderLatestExpeditionReceipt, renderExpeditionReceiptArchive, renderActiveExpeditionAccount } from '../dist/js/maze-receipt-ui.js';
import { ensureMazeVisit, beginMazeSettlement, endMazeSettlement, closeMazeVisit, recordMazeRetreat } from '../dist/js/maze-receipt-runtime.js';
const clone=v=>structuredClone(v);
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e,date:day=>'world day '+day,button:(label,op,id='',cls='')=>`<button type="button" class="${e(cls)}" data-op="${e(op)}" data-id="${e(id)}">${label}</button>`};
function fixture(){
 const s=clone(JSON.parse(readFileSync(new URL('./fixtures/maze-receipts/id19-legacy-active.json',import.meta.url))).state);
 s.hero.name='<img src=x onerror=unsafe>';s.maze.title='The <script>unsafe</script> Cistern';s.world.locations.find(p=>p.id===s.locationId).name='The Marsh';
 s.equipment={owned:[],instances:[],materials:{ore:0,cloth:0,wood:0,stone:0,hide:0,crystal:0}};s.adventuring.loot=[];ensureMazeVisit(s);
 return s;
}
function returned(){
 const s=fixture(),m=s.maze;m.visited.push(3);m.cleared.push(3);m.steps++;
 const before=beginMazeSettlement(s,m),gear={id:'found_ab_1',baseId:'iron_sword',quality:'rare',affix:'plain',tier:2,source:s.locationId,day:s.day};
 s.equipment.instances.push(gear);s.equipment.owned.push(gear.id);s.adventuring.loot.push({id:'receipt-relic',name:'<svg onload=unsafe> Seal',value:40});s.equipment.materials.ore+=2;
 endMazeSettlement(s,m,{kind:'cache',cellId:3,slotId:null,actionId:null,subjectId:null},before);closeMazeVisit(s,m,'stair');s.mazeBook.records=[m];s.maze=null;return s;
}

test('receipt read models and all renderers are pure and escape actual recorded names',()=>{
 const s=returned(),before=clone(s),row=s.mazeBook.expeditionReceipts[0],view=expeditionReceiptView(s,row);
 const latest=renderLatestExpeditionReceipt(s,ui),archive=renderExpeditionReceiptArchive(s,ui);
 assert.equal(view.totals.gains.gold,0);assert.equal(view.totals.gains.relics[0].value,40);
 for(const html of [latest,archive]){assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.match(html,/&lt;svg/);assert.doesNotMatch(html,/<script>|<img src=x|<svg onload/);assert.match(html,/assessed value, not payment/);assert.match(html,/unrelated income/);}
 assert.deepEqual(s,before);
});

test('found gear links exact owned ID to existing comparison selection and clears stale view filters',()=>{
 const s=returned(),before=clone(s),id='found_ab_1',selection=expeditionGearSelection(s,id);
 assert.deepEqual(selection,{tab:'inventory',selectedId:'gear:found_ab_1',category:'equipment',filter:'all',query:''});assert.deepEqual(s,before);
 const html=renderExpeditionReceiptArchive(s,ui);assert.match(html,/data-op="receipt-gear" data-id="found_ab_1"/);
 assert.equal(expeditionGearSelection(s,'same-name-wrong-id'),null);assert.equal(expeditionGearSelection(s,'iron_sword'),null,'catalog existence is not ownership');
 s.equipment.owned=[];s.equipment.instances=[];const removed=renderExpeditionReceiptArchive(s,ui);assert.match(removed,/No longer carried/);assert.doesNotMatch(removed,/data-op="receipt-gear"/);assert.match(removed,/Fine Iron longsword|Fine Iron Longsword|Fine Iron longsword/i,'historical descriptor survives sale without restoring the item');
 assert.deepEqual(s.equipment.instances,[]);assert.deepEqual(s.equipment.owned,[]);
});

test('search includes recorded actor, source, status and finite found item names',()=>{
 const s=returned();for(const query of ['cistern','returned unfinished','Seal','Fine','unsafe'])assert.match(renderExpeditionReceiptArchive(s,ui,{query}),/data-expedition-receipt=/,query);
 assert.match(renderExpeditionReceiptArchive(s,ui,{query:'not-a-matching-word'}),/No expedition receipts match/);
});

test('legacy observation and incomplete settlement accounting are explicitly different disclosures',()=>{
 const s=returned(),row=s.mazeBook.expeditionReceipts[0];row.settlementsIncomplete=true;
 const html=renderLatestExpeditionReceipt(s,ui);assert.match(html,/Earlier entry costs, days and gains are unavailable/);assert.match(html,/partial account, not complete totals/);
 assert.match(html,/0 attended days recorded: 0 entry/);assert.doesNotMatch(html,/No costs were paid|nothing was found/);
});

test('latest account is compact, dated and current-life only; archived accounts remain available later',()=>{
 const s=returned();assert.match(renderLatestExpeditionReceipt(s,ui),/^<details/);assert.match(renderLatestExpeditionReceipt(s,ui),/data-id="journal:archive"/);
 s.day++;assert.equal(renderLatestExpeditionReceipt(s,ui),'');assert.match(renderExpeditionReceiptArchive(s,ui),/world day 101/);
 s.day--;s.dynasty.activePersonId='heir';s.dynasty.generation=2;assert.equal(renderLatestExpeditionReceipt(s,ui),'');assert.match(renderExpeditionReceiptArchive(s,ui),/generation 1/);
});

test('active retreat does not render a terminal return receipt or imply a surface exit',()=>{
 const s=fixture();recordMazeRetreat(s);const before=clone(s),html=renderActiveExpeditionAccount(s,ui);
 assert.match(html,/1 combat retreat/);assert.match(html,/not a surface return/);assert.equal(renderLatestExpeditionReceipt(s,ui),'');assert.deepEqual(s,before);
});

test('defeat, successful objective, unfinished return and life end retain distinct labels',()=>{
 const s=returned(),r=s.mazeBook.expeditionReceipts[0];assert.match(renderExpeditionReceiptArchive(s,ui),/Returned unfinished/);
 r.reason='defeat';assert.match(renderExpeditionReceiptArchive(s,ui),/Defeat and recovery/);
 r.reason='life_end';assert.match(renderExpeditionReceiptArchive(s,ui),/Life ended below/);
 r.reason='stair';r.objective.complete=true;r.objective.method='care';assert.match(renderExpeditionReceiptArchive(s,ui),/Returned complete/);assert.match(renderExpeditionReceiptArchive(s,ui),/Shared service/);
});

test('shell comparison routing and Journal source integration remain navigation-only',()=>{
 const app=readFileSync(new URL('../dist/js/app.js',import.meta.url),'utf8'),handler=app.match(/if\(op==='receipt-gear'\).*?return;\}/)?.[0];assert.ok(handler);
 assert.match(handler,/expeditionGearSelection/);assert.match(handler,/inventoryQuery=selection.query/);assert.match(handler,/navigate\(selection.tab\)/);assert.match(handler,/inventory-item-heading/);assert.match(handler,/comparison.open=true/);
 assert.doesNotMatch(handler,/update\(|chooseAction|equipGear|useConsumable|spendDays/);
 const journal=readFileSync(new URL('../dist/js/journal-ui-v30.js',import.meta.url),'utf8');assert.match(journal,/renderExpeditionReceiptArchive\(s,ui,\{query\}\)/);assert.match(journal,/renderOriginArchive\(s,ui,\{query\}\)/);
});
