// The living world: stories happen everywhere, and reach you through your own
// people. Actors (courts, guilds, the wolves in the hills) hold goals and
// advance them every season whether or not the player is looking. When goals
// cross, something happens: a war, a strike, a raid, a purge, a levy. Events
// spread across the map, mark the places they touch, and look for a route to
// someone the player knows; if they find none they stay background, a line of
// news. The route is a thread: a scene with roles filled by people who already
// exist in the life, a choice, and a memory that comes back later.
//
// New-edition lives only (`hero.station`). The realm's own yearly tick keeps
// its rulers, merchants and prosperity; this module writes into it (a war the
// courts began, security and prosperity where an event sits) and reads it.
import { seededRoll, isSettlement } from './world.js';
import { REGION_TEMPLATES } from './realm-content-v18.js';
import { hasNature, shiftNature } from './personality.js';
import { startRegionalWar } from './regional-world-v33.js';

const edition = s => !!s?.hero?.station;
export const SEASON_DAYS = 92;
export const seasonOf = day => Math.floor(day / SEASON_DAYS);
const WINTER = 3;
export const NEIGHBOURS = Object.freeze({ rainward: ['bellwater', 'saltreach', 'highstone', 'blackgrove', 'ashplain'], bellwater: ['rainward', 'highstone', 'blackgrove'], saltreach: ['rainward', 'highstone', 'ashplain'], highstone: ['rainward', 'bellwater', 'saltreach'], blackgrove: ['rainward', 'bellwater', 'ashplain'], ashplain: ['rainward', 'saltreach', 'blackgrove'] });
const GUILD_CRAFTS = Object.freeze(['blacksmith', 'merchant', 'miner']);
const CRAFT_PROFESSION = Object.freeze({ blacksmith: 'Blacksmith', merchant: 'Merchant', miner: 'Miner' });
const PURGE_TARGETS = Object.freeze(['tiefling', 'tiefling', 'goblin', 'orc', 'beastfolk', 'elf', 'dwarf', 'halfling']);
const ANCESTRY_WORD = Object.freeze({ tiefling: 'the horned', goblin: 'the goblin-born', orc: 'the orc-born', beastfolk: 'the beastfolk', elf: 'the elven', dwarf: 'the dwarven', halfling: 'the halfling', human: 'the human' });
const LIMITS = Object.freeze({ actors: 14, events: 12, threads: 12, news: 24 });

// The house convention: 'continue' is always the choice that lets the world take its course.
export const LIVING_EVENTS = { ids: () => ({ living_conscription: ['pay', 'go', 'continue'], living_strike: ['continue', 'work', 'mediate'], living_wolves: ['hunt', 'pay', 'continue'], living_purge: ['shelter', 'denounce', 'send', 'continue'] }) };

const regionName = id => REGION_TEMPLATES.find(r => r.id === id)?.name || id;
const neighboursOf = (s, regionId) => { const borders = s.realm?.politics?.borders; if (Array.isArray(borders) && borders.length) { const rows = borders.filter(b => b.includes(regionId)).map(b => b[0] === regionId ? b[1] : b[0]); if (rows.length) return rows; } return NEIGHBOURS[regionId] || []; };
const placeName = (s, id) => s.world.locations.find(p => p.id === id)?.name || id;
const regionOf = (s, siteId) => s.realm?.sites?.[siteId]?.regionId || null;
const sitesIn = (s, regionId, settled = true) => Object.values(s.realm?.sites || {}).filter(x => x.regionId === regionId && (!settled || isSettlement(s.world, x.id))).map(x => x.id);
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const note = (ctx, title, text, tag = 'world') => (ctx?.journalLiteral || ctx?.journal)?.(title, text, tag);
const homeOf = s => s.life?.home?.locationId || s.hero.birthplaceId || 'home';

// ---------------------------------------------------------------------------
// Actors and their goals.
function newGoal(s, actor, season) {
  const roll = n => seededRoll(s.seed, `goal:${actor.id}:${season}`, n);
  if (actor.kind === 'court') {
    // A court's goal takes years. A war every decade or so somewhere on the map; a purge is rarer than a tithe.
    const kind = ['reclaim', 'levy', 'purge', 'build', 'levy', 'build'][roll(6)];
    const neighbours = neighboursOf(s, actor.regionId);
    if (kind === 'reclaim') { const regionId = neighbours[seededRoll(s.seed, `goal:target:${actor.id}:${season}`, Math.max(1, neighbours.length))] || null, sites = sitesIn(s, regionId); return { kind, target: sites[seededRoll(s.seed, `goal:site:${actor.id}:${season}`, Math.max(1, sites.length))] || null, regionId, progress: 0, pace: 2 + roll(3) }; }
    if (kind === 'purge') return { kind, target: PURGE_TARGETS[seededRoll(s.seed, `goal:anc:${actor.id}:${season}`, PURGE_TARGETS.length)], progress: 0, pace: 1 + roll(3) };
    if (kind === 'levy') return { kind, target: null, progress: 0, pace: 4 + roll(4) };
    const sites = sitesIn(s, actor.regionId); return { kind: 'build', target: sites[seededRoll(s.seed, `goal:site:${actor.id}:${season}`, Math.max(1, sites.length))] || null, progress: 0, pace: 3 + roll(4) };
  }
  if (actor.kind === 'guild') {
    // A guild's reach is the whole map: the contract it wants may be in any town, and a strike follows it there.
    const kind = ['contract', 'monopoly', 'contract'][roll(3)];
    const sites = Object.values(s.realm?.sites || {}).filter(x => isSettlement(s.world, x.id)).map(x => x.id);
    return { kind, target: kind === 'contract' ? sites[seededRoll(s.seed, `goal:site:${actor.id}:${season}`, Math.max(1, sites.length))] || null : actor.craft, progress: 0, pace: 3 + roll(4) };
  }
  return { kind: 'descend', target: null, progress: 0, pace: 1 + roll(2) }; // the wolves: slow, until a hard winter
}
export function initializeLivingWorld(s) {
  if (!edition(s) || !s.realm || s.living) return;
  const season = seasonOf(s.day), actors = [];
  for (const region of s.realm.regions) actors.push({ id: `court:${region.id}`, kind: 'court', regionId: region.id, name: `the ${region.regime} of ${regionName(region.id)}`, goal: null });
  const guildRegions = s.realm.regions.filter(r => sitesIn(s, r.id).some(id => ['city', 'citadel', 'tower'].includes(s.world.locations.find(p => p.id === id)?.type)));
  GUILD_CRAFTS.forEach((craft, i) => { const region = (guildRegions.length ? guildRegions : s.realm.regions)[i % Math.max(1, guildRegions.length || s.realm.regions.length)]; actors.push({ id: `guild:${craft}`, kind: 'guild', craft, regionId: region.id, name: `the ${craft === 'merchant' ? 'merchants’' : craft + 's’'} guild of ${regionName(region.id)}`, goal: null }); });
  for (const regionId of ['highstone', 'blackgrove']) if (s.realm.regions.some(r => r.id === regionId)) actors.push({ id: `beasts:${regionId}`, kind: 'beasts', regionId, name: `the wolves of ${regionName(regionId)}`, goal: null });
  for (const a of actors) a.goal = newGoal(s, a, season);
  s.living = { version: 1, lastSeason: season, actors: actors.slice(0, LIMITS.actors), events: [], threads: [], news: [], counters: { events: 0, threads: 0 } };
}
export const living = s => s.living || null;

// ---------------------------------------------------------------------------
// Events: what a finished goal becomes, and what it does to the places it touches.
function pushNews(s, season, text, eventId = null) { const l = living(s); l.news.push({ season, text, eventId }); if (l.news.length > LIMITS.news) l.news.splice(0, l.news.length - LIMITS.news); }
function spawnEvent(s, season, fields) {
  const l = living(s); l.counters.events++;
  const ev = { id: `ev-${l.counters.events}`, startSeason: season, routed: false, siteIds: [], ...fields };
  l.events.push(ev); if (l.events.length > LIMITS.events) { const gone = l.events.findIndex(e => e.endSeason <= season); l.events.splice(gone >= 0 ? gone : 0, 1); }
  return ev;
}
/** A court that has its claim ready goes to war through the regional world, which keeps the front, the deployments and the settlement. */
function warEvent(s, season, actor, goal) {
  const r = s.realm, a = actor.regionId, b = goal.regionId; if (!b || b === a) return null;
  if (r.wars.some(w => w.status === 'active' && [w.a, w.b].includes(a))) return null;
  const cause = ['border', 'resource', 'succession', 'faith'][seededRoll(s.seed, `cause:${actor.id}:${season}`, 4)];
  const war = startRegionalWar(s, a, b, s.day, cause);
  if (!war) return null;
  return spawnEvent(s, season, { kind: 'war', regionId: a, against: b, siteIds: [...sitesIn(s, a), ...sitesIn(s, b)], endSeason: season + 12, warId: war.id, text: `${regionName(a)} has gone to war with ${regionName(b)} over ${placeName(s, goal.target)}. ${war.grievance} The roads are full of carts going the other way.` });
}
function resolveGoal(s, season, actor, ctx) {
  const g = actor.goal, l = living(s); let ev = null;
  switch (`${actor.kind}:${g.kind}`) {
    case 'court:reclaim': ev = warEvent(s, season, actor, g); break;
    case 'court:levy': { const war = s.realm.wars.some(w => w.status === 'active' && [w.a, w.b].includes(actor.regionId)); ev = spawnEvent(s, season, { kind: 'levy', regionId: actor.regionId, siteIds: sitesIn(s, actor.regionId), endSeason: season + 1, intensity: war ? 2 : 1, text: `${actor.name[0].toUpperCase()}${actor.name.slice(1)} raises ${war ? 'a war levy' : 'a tithe'} on every hearth in ${regionName(actor.regionId)}.` }); break; }
    case 'court:purge': { ev = spawnEvent(s, season, { kind: 'purge', regionId: actor.regionId, target: g.target, siteIds: sitesIn(s, actor.regionId), endSeason: season + 4, spreadAt: season + 2, text: `${actor.name[0].toUpperCase()}${actor.name.slice(1)} has turned on ${ANCESTRY_WORD[g.target] || g.target}: their doors are marked and their goods are forfeit in ${regionName(actor.regionId)}.` }); break; }
    case 'court:build': { const site = s.realm.sites[g.target]; if (site) { site.prosperity = clamp(site.prosperity + 6); ev = spawnEvent(s, season, { kind: 'works', regionId: actor.regionId, siteIds: [g.target], endSeason: season + 1, text: `${actor.name[0].toUpperCase()}${actor.name.slice(1)} raises a new hall at ${placeName(s, g.target)}; there is work for anyone with hands.` }); } break; }
    case 'guild:contract': {
      // The contract goes to the guild, or to outsiders over the guild's head; then the guild downs tools where the contract was.
      const where = regionOf(s, g.target) || actor.regionId, rival = l.actors.find(a => a.kind === 'guild' && a !== actor && a.goal?.kind === 'contract' && a.goal.target === g.target && a.goal.progress >= 40);
      const refused = rival || seededRoll(s.seed, `contract:${actor.id}:${season}`, 100) < 45;
      if (refused) { ev = spawnEvent(s, season, { kind: 'strike', regionId: where, craft: actor.craft, siteIds: sitesIn(s, where), endSeason: season + 2, text: rival ? `${actor.name[0].toUpperCase()}${actor.name.slice(1)} lost the ${placeName(s, g.target)} contract to ${rival.name} and has downed tools. Nothing of that trade is made or sold in ${regionName(where)} until it is settled.` : `The ${placeName(s, g.target)} contract went to outsiders over the head of ${actor.name}, and the guild has downed tools. Nothing of that trade is made or sold in ${regionName(where)} until it is settled.` }); if (rival) rival.goal = newGoal(s, rival, season); }
      else ev = spawnEvent(s, season, { kind: 'works', regionId: where, siteIds: [g.target].filter(Boolean), endSeason: season + 1, text: `${actor.name[0].toUpperCase()}${actor.name.slice(1)} has the ${placeName(s, g.target)} contract, and hires.` });
      break;
    }
    case 'guild:monopoly': ev = spawnEvent(s, season, { kind: 'monopoly', regionId: actor.regionId, craft: actor.craft, siteIds: sitesIn(s, actor.regionId), endSeason: season + 8, text: `${actor.name[0].toUpperCase()}${actor.name.slice(1)} has its monopoly: no one works the trade in ${regionName(actor.regionId)} without the guild’s mark, and the prices say so.` }); break;
    case 'beasts:descend': { // the pack comes down into its own valleys or the next ones over
      const regions = [actor.regionId, ...neighboursOf(s, actor.regionId)], villages = regions.flatMap(id => sitesIn(s, id)).filter(id => s.world.locations.find(p => p.id === id)?.type === 'village'), pool = villages.length ? villages : sitesIn(s, actor.regionId);
      const target = pool[seededRoll(s.seed, `raid:${actor.id}:${season}`, Math.max(1, pool.length))];
      if (target) ev = spawnEvent(s, season, { kind: 'raid', regionId: regionOf(s, target) || actor.regionId, siteIds: [target], endSeason: season + 1, text: `The wolves have come down out of ${regionName(actor.regionId)} early. Something was taken from ${placeName(s, target)} in the night.` });
      break; }
    default: break;
  }
  actor.goal = newGoal(s, actor, season);
  return ev;
}
function markEvent(s, ev) {
  for (const id of ev.siteIds) {
    const site = s.realm.sites[id]; if (!site) continue;
    if (ev.kind === 'war') { site.security = clamp(site.security - 3); site.prosperity = clamp(site.prosperity - 2); }
    else if (ev.kind === 'raid') { site.security = clamp(site.security - 8); }
    else if (ev.kind === 'strike') { site.prosperity = clamp(site.prosperity - 4); }
    else if (ev.kind === 'purge') { site.security = clamp(site.security - 4); site.prosperity = clamp(site.prosperity - 2); }
    else if (ev.kind === 'monopoly') { site.prosperity = clamp(site.prosperity - 1); }
  }
}
function spreadEvent(s, season, ev) {
  if (ev.kind === 'purge' && ev.spreadAt === season) { const next = (NEIGHBOURS[ev.regionId] || [])[seededRoll(s.seed, `spread:${ev.id}`, (NEIGHBOURS[ev.regionId] || []).length)]; if (next) { ev.spreadTo = next; ev.siteIds = [...new Set([...ev.siteIds, ...sitesIn(s, next)])]; pushNews(s, season, `The purge has crossed into ${regionName(next)}. ${ANCESTRY_WORD[ev.target][0].toUpperCase()}${ANCESTRY_WORD[ev.target].slice(1)} are leaving by night.`, ev.id); return true; } }
  return false;
}
export function activeEvents(s) { const l = living(s); if (!l) return []; const season = seasonOf(s.day); return l.events.filter(e => e.endSeason > season); }
/** The levy is money, not a decision: every hearth in the region pays. */
function applyLevy(s, ev, ctx) {
  const b = s.householdBudget; if (!b || s.age < 16) return;
  const cost = Math.max(12, Math.round((b.annualCost || 120) * (ev.intensity === 2 ? 0.15 : 0.08)));
  if (s.hero.gold >= cost) s.hero.gold -= cost; else { const owed = cost - s.hero.gold; s.hero.gold = 0; b.debt = (b.debt || 0) + owed; }
  note(ctx, ev.intensity === 2 ? 'The war levy' : 'The tithe', `${cost} gold to the collector at the door, for ${regionName(ev.regionId)}’s ${ev.intensity === 2 ? 'war' : 'treasury'}. He has a list and your name is on it.${s.hero.gold === 0 ? ' What the purse could not pay is written against the house.' : ''}`, 'household');
}

// ---------------------------------------------------------------------------
// Routes: how an event finds someone the player knows.
const peopleOf = s => (s.life?.people || []).filter(p => p.alive !== false);
const presentKin = s => (s.family?.members || []).filter(m => m.availability === 'present' && m.personId && m.relationship !== 'guardian').map(m => ({ m, p: peopleOf(s).find(p => p.id === m.personId) })).filter(x => x.p);
const kinAge = (s, p) => Number.isFinite(p.age) ? p.age : (p.baseAge || 30) + s.age;
function levyKin(s) { return presentKin(s).map(x => x.p).find(p => kinAge(s, p) >= 16 && kinAge(s, p) <= 50) || null; }
function partnerOf(s) { return s.life?.partnerId ? peopleOf(s).find(p => p.id === s.life.partnerId) || null : null; }
function purgeKin(s, ancestry) {
  const own = s.hero.appearance?.ancestry === ancestry;
  const partner = partnerOf(s); if (partner?.appearance?.ancestry === ancestry) return { person: partner, relation: 'partner' };
  const kin = presentKin(s).find(x => x.p.appearance?.ancestry === ancestry); if (kin) return { person: kin.p, relation: kin.m.relationship };
  const child = (s.life?.children || []).find(c => c.appearance?.ancestry === ancestry || own); if (child && own) return { person: { id: child.id, name: child.name }, relation: 'child' };
  return own ? { person: null, relation: 'self' } : null;
}
function neighbourOf(s) {
  const home = homeOf(s);
  return (s.society?.people || []).find(p => p.alive !== false && p.locationId === home) || peopleOf(s).find(p => p.role === 'friend') || peopleOf(s).find(p => p.role === 'rival') || null;
}
function tradeOf(s, craft) {
  const bond = s.education?.schooling?.bond;
  if (s.hero.profession === CRAFT_PROFESSION[craft]) return { how: 'trade' };
  if (bond && !bond.done && !bond.broken && bond.craft === craft) return { how: 'bench', master: bond.master };
  if (s.careers?.active && CRAFT_PROFESSION[craft] === s.hero.profession) return { how: 'commission' };
  return null;
}
function openThread(s, season, ev, def, roles, ctx) {
  const l = living(s); if (l.threads.filter(t => !t.closed).length >= LIMITS.threads) return null;
  l.counters.threads++;
  const t = { id: `th-${l.counters.threads}`, def, eventId: ev.id, roles, season, stage: 'open', choice: null, followUp: null, memory: [], closed: false };
  l.threads.push(t); if (l.threads.length > LIMITS.threads * 2) l.threads.splice(0, 1);
  ev.routed = true; return t;
}
function routeEvent(s, season, ev, ctx) {
  const home = homeOf(s), region = regionOf(s, home), here = regionOf(s, s.locationId);
  const touches = ev.siteIds.includes(home) || ev.regionId === region || ev.regionId === here || ev.spreadTo === region;
  if (ev.kind === 'levy') { if (ev.regionId === region) applyLevy(s, ev, ctx); return; }
  if (!touches) { pushNews(s, season, ev.text, ev.id); return; }
  let t = null;
  if (ev.kind === 'war' && s.age >= 8) { const kin = levyKin(s); if (kin) t = openThread(s, season, ev, 'conscription', { kin: { id: kin.id, name: kin.name, relation: presentKin(s).find(x => x.p.id === kin.id)?.m.relationship || 'kin' } }, ctx); }
  else if (ev.kind === 'strike' && s.age >= 14) { const trade = tradeOf(s, ev.craft); if (trade) t = openThread(s, season, ev, 'strike', { craft: ev.craft, how: trade.how, master: trade.master || null }, ctx); }
  else if (ev.kind === 'raid' && ev.siteIds.includes(home) && s.age >= 14) { const n = neighbourOf(s); t = openThread(s, season, ev, 'wolves', { neighbour: n ? { id: n.id, name: n.name } : null }, ctx); }
  else if (ev.kind === 'purge' && s.age >= 12) { const kin = purgeKin(s, ev.target); if (kin) t = openThread(s, season, ev, 'purge', { ancestry: ev.target, kin: kin.person ? { id: kin.person.id, name: kin.person.name, relation: kin.relation } : null, relation: kin.relation }, ctx); }
  if (!t) pushNews(s, season, ev.text, ev.id);
  else note(ctx, 'Word from the road', ev.text, 'world');
}

// ---------------------------------------------------------------------------
// The seasonal tick.
export function onLivingTime(s, { oldDay, newDay }, ctx = {}) {
  const l = living(s); if (!l || s.phase === 'retired' || !s.realm) return;
  const to = seasonOf(newDay);
  for (let season = l.lastSeason + 1; season <= to; season++) {
    // Goals advance. The wolves move fastest when winter comes early.
    const done = [];
    for (const a of l.actors) { const g = a.goal; if (!g) { a.goal = newGoal(s, a, season); continue; } g.progress += g.pace + (a.kind === 'beasts' && season % 4 === WINTER ? 14 : 0) + seededRoll(s.seed, `tick:${a.id}:${season}`, 8); if (g.progress >= 100) done.push(a); }
    const fresh = [];
    for (const a of done) { const ev = resolveGoal(s, season, a, ctx); if (ev) fresh.push(ev); }
    for (const ev of l.events) { if (ev.endSeason <= season) continue; markEvent(s, ev); if (spreadEvent(s, season, ev) && !ev.routed) routeEvent(s, season, ev, ctx); }
    for (const ev of fresh) routeEvent(s, season, ev, ctx);
    for (const ev of l.events) if (ev.kind === 'war' && ev.endSeason > season) { const war = s.realm.wars.find(w => w.id === ev.warId); if (war && war.status !== 'active') { ev.endSeason = season; pushNews(s, season, `${war.status === 'ended' ? `${regionName(war.victor)} keeps the field` : 'A ceasefire'} between ${regionName(ev.regionId)} and ${regionName(ev.against)}. Both sides bury.`, ev.id); } }
    for (const t of l.threads) if (t.followUp && t.followUp.season <= season && !t.closed) followUp(s, season, t, ctx);
    l.lastSeason = season;
  }
  l.events = l.events.filter(e => e.endSeason > to - 8);
}

// ---------------------------------------------------------------------------
// Threads: the scene, the choice, the memory.
export function flushLivingEvent(s, ctx = {}) {
  const l = living(s); if (!l || s.event || s.battle || s.phase === 'retired') return false;
  const t = l.threads.find(t => t.stage === 'open' && !t.closed); if (!t) return false;
  const ev = l.events.find(e => e.id === t.eventId) || {};
  const r = t.roles;
  if (t.def === 'conscription') {
    const fee = Math.max(25, Math.round(s.hero.gold * 0.3));
    ctx.setEvent?.('living_conscription', 'The levy', 'The world', `${regionName(ev.regionId || regionOf(s, homeOf(s)))} is at war and the levy has reached your door. ${r.kin.name}, your ${r.kin.relation}, is called. The sergeant has a list and a cart, and will take ${fee} gold instead, or someone else’s name.`, [
      { id: 'pay', label: `Pay the exemption: ${fee} gold`, description: 'The sergeant takes the gold and crosses out the name. The list is long; he will not come back for this one.', ...(s.hero.gold < fee ? { disabledReason: `You have ${s.hero.gold} gold.` } : {}) },
      ...(s.age >= 16 && s.age <= 50 ? [{ id: 'go', label: `Go in ${r.kin.name}’s place`, description: 'A season with the levy. You come back, probably, and not the same.' }] : []),
      { id: 'continue', label: `Let ${r.kin.name} go`, description: 'The cart leaves at dawn. You will hear, or you will not.' },
    ]); return true;
  }
  if (t.def === 'strike') {
    ctx.setEvent?.('living_strike', 'Tools down', 'The world', `${ev.text || 'The guild has downed tools.'} ${r.how === 'bench' ? `${r.master} has shut the yard and stands with the guild.` : r.how === 'commission' ? 'Your commission cannot be finished while it lasts.' : 'Your trade is the one struck.'} The masters want blacklegs; the strikers want everyone.`, [
      { id: 'continue', label: 'Down tools with them', description: 'No wages while it lasts. The street remembers who stood.' },
      { id: 'work', label: 'Work through it', description: 'The masters pay well for it, and the strikers will know your face for years.' },
      { id: 'mediate', label: 'Carry terms between them', description: 'If you can be believed by both. Persuasion.', ...((s.hero.skills?.persuasion || 0) < 4 ? { disabledReason: 'Neither side would listen to you.' } : {}) },
    ]); return true;
  }
  if (t.def === 'wolves') {
    const who = r.neighbour ? `${r.neighbour.name}’s child` : 'a child from the lower houses';
    ctx.setEvent?.('living_wolves', 'The wolves', 'The world', `The wolves came down early and took ${who} from the edge of ${placeName(s, homeOf(s))}. The village stands in the square with lanterns and asks who will go up the mountain.`, [
      { id: 'hunt', label: 'Go up the mountain', description: 'Survival and weapons, against the pack, in the snow. People remember who went.' },
      { id: 'pay', label: 'Pay for hunters: 30 gold', description: 'Men from the next valley who do this for coin.', ...(s.hero.gold < 30 ? { disabledReason: `You have ${s.hero.gold} gold.` } : {}) },
      { id: 'continue', label: 'Stay by the fire', description: 'Someone else will go, or nobody will, and the wolves will know the way now.' },
    ]); return true;
  }
  if (t.def === 'purge') {
    const kin = r.kin, word = ANCESTRY_WORD[r.ancestry] || r.ancestry;
    ctx.setEvent?.('living_purge', 'The marked door', 'The world', kin ? `${ev.text || 'The court has turned on ' + word + '.'} ${kin.name}, your ${kin.relation}, is ${word.replace(/^the /, '')}. The officers are two streets away with chalk and a list.` : `${ev.text || 'The court has turned on ' + word + '.'} You are ${word.replace(/^the /, '')}. The officers are two streets away with chalk and a list, and your name is on it.`, [
      { id: 'shelter', label: kin ? `Hide ${kin.name}` : 'Hide, and wait it out', description: 'In the cellar, the loft, a cousin’s cart. If it comes out, the law will have you both.' },
      ...(kin ? [{ id: 'denounce', label: `Give the officers ${kin.name}’s name first`, description: 'Before someone else does. The court will remember you kindly; nobody else will.' }] : []),
      { id: 'send', label: kin ? `Send ${kin.name} away tonight` : 'Leave tonight', description: 'The road at night, with what can be carried. Safer than the cellar, if the road is safe.' },
      ...(kin ? [{ id: 'continue', label: 'Keep your door shut, and your mouth', description: `${kin.name} takes their own chances. So does everyone who did nothing.` }] : []),
    ]); return true;
  }
  t.closed = true; return false;
}
export function applyLivingChoice(s, eventId, pick, ctx = {}) {
  const l = living(s); if (!l) return false;
  const t = l.threads.find(t => t.stage === 'open' && !t.closed && `living_${t.def}` === eventId); if (!t) return false;
  const season = seasonOf(s.day), r = t.roles, ev = l.events.find(e => e.id === t.eventId) || {};
  const stress = n => { if (s.life) s.life.stress = clamp((s.life.stress || 0) + n); };
  const bond = (id, n) => { const p = peopleOf(s).find(p => p.id === id); if (p) p.bond = clamp((p.bond || 0) + n); };
  if (s.event?.id === eventId) s.event = null;
  t.choice = pick; t.stage = 'chosen';
  if (t.def === 'conscription') {
    const fee = Math.max(25, Math.round(s.hero.gold * 0.3));
    if (pick === 'pay' && s.hero.gold >= fee) { s.hero.gold -= fee; bond(r.kin.id, 12); t.memory.push(`You paid ${fee} gold to keep ${r.kin.name} out of the levy.`); note(ctx, 'The levy', `${fee} gold and the sergeant crosses out ${r.kin.name}’s name. ${r.kin.name} does not say anything about it, and does not need to.`); t.closed = true; }
    else if (pick === 'go') { stress(14); s.hero.hp = Math.max(1, s.hero.hp - Math.round(s.hero.maxHp * 0.25)); if (Number.isFinite(s.hero.skills?.weapons)) s.hero.skills.weapons += 1; s.hero.gold += 20; bond(r.kin.id, 20); ctx.standing?.('order', 4); t.memory.push(`You went to the levy in ${r.kin.name}’s place.`); if (seededRoll(s.seed, `levy:mark:${t.id}`, 100) < 50) shiftNature(s, 'hard', 'The levy', 'Something in you closed on the march, and has not opened since.', ctx); note(ctx, 'The levy', `A season with the levy for ${r.kin.name}’s sake: mud, a sergeant who hates you, twenty gold at the end and a wound that will be weather in your shoulder for the rest of your life. ${r.kin.name} was at the gate when the carts came back.`); t.closed = true; }
    else {
      bond(r.kin.id, -5); t.memory.push(`${r.kin.name} went with the levy.`); note(ctx, 'The levy', `The cart leaves at dawn with ${r.kin.name} on it. Three seasons, the sergeant says, as if he knew.`);
      // The regional world keeps the deployment: the front, the casualty rolls, the return when the courts settle.
      const p = s.realm?.politics, war = s.realm?.wars?.find(w => w.id === ev.warId && w.status === 'active');
      if (p && war && !p.deployments.some(d => d.personId === r.kin.id && d.status === 'deployed')) { p.deployments.push({ personId: r.kin.id, lineageId: s.lineage?.people.find(x => x.source === 'life' && x.localId === r.kin.id)?.id || null, name: r.kin.name, warId: war.id, enlistedDay: s.day, endedDay: null, status: 'deployed' }); const person = peopleOf(s).find(x => x.id === r.kin.id); if (person) { person.memories ||= []; person.memories.push('I was taken by the levy.'); person.memories = person.memories.slice(-30); } t.closed = true; }
      else t.followUp = { kind: 'return', season: season + 3 };
    }
    return true;
  }
  if (t.def === 'strike') {
    if (pick === 'continue') { s.hero.gold = Math.max(0, s.hero.gold - 15); ctx.standing?.('villagers', 6); ctx.standing?.('order', -3); t.memory.push('You downed tools with the guild.'); note(ctx, 'Tools down', 'You stood with them in the cold outside the yard for a season, and ate thin. The street knows you stood.'); }
    else if (pick === 'work') { s.hero.gold += 40; ctx.standing?.('villagers', -10); ctx.standing?.('order', 3); if (s.hero.station?.ties) s.hero.station.ties.push({ kind: 'hates', name: `the ${ev.craft || r.craft}s’ guild`, note: 'you worked through their strike' }); t.memory.push('You worked through the strike.'); note(ctx, 'Blackleg', 'Forty gold from the masters for a season’s work with the yard gate barred behind you. Someone has chalked a word on your door. It will be chalked again.'); }
    else { ctx.standing?.('villagers', 4); ctx.standing?.('order', 4); if (Number.isFinite(s.hero.skills?.persuasion)) s.hero.skills.persuasion += 1; t.memory.push('You carried terms between the guild and the masters.'); note(ctx, 'Terms', 'You carried paper between the yard and the hall for a month, and were cursed by both, and the strike ended a season early with your name on the paper.'); }
    t.followUp = { kind: 'settled', season: season + 2 }; return true;
  }
  if (t.def === 'wolves') {
    if (pick === 'hunt') {
      const score = (s.hero.skills?.survival || 0) + (s.hero.skills?.weapons || 0) + (s.hero.attributes?.strength || 3) - 3 + (hasNature(s, 'brave') ? 2 : 0) + seededRoll(s.seed, `wolves:${t.id}`, 8);
      if (score >= 9) { ctx.standing?.('villagers', 12); if (Number.isFinite(s.hero.skills?.survival)) s.hero.skills.survival += 1; s.hero.hp = Math.max(1, s.hero.hp - Math.round(s.hero.maxHp * 0.15)); t.memory.push('You went up the mountain and came back with a pelt.'); note(ctx, 'The wolves', 'Two days in the snow with a spear and a borrowed dog. You came down with a pelt and a bite that went to the bone. The square was full when you came in, and nobody in it will forget it.'); }
      else { ctx.standing?.('villagers', 4); s.hero.hp = Math.max(1, s.hero.hp - Math.round(s.hero.maxHp * 0.4)); stress(12); t.memory.push('You went up the mountain and the wolves sent you back.'); note(ctx, 'The wolves', 'Two days in the snow and the pack found you before you found it. You came down on a sledge, which is more than the child did. The village thanks you anyway, in the way villages thank the ones who tried.'); }
    }
    else if (pick === 'pay' && s.hero.gold >= 30) { s.hero.gold -= 30; ctx.standing?.('villagers', 4); t.memory.push('You paid hunters to go up the mountain.'); note(ctx, 'The wolves', 'Thirty gold to three men from the next valley with dogs and no conversation. They came down with two pelts and left without a word. The village knows who paid.'); }
    else { ctx.standing?.('villagers', -6); t.followUp = { kind: 'wolves_return', season: season + 4 }; t.memory.push('You stayed by the fire when the wolves came.'); note(ctx, 'The wolves', 'You stayed by the fire. Somebody went; somebody always does. The pack knows the way down now.'); }
    if (!t.followUp) t.closed = true; return true;
  }
  if (t.def === 'purge') {
    const kin = r.kin;
    if (pick === 'shelter') { if (kin) bond(kin.id, 15); const found = seededRoll(s.seed, `purge:found:${t.id}`, 100) < 30; if (found) { ctx.addEvidence?.(2, 'An officer of the purge recorded who you hid.'); ctx.standing?.('order', -10); stress(15); t.memory.push(kin ? `You hid ${kin.name} and were found out.` : 'You hid and were found.'); note(ctx, 'The marked door', kin ? `${kin.name} in the cellar for a season, and the officers at the door twice. The second time they had a list with your name added in a different hand.` : 'A season in a cousin’s loft. The officers came twice; the second time they had your name in a different hand.'); } else { stress(8); t.memory.push(kin ? `You hid ${kin.name} until it passed.` : 'You hid until it passed.'); note(ctx, 'The marked door', kin ? `${kin.name} in the cellar for a season, eating what you could spare, while the chalk marks spread along the street and stopped two doors from yours.` : 'A season in a cousin’s loft, while the chalk spread along the street and stopped two doors short.'); } }
    else if (pick === 'denounce' && kin) { bond(kin.id, -60); ctx.standing?.('order', 8); ctx.standing?.('villagers', -8); if (s.hero.station?.ties) s.hero.station.ties.push({ kind: 'hates', name: kin.name, note: 'you gave their name to the purge' }); stress(10); shiftNature(s, 'hard', 'The marked door', 'You gave a name, and something in you closed over it.', ctx); t.memory.push(`You gave ${kin.name}’s name to the officers.`); note(ctx, 'The marked door', `You gave the officers ${kin.name}’s name before anyone else could. The court will remember you kindly. ${kin.name} was taken at dusk and did not look at you.`); }
    else if (pick === 'continue' && kin) { bond(kin.id, -20); const taken = seededRoll(s.seed, `purge:taken:${t.id}`, 100) < 50; if (taken) { ctx.killPerson?.(kin.id, 'taken in the purge', s.day, { title: 'The marked door', text: `${kin.name} was taken from the house two streets over with the chalk still wet on the door. You kept yours shut. Nobody has said anything about it to you, and nobody needs to.` }); t.memory.push(`${kin.name} was taken while you kept your door shut.`); } else { t.memory.push(`${kin.name} slipped the purge while you kept your door shut.`); note(ctx, 'The marked door', `${kin.name} slipped the officers by a night and a cousin’s cart, and knows you did not open your door. The chalk stopped two streets short of yours.`); } stress(10); }
    else { if (kin) bond(kin.id, -8); t.followUp = { kind: 'road', season: season + 2 }; t.memory.push(kin ? `You sent ${kin.name} away by night.` : 'You left by night.'); note(ctx, 'The marked door', kin ? `${kin.name} on the road before dawn with a bundle and a letter to someone in ${regionName((NEIGHBOURS[ev.regionId] || ['rainward'])[0])}. You will know by the thaw whether it arrived.` : 'The road before dawn, with what you could carry.'); }
    if (!t.followUp) t.closed = true; return true;
  }
  t.closed = true; return true;
}
function followUp(s, season, t, ctx) {
  const r = t.roles, f = t.followUp; t.followUp = null; t.closed = true;
  const bond = (id, n) => { const p = peopleOf(s).find(p => p.id === id); if (p) p.bond = clamp((p.bond || 0) + n); };
  if (f.kind === 'return') {
    const roll = seededRoll(s.seed, `return:${t.id}`, 100);
    if (roll < 22) { ctx.killPerson?.(r.kin.id, 'killed with the levy', s.day, { title: 'The levy', text: `${r.kin.name} did not come back with the carts. A sergeant you had not seen before had the name on a list, and the word for it, and nothing else.` }); t.memory.push(`${r.kin.name} died with the levy.`); if (s.life) s.life.stress = clamp((s.life.stress || 0) + 12); }
    else if (roll < 45) { bond(r.kin.id, 6); t.memory.push(`${r.kin.name} came back from the levy wounded.`); note(ctx, 'The levy', `${r.kin.name} came back with the carts, with a leg that will not bend and a way of looking at a door before going through it.`); }
    else { bond(r.kin.id, 10); t.memory.push(`${r.kin.name} came back from the levy.`); note(ctx, 'The levy', `${r.kin.name} came back with the carts, thinner, with twenty gold and stories that stop in the middle. You were at the gate.`); }
  } else if (f.kind === 'settled') {
    const won = seededRoll(s.seed, `strike:${t.id}`, 100) < (t.choice === 'continue' ? 55 : t.choice === 'mediate' ? 70 : 40);
    t.memory.push(won ? 'The strike was won.' : 'The strike was broken.');
    note(ctx, 'Tools up', won ? `The strike is won: the guild’s terms, a copper more a day, and the masters’ long memory. ${t.choice === 'work' ? 'The word on your door has been painted over, and everyone can still read it.' : ''}` : `The strike is broken: the masters’ terms, the yard open, and three men who will not be hired again anywhere in ${regionName(regionOf(s, homeOf(s)))}. ${t.choice === 'continue' ? 'You are not one of the three, this time.' : ''}`);
  } else if (f.kind === 'wolves_return') {
    if (season % 4 === WINTER || seededRoll(s.seed, `wolves:again:${t.id}`, 100) < 50) { const site = s.realm?.sites?.[homeOf(s)]; if (site) site.security = clamp(site.security - 6); t.memory.push('The wolves came back the next winter.'); note(ctx, 'The wolves', `The wolves came back the next winter, as everyone said they would, and took a goat and then a dog and then nothing more, because the village went up the mountain without asking who would.`); }
    else t.memory.push('The wolves did not come back.');
  } else if (f.kind === 'road') {
    const safe = seededRoll(s.seed, `road:${t.id}`, 100) < 60;
    if (r.kin) { if (safe) { bond(r.kin.id, 10); t.memory.push(`${r.kin.name} reached safety.`); note(ctx, 'A letter', `A letter in ${r.kin.name}’s hand, from a town you have not seen: arrived, hungry, alive. It does not say thank you and does not need to.`); } else { ctx.killPerson?.(r.kin.id, 'lost on the road in the purge', s.day, { title: 'The road', text: `No letter came from ${r.kin.name}. In the spring a carter who travels that road said there had been bodies in the ditch past the border, and did not say more.` }); t.memory.push(`${r.kin.name} was lost on the road.`); } }
  }
}

// ---------------------------------------------------------------------------
// Reading it back.
export function livingView(s) {
  const l = living(s); if (!l) return null;
  const season = seasonOf(s.day);
  return {
    events: l.events.filter(e => e.endSeason > season).map(e => ({ id: e.id, kind: e.kind, region: regionName(e.regionId), text: e.text, seasonsLeft: e.endSeason - season, routed: e.routed })),
    threads: l.threads.filter(t => !t.closed || t.memory.length).slice(-6).map(t => ({ id: t.id, def: t.def, stage: t.closed ? 'closed' : t.stage, memory: [...t.memory], waiting: !!t.followUp })),
    news: l.news.slice(-6).map(n => ({ ...n, seasonsAgo: season - n.season })),
    actors: l.actors.map(a => ({ id: a.id, kind: a.kind, name: a.name, region: regionName(a.regionId), goal: a.goal?.kind || null, progress: a.goal?.progress || 0 })),
  };
}
export function validateLiving(l, s) {
  if (l === undefined) return true;
  const int = (n, max = 1000000) => Number.isSafeInteger(n) && n >= 0 && n <= max, str = (v, max = 400) => typeof v === 'string' && v.length <= max;
  if (!l || typeof l !== 'object' || l.version !== 1 || !int(l.lastSeason) || (s && l.lastSeason > seasonOf(s.day))) return false;
  if (!Array.isArray(l.actors) || l.actors.length > LIMITS.actors || !l.actors.every(a => a && ['court', 'guild', 'beasts'].includes(a.kind) && str(a.id, 60) && str(a.name, 160) && REGION_TEMPLATES.some(r => r.id === a.regionId) && (a.goal === null || a.goal && ['reclaim', 'levy', 'purge', 'build', 'contract', 'monopoly', 'descend'].includes(a.goal.kind) && int(a.goal.progress, 400) && int(a.goal.pace, 60)))) return false;
  if (!Array.isArray(l.events) || l.events.length > LIMITS.events || !l.events.every(e => e && str(e.id, 20) && ['war', 'levy', 'purge', 'works', 'strike', 'monopoly', 'raid'].includes(e.kind) && REGION_TEMPLATES.some(r => r.id === e.regionId) && int(e.startSeason) && int(e.endSeason) && e.endSeason >= e.startSeason && Array.isArray(e.siteIds) && e.siteIds.length <= 64 && str(e.text, 600) && typeof e.routed === 'boolean')) return false;
  if (!Array.isArray(l.threads) || l.threads.length > LIMITS.threads * 2 || !l.threads.every(t => t && str(t.id, 20) && ['conscription', 'strike', 'wolves', 'purge'].includes(t.def) && str(t.eventId, 20) && t.roles && typeof t.roles === 'object' && int(t.season) && ['open', 'chosen'].includes(t.stage) && (t.choice === null || str(t.choice, 20)) && (t.followUp === null || t.followUp && ['return', 'settled', 'wolves_return', 'road'].includes(t.followUp.kind) && int(t.followUp.season)) && Array.isArray(t.memory) && t.memory.length <= 12 && t.memory.every(m => str(m, 300)) && typeof t.closed === 'boolean')) return false;
  if (!Array.isArray(l.news) || l.news.length > LIMITS.news || !l.news.every(n => n && int(n.season) && str(n.text, 600))) return false;
  if (!l.counters || !int(l.counters.events) || !int(l.counters.threads)) return false;
  if (s?.event?.id?.startsWith('living_') && !l.threads.some(t => t.stage === 'open' && !t.closed && `living_${t.def}` === s.event.id)) return false;
  return true;
}
