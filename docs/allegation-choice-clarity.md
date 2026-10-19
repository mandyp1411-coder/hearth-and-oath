# Household allegation choice clarity · v0.38.1

A narrow display fix on v0.38.0 (`451fe4526fd180e076422129ebe1e1dc47e274f1`). The narrative edition was replacing the authored `stories_allegation` scene with generic daily text and filtering out material response warnings. The named witness was still available in the notice; the error was not a complete loss of witness identity.

The exact allegation event now preserves its existing authored body and choices. It identifies the retained agreement, altered household claim, named witness and local disputed allegation. Before selection, correction discloses its 12-gold fee and removal of only this report's one evidence; defense discloses retained local evidence and hearing alternatives; pressure discloses two new evidence, an oath breach and possible regional arrest. No new legal rules, consequences, story branches, or broad narrative bypass were introduced.

Existing open saved events and completed history remain exact during migration. This change applies when the authored allegation scene is newly produced. Prior misleadingly generic saved wording is deliberately not retroactively rewritten. Ordinary unrecognized events still receive the grounded fallback.

## Verification

- 8/8 new independent public-engine and production-handler tests passed, covering all three decisions, exact correction fee, evidence counts, existing paladin oath breach, defer, save/reload, unchanged historical choices and the still-active generic fallback.
- 65/65 shared narrative, world-first interface, practice tournament and intrigue/calendar release tests passed.
- 12/12 existing targeted allegation/forgery tests passed, including unrelated evidence preservation, correction-aware later chapters, poor-character defense, malformed report rejection and the original named-scene regression.
- Independent QA replayed the reported bug through the public engine, saved reload and actual correction handler; warnings now survive, correction still costs 12, and pressure still reaches three local evidence.

Production-handler tests use the repository's semantic DOM harness, not a real browser; they establish displayed markup, actions and saved effects, not layout, touch ergonomics or screenshots. The pre-existing full historical aggregate has known failures and is not claimed clean.

The final standalone build and embedded-runtime verification passed with zero network requests. All 16 offline parts reconstruct the same self-contained artifact; its byte count and digest are recorded in `verification-v0.38.1.json`.
