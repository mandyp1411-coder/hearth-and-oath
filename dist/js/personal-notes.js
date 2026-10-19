// Personal reminders are separate from earned events, lore and quest receipts.
// Reads are pure. Current capacity belongs to one life; closed lives keep their
// own bounded notebooks in the dynasty history instead of filling an heir's bag.
export const PERSONAL_NOTE_LIMIT = 100;
export const PERSONAL_NOTE_LENGTH = 2000;
const metadata = ['id', 'ownerId', 'generation', 'noteVersion', 'archived'];
const hasMetadata = n => metadata.some(key => Object.hasOwn(n, key));
export function personalNoteOwner(s) {
  const d = s?.dynasty;
  return d?.activePersonId && Number.isSafeInteger(d.generation) ? { ownerId: d.activePersonId, generation: d.generation } : null;
}
function ownership(s, note) {
  if (hasMetadata(note)) return { ownerId: note.ownerId, generation: note.generation };
  // A successor can begin on the same world day. Neither dates nor ID spelling
  // prove the owner of an unattributed note in a later-generation legacy save.
  const owner = personalNoteOwner(s);
  return owner?.generation === 1 ? owner : null;
}
export const personalNoteKey = n => n.ownerId ? `${encodeURIComponent(n.ownerId)}:${n.generation}:${n.id}` : `legacy:${n.id}`;
function currentRows(s) {
  const current = personalNoteOwner(s); let unknown = (s.legacyPlayerNotes || []).length;
  return (s.playerNotes || []).map((note, index) => {
    const owner = ownership(s, note), own = Boolean(owner && current && owner.ownerId === current.ownerId && owner.generation === current.generation);
    return { ...note, id: note.id || (owner ? `legacy-note-${index + 1}` : `unattributed-note-${++unknown}`), archived: note.archived === true, ownerId: owner?.ownerId || null, generation: owner?.generation || null, ownerName: own ? s.hero.name : 'Unattributed earlier note', own, source: own ? 'current' : 'legacy', index };
  });
}
export function personalNoteRows(s) {
  const current = currentRows(s), legacy = (s.legacyPlayerNotes || []).map((note, index) => ({ ...note, id: `unattributed-note-${index + 1}`, archived: false, ownerId: null, generation: null, ownerName: 'Unattributed earlier note', own: false, source: 'legacy' }));
  const history = (s.dynasty?.history || []).flatMap(h => (h.personalNotes || []).map(note => ({ ...note, ownerName: h.name, own: false, source: 'history' })));
  return [...current, ...legacy, ...history].map(n => ({ ...n, key: personalNoteKey(n) }));
}
export function reviewPersonalNote(s, key) {
  const row = currentRows(s).find(n => personalNoteKey(n) === key && n.own);
  return row ? { id: row.id, key, ...personalNoteOwner(s), fingerprint: JSON.stringify(s.playerNotes[row.index]) } : null;
}
function withMetadata(s, note, index) {
  if (hasMetadata(note)) return structuredClone(note);
  const owner = ownership(s, note);
  return owner ? { ...structuredClone(note), id: `legacy-note-${index + 1}`, ...owner, noteVersion: 0, archived: false } : structuredClone(note);
}
// Called only by a deliberate write or successor transition. Unknown legacy
// notes have one lifetime pool of at most the original 100, never a pool per heir.
function partitionNotes(s) {
  const current = [], unknown = structuredClone(s.legacyPlayerNotes || []);
  for (const [index, note] of (s.playerNotes || []).entries()) {
    if (ownership(s, note)) current.push({ note, index });
    else unknown.push(structuredClone(note));
  }
  return { current, unknown };
}
export function closedLifePersonalNotes(s) {
  const { current, unknown } = partitionNotes(s);
  return { personalNotes: current.map(({ note, index }) => withMetadata(s, note, index)), legacyPlayerNotes: unknown };
}
/** Mutates only personal-note storage after every preflight succeeds. It never
 * sets notice, spends resources or records earned proof. Failed copies leave
 * even absent fields and raw legacy metadata untouched. Return values are
 * transient, not save metadata: {copied, reason, id?, key?}. */
export function copyPersonalNote(s, text) {
  if (typeof text !== 'string' || !text.trim() || text.length > PERSONAL_NOTE_LENGTH) return { copied: false, reason: 'invalid_text' };
  const owner = personalNoteOwner(s);
  if (!owner) return { copied: false, reason: 'owner_unavailable' };
  const { current, unknown } = partitionNotes(s);
  if (current.length >= PERSONAL_NOTE_LIMIT) return { copied: false, reason: 'full' };
  if (unknown.length > PERSONAL_NOTE_LIMIT) return { copied: false, reason: 'legacy_limit' };
  const ids = new Set(currentRows(s).filter(n => n.own).map(n => n.id)); let number = 1;
  while (ids.has(`note-${number}`)) number++;
  const note = { day: s.day, text: text.trim(), id: `note-${number}`, ...owner, noteVersion: 0, archived: false };
  s.playerNotes = [...current.map(({ note }) => note), note];
  if (unknown.length) s.legacyPlayerNotes = unknown;
  return { copied: true, reason: null, id: note.id, key: personalNoteKey(note) };
}
export function appendPersonalNote(original, text) {
  const s = structuredClone(original), result = copyPersonalNote(s, text);
  if (result.copied) s.notice = 'Note kept.';
  else if (result.reason === 'owner_unavailable') s.notice = 'Load this life in the current format before keeping a personal note.';
  else if (result.reason === 'full') s.notice = 'Your current life has room for 100 personal notes, including its archived notes. Earlier lives keep their own notebooks separately.';
  return s;
}
function changePersonalNote(original, review, change) {
  const s = structuredClone(original), current = review && reviewPersonalNote(s, review.key);
  if (!current || current.id !== review.id || current.ownerId !== review.ownerId || current.generation !== review.generation || current.fingerprint !== review.fingerprint) { s.notice = 'This note or its owner changed. Nothing was overwritten; reopen the note to review it.'; return s; }
  const index = currentRows(s).find(n => n.id === review.id && n.own).index, note = withMetadata(s, s.playerNotes[index], index);
  if (note.noteVersion >= Number.MAX_SAFE_INTEGER - 1) return s;
  if (Object.hasOwn(change, 'text')) {
    if (note.archived || typeof change.text !== 'string' || !change.text.trim() || change.text.length > PERSONAL_NOTE_LENGTH || change.text === note.text) return s;
    note.text = change.text;
    s.notice = 'Your note was updated. Its original date is unchanged.';
  } else {
    if (typeof change.archived !== 'boolean' || change.archived === note.archived) return s;
    note.archived = change.archived;
    s.notice = note.archived ? 'Your note was archived, not deleted. Restore it from Archived personal notes.' : 'Your note was restored.';
  }
  note.noteVersion++;
  s.playerNotes[index] = note;
  return s;
}
export const editPersonalNote = (s, review, text) => changePersonalNote(s, review, { text });
export const archivePersonalNote = (s, review, archived) => changePersonalNote(s, review, { archived });
const basicNote = (n, day) => Boolean(n && typeof n === 'object' && !Array.isArray(n) && Number.isSafeInteger(n.day) && n.day >= 0 && n.day <= day && typeof n.text === 'string' && n.text.length > 0 && n.text.length <= PERSONAL_NOTE_LENGTH);
const validMetadata = n => metadata.every(key => Object.hasOwn(n, key)) && /^(?:note|legacy-note)-[1-9]\d{0,5}$/.test(n.id) && typeof n.ownerId === 'string' && n.ownerId.length > 0 && n.ownerId.length <= 160 && Number.isSafeInteger(n.generation) && n.generation > 0 && Number.isSafeInteger(n.noteVersion) && n.noteVersion >= 0 && n.noteVersion < Number.MAX_SAFE_INTEGER && typeof n.archived === 'boolean';
export function validHistoryPersonalNotes(h) {
  return h.personalNotes === undefined || Array.isArray(h.personalNotes) && h.personalNotes.length <= PERSONAL_NOTE_LIMIT && new Set(h.personalNotes.map(n => n?.id)).size === h.personalNotes.length && h.personalNotes.every(n => basicNote(n, h.endedDay) && validMetadata(n) && n.ownerId === h.personId && n.generation === h.generation);
}
export function validPersonalNotes(s) {
  if (s.playerNotes !== undefined && (!Array.isArray(s.playerNotes) || s.playerNotes.length > PERSONAL_NOTE_LIMIT)) return false;
  if (s.legacyPlayerNotes !== undefined && (!Array.isArray(s.legacyPlayerNotes) || s.legacyPlayerNotes.length > PERSONAL_NOTE_LIMIT || !s.legacyPlayerNotes.every(n => basicNote(n, s.day) && !hasMetadata(n)))) return false;
  const owner = personalNoteOwner(s), ids = new Set(); let unknown = (s.legacyPlayerNotes || []).length;
  for (const [index, n] of (s.playerNotes || []).entries()) {
    if (!basicNote(n, s.day)) return false;
    if (hasMetadata(n) && (!validMetadata(n) || !owner || n.ownerId !== owner.ownerId || n.generation !== owner.generation)) return false;
    const attributed = ownership(s, n), id = n.id || (attributed ? `legacy-note-${index + 1}` : `unattributed-note-${++unknown}`);
    if (ids.has(id)) return false;
    ids.add(id);
  }
  if (unknown > PERSONAL_NOTE_LIMIT) return false;
  const history = s.dynasty?.history || [];
  if (!Array.isArray(history) || history.length > 200) return false;
  for (const h of history) {
    if (!h || !validHistoryPersonalNotes(h) || h.personalNotes !== undefined && h.personId === owner?.ownerId) return false;
  }
  return true;
}
