import { seededRoll } from './world.js';
import { passageDirection } from './dungeon-directions.js';

const edges=[[[0,1],[0,2],[1,3],[2,3],[3,4],[4,5]],[[0,1],[1,2],[2,4],[4,5],[0,3],[3,4]],[[0,1],[0,2],[1,3],[2,4],[3,4],[3,5],[4,5]]];
const points=[[0,1],[1,0],[1,2],[2,0],[2,2],[3,1]];
const themes={ossuary:['undead','spirit'],roots:['beast','construct','aberration'],tower:['bandit','construct','spirit'],abyss:['aberration','undead','construct']};
const goals=[
  {id:'recover',title:'Recover the object named in the lead',kind:'treasure',description:'Recover the actual object from the marked deep chamber and bring it back.',gold:24,exp:16},
  {id:'survey',title:'Bring back a usable route account',kind:'landmark',description:'Study two separate landmarks, including the deep route tablet, then bring the dated account outside.',gold:20,exp:20},
  {id:'repair',title:'Restore a neglected water gate',kind:'trap',description:'Reach the deep gate and repair it with 1 ore and 1 cloth. Bring back the work account.',gold:18,exp:22},
];
const key=(floor,room)=>`${floor}:${room}`;
const uniquePush=(list,value)=>{if(!list.includes(value))list.push(value);};
export const isRadiant=run=>run?.layoutVersion===1;
export function createRadiantChart(seed,id,theme) {
  const goal={...goals[seededRoll(seed,`${id}:purpose`,goals.length)],floor:2+seededRoll(seed,`${id}:purpose-floor`,3),room:4};
  const floors=Array.from({length:6},(_,index)=>{
    const floor=index+1,variant=seededRoll(seed,`${id}:${floor}:layout`,3),salt=`${id}:${floor}`;
    const kinds=['safe','battle',seededRoll(seed,salt+':side',2)?'treasure':'trap','landmark',floor===goal.floor?goal.kind:seededRoll(seed,salt+':lower',2)?'battle':'trap','stairs'];
    // Side locations exchange their positions; topology and room function both vary.
    if(seededRoll(seed,salt+':swap',2))[kinds[1],kinds[2]]=[kinds[2],kinds[1]];
    const titles={safe:'The landing above the fork',battle:'The occupied chamber',treasure:'The sealed side coffer',trap:'The broken service crossing',landmark:'The worn route marker',stairs:'The lower stair'};
    return {floor,variant,rooms:kinds.map((kind,i)=>({id:i,x:points[i][0],y:points[i][1],kind,title:i===4&&floor===goal.floor?{recover:'The chamber named in the lead',survey:'The deep route tablet',repair:'The dry water gate'}[goal.id]:titles[kind],neighbors:edges[variant].filter(e=>e.includes(i)).map(e=>e.find(n=>n!==i)),type:themes[theme][seededRoll(seed,`${salt}:${i}:type`,themes[theme].length)]}))};
  });
  return {version:1,goal,floors};
}
export function initializeRadiant(s,run) {
  run.layoutVersion=1;run.chart=createRadiantChart(s.seed,run.id,run.theme);
  if(run.localStory&&run.chart.goal.id==='survey'){run.localStory.rumor='A keeper needs two independent route observations from below the stair before anyone relies on the old map.';run.localStory.clue='The worn marker records a usable crossing. A second physical landmark can confirm which old route the account describes.';}
  if(run.localStory&&run.chart.goal.id==='repair'){run.localStory.rumor='A neglected water gate below the stair has left a service route unsafe. A dated repair account would answer the keeper’s concern.';run.localStory.clue='The marker names the dry water gate and its missing supports. Only material repairs will restore its duty.';}
  run.routeState={visited:['1:0'],landmarks:[],repairs:[],parleys:[],camps:[],caches:[],provisionedFloors:[1],provisionsUsed:1,objectiveProof:null};
  run.cleared=['1:0'];
}
export const radiantRoom=run=>run.chart.floors[run.floor-1].rooms[run.room];
export function radiantPassage(s,run,room) { return room.visited?room.title:passageDirection(s.seed,`${run.id}:${run.floor}`,radiantRoom(run),room); }
const party=s=>[s.hero,...s.companions.filter(p=>p.recruited&&p.active&&p.alive!==false)].filter(p=>p.hp>0);
function checks(s,run,r) {
  const sneak=s.hero.skills.stealth+Math.floor(s.hero.attributes.agility/2),disarm=s.hero.skills.survival+Math.floor(s.hero.attributes.agility/2);
  const skill=['beast','aberration'].includes(r.type)?'survival':['construct','spirit','undead'].includes(r.type)?'scholarship':'persuasion';
  const attribute=skill==='survival'?'willpower':skill==='scholarship'?'intellect':'presence';
  const utility=s.hero.skills[skill]+Math.floor(s.hero.attributes[attribute]/2);
  const work=run.routeState.landmarks.concat(run.routeState.repairs).some(k=>k.startsWith(run.floor+':'));
  return {sneak,disarm,skill,attribute,utility,work,sneakNeed:7+run.floor,disarmNeed:8+run.floor,utilityNeed:8+run.floor};
}
export function radiantChoices(s,run) {
  const r=radiantRoom(run),k=key(run.floor,run.room),resolved=run.cleared.includes(k),c=checks(s,run,r),food=s.adventuring.rations;
  const choice=(id,label,description,reason)=>({id,label,description,...(reason?{disabledReason:reason}:{})});
  const rows=[];
  if(!resolved){
    if(r.kind==='battle')rows.push(choice('fight','Face the formation','One actual day, then party combat. Victory resolves this room. Retreat returns outside with earned belongings.'),choice('sneak','Slip through the unguarded line',`One actual day. Stealth ${s.hero.skills.stealth} + half agility ${Math.floor(s.hero.attributes.agility/2)} = ${c.sneak}; needs ${c.sneakNeed}. Earn passage without combat spoils.`,c.sneak<c.sneakNeed?`Needs ${c.sneakNeed-c.sneak} more combined stealth/agility. Train outside or explore another branch.`:null),choice('parley',c.skill==='survival'?'Lead the den away':c.skill==='scholarship'?'Work from the recorded ward':'Negotiate passage',`One actual day and 1 ration for patient field work. ${c.skill} ${s.hero.skills[c.skill]} + half ${c.attribute} ${Math.floor(s.hero.attributes[c.attribute]/2)} = ${c.utility}; needs ${c.utilityNeed}. Also requires a studied landmark or repaired crossing on this floor.`,!c.work?'Study this floor’s landmark or repair its crossing first.':c.utility<c.utilityNeed?`Needs ${c.utilityNeed-c.utility} more combined ${c.skill}/${c.attribute}.`:food<1?'Requires 1 expedition ration. You can withdraw and keep existing gains.':null));
    if(r.kind==='trap')rows.push(choice('disarm','Survey and disable the crossing',`One actual day. Survival ${s.hero.skills.survival} + half agility ${Math.floor(s.hero.attributes.agility/2)} = ${c.disarm}; needs ${c.disarmNeed}.`,c.disarm<c.disarmNeed?`Needs ${c.disarmNeed-c.disarm} more combined survival/agility. Repairing with materials is another route.`:null),choice('repair','Repair the crossing with materials','One actual day, 1 ore and 1 cloth. The repaired route also supports peaceful passage on this floor.',s.equipment.materials.ore<1||s.equipment.materials.cloth<1?`Requires ore 1 (have ${s.equipment.materials.ore}) and cloth 1 (have ${s.equipment.materials.cloth}). Side coffers may supply materials.`:null),choice('rush','Cross despite the broken mechanism',`One actual day and up to ${5+run.floor*2} health lost; this crossing leaves at least 1 HP. Repair is required to complete a water-gate objective.`));
    if(r.kind==='treasure')rows.push(choice('open','Recover the finite coffer','One actual day. Recover one relic, materials and possible equipment once.',s.adventuring.loot.length>=160?'The relic pack is full. Leave it or return with what you carry.':null),choice('leave','Leave the coffer closed','Walk onward without claiming supplies or objective proof.'));
    if(r.kind==='landmark')rows.push(choice('study','Study and preserve the landmark','One actual day. Record this specific route marker once; its evidence supports peaceful work on this floor.'));
  }
  const goal=run.chart.goal,isGoal=run.floor===goal.floor&&run.room===goal.room;
  if(isGoal&&resolved&&!run.routeState.objectiveProof){
    const reason=goal.id==='recover'&&!run.routeState.caches.includes(k)?'Recover this chamber’s coffer to obtain the named object.':goal.id==='survey'&&(!run.routeState.landmarks.includes(k)||run.routeState.landmarks.length<2)?'Study this tablet and one other landmark. Nearby side paths preserve separate observations.':goal.id==='repair'&&!run.routeState.repairs.includes(k)?'Repair this water gate with ore and cloth; rushing does not restore it.':null;
    rows.push(choice('record','Keep the completed expedition proof',`Record the completed ${goal.title.toLowerCase()}. Returning outside pays ${goal.gold} gold and ${goal.exp} field experience once.`,reason));
    if(goal.id==='repair'&&!run.routeState.repairs.includes(k))rows.push(choice('repair','Return and repair the water gate','One actual day, 1 ore and 1 cloth; this finishes the repair objective.',s.equipment.materials.ore<1||s.equipment.materials.cloth<1?'Requires 1 ore and 1 cloth.':null));
    if(goal.id==='recover'&&!run.routeState.caches.includes(k))rows.push(choice('open','Return to the unopened coffer','One actual day. Recover the object and this finite cache.',s.adventuring.loot.length>=160?'The relic pack is full.':null));
  }
  if(!resolved)for(const index of r.neighbors.filter(index=>run.routeState.visited.includes(key(run.floor,index)))){const next=run.chart.floors[run.floor-1].rooms[index];rows.push(choice('route_'+index,`Back to ${next.title.toLowerCase()}`,'Back away through an already visited doorway. This room stays unresolved; no day or ration is charged.'));}
  if(resolved){
    if(r.kind==='stairs'&&run.floor<6)rows.push(choice('descend',`Descend to floor ${run.floor+1}`,`One actual day${run.routeState.provisionedFloors.includes(run.floor+1)?'; this depth was already provisioned.':', 1 ration for the new depth. Stronger foes and trap injuries below.'} Withdrawal is available without provisions.`,!run.routeState.provisionedFloors.includes(run.floor+1)&&food<1?'Requires 1 ration to provision a new lower floor. Return now to keep earned loot.':null));
    if(r.kind==='safe'&&run.floor>1)rows.push(choice('ascend',`Return to floor ${run.floor-1}`,'One actual day. Previously provisioned depths cost no second ration; their rooms and gains remain recorded.'));
    for(const index of r.neighbors){const next=run.chart.floors[run.floor-1].rooms[index],seen=run.routeState.visited.includes(key(run.floor,index));rows.push(choice('route_'+index,seen?next.title:passageDirection(s.seed,`${run.id}:${run.floor}`,r,next),'Move through this connected doorway. No day or provision is charged for crossing a resolved passage.'));}
    if(!run.routeState.camps.includes(k)&&party(s).some(p=>p.hp<p.maxHp||p.mp<p.maxMp))rows.push(choice('camp','Make a provisioned camp','One actual day and 1 ration. Restore up to 8 HP and 5 MP to each living traveler; once at this resolved room.',food<1?'Requires 1 expedition ration. Withdrawal remains available.':null));
  }
  rows.push(choice('withdraw','Return outside with your findings',`No extra day or ration. Keep earned belongings${run.routeState.objectiveProof?`; claim ${goal.gold} gold and ${goal.exp} field experience for the completed objective`:'; no unfinished objective reward'}.`));
  return rows;
}
export function showRadiantRoom(s,ctx) {
  const run=s.adventuring.expedition,r=radiantRoom(run);run.pendingKind=r.kind;
  const born=s.timeline?.birthDay||0,birthdayId=born?`birthday-${born}-${s.age}`:`birthday-${s.age}`;
  if(ctx.pendingNeed?.()||s.timeline?.mode==='birth'&&s.age>0&&(s.day-born)%365===0&&!s.timeline.yearHistory.some(y=>y.id===birthdayId))return;
  const bodies={safe:'Two worn ways leave the landing. Your chart records only doorways you can currently see.',battle:'An occupied chamber blocks passage. Read the available approaches before choosing a fight.',treasure:'A sealed coffer remains where its owners left it. Its contents can be taken only once.',trap:'A broken mechanism cuts across the route. Knowledge, material repair or a painful crossing offer different costs.',landmark:'A physical route marker preserves an account that can be checked against other chambers.',stairs:'A lower stair leads away from the explored floor. Deeper work needs provisions; returning with your findings remains a full choice.'};
  const g=run.chart.goal;
  ctx.setEvent('adventure_room',r.title,'A descent with a purpose',`Floor ${run.floor}. ${bodies[r.kind]}\n\nPurpose: ${g.title}, floor ${g.floor}. ${g.description} Completed proof pays ${g.gold} gold and ${g.exp} field experience on return.\n\nProvisions: ${s.adventuring.rations} carried; 1 ration per new lower floor, camp or peaceful field agreement. You can return outside from any chamber without another fee.`,radiantChoices(s,run));
}
export function applyRadiantChoice(s,id,ctx,{awardLoot,endRun}) {
  const run=s.adventuring.expedition,offered=radiantChoices(s,run).find(c=>c.id===id);
  if(!offered||offered.disabledReason)return false;
  if(id==='withdraw'){endRun(s,ctx);return true;}
  const r=radiantRoom(run),k=key(run.floor,run.room),log=(title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'adventure');};
  if(id.startsWith('route_')){run.room=Number(id.slice(6));uniquePush(run.routeState.visited,key(run.floor,run.room));const here=radiantRoom(run);if(['safe','stairs'].includes(here.kind))uniquePush(run.cleared,key(run.floor,run.room));showRadiantRoom(s,ctx);return true;}
  if(id==='record'){
    run.routeState.objectiveProof={day:s.day,roomKey:k,method:run.chart.goal.id};
    log('A purpose actually completed',`${run.chart.goal.title}: the completed work is recorded. Return outside for its stated field payment; deeper exploration is optional.`);showRadiantRoom(s,ctx);return true;
  }
  // Costs are reserved only after one real day was attended. Calendar pauses
  // return to the captured room with all unspent food/materials intact.
  const before=s.day,taken=ctx.spendDays(1);
  if(taken!==1||s.day-before!==1||s.phase==='retired'){s.notice='The room waits for one actual day. No ration, material or reward was consumed.';return true;}
  if(id==='fight'){run.pendingBattle=true;ctx.startBattle('free_'+r.type,{kind:'adventure',mode:'descent',token:run.id,room:k,locationId:s.locationId});return true;}
  if(id==='descend'||id==='ascend'){
    run.floor+=id==='descend'?1:-1;run.room=id==='descend'?0:5;
    if(!run.routeState.provisionedFloors.includes(run.floor)){s.adventuring.rations--;run.routeState.provisionsUsed++;uniquePush(run.routeState.provisionedFloors,run.floor);}
    uniquePush(run.routeState.visited,key(run.floor,run.room));uniquePush(run.cleared,key(run.floor,run.room));showRadiantRoom(s,ctx);return true;
  }
  if(id==='camp'){
    s.adventuring.rations--;run.routeState.provisionsUsed++;uniquePush(run.routeState.camps,k);
    for(const p of party(s)){p.hp=Math.min(p.maxHp,p.hp+8);p.mp=Math.min(p.maxMp,p.mp+5);}
    log('A camp paid from real provisions','One ration and one actual day restored up to 8 health and 5 magic to each living traveler. This camp cannot pay again.');showRadiantRoom(s,ctx);return true;
  }
  if(id==='parley'){s.adventuring.rations--;run.routeState.provisionsUsed++;uniquePush(run.routeState.parleys,k);log('Passage earned through field work','A recorded route, trained judgment, one day and one ration secured passage. No combat spoils were claimed.');}
  if(id==='sneak')log('A route taken in silence','Your trained stealth and agility secured passage. No combat spoils were claimed.');
  if(id==='study'){uniquePush(run.routeState.landmarks,k);if(run.localStory&&!run.localStory.clueFound){run.localStory.clueFound=true;log('A physical account under the stair',run.localStory.clue);}else log('An independent landmark recorded',`A dated observation at floor ${run.floor}, ${r.title}, joins your route account.`);}
  if(id==='repair'){s.equipment.materials.ore--;s.equipment.materials.cloth--;uniquePush(run.routeState.repairs,k);log('A crossing repaired in practice','One ore, one cloth and one real day repaired this route. The work supports passage on this floor.');}
  if(id==='disarm')log('A safe passage surveyed','Your trained survival and agility resolved this crossing without injury.');
  if(id==='rush'){const n=Math.min(Math.max(0,s.hero.hp-1),5+run.floor*2);s.hero.hp-=n;log('The broken mechanism takes its toll',`Crossing cost ${n} health. This is passage, not a completed repair.`);}
  if(id==='open'){
    awardLoot(s,`radiant:${run.id}:${k}`,run.floor,ctx);uniquePush(run.routeState.caches,k);
    if(run.chart.goal.id==='recover'&&run.floor===run.chart.goal.floor&&run.room===4&&run.localStory){run.localStory.clueFound=true;run.localStory.relicClaimed=true;const loot=s.adventuring.loot.at(-1);if(loot)loot.name=run.localStory.relic;}
  }
  uniquePush(run.cleared,k);showRadiantRoom(s,ctx);return true;
}
export function resolveRadiantBattle(s,ctx) { const run=s.adventuring.expedition;run.pendingBattle=false;uniquePush(run.cleared,key(run.floor,run.room));showRadiantRoom(s,ctx); }
export function radiantReceipt(s,run,ctx) {
  const g=run.chart.goal,completed=Boolean(run.routeState.objectiveProof);
  if(completed){s.hero.gold+=g.gold;ctx.earnExperience?.(g.exp);}
  return {layoutVersion:1,objectiveId:g.id,objectiveTitle:g.title,objectiveCompleted:completed,objectiveGold:completed?g.gold:0,objectiveExp:completed?g.exp:0,provisionsUsed:run.routeState.provisionsUsed};
}
export function radiantView(s) {
  const run=s.adventuring?.expedition;if(!isRadiant(run))return null;
  const current=radiantRoom(run),floor=run.chart.floors[run.floor-1];
  return {goal:{...run.chart.goal},completed:Boolean(run.routeState.objectiveProof),provisions:s.adventuring.rations,provisionsUsed:run.routeState.provisionsUsed,current:run.room,floor:run.floor,rooms:floor.rooms.filter(r=>run.routeState.visited.includes(key(run.floor,r.id))||current.neighbors.includes(r.id)).map(r=>({...r,visited:run.routeState.visited.includes(key(run.floor,r.id)),resolved:run.cleared.includes(key(run.floor,r.id)),label:run.routeState.visited.includes(key(run.floor,r.id))?r.title:passageDirection(s.seed,`${run.id}:${run.floor}`,current,r)}))};
}
export function validateRadiant(s,run) {
  if(!isRadiant(run))return run.layoutVersion===undefined&&run.chart===undefined&&run.routeState===undefined;
  if(!themes[run.theme]||JSON.stringify(run.chart)!==JSON.stringify(createRadiantChart(s.seed,run.id,run.theme)))return false;
  const v=run.routeState,validKey=k=>typeof k==='string'&&/^[1-6]:[0-5]$/.test(k),rows=(a,max=36)=>Array.isArray(a)&&a.length<=max&&new Set(a).size===a.length&&a.every(validKey),kindAt=k=>run.chart.floors[Number(k[0])-1].rooms[Number(k[2])].kind;
  if(!v||!['visited','landmarks','repairs','parleys','camps','caches'].every(k=>rows(v[k]))||!v.visited.includes(key(run.floor,run.room))||!rows(run.cleared)||!run.cleared.every(k=>v.visited.includes(k)))return false;
  if(!v.landmarks.every(k=>kindAt(k)==='landmark'&&run.cleared.includes(k))||!v.repairs.every(k=>kindAt(k)==='trap'&&run.cleared.includes(k))||!v.parleys.every(k=>kindAt(k)==='battle'&&run.cleared.includes(k))||!v.caches.every(k=>kindAt(k)==='treasure'&&run.cleared.includes(k))||!v.camps.every(k=>run.cleared.includes(k)))return false;
  const depth=Math.max(...v.visited.map(k=>Number(k[0])));
  if(JSON.stringify(v.provisionedFloors)!==JSON.stringify(Array.from({length:depth},(_,i)=>i+1))||v.provisionsUsed!==v.provisionedFloors.length+v.camps.length+v.parleys.length)return false;
  if(v.objectiveProof!==null){const p=v.objectiveProof,g=run.chart.goal,k=key(g.floor,4);if(!p||p.roomKey!==k||p.method!==g.id||!Number.isSafeInteger(p.day)||p.day<run.startDay||p.day>s.day||!run.cleared.includes(k))return false;if(g.id==='survey'&&(!v.landmarks.includes(k)||v.landmarks.length<2)||g.id==='recover'&&!v.caches.includes(k)||g.id==='repair'&&!v.repairs.includes(k))return false;}
  if(run.pendingBattle&&(radiantRoom(run).kind!=='battle'||run.cleared.includes(key(run.floor,run.room))))return false;
  return run.pendingKind===null||run.pendingKind===radiantRoom(run).kind;
}
export function validateRadiantHistory(row) {
  if(row.layoutVersion===undefined)return true;
  const g=goals.find(g=>g.id===row.objectiveId);
  return row.layoutVersion===1&&g&&row.objectiveTitle===g.title&&typeof row.objectiveCompleted==='boolean'&&row.objectiveGold===(row.objectiveCompleted?g.gold:0)&&row.objectiveExp===(row.objectiveCompleted?g.exp:0)&&Number.isInteger(row.provisionsUsed)&&row.provisionsUsed>=1&&row.provisionsUsed<=78;
}
