import { personalCorrespondenceAllowed, PERSONAL_CORRESPONDENCE_AGE } from './development.js';

export const NOTIFICATION_LIMIT=80;
export const NOTIFICATION_ARCHIVE_LIMIT=320;
const kinds=new Set(['letter','gift','health']);
const owner=s=>`${s.seed}:${s.timeline?.birthDay||0}:${s.dynasty?.generation||1}`;
const plain=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null));
const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;

/** Receipts only: this function never grants an item, money, care or a reply. */
export function receiveNotification(s,{kind,sourceId,title,body,personId}={}){
  if(!s||!kinds.has(kind)||!text(sourceId,200)||!text(title,160)||!text(body,2400)||personId!==undefined&&!text(personId,100))return null;
  if(kind==='letter'&&!personalCorrespondenceAllowed(s))return null;
  const inbox=s.inbox||(s.inbox={version:1,sequence:0,entries:[]}),recipient=owner(s);
  const existing=[...inbox.entries,...(inbox.archive||[])].find(n=>n.sourceId===sourceId&&n.recipient===recipient);
  if(existing)return existing;
  const row={id:'notice-'+(++inbox.sequence),kind,sourceId,title,body,day:s.day,recipient,read:false,...(personId?{personId}:{})};
  inbox.entries.push(row);
  while(inbox.entries.length>NOTIFICATION_LIMIT){(inbox.archive||=[]).push(inbox.entries.shift());}
  while((inbox.archive?.length||0)>NOTIFICATION_ARCHIVE_LIMIT){
    const read=inbox.archive.findIndex(n=>n.read),[old]=inbox.archive.splice(read<0?0:read,1);
    const r=inbox.retention||={olderRead:0,olderUnread:0};r[old.read?'olderRead':'olderUnread']++;
  }
  return row;
}
export function notificationsFor(s){return [...(s?.inbox?.archive||[]),...(s?.inbox?.entries||[])].filter(n=>n.recipient===owner(s)&&(n.kind!=='letter'||personalCorrespondenceAllowed(s)&&(s.timeline?.mode!=='birth'||Math.floor((n.day-(s.timeline.birthDay||0))/365)>=PERSONAL_CORRESPONDENCE_AGE))).slice().reverse();}
/** Retire invalid infant correspondence without recycling sequence/deduplication IDs. */
export function suppressEarlyCorrespondence(s){
  const removed=new Set();
  for(const [id,thread]of Object.entries(s.conversations?.threads||{})){
    const kept=thread.filter(message=>{const infant=Number.isInteger(message.age)&&message.age<3;if(infant)removed.add(message.id);return !infant;});
    if(kept.length!==thread.length)s.conversations.threads[id]=kept;
  }
  if(s.inbox)for(const key of ['entries','archive'])if(s.inbox[key])s.inbox[key]=s.inbox[key].filter(n=>n.kind!=='letter'||n.recipient!==owner(s)||!removed.has(n.sourceId)&&(s.timeline?.mode!=='birth'||Math.floor((n.day-(s.timeline.birthDay||0))/365)>=PERSONAL_CORRESPONDENCE_AGE));
}
export function unreadNotifications(s){return notificationsFor(s).filter(n=>!n.read).length;}
export function markNotificationsRead(original,id='all'){
  const current=notificationsFor(original).filter(n=>!n.read&&(id==='all'||n.id===id));
  if(!current.length)return original;
  const s=structuredClone(original),ids=new Set(current.map(n=>n.id));
  for(const n of [...s.inbox.entries,...(s.inbox.archive||[])])if(ids.has(n.id))n.read=true;
  return s;
}
export function validNotifications(value,s){
  if(value===undefined)return true;
  if(!plain(value)||value.version!==1||!Number.isInteger(value.sequence)||value.sequence<0||value.sequence>10000000||!Array.isArray(value.entries)||value.entries.length>NOTIFICATION_LIMIT)return false;
  if(value.archive!==undefined&&(!Array.isArray(value.archive)||value.archive.length>NOTIFICATION_ARCHIVE_LIMIT))return false;
  if(value.retention!==undefined&&(!plain(value.retention)||!['olderRead','olderUnread'].every(k=>Number.isSafeInteger(value.retention[k])&&value.retention[k]>=0&&value.retention[k]<=10000000)))return false;
  const ids=new Set(),sources=new Set();
  return [...value.entries,...(value.archive||[])].every(n=>{
    if(!plain(n)||!/^notice-\d+$/.test(n.id)||Number(n.id.slice(7))<1||Number(n.id.slice(7))>value.sequence||ids.has(n.id)||!kinds.has(n.kind)||!text(n.sourceId,200)||!text(n.title,160)||!text(n.body,2400)||!Number.isInteger(n.day)||n.day<0||n.day>s.day||typeof n.read!=='boolean'||!text(n.recipient,300)||n.personId!==undefined&&!text(n.personId,100))return false;
    const source=n.recipient+':'+n.sourceId;if(sources.has(source))return false;
    ids.add(n.id);sources.add(source);return true;
  });
}
