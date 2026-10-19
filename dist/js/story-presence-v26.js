export function livingStoryPerson(s,id){return [...(s.life?.people||[]),...(s.companions||[])].find(p=>p.id===id&&p.alive!==false)||null;}
export function religiousQuestScene(s,q,choices=q.choices){
  let body=q.body(s),title=q.title;choices=choices?.map(c=>({...c}));
  if(q.id==='patients'){
    const parent=livingStoryPerson(s,'kin'),healer=livingStoryPerson(s,'orrin');
    body=`The cistern is contaminated by warmth from an ancient conduit. A fever patient asks for an ancestor’s advice; their sibling wants living medicine. ${healer?healer.name+' asks you to make room for consent.':'The clinic’s old rule is plain: leave room for the patient’s own answer.'} ${parent?parent.name+' waits outside the clinic.':'The patient’s family waits outside. Their anxious voices stir the memory of your own family’s losses.'}`;
  }
  if(q.id==='return'&&!livingStoryPerson(s,'mira')){
    body=`The remedy gives families breathing room. A clerk lays the clinic’s surviving records before you and asks how you learned about the conduit. ${s.campaign.facts.coercedTestimony?'The unwilling voice you bound remains part of the account.':'A patient’s informed permission is a fact worth protecting.'} Mira’s old notes lie beside the inkwell, in a hand that will write no more.`;
    choices=choices.map(c=>c.id==='mira'?{...c,label:'Keep a sealed private account and protect the patient’s identity',description:'Leave a limited written account under seal. The patient’s identity and your research remain private.'}:c);
  }
  if(q.id==='inquiry'&&!livingStoryPerson(s,'mira')){
    title='The Order’s difficult inquiry';body='The ledger names souls added to the anchor without consent. The surviving Lantern investigators read it, while their current command asks for a reassuring summary until the city has another source of protection. A chair stands empty where Mira once sat. Her earlier account is on the table; the investigators ask what you will put beside it.';
    choices=choices.map(c=>c.id==='record'?{...c,description:'Submit the original evidence and its limits to the investigators. The public record grows; Mira’s last account remains as she left it.'}:c.id==='limited'?{...c,description:'Keep the evidence in a sealed inquiry account while publication waits for a safer transition.'}:c);
  }
  if(q.id==='ferryman'&&!livingStoryPerson(s,'kest')){
    body='A transport receipt survives in Kest’s recorded papers. The ferry’s copied statement describes shelter given to the missing sibling after they refused a second load of human remains. It records fear for the people who hid them. The ink is old; no one here can say where the sibling lives now. You can protect or publish the dated testimony.';
    choices=choices.map(c=>c.id==='protect'?{...c,label:'Keep the dated statement under seal',description:'Protect the recorded names. The papers do not establish a living witness’s whereabouts or agreement.'}:c.id==='anonymous'?{...c,description:'Use a dated, anonymous copy without claiming a present witness.'}:{...c,label:'Publish the names from the old receipt',description:'Make the documentary evidence public despite its recorded fears. This secures no witness’s cooperation.'});
  }
  if(q.id==='council'&&s.campaign.facts.transportWitnessType==='recorded_statement')body=body.replace('Your documentary proof remains available without exposing a frightened witness.',s.campaign.facts.protectedTransportAccount?'The dated ferry statement lies under the seal you arranged, its names protected.':'Your dated ferry documents remain available; the sibling’s present whereabouts are still unknown.');
  if(q.id==='aftermath'&&!livingStoryPerson(s,'kin'))body=body.replace(/[^.]* asks what you want your next ordinary year to contain\./,' The next ordinary year is yours to choose. The empty places at your old table remain in the family record.');
  if(q.id==='rival'&&!livingStoryPerson(s,'rival')){
    body='The conduit map preserves the two names from your earlier research. Your former rival is no longer alive to make a new bargain. A patron offers to publish the work under your name alone. Their old signature is still clear on the page.';
    choices=choices.map(c=>c.id==='credit'?{...c,description:'Keep both researchers’ credit, including the work of your deceased rival.'}:c.id==='public'?{...c,description:'Communities gain the map with both original names preserved.'}:{...c,description:'Gain access at the cost of erasing your rival’s credit.'});
  }
  if(q.id==='hearth'&&!livingStoryPerson(s,s.life?.partnerId||'kin'))body='The household record asks what opening your home to strangers would mean for the people who still live there. Refuge matters, and earlier family losses do not erase the need for clear household boundaries. You bring the old house key to the meeting.';
  if(q.id==='confidant'&&!livingStoryPerson(s,'fellow')){
    title='A letter for the empty evening table';body='Your old friend’s letters remain beside the evening table. You find a blank page and think of what you never had time to tell them. You can write about the omen, your condition, or the privacy you needed. These words will stay in your own keeping.';
    choices=choices.map(c=>({...c,label:c.id==='fate'?'Write about the childhood omen and its unanswered questions':c.id==='condition'?'Write honestly about your supernatural condition':'Write about the boundaries you needed',description:'Keep a private remembrance. This creates no living confidant or practical help.'}));
  }
  return {title,body,choices};
}
export function conditionConfidenceScene(s,event){
  const condition=s.hero.condition,person=s.life?.people.find(p=>p.id===(event.id==='life_vampire_guest'?'fellow':'river')&&p.alive!==false),known=person?.knownFacts?.includes(condition?.type);
  if(event.id==='life_vampire_guest'&&known)return {body:`${person.name} remembers your daylight limits and offers supper after sunset. They ask which routines help you keep hunger under control. The existing private confidence remains private.`,choices:event.choices.map(c=>c.id==='dusk'?{...c,label:'Agree on the evening supper',description:'Strengthen the existing friendship and keep the same private confidence.'}:c.id==='truth'?{...c,label:'Discuss your current feeding boundaries',description:'Discuss the condition they already know. No first disclosure or public report occurs.'}:{...c,label:'Decline this supper and leave room for another',description:'Keep the existing confidence, with some lost bond and happiness.'})};
  if(event.id==='life_wolf_confidant'&&condition?.curseVersion===1)return {body:known?`${person.name} remembers your moon curse and asks how the refuge preparations are going. A confidence already shared is not forgotten; this conversation cannot train the beast by itself.`:event.body(s),choices:event.choices.map(c=>c.id==='tell'?{...c,label:known?'Discuss the safety plan they already know':c.label,description:'Strengthen the confidence and bond. Conversation grants no instant control; a real moon-watch agreement still needs preparation.'}:c.id==='train'?{...c,description:'Commit to later weekly practice and accept a little stress. This conversation grants no control or mastery.'}:c)};
  return {body:event.body(s),choices:event.choices};
}
