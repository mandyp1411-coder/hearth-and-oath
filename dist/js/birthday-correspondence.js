import {seededRoll, withArticle } from './world.js';

const chapters=Object.freeze({
  infant:[
    'I am keeping this page for the day you are old enough to read it. There is no answer for you to give yet; being cared for is enough.',
    'You have a whole life ahead of you. For now, the grown people around you can do the worrying, and these words can wait in a safe place.',
    'This little note belongs to your earliest years. When you read it one day, I hope you will know that you did not have to earn your place among us.',
    'I cannot know who you will become. I can only hope that the world gives you time to find out, with someone kind nearby.'
  ],
  small:[
    'There is no need to learn everything at once. I hope this year leaves plenty of room for stories, play, and questions that make the grown people stop and think.',
    'Another birthday, and so many things still have new names. I hope you keep the pleasure of discovering them in your own time.',
    'I hope somebody listens carefully when you explain a game that only you understand. Your small ideas deserve a little room too.',
    'May this be a year with something soft to rest against, someone patient to listen, and a few good stories told more than once.'
  ],
  school:[
    'Tell me one thing you have learned because you wanted to, rather than because somebody set you a lesson. I would like to hear the whole explanation.',
    'I hope there is still something that makes you forget to count the hours. A good question can be a fine beginning to a year.',
    'Do you have a story you want to tell in your own way? It does not need to sound like the version in a book.',
    'I hope this year brings a friend who enjoys your questions. You do not need to know the answer before you are allowed to ask.'
  ],
  youth:[
    'You are allowed to change your mind as you learn more about yourself. I would rather hear an honest uncertainty than a plan chosen only to please me.',
    'What part of your day do people keep forgetting to ask about? That is the part I would like to hear when you feel like telling it.',
    'Growing up seems to bring a great many opinions from other people. Leave a little space among them for your own.',
    'I hope you find something this year that belongs to you: a skill, a friendship, or simply a place where you feel at ease.'
  ],
  threshold:[
    'There are roads I never took. You need not take them for me, and you need not avoid them because I did. I would like to understand the life you want.',
    'You do not owe anyone a perfect answer about your future on the morning of your birthday. A next step can be enough.',
    'I am trying to remember that advice is an offer, not a command. Tell me when you want a listener instead.',
    'I hope the choices ahead leave room for joy as well as duty. You will still be yourself on the days when you have accomplished very little.'
  ],
  adult:[
    'What has made your days feel worthwhile lately? I would like to hear about something smaller than a grand plan, if that is what comes to mind.',
    'I hope you have kept one part of your life that does not need to be useful to anyone. Tell me about it when you wish.',
    'Another birthday gives me a reason to write, but not a claim on your time. I hope the coming year makes room for the people and work you choose.',
    'I wonder what you would tell the younger person you used to be. You do not have to send me the answer; it is a good question to keep for yourself.'
  ],
  settled:[
    'We have both lived long enough to know that a life can change without announcing it. What has quietly become important to you?',
    'I hope there is someone with whom you can speak without first arranging your life into a success story. I would gladly hear the ordinary version.',
    'There are things I understand differently than I once did. Perhaps that is a good reason for us to keep talking, rather than assume we already know one another.',
    'If we spoke about your life now, where would you want to begin? I hope the coming year gives you a few days worth remembering for their own sake.'
  ],
  later:[
    'There is no prize for carrying every worry alone. I hope this year brings good company, tolerable aches, and time for the stories you still want to tell.',
    'I hope you are still finding things to be curious about. Years do not make a person finished, however confidently other people may speak of them.',
    'What would you like the younger people around you to understand about your life? I would rather hear your own words than decide the lesson for you.',
    'I hope there is room this year for an old pleasure and a new one. Neither needs to be earned by proving how much you can still do.'
  ]
});

function chapterFor(age){return age<3?'infant':age<6?'small':age<10?'school':age<16?'youth':age<18?'threshold':age<30?'adult':age<55?'settled':'later';}
function relationFor(state,p){
  if(p.familyRole==='parent'||p.role==='parent')return 'parent';
  if(p.familyRole==='caregiver'||p.familyRole==='guardian'||p.role==='guardian')return 'caregiver';
  if(p.familyRole==='sibling')return 'sibling';
  if(p.id===state.life?.partnerId||p.role==='partner'||p.role==='spouse')return 'partner';
  return 'friend';
}
function relationshipLine(state,p,relation,pick){
  const age=state.age||0;
  if(age<3)return relation==='parent'||relation==='caregiver'?'The work of keeping you safe belongs to us, not to you.':'There will be time for us to know one another when you are older.';
  if(p.bond<40)return 'We have not always found it easy to speak. I did not want this day to pass without a word; you need not find a reply before you are ready.';
  const lines={
    parent:['I am still learning how to be your parent as you become your own person.','You do not need to make your life resemble mine for me to care about it.','I hope I leave room to hear you, instead of always remembering who you were.','I am proud to know you, even on the days neither of us knows quite what to say.'],
    caregiver:['Care is more than a name in a household book. I hope you know you can speak honestly with me.','I cannot decide your path for you. I can try to be a steady person beside it.','There is no need to pretend everything is easy for my sake.','I am glad our lives have a place for one another.'],
    sibling:['We need not become alike to remain part of one another’s lives.','I hope we keep a little room for the stories nobody else in the family quite understands.','It is strange to watch you grow while I am trying to work out my own life too.','I still want to hear your side of things, even when we remember them differently.'],
    partner:['I am glad I get to keep discovering who you are, rather than decide I already know.','I hope we can make room for each other without losing the things that make us ourselves.','You need not turn this birthday into a list of everything still to be done.','I would like the coming year to hold a little time that belongs to us.'],
    friend:['I am glad our paths crossed. I would like to keep hearing where yours is taking you.','There is no debt attached to this letter. I only wanted you to know I was thinking of you.','I hope we find another unhurried conversation before too long.','A friendship can survive a quiet stretch. There is no need to apologize for having a life.']
  };
  return lines[relation][pick('relationship',lines[relation].length)];
}
function circumstanceLine(state,p,relation){
  if((state.age||0)<3)return '';
  const family=relation==='parent'||relation==='caregiver'||relation==='sibling';
  if(family&&state.age<18&&state.family?.housing==='unsheltered')return 'Finding a safe roof still matters more than any impressive plan. That worry should not rest on your shoulders alone.';
  if(state.life?.health<40)return 'If you are worn down or unwell, you do not owe me a cheerful account. Rest comes before an answer.';
  if(state.life?.stress>=65)return 'If the days feel crowded, let this page wait. There is no deadline for a reply.';
  if(state.age<18&&state.education?.enrolled)return 'I hope your lessons leave you curious, and that someone makes time for the questions outside them.';
  if(p.locationId&&state.locationId&&p.locationId!==state.locationId)return 'Distance makes me glad of a page that can travel between us. Write when it suits you; I can be patient.';
  if(family&&p.occupation&&p.occupation!=='schoolchild')return `My work as ${withArticle(p.occupation)} gives me plenty to think about, but I wanted to make room for your birthday too.`;
  if(p.disposition==='bold')return 'If you have a new idea, I hope you give yourself a fair chance to try it.';
  if(p.disposition==='reserved'||p.disposition==='quiet')return 'I am better with a few honest words than a grand speech. These will have to do for today.';
  return '';
}

/** Called once when a letter is delivered; its exact words are saved in the thread. */
export function birthdayLetterText(state,p){
  const age=state.age||0,relation=relationFor(state,p),chapter=chapterFor(age);
  const identity=`birthday-correspondence-v57:${p.id}:${state.timeline?.birthDay||0}:${state.dynasty?.generation||1}:${age}`;
  const pick=(part,length)=>seededRoll(state.seed,identity+':'+part,length);
  const ending=age%100>=11&&age%100<=13?'th':({1:'st',2:'nd',3:'rd'}[age%10]||'th');
  const greeting=age<3?`A note kept for ${state.hero?.name||'your future self'}:`:`${state.hero?.name||'My friend'}, happy ${age}${ending} birthday.`;
  const words=chapters[chapter][pick('chapter',chapters[chapter].length)];
  return [greeting,words,relationshipLine(state,p,relation,pick),circumstanceLine(state,p,relation),`— ${p.name}`].filter(Boolean).join('\n\n');
}
