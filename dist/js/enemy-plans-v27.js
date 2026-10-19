import {validHumanDuelPlan} from './tournament-duel-rules.js';
import { resolveEnemyTargets } from './enemy-targets.js';
import { applyStatus } from './combat-rules.js';
import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
const designs=ENCOUNTER_DESIGN_V27.species;
const wardValue=value=>Number.isFinite(value)?Math.max(0,value):0;
const bossCycles={
 shut_gate_ferryman:[{action:'ritual',target:'self',amount:1},{action:'wave',target:'all_party',amount:-2},{action:'charged_strike',target:'most_injured',amount:3}],
 watch_that_never_ends:[{action:'ward_siphon',target:'most_warded',amount:6},{action:'precision_strike',target:'last_target',amount:2},{action:'ward',target:'self',amount:4}],
 captain_without_shore:[{action:'mark_prey',target:'largest_magic'},{action:'pack_strike',target:'marked_prey',amount:3},{action:'wave',target:'all_party',amount:-3}],
 glass_tide_witness:[{action:'predict',target:'largest_magic'},{action:'precision_strike',target:'last_target',amount:4}],
 unfinished_son:[{action:'charge',target:'self'},{action:'charged_strike',target:'highest_armor',amount:5},{action:'ward',target:'self',amount:4}],
 furnace_widow:[{action:'ritual',target:'self'},{action:'burning_wave',target:'all_party',amount:-1},{action:'strike',target:'most_injured'}],
 mother_empty_nests:[{action:'ward',target:'most_injured_enemy',amount:5},{action:'heal',target:'self',amount:7},{action:'wave',target:'all_party',amount:-3}],
 orchard_wife:[{action:'ward',target:'self',amount:6},{action:'ambush',target:'largest_magic',amount:3},{action:'fear_strike',target:'unafraid_party',amount:2}],
 saltless_captain:[{action:'ward',target:'all_enemies',amount:4},{action:'mark_prey',target:'least_armored'},{action:'pack_strike',target:'marked_prey',amount:3}],
 crown_beneath_ash:[{action:'ally_ward_transfer',target:'most_warded_enemy',amount:5},{action:'charged_strike',target:'protector',amount:4},{action:'wave',target:'all_party',amount:-3}],
 listener_drowned_door:[{action:'seal_last_technique',target:'last_attacker'},{action:'ward',target:'self',amount:6},{action:'wave',target:'all_party',amount:-4}],
 guest_would_not_leave:[{action:'ritual',target:'self'},{action:'drain_and_share',target:'most_injured',amount:3},{action:'strike',target:'least_warded'}],
};
const phrases={mark_prey:'Marks one exposed ally; defending clears the prey mark.',pack_strike:'Strikes marked prey. Living pack members add power; defeating one or defending reduces it.',charge:'Winds up a charged strike; a counter or disruption removes the charge.',charged_strike:'Spends its remaining charge on a heavy strike. Guard or disrupt it first.',poisoning_strike:'Strikes and poisons flesh. Cleansing removes poison.',strike:'Strikes its visible target. Guard draws and reduces the blow.',drain:'Restores only half of actual health taken. A ward reduces both damage and recovery.',weakening_strike:'Strikes and weakens the next attack. Cleansing removes the web.',ambush:'Hits the largest magic reserve. Inspection removes the opening ambush bonus.',guard_breaking_strike:'Removes a small ward before striking the protector. Re-ward or intercept.',ward:'Gives the announced ward to living allies, bounded at 40.',conditional_drain:'Drains only if its target is below half health. Heal or ward the exposed ally.',ritual:'Prepares a visible ritual charge. A disruption or elemental counter cancels it.',wave:'Strikes all living party members. Defending and wards protect each ally.',pursuit_strike:'Returns to its last living target; a protector can draw the strike.',disrupt:'Removes part of a protector’s ward and weakens the next strike.',mana_drain:'Takes up to three actual MP from the largest current reserve.',fear_strike:'Strikes and weakens an unafraid ally. Rally or cleansing removes fear.',burning_strike:'Strikes and leaves a two-action burn. Ice and cleansing clear it.',precision_strike:'Aims at the marked or remembered ally. Inspection or a marked counter removes its bonus.',ward_siphon:'Takes an existing ward into a visible charge; a counter discards stolen power.',heal:'Restores bounded health only while a living root supporter or root ward remains.',poisoning_wave:'A low party pulse spreads poison. Party cleansing clears it.',ally_ward_transfer:'Moves existing ward from a living ally; no ward is created by the transfer.',predict:'Names a party actor as the next target. Inspection breaks the prediction.',seal_last_technique:'Seals the last damaging technique for one action. Other attacks and support remain.',drain_and_share:'A prepared cup transfers actual drained health to a living ally. Sacred disruption breaks the cup.',burning_wave:'Spends an intact breath charge on a party burn. Ice or disruption cancels the breath.'};
export function attachEnemyPlan(enemy,speciesId,{bossId}={}){
 const d=designs.find(d=>d.id===speciesId);if(!d)return enemy;
 const boss=ENCOUNTER_DESIGN_V27.bosses.find(b=>b.id===bossId);
 const weakness=boss?.weakness||d.weakness;
 return {...enemy,planId:d.id,planCycle:structuredClone(boss?bossCycles[boss.id]:d.cadence.cycle),resistances:[...(d.resistances||[])],weakness:weakness==='sacred'?'radiance':weakness,aiStep:0,...(boss?{bossId:boss.id,phasePlan:structuredClone(boss.phase)}:{})};
}
export function planIntent(actor){const p=actor.planCycle?.[(actor.aiStep||0)%actor.planCycle.length];if(!p)return null;const broken=!actor.status?.charged&&['burning_wave','drain_and_share'].includes(p.action)?'The prepared charge is broken; its next ritual action has no effect.':!actor.status?.charged&&p.action==='charged_strike'?'The charge is broken. Its next heavy strike retains base power, with no charged bonus.':null;return (broken||phrases[p.action]||'A visible attack.')+(p.amount?` Modifier ${p.amount>0?'+':''}${p.amount}.`:'')+(actor.status?.phaseTriggered?' Its announced second phase is active.':'');}
export function executeEnemyPlan(b,actor,h){
 if(!actor.planCycle?.length)return false;
 const allies=b.actors.filter(a=>a.side==='party'&&a.hp>0),foes=b.actors.filter(a=>a.side==='enemy'&&a.hp>0);if(!allies.length)return true;
 if(actor.phasePlan&&!actor.status.phaseTriggered&&actor.hp<=actor.maxHp*actor.phasePlan.thresholdPct/100){
  actor.status.phaseTriggered=true;h.log(actor.phasePlan.telegraph+' '+actor.phasePlan.change);
  switch(actor.bossId){case 'shut_gate_ferryman':actor.status.ward=Math.max(0,(actor.status.ward||0)-3);actor.status.phaseBonus=2;break;case 'watch_that_never_ends':actor.status.ward=Math.min(40,(actor.status.ward||0)+8);break;case 'unfinished_son':actor.status.exposedArmor=2;actor.status.phaseBonus=3;break;case 'furnace_widow':actor.status.ward=Math.min(40,(actor.status.ward||0)+6);break;case 'glass_tide_witness':actor.status.marked=1;break;case 'mother_empty_nests':actor.status.marked=2;break;case 'saltless_captain':{const c=foes.find(a=>a.id!==actor.id);if(c){c.status.surrenderable=true;h.log(c.name+' asks to surrender. A living surrender is now offered.');}break;}case 'crown_beneath_ash':actor.status.exposedArmor=1;break;default:actor.status.phaseBonus=2;}
 }
 const selection=resolveEnemyTargets(b,actor,{planned:true}),p=selection.plan,target=selection.target;
 const amount=Number.isFinite(p.amount)?p.amount:0,base=actor.attackPower||5,ward=(a,n)=>{a.status.ward=Math.min(40,wardValue(a.status.ward)+wardValue(n));h.log(`${a.name} gains ${n} ward.`);};
 const stopped=()=>h.stopped?.()||false;
 const heal=(a,n)=>{if(stopped())return 0;const restored=h.heal?h.heal(a,n):Math.min(a.maxHp-a.hp,n);if(!h.heal)a.hp+=restored;return restored;};
 const strike=(a,n=base+amount)=>stopped()?0:h.damage(actor,a,n,{pierce:actor.role==='spirit'});
 const wave=(status)=>{for(const a of selection.recipients){if(stopped())break;strike(a,Math.max(2,base+amount));if(!stopped()&&a.hp>0&&status){applyStatus(a,status,2,2,h.log);}}};
 if(actor.status.silenced&&['ritual','wave','burning_wave','mana_drain','seal_last_technique'].includes(p.action)){h.log(actor.name+'’s prepared magic is silenced for this action.');delete actor.status.silenced;actor.aiStep=(actor.aiStep||0)+1;actor.intent=planIntent(actor);return true;}
 switch(p.action){
  case 'mark_prey':target.status.pack_mark=1;h.log(actor.name+' marks '+target.name+' as prey.');break;
  case 'predict':actor.status.charged=4;h.log(actor.name+' aims at '+target.name+'.');break;
  case 'charge':case 'ritual':actor.status.charged=Math.max(1,amount||4);h.log(actor.name+' prepares a visible charge.');break;
  case 'ward':for(const a of selection.recipients)ward(a,Math.max(1,amount));break;
  case 'heal':if((actor.status.ward||0)>0||foes.some(a=>a.id!==actor.id)){const restored=heal(actor,amount||6);h.log(actor.name+' recovers '+restored+' health from its remaining support.');}else h.log('The broken support cannot regenerate '+actor.name+'.');break;
  case 'ward_siphon':{const n=Math.min(amount||5,target.status.ward||0);target.status.ward=Math.max(0,(target.status.ward||0)-n);actor.status.stolenWard=n;h.log(actor.name+' takes '+n+' actual ward.');break;}
  case 'ally_ward_transfer':{const donor=selection.donor,available=wardValue(donor?.status.ward),n=Math.min(Math.max(0,amount||4),available);if(donor)donor.status.ward=available-n;ward(actor,n);actor.status.charged=n;break;}
  case 'mana_drain':{const n=Math.min(target.mp,amount||3);target.mp-=n;h.log(actor.name+' takes '+n+' actual MP from '+target.name+'.');strike(target,Math.max(2,base-2));break;}
  case 'seal_last_technique':if(b.lastDamagingAction){target.status.sealed=1;target.sealedTechnique=b.lastDamagingAction;h.log(target.name+'’s '+b.lastDamagingAction+' is sealed for one action.');}else strike(target,Math.max(2,base-2));break;
  case 'wave':wave();if(stopped())return true;for(const a of allies)if(a.hp>0)applyStatus(a,'weakened',2,undefined,h.log);delete actor.status.charged;break;
  case 'burning_wave':if(actor.status.charged){wave('burn');if(stopped())return true;delete actor.status.charged;actor.status.marked=1;}else h.log(actor.name+'’s broken breath charge cannot become a wave.');break;
  case 'poisoning_wave':wave('poison');break;
  case 'drain':case 'conditional_drain':case 'drain_and_share':{if(p.action==='conditional_drain'&&target.hp>=target.maxHp/2){strike(target,Math.max(2,base-2));break;}if(p.action==='drain_and_share'&&!actor.status.charged){h.log('The broken ritual cup transfers no health.');break;}const n=strike(target);if(stopped())return true;const receiver=selection.recoveryRecipient,restored=heal(receiver,Math.ceil(n/2));h.log(receiver.name+' recovers '+restored+' from actual drained health.');delete actor.status.charged;break;}
  case 'disrupt':target.status.ward=Math.max(0,(target.status.ward||0)-(amount||4));strike(target,base);if(stopped())return true;applyStatus(target,'weakened',3,undefined,h.log);break;
  case 'guard_breaking_strike':target.status.ward=Math.max(0,(target.status.ward||0)-3);strike(target);break;
  case 'charged_strike':{const n=actor.status.charged||0;strike(target,base+amount+n+(actor.status.phaseBonus||0));if(stopped())return true;delete actor.status.charged;delete actor.status.phaseBonus;if(target.defending)applyStatus(actor,'weakened',3,undefined,h.log);break;}
  case 'precision_strike':strike(target,base+amount+(actor.status.charged||0)+(actor.status.stolenWard||0));if(stopped())return true;delete actor.status.charged;delete actor.status.stolenWard;break;
  case 'pack_strike':strike(target,base+amount+(target.status.pack_mark&&!target.defending?Math.min(6,(foes.length-1)*2):0));if(stopped())return true;delete target.status.pack_mark;break;
  case 'ambush':strike(target,base+amount+(actor.aiStep===0&&!actor.status.inspected?3:0));break;
  case 'poisoning_strike':strike(target);if(target.hp>0){applyStatus(target,'poison',2,2,h.log);}break;
  case 'burning_strike':strike(target);if(target.hp>0){applyStatus(target,'burn',2,2,h.log);}break;
  case 'fear_strike':strike(target);if(target.hp>0)applyStatus(target,'fear',3,undefined,h.log);break;
  case 'weakening_strike':strike(target);if(target.hp>0)applyStatus(target,'weakened',Math.max(2,amount),undefined,h.log);break;
  case 'pursuit_strike':case 'strike':strike(target);break;
  default:throw Error('Unimplemented typed enemy action: '+p.action);
 }
 if(stopped())return true;
 delete actor.status.silenced;actor.lastTargetId=target.id;actor.aiStep=(actor.aiStep||0)+1;actor.intent=planIntent(actor);return true;
}
export function validEnemyPlan(actor){if(actor.duelPlanId!==undefined)return validHumanDuelPlan(actor);return actor.planId===undefined||designs.some(d=>d.id===actor.planId)&&Array.isArray(actor.planCycle)&&actor.planCycle.length>=1&&actor.planCycle.length<=8&&actor.planCycle.every(p=>Object.hasOwn(phrases,p.action)&&typeof p.target==='string')&&(!actor.bossId||ENCOUNTER_DESIGN_V27.bosses.some(b=>b.id===actor.bossId));}
