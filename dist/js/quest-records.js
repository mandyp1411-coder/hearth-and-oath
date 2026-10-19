import { researchDefinition, researchInterpretation } from './research-definitions.js';
import { originJournalRows, originView } from './family-origins.js';
import { regionalQuestRows } from './regional-world-v33.js';
import { campaignView } from './campaign.js';
import { storyView, storyInvitations, LIFE_STORIES } from './life-stories.js';
import { adventureView, contractArchive } from './adventuring.js';
import { CLOSING_QUEST_KINDS, personalStoryState } from './undertaking-contract.js';

export function questReturnForecast(s){
  // Legacy adult play starts at age eighteen on day zero; viewing later must not move a return date.
  const birth=s.timeline?.mode==='birth'?s.timeline.birthDay||0:-18*365;
  return (storyView(s)?.arcs||[]).filter(a=>a.chapter>0&&['active','paused'].includes(a.status)).map(a=>({
    id:a.id,title:a.title,personName:a.personName,locationId:a.locationId,nextAge:a.nextAge,
    dueDay:birth+a.nextAge*365,ready:s.age>=a.nextAge,paused:a.status==='paused',
    lastChoice:a.choices.at(-1)?.label||'No chapter decision recorded yet.',
  })).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id));
}

export function trackedQuest(s){
  if(s.phase==='retired')return null;
  const key=s.questLog?.tracked,c=campaignView(s);
  if(key==='family-origin'){const row=originJournalRows(s).find(r=>!r.paused);return row?{...row,key}:null;}
  if(key==='main'&&s.questLog.main==='active'&&!c.ending){const q=c.quests.find(q=>!q.id.startsWith('side_')&&!['completed','locked'].includes(q.status));return q?{...q,key,title:c.title}:null;}
  if(key?.startsWith('side_')&&s.questLog.entries[key]?.status==='active'){const q=c.quests.find(q=>q.id===key&&q.status!=='completed');return q?{...q,key}:null;}
  const arc=(storyView(s)?.arcs||[]).find(a=>key==='story:'+a.id&&a.status==='active');
  if(arc)return {key,title:arc.title,locationId:arc.locationId,objective:`${arc.personName}: ${s.age<arc.nextAge?'returns at age '+arc.nextAge:'the next chapter is ready'}. Last choice: ${arc.choices.at(-1)?.label||'No choice recorded yet'}.`};
  const political=regionalQuestRows(s).find(q=>q.key===key);if(political)return political;
  const contract=(adventureView(s)?.contracts||[]).find(c=>key==='radiant:'+c.id&&['active','ready'].includes(c.status)&&!c.paused);
  return contract?{key,title:contract.title,locationId:contract.status==='ready'?contract.boardId:contract.destinationId,objective:contract.status==='ready'?`Return earned proof to ${contract.giver.name} at ${contract.board}.`:`${contract.brief} Destination: ${contract.destination}.`}:null;
}

function questAccounts(s){
  const c=campaignView(s),rows=[{kind:'main',id:'main',title:'The Ashfall Covenant',status:c.ending?'completed':s.questLog?.main==='active'?'unfinished':s.questLog?.main==='paused'?'paused':'neverAccepted',detail:'The long investigation'}];
  for(const run of s.researchPortfolio?.runs||[])rows.push({kind:'personal',id:run.id,title:researchDefinition(run.definitionId).title,status:run.status==='active'?'unfinished':run.status==='completed'?'completed':run.status==='withdrawn'?'abandoned':'unfinished',detail:researchInterpretation(run.definitionId,run.interpretationId)?.conclusion||'An accepted finite research question; sources and open questions remain recorded'});
  const family=originView(s);if(family.run)rows.push({kind:'personal',id:'family-origin',title:family.title,status:{active:'unfinished',paused:'paused',completed:'completed',stopped:'abandoned',left_unfinished:'unfinished'}[family.run.status],detail:family.run.history.at(-1)?.text||'An accepted family-record search'});else if(family.offered)rows.push({kind:'personal',id:'family-origin-invitation',title:family.title,status:'neverAccepted',detail:'An invitation, not an accepted search'});
  for(const q of c.quests.filter(q=>q.id.startsWith('side_')&&q.status!=='locked')){
    const status=s.questLog?.entries[q.id]?.status;
    rows.push({kind:'side',id:q.id,title:q.title,status:q.status==='completed'?'completed':status==='active'?'unfinished':status==='paused'?'paused':'neverAccepted',detail:q.objective});
  }
  for(const arc of storyView(s)?.arcs||[]){const state=personalStoryState(arc,s.stories?.project);rows.push({kind:'personal',id:arc.id,title:arc.title,status:state==='considering'?'neverAccepted':state==='accepted'||state==='active'?'unfinished':state,detail:`${arc.personName} · ${arc.chapter}/${arc.totalChapters} chapters · last choice: ${arc.choices.at(-1)?.label||'No chapter decision yet'}`});}
  for(const q of regionalQuestRows(s).concat(regionalQuestRows(s,{archive:true})))rows.push({kind:'regional',id:q.key,title:q.title,status:q.status==='active'?'unfinished':q.status,detail:q.result||q.objective});
  const invitationIds=new Set(storyInvitations(s).map(a=>a.id));
  for(const id of Object.keys(s.stories?.invitations||{}))if(!s.stories.arcs.some(a=>a.id===id))invitationIds.add(id);
  for(const id of invitationIds)rows.push({kind:'personal',id:'invitation:'+id,title:LIFE_STORIES.find(d=>d.id===id).title,status:'neverAccepted',detail:'An invitation, not an accepted story'});
  for(const record of contractArchive(s))rows.push({kind:'radiant',id:record.id,title:record.title,status:record.result,detail:`${record.client} · ${record.result}`});
  for(const contract of adventureView(s)?.contracts||[])if(!['done','abandoned'].includes(contract.status))rows.push({kind:'radiant',id:contract.id,title:contract.title,status:contract.paused?'paused':['active','ready'].includes(contract.status)?'unfinished':'neverAccepted',detail:`${contract.giver.name} · ${contract.status==='ready'?'earned proof awaits payment':contract.destination}`});
  for(const promise of s.obligations||[])rows.push({kind:'misc',id:promise.id,title:promise.title,status:promise.missed?'failed':promise.resolved?'completed':'unfinished',detail:promise.description});
  for(const faction of s.rpg?.factions||[])if(faction.firstMission)rows.push({kind:'faction',id:'faction-first:'+faction.id,title:faction.id.replaceAll('_',' '),status:faction.firstMission.status==='active'?'unfinished':faction.firstMission.status==='completed'?'completed':'abandoned',detail:faction.firstMission.ending||'An accepted finite faction agreement'});
  for(const arc of s.rpg?.arcs||[])if(arc.status)rows.push({kind:'regional',id:arc.id,title:arc.title||arc.id.replaceAll('_',' '),status:arc.status==='active'?'unfinished':arc.status==='completed'?'completed':arc.status==='abandoned'?'abandoned':'paused',detail:'An accepted regional account'});
  if(rows.some(row=>!CLOSING_QUEST_KINDS.includes(row.kind)))throw new Error('An undertaking has no closing-record kind.');
  return rows;
}

export function questAccountReview(s){
  const rows=questAccounts(s),counts={completed:0,abandoned:0,paused:0,neverAccepted:0,unfinished:0,failed:0};
  for(const row of rows)if(Object.hasOwn(counts,row.status))counts[row.status]++;
  return {counts,unfinished:rows.filter(row=>row.status==='unfinished')};
}

export function retirementQuestReview(s){
  const {counts,unfinished}=questAccountReview(s);
  const summary=`Your quest record: ${counts.completed} completed, ${counts.abandoned} abandoned, ${counts.failed} missed or failed, ${counts.paused} paused, ${counts.neverAccepted} never accepted. Offers were not commitments.`;
  return summary+(unfinished.length?`\n\nAccepted accounts still unfinished: ${unfinished.slice(0,8).map(row=>row.title).join('; ')}${unfinished.length>8?`; and ${unfinished.length-8} more in your journal`:''}. Settling now records your decision to leave these accounts unfinished; it does not claim their rewards.`:'\n\nNo accepted quest account remains unfinished.');
}

export function closeQuestAccounts(s,reason){
  if(!s.questLog)return '';
  const saved=s.questLog.closingReview,review=saved||questAccountReview(s),voluntary=saved?saved.decision==='leave_at_retirement':reason==='retirement';
  if(!saved)s.questLog.closingReview={day:s.day,generation:s.dynasty?.generation||1,heroName:s.hero.name,decision:voluntary?'leave_at_retirement':'life_ended',counts:review.counts,unfinished:review.unfinished.map(row=>({...row,status:'left_unfinished'}))};
  s.questLog.tracked=null;
  return `Your quest record closed with ${review.counts.completed} completed, ${review.counts.abandoned} abandoned, ${review.counts.failed} missed or failed and ${review.counts.paused} paused accounts. ${review.counts.neverAccepted} offers were never accepted.`+(review.unfinished.length?` ${voluntary?'You chose to leave':'This life ended with'} ${review.unfinished.length} accepted accounts unfinished: ${review.unfinished.slice(0,8).map(row=>row.title+' ('+row.detail.slice(0,180)+')').join('; ')}.${review.unfinished.length>8?' The complete closing account remains in Quest archive.':''}`:' No accepted quest account remained unfinished.');
}
