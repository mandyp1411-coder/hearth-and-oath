import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices} from '../dist/js/world-services.js';
import {serviceMeetingOffers} from '../dist/js/world-services-ui.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {RPG_FACTIONS_V27} from '../dist/js/rpg-depth-v27.js';
import {firstMissionJournalRow} from '../dist/js/faction-first-missions.js';
import {evidenceFor} from '../dist/js/objective-evidence.js';
import {projectLifePerson} from '../dist/js/world-people-v31.js';
import {registerWorldLifeRecord} from '../dist/js/lineage.js';
import {initializeFamilyDepth} from '../dist/js/household.js';
import {reconcileNpcContinuity,validateNpcContinuity} from '../dist/js/npc-continuity.js';
import {initializeFamilyOrigins} from '../dist/js/family-origins.js';
import {seededRoll} from '../dist/js/world.js';

// Explicit controlled copies, not earned lifetimes or claims of a natural death.
// A recorded-death vacancy exercises the real validated public successor path
// without inventing decades of unplayed work or weakening calendar validators.
const raw=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
const base=E.migrateSave(raw),copy=s=>structuredClone(s);
function valid(s,label='controlled integration save'){
 assert.ok(E.validateSave(s),label+': '+s.notice);
 assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s,label+' reload is exact');
 return s;
}
function action(s,id){const actions=E.getActions(s),row=actions.find(a=>a.id===id);if(row?.objectiveServiceId){const services=settlementServices(s),owner=services.find(r=>r.id===row.objectiveServiceId);assert.ok(owner,'exact current objective provider');assert.ok(serviceMeetingOffers(owner,actions).includes(row),'shared guide/meeting selector retains the real faction objective');for(const other of services.filter(r=>r.id!==owner.id))assert.ok(!serviceMeetingOffers(other,actions).includes(row),'no unrelated provider inherits the exact objective');}assert.ok(row,'offered '+id);assert.equal(row.disabledReason,undefined,row.disabledReason);return valid(E.chooseAction(s,id),id);}
function choice(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),'offered choice '+id);return valid(E.chooseEventOption(s,id),id);}
function walk(s,room){const route=settlementWalkPath(s,room);assert.ok(route,'real room route '+room);for(const id of route)s=action(s,'atlas_room_'+id);return s;}
function settle(s){for(let n=0;s.event&&n<20;n++){const c=s.event.choices.find(c=>['continue','conclude_correct','care','avoid','leave','later','pause'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=choice(s,c.id);}assert.equal(s.event,null);return s;}
function vacancy(s,ref){
 const row=settlementServices(s,{siteId:ref.locationId}).find(r=>r.personId===ref.id);assert.ok(row,'actual current public actor');
 const person=projectLifePerson(s,{...row.person,roomId:row.roomId});assert.ok(person);person.alive=false;person.deathDay=s.day;
 registerWorldLifeRecord(s,person);initializeFamilyDepth(s);reconcileNpcContinuity(s);
 assert.ok(validateNpcContinuity(s));assert.equal(s.npcContinuity.people[ref.id].retiredDay,s.day);
 const next=settlementServices(s,{siteId:ref.locationId}).find(r=>r.kind===row.kind&&r.subjectId===row.subjectId);
 assert.ok(next);assert.notEqual(next.personId,ref.id);valid(s,'recorded public vacancy');return next;
}
const mission=s=>s.rpg.factions.find(f=>f.id==='quiet_table').firstMission;
function nextMissionStep(s){const f=s.rpg.factions.find(f=>f.id==='quiet_table'),row=firstMissionJournalRow(s,f);assert.equal(row.locationId,s.locationId,'relay fixture stays in the actual settlement');s=walk(s,row.roomId);return settle(action(s,row.actionId));}

test('integrated valid save: same-day NPC succession preserves old proof authors and explicitly binds only later faction work',()=>{
 let s=copy(base);const definition=RPG_FACTIONS_V27.find(f=>f.id==='quiet_table');
 const place=s.world.locations.find(p=>s.realm.sites[p.id]?.regionId===definition.regionId&&settlementServices(s,{siteId:p.id}).some(r=>r.kind==='faction'&&r.subjectId===definition.id));
 assert.ok(place);s.locationId=place.id;syncCartography(s);s.hero.skills.persuasion=4;s.hero.skills.stealth=4;s=valid(E.migrateSave(s),'normalized controlled location');
 const provider=settlementServices(s).find(r=>r.kind==='faction'&&r.subjectId===definition.id);s=walk(s,provider.roomId);
 s=action(s,'rpg_join_quiet_table');s=action(s,'rpg_faction_quiet_table');s=choice(s,'accept_relay');
 assert.equal(mission(s).values.recipientWilling,true,'fixed fixture has the authored willing relay branch');
 for(let n=0;n<3;n++)s=nextMissionStep(s);
 const before=copy(mission(s)),proof=evidenceFor(before,'relay_receipt'),old=before.cast.faction;
 assert.ok(proof.actorIds.includes(old.id));assert.equal(proof.sourceRevision,0);
 const successor=vacancy(s,old);s=walk(s,successor.roomId);const day=s.day;
 s=action(s,'rpg_objective_quiet_table__custody');assert.equal(s.day,day);
 const held=mission(s);assert.equal(held.custody[0].day,proof.day,'same-day handover is distinguishable by source revision');
 assert.equal(held.custody[0].to.id,successor.personId);assert.deepEqual(evidenceFor(held,'relay_receipt'),proof,'old author and consent are immutable');
 s=nextMissionStep(s);assert.equal(mission(s).status,'completed');
 assert.equal(evidenceFor(mission(s),'report').sourceRevision,1);assert.ok(evidenceFor(mission(s),'report').actorIds.includes(successor.personId));
 for(const change of [m=>{evidenceFor(m,'relay_receipt').actorIds=evidenceFor(m,'relay_receipt').actorIds.map(id=>id===old.id?successor.personId:id);},m=>{evidenceFor(m,'relay_receipt').sourceRevision=1;},m=>{evidenceFor(m,'report').actorIds=[old.id];}]){const bad=copy(s);change(mission(bad));assert.equal(E.validateSave(bad),false,'historical or current authors cannot be relabeled');}
 valid(s,'completed explicit successor agreement');
});

test('integrated valid save: a post-handover archivist supports a real positive family lead and exact historical proof',()=>{
 let s=copy(base);s.event=null;s.battle=null;s.flags.familyOriginInterest=true;
 for(const key of ['birthThread','birthVisitor','birthName','cradleSong','firstWord'])delete s.timeline.storybook.flags[key];
 s.timeline.storybook.flags.birthThread='registered';const guardian=s.life.people.find(p=>p.id==='kin');s.locationId=guardian.locationId;syncCartography(s);s.realm.sites[s.locationId].hasShrine=true;
 delete s.familyOrigins;initializeFamilyOrigins(s);s=valid(E.migrateSave(s),'normalized controlled family setup');s=walk(s,'archive');
 const old=settlementServices(s).find(r=>r.kind==='archivist'),next=vacancy(s,{id:old.personId,locationId:s.locationId});
 // Choose a genuinely offered next-day walk only if this fixed acceptance day
 // would author a refusal. No response, identity or evidence token is edited.
 for(let n=0;n<8&&seededRoll(s.seed,`family-origin-${s.dynasty.generation}-${s.day}:custodian-response`,5)===0;n++)s=settle(action(s,'leisure_walk'));
 s=walk(s,'homes');s=action(s,'origin_accept');assert.equal(s.familyOrigins.run.cast.archivist.id,next.personId);
 s=action(s,'origin_guardian');s=choice(s,'object');s=walk(s,'archive');s=action(s,'origin_register');s=choice(s,'inspect');
 const run=s.familyOrigins.run;assert.ok(run.cast.lead,'actual archive comparison supplies the concrete current-custody lead');
 assert.deepEqual(evidenceFor(run,'register_inspected').actorIds,[next.personId]);assert.equal(evidenceFor(run,'register_inspected').sourceRevision,undefined,'family vocabulary does not invent faction custody revisions');
 s=walk(s,'shrine');s=action(s,'origin_contact');s=choice(s,'ask');assert.equal(s.familyOrigins.run.ending,'custodian_account');
 assert.ok(evidenceFor(s.familyOrigins.run,'custodian_consent'));assert.ok(evidenceFor(s.familyOrigins.run,'custodian_account'));valid(s,'post-handover positive family account');
 const bad=copy(s);bad.familyOrigins.run.cast.archivist.name=old.name;assert.equal(E.validateSave(bad),false,'a successor cannot inherit the old name or paper authority');
});
