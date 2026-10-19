import { renderStatusReference } from './status-reference.js';
import { renderRepertoire } from './repertoire-ui.js';
import { actionCostDetails, renderActionCostHelp } from './action-costs.js';
import { renderCraftingWindow } from './crafting-ui.js';
import { interactionChoice, meetingShell, activityQuote, roleTitle } from './interaction-ui-v40.js';
import { innLedger } from './hospitality-v36.js';
import { shopAccessReason } from './trading.js';
import { renderTradeTable, renderMerchantMeeting } from './shop-ui.js';
import { regionalView, politicalActionRoom } from './regional-world-v33.js';
import { FAITHS } from './realm-content-v18.js';
import { settlementServices, serviceAccepts } from './world-services.js';
import { renderAvatar } from './avatar.js';
import { healthView } from './health.js';
const greetings={materials:'“Hides, cloth, timber, stone, ore and crystal. I supply the materials; the work steward handles jobs and commissions.”',court:'“Welcome to the court. We hear petitions here, and our clerk can explain the border dispute.”',envoy:'“I carry news from the regional court. What would you like to know?”',resistance:'“Keep your voice down. We are sheltering the people who survived. We need help before anyone tries the keep.”',archivist:'“Looking for something? Tell me what you would like to learn about.”',animals:'“They all need a good home. Would you like to meet them?”',guide:'“Looking for a place to start? I can tell you what needs doing around here.”',doctor:'“Come in. Tell me what hurts, and I’ll see what I can do.”',work:'“Looking for work? I can help you choose a trade, or find a job for the one you know.”',inn:'“There’s a quiet bed upstairs if you need one.”',smith:'“Let’s have a look at your tools. What do you need made?”',school:'“Pull up a chair. We can start with a lesson, or talk about your studies.”',mentor:'“Show me what you’ve learned. We’ll take it from there.”',faction:'“You’ve come to the right person. Ask your questions before you decide to join us.”',contracts:'“I’m hiring someone for a job. Here’s where I need you to go, and what I can pay.”',keeper:'“Welcome. Are you here for the shrine, or would you like a word?”',watch:'“What brings you to the watchhouse?”'};
export function renderLocalServices(s,roomId,ui){
 const {e}=ui,rows=settlementServices(s).filter(r=>r.roomId===roomId);
 return rows.length?`<section class="local-residents"><h3>People Here</h3><div class="local-service-list">${rows.map(r=>`<button type="button" class="nearby-person local-service-person" data-op="service-open" data-id="${e(r.id)}">${renderAvatar(r.person,{size:'small',age:r.person.age})}<span><strong>${e(r.name)}</strong><small>${e(roleTitle(r.role))}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div></section>`:'';
}
function simpleLabel(a,r){
 const fixed={health_clinic:'Let the Doctor Treat You',health_review:'Describe Your Symptoms',career_work:'Work a Shift',career_practice:'Practice Your Trade',career_invoice:'Hand Over the Finished Work',rest:'Rent a Room',school_attend:'Attend a Lesson',school_exam:'Take the Examination'};
 return fixed[a.id]||a.label;
}
/** Shared displayed offers, without opening a meeting or registering its person. */
export function serviceMeetingOffers(r,actions){
 let offers=actions.filter(a=>serviceAccepts(r,a.id)||a.objectiveServiceId===r.id);
 offers=offers.filter(a=>!a.disabledReason||!/Visit |Find someone/.test(a.disabledReason));
 if(r.kind==='work')offers=offers.filter(a=>!['work','choose_profession'].includes(a.id)&&!/^career_(batch_|specialty_|masterwork|public_work)/.test(a.id));
 if(r.kind==='school')offers=offers.filter(a=>!/school_(path|project_|dilemma)/.test(a.id));
 return offers;
}
export function renderServiceMeeting(s,id,actions,ui){
 const {e,button}=ui,r=settlementServices(s).find(r=>r.id===id&&r.here);if(!r)return '';
 if(s.age<3)return meetingShell(s,r,ui,{speech:`You watch the people here while your caregivers speak with ${r.name}. No decision is asked of you.`,choices:interactionChoice(ui,{label:'Return to watching','op':'service-close',quiet:true}),className:'observer-meeting'});
 if(r.kind==='merchant'||r.kind==='materials')return renderMerchantMeeting(s,r,ui);
 if(r.kind==='smith'&&ui.craftSession?.mode==='craft')return renderCraftingWindow(s,r,actions,ui);
 let offers=serviceMeetingOffers(r,actions);
 const commissions=r.kind==='work'?offers.filter(a=>a.id.startsWith('career_accept_')&&!a.disabledReason):[];
 offers=offers.filter(a=>!a.id.startsWith('career_accept_'));
 const professions=r.kind==='work'?offers.filter(a=>a.id.startsWith('career_choose_')):[];
 offers=offers.filter(a=>!professions.includes(a));
 const buttons=offers.map(a=>interactionChoice(ui,{label:simpleLabel(a,r),op:'activity',id:a.id,description:a.description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason})).join('');
 const choose=professions.length?`<form id="service-profession" class="service-profession"><label for="profession-choice">Which trade interests you?</label><select id="profession-choice" name="profession">${professions.map(a=>`<option value="${e(a.id)}" ${a.disabledReason?'disabled':''}>${e(a.label.replace(/^Choose |^Work as |^Become /,''))}${a.cost?' · '+a.cost+' Gold':''}</option>`).join('')}</select><button type="submit" class="button primary">Review This Trade</button><p class="small-copy">Reviewing is free. The review shows the actual time and fee before you begin. You can change trades later.</p></form>`:'';
 const conditionNames=[...healthView(s).physical,...healthView(s).mental].map(c=>c.name);
 const localFaith=FAITHS.find(f=>f.id===s.realm?.sites[s.locationId]?.faithId);
 const region=['court','envoy','resistance'].includes(r.kind)?regionalView(s):null;
 const regionalStatus=region?`<section class="regional-account"><h2>${e(region.regionName)}</h2><p>${e(region.government)} · ${e(region.title)} ${e(region.ruler)}</p><p>${e(region.custom)}</p><p>${e(region.tradition)}</p><p class="small-copy">Primary Faith: ${e(region.faith)}${region.capital?' · Court: '+e(region.capital.name):''}</p>${region.hold?`<p>${e(region.hold.controllerName)} occupies this settlement. Its households and original claim remain.</p>`:''}${region.wars.map(w=>`<article><h3>${e(w.phase==='stalemate'?'A War Without Resolution':'War on the Border')}</h3><p>${e(w.grievance)}</p><small>${Math.floor((s.day-w.startDay)/365)} Years · ${e(w.phase)} · Exhaustion ${w.exhaustion??'unknown'}</small></article>`).join('')}</section>`:'';
 const status=r.kind==='keeper'&&localFaith?`<h2>${e(localFaith.name)}</h2><p>${e(localFaith.doctrine)}</p><p class="small-copy">This shrine follows its own local tradition. Find other traditions in other settlements.</p>`:r.kind==='doctor'?`<p class="service-current-health">Health ${s.hero.hp} / ${s.hero.maxHp}${conditionNames.length?' · '+e(conditionNames.join(' · ')):''}</p><p class="small-copy">Treatment supports recovery from illness and injury. Healing potions restore Health; use them from Inventory.</p>`:r.kind==='work'?`<p class="service-current-health">Your Trade · ${e(s.hero.profession)}</p>`:r.kind==='contracts'?(()=>{const c=s.adventuring.contracts.find(c=>c.id===r.subjectId),dest=s.world.locations.find(p=>p.id===c?.destinationId);return c?`<p class="service-current-health">${e(dest?.name||'Unknown Destination')} · ${c.reward} Gold · ${e(c.status==='ready'?'Ready for Payment':c.status==='active'?'Job Accepted':'Work Available')}</p>`:'';})():'';
 if(r.kind==='inn'){
  if(ui.serviceTopic==='repertoire')return meetingShell(s,r,ui,{className:'inn-repertoire-meeting',speech:'“We can make room for an original recital. This is unpaid art, not a work shift. Your private manuscript stays yours unless you explicitly choose what may be heard or copied.”',details:renderRepertoire(s,offers,ui,{surface:'inn'}),choices:interactionChoice(ui,{label:'Ask About the Inn’s Other Services',op:'service-topic',id:'inn',quiet:true})+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true})});
  if(ui.shopSession?.vendor==='inn'&&ui.shopSession.mode==='trade')return `<section class="service-meeting inn-meeting">${renderTradeTable(s,ui.shopSession,ui)}</section>`;
  const heard=innLedger(s),rumor=heard.rumor,giver=rumor?.serviceId&&settlementServices(s).find(p=>p.id===rumor.serviceId&&p.here),room=offers.find(a=>a.id==='inn_room'),news=offers.find(a=>a.id==='inn_rumor');
  const reply=(a,label,description='')=>a?interactionChoice(ui,{label,op:'activity',id:a.id,description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason}):'';
  const choices=interactionChoice(ui,{label:'“What Food and Drink Are You Selling?”',op:'inn-browse',disabledReason:shopAccessReason(s,'inn')})+reply(room,'“I’d Like a Room.”','A night restores up to 20 Health, all Focus and eases 8 Stress.')+reply(news,'“Heard Any Rumors?”')+reply(offers.find(a=>a.id==='pastime_performance'),'“Could I Share Something I’ve Been Making?”','Share your music, story or artwork with an audience. Two days, with no booking fee.')+(s.age>=18?interactionChoice(ui,{label:'“Could We Arrange an Original Recital?”',op:'service-topic',id:'repertoire',description:'Open your manuscript book and optional three-inn circuit. No time or promise is taken by asking.'}):'')+offers.filter(a=>a.id.startsWith('repertoire_recall_')).map(a=>reply(a,a.label,'Discuss only the version this person actually heard. Ordinary conversation remains separate.')).join('')+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,quiet:true})+interactionChoice(ui,{label:'“That’s All, Thank You.”',op:'service-close',quiet:true});
  const after=rumor?`<aside class="inn-rumor"><span class="eyebrow">WORD AT THE INN · DAY ${heard.heardDay}</span><p>${e(rumor.text)}</p><div class="quick-actions">${giver?button('Speak to '+giver.name,'service-open',giver.id,'secondary small'):''}${rumor.destinationId?button('Find on Map','quest-location',rumor.destinationId,'ghost small'):''}</div></aside>`:'';
  return meetingShell(s,r,ui,{className:'inn-meeting',backLabel:'← Back to the Tavern',speech:'“Welcome in. There’s food at the counter, ale in the cellar and a bed upstairs. What can I get you?”',details:renderActionCostHelp(s,ui,'service-costs'),choices,after});
 }

 if(r.kind==='work'){
  const active=s.careers?.active,commissionStatus=active?`<section class="service-current-commission"><h2>Your Current Commission</h2><p>${e(active.goodName)} for ${e(active.customerName)}</p><p class="small-copy">${active.status==='ready'?'Finished · Ready to Hand Over':'Accepted · Work Still to Do'} · ${active.pay} Gold Base Payment · Due Day ${active.dueDay}</p></section>`:'';
  const materials=settlementServices(s).find(p=>p.kind==='materials'),inquiring=ui.serviceTopic==='commissions';
  if(inquiring){
   const speech=active?'“You already have a commission in hand. Let’s finish that promise, or speak about releasing it, before taking another.”':commissions.length?'“These are the commissions available for your trade. Look over each customer’s terms before you agree to anything.”':s.careers?.batch?'“Finish or release your current work commitment first. Then we can look for a commission.”':s.age<16?'“Commissions open at sixteen. For now, a teacher can help you prepare for a trade.”':'“I have no commissions available for you right now. Check with me again in a later season.”';
   const current=active?offers.filter(a=>/^career_(make_|invoice$|abandon$)/.test(a.id)):commissions;
   const replies=current.map(a=>interactionChoice(ui,{label:simpleLabel(a,r),op:'activity',id:a.id,description:a.description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason})).join('');
   const choices=replies+interactionChoice(ui,{label:'Ask About Other Work',op:'service-topic',id:'work',quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true});
   return meetingShell(s,r,ui,{speech,details:status+commissionStatus+renderActionCostHelp(s,ui,'service-costs'),choices,className:'work-commission-meeting'});
  }
  const choices=interactionChoice(ui,{label:'“Any Commissions Available?”',op:'service-topic',id:'commissions',description:'Hear the available work before accepting anything. Asking takes no time or Gold.'})+buttons+(materials?interactionChoice(ui,{label:'Visit the Materials Merchant',op:'activity-visit',id:materials.id,description:`${materials.name} sells hides and other crafting supplies at the Market. Walking there takes no days.`,quiet:true}):'')+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,description:'Stay awhile and speak together.',quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true});
  return meetingShell(s,r,ui,{speech:greetings.work,details:status+commissionStatus+choose+renderActionCostHelp(s,ui,'service-costs'),choices,className:'work-meeting'});
 }
 if(r.kind==='smith'){const choices=offers.filter(a=>a.factionObjective||a.researchObjective).map(a=>interactionChoice(ui,{label:a.label,op:'activity',id:a.id,description:a.description,meta:activityQuote(a,s),costDetails:actionCostDetails(s,a),disabledReason:a.disabledReason})).join('')+interactionChoice(ui,{label:'“Show Me the Workbench.”',op:'craft-browse',description:'Browse equipment, construction and patterns. Review materials, skill and costs before beginning.'})+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true});return meetingShell(s,r,ui,{speech:greetings.smith,choices,className:'craftsperson-meeting'});}
 if(r.kind==='archivist'&&!offers.length){
  const teachers=settlementServices(s).filter(p=>p.kind==='school'&&p.here),schoolShortcut=s.age<18||s.education?.enrolled;
  const details=`<p class="archive-availability">${teachers.length?'A teacher is here in the School & Archive. Leave this conversation to ask about lessons.':schoolShortcut?'No teacher is currently offering lessons here. Work & School helps you find teachers at their actual locations.':'No teacher is currently offering lessons here. To enroll, visit a teacher at their school.'}</p>`;
  const choices=interactionChoice(ui,{label:'Open Activities',op:'tab',id:'activities',description:(schoolShortcut?'Choose Work & School for learning contacts.':'Choose Work & School to find a work steward.')+' Looking does not spend time or enroll you.'})+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,description:'Stay awhile and speak together.',quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true});
  return meetingShell(s,r,ui,{speech:'“I have no records available for you to investigate right now.”',details,choices,className:'archive-empty-meeting'});
 }
 const materialStatus=r.kind==='materials'?'<p class="small-copy">Each bundle contains 3 units and takes 1 day to collect. Supplies go into Inventory for crafting and commissions.</p>':'';
 const choices=buttons+interactionChoice(ui,{label:'Talk About Something Else',op:'spatial-contact',id:r.personId,description:'Stay awhile and speak together.',quiet:true})+interactionChoice(ui,{label:'Leave',op:'service-close',quiet:true});
 return meetingShell(s,r,ui,{speech:greetings[r.kind]||'“Hello. What can I do for you?”',details:regionalStatus+status+(r.kind==='doctor'?renderStatusReference(s,ui,{context:'doctor'}):'')+choose+materialStatus+renderActionCostHelp(s,ui,'service-costs'),choices});
}
