import { sameExpeditionRun, expeditionVisitTotals } from './maze-receipts.js';
import { getGearItem, GEAR_CATALOG } from './gear.js';
import { resolveFoundItem } from './gear-loot.js';
import { mazeFieldAssistReceiptText } from './companion-field-assists-ui.js';

const methodNames={copy:'Careful private copy',public:'Public account',stewardship:'Practical stewardship',care:'Shared service',trade:'Limited paid service',scheme:'Controlled service'};
const status = row => row.reason==='life_end'?'Life ended below':row.reason==='defeat'?'Defeat and recovery':row.objective.complete?'Returned complete':'Returned unfinished';
const amounts = values => Object.entries(values).filter(([,n])=>n>0).map(([key,n])=>n+' '+key).join(', ')||'none';

/** Inspection only. This never equips, replaces a missing item or reads a map. */
export function expeditionGearSelection(s,id){
 const item=(s.equipment?.owned||[]).includes(id)&&getGearItem(s,id);if(!item)return null;
 return {tab:'inventory',selectedId:'gear:'+id,category:'equipment',filter:'all',query:''};
}
export function expeditionReceiptView(s,row){
 const run=[s.maze,...(s.mazeBook?.records||[])].find(m=>m&&sameExpeditionRun(row.identity,m));
 const totals=expeditionVisitTotals(row),gear=totals.gains.gear.map(record=>({id:record.id,
  name:getGearItem(s,record.id)?.name||resolveFoundItem(record,GEAR_CATALOG)?.name||record.baseId,
  carried:Boolean(expeditionGearSelection(s,record.id))}));
 return {row,title:run?.title||'Expedition from '+(s.world.locations.find(p=>p.id===row.identity.locationId)?.name||row.identity.locationId),
  status:status(row),actorName:row.actorName||'Name not recorded',totals,gear,
  method:row.objective.method?methodNames[row.objective.method]||row.objective.method:null};
}
function renderReceipt(v,ui){
 const {row:r,totals:t}=v,{e,button,date}=ui,when=date?date(r.end.day):'Day '+r.end.day;
 const found=[...t.gains.relics.map(item=>`<li>${e(item.name)} · ${item.value} Gold assessed value, not payment</li>`),
  ...v.gear.map(item=>`<li>${e(item.name)} · ${item.carried?button(e('Compare '+item.name),'receipt-gear',item.id,'ghost small'):'No longer carried'}</li>`),
  ...t.gains.properties.map(item=>`<li>${e(item.label)} · recorded property</li>`)];
 const assists=r.assists?.length?`<section data-expedition-field-assists><h4>Companion field help</h4><p class="small-copy">${t.companionFocusUsed} personal companion Focus spent. Herb costs are included once in the recorded costs below.</p><ul>${r.assists.map(row=>`<li>${e(mazeFieldAssistReceiptText(row))}</li>`).join('')}</ul></section>`:'';
 return `<article class="remembered-entry expedition-receipt" data-expedition-receipt="${e(r.id)}"><h3>${e(v.title)}</h3><p class="small-copy">${e(when)} · ${e(v.actorName)} · generation ${r.actorGeneration}</p><p><strong>${e(v.status)}</strong> · Objective ${r.objective.complete?'complete':'unfinished'}${v.method?' · '+e(v.method):''}.</p>${r.coverage==='observed'?'<p class="notice">Partial history: recording began during this saved visit. Earlier entry costs, days and gains are unavailable.</p>':''}${!t.settlementsComplete?'<p class="notice warning">Partial accounting: some settlement details could not be recorded. The listed gains and costs are a partial account, not complete totals.</p>':''}<p>${r.end.explored} rooms explored (+${r.end.explored-r.start.explored} this visit) · ${r.end.cleared} cleared (+${r.end.cleared-r.start.cleared}) · ${r.end.steps-r.start.steps} walks.</p><p>${t.days} attended days recorded: ${r.days.entry} entry, ${r.days.inside} below, ${r.days.recovery} recovery. ${t.retreats} combat retreat${t.retreats===1?'':'s'}; retreats continued the same visit.</p><p class="small-copy">Health ${r.start.health} → ${r.end.health} · Focus ${r.start.focus} → ${r.end.focus}. Walking used ${t.walkingFocusUsed} Focus.</p><p class="small-copy">Potions carried ${r.start.potions} → ${r.end.potions}; used ${t.costs.potions}. Rations ${r.start.rations} → ${r.end.rations}; used ${t.costs.rations}. Kit nights ${r.start.kitNights} → ${r.end.kitNights}; used ${t.kitNightsUsed}.</p><details data-disclosure="receipt-spoils:${e(r.id)}"><summary>Recorded gains, costs &amp; proof</summary><p>Direct proceeds: ${t.gains.gold} Gold and ${t.gains.experience} experience. Materials found: ${e(amounts(t.gains.materials))}; herbs found: ${t.gains.herbs}.</p><p>Recorded costs: ${t.costs.gold} Gold (${r.fees.work} work fees, ${r.fees.passage} passage fees, ${r.fees.recovery} defeat recovery), ${e(amounts(t.costs.materials))}; herbs committed: ${t.costs.herbs}.</p><p class="small-copy">Ordinary living costs and unrelated income are not counted as expedition loot. Client payment remains a separate action.</p>${r.objective.battleId?`<p class="small-copy">Actual battle proof: ${e(r.objective.battleId)}${r.objective.captured?' · captive recorded':''}.</p>`:''}${r.objective.completionDay!==null?`<p class="small-copy">Objective method recorded on world day ${r.objective.completionDay}; its existing proof remains separate from this receipt.</p>`:''}${assists}${found.length?`<ul>${found.join('')}</ul>`:'<p>No finite finds recorded in the covered interval.</p>'}</details></article>`;
}
export function renderLatestExpeditionReceipt(s,ui){
 const row=s.mazeBook?.expeditionReceipts?.at(-1);
 if(!row||s.maze||row.end.day!==s.day||row.actorId!==(s.dynasty?.activePersonId||'hero'))return '';
 const v=expeditionReceiptView(s,row);
 return `<details class="panel" data-disclosure="latest-expedition-receipt:${ui.e(row.id)}"><summary>Expedition receipt · ${ui.e(v.status)}</summary>${renderReceipt(v,ui)}${ui.button('All expedition receipts','workspace-section','journal:archive','ghost small')}</details>`;
}
export function renderExpeditionReceiptArchive(s,ui,{query=''}={}){
 const rows=(s.mazeBook?.expeditionReceipts||[]).slice().reverse(),q=String(query).trim().toLowerCase();
 if(!rows.length)return '';
 const views=rows.map(r=>expeditionReceiptView(s,r)).filter(v=>!q||[v.title,v.status,v.actorName,v.method,v.row.identity.sourceId,...v.gear.map(g=>g.name),...v.totals.gains.relics.map(g=>g.name),...v.totals.gains.properties.map(g=>g.label)].join(' ').toLowerCase().includes(q));
 return `<section class="quest-archive expedition-receipts" aria-labelledby="expedition-receipts-title"><h2 id="expedition-receipts-title">Expedition receipts</h2><p class="small-copy">${views.length} of ${rows.length} recorded visits${rows.length===80?' · latest 80 retained':''}. Earlier visits keep their original traveler and coverage.</p>${views.map(v=>`<details data-disclosure="expedition-receipt:${ui.e(v.row.id)}"><summary>${ui.e(v.title)} · ${ui.e(v.status)}</summary>${renderReceipt(v,ui)}</details>`).join('')||'<p>No expedition receipts match this search.</p>'}</section>`;
}
export function renderActiveExpeditionAccount(s,ui){
 const v=s.maze?.expeditionVisit;if(!v)return '';
 const days=Object.values(v.days).reduce((a,b)=>a+b,0);
 return `<p class="small-copy">Visit account: ${days} attended day${days===1?'':'s'} recorded · ${v.retreats} combat retreat${v.retreats===1?'':'s'}.${v.coverage==='observed'?' Earlier entry history is unavailable.':''}${v.retreats?' A combat retreat keeps this expedition active; it is not a surface return.':''}</p>`;
}
