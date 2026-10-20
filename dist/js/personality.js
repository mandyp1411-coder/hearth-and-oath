// Temperament becomes a chosen nature. Points buy lasting traits, not gear or callings.
const trait=(id,name,cost,opposite,attributes,aligned,against,description)=>Object.freeze({id,name,cost,opposite,attributes:Object.freeze(attributes),aligned:Object.freeze(aligned),against:Object.freeze(against),description});
export const PERSONALITY_TRAITS=Object.freeze([
  trait('brave','Brave',2,'cautious',{strength:1,willpower:1},['courage'],['retreat'],'Meets danger with resolve. Retreating from a fight weighs on you.'),
  trait('cautious','Cautious',2,'brave',{agility:1,intellect:1},['prudence'],['reckless'],'Reads danger before committing. Reckless powers and unnecessary risks strain you.'),
  trait('compassionate','Compassionate',2,'callous',{presence:1,vitality:1},['care','mercy'],['cruelty'],'Protects people who need help. Theft, coercion and deliberate cruelty cause distress.'),
  trait('callous','Callous',2,'compassionate',{strength:1,intellect:1},['ruthless'],['mercy'],'Can put an aim before tenderness. Giving mercy at a personal cost is difficult.'),
  trait('honest','Honest',2,'deceitful',{presence:1,willpower:1},['truth'],['deceit'],'Values a plain account. Lying, cheating and theft conflict with your nature.'),
  trait('deceitful','Deceitful',2,'honest',{agility:1,intellect:1},['deceit'],['truth'],'Prefers a useful secret or clever story. Open confession can leave you exposed.'),
  trait('patient','Patient',1,'impatient',{willpower:1},['patience','prudence'],['reckless'],'Can wait for an opening. Hasty, reckless choices disturb your composure.'),
  trait('impatient','Impatient',1,'patient',{agility:1},['decisive'],['delay'],'Acts quickly. Prolonged waiting and abandoned plans wear on you.'),
  trait('diligent','Diligent',2,'indolent',{strength:1,intellect:1},['work','learn'],['abandon'],'Finds purpose in effort. Giving up a commitment leaves unfinished work on your mind.'),
  trait('indolent','Easygoing',1,'diligent',{vitality:1},['rest'],['work'],'Values an unhurried life. Repeated demanding work conflicts with that ease.'),
  trait('ambitious','Ambitious',2,'content',{presence:1,willpower:1},['aspiration'],['abandon'],'Wants a life that reaches further. Abandoning earned prospects feels like a loss.'),
  trait('content','Content',1,'ambitious',{presence:1},['rest','care'],['domination'],'Can find enough in an ordinary life. Seizing power for its own sake unsettles you.'),
  trait('generous','Generous',2,'greedy',{presence:1,vitality:1},['give'],['take'],'Enjoys sharing what can be spared. Taking from others creates guilt.'),
  trait('greedy','Greedy',2,'generous',{intellect:1,presence:1},['take'],['give'],'Protects hard-won resources. Costly gifts and charity feel difficult.'),
  trait('vengeful','Vengeful',2,'forgiving',{strength:1,willpower:1},['vengeance'],['forgive'],'Remembers a wrong. Forgiving a known grievance takes an effort.'),
  trait('forgiving','Forgiving',1,'vengeful',{presence:1},['forgive'],['vengeance'],'Can let a grievance end. Choosing revenge after a wrong brings stress.'),
  trait('zealous','Zealous',2,'skeptical',{willpower:1,presence:1},['ritual'],['renounce'],'Takes a sworn faith seriously. Renouncing its rites or promises troubles you.'),
  trait('skeptical','Skeptical',2,'zealous',{intellect:1,agility:1},['learn'],['ritual'],'Questions received certainty. Binding yourself through a religious rite creates doubt.'),
  trait('curious','Curious',2,null,{intellect:1,willpower:1},['learn'],[],'Finds comfort in a new question. Learning supports both scholarship and spellcraft.'),
  trait('stoic','Stoic',2,null,{vitality:1,willpower:1},['prudence','rest'],[],'Steadies breath and judgment. Quiet care and deliberate preparation restore composure.'),
]);
// What life writes on a person: coping that stuck after a break, a grave dug
// too young, a nature that hardship bent. These are carried in hero.marks and
// read like traits; no points buy them and no creator offers them.
const acquired=(id,name,aligned,against,description)=>Object.freeze({id,name,cost:0,opposite:null,attributes:Object.freeze({}),aligned:Object.freeze(aligned),against:Object.freeze(against),description,acquired:true});
export const ACQUIRED_TRAITS=Object.freeze([
  acquired('drinker','Drinker',['rest'],['work'],'Drink is where the day goes when it goes wrong. Long work without it wears on you.'),
  acquired('hard','Hard',['ruthless','cruelty'],['mercy'],'Something in you closed. Mercy at your own cost comes harder than it did.'),
  acquired('devout','Devout',['ritual'],['renounce'],'You turned to the altar when there was nothing else, and it held. Renouncing it would be renouncing that night.'),
  acquired('withdrawn','Withdrawn',['rest'],['care'],'You went inward and stayed there. Being needed by others costs you.'),
  acquired('driven','Driven',['work'],['rest'],'You answered the worst of it with work, and work is what you trust. Idleness unsettles you.'),
  acquired('bereaved','Bereaved',['care'],[],'You buried a sibling before you were grown. You do not take the people you have for granted.'),
]);
export function personalityTrait(id){return PERSONALITY_TRAITS.find(t=>t.id===id)||ACQUIRED_TRAITS.find(t=>t.id===id)||null;}
/** Every trait a life carries: the chosen nature and what was written on it. */
export function natureIds(state){const chosen=state?.hero?.personality?.traits||[],marks=(state?.hero?.marks||[]).map(m=>m.id).filter(id=>personalityTrait(id));return [...new Set([...chosen,...marks])];}
export function hasNature(state,id){return natureIds(state).includes(id);}
/** A choice that exists only for some natures. */
export function natureChoice(state,traitId,choice){return hasNature(state,traitId)?{...choice,nature:traitId}:null;}
/** Life writes it. A trait gained this way is a mark, not a purchase; if its
 * opposite was chosen, the opposite goes: years of hunger undo a generous
 * nature, or make one. Journals the change with weight. */
export function shiftNature(state,traitId,title,text,ctx={}){
  const t=personalityTrait(traitId);if(!t||!state.hero||hasNature(state,traitId))return false;
  const p=state.hero.personality;
  if(t.opposite&&p?.traits.includes(t.opposite)){p.traits=p.traits.filter(id=>id!==t.opposite);p.applied=p.applied.filter(id=>id!==t.opposite);}
  if(t.opposite)state.hero.marks=(state.hero.marks||[]).filter(m=>m.id!==t.opposite);
  state.hero.marks=[...(state.hero.marks||[]),{id:traitId,day:state.day,source:'life'}].slice(-24);
  ctx.journal?.(title,text,'personality');
  return true;
}
// What a people respects, and what it has no patience for. Acting on your
// nature where they can see it moves how they hold you.
export const CULTURE_ESTEEM=Object.freeze({human:['ambitious','diligent'],elf:['patient','curious'],dwarf:['diligent','honest'],halfling:['generous','content'],orc:['honest','brave'],goblin:['deceitful','ambitious'],tiefling:['skeptical','cautious'],beastfolk:['brave','compassionate']});
export function cultureRegard(ancestry,traitId){const liked=CULTURE_ESTEEM[ancestry]||[];if(liked.includes(traitId))return 1;const t=personalityTrait(traitId);return t?.opposite&&liked.includes(t.opposite)?-1:0;}
export function traitPointBudget(age=0){const years=Math.max(0,Math.floor(Number(age)||0));return years<3?0:years<6?1:years<10?2:years<14?3:years<18?4:years<30?6:years<45?8:years<65?10:12;}
export function traitPoints(ids=[]){return ids.reduce((sum,id)=>sum+(personalityTrait(id)?.cost||0),0);}
export function normalizePersonalityTraits(value,age=0){
  const result=[];for(const id of Array.isArray(value)?value:[]){const t=personalityTrait(id);if(!t||result.includes(id)||result.includes(t.opposite)||traitPoints(result)+t.cost>traitPointBudget(age))continue;result.push(id);}return result;
}
export function traitAttributeBonuses(ids=[]){const out={};for(const id of ids)for(const [key,n] of Object.entries(personalityTrait(id)?.attributes||{}))out[key]=(out[key]||0)+n;return out;}
export const natureEdition=state=>state?.householdBudget?.debt!==undefined;
export function personalityView(state){const traits=state?.hero?.personality?.traits||[],budget=traitPointBudget(state?.age),acquired=(state?.hero?.marks||[]).map(m=>({...personalityTrait(m.id),day:m.day,source:m.source})).filter(t=>t.id);return {traits:traits.map(personalityTrait).filter(Boolean),ids:[...traits],acquired,budget,spent:traitPoints(traits),remaining:budget-traitPoints(traits),bonuses:natureEdition(state)?{}:traitAttributeBonuses(traits),history:state?.hero?.personality?.history||[],stress:state?.life?.stress||0};}
export function initializePersonality(state){if(!state.hero.personality)state.hero.personality={version:1,traits:[],applied:[],cooldowns:{},history:[]};}
const reflectionPause={id:'pause',label:'Leave this exchange for later',description:'Leave without spending time or changing the relationship. Meet any urgent need, then return to the grievance.'};
export function initializePersonalityDecision(state){
  if(state.event?.id==='nature_slight'&&!state.event.choices.some(c=>c.id==='pause'))state.event.choices.push({...reflectionPause});
}
export function personalitySelectionReason(state,id){
  if(state.phase==='retired')return 'This life’s nature belongs to its recorded history.';
  if(state.battle||state.event||state.conversations?.pending||state.timeline?.journey||state.workshop?.project||state.careers?.batch)return 'Resolve the current moment before developing a new trait.';
  const t=personalityTrait(id),view=personalityView(state);if(!t)return 'Unknown personality trait.';
  if(view.ids.includes(id))return 'This trait is already part of your nature.';
  if(view.ids.length>=3)return 'Your three trait slots are filled.';
  if(view.ids.includes(t.opposite))return `Conflicts with ${personalityTrait(t.opposite).name}.`;
  if(view.remaining<t.cost)return `Requires ${t.cost} trait points; ${view.remaining} remain at age ${state.age}.`;
  return '';
}
/** Attribute gains are applied once, so reloads cannot buy the same bonus
 * twice. On a new-edition life there are none: a nature is a trade-off, chosen
 * for who you want to be, not for a point of Strength. */
export function applyPersonalityBuild(state,ids,{creation=false}={}){
  initializePersonality(state);const p=state.hero.personality,chosen=normalizePersonalityTraits(ids,state.age),edition=natureEdition(state);
  if(p.traits.some(id=>!chosen.includes(id)))return false;
  for(const id of chosen)if(!p.applied.includes(id)){
    for(const [key,amount] of Object.entries(edition?{}:personalityTrait(id).attributes)){
      state.hero.attributes[key]+=amount;
      if(key==='vitality'){state.hero.maxHp+=amount*3;state.hero.hp=Math.min(state.hero.maxHp,state.hero.hp+amount*3);}
      if(key==='intellect'){state.hero.maxMp+=amount*3;state.hero.mp=Math.min(state.hero.maxMp,state.hero.mp+amount*3);}
    }
    p.applied.push(id);
  }
  p.traits=chosen;return true;
}
function actionTags(id){
  if(/^misdeed_(theft|extort)_/.test(id))return ['take','deceit','cruelty'];
  if(id.startsWith('misdeed_murder_'))return ['cruelty','ruthless','domination'];
  if(id.startsWith('misdeed_manipulate_'))return ['deceit','domination'];
  if(id==='leisure_read')return ['learn'];
  if(/^leisure_(walk|circle)$/.test(id))return ['rest'];
  if(id.startsWith('social_reconcile_'))return ['forgive','care'];
  if(/^(justice_(steal|burglary)|steal)$/.test(id))return ['take','deceit','cruelty'];
  if(id==='realm_report_suppress')return ['cruelty','take','domination'];
  if(id==='realm_report_share')return ['care','give','truth'];
  if(['realm_petition','realm_inquiry'].includes(id))return ['learn'];
  if(id==='realm_govern_tithe')return ['take','cruelty','domination'];
  if(/^(realm_(invest|rebuild|relief|govern_care)|help_clinic|social_support)/.test(id))return ['care','give'];
  if(id==='realm_ritual'||id.startsWith('realm_join_')||id==='pray')return ['ritual'];
  if(id==='realm_leavefaith')return ['renounce'];
  if(/(cancel|abandon)$/.test(id))return ['abandon'];
  if(/^(career_work|work|career_practice|train|grow_train|grow_practice)/.test(id))return ['work'];
  if(/^(study|grow_study|school_attend|lore_|career_study)/.test(id))return ['learn'];
  if(/^(health_routine|rest|camp_rest|recovery_)/.test(id))return ['rest'];
  if(/^(realm_negotiate|travel_prepare|lycan_control)/.test(id))return ['prudence'];
  if(id==='realm_seize')return ['domination','aspiration'];
  if(id==='realm_charter'||id.startsWith('career_choose_')&&id!=='career_choose_unemployed')return ['aspiration'];
  return [];
}
function choiceTags(eventId,id){
  if(eventId==='hard_winter')return id==='share'?['give','care']:id==='hoard'?['take']:id==='poach'?['courage','deceit']:['patience'];
  if(eventId==='debt_reckoning')return id==='forge'?['deceit','take']:id==='defy'?['courage']:id==='flee'?['abandon']:id==='plead'?['truth']:[];
  if(eventId==='stories_chapter')return id==='coercion'?['cruelty','take','domination']:id==='care'?['care','give']:id==='enterprise'?['work','aspiration']:id==='leave'?['abandon']:[];
  if(['life_hunger','vampire_feeding'].includes(eventId))return id==='predation'?['cruelty','ruthless','take']:['donor','agreement'].includes(id)?['care']:[];
  if(eventId==='travel_messenger'&&id==='extort')return ['take','cruelty','ruthless'];
  if(eventId==='travel_grave_robber'&&id==='join')return ['take','cruelty'];
  if(eventId==='travel_weather')return id==='press'?['reckless','decisive']:id==='shelter'?['prudence','patience']:[];
  if(eventId==='plague_homecoming')return ['open','private'].includes(id)?['truth','care']:id==='quiet'?['deceit','care']:[];
  if(eventId==='career_year')return id==='care'?['care','rest']:id==='community'?['care','give']:id==='profit'?['aspiration','work']:[];
  if(eventId==='nature_slight')return id==='forgive'?['forgive','mercy']:id==='retaliate'?['vengeance','ruthless']:id==='account'?['truth','prudence']:id==='wait'?['patience','delay']:[];
  if(eventId==='career_invoice'&&id==='conceal')return ['deceit','take'];
  if(eventId==='career_invoice'&&id==='community')return ['truth','give'];
  if(eventId==='adventure_room'&&id==='rush')return ['reckless','decisive'];
  if(['lie','cheat','deceive','false_account'].includes(id)||eventId==='childhood_3'&&id==='hide')return ['deceit'];
  if(eventId==='paladin_oath'&&id==='truth')return ['ritual'];
  if(['truth','confess','admit','honest'].includes(id))return ['truth'];
  if(eventId==='paladin_oath'&&id==='mercy')return ['ritual'];
  if(['release','spare'].includes(id))return ['mercy'];
  if(['forgive','reconcile'].includes(id))return ['forgive'];
  if(['revenge','retaliate'].includes(id))return ['vengeance'];
  if(['gift','donate'].includes(id))return ['give','care'];
  if(id==='abandon')return ['abandon'];
  if(['travel_bandits','travel_beasts'].includes(eventId)&&id==='fight')return ['courage'];
  if(eventId==='travel_bandits'&&['avoid','turn_back'].includes(id))return ['prudence'];
  if(['necromancer_ethics','ancestor_remedy'].includes(eventId)&&id==='bind')return ['cruelty','ruthless'];
  if(/(adoption|social_|family_|health_)/.test(eventId)&&['support','listen','care'].includes(id))return ['care'];
  if(/(stories_|career_|school_|birth_)/.test(eventId)&&id==='wait')return ['delay','patience'];
  return [];
}
export const INTENT_TAGS=Object.freeze(['care','give','learn','work','aspiration','rest','truth','deceit','cruelty','ruthless','take','domination','prudence','patience','delay','reckless','decisive','courage','mercy','forgive','vengeance','abandon','ritual','renounce','retreat']);
export function personalityTags({kind,id,eventId='',specialization,intentTags}={}){
  if(Array.isArray(intentTags))return intentTags.filter(t=>INTENT_TAGS.includes(t));
  if(kind==='dialogue') {
    if(id==='pressure')return ['cruelty','ruthless','domination'];
    if(['confide','honest','consent'].includes(id)||eventId==='notes'&&id==='share')return ['truth'];
    if(['listen','comfort','kind','help','support','refuge','rebuild','belong'].includes(id))return ['care'];
    if(['question','curious','study','ethics','method','ask'].includes(id))return ['learn'];
    if(eventId==='notes'&&id==='release')return ['truth','abandon'];
    return [];
  }
  if(kind==='choice')return choiceTags(eventId,id);
  if(kind==='battle')return id==='retreat'?['retreat','prudence']:id==='feral'||id==='skill'&&specialization==='berserker'?['reckless']:id==='inspect'?['prudence','learn']:['capture','hold_back'].includes(id)?['mercy']:[];
  return actionTags(String(id||''));
}
export function personalityImpact(state,context){
  if(state?.age<3&&context?.kind==='choice'&&context?.eventId?.startsWith('birth_'))return {delta:0,impacts:[],tags:[]};
  const tags=personalityTags(context),p=state?.hero?.personality,impacts=[];if(!p)return {delta:0,impacts,tags};
  for(const id of natureIds(state)){const t=personalityTrait(id);if(!t)continue;
    const contrary=tags.find(tag=>t.against.includes(tag)),aligned=tags.find(tag=>t.aligned.includes(tag));
    if(contrary)impacts.push({id,name:t.name,tag:contrary,delta:6});
    else if(aligned)impacts.push({id,name:t.name,tag:aligned,delta:-2});
  }
  return {delta:Math.max(-4,Math.min(12,impacts.reduce((n,i)=>n+i.delta,0))),impacts,tags};
}
export function personalityImpactText(state,context){const impact=personalityImpact(state,context);return impact.impacts.map(i=>`${i.name}: ${i.delta>0?'conflicts with your nature (+6 stress, once a day)':'supports your nature (−2 stress, once a week)'}`).join(' · ');}
export function applyPersonalityImpact(state,context){
  const p=state.hero.personality,impact=personalityImpact(state,context);if(!p||!state.life||!impact.impacts.length)return 0;
  const entries=impact.impacts.filter(i=>{
    const key=`${i.id}:${i.tag}`,last=p.cooldowns[key];return last===undefined||state.day-last>=(i.delta<0?7:1);
  });if(!entries.length)return 0;
  const amount=Math.max(-4,Math.min(12,entries.reduce((n,i)=>n+i.delta,0))),old=state.life.stress;
  state.life.stress=Math.max(0,Math.min(100,old+amount));
  for(const i of entries)p.cooldowns[`${i.id}:${i.tag}`]=state.day;
  if(natureEdition(state))recordStrain(state,entries,context);
  // Where people can see it, acting on your nature moves how they hold you:
  // what their people respect draws them closer, what it scorns pushes them off.
  if(natureEdition(state))for(const i of entries.filter(i=>i.delta<0))for(const person of state.life.people){
    if(person.alive===false||person.locationId!==state.locationId||!person.appearance?.ancestry)continue;
    const regard=cultureRegard(person.appearance.ancestry,i.id);if(regard)person.bond=Math.max(0,Math.min(100,(person.bond||0)+regard));
  }
  const actual=state.life.stress-old;
  if(actual){const title=actual>0?'Against your nature':'At peace with your nature',text=`${entries.map(i=>i.name).join(', ')}: ${actual>0?'+':''}${actual} stress after ${String(context.label||context.id).replaceAll('_',' ')}.`;
    p.history.push({day:state.day,delta:actual,traits:entries.map(i=>i.id),title,text});p.history=p.history.slice(-80);
    state.journal.push({id:`entry-${state.journal.length+1}`,day:state.day,age:state.age,title,text,tag:'personality',generation:state.dynasty?.generation||1});
  }
  return actual;
}
/** Act against a trait for years and it can flip. The strain is counted per
 * trait; twelve contrary acts across two years or more turn it into its
 * opposite, written as a mark with the day it happened. */
function recordStrain(state,entries,context){
  const p=state.hero.personality;p.strain||={};
  for(const i of entries.filter(i=>i.delta>0)){
    const t=personalityTrait(i.id);if(!t||!t.opposite||!p.traits.includes(i.id))continue;
    const row=p.strain[i.id]||={count:0,sinceDay:state.day};row.count++;
    if(row.count>=12&&state.day-row.sinceDay>=2*365){
      delete p.strain[i.id];
      shiftNature(state,t.opposite,'What the years did to you',`You were ${t.name.toLowerCase()} once. Year after year you chose otherwise, and the choosing has become who you are: ${personalityTrait(t.opposite).name.toLowerCase()} now, after ${String(context.label||context.id).replaceAll('_',' ')}.`,{journal:(title,text,tag)=>state.journal.push({id:`entry-${state.journal.length+1}`,day:state.day,age:state.age,title,text,tag,generation:state.dynasty?.generation||1})});
    }
  }
}
export function validatePersonality(value,state){
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)return false;
  if(!Array.isArray(value.traits)||!Array.isArray(value.applied)||value.traits.length>PERSONALITY_TRAITS.length)return false;
  if(JSON.stringify(normalizePersonalityTraits(value.traits,state.age))!==JSON.stringify(value.traits)||JSON.stringify(value.applied)!==JSON.stringify(value.traits))return false;
  if(!value.cooldowns||typeof value.cooldowns!=='object'||Array.isArray(value.cooldowns)||Object.keys(value.cooldowns).length>400)return false;
  if(!Object.entries(value.cooldowns).every(([key,day])=>/^[a-z_]+:[a-z_]+$/.test(key)&&personalityTrait(key.split(':')[0])&&Number.isInteger(day)&&day>=0&&day<=state.day))return false;
  if(value.reflectionDay!==undefined&&(!Number.isInteger(value.reflectionDay)||value.reflectionDay<0||value.reflectionDay>state.day))return false;
  if(value.strain!==undefined&&(!value.strain||typeof value.strain!=='object'||Array.isArray(value.strain)||!Object.entries(value.strain).every(([id,row])=>personalityTrait(id)&&row&&Number.isInteger(row.count)&&row.count>=1&&row.count<=12&&Number.isInteger(row.sinceDay)&&row.sinceDay>=0&&row.sinceDay<=state.day)))return false;
  if(value.reflection!==undefined&&value.reflection!==null&&(!value.reflection||typeof value.reflection!=='object'||typeof value.reflection.name!=='string'||value.reflection.name.length>120||typeof value.reflection.personId!=='string'||!state.life.people.some(p=>p.id===value.reflection.personId)||state.event?.id!=='nature_slight'))return false;
  if(state.event?.id==='nature_slight'&&!value.reflection)return false;
  return Array.isArray(value.history)&&value.history.length<=80&&value.history.every(h=>h&&Number.isInteger(h.day)&&h.day>=0&&h.day<=state.day&&Number.isInteger(h.delta)&&h.delta!==0&&Math.abs(h.delta)<=12&&Array.isArray(h.traits)&&h.traits.every(id=>personalityTrait(id))&&typeof h.title==='string'&&h.title.length<=100&&typeof h.text==='string'&&h.text.length<=1000);
}

/** A real relationship offers a yearly occasion to answer a grievance. */
export function personalityActions(state){
  const p=state.hero.personality,person=state.life?.people.find(p=>p.alive!==false&&!p.familyRole&&['friend','rival','suitor'].includes(p.role));
  if(!p?.traits.length||state.age<13||!person||state.event||state.battle||state.timeline?.yearTarget||state.timeline?.journey||p.reflection||p.reflectionDay!==undefined&&state.day-p.reflectionDay<365)return [];
  return [{id:'nature_reckoning',label:`An uneasy word with ${person.name}`,description:'An old grievance asks for an answer. Take a day to choose forgiveness, a measured account, or a counterstory.',days:1,cost:0,group:'Relationships',...(state.hero.condition?.type==='vampire'&&state.hero.condition.hunger>=75?{disabledReason:'Arrange feeding before opening a grievance that needs a day.'}:{})}];
}
export function applyPersonalityAction(state,id,ctx){
  const offered=personalityActions(state).find(a=>a.id===id);
  if(id!=='nature_reckoning'||!offered||offered.disabledReason)return false;
  const person=state.life.people.find(p=>p.alive!==false&&!p.familyRole&&['friend','rival','suitor'].includes(p.role)),p=state.hero.personality;
  p.reflectionDay=state.day;p.reflection={personId:person.id,name:person.name,kind:'new_incident',day:state.day};
  ctx.setEvent('nature_slight','A name carried into the wrong story','Your nature',`A new incident occurs at today’s crowded table. ${person.name} repeats a private account of yours at a crowded table. The telling has grown sharper in other mouths. When you meet again, they admit that the first words were theirs. What you do with that admission belongs to you.`,[
    {id:'forgive',label:'Let this grievance end',description:'Spend a day rebuilding trust. Gain 4 bond and practice persuasion.'},
    {id:'retaliate',label:'Answer with a cutting counterstory',description:'Spend a day making your answer public. Lose 4 bond, practice persuasion, and gain 1 underworld standing.'},
    {id:'account',label:'Ask them to correct the public account',description:'Spend a day setting a clear boundary. Gain 2 bond and practice scholarship.'},
    {id:'wait',label:'Take time before giving an answer',description:'Spend a day apart, without changing the relationship.'},
    {...reflectionPause},
  ]);return true;
}
export function applyPersonalityChoice(state,eventId,id,ctx){
  if(eventId!=='nature_slight'||!state.hero.personality?.reflection||!['forgive','retaliate','account','wait','pause'].includes(id))return false;
  const p=state.hero.personality,reflection=p.reflection;
  if(id==='pause'){
    p.reflection=null;delete p.reflectionDay;
    state.notice=`You leave the exchange with ${reflection.name} unfinished. No day or relationship change was spent; you can return after meeting your needs.`;
    ctx.journal('A grievance left open',state.notice,'personality');return true;
  }
  if(ctx.spendDays(1)!==1)return false;
  const person=state.life.people.find(a=>a.id===reflection.personId);
  if(person?.alive!==false){person.bond=Math.max(0,Math.min(100,person.bond+({forgive:4,retaliate:-4,account:2,wait:0}[id])));}
  if(id!=='wait')state.hero.skills[id==='account'?'scholarship':'persuasion']++;
  if(id==='retaliate')ctx.standing('underworld',1);
  p.reflection=null;const text=`You ${id==='forgive'?'let the grievance end':id==='retaliate'?'answered with a public counterstory':id==='account'?'asked for the record to be corrected':'took a day before answering'} after ${reflection.name} admitted repeating your private account.`;
  ctx.journal('What you did with a wrong',text,'personality');state.notice=text;return true;
}
export function personalityEventIds(){return {nature_slight:['forgive','retaliate','account','wait','pause']};}
