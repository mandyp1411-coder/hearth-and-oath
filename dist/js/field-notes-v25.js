import { seededRoll } from './world.js';
const rows=[
 ['ferry','A rope under the mud','A broken ferry rope lies beside a dated household tally. The tally lists crossings that were paid for but never made.','Tie a safe return rope','Copy the tally and keep its source','Keep the recovered fare'],
 ['marker','A maker’s mark in a fallen wall','A fallen boundary stone bears a maker’s mark beneath a later ruler’s seal. The two dates disagree.','Clear the marker for another traveler','Record both dates without choosing an owner','Sell the copied claim to the nearest patron'],
 ['refuge','A door facing the weather','Someone has wedged a discarded door against the wind. Scratches inside count nights rather than years.','Repair the windbreak','Keep the count in your field notes','Take its useful fittings'],
 ['lantern','A lantern with no watch','A lantern hangs above a washed-out path. Its burned wick is recent; its watch list is decades older.','Set a fresh safe-path marker','Separate the recent wick from the old claim','Collect the iron and leave the path dark'],
 ['salt','A salt stain above the tide','A rope rises beyond the current tide mark. A slate names one safe hour and three missing boats.','Mark the bounded safe crossing','Copy the stated hour with its uncertainty','Sell a private guide to the crossing'],
 ['roots','A well beneath the roots','A bucket still holds clear water where the old road sank. Roots have begun closing the way in.','Clear a shared access path','Record the water without claiming its source','Reserve the path for a paying patron'],
];
function openHook(s,key,ctx){
  const c=s.cartography,h=c?.hooks?.[key],r=rows.find(r=>r[0]===h?.id);
  if(!r||h.resolution||s.event||s.battle||s.conversations?.pending)return false;
  c.hookPending=key;
  ctx.setEvent?.('way_encounter',r[1],'A place actually visited',r[2]+' You found this after arriving; surveying an unvisited hex cannot reveal it.',[{id:'care',label:r[3],description:'Two real days and 4 gold. Improve your field practice and leave usable shelter or access; resting on this hex later recovers 4 additional health.'},{id:'record',label:r[4],description:'One real day. Gain scholarship; no unproven claim becomes a legal fact.'},{id:'exploit',label:r[5],description:'One real day. Gain 12 gold from removing or restricting the useful thing; its absence persists.'},{id:'leave',label:'Leave the place as you found it',description:'No fee, time or reward. The observed place remains in your notes.'}]);
  return true;
}
export function fieldActions(s){
  const c=s.cartography,h=c?.hooks?.[c.position];
  return s.age>=14&&h&&!h.resolution&&!c.pending&&!s.event&&!s.battle&&!s.conversations?.pending?[{id:'way_revisit',label:'Return to the unfinished field note',description:'Reopen the same observed place on this hex. Earlier travel days stay spent; no reward is granted by viewing it.',days:0,cost:0,group:'Exploration'}]:[];
}
export function applyFieldAction(s,id,ctx={}){return id==='way_revisit'&&fieldActions(s).some(a=>a.id===id)?openHook(s,s.cartography.position,ctx):false;}
export function recordHexHook(s,cell,ctx={}){
  const c=s.cartography;if(!c||s.age<14)return false;c.hooks||={};if(c.hooks[cell.key]||Object.keys(c.hooks).length>=128||seededRoll(s.seed,'hex-hook:'+cell.key,4)!==0)return false;
  const terrain=String(cell.terrain).toLowerCase(),index=/coast|marsh|water/.test(terrain)?4:/forest|wood/.test(terrain)?5:/mountain|stone/.test(terrain)?1:seededRoll(s.seed,'hook-kind:'+cell.key,4),r=rows[index];
  const known=Object.keys(c.sites).filter(id=>id===s.locationId)[0]||null;
  c.hooks[cell.key]={id:r[0],version:25,terrain:cell.terrain,day:s.day,nearbyKnownSiteId:known,resolution:null,resolvedDay:null};
  openHook(s,cell.key,ctx);
  return true;
}
export function applyFieldChoice(s,eventId,id,ctx={}){
  if(eventId!=='way_encounter'||!['care','record','exploit','leave'].includes(id))return false;
  const c=s.cartography,key=c?.hookPending,h=c?.hooks?.[key];if(!h||h.resolution)return false;
  if(id==='care'&&s.hero.gold<4)return false;
  const days=id==='care'?2:id==='leave'?0:1,taken=ctx.spendDays?.(days,{outdoors:true})||0;
  if(s.phase==='retired')return true;if(taken!==days){s.notice='The field note waits at a calendar need. No fee or result was granted.';delete c.hookPending;return true;}
  if(id==='care'){s.hero.gold-=4;s.hero.skills.survival++;h.usable=true;}
  if(id==='record')s.hero.skills.scholarship++;
  if(id==='exploit'){s.hero.gold+=12;h.usable=false;ctx.breakOath?.('You restricted or dismantled a useful shared passage.');}
  h.resolution=id;h.resolvedDay=s.day;delete c.hookPending;const r=rows.find(r=>r[0]===h.id);ctx.journal?.(r[1],`${r[2]} You chose ${id}; ${days} real days passed. The same observed place and consequence stay on this hex.`,'travel');return true;
}
export function fieldEventIds(){return {way_encounter:['care','record','exploit','leave']};}
export function validateFieldNotes(c,s){if(!c?.hooks)return true;const n=(v,a=0,b=s.day)=>Number.isSafeInteger(v)&&v>=a&&v<=b;if(typeof c.hooks!=='object'||Array.isArray(c.hooks)||Object.keys(c.hooks).length>128)return false;for(const [key,h] of Object.entries(c.hooks)){if(!/^-?\d+,-?\d+$/.test(key)||h.version!==25||!rows.some(r=>r[0]===h.id)||typeof h.terrain!=='string'||h.terrain.length>80||!n(h.day)||![null,'care','record','exploit','leave'].includes(h.resolution)||!(h.resolvedDay===null||n(h.resolvedDay,h.day))||!(h.nearbyKnownSiteId===null||s.world.locations.some(p=>p.id===h.nearbyKnownSiteId)))return false;}return c.hookPending===undefined||!!c.hooks[c.hookPending]&&!c.hooks[c.hookPending].resolution&&s.event?.id==='way_encounter';}
export const DESCENT_PREMISES=[
 {id:'missing_register',rumor:'A keeper copied a list of names that vanish from the burial register each winter.',clue:'The same erased names are scratched on the inner door, beside a recently moved oil bowl.',relic:'The scraped burial register'},
 {id:'sealed_hearth',rumor:'A household hears its lost hearth bell beneath the locked stairs after midnight.',clue:'The bell rope is spliced to a new cord. Someone has been using the old sound to draw travelers inside.',relic:'The household’s returned hearth bell'},
 {id:'false_tithe',rumor:'A claimant says the old toll treasury contains proof of an inherited road debt.',clue:'The oldest tally predates the claimant’s seal. The quoted debt was written in a later hand.',relic:'The original untithed road tally'},
];
