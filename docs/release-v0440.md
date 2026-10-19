# v0.44.0 verification

## Scope

This release integrates roadmap items 3, 4 and 5 on top of released v0.43.1, retaining its cross-tab save protection and Second Wind cost correction. It does not claim the other audit-roadmap items are complete.

- Journal: source `c613fb6`, integrated as `4a3e27d`.
- Active living party camping: source `5a7e653`, integrated as `22eb7eb`.
- Honest maze entry/resource rules: source `02b45cd`, integrated as `abf06b2`, after its camp prerequisite.

The Journal is a read model over existing accepted work and story state, not another authoritative task store. It retains exact return dates and original choices. Rank-zero faction hearing and uncommitted regional openings remain offers. Find, provider visits and pause/resume reuse their existing controls. Camps use actual attended days and capped recovery, do not revive downed/deceased companions, and never heal inactive reserves. Maze movement retains its original pre-step cadence, Focus charge, calendar order, fog, topology, finite rewards and real stair rules.

No account, cloud-save, audience, security-setting, purchase or unrelated content change is included. Existing save/conflict async handling remains unchanged. The shared maze-entry predicate is the only engine change from the maze clarity integration. A read-only fellowship location export was expressed as an equivalent exported const to fit the standalone builder's supported translation syntax; no location or fellowship rule changed.

## Source gate

PASS: the bounded source command below completed with 196 tests passed, zero failed, in 249.8 seconds. It runs one test worker at a time. It includes the 22 Journal, 27 camp and 19 maze-rule regressions, plus saves/conflicts, reliability, Second Wind, combat Focus and current commerce/provider handlers. It is not the full historical aggregate.

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/journal-commitments.test.js tests/party-camp-recovery.test.js tests/maze-resource-rules.test.js tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/saves.test.js tests/save-deletion-v40.test.js tests/reliability.test.js tests/second-wind-balance.test.js tests/combat-focus.test.js tests/trade-craft-windows-v42.test.js tests/work-trade-separation.test.js
```

## Standalone gate

The build and embedded verifiers run separately, with no competing heavy Node process:

```sh
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-journal-maze-v44.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-saves-v431.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-followups-v43.mjs
```

The new verifier checks exact byte/part parity and executes the actual embedded production UI. Synthetic slots exercise accepted-commission visibility/deduplication, free personal pause/resume and Find, actual provider navigation, the real returning proposal with no acceptance on defer, named party camp accounting, unchanged reserve/fog state and arrow-key movement with updated Focus/day horizon. Whole resulting states are compared with online engine actions. Networking is forbidden.

The retained save verifier still checks neighboring-slot preservation, same-slot conflicts, the latest unsaved export, explicit reload/recovery backup and Second Wind's full self-use cost. Its displayed-release assertion now follows the current package version rather than hardcoding v0.43.1. The retained conversation verifier protects played antecedent recognition and contextual reply continuity.

## Verification boundaries

Semantic handler checks do not measure browser geometry, screen-reader behavior, physical touch or real cross-process browser scheduling. Controlled calendar/resource fixtures are not earned-life balance or dungeon win-rate evidence. Browser work must use normal UI on the existing QA life without importing, overwriting or deleting saves. Earlier open tabs must reload the current build before gameplay, because stale pre-protection builds cannot inherit a later saver fix.

## Final pre-publication results

- PASS: the serialized source gate above, **196/196**, 0 failed, 249.8 seconds. No full historical aggregate pass is claimed.
- PASS: serial 1536 MB offline build, 16 stored parts. No rebuild was repeated after recovering the completed build log.
- PASS: all three embedded verifiers above, run one at a time with networking forbidden. The combined Journal/maze/camp verifier and retained save verifier report the same exact bytes and hash; the retained conversation verifier also completed.
- PASS: syntax checks and diff hygiene for the integrated source and verifier scripts.

Standalone artifact: **132,224,660 bytes**, **16 parts**. SHA-256: `5b8dfa174a6700b9675f232f79567c9f79b006533dc78a872be840843183b8de`.

At packaging, the existing public Site remained at v0.43.1 / saved version 66. Publication is restricted to the same existing public Site and URL. Live browser observations occur after deployment and are reported separately; no responsive or physical-device browser pass is implied by these pre-publication checks.
