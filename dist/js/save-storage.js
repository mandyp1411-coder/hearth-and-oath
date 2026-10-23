// Durable save storage without the localStorage quota.
//
// The save store (saves.js) and the Ironman store expect a synchronous
// `Storage`-shaped object: getItem / setItem / removeItem / key / length.
// localStorage gives that, but with a ~5 MB per-origin ceiling that a long
// life exceeds. This module provides the same interface backed by an
// in-memory cache that is flushed, write by write and in order, to an
// IndexedDB object store, which browsers size in hundreds of megabytes.
//
// `openSaveStorage()` loads the cache once before the app module runs. When
// IndexedDB is unavailable (private windows in some browsers, file: URLs,
// blocked storage) it returns localStorage, and when even that is blocked it
// returns null, which the app already treats as "storage unavailable".
//
// First run on a browser that already holds localStorage saves: every
// `hearth-and-oath-legacy:` key is copied into IndexedDB once, then localStorage
// keeps a shrinking mirror only of the small settings keys. The large
// save keys are removed from localStorage after the copy so the quota is
// freed, and they are never written there again.
//
// Cross-tab coordination: writes to any key are announced on a
// BroadcastChannel, and listeners registered through `onChange` receive
// `{key, oldValue, newValue}` the way a `storage` event would.

const DB_NAME = 'hearth-and-oath-legacy';
const DB_VERSION = 1;
const STORE = 'keyvalue';
const CHANNEL = 'hearth-and-oath-legacy:storage';
const OWNED_PREFIX = 'hearth-and-oath-legacy:';

const idb = () => { try { return globalThis.indexedDB || null; } catch { return null; } };

function openDatabase() {
  return new Promise((resolve, reject) => {
    const factory = idb();
    if (!factory) { reject(new Error('IndexedDB unavailable')); return; }
    let request;
    try { request = factory.open(DB_NAME, DB_VERSION); } catch (error) { reject(error); return; }
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function readAll(db) {
  return new Promise((resolve, reject) => {
    const entries = new Map();
    let request;
    try { request = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor(); } catch (error) { reject(error); return; }
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(entries); return; }
      if (typeof cursor.key === 'string' && typeof cursor.value === 'string') entries.set(cursor.key, cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB read failed'));
  });
}

function writeBatch(db, operations) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(STORE, 'readwrite'); } catch (error) { reject(error); return; }
    const store = tx.objectStore(STORE);
    for (const [key, value] of operations) { if (value === null) store.delete(key); else store.put(value, key); }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
  });
}

/** A synchronous Storage facade over a cache, flushed in order to IndexedDB. */
export function createCachedStorage(db, initial = new Map(), { channel = null, onFlushError = () => {} } = {}) {
  const cache = new Map(initial);
  const listeners = new Set();
  let queue = [];
  let flushing = null;
  let failed = false;
  function schedule() {
    if (flushing || !queue.length) return;
    const batch = queue; queue = [];
    flushing = writeBatch(db, batch).catch(error => { failed = true; onFlushError(error); }).then(() => { flushing = null; schedule(); });
  }
  function announce(key, oldValue, newValue) {
    const event = { key, oldValue, newValue };
    try { channel?.postMessage(event); } catch { /* Announcements are best effort. */ }
  }
  const storage = {
    get length() { return cache.size; },
    key(index) { return [...cache.keys()][index] ?? null; },
    getItem(key) { return cache.has(String(key)) ? cache.get(String(key)) : null; },
    setItem(key, value) {
      if (failed) throw new Error('Save storage is no longer writable');
      const k = String(key), v = String(value), old = cache.has(k) ? cache.get(k) : null;
      cache.set(k, v); queue.push([k, v]); schedule(); announce(k, old, v);
    },
    removeItem(key) {
      const k = String(key);
      if (!cache.has(k)) return;
      const old = cache.get(k);
      cache.delete(k); queue.push([k, null]); schedule(); announce(k, old, null);
    },
    clear() { for (const key of [...cache.keys()]) storage.removeItem(key); },
    /** Resolves once every write issued so far has reached the database. */
    flushed() { return (flushing || Promise.resolve()).then(() => (queue.length || flushing ? storage.flushed() : undefined)); },
    /** Receive changes made in other tabs, shaped like a `storage` event. */
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** True when a write to the database has failed; the cache is still live. */
    get degraded() { return failed; },
    backend: 'indexeddb',
  };
  if (channel) {
    channel.onmessage = message => {
      const event = message?.data;
      if (!event || typeof event.key !== 'string') return;
      if (event.newValue === null) cache.delete(event.key); else cache.set(event.key, event.newValue);
      for (const listener of listeners) { try { listener(event); } catch { /* One listener must not block the rest. */ } }
    };
  }
  return storage;
}

const SETTINGS_KEYS = ['hearth-and-oath-legacy:audio', 'hearth-and-oath-legacy:display'];

/** Copy existing localStorage saves into the database once; free the quota. */
async function migrateFromLocalStorage(db, cache, local) {
  if (!local) return;
  const moved = [];
  let keys = [];
  try { for (let i = 0; i < local.length; i++) { const key = local.key(i); if (key && key.startsWith(OWNED_PREFIX)) keys.push(key); } } catch { return; }
  for (const key of keys) {
    if (cache.has(key)) continue;
    let value = null;
    try { value = local.getItem(key); } catch { continue; }
    if (typeof value !== 'string') continue;
    cache.set(key, value); moved.push([key, value]);
  }
  if (moved.length) await writeBatch(db, moved);
  // Settings stay mirrored in localStorage for the audio/display modules.
  for (const [key] of moved) { if (!SETTINGS_KEYS.includes(key)) { try { local.removeItem(key); } catch { /* Quota freeing is best effort. */ } } }
}

/**
 * Open the durable storage used for saves. Returns a synchronous Storage
 * facade (IndexedDB-backed), or localStorage when IndexedDB is unavailable,
 * or null when nothing can be used.
 */
export async function openSaveStorage({ local = (() => { try { return globalThis.localStorage; } catch { return null; } })(), timeoutMs = 4000 } = {}) {
  let db;
  try {
    db = await Promise.race([openDatabase(), new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB open timed out')), timeoutMs))]);
  } catch { return local ?? null; }
  let cache;
  try { cache = await readAll(db); } catch { try { db.close(); } catch {} return local ?? null; }
  try { await migrateFromLocalStorage(db, cache, local); } catch { /* A failed copy leaves localStorage intact. */ }
  let channel = null;
  try { channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null; } catch { channel = null; }
  return createCachedStorage(db, cache, { channel, onFlushError: error => console.error('Hearth & Oath: a save could not be written to the database.', error) });
}
