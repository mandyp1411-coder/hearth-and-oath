import { seededRoll } from './world.js';

const species=['beast','bandit','undead','spirit','construct'];
export function wildernessProfile(s,cell){
 const site=cell.siteId&&s.world.locations.find(p=>p.id===cell.siteId),regionId=cell.regionId||site?.regionId||s.realm?.sites?.[site?.id]?.regionId,region=s.realm?.regions.find(r=>r.id===regionId),terrain=cell.terrain;
 const war=(s.realm?.wars||[]).some(w=>w.status==='active'&&[w.a,w.b].includes(regionId));
 const hold=(s.realm?.politics?.holds||[]).some(h=>h.status==='held'&&(h.siteId===site?.id||s.world.locations.find(p=>p.id===h.siteId)?.regionId===regionId));
 const danger=Math.max(1,Math.min(6,site?.danger||(site?.safety?6-site.safety:0)||(/mountain|marsh/.test(terrain)?4:terrain==='forest'?3:2)));
 const risk=Math.min(55,5+danger*5+(cell.road?0:5)+(war?10:0)+(hold?10:0)+(s.hero.mp===0?10:0));
 const kinds=hold?['undead']:site&&/ruin|crypt|grave|barrow/.test(site.type+' '+site.id)?['undead','spirit']:site&&/tower|archive/.test(site.type+' '+site.id)?['construct','bandit']:terrain==='marsh'?['beast','spirit']:['beast','bandit'];
 return {risk,danger,kinds,terrain,region:region?.name||'this country'};
}
export function queueWildernessEncounter(s,cell,ctx={}){
 if(s.age<14||!s.cartography||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.maze)return false;
 const w=s.cartography.wilderness||={version:1,last:null,pending:null},key=cell.key;
 if(w.last?.key===key&&w.last.day===s.day)return false;
 w.last={key,day:s.day};const profile=wildernessProfile(s,cell);
 if(seededRoll(s.seed,`country:danger:${key}:${s.day}`,100)>=profile.risk)return false;
 const type=profile.kinds[seededRoll(s.seed,`country:kind:${key}:${s.day}`,profile.kinds.length)];
 w.pending={key,day:s.day,type,risk:profile.risk};
 const scenes={beast:['Tracks Across the Path','A hunting animal blocks the path ahead. It has not noticed a safe way around you yet.'],bandit:['Figures Beside the Road','Armed strangers step out beside the track and watch your pack. You can slip away before they close the path.'],undead:['The Road After Dusk','Restless dead move along a path in this troubled country. There is still room to retreat around them.'],spirit:['A Disturbed Marsh','A marsh spirit lashes at the reeds beside the crossing. Its anger follows anyone who enters its reach.'],construct:['An Old Ward Still Walking','A damaged sentinel patrols the abandoned approach. Its warning repeats as it turns toward your footsteps.']},[title,body]=scenes[type];
 ctx.setEvent?.('country_danger',title,'On Your Journey',body,[{id:'avoid',label:'Give Them a Wide Berth',description:'Use 4 Focus finding a way around. No combat or spoils.'},{id:'fight',label:'Stand and Fight',description:'Face the danger with your current party. Injuries, defeat and earned spoils are real.'}]);return true;
}
export function applyWildernessChoice(s,eventId,id,ctx){
 const p=s.cartography?.wilderness?.pending;if(eventId!=='country_danger'||!p||!['avoid','fight'].includes(id))return false;
 s.cartography.wilderness.pending=null;
 if(id==='fight'){const token=`country-${p.key}-${p.day}`;s.cartography.wilderness.battle={...p,token};ctx.startBattle('free_'+p.type,{kind:'adventure',mode:'country',token,locationId:s.locationId});return true;}
 s.hero.mp=Math.max(0,s.hero.mp-4);s.notice='You leave the danger behind and find another way around. The detour uses 4 Focus.';ctx.journal?.('A Safer Way Around',s.notice,'travel');return true;
}
export function validateWilderness(s){
 const w=s.cartography?.wilderness;if(w===undefined)return true;
 const point=p=>p&&/^-?\d+,-?\d+$/.test(p.key)&&s.cartography.cells[p.key]&&Number.isSafeInteger(p.day)&&p.day>=0&&p.day<=s.day;
 const danger=p=>point(p)&&p.key===s.cartography.position&&species.includes(p.type)&&Number.isInteger(p.risk)&&p.risk>=0&&p.risk<=55;
 return !!w&&w.version===1&&(w.last===null||point(w.last))&&(w.pending===null||danger(w.pending)&&s.event?.id==='country_danger')&&(!w.battle||danger(w.battle)&&w.battle.token===`country-${w.battle.key}-${w.battle.day}`&&s.battle?.context?.mode==='country'&&s.battle.context.token===w.battle.token&&s.battle.encounterId==='free_'+w.battle.type);
}
