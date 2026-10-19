const picks=['care','curiosity','courage'];
const make=(id,title,body,rows)=>({id,title,body,choices:rows.map((r,i)=>({id:picks[i],label:r[0],description:r[1],outcome:r[2],effect:r[3]}))});
const effects=(key,value,skill,person)=>({skills:[skill],flags:{[key]:value},...(person?.alive!==false&&person?.id?{bonds:{[person.id]:3}}:{})});
function practiced(s) {
  const r=s.upbringing?.records?.filter(r=>r.developed&&r.age<s.age).at(-1);
  return r?{learning:'Your remembered years of questions give you something to bring.',friendship:'You have practiced making room for other people.',discovery:'The paths and games you practiced have become familiar.',practice:'You have practiced patience and ordinary responsibilities.'}[r.focus]:'';
}
function context(s) {
  return s.family?.housing==='unsheltered'?'The household is still looking for a lasting roof.':s.family?.support<40?'Care at home is stretched thin this season.':s.family?.setup==='orphan'||s.family?.setup==='homeless'?'The guardian who raises you keeps a place for you.':'The household has its own work and rhythms.';
}
export function childhoodMilestone(s,n,{recallOnly=false}={}) {
  const flags=s.timeline.storybook?.flags || {},p=n.friend?.id!==n.kin?.id&&n.friend?.alive!==false?n.friend:null;
  const friend=p?.name || 'another learner',kin=n.kin?.alive!==false?n.kin:null,carer=kin?.name || 'the people keeping the hearth';
  const independence=s.timeline.storybook?.records?.find(r=>r.sceneId==='growth-first-independence');
  if(s.age===18&&flags.growingIndependence&&!flags.growingAdultChoice&&independence) {
    const certificate=s.education?.qualifications?.at(-1)?.label;
    return make('growth-kept-plan','Your First Adult Birthday',`At ${independence.age}, you shared a day that stayed with you. ${independence.outcome} ${practiced(s)} ${certificate?`Your record now includes a ${certificate.toLowerCase()}.`: 'There is time to choose your next course, workplace or journey.'} ${carer} leaves the next decision with you.`,[
      ['Thank the people who raised you','Practice Persuasion and strengthen this family bond.',`You sit beside the person who cared for you and speak about what their help has meant. The conversation stays in your shared memory.`,effects('growingAdultChoice','rooted','persuasion',kin)],
      ['Share what you hope to learn next','Practice Scholarship and strengthen this friendship.',`You and your friend compare questions for the next teacher you meet. You keep their notes beside your own.`,effects('growingAdultChoice','learning','scholarship',p)],
      ['Spend the morning outdoors with your friend','Practice Survival and strengthen this friendship.',`You spend the morning reading the weather and finding a safe path together. Before parting, you mark what you learned in your journal.`,effects('growingAdultChoice','open','survival',p)],
    ]);
  }
  if(s.age>=9&&s.age<=11&&flags.growingSchoolStart&&!flags.growingSchoolRecall) {
    const old={company:'make room beside another learner',question:'bring a question of your own',making:'show what you could make'}[flags.growingSchoolStart];
    return make('growth-old-slate','The old question on the slate',`When lessons first opened, you chose to ${old}. ${friend} brings back the marked slate. ${practiced(s)} This time, the younger learners ask what they can change.`,[
      ['Try their idea beside the old one','There is room for another set of marks.',`You keep both attempts on the slate. The younger learners can see where their idea changed yours.`,effects('growingSchoolRecall',true,'scholarship',p)],
      ['Ask what made the task difficult for them','An answer is easier to share when the question is heard.',`You listen before explaining. The lesson becomes something you worked through together.`,effects('growingSchoolRecall',true,'persuasion',p)],
      ['Make a small model they can take apart','The pieces can be used again.',`You leave the model with its loose pieces. It gives the next learner a place to begin, rather than a rule to copy.`,effects('growingSchoolRecall',true,'survival',p)],
    ]);
  }
  if(recallOnly)return null;
  if(s.age>=3&&s.age<=4&&!flags.growingFirstVoice)return make('growth-first-voice','A place beside the table',`${context(s)} You pull a small stool beside ${carer}. There are buttons to count, a story to finish, and another child waiting for a turn.`,[
    ['Ask for the next part of the story','You know where the telling stopped.',`${carer} leaves a pause for your own words. The story is remembered as something you helped tell.`,effects('growingFirstVoice','story','scholarship',kin)],
    ['Share the buttons and make a game','The other child can choose the first piece.',`The buttons become a game with two different rules. You practice explaining yours and hearing someone else’s.`,effects('growingFirstVoice','company','persuasion',p)],
    ['Build a little path along the table','The pieces are small enough to move again.',`You remake the path when it falls. A familiar hand steadies the stool while you try another way.`,effects('growingFirstVoice','making','survival',kin)],
  ]);
  if(s.age>=6&&s.age<=7&&!flags.growingSchoolStart)return make('growth-school-door','A place at lessons',`${context(s)} Free community and shrine lessons are now open. ${practiced(s)} ${friend} waits beside a bench while you decide what to bring to the teacher. This first visit is to look around; choosing your lessons comes later.`,[
    ['Make room beside the other learner','A first lesson can begin with company.',`You move the bench so another learner fits. You will still choose a school and attend its lessons yourself.`,effects('growingSchoolStart','company','persuasion',p)],
    ['Bring the question you kept asking at home','The teacher leaves a space on the slate.',`You put your own question on the slate. Your early stories and counting have a place in further learning; enrollment remains your choice.`,effects('growingSchoolStart','question','scholarship',kin)],
      ['Show a small thing you made','Useful questions can begin with your hands.',`You bring a simple model and explain how you changed it. The teacher makes room on the bench for the pieces.`,effects('growingSchoolStart','making','survival',kin)],
  ]);
  if(s.age>=12&&s.age<=13&&!flags.growingNextLessons)return make('growth-wider-lessons','More than one kind of lesson',`${context(s)} Academy study and practical apprenticeship are now possible. ${practiced(s)} ${friend} asks how lessons will fit beside life at home. You can discuss a direction before making any enrollment or work commitment.`,[
    ['Keep time for questions and further reading','A free scholarship can be requested separately.',`You write down the questions you want to pursue. A teacher adds the times when you can visit and ask about a place.`,effects('growingNextLessons','inquiry','scholarship',p)],
    ['Ask to try a practical lesson before deciding','Arrange a demonstration before committing to an apprenticeship.',`You make room for a practical demonstration. The useful skill stays yours without a promise to become the household’s next wage earner.`,effects('growingNextLessons','practice','survival',kin)],
    ['Work out a schedule that leaves room for both','The household can hear what you can honestly offer.',`You name the time you can share and the lessons you want to keep. Other people’s needs do not erase your own growing plans.`,effects('growingNextLessons','balance','persuasion',kin)],
  ]);
  if(s.age>=16&&s.age<=17&&!flags.growingIndependence)return make('growth-first-independence','After Lessons',`${context(s)} Paid work and wider roads are opening, while lessons can continue. ${practiced(s)} ${friend} asks what you want to try first. You have an afternoon to spend together before deciding on a course or workplace.`,[
    ['Study beside your friend','Practice Scholarship and strengthen this friendship.',`You compare notes and work through a difficult question together. When the light fades, you leave the books open for next time.`,effects('growingIndependence','study','scholarship',p)],
    ['Help repair something at home','Practice Survival and strengthen this family bond.',`You help mend a worn household tool, learning from the hands beside yours. It is useful practice before choosing a trade.`,effects('growingIndependence','work','survival',kin)],
    ['Talk over supper with your family','Practice Persuasion and strengthen this family bond.',`Over supper, you speak honestly about what you want from the coming year. Someone who knows you listens.`,effects('growingIndependence','household','persuasion',kin)],
  ]);
  return null;
}
