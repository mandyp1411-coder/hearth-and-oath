import { isSettlement } from './world.js';
import { bloodMealRelief, bloodHungerRate } from './curses.js';

export function feedingAtHearth(s){return !s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey&&!s.justice?.prison&&isSettlement(s.world,s.locationId);}
const mealFor = (eventId,id) => id==='animal'?{version:13,source:'animal',baseAmount:45}:id==='donor'?{version:13,source:'donor',baseAmount:60}:id==='predation'?{version:13,source:'predation',baseAmount:70}:id==='jailer'&&eventId==='life_hunger'?{version:13,source:'animal',baseAmount:30}:null;
export function validateFeedingTerms(event){
  return !event?.choices?.some(c=>{
    if(c.meal===undefined)return false;
    if(!['life_hunger','vampire_feeding'].includes(event.id))return true;
    const expected=mealFor(event.id,c.id),m=c.meal;
    return !expected||!m||Object.keys(m).sort().join(',')!=='baseAmount,source,version'||m.version!==13||m.source!==expected.source||m.baseAmount!==expected.baseAmount;
  });
}
export function feedingChoices(s,id,choices){
  const hearth=feedingAtHearth(s),prison=id==='life_hunger'&&s.justice?.prison;
  const offered=choices.filter(c=>!['donor','predation'].includes(c.id)||hearth).map(c=>{
    const key=c.id==='animal'&&prison?'jailer':c.id,meal=mealFor(id,key);if(!meal)return c;
    const relief=bloodMealRelief(s.hero.condition,meal.source,meal.baseAmount),days=id==='life_hunger'?`Take one actual sheltered day; hunger still rises by ${bloodHungerRate(s.hero.condition)} during it. `:'The feeding day has already been attended; this choice spends no extra day. ';
    const portion=key==='jailer'?'A limited emergency animal ration':key==='animal'?'A full animal meal':key==='donor'?'A full consenting donor meal':'An unwilling feeding';
    const consequence=key==='jailer'?'The jailer records this disclosure locally; it does not acquit an assault or cancel a warrant.':key==='donor'?'Spend 8 gold. The donor keeps your confidence; no assault or official evidence is created.':key==='predation'?'A witness reports an assault: three local evidence, lost trust and a broken paladin oath.':'No fee or person harmed. Animal relief follows your lineage, rather than an elemental combat weakness.';
    return {...c,id:key,...(key==='jailer'?{label:'Ask the jailer for an emergency animal ration'}:{}),description:`${days}${portion} relieves up to ${relief} hunger${meal.source==='animal'?` (${meal.baseAmount} before the animal-blood adjustment)`:''}. ${consequence}`,meal};
  });
  if(id==='life_hunger'&&!offered.some(c=>c.id==='endure'))offered.push({id:'endure',label:'Endure one more night without blood',description:'Spend one real sheltered day without feeding. Hunger, stress and starvation damage continue. The birthday and other calendar decisions still happen; refusal can end this life.'});
  return offered;
}
export function feedingScene(s){
  const hearth=feedingAtHearth(s),place=s.world.locations.find(p=>p.id===s.locationId),clinic=hearth&&(place.services||[]).some(id=>['clinic','healer'].includes(id));
  return `Your hunger is ${s.hero.condition.hunger}/100. ${clinic?'The local healers can introduce a willing donor.':hearth?'At this surviving hearth, a willing local donor may agree to a private meal.':'Beyond the inhabited hearths, the dark offers only small prey. Return to a surviving settlement to seek a willing donor.'} ${hearth?'Attacking a traveler creates a witnessed local assault and crosses your companions’ stated limits.':'The night answers with wingbeats and the sound of rain.'}`;
}
