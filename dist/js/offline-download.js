import { loadOfflineGame } from './offline.js';

const blankOfflineState = () => ({ phase: 'idle', source: null, totalBytes: null, totalParts: null, downloadedBytes: 0, completedParts: 0, announcement: '' });
export function offlineDownloadBusy(state) { return ['manifest', 'loading', 'assembling'].includes(state.phase); }

/** A download session is deliberately independent of character, slot and saves. */
export function createOfflineDownload({ isLocal = () => false, localCopy, save, onChange = () => {}, load = options => loadOfflineGame(undefined, options), controller = () => new AbortController() } = {}) {
  let state = Object.freeze(blankOfflineState()), active = null;
  const update = patch => { state = Object.freeze({ ...state, ...patch }); onChange(state); };
  function start() {
    if (active) return active.promise;
    const run = { controller: controller(), quarter: 0, promise: null };
    active = run;
    const current = () => active === run && !run.controller.signal.aborted;
    const local = isLocal();
    update({ ...blankOfflineState(), phase: 'manifest', source: local ? 'local-copy' : 'hosted-parts', announcement: local ? 'Preparing a copy of this local game. No network requests are needed.' : 'Checking the complete offline game size.' });
    run.promise = Promise.resolve().then(async () => {
      try {
        if (!current()) return false;
        const progress = next => {
          if (!current()) return;
          let announcement = state.announcement;
          if (next.totalBytes && !state.totalBytes) announcement = `Offline game size: ${next.totalBytes.toLocaleString('en-US')} bytes in ${next.totalParts} parts.`;
          const quarter = next.totalBytes ? Math.min(3, Math.floor(next.downloadedBytes / next.totalBytes * 4)) : 0;
          if (quarter > run.quarter) { run.quarter = quarter; announcement = `${quarter * 25} percent of the offline file reassembled.`; }
          // Loader completion is not browser saving completion. Only announce
          // the handoff after the complete Blob is accepted below.
          update({ ...next, phase: next.phase === 'complete' ? 'assembling' : next.phase, announcement });
        };
        const blob = local ? await localCopy({ signal: run.controller.signal }) : await load({ signal: run.controller.signal, onProgress: progress });
        if (!current()) return false;
        if (!(blob instanceof Blob) || !blob.size || blob.type !== 'text/html;charset=utf-8') throw new Error('The complete offline file was not prepared.');
        update({ phase: 'assembling', downloadedBytes: blob.size, totalBytes: blob.size, ...(local ? { totalParts: null, completedParts: 0 } : {}) });
        if (!current()) return false;
        // Saving is synchronous, so a newer request cannot replace this run
        // between its current-token check and the browser download handoff.
        save(blob, { signal: run.controller.signal });
        if (!current()) return false;
        update({ phase: 'ready', announcement: 'Offline game download started. Check your browser downloads. Your saved lives are unchanged.' });
        return true;
      } catch (error) {
        if (!current()) return false;
        update({ phase: error?.name === 'AbortError' ? 'cancelled' : 'error', announcement: error?.name === 'AbortError' ? 'Offline download cancelled. No game file was created.' : 'The offline game could not be prepared. Retry from the beginning; your saved lives are unchanged.' });
        return false;
      } finally { if (active === run) active = null; }
    });
    return run.promise;
  }
  function cancel() {
    if (!active) return false;
    const previous = active;
    active = null;
    previous.controller.abort();
    update({ phase: 'cancelled', announcement: 'Offline download cancelled. No game file was created. You can retry.' });
    return true;
  }
  return { start, cancel, state: () => state };
}
