import { loadOfflineRecipe } from './offline-recipe.js';
// Bound untrusted manifest sizes before reading any payload into memory.
export const MAX_OFFLINE_BYTES = 512 * 1024 * 1024;

function offlineAbort() {
  const error = new Error('Offline game download cancelled.');
  error.name = 'AbortError';
  return error;
}
function checkOfflineAbort(signal) { if (signal?.aborted) throw offlineAbort(); }
function abortableOffline(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(offlineAbort()); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
    if (signal.aborted) abort();
  });
}

/** Reassemble bytes, never decode individual parts (UTF-8 can cross a boundary).
 * Progress counts received/reassembled payload bytes, not network traffic: the
 * browser may serve any response from cache. Callers may pass {signal,onProgress}.
 * Runtime size checks remain compatible with byte-only historical manifests;
 * schema-2 source/checksum provenance is independently checked by the release gate.
 */
export async function loadOfflineGame(fetcher = globalThis.fetch, { signal, onProgress } = {}) {
  if (typeof fetcher !== 'function') throw new TypeError('Offline game download requires a fetch function.');
  let totalBytes = null, totalParts = null, downloadedBytes = 0, completedParts = 0;
  const report = phase => {
    checkOfflineAbort(signal);
    onProgress?.({ phase, totalBytes, totalParts, downloadedBytes, completedParts, source: 'hosted-parts' });
    checkOfflineAbort(signal);
  };
  const request = url => { checkOfflineAbort(signal); return abortableOffline(fetcher(url, { signal }), signal); };
  report('manifest');
  const response = await request('./offline/manifest.json');
  checkOfflineAbort(signal);
  if (!response?.ok) throw new Error('The offline game manifest could not be downloaded.');
  const manifest = await abortableOffline(response.json(), signal);
  checkOfflineAbort(signal);
  if(manifest?.schemaVersion===3)return loadOfflineRecipe(manifest,fetcher,{signal,onProgress,maxBytes:MAX_OFFLINE_BYTES});
  const validSize = value => Number.isSafeInteger(value) && value > 0 && value <= MAX_OFFLINE_BYTES;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)
      || !validSize(manifest.bytes) || !Array.isArray(manifest.parts)
      || manifest.parts.length < 1 || manifest.parts.length > 64) {
    throw new Error('The offline game manifest is invalid.');
  }
  let total = 0;
  for (const [index, part] of manifest.parts.entries()) {
    if (!part || typeof part !== 'object' || Array.isArray(part)
        || typeof part.file !== 'string' || !/^game-\d{2}\.part$/.test(part.file)
        || part.file !== `game-${String(index + 1).padStart(2, '0')}.part` || !validSize(part.bytes)) {
      throw new Error('The offline game manifest contains an invalid part.');
    }
    total += part.bytes;
    if (!Number.isSafeInteger(total) || total > MAX_OFFLINE_BYTES) throw new Error('The offline game manifest is too large.');
  }
  if (total !== manifest.bytes) throw new Error('The offline game manifest has inconsistent byte counts.');
  totalBytes = manifest.bytes; totalParts = manifest.parts.length;
  report('loading');

  const chunks = [];
  for (const part of manifest.parts) {
    const result = await request(`./offline/${part.file}`);
    checkOfflineAbort(signal);
    if (!result?.ok) throw new Error(`Offline game part ${part.file} could not be downloaded.`);
    let received = 0;
    const accept = chunk => {
      checkOfflineAbort(signal);
      const size = chunk.byteLength;
      if (!Number.isSafeInteger(size) || received + size > part.bytes) {
        throw new Error(`Offline game part ${part.file} has an unexpected byte count.`);
      }
      received += size; downloadedBytes += size; chunks.push(chunk);
      report('loading');
    };
    if (typeof result.body?.getReader === 'function') {
      const reader = result.body.getReader();
      let finished = false, cancelled = false;
      const cancel = () => {
        if (cancelled) return;
        cancelled = true;
        try { Promise.resolve(reader.cancel()).catch(() => {}); } catch { /* The aborted reader may already be closed. */ }
      };
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        checkOfflineAbort(signal);
        while (true) {
          const { done, value } = await abortableOffline(reader.read(), signal);
          checkOfflineAbort(signal);
          if (done) { finished = true; break; }
          if (!(value instanceof Uint8Array)) throw new Error(`Offline game part ${part.file} contains invalid bytes.`);
          accept(value);
        }
      } finally {
        signal?.removeEventListener('abort', cancel);
        if (!finished) cancel();
        try { reader.releaseLock(); } catch { /* Cancellation can leave an ignored read pending in a custom fetcher. */ }
      }
    } else {
      const chunk = await abortableOffline(result.arrayBuffer(), signal);
      if (!(chunk instanceof ArrayBuffer)) throw new Error(`Offline game part ${part.file} has an unexpected byte count.`);
      accept(chunk);
    }
    if (received !== part.bytes) throw new Error(`Offline game part ${part.file} has an unexpected byte count.`);
    completedParts++; report('loading');
  }
  report('assembling');
  const game = new Blob(chunks, { type: 'text/html;charset=utf-8' });
  if (game.size !== totalBytes) throw new Error('The offline game download is incomplete.');
  report('complete');
  return game;
}
