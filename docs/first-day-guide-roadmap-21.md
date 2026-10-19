# Find your footing (roadmap 21)

Status: isolated source candidate based on roadmap 20 commit `625ffc6`. This branch does not publish, rebuild the standalone, or join the current 16/17/18 release. Integrators should apply only its delta after roadmap 20.

## Player-facing contract

- Fresh lives receive one optional, initially open **Find your footing** disclosure in Life → Today. It offers two or three contextual steps, without replacing the current scene, stealing focus, granting completion rewards or adding persistent navigation.
- Waiting events, replies, encounters, descents, custody, journeys and attended commitments take priority. A guide control focuses the real existing surface or opens Explore. It never chooses a reply, serves time, advances an undertaking, or clears a pending record.
- In a quiet life, guidance can offer the actual local teacher or steward and an enabled everyday activity. Infant care, preschool stories/play, school-age learning, and adult/older livelihoods use existing action and unlock records. Providers are not invented or sought in distant settlements. No action is adventure-only.
- Provider visits walk the existing legal local route and open the actual meeting. They do not automatically enroll, work, accept a commission or spend lesson days. Everyday activities retain the engine's actual effects, days, fees and household costs.
- Age up's explanation is shared with How to play: it advances toward a birthday, potentially many days, and can pause for a decision. The guide does not create another Age up button.
- The saving step references roadmap 20's canonical browser status and opens the existing Menu → Export life flow. No second health computation, timestamp or live region is mounted.

## State and purity

`hero.firstDayGuide` is an optional, strictly validated `{version: 1, dismissed: boolean}` record. Fresh birth/start-age lives initialize it; successors obtain their own fresh marker. Existing saves without it stay valid and do not automatically open guidance. How to play can reopen it explicitly without resetting saved dismissal.

Dismissal changes only this marker and uses the normal validated save path, without simulation transitions or `afterAction`. It travels with the life through save/reload and export/import, rather than using seed-only browser workspace preferences. A failed browser write can hide it only for the current session; roadmap 20's unsaved warning remains authoritative.

The app memoizes its guide view for the current immutable state object. A quiet view reads one current action list, considers at most one context-relevant local provider, and reads at most one projected room. It reuses the provider meeting's extracted displayed-offer selector. Projection preserves all restrictions and clones cartography to isolate its nested map records; no transitions, NPC registrations, quest acceptance or RNG advancement occur in the preview.

Location text is not proof of eligibility. `getActions` can replace an intrinsic disabled reason with “Visit …”, so the guide must query the actual projected provider room and find an enabled displayed offer. Actual button activation recomputes its suggestion against current state before routing through the existing action or per-room visit handler. Detached previous controls remain rejected by the app's existing connected-node guard.

## Exact source hooks

- `engine.js`: fresh-life marker initialization and optional marker validation. Existing save versions, migration and gameplay transitions are unchanged.
- `first-day-guide.js`: pure state, context, focus-target and current-command adapters with injected authoritative readers.
- `first-day-guide-ui.js`: escaped disclosure and native button markup, with injected existing action-cost formatters.
- `world-services-ui.js`: extract the existing displayed-offer filter as `serviceMeetingOffers`; the provider meeting consumes the same selector.
- `app.js`: bounded memoized view in Life → Today; shared Age up help; Help reopen, marker-only dismissal, and fresh-command validation before routing to existing handlers. Existing save-health UI remains untouched.
- `styles.css`: local responsive disclosure styles, no fixed panel or persistent badge.

## Evidence and remaining gates

The short pure suite passed 20/20 in 0.112 seconds on the final source. It covers strict optional metadata, JSON round-trip and same-seed isolation, waiting priority, age-relevant offers, enabled projected eligibility, bounded lookup, nested cartography isolation, whole-source purity, actual focus-selector contracts, stale suggestions and escaped native markup. All seven affected JavaScript/test modules passed syntax checks, and whitespace checks passed.

After the v48 integrator explicitly released its heavy lane, the bounded serialized batch passed **53/53**, with no failures or skips, in 19.417 seconds (2026-10-17 UTC): 20 pure guide cases, 14 guide semantic/engine cases, and the existing 10 store plus nine UI save-health cases.

`tests/first-day-guide-ui.test.js` uses captured lives, real engine/provider readers and the semantic handler surface. Its passing cases check fresh creation and malformed metadata rejection, actual preview purity, optional legacy opening, durable dismissal, exact ordinary/visit transitions, native activation, disconnected controls, existing infant/reply/battle/prison/maze/workshop focus destinations and the canonical export menu. These are not browser geometry or assistive-technology checks.

Executed command:

```
node --test --test-concurrency=1 tests/first-day-guide.test.js tests/first-day-guide-ui.test.js tests/save-health.test.js tests/save-health-ui.test.js
```

The test process exited successfully and the lane was released to the queued ID22 worker. Broader affected historical regressions remain unrun in this worker; the later integrator should include, for example:

```
node --test --test-concurrency=1 tests/first-day-guide.test.js tests/first-day-guide-ui.test.js tests/save-health.test.js tests/save-health-ui.test.js tests/world-first-focus.test.js tests/entry-flow.test.js tests/keyboard-feedback.test.js
```

Release checks still include fresh starts at ages 0, 3, 6, 10, 16, 18 and 65; legacy/imported and successor lives; same-seed distinct slots; full-store conflict and failure states; keyboard and responsive layouts; actual downloads; and final hosted/standalone parity. Do not treat the pure suite or prepared handler cases as a full game, browser or packaged release pass.
