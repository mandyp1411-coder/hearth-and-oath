// Compare scoped fixes with an explicitly supplied, untouched v0.57.1 checkout.
// Semantic handler evidence only; no browser layout, screen-reader or live claims.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),baseline=process.argv[2];
assert.ok(baseline&&path.isAbsolute(baseline),'Pass the absolute unchanged baseline checkout.');
const current=await import(pathToFileURL(path.join(root,'dist/js/engine.js'))),old=await import(pathToFileURL(path.join(baseline,'dist/js/engine.js')));
const fixture=JSON.parse(gunzipSync(readFileSync(path.join(root,'tests/fixtures/v30-explore-travel.json.gz')))).states.base;
function life(){const s=current.migrateSave(fixture);s.flags.herbs=4;s.hero.hp=s.hero.maxHp;s.life.health=100;s.life.stress=0;return s;}
function mechanical(s){const copy=structuredClone(s);delete copy.notice;for(const row of copy.journal)if(row.tag==='health')delete row.text;for(const row of copy.health.history)delete row.text;return copy;}
const parity=[];
for(const kind of ['healthy','fever','injury','insufficient']){
 const s=life();if(kind==='insufficient')s.flags.herbs=0;
 if(['fever','injury'].includes(kind)){s.health.physical=[{id:kind+'-'+s.day,type:kind,severity:1,sinceDay:s.day,lastEffectDay:s.day,careUntil:0,acknowledged:true}];s.hero.hp-=12;s.life.health=60;s.life.stress=20;}
 const before=structuredClone(s),a=old.useConsumable(s,'herbs'),b=current.useConsumable(s,'herbs');assert.deepEqual(mechanical(a),mechanical(b),kind+' treatment rules stay identical');assert.deepEqual(s,before);parity.push({kind,days:b.day-s.day,herbsUsed:s.flags.herbs-b.flags.herbs,exactMechanicalParity:true});
}
async function inspect(checkout){
 const {mountApp}=await import(pathToFileURL(path.join(checkout,'tests/helpers/ui-surface.mjs'))),cleanups=[];
 const ui=await mountApp({after:fn=>cleanups.push(fn)},{states:[life()]});
 try{
  await ui.click('title-continue');await ui.click('tab','inventory');await ui.click('inventory-item','supply:herbs');const before=ui.current();await ui.click('use-consumable','herbs');
  const review=Boolean(ui.root.querySelector('.herbal-care-dialog')),after=ui.current(),herbs={review,daysOnOpening:after.day-before.day,suppliesOnOpening:before.flags.herbs-after.flags.herbs};if(review)await ui.click('close-modal');
  await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');let field=ui.root.querySelector('#note-text');field.value='QA draft: inspect the notice board before traveling.';await ui.fire('input',field);await ui.click('tab','inventory');await ui.click('tab','journal');
  const notes={draftAfterDetour:ui.root.querySelector('#note-text').value,directWriteControl:Boolean(ui.root.querySelector('[data-op="personal-note-write"]'))};
  const form=ui.root.querySelector('#journal-search');form.querySelector('input').value='zzzauditnomatch';await ui.fire('submit',form);notes.falseEmptyClaim=ui.root.innerHTML.includes('Your notebook is still empty');notes.explicitNoMatch=ui.root.innerHTML.includes('No discoveries match this search');
  await ui.click('tab','character');const identity=ui.root.innerHTML.match(/<span>Identity<\/span><strong>([^<]*)<\/strong>/)?.[1];
  await ui.click('title-menu');await ui.click('title-settings');const settingsFocus=ui.document.activeElement?.tagName||'BODY';await ui.key('Escape');const settingsReturn=ui.document.activeElement?.dataset?.op||'BODY';await ui.click('title-load');const loadFocus=ui.document.activeElement?.id||'BODY';
  return {herbs,notes,identity,focus:{settings:settingsFocus,settingsReturn,load:loadFocus}};
 }finally{for(const cleanup of cleanups.reverse())await cleanup();}
}
const before=await inspect(baseline),after=await inspect(root);
assert.deepEqual(before.herbs,{review:false,daysOnOpening:2,suppliesOnOpening:1});assert.deepEqual(after.herbs,{review:true,daysOnOpening:0,suppliesOnOpening:0});
assert.equal(before.notes.draftAfterDetour,'');assert.equal(after.notes.draftAfterDetour,'QA draft: inspect the notice board before traveling.');assert.equal(before.notes.directWriteControl,false);assert.equal(after.notes.directWriteControl,true);assert.equal(before.notes.falseEmptyClaim,true);assert.equal(after.notes.falseEmptyClaim,false);assert.equal(after.notes.explicitNoMatch,true);assert.equal(after.focus.settings,'H1');assert.equal(after.focus.settingsReturn,'title-settings');assert.equal(after.focus.load,'slot-heading');
const report={version:JSON.parse(readFileSync(path.join(root,'package.json'))).version,baseline:'77b068a380ac8924891a1f4e0a188967385ff52a',status:'passed',before,after,careMechanicalParity:parity,limits:'Read-only comparisons of controlled semantic handler surfaces and engine results. No live browser, geometry, native focus, responsive, screen-reader or physical-device verification.'};
writeFileSync(path.join(root,'docs/verification/v0572-ui-before-after.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
