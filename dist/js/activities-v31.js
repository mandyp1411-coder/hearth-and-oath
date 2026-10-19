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

export const ACTIVITY_TABS=[['daily','Everyday'],['work','Work & School'],['recovery','Recovery'],['training','Training'],['fun','Social & Fun'],['crime','Crime & Mischief']];
export function compactActivityRows(actions,ui,s=null){if(!actions.length)return '';return `<div class="compact-activities interaction-options">${actions.map(a=>interactionChoice(ui,{label:a.label,op:'activity',id:a.id,description:a.description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason})).join('')}</div>`;}
export function renderActivities(s,ui,{pane='daily',ongoing=''}={}){
 const {e,button,chapter}=ui;if(!ACTIVITY_TABS.some(t=>t[0]===pane))pane='daily';const all=getActions(s),services=settlementServices(s);
 const tabs=`<nav class="activity-tabs" aria-label="Activities">${ACTIVITY_TABS.map(([id,label])=>button(label,'activities-pane',id,'ghost small',false,pane===id)).join('')}</nav>`;
 const blocked=Boolean(s.event||s.battle||s.conversations?.pending||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite||s.dungeon||s.maze);
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
 if(pane==='work')content=`<p class="activity-intro">${s.age<18?'Visit a teacher for lessons or a steward for available work.':s.hero.profession==='Unemployed'?'Visit a work steward to find employment.':'Your profession: '+e(s.hero.profession)+(s.hero.profession==='Scholar'&&ownedHomeHere(s)?'. Copy and research at your own home, or visit a steward for commissions.':'. Go to your workplace for shifts and commissions.')}</p>${shortcuts(s.age<18?(s.hero.profession!=='Unemployed'?['school','work']:['school']):s.education?.enrolled?['school','work']:['work'])}${s.age<18||s.education?.enrolled?schoolShortcuts():''}${s.hero.profession==='Scholar'&&ownedHomeHere(s)&&(s.cartography?.interior?.roomId==='homes')?compactActivityRows(all.filter(a=>a.id==='career_work').map(a=>({...a,label:'Copy and Research at Home'})),ui,s):''}${ongoing}`;
 else if(pane==='recovery'){const v=travelEnergyView(s),homeReason=ownedHomeHere(s)?homeRestReason(s,{visiting:true}):null,home=ownedHomeHere(s)?interactionChoice(ui,{label:'Go Home and Rest',op:'activity-home',meta:activityQuote({days:1,cost:0},s),costDetails:actionCostDetails(s,{days:1,cost:0}),description:'Rest in your own bed to restore all Focus and ease 8 Stress.',disabledReason:homeReason}):'';content=`<p class="activity-intro">Health ${s.hero.hp}/${s.hero.maxHp} · Focus ${v.focus}/${v.max}. Rest at home, visit the doctor, use supplies in Inventory, or make camp on your journey.</p>${renderStatusReference(s,ui,{context:'recovery'})}${home}${shortcuts(['doctor','inn'])}${compactActivityRows(all.filter(a=>a.id==='trail_camp'||/^health_(rest|support|routine)$/.test(a.id)),ui,s)}${recoveryPanel(s,ui)}${ongoing}`;}
 else if(pane==='training')content=renderTournamentCard(s,ui,all,{potionReason:consumableReason(s,'potions')})+compactActivityRows(all.filter(a=>a.id==='tournament_invite'),ui,s)+compactActivityRows(all.filter(a=>/^(yard_|train$|life_exercise$|grow_(weapons|defense|arcana|stealth|survival)|rpg_practice_|rpg_train_)/.test(a.id)),ui,s)+shortcuts(s.age>=18?['watch','mentor']:['mentor']);
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
