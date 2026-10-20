import test from 'node:test';
import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import {renderTraitSelection} from '../dist/js/personality-ui.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateCharacter} from '../dist/js/characters.js';
import {PORTRAIT_RACES} from '../dist/js/portrait-catalog.js';
import {PORTRAIT_LIBRARY,portraitEntry,effectiveHeritage,modernPortraitFamily} from '../dist/js/portrait-library.js';
import {GROUNDED_PORTRAIT_FAMILIES_V39} from '../dist/js/grounded-portraits-v39.js';
import {portraitLayers} from '../dist/js/avatar.js';
import {HERITAGES,heritageAllowsPortrait} from '../dist/js/heritages.js';
import {culturalName,namingLore,regionalNamingLore} from '../dist/js/names.js';
import {traitPointBudget,traitPoints,traitAttributeBonuses,applyPersonalityBuild,personalityImpactText,personalityView, personalityImpact} from '../dist/js/personality.js';
import {renderPersonalityPanel} from '../dist/js/personality-ui.js';
import {defaultCreatorDraft,captureCreatorDraft,randomizeCreatorDraft,toggleCreatorTrait,rollCreatorName,renderCharacterCreator} from '../dist/js/creator.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {chooseEventOption,chooseAction,choosePersonalityTrait,chooseBattleAction,resolveBattle,validateSave,migrateSave,getActions} from '../dist/js/engine.js';
import {getBattleActions,createBattle} from '../dist/js/combat.js';
let adult;
async function adultLife(){if(!adult){adult=await createLifeAtAge({seed:'v20-nature-hearth-0',originId:'hearthborn',startAge:18,appearance:generateCharacter('v20-nature-hearth-0','hero',{ancestry:'human'}).appearance});for(let i=0;adult.event&&i<16;i++)adult=chooseEventOption(adult,adult.event.choices.find(c=>!c.disabledReason).id);assert.ok(!adult.event);assert.ok(validateSave(adult));}return structuredClone(adult);}

// Combat modifiers also apply to saved fights begun before encounter farming was retired.
// Public natural encounter entry and resolution are covered in activities-feedback-v35.
function savedEncounter(state){const s=structuredClone(state);s.battle=createBattle(s,'free_beast',{kind:'adventure',mode:'roam',token:'roam-0',locationId:s.locationId});s.flags.battlesStarted=(s.flags.battlesStarted||0)+1;s.battle.instanceId=`battle-${s.seed}-${s.flags.battlesStarted}`;s.battle.context={kind:'adventure',mode:'roam',token:'roam-0',locationId:s.locationId};assert.ok(validateSave(s));return s;}

test('the trait budget starts at zero and grows through life without allowing opposing traits',()=>{
  assert.deepEqual([0,2,3,6,10,14,18,30,45,65].map(traitPointBudget),[0,0,1,2,3,4,6,8,10,12]);
  let d=captureCreatorDraft({startAge:18},defaultCreatorDraft('nature-builder'));
  for(const id of ['brave','cautious','honest','curious','stoic'])d=toggleCreatorTrait(d,id);
  assert.deepEqual(d.personalityTraits,['brave','honest','curious']);assert.equal(traitPoints(d.personalityTraits),6);
  d=captureCreatorDraft({startAge:0},d);assert.deepEqual(d.personalityTraits,[]);
  assert.match(renderCharacterCreator(d,1),/Nature develops after infancy/);
  assert.equal((renderTraitSelection([],0).match(/data-op="creator-trait"[^>]+ disabled/g)||[]).length,20);
});

test('an entered name persists through fate rolls, ancestry changes, and the actual past simulation',async()=>{
  let d=captureCreatorDraft({name:'Aster <the Wanderer>',ancestry:'elf',startAge:18},defaultCreatorDraft('my-own-name'));
  d=randomizeCreatorDraft(d);assert.equal(d.name,'Aster <the Wanderer>');
  d=captureCreatorDraft({ancestry:'orc'},d);assert.equal(d.name,'Aster <the Wanderer>');
  assert.match(renderCharacterCreator(d),/value="Aster &lt;the Wanderer&gt;"/);
  d=toggleCreatorTrait(d,'brave');d=toggleCreatorTrait(d,'curious');
  const s=await createLifeAtAge(d);assert.equal(s.hero.name,d.name);assert.deepEqual(s.hero.personality.traits,d.personalityTraits);assert.ok(validateSave(s));
  const rolled=rollCreatorName(d);assert.equal(rolled.nameChoice,'fate');assert.notEqual(rolled.name,d.name);assert.match(renderCharacterCreator(rolled),/name="name"/);
});

test('all ancestry and heritage naming traditions have distinct, persistent cultural identities',()=>{
  const pools=new Map();
  for(const h of HERITAGES){const names=new Set();for(let i=0;i<80;i++){const p=generateCharacter('names-'+i,'resident',{ancestry:h.ancestry,heritage:h.id});assert.equal(p.naming.ancestry,h.ancestry);assert.equal(p.naming.heritage,h.id);assert.equal(p.name,p.naming.name);assert.ok(p.name.length<=40);assert.ok(namingLore(h.ancestry,h.id).lore.length>40);assert.deepEqual(p.naming,culturalName('names-'+i,'resident',p));names.add(p.name);}assert.ok(names.size>70,`${h.ancestry}/${h.id}`);pools.set(`${h.ancestry}:${h.id}`,names);}
  for(const race of PORTRAIT_RACES){const racePools=[...pools].filter(([key])=>key.startsWith(race+':'));for(let i=1;i<racePools.length;i++)assert.notDeepEqual([...racePools[0][1]],[...racePools[i][1]]);}
  for(const id of ['rainward','saltreach','highstone','blackgrove','ashplain','bellwater'])assert.ok(regionalNamingLore(id).cultureRule.length>80);
});

test('new NPCs keep their observed complexion, hair family, coat and species throughout every age stage',()=>{
  let checked=0;
  for(const h of HERITAGES)for(const pronouns of ['he/him','she/her','they/them'])for(let i=0;i<8;i++){
    const p=generateCharacter(`aging:${i}`,`resident:${h.id}`,{ancestry:h.ancestry,heritage:h.id,pronouns,age:0}),a=p.appearance;
    assert.equal(Object.keys(a.portraitSelections||{}).length,7,`${h.ancestry}/${h.id}/${pronouns}`);
    const anchor=portraitEntry(a.portraitSelections.adult);assert.notEqual(anchor.hairTone,'grey','age 18 cannot introduce grey adult hair into a childhood identity');assert.equal(effectiveHeritage(p).id,h.id);
    for(const age of [0,3,10,18,40,55,65]){const current=portraitLayers(p,{age}).preset;assert.equal(current.ancestry,anchor.ancestry);assert.equal(current.presentation,anchor.presentation);
      if(['human','elf'].includes(anchor.ancestry))assert.equal(current.complexion,anchor.complexion);
      if(anchor.ancestry==='beastfolk'){assert.equal(current.morphology,anchor.morphology);assert.equal(current.furTone,anchor.furTone);if(anchor.morphology==='other')assert.equal(current.speciesFamily,anchor.speciesFamily);}
      if(['dark','light'].includes(anchor.hairTone)&&!(current.hairTone===anchor.hairTone||['covered','bald','uncertain'].includes(current.hairTone)||age>=40&&current.hairTone==='grey')){
        assert.ok(age>=40&&age<65,`${current.key} vs ${anchor.key}`);
        const family=modernPortraitFamily(a);assert.equal(current.key,family.selections[age<55?'mature':'older']);
        const sameHair=GROUNDED_PORTRAIT_FAMILIES_V39.filter(f=>f.ancestry===anchor.ancestry&&f.presentation===anchor.presentation&&heritageAllowsPortrait(h,f)&&f.hairTone===anchor.hairTone
          && (anchor.ancestry!=='beastfolk'||f.morphology===anchor.morphology&&f.furTone===anchor.furTone&&(anchor.morphology!=='other'||f.speciesFamily===anchor.speciesFamily)));
        assert.equal(sameHair.length,0,'A compatible painted hair family is preferred whenever it exists.');
      }
      checked++;
    }
    assert.deepEqual(generateCharacter(`aging:${i}`,`resident:${h.id}`,{ancestry:h.ancestry,heritage:h.id,pronouns,age:0}),p);
  }
  assert.equal(checked,4536);
});

// On a new-edition life a nature is a trade-off; the attribute points a trait
// once bought belong to older saves. These two tests play an older life.
const olderLife=async()=>{const s=structuredClone(await adultLife());delete s.householdBudget.debt;delete s.householdBudget.borrowedGold;delete s.householdBudget.debtInterestPaid;delete s.householdBudget.lastInterestYear;delete s.householdBudget.graceUsed;delete s.hero.station;assert.ok(validateSave(s));return s;};
test('trait attribute gains are real, are applied once, and survive an export and reload',async()=>{
  let s=await olderLife(),base=structuredClone(s.hero.attributes);s=choosePersonalityTrait(s,'brave');s=choosePersonalityTrait(s,'curious');
  const bonus=traitAttributeBonuses(['brave','curious']);for(const [key,v] of Object.entries(base))assert.equal(s.hero.attributes[key],v+(bonus[key]||0));
  const duplicate=choosePersonalityTrait(s,'brave');assert.deepEqual(duplicate.hero.attributes,s.hero.attributes);assert.equal(duplicate.hero.personality.traits.length,2);
  const opposing=choosePersonalityTrait(s,'cautious');assert.deepEqual(opposing.hero,s.hero);
  assert.equal(applyPersonalityBuild(s,['brave','curious']),true);assert.deepEqual(s.hero.attributes,duplicate.hero.attributes);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))),s);assert.ok(validateSave(s));assert.match(renderPersonalityPanel(s),/Brave/);
});

test('a real theft conflicts with compassionate honesty; failed commands do not add stress',async()=>{
  let s=await adultLife();s=choosePersonalityTrait(s,'honest');s=choosePersonalityTrait(s,'compassionate');
  assert.ok(getActions(s).find(a=>a.id==='justice_steal'&&!a.disabledReason));
  const neutral=structuredClone(s);delete neutral.hero.personality;
  const ordinary=chooseAction(neutral,'justice_steal'),actual=chooseAction(s,'justice_steal');
  assert.equal(actual.life.stress,Math.min(100,ordinary.life.stress+12));assert.equal(actual.hero.personality.history.at(-1).delta,12);assert.ok(validateSave(actual));
  const failed=chooseAction(s,'unknown_activity');assert.equal(failed.life.stress,s.life.stress);assert.deepEqual(failed.hero.personality,s.hero.personality);
  const forbidden=choosePersonalityTrait(actual,'curious');assert.equal(forbidden.hero.personality.traits.includes('curious'),false);
});

test('a brave retreat causes stress once, without charging again at combat settlement or replay',async()=>{
  let s=await adultLife();s=choosePersonalityTrait(s,'brave');s=savedEncounter(s);assert.ok(s.battle);
  assert.equal(s.battle.currentActorId,'hero');assert.ok(getBattleActions(s.battle).some(a=>a.id==='retreat'));
  const before=s.life.stress,next=chooseBattleAction(s,'retreat');assert.equal(next.life.stress,Math.min(100,before+6));assert.equal(next.hero.personality.history.length,1);
  const finished=resolveBattle(next,next.battle);assert.equal(finished.hero.personality.history.length,1);assert.ok(validateSave(finished));
  assert.equal(resolveBattle(finished,next.battle).hero.personality.history.length,1);
  assert.match(personalityImpactText(s,{kind:'battle',id:'retreat'}),/Brave.*6 stress/);
});

test('legacy names, portraits and decision IDs remain while retired prose migrates only once',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url)));
  for(const old of Object.values(fixture.states)){const s=migrateSave(old);assert.ok(s);assert.equal(s.hero.name,old.hero.name);assert.deepEqual(s.hero.appearance,old.hero.appearance);if(old.event){assert.equal(s.event.id,old.event.id);assertCapturedMigration(old.event,s.event,'state.event');assert.deepEqual(migrateSave(s).event,s.event);}else assert.equal(s.event,old.event);assert.equal(s.day,old.day);assert.equal(s.hero.gold,old.hero.gold);assert.deepEqual(s.battle,old.battle);assert.equal(s.hero.personality,undefined);}
});

test('the 448 new native portraits are reachable and carry observed color metadata',()=>{
  const added=PORTRAIT_LIBRARY.filter(p=>/^(?:beastfolk-(?:adolescent|child|elder|infant)-identity-00|beastfolk-lifecycle-bridge-00|(?:human|elf)-light-lifecycle-00):/.test(p.key)&&!['mature','older'].includes(p.stage));assert.equal(added.length,448);assert.equal(new Set(added.map(p=>p.key)).size,448);
  for(const race of ['human','elf'])for(const stage of ['infant','child','adolescent','adult'])for(const presentation of ['masculine','feminine','androgynous'])for(const complexion of ['medium','deep'])assert.ok(added.some(p=>p.ancestry===race&&p.stage===stage&&p.presentation===presentation&&p.complexion===complexion&&p.hairTone==='light'));
});

test('a remembered grievance makes forgiveness and vengeance playable, with a lasting yearly record',async()=>{
  let s=choosePersonalityTrait(await adultLife(),'vengeful');
  s=chooseAction(s,'nature_reckoning');assert.equal(s.event?.id,'nature_slight');assert.ok(validateSave(s));
  const reload=migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reload,s);
  const neutral=structuredClone(s);neutral.hero.personality.traits=[];neutral.hero.personality.applied=[];
  const baseline=chooseEventOption(neutral,'forgive'),chosen=chooseEventOption(s,'forgive');
  assert.equal(chosen.life.stress,Math.min(100,baseline.life.stress+6));assert.equal(chosen.hero.personality.reflection,null);assert.ok(validateSave(chosen));
  assert.ok(!getActions(chosen).some(a=>a.id==='nature_reckoning'));
  assert.equal(chooseEventOption(chosen,'forgive').hero.personality.history.length,chosen.hero.personality.history.length);
});

test('a trait strength bonus changes actual battle damage and invalid targets cannot change composure',async()=>{
  const plain=await olderLife(),brave=choosePersonalityTrait(choosePersonalityTrait(plain,'brave'),'vengeful');
  const a=savedEncounter(plain),b=savedEncounter(brave);
  const target=a.battle.actors.find(p=>p.side==='enemy').id;
  const afterA=chooseBattleAction(a,'attack',target),afterB=chooseBattleAction(b,'attack',target);
  assert.notDeepEqual(afterB.battle.log,afterA.battle.log);assert.ok(afterB.battle.actors.find(p=>p.id===target).hp<=afterA.battle.actors.find(p=>p.id===target).hp);assert.equal(b.battle.actors.find(p=>p.id==='hero').attributes.strength,a.battle.actors.find(p=>p.id==='hero').attributes.strength+2);
  const failed=chooseBattleAction(b,'inspect','missing-enemy');assert.deepEqual(failed.hero.personality,b.hero.personality);assert.equal(failed.life.stress,b.life.stress);
});

test('repeated inspection cannot farm personality relief during the same encounter',async()=>{
  let s=choosePersonalityTrait(await adultLife(),'curious');s=savedEncounter(s);
  const target=s.battle.actors.find(p=>p.side==='enemy').id;
  const first=chooseBattleAction(s,'inspect',target),second=chooseBattleAction(first,'inspect',target);
  assert.equal(first.hero.personality.cooldowns['curious:learn'],s.day);
  assert.equal(second.life.stress,first.life.stress);assert.deepEqual(second.hero.personality.history,first.hero.personality.history);assert.ok(validateSave(second));
});


test('core coercion, predatory feeding, and reckless travel also conflict with a selected nature',async()=>{
  let s=choosePersonalityTrait(await adultLife(),'compassionate');s=choosePersonalityTrait(s,'generous');s=choosePersonalityTrait(s,'cautious');
  for(const eventId of ['stories_chapter','life_hunger','vampire_feeding','travel_messenger']){const id=eventId==='stories_chapter'?'coercion':eventId==='travel_messenger'?'extort':'predation';assert.equal(personalityImpact(s,{kind:'choice',eventId,id}).delta,12,eventId);}
  assert.equal(personalityImpact(s,{kind:'choice',eventId:'travel_weather',id:'press'}).delta,6);
  assert.equal(personalityImpact(s,{kind:'choice',eventId:'stories_chapter',id:'care'}).delta,-4);
});
