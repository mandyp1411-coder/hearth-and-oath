# Current destinations and action-cost clarity

Roadmap item 6 / quality audit A3. Source-only work based on v0.43.1; no release version, offline build, audience or publication change is part of this commit.

## What changes

- Age-up blockers name current Life → Today, Explore, Activities or the actual conversation rather than retired People, Regions/laws/faiths or Adventure/bounties screens.
- Return to the moment uses the existing section-aware navigation to Life → Today, not a retired service route or a remembered Your Years section. Conversation Return resolves the actual pending person through the existing contact helper. Genuine earlier annual plans retain their existing Continue control, now visible in Today.
- Compact Activities and situated service choices use the same display-only action-cost view. Full or remaining commitment duration takes priority over the immediate wrapper's zero-day field; quoted fees likewise take priority over wrapper fees. Existing material and calendar notes remain visible.
- Craft review separates direct fee, materials, exact committed time and expected household living-cost accrual. The initial workbench no longer promises “every cost” while showing only the provider fee. Paused work explains that committed fee/materials are not paid twice while living costs still accrue for actual remaining attendance.
- A quiet optional “How time & costs work” disclosure explains direct charges versus accrual, interruptions, settlement and any earlier accrued household amount. Zero-day and zero-fee quotes are explicit; missing legacy budget data does not produce an invented estimate.

## Accounting and gates

The UI calls the authoritative `householdCostPreview`, never a duplicate annual-cost formula. It uses `additionalCost` for the new offered time, not `totalDue`; an earlier outstanding amount is mentioned separately. An estimate does not mean the entire forecast is payable immediately. Living costs can settle when ordinary actions finish as well as during Age up, commitments and the end of a life; only actual attended adult days accrue if an action is interrupted.

No engine accounting, action cost, price, material consumption, day spending, reward, birthday interruption, provider requirement or spending/confirmation-gate changes. The existing contact Return resets its Life section to Today for a preserved non-nearby pending reply. `career_batch_continue` and old `travel_continue_response` gain display metadata from their captured remaining days, leaving their immediate wrapper days and fee unchanged. Review never changes affordability by adding a household forecast to an upfront fee. Existing craft provider/life/day/resource binding and stale-confirm checks remain authoritative.

## Verification

- PASS: syntax checks for changed JavaScript and `git diff --check`.
- PASS: independent final source inspection of quotes, accounting separation, current Return targets, provider binding and stale confirmation gates.
- PASS: corrected current ID6 gate, 14/14 tests, zero failures or skips, 14.47 seconds. The first run exposed four test-expectation errors (provider-meeting bookkeeping, rejection-only notice and retired dialogue selectors); all were corrected and the full ID6 suite rerun.
- SUPPORTING RUN: the initial serial 78-test command completed with 73 pass / 5 fail. Trade/craft, careers and travel suites passed, as did seven budget accounting tests. The four new assertion failures were resolved by the successful 14-test rerun above. The existing budget legacy test still retains a stale literal-prose expectation for birth_arrival, while current migration supplies narrativeEdition 30 and A Small Beginning. No migration code was changed here, and that historical assertion was not weakened.
- NOT RUN: real-browser layout, screen reader, phone/200% zoom and offline parity. Handler tests model semantic navigation/state preservation, not browser geometry.
- NOT RUN: the historical aggregate suite with known retired-interface assumptions.

Completed first serial command (results above):

```
node --test --test-concurrency=1 tests/action-cost-clarity.test.js tests/trade-craft-windows-v42.test.js tests/budget.test.js tests/travel.test.js tests/careers.test.js
```

Successful current ID6 gate: `node --test --test-concurrency=1 tests/action-cost-clarity.test.js`.

Coverage includes zero/unknown fields, quoted-vs-wrapper precedence, materials, adult-day boundary, long/captured remaining commitments, outstanding-vs-new accrual, read-only Activities/services/craft review, insufficient direct fee, exact-fee affordability despite outstanding living costs, birthday-interrupted prepaid work, stale repeat activation, current custody/conversation/descent Return controls, genuine v0.2 planned-year migration and retired-route absence.
