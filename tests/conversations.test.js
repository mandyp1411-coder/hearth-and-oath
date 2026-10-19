import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeProgression } from '../dist/js/classes.js';
import { initializeHousehold, educationTeacher } from '../dist/js/household.js';
import { initializePreferences, normalizePreferences } from '../dist/js/preferences.js';
import { initializeConversations, getContacts, getThread, dialogueActions, applyDialogueAction, replyToConversation, onConversationAge, dialogueEventIds, validateConversations } from '../dist/js/conversations.js';

test('new lives receive distinct milestone letters without repetitive yearly greetings or rewritten pending replies',()=>{
  const s=fixture(17);s.timeline.contentVersion=7;
  onConversationAge(s);assert.deepEqual(s.conversations.threads,{});
  s.age=18;s.day=18*365;onConversationAge(s);
  const letter=getThread(s,'kin').messages.at(-1).text;
  assert.ok(letter&&!letter.includes('A new year of your life'));
  talk(s,'kin');const pending=structuredClone(s.conversations.pending);
  const count=getThread(s,'kin').messages.length;
  s.age=19;s.day=19*365;onConversationAge(s);
  assert.equal(getThread(s,'kin').messages.length,count);
  assert.deepEqual(s.conversations.pending,pending);
  s.age=21;s.day=21*365;onConversationAge(s);
  assert.notEqual(getThread(s,'kin').messages.at(-1).text,letter);
  assert.deepEqual(s.conversations.pending,pending);
  const old=fixture(19);old.timeline.contentVersion=6;onConversationAge(old);
  assert.match(getThread(old,'kin').messages.at(-1).text,/Juniper, happy 19th birthday/);
});

function fixture(age=18,seed='letter-test') {
  const state={seed,day:age*365,age,phase:age<18?'childhood':'adult',timeline:{mode:'birth'},world:generateWorld(seed),locationId:'home',hero:{name:'Juniper',origin:'village',path:'unformed',specialization:null,ambition:'Find a place to belong',condition:null,gold:25,skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0]))},flags:{},obligations:[],journal:[],event:null,battle:null,
    campaign:{fate:'echo',facts:{},stage:'opening',act:0,ending:null},
    life:{happiness:60,people:[{id:'kin',name:'Edda Reed',role:'relative',age:27+age,bond:55,memories:[],knownFacts:[]},{id:'fellow',name:'Iven Vale',role:'friend',age,bond:35,memories:[],knownFacts:[]},{id:'rival',name:'Tess Bell',role:'rival',age:age+1,bond:18,memories:[],knownFacts:[]},{id:'river',name:'Sable Moss',role:'suitor',age:age+2,bond:30,memories:[],knownFacts:[]}],children:[]},
    companions:[{id:'mira',name:'Mira',role:'warrior',age,relationship:12,memories:[],recruited:true,active:true},{id:'orrin',name:'Orrin',role:'mage',age:age+4,relationship:0,memories:[],recruited:false,active:false},{id:'kest',name:'Kest',role:'rogue',age:age+1,relationship:0,memories:[],recruited:false,active:false}],
  };
  initializeProgression(state);initializeConversations(state);return state;
}
function context(s) {return {journal:(title,text,tag)=>s.journal.push({title,text,tag}),remember:(id,text,n)=>{const p=s.companions.find(p=>p.id===id);p.relationship+=n;if(!p.memories.includes(text))p.memories.push(text);},addObligation:(id,title,days,description)=>{if(!s.obligations.some(o=>o.id===id&&!o.resolved))s.obligations.push({id,title,description,dueDay:s.day+days,resolved:false});},finishObligation:id=>{const o=s.obligations.find(o=>o.id===id&&!o.resolved);if(o)o.resolved=true;},touchCampaign:()=>{}};}
function talk(s,id,reply) {assert.equal(applyDialogueAction(s,`talk_${id}`,context(s)),true);assert.equal(getThread(s,id).pending,true);if(reply)assert.equal(replyToConversation(s,id,reply,context(s)),true);}

test('contacts unlock with childhood ages while infancy observes without guardian dialogue choices',()=>{
  const s=fixture(0);assert.deepEqual(getContacts(s).map(p=>p.id),['kin']);const before=structuredClone(s);assert.deepEqual(dialogueActions(s),[]);assert.equal(applyDialogueAction(s,'talk_kin',context(s)),false);assert.deepEqual(getThread(s,'kin'),{messages:[],replies:[],pending:false});assert.equal(replyToConversation(s,'kin','comfort',context(s)),false);assert.deepEqual(s,before);
  s.age=3;assert.ok(getContacts(s).some(p=>p.id==='mira'));assert.ok(!getContacts(s).some(p=>p.id==='school-tutor'));s.age=6;assert.ok(getContacts(s).some(p=>p.id==='school-tutor'));assert.ok(getContacts(s).some(p=>p.id==='rival'));assert.equal(getContacts(s).find(p=>p.id==='river').role,'school friend');
});

test('named threads have actual replies and chronological remembered consequences',()=>{
  const s=fixture(7);talk(s,'school-tutor','study');const thread=getThread(s,'school-tutor');assert.equal(thread.pending,false);assert.equal(thread.messages.length,3);assert.equal(thread.messages[1].speaker,'hero');assert.equal(thread.messages[1].speakerName,'Juniper');assert.ok(thread.messages[2].speakerName.startsWith('Tutor')||thread.messages[2].speakerName.startsWith('Master')||thread.messages[2].speakerName.startsWith('Mistress'));assert.equal(s.hero.skills.scholarship,1);assert.equal(s.conversations.relationships['school-tutor'].memories.length,1);assert.equal(s.event,null);assert.equal(s.day,7*365);assert.equal(validateConversations(s.conversations,s),true);
});

test('pending conversations reject another person and forged replies without mutating any state',()=>{
  const s=fixture();talk(s,'fellow');const before=structuredClone(s);assert.equal(replyToConversation(s,'kin','listen',context(s)),false);assert.equal(replyToConversation(s,'fellow','erase',context(s)),false);assert.deepEqual(s,before);assert.match(dialogueActions(s).find(a=>a.id==='talk_kin').disabledReason,/current conversation/);applyDialogueAction(s,'talk_kin',context(s));assert.equal(s.conversations.pending.personId,'fellow');assert.equal(s.conversations.threads.kin,undefined);
});

test('condition confidence teaches only the selected participant and survives a save round trip',()=>{
  const s=fixture();s.hero.condition={type:'vampire',hunger:23};const bystanders=structuredClone({kin:s.life.people[0],river:s.life.people[3],mira:s.companions[0]});talk(s,'fellow','confide');const selected=s.life.people.find(p=>p.id==='fellow');assert.deepEqual(selected.knownFacts,['vampire','condition_vampire']);assert.equal(selected.bond,43);assert.deepEqual({kin:s.life.people[0],river:s.life.people[3],mira:s.companions[0]},bystanders);assert.equal(s.flags.conditionDisclosed,undefined);assert.equal(s.flags.miraKnowsCondition,undefined);assert.equal(s.legal,undefined);const copy=JSON.parse(JSON.stringify(s));assert.equal(validateConversations(copy.conversations,copy),true);assert.deepEqual(getThread(copy,'fellow'),getThread(s,'fellow'));assert.ok(getThread(copy,'fellow').messages.some(m=>m.text.includes('hunger')));
});

test('a privacy reply keeps supernatural knowledge local and family disclosure creates its own refuge',()=>{
  const s=fixture();s.hero.condition={type:'lycanthrope',control:40};talk(s,'fellow','private');assert.deepEqual(s.life.people[1].knownFacts,[]);assert.equal(s.hero.condition.control,40);talk(s,'kin','confide');assert.deepEqual(s.life.people[0].knownFacts,['lycanthrope','condition_lycanthrope']);assert.equal(s.flags.familyRefuge,true);assert.equal(s.flags.conditionDisclosed,true);assert.equal(s.hero.condition.control,43);assert.equal(s.flags.miraKnowsCondition,undefined);
});

test('Mira reacts to disclosed unwilling soul binding through an actual party consequence',()=>{
  const s=fixture();s.flags.forbiddenResearch=true;s.flags.soulBound=true;talk(s,'mira','consent');assert.equal(s.flags.miraKnowsResearch,true);assert.equal(s.flags.miraWithdrawn,true);assert.equal(s.companions[0].active,false);assert.equal(s.companions[0].relationship,-3);assert.deepEqual(s.companions[0].knownFacts,['unwilling_binding','ancestral_research']);assert.ok(getThread(s,'mira').messages[1].text.includes('I bound an unwilling soul'));assert.deepEqual(s.life.people[0].knownFacts,[]);assert.equal(s.legal,undefined);
});

test('fate confidences and destruction reactions add useful facts without advancing the campaign',()=>{
  const s=fixture(4);s.campaign.facts.clue4=true;talk(s,'kin','share');assert.ok(s.life.people[0].knownFacts.includes('fate_four'));assert.equal(s.campaign.facts.neighborSupport,true);assert.equal(s.campaign.stage,'opening');assert.equal(s.conversations.threads.mira,undefined);
  s.age=20;s.day=20*365;s.companions[0].age=20;s.world.locations.find(p=>p.id==='home').status='destroyed';talk(s,'mira','refuge');assert.equal(s.campaign.facts.refugeVolunteers,true);assert.equal(s.campaign.facts.confidedInMira,true);assert.equal(s.campaign.stage,'opening');assert.ok(s.companions[0].knownFacts.includes('world_home_destroyed'));assert.equal(getThread(s,'mira').messages.length,3);assert.equal(s.event,null);
});

test('mentor correspondence creates and then completes a real notes obligation',()=>{
  const s=fixture(18);talk(s,'school-tutor','notes');assert.equal(s.obligations.length,1);assert.equal(s.obligations[0].resolved,false);assert.equal(s.obligations[0].dueDay,s.day+60);talk(s,'school-tutor','share');assert.equal(s.obligations[0].resolved,true);assert.equal(s.hero.skills.scholarship,1);assert.ok(s.conversations.relationships['school-tutor'].memories.some(m=>m.includes('kept your promise')));
});

test('birthday letters are readable, arrive only once, and do not overwrite a pending choice',()=>{
  const s=fixture(12);onConversationAge(s,context(s));const copy=structuredClone(s.conversations);onConversationAge(s,context(s));assert.deepEqual(s.conversations,copy);assert.ok(getContacts(s).find(p=>p.id==='kin').unread>0);talk(s,'kin');assert.equal(getContacts(s).find(p=>p.id==='kin').unread,0);const pending=structuredClone(s.conversations.pending);s.age=13;s.day=13*365;onConversationAge(s,context(s));assert.deepEqual(s.conversations.pending,pending);assert.equal(s.event,null);assert.ok(getContacts(s).find(p=>p.id==='kin').unread>0);
});

test('ordinary conversations cannot be farmed for bonds or multiple yearly skill lessons',()=>{
  const s=fixture(12);talk(s,'mira','martial');assert.equal(s.hero.skills.weapons,1);const first=structuredClone(s.companions[0]);assert.match(dialogueActions(s).find(a=>a.id==='talk_mira').disabledReason,/already|shared/);applyDialogueAction(s,'talk_mira',context(s));assert.deepEqual(s.companions[0],first);talk(s,'fellow','arcane');assert.equal(s.hero.skills.arcana,0);assert.equal(s.conversations.pending,null);assert.equal(replyToConversation(s,'mira','martial',context(s)),false);
});

test('contacts and threads are pure, seeded variations are stable, and malformed threads fail validation',()=>{
  const s=fixture(7,'silver-fern');const before=structuredClone(s);getContacts(s);getThread(s,'kin');dialogueActions(s);assert.deepEqual(s,before);talk(s,'kin');const text=getThread(s,'kin').messages[0].text;const same=fixture(7,'silver-fern');talk(same,'kin');assert.equal(getThread(same,'kin').messages[0].text,text);const variations=new Set(['a','b','c','d','e','f'].map(seed=>{const q=fixture(7,seed);talk(q,'kin');return getThread(q,'kin').messages[0].text;}));assert.ok(variations.size>1);assert.equal(validateConversations(s.conversations,s),true);
  for(const change of [v=>v.pending.personId='unknown',v=>v.pending.nodeId='erase',v=>v.pending.replies[0].id='erase',v=>v.sequence=-1,v=>v.threads.kin[0].speaker='villain',v=>v.threads.kin[0].day=s.day+1,v=>v.relationships.unknown={bond:10,memories:[],knownFacts:[]}]){const value=structuredClone(s.conversations);change(value);assert.equal(validateConversations(value,s),false);}
  assert.deepEqual(dialogueEventIds(),{});
});

function homestead(age=0,setup='two_parents',seed='birthday-project') {
  const s=fixture(age,seed);s.revision=4;s.hero.appearance={ancestry:'tiefling'};s.hero.household='poor';s.life.stress=20;
  initializeHousehold(s,{config:{familySetup:setup}});initializePreferences(s);return s;
}

test('actual parents and siblings speak as themselves, and absent birth parents never become contacts',()=>{
  const s=homestead();const parents=s.life.people.filter(p=>p.familyRole==='parent');assert.equal(parents.length,2);assert.ok(getContacts(s).some(p=>p.id==='family_parent' && p.familyRole==='parent'));
  const sibling=s.life.people.find(p=>p.familyRole==='sibling');assert.ok(sibling);assert.equal(applyDialogueAction(s,'talk_'+sibling.id,context(s)),false);assert.deepEqual(getThread(s,sibling.id).replies,[]);onConversationAge(s);assert.equal(validateConversations(s.conversations,s),true);
  const orphan=homestead(7,'orphan');assert.equal(getContacts(orphan).filter(p=>p.familyRole==='parent').length,0);assert.equal(getContacts(orphan).find(p=>p.id==='kin').familyRole,'guardian');talk(orphan,'kin','belong');assert.match(getThread(orphan,'kin').messages[0].text,/without pretending to be your birth parent/);assert.match(getThread(orphan,'kin').messages[0].text,/tiefling heritage/);assert.equal(orphan.hero.gold,25);assert.equal(orphan.family.housing,'shelter');assert.equal(validateConversations(orphan.conversations,orphan),true);
});

test('a former teacher retains their actual identity and memories when education changes route',()=>{
  const s=homestead(14);s.education.route='community';s.education.schoolId='school-community';s.education.enrolled=true;
  const original=educationTeacher(s);talk(s,original.id,'arcane');const saved=structuredClone(s.conversations.relationships[original.id]);
  s.education.route='academy';s.education.schoolId='school-academy';const teacher=educationTeacher(s);
  assert.equal(teacher.id,'school-academy-tutor');assert.equal(getContacts(s).find(p=>p.id===teacher.id).name,teacher.name);assert.match(getContacts(s).find(p=>p.id===teacher.id).description,new RegExp(teacher.schoolName));assert.equal(getContacts(s).find(p=>p.id===original.id).name,original.name);assert.deepEqual(s.conversations.relationships[original.id],saved);assert.equal(getThread(s,original.id).messages.length,3);talk(s,teacher.id,'arcane');assert.equal(validateConversations(s.conversations,s),true);assert.ok(s.conversations.relationships[teacher.id].memories.length);
});

test('a deceased relative leaves an intact historical thread without appearing as a living contact',()=>{
  const s=homestead(7);talk(s,'family_parent','ask');const history=structuredClone(getThread(s,'family_parent').messages);s.life.people.find(p=>p.id==='family_parent').alive=false;s.family.members.find(m=>m.personId==='family_parent').availability='deceased';
  assert.ok(!getContacts(s).some(p=>p.id==='family_parent'));assert.ok(!dialogueActions(s).some(a=>a.id==='talk_family_parent'));assert.deepEqual(getThread(s,'family_parent').messages,history);assert.equal(applyDialogueAction(s,'talk_family_parent'),false);assert.equal(validateConversations(s.conversations,s),true);
});

test('v3 pending family and teacher conversations survive migration and free preference edits exactly',()=>{
  for (const id of ['kin','school-tutor']) {
    const s=fixture(7);s.revision=3;talk(s,id);const pending=structuredClone(s.conversations.pending);const messages=structuredClone(s.conversations.threads[id]);
    initializeHousehold(s,{migration:true});initializePreferences(s,{migration:true});s.revision=4;if(id==='school-tutor'){s.education.route='academy';s.education.schoolId='school-academy';}
    s.hero.preferences=normalizePreferences({pursuit:'nature',socialStyle:'bold',value:'freedom',food:'spiced'});
    assert.deepEqual(s.conversations.pending,pending);assert.deepEqual(s.conversations.threads[id],messages);assert.equal(validateConversations(s.conversations,s),true);assert.equal(replyToConversation(s,id,pending.replies[0].id,context(s)),true);assert.equal(validateConversations(s.conversations,s),true);
  }
});

test('food and personality matter in real conversations without letting edits farm joy or reveal bystander facts',()=>{
  const s=homestead(18);s.hero.preferences=normalizePreferences({pursuit:'craft',socialStyle:'quiet',value:'freedom',food:'spiced'});
  talk(s,'kin','ask');const before=structuredClone({gold:s.hero.gold,skills:s.hero.skills,others:s.life.people.filter(p=>p.id!=='kin'),happiness:s.life.happiness});talk(s,'kin');const pending=structuredClone(s.conversations.pending);assert.equal(pending.nodeId,'meal');assert.match(getThread(s,'kin').messages.at(-1).text,/thoughtful pause/);assert.match(getThread(s,'kin').messages.at(-1).text,/room to choose/);
  s.hero.preferences=normalizePreferences({...s.hero.preferences,socialStyle:'bold'});assert.deepEqual(s.conversations.pending,pending);assert.equal(validateConversations(s.conversations,s),true);assert.equal(replyToConversation(s,'kin','spiced',context(s)),true);assert.equal(s.life.happiness,before.happiness+3);assert.equal(s.life.stress,19);assert.equal(s.preferenceHistory.lastEnjoymentDay,s.day);assert.equal(s.preferenceHistory.memories.length,1);assert.equal(s.hero.gold,before.gold);assert.deepEqual(s.hero.skills,before.skills);assert.deepEqual(s.life.people.filter(p=>p.id!=='kin'),before.others);
  talk(s,'mira','listen');talk(s,'mira','sweet');assert.equal(s.preferenceHistory.memories.length,1);assert.match(dialogueActions(s).find(a=>a.id==='talk_kin').disabledReason,/year/);assert.equal(validateConversations(s.conversations,s),true);
});

test('deceased children leave readable historical threads and no living conversation action',()=>{
 const s=homestead(40);s.life.children.push({id:'child-1',name:'Lark Reed',age:14,bornDay:26*365,alive:true});talk(s,'child-1','listen');
 const old=structuredClone(getThread(s,'child-1').messages);s.life.children[0].alive=false;s.life.children[0].deathDay=s.day;
 assert.ok(!getContacts(s).some(p=>p.id==='child-1'));assert.ok(!dialogueActions(s).some(a=>a.id==='talk_child-1'));
 assert.equal(applyDialogueAction(s,'talk_child-1'),false);assert.deepEqual(getThread(s,'child-1').messages,old);assert.equal(validateConversations(s.conversations,s),true);
});

test('professional conversations respect privacy and old pending dialogue after a roleplay upgrade',()=>{
 const s=homestead(18);s.hero.profession='Blacksmith';s.careers={records:{Blacksmith:{workedDays:45,commissions:2}}};
 talk(s,'fellow');const oldPending=structuredClone(s.conversations.pending);s.timeline.roleplayVersion=1;
 assert.equal(validateConversations(s.conversations,s),true);assert.deepEqual(s.conversations.pending,oldPending);
 replyToConversation(s,'fellow',oldPending.replies[0].id,context(s));
 talk(s,'fellow');assert.equal(s.conversations.pending.nodeId,'vocation');assert.match(getThread(s,'fellow').messages.at(-1).text,/45 actual working days and 2 delivered commissions/);
 const before=structuredClone({hero:s.hero,others:s.life.people.filter(p=>p.id!=='fellow')});
 replyToConversation(s,'fellow','private',context(s));assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.life.people.filter(p=>p.id!=='fellow'),before.others);
 assert.ok(!s.life.people.find(p=>p.id==='fellow').knownFacts.includes('profession_blacksmith'));assert.equal(validateConversations(s.conversations,s),true);
});

test('new lives rotate eight ordinary stories and retain the exact waiting conversation on reload',()=>{
  const s=fixture(18,'new-conversation-deck');s.flags.portraitGeneration=1;
  const nodes=new Set();
  for(let age=18;age<26;age++){
    s.age=age;s.day=age*365;applyDialogueAction(s,'talk_fellow',context(s));
    const pending=structuredClone(s.conversations.pending);assert.match(pending.nodeId,/^ordinary_v12_/);nodes.add(pending.nodeId);
    assert.equal(validateConversations(s.conversations,s),true);
    const restored=JSON.parse(JSON.stringify(s));
    assert.equal(replyToConversation(restored,'fellow','question',context(restored)),true);
    assert.equal(replyToConversation(s,'fellow','question',context(s)),true);assert.deepEqual(restored,s);
    assert.ok(s.life.people.find(p=>p.id==='fellow').knownFacts.some(f=>f.startsWith('story_')));
  }
  assert.equal(nodes.size,8);
  const legacy=fixture(18);talk(legacy,'fellow');assert.equal(legacy.conversations.pending.nodeId,'ordinary');
});

test('using a person’s worry has a remembered cost without changing another person or granting a free reward',()=>{
  const s=fixture(20);s.flags.portraitGeneration=1;talk(s,'rival');
  const actor=s.life.people.find(p=>p.id==='rival'),other=structuredClone(s.life.people.find(p=>p.id==='fellow')),before=actor.bond,gold=s.hero.gold;
  assert.equal(replyToConversation(s,'rival','pressure',context(s)),true);assert.equal(actor.bond,before-8);assert.equal(s.hero.gold,gold);
  assert.ok(actor.knownFacts.includes('uses_vulnerability'));assert.ok(actor.memories.some(m=>m.includes('tried to make me owe')));
  assert.deepEqual(s.life.people.find(p=>p.id==='fellow'),other);assert.equal(validateConversations(s.conversations,s),true);
});
