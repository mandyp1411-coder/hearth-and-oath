import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
import { generateCharacter } from './characters.js';
import { seededRoll } from './world.js';
import { regionAt, refreshStoryTrade } from './realm.js';
import { markSiteKnowledge } from './cartography.js';
import { agingPolicy } from './aging-policy-v25.js';
import { isCanonicalAppearance } from './avatar.js';
import { sameMazeRun, validMazeActor } from './maze-provenance.js';
const catalog=ENCOUNTER_DESIGN_V27.bosses;
const roles={shut_gate_ferryman:['Engineer','stranded adult parent'],watch_that_never_ends:['widower','watch keeper'],captain_without_shore:['harbor official','coast burial keeper'],glass_tide_witness:['returned sailor','tide scholar'],unfinished_son:['foundry apprentice','war patron'],furnace_widow:['pasture supplier','mountain guide'],mother_empty_nests:['bird seller','logging household keeper'],orchard_wife:['former lover','forge priest'],saltless_captain:['conscript speaker','water claimant'],crown_beneath_ash:['refuge survivor','council envoy'],listener_drowned_door:['grown boat builder','crossing teacher'],guest_would_not_leave:['ferry courier','living memorial host']};
const skills={repair_pump:[['survival',6]],sell_passage:[['persuasion',7]],bind_watch:[['arcana',8]],new_berth:[['persuasion',8]],smuggle_crew:[['stealth',7]],redirect_lens:[['scholarship',7],['arcana',5]],keep_eye:[['arcana',8]],finish_differently:[['scholarship',7]],close_shaft:[['persuasion',7]],sell_guard:[['persuasion',8]],move_nest:[['survival',8],['scholarship',6]],take_egg:[['stealth',10]],plant_buffer:[['survival',7]],buy_deserters:[['persuasion',8]],end_claim:[['persuasion',9],['scholarship',7]],borrow_crown:[['arcana',9]],sell_echo:[['scholarship',8]]};
const coercive=new Set(['sell_passage','bind_watch','smuggle_crew','keep_eye','sell_guard','take_egg','claim_wood','buy_names','take_levy','borrow_crown','sell_echo','sell_cups']);
const holding=s=>Object.values(s.realm.sites).find(p=>p.owner===(s.dynasty?.activePersonId||'hero')&&!['destroyed','evacuated'].includes(s.world.locations.find(l=>l.id===p.id)?.status)&&s.world.locations.find(l=>l.id===p.id)?.servicesAvailable!==false);
const alive=b=>b.people.every(p=>p.alive!==false);
const note=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'rpg');s.rpg.history.push({day:s.day,title,text,locationId:s.locationId});s.rpg.history=s.rpg.history.slice(-180);};
export function bossContactJournal(b,d,{renewal=false}={}){return renewal?{title:'A new listener, a fresh agreement',text:`${b.people.map(p=>p.name+' ('+p.role+')').join(' and ')} gave the present household member their own fresh account over two actual days. Their earlier testimony remains attributed to its original listener. No earlier consent, fee, supply or reward was inherited or repeated.`}:{title:'A guardian’s particular lead',text:`${b.people.map(p=>p.name+' ('+p.role+')').join(' and ')} gave their own account of ${d.name}. No dead witness or missing person was invented.`};}
const offer=(id,label,description,days=0,cost=0,reason)=>({id,label,description,days,cost,group:'The guardian’s account',...(reason?{disabledReason:reason}:{})});
function service(s,b,kind,rule='shared',finite=false){const id='service-boss-'+b.id+'-'+kind;if(s.rpg.services.some(v=>v.id===id))return;s.rpg.services.push({id,kind,rule,locationId:b.locationId,ownerId:b.people[0].id,source:b.id,day:s.day,lastUsedDay:null,...(finite?{expiresDay:s.day+92}:{})});s.rpg.services=s.rpg.services.slice(-512);}
export function initializeBossStories(s,x){
 for(const d of catalog.filter(b=>b.regionId===x.regionId))if(!s.rpg.bosses.some(b=>b.id===d.id)){
  const heritage={rainward:'sable_coast',saltreach:'sable_coast',highstone:'ashlands',blackgrove:'ashlands',ashplain:'sunlands',bellwater:'sunlands'}[d.regionId];
  const people=roles[d.id].map((role,i)=>{const id=`boss-${d.id}-${i}`,age=26+seededRoll(s.seed,id+':age',25),p=generateCharacter(s.seed,id,{role,age,heritage});return {...p,id,role,age,baseAge:age,bornDay:s.day-age*365,deathAge:78+seededRoll(s.seed,id+':death',15)+agingPolicy(p).elder-65,alive:true,locationId:x.locationId,regionId:d.regionId,bond:35,memories:[],knownFacts:[]};});
  s.rpg.bosses.push({id:d.id,locationId:x.locationId,people,leads:{archive:null,survey:null,contact:null},resolutions:[],introducedDay:s.day});
 }
}
export function bossChoiceReason(s,bossId,approachId,{paidGold=false,target=null}={}){
 const b=s.rpg?.bosses.find(b=>b.id===bossId),d=catalog.find(b=>b.id===bossId),a=d?.noncombatApproaches.find(a=>a.id===approachId);
 if(!b||!a)return 'No recorded approach exists.';
 if(b.resolutions.length)return 'This guardian’s account is already resolved.';
 if(!alive(b))return 'A required living participant has died. Their earlier record remains; this approach cannot invent them alive.';
 if(target&&(b.locationId!==target.locationId||s.locationId!==target.locationId||!b.people.every(p=>p.locationId===target.locationId)))return 'The required living participants must be present at their recorded hearth.';
 for(const kind of ['archive','survey','contact'])if((target?bossLeadForTarget(b,kind,target):b.leads[kind])===null||target&&!ownBossLead(bossLeadForTarget(b,kind,target),b,target))return `Attend this guardian’s own ${kind} lead first.`;
 for(const [key,n]of skills[a.id]||[])if(s.hero.skills[key]<n){const trainedCraft=s.companions.some(c=>c.active&&c.recruited&&c.alive!==false&&['tovin','sable'].includes(c.id)&&s.rpg.companionStages[c.id]?.stage>=3);if(['repair_pump','finish_differently'].includes(a.id)&&trainedCraft)continue;if(a.id==='close_shaft'&&s.factions.villagers>=20)continue;return `Requires ${key} ${n}.`;}
 if(['claim_wood','borrow_crown'].includes(a.id)&&!holding(s))return 'Requires an actual surviving holding of your household.';
 if(!paidGold&&s.hero.gold<(a.costs.gold||0))return `Requires ${a.costs.gold} gold.`;
 if((s.adventuring?.rations||0)<(a.costs.rations||0))return `Requires ${a.costs.rations} actual ration bundles.`;
 for(const [k,n]of Object.entries(a.costs.materials||{}))if((k==='herbs'?s.flags.herbs||0:s.equipment.materials[k]||0)<n)return `Requires ${n} ${k}.`;
 if(a.id==='new_trade'&&!s.companions.some(c=>c.active&&c.recruited&&c.alive!==false&&s.rpg.companionStages[c.id]?.stage>=3)&&s.hero.skills.devotion<6)return 'Requires a practiced craft companion or devotion 6.';
 return null;
}
// Explicit targets keep maze content independent from the legacy expedition.
export function ownBossLead(lead,b,target){
 return !!lead&&['mazeId','runSeed','runGeneration','sourceId','locationId'].every(key=>lead[key]===target[key])&&lead.manifestVersion===1&&lead.family==='signature'
  &&Array.isArray(lead.participantIds)&&lead.participantIds.length===b.people.length&&b.people.every(p=>lead.participantIds.includes(p.id));
}
export function bossLeadForTarget(b,kind,target){
 if(kind!=='contact')return b.leads[kind];
 return target.contactLeads?.find(lead=>lead.bossId===b.id&&lead.actorId===target.actorId&&lead.actorGeneration===target.actorGeneration)||null;
}
function mazeBossProvenance(target){
 return {mazeId:target.mazeId,runSeed:target.runSeed,runGeneration:target.runGeneration,manifestVersion:1,family:'signature',sourceId:target.sourceId,locationId:target.locationId,slotId:target.room.id,cellId:target.cellId,actorId:target.actorId,actorGeneration:target.actorGeneration};
}
export function bossTargetActions(s,target){
 const {room:r,regionId}=target,modern=!!target.mazeId,bs=s.rpg.bosses.filter(b=>catalog.find(d=>d.id===b.id).regionId===regionId&&(!modern||b.locationId===target.locationId)),result=[];
 for(const b of bs){if(b.resolutions.length)continue;const d=catalog.find(d=>d.id===b.id);
  const leads=[];
  if(r.id==='ledger'&&r.resolved)leads.push('archive');
  if(r.id==='stores'&&r.resolved)leads.push('survey');
  if(['entry','crossing','stores'].includes(r.id))leads.push('contact');
  const known=!modern||target.knownBossIds?.includes(b.id),renewal=modern&&b.leads.contact!==null,present=!modern||s.locationId===b.locationId&&b.people.every(p=>p.locationId===b.locationId);
  for(const lead of leads)if(modern?bossLeadForTarget(b,lead,target)===null:b.leads[lead]===null)result.push(offer(`rpg_boss_${b.id}_${lead}`,renewal&&lead==='contact'?'Hear this household’s account for yourself':!known?(lead==='archive'?'Read a surviving guardian account':lead==='survey'?'Survey a guardian’s working route':'Hear a waiting household’s account'):lead==='archive'?'Read the account of '+d.name:lead==='survey'?'Survey the working route for '+d.name:'Hear '+b.people.map(p=>p.name).join(' and '),`${renewal&&lead==='contact'?'Their public testimony does not transfer personal permission. Meet the actual living participants again':!known?'Attend the actual local account to learn whose passage it concerns':lead==='archive'?d.biography:lead==='survey'?(modern?d.objective:d.context):b.people.map(p=>p.name+' · '+p.role).join('; ')}. ${lead==='archive'?1:2} actual days.`,lead==='archive'?1:2,0,!alive(b)?'The required living participant is no longer available.':!present?'The required living participants are not present at their recorded hearth.':null));
 }
 if(r.bossId&&!r.resolved){const b=bs.find(b=>b.id===r.bossId),d=catalog.find(d=>d.id===r.bossId);if(!b||!d)return result;for(const [i,a]of d.noncombatApproaches.entries())result.push(offer('rpg_room_parley_'+i,a.label,`${a.result} ${a.consequence} ${a.costs.days} actual days${a.costs.gold?' · '+a.costs.gold+' gold':''}${Object.entries(a.costs.materials||{}).map(([k,n])=>' · '+n+' '+k).join('')}${a.costs.rations?' · '+a.costs.rations+' rations':''}.`,a.costs.days,a.costs.gold||0,bossChoiceReason(s,b.id,a.id,{target:modern?target:null})));}
 return result;
}
function uniqueProperty(s,b,kind,label){const id='property-'+b.id+'-'+kind;if(s.rpg.properties.some(p=>p.id===id))return;s.rpg.properties.push({id,kind,label,bossId:b.id,ownerId:s.dynasty?.activePersonId||'hero',locationId:s.locationId,acquiredDay:s.day,soldDay:null,returnedDay:null,lastUsedDay:null,pursuitUntil:kind==='egg'?s.day+92:null,pursuitDefeatedDay:null});}
export function resolveBossApproach(s,p,ctx,{target=null,onResolved=null,onLead=null}={}){
 if(p.kind==='property'){const v=s.rpg.properties.find(v=>v.id===p.id);if(!v||v.soldDay!==null||v.returnedDay!==null)return;
  if(p.choice==='sale'||p.choice==='ransom'){v.soldDay=s.day;s.hero.gold+=p.choice==='sale'?100:60;note(s,ctx,'A unique property transferred',`${v.label} changed hands once for ${p.choice==='sale'?100:60} gold. Its provenance remains.`);}
  else if(p.choice==='return'){v.returnedDay=s.day;v.pursuitUntil=null;note(s,ctx,'A property returned',v.label+' was returned to its actual recorded source. No sale proceeds were received.');}
  return;
 }
 const bossId=target?.bossId||p.id,b=s.rpg.bosses.find(b=>b.id===bossId),d=catalog.find(d=>d.id===bossId);if(!b||!d)return;
 if(target&&(s.locationId!==target.locationId||b.locationId!==target.locationId||!alive(b)||!b.people.every(person=>person.locationId===target.locationId)))return;
 if(p.choice.startsWith('lead_')){const kind=p.choice.slice(5),renewal=!!target&&kind==='contact'&&b.leads[kind]!==null;
  if(!['archive','survey','contact'].includes(kind)||!alive(b)||b.leads[kind]!==null&&!renewal||renewal&&bossLeadForTarget(b,kind,target))return;
  const lead={day:s.day,roomId:p.details.roomId||target?.room.id,participantIds:b.people.map(p=>p.id),...(target?{...mazeBossProvenance(target),startedDay:p.startedDay,days:p.totalDays}: {})};
  if(!renewal)b.leads[kind]=lead;
  onLead?.(b,kind,lead,{renewal});
  if(renewal){const row=bossContactJournal(b,d,{renewal:true});note(s,ctx,row.title,row.text);return;}
  if(kind==='survey'&&b.id==='orchard_wife')s.flags.herbs=(s.flags.herbs||0)+2;
  note(s,ctx,'A guardian’s particular lead',kind==='archive'?d.biography:kind==='survey'?`You inspected the actual ${d.name} side route for two days. The map, stores and hazards remain those of this descent.`:bossContactJournal(b,d).text);return;
 }
 const a=d.noncombatApproaches.find(a=>a.id===p.choice),reason=bossChoiceReason(s,b.id,a?.id,{paidGold:p.paid,target});if(reason){note(s,ctx,'An agreement that could not finish',reason+' Attendance and fees already spent remain recorded; no reward or rescue was granted.');return;}
 for(const [k,n]of Object.entries(a.costs.materials||{})){if(k==='herbs')s.flags.herbs-=n;else s.equipment.materials[k]-=n;}s.adventuring.rations-=a.costs.rations||0;
 const reward={sell_guard:60,buy_names:55,sell_echo:40,sell_cups:50,take_levy:25,claim_wood:25}[a.id]||0;s.hero.gold+=reward;
 b.resolutions.push({id:a.id,day:s.day,days:p.totalDays,gold:reward,outcome:a.result,consequence:a.consequence,participantIds:b.people.map(p=>p.id),...(target?mazeBossProvenance(target): {})});
 if(target)onResolved?.(b,a);
 for(const person of b.people){person.memories.push(a.result+' '+a.consequence);person.memories=person.memories.slice(-30);person.bond=Math.max(0,Math.min(100,person.bond+(coercive.has(a.id)?-12:8)));}
 if(coercive.has(a.id)){ctx.breakOath?.('You chose '+a.label.toLowerCase()+'.');if(['bind_watch','borrow_crown'].includes(a.id)&&regionAt(s)?.law.publicMagic==='forbidden')ctx.addEvidence?.(1,b.people[0].name+' witnessed prohibited public binding.');if(['smuggle_crew','sell_cups','buy_names'].includes(a.id)&&!regionAt(s)?.law.contrabandAllowed)ctx.addEvidence?.(1,b.people[0].name+' identified a prohibited property exchange.');}
 const site=s.realm.sites[b.locationId];if(!coercive.has(a.id))site.security=Math.min(100,site.security+6);
 if(['repair_pump','bring_passenger','lay_crew','new_berth','move_nest','return_birds','plant_buffer','recover_water'].includes(a.id))service(s,b,'route',a.id==='new_berth'?'priced':'shared',a.id==='recover_water');
 if(['keep_watch','return_lamps','redirect_lens','bind_watch'].includes(a.id))service(s,b,'ward',a.id==='bind_watch'?'controlled':'shared',true);
 if(['finish_differently','close_shaft','new_trade','claim_wood'].includes(a.id))service(s,b,'workshop',a.id==='claim_wood'?'controlled':'shared');
 if(['finish_story','new_room','sell_echo'].includes(a.id))service(s,b,'school',a.id==='sell_echo'?'priced':'shared',a.id==='new_room');
 if(['show_hearth','last_cup','living_feast','winter_feed'].includes(a.id))service(s,b,'shelter','shared',['living_feast','winter_feed'].includes(a.id));
 if(a.id==='sell_passage')service(s,b,'claim','controlled');if(a.id==='smuggle_crew')service(s,b,'smuggling','controlled',true);
 if(a.id==='take_egg')uniqueProperty(s,b,'egg','The Furnace Widow’s last egg');
 if(a.id==='keep_eye')uniqueProperty(s,b,'lens','The complete Glass-Tide lens');
 if(a.id==='borrow_crown')uniqueProperty(s,b,'crown','The borrowed ash crown');
 if(a.id==='sell_cups')uniqueProperty(s,b,'cup_lead','The patron’s dangerous cup receipt');
 refreshStoryTrade(s,b.locationId);
 note(s,ctx,d.name,a.result+' '+a.consequence+` ${p.totalDays} actual days, ${p.cost} gold and the listed supplies were committed.`+(reward?' '+reward+' gold actually changed hands.':''));
}
export function propertyActions(s){
 const result=[];
 for(const p of s.rpg.properties.filter(p=>p.soldDay===null&&p.returnedDay===null&&p.ownerId===(s.dynasty?.activePersonId||'hero'))){
  if(['egg','lens','crown'].includes(p.kind))result.push(offer('rpg_property_sale_'+p.id,'Sell '+p.label,'Transfer this unique property once for 100 gold. Provenance and former owners remain recorded.',2,0));
  if(p.kind==='egg'){result.push(offer('rpg_property_ransom_'+p.id,'Negotiate the egg’s return','2 real days. Transfer it for 60 gold once; the pursuit ends through restitution.',2,0),offer('rpg_property_return_'+p.id,'Return the last egg','1 actual day. Return the unique egg without money; the old theft remains in the record.',1,0));if(p.pursuitUntil>s.day&&p.pursuitDefeatedDay===null)result.push(offer('rpg_property_pursuit_'+p.id,'Face the pursuing Furnace Widow','1 actual day to confront the source of the pursuit. Defeat or retreat does not silently dispose of the egg.',1,0));}
  if(p.kind==='lens')result.push(offer('rpg_property_use_'+p.id,'Read one public lead through the lens','1 actual day. Learn one actual regional place rumor, once per 28 days; it reveals no private secrets or unseen terrain.',1,0,p.lastUsedDay!==null&&s.day-p.lastUsedDay<28?'Return after 28 days.':null));
  if(p.kind==='crown')result.push(offer('rpg_property_use_'+p.id,'Assert the crown at your holding','1 actual day. Your real holding gains 5 security and sends 12 gold, once per 28 days. Pressure can break a sworn oath.',1,0,!holding(s)?'Requires an actual household holding.':p.lastUsedDay!==null&&s.day-p.lastUsedDay<28?'Return after 28 days.':null));
 }
 return result;
}
export function applyPropertyAction(s,id,ctx,{startProject}){
 const match=id.match(/^rpg_property_(sale|ransom|return|use|pursuit)_(.+)$/),p=s.rpg.properties.find(p=>p.id===match?.[2]);if(!p||p.soldDay!==null||p.returnedDay!==null)return false;const type=match[1];
 if(['sale','ransom','return'].includes(type))return startProject(s,'property',p.id,type,type==='return'?1:2,0,{},ctx);
 const old=s.day,taken=ctx.spendDays(1);if(taken!==1||s.day-old!==1||s.phase==='retired')return true;
 if(type==='pursuit'){s.rpg.propertyBattle={propertyId:p.id,bossId:p.bossId,locationId:s.locationId};ctx.startBattle('rpg_pursuit',{kind:'rpg',pursuitId:p.id,bossId:p.bossId,locationId:s.locationId});return true;}
 p.lastUsedDay=s.day;
 if(p.kind==='lens'){const region=s.realm.sites[p.locationId]?.regionId,candidates=s.world.locations.filter(l=>s.realm.sites[l.id].regionId===region&&l.id!==s.locationId);if(candidates.length){const place=candidates[seededRoll(s.seed,'lens:'+p.id+':'+s.day,candidates.length)];markSiteKnowledge(s,place.id,'Rumored','The lens showed a public regional landmark, without resolving its unvisited terrain.');note(s,ctx,'A bounded public glimpse','You learned a public lead to '+place.name+'. No private conversation or unseen hex was revealed.');}}
 else if(p.kind==='crown'){const site=holding(s);if(!site)return false;site.security=Math.min(100,site.security+5);s.hero.gold+=12;ctx.breakOath?.('You asserted an ancestral crown over living households through intimidation.');note(s,ctx,'A borrowed claim made concrete','Your actual holding gains five security and sends twelve gold. Its living households remember the pressure.');}
 return true;
}
export function afterPropertyBattle(s,b,ctx){const p=s.rpg.properties.find(p=>p.id===b.context.pursuitId);if(!p)return false;s.rpg.propertyBattle=null;if(b.outcome==='victory'){p.pursuitDefeatedDay=s.day;p.pursuitUntil=null;note(s,ctx,'A pursuit ended through battle','The real pursuing guardian was overcome. The egg’s ownership and old theft remain separate facts.');}return true;}
function validMazeBossProvenance(s,b,value,{lead=null,resolution=false}={}){
 const modern=value&&['mazeId','manifestVersion','family','sourceId','slotId','cellId','startedDay'].some(key=>Object.hasOwn(value,key));
 if(!modern)return true;
 const int=(n,min=0,max=s.day)=>Number.isSafeInteger(n)&&n>=min&&n<=max,d=catalog.find(d=>d.id===b.id),expectedSlot=catalog.filter(row=>row.regionId===d.regionId)[0].id===b.id?'guardian':'last';
 if(value.family!=='signature'||value.manifestVersion!==1||value.sourceId!=='signature_'+d.regionId||typeof value.mazeId!=='string'||!/^maze-[1-9]\d*$/.test(value.mazeId)||!int(+value.mazeId.slice(5),1,(s.mazeBook?.nextRun||Number.MAX_SAFE_INTEGER)-1)||!int(value.cellId,0,120))return false;
 const allowed=resolution?['id','day','days','gold','outcome','consequence','participantIds','mazeId','manifestVersion','family','sourceId','locationId','slotId','cellId','runSeed','runGeneration','actorId','actorGeneration']:['day','roomId','participantIds','mazeId','manifestVersion','family','sourceId','locationId','slotId','cellId','startedDay','days','runSeed','runGeneration','actorId','actorGeneration'];
 if(Object.keys(value).some(key=>!allowed.includes(key))||typeof value.runSeed!=='string'||value.runSeed.length>400||!int(value.runGeneration,1,s.dynasty?.generation||5000)||!int(value.actorGeneration,1,s.dynasty?.generation||5000)||!validMazeActor(s,value.actorId)||value.locationId!==b.locationId||value.runSeed!==`${s.seed}:maze:${value.runGeneration}:regional:${value.sourceId}:${value.locationId}:${value.mazeId.slice(5)}`)return false;
 if(resolution){if(value.slotId!==expectedSlot)return false;}
 else{
  const days=lead==='archive'?1:2,slots=lead==='archive'?['ledger']:lead==='survey'?['stores']:['entry','crossing','stores'];
  if(value.locationId!==b.locationId||!slots.includes(value.slotId)||value.roomId!==value.slotId||value.days!==days||!int(value.startedDay,0,value.day-days)||!Array.isArray(value.participantIds)||value.participantIds.length!==2||!b.people.every(p=>value.participantIds.includes(p.id)))return false;
 }
 const retained=[s.maze,...(s.mazeBook?.records||[])].filter(m=>m?.id===value.mazeId);
 if(retained.some(m=>!m.content||!sameMazeRun(value,m)))return false;
 const run=retained[0];
 if(!run)return true; // Bounded old maze archives may legitimately have expired.
 if(run.content?.family!=='signature'||run.sourceId!==value.sourceId||run.locationId!==b.locationId||!run.content.anchors?.some(a=>a.slotId===value.slotId&&a.cellId===value.cellId)||!Array.isArray(run.contentOutcomes))return false;
 const action=resolution?(value.id==='combat'?'combat':'approach_'+value.id):'lead_'+lead;
 return run.contentOutcomes.some(row=>row&&row.actionId===action&&row.bossId===b.id&&row.day===value.day&&row.slotId===value.slotId&&row.actorId===value.actorId&&row.actorGeneration===value.actorGeneration);
}
export function validateBossStories(s){
 const r=s.rpg,int=(n,min=0,max=s.day)=>Number.isSafeInteger(n)&&n>=min&&n<=max,txt=(v,n=2000)=>typeof v==='string'&&v.length<=n;
 if(!Array.isArray(r.bosses)||r.bosses.length>12||new Set(r.bosses.map(b=>b.id)).size!==r.bosses.length)return false;
 for(const b of r.bosses){const d=catalog.find(d=>d.id===b.id);if(!d||!s.realm.sites[b.locationId]||!Array.isArray(b.people)||b.people.length!==2||!b.people.every(p=>txt(p.id,160)&&txt(p.name,120)&&Number.isSafeInteger(p.bornDay)&&typeof p.alive==='boolean'&&int(p.age,0,5000)&&isCanonicalAppearance(p.appearance))||!b.leads||!['archive','survey','contact'].every(k=>b.leads[k]===null||int(b.leads[k]?.day)&&Array.isArray(b.leads[k].participantIds))||!Array.isArray(b.resolutions)||b.resolutions.length>1||!b.resolutions.every(v=>(v.id==='combat'||d.noncombatApproaches.some(a=>a.id===v.id))&&int(v.day)&&txt(v.outcome)&&Array.isArray(v.participantIds)&&v.participantIds.every(id=>b.people.some(p=>p.id===id))))return false;}
 for(const b of r.bosses){
  const d=catalog.find(d=>d.id===b.id),discovery=b.mazeDiscovery;
  if(discovery!==undefined&&(!discovery||typeof discovery!=='object'||Array.isArray(discovery)||Object.keys(discovery).some(k=>!['mazeId','family','sourceId','discoveredDay','runSeed','runGeneration','locationId','manifestVersion','actorId','actorGeneration'].includes(k))||typeof discovery.mazeId!=='string'||!/^maze-[1-9]\d*$/.test(discovery.mazeId)||!int(+discovery.mazeId.slice(5),1,(s.mazeBook?.nextRun||Number.MAX_SAFE_INTEGER)-1)||typeof discovery.runSeed!=='string'||discovery.runSeed.length>400||!int(discovery.runGeneration,1,s.dynasty?.generation||5000)||discovery.family!=='signature'||discovery.locationId!==b.locationId||discovery.manifestVersion!==1||!(discovery.discoveredDay===null?discovery.actorId===null&&discovery.actorGeneration===null:validMazeActor(s,discovery.actorId)&&int(discovery.actorGeneration,1,s.dynasty?.generation||5000))||discovery.runSeed!==`${s.seed}:maze:${discovery.runGeneration}:regional:${discovery.sourceId}:${discovery.locationId}:${discovery.mazeId.slice(5)}`||discovery.sourceId!=='signature_'+d.regionId||!(discovery.discoveredDay===null||int(discovery.discoveredDay,b.introducedDay))||s.realm.sites[b.locationId]?.regionId!==d.regionId||!b.people.every((p,i)=>p.id===`boss-${b.id}-${i}`)))return false;
  if(discovery&&[s.maze,...(s.mazeBook?.records||[])].some(m=>m?.id===discovery.mazeId&&(!m.content||!sameMazeRun(discovery,m))))return false;
  for(const kind of ['archive','survey','contact'])if(b.leads[kind]!==null&&!validMazeBossProvenance(s,b,b.leads[kind],{lead:kind}))return false;
  for(const resolution of b.resolutions)if(!validMazeBossProvenance(s,b,resolution,{resolution:true}))return false;
 }
 if(!Array.isArray(r.properties)||r.properties.length>16||new Set(r.properties.map(p=>p.id)).size!==r.properties.length||!r.properties.every(p=>txt(p.id,180)&&txt(p.label,160)&&catalog.some(b=>b.id===p.bossId)&&['egg','lens','crown','cup_lead'].includes(p.kind)&&txt(p.ownerId,160)&&int(p.acquiredDay)&&[p.soldDay,p.returnedDay,p.lastUsedDay,p.pursuitDefeatedDay].every(d=>d===null||int(d))&&(p.pursuitUntil===null||int(p.pursuitUntil,0,10000000))))return false;
 return r.propertyBattle===null||!!r.properties.find(p=>p.id===r.propertyBattle.propertyId&&p.kind==='egg'&&p.soldDay===null&&p.returnedDay===null)&&r.propertyBattle.locationId===s.locationId;
}
