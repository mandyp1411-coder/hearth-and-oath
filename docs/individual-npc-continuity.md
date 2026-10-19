# Individual public-role continuity: Stage 1 and Stage 2 candidate

Roadmap ID16 remains partial. This source-only candidate starts from published
v0.45.1, commit `30e296bf0c72751ce9124b670cd1e1a64c149cf5`. It is not a new
published release. Stage 2 now includes calling-mentor identity, validation, private study history,
formation supervision and prospectively marked original specialization trials.
The final integrated gates are not yet complete.

## Included

Ten ordinary town-roster places per exposed settlement and the generic doctor,
work steward, innkeeper, craftsperson, watch captain, guide, animal keeper,
archivist, materials merchant, apothecary, outfitter, faction representative and
envoy use a finite `npcContinuity.version = 1` sidecar. Role slots point to
individual immutable identities. Their public snapshots contain no Bond,
private memories, confidences, met flags or lesson counts.

Adoption observes the current/previously visited roster on an authoritative
state transition. The first incumbent keeps the exact legacy ID, name,
likeness, pronouns and absolute base-age semantics. Imported incumbents receive
at least eight future years before any individually seeded handover. No
calendar movement, retirement, death, reward or authored decision occurs merely
because a save was imported. Repeated adoption keeps its saved dates.

Future entry ages and terms are deterministic and use the existing ancestry
aging policy. They describe public retirement, never a death date. Actual
`life.people` availability, relationship, home, mortality and memories remain
authoritative before a public contact projection. New public holders receive
distinct IDs, not the previous person's private state.

Only completed action handlers reconcile due handovers. Rendering and the
middle of elapsed-time processing never exchange a selected participant. A
currently pending dialogue/decision can retain its own actor until resolved;
an accepted favor or paused project does not hold the public office open.
Known retired identities remain inspectable with their dated successor, age
explicitly labeled at retirement, and unrecorded later whereabouts. Unknown
intermediate holders crossed during a time jump do not become a simulated
population archive. Historical slots remain valid if the site is later
destroyed, evacuated or stripped of all current services.

## One-time favor return policy

Only an already-active favor at a real post-adoption handover captures a
hero-private `returnWindow` with the retirement day and a last return day
90 days later. The handover entry and Journal show that exact date. Import
does not open a window, revive an already-unavailable legacy person, add a
failure, or alter the original supplies, payment, acceptance date or history.
The current schema has no preexisting favor deadline to replace.

During the window, the original named one-time delivery can appear in Journal
only if death, absence, site closure and occupation checks permit it. It does
not restore ordinary presence, new conversations, romance, crime targets,
circle outings or public services. After the window the accepted favor remains
recorded but that historical person's later whereabouts are not asserted.
Withdrawal is always an explicit zero-time, zero-resource, zero-trust-change
control when ordinary action barriers permit a decision. It neither punishes
the player nor grants a reward.

## Ongoing private agreements are stricter

An old consent record is not evidence that a retired person is currently alive,
present or willing. Donor sessions and moon-watch preparations continue using
their existing current-person/presence/trust checks. They do not use the
one-time favor exception or a historical actor fallback. A real private
life-person record can remain available under the existing rules; confirmed
death and absence retain the existing outcomes.

Where only public retirement and unknown later whereabouts are recorded, the
exact donor/moon-watch agreement is kept but its availability is derived as
paused. No feeding, automatic session, watch preparation or watch benefit is
granted. The UI explains the pause and retains the ordinary animal-sustenance
or independent-refuge route and explicit end controls. This is not an extension
of consent, a new standing permission or a fabricated withdrawal of consent.

## Deliberately preserved

Real merchant, shrine-keeper, education-teacher, ruler, court, contract-giver,
authored cast and workplace-society lifecycle logic is not replaced. Resistance
presentation reuses its original watch/archivist identity without permanently
changing the canonical public role. Merchant contact projections, real
merchant-owner IDs, stock seasons, stolen property IDs, gear provenance and
transfer recipient comparisons are unchanged.

The dynasty copies public roster heads and dates, not personal relationship
stores. Favor windows remain on the old hero's favor record. Old mentor
met/lesson records are kept in the current hero's progression.mentorHistory,
never public snapshots or an heir's fresh study ledger. Earned calling and
skills remain untouched by a public handover.

## Calling mentors and unfinished supervision

Twelve finite mentor slots keep the exact calling-mentor-CLASS legacy identities
on adoption. The canonical legacy age is the existing conversation projection,
30–47 seeded base years plus world years, not the former service-only constant
38. Current class cards, contacts and service rows share one identity/age source.
Actual life-person age, partner/family residence, availability, Bond and memories
remain authoritative. Successor ages start at their own appointment and existing
ancestry policy, with distinct calling-mentor-CLASS-npc16-rGENERATION IDs.

A real retirement archives only this hero's formal meeting and lesson counts;
the new mentor starts unmet with zero personal lessons. Met-only old mentors
remain inspectable, including their private lesson count. Public head names and
places rebind for an heir without borrowing the prior hero's study or confidence.

New pending calling initiations capture their exact mentor. Old pending calling
scenes gain only an additive actor reference; their authored text/options are not
rewritten. Pending formation scenes retain the original/saved supervisor. Only
that currently pending scene pins its actual living actor; an ignored formation
or service promise does not keep an office open. An authoritative recorded death
can vacate a role immediately after an action, citing the existing life record.
Absence alone never creates a death or early successor. A dead/unavailable
pending personal exchange stays readable and has an explicit no-reply dismissal,
without new messages, effects, confidence, personality reward or successor voice.

Accepted service and formation supervision never transfers silently. An explicit
named handover preserves the original mentor, original terms/deadline, actual
work, interpretation and witness permissions. The new person does not inherit
Bond or private testimony. Formation reward checks repeat after elapsed time;
a supervisor dying during final review cannot award recognition. Actual work
stays recorded for a later explicit living handover.

## Prospectively marked original specialization routes

The original non-birth paladin oath, necromancer ethical choices and assassin
commission have substantive unique story choices and a guarded-combat trial.
They are retained, not suppressed in favor of a catalog entry. NEW revision-5
seek_order / seek_necromancy / seek_assassin offers bind their current individual
mentor through normal service availability, rather than repeatedly invoking an
ageless world.mentors cast. The old authored world route records themselves are
unchanged for compatibility. Already-accepted unmarked events/trials/battles keep
their original cast, choices, battle context and outcome handling.

A small hero-private flags.legacyMentorTrial.version=1 receipt marks only new
offers. It stores original/supervising actor summaries, up to four actual field
attendance days, a bounded named-handover chain, and completion/recognition
receipts. A birthday/calendar interruption keeps partial attendance and only the
remaining days can be resumed. An unavailable original supervisor requires an
explicit new supervision agreement before unfinished work continues.

Completed guarded combat keeps its normal combat result/Gold/experience exactly
once even if the supervisor dies afterward. The dated exact-actor completion
proof is preserved. If the original supervisor is unavailable, the existing
calling-specific recognition/reward waits for explicit administrative review by
a current living mentor. That review repeats no combat, field days or fee,
changes no original proof author, and substitutes no personal consent/testimony.
The recognized receipt and existing battle resolution token prevent duplicate
class/reward effects across repeat actions/import. Completed field work likewise
needs no repeat days. Withdrawal preserves original choices/work and existing
combat results with no new punishment, fee or completion reward.

## Verification status

All changed JavaScript files and the focused test file passed syntax checks;
`git diff --check` passed. Source review identified issues with return
reachability, generic affordance leakage, canonical IDs, historical sites,
construction ages, retirement UI and political presentation; fixes are included.

On 2026-10-17, `timeout 180s node tests/npc-continuity.test.js` ran serially in
one Node process: 19 passed, zero failures, exit 0, 4.43 seconds. This includes
small diagnostic sidecar fixtures, genuine v0.30 base/offsite/planned/road save
migration, repeated migration with all nonfeature payloads unchanged, and a
pending conversation opened through actual public-engine walk/talk actions.
Actual sanctuary action/time/watch functions confirmed that unknown retired
participants do not grant sessions or watches and that the earlier agreement
remains inspectably paused.

Calendar jumps and synthetic consent setups in the focused file are explicitly
diagnostic fixtures, not claimed natural lifelong play. No full lifetime
reproduction, all-legacy-version compatibility pass, aggregate source gate,
browser QA, offline build/parity or publication is claimed here. Mentor Stage 2
and the final integrated gates remain required before ID16 is complete.


## Stage 2 checkpoint evidence and remaining gates

Module-level mentor contracts passed 13/13 in 3.09 seconds before three further
pure regression additions. Existing calling contracts passed 12/12 in 0.80
seconds; existing fellowship contracts passed 10/10 in 11.09 seconds after
updating the additive event-ID contract. Prospective marked-legacy contracts
passed 7/7 in 2.08 seconds. Each ran serially without importing the engine.

The Stage 1 focused file reran 19/19 in 3.33 seconds. Six Stage 2 engine contracts
ran in 33.32 seconds: five passed, including a genuine fresh birth through every
natural public transition to age 18, all genuine v1-v5 published captures and
v0.30 migration/idempotence, met-only archive visibility, and direct/public heir
rebinding. The remaining diagnostic deceased-dialogue setup initially omitted
lineage/family-depth registration. After using the actual registration helpers,
its targeted full-save/dismissal/import regression passed 1/1 in 1.27 seconds.
This is not a claim that the six-case file has yet passed as one final run.

The prospective legacy engine/battle contracts, final combined rerun, parent
independent extension review, aggregate integration, offline build/parity and
browser QA remain outstanding at this checkpoint. No publication is authorized
from this branch and roadmap ID16 is not yet complete.

### Review fixes after the Stage 2 checkpoint

The parent independently reviewed the prospective legacy extension. Field
attendance now advances one day at a time, checking the exact supervisor before
and after each elapsed day and stopping on calendar needs, events, death or
absence. A day containing unavailability passes on the calendar but is not
invented as a completed supervised lesson. Prior completed attendance remains.

The real engine award callback explicitly verifies success after the existing
void award function; a missing/failed callback cannot create a recognition
receipt. An already-earned legitimate calling is not rejected on import. Modern
calling actions cannot begin while a marked original-route trial is active;
existing earned progress can close the duplicate receipt without a second class,
skill, experience or standing reward.

Exact accepted faction cast, custody and evidence actors from roadmap ID17 are
retained as historical identities, including actors never personally conversed
with. These names can be read in the relationship record as participants in
accepted work without inventing a formal meeting. Only an actual pending faction
objective decision temporarily retains its current exact cast/custodian; an
ignored active mission/project never freezes public office turnover.

Latest pure runs: 17/17 mentor contracts in 4.02 seconds, and 10/10 marked legacy
contracts in 2.70 seconds. Engine legacy-route reachability, old scene/battle
compatibility and actual recognition callback tests are authored but await the
shared engine lane. Final integrated evidence remains pending.

## Final isolated candidate evidence

The final serial engine rerun passed on 2026-10-17:

- `timeout 180s node tests/npc-continuity.test.js`: 19/19, 3.91 seconds.
- `timeout 180s node tests/npc-continuity-engine.test.js`: 6/6, 32.28 seconds.
- `timeout 180s node tests/legacy-mentor-engine.test.js`: 5/5, 2.66 seconds.

The legacy engine file covers real normal service reachability for all three
migrated non-birth routes, preserved unique original choices, fixed pre-feature
v45.1 offers/trial/battle, the actual engine award callback after a completed
combat and diagnostic mentor death, exact proof authors, once-only recognition,
reload/repeated clicks, and cross-path blocking. The fixed captures have explicit
provenance in `tests/fixtures/v45-legacy-mentor-trials.md`.

Final pure mentor contracts passed 19/19 in 4.51 seconds, including family-origin
ID18 exact-cast retention and pending-scene pin boundaries. The marked legacy
pure contracts passed 10/10 in 2.70 seconds. Earlier existing calling and
fellowship files passed 12/12 and 10/10 respectively. Syntax/diff checks pass,
and the 190-module static import graph is acyclic.

Real engine contracts also caught and fixed marked-trial retreat/defeat losing
its accepted flag, and a zero-time review unexpectedly collecting an unrelated
deferred household bill. Only marked new-route retreat/defeat retains its trial
flag. Zero-time new handover/recognition/withdrawal controls leave deferred
household debt due for its normal later settlement; no debt is forgiven.

This isolated source candidate is ready for integration review, not publication.
It has not been tested as an aggregate with current published v0.47, ID11, ID17
and ID18. The integrated same-day faction sourceRevision/successor custody proof,
post-retirement family-origin archivist validation, full source gate, generated
offline build/parity and browser QA remain the integrator's required gates.
No offline/generated assets, public version or audience settings changed here.
