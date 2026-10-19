import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../../dist/js/engine.js';
import {syncCartography} from '../../dist/js/cartography.js';
import {serviceWalkPath} from '../../dist/js/world-services.js';
import {normalizePreferences} from '../../dist/js/preferences.js';
import {completeLineageHistory} from '../../dist/js/lineage.js';

// Detached controlled fixture projections and actual public commands, not an
// earned lifetime, naturally acquired family or civilian-route balance claim.
export const copy=s=>structuredClone(s);
export function valid(s,label=''){assert.ok(E.validateSave(s),label+': '+s?.notice);return s;}
export function roundtrip(s){valid(s);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);return s;}
let base;
export function freshStory({home=false}={}){
 base ||= valid(E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base));
 const s=copy(base);if(home){s.locationId='home';s.hero.birthplaceId='home';s.cartography.interior={siteId:'home',roomId:'gate'};syncCartography(s);}
 return roundtrip(E.migrateSave(s));
}
export function act(s,id){const offered=E.getActions(s).find(a=>a.id===id);assert.ok(offered&&!offered.disabledReason,`${id}: ${offered?.disabledReason||s.notice}`);const before=copy(s),n=E.chooseAction(s,id);assert.deepEqual(s,before,'public action input is immutable');return valid(n,id);}
export function pick(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),`${s.event?.id}/${id}`);const before=copy(s),n=E.chooseEventOption(s,id);assert.deepEqual(s,before,'public choice input is immutable');return valid(n,id);}
export function walk(s,target){const path=serviceWalkPath(s,target);assert.ok(path,target);for(const room of path)s=act(s,'atlas_room_'+room);return s;}
export function acceptResearch(s,id='third_mark'){s=act(walk(s,'homes'),'research_offer_'+id);return pick(s,'accept');}
export function draft(s){return act(s,'repertoire_create_open-chair');}
export const pieceId=s=>s.repertoire.pieces[0].id;
export function researchFinished(s,audience='self'){
 s=acceptResearch(s);for(const id of ['axle_rubbing','repair_shares'])s=act(s,'research_copy_'+id);
 s=act(s,'research_compare');s=pick(s,'compare');s=act(s,'research_interpret');s=pick(s,'shared_repair');s=act(s,'research_conclude');return pick(s,audience);
}
export function deadline(s){s=copy(s);s.obligations.push({id:'combined-controlled-deadline',title:'An existing promise',description:'Controlled same-day interruption fixture.',dueDay:s.day,resolved:false});return valid(s);}
export function pauseDeadline(s){assert.equal(s.event?.id,'annual_deadline_review');return pick(s,'pause');}
export function adultFamily(){
 const raw=JSON.parse(readFileSync(new URL('../fixtures/v21-vampire-grievance-paused.json',import.meta.url)));
 // Preserve the existing played adult parent/child and finite mill site. The
 // controlled starting hunger/resources prevent unrelated needs in short cases.
 let s=E.migrateSave(raw);assert.ok(s);assert.equal(s.event.id,'nature_slight');s=pick(s,'pause');assert.equal(s.event,null);
 s.hero.gold=2000;s.hero.hp=s.hero.maxHp;s.hero.mp=s.hero.maxMp;s.hero.condition.hunger=0;
 childRecord(s).preferences=normalizePreferences({pursuit:'craft'});return roundtrip(s);
}
export const childRecord=(s,id='child-1')=>s.lineage.people.find(p=>p.source==='child'&&p.localId===id);
export function introduceFamily(s){s=act(walk(s,'homes'),'lineage_future_child-1');return pick(s,'listen');}
export function calendarYear(s){
 s=valid(E.ageUp(s));for(let i=0;i<100&&(s.event||s.timeline.yearTarget!==null);i++){
  if(s.event){const safe=['care','support','share','continue','wait','later','leave','curiosity','people','animal'];const c=safe.map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason);assert.ok(c);s=pick(s,c.id);}
  else s=valid(E.continueAgeUp(s));
 }assert.equal(s.event,null);assert.equal(s.timeline.yearTarget,null);return roundtrip(s);
}
export function closedChapter(s){s=copy(s);s.phase='retired';s.event=null;s.chronicle=`${s.hero.name}'s controlled closed family chapter.`;completeLineageHistory(s);return valid(s);}
export function archiveVisit(s){
 const entry=E.getActions(s).find(a=>a.id.startsWith('rpg_enter_signature_')&&!a.disabledReason);assert.ok(entry,'an actual enabled signature entrance in this fixture');s=act(s,entry.id);assert.ok(s.maze);assert.equal(s.maze.position,0);s=act(s,'maze_exit');assert.equal(s.maze,null);assert.ok(s.mazeBook.records.some(m=>m.version===2));assert.ok(s.mazeBook.expeditionReceipts?.length,'actual closed expedition receipt is nonempty');return roundtrip(s);
}
