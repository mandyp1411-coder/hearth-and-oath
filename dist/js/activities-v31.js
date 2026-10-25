import { recoveryPanel } from './life-ui.js';
import { renderRunestones } from './runestone-ui.js';
import { renderTournamentCard } from './adult-tournament-ui.js';
import { renderStatusReference } from './status-reference.js';
import { renderRepertoire } from './repertoire-ui.js';
import { actionCostDetails, renderActionCostHelp } from './action-costs.js';
import { interactionChoice, activityQuote } from './interaction-ui-v40.js';
import { getActions, exploreTravelPreview, consumableReason } from './engine.js';
import { settlementServices } from './world-services.js';
import { travelEnergyView } from './travel-energy.js';
import { MISDEEDS, crimeCheck } from './daylife-v35.js';
import {ownedHomeHere,homeRestReason} from './home-recovery-v38.js';
import {personalServicesPanel} from './personal-services.js';
import { schoolingView } from './schooling.js';
import { guildView } from './guild.js';
import { battlecraftPanel, bestiaryPanel } from './field-ui.js';

/** The second slice of schooling on the school page: the institution, the studies, the bench, the two from the bench beside you, and what the examinations made you. */
export function schoolingPanel(game,e){
  const v=schoolingView(game); if(!v) return '';
  const parts=[];
  if(v.institution){const i=v.institution;parts.push(`<div class="schooling-row"><span class="eyebrow">${e(i.label.toUpperCase())}</span><p>${e(i.major)}, year ${i.year} of ${i.years}. ${i.lessons} lectures heard.${i.degree?` Degree taken at ${i.degree.age}, grade ${i.degree.grade}.`:i.scholarship?' The scholarship pays.':i.patron?` ${e(i.patron.kind==='house'?'The house pays.':i.patron.name+' pays the fee.')}`:''} The lectures are given in ${e(game.world.locations.find(l=>l.id===i.locationId)?.name||'the capital')}.</p></div>`);}
  if(v.bond){const b=v.bond;parts.push(`<div class="schooling-row"><span class="eyebrow">THE BOND</span><p>${e(b.done?`Three years served under ${b.master}. You are a journeyman ${b.craft}.`:b.broken?`Bound to ${b.master} and ${b.broken.how==='paid'?'bought back':'broken, with the yard watching'}.`:`Bound to ${b.master}'s bench as a ${b.craft}'s apprentice, ${b.yearsLeft} year${b.yearsLeft===1?'':'s'} of the three to serve. ${b.lessons} days at the bench so far.`)}</p></div>`);}
  if(v.credentials.length)parts.push(`<div class="schooling-row"><span class="eyebrow">WHAT THE EXAMINATIONS MADE YOU</span><div class="qualification-list">${v.credentials.map(c=>`<span class="badge">${e(c.kind==='journeyman'?`Journeyman ${c.major}`:`${c.label[0].toUpperCase()}${c.label.slice(1)} · ${c.majorLabel}`)}</span>`).join('')}</div></div>`);
  if(v.studies.length)parts.push(`<div class="schooling-row"><span class="eyebrow">STUDIES</span><div class="qualification-list">${v.studies.map(s=>`<span class="badge ${s.fading?'muted':''}" title="${s.fading?'Fading for want of use':'Kept up'}">${e(s.label)} ${s.level}${s.fading?' ↓':''}</span>`).join('')}</div></div>`);
  if(v.classmates.length)parts.push(`<div class="schooling-row"><span class="eyebrow">THE BENCH</span>${v.classmates.map(c=>`<p><strong>${e(c.name)}</strong>, ${e(c.nature)}, ${c.age}. ${e(c.fate?(c.fate.told==='late'?c.fate.late:c.fate.early).replace(/^/,c.name+' '):c.contests.length?`${c.contests.filter(x=>x.won).length} prize${c.contests.filter(x=>x.won).length===1?'':'s'} to you, ${c.contests.filter(x=>!x.won).length} to them.`:`Sits beside you in ${c.subjectLabel.toLowerCase()}.`)}${c.standing>=2?' They think well of you.':c.standing<=-2?' They have not forgiven you.':''}</p>`).join('')}</div>`);
  return parts.length?`<div class="schooling-panel">${parts.join('')}</div>`:'';
}


/** The guild on the school page: the rolls, the dues, the hall's work, the road years, the people at the hall, and what the hall remembers. */
export function guildPanel(game,e){
  const v=guildView(game); if(!v) return '';
  const parts=[], m=v.member;
  if(m){
    parts.push(`<div class="schooling-row"><span class="eyebrow">${e(m.name.replace(/^the /,'').toUpperCase())}</span><p>${e(`${m.rank[0].toUpperCase()}${m.rank.slice(1)}, ${m.years<1?'this year':m.years+' year'+(m.years===1?'':'s')} on the rolls, ${{born:'born to it',apprenticed:'by the master’s word',bought:'bought in',recruited:'at the hall’s asking',inherited:'by the name in the old book'}[m.how]}. The hall keeps its rolls at ${m.seat}. Your standing there is ${m.standingWord}.${m.dues?` Dues ${m.dues} gold a season${m.arrears?`, ${m.arrears} owed`:''}.`:' No dues at your rank.'}`)}</p>${m.rank==='journeyman'?`<p>${e(m.wander.done?'The road years are served.':`The road years: ${m.wander.seasons} of ${m.wander.need} seasons served in other regions’ halls.`)}${m.masterpiece?e(` ${m.masterpiece.name[0].toUpperCase()}${m.masterpiece.name.slice(1)}: ${m.masterpiece.judged?'looked at and refused':'waiting on the wardens'}.`):''}</p>`:''}${m.assignment?`<p>${e(`The hall’s work: ${m.assignment.what} at ${m.assignment.place}, ${m.assignment.pay} gold.${m.assignment.overdue?' Overdue.':''}`)}</p>`:''}</div>`);
    parts.push(`<div class="schooling-row"><span class="eyebrow">THE HALL</span><p><strong>${e(m.warden)}</strong>, ${e(m.rank==='warden'||m.rank==='guildmaster'?'yourself, warden':'warden')}.${m.sponsor?` <strong>${e(m.sponsor)}</strong>, whose ${m.how==='inherited'?'name':'word'} put you on the rolls.`:''}${m.rival?` <strong>${e(m.rival.name)}</strong> at the next bench: ${m.rival.won} prize${m.rival.won===1?'':'s'} to you, ${m.rival.lost} to them.`:''}${m.apprentice?` <strong>${e(m.apprentice.name)}</strong>, your apprentice, ${m.apprentice.years<1?'new to the bench':m.apprentice.years+' year'+(m.apprentice.years===1?'':'s')+' at it'}.`:''}</p></div>`);
  } else if(v.heir) parts.push(`<div class="schooling-row"><span class="eyebrow">THE OLD BOOK</span><p>${e(`${v.heir.from}’s name is on the rolls of ${v.heir.name}. Take up the trade and the hall will find it.`)}</p></div>`);
  else if(v.family) parts.push(`<div class="schooling-row"><span class="eyebrow">THE FAMILY’S TABLE</span><p>${e(`The family has a name at ${v.family.name}. Take up the trade and it is yours.`)}</p></div>`);
  if(v.past.length) parts.push(`<div class="schooling-row"><span class="eyebrow">STRUCK OUT</span>${v.past.map(p=>`<p>${e(`${p.name[0].toUpperCase()}${p.name.slice(1)}: ${p.rank}, ${p.left==='expelled'?'struck from the rolls':'walked out'}.`)}</p>`).join('')}</div>`);
  const memories=v.threads.flatMap(t=>t.memory).concat(v.history.map(h=>h.text)).slice(-4);
  if(memories.length&&m) parts.push(`<div class="schooling-row"><span class="eyebrow">WHAT THE HALL REMEMBERS</span>${memories.map(x=>`<p>${e(x)}</p>`).join('')}</div>`);
  return parts.length?`<div class="schooling-panel guild-panel">${parts.join('')}</div>`:'';
}

export const ACTIVITY_TABS=[['daily','Everyday'],['work','Work & School'],['recovery','Recovery'],['training','Training'],['fun','Social & Fun'],['crime','Crime & Mischief']];
export function compactActivityRows(actions,ui,s=null){if(!actions.length)return '';return `<div class="compact-activities interaction-options">${actions.map(a=>interactionChoice(ui,{label:a.label,op:'activity',id:a.id,description:a.description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason})).join('')}</div>`;}
/** The institutions of the capitals and the bond are not a teacher's room: their actions sit here, under Work & School. */
/** The hall's own actions sit under Work & School too: the rolls, the dues, the hall's work, the road, the masterpiece. */
function guildBlock(all,ui,s){
  const rows=all.filter(a=>/^guild_/.test(a.id));
  if(!rows.length)return '';
  return `<div class="capitals-block guild-block"><p class="activity-intro">${ui.e(s.guild?.member?'The hall has you on its rolls.':'The hall keeps its rolls at the capital.')}</p>${compactActivityRows(rows,ui,s)}</div>`;
}
function capitalsBlock(all,ui,s){
  const rows=all.filter(a=>/^school_(sit_|place_|read_|lecture$|degree$|break_bond$)/.test(a.id));
  if(!rows.length)return '';
  return `<div class="capitals-block"><p class="activity-intro">${ui.e(s.education?.schooling?.institution&&!s.education.schooling.institution.degree?'The institution has you on its rolls. The lectures are given in the capital.':s.education?.schooling?.bond&&!s.education.schooling.bond.done&&!s.education.schooling.bond.broken?'The bond has years left in it.':'The institutions of the capitals examine at their doors.')}</p>${compactActivityRows(rows,ui,s)}</div>`;
}
export function renderActivities(s,ui,{pane='daily',ongoing=''}={}){
 const {e,button,chapter}=ui;if(!ACTIVITY_TABS.some(t=>t[0]===pane))pane='daily';const all=getActions(s),services=settlementServices(s);
 const tabs=`<nav class="activity-tabs" aria-label="Activities">${ACTIVITY_TABS.map(([id,label])=>button(label,'activities-pane',id,'ghost small',false,pane===id)).join('')}</nav>`;
 const blocked=Boolean(s.event||s.battle||s.conversations?.pending||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite||s.maze);
 const nearby=kind=>{
  const matches=r=>r.kind===kind&&(kind!=='school'||r.subjectId===(s.education?.route||'community'));
  const local=services.filter(matches);if(local.length&&!s.cartography?.offsite)return {rows:local,local:true};
  const destinations=Object.keys(s.cartography?.sites||{}).map(siteId=>({siteId,preview:exploreTravelPreview(s,siteId)})).filter(d=>!d.preview.disabledReason).sort((a,b)=>a.preview.days-b.preview.days);
  for(const d of destinations){const rows=settlementServices(s,{siteId:d.siteId}).filter(matches);if(rows.length)return {rows:[rows[0]],local:false,days:d.preview.days};}
  return {rows:[],local:false};
 };
 const shortcuts=kinds=>kinds.map(kind=>{const found=nearby(kind),rows=kind==='school'?found.rows.filter(r=>r.subjectId===(s.education?.route||'community')).slice(0,1):found.rows.slice(0,1);return rows.map(r=>{
  const place=s.world.locations.find(p=>p.id===r.locationId),label=kind==='work'?(s.hero.profession!=='Unemployed'?'Go to Work — '+s.hero.profession:'Visit Local Steward'):kind==='doctor'?'Visit Local Doctor':kind==='inn'?'Visit the Innkeeper':kind==='school'?'Talk to Teacher':r.role;
  return interactionChoice(ui,{label:found.local?label:'Travel to '+label,op:found.local?'activity-visit':'activity-route',id:found.local?r.id:r.locationId,meta:r.name+' · '+place.name+(found.local?'':' · '+found.days+' Days Away'),description:found.local?'':'Review the journey on your map. The visit begins after you arrive.',disabled:found.local&&blocked});
 }).join('')||`<p class="activity-empty">${kind==='school'?'Your teacher is away.':'No '+(kind==='doctor'?'doctor':kind==='work'?'steward':kind==='inn'?'innkeeper':'mentor')+' is within reach on your map.'} ${s.event||s.battle||s.conversations?.pending?'Finish the current moment first.':'Find more inhabited places as you travel.'}</p>`;}).join('');
 const schoolShortcuts=()=>{
  const teacher=services.find(r=>r.kind==='school'&&r.subjectId===(s.education?.route||'community'));
  if(!teacher||!s.education?.enrolled||s.cartography?.offsite)return '';
  const study=all.find(a=>a.id==='grow_read')||all.find(a=>a.id==='study');
  return `<div class="school-shortcuts interaction-options" role="group" aria-label="School Activities">${[['Attend Class','school_attend'],['Study',study?.id]].filter(r=>r[1]).map(([label,id])=>{const a=all.find(a=>a.id===id),reason=a?.disabledReason;return interactionChoice(ui,{label,op:'activity-school',id:teacher.id+'|'+id,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabled:blocked||!a||Boolean(reason&&!/^Visit /.test(reason)),disabledReason:reason&&!/^Visit /.test(reason)?reason:''});}).join('')}</div>`;
 };

 const pairs=renderRunestones(s,ui,all);
 let content='';
 if(pane==='work')content=`<p class="activity-intro">${s.age<18?'Visit a teacher for lessons or a steward for available work.':s.hero.profession==='Unemployed'?'Visit a work steward to find employment.':'Your profession: '+e(s.hero.profession)+(s.hero.profession==='Scholar'&&ownedHomeHere(s)?'. Copy and research at your own home, or visit a steward for commissions.':'. Go to your workplace for shifts and commissions.')}</p>${shortcuts(s.age<18?(s.hero.profession!=='Unemployed'?['school','work']:['school']):s.education?.enrolled?['school','work']:['work'])}${s.age<18||s.education?.enrolled?schoolShortcuts():''}${capitalsBlock(all,ui,s)}${schoolingPanel(s,e)}${guildBlock(all,ui,s)}${guildPanel(s,e)}${s.hero.profession==='Scholar'&&ownedHomeHere(s)&&(s.cartography?.interior?.roomId==='homes')?compactActivityRows(all.filter(a=>a.id==='career_work').map(a=>({...a,label:'Copy and Research at Home'})),ui,s):''}${ongoing}`;
 else if(pane==='recovery'){const v=travelEnergyView(s),homeReason=ownedHomeHere(s)?homeRestReason(s,{visiting:true}):null,home=ownedHomeHere(s)?interactionChoice(ui,{label:'Go Home and Rest',op:'activity-home',meta:activityQuote({days:1,cost:0},s),costDetails:actionCostDetails(s,{days:1,cost:0}),description:'Rest in your own bed to restore all Focus and ease 8 Stress.',disabledReason:homeReason}):'';content=`<p class="activity-intro">Health ${s.hero.hp}/${s.hero.maxHp} · Focus ${v.focus}/${v.max}. Rest at home, visit the doctor, use supplies in Inventory, or make camp on your journey.</p>${renderStatusReference(s,ui,{context:'recovery'})}${home}${shortcuts(['doctor','inn'])}${compactActivityRows(all.filter(a=>a.id==='trail_camp'||/^battlecraft_treat_/.test(a.id)||/^health_(rest|support|routine)$/.test(a.id)),ui,s)}${recoveryPanel(s,ui)}${ongoing}`;}
 else if(pane==='training')content=renderTournamentCard(s,ui,all,{potionReason:consumableReason(s,'potions')})+compactActivityRows(all.filter(a=>a.id==='tournament_invite'),ui,s)+compactActivityRows(all.filter(a=>/^(yard_|train$|life_exercise$|grow_(weapons|defense|arcana|stealth|survival)|rpg_practice_|rpg_train_|battlecraft_learn_|battlecraft_read_bestiary)/.test(a.id)),ui,s)+battlecraftPanel(s,ui.e)+bestiaryPanel(s,ui.e)+shortcuts(s.age>=18?['watch','mentor']:['mentor']);
 else if(pane==='crime'){
  content=`<p class="activity-intro">Choose an act and someone who is here. Your attributes add to a d20; a 1 fails and a 20 succeeds. The watch can investigate reported crimes.</p><div class="crime-choices">${MISDEEDS.map(c=>{const rows=all.filter(a=>a.crime===c.id),check=crimeCheck(s,c),crimeLabel=c.id==='theft'?'Pickpocket':c.label;return `<details class="crime-option" data-disclosure="crime:${c.id}"><summary><strong>${e(crimeLabel)}</strong><span>${s.age<c.age?'Age '+c.age+'+':check.chance+'% · d20 + '+check.bonus+' / '+check.dc}</span></summary>${s.age<c.age?`<p>Available from age ${c.age}.</p>`:rows.length?`<form class="crime-attempt" data-crime-form="${c.id}"><label><span>Someone Here</span><select name="crimeAction" aria-label="${e(crimeLabel)} target">${rows.map(a=>`<option value="${e(a.id)}"${a.disabledReason?' disabled':''}>${e(a.label.split(' — ').slice(1).join(' — '))}</option>`).join('')}</select></label><p>${e(rows[0].description)}</p>${rows.every(a=>a.disabledReason)?`<p class="disabled-reason">${e(rows[0].disabledReason)}</p>`:''}<button type="submit" class="button secondary small"${rows.every(a=>a.disabledReason)?' disabled':''}>${e(crimeLabel)}</button></form>`:'<p>No eligible person is in this area. Walk through a settlement to find people.</p>'}</details>`;}).join('')}</div>`;
  const propertyThefts=all.filter(a=>a.id==='justice_steal'||a.id==='justice_burglary');
  if(propertyThefts.length)content+=`<details class="crime-option property-theft-options" data-disclosure="crime:property"><summary><strong>Stall &amp; Household Property</strong></summary><p class="small-copy">These longer attempts use stealth and agility against the merchant’s existing guards, not the pickpocket d20 above. A stolen weapon remains real equipment with its original owner recorded.</p>${compactActivityRows(propertyThefts,ui,s)}</details>`;
  const plannedJob=all.filter(a=>a.id.startsWith('justice_job_'));
  if(plannedJob.length)content+=`<details class="crime-option property-theft-options" data-disclosure="crime:counting-table"><summary><strong>Planned Counting-Table Job</strong></summary><p class="small-copy">One finite adult opportunity. Its three approaches need different actual information and have separately quoted approach and departure chances, not the pickpocket d20 above. Reading accepts nothing; only a successful final departure gives the exact stolen silver. No instant Gold payout.</p>${compactActivityRows(plannedJob,ui,s)}</details>`;
 }
 else if(pane==='fun'){
  const groups=[['Time for Yourself',all.filter(a=>/^(leisure_(walk|outdoors|sketch|picnic)|pastime_(interest|practice))$/.test(a.id))],['At the Tavern',all.filter(a=>/^leisure_(music|meal|boardgames|drink)$/.test(a.id))],['With Your Circle',all.filter(a=>a.id==='leisure_circle')],['Games',all.filter(a=>/^fun_(pairs$|dice_)/.test(a.id))]];
  content=`<p class="activity-intro">Stress ${s.life.stress}/100 · Take a day for yourself. Every outing shows its time, cost and effect.</p>${renderStatusReference(s,ui,{context:'fun'})}${(s.cartography?.interior?.roomId||'gate')!=='tavern'?shortcuts(['inn']):''}<div class="leisure-groups">${groups.filter(([,rows])=>rows.length).map(([label,rows])=>`<section class="leisure-group"><h3>${e(label)}</h3>${compactActivityRows(rows,ui,s)}</section>`).join('')}</div>${s.socialLife?.game?button("Resume Runestone Pairs","runestone-resume","","secondary"):""}${renderRepertoire(s,all,ui)}${pairs}${s.repertoire?.project?'':ongoing}`;
 }

 else content=compactActivityRows(all.filter(a=>a.id==='rpg_intrigue_open'),ui,s)+compactActivityRows(all.filter(a=>/^leisure_(walk|read|circle)$/.test(a.id)||s.age<12&&/^grow_(play|nursery)$/.test(a.id)||a.id==='pastime_petcare'),ui,s)+personalServicesPanel(s,all,ui)+ongoing;
 if(!content)content='<p class="activity-empty">Other activities open as you grow and explore. Finish any waiting moment first.</p>';
 return chapter('Activities','Make something of your day.','YOUR DAY')+`<div class="activities-simple">${tabs}${renderActionCostHelp(s,ui,'activity-costs')}<section class="activity-category" aria-label="${e(ACTIVITY_TABS.find(t=>t[0]===pane)[1])}" data-activity-category="${pane}">${content}</section></div>`;
}
