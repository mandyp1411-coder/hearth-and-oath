import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LifeRun, engine, ordinaryChoice, fingerprint } from './playtest-utils.mjs';

// Every run starts at birth and uses public decisions, activities and elapsed time.
// Policies are varied deliberately; repeated replays are not counted as lives.
const origins=['village','city','brook','coast','camp','citadel','sanctuary','mountain','tower','marsh','gate','forest'];
const families=['two_parents','single_parent','orphan','homeless'];
const interests=['scholarly','sociable','restless','quiet'];
const priorities={scholarly:/read|study|revise|ask|investigate|learn|notes|listen/i,sociable:/friend|share|invite|company|comfort|mediate|together|help/i,restless:/sneak|prank|follow|explore|climb|night|risk|challenge/i,quiet:/keep|private|watch|quiet|alone|wait|refuse|decline/i};
const summaries=[],records=[],checkpoints=[];
function capture(name,s,view='life') {
  if(checkpoints.some(c=>c.name===name))return;
  checkpoints.push({name,state:structuredClone(s),view});
}
for(let n=0;n<32;n++) {
  const style=interests[n%interests.length];
  const policy=(event,s)=> {
    if(/^(health_|lineage_bereavement|annual_deadline|retirement)/.test(event.id))return ordinaryChoice(event)||event.choices.find(c=>/support|rest|share|settle|pause/.test(c.id))?.id||event.choices[0].id;
    const match=event.choices.find(c=>priorities[style].test(c.label));
    return match?.id||event.choices[n%event.choices.length].id;
  };
  const run=new LifeRun(`v9-${String(n+1).padStart(2,'0')}-${style}`,{seed:`v9-lived-${n}-${style}`,name:`${style} ${n+1}`,birthplace:origins[n%origins.length],familySetup:families[n%families.length],household:['poor','tradesfolk','noble'][n%3],appearance:{ancestry:['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'][n%8]}},policy);
  const originalStep=run.step.bind(run);
  run.step=(operation,fn,detail={})=>{
    if(run.state.event?.id.startsWith('pastime_'))capture('pastime-'+run.state.event.id,run.state);
    if(run.state.event?.id.startsWith('social_'))capture('social-'+run.state.event.id,run.state);
    if(run.state.event?.id.startsWith('birth_')&&run.state.age>=6)capture('childhood-'+run.state.age,run.state);
    return originalStep(operation,s=>{
      const next=fn(s);
      if(!engine.validateSave(next))writeFileSync('.local/v9-invalid.json',JSON.stringify({id:run.id,operation,before:s,next,log:run.log},null,2));
      return next;
    },detail);
  };
  capture('birth',run.state);run.settle();
  function complete() {
    for(let i=0;i<50;i++) {
      run.settle();
      if(run.state.phase==='retired'||!run.state.pastimes?.project)return;
      const a=engine.getActions(run.state).find(a=>a.id==='pastime_continue'&&!a.disabledReason);
      assert.ok(a,run.id+': pastime work has a continuation');run.act(a.id);
    }
    throw new Error('A pastime project did not finish');
  }
  for(const age of [3,6,8,10,12,14,16,18,21,25,30]) {
    complete();run.grow(age,policy).settle();
    if(run.state.phase==='retired')break;
    if(age>=6&&age<18&&!run.state.education.enrolled&&n%4!==3) {
      const school=engine.getActions(run.state).find(a=>a.id.startsWith('school_enroll_')&&!a.disabledReason&&a.cost===0);
      if(school)run.act(school.id).settle();
    }
    const newActions=engine.getActions(run.state).filter(a=>/^(pastime_|social_)/.test(a.id)&&!a.disabledReason&&!/continue|abandon/.test(a.id));
    const ordered=[...newActions].sort((a,b)=>Number(priorities[style].test(b.label))-Number(priorities[style].test(a.label)));
    for(const a of [ordered[0],ordered[(n+age)%Math.max(1,ordered.length)]].filter(Boolean)) {
      if(run.available(a.id)){run.act(a.id);complete();}
    }
    // Deliberately exercise choices that a generic hobby loop could miss.
    const focused=age===8?'pastime_pet':age===10?'pastime_prank':age===12?(n%2?'pastime_skip':'pastime_revision'):age===14?'pastime_night':age===16?'pastime_crush':age===18?'pastime_dinner':age===21?'pastime_performance':null;
    if(focused&&run.available(focused)){run.act(focused);complete();}
    if(age===12&&n<6)capture('map-'+run.state.world.map?.atlas?.topology,run.state,'map');
    if(age===18)capture('social-circle',run.state,'relationships');
    if(run.state.pastimes?.pet)capture('pet-and-interests',run.state,'activities');
  }
  complete();
  if(run.state.phase!=='retired')run.act('retire').choose('settle');
  assert.equal(run.state.phase,'retired');
  const roundTrip=engine.migrateSave(JSON.parse(JSON.stringify(run.state)));
  assert.ok(roundTrip&&engine.validateSave(roundTrip),run.id+': final save imports');
  summaries.push({...run.summary(),style,topology:run.state.world.map?.atlas?.topology,interests:run.state.pastimes?.interests,socialHistory:run.state.social?.history?.length||0});
  records.push({id:run.id,config:run.config,initialHash:run.initialHash,log:run.log,finalHash:fingerprint(run.state)});
}
mkdirSync('docs/playtest',{recursive:true});mkdirSync('.local',{recursive:true});
writeFileSync('docs/playtest/v9-lives.json',JSON.stringify({lives:summaries.length,transitions:records.reduce((n,r)=>n+r.log.length,0),summaries},null,2)+'\n');
writeFileSync('docs/playtest/v9-actions.json.gz',gzipSync(JSON.stringify(records)));
writeFileSync('.local/v9-checkpoints.json',JSON.stringify(checkpoints));
console.log(JSON.stringify({lives:summaries.length,transitions:records.reduce((n,r)=>n+r.log.length,0),pastimeActivities:[...new Set(summaries.flatMap(s=>s.uniqueActions.filter(a=>a.startsWith('pastime_'))))],socialActivities:[...new Set(summaries.flatMap(s=>s.uniqueActions.filter(a=>a.startsWith('social_')).map(a=>a.split('_')[1])))],checkpoints:checkpoints.length}));
