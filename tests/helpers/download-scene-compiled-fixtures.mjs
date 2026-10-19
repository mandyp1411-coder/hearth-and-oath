// Explicit canonical source captures only. These controls are not naturally
// acquired resources, a generated lifetime, live data or imported user exports.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../../dist/js/engine.js';
import {settlementServices} from '../../dist/js/world-services.js';
import {settlementWalkPath} from '../../dist/js/exploration-ui.js';
import {projectLifePerson} from '../../dist/js/world-people-v31.js';
import {registerWorldLifeRecord} from '../../dist/js/lineage.js';
import {initializeFamilyDepth} from '../../dist/js/household.js';
import {reconcileNpcContinuity} from '../../dist/js/npc-continuity.js';
import {freshStory,adultFamily,copy,valid,roundtrip,act,pick,walk} from './story-life-fixtures.mjs';
import {captureClaimsTournamentBase,captureResearchProject,captureRepertoireProject,captureClaimOpportunity} from './claims-tournament-fixtures.mjs';
export {E,copy,valid,roundtrip,act,pick,walk};
export const PRIVATE_REMINDER='V054_PRIVATE_NOTE_NEVER_IN_STATIC_OFFLINE_COPY_Ω_83b1';
export function sceneProvider(s,kind){const r=settlementServices(s).find(r=>r.kind===kind&&(kind!=='merchant'||r.subjectId==='market'));assert.ok(r,'actual local '+kind);return r;}
export function sceneState(kind='work',{family=false,composed=false}={}){
 let s=family?adultFamily():composed?captureClaimsTournamentBase():freshStory();
 assert.equal(s.event,null);assert.equal(s.battle,null);
 // Declared affordability/health controls keep browsing and a real favorite
 // mutation available. Neither a shop nor a craft completion is fabricated.
 s.hero.gold=1000;s.hero.hp=1;s.hero.maxHp=Math.max(100,s.hero.maxHp);s.hero.potions=3;
 for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=30;
 s.equipment.owned=[...new Set([...s.equipment.owned,'scholar_hood'])];s.equipment.equipped.head=null;
 valid(s);const provider=sceneProvider(s,kind),route=settlementWalkPath(s,provider.roomId);assert.ok(route);
 for(const room of route)s=act(s,'atlas_room_'+room);
 s=E.keepPlayerNote(s,PRIVATE_REMINDER);assert.ok(s.playerNotes.some(n=>n.text===PRIVATE_REMINDER));
 return roundtrip(s);
}
export function outdoorMentorState(){
 const input=copy(freshStory());input.locationId='forest';input.hero.hp=1;input.hero.potions=3;delete input.cartography;
 const s=E.migrateSave(input);assert.ok(s);assert.equal(s.cartography.interior,null);
 const r=settlementServices(s).find(r=>r.id==='mentor-druid'&&r.here);assert.ok(r);assert.equal(r.roomId,'trail');
 assert.equal(r.person.locationId,'forest');assert.equal(r.person.npcSlot.classId,'druid');return roundtrip(s);
}
export function mandatoryEventState(){
 const raw=JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/v30-explore-travel.json.gz',import.meta.url))));
 const s=E.migrateSave(copy(raw.states.road));assert.ok(s?.event);return roundtrip(s);
}
export function unavailableProviderCapture(){
 const before=sceneState('work'),previous=sceneProvider(before,'work');let s=copy(before);
 // Explicit recorded-death diagnostic control plus normal reconciliation.
 // The historical person is retained; a successor is never renamed to them.
 const record=projectLifePerson(s,{...previous.person,roomId:previous.roomId});assert.ok(record);
 record.alive=false;record.deathDay=s.day;registerWorldLifeRecord(s,record);initializeFamilyDepth(s);reconcileNpcContinuity(s);
 s=roundtrip(s);const next=sceneProvider(s,'work');assert.notEqual(next.personId,previous.personId);
 assert.equal(s.life.people.find(p=>p.id===previous.personId).alive,false);
 return {before,state:s,previous:copy(previous),next:copy(next)};
}
export function composedDownloadStates(){
 const base=captureClaimsTournamentBase();return [roundtrip(base),captureResearchProject(base),captureRepertoireProject(base)];
}
export function claimOpportunityState(){return captureClaimOpportunity();}
