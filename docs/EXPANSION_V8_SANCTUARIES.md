# v0.8: local hearings and living supernatural agreements

The v0.7 audit identified thin legal failure stories and repetitive supernatural needs. This expansion turns those into particular local accounts and ongoing agreements with actual contacts. It adds `dist/js/sanctuaries.js`; `health.js`, `travel.js` and `workshop.js` connect funded civic institutions to actual service choices and calendar work.

## Local law with a source

`onEvidence(state, amount, description, ctx)` is called **after** a real witnessed incident updates `legal.incidents`. It creates a local case whose location, dates and source descriptions persist. It does not accuse anyone for secret studies, a diagnosis or an undisclosed condition. Existing reports on import do not automatically become arrests; a player can explicitly request a hearing for an older local report.

Queued cases wait behind childhood choices, conversation, battle, travel and bodily needs. A summons shows the actual allegation, current evidence and alternatives. The free hearing reveals choices without a reward:

| Response | Actual commitment | Consequence after completion |
| --- | --- | --- |
| Paid restitution | 2 days; 12 gold per current evidence | Answers the quoted evidence in that settlement. |
| Willing advocate | 3 days; 12 gold; an actual present adult with bond 60 | Narrows one part of the report once; remaining evidence still needs an answer. The named contact remembers attending. |
| Community restitution | 6 days; free | Useful work appropriate to the actual profession answers up to three evidence. Larger reports can require further work. |
| Escape | 2 days; free; quoted chance from actual stealth/agility | Success retains the local warrant and records the witnessed flight. Failure creates a playable watch-room scene, without death, confiscation or erased skills. |
| Arrange a later response | One extension to a visible date seven days away | The local account returns when the player actually stays in or returns to that settlement. No remote arrest is invented. |
| Supervised restitution after capture | 8 days; free | Offers a survivable way to answer the report without creating debt. |

A fugitive return can lead to local recognition after the stated date. A captured character still chooses paid attendance, an advocate or supervised work. Resolution has a later scene about keeping a truthful household account or returning quietly to work; neither invents a public confession or grants automatic reputation.

## Informed donors and meaningful boundaries

Donors are existing, living, present adult contacts. A sufficient relationship opens a discussion; a stable seeded personal boundary determines whether the contact is willing to donate. Refusal, choosing animal sustenance and preserving privacy have no relationship punishment.

An accepted agreement takes **one actual day** of informed discussion. Only that person learns vampirism through the explicit choice. It grants no hunger relief. Subsequent attended sessions take **one actual day and eight gold**, reduce hunger by 60, and require **fourteen days between offers**. The person, place, consent boundary, actual sessions and future date remain saved.

An eligible agreement can appear alongside the existing animal option during a hunger interruption. It uses the same attendance path; selecting the saved agreement does not feed on a menu click. An absent participant, death, withdrawn trust or the end of vampirism closes or prevents the arrangement. Either party's boundary can end it; private knowledge is not erased or broadcast.

## Moon-watch circles and household space

A sound shelter, cottage, private refuge or funded community refuge supports an actual household moon plan. One day of preparation, no fee, agrees on privacy, a separate transformation room and keeping children away from the transformation. An actual present adult can instead join a voluntary **moon-watch circle** after two days and six gold of planning and provisions. The watcher does not automatically become a werewolf, promise blood or disclose the condition to anyone else.

Both arrangements name a place and the specific target full moon. They must finish **before** that moon; interrupted preparation cannot be awarded backward in time. A completed lesson gives three control **once per moon across all plans**, so ending and recreating agreements or recruiting many contacts cannot duplicate it. Each later cycle requires one actual day of renewed preparation; a circle uses two gold of provisions, while private household preparation is free.

The agreement persists after a lived moon. A relocated, unwilling or dead watcher and a lost place cannot silently provide a safe local household. `sanctuaryMoonPrepared` checks the exact location and actual participant. Existing independently prepared field/permanent refuges retain their original semantics through `onSanctuaryRefugePrepared`; this expansion does not reinterpret saved ordinary refuge choices.

## Civic service synergy

- A currently funded **local clinic** covers the ordinary six-gold consultation fee and adds fourteen days to the chosen physical care plan. Rendering its screen does not heal anything; ordinary childhood sponsorship remains available everywhere.
- A funded **road undertaking** lowers a relevant leg's dangerous-encounter quotation by eight points. The committed journey keeps that original quote even if funding later ends; it does not reprice an existing trip.
- Funded **gathering commons** shorten stock regeneration intervals by two days, with a two-day minimum. `communityResourceIntervals` integrates actual funded operating periods, excluding preconstruction, unfunded gaps and pauses. Views remain pure, and actual gathering still consumes local stock and work days. Fractional recovery is conserved in an optional stock sidecar, preserving older unchanged regeneration rules.
- A funded **refuge** supplies an actual eligible place for household lunar planning. It does not resurrect a destroyed town or erase the displaced people's history.

## Integration and preservation

Initialize the optional `sanctuaries` sidecar at the current day. It contains bounded local cases, donor agreements, moon plans, a single resumable commitment, queued events and a chronological history. An unfinished agreement records its quotation and remaining days. Fees are spent once on first actual attendance; zero attendance spends nothing. Feeding, evidence relief and preparation occur only after the full agreed work completes. Cancellation retains attended time and fees and grants no completion result.

Activity cards show the actual attendance duration and quoted fee through `durationDays` and `quotedCost`. The handler owns calendar attendance and charging, so generic engine `days` and `cost` stay zero. A continued agreement displays only its remaining days and unpaid fee; finished attendance is not billed again. Opening a discussion or ending consent uses no attendance days or fee.

Use the normal `sanctuaryActions` / `applySanctuaryAction`, `sanctuaryEventIds` / `applySanctuaryChoice`, `onSanctuaryTime`, `flushSanctuaryEvent`, `sanctuaryView` and `validateSanctuaries` contracts. `sanctuaryNeedsBypass` identifies only an actual donor feeding session so its own hunger need does not block its day while birthdays and other deadlines remain interruptible. `sanctuaryCommitmentReason` blocks unrelated commitments until the current arrangement finishes or is ended. A successor starts their own private agreements; inherited public history belongs to the chronicle, not a child's automatic feeding access.

## Verification

`tests/sanctuaries.test.js` exercises witnessed local reports, import without retroactive accusation, fee/time conservation across interrupted attendance and save/reload, advocacy, free service, seeded escape/capture, real return dates, private named donor boundaries, death/absence, location-specific lunar preparation and malformed-save rejection. `tests/community-synergy.test.js` proves actual service effects, fixed road quotations, pure rendering and exact funded/paused resource periods. Existing health, road and Workshop suites are rerun alongside them.

`node scripts/playtest-sanctuaries.mjs` plays new public-engine routes from birth, using genuine witnessed theft, actual work and existing contacts. The resulting summary is `docs/playtest/v8-sanctuaries.json`; complete action records are preserved in `docs/playtest/v8-sanctuary-actions.json.gz` and written uncompressed under `artifacts/playtest/v8/`. It never grants age, resources, relationship scores, evidence or outcomes by changing saved state.

The completed run contains **five distinct age-zero-to-retirement lives and 1,128 public operations**: free restitution, paid restitution, witnessed flight followed by actual detention and service, two genuine named-donor sessions followed by ending the arrangement, and a constructed shelter with household/circle preparations and a lived safe full moon. Every transition validates the serialized save and preserves its input. The replay exposed a missing journal record for a fugitive's recognized return; that particular capture is now recorded alongside its scene. The focused verification passes **67 tests**, including fifteen new legal, consent and community integration checks.

`scripts/browser-v8.py` reconstructs fourteen genuine checkpoints through recorded public actions, imports them through the normal save screen, and clicks the new controls at 390- and 1440-pixel widths in both hosted and network-isolated standalone builds. Its final run passed **56 responsive checks and 56 actual control clicks**, with exact resulting-save parity, no external standalone requests, no JavaScript errors and no horizontal overflow. Four donor checks also verify that the visible one-day/eight-gold quotation matches actual attendance and one fee charged separately from living costs. These checks reuse actual lives; they are not fifty-six additional life simulations.

The browser checkpoints cover funded undertakings, recurring customers, independent colleagues, school projects, learned relationship preferences, older-child adoption, calling inquiries, completed formation, companion resolution, local hearings, named donors, household moon plans and an interrupted civic commitment. `docs/playtest/v8-browser.json` records every clicked control and the genuine birthday branch: the original charter, all public branch operations, day 9114 before the stage, day 9125 after eleven actual work days, five days remaining, and the one-time 480-gold/eight-wood/six-stone payment. `tests/fixtures/v8-community-before-birthday.json` preserves its valid pre-action state for the engine's pause/resume regression.

These systems develop failure and household routines. They are not a procedural courtroom simulation, a claim that every contact volunteers their blood, or an automatic solution to every full moon. Broader institutions can build on the particular saved accounts and agreements rather than adding universal morality or secret information propagation.
