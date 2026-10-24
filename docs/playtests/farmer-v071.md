# The farmer's life: v0.71 playtest

This is the Phase 1 gate from Design Bible Volume II, pages 2-3 and 23.
Software checks and simulated lives do not complete this gate.

## Status

Human playtest: NOT RUN. No participants or survey answers are claimed.
The farmer remains the only Volume II livelihood being proved until
this gate passes. The trader, healer and general engines are later work.

The current playtest candidate is v0.71.2, Sites version 106. The farmer
foundation shipped in [PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15);
[PR #17](https://github.com/mandyp1411-coder/hearth-and-oath/pull/17) repairs
the age-sixteen opening captions. Its [software evidence](../measures/farmer-v0711-verification.md)
records complete fresh source lanes with 3,947 cases passed, zero failed
and five skipped, plus four targeted offline checks. The formal full gate
is NOT RUN. Mechanical evidence supplies no human participant or verdict.

The starter files themselves remain the genuine untouched v0.71.0 exports.
Their original generation manifest and bytes are preserved; v0.71.1 improves
their displayed captions while keeping saved history intact. Record the
actual game build used in each human session.

| Candidate field | Result |
| --- | --- |
| Source/build to play | v0.71.2, Sites 106; runtime `37a1ee3f84ef6b589d3daa9daca80d594e6a7c5320a31d100459eb5b6b4f518f` |
| Farmer foundation merge | `6d692f1fd0184ef4ae0efcd527b70ab1e5819d7c` (PR #15) |
| Opening repair merge | `02a79c80f849dee67a4c93797ed8806b13473aeb` (PR #17) |
| Public candidate URL | [Play the farmer candidate](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/) |

The [edition ledger](../../claude/edition-progress.md) tracks the actual
merge and deployment. Retain the exact build used by each participant even
if a later fix ships.

## Ready-to-use session materials

Give players only the [short player guide](farmer-v071/player-guide.md)
and their assigned fresh age-sixteen start from the
[player bundle](farmer-v071/farmer-starts.zip). The two starts were made with
this release's normal character-creation simulation; the birthday and
private purpose are unanswered. Use an empty save slot when importing.

The creator deliberately leaves station to fate. These fixed exports let
the group cover both a common freeholder and a bound tenant without asking
players to reroll for a class. Assign both starts across the group; they
do not represent all births or seeds. Exact generation inputs, actual
opening positions and checksums are in the
[starter manifest](farmer-v071/starter-manifest.json). The
[preparation checks](farmer-v071/preparation-checks.md) distinguish actual
live import, engine validation and the human sessions still to come.

The observer uses the [blank session record](farmer-v071/session-record.md)
and [blank aggregate verdict](farmer-v071/verdict-template.md). Keep the
recall questions and acceptance criteria from players before play. Capture
the initial account before follow-up prompts. Preserve unfinished sessions
and resume them; a time limit or one succession click does not establish a
completed farmer life and heir chapter.

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
5. Do you want to keep playing as the heir? Why, or why not?

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
