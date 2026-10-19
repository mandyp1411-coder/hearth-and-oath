import { seededRoll, generatePersonName, isSettlement } from './world.js';

// A single introductory practice bout, not a profession or a repeatable reward.
const moves=['attack','guard','feint'];
const beats={attack:'feint',guard:'attack',feint:'guard'};
const tells={attack:'Their front foot slides forward; the wooden point is coming straight at your shoulder.',guard:'They plant both feet and hold their blade across the scoring ribbon.',feint:'Their point flicks left, but their weight stays back. They are inviting a premature block.'};
const choice=(id,label,description)=>({id,label,description});
const row=(id,label,description,days=0,disabledReason)=>({id:'yard_'+id,label,description,days,cost:0,group:'Training',...(disabledReason?{disabledReason}:{})});
const occupied=s=>s.timeline?.journey||s.timeline?.yearTarget!=null||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.life?.plan||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.conversations?.project||s.rpg?.project||s.rpg?.expedition||s.adventuring?.expedition;
const here=s=>s.world.locations.find(p=>p.id===s.locationId);
const available=s=>s.age>=10&&s.phase!=='retired'&&s.hero.hp>0&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.cartography?.pending&&!s.cartography?.offsite&&!s.dungeon&&!s.maze&&!s.justice?.prison&&!occupied(s)&&isSettlement(s.world,s.locationId)&&!['destroyed','evacuated'].includes(here(s)?.status)&&here(s)?.servicesAvailable!==false;
const birthdayDue=s=>s.timeline?.mode==='birth'&&s.age>0&&(s.day-(s.timeline.birthDay||0))%365===0&&!s.timeline.yearHistory.some(y=>y.id===(s.timeline.birthDay?`birthday-${s.timeline.birthDay}-${s.age}`:`birthday-${s.age}`));
const local=s=>(s.cartography?.interior?.roomId||'gate')==='gate'&&(!s.yardTournament||s.yardTournament.locationId===s.locationId);
export const yardLocked=s=>['preparing','bout'].includes(s.yardTournament?.stage);
export function yardActions(s){
 if(!available(s))return yardLocked(s)&&!s.event&&!s.battle&&!s.conversations?.pending&&s.phase!=='retired'?[row('withdraw','Withdraw From the Bout','End this practice commitment so you can attend to other needs. Keep the time and exchanges already recorded.')]:[];
 const t=s.yardTournament,reason=!local(s)?`Meet the practice instructor at the gate of ${s.world.locations.find(p=>p.id===t?.locationId)?.name||'this settlement'}.`:null;
 if(!t&&['servicePeople','relationships','meetings'].some(k=>Object.keys(s.conversations?.[k]||{}).length>510))return [];
 if(!t||t.stage==='offered')return [row('invite','Ask About the Practice Tournament','An optional invitation for novices aged ten or older. Read the rules before committing; borrowed wooden swords, no entry fee, no class requirement.',0,reason)];
 if(yardLocked(s))return [row('resume',t.stage==='preparing'?'Attend the Practice Day':'Resume Your Practice Bout',t.paidDays?'Your practice day is already paid in time. Continue the same saved score and opponent.':'Spend 1 actual day warming up and taking a three-exchange bout. No entry fee; ordinary living expenses still apply.',1-t.paidDays,reason),row('withdraw','Withdraw From the Bout','Keep the time already spent and your recorded exchanges. No reward or penalty to health.',0)];
 return [row('recall','Talk Over Your First Bout',`The instructor remembers your ${t.outcome==='withdrawn'?'withdrawal':t.outcome}. No time, reward or renewed entry.`,0,reason)];
}
const emit=(s,ctx,id,title,body,choices)=>{s.yardTournament.pending=id;ctx.setEvent('yard_'+id,title,'Practice Tournament',body,choices);};
const record=(s,ctx,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)('The Gateyard Ribbon',text,'life',{narrativeEdition:30});};
function memory(s,p,text){
 const person=s.life.people.find(n=>n.id===p.id)||s.companions.find(n=>n.id===p.id);
 if(person){person.memories ||= [];if(!person.memories.includes(text)&&person.memories.length<60)person.memories.push(text);return;}
 const relationships=s.conversations.relationships ||= {};if(!relationships[p.id]&&Object.keys(relationships).length>=512)return;const r=relationships[p.id] ||= {bond:40,memories:[],knownFacts:[]};
 if(!r.memories.includes(text)&&r.memories.length<60)r.memories.push(text);
}
function meet(s,p){
 const people=s.conversations.servicePeople ||= {};
 if(!s.life.people.some(n=>n.id===p.id)&&!s.companions.some(n=>n.id===p.id)){if(!people[p.id]&&Object.keys(people).length>=512)return false;people[p.id]={id:p.id,name:p.name,role:p.role,age:p.age,baseAge:p.age-Math.floor(s.day/365),locationId:s.locationId,roomId:'gate'};}
 const meetings=s.conversations.meetings ||= {};if(!meetings[p.id]&&Object.keys(meetings).length>=512)return false;meetings[p.id]={locationId:s.locationId,firstDay:meetings[p.id]?.firstDay??s.day,lastDay:s.day};return true;
}
function invite(s,ctx,contacts){
 if(!s.yardTournament){
  const rival=contacts.find(p=>p.id==='rival'&&p.available!==false&&p.alive!==false&&p.locationId===s.locationId&&(p.roomId||'gate')==='gate'&&Math.abs(p.age-s.age)<=3);
  s.yardTournament={version:1,stage:'offered',locationId:s.locationId,startedDay:s.day,paidDays:0,pending:null,rounds:[],outcome:null,finishedDay:null,
   mentor:{id:'yard-instructor',name:generatePersonName(s.seed,'yard-instructor'),age:42,role:'Practice Instructor'},
   opponent:rival?{id:rival.id,name:rival.name,age:rival.age,role:'Practice Rival'}:{id:'yard-rival',name:generatePersonName(s.seed,'yard-rival'),age:s.age,role:'Practice Rival'},
   intents:[0,1,2].map(i=>moves[(seededRoll(s.seed,'yard-opening',3)+i)%3])};
 }
 const t=s.yardTournament;if(!meet(s,t.mentor))return false;
 emit(s,ctx,'invitation','The Gateyard Ribbon',`${t.mentor.name} ties a faded ribbon around a borrowed wooden sword. “Three exchanges. A clean touch scores one. A tied exchange scores neither. Stop whenever you need to.” ${t.opponent.name}, another novice, checks a loose glove beside the gate.\n\nThe instructor offers a place, not an oath. A knight might start here; so might a scholar who wants steadier hands. This is a supervised, nonlethal practice tournament, not monster combat.\n\nAttack catches a feint. Guard stops an attack. Feint draws out a guard. Matching moves score nothing. Read your opponent before choosing. The whole warm-up and bout cost one day, with no entry fee. Ordinary living expenses still apply. No equipment, class or knighthood is granted.`,[choice('enter','Take a Place in the Practice Bout','Commit 1 actual day. Borrowed equipment; no fee. Your score and decisions are saved.'),choice('later','Maybe Another Day','No commitment, time or fee.')]);
}
function bout(s,ctx){const t=s.yardTournament,i=t.rounds.length,score=t.rounds.reduce((a,r)=>[a[0]+(r.point===1),a[1]+(r.point===-1)],[0,0]);
 emit(s,ctx,'exchange',`Exchange ${i+1} of 3 · You ${score[0]} : ${score[1]} ${t.opponent.name}`,`${t.rounds.at(-1)?.text||'The instructor lowers a cloth between you, then steps clear.'}\n\n${t.opponent.name}: ${tells[t.intents[i]]}\n\nAttack beats feint; guard beats attack; feint beats guard. Matching moves score neither. Wooden swords only: the bout never deals damage. The day has already been spent.`,[...moves.map(m=>choice(m+'_'+i,{attack:'Attack the Opening',guard:'Hold Your Guard',feint:'Offer a Feint'}[m],{attack:'A direct touch catches a feint, but a guard stops it.',guard:'Meet an incoming attack; a feint draws your blade aside.',feint:'Draw out a guard; a direct attack catches your hesitation.'}[m])),choice('pause','Pause the Bout','Save this exchange unchanged. Resume without paying another day.'),choice('withdraw','Lower Your Sword','End your first bout here. The instructor remembers that you chose to stop.')]);
}
function finish(s,ctx,withdrawn=false){
 const t=s.yardTournament;if(t.stage==='finished')return;
 const score=t.rounds.reduce((a,r)=>[a[0]+(r.point===1),a[1]+(r.point===-1)],[0,0]);
 t.stage='finished';t.pending=null;t.finishedDay=s.day;t.outcome=withdrawn?'withdrawn':score[0]>score[1]?'win':score[0]<score[1]?'loss':'draw';
 const words=withdrawn?'You lowered your sword and ended the bout.':t.outcome==='win'?'You won your first practice bout.':t.outcome==='loss'?'Your opponent won your first practice bout.':'Your first practice bout ended level.';
 const text=`${words} ${score[0]}–${score[1]} against ${t.opponent.name}, after ${t.rounds.length} exchanges. ${t.mentor.name} kept the result, not a promise of knighthood. No coin, class or combat bonus was awarded.`;
 memory(s,t.mentor,text);memory(s,t.opponent,text);record(s,ctx,text);
}
export function applyYardAction(s,id,ctx,contacts=[]){
 if(!yardActions(s).some(a=>a.id===id&&!a.disabledReason))return false;
 const t=s.yardTournament;
 if(id==='yard_invite'){return invite(s,ctx,contacts)!==false;}
 if(id==='yard_withdraw'){finish(s,ctx,true);return true;}
 if(id==='yard_resume'){
  if(!t.paidDays){const before=s.day;ctx.spendDays(1);t.paidDays=Math.min(1,s.day-before);}
  if(t.paidDays&&s.phase!=='retired'){t.stage='bout';if(!s.event&&!birthdayDue(s)&&!ctx.pendingNeed?.()&&!(ctx.nextInterruptionDay?.()<=s.day&&ctx.nextInterruptionDay?.()!==null))bout(s,ctx);}
  return true;
 }
 if(id==='yard_recall'){
  const words={win:'“You watched the feet instead of chasing the blade. Keep that patience when the crowd gets louder.”',loss:'“You lost a bout, not your place here. Which opening would you read differently?”',draw:'“Neither of you gave much away. Next time, notice when caution becomes hesitation.”',withdrawn:'“You knew when to lower the sword. That judgment belongs in training too.”'};
  emit(s,ctx,'recall','A Ribbon, Not an Oath',`${t.mentor.name} remembers the bout with ${t.opponent.name}. ${words[t.outcome]}\n\n${t.rounds.length} exchanges remain in the record. Sword practice and your other studies remain open; this result neither chooses a profession nor bars you from becoming a knight.`,[choice('leave','Return to Your Day','No time, payment or repeated reward.')]);return true;
 }
 return false;
}
export function applyYardChoice(s,eventId,id,ctx){
 const t=s.yardTournament;if(!t||eventId!=='yard_'+t.pending||!local(s))return false;
 if(t.pending==='invitation'&&t.stage==='offered'){
  if(!['enter','later'].includes(id))return false;t.pending=null;
  if(id==='later')return true;
  const rival=s.life.people.find(p=>p.id===t.opponent.id);
  if(t.opponent.id!=='yard-rival'&&(!rival||rival.alive===false||rival.locationId&&rival.locationId!==s.locationId||Math.abs(rival.age-s.age)>3))t.opponent={id:'yard-rival',name:generatePersonName(s.seed,'yard-rival'),age:s.age,role:'Practice Rival'};
  if(t.opponent.id==='yard-rival')t.opponent.age=s.age;
  if(!meet(s,t.opponent))return false;t.stage='preparing';return applyYardAction(s,'yard_resume',ctx);
 }
 if(t.pending==='recall'&&id==='leave'){t.pending=null;return true;}
 if(t.pending!=='exchange'||t.stage!=='bout')return false;
 if(id==='pause'){t.pending=null;return true;}
 if(id==='withdraw'){finish(s,ctx,true);return true;}
 const i=t.rounds.length,m=moves.find(m=>id===m+'_'+i);if(!m)return false;
 const intent=t.intents[i],point=m===intent?0:beats[m]===intent?1:-1;
 t.rounds.push({move:m,intent,point,text:point===1?`Your ${m} answers the ${intent}. The instructor calls your touch.`:point===-1?`${t.opponent.name}'s ${intent} catches your ${m}. Their ribbon moves first.`:`Both choose ${m}. Neither earns a clean touch.`});
 t.pending=null;if(t.rounds.length===3)finish(s,ctx);else bout(s,ctx);return true;
}
export const yardEventIds=()=>({yard_invitation:['enter','later'],yard_exchange:[...moves.flatMap(m=>[0,1,2].map(i=>m+'_'+i)),'pause','withdraw'],yard_recall:['leave']});
export function validateYard(s){
 const t=s.yardTournament;if(t===undefined)return !s.event?.id.startsWith('yard_');
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),integer=n=>Number.isInteger(n)&&n>=0;
 if(!obj(t)||t.version!==1||!['offered','preparing','bout','finished'].includes(t.stage)||!s.world.locations.some(p=>p.id===t.locationId)||!integer(t.startedDay)||t.startedDay>s.day||![0,1].includes(t.paidDays)||![null,'invitation','exchange','recall'].includes(t.pending))return false;
 for(const p of [t.mentor,t.opponent])if(!obj(p)||typeof p.id!=='string'||!/^[a-z][a-z0-9_-]{0,79}$/.test(p.id)||!['name','role'].every(k=>typeof p[k]==='string'&&p[k].length>0&&p[k].length<=100)||!integer(p.age)||p.age>5000)return false;
 if(t.discussedIds!==undefined&&(!Array.isArray(t.discussedIds)||t.discussedIds.length>2||new Set(t.discussedIds).size!==t.discussedIds.length||t.discussedIds.some(id=>![t.mentor.id,t.opponent.id].includes(id))||t.stage!=='finished'))return false;
 if(!Array.isArray(t.intents)||t.intents.length!==3||t.intents.some((m,i)=>m!==moves[(seededRoll(s.seed,'yard-opening',3)+i)%3])||!Array.isArray(t.rounds)||t.rounds.length>3)return false;
 for(const [i,r]of t.rounds.entries())if(!obj(r)||!moves.includes(r.move)||r.intent!==t.intents[i]||r.point!==(r.move===r.intent?0:beats[r.move]===r.intent?1:-1)||typeof r.text!=='string'||r.text.length>500)return false;
 if(t.stage==='offered'&&(t.paidDays||t.rounds.length)||t.stage==='preparing'&&t.rounds.length||t.stage==='bout'&&(t.paidDays!==1||t.rounds.length>=3))return false;
 if(t.stage==='finished'){
  const score=t.rounds.reduce((n,r)=>n+r.point,0),expected=score>0?'win':score<0?'loss':'draw';
  if(!integer(t.finishedDay)||t.finishedDay<t.startedDay||t.finishedDay>s.day||!(t.outcome==='withdrawn'||t.rounds.length===3&&t.outcome===expected&&t.paidDays===1))return false;
 }else if(t.outcome!==null||t.finishedDay!==null)return false;
 if(t.pending&&s.event?.id!=='yard_'+t.pending||s.event?.id.startsWith('yard_')&&!t.pending)return false;
 if(t.pending==='invitation'&&t.stage!=='offered'||t.pending==='exchange'&&t.stage!=='bout'||t.pending==='recall'&&t.stage!=='finished')return false;
 if(t.pending==='exchange'&&JSON.stringify(s.event.choices.map(c=>c.id))!==JSON.stringify([...moves.map(m=>m+'_'+t.rounds.length),'pause','withdraw']))return false;
 return true;
}
