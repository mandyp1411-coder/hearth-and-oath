import { seededRoll } from './world.js';
import { settlementServices } from './world-services.js';
import { markSiteKnowledge } from './cartography.js';
import { evidenceFor, hasEvidence, recordEvidenceOnce, finishObjectiveOnce } from './objective-evidence.js';
import { FIRST_MISSION_METHODS, captureMissionActor, makeFirstMission, validateFirstMission } from './faction-mission-state.js';

const definitions = {
  lantern_compact: { title: 'Blankets Without Names', intro: 'The refuge needs warm bedding, not a buyer for its guest list. Its steward will share anonymous totals and a finite linen allocation, never the names of guests.', roles: { steward: ['Shelter Steward', 'shrine'] }, services: ['archivist', 'smith'], values: { guests: 9, covers: 7, spare: 2 }, methods: {
    allocation: ['Reconcile the anonymous bedding allocation', 'Compare the archive totals, then spend a day assigning two spare covers with the steward. Two attended days; no personal supplies.'],
    mending: ['Make replacement covers', 'Use 2 real Cloth and keep two craft days, then deliver the covers to the steward. No guest names or fee.'],
  } },
  salt_ledger: { title: 'Three Marks on One Cargo', intro: 'One recovered cargo carries three claims. A manifest, a packing mark and the surviving sailor’s account can establish custody; none makes the cargo yours.', roles: { sailor: ['Surviving Sailor', 'tavern'], ownerA: ['Cargo Claimant', 'market'], ownerB: ['Cargo Claimant', 'market'], ownerC: ['Cargo Claimant', 'market'] }, services: ['archivist'], values: { seal: 'reed-and-ring', manifest: 'reed-and-ring', claim: 'ownerB' }, methods: {
    marks: ['Follow packing marks and the manifest', 'Inspect the finite cargo at Market for one day, then compare the archive manifest for one day. No skill threshold.'],
    testimony: ['Reconcile the sailor and claimants’ accounts', 'Persuasion 4. Hear the willing sailor for one day, then mediate the three loading accounts at Market for one day.'],
  } },
  unbound_archive: { title: 'The Uncounted Shift', intro: 'Two foundry wage records disagree. Establish the amount earned from working time and the posted rate. The worker’s household and private life are not evidence.', roles: { worker: ['Foundry Worker', 'work'] }, services: ['archivist'], values: { shifts: 3, rate: 6, paid: 12 }, methods: {
    comparison: ['Compare the dated tally and rate', 'Scholarship 4. Keep one archive day comparing the original dates and posted rate, then record the supported total.'],
    reconstruction: ['Reconstruct the shift with the worker', 'Hear the consenting worker for one day, then spend two archive days checking the public shift-bell register. No skill threshold.'],
  } },
  rootward_circle: { title: 'A Path Through the Seed Bed', intro: 'The new seed bed crosses a tenant’s gathering path. Keep the old right of access, or move the planting with the tenant’s agreement. A map rumor is not a visit.', roles: { tenant: ['Gathering Tenant', 'tavern'] }, services: ['smith'], values: {}, methods: {
    access: ['Walk the gathering route and preserve access', 'Travel to the recorded forest site, then keep one field day and one day agreeing an access strip. Survival 4 shortens field assessment; no skill is required.'],
    planters: ['Move the planting into raised trays', 'Ask the tenant’s consent, supply 2 Wood and 1 Cloth, and keep two craft days. The gathering path stays open. No skill threshold.'],
  } },
  ash_company: { title: 'Signatures Without Coin', intro: 'The chest holds less than the signed payroll promises. Document the shortfall without inventing either a theft verdict or a payment to veterans.', roles: { veteran: ['Company Veteran', 'gate'] }, services: ['archivist', 'watch'], values: { promised: 42, counted: 30 }, methods: {
    payroll: ['Reconcile the payroll and chest', 'Keep two archive days comparing signatures, then witness the chest count at Watchhouse for one day. No skill threshold.'],
    muster: ['Attend a voluntary company muster', 'Weapons 4. Keep one day with a veteran at Gate collecting willing payee accounts, then one day reconciling the count at Watchhouse.'],
  } },
  quiet_table: { title: 'A Seal May Be Refused', intro: 'A sealed parcel has one living adult recipient. Ask before delivery. A refusal means returning the same parcel, not forcing it on them. Its ordinary papers are not contraband.', roles: { recipient: ['Parcel Recipient', 'homes'], intermediary: ['Willing Courier', 'market'] }, services: [], values: { parcelState: 'held', recipientWilling: true }, methods: {
    direct: ['Ask and deliver in person', 'Ask the recipient at Residential Lane for one attended day. If willing, keep one delivery day; otherwise return the sealed parcel. No skill threshold.'],
    relay: ['Arrange a countersigned private relay', 'Stealth 4. Obtain the recipient’s explicit written reply through the sender, then use their named willing courier and obtain a final receipt. Secrecy never supplies consent.'],
  } },
};
const skillForMethod = { testimony: ['persuasion', 4], comparison: ['scholarship', 4], muster: ['weapons', 4], relay: ['stealth', 4] };
const site = (s, id) => s.world.locations.find(p => p.id === id);
const open = (s, id) => { const p = site(s, id); return p && !['destroyed', 'evacuated'].includes(p.status) && p.servicesAvailable !== false && !s.realm?.politics?.holds.some(h => h.siteId === id && h.status === 'held'); };
const runFor = (s, id) => s.rpg?.factions.find(f => f.id === id)?.firstMission;
const actionId = (id, step) => `rpg_objective_${id}__${step}`;
const splitAction = id => { const match = /^rpg_objective_(.+)__([a-z_]+)$/.exec(id); return match && { factionId: match[1], stepId: match[2] }; };
const effectiveActor = (m, key) => m.custody.filter(row => row.key === key).at(-1)?.to || m.cast[key];
// Only this authenticated prospective case may retain its authored Journal copy.
// Legacy RPG producers and malformed owners still pass through historical rewriting.
function missionNote(s, ctx, m, note, title, text) {
  const faction = s.rpg?.factions.find(f => f.id === m.definitionId);
  const authored = faction?.firstMission === m && validateFactionFirstMission(m, faction, s);
  note(s, ctx, title, text, authored ? { narrativeEdition: 30 } : {});
}
const workRoom = (s, locationId) => settlementServices(s, { siteId: locationId }).find(r => r.kind === 'smith')?.roomId || 'market';
const roomFor = (s, m, key) => {
  const p = effectiveActor(m, key);
  return p?.roomId === 'work' ? workRoom(s, p.locationId) : p?.roomId;
};
function liveActor(s, p) {
  if (!p || !open(s, p.locationId)) return null;
  if (p.source === 'service') return settlementServices(s, { siteId: p.locationId }).find(r => r.personId === p.id && r.person.available !== false && r.person.alive !== false && !r.person.retired)?.person || null;
  return s.rpg.contacts.find(actor => actor.id === p.id && actor.alive !== false && actor.available !== false && !actor.retired && actor.locationId === p.locationId) || null;
}
function missingActor(s, m, key) {
  const p = effectiveActor(m, key), actual = p?.source === 'rpg' && s.rpg.contacts.find(actor => actor.id === p.id);
  if (!p) return 'The saved participant is missing. No evidence or reward is created.';
  if (!open(s, p.locationId)) return `The recorded work at ${site(s, p.locationId)?.name || p.locationId} is closed or occupied. Earlier evidence remains; wait or withdraw.`;
  if (liveActor(s, p)) return null;
  return actual?.alive === false ? `${p.name} has died. Their earlier account remains; no new testimony or consent can be claimed.` : `${p.name} is not available for this work. A replacement cannot supply their testimony or consent.`;
}
function fieldDestination(s, locationId) {
  const distances = new Map([[locationId, 0]]), queue = [locationId];
  while (queue.length) {
    queue.sort((a, b) => distances.get(a) - distances.get(b) || a.localeCompare(b));
    const here = queue.shift();
    for (const road of s.world.roads.filter(r => !r.closed && [r.from, r.to].includes(here))) {
      const id = road.from === here ? road.to : road.from;
      const distance = distances.get(here) + Math.max(1, road.days || 1);
      if (open(s, id) && distance < (distances.get(id) ?? Infinity)) { distances.set(id, distance); if (!queue.includes(id)) queue.push(id); }
    }
  }
  return s.world.locations.filter(p => p.id !== locationId && open(s, p.id) && distances.has(p.id)
    && s.realm.sites[p.id]?.regionId === 'blackgrove' && ['forest', 'grove'].includes(p.type)).sort((a, b) => distances.get(a.id) - distances.get(b.id) || a.id.localeCompare(b.id))[0]?.id || null;
}
function offerReason(s, d, method) {
  const def = definitions[d.id], rows = settlementServices(s), rep = rows.find(r => r.kind === 'faction' && r.subjectId === d.id && r.here);
  if (!rep || !open(s, s.locationId)) return 'Meet this faction’s current representative in an open settlement.';
  if (s.rpg.contacts.length + Object.keys(def.roles).length > 128) return 'There is no room for another set of named participants. No work has been accepted.';
  if (def.services.some(kind => !rows.some(r => r.kind === kind))) return 'The public records or craft service needed for this case are not available here.';
  if (d.id === 'rootward_circle' && method === 'access' && !fieldDestination(s, s.locationId)) return 'No open connected forest gathering route is available. Choose the raised-tray method or return later.';
  const skill = skillForMethod[method];
  return skill && s.hero.skills[skill[0]] < skill[1] ? `Requires ${skill[0]} ${skill[1]}; the other method has no skill threshold.` : null;
}
export function firstMissionTitle(id) { return definitions[id]?.title; }
export function openFirstMissionOffer(s, d, ctx) {
  const def = definitions[d.id];
  s.rpg.pending = { kind: 'faction', id: d.id, chapter: 0, locationId: s.locationId, firstOffer: true };
  ctx.setEvent('rpg_faction', def.title, d.name, `${def.intro}\n\nChoose a concrete method to accept this finite agreement. Completion, including an honestly refused-and-returned parcel, pays 20 Gold and advances one rank. Travel and household costs are separate. Reading or leaving accepts nothing.`, [
    ...FIRST_MISSION_METHODS[d.id].map(method => ({ id: 'accept_' + method, label: def.methods[method][0], description: def.methods[method][1], ...(offerReason(s, d, method) ? { disabledReason: offerReason(s, d, method) } : {}) })),
    { id: 'leave', label: 'Leave the proposal open', description: 'No accepted commitment, time, fee or reward.' },
  ]);
  return true;
}
export function firstMissionOfferReason(s, id) {
  const p = s.rpg?.pending;
  if (!p?.firstOffer || id === 'leave') return null;
  const method = id.slice(7), def = definitions[p.id];
  if (!id.startsWith('accept_') || !def || !FIRST_MISSION_METHODS[p.id].includes(method)) return 'That method is not part of this proposal.';
  return offerReason(s, { id: p.id }, method);
}
export function acceptFirstMission(s, d, method, ctx, { makeContact, note }) {
  const faction = s.rpg.factions.find(f => f.id === d.id);
  if (!faction || faction.rank !== 0 || faction.firstMission || !FIRST_MISSION_METHODS[d.id]?.includes(method) || offerReason(s, d, method)) return false;
  const def = definitions[d.id], rows = settlementServices(s), cast = {};
  const fieldLocationId = d.id === 'rootward_circle' && method === 'access' ? fieldDestination(s, s.locationId) : null;
  for (const [key, [role, roomId]] of Object.entries(def.roles)) {
    const p = makeContact(`first-${d.id}-${key}-${s.dynasty?.generation || 1}-${s.day}`, d.regionId, role, s.locationId);
    if (d.id === 'rootward_circle' && method === 'access' && key === 'tenant') p.locationId = fieldLocationId;
    p.roomId = d.id === 'rootward_circle' && method === 'access' && key === 'tenant' ? null : roomId === 'work' ? workRoom(s, s.locationId) : roomId;
    if (roomId === 'work') p.firstMissionWorkplace = 'smith';
    cast[key] = captureMissionActor(p, { roomId: p.roomId === workRoom(s, s.locationId) && roomId === 'work' ? 'work' : p.roomId });
  }
  for (const kind of ['faction', ...def.services]) {
    const row = rows.find(r => r.kind === kind && (kind !== 'faction' || r.subjectId === d.id));
    cast[kind] = captureMissionActor(row.person, { source: 'service', sourceId: row.id, serviceKind: row.kind, subjectId: row.subjectId || null, roomId: row.roomId });
  }
  const targetId = `first-${d.id}-${s.dynasty?.generation || 1}-${s.day}`;
  const m = makeFirstMission({ factionId: d.id, day: s.day, locationId: s.locationId, cast, targetId, fieldLocationId, values: def.values });
  m.method = method;
  if (d.id === 'quiet_table') m.values.recipientWilling = seededRoll(s.seed, targetId + ':recipient-choice', 5) !== 0;
  faction.firstMission = m;
  if (m.fieldLocationId) markSiteKnowledge(s, m.fieldLocationId, 'Rumored', 'Directions for your accepted gathering-path agreement');
  missionNote(s, ctx, m, note, def.title, `You accepted ${def.methods[method][0].toLowerCase()}. The named people, case and method are saved. No day, material, fee or reward has changed yet.`);
  return true;
}

const step = (id, label, actor, days, kind, text, extra = {}) => ({ id, label, actor, days, kind, text, ...extra });
function steps(s, m) {
  const v = m.values;
  switch (m.definitionId) {
    case 'lantern_compact': return m.method === 'allocation' ? [
      step('blanket_totals', 'Compare the anonymous bedding totals', 'archivist', 1, 'record', `${v.guests} guests, ${v.covers} covers in use and ${v.spare} spare covers are recorded. No guest names are copied.`),
      step('allocate_covers', 'Assign the two recorded spare covers with the steward', 'steward', 1, 'receipt', 'The two identified covers move within this finite refuge allocation. Nobody sells a guest list.'),
      step('report', 'Return the anonymous allocation to the Compact', 'faction', 0, 'receipt', 'Record the completed allocation and receive the agreed 20 Gold.', { finish: true }),
    ] : [
      step('mend_covers', 'Mend two replacement covers', 'smith', 2, 'material', 'Consume 2 real Cloth once and keep two craft days. No guest identities are needed.', { materials: { cloth: 2 } }),
      step('deliver_covers', 'Deliver the mended covers to the shelter steward', 'steward', 1, 'receipt', 'The two covers you made reach the finite refuge allocation; no second material charge.'),
      step('report', 'Return the completed bedding account to the Compact', 'faction', 0, 'receipt', 'Record the replacements and receive the agreed 20 Gold.', { finish: true }),
    ];
    case 'salt_ledger': return m.method === 'marks' ? [
      step('cargo_marks', 'Inspect the recovered cargo’s packing marks', 'ownerB', 1, 'inspection', `The surviving packing mark reads “${v.seal}.” Inspection does not give you the cargo.`),
      step('cargo_manifest', 'Compare the original cargo manifest', 'archivist', 1, 'record', `The manifest assigns the ${v.manifest} mark to ${m.cast.ownerB.name}; the other two claims concern separate loads.`, { decision: 'cargo' }),
      step('report', 'Record the supported cargo custody', 'faction', 0, 'receipt', 'Acknowledge the identified owner without taking their property. Receive the agreed 20 Gold.', { finish: true }),
    ] : [
      step('sailor_account', 'Hear the surviving sailor’s loading account', 'sailor', 1, 'testimony', `${m.cast.sailor.name} willingly recalls loading ${m.cast.ownerB.name}’s reed-and-ring cargo after the other two loads had left.`),
      step('claimant_accounts', 'Mediate the three claimants’ loading accounts', 'ownerB', 1, 'testimony', 'Hear all three willing claimants at Market; compare their loading sequence, not their wealth.', { participants: ['ownerA', 'ownerB', 'ownerC'], decision: 'cargo' }),
      step('report', 'Record the witnessed cargo custody', 'faction', 0, 'receipt', 'Record the sailor and claimants’ actual accounts; no cargo becomes yours. Receive the agreed 20 Gold.', { finish: true }),
    ];
    case 'unbound_archive': return m.method === 'comparison' ? [
      step('wage_compare', 'Compare the dated shift tally and piece-rate', 'archivist', 1, 'record', `The tally records ${v.shifts} shifts at ${v.rate} Gold each; the payment book records ${v.paid} Gold already paid.`, { decision: 'wage' }),
      step('report', 'File the supported foundry wage correction', 'faction', 0, 'receipt', 'Record what was earned and what remains unpaid. No employer funds are invented. Receive the agreed 20 Gold.', { finish: true }),
    ] : [
      step('worker_account', 'Ask the worker about the interrupted shift', 'worker', 1, 'testimony', 'The worker willingly describes the working hours. Their private life is excluded from the record.'),
      step('wage_reconstruct', 'Reconstruct the shift against the public bell register', 'archivist', 2, 'record', `The public bell register confirms ${v.shifts} shifts at ${v.rate} Gold each, with ${v.paid} Gold already paid.`, { decision: 'wage', participants: ['archivist', 'worker'] }),
      step('report', 'File the worker-endorsed reconstruction', 'faction', 0, 'receipt', 'The worker endorses this limited reconstruction, not disclosure of their household. Receive the agreed 20 Gold.', { finish: true }),
    ];
    case 'rootward_circle': return m.method === 'access' ? [
      step('field_account', 'Walk the gathering path with the tenant', 'tenant', s.hero.skills.survival >= 4 ? 1 : 2, 'inspection', 'Actual arrival at the recorded forest site is required. Identify the gathering strip without moving the tenant’s rights.', { field: true }),
      step('access_strip', 'Agree the access strip with the tenant on the path', 'tenant', 1, 'consent', 'The tenant freely agrees to an access strip through the planting. No exclusive land claim is created.', { field: true }),
      step('report', 'Record the preserved gathering access', 'faction', 0, 'receipt', 'Record the actual walked route and agreed strip. The later route service remains unearned until rank three.', { finish: true }),
    ] : [
      step('tenant_consent', 'Ask the tenant whether raised trays would resolve the conflict', 'tenant', 1, 'consent', 'The tenant agrees to move only the seed planting, not their gathering right.'),
      step('raised_trays', 'Build and place the raised seed trays', 'smith', 2, 'material', 'Use 2 real Wood and 1 Cloth once. Move this finite seed bed off the gathering path.', { materials: { wood: 2, cloth: 1 } }),
      step('report', 'Record the relocated planting and open path', 'faction', 0, 'receipt', 'The tenant’s old access remains. Receive the agreed 20 Gold; no global land ownership changes.', { finish: true }),
    ];
    case 'ash_company': return m.method === 'payroll' ? [
      step('signed_payroll', 'Compare the company’s signed payroll', 'archivist', 2, 'record', `The signatures promise ${v.promised} Gold; the chest still needs an actual count.`),
      step('chest_count', 'Witness the company chest count', 'watch', 1, 'inspection', `The finite chest contains ${v.counted} Gold, against ${v.promised} promised. This is a shortfall, not proof of who caused it.`, { decision: 'chest' }),
      step('report', 'Record the documented wage shortfall', 'faction', 0, 'receipt', 'No wages have been paid by this investigation. Receive only your agreed 20 Gold.', { finish: true }),
    ] : [
      step('voluntary_muster', 'Attend the veteran’s voluntary company muster', 'veteran', 1, 'testimony', `A willing veteran assembles the payees’ accounts at Gate. They describe ${v.promised} Gold promised, without an order to obey you.`),
      step('muster_count', 'Reconcile the witnessed payee accounts with the chest', 'watch', 1, 'inspection', `The count is ${v.counted} Gold against ${v.promised} promised. Preserve disputed signatures without claiming a theft verdict.`, { decision: 'chest', participants: ['watch', 'veteran'] }),
      step('report', 'Record the witnessed wage shortfall', 'faction', 0, 'receipt', 'The named veteran’s account remains distinct from the chest count. Receive the agreed 20 Gold.', { finish: true }),
    ];
    case 'quiet_table': {
      const refused = evidenceFor(m, 'recipient_reply')?.disposition === 'refused';
      const opening = m.method === 'direct'
        ? step('recipient_reply', 'Ask the recipient whether they want this sealed parcel', 'recipient', 1, 'consent', 'Ask at their door without entering their home. A willing answer or refusal belongs to this person alone.')
        : step('recipient_reply', 'Request the recipient’s explicit countersign', 'faction', 1, 'consent', 'The sender forwards one request and brings back the actual recipient’s written answer. The sender cannot consent for them.', { remote: ['recipient'] });
      if (refused) return [opening, step('return_parcel', 'Return the same refused parcel, seal intact', 'faction', 1, 'receipt', 'Return the held parcel. This completes a refused-and-returned agreement, never a delivery.', { finish: true })];
      return m.method === 'direct' ? [opening,
        step('direct_delivery', 'Hand the sealed parcel to the willing recipient', 'recipient', 1, 'receipt', 'Deliver this one held parcel only after its recipient’s actual willing answer.'),
        step('report', 'Return the direct-delivery receipt', 'faction', 0, 'receipt', 'Record the intact seal and named recipient. Receive the agreed 20 Gold.', { finish: true }),
      ] : [opening,
        step('relay_handoff', 'Hand the parcel to the recipient’s named willing courier', 'intermediary', 1, 'receipt', 'Verify the countersign, then transfer this parcel once. A relay handoff is not yet proof of delivery.', { remote: ['recipient'] }),
        step('relay_receipt', 'Receive the recipient’s signed delivery receipt', 'faction', 1, 'receipt', 'The named courier completes this finite handoff. The recipient confirms receipt and an intact seal.', { remote: ['recipient', 'intermediary'] }),
        step('report', 'File the countersigned relay receipt', 'faction', 0, 'receipt', 'Record who accepted each handoff, without publishing a private route. Receive the agreed 20 Gold.', { finish: true }),
      ];
    }
    default: return [];
  }
}
function nextStep(s, m) { return steps(s, m).find(row => !m.completedSteps.includes(row.id)) || null; }
function locationFor(m, row) { return row.field ? m.fieldLocationId : effectiveActor(m, row.actor)?.locationId; }
function participants(row) { return [...new Set([row.actor, ...(row.participants || []), ...(row.remote || [])])]; }
function stepReason(s, m, row, { presence = true, materials = true } = {}) {
  if (m.status !== 'active') return 'This finite agreement is no longer active.';
  for (const key of participants(row)) {
    // The tenant attends the agreed field visit, rather than permanently moving home.
    const reason = missingActor(s, m, key);
    if (reason) return reason;
  }
  const destination = locationFor(m, row);
  if (!destination || !open(s, destination)) return 'The saved destination is not available. Wait or withdraw without claiming completion.';
  if (presence && (s.locationId !== destination || s.cartography?.offsite || s.cartography?.pending || s.timeline?.journey)) return `Travel to ${site(s, destination)?.name || destination} for this work.`;
  const room = row.field ? null : roomFor(s, m, row.actor);
  if (presence && room && (s.cartography?.interior?.roomId || 'gate') !== room) return `Meet ${effectiveActor(m, row.actor).name} at the ${room === 'homes' ? 'Residential Lane' : room === 'archive' ? 'School & Archive' : room === 'workyard' ? 'Work Yard' : room}.`;
  if (row.field && !hasEvidence(m, ['route_arrival'])) return 'Walk to the recorded forest destination after accepting this agreement. A map or earlier visit is not arrival proof.';
  if (materials) for (const [id, count] of Object.entries(row.materials || {})) if ((s.equipment.materials[id] || 0) < count) return `Requires ${count} actual ${id}; none has been consumed.`;
  if (m.definitionId === 'quiet_table') {
    if (['direct_delivery', 'relay_handoff'].includes(row.id) && evidenceFor(m, 'recipient_reply')?.disposition !== 'willing') return 'This recipient has not given willing consent.';
    if (['direct_delivery', 'relay_handoff', 'return_parcel'].includes(row.id) && m.values.parcelState !== 'held') return 'That unique parcel is no longer held by you.';
    if (row.id === 'relay_receipt' && m.values.parcelState !== 'with_intermediary') return 'The named relay has not received the parcel.';
  }
  return null;
}
function describeAction(s, m, row) {
  const actor = effectiveActor(m, row.actor), reason = stepReason(s, m, row);
  const days = m.decisionStep === row.id ? 0 : row.days;
  return { id: actionId(m.definitionId, row.id), label: row.label, description: `${row.text} ${days} attended day${days === 1 ? '' : 's'}${m.decisionStep === row.id ? '; the comparison work is already complete' : ''}; no Gold fee.`, days, cost: 0, materials: structuredClone(row.materials || {}), group: 'Stories & discoveries', factionObjective: true, objectivePersonId: actor.id, objectiveServiceId: actor.source === 'service' ? actor.sourceId : null, objectiveRoomId: row.field ? null : roomFor(s, m, row.actor), ...(reason ? { disabledReason: reason } : {}) };
}
function custodyOffer(s, m, row) {
  for (const key of participants(row)) {
    const old = effectiveActor(m, key);
    if (old?.source !== 'service' || liveActor(s, old) || !open(s, old.locationId)) continue;
    const replacement = settlementServices(s, { siteId: old.locationId }).find(r => r.kind === old.serviceKind && (!old.subjectId || r.subjectId === old.subjectId));
    if (!replacement || replacement.personId === old.id) continue;
    return { key, old, replacement };
  }
  return null;
}
export function firstMissionActions(s) {
  const actions = [];
  for (const faction of s.rpg?.factions || []) {
    const m = faction.firstMission;
    if (!m || m.status !== 'active') continue;
    const row = nextStep(s, m);
    if (!row) continue;
    const custody = custodyOffer(s, m, row);
    if (custody && m.custody.length < 12) {
      const r = custody.replacement;
      actions.push({ id: actionId(faction.id, 'custody'), label: `Ask ${r.name} to take custody of the public work`, description: `${custody.old.name} is no longer in this office. The new custodian accepts only the public papers or remaining work, never someone else’s testimony, consent or private memory. No time or fee.`, days: 0, cost: 0, group: 'Stories & discoveries', factionObjective: true, objectiveServiceId: r.id, objectivePersonId: r.personId, objectiveRoomId: r.roomId, ...(!r.here ? { disabledReason: `Visit ${r.name} at the ${r.roomId}.` } : {}) });
    }
    const parcelReturn = m.definitionId === 'quiet_table' && m.values.parcelState === 'held';
    const sender = effectiveActor(m, 'faction');
    const senderHere = parcelReturn && !missingActor(s, m, 'faction') && s.locationId === sender.locationId && (s.cartography?.interior?.roomId || 'gate') === roomFor(s, m, 'faction');
    actions.push(describeAction(s, m, row), { id: actionId(faction.id, 'withdraw'), label: `Withdraw from ${definitions[faction.id].title}`, description: `Earlier attended days and consumed materials remain spent. No rank, skill, unfinished payment or invented delivery.${parcelReturn ? senderHere ? ' Hand the held parcel back to the present sender.' : ' The sealed parcel remains undelivered in the closed account; no return is falsely claimed.' : ''}`, days: 0, cost: 0, group: 'Stories & discoveries' });
  }
  return actions;
}
export function beginFirstMissionStep(s, id, ctx, { startProject, note }) {
  const parsed = splitAction(id), m = parsed && runFor(s, parsed.factionId);
  if (!m || m.status !== 'active') return false;
  const row = nextStep(s, m);
  if (parsed.stepId === 'withdraw') {
    if (m.definitionId === 'quiet_table' && m.values.parcelState === 'held') {
      const sender = effectiveActor(m, 'faction');
      if (!missingActor(s, m, 'faction') && s.locationId === sender.locationId && (s.cartography?.interior?.roomId || 'gate') === roomFor(s, m, 'faction')) m.values.parcelState = 'returned';
    }
    m.status = 'withdrawn'; m.ending = 'You withdrew without claiming the unfinished objective or its reward. Earlier evidence, days and consumed supplies remain.';
    if (m.definitionId === 'quiet_table') m.ending += m.values.parcelState === 'returned' ? ' You handed the still-sealed parcel back to its present sender.' : m.values.parcelState === 'with_intermediary' ? ' The named intermediary retains the last recorded custody; no recipient receipt is claimed.' : ' The parcel remains undelivered in this closed account; no handback or receipt is claimed.';
    missionNote(s, ctx, m, note, definitions[m.definitionId].title, m.ending); return true;
  }
  if (parsed.stepId === 'custody') {
    const offer = custodyOffer(s, m, row);
    if (!offer || !offer.replacement.here || m.custody.length >= 12) return false;
    const { key, old, replacement: r } = offer;
    m.custody.push({ day: s.day, key, fromId: old.id, to: captureMissionActor(r.person, { source: 'service', sourceId: r.id, serviceKind: r.kind, subjectId: r.subjectId || null, roomId: r.roomId }) });
    missionNote(s, ctx, m, note, 'A new custodian, not the same person', `${r.name} accepts custody of the public work after ${old.name} left the office. Earlier testimony, consent and evidence keep their original authors.`); return true;
  }
  if (!row || row.id !== parsed.stepId || stepReason(s, m, row)) return false;
  return startProject('faction-objective', m.definitionId, row.id, m.decisionStep === row.id ? 0 : row.days, 0, { missionVersion: m.version, acceptedDay: m.acceptedDay, stepId: row.id, locationId: locationFor(m, row), needsPresence: true, outdoors: !!row.field, materials: structuredClone(row.materials || {}), materialsSpent: false }, ctx);
}
export function factionObjectiveProjectReason(s, p) {
  const m = runFor(s, p.id), row = m && nextStep(s, m);
  if (!m || !row || row.id !== p.choice || p.details.acceptedDay !== m.acceptedDay) return 'The saved objective does not match this agreement. No time or reward is created.';
  return stepReason(s, m, row, { materials: !p.details.materialsSpent });
}
export function consumeFactionObjectiveMaterials(s, p) {
  if (p.details.materialsSpent) return;
  for (const [id, count] of Object.entries(p.details.materials)) s.equipment.materials[id] -= count;
  p.details.materialsSpent = true;
}
function addStepEvidence(s, m, row, { verified = true, disposition = 'observed' } = {}) {
  return recordEvidenceOnce(m, { id: row.id, kind: row.kind, day: s.day, locationId: locationFor(m, row), actorIds: participants(row).map(key => effectiveActor(m, key).id), objectId: m.targetId, verified, disposition, sourceRevision: m.custody.length });
}
function finishCase(s, m, ctx, note) {
  const faction = s.rpg.factions.find(f => f.id === m.definitionId);
  if (faction.rank !== 0 || m.rewardApplied) return false;
  const requiredIds = steps(s, m).map(row => row.id);
  if (!finishObjectiveOnce(m, { day: s.day, ending: outcome(s, m), requiredIds })) return false;
  m.rewardApplied = true; faction.rank = 1; faction.nextDay = s.day + 28;
  faction.choices.push({ id: m.method, day: s.day, outcome: m.ending, missionVersion: m.version });
  s.hero.gold += 20;
  const skill = { lantern_compact: 'devotion', salt_ledger: 'persuasion', unbound_archive: 'scholarship', rootward_circle: 'survival', ash_company: 'weapons', quiet_table: 'stealth' }[m.definitionId];
  s.hero.skills[skill] = Math.min(10000, s.hero.skills[skill] + 1);
  for (const actor of Object.values(m.cast).filter(p => p.source === 'rpg')) {
    const person = s.rpg.contacts.find(p => p.id === actor.id);
    if (person) { person.memories.push(m.ending); person.memories = person.memories.slice(-30); }
  }
  missionNote(s, ctx, m, note, definitions[m.definitionId].title, m.ending + ' The agreed 20 Gold and one rank were awarded once.');
  return true;
}
function outcome(s, m) {
  switch (m.definitionId) {
    case 'lantern_compact': return m.method === 'allocation' ? `${m.cast.steward.name} signed your anonymous allocation of two existing spare covers. Guest names stayed private.` : `${m.cast.steward.name} received the two replacement covers you made from 2 Cloth. Guest names stayed private.`;
    case 'salt_ledger': return `${m.cast.ownerB.name}’s custody of the reed-and-ring cargo was supported by ${m.method === 'marks' ? 'the packing mark and original manifest' : m.cast.sailor.name + '’s willing testimony and the three loading accounts'}. The cargo never became yours.`;
    case 'unbound_archive': return `Your ${m.method === 'comparison' ? 'dated tally and rate comparison' : m.cast.worker.name + '’s endorsed shift reconstruction'} established 18 Gold earned and 12 already paid: 6 remained unpaid. No private household information or invented payment entered the record.`;
    case 'rootward_circle': return m.method === 'access' ? `You actually walked the recorded gathering route and agreed an access strip with ${m.cast.tenant.name}. Their gathering right remained.` : `${m.cast.tenant.name} agreed to raised trays. You used 2 Wood and 1 Cloth to move the finite seed planting off their gathering path.`;
    case 'ash_company': return `The 42-Gold promise and 30-Gold chest left a documented 12-Gold shortfall, established through ${m.method === 'payroll' ? 'the signed payroll and witnessed count' : m.cast.veteran.name + '’s voluntary muster and the witnessed count'}. No theft verdict or veteran wage payment was invented.`;
    case 'quiet_table': return m.values.parcelState === 'returned' ? `${m.cast.recipient.name} refused the parcel. You returned that same parcel to its sender, seal intact; this was not delivery or consent.` : `${m.cast.recipient.name} willingly received the one sealed parcel ${m.method === 'relay' ? 'through their countersigned relay with ' + m.cast.intermediary.name : 'directly from you'}. The signed receipt records an intact seal, not a published private route.`;
    default: return 'The finite agreement was completed.';
  }
}
export function finishFactionObjectiveProject(s, p, ctx, { note }) {
  const m = runFor(s, p.id), row = m && nextStep(s, m);
  if (!m || !row || row.id !== p.choice) return;
  const reason = stepReason(s, m, row, { materials: false });
  if (reason) { missionNote(s, ctx, m, note, 'The objective remains unfinished', reason + ' Attended days and consumed materials remain spent; no new proof or reward.'); return; }
  if (row.decision) {
    m.decisionStep = row.id;
    if (s.event || s.battle || s.conversations?.pending) {
      missionNote(s, ctx, m, note, 'The comparison is ready after the interruption', 'The attended comparison work is saved. Resolve the waiting moment, then reopen this conclusion without repeating its days or fee.');
      return;
    }
    s.rpg.pending = { kind: 'faction', id: m.definitionId, chapter: 0, locationId: s.locationId, objectiveDecision: row.id };
    const choices = row.decision === 'cargo' ? [
      { id: 'conclude_correct', label: `Record ${m.cast.ownerB.name}’s reed-and-ring claim`, description: 'Match the specific mark or loading sequence to the original load.' },
      { id: 'conclude_wrong', label: `Give ${m.cast.ownerA.name} priority as the wealthiest claimant`, description: 'Wealth is not evidence of this cargo’s ownership.' },
    ] : row.decision === 'wage' ? [
      { id: 'conclude_correct', label: 'Record 18 Gold earned, 12 paid and 6 unpaid', description: 'Compare three shifts at six Gold each with the actual payment entry.' },
      { id: 'conclude_wrong', label: 'Record 30 Gold owed by adding earned and already paid', description: 'Count the existing payment as another debt.' },
    ] : [
      { id: 'conclude_correct', label: 'Record a 12-Gold shortfall, without a theft verdict', description: 'Subtract the 30-Gold chest from the 42-Gold promise. The cause remains unproved.' },
      { id: 'conclude_wrong', label: 'Declare the captain a thief from the shortfall alone', description: 'Treat an unexplained difference as proof of who took it.' },
    ];
    ctx.setEvent('rpg_faction', 'What does the evidence support?', definitions[m.definitionId].title, row.text + '\n\n' + m.evidence.map(e => `${e.id.replaceAll('_', ' ')}: ${e.verified ? 'verified' : 'unresolved'}`).join('\n'), choices.concat({ id: 'leave', label: 'Keep the evidence without concluding yet', description: 'No additional time or payment. The same comparison can be reopened.' }));
    return;
  }
  const disposition = row.id === 'recipient_reply' ? m.values.recipientWilling ? 'willing' : 'refused' : row.kind === 'consent' || row.kind === 'testimony' ? 'willing' : row.id === 'return_parcel' ? 'returned' : row.id.includes('delivery') || row.id === 'relay_receipt' ? 'intact' : 'observed';
  addStepEvidence(s, m, row, { disposition }); m.completedSteps.push(row.id);
  if (row.id === 'direct_delivery' || row.id === 'relay_receipt') m.values.parcelState = 'delivered';
  if (row.id === 'relay_handoff') m.values.parcelState = 'with_intermediary';
  if (row.id === 'return_parcel') m.values.parcelState = 'returned';
  if (row.id === 'recipient_reply') missionNote(s, ctx, m, note, 'The recipient’s own answer', m.values.recipientWilling ? `${m.cast.recipient.name} explicitly agrees to receive this sealed parcel${m.method === 'relay' ? ' through the named willing courier, and signs the countersign' : ''}.` : `${m.cast.recipient.name} declines. Return the same parcel to its sender; do not claim delivery or consent.`);
  else missionNote(s, ctx, m, note, definitions[m.definitionId].title, row.text + ' The completed step is saved once.');
  if (row.finish) finishCase(s, m, ctx, note);
}
export function applyFirstMissionConclusion(s, id, ctx, { note }) {
  const pending = s.rpg.pending, m = pending && runFor(s, pending.id), row = m && nextStep(s, m);
  if (!pending?.objectiveDecision || !row || row.id !== pending.objectiveDecision) return false;
  s.rpg.pending = null;
  if (id === 'leave') return true;
  if (!['conclude_correct', 'conclude_wrong'].includes(id) || stepReason(s, m, row, { materials: false })) return false;
  if (id === 'conclude_wrong') {
    missionNote(s, ctx, m, note, 'An unsupported conclusion, not a verdict', 'The custodian points out that your conclusion is not supported by these entries or willing accounts. The case remains unresolved. Recheck it before claiming proof or a reward.');
    return true;
  }
  addStepEvidence(s, m, row, { disposition: row.kind === 'testimony' ? 'willing' : 'observed' }); m.completedSteps.push(row.id);
  m.decisionStep = null;
  missionNote(s, ctx, m, note, definitions[m.definitionId].title, row.text + ' You record only the conclusion supported by that evidence.'); return true;
}
/** Called only after a real engine action changes settlement location on arrival. */
export function recordFirstMissionArrival(s, previousLocationId) {
  if (s.locationId === previousLocationId || s.timeline?.journey || s.cartography?.pending || s.cartography?.offsite || s.phase === 'retired') return;
  for (const faction of s.rpg?.factions || []) {
    const m = faction.firstMission;
    if (m?.status !== 'active' || m.method !== 'access' || m.fieldLocationId !== s.locationId || s.day < m.acceptedDay) continue;
    recordEvidenceOnce(m, { id: 'route_arrival', kind: 'arrival', day: s.day, locationId: s.locationId, actorIds: [], objectId: m.targetId, verified: true, disposition: 'observed', sourceRevision: m.custody.length });
  }
}
export function firstMissionConclusionReason(s, id) {
  const p = s.rpg?.pending, m = p && runFor(s, p.id), row = m && nextStep(s, m);
  if (!p?.objectiveDecision) return null;
  if (!['conclude_correct', 'conclude_wrong', 'leave'].includes(id) || !row || p.objectiveDecision !== row.id || m.decisionStep !== row.id) return 'That conclusion is not part of this saved comparison.';
  return id === 'leave' ? null : stepReason(s, m, row, { materials: false });
}
export function firstMissionJournalRow(s, faction) {
  const m = faction.firstMission;
  if (!m || m.status !== 'active') return null;
  const row = nextStep(s, m), custody = custodyOffer(s, m, row), actor = custody?.replacement ? captureMissionActor(custody.replacement.person, { source: 'service', sourceId: custody.replacement.id, roomId: custody.replacement.roomId }) : effectiveActor(m, row.actor);
  const progress = s.rpg.project?.kind === 'faction-objective' && s.rpg.project.id === faction.id ? s.rpg.project : null;
  return { key: 'faction:' + faction.id, kind: 'faction-objective', commitment: true, title: definitions[faction.id].title, personName: actor.name, personId: actor.id, roomId: row.field ? null : actor.roomId === 'work' ? workRoom(s, m.locationId) : actor.roomId, locationId: locationFor(m, row), status: 'active', objective: row.label + '.', details: [definitions[faction.id].methods[m.method][1], `${m.completedSteps.length} completed steps · ${m.evidence.length} saved evidence entries.`, row.text, ...(progress ? [`${progress.completedDays}/${progress.totalDays} attended days kept; ${progress.remainingDays} remain. Consumed supplies are not charged again.`] : []), '20 Gold on the completed finite agreement; travel and household accrual are separate.'], actionId: progress ? 'rpg_continue' : actionId(faction.id, custody ? 'custody' : row.id), actionLabel: progress ? 'Continue the saved objective' : custody ? 'Meet the new public custodian' : row.label, cancelId: progress ? 'rpg_cancel' : actionId(faction.id, 'withdraw') };
}
export function firstMissionContactRoom(s, person) {
  return person.firstMissionWorkplace === 'smith' ? workRoom(s, person.locationId) : person.roomId;
}
export function firstMissionArchiveRows(s) {
  return (s.rpg?.factions || []).filter(f => f.firstMission && f.firstMission.status !== 'active').map(f => ({
    key: 'faction-first:' + f.id, title: definitions[f.id].title, result: f.firstMission.ending,
    status: f.firstMission.status === 'completed' ? 'completed' : 'abandoned',
  }));
}

export function validateFactionFirstMission(m, faction, s) {
  if (m === undefined) return true;
  const all = Object.values(FIRST_MISSION_METHODS[faction.id] || {}).flatMap(method => {
    const fake = { ...m, method, evidence: m?.evidence || [], values: m?.values || definitions[faction.id]?.values, cast: m?.cast || {} };
    try { return steps(s, fake); } catch { return []; }
  });
  const ids = [...new Set(all.map(row => row.id))];
  if (!validateFirstMission(m, faction, s, { evidenceIds: [...ids, 'route_arrival'], stepIds: ids })) return false;
  if (!m) return true;
  const def = definitions[faction.id];
  if (!def || !Object.keys(def.roles).every(key => m.cast[key]?.source === 'rpg') || !['faction', ...def.services].every(key => m.cast[key]?.source === 'service')) return false;
  if (Object.keys(m.cast).length !== Object.keys(def.roles).length + def.services.length + 1) return false;
  if (new Set(Object.values(m.cast).map(p => p.id)).size !== Object.keys(m.cast).length) return false;
  for (const [key, [role]] of Object.entries(def.roles)) {
    const p = m.cast[key], actual = [...s.rpg.contacts, ...s.rpg.contactArchive].find(actor => actor.id === p.id);
    if (p.sourceId !== p.id || p.role !== role || !actual || actual.name !== p.name || actual.role !== role
      || m.acceptedDay - actual.bornDay < 18 * 365
      || p.serviceKind !== null || p.subjectId !== null || p.locationId !== (key === 'tenant' && m.method === 'access' ? m.fieldLocationId : m.locationId)) return false;
  }
  const serviceKeys = ['faction', ...def.services];
  const validCustodian = (p, key) => p.source === 'service' && p.serviceKind === key && p.locationId === m.locationId
    && p.sourceId === (key === 'faction' ? `faction-${faction.id}-${m.locationId}` : `${key}-${m.locationId}`)
    && p.subjectId === (key === 'faction' ? faction.id : null);
  if (!serviceKeys.every(key => validCustodian(m.cast[key], key))) return false;
  const heads = Object.fromEntries(serviceKeys.map(key => [key, m.cast[key].id]));
  let previousCustodyDay = m.acceptedDay;
  for (const change of m.custody) {
    if (!serviceKeys.includes(change.key) || !validCustodian(change.to, change.key) || change.fromId !== heads[change.key]
      || change.to.id === change.fromId || change.day < previousCustodyDay) return false;
    heads[change.key] = change.to.id;
    previousCustodyDay = change.day;
  }
  if (Object.keys(m.values).some(key => !Object.hasOwn(def.values, key))) return false;
  for (const [key, value] of Object.entries(def.values)) if (key !== 'recipientWilling' && key !== 'parcelState' && m.values[key] !== value) return false;
  if (faction.id === 'quiet_table' && (!['held', 'with_intermediary', 'delivered', 'returned'].includes(m.values.parcelState) || typeof m.values.recipientWilling !== 'boolean')) return false;
  if (m.method === 'access' ? !m.fieldLocationId || s.realm.sites[m.fieldLocationId]?.regionId !== 'blackgrove' || !['forest', 'grove'].includes(site(s, m.fieldLocationId)?.type) : m.fieldLocationId !== null) return false;
  const actualSteps = steps(s, m);
  if (m.completedSteps.some((id, index) => actualSteps[index]?.id !== id)) return false;
  if (m.decisionStep !== null && (nextStep(s, m)?.id !== m.decisionStep || !nextStep(s, m)?.decision)) return false;
  if (!m.completedSteps.every(id => evidenceFor(m, id)?.verified)) return false;
  let previousEvidenceDay = m.acceptedDay, previousRevision = 0;
  for (const e of m.evidence) {
    if (!Number.isSafeInteger(e.sourceRevision) || e.sourceRevision < previousRevision || e.sourceRevision > m.custody.length
      || e.day < previousEvidenceDay || e.sourceRevision > 0 && m.custody[e.sourceRevision - 1].day > e.day
      || e.sourceRevision < m.custody.length && m.custody[e.sourceRevision].day < e.day) return false;
    previousEvidenceDay = e.day; previousRevision = e.sourceRevision;
  }
  let previousStepDay = m.acceptedDay;
  for (const row of actualSteps.filter(row => m.completedSteps.includes(row.id))) {
    const e = evidenceFor(m, row.id);
    if (e.kind !== row.kind || e.locationId !== locationFor(m, row) || e.objectId !== m.targetId || e.actorIds.length !== participants(row).length) return false;
    // Source revisions preserve legitimate same-day handoffs and old authors,
    // without allowing any historical holder to sign a later custodian's proof.
    const atAcquisition = key => m.custody.slice(0, e.sourceRevision).filter(change => change.key === key).at(-1)?.to || m.cast[key];
    if (!participants(row).every(key => e.actorIds.includes(atAcquisition(key).id))) return false;
    const minimumDays = row.id === 'field_account' ? 1 : row.days;
    if (e.day < previousStepDay + minimumDays) return false;
    if (row.field) { const arrival = evidenceFor(m, 'route_arrival'); if (!arrival?.verified || e.day < arrival.day + minimumDays) return false; }
    previousStepDay = e.day;
    const disposition = row.id === 'recipient_reply' ? m.values.recipientWilling ? 'willing' : 'refused' : row.kind === 'consent' || row.kind === 'testimony' ? 'willing' : row.id === 'return_parcel' ? 'returned' : row.id.includes('delivery') || row.id === 'relay_receipt' ? 'intact' : 'observed';
    if (e.disposition !== disposition) return false;
  }
  if (m.evidence.some(e => e.id !== 'route_arrival' && !m.completedSteps.includes(e.id))) return false;
  if (m.evidence.some(e => e.id === 'route_arrival' && (m.definitionId !== 'rootward_circle' || m.method !== 'access' || e.locationId !== m.fieldLocationId || e.kind !== 'arrival' || e.actorIds.length || !e.verified || e.objectId !== m.targetId || e.disposition !== 'observed'))) return false;
  if (m.status === 'completed' && (m.completedSteps.length !== actualSteps.length || !actualSteps.at(-1)?.finish || m.completedDay !== previousStepDay)) return false;
  if (m.status === 'completed' && (faction.choices[0]?.id !== m.method || faction.choices[0]?.day !== m.completedDay || faction.choices[0]?.outcome !== m.ending)) return false;
  if (m.definitionId === 'quiet_table') {
    const state = m.completedSteps.includes('return_parcel') || m.status === 'withdrawn' && m.values.parcelState === 'returned' ? 'returned' : m.completedSteps.includes('direct_delivery') || m.completedSteps.includes('relay_receipt') ? 'delivered' : m.completedSteps.includes('relay_handoff') ? 'with_intermediary' : 'held';
    if (m.values.parcelState !== state) return false;
  }
  return true;
}

export function validateFactionObjectiveProject(s, p) {
  const m = runFor(s, p.id), row = m && nextStep(s, m);
  return !!m && m.status === 'active' && !!row && row.id === p.choice && Object.keys(p.details).every(key => ['missionVersion', 'acceptedDay', 'stepId', 'locationId', 'needsPresence', 'outdoors', 'materials', 'materialsSpent'].includes(key)) && p.details.missionVersion === m.version && p.details.acceptedDay === m.acceptedDay
    && p.details.stepId === row.id && p.locationId === p.details.locationId && p.details.locationId === locationFor(m, row) && p.details.needsPresence === true
    && p.details.outdoors === !!row.field
    && p.cost === 0 && p.paid === p.details.materialsSpent && typeof p.details.materialsSpent === 'boolean'
    && JSON.stringify(p.details.materials) === JSON.stringify(row.materials || {})
    && p.totalDays >= 1 && p.totalDays <= (row.id === 'field_account' ? 2 : row.days)
    && (!row.field || hasEvidence(m, ['route_arrival']) && evidenceFor(m, 'route_arrival').day <= p.startedDay);
}
/** Authored prose is retained only for its validated owner/pending scene. */
export function firstMissionSceneProvenance(s, event) {
  if (event?.id !== 'rpg_faction') return false;
  const p = s?.rpg?.pending, f = s?.rpg?.factions?.find(row => row.id === p?.id), m = f?.firstMission;
  if (p?.kind !== 'faction' || !Object.hasOwn(definitions, p.id) || !f || p.locationId !== s.locationId || !Array.isArray(event.choices)) return false;
  const exactChoices = ids => event.choices.length === ids.length && new Set(event.choices.map(c => c.id)).size === ids.length && event.choices.every(c => ids.includes(c.id));
  if (p.firstOffer === true) return p.objectiveDecision === undefined && p.chapter === 0 && f.rank === 0 && m === undefined
    && exactChoices([...FIRST_MISSION_METHODS[p.id].map(method => 'accept_' + method), 'leave']);
  if (!m || !validateFactionFirstMission(m, f, s)) return false;
  if (p.objectiveDecision !== undefined) return m.status === 'active' && f.rank === 0 && p.chapter === 0 && m.decisionStep === p.objectiveDecision
    && exactChoices(['conclude_correct', 'conclude_wrong', 'leave']);
  return m.status === 'completed' && f.rank > 0 && f.rank < 3 && p.chapter === f.rank && exactChoices(['care', 'trade', 'scheme', 'leave']);
}
export const firstMissionChoiceIds = ['accept_allocation', 'accept_mending', 'accept_marks', 'accept_testimony', 'accept_comparison', 'accept_reconstruction', 'accept_access', 'accept_planters', 'accept_payroll', 'accept_muster', 'accept_direct', 'accept_relay', 'conclude_correct', 'conclude_wrong'];
