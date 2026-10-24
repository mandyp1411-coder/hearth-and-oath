# v0.72: One Rulebook — preparation

The owner has authorized beginning this release. The published game remains
v0.71.2. This branch first protects saved lives and maps the cutover. The
first runtime change separates durable decoding from incoming-write
admission; the current game still admits both rulebooks. No compatibility
is removed and v0.72 is not claimed shipped.

## Gates before the cutover

The complete public archive browser export/import/play/export/import loop
remains NOT RUN. The public home and source-engine handoff have evidence in
[the archive record](measures/archive-v0712-verification.md); those checks
do not establish browser storage or file-transfer behavior.

The real farmer life and heir chapter playtest remains NOT RUN. The
[protocol and materials](playtests/farmer-v071.md) require six to eight new
players plus the owner and a written verdict. Automated lives cannot supply
that verdict. Keep the live game and its compatibility until these gates
have actual evidence. Do not repeat the stalled browser transfers as part of
this preparation.

## First engineering slice

`node scripts/plan-one-rulebook.mjs` writes a repeatable source inventory
under `artifacts/one-rulebook-v072/`. It includes file hashes, source
positions, bounded context and direct static imports for station/debt
markers, edition policy and saved expedition/combat modes. It reads all
JavaScript files, including comments and strings. Counts are textual review
candidates, not a count of obsolete branches or a proof of complete coverage.
Aliases, computed properties and other historical feature flags still need
manual review. The tool never edits runtime files or decides a release gate.

`tests/one-rulebook-retention.test.js` uses genuine v0.60/v0.69 exports in a
mixed three-slot envelope with an old backup behind a new life. It checks
whole-state read/reload, occupancy, complete downloads through the actual
app handlers, and backup review/cancellation. It adds no browser claim.

The key finding is `createSaveStore(storage, migrateSave)` in `app.js`.
The store treats a rejected decoded slot as `state: null`. A mixed envelope
remains compatible if another life survives, and rejected backups are
omitted. Making `migrateSave` refuse old rules before separating storage
retention from simulation admission could expose an occupied slot as empty.

## Implemented storage boundary

`createSaveStore(storage, decodeStoredLife, {acceptPosition})` now separates
retained reads from incoming writes. Existing callers omit the optional
predicate and keep their behavior. A future policy can reject a decoded
incoming position without changing old slots, backups, selection, revision
tokens or earlier unsaved work. Decoding remains able to read both rulebooks.

The predicate receives a detached snapshot and only literal `true` admits.
Exceptions and nonboolean results refuse the candidate. Admission is
synchronous; a native Promise is refused and its rejection consumed. A
predicate cannot mutate the accepted candidate through its snapshot.

The boundary applies to ordinary write/replacement and Ironman
create/import/continue commits. Read, reload, backup/export, existing-head
inspection, revocation, archive/delete, reattachment and terminal marker
cleanup still use the decoder. Ironman inspection may offer a review that
the later commit refuses with `position-not-admitted`; the eventual UI must
check simulation admission before adopting or writing the position.

This first slice was not the simulation-entry cutover or an independent
raw-old-save decoder. `app.js` continues using the current decoder and default policy.
Removing old engine decoding before its read/export replacement exists would
still be wrong. `tests/save-admission.test.js` exercises stricter policies on
real historical snapshots while keeping the live game's policy unchanged.

## Implemented entry boundary

The next slice connects one optional `positionAdmissionPolicy` to ordinary
entry, incoming writes and Ironman sessions. It remains **undefined** in
`app.js`: both rulebooks still play, and no gate is waived.

`life-entry.js` checks reviewed replacements before queueing and inside the
save lock. It captures the reviewed JSON, cancels a dismissed view or an
altered incoming payload, and preserves the existing target token. A policy
refusal has its own result, separate from storage failure. Imports, backup
confirmation and Standard creation use this coordinator. Slot load, unsaved
title return, resume and final adoption check before resetting the live
position or selecting a slot. Explicit conflict reload still discards the
old session; if fresh entry is refused it renders the retained save list
instead of leaving a stale dialog or a game against a rebased store.

`position-admission.js` shares the existing detached, synchronous strict-true
predicate semantics. The unset default avoids extra JSON snapshots. Session
entry sends the raw policy as `acceptForPlay` to the store: actual resume,
commit and reattachment are checked under their lock against the decoded
position, after ended-marker recognition and before entry-related writes or
adoption. The last session adoption fence precedes the app's `onAdopt` side
effects. A later refusal retains an uncertain operation's original candidate,
token and obligation. Export, archive/delete, revocation and death cleanup
remain available independently of entry policy.

Configured-policy tests use actual stores and sessions with genuine saved
lives, plus bounded lock/modern Ironman opt-in fixtures. The actual app
handler tests retain today's default policy. These checks do not prove the
future cutover UI under a restrictive policy. Independent raw old-save
decoding and export/recovery UI still need completion before removing the
old engine; in particular, a retained Ironman export must not require first
adopting a life that the future policy refuses.

The [entry verification record](measures/one-rulebook-v072-entry-verification.md)
records a fresh frozen replay: 500 selected tests in 31 save/creation/entry/
Ironman/edition files passed, zero failures/skips, plus one compiled session
with 14 bounded cases. Source, HEAD and artifact guards passed. Full release
certification, browser handoff and real farmer/heir acceptance remain NOT RUN.

## The old life's door (step 3)

`rulebook.js` holds the one decision: `MAIN_ADMITS` is `both`, and
`admissionPolicy()` gives `life-entry.js`, the store and the Ironman session
`undefined` until the cutover. The cutover can be rehearsed: a page that sets
`globalThis.__hearthRehearseCutover = true` before load refuses old-rules lives
exactly as the cutover will (station or debt ledger, never a claimed stamp).
The switch can only refuse; nothing widens `MAIN_ADMITS`.

Under that policy the app shows the door, and opens nothing:

- The title continues the newest admitted life and counts the kept ones
  ("2 kept for the archive"); with no admitted life it shows the kept life
  with its export, the archive link and Begin a new life.
- An old slot says Kept for the archive, does not load, and keeps Export,
  Export for the archive and the delete review. A forced click opens nothing
  and writes nothing.
- An old file meets the archive's door (`OLD_RULES_DOOR`) instead of a slot.
- A kept Ironman run is exported from its authoritative head through the
  store's `export` inspection under the save lock, without being adopted.
  While both rulebooks play, an Ironman run is still resumed to export, as
  before.

`tests/old-life-door.test.js` mounts the actual app with the rehearsal on
genuine v0.60 and v0.69 saves (8 tests), and holds that nothing changes
while both rulebooks play.

## Lives this build cannot read are kept (step 1)

The store used to read a life it could not decode as an empty slot. The next
save of any other slot then wrote the envelope back without it and without
its backup, and a new life could take its slot unreviewed. That happens today
to a save written by a later build, and would happen to every old life the
day the engine stops decoding the old rules. `saves.js` now keeps such a life
exactly as stored (`slot.kept`, `backups[id].kept`): commit writes it back
byte for byte, `empty()` passes it over, a live position never writes over
it, replacing it needs review and makes it the slot's backup, deleting it
needs the same review as any life, and `store.kept(id)` gives its export.
Only a plain object naming a person is kept; anything else is still read as
nothing. The app shows it occupied (Kept as it was written, or Kept for the
archive for old rules), exports it whole (`export-kept`), and asks before a
new life takes its slot. `tests/kept-life.test.js` (7 tests) covers a later
build's life and the genuine v0.60 lives under the cutover's decoder.

Still open before the cutover: the Ironman records. `decodeIronmanRecord`
uses the same decoder, so under a decoder that refuses old rules an old
Ironman record would make run discovery fail as unreadable. That needs its
own kept path before the engine drops the old rules.

## Order of the eventual cutover

1. Preserve occupied old slots, backups and their complete exports before
   tightening admission. Keep raw retained data distinct from validated
   playable state. A retained life cannot count as an empty slot. Preserve
   concurrency tokens, explicit replacement/deletion review and Ironman
   authority; do not bypass them through a new export/recovery route.
2. Put rule admission at entry into simulation: title Continue, slot load,
   import confirmation, backup recovery, conflict reload, recovery and
   Ironman adoption. Classify by actual station **or** defined debt ledger,
   including a zero debt. Never trust a claimed edition stamp alone.
3. For old lives, offer their complete export and the public archive route
   without entering the main simulation or silently replacing anything. *(Built and
   rehearsable: see the old life's door above.)*
   Test a mixed envelope, all-old envelope, mirror-only life, backups,
   cross-tab changes and both ordinary/Ironman ownership flows.
4. Review the branches below individually through public engine commands.
   Preserve genuine new-rule historical lives and their captured pending
   work. A missing newer subsystem is not permission to invent its past.
5. Remove only branches proved unreachable for admitted new-rule lives.
   Update required test contracts deliberately; move equivalent old-rule
   gameplay coverage to the pinned archive rather than dropping it.
6. Run the required release checks from a stable snapshot, then review the
   actual browser handoff and UI changes. Merge and publish one release
   only after the gates have passed. Update the ledger and shipped notes
   with real results and identities.

## Review map

| Area | Main source | Decision and risk |
| --- | --- | --- |
| Read, export, import, recovery | `app.js`, `saves.js`, `save-storage.js`, Ironman modules | Preserve old occupancy and complete data before refusing simulation. Storage isolation and authority still apply. |
| Rule identity | `edition.js`, `archive-link.js` | Retain marker classification and export naming at the storage boundary. Birth version is actual history; do not infer it. |
| Budget and life | `engine.js`, `budget.js`, `health.js`, `careers.js`, `personality.js` | Review old wages, debt, mortality and seasonal fallbacks separately. A station check can also govern current social access. |
| Birth and succession | `engine.js`, `lineage.js`, `station.js` | Review both successor budget resets and station selection together. No retrospective field, debt, person or deed. |
| Edition systems | schooling, fortune, living world, guild, faith, delve, battlecraft, farmer | Initialization, eligibility and validation guards have different jobs. Removing every guard would manufacture history. |
| Saved expeditions | `maze-v31.js`, maze UI/map modules, `dungeon-crawler-ui.js`, engine entry/action handlers | New-rule historical saves can contain earlier descents. Decide a lossless continuation for each captured mode before removing its code. |
| Battles and practice | `combat.js`, `battle-ui.js`, `field-ui.js`, app battle view | `fieldVersion` describes a saved encounter. The generic battle view also serves current tactics rehearsal. It is not automatically obsolete. |

## Historical coverage to keep

The genuine v5 and v0.60 exports are old rules. Genuine v0.62/v0.66 exports
are new rules with earlier expedition systems; v0.69 has the later systems.
The new genuine v0.61 fixture comes from release merge
`55b8a510097db90424c2d692e44bfb7a72a4d509`. Birth, eighteen and later all
have no station and a defined zero-debt ledger. Two runs of the unchanged
historical generator produced identical complete JSON; the
[provenance](measures/v0610-save-fixture.json) pins the source and bytes.
The edition tests check migration and public continuation; write-admission
tests accept these actual debt-only lives. No modern save was edited to
claim historical coverage.

An unfinished older maze or battle on a new-rule life cannot be sent to the
current archive: the archive correctly refuses new-rule lives. Removing
that pending mode requires its own preservation decision, not a blanket
edition check. Optional state, old narrative versions, and absent later
systems can remain valid on a new-rule save.

Keep combat golden, tournament, second-wind, maze/dungeon, save recovery,
concurrency and Ironman tests until their equivalent contracts are reviewed.
`release-contract.json` requires historical files; a filename containing
“legacy” is not a removal criterion.

## Development verification

Run the focused preservation and inventory checks with:

```sh
node --test --test-concurrency=1 tests/one-rulebook-retention.test.js tests/one-rulebook-inventory.test.js tests/archive-link.test.js tests/save-snapshot-fixtures.test.js tests/edition-v70.test.js
```

The new storage-boundary regressions run with
`node --test tests/save-admission.test.js`. Before any merge, run the save,
concurrency and Ironman regressions and the release checks appropriate to
the final cutover; a focused development pass is not a release verdict.

These are preparation checks, not the complete FAST/SLOW lanes, the formal
release gate, browser evidence, or the human verdict. The generated inventory
stores the source identity actually read; regenerate it after source changes.

The initial focused run passed 17 checks, zero failed and zero skipped.
That initial source inventory had 299 JavaScript files and 338 textual
references: 80 station, 33 debt, 24 edition-policy and 201 saved-mode.
Its pre-refactor JavaScript inventory identity is
`93e0f538ef012168920eec8767ab93f2cf43eb7750844743f9b39950aa2d1517`.
That first preparation commit changed no runtime files. The later storage
boundary changes `dist/js/saves.js` and adds the genuine fixture and its
regressions. The package/version and release contract remain unchanged.
No deployment, full release gate or browser/human check is claimed here;
actual development results belong to the PR findings.

The first storage implementation passed 448 selected tests across 25 save,
Ironman, edition and cutover files, zero failures/skips, on frozen local
`27c924424a7577c08c0741e57918d448ee6890dc`. One exact compiled standalone
session passed 14 bounded cases. The strict content/import-graph build and
artifact identity passed. [The verification record](measures/one-rulebook-v072-storage-verification.md)
keeps the closed proof and the full-gate/browser/human checks still NOT RUN.
