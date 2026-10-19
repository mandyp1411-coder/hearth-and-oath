import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../../dist/js/engine.js';
import {getContacts} from '../../dist/js/conversations.js';
import {settlementServices} from '../../dist/js/world-services.js';
import {settlementWalkPath} from '../../dist/js/exploration-ui.js';

// A genuinely played, checked-in prior household. Migration is explicit; all
// subsequent levy progress, days and trust below use the actual source actions.
const prior=JSON.parse(readFileSync(new URL('../fixtures/legacy-v5.json',import.meta.url),'utf8')).states.parent;
export const clone=s=>structuredClone(s);
export function valid(s,label='state'){assert.ok(E.validateSave(s),label+': '+s?.notice);return s;}
export function reload(s){valid(s);const n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(n);assert.deepEqual(n,s,'literal current migration');return n;}
export function action(s,id){const a=E.getActions(s).find(a=>a.id===id&&!a.disabledReason);assert.ok(a,'actual offered action '+id);return valid(E.chooseAction(s,id),id);}
export function choose(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),'actual offered choice '+id);return valid(E.chooseEventOption(s,id),id);}
export function settle(s){for(let n=0;n<250;n++){
 if(s.event){const c=s.event.choices.find(c=>['care','continue','later','keep','wait','support','private'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=choose(s,c.id);}
 else if(s.conversations?.pending)s=valid(E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies.at(-1).id));
 else if(s.rpg?.project)s=action(s,'rpg_continue');else if(s.stories?.project)s=action(s,'stories_continue');else if(s.timeline?.yearTarget!=null)s=valid(E.continueAgeUp(s));else return valid(s);
 }throw Error('Fixture did not settle within250 real decisions.');}
export function walk(s,room){const path=settlementWalkPath(s,room);assert.ok(path,'recorded room route '+room);for(const id of path)s=action(s,'atlas_room_'+id);return s;}
let cached;
export function base(){if(!cached){let candidate=settle(E.migrateSave(clone(prior)));for(const id of ['deceitful','curious']){if(!candidate.hero.personality?.traits?.includes(id))candidate=valid(E.choosePersonalityTrait(candidate,id));assert.ok(candidate.hero.personality?.traits?.includes(id),'actual personality point selection '+id);}cached=valid(candidate,'fully initialized trait fixture');}return clone(cached);}
export function investigate(route='scholar',clue='correct'){
 let s=base();s=walk(s,settlementServices(s).find(r=>r.kind==='guide').roomId);s=action(s,'rpg_intrigue_read');s=settle(choose(s,route));s=action(s,'rpg_intrigue_open');return choose(s,clue);
}
export function offer(s){for(let n=0;s.day<s.rpg.intrigue.nextDay&&n<20;n++)s=settle(action(s,'rest'));assert.ok(s.day>=s.rpg.intrigue.nextDay);return action(s,'rpg_intrigue_open');}
const earned=new Map();
export function completed(ending='sell'){
 if(!earned.has(ending)){let s=offer(investigate(ending==='blackmail'?'criminal':'scholar'));s=settle(choose(s,ending));assert.equal(s.rpg.intrigue.status,'completed');assert.equal(s.rpg.intrigue.ending,ending);earned.set(ending,reload(s));}
 return clone(earned.get(ending));
}
export function person(s,id){const p=getContacts(s).find(p=>p.id===id);assert.ok(p,'actual contact '+id);return p;}
export function visitActor(s,id){const p=person(s,id);assert.equal(p.locationId,s.locationId);return p.roomId?walk(s,p.roomId):s;}
export function household(s){s=walk(s,'homes');const id=s.life.partnerId;assert.ok(id,'played household has a partner');const p=person(s,id);assert.ok(p.age>=18&&p.locationId===s.locationId);for(let n=0;person(s,id).bond<35&&n<5;n++)s=settle(action(s,'family_time_'+id));assert.ok(E.getActions(s).some(a=>a.id==='talk_levy_household_'+id&&!a.disabledReason));return {s,id};}
export function returnVisit(s){const a=s.rpg.intrigue,completedDay=a.history.findLast(h=>h.choice===a.ending).day;for(let n=0;s.day<completedDay+7&&n<20;n++)s=settle(action(s,'rest'));assert.ok(s.day>=completedDay+7);const id=['sell','blackmail'].includes(a.ending)?a.factorId:a.clerkId;s=visitActor(s,id);assert.ok(E.getActions(s).some(a=>a.id==='talk_levy_return_'+id&&!a.disabledReason));return {s,id};}
export const stable=s=>clone({day:s.day,age:s.age,hero:s.hero,life:s.life,companions:s.companions,equipment:s.equipment,factions:s.factions,careers:s.careers,workshop:s.workshop,rpg:{intrigue:s.rpg.intrigue,contacts:s.rpg.contacts,services:s.rpg.services},lineage:s.lineage});
