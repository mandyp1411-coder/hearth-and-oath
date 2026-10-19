# v0.55.1: See the words before speaking

Published on 2026-10-18 at 08:33:48 UTC as native version 84 from source
`049daeed2d24a7e0492d4fc598499a82706e536a`. This refines the existing
Winter Levy aftermath introduced in v0.55.0. It adds no story, quest, reward,
balance change or saved-state field.

## Presentation changes

- The three Winter Levy aftermath choice surfaces show the exact captured
  words the player will say beneath the existing stable button labels. NPC
  answers are not previewed.
- A shared captured cost/no-reward description appears once when every reply's
  description agrees. Different or incomplete descriptions retain the prior
  per-button presentation rather than inventing a common note.
- A real spoken aftermath reply focuses and reveals its current answer in the
  existing reading pane. Stale or unavailable closes do not pretend that speech
  happened. Later navigation, modal changes and another selected person guard
  against delayed focus stealing.

The authored aftermath module is unchanged, SHA256
`e6dc3885caa7ef4d7885e714fb70b5381a85c154588aebc135454355d21d33db`.
Existing bodies, labels, descriptions, responses, schema and action IDs remain
literal. Published v0.55 pending exchanges and receipts must continue to
validate without replacement or migration. The observed public prepared-branch
pending fixture has its [own provenance record](../tests/fixtures/native-v055-factor-pending.md).

## Verification status

New and extended source regressions passed for exact previews across all
three aftermath kinds, common-note/fallback behavior, escaping, ordinary and
wrong-person isolation, read-only state/slot bytes, and the observed v0.55
pending's exact mount/reload followed by its real opinion reply. Handler cases
cover successful answer focus, stale controls, unavailable closes, and a queued
focus superseded by navigation or a modal. The existing focused compiled checker
was extended, not replaced by a new certification framework. These results are
fresh on source `2ee39f5ed23917248e3f3920e72653707f12d229`, not transferred from
v0.55.0.

The three feature files passed **56 cases**: 22 pure, 30 engine/handler and four
actual Standard-store tests. Keyboard feedback passed 20 cases and reading-scale
consistency passed 37. The six-file source selection totals **120 PASS / 4 FAIL**,
five passing whole files and one failing file, with no skipped or cancelled cases.
Each ran serially within its explicit cap at heap512MiB, UV1 and concurrency1.

The unchanged `tests/dialogue-ui-v22.test.js` recorded 7 PASS / 4 FAIL. All four
complete failure payloads were reproduced on the actual published v0.55 source
`3b597323eb59ad2ae435e29df3f3a19d36c27eb8`, matching exactly after removing only
timing/location metadata and normalizing the absolute worktree root:

- Nearby people are actual contacts in the current settlement, not distant correspondents.
- A captured reply keeps its real person, choice IDs and exact trait previews without being spoken.
- New distant dialogue has no talk offer while local dialogue retains real costs and annual locks.
- Quest topics and relevant additional actions stay inside the selected person command panel.

Those failures remain failures, not a waiver or a passing source aggregate.
No feature-only failing case was observed in this selection. The earlier six
v0.55 baseline follow-up/lineage failures remain unresolved historical debt;
they were not rerun or credited as passing for this patch.

The unchanged offline builder passed with normal exit0 in **49.616 seconds**.
The focused compiled checker then passed with normal exit0 in **16.027 seconds**,
six sequential disposable VM sessions and zero network attempts. Each used
heap1536MiB, UV1 and a 300-second cap; the checker used explicit GC. All owned
processes closed normally.

At the closed automated checkpoint, native v0.55.1 visual/scroll acceptance,
native storage/download/cross-tab checks, assistive technology, the formal
whole-software gate and publication were **NOT RUN**. Those original receipts
remain unchanged. Publication and the limited later browser follow-up below
are separate evidence, not retroactive automated or whole-game certification.

The semantic handler fixtures model neither CSS geometry nor native scrolling.
No sticky header or global scroll reset is introduced. Global quality item 11 and the
previously recorded baseline follow-up/lineage failures remain pending; this
small presentation patch is not whole-game reliability certification.

## Separate post-publication follow-up

The actual retained v0.55 factor pending exchange survived reload into v0.55.1
with four exact player previews and one cost note. At 500 CSS pixels and at
400 CSS pixels under Chrome 125% zoom there was no horizontal overflow. Its
opinion reply focused the answer window and revealed its full top. The actual
delayed-return humor reply did the same at 150% in-game reading size; it required
vertical scrolling, not horizontal overflow, and removed the once-only offer.
Day 6720, gold 859 and stress 0 remained unchanged. The real UI export retained
the two correct receipts, null pending and literal Journal exchanges.

This was a fictional prepared QA branch, not a full native-played life or an
unaided discovery test. The 150% header/navigation remains cramped, separately
recorded UX debt. Physical iOS, assistive technology, native download/quota/
cross-tab guarantees and the formal global gate remain unverified. A genuinely
fresh civilian experiential run is underway separately and remains open.
Exact publication/export provenance and limitations are in the
[separate native follow-up](verification/v0551/native-followup.md).

## Exact tested identity

The source and verification inputs stayed unchanged through testing. The clean
build producer was `2ee39f5ed23917248e3f3920e72653707f12d229`; later documentation
or generated-artifact commits are not that tested source checkpoint.

- Runtime: `1a07e0ae36d5521fd77bf70c7c88309df8fd507fbaca59b5c0c69ac9657c8293`, 622 files.
- Tested verification inputs: `eb1e1f2d4c7b2857b920d5966382cbfc1452b44472b884141645d7b99b7f6733`, 395 files.
- Standalone artifact: 133,094,947 bytes, 16 parts, SHA256 `f5f65a03a26dadce3ecc15e7945c544611b77cb73f7eb9e964a75d21fc6e658f`.
- Manifest: `ecb81f084c94108c043c914af85e308cc30d387d717689ecfa46a59d010b1a26`.
- Loader: `3a04d1cd7f7091eb36bd78c28afc99a2b24ccbac777be88b0668db25c75d19c5`.
- Executed checker: `974ec56e93ebdbe808571c3c392a817cd9448ed1625aeb4cc54847cef5219642`.
- Observed v0.55 pending fixture: `63fcae01323875974b2faeaa54b972939a0a57bf84e91439f8c4de82ae29656e`.

The aftermath module and underlying engine, conversations, local-intrigue,
saves, household, lineage and personality modules stayed byte-identical to
their v0.55 tested versions. The presentation patch does not change saved scene
content or claim new privacy/economic mechanics.

Source report: `artifacts/winter-levy-ui-source-2ee39f5/source-scope-report.json`,
SHA256 `115b91557c1b6146cb392244de259dac360ccfc1723fbc5f106aa0de323c36f1`.
Combined build/checker report:
`artifacts/winter-levy-ui-build-2ee39f5/scoped-release-evidence.json`,
SHA256 `8d40064b0e7456eb7e655851a8838705086331f0b2a80c16db3e37585949fc01`.
Published-baseline differential report:
`artifacts/dialogue-baseline-3b59732/baseline-differential-report.json` in the
separate baseline worktree, SHA256
`b361bec7956dc68d525ef52d60d4899a30947e1aa1a137af37a6d261b3a8724d`.
