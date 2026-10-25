# Hearth & Oath — working notes for development

A single-player dark-fantasy life simulation in the browser. No framework, no
npm dependencies, no backend. The maintained source is `dist/js/` (ES modules);
`dist/` is also the playable site.

## Run and test

- `npm start` serves `dist/` on http://localhost:3000 (modules need HTTP).
- `npm run test:fast` runs the unit and engine files, a few minutes.
- `npm run test:slow` runs the long life-cohort and playthrough files.
- `npm test` runs everything serially (hours). `npm run release:check` is the
  formal gate (`docs/current-release-gate.md`).
- `node scripts/bench/engine-bench.mjs` times life generation, Age up and an
  action. Keep the numbers in the commit message when touching the engine.
- Tests that read `reference-art/` skip themselves when it is absent
  (`tests/helpers/reference-art.mjs`). That folder holds the original
  paintings and is not part of the source checkout.

## Architecture in one paragraph

`app.js` is the UI controller: module-level state, one delegated click handler,
and `render()` rebuilding the page from HTML strings. `engine.js` exposes pure
commands (`chooseAction`, `chooseEventOption`, `ageUp`, …) that copy the state,
mutate the copy, run `reconcile()` and return it. Subsystems get an
`engineContext` of callbacks instead of importing the engine, which keeps the
import graph acyclic (`scripts/build-offline.mjs` enforces this). Randomness is
`seededRoll(seed, salt, range)` from `world.js`: stateless, so determinism
depends on unique stable salts. Saves are a JSON envelope of three slots kept
in IndexedDB through the synchronous facade in `save-storage.js`
(localStorage is the fallback and the one-time migration source).

## Rules that still hold

- One simulation authority: UI read models never advance time, pay gold,
  create acquaintances or accept commitments.
- Record the actual deed, people, terms and dates at the moment of
  commitment. Never invent history for an existing save.
- Generated outcomes must stay deterministic for a seed. When optimizing,
  hash a few generated lives before and after (see the commit for
  `scripts/bench/engine-bench.mjs`).
- Player-facing text is in the game's voice, not an audit log. No
  "settled separately from the fee", no placeholder records.

## The new edition (v0.60+)

A life made by `createBirthGame` carries a debt ledger (`householdBudget.debt`,
v0.61) and a rolled station (`hero.station`, v0.62). Since v0.72.2 there is one
rulebook: no rule asks whether a life has the ledger, and `migrateSave` gives a
life from before it the stated defaults (`openLedger`: nothing owed; fortune
from the day it is read). The station is still a birth's own record and is
never invented; a parent without one passes none on (`heirStation`). Six
systems still begin only on a life with a station (see One rulebook below).
`station.js` is what a birth decides; `fortune.js` is luck by season
(money shocks from 18, hard winters before); `personality.js` carries the
chosen nature and `hero.marks`, what life wrote on it. Choices that exist
only for some natures carry `nature: traitId` on the choice.

`schooling.js` (v0.64) is letters, tuition, the examinations, electives
and the credentials that gate the learned trades; `education.schooling`
exists only on edition lives and `isLiterate` is true without it.
`living-world.js` (v0.65) is the actors with goals, the seasonal tick,
the events they make and the threads that route an event to someone the
player knows; `state.living` exists only on edition lives. It drives the
regional world (`regional-world-v33.js`: wars, fronts, deployments,
settlements) rather than duplicating it — on a living world the courts
start the wars (`startRegionalWar`) and the calendar's border tension and
luck's war tax are off. New threads follow the pattern: a `pending`-like
open thread, `flushLivingEvent` makes the scene, `applyLivingChoice`
answers it, `followUp` comes back later, `LIVING_EVENTS.ids()` registers
the ids, `validateLiving` the shape.

`guild.js` (v0.66) is the first path built with the whole anatomy (the
Bible's table: ways in, daily life, its own people, its own stories, the
world reacts, ways out, legacy); `state.guild` exists only on edition
lives. It reads the living world (the three guild actors, their strikes
and monopolies) and adds the member's side: `guild.member` with rank,
standing, dues, the road years, the assignment, the rival, the warden, the
apprentice; `guild.past` for a struck or abandoned name; `guild.heir` for
the name an heir inherits (`inheritGuild` in lineage's `createSuccessor`).
Its threads follow living-world's pattern with `GUILD_EVENTS`. The engine
applies `applyGuildGates` after the service gate so the monopoly's reason
wins over "Visit X at the Market". A family's ties go through
`addStationTie` (station.js, ten at most, the creditor kept); the validator
caps them at `TIES_MAX`. The next path should copy guild.js's shape rather
than living-world's: one state object, one `onXTime` seasonal tick, one
`applyXGates`, one `inheritX`.

`delve.js` (v0.67) is the dungeon as a place with a history: a premise
(authored for the five campaign dungeons, rolled by kind for the board's
descents), one floor template (approach, hub, chambers, a hidden secret,
the lair, the way), light and supplies instead of Focus-per-step,
perception cues by who you are (`CUES`), noise that wakes the halls, a
lair left alone that reaches the village through the living world
(`raidFromBelow`), and spoils with an owner (`delve_spoils`). `state.delve`
is the walk; `state.delves.places[id]` is what a place remembers. On an
edition life every dungeon entry (`startDungeon`, `adventure_descend`,
`explore_enter_*`) goes to the delve; the maze and the older room engine
stay for legacy saves. Battle contexts must be strings and `kind: 'delve'`
is in `validBattle`'s list; defeat below ground is death (`afterDelveBattle`)
except on `gentle`. Tests that are about the maze on an edition life
`delete s.delves`, the way they `delete s.mazeBook` to reach the older
engine; `getActions` returns only `delve_*` actions while below. The
playtest Player (`scripts/playtest-story.mjs`) walks a delve with `delve()`
the way it walks a maze, so the campaign playthroughs cover the authored
delves end to end.

`battlecraft.js` (v0.68) is the fight on an edition life: `state.battlecraft`
(the arts learned, the injuries, the bestiary, the record, a pending
scene) and `battle.fieldVersion = 68` on every battle `createBattle` makes
for one. combat.js keeps the engine and calls the hooks (`assignRows`,
`fieldActions`, `applyFieldCommand`, `fieldAttack`); the reach rule lives
in enemy-targets.js (`reaches`) so both sides use it; danger by place means
no hero-level growth on the field and `placeTier` for roaming fights.
Injuries apply through `injuryModifiers` in `makeHero` and
`applyBattlecraftGates`; a wound fever goes through health.js's
`inflictCondition` (`ctx.inflictCondition`). A companion's death goes
through `ctx.killPerson` so the family book agrees with the roster — a
mock context without it leaves the save invalid. The legacy golden
fixtures (combat, tournament-ordinary-golden, second-wind-balance) have no
station and must keep passing unchanged; an edition fixture that wants the
old battle page does `delete s.battlecraft` (grounded-enemies-v39 does).
The playtest Player aims at what it can reach.

`faith.js` (v0.69) is the church as a path, in guild.js's shape:
`state.faith` (the member, the past, the heir, the threads) on edition lives
only; `realm.faithId` stays the congregation and the cloth is what a few of
it take (`faith_novice` wants the congregation first). Ways in are the
oblate scene, the shrine door, the Seminary's `orders` credential and the
vow after a grief; the house's seat is the region's shrine city
(`faithSeat`), the prior is that site's keeper, and every faith has an open
and a strict wing (`WINGS`) that colours the purge-at-the-door and heresy
scenes. The tick is `onFaithTime`, the gates `applyFaithGates` (they win over
the room's reason, as the guild's do), the inheritance `inheritFaith` (which
also sets the heir's `realm.faithId`, since lineage wipes it). budget.js
waives rent for a brother, keeper or prior. The validator ties
`faith.member.faithId` to `realm.faithId`, so the congregation actions are
gated under the cloth. Faith actions show at the shrine room: the keeper's
`serviceAccepts` and the `needs` regex in world-services.js and the shrine
regex in exploration-ui.js all list `faith_`. In tests that tick the
module directly, move `s.day` before calling `onFaithTime`: the tick runs
from `lastSeason` to `seasonOf(newDay)`, so a second call with the same day
does nothing.

`edition.js` (v0.70) says which rulebook a save lives by: `rulesOf` reads
the same two markers the rules check, `stampEdition` writes
`state.edition = {rules, began, step}` at birth (`createBirthGame`), on
every load (`migrateSave`) and again at the end of `createSuccessor` (the
heir's budget decides its rules after the birth), and `validateSave` checks
it. `began` is the version a life was begun in and is `null` for every life
from before v0.70 — never date a save after the fact. `step` is the
migration step a new-rules save has been brought through; a release that
changes what a new-rules save holds adds a step to `STEPS` and states the
default it gives older lives in its README entry. The Old Rules archive is
the `v0.69-archive` branch (v0.69.0 with its storage renamed
`hearth-and-oath-legacy`, the same labels, and an import that refuses a
new-rules life); `scripts/build-archive.mjs` packages it into `out-legacy/`,
and `dist/js/archive-link.js` is where the main game learns its address.
The public archive is now published by v0.71.2 at its own address; the full
browser handoff remains incomplete, and all compatibility code stays.
`tests/fixtures/saves/` are real saves written by past releases' own engines
(`scripts/fixtures/generate-release-saves.mjs` against a worktree at the
release's merge commit); regenerate rather than hand-edit them. Volume II's
interface and voice measuring tools report their findings. From v0.71,
`npm run build` invokes the content validator with `--strict`, so invalid
content fails the build. Their numbers for a release are committed under
`docs/measures/`.

Test fixtures that are not about birth should pin a station
(`station: rollBirthCircumstances(seed, 'common', ancestry)`): a bound
child may die of a winter fever, gets no pocket money and is not schooled,
and a `household: 'poor'` birth is bound a third of the time. Growing loops
need a guard and an answer for `hard_winter` (`'endure'`), and a journey
policy needs `debt_reckoning: 'plead'`. A fixture that documents the rules
a legacy save keeps (free school, the service scholarship) is born with
`station: null`. On an edition life the village school wants 10 gold at
enrolment and the shrine keeper may not have a place; a fee is always the
action's displayed `cost`, taken once by the engine.

Two engine facts that bit the schooling handlers: for every action prefix
not in `performAction`'s `experienceHandlers` list (`school_`, `family_`,
`career_` …) the engine spends `days` and `cost` before the handler runs,
so the handler must not spend them again, and must not re-check the purse
(`blocked()` in household.js ignores the "Requires N gold" reason); and
after a `school_`/`career_`/`health_` action the engine overwrites the last
new journal line of that tag with a receipt ("… 2 days passed.") unless the
line was written with `ctx.journalLiteral` (schooling.js's `note()`).

## The farmer's life (v0.71)

`farmer.js` is the bounded Volume II proof, not the later general engines.
`state.farm` is created only at a new common/bound birth, with an
`openingAge` of sixteen or the older chosen start. Step 71 invents no farm
for an older save. Its actions and scenes go through the public engine;
the time hook queues turns and reconciliation opens them after the current
handler. Scene work keeps its captured choice, fee and remaining days when
a birthday interrupts it. Manual action fees are paid by the engine once.
The farmer's due replaces station dues while that same field is held, so
the budget cannot charge it again. `inheritFarm` runs after `inheritSociety`
and after the successor's people and budget are rebuilt: local peer IDs
can be reused, so a remembered neighbour is rebound to the actual named,
dated world person. Loans follow the actual retained lender or their existing
stable lineage record, including a dead or absent relative. Harvest help
captures its actual person, agreement day and target season; a replacement
neighbour does not inherit that work. The redundant public successor budget
reset must not erase farm burdens. `validateFarm` checks the captured records.

Content is authored under `content/farmer/`. The build strictly validates
the whole tree, then compiles only this production folder into
`dist/js/content/`; examples remain examples. `farmer-ui.js` reads the Day,
people, plan and Book without creating people or advancing the world.
Private ambitions and personal promises are distinct; the acquired
`oathbreaker` mark records a broken personal promise without requiring a
paladin. The six-to-eight-player gate remains NOT RUN until real session
notes and a verdict exist in `docs/playtests/farmer-v071.md`. Do not widen
this slice before that verdict, or remove legacy rules before the archive
has a verified public home.

The implementation shipped as a playtest candidate in
[PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15).
`docs/measures/farmer-v071-verification.md` records 3,939 selected passing
assertions and five skips, with the composite FAST/SLOW snapshot limits.
It is not a strict single-snapshot software-gate PASS. Sites version 104 is
published; exact source, merge and deployment records live in
`claude/edition-progress.md`. The human gate is NOT RUN.

The v0.71 session kit shipped in [PR #16](https://github.com/mandyp1411-coder/hearth-and-oath/pull/16)
and lives under `docs/playtests/farmer-v071/`. Its two
standard JSON starts are untouched production age-entry output; keep their
actual generated history and pending sixteenth birthday. The manifest and
preparation checks distinguish saved files, disposable command probes and
the one observed live import. Player materials exclude the observer's
recall questions. These fixtures and blank forms are preparation, not
participants or acceptance evidence; no version bump or runtime change is
part of the kit.

v0.71.1 repairs only the farmer's opening birthday. `childhoodEvent` retains
the authored hint for a matched age-sixteen farmer scene; the general fee
filter is unchanged. `farmer-opening.js` is a pure voice reader for old
captured birthdays. It matches age, day, title, body and ordered choices,
uses only the captured typed effect, and refuses unsupported time/fee
quotes. Money loss is clamped to the actual purse; bodily wellbeing is
distinct from combat Health; dead people receive no inferred bond effect.
Neither the event nor the pending story is rewritten on display or import.
The version is a bounded repair while the human gate remains NOT RUN.
Full frozen FAST/SLOW runs passed 3,947 cases, zero failures and five skips;
four targeted offline checks pass. The formal full gate is NOT RUN. Exact
scopes, proof seals, publication and the 200px birthday-layout limit are in
`docs/measures/farmer-v0711-verification.md`. PR #17 is merged and Sites
version 105 is published; the edition ledger retains their exact IDs.

## The archive's public home (v0.71.2)

`archive-link.js` names the verified public archive. Old-rule slots and
import reviews offer the link; exports remain complete copies. The archive
builder pins `065d54cd91c8cfea390ba0f71fb046351153d6fa` and applies
`scripts/archive-compatibility.patch` in a disposable worktree. It accepts
only the additional old step 71, preserves that exact stamp, and rejects
actual new-rule markers before migration. Its original gameplay and
isolated storage remain. Hosting contains the small loader alias; the full
standalone is kept under `artifacts/old-rules-archive/`. The final host size
is checked after adding the archive manifest.

PR #18 is merged; main Sites 106 and archive 1 are published. Fresh complete
FAST/SLOW runs passed 3,949 assertions, zero failed and five skipped;
strict lanes remain FAIL. Sixteen source-engine cases and one compiled
startup checker pass, with auxiliary evidence failures preserved. The
formal full gate, other 29 offline checks, browser round trip and real
farmer playtest remain NOT RUN. See `docs/measures/archive-v0712-verification.md`.
The owner stopped further farmer-opening layout polish. No Phase 2 engine
or legacy deletion is included.

v0.72 preparation lives in `docs/one-rulebook-v072.md` and
`scripts/plan-one-rulebook.mjs`. The inventory is textual discovery, not
automatic deletion. Keep the shared save decoder able to retain complete
old slots and backups: rejecting them there can make mixed occupied slots
look empty. New-rule historical lives can still hold older maze/battle
modes; their flags are not old-rule classification. The new retention tests
protect occupancy, complete exports and backup review. No cutover is
included before the outstanding archive/browser and human gates.

The first v0.72 runtime refactor separates `createSaveStore`'s retained
decoder from optional `acceptPosition` write admission. Default callers
still accept both rulebooks. The predicate sees a detached decoded snapshot;
only synchronous literal true admits an ordinary write/replacement or
Ironman create/import/continue commit. Never apply that policy to retained
reads, authority discovery, archive/delete, revocation or death cleanup.
This is not the later simulation-entry policy. The genuine v0.61 fixture
comes from its own merge engine: zero debt without a station is new rules.
Keep the fixture's source/provenance and unedited historical output.
The first storage slice's frozen development replay passes 448 tests in 25
files with zero failures/skips, plus one full compiled session with 14 cases.
`docs/measures/one-rulebook-v072-storage-verification.md` retains raw proof,
exact identities and the omitted full release/browser/human gates. PR #19
remains draft; the main Site is not redeployed by these checks.

The next v0.72 slice connects an unset `positionAdmissionPolicy` through
`life-entry.js`, the store and `ironman-session.js`; it still admits both
rulebooks. Reviewed ordinary replacements capture their exact payload and
check the current view and policy again inside the save lock. Ironman entry
passes raw `acceptForPlay` callbacks for locked actual-head checks, while
export/lifecycle/death cleanup remain unfiltered. Preserve uncertain request
obligations on refusal. Never activate the cutover before raw old-save
export/recovery and the archive/browser/human gates are complete.
The connected entry slice's own frozen replay passes 500 selected tests in
31 files, zero failures/skips, plus one compiled session with 14 cases.
`docs/measures/one-rulebook-v072-entry-verification.md` records exact source,
artifact and raw proof separately from the earlier storage-only snapshot.
Current app handlers retain the unset policy; configured policies are tested
at actual coordinator/store/session boundaries, not claimed as a complete
restrictive-policy UI review. No cutover or publication is included.

## One rulebook (v0.72)

The main game plays the new rules only. `rulebook.js` is the one place the
entry policy and the store's decoder come from: a stored life enters play when
its own stored markers, a station or a debt ledger, say new rules (`rulesOf`),
never on a claimed stamp, so v0.61 debt-only lives play on. The engine has one
rulebook (v0.72.2): `migrateSave` reads any life it can into it, so the door is
the store's decoder, not the engine; keep the app's decoder
`storedLifeDecoder(migrateSave)`. Still to go: the six station-gated systems
(`edition = s => !!s.hero.station` in living-world, guild, faith, delve,
battlecraft and schooling) wait for v0.72.3; until then a life without a
station keeps the maze, the older battle page and free school. New-rules lives
begun before v0.67/v0.68 can hold an older maze or battle in progress, and the
maze is still the regional and contract descents' engine on every life.

An old-rules life meets its door and opens nothing. From v0.72.1 the app's
store decoder is `storedLifeDecoder(migrateSave)`: it reads a
stored life only when its own raw markers say new rules, so an old life is
never decoded or migrated here. The store keeps a stored life it cannot
decode (`slot.kept`, `backups[id].kept`, `store.kept(id)`, and a mirror-only
life as slot 0's kept life): written back byte for byte, never empty, never
overwritten by a live write, replaced or deleted only by review. In app code
ask `occupantOf(id)` rather than `saveStore.read(id)` when the question is
whether a slot is free. The title continues the newest decoded life or shows
the kept one; a kept slot says Kept for the archive; an old file is read raw
and meets `OLD_RULES_DOOR`; an old backup kept undecoded meets
`OLD_RULES_BACKUP_DOOR` with its export (`keptOldBackup`).

An Ironman record whose life the decoder refuses is a kept run
(`found.kept` in saves.js `discover`; only a whole, well-formed record whose
life is refused is kept, one that decodes to something else is still
unreadable). It holds its slot (`displaySlots` row with `kept` and
`ironman: true`; `protectedTarget`, `emptyTarget`), and the only inspection
it answers is `export` (`keptInspection`): every other intent, commit and
reattachment returns `kept-position`. Its review (`keptRunDialog`) exports
it, releases the slot (`archiveIronman`, which re-persists the same life
with no attachment) or deletes it; a released kept run is listed by
`listRecoverableIronman` with `kept: true`. Export a kept run through
`exportKeptIronman`, never by downloading `store.kept(id)` directly.

Tests mount the game as players get it. A feature test that plays an old
capture reads it into the one rulebook first (`readIntoRulebook` in
`tests/helpers/one-rulebook.mjs`, or `migrateSave`); a test of the archive's
door stores the old life as it was written (the raw fixture), because the main
game never reads one into play. Store and session tests that need a decoded
old position use a reader that keeps an old life as its own stored rules
(`readBoth` in save-admission and ironman-entry-admission). No module may read
`import.meta` (the offline builder refuses it). Whole-life comparisons in tests
should compare JSON text: a failing `deepEqual` on two whole lives renders a
diff that can exhaust the machine's memory.

## Direction

The v0.59.0 analysis and the owner's design direction live in the Claude
project "Hearth and Oath". In short: birth decides a lot and most births are
hard; education is rare and earned; nature shapes choices and how people treat
you; every path (guild, war, faith, crime, curse) is built with the same
anatomy as the curses; dungeons and combat are deadly and tactical; the world
moves without the player and its stories reach them through their own people.
Edition policy: new systems apply to new lives; old saves keep loading on the
version that made them.

The farmer's cards use the pure `householdCostPreview`: a direct payment and
the house's keep are different costs, and both stay visible without the
numbers toggle. Ordinary actions may leave keep due for a later collection;
timed scenes collect it after actual work. A prepaid birthday resume shows
remaining days, the original payment and the current keep estimate. Do not
repeat the original full price as though it were due again.

Offline checkers use `scripts/lib/offline-module-vm.mjs` to await the
standalone's asynchronous entry. Full module scope is the default and the
v71 checker exercises native startup, farmer costs, exports and save
isolation. Older lexical or repeated-session probes explicitly use the
unchanged graph prefix plus module entry; seventeen share only the exact
frozen inert artwork/music table to bound VM memory, restoring native JSON
parsing before app startup. Their reports must retain that scope limit.
