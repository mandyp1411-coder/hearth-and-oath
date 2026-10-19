# v0.8: people on the other side of an ordinary life

The v0.7 audit found that a civilian could work for decades without a person returning for a changed reason. This addition makes a delivered commission the beginning of a relationship, lets a learner negotiate a future beyond the player's workplace, and keeps a long life open to new neighbors.

## Playable additions

- Quarterly boards use three recurring households per profession and settlement. A household is recorded only after an actual commission is accepted. Their name stays stable across quarters; the agreed goods, pay, quality and deadline remain captured in that particular contract.
- A delivered invoice remembers whether the customer received honest explanation, an affordable price, or a concealed shortfall. Thirty-six authored household concerns cover twelve professions: a moving crossing, a cloudy preparation, a disputed song, a split gallery support, a care plan and other actual consequences of ordinary work.
- Followups offer inspection and repair, shared household methods, an honest refusal, or preparation before promising. Repair costs six gold, three actual days and profession-specific materials; teaching costs twelve gold and four actual days. Personal trust and a relevant lesson are earned after the work finishes. Opening a discussion produces neither wages nor a completed repair.
- Actual staff with developed skill can ask for signed credit, safer hours and later an independent beginning. Credit requires two days, eight gold and one cloth; on completion it improves the worker's agreed wage. Qualified staff can receive fourteen days of preparation funded by 600 gold, six wood, four cloth and two ore, then choose a named independent door, cooperative methods or further study. Departure ends their paid place in the player's roster and retains a correspondent with their own goal. No passive income is siphoned back to the player.
- A deferred discussion has a named **Return to the plan** activity. Players can earn money or gather supplies first without being forced to refuse a person they intend to help.
- Existing non-family peers choose their own occupations at prospective age milestones, sometimes relocate to a reachable settlement, and retire from paid work. Real movement updates their actual address; old correspondence remains. Family members, teachers and companions retain the separate systems that own their lives.
- From age 35, calendar cohorts introduce new adult neighbors at the player's actual open settlement. Their goals concern illness, displacement, household custom or a changed social circle. A century-long character can meet someone who was not part of the initial cast.
- New customers, colleagues and neighbors have actual birth dates, retirement and natural deaths. Death freezes remembered age and moves the person into a separate archive. Their thread remains readable, and a future commission uses a new household's identity rather than reviving the old customer.
- These people have dedicated correspondence about their particular work, goal and latest memory. A yearly discussion cannot produce repeated training or money. Existing family conversations can acknowledge preferences the player actually learned, while a retired teacher's old correspondence retains its original name.

## Preserved promises and time

`society` is an optional sidecar; the save revision stays five. `initializeSociety` begins at the current actual day. It never claims an earlier meeting, wage, repair, death or story choice. Accepted commissions without a new customer marker retain their original captured customer and agreement. Existing pending conversation nodes keep their earlier replies and effects.

A new personal commitment reserves its visible funding and materials once. `completedDays + remainingDays` conserves its actual work across birthdays, care, deadlines, save/load and resumed work. A zero-day interruption cannot complete a repair. Canceling records an honest limit and retains the spent preparation; it awards no refund or finished enterprise. Another queued person's decision waits behind a committed job, instead of trapping two projects inside one another.

Society keeps up to 48 active records and archives remembered people separately. Calendar cohorts and household replacements use deterministic identities. Views and future offer quotations are pure; they never introduce people simply because a tab was opened. Succession preserves actual people, dates, world history and remembered work, but separates the child's confidence from the parent's. The parent's peer cannot be silently relabeled as the child's new classmate when local contact IDs are reused.

## Integration contract

`dist/js/society.js` exports:

- `initializeSociety`, `inheritSociety`, `onSocietyTime`, `flushSocietyEvent`.
- `societyActions`, `applySocietyAction`, `societyEventIds`, `applySocietyChoice`.
- `societyView`, `societyRecipients`, `validateSociety`.
- Pure future-offer helper `recurringCustomer` and actual-career hooks `meetSocietyCustomer`, `recordSocietyCommission`, `syncSocietyStaff`.

The root engine initializes/imports the sidecar, advances it with actual elapsed days, flushes named decisions after urgent needs and dispatches its controls. `society.project` is an exclusive commitment. Its continuation spends time through the engine's actual bounded context. `societyRecipients` supplies living named beneficiaries to community projects without inventing a previously known contact.

The correspondence module includes living society contacts and historical archived threads. No ordinary message broadcasts private knowledge to unrelated people. Teacher aging and relationship compatibility remain owned by `household.js` and `family-depth.js`.

## Evidence and limits

Run `node --test tests/society.test.js tests/careers.test.js tests/conversations.test.js` for 48 focused checks, including preserved older agreements, interrupted real work, deferred plans, wage changes, prospective deaths, distinct replacement households, readable historical correspondence and separate successor classmates.

Run `node scripts/playtest-v8-people.mjs` for two genuine public-API lives from birth to retirement. The [summary and decision record](playtest/v8-people.json) documents 687 transitions in the final verification. Complete traces are written to `artifacts/playtest/v8-people/`:

1. A poor single-parent child attends school, becomes a classless blacksmith, creates a shop, delivers recurring household commissions, teaches a real apprentice, negotiates credited wages, spends actual time and funding on their independent beginning, keeps correspondence, meets later neighbors and retires at 48.
2. A long-lived smith delivers work to an actual customer, retains the thread after that customer dies, and serves a genuinely different replacement household before retiring at 100.

These runs use offered actions, actual calendar progress, actual supplies and earned money. No state, age, skill or resource grants are used. Every transition checks input immutability, nonnegative funds and a JSON save round trip.

This supplies recurring civilian arcs and prospective NPC change; it is not an unrestricted society simulation. The occupation milestones do not simulate every NPC's private finances or family. The new human customer arcs are deliberately authored and bounded. Further work should let particular NPC ambitions connect to later authored circumstances, rather than adding automatic approval or repeating a completion reward.
