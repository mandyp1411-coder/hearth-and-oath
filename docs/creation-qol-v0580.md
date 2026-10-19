# Creation and QoL review implementation

Input: Hearth_and_Oath_Creation_and_QoL_Review(1).pdf. The review observed v0.57.1/native 90. Work began from the published v0.57.2/native 91 source, 07f95ff6b47ec122a7f7f2a75eafa48e29c7000e. Existing v0.57.2 note, care, search and pronoun improvements are retained rather than duplicated. The PDF is unchanged.

| Review | Implementation |
| --- | --- |
| UI031 | Board-local stable stone focus, next enabled position with wrapping, named visible symbols, no hidden-face labels, held-key and detached-control guards. |
| UI032 | One local Finish panel, explicit one-day commitment, free last flip, actual capped receipt, solved state retained by the existing save model, ordinary failed-save retry without a second payout. |
| CC01 | 1. Beginning, 2. Nature & Abilities, 3. Review; current/completed semantics, stable control IDs. Origin ordinals reflect the actual displayed list rather than ancestry-specific decorative Roman numerals. |
| CC02 | Pronouns labels and existing He/Him, She/Her, They/Them labels; narrative and saved keys remain exact. |
| CC03 | Central draft adoption explains changed ancestry/stage and incompatible origin, heritage, traits or budget; latest undo restores the exact previous draft. Revisiting an ancestry revalidates its choices; it does not silently resurrect an old per-ancestry draft. |
| CC04 | Visible ancestry, pronoun, heritage, origin, portrait and family/fortune locks; whole unlocked beginning roll, separate portrait-only roll, existing name roll, exact latest undo and honest all-locked result. Age, selected abilities and traits survive randomization. A locked dependent retains a compatible ancestry; locked family retains its origin. |
| CC05 | Real presentation, collection and stage browsing; matching/selectable/stage totals; large candidate preview; separate selection; cancel; current finder and filter clear. Future stages are preview-only; actual character age never changes from browsing. |
| CC06 | Single validated age shared by numeric field and slider, 0–80, actual stage and point budget, invalid/clamped feedback. Infant descriptions preserve observational first years. |
| CC07 | Ordinary-life attribute uses, assigned-versus-history totals, deterministic fate remainder in Review, explicit age/budget/cap reasons, existing trait behavior/conflict/age explanations. Optional build archetypes are not introduced. |
| CC08 | One in-memory draft, safe detours and top-panel Escape, Keep Creating default, explicit discard, actual dirty-draft exit protection, progress outside the inert form. Drafts are not advertised as reload-persistent playable saves. |
| CC09 | Exact final Review and sole Begin This Life commitment; empty slot review before initial creation, explicit replacement before drafting, final slot summary, safe alternative empty slot, repeat guards and retained generated Standard retry. Existing Ironman first-save reservation remains authoritative. |
| CC10 | Standard default, concise selected Ironman consequence and optional disclosure; no large rules block and no tamper-proof claim. |
| CC11 | Shared 46px targets, reading-scale support, compact narrow portrait with gallery expansion, normal-flow footer and one creator document scroll. |
| CC12 | Stage-heading focus, modal trap/return, selection semantics, age feedback, progress region and persistent single-key shortcut setting. Disabled numbered choices retain their displayed positions. |
| QOL01 | Existing shared time/fee/materials/accrual grammar retained across care, craft, travel and projects; profession inquiry now has a free review and explicit commit. |
| QOL02 | Existing person/service/workbench return reused and extended for quest Journal references; scoped to unchanged life/slot/day/location/action revision, with query/category/scroll retention. |
| QOL03 | v0.57.2 Write/Resume Note, in-session draft isolation and safe retry retained. |
| QOL04 | Existing Inventory and Journal clear/search retained; relationship Clear Search; craft search/slot reset preserves category and finish; matching and total scope labels. |
| QOL05 | Known-only Close Contacts, Household, Party and last-30-day meeting scopes, existing search/pagination, location/availability/history. Optional pinned contacts are not introduced. |
| QOL06 | Actual current Journal categories, separate offers with authoritative acceptance commands, accepted objectives and existing tracked quest, explicit Clear Tracking without abandonment, actual recorded archive statuses and deadlines. Existing one-quest tracking is reused rather than a second pin system. |
| QOL07 | Actual full-loadout comparison reused for standard and deterministic fitted craft output; zero quantity ingredients excluded, requirements and owned totals retained. |
| QOL08 | Quiet actual save status and v0.57.2 note retention preserved; accessible browser-save retry in Menu. No confirmation/loading screen is restored. |
| QOL09 | Existing dismiss/reopen Find Your Footing retained; empty party/calling/recipe guidance uses actual discovery and recruitment paths. |
| QOL10 | Runestone actual actor/day/net resource receipt; legacy shared_methods gets an authored display label and new records write readable prose; older histories explicitly retain only their recorded detail. No invented historical outcomes. |

Additional polish: expandable Help topics, attributes-to-training route, clear hero inclusion in party ready count, nearby Focus/rest/direct-fee and household-cost separation before travel, free minigame opening/resume, reading sample and text-only reset, Inventory singular/plural and proper-name map labels, empty Ironman review opener focus.

## Verification boundary

Source tests use the actual delegated app handlers and authoritative transitions on the repository’s semantic fakeSurface. Compiled checks run the exact embedded offline graph with networking forbidden, then recheck artifact/runtime identity. Hosted recipe verification reconstructs the same complete standalone HTML byte for byte.

These checks do not certify native screen-reader speech, focus rendering, CSS geometry, physical touch, real browser storage/Web Locks, multi-tab timing, downloads or actual offline transport. The Sites managed environment has no supported browser-control skill, so no improvised browser QA was performed. Width and reading-size rules were checked in source; device and visual acceptance remain unverified.

Pre-existing regression debt is separate: people-focus.test.js has the same 11 failing cases on unchanged v0.57.2 (including person_v29 expectations against the existing person_v30 content). Earlier documented health-focus and old-infant save-health fixture failures remain outside this release’s change scope. No full-suite green claim is made. Unsegmented scene-return UI runs were killed by the environment and are not counted as passes. The same 23 cases passed in bounded groups after the reload assertion was updated to distinguish a newly created quest return from a persisted service trail.

Verification results and content hashes are recorded in the release verification report alongside this file.

## Recorded results

- Final focused source regression pass: 185/185, including 20 new creation/QoL cases.
- Existing scene-return UI cases: 23/23 across completed bounded runs.
- Additional Ironman entry and note handler cases: 6/6.
- Exact offline graph: six isolated VM sessions, 62 handler checks, two exports, 29 serialized lock entries and zero network attempts.
- The hosted recipe reconstructed all 341,899,520 standalone bytes exactly. The deployment tree is 261,271,450 bytes, below the 256 MiB expanded limit.
- Runtime SHA-256: c7d5ba06a03ce00d88ca484517a9488113bcaf059996aaf443ec948914f911c6.
- Standalone SHA-256: 25e8a3898ded87b856452209def586bc4c3ae2e69260c4c0c1fd30508669a1b8.

Machine-readable details: verification-v0580.json and verification-v0580-compiled.json.
