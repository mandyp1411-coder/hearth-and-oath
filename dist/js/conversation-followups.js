import { voiceProfile } from './character-voice.js';
import { personalReadiness } from './people-context.js';

// A small receipt for a conversation actually completed, not generated history.
// It outlives the normal, deliberately bounded message and memory lists.
const FOLLOW_UP_LIMIT=2048;
const REPLY_IDS=['ask','share','tease','leave'];
const TOPICS={
 repair:{
  title:'A Stubborn Repair',opening:'It looked like a small repair when I started. That was before I took it apart.',question:'What was wrong with it?',answer:'Someone fixed the first problem in a way that created three better-hidden ones.',
  nextTitle:'The Repair You Asked About',recall:'You asked what was wrong with that repair. I can show you what I meant: covering a split can hide it without making the joint sound.',
  choices:[
   ['Ask what is worth keeping','How do you decide which parts are worth keeping?','I look for sound material first. Age is not a fault, and polish is not proof. I would rather explain what I can save than promise the whole thing.', 'You asked how I judge what is worth preserving in a repair.'],
   ['Suggest starting again instead','Would starting again be kinder than trying to save every piece?','Sometimes. But I would want the owner to understand that choice. A keepsake and a useful tool need not be judged in quite the same way.', 'You questioned whether preserving every piece was the right repair.'],
   ['Joke about the repair hiding more surprises','Should we introduce ourselves before uncovering the next surprise?','Only if you promise not to invite it to stay. I have enough work without making the faults feel welcome.', 'We found humor in the hidden faults without claiming the repair was finished.'],
   ['Leave the repair in their hands','I will leave the repair in your hands. Thank you for explaining.','Of course. You can be interested without taking the job on yourself.', null],
  ],
 },
 page:{
  title:'A Page That Finally Makes Sense',opening:'I read the same page four times before realizing the writer had skipped a step. I feel much better about the first three attempts.',question:'Did you find the missing step?',answer:'Yes. On the next page, where they explain that it was obvious. It was not.',
  nextTitle:'The Step the Writer Skipped',recall:'You asked whether I found the missing step in that book. Here is the passage. Calling a step obvious does not make it a useful explanation.',
  choices:[
   ['Ask to hear the missing step','Could you explain the step without using the writer’s shortcut?','Yes. First say what we know, then what follows from it. If I cannot show that connection, you should stop me too.', 'You asked me to explain the connection the book had skipped.'],
   ['Defend leaving room for the reader','Could a gap sometimes help the reader work it out?','A question can do that. An unexplained leap can merely leave them lost. I would rather tell the reader which kind of gap I am leaving.', 'You challenged my objection to the writer’s shortcut.'],
   ['Propose a very honest margin note','Perhaps the margin should say: not obvious to either of us.','An unusually useful scholarly note. We may have to defend it with a very long footnote.', 'We joked about an honest margin note beside the missing explanation.'],
   ['Close the book for now','I have enough to think about. Let us close the book for now.','Gladly. A question can wait without becoming a failure.', null],
  ],
 },
 soup:{
  title:'A Cold Bowl of Soup',opening:'My soup has gone cold three times today. I reheat it, someone arrives, and the soup gets another hour older.',question:'Have you managed to eat any of it?',answer:'A little. I am determined to finish the bowl before it becomes tomorrow’s soup.',
  nextTitle:'More Than a Bowl of Soup',recall:'You asked whether I had managed to eat my soup. It was a kind question. The harder one is how to let a healing shift end without feeling that I have abandoned someone.',
  choices:[
   ['Ask what would make a break possible','What would let you stop without leaving someone unattended?','Knowing who takes the next turn, and telling people when mine ends. It is easier to say that here than at a crowded doorway.', 'You asked what would make a real break possible during my healing work.'],
   ['Say their own needs count too','Your own need to eat should not have to wait until everyone else is well.','I agree when I say it to another healer. I am less convincing when the bowl is mine. Thank you for saying it without making me a project.', 'You said my own needs mattered without taking charge of my day.'],
   ['Suggest giving the soup an appointment','Perhaps the soup needs an appointment of its own.','It would arrive on time, say very little, and be easy to examine. An exemplary patient, except for the onions.', 'We joked about giving a cold bowl of soup its own appointment.'],
   ['Let them have some quiet','I will let you have a little quiet. You need not entertain me.','Thank you. Company is welcome; quiet can be welcome too.', null],
  ],
 },
 boots:{
  title:'Wet Boots',opening:'My boots let water in from somewhere. I have searched every seam except the one with the leak.',question:'Have you tried the cobbler?',answer:'Tomorrow. Today I am conducting a very thorough inspection of puddles.',
  nextTitle:'The Person Inside the Boots',recall:'You asked about the cobbler when I complained about my boots. I keep thinking how much of a watch is made of little discomforts nobody puts in a heroic song.',
  choices:[
   ['Ask what makes a watch bearable','What makes a long watch bearable, besides dry feet?','Someone relieving you when they said they would. A hot meal helps, but knowing the shift has an end matters more.', 'You asked what makes an ordinary watch bearable.'],
   ['Argue that the small details belong in songs','Perhaps a song ought to leave room for the wet feet too.','I would listen to that one. Keep the quiet hours in it as well. Not every watch ends with a charge worth cheering.', 'You wanted an honest watchkeeper’s song with room for the ordinary discomforts.'],
   ['Ask whether the puddles passed inspection','Did the puddles at least meet your exacting standards?','Every one. A disgracefully consistent performance. I would prefer to find one that was dry.', 'We joked about the puddle inspection without claiming the boots were mended.'],
   ['Leave the next part for another day','Let us leave the next part for another day.','Fair enough. You need not stand a whole watch to hear about one.', null],
  ],
 },
};
const VOICES={kind:'I am glad you remembered to ask.',driven:'I want to be clear about why it matters.',reserved:'It is easier to explain with a little quiet.',bold:'Let me put the point plainly.',wry:'A small matter, with an unreasonable amount to say for itself.',practical:'The useful part is easier to explain up close.'};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const receipt=(p,key,message,opener)=>({personId:p.id,key,openingId:opener.id,sourceId:message.id,sourceDay:message.day,sourceAge:message.age,opening:TOPICS[key].opening,question:TOPICS[key].question,answer:TOPICS[key].answer,completedDay:null,choiceId:null});
const sameSource=(a,b)=>a.key===b.key&&a.personId===b.personId&&a.openingId===b.openingId&&a.sourceId===b.sourceId&&a.sourceDay===b.sourceDay&&a.sourceAge===b.sourceAge;
function sourceFromThread(s,p,key,sourceId=null){
 const row=TOPICS[key],thread=s.conversations?.threads?.[p.id]||[];
 for(let i=thread.length-1;i>=2;i--){
  const answer=thread[i],question=thread[i-1];
  if(sourceId&&answer.id!==sourceId||answer.speaker!==p.id||answer.text!==row.answer||question.speaker!=='hero'||question.text!==row.question||answer.day!==question.day||answer.age!==question.age)continue;
  // Birthday correspondence can arrive between the captured opener and reply.
  const opener=thread.slice(0,i-1).findLast(m=>m.speaker===p.id&&m.day<=question.day&&m.text.includes(`“${row.opening}”`)&&/^(You find |An unfinished letter from )/.test(m.text));
  if(opener){const record=receipt(p,key,answer,opener);if(validReceipt(record,s,s.conversations.sequence))return record;}
 }
 return null;
}
function sourceFor(s,p,key){return (s.conversations?.followUps||[]).find(r=>r.personId===p.id&&r.key===key)||sourceFromThread(s,p,key);}
export function followUpAvailable(s,p){
 const site=s.world?.locations?.find(l=>l.id===s.locationId);
 return !!(s.age>=16&&p.age>=16&&p.available!==false&&p.alive!==false&&p.source?.alive!==false&&p.bond>=15&&!/enem/i.test(p.role||'')&&!personalReadiness(s,p.id)&&
  p.locationId===s.locationId&&(!p.roomId||p.roomId===(s.cartography?.interior?.roomId||'gate'))&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey&&!s.maze&&!s.battle&&!s.justice?.prison&&
  site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false);
}
export function conversationFollowUp(s,p,topic){
 if(!followUpAvailable(s,p)||(s.conversations?.seen||[]).includes(`${p.id}:${topic}`))return null;
 const candidates=Object.keys(TOPICS).map(key=>sourceFor(s,p,key)).filter(r=>r&&r.completedDay===null&&r.sourceDay<s.day).sort((a,b)=>b.sourceDay-a.sourceDay||a.key.localeCompare(b.key));
 const source=candidates[0];if(!source)return null;
 const row=TOPICS[source.key],voice=voiceProfile(s,p),disposition=String(p.disposition||p.source?.disposition||'').toLowerCase(),tease=p.bond<30?-2:/reserved|wary|secretive/.test(disposition)?1:3;
 return {nodeId:'person_v30',topic,title:row.nextTitle,followUp:structuredClone(source),body:`${p.name} returns to something you asked about before. “${row.recall} ${VOICES[voice.id]}”`,choices:row.choices.map(([label,text,response,memory],i)=>({
  id:REPLY_IDS[i],label,description:i===3?'End this conversation without a promise or penalty.':i===2&&p.bond<30?'You do not know each other well yet; the joke may land poorly.':'A conversation only. No time, Gold, work or skill gain.',text,
  response:i===2&&p.bond<30?'We hardly know each other. Give me a little time before the jokes.':response,
  effect:{bond:[4,3,tease,0][i],...(memory?{memory:i===2&&p.bond<30?'The joke felt too familiar when I returned to an earlier conversation.':memory}:{})},
 }))};
}
export function recordConversationFollowUp(s,p,scene,choice){
 if(scene.nodeId!=='person_v30')return;
 if(scene.followUp){
  const source=sourceFor(s,p,scene.followUp.key);
  if(!source||!sameSource(source,scene.followUp)||source.completedDay!==null)return;
  const rows=s.conversations.followUps ||= [];
  let record=rows.find(r=>r.personId===p.id&&r.key===source.key);
  if(!record){if(rows.length>=FOLLOW_UP_LIMIT)return;record=structuredClone(source);rows.push(record);}
  record.completedDay=s.day;record.choiceId=choice.id;return;
 }
 if(choice.id!=='ask'||s.age<16||p.age<16)return;
 const key=Object.keys(TOPICS).find(key=>{const row=TOPICS[key];return scene.title===row.title&&scene.body.includes(`“${row.opening}”`)&&choice.text===row.question&&choice.response===row.answer;});
 if(!key||(s.conversations.followUps||[]).some(r=>r.personId===p.id&&r.key===key))return;
 const thread=s.conversations.threads[p.id],opener=thread.findLast(m=>m.speaker===p.id&&m.text===scene.body);
 const rows=s.conversations.followUps ||= [];if(opener&&rows.length<FOLLOW_UP_LIMIT)rows.push(receipt(p,key,thread.at(-1),opener));
}
function validReceipt(r,s,sequence){
 if(!plain(r)||!Object.hasOwn(TOPICS,r.key)||!/^letter-[1-9]\d*$/.test(r.sourceId)||!/^letter-[1-9]\d*$/.test(r.openingId)||Number(r.openingId.slice(7))>=Number(r.sourceId.slice(7))-1||Number(r.sourceId.slice(7))>sequence||!Number.isInteger(r.sourceDay)||r.sourceDay<0||r.sourceDay>(s?.day??1000000)||!Number.isInteger(r.sourceAge)||r.sourceAge<16||r.sourceAge>(s?.age??5000))return false;
 const row=TOPICS[r.key];
 return r.opening===row.opening&&r.question===row.question&&r.answer===row.answer&&(r.completedDay===null?r.choiceId===null:Number.isInteger(r.completedDay)&&r.completedDay>r.sourceDay&&r.completedDay<=(s?.day??1000000)&&REPLY_IDS.includes(r.choiceId));
}
export function validateConversationFollowUps(value,s,personIds){
 const rows=value.followUps;
 if(rows!==undefined&&(!Array.isArray(rows)||rows.length>FOLLOW_UP_LIMIT||!rows.every(r=>validReceipt(r,s,value.sequence)&&typeof r.personId==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(r.personId)&&(!personIds||personIds.has(r.personId)))||new Set(rows.map(r=>r.personId+':'+r.key)).size!==rows.length))return false;
 const context={...s,conversations:value},retained=new Map(Object.entries(value.threads).flatMap(([id,thread])=>thread.map(m=>[m.id,{id,message:m}])));
 for(const r of rows||[]){
  const answer=retained.get(r.sourceId),question=retained.get(`letter-${Number(r.sourceId.slice(7))-1}`),opening=retained.get(r.openingId);
  if(answer&&(answer.id!==r.personId||answer.message.speaker!==r.personId||answer.message.text!==r.answer||answer.message.day!==r.sourceDay||answer.message.age!==r.sourceAge))return false;
  if(question&&(question.id!==r.personId||question.message.speaker!=='hero'||question.message.text!==r.question||question.message.day!==r.sourceDay||question.message.age!==r.sourceAge))return false;
  if(opening&&(opening.id!==r.personId||opening.message.speaker!==r.personId||opening.message.day>r.sourceDay||opening.message.age>r.sourceAge||!opening.message.text.includes(`“${r.opening}”`)||!/^(You find |An unfinished letter from )/.test(opening.message.text)))return false;
 }
 const p=value.pending,source=p?.snapshot?.followUp;
 if(source===undefined)return true;
 if(p.nodeId!=='person_v30'||source.personId!==p.personId||!validReceipt(source,s,value.sequence)||source.completedDay!==null||s&&source.sourceDay>=s.day)return false;
 const actual=(rows||[]).find(r=>r.personId===p.personId&&r.key===source.key)||sourceFromThread(context,{id:p.personId},source.key);
 return !!actual&&actual.completedDay===null&&sameSource(actual,source)&&p.snapshot.choices.every(c=>Object.keys(c.effect).every(k=>['bond','memory'].includes(k)));
}
