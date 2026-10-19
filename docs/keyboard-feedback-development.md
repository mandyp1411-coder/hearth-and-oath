# Keyboard and nonvisual feedback

Roadmap ID10 addresses continuity rather than a new notification center or a visual redesign. Simulation, fees, rewards, calendars, local-save rules, and the public audience are unchanged.

## Changes

- Cast the bones and Roll a name restore focus to the replacement trigger after rendering. The name reroll also respects ongoing character creation.
- Buy/sell increment, decrement, and inspected-item add buttons name the item, quantity direction, and bundle unit when relevant.
- Validated ordinary session actions use the persistent polite, atomic view-status live region to announce their existing visible Latest Result notice, capped at 280 characters. The complete result remains available in Latest Result. That disclosure is not a second live region.
- No shell, inventory, journal, letter body, or hidden story text is scanned or synthesized for action announcements. Repeated real outcomes may announce again; a detached old trigger is ignored. Rejected engine results use their actual reason, never an invented success.
- Pending focus and live-region work belongs to the render and modal that requested it. New navigation, a new decision, or a late save-conflict dialog cannot be overwritten by an obsolete creator/workbench/counter callback. Storage-availability-only warnings update an already-mounted polite atomic status in place rather than replacing current controls. Its empty state is visually hidden, not removed from the accessibility tree; repeated identical failures do not rewrite its text. Saving remains queued under the existing coordinator; an action outcome does not claim that its save has become durable.
- Successful craft/trade confirmations and abandoned projects retain a purposeful workbench/counter focus target; birthday interruptions retain the waiting decision's focus instead. Existing modal Tab, Shift+Tab, Escape, and return-to-trigger behavior is preserved.

## Source-controlled regression command

node --test --test-concurrency=1 tests/keyboard-feedback.test.js

The new cases use production handlers and synthetic lives or copies of the genuine v0.30 fixture. They cover repeated creator keyboard activation, contextual buy/sell names, trade/craft confirmation, stale and rejected activations, cancellation, repeated identical actual outcomes, no full-shell/hidden-record announcements, live popup controls, newer navigation, birthday interruptions, queued save-conflict ownership, and quota failures before/after focus restoration or newer navigation. The small DOM surface does not model CSS geometry, a browser's accessibility tree, or assistive technology speech.

Current validation: source syntax and diff checks PASS. Final focused handler run: 20 tests, 20 PASS, 0 FAIL, 0 cancelled/skipped/todo in 37.9 seconds. Independent source review cleared the final code. The first run exposed three fixture assumptions and an ordered design/workbench focus-fallback issue; all were corrected and the complete focused file rerun passed. Adjacent regression suites, integrated offline build, browser keyboard behavior, and assistive-technology speech are not established by this focused result. No offline build or publication has been performed for this isolated change.

## Required integrated browser gate

After integration and publication, use the actual site with disposable synthetic saves only:

1. Keyboard-only repeat Enter/Space on both creator rerolls. Check focus outline and sequential Tab position, then open/close a portrait dialog and check Tab/Shift+Tab wrapping and Escape return.
2. Inspect buy/sell quantity controls in the accessibility tree. Confirm item, direction, and material bundle naming, and confirm staged quantities do not spend resources.
3. Complete and cancel trade/craft flows. Confirm focus remains at the actual counter/design/workbench, while a birthday interruption focuses the waiting decision.
4. With a supported screen reader, perform an ordinary action, repeat an identical potion result, and reject an unavailable action. Confirm one concise truthful outcome per action and no duplicate Latest Result, whole-shell, private-record, or delayed obsolete announcement.
5. Hold/release an asynchronous save operation while navigating or opening a dialog. Confirm no focus escape into the inert shell and no claim that unsaved progress is saved.

Browser keyboard and screen-reader speech verification are NOT RUN for this source-only branch. Do not describe handler/ARIA results as a screen-reader pass.
