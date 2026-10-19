import { spatialMoveOffer } from './area-scenes.js';

// Inspection is free. Only this separate command commits the engine's current
// offer; the shell checks that offer again when the command is activated.
export function renderSpatialCommit(s,kind,id,actions,{e,button}) {
  const offer=spatialMoveOffer(s,kind,id,actions);
  const actionId=kind==='hex'?'atlas_step_'+id.replace(',','_'):kind==='room'?'atlas_room_'+id:kind==='rpg'?'rpg_move_'+id:'explore_route_'+id;
  const choiceId='route_'+(id.startsWith('radiant_')?id.slice(8):id);
  const entry=offer?.op==='choice'?s.event?.choices.find(c=>c.id===offer.id):actions.find(a=>a.id===(offer?.id||actionId))||s.event?.choices.find(c=>c.id===choiceId);
  if(!offer)return `<p id="spatial-selection-details" class="small-copy">${e(entry?.disabledReason||'There is no available route to this point from your present position. Inspection spends no time.')}</p>`;
  const days=entry?.durationDays??entry?.days,fee=entry?.quotedCost??entry?.cost;
  const terms=[Number.isFinite(days)?`${days} committed ${days===1?'day':'days'}`:'',Number.isFinite(fee)?`${fee} gold fee`:''].filter(Boolean).join(' · ');
  return `<p id="spatial-selection-details" class="small-copy">${e(entry?.description||'Review this available route before moving.')}${terms?' '+e(terms)+'.':''}</p>${button('Confirm: '+e(entry?.label||'move to this point'),'spatial-move',kind+':'+id,'primary')}`;
}
