# A Life Others Notice: scoped implementation and verification

This is a new reconstruction on recovered baseline `3fede948`, not recovery of the lost unpublished feature bytes. No prior 89-test result certifies it. The new scoped release is v0.55.0; the broader reliability/global quality item 11 remains pending.

## Mechanics and privacy

The existing Winter Levy quest, four endings, payments, standing and services are unchanged. Ordinary Talk can offer one of eight ending-specific reactions from the exact original clerk/factor. Both parties must currently be adult, alive, available and co-present at an open, nonhostile settlement. A relocated original may react where actually present; a successor never inherits the original's private involvement.

Optional household sharing requires the player's owned home and its Homes room, an actually present adult current partner (bond35) or trusted current family member/child (bond60), and real lineage-backed household provenance. Honest shares the real route, original clue/mistake, eventual evidence and outcome. Limited shares only involvement, not choices or terms. Private and leave disclose nothing. Household membership alone conveys no knowledge.

One optional return is offered seven days after the actual completion history date, not the earlier letter gate. It requires the original live service owner, original location, canonical earned service ID/source/kind/rule/day and nonexpiry. It contains ordinary pleasure and humor, not new work or a repeatable reward.

All authored effects are empty. The new conversation-specific reply handling bypasses personality effects/previews, personal-remedy review and its extra companion-boundary call; the engine's existing generic action lifecycle remains unchanged. Actual words are appended literally to existing conversation threads and the Journal. Opening a Talk action captures its pending scene using existing machinery; rendering/querying/navigating never creates an acknowledgement or disclosure. Only a real canonical reply can create a receipt. Stale/dead/remote replies close without speech, reward, disclosure or acknowledgement.

## Additive saved state

There is no new migration/default field. Absent `conversations.levyAftermath` means not recorded. The array holds at most four typed receipts: two original-person reactions, one household decision and one return. Ownership uses seed, stable active lineage person ID, generation and birth day, never mutable display names. Foreign-owner receipts are rejected, not silently adopted or discarded; the actual successor producer begins a fresh conversation book.

Receipts bind the authentic completed source, exact recipient, canonical choice, opening/reply IDs and dates. A bounded global message-ID index checks any retained messages against their exact thread/speaker/text/day; ordinary prefix pruning does not turn an acknowledgement into another offer. Pending levy snapshots require the genuine captured opener/day and unused topic. Household lineage proves adult/alive status on the exchange day while preserving genuine later death or separation. The disclosure accessor exposes only the explicitly selected honest/limited text. No arbitrary `effect.fact` is added to modern dialogue validation.

The existing two-million-character save ceiling is unchanged. Bounded new text cannot promise every nearly-full life will fit. The new Standard-store test checks a valid genuine reply write and, separately, rejection of a controlled oversized clone with bounded Journal entries and the new receipt, without overwriting durable slots/backups. It does not claim that a genuine reply exceeded the limit: observed serialized character counts were 1,999,500 for the pre-admission synthetic fixture, 276,825 after the real reply and 2,009,739 for the separately padded clone. Existing narrative refresh can rewrite synthetic Journal rows; pending snapshot removal also affects net size. No Ironman, detached-file or enlarged-capacity API is introduced.

## Selected verification coverage

- `tests/winter-levy-aftermath-pure.test.js`: **22 PASS**. Controlled minimal pure fixtures, content/eligibility/ownership/provenance/transcript negatives. These are not earned-play or legal-save claims.
- `tests/winter-levy-aftermath.test.js`: **20 PASS**, including the two handler subtests. The checked-in played legacy-v5 household is explicitly migrated, real trait point selection and actual Winter Levy actions earn the four outcomes, real rest earns returns, actual replies cover invariance/privacy/literal reload. Includes exact-person handler routing and prefix collisions. Controlled relocation/refusal/death/retirement boundaries are labeled; actual successor API is exercised. The incomplete remedy sentinel is explicitly handler-only, not a legal-save claim.
- `tests/winter-levy-aftermath-store.test.js`: **4 PASS**. Actual current Standard `createSaveCoordinator`/`createSaveStore` admissions, fresh repeated read-only queries with all storage keys/bytes frozen, exact pending, coordinated reply and untouched unrelated rows/backups, separate controlled oversized rejection. Disposable memory storage is not native-browser quota/cross-tab durability evidence.
- `tests/helpers/winter-levy-fixtures.mjs`: shared actual producer fixture, no wealth/health/quest/trust grants.
- `scripts/verify-offline-winter-levy-aftermath.mjs`: **PASS**, five sequential disposable VM sessions in four scenario groups, 16.389 seconds, zero network attempts. Exact built artifact/runtime/loader/parts identity before and after, current connected/owned UI commands, exact authoritative slot/mirror parity, unrelated full rows/backups and explicit teardown. Semantic fake DOM only, not geometry/accessibility/native-browser certification.

## Scoped source outcome and baseline debt

The clean tested source was `0afb8f527dbb5120ef4ef8ac822af67b369123bd`. Thirteen whole source files ran serially at heap512MiB, UV1 and concurrency1: **171 PASS / 6 FAIL**, no skipped or cancelled cases and all within their explicit caps. Eleven files passed; two failed. The new three files contributed 46 passes. Other passing files were conversations, local-intrigue, local-intrigue-calendar, household, saves, identity-personality-v20, npc-continuity and npc-continuity-engine.

These six failures were independently reproduced on clean baseline `3fede94833074a9ed55c9ba8b37625830a972074`, with identical complete failure payloads after removing duration/location metadata and normalizing only the worktree root:

`tests/conversation-followups-v43.test.js` (10 PASS / 3 FAIL):
- Legacy exact played thread supports follow-up without a migration or speculative backfill.
- A participant leaving or becoming hostile while a follow-up waits cancels without consumption.
- Actual shell submits contextual responses once and keeps another occupied slot unchanged.

`tests/lineage.test.js` (18 PASS / 3 FAIL):
- Authentic covenant endings and destroyed settlements survive actual adoption, retirement and succession.
- Public separation keeps co-parent links, real children and estate, and permits a later chosen partnership.
- A courtship can be ended without entering a household pledge, and forged relationship endings are rejected.

No feature-only failing case was observed in this selected coverage. The source aggregate is still **FAIL**, not a passing file/full-suite result or waiver of the existing debt. Full software/global quality item 11 remains pending.

## Exact artifact and evidence identity

The unchanged builder passed in 64.385 seconds with a clean `0afb8f5` producer, heap1536MiB and UV1. The focused checker then passed alone with the same heap/UV1 and explicit GC. Both process receipts report normal exit0.

- Runtime: `57451884a89e317897e993a93b7bb8a04a6faf96de3218c40bad4b4063f4e960`, 622 files.
- Tested verification inputs: `1009636a4ee36e67613daf2e854e481a0fed5c172eadd51de9e542e45d3a62e9`, 393 files. This belongs to the tested source checkpoint; subsequent evidence-only documentation changes do not change runtime/test bytes.
- Standalone artifact: 133,092,174 bytes, 16 parts, SHA256 `828d1c56868105315eeb7370d15dad6947f88076888dbc8d0e238b428e6cc438`.
- Manifest: `19edf516203747c22b5df4fc82cfc96e06fcc949e69af19f1481edb0479098aa`.
- Loader: `3a04d1cd7f7091eb36bd78c28afc99a2b24ccbac777be88b0668db25c75d19c5`.
- Executed checker source: `c16c50bfd5dacf06dc5a540412f257d030b5284efdb737b6cc6b3da9d583af09`.

Source report: `artifacts/winter-levy-source-0afb8f5/source-scope-report.json`, SHA256 `11920455b58a5a2cd73e381fb3e54a708fc1c7205c3d159e2ef8a3c292f41b62`. Combined build/checker report: `artifacts/winter-levy-build-0afb8f5/scoped-release-evidence.json`, SHA256 `4a81abe385fb39bebbdc01924a09f57be58151e6807fa54a747cb3515cafe086`. Raw reports are preserved separately under `docs/verification/v055/`.

Native browser/storage/download/cross-tab checks, physical responsive layout, assistive technology and the formal whole-software gate were **NOT RUN** in these automated receipts. Publication subsequently succeeded on 2026-10-18 at 07:56 UTC as native version 83 from source `3b597323eb59ad2ae435e29df3f3a19d36c27eb8`. Separate actual public UI observations confirmed the label, initially empty three slots, prepared-branch import, literal pending reload, honest/limited reply persistence, once-only sharing and literal Journal. The limited export contained one correct receipt with day 6712 unchanged. These limited native observations do not prove native-played full lives, general storage/quota/cross-tab behavior, physical accessibility or the formal gate. The original factor's still-pending public export is preserved separately for compatibility testing. No lost-branch 89-pass or old reliability-gate credit is transferred to this reconstruction.
