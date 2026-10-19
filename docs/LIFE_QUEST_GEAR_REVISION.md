# Hearth & Oath — life, quests, exploration and gear revision

Release: 0.25.0

## Implementation brief

Keep the game’s existing life-simulation foundation and portrait identity. Make the player’s choices easier to understand and give exploration a useful reward loop. Use charcoal, muted bone, yellow-gray and old brass throughout; vivid rarity colors and saturated scene art do not belong in this revision.

- Organize the journal into Main long quests, Side quests, Miscellaneous errands, Repeatable Radiant quests and an Archive. Show one next main objective; keep future chapters undiscovered. Let requests wait, and provide acceptance, pause, decline and tracking controls.
- Keep scene writing concise and returning stories coherent. New personal arcs have three chapters. Preserve the length and exact waiting decisions of earlier five-chapter arcs.
- Replace the supernatural shortcut with rare contextual night or dungeon meetings, optional withdrawal and actual combat or invitation decisions.
- Keep relationships manageable with a close circle, nearby people, search and pagination. Give ordinary conversations a stable personality, personal concern, keepsake, occupation and remembered context.
- Show the stages of growing up and a yearly focus developed through actual elapsed time. Make school progress and the next learning step clear.
- Support double-click movement on neighboring hexes, settlement rooms and mapped dungeon rooms. Keep single-click inspection and keyboard movement.
- Improve readable dungeon maps and descent progress. Vary settlement geometry and room descriptions, and illustrate places with twelve distinct environment scenes.
- Provide a ten-slot illustrated loadout, gear score, item comparisons, generated equipment copies, build bonuses, crafting, merchant stock and quoted sales. Group navigation around Life, Adventure, Character and Records.

## Implemented behavior

### Quests and stories

The Ashfall Covenant appears as one optional main quest with a next objective, rather than a wall of future chapter cards. Nearby side requests are offers; accepted, paused and declined requests have separate states. At most three unfinished covenant side quests may be accepted at once. Completed quests release that capacity.

All ten authored side requests can be accepted and tracked. Tracking displays the actual objective and its map destination. Miscellaneous errands show agreed obligations and their actual deadlines. Radiant work uses the existing seasonal contract board and repeatable descents. Completed objectives and personal-story outcomes go to the archive.

New ordinary conversations do not create quests or silently award training, money or reputation. Long legacy event text starts with a compact passage and a disclosure for the rest, preserving the original scene and its consequences.

### People and growing up

The default relationship list is the close circle: family, companions, trusted people and existing conversations. Nearby and All people remain available. Search and pages of twelve keep the full population reachable; settlement previews show at most eight local faces.

Six personality styles combine stable individual interests, keepsakes, occupations, bond and actual memories. Named companions have additional personal lines. Six ordinary conversation beats per person per lived year do not repeat within that year. A waiting earlier conversation keeps its captured text, choices and effects.

From ages three through seventeen, choose a yearly focus in exploration, lessons, friendship or responsibility. Responsibility begins at twelve. Choosing grants nothing immediately. At least 180 actual days develop the focus; learning also requires attended lessons. Completed years create named memories. The school view explains annual lesson progress and examination readiness.

### Travel, places and supernatural encounters

Double-click a currently available neighboring hex or room to use the engine’s existing movement offer. Enter or Space provides a keyboard route. A single click inspects; it does not spend days, move the hero or reveal hidden room names. Movement still respects adjacency, pending decisions, costs, hazards and saved progress.

The dungeon graph has discovered room labels, a current-room marker, scrollable geometry and an accessible selection target. Repeatable descents show six-room progress, current decisions and equipment names. Four seeded settlement layouts and individual room descriptions give towns distinct structure.

Twelve illustrated scenes cover a village, city market, school library, cistern, crypt, watchtower, forest, coast, mountain, tavern, shrine and forge. Area and item atlases use a shared CSS tone: grayscale followed by restrained sepia and saturation. Existing portrait artwork remains the palette reference. Rarity and warnings use subdued yellow-gray and brass, with explicit text labels.

An eligible adult without a condition gets at most one rare-meeting roll per calendar week during actual outdoor night time or dungeon time. Twelve of 10,000 seeded outcomes create a meeting: five vampires, five lycanthropes, one patron and one ranger. Withdrawal is available. Speaking to a rare patron or ranger opens the existing invitation sequence. Creature combat requires a real encounter; the infection roll after a relevant wounded fight is 10%. Earlier saved invitations and existing conditions still work.

### Gear and the reward loop

Slots: main hand, off hand, head, body, hands, feet, cloak, belt, amulet and ring. The catalog now has 44 base pieces and 32 committed workshop recipes.

Recovered gear has its own identity, quality, tier, affix, source and discovery day. The bag holds up to 120 generated pieces alongside base belongings. Equipment can come from dungeon caches, victories and repeatable expedition spoils. Sell unequipped copies through real local merchants; quoted sales remove the item once and grant the actual gold. Existing relics, materials, potions and rations remain integrated.

Quality improves a piece’s principal stat. Vanguard, Duelist, Arcanist and Wayfarer affixes support armor, attack, spell power and initiative builds. Three equipped pieces with one affix give +2 to that stat. Bonuses apply to combat snapshots and do not overwrite base skills.

Item score is max(1, round(3 × attack + 5 × armor + 3 × spell power + 4 × initiative)). Loadout score sums equipped item scores. Build bonuses are displayed separately; stat comparisons remain visible.

Older cloaks, shields, helms and rings appear in their proper slots without deleting or rewriting saved belongings. Equipping body armor or an amulet relocates an older cloak or shield rather than accidentally removing it. Saved battles retain their original snapshots.

## Verification

The full regression suite passed **816/816 checks**. After the final quest and gear refinements, a focused run passed **62/62 checks**, including sixteen revision-specific scenarios and the existing equipment, workshop, dialogue and commitment checks. These runs overlap; the focused run includes two additional side-quest scenarios. Verification covers real engine actions, save reloads, legacy pending commitments, combat bonuses, exact merchant sales, quest acceptance, all ten side requests, contact pagination, rare encounter transitions and production UI event handlers.

The offline production build passed. Logs are retained in [qa-life-quest-gear](qa-life-quest-gear/).

Browser and device visual verification was unavailable in this environment. The UI event harness is a simulated DOM, not a browser. The offline build separately parses the complete module graph and embeds every required portrait, transformation, item, environment and audio asset.

See [artwork provenance](art-life-quest-gear.json) for the exact generation prompts and integrated asset paths.

