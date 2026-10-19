import { seededRoll } from './world.js';
import { educationTeacher } from './household.js';

// These are ties between people already present in the simulation. A private
// development is not a report to the player, and a saved invitation never rerolls.
const MAX_NODES=96, MAX_EDGES=128, MAX_QUEUE=6;
const clamp=n=>Math.max(0,Math.min(100,n));
const home=s=>s.hero.birthplaceId || (s.hero.origin==='city'?'city':'home');
const owner=s=>`birth-${s.timeline?.birthDay ?? -6570}`;
const blocked=s=>s.event || s.battle || s.conversations?.pending || s.dungeon || s.timeline?.journey || s.workshop?.project || s.life?.plan || s.careers?.batch;
const active=s=>!!s.social && s.age>=3 && s.hero.alive!==false && s.phase!=='retired' && !blocked(s);
const node=(s,id)=>s.social?.nodes.find(p=>p.id===id);
const edge=(s,id)=>s.social?.edges.find(e=>e.id===id);
const placeName=(s,id)=>s.world.locations.find(p=>p.id===id)?.name || 'the village';
const opt=(id,label,description='')=>({id,label,description});
const sourceKey=(kind,p,bornDay)=>`${kind}:${p.id}:${p.name}:${bornDay}`;

function actors(s) {
  const found=[];
  const add=(kind,p,minAge,locationId,bornDay)=>{
    if(!p || typeof p.name!=='string' || s.age<minAge)return;
    bornDay=Number(bornDay) || 0;
    const recorded=(s.lineage?.people || []).filter(r=>r.name===p.name&&r.bornDay===bornDay);
    const lineageId=p.sourceLineageId || (recorded.length===1?recorded[0].id:null);
    found.push({kind,sourceId:p.id,name:p.name,bornDay,lineageId,age:p.age ?? Math.max(0,Math.floor((s.day-bornDay)/365)),alive:p.alive!==false,locationId,role:p.familyRole || p.role || kind,record:p,key:sourceKey(kind,p,bornDay)});
  };
  for(const p of s.life?.people || []) {
    const member=s.family?.members?.find(m=>m.personId===p.id);
    if(member && member.availability!=='present')continue;
    const born=p.bornDay ?? (Number.isInteger(p.baseAge)?-p.baseAge*365:(s.timeline?.birthDay || 0)+(s.age-(p.age || 0))*365);
    add('life',p,p.role==='relative'?0:p.role==='friend'?3:6,p.locationId || home(s),born);
  }
  for(const p of s.companions || [])add('companion',p,{mira:3,orrin:6,kest:10}[p.id] || 6,p.recruited&&p.active?s.locationId:home(s),p.bornDay ?? -(p.baseAge || 0)*365);
  for(const p of [...(s.society?.people || []),...(s.society?.archive || [])])if(!p.sourcePersonId)add('society',p,16,p.locationId,p.bornDay);
  if(s.age>=6 && s.education?.enrolled) {
    const p=educationTeacher(s);
    if(p)add('teacher',p,6,p.locationId,s.education.teachers?.[p.route]?.bornDay ?? s.day-p.age*365);
  }
  for(const p of s.life?.children || [])if(p.age>=3)add('child',p,18,home(s),p.bornDay ?? (s.timeline?.birthDay || 0)+(s.age-p.age)*365);
  return found.filter((a,i)=>!found.slice(0,i).some(b=>a.key===b.key || a.lineageId&&a.lineageId===b.lineageId));
}
function actual(s,p) {return actors(s).find(a=>a.key===p.key) || null;}
function identity(s,a) {return `social-person-${seededRoll(s.seed,a.key,1000000000)}`;}
function sync(s) {
  const current=actors(s),matched=new Set();
  for(const a of current) {
    let p=s.social.nodes.find(n=>n.key===a.key);
    if(!p) {
      // Contact slots change when a friend becomes an heir's guardian or a
      // surviving neighbor. The world person and their graph node do not.
      let candidates=a.lineageId?s.social.nodes.filter(n=>!matched.has(n.id)&&n.lineageId===a.lineageId):[];
      if(candidates.length!==1) {
        const unambiguous=current.filter(other=>other.name===a.name&&other.bornDay===a.bornDay).length===1;
        candidates=unambiguous?s.social.nodes.filter(n=>!matched.has(n.id)&&n.name===a.name&&n.bornDay===a.bornDay):[];
      }
      if(candidates.length===1)p=candidates[0];
    }
    if(!p && s.social.nodes.length<MAX_NODES) {
      let id=identity(s,a),suffix=0;
      while(s.social.nodes.some(n=>n.id===id))id=`${identity(s,a)}-${++suffix}`;
      p={id,key:a.key,source:a.kind,sourceId:a.sourceId,lineageId:a.lineageId,name:a.name,bornDay:a.bornDay,role:a.role,locationId:a.locationId,alive:a.alive,joinedDay:s.day,lastSeenDay:null};s.social.nodes.push(p);
    }
    if(p){matched.add(p.id);p.key=a.key;p.source=a.kind;p.sourceId=a.sourceId;p.lineageId=a.lineageId;p.role=a.role;p.alive=a.alive;p.locationId=a.locationId;}
  }
  for(const p of s.social.nodes)if(!actual(s,p))p.alive=false;
  // Co-present peers may already know each other. Their initial relation has no
  // fabricated meeting or memory attached; seeing it requires an actual scene.
  const live=s.social.nodes.filter(p=>p.alive);
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++) {
    const a=live[i],b=live[j];
    if(a.locationId!==b.locationId || s.social.edges.length>=MAX_EDGES)continue;
    const aa=Math.max(0,Math.floor((s.day-a.bornDay)/365)),ba=Math.max(0,Math.floor((s.day-b.bornDay)/365));
    const family=['parent','guardian','sibling'].includes(a.role)&&['parent','guardian','sibling'].includes(b.role);
    if(!family && (aa<18 || ba<18) && Math.abs(aa-ba)>8)continue;
    const id=[a.id,b.id].sort().join(':');if(s.social.edges.some(e=>e.id===id))continue;
    const affinity=family?60:25+seededRoll(s.seed,`social-tie:${id}`,51);
    s.social.edges.push({id,aId:a.id,bId:b.id,kind:family?'family':affinity<40?'rivalry':affinity>=60?'friendship':'acquaintance',observedKind:null,affinity,known:false,knownDay:null,startedDay:s.day,lastDay:s.day,agenda:['recognition','company','privacy','fairness','independence'][seededRoll(s.seed,`social-agenda:${id}`,5)],developments:0,lastScene:null,memories:[]});
  }
}
export function initializeSocial(s,{migration=false}={}) {
  if(s.social)return;
  s.social={version:1,ownerId:owner(s),startedDay:s.day,lastDay:s.day,lastCycle:0,sequence:0,nodes:[],edges:[],pending:null,queued:[],callbacks:[],history:[],uses:{},useAge:s.age,recentScenes:[]};
  sync(s);
}
export function inheritSocial(previous,next) {
  if(!previous.social){initializeSocial(next,{migration:true});return;}
  next.social=structuredClone(previous.social);
  const v=next.social;v.ownerId=owner(next);v.pending=null;v.queued=[];v.callbacks=[];v.uses={};v.useAge=next.age;v.lastDay=next.day;v.lastCycle=Math.floor((next.day-v.startedDay)/180);
  // The child inherits a world with relationships, not the parent's confidence.
  v.history=[];v.recentScenes=[];
  for(const e of v.edges){e.known=false;e.knownDay=null;e.observedKind=null;}
  sync(next);
}
function remember(s,p,text,amount=0) {
  const a=actual(s,p);if(!a || !a.alive)return;
  if(a.kind==='teacher' || a.kind==='child') {
    if(!s.conversations)return;
    const r=s.conversations.relationships[a.sourceId] ||= {bond:a.kind==='child'?65:35,memories:[],knownFacts:[]};
    r.bond=clamp(r.bond+amount);if(!r.memories.includes(text))r.memories.push(text);r.memories=r.memories.slice(-30);
  } else {
    const r=a.record;
    if(a.kind==='companion')r.relationship=Math.max(-100,Math.min(100,(r.relationship || 0)+amount));
    else r.bond=clamp((r.bond || 0)+amount);
    r.memories ||= [];if(!r.memories.includes(text))r.memories.push(text);r.memories=r.memories.slice(-30);
    if(a.kind==='life')for(const other of s.society?.people || [])if(other.sourcePersonId===a.sourceId)other.bond=r.bond;
  }
}
function record(s,ctx,title,text,ids,visible=true) {
  const v=s.social;v.sequence++;
  v.history.push({id:`social-record-${v.sequence}`,day:s.day,title,text,actorIds:ids,visible});v.history=v.history.slice(-160);
  if(visible)(ctx.journalLiteral || ctx.journal)?.(title,text,'relationships');
}
const age=(s,p)=>Math.max(0,Math.floor((s.day-p.bornDay)/365));
const bothAdults=(s,a,b)=>age(s,a)>=18&&age(s,b)>=18;
const peers=(s,a,b)=>Math.abs(age(s,a)-age(s,b))<=6 && age(s,a)<18 && age(s,b)<18;
const parent=p=>['parent','guardian'].includes(p.role);
const professional=p=>['colleague','customer','neighbor','teacher'].includes(p.role) || p.source==='society';

const SCENES={
  table:{test:(s,a,b)=>s.age>=5&&s.age<=12&&peers(s,a,b),title:'The place beside the window',body:(s,a,b)=>`${a.name} pulls a bench toward the window. ${b.name} puts a slate in the gap before anyone can sit down. Yesterday the two of them shared their lunch; today neither looks at the other. The rest of the table waits to see where you sit.`,options:[opt('a','Sit beside {a}','The window is open and the lesson is about to begin.'),opt('b','Make a place beside {b}','There is room at the other end.'),opt('ask','Ask what happened yesterday','Neither has told you the whole story.'),opt('elsewhere','Take an empty bench','You brought your own slate.')],effects:{a:[-7,6,-4],b:[-7,-4,6],ask:[9,2,2],elsewhere:[0,0,0]}},
  dare:{test:(s,a,b)=>s.age>=7&&s.age<=15&&peers(s,a,b),title:'Three knocks beneath the bridge',body:(s,a,b)=>`${a.name} says the thing beneath the bridge answers only after the third knock. ${b.name} has already tied a red thread around the rail. “We were going together,” ${b.name} says. Neither of them has asked the ferryman why the lower steps are chained.`,options:[opt('join','Go with them, as far as the chained steps','You can still hear the ferryman from there.'),opt('warn','Ask the ferryman about the chain','Your friends wait by the rail.'),opt('tease','Tell {a} to do the knocking','The red thread flutters against the water.'),opt('leave','Leave before the third knock','You know another way home.')],effects:{join:[6,4,4],warn:[-2,-1,3],tease:[-8,-5,2],leave:[0,-2,-2]}},
  notes:{test:(s,a,b)=>s.age>=9&&s.age<=17&&peers(s,a,b)&&s.education?.enrolled,title:'A second hand in the margins',body:(s,a,b)=>`${a.name} lends you a lesson book. The careful diagrams are in ${b.name}'s hand, but ${a.name} has written their own name on the cover. “We worked together,” ${a.name} says, closing the book before you reach the last page. ${b.name} is waiting outside the classroom.`,options:[opt('return','Return the book without copying it','The examination is still several days away.'),opt('copy','Copy the diagrams and say nothing','You have an unused page in your own notebook.'),opt('credit','Ask both of them whose work you may copy','The book stays on the table between you.'),opt('b','Bring the book to {b}','You leave your own notes unfinished.')],effects:{return:[0,1,0],copy:[-3,3,-2],credit:[8,1,5],b:[-9,-5,6]}},
  rehearsal:{test:(s,a,b)=>s.age>=8&&s.age<=17&&peers(s,a,b),title:'An empty place in the rehearsal',body:(s,a,b)=>`${a.name} has rehearsed the first verse all week. ${b.name} tells the others that ${a.name} will not be coming, then starts practicing the solo. Through the doorway you can see ${a.name} carrying a basket home. The lantern procession leaves at dusk.`,options:[opt('fetch','Find out whether {a} can come','The rehearsal will continue while you are gone.'),opt('stay','Stay and rehearse with {b}','Someone needs to learn the next verse.'),opt('share','Suggest splitting the solo','You have not yet asked either singer.'),opt('watch','Listen from the doorway','You are not in the procession tonight.')],effects:{fetch:[-2,6,-2],stay:[-5,-2,5],share:[7,2,2],watch:[0,0,0]}},
  secret:{test:(s,a,b)=>s.age>=10&&Math.abs(age(s,a)-age(s,b))<=10&&!parent(a)&&!parent(b),title:'Wax on the sealed letter',body:(s,a,b)=>`${a.name} leaves a sealed letter in your keeping until morning. Later ${b.name} notices the familiar handwriting. “Was that meant for me?” The seal has a crack, but you cannot tell whether it was made before the letter reached you.`,options:[opt('keep','Keep the letter sealed','You agreed to hold it until morning.'),opt('ask','Ask {a} whether you may explain','{b} will have to wait.'),opt('give','Hand it to {b}','You have not seen the address beneath the fold.'),opt('open','Look inside before answering','The cracked seal comes away easily.')],effects:{keep:[1,5,-2],ask:[5,3,1],give:[-10,-7,5],open:[-6,-6,-3]}},
  festival:{test:(s,a,b)=>s.age>=6&&!parent(a)&&!parent(b)&&Math.abs(age(s,a)-age(s,b))<=12,title:'Two ribbons for the same evening',body:(s,a,b)=>`${a.name} has saved you a place at the lantern stalls. ${b.name} arrives with a ribbon for the procession and says you promised to watch. You remember saying you would try. Both are waiting while the first bell rings.`,options:[opt('a','Go to the stalls with {a}','You can hear the procession from the square.'),opt('b','Watch the procession with {b}','The lantern stalls close after the last bell.'),opt('together','Ask whether both would like to come','One ribbon lies between the three of you.'),opt('alone','Say you need an evening to yourself','The streets are already filling.')],effects:{a:[-3,6,-4],b:[-3,-4,6],together:[8,2,2],alone:[0,-2,-2]}},
  invitation:{test:(s,a,b)=>s.age>=13&&!parent(a)&&!parent(b)&&Math.abs(age(s,a)-age(s,b))<=8,title:'The names on the invitation',body:(s,a,b)=>`${a.name} invites you to a small supper behind the old bell tower. ${b.name}'s name is missing from the folded list. “It is not a quarrel,” ${a.name} says. “I just want one evening without an argument.” ${b.name} has asked what you are doing tonight.`,options:[opt('accept','Accept the invitation as it stands','There is a chair with your name on it.'),opt('ask','Ask {a} to invite {b}','The host has already laid the table.'),opt('decline','Spend the evening with {b} instead','You will need to send a reply.'),opt('honest','Tell {b} where you are going','You do not speak for the host.')],effects:{accept:[-4,5,-3],ask:[6,-2,3],decline:[-5,-3,5],honest:[1,1,2]}},
  household:{test:(s,a,b)=>s.age>=4&&parent(a)&&parent(b),title:'A conversation after the lamps go out',body:(s,a,b)=>`You wake to ${a.name} and ${b.name} speaking in the next room. There is a traveling offer on the table and a cup gone cold beside it. “I never said forever,” ${a.name} says. ${b.name} lowers their voice when the floorboard creaks under your feet.`,options:[opt('a','Ask {a} about the traveling offer','You sit beside the cold cup.'),opt('b','Ask {b} whether they are worried','The folded offer stays on the table.'),opt('both','Ask whether you can listen to both','They make a little space by the lamp.'),opt('bed','Go back to bed','The door remains slightly open.')],effects:{a:[-2,4,-1],b:[-2,-1,4],both:[7,2,2],bed:[0,0,0]}},
  sibling:{test:(s,a,b)=>s.age>=4&&a.role==='sibling'&&age(s,b)<18&&!parent(b),title:'The game behind the locked gate',body:(s,a,b)=>`${a.name} has made a small fort from packing crates. ${b.name} tells the younger children it is full, although there is a whole bench inside. Your sibling taps twice on the gate and waits. You know the game they are playing; you also know who owns the crates.`,options:[opt('open','Unfasten the gate for {a}','The next round has not begun.'),opt('ask','Ask {b} why the fort is full','You stay outside the gate with your sibling.'),opt('new','Build a different game with {a}','There is a clear patch beside the well.'),opt('join','Take the place {b} offers you','You can see the gate from inside.')],effects:{open:[-2,5,-3],ask:[5,2,1],new:[1,6,0],join:[-7,-5,5]}},
  credit:{test:(s,a,b)=>s.age>=16&&bothAdults(s,a,b)&&(professional(a)||professional(b)),title:'One name on the hanging sign',body:(s,a,b)=>`${a.name} and ${b.name} have spent three evenings preparing a display for the market. When the cloth comes down, only ${a.name}'s mark is visible. ${b.name} wipes a thumb across the empty corner. “The paint was wet when I left,” they say.`,options:[opt('ask','Ask them to tell you how the sign was agreed','The market keeper is still arranging the stalls.'),opt('a','Help {a} finish setting up','The first customers are entering the square.'),opt('b','Stand beside {b} and leave the display','The empty corner catches the morning light.'),opt('amend','Offer to paint both names, if they agree','Neither has picked up the brush yet.')],effects:{ask:[8,2,2],a:[-5,5,-4],b:[-8,-5,6],amend:[10,1,4]}},
  boundary:{test:(s,a,b)=>s.age>=18&&bothAdults(s,a,b),title:'The stones at the garden edge',body:(s,a,b)=>`${a.name} has moved a row of boundary stones beside the shared path. ${b.name} puts them back every morning. Today they have both arrived with a bucket, and neither can reach the well without passing the other. A page from an old lease flaps beneath the nearest stone.`,options:[opt('read','Read the old lease with both of them','Some of the ink has washed away.'),opt('a','Carry water for {a}','The stones stay where they are.'),opt('b','Carry water for {b}','The stones stay where they are.'),opt('path','Ask them to mark a temporary shared path','The boundary can wait until someone finds the second page.'),opt('pass','Take another route','You need not fetch water here today.')],effects:{read:[6,2,2],a:[-5,5,-3],b:[-5,-3,5],path:[10,1,1],pass:[0,0,0]}},
  care:{test:(s,a,b)=>s.age>=18&&bothAdults(s,a,b),title:'The kettle nobody refilled',body:(s,a,b)=>`${a.name} has been carrying broth to a sick neighbor. ${b.name} was meant to bring the wood yesterday. There is ash in the hearth and no fresh kindling. When ${a.name} says nothing, ${b.name} begins explaining a shift that ran late.`,options:[opt('listen','Listen before deciding who let the other down','The broth can wait by the embers.'),opt('a','Stay with {a} this evening','You have not promised another evening yet.'),opt('b','Help {b} find a different time to bring wood','There may be another way to share the errands.'),opt('rota','Ask them to agree on days they can actually keep','One corner of the slate is still clean.')],effects:{listen:[5,2,2],a:[-3,5,-2],b:[3,-1,4],rota:[9,2,2]}},
  achievement:{test:(s,a,b)=>s.age>=14&&!parent(a)&&!parent(b)&&Math.abs(age(s,a)-age(s,b))<=10,title:'The certificate folded small',body:(s,a,b)=>`${a.name} receives a certificate before the assembled hall. ${b.name}, who practiced with them for weeks, slips outside before the applause ends. Later ${a.name} asks why ${b.name} will not come to the supper. The certificate is folded small enough to fit a coat pocket.`,options:[opt('celebrate','Go to the supper with {a}','The invitation has room for your name.'),opt('find','Find {b} outside','You can still hear the applause through the wall.'),opt('invite','Ask {b} what kind of invitation they would accept','You do not promise their answer for them.'),opt('quiet','Congratulate {a} privately and leave','You have no appetite for a crowded table tonight.')],effects:{celebrate:[-3,5,-2],find:[-3,-2,5],invite:[8,2,3],quiet:[1,3,0]}},
  departure:{test:(s,a,b)=>s.age>=18&&bothAdults(s,a,b),title:'A trunk beside the doorway',body:(s,a,b)=>`${a.name} has accepted work beyond the old road. ${b.name} says they had planned a venture together when the rains ended. The trunk is packed, but a second key still hangs on the wall. ${a.name} asks you to witness a letter before the cart arrives.`,options:[opt('witness','Witness the letter after reading it with both','The cart driver is watering the horse.'),opt('help','Help {a} carry the trunk','You keep the letter folded.'),opt('stay','Ask {a} to stay for another season','The work offer has an answer date.'),opt('letters','Offer to carry letters while they decide what remains','The spare key stays on its hook.')],effects:{witness:[4,3,1],help:[-4,5,-3],stay:[-6,-4,4],letters:[8,2,2]}},
  purse:{test:(s,a,b)=>s.age>=18&&bothAdults(s,a,b),title:'A short count at the shared table',body:(s,a,b)=>`${a.name} and ${b.name} keep a purse for their shared errands. At the end of the month the count is short. ${a.name} remembers paying a healer; ${b.name} remembers that payment coming from a different purse. Three receipts lie in the spilled salt.`,options:[opt('receipts','Sort the receipts with them','Some dates have smeared beneath the salt.'),opt('a','Take {a} at their word','You did not see the payment.'),opt('b','Take {b} at their word','You did not see the payment.'),opt('pause','Ask them to keep separate accounts for now','The shared errands still need doing.')],effects:{receipts:[8,2,2],a:[-9,6,-5],b:[-9,-5,6],pause:[2,1,1]}},
  truce:{test:(s,a,b,e)=>s.age>=8&&e.affinity<45&&Math.abs(age(s,a)-age(s,b))<=15,title:'The chair left in the aisle',body:(s,a,b)=>`${a.name} arrives carrying a chair that ${b.name} lent months ago. Neither remembers who first stopped visiting. The chair is set in the aisle between their doors. “It was never about the chair,” ${b.name} says, but does not take it inside.`,options:[opt('listen','Stay while each tells their version','Neither has to start first.'),opt('return','Help {a} return the chair and leave','You keep to the errand you were asked to do.'),opt('meal','Invite both to an ordinary meal','They may decline separately.'),opt('apart','Tell them they need not become friends again','The chair can still be returned.')],effects:{listen:[11,3,3],return:[0,3,0],meal:[9,2,2],apart:[2,1,1]}},
};
const ECHO_OPTIONS=[opt('hear','Let them finish the story'),opt('ask','Ask what they want to do next'),opt('leave','Say you cannot stay today')];
function substitute(text,a,b) {return text.replaceAll('{a}',a.name).replaceAll('{b}',b.name);}
function earlierAfternoon(s,a,b,scene) {
  const participants=[a,b];
  const p=participants.find(p=>actual(s,p)?.record?.memories?.some(m=>m.includes('school club')));
  if(p && ['table','invitation','sibling'].includes(scene))return ` You remember the folded membership paper from an earlier afternoon with ${p.name}.`;
  const prank=participants.find(p=>actual(s,p)?.record?.memories?.some(m=>m.includes('school prank')));
  if(prank && ['dare','secret'].includes(scene))return ` You remember ${prank.name}'s face when the tutor rang the bell after the prank.`;
  const affection=participants.find(p=>s.pastimes?.facts?.includes(`first-affection:${p.sourceId}:shared`));
  if(affection && ['festival','invitation','departure'].includes(scene))return ` The ordinary question leaves a pause between you and ${affection.name}; neither of you has forgotten the slower walk home.`;
  return '';
}
function offer(s,e,scene,kind='witness',extra={}) {
  const a=node(s,e.aId),b=node(s,e.bId),def=SCENES[scene];if(!a || !b || !def)return null;
  return {eventId:`social_${scene}`,scene,edgeId:e.id,aId:a.id,bId:b.id,day:s.day,locationId:s.locationId,kind,title:def.title,body:def.body(s,a,b)+earlierAfternoon(s,a,b,scene),choices:def.options.map(c=>({...c,label:substitute(c.label,a,b),description:substitute(c.description,a,b)})),...extra};
}
function enqueue(s,q) {
  if(!q || s.social.queued.length>=MAX_QUEUE || s.social.pending?.edgeId===q.edgeId || s.social.queued.some(other=>other.edgeId===q.edgeId))return false;
  s.social.queued.push(q);return true;
}
function visibleEdge(s,e) {const a=node(s,e.aId),b=node(s,e.bId);return a?.alive&&b?.alive&&a.locationId===s.locationId&&b.locationId===s.locationId;}
function appropriateScenes(s,e) {
  const a=node(s,e.aId),b=node(s,e.bId);if(!a || !b)return [];
  return Object.keys(SCENES).filter(id=>SCENES[id].test(s,a,b,e));
}
function selectScene(s,e,key,forced=null) {
  let ids=appropriateScenes(s,e);if(forced && ids.includes(forced))return forced;
  if(ids.length>1)ids=ids.filter(id=>id!==e.lastScene);
  const fresh=ids.filter(id=>!(s.social.recentScenes || []).includes(id));if(fresh.length)ids=fresh;
  const preferred={recognition:['achievement','rehearsal','credit'],company:['festival','invitation','table','truce'],privacy:['secret','household'],fairness:['notes','credit','purse','boundary'],independence:['departure','sibling','dare']}[e.agenda] || [];
  ids=[...ids,...ids.filter(id=>preferred.includes(id))];
  return ids.length?ids[seededRoll(s.seed,key,ids.length)]:null;
}
function markKnown(s,e) {e.known=true;e.knownDay=s.day;e.observedKind=e.kind;for(const id of [e.aId,e.bId]){const p=node(s,id);if(p)p.lastSeenDay=s.day;}}
function adjust(e,amount,s) {
  e.affinity=clamp(e.affinity+amount);e.lastDay=s.day;
  if(e.kind!=='family')e.kind=e.affinity<40?'rivalry':e.affinity>=60?'friendship':'acquaintance';
}
function echo(s,c) {
  const e=edge(s,c.edgeId),a=node(s,c.aId),b=node(s,c.bId);if(!e || !a || !b || !a.alive || !b.alive)return null;
  const friendly=e.affinity>=60;
  const bodies={
    table:`The lesson benches have been moved again. ${a.name} has left a spare slate beside ${friendly?b.name:'their own books'}. ${b.name} notices you at the door and ${friendly?'makes room without being asked':'takes a seat at the other end'}.`,
    dare:`The ferryman has taken down the red thread. ${a.name} says the chained steps lead to a broken landing, not a monster. ${b.name} ${friendly?'laughs and starts telling the story differently':'says that was not the part they were frightened of'}.`,
    notes:`A new lesson book lies open between ${a.name} and ${b.name}. ${friendly?'Both hands are visible in its margins.':'One has brought a separate notebook.'} ${b.name} asks whether you remember the first diagrams.`,
    secret:`${a.name} catches you by the bell tower. ${c.outcome==='open'?'“The seal was not like that when I gave it to you.” They hold the empty envelope between two fingers.':c.outcome==='give'?`“${b.name} received the letter.” They wait before saying anything more.`:`“I delivered it myself.” ${b.name} has stopped asking you about the handwriting.`}`,
    household:`The traveling offer is no longer on the table. ${a.name} has ${friendly?'written a reply beside '+b.name:'put it away in a drawer'}. At supper ${b.name} asks if you would like to hear what they decided.`,
    credit:`At the next market ${friendly?`two names hang over the display. ${a.name} asks ${b.name} where to set the finished pieces`:`${a.name} and ${b.name} have taken separate stalls`}. You recognize the cloth that covered the first sign.`,
    boundary:`There is a narrow passage between the garden stones now. ${friendly?`${a.name} holds the gate while ${b.name} carries water through`:`${a.name} and ${b.name} use it at different hours`}. The second page of the lease has still not been found.`,
    departure:`A letter arrives for ${b.name}, creased from the old road. ${friendly?`${b.name} reads part of ${a.name}'s account aloud`:`${b.name} puts ${a.name}'s letter beneath the spare key`}. The cart has long since gone.`,
    truce:`The chair is ${friendly?'back at the supper table':'no longer in the aisle'}. ${a.name} and ${b.name} ${friendly?'have begun visiting again, although neither calls it an apology':'greet each other briefly by the well'}. You recognize the mark on its lowest rung.`,
  };
  return {eventId:'social_echo',scene:'echo',edgeId:e.id,aId:a.id,bId:b.id,day:s.day,locationId:s.locationId,kind:'callback',title:'Something familiar, seen again',body:bodies[c.scene] || `${a.name} and ${b.name} cross the square ${friendly?'together':'at different ends of the evening'}. ${friendly?'One waits while the other finishes speaking.':'Neither mentions the last time you stood between them.'} You recognize a detail from ${SCENES[c.scene]?.title.toLowerCase() || 'an earlier evening'}.`,choices:ECHO_OPTIONS.map(o=>({...o}))};
}
export function onSocialTime(s,{oldDay,newDay},ctx={}) {
  const v=s.social;if(!v || newDay<=oldDay)return;
  v.lastDay=newDay;sync(s);
  // Unaccepted afternoons pass. A childhood invitation cannot wait untouched
  // until the recipient's thirtieth birthday; accepted pending scenes do wait.
  v.queued=v.queued.filter(q=>q.kind==='invitation' || newDay-q.day<=(q.kind==='callback'?365:180));
  if(v.useAge!==s.age){v.useAge=s.age;v.uses={};}
  if(s.age<3 || s.hero.alive===false || s.phase==='retired')return;
  const cycle=Math.floor((newDay-v.startedDay)/180);
  // Calendar jumps process at most two developments, rather than inventing a
  // backlog of dialogue at every day crossed by an annual plan.
  for(let c=Math.max(v.lastCycle+1,cycle-1);c<=cycle;c++) {
    let possible=v.edges.filter(e=>{
      const a=node(s,e.aId),b=node(s,e.bId);
      return a?.alive&&b?.alive&&a.locationId===b.locationId&&appropriateScenes(s,e).length;
    });
    const freshPairs=possible.filter(e=>appropriateScenes(s,e).some(id=>!(v.recentScenes || []).includes(id)));
    if(freshPairs.length)possible=freshPairs;
    if(!possible.length)continue;
    const e=possible[seededRoll(s.seed,`social-turn:${v.ownerId}:${c}`,possible.length)],a=node(s,e.aId),b=node(s,e.bId);
    // Select the situation before its independent change: a reconciliation may
    // itself carry the tie over the rivalry threshold that made it eligible.
    const scene=selectScene(s,e,`social-scene:${e.id}:${c}`);if(!scene)continue;
    const delta=seededRoll(s.seed,`social-turn-direction:${e.id}:${c}`,3)===0?-5:4;
    adjust(e,delta,s);e.developments++;e.lastScene=scene;
    // A player's secret is never inferred from this ambient social graph.
    if(visibleEdge(s,e)) {
      const q=offer(s,e,scene);if(!q)continue;markKnown(s,e);
      v.recentScenes=[...(v.recentScenes || []),scene].slice(-8);
      record(s,ctx,q.title,q.body,[a.id,b.id]);enqueue(s,q);
    }
    else record(s,{},'An unwitnessed evening',`${a.name} and ${b.name} spent an evening on a concern of their own.`,[a.id,b.id],false);
  }
  v.lastCycle=cycle;
  for(const c of [...v.callbacks])if(c.dueDay<=newDay) {
    const e=edge(s,c.edgeId);
    if(!e || !node(s,c.aId)?.alive || !node(s,c.bId)?.alive){v.callbacks=v.callbacks.filter(a=>a!==c);continue;}
    if(visibleEdge(s,e)) {
      const q=echo(s,c);
      if(enqueue(s,q)){markKnown(s,e);record(s,ctx,q.title,q.body,[c.aId,c.bId]);v.callbacks=v.callbacks.filter(a=>a!==c);}
    }
  }
}
export function socialActions(s) {
  if(!active(s))return [];
  const v=s.social,known=v.edges.filter(e=>e.known&&visibleEdge(s,e)),local=v.nodes.filter(p=>p.alive&&p.locationId===s.locationId&&actual(s,p));
  const rows=[];
  const add=(id,label,description,reason)=>rows.push({id,label,description,days:0,cost:0,durationDays:1,group:'Friends & social life',...(reason?{disabledReason:reason}:{})});
  for(const q of v.queued.filter(q=>q.locationId===s.locationId&&visibleEdge(s,edge(s,q.edgeId))).slice(0,3)) {
    const a=node(s,q.aId),b=node(s,q.bId);
    add(`social_join_${q.edgeId}`,q.kind==='callback'?`Hear the rest from ${a.name} and ${b.name}`:`Join ${a.name} and ${b.name}`,`${q.title}. 1 day.`);
  }
  if(local.length>=2&&v.edges.some(e=>visibleEdge(s,e)&&appropriateScenes(s,e).length))add('social_gather',s.age<12?'Spend an afternoon with your circle':'Make plans with your circle','An afternoon together. 1 day.',(v.uses.gather || 0)>=2?'You have already arranged two gatherings this year.':undefined);
  for(const e of known.filter(e=>e.affinity<55).slice(0,3)) {
    const a=node(s,e.aId),b=node(s,e.bId);add(`social_reconcile_${e.id}`,`Talk with ${a.name} and ${b.name}`,'Find a quiet time to hear them both. 1 day.',v.uses[e.id]?'You have already brought this pair together this year.':undefined);
  }
  const unknown=v.edges.filter(e=>!e.known&&visibleEdge(s,e)&&appropriateScenes(s,e).length).slice(0,2);
  for(const e of unknown) {
    const a=node(s,e.aId),b=node(s,e.bId);add(`social_introduce_${e.id}`,`Spend time with ${a.name} and ${b.name}`,'Join two people you know for an ordinary afternoon. 1 day.',v.uses[e.id]?'You have already made this invitation this year.':undefined);
  }
  return rows;
}
export function applySocialAction(s,id,ctx={}) {
  const row=socialActions(s).find(a=>a.id===id);if(!row || row.disabledReason)return false;
  let e,existing=null;
  if(id==='social_gather') {
    let available=s.social.edges.filter(e=>visibleEdge(s,e)&&appropriateScenes(s,e).length);
    if(!available.length)return false;
    const unused=available.filter(e=>!e.known);if(unused.length)available=unused;
    e=available[seededRoll(s.seed,`social-gather:${s.social.ownerId}:${s.age}:${s.social.uses.gather || 0}`,available.length)];
  } else if(id.startsWith('social_join_')) {
    existing=s.social.queued.find(q=>q.edgeId===id.slice('social_join_'.length));e=edge(s,existing?.edgeId);
  } else e=edge(s,id.slice(id.startsWith('social_reconcile_')?'social_reconcile_'.length:'social_introduce_'.length));
  if(!e || !visibleEdge(s,e))return false;
  existing ||= s.social.queued.find(q=>q.edgeId===e.id);
  const scene=existing?.scene || selectScene(s,e,`social-invitation:${e.id}:${s.age}:${s.social.sequence}`,id.startsWith('social_reconcile_')?'truce':null);
  if(!scene)return false;
  const q=existing || offer(s,e,scene,'invitation');
  const actualDays=Math.max(0,ctx.spendDays?.(1) || 0);
  if(actualDays<1)return true; // A birthday/urgent need can stop the afternoon.
  if(s.hero.alive===false || s.phase==='retired')return true;
  if(!visibleEdge(s,e)) {
    const a=node(s,e.aId),b=node(s,e.bId);
    record(s,ctx,'An afternoon that did not come together',`You had set aside an afternoon with ${a.name} and ${b.name}. By the time you arrived, one of them had already left.`,[a.id,b.id]);return true;
  }
  if(!existing)s.social.uses[id==='social_gather'?'gather':e.id]=(s.social.uses[id==='social_gather'?'gather':e.id] || 0)+1;
  if(scene!=='echo')s.social.recentScenes=[...(s.social.recentScenes || []),scene].slice(-8);
  q.day=s.day;q.kind='invitation';if(scene!=='echo')e.lastScene=scene;
  if(!existing)enqueue(s,q);
  flushSocialEvent(s,ctx);
  return true;
}
export function flushSocialEvent(s,ctx={}) {
  if(!active(s) || s.social.pending)return false;
  s.social.queued=s.social.queued.filter(q=>node(s,q.aId)?.alive&&node(s,q.bId)?.alive);
  const index=s.social.queued.findIndex(q=>q.kind==='invitation'&&q.locationId===s.locationId);
  if(index<0)return false;
  const [q]=s.social.queued.splice(index,1);
  if(!q)return false;
  // A queued local scene waits when travel moved the player away.
  s.social.pending=q;
  const e=edge(s,q.edgeId);if(e)markKnown(s,e);
  ctx.setEvent?.(q.eventId,q.title,q.scene==='echo'?'A familiar thread':'Among people you know',q.body,q.choices.map(c=>({...c})));
  // Names here are actual saved actors. A legacy context may still replace the
  // old companion placeholders "Kest"/"Mira"/"Orrin" inside an unrelated peer's
  // name; keep this fully authored snapshot exact rather than changing who spoke.
  if(s.event?.id===q.eventId){s.event.title=q.title;s.event.body=q.body;s.event.choices=q.choices.map(c=>({...c}));}
  return true;
}
export function applySocialChoice(s,eventId,id,ctx={}) {
  const q=s.social?.pending;if(!q || q.eventId!==eventId || !q.choices.some(c=>c.id===id))return false;
  const e=edge(s,q.edgeId),a=node(s,q.aId),b=node(s,q.bId);if(!e || !a || !b)return false;
  const choice=q.choices.find(c=>c.id===id);
  if(q.scene==='echo') {
    if(id==='ask'){remember(s,a,`You asked what I wanted after ${b.name} and I faced an old concern.`,2);remember(s,b,`You listened without speaking for ${a.name} or me.`,2);}
    record(s,ctx,q.title,`${q.body} ${id==='leave'?'You said you could not stay.':id==='ask'?'You asked what they wanted to do next.':'You stayed until the story was finished.'}`,[a.id,b.id]);
  } else {
    const [tie,abond,bbond]=SCENES[q.scene].effects[id];adjust(e,tie,s);markKnown(s,e);
    remember(s,a,`${s.hero.name}: ${choice.label}. ${b.name} was there.`,abond);
    remember(s,b,`${s.hero.name}: ${choice.label}. ${a.name} was there.`,bbond);
    e.memories.push({day:s.day,scene:q.scene,choice:id});e.memories=e.memories.slice(-30);
    record(s,ctx,q.title,`${choice.label}. ${a.name} ${abond<0?'looked away before answering':abond>3?'stayed beside you a little longer':'heard you out'}. ${b.name} ${bbond<0?'had something else to attend to':bbond>3?'made room for you':'put the matter down for now'}.`,[a.id,b.id]);
    if(s.social.callbacks.length<12)s.social.callbacks.push({edgeId:e.id,aId:a.id,bId:b.id,scene:q.scene,outcome:id,dueDay:s.day+24+seededRoll(s.seed,`social-echo:${e.id}:${s.day}:${id}`,55)});
    if(s.life){s.life.happiness=clamp(s.life.happiness+(tie>5?2:tie< -5?-1:0));s.life.stress=clamp(s.life.stress+(tie< -5?2:tie>5?-1:0));}
    if(q.scene==='notes'&&id==='copy'&&s.education)s.education.performance=clamp(s.education.performance+2);
  }
  s.social.pending=null;s.notice=choice.label;return true;
}
export function socialEventIds() {
  return Object.fromEntries([...Object.entries(SCENES).map(([id,s])=>[`social_${id}`,s.options.map(o=>o.id)]),['social_echo',ECHO_OPTIONS.map(o=>o.id)]]);
}
export function socialView(s) {
  const v=s.social;if(!v)return {enabled:false,summary:'',ties:[],notices:[],circles:[],actions:[]};
  const ties=v.edges.filter(e=>e.known).map(e=>{
    const a=node(s,e.aId),b=node(s,e.bId),kind=e.observedKind;return {id:e.id,personId:a.sourceId,otherPersonId:b.sourceId,name:a.name,otherName:b.name,kind,label:kind==='family'?'Shared household':kind==='friendship'?'Spend time together':kind==='rivalry'?'An uneasy history':'A growing acquaintance',description:e.memories.length?`You were there for ${SCENES[e.memories.at(-1).scene]?.title.toLowerCase() || 'an earlier conversation'}.`:'You have seen them together.',knownDay:e.knownDay};
  });
  const knownIds=new Set(v.edges.filter(e=>e.known).flatMap(e=>[e.aId,e.bId]));
  const people=v.nodes.filter(p=>knownIds.has(p.id)&&p.alive).map(p=>({id:p.sourceId,name:p.name}));
  return {enabled:true,summary:'Some evenings belong to the people around you.',ties,notices:v.history.filter(h=>h.visible).slice(-12).map(h=>({...h,actorIds:h.actorIds.map(id=>node(s,id)?.sourceId).filter(Boolean)})),circles:people.length?[{id:'familiar-circle',title:s.age<18?'Your familiar faces':'People whose paths cross',people}]:[],actions:socialActions(s)};
}
export function validateSocial(v,s) {
  const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
  const int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const txt=(t,max=2200)=>typeof t==='string'&&t.length>0&&t.length<=max;
  const when=n=>int(n)&&(!s||n<=s.day);
  const loc=id=>txt(id,80)&&(!s||s.world.locations.some(p=>p.id===id));
  const unique=a=>new Set(a.map(p=>p.id)).size===a.length;
  if(!plain(v)||v.version!==1||!/^birth--?\d+$/.test(v.ownerId)||!when(v.startedDay)||!when(v.lastDay)||v.lastDay<v.startedDay||!int(v.lastCycle)||!int(v.sequence)||!int(v.useAge,5000)||!plain(v.uses)||Object.keys(v.uses).length>MAX_EDGES+1||!Object.values(v.uses).every(n=>int(n,3))||v.recentScenes!==undefined&&(!Array.isArray(v.recentScenes)||v.recentScenes.length>8||!v.recentScenes.every(id=>Object.hasOwn(SCENES,id))))return false;
  if(!Array.isArray(v.nodes)||v.nodes.length>MAX_NODES||!unique(v.nodes)||!Array.isArray(v.edges)||v.edges.length>MAX_EDGES||!unique(v.edges)||!Array.isArray(v.queued)||v.queued.length>MAX_QUEUE||!Array.isArray(v.callbacks)||v.callbacks.length>12||!Array.isArray(v.history)||v.history.length>160)return false;
  for(const p of v.nodes)if(!plain(p)||!/^social-person-\d+(?:-\d+)?$/.test(p.id)||!txt(p.key,320)||!['life','companion','society','teacher','child'].includes(p.source)||!txt(p.sourceId,80)||!(p.lineageId===undefined||p.lineageId===null||txt(p.lineageId,180))||!txt(p.name,100)||!Number.isSafeInteger(p.bornDay)||p.bornDay< -150000||!txt(p.role,100)||!loc(p.locationId)||typeof p.alive!=='boolean'||!when(p.joinedDay)||!(p.lastSeenDay===null||when(p.lastSeenDay)))return false;
  const nodeExists=id=>v.nodes.some(p=>p.id===id),edgeExists=id=>v.edges.some(e=>e.id===id);
  for(const e of v.edges)if(!plain(e)||!txt(e.id,180)||!nodeExists(e.aId)||!nodeExists(e.bId)||e.aId===e.bId||!['family','friendship','rivalry','acquaintance'].includes(e.kind)||!(e.observedKind===null||['family','friendship','rivalry','acquaintance'].includes(e.observedKind))||!int(e.affinity,100)||typeof e.known!=='boolean'||!(e.knownDay===null||when(e.knownDay))||e.known!==(e.knownDay!==null)||e.known!==(e.observedKind!==null)||!when(e.startedDay)||!when(e.lastDay)||!['recognition','company','privacy','fairness','independence'].includes(e.agenda)||!int(e.developments)||!(e.lastScene===null||Object.hasOwn(SCENES,e.lastScene))||!Array.isArray(e.memories)||e.memories.length>30||!e.memories.every(m=>plain(m)&&when(m.day)&&SCENES[m.scene]?.options.some(o=>o.id===m.choice)))return false;
  const eventIds=socialEventIds();
  const queued=q=>plain(q)&&Object.hasOwn(eventIds,q.eventId)&&q.eventId===`social_${q.scene}`&&edgeExists(q.edgeId)&&nodeExists(q.aId)&&nodeExists(q.bId)&&when(q.day)&&loc(q.locationId)&&['witness','invitation','callback'].includes(q.kind)&&txt(q.title,180)&&txt(q.body,2200)&&Array.isArray(q.choices)&&q.choices.length>=2&&q.choices.length<=5&&new Set(q.choices.map(c=>c.id)).size===q.choices.length&&q.choices.every(c=>plain(c)&&eventIds[q.eventId].includes(c.id)&&txt(c.label,220)&&typeof c.description==='string'&&c.description.length<=500);
  if(v.pending!==null&&!queued(v.pending)||!v.queued.every(queued))return false;
  if(!v.callbacks.every(c=>plain(c)&&edgeExists(c.edgeId)&&nodeExists(c.aId)&&nodeExists(c.bId)&&Object.hasOwn(SCENES,c.scene)&&SCENES[c.scene].options.some(o=>o.id===c.outcome)&&int(c.dueDay)))return false;
  if(!v.history.every(h=>plain(h)&&txt(h.id,100)&&when(h.day)&&txt(h.title,180)&&txt(h.text,4000)&&typeof h.visible==='boolean'&&Array.isArray(h.actorIds)&&h.actorIds.length===2&&h.actorIds.every(nodeExists)))return false;
  if(s&&((v.pending!==null)!==Object.hasOwn(eventIds,s.event?.id)))return false;
  if(s&&v.pending&&JSON.stringify(v.pending.choices)!==JSON.stringify(s.event.choices))return false;
  return true;
}
