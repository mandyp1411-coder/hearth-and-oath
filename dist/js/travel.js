import { generateCharacter } from './characters.js';
import { companionOpinion } from './battlecraft.js';
import { isCanonicalAppearance } from './avatar.js';
import { seededRoll, travelPreview, generatePersonName } from './world.js';
import { communitySupport } from './community.js';
import { roadPreference, selectRoadRoute, ROAD_PREFERENCES } from './road-routes.js';
import { captureRoadAccount, describeRoadAccount, roadReceipt, validRoadAccount, validRoadReceipt } from './road-memory.js';
import { travelEnergyView, travelEnergyForecast, campingActions, applyCampingAction } from './travel-energy.js';

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const waiting = state => !!(state.event || state.battle || state.conversations?.pending || state.phase === 'retired');
const types = ['bandits', 'beasts', 'weather', 'caravan', 'witness', 'sick_traveler', 'lore', 'messenger', 'pilgrims', 'grave_robber', 'fortune', 'wagon', 'relic'];
const clone = value => structuredClone(value);
const place = (state, id) => state.world?.locations?.find(location => location.id === id);
const choice = (id, label, description) => ({ id, label, description });
const PAID = { offering: 3, reading: 2, donate: 4 }; // the road's paid choices, shut when the purse is short rather than refused after

function roadGuidance(state) {
  if ((state.revision || 0) < 5) return { reduction: 0, fatigue: 0, accounts: [] };
  const survival = Math.min(8, Math.floor(Math.max(0, state.hero.skills?.survival || 0) / 2) * 2);
  const scout = state.companions?.find(person => person.recruited && person.active && person.alive !== false && person.hp > 0 && /scout|ranger/i.test(person.role));
  const cartographer = state.careers?.records?.Cartographer;
  const mapped = cartographer?.workedDays >= 30 && cartographer.experience >= 60 ? 2 : 0;
  const fatigue = state.hero.hp < state.hero.maxHp * .35 || (state.life?.health ?? 80) < 30 ? 5 : 0;
  return { reduction: Math.min(10, survival + (scout ? 3 : 0) + mapped), fatigue, accounts: [
    ...(survival ? [`Your survival practice reduces road risk by ${survival} points.`] : []),
    ...(scout ? [`${scout.name} actively guides the party, reducing road risk by 3 points.`] : []),
    ...(mapped ? ['Your actual cartography work reduces road risk by 2 points.'] : []),
    ...(fatigue ? ['Low physical reserves raise road risk by 5 points. Rest or care can help before departure.'] : []),
  ] };
}

export function normalizeTravelPlan(value = {}) {
  value = value && typeof value === 'object' ? value : {};
  return { pace: ['steady', 'cautious', 'fast'].includes(value.pace) ? value.pace : 'steady', supplies: value.supplies === true, scout: value.scout === true, escort: value.escort === true, night: value.night === true };
}
export function initializeTravel(state, { migration = false, reset = false } = {}) {
  if (!state.travel || reset) state.travel = { plan: normalizeTravelPlan({ night: migration && state.flags?.travelByNight === true }), pending: null, journeys: 0, history: [], discoveries: [] };
  // Existing journeys intentionally receive neither leg checks nor new risks.
  void migration;
}
export function setTravelPlan(state, values) {
  if (!state.travel || waiting(state) || state.timeline?.journey || state.dungeon || state.workshop?.project || state.careers?.batch || state.life?.plan) return false;
  state.travel.plan = normalizeTravelPlan(values);
  if(values?.routePreference!==undefined)state.travel.routePreference=roadPreference(values.routePreference);
  state.notice = 'Your road plan is ready to review. Time and supplies are committed only when you depart.';
  return true;
}

export function travelPlanPreview(state, destinationId, {preference=state.travel?.routePreference}={}) {
  // New planned trips always follow the actual graph, including migrated adults.
  const base = travelPreview({ ...state, timeline: { ...state.timeline, mode: 'birth' } }, destinationId);
  const plan = normalizeTravelPlan(state.trail?{night:state.flags?.travelByNight}:state.travel?.plan);
  const guidance = roadGuidance(state);
  const quotes=new Map(),describeLeg=(from,to,road)=>{
    const key=JSON.stringify([from,to]);if(quotes.has(key))return quotes.get(key);
    const leg={from,to,days:road?.days||place(state,to)?.travelDays||1,danger:road?.danger||6-(place(state,to)?.safety||1)};
    const danger = clamp(leg.danger || 1, 1, 6);
    const communityRiskReduction = Math.max(communitySupport(state, leg.from).roadRiskReduction, communitySupport(state, leg.to).roadRiskReduction);
    const risk = clamp(danger * 6 - 4 + (plan.pace === 'fast' ? 9 : plan.pace === 'cautious' ? -9 : 0) - (plan.supplies ? 4 : 0) - (plan.scout ? 6 : 0) - (plan.escort ? 12 : 0) + (plan.night ? 3 : 0) - (state.flags?.roadSafe && [leg.from, leg.to].includes('forest') ? 5 : 0) - guidance.reduction - communityRiskReduction + guidance.fatigue, 0, 45);
    const result={...leg,totalDays:Math.max(1,leg.days+(plan.pace==='cautious'?1:plan.pace==='fast'?-1:0)),danger,risk,encounterRisk:Math.min(60,risk+12),checked:false,encounterKey:null,...(communityRiskReduction?{communityRiskReduction}:{})};quotes.set(key,result);return result;
  };
  const route=selectRoadRoute(state.world,state.locationId,destinationId,plan,preference,describeLeg);
  const legs=route.slice(1).map((to,index)=>{const from=route[index],road=state.world.roads.find(r=>r.from===from&&r.to===to||r.from===to&&r.to===from),leg={...describeLeg(from,to,road)};if(index===0&&plan.scout)leg.totalDays++;delete leg.days;return leg;});
  const baseDays=route.slice(1).reduce((n,to,index)=>n+describeLeg(route[index],to,state.world.roads.find(r=>r.from===route[index]&&r.to===to||r.from===to&&r.to===route[index])).days,0);
  const cost=(plan.supplies?3+Math.ceil(baseDays/2):0)+(plan.scout?2:0)+(plan.escort?4+legs.length*2:0);
  const days = legs.reduce((total, leg) => total + leg.totalDays, 0), risk = Math.max(0, ...legs.map(leg => leg.risk));
  if(state.trail){
    const energy=travelEnergyView(state),forecast=travelEnergyForecast(state,days);
    for(const leg of legs){leg.energyBaseRisk=leg.risk;leg.risk=Math.min(45,leg.risk+energy.danger);leg.encounterRisk=Math.min(60,leg.risk+12);}
    const disabledReason=state.phase==='retired'?'This life’s travelling chapter has ended.':base.disabledReason||(state.careers?.batch?'Finish your current work before travelling.':state.life?.plan?'Finish or pause the current commitment first.':undefined);
    return {...base,route,plan,legs,days:forecast.days,baseDays:days,cost:0,risk:Math.min(45,risk+energy.danger),energyVersion:1,energy,precautions:[energy.summary,'Travel uses Focus. Below one quarter, movement takes twice as long; at zero, three times as long.','You can stop after each travel step to make camp. A camp pack gives better rest and lasts for its listed nights.','At zero Focus after three unrested travel days, continuing can cause sudden death.'],description:`About ${forecast.days} days without resting; ${days} normal days of distance. No preparation fee. Focus ${state.hero.mp}/${state.hero.maxMp}. You can camp along the way.`,...(disabledReason?{disabledReason}:{})};
  }
  const precautions = [plan.pace === 'cautious' ? 'Cautious pace adds a day to each leg and reduces danger.' : plan.pace === 'fast' ? 'Fast pace saves up to a day on each leg and raises danger.' : 'Steady pace follows the marked road times.', ...(plan.supplies ? ['Packed provisions reduce risk; departure supplies are paid once.'] : []), ...(plan.scout ? ['Scouting costs 2 gold and one preparation day on the first leg.'] : []), ...(plan.escort ? ['A hired road escort reduces danger without taking a companion slot.'] : []), ...(plan.night ? ['Travel after dusk: daylight exposure is avoided, but road danger rises slightly.'] : []), ...guidance.accounts, ...(guidance.reduction >= 10 ? ['Combined personal guidance is capped at 10 risk points.'] : [])];
  for (const leg of legs.filter(leg => leg.communityRiskReduction)) precautions.push(`A funded road undertaking near ${place(state, leg.from)?.name || leg.from} and ${place(state, leg.to)?.name || leg.to} reduces this leg's danger by ${leg.communityRiskReduction} points. Its quotation is retained after departure.`);
  const disabledReason = state.phase === 'retired' ? 'This life has ended its traveling chapter.' : base.disabledReason || (state.careers?.batch ? 'Finish or cancel your committed career work before traveling.' : state.life?.plan ? 'Finish or suspend your annual plan before traveling.' : state.hero.gold < cost ? `Requires ${cost} gold for the chosen departure preparations.` : undefined);
  return { ...base, route, preference:roadPreference(preference), plan, legs, days, cost, risk, exposure:legs.reduce((n,leg)=>n+leg.risk,0), checks:legs.length, precautions, description: `${days} planned day${days === 1 ? '' : 's'}; ${cost} gold paid once at departure. Dangerous encounters: ${risk}% on the most exposed leg. Each leg is checked separately; harmless meetings may also occur. ${base.status === 'destroyed' ? 'The destination is ruined and has no ordinary services.' : base.status === 'evacuated' ? 'The destination is evacuated and has no ordinary services.' : 'All legs follow the actual regional roads.'}`, ...(disabledReason ? { disabledReason } : {}) };
}
export function travelRouteOptions(state,destinationId){return ROAD_PREFERENCES.map(([id,label])=>({id,label,preview:travelPlanPreview(state,destinationId,{preference:id})}));}

export function beginTravelJourney(state, preview, ctx = {}) {
  if (!state.travel || !state.timeline || state.timeline.journey || waiting(state) || preview?.disabledReason || !preview?.route?.length || preview.route.length < 2 || !Array.isArray(preview.legs) || preview.legs.length !== preview.route.length - 1 || preview.route[0] !== state.locationId || !Number.isSafeInteger(preview.cost) || preview.cost < 0) return false;
  state.travel.journeys++;
  state.timeline.journey = { id: `journey-${state.seed}-${state.travel.journeys}-${state.day}`, destinationId: preview.route.at(-1), route: [...preview.route], legIndex: 0, legProgress: 0, startedDay: state.day, traversedIds: [state.locationId], plan: normalizeTravelPlan(preview.plan), departureCost: preview.cost, legs: clone(preview.legs) };
  if(preview.energyVersion===1)state.timeline.journey.energyVersion=1;
  state.notice = preview.energyVersion===1?`You set out for ${place(state,preview.route.at(-1)).name}. You can stop along the road to make camp.`:`You committed ${preview.cost} gold to one road journey with ${preview.days} planned days. Each leg will be checked once after real movement.`;
  ctx.journal?.(preview.energyVersion===1?'You Set Out':'A road plan committed', state.notice, 'travel');
  return true;
}

function record(state, ctx, title, text, result, road) {
  state.notice = text;
  state.travel.history.push({ id: `road-${state.day}-${state.travel.journeys}-${state.travel.history.length}`, day: state.day, locationId: state.locationId, title, text, ...(result ? { result } : {}),...(road?{road}:{}) });
  state.travel.history = state.travel.history.slice(-120);
  ctx.journal?.(title, text, 'travel');
}
function encounterName(state, pending) {
  return pending.person?.name || generatePersonName(state.seed, `${pending.journeyId}:${pending.legId}:traveler`);
}
function scene(state, pending) {
  const journey = state.timeline.journey, leg = journey?.legs?.[pending.legIndex];
  const from = place(state, leg?.from)?.name || 'the last safe waypoint', to = place(state, leg?.to)?.name || 'the next waypoint';
  const name = encounterName(state, pending), escorted = journey.plan.escort ? 'Your hired escort stays nearby.' : 'You can choose a safe detour without fighting.';
  if (pending.stage === 'delay') return { id: 'travel_delay', title: 'The remaining road work', body: `${pending.remainingDays} day${pending.remainingDays === 1 ? '' : 's'} remain for your chosen response between ${from} and ${to}. Its ${pending.costPaid} gold has already been paid. Resolve any current calendar need, then resume without another fee.`, choices: [choice('continue', 'Finish the remaining road work', 'Spend only the remaining days. No second payment.'), choice('abandon', 'Return to the last waypoint', 'Stop this journey here. Committed departure supplies and paid fees are not refunded.')] };
  const data = {
    bandits: { title: 'A toll nobody authorized', body: `Between ${from} and ${to}, armed road thieves demand 6 gold. They have not seen your hidden studies or condition. ${escorted} Fighting is optional; the danger was shown in your road plan.`, choices: [choice('avoid', 'Take a quiet detour', 'Spend 1 extra day. Pass safely without a payment or battle.'), choice('bribe', 'Pay the demanded toll', 'Pay 6 gold once; proceed without a battle.'), choice('fight', 'Stand and fight', 'Face road bandits in real party combat. Defeat remains survivable.'), choice('turn_back', 'Return to the last waypoint', 'Spend 1 day returning. End this journey and retain the known waypoint.')] },
    beasts: { title: 'Eyes beyond the roadside', body: `Wild beasts stalk the road to ${to}. Their tracks warn you before an attack. ${escorted} You can preserve your life and profession by choosing a safer route.`, choices: [choice('avoid', 'Wait for the hunting trail to clear', 'Spend 1 extra day, safely. No combat reward is awarded.'), choice('supplies', 'Leave some of your packed provisions', 'With paid departure supplies, divert the beasts without further cost.'), choice('fight', 'Protect the party through combat', 'Face road beasts in real turn-based combat.'), choice('turn_back', 'Return to the last waypoint', 'Spend 1 day returning, then end this journey.')] },
    weather: { title: 'Weather closes around the road', body: `A cold squall reaches the road between ${from} and ${to}. The weather is visible before you decide. Pressing on costs bodily health; waiting costs time.`, choices: [choice('shelter', 'Find a dry shelter and wait', 'Spend 1 extra day and recover 2 HP. There is no gold cost.'), choice('press', 'Press on through the squall', `Lose ${journey.plan.supplies ? 1 : 3} HP, never below 1. Packed provisions soften the exposure.`), choice('turn_back', 'Return to the last waypoint', 'Spend 1 day returning; end this journey.')] },
    caravan: { title: 'A caravan keeping the same road', body: `${name}, a caravan driver, shares news of ${to}. The meeting follows this actual road; it does not reveal secrets you never disclosed.`, choices: [choice('share', 'Share a meal and road stories', 'Gain 3 happiness and reduce stress by 3. No time or gold cost.'), choice('trade', 'Buy useful cloth from the wagon', 'Pay 4 gold once for 2 cloth, if you keep crafting materials.'), choice('continue', 'Wish them a safe journey', 'Continue without a cost or reward.')] },
    witness: { title: 'A witness with their own account', body: `${name} has come from ${to}. They describe local custom: ${state.world.culture} At ${to}, necromancy is ${place(state, leg?.to)?.necromancyLaw || 'subject to local rules'}. Hearing this account does not create evidence against you.`, choices: [choice('listen', 'Listen without demanding a confession', 'Record the account and gain 1 village trust. No hidden condition is exposed.'), choice('continue', 'Keep to your own road', 'Continue without a cost or change in standing.')] },
    sick_traveler: { title: 'Someone needs a quieter pace', body: `${name}, a traveler bound for ${to}, is feverish and asks for practical help. Their illness is not a judgment on their character. You can help freely, offer an herb, or keep traveling.`, choices: [choice('aid', 'Stay and help them reach a sheltered track', 'Spend 1 day. Give practical care without a fee; gain 2 village trust.'), choice('herb', 'Offer one healing herb', 'Use 1 herb and gain 2 village trust. No extra days.'), choice('continue', 'Explain your limits and continue', 'Continue without a penalty or an imposed obligation.')] },
    messenger: { title:'The seal and the broken strap', body:`${name}, a courier on the road to ${to}, has a broken satchel strap and a sealed letter. They need help with the strap, not a reader for the letter.`, choices:[choice('aid','Repair the strap and walk with them','Spend 1 day; gain 2 village trust.'),choice('ask','Exchange public news of the road','Gain 1 scholarship on your first such meeting along this road.'),choice('extort','Demand their coin before returning the satchel','Take 6 gold; the courier tells the next settlement, costing 3 village trust.'),choice('continue','Leave the seal and the courier alone','Continue without a cost.')] },
    pilgrims: { title:'The bells carried by hand', body:`${name} leads a small pilgrim household toward ${to}. Their bell is wrapped in cloth for those who cannot bear its sound. They invite you to share a prayer or a little food.`, choices:[choice('pray','Listen to their household prayer','Gain 1 devotion on your first meeting of pilgrims along this road. No faith is imposed.'),choice('offering','Contribute to the shared food','Pay 3 gold once; gain 2 village trust.'),choice('continue','Offer a farewell and keep walking','Continue without a cost.')] },
    grave_robber: { title:'Fresh earth beneath the mile stone', body:`${name}, a keeper of the Order’s burial field, confronts a treasure hunter beside an opened roadside grave. The hunter offers you a share if you help carry the grave goods away. The keeper will remember what they see.`, choices:[choice('refuse','Side with the keeper and leave the dead their goods','Gain 1 standing with the Order.'),choice('join','Take the hunter’s share and leave','Gain 4 gold; lose 3 Order standing. The keeper witnesses your choice.'),choice('study','Record the exposed inscription, then cover it','Gain 1 scholarship the first time you study this road’s burial inscription.'),choice('continue','Pass without becoming involved','Continue without a reward.')] },
    fortune: { title:'A future in the cracked cup', body:`${name} lays weathered divining pieces beside a cold fire between ${from} and ${to}. They offer a reading, but admit the symbols cannot force any future to occur.`, choices:[choice('study','Ask how they learned to read the symbols','Gain 1 arcana on your first meeting with a reader along this road.'),choice('reading','Pay for a reading and a cup of tea','Pay 2 gold once; gain 3 happiness and lose 2 stress. Your fate remains unwritten.'),choice('continue','Keep your future to yourself','Continue without a cost.')] },
    wagon: { title:'The wheel in the ditch', body:`${name} stands beside a loaded wagon. The axle can be repaired, but the driver cannot hold it and bind it alone. They also offer 4 gold to anyone willing to shoulder a heavy crate while they work.`, choices:[choice('aid','Help repair the axle','Spend 1 day; gain 2 village trust.'),choice('labor','Carry the heavy crate for the offered wage','Earn 4 gold and lose 1 HP, never below 1.'),choice('continue','Explain that you cannot stop today','Continue without a penalty.')] },
    relic: { title:'A votive bowl in the rain', body:`${name}, the keeper of a wayside Order shrine, watches travelers choose what to leave in a small votive bowl. Some give coin; some simply sit in silence. The shrine’s repair fund lies within easy reach.`, choices:[choice('donate','Leave 4 gold for the leaking roof','Pay once; gain 2 standing with the Order.'),choice('pocket','Take 5 gold from the repair fund','Gain 5 gold; the keeper sees you, costing 3 Order standing.'),choice('rest','Sit in silence beneath the broken eaves','Reduce stress by 2. No gold or faith is required.'),choice('continue','Keep to the road','Continue without a cost.')] },
    lore: { title: 'An old mark on the roadside stone', body: `A weathered stone between ${from} and ${to} carries a local inscription. ${state.world.culture} You can record a piece of this region’s lived history; it does not establish a new universal law.`, choices: [choice('record', 'Record what the inscription actually says', 'Gain 1 scholarship the first time this road’s inscription is recorded. Add a lasting journal entry.'), choice('continue', 'Let the old stone keep its silence', 'Continue without a cost.')] },
  };
  const selected = data[pending.type];
  if(pending.type==='weather'&&pending.account){const rough=/rain|snow|storm|fog|mist|wind|frost|ash|spore/i.test(pending.account.weather),weather=String(pending.account.weather||''),Weather=weather.charAt(0).toUpperCase()+weather.slice(1),party=state.companions?.some(p=>p.recruited&&p.active&&p.alive!==false);selected.title=rough?'The weather on this stretch':'An exposed stretch of road';selected.body=`Between ${from} and ${to}, the road crosses an exposed bank. ${rough?`${Weather} limits the open crossing.`:`The air brings ${weather}; the bank still gives little shelter.`} Waiting lets ${party?'the party':'you'} find a sheltered crossing. Pressing on costs bodily health; taking cover costs time.`;selected.choices[0]={...selected.choices[0],label:'Wait and find a sheltered crossing'};selected.choices[1]={...selected.choices[1],label:'Cross the exposed stretch now'};}
  return { id: `travel_${pending.type}`, ...selected,body:pending.account?describeRoadAccount(pending.account,selected.body):selected.body, choices: selected.choices.filter(option => !['fight','extort','join','pocket'].includes(option.id) || state.age >= 16).map(option => PAID[option.id] && state.hero.gold < PAID[option.id] ? { ...option, disabledReason: `Requires ${PAID[option.id]} gold` } : option) };
}

export function onTravelLeg(state, { actualDays = 0, legIndex = state.timeline?.journey?.legIndex } = {}, ctx = {}) {
  const journey = state.timeline?.journey, leg = journey?.legs?.[legIndex];
  if (!state.travel || !journey || !leg || actualDays <= 0 || leg.checked || state.travel.pending || state.phase === 'retired') return false;
  if(journey.energyVersion===1&&state.trail&&Number.isInteger(leg.energyBaseRisk)){leg.risk=Math.min(45,leg.energyBaseRisk+travelEnergyView(state).danger);leg.encounterRisk=Math.min(60,leg.risk+12);}
  leg.checked = true;
  const roll = seededRoll(state.seed, `${journey.id}:leg:${legIndex}:meeting`, 100);
  let type = null;
  if (roll < leg.risk) {
    const wild = state.world.locations.some(p=>[leg.from,leg.to].includes(p.id)&&/forest|marsh|mountain|wild|grove/.test(p.type+' '+(p.biome||'')));
    let candidates = wild ? ['beasts', 'weather', 'bandits'] : ['bandits', 'weather'];
    const varied=candidates.filter(value=>!(state.travel.recentEncounters || []).slice(-2).includes(value));if(varied.length)candidates=varied;
    type = candidates[seededRoll(state.seed, `${journey.id}:leg:${legIndex}:danger`, candidates.length)];
  } else if (roll < leg.encounterRisk) {
    const recent=(state.travel.recentEncounters || []).slice(-3);
    const candidates=types.filter(value=>!['bandits','beasts','weather'].includes(value)&&!recent.includes(value));
    type=candidates[seededRoll(state.seed,`${journey.id}:leg:${legIndex}:meeting-type`,candidates.length)];
  }
  leg.encounterKey = type;
  if (!type) return false;
  state.travel.pending = { eventId: `travel_${type}`, type, journeyId: journey.id, legId: `${legIndex}:${leg.from}:${leg.to}`, legIndex, stage: 'decision', choiceId: null, remainingDays: 0, costPaid: 0 };
  state.travel.recentEncounters=[...(state.travel.recentEncounters || []),type].slice(-6);
  const roles={caravan:'merchant',witness:'wanderer',sick_traveler:'wanderer',messenger:'scout',pilgrims:'shrine keeper',grave_robber:'shrine keeper',fortune:'scholar',wagon:'merchant',relic:'shrine keeper'};
  if(roles[type]){const id=`road-person-${seededRoll(state.seed,`${journey.id}:${legIndex}`,1000000000)}`,age=23+seededRoll(state.seed,`${id}:age`,43);state.travel.pending.person={id,age,...generateCharacter(state.seed,id,{role:roles[type],age})};}
  state.travel.pending.account=captureRoadAccount(state,state.travel.pending);
  flushTravelEvent(state, ctx);
  return true;
}

export function flushTravelEvent(state, ctx = {}) {
  const pending = state.travel?.pending;
  if (!pending || pending.stage === 'battle' || waiting(state) || state.dungeon || ctx.pendingNeed?.()) return false;
  const data = scene(state, pending);
  ctx.setEvent?.(data.id, data.title, 'On the road', data.body, data.choices);
  return !!state.event;
}
function finishResponse(state, ctx, text, result) {
  const pending = state.travel.pending;
  const road=pending?roadReceipt(state,pending,result,state.timeline.journey?scene(state,pending).choices.find(c=>c.id===result)?.label:undefined):null;
  state.travel.pending = null;
  record(state, ctx, 'A meeting became part of the road', text, result || pending?.type,road);
}
function progressResponse(state, ctx) {
  const pending = state.travel.pending, oldDay = state.day;
  const reported = ctx.spendDays?.(pending.remainingDays, { outdoors: false });
  if (state.phase === 'retired') { state.travel.pending = null; return; }
  const actual = Math.min(pending.remainingDays, Math.max(0, state.day - oldDay), Number.isFinite(reported) ? Math.max(0, reported) : Infinity);
  pending.remainingDays -= actual;
  if (pending.remainingDays > 0) { state.notice = `Your road response pauses with ${pending.remainingDays} days left. Its fee will not be charged again.`; flushTravelEvent(state, ctx); return; }
  if (pending.choiceId === 'turn_back') { state.timeline.journey = null; finishResponse(state, ctx, 'You returned to the last known waypoint. The trip ended; committed supplies and road fees were not refunded.', 'returned'); }
  else {
    if (pending.choiceId === 'shelter') state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 2);
    if (pending.choiceId === 'aid') ctx.standing?.('villagers', 2);
    finishResponse(state, ctx, pending.choiceId === 'aid' ? (pending.type==='wagon'?`You spent a day helping ${encounterName(state,pending)} repair their axle. The wagon can carry its household onward.`:pending.type==='messenger'?`You repaired ${encounterName(state,pending)}’s satchel strap and left the sealed letter unread.`:'You spent a day helping a feverish traveler reach shelter. Their consent and your practical help are remembered.') : 'You completed the safe road response. The same planned leg can continue without another encounter check.', pending.choiceId);
  }
}
function delayResponse(state, ctx, pick, days) {
  state.travel.pending.stage = 'delay';
  state.travel.pending.choiceId = pick;
  state.travel.pending.remainingDays = days;
  progressResponse(state, ctx);
}

export function applyTravelChoice(state, eventId, pick, ctx = {}) {
  const pending = state.travel?.pending, journey = state.timeline?.journey;
  if (!pending || !journey || journey.id !== pending.journeyId || pending.stage === 'battle') return false;
  const data = scene(state, pending);
  if (eventId !== data.id || !data.choices.some(option => option.id === pick)) return false;
  if (state.event?.id === eventId) state.event = null;
  if (waiting(state)) return false;
  if (pending.stage === 'delay') {
    if (pick === 'abandon') { state.timeline.journey = null; finishResponse(state, ctx, 'You abandoned the remaining road work and ended this trip at the last waypoint. Already committed supplies and fees remain spent.', 'abandoned'); }
    else progressResponse(state, ctx);
    return true;
  }
  if (pick === 'fight') {
    if (!ctx.startBattle) { flushTravelEvent(state, ctx); return true; }
    pending.stage = 'battle'; pending.choiceId = pick;
    ctx.startBattle(pending.type === 'beasts' ? 'road_beasts' : 'road_bandits', { kind: 'travel', journeyId: pending.journeyId, legId: pending.legId, encounterKey: pending.type });
    if (!state.battle) { pending.stage = 'decision'; pending.choiceId = null; flushTravelEvent(state, ctx); }
    return true;
  }
  if (['avoid', 'shelter', 'aid', 'turn_back'].includes(pick)) { delayResponse(state, ctx, pick, 1); return true; }
  if(['offering','reading','donate'].includes(pick)) {
    const cost={offering:3,reading:2,donate:4}[pick];
    if(state.hero.gold<cost){state.notice=`You need ${cost} gold. A free choice remains available.`;flushTravelEvent(state,ctx);return true;}
    state.hero.gold-=cost;pending.costPaid=cost;
    if(pick==='offering')ctx.standing?.('villagers',2);
    if(pick==='donate')ctx.standing?.('order',2);
    if(pick==='reading'&&state.life){state.life.happiness=clamp(state.life.happiness+3,0,100);state.life.stress=clamp(state.life.stress-2,0,100);}
  } else if(['extort','join','pocket','labor'].includes(pick)) {
    state.hero.gold+={extort:6,join:4,pocket:5,labor:4}[pick];
    if(pick==='labor')state.hero.hp=Math.max(1,state.hero.hp-1);
    else {ctx.standing?.(pick==='extort'?'villagers':'order',-3);companionOpinion(state,pick==='extort'?'cruelty':'greed',ctx);}
  } else if(pick==='refuse')ctx.standing?.('order',1);
  else if(pick==='rest'&&state.life)state.life.stress=clamp(state.life.stress-2,0,100);
  else if(['ask','pray','study'].includes(pick)) {
    const leg=journey.legs[pending.legIndex],key=[pending.type,...[leg.from,leg.to].sort()].join(':');
    state.travel.insights ||= [];
    if(!state.travel.insights.includes(key)&&state.travel.insights.length<128){state.travel.insights.push(key);const skill=pending.type==='pilgrims'?'devotion':pending.type==='fortune'?'arcana':'scholarship';state.hero.skills[skill]=(state.hero.skills[skill] || 0)+1;}
  }
  if (pick === 'bribe' || pick === 'trade') {
    const cost = pick === 'bribe' ? 6 : 4;
    if (state.hero.gold < cost || pick === 'trade' && !state.equipment?.materials) { state.notice = pick === 'trade' && !state.equipment?.materials ? 'You have no materials inventory for that trade; sharing a meal remains free.' : `You need ${cost} gold. The free route remains available.`; flushTravelEvent(state, ctx); return true; }
    state.hero.gold -= cost; pending.costPaid = cost;
    if (pick === 'trade') state.equipment.materials.cloth += 2;
  } else if (pick === 'supplies' && !journey.plan.supplies) { state.notice = 'Packed provisions were not part of this departure. Waiting safely remains free.'; flushTravelEvent(state, ctx); return true; }
  else if (pick === 'herb') {
    if (!(state.flags.herbs > 0)) { state.notice = 'You have no healing herb; practical care remains free.'; flushTravelEvent(state, ctx); return true; }
    state.flags.herbs--; ctx.standing?.('villagers', 2);
  } else if (pick === 'press') state.hero.hp = Math.max(1, state.hero.hp - (journey.plan.supplies ? 1 : 3));
  else if (pick === 'share' && state.life) { state.life.happiness = clamp(state.life.happiness + 3, 0, 100); state.life.stress = clamp(state.life.stress - 3, 0, 100); }
  else if (pick === 'listen') ctx.standing?.('villagers', 1);
  else if (pick === 'record') {
    const leg = journey.legs[pending.legIndex], discovery = [leg.from, leg.to].sort().join(':');
    if (!state.travel.discoveries.includes(discovery)) { state.travel.discoveries.push(discovery); state.hero.skills.scholarship = (state.hero.skills.scholarship || 0) + 1; }
  }
  finishResponse(state, ctx, `On the road from ${place(state, journey.legs[pending.legIndex].from)?.name} to ${place(state, journey.legs[pending.legIndex].to)?.name}, you chose “${data.choices.find(option => option.id === pick).label}.” ${pending.costPaid ? `${pending.costPaid} gold was paid once. ` : ''}The meeting is resolved; the same leg will not reroll.`, pick);
  return true;
}

export function afterTravelBattle(state, context, outcome, ctx = {}) {
  const pending = state.travel?.pending;
  if (!pending || pending.stage !== 'battle' || context?.kind !== 'travel' || context.journeyId !== pending.journeyId || context.legId !== pending.legId || context.encounterKey !== pending.type || !['victory', 'defeat', 'retreat'].includes(outcome)) return false;
  // Engine has already applied actual battle resources, rewards, and recovery.
  finishResponse(state, ctx, outcome === 'victory' ? 'Your party resolved the road danger through combat. The surviving journey continues on the same checked leg.' : outcome === 'defeat' ? 'You survived the road fight and its recovery costs. The planned journey remains; no new encounter is rolled on this leg.' : 'You withdrew from the road fight. A safe detour lets the surviving journey continue without combat rewards or a second encounter check.', outcome);
  return true;
}

export function travelActions(state) {
  if (!state.travel || waiting(state)) return [];
  if (state.travel.pending?.stage === 'delay') return [{ id: 'travel_continue_response', label: 'Continue the road response', description: `Only ${state.travel.pending.remainingDays} remaining days are spent; already paid costs are not charged again.`, days: 0, durationDays: state.travel.pending.remainingDays, cost: 0, group: 'Travel' }];
  return campingActions(state);
}
export function applyTravelAction(state, id, ctx = {}) {
  if(id==='trail_camp')return applyCampingAction(state,id,ctx);
  if (id !== 'travel_continue_response' || waiting(state) || state.travel?.pending?.stage !== 'delay') return false;
  progressResponse(state, ctx); return true;
}
export function travelEventIds() {
  return { travel_bandits: ['avoid', 'bribe', 'fight', 'turn_back'], travel_beasts: ['avoid', 'supplies', 'fight', 'turn_back'], travel_weather: ['shelter', 'press', 'turn_back'], travel_caravan: ['share', 'trade', 'continue'], travel_witness: ['listen', 'continue'], travel_sick_traveler: ['aid', 'herb', 'continue'], travel_lore: ['record', 'continue'], travel_messenger:['aid','ask','extort','continue'],travel_pilgrims:['pray','offering','continue'],travel_grave_robber:['refuse','join','study','continue'],travel_fortune:['study','reading','continue'],travel_wagon:['aid','labor','continue'],travel_relic:['donate','pocket','rest','continue'],travel_delay: ['continue', 'abandon'] };
}
export function travelEncounterPerson(state) { return state.travel?.pending?.person ? structuredClone(state.travel.pending.person) : null; }
export function travelView(state) {
  return { summary: 'Road plans are settings until departure. Prices, actual days, and dangerous encounter chances are shown before commitment; each traveled leg is checked once.', plan: normalizeTravelPlan(state.travel?.plan), pending: state.travel?.pending ? { ...state.travel.pending } : null, history: (state.travel?.history || []).map(entry => ({ ...entry })), discoveries: [...(state.travel?.discoveries || [])] };
}

const integer = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
const validPlan = value => value && ['steady', 'cautious', 'fast'].includes(value.pace) && ['supplies', 'scout', 'escort', 'night'].every(key => typeof value[key] === 'boolean');
export function validateTravel(value, state) {
  if (!value || !validPlan(value.plan) || !integer(value.journeys) || !Array.isArray(value.history) || value.history.length > 120 || !Array.isArray(value.discoveries) || value.discoveries.length > 128 || new Set(value.discoveries).size !== value.discoveries.length) return false;
  const validLocation = id => typeof id === 'string' && (!state || !!place(state, id));
  if(value.routePreference!==undefined&&roadPreference(value.routePreference)!==value.routePreference)return false;
  if (!value.history.every(entry => entry && typeof entry.id === 'string' && integer(entry.day) && (!state || entry.day <= state.day) && validLocation(entry.locationId) && typeof entry.title === 'string' && typeof entry.text === 'string'&&(entry.road===undefined||validRoadReceipt(entry.road,entry,state)))) return false;
  if (!value.discoveries.every(key => typeof key === 'string' && key.split(':').length === 2 && key.split(':').every(validLocation))) return false;
  if(value.recentEncounters!==undefined&&(!Array.isArray(value.recentEncounters)||value.recentEncounters.length>6||!value.recentEncounters.every(type=>types.includes(type))))return false;
  if(value.insights!==undefined&&(!Array.isArray(value.insights)||value.insights.length>128||new Set(value.insights).size!==value.insights.length||!value.insights.every(key=>typeof key==='string'&&key.split(':').length===3&&types.includes(key.split(':')[0])&&key.split(':').slice(1).every(validLocation))))return false;
  const journey = state?.timeline?.journey;
  if (journey?.legs) {
    if (typeof journey.id !== 'string' || !validPlan(journey.plan) || !integer(journey.departureCost) || !Array.isArray(journey.route) || journey.route.length < 2 || !journey.route.every(validLocation) || !Array.isArray(journey.legs) || journey.legs.length !== journey.route.length - 1 || !integer(journey.legIndex, 0, journey.legs.length - 1) || !integer(journey.legProgress)) return false;
    for (let index = 0; index < journey.legs.length; index++) {
      const leg = journey.legs[index];
      if (!leg || leg.from !== journey.route[index] || leg.to !== journey.route[index + 1] || !integer(leg.totalDays, 1, 365) || !integer(leg.danger, 1, 6) || !integer(leg.risk, 0, 45) || !integer(leg.encounterRisk, leg.risk, 60) || typeof leg.checked !== 'boolean' || !(leg.encounterKey === null || types.includes(leg.encounterKey)) || !leg.checked && leg.encounterKey !== null) return false;
    }
    if (journey.legProgress > journey.legs[journey.legIndex].totalDays) return false;
  }
  if (value.pending === null) return true;
  const pending = value.pending;
  if (!pending || !types.includes(pending.type) || pending.eventId !== `travel_${pending.type}` || typeof pending.journeyId !== 'string' || typeof pending.legId !== 'string' || !integer(pending.legIndex) || !['decision', 'battle', 'delay'].includes(pending.stage) || !(pending.choiceId === null || typeof pending.choiceId === 'string') || !integer(pending.remainingDays, 0, 1) || !integer(pending.costPaid, 0, 6)) return false;
  if(pending.person!==undefined&&(!pending.person||typeof pending.person.id!=='string'||typeof pending.person.name!=='string'||pending.person.name.length>80||!integer(pending.person.age,18,100)||!['he/him','she/her','they/them'].includes(pending.person.pronouns)||!isCanonicalAppearance(pending.person.appearance)))return false;
  if(pending.account!==undefined&&!validRoadAccount(pending.account,pending,state))return false;
  if (pending.stage === 'decision' && (pending.choiceId !== null || pending.remainingDays !== 0 || pending.costPaid !== 0) || pending.stage === 'battle' && (pending.choiceId !== 'fight' || !['bandits', 'beasts'].includes(pending.type) || pending.remainingDays !== 0 || pending.costPaid !== 0) || pending.stage === 'delay' && (pending.remainingDays < 1 || !['avoid', 'shelter', 'aid', 'turn_back'].includes(pending.choiceId) || pending.costPaid !== 0)) return false;
  if (pending.choiceId && !travelEventIds()[pending.eventId]?.includes(pending.choiceId)) return false;
  if (state) {
    const leg = journey?.legs?.[pending.legIndex];
    if (!leg || pending.journeyId !== journey.id || pending.legIndex !== journey.legIndex || pending.legId !== `${pending.legIndex}:${leg.from}:${leg.to}` || !leg.checked || leg.encounterKey !== pending.type) return false;
    if (pending.stage === 'battle' && (state.battle?.context?.kind !== 'travel' || state.battle.context.journeyId !== pending.journeyId || state.battle.context.legId !== pending.legId)) return false;
  }
  return true;
}
