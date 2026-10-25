import { seededRoll, isSettlement } from './world.js';
import { isLiterate } from './schooling.js';
import { rememberResident, projectLifePerson } from './world-people-v31.js';

export const MISDEEDS=Object.freeze([
 {id:'prank',label:'Pull a Prank',age:6,attributes:['agility','presence'],dc:10,evidence:1},
 {id:'theft',label:'Steal',age:12,attributes:['agility','intellect'],dc:13,evidence:2},
 {id:'manipulate',label:'Manipulate Someone',age:12,attributes:['presence','intellect'],dc:14,evidence:0},
 {id:'extort',label:'Extort Gold',age:16,attributes:['strength','presence'],dc:16,evidence:3},
 {id:'murder',label:'Attempt Murder',age:18,attributes:['strength','agility'],dc:19,evidence:8},
]);
export const LEISURE_OPTIONS=Object.freeze([
 {id:'outdoors',label:'Spend Time Outdoors',where:'any',cost:0,joy:5,relief:8,focus:3,title:'A Day in the Open Air',text:'You spend an unhurried day outdoors and return with a clearer head.'},
 {id:'sketch',label:'Sketch Your Surroundings',where:'any',cost:0,joy:6,relief:8,focus:0,title:'A Page of Sketches',text:'You settle down with a page and sketch what is around you. The quiet work helps you unwind.'},
 {id:'picnic',label:'Have a Picnic',where:'settlement',cost:4,joy:8,relief:10,focus:3,title:'An Afternoon Picnic',text:'You buy a small picnic in town and find a quiet spot to enjoy it.'},
 {id:'music',label:'Listen to Music at the Tavern',where:'tavern',cost:3,joy:8,relief:12,focus:0,title:'An Evening of Music',text:'You settle near the hearth and listen to the evening songs. There is no work to arrange and no promise to make.'},
 {id:'meal',label:'Eat at the Tavern',where:'tavern',cost:6,joy:6,relief:8,focus:3,health:6,title:'A Warm Meal',text:'The innkeeper brings a warm meal. You take your time over it and leave feeling better.'},
 {id:'boardgames',label:'Play Board Games at the Tavern',where:'tavern',cost:2,joy:7,relief:10,focus:0,title:'An Evening of Board Games',text:'You spend the evening at a games table. The stakes are small and the game is its own reward.'}
]);
const leisureKeys=['walk','read','drink','circle',...LEISURE_OPTIONS.map(o=>o.id)];
const blocked=s=>!s.socialLife||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.cartography?.offsite||s.cartography?.pending||s.timeline?.journey||s.justice?.prison||s.maze||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.pastimes?.pending||s.social?.pending;
const clamp=n=>Math.max(0,Math.min(100,n));
const room=s=>s.cartography?.interior?.roomId||'gate';
const mood=(s,joy,stress)=>{s.life.happiness=clamp(s.life.happiness+joy);s.life.stress=clamp(s.life.stress+stress);};
const purse=(s,id)=>s.justice.crimePurses?.[id]??20+seededRoll(s.seed,'civilian-purse:'+id,21);
const offer=(id,label,description,days=1,cost=0,reason=null)=>({id,label,description,days,cost,group:'Activities',...(reason?{disabledReason:reason}:{})});
export function localActivityPeople(s,contacts=[]){return contacts.filter(p=>p.available!==false&&p.alive!==false&&!p.retired&&!p.commitmentOnly&&p.age>=18&&p.locationId===s.locationId&&(!p.roomId||p.roomId===room(s))&&(p.population||s.life.people.some(x=>x.id===p.id&&x.alive!==false)));}
export function crimeCheck(s,crime){
 const bonus=Math.min(10,Math.floor(crime.attributes.reduce((n,key)=>n+(s.hero.attributes[key]||0),0)/6));
 const wins=Array.from({length:20},(_,i)=>i+1).filter(die=>die===20||die!==1&&die+bonus>=crime.dc).length;
 return {bonus,dc:crime.dc,chance:wins*5};
}
export function daylifeActions(s,contacts=[]){
 if(blocked(s))return [];
 const local=isSettlement(s.world,s.locationId)&&!['destroyed','evacuated'].includes(s.world.locations.find(p=>p.id===s.locationId)?.status),people=localActivityPeople(s,contacts),rows=[],last=s.socialLife.leisure?.last||{};
 const used=id=>last[id]===s.day?'Choose something else for the rest of today.':null;
 if(s.age>=6)for(const o of LEISURE_OPTIONS){
  const placeReason=o.where==='tavern'&&(!local||room(s)!=='tavern')?'Go to the Tavern first.':o.where==='settlement'&&!local?'Visit a settlement for this outing.':null;
  const effects=[`${o.joy} Joy`,`${o.relief} less Stress`,o.focus?`${o.focus} Focus`:null,o.health?`${o.health} Health`:null].filter(Boolean).join(' · ');
  rows.push(offer('leisure_'+o.id,o.label,`Spend a day unwinding. ${effects}.`,1,o.cost,placeReason||(s.hero.gold<o.cost?`Requires ${o.cost} Gold.`:null)||used(o.id)));
 }
 if(s.age>=6&&local){
  rows.push(offer('leisure_walk','Take a Walk','Spend a day following the paths around town. Gain 4 Joy and reduce Stress by 5.',1,0,used('walk')));
  if(s.age>=12)rows.push(offer('leisure_read','Read on Your Own','Settle down with a borrowed book for a day. Practice scholarship and reduce Stress by 3.',1,0,!isLiterate(s)?'You cannot read.':used('read')));
  if(s.age>=18)rows.push(offer('leisure_drink','Have Drinks at the Tavern','Spend 4 Gold and an evening at the tavern. Gain 8 Joy, reduce Stress by 6 and lose 6 Focus. Another round while tipsy costs Health.',1,4,room(s)!=='tavern'?'Go to the Tavern first.':s.hero.gold<4?'Requires 4 Gold.':used('drink')));
  const circle=people.filter(p=>p.bond>=40&&(s.conversations?.meetings?.[p.id]||s.life.people.some(x=>x.id===p.id)||s.socialLife.met[p.id]));
  if(circle.length)rows.push(offer('leisure_circle','Hang Out with Your Circle','Share a meal, a walk or games with '+circle.slice(0,4).map(p=>p.name).join(', ')+'. Gain 7 Joy and reduce Stress by 5. This outing starts no conversation or courtship.',1,0,used('circle')));
 }
 if(local)for(const crime of MISDEEDS){if(s.age<crime.age)continue;const check=crimeCheck(s,crime);for(const p of people)rows.push({...offer(`misdeed_${crime.id}_${p.id}`,crime.label+' — '+p.name,`d20 + ${check.bonus} against ${check.dc} · ${check.chance}% success. ${crime.id==='murder'?'Success kills this person permanently. A witnessed attempt creates a serious local charge.':crime.id==='manipulate'?'Try to win an unfair favour. Discovery damages their trust.':crime.id==='prank'?'A joke at their expense. Failure upsets them and can draw a complaint.':'Taken Gold and threats can be reported to the local watch.'}`,1,0,s.socialLife.leisure?.crimeDay===s.day?'Let the rest of this day pass before another attempt.':['theft','extort'].includes(crime.id)&&purse(s,p.id)===0?'They have no Gold left to take.':Object.keys(s.justice.crimePurses||{}).length>=512&&!Object.hasOwn(s.justice.crimePurses,p.id)?'Your record of taken property is full.':null),crime:crime.id,targetId:p.id,...check});}
 return rows;
}
function record(s,ctx,title,text){s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'life');}
export function applyDaylifeAction(s,id,ctx,contacts=[]){
 const a=daylifeActions(s,contacts).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;
 const before=s.day;if(ctx.spendDays(1)!==1||s.phase==='retired'){s.notice='Your day was interrupted. No fee, roll or reward was taken.';return true;}
 if(s.event||s.battle||s.conversations?.pending){s.notice='Another moment interrupts your plans. No fee, roll or reward was taken.';return true;}
 const ledger=s.socialLife.leisure||={version:1,last:{},rounds:0,crimeDay:null};
 if(id.startsWith('leisure_')){
  const kind=id.slice(8);if(a.cost>s.hero.gold){s.notice='You no longer have enough Gold. No fee was taken.';return true;}
  const circle=localActivityPeople(s,ctx.contacts?.()||contacts).filter(p=>p.bond>=40&&(s.conversations?.meetings?.[p.id]||s.life.people.some(x=>x.id===p.id)||s.socialLife.met[p.id]));
  if(kind==='circle'&&!circle.length){s.notice='Your company had to leave before the outing. You spent the day on your own.';return true;}
  s.hero.gold-=a.cost;ledger.last[kind]=s.day;
  const outing=LEISURE_OPTIONS.find(o=>o.id===kind);
  if(outing){mood(s,outing.joy,-outing.relief);s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+outing.focus);if(outing.health)s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+outing.health);record(s,ctx,outing.title,`${outing.text} Stress falls by ${outing.relief}; Joy rises by ${outing.joy}.${outing.focus?' Recover up to '+outing.focus+' Focus.':''}${outing.health?' Recover up to '+outing.health+' Health.':''}`);}
  if(kind==='walk'){mood(s,4,-5);record(s,ctx,'A Walk Around Town','You take the long way around town and return with a clearer head.');}
  if(kind==='read'){s.hero.skills.scholarship++;mood(s,2,-3);record(s,ctx,'A Quiet Book','You spend the day reading on your own. Your scholarship improves.');}
  if(kind==='circle'){mood(s,7,-5);record(s,ctx,'An Afternoon Out','You share food and games with '+circle.slice(0,4).map(p=>p.name).join(', ')+'. The afternoon brings no promises or new relationship.');}
  if(kind==='drink'){const again=(ledger.tipsyUntil||0)>=before;ledger.rounds++;ledger.tipsyUntil=s.day+2;mood(s,8,-6);s.hero.mp=Math.max(0,s.hero.mp-6);if(again)s.hero.hp=Math.max(1,s.hero.hp-4);record(s,ctx,'An Evening at the Tavern',again?'Another round leaves you drunk. You lose 6 Focus and 4 Health.':'You share an evening at the tavern and leave tipsy. The drinks cost 4 Gold and 6 Focus.');}
  return true;
 }
 const crime=MISDEEDS.find(c=>c.id===a.crime),p=localActivityPeople(s,ctx.contacts?.()||contacts).find(p=>p.id===a.targetId);
 if(!p){s.notice='They are no longer here. No crime, roll or reward was recorded.';return true;}
 rememberResident(s,p);const existing=s.life.people.find(x=>x.id===p.id),person=existing||projectLifePerson(s,p,{relationship:'acquaintance'});if(!person){s.notice='This person could not be recorded. No attempt was made.';return true;}if(!existing)person.relation='acquaintance';ctx.registerWorldPerson?.(person);
 const n=(s.justice.crimeRolls||0)+1;s.justice.crimeRolls=n;ledger.crimeDay=s.day;
 const die=1+seededRoll(s.seed,`misdeed:${s.dynasty?.generation||1}:${n}:${a.crime}:${p.id}`,20),success=die===20||die!==1&&die+a.bonus>=a.dc;
 const caught=!success||seededRoll(s.seed,`misdeed:witness:${n}`,100)<(crime.id==='murder'?80:crime.id==='extort'?65:30);
 let result='';
 if(success){
  if(crime.id==='theft'||crime.id==='extort'){const gold=Math.min(purse(s,p.id),crime.id==='theft'?3+seededRoll(s.seed,'stolen-purse:'+n,8):10+seededRoll(s.seed,'extorted-purse:'+n,16));s.justice.crimePurses||={};s.justice.crimePurses[p.id]=purse(s,p.id)-gold;s.hero.gold+=gold;result=`You take ${gold} Gold from ${p.name}.`;}
  if(crime.id==='prank'){mood(s,3,0);result=`Your prank works, at ${p.name}’s expense.`;}
  if(crime.id==='manipulate'){mood(s,2,0);result=`${p.name} does your share of an errand. You feel less stressed, but you have used their goodwill.`;s.life.stress=clamp(s.life.stress-3);}
  if(crime.id==='murder'){if(!ctx.killPerson?.(person.id,'Killed by '+s.hero.name)){s.justice.crimeRolls--;ledger.crimeDay=null;s.notice='This named life could not be resolved. No outcome was granted.';return true;}result=`You kill ${p.name}. Their death and surviving relationships remain in the world.`;}
 }else result=`The attempt against ${p.name} fails.`;
 if(caught){person.bond=Math.max(0,person.bond-(crime.id==='murder'?80:crime.id==='extort'?35:15));if(crime.evidence)ctx.addEvidence(crime.evidence,`${p.name} ${success&&crime.id==='murder'?'was killed; witnesses identify':'reports '+crime.label.toLowerCase()+' by'} ${s.hero.name}.`);ctx.standing('villagers',crime.id==='murder'?-20:-4);result+=crime.evidence?' The local watch receives evidence.':' They realize you used their trust.';}
 if(['theft','extort','murder','manipulate'].includes(crime.id))ctx.breakOath('You chose '+crime.label.toLowerCase()+' against '+p.name+'.');
 const text=`d20 ${die} + ${a.bonus} = ${die+a.bonus} against ${a.dc} · ${success?'Success':'Failure'}. ${result}`;
 s.justice.crimeHistory=[...(s.justice.crimeHistory||[]),{day:s.day,kind:crime.id,personId:p.id,die,bonus:a.bonus,dc:a.dc,success,caught}].slice(-40);record(s,ctx,crime.label,text);return true;
}
export function validateDaylife(s){
 const v=s.socialLife?.leisure,int=(n,a=0,b=s.day)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 if(v!==undefined&&(!v||typeof v!=='object'||Array.isArray(v)||!v.last||typeof v.last!=='object'||Array.isArray(v.last)||v.version!==1||Object.keys(v.last).some(k=>!leisureKeys.includes(k))||!Object.values(v.last).every(n=>int(n))||!int(v.rounds,0,1000000)||!(v.crimeDay===null||int(v.crimeDay))||v.tipsyUntil!==undefined&&!int(v.tipsyUntil,0,s.day+2)))return false;
 if(s.justice?.crimeRolls!==undefined&&!int(s.justice.crimeRolls,0,1000000))return false;
 if(s.justice?.crimePurses!==undefined&&(typeof s.justice.crimePurses!=='object'||Array.isArray(s.justice.crimePurses)||Object.keys(s.justice.crimePurses).length>512||!Object.entries(s.justice.crimePurses).every(([id,n])=>/^[a-z][a-z0-9_-]{0,99}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id)&&int(n,0,40))))return false;
 if(s.justice?.crimeHistory!==undefined&&(!Array.isArray(s.justice.crimeHistory)||s.justice.crimeHistory.length>40||!s.justice.crimeHistory.every(r=>int(r.day)&&MISDEEDS.some(c=>c.id===r.kind)&&typeof r.personId==='string'&&r.personId.length<=100&&int(r.die,1,20)&&int(r.bonus,0,10)&&int(r.dc,10,19)&&typeof r.success==='boolean'&&r.success===(r.die===20||r.die!==1&&r.die+r.bonus>=r.dc)&&typeof r.caught==='boolean')))return false;
 return true;
}
