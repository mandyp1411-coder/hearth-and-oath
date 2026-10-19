# The Winter Levy: connected civilian roleplay

This update adds one optional local dispute rather than filling the Journal with automatic quests. A local guide introduces a grain clerk and a levy factor with conflicting needs: a family's planting seed, unpaid watchmen, and a patron's influence. The player can set the letter aside or decline. Reading the proposal does not add an active quest; choosing an investigation method does.

## Different approaches, not permanent classes

- Scholarship: three actual days comparing delivered papers at the player's table. No travel or combat requirement.
- Performance: two actual days attending a local supper and drawing out an admission before a witness.
- Illicit entry: one actual day investigating a service entrance. Following the physical clue produces a hidden duplicate; forcing the wrong lock produces a witnessed crime rather than useful proof.

Each leads to a saved interactive clue decision, not an automatic dice success. These are introductory deduction scenes, not a claim of a fully developed puzzle/minigame system. An optional return opens seven days later and never expires or interrupts ordinary life.

## Consequences

Verified public exposure, negotiated relief, paid complicity, and an illicit leverage arrangement create different existing-world services, relationship changes and public standing. Public accusations require signed verification or a willing witness. A hidden duplicate can be corroborated through correspondence. The illicit route also permits a separate leverage ending, with a greater payment and more damaging relationship consequences. Payments and services occur once, after actual attended days.

The named participants retain memories. Death or destruction closes the unfinished agreement without silently replacing its people or awarding unfinished rewards. The Journal keeps accepted work and its final result; Everyday activities provide a continuation shortcut. Existing event, contact, service, activity and Journal components are reused.

## Small connected repairs

An established Scholar can perform the existing paid work activity at their owned home, without visiting a work steward for every shift. Supervised lessons, career selection, other professions, unowned accommodation, travel and occupied settlements keep their existing access rules.

Deferring a personal story now says it remains active; leaving it says it is closed. These previously used the same generic message despite recording different states.

## Narrative preservation

The current narrative edition replaces many rich authored regional scenes with short generic summaries. This update preserves its own authored scene and outcome text explicitly rather than changing all old stories at once. Existing scenes retain their prior behavior for a separate focused revision.

## Verification

- Eight new engine integration checks cover all three approaches, four endings, save round-trips, once-only effects, old-save compatibility, home Scholar work, truthful defer/leave wording and explicit quest opt-in.
- Independent replay from a genuinely played earlier save confirms the scholarly route, timing gate, completion and duplicate prevention.
- Twelve existing save and home-rest regression checks pass.
- Thirty-nine existing world-first/story-continuity checks give 32 passes and the same seven failures in both this branch and an untouched v0.34.0 checkout. The old failures are not represented as new passing coverage.
- Calendar boundary tests cover birthday interruption, save/reload, remaining-day resumption and cancellation without unfinished rewards. Semantic DOM checks exercise the production guide, Journal and home-work handlers.
- Actual-browser layout verification is unavailable in this environment; semantic DOM and engine verification are not presented as visual playtesting.

## Integrated release v0.36.0

Reconciled onto the published v0.35.0 source, preserving its portrait expansion, aging, grayscale, shared interaction layout, notification inbox and saved-character management. The only merge conflict was resolved by retaining the shared interaction component while adding Scholar home work and intrigue continuation.

On this integrated source, all 25 selected intrigue, calendar, production-handler, save and home-rest checks pass, as do all 39 v0.35.0 portrait/interface/notification/deletion regression checks (64 checks total). The offline bundle is rebuilt from the same release source.

The rebuilt standalone HTML also passes its actual embedded-code semantic DOM/VM verification with zero network requests, including the preceding release’s notification, save-management, portrait, market, travel and home-rest behavior. This does not substitute for responsive browser or screen-reader testing.
