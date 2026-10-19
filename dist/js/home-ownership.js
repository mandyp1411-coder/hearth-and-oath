import { householdCostPreview } from './budget.js';

export const HOME_DEFINITIONS = {
 cottage: { label: 'Cottage', price: 120, days: 7, upkeep: 30 },
 townhouse: { label: 'Townhouse', price: 340, days: 14, upkeep: 90 },
 estate: { label: 'Estate', price: 900, days: 21, upkeep: 240 },
};
const order = ['lodgings', 'cottage', 'townhouse', 'estate'];
export function householdHome(s) {
 const saved=s.life?.home||{tier:'lodgings'},cottages=(s.workshop?.structures||[]).filter(b=>b.type==='cottage'&&b.condition!=='lost');
 const owned=order.indexOf(saved.tier)>0;
 // Older worlds may have several built cottages. Preserve every structure and
 // the recorded primary home; derive a restriction, never delete or liquidate.
 return { ...saved, tier:owned?saved.tier:cottages.length?'cottage':'lodgings', owned:owned||cottages.length>0, locationId:saved.locationId||(!owned?cottages[0]?.locationId:null)||null, legacyCottages:cottages };
}
export function homePurchaseReason(s,tier) {
 if(!HOME_DEFINITIONS[tier])return 'This home is not available.';
 if(s.workshop?.project?.kind==='build'&&s.workshop.project.targetId==='cottage')return 'Finish or cancel your current cottage project before changing your home.';
 const current=householdHome(s);
 if(current.owned&&order.indexOf(tier)<=order.indexOf(current.tier))return 'You already own a home. Only an upgrade to a larger townhouse or estate is available.';
 return null;
}
export function newCottageReason(s) {
 return householdHome(s).owned?'You already own a home. Upgrade to a townhouse or estate in Homes instead of building another cottage.':null;
}
export function homePurchasePreview(s,tier) {
 const target=HOME_DEFINITIONS[tier];if(!target)return null;
 const home=householdHome(s),site=s.world.locations.find(p=>p.id===s.locationId),previous=s.world.locations.find(p=>p.id===home.locationId);
 const q={tier,actionId:'life_home_'+tier,from:home.owned?HOME_DEFINITIONS[home.tier].label:'Lodgings',fromPlace:previous?.name||'Address not recorded',to:target.label,toPlace:site?.name||s.locationId,upgrading:home.owned,cost:target.price,days:target.days,upkeep:target.upkeep,livingCost:householdCostPreview(s,target.days).totalDue,disabledReason:homePurchaseReason(s,tier)};
 return {...q,signature:JSON.stringify([q,s.day,s.hero.gold,s.locationId,s.life.home,s.workshop?.structures||[]])};
}
