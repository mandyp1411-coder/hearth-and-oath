# Adventure, conditions, health and crafting: eight lives

These eight people were created at age zero with different seeds, named families, birthplaces, circumstances and roleplay policies. They developed their classes through actual mentorship and public actions. All money, materials, time, skills, relationships and combat outcomes were earned through the simulation. Nothing was assigned directly to state. Every public transition checks input immutability, nonnegative money and export/import validity.

The first pass completed seven lives and found a save-breaking death/birthday bug in the eighth. The elderly knight completed only after that specific bug was fixed. Eight same-seed replays then checked the improvements and added explicit coverage of new calling approaches and dungeon conversations. Those replays are repeat verification, not eight additional distinct people.

The compact baseline and replay records are [adventure.json](adventure.json) and [adventure-replay.json](adventure-replay.json). Full scene text, offered options, selected decisions, action quotations, actual days and payments, combat moves, journal changes and final saves are preserved durably in [adventure-transcripts.json.gz](adventure-transcripts.json.gz), with individual local copies in `artifacts/playtest/adventure-*.json`. The baseline records 1,367 operations and 571 explicit scene decisions; the final replays record 1,783 operations, 777 scene decisions and 19 actual battle outcomes across 70 different activities. Reproduce the final routes with `node scripts/playtest-adventure.mjs --replay`.

| Person | Seed | Birth and circumstances | Developed identity | Completed chapter and exercised systems |
|---|---|---|---|---|
| Avel | `thirty-lives-road-warden` | Camp; poor; two parents | Guardian | Retirement at 45. Actual community service, companions, armor, a fully supplied road plan, later fast patrols, both real road-combat encounters, forest/archive combat, a negotiated prison release, watchtower guardian and care. |
| Brann | `thirty-lives-humbled-fury` | Mountain; tradesfolk; single parent | Berserker | Retirement at 37. Genuine classless defeat and retreat before training, later victory, independent calling, ore gathering until actual depletion and the observed legacy-gathering bypass. |
| Cerys | `thirty-lives-elder-watch` | Citadel; noble; two parents | Knight | Natural death at 111. Actual service, companions, road exposure, healthcare, aging, bereavement and advanced-age mortality. |
| Dara | `thirty-lives-storm-archaeologist` | Tower; poor; orphaned | Elementalist | Retirement at 35. Independent calling, staff and armor, all five complete dungeons, every final guardian, hazards, one-time caches, remembered accounts and returning to ordinary life. |
| Eiren | `thirty-lives-willing-dead` | Sanctuary; tradesfolk; single parent | Necromancer and consenting vampire | Retirement at 32. A voluntarily acquired condition, donor feeding, dusk preparation, actual private family disclosure, real archive battle, herbs and a paid cure that preserves the learned discipline. |
| Fenn | `thirty-lives-a-thief-with-boundaries` | Gate; poor; homeless household | Thief; later learned paladin | Retirement at 39. Repeated theft, local evidence, vampirism, predation, a broken visible oath, actual restorative service, resumed thief calling, different local legal states, restitution, retreat and a cure. |
| Galen | `thirty-lives-moon-refuge` | Forest; poor; two parents | Ranger and controlled lycanthrope | Retirement at 50. Invitation, preparation, isolation, safe refuge, restraint, named confidant, shelter/garden/refuge/smithy construction, harvesting, herbal healthcare, cure, a crafted and equipped bow and actual combat. |
| Hedra | `thirty-lives-the-price-of-instinct` | Marsh; tradesfolk; orphaned | Assassin and reckless lycanthrope | Retirement at 34. Uncontrolled settlement runs, witnesses, local law, control practice, actual feral surge and centering instincts, gathering and a cure. |

## What the lives showed

The strongest part is continuity: a civilian profession, a combat calling, a condition and a family history coexist. A cure does not delete the calling. Secret knowledge stays with a named participant until something actually discloses it. Defeat preserves the person and exact prior history. Dungeons keep cleared rooms and cannot repeatedly award their caches.

The initial health implementation was severely unfair during long actions. All seven younger baseline lives ended with bodily health zero and unresolved childhood illnesses despite explicitly taking free rest at each concern. Avel's fever began on day 1640; care on day 1643 supported recovery through day 1664, but the next annual endpoint discarded that supported fortnight. The same fever remained at severity three at age 45. This was a real simulation defect, not a difficult roleplay policy.

The same replay policies now let care work during the weeks it actually covers. All seven younger replays close with bodily health 100 and no physical symptoms. They still experienced illnesses and needed real decisions; this is recovery through actual care, rather than immunity or a save grant. The elder knight retains chronic symptoms and eventually dies naturally at 111, so recovery does not erase aging.

Permanent moon refuges initially offered the same two-day, five-control preparation as a free temporary field refuge. That made an expensive building mostly decorative. New built-refuge lessons now gain 12 control after the entire committed lesson; field preparation remains five. Existing pending projects keep their original promised gain.

The new road guidance makes upbringing and vocation useful outside menus: practiced survival, a living active scout and actual cartography work reduce quoted risk, with a cap. Low physical reserves raise the quoted risk. These factors affect a newly planned route; they do not reroll an already committed leg.

## Improvements made from this evidence

- Credit every supported illness fortnight before later unsupported time. Ask for another health decision when a physical condition genuinely worsens, without repeating an unchanged diagnosis indefinitely.
- Connect gathered or garden-grown herbs to resource-consuming supportive care. Recovery still takes lived time.
- Remove modern unlimited equipment-gathering controls that bypass finite Workshop deposits. Preserve old revision accounting.
- Give permanent moon-refuge investment a stronger lesson, with snapshotted outputs, actual completion and the existing lunar cooldown.
- Connect actual survival, active scouts, cartography work and physical reserves to visible road quotations. Costs and time remain exact and paid once.
- Prevent new vampire battles from satisfying hunger by drawing blood from stone constructs, spirits or rooted guardians. Expose the valid targets to the interface and preserve already saved old encounter behavior.
- Give guarded dungeon rooms optional, persistent accounts. Hearing a person's account or understanding a creature's home grants neither a free clear nor farmable rewards.
- Prevent a dungeon route, parley or rest from completing without its real day, or after the character's actual death.
- Report and verify the core natural-death/birthday repair; a deceased life cannot resume with a fresh birthday scene.

The final focused module run passes 156 tests, including ten new regressions covering care windows, worsening reminders, herb consumption, stock bypasses, road guidance/exhaustion, blood-bearing targets, persistent dungeon accounts, interrupted dungeon time and permanent-refuge output conservation.

## What still needs expansion

This is a coherent, playable foundation rather than a complete large RPG. These lives prove actual system connections; they do not prove every combination or every outcome.

1. Dungeon layouts have meaningful branches but remain five authored graphs. Future seeded variations should alter an objective, an inhabitant's motive or the route itself while preserving solvable objectives. Renaming the same chamber would add little.
2. Local crime has witnesses and real fines, but lacks a developed arrest/capture/restitution storyline and a criminal social network. A debt or accusation should produce playable choices with specific people.
3. Party combat has useful tactical differences, but companions are stronger mechanically than they are present in dungeon conversations. Let their memories change a negotiation or establish a boundary without reducing them to approval scores.
4. Conditions need optional community routines, donors, packs and household safety arrangements that connect work schedules and relationships. Current feeding and lunar scenes become repetitive during decades of life.
5. Long lives need more regional change independent of the hero: disputes resolving, teachers retiring, institutions changing policy, children becoming peers and a new crisis growing from earlier consequences.
6. Craftsmanship can connect more directly to adventuring: named commissions for protective equipment, a damaged village needing repairs, apprentices credited for a party's gear, and recovered dungeon supplies carrying a provenance. These should reuse actual resources and promises.
7. Continue removing duplicate buttons and generic assurances from ordinary narrative. Keep exact costs and informed decisions visible, but give the people and places room to speak in the dark-fantasy voice.
