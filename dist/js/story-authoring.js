// Content QA only: no RNG, eligibility bypass, save repair or effects.
export function authoredSceneIssues(scene,state,{requires={}}={}){
 const issues=[],text=v=>typeof v==='string'&&v.trim().length>0;
 if(!scene||!text(scene.title)||!text(scene.body))issues.push('A scene needs an authored title and body.');
 const choices=scene?.choices;if(!Array.isArray(choices)||!choices.length||choices.length>8)return [...issues,'A scene needs one to eight explicit choices.'];
 if(new Set(choices.map(c=>c.id)).size!==choices.length)issues.push('Choice identifiers must be unique.');
 for(const c of choices){
  if(!/^[a-z][a-z0-9_-]*$/.test(c.id)||!text(c.label)||!text(c.description))issues.push('Each choice needs a stable identifier, label and explanation.');
  for(const k of ['days','durationDays','cost','quotedCost','reward'])if(c[k]!==undefined&&(!Number.isFinite(c[k])||c[k]<0))issues.push(c.id+': invalid '+k+'.');
  if(c.terms)for(const k of ['days','cost','reward'])if(!Number.isSafeInteger(c.terms[k])||c.terms[k]<(k==='days'?1:0))issues.push(c.id+': invalid captured '+k+'.');
 }
 if(requires.speaking&&state.age<3)issues.push('This scene requires speech.');
 if(requires.adult&&state.age<18)issues.push('This scene requires adulthood.');
 if(requires.school&&!(state.education?.enrolled&&(state.education.attendanceThisYear>0||state.education.attendance>0)))issues.push('This scene requires actual school enrollment and attendance.');
 const people=[...(state.life?.people||[]),...(state.companions||[]),...(state.society?.people||[])];
 for(const id of requires.people||[]){const p=people.find(p=>p.id===id&&p.alive!==false);if(!p||requires.local&&p.locationId!==state.locationId)issues.push('A required participant is not present: '+id+'.');}
 return issues;
}
