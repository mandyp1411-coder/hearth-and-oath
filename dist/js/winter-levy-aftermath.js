import { isCanonicalAppearance } from './avatar.js';
import { ownedHomeHere } from './home-recovery-v38.js';
import { familyResidence } from './household-residence.js';

// A small receipt book for this completed story, not a reputation/knowledge engine.
// No defaults or migration writes: absent means no exchange has been recorded.
export const LEVY_NODES = Object.freeze(['levy_reaction','levy_household','levy_return']);
const ENDINGS=['expose','negotiate','sell','blackmail'];
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const text=(v,n=160)=>typeof v==='string'&&v.length>0&&v.length<=n;
const id=v=>text(v,80)&&/^[a-z][a-z0-9_-]*$/.test(v)&&!['constructor','prototype'].includes(v);
const day=v=>Number.isSafeInteger(v)&&v>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const option=(id,label,text,response)=>({id,label,description:'Choose these words. No days, payment, relationship or skill reward.',text,response,effect:{}});
function owner(s){const p=s.lineage?.people?.find(p=>p.id===s.dynasty?.activePersonId);return p?{seed:String(s.seed),personId:p.id,generation:s.dynasty.generation,bornDay:p.bornDay}:null;}
function validOwner(v,s){return exact(v,['seed','personId','generation','bornDay'])&&text(v.seed,200)&&text(v.personId,160)&&Number.isInteger(v.generation)&&v.generation>=1&&v.generation<=200&&Number.isSafeInteger(v.bornDay)&&same(v,owner(s));}
function source(s){
 const a=s.rpg?.intrigue;
 if(a?.status!=='completed'||a.version!==1||a.stage!==2||a.pending!==null||!ENDINGS.includes(a.ending)||!['scholar','bard','criminal'].includes(a.route)||!['correct','wrong'].includes(a.clueChoice)||![null,'signed','witness','stolen'].includes(a.proof)||!day(a.startedDay)||!Array.isArray(a.history)||!a.history.length||a.history.length>4||!owner(s))return null;
 if(a.ending==='expose'&&!['signed','witness'].includes(a.proof)||a.ending==='blackmail'&&(a.route!=='criminal'||a.clueChoice!=='correct'||!['stolen','signed'].includes(a.proof))||a.proof==='witness'&&a.route!=='bard'||a.proof==='stolen'&&a.route!=='criminal')return null;
 if(!a.history.every((h,i)=>day(h.day)&&h.day>=a.startedDay&&h.day<=s.day&&text(h.choice,80)&&text(h.text,2000)&&(!i||h.day>a.history[i-1].day)))return null;
 const endings=a.history.filter(h=>ENDINGS.includes(h.choice)),completed=a.history.at(-1);
 if(endings.length!==1||completed.choice!==a.ending||completed.day-owner(s).bornDay<18*365||!id(a.factorId)||!id(a.clerkId)||a.factorId===a.clerkId||!s.world?.locations.some(l=>l.id===a.locationId))return null;
 const cast=[...(s.rpg.contacts||[]),...(s.rpg.contactArchive||[])];
 if(![a.factorId,a.clerkId].every(id=>cast.some(p=>p.id===id&&validActor(p,s)&&completed.day-p.bornDay>=18*365&&(p.deathDay==null||p.deathDay>=completed.day))))return null;
 return {owner:owner(s),ending:a.ending,completionDay:completed.day,locationId:a.locationId,factorId:a.factorId,clerkId:a.clerkId};
}
const used=(s,kind,personId)=>!!source(s)&&(s.conversations?.levyAftermath||[]).some(r=>same(r.source,source(s))&&r.kind===kind&&(kind!=='reaction'||r.personId===personId));
function here(s,p){const site=s.world?.locations.find(l=>l.id===s.locationId);return !!p&&p.age>=18&&p.available!==false&&p.alive!==false&&p.source?.alive!==false&&!p.retired&&!p.recordedDeath&&!p.commitmentOnly&&!/hostile|enemy/i.test(p.role||'')&&!['withdrawn','refusing','hostile'].includes(p.source?.agency?.status||p.agency?.status)&&s.age>=18&&s.phase==='adult'&&!s.event&&!s.battle&&!s.maze&&!s.justice?.prison&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey&&p.locationId===s.locationId&&(!p.roomId||p.roomId===(s.cartography?.interior?.roomId||'gate'))&&!!site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false&&!s.realm?.politics?.holds?.some(h=>h.siteId===s.locationId&&h.status==='held');}
function householdLink(s,personId,at=s.day){
 const p=(s.life?.people||[]).find(p=>p.id===personId),c=(s.life?.children||[]).find(p=>p.id===personId),record=s.lineage?.people?.find(r=>r.localId===personId&&r.source===(c?'child':'life'));
 if(!id(personId)||!record||!p&&!c||!Number.isSafeInteger(record.bornDay)||at-record.bornDay<18*365||record.alive===false&&(!day(record.deathDay)||record.deathDay<at))return null;
 if(c&&record.parentIds.includes(s.dynasty.activePersonId))return {kind:'child',lineageId:record.id};
 if(p&&s.lineage.unions.some(u=>u.partnerId===record.id&&u.startedDay<=at&&(u.endedDay===null||u.endedDay>=at)))return {kind:'partner',lineageId:record.id};
 if(p&&s.family?.members?.some(m=>m.personId===personId&&['parent','guardian','sibling'].includes(p.familyRole)))return {kind:'family',lineageId:record.id};
 return null;
}
function householdEligible(s,p){
 const link=householdLink(s,p.id),actual=(s.life.people||[]).find(q=>q.id===p.id)||(s.life.children||[]).find(q=>q.id===p.id);
 if(!link||!actual||actual.alive===false||p.age<18||!ownedHomeHere(s)||s.cartography?.interior?.siteId!==s.locationId||s.cartography.interior.roomId!=='homes'||familyResidence(s,actual)!==s.locationId)return false;
 if(link.kind==='partner')return s.life.partnerId===p.id&&p.bond>=35;
 return p.bond>=60&&(link.kind==='child'||s.family.members.some(m=>m.personId===p.id&&m.availability==='present'));
}
function service(s){const a=s.rpg?.intrigue,src=source(s),kind={expose:'school',negotiate:'shelter',sell:'market',blackmail:'blackmail'}[a?.ending],controlled=['sell','blackmail'].includes(a?.ending),ownerId=controlled?a.factorId:a?.clerkId;return src&&s.rpg?.services?.find(v=>v.id===`service-winter-levy-${a.ending}-${kind}`&&v.source==='winter-levy-'+a.ending&&v.kind===kind&&v.rule===(controlled?'controlled':'shared')&&v.day===src.completionDay&&v.ownerId===ownerId&&v.locationId===a.locationId&&(v.expiresDay===undefined||s.day<v.expiresDay));}
export function levyEligible(s,p,kind){const src=source(s);if(!src||!here(s,p)||used(s,kind,p.id)||!validateLevyAftermath(s.conversations||{},s))return false;if(kind==='household')return householdEligible(s,p);if(![src.clerkId,src.factorId].includes(p.id))return false;const actor=s.rpg.contacts.find(a=>a.id===p.id);if(!actor||actor.alive===false||actor.retired||actor.available===false||actor.locationId!==p.locationId)return false;return kind==='reaction'||kind==='return'&&p.locationId===src.locationId&&s.day>=src.completionDay+7&&service(s)?.ownerId===p.id;}

const REACTIONS={
 expose:{
  clerk:['The correction on the wall','The council suspended the second charge. I put the correction beside the original demand, not over it. People ought to see what changed. I have had a pleasantly dull morning copying lawful receipts.',
   'Has the hearing made your ordinary work easier?','The demand is clearer. The handwriting is not. A public victory has yet to persuade anyone to cross a seven properly.',
   'I think keeping the mistaken demand visible matters.','So do I. A correction without its earlier page can look like a claim that nobody made a mistake.'],
  factor:['After the public hearing','The second levy is suspended. You have the council’s decision; do not expect me to call the hearing a favor. I can disagree with you without pretending the order is not on my desk.',
   'What will you do with the council’s order?','Apply it to the next demand. If I dispute the finding, I must dispute it openly. I cannot charge people twice while the order says otherwise.',
   'I would make the same choice again.','Then we understand each other. Agreement is not a requirement for understanding.'],
 },
 negotiate:{
  clerk:['Relief, with an unanswered question','The limited grain repayment is signed, and the relief room is open. I am glad of that. I still distinguish relief from an answer about who wrote the second charge.',
   'Does the repayment settle the question for you?','It settles the amount promised in that agreement. It does not settle every reason we had for asking. I can welcome one without inventing the other.',
   'I wanted help now, even without a public verdict.','That is a position I can understand. Keep the words “without a verdict” beside it. They do useful work.'],
  factor:['A limited agreement','The repayment agreement is being kept. You did not ask me to confess to a verdict the council never reached. I would prefer to speak about something other than grain for a few minutes.',
   'What does the agreement leave unresolved?','The disputed demand remains disputed. The repayment and the relief room are actual promises, not a declaration that everyone remembers the same story.',
   'I still think a public hearing might have mattered.','Perhaps it would. It is not the agreement we signed. You need not praise every part of a compromise to keep its actual terms.'],
 },
 sell:{
  clerk:['A second charge still due','The households still face the second charge. I know you accepted the patron’s terms. I will not call that a correction, but you may say what you mean without asking me to approve it.',
   'What will you put in the record about me?','That you declined to pursue relief and accepted those terms. Not a story about motives you never told me, and not a claim that the charge was vindicated.',
   'I am not asking you to approve my choice.','Good. We can speak without pretending that an ordinary greeting erases a disagreement.'],
  factor:['The price of keeping quiet','Forty gold bought your silence about the second levy. The controlled trading desk is still the service we agreed. That is a bargain, not a new name for friendship.',
   'Do you think that bargain settles everything between us?','It settles what was paid and what was kept quiet. It gives neither of us the right to invent the other’s loyalties.',
   'I can accept that bargain and still dislike it.','You can. Discomfort does not change the entry in the account, but you need not perform delight for me.'],
 },
 blackmail:{
  clerk:['The table has a boundary','The second charge remains. I have closed the copying table to your requests. I can see that this dispute did not bring relief; I will not pretend to know every private word that passed elsewhere.',
   'Will you tell me why you closed the table?','I will not put my copying work at the service of what this dispute has become. That is a boundary about my own table, not a claim to know a conversation I did not attend.',
   'I disagree with your decision to shut me out.','You may disagree. The table is still mine to close. An argument is not permission to use it.'],
  factor:['Leverage is not trust','Seventy-five gold for the hidden duplicate, and a place in the racket. I remember the terms. Do not confuse the private contact you gained with my trusting you.',
   'What keeps this arrangement from becoming another threat?','Neither of us can turn leverage into trust by renaming it. I will keep the terms we made; I will not promise affection as an extra payment.',
   'I wanted control, not your affection.','Then at least leave the bargain that honest. You cannot demand the relief of being admired as well.'],
 },
};
function reactionScene(s,p){const a=s.rpg.intrigue,r=REACTIONS[a.ending][p.id===a.clerkId?'clerk':'factor'];return {title:r[0],body:r[1],choices:[option('question','Ask a particular question',r[2],r[3]),option('opinion','Offer your own view',r[4],r[5]),option('subject','Change the subject','I would rather speak about something else today.','Then let us leave the levy there. You need not discuss it each time we meet.'),option('leave','End the conversation','I am going to leave this conversation here.','All right. There is no further answer owed today.')]};}
const HOUSEHOLD={
 expose:['The second grain charge was suspended after I brought verified evidence to the council. I took no payment.','I am glad you told me what you actually did. A public decision does not tell me how it felt to be the person bringing it.'],
 negotiate:['I negotiated a limited grain repayment and a relief room. There was no public verdict, and I took no payment.','I can understand wanting help now. I am glad there is help for those households. I wish it had not come down to bargaining over their grain.'],
 sell:['I accepted forty gold from the patron and kept the second charge in place. The factor opened a controlled trading desk. I chose payment, not relief for those households.','That is difficult to hear. I would rather you tell me plainly than ask me to admire a different version. I need not approve to have heard you.'],
 blackmail:['I used the hidden duplicate to demand seventy-five gold and a private place in the levy racket. The second charge stayed. That was leverage for myself, not relief.','I have heard you. I do not have to like that bargain, and knowing you made it does not make me part of it.'],
};
function routeAccount(a){const route={scholar:'I compared the papers at my own table.',bard:'I went to the levy supper.',criminal:'I entered the levy office without permission.'}[a.route],clue=a.clueChoice==='wrong'?'My first reading of the clue was wrong; it did not prove the levy was forged.':{scholar:'I matched receipt 18 to the seed-grain exemption.',bard:'I heard the factor admit the doubled seed charge in front of the clerk.',criminal:'I found the corrected duplicate under a loose shelf board.'}[a.route],proof={signed:'The clerk eventually signed a verified receipt comparison.',witness:'The clerk was willing to repeat the admission at a hearing.',stolen:'The duplicate had no lawful witness to its removal.'}[a.proof]||'I had no verified proof.';return `${route} ${clue} ${proof}`;}
function householdScene(s){const a=s.rpg.intrigue,row=HOUSEHOLD[a.ending];return {title:'Something to tell at home',body:'There is a quiet moment at your own home. You can tell this person about your part in the Winter Levy, share only that you were involved, keep the matter private, or leave. Being in your household has not already told them what happened.',choices:[option('honest','Tell the whole account',`${routeAccount(a)} ${row[0]}`,row[1]),option('limited','Share only that you were involved','I was involved in the Winter Levy dispute. It has ended, but I do not want to discuss my choices or its terms.','Thank you for saying what you are willing to share. I know only that you were involved, not the choices or terms you have kept to yourself.'),option('private','Keep the matter private','I do not want to discuss the levy at home.','Then we will not. Living together does not make every confidence a household possession.'),option('leave','Leave this conversation for now','I am going to leave this subject alone today.','Of course. You can sit here without giving an account of yourself.')]};}
const RETURNS={
 expose:['A pleasantly unimportant page','The shared copying table is open. The clerk sets a page aside. “No disputed duty on this one. Just a very elaborate capital B. I am beginning to think the B has ambitions.”','May I see the letter you are pleased with?','Look at that curve. Entirely unnecessary, and I enjoyed making it. Not every good page needs to settle a dispute.','The letter B seems well qualified to govern.','It would need a smaller seal. I refuse to spend the afternoon carving one.'],
 negotiate:['A quiet moment in the relief room','The relief room remains open under the agreement. The clerk pauses at its doorway. “It is quiet just now. I am enjoying that without turning it into a prediction about tomorrow.”','What do you enjoy about a quiet moment here?','Hearing an ordinary conversation without having to make it into an account. We can let these few minutes belong to themselves.','We could give the silence a very impressive title.','The Most Distinguished Interval Between Questions. There, now we have nearly spoiled it.'],
 sell:['Company beside the trading desk','The controlled trading desk is still available. The factor is examining the crooked edge of a blotting sheet. “I have spent too long deciding which side is straighter. Neither side has offered an apology.”','Is there a side you prefer?','The crooked one on the left. At least it is not trying to impress me. A small pleasure, and no reason to open another account.','Perhaps the sheet is negotiating better terms.','Then it is doing admirably. It has said nothing and occupied most of my morning.'],
 blackmail:['Five minutes without a bargain','The private leverage contact remains available. The factor closes the account. “We can have five minutes in which neither of us asks for anything. I would find that a novelty.”','What would you like to speak about instead?','The weather, perhaps. Neither of us can offer the other exclusive control of it. I find that reassuring.','I decline to buy an interest in the weather.','A wise refusal. The rain has an appalling record of keeping appointments.'],
};
function returnScene(s){const r=RETURNS[s.rpg.intrigue.ending];return {title:r[0],body:r[1],choices:[option('ask','Ask about the ordinary pleasure',r[2],r[3]),option('humor','Share a little humor',r[4],r[5]),option('savor','Enjoy the moment without another task','I am content to enjoy a few ordinary minutes.','So am I. We need not turn them into another obligation.'),option('leave','Leave on your own terms','I will be on my way. Thank you for the company.','Go well. There is no errand to take with you.')]};}
export function levyScene(s,p,kind='reaction',{historical=false}={}){const src=source(s),link=kind==='household'&&p?householdLink(s,p.id,s.conversations?.pending?.levyDay??s.day):null;if(!src||!p||!['reaction','household','return'].includes(kind)||kind!=='household'&&![src.clerkId,src.factorId].includes(p.id)||kind==='household'&&!link||kind==='return'&&p.id!==(['sell','blackmail'].includes(src.ending)?src.factorId:src.clerkId)||!historical&&!levyEligible(s,p,kind))return null;const scene=kind==='reaction'?reactionScene(s,p):kind==='household'?householdScene(s):returnScene(s);return {nodeId:'levy_'+kind,topic:'levy-'+kind+'-'+src.ending,title:scene.title,body:scene.body,choices:scene.choices,levy:{source:src,...(kind==='household'?{householdLink:link}:{})}};}
export function levyActions(s,p){if(s.conversations?.pending)return [];return ['household','return'].filter(kind=>levyEligible(s,p,kind)).map(kind=>({id:`talk_levy_${kind}_${p.id}`,label:kind==='household'?'Choose what to share about the Winter Levy':'Return for a little ordinary company',description:kind==='household'?'Optional, at your own home. This person learns only what you choose to tell them.':'Optional company at the existing service. No errand, payment, service use or reward.',days:0,cost:0,group:'Conversations',levyTopic:true,levyPersonId:p.id}));}

function validActor(p,s){return plain(p)&&id(p.id)&&text(p.name,120)&&text(p.role,160)&&Number.isInteger(p.age)&&p.age>=0&&p.age<=5000&&Number.isInteger(p.bornDay)&&p.bornDay>=-10000000&&p.bornDay<=s.day&&typeof p.alive==='boolean'&&s.world.locations.some(l=>l.id===p.locationId)&&isCanonicalAppearance(p.appearance)&&(p.deathDay==null||day(p.deathDay)&&p.deathDay<=s.day&&!p.alive);}
export function levyHistoricalContacts(s){const a=s.rpg?.intrigue;if(!a)return [];return [...(s.rpg.contacts||[]),...(s.rpg.contactArchive||[])].filter(p=>[a.clerkId,a.factorId].includes(p.id)&&validActor(p,s)).map(p=>({...p,minAge:18,kind:'extra',available:false,recordedDeath:p.alive===false,bond:p.bond??35,description:'Their exact part in the earlier levy account remains recorded.',source:p}));}
function messageMap(value){
 if(!plain(value.threads)||Object.keys(value.threads).length>512||!day(value.sequence)||value.sequence>500000)return null;const result=new Map();
 for(const [personId,thread]of Object.entries(value.threads)){
  if(!id(personId)||!Array.isArray(thread)||thread.length>120)return null;
  for(const m of thread){if(!plain(m)||!text(m.id,30)||!/^letter-[1-9]\d*$/.test(m.id)||Number(m.id.slice(7))>value.sequence||result.has(m.id))return null;result.set(m.id,{personId,message:m});}
 }
 return result;
}
export function levyPendingAuthentic(value,s,p){
 const q=value.pending;if(!LEVY_NODES.includes(q?.nodeId))return true;const kind=q.nodeId.slice(5),map=messageMap(value),view={...s,conversations:value};
 if(!map||!validateLevyAftermath(value,s)||!day(q.levyDay)||q.levyDay>s.day||q.levyDay<(source(s)?.completionDay??Infinity)+(kind==='return'?7:0)||!p||p.id!==q.personId||used(view,kind,p.id)||!exact(q.snapshot,['nodeId','topic','title','body','choices','levy'])||!same(q.snapshot,levyScene(view,p,kind,{historical:true})))return false;
 return [...map.values()].some(({personId,message:m})=>personId===p.id&&m.speaker===p.id&&m.text===q.snapshot.body&&m.day===q.levyDay)&&q.topic===q.snapshot.topic&&same(q.replies,q.snapshot.choices.map(({id,label,description})=>({id,label,description})));
}
export function recordLevyReply(s,p,scene,choice){
 if(!LEVY_NODES.includes(scene?.nodeId))return false;const kind=scene.nodeId.slice(5);
 if(!levyEligible(s,p,kind)||!levyPendingAuthentic(s.conversations,s,p)||!same(scene,levyScene(s,p,kind,{historical:true}))||!scene.choices.some(c=>same(c,choice)))return false;
 const thread=s.conversations.threads[p.id]||[],answer=thread.at(-1),spoken=thread.at(-2),opening=thread.findLast(m=>m.speaker===p.id&&m.text===scene.body);
 if(!opening||spoken?.speaker!=='hero'||spoken.text!==choice.text||answer?.speaker!==p.id||answer.text!==choice.response||answer.day!==s.day)return false;
 const receipt={version:1,source:source(s),kind,personId:p.id,day:s.day,choiceId:choice.id,openingDay:opening.day,openingId:opening.id,replyId:answer.id,...(kind==='household'?{householdLink:householdLink(s,p.id),...(choice.id==='honest'||choice.id==='limited'?{disclosure:{scope:choice.id,text:choice.text}}:{})}:{})};
 s.conversations.levyAftermath=[...(s.conversations.levyAftermath||[]),receipt];return true;
}
function validSource(v,s){return exact(v,['owner','ending','completionDay','locationId','factorId','clerkId'])&&validOwner(v.owner,s)&&ENDINGS.includes(v.ending)&&day(v.completionDay)&&v.completionDay<=s.day&&s.world.locations.some(l=>l.id===v.locationId)&&id(v.factorId)&&id(v.clerkId)&&v.factorId!==v.clerkId;}
export function validateLevyAftermath(value,s){
 const ledger=value.levyAftermath;if(ledger===undefined)return true;if(!Array.isArray(ledger)||ledger.length>4)return false;const keys=new Set(),map=messageMap(value);if(!map)return false;
 for(const r of ledger){
  const fields=['version','source','kind','personId','day','choiceId','openingDay','openingId','replyId',...(r?.kind==='household'?['householdLink',...(r.disclosure!==undefined?['disclosure']:[])]:[])];
  if(!exact(r,fields)||r.version!==1||!validSource(r.source,s)||!['reaction','household','return'].includes(r.kind)||!id(r.personId)||!day(r.day)||r.day<r.source.completionDay||r.day>s.day||!day(r.openingDay)||r.openingDay<r.source.completionDay||r.openingDay>r.day||!text(r.openingId,30)||!text(r.replyId,30)||!/^letter-[1-9]\d*$/.test(r.openingId)||!/^letter-[1-9]\d*$/.test(r.replyId)||Number(r.openingId.slice(7))+2>Number(r.replyId.slice(7))||Number(r.replyId.slice(7))>value.sequence)return false;
  const ids=r.kind==='reaction'?['question','opinion','subject','leave']:r.kind==='household'?['honest','limited','private','leave']:['ask','humor','savor','leave'];if(!ids.includes(r.choiceId))return false;
  const key=JSON.stringify([r.source.owner,r.kind,r.kind==='reaction'?r.personId:'']);if(keys.has(key))return false;keys.add(key);
  if(r.kind!=='household'&&![r.source.clerkId,r.source.factorId].includes(r.personId)||r.kind==='return'&&(r.openingDay<r.source.completionDay+7||r.personId!==(['sell','blackmail'].includes(r.source.ending)?r.source.factorId:r.source.clerkId)))return false;
  if(r.kind==='household'){
   if(!exact(r.householdLink,['kind','lineageId'])||!['partner','family','child'].includes(r.householdLink.kind)||!text(r.householdLink.lineageId,160)||!s.lineage.people.some(p=>p.id===r.householdLink.lineageId))return false;
   if(!same(r.householdLink,householdLink(s,r.personId,r.day))||!same(r.householdLink,householdLink(s,r.personId,r.openingDay)))return false;
   if(['honest','limited'].includes(r.choiceId)){if(!exact(r.disclosure,['scope','text'])||r.disclosure.scope!==r.choiceId||!text(r.disclosure.text,1800))return false;}else if(r.disclosure!==undefined)return false;
  }
  {
   if(!same(r.source,source(s)))return false;
   if(r.kind!=='household'&&![...(s.rpg.contacts||[]),...(s.rpg.contactArchive||[])].some(p=>p.id===r.personId&&validActor(p,s)))return false;
   const p={id:r.personId},scene=levyScene({...s,conversations:{...s.conversations,pending:{levyDay:r.openingDay}}},p,r.kind,{historical:true}),c=scene?.choices.find(c=>c.id===r.choiceId);if(!c||r.disclosure&&r.disclosure.text!==c.text)return false;
   for(const [messageId,speaker,body,at]of [[r.openingId,r.personId,scene.body,r.openingDay],['letter-'+(Number(r.replyId.slice(7))-1),'hero',c.text,r.day],[r.replyId,r.personId,c.response,r.day]]){
    const found=map.get(messageId);if(found&&(found.personId!==r.personId||found.message.speaker!==speaker||found.message.text!==body||found.message.day!==at))return false;
   }
  }
 }
 return true;
}
export function levyDisclosureFor(s,personId){if(!id(personId)||!validateLevyAftermath(s.conversations||{},s))return null;const r=s.conversations?.levyAftermath?.find(r=>r.kind==='household'&&r.personId===personId&&same(r.source.owner,owner(s))&&same(r.source,source(s)));return r?.disclosure?structuredClone(r.disclosure):null;}
