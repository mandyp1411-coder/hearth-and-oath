# v0.72 preparation: the old life's door and the kept lives

Development results for the slice after `23e29fa`, on branch
`codex/v0.72-one-rulebook`. The entry policy stays unset (`rulebook.js`
admits both rulebooks); no compatibility is removed; neither acceptance gate
is waived. This is not a release verdict.

## What was run

| Check | Source | Result |
| --- | --- | --- |
| Fast lane, serial, 251 files | `c04ac2e`–`6130d94` (files ran as commits landed) | 3,256 passed, 1 failed, 3 skipped. The failure was `return-life-cards` #7, which pinned two lines this slice changed on purpose; updated in `f8ad2d6`, 7 of 7 |
| App-mounting files re-run at the tip, serial | `f8ad2d6` | 109 files, 1,644 passed, 0 failed, 0 skipped |
| Slow lane, serial, 36 files | `c04ac2e`–`6130d94` | 741 passed, 0 failed, 1 skipped |
| Browser, two origins plus both offline files | `6130d94` (main), the pinned archive from `build-archive.mjs` | 32 of 32 ([record](archive-verification-v072-door.md)) |

The skips are the reference-art tests (`curses-v25`, `presets-v18`, `rpg-v18`),
which skip when the paintings folder is absent.

## What the new tests hold

- `tests/old-life-door.test.js`, 8 tests through the actual app with genuine
  v0.60 and v0.69 saves: the rulebook admits both and only a rehearsal
  refuses; nothing changes while both play; under rehearsal the title
  continues an admitted life or shows the kept one, the old slot is kept and
  does not open, an old file meets the door, and a kept Ironman run exports
  its authoritative head without adoption.
- `tests/kept-life.test.js`, 7 tests: a later build's life and the genuine
  v0.60 lives under a decoder that refuses old rules are kept in their slots,
  written back byte for byte by other slots' saves, never offered as empty,
  replaced or deleted only by review; an all-kept envelope stays the
  envelope; non-lives are still read as nothing; the app shows, exports and
  reviews a kept life.

## Not run here

- The public archive and main addresses in a browser (this machine's shell
  cannot reach them); the loop above is the same build on two local origins.
- The formal release gate (`npm run release:check`) and the other offline
  checkers.
- The engine bench: `engine.js` is unchanged in this slice.
- The human farmer/heir playtest.
