/** Shared producer/validator vocabulary. Historical IDs and statuses stay stable. */
export const CLOSING_QUEST_KINDS=Object.freeze(['main','side','personal','radiant','misc','regional','faction']);
export function undertakingStatusLabel(status){
  return ({offered:'Offered',considering:'Saved proposal',active:'In progress',accepted:'Accepted',paused:'Paused',ready:'Ready to deliver',completed:'Completed',done:'Completed',abandoned:'Abandoned',withdrawn:'Withdrawn',failed:'Failed',left_unfinished:'Left unfinished',neverAccepted:'Not accepted'})[status]||'Earlier account';
}
export function personalStoryState(arc,project){
  if(arc.paused||arc.status==='paused')return 'paused';
  if(arc.status==='completed'||arc.status==='abandoned')return arc.status;
  if(project?.arcId===arc.id)return 'accepted';
  return arc.chapter===0&&!arc.choices?.length?'considering':'active';
}
