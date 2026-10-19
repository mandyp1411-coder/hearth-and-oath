/**
 * Expedition accounting only. These pure helpers cannot award, restore, claim,
 * move, spend time, or write a save. Runtime hooks are deliberately separate.
 */
export const EXPEDITION_RECEIPT_LIMIT = 80;
// A single visit has <=121 coalesced ordinary-room settlements plus <=8
// finite authored effects (signature <=7). Repeated fees/camps use scalars.
// Leave bounded headroom, and disclose partial accounting if it is exceeded.
export const EXPEDITION_SETTLEMENT_LIMIT = 256;
const ROOM_COUNT = 121;
const MATERIALS = ['ore','cloth','wood','stone','hide','crystal'];
const DAY_KINDS = ['entry','inside','recovery'];
const USE_KINDS = ['walkFocus','potions','rations','kitNights'];
const FEE_KINDS = ['passage','work','recovery'];
const IDENTITY_KEYS = ['mazeId','runSeed','runGeneration','mazeVersion','kind','family','manifestVersion','sourceId','locationId'];
const START_KEYS = ['day','explored','cleared','steps','potions','rations','kitNights','health','focus'];
const VISIT_KEYS = ['version','id','identity','actorId','actorGeneration','actorName','coverage','start','days','used','fees','retreats','settlements','settlementsIncomplete'];
const visitKeys = value => [...VISIT_KEYS,...(Object.hasOwn(value||{},'assists')?['assists']:[])];
const OBJECTIVE_KEYS = ['complete','method','completionDay','completionActorId','battleId','captured'];
const object = v => !!v && typeof v==='object' && !Array.isArray(v);
const int = (v,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v>=min && v<=max;
const signed = v => Number.isSafeInteger(v);
const text = (v,max=160) => typeof v==='string' && v.length>0 && v.length<=max;
const nullableText = (v,max=160) => v===null || text(v,max);
const exact = (v,keys) => object(v) && Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k));
const zero = keys => Object.fromEntries(keys.map(k=>[k,0]));
const scalarMap = (v,keys,predicate=int) => exact(v,keys) && keys.every(k=>predicate(v[k]));
const actor = s => s.dynasty?.activePersonId || 'hero';
const generation = s => s.dynasty?.generation || 1;
const validActor = (s,id) => text(id) && (id===actor(s) || (s.dynasty?.history||[]).some(r=>r.personId===id) || (s.lineage?.people||[]).some(r=>r.id===id));
const list = (v,max,valid) => Array.isArray(v) && v.length<=max && v.every(valid) && new Set(v.map(r=>r.id)).size===v.length;

/** The v2 subset matches ID19's mazeRunIdentity; v1 has no invented manifest. */
export function expeditionRunIdentity(m) {
 return {mazeId:m.id,runSeed:m.seed,runGeneration:m.generation,mazeVersion:m.version,kind:m.kind,
  family:m.version===2?m.content?.family:null,manifestVersion:m.version===2?1:null,
  sourceId:m.sourceId,locationId:m.locationId};
}
export function sameExpeditionRun(value,m) {
 return exact(value,IDENTITY_KEYS) && IDENTITY_KEYS.every(k=>value[k]===expeditionRunIdentity(m)[k]);
}
function validIdentity(s,id,closed=false) {
 if(!exact(id,IDENTITY_KEYS)||!/^maze-[1-9]\d*$/.test(id.mazeId)||!int(+id.mazeId.slice(5),1,closed?Number.MAX_SAFE_INTEGER:(s.mazeBook?.nextRun||1)-1)
  ||!int(id.runGeneration,1,generation(s))||![1,2].includes(id.mazeVersion)||!['authored','contract','regional','radiant'].includes(id.kind)
  ||!text(id.sourceId,100)||!text(id.locationId,100)||!text(id.runSeed,400)
  ||!s.world?.locations?.some(p=>p.id===id.locationId))return false;
 if(id.runSeed!==`${s.seed}:maze:${id.runGeneration}:${id.kind}:${id.sourceId}:${id.locationId}:${id.mazeId.slice(5)}`)return false;
 return id.mazeVersion===1?id.family===null&&id.manifestVersion===null
  :id.manifestVersion===1&&(id.kind==='authored'&&id.family==='authored'||id.kind==='regional'&&id.family==='signature');
}

/** Fixed primitive counters only; no map, inventory, journal or world copies. */
export function expeditionEntrySnapshot(s,m=s.maze) {
 return {day:s.day,explored:m.visited.length,cleared:m.cleared.length,steps:m.steps,
  potions:s.hero.potions||0,rations:s.adventuring?.rations||0,
  kitNights:(s.trail?.kits||[]).reduce((n,k)=>n+Math.max(0,k.remaining),0),health:s.hero.hp,focus:s.hero.mp};
}
const validSnapshot = (v,day) => scalarMap(v,START_KEYS) && v.day<=day && v.explored>=1 && v.explored<=ROOM_COUNT && v.cleared>=1 && v.cleared<=v.explored;

/** Call only after admission, with the pre-admission snapshot for entry coverage. */
export function createExpeditionVisit(s,m,number,{entry=expeditionEntrySnapshot(s,m),entryDays=0,coverage='entry'}={}) {
 const value={version:1,id:'maze-visit-'+number,identity:expeditionRunIdentity(m),actorId:actor(s),actorGeneration:generation(s),
  actorName:s.hero.name??null,coverage,start:{...entry},days:{entry:entryDays,inside:0,recovery:0},used:zero(USE_KINDS),fees:zero(FEE_KINDS),retreats:0,settlements:[],settlementsIncomplete:false};
 return int(number,1)&&validVisit(s,value,m,{now:s.day,requireDayTotal:true})?value:null;
}
function addCounter(value,group,key,amount) {
 if(!value||!int(amount)||!Object.hasOwn(value[group]||{},key)||!int(value[group][key]+amount))return value;
 return amount?{...value,[group]:{...value[group],[key]:value[group][key]+amount}}:value;
}
export const addExpeditionDays = (value,kind,amount) => DAY_KINDS.includes(kind)?addCounter(value,'days',kind,amount):value;
export const addExpeditionUse = (value,kind,amount) => USE_KINDS.includes(kind)?addCounter(value,'used',kind,amount):value;
export const addExpeditionFee = (value,kind,amount) => FEE_KINDS.includes(kind)?addCounter(value,'fees',kind,amount):value;
export const noteExpeditionRetreat = value => value&&int(value.retreats+1)?{...value,retreats:value.retreats+1}:value;

function assistBelongs(row,value){
 const id=value.identity;
 return row.mazeId===id.mazeId&&row.runSeed===id.runSeed&&row.runGeneration===id.runGeneration&&row.sourceId===id.sourceId&&row.locationId===id.locationId
  &&row.manifestVersion===(id.mazeVersion===2?1:0)&&row.family===(id.mazeVersion===2?id.family:id.kind)
  &&row.actorId===value.actorId&&row.actorGeneration===value.actorGeneration&&row.visitId===value.id
  &&(value.actorName===null||row.actorName===value.actorName);
}
/** Accepted field effects only. No new ledger is created for a rejected/no-op
 * command. Keep the exact captured person and arithmetic, not a current local
 * companion ID lookup, so closed accounts survive succession/map eviction. */
export function recordExpeditionFieldAssist(value,s,m,row,{validateFieldAssist}={}){
 if(!value||!sameExpeditionRun(value.identity,m)||typeof validateFieldAssist!=='function'||!validateFieldAssist(s,row)||!assistBelongs(row,value)
  ||!int(row.day,value.start.day,s.day))return value;
 const rows=value.assists||[],existing=rows.find(r=>r.cellId===row.cellId);
 if(existing)return stable(existing)===stable(row)?value:{...value,settlementsIncomplete:true};
 if(rows.length>=ROOM_COUNT)return {...value,settlementsIncomplete:true};
 return {...value,assists:[...rows,structuredClone(row)]};
}

const relic = r => exact(r,['id','name','value']) && text(r.id) && text(r.name) && int(r.value);
const gear = r => exact(r,['id','baseId','quality','affix','tier','source','day']) && /^found_[a-z0-9]+_[1-9]\d*$/.test(r.id)
 && text(r.baseId,100) && ['common','uncommon','rare','epic','legendary'].includes(r.quality) && /^[a-z_]{1,40}$/.test(r.affix)
 && int(r.tier,1,6) && text(r.source,80) && int(r.day);
const property = r => exact(r,['id','label']) && text(r.id,240) && text(r.label);
const compactGear = r => ({id:r.id,baseId:r.baseId,quality:r.quality,affix:r.affix,tier:r.tier,source:r.source,day:r.day});

/** Capture only immediately around an accepted post-attendance settlement. */
export function expeditionSettlementSnapshot(s) {
 return {gold:s.hero.gold,herbs:s.flags?.herbs||0,potions:s.hero.potions||0,rations:s.adventuring?.rations||0,
  materials:Object.fromEntries(MATERIALS.map(k=>[k,s.equipment?.materials?.[k]||0])),
  relics:(s.adventuring?.loot||[]).map(r=>({id:r.id,name:r.name,value:r.value})),
  gear:(s.equipment?.instances||[]).filter(r=>(s.equipment?.owned||[]).includes(r.id)&&!r.stolen&&!r.crafted).map(compactGear),
  properties:(s.rpg?.properties||[]).filter(r=>r.soldDay===null&&r.returnedDay===null&&r.ownerId===actor(s)).map(r=>({id:r.id,label:r.label}))};
}
function validEffect(v) {
 return exact(v,['gold','experience','herbs','potions','rations','materials','relics','gear','properties'])
  &&int(v.experience)&&['gold','herbs','potions','rations'].every(k=>signed(v[k]))&&scalarMap(v.materials,MATERIALS,signed)
  &&list(v.relics,1,relic)&&list(v.gear,1,gear)&&list(v.properties,1,property);
}
/** Item differences are bounded and occur only on settlements, never per walk. */
export function expeditionSettlementDelta(before,after) {
 const added = key => {const ids=new Set(before[key].map(r=>r.id));return after[key].filter(r=>!ids.has(r.id)).map(r=>({...r}));};
 const effect={gold:after.gold-before.gold,experience:0,herbs:after.herbs-before.herbs,potions:after.potions-before.potions,rations:after.rations-before.rations,
  materials:Object.fromEntries(MATERIALS.map(k=>[k,after.materials[k]-before.materials[k]])),relics:added('relics'),gear:added('gear'),properties:added('properties')};
 return validEffect(effect)?effect:null;
}
function validSource(source) {
 if(!exact(source,['kind','cellId','slotId','actionId','subjectId'])||!int(source.cellId,0,ROOM_COUNT-1))return false;
 if(['cache','battle','objective'].includes(source.kind))return source.slotId===null&&source.actionId===null&&source.subjectId===null;
 return ['authored','signature'].includes(source.kind)&&text(source.slotId,80)&&text(source.actionId,80)&&source.actionId!=='combat'
  &&(source.kind==='authored'?source.subjectId===null:nullableText(source.subjectId,100));
}
function settlementBelongsToRun(source,m,day,actorId){
 if(['authored','signature'].includes(source.kind))return m.version===2&&m.content?.family===source.kind&&m.content.anchors?.some(a=>a.cellId===source.cellId&&a.slotId===source.slotId)
  &&(source.subjectId===null||m.content.definition?.bosses?.some(b=>b.id===source.subjectId))
  &&Array.isArray(m.contentOutcomes)&&m.contentOutcomes.some(r=>r.slotId===source.slotId&&r.actionId===source.actionId&&r.day===day&&r.actorId===actorId&&(r.bossId||null)===source.subjectId);
 return true;
}
const sourceKey = source => [source.kind,source.cellId,source.slotId||'',source.actionId||'',source.subjectId||''].join(':');
const validSettlement = row => exact(row,['source','day','effect'])&&validSource(row.source)&&int(row.day)&&validEffect(row.effect);

/** Reports existing changes only. Repeated source capture is an accounting no-op. */
function recordSettlement(value,m,source,day,effect) {
 if(!value||!sameExpeditionRun(value.identity,m)||!validSource(source)||!int(day,Math.max(value.start.day,value.settlements.at(-1)?.day||0))||!validEffect(effect)
  )return value;
 if(!m.visited.includes(source.cellId)||!settlementBelongsToRun(source,m,day,value.actorId)||Object.values(effect.materials).every(n=>n===0)&&['gold','experience','herbs','potions','rations'].every(k=>effect[k]===0)&&['gear','relics','properties'].every(k=>effect[k].length===0))return value;
 const existing=value.settlements.find(r=>sourceKey(r.source)===sourceKey(source));
 if(existing)return stable(existing.effect)===stable(effect)&&existing.day===day?value:{...value,settlementsIncomplete:true};
 if(value.settlements.length>=EXPEDITION_SETTLEMENT_LIMIT)return {...value,settlementsIncomplete:true};
 const row={source:{...source},day,effect:{...effect,materials:{...effect.materials},relics:effect.relics.map(r=>({...r})),gear:effect.gear.map(r=>({...r})),properties:effect.properties.map(r=>({...r}))}};
 return {...value,settlements:[...value.settlements,row]};
}

const stable = v => Array.isArray(v)?'['+v.map(stable).join(',')+']':object(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
/** Noncombat effects only. Battle Gold, experience and awardLoot must coalesce. */
export function recordExpeditionSettlement(value,m,source,day,effect) {
 return source?.kind==='battle'?value:recordSettlement(value,m,source,day,effect);
}
/** The only battle capture API: before base rewards through after awardLoot. */
export function recordExpeditionVictory(value,m,cellId,day,before,after,experience) {
 if(!int(experience))return value;
 const effect=expeditionSettlementDelta(before,after);if(!effect)return value;
 return recordSettlement(value,m,{kind:'battle',cellId,slotId:null,actionId:null,subjectId:null},day,{...effect,experience});
}

/** Gross settlement gains/costs are distinct from carried reserve differences. */
export function expeditionVisitTotals(value) {
 const gains={gold:0,herbs:0,potions:0,rations:0,experience:0,materials:zero(MATERIALS),relics:[],gear:[],properties:[]};
 const costs={gold:Object.values(value.fees).reduce((a,b)=>a+b,0),herbs:0,potions:value.used.potions,rations:value.used.rations,materials:zero(MATERIALS)};
 for(const row of value.settlements){const d=row.effect;gains.experience+=d.experience;for(const k of ['gold','herbs','potions','rations'])(d[k]>=0?gains:costs)[k]+=Math.abs(d[k]);
  for(const k of MATERIALS)(d.materials[k]>=0?gains:costs).materials[k]+=Math.abs(d.materials[k]);
  for(const k of ['relics','gear','properties'])gains[k].push(...d[k].map(r=>({...r})));}
 for(const row of value.assists||[])costs.herbs+=row.herbCost;
 return {gains,costs,settlementsComplete:!value.settlementsIncomplete,days:Object.values(value.days).reduce((a,b)=>a+b,0),kitNightsUsed:value.used.kitNights,walkingFocusUsed:value.used.walkFocus,retreats:value.retreats,
  ...(value.assists?{companionFocusUsed:value.assists.reduce((n,row)=>n+row.focusCost,0)}:{})};
}

/** Existing objective evidence is copied for display, never minted or consumed. */
export function expeditionObjectiveSnapshot(s,m) {
 const completed=m.objective&&(s.mazeBook?.contentReceipts||[]).find(r=>r.mazeId===m.id&&r.runId===m.id&&r.runSeed===m.seed&&r.runGeneration===m.generation
  &&r.manifestVersion===1&&r.family===m.content?.family&&r.sourceId===m.sourceId&&r.locationId===m.locationId&&r.method===m.contentFacts?.objectiveMethod);
 return {complete:m.objective,method:completed?.method||null,completionDay:completed?.day??null,completionActorId:completed?.actorId||null,
  battleId:m.proofBattleId||null,captured:m.proofCaptured===true};
}
function validObjective(s,v,id,endDay,m=null) {
 if(!exact(v,OBJECTIVE_KEYS)||typeof v.complete!=='boolean'||!nullableText(v.method,80)||!nullableText(v.battleId)||typeof v.captured!=='boolean'
  ||!(v.completionDay===null||int(v.completionDay,0,endDay))||!(v.completionActorId===null||validActor(s,v.completionActorId)))return false;
 if(!v.complete&&(v.method!==null||v.completionDay!==null||v.completionActorId!==null))return false;
 if(id.mazeVersion===1)return v.method===null&&v.completionDay===null&&v.completionActorId===null;
 if(!v.complete)return true;
 if(!(id.family==='authored'?['copy','public','stewardship']:['care','trade','scheme']).includes(v.method)||v.completionDay===null||v.completionActorId===null)return false;
 const relevant=(s.mazeBook?.contentReceipts||[]).filter(r=>r&&(r.runGeneration===id.runGeneration||r.runSeed===id.runSeed)&&(r.mazeId===id.mazeId||r.family===id.family&&r.sourceId===id.sourceId));
 if(relevant.length&&!(relevant.length===1&&relevant.some(r=>r.runId===id.mazeId&&r.mazeId===id.mazeId&&r.runSeed===id.runSeed&&r.runGeneration===id.runGeneration
  &&r.manifestVersion===id.manifestVersion&&r.family===id.family&&r.sourceId===id.sourceId&&r.locationId===id.locationId
  &&r.method===v.method&&r.day===v.completionDay&&r.actorId===v.completionActorId)))return false;
 // Historical display evidence may outlive both independently bounded stores.
 // Retained evidence, when present, must still agree; absence grants no reward.
 if(m){
  if(!m.objective||m.contentFacts?.objectiveMethod!==v.method)return false;
  const finals=(m.contentOutcomes||[]).filter(r=>r.slotId===m.content?.goalSlotId&&['finish','finish_public','finish_stewardship','care','trade','scheme'].includes(r.actionId));
  if(finals.length)return finals.length===1&&finals[0].day===v.completionDay&&finals[0].actorId===v.completionActorId
   &&finals[0].actionId===(id.family==='authored'?{copy:'finish',public:'finish_public',stewardship:'finish_stewardship'}[v.method]:v.method);
 }
 return true;
}
function validVisit(s,value,m,{now=s.day,requireDayTotal=false,closed=false,validateFieldAssist=null}={}) {
 if(!exact(value,visitKeys(value))||value.version!==1||!/^maze-visit-[1-9]\d*$/.test(value.id)||!int(+value.id.slice(11),1)
  ||!validIdentity(s,value.identity,closed)||m&&!sameExpeditionRun(value.identity,m)||!validActor(s,value.actorId)||!int(value.actorGeneration,value.identity.runGeneration,generation(s))
  ||!nullableText(value.actorName,120)||!['entry','observed'].includes(value.coverage)||!validSnapshot(value.start,now)
  ||!scalarMap(value.days,DAY_KINDS)||!scalarMap(value.used,USE_KINDS)||!scalarMap(value.fees,FEE_KINDS)||!int(value.retreats)
  ||typeof value.settlementsIncomplete!=='boolean'||!Array.isArray(value.settlements)||value.settlements.length>EXPEDITION_SETTLEMENT_LIMIT||!value.settlements.every(validSettlement))return false;
 if(value.coverage==='observed'&&value.days.entry!==0||value.coverage==='entry'&&value.days.entry!==1)return false;
 const days=Object.values(value.days).reduce((a,b)=>a+b,0);
 if(!int(days)||days>now-value.start.day||requireDayTotal&&days!==now-value.start.day)return false;
 if(new Set(value.settlements.map(r=>sourceKey(r.source))).size!==value.settlements.length)return false;
 if(value.settlements.some((r,i)=>r.day<value.start.day||r.day>now||i>0&&r.day<value.settlements[i-1].day||r.effect.gear.some(g=>g.day!==r.day||g.source!==value.identity.locationId)))return false;
 if(value.assists!==undefined&&(typeof validateFieldAssist!=='function'||!Array.isArray(value.assists)||value.assists.length>ROOM_COUNT||new Set(value.assists.map(row=>row?.cellId)).size!==value.assists.length
  ||!value.assists.every((row,i)=>validateFieldAssist(s,row)&&assistBelongs(row,value)&&int(row.day,value.start.day,now)&&(i===0||row.day>=value.assists[i-1].day))))return false;
 if(m){const expected=(m.fieldAssists?.entries||[]).filter(row=>row.visitId===value.id),recorded=value.assists||[];
  if(expected.length!==recorded.length||expected.some(row=>!recorded.some(r=>stable(r)===stable(row))))return false;}
 if(m&&(value.start.explored>m.visited.length||value.start.cleared>m.cleared.length||value.start.steps>m.steps||value.settlements.some(r=>!m.visited.includes(r.source.cellId)||!settlementBelongsToRun(r.source,m,r.day,value.actorId))))return false;
 for(const kind of ['relics','gear','properties']){const items=value.settlements.flatMap(r=>r.effect[kind]);if(new Set(items.map(r=>r.id)).size!==items.length)return false;}
 const totals=expeditionVisitTotals(value);
 return [totals.gains.gold,totals.gains.experience,totals.costs.gold,totals.gains.herbs,totals.costs.herbs,totals.gains.potions,totals.costs.potions,totals.gains.rations,totals.costs.rations,...Object.values(totals.gains.materials),...Object.values(totals.costs.materials)].every(n=>int(n));
}

export function finishExpeditionVisit(value,s,m,reason,rules={}) {
 if(!['stair','defeat','life_end'].includes(reason)||!validVisit(s,value,m,{...rules,requireDayTotal:true}))return null;
 const receipt={...value,end:expeditionEntrySnapshot(s,m),reason,objective:expeditionObjectiveSnapshot(s,m)};
 return validReceipt(s,receipt,m,rules)?structuredClone(receipt):null;
}
function validReceipt(s,row,m=null,rules={}) {
 if(!exact(row,[...visitKeys(row),'end','reason','objective'])||!validSnapshot(row.end,s.day)||!['stair','defeat','life_end'].includes(row.reason))return false;
 const visit=Object.fromEntries(visitKeys(row).map(k=>[k,row[k]]));
 if(!validVisit(s,visit,m,{...rules,now:row.end.day,requireDayTotal:true,closed:true})||row.end.explored<row.start.explored||row.end.cleared<row.start.cleared||row.end.steps<row.start.steps
  ||!validObjective(s,row.objective,row.identity,row.end.day,m))return false;
 return !m||sameExpeditionRun(row.identity,m)&&row.end.explored<=m.visited.length&&row.end.cleared<=m.cleared.length&&row.end.steps<=m.steps&&(!row.objective.complete||m.objective);
}

/** Optional schema: legacy saves remain valid without adding historical claims. */
export function validateExpeditionReceipts(s,rules={}) {
 const b=s.mazeBook,active=s.maze?.expeditionVisit;
 if(b?.records!==undefined&&!Array.isArray(b.records)||b?.contentReceipts!==undefined&&!Array.isArray(b.contentReceipts))return false;
 const archived=(b?.records||[]).some(m=>m.expeditionVisit!==undefined);
 if(b?.nextExpeditionVisit===undefined&&b?.expeditionReceipts===undefined)return active===undefined&&!archived;
 if(!b||!int(b.nextExpeditionVisit,1)||!Array.isArray(b.expeditionReceipts)||b.expeditionReceipts.length>EXPEDITION_RECEIPT_LIMIT||archived)return false;
 const rows=b.expeditionReceipts;
 if(new Set(rows.map(r=>r?.id)).size!==rows.length)return false;
 for(const row of rows){
  const retained=[s.maze,...(b.records||[])].filter(m=>m?.id===row?.identity?.mazeId&&m.generation===row.identity.runGeneration);
  if(retained.some(m=>!sameExpeditionRun(row.identity,m))||!validReceipt(s,row,retained[0],rules)||+row.id.slice(11)>=b.nextExpeditionVisit)return false;
 }
 if(active!==undefined&&(!validVisit(s,active,s.maze,{...rules,requireDayTotal:true})||active.actorId!==actor(s)||active.actorGeneration!==generation(s)
  ||+active.id.slice(11)>=b.nextExpeditionVisit||rows.some(r=>r.id===active.id)))return false;
 return true;
}
