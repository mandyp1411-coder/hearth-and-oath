// Versioned local competition rules. No monster species or boss script is used.
export const TOURNAMENT_RULES_VERSION=1;
export const TOURNAMENT_PURSE=24;
const profiles={
 watch_guard:{name:'Guard reader',hp:32,attackPower:6,agility:4,armor:1,description:'Raises 5 ward, then makes a controlled strike. Strip the ward or choose when to press.',cycle:[{action:'ward',target:'self',amount:5},{action:'strike',target:'most_injured'}]},
 measured_charge:{name:'Measured charger',hp:36,attackPower:6,agility:3,armor:1,description:'Prepares a visible 4-point charge, then strikes. Inspect, disrupt or defend before the reply.',cycle:[{action:'charge',target:'self',amount:4},{action:'charged_strike',target:'most_injured',amount:0}]},
 counter_step:{name:'Counter-step entrant',hp:34,attackPower:5,agility:6,armor:0,description:'Breaks up to 3 ward before striking, then weakens the next attack by 2. Repeating a ward is not always the best answer.',cycle:[{action:'guard_breaking_strike',target:'protector',amount:0},{action:'weakening_strike',target:'most_injured',amount:2}]},
};
export const HUMAN_DUEL_PROFILE_IDS=Object.freeze(Object.keys(profiles));
export const DUEL_ADVANCED_COMMANDS=Object.freeze(['intercede','shield_rebuke','disabling_riposte','rally_standard','sanctuary_ring','judgment_vow','shared_renewal','purifying_touch','winter_prison','chain_lightning','bramble_circle','rootbound','soul_unmake','smoke_veil','take_opening','hunters_volley','watch_line','discord_chorus','second_wind']);
const core=new Set(['attack','defend','inspect','potion','retreat','weapon_counter','spell_ice','spell_lightning','spell_radiance','steady']);
const skillSpecializations=new Set(['guardian','berserker','knight','paladin','healer','druid','thief','ranger','bard','assassin']);
const tacticSpecializations=new Set(['guardian','berserker','knight','paladin','healer','elementalist','druid','thief','bard']);
export const DUEL_RULES_TEXT='Solo controlled bouts. No companions, summons, venom, burning or bleeding attacks, blood-feeding or draining people, necromantic binding, captures or executions. Permitted moves keep their normal effects and real costs. Zero bout Health means the marshal stops the contest, not a death. No automatic recovery.';
export function humanDuelProfile(id,difficulty='balanced'){
 const p=profiles[id];if(!p||!['gentle','balanced','perilous'].includes(difficulty))return null;
 const change=difficulty==='gentle'?-1:difficulty==='perilous'?1:0;
 return {id,name:p.name,description:p.description,hp:p.hp+change*4,attackPower:p.attackPower+change,agility:p.agility,armor:p.armor,cycle:structuredClone(p.cycle)};
}
export function isTournamentBattle(b){return b?.tournamentRulesVersion===1&&b.context?.kind==='tournament';}
export function duelCommandAllowed(actor,id){
 if(core.has(id))return true;
 if(id==='skill')return actor.specialization?skillSpecializations.has(actor.specialization):['warrior','mage','rogue','healer'].includes(actor.role);
 if(id==='tactic')return actor.specialization?tacticSpecializations.has(actor.specialization):['warrior','mage','healer'].includes(actor.role);
 return typeof id==='string'&&id.startsWith('tech_')&&DUEL_ADVANCED_COMMANDS.includes(id.slice(5));
}
export function tournamentCommandReason(b,id){
 if(!isTournamentBattle(b))return null;
 const actor=b.actors?.find(a=>a.id===b.currentActorId);
 return actor?.id==='hero'&&duelCommandAllowed(actor,id)?null:'Outside the challenge rules: no wounding, feeding, binding, execution or outside combatants. Choose a permitted controlled move.';
}
export function tournamentActionPolicy(b,actions){
 if(!isTournamentBattle(b))return actions;
 return actions.map(a=>{const reason=tournamentCommandReason(b,a.id);return reason?{...a,disabledReason:reason}:a;});
}
export function validHumanDuelPlan(a){
 if(a?.duelPlanId===undefined)return false;
 const p=humanDuelProfile(a.duelPlanId,a.duelDifficulty);
 return !!p&&a.maxHp===p.hp&&a.attackPower===p.attackPower&&a.agility===p.agility&&a.armor===p.armor&&a.maxMp===0&&a.mp===0&&a.role==='humanoid'&&a.aiKey==='striker'&&JSON.stringify(a.planCycle)===JSON.stringify(p.cycle)&&a.planId===undefined&&a.bossId===undefined&&a.phasePlan===undefined&&a.resistances===undefined&&a.weakness===undefined&&a.trait===undefined;
}
export function prohibitedDuelState(b){
 return !Array.isArray(b?.actors)||b.actors.some(a=>a.ephemeral||a.bossId!==undefined||a.phasePlan!==undefined||['bleed','bleedTurns','burn','burnTurns','burning','burningTurns','poison','poisonTurns','captured','surrenderable'].some(k=>a.status?.[k]!==undefined))||b.captureAllowed===true;
}
