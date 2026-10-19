import { seededRoll } from './world.js';

const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
const integer = (value, min = 0, max = 10000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const keys = ['id', 'name', 'ownerId', 'ownerName', 'locationId', 'regionId', 'worldYear', 'value'];

/** The existing burglary property, captured before any calendar work begins. */
export function householdSilver(s, locationId = s.locationId, day = s.day) {
  const site = s.realm?.sites?.[locationId], merchant = site?.merchant;
  if (!merchant || !text(merchant.id, 160) || !text(merchant.name, 120) || !integer(day)) return null;
  return {
    id: `household-${merchant.id}-${Math.floor(day / 365)}`,
    name: `${merchant.name}’s engraved household silver`, ownerId: merchant.id, ownerName: merchant.name,
    locationId, regionId: site.regionId, worldYear: Math.floor(day / 365),
    value: 90 + seededRoll(s.seed, 'silver:' + merchant.id, 51),
  };
}

/** Historical snapshots remain valid after their owner retires or year passes. */
export function validateHouseholdSilver(p, s) {
  return object(p) && Object.keys(p).length === keys.length && Object.keys(p).every(key => keys.includes(key))
    && text(p.ownerId, 160) && text(p.ownerName, 120) && text(p.name, 160) && text(p.id, 240)
    && s.world.locations.some(place => place.id === p.locationId)
    && s.realm.regions.some(region => region.id === p.regionId) && integer(p.worldYear, 0, Math.floor(s.day / 365))
    && p.id === `household-${p.ownerId}-${p.worldYear}` && p.name === `${p.ownerName}’s engraved household silver`
    && p.value === 90 + seededRoll(s.seed, 'silver:' + p.ownerId, 51);
}

/** A receipt or a finished case is proof of a claim, never a second asset. */
export function propertyAlreadyTaken(s, propertyId) {
  const job = s.justice?.countingTableJob;
  return !!(s.justice?.takenProperties?.includes(propertyId)
    || job?.status === 'completed' && job.target?.id === propertyId
    || (s.adventuring?.loot || []).some(loot => loot.stolen && loot.propertyId === propertyId)
    || [...(s.equipment?.instances || []), ...(s.justice?.propertyTransfers || [])]
      .some(item => item.stolen && item.provenance?.propertyId === propertyId));
}

export function householdSilverReason(s, p, { requireHere = true } = {}) {
  if (!validateHouseholdSilver(p, s)) return 'The saved silver target cannot be verified. Nothing is replaced or awarded.';
  const place = s.world.locations.find(place => place.id === p.locationId), site = s.realm.sites[p.locationId];
  if (requireHere && (s.locationId !== p.locationId || s.cartography?.offsite || s.cartography?.pending || s.timeline?.journey)) return 'Return to the silver’s recorded settlement.';
  if (!site || ['destroyed', 'evacuated'].includes(place.status) || place.servicesAvailable === false || site.phase === 'ruin'
    || s.realm.politics?.holds.some(hold => hold.siteId === p.locationId && hold.status === 'held')) return 'The recorded market is closed or occupied. The target has not been replaced.';
  if (site.regionId !== p.regionId) return 'The recorded jurisdiction has changed. Withdraw rather than substituting another target.';
  if (site.merchant?.id !== p.ownerId || site.merchant.alive === false || site.merchant.available === false || site.merchant.retired) return 'The original merchant is no longer available. A successor does not own this saved opportunity.';
  if (Math.floor(s.day / 365) !== p.worldYear) return 'The saved valuation year has ended. This opportunity cannot become another year’s silver.';
  if (propertyAlreadyTaken(s, p.id)) return 'That exact household silver has already been claimed. No second piece is created.';
  return null;
}

/** Keep current silver claims and this finite case while pruning old history. */
export function takenPropertiesWith(s, propertyId) {
  if (!text(propertyId, 240)) return null;
  const rows = [...new Set([...(s.justice?.takenProperties || []), propertyId])];
  const protectedIds = new Set(Object.keys(s.realm?.sites || {}).map(id => householdSilver(s, id)?.id).filter(Boolean));
  const job = s.justice?.countingTableJob;
  if (job?.target?.id) protectedIds.add(job.target.id);
  protectedIds.add(propertyId);
  while (rows.length > 200) {
    const index = rows.findIndex(id => !protectedIds.has(id));
    if (index < 0) return null;
    rows.splice(index, 1);
  }
  return rows;
}

/** World property stays missing across player succession; criminal guilt does not. */
export function inheritTakenProperties(previous, next) {
  const claims = previous.justice?.takenProperties === undefined ? [] : previous.justice.takenProperties;
  if (!next.justice || !Array.isArray(claims) || claims.length > 200 || claims.some(id => typeof id !== 'string' || id.length > 240)) return false;
  next.justice.takenProperties = structuredClone(claims);
  return true;
}

/** The only silver grant. No Gold, stock, standing, oath or report is changed. */
export function claimHouseholdSilver(s, p, { lootId } = {}) {
  if (householdSilverReason(s, p) || !text(lootId, 160) || !Array.isArray(s.adventuring?.loot)
    || s.adventuring.loot.length >= 160 || !s.justice
    || s.adventuring.loot.some(loot => loot.id === lootId)
    || [...(s.equipment?.instances || []), ...(s.justice.propertyTransfers || [])].some(item => item.provenance?.lootId === lootId)) return null;
  const takenProperties = takenPropertiesWith(s, p.id);
  if (!takenProperties) return null;
  const loot = { id: lootId, name: p.name, value: p.value, stolen: true, source: p.locationId, day: s.day,
    ownerId: p.ownerId, ownerName: p.ownerName, propertyId: p.id };
  s.justice.takenProperties = takenProperties;
  s.adventuring.loot.push(loot);
  return loot;
}
