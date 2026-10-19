import { copyPersonalNote } from './personal-notes.js';

// Existing generic maze text. Authored/signature archives keep their own work
// handlers. A mutable personal copy is not the earned discovery's proof.
const titles = ['A Mason’s Mark', 'Names on the Wall', 'A Faded Route Sketch', 'A Carved Memorial', 'A Warning in Charcoal', 'A Painted Doorway'];
const lines = [
  'The last repair crew marked a dry sleeping place beside the western wall.',
  'A mason recorded the names of workers who never returned to the surface.',
  'A traveller scratched a warning about loose floors beside an old stair.',
  'The old keepers stored water above the damp line and food behind sealed doors.',
  'A faded note describes a family sheltering here during a winter siege.',
  'Someone added a small farewell beneath an unfinished route sketch.',
];
export function genericMazeInscriptionNote(room) {
  if (!room || room.kind !== 'inscription' || room.contentSlot || !Number.isSafeInteger(room.variant) || room.variant < 0 || room.variant >= lines.length) return null;
  return { title: titles[room.variant], text: lines[room.variant] };
}
export function inscriptionNotebookCopyNotice(copy) {
  if (copy.copied) return 'An editable copy was kept in this life’s personal notes. The earned discovery remains in Journal Archive.';
  if (copy.reason === 'full') return 'This life’s personal notebook is full (100 notes). No note was replaced; the discovery is kept in Journal Archive.';
  return 'No editable personal copy could be kept safely. Existing notes are unchanged; the discovery is kept in Journal Archive.';
}
/** Always records the same literal earned Journal proof, independently of
 * editable notebook capacity. Only its callers clear the room/debit assistance.
 * Return {title,text,notebookCopy,notebookCopyNotice}, or false for a non-generic
 * room. notebookCopy is copyPersonalNote's transient result, never saved proof. */
export function recordGenericMazeInscription(state, room, ctx = {}) {
  const note = genericMazeInscriptionNote(room);
  if (!note) return false;
  (ctx.journalLiteral || ctx.journal)?.('A Note from Below', note.text, 'exploration', { narrativeEdition: 30 });
  const notebookCopy = copyPersonalNote(state, note.title + ': ' + note.text);
  return { ...note, notebookCopy, notebookCopyNotice: inscriptionNotebookCopyNotice(notebookCopy) };
}
