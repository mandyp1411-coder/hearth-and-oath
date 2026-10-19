import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceFor, hasEvidence, recordEvidenceOnce, validateObjectiveEvidence, finishObjectiveOnce } from '../dist/js/objective-evidence.js';

const token = (extra = {}) => ({ id: 'signed-record', kind: 'record', day: 7, locationId: 'archive-town', actorIds: ['clerk-a'], objectId: 'case-1', verified: true, disposition: 'observed', ...extra });
const checks = { day: 10, site: id => id === 'archive-town', actor: id => ['clerk-a', 'witness-b'].includes(id), allowedIds: ['signed-record', 'recipient-reply'], objectId: id => id === 'case-1' };
const run = () => ({ status: 'active', evidence: [], completedDay: null, ending: null });

test('evidence insertion copies the actual token and rejects duplicate facts', () => {
  const r = run(), e = token();
  assert.equal(recordEvidenceOnce(r, e), true); e.actorIds.push('changed-outside');
  assert.deepEqual(evidenceFor(r, 'signed-record').actorIds, ['clerk-a']);
  assert.equal(recordEvidenceOnce(r, token({ day: 8 })), false); assert.equal(r.evidence.length, 1);
  assert.equal(hasEvidence(r, ['signed-record']), true); assert.equal(hasEvidence(r, ['missing']), false);
});

test('evidence validation bounds dates, identity, location, target and vocabulary', () => {
  assert.equal(validateObjectiveEvidence([token()], checks), true);
  assert.equal(validateObjectiveEvidence([token({ sourceRevision: 0 })], checks), true);
  for (const change of [{ day: 11 }, { day: -1 }, { actorIds: ['successor-not-a-witness'] }, { locationId: 'rumored-forest' }, { objectId: 'other-cargo' }, { kind: 'generic-progress' }, { verified: 1 }, { disposition: 'assumed-consent' }, { id: 'unknown-fact' }, { sourceRevision: -1 }, { sourceRevision: 0.5 }, { sourceRevision: '1' }, { secret: 'unexpected payload' }]) {
    assert.equal(validateObjectiveEvidence([token(change)], checks), false, JSON.stringify(change));
  }
  assert.equal(validateObjectiveEvidence([token(), token()], checks), false);
});

test('unverified evidence cannot complete and refused consent is not willing consent', () => {
  const r = run(); recordEvidenceOnce(r, token({ verified: false }));
  assert.equal(hasEvidence(r, ['signed-record']), false);
  assert.equal(finishObjectiveOnce(r, { day: 10, ending: 'Unproved', requiredIds: ['signed-record'] }), false);
  assert.equal(r.status, 'active'); assert.equal(r.completedDay, null);
  const refused = token({ id: 'recipient-reply', kind: 'consent', disposition: 'refused' });
  assert.equal(validateObjectiveEvidence([refused], checks), true);
  assert.notEqual(refused.disposition, 'willing', 'owner-specific consent must check the disposition, not just a verified token');
});

test('completion is once-only and does not own money, rank or another task ledger', () => {
  const r = run(); recordEvidenceOnce(r, token());
  assert.equal(finishObjectiveOnce(r, { day: 10, ending: 'Supported finding', requiredIds: ['signed-record'] }), true);
  assert.equal(r.status, 'completed'); assert.equal(r.completedDay, 10);
  assert.equal(finishObjectiveOnce(r, { day: 11, ending: 'Repeated', requiredIds: ['signed-record'] }), false);
  assert.equal(r.ending, 'Supported finding'); assert.equal(Object.hasOwn(r, 'gold'), false);
});
