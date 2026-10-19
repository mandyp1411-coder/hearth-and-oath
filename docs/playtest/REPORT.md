# Hearth & Oath v0.7: 36 complete lives and a roleplay audit

The game is a stronger, connected life-simulator prototype after this audit. It supports a genuine lifelong civilian, an adventurer with competing commitments, and continuation as an actual child. It is **not yet a finished, expansive RPG**: repeated late-life situations, shallow NPC autonomy, fixed dungeon graphs and surplus wealth remain substantial design gaps.

## What was actually played

**36 distinct original characters** began at age zero and reached retirement or natural death. Each had a different seed and an explicit roleplay policy. They were replayed after improvements; those replays are verification, not another 36 unique lives. Actual successor continuations also do not inflate the original-life count.

| Group | Original complete lives | Before changes: public operations | Coverage and individual findings |
| --- | ---: | ---: | --- |
| Civilian careers | 8 | 3,247 | [Eight professions, businesses, commissions and lifelong work](careers.md) |
| Family and succession | 6 | 1,616 | [377 original years, children, schooling, separation, grief and five heir continuations](family.md) |
| Childhood and identity | 6 | 1,888 | [Unequal childhoods, school, preferences, four earned callings and two classless lives](childhood.md) |
| Adventure and conditions | 8 | 1,367 | [Eight further callings, combat outcomes, travel, crafting and transformations](adventure.md) |
| Campaign and consequences | 8 | 1,962 | [All six endings, civilian refusal, reconsideration and persistent changed places](story.md) |
| **Total** | **36** | **10,080** | Different complete original identities; repeat checks counted separately |

The complete [original-life ledger](original-life-ledger.csv) lists names, seeds, circumstances and original terminal ages. Some campaign summaries display a continued heir; the ledger deliberately records the parent's closed chapter at age 30. Detailed group reports explain initial failed attempts and how a genuine defect was corrected before completion.

Simulation routes use public engine APIs, actual action quotations and offered choices. Combat uses actual turns; resources, age, skills and outcomes were never granted by editing state. The strict drivers check save validity, nonnegative money and input immutability after transitions. These are automated plays guided by roleplay policies, supplemented by [actual phone controls and view inspection](interface.md), rather than a claim that every scene was manually clicked.

The original route set covers all twelve offered birthplaces, all twelve civilian professions, all twelve advanced callings, poor/tradesfolk/noble circumstances, absent and present families, all six main endings, all five dungeons, victory/defeat/retreat, local crime and restitution, both transformations and their cures, schools, businesses, buildings, children and succession. Seven ancestries appear explicitly in original configurations; avatar/browser and focused tests cover further expression. This is broad branch coverage, **not every possible combination, generated seed, tactical turn or dialogue outcome**.

## Findings that changed the game

### Time, health and preservation of a life

Annual jumps skipped supported illness recovery windows. Seven younger adventure characters reached bodily health zero despite repeatedly choosing care; a fever contracted in childhood persisted into middle age. Recovery now accounts for the fortnights actually covered by care before evaluating later time. Those same younger policies close with health 100 and no physical symptoms; an elderly character still develops chronic illness and dies naturally.

An authentic family save at day 12,774 could spend two care days across its day-12,775 birthday and become invalid. Care now stops at the real interruption, charges its agreed fee once, and leaves the birthday ready. Natural death closes a life before a new birthday scene can open. Resolving vampire hunger spends actual time while respecting birthdays and obligations; an interrupted zero-day choice cannot grant free relief or charge a donor.

Unfinished earlier saves retain their captured event effects, wage agreements, materials and class promises. Optional new markers enable future content without rerolling a world, inventing earlier family records or charging retroactive living costs. A successor inherits the actual estate and world history, while personal mastery, conditions and new household accounting belong to that child.

### Work as a life, with choices and commitments

The baseline credited ordinary annual income as 365 full working days and allowed top mastery after roughly two dedicated years. A paid month could grant no relevant skill. New careers credit actual wage-equivalent days and work-based skills; mastery takes sustained practice, with existing earned ranks and accepted agreements preserved.

Fresh careers have 48 profession-specific situations, distinct goods on commission boards and materials appropriate to their lifetime work. A bard or healer no longer needs the smith's ore recipe. A funded seven-day public project records the place, work, materials and real named colleagues. Seven final civilian replays completed such projects; the eighth deliberately declined.

Household priorities make ordinary years a deliberate choice among livelihood, education, relationships, exploration and rest. Living standards, real housing, minor children and schooling accumulate costs over actual adult days. The forecast separates gross wages, living expenses and an action's upfront fee. A settings click grants nothing; a committed job retains its wage agreement. A poor household receives basic support without debt, cash gifts or free luxury.

This gives time and money consequences without arbitrarily slashing wages. It does **not** solve the late-game economy: decades of dedicated work still leave about 129,000–169,000 gold in the career replays. Richer uses for that wealth and durable civilian goals remain necessary.

### Family, identity and professional story choices

Adult annual family dilemmas now use actual children, partners and bereavements. Decisions develop that particular child's learning and memories, rather than merely increasing the parent's statistics. Adopted children have individual appearances and preferences. Consensual separation and ending a courtship preserve co-parent links and existing property instead of erasing a relationship history.

School rosters and age-appropriate household dilemmas add differences between childhoods. Completed work across all twelve professions connects to favorite pursuits with bounded enjoyment; menus and partial projects do not grant it. Conversation can acknowledge real work, commissions and privately shared information. Remembered dead children remain in records without offering living interactions.

Earned callings now offer an explicit local-service commitment or an independent route. Community service has six actual days, a deadline, a named place and a completion record; independence has a social consequence. Neither stacks a second class's gifts. Paladin service can satisfy a compatible oath.

Civilian expertise and actual materials can prepare a main-story decision. A civilian can complete paid-in-resources civic work without finishing the campaign. Eighteen ending-specific aftermath situations, visitable memorials and a visible keeper withdrawal make consequences continue beyond the final choice. Story records distinguish household displacement from destruction of a specific property; a safe home elsewhere must remain safe.

### Exploration, combat and resource investment

Road danger quotations now explain bounded contributions from actual survival, active scouts, cartography work and exhaustion. A previously committed leg retains its quotation. Gathering and grown herbs support care through real consumption and time. Modern unlimited equipment-gathering controls were removed because they bypassed finite Workshop resources.

New blood-draw abilities cannot feed on stone, spirits or rooted guardians; the UI uses the actual valid-target metadata. Already saved battles keep their previous semantics. Dungeon rooms can retain an inhabitant's account without granting a free clear, XP or repeatable rewards. A permanent moon refuge now supports a stronger completed control lesson than a temporary field refuge, while saved pending lessons keep their promised yield.

### Phone usability

Two real browser routes exposed a character page exceeding 9,000 pixels, unexplained disabled choices, collapsing materials disclosures, lost keyboard focus and misplaced contact reading positions. Preferences now precede a compact, expandable calling catalog. Actual requirements and costs appear beside controls; disclosures, focus and reading position persist appropriately. A single attention banner links to the real waiting decision or commitment.

The focused browser check covers fifteen views at five widths. The character page at 390 pixels is approximately 3,642 pixels before optional calling groups are opened; all twelve classes remain available. Canonical engine guards determine party/equipment locks. The classless smith's revised browser route earned actual mastery, retired at 32 and continued as a real child who attended their own school.

## What should be expanded next

| Priority | Addition | Why it matters for roleplay |
| --- | --- | --- |
| 1 | Recurring customers, apprentices and staff with goals and evolving relationships | Makes years at a forge or inn generate a personal story rather than rotating stock situations. |
| 2 | NPC careers, retirement, relocation and renewed late-life social circles | A century-long life needs people and institutions to change independently of the player. |
| 3 | More consequential civilian investments and ambitions | Wealth should fund education, rebuilding, apprenticeships and a community's future, with visible tradeoffs and ongoing obligations. |
| 4 | Seeded dungeon objectives, inhabitants and route variants | New motives and solvable layouts add replayability beyond new names on five fixed graphs. |
| 5 | Longer initiation stories and companion involvement | A calling or a party member should introduce commitments and negotiation, not just a short qualification check. |
| 6 | Deeper schools, relationship compatibility and older-child adoption | Lets family choices change the person's future in more specific, visible ways. |
| 7 | Developed capture, accusation and restitution stories | Failure can create a playable situation with particular people rather than only fines or loss. |
| 8 | Persistent donors, packs and household safety arrangements | Integrates transformations with relationships, employment and home life while reducing repeated need scenes. |

Consolidate duplicate occupation controls, generic assurances and unchanged warning loops. Keep exact choices, material costs and promises visible. Do not add more statistic bars or a larger catalog merely to imply depth. Prioritize a smaller number of events that remember who was involved and return with a different consequence.

## Durable records and reproduction

- [Full career, childhood and story transcripts](api-action-records.tar.gz), with an [archive manifest and file hashes](action-records-manifest.json). Labelled failed attempts are retained as debugging evidence and do not count as additional lives.
- [Full family transcripts](family-actions.json.gz) and [full adventure transcripts](adventure-transcripts.json.gz).
- [Browser control and choice records](ui-lives.json).
- Per-group baseline and replay JSON summaries beside their detailed reports. The authentic interrupted-care save is in `tests/fixtures/family-care-boundary.json`.

Run `npm test` for meaningful regressions and compatibility. Run `node scripts/playtest-careers.mjs`, `node scripts/playtest-family.mjs`, `node scripts/playtest-story.mjs`, `node scripts/playtest-childhood.mjs` and `node scripts/playtest-adventure.mjs` for documented policies; each script's final/replay mode is listed in its group report. Run `python3 scripts/package-playtest-records.py` after those routes to preserve the full traces. These audit files stay in source documentation; publication contains the playable `dist/` files.

## Final integration checks

- **435/435 automated tests pass**, including authentic older saves and the additional property-address regressions. No skipped checks.
- Full classless-smith browser play completes actual work, five commissions, mastery, family schooling, retirement and child succession both online and in the standalone game with all external requests blocked. It checks exact save/reload, real road encounters and battles, paid travel quotations, health controls and gesture-only sound.
- The homestead browser route completes genuine schooling, resource gathering, shelter/forge construction, crafting and equipped weapons online and offline.
- All fifteen views pass at 360, 390, 430, 768 and 1440 pixels, with no horizontal overflow or JavaScript errors. Additional phone continuation checks verify disclosures, keyboard focus, message position, honest annual forecasts and unchanged saves while rendering.
- A real saved vampire fight reaches the hero's turn through actual companion turns. Blood draw is visibly unavailable against the construct while an ordinary attack remains usable; the ordinary attack then completes an actual turn.
- The final campaign-address correction passes three regression scenarios and the affected campaign suite. The standalone bundle is rebuilt after this final source change and checked again for isolated save parity.

The published version preserves the existing private audience. The exact source, audit archives and deployment assets are committed together; only the playable `dist/` content is served.
