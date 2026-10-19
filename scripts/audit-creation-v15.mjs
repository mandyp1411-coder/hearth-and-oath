// New starts plus the first player-controlled year. These are automated engine checks, not manual browser sessions.
// Run: node scripts/audit-creation-v15.mjs [count=128] [output=docs/creation-v15.json]
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { defaultCreatorDraft, captureCreatorDraft, renderCharacterCreator } from '../dist/js/creator.js';
import { STARTING_ORIGINS, rollLifeCircumstances } from '../dist/js/origins.js';
import { portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { generateCharacter } from '../dist/js/characters.js';
import { seededRoll } from '../dist/js/world.js';
import { validateSave, migrateSave, chooseEventOption, replyMessage, ageUp, continueAgeUp } from '../dist/js/engine.js';

const count=Number(process.argv[2]||128),output=process.argv[3]||'docs/creation-v15.json';
const ages=[0,1,2,3,5,6,9,10,15,16,17,18,27,40,64,65,75,80];
const ancestries=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const results=[],failures=[],began=new Date().toISOString();let transitions=0;
const hashes=new Set(),families=new Set(),jobs=new Set(),birthplaces=new Set(),faces=new Set(),names=new Set();
const digest=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
for(let i=0;i<count;i++) {
  const seed=`new-life-v15-${String(i+1).padStart(3,'0')}`,age=ages[i%ages.length],ancestry=ancestries[Math.floor(i/3)%ancestries.length];
  const originId=STARTING_ORIGINS[Math.floor(i/ages.length)%STARTING_ORIGINS.length].id;
  const d=captureCreatorDraft({startAge:String(age),originId,ancestry},defaultCreatorDraft(seed));
  d.appearance=generateCharacter(seed,'audit-player',{ancestry,age,pronouns:d.pronouns}).appearance;
  const before=JSON.stringify(d),r={seed,origin:originId,startingAge:age,ancestry,status:'running'};
  try {
    let s=await createLifeAtAge(d);assert.equal(JSON.stringify(d),before);assert.ok(validateSave(s));
    assert.equal(s.age,age);assert.equal(s.day,age*365);assert.equal(s.timeline.yearHistory.length,age);
    const fate=rollLifeCircumstances(seed,originId);assert.equal(s.hero.name,fate.name);assert.equal(s.hero.household,fate.household);assert.equal(s.family.setup,fate.familySetup);
    assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))),s);
    const image=renderAvatar({...s.hero,age});assert.equal(image,renderAvatar({...JSON.parse(JSON.stringify(s.hero)),age}));
    const p=portraitLayers({...s.hero,age});assert.match(image,/<img class="portrait-atlas"/);
    if(age<18)assert.equal(p.beard,null);if(age<3){assert.equal(p.hair,null);assert.equal(p.cover,null);assert.equal(p.mask,null);}if(age>=65)assert.equal(p.baseAtlas,'elders');
    const creator=renderCharacterCreator({...d,appearance:s.hero.appearance},1);assert.match(creator,new RegExp(`data-age="${age}"`));
    const originalLikeness=JSON.stringify(s.hero.appearance),initial=digest(s);hashes.add(initial);names.add(s.hero.name);faces.add(`${p.baseAtlas}:${p.base}`);
    families.add(s.family.setup);jobs.add(s.hero.profession);birthplaces.add(s.hero.birthplace);
    Object.assign(r,{openingHash:initial,openingDay:s.day,name:s.hero.name,household:s.hero.household,familySetup:s.family.setup,birthplace:s.hero.birthplace,profession:s.hero.profession,portraitAtlas:p.baseAtlas,portraitCell:p.base,pastYears:s.timeline.yearHistory.length});
    let n=0;const stalled=new Map();
    while(s.age<age+1){
      assert.ok(++n<400,'the first playable year must finish');const original=s,prior=JSON.stringify(s),oldDay=s.day;
      if(s.event){
        const id=s.event.id,key=`${id}:${s.day}`,hits=stalled.get(key)||0;stalled.set(key,hits+1);assert.ok(hits<6,'waiting choice must progress');
        const offered=s.event.choices.filter(c=>!c.disabledReason);
        const preferred=id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):id==='plague_letter'?'later':id==='life_budget'?'simplify':id==='lineage_bereavement'?'share':id==='deadline_review'?'pause':null;
        const c=offered.find(c=>c.id===preferred)||offered[seededRoll(seed,`play:${id}:${s.day}`,offered.length)];s=chooseEventOption(s,c.id);
      }else if(s.conversations.pending){const p=s.conversations.pending;s=replyMessage(s,p.personId,p.replies[0].id);}
      else s=s.timeline.yearTarget!==null?continueAgeUp(s):ageUp(s);
      assert.equal(JSON.stringify(original),prior);assert.ok(s.day>=oldDay);assert.ok(validateSave(s));assert.equal(JSON.stringify(s.hero.appearance),originalLikeness);transitions++;
      if(n%5===0){const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(migrateSave(saved),saved);}
    }
    assert.equal(s.age,age+1);assert.equal(s.day,(age+1)*365);assert.ok(validateSave(s));assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))),s);
    Object.assign(r,{status:'passed',firstYearTransitions:n,finalAge:s.age,finalDay:s.day,finalHash:digest(s)});
  }catch(error){r.status='failed';r.failure=String(error.stack||error);failures.push(r);console.error(`${seed} at ${age}: ${error.message}`);}
  results.push(r);if((i+1)%8===0){writeFileSync(output,JSON.stringify({partial:true,began,checked:results.length,results},null,2)+'\n');console.log(`${i+1}/${count} new starts checked; ${failures.length} failures`);}
}
const report={version:'0.15.0',method:'Automated actual game-engine generation and first subsequent year; no browser playthroughs.',began,finished:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:failures.length,uniqueOpenings:hashes.size,playerTransitions:transitions,coverage:{ages:[...new Set(results.map(r=>r.startingAge))],origins:[...new Set(results.map(r=>r.origin))],ancestries:[...new Set(results.map(r=>r.ancestry))],families:[...families],professions:[...jobs],birthplaces:[...birthplaces],distinctNames:names.size,distinctPortraitCells:faces.size},results};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,uniqueOpenings:report.uniqueOpenings,playerTransitions:transitions,output}));
if(failures.length)process.exitCode=1;
