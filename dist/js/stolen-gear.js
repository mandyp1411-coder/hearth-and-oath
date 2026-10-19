import { GEAR_CATALOG, getGearItem, ownedGear, discardGear } from './gear.js';
import { validateStolenGearRecord } from './gear-loot.js';
import { seededRoll } from './world.js';

// A stolen piece is one ordinary catalog item, not an upgraded dungeon drop.
// Provenance records a claim; it is never another separately saleable asset.
export const stolenGear = s => ownedGear(s).filter(i=>i.stolen);
export const stolenGearCapacityReason = s => (s.equipment?.instances?.length||0)>=120?'Your gear bag has reached its 120 individually recorded pieces. Sell equipment before taking another.':null;
export function carryStolenGear(s,loot,baseId,{id,stockSeason}={}) {
  if(!s.equipment||loot.day>s.day||!GEAR_CATALOG.some(i=>i.id===baseId)||stolenGearCapacityReason(s))return null;
  const instances=s.equipment.instances||[];
  id||=`stolen_legacy_${seededRoll(s.seed,'stolen-item:'+loot.id,2147483647).toString(36)}_${s.dynasty?.generation||1}`;
  if(s.equipment.owned.includes(id)||[...instances,...(s.justice?.propertyTransfers||[])].some(i=>i.id===id||i.stolen&&i.provenance.lootId===loot.id))return null;
  const record={id,baseId,stolen:true,quality:'common',affix:'plain',tier:1,source:loot.source,day:loot.day,provenance:{lootId:loot.id,label:loot.name,ownerId:loot.ownerId??null,ownerName:loot.ownerName??null,propertyId:loot.propertyId??null,value:loot.value,...(stockSeason!==undefined?{stockSeason}:{})}};
  if(!validateStolenGearRecord(record,GEAR_CATALOG))return null;
  s.equipment.instances=instances;s.equipment.instances.push(record);s.equipment.owned.push(id);
  return getGearItem(s,id);
}
export function migrateStolenGear(s) {
  if(!s.equipment||!s.adventuring?.loot)return;
  for(const loot of [...s.adventuring.loot]) {
    if(!loot.stolen)continue;
    // Explicit, recognized metadata only. Never infer identity from a label,
    // artwork or a historical merchant/property ID, even if it looks obvious.
    const ids=[loot.itemId,loot.gearId].filter(id=>id!==undefined);
    if(!ids.length||ids.some(id=>id!==ids[0])||!GEAR_CATALOG.some(i=>i.id===ids[0]))continue;
    const known=t=>t===undefined||typeof t==='string'&&t.length>0;
    if(!known(loot.ownerId)||!known(loot.ownerName)||!known(loot.propertyId))continue;
    const item=carryStolenGear(s,loot,ids[0]);
    if(item)s.adventuring.loot=s.adventuring.loot.filter(l=>l.id!==loot.id);
  }
}
export function transferStolenGear(s,id,{outcome,recipientId,recipientName,price=0}={}) {
  const record=s.equipment?.instances?.find(i=>i.id===id&&i.stolen);
  if(!record||!s.equipment.owned.includes(id)||!['sold','returned'].includes(outcome))return false;
  s.justice.propertyTransfers||=[];
  if(s.justice.propertyTransfers.some(p=>p.id===id))return false;
  s.justice.propertyTransfers.push({...structuredClone(record),outcome,recipientId,recipientName,price,transferredDay:s.day});
  s.justice.propertyTransfers=s.justice.propertyTransfers.slice(-200);
  discardGear(s,id);
  return true;
}
