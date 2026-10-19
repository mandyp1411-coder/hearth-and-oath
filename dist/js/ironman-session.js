import { isIronman, validateIronman, ironmanHeroDeath } from './ironman.js';
import { validIronmanRunId } from './ironman-storage.js';

const copy = value => value == null ? value : structuredClone(value);
const text = value => JSON.stringify(value);
const same = (left, right) => text(left) === text(right);
const runOf = state => isIronman(state) ? state.ironman?.runId : null;
const terminal = state => Boolean(ironmanHeroDeath(state));
const lifecycle = kind => ['archive', 'delete', 'reattach'].includes(kind);

/** DOM-free acceptance coordinator. The immutable operation, not the view
 * epoch, owns a reserved mutation until its durable outcome is reconciled.
 * Neither status nor settled() exposes a playable candidate or a save token. */
export function createIronmanSession({ store, readContext, onAdopt, onEnd = () => {}, onDetach = () => {}, onStatus = () => {} }) {
  let epoch = 0, sequence = 0, phase = 'dormant', reason = null;
  let binding = null, operation = null, ended = null, busy = false;
  let completion = Promise.resolve();

  function context() {
    try {
      const value = readContext();
      return value && typeof value === 'object' ? { state: value.state ?? null, slot: Number(value.slot) } : null;
    } catch { return null; }
  }
  function snapshot() {
    const owner = operation || binding || ended;
    return { phase, epoch, busy, unresolved: Boolean(operation?.obligation),
      operationId: operation?.id ?? ended?.operationId ?? null, kind: operation?.kind ?? null,
      runId: owner?.runId ?? null, slot: owner?.slot ?? null, reason,
      cleanupPending: Boolean(ended?.cleanupPending) };
  }
  function announce() { try { onStatus(snapshot()); } catch {} }
  function blocked(why) { phase = 'blocked'; reason = why || 'authority-unconfirmed'; announce(); }
  function matches(source) {
    const current = context();
    return Boolean(current && source && current.state === source.state && current.slot === source.slot
      && text(current.state) === source.fingerprint);
  }
  function currentBinding() {
    const current = context();
    return Boolean(binding && current && current.slot === binding.slot && current.state === binding.state
      && runOf(current.state) === binding.runId && text(current.state) === binding.fingerprint);
  }
  function dispose(request) {
    if (!request) return;
    request.candidate = null; request.source = null; request.afterAdopt = null; request.token = null;
    request.expectedHeadToken = null; request.recovery = null;
  }
  function finishEnd(request, result) {
    const runId = result.runId || request.runId;
    const info = { runId, slot: request.slot, operationId: request.id,
      marker: copy(result.marker ?? ended?.marker ?? null), cleanupPending: result.status !== 'ended' };
    // A late end still disposes this run, even after a view invalidation. The
    // app's onEnd must likewise clear matching references, never another life.
    if (binding?.runId === runId) binding = null;
    if (operation?.runId === runId) { dispose(operation); operation = null; }
    dispose(request);
    ended = info; phase = 'ended'; reason = info.cleanupPending ? 'ended-cleanup-pending' : null;
    try { onEnd({ runId, marker: copy(info.marker), cleanupPending: info.cleanupPending }); }
    catch { reason = 'ended-reference-cleanup-failed'; }
    announce();
  }
  function adopt(request, state, authority, attemptEpoch, source = request.source, kind = request.kind) {
    if (operation !== request || epoch !== attemptEpoch || !matches(source)) return false;
    const fingerprint = text(state);
    const details = { ...authority, epoch, operationId: request.id, kind, message: request.message };
    // This function is called ONLY by the store's synchronous locked consumer.
    onAdopt(state, details);
    const current = context();
    if (!current || current.slot !== authority.slot || runOf(current.state) !== authority.runId
        || text(current.state) !== fingerprint) throw new Error('The authoritative position was not synchronously adopted.');
    binding = { runId: authority.runId, slot: authority.slot, token: authority.token,
      state: current.state, fingerprint };
    request.resolved = true;
    const effect = request.afterAdopt;
    request.afterAdopt = null;
    if (!request.effectDone && effect) {
      request.effectDone = true;
      // UI effects are once-only and cannot undo an accepted durable position.
      try { effect(current.state, details); } catch {}
    }
    dispose(request);
    if (operation === request) operation = null;
    ended = null;
    if (epoch === attemptEpoch && currentBinding()) { phase = 'ready'; reason = null; announce(); }
    else blocked(reason || 'view-invalidated');
    return true;
  }
  function reserve(kind, { runId, slot, candidate = null, token = null, afterAdopt = null, message = null, obligation = false }, replacement = null) {
    if (busy || operation?.obligation && operation !== replacement) return null;
    const source = context();
    if (!source || !validIronmanRunId(runId)
        || !['archive', 'delete', 'cleanup'].includes(kind) && (!Number.isInteger(slot) || slot < 0 || slot > 2)) return null;
    source.fingerprint = text(source.state);
    epoch++;
    const request = { id: ++sequence, kind, runId, slot, candidate: copy(candidate), token,
      afterAdopt: typeof afterAdopt === 'function' ? afterAdopt : null, message,
      source, obligation, resolved: false, effectDone: false };
    const previous = operation;
    operation = request;
    if (replacement && previous === replacement) dispose(previous);
    phase = 'pending'; reason = null; announce();
    return request;
  }
  function launch(request, action) {
    if (busy) return completion.then(snapshot);
    busy = true; phase = 'pending'; reason = null;
    const attemptEpoch = epoch;
    announce();
    completion = Promise.resolve().then(() => action(attemptEpoch)).catch(() => {
      if (operation === request) blocked('session-operation-unconfirmed');
    }).then(() => {
      busy = false;
      if (operation === request && !request.resolved && phase === 'pending') blocked('authority-unconfirmed');
      announce(); return snapshot();
    });
    return completion;
  }
  async function endAttempt(request) {
    const result = await store.endIronman(request.slot, request.candidate, { token: request.token });
    if (['ended', 'ended-cleanup-pending'].includes(result.status)) { finishEnd(request, result); return; }
    if (operation === request) blocked(result.reason || result.status);
  }
  async function commitAttempt(request, attemptEpoch) {
    const intent = request.kind === 'live' ? 'continue' : request.kind;
    const result = await store.commitIronman(request.slot, request.candidate, { intent, token: request.token,
      consume: (state, authority) => adopt(request, state, authority, attemptEpoch) });
    if (request.resolved || operation !== request) return;
    if (['ended', 'ended-cleanup-pending'].includes(result.status)) {
      // commit's ended result need not prove that full-byte cleanup completed.
      await endKnownMarker(request); return;
    }
    if (result.status === 'known-head') {
      // An import identifies the retained browser head, never its JSON payload.
      dispose(request); operation = null; blocked('known-head'); return;
    }
    if (result.status === 'committed') { blocked('view-invalidated-after-commit'); return; }
    if (result.status === 'blocked' && ['create', 'import'].includes(request.kind)
        && ['exclusive-coordination-unavailable', 'invalid-position', 'invalid-new-opening',
          'underlying-slot-occupied', 'ironman-slot-occupied', 'unsaved-target'].includes(result.reason)) {
      // Only these definitive pre-write refusals can offer explicit Standard
      // creation. A generic blocked result can follow a confirmed first write
      // (for example an orphan-revocation failure), so it retains the candidate.
      dispose(request); operation = null;
    }
    blocked(result.reason || result.status);
  }
  async function endKnownMarker(request) {
    // A run ID alone can only retry cleanup of an EXISTING valid marker. The
    // actual store rejects it before any write when no marker exists.
    const result = await store.endIronman(request.slot, request.runId, {});
    if (['ended', 'ended-cleanup-pending'].includes(result.status)) finishEnd(request, result);
    else if (operation === request) blocked(result.reason || result.status);
  }
  async function loadAttempt(request, attemptEpoch) {
    const result = await store.inspectIronman(request.runId, { intent: 'resume', slot: request.slot,
      consume: (state, authority) => adopt(request, state, authority, attemptEpoch) });
    if (request.resolved || operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    dispose(request); operation = null; blocked(result.reason || (result.status === 'ready' ? 'view-invalidated' : result.status));
  }
  function finishDetach(request, deleted) {
    if (binding?.runId === request.runId) binding = null;
    const info = { runId: request.runId, deleted };
    request.resolved = true; dispose(request);
    if (operation === request) operation = null;
    // Completing another run's lifecycle does not authorize this binding from
    // an earlier read. It needs an idle locked probe before gameplay resumes.
    phase = binding ? 'blocked' : 'dormant'; reason = binding ? 'authority-refresh-required' : deleted ? 'deleted' : 'archived';
    try { onDetach(info); } catch { reason = 'detached-reference-cleanup-failed'; }
    announce();
  }
  async function attachedAttempt(request, attemptEpoch) {
    const result = await store.inspectIronman(request.runId, { intent: 'resume', slot: request.slot, token: request.expectedHeadToken,
      consume: (state, authority) => same(state, request.candidate)
        && authority.token === request.expectedHeadToken && adopt(request, state, authority, attemptEpoch) });
    if (request.resolved || operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    blocked(result.reason || 'reattached-authority-unconfirmed');
  }
  async function lifecycleAttempt(request, attemptEpoch) {
    const options = { reviewed: true, token: request.token };
    const result = request.kind === 'reattach'
      ? await store.reattachIronman(request.runId, request.slot, options)
      : await store[request.kind === 'archive' ? 'archiveIronman' : 'deleteIronman'](request.runId, options);
    if (operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    if (request.kind === 'archive' && result.status === 'archived') { finishDetach(request, false); return; }
    if (request.kind === 'delete' && result.status === 'deleted') { finishDetach(request, true); return; }
    if (request.kind === 'reattach' && result.status === 'committed') {
      // The reattachment return is not adoption permission. Keep the original
      // review token distinct, then verify this exact new head in another lock.
      request.expectedHeadToken = result.token; request.candidate = copy(result.state);
      await attachedAttempt(request, attemptEpoch); return;
    }
    blocked(result.reason || result.status);
  }
  async function recoverAttachAttempt(request, attemptEpoch) {
    const target = request.recovery;
    const result = await store.reattachIronman(request.runId, target.slot, { reviewed: true, token: target.token });
    if (operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    if (result.status === 'committed') { await recoverInspect(request, attemptEpoch, false); return; }
    blocked(result.reason || result.status);
  }
  async function recoverInspect(request, attemptEpoch, retry) {
    let comparison = null;
    const result = await store.inspectIronman(request.runId, { intent: 'resume', slot: request.recovery.slot,
      consume: (state, authority) => {
        comparison = same(state, request.candidate) ? 'candidate' : 'different';
        // Recovery is NOT a fresh token for the old action. Only the already
        // authoritative exact candidate may resolve its original obligation.
        return comparison === 'candidate' && adopt(request, state, authority, attemptEpoch);
      } });
    if (request.resolved || operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    if (comparison) { blocked(comparison === 'candidate' ? 'view-invalidated' : 'candidate-recovery-conflict'); return; }
    if (retry) await recoverAttachAttempt(request, attemptEpoch);
    else blocked(result.reason || 'reviewed-candidate-recovery-required');
  }
  async function reconcile(request, attemptEpoch, retry) {
    if (request.kind === 'terminal' || request.kind === 'cleanup') { await endAttempt(request); return; }
    if (request.recovery) { await recoverInspect(request, attemptEpoch, retry); return; }
    if (lifecycle(request.kind)) {
      if (request.kind === 'reattach' && request.expectedHeadToken) await attachedAttempt(request, attemptEpoch);
      else if (retry) await lifecycleAttempt(request, attemptEpoch);
      else {
        const result = await store.endIronman(request.slot, request.runId, {});
        if (['ended', 'ended-cleanup-pending'].includes(result.status)) finishEnd(request, result);
        else blocked(result.reason === 'invalid-terminal' ? 'reviewed-lifecycle-retry-required' : result.reason || result.status);
      }
      return;
    }
    let comparison = null;
    const result = await store.inspectIronman(request.runId, { intent: 'resume', slot: request.slot,
      consume: (state, authority) => {
        if (same(state, request.candidate)) {
          comparison = 'candidate';
          return adopt(request, state, authority, attemptEpoch);
        }
        comparison = authority.token === request.token ? 'source' : 'different';
        return false;
      } });
    if (request.resolved || operation !== request) return;
    if (result.status === 'ended') { await endKnownMarker(request); return; }
    if (comparison === 'candidate') { blocked('view-invalidated'); return; }
    if (comparison === 'source') {
      if (retry) await commitAttempt(request, attemptEpoch);
      else blocked('same-candidate-retry-required');
      return;
    }
    if (comparison === 'different') { blocked('stale-authority'); return; }
    if (['create', 'import'].includes(request.kind) && result.reason === 'missing-run-head') {
      // A first write may not have happened. Re-review only to compare the
      // ORIGINAL empty token, never to bless this old candidate with a new one.
      const review = await store.inspectIronman(request.candidate, { intent: request.kind, slot: request.slot });
      if (operation !== request) return;
      if (review.status === 'ended') { await endKnownMarker(request); return; }
      if (review.status === 'review' && review.token === request.token) {
        if (retry) await commitAttempt(request, attemptEpoch);
        else blocked('same-candidate-retry-required');
      } else blocked(review.reason || (review.status === 'known-head' ? 'stale-authority' : 'stale-first-save-target'));
      return;
    }
    blocked(result.reason || result.status);
  }
  function beginAdmission(kind, slot, state, options = {}) {
    if (!isIronman(state) || !validateIronman(state) || terminal(state)) return false;
    const request = reserve(kind, { runId: runOf(state), slot: Number(slot), candidate: state,
      token: options.token, afterAdopt: options.afterAdopt, message: options.message, obligation: true });
    if (request) launch(request, attemptEpoch => commitAttempt(request, attemptEpoch));
    return false;
  }
  function beginLifecycle(kind, runId, slot, options = {}) {
    if (!options.reviewed || typeof options.token !== 'string' || !options.token || !validIronmanRunId(runId) || busy) return false;
    const target = kind === 'reattach' ? Number(slot) : binding?.runId === runId ? binding.slot : null;
    if (kind === 'reattach' && (!Number.isInteger(target) || target < 0 || target > 2)) return false;
    const previous = operation?.obligation ? operation : null;
    if (previous) {
      // Only a fresh SAME-RUN reviewed lifecycle decision can supersede an
      // uncertain lifecycle. Never discard a gameplay, first-save or fatal
      // candidate through archive/delete/reattach.
      if (!lifecycle(previous.kind) || previous.runId !== runId) return false;
    }
    const request = reserve(kind, { runId, slot: target, token: options.token, afterAdopt: options.afterAdopt, obligation: true }, previous);
    if (request) launch(request, attemptEpoch => lifecycleAttempt(request, attemptEpoch));
    return false;
  }
  function retryOrRefresh(retry) {
    if (busy) return completion.then(snapshot);
    if (operation?.obligation) {
      const request = operation;
      epoch++;
      return launch(request, attemptEpoch => reconcile(request, attemptEpoch, retry));
    }
    if (ended?.cleanupPending && retry) {
      const request = reserve('cleanup', { runId: ended.runId, slot: ended.slot, candidate: ended.runId, obligation: true });
      return request ? launch(request, () => endAttempt(request)) : Promise.resolve(snapshot());
    }
    if (!binding) return Promise.resolve(snapshot());
    const request = reserve('probe', { runId: binding.runId, slot: binding.slot });
    if (!request) return Promise.resolve(snapshot());
    return launch(request, async attemptEpoch => {
      let unchanged = false;
      const result = await store.inspectIronman(request.runId, { intent: 'resume', slot: request.slot,
        consume: (state, authority) => {
          unchanged = currentBinding() && authority.token === binding.token && text(state) === binding.fingerprint;
          if (unchanged && operation === request && epoch === attemptEpoch && matches(request.source)) {
            dispose(request); operation = null; phase = 'ready'; reason = null; announce();
          }
        } });
      if (operation !== request) return;
      if (result.status === 'ended') { await endKnownMarker(request); return; }
      dispose(request); operation = null; blocked(result.reason || (unchanged ? 'view-invalidated' : 'stale-authority'));
    });
  }
  return {
    status: snapshot,
    settled: () => completion.then(snapshot),
    canMutate: () => !busy && phase === 'ready' && !operation && currentBinding(),
    isCurrent: expectedEpoch => epoch === expectedEpoch && !operation && phase === 'ready' && currentBinding(),
    resume(runId, slot, options = {}) {
      const request = reserve('resume', { runId, slot: Number(slot), afterAdopt: options.afterAdopt, message: options.message });
      if (request) launch(request, attemptEpoch => loadAttempt(request, attemptEpoch));
      return false;
    },
    create: (slot, state, options) => beginAdmission('create', slot, state, options),
    import: (slot, state, options) => beginAdmission('import', slot, state, options),
    archive: (runId, options) => beginLifecycle('archive', runId, null, options),
    delete: (runId, options) => beginLifecycle('delete', runId, null, options),
    reattach: (runId, slot, options) => beginLifecycle('reattach', runId, slot, options),
    recoverCandidate(runId, slot, { reviewed = false, token } = {}) {
      const request = operation, target = Number(slot);
      if (!reviewed || typeof token !== 'string' || !token || busy || !request?.obligation
          || !['live', 'create', 'import'].includes(request.kind) || request.runId !== runId
          || !Number.isInteger(target) || target < 0 || target > 2 || !context()) return false;
      // Attachment review is separate from the immutable gameplay source token
      // and candidate. Every refusal/uncertainty retains that original intent.
      request.recovery = { slot: target, token };
      epoch++; request.afterAdopt = null;
      launch(request, attemptEpoch => recoverAttachAttempt(request, attemptEpoch));
      return false;
    },
    accept(next, options = {}) {
      // Standard is deliberately not an input conversion or persistence path.
      if (!isIronman(next) || !validateIronman(next) || !this.canMutate() || runOf(next) !== binding.runId) return false;
      const kind = terminal(next) ? 'terminal' : 'live';
      const request = reserve(kind, { runId: binding.runId, slot: binding.slot, candidate: next, token: binding.token,
        afterAdopt: options.afterAdopt, message: options.message, obligation: true });
      if (request) launch(request, attemptEpoch => kind === 'terminal' ? endAttempt(request) : commitAttempt(request, attemptEpoch));
      return false;
    },
    retry: () => retryOrRefresh(true),
    refresh: () => retryOrRefresh(false),
    chooseAuthority(runId, slot, { reviewed = false, token } = {}) {
      const request = operation, target = Number(slot), source = context();
      if (!reviewed || typeof token !== 'string' || !token || busy || !request?.obligation
          || ['archive', 'delete', 'cleanup'].includes(request.kind) || request.runId !== runId || !source
          || !Number.isInteger(target) || target < 0 || target > 2) return false;
      source.fingerprint = text(source.state);
      epoch++; request.afterAdopt = null;
      launch(request, async attemptEpoch => {
        let refused = 'stale-authority';
        const result = await store.inspectIronman(runId, { intent: 'resume', slot: target, token,
          consume: (state, authority) => {
            const exactCandidate = request.kind !== 'terminal' && request.candidate && same(state, request.candidate);
            // Revision-only re-save of the pre-death body is NOT an escape.
            if (!exactCandidate && (authority.token === request.token || text(state) === request.source.fingerprint)) {
              refused = 'original-source-obligation'; return false;
            }
            return adopt(request, state, authority, attemptEpoch, source, 'reviewed-authority');
          } });
        if (request.resolved || operation !== request) return;
        if (result.status === 'ended') { await endKnownMarker(request); return; }
        blocked(result.reason || refused);
      });
      return false;
    },
    invalidate(why = 'storage-change') {
      epoch++;
      // Cancel stale presentation effects, never the gameplay candidate or its
      // original token. In particular unchanged source is not resurrection.
      if (operation) operation.afterAdopt = null;
      if (phase !== 'ended') blocked(why);
      else announce();
      return snapshot();
    },
    releaseStandard() {
      if (busy || operation?.obligation) return false;
      dispose(operation); operation = null; binding = null; ended = null;
      epoch++; phase = 'dormant'; reason = null; announce(); return true;
    },
    protect(consume) {
      if (typeof consume !== 'function' || busy || phase !== 'ready' || operation || !currentBinding())
        return Promise.resolve({ status: 'blocked', reason: 'session-not-ready' });
      const request = reserve('protect', { runId: binding.runId, slot: binding.slot });
      let outcome = { status: 'blocked', reason: 'session-not-ready' };
      return launch(request, async attemptEpoch => {
        const result = await store.inspectIronman(request.runId, { intent: 'export', slot: request.slot, token: binding.token,
          consume: (state, authority) => {
            if (operation !== request || epoch !== attemptEpoch || !matches(request.source)
                || !currentBinding() || text(state) !== binding.fingerprint) return { consumed: false };
            const value = consume(state, { ...authority, epoch, operationId: request.id });
            if (value?.then) throw new Error('A protected consumer must be synchronous.');
            outcome = { status: 'ready', value };
            // Settle while still in the locked consumer. A later storage/view
            // invalidation must not be undone by the post-await continuation.
            const stillCurrent = epoch === attemptEpoch && matches(request.source) && currentBinding();
            dispose(request); operation = null;
            if (stillCurrent) {
              phase = 'ready'; reason = null; announce();
            } else blocked(reason || 'view-invalidated');
            return { consumed: true, value };
          } });
        if (operation !== request) return;
        if (result.status === 'ended') { await endKnownMarker(request); outcome = { status: 'ended' }; return; }
        if (result.status !== 'ready' || !result.value?.consumed) {
          outcome = { status: 'blocked', reason: result.reason || 'view-invalidated' };
          dispose(request); operation = null; blocked(outcome.reason);
        }
      }).then(() => outcome);
    },
  };
}
