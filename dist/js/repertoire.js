import { localWorkLocked } from './local-project-ownership.js';
// Original, unpaid civilian art. This leaf owns no career, quest or travel rules.
// Callers supply current settlementServices rows; views never create save data.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const REPERTOIRE_WORKS = freeze([
  {id:'open-chair',title:'The Open Chair',lines:['The chair beside the hearth is bare.','I leave it room; I do not stare.','A stranger need not trade their name'],endings:{welcome:'For one dry seat beside the flame.',quiet:'I leave the cup; they keep their name.'}},
  {id:'two-banks',title:'Two Banks',lines:['A river takes the loosened stone.','No bank is held by work alone.','The rope runs out, the far reeds sway;'],endings:{shared:'We lend each other part of the way.',patient:'I watch the water choose its way.'}},
  {id:'last-stitch',title:'The Last Stitch',lines:['The shutters meet; the lanterns thin.','A needle draws the daylight in.','The loudest bell has gone to bed;'],endings:{window:'One quiet window keeps its thread.',road:'I take the road with unsold thread.'}},
]);
export const REPERTOIRE_ARRANGEMENTS = freeze([{id:'solo',name:'Quiet solo'},{id:'refrain',name:'Shared refrain'}]);
export const REPERTOIRE_VENUES = freeze([
  {locationId:'home',workId:'open-chair',arrangement:'solo',context:'Neighbors linger for a quiet ending and a song that leaves room at the hearth.'},
  {locationId:'brook',workId:'two-banks',arrangement:'refrain',context:'River workers and travelers ask for a refrain they can pass from table to table.'},
  {locationId:'city',workId:'last-stitch',arrangement:'refrain',context:'A mixed, busy audience follows a clear refrain and the small work behind the market noise.'},
]);
const clone = value => structuredClone(value);
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const text = (value,max=200) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value,min=0,max=10000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const safeId = value => text(value,100) && /^[a-z][a-z0-9_-]*$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const keys = (value,allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const fail = reason => ({ok:false,reason});
const work = id => REPERTOIRE_WORKS.find(row => row.id === id);
const arrangement = id => REPERTOIRE_ARRANGEMENTS.some(row => row.id === id);
const profile = id => REPERTOIRE_VENUES.find(row => row.locationId === id);
const location = (s,id) => s.world?.locations?.find(row => row.id === id);
const currentRoom = s => s.cartography?.interior?.siteId === s.locationId ? s.cartography.interior.roomId : 'gate';
export const repertoireOwnerId = s => s.lineage?.currentPersonId || s.dynasty?.activePersonId || `birth-${s.timeline?.birthDay ?? 0}`;
const operating = (s,id) => {
  const site = location(s,id);
  return !!site && site.servicesAvailable !== false && !['destroyed','evacuated'].includes(site.status) &&
    (['city','village','camp'].includes(site.type) || site.services?.some(id => ['hearth','market'].includes(id))) &&
    !s.realm?.politics?.holds?.some(row => row.siteId === id && row.status === 'held');
};
const availablePerson = (s,p) => {
  const record = s.npcContinuity?.people?.[p?.id];
  return !!p && p.available !== false && p.alive !== false && p.retired !== true && p.npcActive !== false &&
    !s.life?.people?.some(row => row.id === p.id && row.alive === false) &&
    (!record || record.retiredDay === null && record.retireDay > s.day);
};
const otherCommitment = s => localWorkLocked(s) || s.researchPortfolio?.project || s.familyOrigins?.project || s.life?.plan || s.timeline?.journey || s.cartography?.pending || s.cartography?.offsite || s.justice?.prison || s.maze || s.careers?.batch || s.workshop?.project || s.health?.recovery || s.stories?.project || s.rpg?.project ||
  s.conversations?.project || s.society?.project || s.community?.project?.commitment || s.fellowship?.project || s.sanctuaries?.commitment || s.lineage?.adoption?.preparation;
export function repertoireReason(s,{allowProject=false}={}) {
  if (s.age < 18 || s.phase !== 'adult') return 'Original recitals open in adult life.';
  if (s.event || s.battle || s.conversations?.pending || s.pastimes?.pending || s.social?.pending) return 'Finish the current moment first.';
  if (otherCommitment(s) || s.pastimes?.project || !allowProject && s.repertoire?.project) return 'Finish your current commitment first.';
  if (s.repertoire && s.repertoire.ownerId !== repertoireOwnerId(s)) return 'This repertoire belongs to an earlier person, not the current performer.';
  return null;
}
function metadata(s) {
  return s.repertoire ||= {version:1,ownerId:repertoireOwnerId(s),sequence:0,pieces:[],circuit:null,project:null,performances:[],recall:null};
}
const nextId = (r,kind) => `repertoire-${kind}-${++r.sequence}`;
const piece = (s,id) => s.repertoire?.pieces.find(row => row.id === id);
const verse = (id,endingId) => [...work(id).lines,work(id).endings[endingId]].join('\n');
function snapshot(p) {
  return {pieceId:p.id,workId:p.workId,revision:p.revision,title:p.title,endingId:p.endingId,verse:p.verse,source:clone(p.source),credits:clone(p.credits),composedDay:p.composedDay,revisedDay:p.revisedDay};
}
export function createRepertoirePiece(s,{workId,endingId,title}={}) {
  const reason = repertoireReason(s),row = work(workId);
  if (reason) return fail(reason);
  if (!row) return fail('Choose one of the three original pieces.');
  endingId ??= Object.keys(row.endings)[0]; title ??= row.title;
  if (!Object.hasOwn(row.endings,endingId) || !text(title,80)) return fail('Choose an authored ending and a title of at most 80 characters.');
  if (!location(s,s.locationId)) return fail('The composition needs an actual place in this world.');
  if ((s.repertoire?.pieces.length || 0) >= 3) return fail('Your repertoire already holds three active pieces.');
  if ((s.repertoire?.sequence || 0) >= 500000 || !safeId(repertoireOwnerId(s)) || !text(s.hero?.name,100)) return fail('This repertoire cannot record another piece.');
  const r = metadata(s),p = {id:nextId(r,'piece'),workId,revision:1,title:title.trim(),endingId,verse:verse(workId,endingId),privacy:'private',composedDay:s.day,revisedDay:s.day,
    source:{kind:'original-fiction',locationId:s.locationId,day:s.day},credits:[{personId:r.ownerId,name:s.hero.name,role:'words'}],rehearsal:null};
  r.pieces.push(p);return {ok:true,piece:clone(p)};
}
export function reviseRepertoirePiece(s,id,{title,endingId}={}) {
  const reason = repertoireReason(s,{allowProject:true}),p = piece(s,id);
  if (reason) return fail(reason);
  if (!p) return fail('That active manuscript is no longer in your repertoire.');
  title ??= p.title; endingId ??= p.endingId;
  if (!text(title,80) || !Object.hasOwn(work(p.workId).endings,endingId)) return fail('Choose an authored ending and a title of at most 80 characters.');
  title = title.trim();
  if (title === p.title && endingId === p.endingId) return fail('This is already the current version.');
  if (p.revision >= 1000000) return fail('This manuscript cannot record another revision.');
  Object.assign(p,{title,endingId,verse:verse(p.workId,endingId),revision:p.revision+1,revisedDay:s.day,privacy:'private',rehearsal:null});
  return {ok:true,piece:clone(p)};
}
export function setRepertoirePrivacy(s,id,privacy) {
  const reason = repertoireReason(s,{allowProject:true}),p = piece(s,id);
  if (reason) return fail(reason);
  if (!p || !['private','public'].includes(privacy)) return fail('Choose a current manuscript and its copy permission.');
  if (p.privacy === privacy) return fail('This version already has that copy permission.');
  p.privacy = privacy;return {ok:true,privacy};
}
export function deleteRepertoirePiece(s,id) {
  const reason = repertoireReason(s,{allowProject:true}),p = piece(s,id);
  if (reason) return fail(reason);
  if (!p) return fail('That active manuscript is no longer in your repertoire.');
  s.repertoire.pieces = s.repertoire.pieces.filter(row => row.id !== id);
  return {ok:true}; // Frozen projects and heard versions deliberately remain.
}
function venue(s,id,services) {
  const row = services?.find(row => row.kind === 'inn' && row.locationId === id && row.roomId === 'tavern');
  if (!operating(s,id) || !row || !safeId(row.personId) || row.person?.id !== row.personId || row.name !== row.person.name || !text(row.name,100) || !availablePerson(s,row.person)) return null;
  const slot = s.npcContinuity?.slots?.[`service:${id}:inn:`];
  if (slot && slot.personId !== row.personId) return null;
  return row;
}
function reachable(s,start,target) {
  if (!location(s,start)) return false;
  const seen = new Set([start]),queue = [start];
  for (let i=0;i<queue.length;i++) {
    const at = queue[i];if (at === target) return true;
    for (const road of s.world.roads || []) {
      const to = road.from === at ? road.to : road.to === at ? road.from : null;
      if (!to || road.closed === true || seen.has(to) || !location(s,to)) continue;
      seen.add(to);queue.push(to);
    }
  }
  return false;
}
export function repertoireCircuitReason(s,services=[]) {
  const reason = repertoireReason(s);if (reason) return reason;
  if (s.repertoire?.circuit) return 'This life already accepted its finite three-inn circuit.';
  for (const target of REPERTOIRE_VENUES) {
    if (!venue(s,target.locationId,services)) return `The actual Tavern at ${location(s,target.locationId)?.name || target.locationId} is missing or not operating. No circuit was accepted.`;
    if (!reachable(s,s.locationId,target.locationId)) return `No open road route currently connects you to ${location(s,target.locationId).name}. No circuit was accepted.`;
  }
  if (currentRoom(s) !== 'tavern' || !venue(s,s.locationId,services)?.here) return 'Arrange this circuit with an actual innkeeper in one of its three Taverns.';
  if ((s.repertoire?.sequence || 0) >= 500000) return 'This repertoire cannot record another commitment.';
  return null;
}
export function acceptRepertoireCircuit(s,services=[]) {
  const reason = repertoireCircuitReason(s,services);if (reason) return fail(reason);
  const r = metadata(s);
  r.circuit = {id:nextId(r,'circuit'),startedDay:s.day,targets:REPERTOIRE_VENUES.map(row => ({locationId:row.locationId,name:`Tavern at ${location(s,row.locationId).name}`,roomId:'tavern'})),stops:[],completedDay:null,withdrawnDay:null};
  return {ok:true,circuit:clone(r.circuit)};
}
export function withdrawRepertoireCircuit(s) {
  const reason = repertoireReason(s,{allowProject:true}),r = s.repertoire;
  if (reason) return fail(reason);
  if (!r?.circuit || r.circuit.completedDay !== null || r.circuit.withdrawnDay !== null) return fail('There is no unfinished circuit to withdraw.');
  r.project = null;r.circuit.withdrawnDay = s.day;return {ok:true};
}
export function repertoireReception(pieceSnapshot,arrangementId,locationId,{rehearsed=false,priorPerformance=false}={}) {
  const audience = profile(locationId);
  if (!audience || !work(pieceSnapshot?.workId) || !arrangement(arrangementId)) return null;
  const score = (pieceSnapshot.workId === audience.workId ? 2 : 0) + (arrangementId === audience.arrangement ? 1 : 0) + Number(rehearsed) + Number(priorPerformance);
  const reception = score >= 3 ? 'warm' : score === 2 ? 'attentive' : 'divided',joy = {warm:4,attentive:2,divided:1}[reception];
  return {score,reception,joy,context:audience.context};
}
function start(s,id,arrangementId,kind,services,permission) {
  const reason = repertoireReason(s),p = piece(s,id),r = s.repertoire;
  if (reason) return fail(reason);
  if (!p || !arrangement(arrangementId)) return fail('Choose an active original piece and an arrangement.');
  if (r.sequence >= (kind === 'recital' ? 499999 : 500000)) return fail('This repertoire cannot record another commitment.');
  let host = null,target = null;
  if (kind === 'recital') {
    if (!r.circuit || r.circuit.completedDay !== null || r.circuit.withdrawnDay !== null) return fail('First accept the finite three-inn circuit.');
    target = r.circuit.targets.find(row => row.locationId === s.locationId);
    if (!target || r.circuit.stops.some(row => row.locationId === s.locationId)) return fail('Choose an unfinished, fixed stop on your accepted circuit.');
    host = venue(s,s.locationId,services);
    if (!host?.here || currentRoom(s) !== 'tavern') return fail('This fixed stop needs its operating Tavern and actual present innkeeper. You can withdraw if it has closed.');
    if (!validListener({id:host.personId,name:host.name,locationId:s.locationId,roomId:'tavern'},s,s.locationId)) return fail('Meet this exact innkeeper before recording a named recital.');
    if (!['once','manuscript'].includes(permission)) return fail('Explicitly permit this rendition once or permit a public manuscript copy.');
    if (permission === 'manuscript' && p.privacy !== 'public') return fail('First explicitly allow public copies of this exact manuscript revision. A public rendition alone does not do that.');
  } else if (!operating(s,s.locationId)) return fail('Rehearse in an actual operating settlement.');
  const prior = r.performances.findLast(row => row.piece.pieceId === p.id && row.piece.revision === p.revision);
  r.project = {id:nextId(r,'project'),kind,locationId:s.locationId,startedDay:s.day,lastProgressDay:s.day,totalDays:kind === 'recital' ? 2 : 1,completedDays:0,remainingDays:kind === 'recital' ? 2 : 1,piece:snapshot(p),arrangement:arrangementId,
    rehearsal:p.rehearsal?.revision === p.revision && p.rehearsal.arrangement === arrangementId ? clone(p.rehearsal) : null,
    priorPerformanceId:kind === 'recital' ? prior?.id || null : null,permission:kind === 'recital' ? permission : null,
    venue:target ? clone(target) : null,listener:host ? {id:host.personId,name:host.name,locationId:s.locationId,roomId:'tavern'} : null};
  return {ok:true,project:clone(r.project)};
}
export const startRepertoireRehearsal = (s,id,arrangementId) => start(s,id,arrangementId,'rehearsal');
export const startRepertoireRecital = (s,id,arrangementId,permission,services=[]) => start(s,id,arrangementId,'recital',services,permission);
export function repertoireProjectReason(s,services=[],{afterAttendance=false}={}) {
  const reason = afterAttendance ? s.phase !== 'adult' ? 'This performer can no longer attend.' : s.repertoire?.ownerId !== repertoireOwnerId(s) ? 'This commitment belongs to an earlier performer.' : null : repertoireReason(s,{allowProject:true}),p = s.repertoire?.project;
  if (reason) return reason;
  if (!p) return 'There is no attended artistic commitment.';
  if (s.locationId !== p.locationId) return 'Return to the commitment’s actual place.';
  if (!operating(s,p.locationId)) return 'This place is no longer operating. Withdraw; the fixed circuit does not acquire a replacement venue.';
  if (p.kind === 'recital') {
    const host = venue(s,p.locationId,services);
    if (!host?.here || currentRoom(s) !== 'tavern' || host.personId !== p.listener.id) return 'The exact booked listener is not here. A successor does not inherit this performance or their recognition; withdraw this booking.';
  }
  return null;
}
// The engine advances its real calendar first, then reports only attended days.
// projectId/fromDay reject stale or repeated settlement, including after reload.
export function attendRepertoireProject(s,{projectId,fromDay,days,services=[]}={}) {
  const r = s.repertoire,p = r?.project;
  if (!p || p.id !== projectId) return fail('This commitment is no longer current.');
  if (s.phase === 'retired') { r.project = null;return {ok:true,completed:false,retired:true,days:0}; }
  const reason = repertoireProjectReason(s,services,{afterAttendance:true});if (reason) return fail(reason);
  if (!integer(days,0,p.remainingDays) || !integer(fromDay,p.lastProgressDay,s.day) || s.day - fromDay !== days) return fail('Only new actual calendar days can count as attendance.');
  if (!days) return {ok:true,completed:false,days:0};
  p.completedDays += days;p.remainingDays -= days;p.lastProgressDay = s.day;
  if (p.remainingDays) return {ok:true,completed:false,days};
  r.project = null;
  if (p.kind === 'rehearsal') {
    const manuscript = piece(s,p.piece.pieceId);
    if (manuscript?.revision === p.piece.revision) manuscript.rehearsal = {revision:p.piece.revision,arrangement:p.arrangement,completedDay:s.day,attendedDays:1};
    return {ok:true,completed:true,kind:p.kind,piece:clone(p.piece),days,joy:0};
  }
  const response = repertoireReception(p.piece,p.arrangement,p.locationId,{rehearsed:p.rehearsal !== null,priorPerformance:p.priorPerformanceId !== null});
  const receipt = {id:nextId(r,'performance'),circuitId:r.circuit.id,startedDay:p.startedDay,performedDay:s.day,attendedDays:p.totalDays,piece:clone(p.piece),arrangement:p.arrangement,rehearsal:clone(p.rehearsal),priorPerformanceId:p.priorPerformanceId,permission:p.permission,venue:clone(p.venue),listener:clone(p.listener),...response};
  r.performances.push(receipt);r.circuit.stops.push({locationId:p.locationId,performanceId:receipt.id});
  if (r.circuit.stops.length === 3) r.circuit.completedDay = s.day;
  r.recall ||= {performanceId:receipt.id,personId:receipt.listener.id,acknowledgedDay:null,choiceId:null};
  if (s.life && Number.isFinite(s.life.happiness)) s.life.happiness = Math.max(0,Math.min(100,s.life.happiness + receipt.joy));
  return {ok:true,completed:true,kind:p.kind,receipt:clone(receipt),days,joy:receipt.joy};
}
export function cancelRepertoireProject(s) {
  const reason = repertoireReason(s,{allowProject:true}),r = s.repertoire;
  if (reason) return fail(reason);
  if (!r?.project) return fail('There is no unfinished artistic commitment.');
  const completedDays = r.project.completedDays;r.project = null;return {ok:true,completedDays};
}
export function repertoireRecall(s,person,{hostile=false,readinessReason=null}={}) {
  const r = s.repertoire,record = r?.recall,heard = record && r.performances.find(row => row.id === record.performanceId);
  if (!record || record.acknowledgedDay !== null || !heard || repertoireReason(s) || hostile || readinessReason || !availablePerson(s,person) || (person.bond ?? 40) < 15 ||
    person.id !== record.personId || person.name !== heard.listener.name || person.locationId !== s.locationId || person.roomId !== 'tavern' || currentRoom(s) !== 'tavern' || !operating(s,s.locationId) || s.day <= heard.performedDay) return null;
  return recallTerms(heard);
}
// Version-one recall terms remain stable for already captured explicit scenes.
function recallTerms(heard) {
  const description = 'Conversation only. No days, Gold, work, skill or relationship reward.';
  return {performanceId:heard.id,personId:heard.listener.id,title:`Talk about ${heard.piece.title}`,piece:clone(heard.piece),arrangement:heard.arrangement,venue:clone(heard.venue),reception:heard.reception,
    body:`${heard.listener.name} recalls your ${heard.arrangement === 'solo' ? 'quiet solo' : 'shared refrain'} of “${heard.piece.title}” at ${heard.venue.name} on world day ${heard.performedDay}. “I remember the ending: ${heard.piece.verse.split('\n').at(-1)}”`,
    choices:[
      {id:'listen',label:'Ask what stayed with them',description,response:`“The ending stayed with me: ${heard.piece.verse.split('\n').at(-1)} That is the version I heard, not a claim about a later draft.”`},
      {id:'ending',label:'Talk about that ending',description,response:'“You chose where to leave the listener. Another ending might change the piece; it would not change the one we heard that evening.”'},
      {id:'arrangement',label:'Discuss the arrangement',description,response:`“You used a ${heard.arrangement === 'solo' ? 'quiet solo' : 'shared refrain'}. Our ${heard.reception} reception belonged to that room and that evening, not every audience you might meet.”`},
      {id:'leave',label:'Leave the subject here',description,response:'“Then we will leave it here. There are other things to talk about.”'},
    ]};
}
export function openRepertoireRecall(s,person,options={}) {
  const scene = repertoireRecall(s,person,options);
  if (!scene || s.repertoire.pending) return fail('This exact recollection cannot open now.');
  s.repertoire.pending = {termsVersion:1,personId:person.id,performanceId:scene.performanceId,openedDay:s.day,snapshot:clone(scene)};
  return {ok:true,scene};
}
export function acknowledgeRepertoireRecall(s,person,performanceId,choiceId,options={}) {
  const scene = repertoireRecall(s,person,options);
  if (!scene || scene.performanceId !== performanceId || !scene.choices.some(row => row.id === choiceId)) return fail('That exact listener cannot acknowledge this performance now.');
  Object.assign(s.repertoire.recall,{acknowledgedDay:s.day,choiceId});return {ok:true};
}
export function repertoireView(s) {
  const r = s.repertoire;
  return r ? clone(r) : {version:1,ownerId:repertoireOwnerId(s),sequence:0,pieces:[],circuit:null,project:null,performances:[],recall:null};
}
function validSnapshot(p,s,owner) {
  const row = work(p?.workId);
  return keys(p,['pieceId','workId','revision','title','endingId','verse','source','credits','composedDay','revisedDay']) && /^repertoire-piece-[1-9]\d*$/.test(p.pieceId) && !!row && integer(p.revision,1,1000000) && text(p.title,80) && Object.hasOwn(row.endings,p.endingId) && p.verse === verse(p.workId,p.endingId) &&
    integer(p.composedDay,0,s.day) && integer(p.revisedDay,p.composedDay,s.day) && keys(p.source,['kind','locationId','day']) && p.source.kind === 'original-fiction' && !!location(s,p.source.locationId) && p.source.day === p.composedDay &&
    Array.isArray(p.credits) && p.credits.length === 1 && keys(p.credits[0],['personId','name','role']) && p.credits[0].personId === owner && text(p.credits[0].name,100) && p.credits[0].role === 'words';
}
const validRehearsal = (p,s,revision,arrangementId=null,earliest=0,latest=s.day) => p === null || keys(p,['revision','arrangement','completedDay','attendedDays']) && p.revision === revision && arrangement(p.arrangement) && (!arrangementId || p.arrangement === arrangementId) && integer(p.completedDay,earliest,latest) && p.attendedDays === 1;
const validTarget = (p,s) => keys(p,['locationId','name','roomId']) && !!profile(p.locationId) && p.roomId === 'tavern' && p.name === `Tavern at ${location(s,p.locationId)?.name}`;
function validListener(p,s,siteId) {
  if (!keys(p,['id','name','locationId','roomId']) || !safeId(p.id) || !text(p.name,100) || p.locationId !== siteId || p.roomId !== 'tavern') return false;
  const historical = s.npcContinuity?.people?.[p.id]?.snapshot || s.conversations?.servicePeople?.[p.id];
  return !!historical && historical.locationId === siteId && historical.name === p.name && historical.role === 'Innkeeper';
}
export function validateRepertoire(value,s) {
  try {
    if (value === undefined) return true;
    const r = value,when = (day,min=0) => integer(day,min,s.day),allIds = [],versions = new Map(),identities = new Map();
    if (!keys(r,['version','ownerId','sequence','pieces','circuit','project','performances','recall','pending']) || r.version !== 1 || !safeId(r.ownerId) || r.ownerId !== repertoireOwnerId(s) || !integer(r.sequence,0,500000) || !Array.isArray(r.pieces) || r.pieces.length > 3 || !Array.isArray(r.performances) || r.performances.length > 3) return false;
    const token = (id,kind) => new RegExp(`^repertoire-${kind}-[1-9]\\d*$`).test(id) && Number(id.split('-').at(-1)) <= r.sequence;
    const sameVersion = p => {
      const key = `${p.pieceId}:${p.revision}`,identity = JSON.stringify([p.workId,p.composedDay,p.source.kind,p.source.locationId,p.source.day,p.credits.map(c=>[c.personId,c.name,c.role])]);
      const signature = JSON.stringify([identity,p.title,p.endingId,p.verse,p.revisedDay]);
      if (versions.has(key) && versions.get(key) !== signature || identities.has(p.pieceId) && identities.get(p.pieceId) !== identity) return false;
      versions.set(key,signature);identities.set(p.pieceId,identity);return true;
    };
    for (const p of r.pieces) {
      if (!keys(p,['id','workId','revision','title','endingId','verse','privacy','composedDay','revisedDay','source','credits','rehearsal']) || !token(p.id,'piece') || !validSnapshot(snapshot(p),s,r.ownerId) || !sameVersion(snapshot(p)) || !['private','public'].includes(p.privacy) || !validRehearsal(p.rehearsal,s,p.revision,null,p.revisedDay)) return false;
      allIds.push(p.id);
    }
    const c = r.circuit;
    if (c !== null && (!keys(c,['id','startedDay','targets','stops','completedDay','withdrawnDay']) || !token(c.id,'circuit') || !when(c.startedDay) || !Array.isArray(c.targets) || c.targets.length !== 3 || !c.targets.every((p,i) => validTarget(p,s) && p.locationId === REPERTOIRE_VENUES[i].locationId) || !Array.isArray(c.stops) || c.stops.length > 3 || new Set(c.stops.map(p => p.locationId)).size !== c.stops.length || !(c.completedDay === null || when(c.completedDay,c.startedDay)) || !(c.withdrawnDay === null || when(c.withdrawnDay,c.startedDay)) || c.completedDay !== null && c.withdrawnDay !== null)) return false;
    if (c) allIds.push(c.id);
    for (let i=0;i<r.performances.length;i++) {
      const p = r.performances[i],prior = r.performances.slice(0,i).find(row => row.id === p.priorPerformanceId);
      if (!c || !keys(p,['id','circuitId','startedDay','performedDay','attendedDays','piece','arrangement','rehearsal','priorPerformanceId','permission','venue','listener','score','reception','joy','context']) || !token(p.id,'performance') || p.circuitId !== c.id || !when(p.startedDay,c.startedDay) || !when(p.performedDay,p.startedDay+2) || p.attendedDays !== 2 || !validSnapshot(p.piece,s,r.ownerId) || p.piece.revisedDay > p.startedDay || !arrangement(p.arrangement) || !validRehearsal(p.rehearsal,s,p.piece.revision,p.arrangement,p.piece.revisedDay,p.startedDay) || !['once','manuscript'].includes(p.permission) || !validTarget(p.venue,s) || !validListener(p.listener,s,p.venue.locationId) || !(p.priorPerformanceId === null || prior && prior.piece.pieceId === p.piece.pieceId && prior.piece.revision === p.piece.revision && prior.performedDay <= p.startedDay)) return false;
      const response = repertoireReception(p.piece,p.arrangement,p.venue.locationId,{rehearsed:p.rehearsal !== null,priorPerformance:p.priorPerformanceId !== null});
      if (!sameVersion(p.piece) || Object.entries(response).some(([key,n]) => p[key] !== n) || i && p.startedDay < r.performances[i-1].performedDay || c.withdrawnDay !== null && p.performedDay > c.withdrawnDay) return false;
      allIds.push(p.id,p.piece.pieceId);
    }
    if (new Set(r.pieces.map(p=>p.id)).size !== r.pieces.length || new Set(r.performances.map(p=>p.id)).size !== r.performances.length) return false;
    if (c && (c.stops.length !== r.performances.length || c.stops.some(p=>!keys(p,['locationId','performanceId']) || !r.performances.some(row=>row.id === p.performanceId && row.venue.locationId === p.locationId)) || (c.stops.length === 3 ? c.completedDay !== r.performances.at(-1).performedDay : c.completedDay !== null))) return false;
    const p = r.project;
    if (p !== null) {
      if (otherCommitment(s) || s.pastimes?.project) return false;
      if (!keys(p,['id','kind','locationId','startedDay','lastProgressDay','totalDays','completedDays','remainingDays','piece','arrangement','rehearsal','priorPerformanceId','permission','venue','listener']) || !token(p.id,'project') || !['rehearsal','recital'].includes(p.kind) || !location(s,p.locationId) || !when(p.startedDay) || !when(p.lastProgressDay,p.startedDay) || !integer(p.completedDays,0,p.totalDays-1) || p.remainingDays !== p.totalDays-p.completedDays || p.completedDays > p.lastProgressDay-p.startedDay || !validSnapshot(p.piece,s,r.ownerId) || p.piece.revisedDay > p.startedDay || !arrangement(p.arrangement) || !validRehearsal(p.rehearsal,s,p.piece.revision,p.arrangement,p.piece.revisedDay,p.startedDay)) return false;
      if (p.kind === 'rehearsal') { if (p.totalDays !== 1 || p.permission !== null || p.venue !== null || p.listener !== null || p.priorPerformanceId !== null) return false; }
      else {
        const prior = r.performances.find(row=>row.id === p.priorPerformanceId);
        if (p.totalDays !== 2 || !c || c.completedDay !== null || c.withdrawnDay !== null || p.startedDay < c.startedDay || !validTarget(p.venue,s) || p.venue.locationId !== p.locationId || !validListener(p.listener,s,p.locationId) || c.stops.some(row=>row.locationId === p.locationId) || !['once','manuscript'].includes(p.permission) || !(p.priorPerformanceId === null || prior && prior.piece.pieceId === p.piece.pieceId && prior.piece.revision === p.piece.revision && prior.performedDay <= p.startedDay)) return false;
      }
      if (!sameVersion(p.piece)) return false;
      allIds.push(p.id,p.piece.pieceId);
    }
    const issued = new Map();
    for (const id of allIds) {
      const number = Number(id.split('-').at(-1));
      if (!integer(number,1,r.sequence) || issued.has(number) && issued.get(number) !== id) return false;
      issued.set(number,id);
    }
    const recall = r.recall,first = r.performances[0];
    if (first ? !keys(recall,['performanceId','personId','acknowledgedDay','choiceId']) || recall.performanceId !== first.id || recall.personId !== first.listener.id || !(recall.acknowledgedDay === null ? recall.choiceId === null : when(recall.acknowledgedDay,first.performedDay+1) && ['listen','ending','arrangement','leave'].includes(recall.choiceId)) : recall !== null) return false;
    const pending = r.pending;
    if (pending !== undefined && pending !== null) {
      if (!keys(pending,['termsVersion','personId','performanceId','openedDay','snapshot']) || pending.termsVersion !== 1 || !first || pending.personId !== first.listener.id || pending.performanceId !== first.id || !when(pending.openedDay,first.performedDay+1) || recall.acknowledgedDay !== null || r.project || JSON.stringify(pending.snapshot) !== JSON.stringify(recallTerms(first))) return false;
      const event = s.event;
      if (event?.id !== 'repertoire_recall' || event.title !== pending.snapshot.title || event.body !== pending.snapshot.body || JSON.stringify(event.choices) !== JSON.stringify(pending.snapshot.choices.map(({id,label,description})=>({id,label,description})))) return false;
    } else if (s.event?.id === 'repertoire_recall') return false;
    return true;
  } catch { return false; }
}
