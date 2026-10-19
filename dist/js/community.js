import { seededRoll, generatePersonName, isSettlement } from './world.js';

const YEAR = 365;
const MATERIALS = ['wood', 'stone', 'ore', 'cloth', 'hide', 'crystal'];
const clone = value => structuredClone(value);
const place = (s, id = s.locationId) => s.world?.locations?.find(p => p.id === id);
const usable = (s, id) => isSettlement(s.world, id);
const choices = rows => rows.map(([id, label, description]) => ({ id, label, description }));
const materialText = materials => Object.entries(materials).map(([id, count]) => `${count} ${id}`).join(', ') || 'no materials';
const stage = (title, days, cost, materials = {}) => ({ title, days, cost, materials });

export const COMMUNITY_CATALOG = [
  { id:'archive',name:'Regional scholarship archive',noun:'Archive',annualCost:720,
    purpose:'A major endowment for public records, advanced lessons, and named students. Authorship and access remain in a living charter.',
    stages:[stage('Build dry record rooms and public reading tables',22,1800,{stone:12,wood:10,cloth:6}),stage('Commission copied sources and teaching tools',20,2600,{wood:8,cloth:8,ore:4,crystal:2}),stage('Endow the scholars and record keepers',10,7200)],
    scopes:[['open','Keep scholarship open to local households','While funded here, school fees are up to 10 gold lower and practical apprenticeship remains available. Original sources keep the contributors’ names.'],['practice','Create an advanced apprentice archive','While funded here, practical apprenticeship is available with 3 additional preparation points. Lessons and examinations must still be attended.']] },
  { id:'watershed',name:'Watershed stewardship and trade crossing',noun:'Stewardship',annualCost:500,
    purpose:'Repair the streams, common gathering grounds and trade crossing as one lasting undertaking, with named keepers and a protected maintenance fund.',
    stages:[stage('Survey the watercourse with local keepers',20,1200,{stone:10,wood:8}),stage('Rebuild drains, terraces and the trade crossing',28,2900,{stone:16,wood:12,ore:6,cloth:4}),stage('Endow inspections and common-ground tending',10,5000)],
    scopes:[['open','Let households govern the maintained grounds','While funded here, gathering replenishment is 3 days faster, with a 2-day minimum; new road quotations have 6 points less risk.'],['practice','Prioritize the trade crossing and careful tending','While funded here, new road quotations have 10 points less risk; gathering replenishment is 1 day faster, with a 2-day minimum. Existing journeys keep their quotes.']] },
  { id: 'learning', name: 'Learning hall', noun: 'Hall', annualCost: 240,
    purpose: 'A lasting school fund or an apprentice hall, governed by the people who use it.',
    stages: [stage('Set dry foundations and reading rooms', 16, 480, { wood: 8, stone: 6 }), stage('Fit desks, tools and accessible entrances', 14, 720, { wood: 6, cloth: 4, ore: 2 }), stage('Establish the teaching endowment', 7, 2400)],
    scopes: [['open', 'Open a public scholarship fund', 'Funded local schooling costs up to 8 gold less; the hall remains open to households outside your family.'], ['practice', 'Build an apprentice commons', 'A funded practical route provides apprenticeship access and 2 additional preparation points; it does not award a qualification.']] },
  { id: 'clinic', name: 'Community clinic', noun: 'House of Care', annualCost: 320,
    purpose: 'A staffed place for care, clean supplies, consent and continuing support.',
    stages: [stage('Raise the clean care rooms', 18, 600, { wood: 8, stone: 8, cloth: 4 }), stage('Fit wash stations and quiet consulting rooms', 14, 1000, { wood: 4, stone: 4, cloth: 6, ore: 2 }), stage('Endow supplies and caregiver wages', 8, 3200)],
    scopes: [['open', 'Guarantee affordable, private treatment', 'At this funded clinic, a chosen care plan costs up to 6 gold less and supports physical recovery for 14 additional days.'], ['practice', 'Make continuing care the priority', 'The same affordable physical care remains, with a named caregiver and followups about practical support rather than compulsory public disclosure.']] },
  { id: 'road', name: 'Wayhouse and road cooperative', noun: 'Wayhouse', annualCost: 180,
    purpose: 'A watched crossing, honest route boards and a safe place to wait out bad weather.',
    stages: [stage('Survey drainage and safe stopping places', 14, 500, { stone: 6, wood: 4 }), stage('Build the marked crossing and travelers’ shelter', 20, 1600, { stone: 10, wood: 8, ore: 4, cloth: 2 }), stage('Endow route checks and shelter upkeep', 7, 1800)],
    scopes: [['open', 'Keep a shared, clearly marked road', 'A funded departure or destination lowers the newly quoted travel risk by 8 points. Existing journey quotations remain unchanged.'], ['practice', 'Make a refuge for cautious travelers', 'The same maintained route lowers new travel quotations by 8 points; local accounts emphasize shelter and safe waiting.']] },
  { id: 'garden', name: 'Commons garden and winter stores', noun: 'Commons', annualCost: 180,
    purpose: 'Choose between protected gathering grounds and food stored for difficult household years.',
    stages: [stage('Repair the soil, drains and common beds', 14, 400, { wood: 6, stone: 4 }), stage('Raise weatherproof stores and planting frames', 16, 800, { wood: 8, stone: 6, cloth: 4 }), stage('Endow seed, tending and winter storage', 7, 1800)],
    scopes: [['open', 'Protect the shared gathering grounds', 'Funded local gathering stocks recover sooner: their replenishment interval is reduced by 2 days, with a 2-day minimum. No stocks or materials are granted by opening a screen.'], ['practice', 'Guarantee basic winter food', 'The funded commons offsets up to 30 gold of the local household’s annual basic living costs. It does not pay cash or provide generous living for free.']] },
  { id: 'refuge', name: 'Memorial refuge', noun: 'Refuge', annualCost: 300,
    purpose: 'A new, living service for displaced households that preserves the names of a lost place.',
    stages: [stage('Agree a new site and preserve the old names', 18, 900, { stone: 8, wood: 8 }), stage('Build rooms, a meeting hall and a memorial', 24, 1600, { stone: 10, wood: 10, cloth: 6, ore: 2 }), stage('Endow the refuge’s household and care fund', 8, 3000)],
    scopes: [['open', 'Keep the names beside an open refuge', 'A funded refuge provides household safety and up to 15 gold of annual basic food support. The destroyed place and the people who died remain part of history.'], ['practice', 'Let surviving households govern the refuge', 'The same actual refuge and food support remain; survivors’ decisions, rather than your surname, guide its remembered charter.']] },
];
const catalog = id => COMMUNITY_CATALOG.find(row => row.id === id);
const ready = s => !!s.community && s.phase !== 'retired' && s.age >= 18 && !s.event && !s.battle && !s.conversations?.pending && !s.dungeon && !s.timeline?.journey && !s.workshop?.project && !s.careers?.batch && !s.life?.plan;

export function communityOperation(s,w){
  const site=place(s,w.locationId),siteOpen=usable(s,w.locationId);
  const status=w.status!=='standing'?'unfinished':!siteOpen?'closed':!w.enabled?'suspended':s.day>=w.fundedUntil?'unfunded':'operating';
  const label={unfinished:'Not yet operating',closed:'Site closed',suspended:'Suspended by charter',unfunded:'Unfunded — service paused',operating:'Funded and serving'}[status];
  const settlement=siteOpen?`${site?.name||w.locationId} remains an open settlement.`:`${site?.name||w.locationId} is closed to ordinary settlement services.`;
  const reason={unfinished:'The undertaking has not completed its actual construction milestones.',closed:'The building cannot serve people at a closed or lost site; the charter and protected funds remain recorded.',suspended:'Stewards have paused this institution independently of the town. Its building and unused reserve remain.',unfunded:'Its funded operating period has ended. The building remains, but this institution is not providing its funded services.',operating:`This institution is operating through day ${w.fundedUntil}.`}[status];
  return {status,label,operating:status==='operating',siteOpen,description:`${settlement} ${reason}`};
}

export function initializeCommunity(s) {
  if (s.community) return;
  s.community = { version: 1, introducedDay: s.day, lastDay: s.day, project: null, works: [], pending: null, queue: [], history: [], ambitionSteps: [] };
}

function note(s, ctx, title, text, extra = {}) {
  const record = { id: `community-${s.day}-${s.community.history.length}`, day: s.day, title, text, ...extra };
  s.community.history.push(record); s.community.history = s.community.history.slice(-160);
  ctx.journal?.(title, text, 'community'); s.notice = text;
}

function recipients(s, locationId) {
  const rows = [];
  for (const p of s.society?.people || []) if (p.alive !== false && p.locationId === locationId) rows.push({ id: p.id, name: p.name, source: 'society', role: p.role || p.profession || 'neighbor' });
  for (const p of s.lineage?.people || []) if (p.alive !== false && p.source === 'child' && (s.life?.home?.locationId || s.locationId) === locationId) rows.push({ id: p.id, name: p.name, source: 'lineage', role: 'your child' });
  for (const p of s.life?.people || []) if (p.alive !== false && p.locationId === locationId && !rows.some(row => row.name === p.name)) {
    const identity = s.lineage?.people?.find(person => person.source === 'life' && person.localId === p.id);
    rows.push({ id: identity?.id || p.id, name: p.name, source: identity ? 'lineage' : 'life', role: p.occupation || p.role || 'neighbor', ownerId: s.dynasty?.activePersonId || 'hero' });
  }
  if (!rows.length) { const cohort = Math.floor(s.day / (40 * YEAR)); rows.push({ id: `charter-keeper-${locationId}-${cohort}`, name: generatePersonName(s.seed, `community-keeper-${locationId}-${cohort}`), source: 'charter', role: 'local charter keeper', bornDay: s.day - 35 * YEAR, deathDay: s.day + 40 * YEAR }); }
  return rows.slice(0, 4).map(p => ({ ...p, joinedDay: s.day, milestones: [] }));
}

function livingRecipient(s, recipient) {
  const table = recipient.source === 'society' ? [...(s.society?.people || []), ...(s.society?.archive || [])] : recipient.source === 'lineage' ? s.lineage?.people : recipient.source === 'life' && recipient.ownerId === (s.dynasty?.activePersonId || 'hero') ? s.life?.people : null;
  return recipient.source === 'charter' ? s.day < recipient.deathDay ? recipient : null : table?.find(p => p.id === recipient.id && p.name === recipient.name && p.alive !== false) || null;
}

function descriptor(id, label, description, days = 0, cost = 0, reason = null, materials = {}) {
  return { id, label, description, days, cost, group: 'Community & legacy', materials: clone(materials), ...(reason ? { disabledReason: reason } : {}) };
}
function missing(s, materials, cost) {
  if (Object.entries(materials).some(([id, n]) => (s.equipment?.materials?.[id] || 0) < n)) return `Requires ${materialText(materials)}; gather the actual materials first.`;
  if (s.hero.gold < cost) return `Requires ${cost} gold; you have ${s.hero.gold}.`;
  return null;
}

export function communityActions(s) {
  if (!ready(s)) return [];
  const p = s.community.project;
  if (p) {
    const c = p.commitment, next = p.stages[p.step];
    if (c) return [descriptor('community_continue', `Continue ${c.title.toLowerCase()}`, `${c.remainingDays} actual days remain. The recorded ${c.cost} gold and ${materialText(c.materials)} are already committed and will not be charged again.`, c.remainingDays, 0, s.locationId !== p.locationId ? 'Return to the project’s recorded site.' : !usable(s, p.locationId) ? 'The site has ceased operating; archive this incomplete project.' : null), descriptor('community_abandon', 'Archive this unfinished undertaking', 'Retain the named history and all paid portions; no uncompleted service, refund or material duplication is awarded.')];
    return [descriptor('community_stage', next.title, `Milestone ${p.step + 1}/3 of ${p.name}: ${next.days} actual days, ${next.cost} gold and ${materialText(next.materials)}. Commitments keep their quotation across interruptions.`, next.days, next.cost, s.locationId !== p.locationId ? `Return to ${place(s, p.locationId)?.name || p.locationId}.` : !usable(s, p.locationId) ? 'The planned site no longer operates; archive this undertaking.' : missing(s, next.materials, next.cost), next.materials), descriptor('community_abandon', 'Leave this ambition unfinished', 'Keep the recorded work already paid for. Its endowment and services are not created by an unfinished plan.')];
  }
  if (!usable(s, s.locationId)) return [];
  const actions = COMMUNITY_CATALOG.filter(row => !s.community.works.some(w => w.kind === row.id && w.locationId === s.locationId && w.status !== 'unfinished')).map(row => descriptor(`community_begin_${row.id}`, `Plan a ${row.name.toLowerCase()}`, `${row.purpose} Three separately committed milestones require ${row.stages.reduce((sum, part) => sum + part.days, 0)} actual days, ${row.stages.reduce((sum, part) => sum + part.cost, 0)} gold and materials. The final endowment funds about ten operating years; ongoing funding is a choice. Opening the charter spends nothing.`, 0, 0, s.community.works.length >= 24 ? 'This dynasty already has 24 recorded undertakings.' : null));
  for (const w of s.community.works.filter(w => w.locationId === s.locationId && w.status !== 'unfinished')) {
    actions.push(descriptor(`community_review_${w.id}`, `Review ${w.name}`, `${communityOperation(s,w).description} Discuss its beneficiaries, governance and actual operating reserve: ${w.operatingBalance} gold. Review spends nothing.`));
    actions.push(descriptor(`community_fund_${w.id}`, `Fund the next years of ${w.name}`, `Contribute 1500 gold on a visit of up to 4 actual days arranging supplies and accountable wages. Each operating year uses ${w.annualCost} gold from the protected reserve. The visit can stop at a birthday after the contribution is arranged; zero elapsed days never takes a contribution. This money belongs to the institution; it is never paid back to the hero or duplicated on succession.`, 4, 1500, w.operatingBalance >= 6000 ? 'The protected reserve already holds at least 6000 gold.' : missing(s, {}, 1500)));
  }
  return actions;
}

function charter(s, p, ctx) {
  s.community.pending = { eventId: 'community_charter', projectId: p.id };
  flushCommunityEvent(s, ctx);
}
function begin(s, kind, ctx) {
  const row = catalog(kind), number = s.community.history.filter(entry => entry.result === 'planned').length;
  const lost = s.world.locations.filter(site => ['destroyed', 'evacuated'].includes(site.status));
  const origin = kind === 'refuge' && lost.length ? lost[seededRoll(s.seed, `community-refuge-origin-${number}`, lost.length)] : null;
  const keeper = recipients(s, s.locationId);
  const id = `work-${s.locationId}-${kind}-${s.day}-${s.community.works.length}`;
  s.community.project = { id, kind, name: `${place(s)?.name || 'Hearth'} ${row.noun}`, locationId: s.locationId, originId: origin?.id || null, originName: origin?.name || null, founderId: s.dynasty?.activePersonId || 'hero', founderName: s.hero.name, generation: s.dynasty?.generation || 1, startedDay: s.day, stages: clone(row.stages), annualCost: row.annualCost, scope: null, step: 0, paidGold: 0, paidMaterials: {}, workedDays: 0, milestones: [], beneficiaries: keeper, commitment: null };
  note(s, ctx, 'An ambition with actual neighbors', `${s.hero.name} proposed ${s.community.project.name}. ${keeper.map(p => p.name).join(', ')} will be recorded in its charter${origin ? `; its refuge remembers the lost ${origin.name}, without claiming to restore it` : ''}. No fee, building or advantage has yet been created.`, { workId: id, result: 'planned' });
  charter(s, s.community.project, ctx);
}

function allocateFunding(w, day) {
  if (!w.enabled) return;
  while (w.fundedUntil <= day && w.operatingBalance >= w.annualCost) {
    w.operatingBalance -= w.annualCost; w.operatingSpent += w.annualCost;
    const fromDay = Math.max(w.fundedUntil, day);
    w.fundedUntil = fromDay + YEAR;
    w.fundingPeriods.push({ fromDay, toDay: w.fundedUntil, gold: w.annualCost });
  }
}

function complete(s, p, ctx) {
  const reserve = p.stages.at(-1).cost;
  const w = { id: p.id, kind: p.kind, name: p.name, locationId: p.locationId, originId: p.originId, originName: p.originName, founderId: p.founderId, founderName: p.founderName, generation: p.generation, completedDay: s.day, scope: p.scope, status: 'standing', enabled: true, constructionGold: p.paidGold - reserve, paidMaterials: clone(p.paidMaterials), workedDays: p.workedDays, milestones: clone(p.milestones), annualCost: p.annualCost, contributedGold: reserve, operatingBalance: reserve, operatingSpent: 0, fundedUntil: s.day, fundingPeriods: [], servicePauses: [], lastReviewDay: s.day, lastFollowupDay: s.day, beneficiaries: clone(p.beneficiaries), recipientIndex: 0, handover: null };
  allocateFunding(w, s.day); s.community.works.push(w); s.community.project = null;
  ctx.standing?.('villagers', 4);
  note(s, ctx, 'Work becomes a living institution', `${w.name} opened under its ${w.scope === 'open' ? 'public' : 'practical'} charter. ${w.constructionGold} gold built it; ${reserve} gold is protected for actual operation, charged at ${w.annualCost} per year. ${w.originName ? `${w.originName} remains lost; this is a new refuge at ${place(s, w.locationId)?.name}. ` : ''}Its first operating year is funded through day ${w.fundedUntil}.`, { workId: w.id, result: 'opened' });
  updateAmbition(s, ctx);
}

function updateAmbition(s, ctx) {
  const standing = s.community.works.filter(w => w.status === 'standing'), kinds = new Set(standing.map(w => w.kind)), sites = new Set(standing.map(w => w.locationId));
  const steps = [[1, 'You created a lasting institution.', standing.length >= 1], [2, 'Different needs now have different institutions.', kinds.size >= 2], [3, 'A network reaches more than one settlement.', kinds.size >= 3 && sites.size >= 2], [4, 'The next generation maintains a real inherited institution.', standing.some(w => w.generation < (s.dynasty?.generation || 1) && w.handover?.personId === s.dynasty?.activePersonId)]];
  for (const [id, text, reached] of steps) if (reached && !s.community.ambitionSteps.some(step => step.id === id)) { s.community.ambitionSteps.push({ id, day: s.day, personId: s.dynasty?.activePersonId || 'hero', name: s.hero.name, text }); note(s, ctx, 'A civilian ambition takes another shape', text + ' Its value is in the recorded services and people; this recognition grants no repeated cash or stat bonus.', { result: 'ambition', ambitionId: id }); }
}

export function applyCommunityAction(s, id, ctx = {}) {
  const action = communityActions(s).find(a => a.id === id && !a.disabledReason);
  if (!action) return false;
  if (id.startsWith('community_begin_')) { begin(s, id.slice(16), ctx); return true; }
  if (id === 'community_abandon') {
    const p = s.community.project;
    if (p.paidGold || p.workedDays) s.community.works.push({ id: p.id, kind: p.kind, name: p.name, locationId: p.locationId, originId: p.originId, originName: p.originName, founderId: p.founderId, founderName: p.founderName, generation: p.generation, completedDay: s.day, scope: p.scope, status: 'unfinished', enabled: false, constructionGold: p.paidGold, paidMaterials: clone(p.paidMaterials), workedDays: p.workedDays, milestones: clone(p.milestones), annualCost: p.annualCost, contributedGold: 0, operatingBalance: 0, operatingSpent: 0, fundedUntil: s.day, fundingPeriods: [], servicePauses: [], lastReviewDay: s.day, lastFollowupDay: s.day, beneficiaries: clone(p.beneficiaries), recipientIndex: 0, handover: null });
    s.community.project = null; note(s, ctx, 'An unfinished ambition is still part of a life', `${p.name} remains an unfinished undertaking: ${p.paidGold} gold and ${p.workedDays} days were actually committed. No completion benefits or refunds are invented.`, { workId: p.id, result: 'abandoned' }); return true;
  }
  if (id.startsWith('community_review_')) { s.community.pending = { eventId: 'community_review', workId: id.slice(17) }; flushCommunityEvent(s, ctx); return true; }
  if (id.startsWith('community_fund_')) {
    const w = s.community.works.find(work => work.id === id.slice(15));
    const actual = ctx.spendDays?.(4) || 0;
    if (actual <= 0 || s.phase === 'retired') { s.notice = 'The funding visit waits for the current interruption. No contribution was taken.'; return true; }
    s.hero.gold -= 1500; w.contributedGold += 1500; w.operatingBalance += 1500;
    allocateFunding(w, s.day);
    if (w.generation < (s.dynasty?.generation || 1)) w.handover = { personId: s.dynasty.activePersonId, name: s.hero.name, day: s.day };
    note(s, ctx, 'Money has a named purpose', `${s.hero.name} contributed 1500 gold to ${w.name} after ${actual} actual days. Its protected reserve is ${w.operatingBalance} gold; ${w.enabled ? `service is funded through day ${w.fundedUntil}` : 'its charter is paused until a review reopens it'}. This contribution is not a household payout.`, { workId: w.id, result: 'funded', gold: 1500, days: actual }); updateAmbition(s, ctx); return true;
  }
  if (id === 'community_stage' || id === 'community_continue') {
    const p = s.community.project, part = p.stages[p.step];
    const c = p.commitment || { title: part.title, totalDays: part.days, remainingDays: part.days, cost: part.cost, materials: clone(part.materials), paid: false, startedDay: s.day };
    const actual = ctx.spendDays?.(c.remainingDays) || 0;
    if (actual <= 0 || s.phase === 'retired') { s.notice = 'The milestone waits at the interruption. No new cost or finished service was awarded.'; return true; }
    if (!c.paid) { s.hero.gold -= c.cost; for (const [material, n] of Object.entries(c.materials)) { s.equipment.materials[material] -= n; p.paidMaterials[material] = (p.paidMaterials[material] || 0) + n; } p.paidGold += c.cost; c.paid = true; }
    c.remainingDays -= actual; p.workedDays += actual; p.commitment = c;
    if (c.remainingDays > 0) { s.notice = `${p.name}: ${c.remainingDays} actual days remain in the paid milestone. The quotation and remaining work are saved.`; return true; }
    p.milestones.push({ title: c.title, finishedDay: s.day, days: c.totalDays, gold: c.cost, materials: clone(c.materials) }); p.commitment = null; p.step++;
    note(s, ctx, 'One piece of an ambition is complete', `${p.name}: ${c.title.toLowerCase()} took ${c.totalDays} actual days, ${c.cost} gold and ${materialText(c.materials)}. ${p.step < 3 ? 'The next milestone remains a choice; the operating service is not yet open.' : 'The final endowment is now recorded.'}`, { workId: p.id, result: 'milestone', step: p.step });
    if (p.step === 3) complete(s, p, ctx);
    return true;
  }
  return false;
}

export function communitySupport(s, locationId = s.locationId) {
  const result = { schoolFeeDiscount: 0, apprenticeshipAvailable: false, schoolPreparationBonus: 0, careFeeDiscount: 0, careDays: 0, roadRiskReduction: 0, resourceRecoveryBonus: 0, foodSupport: 0, refuge: false, works: [] };
  if (!usable(s, locationId)) return result;
  for (const w of s.community?.works || []) {
    if (w.status !== 'standing' || !w.enabled || w.locationId !== locationId || s.day < w.completedDay || s.day >= w.fundedUntil) continue;
    result.works.push({ id: w.id, name: w.name, kind: w.kind, scope: w.scope, fundedUntil: w.fundedUntil });
    if (w.kind === 'learning') { result.apprenticeshipAvailable = true; if (w.scope === 'open') result.schoolFeeDiscount = Math.max(result.schoolFeeDiscount, 8); else result.schoolPreparationBonus = Math.max(result.schoolPreparationBonus, 2); }
    if (w.kind === 'clinic') { result.careFeeDiscount = Math.max(result.careFeeDiscount, 6); result.careDays = Math.max(result.careDays, 14); }
    if (w.kind === 'road') result.roadRiskReduction = Math.max(result.roadRiskReduction, 8);
    if (w.kind === 'garden') { if (w.scope === 'open') result.resourceRecoveryBonus = Math.max(result.resourceRecoveryBonus, 2); else result.foodSupport = Math.max(result.foodSupport, 30); }
    if (w.kind === 'refuge') { result.refuge = true; result.foodSupport = Math.max(result.foodSupport, 15); }
    if(w.kind==='archive'){result.apprenticeshipAvailable=true;if(w.scope==='open')result.schoolFeeDiscount=Math.max(result.schoolFeeDiscount,10);else result.schoolPreparationBonus=Math.max(result.schoolPreparationBonus,3);}
    if(w.kind==='watershed'){result.resourceRecoveryBonus=Math.max(result.resourceRecoveryBonus,w.scope==='open'?3:1);result.roadRiskReduction=Math.max(result.roadRiskReduction,w.scope==='open'?6:10);}
  }
  return result;
}

/** Historical funded intervals let gathering account for each real rate period,
 * including pauses, without rewarding the years before a garden existed. */
export function communityResourceIntervals(s, locationId, oldDay, newDay) {
  if (!usable(s, locationId) || newDay <= oldDay) return [];
  const intervals = [];
  for (const w of s.community?.works || []) {
    if (w.status !== 'standing' || !(w.kind==='garden'&&w.scope==='open'||w.kind==='watershed') || w.locationId !== locationId) continue;
    for (const period of w.fundingPeriods) {
      let pieces = [{ fromDay: Math.max(oldDay, period.fromDay), toDay: Math.min(newDay, period.toDay) }].filter(piece => piece.toDay > piece.fromDay);
      for (const pause of w.servicePauses) pieces = pieces.flatMap(piece => {
        const start = pause.fromDay, end = pause.toDay ?? newDay;
        if (end <= piece.fromDay || start >= piece.toDay) return [piece];
        return [{ fromDay: piece.fromDay, toDay: Math.min(start, piece.toDay) }, { fromDay: Math.max(end, piece.fromDay), toDay: piece.toDay }].filter(part => part.toDay > part.fromDay);
      });
      intervals.push(...pieces.map(piece => ({ ...piece, bonus: w.kind==='watershed'?(w.scope==='open'?3:1):2 })));
    }
  }
  const cuts=[...new Set(intervals.flatMap(p=>[p.fromDay,p.toDay]))].sort((a,b)=>a-b),result=[];
  for(let i=0;i<cuts.length-1;i++){const fromDay=cuts[i],toDay=cuts[i+1],bonus=Math.max(0,...intervals.filter(p=>p.fromDay<=fromDay&&p.toDay>fromDay).map(p=>p.bonus));if(!bonus)continue;const prev=result.at(-1);if(prev&&prev.toDay===fromDay&&prev.bonus===bonus)prev.toDay=toDay;else result.push({fromDay,toDay,bonus});}
  return result;
}

/** Actual paid periods are used for past costs. A future forecast may include
 * further years that the existing protected reserve can already pay for. */
export function communityFoodIntervals(s, locationId, oldDay, newDay) {
  if (!usable(s, locationId) || newDay <= oldDay) return [];
  const intervals = [];
  for (const w of s.community?.works || []) {
    const annualSupport = w.kind === 'garden' && w.scope === 'practice' ? 30 : w.kind === 'refuge' ? 15 : 0;
    if (!annualSupport || w.status !== 'standing' || w.locationId !== locationId) continue;
    const periods = [...w.fundingPeriods];
    if (w.enabled && newDay > s.day && w.operatingBalance >= w.annualCost) {
      const fromDay = Math.max(s.day, w.fundedUntil), toDay = fromDay + Math.floor(w.operatingBalance / w.annualCost) * YEAR;
      periods.push({ fromDay, toDay });
    }
    for (const period of periods) {
      let pieces = [{ fromDay: Math.max(oldDay, period.fromDay), toDay: Math.min(newDay, period.toDay) }].filter(piece => piece.toDay > piece.fromDay);
      for (const pause of w.servicePauses) pieces = pieces.flatMap(piece => {
        const start = pause.fromDay, end = pause.toDay ?? newDay;
        if (end <= piece.fromDay || start >= piece.toDay) return [piece];
        return [{ fromDay: piece.fromDay, toDay: Math.min(start, piece.toDay) }, { fromDay: Math.max(end, piece.fromDay), toDay: piece.toDay }].filter(part => part.toDay > part.fromDay);
      });
      intervals.push(...pieces.map(piece => ({ ...piece, annualSupport })));
    }
  }
  const cuts = [...new Set(intervals.flatMap(interval => [interval.fromDay, interval.toDay]))].sort((a, b) => a - b), result = [];
  for (let index = 0; index < cuts.length - 1; index++) {
    const fromDay = cuts[index], toDay = cuts[index + 1], annualSupport = Math.max(0, ...intervals.filter(interval => interval.fromDay <= fromDay && interval.toDay > fromDay).map(interval => interval.annualSupport));
    if (!annualSupport) continue;
    const previous = result.at(-1);
    if (previous && previous.toDay === fromDay && previous.annualSupport === annualSupport) previous.toDay = toDay;
    else result.push({ fromDay, toDay, annualSupport });
  }
  return result;
}

export function communityFoodSupportAt(s, locationId, day = s.day) {
  return communityFoodIntervals(s, locationId, day, day + 1)[0]?.annualSupport || 0;
}

export function onCommunityTime(s, { oldDay, newDay }, ctx = {}) {
  if (!s.community || newDay <= oldDay) return;
  s.community.lastDay = newDay;
  for (const w of s.community.works) {
    if (w.status !== 'standing' || !usable(s, w.locationId)) continue;
    if (w.enabled) {
      while (w.fundedUntil <= newDay && w.operatingBalance >= w.annualCost) { const fromDay = w.fundedUntil; w.operatingBalance -= w.annualCost; w.operatingSpent += w.annualCost; w.fundedUntil += YEAR; w.fundingPeriods.push({ fromDay, toDay: w.fundedUntil, gold: w.annualCost }); }
    }
    const alreadyQueued = [...s.community.queue, s.community.pending].filter(Boolean).some(p => p.workId === w.id);
    if (s.phase !== 'retired' && w.enabled && w.fundedUntil > newDay && newDay - w.lastFollowupDay >= YEAR * 2 && s.community.queue.length < 8 && !alreadyQueued) {
      w.lastFollowupDay = newDay;
      s.community.queue.push({ eventId: 'community_beneficiary', workId: w.id, recipientIndex: w.recipientIndex++ % w.beneficiaries.length, offeredDay: newDay });
    }
    if (s.phase !== 'retired' && w.enabled && w.fundedUntil <= newDay && newDay >= (w.nextReminderDay||0) && newDay - w.lastReviewDay >= YEAR && s.community.queue.length < 8 && !alreadyQueued) {
      w.lastReviewDay = newDay; s.community.queue.push({ eventId: 'community_review', workId: w.id, offeredDay: newDay });
      note(s, ctx, 'An institution needs an honest next chapter', `${w.name}'s actual endowment has run out. Its building and history remain; funded services pause until someone chooses another contribution or a different charter.`, { workId: w.id, result: 'unfunded' });
    }
  }
}

export function flushCommunityEvent(s, ctx = {}) {
  if (!s.community || s.phase === 'retired' || s.event || s.battle || s.conversations?.pending || s.dungeon || s.community.project?.commitment) return false;
  if (!s.community.pending) s.community.pending = s.community.queue.shift() || null;
  const pending = s.community.pending; if (!pending) return false;
  if (pending.eventId === 'community_charter') {
    const p = s.community.project; if (!p || p.id !== pending.projectId) { s.community.pending = null; return false; }
    const row = catalog(p.kind);
    ctx.setEvent?.('community_charter', `Whom will ${p.name} serve?`, 'Community ambition', `${row.purpose} ${p.beneficiaries.map(person => `${person.name}, ${person.role}`).join('; ')} are recorded in the proposal. ${p.originName ? `The refuge will be built in ${place(s, p.locationId)?.name}, preserving the lost ${p.originName}; its destruction and dead are not undone. ` : ''}The three recorded milestones cost ${p.stages.reduce((sum, part) => sum + part.cost, 0)} gold in total. A charter choice spends no gold or time and grants no service before completion.`, choices([...row.scopes, ['cancel', 'Leave this proposal uncommitted', 'No work or fees have been committed.']]));
  } else {
    const w = s.community.works.find(work => work.id === pending.workId); if (!w) { s.community.pending = null; return false; }
    if (pending.eventId === 'community_review') ctx.setEvent?.('community_review', `The future of ${w.name}`, 'Endowment and governance', `${w.founderName} founded this ${w.kind} undertaking on day ${w.completedDay}. ${communityOperation(s,w).description} ${w.contributedGold} gold has been contributed; ${w.operatingSpent} paid for actual operation; ${w.operatingBalance} remains protected. Annual operation costs ${w.annualCost}. Its beneficiaries include ${w.beneficiaries.map(p => p.name).join(', ')}. Review choices spend nothing and cannot replace missing funding.`, choices([['keep', 'Keep the existing charter', 'Keep the protected reserve and its recorded purpose. If funding has run out, choose a contribution separately.'], ['pause', 'Pause the operating service', 'The building, unused reserve and history remain. Further operating years are not automatically funded.'], ['reopen', 'Reopen the recorded service', 'Use the existing reserve for actual future operation if sufficient; no gold is invented.'], ['handover', 'Take responsibility as the current generation', 'Record who now accepts stewardship; property and protected funds are retained once.']]));
    else {
      const recipient = w.beneficiaries[pending.recipientIndex], current = livingRecipient(s, recipient);
      const episodes = { learning: ['a learner asks for lessons that fit a working household', 'a completed course leads to a request for practice, rather than an automatic diploma', 'the hall debates whose history belongs in its lessons'], clinic: ['a household needs a predictable care routine', 'a caregiver asks that patients’ private circumstances stay private', 'the clean-supply account shows what continued care actually consumes'], road: ['a cautious traveler brings a correction for the route board', 'a storm exposes a crossing that needs a different waiting place', 'neighbors ask who gets to speak in the crossing cooperative'], garden: ['a winter household asks how the stored food is shared', 'a grower describes pressure on the common gathering beds', 'the seed keepers disagree about the next season’s planting'], refuge: ['survivors ask whose names belong in the memorial', 'a household wants to shape the refuge’s routines', 'a young resident asks for a future beyond the story of the lost place'] };
      episodes.archive=['a working student asks whose original account will be preserved beside the copy','a teacher brings a conflicting source and asks for a correction without erasing the disagreement','a learner returns with a new practice and wants credit shared with the people who taught it'];
      episodes.watershed=['a water keeper brings a drainage account from the last hard rain','a grower and a traveler disagree over which crossing should be maintained first','the next generation of keepers asks who may inspect the common-ground agreement'];
      const line = episodes[w.kind][seededRoll(s.seed, `community-episode-${w.id}-${pending.offeredDay}-${recipient.id}`, 3)];
      ctx.setEvent?.('community_beneficiary', `${recipient.name} and ${w.name}`, 'A service becomes a relationship', `${current ? recipient.name : `${recipient.name}'s recorded place in the charter`} returns to this institution’s story: ${line}. ${current ? 'A reply can give them actual time or let the community govern its own next step.' : 'They are no longer a living participant; an account can preserve their name without treating them as an active contact.'} Current funded operation lasts through day ${w.fundedUntil}; a response cannot refill its endowment.`, choices([['listen', 'Give the account an unhurried day', 'Spend 1 actual day. Preserve this particular person’s account; no cash or qualification is awarded.'], ['support', 'Help with the next practical step', 'Spend up to 3 actual days and 20 gold on a named practical followup. A living child can gain one relevant learned skill; no certificate or adult career is assigned. Zero elapsed days grants no fee or benefit.'], ['delegate', 'Let the recorded community decide', 'Record a local response without spending time, granting resources or forcing a participant’s future.']]));
    }
  }
  return !!s.event;
}

export function applyCommunityChoice(s, eventId, pick, ctx = {}) {
  const pending = s.community?.pending; if (!pending || pending.eventId !== eventId || !communityEventIds()[eventId]?.includes(pick)) return false;
  if (eventId === 'community_charter') {
    const p = s.community.project; if (!p || p.id !== pending.projectId) return false;
    if (pick === 'cancel') { s.community.project = null; s.notice = 'The proposal remains a conversation, with no fee or finished institution.'; }
    else { p.scope = pick; note(s, ctx, 'A visible charter before a commitment', `${p.name} will follow its ${pick === 'open' ? 'public' : 'practical'} charter. Its beneficiaries and each material, time and money milestone remain visible before work begins.`, { workId: p.id, result: 'chartered', scope: pick }); }
  } else {
    const w = s.community.works.find(work => work.id === pending.workId); if (!w) return false;
    if (eventId === 'community_review') {
      w.nextReminderDay=pick==='keep'&&w.operatingBalance<w.annualCost?s.day+YEAR*2:0;
      if (pick === 'pause' && w.enabled) { w.enabled = false; w.servicePauses.push({ fromDay: s.day, toDay: null }); }
      if (pick === 'reopen') { const pause = w.servicePauses.at(-1); if (pause?.toDay === null) pause.toDay = s.day; w.enabled = true; allocateFunding(w, s.day); }
      if (pick === 'handover') { w.handover = { personId: s.dynasty?.activePersonId || 'hero', name: s.hero.name, day: s.day }; updateAmbition(s, ctx); }
      w.lastReviewDay = s.day;
      note(s, ctx, 'Stewardship remains a choice', `${s.hero.name} chose ${pick} for ${w.name}. The actual reserve remains ${w.operatingBalance} gold. ${communityOperation(s,w).description}`, { workId: w.id, result: 'review', choice: pick });
    } else {
      const recipient = w.beneficiaries[pending.recipientIndex];
      if (pick === 'support' && s.hero.gold < 20) { s.notice = 'That practical followup needs 20 gold; listening or delegation remain available.'; return false; }
      const days = pick === 'support' ? 3 : pick === 'listen' ? 1 : 0, actual = days ? ctx.spendDays?.(days) || 0 : 0;
      if (days && (actual <= 0 || s.phase === 'retired')) { s.community.pending = null; s.notice = 'The followup pauses at the interruption. No fee or learning benefit was awarded.'; return true; }
      const current = livingRecipient(s, recipient);
      if (pick === 'support') s.hero.gold -= 20;
      const milestone = { day: s.day, choice: pick, days: actual, gold: pick === 'support' ? 20 : 0, alive: !!current };
      recipient.milestones.push(milestone); recipient.milestones = recipient.milestones.slice(-24);
      if (pick === 'support' && current?.source === 'child' && recipient.source === 'lineage' && current.development?.skills && Math.floor((s.day - current.bornDay) / YEAR) >= 3) { const skill = w.kind === 'learning' ? 'scholarship' : w.kind === 'clinic' ? 'devotion' : 'survival'; current.development.skills[skill] = Math.min(10000, (current.development.skills[skill] || 0) + 1); (current.development.history ||= []).push({ day: s.day, title: 'Practice within a living institution', text: `${s.hero.name} gave ${actual} actual days to my next practical step at ${w.name}.`, choice: `community-${w.kind}` }); current.development.history = current.development.history.slice(-60); }
      if (current && Array.isArray(current.memories)) { current.memories.push(`${s.hero.name} chose ${pick} when my account returned to ${w.name} on day ${s.day}.`); current.memories = current.memories.slice(-24); }
      note(s, ctx, 'A named account returns with a different consequence', `${recipient.name}'s part in ${w.name} was ${current ? 'answered' : 'preserved'} through ${pick}. ${actual} actual days${pick === 'support' ? ' and 20 gold' : ''} were given. Their future is not replaced by a purchased qualification.`, { workId: w.id, recipientId: recipient.id, result: 'beneficiary', choice: pick, days: actual });
    }
  }
  s.community.pending = null; return true;
}

export function inheritCommunity(previous, next) {
  if (!previous.community) { initializeCommunity(next); return; }
  next.community = clone(previous.community);
  next.community.lastDay = next.day; next.community.project = null; next.community.pending = null; next.community.queue = [];
  if (previous.community.project) {
    const p = previous.community.project;
    next.community.history.push({ id: `community-inheritance-${next.day}-${next.dynasty?.generation || 1}`, day: next.day, title: 'An unfinished ambition belongs to the earlier life', text: `${p.name} remains unfinished after ${p.paidGold} gold and ${p.workedDays} actual days. The successor receives no refund or automatic completed service.`, workId: p.id, result: 'inherited-unfinished' });
  }
}

export function communityView(s) {
  if (!s.community) return { title: 'A community beyond one life', project: null, works: [], support: communitySupport(s), ambitions: [], actions: [] };
  return { title: 'What will outlive your work?', project: clone(s.community.project), works: s.community.works.map(w => ({ ...clone(w), siteName: place(s, w.locationId)?.name || w.locationId, operating: communityOperation(s,w).operating, operation:communityOperation(s,w), daysFunded: Math.max(0, w.fundedUntil - s.day), scopeDescription: catalog(w.kind).scopes.find(row => row[0] === w.scope)?.[2] || 'An unfinished undertaking.', beneficiaries: w.beneficiaries.map(recipient => ({ ...clone(recipient), alive: !!livingRecipient(s, recipient) })) })), support: communitySupport(s), ambitions: clone(s.community.ambitionSteps), history: clone(s.community.history), pending: clone(s.community.pending), actions: communityActions(s) };
}

export function communityEventIds() { return { community_charter: ['open', 'practice', 'cancel'], community_review: ['keep', 'pause', 'reopen', 'handover'], community_beneficiary: ['listen', 'support', 'delegate'] }; }
const obj = value => !!value && typeof value === 'object' && !Array.isArray(value);
const int = (value, min = 0, max = 100000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const str = (value, max = 500) => typeof value === 'string' && value.length <= max;
const materialsValid = value => obj(value) && Object.entries(value).every(([id, n]) => MATERIALS.includes(id) && int(n, 0, 10000));
const beneficiariesValid = (value, s) => Array.isArray(value) && value.length > 0 && value.length <= 4 && value.every(p => obj(p) && str(p.id, 200) && str(p.name, 100) && ['society', 'life', 'lineage', 'charter'].includes(p.source) && str(p.role, 160) && int(p.joinedDay, 0, s.day) && (p.source !== 'charter' || int(p.bornDay, -10000000, p.joinedDay) && int(p.deathDay, p.joinedDay + 1, 100000000)) && (p.ownerId === undefined || str(p.ownerId, 200)) && Array.isArray(p.milestones) && p.milestones.length <= 24 && p.milestones.every(m => obj(m) && int(m.day, 0, s.day) && ['listen', 'support', 'delegate'].includes(m.choice) && int(m.days, 0, 3) && int(m.gold, 0, 20) && typeof m.alive === 'boolean'));
const milestonesValid = (value, s) => Array.isArray(value) && value.length <= 3 && value.every(p => obj(p) && str(p.title) && int(p.finishedDay, 0, s.day) && int(p.days, 1, 365) && int(p.gold) && materialsValid(p.materials));

export function validateCommunity(value, s) {
  if (value === undefined) return true;
  try {
    if (!obj(value) || value.version !== 1 || !int(value.introducedDay, 0, s.day) || !int(value.lastDay, value.introducedDay, s.day) || !Array.isArray(value.works) || value.works.length > 24 || !Array.isArray(value.queue) || value.queue.length > 8 || !Array.isArray(value.history) || value.history.length > 160 || !Array.isArray(value.ambitionSteps) || value.ambitionSteps.length > 4) return false;
    const ids = new Set();
    for (const w of value.works) {
      if (!obj(w) || !str(w.id, 200) || ids.has(w.id) || !catalog(w.kind) || !str(w.name, 200) || !place(s, w.locationId) || !(w.originId === null || place(s, w.originId)) || !(w.originName === null || str(w.originName, 200)) || !str(w.founderId, 200) || !str(w.founderName, 100) || !int(w.generation, 1, 200) || !int(w.completedDay, 0, s.day) || !['open', 'practice'].includes(w.scope) || !['standing', 'unfinished'].includes(w.status) || typeof w.enabled !== 'boolean' || !int(w.constructionGold) || !materialsValid(w.paidMaterials) || !int(w.workedDays) || !milestonesValid(w.milestones, s) || !int(w.annualCost, 1, 10000) || !int(w.contributedGold) || !int(w.operatingBalance) || !int(w.operatingSpent) || w.operatingBalance + w.operatingSpent !== w.contributedGold || !int(w.fundedUntil, 0, 100000000) || !int(w.lastReviewDay, 0, s.day) || !int(w.lastFollowupDay, 0, s.day) || !beneficiariesValid(w.beneficiaries, s) || !int(w.recipientIndex) || !(w.handover === null || obj(w.handover) && str(w.handover.personId, 200) && str(w.handover.name, 100) && int(w.handover.day, 0, s.day))) return false;
      if (!Array.isArray(w.fundingPeriods) || w.fundingPeriods.length > 2000 || !w.fundingPeriods.every(p => obj(p) && int(p.fromDay, w.completedDay, s.day) && int(p.toDay, p.fromDay + 1, 100000000) && p.toDay - p.fromDay === YEAR && p.gold === w.annualCost) || w.fundingPeriods.reduce((sum, p) => sum + p.gold, 0) !== w.operatingSpent || !Array.isArray(w.servicePauses) || w.servicePauses.length > 200 || !w.servicePauses.every(p => obj(p) && int(p.fromDay, w.completedDay, s.day) && (p.toDay === null || int(p.toDay, p.fromDay, s.day)))) return false;
      ids.add(w.id);
    }
    const p = value.project;
    if (p !== null) {
      if (!obj(p) || !str(p.id, 200) || ids.has(p.id) || !catalog(p.kind) || !str(p.name, 200) || !place(s, p.locationId) || !(p.originId === null || place(s, p.originId)) || !(p.originName === null || str(p.originName, 200)) || !str(p.founderId, 200) || !str(p.founderName, 100) || !int(p.generation, 1, 200) || !int(p.startedDay, 0, s.day) || ![null, 'open', 'practice'].includes(p.scope) || !int(p.step, 0, 2) || !int(p.paidGold) || !materialsValid(p.paidMaterials) || !int(p.workedDays) || !milestonesValid(p.milestones, s) || !beneficiariesValid(p.beneficiaries, s)) return false;
      if (!Array.isArray(p.stages) || p.stages.length !== 3 || !p.stages.every(part => obj(part) && str(part.title) && int(part.days, 1, 365) && int(part.cost) && materialsValid(part.materials)) || !int(p.annualCost, 1, 10000) || p.milestones.length !== p.step) return false;
      if (p.commitment !== null) { const c = p.commitment; if (!obj(c) || p.scope === null || !str(c.title) || !int(c.totalDays, 1, 365) || !int(c.remainingDays, 1, c.totalDays) || !int(c.cost) || !materialsValid(c.materials) || c.paid !== true || !int(c.startedDay, 0, s.day)) return false; }
      if (p.paidGold !== p.milestones.reduce((sum, part) => sum + part.gold, 0) + (p.commitment?.cost || 0) || p.workedDays !== p.milestones.reduce((sum, part) => sum + part.days, 0) + (p.commitment ? p.commitment.totalDays - p.commitment.remainingDays : 0)) return false;
    }
    const pendingValid = pending => obj(pending) && communityEventIds()[pending.eventId] && (pending.eventId === 'community_charter' ? value.project?.id === pending.projectId : ids.has(pending.workId)) && (pending.recipientIndex === undefined || int(pending.recipientIndex, 0, 3)) && (pending.offeredDay === undefined || int(pending.offeredDay, 0, s.day));
    if (value.pending !== null && !pendingValid(value.pending) || !value.queue.every(pendingValid)) return false;
    if (!value.history.every(h => obj(h) && str(h.id, 200) && int(h.day, 0, s.day) && str(h.title, 300) && str(h.text, 4000))) return false;
    if (!value.ambitionSteps.every(a => obj(a) && int(a.id, 1, 4) && int(a.day, 0, s.day) && str(a.personId, 200) && str(a.name, 100) && str(a.text, 500)) || new Set(value.ambitionSteps.map(a => a.id)).size !== value.ambitionSteps.length) return false;
    return true;
  } catch { return false; }
}
