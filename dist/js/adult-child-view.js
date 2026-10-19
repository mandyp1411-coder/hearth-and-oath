import { isSettlement } from './world.js';
const siteName=(s,id)=>s.world?.locations.find(p=>p.id===id)?.name||id||'a surviving settlement';
export const adultChildEventIds=['lineage_future','lineage_independence'];
export function adultChildGoalText(goal) {
 if(!goal)return 'consider a future of their own';
 return goal.kind==='study'?`continue free ${goal.route==='shrine'?'shrine':'community'} study`:`begin ${goal.profession.toLowerCase()} work through a supervised introduction`;
}
export function adultChildLifeView(s,p) {
 const v=p?.adultLife;if(!v)return null;
 const working=v.work?.introducedDay!==null&&v.work;
 const title=v.study?`${v.study.route==='shrine'?'Shrine':'Community'} study`:working?`${v.goal.profession} work`:`A plan for ${v.goal.profession.toLowerCase()} work`;
 const progress=v.work?`Initial placement: ${v.work.trainingDays}/14 supervised training days; ${v.work.experience} unpaid professional experience.`:`${v.study.attendance}/4 dated sessions in their free course; no new certificate.`;
 const support=v.response==='fund'?'You provided the explicitly chosen 20-gold start. The gift is not a claim over their work or home.':v.response==='listen'?'You listened to their plan without making a financial promise.':v.response==='decline'?'You explained your financial limit. They kept the same chosen direction.':'No financial support or earlier parental answer is recorded.';
 const residence=v.residence?`Independent lodgings in ${siteName(s,v.residence.locationId)}, recorded on day ${v.residence.sinceDay}.${isSettlement(s.world,v.residence.locationId)?'':' This address is currently unavailable; the earlier record remains.'}`:'An independent address has not yet been established. No second home or deed is assumed.';
 return {title,goal:adultChildGoalText(v.goal),interest:v.goal.interest,summary:`${p.name}${v.milestoneDay!==null?' chose to':' wants to'} ${adultChildGoalText(v.goal)}.`,progress,support,residence,status:v.status,milestoneReady:v.status==='milestoneReady',suspended:v.status==='suspended',educationEvidence:v.goal.basis.qualifications.length?`Their own ${v.goal.basis.qualifications.join(' and ')} qualification informed this plan.`:`Their ${v.goal.basis.attendance} actually attended earlier school sessions remain their own preparation.`};
}
export function adultChildChoiceOutcome(s,p,eventId,choice) {
 const v=p?.adultLife;if(!v)return '';
 if(choice==='leave')return `You leave ${p.name}'s own plan and recorded progress unchanged. No fee or new promise is made.`;
 if(eventId==='lineage_future') {
  if(choice==='fund')return `You provide the one-off 20-gold start ${p.name} requested for materials and independent lodgings preparation. They still intend to ${adultChildGoalText(v.goal)}. The gift shortens residence preparation from ninety to sixty eligible days; it grants no wages, qualification or authority over their life.`;
  if(choice==='listen')return `You ask ${p.name} what they want their first weeks to be like and listen to the answer. Their plan to ${adultChildGoalText(v.goal)} remains theirs. No gold, wage or financial promise changes hands.`;
  if(choice==='decline')return `You tell ${p.name} what you can afford without asking them to change their direction. They continue toward ${adultChildGoalText(v.goal)} and an independent address through their ordinary preparation. No gold is taken and no failure or lost affection is invented.`;
 }
 if(eventId==='lineage_independence') {
  const prior=v.response==='fund'?'They remember your 20-gold help, and that it bought neither their occupation nor ownership of their address.':v.response==='listen'?'They remember that you heard their plans without making a financial promise.':v.response==='decline'?'Your earlier financial boundary remains part of the account; it did not decide their identity.':'There was no earlier support agreement to pretend you made.';
  const place=siteName(s,v.residence?.locationId);
  if(choice==='company')return `You accept ${p.name}'s invitation to hear about their work and their independent lodgings in ${place}. They tell the part they want to share. ${prior}`;
  if(choice==='celebrate')return `You celebrate ${p.name}'s recorded beginning in ${place}, naming their own learning and effort rather than treating it as your achievement. ${prior}`;
  if(choice==='space')return `You wish ${p.name} well in their independent lodgings in ${place} and let them decide when to invite company. Their address grants no ownership or permanent invitation. ${prior}`;
 }
 return '';
}

export function adultChildOwnMemory(s,p,eventId,choice) {
 const goal=adultChildGoalText(p.adultLife.goal),parent=s.hero.name;
 if(eventId==='lineage_future') {
  const answer=choice==='fund'?`${parent} provided a one-off 20-gold start for materials and lodgings preparation`:choice==='listen'?`${parent} listened without making a financial promise`:`${parent} explained a financial limit without requiring a different identity`;
  return `${answer}. ${p.name} kept their own plan to ${goal}.`;
 }
 return `${p.name} shared their actual beginning and independent lodgings with ${parent}. ${parent} ${choice==='company'?'accepted the invitation to hear about their first weeks':choice==='celebrate'?'celebrated their own learning and effort':'respected their choice of when to invite company'}. The recorded address created no claim of ownership.`;
}
