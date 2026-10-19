# Hearth & Oath — v0.18 audit

The game now uses complete illustrated portraits and a playable adventure economy alongside its life simulation. This release adds enemy portraits, seasonal named merchants, contracts, bounties, repeatable descents, selling, crime, persistent custody, regional faiths and laws, wars, settlement growth, reconstruction and inherited holdings.

## Verification

| Check | Result |
|---|---:|
| Distinct complete lives, birth to retirement | 104/104 passed |
| Unique seeds and decision traces | 104 each |
| Actual public-engine actions and transitions | 72,193 |
| Save reloads | 35,460 |
| Portrait redraw/reload checks during lives | 558,699 |
| Actual successor generations exercised | 10 |
| Final regression suite | 663 passed, 0 failed |
| Complete character illustrations | 10,304 |
| Complete enemy illustrations | 384 |
| Final illustrated atlases in offline package | 167 |
| Offline parts | 4, exact reassembly verified |

The 104 journeys used the game's public actions, choices, travel, battles and succession. The harness did not grant statistics, currency, inventory, elapsed time or fabricated outcomes. Lives ended at ages 35, 45, 55, 65, 75 or 85. These were automated engine playthroughs, not 104 manually played browser sessions. Native artwork was reviewed separately, including 120 age/presentation samples from the actual registered crops, the full generated sheets and final complexion/species metadata.

The only source changes after those journeys were the portrait catalog and its builder, to correct age/complexion matching. Simulation, calendar, combat, rewards and gameplay handlers remained unchanged. Final exhaustive portrait matching and the full 663-test suite ran after that visual correction. The raw report retains the source hashes and this distinction.

Browser interaction and responsive layout testing were unavailable in the managed environment. Creation/menu handler integration, source geometry, native image crops, offline JavaScript parsing and asset byte checks were completed.

## Portraits and creation

Every race has 1,024 illustrated adults, plus 64 infants, 64 children, 64 adolescents and 64 elders. Elves have 64 additional lifecycle illustrations covering missing darker complexions. These are actual whole illustrations, with 10,304 distinct registered cell hashes; variants were not produced by mirroring or recoloring a few faces.

Hair, beards, hats, masks and clothing are painted together with each face. The old layered renderer, facial widening controls, skin palette and part editor were removed from play. Creation now offers ancestry, presentation, origin and starting age; fate draws the character's circumstances. Attributes are read-only descriptions of the actual character. Equipment remains inventory based.

Portraits keep a saved identity and select their age illustration consistently. Human and Elf age selection follows the illustrated complexion. Beastfolk age selection follows its anatomical family, and lycanthropes use canine illustrations. Age sets are distinct illustrations, not 1,024 individually painted five-age sequences per race. Smaller childhood/elder pools can repeat across different people.

## Systems actually exercised

| System | Observed in the 104 lives |
|---|---:|
| Procedural free encounters | 584 across all six enemy families |
| Enemy portraits present in encounters | 2100 |
| Accepted contracts | 294 |
| Earned contract payments | 164, including hunts, bounties, relics and escorts |
| Repeatable descents | 102 |
| Relics sold | 1006 |
| Theft / burglary attempts | 28 / 28 |
| Days actually served in prison | 336 |
| Recognized settlement charters | 24 |
| Attempts to seize a settlement | 8 |
| Holding stewardship or levies | 27 |
| Actions affecting wars | 25 |
| Faiths followed | All six |
| Authored story arcs encountered | All 18 |

Contracts require the correct destination, actual earned proof and a return to the original board. Living bandit bounties can be captured after weakening the named target. Shops have a named merchant, finite seasonal stock and regional/personality pricing. Loot, materials and occasional equipment come from earned encounters and once-only coffers; unequipped gear and relics can be sold.

Descents contain six floors of saved, seeded rooms: enemy formations, traps, treasure, altars, strangers and stairs. Players retain their remaining health, magic, potions and earned belongings. Withdrawal, defeat and failed contracts are valid outcomes.

Each of the six regions has its own code, tariffs, enforcement and faith traditions. Custody tracks actual time, with prison work, conversations, bribery and escape. Travel, equipment changes and annual skipping are blocked while jailed. Reports remain local; guilt is not inherited by an heir.

Fresh maps have 25–32 connected places. Actual elapsed years drive conflicts, rulers, prosperity, security and merchant succession. War can ruin settlements and close services; four paid reconstruction stages can reopen them while retaining their recorded destruction. Recognized or seized holdings survive succession. Care can improve them; coercive levies can enrich the household while damaging the settlement.

## Findings corrected

- A supposedly 64-portrait Human child sheet actually contained seven rows. It was replaced, and a regression fixture now proves the bad sheet is rejected.
- Uneven gutters and cropped headwear produced fragments in several sheets. Failed sheets were replaced; registration now follows real per-row cell boundaries. All 161 character atlases and six enemy atlases passed their grid and opacity checks.
- Beastfolk age images could change animal family, and two infant rabbit faces had hidden ears. Native family metadata and a replacement infant sheet corrected this.
- Human complexions could change between age sets. Native metadata now matches the age image to the adult illustration. Missing darker Elf age coverage received a new 64-face lifecycle atlas.
- Larger maps crowded some settlements. Placement now preserves readable separation and valid connected roads; 100-map geography tests passed.
- Some shops lacked basic weapons. Every operating merchant now carries common essentials alongside regional stock.
- Regional court tariffs and persistent prison needed to agree. Fresh hearings now use regional restitution and offer actual custody; older pending hearings retain their saved terms.
- World damage conversations could repeatedly overshadow a new private transformation. New confidence scenes receive appropriate priority while older waiting conversations retain their terms.
- Repeated or redirected battle results could not pay rewards; validation also now rejects a result that changes a combatant's identity, portrait or abilities.
- A full pack could silently lose an existing relic. Full packs now leave new finds behind, preserving belongings and explaining the capacity limit.

## Further improvements worth considering

1. More childhood and elder portraits, especially the smaller complexion/presentation pools, would reduce repeated faces further.
2. Additional dungeon biomes and boss stories would broaden the repeatable adventure loop. The 104 lives do not exhaust every procedural floor or story branch.
3. Deeper alliances, succession disputes and faction diplomacy would give the regional conflicts more political detail.
4. More merchant conversations and individual companion quest lines would strengthen personal relationships around the adventure economy.
5. Separate physiological lifespans for ancestries would add lore detail beyond the shared year-based life calendar.

These are future additions. The released loops already function, save and resolve their consequences.

Raw reproducible results: [full-lives-v18.json](full-lives-v18.json).
