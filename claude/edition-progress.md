# Hearth & Oath: edition progress

The owner transferred development from Claude to Codex with the working
rulebook and Design Bible Volume II. This ledger keeps that handoff visible.

## Current release

v0.71.1, The first choice, is published as Sites version 105 in
[PR #17](https://github.com/mandyp1411-coder/hearth-and-oath/pull/17), with
merge `02a79c80f849dee67a4c93797ed8806b13473aeb` complete. The complete fresh FAST/SLOW lanes on clean
`c369b934cb8a1abeeed04ee69b6db39bf7e32ee1` passed 3,947 cases with zero
failures and five skips. Four targeted offline checks pass; the other 26
are NOT RUN for this patch. Strict lanes remain FAIL for skips and the
formal full gate remains NOT RUN. The proof, exact identities and browser
limits are in `docs/measures/farmer-v0711-verification.md`.

Deployment `appgdep_6adc2e0d662881919adec44b79886488` succeeded from Sites
source `5e9c2de55bbb25c4a10c6c606f085f0c2cd6e2a6`. Its runtime is
`cee3675cd16e1883722a69d8f6e015689c72fe381e1043b767d0a7bfd2e9b926`.
The pure reader improves old pending birthday display without rewriting
saved history, while new matched scenes retain their hints. No later phase
is opened: the real farmer-and-heir gate remains NOT RUN.

v0.71, The farmer's life, shipped as a playtest candidate from
`codex/v0.71-farmers-life`, in
[PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15).
The bounded slice includes the field's seasonal choices, actual neighbour
and spouse, private purpose, personal promises, a returning boundary dispute,
loss and recovery, and an heir's real burdens and Book. Costs show the direct
payment and household keep, including a prepaid birthday interruption.

The human playtest is NOT RUN. Implementation and mechanical evidence do not
complete the Bible's gate. The farmer remains the only Volume II livelihood
being proved until real sessions and a verdict exist.

Main's preceding release is v0.70.0, The archive (PR #14). Its unresolved
public archive address is tracked in `docs/volume-ii-status.md`. No legacy
rules are removed in v0.71.

## Software evidence

The [v0.71 verification record](../docs/measures/farmer-v071-verification.md)
records 3,939 selected passing assertions and five skips. FAST/SLOW results
combine documented snapshots and focused reruns; they do not establish a
strict single-snapshot software-gate PASS. Skips and scope limits remain
visible in that record.

Exact source and verification identities, the engine benchmark, content
validation, import-graph build, offline artifact/checker results and browser
measurements belong to the verification record. A pending or interrupted
offline run stays pending until its terminal result and artifact identity
are recorded. Full-module native checks and older scoped offline probes
must keep their distinct coverage limits.

At the recorded engine snapshot, four public-engine birth-to-31 simulations
exercised 1,761 validated transitions without invalid saves or stalls. These
diagnose mechanics; they supply no participant, recall answer or human
playtest verdict.
The [human protocol](../docs/playtests/farmer-v071.md) remains NOT RUN.

## Farmer session preparation

The [session kit](../docs/playtests/farmer-v071.md#ready-to-use-session-materials)
provides two untouched production age-sixteen starts, one common freeholder
and one bound tenant. Both pass full validation and exact import round trips;
disposable clones reach the unanswered farmer ambition. One freeholder
import was observed in live Chrome. The player ZIP has three verified
members and excludes the separate blank observer and aggregate forms.
Its checks and actual opening positions are in
`docs/playtests/farmer-v071/preparation-checks.md`.

The runtime remains the published version 104 bytes. This is preparation for
the owner's session and six to eight new players; no human answer or gate
verdict is claimed. v0.72 remains pending that verdict.

The preparation kit merged in [PR #16](https://github.com/mandyp1411-coder/hearth-and-oath/pull/16) as
`67733f9d036b5979bd3fdbb4225cec9f72ad75e0`, from source
`d8546a6a1721e0140f0f473fe874ede5627a3303`. This is a materials-only merge;
Sites version 104 remains the game build for these sessions.

## Delivery

| Field | Result |
| --- | --- |
| Pull request | [#15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15) |
| Release source commit | `e1b99c656abb1b6408bd394653a3af858d3a49df` (runtime source; later notes change no game bytes) |
| Merge commit | `6d692f1fd0184ef4ae0efcd527b70ab1e5819d7c` — PR #15 merged successfully |
| Site version | 104, source `e783d8175e4ca5b3b76621ea48aa77e8ba2a2c36`; published successfully |
| Deployment ID | `appgdep_6adc1bce2cec8191992fa580abd14fca` |
| Public candidate URL | [Play the farmer candidate](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/) |

PR #15 merged head `65bb9fc9077b82543af71874fbce1200521d894a`, whose tree is
`8dbb174b5cb77ccb8f32510de20454cded1dcafb`. The Site source has the same
runtime and predates evidence-only notes. Keep the GitHub source/merge commit
separate from the Site's own source commit and version. Published software remains a playtest candidate
until the human gate passes; publication does not authorize the later
compatibility cleanup or a wider set of livelihoods.
