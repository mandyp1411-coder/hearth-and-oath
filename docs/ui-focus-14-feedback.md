# Focus 14 follow-up — v0.26.0

This is a historical implementation record. The
[v0.27.0 world-first record](world-first-focus-14.md) supersedes its Employment,
Bonds, Journal and service-menu structure.

## Executable brief

Reorganize the game around the player's current place, work, relationships and
possessions. Keep the muted yellow-gray, bone, charcoal and brass presentation.
Remove the country/settlement/dungeon and map/actions switches. Explore owns the
hex map and travel. A settlement opens as illustrated public areas; selecting an
area walks the real connected route. A descent opens as the current room with
doorways, consequences, supplies, party condition and an optional discovered map.
Journal holds objectives and lived records. School becomes Employment at the existing working age of sixteen.
Bonds is categorized remembrance. Inventory owns equipment and carried items;
trading belongs at an actual market. Fix every annotated creation, audio and
scrollbar issue, preserve saved decisions, test real commands and publish.

## Why the earlier interface felt clunky

These are design inferences from the feedback and source, not human-playtest
findings. The first reorganization gave systems sections without resolving their
ownership. Explore asked the player to select a representation before a place.
The pack combined belongings, shopping, crafting and build planning. Birthday
accounts repeated a personal scene beside a school report, while some choices
described intentions without making their existing skill effects clear. The
trait catalogue consumed a long page before the player had selected anything.
Dungeon nodes explained a graph but gave little sense of standing in a room.

The follow-up removes those representation choices and reduces the number of
different tasks competing on each surface. Primary actions are attached to the
actual subject: a location, doorway, carried item, person or current obligation.

## Reference and adaptation

Official Larian material was checked on 15 October 2026:

| Source | Relevant pattern | Implementation here |
| --- | --- | --- |
| [BG3 Patch 2](https://baldursgate3.game/news/patch-2-now-live_89) | Inventory and character-sheet handling receive explicit interface fixes. | Keep equipped character and carried items in one stable inventory workspace. |
| [BG3 Patch 3](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93) | Sorting, filtering and equipment interaction are treated as distinct inventory concerns. | A portrait with ten real equipment slots sits beside a searchable item grid, category and slot filters, sorting and one item inspector. |

This uses Hearth & Oath's actual slots, equipment, parameters and artwork. Item
inspection uses the existing comparator; equipping rechecks the existing engine
eligibility. The earlier focus-14 document records the wider FFXIV and Persona
comparisons that informed situated dialogue and clear screen ownership.

## Annotation resolutions

| Comment | Resolution |
| --- | --- |
| 1 — Title inner scrollbar | Remove overflow and height confinement from title content; use compact menu spacing and whole-page overflow only when the viewport needs it. |
| 2 — Two menu scores | Wait for the recorded score before starting playback. Synthesis starts only on recording failure. Returning to title releases both the current and retiring score. Hidden decode completion waits for visibility. |
| 3 — Missing portrait | Remove size-container dependence from creation portrait sizing and give the frame explicit dimensions. The portrait width follows its frame on small screens. |
| 4 — Fate labels reveal results | Ancestry, identity, heritage and origin choices say Random. Random ancestry exposes shared origin choices without labeling a provisional ancestry or heritage. |
| 5 — Age-based SAVIWP | Assign one bonus point per three starting years, up to eighteen total and six per attribute. Birth has none; age eighteen has six. Add these to the actual generated past once; vitality and intellect update health and magic capacity. |
| 6 — Compact nature | Three plus slots open a selectable list. Conflicting, unavailable and fourth traits are blocked before selection. Removing a creation choice frees its slot. Existing saves with more traits keep their earned attributes and history. |
| 7–8 — Scrollbar color | Native and WebKit scrollbars use the same dull yellow thumb and charcoal track, including earlier explicit gray rules. |
| 9 — Six-direction panel | Remove the redundant “Your next step” direction buttons. The hex map provides actual inspection and travel. |

## Screen ownership

| Screen | Content and behavior |
| --- | --- |
| Life | Current scene, relevant care and actual commitments. No duplicated birthday/school recap. Road interruptions retain the paid journey's actual progress and response controls. |
| School / Employment | Childhood learning, course progress, examinations and school history; professions from sixteen, commissions, workplace, work history and adventuring management. Other systems remain reachable through All views. |
| Explore | Hex chart, known information and actual travel terms. No settlement graph, layer tabs, map/actions tabs or quest-lead sidebar. |
| Your Location | Illustrated areas; entry follows offered connected public-room commands, rechecked at each hop. Walking spends no days or gold. Services appear after actual entry. Residents are located by settlement because the simulation does not record individual NPC rooms. |
| Dungeon | Current illustrated room, physical doorway controls, exact offered confirmation, room choices, supplies, party condition, objective and a collapsed discovered map. Authored, regional and radiant descents use the same presentation. Unknown contents remain hidden. |
| Bonds | Family, Friends, Acquaintances, Rivals, Everyone Met. Search and paging retain only evidenced acquaintances; reading a memory starts no conversation. Approach actual residents for portrait dialogue. |
| Inventory | Equipped portrait, ten slots, health/magic, actual carried equipment, supplies, materials and loot. Search and Type/Name/Rarity/Score/Value sorting are read-only. No merchant, sale, crafting pane or Compare-for build box. |
| Market | Actual merchant purchases and carried gear/loot sales. Quotes and stock remain engine-owned. Employment's market link opens the location list. |
| Journal | Quests, Life Records, Yearbook and unusual meetings. The separate quest destination and Chronicle label are removed; earlier bookmarks resolve to Journal. |

Health replaces Combat HP in headers, battle actors, character records, care
guidance and Inventory. Proper world, region and location names are capitalized
in rendered text without rewriting save identifiers, field values or historical
records. New adolescent/adult milestone scenes describe concrete shared moments
and their actual skill practice; callbacks quote the recorded earlier outcome.
Already-open scenes retain their captured wording and effects.

## Verification

New acceptance checks cover real settlement walking, market payment and stock,
equipping without duplication, inventory filters, every Bonds category, primary
navigation, School, the actual working-age handoff and continued education, place-name presentation and all three dungeon movement paths.
Creation checks exercise bounded allocation, exact attribute/resource deltas,
single application, malformed imports, old-save compatibility and the production
trait chooser. A reproduced Random-to-explicit ancestry bug is covered even when
the preview already shows that ancestry; returning to Random clears a restricted
origin, and live preview updates keep random heritage undisclosed. Audio checks cover pending/failed recordings, returning to the
menu and decoding while hidden. Earlier UI regressions now follow the requested
routes while retaining cost, time, stock, attendance, pending-scene and save
assertions. The legacy pack renderer remains a compatibility consumer, with no
duplicated trade offers.

The semantic DOM harness verifies delegated commands, connected focus, keyboard
activation, selection state and save effects. It does not measure CSS geometry,
real-device interaction, sound quality or screen-reader speech. Browser QA is
unavailable in this managed environment. The annotated screenshots were inspected
as evidence; no browser screenshots or human enjoyment claims are fabricated.

The rebuilt standalone has ten parts totaling 81,444,028 bytes. Concatenating
those parts exactly reproduces `artifacts/hearth-and-oath.html` (SHA-256
`8e150ba776c1a48a03cf6ddad4c3a11e1f136839d114a5cf71a4e8a901381b1e`).
All five post-build download checks pass. The build verifies the translated
module graph, all 190 portrait atlases, 64 transformation atlases and 15 original
recorded tracks. Original artwork and audio files are unchanged. Scrollbars and
new layouts retain the muted yellow-gray palette. Whitespace validation passes.

The complete 87-file release suite passed all 1,329 checks, with zero failures,
cancellations or skips. This includes 33 added checks: 20 interface/interaction,
nine creation/allocation and four recorded-audio startup checks. The final run
includes the reproduced same-ancestry selection repair and the actual three-slot
creation/resume/import flow. Existing tests retain their real engine, save, time,
stock, payment, attendance, relationship and pending-scene assertions.
Focus 15 remains unstarted.
