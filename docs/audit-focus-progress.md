# Audit improvement progress

Work proceeds one category at a time. The completed 50-reviewer audit describes
AI reviews of automated lives, not recruited human playtesters. The existing
muted yellow-gray, bone, charcoal and subdued brass presentation remains a
requirement. New personal stories remain short and optional.

| Focus | Category | Implementation status |
| --- | --- | --- |
| 1/15 | Reliability and saves | Implemented in v0.25.1; SAFE-01 and SAFE-02 |
| 2/15 | Quest discovery and records | Implemented in v0.25.2; QUEST-01 through QUEST-07 |
| 3/15 | Story continuity and roleplay | Implemented in v0.25.3; STORY-01 through STORY-06 |
| 4/15 | People, dialogue and companions | Implemented in v0.25.4; SOCIAL-01 through SOCIAL-05 |
| 5/15 | Combat and build decisions | Implemented in v0.25.5; FIGHT-01 through FIGHT-09 |
| 6/15 | Gear, loot and inventory | Implemented in v0.25.6; GEAR-01 and GEAR-02 |
| 7/15 | Dungeon structure and rewards | Implemented in v0.25.7; DUNGEON-01 through DUNGEON-04 |
| 8/15 | Explore, settlements and routes | Implemented in v0.25.8; TRAVEL-01 through TRAVEL-06 |
| 9/15 | Economy, workshops and careers | Implemented in v0.25.9; CRAFT-01 through CRAFT-07 |
| 10/15 | Growing up and education | Implemented in v0.25.10; GROW-01 through GROW-06 |
| 11/15 | World consequences, law and community | Implemented in v0.25.11; WORLD-01 through WORLD-07 |
| 12/15 | Health, time and recovery | Implemented in v0.25.12; HEALTH-01 through HEALTH-03 |
| 13/15 | Rare supernatural discovery | Implemented in v0.25.13; CURSE-01 through CURSE-03 |
| 14/15 | Menus, keyboard and accessibility structure | Implemented in v0.25.14; revised through v0.27.0 and expanded in v0.28.0. The v0.29.0 map overhaul replaces tiled art with carried paper charts. v0.30.0 adds coherent cultural territories, reachable governments and courts, autonomous wars and hostile holds, regional lore and a larger new-world atlas with saved stepwise routes, preserving existing countries and crossings. v0.31.0 replaces the Explore workspace with named destinations and simple journeys, repairs offsite travel and removes visible hex controls and chart-sheet layers. v0.32.0 repairs creation, adds ancestry-exclusive beginnings and automatic unspent points, and simplifies Activities and contextual exploration in response to the annotated review. v0.33.0 restores the inline map and double-click travel, repairs local-service and school shortcuts, adds situated innkeeper barter/rooms/quest rumors, and removes the unsolicited fate prompt. v0.33.1 adds wheel zoom with fading region titles and two map icons, moves all merchant access into People Here, adds specialist merchants and expands stress-relieving leisure. v0.33.2 replaces destination double-click departure with hover, single-click route review and explicit journey confirmation, and adds one-day home rest from Recovery for a locally owned home. v0.34.0 adds 878 grounded people portraits with aging at 40 and 55 across all eight ancestries, 128 item illustrations, 384 enemy paintings and 40 terrain-aware species; it replaces three inconsistent transformation sheets and standardizes creature label capitalization. v0.35.0 unifies situated service and Activities choices, adds reviewed saved-life deletion and a real-event notification inbox, replaces the generic adulthood card with the daily record, and expands every ancestry’s age portraits with enforced grayscale. UI-01 through UI-03 plus the requested navigation, creation, inventory, world and dungeon restructuring |
| 15/15 | Replay variation and legacy | Not started |

## Focus 1: Reliability and saves

SAFE-01: Enemy ward transfers now read and subtract a finite, nonnegative amount
from a living donor. Missing or exhausted ward transfers zero. The recipient
retains the existing 40-point ward cap, and the charge reflects the actual
transfer. Existing encounter rewards, difficulty and valid transfer amounts
are preserved.

SAFE-02: The app validates a computed result before adopting it or changing
the active position. Rejected results leave the current life, saved slots,
backup and save timestamps untouched. A dialog explains the rejection and
offers keeping the current position, reloading or exporting the protected
position, and reviewing an existing slot backup before replacing anything.
Valid play can still continue and be exported if browser storage is full.

The recovery dialog uses existing modal and button styles. No color, portrait,
artwork, quest content or other audited system was revised in this focus.
Publication is recorded by the canonical Sites saved-version/deployment receipt.

## Verification

`tests/reliability.test.js` covers missing/zero/partial ward, living and dead
donors, the ward cap, all 48 enemy cadences with an unwarded ally, a real
aberration formation that transfers before any donor gains ward, per-action
save/reload, single reward resolution, invalid numeric resources, rejected
result UI recovery, protected exports, neighbor slots, explicit backup review
and browser-storage failure. These are controlled regression fixtures, not
additional counted lives or evidence of combat balance.

Production delegated handlers are exercised by the semantic DOM test harness;
it does not measure browser layout or device performance. Run the project test
suite and rebuild the complete offline game before publishing. Hosted and
offline games contain the same repair.

Focus 1 verification: the complete suite passed 826 tests across 71 files,
with no failures, cancellations or skips, using four workers. The offline
distribution rebuilt successfully at v0.25.1.

## Focus 2: Quest discovery and records

- QUEST-01: A compact invitation preview has a complete browse route, named
  people, location and one-line stakes. Decline or reconsider any invitation
  without starting an arc or accepting another offer.
- QUEST-02: Completed and abandoned radiant work stores its objective, named
  client, proof, payment, date and encounter attempts before board refresh.
  Archived IDs cannot be offered or paid again. Earlier receipts with unknown
  closing dates stay explicitly undated; missing old records are not invented.
- QUEST-03: Completed and abandoned personal stories open their exact saved
  choices, outcomes, fees, rewards and workdays. New arcs remain three chapters;
  saved five-chapter arcs keep all five decisions.
- QUEST-04: One optional tracker covers main, side, personal and radiant work.
  Pause/resume preserves proof, choices and return dates; clearing the tracker
  accepts or abandons nothing. Pausing cannot bypass a committed chapter.
- QUEST-05: Objective commands display existing time, fee and living-cost
  previews. Road travel and subsequent choices remain separate commitments.
- QUEST-06: Saved returning chapters appear in the birthday forecast and
  journal calendar, including the last choice and pause/resume controls.
  These are reminders, not forced scenes or acceptance.
- QUEST-07: Voluntary retirement reviews accepted unfinished accounts and
  records the decision to leave them. Completed, abandoned, paused, missed and
  never-accepted accounts remain distinct. Older pending retirement/homecoming
  choices get a read-only review without rewriting their saved scene. Natural
  closure records that life ended rather than inventing a retirement choice.

The original muted styles and artwork are retained. Story consequences,
combat balance, dungeon generation, economy and NPC voice revisions remain
separate future focuses. `tests/quest-records.test.js` exercises the acceptance
paths, legacy records, public actions, import rejection and production journal
handlers. Semantic DOM checks do not claim rendered-browser validation.

Focus 2 verification: all 842 tests across 72 files passed with no failures,
cancellations or skips, using four workers. After the execution session reset,
the first 66 files retained 767 passing results, including all 16 new quest
tests; the remaining six files were rerun to capture their 75 passing results.
The offline distribution rebuilt successfully at v0.25.2. Browser layout QA
was unavailable in this environment.


## Focus 3: Story continuity and roleplay

- STORY-01: New return scenes read saved deeds and their outcomes. Unpaid work,
  credit theft, suppression and archive exclusion remain distinct; a completed
  correction or wage settlement remains a repair in the later record.
- STORY-02: New games keep three short chapters. The atlas, workbench and door
  returns each introduce a new constraint and new work. The other authored
  three-chapter sequences retain their distinct situations and outcomes.
- STORY-03: Authored schedules across the 24 story families vary actual days,
  fees and proceeds. Honest commissions can pay; pressure can cost money and
  time. Bounded care and independent work retain their stated limits.
- STORY-04: Proposals capture their terms before commitment. Receipts show actual
  trust and standing changes, including the hero's cost for a public correction.
  A zero-day interruption takes no fee; an attended fee is reserved once before
  living expenses. Campaign preparation is explicitly a pledge of existing
  rooms, crews and reserves, rather than instant new construction. Professional
  preparations continue to consume their actual supplies.
- STORY-05: Returning chapters identify a local meeting, correspondence, a
  remembered account or the keepers of a deceased participant's record. Hands-on
  inspections and repairs require the recorded site; deferring retains the
  proposal without time, payment or reward. Other agreements support letters.
  Ordinary distant conversations use written framing and preserve their replies.
- STORY-06: Peaceful dungeon previews separately identify the inhabitant's
  account, examined evidence, practical aid and judgment or trusted support.
  Recovering cache supplies/background records does not create examined
  testimony. Recorded sources are named only after visiting them, and unknown
  exits use perceptible clues while keeping their undiscovered room names hidden.

Compatibility: saved five-chapter arcs remain five chapters. Existing pending
words and begun commitments retain their original work schedule and payment;
new proposals, including returns in older arcs, capture their newly quoted terms.
Past saved decisions are not recomputed. The older vampire/hunger/story fixture
is part of regression coverage. The original artwork, colors and spatial rules
are retained; the new information uses existing muted text and panels.

Focused verification exercises production engine actions, export/reload,
malformed-save rejection, exact grievances, corrections, proof and aid earned
through actual dungeon choices, deferred attendance and delegated UI handlers.
Controlled prior employment and position fixtures are not additional audit
lives. The audit remains AI reviews of automated lives. Semantic DOM tests do
not establish rendered layout or device performance; browser layout QA was
unavailable in this environment.

Focus 3 verification: all 860 distinct automated checks across 73 files passed.
After the execution session was interrupted, 577 passing results were retained;
the remaining 23 files passed in a resumed run. That run also rechecked all 47
legacy dungeon checks after a compatibility-only cache-hint correction, for
330 passing checks in the resumed run and no failures, cancellations or skips.
The complete offline distribution rebuilt successfully at v0.25.3. These are
automated regression checks, not additional human playtests or audited lives.

## Focus 4: People, dialogue and companions

- SOCIAL-01: Six companions and the core caregiver, friend, rival and courtship
  contacts have authored concerns and their own questions, answers and limits.
  Manner follows their recorded disposition. Actual personal decisions, their
  independent work, relationship state and witnessed remedies change later
  conversations. Ordinary company creates no quest or automatic agreement.
- SOCIAL-02: Familiarity remains separate from a specific unresolved harm.
  Visits, gifts and pleasant replies cannot buy a new courtship or household
  pledge while that account stands. A visible remedy quotes attended days,
  payment and a particular correction, repayment or release of control. Fees
  reserve once; interrupted work resumes and unfinished work grants no remedy.
  The old decision remains in its archive. After a separately recorded remedy,
  two real days and a direct conversation are needed before another agreement
  can be proposed; affection and forgiveness are not awarded for paying.
- SOCIAL-04: A companion's own witnessed personal-story harm stops active
  travel and appears in conversation and party controls. A later gift or generic
  caring decision does not erase that account. An attended remedy and their
  subsequent answer permit a new invitation, without resetting trust, respect,
  fear, departure, mortality or the existing unwilling-binding rule.
- SOCIAL-03: Recruitment and introductions state active versus reserve status
  and the three-companion limit. Full parties recruit into reserves. People and
  Party have explicit routes to each other; reserve activation still needs a
  free slot and the companion's own availability.
- SOCIAL-05: The healer/clinic keeper, veteran/watchkeeper and bard have accurate
  labels and distinct updates tied to their recorded personal chapters. Other
  contacts retain their existing seeded voice framework and age rules.

New conversation snapshots retain their exact replies on reload. Older voice
snapshots and pending story proposals keep their words; an older pending pledge
shows its present boundary without rewriting the saved scene. Repair receipts
and unfinished work validate their named source account, actual schedule,
payment and dates. Lost/private records are never invented during migration.

The existing muted yellow-gray palette, portraits and panel styles are retained.
`tests/people-focus.test.js` covers distinct voices, relevant returns, privacy,
high-bond unresolved harms, concrete remedies, birthday interruptions, zero-day
refunds, partial cancellation, party boundaries, reserves, malformed imports,
legacy replies and production delegated UI handlers. Position, affordability
and prior relationship fixtures are controlled regressions, not new audit lives.
Semantic DOM checks do not establish rendered layout; browser layout QA remains
unavailable in this environment.

Focus 4 verification: the complete suite exercised 880 checks across 74 files.
The initial run passed 879; one older assertion recognized only prior dialogue
node formats. Its accepted ordinary-scene formats now include the new concern
scene while keeping the original reload and quest-isolation checks. After that
correction and final remedy-card quote metadata, all 104 focused checks across
seven affected files passed, including the entire corrected file and all 20 new
people checks. Combined coverage has 880 distinct passing checks and no
unresolved failures. The complete offline game rebuilt successfully at v0.25.4.


## Focus 5: Combat and build decisions

- FIGHT-01: Optional encounter previews show solo/party size, allied and enemy
  actions per full round, a four-band danger estimate and preparation/withdrawal
  guidance. They appear on road/free-adventure offers, unresolved dungeon
  encounters and the battle screen. Estimates disclose their limits. New
  perilous named-guardian and high-tier encounters receive 45% more enemy health;
  the increase is fixed by encounter and difficulty, never party size or build.
  Captured battles retain their saved actors. The Party page now exposes its
  existing preparation summary, including injured companions and supplies.
- FIGHT-02: Each command shows the immediate effect on its selected enemy or
  support target, with cost, damage, actual healing, ward changes, cleanses,
  applied/resisted conditions and unavailable reasons. A detached snapshot runs
  the same command resolver as actual combat; previews spend no resource and
  advance no turns. They explicitly exclude later turn effects and enemy replies.
- FIGHT-03: Character keeps uncapped life attributes/skills and places their
  effective combat values beside them. An expandable explanation gives the
  diminishing conversion, 36-point cap, actual attack/spell power and armor,
  and each skill's contribution or unlock role. Gear applies after conversion.
- FIGHT-04: Defeat shows the existing loss and recovery terms, a short reason
  grounded in the captured battle, and a useful next step. Solo civilians are
  pointed toward health/magic recovery, willing companions, negotiated passage
  or another route. The journal retains the guidance; resolving the same battle
  still cannot pay or penalize twice. Curse hunts keep their separate terms.
- FIGHT-05: Proof, route repair, safe passage, practical aid and completed
  peaceful objectives show the specific progress actually earned. Their notice
  and journal receipt distinguish that progress from combat gold/experience;
  cache supplies remain their separately earned result. No fighting requirement
  or additional repeatable reward was introduced.
- FIGHT-06: Advanced elemental/druid/grave attacks scale from intellect, arcana
  and magic gear. Advanced sacred attacks and healing use willpower/devotion
  and magic. Physical weapon investment cannot substitute for those sources.
  Physical techniques keep their physical scaling.
- FIGHT-07: Ordinary spells, class abilities, advanced techniques and enemy
  plans share a status-application contract. Declared burn/poison/bleed/fear
  and other condition resistances block those conditions; bloodless targets
  reject bleeding and poison. Enemy study reveals the relevant resistance.
  Elemental damage resistance is distinct from status resistance. Imports
  validate declared resistance and seal fields while accepting older omissions.
- FIGHT-08: Staff/wand disruption removes its disclosed ward, weakens the next
  strike and cancels prepared charge/stolen power. Enemy intent refreshes after
  the counter and explains when an uncharged physical strike can still occur.
- FIGHT-09: A seal remains through the affected actor's next real decision and
  expires only after an accepted alternative command. Rejected commands and
  another companion's action do not consume it. The last damaging command now
  includes spells; harmless setup does not replace it. One-action silence also
  ends after the affected actor acts.

The original portraits and art remain in use. New command notes and risk cues
use the established muted bone, charcoal and subdued brass colors. The life
simulation, story length and later audit categories retain their existing scope.

Focus 5 verification: 24 focused regression tests exercise isolated caster
investment, actual enemy sealing, status-resistant targets, charge interruption,
shared previews, life-skill conversion, public save/recovery paths, peaceful
progress and delegated support-target controls. A separate deterministic policy
ran 54 controlled combat scenarios: three builds, three difficulties, solo/full
parties and three encounter types. These are QA fixtures, not additional audit
lives or human playtests. All scenarios terminated; perilous guardian cases took
2–9 rounds, with full parties taking 2–4 rounds. The full suite and offline
build are checked before publication. Browser layout QA is unavailable in this
managed Linux environment; semantic DOM tests do not measure visual layout.


Focus 5 final verification: the complete 75-file run executed 904 checks: 902
passed and two exposed lost negotiation context in the new progress receipt.
After retaining the actual companion memory and completed formation in that
receipt, all 116 checks in the affected six-file group passed. This restores
coverage of all 904 checks; it is not a claim of a second complete-suite run.
No unresolved failures, skips or cancellations remain. The offline distribution
rebuilt successfully at v0.25.5, and whitespace validation passed.


## Focus 6: Gear, loot and inventory

- GEAR-01: Bag, merchant and settlement purchase offers compare the actual
  prospective equip/unequip operation on detached equipment. Previews name the
  affected logical slot and displaced piece, show full loadout stat changes,
  and disclose set counts and three/five-piece thresholds gained or lost.
  Expand the details for all four totals, item-score totals and effective
  weapon/arcane/sacred power, armor and initiative. The score remains a summary
  of piece stats; set bonuses are included in the separate equipment totals.
  Buying grants ownership and consumes real stock/gold without auto-equipping.
  Previewing spends nothing and leaves the life and any captured battle intact.
  Legacy cloak/shield positions follow the existing relocation rules rather
  than pretending that body armor or an amulet discards those older pieces.
- GEAR-02: Three additional recovered-gear affixes have equal score contribution
  and real costs: Striker adds attack while losing armor, Channeler adds spell
  power while losing armor, and Bastion adds armor while losing attack. They
  combine across the existing ten slots and have separate additive three- and
  five-piece rewards with disclosed costs. The original four affixes and their
  saved pieces retain their exact bonuses and original three-piece rule.
  Future deterministic drops can roll all seven families; claimed sources do
  not reroll. Common pieces grant no affix or set effect. All values derive
  from canonical item/affix data, never edited instance bonus fields.

Pack provides optional weapon, spell and protection preferences. They rank
prospective bag changes and explain the tradeoff; they add no character bonus.
The selected goal, slot filter and bag pane resume with that life’s workspace.
Effective armor remains at least zero when a piece gives up protection, and
battle numeric validation accepts the legitimate high-stat ten-slot loadouts.
Base attributes, skills and saved combatants are not rewritten by equipment
previews. The original item art and muted bone/charcoal/brass presentation remain.

A matched three-piece example (rare roundshield, helm and leather body armor,
tier 3) demonstrates why the same gear score is not the same build:

| Affix family | Item gear score | Attack | Armor | Spell power | Initiative |
| --- | --- | --- | --- | --- | --- |
| Striker | 67 | +12 | +7 | 0 | 0 |
| Channeler | 67 | 0 | +7 | +12 | 0 |
| Bastion | 67 | -8 | +19 | 0 | 0 |

The four stat columns include the earned three-piece bonus; item score excludes
set bonuses. These are controlled fixtures, not items granted to a played life.

Focus 6 verification uses 25 focused tests for actual stat/threshold changes,
matched-score build preferences and real combat effects, old-save positions,
maximum legitimate loadouts, no mutation during preview, finite purchases,
new-drop variety, source deduplication, bag capacity, saved battle protection,
and delegated Pack/settlement purchase controls. The full regression suite and
offline build are checked before publication. Semantic DOM tests cover handlers
and markup structure; browser layout QA is unavailable in this environment.


Focus 6 final verification: the complete 76-file regression run passed all 929
checks, with no failures, cancellations or skips and unchanged tested inputs.
All 25 new gear-focus tests passed. The matched-score fixture was independently
recomputed from canonical gear data and reproduced the table above. The full
offline distribution rebuilt successfully at v0.25.6, and whitespace validation
passed. Browser layout QA remained unavailable; semantic DOM coverage does not
claim device geometry or rendering performance.


## Focus 7: Dungeon structure and rewards

- DUNGEON-01: Newly entered repeatable descents save six small branching floor
  maps. Three route patterns, changing room functions and recovery, route-survey
  or water-gate repair objectives give different paths and reasons to return.
  Studied landmarks and repaired crossings also enable peaceful field work on
  their own floor. An unresolved room permits backing away through a visited
  doorway, so its missing preparation can actually be obtained. The chart
  reveals visited rooms and currently visible doors, and supports inspection,
  double-click and keyboard movement through the actual offered route choices.
- DUNGEON-02: Entry, each first visit to a lower floor, a provisioned camp and
  a peaceful field agreement use real rations. Camps use one attended day and
  restore limited health/magic only to living travelers, once per room. Depths
  already supplied charge no second ration. Free withdrawal always retains
  earned belongings. Only actual completed recovery, two independent landmark
  observations or a material repair creates the stated objective proof; bringing
  it outside grants its disclosed gold and field experience once. Unfinished
  objectives pay nothing. Used coffers and resolved encounters do not reset.
- DUNGEON-03: Unknown doors in repeatable and regional signature maps show a
  direction and physical feature. Action labels, chart labels, accessible names
  and inspection agree without naming an undiscovered cache, enemy or boss.
  Chart connections to an unvisited door remain visible from either direction.
- DUNGEON-04: Repeatable descent stealth, survival and field agreements show raw
  skills, the relevant half attribute, their combined total and threshold. Notes
  identify missing local landmarks/repairs and real ration/material costs.
  Regional survey, repair and ordinary guardian agreements show current skills,
  supplies, gold and the missing side-ledger work. Existing authored campaign
  dungeon routes, boss negotiation checklists and reward rules are retained.

Current unversioned descent saves keep their original pending scene and linear
progression, including their original stair ration rule; new maps are not
injected into an ongoing old run. New route charts regenerate canonically for
validation, with bounded, unique room records and consistent provision/proof
receipts. Paid room work preserves calendar needs; a completed landmark day at
an unreviewed birthday retains its evidence and presents the birthday first.
The original illustrations and muted yellow-gray parchment, bone, charcoal and
subdued brass styling remain in use. This focus does not expand story length.

Focus 7 verification adds 32 focused regressions for connected route variation,
all three actual objective methods and once-only return payments, supplies,
backtracking, finite caches, inventory capacity, actual combat victory/retreat,
peaceful requirements, birthday/zero-day interruptions, malformed saves, old
stair saves, pure read views and delegated production chart controls. The older
six-floor regression now follows offered branch choices instead of assuming
that every entrance is an immediate room encounter. These are controlled QA
fixtures, not additional audit lives or human playtests. The full regression
suite and offline distribution are checked before publication. Browser layout
QA remains unavailable; semantic DOM checks cover markup and handlers without
claiming rendered geometry or performance.


Focus 7 final verification: the complete 77-file regression run passed all 961
checks, with no failures, cancellations or skips and unchanged tested inputs.
All 32 focused dungeon tests passed. The complete offline distribution rebuilt
successfully at v0.25.7, and whitespace validation passed. Browser layout QA
remained unavailable; the production controls were exercised through semantic
DOM handlers, without claiming device geometry or rendering performance.


## Focus 8: Explore, settlements and routes

- TRAVEL-01: The selected destination in Explore now contains the actual road
  preparation form: pace, paid provisions, scouting, escort and night travel.
  Saving updates the route quotations without spending time, stock, rations or
  gold. Unsaved preparation edits disable departure until the quotes refresh.
  The departure button explicitly says it departs. Current commitments
  lock preparation changes. Per-leg details retain current safeguards and the
  existing household-cost preview beside the selected route.
- TRAVEL-02: Explore displays the saved destination, completed and remaining
  planned road days, checked legs, already committed fee and any unfinished
  response attendance. This context remains visible during road/calendar
  decisions. The real Continue action appears in Explore after the decision,
  uses the same saved journey and charges neither a second departure fee nor
  a repeated encounter on its checked leg.
- TRAVEL-03: Compare shortest planned time, least accumulated road exposure and
  lowest actual preparation fee over the open road graph. The chosen preference
  persists for future departures. Routing uses the real pace-adjusted leg time,
  per-leg risk and actual supplies/escort formula, including rounded supply
  fees. Each quote distinguishes highest leg danger from summed exposure points
  and the number of checks; it makes no whole-journey probability claim.
  When road choices coincide, the interface states that this can happen.
- TRAVEL-04: Explicitly hearing road accounts again appends a bounded, dated
  source record while preserving the original account and its uncertainty.
  A rumor cannot promote a location to a visit or overwrite an observed civic
  condition. Passive synchronization creates no new hearing. Explore presents
  the latest report and the source history separately from field observations.
- TRAVEL-05: Towns have a separate work yard, regional centers a civic hall,
  and scarred market lanes use a changed connection and repair yard. Completed
  road/refuge institutions appear as wayhouses with their actual funded or
  paused service. Their controls use existing paid work and charters. Walking
  costs no days, shops retain their stock, private homes retain their boundary,
  and lost settlements grant no operating rooms. Civic changes use stable entry
  and exit thresholds and create a dated local record only on an actual phase
  transition. Decline describes the public space that closes; it does not repeat
  a growth announcement. A room that ceases to exist safely returns to the gate.
- TRAVEL-06: Newly encountered road scenes retain the actual season, weather,
  route and any relevant earlier resolved account. Weather choices describe
  the current exposed stretch instead of always inventing a cold squall.
  Later local encounters can quote the player’s dated road journal and its
  earlier named participant without assigning that memory to a new traveler.
  Actual choices, completed response attendance and combat results create the
  receipt once; hearing a previous account grants no second reward.

Old pending road scenes retain their exact saved words. Existing committed
journeys keep their route, leg days, risks and fees; future preference changes
cannot reprice them. Old saves without report or road-memory records are not
assigned invented observations. Optional new records validate their dates,
local source, outcome and retained history.

Three new original settlement illustrations depict the repair yard, civic hall
and wayhouse in muted yellow-gray, bone, charcoal and subdued brass. The atlas
is `dist/art/settlement-atlas-v258.webp`; its final image-generation prompt and
asset provenance are in `reference-art/settlement-v258/README.md`. Original
portraits and area images remain. The life simulation, optional short stories
and later audit categories retain their scope.

Focus 8 verification adds 38 controlled regressions for route optimality against
exhaustive alternatives, supply rounding, real fees, closed roads, saved journeys,
free and interrupted responses, report uncertainty and malformed imports, civic
spaces and connections, actual funded wayhouses, stable development notices,
local weather and named road memory, and production form/double-click/Continue
handlers. The semantic DOM fixture now submits generic forms through their
successful controls as well as character creation forms. These are controlled
QA fixtures, not additional audit lives or human playtests. The complete suite
and offline distribution are checked before publication. Browser layout QA is
unavailable in managed Linux; semantic checks do not measure device geometry.


Focus 8 final verification: the complete 78-file run executed 999 checks with
unchanged tested inputs: 998 passed and one exposed an older archive-search
fixture that supplies plain form controls without DOM methods. After making
the harness's fieldset lookup optional, all 55 checks in the affected three-file
form group passed, including all 38 new exploration tests and the previously
failing archive-search check. This covers all 999 distinct checks; it is not a
claim of a second complete-suite run. Hash comparison confirms that the only
changed tested input between runs was `tests/helpers/ui-surface.mjs`; game
source remained identical. No unresolved failures, cancellations or skips
remain. The complete offline distribution rebuilt successfully at v0.25.8 and
whitespace validation passed. Browser layout QA remained unavailable.


## Focus 9: Economy, workshops and careers

- CRAFT-01: One sale-price function now drives item cards, individual sales,
  basket receipts and budget forecasts. Ordinary designs keep their 45% terms;
  found uncommon/rare/epic/legendary equipment returns 50/55/60/65% of its
  current value. Crafted finishes retain 45% terms. Ordinary civilian wages,
  household upkeep and stolen-property terms are preserved. The Career savings
  planner compares ordinary Age up with a dedicated work year as alternative
  schedules, subtracts actual household costs and already-accrued bills, and
  shows how currently owned, unequipped belongings could reduce a chosen goal's
  funding gap. It quotes a new three-slot artisan kit and the existing funded
  commons, wayhouse, learning hall and archive. Existing community milestones,
  paid supplies, reserves, services and voluntary maintenance remain the real
  commitments; opening or selecting a forecast pays nothing. Cooperative pack
  rounding, spare materials, workdays, maintenance and excluded sourcing/travel
  costs are disclosed. Remote or closed sites do not advertise executable local
  trade. A paid community goal follows its recorded site when you travel, and a
  full operating reserve is not presented as another available contribution. Teenage paid work and closed lives have distinct forecasts.
- CRAFT-02: Workshop filters use all ten canonical equipment slots and their
  existing Pack names: main hand, off hand, head, body, hands, feet, cloak, belt,
  amulet and ring. The standard design and chosen artisan finish share those
  filters, including older lives' existing slot mappings.
- CRAFT-03: Continuation advice recognizes paid Workshop and community-stage
  commitments. It reports reserved fees/materials, remaining days and the real
  site, with zero new-input shortfall. Uncommitted community stages compare only
  that stage's needs with the actual bag. Cancelling still forfeits committed
  supplies; a return-route preview grants no work, transport or refund.
- CRAFT-04: Equipment and commission previews reconcile ingredients at shared
  cooperative replacement prices, upfront fees, actual workdays, living-cost
  accrual, quality and merchant or honest-delivery receipt. Cash after fees and
  the net after valuing owned inputs are distinguished. Commission methods show
  late-payment effects and their quality threshold before starting; operating
  weeks also disclose an expected net after staff/supply and household costs.
  A current merchant quote is distinguished from an indicative remote quote.
- CRAFT-05: Earned crafting 3 and a tier 2 bench unlock study of Duelist,
  Arcanist, Vanguard and Wayfarer equipment patterns. Each costs 120 gold and
  five actual study days once. A finished piece consumes its standard recipe
  plus two crystals, one cloth, 120 extra gold and two extra workdays. It is
  individually recorded sound/uncommon gear: +1 principal stat and the selected
  classic +1 affix, with the existing three-piece bonus. It cannot roll rare
  quality, stronger drop-only patterns or high-depth bonuses. Recipes with
  higher original skill/bench requirements keep them. Gear is not automatically
  equipped. Study and making preserve quoted resources and remaining days
  through interruption/reload; abandoned work awards nothing. The existing
  120-instance limit includes these pieces. Successors inherit equipment and
  physical property, while learning their own craft and patterns.
- CRAFT-06: Newly accepted commissions record versioned quality terms. Meeting
  target +18 earns a disclosed 20% premium for honest or affordable community
  delivery, after the existing late/community reductions. Above that threshold
  gives no further payment; concealing quality earns no exceptional premium.
  Existing unversioned accepted commissions and already-open invoice scenes keep
  their original payment rule. Completing an invoice still clears its promise
  and pays once.
- CRAFT-07: Newly queued modern professional reviews capture mastery, guild
  rank, chosen specialty, actual dependent children, a nearby unresolved
  deadline, unreviewed failed promises, recent work and the previous review.
  Early, established and master responsibilities have different disclosed
  tradeoffs; masters direct access, working limits and shared authorship rather
  than repeat unchanged beginner instruction. Each profession names its own
  work. Practitioner mastery also permits a professional focus: Precision adds
  four quality to future accepted commissions; Community adds two reputation
  to honestly priced community deliveries. Switching focus does not renegotiate
  an accepted contract or select an adventuring class. Old pending reviews keep
  their saved scene and original 25-gold premium-contract rule. New review
  snapshots and outcomes survive reload; inherited careers start fresh.

`tests/economy-focus.test.js` covers these acceptance paths using controlled
accounting fixtures, production commands and delegated UI handlers. The existing
successor test also checks that learned craft patterns do not become a child's
skill. The sample household comparisons cover ordinary labor, smithing, trade
and healing, with current income/upkeep and a real quoted loot contribution.
They are deterministic budget checks, not additional audited lives, human
surveys or evidence of long-term balance. The established styles, original
artwork and portraits are retained. Browser layout QA is unavailable in this
managed environment; semantic DOM checks do not measure layout or performance.

Focus 9 verification: the complete regression suite passed all 1,041 checks
across 79 files, with no failures, cancellations or skips and unchanged tested
inputs. The final read-only savings-planner refinement then corrected the
recorded site of an already-paid project and the cap on protected contributions;
all 44 focus tests passed after that refinement, including its two new cases.
Only `economy-planning.js` and the focus test file changed after the full run.
There are 1,043 distinct covered checks and no unresolved failures; this does
not claim a second full-suite run. The complete offline distribution rebuilt
successfully at v0.25.9 after the final refinement. Source and native publication
receipts identify the packaged release. Browser layout QA remains unavailable.

## Focus 10: Growing up and education

- GROW-01: At ages three to five, two shared stories and counting sessions with
  an actual living adult nearby can support the learning focus. Each session
  takes two days, gives scholarship and uses an existing annual activity limit;
  it grants no school attendance or qualification. Before choosing a focus, the
  activity explains the 180 actual focus days and the two required sessions.
  From six onward, learning requires two actually attended school lessons.
  Changing to a different focus starts its day count again; late selection
  cannot claim preceding months. New annual records retain the evidence used
  for the result and award once. Older recorded results remain unchanged.
- GROW-02: Six concise milestone and recall scenes cover finding a voice,
  visiting the school door, revisiting an earlier learning choice, wider study,
  first independence and reconsidering a plan at adulthood. They draw on actual
  household circumstances, living friends or caregivers and a previously
  developed focus. Later scenes recall the recorded choice and its real age.
  The seeded ordinary childhood pool remains available alongside these scenes;
  existing open scene snapshots keep their exact wording and effects. Plans
  do not automatically enroll, appoint a profession, award wages or add quests.
  Existing short personal stories and older five-chapter saves retain their
  chapter counts.
- GROW-03: The Life and Family & school pages show the actual chosen birthday
  outcome beside its matching annual school account. School-year bookkeeping
  no longer replaces that personal notice. The school account lists the actual
  annual total and named routes attended, including lessons taken before a
  transfer. Both histories survive reload; an unrelated later lesson cannot
  replace the matching birthday account.
- GROW-04: The optional adult-child independence invitation requires a living
  child aged at least eighteen, using the absolute birth date when recorded.
  A stale display age cannot open it at sixteen. Its actor is the eligible
  living adult child, rather than an earlier younger or deceased sibling.
  Already-open saved stories retain their earlier snapshots.
- GROW-05: New shrine-foundling lives keep two unrecorded birth-parent ties and
  the actual guardian household, without fabricating named parent deaths or
  memorial ancestors. The origins conversation and Family & legacy view
  distinguish unknown or missing ties from confirmed deaths. Explicit orphan
  households retain their recorded
  deaths. Older foundling saves with already-written named death records retain
  that history; the update does not infer which old facts should be erased.
- GROW-06: Transfers receive a review showing the actual fee, day, retained
  preparation and destination preparation before commitment. Canceling spends
  nothing; confirmation rechecks the current terms and executes once. Each
  route retains its real attendance, progress, performance and study year, so
  returning resumes it. Learned skills and qualifications remain. Lessons,
  revisions and exam limits remain shared across routes and cannot be refreshed
  by transferring. The course ledger survives birthdays and reloads, exposes
  paused preparation, and records new attendance by route. An older save starts
  from its known current preparation; erased earlier courses are not invented,
  and earlier annual attendance with unknown route attribution is labeled as
  such. That older baseline cannot boost the performance of a newly chosen
  course.

`tests/growth-focus.test.js` adds 47 controlled checks of these acceptance paths,
including actual time and skill accounting, late focus selection, annual caps,
stored scene and birthday continuity, real child-age eligibility, new and older
parentage records, route preparation, malformed imports, and production transfer
review, cancel and confirm handlers. These are regression fixtures, not extra
audited lives or a human survey. The established muted yellow-gray, bone,
charcoal and subdued brass styles, original portraits and area artwork remain.
Browser layout QA is unavailable in managed Linux; semantic DOM checks verify
handlers and rendered content without measuring layout or device performance.

Focus 10 verification: the complete regression suite passed all 1,090 checks
across 80 files, with no failures, cancellations or skips and unchanged tested
inputs. All 47 new focus checks also passed separately. The complete offline
distribution rebuilt successfully at v0.25.10 and whitespace validation passed.
Source and native publication receipts identify the packaged release. Browser
layout QA remained unavailable.

## Focus 11: World consequences, law and community

- WORLD-01: The shelter door, independent workbench and winter commons keep
  separate entries by story identity at their recorded settlement. Completing
  another service no longer overwrites the earlier one. Activities and the
  settlement inspector expose the independently usable services, names, terms,
  fees and 28-day intervals. Each use requires its actual day and any stated
  five-gold fee, with ordinary living costs still separate. A closed settlement
  retains the record but cannot award the service benefit. Older single-service
  fields remain readable. Completed material-story records can establish other
  genuinely earned services; erased usage timestamps are not invented, and a
  retained service's actual last use is preserved. Reading the ledger changes
  nothing. Existing RPG services and their own terms remain separate.
- WORLD-07: Generic patrol checks now respect an attended local legal commitment
  and the saved seven-day fugitive or hearing-deferral window. The case captures
  the evidence covered by its promise. The deadline returns to the actual local
  capture/hearing scene rather than a competing generic arrest. Reports do not
  spread to a settlement the player visits elsewhere. A genuinely new witnessed
  charge can still lead to a patrol, but its source and the earlier return date
  are named explicitly. Genuine older windows without a captured count are
  protected conservatively; the first actual new report records their existing
  baseline before adding evidence. The original warrant, date, custody options
  and free service routes are not erased by the coordination.
- WORLD-02: Four recurring grown-up situations use the saved earlier choice:
  road warnings, festival repairs, unsigned commissions and quiet household
  company. Returns acknowledge the earlier action and concern maintenance, a
  changed issue or another household rather than pretending the old result
  never happened. Known different localities are not treated as the same scene.
  New birthday proposals snapshot their displayed wording and outcomes through
  reload; new yearbook entries keep their locality. Existing numerical effects
  stay unchanged. Already-open older birthdays without the new snapshot keep
  their previous wording and resolution path. No new NPC roster or accepted
  quest is created by these callbacks.
- WORLD-03: New war announcements reuse the grievance already saved in the war
  record rather than rolling a different cause. The regional ledger and the
  later war account display that recorded cause. Older announcements and causes
  remain written as they were. New war-destruction accounts also retain the war
  identity and actual world-year date, so later attribution has a source.
- WORLD-04: Institutions distinguish operating, unfunded, suspended, closed-site
  and unfinished states independently of the wider settlement's civic status.
  Review text and community cards explain an open town alongside a paused or
  unfunded service. They retain the actual reserve, annual cost, funded period,
  founder, beneficiaries and charter. A no-cost review or reopening choice
  cannot replace a missing endowment. Existing funding allocation, voluntary
  contributions, protected reserves and actual service benefits keep their
  accounting rules; looking at a status grants no benefit or money.
- WORLD-05: New endings save an attributed loss ledger: losses already present
  versus destruction or evacuation actually added by the final choice. Earlier
  war losses are labeled as war losses, unknown causes remain unrecorded, and
  already-destroyed places cannot acquire a second final-choice destruction.
  Concise summaries reference the fuller ledger in the ending display. Memorial
  visits also use the actual recorded cause. Older ending prose stays exact;
  their display reconstructs attribution only from surviving dated accounts,
  excludes later wars and recognizes a prior recorded reconstruction. No ruined
  place, dead person or original ending preparation is silently restored.
- WORLD-06: A deliberately bounded forgery allegation can follow the altered
  household claim in The Letter Beneath the Hearth. Its newly opened proposal
  discloses the risk before commitment and saves those terms. After attended
  completion and at least seven elapsed days, a living named participant must
  actually be present with the retained earlier agreement in the reporting
  settlement. Only then is one documentary evidence added locally and a
  disputed-allegation response opened; it is not a conviction or universal
  disclosure. Withdrawing the claim costs a 12-gold filing fee and answers only
  this report's one evidence, leaving unrelated charges and the original story
  choice intact. A free written defense keeps the ordinary hearing, advocacy,
  supervised service and restitution routes available. A new threat against
  this actual witness adds two specifically sourced evidence and an oath breach.
  A filed correction is acknowledged in the next household chapter. The same
  source cannot be filed repeatedly or assigned to another generation. Older
  proposals and paid commitments without the new captured law terms do not
  retroactively create reports. Other unpopular choices, private conditions and
  general reputation are not automatically criminalized.

`tests/world-focus.test.js` adds 63 controlled regressions covering the new
records, source attribution, old-save paths, actual fees and time, saved local
deadlines, locality and witness gates, lawful responses, malformed imports and
production action handlers. The service source earns its work eligibility and
completes all three stories through public commands; the unfunded screen test
advances a built institution through real calendar years. These remain QA
fixtures, not additional audited lives, a human survey or long-term balance
telemetry. The existing muted yellow-gray, bone, charcoal and subdued brass
styles, original area art and portraits remain unchanged. Browser layout QA is
unavailable in managed Linux; semantic DOM tests check rendered content and
handlers, not geometry or device performance.

Focus 11 verification: the complete regression suite passed all 1,153 checks
across 81 files, with no failures, cancellations or skips and unchanged tested
inputs. All 63 new focus checks also passed separately. The complete offline
distribution rebuilt successfully at v0.25.11 and whitespace validation passed.
Source and native publication receipts identify the packaged release. Browser
layout QA remained unavailable.


## Focus 12: Health, time and recovery

- HEALTH-01: The header and battle meters now name combat HP. Health & care
  places immediate endurance and bodily wellbeing beside their practical effects,
  the current concern and an actually available care action. Low bodily wellbeing
  explains the existing below-35 illness-risk threshold even at full HP. The Life
  screen offers a direct care route for low wellbeing, low HP or recorded symptoms;
  Character keeps both measures. Restoring HP does not erase a condition, and
  long-term frailty still follows the existing age and ancestry rules.
- HEALTH-02: Free and guided plans quote their full 14, 28 or 56 actual days,
  weekly gains, fee and ordinary living costs before commitment. Both support
  physical and emotional symptom care while attended. A separately saved care-day
  count, attendance progress, remaining days, current care windows and completion
  receipts distinguish reserved attendance from symptom improvement. The preview
  gives the existing fortnightly checks, 21/35-day emotional onset requirements,
  joy/stress thresholds and continuing chronic care. Finishing a plan may leave
  symptoms; separate care sessions help symptoms without finishing reserved days.
  Birthdays and urgent needs retain the plan. The quoted fee is reserved before
  calendar costs, paid once on actual attendance and refunded if no day is spent.
  An unexpectedly shorter segment cannot leave a longer provisional care window.
  Weekly guided severity relief follows completed attended weeks, rather than the
  number of times Continue is clicked. Existing HP/wellbeing weekly amounts and
  the fourteen-day continuing care window are preserved. An older plan retains
  its saved days and price; missing earlier care-day totals are shown as unknown,
  and only subsequent attendance adds a separately recorded count. Cancellation
  keeps earned days and care, without granting unused days or a completion.
- HEALTH-03: New concern scenes lead with bodily rest for acute symptoms, a
  gentle routine for recurring conditions and willing support for emotional needs.
  Early-childhood text describes caregiver or community help and free sponsored
  care without inventing a parent. Later-life recurring symptoms acknowledge
  management; ongoing treatment is named before offering a renewal. New onset
  records retain their actual observed circumstances, distinguishing outdoor
  exposure from a confirmed cause; an older unrecorded cause remains unrecorded.
  The optional routine choice uses the existing real three-day care action and
  benefits. Demanding unsupported concerns take priority when a new scene is
  queued. Already-open saved concerns retain their exact words and choices.

`tests/health-focus.test.js` checks the acceptance paths, actual time and gold,
conditions versus plan completion, separate care sessions, interrupted and older
plans, read-only views, childhood sponsorship, chronic care, saved scene wording,
malformed imports and production navigation/action handlers. These are controlled
regression fixtures, not additional audited lives or human playtests. No styles,
colors, portraits or area artwork changed: the existing muted yellow-gray, bone,
charcoal and subdued brass palette is retained. Browser layout QA is unavailable
in this managed environment; semantic DOM checks cover content and handlers,
not layout, contrast or device performance.

Focus 12 verification: the complete regression suite passed all 1,190 checks
across 82 files, with no failures, cancellations or skips. The final display
refinement then exposed the actual birthday restriction when care is unavailable,
updated the title-screen version and made the recurring-condition circumstance
caption independent of ancestry's age range. All 85 checks across the five
health, recovery, curse and entry files passed after these text/display changes,
including all 38 focus checks and the new birthday restriction case. There are
1,191 distinct covered checks and no unresolved failures; this does not claim
a second complete-suite run. No recovery or combat accounting changed after the
full run. The complete offline distribution rebuilt successfully at v0.25.12;
the post-build offline checks and whitespace validation passed. Source and native
publication receipts identify the packaged release. Browser layout QA remained
unavailable.


## Focus 13: Rare supernatural discovery

- CURSE-01: Night travel and actual dungeon time check every eligible calendar
  week covered by the attended span. The existing 12-in-10,000 weekly chance and
  creature/patron/ranger split remain. A monotonic cursor prevents a second roll
  from shorter commands, repeated calls, reloads or a different site in the same
  already-checked week. Sheltered gaps are not backfilled and a span crossing
  adulthood counts only its adult eligible days. A new bounded exposure account
  retains eligible days, weekly checks and the first current opportunity; only
  one meeting waits at a time. Older cursors keep their checked week and start
  separate totals from actual future attendance, without inventing old exposure.
  The Chronicle discloses the weekly chance once a real meeting is remembered.
- CURSE-02: Newly encountered patrons and rangers introduce a named traveler and
  retain the actual location, observed trail hex, context and dates. A separate
  defer choice, or asking for time after hearing the offer, stores an undecided
  invitation in the Chronicle. It creates no quest, contact-roster entry, class or
  condition. The note can inspect its actual known point without movement or
  time. Returning requires that point and one real night; a 25% known-contact
  return check, with at least seven days between searches, is separate from the
  initial rare-discovery chance. Absence remains recorded, an intervening actual
  encounter takes precedence, and even finding the person only reopens a
  conversation before explicit consent. Other commitments and an existing major
  condition cannot be bypassed. Permanent refusal and acceptance close that
  invitation. Old already-open two-choice scenes keep their exact words and
  options. Earlier met-only flags retain their original routes and explicitly
  unknown return points; new people or old coordinates are never invented from
  those flags, including mixed old/new records. Meeting records belong to the
  actual generation. Existing creature bites, treatment, hunger, moons, ordinary
  life and consent remain the means of any eventual condition change.
- CURSE-03: Newly offered full animal meals use base relief 45 across the
  attended feeding menu, annual hunger need and night hunt. New full consenting
  donor meals use 60, matching an attended named agreement. Each route states
  whether its day is still required or has already been attended; daily hunger
  continues and relief caps at the actual hunger. The four lineage animal-blood
  factors remain, giving full animal amounts 45, 45, 34 and 50. Limited prison
  rations (base 30), larger paid infirmary portions (55), measured assaults (70),
  uncontrolled potentially fatal meals (80) and damage-based battle feeding keep
  their distinct terms and consequences. New meal choices capture and validate
  their amount and source before commitment. Already-open older meal scenes
  retain their displayed words and original 28/50/65 terms where applicable.
  Character names lineage weaknesses as lore and separately explains real
  attribute changes, hunger, animal feeding and daylight costs. Battle readouts
  and inspection use the combatant's actual recorded weakness and resistance;
  lore such as sacred fire or silver adds no unimplemented damage multiplier.
  Lantern ray now describes a recorded radiance weakness rather than claiming
  every undead target has one. No new elemental/silver multiplier was added.

`tests/supernatural-focus.test.js` exercises public earned meetings, paired night
journeys with and without a real deadline pause, chunked time, eligibility,
deferred/declined/accepted invitations, return searches and intervening encounters,
known-point inspection, actual attendance and fees, all four meal adjustments,
real donor agreements, old saved terms, malformed imports and isolated actual
combat previews. Source checks do not stand in for feeding or battle execution.
The production semantic DOM harness checks Chronicle navigation and the real
search/deferral handlers. These are controlled regression fixtures, not new audit
lives, human reviews, an incidence survey or long-term balance evidence. The
existing styles, muted yellow-gray palette, portraits and area art are retained.
Browser layout QA is unavailable here; semantic checks do not measure layout,
contrast or device performance.

Focus 13 verification: the complete 83-file regression suite passed all 1,240
checks with no failures, cancellations or skips at the final runtime/test inputs.
All 49 new focus checks are included; the focused discovery, curse and feeding
group also passed all 91 checks separately. The complete offline distribution
rebuilt successfully at v0.25.13. Its 11 stored parts total 85,884,248 bytes and
reconstruct the standalone artifact byte for byte. All five post-build offline
checks and whitespace validation passed. The existing stylesheet and artwork
have no changes. Browser layout QA remained unavailable.


## Focus 14: Interface organization, situated dialogue and keyboard structure

The user expanded this focus to reorganize the complete interface, explain its
clutter and replace the People chat with remembered relationships and local
portrait dialogue. The refined implementation brief, source-based diagnosis,
primary-source game comparisons and ownership of all 17 destinations are in
[`ui-focus-14-review.md`](ui-focus-14-review.md). Those design conclusions are
inferences from the implementation and feedback, not a human usability survey.

- UI-01: Navigation has one Gear & pack destination and consistent destination
  names. All views groups the complete set of destinations; settings have their
  own modal. Help describes the actual interface, local conversations, current
  encounter controls, safe save review and explicit map commitment.
- UI-02: Enter and Space inspect country hexes, settlement rooms and both dungeon
  representations without movement, time, payment, rewards or discovery. A
  separate Confirm action quotes the current engine offer and rechecks its
  eligibility before committing. Mouse single-click inspection and double-click
  commitment remain. A room's services become available only after actual entry;
  unknown dungeon contents remain unknown until the existing rules reveal them.
- UI-03: Replaced controls regain connected focus after quest categories, pack
  modes, gear/subject filters, relationship and resident searches and pagination.
  Buttons expose the selected state, and a persistent polite status announces
  the current selection and results. Paging focuses a useful result heading;
  search keeps focus in the actual current input.
- The expanded reorganization gives career, household, health, legacy, character,
  party, crafting, lore, realm, contracts and Chronicle named sections. Life
  separates today's situation, lived years and future commitments. Equipment,
  activities, quests, map inspectors, battle commands, scenes and global menus
  share consistent reading order, action rows and disclosures. The shared layout
  removes competing tiled panels and unnecessary nested fixed-height surfaces,
  while retaining responsive map/inspection views and existing reading settings.
- Bonds & memories replaces the global chat surface with bounded, searchable
  acquaintances, relationship status, earned memories, learned tastes and
  recorded earlier words. Browsing the record accepts nothing, marks no words
  read and grants no social reward. Unmet generated residents stay out of it.
  Local settlement search and paging reach residents beyond the first eight
  without treating browsing as an introduction.
- Approach an actually present person in Explore for a portrait, one current
  authored line and deliberate responses. Local dialogue records the actual
  person, settlement and day; older records keep missing dates unknown. A new
  remote talk command is refused by the production UI. Earlier pending remote
  exchanges remain resolvable with their exact saved replies and effects. The
  legacy correspondence engine remains compatible. Relationship restoration is
  still actual work at its recorded place, linked from the memory book.
  The encounter occupies the full reading surface; leaving returns focus to the
  resident list. The tavern's obsolete remote-letter controls are removed.
  Companion links name the actual next step: speak locally, read an existing
  relationship or locate an unmet person. Resumable older descents retain their
  current chamber and real Continue/withdrawal commands from Life.

The muted yellow-gray, bone, charcoal and old-brass color variables and all
original artwork remain. New styles reorganize the presentation using those
same colors. No fictional per-room NPC placement is invented: existing resident
data establishes presence in the actual settlement. Saved lives retain their
earlier words, decisions and unfinished work; interface section preferences are
stored separately from the life.

`tests/menus-focus.test.js` and `tests/interface-overhaul.test.js` exercise actual
production handlers, free inspection versus confirmed engine movement, all named
sections, read-only records, local dialogue, remote-start refusal, bounded meeting
imports, paging, connected focus and workspace reload. Every destination is also
visited at birth, age three and age twelve without granting adult actions.
Existing social, gear, education, care, economy, dungeon and rare-discovery UI
checks follow the reorganized routes while retaining their effects and save
assertions. The semantic harness models replaced controls losing focus, SVG
targets and native keyboard activation; it cannot measure geometry, contrast,
physical keyboard use or screen-reader speech. Browser QA is unavailable in this
managed environment. These are controlled regression fixtures, not new audited
lives, human playtests or evidence of long-term satisfaction.

Offline verification: v0.25.14 contains 11 parts totaling 85,921,117 bytes.
They reconstruct the standalone artifact byte for byte (SHA-256
`3941610d9d105f10bed9fff610ec712c751541ee7a3fa39adaa5ef9f4b1f5368`).
All five post-build download-integrity checks pass. The build also verifies the
translated module graph, all 190 character/enemy portrait atlases, all 64
transformation atlases and the complete 15-track score. The existing palette
declarations and original art/audio are unchanged; added styles use existing
color variables. Whitespace validation passes.

Focus 14 verification: the complete 85-file regression suite passed all 1,296
checks on the final runtime and test inputs, with no failures, cancellations or
skips. All 56 new focus checks are included: 24 menu/keyboard checks and 32
interface, social-boundary and cross-workspace checks. The current guide and
older production UI regressions follow the actual new section routes while
retaining their engine, save, cost and attendance assertions. The complete
offline distribution rebuilt successfully at v0.25.14, with the byte-parity,
post-build download and palette checks recorded above. Browser layout and
screen-reader QA remained unavailable. Source and native publication receipts
identify the packaged release.


## Focus 14 follow-up: Annotated interface review, v0.26.0

The user's follow-up supersedes the first focus-14 arrangement. The concrete
brief, diagnosis, all nine comment resolutions and new screen ownership are in
[the feedback record](ui-focus-14-feedback.md). Explore now owns the hex map and
travel; settlements use illustrated area selection, and dungeons use actual room
scenes, inspectable doorways and a discovered pocket map. Journal combines quest
and life records. School/Employment, categorized Bonds and the equipped-portrait
Inventory replace the earlier navigation and pack panes. Trading is available
through the actual market. Creation restores the portrait, uses three compatible
trait slots, keeps Random outcomes unlabeled, and applies bounded age-based
SAVIWP allocation to the actually simulated past. Menu recording startup and
title scrolling are repaired; scrollbars use the subdued yellow palette.

Earlier open scenes and saved decisions retain their captured wording and
consequences. New adolescent and adult birthday scenes describe concrete shared
moments and the skills they practice instead of repeatedly proposing vague plans.
Their actual historical choices and school accounts remain in records. No new
reward system or invented NPC room position is introduced. Focus 15 is not started.

Follow-up verification: all 1,329 checks across 87 files passed on the frozen
release source, with no failures, cancellations or skips. The 33 added checks
cover 20 UI/interaction paths, nine creation/allocation cases and four recorded
score startup/transition cases. The final entry-flow regression includes the
reproduced Random-to-explicit ancestry repair. Test fixtures remain automated
checks rather than new audited lives or human playtests.

The rebuilt v0.26.0 standalone has ten parts totaling 81,444,028 bytes. They
reconstruct the complete artifact byte for byte (SHA-256
`8e150ba776c1a48a03cf6ddad4c3a11e1f136839d114a5cf71a4e8a901381b1e`).
All five post-build download-integrity checks passed. The build verified the
translated module graph, 190 character/enemy atlases, 64 transformation atlases
and all 15 original recorded tracks. Original art/audio files and existing color
variables are unchanged. Whitespace validation passed. Browser layout and
screen-reader QA were unavailable in this managed environment. Source and native
publication receipts identify the packaged release.

## Focus 14 follow-up: Explore and situated trading, v0.26.1

The [Explore evaluation](explore-focus-14-review.md) records the source findings,
official reference games, implemented decisions, controls, asset provenance and
remaining verification limits. Explore has a draggable in-game pop-out chart,
pointer-centered zoom, 100–400% scale, Fit, Find Me and a known-place locator.
Inspection keeps the camera position and spends no simulation resources. Real
travel retains its separate offered confirmation; a drag suppresses its trailing
click and cannot accidentally select or cross a hex.

Locations lead with the illustrated area, season/weather and local interactions.
Residents and secondary services are compact disclosures. Returning from local
dialogue opens the resident list before restoring focus. At the market, approach
the actual shopkeeper and ask to see the goods. Two illustrated inventories lead
to a staged trade with quantities, actual seasonal quotes and the exact coin
difference. A single engine transaction rechecks and exchanges both sides;
abandoning an offer changes nothing. Equipped and stolen goods cannot be offered
to this merchant. Sixteen new supply/material/treasure illustrations are shared
with Inventory, alongside a new original counter environment. The original
palette variables and existing art/audio files remain unchanged. Focus 15 is
not started.

The full regression run covered 1,365 checks across 89 files. It passed 1,361 and
reported four failing results from two obsolete expectations: the v0.26.0 label
and the old 250% zoom ceiling (including the dependent subtest and its parent).
The label check now uses the package version, and the zoom test expects the
documented 400% maximum. All 38 health checks and all 82 affected UI, camera and
trading checks then passed in complete file reruns, including selection/scale
reload. No failing check remains unresolved. The 36 new checks cover the camera,
real travel confirmation, situated shop flow, stock/payment, zero-Gold barter,
sale credit, stale/altered offers, quantity bounds, equipment protection and item
art coverage. These are automated fixtures, not new human playtests.

The final standalone build has ten parts totaling 81,945,408 bytes. They
reconstruct the artifact byte for byte, SHA-256
`9b887c15fe4a5f2574e5c635cb5557c1bd1d721a0be3dea09f85958d35f8caf6`.
The actual translated standalone JavaScript also passed title/resume, chart
open/close and a confirmed shop purchase in the semantic DOM harness. The build
verified the complete module graph, 190 character/enemy atlases, 64 transformation
atlases and all 15 original recorded tracks. New assets are embedded; the
existing five offline-download integrity checks passed in the full run.
Whitespace and original-palette checks passed. Browser layout, real-device
pointer behavior and screen-reader QA were unavailable in this environment.

## Focus 14 visual correction: Map-only popup and consistent art, v0.26.2

The user's clarification supersedes the v0.26.1 expanded workspace. The popup
now contains only the hex chart, one thin muted border and a small close control.
Explore's heading, location entry, locator, toolbar, details and actions remain
on the main page. Dragging, wheel/keyboard zoom and camera preservation continue
to work. Selecting a hex in the popup keeps focus on that hex and spends nothing;
close the popup to review and confirm its offered route in Explore. A deliberate
double click still executes an available neighboring crossing.

Character creation removes the outer portrait panel and the portrait's own
ornamental border/shadow while retaining its explicit dimensions and original
crop. The market backdrop is now a separate illustrated layer using the existing
desaturation filter; shopkeeper portraits use that treatment too. Item and area
art already use the same filter. UI text, controls and the original palette
variables retain their established colors. No image or audio asset is rewritten.

All 90 affected UI/creation/map checks and five offline-download checks passed.
The actual translated standalone also passed resume, popup open/close and a
confirmed shop purchase in the semantic DOM harness. The final ten download
parts reconstruct 81,945,131 bytes exactly, SHA-256
`99d80543a8203ee8e7b3d9c6ac67388dfdb95aab1c77b9c50e8d5cdb0e7f13b1`.
The module/media build and whitespace checks passed. Browser visual and
screen-reader QA remain unavailable in this environment. Focus 15 is not started.


## Focus14 continuation — world-first life and narrative, v0.27.0

The latest brief supersedes the previous16-workspace structure. The main rail is
Life, Activities, Explore, Relationships, Inventory and Journal. Named people in
real areas offer treatment, work, commissions, contracts, school, guild training,
faction work and local knowledge. Engine guards use those same actual areas;
walking uses the existing connected room graph and spends no days. Village work
uses an existing market rather than a nonexistent yard. School routes have their
own teachers, and wild mentors retain their outdoor sites.

Activities contains personal pursuits and concise resume/end controls for older
unfinished commitments. New long care/work planning offers are retired.
Relationships adds Lovers and Enemies from actual relationships, retains evidenced
introductions, and contains portraits in their own column. Journal has exactly
Active Quests, Archive and Notes, with discovered lore and player-written notes.
Inventory offers validated equipment dragging, click/keyboard equipment controls,
and atomic use of actual healing potions or medicinal herbs. Potions restore
Health without pretending to cure illness. The actual game-content scroll pane,
creator controls, item grids and modal scroll positions survive redraws.

Narrative edition30 replaces live event/dialogue delivery and current pending
prose. It includes direct childhood, adult, family, work, travel, supernatural,
dungeon and regional scenes, role-specific conversations, remembered personal
consequences and updated quest/lore copy. Displayed replies are snapshotted and
cannot be farmed repeatedly on the same day. Existing deeds and quoted story
terms are captured before copy changes. Imported opaque history becomes dated
factual summaries; IDs, dates, resources, gear, qualifications, contracts and
unfinished attendance remain. New deaths and displacement records carry typed
facts so a later activity cannot replace them with its own result. World locations
and epilogues use the new prose. Explicit private disclosure informs only the
person actually met.

Creation now centers its portrait within a close fitted brass-gray border. All
portrait images share the grayscale illustration treatment. The map-only popup,
its narrow border and original music/art assets remain; no new media is generated.

Validation and publication details are recorded in
[the implementation record](world-first-focus-14.md). Browser visual, touch/device
and screen-reader QA remain unavailable because the required browser skill is not
installed. Semantic DOM checks do not measure final CSS geometry. The older full
suite includes superseded expectations for remote services,16 menus, long planning
and original literal prose; its clean status is not claimed by this release.
Focus15 remains unstarted.

## Focus 14 continuation: Focus travel and a larger lived world, v0.28.0

The latest request replaces new road preparations with existing Focus as travel
energy. Road and hex travel slow at low Focus, accumulate danger without rest,
and can end a life through continued exhausted travel. Finite camp packs are real
trade goods; camping restores Focus, Health and calm using actual attended time.
Partially attended slow steps and birthday interruptions retain their progress.

Activities has six compact categories, with Work & School and Recovery shortcuts
walking to the real local person. Homes uses real local property purchases.
Settlements have a primary faith and local shrine tradition; some have no public
shrine. Ordinary residents have stable identities and actual areas, occasional
accepted supply favours, and eligible adult courtship governed by individual
romantic interests. Runestone Pairs and a dice wager use real saved progress,
time and daily limits. Expanded whole-name catalogs cover all eight ancestries
and 27 heritages without rewriting existing saved names.

All new authored, contract, regional and radiant descents use the replacement
121-room maze. Reciprocal doors, fog, finite caches, enemies, hazards, safe camps,
inscriptions, guardians and actual quest objectives share one movement system.
Contract proof names the actual guardian battle and still requires returning for
payment. Older paid journeys and unfinished descents retain their original
resolvers; genuine v0.27.0 engine-generated fixtures verify this compatibility.

The final eleven-file acceptance gate passed all **179 checks**, with no failures
or skipped checks. The rebuilt standalone passed actual embedded-script VM checks
without network access, and its ten parts exactly reproduce all 82,266,209 bytes
(SHA-256 `5b372dcdc961358fe3c3769a2a9c60e967845d424953414dc04c687c9de83c22`).
The [implementation record](world-expansion-focus-14.md) gives mechanics, the
exact command, compatibility evidence and limits. The full historical suite is
not claimed green: older travel helpers and retired interface/prose expectations
still require modernization. Browser visual, touch/device and screen-reader QA
remain unavailable. Existing art/audio files, palette variables and the map-only
popup are retained. Focus 15 remains unstarted.

## Focus 14 continuation: carried paper atlas, v0.29.0

The map overhaul replaces per-hex terrain stamps with continuous saved geography
and pen-and-ink illustration. The country, local and named regional sheets depict
coastlines, lakes, mountains, woodland, rivers and actual winding roads. Original
mapped settlement positions, distinct drawings and unboxed labels replace rows
of grid-centred pins. Travel Grid is optional; six-neighbour hex movement, actual
Focus costs, free inspection and separate confirmation remain. Broad terrain is
printed map knowledge, while unknown settlements, quests and discoveries remain
unrevealed. Map viewing does not spend time or record visits.

New countries use generation 6 with six designed landform families, terrain-aware
site placement and land roads that seek real passable ground. New lake/sea hex
classification follows those same land and water bodies. Older countries keep
their geography and exact hex assignments, terrain, roads, discoveries and pending
crossings, verified against an actual v0.28.0 engine-generated save. The thin
map-only popup, hold-to-drag panning, zoom and focus behavior remain. First phone
visits use the closer local sheet; preferences can be retained.

The final sixteen-file release gate passed all **228 checks**, with zero failures
or skipped checks. Twenty actual map SVG exports passed XML validation and were
used for artwork inspection. The rebuilt standalone and actual embedded-script
VM checks passed without network access. Its ten stored parts exactly reproduce
82,307,393 bytes (SHA-256
`2f4d17d15a67dbe0f2125a9f16a906dea02ab51fdc5ca1f81f395787c99b2630`).
The [map implementation record](paper-atlas-focus-14.md) contains the exact test
command, artwork review and compatibility details. Browser layout, touch/device
and screen-reader QA remain unavailable; the full historical suite is not claimed
green. Existing media and the muted yellow-gray palette remain. Focus 15 remains
unstarted.

## Focus 14 continuation: regional world foundations — v0.30.0

The request is implemented as persistent regional identity, autonomous dated
politics and local optional intervention, supported by a larger atlas and clear
traversal. Culture is separate from control: a vampire occupation or a contested
player holding does not erase a town’s original region, people, faith or claim.
The world is not required to wait for the protagonist, and a child cannot join
political battles or seize land. Existing worlds receive additive institutions
without geographic regeneration or replayed historical wars and deaths.

See [the regional implementation and verification record](regional-world-focus-14.md)
for the complete delivered scope, save guarantees, checks and remaining limits.
Focus 15 remains unstarted.


## Focus 14 continuation: destinations and simple journeys — v0.31.0

Explore now has one continuous paper map, one destination picker and one selected
location or journey card. Named-place travel replaces visible terrain stepping,
chart-sheet selection and stacked route/energy panels. Select a place, review the
journey, and Set Out. Continue attends a short stretch and pauses for rest,
encounters, birthdays and actual waypoints. Local people and work remain inside
places. The popup remains a map with a thin border and close control.

The reproduced offsite-travel blocker is repaired with a named-destination trail
route over saved geography. Genuine v0.30.0 offsite and planned-route saves,
v0.29.0 partial slow crossings and v0.27.0 paid road journeys retain their exact
saved progress at migration. Continuous regional boundaries follow the actual
territorial partition rather than the movement lattice. The muted yellow-gray
palette and existing art remain.

See [the implementation and verification record](destination-travel-focus-14.md)
for the audit findings, final test command, offline receipt and verification
limits. The twenty-file regression gate passed 307 checks; the final 27-case
Explore suite passed after two added idle-camping/discovery checks. The rebuilt
standalone passed actual embedded-script verification without network access.
Browser geometry and touch/device QA remain unavailable. Focus 15 remains
unstarted.


## Focus 14 continuation: creation, Activities and natural discovery — v0.32.0

The annotated review now has a dedicated implementation and verification record:
[creation, Activities and natural discovery](activities-feedback-focus-14.md).
Origin selection uses explicit buttons and retains its value across steps. All
eight ancestries have three exclusive stories; five old shared origin IDs remain
valid in recorded lives. New lives distribute remaining attribute points by fate,
without rerolling old allocations. Fate controls keep their actual draw concealed.

Activities has plain, independent category panels, real work and doctor
shortcuts, outings and board games, and compact fictional crimes resolved with
attributes plus a d20. Repeated headings, shortcut tabs, the phantom Mira activity,
adult teacher reading and generic recovery planning are removed. Relationships
continue through actual local meetings. Romantic identity settings are retained
under Character. Travel charts nearby country, accepted requests supply their
map destinations, manual survey and farming offers are retired, and saved natural
encounters follow terrain, conflict, occupation and exhaustion. The map owns its
scrollbars and has no circular destination highlight. The existing muted palette
and map-only popup remain. Focus 15 is unstarted.


v0.32.0 verification: 362 distinct automated checks across 23 release-check files
have passing final results, including affected-file reruns; this is combined
coverage rather than a second complete-suite run. The initial broad gate's two
outdated expectations were corrected for the requested origin pool and mandatory
natural-encounter decision. The final travel/Activities/map gate passed 92 checks;
all 31 origins/regional checks and all 13 identity/personality checks pass. The
separate historical People/Quest Records group retains 18 failures exactly
reproduced on unchanged v0.31.0. Details are in `feedback-v0.32.0-tests.json`.
The complete offline distribution rebuilt to 82,441,436 bytes in ten parts and
passed actual embedded-script verification with network access forbidden.
Browser geometry, touch/device and screen-reader QA remain unavailable.

## Focus 14 follow-up: Visible map and local service access, v0.33.0

The [implementation record](map-services-inn-focus-14.md) covers the four new
map/service/tavern comments and the subsequent fate-prompt removal. A conflicting
auto-height selector was collapsing the inline map; its definite viewport now
has independent muted yellow side/bottom scrollbars and a larger paper canvas.
Hold-and-drag panning leaves native scrollbar gestures alone. Double-clicking a
known destination starts the same guarded journey as Set Out; keyboard and single
click inspection remain free. The clean map-only popup remains.

Activities now walks to and opens the real local doctor, steward and teacher.
Outside a settlement, shortcuts show a route to a reachable known provider rather
than inventing a local service. Enrolled pupils can Attend Class, Study or Talk to
Teacher from Activities. School selection no longer assigns an inaccessible
school to a wilderness birthplace. Identities, course progress and qualifications
remain intact.

Tavern innkeepers now trade illustrated food/ale through the shared barter
inventory using their own finite seasonal stock. Actual purchased servings enter
Inventory. Rooms cost one real night and 8 Gold. Heard rumors point to real local
quest clients and destinations, remain in Journal Notes and never accept work or
pay rewards automatically. Stale, remote, edited and unaffordable trades remain
atomic. The unsolicited fate/civilian-life window is no longer offered or
generated; migration dismisses an older captured prompt without choosing for the
player or changing the investigation.

Verification: all **372 checks across 18 release files pass** in one final gate.
`npm run build` passed; the complete offline artifact is **82,456,238 bytes** in
ten parts (SHA-256 `145a18f6973c35e26c0cb2101f964099353ad5e4581785975cd4fbef4eb59d75`).
The actual embedded script passed with network requests forbidden, including
native double-click departure, local shortcut visits, inn barter, carried meal
use, room rental, rumor/client/Journal flow and retired-prompt migration. See
`feedback-v0.33.0-tests.json` and `verification-v0.33.0.json`.
Browser geometry, touch/device and screen-reader QA remain unavailable. This gate
does not claim that the historical People/Quest Records failures documented in
v0.32.0 pass. Focus 15 remains unstarted.

## Focus 14 follow-up: Wheel camera, People Here merchants and leisure, v0.33.1

The user's latest instructions supersede the prior map scrollbars and market
counter. Plain wheel zoom is anchored at the pointer in the inline and popup
maps; holding the mouse pans. The map hides native scrollbars and retains only
Find Me and Expand as visible camera controls. Region-title text fades with zoom,
while city/location labels remain visible. The definite map viewport, guarded
travel and double-click departure remain.

The innkeeper stays in People Here. Market shopkeepers now use that same entry
pattern, with portrait dialogue and illustrated trading after selecting the
person. The dedicated market counter is removed. General Merchant stock and
identity remain, with added Apothecary and Travel Outfitter people offering
specialist selections and prices from actual settlement supply. Vendor switching
cannot restore consumed stock. A canonical service-person ID preserves valid
merchant meetings without altering the existing trade ID. Inn food/drink barter,
rooms and real quest rumors remain available from the keeper's dialogue.

Social & Fun shows current Stress and groups six new outings with existing walks,
known companions and playable games. Outdoor time and sketching are free. Picnics,
tavern music, warm meals and board games have short, explicit time/cost/effect
quotes. Actual days and fees are spent, interrupted activities grant no free
reward, stats remain bounded and no relationship is invented. See
[the implementation record](map-tavern-leisure-focus-14.md).

Verification: the final **234 checks across 12 selected release files all pass**.
The offline build succeeds at **82,265,648 bytes in ten parts**, SHA-256
`b524dd9632f45fc6e521ca12749d7cfd8ae520f1efea17e56721da34dec6629f`.
The actual embedded script passes with network requests forbidden, including
wheel anchor math, popup zoom, counter-free People Here entries, the three market
merchants, specialist potion/ration trades, inn services and new leisure outcomes.
See `feedback-v0.33.1-tests.json` and `verification-v0.33.1.json`.
Browser geometry, touch/device and screen-reader QA remain unavailable. This is
a selected regression gate, not a claim that the full historical suite passes.
Focus 15 remains unstarted.


## Focus 14 follow-up: Confirmed journeys and home recovery, v0.33.2

Hovering a known map marker shows its name. Single clicking a marker or printed
city label immediately selects the destination and displays its route. Confirm
Journey is the separate departure command; double-clicking a destination no
longer travels. Selection and hover leave every life and save slot untouched.
The map-only popup retains selection until it is closed for review and
confirmation. Wheel zoom, panning, Find Me, Expand and region-title fading remain.

Recovery now offers Go Home and Rest when an owned cottage, townhouse or estate
has the current settlement as its recorded address. The shortcut walks through
the actual local areas to Homes, then spends one real day restoring all Focus.
It resets days without rest, charges no room fee, uses no camping supplies and
does not cure medical conditions. Ordinary accrued living costs remain. Remote,
lost and unowned homes cannot provide this shortcut; current commitments and
interruptions still apply. Rest is also available in the actual Homes area.

The final selected regression gate passes **155 checks across ten files**, with
zero failures, cancellations or skipped checks. The standalone build succeeds:
82,270,022 bytes in ten parts, SHA-256
`22f079493c7f32bcbbd6bd84ea5b9acc03b6fa2e61f37eb028e98ef9325f7edb`.
The actual embedded script passes with zero network requests.
See [the implementation and verification record](journey-and-home-recovery-focus-14.md),
`feedback-v0.33.2-tests.json` and `verification-v0.33.2.json`. The muted palette
and existing saved homes, routes and discoveries remain. Focus 15 is unstarted.


## Focus 14 follow-up: Grounded portraits, equipment and enemies, v0.34.0

The art collection gains 878 people paintings: 216 complete four-age identities
and 14 additional elder faces across all eight ancestries. The former 18–64
adult stage now has Adult (18–39), Mature (40–54), Older (55–64) and Elder (65+)
art. New characters save their seven supported age stages. Existing selected
younger faces and family history remain recorded; older unlinked faces receive
a deterministic compatible age bridge that preserves observed complexion,
heritage, animal form and coat. Those bridges are not individually redrawn
copies of every original face. All 44 known Beastfolk cohorts are covered.

Two atlases add 128 item illustrations, including distinct art for all 44 gear
entries and recognizable supplies, loot and camping kits. Inventory, equipment
slots and situated trading use the same item artwork. Six enemy atlases add
384 paintings, with 40 additional ordinary species using appropriate habitat
pools and executable combat plans. Bosses stay outside ordinary encounter
pools. Creature labels are capitalized without rewriting personal names or
saved combat history. Three blurred transformation sheets receive 192 faithful
replacements while preserving their family and form IDs.

The existing muted yellow-gray palette and shared desaturation treatment stay
in place. Native crop review checked all 1,582 new or redrawn image cells.
Seven partial primary age sheets retain their actual seven rows; separate
elder sheets complete their identities without sampling nonexistent panels.
The standalone build embeds every production atlas and uses shared inventory
images rather than repeating image data in individual item elements.

See [the implementation record](grounded-art-focus-14.md),
`art-v39/verification.json`, `feedback-v0.34.0-tests.json` and
`verification-v0.34.0.json` for artwork and release checks. Browser geometry,
touch/device and screen-reader QA remain unavailable; semantic DOM/VM checks
exercise the actual standalone game with network requests forbidden. This
selected regression gate does not claim the full historical suite passes.
Current release evidence covers **418 selected passing cases**: 339 unaffected
passes from the initial 27-file run plus all 79 cases in the final six-file
rerun after the fallback correction. The standalone build contains 107,504,323
bytes in 13 parts, SHA-256
`096ee71732675019d8c75cce1dcce3b4adb36b8a7efe38cc944e22538ae7c07f`.
Its actual embedded game passes with zero network requests, including 216
mortal/transformed fallback cases.

Focus 15 remains unstarted.

## Focus 14 follow-up: Interface and portrait consistency, v0.35.0

The annotated review is addressed with a shared portrait/dialogue/choice layout
for situated services and Activities, a quiet daily record instead of the generic
adulthood panel, neutral Market naming and capitalized people’s role labels.
Saved lives can be deleted with a named confirmation and export option; slot,
backup, legacy-mirror, failed-write and neighboring-life behavior are verified.

A header inbox keeps actual letters, birthday gifts and health notices. New
receipts produce a short bottom-right popup and a muted two-note interface chime.
Read state persists without spending time, moving the character or granting a
second reward. The shared audio preference remains accessible in the inbox.

The portrait expansion adds 1,201 paintings: 512 standalone mature faces,
96 complete seven-age identities and 17 alternate infant faces across all eight
ancestries. This includes 608 new faces for ages 40–54. Measured crops,
full image-generation prompts and native hashes are kept in `art-v40/`. Full
grayscale applies on title, saved-life, creation, gallery and game surfaces;
existing explicit portrait choices and stable legacy age bridges remain valid.

See `interface-and-portrait-consistency-focus-14.md`,
`feedback-v0.35.0-tests.json` and `verification-v0.35.0.json`. Verification uses
native artwork review, semantic DOM commands and the actual network-free
standalone bundle. Browser geometry, touch/device and screen-reader QA remain
unavailable. Five historical entry/dialogue assertions were reproduced against
the published v0.34.0 baseline and are recorded separately from the selected
release gate. Focus 15 and the forthcoming quest/mechanics expansion remain
unstarted.

Final v0.35.0 evidence: **268 selected passing cases across 21 files**, no failures,
cancellations or skips; all **1,201 native portrait crops** verified. The actual
standalone game passes with zero network requests: 132,080,749 bytes in 16 parts,
SHA-256 `203ff83fb8e4aba429b0984bee6659bc7c794a58e2747a86b58f3561074e8fe6`.
