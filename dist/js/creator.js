import { pronounDisplayLabel } from './identity-labels.js';
import { culturalName, namingLore } from './names.js';
import { normalizePersonalityTraits, personalityTrait, traitPointBudget, traitPoints } from './personality.js';
import { renderTraitPicker } from './personality-ui.js';
import { STARTING_ATTRIBUTES, ATTRIBUTE_LABELS, attributePointBudget, normalizeAttributePoints, attributePointsSpent, completeAttributePoints } from './starting-attributes.js';
import { AVATAR_OPTIONS, normalizeAppearance, renderAvatar } from './avatar.js';
import { generateCharacter as generateCharacterBase } from './characters.js';
import { MAX_START_AGE, availableOrigins, originAllowed, originById, normalizeStartAge, rollLifeCircumstances, startingAgeDescription } from './origins.js';
import { availableHeritages, heritageById } from './heritages.js';
import { effectiveHeritage, assignHeritage, selectPortrait, availablePortraits, portraitContext, PORTRAIT_STAGES } from './portrait-library.js';
const generateCharacter=(seed,id,options={})=>{
  const person=generateCharacterBase(seed,id,options);
  return {...person,appearance:assignHeritage(person.appearance,person.appearance.heritage,`${seed}:person:${id}`,{preferModern:true,archetype:person.character?.archetype})};
};

const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const freshSeed=()=>`unwritten-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
export const CREATOR_LOCKS=Object.freeze({ancestry:'Ancestry',pronouns:'Pronouns',heritage:'Heritage',origin:'Origin',portrait:'Portrait',fate:'Family & fortune'});
const validRace=value=>AVATAR_OPTIONS.find(f=>f.key==='ancestry').options.some(o=>o.value===value);
const namePresentation=pronouns=>({'he/him':'masculine','she/her':'feminine','they/them':'neutral'})[pronouns]||'neutral';
export const creatorStepTitles=Object.freeze(['Beginning','Nature & Abilities','Review']);

export function defaultCreatorDraft(seed='silver-fern') {
  const person=generateCharacter(seed,'creator',{age:18});
  const fate=rollLifeCircumstances(seed,'random',person.appearance.ancestry);
  const original=generateCharacter(fate.seed,'creator',{age:18,ancestry:person.appearance.ancestry,pronouns:fate.pronouns}).appearance;
  const appearance=assignHeritage(original,effectiveHeritage(original).id,seed+':heritage');
  return {...fate,name:culturalName(seed,'new-life:name',{appearance,pronouns:fate.pronouns,presentation:namePresentation(fate.pronouns)}).name,nameChoice:'fate',nameRoll:0,portraitChoice:'fate',personalityTraits:[],attributePoints:normalizeAttributePoints({},18),originId:'random',startAge:18,lifeMode:'standard',ancestryChoice:'fate',identityChoice:'fate',heritageChoice:'fate',portraitLocks:[],creatorLocks:[],appearance};
}
export function normalizeCreatorDraft(value) {
  const source=value&&typeof value==='object'?value:{},base=defaultCreatorDraft(source.seed);
  let appearance=normalizeAppearance(source.appearance??base.appearance);
  const originId=source.originId==='random'||originAllowed(source.originId,appearance.ancestry)?source.originId:'random';
  const fate=rollLifeCircumstances(base.seed,originId,appearance.ancestry),startAge=normalizeStartAge(source.startAge);
  const identityChoice=['he/him','she/her','they/them'].includes(source.identityChoice)?source.identityChoice:'fate';
  const pronouns=identityChoice==='fate'?(['he/him','she/her','they/them'].includes(source.pronouns)?source.pronouns:fate.pronouns):identityChoice;
  const heritageChoice=heritageById(source.heritageChoice,appearance.ancestry)?source.heritageChoice:'fate';
  const heritage=heritageById(heritageChoice,appearance.ancestry)||effectiveHeritage(appearance);
  if(appearance.heritageVersion!==1||appearance.heritage!==heritage.id)appearance=normalizeAppearance(assignHeritage(appearance,heritage.id,base.seed+':heritage'));
  const nameChoice=source.nameChoice==='custom'?'custom':'fate',nameRoll=Math.max(0,Math.min(1000000,Math.floor(Number(source.nameRoll)||0))),rolledName=culturalName(base.seed,nameRoll?`new-life:name:roll-${nameRoll}`:'new-life:name',{appearance,pronouns,presentation:namePresentation(pronouns)}).name;
  const name=nameChoice==='custom'&&typeof source.name==='string'&&source.name.trim()?source.name.trim().slice(0,40):rolledName;
  return {...fate,name,nameChoice,nameRoll,portraitChoice:source.portraitChoice==='chosen'?'chosen':'fate',personalityTraits:normalizePersonalityTraits(source.personalityTraits,startAge).slice(0,3),attributePoints:normalizeAttributePoints(source.attributePoints,startAge),originId,startAge,lifeMode:source.lifeMode==='ironman'?'ironman':'standard',pronouns,ancestryChoice:validRace(source.ancestryChoice)?source.ancestryChoice:'fate',identityChoice,heritageChoice,portraitLocks:[],creatorLocks:[...new Set((Array.isArray(source.creatorLocks)?source.creatorLocks:[]).filter(k=>Object.hasOwn(CREATOR_LOCKS,k)))],appearance};
}
/** Fate keeps gifts and circumstances; the gallery chooses whole illustrations. */
export function captureCreatorDraft(form, previous) {
  const base=normalizeCreatorDraft(previous);let data;
  if(form&&typeof form.get==='function')data=form;
  else if(form&&typeof form==='object'&&!form.tagName&&!form.elements)data={get:key=>form[key]??null};
  else {try{data=new FormData(form);}catch{return base;}}
  const read=(key,fallback)=>{const v=data.get(key);return typeof v==='string'?v:fallback;};
  const ancestryChoice=read('ancestry',base.ancestryChoice),identityChoice=read('identity',base.identityChoice);
  const ancestry=validRace(ancestryChoice)?ancestryChoice:base.appearance.ancestry;
  const requestedOrigin=read('originId',base.originId),resetRestricted=ancestryChoice==='fate'&&base.ancestryChoice!=='fate'&&originById(requestedOrigin)?.ancestries.length;
  const originId=!resetRestricted&&(requestedOrigin==='random'||originAllowed(requestedOrigin,ancestry))?requestedOrigin:'random';
  const stableFate=ancestry===base.appearance.ancestry&&originId===base.originId&&base.identityChoice==='fate';
  const pronouns=['he/him','she/her','they/them'].includes(identityChoice)?identityChoice:stableFate?base.pronouns:rollLifeCircumstances(base.seed,originId,ancestry).pronouns;
  const changed=ancestry!==base.appearance.ancestry;
  const appearance=changed?generateCharacter(base.seed,'creator',{ancestry,pronouns,age:base.startAge}).appearance:base.appearance;
  const creatorLocks=new Set(base.creatorLocks);for(const [key,prior,next] of [['ancestry',base.ancestryChoice,ancestryChoice],['pronouns',base.identityChoice,identityChoice],['heritage',base.heritageChoice,read('heritageChoice',base.heritageChoice)]])if(prior!==next){if(next==='fate')creatorLocks.delete(key);else creatorLocks.add(key);}
  const entered=read('name',base.name),nameChoice=entered.trim()&&entered!==base.name?'custom':base.nameChoice;
  return normalizeCreatorDraft({...base,name:entered,nameChoice,creatorLocks:[...creatorLocks],originId,startAge:data.get('startAge')??base.startAge,lifeMode:read('lifeMode',base.lifeMode),ancestryChoice,identityChoice,heritageChoice:read('heritageChoice',base.heritageChoice),pronouns,appearance});
}
export function randomizeCreatorDraft(previous) {
  const base=normalizeCreatorDraft(previous),locked=new Set(base.creatorLocks);
  if(Object.keys(CREATOR_LOCKS).every(k=>locked.has(k)))return base;
  const roll=freshSeed(),seed=locked.has('fate')?base.seed:roll;
  // A locked dependent choice keeps its ancestry compatible; a locked family
  // keeps its origin because the household is generated from that origin.
  const keepRace=locked.has('ancestry')||locked.has('heritage')||locked.has('origin')||locked.has('portrait')||locked.has('fate');
  const ancestry=keepRace?base.appearance.ancestry:generateCharacter(roll,'creator').appearance.ancestry;
  const originId=locked.has('origin')||locked.has('fate')?base.originId:'random';
  const fate=rollLifeCircumstances(seed,originId,ancestry),pronouns=locked.has('pronouns')?base.pronouns:rollLifeCircumstances(roll,originId,ancestry).pronouns;
  let appearance=locked.has('portrait')?base.appearance:generateCharacter(roll,'creator',{ancestry,pronouns,age:base.startAge,heritage:locked.has('heritage')?effectiveHeritage(base.appearance).id:undefined}).appearance;
  if(locked.has('heritage')&&effectiveHeritage(appearance).id!==effectiveHeritage(base.appearance).id)appearance=assignHeritage(appearance,effectiveHeritage(base.appearance).id,roll);
  return normalizeCreatorDraft({...base,...fate,seed,name:base.name,nameChoice:base.nameChoice,nameRoll:0,originId,ancestryChoice:locked.has('ancestry')?base.ancestryChoice:'fate',identityChoice:locked.has('pronouns')?base.identityChoice:'fate',heritageChoice:locked.has('heritage')?base.heritageChoice:'fate',portraitChoice:locked.has('portrait')?base.portraitChoice:'fate',pronouns,appearance});
}
export function randomizeCreatorPortrait(previous){
 const d=normalizeCreatorDraft(previous),rows=availablePortraits(d,d.startAge),current=portraitContext(d,d.startAge),key=d.appearance.portraitSelections?.[current.stage],other=rows.filter(p=>p.key!==key),choices=other.length?other:rows;
 if(!choices.length)return d;
 return selectCreatorPortrait(d,choices[Math.floor(Math.random()*choices.length)].key);
}
export function toggleCreatorLock(previous,key){const d=normalizeCreatorDraft(previous);if(!Object.hasOwn(CREATOR_LOCKS,key))return d;return {...d,creatorLocks:d.creatorLocks.includes(key)?d.creatorLocks.filter(k=>k!==key):[...d.creatorLocks,key]};}
export function creatorDependencyChanges(before,after){
 const changes=[];
 if(before.appearance.ancestry!==after.appearance.ancestry){
  changes.push('Portrait and available heritages now follow '+ancestryLabel(after.appearance.ancestry)+'.');
  if(before.heritageChoice!==after.heritageChoice)changes.push('The former heritage is unavailable; heritage returns to fate.');
  if(before.originId!==after.originId)changes.push((originById(before.originId)?.label||'The former origin')+' is unavailable; origin returns to fate.');
 }
 if(before.startAge!==after.startAge){
  const removed=before.personalityTraits.filter(id=>!after.personalityTraits.includes(id));
  if(removed.length)changes.push('Traits removed for this age: '+removed.map(id=>personalityTrait(id)?.name).join(', ')+'.');
  if(attributePointsSpent(before.attributePoints)!==attributePointsSpent(after.attributePoints))changes.push('Assigned bonuses were reduced to fit the '+attributePointBudget(after.startAge)+' point age budget.');
  if(portraitContext(before,before.startAge).stage!==portraitContext(after,after.startAge).stage)changes.push('The portrait now shows the selected age stage. Choices for other stages remain saved.');
 }
 return changes;
}
export function selectCreatorPortrait(previous,key) {
  const d=normalizeCreatorDraft(previous),appearance=selectPortrait(d.appearance,key,{age:d.startAge,identity:d.seed});
  return appearance?normalizeCreatorDraft({...d,appearance,portraitChoice:'chosen'}):d;
}
export function selectCreatorHeritage(previous,id) {
  const d=normalizeCreatorDraft(previous);return heritageById(id,d.appearance.ancestry)?normalizeCreatorDraft({...d,heritageChoice:id,creatorLocks:[...new Set([...d.creatorLocks,'heritage'])]}):d;
}

export function rollCreatorName(previous){const d=normalizeCreatorDraft(previous);return normalizeCreatorDraft({...d,nameChoice:'fate',nameRoll:d.nameRoll+1});}
export function toggleCreatorTrait(previous,id){const d=normalizeCreatorDraft(previous),t=personalityTrait(id);if(!t)return d;const ids=d.personalityTraits;if(ids.includes(id))return normalizeCreatorDraft({...d,personalityTraits:ids.filter(k=>k!==id)});if(ids.length>=3||ids.includes(t.opposite)||traitPoints(ids)+t.cost>traitPointBudget(d.startAge))return d;return normalizeCreatorDraft({...d,personalityTraits:[...ids,id]});}
export function adjustCreatorAttribute(previous,key,delta){const d=normalizeCreatorDraft(previous);if(!STARTING_ATTRIBUTES.includes(key)||![1,-1].includes(delta))return d;const n=d.attributePoints[key]+delta;if(n<0||n>6||delta>0&&attributePointsSpent(d.attributePoints)>=attributePointBudget(d.startAge))return d;return {...d,attributePoints:{...d.attributePoints,[key]:n}};}
export function selectCreatorOrigin(previous,id){const d=normalizeCreatorDraft(previous);if(id!=='random'&&(d.ancestryChoice==='fate'||!availableOrigins(d.appearance.ancestry).some(o=>o.id===id)))return d;return normalizeCreatorDraft({...d,originId:id,creatorLocks:id==='random'?d.creatorLocks.filter(k=>k!=='origin'):[...new Set([...d.creatorLocks,'origin'])]});}

function op(label,command,id='',className='secondary',disabled=false){return `<button type="button" class="button ${className}" data-op="${command}" data-id="${e(id)}"${disabled?' disabled':''}>${label}</button>`;}
function ancestryLabel(value){return AVATAR_OPTIONS.find(field=>field.key==='ancestry').options.find(option=>option.value===value)?.label??'Human';}
export function renderCreatorOriginOptions(value) {
  const d=normalizeCreatorDraft(value),rows=[{id:'random',label:'Cast by Fate',sigil:'✦',description:d.ancestryChoice==='fate'?'Let fate choose your ancestry and its beginning. Choose an ancestry above to select one of its stories.':'Begin with an unexpected story among your people.'},...(d.ancestryChoice==='fate'?[]:availableOrigins(d.appearance.ancestry))];
  return `<input type="hidden" name="originId" value="${e(d.originId)}">`+rows.map((o,index)=>`<button type="button" class="creator-origin${d.originId===o.id?' is-selected':''}" data-op="creator-origin" data-id="${o.id}" aria-label="${index+1}. ${e(o.label)}" aria-pressed="${d.originId===o.id}"><span class="origin-sigil" aria-hidden="true">${index+1}</span><span><strong>${e(o.label)}</strong><small>${e(d.startAge===0?(o.birthDescription??o.description):o.description)}</small>${o.communityName?`<small class="origin-community">${e(o.communityName)}</small>`:''}</span></button>`).join('');
}
export function renderCreatorPortraitControls(value) {
  const d=normalizeCreatorDraft(value);
  const budget=attributePointBudget(d.startAge),spent=attributePointsSpent(d.attributePoints);
  return `${renderTraitPicker(d.personalityTraits,d.startAge)}<section class="attribute-allocation" aria-label="Starting ability points"><div class="section-heading"><h3>Attribute Points</h3><span class="badge" data-attribute-points>${budget-spent} / ${budget} available</span></div><p>Assign points to Strength, Agility, Vitality, Intellect, Willpower and Presence. More points are available when you begin at an older age. Any points you leave unspent are distributed by fate when you enter this life.</p><div class="attribute-buy-list">${STARTING_ATTRIBUTES.map(key=>`<div class="attribute-buy-row"><span><strong>${ATTRIBUTE_LABELS[key]}</strong><small>${{strength:'Weapon power and physical work',agility:'Initiative, stealth and movement',vitality:'Health and endurance',intellect:'Magic, study and craft',willpower:'Resolve and spiritual practice',presence:'Persuasion and leadership'}[key]}</small></span><button type="button" class="button ghost small" data-op="creator-attribute" data-id="${key}:-1" aria-label="Remove one ${ATTRIBUTE_LABELS[key]} point" aria-describedby="attribute-limit-${key}" ${d.attributePoints[key]?'':'disabled'}>−</button><output aria-label="${ATTRIBUTE_LABELS[key]} bonus">+${d.attributePoints[key]}</output><button type="button" class="button secondary small" data-op="creator-attribute" data-id="${key}:1" aria-label="Add one ${ATTRIBUTE_LABELS[key]} point" aria-describedby="attribute-limit-${key}" ${spent>=budget||d.attributePoints[key]>=6?'disabled':''}>+</button><small class="attribute-limit" id="attribute-limit-${key}">${d.attributePoints[key]>=6?'Maximum six assigned points.':spent>=budget?(d.startAge<3?'Assigned points begin at age 3.':'No points remain in this age budget.'):'You can add a point.'}${d.attributePoints[key]?'':' No assigned point to remove.'}</small></div>`).join('')}</div><p class="small-copy">${d.startAge<3?'A newborn begins without assigned bonuses.':'These bonuses add to the abilities earned in your earlier years. Each attribute can receive up to six assigned points. Shown bonuses are assigned additions, not the final totals from your lived history.'}</p></section>`;
}
// This is a new-life draft choice only. Prehistory is generated under Standard
// rules; the app attaches secure metadata at the guarded first-save boundary.
function renderLifeMode(d) {
  return `<section class="creator-life-mode" aria-labelledby="life-mode-label"><label class="field" for="life-mode"><span class="field-label" id="life-mode-label">Life mode</span><select id="life-mode" name="lifeMode"><option value="standard"${d.lifeMode==='standard'?' selected':''}>Standard</option><option value="ironman"${d.lifeMode==='ironman'?' selected':''}>Ironman (combat permadeath)</option></select></label>${d.lifeMode==='ironman'?'<p>Combat death ends this life. Party deaths are permanent.</p>':'<p class="small-copy">Standard keeps the usual save and recovery options.</p>'}</section>`;
}
export function renderCharacterCreator(value, requestedStep=0, {notice='',canUndo=false,error='',busy=false,slotSummary=''}={}) {
  const d=normalizeCreatorDraft(value),step=Math.max(0,Math.min(2,Number(requestedStep)||0));
  const portrait=renderAvatar({id:'creator',name:d.name,pronouns:d.pronouns,appearance:d.appearance},{size:'hero',age:d.startAge});
  const races=AVATAR_OPTIONS.find(field=>field.key==='ancestry').options;
  const heritage=effectiveHeritage(d.appearance),heritages=availableHeritages(d.appearance.ancestry);
  return `<section class="creator-screen" aria-label="Create a new life"><div class="creator-topline"><div class="creator-history-controls"><button type="button" class="button ghost creator-undo" data-op="creator-undo" aria-label="Undo last change" title="Undo last change"${!canUndo||busy?' disabled':''}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${op('‹ Title screen','title-menu','','ghost small',busy)}</div><span class="eyebrow">HEARTH &amp; OATH · A NEW LIFE</span>${op('Settings','creator-settings','','ghost small',busy)}</div><nav class="creator-steps" aria-label="Character creation steps">${creatorStepTitles.map((label,i)=>`<button type="button" class="creator-step${i===step?' is-current':''}" data-op="creator-step" data-id="${i}"${i===step?' aria-current="step"':''}${busy?' disabled':''}><span>${i+1}. ${e(label)}</span><span class="sr-only">${i===step?', current step':i<step?', completed step':''}</span></button>`).join('')}</nav><p class="sr-only" data-creator-notice role="status" aria-live="polite"${notice?'':' hidden'}>${e(notice)}</p><p class="creator-error" data-creator-error role="alert"${error?'':' hidden'}>${e(error)}</p><p data-creation-progress role="status" aria-live="polite">${busy?'Drawing your life. Please wait.':'Draft only · nothing is saved until Begin This Life.'}</p><form id="character-form" data-creator-step="${step}"${busy?' aria-busy="true" inert':''}><div class="creator-workspace"><aside class="creator-portrait"><div class="creator-portrait-stage portrait-stage" data-avatar-preview>${portrait}</div><div class="creator-plate-caption"><span class="eyebrow">A FACE AMONG THE FORGOTTEN</span><h2 data-preview-name>${e(d.name)}</h2><small class="portrait-roll-help">Choose a whole illustrated portrait, or leave the face to fate.</small>${op('Choose portrait','creator-portraits','','secondary small')}</div><div class="creator-age"><label for="start-age" class="creator-age-label"><span>Begin at age</span><output id="start-age-value" for="start-age start-age-number" data-start-age>${d.startAge}</output></label><input id="start-age" name="startAge" type="range" min="0" max="${MAX_START_AGE}" step="1" value="${d.startAge}" aria-describedby="start-age-description"><label class="field age-precise" for="start-age-number">Exact age<input id="start-age-number" type="number" inputmode="numeric" min="0" max="${MAX_START_AGE}" step="1" value="${d.startAge}" aria-describedby="start-age-description age-validation"></label><p id="age-validation" role="status"></p><div class="creator-age-marks" aria-hidden="true"><span>Birth</span><span>18</span><span>40</span><span>65</span><span>80</span></div><p id="start-age-description" data-age-description>${e(startingAgeDescription(d.startAge))} ${d.startAge} years of history · ${attributePointBudget(d.startAge)} ability points. ${d.startAge<3?'The first years are observed through your carers; choices begin as you learn to speak.':''}</p><p class="creator-past-note">Your face changes with age. Choose a portrait for the current stage; your saved choices stay with this life.</p></div></aside><div class="creator-controls">
    <fieldset class="creator-fieldset"${step===0?'':' hidden'} aria-labelledby="creator-heading-0"><legend class="sr-only">Beginning</legend><div class="creator-intro"><span class="eyebrow">1 / BEGINNING</span><h1 id="creator-heading-0" tabindex="-1">Where the story finds you.</h1><p>Choose a beginning and the age you enter this world. The rest can belong to fate.</p></div><div class="creator-name-field"><label class="field" for="character-name"><span class="field-label">Your name</span><input id="character-name" name="name" maxlength="40" value="${e(d.name)}" autocomplete="off" required><small>${e(namingLore(d.appearance.ancestry,heritage.id).lore)}</small></label>${op('Roll a name','creator-name','','ghost small')}</div><div class="creator-identity-grid"><label class="field"><span class="field-label">Ancestry</span><select name="ancestry"><option value="fate"${d.ancestryChoice==='fate'?' selected':''}>Cast by Fate</option>${races.map(o=>`<option value="${o.value}"${d.ancestryChoice===o.value?' selected':''}>${o.label}</option>`).join('')}</select></label><label class="field"><span class="field-label">Pronouns</span><select name="identity"><option value="fate"${d.identityChoice==='fate'?' selected':''}>Cast by Fate</option>${['he/him','she/her','they/them'].map(v=>`<option value="${v}"${d.identityChoice===v?' selected':''}>${e(pronounDisplayLabel(v))}</option>`).join('')}</select></label><label class="field creator-heritage-field"><span class="field-label">Heritage</span><select name="heritageChoice"><option value="fate"${d.heritageChoice==='fate'?' selected':''}>Cast by Fate</option>${heritages.map(h=>`<option value="${h.id}"${d.heritageChoice===h.id?' selected':''}>${e(h.name)}</option>`).join('')}</select><small data-heritage-description>${e(d.heritageChoice==='fate'?'Your heritage is revealed when this life begins.':heritage.description)}</small></label></div><p class="creator-note">Each ancestry has its own beginnings and portraits. Changing ancestry updates incompatible choices. The arrow at the top left undoes the last change. Pronouns and portrait presentation are independent.</p><div class="creator-origin-grid" data-origin-options role="group" aria-label="Origin">${renderCreatorOriginOptions(d)}</div><p class="creator-note">Keep a culturally drawn name or write your own. Family, fortune and early experiences belong to fate. No calling or moral path binds your future.</p></fieldset>
    <fieldset class="creator-fieldset"${step===1?'':' hidden'} aria-labelledby="creator-heading-1"><legend class="sr-only">Character attributes</legend><div class="creator-intro"><span class="eyebrow">2 / NATURE &amp; ABILITIES</span><h1 id="creator-heading-1" tabindex="-1">A life waiting to unfold.</h1><p>Choose up to three traits, then assign your age-based attribute points.</p></div><div data-portrait-controls>${renderCreatorPortraitControls(d)}</div></fieldset>
    ${step===2?renderCreatorReview(d)+`<p class="creator-slot-summary">${e(slotSummary)}</p>${op('Choose an empty slot','creator-slots','','ghost small')}`:renderLifeMode(d)}${step<2?renderCreatorRandomControls(d):''}</div></div><footer class="creator-footer">${op(step?'‹ Beginning':'‹ Return','creator-back','','ghost')}<span class="creator-footer-note">${step===2?'Review this exact draft before saving.':'Your draft stays with you as you move between steps.'}</span>${step<2?op(step===0?'Nature &amp; Abilities →':'Review this life →','creator-step',String(step+1),'primary'):'<button type="submit" class="button primary begin-button">Begin This Life <span aria-hidden="true">→</span></button>'}</footer></form></section>`;
}

function renderCreatorRandomControls(d){return `<section class="creator-fate" aria-labelledby="creator-fate-heading"><h3 id="creator-fate-heading">Leave room for fate</h3><p>Randomize unlocked choices in your beginning. Age, traits, assigned points and a custom name stay yours. Locked dependent choices also keep their ancestry compatible.</p><div class="creator-locks" role="group" aria-label="Randomization locks">${Object.entries(CREATOR_LOCKS).map(([key,label])=>`<button type="button" class="button ghost small" data-op="creator-lock" data-id="${key}" aria-pressed="${d.creatorLocks.includes(key)}">${d.creatorLocks.includes(key)?'Locked':'Unlocked'}: ${e(label)}</button>`).join('')}</div><div class="creator-random-actions">${op('Randomize unlocked choices','creator-random','','secondary')}${op('Randomize portrait only','creator-random-portrait','','secondary')}</div></section>`;}
export function renderCreatorReview(value){
 const d=normalizeCreatorDraft(value),fate=rollLifeCircumstances(d.seed,d.originId,d.appearance.ancestry),points=completeAttributePoints(d.attributePoints,d.startAge,d.seed),stage=PORTRAIT_STAGES.find(p=>p.id===portraitContext(d,d.startAge).stage),heritage=effectiveHeritage(d.appearance);
 return `<section class="creator-review" data-creator-review aria-labelledby="creator-heading-2"><span class="eyebrow">3 / REVIEW</span><h1 id="creator-heading-2" tabindex="-1">Meet the life you’ll begin.</h1><dl><dt>Name</dt><dd>${e(d.name)}</dd><dt>Age &amp; portrait stage</dt><dd>${d.startAge} · ${e(stage.label)} (${stage.max===null?stage.min+'+':stage.min+'–'+stage.max})</dd><dt>Ancestry · heritage</dt><dd>${e(ancestryLabel(d.appearance.ancestry))} · ${e(heritage.name)}</dd><dt>Beginning</dt><dd>${e(fate.originLabel)}</dd><dt>Pronouns</dt><dd>${e(pronounDisplayLabel(d.pronouns))}</dd><dt>Nature</dt><dd>${d.personalityTraits.map(id=>e(personalityTrait(id)?.name)).join(', ')||'Open to experience'}</dd><dt>Ability bonuses</dt><dd>${STARTING_ATTRIBUTES.map(key=>`${ATTRIBUTE_LABELS[key]} +${d.attributePoints[key]} assigned${points[key]>d.attributePoints[key]?' / +'+(points[key]-d.attributePoints[key])+' from fate':''}`).join(' · ')}</dd><dt>Family &amp; fortune from fate</dt><dd>${e({two_parents:'Two parents',single_parent:'One present parent',orphan:'Community guardians',homeless:'A shelter guardian'}[fate.familySetup])} · ${e({poor:'Poor',tradesfolk:'Tradesfolk',noble:'Noble'}[fate.household]||'Unrecorded')} birth household. Earlier experiences and final ability totals are drawn from ${d.startAge} years of history.</dd><dt>Mode</dt><dd>${d.lifeMode==='ironman'?'Ironman — combat death ends this life; party deaths are permanent.':'Standard'}</dd></dl><p>Unspent bonuses shown above use this draft’s fixed fate. Beginning this life does not reroll your choices.</p><div class="creator-review-edits">${op('Edit beginning','creator-step','0','secondary')}${op('Edit nature &amp; abilities','creator-step','1','secondary')}${op('Edit portrait','creator-portraits','','secondary')}</div></section>`;
}
