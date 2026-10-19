import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, findRoute } from '../dist/js/world.js';
import { initializeLife } from '../dist/js/life.js';
import { initializeCampaign, campaignActions, applyCampaignAction, applyCampaignChoice, afterCampaignBattle, campaignEventIds, campaignView, onCampaignAge, validateCampaign } from '../dist/js/campaign.js';

function fixture(seed = 'the-covenant', age = 18) {
  const s = { seed, phase: 'adult', day: age * 365, age, timeline: { mode: 'birth' }, locationId: 'home', world: generateWorld(seed, { expanded: true }), hero: { name: 'Rowan', origin: 'village', household: 'poor', path: 'unformed', specialization: null, profession: 'Unemployed', gold: 40, hp: 60, maxHp: 60, mp: 30, maxMp: 30, condition: null, skills: { scholarship: 0 } }, flags: {}, companions: [{ id: 'mira', active: true, recruited: true, memories: [], relationship: 0 }], factions: { academy: 0, order: 0, villagers: 0, underworld: 0 }, obligations: [], journal: [], event: null, battle: null, dungeon: null };
  initializeLife(s); s.life.home.tier = 'cottage'; initializeCampaign(s);
  return s;
}
function context(s) {
  return {
    journal(title, text, tag) { s.journal.push({ title, text, tag, day: s.day }); },
    setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; },
    standing(id, n) { s.factions[id] = Math.max(-100, Math.min(100, s.factions[id] + n)); },
    remember(id, text, n) { const p = s.companions.find(p => p.id === id); if (p) { p.memories.push(text); p.relationship += n; } },
    witnesses() { return s.companions.filter(p => p.active && p.recruited); },
    addObligation(id, title, days, description) { s.obligations.push({ id, title, dueDay: s.day + days, description, resolved: false }); },
    finishObligation(id) { s.obligations.filter(o => o.id === id && !o.resolved).forEach(o => o.resolved = true); },
    addEvidence(n, description) { s.flags.evidence = (s.flags.evidence || 0) + n; s.flags.evidenceDescription = description; },
    breakOath(reason) { s.flags.oathBreach = reason; },
    startDungeon(id, questId) { s.dungeon = { id, complete: false, questId }; },
    startBattle(id, context) { s.battle = { id, context }; },
  };
}
const POLICY = { patients: 'living', letter: 'order', return: 'quiet', inquiry: 'record', ferryman: 'protect', accounts: 'compare', patron: 'independent', gate: 'reinforce', refugees: 'camp', anchor: 'voluntary', council: 'inclusive', keeper: 'listen', pledge: 'renew', prepare: 'wards', final: 'testimony', aftermath: 'people' };
function begin(s, ctx, id = s.campaign.stage) {
  const q = campaignView(s).quests.find(q => q.id === id);
  s.locationId = q.locationId;
  const action = campaignActions(s).find(a => a.id === `quest_begin_${id}`);
  assert.ok(action && !action.disabledReason, `available quest ${id}`);
  assert.equal(applyCampaignAction(s, action.id, ctx), true);
}
function choose(s, ctx, choice) {
  const e = s.event;
  assert.ok(e?.choices.some(c => c.id === choice), `${e?.id} offers ${choice}`);
  s.event = null;
  assert.equal(applyCampaignChoice(s, e.id, choice, ctx), true);
}
function discover(s, ctx) {
  const quest = s.campaign.pending.questId;
  assert.ok(s.dungeon && s.dungeon.questId === quest);
  s.campaign.facts[`dungeon_${quest}`] = true;
  s.dungeon.complete = true;
  onCampaignAge(s, ctx);
  s.dungeon = null;
}
function play(s, overrides = {}, stop = 'complete') {
  const ctx = context(s);
  for (let i = 0; i < 30 && s.campaign.stage !== stop; i++) {
    const id = s.campaign.stage;
    begin(s, ctx, id);
    if (s.dungeon) discover(s, ctx);
    else choose(s, ctx, overrides[id] || POLICY[id]);
    assert.equal(validateCampaign(s.campaign, s), true, `saveable after ${id}`);
  }
  assert.equal(s.campaign.stage, stop);
  return ctx;
}
function side(s, ctx, id, choice) {
  const q = campaignView(s).quests.find(q => q.id === `side_${id}`);
  s.locationId = q.locationId;
  assert.equal(applyCampaignAction(s, `quest_side_${id}`, ctx), true);
  if (s.dungeon) discover(s, ctx); else choose(s, ctx, choice);
}

test('seeded fates unfold at four, ten, and fifteen without replacing a childhood choice or assigning a class', () => {
  const s = fixture('omen', 0), ctx = context(s);
  s.event = { id: 'birth_family', choices: [{ id: 'stay' }] };
  const fate = s.campaign.fate;
  for (const age of [4, 10, 15]) {
    s.day = age * 365; s.age = age;
    onCampaignAge(s, ctx); onCampaignAge(s, ctx);
    assert.equal(s.event.id, 'birth_family');
  }
  assert.deepEqual(s.campaign.ageClues, [4, 10, 15]);
  assert.equal(s.journal.filter(j => j.tag === 'fate').length, 3);
  assert.equal(s.campaign.fate, fate); assert.equal(s.hero.path, 'unformed');
  assert.equal(campaignActions(s).length, 0);
  assert.deepEqual(new Set(Array.from({ length: 30 }, (_, i) => fixture(`fate-${i}`).campaign.fate)), new Set(['ember', 'echo', 'thorn']));
});

test('the connected campaign starts at sixteen and requires discoveries before the next stage', () => {
  const s = fixture('sixteen', 15), ctx = context(s);
  s.event = null;
  assert.equal(campaignActions(s).length, 0);
  assert.equal(applyCampaignAction(s, 'quest_begin_well', ctx), false);
  s.age = 16; s.day = 16 * 365;
  begin(s, ctx);
  assert.equal(s.dungeon.id, 'cistern');
  assert.equal(s.campaign.stage, 'well');
  onCampaignAge(s, ctx); assert.equal(s.campaign.stage, 'well');
  discover(s, ctx);
  assert.equal(s.campaign.stage, 'patients');
  assert.equal(s.campaign.facts.contaminationKnown, true);
});

test('leaving an unfinished expedition keeps a reachable explicit resume action', () => {
  const s = fixture(), ctx = context(s);
  begin(s, ctx);
  s.dungeon = null;
  const resume = campaignActions(s).find(a => a.id === 'quest_resume_expedition');
  assert.ok(resume && !resume.disabledReason);
  assert.equal(applyCampaignAction(s, resume.id, ctx), true);
  assert.equal(s.dungeon.id, 'cistern'); assert.equal(s.dungeon.questId, 'well');
  discover(s, ctx); assert.equal(s.campaign.stage, 'patients');
});

test('all six materially different endings are reachable with all three fates and an unformed civilian', () => {
  for (const fate of ['ember', 'echo', 'thorn']) for (const ending of ['renew', 'release', 'keeper', 'dominion', 'shatter', 'haven']) {
    const s = fixture(`${fate}-${ending}`); s.campaign.fate = fate;
    play(s, { pledge: ending, prepare: ending === 'shatter' ? 'evacuate' : 'wards' });
    assert.equal(s.campaign.ending.id, ending);
    assert.equal(s.campaign.completed.length, 20);
    assert.equal(s.hero.path, 'unformed');
    assert.equal(s.hero.gold, 40, 'campaign does not invent duplicate battle or quest payouts');
    if (ending === 'shatter') assert.equal(s.world.locations.find(p => p.id === 'home').status, 'destroyed');
    if (ending === 'dominion') assert.equal(s.campaign.facts.compulsoryCovenant, true);
    if (ending === 'renew') assert.equal(s.campaign.facts.withdrawalRights, true);
  }
});

test('town sacrifice evacuates actual households, closes services, keeps references and routes, and persists into the ending', () => {
  const s = fixture(), ids = s.world.locations.map(p => p.id);
  play(s, { gate: 'evacuate', pledge: 'shatter', prepare: 'evacuate' });
  const brook = s.world.locations.find(p => p.id === 'brook'), home = s.world.locations.find(p => p.id === 'home');
  assert.equal(brook.status, 'destroyed'); assert.equal(brook.servicesAvailable, false);
  assert.equal(home.status, 'destroyed'); assert.equal(home.servicesAvailable, false);
  assert.deepEqual(brook.services, []); assert.deepEqual(home.services, []);
  assert.equal(s.life.people.find(p => p.id === 'kin').locationId, 'camp');
  assert.equal(s.life.home.tier, 'lodgings'); assert.equal(s.campaign.facts.missingHouseholds, false);
  assert.deepEqual(s.world.locations.map(p => p.id), ids);
  assert.ok(findRoute(s.world, 'home', 'camp').length);
  assert.ok(s.campaign.ending.summary.includes(brook.name));
  assert.ok(s.world.changes.some(c => c.locationId === 'home' && c.text.includes('safety')));
});

test('a preservation path keeps inhabited settlements and changes the covenant institutions', () => {
  const s = fixture(); play(s);
  assert.ok(s.world.locations.every(p => p.status !== 'destroyed' && p.status !== 'evacuated'));
  assert.equal(s.campaign.facts.publicConsent, true);
  assert.equal(s.campaign.facts.compulsoryCovenant, undefined);
  assert.equal(s.life.home.tier, 'cottage');
});

test('returning sidequest allies materially change final preparation and stop repeat rewards or memories', () => {
  const s = fixture(), ctx = play(s, {}, 'gate');
  side(s, ctx, 'ferry', 'repair');
  const before = structuredClone(s.campaign.sidequests.ferry);
  assert.equal(applyCampaignAction(s, 'quest_side_ferry', ctx), false);
  assert.deepEqual(s.campaign.sidequests.ferry, before);
  play(s, {}, 'council');
  side(s, ctx, 'carpenter', 'fair');
  play(s, { pledge: 'shatter', prepare: 'refuge' });
  assert.equal(s.campaign.facts.evacuationReady, true, 'the repaired ferries return as evacuation transport');
  assert.equal(s.campaign.facts.wardsReady, true, 'the carpenter returns with a reinforcing crew');
  assert.equal(s.world.locations.find(p => p.id === 'home').status, 'scarred', 'an ally can preserve buildings during a rupture');
});

test('the watchtower side expedition becomes a warning system only after its terminal discovery', () => {
  const s = fixture(), ctx = play(s, {}, 'inquiry');
  side(s, ctx, 'watchtower');
  assert.equal(s.campaign.sidequests.watchtower.status, 'completed');
  assert.equal(s.campaign.facts.signalReady, true);
  assert.equal(s.campaign.facts.evacuationReady, true);
});

test('private disclosure gives a named friend knowledge without informing companions or factions', () => {
  const s = fixture(), ctx = play(s, {}, 'inquiry');
  s.hero.condition = { type: 'lycanthrope', control: 40 };
  side(s, ctx, 'confidant', 'condition');
  assert.deepEqual(s.life.people.filter(p => p.knownFacts.includes('lycanthrope')).map(p => p.id), ['fellow']);
  assert.equal(s.companions[0].memories.some(m => m.includes('lycanthrope')), false);
});

test('research sponsorship creates a fulfillable promise without surrendering knowledge', () => {
  const s = fixture(), ctx = play(s, {}, 'letter');
  begin(s, ctx); choose(s, ctx, 'academy');
  const obligation = s.obligations.find(o => o.id === 'covenant_notes');
  assert.equal(obligation.dueDay, s.day + 30);
  s.locationId = 'city';
  assert.ok(campaignActions(s).some(a => a.id === 'quest_return_notes'));
  assert.equal(applyCampaignAction(s, 'quest_return_notes', ctx), true);
  assert.equal(obligation.resolved, true); assert.equal(s.campaign.facts.originalNotesReturned, true);
});

test('a final battle must actually be won; retreat or defeat permits a different approach', () => {
  const s = fixture(), ctx = play(s, { pledge: 'dominion' }, 'final');
  begin(s, ctx); choose(s, ctx, 'fight');
  assert.equal(s.battle.id, 'covenant_guardian'); assert.equal(s.campaign.ending, null);
  const battleContext = s.battle.context; s.battle = null;
  afterCampaignBattle(s, battleContext, 'defeat', ctx);
  assert.equal(s.campaign.ending, null); assert.equal(s.campaign.stage, 'final'); assert.equal(s.campaign.pending, null);
  begin(s, ctx); choose(s, ctx, 'fight'); s.battle = null;
  afterCampaignBattle(s, battleContext, 'victory', ctx);
  assert.equal(s.campaign.ending.id, 'dominion'); assert.equal(s.campaign.stage, 'aftermath');
  const worldBefore = structuredClone(s.world), gold = s.hero.gold, journals = s.journal.length;
  afterCampaignBattle(s, battleContext, 'victory', ctx);
  assert.deepEqual(s.world, worldBefore); assert.equal(s.hero.gold, gold); assert.equal(s.journal.length, journals);
});

test('an announced plan can be reconsidered without duplicating completed discoveries', () => {
  const s = fixture(), ctx = play(s, { pledge: 'dominion' }, 'final');
  begin(s, ctx); choose(s, ctx, 'reconsider');
  assert.equal(s.campaign.stage, 'pledge'); assert.ok(s.campaign.completed.includes('descent'));
  assert.ok(!s.campaign.completed.includes('prepare'));
  play(s, { pledge: 'release' });
  assert.equal(s.campaign.ending.id, 'release');
  assert.equal(s.campaign.completed.filter(id => id === 'descent').length, 1);
});

test('a sixteen-year-old cannot volunteer a lifetime or living keeper term', () => {
  const s = fixture('young', 16), ctx = play(s, {}, 'pledge');
  begin(s, ctx);
  assert.ok(!s.event.choices.some(c => c.id === 'keeper'));
  s.event = null;
  assert.equal(applyCampaignChoice(s, 'quest_pledge', 'keeper', ctx), false);
  assert.equal(s.campaign.facts.plannedEnding, undefined);
});

test('living service has an actual withdrawal clause and a playable review', () => {
  const s = fixture(), ctx = play(s, { pledge: 'keeper' });
  assert.equal(s.campaign.facts.keeperActive, true);
  s.day += 365; s.age++;
  assert.ok(campaignActions(s).some(a => a.id === 'quest_keeper_review'));
  assert.equal(applyCampaignAction(s, 'quest_keeper_review', ctx), true);
  choose(s, ctx, 'leave');
  assert.equal(s.campaign.facts.keeperActive, false);
  assert.ok(s.obligations.filter(o => o.id === 'living_keeper_review').every(o => o.resolved));
  assert.equal(s.world.locations.find(p => p.id === 'city').status, 'scarred');
});

test('campaign refusal preserves ordinary life and the exact investigation stage', () => {
  const s = fixture(), ctx = context(s), hero = structuredClone(s.hero);
  assert.ok(!campaignActions(s).some(a=>a.id==='quest_decline'));
  assert.equal(applyCampaignAction(s,'quest_decline',ctx),false);
  s.campaign.facts.declined=true;
  assert.deepEqual(s.hero, hero); assert.equal(s.campaign.stage, 'well');
  assert.deepEqual(campaignActions(s).map(a => a.id), ['quest_resume']);
  assert.equal(applyCampaignAction(s, 'quest_resume', ctx), true);
  assert.ok(campaignActions(s).some(a => a.id === 'quest_begin_well'));
});

test('legacy homecomings bridge once without replaying rewards, changing a pending turn, or inventing childhood memories', () => {
  const s = fixture(); delete s.campaign;
  s.timeline.mode = 'legacy'; s.flags = { villageSaved: true, remedyMethod: 'ancestral', soulBound: true, publicNecromancy: false, researchReturned: true };
  s.event = { id: 'old-homecoming' }; s.battle = { turn: 4 }; s.journal.push({ text: 'An old record' });
  const before = structuredClone(s);
  initializeCampaign(s, { migration: true });
  assert.equal(s.campaign.stage, 'ledger'); assert.equal(s.campaign.completed.length, 4);
  assert.equal(s.campaign.facts.coercedTestimony, true); assert.equal(s.campaign.facts.publicAccount, 'quiet');
  assert.deepEqual(s.hero, before.hero); assert.deepEqual(s.event, before.event); assert.deepEqual(s.battle, before.battle); assert.deepEqual(s.journal, before.journal);
  onCampaignAge(s, context(s));
  assert.deepEqual(s.campaign.ageClues, []); assert.deepEqual(s.journal, before.journal);
});

test('campaign aftermath returns in future years and a ruined town is never silently restored', () => {
  const s = fixture(), ctx = play(s, { pledge: 'shatter', prepare: 'evacuate' });
  s.day += 365; s.age++;
  onCampaignAge(s, ctx); onCampaignAge(s, ctx);
  assert.equal(s.campaign.followups.length, 1);
  applyCampaignAction(s, 'quest_followup', ctx);
  assert.ok(s.event.body.includes(s.world.locations.find(p => p.id === 'home').name));
  choose(s, ctx, 'help');
  assert.equal(s.campaign.followups.length, 0);
  assert.equal(s.world.locations.find(p => p.id === 'home').status, 'destroyed');
});

test('campaign validators reject forged or malformed nested story state without throwing', () => {
  const base = fixture();
  for (const modify of [s => s.campaign.fate = 'constructor', s => s.campaign.completed.push('unknown'), s => s.campaign.completed.push('well', 'well'), s => s.campaign.pending = { questId: 'well', dungeonId: 'covenant_core' }, s => s.campaign.decisions.push(null), s => s.campaign.facts.impossible = Infinity, s => s.campaign.ending = { id: 'constructor', title: 'x', summary: 'x', day: 0 }, s => s.campaign.ageClues.push(8), s => s.campaign.sidequests.fake = { status: 'completed', choice: 'x', day: 0 }]) {
    const s = structuredClone(base); modify(s);
    assert.equal(validateCampaign(s.campaign, s), false);
  }
  assert.ok(Object.keys(campaignEventIds()).length >= 25);
});

test('completed heirs inherit real consequences without replaying the original childhood omen',()=>{
  const s=fixture('inherited-compact'),ctx=play(s),ending=structuredClone(s.campaign.ending),world=structuredClone(s.world),birthDay=s.day+137;
  s.timeline={mode:'birth',birthDay,contentVersion:6};s.campaign={...s.campaign,facts:{inheritedResolution:true,keeperActive:false},ageClues:[],followups:[],lastFollowupAge:0};
  const before=s.journal.length;
  for(const age of [4,10,15]){s.age=age;s.day=birthDay+age*365;onCampaignAge(s,ctx);}
  assert.deepEqual(s.campaign.ageClues,[]);assert.ok(!Object.keys(s.campaign.facts).some(k=>/^clue/.test(k)));assert.equal(s.journal.length,before);assert.deepEqual(s.campaign.ending,ending);assert.deepEqual(s.world,world);
  const view=campaignView(s);assert.equal(view.fateLabel,'A remembered family history');assert.match(view.summary,/earlier generation/);assert.ok(!view.summary.includes('Your birth omen'));
  assert.equal(campaignActions(s).length,0,'a fifteen-year-old heir retains the actual exploration age gate');
});

test('heirs hear a past keeper commitment as family history, never as their own service review',()=>{
  const s=fixture('inherited-keeper'),ctx=play(s,{pledge:'keeper'}),ending=structuredClone(s.campaign.ending),world=structuredClone(s.world),birthDay=s.day+91;
  s.timeline={mode:'birth',birthDay,contentVersion:6};s.age=16;s.day=birthDay+16*365;s.campaign={...s.campaign,facts:{inheritedResolution:true,keeperActive:false},ageClues:[],followups:[],lastFollowupAge:15};
  onCampaignAge(s,ctx);assert.deepEqual(s.campaign.followups,['followup-16']);assert.ok(!campaignActions(s).some(a=>a.id==='quest_keeper_review'));
  assert.equal(applyCampaignAction(s,'quest_followup',ctx),true);assert.match(s.event.body,/has not been transferred to you/);assert.ok(!s.event.body.includes('Your service review comes due'));
  choose(s,ctx,'record');assert.deepEqual(s.campaign.ending,ending);assert.deepEqual(s.world,world);assert.equal(s.campaign.facts.keeperActive,false);assert.equal(validateCampaign(s.campaign,s),true);
});

test('offset birth ages gate the original campaign while old-content clue behavior stays unchanged',()=>{
  const s=fixture('offset-unresolved',0),ctx=context(s);s.timeline={mode:'birth',birthDay:40*365+137,contentVersion:6};s.day=s.timeline.birthDay+3*365;s.age=3;
  onCampaignAge(s,ctx);assert.deepEqual(s.campaign.ageClues,[]);assert.deepEqual(campaignActions(s),[]);
  s.day=s.timeline.birthDay+4*365;s.age=4;onCampaignAge(s,ctx);assert.deepEqual(s.campaign.ageClues,[4]);
  const old=fixture('old-pending-fate',15);old.timeline.contentVersion=4;old.campaign.facts.inheritedResolution=true;onCampaignAge(old,context(old));assert.deepEqual(old.campaign.ageClues,[4,10,15]);
});
