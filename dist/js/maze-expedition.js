import { mazeActions } from './maze-v31.js';
import { mazeMovementForecast } from './maze-rules.js';
import { campRecoveryView, mazeCampDescription } from './travel-energy.js';

/** Only carried supplies, active slots and current-room offers. No route/enemy totals. */
export function mazeExpeditionView(s,actions=mazeActions(s)) {
 if(!s.maze)return null;
 const camp=campRecoveryView(s,{party:true}),active=(s.companions||[]).filter(p=>p.recruited&&p.active).slice(0,3);
 const party=[{...s.hero,id:'hero'},...active].map(p=>({
  id:p.id,name:p.name||'You',hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp,
  unavailable:camp.excluded.find(row=>row.id===p.id)?.reason||null,
 }));
 return {
  movement:mazeMovementForecast(s),party,
  kitNights:(s.trail?.kits||[]).reduce((total,kit)=>total+Math.max(0,kit.remaining),0),
  kit:camp.kit,potions:s.hero.potions||0,rations:s.adventuring?.rations||0,
  campAvailable:actions.some(a=>a.id==='maze_camp'&&!a.disabledReason),
  exitAvailable:actions.some(a=>a.id==='maze_exit'&&!a.disabledReason),
  campDescription:mazeCampDescription(s),
 };
}
