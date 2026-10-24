# The farmer's life: v0.71 playtest

This is the Phase 1 gate from Design Bible Volume II, pages 2-3 and 23.
Software checks and simulated lives do not complete this gate.

## Status

Human playtest: NOT RUN. No participants or survey answers are claimed.
The farmer remains the only Volume II livelihood being proved until
this gate passes. The trader, healer and general engines are later work.

The implemented v0.71.0 software is a playtest candidate in
[PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15).
The [software evidence](../measures/farmer-v071-verification.md) records
3,939 selected passing assertions and five skips across documented composite
checks; a strict single-snapshot software-gate PASS is not claimed.
Mechanical simulations supply no human participant or acceptance verdict.

| Candidate field | Result |
| --- | --- |
| Source/build to play | v0.71.0, Sites 104; runtime `43559063337c7bc243bc152ad153d672a9c933d61d85a494f17d3f46bddfa311` |
| Merge commit | `6d692f1fd0184ef4ae0efcd527b70ab1e5819d7c` (PR #15) |
| Public candidate URL | [Play the farmer candidate](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/) |

The [edition ledger](../../claude/edition-progress.md) tracks the actual
merge and deployment. Retain the exact build used by each participant even
if a later fix ships.

## Participants and session

Recruit six to eight people who have not played Hearth & Oath, plus the
owner. Include both a common freeholder and a bound tenant across the group.
Record the exact source commit, build, seed, station, difficulty, device and
reading scale for each session. Never put personal identifiers in the repo;
use participant codes and obtain permission for recordings.

Each participant starts at sixteen, plays one farmer life (allow about two
hours), then the heir's first chapter. Quiet lives that keep the field and
raise a family are valid. Do not coach participants toward a dramatic loss,
career change, broken promise or completed ambition.

Observe where the player gets lost, skims, cannot predict a cost, cannot
find an available choice, or stops reading. Note the actual scene/action and
day. Let them act before explaining the design.

## Recall, away from the screen

Ask the player to tell the life in a few sentences, then ask:

1. Who mattered to you? What did you feel about them?
2. Which choice changed the direction of the life?
3. What was this life trying to do?
4. Did you understand why things happened? Which cost surprised you?
5. Do you want to play the heir? Why, or why not?

Most participants must name at least two people unprompted, identify a
turning point caused by their own choice, describe the life's purpose,
understand the consequences and want to continue as the heir. Keep each
criterion separate; do not average away a failure. The Bible does not set a
numeric satisfaction score, so none is invented here.

## Session record

For each participant retain: code; source/build and seed; freeholder or
tenant; device and reading scale; duration; people recalled verbatim;
turning point; ambition; surprising costs; heir preference; observed stalls;
bugs with reproduction steps. Distinguish observer interpretation from the
player's words. Write the aggregate verdict only after the sessions.

If the slice fails, repair it and repeat the playtest. Do not widen it into
other livelihoods, remove compatibility code or declare Phase 1 proven from
automated test results.
