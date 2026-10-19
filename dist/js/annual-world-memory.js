const picks=['care','curiosity','courage'];
const recurring={
  'A warning before the long road':{
    past:['preserved a guide’s warning before travel','checked the repair records before accepting a road claim','prepared for a safer commission instead of a hurried departure'],
    body:'Another inspection reaches the road table. The earlier account is still dated in the book; this season’s rain has exposed a different loose footing. The guide asks which warning or repair record should accompany the next departure.',
    outcomes:['The guide posts the newly dated warning beside the earlier account. Travelers can distinguish the old report from the changed footing.','You compare the new sketch with the dated repair pages. The inspection records what has changed without claiming an unmade repair.','You prepare the supplies for a safer local commission. The changed road remains marked as uncertain rather than quietly declared repaired.'],
  },
  'The festival work nobody planned':{
    past:['completed a paid repair and recorded the helpers','asked patrons to fund safety before decoration','taught volunteers a repair and protected time to rest'],
    body:'The festival book still carries the earlier repair account. This year the old benches hold, but a newly added row of lantern hooks has pulled loose. The keeper brings a fresh estimate before buying another banner.',
    outcomes:['You finish the new fittings and put this season’s helpers and fees beside the earlier repair account. The old work is not billed twice.','The patron sets the new safety estimate ahead of decoration. The earlier repairs remain completed in the festival book.','The volunteers learn to fit the new hooks safely. You leave after the agreed lesson, with the earlier work still credited.'],
  },
  'A commission with an unnamed buyer':{
    past:['completed the honest household’s commission','requested written terms before deciding','declined the offers to preserve time for your own craft'],
    body:'A fresh pair of commissions reaches your bench. One household signs a new maintenance request; another buyer still refuses to name who will use the work. You keep the earlier decision dated beside the new estimates.',
    outcomes:['The household collects its new maintenance work. This payment belongs to a new, signed commission; the earlier agreement keeps its own result.','You request terms for the new offer and keep the old decision dated separately. An unanswered request is not a finished contract.','You decline these new commissions and finish work of your own. The earlier choice remains part of how you set your limits.'],
  },
  'A household asks for quiet company':{
    past:['offered quiet company without demanding a confession','helped a neighbor arrange the support they chose','completed a practical errand within clear limits'],
    body:'Another household asks for company through a difficult season. You remember the help you offered before. These neighbors have their own care routine and ask for one quiet visit, with room to decide what they want to share.',
    outcomes:['You listen while the household decides what to share. This evening joins the earlier memory of care without promising a cure.','The household chooses its next source of support. You help with that request while keeping the earlier account and its limits intact.','You complete the errand you agreed to do and leave time to rest. The help already given does not become an unlimited obligation.'],
  },
};

export function rememberAnnualScene(s,source){
  const edition=recurring[source.title];if(!edition)return source;
  const prior=s.timeline.yearHistory.findLast(r=>r.age<s.age&&r.title===source.title&&(!r.locationId||r.locationId===s.locationId)&&picks.includes(r.choice));
  if(!prior)return source;
  const memory=`At age ${prior.age}, you ${edition.past[picks.indexOf(prior.choice)]}.`;
  return {...source,body:`${memory} ${edition.body}`,choices:source.choices.map((c,i)=>({...c,outcome:edition.outcomes[i]}))};
}
export function captureAnnualScene(s,scene){
  s.timeline.annualScene={version:1,age:s.age,day:s.day,locationId:s.locationId,scenarioId:scene.scenarioId,title:scene.title,body:scene.body,outcomes:scene.choices.map(c=>c.outcome||`${c.label}. ${c.description}`)};
}
export function annualSceneAtChoice(s,source){
  const v=s.timeline.annualScene;
  return v&&v.age===s.age&&v.day===s.day&&v.scenarioId===source.scenarioId?{...source,...(s.narrativeEdition===30?{title:v.title}:{}),body:v.body,choices:source.choices.map((c,i)=>({...c,outcome:v.outcomes[i]}))}:source;
}
export function validateAnnualScene(v,s){
  if(v===undefined)return true;
  const str=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n;
  return v&&v.version===1&&Number.isSafeInteger(v.age)&&v.age>18&&v.age===s.age&&v.day===s.day&&s.world.locations.some(p=>p.id===v.locationId)&&v.locationId===s.locationId&&str(v.scenarioId,160)&&str(v.title,500)&&str(v.body,3000)&&Array.isArray(v.outcomes)&&v.outcomes.length===3&&v.outcomes.every(x=>str(x,2000))&&s.event?.id==='birth_adult_year'&&s.event.title===v.title&&s.event.body===v.body;
}
