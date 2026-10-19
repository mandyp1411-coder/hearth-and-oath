# Eight civilian lives: audit and replay

These are eight distinct characters, born at age zero in different seeded worlds. Each completed a real life chapter through the public game API, reaching retirement between ages 50 and 62. Replays use the same identities to compare changes and are not counted as additional unique lives.

The driver is `scripts/playtest-careers.mjs`. It never assigns age, gold, skills, relationships, world facts or events. It validates every resulting save, checks that the previous save was not mutated, and records the real offered choices, selected responses, elapsed calendar time, gold, health, happiness, stress, skill and career ledgers. Complete transcripts and terminal saves are in `artifacts/playtest/career-<profession>-baseline.json` and their improved equivalents. The tracked summary is `careers-baseline.json`; the final replay comparison is `careers-improved.json`.

## What was actually played

| Character and seed | Birth and roleplay intention | Genuine terminal chapter | Baseline calls / decisions | Baseline gold |
| --- | --- | --- | --- | --- |
| Tamsin Hearth · `career-audit-hinge-71` | Poor, homeless village child; honest smith, family, credited apprentice | Retirement at 55 | 422 / 126 | 153,786 |
| Maren Reed · `career-audit-seed-203` | Brook household with two parents; farmer serving neighbors and family | Retirement at 60 | 485 / 147 | 160,268 |
| Osric Door · `career-audit-door-619` | Poor coast household with one parent; innkeeper with a household and apprentice | Retirement at 58 | 445 / 138 | 162,004 |
| Sable Coin · `career-audit-price-937` | Noble city household; merchant who prioritizes premiums and knowingly conceals a deficient first delivery | Retirement at 50 | 267 / 101 | 143,932 |
| Liora Witness · `career-audit-song-1211` | Poor orphan from a caravan camp; bard preserving witnesses and sharing credit | Retirement at 52 | 350 / 115 | 135,175 |
| Aster Paths · `career-audit-atlas-1637` | Sanctuary household with one parent; cartographer walks safe roads and publishes accessible knowledge | Retirement at 54 | 406 / 134 | 152,231 |
| Edda Vial · `career-audit-formula-1879` | Noble citadel household; cautious alchemist values tested labels and shared teaching | Retirement at 56 | 385 / 124 | 165,516 |
| Wren Care · `career-audit-consent-2381` | Poor village household with one parent; healer adopts, teaches and offers affordable care | Retirement at 62 | 487 / 143 | 178,783 |

The baseline contains **3,247 real API calls and 1,028 recorded decisions**. Each life earns an actual school qualification, learns its chosen civilian profession, completes paid work, leases and operates a business, hires a real colleague, teaches staff, completes five delivered commissions, improves its shop, earns technical mastery and signs a lifetime work. Four establish consensual marriages and welcome or adopt children, nurture them and complete actual school sessions. The cartographer makes real cautious journeys between four inhabited sites. All eight remain classless civilians.

## Final integrated replay

The final replay completed all eight identities again from newborn to retirement, with **3,544 real calls, 1,167 decisions and seven actually funded local public works**. These replayed identities remain eight distinct lives, not sixteen. Every intermediate save passed validation and every public call preserved its input. The merchant intentionally declined public service; the other seven spent the actual seven days, 180 gold and profession-specific materials and left signed records naming their real colleagues.

| Profession | Final age | Final gold | Household costs actually paid | Skill gained in first work month | Final happiness / stress | Signed public works |
| --- | --- | --- | --- | --- | --- | --- |
| Blacksmith | 55 | 145,251 | 6,386 | 2 | 100 / 0 | 1 |
| Farmer | 60 | 151,029 | 7,191 | 3 | 100 / 4 | 1 |
| Innkeeper | 58 | 153,077 | 6,864 | 3 | 100 / 7 | 1 |
| Merchant | 50 | 138,089 | 3,959 | 2 | 2 / 99 | 0 |
| Bard | 52 | 129,110 | 4,150 | 3 | 100 / 26 | 1 |
| Cartographer | 54 | 145,762 | 4,426 | 2 | 100 / 6 | 1 |
| Alchemist | 56 | 158,804 | 4,652 | 2 | 100 / 0 | 1 |
| Healer | 62 | 169,204 | 7,488 | 2 | 100 / 0 | 1 |

The extra first-month skill for community-minded policies is the explicitly offered professional decision, in addition to two fourteen-day practice milestones. Seven care-oriented lives recovered their emotional conditions through actual lived time and support; the merchant retained three acknowledged conditions with ongoing strain. Savings remain substantial. Living costs now behave coherently, but the game still needs more long-term decisions and uses for a successful forty-year career's wealth.

Their policies deliberately differ. The merchant accepts premium strain and conceals a deficient invoice; that first baseline invoice is genuinely quality **41/42**, not merely a moral label attached to satisfactory work. Farmers and performers accept lower community prices. Safe-hours characters take recovery and support. Lifetime works are retained by a household, given to the community, or published with the actual apprentice's credit. Bereavements, illness, road meetings, birthdays and career interruptions are resolved from the actual offered options.

This does not exhaust all authored branches. These journeys deliberately decline the plague quest, dangerous battles and supernatural changes. The other playtest groups cover those systems. Civilian death, divorce, every possible preferred heir, every customer in every seed and every combination of classes are not proved by this group. A seeded game has far more combinations than thirty lives can exhaust.

## Findings and changes

### Work schedules disagreed about what learning meant

All eight baseline characters gained **zero relevant hero skill from their first thirty real work days** when those days were committed through the calendar. Individual shift buttons awarded skill. This made the convenient life-simulation control undermine character development and pushed players toward repetitive clicks.

New civilian content trains one relevant skill every fourteen actual work days, regardless of whether those days came from individual shifts, interrupted commitments, a shop, commissioned labor or teaching. Paid and unpaid work retain separate ledger entries. A partial ordinary wage can be recorded without claiming a whole work day. The root engine applies the same rule to its older Work action. Supervised lessons and community decisions still award explicitly described additional learning.

### Mastery arrived before the profession had a life

Five hundred experience meant technical mastery in under two dedicated working years. The interface then had almost no technical development to offer through the next three decades.

Fresh civilian content uses mastery thresholds **90 / 360 / 900 / 1,800** after the initial apprentice stage. This allows a practiced career to develop across roughly five full working years. Five delivered commissions and age thirty still gate a lifetime work. Earlier saves retain their original thresholds and earned mastery, including accepted jobs and unfinished work.

### Career names were stronger than their stories

Most professions shared four generic situations. The fourth decade repeated the first decade's dilemmas without much relation to the work.

The new content has **48 profession-specific situations**, four each for twelve livelihoods. A bard must decide how a bereaved household's memory becomes a song; a mapper checks whether a crossing is accessible; a miner preserves a real safety warning; an alchemist distinguishes a label from a tested claim. Scenes use the current season and weather, the actual town and business, and the names of actual active colleagues. Consecutive professional years rotate through the four situations instead of immediately repeating a theme. Safe practice can teach current colleagues; community work practices a relevant skill. These are authored combinations, not an unlimited story generator.

### The board could offer the same item three times

Three named customers could request the same hinges, leaving visual variety without gameplay variety. Fresh boards now offer three distinct profession goods per quarterly period. Selecting a job, reloading and viewing the board do not reroll it. Older boards and accepted promises keep their exact original selection, pay, customer, date and quality agreement.

### Every legacy demanded metalwork

The bard's song, healer's care book and cartographer's atlas all demanded four ore, four wood and three cloth. The recipe contradicted the identity it was supposed to express.

Fresh lifetime works use profession-specific materials. The smith retains the original metal-and-timber recipe. A bard uses wood and cloth, a healer uses cloth, wood and a small crystal supply, and an alchemist uses more crystals. Existing lives retain their original recipe; unfinished work is never recharged.

### Some birthplaces denied adult family life

The baseline coast-born innkeeper could run a real inn but could not buy a cottage, court anyone or arrange a child's school. The old family and child-school predicates treated only city/village map types as inhabited. The baseline used genuine journeys to the home village and back; it did not teleport or fabricate a house.

The shared settlement predicate now recognizes living sites with inhabited types or hearth/market services while refusing destroyed, evacuated or closed places. The family and story owners integrate this rule across their systems.

### Money accumulated without the ordinary cost of living

Retired savings ranged from **135,175 to 178,783 gold**. These characters completed 12,052–16,003 actual recorded work days; the earnings were real, but actual-calendar provisions, property upkeep and dependent support were absent from long work commitments. A one-time cottage cost and an occasional six-gold clinic visit could not create meaningful household planning.

The root adds an actual-calendar household ledger using existing living standards and upkeep, with no retroactive charge to an imported save. Career commitments quote those living costs in addition to their agreed wage. Dedicated work preserves its real paid days; ordinary age-up records the actual equivalent work behind its smaller annual income. Basic communal assistance keeps a penniless household playable. The family does not vanish because an automatic charge exceeds savings.

Money still lacks enough late-game purposes. A forty-year diligent career should be able to accumulate savings; arbitrary taxes or retroactively reducing earned income would not add roleplay. New local public works instead let a character spend real money, materials and seven real days on profession-specific service, with named community records and credit for actual colleagues. A quarter-year cooldown keeps this a calendar commitment. The merchant can decline it, and a descendant can inherit its account without inheriting its maker's expertise. The separate fate campaign adds additional civic responses after its endings.

### Full-work lives exposed care pressure

All eight baselines encountered real emotional distress; seven retained distress, anxiety or depression. The workaholic merchant ended with happiness zero and stress one hundred. Six characters who made an annual clinic and support visit still ended around happiness 8–11 and stress 76–81. The safe-hours smith recovered and retained a flourishing household.

This proves that work, grief, recovery and relationships interact. It also warns that a full-work year is not automatically a balanced schedule and that the interface must distinguish acknowledgement from continuing care. Health, preference and household-priority improvements are integrated by their owners. The first improved replay leaves the care-oriented lives at happiness 71–100 and stress 0–33, while the merchant's chosen strain remains visible. Final-source results are recorded in the replay summary.

## Keep, simplify and expand next

- Keep a complete civilian life independent of a combat class. All eight careers earned a durable home or workplace and a signed legacy without adventuring.
- Keep saved commitments and their interruptions. They let time matter without hundreds of mandatory shift clicks; their skill accounting must stay consistent with direct actions.
- Remove duplicate board choices and profession-neutral story language where the profession can supply concrete stakes. Do not remove recurrence itself: repeated seasons and familiar people are part of a life.
- Make guild recognition explicitly distinct from technical mastery. The older promotion ledger can call someone a master much earlier than the new earned technical milestones.
- Extend a customer's specific relationship beyond one invoice. Named one-off buyers currently do not become full persistent friends, rivals or household members merely by returning to the board.
- Add multi-season civilian arcs: a failed harvest followed by cooperative storage, an inn's reputation changing with real guests, an atlas improved by witnessed roads, or a clinic confronting a regional crisis. Four situations per profession remain a finite authored pool.
- Give staff more individual goals and life beyond their skill/wage/status, including freely chosen departures and teaching successors. A named apprentice is better than an equipment slot; the current bounded register is still shallow over many generations.
- Add meaningful, consent-based group projects that use money and remembered work. More currencies and larger arbitrary costs would not solve the absence of late-career goals.

## Verification

Seventeen career tests cover interrupted learning parity, longer and legacy mastery, distinct seeded boards, all 48 work themes, profession-specific recipes, conservation and cooldown of public work, copied views, rejection of fabricated public receipts, earnings without invented work days, and additive public work for earlier saves and their real successors. Complete public-life replays cover the integrated engine, family, school, care and travel surfaces. Unit fixtures are labelled tests and are not counted as played lives.
