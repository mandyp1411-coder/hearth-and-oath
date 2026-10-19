import { offlineDownloadBusy } from './offline-download.js';

export function offlineDownloadView(state) {
  const busy = offlineDownloadBusy(state), known = Number.isSafeInteger(state.totalBytes) && state.totalBytes > 0;
  const count = value => value.toLocaleString('en-US');
  const size = known ? `${count(state.totalBytes)} bytes${state.totalBytes >= 1048576 ? ` (${(state.totalBytes / 1048576).toFixed(1)} MiB)` : ''}` : 'Size is checked before game data is requested.';
  const received = known ? `${count(state.downloadedBytes)} / ${count(state.totalBytes)} bytes reassembled${state.totalParts ? ` · ${state.completedParts} / ${state.totalParts} parts complete` : ''}.` : '';
  const messages = { idle: 'Save one complete HTML file with all artwork and music.', manifest: state.source === 'local-copy' ? 'Preparing a fresh copy of this local game…' : 'Checking the offline game size…', loading: 'Receiving and reassembling the offline file…', assembling: 'Preparing the complete HTML file…', ready: 'Download started. Check your browser downloads; your browser controls saving.', cancelled: 'Cancelled. No game file was created. Retry starts from the beginning.', error: 'The game could not be prepared. No game file was created. Check your connection and retry.' };
  return { busy, known, size, received, message: messages[state.phase] || messages.idle, source: state.source === 'local-copy' ? 'Copied from this local game, without network requests. No character or saved-life data is included.' : 'Includes all artwork and music, not your saved lives. Reassembled bytes are not network-transfer progress: your browser may use cached files. No time estimate is available.', action: busy ? 'Preparing offline game…' : ['cancelled', 'error'].includes(state.phase) ? 'Retry offline download' : 'Download offline game ↓' };
}

export function renderOfflineDownload(state) {
  const view = offlineDownloadView(state);
  return `<section class="offline-download" data-offline-download aria-labelledby="offline-download-title"><h3 id="offline-download-title">Keep the whole game</h3><p data-offline-message>${view.message}</p><p class="offline-download-size" data-offline-size>${view.size}</p><progress data-offline-progress aria-label="Offline file bytes reassembled" ${view.known ? `max="${state.totalBytes}" value="${state.downloadedBytes}"` : ''} ${view.busy ? '' : 'hidden'}></progress><p data-offline-received>${view.received}</p><p class="offline-download-source" data-offline-source>${view.source}</p><div class="offline-download-actions"><button class="button ghost" type="button" data-op="download-game" ${view.busy ? 'disabled' : ''}>${view.action}</button><button class="button secondary" type="button" data-op="cancel-game-download" ${view.busy ? '' : 'hidden'}>Cancel download</button></div><p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-offline-announcement></p></section>`;
}

/** Update only this small panel, retaining focused buttons and the game DOM. */
export function updateOfflineDownload(root, state) {
  const panel = root.querySelector('[data-offline-download]');
  if (!panel) return;
  const view = offlineDownloadView(state), find = name => panel.querySelector(`[data-offline-${name}]`);
  for (const [name, text] of [['message', view.message], ['size', view.size], ['received', view.received], ['source', view.source]]) find(name).textContent = text;
  const progress = find('progress');
  progress.hidden = !view.busy;
  if (view.known) { progress.max = state.totalBytes; progress.value = state.downloadedBytes; }
  else { progress.removeAttribute('value'); progress.removeAttribute('max'); }
  const action = panel.querySelector('[data-op="download-game"]'), cancel = panel.querySelector('[data-op="cancel-game-download"]');
  const focused = (panel.ownerDocument || globalThis.document)?.activeElement;
  action.disabled = view.busy; action.textContent = view.action; cancel.hidden = !view.busy;
  if (view.busy && focused === action) cancel.focus({ preventScroll: true });
  else if (!view.busy && focused === cancel) action.focus({ preventScroll: true });
  const announcement = find('announcement');
  if (announcement.textContent !== state.announcement) announcement.textContent = state.announcement;
}
