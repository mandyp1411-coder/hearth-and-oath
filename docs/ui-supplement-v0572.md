# UI supplement implementation — v0.57.2

Baseline: displayed v0.57.1, native version 90, source `77b068a380ac8924891a1f4e0a188967385ff52a`. The live Sites metadata and the unchanged baseline checkout agreed before implementation.

Scope follows the selected implementation option: UI 028–030 and the specific UI 006, UI 010 and UI 027 issues rechecked by the supplied live supplement. The original UI Evaluation and Standards and its addendum supply component standards and stable IDs. This pass does not close the entire 30-item register, validate every older finding or change game balance.

| Finding | Implementation | Verification status |
| --- | --- | --- |
| UI 028 | Inventory and activity herbal-care entry points open the same non-mutating review. Recipient, authoritative duration, herbs, fee, household accrual and supported effects are shown. A second named commitment revalidates the exact current life and offer. Receipts retain actual material use, elapsed time, net session changes and physical-care window. Full HP remains eligible for preventive care. | Source handler and engine checks; before/after baseline reproduction; exact treatment-state parity across healthy, fever, injury and insufficient-supply fixtures. Native replay remains pending. |
| UI 029 | A page-session draft is keyed by slot, seed, birth day and the actual person/generation. Ordinary navigation, Journal subviews, inbox and other lives retain their own text. Successful persistence clears the draft. Failed saves retain it and expose retry; an already adopted note is retried or corrected in place instead of appended again. Discard clears only this life’s draft. | Navigation, stale form, duplicate submit, held lock, quota failure, corrected retry, identical-person different-slot and Ironman recovery checks. |
| UI 030 | A Write Note/Resume Note control and separate discovery/personal-note totals precede the lore archive. It focuses the existing editor and restores the caret; Return to Discoveries restores the prior reading position. | Semantic ordering at 0, 1, 33 and 125 synthetic discovery rows; actual handler focus checks. CSS wraps controls at narrow widths and inherits the reading scale. Native layout measurement remains pending. |
| UI 010 | Discovery and active-quest/commitment no-match states distinguish searching from empty records. Matched/unfiltered totals and Clear Search are explicit. Personal-note counts retain their own scope. | Pure renderer, search/clear handler and result-announcement checks. |
| UI 027 | Explicit He/Him, She/Her and They/Them interface labels are shared by creation, Character and attributes. Saved enums and narrative pronouns are untouched; custom display text remains exact and machine-shaped unknown values use a neutral fallback. | Supported-option matrix, custom/unknown fallback and actual Character/attributes handler checks. |
| UI 006 | Title Settings/Load/New use intentional heading focus. Escape from title Settings returns to Settings. A letter’s recorded-place route hands focus to Explore without committing travel. | Connected semantic focus targets and unchanged time/resources in the affected routes. Other UI 006 routes remain outside this bounded claim. |

## Draft lifecycle and persistence

Drafts survive navigation and switching saved lives in the same open page. Reloading or closing the page starts a new draft session; this policy is stated next to the editor. **Keep Note saves the actual note.** Drafts are never added to game saves or localStorage, never inherited by a successor and never implicitly committed during navigation. Existing kept-note ownership, capacity, archive and date rules are unchanged.

If a Standard write fails after adopting a note in memory, its receipt identity is retained with the draft. Retry saves that same note. If the player corrects the retained words, retry updates that note rather than creating another. An Ironman reserved operation retains the draft until authority confirms persistence; recovery retry does not allocate another note. Stale controls cannot submit another life’s draft.

## Evidence and limits

`verification/v0572-ui-before-after.json` retains reproduced before/after values from the old and changed semantic handler surfaces. Its care comparison removes only presentation text and asserts exact equality of the remaining game state. `verification/v0572-ui-checks.json` records the bounded test results and existing baseline failures. The compiled and hosted-download parity reports are retained separately.

The project remains in the established charcoal, bone and brass life-book design. New controls wrap and use the proposed 46 CSS-pixel minimum, shared focus styling and current reading preference. Those source rules are not browser geometry evidence. No browser-control skill is available in this managed environment, so native rendering, 200% zoom/reflow, assistive-technology speech, physical phone/Safari, touch and virtual-keyboard behavior remain unverified. No item is promoted to fully closed native acceptance from these checks alone.

The wider health-focus suite has 27 failures on both the unchanged v0.57.1 baseline and this candidate, with the same failing test names. The same-slot conflict test in the older save-health UI suite also fails on the unchanged baseline because its newborn fixture expects a second choice removed by observational infancy. These tests are retained; this patch does not weaken them or claim a full-game regression pass.
