import { isSettlement } from './world.js';

// One transient scene, not a saved route or a history stack. No simulation
// commands, save writes, whole-save copies or remotely projected providers.
export const sceneUtilityTab = tab => ['inventory','journal','quests','lore'].includes(tab);
export function sceneReturnBlocked(s) {
 return !s?.hero || s.hero.alive===false || ['dead','retired'].includes(s.phase) || Boolean(s.event||s.battle||s.conversations?.pending||s.maze||s.justice?.prison||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite);
}
const available = p => p && typeof p.id==='string' && p.alive!==false && p.available!==false && p.retired!==true;
const room = s => s.cartography?.interior?.roomId||'gate';
// Outdoor mentors are authoritative here-only providers, not residents of an
// invented settlement gate. Keep this exception specific to their actual class
// identity and location; ordinary providers still require the exact room.
const outdoorMentor = (s,r) => !s.cartography?.interior && !isSettlement(s.world,s.locationId) && r.kind==='mentor' && typeof r.subjectId==='string' && r.id==='mentor-'+r.subjectId && r.person?.npcSlot?.kind==='mentor' && r.person.npcSlot.classId===r.subjectId && r.person.locationId===s.locationId && r.roomId===(r.person.roomId||'trail');
function frame(s) {
 return JSON.stringify({seed:s.seed,birthDay:s.timeline?.birthDay,generation:s.dynasty?.generation||1,heroId:s.hero.id,heroName:s.hero.name,day:s.day,age:s.age,phase:s.phase,locationId:s.locationId,position:s.cartography?.position,interior:s.cartography?.interior});
}
export function sceneReturnSource(s,origin,readers) {
 if(sceneReturnBlocked(s)||!origin)return null;
 if(origin.kind==='quest-journal'&&['all','main','side','misc','radiant','archive','commitments'].includes(origin.id))return {kind:origin.kind,id:origin.id,name:'your quest journal',fingerprint:JSON.stringify({kind:origin.kind,id:origin.id})};
 const services=readers.services(s);
 const local=r=>r.here===true && r.locationId===s.locationId && available(r.person) && r.personId===r.person.id && (r.roomId===room(s)||outdoorMentor(s,r));
 let provider,person;
 if(origin.kind==='service'){
  provider=services.find(r=>r.id===origin.id&&local(r));person=provider?.person;
 }else if(origin.kind==='person'){
  person=readers.people(s).find(p=>p.id===origin.id&&available(p)&&p.locationId===s.locationId&&(!p.roomId||p.roomId===room(s)));
  provider=person&&services.find(r=>r.personId===person.id);
  if(provider&&!local(provider))return null;
 }else return null;
 if(!person||(person.minAge??0)>s.age)return null;
 const binding=provider?{id:provider.id,kind:provider.kind,subjectId:provider.subjectId,personId:provider.personId,locationId:provider.locationId,roomId:provider.roomId,here:provider.here}:null;
 return {kind:origin.kind,id:origin.id,name:person.name,personId:person.id,provider:binding,fingerprint:JSON.stringify({person,provider:binding})};
}
// Deliberately whitelist presentation fields. Baskets, quantities, selected
// recipes/items, quotes, confirmations and arbitrary session fields are lost.
export function sceneReturnPresentation(source,{serviceTopic,shopSession,craftSession,journalQuery}={}) {
 const r=source.kind==='service'?source.provider:null;
 if(source.kind==='quest-journal')return {category:source.id,query:String(journalQuery||'').slice(0,120),topic:null,craft:null,shop:null};
 const text=value=>typeof value==='string'?value.slice(0,100):'';
 const craft=r?.kind==='smith'&&craftSession?.mode==='craft'&&craftSession.serviceId===r.id&&craftSession.personId===r.personId?{category:craftSession.category,filter:craftSession.filter,query:text(craftSession.query),finish:craftSession.finish}:null;
 const vendor=r?.kind==='materials'?'materials':r?.kind==='inn'?'inn':r?.kind==='merchant'?r.subjectId||'market':null;
 const shop=vendor&&shopSession?.vendor===vendor&&['dialogue','terms','trade'].includes(shopSession.mode)?{vendor,mode:shopSession.mode,filter:shopSession.filter,query:text(shopSession.query)}:null;
 const topic=r?.kind==='work'&&serviceTopic==='commissions'||r?.kind==='inn'&&serviceTopic==='repertoire'?serviceTopic:null;
 return {topic,craft,shop};
}
export function captureSceneReturn(context,origin,readers,presentation={},focus=null) {
 const {game,slot,revision,conflict}=context;if(conflict)return null;
 const source=sceneReturnSource(game,origin,readers);if(!source)return null;
 return {game,hero:game.hero,slot,revision,frame:frame(game),source,presentation:sceneReturnPresentation(source,presentation),focus};
}
export function validSceneReturn(trail,context,readers) {
 const {game,slot,revision,conflict}=context;
 if(!trail||conflict||trail.game!==game||trail.hero!==game?.hero||trail.slot!==slot||trail.revision!==revision||sceneReturnBlocked(game)||trail.frame!==frame(game))return false;
 return sceneReturnSource(game,trail.source,readers)?.fingerprint===trail.source.fingerprint;
}
export function sceneReturnForNavigation(trail,from,to,context,origin,readers,presentation,focus) {
 if(!sceneUtilityTab(to))return null;
 if(from==='place'||from==='journal'&&origin?.kind==='quest-journal'&&!validSceneReturn(trail,context,readers))return captureSceneReturn(context,origin,readers,presentation,focus);
 return sceneUtilityTab(from)&&validSceneReturn(trail,context,readers)?trail:null;
}
