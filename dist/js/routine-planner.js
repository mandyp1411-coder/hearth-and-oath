// A bounded sequence of existing actions. This module never resolves a scene,
// accepts work for someone, edits resources, or supplies a second action authority.
const supported=/^(health_(rest|routine|support)|leisure_(walk|read|sketch)|life_exercise|workshop_rest|career_work)$/;
const waiting=s=>Boolean(s.event||s.battle||s.conversations?.pending||s.phase==='retired');
const symptoms=s=>JSON.stringify([s.health?.physical,s.health?.mental,s.hero.condition]);
export function routineOffers(s,actions){
 if(s.age<3||waiting(s)||s.life?.plan||s.workshop?.project||s.careers?.batch||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite||s.maze)return [];
 return actions.filter(a=>supported.test(a.id)&&a.days>=1&&a.days<=3&&!a.disabledReason).map(a=>({...a,cycles:Math.floor(7/a.days),maxDays:Math.floor(7/a.days)*a.days}));
}
export function routineReview(s,id,cycles,readers){
 const a=routineOffers(s,readers.getActions(s)).find(a=>a.id===id);
 if(!a||readers.getLifeCommitment(s)||!Number.isSafeInteger(cycles)||cycles<1||cycles>a.cycles)return null;
 return {id,label:a.label,cycles,days:a.days*cycles,directFee:(a.cost||0)*cycles,offer:JSON.stringify(a),day:s.day};
}
export function executeRoutine(original,review,readers){
 if(!review||JSON.stringify(routineReview(original,review.id,review.cycles,readers))!==JSON.stringify(review))return {state:original,completed:0,reason:'The available action or its terms changed. Review this routine again.'};
 let state=original,completed=0,reason='The reviewed routine is complete.';
 const initialSymptoms=symptoms(original),locationId=original.locationId,age=original.age;
 for(let i=0;i<review.cycles;i++){
  const a=routineOffers(state,readers.getActions(state)).find(a=>a.id===review.id);
  if(!a||readers.getLifeCommitment(state)){reason='The next activity is no longer available. Your actual progress remains.';break;}
  if(state.day-original.day+a.days>review.days){reason='The reviewed time limit has been reached.';break;}
  const before=state,next=readers.chooseAction(state,review.id);state=next;
  if(next.day-before.day>=a.days)completed++;
  if(waiting(next)||next.age!==age||next.locationId!==locationId||symptoms(next)!==initialSymptoms||readers.getLifeCommitment(next)){
   reason='The routine stopped for a decision, birthday, changed health, place or unfinished work. Review the current moment before continuing.';break;
  }
  if(next.day===before.day){reason='No further attendance was possible. Nothing was repeated.';break;}
 }
 if(state===original)return {state,completed,reason};
 const delta=state.hero.gold-original.hero.gold;
 state.notice=`${review.label}: ${state.day-original.day} actual days, ${completed}/${review.cycles} sessions completed. Gold ${delta>=0?'+':''}${delta}, including payments and household costs. ${reason}${state.notice?' Latest session: '+state.notice:''}`;
 return {state,completed,reason};
}
