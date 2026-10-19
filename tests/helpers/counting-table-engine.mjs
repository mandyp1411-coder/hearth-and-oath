// ENGINE LANE ONLY. Controlled existing-save/location fixtures, not a newly
// earned lifetime or evidence of whole-life balance. No runtime stats are raised.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../../dist/js/engine.js';
import { settlementServices } from '../../dist/js/world-services.js';
import { settlementWalkPath } from '../../dist/js/exploration-ui.js';
import { syncCartography } from '../../dist/js/cartography.js';
import { firstMissionJournalRow } from '../../dist/js/faction-first-missions.js';
import { countingTableJournalRows } from '../../dist/js/counting-table-job.js';
import { makeCountingTableCase, countingTableRolls, countingTableRiskQuote } from '../../dist/js/counting-table-case.js';
import { regionAt } from '../../dist/js/realm.js';
export { E, settlementServices, countingTableJournalRows };
const raw = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base;
const base = E.migrateSave(raw);
export function valid(s) { assert.ok(E.validateSave(s), s.notice); return s; }
export function reload(s) { valid(s); const next = E.migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(next, s); return next; }
export function act(s, id) { const a = E.getActions(s).find(a => a.id === id); assert.ok(a, id + ' is offered'); assert.ok(!a.disabledReason, a.disabledReason); return valid(E.chooseAction(s, id)); }
export function answer(s, id) { const c = s.event?.choices.find(c => c.id === id); assert.ok(c && !c.disabledReason, id + ': ' + c?.disabledReason); return valid(E.chooseEventOption(s, id)); }
export function settle(s) {
  for (let n = 0; n < 80; n++) {
    if (s.event?.id.startsWith('justice_counting_')) return s;
    assert.equal(s.battle, null, 'the civilian fixture must not require combat');
    if (s.event) {
      const choice = ['conclude_correct', 'care', 'animal', 'cooperate', 'pay', 'account', 'continue', 'wait', 'leave', 'later', 'avoid', 'pause']
        .map(id => s.event.choices.find(c => c.id === id && !c.disabledReason)).find(Boolean) || s.event.choices.find(c => !c.disabledReason);
      assert.ok(choice); s = answer(s, choice.id);
    } else if (s.rpg?.project) s = act(s, 'rpg_continue');
    else return s;
  }
  throw Error('Unfinished existing calendar decision');
}
export function walk(s, target) {
  s = settle(s); const path = settlementWalkPath(s, target); assert.notEqual(path, null, target + ' exists');
  for (const id of path) { s = act(s, 'atlas_room_' + id); s = settle(s); }
  return s;
}
function earnQuietTable(s) {
  const rep = settlementServices(s).find(r => r.kind === 'faction' && r.subjectId === 'quiet_table'); assert.ok(rep);
  s = walk(s, rep.roomId); s = act(s, 'rpg_join_quiet_table'); s = act(s, 'rpg_faction_quiet_table'); s = answer(s, 'accept_direct');
  for (let n = 0; n < 8; n++) {
    s = settle(s); const faction = s.rpg.factions.find(f => f.id === 'quiet_table');
    if (faction.rank === 1) return s;
    const row = firstMissionJournalRow(s, faction); assert.ok(row); assert.equal(row.locationId, s.locationId);
    s = walk(s, row.roomId); s = act(s, row.actionId);
  }
  throw Error('The finite existing Quiet Table agreement did not finish');
}
export function fixtureFor(method = 'stealth', wanted = 'success', { unwitnessed = false } = {}) {
  for (const place of base.world.locations.filter(p => base.realm.sites[p.id]?.regionId === 'bellwater' && base.realm.sites[p.id].merchant && !['destroyed', 'evacuated'].includes(p.status))) {
    let s = structuredClone(base); s.locationId = place.id; syncCartography(s); s = walk(s, 'market');
    if (method === 'inside') { s = earnQuietTable(s); s = walk(s, 'market'); }
    if (!E.getActions(s).some(a => a.id === 'justice_job_open' && !a.disabledReason)) continue;
    const rows = settlementServices(s), run = makeCountingTableCase(s, { method,
      merchantService: rows.find(r => r.kind === 'merchant' && r.subjectId === 'market'), quietTableService: rows.find(r => r.kind === 'faction' && r.subjectId === 'quiet_table') });
    assert.ok(run); const quote = countingTableRiskQuote(s, run, { enforcement: regionAt(s).law.enforcement }), rolls = countingTableRolls(s, run);
    if ((wanted === 'entry-failure' ? rolls.entry >= quote.entryChance : rolls.entry < quote.entryChance && rolls.escape < quote.escapeChance)
      && (!unwitnessed || rolls.witness >= quote.witnessChance)) return reload(s);
  }
  throw Error('No controlled existing-site fixture for ' + method + '/' + wanted);
}
export function accept(s, method) { s = act(s, 'justice_job_open'); assert.equal(s.event.id, 'justice_counting_offer'); return answer(s, 'accept_' + method); }
export function prepare(s) {
  for (let n = 0; n < 3; n++) { s = settle(s); const row = countingTableJournalRows(s)[0]; assert.ok(row); s = walk(s, row.roomId); s = act(s, 'justice_job_prepare'); }
  return reload(settle(s));
}
export function finish(s) {
  s = prepare(s); s = walk(s, 'market'); s = act(s, 'justice_job_approach'); s = settle(s);
  if (!s.event && s.justice.countingTableJob.stage === 'opportunity') s = act(s, 'justice_job_review');
  assert.equal(s.event?.id, 'justice_counting_departure'); return answer(s, 'depart');
}
