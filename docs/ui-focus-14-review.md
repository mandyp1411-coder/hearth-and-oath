# Focus 14 — interface reorganization and situated dialogue

This records the historical v0.25.14 implementation. Later feedback revises its
screen ownership; [the v0.27.0 world-first record](world-first-focus-14.md) is the
current specification.

## Working brief

Reorganize Hearth & Oath's entire playable interface around the decisions a
player is making. Give each system one recognizable home and each workspace
clear, named sections. Remove duplicate destinations, competing tiles, repeated
controls and unnecessary nested scrolling. Keep costs, consequences, blocked
states and the way back visible. Preserve the muted yellow-gray, bone, charcoal
and old-brass palette, existing artwork, saved lives and life-simulation focus.

Replace the People messaging surface with a book of evidenced acquaintances,
relationship status and shared memories. New conversations must be approached
through the person's actual settlement. Present them as a JRPG-style portrait,
spoken scene and deliberate response list. Reading a record must never start a
conversation, accept a task, mark correspondence read or grant a relationship
reward. Retain exact earlier words and unresolved saved responses. Record a
physical meeting's date and place only when an actual local dialogue starts.

Retain the original audit's keyboard inspection, focus restoration, selected
control semantics and help repairs. Verify navigation and meaningful actions
through production handlers and the existing engine. Rebuild the standalone
game and publish this as focus 14/15.

## Diagnosis

The following are design inferences from the source and the user's feedback,
not measured human satisfaction results:

- Feature additions were repeatedly appended beneath existing pages. Career,
  health, family, character and regional views mixed unrelated concerns in long
  runs of similarly weighted panels.
- Different systems used different card sizes, grids, spacing and headings.
  Recipes, notices, actions, contracts and records competed for attention.
- The existing full-window layout accumulated inner scroll containers. Some
  later systems relied on older fixed-height assumptions, increasing the risk
  of clipped or inaccessible content.
- Multiple names referred to the same place. Pack duplicated Gear & pack;
  help still used World and More while navigation had moved on.
- A global chat history made social encounters feel available from a menu
  rather than belonging to the world. Unmet contacts, ongoing dialogue, earlier
  words and relationship records were competing in one screen.
- Enter and Space committed map movement while a mouse click inspected it.
  New filters also destroyed their focused controls during rerendering.

## Comparisons and decisions

Primary sources were reviewed on 15 October 2026. These are pattern comparisons,
not a claim that Hearth & Oath has these games' production scope or usability.

| Reference | Verified pattern | Decision here |
| --- | --- | --- |
| [Final Fantasy XIV HUD guide](https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-name.html) | Distinct HUD duties; quest titles open records and objectives locate the world destination. | Separate records from commitments; keep map inspection and explicit departure distinct. |
| [Final Fantasy XIV basic controls](https://na.finalfantasyxiv.com/game_manual/operation/) | NPC interaction is a contextual world action; menu and inventory shortcuts have defined roles. | Approach a present person in Explore; retain dedicated navigation and keyboard routes. |
| [Baldur's Gate 3 interface update](https://baldursgate3.game/news/community-update-15-absolute-frenzy_49) | The developer describes a substantial HUD revision and more organized inventory and character interaction. | Consolidate equipment and expose one clearly selected subject instead of equally prominent competing panels. |
| [Baldur's Gate 3 Patch 6](https://baldursgate3.game/news/patch-6-now-live_108) | Party inventory is available in one trade interface; readable text size is configurable. | Keep one Gear & pack destination, preserve reading settings, and keep purchase terms attached to their actual offers. |
| [Persona 3 Reload official site](https://asia.sega.com/p3r/en/) | A social-life and RPG structure with developed dorm life and Social Links. | Keep daily life central; give relationships a remembered record and use situated portrait dialogue for encounters. |

The choices in the right column are our design conclusions. The sources do not
establish that the new implementation is more enjoyable, balanced, or accessible
to a specific person.

## Screen ownership

All 17 destinations remain reachable from All views. The primary rail and mobile
navigation each contain one inventory destination. Bonds is the short navigation
name for the Bonds & memories record book.

| Workspace | Organization |
| --- | --- |
| Life | Today, Your years, Plans & promises; one active situation, recent lived events and actual surroundings. |
| Activities | Daily life, Pastimes, Hearth & callings; daily actions have subject filters and consistent rows. |
| Home & education | Household, Education, Family records. |
| Work & community | Livelihood, Commissions, Your workplace, Community works, Neighbors & circles, Work remembered. |
| Health & needs | Current needs, Symptoms, Care options, Recovery plan, Living with a curse, Care record. |
| Family & legacy | Family, Children, Adoption, Succession, Earlier generations. |
| Skills & callings | Identity, Skills & training, Personality & tastes, Callings, Supernatural. |
| Party | Traveling party, Readiness, Companion promises. |
| Gear & pack | Loadout, Gear bag, Merchant, Crafting, Relics; explicit filters and collapsed item inspection/comparison. |
| Craft & build | Workbench, Gathering, Homes & buildings, Equipment designs, Craft record. |
| Explore | Country, actual settlement rooms, dungeon layers; inspect a point before an explicit commitment. |
| Quest journal | Main, Side, Miscellaneous, Radiant, Archive; accepted work stays distinct from invitations. |
| Contracts & delves | Contract board, Delves & fieldwork, Preparation, Recovered loot. |
| Laws & faiths | Local law and cases, Faith & practices, Orders & councils, Regions, War & change. |
| Lore & discoveries | Culture & heritage, Histories, Rumors & leads, Field notes. |
| Chronicle | Remembered moments, Yearbook, Unusual meetings. |
| Bonds & memories | Bounded/searchable evidenced acquaintances, a selected person's relationship, known tastes, memories, actual meeting record and earlier words. |

The shared presentation also covers battle commands, scene responses, the
all-views drawer and game settings. Existing title and creation flows retain
their deliberate artwork; menu/control terminology and reading behavior stay
consistent with the playable interface.

## Social boundaries and compatibility

- Nearby lists describe the actual **settlement**, because existing NPC data
  does not place every person in a particular room. No fictional room placement
  or guaranteed traveler spawn is invented. Local search and paging reach all
  present residents, including people beyond the first eight, without recording
  an introduction.
- Records include actual meetings, established family ties, recruited companions,
  earned memories, participated story accounts, met teachers and earlier saved
  exchanges. A generated but unencountered world roster is not an address book.
- Local dialogue uses the actual offered talk/topic IDs and captured response
  choices. A new remote talk attempt through the production UI returns to the
  relationship record without opening a thread or spending anything. The tavern
  no longer exposes obsolete remote-letter commands. A selected encounter owns
  the full reading surface, with focus moving to its speaker and returning to
  the local residents on leaving; it is not compressed beside the settlement map.
- Earlier remote pending exchanges remain resolvable with their original reply
  IDs, words and effects. The underlying legacy correspondence APIs remain
  compatible; they are not exposed as a new remote-chat interface.
- New local meetings store a bounded person/place/date account. Older records
  without it explicitly keep their date or exact meeting point unrecorded.
- Restoring a harmed relationship remains actual work at its recorded site.
  The record links to the work workspace; reviewing it accepts nothing.
- Companion links distinguish speaking with someone present, reading an existing
  relationship record and locating an unmet remote person. A paused older descent
  still exposes its real Continue and withdrawal commands from Life, independently
  of Life's section names.

## Verification boundaries

The semantic DOM harness now models replaced controls losing focus, SVG
interaction targets, selectors containing coordinate commas, text content,
root/document keyboard bubbling and native button activation. Its geometry is
still deliberately absent. It exercises real production handlers, not a second
implementation of the game's rules.

The checks cover every workspace section, focus and selection, map inspection,
actual confirmed moves, blocked and stale routes, direct local dialogue,
read-only relationship records, remote-start refusal and meeting import bounds.
All 17 destinations are also visited at birth, age three and age twelve without
changing the life or granting adult eligibility. Resident paging and an empty
search preserve the life and saved slots; returning clears the old local search.
Existing save, calendar, combat, education, care, economy and social regression
checks remain required.

Browser layout, contrast, physical keyboard navigation and screen-reader speech
could not be directly checked in this environment. Responsive CSS and semantic
checks do not replace those forms of testing. No human survey, new audited lives
or guaranteed satisfaction score is claimed.
