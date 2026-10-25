# v0.72.2, One rulebook in the engine: verification

The release record for branch `v0.72.2-one-rulebook-engine`. The rules no
longer ask which rulebook a life lives by; `migrateSave` reads any life into
the one rulebook with stated defaults (nothing owed, nothing borrowed, luck by
season from the day it is read). The main game's store still keeps an
old-rules life exactly as written (v0.72.1), so those defaults are what the
engine does, not what a player's old save meets. The farmer playtest gate
still holds for every new kind of life.

## What was run

| Check | Source | Result |
| --- | --- | --- |
| Fast lane, serial, 252 files | `8443bfc` | 3,267 passed, 0 failed, 3 skipped |
| Slow lane, serial, 32 of 36 files | `8443bfc` | 693 passed, 0 failed, 1 skipped |
| Slow lane, the other 4 files after their policy repairs | `20a63ca` | 48 passed, 0 failed |
| Release build and archive build | `8443bfc` (`dist/` as at the tip) | Both pass; content 0 errors, 0 warnings, 0 voice hits |
| Browser, two origins plus both offline files | `20a63ca` (main), the pinned archive | 28 of 28 ([record](archive-verification-v0722.md)) |
| Offline recipe, download, release-gate, voice-lint and boot tests against the rebuilt recipe | the release tip | 64 passed, 0 failed |
| Engine bench, three runs each against main `abfb73d` | `20a63ca` | No change beyond run-to-run noise (below) |
| Three generated lives, aged a year, hashed without version stamps | main `abfb73d` and `20a63ca` | Identical |

The commits after `8443bfc` change only four slow test files (`expansion`,
`full-rpg-v14`, `lineage`, `playtest-regressions`): their policies now take
the best open care and count the season's luck, as a life under the one
rulebook has to. Those four were run again at the tip; the slow lane's other
32 files ran at `8443bfc`, whose `dist/` is the tip's. Altogether 4,008
passing tests, none failing, four skips: the reference-art tests
(`curses-v25` one, `presets-v18` two, `rpg-v18` one), which skip when the
paintings folder is absent.

The commits named here are the branch's development commits. The release
commit squashes them; its tree differs from `20a63ca` only by this record,
the status page, the ledger and the rebuilt offline recipe.

### Engine bench

`node scripts/bench/engine-bench.mjs`, the same machine, alternating:

| | createLifeAtAge(18) | getActions | chooseAction | ageUp |
| --- | --- | --- | --- | --- |
| main `abfb73d` | 5,829 / 5,945 / 5,731 ms | 14 / 14 / 17 ms | 29 / 31 / 32 ms | 170 / 254 / 131 ms |
| v0.72.2 | 5,956 / 5,591 / 5,726 ms | 15 / 18 / 13 ms | 32 / 28 / 27 ms | 196 / 187 / 141 ms |

The save is 711,240 characters at nineteen on both.

## What the changed checks hold

- The edition checks are gone from the rules (mortality, the break at full
  Stress, the lender's interest, borrowing after the first adult year, the
  tired worker's refusal, the passive wage, nature without an attribute
  bonus, the voice); the tests that documented the old rules' branches follow
  the one rulebook.
- Tests that mounted the old harness route now mount the game as players get
  it; captures from old releases that a test plays are read into the
  rulebook first (`tests/helpers/one-rulebook.mjs`, `readIntoRulebook`).
- Long-life policies take the best care open to them: under the one rulebook
  an untreated fever can kill, as it already could for every new life.
- Gold assertions in the long policies account for the season's luck
  (`state.fortune.history`).
- New births are unchanged: the three hashed lives are identical to main's.

## Not run here

- The public addresses in a browser, and publication to the Sites host (the
  live game stays on Sites 106 until main is deployed there).
- The formal release gate (`npm run release:check`) and the other offline
  checkers.
- The human farmer/heir playtest.
