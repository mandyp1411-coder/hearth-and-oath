import { seededRoll } from './world.js';
import { COMPANION_IDENTITIES } from './people-context.js';

const VOICES={
  kind:{label:'Warm',open:['Come sit. The kettle is still warm.','I kept the better chair for you.','There you are. I was hoping for company.'],listen:['That helps more than you think.','You remembered. I appreciate that.','Stay a little longer, if you can.'],tease:['Oh, you are trouble. I missed that.','I shall forgive that if you pour the tea.','Careful. I know your embarrassing stories too.']},
  driven:{label:'Ambitious',open:['I have a plan. Tell me where it falls apart.','Good, you are here. I have been working on something.','I am not letting this year get away from me.'],listen:['At last, someone who asks about the work.','Then I will give it another try.','Remember that. I intend to see it through.'],tease:['Laugh now. I will make it work.','You can mock the plan after I finish it.','I deserved that. A little.']},
  reserved:{label:'Reserved',open:['You can sit here. We need not fill every silence.','I was just putting this away. No, you may stay.','It is quieter here than in the street.'],listen:['I did not expect to tell anyone that.','Thank you for letting me finish.','That was easier than I feared.'],tease:['I am trying very hard not to smile.','You are pleased with yourself, I see.','I will pretend I did not hear that.']},
  bold:{label:'Blunt',open:['You look as though you have something to say. Out with it.','Well, what have you been up to?','Come on. You can tell me the awkward part.'],listen:['Good. An honest answer at last.','That is something I can work with.','Then let us stop talking around it.'],tease:['Ha! I walked into that one.','You have got sharper since we last met.','Next time I get the first joke.']},
  wry:{label:'Dry humor',open:['I survived another meeting. There ought to be a medal.','Nothing has caught fire today. An excellent start.','I was being useful. A temporary condition.'],listen:['I complain because the alternative is singing.','Well, that nearly ruined my pessimism.','Do not tell anyone I am grateful.'],tease:['A worthy insult. I shall keep it.','There is hope for your sense of humor.','You have been practicing that, haven’t you?']},
  practical:{label:'Practical',open:['Hold this a moment. There, now we can talk.','I have finished the hard part. Probably.','A dry seat and a working lamp. We have what we need.'],listen:['That is useful. I can begin with that.','One thing at a time. I can manage it.','I will try your idea before dismissing it.'],tease:['Very funny. You can help carry it now.','I will add your joke to the repair bill.','If wit fixed things, you would be rich.']},
};
export function voiceProfile(s,p) {
  const id=p.id,key=seededRoll(s.seed,'voice:'+id,6),keys=Object.keys(VOICES);
  const voice=VOICES[p.disposition||p.source?.disposition]?p.disposition||p.source.disposition:keys[key];
  const interests=['a half-finished garden','a song learned on the road','a broken keepsake','a journey to the coast','a recipe from home','a book with missing pages','a small wood carving','a pair of unruly hens','a stubborn stray cat','a new market stall','an old family letter','a contest at the next fair','a collection of river stones','an unfinished lullaby','a new bread recipe','a leaking window','a neighbor’s garden','a map of the old lanes','a hand-carved flute','a painted wooden bird','a new walking stick','a ribbon from the last fair','a little clay bowl','a repaired pair of shoes'];
  const keepsakes=['smooth river pebble','copper bead','little wooden rook','piece of sea glass','folded paper bird','old bronze rivet','linen ribbon','carved bird','polished shell','small iron key','tarnished silver seal','amber button'];
  return {id:voice,label:VOICES[voice].label,keepsake:keepsakes[seededRoll(s.seed,'voice-keepsake:'+id,keepsakes.length)],interest:interests[seededRoll(s.seed,'voice-interest:'+id,interests.length)],detail:p.character?.detail||p.source?.character?.detail||null};
}
export function characterConversation(s,p,{mode=p.locationId&&p.locationId!==s.locationId?'letter':'visit'}={}) {
  if(s.age<3)return null;
  const profile=voiceProfile(s,p),v=VOICES[profile.id],prefix=`${p.id}:voice-${s.age}-`;
  const used=(s.conversations?.seen||[]).filter(k=>k.startsWith(prefix));
  if(used.length>=6)return null;
  const index=(seededRoll(s.seed,'voice-order:'+p.id,6)+used.length)%6,topic=`voice-${s.age}-${index}`,variant=seededRoll(s.seed,`voice-line:${p.id}:${topic}`,3);
  const relation=p.familyRole||p.role,young=s.age<12||p.age<12,place=s.world.locations.find(a=>a.id===p.locationId)?.name||'home';
  const memory=(s.conversations?.relationships?.[p.id]?.memories||p.source?.memories||[]).map(m=>typeof m==='string'?m:m?.text||m?.description||'').filter(m=>m&&!m.startsWith('You made time to hear about')).at(-1);
  const identity=COMPANION_IDENTITIES[p.id],stage=Math.min(5,s.rpg?.companionStages?.[p.id]?.stage||0);
  const companion=identity?[identity.updates[stage],identity.answer,identity.boundary]:null;
  const topics=young&&p.age>=16?[
    `“I wanted to show you ${profile.interest}. What have you been curious about?”`,
    '“We could walk as far as the well together. You can choose which lane.”',
    s.age>=6?'“What was the hardest question at your lesson? I used to get stuck too.”':'“There is always time for one more question. What is yours?”',
    '“You are getting taller. Some days I still expect to find you under the table.”',
    `“You know my ${profile.keepsake}? I will tell you where I found it.”`,
    memory?`“I remember this.” ${memory.slice(0,150)}`:`“You can tell me when something worries you. I will listen.”`,
  ]:young?[
    `“I keep thinking about ${profile.interest}. Want to hear my idea?”`,
    '“Want to race to the well? We can argue about who won afterward.”',
    '“I got an answer wrong today. Everyone else seemed to know it.”',
    '“Do you think we will still know each other when we are grown?”',
    `“There is something I want to show you next time we meet in ${place}.”`,
    memory?`“I keep thinking about what happened before.” ${memory.slice(0,150)}`:'“I have a story. Promise you will not laugh at the ending.”',
  ]:[
    `“I have been occupied with ${profile.interest}. It is taking longer than I expected.”`,
    companion?`“${companion[variant]}”`:`“${p.occupation?`The ${p.occupation.toLowerCase()} work has been tiring`:'The days have been busy'}. I would like one evening for myself.”`,
    profile.detail?`${p.name} ${profile.detail}. “I did not always do that. It began long before we met.”`:`“I have been wondering whether to take a different road this year.”`,
    `“${p.bond>=65?'I can be myself with you. That matters to me.':p.bond<25?'We do not know each other very well yet.':'It is good to have a familiar face here.'}”`,
    `“${relation==='parent'||relation==='guardian'?'I still remember your first winter here.':relation==='teacher'?'There was a question in class that stayed with me.':`I heard an odd little story in ${place}. It made me think of you.`}”`,
    memory?`“I have not forgotten.” ${memory.slice(0,170)}`:`“Next time, perhaps I will have finished ${profile.interest}.”`,
  ];
  const ask=['How is it going?','Tell me the part that matters to you.','What happened next?'][variant];
  const specific=['I will tell you how '+profile.interest+' turns out.','You can ask me about '+profile.interest+' next time.','It is one reason I still keep this '+profile.keepsake+'.'][variant];
  const teasing=p.bond<30?-2:profile.id==='reserved'?1:3;
  const scene={nodeId:'voice_v28',topic,title:young?'A little time together':'An evening conversation',body:`${p.name} turns ${/^[aeiou]/i.test(profile.keepsake)?'an':'a'} ${profile.keepsake} between their fingers. “${v.open[variant]}”\n\n${topics[index]}`,choices:[
    {id:'listen',label:ask,description:'Listen and remember this person’s own concern.',text:ask,response:v.listen[variant]+' '+specific,effect:{bond:4,memory:`You made time to hear about ${profile.interest} at age ${s.age}.`}},
    {id:'share',label:young?'Tell them about your day':'Share what your own days have been like',description:'Trade ordinary news without creating a quest.',text:'I have a story for you too.',response:profile.id==='reserved'?'I would like to hear it. Take your time.':profile.id==='driven'?'Good. Tell me what you are working toward.':profile.id==='wry'?'Please let it be less embarrassing than mine.':'Go on. I am listening.',effect:{bond:3,memory:`At age ${s.age}, we traded news beside ${place}; you asked about ${profile.interest}.`}},
    {id:'tease',label:'Make a gentle joke',description:p.bond<30?'You do not know each other well; the joke may land poorly.':'Your shared familiarity leaves room for a little humor.',text:'I think you may be taking this a little too seriously.',response:p.bond<30?'You do not know me well enough for that.':v.tease[variant],effect:{bond:teasing,memory:p.bond<30?'Your joke felt too familiar before we knew each other.':'We found a little humor in a difficult day.'}},
    {id:'leave',label:'Say goodbye for now',description:'Leave the conversation without a promise or penalty.',text:'I should go. It was good to see you.',response:profile.id==='reserved'?'Yes. Come again when you like.':profile.id==='bold'?'Then stop by again. I want the rest of that story.':'Take care on your way home.',effect:{bond:0}},
  ]};
  if(mode==='letter'){
    const here=s.world.locations.find(a=>a.id===s.locationId)?.name||'your current stop';
    const openings={kind:'I was glad to receive your note.',driven:'I have enclosed the next part of my plan.',reserved:'It is easier to find the words on paper.',bold:'Write back with the awkward part. I can take it.',wry:'The paper has survived another meeting. A fine start.',practical:'I finished the work before sitting down to write.'};
    let account=topics[index];
    if(!young&&index===2&&profile.detail)account='“There is a habit I picked up long before we met. I will tell you its story when we next sit together.”';
    if(young&&index===1)account='“When we next meet, we could walk as far as the well. You can choose the lane.”';
    scene.title='A letter from '+p.name;
    scene.body=`A letter from ${p.name} in ${place} reaches you in ${here}. “${openings[profile.id]}”\n\n${account}`;
    for(const reply of scene.choices){
      reply.response=reply.response.replace('Stay a little longer, if you can.','Write again when you can.').replace('I shall forgive that if you pour the tea.','I shall forgive that over tea when we meet.').replace('Very funny. You can help carry it now.','Very funny. You can help carry it when we meet.');
      if(reply.id==='listen')reply.description='Read and reply to this person’s own concern.';
      if(reply.id==='share')reply.effect.memory=`At age ${s.age}, we traded letters between ${here} and ${place}; you asked about ${profile.interest}.`;
      if(reply.id==='leave'){reply.label='End the letter for now';reply.text='I will end this letter here. It was good to hear from you.';reply.response='Take care until we write again.';}
    }
  }
  return scene;
}
export function contactPage(s,contacts,{scope='circle',query='',page=0,focusId=null}={}) {
  const pending=s.conversations?.pending?.personId;
  let rows=contacts.filter(p=>scope==='nearby'?p.locationId===s.locationId:scope==='circle'?p.familyRole||p.kind==='companion'||p.id===s.life?.partnerId||p.bond>=65||p.id===pending||s.conversations?.threads?.[p.id]?.length: true);
  if(query.trim()){const q=query.trim().toLowerCase();rows=rows.filter(p=>(p.name+' '+p.role).toLowerCase().includes(q));}
  rows.sort((a,b)=>(b.id===pending)-(a.id===pending)||Boolean(b.familyRole)-Boolean(a.familyRole)||(b.unread>0)-(a.unread>0)||b.bond-a.bond||a.name.localeCompare(b.name));
  const pages=Math.max(1,Math.ceil(rows.length/12)),target=focusId?rows.findIndex(p=>p.id===focusId):-1,index=target>=0?Math.floor(target/12):Math.max(0,Math.min(pages-1,page));
  return {contacts:rows.slice(index*12,index*12+12),total:rows.length,page:index,pages};
}
