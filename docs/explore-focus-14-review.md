# Explore and Situated Trading — v0.26.1

> v0.26.2 correction: the expanded Explore workspace described below is superseded
> by a map-only popup: one thin border, the map and a small close control. The
> toolbar, locator, location details and actions stay on Explore. Selection in the
> popup remains free; close it to review and confirm travel, or deliberately double
> click an available neighbor. The creation portrait's panel and ornamental frame
> are removed. The market background and merchant portraits now use the existing
> desaturated illustration filter, matching supplies, gear and area art.

This is a focus-14 follow-up to the original audit and the user's Explore review.
It builds on v0.26.0. Focus 15 remains unstarted. The muted yellow-gray palette,
existing portraits, established travel rules and saved world history remain.

## Evaluation

These findings come from source review, the user's feedback and automated
interaction checks. They are design judgments, not claims of human playtesting.

| Area | Finding | Implemented response |
| --- | --- | --- |
| Map camera | Scrollbars were the main way to look around. The chart recentered after every inspection. | Hold and drag with mouse or touch; preserve the viewed region across inspection, expansion and closing. |
| Map scale | Zoom buttons centered a selected hex instead of the place being examined. There was no useful large view. | An in-game pop-out chart uses the available screen, supports 100–400% scale and zooms around the pointer or viewed center. Fit and Find Me have separate purposes. |
| Map orientation | Known locations could be difficult to find among the chart's marks. | A Known Place locator centers an already charted place. Unknown names remain hidden. |
| Travel commitment | Dragging on a map could accidentally end in a location click. | A pan has a movement threshold, pointer capture and trailing-click suppression. Inspection remains free; Confirm or a deliberate double click executes the existing offered crossing. |
| Present location | A useful area list still led to a long catalogue of services and residents. | The area, current season/weather and environment lead the scene. Residents, other services and history use compact disclosures. Mobile areas form an illustrated two-column list. |
| Market | Entering the market immediately exposed purchase rows and a sale disclosure. There was no moment of approaching someone. | A counter environment and the actual merchant portrait lead to an Approach interaction, disposition-specific greeting and “What are you selling?” dialogue. |
| Shop inventory | Purchases were command rows, visually unlike the player inventory. Selling and buying were separate tasks. | Two illustrated inventories flank a trade table. Inspect an item, request or offer quantities, and confirm one exchange. Both inventories can be searched and filtered together. |
| Barter | There was no way to use carried goods toward a purchase in one exchange. | Existing seasonal prices and sale values determine item credit and the exact coin difference. Trade can buy, sell or barter, including when carried goods cover a purchase at zero starting Gold. |
| Item recognition | Supplies and materials used generic symbols despite the illustrated gear atlas. | Sixteen original illustrations cover potions, food, herbs, every material and several treasure types. Both Inventory and shop use the same art resolver. |
| Purchase decision | Equipment bonuses and set losses need to be readable before spending Gold. | The selected shop item shows its actual bonuses and an optional Equipment Changes comparison. Buying keeps the current loadout. |

## Reference and adaptation

Official sources reviewed on 15 October 2026:

| Source | Relevant evidence | Adaptation |
| --- | --- | --- |
| [FFXIV Basic Controls](https://na.finalfantasyxiv.com/game_manual/operation/) | The manual describes left-button map dragging and wheel zoom. | Direct chart handling, scoped wheel zoom and explicit keyboard equivalents. |
| [BG3 Patch 6](https://baldursgate3.game/news/patch-6-now-live_108) | The trading overhaul emphasizes who is trading, the status of the offer and access to carried inventory. | Merchant identity stays visible beside two inventories, with a clear request, offer, coin balance and Confirm command. |
| [BG3 Hotfix 21](https://baldursgate3.game/news/hotfix-21-is-now-live_112) | The fixes include an exploit involving closing Trade while dragging an item toward Barter. | Staging never transfers items; the engine validates and commits the whole exchange together. Closing the conversation discards the draft. |

The interpretation and layout choices are specific to Hearth & Oath. They do not
copy another game's art or add its persuasion, companion-wallet or discount rules.

## Controls and flow

- Explore → Expand Map opens a focus-contained in-game chart window. Escape or
  Close Chart returns to Explore and its launch control.
- Hold and drag on either chart to pan. Arrow keys pan the focused viewport;
  +/− zoom it and Home finds the player's position.
- Wheel zoom is active over the expanded chart. Alt+Wheel zooms the embedded
  chart, leaving ordinary page scrolling available outside the map.
- Fit shows the country at its base scale. Find Me centers the real player at a
  useful detail scale. Locate centers a charted place without visiting it.
- Market → Approach the Shopkeeper → “What are you selling?” opens trading.
  Reading dialogue or items and staging an offer spend no days, goods or Gold.
- Select a cell, then Request One or Offer One. The table's +/− controls adjust
  quantities. Search and filters retain staged goods. Confirm Trade performs the
  entire exchange, records a named receipt and clears the table.
- Equipped pieces are readable but must be unequipped in Inventory before sale.
  This merchant refuses stolen property. Supplies, materials and special property
  without an existing merchant sale rule remain visible but cannot be offered.

## Engine and compatibility

The new atomic command uses the existing gear catalogue, actual carried loot,
seasonal merchant prices, stock and sale-value rules. The quote binds to the
life, day, location, merchant and season, and includes quantities, per-item prices,
totals and the resulting Gold balance. Confirmation recomputes all terms and
rejects changed or unavailable goods, altered quotes, insufficient Gold,
duplicate rows, invalid quantities, equipped offers and blocked commitments.
Rejected exchanges leave both inventories, stock and money intact.

A successful transaction spends no calendar days, changes no equipped slot and
records one receipt. Catalogued gear sold to the shop returns to its stock under
the existing resale rule. Recovered unique gear is not converted into a new
catalogue instance. No merchant cash limit or random discount is invented.

Chart camera state, dialogue mode and unfinished offers are presentation state;
they do not enter a life save. The actual stock, belongings, coins and receipt
continue through the existing save/export/migration system. Earlier merchant
commands and legacy pack renderers remain compatible. There is one active chart
when expanded, avoiding duplicate map controls and landmark IDs.

## Verification

The release checks and final offline integrity figures are recorded in
[the audit progress](audit-focus-progress.md). New checks exercise actual app
handlers and engine exchanges. The DOM fixture models semantics and supplied
camera dimensions; it does not measure rendered CSS. Browser layout,
real-device pointer behavior and screen-reader QA were unavailable because the
managed environment did not provide the supported browser skill. No substitute
browser automation or preview server was used.

Original game palette variables are retained. The two generated images were
visually inspected, converted to WebP without changing composition and inspected
again. Their combined served size is about 340 KB. Existing art and audio are
unchanged.

## Asset provenance and prompts

Built-in image generation was used for both original assets. The production
files are `/workspace/sites/hearth-and-oath/dist/art/supplies-atlas-v29.webp`
and `/workspace/sites/hearth-and-oath/dist/art/market-counter-v29.webp`.
They are consumed through CSS and embedded in the offline build.

### Item atlas prompt

```text
Use case: stylized-concept
Asset type: production inventory icon atlas for the dark fantasy life RPG Hearth & Oath.
Primary request: ONE square 4 by 4 sprite sheet, exactly sixteen equally-sized square cells, seamless near-black charcoal backgrounds, no drawn grid lines and no text. This is a single coherent atlas, viewed as a contact sheet of inventory objects. Each object centered fully within its own cell with generous 15 percent inset and consistent scale, crisp readable at 48 pixels. Detailed painterly RPG inventory illustration, weathered natural materials, muted dull yellow brass, gray stone, faded olive, warm bone, brown leather. Low saturation. Subtle highlights, no colored glow, no icons as glyphs or flat vector.
Subject arranged STRICTLY row-major: Row 1: corked red healing potion in an old glass bottle; bundle of bread and dried meat expedition rations wrapped in cloth; tied bundle of medicinal herbs; lumps of rough iron ore. Row 2: folded woven linen cloth; bundle of split timber logs; rough building stones; rolled animal hide. Row 3: pale quartz crystal cluster; antique gold coins spilling from a leather pouch; rolled parchment scroll with wax seal; ornate tarnished chalice. Row 4: small weathered treasure chest; old leatherbound relic book; bundle of trade spices in a drawstring sack; bone-handled artisan hammer and small iron tongs crossed together.
Composition/framing: exact orthogonal 4x4 regular grid. Objects fill about 70 percent of each cell; no object or shadow crosses a cell boundary. Uniform dark charcoal background all cells, no border around sheet. No portraits, scenes or environments. No text, no labels, no watermarks, no UI mockup. Square image, highest feasible fidelity.
```

### Market environment prompt

```text
Use case: illustration-story
Asset type: wide environment art for the market location and shopkeeper scene in Hearth & Oath, a dark fantasy life RPG.
Primary request: an intimate old-world market stall seen at eye level from the customer's side of the counter, under a weathered canvas awning at the edge of a gray stone village lane. The left half has a worn wooden counter with a balance scale, a folded linen cloth, tied herb bundles, old glass potion bottles, stacked bread and dried provisions. Behind the counter are shelves of modest travel supplies, worn leather gear and a few iron tools. The right half is quieter, with deep shadows and a plain dark wood wall to receive a separate character portrait in the game UI. No person, no figure, no text, no signs, no frame. The art creates a place to approach and converse, not a busy catalog.
Style/medium: detailed painterly fantasy environment illustration, believable handworked materials, subtle brushwork. Restrained muted dull yellow-gray palette, faded ochre light, charcoal stone, gray canvas, brown wood, antique brass. Low saturation, no bright orange, no blue glow. Soft overcast daylight through canvas. Widescreen 3:2 or 16:9 composition, readable silhouette and an inviting quiet atmosphere. No logos, no watermark, no UI elements.
```

