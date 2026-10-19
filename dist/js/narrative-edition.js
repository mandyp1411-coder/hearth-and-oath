import { personalFlavor } from './story-flavor.js';
import { aftermathProse, lifeEpilogue } from './world-prose-v30.js';
import { groundedEvent, groundedOutcome, groundedRecord, groundedQuest, groundedNote } from './grounded-narrative-content.js';
import { recordedDeed, chapterTerms, storyDeeds } from './story-continuity.js';
/** Keep the simulation's typed terms; this edition owns every live story surface. */
export function editionEvent(s,event){
 if(s.narrativeEdition!==30||!event)return event;
 // This ending-specific account is already selected and captured by the campaign.
 if(event.id==='quest_followup'&&s.campaign?.pending?.contentVersion===25&&Number.isInteger(s.campaign.pending.sceneIndex))return {...event,narrativeEdition:30};
 const prose=event.id==='quest_followup'?aftermathProse(s,groundedEvent(s,event)):groundedEvent(s,event);
 if(event.id==='stories_chapter'){
  const arc=s.stories?.arcs.find(a=>a.id===s.stories.pending?.arcId),facts=arc&&storyDeeds(arc),who=arc&&[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[]),...(s.life?.children||[])].find(p=>p.id===arc.personId);
  if(arc&&who?.alive===false)prose.body=`${arc.personName} has died. The unfinished work remains in ${s.world.locations.find(p=>p.id===arc.locationId)?.name||'the settlement'}. You can finish the practical work or leave it behind.`;
  else if(arc&&who?.locationId&&who.locationId!==s.locationId){prose.body=`You return to the work you discussed with ${arc.personName}. They are away from here, but your notes still describe the task in ${s.world.locations.find(p=>p.id===arc.locationId)?.name||'this place'}. Choose how to handle the unfinished work.\n\nThe saved proposal reads:\n${event.body}`;}
  if(facts){const memory=facts.unpaid?`The unpaid-work tally records the wages still owed to ${arc.personName}.${facts.credit?'':' The shared credit remains intact.'}`:facts.falseReport?'Your earlier false accusation still affects their work.':facts.credit?`${arc.personName} asks you to put their name back on the work they did.`:facts.archive?'The restriction still blocks access to the teaching material; the names already on the work remain credited.':facts.route?'They have not forgotten that you sold their private route.':facts.gate?'The admission rule you imposed is still keeping people out.':facts.suppressed?'They ask you to release the story you withheld.':'';if(memory)prose.body=memory+'\n\n'+prose.body;}
 }

 return {...event,...prose,narrativeEdition:30,choices:(prose.choices||event.choices).map(c=>({...c,description:c.description||'Choose this approach.'}))};
}
export function editionScene(s,source,eventId){
 if(s.narrativeEdition!==30)return source;
 const context=s.timeline?.storybook?{...s,timeline:{...s.timeline,storybook:{...s.timeline.storybook,pending:{age:s.age,day:s.day,scene:source}}}}:s;
 const v=editionEvent(context,{...source,id:eventId,choices:source.choices.map(c=>({...c,sceneId:source.id}))});
 return {...source,title:v.title,body:v.body,choices:v.choices.map(c=>({...c,outcome:groundedOutcome(context,{eventId,choice:c})})),narrativeEdition:30};
}
export function editionStoryRow(s,arc,row,{prospective=false}={}){
 if(s.narrativeEdition!==30)return row;
 // Deed and fee inference belongs to the old typed row, before any copy changes.
 const ids=['care','enterprise','coercion'];
 const captured=row.slice(1).map((c,i)=>({...c,deed:c.deed||recordedDeed(arc,{...c,id:ids[i]}),terms:chapterTerms(arc,ids[i],row),id:ids[i]}));
 if(prospective&&arc.id==='hearth_letter'&&arc.chapter<3)return personalFlavor(arc,[row[0],...captured]);
 const context={...s,stories:{...s.stories,pending:{arcId:arc.id,chapter:arc.chapter}}};
 const v=editionEvent(context,{id:'stories_chapter',title:arc.title||arc.id,body:row[0],choices:captured});
 return [v.body,...captured.map((c,i)=>({...c,label:v.choices[i].label,outcome:groundedOutcome(context,{eventId:'stories_chapter',choice:c,personName:arc.personName,locationId:arc.locationId})}))];
}
export function editionHistory(s,record,kind='journal'){
 if(s.narrativeEdition!==30||record.narrativeEdition===30)return record;
 const place=id=>s.world.locations.find(p=>p.id===id)?.name||'the recorded settlement';
 if(['home_displaced','households_displaced'].includes(record.eventId))return {...record,title:record.eventId==='home_displaced'?'Your Home Was Lost':'Families Find Shelter',text:record.eventId==='home_displaced'?`Your home in ${place(record.locationId)} can no longer shelter your household. You have temporary lodgings in ${place(record.destinationId)}.`:`People displaced from ${place(record.locationId)} have gone to ${place(record.destinationId)} for shelter.`,narrativeEdition:30};
 if(record.eventId==='person_died'&&record.personName)return {...record,title:`Remembering ${record.personName}`,text:`${record.personName} died at age ${record.personAge}. Your shared memories remain in Relationships.`,narrativeEdition:30};
 const v=groundedRecord(s,record,{kind});return {...record,...v,narrativeEdition:30};
}
/** Update live world copy while preserving the words actually captured in a save. */
export function upgradeNarrative(s){
 if(s.narrativeEdition===30)return false;
 // A saved place description can include an actual outbreak or local law.
 // New worlds receive current prose when generated; import keeps its evidence.
 s.narrativeEdition=30;
 for(const r of s.journal)r.narrativeEdition=30;
 for(const t of Object.values(s.conversations?.threads||{}))for(const m of t)m.narrativeEdition=30;
 for(const r of [...(s.timeline?.yearHistory||[]),...(s.life?.yearHistory||[])])r.narrativeEdition=30;
 for(const a of s.stories?.arcs||[])for(const c of a.choices){c.deed ||= recordedDeed(a,c);c.narrativeEdition=30;}
 // Pending proposals, quoted terms, letters, memories and outcomes are historical
 // evidence. Their old wording must survive import, even when current copy differs.
 if(s.event)s.event.narrativeEdition=30;
 return true;
}
/** Older producers cannot leak their opaque history text back into the Journal. */
export function refreshNarrativeRecords(s){
 if(s.narrativeEdition!==30)return;
 // Recover only a uniquely linked current-life childhood account. Never infer
 // an actor from today's household or conflate two events on the same day.
 for(const r of s.journal){
  if(r.tag!=='childhood'||r.generation&&r.generation!==(s.dynasty?.generation||1)||!/^Day \d+, age \d+\. This marks an earlier childhood event\./.test(r.text||''))continue;
  const matches=(s.timeline?.storybook?.records||[]).filter(b=>b.age===r.age&&b.day===r.day&&b.outcome&&!/This marks an earlier/.test(b.outcome));
  if(matches.length!==1)continue;
  const b=matches[0],annual=(s.timeline.yearHistory||[]).filter(y=>y.age===b.age&&y.day===b.day&&y.choice===b.choice);
  r.title=annual.length===1&&annual[0].title?annual[0].title:'A recorded childhood moment';r.text=b.outcome;r.narrativeEdition=30;
 }
 s.journal=s.journal.map(r=>editionHistory(s,r));
 if(s.chronicle)s.chronicle=lifeEpilogue(s);
}
