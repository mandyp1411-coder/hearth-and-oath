import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachedStorage } from '../dist/js/save-storage.js';

// A minimal fake of the IndexedDB surface save-storage.js uses: one object
// store, transactions that complete asynchronously, optional failure.
function fakeDatabase({ failAfter = Infinity } = {}) {
  const rows = new Map();
  let writes = 0;
  const db = {
    rows, log: [],
    transaction(_store, mode) {
      const ops = [];
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
      const store = {
        put(value, key) { ops.push(['put', key, value]); },
        delete(key) { ops.push(['delete', key]); },
      };
      tx.objectStore = () => store;
      queueMicrotask(() => {
        if (mode === 'readwrite' && ++writes > failAfter) { tx.error = new Error('disk full'); tx.onerror?.(); return; }
        for (const [op, key, value] of ops) { db.log.push([op, key]); if (op === 'put') rows.set(key, value); else rows.delete(key); }
        tx.oncomplete?.();
      });
      return tx;
    },
  };
  return db;
}

test('reads are synchronous from the cache and writes reach the database in order', async () => {
  const db = fakeDatabase();
  const storage = createCachedStorage(db, new Map([['hearth-and-oath-legacy:slots:v1', 'old']]));
  assert.equal(storage.getItem('hearth-and-oath-legacy:slots:v1'), 'old');
  assert.equal(storage.getItem('missing'), null);
  storage.setItem('hearth-and-oath-legacy:slots:v1', 'new');
  storage.setItem('hearth-and-oath-legacy:life:v1', 'life');
  storage.removeItem('hearth-and-oath-legacy:life:v1');
  assert.equal(storage.getItem('hearth-and-oath-legacy:slots:v1'), 'new');
  assert.equal(storage.getItem('hearth-and-oath-legacy:life:v1'), null);
  assert.equal(storage.length, 1);
  assert.equal(storage.key(0), 'hearth-and-oath-legacy:slots:v1');
  await storage.flushed();
  assert.deepEqual(db.log, [['put', 'hearth-and-oath-legacy:slots:v1'], ['put', 'hearth-and-oath-legacy:life:v1'], ['delete', 'hearth-and-oath-legacy:life:v1']]);
  assert.deepEqual([...db.rows], [['hearth-and-oath-legacy:slots:v1', 'new']]);
});

test('a failed database write marks the storage degraded and later writes throw like a full localStorage', async () => {
  const errors = [];
  const db = fakeDatabase({ failAfter: 1 });
  const storage = createCachedStorage(db, new Map(), { onFlushError: error => errors.push(error.message) });
  storage.setItem('a', '1');
  await storage.flushed();
  storage.setItem('b', '2');
  await storage.flushed();
  assert.equal(errors.length, 1);
  assert.equal(storage.degraded, true);
  assert.throws(() => storage.setItem('c', '3'));
  // The cache still answers reads so an export remains possible.
  assert.equal(storage.getItem('b'), '2');
});

test('changes from another tab update the cache and reach onChange listeners like a storage event', () => {
  const channel = { posted: [], postMessage(message) { this.posted.push(message); }, onmessage: null };
  const storage = createCachedStorage(fakeDatabase(), new Map(), { channel });
  const seen = [];
  storage.onChange(event => seen.push(event));
  storage.setItem('hearth-and-oath-legacy:slots:v1', 'mine');
  assert.deepEqual(channel.posted, [{ key: 'hearth-and-oath-legacy:slots:v1', oldValue: null, newValue: 'mine' }]);
  channel.onmessage({ data: { key: 'hearth-and-oath-legacy:slots:v1', oldValue: 'mine', newValue: 'theirs' } });
  assert.equal(storage.getItem('hearth-and-oath-legacy:slots:v1'), 'theirs');
  assert.deepEqual(seen, [{ key: 'hearth-and-oath-legacy:slots:v1', oldValue: 'mine', newValue: 'theirs' }]);
  channel.onmessage({ data: { key: 'hearth-and-oath-legacy:slots:v1', oldValue: 'theirs', newValue: null } });
  assert.equal(storage.getItem('hearth-and-oath-legacy:slots:v1'), null);
});
