# The Gateyard Ribbon · v0.37.0

A modest first playable step toward a knight's life, while keeping other lives open.

## Play

At a settlement gate, characters aged ten or older can find **Ask About the Practice Tournament** in **Activities → Training**. The invitation is optional; reading or postponing it spends nothing. A named local instructor introduces a living local rival when suitable, otherwise a seeded novice opponent. The same names and sequence persist in saves.

Accepting spends one actual calendar day for warm-up and a three-exchange wooden-sword bout. Equipment is borrowed and entry is free; ordinary living expenses still apply. A due birthday or other need interrupts preparation without making the player pay the day twice.

The opponent's visible stance communicates their intent. Attack beats feint, guard beats attack, and feint beats guard. Matching moves score neither. Each clean response earns one point, and the score is shown before every exchange. This introductory activity teaches readable counters, not a random stat check. The bout itself causes no damage.

Pause preserves the exact next exchange. Resume never charges another day. Withdraw keeps completed exchanges and time already spent. Win, loss, draw and withdrawal produce distinct later conversations with the instructor and specific relationship memories. There is no repeatable coin/skill reward, class lock, automatic Knight unlock or equipment gift.

## Integration and limits

Uses existing shared activity rows and event choices, the calendar, household budget, conversation memories and save system. Authored stance text and outcomes are exempt from the older generic narrative rewrite layer. Saves from before this version need no migration and are unchanged until the player asks about the activity. Move IDs include the exchange index to reject delayed duplicate clicks.

This is one introductory practice tournament, not a tournament career, squire school, jousting circuit or formal knight initiation. Its counter rules are deliberately learnable. Broader rivals, adaptive techniques and earned tournament progression remain future work.

## Verification

Targeted automated tests cover optional invitation, all four outcomes, mid-bout serialization, stale clicks, paid-time resumption, age/location/commitment gates, corrupted scores/intents, direct API locking, old saves and birthday interruption. Shared UI handler tests exercise entering the bout, choosing counters and recalling its result. These are simulation/handler checks, not visual browser QA.

The full legacy aggregate was attempted, then stopped after three unrelated audit-v21 failures. All three reproduce on the exact preceding published v0.36.0 commit: an obsolete wilderness-action whitelist and two old dialogue-node expectations. This release does not claim a clean full historical suite. The final focused regression run passed 34 of 34 checks, including 12 tournament checks and existing saves, levy, calendar/UI and school coverage. Offline verification is recorded with the release result; no live visual-browser audit was performed.
