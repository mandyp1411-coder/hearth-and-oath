# Hearth & Oath — v0.14 RPG expansion and audit

Completed October 11, 2026. **170 distinct birth-to-retirement lives passed**, and **623 regression checks passed with no failures**. The new seeds are separate from the previous 135-life audit. Failed discovery attempts and repeated replays are excluded from the finished-life count.

The release adds six returning personal stories, a larger ordinary conversation system, sustained recovery plans, two substantial endowments, and 32 engraved child and elder faces. These connect to the existing childhood, education, twelve professions, inventory, earned callings, party battles, branching campaign, transformations, family, and successor play. The charcoal, bone, and brass game menus, title screen, save slots, character creator, and ambient score remain the visual and interaction foundation.

## What changed from the previous audit

| Previous finding | Implemented improvement |
| --- | --- |
| Quest and vocation reminders crowded out ordinary company. | Adult company draws from 20 personal subjects, with two subjects per contact per adult year and a seeded ten-year deck. Quest, work, and mentor topics remain explicitly available. Unresolved confidence, evidence, and support scenes retain their priority. |
| Adult situations lacked connected consequences. | Six optional three-chapter arcs cover professional failure, rivalry, common land, a household claim, travelers, and a learner's independence. A chapter returns after one year, then after two more years, retaining its actual participant, place, profession, and earlier choices. |
| Helpful and darker behavior needed longer memory. | Care, negotiated paid work, coercion, and leaving have different time, money, trust, professional reputation, and local standing consequences. The named witness remembers pressure; later correspondence can address it without erasing the earlier act. Completed arcs leave a historical record in the world. |
| Repeated care commands interrupted the flow. | Free or guided recovery can reserve 14, 28, or 56 days. Benefits follow attended time, the fee is paid once, and a birthday, deadline, hunger need, or full moon preserves the remainder. Cancellation retains the actual attendance and costs. The year forecast makes the selected priority and living costs clearer. |
| Established wealth needed more deliberate uses. | Added a regional scholarship archive and a watershed/trade crossing. Their construction requires actual materials, labor, and 11,600 or 9,100 gold, including their first endowment. Continued funding pays for service over real years, with named beneficiaries and useful educational, gathering, and travel effects. Existing community institutions retain their funding rules. |
| Childhood and nonhuman aging needed more portrait depth. | Added 16 alternate child faces and 16 elder faces across all eight ancestries. Hair, headwear, masks, and age restrictions remain layered independently of inventory gear. Stored customization is preserved through aging and inheritance. |
| Additional systems risked making the interface busier. | Personal stories and recovery are compact disclosures. Optional quest conversation topics have their own disclosure; ordinary company is the primary conversation action. |

The stories are The Cracked Mark, Two Names on the Atlas, The Winter Commons, The Letter Beneath the Hearth, The Door After Nightfall, and The Apprentice's Own Key. Their availability follows real work, age, relationships, settlement access, and travel history. Proposals and unfinished chapters grant no completion rewards.

## Playthrough method and results

These were **automated playthroughs through the public game engine**, using offered actions, actual elapsed days, earned wages, materials, costs, decisions, and resolved battles. No audit life received patched ages, currency, attributes, condition flags, or completed quests. They were not manual browser sessions.

The main sample contains 156 ordinary lives: 26 each using weekly care, free recovery plans, guided plans, construction, cancellation, or additional relationship time. Five household priorities and three living standards vary alongside ancestry, birthplace, upbringing, profession, difficulty, and decision policy. Their target retirement ages range from 35 to 85. Six additional lives acquired vampirism or lycanthropy through the actual invitations at adulthood and lived to ages 35, 45, 55, 65, 75, and 85.

Eight separate campaign lives began at birth and retired at 30. They exercised all six endings, a civilian who declined the campaign, and a character who changed a final pledge. They used earned callings, a recruited party, actual dungeon decisions, and complete battles. One real child continued the campaign's changed world.

| Check | Result |
| --- | ---: |
| Distinct finished lives / failed final lives | **170 / 0** |
| Main ordinary and supernatural lives | 162 |
| Separate campaign and civilian lives | 8 |
| Public transitions, both audits combined | 112,626 |
| Main export/import and migration checks | 53,932 |
| Main repeated portrait and identity checks | 819,098 |
| Ancestries / birthplaces / livelihoods in the main sample | 8 / 12 / 13, including local labor |
| Children welcomed or adopted in the main sample | 203 |
| Real heir handoffs, followed by another year | 18 across both audits |
| Completed personal arcs / deliberately left stories | 940 / 15 |
| Personal chapters completed | 2,835 |
| Story approaches exercised | All 54 care/enterprise/coercion chapter branches, plus leaving |
| Main road journeys arriving / turning back | 2,067 / 26 |
| Road encounter types | All 13 |
| Main road battles: victory / defeat / retreat | 30 / 1 / 27 |
| Additional completed campaign battles | 52 |
| Completed commission invoices | 322 |
| Standing community works built | 21 across all seven kinds |
| Regression suite | **623 passed; 0 failed** |

Each main transition checked a valid exportable save, preservation of the previous save, forward-moving time, nonnegative currency, and bounded HP. Reloads checked that pending situations and selected appearances did not reroll. Portrait checks inspected the actual rendered markup as well as plate selection. These are repeated assertions, not 819,098 distinct portraits or browser screenshots.

All 170 original characters used voluntary retirement. This count does not represent 170 campaign endings or natural deaths. Mortality, earlier-save migration, privacy, equipment, pending work, and other class paths also have regression coverage, but that coverage is not counted as additional complete lives.

## Findings fixed during development and replay

| Finding | Fix and verification |
| --- | --- |
| The two new endowments lacked future beneficiary episodes. A life could crash when a beneficiary returned years after construction. | Added their returning episodes and replayed the two failing builder lives to ages 75 and 85. Final construction policies subsequently completed both new kinds with real funding and beneficiaries. A regression builds each kind and advances through funded returns. |
| A vampire commitment offered paid donor feeding at zero gold, and its description promised a different hunger reduction from the real action. | The current gate offers paid feeding only when affordable and states one attended day and a 65-point reduction. Earlier saved donor choices receive an explicit affordability response. A genuine failed-life checkpoint verifies that free feeding resolves the need and the saved story resumes exactly its remaining work. All six final supernatural lives pass. |
| Age plate selection could be correct internally while the portrait markup still selected the original atlas. | Included the new atlas kinds in actual rendering. Regression and every audit portrait check verify the markup uses the selected child or elder atlas. |
| Human-shaped hood openings concealed wolf muzzles. | Opened the left edge of cloth hoods for wolf beastfolk and lycanthropes. Reviewed corrected cowl, wool, bone-trimmed, and frayed hood compositions against their previous crops. |
| Ordinary company could displace an unresolved private confidence. | Important unresolved confidence, evidence, and support scenes keep priority. Existing privacy and support regressions pass; personal topics remain the default otherwise. |
| An existing age-16/17 ordinary conversation could fail validation because its expected replies incorrectly included an adult pressure option. | Matched the validator to the actual age-appropriate reply set. Childhood, adolescent, and save migration tests pass. |
| Completed community work used an incorrect faction key. | Corrected it to the actual villagers faction. The final construction lives validate the resulting saves and standing. |

An early audit guard also incorrectly treated repeated full-moon or hunger decisions within one advancing year as a stall. The runner now checks a repeated unchanged calendar gate, retaining its overall loop limit. This was an instrumentation correction, not a game improvement, and those aborted attempts are excluded from the final count.

## What the new sample shows

**Dialogue is more personal.** Of 11,425 sampled conversations, 8,686 used the new personal topics or named consequence returns. Fate and vocation accounted for 2,185, or 19.1%; they accounted for 85.6% of the previous sample. The policies and conversation mix differ, so this is a comparison of audit samples rather than a controlled player-behavior experiment. Quest topics remain accessible while ordinary company has substantially more room.

**Recovery is easier to schedule.** The policies selected 1,803 free and 375 guided plans, alongside 5,002 individual quiet weeks. Plans retained real attendance through calendar interruptions; three interrupted plans were deliberately canceled. These counts reflect the audit's conservative care decisions, not a minimum number of commands a player must issue. Quiet weeks remain a useful short commitment.

**Money has real commitments, but affluent strategies can still accumulate savings.** The main sample ended with 168–74,845 gold, with a median of 14,001.5. The old sample emphasized frugal livelihood work, so its higher median is not proof that this release rebalanced wages. This release expands deliberate spending and tests existing funding mechanisms rather than adding arbitrary care charges.

| Ordinary policy | Lives | Median closing gold | Standing works built |
| --- | ---: | ---: | ---: |
| Weekly care | 26 | 13,601.5 | 0 |
| Free recovery | 26 | 14,933 | 0 |
| Guided recovery | 26 | 14,468.5 | 0 |
| Construction | 26 | 11,121.5 | 21 |
| Cancellation | 26 | 16,433 | 0 |
| Additional relationships | 26 | 15,253.5 | 0 |

The two finished archives consumed 14,400 gold in actual operating costs across their funding records; the three finished watersheds consumed 7,500. Across proposals, finished stages, and deliberate abandonment, those kinds also recorded real construction costs and labor. An unfinished proposal is not counted as a functioning institution. Smaller existing works were already available before this release and remain meaningful choices.

## Remaining improvements

| Priority | What remains | Useful next addition or revision |
| --- | --- | --- |
| High | The six new arcs conclude; very long lives still reveal the finite annual and career story pools. | Add later-life chains involving adult children, changed professions, patrons, local disputes, and the consequences of old story outcomes. Increase authored branching rather than relying only on more seeds. |
| Medium | The personal deck contains 20 subjects and cycles after ten adult years. | Add conversations specific to life stage and shared experiences. Keep quest prompts optional and preserve actual private knowledge. |
| Medium | A successful frugal master can still retire with a large surplus. | Add optional professional expansion, regional patronage, and institutional dilemmas with clear labor and resource tradeoffs. Preserve accessible basic care and viable modest lives. |
| Medium | Child and elder anatomy now fits every ancestry, but each new atlas has one base head per presentation and ancestry. | Add more registered individual child and elder likenesses. Keep saved choices stable and preserve believable continuity across aging. |
| Medium | Persistent consequences are strongest for the named witness, profession, local standing, and recorded place. | Extend reactions into patron decisions and regional events using identifiable sources, rather than giving every NPC unexplained knowledge. |

There is no need to remove civilian life, childhood, family, care, portrait editing, or inventory to strengthen the RPG. Keep advanced systems contextual and remove repeated explanatory rows when the player already understands a command. The current release is a single-region, single-player fantasy life RPG with a complete campaign and successor play; additional regions and political simulation are future expansions.

## Verification limits and evidence

Browser QA was unavailable in this environment. Actual browser rendering, phone touch behavior, and live audio playback remain unverified in this audit. Source-level interface and handler checks, actual engine journeys, raster portrait composition review, migration tests, and the standalone build passed. The offline bundle parses, includes the new systems and art, and contains no remaining external CSS image references or module imports.

The authoritative evidence is saved with the project:

- [162-life seeds, decisions, chronicles, hashes, and aggregate results](sandbox:/workspace/sites/hearth-and-oath/docs/audit-v14.json)
- [Eight campaign and civilian lives, decisions, endings, battles, and changed places](sandbox:/workspace/sites/hearth-and-oath/docs/story-v14.json)
- [Main audit runner](sandbox:/workspace/sites/hearth-and-oath/scripts/audit-full-rpg.mjs) and [campaign runner](sandbox:/workspace/sites/hearth-and-oath/scripts/audit-campaigns-v14.mjs)
- [Portrait prompts, mapping, selected assets, and visual review](sandbox:/workspace/sites/hearth-and-oath/docs/PORTRAIT_ART_V14.md)

To reproduce, run `npm test`, then `node scripts/audit-full-rpg.mjs 162 docs/audit-v14-replay.json 0` and `node scripts/audit-campaigns-v14.mjs`. The campaign runner generates full per-action traces and final states under `artifacts/audit-v14-campaigns/`. The saved main report was combined from completed shards with `scripts/summarize-audit.mjs`; only completed, failure-free batches are accepted.
