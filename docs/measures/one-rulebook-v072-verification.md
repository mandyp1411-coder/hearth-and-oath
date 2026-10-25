# v0.72.0, One rulebook: verification

The release record for the cutover on branch `codex/v0.72-one-rulebook`
([PR #19](https://github.com/mandyp1411-coder/hearth-and-oath/pull/19)). The
main game admits the new rules only (`rulebook.js`, `MAIN_ADMITS = 'new'`);
old-rules lives meet their door and play on in the public archive. The owner
took the cutover on 25 October 2026, before the farmer playtest. That gate
still holds for every new kind of life; it is not waived or claimed here.

## What was run

| Check | Source | Result |
| --- | --- | --- |
| Fast lane, serial, 251 files | `f990d72`–`ae686d7` (files ran as commits landed; neither commit changes a test's runtime) | 3,246 passed, 12 failed, 3 skipped. All 12 were `download-scene-return-integration`, whose helper mounts the app itself and so was missed by the switch's sweep; it plays an old-rules capture. Opted in at `28567d3`: 12 of 12 |
| Slow lane, serial, 36 files | `f990d72`–`ae686d7` | 741 passed, 0 failed, 1 skipped |
| Release build (`npm run build`: strict content, compile, offline file, hosting package) | `ae686d7` | Passed. The first attempt, at `f990d72`, failed: the offline bundle is not a module graph and could not carry app.js's `import.meta.url`. Fixed in `ae686d7` (the builder gives the bundled app a fixed address that admits the new rules only, and refuses any other `import.meta`); a test holds it |
| Archive build (`scripts/build-archive.mjs`, pinned `065d54c` plus the compatibility patch) | `ae686d7` | Passed; 262,553,396 hosted bytes, 1,047 files |
| Browser, two origins plus both offline files | `ae686d7` (main), the pinned archive | 24 of 24 ([record](archive-verification-v072.md)) |
| Offline recipe, download, release-gate, voice-lint and boot tests against the committed recipe | `28567d3` plus the rebuilt `dist/offline/` | 62 passed, 0 failed |

Altogether: 3,999 passing tests across the two lanes once the one opted-in
file is counted, no failure left, four skips. The skips are the
reference-art tests (`curses-v25` one, `presets-v18` two in the fast lane,
`rpg-v18` one in the slow lane), which skip when the paintings folder is
absent.

## What the browser saw

The main game from `dist/` and the archive from `out-legacy/` on two local
ports, as two origins; the offline files opened from disk:

- an old-rules file meets the archive's door in main, with no slot offered,
  and the door links to the public archive;
- the archive takes that file, plays it, and exports it named for the
  archive; what it exports still meets the door in main;
- a v0.69 new-rules save is labelled, plays in main and exports named for its
  rules; the archive turns it away in a line;
- a life begun in the archive is new rules, and main takes it with its date;
- main keeps its saves in `hearth-and-oath`, the archive in
  `hearth-and-oath-legacy`, and neither touches the other;
- a returning player whose old life is already in a slot sees the new-rules
  life continued and the old one counted as kept; the old slot is Kept for
  the archive and does not open; its export is the whole life, named for its
  rules, and the archive takes and opens it; no page errors;
- the main offline file shows the door for an old file and loads a new one;
  the archive offline file loads an old one.

## Not run here

- The public addresses in a browser: this machine's shell cannot reach them.
  The loop above is the same build on two local origins.
- Publication. The main game and the archive are published from the owner's
  Sites host, which this session cannot reach; the live game stays on Sites
  106 (v0.71.2) until main is deployed there.
- The formal release gate (`npm run release:check`) and the other offline
  checkers.
- The engine bench: `engine.js` is unchanged in this release.
- The human farmer/heir playtest.
