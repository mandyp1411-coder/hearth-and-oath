// One ordinary life, before the engines spread: the field, two people, a
// private purpose, and what the next hand inherits. Born in v0.71 onward.
import { seededRoll, generatePersonName } from './world.js';
import { seasonOf } from './living-world.js';
import { personalityImpact, personalityImpactText, shiftNature } from './personality.js';
import { addStationTie } from './station.js';
import { SCENES_BY_ID } from './content/scene.js';
import { AMBITIONS_BY_ID } from './content/ambition.js';
import { DIALOGUES_BY_ID } from './content/dialogue.js';

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const int = (n, lo = 0, hi = 10000000) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const word = (v, max = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const AMBITIONS = ['farm_keep', 'farm_freedom', 'farm_fed', 'farm_sea', 'farm_love', 'farm_peace'];
const EVENTS = Object.freeze({
  farm_ambition: ['keep', 'freedom', 'fed', 'sea', 'love', 'peace', 'continue'],
  farm_sow: ['barley', 'beans', 'fallow', 'continue'],
  farm_harvest: ['store', 'sell', 'split', 'continue'],
  farm_due: ['pay', 'grain', 'plead', 'refuse', 'continue'],
  farm_reckoning: ['pay', 'neighbour', 'bond', 'continue'],
  farm_blight: ['neighbour', 'ration', 'sell', 'continue'],
  farm_boundary: ['witness', 'night', 'give', 'continue'],
  farm_boundary_turn: ['confess', 'deny', 'mend', 'continue'],
  farm_neighbour: ['listen', 'help', 'ask', 'continue'],
  farm_neighbour_reply: ['accept', 'refuse', 'continue'],
  farm_spouse: ['listen', 'promise', 'dismiss', 'continue'],
  farm_spouse_reply: ['keep', 'release', 'continue'],
});
export const FARM_EVENTS = { ids: () => clone(EVENTS) };
const active = s => !!s.farm && s.age >= (s.farm.openingAge || 16) && s.phase !== 'retired';
// A named home can be a woodland clearing or an upland hearth. Its field
// does not disappear because the settlement service list calls it a forest.
const here = s => s.locationId === s.farm?.homeId;
const person = (s, r) => !r ? null : r.source === 'keeper' ? s.realm?.sites?.[r.id]?.keeper : r.source === 'lineage' ? s.lineage?.people?.find(p => p.id === r.id) : r.source === 'life'
  ? s.life?.people?.find(p => p.id === r.id)
  : [...(s.society?.people || []), ...(s.society?.archive || [])].find(p => p.id === r.id);
const alive = (s, r) => !!person(s, r) && person(s, r).alive !== false;
const free = s => !s.event && !s.battle && !s.conversations?.pending && !s.timeline?.journey && !s.justice?.prison && !s.delve && !s.maze && !s.dungeon && !s.adventuring?.expedition && !s.rpg?.expedition && !s.careers?.batch;
const actorRef = p => p ? { source: p.source, id: p.id, name: p.name } : null;
const chapterAt = s => s.age < 20 ? 1 : Math.floor(s.age / 10);
const owed = f => f.due.amount + f.due.arrears;
const annualDue = f => f.tenure === 'owned' ? 80 : f.tenure === 'tenant' ? 40 : 8;
const dueOutstanding = f => f.due.deferredUntil !== null || f.threads.some(t => !t.closed && ['due', 'reckoning'].includes(t.def));
const saying = (s, text) => String(text || '').replaceAll('{hero.name}', s.hero.name);
const distress = (s, n) => { if (s.life) s.life.stress = clamp((s.life.stress || 0) + n); };
const say = (s, title, text, ctx = {}, kind = 'farm', names = []) => {
  const f = s.farm; if (!f) return;
  f.history.push({ day: s.day, age: s.age, title, text, people: [...new Set(names)].slice(0, 3), kind });
  if (f.history.length > 160) {
    // Repeated harvests yield space before a first purpose, a death, or a
    // decision that changed the land. A long life must keep its early turns.
    const at = f.history.findIndex((h, i) => i > 0 && !['ambition', 'defeat', 'plan', 'inheritance', 'promise'].includes(h.kind));
    f.history.splice(at >= 0 ? at : 1, 1);
  }
  (ctx.journalLiteral || ctx.journal)?.(title, text, 'farm');
};
function affect(s, model, by, memory) {
  if (!model) return;
  model.opinion = clamp(model.opinion + by, -100, 100);
  model.memories.push(memory); model.memories = model.memories.slice(-3);
  const p = person(s, model);
  if (p?.memories && !p.memories.includes(memory)) { p.memories.push(memory); p.memories = p.memories.slice(-60); }
}
function borrow(s, helper, amount) {
  const f = s.farm, existing = f.loans.find(l => l.source === helper.source && l.id === helper.id);
  if (existing) existing.amount += amount;
  else f.loans.push({ ...clone(helper), amount });
  f.neighbourDebt += amount; f.creditor = actorRef(f.loans[0]);
}
function makeMind(s, p, source, role) {
  const salt = `farm:mind:${source}:${p.id}`;
  return { source, id: p.id, name: p.name, role,
    want: role === 'spouse' ? 'Keep a full winter chest, and a place in your decisions.' : 'Drain the lower ditch without yielding the boundary.',
    opinion: 0, voice: role === 'spouse' ? 'warm' : 'blunt',
    traits: role === 'spouse' ? ['content', 'honest'] : ['diligent', seededRoll(s.seed, salt, 2) ? 'greedy' : 'cautious'],
    memories: [], metDay: s.day };
}
function cast(s) {
  const f = s.farm; if (!f || s.age < 16) return;
  if (!f.people.neighbour || !alive(s, f.people.neighbour)) {
    const exclude = new Set([s.life?.partnerId, f.people.neighbour?.id]);
    const p = (s.society?.people || []).find(p => p.alive !== false && p.locationId === f.homeId && !exclude.has(p.id) && p.age >= 16);
    const q = p || (s.life?.people || []).find(p => p.alive !== false && !p.familyRole && !exclude.has(p.id) && p.age >= 16 && (!p.locationId || p.locationId === f.homeId));
    if (q) f.people.neighbour = makeMind(s, q, p ? 'society' : 'life', 'neighbour');
  }
  const p = (s.life?.people || []).find(p => p.id === s.life.partnerId && p.alive !== false);
  if (p && f.people.spouse?.id !== p.id) f.people.spouse = makeMind(s, p, 'life', 'spouse');
  if (!p && f.people.spouse) {
    for (const oath of f.promises.filter(o => o.personId === f.people.spouse.id && o.status === 'open')) {
      oath.status = 'released'; oath.endedDay = s.day;
    }
    // A former spouse stays in the story, but is no longer offered as a spouse.
    f.people.spouse = null;
  }
}
function roles(s) {
  const f = s.farm;
  const neighbour = actorRef(f.people.neighbour), spouse = actorRef(f.people.spouse);
  const relative = (s.life?.people || []).find(p => p.alive !== false && p.age >= 18 && (p.familyRole || p.id === s.life.partnerId));
  const keeper = s.realm?.sites?.[f.homeId]?.keeper;
  return { neighbour, spouse, helper: alive(s, neighbour) ? neighbour : relative ? { source: 'life', id: relative.id, name: relative.name } : keeper ? { source: 'keeper', id: f.homeId, name: keeper.name } : null,
    reeve: { name: f.reeve.name }, lord: { name: f.lord.name } };
}
function open(s, def, data = {}, suppliedRoles = null) {
  const f = s.farm;
  if (!f || f.threads.some(t => !t.closed && t.def === def)) return null;
  while (f.threads.length >= 20) { const at = f.threads.findIndex(t => t.closed); if (at < 0) return null; f.threads.splice(at, 1); }
  const t = { id: `fm-${++f.counters.threads}`, def, roles: suppliedRoles || roles(s), season: seasonOf(s.day), stage: 'open', choice: null, followUp: null, memory: [], closed: false, data };
  f.threads.push(t); return t;
}
function updateAmbition(s, ctx = {}) {
  const f = s.farm, a = f?.ambition; if (!a || a.fulfilledDay !== null) return;
  const children = s.life?.children || [];
  const yes = a.id === 'farm_keep' ? f.harvests >= 3 && f.field.status === 'held'
    : a.id === 'farm_freedom' ? f.freedomBought && s.hero.station?.freedom === 'free' && !(s.householdBudget?.debt > 0)
    : a.id === 'farm_fed' ? children.length > 0 && children.every(p => p.alive !== false ? p.age >= 16 : Number.isSafeInteger(p.deathDay) && Math.floor((p.deathDay - p.bornDay) / 365) >= 16) && f.wintersFed > 0
    : a.id === 'farm_sea' ? s.world.locations.find(p => p.id === s.locationId)?.type === 'coast'
    : a.id === 'farm_love' ? !!s.life?.partnerId && f.people.spouse?.opinion >= 10 && f.promises.some(p => p.status === 'kept')
    : a.id === 'farm_peace' ? f.plan?.status === 'kept' && f.people.neighbour?.opinion >= 10 && !s.hero.station.ties.some(t => t.kind === 'hates' && t.name === f.people.neighbour.name) : false;
  if (!yes) return;
  a.fulfilledDay = s.day; s.flags[a.id] = true;
  say(s, 'What the life wanted', `${AMBITIONS_BY_ID[a.id]?.title || 'The field kept'}. ${saying(s, AMBITIONS_BY_ID[a.id]?.saying || 'The hands after yours will know.')}`, ctx, 'ambition');
}
export function initializeFarm(s, { born = false, startAge = 16 } = {}) {
  if (!born || s.farm || !['common', 'bound'].includes(s.hero?.station?.id)) return;
  const st = s.hero.station, homeId = s.life?.home?.locationId || s.hero.birthplaceId || s.locationId;
  const lord = st.ties.find(t => /holds the land|holds the family/.test(t.note));
  s.farm = { version: 1, startedDay: s.day, openingAge: Math.max(16, Number.isSafeInteger(startAge) ? startAge : 16), homeId, tenure: st.freedom === 'owned' ? 'owned' : st.id === 'bound' ? 'tenant' : 'freeholder',
    lastSeason: seasonOf(s.day), active: false, ambitionOffered: false, ambition: null, lastAmbitionChapter: -1,
    field: { status: 'held', strips: 1, grain: 0, crop: null, yieldLoss: 0 }, harvests: 0, wintersFed: 0, freedomBought: false, helpSeason: null,
    due: { amount: st.id === 'bound' ? st.freedom === 'owned' ? 80 : 40 : 8, arrears: 0, year: -1, deferredUntil: null },
    people: { neighbour: null, spouse: null },
    lord: { name: lord?.name || generatePersonName(s.seed, `farm:lord:${homeId}`) },
    reeve: { name: generatePersonName(s.seed, `farm:reeve:${homeId}`) },
    plan: null, promises: [], neighbourDebt: 0, creditor: null, loans: [], lastTalk: { neighbour: -1, spouse: -1 },
    counters: { threads: 0 }, threads: [], history: [], inheritance: null };
}
function activate(s) {
  const f = s.farm; if (!active(s)) return;
  cast(s); f.active = true;
  if (!f.ambitionOffered) { f.ambitionOffered = true; open(s, 'ambition'); }
}
function settlePromise(s, season, ctx) {
  const f = s.farm;
  for (const oath of f.promises.filter(o => o.status === 'open' && o.dueSeason <= season)) {
    const spouse = f.people.spouse;
    if (!spouse || oath.personId !== spouse.id || !alive(s, spouse)) { oath.status = 'released'; oath.endedDay = s.day; continue; }
    oath.status = f.field.grain >= 6 ? 'kept' : 'broken'; oath.endedDay = s.day;
    const kept = oath.status === 'kept';
    affect(s, spouse, kept ? 15 : -25, kept ? 'You kept six sacks for the winter as you promised me.' : 'You promised me the winter grain, then left the chest bare.');
    if (!kept) {
      ctx.breakOath?.(`You broke the winter promise to ${spouse.name}.`);
      shiftNature(s, 'oathbreaker', 'A word broken', `You promised winter grain to ${spouse.name}, and the chest stood empty.`, ctx);
    }
    say(s, kept ? 'The winter promise' : 'An empty chest', kept ? `${spouse.name} lifts the chest's lid. Six sacks, as you promised. The look you get is worth the grain.` : `${spouse.name} lifts the chest's lid. You both remember what you said. There is no grain to put beside it.`, ctx, 'promise', [spouse.name]);
  }
}
export function onFarmTime(s, { newDay }, ctx = {}) {
  const f = s.farm; if (!f || s.phase === 'retired') return;
  if (s.age < f.openingAge) { f.lastSeason = seasonOf(newDay); return; }
  activate(s);
  const end = seasonOf(newDay);
  for (let season = f.lastSeason + 1; season <= end; season++) {
    const year = Math.floor(season / 4), which = season % 4;
    if (f.plan?.status === 'open' && f.plan.stage === 2 && f.plan.dueSeason <= season) {
      f.plan.stage = 3; open(s, 'boundary_turn', { method: f.plan.method, discovered: f.plan.discovered }, f.plan.roles);
    }
    for (const t of f.threads) if (!t.closed && t.stage === 'chosen' && t.followUp && t.followUp.season <= season) {
      const next = t.followUp; t.closed = true; open(s, next.scene.replace(/^farm_/, ''), clone(t.data), clone(t.roles));
    }
    if (which === 2 && f.field.status === 'held' && f.field.crop && !f.field.crop.harvested && f.field.crop.kind !== 'fallow') {
      const crop = f.field.crop, roll = seededRoll(s.seed, `farm:harvest:${f.homeId}:${crop.year}:${crop.kind}`, 100);
      const blight = roll < (crop.kind === 'barley' ? 22 : 10);
      const help = f.helpSeason, dueHelp = help !== null && help.season <= season, helper = dueHelp ? person(s, help.person) : null;
      const assisted = !!helper && helper.alive !== false && helper.name === help.person.name && (helper.locationId || f.homeId) === f.homeId;
      const yieldCount = Math.max(1, ((crop.kind === 'barley' ? 12 : 8) + seededRoll(s.seed, `farm:yield:${f.homeId}:${crop.year}:${crop.kind}`, 8) + Math.min(3, Math.floor((s.hero.skills.survival || 0) / 3))) * f.field.strips - f.field.yieldLoss + (assisted ? help.yield : 0));
      if (dueHelp) f.helpSeason = null;
      if (assisted) say(s, 'The work returned', `${help.person.name} comes to the field as agreed. The extra hands bring more of the crop out of the rain.`, ctx, 'people', [help.person.name]);
      crop.harvested = true;
      open(s, blight ? 'blight' : 'harvest', { year: crop.year, yield: blight ? Math.max(2, Math.floor(yieldCount / 4)) : yieldCount, helper: assisted ? clone(help.person) : null });
    }
    if (which === 2 && f.helpSeason?.season <= season) f.helpSeason = null;
    if (which === 3) {
      settlePromise(s, season, ctx);
      if (f.field.grain >= 6) { f.field.grain -= 6; f.wintersFed++; distress(s, -3); }
      else if (f.field.status === 'held' && f.harvests) distress(s, 4);
      if (f.field.status === 'held' && f.due.year < year && f.due.deferredUntil === null) {
        f.due.year = year; f.due.amount = annualDue(f); open(s, 'due', { amount: owed(f), year });
      }
    }
    if (f.due.deferredUntil !== null && f.due.deferredUntil <= season) {
      f.due.deferredUntil = null; open(s, 'reckoning', { amount: owed(f), year });
    }
    // Stores spoil slowly. Idle land gives no crop and no free purse.
    if (which === 0 && f.field.grain > 0) f.field.grain = Math.max(0, f.field.grain - 1);
    f.lastSeason = season;
  }
  updateAmbition(s, ctx);
  // Clock hooks queue turns. Reconciliation offers them only after the
  // command that spent the days has settled, like the guild and church.
}
const action = (id, label, description, days = 0, cost = 0, disabledReason = null) => ({ id, label, description, risk: description, days, cost, group: 'The field', ...(disabledReason ? { disabledReason } : {}) });
export function farmActions(s) {
  const f = s.farm; if (!active(s) || !free(s)) return [];
  const rows = [], atHome = here(s), held = f.field.status === 'held', year = Math.floor(seasonOf(s.day) / 4), season = seasonOf(s.day) % 4;
  if (!f.ambition) rows.push(action('farm_ambition', 'Say what this life is for', 'No days or gold. A private hope; you may change it as life changes.'));
  else if (f.lastAmbitionChapter !== chapterAt(s)) rows.push(action('farm_change_ambition', 'Take up a different hope', 'No days or gold. The old hope stays in the Book. Changing it breaks no promise.'));
  if (!atHome) return rows;
  if (held && season <= 1 && (!f.field.crop || f.field.crop.year < year)) rows.push(action('farm_sow', 'Choose what to sow', 'Up to three days and seed from your purse. Barley risks blight; beans yield less; fallow earns nothing.'));
  if (held && !f.plan && f.people.neighbour && alive(s, f.people.neighbour)) rows.push(action('farm_plan', 'Settle the boundary stone', 'A plan over seasons. Witnesses cost gold; a lantern by night may cost your neighbour.'));
  if (f.people.neighbour && alive(s, f.people.neighbour) && f.lastTalk.neighbour < seasonOf(s.day)) rows.push({ ...action('farm_talk_neighbour', `Talk with ${f.people.neighbour.name} at the ditch`, 'A day. The neighbour wants the lower ditch drained, and has an opinion of your hands.', 1), farmPerson: actorRef(f.people.neighbour) });
  if (f.people.spouse && alive(s, f.people.spouse) && f.lastTalk.spouse < seasonOf(s.day)) rows.push({ ...action('farm_talk_spouse', `Sit with ${f.people.spouse.name} at the chest`, 'A day. Love does not mean approval. A promise made here belongs to another person.', 1), farmPerson: actorRef(f.people.spouse) });
  if (f.neighbourDebt > 0) { const amount = Math.min(8, f.loans[0].amount); rows.push(action('farm_repay', `Take the borrowed gold back to ${f.creditor?.name || 'the neighbour'}`, 'One day. Up to eight gold of the oldest loan returns to the house that paid for you.', 1, amount, s.hero.gold < amount ? 'The purse will not cover it.' : null)); }
  if (!held) rows.push(action('farm_reclaim', f.field.status === 'bonded' ? 'Work the field back from the bond' : 'Buy the strip back', 'Thirty days and sixty gold. The strip returns, but the old quarrel and debts remain.', 30, 60, s.hero.gold < 60 ? 'There is not sixty gold in the purse.' : null));
  if (held && f.tenure !== 'freeholder') {
    const cost = 120 + Math.max(0, s.householdBudget?.debt || 0);
    rows.push(action('farm_buy_freedom', 'Buy free of the lord', `${cost} gold and two days. The family bond and household debt end; the common grazing still has its due.`, 2, cost, s.hero.gold < cost ? 'The lord will want the whole price.' : null));
  }
  return rows;
}
export function applyFarmGates(s, actions) {
  // A field is not a calling: holding it does not lock the life out of work,
  // learning, love, travel or another path.
  return actions;
}
export function applyFarmAction(s, id, ctx = {}) {
  const f = s.farm; if (!active(s) || !id.startsWith('farm_')) return false;
  const key = id.slice(5);
  if (ctx.offeredAction?.days > 0 && Number.isFinite(ctx.actionDays) && ctx.actionDays < ctx.offeredAction.days) return false;
  const offeredPerson = ctx.offeredAction?.farmPerson;
  if (offeredPerson && (!alive(s, offeredPerson) || person(s, offeredPerson)?.name !== offeredPerson.name)) return false;
  if (key === 'ambition' || key === 'change_ambition') open(s, 'ambition', { change: !!f.ambition });
  else if (!here(s)) return false;
  else if (key === 'sow') open(s, 'sow', { year: Math.floor(seasonOf(s.day) / 4) });
  else if (key === 'plan') { f.plan = { kind: 'boundary', stage: 1, status: 'open', since: s.day, dueSeason: seasonOf(s.day), method: null, discovered: false, roles: roles(s) }; open(s, 'boundary'); }
  else if (key === 'talk_neighbour' || key === 'talk_spouse') { const who = key.slice(5); if (offeredPerson && f.people[who]?.id !== offeredPerson.id) return false; f.lastTalk[who] = seasonOf(s.day); cast(s); open(s, who); }
  else if (key === 'repay') { const creditor = f.loans[0], amount = Math.min(8, f.neighbourDebt, creditor.amount); creditor.amount -= amount; f.neighbourDebt -= amount; if (creditor.amount === 0) f.loans.shift(); f.creditor = f.loans.length ? actorRef(f.loans[0]) : null; if (creditor.id === f.people.neighbour?.id) affect(s, f.people.neighbour, 6, 'You brought back what I lent.'); say(s, 'The money returned', `The money goes back to ${creditor.name}'s house. A burden made smaller by your own hands.`, ctx, 'people', [creditor.name]); }
  else if (key === 'reclaim') { f.field.status = 'held'; f.field.strips = 1; f.field.crop = null; f.due.arrears = 0; f.due.deferredUntil = null; say(s, 'A hand on the plough again', 'Thirty days of labour and sixty gold. The strip is yours to work again. The boundary stone is where you left it.', ctx); }
  else if (key === 'buy_freedom') { f.tenure = 'freeholder'; f.freedomBought = true; s.hero.station.freedom = 'free'; if (s.householdBudget) { s.householdBudget.debt = 0; s.householdBudget.bondedUntil = 0; } f.due.amount = 8; f.due.arrears = 0; f.due.deferredUntil = null; for (const t of f.threads.filter(t => !t.closed && ['due', 'reckoning'].includes(t.def))) t.closed = true; if (['farm_due', 'farm_reckoning'].includes(s.event?.id)) s.event = null; say(s, 'The bond bought out', `${f.lord.name} takes the price and cuts the cord around the papers. Your field has a free hand on it now.`, ctx); }
  else return false;
  updateAmbition(s, ctx); return true;
}
function fill(text, s, t) {
  return String(text || '').replace(/\{([a-zA-Z]+)\.([a-zA-Z]+)\}/g, (all, role, field) => {
    const ref = role === 'hero' ? { name: s.hero.name, source: 'hero', id: 'hero' } : t.roles[role];
    const p = role === 'hero' ? s.hero : person(s, ref), pronouns = p?.pronouns || 'they/them';
    const he = pronouns === 'he/him', she = pronouns === 'she/her';
    return field === 'name' ? ref?.name || (role === 'neighbour' ? 'the neighbour' : role === 'spouse' ? 'your spouse' : `the ${role}`)
      : ({ they: he ? 'he' : she ? 'she' : 'they', them: he ? 'him' : she ? 'her' : 'them', their: he ? 'his' : she ? 'her' : 'their', theirs: he ? 'his' : she ? 'hers' : 'theirs', home: 'the village', trade: 'the field', honorific: '' })[field] ?? all;
  });
}
function costOf(s, t, pick) {
  if (t.data.work && t.data.work.remaining > 0) return pick === 'continue' ? { gold: 0, days: 0 } : { gold: 0, days: t.data.work.remaining };
  const src = sceneFor(s, t)?.choices.find(c => c.id === pick), base = src?.cost || {};
  let gold = base.gold || 0, days = base.days || 0;
  if (t.def === 'due' && pick === 'pay' || t.def === 'reckoning' && pick === 'pay') gold = t.data.amount;
  return { gold, days };
}
function sceneFor(s, t) {
  if (t.def === 'ambition') return SCENES_BY_ID[s.farm.tenure === 'freeholder' ? 'farm_ambition' : 'farm_bound_ambition'];
  if (t.def === 'boundary_turn') return SCENES_BY_ID[t.data.method === 'witness' ? 'farm_boundary_witness' : t.data.discovered ? 'farm_boundary_turn' : 'farm_boundary_hidden'];
  if (t.def === 'spouse_reply' && !s.farm.promises.some(o => o.status === 'open' && o.personId === t.roles.spouse?.id)) return SCENES_BY_ID.farm_spouse_heard;
  if (['blight', 'reckoning'].includes(t.def) && t.roles.helper && t.roles.helper.id !== t.roles.neighbour?.id) return SCENES_BY_ID[`farm_${t.def}_${t.roles.helper.source === 'keeper' ? 'keeper' : 'kin'}`];
  return SCENES_BY_ID[`farm_${t.def}`];
}
function choicesFor(s, t) {
  const f = s.farm, src = sceneFor(s, t); if (!src) return [];
  if (t.data.work && t.data.work.remaining > 0) {
    const w = t.data.work, choice = src.choices.find(c => c.id === w.pick);
    return [{ id: w.pick, label: `Continue: ${fill(choice.label, s, t)}`, days: w.remaining, cost: 0,
      risk: fill(choice.risk, s, t), description: `${w.remaining} day${w.remaining === 1 ? '' : 's'} still to work · no more gold · ${w.gold ? `${w.gold} gold already paid. ` : ''}${fill(choice.risk, s, t)}` },
    { id: 'continue', label: 'Leave the work unfinished', days: 0, cost: 0, risk: 'The days and money already spent do not return. The work earns nothing.', description: 'No more days or gold · the days and money already spent do not return. The work earns nothing.' }];
  }
  return src.choices.filter(c => {
    if (t.def === 'ambition') {
      if (c.id === 'freedom' && f.tenure === 'freeholder') return false;
      // A sixteen-year-old can hope for children not yet born. Fulfilling
      // that hope still requires raising real children through the years.
      if (c.id === 'sea' && (s.world.locations.find(p => p.id === f.homeId)?.type === 'coast' || s.world.locations.find(p => p.id === s.locationId)?.type === 'coast')) return false;
      if (c.id === 'love' && s.life.partnerId) return false;
    }
    if (['blight', 'reckoning'].includes(t.def) && c.id === 'neighbour' && (!t.roles.helper || !alive(s, t.roles.helper) || f.neighbourDebt + (t.data.amount || 8) > 10000)) return false;
    return true;
  }).map(c => {
    const cost = costOf(s, t, c.id);
    let risk = fill(c.risk || 'The day takes its course.', s, t);
    const nature = personalityImpact(s, { kind: 'choice', eventId: `farm_${t.def}`, id: c.id, intentTags: c.tags });
    const contrary = nature.impacts.filter(i => i.delta > 0).map(i => i.name.toLowerCase());
    if (contrary.length) risk += ` This goes against your ${contrary.join(' and ')} nature.`;
    const grain = t.def === 'due' && c.id === 'grain' ? Math.ceil(t.data.amount / 4) : 0;
    const label = fill(c.label, s, t), line = [cost.days ? `${cost.days} day${cost.days === 1 ? '' : 's'}` : 'No days', cost.gold ? `${cost.gold} gold` : 'no gold', grain ? `${grain} sacks` : '', risk].filter(Boolean).join(' · ');
    const reason = cost.gold > s.hero.gold ? 'The purse will not cover it.' : grain > f.field.grain ? 'There is not enough grain in the chest.' : null;
    return { id: c.id, label, description: line, risk, days: cost.days, cost: cost.gold, ...(nature.impacts.length ? { detail: personalityImpactText(s, { kind: 'choice', eventId: `farm_${t.def}`, id: c.id, intentTags: c.tags }) } : {}), ...(c.tags ? { intentTags: [...c.tags] } : {}), ...(reason ? { disabledReason: reason } : {}) };
  });
}
export function flushFarmEvent(s, ctx = {}) {
  const f = s.farm; if (!active(s)) return false;
  activate(s); updateAmbition(s, ctx);
  if (!free(s)) return false;
  for (const t of f.threads.filter(t => !t.closed && t.stage === 'open')) {
    if (t.data.work?.running) continue;
    if (['neighbour', 'neighbour_reply', 'boundary', 'boundary_turn'].includes(t.def) && !alive(s, t.roles.neighbour) || ['spouse', 'spouse_reply'].includes(t.def) && (!alive(s, t.roles.spouse) || s.life.partnerId !== t.roles.spouse?.id)) { t.closed = true; if (f.plan?.status === 'open' && t.def.startsWith('boundary')) f.plan.status = 'failed'; continue; }
    const src = sceneFor(s, t); if (!src) { t.closed = true; continue; }
    let body = fill(src.text, s, t);
    if (t.def === 'harvest') body += ` There are ${t.data.yield} sacks to bring in.`;
    if (['due', 'reckoning'].includes(t.def)) body += ` ${t.data.amount} gold, or its worth in grain, stands against the field.`;
    if (t.def === 'neighbour' || t.def === 'spouse') {
      const who = f.people[t.def], dialogue = DIALOGUES_BY_ID[`farm_${t.def}_voice`];
      if (who && dialogue?.lines.length) body += ` “${fill(dialogue.lines[seededRoll(s.seed, `farm:voice:${t.def}:${t.season}:${who.id}`, dialogue.lines.length)].text, s, { ...t, roles: { ...t.roles, speaker: actorRef(who) } })}”`;
    }
    ctx.setEvent?.(`farm_${t.def}`, fill(src.title, s, t), 'The field', body, choicesFor(s, t));
    return true;
  }
  return false;
}
function gainCrop(s, t, pick, ctx) {
  const f = s.farm, n = t.data.yield || 0;
  if (pick === 'continue') { say(s, 'The crop left standing', 'The stalks bow and split. By the time another hand comes, the field has fed the birds.', ctx); return; }
  const stored = pick === 'store' ? n : pick === 'split' ? Math.ceil(n / 2) : 0;
  const sold = n - stored;
  f.field.grain = Math.min(1000, f.field.grain + stored); s.hero.gold += sold * 4; f.harvests++;
  if (s.hero.skills.survival < 12) s.hero.skills.survival++;
  affect(s, f.people.spouse, stored >= 6 ? 6 : -5, stored >= 6 ? 'You kept a winter in the chest before taking the cart to market.' : 'You sold the grain before asking what we would eat.');
  say(s, 'The harvest brought in', `${stored ? `${stored} sacks in the chest` : 'No sacks kept for winter'}${sold ? `, ${sold * 4} gold from the market` : ''}. ${t.data.helper ? `${t.data.helper.name} helped with the cutting. ` : ''}The field is stubble now.`, ctx, 'harvest', [t.data.helper?.name, f.people.spouse?.name].filter(Boolean));
}
export function applyFarmChoice(s, eventId, pick, ctx = {}) {
  const f = s.farm; if (!active(s) || !EVENTS[eventId]?.includes(pick)) return false;
  const t = f.threads.find(t => !t.closed && t.stage === 'open' && `farm_${t.def}` === eventId);
  // performEventOption authenticates the offered scene and clears s.event
  // before dispatch. The open thread is the subsystem's commitment proof.
  if (!t) return false;
  const offer = choicesFor(s, t).find(c => c.id === pick); if (!offer || offer.disabledReason) return false;
  const src = sceneFor(s, t)?.choices.find(c => c.id === pick), cost = costOf(s, t, pick);
  s.event = null;
  if (t.data.work && t.data.work.remaining > 0 && pick === 'continue') {
    t.choice = pick; t.stage = 'chosen'; t.closed = true;
    say(s, 'The work left unfinished', `${t.data.work.days - t.data.work.remaining} days worked${t.data.work.gold ? ` and ${t.data.work.gold} gold spent` : ''}. You put the work down. It has earned no harvest and no promise of another person's hands.`, ctx);
    return true;
  }
  s.hero.gold -= cost.gold;
  if (cost.days) {
    const w = t.data.work || (t.data.work = { pick, days: cost.days, gold: cost.gold, remaining: cost.days, startedDay: s.day, completedDay: null });
    const began = s.day; w.running = true;
    ctx.spendDays?.(w.remaining);
    delete w.running;
    w.remaining = Math.max(0, w.remaining - Math.max(0, s.day - began));
    if (w.remaining === 0) w.completedDay = s.day;
    if (s.phase === 'retired') { t.choice = pick; t.stage = 'chosen'; t.closed = true; return true; }
    if (w.remaining > 0) return true;
    w.completedDay = s.day;
  }
  t.choice = pick; t.stage = 'chosen'; t.closed = true;
  if (s.phase === 'retired') return true;
  const actorKind = t.def.startsWith('spouse') ? 'spouse' : t.def.startsWith('neighbour') || t.def.startsWith('boundary') ? 'neighbour' : null;
  if (actorKind && (!alive(s, t.roles[actorKind]) || f.people[actorKind]?.id !== t.roles[actorKind].id)) {
    if (f.plan?.status === 'open' && actorKind === 'neighbour' && t.def.startsWith('boundary')) f.plan.status = 'failed';
    say(s, 'A place left empty', `${t.roles[actorKind].name} is no longer there to finish the matter. The days you spent are still a part of the life.`, ctx, 'people', [t.roles[actorKind].name]);
    return true;
  }
  if (t.def === 'ambition') {
    if (pick !== 'continue') {
      const id = `farm_${pick}`;
      const turns = f.ambition ? [...f.ambition.turns, { day: s.day, id: f.ambition.id }].slice(-12) : [];
      f.ambition = { id, chosenDay: s.day, fulfilledDay: null, turns };
      f.lastAmbitionChapter = chapterAt(s);
      say(s, 'What the life is for', `${AMBITIONS_BY_ID[id].title}. ${f.ambition.turns.length ? 'The old hope is still a part of the life; it no longer leads it.' : 'You say it to yourself before the others wake.'}`, ctx, 'ambition');
    }
  } else if (t.def === 'sow') {
    if (pick !== 'continue') { f.field.crop = { kind: pick, year: t.data.year, sownDay: s.day, harvested: pick === 'fallow' }; say(s, 'What went into the earth', fill(src.result, s, t), ctx); }
  } else if (t.def === 'harvest') gainCrop(s, t, pick, ctx);
  else if (t.def === 'blight') {
    gainCrop(s, t, 'store', ctx);
    if (pick === 'neighbour') { f.field.grain = Math.min(1000, f.field.grain + 6); borrow(s, t.roles.helper, 8); const p = person(s, t.roles.helper); if (p?.bond !== undefined) p.bond = clamp(p.bond - 3); if (t.roles.helper.id === f.people.neighbour?.id) affect(s, f.people.neighbour, 3, 'I took six sacks from my own winter to keep you through yours.'); addStationTie(s, { kind: 'owes', name: t.roles.helper.name, note: 'lent grain from the winter chest' }); }
    else if (pick === 'ration') { distress(s, 6); s.life.health = clamp(s.life.health - 4); }
    else if (pick === 'sell') { const n = Math.min(2, f.field.grain); f.field.grain -= n; s.hero.gold += n * 4; }
    else distress(s, 10);
    say(s, 'After the blight', fill(src.result, s, t), ctx, 'defeat', [f.people.neighbour?.name].filter(Boolean));
  } else if (t.def === 'due') {
    if (pick === 'pay' || pick === 'grain') {
      if (pick === 'grain') f.field.grain -= Math.ceil(t.data.amount / 4);
      f.due.arrears = 0; f.due.deferredUntil = null;
    } else { f.due.arrears = Math.min(400, f.due.arrears + (pick === 'plead' ? 4 : 8)); f.due.deferredUntil = seasonOf(s.day) + 1; distress(s, pick === 'plead' ? 4 : 8); }
    say(s, 'The lord\'s due', fill(src.result, s, t), ctx);
  } else if (t.def === 'reckoning') {
    if (pick === 'pay') { f.due.arrears = 0; f.due.deferredUntil = null; }
    else if (pick === 'neighbour') { borrow(s, t.roles.helper, t.data.amount); f.due.arrears = 0; if (t.roles.helper.id === f.people.neighbour?.id) affect(s, f.people.neighbour, -8, 'I paid the reeve with the money for my own roof.'); addStationTie(s, { kind: 'owes', name: t.roles.helper.name, note: 'paid the reeve from the roof money' }); }
    else { f.field.status = pick === 'bond' ? 'bonded' : 'lost'; f.field.crop = null; f.field.grain = 0; f.due.arrears = 0; f.due.deferredUntil = null; distress(s, 12); }
    say(s, 'What the field cost', fill(src.result, s, t), ctx, 'defeat', [f.people.neighbour?.name].filter(Boolean));
  } else if (t.def === 'boundary') {
    const p = f.plan;
    if (pick === 'witness' || pick === 'night') { p.method = pick; p.stage = 2; p.dueSeason = seasonOf(s.day) + 1; p.discovered = pick === 'night' && seededRoll(s.seed, `farm:boundary:${p.since}:${f.homeId}`, 100) < 65; }
    else { p.stage = 3; p.status = pick === 'give' ? 'kept' : 'failed'; if (pick === 'give') { f.field.yieldLoss = Math.min(6, f.field.yieldLoss + 2); affect(s, f.people.neighbour, 12, 'You yielded the disputed furrow instead of making an enemy.'); } }
    say(s, 'The boundary stone', fill(src.result, s, t), ctx, 'plan', [t.roles.neighbour.name]);
  } else if (t.def === 'boundary_turn') {
    const p = f.plan;
    if (p) {
      p.stage = 3; p.status = pick === 'deny' || pick === 'continue' ? 'failed' : 'kept';
      if (p.method === 'witness') { p.status = pick === 'deny' ? 'failed' : 'kept'; affect(s, f.people.neighbour, pick === 'deny' ? -12 : pick === 'mend' ? 12 : 4, pick === 'deny' ? 'You called witnesses, then refused their line.' : 'You accepted the line the witnesses found.'); if (p.status === 'kept') f.field.strips = Math.min(3, f.field.strips + 1); }
      else if (p.discovered) { affect(s, f.people.neighbour, pick === 'mend' ? 0 : pick === 'confess' ? -8 : -25, pick === 'deny' ? 'I saw your lantern on the line, and heard you deny it.' : 'You moved the stone by night. I know whose hands.'); if (pick === 'deny') addStationTie(s, { kind: 'hates', name: t.roles.neighbour.name, note: 'saw the lantern by the boundary stone' }); }
      else { if (pick === 'confess' || pick === 'mend') affect(s, f.people.neighbour, 4, 'You told me what you had done before I found it.'); if (pick !== 'confess') { f.field.strips = Math.min(3, f.field.strips + 1); p.status = 'kept'; } }
    }
    const words = fill(src.result, s, t);
    say(s, 'The line after yours', words, ctx, 'plan', [t.roles.neighbour.name]);
  } else if (t.def === 'neighbour') {
    if (pick === 'help') { affect(s, f.people.neighbour, 12, 'You put your hands in the ditch beside mine.'); const p = person(s, f.people.neighbour); if (p) p.bond = clamp(p.bond + 4); }
    else if (pick === 'ask') affect(s, f.people.neighbour, -2, 'You asked after my ox before asking after me.');
    if (pick !== 'continue') open(s, 'neighbour_reply', { first: pick }, clone(t.roles));
    say(s, 'By the lower ditch', fill(src.result, s, t), ctx, 'people', [t.roles.neighbour.name]);
  } else if (t.def === 'neighbour_reply') {
    if (pick === 'accept') { const season = seasonOf(s.day); f.helpSeason = { season: season + ((2 - season % 4 + 4) % 4 || 4), person: clone(t.roles.neighbour), agreedDay: s.day, yield: 3 }; }
    affect(s, f.people.neighbour, pick === 'accept' ? 5 : pick === 'refuse' ? -3 : 0, pick === 'accept' ? 'You heard what I wanted, and gave me a straight answer.' : 'You left me to decide what your silence meant.');
    say(s, 'What the neighbour wanted', fill(src.result, s, t), ctx, 'people', [t.roles.neighbour.name]);
  } else if (t.def === 'spouse') {
    if (pick === 'promise' && !f.promises.some(p => p.status === 'open' && p.personId === t.roles.spouse.id)) {
      const season = seasonOf(s.day), winter = season + ((3 - season % 4 + 4) % 4 || 4);
      f.promises.push({ id: `winter-${s.day}-${f.promises.length}`, personId: t.roles.spouse.id, name: t.roles.spouse.name, text: 'Keep six sacks for the winter chest.', since: s.day, dueSeason: winter, status: 'open', endedDay: null });
      if (f.promises.length > 16) f.promises.splice(f.promises.findIndex(p => p.status !== 'open'), 1);
    }
    if (pick !== 'continue') affect(s, f.people.spouse, pick === 'dismiss' ? -15 : 4, pick === 'dismiss' ? 'You spoke over me at our own hearth.' : 'You sat down and let me finish.');
    if (pick !== 'continue') open(s, 'spouse_reply', { first: pick }, clone(t.roles));
    say(s, 'At the winter chest', fill(src.result, s, t), ctx, 'people', [t.roles.spouse.name]);
  } else if (t.def === 'spouse_reply') {
    if (pick === 'release') for (const oath of f.promises.filter(p => p.status === 'open' && p.personId === t.roles.spouse.id)) { oath.status = 'released'; oath.endedDay = s.day; }
    if (pick === 'keep') affect(s, f.people.spouse, 4, 'You let my fear have a place at the table.');
    say(s, 'The word between you', fill(src.result, s, t), ctx, 'people', [t.roles.spouse.name]);
  }
  t.memory.push(fill(src?.result || 'The day went on.', s, t));
  updateAmbition(s, ctx); return true;
}
export function inheritFarm(old, s) {
  if (!old.farm) { delete s.farm; return; }
  const p = old.farm; delete s.farm;
  // The field can pass to an heir who rose to another station; the deed,
  // debt and remembered people are still the family's, not a rolled past.
  const inheritedStation = s.hero.station;
  if (!inheritedStation) return;
  if (!['common', 'bound'].includes(inheritedStation.id)) {
    s.hero.station = { ...inheritedStation, id: 'common' }; initializeFarm(s, { born: true }); s.hero.station = inheritedStation;
  } else initializeFarm(s, { born: true });
  const f = s.farm; if (!f) return;
  f.homeId = p.homeId; f.tenure = p.tenure;
  f.field = { status: p.field.status, strips: p.field.strips, grain: p.field.grain, crop: null, yieldLoss: p.field.yieldLoss };
  f.neighbourDebt = p.neighbourDebt;
  f.loans = p.loans.map(loan => {
    if (loan.source !== 'life') return clone(loan);
    // The heir's peer slots are new people. A loan stays with the actual
    // lender, including a dead relative whose life now belongs to the tree.
    const before = person(old, loan), record = old.lineage?.people.find(r => r.source === 'life' && r.localId === loan.id && r.name === loan.name);
    const bornDay = before?.bornDay ?? record?.bornDay;
    const wasAlive = record?.alive ?? before?.alive;
    const same = actual => actual?.name === loan.name && (!Number.isSafeInteger(bornDay) || actual.bornDay === bornDay) && (typeof wasAlive !== 'boolean' || (actual.alive !== false) === wasAlive);
    const local = s.life?.people.find(same);
    if (local) return { ...clone(loan), id: local.id };
    const world = [...(s.society?.people || []), ...(s.society?.archive || [])].find(same);
    if (world) return { ...clone(loan), source: 'society', id: world.id };
    if (record && s.lineage?.people.some(actual => actual.id === record.id && same(actual))) return { ...clone(loan), source: 'lineage', id: record.id };
    return clone(loan);
  });
  f.loans = f.loans.reduce((loans, loan) => { const existing = loans.find(l => l.source === loan.source && l.id === loan.id); if (existing) existing.amount += loan.amount; else loans.push(loan); return loans; }, []);
  f.creditor = f.loans.length ? actorRef(f.loans[0]) : null;
  f.due = { ...clone(p.due), year: Math.floor(seasonOf(s.day) / 4), deferredUntil: dueOutstanding(p) ? seasonOf(s.day) + 1 : null };
  f.lord = clone(p.lord); f.reeve = clone(p.reeve); f.freedomBought = p.freedomBought;
  const a = p.ambition, definition = a && AMBITIONS_BY_ID[a.id];
  const feud = p.people.neighbour?.opinion < -10 ? `${p.people.neighbour.name} remembers the boundary as a wrong.` : null;
  const priorNeighbour = p.people.neighbour;
  let inheritedNeighbour = priorNeighbour ? clone(priorNeighbour) : null;
  if (inheritedNeighbour && person(s, inheritedNeighbour)?.name !== inheritedNeighbour.name) {
    // Local life IDs are reused for the heir's own peers. The world record
    // retains the old neighbour as a particular person, never as that slot.
    const before = person(old, priorNeighbour), actual = [...(s.society?.people || []), ...(s.society?.archive || [])].find(p => p.name === priorNeighbour.name && (!Number.isSafeInteger(before?.bornDay) || p.bornDay === before.bornDay));
    inheritedNeighbour = actual ? { ...inheritedNeighbour, source: 'society', id: actual.id } : null;
  }
  if (inheritedNeighbour && person(s, inheritedNeighbour)?.name === inheritedNeighbour.name) {
    f.people.neighbour = inheritedNeighbour;
    f.people.neighbour.opinion = Math.trunc(p.people.neighbour.opinion / 2);
    f.people.neighbour.memories = [`Your parent, ${old.hero.name}: ${p.people.neighbour.memories.at(-1) || 'we worked adjoining fields.'}`];
    f.people.neighbour.metDay = s.day;
    if (feud) addStationTie(s, { kind: 'hates', name: p.people.neighbour.name, note: `remembers ${old.hero.name}'s boundary quarrel` });
  }
  const shame = p.promises.filter(o => o.status === 'broken').map(o => `${o.name} was promised winter grain, and got an empty chest.`).join(' ');
  f.inheritance = { parentName: old.hero.name, saying: a?.fulfilledDay !== null && a ? saying(old, definition?.saying) || null : null,
    ambition: a && a.fulfilledDay === null ? a.id : null, field: p.field.status, debt: p.neighbourDebt + (dueOutstanding(p) ? owed(p) : 0),
    feud, story: [p.people.spouse ? `${p.people.spouse.name} said of ${old.hero.name}: ${p.people.spouse.memories.at(-1) || 'the hands kept the house going.'}` : '', shame].filter(Boolean).join(' ') || 'The land and its burdens have passed to another hand.' };
  f.history.push({ day: s.day, age: s.age, title: 'What came before your hands', text: `${old.hero.name} left ${p.field.status === 'held' ? 'a field to work' : 'the memory of a field lost'}. ${f.inheritance.saying || ''} ${f.inheritance.feud || ''} ${f.inheritance.story}`.trim(), people: [old.hero.name], kind: 'inheritance' });
}
export function farmView(s) {
  const f = s.farm; if (!f || s.age < f.openingAge && !f.inheritance) return null;
  const a = f.ambition, definition = a && AMBITIONS_BY_ID[a.id];
  const groups = new Map();
  for (const h of f.history) { const band = h.age < 20 ? 'The first furrows' : h.age < 40 ? 'The working years' : h.age < 60 ? 'The hands remembered' : 'The last light'; if (!groups.has(band)) groups.set(band, []); groups.get(band).push(h); }
  const chapters = [...groups].map(([title, entries]) => {
    const selected = entries.filter((h, i) => i === 0 || i === entries.length - 1 || ['ambition', 'defeat', 'plan', 'inheritance', 'promise'].includes(h.kind)).slice(0, 9);
    const size = Math.max(1, Math.ceil(selected.length / 3)), paragraphs = [];
    for (let i = 0; i < selected.length; i += size) paragraphs.push(selected.slice(i, i + size).map(h => h.text).join(' '));
    return { title, paragraphs };
  });
  if (!chapters.length) chapters.push({ title: 'The first furrows', paragraphs: ['The field waits. What goes into it, and what comes back to the house, is still yours to choose.'] });
  if (s.phase === 'retired' && a) chapters.push({ title: 'What the life was for', paragraphs: [`${definition?.title || 'The field'}. ${a.fulfilledDay === null ? 'The hope outlived the hands that held it.' : saying(s, definition?.saying) || 'The life kept what it set out to keep.'}`, ...f.promises.map(o => `${o.name}: ${o.status === 'kept' ? 'the winter promise kept' : o.status === 'broken' ? 'a winter promise broken' : o.status === 'released' ? 'released from the winter promise' : 'the winter promise still open'}.`)] });
  return { title: 'The field and the hearth', tenure: f.tenure,
    summary: f.field.status === 'held' ? `${f.field.strips === 1 ? 'One strip' : `${f.field.strips} strips`} at ${s.world.locations.find(p => p.id === f.homeId)?.name || f.homeId}. ${f.field.grain} sacks in the chest. ${f.tenure === 'freeholder' ? 'A free hand, and the common grazing due.' : `The land is ${f.lord.name}'s; the harvest is yours to risk.`}` : f.field.status === 'bonded' ? 'The field is under the bond. Labour and a price can put your hands on it again.' : 'The field is gone. The road back has a price, and the neighbours remember.',
    field: clone(f.field), ambition: a ? { id: a.id, title: definition?.title || a.id, text: a.fulfilledDay === null ? 'A hope held for yourself. It may change without shame.' : saying(s, definition?.saying) || 'The hope was kept.', fulfilled: a.fulfilledDay !== null } : null,
    people: Object.entries(f.people).filter(([, r]) => r && alive(s, r)).map(([role, r]) => ({ id: r.id, name: r.name, role, want: r.want, opinion: r.opinion, bond: person(s, r)?.bond || 0, memories: [...r.memories], voice: r.voice })),
    chapters, plan: f.plan ? { title: 'The boundary stone', text: f.plan.status === 'open' ? f.plan.stage === 1 ? 'The line waits for your hand.' : f.plan.stage === 2 ? 'A season must pass before the line answers.' : 'The neighbour has come to the line.' : f.plan.status === 'kept' ? 'A line your children will inherit.' : 'A line that left something between the houses.', stage: f.plan.stage } : null,
    inheritance: f.inheritance ? clone(f.inheritance) : null, promises: clone(f.promises), season: SEASONS[seasonOf(s.day) % 4] };
}
export function validateFarm(f, s) {
  if (f === undefined) return true;
  if (!f || f.version !== 1 || !s.hero?.station || !['common', 'bound'].includes(s.hero.station.id) && f.inheritance === null || !int(f.startedDay) || f.startedDay > s.day || !int(f.openingAge, 16, 5000) || !word(f.homeId, 80) || !s.world?.locations.some(p => p.id === f.homeId) || !['freeholder', 'tenant', 'owned'].includes(f.tenure) || !int(f.lastSeason) || f.lastSeason > seasonOf(s.day) || typeof f.active !== 'boolean' || typeof f.ambitionOffered !== 'boolean' || !int(f.lastAmbitionChapter, -1, 1000)) return false;
  if (!f.field || !['held', 'bonded', 'lost'].includes(f.field.status) || !int(f.field.strips, 1, 3) || !int(f.field.grain, 0, 1000) || !int(f.field.yieldLoss, 0, 6) || !int(f.harvests) || !int(f.wintersFed) || typeof f.freedomBought !== 'boolean' || !int(f.neighbourDebt, 0, 10000)) return false;
  const help = f.helpSeason;
  if (!(help === null || help && int(help.season) && int(help.agreedDay) && help.agreedDay <= s.day && help.yield === 3 && help.person && ['life', 'society'].includes(help.person.source) && word(help.person.id, 100) && word(help.person.name, 80) && person(s, help.person)?.name === help.person.name)) return false;
  if (!(f.creditor === null || f.creditor && ['life', 'society', 'keeper', 'lineage'].includes(f.creditor.source) && word(f.creditor.id, 180) && word(f.creditor.name, 80)) || f.neighbourDebt > 0 && f.creditor === null) return false;
  if (!Array.isArray(f.loans) || f.loans.length > 64 || !f.loans.every(l => l && ['life', 'society', 'keeper', 'lineage'].includes(l.source) && word(l.id, 180) && word(l.name, 80) && int(l.amount, 1, 10000) && (l.source === 'keeper' || !person(s, l) || person(s, l).name === l.name) && (l.source !== 'lineage' || person(s, l))) || f.loans.reduce((sum, l) => sum + l.amount, 0) !== f.neighbourDebt || new Set(f.loans.map(l => `${l.source}:${l.id}`)).size !== f.loans.length || (f.loans.length ? f.creditor?.source !== f.loans[0].source || f.creditor?.id !== f.loans[0].id || f.creditor?.name !== f.loans[0].name : f.creditor !== null)) return false;
  const crop = f.field.crop; if (crop !== null && (!crop || !['barley', 'beans', 'fallow'].includes(crop.kind) || !int(crop.year) || !int(crop.sownDay) || crop.sownDay > s.day || typeof crop.harvested !== 'boolean')) return false;
  if (!f.due || !int(f.due.amount, 0, 1000) || !int(f.due.arrears, 0, 400) || !int(f.due.year, -1) || !(f.due.deferredUntil === null || int(f.due.deferredUntil))) return false;
  if (!f.lord || !word(f.lord.name, 80) || !f.reeve || !word(f.reeve.name, 80) || !f.people || Object.keys(f.people).sort().join(',') !== 'neighbour,spouse') return false;
  for (const [role, r] of Object.entries(f.people)) if (r !== null && (!r || !['life', 'society'].includes(r.source) || !word(r.id, 100) || !word(r.name, 80) || r.role !== role || !word(r.want, 300) || !int(r.opinion, -100, 100) || !['warm', 'blunt'].includes(r.voice) || !Array.isArray(r.traits) || r.traits.length !== 2 || !r.traits.every(t => ['content', 'honest', 'diligent', 'greedy', 'cautious'].includes(t)) || !Array.isArray(r.memories) || r.memories.length > 3 || !r.memories.every(x => word(x, 300)) || !int(r.metDay) || r.metDay > s.day || !person(s, r))) return false;
  if (f.ambition !== null && (!f.ambition || !AMBITIONS.includes(f.ambition.id) || !int(f.ambition.chosenDay) || f.ambition.chosenDay > s.day || !(f.ambition.fulfilledDay === null || int(f.ambition.fulfilledDay) && f.ambition.fulfilledDay <= s.day && f.ambition.fulfilledDay >= f.ambition.chosenDay) || !Array.isArray(f.ambition.turns) || f.ambition.turns.length > 12 || !f.ambition.turns.every(t => AMBITIONS.includes(t.id) && int(t.day) && t.day <= s.day))) return false;
  if (!f.lastTalk || !['neighbour', 'spouse'].every(k => int(f.lastTalk[k], -1) && f.lastTalk[k] <= seasonOf(s.day))) return false;
  if (!Array.isArray(f.promises) || f.promises.length > 16 || new Set(f.promises.map(o => o.id)).size !== f.promises.length || !f.promises.every(o => o && word(o.id, 100) && word(o.personId, 100) && word(o.name, 80) && word(o.text, 300) && int(o.since) && o.since <= s.day && int(o.dueSeason) && ['open', 'kept', 'broken', 'released'].includes(o.status) && (o.status === 'open' ? o.endedDay === null : int(o.endedDay) && o.endedDay >= o.since && o.endedDay <= s.day))) return false;
  if (f.plan !== null && (!f.plan || f.plan.kind !== 'boundary' || !int(f.plan.stage, 1, 3) || !['open', 'kept', 'failed'].includes(f.plan.status) || !int(f.plan.since) || f.plan.since > s.day || !int(f.plan.dueSeason) || ![null, 'witness', 'night'].includes(f.plan.method) || typeof f.plan.discovered !== 'boolean' || !f.plan.roles?.neighbour || !word(f.plan.roles.neighbour.name, 80))) return false;
  if (!f.counters || !int(f.counters.threads) || !Array.isArray(f.threads) || f.threads.length > 20 || new Set(f.threads.map(t => t.id)).size !== f.threads.length) return false;
  for (const t of f.threads) {
    if (!t || !/^fm-[1-9][0-9]*$/.test(t.id) || Number(t.id.slice(3)) > f.counters.threads || !EVENTS[`farm_${t.def}`] || !int(t.season) || t.season > seasonOf(s.day) || !['open', 'chosen'].includes(t.stage) || typeof t.closed !== 'boolean' || (t.stage === 'open' ? t.choice !== null : !EVENTS[`farm_${t.def}`].includes(t.choice)) || !Array.isArray(t.memory) || t.memory.length > 3 || !t.memory.every(x => word(x)) || !t.roles || !t.roles.lord || !t.roles.reeve || !word(t.roles.lord.name, 80) || !word(t.roles.reeve.name, 80) || !t.data || typeof t.data !== 'object' || Array.isArray(t.data)) return false;
    if (['due', 'reckoning'].includes(t.def) && !int(t.data.amount, 0, 1000) || ['harvest', 'blight'].includes(t.def) && !int(t.data.yield, 1, 1000) || t.def === 'sow' && !int(t.data.year)) return false;
    if (['harvest', 'blight'].includes(t.def) && t.data.helper !== undefined && t.data.helper !== null && (!['life', 'society'].includes(t.data.helper.source) || !word(t.data.helper.id, 100) || !word(t.data.helper.name, 80) || person(s, t.data.helper)?.name !== t.data.helper.name)) return false;
    if (t.data.work !== undefined) {
      const w = t.data.work;
      const terms = sceneFor(s, t)?.choices.find(c => c.id === w?.pick)?.cost;
      if (!w || !EVENTS[`farm_${t.def}`].includes(w.pick) || w.pick === 'continue' || !int(w.days, 1, 120) || w.days !== terms?.days || w.gold !== (terms?.gold || 0) || !int(w.gold, 0, 10000) || !int(w.remaining, 0, w.days) || !int(w.startedDay) || w.startedDay > s.day || (w.remaining === 0 ? !int(w.completedDay) || w.completedDay < w.startedDay || w.completedDay > s.day : w.completedDay !== null) || w.running !== undefined || w.remaining > 0 && t.stage !== 'open' && t.choice !== 'continue' && s.phase !== 'retired') return false;
    }
    if (t.followUp !== null && (!t.followUp || !EVENTS[t.followUp.scene] || !int(t.followUp.season))) return false;
    for (const k of ['neighbour', 'spouse']) if (t.roles[k] !== null && t.roles[k] !== undefined && (!['life', 'society'].includes(t.roles[k].source) || !word(t.roles[k].id, 100) || !word(t.roles[k].name, 80))) return false;
    if (!t.closed && ['neighbour', 'neighbour_reply', 'boundary', 'boundary_turn'].includes(t.def) && !t.roles.neighbour || !t.closed && ['spouse', 'spouse_reply'].includes(t.def) && !t.roles.spouse) return false;
  }
  if (!Array.isArray(f.history) || f.history.length > 160 || !f.history.every(h => h && int(h.day) && h.day <= s.day && int(h.age, 0, 5000) && word(h.title, 160) && word(h.text) && word(h.kind, 30) && Array.isArray(h.people) && h.people.length <= 3 && h.people.every(p => word(p, 80)))) return false;
  if (f.inheritance !== null && (!f.inheritance || !word(f.inheritance.parentName, 80) || !(f.inheritance.saying === null || word(f.inheritance.saying)) || !(f.inheritance.ambition === null || AMBITIONS.includes(f.inheritance.ambition)) || !['held', 'bonded', 'lost'].includes(f.inheritance.field) || !int(f.inheritance.debt, 0, 11400) || !(f.inheritance.feud === null || word(f.inheritance.feud)) || !word(f.inheritance.story))) return false;
  return true;
}
