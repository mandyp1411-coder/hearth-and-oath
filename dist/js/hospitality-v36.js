import { settlementServices } from './world-services.js';
import { markSiteKnowledge } from './cartography.js';

export const INN_GOODS=[
 {id:'meals',name:'Wrapped Meal',price:6,stock:12,description:'Bread, cheese and cooked roots for the road. Eat from Inventory: recover 8 Health and 5 Focus, once a day.'},
 {id:'ale',name:'Bottle of Ale',price:3,stock:8,description:'A stoppered bottle from the inn. Adults can drink one a day from Inventory: ease 4 Stress, gain 2 Joy and lose 2 Focus.'}
];
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
const clamp=n=>Math.max(0,Math.min(100,n));
export function innkeeper(s){return settlementServices(s).find(r=>r.kind==='inn')||null;}
export function innLedger(s){
 const season=Math.floor(s.day/90),old=s.hospitality?.sites?.[s.locationId];
 return old?.season===season?old:{season,stock:Object.fromEntries(INN_GOODS.map(g=>[g.id,g.stock])),heardDay:null,rumor:null};
}
export function keepInnLedger(s){
 s.hospitality||={version:1,bag:{meals:0,ale:0},used:{},sites:{}};
 const record=innLedger(s);s.hospitality.sites[s.locationId]=structuredClone(record);return s.hospitality.sites[s.locationId];
}
export function innMerchant(s){
 const r=innkeeper(s);if(!r)return null;
 return {...r.person,id:r.personId,name:r.name,season:innLedger(s).season,stock:{},prices:{},disposition:'gregarious',vendor:'inn'};
}
export function innReason(s){
 if(!innkeeper(s)?.here||s.cartography?.offsite)return 'Visit the innkeeper inside the local Tavern.';
 if(s.hero.hp<=0||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.cartography?.pending||s.timeline?.journey||s.maze||s.justice?.prison)return 'Finish the current moment first.';
 if(s.life?.plan||s.travel?.pending||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.rpg?.project||s.conversations?.project||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.repertoire?.project)return 'Finish your current commitment first.';
 return null;
}
export function innRumor(s){
 const contract=(s.adventuring?.contracts||[]).find(c=>c.boardId===s.locationId&&c.status==='offered'),site=contract&&s.world.locations.find(p=>p.id===contract.destinationId);
 if(contract&&site)return {text:`${contract.giver.name} is looking for help at ${site.name}. The job pays ${contract.reward} Gold. They are sitting here in the tavern; ask them about the work.`,destinationId:site.id,serviceId:'giver-'+contract.id};
 const road=s.world.roads.find(r=>r.from===s.locationId||r.to===s.locationId),destinationId=road&&(road.from===s.locationId?road.to:road.from),place=s.world.locations.find(p=>p.id===destinationId);
 return place?{text:`Travellers have come from ${place.name}. I can mark the road for you. Ask about the local work when you get there.`,destinationId:place.id,serviceId:null}:{text:'There is no new word of work tonight. Try the other tables or ask again after the board changes.',destinationId:null,serviceId:null};
}
export function hospitalityActions(s){
 if(!innkeeper(s)?.here)return [];
 const reason=innReason(s),row=innLedger(s);
 return [
  {id:'inn_room',label:'Rent a Room for the Night',description:'A private bed for one night. Recover 20 Health, all Focus and reduce Stress by 8. Illness still needs a doctor.',days:1,cost:8,group:'Innkeeper',disabledReason:reason||(s.age<16?'Independent room rental opens at sixteen.':s.hero.gold<8?'Requires 8 Gold.':null)},
  {id:'inn_rumor',label:'“Heard Any Rumors?”',description:'Ask about nearby work and roads. Named leads are recorded in Journal Notes and marked on your map.',days:0,cost:0,group:'Innkeeper',disabledReason:reason||(row.heardDay===s.day?'You have heard today’s news.':null)}
 ];
}
export function applyHospitalityAction(s,id,ctx){
 const a=hospitalityActions(s).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;
 if(id==='inn_rumor'){
  const rumor=innRumor(s),record=keepInnLedger(s);record.heardDay=s.day;record.rumor=rumor;
  if(rumor.destinationId)markSiteKnowledge(s,rumor.destinationId,'Rumored','Directions from '+innkeeper(s).name+' at the Tavern');
  s.notice=rumor.text;(ctx.journalLiteral||ctx.journal)?.('Word at the Inn',rumor.text,'realm');return true;
 }
 const keeper=innkeeper(s).name;
 if(ctx.spendDays(1)!==1||s.phase==='retired'||s.event||s.battle||s.conversations?.pending){s.notice='Your stay was interrupted. No room fee or recovery was applied.';return true;}
 if(s.hero.gold<8){s.notice='You can no longer afford the room. No fee was taken.';return true;}
 s.hero.gold-=8;s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+20);s.hero.mp=s.hero.maxMp;s.life.stress=clamp(s.life.stress-8);
 s.notice=`You pay ${keeper} 8 Gold and sleep for one night. You recover up to 20 Health, all Focus and ease 8 Stress.`;
 (ctx.journalLiteral||ctx.journal)?.('A Night at the Inn',s.notice,'life');return true;
}
export function innSupplyReason(s,id){
 if(!INN_GOODS.some(g=>g.id===id))return 'Unknown provision.';
 if(!(s.hospitality?.bag[id]>0))return 'You are not carrying this provision.';
 if(s.hospitality.used[id]===s.day)return 'You have already used this provision today.';
 if(id==='ale'&&s.age<18)return 'Ale is for adults.';
 return null;
}
export function useInnSupply(s,id,ctx){
 const reason=innSupplyReason(s,id);if(reason)return false;
 s.hospitality.bag[id]--;s.hospitality.used[id]=s.day;
 if(id==='meals'){s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+8);s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+5);s.notice='You eat a wrapped meal. You recover up to 8 Health and 5 Focus.';}
 else {s.hero.mp=Math.max(0,s.hero.mp-2);s.life.stress=clamp(s.life.stress-4);s.life.happiness=clamp(s.life.happiness+2);s.notice='You drink a bottle of ale. You ease 4 Stress, gain 2 Joy and lose 2 Focus.';}
 (ctx.journalLiteral||ctx.journal)?.(id==='meals'?'Food for the Road':'A Bottle of Ale',s.notice,'life');return true;
}
export function validateHospitality(s){
 const h=s.hospitality,int=(n,max=10000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 if(h===undefined)return true;
 return plain(h)&&h.version===1&&plain(h.bag)&&Object.keys(h.bag).length===2&&INN_GOODS.every(g=>int(h.bag[g.id]))&&plain(h.used)&&Object.entries(h.used).every(([id,d])=>INN_GOODS.some(g=>g.id===id)&&int(d,s.day))&&plain(h.sites)&&Object.keys(h.sites).length<=s.world.locations.length&&Object.entries(h.sites).every(([id,r])=>s.world.locations.some(p=>p.id===id)&&plain(r)&&int(r.season,Math.floor(s.day/90))&&plain(r.stock)&&Object.keys(r.stock).length===2&&INN_GOODS.every(g=>int(r.stock[g.id],g.stock))&&(r.heardDay===null||int(r.heardDay,s.day))&&(r.rumor===null||plain(r.rumor)&&typeof r.rumor.text==='string'&&r.rumor.text.length<=800&&(r.rumor.destinationId===null||s.world.locations.some(p=>p.id===r.rumor.destinationId))&&(r.rumor.serviceId===null||typeof r.rumor.serviceId==='string'&&r.rumor.serviceId.length<=180)));
}
