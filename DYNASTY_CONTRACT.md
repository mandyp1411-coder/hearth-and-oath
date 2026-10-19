# Hearth & Oath v0.6: lives and legacies

Expand the existing local, offline fantasy life RPG. Keep the dark illustrated
book design and phone navigation. A civilian career is a complete way to live.
Worlds vary through seeded geography, people, institutions, stories and choices;
do not claim every run contains entirely new authored prose or promise infinite
content. The same seed and choices remain reproducible. Fresh seeds use entropy.

## Ownership

- Root: engine.js, app.js, integration, save migration, publication.
- world_depth: world.js, birth.js, lore.js, their tests.
- life_engine: lineage.js, life.js, household.js, lifecycle tests.
- avatar_design: careers.js, career tests.
- party_combat: health.js, travel.js, their tests.
- visual_design: styles.css, avatar.js, map.js, audio.js, original art.
- journey_qa: genuine earlier saves, integration/browser tests, README.

## Persistence and calendar

New games use version 1 revision 5 and the existing browser save key. Migration
adds new sidecars without changing a previous world's map, journal, pending
choices, battle, committed supplies, route, or relationship memories. No death
or inheritance occurs on import. A migrated revision 5 state is idempotent.

Absolute state.day remains the world's calendar across generations. A birth
life's hero age is floor((day - (timeline.birthDay || 0))/365). NPCs with bornDay
use their own absolute birthday; legacy NPCs retain baseAge + floor(day/365).
Deceased people's displayed ages stop at their recorded deathDay.
Birthday targets and gates use the hero's offset. World moon/season cycles and
obligation dates remain absolute. A successor is a real recorded living child;
skills come from recorded care/education, not the parent's combat progression.
World changes, discovered lore and inherited physical property persist.
Completed world stories remain family history. Their resolutions and aftermath
persist without transferring personal service commitments or replaying an omen.

## Module APIs

Each new system exports initialize*, *Actions, apply*Action, apply*Choice,
*EventIds, validate*, and *View. Actions are descriptors with id, label,
description, days, cost, group, disabledReason. Root charges descriptor days
and cost once before a normal handler. A committed batch has days 0 and may
have an upfront cost charged once when it begins;
its handler alone spends elapsed days through the annual-aware context and
credits completed work. Remaining progress must survive a real interruption.

Context includes spendDays, setEvent(id,title,category,body,choices), journal,
standing, addObligation, finishObligation, afterAction, pendingNeed,
nextInterruptionDay, startBattle(id,context), endLife(cause), annualIncome,
and createSuccessor(childId).
Health, career and lineage time hooks run once after actual calendar movement.
onCareerTime takes actual elapsed days; health and lineage hooks take
{oldDay,newDay,outdoors}. Genuine unfinished legacy annual plans retain their
original schedule before new lifecycle checks begin.
They queue scenes in their sidecars, never overwrite an existing scene or battle.
afterAction flushes queued stories only when current decisions have resolved.
Death stops outstanding work and creates a chronicle; it does not silently
select an heir. Retirement leaves the parent alive in the next generation.

annualIncome(actualDays,beforeDay) is called by birthday year advancement only;
it adds occupation income and experience for those elapsed days. Committed
career work credits its own income, preventing double payment.

## Travel

Plans are settings until departure. A real route snapshots planned leg days,
costs, precautions and risks; charge its departure fee once. Old journeys keep
their original route/progress and receive no retroactive encounter. onTravelLeg
runs only after actual elapsed time, before moving to the next node. A checked
leg never rerolls on save/load. Event/battle preserves the same unfinished route.
Use planned leg totalDays consistently in progress and save validation.

## Interface

All views remain reachable through More. Add Career, Health and Legacy screens
with real state, progression and meaningful buttons. Family shows living/deceased
members and partner status. Legacy shows the dynasty, records and eligible heirs.
World shows travel settings and actual pre-departure price/time/danger. Optional
sound is off by default, local WebAudio, activated only through a user gesture.
Honor reduced motion. No external game service or API key is required.

## Acceptance

Verify a legal born-zero education/career/partner/child/retirement/succession
journey, lifelong blacksmith progression, health support and road encounters,
two generations' world/clock continuity, idempotent pending-save migration,
connected varied worlds across seeds and repeated-seed equality. Browser tests
cover narrow phones, every view, actual sound toggle, keyboard/focus, save/load,
and matching standalone offline gameplay with other requests blocked.
