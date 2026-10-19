// A family relationship does not mean a shared address or a traveling party.
// Derive these views without rewriting earlier people, memories or saved scenes.
export function independentHousehold(s) {
 return ['cottage','townhouse','estate'].includes(s.life?.home?.tier);
}
export function originFamilyMember(s,p) {
 if(!p||p.id===s.life?.partnerId||(s.life?.children||[]).some(c=>c.id===p.id))return false;
 return Boolean(p.id==='kin'||['parent','guardian','sibling'].includes(p.familyRole)||(s.family?.members||[]).some(m=>m.personId===p.id));
}
export function familyResidence(s,p) {
 const origin=s.hero?.birthplaceId||(s.hero?.origin==='city'?'city':'home');
 const record=s.lineage?.people.find(r=>['child','life'].includes(r.source)&&r.localId===p?.id);
 const independent=record?.adultLife?.residence;
 if(independent&&(record.source==='child'||p?.familyRole==='sibling')&&s.world?.locations.some(l=>l.id===independent.locationId))return independent.locationId;
 if(originFamilyMember(s,p))return p.locationId||origin;
 if(p?.id===s.life?.partnerId||(s.life?.children||[]).some(c=>c.id===p?.id))return independentHousehold(s)&&s.life.home.locationId||p?.locationId||origin;
 return p?.locationId||origin;
}
export function familyVisitReason(s,p) {
 if(!p||p.alive===false)return 'This person remains in your family memories.';
 const id=familyResidence(s,p),site=s.world?.locations.find(l=>l.id===id);
 if(site&&(['destroyed','evacuated'].includes(site.status)||site.servicesAvailable===false))return 'Their recorded home is unavailable. Their family record is preserved.';
 if(id!==s.locationId||s.cartography?.offsite||s.cartography?.pending||s.timeline?.journey||s.dungeon||s.maze)return `Visit ${p.name} at their home in ${site?.name||id}.`;
 if(s.worldServicesVersion===1&&(s.cartography?.interior?.siteId!==id||s.cartography.interior.roomId!=='homes'))return 'Visit their home in the Homes area first.';
 return null;
}
