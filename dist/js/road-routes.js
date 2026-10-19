export const ROAD_PREFERENCES=[['fastest','Shortest planned time'],['safest','Least road exposure'],['cheapest','Lowest preparation fee']];
export const roadPreference=value=>ROAD_PREFERENCES.some(([id])=>id===value)?value:'fastest';
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};

/** Quote the real graph. Supplies use ceil(total raw days / 2), so parity is
 * part of a search label rather than an invented per-road toll. */
export function selectRoadRoute(world,from,to,plan,preference,describeLeg){
 if(!world?.locations.some(p=>p.id===from)||!world.locations.some(p=>p.id===to))return [];
 preference=roadPreference(preference);
 const score=row=>preference==='safest'?[row.exposure,row.days,row.fee]:preference==='cheapest'?[row.fee,row.days,row.exposure]:[row.days,row.fee,row.exposure];
 const stateKey=row=>JSON.stringify([row.id,plan.supplies?row.rawDays%2:0]);
 const first={id:from,route:[from],rawDays:0,days:0,exposure:0,fee:0},best=new Map([[stateKey(first),first]]),pending=[first];
 while(pending.length){
  pending.sort((a,b)=>compare(score(a),score(b))||a.route.join('\0').localeCompare(b.route.join('\0')));
  const row=pending.shift();if(best.get(stateKey(row))!==row)continue;if(row.id===to)return row.route;
  for(const road of world.roads||[]){
   const next=road.from===row.id?road.to:road.to===row.id?road.from:null;if(!next||road.closed===true)continue;
   const leg=describeLeg(row.id,next,road),rawDays=row.rawDays+leg.days;
   const candidate={id:next,route:[...row.route,next],rawDays,days:row.days+leg.totalDays,exposure:row.exposure+leg.risk,fee:(plan.supplies?Math.ceil(rawDays/2):0)+(plan.escort?(row.route.length)*2:0)};
   const key=stateKey(candidate),old=best.get(key);
   if(!old||compare(score(candidate),score(old))<0){best.set(key,candidate);pending.push(candidate);}
  }
 }
 return [];
}
