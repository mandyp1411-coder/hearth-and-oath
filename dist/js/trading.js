import { settlementServices } from './world-services.js';
import { INN_GOODS, innMerchant, innLedger, keepInnLedger, innReason } from './hospitality-v36.js';
import { heldSettlement } from './regional-world-v33.js';
import { GEAR_CATALOG, ownedGear, discardGear } from './gear.js';
import { MATERIAL_PRICES, gearSaleValue } from './economy-values.js';
import { isSettlement } from './world.js';
import { CAMP_KITS, addCampingKit } from './travel-energy.js';

export function tradeMerchant(s,vendor='market'){
 if(vendor==='inn')return innMerchant(s);
 if(vendor==='materials'){const p=settlementServices(s).find(r=>r.kind==='materials');return p?{...p.person,id:p.personId,name:p.name,season:Math.floor(s.day/90)}:null;}
 const m=s.realm?.sites?.[s.locationId]?.merchant;if(vendor==='market')return m;
 const p=settlementServices(s).find(r=>r.kind==='merchant'&&r.subjectId===vendor);
 return m&&p?{...m,...p.person,id:p.personId,name:p.name,stock:m.stock,prices:m.prices,season:m.season}:null;
}
export function shopAccessReason(s,vendor='market'){
 if(!['market','inn','apothecary','outfitter','materials'].includes(vendor))return 'Unknown counter.';
 if(vendor==='inn'){const reason=innReason(s);if(reason)return reason;}
 if(vendor==='materials'&&(!s.careers||s.timeline?.yearTarget||s.workshop?.project||s.life?.plan||s.society?.project))return 'Finish your current commitment before collecting materials.';
 if(vendor==='materials'&&!tradeMerchant(s,vendor))return 'The Materials Merchant is not available here.';
 if(heldSettlement(s))return 'Public trading is closed under vampire occupation.';
 if(!['inn','materials'].includes(vendor)&&(!s?.realm?.sites?.[s.locationId]?.merchant||!isSettlement(s.world,s.locationId)))return 'There is no open shop here.';
 if(vendor!=='inn'&&(s.cartography?.offsite||s.cartography?.interior?.siteId!==s.locationId||s.cartography?.interior?.roomId!=='market'))return 'Approach the shop in the local market first.';
 if(s.careers?.batch||s.conversations?.project||s.rpg?.project||s.stories?.project||s.health?.recovery||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.repertoire?.project)return 'Finish your current commitment before trading.';
 if(s.age<16)return 'You can trade independently from age sixteen.';
 if(s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.justice?.prison||s.cartography?.pending||s.timeline?.journey)return 'Resolve your current moment before trading.';
 return null;
}
export function tradeInventory(s,vendor='market'){
 const merchant=heldSettlement(s)?null:tradeMerchant(s,vendor);if(!merchant)return {merchant:null,buy:[],sell:[]};
 let buy=vendor==='materials'?Object.entries(MATERIAL_PRICES).map(([id,price])=>({id:'material:'+id,name:({wood:'Timber',ore:'Ore',cloth:'Cloth',stone:'Stone',hide:'Hide',crystal:'Crystal'})[id]+' Bundle',kind:'materials',price:price*3,quantity:1,stock:1,description:'3 '+(id==='wood'?'timber':id)+'. Collecting this bundle takes 1 day. Materials are shared with crafting and commissions.',...((s.equipment?.materials?.[id]||0)>99997?{disabledReason:'There is no room for another complete bundle.'}:{})})):vendor==='inn'?INN_GOODS.map(g=>({id:'supply:'+g.id,name:g.name,kind:'supplies',price:g.price,quantity:innLedger(s).stock[g.id],stock:innLedger(s).stock[g.id],description:g.description,...(g.id==='ale'&&s.age<18?{disabledReason:'Ale is for adults.'}:{})})).filter(g=>g.quantity>0):GEAR_CATALOG.filter(i=>merchant.stock[i.id]>0&&!s.equipment.owned.includes(i.id)).map(item=>({id:'gear:'+item.id,item,name:item.name,kind:'equipment',price:merchant.prices[item.id]??item.price,quantity:1,stock:merchant.stock[item.id],description:item.description}));
 if(['market','apothecary'].includes(vendor)&&merchant.potions>0)buy.push({id:'supply:potions',name:'Healing Potion',kind:'supplies',price:vendor==='apothecary'?9:10,quantity:merchant.potions,stock:merchant.potions,description:'One healing potion, added to your carried supplies.'});
 if(['market','outfitter'].includes(vendor)&&merchant.rations>0)buy.push({id:'supply:rations',name:'Expedition Rations',kind:'supplies',price:vendor==='outfitter'?7:8,quantity:merchant.rations,stock:merchant.rations,description:'One bundle of provisions for your descents and camps.'});
 if(['market','outfitter'].includes(vendor)&&s.trail)for(const kit of CAMP_KITS)buy.push({id:'camp:'+kit.id,name:kit.name,kind:'supplies',price:kit.price,quantity:1,stock:1,description:kit.description+' '+kit.nights+' sheltered nights.',...(s.trail.kits.filter(k=>k.remaining>0).length>=30?{disabledReason:'Your camp pack storage is full.'}:{})});
 if(vendor==='apothecary')buy=buy.filter(r=>r.id==='supply:potions');
 if(vendor==='outfitter')buy=buy.filter(r=>r.id==='supply:rations'||r.id.startsWith('camp:'));
 const sell=ownedGear(s).map(item=>({id:'gear:'+item.id,item,name:item.name,kind:'equipment',price:gearSaleValue(item,merchant),quantity:1,description:item.description,disabledReason:item.stolen?'Stolen property · This shop will not barter for it.':Object.values(s.equipment.equipped).includes(item.id)?'Equipped · Unequip in Inventory first.':null}));
 for(const l of s.adventuring?.loot||[])sell.push({id:'loot:'+l.id,name:l.name,kind:'loot',price:Math.floor(l.value*.8),quantity:1,description:'Recovered on an expedition.',disabledReason:l.stolen?'Stolen property · This shop will not barter for it.':null});
 return {merchant,buy,sell};
}
export function newTradeDraft(s,vendor='market'){const m=tradeMerchant(s,vendor);return {vendor,merchantId:m?.id,locationId:s.locationId,season:m?.season,buy:[],sell:[]};}
// Quotes contain every term needed to reject stale stock, ownership or prices.
// Building, inspecting or abandoning one never changes the simulation.
export function quoteTrade(s,draft={}){
 const vendor=draft.vendor||'market',v=tradeInventory(s,vendor),m=v.merchant,binding={vendor,merchantId:m?.id,locationId:s.locationId,season:m?.season,day:s.day,life:s.seed+':'+(s.timeline?.birthDay||0)+':'+(s.dynasty?.generation||1)};
 let reason=shopAccessReason(s,vendor);
 if(!reason&&(draft.merchantId!==m.id||draft.locationId!==s.locationId||draft.season!==m.season))reason='This offer belongs to an earlier shop visit. Clear it and ask again.';
 const lists={buy:[],sell:[]};
 for(const side of ['buy','sell']){
  const rows=draft[side];if(!Array.isArray(rows)||rows.length>400){reason||='The offer could not be read.';continue;}
  const seen=new Set();
  for(const row of rows){
   const item=v[side].find(i=>i.id===row?.id);
   if(!item||seen.has(row.id)||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>item.quantity||item.disabledReason){reason||=item?.disabledReason||'An offered item is no longer available.';continue;}
   seen.add(row.id);lists[side].push({id:row.id,quantity:row.quantity,price:item.price,name:item.name});
  }
  lists[side].sort((a,b)=>a.id.localeCompare(b.id));
 }
 if(s.trail&&s.trail.kits.filter(k=>k.remaining>0).length+lists.buy.filter(r=>r.id.startsWith('camp:')).reduce((n,r)=>n+r.quantity,0)>30)reason||='Your camp pack storage is full.';
 if(vendor==='inn'&&lists.buy.some(r=>(s.hospitality?.bag[r.id.slice(7)]||0)+r.quantity>10000))reason||='There is no more room for these provisions.';
 const buyTotal=lists.buy.reduce((n,r)=>n+r.price*r.quantity,0),sellTotal=lists.sell.reduce((n,r)=>n+r.price*r.quantity,0),goldDue=buyTotal-sellTotal;
 if(!reason&&vendor==='materials'&&lists.buy.reduce((n,r)=>n+r.quantity,0)>1)reason='Collect one bundle per trade. Each collection takes one real day.';
 if(!reason&&!lists.buy.length&&!lists.sell.length)reason='Choose goods from either inventory to make an offer.';
 if(!reason&&goldDue>s.hero.gold)reason=`You need ${goldDue-s.hero.gold} more Gold, or goods of that value.`;
 const days=vendor==='materials'?lists.buy.reduce((n,r)=>n+r.quantity,0):0;
 if(!reason&&days&&s.timeline?.mode==='birth'){const birth=s.timeline.birthDay||0,next=birth+(Math.floor((s.day-birth)/365)+1)*365;if(s.day+days>=next)reason='Your next birthday is due. Choose Age up before starting this activity.';}
 return {...binding,...lists,buyTotal,sellTotal,goldDue,goldAfter:s.hero.gold-goldDue,...(vendor==='materials'?{days}:{}),disabledReason:reason};
}
export function applyTrade(s,quote,ctx={}){
 if(!quote||typeof quote!=='object')return false;
 const fresh=quoteTrade(s,quote);
 if(fresh.disabledReason||JSON.stringify(fresh)!==JSON.stringify(quote))return false;
 const vendorName=tradeMerchant(s,fresh.vendor).name;
 const isInn=fresh.vendor==='inn',m=isInn?innMerchant(s):s.realm.sites[s.locationId].merchant,stock=isInn?keepInnLedger(s):null;
 for(const row of fresh.sell){const id=row.id.slice(row.id.indexOf(':')+1);if(row.id.startsWith('gear:')){discardGear(s,id);if(!isInn&&m&&GEAR_CATALOG.some(i=>i.id===id))m.stock[id]=(m.stock[id]||0)+1;}else s.adventuring.loot=s.adventuring.loot.filter(l=>l.id!==id);}
 for(const row of fresh.buy){const id=row.id.slice(row.id.indexOf(':')+1);if(row.id.startsWith('material:'))s.equipment.materials[id]+=row.quantity*3;else if(row.id.startsWith('gear:')){s.equipment.owned.push(id);m.stock[id]--;}else if(row.id.startsWith('camp:'))addCampingKit(s,id);else if(isInn&&INN_GOODS.some(g=>g.id===id)){s.hospitality.bag[id]+=row.quantity;stock.stock[id]-=row.quantity;}else if(id==='potions'){s.hero.potions+=row.quantity;m.potions-=row.quantity;}else if(id==='rations'){s.adventuring.rations+=row.quantity;m.rations-=row.quantity;}}
 s.hero.gold=fresh.goldAfter;
 const names=rows=>rows.map(r=>`${r.quantity} × ${r.name}`).join(', ');
 const receipt=`${vendorName}: ${fresh.buy.length?'You received '+names(fresh.buy)+'. ':''}${fresh.sell.length?'You handed over '+names(fresh.sell)+'. ':''}${fresh.goldDue>0?'You paid '+fresh.goldDue+' Gold.': fresh.goldDue<0?'You received '+(-fresh.goldDue)+' Gold.':'No coins changed hands.'} ${s.hero.gold} Gold remains.${fresh.days?' Collection takes '+fresh.days+' day'+(fresh.days===1?'':'s')+'.':''}`;
 s.notice=receipt;(ctx.journalLiteral||ctx.journal)?.('A Trade Across the Counter',receipt,'realm');return true;
}
