# Roadmap 26: costed companion field assistance

## Runtime source checkpoint, not release acceptance

The original leaf below was rebased onto immutable composed source `9c29df3`
(IDs 19/23/24/25), then onto `3aee2ce` with the publisher's dated archived-
signature correction, in the isolated `roadmap26-companion-field-assists` worktree.
The new source checkpoint wires canonical current-room offers, accepted atomic
effects, native keyboard controls, exact literal Journal records, physical-run
save validation and optional visit-level assistance accounting. No main or
publisher files were modified, and no build/browser/publish work was run.

Action selectors bind the full run/physical room, owning hero/generation, actual
helper person and selected target person. A stale room, prior visit generation
or replaced role-holder cannot borrow the same local `kest`/`mira` ID. The actual
execution still re-quotes from current eligibility, Focus, Health and herbs.

Receipts capture actual helper and target lineage person IDs, original names,
born days, owning hero and generation. Historical validation reconstructs only
the captured bounded profile inputs, never the heir's regenerated role-holder.
Retained ancestor lineage evidence must agree; legacy receipts without lineage
use explicit hero/generation ownership. No ancestor technique is granted to a
new companion. Physical shared room slots survive archiving and v2 succession.

The import-free expedition accounting leaf retains its old required keys and
adds `assists` only on accepted help. Each accepted receipt is copied once into
that visit; its one herb cost enters total costs once, and personal companion
Focus remains separate from walking Focus. Closed receipts keep captured names
and effects after physical-map eviction. Runtime validation/closure injects the
canonical `validateMazeFieldAssistReceipt` predicate as `validateFieldAssist`;
without it the optional new assist schema fails closed. Old visits need no new
keys or adapter and retain the original import-free guard.

`mazeFieldAssistRuntime` also injects personal-boundary eligibility, including
the recorded refusal of active travel. Only helper action participation is new
work; existing ordinary potion behavior remains unchanged.

Current verification: 92 lightweight pure cases passed in 0.15–0.18 seconds,
including all original receipt-leaf cases. JS syntax and whitespace checks pass.
Ten new engine/source-successor cases and four semantic handler cases are
prepared but not run: the publisher owns the shared heavy-test lane. This is not
final source-gate, browser, visual, balance or public-release acceptance. The
dated archived-signature rule is retained unchanged; active signature behavior
is outside this change.

Prepared new-feature command, only after the parent grants the heavy lane:

`node --test --test-concurrency=1 tests/companion-field-assists-engine.test.js tests/companion-field-assists-handlers.test.js`

Prepared relevant compatibility command, also requiring the heavy lane:

`node --test --test-concurrency=1 tests/field-treatment-pure.test.js tests/field-treatment-runtime.test.js tests/maze-resource-rules.test.js tests/maze-authored-content.test.js tests/maze-signature.test.js tests/maze-content-engine.test.js tests/maze-attendance.test.js tests/maze-receipts.test.js tests/maze-receipt-runtime.test.js tests/maze-receipt-engine.test.js tests/maze-receipt-handlers.test.js tests/maze-receipt-ui.test.js tests/maze-integration-v50.test.js`

### First delegated engine/handler diagnostic and correction

The parent's retained run against `1ececb6` produced 11/14 passes in 12.962
seconds, not feature acceptance. All four native UI cases passed. Scout,
protector and healer source accounting passed; scholar resource/physical/visit
assertions passed before its inscription Journal count failed. Both v2 cases
stopped at the fixture's unavailable `explore_enter_cistern` before their actual
exclusion/succession assertions ran.

The scholar's shared current-note producer omitted the current narrative marker,
so the post-action formatter rewrote its exact Journal entry to an earlier-moment
placeholder. The corrected shared producer uses the existing literal Journal
path and `narrativeEdition:30`. The original title and six exact inscription
lines, note cap, one entry, zero days and zero Scholarship gain remain. A new
pure regression exercises the real narrative formatter and proves the exact
current note survives; the engine assertion is strengthened to check its body
and marker as well as its original count.

The real parent lives at home; the canonical cistern entry is at marsh. The
fixture now selects an actual enabled native signature offer, consistent with
the already captured source-successor gate (`signature_blackgrove` at home),
without altering availability or relocating a dungeon. Heir re-entry is derived
from that retained source and checks the actual source settlement/offer again.

After these source/fixture corrections, 142 short pure tests passed in 0.62
seconds. Engine/handler rerun remains pending the parent's heavy-test lane.
No assertion was removed or weakened, and no all-help-accounting or release
acceptance is claimed.

## Original isolated leaf checkpoint

Base: committed roadmap 25 `8ce703d`. This checkpoint intentionally adds no
engine, maze runtime, UI, build, publication or release-gate hooks. Roadmap 19 is
not an ancestor of this base; its runtime must be composed by the integrator.

## Integration contract

`quoteMazeFieldAssist(state, kind, helperId, targetId, options)` and
`applyMazeFieldAssist(state, kind, helperId, targetId, options, context)` use the
same exact eligibility/effect model. Action data must contain IDs only, never
these options or a previous quote. Quoting and validation mutate nothing.

Supply these trusted adapters from the composed roadmap 19 runtime:

- `roomAt(run, cellId)`: `mazeRoomCell`. The quote requests only current position;
  historical validation requests only recorded visited cells. The leaf never
  computes doors, runs a discovery scan or returns off-room content.
- `runIdentity(run)`: `mazeRunIdentity`, unchanged, for v2 runs.
- `actorId(state)`: `mazeActorId`.
- `validActor(state, actorId)`: `validMazeActor`.
- `participationReason(state, companionId)`: the actual helper's personal
  boundary/availability reason, if any.
- `contextReason`: the engine's current incompatible-commitment reason, if any.

V2 action/ledger validation fails closed without the complete adapter contract.
V1 uses an explicit full run identity, including seed, generation and source,
not the archive's numeric ID alone. Missing optional ledgers remain valid.

Hook `validateMazeFieldAssists(state, run, options)` into active and archived run
validation. Keep the optional `fieldAssists` object on archiving, re-entry and
v2 inheritance. The shared slot is per physical room, not per helper/role/life.
Do not reset it at camp. No more than 121 receipts are permitted.

The generic normal `maze_read` handler must eventually share
`recordGenericMazeInscription` with the scholar action. The helper contains the
six existing exact titles/lines and original note cap/journal callback. It adds
no skill reward or attendance. The integrator must retain normal room clearing
and original notice behavior. The assisted handler already clears its room,
records its one receipt and makes exactly one same note/journal call.

Never use these assists on a descriptor with `contentSlot`, even if its raw
random room was a trap/inscription. In particular the signature ledger's one-day
copy and authored repair/evidence work remain wholly unchanged.

## Formula choices

- Scout/rogue: 3 personal Focus, +2 on this one Survival+Agility check, +3 instead
  with actual Kest chapter-5 `watch_line`. Existing threshold 8+2*tier and failure
  injury 4+2*tier stay unchanged. No charge if hero already succeeds or assistance
  does not reduce actual injury after the existing minimum-1-HP floor.
- Protector/warrior: 4 personal Focus, careful crossing injury reduced by
  min(3,1+profile armor), never below one nominal injury. Earned Mira chapter-3
  `intercede` or Tovin chapter-5 `rally_standard` sets reduction to 3 instead of
  stacking. Existing hero floor remains; no actual marginal benefit means no
  charge and no slot used.
- Scholar/mage: current unread generic inscription only. Three personal Focus
  for at most two missing hero Focus; actual Orrin chapter-3 `winter_prison`
  qualifies an experienced field adaptation of four for at most three instead.
  UI must describe practiced concentration, not assert the combat spell restores
  Focus. Full hero Focus disables assistance but leaves ordinary reading.
- Healer/healer: quiet generic room, 4 personal Focus and one actual herb.
  Restore min(missing HP,6,restorativePower(profile,2)): initially five HP.
  Actual Sable chapter-5 `purifying_touch` adds two with cap eight. One selected
  injured living active ally or hero only; no revive, cleanse or Focus grant.
  Potion treatment remains a separate up-to-30-HP action.

Technique qualification checks the learned ID, correct actual chapter choice,
non-scheme care/trade choice and completed day. A stage count or arbitrary
trained-technique entry alone cannot qualify a bonus. Current-life receipts
must still match that evidence. Ancestor receipts retain strictly bounded
historical inputs because succession resets personal chapter state.

## UI and interruption constraints

Show selected helper, actual personal Focus before/after, herb cost, exact target
effect and hero-alone versus assisted injury. One room has one shared help slot.
Full targets, downed/dead/absent people, missing MP, no herbs, stale helpers,
changed rooms and active moments/commitments spend nothing and set no receipt.
The engine must re-resolve IDs; no quoted resource/effect is trusted on execute.

All leaf actions are zero-day atomic decisions. There is no new attendance,
pending project or interruption-resume path. No existing attended source action
may be wired through this zero-day leaf. Parent engine and semantic coverage
must be run only when the shared heavy-test lane is available.

## Verification scope

Controlled pure tests establish quote/effect accounting, exact original generic
notes, nonmutation, marginal benefit, historical formula/provenance checks and
adapter boundaries. They are not earned playthrough, engine/save validation,
browser, live balance or publication acceptance.
