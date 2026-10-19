# Reading-size consistency · roadmap item 9

## Scope

This source-only change addresses quality-audit A4 against published v0.44.0
(commit `236a5dff46d7fa0e43ad26aa01154d0823bb2d95`). The existing Settings
reading-size preference already supports 100–150%; it was not absent. Recent
interaction, counter and workbench styles had introduced fixed pixel sizes that
bypassed it.

Explicit prose sizes in the affected families now multiply their original
100% pixel size by the existing shared `--reading-scale` value exactly once:

- Shared service/Activity labels, descriptions, day/fee quotes, disabled reasons,
  quiet choices and conversation prose/headings.
- Barter item names, prices, quantities, offered goods, totals, Gold balance,
  search/category controls and selected-item descriptions.
- Crafting summary, catalog headings, result and project descriptions, every
  result/time/fee/skill/workbench term, ingredient labels and required/owned
  counts, including narrow-screen tab rules.
- Same-family Activity/crime/field labels and action descriptions, and journey
  fee/time/reserve/camp fine print. The map artwork and map-control glyphs are
  not enlarged.

This is not a global font redesign. Existing base sizes, font families, muted
colors, portrait/item artwork dimensions and the interaction arrow column remain
unchanged. The plain-font preference still works through the existing serif
variable. No simulation, price, time, reward, save schema, game-state handler,
version number or publication behavior changes.

## Reflow rather than smaller fine print

Trade/craft names no longer disappear after two lines. Cells retain their minimum
height and grow vertically while the existing catalog viewport scrolls. Long
labels, quantity descriptions and totals may wrap; shared interaction text keeps
its shrinkable column. Activity tabs and conversation/provider return controls
fit their container rather than forcing a no-wrap minimum width. Barter
confirmation buttons can occupy another row. Ingredient grids can shrink below
their normal 150px minimum; craft term/value pairs stack at 420px and below.
Existing item-art dimensions and minimum click targets are retained. The prior
seven-control mobile dock, title-height and narrow portrait-header repairs are
not modified.

## Source verification

PASS: `node --test tests/reading-scale-consistency.test.js`

32 tests passed in 0.16 seconds. These verify every explicit font size in the
scoped cascade, including media-query overrides, one reading-scale factor,
reflow declarations, preserved item-art/arrow/click-target values, and separate
browser-wide display storage without writing life/workspace entries. The test's
1.5 expression check is source arithmetic, not a browser-computed font ratio.

PASS: five selected existing CSS regression tests:

```sh
node --test --test-name-pattern='shared portrait treatment|the more-specific mobile grid|mobile labels wrap|the title menu retains|narrow portrait headers' tests/interface-consistency-v40.test.js tests/mobile-navigation-v401.test.js
```

These preserve the established art treatment, seven-item dock, scaled/wrapping
navigation labels, content-height title and responsive identity layout. The
existing Activity-tab assertion was deliberately updated from forced no-wrap to
container-safe wrapping; it is not an unrelated historical test suppression.
No production-handler or broad simulation suite is claimed by these selected
source tests.

PASS: `node --check tests/reading-scale-consistency.test.js` and
`git diff --check`.

## Published baseline reproduced in the browser

The actual public v0.44.0 page was inspected on 17 October 2026 in the cloud
browser at an 1188px content viewport. Settings were changed through the normal
Text size slider, and the same selectors were read with `getComputedStyle` at
100% and 150%. In the Work Steward conversation:

- Action label: 16 → 16px; description: 13 → 13px; disabled reason: 12 → 12px.
- The day/Gold quote already scales 11 → 16.5px through older, more-specific
  CSS. This change preserves that once-only scaling rather than doubling it.

At the Materials Merchant counter, item name 11 → 11px, item price/quantity
10 → 10px, search input 14 → 14px, category label 11 → 11px, category select
12 → 12px and Gold balance 16 → 16px reproduced the same preference bypass.
At both settings the document's scroll width equalled its 1188px client width;
this says nothing about narrow layouts. A desktop screenshot was inspected at
150%, not used as a pass for the changed stylesheet. No offer was staged or
confirmed, no day or Gold was spent, and the original 100% Book serif preference
was restored and verified. Crafting, narrow viewports and real browser zoom
were not covered by this baseline pass.

Independent read-only source review found no blocking issue and independently
reran all 32 new tests, the five selected CSS regressions and whitespace checks.

## Required browser gate before accepting the release

NOT RUN against the changed stylesheet: real computed-font ratios, rendered
overflow/readability, 320px/390px viewports, 150% Settings and 200% browser zoom. Public-browser verification is
pending against the final integrated candidate. Local Chromium has a previously
established socket permission failure and was not retried. Source tests do not
establish layout, clipping, touch behavior or screen-reader accessibility.

The final integrated release must verify its actual stylesheet through ordinary
QA navigation. Use only a QA life and restore the prior display settings. Record
both Settings 100% and 150% computed font sizes on the same nodes at each
viewport, then verify long names/reasons, ingredients, total/quantity labels and
all controls remain readable/reachable without horizontal page overflow. Check
200% real browser zoom where the browser supports it; an emulated viewport alone
is not browser zoom. Representative expected explicit size pairs (px) are:

- Shared interaction label 16 → 24; description 13 → 19.5; quote 11 → 16.5;
  disabled reason 12 → 18; quiet label 14 → 21.
- Mobile trade name 10 → 15; price/quantity 10 → 15; staged count 11 → 16.5;
  offer description 12 → 18; totals label 11 → 16.5; value 18 → 27;
  search input 14 → 21; category select 12 → 18; Gold balance 16 → 24.
- Craft result heading 24 → 36; detail/terms/ingredient label 12 → 18;
  required/owned count 10 → 15; project terms 12 → 18.
- Destination quote 22 → 33; journey remaining-time/camp fine print 10 → 15;
  reserve terms 12 → 18. Existing higher-specificity scaled prose may determine
  some nested paragraph sizes; the ratio must still be 1.5.

No offline build, standalone verification or publication has been run from this
worktree. Those, real browser QA and final integration regressions remain release
gates for the final integrated release.

## Integration additions

The v0.45 integration also expresses the pre-existing shared `.living-cost-note` fine print with the scale variable, preserving its 11px base size. Current `<small>` placements already have a more-specific scaled rule, so this is source consistency rather than a newly confirmed rendered bypass. It explicitly checks that rule plus the new compact cost details and optional help summary/prose. The source parser accepts insignificant whitespace in `var(--reading-scale, 1)` while retaining the exactly-one-factor check. These four added selectors make the final integrated reading-scale file contain 36 tests; its final results belong in the release verification record.
