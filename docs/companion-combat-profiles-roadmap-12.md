# Companion combat profiles (roadmap 12)

## Bounded change

Party now has one initially collapsed native Combat disclosure per recruited companion. The existing personal goal, values, relationship, memories, identity and invitation controls remain. Readiness stays visible outside the disclosure: active health readiness, reserves, downed, away with a recorded return day, departed and deceased are distinct. Existing personal boundaries and preparation barriers still control invitations. Party retains its existing recruited-only list: a normal departure clears recruitment and therefore leaves this view. Defensive departed/dead labels do not create membership records or change existing relationship memories.

The disclosure shows combat role and calling, current/capped Health and Focus, actual attack, armor, initiative and spell power, existing battle moves with costs and damage/control/support descriptions, and techniques actually recorded by their personal chapters. Chapter number alone never grants an ability. Low current Focus is disclosed rather than concealing learned moves.

`companion-combat-profile.js` is a pure detached read model used both by Party and by `createBattle` for new companion actors. `combat-moves.js` holds the unchanged skill/tactic metadata used by the command resolver and the profile. This avoids a circular combat/UI dependency. Saved battles retain their captured actors, and profile viewing changes no state.

## Preserved behavior

- No changes to maximum Health/Focus, agility/initiative, numeric growth, combat AI, equipment, recruitment or the first-three-active battle-selection rule.
- Revision-5 growth remains min(9, floor(sqrt(victories) / 2)). The exact next thresholds are 4, 16, 36, 64, 100, 144, 196, 256 and 324 victories. A participant receives existing victory credit only through the existing battle-resolution path.
- No catch-up points, passive power, automatic healing/revival, new NPC identity, save fields or migration writes.
- Older rule revisions have no victory-growth grant. Missing/malformed legacy readout fields use finite battle-compatible defaults without writing them back; unknown technique records never invent moves.
- New modules use the source builder's supported direct exports; public combat exports and action tables are unchanged.

## Verification

Completed:

- Changed source and new tests pass `node --check`.
- The 189-module application dependency graph is acyclic and its standalone-translated JavaScript parses. This syntax-only check wrote no build output and embedded no assets.
- Independent source-only review found no P1/P2 findings; browser verification remains pending.
- Extracted `skillOf`/`tacticOf` source is byte-for-byte identical (excluding the trailing separator blank line) to published v44 commit `236a5df`, SHA-256 `02b5d443871a2ed811659ab2ae963458574961baaec86ad5a1fdf9ac33527712`.

Focused runtime results:

- The initial serial run passed all 120 pure profile tests and all 57 existing combat tests. Two handler cases stopped at invalid controlled-fixture setup before mounting: birth-mode recruitment below age 16 is forbidden. The fixture now starts from a real age-18 life, resolves its opening choices normally, clones per case and keeps deceased companion/lineage alive flags in agreement. No product changes were needed.
- The corrected two-case handler suite passed 2/2.
- Final combined command: `node --test --test-concurrency=1 tests/companion-combat-profile.test.js tests/companion-combat-profile-ui.test.js tests/combat.test.js` passed **179/179** in 32.8 seconds: 120 profile cases, 2 Party handler cases and 57 existing combat regressions; zero failures, skips or cancellations.

Remaining integration verification:

- Browser layout/native summary interaction and final combined-release build/offline parity belong to the integrating release. Handler tests do not establish browser layout or native summary activation.

The focused pure suite covers all six companion identities × six acceptance thresholds × zero/one/two recorded chapter techniques; exact pre-extraction actor serialization, real battle command metadata, all actual next thresholds, resource caps/initiative, legacy defaults, read-only/detached results and availability edge cases. The handler suite uses controlled valid age-18 saves and the actual Party route to inspect disclosure count/defaults, readout values, interrupted/repeated navigation, remembered open/closed UI state and unchanged saved life/slots. Unavailable status snapshots deliberately retain recruited membership to exercise defensive labels; they are not natural departure/death lifecycle playthroughs. These are deterministic profile/handler fixtures, not earned-life balance evidence.

This is a source-only change. It does not bump a version, rebuild offline artifacts, publish or alter the public audience.
