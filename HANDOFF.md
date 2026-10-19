# Hearth & Oath — full source handoff, v0.59.0

This is the complete tracked source snapshot of the published game, commit
`6159b6b8c83cbb1b8ed004aa729f224f5487b666`, published as Site version 94.

Live game: https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site

## Start here

Use Node.js 24 (the version used for the current implementation), npm, Python 3,
and Git for development/checks. The game has no npm package dependencies and
does not require an AI service, API key, database or backend server.

Extract the ZIP, open a terminal in `hearth-and-oath-v0.59.0`, and run:

```sh
npm start
```

Visit http://localhost:3000. This serves the existing source in `dist/`.
Keep the terminal open while playing. The modular source needs HTTP rather
than opening `dist/index.html` directly from the filesystem.

After editing source, rebuild the standalone game and hosting output:

```sh
npm run build
```

This creates `artifacts/hearth-and-oath.html`, downloadable offline byte parts,
and `out/` for hosting. Generated duplicate artifacts are intentionally rebuilt
instead of being copied into this source handoff. The tracked templates,
manifests, complete runtime assets and all build scripts are included.

## Contents

- `dist/js/`: editable JavaScript modules, including game rules and UI. Despite
  the directory name, these files are the maintained source, not a separate
  minified application generated from an omitted source tree.
- `dist/index.html`, `dist/styles.css` and the other `dist/` assets: the complete
  playable static application, portrait atlases, illustrations and audio.
- `reference-art/`: every tracked original artwork, generation/provenance record
  and associated preparation script. This accounts for most of the ZIP's size.
- `content/`: retained source content.
- `scripts/`, `tests/`, `release-contract.json`: build tools, regression tests,
  actual older-save fixtures and the serial release checker.
- `docs/`: design/system records, implementation notes, historical evidence and
  the exact current incomplete validation report.
- `audit-pdfs/`: all seven supplied Hearth & Oath audit/review PDFs. The two
  implementation-driving reports retain their original filenames.
- `.openai/hosting.json`: the existing Sites project binding. Preserve it for
  this project; use the appropriate binding when moving to another project.
- `SOURCE_SNAPSHOT.json`: exact published identity and verification status.
- `SHA256SUMS`: hashes of every other file in this ZIP, relative to this folder.

Git internals/history, authentication tokens, local credentials, caches,
temporary playthrough outputs and duplicate generated build directories are
excluded. Every file tracked at the published commit is included unchanged.
The archive is a source snapshot; it is not a Git history bundle.

On systems with `sha256sum`, verify after extraction with:

```sh
sha256sum -c SHA256SUMS
```

## Implementation and continuation context

Read `docs/implementation-v0590.md` first. It maps both main audit PDFs and the
related UI/story/creation findings to the actual implementation. Read
`docs/current-release-gate.md` before running release validation. The other
documents include historical results; their original version labels matter.

The game is a fantasy life simulation. Ordinary work, school, care, relationships,
family and community are valid central paths. Combat and adventure stay optional.
The release fixes story-record integrity, infant agency/mail, stale birthday
greetings, creator undo/portrait behavior and audit UI inconsistencies. New
planning, routine, contextual relationship, family, provenance and expedition
systems are bounded first implementations, as documented in the crosswalk;
the PDFs' larger future content catalogs are not declared fully authored.

Keep one authoritative simulation clock and action path. UI read models must not
advance time, grant rewards, introduce acquaintances or accept commitments.
Preserve old saves' exact captured choices, participants, terms and consequences.
New narrative improvements apply prospectively. Keep infants observational,
keep consent/repair boundaries meaningful, and stop routines/travel for real
pending decisions. The implementation crosswalk records further continuation
rules and the boundaries of the larger roadmap slices.

## Verification status at publication

The user explicitly requested immediate publication before the full release run
finished. That run stopped cleanly with 845 passing cases across 62 of 254 test
files, zero failures, zero skipped cases, and a passing immutable-source check.
The overall full software gate remains **NOT RUN**, not PASS. The remaining
test files, stress cohort and final combined offline gate were not completed
in that run. Earlier focused checks/offline diagnostics are separate evidence.
Native browser layout, phone/zoom geometry and screen-reader checks were NOT RUN.

`docs/release-v0590-validation.json` is the exact stopped report. Its Git field
records the pre-commit working tree that was tested; `SOURCE_SNAPSHOT.json`
records the later saved/published source commit. The runtime and verification
identities identify the actual bytes rather than pretending the old HEAD was
the final published commit.

For the next release, run a fresh complete serial gate from the extracted source:

```sh
npm run release:check -- --tier full --expected-version 0.59.0 --output artifacts/release-handoff
```

Do not pass the published `--expected-commit` to a new repository initialized
from this snapshot. Use the current actual HEAD if a commit guard is desired.
The complete suite can take substantial time. Do not resume older evidence
after changing runtime, tests or build/check inputs. `npm test` is the raw
historical aggregate, not full release certification. Also perform supported
browser and assistive-technology checks before claiming those outcomes.

Saved lives reside in the player's own browser storage. Use the game's
Export/Import controls to transfer them between origins or devices. This source
archive contains the repository's regression fixtures, not a player's live save.
