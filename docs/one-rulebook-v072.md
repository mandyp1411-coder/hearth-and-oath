# v0.72: One Rulebook

**v0.72.0 takes the cutover.** The main game plays the new rules only
(`rulebook.js`, `MAIN_ADMITS = 'new'`). The owner took it on 25 October 2026
before the farmer playtest, which still gates every new kind of life; the
archive has its verified public home (v0.71.2). Old-rules lives meet their
door (below) and play on in the archive. **v0.72.1** stops reading them at
all ([below](#v0721-the-old-lives-are-kept-as-written)); the old rules' engine
code is still in main and leaves next, subsystem by subsystem. The sections
below are the preparation that led here.

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

The Ironman records were still open here: `decodeIronmanRecord` uses the
same decoder, so under a decoder that refuses old rules an old Ironman record
would have made run discovery fail as unreadable. v0.72.1 gives them their
own kept path (below).

## v0.72.1: the old lives are kept as written

The app's store decoder is `storedLifeDecoder(MAIN_ADMITS, migrateSave)`
(rulebook.js): a stored life is decoded only when its own raw markers, a
station or a debt ledger, say new rules. An old life is never migrated or
validated here; the store keeps it as written (step 1 above), so no line of
the old rules' code runs on it in main and its export is its stored bytes,
which the archive reads with its own migrations.

- **Kept Ironman runs.** `discover` keeps a record that is whole and well
  formed (it passes the same envelope and Ironman checks it passed when it
  was written) and whose life the decoder refuses; a record whose life
  decodes to something else is unreadable, as before. A kept run holds its
  slot, answers only the `export` inspection, refuses every other intent,
  commit and reattachment with `kept-position`, and is released (the same
  life re-persisted with no attachment) or deleted only by reviewed token.
  A released kept run is listed among the retained positions, still
  exportable, never reattached or revoked.
- **The mirror-only life.** A life known only from the single-save mirror
  (`hearth-and-oath:life:v1`, before slots) is kept as slot 0; the next save
  writes it into the envelope as it was. Before, a refused mirror life would
  have been overwritten by the first save.
- **Old files and backups.** An imported file is read raw first: an old life
  meets the door without being decoded. An old previous life kept undecoded
  in a slot's backup is offered for review from the drawer and the recovery
  dialog, meets `OLD_RULES_BACKUP_DOOR` and exports exactly as stored; the
  delete review names it.
- **Removed.** The decoded-but-refused slot paths (no build reaches them now:
  under `NEW_ONLY` an old life is never decoded, under `BOTH` nothing is
  refused) and an unused single-save reader in app.js.

`tests/kept-ironman.test.js` (9 tests) covers discovery beside a kept run,
every refused intent, the whole export, release and deletion by review, the
unchanged unreadable case, the mirror-only life, and the app's kept-run row,
review, release, retained list and kept old backup.

## v0.72.2: one rulebook in the engine

The debt ledger's edition checks are deleted, with the old rules' side of each:
health (mortality by the elder ages and illness, a break at full Stress, the
severe-illness roll), the budget (the old free support in place of borrowing,
the interest guard, repayment offered to every life), careers (the tired
worker's refusal, the worn wage), the passive wage factor, fortune and the
guild's arrears into debt, the farmer's opening and its cost line, nature
(`natureEdition`: no trait carries an attribute bonus; `traitAttributeBonuses`
is gone), and the voice (`voice.js` speaks for every life). Every heir starts
with a ledger.

`migrateSave` reads any life into the one rulebook. A life from before the
ledger gets the stated defaults on reading: `openLedger` (nothing owed,
nothing borrowed) and fortune from the day it is read; no station and no date
are invented. This is the engine's behaviour, not a player's: the app's
store never decodes an old-rules life (`storedLifeDecoder` reads the raw
markers first), so an old save is still kept as written and sent to the
archive. The pre-v0.72 harness route (`harnessRulebooks`, `rulebooks:
'both'`) is gone: UI tests that played old captures read them into the
rulebook (`tests/helpers/one-rulebook.mjs`), and tests of the door store old
lives as written. Real new-rules saves change in nothing they hold: step 71.

Still to go: the six station-gated systems (v0.72.3), the older room engine
and old pages once no life can reach them, and the pre-edition migrations.

## v0.72.3: every life has the whole world

The six station checks are deleted (`edition = s => !!s.hero.station` in
schooling, living-world, guild, delve, battlecraft and faith). Migration step
72 gives a life that predates any of them its stated defaults on reading:
`initializeSchooling` without `born` makes a life past six literate with
letters `'before'` and no shrine place; `initializeGuild` without `born`
decides no guild family; the living world, the delves, battlecraft and the
cloth begin empty from the season they are read. A birth passes `born: true`
(`createBirthGame`, lineage's successor).

What leaves with the checks: the free school and the service scholarship (the
schooling handlers no longer ask whether a life has schooling), the realm's
four-year calendar wars and the regional world's border tension (both were
already off on a living world), and the maze route for the board's descent
and the five campaign dungeons. `startDungeon` resumes a dungeon walked in the
older room engine there (`dungeonRecords`), one begun in the maze there
(`mazeBegun` in maze-rules.js), and sends every other entry to the delve;
`isDelveEntry` refuses an `explore_enter_*` whose authored maze was begun.
The regional (`rpg_enter_*`) and contract (`adventure_pursue_*`) descents stay
mazes.

One check was not what the notes said. The fortune table's levy carried two
`onlyIf` keys, and the second (an active war) won, so the levy fell on living
worlds whenever the courts were at war. It stays as new lives met it; only
the dead key goes. Three generated lives aged a year are identical to
v0.72.2's apart from the step they carry.

The free scholarship's listing and its dead action handler leave household.js;
a scholarship scene left open, or a reading-room promise made, before schooling
(v0.61 to v0.63) is still answered and kept. One bug found on the way: the first
lesson of a school year carries the year's tuition as its cost, which the engine
takes before the handler runs, and the handler then asked the purse again, so a
child holding exactly the fee was refused after paying. `schoolReason` now takes
`feeCharged` for that lesson (regression in education-v64).

Tests follow: maze tests descend by contract (`contractDescent`) or a regional
road, authored-maze tests stand in genuine begun mazes (the v0.59 capture's
Covenant Core, and `tests/fixtures/maze-identity/v0722-begun-authored.json.gz`
written by v0.72.2's own engine through `scripts/fixtures/generate-begun-mazes.mjs`),
the rebuild campaign walks its delves through their lairs, tests that check
migration changes nothing else apply `statedDefaults`, long-life policies let
the new systems' scenes take their course (`continue`), fixtures that relied on
free school find their fees as controlled data, and the regional-world and war
tests start their wars through a court (`startRegionalWar`).

Still to go: the older room engine and the radiant maze, which no new entry
reaches now, and the old pages; the pre-edition migrations.

## v0.72.4: the older walks end

The expedition engines no admitted life could still begin are deleted: the
room engine (`state.dungeon`: `enterDungeon`, its rooms, scenes and
`dungeon` battles), the board's descent through rooms (`adventuring.expedition`
and the `adventure_room` scene, with radiant-descent.js), the radiant maze's
start, the v0.27 regional rooms (`rpg.expedition` and the boss rooms), and the
contract fought as one battle. Their pages go with them (dungeon-crawler-ui.js,
radiant-ui.js, spatial-controls.js, dungeon-directions.js, the descent and
dungeon graphs in depth-ui-v27.js and exploration-ui.js, and the styles only
those pages used), as do two stale browser scripts that walked the room
engine and were run by nothing.

Every life admitted since the maze arrived (v0.31) was born with a maze book,
so only a life begun under the old rules can have been saved in one of these
walks. Reading such a life ends the walk where it stands (`closeOlderWalks`,
engine.js, applied in `migrateSave` before validation): the dungeon's rooms go
to `flags.dungeonRecords`, the descent to a row of `adventuring.history`, the
regional descent to `rpg.expeditions` with no pending room, and a room's scene
or fight ends with it. Nothing is paid back and nothing found is invented. The
three fields stay in the save's shape and the validators require them null;
the records, including radiant maze receipts in genuine new-rule histories,
stay valid. Migration step 73 names the change.

What the walks' guards did now belongs to the maze and the delve: the dungeon's
music, town contacts and replies that wait, the scene's way back, the place
card's "return from the dungeon first", and the first day's guide. The board's
stair and the campaign doors are offered only to a life with the delve (every
read life has it from step 72). The exploration module keeps the campaign
places' data, their doors and the validator for their kept records.

Tests follow: tests and goldens of the deleted engines leave (authored-content
parity, dungeon-focus, boss-story legacy parity); `tests/older-walks-v0724.test.js`
reads the three genuine mid-walk captures (legacy-v3's battle, legacy-v4's
dungeon, the v0.27 descent) and the release saves with `assertOlderWalkClosed`;
the life-tools offline checker camps in a contract's maze; an older contract's
single-battle attempt is held as data where the archive receipt needs one.

Still to go: the old academy's `study`/`take_exam`, still offered and still
feeding wages through `flags.certified` (a design decision), and the
pre-edition migrations.

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
