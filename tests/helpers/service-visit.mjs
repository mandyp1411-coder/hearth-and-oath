import { getActions, chooseAction } from '../../dist/js/engine.js';
import { settlementServices, serviceAccepts, serviceWalkPath } from '../../dist/js/world-services.js';
/** Positive integration fixtures now visit the actual provider before invoking
 * an already offered service. This never invents an offer, ignores a barrier,
 * changes a fee, teleports between sites, or resolves a waiting decision. */
export function atService(state,id){
 if(state?.worldServicesVersion!==1||!getActions(state).some(a=>a.id===id))return state;
 const owner=settlementServices(state).find(r=>serviceAccepts(r,id));
 const room=owner?.roomId||(/^(gear_buy_|realm_(potion$|ration$|sellgear_|sellloot_))/.test(id)?'market':null);
 const path=room&&serviceWalkPath(state,room);if(!path)return state;
 for(const next of path){const a=getActions(state).find(a=>a.id==='atlas_room_'+next&&!a.disabledReason);if(!a)return state;state=chooseAction(state,a.id);}
 return state;
}
