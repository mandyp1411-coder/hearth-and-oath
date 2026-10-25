import { voiceProfile } from './character-voice.js';
import { motiveFor } from './audit-content-v25.js';

// This is a reply to a played event, not generated biography or a new reward loop.
export function yardConversationEligible(s,p){
 const t=s.yardTournament,site=s.world.locations.find(l=>l.id===s.locationId);
 return !!(t?.stage==='finished'&&t.paidDays===1&&t.finishedDay<=s.day&&[t.mentor.id,t.opponent.id].includes(p.id)&&
  (p.bond??40)>=15&&p.available!==false&&p.alive!==false&&p.source?.alive!==false&&p.locationId===t.locationId&&s.locationId===t.locationId&&
  (p.roomId||'gate')===(s.cartography?.interior?.roomId||'gate')&&!s.cartography?.offsite&&!s.cartography?.pending&&
  !s.timeline?.journey&&!s.maze&&!s.justice?.prison&&
  site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false&&!(t.discussedIds||[]).includes(p.id));
}
const instructor={
 win:'You took the bout. A clean result is worth keeping, but it cannot tell you everything about your sword work.',
 loss:'The bout went against you. That gives us something specific to study, not a verdict on what you can become.',
 draw:'You finished level. The score alone cannot tell us which decisions were cautious and which were well judged.',
 withdrawn:'You stopped the bout. I will not turn a decision to stop into a failed examination.'
};
const opponent={
 win:'You won. I want to understand the openings I gave you, rather than explain the result away.',
 loss:'I won this one. I still want to understand what worked; winning once is not the same as knowing why.',
 draw:'We finished level. I want to look at the exchanges before deciding what either of us should change.',
 withdrawn:'You chose to stop. We do not have to make a quarrel out of that.'
};
const voices={
 kind:['We can take our time over it.','I would rather we left this conversation encouraged than embarrassed.'],
 driven:['I want the next piece of practice to have a purpose.','One thing to work on is more useful than a grand promise.'],
 reserved:['A little quiet helps me think about it.','We need not fill every pause with advice.'],
 bold:['Let us be plain about the result.','An honest answer is enough.'],
 wry:['A wooden sword can leave you with quite a lot to think about.','At least the wooden swords have no opinions to add.'],
 practical:['Start with what actually happened.','One exchange at a time; the rest can wait.']
};
export function yardConversation(s,p){
 if(!yardConversationEligible(s,p))return null;
 const t=s.yardTournament,mentor=p.id===t.mentor.id,voice=voices[voiceProfile(s,p).id],motive=motiveFor(p);
 const score=t.rounds.reduce((a,r)=>[a[0]+(r.point===1),a[1]+(r.point===-1)],[0,0]);
 const result=t.outcome==='withdrawn'?'a withdrawal':t.outcome==='draw'?'a draw':t.outcome==='win'?'your win':'your loss';
 const date=s.day===t.finishedDay?'earlier today':`${s.day-t.finishedDay} days ago`;
 const last=t.rounds.at(-1),detail=last?`In the last exchange, you chose ${last.move} and ${t.opponent.name} chose ${last.intent}. ${last.point===1?'Your touch scored.':last.point===-1?'Your opponent scored.':'Neither scored.'}`:'You stopped before the first exchange. There is no sword work to reconstruct.';
 const concern=motive.kind==='credit'?'Both names belong beside the score.':motive.kind==='care'?'The person matters more than the result.':motive.kind==='power'?'A result is useful only if you learn what earned it.':mentor?'Practice should leave you able to choose your next step.':'I can take the practice seriously without letting it choose my whole life.';
 const reply=(id,label,text,response)=>({id,label,description:'Conversation only: no time, rewards, relationship or skill changes.',text,response,effect:{}});
 return {nodeId:'yard_conversation',topic:`yard-${t.startedDay}-${t.finishedDay}`,title:mentor?'After the Practice Bout':'The Other Side of the Ribbon',
  body:`${p.name} brings up the Gateyard bout with ${mentor?t.opponent.name:'you'}, ${date}: ${result}, ${score[0]}–${score[1]} from your side after ${t.rounds.length} ${t.rounds.length===1?'exchange':'exchanges'}.\n\n“${(mentor?instructor:opponent)[t.outcome]} ${voice[0]}”`,
  choices:[
   reply('review','Talk through the recorded exchanges','Let us look at what actually happened.',`${detail} ${mentor?'That is the part we can examine, rather than guessing what either of you intended.':concern}`),
   reply('reflect','Say what this practice means to you','I want to learn from it without having my future decided by one bout.',`${concern} ${voice[1]}`),
   reply('quiet','Keep it brief','I would rather let the result settle for now.',`${t.outcome==='withdrawn'?'You need not justify stopping.':mentor?'There is no examination hidden in this conversation.':'Fair enough. We have already shared the practice.'} ${voice[1]}`),
   reply('leave','Leave the bout behind','Thank you. I would like to leave the bout there.',mentor?'Then we will leave it there. Your other interests still have their place.':'Agreed. We have other things to talk about.')
  ]};
}
