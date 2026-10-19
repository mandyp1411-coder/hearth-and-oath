import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeCommunity, communityActions, applyCommunityAction, applyCommunityChoice, onCommunityTime, flushCommunityEvent, communitySupport, communityResourceIntervals, communityFoodIntervals, communityFoodSupportAt, communityView, validateCommunity, inheritCommunity, COMMUNITY_CATALOG } from '../dist/js/community.js';

function fixture() {
  const s = { seed: 'community-real-time-test', day: 30 * 365, age: 30, phase: 'adult', locationId: 'home', world: generateWorld('community-real-time-test', { expanded: true }), hero: { name: 'Iona Test', gold: 40000 }, equipment: { materials: Object.fromEntries(['wood', 'stone', 'ore', 'cloth', 'hide', 'crystal'].map(id => [id, 200])) }, life: { people: [{ id: 'neighbor', name: 'Bram Neighbor', age: 35, alive: true, locationId: 'home', occupation: 'miller', memories: [] }], children: [], plan: null }, lineage: { people: [] }, dynasty: { generation: 1, activePersonId: 'founder' }, timeline: { journey: null }, workshop: { project: null }, careers: { batch: null }, conversations: { pending: null }, event: null, battle: null };
  initializeCommunity(s); return s;
}
function context(s, maxDays = Infinity) {
  return { spendDays(days) { const actual = Math.min(days, maxDays), oldDay = s.day; s.day += actual; onCommunityTime(s, { oldDay, newDay: s.day }); return actual; }, setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; }, journal() {}, standing() {} };
}
function select(s, pick, ctx = context(s)) { const event = s.event; s.event = null; assert.ok(applyCommunityChoice(s, event.id, pick, ctx)); }
function build(s, kind = 'learning', scope = 'open') {
  assert.ok(applyCommunityAction(s, `community_begin_${kind}`, context(s))); select(s, scope);
  for (let n = 0; n < 3; n++) assert.ok(applyCommunityAction(s, 'community_stage', context(s)));
  assert.ok(validateCommunity(s.community, s)); return s.community.works.at(-1);
}

test('three actual paid milestones conserve materials, money and the protected operating endowment', () => {
  const s = fixture(), before = structuredClone(s), work = build(s);
  const row = COMMUNITY_CATALOG.find(row => row.id === 'learning');
  assert.equal(before.hero.gold - s.hero.gold, row.stages.reduce((sum, stage) => sum + stage.cost, 0));
  assert.equal(s.day - before.day, row.stages.reduce((sum, stage) => sum + stage.days, 0));
  assert.equal(work.operatingBalance + work.operatingSpent, 2400);
  assert.equal(work.constructionGold, 1200); assert.equal(work.workedDays, 37);
  assert.equal(before.equipment.materials.wood - s.equipment.materials.wood, 14);
  assert.equal(communitySupport(s).schoolFeeDiscount, 8);
  assert.equal(s.community.ambitionSteps.length, 1);
  const unchanged = structuredClone(s); communityView(s); communityActions(s); communitySupport(s); assert.deepEqual(s, unchanged, 'reading a charter cannot mint resources or consume the fund');
});

test('regional endowments return named playable beneficiary stories after real funded years',()=>{
  for(const kind of ['archive','watershed']){
    const s=fixture();s.hero.gold=20000;for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=100;
    const before=s.hero.gold,w=build(s,kind,'open'),row=COMMUNITY_CATALOG.find(c=>c.id===kind);
    assert.equal(before-s.hero.gold,row.stages.reduce((n,p)=>n+p.cost,0));
    context(s).spendDays(2*365+1);assert.ok(flushCommunityEvent(s,context(s)));
    assert.equal(s.event.id,'community_beneficiary');assert.ok(s.event.body.includes(w.beneficiaries[0].name));
    assert.ok(!s.event.body.includes('undefined'));select(s,'listen');assert.ok(validateCommunity(s.community,s));
    if(kind==='archive')assert.equal(communitySupport(s).schoolFeeDiscount,10);else{assert.equal(communitySupport(s).resourceRecoveryBonus,3);assert.equal(communitySupport(s).roadRiskReduction,6);}
  }
});

test('an interrupted milestone preserves its original quotation and charges only once', () => {
  const s = fixture(); applyCommunityAction(s, 'community_begin_clinic', context(s)); select(s, 'practice');
  const before = s.hero.gold; applyCommunityAction(s, 'community_stage', context(s, 3));
  assert.equal(before - s.hero.gold, 600); assert.equal(s.community.project.commitment.remainingDays, 15);
  const snap = structuredClone(s.community.project.commitment), materials = structuredClone(s.equipment.materials);
  applyCommunityAction(s, 'community_continue', context(s, 5));
  assert.equal(s.hero.gold, before - 600); assert.deepEqual(s.equipment.materials, materials); assert.equal(s.community.project.commitment.remainingDays, 10);
  assert.equal(s.community.project.commitment.startedDay, snap.startedDay);
  applyCommunityAction(s, 'community_continue', context(s));
  assert.equal(s.community.project.commitment, null); assert.equal(s.community.project.milestones[0].days, 18); assert.equal(s.community.project.workedDays, 18); assert.ok(validateCommunity(s.community, s));
});

test('zero elapsed days cannot charge a milestone, fund or beneficiary response', () => {
  const s = fixture(); applyCommunityAction(s, 'community_begin_road', context(s)); select(s, 'open');
  const before = structuredClone({ gold: s.hero.gold, materials: s.equipment.materials, project: s.community.project });
  applyCommunityAction(s, 'community_stage', context(s, 0));
  assert.deepEqual({ gold: s.hero.gold, materials: s.equipment.materials, project: s.community.project }, before);
  const work = buildAfterAbandon(s);
  const funding = { gold: s.hero.gold, reserve: work.operatingBalance, contributed: work.contributedGold };
  applyCommunityAction(s, `community_fund_${work.id}`, context(s, 0)); assert.deepEqual({ gold: s.hero.gold, reserve: work.operatingBalance, contributed: work.contributedGold }, funding);
  s.community.pending = { eventId: 'community_beneficiary', workId: work.id, recipientIndex: 0, offeredDay: s.day }; flushCommunityEvent(s, context(s));
  const records = structuredClone(work.beneficiaries[0].milestones), gold = s.hero.gold;
  select(s, 'support', context(s, 0)); assert.equal(s.hero.gold, gold); assert.deepEqual(work.beneficiaries[0].milestones, records);
});
function buildAfterAbandon(s) { applyCommunityAction(s, 'community_abandon', context(s)); return build(s, 'road'); }

test('funded service consumes the same reserve over segmented or annual calendar steps', () => {
  const a = fixture(); build(a, 'clinic'); const b = structuredClone(a), born = a.day;
  for (const days of [45, 100, 220, 365, 365]) context(a).spendDays(days);
  context(b).spendDays(3 * 365);
  assert.equal(a.day, born + 3 * 365); assert.equal(a.community.works[0].operatingSpent, b.community.works[0].operatingSpent);
  assert.equal(a.community.works[0].operatingBalance, b.community.works[0].operatingBalance);
  assert.equal(a.community.works[0].fundedUntil, b.community.works[0].fundedUntil);
  assert.equal(a.hero.gold, b.hero.gold, 'operating costs come from the paid fund, not a silent household debit');
  flushCommunityEvent(a, context(a)); if (a.event) select(a, 'delegate');
  context(a).spendDays(7 * 365); assert.equal(communitySupport(a).careFeeDiscount, 0); assert.equal(a.community.works[0].operatingBalance, 0);
  assert.ok(a.community.queue.some(p => p.eventId === 'community_review'));
});

test('pausing and reopening services preserves funds without retroactive operating charges', () => {
  const s = fixture(), work = build(s, 'garden', 'practice');
  applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'pause');
  const reserve = work.operatingBalance; context(s).spendDays(4 * 365);
  assert.equal(work.operatingBalance, reserve); assert.equal(communitySupport(s).foodSupport, 0);
  applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'reopen');
  assert.equal(reserve - work.operatingBalance, 180); assert.equal(work.fundedUntil, s.day + 365); assert.equal(communitySupport(s).foodSupport, 30);
});

test('gathering support counts only real funded intervals and excludes construction years and deliberate pauses', () => {
  const s = fixture(), start = s.day, work = build(s, 'garden');
  context(s).spendDays(30); applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'pause');
  const pause = s.day; context(s).spendDays(60); applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'reopen');
  const reopen = s.day; context(s).spendDays(20);
  assert.deepEqual(communityResourceIntervals(s, 'home', start - 3650, s.day), [{ fromDay: work.completedDay, toDay: pause, bonus: 2 }, { fromDay: reopen, toDay: s.day, bonus: 2 }]);
  assert.deepEqual(communityResourceIntervals(s, 'city', start, s.day), []);
  assert.ok(validateCommunity(s.community, s));
});

test('food support follows exact operating years, pauses and the actually affordable future reserve', () => {
  const s = fixture(), start = s.day, work = build(s, 'garden', 'practice');
  context(s).spendDays(30); applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'pause');
  const pause = s.day; context(s).spendDays(60); applyCommunityAction(s, `community_review_${work.id}`, context(s)); select(s, 'reopen');
  const reopened = s.day; context(s).spendDays(2 * 365);
  assert.deepEqual(communityFoodIntervals(s, 'home', start - 3650, s.day), [{ fromDay: work.completedDay, toDay: pause, annualSupport: 30 }, { fromDay: reopened, toDay: s.day, annualSupport: 30 }]);
  assert.equal(communityFoodSupportAt(s, 'home', start - 1), 0);
  assert.equal(communityFoodSupportAt(s, 'home', pause + 1), 0);
  assert.equal(communityFoodSupportAt(s, 'home', reopened), 30);
  const reserve = work.operatingBalance, spent = work.operatingSpent, futureUntil = work.fundedUntil + Math.floor(reserve / work.annualCost) * 365;
  assert.equal(communityFoodSupportAt(s, 'home', futureUntil - 1), 30); assert.equal(communityFoodSupportAt(s, 'home', futureUntil), 0);
  assert.equal(work.operatingBalance, reserve); assert.equal(work.operatingSpent, spent, 'a forecast can explain committed reserve without actually consuming it');
});

test('a refuge preserves campaign destruction and creates services only at the real living counterpart', () => {
  const s = fixture(); const city = s.world.locations.find(p => p.id === 'city'); city.status = 'destroyed'; city.servicesAvailable = false;
  const ending = { id: 'shatter', destroyed: ['city'], summary: 'The city fell.' }; s.campaign = { ending: structuredClone(ending) };
  const work = build(s, 'refuge', 'practice');
  assert.equal(work.originId, 'city'); assert.equal(work.locationId, 'home'); assert.deepEqual(s.campaign.ending, ending);
  assert.equal(city.status, 'destroyed'); assert.equal(communitySupport(s, 'city').refuge, false); assert.equal(communitySupport(s, 'home').refuge, true);
  s.world.locations.find(p => p.id === 'home').status = 'evacuated'; assert.equal(communitySupport(s, 'home').refuge, false, 'later loss pauses real services without erasing recorded history');
});

test('a beneficiary followup develops the actual living child and does not buy a diploma', () => {
  const s = fixture(); s.life.people = []; s.life.children = [{ id: 'child-one', name: 'Neris Child', alive: true, learning: { scholarship: 1 } }];
  s.lineage.people.push({ id: 'lineage-child-one', localId: 'child-one', source: 'child', name: 'Neris Child', alive: true, bornDay: s.day - 7 * 365, development: { skills: { scholarship: 1, devotion: 0, survival: 0 }, education: { qualifications: [] } } });
  const work = build(s); const original = s.lineage.people[0].development.education.qualifications;
  context(s).spendDays(2 * 365); flushCommunityEvent(s, context(s)); assert.equal(s.event.id, 'community_beneficiary');
  const gold = s.hero.gold, day = s.day; select(s, 'support');
  assert.equal(s.hero.gold, gold - 20); assert.equal(s.day, day + 3); assert.equal(s.lineage.people[0].development.skills.scholarship, 2); assert.deepEqual(original, []);
  assert.equal(work.beneficiaries[0].milestones.length, 1); assert.ok(validateCommunity(s.community, s));
});

test('succession retains infrastructure and paid reserves exactly once without a cash payout', () => {
  const previous = fixture(), work = build(previous, 'road'), next = structuredClone(previous);
  next.hero.name = 'Neris Successor'; next.hero.gold = 1000; next.dynasty = { generation: 2, activePersonId: 'heir' };
  inheritCommunity(previous, next);
  assert.equal(next.hero.gold, 1000); assert.deepEqual(next.community.works, previous.community.works);
  const originalReserve = work.operatingBalance; applyCommunityAction(next, `community_review_${work.id}`, context(next)); select(next, 'handover');
  assert.equal(next.community.works[0].operatingBalance, originalReserve); assert.equal(next.community.works[0].handover.personId, 'heir');
  assert.ok(next.community.ambitionSteps.some(a => a.id === 4)); assert.equal(previous.community.works[0].handover, null); assert.ok(validateCommunity(next.community, next));
});

test('beneficiaries retain their original identity when a successor reuses local family IDs', () => {
  const s = fixture(); s.lineage.people.push({ id: 'g1-life-neighbor', localId: 'neighbor', source: 'life', name: 'Bram Neighbor', alive: true });
  const work = build(s), next = structuredClone(s); next.dynasty = { generation: 2, activePersonId: 'heir' };
  next.life.people = [{ id: 'neighbor', name: 'A different guardian', alive: true, locationId: 'home', memories: [] }]; next.lineage.people[0].source = 'ancestor'; inheritCommunity(s, next);
  const person = communityView(next).works[0].beneficiaries[0];
  assert.equal(person.id, 'g1-life-neighbor'); assert.equal(person.name, 'Bram Neighbor'); assert.equal(person.alive, true);
  assert.equal(work.beneficiaries[0].source, 'lineage');
});

test('a named fallback charter keeper ages and is remembered after their own recorded death', () => {
  const s = fixture(); s.life.people = []; const work = build(s, 'refuge');
  const keeper = work.beneficiaries[0]; assert.equal(keeper.source, 'charter'); assert.equal(communityView(s).works[0].beneficiaries[0].alive, true);
  context(s).spendDays(keeper.deathDay - s.day);
  assert.equal(communityView(s).works[0].beneficiaries[0].alive, false); assert.equal(communityView(s).works[0].beneficiaries[0].name, keeper.name);
  assert.ok(validateCommunity(s.community, s));
});

test('imports create no invented past, and validators reject forged funds and ambiguous commitments', () => {
  const s = fixture(); assert.equal(s.community.introducedDay, s.day); assert.equal(s.community.works.length, 0); assert.equal(communitySupport(s).schoolFeeDiscount, 0);
  assert.equal(validateCommunity(undefined, s), true); const before = structuredClone(s.community); initializeCommunity(s); assert.deepEqual(s.community, before);
  build(s, 'clinic'); const bad = structuredClone(s.community); bad.works[0].operatingBalance++; assert.equal(validateCommunity(bad, s), false);
  const negative = structuredClone(s.community); negative.works[0].operatingSpent = -1; assert.equal(validateCommunity(negative, s), false);
});
