# Roadmap 5: honest maze rules and resource forecasts

## Scope and preserved rules

This source change addresses audit A3. New entries describe the existing saved
11 × 11, 121-room maze rather than promising the old six-floor expedition.
Contract entry is a journey, not a prediction of a single contract encounter.
Its entry card no longer attaches a single-fight risk outlook to the whole maze.
Existing peaceful contract field-work offers are unchanged.

No difficulty numbers, movement charges, calendar order, camp allowances, room
contents, topology, fog, peaceful checks, guardian resolution or stair rules are
changed. No new persistent fields or save version are introduced. This work is
based on the roadmap 4 camp implementation, commit `5a7e653`; only this task's
new commit should be cherry-picked after that prerequisite.

## Shared read models

`dist/js/maze-rules.js` contains the existing entry-mode predicate, now used by
entry execution, entry text and the risk-offer UI. Existing authored dungeon
records and saved regional expeditions continue through their old resolvers.
An existing six-floor adventure expedition is rendered from its saved state;
it is not converted to a maze or charged modern movement costs.

`mazeMovementForecast` is a pure calculation from only current hero Focus and
total completed maze steps. It does not read the maze seed, room contents or
routes. Movement execution and action description/day metadata use this same
calculation. A quoted day remains subject to the existing calendar interruption
rules and ordinary attended-day living costs.

The original, potentially surprising cadence is deliberately retained:

- A successful walk attempts to spend 1 Focus, floored at zero.
- The day predicate checks Focus **before** the walk: every sixth total step
  when it is positive, or every third total step when it is already empty.
- A Focus 1 → 0 walk does not retroactively use the empty-Focus cadence.
- Total step count is never reset when Focus runs out or recovers.
- A zero-day calendar interruption does not move, spend Focus or reveal a room.
- A fully attended movement day can finish the walk and then present a birthday
  decision. That pending decision blocks repeated input until resolved.
- Focus is still charged after the attended day, preserving calendar side-effect
  ordering rather than forcing the earlier projected reserve onto the state.

The next movement-day horizon simulates at most six successive walks with their
normal Focus depletion. It is explicitly conditional on no other Focus changes.
It is not a promise that the objective is that far away, an estimate of enemy
count or a complete expedition budget.

`mazeExpeditionView` exposes only known carried resources, the first three active
companion slots, the canonical roadmap 4 camp quote, and current-room action
availability. It copies actual reserves and named ineligibility reasons. Missing
stats remain unavailable; inactive reserves are not presented as healable.
Consumed packs contribute no usable kit nights, and the next usable pack matches
camp execution. No hidden objective position, room ID, enemy or path is returned.

## Interface

The modest resource section uses the existing maze column and palette. Next-walk
Focus/day cost, the next movement-day horizon, carried kit nights/potions/rations,
and current stair availability are visible by default. Active party reserves,
exact named capped camp effects, non-revival policy and detailed cadence live
inside an optional native disclosure, so the room's actions remain accessible.

Map and direction-control groups reference the visible cost text for assistive
technology. The existing 121 cells, fog labels, real direction buttons and
arrow-key handler are retained. New text and names are escaped. No navigation,
confirmation, purchases, account access or sharing settings are changed.

## Verification

Focused acceptance suite: `tests/maze-resource-rules.test.js`.

Coverage includes step 5 → 6, empty-Focus step 2 → 3, Focus 1 → 0 at the third
step, the original-formula horizon matrix, zero-day interruption/retry,
retirement, post-calendar resource ordering, blocked/non-door/pending moves,
prior-door retreat, pure read/render, exact camp eligibility/quote, usable kit
nights, missing stats/name escaping, entry-mode dispatch, unchanged peaceful
field offers, actual birthday/reload, arrow-key UI updates and authentic older
six-floor saved withdrawal.

Final focused command:

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/maze-resource-rules.test.js
```

Result: **19/19 passed**, 0 failed, in 32.2 seconds. One case also checks the
original formula over 162 step/Focus combinations. Both actual app semantic UI
cases pass: the modern contract entry has no single-fight outlook, and arrow-key
movement updates the visible resource quote while preserving fog and save
validity. Syntax checks for every changed JavaScript/test file and
`git diff --check` passed. Independent read-only review found no production
correctness blockers; its two test-coverage suggestions were incorporated.

The first focused run passed 16/19. Its three failures were fixture assumptions:
the chosen life began without a local contract board, and a birthday choice can
legitimately restore Focus before movement is re-quoted. Tests now establish a
real local board, select a known peaceful bandit contract, and explicitly
re-quote the changed reserve after resolving the birthday. No production change
was made in response to those failures.

No offline build or publication was run from this worktree. Desktop/narrow live
browser QA and integration regressions remain the parent release gate; semantic
handler tests are not a rendered-layout pass. Existing full-suite baseline
failures are not silently treated as a passing aggregate gate.
