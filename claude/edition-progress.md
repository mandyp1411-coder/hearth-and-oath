# Hearth & Oath: edition progress

The owner transferred development from Claude to Codex with the working
rulebook and Design Bible Volume II. This ledger keeps that handoff visible.

## Current release

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
