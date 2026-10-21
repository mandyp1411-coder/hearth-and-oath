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
import { PROFESSION_CATALOG, civilianEntryReason } from './career-entry.js';

function pastChoice(s,attempt=0) {
  const offered=s.event.choices.filter(c=>!c.disabledReason),id=s.event.id;
  let preferred=id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):
    id==='plague_letter'?'later':id==='life_budget'?'simplify':id==='deadline_review'?'pause':
    id==='lineage_bereavement'?['share','private','memorial'][seededRoll(s.seed,`past:grief:${s.day}`,3)]:
    id==='career_staff'?'decline':id==='retirement'?'continue':id==='school_exam'?'present':id==='hard_winter'?'endure':id==='schooling_rival'?'contest':id==='schooling_temper'?'endure':id==='living_conscription'?(offered.some(c=>c.id==='pay')?'pay':'continue'):id==='living_strike'?'continue':id==='living_wolves'?(offered.some(c=>c.id==='pay')?'pay':'continue'):id==='living_purge'?'shelter':id==='living_refugees'?(s.hero.gold>=40?'shelter':'continue'):id==='living_rival'||id==='living_lie'?'continue':id==='living_bedside'?(offered.some(c=>c.id==='nurse')?'nurse':s.hero.gold>=40?'send':'write'):null;
  const safe=offered.filter(c=>!(id==='family_visit'&&c.id==='gift'&&s.hero.gold<10));
  if(id==='sanctuary_case_capture')preferred='service';
  // A choice the scene refused (a fee the purse cannot meet) is not tried twice: the next sitting takes the next door.
  if(attempt>0)return safe[(seededRoll(s.seed,`past:choice:${id}:${s.age}:${s.day}`,safe.length)+attempt)%safe.length];
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

const ENDED_EARLY='The earlier life ended before its opening year.';
const MAX_DRAWS=12;
/** Generate earlier years through actual game actions, then leave the opening
 * birthday to the player. The life the player enters is the one that
 * survived: a childhood death draws another cradle; an adult death turns the
 * years back a little and casts the dice again, a few times at most. */
export async function createLifeAtAge(config = {}, hooks = {}) {
  const draws={count:0};
  for(;;){
    try{return await generateLife(config,hooks,draws);}
    catch(error){if(error?.message!==ENDED_EARLY||draws.count>=MAX_DRAWS)throw error;draws.count++;}
  }
}
async function generateLife(config, { onProgress, shouldCancel } = {}, draws = { count: 0 }) {
  const attempt=draws.count;
  const target=normalizeStartAge(config.startAge,18,config.appearance?.ancestry),appearance=appearanceAtAge(config.appearance,target);
  const fate=rollLifeCircumstances(config.seed,config.originId,appearance.ancestry,attempt),origin=originById(fate.originId);
  const pronouns=['he/him','she/her','they/them'].includes(config.pronouns)?config.pronouns:fate.pronouns;
  const name=typeof config.name==='string'&&config.name.trim()?config.name.trim().slice(0,40):culturalName(fate.seed,'new-life:name',{appearance,pronouns}).name;
  let s=createBirthGame({...fate,name,pronouns,appearance,startAge:target,difficulty:config.difficulty,attempt}),steps=0;
  const attempted=new Set(),stalls=new Map();
  const act=id=>{
    let a=getActions(s).find(a=>a.id===id&&!a.disabledReason);
    if(!a){const owner=settlementServices(s).find(r=>serviceAccepts(r,id)),path=owner&&serviceWalkPath(s,owner.roomId);if(path)for(const roomId of path){const move=getActions(s).find(a=>a.id==='atlas_room_'+roomId&&!a.disabledReason);if(!move)break;s=chooseAction(s,move.id);}a=getActions(s).find(a=>a.id===id&&!a.disabledReason);}
    if(!a)return false;s=chooseAction(s,id);return true;
  };
  const tryOnce=id=>{const key=`${s.age}:${id}`;if(attempted.has(key))return false;attempted.add(key);return act(id);};
  // Some things a year asks for more than once: lessons are four a year, not one.
  const tryTimes=(id,times)=>{for(let k=0;k<times;k++){const key=`${s.age}:${id}:${k}`;if(attempted.has(key))continue;attempted.add(key);return act(id);}return false;};
  const snapshots=[];let snapshotAge=-1;
  while(s.age<target) {
    if(shouldCancel?.())return null;
    if(++steps>3200+400*draws.count)throw new Error('The earlier life could not reach its opening year.');
    if(steps%16===0&&onProgress)await onProgress(s.age,target);
    if(s.phase==='retired'||s.hero.alive===false){
      // A grown life that ends before its opening year is turned back a few
      // years and lived again under new dice; a childhood death is a new cradle.
      const back=snapshots.findLast(p=>p.age<=s.age-2);
      if(!back||s.age<18||draws.count>=MAX_DRAWS)throw new Error(ENDED_EARLY);
      draws.count++;s=structuredClone(back.state);s.fortune.attempt=draws.count;
      for(const key of [...attempted])if(Number(key.split(':')[0])>=s.age)attempted.delete(key);
      continue;
    }
    if(!s.event&&!s.battle&&s.age>=18&&(s.age%5===0||s.age>=60&&s.age%2===0)&&s.age!==snapshotAge&&s.timeline.yearTarget===null){snapshotAge=s.age;snapshots.push({age:s.age,state:structuredClone(s)});}
    if(s.battle){s=pastBattle(s);continue;}
    if(s.event){
      const key=`${s.event.id}:${s.day}`,count=stalls.get(key)||0;
      if(count>5)throw new Error('The earlier life paused at an unresolved decision.');
      stalls.set(key,count+1);const c=pastChoice(s,count);
      if(!c)throw new Error('The earlier life has no available choice.');
      s=chooseEventOption(s,c.id);continue;
    }
    if(s.conversations?.pending){const p=s.conversations.pending,c=p.replies[seededRoll(s.seed,`past:reply:${p.nodeId}:${s.age}`,p.replies.length)];s=replyMessage(s,p.personId,c.id);continue;}
    // Recovery consumes actual days. It is not a granted health refill or a paid reward.
    if(s.life.health<70||s.hero.hp<s.hero.maxHp*.65||s.life.stress>55){if(act('health_routine'))continue;}
    if(s.timeline.yearTarget!==null){s=continueAgeUp(s);continue;}
    // School is for those who can pay or are chosen: the shrine first (free, if the keeper takes you), then the village school, then the grammar school by examination.
    if(s.age>=6&&!s.education.enrolled&&(tryOnce('school_enroll_shrine')||tryOnce('school_enroll_community')))continue;
    if(s.age>=12&&s.age<=15&&tryOnce('school_scholarship'))continue;
    if(s.age>=12&&s.age<18&&tryOnce('school_entrance'))continue;
    if(s.age>=12&&s.age<18&&s.education.route!=='academy'&&tryOnce('school_enroll_academy'))continue;
    if(s.age>=12&&s.age<18){const elective=getActions(s).find(a=>a.id.startsWith('school_elective_')&&!a.disabledReason);if(elective&&tryOnce(elective.id))continue;}
    // A child with no school by twelve is put to a master's bench, if one will take the mark.
    if(s.age>=12&&s.age<15&&!s.education.enrolled&&!s.education.route&&!s.education.qualifications.length&&tryOnce('school_enroll_apprenticeship'))continue;
    if(s.age>=6&&s.age<18&&tryTimes('school_attend',4))continue;
    if(s.age>=10&&s.age<18&&s.education.enrolled&&tryOnce('school_exam'))continue;
    // The institutions of the capitals, for the few with a grammar certificate and a town that has one.
    if(s.age>=16&&s.age<=22&&!s.education.schooling?.institution){const sits=getActions(s).filter(a=>/^school_sit_/.test(a.id)&&!a.disabledReason);if(sits.length&&tryOnce(sits[seededRoll(s.seed,'past:institution',sits.length)].id))continue;
      const place=getActions(s).find(a=>/^school_place_/.test(a.id)&&!a.disabledReason);if(place&&tryOnce(place.id))continue;
      const reads=getActions(s).filter(a=>/^school_read_/.test(a.id)&&!a.disabledReason);if(reads.length&&tryOnce(reads[seededRoll(s.seed,'past:major',reads.length)].id))continue;}
    if(s.education.schooling?.institution&&!s.education.schooling.institution.degree){if(tryTimes('school_lecture',6))continue;if(tryOnce('school_degree'))continue;}
    // A student does not take a trade; a graduate takes the one the degree fits, even from another.
    const studying=s.education.schooling?.institution&&!s.education.schooling.institution.degree;
    const graduate=s.education.schooling?.credentials?.find(c=>c.kind!=='journeyman'),graduateFit=graduate&&({degree:{medicine:'healer',law:'scholar',history:'scholar',natural_philosophy:'alchemist'}[graduate.major]||'scholar',clerkship:'scholar',commission:'soldier',licence:'alchemist',orders:'scholar'})[graduate.kind];
    if(graduateFit&&s.hero.profession!=='Unemployed'&&PROFESSION_CATALOG.find(j=>j.id===graduateFit)?.name!==s.hero.profession&&!civilianEntryReason(s,{profession:PROFESSION_CATALOG.find(j=>j.id===graduateFit).name})&&tryOnce(`career_choose_${graduateFit}`))continue;
    if(s.age>=16&&s.hero.profession==='Unemployed'&&!studying){
      // The trades that would have this life, wherever it is standing; the walk to the mentor is the action's own.
      const served=s.education.schooling?.credentials?.find(c=>c.kind==='journeyman')?.major,craft=served&&PROFESSION_CATALOG.find(j=>j.id===served&&!civilianEntryReason(s,{profession:j.name}));
      if(craft&&tryOnce(`career_choose_${craft.id}`))continue; // a journeyman takes up the trade the bond taught
      // What the examinations made you is what you do: a doctor heals, a clerk keeps the archive, an officer soldiers, a licensed mage works the fire.
      const learned=s.education.schooling?.credentials?.find(c=>c.kind!=='journeyman'),fit=learned&&({degree:{medicine:'healer',law:'scholar',history:'scholar',natural_philosophy:'alchemist'}[learned.major]||'scholar',clerkship:'scholar',commission:'soldier',licence:'alchemist',orders:'scholar'})[learned.kind];
      const fitJob=fit&&PROFESSION_CATALOG.find(j=>j.id===fit&&!civilianEntryReason(s,{profession:j.name}));
      if(fitJob&&tryOnce(`career_choose_${fitJob.id}`))continue;
      const open=PROFESSION_CATALOG.filter(j=>j.name!=='Unemployed'&&!civilianEntryReason(s,{profession:j.name}));
      // A high house does not send its children down the mine or behind the plough while any other door is open.
      const gentle=['gentry','noble','royal'].includes(s.hero.station?.id)?open.filter(j=>!['miner','farmer','blacksmith'].includes(j.id)):open;
      const jobs=(gentle.length?gentle:open).map(j=>`career_choose_${j.id}`);
      if(jobs.length&&tryOnce(jobs[seededRoll(s.seed,'past:livelihood',jobs.length)]))continue;
    }
    // A sensible past pays what it owes when it can.
    if(s.age>=18&&(s.householdBudget?.debt||0)>0&&s.hero.gold>=s.householdBudget.debt+40&&tryOnce('budget_repay'))continue;
    const interests=origin.pursuits,interest=interests[seededRoll(s.seed,`past:interest:${s.age}`,interests.length)];
    if(tryOnce(interest))continue;
    if(s.age>=16&&tryOnce('career_work'))continue;
    if(s.age>=18&&s.age%4===seededRoll(s.seed,'past:practice',4)&&tryOnce('career_practice'))continue;
    if(s.age%3===seededRoll(s.seed,'past:family',3)&&tryOnce('grow_family'))continue;
    const returnPath=serviceWalkPath(s,'gate');if(returnPath)for(const roomId of returnPath)s=chooseAction(s,'atlas_room_'+roomId);
    s=ageUp(s);
  }
  if(shouldCancel?.())return null;
  if(s.phase==='retired'||s.hero.alive===false)throw new Error(ENDED_EARLY);
  if(s.age!==target||s.day!==target*365||!validateSave(s))throw new Error('The generated life did not match its opening age.');
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
