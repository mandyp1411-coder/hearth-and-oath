// One opt-in, role-flexible local story. Integration supplies the existing RPG
// project clock, contact factory and service writer; no global timers or RNG.
export const INTRIGUE_TITLE = 'The Winter Levy';
const action=(id,label,description,reason)=>({id:'rpg_intrigue_'+id,label,description,days:0,cost:0,group:'Personal stories',...(reason?{disabledReason:reason}:{})});
const choice=(id,label,description,reason)=>({id,label,description,...(reason?{disabledReason:reason}:{})});
const locate=(s,id)=>s.world.locations.find(p=>p.id===id);
const openSite=(s,id)=>{const p=locate(s,id);return p&&!['destroyed','evacuated'].includes(p.status)&&p.servicesAvailable!==false;};
const contact=(s,id)=>s.rpg.contacts.find(p=>p.id===id&&p.alive!==false);
const busy=s=>s.timeline?.journey||s.timeline?.yearTarget!=null||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.life?.plan||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.conversations?.project;
const eligible=s=>!busy(s)&&s?.rpg&&s.age>=18&&s.phase==='adult'&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.cartography?.pending&&!s.cartography?.offsite&&!s.justice?.prison&&!s.rpg.project;
const routeLabels={scholar:'Compare the papers at your own table',bard:'Earn a place at the levy supper',criminal:'Find the service entrance after closing'};
const outcomes={
 scholar:{correct:'The charter exempts seed grain. The new demand charges it twice. The clerk signs your comparison beside the matching receipt numbers.',wrong:'You compare the grand total, but it includes unrelated wool duties. The clerk explains the mismatch and returns the papers; this is not proof of a forged levy.'},
 bard:{correct:'You repeat the harmless refrain at supper. The factor interrupts: “I doubled the seed levy. Exemptions do not pay my watchmen.” The clerk hears the admission and agrees to repeat those exact words at a hearing.',wrong:'You name the accused in a comic verse. The room goes quiet. The factor leaves before discussing the circular; a provocative song is not evidence.'},
 criminal:{correct:'You follow the flour prints to a loose shelf board. The hidden duplicate carries the factor’s corrections to the levy, but no witness can explain how you obtained it.',wrong:'You force the polished strongbox. It contains ordinary payroll. A porter sees the damage and the watch receives an account of the break-in; there is no useful levy proof.'},
};
function record(s,ctx,text){s.notice=text;(ctx.journalLiteral||ctx.journal)?.(INTRIGUE_TITLE,text,'rpg',{narrativeEdition:30});}
function setScene(s,ctx,stage,title,body,choices){
 s.rpg.intrigue.pending=stage;
 ctx.setEvent('rpg_intrigue',title,INTRIGUE_TITLE,body,choices);
}
export function intrigueActions(s,{settled=false}={}){
 if(!eligible(s))return [];
 const a=s.rpg.intrigue;
 if(!a)return s.rpg.contacts.length<=126&&settled&&openSite(s,s.locationId)?[action('read','Ask about the winter levy','A clerk has received two different demands for the same grain. Read the request before deciding whether to get involved.')]:[];
 if(!['offered','active'].includes(a.status))return [];
 if(a.stage===0)return [action('open','The Winter Levy: choose an approach','Read the clerk’s request again. No profession is required; this is a choice of method, not a permanent class.')];
 if(a.stage===1)return [action('open','The Winter Levy: examine the clue','Consider the clue you earned. No extra day or gold is charged.')];
 if(a.stage===2)return [action('open','The Winter Levy: a private offer',`A letter returns on day ${a.nextDay}. Other activities remain available.`,s.day<a.nextDay?`Wait until day ${a.nextDay}.`:null)];
 return [];
}
function currentCast(s,a){return {factor:contact(s,a.factorId),clerk:contact(s,a.clerkId)};}
export function openIntrigue(s,ctx,{makeContact,settled=false}={}){
 if(!intrigueActions(s,{settled}).some(a=>!a.disabledReason))return false;
 if(!s.rpg.intrigue){
  const factor=makeContact('levy-factor','Levy Factor'),clerk=makeContact('levy-clerk','Grain Clerk');
  s.rpg.intrigue={version:1,status:'offered',stage:0,locationId:s.locationId,factorId:factor.id,clerkId:clerk.id,factorName:factor.name,clerkName:clerk.name,route:null,proof:null,clueChoice:null,startedDay:s.day,nextDay:s.day,pending:null,ending:null,history:[]};
 }
 const a=s.rpg.intrigue,{factor,clerk}=currentCast(s,a),place=locate(s,a.locationId)?.name||'the recorded settlement';
 if(!factor||!clerk||!openSite(s,a.locationId)){
  a.status='closed';a.pending=null;a.ending='interrupted';
  const text='The people or settlement needed for this levy dispute are no longer available. Your collected papers remain in the record; no living person is silently replaced and no reward is paid.';a.history.push({day:s.day,choice:'interrupted',text});record(s,ctx,text);return true;
 }
 if(a.stage===0){
  setScene(s,ctx,'approach','Two demands, one harvest',`${a.clerkName} sends a folded circular from ${place}. The millers have already surrendered their winter grain, yet ${a.factorName} now asks them to pay again. “My mother keeps a seed jar behind the stove,” the clerk writes. “If they take that too, what does she plant?” The factor says the first demand was only a draft. The clerk remembers a signature but cannot place it. The factor has watchmen who have not been paid since the thaw, and a council patron promising a better office if the levy succeeds. “A hungry guard is someone else’s soldier,” the factor is fond of saying.\n\nYou need not become an adventurer to help. The clerk can send copies to your table; a performer may reach the levy supper; someone comfortable with hidden doors might seek the original. None of these methods binds you to a profession.`,[
   choice('scholar',routeLabels.scholar,'3 actual days. Free copies by correspondence; no travel or skill threshold.'),
   choice('bard',routeLabels.bard,'2 actual days. An unpaid performance gets you a seat; attend in '+place+'.',s.locationId!==a.locationId?'Return to '+place+' for the supper.':null),
   choice('criminal',routeLabels.criminal,'1 actual day. Enter without permission in '+place+'. A careless approach may leave a witness.',s.locationId!==a.locationId?'Return to '+place+' to inspect the service door.':null),
   choice('later','Put the letter aside','No time or fee. Return when you choose.'),choice('decline','Decline the request','Close this story without accepting work or receiving a reward.'),
  ]);return true;
 }
 if(a.stage===1){
  const scenes={
   scholar:['Margins and measures',`The charter says “seed grain: exempt.” Receipt 18 lists seed grain as paid. The second demand lists the same seed grain, receipt 18, with a second charge. Wool has a separate seasonal duty. The clerk asks which comparison belongs in a signed correction.`,[['correct','Match receipt 18 to the seed-grain exemption','Use the repeated item and its governing rule.'],['wrong','Compare the grand totals including wool','Treat every duty on the page as part of one charge.']]],
   bard:['The missing verse',`At supper, ${a.factorName} insists nobody read the draft. In the kitchen you heard a tune whose last line was “twice for seed and once for snow.” The clerk says that line appears only on the disputed circular. The factor knows every old harvest song and has been complaining about unpaid guards. Can you invite them to explain the seed charge in front of the clerk, rather than accuse them in a song?`,[['correct','Leave the refrain unfinished, then ask why seed is charged twice','Let the factor explain their own decision before a willing witness.'],['wrong','Name the factor as a thief in the final verse','Make a public accusation before establishing what happened.']]],
   criminal:['Flour on the threshold',`The strongbox has been polished clean. Flour prints instead lead from the counting desk to a loose shelf board; a corner of grain paper protrudes beneath it. A porter is turning toward the corridor. You have time for one careful move.`,[['correct','Lift the loose shelf board','Follow the physical clue rather than the expensive lock.'],['wrong','Force the strongbox','Break a conspicuous lock while the porter approaches.']]],
  };
  const [title,body,options]=scenes[a.route];
  setScene(s,ctx,'clue',title,body,options.map(c=>choice(...c)).concat(choice('later','Leave the decision for later','The same clue remains saved.')));return true;
 }
 if(a.stage===2){
  const evidence=a.proof?{signed:'Your signed comparison names the repeated receipt and its exemption.',witness:'The clerk will repeat the factor’s admission in a hearing.',stolen:'You hold the corrected duplicate, but cannot offer a lawful witness to its removal.'}[a.proof]:'You have suspicions, but no verified proof. A public accusation is not available.';
  setScene(s,ctx,'settlement','A patron wants silence',`${a.factorName} writes to you, not the council. “Winter is expensive. Let me put the money somewhere useful and leave the names out of it.” ${a.clerkName} asks whether the households will see their grain again.\n\n${evidence}\n\nThe patron offers you forty gold to preserve the second charge. A public correction would take time and earn no fee. You can also negotiate a limited repayment without claiming a verdict you cannot establish.`,[
   choice('expose','Bring verified proof to the council','3 actual days. No personal payment. A signed comparison or willing witness is required.',!['signed','witness'].includes(a.proof)?'Obtain corroboration first; suspicion or an unexplained stolen copy is insufficient.':null),
   ...(['stolen',null].includes(a.proof)?[choice('corroborate','Ask the clerk to check the receipts','2 actual days. Free correspondence. Verify the actual entries before making an accusation.')]:[]),
   choice('negotiate','Negotiate repayment without a public verdict','2 actual days. No personal payment. The factor’s offer can support relief, but not a finding of guilt.'),
   ...(a.route==='criminal'&&a.clueChoice==='correct'&&['stolen','signed'].includes(a.proof)?[choice('blackmail','Trade the hidden duplicate for a place in the racket','2 actual days. Demand 75 gold and control of a private trading contact. Preserve the second levy and make yourself part of it.')]:[]),
   choice('sell','Take the patron’s forty gold','2 actual days. Keep the second levy in place and conceal what you learned; the clerk will know you accepted the patron’s terms.'),
   choice('withdraw','Keep your papers and walk away','Close this story without time, payment, accusation or new service.'),choice('later','Do not answer yet','Your evidence and the offer remain saved.'),
  ]);return true;
 }
 return false;
}
export const intrigueChoiceIds=['scholar','bard','criminal','correct','wrong','expose','corroborate','negotiate','sell','blackmail','withdraw','later','decline'];
export function intrigueChoiceReason(s,id){
 const a=s.rpg?.intrigue;if(!a?.pending)return 'No levy decision is waiting.';
 const allowed={approach:['scholar','bard','criminal','later','decline'],clue:['correct','wrong','later'],settlement:['expose','corroborate','negotiate','sell','blackmail','withdraw','later']}[a.pending];
 if(!allowed?.includes(id))return 'That approach is not part of this decision.';
 if(['bard','criminal'].includes(id)&&s.locationId!==a.locationId)return 'Return to the recorded settlement for this approach.';
 if(id==='blackmail'&&(a.route!=='criminal'||a.clueChoice!=='correct'||!['stolen','signed'].includes(a.proof)))return 'You need the hidden duplicate and your illicit access to the factor.';
 if(id==='expose'&&!['signed','witness'].includes(a.proof))return 'A signed comparison or willing witness is required.';
 if(id==='corroborate'&&['signed','witness'].includes(a.proof))return 'Your evidence is already corroborated.';
 return null;
}
export function applyIntrigueChoice(s,id,ctx,{startProject}){
 if(intrigueChoiceReason(s,id))return false;
 const a=s.rpg.intrigue,stage=a.pending;a.pending=null;
 if(id==='later'){record(s,ctx,'The levy letter remains among your unfinished matters. No day or coin was spent.');return true;}
 if(['decline','withdraw'].includes(id)){a.status='closed';a.ending=id;const text='You leave the levy dispute without a reward or a verdict. The earlier papers remain yours.';a.history.push({day:s.day,choice:id,text});record(s,ctx,text);return true;}
 if(stage==='clue'){
  a.clueChoice=id;a.proof=id==='correct'?{scholar:'signed',bard:'witness',criminal:'stolen'}[a.route]:null;a.stage=2;a.nextDay=s.day+7;
  const text=outcomes[a.route][id];a.history.push({day:s.day,choice:id,text});record(s,ctx,text);
  if(a.route==='criminal'&&id==='wrong')ctx.addEvidence?.(1,`A porter at ${locate(s,a.locationId)?.name} witnessed your damage to the levy office strongbox.`);
  if(a.route==='bard'&&id==='wrong'){const p=contact(s,a.factorId);if(p)p.bond=Math.max(0,p.bond-5);}
  return true;
 }
 if(stage==='approach')a.status='active';
 return startProject('intrigue','winter_levy',id,id==='scholar'||id==='expose'?3:id==='criminal'?1:2,0,{locationId:a.locationId,route:stage==='approach'?id:a.route,needsPresence:['bard','criminal'].includes(id)},ctx);
}
export function finishIntrigueProject(s,p,ctx,{addService}){
 const a=s.rpg.intrigue;if(!a||a.status!=='active')return;
 if(['scholar','bard','criminal'].includes(p.choice)){a.route=p.choice;a.stage=1;record(s,ctx,`You kept ${p.totalDays} actual day${p.totalDays===1?'':'s'} for the ${p.choice} approach. The clue is ready to examine; no conclusion has been chosen for you.`);return;}
 if(p.choice==='corroborate'){a.proof='signed';record(s,ctx,`${a.clerkName} checks receipt 18 against the seed-grain exemption and signs a correction. The claim now has corroboration rather than suspicion alone.`);return;}
 const endings={
  expose:{kind:'school',rule:'shared',clerk:15,factor:-20,standing:4,text:`The council reads the matching entries and suspends the second levy. ${a.clerkName} keeps an open copying table; ${a.factorName} loses your trust and refuses to call the hearing a kindness. The patron must now defend the demand in public.`},
  negotiate:{kind:'shelter',rule:'shared',clerk:5,factor:5,standing:2,text:`The factor signs a limited grain repayment and funds a local relief room. No public verdict is invented. ${a.clerkName} accepts the immediate help but keeps the unanswered question; the patron retains influence.`},
  blackmail:{kind:'blackmail',rule:'controlled',clerk:-30,factor:-10,standing:-6,text:`You take seventy-five gold and a private place in the levy racket. ${a.factorName} pays for the hidden duplicate, not your friendship. ${a.clerkName} closes the copying table to your requests; a controlled contact can now be used to practice leverage. The households still pay twice.`},
  sell:{kind:'market',rule:'controlled',clerk:-20,factor:15,standing:-4,text:`You accept forty gold and keep the second levy intact. ${a.factorName} opens a controlled trading desk to your allies. ${a.clerkName} records your refusal to help and will not mistake payment for vindication.`},
 };
 const ending=endings[p.choice];if(!ending)return;
 const {factor,clerk}=currentCast(s,a);
 if(!factor||!clerk||!openSite(s,a.locationId)){a.status='closed';a.ending='interrupted';const text='The levy agreement cannot be completed with its original people and settlement. Attended days remain spent; no payment or new service is created.';a.history.push({day:s.day,choice:'interrupted',text});record(s,ctx,text);return;}
 a.status='completed';a.ending=p.choice;a.history.push({day:s.day,choice:p.choice,text:ending.text});
 for(const [person,delta] of [[clerk,ending.clerk],[factor,ending.factor]]){person.bond=Math.max(0,Math.min(100,person.bond+delta));person.memories||=[];person.memories.push(ending.text);person.memories=person.memories.slice(-30);}
 if(['sell','blackmail'].includes(p.choice)){s.hero.gold+=p.choice==='blackmail'?75:40;ctx.breakOath?.('You accepted payment to preserve the disputed second grain levy.');}
 ctx.standing?.('villagers',ending.standing);
 addService({kind:ending.kind,rule:ending.rule,locationId:a.locationId,ownerId:['sell','blackmail'].includes(p.choice)?a.factorId:a.clerkId,source:'winter-levy-'+p.choice});
 s.world.changes.push({id:'winter-levy-'+(s.dynasty?.generation||1),day:s.day,locationId:a.locationId,title:INTRIGUE_TITLE,text:ending.text});s.world.changes=s.world.changes.slice(-500);record(s,ctx,ending.text);
}
export function intrigueJournalRows(s,{archive=false}={}){
 const a=s.rpg?.intrigue;if(!a||(archive?!['completed','closed'].includes(a.status):a.status!=='active'))return [];
 const objective=a.status!=='active'?(a.history.at(-1)?.text||'You left the levy dispute without claiming a reward.'):s.rpg.project?.kind==='intrigue'?'Keep the days you agreed in Today.':a.stage===0?'Choose how to investigate. Reading the papers at home needs no travel.':a.stage===1?'Examine the clue earned by your chosen approach.':s.day<a.nextDay?`The factor’s letter returns on day ${a.nextDay}. There is no expiry.`:'Read the factor’s private offer and decide what to do with your evidence.';
 const discovery=a.status==='completed'?' The original clerk and factor may speak about this outcome when you meet them. At your own home, a present adult partner or trusted household member can hear only what you choose to tell. After seven days, the original owner of the surviving service may have time for ordinary company. None of these conversations is required.':'';
 return [{key:'winter_levy',title:INTRIGUE_TITLE,kind:'personal',locationId:a.locationId,personName:a.clerkName,status:a.status,objective:objective+discovery,description:a.route?'Your approach: '+a.route+'. No profession has been locked.':'',actionId:a.status==='active'?'rpg_intrigue_open':null}];
}
export function validateIntrigue(s){
 const a=s.rpg?.intrigue;if(a===undefined)return s.event?.id!=='rpg_intrigue'&&s.rpg?.project?.kind!=='intrigue';
 const int=n=>Number.isSafeInteger(n)&&n>=0,str=x=>typeof x==='string'&&x.length>0&&x.length<=2000;
 if(!a||a.version!==1||!['offered','active','completed','closed'].includes(a.status)||![0,1,2].includes(a.stage)||!locate(s,a.locationId)||![a.factorId,a.clerkId,a.factorName,a.clerkName].every(str)||a.factorId===a.clerkId)return false;
 if(![null,'scholar','bard','criminal'].includes(a.route)||![null,'signed','witness','stolen'].includes(a.proof)||![null,'correct','wrong'].includes(a.clueChoice)||![null,'approach','clue','settlement'].includes(a.pending)||![null,'expose','negotiate','sell','blackmail','withdraw','decline','interrupted'].includes(a.ending))return false;
 if(!int(a.startedDay)||a.startedDay>s.day||!int(a.nextDay)||!Array.isArray(a.history)||a.history.length>4||!a.history.every(h=>int(h.day)&&h.day<=s.day&&str(h.choice)&&str(h.text)))return false;
 if(a.stage===0&&(a.route!==null||a.proof!==null||a.clueChoice!==null)||a.stage>0&&a.route===null||a.stage===1&&(a.proof!==null||a.clueChoice!==null)||a.stage===2&&a.clueChoice===null)return false;
 if(a.proof==='witness'&&a.route!=='bard'||a.proof==='stolen'&&a.route!=='criminal')return false;
 if(a.status==='offered'&&(a.stage!==0||a.ending!==null||s.rpg.project?.kind==='intrigue')||a.status==='active'&&a.ending!==null||a.status==='completed'&&(a.stage!==2||!['expose','negotiate','sell','blackmail'].includes(a.ending))||a.status==='closed'&&!['decline','withdraw','interrupted'].includes(a.ending))return false;
 if(a.pending!==null&&(!['offered','active'].includes(a.status)||a.pending!==['approach','clue','settlement'][a.stage]||s.event?.id!=='rpg_intrigue'||s.rpg.project)||s.event?.id==='rpg_intrigue'&&a.pending===null)return false;
 const p=s.rpg.project;
 if(p?.kind==='intrigue'){
  const methods=['scholar','bard','criminal'],endings=['expose','negotiate','sell','blackmail','corroborate'];
  if(a.status!=='active'||a.pending!==null||p.id!=='winter_levy'||!p.details||p.details.locationId!==a.locationId||p.cost!==0)return false;
  if(a.stage===0?!methods.includes(p.choice):a.stage!==2||!endings.includes(p.choice))return false;
  const days=p.choice==='scholar'||p.choice==='expose'?3:p.choice==='criminal'?1:2;
  if(p.totalDays!==days||p.details.route!==(a.stage===0?p.choice:a.route)||p.details.needsPresence!==['bard','criminal'].includes(p.choice))return false;
  if(p.choice==='expose'&&!['signed','witness'].includes(a.proof)||p.choice==='blackmail'&&(a.route!=='criminal'||a.clueChoice!=='correct'||!['stolen','signed'].includes(a.proof))||p.choice==='corroborate'&&['signed','witness'].includes(a.proof))return false;
 }
 return true;
}
