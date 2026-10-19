import { CLOSING_QUEST_KINDS } from './undertaking-contract.js';
const statuses=['offered','active','paused','declined'];
const sideIds=['ferry','carpenter','rival','ward','grove','hearth','receipt','watchtower','teacher','confidant'];
const activeSideCount=s=>Object.entries(s.questLog?.entries||{}).filter(([id,q])=>q.status==='active'&&s.campaign.sidequests[id.slice(5)]?.status!=='completed').length;
const storyTarget=(s,key)=>s.stories?.arcs.find(a=>key==='story:'+a.id);
const radiantTarget=(s,key)=>s.adventuring?.contracts.find(c=>key==='radiant:'+c.id);
const politicalTarget=(s,key)=>s.realm?.politics?.quests.find(q=>q.id===key&&q.ownerId===(s.dynasty?.activePersonId||'hero'));
function canTrack(s,key){
  if(key==='family-origin')return s.familyOrigins?.run?.status==='active';
  if(politicalTarget(s,key)?.status==='active')return true;
  if(key==='main')return s.questLog?.main==='active'&&!s.campaign?.ending;
  if(sideIds.some(id=>'side_'+id===key))return questEntryStatus(s,key)==='active'&&s.campaign?.sidequests[key.slice(5)]?.status!=='completed';
  const story=storyTarget(s,key),radiant=radiantTarget(s,key);
  return Boolean(story&&story.status==='active'&&!story.paused||radiant&&['active','ready'].includes(radiant.status)&&!radiant.paused);
}
export function initializeQuestJournal(s) {
  if(!s.campaign||s.questLog)return;
  const c=s.campaign;
  const pending=c.pending?.questId;
  const entries=pending?.startsWith('side_')?{[pending]:{status:'active',day:s.day}}:{};
  s.questLog={version:1,main:c?.facts.declined?'paused':c?.completed.length||c?.pending?'active':'offered',entries,tracked:pending?.startsWith('side_')?pending:null};
}
export function questEntryStatus(s,id) {return s.questLog?.entries[id]?.status||'offered';}
export function questJournalActions(s,quests=[]) {
  if(!s.campaign||s.event||s.battle||s.conversations?.pending)return [];
  if(s.age<16){const offer=(id,label)=>({id,label,description:'Update only this accepted family-record search. No time or fee.',days:0,cost:0,group:'Quest journal'});return [...(s.age>=12&&s.familyOrigins?.run?.status==='active'?[offer('journal_track_family-origin','Track the family-record search')]:[]),...(s.questLog?.tracked==='family-origin'?[offer('journal_clear_track','Clear tracking')]:[])];}
  const c={ending:s.campaign?.ending,quests},main=s.questLog?.main||(s.campaign?.completed.length?'active':'offered');
  const a=(id,label)=>({id,label,description:'Update your journal without spending days or gold. Accepted tasks keep their real destinations and requirements.',days:0,cost:0,group:'Quest journal'});
  const result=[];
  if(!c.ending)result.push(a(main==='active'?'journal_main_pause':'journal_main_accept',main==='active'?'Pause main quest':'Accept main quest'));
  if(!c.ending&&main!=='declined')result.push(a('journal_main_decline','Decline for now'));
  for(const q of c.quests.filter(q=>q.id.startsWith('side_')&&q.status!=='completed'&&q.status!=='locked')) {
    const status=questEntryStatus(s,q.id);
    result.push({...a(`journal_${status==='active'?'pause':'accept'}_${q.id}`,status==='active'?'Pause this quest':status==='paused'?'Resume this quest':'Accept this quest'),...(status!=='active'&&activeSideCount(s)>=3?{disabledReason:'Pause a side quest before accepting another. Keep up to three active.'}:{})});
    if(status!=='declined')result.push(a('journal_decline_'+q.id,'Decline for now'));
  }
  for(const id of [...(!c.ending&&main==='active'?['main']:[]),...Object.keys(s.questLog?.entries||{}).filter(id=>s.questLog.entries[id].status==='active'&&s.campaign.sidequests[id.slice(5)]?.status!=='completed')])result.push(a('journal_track_'+id,'Track this quest'));
  for(const arc of (s.stories?.arcs||[]).filter(a=>a.status==='active')){
    const key='story:'+arc.id,locked=s.stories.project?.arcId===arc.id||s.stories.pending?.arcId===arc.id;
    result.push({...a(`journal_${arc.paused?'resume':'pause'}_${key}`,arc.paused?'Resume story':'Pause story'),...(locked?{disabledReason:'Finish or withdraw from the current chapter commitment first.'}:{})});
    if(!arc.paused)result.push(a('journal_track_'+key,'Track this story'));
  }
  for(const contract of (s.adventuring?.contracts||[]).filter(c=>['active','ready'].includes(c.status))){
    const key='radiant:'+contract.id;
    result.push(a(`journal_${contract.paused?'resume':'pause'}_${key}`,contract.paused?'Resume contract':'Pause contract'));
    if(!contract.paused)result.push(a('journal_track_'+key,'Track this contract'));
  }
  for(const q of s.realm?.politics?.quests||[])if(q.status==='active'&&q.ownerId===(s.dynasty?.activePersonId||'hero'))result.push(a('journal_track_'+q.id,'Track this regional quest'));
  if(s.familyOrigins?.run?.status==='active')result.push(a('journal_track_family-origin','Track the family-record search'));
  if(s.questLog?.tracked!==null&&s.questLog?.tracked!==undefined)result.push(a('journal_clear_track','Clear tracking'));
  return result;
}
export function applyQuestJournalAction(s,id,ctx) {
  if(!id.startsWith('journal_'))return false;
  initializeQuestJournal(s);
  const j=s.questLog;
  if(id==='journal_clear_track'){j.tracked=null;s.notice='Tracking cleared. Your accepted undertakings remain in the journal.';return true;}
  const extra=id.match(/^journal_(pause|resume)_(story|radiant):(.+)$/);
  if(extra){
    const key=extra[2]+':'+extra[3],target=extra[2]==='story'?storyTarget(s,key):radiantTarget(s,key);
    if(!target||extra[2]==='story'&&(target.status!=='active'||s.stories.project?.arcId===target.id||s.stories.pending?.arcId===target.id)||extra[2]==='radiant'&&!['active','ready'].includes(target.status))return false;
    if(extra[1]==='pause')target.paused=true;else delete target.paused;
    if(target.paused&&j.tracked===key)j.tracked=null;
    s.notice=target.paused?'Undertaking paused. Its people, proof and return date remain recorded.':'Undertaking resumed. No other offer was accepted.';
    ctx.journal?.('Your chosen undertakings',s.notice,'quest');return true;
  }
  if(id.startsWith('journal_main_')) {
    const status={accept:'active',pause:'paused',decline:'declined'}[id.slice(13)];if(!status)return false;j.main=status;
    if(j.main!=='active'&&j.tracked==='main')j.tracked=null;
    s.campaign.facts.declined=j.main!=='active';
    s.notice=j.main==='active'?'The Ashfall Covenant is in your journal. Follow its next objective when you choose.':'The main quest is set aside. Your life and discoveries continue.';
  } else if(id.startsWith('journal_track_')) {const key=id.slice(14);if(!canTrack(s,key))return false;j.tracked=key;s.notice='Your selected quest is tracked.';return true;}
  else {
    const match=id.match(/^journal_(accept|pause|decline)_(side_[a-z_]+)$/);if(!match)return false;
    if(!sideIds.some(id=>'side_'+id===match[2]))return false;
    if(match[1]==='accept'&&j.entries[match[2]]?.status!=='active'&&activeSideCount(s)>=3){s.notice='Keep at most three side quests active. Pause one before accepting another.';return true;}
    j.entries[match[2]]={status:{accept:'active',pause:'paused',decline:'declined'}[match[1]],day:s.day};
    if(match[1]!=='accept'&&j.tracked===match[2])j.tracked=null;
    s.notice=match[1]==='accept'?'Quest accepted. Its next step is now in your journal.':'Quest set aside. You may return to it later.';
  }
  ctx.journal?.('Your chosen undertakings',s.notice,'quest');return true;
}
export function recordQuestStart(s,id) {
  initializeQuestJournal(s);
  if(id.startsWith('side_'))s.questLog.entries[id]={status:'active',day:s.day};else s.questLog.main='active';
}
export function validateQuestJournal(v,s) {
  if(v===undefined)return true;
  const tracked=v?.tracked,known=tracked==='family-origin'&&!!s.familyOrigins?.run||tracked===null||tracked==='main'||sideIds.some(id=>'side_'+id===tracked)||Boolean(politicalTarget(s,tracked)||storyTarget(s,tracked)||radiantTarget(s,tracked)||(s.adventuring?.archive||[]).some(c=>tracked==='radiant:'+c.id));
  if(!(v&&v.version===1&&statuses.includes(v.main)&&v.entries&&typeof v.entries==='object'&&!Array.isArray(v.entries)&&Object.keys(v.entries).length<=sideIds.length&&Object.entries(v.entries).every(([id,q])=>sideIds.some(s=>'side_'+s===id)&&q&&statuses.includes(q.status)&&Number.isSafeInteger(q.day)&&q.day>=0&&q.day<=s.day)&&known))return false;
  const review=v.closingReview;if(review===undefined)return true;
  const integer=n=>Number.isSafeInteger(n)&&n>=0,text=(t,max=1000)=>typeof t==='string'&&t.length<=max;
  return review&&integer(review.day)&&review.day<=s.day&&integer(review.generation)&&review.generation>=1&&text(review.heroName,40)&&['leave_at_retirement','life_ended'].includes(review.decision)&&review.counts&&['completed','abandoned','paused','neverAccepted','unfinished'].every(k=>integer(review.counts[k]))&&(review.counts.failed===undefined||integer(review.counts.failed))&&Array.isArray(review.unfinished)&&review.unfinished.length===review.counts.unfinished&&review.unfinished.every(row=>row&&CLOSING_QUEST_KINDS.includes(row.kind)&&text(row.id,256)&&text(row.title)&&row.status==='left_unfinished'&&text(row.detail,3000));
}
