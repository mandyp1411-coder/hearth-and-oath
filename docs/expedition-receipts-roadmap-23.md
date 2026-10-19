# Roadmap 23: expedition receipt, staged source implementation

## Status and scope

Current source includes the isolated accounting leaf, explicit runtime hooks
and compact UI. Pure contracts pass; runtime, semantic and rendered checks are
still pending, so this work is not release-ready. No main, build or publication
changes have been made.

The initial leaf checkpoint contained only the independent accounting module,
`dist/js/maze-receipts.js`, its pure tests, and this document. It is based on
main `b24cba83`. No engine, UI, migration, save-validator call site, build or
publication changes were included in that initial checkpoint. Later source-only
stages are documented below; nothing has been published.

The parent approved this staged scope after reviewing the source-grounded plan.
Engine and semantic tests must wait for the shared execution lane. Receipt
instrumentation remains gated on parent review and an exact stable ID19 base.

## What the leaf does

All exported helpers are pure. They return an accounting value or a new bounded
counter value; none awards Gold, experience, an item, proof, service, map
knowledge or recovery, advances the calendar, moves a character, or writes a
save. The final receipt clones only its bounded accounting payload, not state.

`expeditionRunIdentity` contains maze ID, seed, run generation, maze version,
kind, source and location. For v2 it also contains ID19's manifest version and
family, matching the complete `mazeRunIdentity` subset. For legacy v1 these two
fields are explicitly null: observing an old run does not invent a manifest.
The same numeric maze ID with another seed, generation, source or site does not
identify the same run.

Each visit has its own monotonic `maze-visit-N` ID and actual actor ID,
generation and recorded name. Re-entering an unfinished physical maze begins a
new visit rather than replacing the previous visit receipt. Inherited route
knowledge is not counted as the heir's newly explored rooms.

An entry snapshot contains only day, explored/cleared counts, steps, Health,
Focus, potions, rations and usable kit nights. It contains no world, map arrays,
Gold balance or inventory copy. A full-entry visit requires one actual entry
day and the pre-admission snapshot. An already-active legacy run can instead
start `coverage: 'observed'` at the current day, with zero recorded entry days.
Earlier time, supplies and gains remain unavailable, not zero-cost history.

Days are partitioned into entry, inside and defeat recovery. Separate fixed
counters cover walking Focus, potion/ration/kit use and actual passage, work
and defeat fees. Zero, interrupted and cancelled actions can therefore retain
exact actual costs without granting an unfinished result.

## Direct settlement accounting, not purse-difference loot

`expeditionSettlementSnapshot` takes a bounded resource/item projection only
immediately around a successful **post-attendance** effect settlement. It
copies fixed resource counters and the existing bounded relic, found-gear and
owned-property identities. It must not surround `spendDays`, a whole action
that attends time, a full visit, or a generic calendar callback.

The difference packet separates signed Gold/material/herb/ration/potion
changes and actual newly added relic, found-gear and property records. Each
packet has a finite source kind/cell and, for authored/signature work, its slot,
action and optional guardian subject. The source must belong to the visited
run, story anchor and actual actor/day outcome. Guardian subjects distinguish
two survey effects at the same slot. Story combat cannot create a second packet.
No-op packets are omitted; exact duplicate captures are idempotent. New item
identities cannot be credited twice. Conflicting duplicate captures explicitly
mark accounting incomplete instead of silently presenting incomplete gains as
a complete account.

For a validated maze victory, `recordExpeditionVictory` is the only battle
capture API. One snapshot immediately before the existing base Gold/experience
award and one after the existing `afterMazeBattle` loot settlement coalesce both
parts into a single packet. The helper takes the exact accepted
`pending.rewards.exp`; it never differences level-dependent character experience.
`recordExpeditionSettlement` does not accept partial battle captures.

`expeditionVisitTotals` reports gross direct gains and actual recorded costs
separately. Entry/end carried reserves remain separate facts, not a claim that
every reserve change came from the expedition. Calendar wages and household
income are deliberately outside loot accounting. Assessed relic value is not
Gold received. Unavailable gear is a historical find, never a regenerated item.

## Receipt and validator contract

The eventual runtime will add optional `mazeBook.nextExpeditionVisit` and
`mazeBook.expeditionReceipts` fields, plus `maze.expeditionVisit` while active.
The schema accepts old saves with none of these fields without modifying them.
An activated schema requires the counter and receipt list together.

`finishExpeditionVisit` closes only an explicitly supplied `stair`, `defeat` or
`life_end` terminal reason. Combat retreat is not a terminal reason and remains
on the same active ledger. The runtime remains responsible for confirming that
the actual stair/defeat/life-end transition occurred; accounting data is never
proof that an action was earned.

The helper copies objective evidence only from the current maze and an exact
matching existing ID19 completion receipt. It creates no content receipt. Old
v1 proof metadata does not acquire an invented method, completion date or actor.
A contract's promised client payment must not be represented as recovered Gold.

The independent validator checks exact schemas, versions, complete run
identity, actor existence, generations, dates, actual covered day totals,
monotonic explored/cleared/step counters, safe counters, unique visit IDs,
bounded/ordered finite source packets and unique item IDs. New V2 objective
summaries require exact existing completion actor/day/method evidence. Historical
summaries may outlive both proof stores; retained global or physical evidence
must agree, while genuinely missing evidence does not invalidate a display-only
historical receipt. This fallback cannot mint a new completion summary.

The terminal list is bounded at 80. A physical archive can be legitimately
evicted, leaving an independently validated historical receipt. A retained
same-numeric-ID/different-identity record is rejected, not called an eviction.
Earlier visits may have smaller totals than a later physical archive.

The runtime must remove the active ledger before cloning a run into its
physical archive. An archive containing an active ledger is rejected. An
ancestor's terminal receipts can remain historical if the actor is known; their
active ledger cannot transfer to the heir. ID19's `contentReceipts` remain
untouched and retain their separate once-only completion role.

## Next stage: exact hook map, not yet implemented

1. Successful `enterMaze`: pre-admission primitive snapshot; open a new visit
   only after the real entry day and any ration consumption succeed.
2. Central `spendDays`: account actual day advancement before lifecycle
   callbacks, including interrupted work; preserve existing calendar order.
3. Accepted battle settlement: one coalesced victory capture from before base
   rewards through afterMazeBattle's loot. Record exact potion use/defeat fees
   separately; cover the early life-end return during recovery.
4. Existing completed movement, kit decrement, public potion use and project
   first-payment transitions: increment actual counters only there.
5. Generic noncombat `awardLoot`, authored `finishChoice`, signature/boss
   `finishChoice`: capture accepted post-attendance resource effects and finds.
   Do not separately capture awardLoot inside the coalesced victory boundary.
6. Real stair exit, settled defeat and life-end archive: close once, preserve
   objective status independently from end reason, and remove active accounting.
7. ID19 inheritance: preserve historical receipt actor identity and numbering;
   never hand a live ledger or personal proof permission to the heir.
8. Add the validator call and compact pure UI only after these transitions are
   tested. Journal receipts and found-item comparison are presentation, not
   additional claim/equip/reward operations. ID24 map-memory state stays separate.

## Verification at this checkpoint

Pure test command (no engine imports):

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/maze-receipts.test.js
```

Initial result: 17/17 pass, zero failures/skips, approximately 0.12 seconds.
Coverage includes identity collisions, manifest-free legacy observation, actual
entry days, immutable counters, finite loot attribution, unrelated income,
no-op/full-pack capture, repeat capture, exact experience input, resource costs,
retreat/defeat/re-entry/reload, v2 completion evidence, ancestor identity,
archive eviction and malformed schemas. A cyclic unrelated world object does
not enter the snapshots. Runtime correctness, full save validation, engine
transitions, semantic UI, layout, offline build and publication are intentionally
not claimed by this checkpoint.


## Parent review corrections and single-visit storage bound

The storage ceiling is **256 settlement packets**, not a bound derived from
multi-generation outcome history. Current single-visit sources have a much
tighter conservative maximum:

- Ordinary room claims: at most one coalesced cache, victory or objective
  settlement per cell, at most 121. Anchored room replacement makes this an
  intentional overestimate.
- Authored content: six base rooms plus two selected optional rooms, eight
  anchors. Each has at most one finite resource-bearing resolution. Witness
  protection and aid-only are alternatives; repeated personal listening or
  recording gives no supplies. These add at most eight finite effect packets.
- Signature content: one crossing result, one side-cache claim, one final
  service result, at most two noncombat guardian resolutions and at most two
  initial survey herb finds: at most seven. Contact renewal, copying and
  repeated listening give no resources. Guardian battles are already coalesced
  ordinary victory packets.

Thus a current single actor's visit has at most 121 + max(8, 7) = **129**
packets, independent of generations, backtracking, repeated camps or attendance
retries. Cancelled/restarted work fees and repeated camp/potion/Focus use remain
aggregate scalar counters, not extra packets. Source rules are in ID19
`exploration.js:122–145, 258–305, 394–476`, `maze-signature.js:62–82, 99–121`
and `boss-stories-v27.js:87–99` at stable runtime source `25d01559`.

If future content or an incorrectly split hook exceeds the ceiling, the ledger
sets `settlementsIncomplete: true` and `expeditionVisitTotals` returns
`settlementsComplete: false`. Presentation must label the listed gains/costs
as a partial account, never complete totals. The bounded flag cannot grow an
unbounded event list and cannot affect actual rewards.

Review-expanded pure contracts currently pass 22/22 in approximately 0.13
seconds. A compact exact v1 active-state projection and the verbatim canonical
ID19 provenance helper are retained with source commit and SHA-256 metadata.
Their parity test verifies actual legacy actor/run/day behavior without adding
a manifest, an entry day or a missing actor name. Actual captured v2
parent/heir parity remains pending ID19's successful reserved engine run; it is
not replaced by an invented runtime fixture.

## Receipt-only inheritance and implementation base

After owner coordination, the isolated branch was rebased onto committed ID19
head `36a79b179231fb40949d707a4d431d45d4791edb`. Its runtime source is identical
to `25d01559`; no uncommitted files were copied. Parent owns integration order
with ID24's separate map-memory changes.

Closed historical run numbers validate independently of the current life's
`mazeBook.nextRun`, because all-v1 succession intentionally resets physical maze
numbering. Historical identity includes the full seed and run generation:
parent `maze-1` / generation 1 and heir `maze-1` / generation 2 are distinct,
compatible histories. Within one generation, a retained same-ID conflicting
full identity still fails. Active runs remain bounded by current numbering.

All-v1 inheritance must copy only already-terminal receipt history and its
independent visit counter, not old private physical maze state. Direct active
parent projections strip the live ledger from the child's physical archive
without mutating the living parent or fabricating a life-end receipt. Actual
public life closure remains the authority that issues such a receipt.

The additional pure inheritance contract brings this checkpoint to 23/23
passing tests, approximately 0.15 seconds. Genuine all-v1 public successor and
actual v2 parent/heir fixture roundtrips are required reserved-lane checks, not
claimed by these pure cases.

## Source-only runtime instrumentation checkpoint

The approved explicit hooks are now prepared on the isolated committed ID19
base. `maze-receipt-runtime.js` is a small bridge to the pure leaf, not a general
event bus. It opens admitted visits, lazily observes old actual mutations,
updates fixed counters, captures finite settlements, closes once and copies
only terminal history into heirs. All-v1 physical inheritance/numbering remains
unchanged. Direct living-parent projections strip only the active ledger from
the copied physical maze and cannot fabricate a life-end account.

Central calendar accounting records actual days immediately after advancement,
before existing lifecycle callbacks. Defeat passes a private recovery label;
all other calendar order and interruption rules remain unchanged. Source-only
resolver contexts can advance the real day without `engineContext`, so a small
reconciliation helper fills only unrecorded actual elapsed days at the maze
boundary. It cannot read Gold and cannot double-count centrally recorded days.
Preparing an old-run observation is pure; a zero-day interrupted action does
not install it. A pre-action candidate preserves the actual primitive baseline
if a source context first mutates a fee after attending its day.

The accepted battle path retains its local run reference before result effects.
Its coalesced victory boundary surrounds only existing base rewards and
`afterMazeBattle` loot; nonvictories never look up a cleared maze afterward.
Actual potion depletion, work fees, walking Focus, kit decrements, authored and
signature effects, stairs, defeat and life end have their own narrow hooks.
No existing reward value or resolver branch is replaced.

Both pure suites pass **28/28**, approximately 0.21 seconds. A reserved-lane
engine file is prepared at `tests/maze-receipt-engine.test.js`, including actual
entry/cache/victory/retreat/defeat/camp/potion handlers, save roundtrips, replay
protection and an actual public all-v1 `continueAsChild` path. Its completed
combat/room and historical receipt inputs are explicitly controlled accounting
fixtures, not earned-life balance evidence. **These engine tests have not been
run.** Actual captured v2 parent/heir parity is still pending ID19. No UI,
semantic/browser checks, build or publication is included in this checkpoint.

## Compact presentation checkpoint

The source now includes a dated current-life return disclosure in Life,
searchable collapsed receipt cards in Journal Archive, and a short active-visit
status beside existing maze resources. Earlier-life accounts remain in the
archive without appearing as the heir's current return. Objective state and
return/defeat/life-end status are independent; combat retreats explicitly keep
the visit active. Observed legacy coverage and incomplete settlement coverage
have different, explicit warnings.

Carried reserves, directly used supplies, actual attended day partitions,
finite proceeds, committed resources, existing proof and assessed relic values
remain separate. Lost/sold gear keeps its historical name but has no comparison
action. An exact still-owned ID opens the existing Inventory detail/comparison,
clearing stale category/slot/query filters and focusing the item heading; the
handler cannot equip, purchase, move, consume or advance time.

Receipt Journal notes now pass explicit `narrativeEdition: 30` metadata in
addition to using `journalLiteral`. The prepared engine test checks the exact
note survives migrate/reload. Life-end closure intentionally adds no receipt
Journal note because that helper has no Journal context; its frozen account is
available in receipt UI and the existing life-end Journal entry is unchanged.

Pure accounting/runtime/render/source contracts pass **36/36**, approximately
0.35 seconds. Prepared semantic coverage at
`tests/maze-receipt-handlers.test.js` checks keyboard comparison navigation from
stale Inventory filters and unavailable historical gear. Engine and semantic
tests remain **not run**, pending the shared lane; no browser/layout, build or
publication claim is made.

The comparison command also opens the existing Equipment Changes disclosure,
then focuses the exact item's heading, so Compare does not require another
manual expansion. The last pure rerun remains 36/36, approximately 0.31 seconds.

Paused at the parent's queue boundary. After the ID19 genuine public-successor
pass/capture and v0.49 heavy-lane release, the proposed bounded first runtime
command is:

```sh
UV_THREADPOOL_SIZE=1 timeout 75s node --test --test-concurrency=1 tests/maze-receipt-engine.test.js tests/maze-receipt-handlers.test.js
```

That command contains six engine and two semantic-handler cases. All eight are
currently NOT RUN. Actual captured v2 identity/actor/time parity must also be
added using ID19's real artifact when supplied. No fabricated v2 runtime fixture
has been substituted, and no current-main or public-site changes were made.

## Reserved runtime result and actual v2 parity

The parent subsequently ran that exact eight-case set serially on `e9fcab8`.
All **six engine cases passed**, including real all-v1 public succession, exact
receipt Journal text across reload, victory coalescing, retreat/defeat and real
consumable/kit accounting. Both semantic-handler cases failed at their Archive
navigation antecedent: they attempted the Journal Archive workspace command
while still in Inventory or Life. The run ended with 6 passed, 2 failed in
10.766 seconds, exit 1. These are controlled accounting/handler fixtures, not
earned route or balance evidence.

Both tests now select the actual Journal tab before selecting Archive. Their
existing exact-owned-item comparison, cleared filters, opened comparison,
keyboard focus, unavailable-item and unchanged-gameplay-state assertions are
retained. No product code was changed for this fixture correction. The targeted
two-case rerun is prepared but **NOT RUN**, awaiting explicit shared-lane release:

```sh
UV_THREADPOOL_SIZE=1 timeout 30s node --test --test-concurrency=1 tests/maze-receipt-handlers.test.js
```

ID19's genuine five-state public-engine successor capture is now included at
its canonical `tests/fixtures/maze-identity/v2-successor.json.gz` path, byte-for-byte
from committed `ab021de` (458888 bytes, SHA-256
`fcc1b79ed79a052ded974d65ef0350d99526f88e1381884b596d86edb843ffbe`). Its source
runtime is unchanged from this branch's `36a79b1` base. ID19's owner reports its
full five-case runtime gate passed separately; this branch does not rerun that
gate or claim its capture contains ID23-emitted receipts.

Three new pure tests read the actual unresolved parent/heir, renewed active
heir and completed parent/heir states. They prove canonical full identity,
current actor generation versus original run generation, actual observed
clocks/counters, no invented prior entry or gains, and the original parent's
exact completion actor/day/method retained in heir projections. Hypothetical
pure stair-receipt projections on completed records remain explicitly helper
tests, not claims of another public exit or fabricated life-end event. Retained
conflicting proofs reject; independent copied history cannot mutate the parent;
projecting an active physical record strips the ledger without closing a life.

All four pure suites now pass **39/39**, 0 failed/skipped/cancelled, in
approximately 0.65 seconds. Test syntax checks pass. The corrected semantic
rerun, composed integration checks, browser/layout, build and publication remain
outside this checkpoint. No main or public-site changes were made.
