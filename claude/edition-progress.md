# Hearth & Oath: edition progress

The owner transferred development from Claude to Codex with the working
rulebook and Design Bible Volume II. This ledger keeps that handoff visible.

## Current release

v0.71.2, The old lives have a home, is published as main Sites version 106
and archive version 1 in [PR #18](https://github.com/mandyp1411-coder/hearth-and-oath/pull/18),
merged as `d1e218259b81e09fb33a2cb65913106a727e2996` from head
`14a2876901feb22f8912cdc0d72d5443bf93253f`. The full fresh FAST/SLOW lanes on clean
`f82160cae5561f851f99c3c7fb1274fec04a30f7` passed 3,949 assertions, with
zero assertion failures and five skips. Both immutable-input/output guards
passed; strict lanes remain FAIL for skips. Sixteen source-engine cases
cover fourteen genuine old states and twenty-two public commands. One
compiled offline startup checker passed; its auxiliary parser failure and
separate strict closed-output derivation remain visible. Other 29 offline
checks and the formal full gate are NOT RUN.

Main deployment `appgdep_6adc722f3ec08191aa0d964b478feac6` succeeded from
Sites source `1ac4853f19c0f824ddaaecbb230264d03979a637`, tree
`930cade8eabd247d8003cd2213aca29e0c145b6d`. The archive deployment
`appgdep_6adc364b751c8191a42a75feade2fa53` succeeded from source
`43ee1a8b1b48cb5aee8ad060d206a94bc09723b9`.
The [verification record](../docs/measures/archive-v0712-verification.md)
retains complete identities, proof and limits. Chrome opened the public
archive and produced an exact old-save export in main; both subsequent
browser transfers stalled, so the complete browser round trip is NOT RUN.
The human farmer-and-heir gate remains NOT RUN. The owner stopped further
opening-layout polish; no Phase 2 work or legacy deletion is included.

## Next release in preparation

The owner authorized beginning v0.72, One Rulebook. Branch
`codex/v0.72-one-rulebook` starts with a repeatable source inventory and
regressions for mixed old/new slots, whole-life exports and old backup
recovery. The [cutover plan](../docs/one-rulebook-v072.md) identifies the
shared decoder's occupied-slot risk and the older expedition modes that
still belong to new-rule lives. The first runtime implementation separates
the retained decoder from optional incoming-write admission; existing
callers still accept both rulebooks. The genuine v0.61 fixture adds zero-debt,
pre-station migration and write coverage without invented history. No
compatibility is removed. The archive browser loop and real farmer/heir gate remain NOT RUN;
this preparation is not a shipped v0.72 or a passed gate.

[Draft PR #19](https://github.com/mandyp1411-coder/hearth-and-oath/pull/19)
now contains that first storage implementation and its rebuilt standalone.
On frozen local `27c924424a7577c08c0741e57918d448ee6890dc`, 448 selected
tests in 25 files passed, zero failures/skips. One complete compiled-module
session passed 14 bounded cases; content/import-graph and artifact checks
passed. API source `11a21de2ab65f2bcfb8be80a83da706b36522cee` has the
same tree `fcc8d1cf59d33f215a6d08258de17d57e9b6b585`. The
[development record](../docs/measures/one-rulebook-v072-storage-verification.md)
preserves closed raw proof. Full FAST/SLOW and the formal gate were NOT RUN;
the PR stays draft and the live game stays Sites 106.

The next implementation connects the app's unset entry policy to ordinary
reviewed imports/creation, slot/resume/adoption guards and Ironman locked
entry. It preserves captured review payloads, late-refused pending operations,
raw exports/lifecycle and death cleanup. Restrictive policies are tested at
the real coordinator/store/session boundaries; the current app still admits
both rulebooks. Independent old-save decoding and export/recovery UI remain
unfinished, and the same browser/human gates still precede any cutover.

The connected entry slice now has its own [closed development proof](../docs/measures/one-rulebook-v072-entry-verification.md):
500 selected tests in 31 files passed, zero failures/skips, on frozen local
`11613fa2d5e9ad4e55869d6734c11f920f8d258e`. API source
`375207e43ea674092533d4dbb720ba96b2644764` has the same tree
`b78471afe20e3d2905ea8f563f86cf7dd963500f`. One compiled full-module
session passed 14 cases. Strict content/import-graph build, exact artifact
and unchanged-source guards pass. The earlier 448-test storage result stays
separate; it is not added to this total. This remains draft work on PR #19,
with no cutover, new version label or deployment.

## Earlier farmer releases

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

Before the farmer release came v0.70.0, The archive (PR #14). Its public
home is now published above; the browser handoff remains incomplete. No
legacy rules are removed.

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
Sites version 104 was the build at that materials-only merge; the current
candidate is version 106 above.

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
