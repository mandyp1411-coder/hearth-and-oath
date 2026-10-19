# Roadmap 19: restore authored identity within the existing maze

Approved plan, 17 October 2026. Baseline: published v0.47.0, commit
`19591036c8fbe32e08aaf08b9d5d05d60119b8a0`.

## Scope and status

Restore the five authored expeditions and six regional signatures as content
inside the existing 11 × 11, 121-room maze. Do not replace or recarve that maze,
convert prior saves, introduce another active dungeon subsystem, or temporarily
populate conflicting `s.dungeon` / `s.rpg.expedition` objects. Retain the public
game's current palette, presentation, doors, fog, movement, resource forecasts,
camping, generic encounters/caches, retreat, and stair rules.

Only stages 1–2 are implemented by this initial checkpoint. The new pure module
is not imported by the application and changes no runtime entry or resolver.
Stages 3–5 require their own reviewed integration checkpoint and verification.
Gate 11 remains separate ongoing work; these changes do not complete it.

## Findings

- `maze-v31.js:34–44` creates generic version 1 runs without calling the authored
  variant generator or initializing regional boss stories.
- `exploration.js:122–148` already generates all five authored definitions,
  selecting two optional rooms, objective, motive, custodian, and witness.
- `exploration.js:167–183` contains meaningful peaceful prerequisites. New mazes
  currently substitute a generic persuasion/eight-gold agreement.
- `rpg-depth-v27.js:178–192` associates each signature with two guardians, side
  evidence, and shared/priced/controlled goal choices.
- `boss-stories-v27.js:17–85` supplies twelve unique guardians, thirty-six
  approaches, attended leads, living participants, services, property, and
  persistent consequences.
- `maze-v31.js:70` retains the final authored encounter but uses generic free
  encounters for regional guards; its objective handler automatically creates a
  shared regional service.
- Boss records are globally unique by boss ID, not dungeon location. Service IDs
  also deduplicate globally. Restoring signatures must not clone those people or
  farm the same guardian/property/service by visiting another town.

## Manifest and state contract

1. Keep `mazeLayout` unchanged, including its algorithm and seed-only cache.
   Never mutate cached cells or merge authored exits into geometry.
2. Future newly entered authored/signature runs opt in with maze version 2. Old
   version 1 runs never acquire content. Modular regional, contract, and radiant
   runs are outside this content-restoration scope. The existing book envelope
   may stay version 1 with explicit run-version validation.
3. The immutable content-version-1 manifest stores run ID/seed, world seed,
   family, source ID, location/region binding, exact source definition, stable
   source-slot/cell anchors, required guardians, goal, peaceful prerequisite
   slots, and anchored blocking slots.
4. Canonical validation regenerates that exact version and compares stable
   structural equality. A self-supplied hash is not proof. Future changes to
   generation/content require a new version; do not edit the version-1 contract.
5. Mutable progress is separate from the manifest: heard accounts, recorded
   actions/outcomes, evidence/aid provenance, claimed anchored supplies,
   objective method, and completion receipts. Derive proof/aid from actual valid
   outcomes. Generic inscriptions and recovered supplies are not proof.
6. A pure effective-room descriptor overlays content on the existing cell. It
   keeps the exact cell ID, coordinates, and doors. The source snapshot's old
   exits, if present for compatibility, are not active routes. An underlying
   empty cell must not auto-clear a restored encounter.
7. An internal descriptor is not a fog-filtered view. Apply discovery rules
   before sending it to any map, preview, tooltip, accessibility label, journal,
   contact list, or other player-visible surface.
8. Resume archived manifests/progress verbatim. Never reroll on re-entry or
   retroactively add obligations to a completed/unfinished older run.

### Initial pure API

`generateMazeContentManifest(run, worldSeed, layout)` returns null for an old or
unsupported run and otherwise returns a canonical manifest. The layout is an
explicit input, avoiding a future circular dependency with `maze-v31.js`.
Authored source/location must match; signature source/region must match.

`validateMazeContentManifest(value, run, worldSeed, layout)` validates canonical
equality, including narrative, loot, encounters, slot placement and bindings.
Runtime integration must first validate the base run and its actual world site.

`mazeManifestRoom(manifest, cell)` returns an independently owned internal
effective descriptor. It never changes either input and never copies old exits
or neighbors onto the real cell.

## Reachability and placement

Authored entry remains cell 0; final guardian remains `layout.guardian`; the
objective remains `layout.goal`. Anchor all remaining original rooms and both
generated optional rooms at distinct cells. Place blocking encounters/hazards
first while preserving a sufficiently large entrance component for all remaining
content. Put proof, aid and the source cache in the accessible component, not
behind the final guardian or another mandatory encounter. A service room may
itself be a hazard: it must be enterable before other blockers so its own repair
can be performed on arrival. No proof requires clearing that same room first.

For signatures, the second canonical guardian uses the existing final guard
cell. Prefer the first guardian's cell immediately adjacent to that final guard,
on a shortest entrance approach. Require sufficient entrance-reachable space
after removing both guardians and the goal; rank alternate neighboring cells
deterministically if necessary. Place the ledger, stores, crossing and actual
contact opportunities before the pair. This keeps a loop bypass from causing a
long rewalk. Completion requires both guardians' actual resolutions rather than
new walls or doors.

These are topology/content-prerequisite guarantees, not a universally safe or
combat-free journey. Reachability excludes anchored story blockers only;
unanchored generic enemies and traps retain their existing movement, stealth,
combat and hazard rules. Evidence can be reached without first defeating the
required authored/signature guardians, but exploration still has ordinary risk.

The goal may name only an unresolved guardian already encountered or learned
about. Otherwise use a diegetic missing-seal cue without exposing a hidden name,
cell, direction, or path.

## Complete identity inventory

Authored final encounters:

- `cistern` → `cistern_keeper`.
- `buried_archive` → `archive_warden`.
- `root_caverns` → `thornheart`.
- `watchtower` → `tower_captain`.
- `covenant_core` → `core_warden`.

Retain every source's other named encounters, cache, objective, seeded motive,
selected optional rooms, custodian and witness identity.

Signature pairs:

- Rainward: `shut_gate_ferryman`, `watch_that_never_ends`.
- Saltreach: `captain_without_shore`, `glass_tide_witness`.
- Highstone: `unfinished_son`, `furnace_widow`.
- Blackgrove: `mother_empty_nests`, `orchard_wife`.
- Ashplain: `saltless_captain`, `crown_beneath_ash`.
- Bellwater: `listener_drowned_door`, `guest_would_not_leave`.

## Stage 1: freeze compatibility and source contracts

Capture representative version 1 active, unfinished, completed, and pending
battle maze states. Preserve exact geometry and authored version-1 definitions;
retain legacy authored, regional, and six-floor adventure resolver behavior.

The initial `tests/fixtures/maze-identity/v047-compatibility.json` captures three
complete baseline layouts, all five legacy base definitions, five complete
seeded definitions, the exact version-1 entry state, and baseline source hashes.
The active/archived/pending fixture projections are intentionally narrow maze
contracts, not claimed complete engine-valid or earned-playthrough saves. The
existing genuine `v27-road-and-descent.json.gz` fixture remains unchanged for
later runtime migration testing. Source hashes are provenance, not a rule that
future reviewed runtime integration cannot edit those files.

`tests/fixtures/maze-identity/v1-manifest-signatures.json` separately freezes the
complete new content-version-1 outputs for all eleven sources. These test goldens
guard against accidental changes to an already entered manifest contract. Runtime
validation still compares the canonical structure, not an editable saved hash.

## Stage 2: pure generator and descriptors

Implement deterministic anchors, canonical snapshots/validation, and effective
room descriptors in a new leaf module without changing live entry. Check all
eleven identities, distinct valid cells, source matching, peaceful prerequisite
reachability, paired-guardian proximity, deterministic JSON round trips, and
unchanged geometry. A separately scheduled seed sweep broadens those properties
without starting the expensive engine suite.

## Stage 3: restore authored actions through explicit shared helpers

Shared-helper checkpoint: 604 exact baseline offer/effect/scene/record cases,
including unmarked legacy definitions, were captured before extraction and
matched afterward. The existing dungeon-variant suite plus parity/manifest
checks passed 20/20 in 0.45 seconds. The extracted APIs accept explicit
definition, source room and progress; no fake active dungeon is assigned. This
checkpoint alone does not enable new live maze content.

The subsequent authored controller checkpoint enables only genuinely new
authored runs, preserving version-1 resumes. It restores the real source rooms,
peaceful checklist/actions, objective methods and exact encounters. Typed maze
work reuses existing RPG attendance; five additional baseline attendance fixtures
guard zero-day, partial, completed and cancelled old paid work. Content outcomes
are bounded/provenanced and checked against derived facts and numeric clears.
A bounded global completion receipt prevents archive eviction from recreating a
reward. The map overlays discovered kinds without changing topology/fog, and
new battle contexts bind source/slot/encounter. Controller/parity checks are not
full-engine playthrough or release evidence.

- Extract helpers from `exploration.js` accepting definition, current source
  room, facts/progress, and discovered source rooms explicitly. Preserve exact
  legacy wrappers and outputs; never fabricate `s.dungeon` as an adapter.
- Restore listening, witness consent, recording/protection, service repair,
  preserve/restore/salvage, relevant completed formations, and genuinely trusted
  companion support.
- Listening grants no clear or reward. Aid-only grants no evidence. Supply
  records are background, not negotiation proof.
- Restore private-copy/public/stewardship objective choices. Public naming
  requires an actually recorded witness account; otherwise redact names.
- Only the actual holding-cells encounter/release grants watchtower prisoner
  facts. Moonroot's three objective herbs and campaign discovery occur once.
- Existing generic resource rules remain unchanged; restored source actions use
  their own existing explicit attendance/material requirements, not new tuning.

## Stage 4: restore signature actions and consequences

Signature controller checkpoint: all six signatures, twelve guardians and
thirty-six approaches are restored through explicit target helpers. Another 114
exact pre-extraction boss offer/lead/consequence cases remain unchanged. Combined
manifest/authored/signature/attendance/legacy tests passed 47/47 in 1.11 seconds
before full-engine verification. New signatures receive fog-safe discovery
metadata; existing boss records without that metadata keep their old contact
behavior. Unfinished version-2 story manifests are protected from bounded book
churn, while all-version-1 eviction order remains unchanged. New version-2
guardians/costs are additional content, not an unchanged-difficulty claim for old
earned-balance snapshots.

- Separate boss offers/consequences from legacy room lookup. Pass an explicit
  target and completion callback rather than synthesizing an expedition.
- Reuse canonical boss initialization, prerequisite logic and consequence
  handlers. Bind every lead to the actual run, source slot, cell and participants.
- Preserve all thirty-six approaches' skills, supplies, attendance, property,
  oath, security, trade and service effects.
- Retain canonical boss identity/location. Existing resolutions count only as
  prior resolution, never a new payout/property/service. Do not instantiate the
  same guardians at a second town, resurrect participants, or hijack an older
  recorded expedition. Check actual living/present participants at completion.
- Restore final care/trade/scheme choices: three actual days, existing fees and
  proceeds, corresponding shared/priced/controlled service. Do not additionally
  award generic objective loot or an automatic shared service. Boss-created
  services remain separate and correctly sourced from final goal services.

## Stage 5: resumable work, combat, validation and UI integration

Extend existing `s.rpg.project` attendance with a typed maze target, not another
work engine. Bind run ID, manifest version, source ID, slot ID, cell ID, action
ID and boss ID where relevant. Pending work exposes only continue/withdraw in
maze actions. Preserve actual attended days and once-paid fees through
interruption/reload; revalidate supplies and living participants on completion.
Withdrawal retains spent attendance/fees but creates no unfinished result.

Battle context remains `kind: 'maze'`, including for `rpg_guardian` encounters.
Validate exact run, source slot, cell, encounter, boss identity and pending room
before granting any clear/proof. Victory resolves only its real guardian, never
an unperformed rescue, property return or peaceful service. Keep generic maze
movement/Focus cadence, camp rules, finite caches, retreat, and exits unchanged.

Show source story/actions/checklists only in discovered current rooms or
legitimately discovered records. Never leak hidden content through map labels,
tooltips, disabled reasons, forecasts, previews, accessibility or contact lists.

### Save validation

- Keep the existing version 1 branch and serialized states intact.
- Version 2 validates exact manifest, bounded progress, action provenance,
  visit/clear relationships and required guardian/goal outcomes.
- Validate pending work against its exact live run/slot/recipe; validate new boss
  lead provenance/participants without imposing new fields on old leads.
- Reject source/location/region mismatches, duplicate/out-of-range anchors,
  altered encounters/rewards, impossible proof/aid/completion, stale targets,
  and wrong guardian identities.
- Retain earlier-completion-to-later-quest linking without replaying rewards.

## Approved verification matrix

1. Geometry: fixed-seed byte/structure equality; 121 reciprocal orthogonal cells;
   unchanged doors, goal, final guardian, loops and movement forecasts.
2. Placement: broad deterministic seed sweep across all eleven identities;
   distinct anchors and all peaceful prerequisites before required guardians.
3. Authored variation: each source's three optional layouts, three objectives
   and three motives.
4. Authored identity: all named encounters, exact guardian/objective/cache and
   source-specific facts.
5. Negotiation: heard-only, proof-only, aid-only, full checklist;
   trusted/untrusted/dead/inactive companions;
   completed/incomplete/undated formations.
6. Consent: recorded/unrecorded witness, public redaction, preserved stated
   limits, private copy and stewardship.
7. Signatures: both correct guardians, species/phase plans, actual living
   participants, own leads, and all thirty-six approaches.
8. Attendance: zero-day pause, partial attendance, birthday interruption, reload,
   cancel, insufficient completion supplies, participant death and retirement.
9. Once-only behavior: caches, salvage, survey herbs, Moonroot herbs, objective
   proceeds, battle rewards, proof, unique property, services and re-entry.
10. Canonical identity: another town, old boss records, prior combat/inherited
    resolutions, unavailable/dead participants and pre-existing services.
11. Battle integrity: victory/retreat/defeat; wrong run/cell/slot/boss/encounter/
    location; duplicate completion, changed actor identity and pending reload.
12. Fog: hidden/adjoining text, ARIA/data attributes, disabled explanations,
    missing-proof cues, resource previews, contacts and discovery journals.
13. Compatibility: old generic mazes, authored snapshots, six/seven-room regional
    descents, genuine six-floor fixtures, active battles, partial/completed saves.
14. Public integration: actual engine actions and delegated UI for all eleven
    identities, campaign completion after exit, usable services and export/import
    after meaningful transitions.
15. Release: targeted regressions, full reserved regression gate, offline
    build/module graph and verified hosted smoke test. No publication at this
    initial source-only checkpoint.

## Initial checkpoint verification

Command: `timeout 5s node --test tests/maze-content-manifest.test.js`.

Result after adding fixed new-manifest goldens: 12/12 passed, zero skipped/failed,
0.37 seconds. The first run exposed a
test mistake: it excluded the optional service-hazard target from its own
reachability search. The corrected test permits entering that target to perform
its own aid while still excluding all other anchored blockers. No prerequisite
or production rule was relaxed.

An approved bounded pure sweep then checked 10 seeds × 11 sources: all 110
manifests passed in 247 ms, with peak process RSS 114,688 KiB. Every authored
source covered all three optional layouts, all three objectives and all three
motives. The durable result is
`verification/maze-content-manifest-10-seeds.json`. The runner records elapsed
time and process peak RSS.

After approval, `timeout 10s node --max-old-space-size=192
scripts/check-maze-content-manifest.mjs --seeds 100 --output
docs/verification/maze-content-manifest-100-seeds.json` passed all 1,100 manifests
in 2,042 ms with actual peak RSS 234,128 KiB. The V8 heap cap is not a whole-process
RSS cap. This also checked effective-kind coverage for every anchored room across
all source variants. Runtime integration, the engine suite, offline rebuild and
publication have not been performed at this pure checkpoint.

## Runtime identity and succession checkpoint

New authored/signature entries now use the approved overlay; existing version 1
mazes remain on their old actions. Old generic-flow tests explicitly construct
pre-existing v1 saved records. New engine cases perform actual v2 proof, aid,
lead and source choices instead of weakening new prerequisites.

The shared `mazeRunIdentity` contract is `{mazeId, runSeed, runGeneration,
manifestVersion: 1, family, sourceId, locationId}`. New attended targets and
completion receipts also bind the actual actor. New battle contexts include
exact run seed/generation/actor, source slot, encounter, guardian and location.
The full canonical manifest still validates independently of mutable progress.

Only v2 story records, numbering and once-only completion receipts pass to a
successor. An active v2 run is archived before death clears it; unfinished work
is not inherited. Visited cells represent recorded route knowledge, not a new
hero's personal memories. Physical repairs, claimed supplies and public proof
retain their original attribution. Canonical resolved guardians and their
services/property never pay or instantiate again.

Private contact/trust does not pass with that record. Signature heirs attend a
fresh two-day contact with the actual living/present household, appended as a
new actor's attestation without replacing original leads or granting survey
herbs again. Signature outcomes are bounded at 448 for the game's 200-life
dynasty limit. New maze people's personal bonds, memories and known facts are
retained under the ancestor's identity and reset for the heir. Authored heirs
must personally hear unresolved guardians and obtain witness permission again;
an ancestor's private witness proof or permission to name them is not reused.
Already completed refuge work does not charge cloth or grant aid rewards again.
Authored history is bounded at 840, allowing separate hearing/permission while
all physical effects remain once-only. The all-v1 succession path is unchanged.

### Difficulty and cost accounting

Version 1 earned-balance/path/resource parity is a compatibility requirement,
not a claim about new v2 difficulty. New v2 signatures restore two actual
guardians and their original source costs. Attending both guardians' three
leads costs ten days, copying the ledger one day, and the selected final service
three days: fourteen before the chosen approaches. Approach days add 2–5 for
Rainward, 4–6 Saltreach, 4–8 Highstone, 4–8 Blackgrove, 4–7 Ashplain, or 4–7
Bellwater. Optional crossing work and ordinary entry/movement/camp costs remain
additional. Final care costs 8 gold and pays 12; trade pays 35; scheme pays 55.
Approach supplies, fees and prerequisites remain their exact v27 source rules.
This is controlled cost accounting, not an earned-route win-rate or balance
certification. Existing movement, Focus cadence, camp and generic hazards are
unchanged. No universal combat-free route is claimed.

### Verification status

The first reserved engine/UI file was terminal at 3/4 passed in 5.83 seconds:
all five authored identities, exact battle-save binding, and delegated UI
fog/pending attendance passed. The signature test used outdated boss-ID action
suffixes; production deliberately uses numeric suffixes so hidden IDs cannot
leak through delegated DOM data. The fixture is corrected, without a production
rule change. Its rerun and actual `continueAsChild` full-save/roundtrip fixture
are queued behind the publication lane, not silently claimed as passing.

Focused source coverage includes 604 exact authored-helper legacy cases, 114
exact legacy boss-story cases, and five exact legacy attendance outputs, plus
the immutable geometry/manifest goldens. Full reserved regression gate, old
earned-balance engine cases, build and hosted smoke remain pending. This work
does not complete roadmap gate 11 or authorize a readiness claim by itself.

At commit `e0ca27b25ff364ed5b05253d75d96388600a878e`, the combined seven-file
focused source command is terminal at 55/55 passed, zero failed/skipped/cancelled,
1.32 seconds. Read-only comparison against published commit `19591036` confirms
the complete 1,733-byte `mazeLayout` export is byte-for-byte unchanged (SHA-256
`d0b792a9f660e594718853c337b21896a2ff4eb36c9d72d5cb9eec11027bf9e3`).
Review regressions also bind retained completion receipts to their exact final
actor/day/method and reject same-numeric-ID provenance collisions instead of
misclassifying them as evicted archives.

The next reserved five-case engine/UI run was terminal at 4/5 passed in 18.35
seconds, peak RSS 317,792 KiB. All eleven actual content identities, exact
battle-save binding and delegated UI fog/attendance passed. The successor case
failed in its controlled maturity setup, not a proven runtime inheritance path:
a diagnostic found its raw lineage invalid before maze/RPG composition, while
both composed maze and RPG validators passed. A later added parent precondition
also correctly rejected the manually advanced calendar. That setup has been
replaced with the genuine v21 fixture's existing living adult child, with no
clock/age/genealogy patch. The revised case validates its canonical input, then
uses public content actions, actual stair exit/retirement, and `continueAsChild`.
It still must pass the reserved successor-only and final complete-file runs.
Optional capture writes full parent/heir/renewed-heir snapshots only after all
assertions succeed. No successor artifact or successful engine pass is claimed
before that terminal result exists.

### Genuine adult-child successor verification

The genuine adult-child case subsequently passed on exact source
`36a79b179231fb40949d707a4d431d45d4791edb`: one selected test, one pass, zero
failures/skips/cancellations, exit 0, 18.83 seconds, peak RSS 358,728 KiB under
Node's 512 MiB heap cap. The preceding ten-second run was undersized and ended
inconclusively with exit 124; its explicitly approved sixty-second retry passed
without a production code or source-fixture prerequisite relaxation.

The real changed world exposed `signature_blackgrove` at `home`, rather than
the destroyed Rainward settlement used by the earlier fixture assumption.
The case validates the canonical v21 input first, resolves its genuine pending
event, then uses actual enabled entry/content/exit/retirement/settlement and
`continueAsChild` actions. The existing living child is age 41, not an invented
or manually matured heir. Controlled resources/positions remain explicitly
synthetic, not an earned-route balance claim.

The passing case captured full unresolved/completed parents and heirs plus the
active renewed heir in `tests/fixtures/maze-identity/v2-successor.json.gz`:
458,888 compressed bytes, 4,261,515 uncompressed bytes, SHA-256
`fcc1b79ed79a052ded974d65ef0350d99526f88e1381884b596d86edb843ffbe`.
All captured states passed actual engine validation; heirs and the renewed heir
also passed exact JSON migration roundtrip. Their physical run remains generation
1 while the new actor is generation 2. The heir attends two new contact days,
keeps original leads immutable, and receives no duplicate claim or lead reward.
Completed canonical resolutions/services/global completion receipts persist
unchanged. The durable result and compact projections are in
`verification/maze-content-successor-engine.json`.

This is a selected-case pass, not the complete five-case final gate. That complete
engine/UI rerun, legacy engine regressions and release/build/hosted gates remain
pending; roadmap gate 11 is still incomplete.

### Final complete engine/UI file

The complete five-case file subsequently passed together on exact clean source
`ab021de629d000681e5ef533743b4aadee2334de` with `timeout 90s node
--max-old-space-size=512 --test --test-concurrency=1
tests/maze-content-engine.test.js`: 5/5 passed, zero failed/skipped/cancelled,
exit 0, 25.405 seconds elapsed, peak RSS 343,456 KiB. No capture flag was set;
the previously validated successor artifact was not rewritten and its SHA-256
remains unchanged. The durable terminal report, including each case's timing,
is `verification/maze-content-full-engine.json`.

This complete file covers all five authored source identities, their exact
battle save, all six signature lead/two-guardian/final-service flows, delegated
fog/pending attendance and genuine public adult-child succession in one run.
Source roadmap 19 is ready for integration review, not publication. Legacy
engine regressions, the reserved release gate, integrated build/module graph
and hosted verification remain required. Roadmap gate 11 remains incomplete.
