import { CLASS_CATALOG } from './classes.js';
import { GEAR_CATALOG } from './gear.js';
import { getProfession } from './careers.js';

const field = (key,label,entries) => Object.freeze({key,label,options:Object.freeze(entries.map(([value,label,description])=>Object.freeze({value,label,description})))});
export const PREFERENCE_OPTIONS = Object.freeze([
  field('pursuit','Favorite pursuit',[
    ['knowledge','Knowledge','Books, observations, lessons, and questions give you particular satisfaction.'],
    ['craft','Making things','Turning real materials into something useful gives you particular satisfaction.'],
    ['nature','The living world','Safe trails, growing things, and attention to the land give you particular satisfaction.'],
    ['combat','Martial practice','Discipline, teamwork, and practiced control give you particular satisfaction.'],
    ['community','People & community','Practical care and time made for other people give you particular satisfaction.'],
    ['trade','Trade & enterprise','A livelihood, a fair exchange, and work well managed give you particular satisfaction.'],
  ]),
  field('socialStyle','Company & conversation',[
    ['quiet','Quiet company','You favor patient listening, smaller gatherings, and room to reflect.'],
    ['warm','Warm & welcoming','You favor shared meals, familiar faces, and making people feel welcome.'],
    ['bold','Direct & expressive','You favor saying what you mean and meeting new situations openly.'],
  ]),
  field('value','A value you hold close',[
    ['mercy','Mercy','You value care and restraint, especially when someone is vulnerable.'],
    ['freedom','Freedom','You value room to choose a life and to respect another person’s choice.'],
    ['duty','Duty','You value keeping clear promises and being answerable for your actions.'],
    ['ambition','Ambition','You value the effort of becoming capable and pursuing a meaningful goal.'],
  ]),
  field('food','Favorite food',[
    ['hearty','Hearty meals','You enjoy a filling broth, warm bread, and a supper that stays with you.'],
    ['plant','Plant-forward meals','You enjoy lentils, garden greens, roasted roots, and herbs.'],
    ['sweet','Something sweet','You enjoy honey cakes, baked fruit, and a little sweetness shared.'],
    ['spiced','Spiced bowls','You enjoy fragrant grains, warming spice, and richly seasoned bowls.'],
  ]),
]);
export const DEFAULT_PREFERENCES = Object.freeze({pursuit:'knowledge',socialStyle:'quiet',value:'duty',food:'hearty'});
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const plain = v => Boolean(v && typeof v==='object' && !Array.isArray(v) && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null));

export function normalizePreferences(value) {
  const source = plain(value) ? value : {};
  return Object.fromEntries(PREFERENCE_OPTIONS.map(f=>{
    const supplied = typeof source[f.key]==='string' ? source[f.key].trim().toLowerCase() : '';
    return [f.key,f.options.some(o=>o.value===supplied)?supplied:DEFAULT_PREFERENCES[f.key]];
  }));
}

export function initializePreferences(state,{values,migration=false}={}) {
  state.hero.preferences = normalizePreferences(values ?? state.hero.preferences);
  if (!state.preferenceHistory) state.preferenceHistory = {lastEnjoymentDay:null,memories:[]};
  // Migration adds tastes, never a remembered pleasure or a wellbeing award.
}

export function preferenceFields(value) {
  const preferences = normalizePreferences(value);
  return `<div class="control-grid preference-fields">${PREFERENCE_OPTIONS.map(f=>`<label class="field"><span class="field-label">${escape(f.label)}</span><select name="${f.key}">${f.options.map(o=>`<option value="${o.value}"${preferences[f.key]===o.value?' selected':''}>${escape(o.label)}</option>`).join('')}</select></label>`).join('')}</div>`;
}

export function preferencesFromForm(formData) {
  return normalizePreferences(Object.fromEntries(PREFERENCE_OPTIONS.map(f=>[f.key,formData && typeof formData.get==='function' ? formData.get(f.key) : formData?.[f.key]])));
}

export function preferenceView(state) {
  const preferences = normalizePreferences(state.hero?.preferences);
  const items = PREFERENCE_OPTIONS.map(f=>{const option=f.options.find(o=>o.value===preferences[f.key]);return {label:f.label,value:option.label,description:option.description};});
  return {
    summary:`Drawn to ${items[0].value.toLowerCase()}, ${items[1].value.toLowerCase()}, and ${items[2].value.toLowerCase()}; fond of ${items[3].value.toLowerCase()}. Favored completed activities can bring a little extra joy once every 30 days.`,
    items,memories:[...(state.preferenceHistory?.memories || [])],
  };
}

const PROFESSION_PURSUITS = Object.freeze({
  Unemployed:'trade', Healer:'community', Merchant:'trade', Scholar:'knowledge',
  Herbalist:'nature', Soldier:'combat', Blacksmith:'craft', Farmer:'nature',
  Alchemist:'knowledge', Innkeeper:'community', Miner:'craft', Bard:'community',
  Cartographer:'knowledge',
});

function activityContext(state,actionId) {
  if (typeof actionId!=='string') return null;
  const exact = {
    grow_family:['community','making time for the people caring for you','warm','duty'],
    grow_play:['nature','sharing a familiar trail with Mira','warm','freedom'],
    grow_read:['knowledge','reading and asking a patient question','quiet','ambition'],
    grow_school:['knowledge','attending an actual lesson','quiet','ambition'],
    grow_weapons:['combat','practicing controlled weapon work','bold','duty'],
    grow_defense:['combat','practicing how to protect another person','warm','mercy'],
    grow_arcana:['knowledge','practicing the small lights spell','quiet','ambition'],
    grow_devotion:['community','learning a rite with its keepers','quiet','duty'],
    grow_stealth:['nature','mapping quiet paths with care','quiet','freedom'],
    grow_survival:['nature','learning herbs and safe trails','quiet','freedom'],
    study:['knowledge','finishing a period of study','quiet','ambition'],
    take_exam:['knowledge','sitting an examination after your preparation','bold','ambition'],
    pray:['community','making time at a shrine','quiet','duty'],
    help_clinic:['community','helping at a working clinic','warm','mercy'],
    visit_family:['community','making time for your family','warm','duty'],
    socialize:['community','spending an evening with familiar people','warm','freedom'],
    gather_herbs:['nature','gathering herbs on a known trail','quiet','freedom'],
    fulfill_oath:['community','carrying out a promised service','bold','duty'],
    life_career_train:['trade','practicing a civilian craft','quiet','ambition'],
    life_promotion:['trade','earning recognition for real work','bold','ambition'],
    life_counsel:['community','sharing a burden with a trusted listener','quiet','mercy'],
    life_rest:[null,'taking a quiet week to recover','quiet',null],
    rest:[null,'resting at a welcoming hearth','quiet',null],
    camp_rest:[null,'recovering at camp','quiet',null],
    school_attend:['knowledge','attending your named school','quiet','ambition'],
    school_lesson:['knowledge','completing a school lesson','quiet','ambition'],
    school_exam:['knowledge','completing an earned examination','bold','ambition'],
    family_support:['community','helping an actual member of your household','warm','duty'],
    family_visit:['community','sharing time with your household','warm','duty'],
    family_shelter:['community','finding an actual safe roof with your caregiver','warm','mercy'],
    school_service:['community','keeping a supervised reading-room service promise','warm','duty'],
    workshop_practice:['craft','repairing real communal tools','quiet','ambition'],
    workshop_upgrade_forge:['craft','finishing a master forge from committed materials','quiet','ambition'],
    workshop_rest:[null,'keeping a quiet night in a home you built','quiet',null],
    workshop_harvest:['nature','tending and harvesting your actual garden','quiet','duty'],
    workshop_read:['knowledge','completing a focused lesson in your own study','quiet','ambition'],
    workshop_prepare_refuge:['community','preparing your moon-watch refuge','quiet','mercy'],
  };
  if (Object.hasOwn(exact,actionId)) return exact[actionId];
  if (actionId==='work' || actionId==='career_work_completed') {
    const profession=state.hero.profession;
    if (!getProfession(profession)) return null;
    return [PROFESSION_PURSUITS[profession],`completing ${profession==='Unemployed'?'honest local work':`real work as a ${String(profession).toLowerCase()}`}`,'quiet','duty'];
  }
  if (/^career_make_(standard|fine|rush)$/.test(actionId) || actionId==='career_masterwork_completed') {
    const profession=state.hero.profession;
    if (!getProfession(profession) || profession==='Unemployed') return null;
    return [PROFESSION_PURSUITS[profession],actionId==='career_masterwork_completed'?`finishing a lasting ${profession.toLowerCase()} masterwork`:`completing the actual ${profession.toLowerCase()} work on a named commission`,'quiet','ambition',null,'craft'];
  }
  if (actionId==='train') return [state.hero.path==='mage'?'knowledge':state.hero.path==='rogue'?'nature':'combat','completing a period of practical training','bold','ambition'];
  const calling=/^calling_train_([a-z]+)$/.exec(actionId);
  if (calling && CLASS_CATALOG.some(c=>c.id===calling[1])) return [CLASS_CATALOG.find(c=>c.id===calling[1]).role==='mage'?'knowledge':'combat','completing supervised mentor service','quiet','ambition'];
  const gear=/^(?:gear|workshop)_craft_([a-z0-9_]+)$/.exec(actionId);
  if (gear && GEAR_CATALOG.some(g=>g.id===gear[1])) return ['craft',`making ${GEAR_CATALOG.find(g=>g.id===gear[1]).name.toLowerCase()} from gathered materials`,'quiet','ambition'];
  const building=/^workshop_build_(shelter|cottage|forge|garden|study|refuge)$/.exec(actionId);
  if (building) return ['craft',`finishing a ${building[1]} with your own labor`,'quiet',building[1]==='refuge'||building[1]==='shelter'?'mercy':'duty'];
  const gathered=/^workshop_gather_(wood|stone|ore|cloth|hide|crystal|herbs)$/.exec(actionId);
  if (gathered) return [gathered[1]==='wood'||gathered[1]==='herbs'?'nature':'craft',`gathering a supply of ${gathered[1]}`,'quiet','ambition'];
  if (/^workshop_repair_(shelter|cottage|forge|garden|study|refuge)$/.test(actionId)) return ['craft','restoring a real building to sound condition','quiet','duty'];
  const familyTime=/^family_time_([a-z][a-z0-9_-]*)$/.exec(actionId);
  if (familyTime && state.life?.people?.some(p=>p.id===familyTime[1] && p.role==='relative' && p.alive!==false)) return ['community','making time for an actual family member','warm','duty'];
  if (/^school_(?:attend|lesson|exam|practice)_/.test(actionId)) return ['knowledge','finishing an actual lesson at school','quiet','ambition'];
  if (/^family_(?:support|help|meal|visit)_/.test(actionId)) return ['community','making time for your actual household','warm','duty'];
  if (/^life_(?:visit|gift)_/.test(actionId)) return ['community','making room for a named person’s life','warm','mercy'];
  if (/^lore_(?:read|study|research|visit|investigate|discover)_/.test(actionId)) return ['knowledge','following a real thread of local history','quiet','freedom'];
  if (/^travel_[a-z0-9-]+$/.test(actionId) && state.world?.locations?.some(p=>p.id===actionId.slice(7))) return ['nature','completing a journey through the region','bold','freedom'];
  const meal=/^meal_(hearty|plant|sweet|spiced)$/.exec(actionId);
  if (meal) return [null,`sharing ${PREFERENCE_OPTIONS.find(f=>f.key==='food').options.find(o=>o.value===meal[1]).label.toLowerCase()}`,'warm',null,meal[1]];
  return null;
}

/** Engine calls only after real completion. Personality edits and partial projects never earn pleasure. */
export function applyPreferenceActivity(state,actionId,ctx={}) {
  if (!state.hero?.preferences || !state.preferenceHistory || !state.life || !Number.isSafeInteger(state.day) || state.day<0 || ctx.completed===false || state.workshop?.project || state.battle) return false;
  const actualId=typeof ctx.completedActionId==='string'?ctx.completedActionId:actionId;
  const context=activityContext(state,actualId);
  if (!context) return false;
  const [pursuit,label,socialStyle,value,food,alsoPursuit]=context;
  const preferences=normalizePreferences(state.hero.preferences);
  const favoredPursuit=Boolean(pursuit && preferences.pursuit===pursuit || alsoPursuit && preferences.pursuit===alsoPursuit);
  if (!favoredPursuit && !(socialStyle && preferences.socialStyle===socialStyle) && !(value && preferences.value===value) && !(food && preferences.food===food)) return false;
  const last=state.preferenceHistory.lastEnjoymentDay;
  if (last!==null && state.day-last<30) return false;
  const amount=favoredPursuit || preferences.food===food ? 3 : 2;
  state.life.happiness=Math.min(100,Math.max(0,state.life.happiness+amount));
  state.life.stress=Math.max(0,state.life.stress-1);
  state.preferenceHistory.lastEnjoymentDay=state.day;
  const memory=`Age ${state.age || 0}, day ${state.day}: You found ${amount} extra joy in ${label}.`;
  state.preferenceHistory.memories.push(memory);
  state.preferenceHistory.memories=state.preferenceHistory.memories.slice(-60);
  ctx.journal?.('A small pleasure',`${memory} Enjoyment follows what you actually do, and can return after 30 days.`,'preferences');
  return true;
}

export function validatePreferences(value,history,state) {
  if (!plain(value) || Object.keys(value).length!==PREFERENCE_OPTIONS.length || !PREFERENCE_OPTIONS.every(f=>f.options.some(o=>o.value===value[f.key]))) return false;
  if (history!==undefined) {
    if (!plain(history) || !(history.lastEnjoymentDay===null || Number.isSafeInteger(history.lastEnjoymentDay)&&history.lastEnjoymentDay>=0) || !Array.isArray(history.memories) || history.memories.length>60 || !history.memories.every(m=>typeof m==='string'&&m.length>0&&m.length<=1000)) return false;
    if (history.lastEnjoymentDay===null && history.memories.length) return false;
    if (state && history.lastEnjoymentDay!==null && history.lastEnjoymentDay>state.day) return false;
  }
  return true;
}
