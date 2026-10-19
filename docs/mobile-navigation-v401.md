# Small-screen navigation and reading corrections, v0.40.1

## Confirmed defect

The seven primary navigation controls were laid out in five columns on small
screens. Life, Activities, Explore, Relationships and Inventory occupied the
first row; Journal and Menu wrapped onto an otherwise empty second row.
Real Chromium screenshots and DOM geometry at 400 and 500 CSS pixels confirmed
the 104-pixel dock. At 400 pixels each button was 80 by 52 pixels.

The mobile `body.game-mode .mobile-command-dock .bottom-nav` declaration had
higher specificity than the later seven-column `.bottom-nav` declaration. Its
obsolete five-column value therefore won the cascade.

At 400 by 605 CSS pixels with the game's text size set to 150%, the title menu
also overlapped its Music button: the menu ended at y=521.41 while Music began
at y=480.80. The title grid's flexible center row was allowed to shrink to zero,
but its centered content remained visible outside that row. Give the row its
min-content height so the existing title scrollbar handles enlarged text.

At 320 by 525 CSS pixels and 150% text, the fixed menu and resources columns
squeezed the character identity into a narrow stack. The header grew to consume
the available game window and the main content measured zero height. The narrow
portrait header now permits resources to wrap before shrinking the identity
below a useful width. Desktop and existing short-landscape header rules stay
unchanged.

## Bounded change

- Set that existing mobile grid to seven columns.
- Constrain each text label to its button and permit wrapping. Preserve the
  existing reading-scale font, icons and minimum touch-target height.
- Preserve the later normal-flow, auto-height dock and all game operations.
- Let the title's central row retain its content height before scrolling.
- Permit resource controls to wrap beneath a readable narrow-screen identity.
- No game/save schema, game mechanics, assets, audience or service changes.

## Verification

The focused v0.40 baseline had 84 passing tests. The same suites plus five
new semantic/source regressions pass: 89 tests, no failures. These cover shared
services, notifications, save deletion, portraits, inn services and novice
tournaments. The fake DOM does not prove CSS geometry. Real browser screenshots
and measured bounds are recorded separately in the visual QA deliverable.

The real-browser baseline used a new QA-only life and exercised character
creation, a birthday choice, notifications, one-day travel and a road choice,
doctor dialogue, inn food barter and Inventory consumption, journal notes,
market stock, and the novice tournament including paid-day/score preservation
across pause and navigation. Browser widths were changed through ordinary cloud
Chrome window sizing and zoom, not a touch-device emulator. Historical full-suite
failures are not represented as passing by this focused gate.
