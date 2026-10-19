# Roadmap 24: bounded map reminders and recorded routes

## Leaf checkpoint only

This checkpoint adds two dependency-free modules and their pure tests. It does
not wire the engine, validators, map UI, keyboard handlers, standalone build or
publication. It is based on published commit `1959103`. Do not describe roadmap
24 as player-ready until the integration and rendered verification gates pass.

`maze-map-memory.js` owns an optional `m.mapMemory` field with version 1, full
run identity and at most 32 entries sorted by room ID. A row has one optional
danger/cache/revisit/return-stair mark, up to 160 UTF-16 units of normalized
single-line plain text, and author ID/name/generation/day. Empty final deletion
returns null, telling the owner to remove the optional field. Missing fields
remain valid and are never initialized by reading. Full schema, visited-cell,
stair, actor, date, generation, identity and length checks fail closed.

`editMazeMapMemory` returns a new value, never mutating its inputs. Its trusted
context supplies `day`, `generation`, `editingAllowed` and
`actor: {id,name,generation}`. The request supplies only the reviewed identity,
room ID, mark and note. The owner applies successful results to a cloned state;
request text never supplies author identity or action authority. It must escape
all note/name text in the UI. The leaf intentionally retains markup-looking
text as inert text data rather than interpreting or double-escaping it.

## Roadmap 19 adapter contract

No uncommitted roadmap 19 runtime is copied here. The final owner supplies:

- `contentIdentity: mazeRunIdentity` for v2 full provenance. V1 identity is
  constructed directly without touching `m.content`. Both include run ID, seed,
  generation, maze version, kind, source, site and floor 1. V2 additionally checks
  manifest version 1 and authored/signature family against the injected helper.
- `kindAt: (m,id) => mazeRoomCell(m,id).kind` for effective source overlays,
  rather than geometric cell kinds.
- `validActor: id => validMazeActor(s,id)`, including historical actors.
- Current actor `mazeActorId(s)`, `s.hero.name` and actual dynasty generation.

Roadmap 19 confirmed that v2 archive, reentry and inheritance clone the whole
physical run and preserve optional fields. Existing historical row provenance
is retained; editing another row does not rewrite it. No personal consent,
pending action or trust is copied by this feature. Existing all-v1 inheritance
and pre-maze expedition behavior remain unchanged.

## Pure route boundary

`projectVisitedMazeGraph` accepts the run and layout with injected effective
`kindAt`, currently enabled canonical first-step room IDs, already-validated
marked room IDs, and a paused flag. It accesses cell metadata and asks for kinds
only on visited IDs. Unvisited destinations are filtered before any cell read.
The resulting graph contains only numeric visited nodes, reciprocal cardinal
known edges, unresolved danger flags, first-step permissions and visited marks.

`shortestVisitedMazeRoute` accepts that graph and a target. Bounded BFS returns
found/already-here/invalid-target/blocked-danger/paused/no-known-route, or
invalid-graph for malformed input. Ties are north, east, south, west. It never
enters unresolved enemy/guardian/trap rooms. An unresolved start may leave only
through its actually enabled previous door; that exception is not propagated.
It reports compass steps and a walk count, not a safety or whole-route resource
promise. No follow-route API, movement, rewards, calendar, RNG or mutation exists.

## Pending integration gates

The owner must add validation for both active and archived mapMemory, a guarded
engine edit wrapper and explicit Inspect mode. Keep Walk mode the default and
preserve existing adjacent click and arrow walking. Inspect selection/keys,
forms and route display must never move. Expose an equivalent native marked-room
list for keyboard/mobile use. Escape names/notes in every output context; label
author provenance and inherited knowledge rather than claiming the heir visited.

Fix the narrow existing fog leak: wall classes must be derived only for visited
tiles. Preserve the known doorway from the current visited room and its adjacent
unknown question-mark target, not the unknown target's other exits. Test DOM,
ARIA, attributes and classes, not merely visible text. Semantic engine/UI tests
and real narrow/mobile rendering remain pending a shared test lane.

## Leaf verification

`node --test tests/maze-map-memory.test.js`: 16/16 passed in 127 ms. Includes
frozen-input purity, exact identity/schema rejection, bounds, inert markup text,
stair gating, author history, clone/reload, effective danger, deterministic BFS,
unseen-shortcut exclusion, one-way/noncardinal/wrapped edges, pending/blocked
first steps, malformed graphs and all 121 nodes/120 walks. A poison-getter test
proves projection does not access hidden cell objects or effective hidden kinds.
Syntax checks and `git diff --check` passed. These are pure leaf results, not an
engine, semantic browser, rendered-layout, offline or publication pass.

## Engine/interface source checkpoint

The leaf delta was rebased onto committed roadmap 19 `e0ca27b` with its owner's
approval for surgical engine/validator/UI hooks. `mazeMapRuntime` supplies the
shared effective-kind, content identity and historical actor adapters.
`updateMazeMapMemory` applies immutable edit results only to its cloned state;
`validateMazes` validates the optional memory on active and archived runs.

`maze-map-ui.js` supplies an ephemeral run/actor-bound session, safe read model,
plain-text route statuses and native forms. Walk stays the default. Inspect
enables recorded-room selection without movement, with one roving cell Tab stop,
arrow selection and an equivalent marked-room select form. Save/Remove are the
only reminder mutations; selecting, cancelling, showing/clearing a route and
double-clicking inspection controls never execute movement. A captured hidden
run identity guards form submission, and detached stale forms are ignored.
Historical author name, generation and day remain visible on the selected row.

Rendering now derives wall classes and effective content only for visited cells.
The current room still exposes its actual door edge and adjacent unknown target;
the target no longer exposes its other walls. CSS additions retain the existing
palette, distinguish notes/marks/routes/current/selection without color alone,
and provide 44px form/mode controls with wrapping layout.

`tests/maze-map-controls.test.js` covers engine purity and round trips,
active/archive validation, v2 archive/reentry/inheritance attribution, unchanged
legacy expeditions, default Walk, full fog DOM/ARIA/class assertions, known-door
availability, Inspect keys/clicks/Cancel/double-click, escaped text, form focus,
marked-room picker, routes and explicit canonical Walk, and detached stale forms.
The controlled inheritance case invokes `inheritStoryMazes` and validates the
resulting maze records; it is not a new full `continueAsChild` lifetime test.

## Focused runtime verification

On 2026-10-17, source checkpoint `8008f8c` passed the approved isolated command:

```sh
timeout 60s env UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/maze-map-controls.test.js
```

Result: **10/10 passed**, 0 failed/skipped/cancelled, exit 0, in **7.23 seconds**.
The real v0.27 save fixture is migrated/withdrawn once and cached; there is no
fresh-life generation. All actual app cases are semantic handler tests, not
browser geometry or touch/screen-reader observations. The test process ended
and returned the shared runtime lane immediately; no additional engine batch
was started.

The final dependency-free memory/route suite passed **17/17** in **117 ms**,
including navigable witness/dilemma effective overlays. All changed JavaScript
and test syntax checks and `git diff --check` passed. No gameplay, room content,
topology, resource or reward behavior was adjusted to satisfy these tests.

Real rendered mobile/desktop QA, full integration regressions, final offline
build and publication remain parent release gates. Nothing in this worktree
has been built or published, and these focused passes do not imply the remaining
roadmap or aggregate release gate is complete.
