import { arcanePower, sacredPower, restorativePower, elementalMultiplier, applyStatus } from './combat-rules.js';
const row=(id,classId,name,cost,targetSide,description,skill,min=6,needsTarget=true)=>({id,classId,name,cost,targetSide,description,skill,min,needsTarget});
export const TECHNIQUES_V27 = [
 row('intercede','guardian','Intercede',4,'party','Give a living ally 12 ward, remove poison and bleeding, then draw attacks yourself.','defense'),
 row('shield_rebuke','guardian','Shield rebuke',5,'enemy','Strike with defense, strip 6 ward, and weaken the next enemy strike by 4.','defense',8),
 row('blood_momentum','berserker','Blood momentum',4,'enemy','Spend 4 HP for a piercing strike. Actual damage restores at most 3 MP; cannot be used below 5 HP.','weapons'),
 row('iron_fury','berserker','Iron fury',6,'enemy','Spend 5 HP to strike every living enemy. Gain an 8-point ward against their reply.','weapons',8,false),
 row('disabling_riposte','knight','Disabling riposte',4,'enemy','Strike and stun a foe for one action; bosses instead lose their charged bonus.','weapons'),
 row('rally_standard','knight','Rally the standard',6,'party','Every living ally gains 6 ward and 2 MP. Remove fear and weakness.','defense',8,false),
 row('sanctuary_ring','paladin','Sanctuary ring',6,'party','Every living ally gains 9 ward and loses ongoing wounds. Requires an intact oath.','devotion',6,false),
 row('judgment_vow','paladin','Judgment of the vow',7,'enemy','Willpower, devotion and magic power a piercing sacred strike; stronger against undead and spirits. Requires an intact oath.','devotion',8),
 row('shared_renewal','healer','Shared renewal',6,'party','Restore 12 HP plus willpower, devotion and magic bonuses to every living ally. Fallen people remain fallen.','devotion',6,false),
 row('purifying_touch','healer','Purifying touch',4,'party','Restore 10 HP plus willpower, devotion and magic bonuses, remove poison, fear, silence, weakness and ongoing wounds.','devotion',8),
 row('winter_prison','elementalist','Winter prison',6,'enemy','Piercing ice damage from intellect, arcana and magic; root the next strike and break a charge.','arcana'),
 row('chain_lightning','elementalist','Chain lightning',8,'enemy','Intellect, arcana and magic power lightning against up to three living enemies; the first takes the strongest hit.','arcana',8),
 row('bramble_circle','druid','Bramble circle',5,'party','All living allies gain 4 ward and retaliatory thorns for two actions.','survival',6,false),
 row('rootbound','druid','Rootbound',6,'enemy','Intellect, arcana and magic power piercing damage, root and two marked openings. Interrupt a charged attack.','survival',8),
 row('grave_attendant','necromancer','Ash attendant',6,'party','Call one temporary ash construct once per battle. It is no dead named person and cannot be recalled after defeat.','arcana',6,false),
 row('soul_unmake','necromancer','Unmake the seal',7,'enemy','Strip 10 ward; intellect, arcana and magic power piercing damage. A spirit loses its charged attack.','scholarship',8),
 row('smoke_veil','thief','Smoke veil',5,'party','All living allies gain a two-action veil. The next incoming strike loses 4 power.','stealth',6,false),
 row('take_opening','thief','Take the opening',4,'enemy','A piercing strike gains 6 power against marked or weakened targets.','stealth',8),
 row('hunters_volley','ranger','Hunter’s volley',6,'enemy','Strike up to three living foes and mark each for a follow-up.','survival',6,false),
 row('watch_line','ranger','Watch the line',4,'party','Grant one ally 8 ward, clear the prey mark and expose two enemy openings.','survival',8),
 row('venom_edge','assassin','Venom edge',5,'enemy','Strike and poison flesh-bearing enemies. Bloodless foes lose 6 ward instead.','stealth'),
 row('execution_window','assassin','Execution window',6,'enemy','A precise piercing strike gains 8 power below 35% enemy health; no guaranteed kill.','stealth',8),
 row('discord_chorus','bard','Discordant chorus',6,'enemy','Weaken all foes by 4 and silence spell-bearing foes for one action.','persuasion',6,false),
 row('second_wind','bard','Second wind',5,'party','Restore 8 HP to a living ally, clear fear, and grant 4 ward. Restore 5 MP only when the target is another ally, not yourself.','persuasion',8),
];
export function advancedTechnique(id){return TECHNIQUES_V27.find(t=>t.id===id)||null;}
export function advancedBattleActions(battle,actor){
 if(battle.effectsVersion!==27)return [];
 return (actor.trainedTechniques||[]).flatMap(id=>{const t=advancedTechnique(id);if(!t)return [];let reason=actor.mp<t.cost?'Not enough MP.':null;
  if(t.classId==='paladin'&&actor.oathBroken)reason='Your broken oath suppresses this sacred technique.';
  if(['blood_momentum','iron_fury'].includes(id)&&actor.hp<=(id==='iron_fury'?5:4))reason='You need enough health to survive its cost.';
  if(id==='grave_attendant'&&(battle.attendantUsed||!battle.actors.some(a=>a.id==='ash_attendant')))reason='The attendant has already been called or is unavailable.';
  if(actor.status.silenced&&['paladin','healer','elementalist','druid','necromancer','bard'].includes(t.classId))reason='Silenced for this action.';
  return [{id:'tech_'+id,label:t.name,cost:t.cost+' MP',mpCost:t.cost,description:t.description,needsTarget:t.needsTarget,targetSide:t.targetSide,...(reason?{disabledReason:reason}:{})}];
 });
}
export function applyAdvancedTechnique(b,actor,t,target,h){
 const allies=b.actors.filter(a=>a.side==='party'&&a.hp>0),foes=b.actors.filter(a=>a.side==='enemy'&&a.hp>0);
 const power=['elementalist','druid','necromancer'].includes(t.classId)?arcanePower(actor):['paladin','healer'].includes(t.classId)?sacredPower(actor):h.power(actor);
 const stopped=()=>h.stopped?.()||false;
 const status=(a,key,n,turns)=>!stopped()&&applyStatus(a,key,n,turns,h.log);
 const ward=(a,n)=>{if(!stopped())a.status.ward=Math.min(100,Number(a.status.ward||0)+n);};
 const heal=(a,n)=>{if(stopped())return;const restored=h.heal?h.heal(a,n):Math.min(a.maxHp-a.hp,n);if(!h.heal)a.hp+=restored;h.log(`${a.name} recovers ${restored} health.`);};
 const payHealth=n=>{if(h.loseHealth)h.loseHealth(actor,n);else actor.hp-=n;};
 const clear=a=>{if(!stopped())for(const k of ['bleed','bleedTurns','burning','burningTurns','burn','burnTurns','poison','poisonTurns','weakened','fear','silenced','rooted'])delete a.status[k];};
 const hit=(e,n=power+6,element)=>stopped()?0:h.damage(actor,e,n*(element?elementalMultiplier(e,element):1),{pierce:true});
 const interrupt=e=>{if(!stopped()){delete e.status.charged;delete e.status.stolenWard;}};
 actor.mp-=t.cost;
 switch(t.id){
  case 'intercede':ward(target,12);clear(target);actor.defending=true;actor.status.protecting=true;break;
  case 'shield_rebuke':target.status.ward=Math.max(0,(target.status.ward||0)-6);hit(target,power+Number(actor.skills?.defense||0));status(target,'weakened',4);break;
  case 'blood_momentum':payHealth(4);if(stopped())break;actor.mp=Math.min(actor.maxMp,actor.mp+Math.min(3,Math.floor(hit(target,power+9)/5)));break;
  case 'iron_fury':payHealth(5);for(const e of foes){if(stopped())break;hit(e,power+4);}ward(actor,8);break;
  case 'disabling_riposte':hit(target,power+5);if(!target.bossId)status(target,'stunned',1);interrupt(target);break;
  case 'rally_standard':for(const a of allies){ward(a,6);a.mp=Math.min(a.maxMp,a.mp+2);delete a.status.fear;delete a.status.weakened;}break;
  case 'sanctuary_ring':for(const a of allies){ward(a,9);clear(a);}break;
  case 'judgment_vow':hit(target,power+12+(['undead','spirit'].includes(target.role)?6:0),'radiance');interrupt(target);break;
  case 'shared_renewal':for(const a of allies)heal(a,restorativePower(actor,12));break;
  case 'purifying_touch':heal(target,restorativePower(actor,10));clear(target);break;
  case 'winter_prison':hit(target,power+9,'ice');status(target,'rooted',1);interrupt(target);break;
  case 'chain_lightning':for(const [i,e]of [target,...foes.filter(e=>e.id!==target.id)].slice(0,3).entries()){if(stopped())break;hit(e,power+10-i*3,'lightning');}break;
  case 'bramble_circle':for(const a of allies){ward(a,4);a.status.bramble=3;a.status.brambleTurns=2;}break;
  case 'rootbound':hit(target,power+8);status(target,'rooted',1);target.status.marked=2;interrupt(target);break;
  case 'grave_attendant':{const a=b.actors.find(a=>a.id==='ash_attendant');a.hp=a.maxHp;b.attendantUsed=true;b.turnOrder.push(a.id);h.log('An ash construct takes shape. No named dead person returns.');break;}
  case 'soul_unmake':target.status.ward=Math.max(0,(target.status.ward||0)-10);hit(target,power+10);interrupt(target);break;
  case 'smoke_veil':for(const a of allies){a.status.veil=4;a.status.veilTurns=2;}break;
  case 'take_opening':hit(target,power+6+(target.status.marked||target.status.weakened?6:0));break;
  case 'hunters_volley':for(const e of foes.slice(0,3)){if(stopped())break;hit(e,power+3);if(!stopped())e.status.marked=1;}break;
  case 'watch_line':ward(target,8);delete target.status.pack_mark;for(const e of foes.slice(0,2))e.status.marked=1;break;
  case 'venom_edge':hit(target,power+3);if(target.bloodless)target.status.ward=Math.max(0,(target.status.ward||0)-6);else{status(target,'poison',3,3);}break;
  case 'execution_window':hit(target,power+7+(target.hp<=target.maxHp*.35?8:0));break;
  case 'discord_chorus':for(const e of foes){status(e,'weakened',4);if(['spirit','mage','undead'].includes(e.role))status(e,'silenced',1);}break;
  case 'second_wind':heal(target,8);if(target.id!==actor.id)target.mp=Math.min(target.maxMp,target.mp+5);delete target.status.fear;ward(target,4);break;
 }
 h.log(`${actor.name} uses ${t.name}.`);
}
