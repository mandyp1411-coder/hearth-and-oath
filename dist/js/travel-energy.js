import { recordMazeUse } from './maze-receipt-runtime.js';
import { seededRoll, isSettlement } from './world.js';

export const CAMP_KITS=[
 {id:'bedroll',name:'Traveller’s Bedroll',nights:2,price:12,description:'A light blanket, groundsheet and two nights of dry supplies.'},
 {id:'tent',name:'Trail Tent',nights:5,price:28,description:'A weatherproof tent with five nights of fuel and bedding.'},
 {id:'expedition',name:'Expedition Camp',nights:10,price:50,description:'A larger camp pack with ten nights of sheltered rest.'},
];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function initializeTravelEnergy(s){if(!s.trail)s.trail={version:1,daysWithoutRest:0,daysTravelled:0,lastRestDay:s.day,kits:[],nextKit:1};}
export function travelEnergyView(s){
 const ratio=s.hero.mp/Math.max(1,s.hero.maxMp),days=s.trail?.daysWithoutRest||0;
 const speed=ratio<=0?3:ratio<.25?2:1;
 const fatalRisk=ratio<=0&&days>=3?Math.min(4,days-2):0;
 return {focus:s.hero.mp,max:s.hero.maxMp,speed,days,fatalRisk,drain:Math.max(2,Math.ceil(s.hero.maxMp*.12)),danger:ratio<=0?20:ratio<.25?10:0,
  kit:s.trail?.kits.find(k=>k.remaining>0)||null,
  summary:speed===3?'Exhausted: each normal travel day takes three days. Continuing without rest can be fatal.':speed===2?'Tired: each normal travel day takes two days, with more danger.':'Rested enough to keep a normal pace.'};
}
export function travelEnergyForecast(s,baseDays){
 let mp=s.hero.mp,days=0;const drain=travelEnergyView(s).drain;
 for(let i=0;i<baseDays;i++){const speed=mp<=0?3:mp/s.hero.maxMp<.25?2:1;days+=speed;mp=Math.max(0,mp-drain*speed);}
 return {days,focusAfter:mp,drain:Math.min(s.hero.mp,drain*days)};
}
export function noteTravelRest(s){if(s.trail){s.trail.daysWithoutRest=0;s.trail.lastRestDay=s.day;}}
function wear(s,days,ctx){
 if(!s.trail||days<1)return;
 const t=s.trail,drain=travelEnergyView(s).drain;
 for(let n=0;n<days&&s.phase!=='retired';n++){
  const exhausted=s.hero.mp<=0;t.daysTravelled++;t.daysWithoutRest++;s.hero.mp=Math.max(0,s.hero.mp-drain);
  if(s.life)s.life.stress=clamp(s.life.stress+(exhausted?4:1),0,100);
  if(exhausted){
   const death=travelEnergyView(s).fatalRisk,roll=seededRoll(s.seed,`trail:${s.dynasty?.generation||1}:${t.daysTravelled}:fatal`,10000);
   if(death&&roll<death*100){ctx.endLife?.('You collapsed from exhaustion on the road after travelling without rest.');return;}
   if(seededRoll(s.seed,`trail:${s.dynasty?.generation||1}:${t.daysTravelled}:injury`,100)<20){const damage=3+seededRoll(s.seed,'trail-injury:'+t.daysTravelled,5);s.hero.hp=Math.max(1,s.hero.hp-damage);ctx.journal?.('Exhaustion on the Trail',`You stumbled while exhausted and lost ${damage} Health. Rest before continuing.`,'travel');}
  }
 }
}
/** One normal day of distance. A partially attended slow step keeps its quote. */
export function progressTravelStep(s,holder,ctx){
 holder.energyStep ||= {totalDays:travelEnergyView(s).speed,progress:0};
 const step=holder.energyStep,deadline=ctx.nextInterruptionDay?.(),budget=Math.min(step.totalDays-step.progress,deadline===null||deadline===undefined?3:Math.max(0,deadline-s.day));let actual=0;
 for(let n=0;n<budget&&s.phase!=='retired';n++){const spent=ctx.spendDays(1,{outdoors:true,night:s.flags?.travelByNight});if(spent!==1)break;step.progress++;actual++;wear(s,1,ctx);if(ctx.pendingNeed?.())break;}
 if(step.progress===step.totalDays){delete holder.energyStep;return {distance:1,days:actual};}
 return {distance:0,days:actual};
}
export function campingReason(s){
 if(!s.trail||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.justice?.prison)return 'Resolve the current moment before making camp.';
 if(s.maze)return 'Find a safe room before resting in a dungeon.';
 if(s.workshop?.project||s.careers?.batch||s.health?.recovery||s.stories?.project||s.conversations?.project||s.pastimes?.project||s.sanctuaries?.commitment||s.life?.plan)return 'Finish or pause your current commitment before camping.';
 if(!s.timeline?.journey&&!s.cartography?.offsite&&!s.cartography?.pending&&isSettlement(s.world,s.locationId))return 'Rest at home or visit the inn while you are in a settlement.';
 return null;
}
export function campingActions(s){
 if(!s.trail)return [];
 const reason=campingReason(s);if(reason)return [];
 const v=travelEnergyView(s),kit=v.kit,focus=Math.ceil(s.hero.maxMp*(kit ? .55 : .2));
 return [{id:'trail_camp',label:kit?'Make Camp':'Rest in the Open',description:kit?`${focus} Focus, 8 Health and −10 Stress. Uses one night from ${CAMP_KITS.find(k=>k.id===kit.kind).name} (${kit.remaining} left).`:`Recover ${focus} Focus, 2 Health and reduce Stress by 3. A camping kit gives much better rest.`,days:1,cost:0,group:'Travel'}];
}
export function applyCampingAction(s,id,ctx){
 if(id!=='trail_camp'||campingReason(s))return false;
 return restAtCamp(s,ctx);
}
const campGain = (current, max, allowance) =>
 Number.isFinite(current) && Number.isFinite(max) && current >= 0 && max >= current
  ? Math.min(allowance, max-current) : 0;
/** A read-only quote. Active slots follow battle preparation; an away companion is not present. */
export function campRecoveryView(s, {party=false, kit=travelEnergyView(s).kit}={}) {
 const health = kit ? 8 : 2, focusRate = kit ? .55 : .2, travellers = [], excluded = [];
 const quote = (p, id) => ({
  id, name:p.name || 'You', hp:campGain(p.hp, p.maxHp, health),
  mp:campGain(p.mp, p.maxMp, Number.isFinite(p.maxMp) ? Math.ceil(p.maxMp*focusRate) : 0),
 });
 travellers.push(quote(s.hero, 'hero'));
 if (party) for (const p of (s.companions || []).filter(p => p.recruited && p.active).slice(0,3)) {
  const status = s.rpg?.companionStages?.[p.id]?.status;
  const reason = p.alive === false || status === 'dead' ? 'deceased'
   : ['away','departed'].includes(status) ? 'not present'
   : !Number.isFinite(p.hp) || p.hp < 0 ? 'Health unavailable' : p.hp === 0 ? 'downed' : null;
  if (reason) excluded.push({id:p.id, name:p.name, reason});
  else travellers.push(quote(p, p.id));
 }
 return {
  travellers, excluded, health, focusRate,
  stress:Number.isFinite(s.life?.stress) ? Math.min(s.life.stress, kit ? 10 : 3) : 0,
  kit:kit ? {id:kit.id, kind:kit.kind, name:CAMP_KITS.find(k => k.id === kit.kind)?.name || 'camp pack', remaining:kit.remaining} : null,
 };
}
const campRecoveryText = v => v.travellers.map(p => `${p.name}: +${p.hp} Health, +${p.mp} Focus`).join('; ');
export function mazeCampDescription(s) {
 const v = campRecoveryView(s, {party:true});
 return `One attended day; ordinary living costs apply. ${campRecoveryText(v)}. Your Stress −${v.stress}. ${v.kit?`Uses one night from ${v.kit.name} (${v.kit.remaining} left).`:'No camp pack used; a pack gives better rest.'} Only present, active living companions recover. Camp does not revive downed or deceased companions.${v.excluded.length?' No recovery: '+v.excluded.map(p=>`${p.name} (${p.reason})`).join('; ')+'.':''}`;
}
export function restAtCamp(s, ctx, {party=false}={}) {
 const kit = travelEnergyView(s).kit, attending = campRecoveryView(s, {party,kit}).travellers.map(p => p.id);
 if (ctx.spendDays(1, {outdoors:!s.maze,night:true}) !== 1 || s.phase === 'retired') return true;
 // Recheck after the attended day: a death/departure cannot turn a quote into a revival.
 const recovery = campRecoveryView(s, {party,kit});
 recovery.travellers = recovery.travellers.filter(p => attending.includes(p.id));
 for (const row of recovery.travellers) {
  const p = row.id === 'hero' ? s.hero : s.companions.find(p => p.id === row.id);
  if (row.hp) p.hp += row.hp;
  if (row.mp) p.mp += row.mp;
 }
 if (s.life) s.life.stress = clamp(s.life.stress-recovery.stress, 0, 100);
 if(s.maze)recordMazeUse(s,'kitNights',kit?1:0);
 if (kit) kit.remaining--;
 noteTravelRest(s);
 s.notice = kit ? `You sleep under shelter. ${kit.remaining} night${kit.remaining===1?'':'s'} remain in this camp pack.` : 'You rest beneath the open sky. A camp pack would give you better shelter.';
 if (party) s.notice += ' '+campRecoveryText(recovery)+'. Camp does not revive downed or deceased companions.';
 if (party) (ctx.journalLiteral || ctx.journal)?.('A Night beside the Trail', s.notice, 'travel', {narrativeEdition:30});
 else ctx.journal?.('A Night beside the Trail', s.notice, 'travel');
 return true;
}
export function addCampingKit(s,kind){const spec=CAMP_KITS.find(k=>k.id===kind);if(!s.trail||!spec||s.trail.kits.filter(k=>k.remaining>0).length>=30)return false;s.trail.kits=s.trail.kits.filter(k=>k.remaining>0);s.trail.kits.push({id:'camp-'+s.trail.nextKit++,kind,remaining:spec.nights});return true;}
export function validateTravelEnergy(s){
 if(s.trail===undefined)return true;const t=s.trail,int=(v,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
 if(!t||t.version!==1||!int(t.daysWithoutRest)||!int(t.daysTravelled)||t.daysWithoutRest>t.daysTravelled||!int(t.lastRestDay,0,s.day)||!int(t.nextKit,1)||!Array.isArray(t.kits)||t.kits.length>30||new Set(t.kits.map(k=>k.id)).size!==t.kits.length)return false;
 if(!t.kits.every(k=>k&&/^camp-\d+$/.test(k.id)&&int(+k.id.slice(5),1,t.nextKit-1)&&CAMP_KITS.some(c=>c.id===k.kind&&int(k.remaining,0,c.nights))))return false;
 for(const holder of [s.timeline?.journey,s.cartography?.pending]){if(holder?.energyVersion!==undefined&&holder.energyVersion!==1)return false;if(holder?.energyStep){const p=holder.energyStep;if(holder.energyVersion!==1||!int(p.totalDays,1,3)||!int(p.progress,0,p.totalDays))return false;}}
 for(const leg of s.timeline?.journey?.legs||[])if(leg.energyBaseRisk!==undefined&&!int(leg.energyBaseRisk,0,45))return false;
 return true;
}
