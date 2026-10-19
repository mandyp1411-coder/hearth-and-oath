# Browser save health and file escape (roadmap 20)

Status: source-only candidate based on published v0.47.0 (`1959103`). This branch does not publish, rebuild the standalone, or change gameplay/save schemas. Integration, packaged-source identity and real browser/accessibility/layout checks belong to the release lane.

## Player-facing behavior

- The title menu, occupied saved-life rows, play workspace and game menu show quiet browser-only save health and the last known durable save timestamp. An empty browser makes no successful-save claim; unreadable storage says that browser saves are unavailable, rather than claiming saved lives do not exist.
- A changed live position waiting for its coordinated write says “Saving in this browser…”. A failed or conflicted changed session says “Not saved — export needed”, with a direct, slot-labeled “Export latest session” button. The active live game is used for export even when its write has not reached the store.
- A conflict notification with no new local choices is identified as an older saved copy, not unsaved progress. Existing explicit conflict review/reload remains required. Closing the review never discards either session.
- Last-save time comes from the store's observed durable baseline, never the optimistic timestamp assigned to an attempted write. Unchanged successful re-saves keep the existing progress timestamp. Older/malformed timestamps remain unknown, rather than being invented.
- Export starts a separate JSON-file download. Its toast names the file and explicitly says browser save status is unchanged. It does not clear the warning, mark browser persistence successful, or remove exit protection. A failed download keeps the session open and asks the player to retry.
- Exit prompts are requested only for actual changed choices, including a live game still waiting for a browser lock. An unchanged failed re-save or conflict-only bookkeeping does not prompt. Browser policies, particularly on mobile, may suppress beforeunload; the visible export escape is not conditional on that event.

## Preservation and accessibility

The existing unsaved map, durable observed baseline, conflict checks and coordinator remain authoritative. New health methods are read-only except for invalidating derived comparison metadata. Existing writes still validate incoming input and read both real storage strings. Cache invalidation, mirror rollback, neighbor merge, revision/deletion review tokens and protected backups are unchanged.

Quiet renders use bounded per-slot source/baseline comparison metadata, not repeated world serialization. Successful writes acknowledge their source object; every app save invalidates that derived metadata before entering the asynchronous coordinator, and each store write invalidates it again. The existing app's state-changing handlers replace the game through `update(next)` or notification-read replacement followed by `save()`; workspace/display selections are separate. An unload check with live input always rechecks content once, so an unexpected in-place mutation cannot evade the exit guard.

Normal status labels and timestamps are not live-announced. Failure copy uses an always-mounted polite, atomic status region; the existing `#storage-warning` contract is preserved on that failure-only span. Status updates change text/visibility in place, without replacing focused controls. Each direct export has the accessible label “Export latest session from slot N”. Save health does not claim cloud sync, cross-device storage, a browser speedup, or guaranteed future storage retention.

Initial unreadable-storage navigation retains the existing guarded refresh policy. This change does not silently turn an unreadable saved-life list into empty slots, enable implicit overwrites, or redesign new-life recovery.

## Focused evidence and remaining gates

On the final failure-live-region-preserving source, the assigned serialized lane passed 25/25 with no failures/skips in 7.01 seconds:

- `tests/save-health.test.js`: ten small store/presentation contracts covering durable/attempted timestamps, unchanged saves, queued positions, same-reference failed writes, memoization, fresh unload comparison, changed/deleted/stale conflicts, adjacent-slot success, unavailable reads, missing timestamps and labels.
- `tests/save-health-ui.test.js`: nine semantic-handler cases covering title-only empty/unknown/empty-active states, exact latest export on game/title/slots, file-export failure, conflict dismiss/reload, held/rejected lock requests, in-place asynchronous status updates and exit protection. This fixture is not a browser, geometry or assistive-technology test.
- `tests/save-snapshot-cache.test.js`: all six existing private-cache, mandatory-read/validation, copy-isolation, changed-byte, quota-rollback and invalidation contracts.

The three existing keyboard queued-quota/focus/live-region timing cases additionally passed 3/3, with no failures/skips, in 4.72 seconds using `--test-name-pattern='queued quota failure' tests/keyboard-feedback.test.js`. `git diff --check` and module syntax checks passed. A first final-batch launch encountered a transport disconnect; no process or redirected logs existed, confirming it had not executed before one retry. No browser, full historical suite, packaged offline build or publication was run in this worker. Broader integration commands are:

```
node --test --test-concurrency=1 tests/save-health.test.js tests/save-health-ui.test.js tests/save-snapshot-cache.test.js tests/save-conflict-ui.test.js tests/keyboard-feedback.test.js
```

Release verification should additionally cover responsive title/slot/play/menu layouts, keyboard activation/focus, actual JSON download, generic unload prompts where supported, healthy action/save/reload, unavailable storage, same-slot conflict and a latest-position export from a held or failed write. Verify hosted/standalone module parity only after the integrator's final build.
