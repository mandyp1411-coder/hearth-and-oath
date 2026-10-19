import { markNotificationsRead } from './notifications-v40.js';
import { settlementServices, serviceAccepts, serviceWalkPath } from './world-services.js';
import { applyPersonalityBuild } from './personality.js';
import { applyStartingAttributes, completeAttributePoints } from './starting-attributes.js';
import { culturalName } from './names.js';
import { createBirthGame, getActions, chooseAction, chooseEventOption, ageUp, continueAgeUp, replyMessage, validateSave, resolveBattle } from './engine.js';
import { getBattleActions, takeBattleAction } from './combat.js';
import { appearanceAtAge } from './avatar.js';
import { rollLifeCircumstances, normalizeStartAge, originById } from './origins.js';
import { seededRoll } from './world.js';

function pastChoice(s) {
  const offered=s.event.choices.filter(c=>!c.disabledReason),id=s.event.id;
  let preferred=id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):
    id==='plague_letter'?'later':id==='life_budget'?'simplify':id==='deadline_review'?'pause':
    id==='lineage_bereavement'?['share','private','memorial'][seededRoll(s.seed,`past:grief:${s.day}`,3)]:
    id==='career_staff'?'decline':id==='retirement'?'continue':null;
  const safe=offered.filter(c=>!(id==='family_visit'&&c.id==='gift'&&s.hero.gold<10));
  return safe.find(c=>c.id===preferred)||safe[seededRoll(s.seed,`past:choice:${id}:${s.age}:${s.day}`,safe.length)];
}
function pastBattle(s) {
  let b=s.battle;
  for(let turn=0;!b.outcome&&turn<240;turn++) {
    const options=getBattleActions(b).filter(a=>!a.disabledReason),a=options.find(a=>a.id==='retreat')||options.find(a=>a.id==='attack');
    if(!a)throw new Error('A past encounter has no available conclusion.');
    const target=a.needsTarget?b.actors.find(p=>p.side===(a.targetSide==='party'?'party':'enemy')&&p.hp>0&&(!a.targetIds||a.targetIds.includes(p.id))):null;
    b=takeBattleAction(b,a.id,target?.id);
  }
  if(!b.outcome)throw new Error('A past encounter did not conclude.');
  return resolveBattle(s,b);
}

/** Generate earlier years through actual game actions, then leave the opening birthday to the player. */
export async function createLifeAtAge(config = {}, { onProgress, shouldCancel } = {}) {
  const target=normalizeStartAge(config.startAge),appearance=appearanceAtAge(config.appearance,target);
  const fate=rollLifeCircumstances(config.seed,config.originId,appearance.ancestry),origin=originById(fate.originId);
  const pronouns=['he/him','she/her','they/them'].includes(config.pronouns)?config.pronouns:fate.pronouns;
  const name=typeof config.name==='string'&&config.name.trim()?config.name.trim().slice(0,40):culturalName(fate.seed,'new-life:name',{appearance,pronouns}).name;
  let s=createBirthGame({...fate,name,pronouns,appearance,startAge:target,difficulty:config.difficulty}),steps=0;
  const attempted=new Set(),stalls=new Map();
  const act=id=>{
    let a=getActions(s).find(a=>a.id===id&&!a.disabledReason);
    if(!a){const owner=settlementServices(s).find(r=>serviceAccepts(r,id)),path=owner&&serviceWalkPath(s,owner.roomId);if(path)for(const roomId of path){const move=getActions(s).find(a=>a.id==='atlas_room_'+roomId&&!a.disabledReason);if(!move)break;s=chooseAction(s,move.id);}a=getActions(s).find(a=>a.id===id&&!a.disabledReason);}
    if(!a)return false;s=chooseAction(s,id);return true;
  };
  const tryOnce=id=>{const key=`${s.age}:${id}`;if(attempted.has(key))return false;attempted.add(key);return act(id);};
  while(s.age<target) {
    if(shouldCancel?.())return null;
    if(++steps>3200)throw new Error('The earlier life could not reach its opening year.');
    if(steps%16===0&&onProgress)await onProgress(s.age,target);
    if(s.phase==='retired'||s.hero.alive===false)throw new Error('The earlier life ended before its opening year.');
    if(s.battle){s=pastBattle(s);continue;}
    if(s.event){
      const key=`${s.event.id}:${s.day}`,count=stalls.get(key)||0;
      if(count>5)throw new Error('The earlier life paused at an unresolved decision.');
      stalls.set(key,count+1);const c=pastChoice(s);
      if(!c)throw new Error('The earlier life has no available choice.');
      s=chooseEventOption(s,c.id);continue;
    }
    if(s.conversations?.pending){const p=s.conversations.pending,c=p.replies[seededRoll(s.seed,`past:reply:${p.nodeId}:${s.age}`,p.replies.length)];s=replyMessage(s,p.personId,c.id);continue;}
    // Recovery consumes actual days. It is not a granted health refill or a paid reward.
    if(s.life.health<70||s.hero.hp<s.hero.maxHp*.65||s.life.stress>55){if(act('health_routine'))continue;}
    if(s.timeline.yearTarget!==null){s=continueAgeUp(s);continue;}
    if(s.age>=6&&!s.education.enrolled&&tryOnce(`school_enroll_${fate.originId==='shrine_foundling'?'shrine':'community'}`))continue;
    if(s.age>=6&&s.age<18&&tryOnce('school_attend'))continue;
    if(s.age>=16&&s.hero.profession==='Unemployed'){
      const jobs=getActions(s).filter(a=>a.id.startsWith('career_choose_')&&!a.disabledReason&&a.id!=='career_choose_unemployed');
      if(jobs.length&&tryOnce(jobs[seededRoll(s.seed,'past:livelihood',jobs.length)].id))continue;
    }
    const interests=origin.pursuits,interest=interests[seededRoll(s.seed,`past:interest:${s.age}`,interests.length)];
    if(tryOnce(interest))continue;
    if(s.age>=16&&tryOnce('career_work'))continue;
    if(s.age>=18&&s.age%4===seededRoll(s.seed,'past:practice',4)&&tryOnce('career_practice'))continue;
    if(s.age%3===seededRoll(s.seed,'past:family',3)&&tryOnce('grow_family'))continue;
    const returnPath=serviceWalkPath(s,'gate');if(returnPath)for(const roomId of returnPath)s=chooseAction(s,'atlas_room_'+roomId);
    s=ageUp(s);
  }
  if(shouldCancel?.())return null;
  if(s.age!==target||s.day!==target*365||s.phase==='retired'||!validateSave(s))throw new Error('The generated life did not match its opening age.');
  applyStartingAttributes(s,completeAttributePoints(config.attributePoints,target,s.seed),target);
  applyPersonalityBuild(s,(config.personalityTraits||[]).slice(0,3),{creation:true});
  s.hero.lifeOrigin={version:1,id:fate.originId,startingAge:target};
  const birthStory=`${fate.originBirthDescription} Your cradle belonged to ${fate.originCommunity}.`;
  const text=target===0?`${fate.originLabel}. ${birthStory}`:
    `${fate.originLabel}. ${birthStory} Fate has drawn ${target} earlier years. Your childhood, learning, work, and remembered losses are recorded in the Journal. From this birthday, the choices are yours.`;
  s.journal.push({id:`entry-${s.journal.length+1}`,day:s.day,age:s.age,title:target===0?'Your origin':`The story finds you at ${target}`,text,tag:'origin',narrativeEdition:30,generation:s.dynasty.generation});
  if(target===0)s.event.body=`${birthStory} ${s.event.body}`;
  s.notice=target===0?`${fate.originLabel}: your first breath.`:`You enter this life at age ${target}. Your earlier years are remembered in your Journal.`;
  if(target>0)s=markNotificationsRead(s);
  if(!validateSave(s))throw new Error('The chosen character could not be recorded.');
  if(onProgress)await onProgress(target,target);
  return s;
}
