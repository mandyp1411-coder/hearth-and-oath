# v0.72.3, Every life has the whole world: verification

The release record for branch `v0.72.3-no-station-gates`. The six station
checks are gone: schooling, the living world, the guild, the delve,
battlecraft and the cloth belong to every life, and migration step 72 begins
each on a life that predates it with stated defaults and no invented past.
The farmer playtest gate still holds for every new kind of life.

## What was run

| Check | Source | Result |
| --- | --- | --- |
| Fast lane, serial, 252 files | `567ba2e` | 3,269 passed, 0 failed, 3 skipped |
| Slow lane, serial, 36 files | `567ba2e` | 741 passed, 0 failed, 1 skipped |
| Release build and archive build | `567ba2e` | Both pass; content 0 errors, 0 warnings, 0 voice hits |
| Browser, two origins plus both offline files | `567ba2e` (main), the pinned archive | 28 of 28 ([record](archive-verification-v0723.md)) |
| Offline recipe, download, release-gate, voice-lint and boot tests against the rebuilt recipe | the release tip | 64 passed, 0 failed |
| Engine bench, three runs each against main `ad31f40` | `567ba2e` | No change beyond run-to-run noise (below) |
| Three generated lives, aged a year | main `ad31f40` and `567ba2e` | Identical apart from `edition.began` and `edition.step` |

Both lanes ran in a worktree frozen at `567ba2e`, the tree the release
commit carries apart from this record, the status page, the ledger and the
rebuilt offline recipe; the commits named here are the branch's development
commits, which the release commit squashes. Altogether 4,010 passing tests,
none failing, four skips: the reference-art tests (`curses-v25` one,
`presets-v18` two, `rpg-v18` one), which skip when the paintings folder is
absent.

### Engine bench

`node scripts/bench/engine-bench.mjs`, the same machine, alternating:

| | createLifeAtAge(18) | getActions | chooseAction | ageUp |
| --- | --- | --- | --- | --- |
| main `ad31f40` | 6,028 / 6,417 / 6,120 ms | 16 / 14 / 21 ms | 29 / 27 / 35 ms | 199 / 146 / 166 ms |
| v0.72.3 | 6,236 / 6,343 / 6,553 ms | 16 / 17 / 15 ms | 31 / 27 / 30 ms | 148 / 147 / 154 ms |

The save is 711,240 characters at nineteen on both.

## What the changed checks hold

- **Step 72.** A life read with no schooling gets it: past six it reads
  (letters `'before'`), and the shrine keeper's place was never offered; a
  younger one learns its letters as a birth does. No guild family is decided
  after a birth. The living world, the delves, battlecraft and the cloth
  begin empty from the season the life is read.
- **The dungeons.** The board's descent and the five campaign dungeons are
  delves for every life; a dungeon begun in the maze resumes there
  (`mazeBegun`), one walked in the older room engine keeps its record there.
  Contract and regional descents are mazes; the maze tests descend by
  contract or a regional road, and the authored-maze tests stand in genuine
  begun mazes, two of them written by v0.72.2's own engine
  (`tests/fixtures/maze-identity/v0722-begun-authored.json.gz`, generator
  `scripts/fixtures/generate-begun-mazes.mjs`).
- **School and trade.** Tuition, the examinations and the credentials are
  every life's; the free school and the service scholarship are gone. The
  archive takes a scholar with a grammar school certificate, so two
  controlled QA scholars carry one as data.
- **War.** The calendar's wars and the regional border tension are gone (both
  were already off on a living world). The levy stays: its entry had two
  `onlyIf` keys and the effective one, an active war, applied to living
  worlds all along; only the dead key goes.
- **Fights.** Every read life fights on the field (v0.68): a Standard
  companion may fall there, and the rebuild campaign aims at what it can
  reach, walks each delve through its lair, and cares for a wound fever.
- **The first lesson of a school year.** A child holding exactly the year's
  fee was refused after paying: the engine takes the fee as the lesson's
  cost, and the lesson asked the purse again (`schoolReason`). A public-engine
  regression in `education-v64` fails on v0.72.2's code and passes now.
- **Long lives.** The dynasty, expansion, lineage and rebuild policies let the
  new systems' scenes take their course (`continue`); fixtures that relied on
  free school find their fees as controlled data; household's unit fixtures
  carry schooling like every life; and the regional-world and war tests start
  their wars through a court (`startRegionalWar`).

## Not run here

- The public addresses in a browser, and publication to the Sites host (the
  live game stays on Sites 106 until main is deployed there).
- The formal release gate (`npm run release:check`) and the other offline
  checkers.
- The human farmer/heir playtest.
