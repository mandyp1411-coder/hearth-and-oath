import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepertoirePiece } from '../dist/js/repertoire.js';
import { renderRepertoire } from '../dist/js/repertoire-ui.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e};
const fixture=()=>({age:22,phase:'adult',day:8030,hero:{name:'Aren <the Maker>'},locationId:'home',world:{locations:[{id:'home',name:'Home <Vale>',type:'village'}]},life:{people:[]},timeline:{birthDay:0}});
test('the manuscript component escapes authored metadata, labels privacy and never mutates its input',()=>{
  const s=fixture(),p=createRepertoirePiece(s,{workId:'open-chair',title:'<img src=x onerror=alert(1)>'}).piece;
  const before=structuredClone(s),html=renderRepertoire(s,[{id:`repertoire_privacy_${p.id}_public`,label:'Allow public manuscript copies',description:'This exact revision only.',days:0,cost:0}],ui);
  assert.deepEqual(s,before);assert.match(html,/Your manuscript book/);assert.match(html,/does not tell it to anyone/);assert.match(html,/Private manuscript/);assert.match(html,/&lt;img src=x/);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/Aren &lt;the Maker&gt;/);assert.match(html,/Home &lt;Vale&gt;/);
  assert.match(html,/data-op="activity"/);assert.match(html,/No Time · No Fee/);assert.match(html,/data-disclosure="repertoire:verse:/);
});
test('an active artistic commitment exposes continuation instead of starting other pieces',()=>{
  const s=fixture();const p=createRepertoirePiece(s,{workId:'two-banks'}).piece;
  s.repertoire.project={piece:{title:p.title,revision:1},kind:'recital',arrangement:'refrain',completedDays:1,totalDays:2};
  const html=renderRepertoire(s,[{id:'repertoire_continue',label:'Continue',description:'One actual day remains.',days:0,cost:0,durationDays:1},{id:'repertoire_cancel',label:'Withdraw',description:'No unfinished reward.',days:0,cost:0},{id:'repertoire_create_last-stitch',label:'Must not show',description:'Other work',days:0,cost:0}],ui,{surface:'inn'});
  assert.match(html,/commitment|saved refrain/);assert.match(html,/data-id="repertoire_continue"/);assert.match(html,/1 Day · No Fee/);assert.doesNotMatch(html,/Must not show/);
});
test('a first-time book is prospective, non-mutating and does not invent manuscripts or completed performances',()=>{
  const s=fixture(),before=structuredClone(s),html=renderRepertoire(s,[],ui);assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'repertoire'),false);assert.match(html,/0\/3 pieces/);assert.doesNotMatch(html,/Versions actually heard/);
  s.age=17;assert.equal(renderRepertoire(s,[],ui),'');
});
