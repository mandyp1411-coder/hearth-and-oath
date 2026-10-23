import { serviceNpc, projectNpcPerson, npcContinuationAvailable } from './npc-continuity.js';
import { MATERIAL_PRICES } from './economy-values.js';
import { ownedHomeHere } from './home-recovery-v38.js';
import { regionalCourtServices, politicalActionRoom, heldSettlement } from './regional-world-v33.js';
import { cityRooms } from './cartography.js';
import { generateCharacter } from './characters.js';
import { isSettlement } from './world.js';
import { educationTeacher } from './household.js';
import { classView } from './classes.js';
import { FACTION_DEFINITIONS_V27 } from './faction-catalog-v27.js';
import { regionAt } from './realm.js';

const currentRoom=s=>s.cartography?.interior?.siteId===s.locationId?s.cartography.interior.roomId:'gate';
export const SERVICE_ROLES={apothecary:'Apothecary',outfitter:'Travel Outfitter',merchant:'General Merchant',materials:'Materials Merchant',doctor:'Doctor',work:'Work Steward',inn:'Innkeeper',smith:'Craftsperson',watch:'Watch Captain',guide:'Local Guide',animals:'Animal Keeper',archivist:'Archivist',faction:'Faction Representative',school:'Teacher',mentor:'Guild Mentor',keeper:'Shrine Keeper',contracts:'Contract Giver',court:'Regional Court',envoy:'Regional Envoy',resistance:'Resistance Contact'};
const actor=(s,kind,siteId,subjectId='')=>serviceNpc(s,kind,siteId,subjectId);
/** A derived resident remains reconstructable after travel and seasonal board changes. */
export function settlementServices(s,{siteId=s.locationId}={}){
 // Earlier public game states have no settlement-service ledger yet.
 if(!s?.realm?.sites)return [];
 const site=s.world?.locations.find(p=>p.id===siteId);
 if(!site||['destroyed','evacuated'].includes(site.status)||site.servicesAvailable===false)return [];
 if(!isSettlement(s.world,siteId))return classView(s).callings.filter(c=>c.mentor.locationId===siteId).map(c=>({id:'mentor-'+c.id,kind:'mentor',subjectId:c.id,person:{...c.mentor,role:c.name+' Mentor'},personId:c.mentor.id,name:c.mentor.name,role:c.name+' Mentor',locationId:siteId,roomId:c.mentor.roomId||'trail',here:siteId===s.locationId&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey}));
 const view={...s,locationId:siteId,cartography:{...s.cartography,offsite:false}},rooms=cityRooms(view),has=id=>rooms.some(r=>r.id===id),work=has('workyard')?'workyard':'market';
 const rows=['doctor','work','inn','smith','watch','guide','animals','archivist','materials'].map(kind=>({id:kind+'-'+siteId,kind,person:actor(s,kind,siteId),roomId:({doctor:'shrine',work,inn:'tavern',smith:work,watch:'watch',guide:'gate',animals:'market',archivist:'archive',materials:'market'})[kind]}));
 const merchant=s.realm?.sites?.[siteId]?.merchant;
 if(merchant){
  rows.push({id:'merchant-'+siteId,kind:'merchant',subjectId:'market',person:{...merchant,id:'resident-'+merchant.id.replace(/[^a-zA-Z0-9_-]/g,'-'),role:'General Merchant',locationId:siteId},roomId:'market'});
  for(const vendor of ['apothecary','outfitter'])rows.push({id:vendor+'-'+siteId,kind:'merchant',subjectId:vendor,person:actor(s,vendor,siteId),roomId:'market'});
 }
 const keeper=s.realm?.sites?.[siteId]?.keeper;
 if(keeper&&(s.realm.sites[siteId].hasShrine!==false||s.realm.petition?.boardId===siteId))rows.push({id:'keeper-'+siteId,kind:'keeper',person:{...keeper,id:keeper.id||'keeper-'+siteId,role:'Shrine Keeper',locationId:siteId,age:keeper.age||40},roomId:'shrine'});
 for(const route of ['community','shrine','academy','apprenticeship']){const teacher=educationTeacher({...s,education:{...s.education,route}});if(teacher?.locationId===siteId)rows.push({id:'school-'+route+'-'+siteId,kind:'school',subjectId:route,person:{...teacher,role:route==='apprenticeship'?'Apprenticeship Teacher':route==='academy'?'Academy Teacher':route==='shrine'?'Shrine Teacher':'Community Teacher'},roomId:route==='shrine'?(s.realm.sites[siteId]?.hasShrine===false?'archive':'shrine'):route==='apprenticeship'?work:'archive'});}
 for(const c of classView(s).callings.filter(c=>c.mentor.locationId===siteId))rows.push({id:'mentor-'+c.id,kind:'mentor',subjectId:c.id,person:{...c.mentor,role:c.name+' Mentor'},roomId:c.mentor.roomId||(/mage|healer|necromancer|elementalist/.test(c.role+' '+c.id)?'archive':work)});
 const region=regionAt(view);
 for(const f of FACTION_DEFINITIONS_V27.filter(f=>f.regionId===region?.id))rows.push({id:'faction-'+f.id+'-'+siteId,kind:'faction',subjectId:f.id,factionName:f.name,person:actor(s,'faction',siteId,f.id),roomId:has('hall')?'hall':'tavern'});
 for(const c of (s.adventuring?.contracts||[]).filter(c=>c.boardId===siteId&&['offered','active','ready'].includes(c.status)))rows.push({id:'giver-'+c.id,kind:'contracts',subjectId:c.id,person:{...c.giver,id:'giver-'+c.id,role:'Contract Giver',locationId:siteId},roomId:'tavern'});
 rows.push(...regionalCourtServices(s,siteId));
 if(s.realm?.politics)rows.push({id:'envoy-'+siteId,kind:'envoy',person:actor(s,'envoy',siteId),roomId:'watch'});
 if(heldSettlement(s,siteId)){const watch=rows.find(r=>r.kind==='watch'),witness=rows.find(r=>r.kind==='archivist'),doctor=rows.find(r=>r.kind==='doctor');rows.splice(0,rows.length,...[doctor,{...watch,id:'resistance-'+siteId,kind:'resistance',person:{...watch.person,role:'Resistance Contact'}},{...witness,id:'witness-'+siteId,kind:'resistance',person:{...witness.person,role:'Resistance Witness'}}].filter(Boolean));}
 return rows.map(r=>({...r,activeRoute:s.education?.route||'community',locationId:siteId,activeRoute:s.education?.route||'community',personId:r.person.id,name:r.person.name,role:r.factionName||r.person.role||SERVICE_ROLES[r.kind],here:siteId===s.locationId&&!s.cartography?.offsite&&!s.cartography?.pending&&r.roomId===currentRoom(s)}));
}
export function serviceAccepts(r,id){
 if(id.startsWith('polity_'))return ['court','envoy','resistance'].includes(r.kind)&&politicalActionRoom(null,id).includes(r.roomId);
 if(r.kind==='merchant'&&r.subjectId==='market'&&id.startsWith('justice_job_'))return true;

 if(r.kind==='archivist')return id==='origin_register'||/^lore_/.test(id);
 if(r.kind==='animals')return id==='pastime_pet';
 if(r.kind==='guide')return /^(pastime_fair$|quest_|journal_(main_accept|accept_)|rpg_(regional_|relocate_|expand_circle|intrigue_(read|open)))/.test(id);
 if(r.kind==='doctor')return /^(health_(clinic|review)|help_clinic$|seek_cure$|lycan_cure$)/.test(id);
 if(r.kind==='materials')return id.startsWith('career_buy_')&&Object.hasOwn(MATERIAL_PRICES,id.slice('career_buy_'.length));
 if(r.kind==='work')return /^(career_(choose_|work$|practice$|accept_|make_|invoice$|abandon$|shop_operate$|study$)|choose_profession$|work$)/.test(id);
 if(r.kind==='inn')return id.startsWith('repertoire_')||id.startsWith('inn_')||id==='pastime_games'||id==='pastime_performance';
 if(r.kind==='smith')return /^(workshop_|craft_|gear_forge_|gear_craft_|gear_upgrade_|career_(open_shop|shop_upgrade|hire|mentor|masterwork|public_work|specialty_))/.test(id);
 if(r.kind==='school'){if(id.startsWith('school_enroll_'))return id==='school_enroll_'+r.subjectId;return r.subjectId===(r.activeRoute||'community')&&/^(school_(?!sit_|place_|read_|lecture$|degree$|break_bond$)|grow_(school|read)$|study$|take_exam$)/.test(id);}
 if(r.kind==='mentor')return ({paladin:'seek_order',necromancer:'seek_necromancy',assassin:'seek_assassin'}[r.subjectId]===id)||id.startsWith('legacycalling_')&&id.endsWith('_'+r.subjectId)||['meet','train','seek','service','handover'].some(k=>id==='calling_'+k+'_'+r.subjectId)||['formation','handover','resume','discuss'].some(k=>id==='fellowship_'+k+'_'+r.subjectId);
 if(r.kind==='faction')return ['rpg_join_','rpg_faction_'].some(prefix=>id===prefix+r.subjectId)||r.subjectId==='quiet_table'&&id==='justice_job_prepare';
 if(r.kind==='contracts')return ['adventure_accept_','adventure_claim_'].some(prefix=>id===prefix+r.subjectId);
 if(r.kind==='keeper')return id==='origin_contact'||/^(pray$|grow_devotion$|faith_|realm_(join_|ritual|leavefaith|petition|custom|report_)|lineage_adoption_)/.test(id);
 if(r.kind==='watch')return id.startsWith('tournament_')||/^(settle_fine$|justice_(report|confess|restitution|petition)|realm_(negotiate|invest|relief|charter|govern|rebuild))/.test(id);
 return false;
}
const complex=/^career_batch_(month|year)$/;
export function serviceAccessReason(s,id,knownServices=null){
 if(id.startsWith('legacycalling_withdraw_')||['tournament_withdraw','tournament_suspend','tournament_close'].includes(id))return null;
 if(['origin_register','origin_contact'].includes(id)){
  const ref=s.familyOrigins?.run?.cast[id==='origin_register'?'archivist':'lead'],provider=ref&&(knownServices||settlementServices(s)).find(r=>r.personId===ref.id&&r.locationId===ref.locationId&&r.roomId===ref.roomId);
  // The owner exposes an honest unavailable-source branch. A replacement must
  // not commandeer the old individual’s investigation or personal testimony.
  if(!provider)return null;
  return provider.here?null:`Visit ${ref.name} at the ${ref.roomId==='archive'?'School & Archive':'Shrine & Healing Room'}.`;
 }

 if(id.startsWith('polity_')){if(!politicalActionRoom(s,id).includes(currentRoom(s)))return 'Meet the local contact at '+(politicalActionRoom(s,id)[0]==='court'?'the Regional Court':politicalActionRoom(s,id)[0]==='archive'?'the Archive':politicalActionRoom(s,id)[0]==='stronghold'?'the Occupied Keep':'the Watchhouse')+'.';return null;}
 if(heldSettlement(s)&&/^(gear_buy_|realm_(potion|ration|sell|returngear_)|career_|school_|workshop_|pray$)/.test(id))return 'Public trade and official work are closed under vampire occupation.';
 if(/^(gear_buy_|realm_(potion$|ration$|sellgear_|sellloot_|returngear_))/.test(id)&&(!isSettlement(s.world,s.locationId)||currentRoom(s)!=='market'||s.cartography?.offsite||s.cartography?.pending))return 'Visit the merchant at the Market.';
 if(/^life_home_/.test(id)&&(!isSettlement(s.world,s.locationId)||currentRoom(s)!=='homes'||s.cartography?.offsite))return 'Visit the Homes area to view a property.';
 // A personal observance abroad does not ask another faith's keeper to officiate.
 if(id==='realm_leavefaith'||id==='realm_ritual'&&s.realm?.faithId&&s.realm.faithId!==(s.realm.sites?.[s.locationId]?.faithId||s.realm.regions.find(r=>r.id===s.realm.sites?.[s.locationId]?.regionId)?.faithId))return null;
 if(id==='career_work'&&s.hero.profession==='Scholar'&&ownedHomeHere(s)&&currentRoom(s)==='homes'&&!s.cartography?.pending)return null;
 if(/^workshop_gather_/.test(id))return null;
 if(complex.test(id))return 'Choose a short activity or speak to someone in your surroundings.';
 // Old commitments can always be resumed or ended using their saved terms.
 if(/^(lineage_adoption_(continue|cancel)|workshop_(continue|cancel)|career_batch_(continue|resume|cancel|abandon)|recovery_(continue|cancel)|rpg_(continue|cancel))/.test(id))return null;
 if(id.startsWith('stories_open_')){const arc=s.stories?.arcs.find(a=>a.id===id.slice(13));const person=arc&&[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[])].find(p=>p.id===arc.personId);if(arc&&arc.locationId!==s.locationId&&person?.locationId!==s.locationId)return 'Meet this person or return to the site of the accepted work.';}
 const needs=/^(tournament_|repertoire_(accept$|perform_|recall_)|pastime_performance$|health_(clinic|review)|help_clinic$|seek_cure$|lycan_cure$|career_|choose_profession$|work$|school_(?!sit_|place_|read_|lecture$|degree$|break_bond$)|grow_(school|read)$|study$|take_exam$|workshop_|craft_|gear_(craft|forge|upgrade)_|seek_(order|necromancy|assassin)$|legacycalling_|calling_(meet|train|seek|service|handover)_|fellowship_(formation|handover|resume|discuss)_|rpg_(join_|faction_|regional_|relocate_|intrigue_read)|adventure_(accept|claim)_|lore_|lineage_adoption_|pray$|faith_|settle_fine$|realm_(join_|ritual|leavefaith|petition|custom|report_|negotiate|invest|relief|charter|govern|rebuild))/.test(id);
 if(!needs&&!id.startsWith('talk_')&&!id.startsWith('confide_'))return null;
 // Wild mentors retain their real outdoor meeting places.
 if(!isSettlement(s.world,s.locationId)&&/^(calling_|fellowship_(formation|handover|resume|discuss)_|lore_)/.test(id))return null;
 const services=knownServices||settlementServices(s),owners=services.filter(r=>serviceAccepts(r,id)||id==='talk_'+r.personId||id==='talk_quest_'+r.personId||id==='confide_'+r.personId);
 if(owners.some(r=>r.here)||(id.startsWith('talk_')||id.startsWith('confide_'))&&!owners.length)return null;
 const r=owners[0];return r?`Visit ${r.name} at the ${r.roomId==='archive'?'School & Archive':r.roomId==='shrine'?'Shrine & Healing Room':r.roomId==='workyard'?'Work Yard':r.roomId==='market'?'Market':r.roomId==='tavern'?'Tavern':r.roomId==='hall'?'Civic Hall':'Watchhouse'}.`:'Find someone who offers this service in the world.';
}
export function serviceWalkPath(s,target){
 const rooms=cityRooms(s),current=currentRoom(s);if(!rooms.some(r=>r.id===target))return null;if(current===target)return [];
 const queue=[[current]],seen=new Set([current]);while(queue.length){const path=queue.shift(),row=rooms.find(r=>r.id===path.at(-1));for(const id of row?.exits||[]){if(seen.has(id)||!rooms.some(r=>r.id===id))continue;const route=[...path,id];if(id===target)return route.slice(1);seen.add(id);queue.push(route);}}return null;
}
export function serviceContacts(s){
 const saved=Object.values(s.conversations?.servicePeople||{}),local=settlementServices(s).map(r=>r.person);
 return [...saved,...local].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i).map(saved=>{
  const p=projectNpcPerson(s,saved),site=s.world.locations.find(l=>l.id===p.locationId),legacyExpired=!p.npcActive&&p.serviceEndDay!==undefined&&s.day>=p.serviceEndDay;
  const retired=p.retired===true||legacyExpired||(s.education?.teacherHistory||[]).some(t=>t.id===p.id)||/^(court-|chancellor-)/.test(p.id)&&!Object.values(s.realm?.politics?.regions||{}).some(r=>r.court.some(c=>c.id===p.id)),continuation=npcContinuationAvailable(s,p);
  const age=p.ageAtRetirement??(p.baseAge!==undefined?p.baseAge+Math.floor(Math.min(s.day,p.serviceEndDay??s.day)/365):p.age||35);
  return {...p,bond:s.conversations?.relationships?.[p.id]?.bond??p.bond??40,age,...(retired&&p.serviceEndDay!==undefined?{retired:true,retiredDay:p.retiredDay??p.serviceEndDay,ageAtRetirement:age,availabilityReason:p.availabilityReason||'Their earlier public life is recorded; later whereabouts are unrecorded.'}:{}),...(retired?{commitmentOnly:continuation}:{}),available:p.available!==false&&(!retired||continuation)&&!!site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false,description:p.description||`Works as a ${String(p.role||'local resident').toLowerCase()} in ${site?.name||'this settlement'}.`,kind:'extra',minAge:0,source:s.conversations?.relationships?.[p.id]};
 });
}
