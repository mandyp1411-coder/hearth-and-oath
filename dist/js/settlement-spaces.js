import { regionalCulture, regionalGovernment } from './regional-content-v33.js';
import { communitySupport } from './community.js';

export const SETTLEMENT_ROOM_IDS=['gate','market','tavern','shrine','watch','archive','homes','workyard','hall','wayhouse','court','stronghold'];
export function civicPhase(prosperity,previous){
 if(previous==='city'&&prosperity>=76)return 'city';
 if(prosperity>=82)return 'city';
 if(['town','city'].includes(previous)&&prosperity>=56||prosperity>=62)return 'town';
 return 'village';
}
export function settlementSpaces(s,base){
 const place=s.world.locations.find(p=>p.id===s.locationId),civic=s.realm?.sites?.[s.locationId],phase=civic?.phase||'village',damaged=place?.status==='scarred';
 const rooms=base.map(row=>({...row,exits:[...row.exits]})),get=id=>rooms.find(r=>r.id===id),add=room=>{rooms.push(room);for(const id of room.exits)if(get(id)&&!get(id).exits.includes(room.id))get(id).exits.push(room.id);};
 get('gate').description+=` ${phase==='city'?'A civic hall and a separate work yard serve this regional center.':phase==='town'?'The grown settlement has a separate yard for practical work.':'Most public services share the small settlement’s existing buildings.'}`;
 if(phase!=='village'||damaged)add({id:'workyard',name:damaged?'Repair Yard':'Work Yard',description:damaged?'Scaffolds surround a damaged crossing. Reconstruction and relief work use actual time, supplies and coin; the occupied stalls remain reachable by the gate.':'Hammering rings across the yard. Craftspeople work at open benches, and learners carry materials between them.',exits:['gate','market']});
 if(damaged){get('market').exits=get('market').exits.filter(id=>id!=='tavern');get('tavern').exits=get('tavern').exits.filter(id=>id!=='market');get('market').description+=' The damaged passage to the tavern is closed; take the public gate route.';get('gate').description+=' Repairs reroute the market lane.';}
 if(phase==='city')add({id:'hall',name:'Civic Hall',description:'Long tables stand beneath the high windows. Local representatives gather here to meet visitors and discuss the settlement’s needs.',exits:['gate','watch','archive']});
 const politics=s.realm?.politics,regional=politics?.regions[civic?.regionId],culture=regionalCulture(civic?.regionId),government=regionalGovernment(civic?.regionId,s.realm?.regions.find(r=>r.id===civic?.regionId)?.regime),hold=politics?.holds.find(h=>h.siteId===s.locationId&&['held','cleared'].includes(h.status));
 if(regional?.capitalId===s.locationId)add({id:'court',name:culture.court,description:`The ${government.government.toLowerCase()} governs from this public court. ${government.succession} Visitors may approach the ruler or clerk here.`,exits:['gate','watch','archive']});
 if(hold?.status==='held'){get('gate').description=`Vampire patrols enforce a curfew in ${place.name}. The original households shelter behind closed doors. A resistance contact waits near the Watchhouse; a doctor and witness work quietly nearby.`;add({id:'stronghold',name:'Occupied Keep',description:`${hold.controllerName} rules from behind the barred doors. The resistance can guide an adult party inside after its shelter is supplied.`,exits:['watch','gate']});}
 if(culture)get('gate').description+=' '+culture.custom;
 const works=(s.community?.works||[]).filter(w=>w.locationId===s.locationId&&w.status==='standing'&&['road','refuge'].includes(w.kind)),active=communitySupport(s).works;
 if(works.length){const operating=works.filter(w=>active.some(a=>a.id===w.id));add({id:'wayhouse',name:operating.length?'Wayhouse':'Wayhouse · Closed',description:operating.length?`${operating.map(w=>w.name).join(' and ')} keeps this place operating. Its recorded services remain funded through day ${Math.min(...operating.map(w=>w.fundedUntil))}; support follows the actual charter.`:`${works.map(w=>w.name).join(' and ')} remains in the settlement, with operating service paused. Its existing reserve, contribution and review controls can reopen funded work.`,operating:operating.length>0,exits:['gate','tavern']});}
 return rooms;
}
