// Actual seeded game starts and their first subsequent year. No manual browser sessions.
// Run: node scripts/audit-creation-v16.mjs [count=189] [output=docs/creation-v16.json]
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { defaultCreatorDraft, captureCreatorDraft, renderCharacterCreator } from '../dist/js/creator.js';
import { STARTING_ORIGINS, ORIGIN_ANCESTRIES, rollLifeCircumstances, originAllowed } from '../dist/js/origins.js';
import { appearanceAtAge, isCanonicalAppearance, normalizeAppearance, portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { generateCharacter } from '../dist/js/characters.js';
import { seededRoll, resolveBirthplace } from '../dist/js/world.js';
import { validateSave, migrateSave, chooseEventOption, replyMessage, ageUp, continueAgeUp } from '../dist/js/engine.js';

const ages=[0,2,7,14,17,18,40,65,80];
const heritages=['ashlands','sunlands','sable_coast'];
const presentations=['masculine','feminine','androgynous'];
const pronouns={masculine:'he/him',feminine:'she/her',androgynous:'they/them'};
const likenesses=['first','second','third'];
const minimum=STARTING_ORIGINS.length*ages.length;
const requested=Number(process.argv[2]||minimum),count=Math.max(minimum,Number.isSafeInteger(requested)?requested:minimum);
const output=process.argv[3]||'docs/creation-v16.json';
const plans=STARTING_ORIGINS.flatMap((origin,originIndex)=>ages.map((age,ageIndex)=>({
  origin:origin.id,age,ancestry:origin.ancestries[0]||ORIGIN_ANCESTRIES[(originIndex*2+ageIndex)%ORIGIN_ANCESTRIES.length],
  heritage:heritages[ageIndex%heritages.length],presentation:presentations[(Math.floor(ageIndex/3)+originIndex)%presentations.length],
  likeness:likenesses[(ageIndex+originIndex)%likenesses.length],
})));
const results=[],failures=[],began=new Date().toISOString();
let transitions=0,migrationChecks=0,identityChecks=0;
const hashes=new Set(),families=new Set(),jobs=new Set(),birthplaces=new Set(),faces=new Set(),names=new Set(),heritageCoverage=new Set(),presentationCoverage=new Set();
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const sourceHashes=Object.fromEntries(['new-life','origins','creator','avatar','portrait-part-bounds','characters','engine','lineage'].map(name=>[name,digest(readFileSync(new URL(`../dist/js/${name}.js`,import.meta.url),'utf8'))]));
function checkMigration(s){const before=JSON.parse(JSON.stringify(s)),migrated=migrateSave(before);assert.ok(migrated);assert.deepEqual(migrated,s);migrationChecks++;return migrated;}
function checkIdentities(s){
  const people=[s.hero,...s.life.people,...s.companions,...s.lineage.people.filter(p=>p.appearance)];
  for(const person of people){
    if(!person.appearance)continue;
    assert.ok(isCanonicalAppearance(person.appearance),`${person.name}: canonical appearance`);
    const a=normalizeAppearance(person.appearance);
    assert.ok(heritages.includes(a.heritage));assert.ok(presentations.includes(a.portraitPresentation));
    assert.ok(ORIGIN_ANCESTRIES.includes(a.ancestry));identityChecks++;
  }
  // Biological relatives share the family's inherited heritage; unrelated shelter
  // guardians retain their independently drawn identities.
  for(const member of s.family.members.filter(p=>p.biological&&p.personId)){
    const relative=s.life.people.find(p=>p.id===member.personId);
    if(relative){assert.equal(relative.appearance.ancestry,s.hero.appearance.ancestry);assert.equal(relative.appearance.heritage,s.hero.appearance.heritage);}
  }
}
for(let i=0;i<count;i++){
  const plan=plans[i%plans.length],{age,ancestry,heritage,presentation,likeness,origin:originId}=plan;
  const seed=`new-life-v16-${String(i+1).padStart(3,'0')}`;
  const d=captureCreatorDraft({startAge:String(age),originId,ancestry,heritage,presentation,faceVariant:likeness},defaultCreatorDraft(seed));
  const generated=generateCharacter(seed,'audit-player',{ancestry,heritage,age,pronouns:pronouns[presentation]}).appearance;
  d.appearance=appearanceAtAge({...generated,faceVariant:likeness,portraitPresentation:presentation,headgear:'none',facewear:'none'},age);
  const before=JSON.stringify(d),r={seed,origin:originId,startingAge:age,ancestry,heritage,presentation,status:'running'};
  try{
    assert.ok(originAllowed(originId,ancestry));assert.equal(d.originId,originId);
    let s=await createLifeAtAge(d);assert.ok(s);assert.equal(JSON.stringify(d),before);assert.ok(validateSave(s));
    assert.equal(s.age,age);assert.equal(s.day,age*365);assert.equal(s.timeline.yearHistory.length,age);
    const fate=rollLifeCircumstances(seed,originId,ancestry);
    assert.equal(s.hero.lifeOrigin.id,originId);assert.ok(originAllowed(s.hero.lifeOrigin.id,s.hero.appearance.ancestry));
    assert.equal(s.hero.name,fate.name);assert.equal(s.hero.pronouns,pronouns[presentation]);
    assert.equal(s.hero.appearance.ancestry,ancestry);assert.equal(s.hero.appearance.heritage,heritage);assert.equal(s.hero.appearance.portraitPresentation,presentation);
    assert.equal(s.hero.household,fate.household);assert.equal(s.family.setup,fate.familySetup);
    assert.equal(s.hero.birthplace,fate.birthplace);assert.equal(s.hero.birthplaceId,resolveBirthplace(fate.birthplace).locationId);
    assert.equal(s.locationId,s.hero.birthplaceId);assert.equal(s.life.home.locationId,s.hero.birthplaceId);
    const familyLocations=s.family.members.filter(m=>m.personId).map(m=>{const p=s.life.people.find(p=>p.id===m.personId);assert.ok(p);assert.equal(p.locationId,s.hero.birthplaceId);return {name:p.name,relationship:m.relationship,availability:m.availability,alive:p.alive,locationId:p.locationId};});
    if(age===0){assert.ok(s.event.body.includes(fate.originBirthDescription));assert.equal(s.hero.path,'unformed');assert.equal(s.hero.gold,0);assert.equal(s.hero.potions,0);}
    assert.ok(s.journal.some(j=>j.tag==='origin'&&j.text.includes(fate.originBirthDescription)));
    checkMigration(s);checkIdentities(s);
    const image=renderAvatar({...s.hero,age});assert.equal(image,renderAvatar({...JSON.parse(JSON.stringify(s.hero)),age}));assert.match(image,/<img\b[^>]+src=/);
    const p=portraitLayers({...s.hero,age});
    const displayed=appearanceAtAge(s.hero.appearance,age);
    if(age<18){assert.equal(displayed.facialHair,'none');assert.equal(displayed.scar,'none');assert.equal(displayed.tattoo,'none');}
    if(age<3){assert.equal(displayed.headgear,'none');assert.equal(displayed.facewear,'none');assert.equal(displayed.accessory,'none');}
    const creator=renderCharacterCreator({...d,appearance:s.hero.appearance},1);assert.match(creator,new RegExp(`data-age="${age}"`));
    const originalLikeness=JSON.stringify(s.hero.appearance),initial=digest(s);hashes.add(initial);names.add(s.hero.name);
    const portraitKey=p.portraitKey||`${p.baseAtlas}:${p.base}`;faces.add(portraitKey);
    families.add(s.family.setup);jobs.add(s.hero.profession);birthplaces.add(s.hero.birthplace);heritageCoverage.add(heritage);presentationCoverage.add(presentation);
    Object.assign(r,{openingHash:initial,openingDay:s.day,name:s.hero.name,household:s.hero.household,familySetup:s.family.setup,birthplace:s.hero.birthplace,birthplaceLocation:s.hero.birthplaceId,homeLocation:s.life.home.locationId,familyLocations,originBirthDescription:fate.originBirthDescription,community:fate.originCommunity,profession:s.hero.profession,portraitKey,portraitHtmlHash:digest(image),pastYears:s.timeline.yearHistory.length,generatedIdentityCount:s.life.people.filter(p=>p.appearance).length+s.companions.length,recordedChildren:s.lineage.people.filter(p=>p.source==='child').length});
    let n=0;const stalled=new Map();
    while(s.age<age+1){
      assert.ok(++n<400,'the first playable year must finish');const original=s,prior=JSON.stringify(s),oldDay=s.day;
      if(s.event){
        const id=s.event.id,key=`${id}:${s.day}`,hits=stalled.get(key)||0;stalled.set(key,hits+1);assert.ok(hits<6,'waiting choice must progress');
        const offered=s.event.choices.filter(c=>!c.disabledReason);
        const preferred=id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):id==='plague_letter'?'later':id==='life_budget'?'simplify':id==='lineage_bereavement'?'share':id==='deadline_review'?'pause':null;
        const c=offered.find(c=>c.id===preferred)||offered[seededRoll(seed,`play:${id}:${s.day}`,offered.length)];assert.ok(c,'a pending event has a playable choice');s=chooseEventOption(s,c.id);
      }else if(s.conversations.pending){const p=s.conversations.pending;s=replyMessage(s,p.personId,p.replies[0].id);}
      else s=s.timeline.yearTarget!==null?continueAgeUp(s):ageUp(s);
      assert.equal(JSON.stringify(original),prior);assert.ok(s.day>=oldDay);assert.ok(validateSave(s));assert.equal(JSON.stringify(s.hero.appearance),originalLikeness);transitions++;
      if(n%5===0){checkMigration(s);checkIdentities(s);}
    }
    assert.equal(s.age,age+1);assert.equal(s.day,(age+1)*365);assert.ok(validateSave(s));checkMigration(s);checkIdentities(s);
    Object.assign(r,{status:'passed',firstYearTransitions:n,finalAge:s.age,finalDay:s.day,finalHash:digest(s)});
  }catch(error){r.status='failed';r.failure=String(error.stack||error);failures.push(r);console.error(`${seed} (${ancestry}, ${originId}) at ${age}: ${error.message}`);}
  results.push(r);
  if((i+1)%9===0){writeFileSync(output,JSON.stringify({partial:true,version:'0.16.0',began,checked:results.length,sourceHashes,results},null,2)+'\n');console.log(`${i+1}/${count} starts and first subsequent years checked; ${failures.length} failures`);}
}
const report={version:'0.16.0',method:'Automated actual game-engine generation and first subsequent year; no manual browser playthroughs or visual art-quality claims.',began,finished:new Date().toISOString(),sourceHashes,total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:failures.length,uniqueOpenings:hashes.size,playerTransitions:transitions,saveMigrationChecks:migrationChecks,characterIdentityChecks:identityChecks,coverage:{ages:[...new Set(results.map(r=>r.startingAge))],origins:[...new Set(results.map(r=>r.origin))],ancestries:[...new Set(results.map(r=>r.ancestry))],heritages:[...heritageCoverage],presentations:[...presentationCoverage],families:[...families],professions:[...jobs],birthplaces:[...birthplaces],distinctNames:names.size,distinctPortraitSelections:faces.size},results};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,uniqueOpenings:report.uniqueOpenings,playerTransitions:transitions,saveMigrationChecks:migrationChecks,characterIdentityChecks:identityChecks,output}));
if(failures.length)process.exitCode=1;
