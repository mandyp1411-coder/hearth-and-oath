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

This is not yet the simulation-entry cutover, nor an independent raw-old-save
decoder. `app.js` continues using the current decoder and default policy.
Removing old engine decoding before its read/export replacement exists would
still be wrong. `tests/save-admission.test.js` exercises stricter policies on
real historical snapshots while keeping the live game's policy unchanged.

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
   without entering the main simulation or silently replacing anything.
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
