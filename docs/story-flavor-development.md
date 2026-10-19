# Story flavor restoration · v0.38.0

This is a narrow narrative-depth pass, not a new system. Newly opened first-three-chapter Family’s Old Debt proposals now use the named participant’s voice, the household agreement, the disputed room and the actual claim. The corrected-claim variant acknowledges the already filed correction. Completed work retains its specific account and measured consequences in the Journal and notice instead of being replaced with a generic statement of intent.

The Flooded Causeway opening restores the existing authored cast, the watch light below the flooded road, the supper cabbage, the merchant’s oil and the rival’s proposed control. Outcomes remain hidden until work finishes; choice quotes retain exact time, fees, proceeds and requirements. Its completed opening keeps the actual authored outcome with attended days and fee. The remaining four chapters are not changed.

## Continuity

Narrative edition 30 remains in place, including its protection against inventing detailed historical scenes from opaque legacy records. New personal prose is applied only after deed and fee/time/reward terms are captured. A bounded marker distinguishes new proposals from already saved pending rows and accepted projects. Old pending proposals, existing completion accounts and historical records are not rewritten. Non-target stories and mechanics are unchanged.

Named deceased or absent participants retain existing safe delivery handling. Completion is recognized only by an actual advance of the covered chapter, not merely a choice click; interrupted or cancelled work cannot acquire a successful completion account. A deceased participant does not acquire new trust from the prose change.

No rewards, checks, costs, attendance schedules, services, legal outcomes, class progression or art were retuned. The release preserves the owner-private Site audience.

## Verification

Verification results are recorded below. Browser visual QA is unavailable and is not claimed. Automated simulation/handler checks do not establish visual layout or device ergonomics. The full legacy aggregate has known pre-existing obsolete-expectation failures; a focused release gate is used rather than claiming a clean full historical suite.

- New narrative gate: **19/19 passed** in `tests/story-flavor.test.js`, including all covered approaches, corrected claims, exact attended time/fees, interruption, defer/abandon/cancel, deceased and dying actors, save/reload and actual UI handlers.
- Shared release gate: **46/46 passed** across `world-first-focus`, `yard-tournament`, `local-intrigue` and `local-intrigue-calendar` tests.
- Differential audit: **36/36 controlled full-state comparisons** passed against the exact preceding commit `c709a98dc5a428182bd330d786d8d05bfb53eef6`. Only display prose and the prospective marker are normalized; typed terms, effects, resources, dates, service objects and all other state must match. The reusable command is `node scripts/compare-story-flavor.mjs BASELINE_DIRECTORY`; setup instructions are in that script.
- The older `story-continuity` suite passed 11/18; the same seven old automatic-opening/remote-service/legacy UI failures reproduce on that exact baseline. The simultaneously run `world-first-focus` suite passed all 21 checks. These legacy failures were not silently reclassified as passes or repaired by changing this narrative release's mechanics.

- Final standalone build and `verify-offline-interface-v40.mjs` passed. The embedded runtime ran with zero network requests; all 16 parts reconstruct the self-contained game. Exact size and digest are recorded in `docs/verification-v0.38.0.json`.
- Broader `world-focus` audit: **58/63 passed**. All five remaining assertions reproduce on the prior implementation (seeded war absent, generic allegation dialogue missing a witness name, and three obsolete service/community UI selectors). Forensic caveat: the untouched baseline suite first aborts on an obsolete top-level expectation that the old generic description contains “forgery allegation”; only that setup assertion was removed in the temporary baseline test copy to reach the five downstream assertions. Baseline implementation was unchanged. These are documented existing failures, not a clean-suite claim.
- Independent QA reviewed the prospective markers, typed-term ordering, history handling and public completion wrappers; no new failing cases remained at publication.
