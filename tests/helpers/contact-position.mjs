import assert from 'node:assert/strict';
import * as E from '../../dist/js/engine.js';
import {getContacts} from '../../dist/js/conversations.js';
import {syncCartography} from '../../dist/js/cartography.js';
import {settlementWalkPath} from '../../dist/js/exploration-ui.js';
/** Controlled encounter fixture: position this hero at the person's actual
 * settlement, then walk its real rooms. No NPC, identity, fee or effect changes.
 * This setup is not a claim of an earned journey or paid travel. */
export function positionAtContact(state,id){
 let s=structuredClone(state);const p=getContacts(s).find(p=>p.id===id);assert.ok(p,id);assert.ok(p.locationId,id+' has a real location');
 s.locationId=p.locationId;s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);s=E.migrateSave(s);assert.ok(s,'the controlled encounter position is valid');
 const path=settlementWalkPath(s,p.roomId||'gate');assert.ok(path,'the contact has a reachable settlement area');
 for(const room of path){const a=E.getActions(s).find(a=>a.id==='atlas_room_'+room&&!a.disabledReason);assert.ok(a,'walk to '+id+'/'+room);s=E.chooseAction(s,a.id);}
 return s;
}
