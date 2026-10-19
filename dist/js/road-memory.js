import { worldCalendarContext } from './world.js';

const sameRoad=(a,b)=>a&&b&&[a.from,a.to].sort().join('\0')===[b.from,b.to].sort().join('\0');
const text=(v,max=240)=>typeof v==='string'&&v.length>0&&v.length<=max;
const day=(v,max)=>Number.isSafeInteger(v)&&v>=0&&(max===undefined||v<=max);
const types=['bandits','beasts','weather','caravan','witness','sick_traveler','lore','messenger','pilgrims','grave_robber','fortune','wagon','relic'];
const outcomes=['avoid','bribe','fight','turn_back','supplies','shelter','press','share','trade','continue','listen','aid','herb','record','ask','extort','pray','offering','refuse','join','study','reading','labor','donate','pocket','rest','abandoned','returned','victory','defeat','retreat'];
const legFor=(s,p)=>s.timeline?.journey?.legs?.[p.legIndex]||{from:p.legId?.split(':')[1],to:p.legId?.split(':')[2]};
export function captureRoadAccount(s,p){
 const leg=legFor(s,p),weather=worldCalendarContext(s.world,s.day,s.seed),last=(s.travel.history||[]).findLast(row=>row.road?.type===p.type&&sameRoad(row.road,leg));
 return {version:1,from:leg.from,to:leg.to,observedDay:s.day,season:weather.season,weather:weather.weather,previous:last?{day:last.day,result:last.result,label:last.road.label,personName:last.road.personName}:null};
}
export function describeRoadAccount(a,body){
 const past=a.previous?`\n\nYour road journal, day ${a.previous.day}: “${a.previous.label}”${a.previous.personName?`, in the account involving ${a.previous.personName}`:''}. That earlier outcome belongs to this stretch of road.`:'';
 return `${a.season} · ${a.weather}. ${body}${past}`;
}
export function roadReceipt(s,p,result,label){
 const leg=legFor(s,p);if(!leg.from||!leg.to)return null;
 const responses={shelter:'Waited in cover for a full day',aid:'Completed a full day of practical help',avoid:'Completed the safe detour',returned:'Returned to the last waypoint',abandoned:'Abandoned the remaining road response',victory:'Resolved the formation through combat',defeat:'Survived the road fight and its recovery',retreat:'Withdrew from the fight and took the safe detour'};
 return {version:1,type:p.type,from:leg.from,to:leg.to,personName:p.person?.name||null,label:label||responses[result]||'Completed the recorded road response',...(p.account?{observedDay:p.account.observedDay,season:p.account.season,weather:p.account.weather}:{})};
}
function validPlaces(row,s){return text(row.from,160)&&text(row.to,160)&&row.from!==row.to&&(!s||[row.from,row.to].every(id=>s.world.locations.some(p=>p.id===id)));}
export function validRoadReceipt(row,entry,s){
 return row&&row.version===1&&types.includes(row.type)&&validPlaces(row,s)&&text(row.label)&&outcomes.includes(entry.result)&&(row.personName===null||text(row.personName,80))&&(row.observedDay===undefined&&row.season===undefined&&row.weather===undefined||day(row.observedDay,entry.day)&&text(row.season,100)&&text(row.weather,100));
}
export function validRoadAccount(a,p,s){
 if(!a||a.version!==1||!validPlaces(a,s)||!day(a.observedDay,s?.day)||!text(a.season,100)||!text(a.weather,100))return false;
 const leg=s?legFor(s,p):null;if(leg&&(a.from!==leg.from||a.to!==leg.to))return false;
 if(a.previous===null)return true;
 const old=a.previous;if(!old||!day(old.day,a.observedDay)||!outcomes.includes(old.result)||!text(old.label)||(old.personName!==null&&!text(old.personName,80)))return false;
 return !s||s.travel.history.some(row=>row.day===old.day&&row.result===old.result&&row.road?.type===p.type&&sameRoad(row.road,a)&&row.road.label===old.label&&row.road.personName===old.personName);
}
