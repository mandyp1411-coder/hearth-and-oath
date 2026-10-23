# The content schema (v0.70)

Volume II of the Design Bible: scenes, threads, foes, places, landmarks,
ambitions, plays and dialogue move into data files with a schema each, read
by the engine. A validator checks every file at build: roles that exist,
conditions that parse, voice that passes the lint, no placeholder.

In v0.70 the validator **reports only** and the engine does not yet read the
data. v0.71 (the farmer's life) is the first content authored as data against
these schemas, so the shapes here mirror what the engine's authored scenes
already do in `faith.js`, `guild.js` and `living-world.js`: a thread
`{ id, def, roles, season, stage, choice, followUp, memory, closed }`, a
scene `{ id, title, text, choices: [{ id, label, nature? }] }` made by
`flushXEvent`, and `applyXChoice` applying the effects. Every effect op below
names the engine call it stands for.

| What | Where |
| --- | --- |
| The schemas, as validator functions | `scripts/content/schema.mjs` |
| The condition language | `scripts/lib/conditions.mjs` (pure; moves into `dist/js/` unchanged when the engine reads content) |
| The voice check | `scripts/content/voice-check.mjs` — one function, `voiceCheck(text)`; the integrator swaps in `scripts/lib/voice-rules.mjs`'s `lintText` when it lands |
| The validator | `node scripts/content/validate.mjs [--strict] [--snapshot docs/measures/content-validation-v070.md]` |
| The compiler | `node scripts/content/compile.mjs [--out dist/js/content]` — not run against `dist/` in v0.70 |
| Examples (not game content) | `content/examples/*.json`, one file per kind, farmer-flavoured |
| Broken fixtures (tests only) | `tests/fixtures/content-invalid/` |
| The test | `tests/content-schema.test.js` (fast lane) |
| The report | `artifacts/content-validation/report.{json,md}` (gitignored); snapshot in `docs/measures/` |

`content/examples/` holds **examples, not game content**: one valid file per
kind so the validator has real input and v0.71's author has a template. The
three files under `content/expansion-v27/` are **design assets** the engine
does not read; the validator recognises them by the folder (they carry no
`kind`) and asks only that they parse and hold no unwritten text.

## The file

Every content file is one JSON object:

```json
{ "kind": "scene", "schemaVersion": 1, "note": "optional, for people", "items": [ … ] }
```

`kind` is one of `scene`, `thread`, `foe`, `place`, `landmark`, `ambition`,
`play`, `dialogue`, `design-asset`. Files may be split any way under
`content/`; ids are unique **per kind across the whole tree**.

## Common to every item

- `id` — lower-case kebab or snake case (`fence-between`, `faith_oblate`), up to 80 characters, unique per kind.
- `when?` — a condition (below). Most kinds have one; threads say `opens`/`closes`, ambitions `offeredTo`/`fulfilled`.
- `roles?: [{ id, kind, required? }]` — the people the item needs. `id` is a word (`neighbour`, `oldFriend`); `kind` is from the closed list below; `required` defaults to true (an item whose required role cannot be filled is not offered).
- Text fields may carry placeholders `{roleId.field}` with `field` one of `name`, `they`, `them`, `their`, `theirs`, `home`, `trade`, `honorific`. The role must be declared; `hero` is implicit everywhere, and `speaker` in a dialogue. `{name}` without a dot, `${…}`, or an unknown field is an error.
- Every text field is read by the voice check: an unwritten phrase (`TODO`, `TBD`, `lorem`, `placeholder`, `undefined`, `[object Object]`, `${`) is an error; an audit-log phrase (`recorded`, `category`, `settled separately`, `accrues`, `not a promise of`, `Choose this action`) is a warning counted as a voice hit. Empty text is an error.

### Role kinds

Anchored on where the engine finds such a person today.

| Kind | Filled from |
| --- | --- |
| `spouse` | `life.partnerId` |
| `parent`, `sibling`, `guardian` | `life.people` with that `familyRole` |
| `child` | `life.children` |
| `kin` | living-world `presentKin`: any present family member |
| `friend`, `rival`, `suitor` | `life.people` with that `role` (a guild or faith rival is the member's rival) |
| `neighbour` | living-world `neighbourOf`: a society person at the home settlement |
| `companion` | the party roster |
| `mentor` | `progression.mentors` |
| `apprentice` | `guild.member.apprentice` |
| `classmate`, `master` | `education.schooling` classmates and the apprenticeship bond's master |
| `lord` | the station tie that holds the land the family works |
| `reeve` | the lord's officer in a village — no filler yet; v0.71 adds it |
| `keeper` | `realm.sites[id].keeper` |
| `prior`, `warden` | `faith.member.prior`, `guild.member.warden` |
| `creditor` | the station tie of kind `owes` |
| `sergeant`, `officer` | the levy's sergeant, the court's officer (living-world conscription and purge) |
| `named-person` | a name made for the thread with `generatePersonName` |

Roles of kind `lord`, `reeve`, `creditor`, `sergeant`, `officer` and
`named-person` are not people in `life.people`, so `bond` and `death` cannot
name them.

## The condition language

`scripts/lib/conditions.mjs`. A condition is a string. Comparisons
(`== != < <= > >=`) on dotted paths, functions, string literals in single
quotes, numbers, `true`/`false`, `and`/`or`/`not` (in that order of binding,
`not` tightest) and parentheses. The parser gives an AST and errors with the
position of the fault; `evaluate(ast, scope)` reads a plain object.

```
age >= 16 and season == 'spring'
has(nature, 'brave') and not mark('drinker')
credential('letters') and standing.villagers > 10
hero.station.household == 'poor' and (age > 30 or flag('field_kept'))
in(season, 'spring', 'summer') and knows('neighbour')
```

Functions: `has(list, value)` membership; `in(value, a, b, …)`;
`mark(id)` (scope.marks); `flag(id)` (scope.flags); `knows(roleKind)`
(scope.knows); `credential(kind)` (scope.credentials). A comparison across
types is false, never coerced; a missing path is `undefined`.

The scope a condition may read is a contract that v0.71's scope builder
produces from a state. The validator rejects a path outside it and a literal
the path can never equal.

| Path | Values |
| --- | --- |
| `age`, `day`, `year`, `gold`, `debt`, `stress`, `joy`, `health`, `devotion` | numbers |
| `season` | `spring`, `summer`, `autumn`, `winter` (`seasonOf(day) % 4`, the calendar's order) |
| `literate`, `married`, `children` | boolean, boolean, a count |
| `hero.name`, `hero.profession`, `hero.calling` | strings |
| `hero.ancestry` | the eight ancestries |
| `hero.pronouns` | `he/him`, `she/her`, `they/them` |
| `hero.station.id` | `bound`, `common`, `trade`, `gentry`, `noble`, `royal` |
| `hero.station.household` | `poor`, `tradesfolk`, `noble` (the station's `means`) |
| `hero.station.freedom` | `free`, `bound`, `owned` |
| `hero.station.literate`, `hero.station.rank` | boolean, the ladder's word |
| `standing.<who>` | `villagers`, `academy`, `order`, `underworld` (factions) and `guild`, `faith` (the member's standing in the hall or house) |
| `skills.<id>` | `weapons`, `defense`, `arcana`, `devotion`, `stealth`, `survival`, `scholarship`, `persuasion` |
| `attributes.<id>` | `strength`, `agility`, `vitality`, `intellect`, `willpower`, `presence` |
| `nature`, `marks` | arrays of trait ids (for `has`) |
| `flags.<any>` | story flags |
| `credentials`, `knows` | arrays (for `credential`, `knows`) |
| `guild.member`, `guild.rank`, `guild.craft`, `guild.standing` | boolean; `journeyman`, `master`, `warden`, `guildmaster`; `blacksmith`, `merchant`, `miner`; number |
| `faith.member`, `faith.rank`, `faith.standing`, `faith.wing`, `faith.congregation` | boolean; `oblate`, `novice`, `brother`, `keeper`, `prior`; number; `open`/`strict`; a faith id |
| `home.tier`, `home.place`, `home.region`, `home.type` | `lodgings`, `cottage`, `townhouse`, `estate`; ids; a region id; a place kind |
| `here.place`, `here.region`, `here.type`, `here.shrine`, `here.settlement` | where the hero stands |

## Effects

A closed vocabulary; an unknown op is an error, as is an unknown or missing
argument. Each row names what the engine does for it today.

| Op | Arguments | The engine |
| --- | --- | --- |
| `standing` | `who` (a standing above), `by` (±1..100) | `ctx.standing(faction, n)` in engine.js; `member.standing = clamp(…)` in guild.js and faith.js for `guild`/`faith` |
| `gold` | `by` | `s.hero.gold += n` (living-world strike, faith tithe) |
| `stress` | `by` (±1..100) | `s.life.stress` clamped 0..100 (faith `stress()`, living-world `stress()`) |
| `joy` | `by` | `s.life.happiness` (faith `joy()`) |
| `health` | `by` | `s.life.health` (fortune.js, the hare under the coat) |
| `wound` | `share` (0..1) | `s.hero.hp -= Math.round(maxHp * share)` (living-world wolves and levy) |
| `devotion` | `by` | `s.realm.devotion` (faith `devote()`) |
| `skill` | `id`, `by` (1..3) | `s.hero.skills[id] += n` (engine `skill()`; living-world +1 survival, persuasion, weapons) |
| `mark` | `id` (a trait), `title?`, `text?` | `shiftNature(s, id, title, text)` in personality.js — what life wrote on the hero; the opposite nature goes |
| `tie` | `kind` (`owes`/`knows`/`hates`), `role` or `name`, `note` (≤120) | `addStationTie(s, { kind, name, note })` in station.js; a literal name as living-world's `'the officers of the purge'` |
| `bond` | `role` (a person), `by` (±1..100) | `person.bond` clamped 0..100 (living-world and guild `bond()`) |
| `journal` | `title?`, `text`, `tag?` | `ctx.journalLiteral(title, text, tag)` — the line the player reads |
| `memory` | `text` (≤300) | `t.memory.push(text)` — what the thread remembers (faith `say()`) |
| `followUp` | `scene`, `seasons` (1..40), `chance?` (1..99) | `t.followUp = { season: season + n }` then `followUp()` later; the scene is a cross-reference |
| `open` | `thread` | `openThread(s, def, roles)`; a cross-reference |
| `flag` | `id`, `value` (boolean/number/string) | `s.flags[id] = value` |
| `death` | `role?`, `cause`, `title?`, `text?` | `ctx.endLife(cause)` without a role (faith's doorway); `ctx.killPerson(id, cause, day, { title, text })` with one (living-world levy, sickbed, purge) |
| `evidence` | `by?` (1..10), `text` | `ctx.addEvidence(amount, description)` |
| `obligation` | `id`, `title`, `days` (1..365), `text` | `ctx.addObligation(id, title, days, description)` (living-world bedside) |
| `place` | `security?`, `prosperity?` | `site.security` / `site.prosperity` of the home site, clamped (living-world `markEvent`, `wolves_return`) |

Choices and replies also carry `tags?: [...]` from personality.js's
`INTENT_TAGS` (`care`, `give`, `truth`, `deceit`, `take`, `courage`, …): the
engine's `personalityTags({ intentTags })` reads them to move stress by nature
and how a people holds you. `nature?: traitId` marks a choice offered only to
that nature, as `natureChoice` does today.

## The kinds

### scene

```json
{ "id": "fence-between", "title": "The fence between", "text": "…{neighbour.name}…",
  "once": true, "season": "spring", "when": "age >= 16 and knows('neighbour')",
  "roles": [{ "id": "neighbour", "kind": "neighbour", "required": true }],
  "choices": [{ "id": "ask", "label": "Ask the reeve to walk the line", "cost": { "days": 1 },
                 "risk": "…", "nature": "generous", "when": "…", "locked": { "when": "gold < 30", "reason": "…" },
                 "tags": ["truth"], "effects": [{ "op": "standing", "who": "villagers", "by": 2 }], "result": "…" }] }
```

Required: `id`, `title`, `text`, `choices` (1..6, ids unique). A choice
requires `id`, `label`, `effects` (may be empty), `result` (what the player
reads after). `cost` names `days` and/or `gold`; `locked` shows the choice
greyed with its reason when the condition holds (the engine's
`disabledReason`); `when` hides it. The house convention — `continue` is the
choice that lets the world take its course — is a warning when missing.
See `content/examples/scene.json`.

### thread

```json
{ "id": "the-lords-rent", "roles": [{ "id": "lord", "kind": "lord" }],
  "opens": "age >= 18 and knows('lord') and season == 'autumn'", "closes": "hero.station.id != 'common'", "cooldown": 8,
  "stages": [{ "id": "door", "scene": "rent-door", "after": { "seasons": 0 } },
             { "id": "reckoning", "scene": "rent-reckoning", "after": { "seasons": 1 }, "when": "not flag('rent_paid')" }] }
```

Required: `id`, `opens`, `stages` (1..12). Each stage names a scene that must
exist, `after.seasons` since the stage before (0..80), and may have a `when`.
`cooldown` is seasons before the same thread may open again (the engine's
`THREAD_COOLDOWN`). The thread carries the roles its scenes read (the engine's
`t.roles`), so it must declare every required role of every scene it routes
to, by the same id and kind (`ref.role-unsupplied`, `ref.role-kind`); the same
holds between a scene and the scene its `followUp` names. An optional role
(`required: false`) need not be supplied.

### play

```json
{ "id": "harvest-gamble", "life": "farmer", "title": "The harvest gamble", "setup": "…", "when": "season == 'autumn'", "days": 9,
  "stages": [{ "id": "wait", "text": "…", "odds": { "skill": "survival", "base": 45, "words": { "good": "…", "bad": "…" } },
               "success": [{ "op": "gold", "by": 24 }], "failure": [{ "op": "stress", "by": 10 }] }],
  "fallout": "…" }
```

Required: `id`, `life` (`farmer`, `trader`, `healer`, `lord`, `thief`,
`cleric`, `mage`, `soldier`), `title`, `setup`, `when`, `days` (1..120),
`stages` (1..6), `fallout`. `odds.base` is the chance in 0..100 before the
skill; `words.good`/`bad` are the clause the result reads.

### ambition

Required: `id`, `title`, `offeredTo` (condition), `fulfilled` (condition),
`saying` (the text the heir inherits when it was kept). Optional `shame` (the
text for a promise broken), `turns: [{ when, text }]` (up to 8), `roles`.

### landmark

Required: `id`, `region` (a region id), `name`, `plate` (the words on the
map), `premise`, `scenes` (scene ids that must exist; may be empty), `states`
(1..8 of `{ id, when, text }`).

### place

Required: `id`, `name`, `kind` (a world location type — `village`, `city`,
`forest`, `ruin`, `mountain`, `marsh`, `coast`, `tower`, `camp`, `gate`,
`citadel`, `sanctuary` — or a building: `farmstead`, `manor`, `hall`,
`shrine`, `inn`, `market`, `mill`, `barn`, `house`, `dungeon`), `rooms`
(1..12 of `{ id, name, text?, offers }`). `offers` lists action prefixes
(`faith_`, `farm_sow`, `rest`): the room shows the actions whose ids begin so.

### foe

Required: `id`, `name`, `role` (`beast`, `undead`, `spirit`, `construct`,
`aberration`, `humanoid`), `pattern` (the engine's aiKeys and the v27
patterns: `striker`, `barbed`, `leech`, `hexer`, `warder`, `sniper`,
`keeper`, `thornheart`, `covenant`, `captain`, `archivist`, `warden`, `pack`,
`ritualist`, `ambusher`, `charger`, `disruptor`, `healer`). Optional `tier`
(1..3, battlecraft's `placeTier`), `signature`, `telegraph`, `weakness`
(`physical`, `fire`, `ice`, `lightning`, `sacred`, `none`), `resistances`
(`burn`, `bleed`, `fear`, `poison`), `habits` (1..6 lines), and `cadence` /
`context` as `encounter_design_v27.json` writes them. Every v27 species
validates when wrapped as `kind: "foe"` (the test checks all 48).

### dialogue

```json
{ "id": "spouse-at-the-hearth", "role": "spouse", "voice": "warm", "when": "married",
  "lines": [{ "id": "the-day", "when": "…", "text": "…",
              "replies": [{ "id": "tell", "text": "…", "nature": "honest", "tags": ["truth"], "effects": [{ "op": "bond", "role": "speaker", "by": 2 }] }] }] }
```

Required: `id`, `role` (a role kind: who speaks), `voice` (`blunt`, `pious`,
`sly`, `frightened`, `warm`, `cold`, `learned`, `plain`, `wry`, `weary`,
`proud`), `lines` (1..40 of `{ id, when?, text, replies? }`, up to 5 replies
each). `speaker` is an implicit role of the dialogue's kind, so
`{speaker.name}` and `bond { role: "speaker" }` work. The report counts lines
per role against the Bible's target of 15–20.

### design-asset

A file under `content/expansion-v27/` without a `kind`, or any file with
`kind: "design-asset"`. Its shape is its own; the validator asks that it parse
and that no string holds an unwritten phrase. Its `{name}`-style tokens are
its own template fields and are not checked as role placeholders.

## Where this deviates from the brief, and why

- **`nature { trait, by }` is not an effect.** The engine never adds to a
  trait; natures move through `shiftNature` (the `mark` op) and through the
  intent tags a choice carries (`personalityTags({ intentTags })`), so choices
  and replies carry `tags` instead.
- **`evidence { court?, text }` is `evidence { by?, text }`.** There is one
  court book (`s.legal.evidence`, `ctx.addEvidence(amount, description)`), not
  one per court.
- **Added ops the three modules use on every page:** `bond`, `memory`,
  `wound`, `obligation`, `place`. **Not added**, because one call each or no
  scene uses them: `family.support` (the oblate), `companionOpinion` (the
  guild secret), `startBattle` (the delve). v0.71 adds what it needs.
- **Compiled modules use named exports** (`SCENES`, `SCENES_BY_ID`), not
  `export default`: `scripts/build-offline.mjs` inlines each module by
  stripping `export ` and destructuring `import { … } from './x.js'`, and a
  default export would not survive it. The modules import nothing.
- **`foe.tier` is optional**, since the v27 species carry none; `habits` is
  the field a bestiary line goes in.
- **`choice.result` is required**: a choice the player cannot read the
  consequence of is a choice half written. `locked { when, reason }` carries
  the engine's `disabledReason` as its own field rather than overloading `when`.
- **A design asset may be a JSON array** (`regional_stories_v27.json` is one).

## Running it

```
node scripts/content/validate.mjs                 # report to artifacts/content-validation/
node scripts/content/validate.mjs --strict        # exit 1 on errors (v0.71's build step)
node scripts/content/validate.mjs --snapshot docs/measures/content-validation-v070.md
node scripts/content/compile.mjs --out /tmp/out   # modules per kind; refuses a tree with errors
node --test tests/content-schema.test.js
```
