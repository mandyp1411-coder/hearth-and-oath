# Accepted commitments and returning chapters

Baseline: v0.43.0, 9e1d7a74916203a7e8946e3120e5c89e6f322751.

## Player-facing change

Journal → Active Quests now includes one quiet **Commitments & returns** disclosure when there is something the player actually chose. It contains:

- The accepted civilian commission, with saved client, profession, standard materials/work days, requested or achieved quality, original settlement, due day, base payment and current making/delivery stage. Its matching deadline obligation is not repeated as another card.
- Chosen personal stories, including the exact earned return age/day, last decision, waiting/ready/paused status and interrupted saved attendance. Pause and Resume target only that story. Reading a proposal does not accept its next work agreement.
- Regional-story and faction returns only after an actual completed choice or an existing accepted work project. Merely hearing a faction, leaving its opening proposal, or leaving an uncommitted chapter-zero regional scene does not create a commitment.
- Unresolved promises, including existing school, mentor, research, clinic, keeper-term, conversation-note and fellowship continuations where their source system exposes one. Unknown older promises remain readable without fabricated fulfillment actions.

Find uses the existing map handler. Provider visits use existing settlement walking and meeting controls. Work methods remain at the Work Steward, so their current materials, fees, actual work days, skill requirements and invoice choices remain reviewable. Direct continuation buttons come only from the engine's current offered actions and retain its blockers. Interrupted RPG work quotes remaining attendance and any unpaid saved fee rather than repeating its legacy zero-day action descriptor.

Search opens matching commitment results even if the ordinary disclosure was previously closed. Added wrapping rules use the Journal's existing reading scale and muted styling.

## Save and mechanics boundaries

`journal-commitments.js` is a read model over existing state, not a second authoritative task store. No save schema, calendar progression, economy, quest acceptance, reward, deadline penalty or paid snapshot was changed. Canonical contacts supply conversation destinations; fellowship destinations reuse that undertaking's own location helper. Existing chronological life history and finished-story archive remain intact. Finishing or releasing work removes the live card through the existing source state, with no new completion payment or archive write.

The existing return forecast now preserves its real due day after readiness instead of moving it to today's date. Legacy adult calendars use their fixed age-eighteen/day-zero origin; birth-mode and successor calendars retain the saved birth-day offset.

## Verification

The tests use the genuine migrated v0.30 fixture and genuine v0.1 legacy fixture. Deadline/ready-age and location boundary tests are explicitly controlled fixtures, not claims of naturally played years or journeys. Actual acceptance, attendance, invoicing, release, chapter decisions, pause/resume and navigation use public engine or production UI handlers.

Final commands/results are recorded below after completion. Handler tests do not measure CSS geometry, actual keyboard/screen-reader behavior or browser rendering. No shared browser life was imported, reset or changed. Offline rebuild, network-blocked standalone parity, responsive browser inspection and publication remain integration gates; generated offline files are deliberately excluded from this source-only change.

- PASS: `node --test tests/journal-commitments.test.js tests/local-intrigue.test.js tests/local-intrigue-calendar.test.js tests/world-first-focus.test.js`: 53/53, 130.8 seconds. This includes the latest 19 Journal tests plus existing intrigue, interruption and current-navigation/provider handler coverage.
- PASS: Three subsequently added production handler regressions, selected with `--test-name-pattern='production Journal delivery|production Journal release|production Journal waiting'`: 3/3, 8.4 seconds. These cover invoice/payment, release and optional waiting-story navigation. Together the Journal file has 22 passing tests; its final three were run separately to avoid rerunning unrelated setup.
- PASS: The earlier adjacent-system batch ran all 17 existing career tests, all 8 existing local-intrigue tests, all 5 existing local-intrigue-calendar tests and all 21 existing world-first tests: 51/51 existing tests. One overly broad new test assertion incorrectly counted the valid zero-day Cancel control as part of the Continue quote; that assertion was scoped to Continue and passed in the final batch above.
- PASS: `node --check` for the new Journal module, Journal integration, quest records, fellowship and the new test file; `git diff --check`.
- Independent source/handler review found no remaining concrete correctness issue after the final fixes. It separately ran the latest 19 Journal cases successfully before the three final handler additions.
- NOT RUN: the full historical `npm test` aggregate, real-browser responsive/accessibility inspection, generated offline rebuild/parity and publication. These are not claimed as passed.
