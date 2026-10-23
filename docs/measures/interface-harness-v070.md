# Interface harness — v0.70

Measured 2026-10-23T21:37:36+00:00 with Chromium 141.0.7390.37 against `http://127.0.0.1:49067/` (a local static server over `dist/`; no network latency). Run time 97.2 s.

Viewports: desktop 1440×900 and phone 390×844, each at the default text size and at the largest reading-scale setting (150%). Baselines are the 22 October evaluation of v0.66; aims are the Design Bible's. v0.70 measures only; nothing in the game changed for it.

## The measures

| Measure | v0.66 baseline | Aim | v0.70 measured |
|---|---|---|---|
| Distance from the top of the page to the decision on the Day/Life screen, default text | 555px desktop, 611px phone | under 200px | desktop 575px as arrived, 533px to Right now; phone 647px as arrived, 589px to Right now<br>150% text: desktop 668px as arrived, 611px to Right now; phone 1,026px as arrived, 814px to Right now<br>"as arrived" is the opening scene with the first-day guide above it; "Right now" after the scene is answered. |
| Share of choices on screen whose cost and serious risks are visible without any gesture | not measured | all | desktop 4/4 in Right now, 0/3 in the scene; phone 4/4 in Right now, 0/3 in the scene<br>150% text: desktop 4/4 in Right now, 0/3 in the scene; phone 4/4 in Right now, 0/3 in the scene<br>every view, state and run together: 60/124 (48%) |
| The Fight page's total document height at default text | old page 2,637px desktop, 3,348px phone; field page not measured | fits the viewport without scrolling; scrolls only with larger text | Old page, the tactics rehearsal dialog (its scrollHeight, as v0.66 measured it): desktop 2,637px; phone 3,348px<br>150% text: desktop 2,809px; phone 3,716px<br>Old page, a legacy life in a forest fight (unrolled): desktop 1,568px; phone 3,280px<br>150% text: desktop 2,115px; phone 4,357px<br>Field page, the edition life in a roaming fight (unrolled): desktop 1,582px; phone 2,006px<br>150% text: desktop 2,008px; phone 2,748px<br>None fits its viewport (900px desktop, 844px phone) at either text size. |
| Share of a phone screen that is content | about 66 % | 70 % or more | phone, default text: 65.2% (550.6px of 844; game-header 183.4px, game-commandbar 57px, mobile-command-dock 53px; #main-content is 550.6px)<br>phone, 150% text: 46.2% (390.1px of 844; game-header 301.3px, game-commandbar 79.7px, mobile-command-dock 72.9px; #main-content is 390.1px) |
| Sub-tab rows per view | up to 2 | 1 | desktop up to 3 (Relationships 3 rows from 1 bar, Journal 2 rows from 2 bars); phone up to 4 (Relationships 4 rows from 1 bar, Journal 3 rows from 2 bars, Activities 2 rows from 1 bar)<br>150% text: desktop up to 4 (Relationships 4 rows from 1 bar, Journal 2 rows from 2 bars); phone up to 4 (Relationships 4 rows from 1 bar, Journal 4 rows from 2 bars, Activities 3 rows from 1 bar)<br>A bar is one group of tab controls; a bar that wraps counts each wrapped row. |
| Smallest rendered font size on each main view | 8px | 12px | desktop 7px (Explore: text.paper-sheet-caption "THE WOODED BASIN"); phone 7px (Explore: text.paper-sheet-caption "THE WOODED BASIN")<br>150% text: desktop 7px (Explore: text.paper-sheet-caption "THE WOODED BASIN"); phone 7px (Explore: text.paper-sheet-caption "THE WOODED BASIN")<br>On the Life view: desktop, default text 10px, 28 elements under 12px; desktop, 150% text 10px, 2 elements under 12px; phone, default text 10px, 34 elements under 12px; phone, 150% text 10px, 2 elements under 12px |
| Number of network requests before the title screen settles | 288 | under 40 | desktop 293 (script 289, image 2, document 1, stylesheet 1); phone 293 (script 289, image 2, document 1, stylesheet 1)<br>150% text: desktop 293 (script 289, image 2, document 1, stylesheet 1); phone 293 (script 289, image 2, document 1, stylesheet 1) |
| A toast still covering a control after 10 s | yes | never | desktop, default text: at 10 s gone (at 0.4 s it was shown, over Do the hall’s work The hall has )<br>phone, default text: at 10 s gone (at 0.4 s it was shown, over Plans & household calendar, Live the season ¼, Age up 1, Download offline game) |

## Each view

First control / first choice: top edge in px with scroll at 0. Height: the unrolled height (fits = no scrolling needed). Type: the smallest font and how many text elements are under 12px. Tabs: rows of sub-tab controls. Choices: how many visible choices carry a cost/risk line, of how many.

### desktop, default text

| View | First control | First choice | Height | Type | Tabs | Choices |
|---|---|---|---|---|---|---|
| Title screen | 20px | — | 979px | 10px, 5 under 12px | 0 | 0/0 |
| Life, as arrived (scene: Your First Adult Birthday) | 228.6px | 574.8px | 1835px | 10px, 25 under 12px | 1 | 0/3 |
| Life, Right now | 228.6px | 606.2px | 1963px | 10px, 28 under 12px | 1 | 4/4 |
| Activities | 325.3px | 468.3px | 1051px | 9px, 20 under 12px | 1 | 3/3 |
| Explore | 228.6px | 650.5px | 991px | 7px, 25 under 12px | 0 | 1/1 |
| Relationships | 443px | 1247.2px | 1455px | 10px, 32 under 12px | 3 | 7/7 |
| Inventory | 397.9px | — | 1030px | 9px, 41 under 12px | 0 | 0/0 |
| Journal | 228.6px | 897.3px | 2668px | 10px, 20 under 12px | 2 | 0/13 |
| Character | 228.6px | — | 1255px | 9px, 35 under 12px | 1 | 0/0 |
| Party | 550.1px | — | 900px fits | 9px, 21 under 12px | 0 | 0/0 |
| Family history | 1809.2px | — | 1978px | 9px, 20 under 12px | 0 | 0/0 |

The creator drew its own life in 11.8 s (Begin at age 18); it left Vozhem Ravuzhen, age 18, scene birth_year_18, decision at 574.8px.

Choices without a visible cost/risk line: Life: “Thank the people who raised you”, “Talk with your friend about further learning”, “Spend the morning outdoors together”; Journal: “Accept this quest”, “Hear the proposal”, “Decline invitation”, “Hear the proposal”.

### desktop, 150% text

| View | First control | First choice | Height | Type | Tabs | Choices |
|---|---|---|---|---|---|---|
| Title screen | 20px | — | 1211px | 15px, 0 under 12px | 0 | 0/0 |
| Life, as arrived (scene: Your First Adult Birthday) | 259.3px | 668px | 2252px | 15px, 0 under 12px | 1 | 0/3 |
| Life, Right now | 259.3px | 697.6px | 2358px | 10px, 2 under 12px | 1 | 4/4 |
| Activities | 380.2px | 533.2px | 1256px | 9px, 3 under 12px | 1 | 3/3 |
| Explore | 262.8px | 801.8px | 1040px | 7px, 5 under 12px | 0 | 1/1 |
| Relationships | 518px | 1565.8px | 1754px | 10px, 5 under 12px | 4 | 7/7 |
| Inventory | 436.6px | — | 1069px | 9px, 21 under 12px | 0 | 0/0 |
| Journal | 259.3px | 1052.7px | 3206px | 10px, 2 under 12px | 2 | 0/13 |
| Character | 259.3px | — | 1316px | 9px, 18 under 12px | 1 | 0/0 |
| Party | 679.5px | — | 967px | 9px, 3 under 12px | 0 | 0/0 |
| Family history | 2285.5px | — | 2454px | 9px, 3 under 12px | 0 | 0/0 |

Choices without a visible cost/risk line: Life: “Thank the people who raised you”, “Talk with your friend about further learning”, “Spend the morning outdoors together”; Journal: “Accept this quest”, “Hear the proposal”, “Decline invitation”, “Hear the proposal”.

### phone, default text

| View | First control | First choice | Height | Type | Tabs | Choices |
|---|---|---|---|---|---|---|
| Title screen | 20px | — | 973px | 10px, 5 under 12px | 0 | 0/0 |
| Life, as arrived (scene: Your First Adult Birthday) | 300.4px | 647px | 2903px | 10px, 31 under 12px | 1 | 0/3 |
| Life, Right now | 290.8px | 662.4px | 3062px | 10px, 34 under 12px | 1 | 4/4 |
| Activities | 385px | 574px | 1327px | 9px, 26 under 12px | 2 | 3/3 |
| Explore | 290.8px | 656.8px | 1462px | 7px, 31 under 12px | 0 | 1/1 |
| Relationships | 514.5px | 2115.4px | 2379px | 10px, 38 under 12px | 4 | 7/7 |
| Inventory | 446.3px | — | 2238px | 9px, 47 under 12px | 0 | 0/0 |
| Journal | 290.8px | 1121.4px | 3179px | 10px, 26 under 12px | 3 | 0/13 |
| Character | 290.8px | — | 1820px | 9px, 41 under 12px | 1 | 0/0 |
| Party | 671.6px | — | 1051px | 9px, 27 under 12px | 0 | 0/0 |
| Family history | 1888.1px | — | 2113px | 9px, 26 under 12px | 0 | 0/0 |

Choices without a visible cost/risk line: Life: “Thank the people who raised you”, “Talk with your friend about further learning”, “Spend the morning outdoors together”; Journal: “Accept this quest”, “Hear the proposal”, “Decline invitation”, “Hear the proposal”.

### phone, 150% text

| View | First control | First choice | Height | Type | Tabs | Choices |
|---|---|---|---|---|---|---|
| Title screen | 20px | — | 1357px | 15px, 0 under 12px | 0 | 0/0 |
| Life, as arrived (scene: Your First Adult Birthday) | 493px | 1025.7px | 4329px | 12px, 0 under 12px | 1 | 0/3 |
| Life, Right now | 467.8px | 939.1px | 4165px | 10px, 2 under 12px | 1 | 4/4 |
| Activities | 585.1px | 840.6px | 2092px | 9px, 3 under 12px | 3 | 3/3 |
| Explore | 469px | 895.2px | 1865px | 7px, 5 under 12px | 0 | 1/1 |
| Relationships | 747.4px | 2930.5px | 3353px | 10px, 5 under 12px | 4 | 7/7 |
| Inventory | 631.4px | — | 2725px | 9px, 21 under 12px | 0 | 0/0 |
| Journal | 467.8px | 1610.7px | 4879px | 10px, 2 under 12px | 4 | 0/13 |
| Character | 467.8px | — | 2151px | 9px, 18 under 12px | 1 | 0/0 |
| Party | 1040.2px | — | 1559px | 9px, 3 under 12px | 0 | 0/0 |
| Family history | 2577.3px | — | 2898px | 9px, 3 under 12px | 0 | 0/0 |

Choices without a visible cost/risk line: Life: “Thank the people who raised you”, “Talk with your friend about further learning”, “Spend the morning outdoors together”; Journal: “Accept this quest”, “Hear the proposal”, “Decline invitation”, “Hear the proposal”.

## The Fight pages

| Run | Page | Unrolled height | Viewport | Fits | Dialog scrollHeight | Type | Choices |
|---|---|---|---|---|---|---|---|
| desktop, default text | Tactics rehearsal (old page, practice dialog) | 2750px | 900px | no | 2637px | 10px, 30 under 12px | 7/7 |
| desktop, default text | Field page (v0.68), edition life | 1582px | 900px | no | — | 9px, 36 under 12px | 6/6 |
| desktop, default text | Old battle page, legacy life | 1568px | 900px | no | — | 9px, 35 under 12px | 5/5 |
| desktop, 150% text | Tactics rehearsal (old page, practice dialog) | 3154px | 900px | no | 2809px | 10px, 25 under 12px | 7/7 |
| desktop, 150% text | Field page (v0.68), edition life | 2008px | 900px | no | — | 9px, 2 under 12px | 6/6 |
| desktop, 150% text | Old battle page, legacy life | 2115px | 900px | no | — | 9px, 2 under 12px | 5/5 |
| phone, default text | Tactics rehearsal (old page, practice dialog) | 3495px | 844px | no | 3348px | 9px, 34 under 12px | 7/7 |
| phone, default text | Field page (v0.68), edition life | 2006px | 844px | no | — | 9px, 42 under 12px | 6/6 |
| phone, default text | Old battle page, legacy life | 3280px | 844px | no | — | 9px, 41 under 12px | 5/5 |
| phone, 150% text | Tactics rehearsal (old page, practice dialog) | 4247px | 844px | no | 3716px | 9px, 29 under 12px | 7/7 |
| phone, 150% text | Field page (v0.68), edition life | 2748px | 844px | no | — | 9px, 2 under 12px | 6/6 |
| phone, 150% text | Old battle page, legacy life | 4357px | 844px | no | — | 9px, 2 under 12px | 5/5 |

## How each measure is taken

- **decision** — With every scroll position at 0, the top edge (getBoundingClientRect().top, px) of the "Right now" panel ([data-right-now]) or, when a scene is open, of the scene's first choice card (.story-scene .choice-card) on the Life view; "as arrived" is the Life view as the creator leaves it (opening scene and first-day guide on), "right now" after the scene is answered and the guide dismissed.
- **costVisibility** — Visible choice controls ([data-op=activity], [data-op=choice], [data-op=battle-action], [data-op=practice-action]) that carry a visible line naming time, gold, Health, Focus or a danger: a descendant (or, for a battle command, a sibling in its .field-action/.battle-action-option wrapper) whose class contains cost, risk, detail, reason, preview or outlook and has text, or any text matching /\b\d+\s*(d|days?|g|gold)\b|\bnow\b|\d+\s*%|risk|danger|deadly|wound|bleed|death|die\b|dead\b|health|focus/i. Share = carrying / visible choices; measured on every view, headlined for the Life view.
- **fightHeight** — Height the page would need to show the whole fight without any inner scrolling: document.documentElement.scrollHeight plus, for every visible element whose overflow-y is auto or scroll, its scrollHeight minus clientHeight ("unrolled height"). The tactics rehearsal is also reported as the practice dialog's own scrollHeight (.practice-modal), which is how the v0.66 figures were taken. "Fits" means the unrolled height is no more than the viewport height.
- **phoneContent** — At 390x844 on the Life view with scroll at 0: 844 minus the union of the vertical extents of .game-header, .game-commandbar, .mobile-command-dock and .bottom-nav (so the dock and the nav inside it count once), over 844. The height of #main-content is reported beside it as a check. In game mode the body is 100dvh with overflow hidden, so these bars are on screen whatever their CSS position.
- **subTabRows** — Inside #main-content, every visible nav, [role=tablist] or element whose class contains tabs, scope, categories, sections or filters that holds two or more visible buttons of one data-op with one marked current (aria-pressed=true, aria-current or .active/.selected); its rows are the distinct vertical positions (3px tolerance) of those buttons. A view's count is the sum over its groups.
- **smallestFont** — For every non-empty text node on the page whose parent is rendered (has a box, not display:none, visibility:hidden, opacity 0, [hidden] or .sr-only), the computed font-size of that parent; the smallest, with the element and text it belongs to, and how many such elements are under 12px.
- **requests** — Network requests the page makes from navigation to index.html until the network has been idle for 500ms (Playwright networkidle) on the title screen, counted by resource type.
- **toast** — Save in this browser (Menu) is pressed on the Life view; #toast is read 0.4s later and again 10s after the press: whether it is shown (not hidden, has a box) and whether its box intersects any visible button, link or input.
- **firstControl** — With scroll at 0, the top edge of the first enabled button, link or form control inside #main-content in document order, and of the first choice control ([data-op=activity], [data-op=choice], [data-op=battle-action]).
- **viewHeight** — The unrolled height (see the Fight page) of each main view, and whether it fits the viewport.

## How each page was reached

- title: the title screen, a fresh browser profile with the display setting seeded
- practice: Title screen → Tactics rehearsal (data-op practice-open, lesson protect_ally); the dialog draws the older battle page for a fictional party
- life: Title screen → Continue (the seeded eighteen-year-old life the creator makes for the harness seed, its birthday scene waiting)
- life-right-now: the Life view after answering the opening scene (Thank the people who raised you) and dismissing the first-day guide
- field: Title screen → Continue a seeded save of the harness life standing in a roaming fight (createBattle on the edition life, fieldVersion 68); the Life view draws field-ui.js
- legacy: Title screen → Continue a seeded save of a life born without a station (the old edition), grown to twenty and put into a forest fight; the Life view draws battle-ui.js
- creator: Title screen → Begin a new life → an empty slot → the creator with its defaults (Begin at age 18) → Begin This Life; a random seed, so this life differs from the seeded one

## Notes

- Figures are from a local static server (python3 -m http.server over dist/) in headless Chromium; no network latency, no cache warmth from a previous visit.
- Distances are layout distances with every scroll position at 0; the game may itself scroll a scene heading into view when it focuses it.
- The game shell is 100dvh with overflow hidden: views scroll inside .game-content, so "unrolled height" adds the hidden overflow of every inner scroll container to the document height.
