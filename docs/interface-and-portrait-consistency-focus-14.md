# Interface and portrait consistency — v0.35.0

This is a focus 14 follow-up to the original audit and the annotated review.
Focus 15, quest expansion and new game mechanics remain unstarted.

## Shared interaction design

Merchants, doctors, work stewards, teachers, shrine keepers and innkeepers now
share the same portrait/header, dialogue treatment and full-width choice rows.
The existing trade table remains the place to inspect stock and confirm a trade.
The public area is called **Market**; each merchant keeps their own identity,
stock and prices. People Here, Relationships, conversation headings and party
labels show capitalized titles without changing canonical saved role values.

“Talk About Something Else” is a quiet row within the same conversation choices,
replacing the disconnected “Spend Time or Talk” button. Activities use the same
choice rows, readable descriptions and day/Gold quotes. Their category labels
keep complete words and wrap as whole tabs. Actual doctor, work and school
shortcuts still walk to the provider; their timing and eligibility are unchanged.

The generic “Adulthood / A moment of your own” panel is replaced by an unobtrusive
daily record: the actual calendar, present location and current trade. Current
surroundings, people and real undertaking records remain available.

## Saved lives

Occupied saved slots have a separate Delete button. The confirmation names the
life and its world, explains that its browser replacement backup is also removed,
and offers Export, Keep and Delete. Escape keeps the life. Empty slots cannot
be deleted. Deleting the last life also clears the older compatibility mirror so
it cannot return after reload. A neighboring life and its backup stay intact.

Deletion checks the durable saved slot and backup state again before writing;
changes from another tab invalidate the confirmation. Failed storage writes
leave the life in its original slot envelope and restore the in-memory state.
The active slot falls back to another saved life when possible.

## Letters and notifications

The header bell opens a saved inbox with unread indicators, expandable messages
and Mark All Read. Notifications are receipts for actual events: existing birthday
letters, existing birthday Gold gifts, illness onset/recovery, and supernatural
infection. They do not award a second gift, invent a correspondent, answer a
letter, heal the character or spend time. Opening Recovery, Inventory or a
person's recorded place uses the existing views and does not transport the player.

Fresh receipts show at the bottom right for nine seconds, with health changes
and gifts prioritized when many letters arrive together. Dismissal closes only
the popup. A quiet two-note chime respects the existing sound toggle and volume;
the inbox exposes that same preference. Fresh installations start with interface
sound enabled after the first interaction; an explicitly saved mute stays muted.
Music uses its existing independent setting. Opening an older saved inbox makes
no new popup or sound. Generated earlier-life receipts start already read.

The inbox keeps the latest 80 receipts, validates their saved shape and belongs
to the actual life/generation. An heir does not inherit the previous person's
unread correspondence. Automatic toast expiry changes only the toast container,
without resetting page focus or scroll position. Modal focus handling applies to
the inbox and deletion confirmation.

## Portrait expansion

The expansion adds **1,201 portraits** in 40 native atlases. Eight atlases add
**512 standalone mature portraits**, 64 for each ancestry, for ages 40–54.
The lifecycle collection adds **96 complete identities**, 12 per ancestry, each
with seven age portraits, plus 17 alternate infant faces: 689 accepted paintings.
Human, Elf, Dwarf, Halfling, Orc, Goblin, Tiefling and Beastfolk all gain infant,
child, adolescent, adult, mature, older and elder art. The combined expansion
includes **608 new portraits for ages 40–54**.

New NPCs and Fate can choose the new complete lifecycles. New legacy identities
can also save a compatible mature portrait from the larger standalone pool.
Every existing explicit stage selection, original artwork ID and established
read-only age bridge remains valid. A bridge for older unlinked art matches
observed presentation, complexion, coat and animal form; it is not a claim that
an old unrelated face has been repainted as the same individual. Fully drawn
new lifecycles use their own exact seven age portraits.

The art uses grounded medieval graphite shading, natural faces, practical wool,
linen and worn leather. Native images can retain slight warmth. Shared rendering
now enforces full grayscale for portrait images and fallback avatar layers on
all screens, including the menu, saved lives, character creation and galleries.
The muted yellow-gray interface palette remains.

All creative images were produced with the built-in image-generation workflow.
Packing only encodes native assets and registers observed crop rectangles.
No invented elder row, mislabeled infant cell, hue shift or rescaled source is
used to make an incomplete sheet appear complete. Exact generation prompts,
reference paths, per-cell corrections, native dimensions and hash receipts are
in [art-v40](art-v40/). The files are served from `dist/art/presets/` through
`mature-portraits-v40.js` and `lifecycle-portraits-v40.js`.
See the [mature prompts](art-v40/mature-prompts.json),
[lifecycle prompts](art-v40/lifecycle-prompts.json) and
[lifecycle review](art-v40/lifecycle-review.md) for the accepted artwork and
rejected-cell corrections. Native verification checks all 1,201 registered
crops for dimensions, bounds, visible artwork and uniqueness. A 504-case
snapshot also preserves unlinked portrait selection from the published v0.34.0.

## Verification

The regression record is `feedback-v0.35.0-tests.json`; the actual offline bundle
record is `verification-v0.35.0.json`. Verification covers actual interface
commands and saved state, native asset hashes/crops and the self-contained game
with network requests forbidden. Browser geometry, touch/device rendering and
screen-reader QA were unavailable in this managed workspace.

Five older entry/dialogue assertions already fail against the exact published
v0.34.0 source. They concern the old origin-radio contract and older contact/
dialogue/quest assumptions. They are recorded separately from this release's
selected gate. No historical suite-wide pass is claimed.

The final selected gate passes **268 tests across 21 files**, with no failures,
cancellations or skips. All 1,201 new portrait crops pass native verification.
The 132,080,749-byte standalone game contains 16 parts and passes actual embedded
UI commands with zero network requests, including 1,536 linked age selections.
Its SHA-256 is
`203ff83fb8e4aba429b0984bee6659bc7c794a58e2747a86b58f3561074e8fe6`.
