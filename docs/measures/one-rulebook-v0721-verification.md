# v0.72.1, The old lives are kept as written: verification

The release record for branch `v0.72.1-kept-ironman`. The main game's store
decodes a stored life only when its own raw markers say new rules
(`storedLifeDecoder`), so an old-rules life is kept exactly as written and no
line of the old rules' code runs on it; old Ironman runs get their own kept
path. The farmer playtest gate still holds for every new kind of life.

## What was run

| Check | Source | Result |
| --- | --- | --- |
| Fast lane, serial, 252 files | `6b29e6d` | 3,267 passed, 0 failed, 3 skipped |
| Slow lane, serial, 36 files | `6b29e6d` | 741 passed, 0 failed, 1 skipped |
| Release build and archive build | `6b29e6d` | Both pass |
| Browser, two origins plus both offline files | `6b29e6d` (main), the pinned archive | 28 of 28 ([record](archive-verification-v0721.md)) |
| Offline recipe, download, release-gate, voice-lint and boot tests against the rebuilt recipe | the release tip | 62 passed, 0 failed |

Altogether 4,008 passing tests, none failing, four skips: the reference-art
tests (`curses-v25` one, `presets-v18` two, `rpg-v18` one), which skip when the
paintings folder is absent. Later commits on the branch change only this
record, the status page and the ledger, and the rebuilt offline recipe.

## What the new and changed checks hold

- `tests/kept-ironman.test.js`, 9 tests on genuine v0.60 and v0.69 saves:
  under the main game's decoder an old run beside a new one does not stop
  run discovery, holds its slot (kept whole, never read, never empty), and a
  new run can still begin beside it; every intent but export, every commit
  and every reattachment is refused; the export is the head whole and
  writes nothing; release by reviewed token frees the slot and keeps the run
  whole among the retained positions, still exportable, and deletion by
  review removes it; a record whose life decodes to something else is still
  unreadable; a life known only from the single-save mirror is kept in the
  first slot and written into it by the next save; and through the actual
  app, the kept run's row, export, review, release and retained listing, and
  an old backup kept undecoded that is named, meets its door and exports
  exactly as stored.
- The door, kept-life, archive-link, retention, life-entry and return-card
  tests follow the kept old lives: an old slot exports its stored bytes and
  is never migrated by a neighbour's save.
- In the browser, two new steps: the returning player's kept life exports
  exactly as stored, and a player whose only save is the oldest single-save
  mirror finds it kept in the first slot (through the real IndexedDB move),
  with nothing to continue, exported exactly as stored.

## Not run here

- The public addresses in a browser, and publication to the Sites host (the
  live game stays on Sites 106 until main is deployed there).
- The formal release gate (`npm run release:check`) and the other offline
  checkers.
- The engine bench: `engine.js` is unchanged in this release.
- The human farmer/heir playtest.
