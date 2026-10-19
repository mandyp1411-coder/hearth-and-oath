# Interface playtest: real phone lives

Two genuine browser routes were recorded before changing the interface. The game was played from birth using the controls at 390 × 844; localStorage was read for observation only. The complete control/choice/journal transcripts are in [ui-lives.json](ui-lives.json). These are additional UI journeys; they do not pretend to cover every simulation outcome.

| Route | Seed and circumstances | Actual outcome | Recorded controls |
| --- | --- | --- | --- |
| Civilian smith and educated heir | `two-lives-at-the-forge`, poor village household, homeless, dwarf | Community qualification; classless Blacksmith; owned shop; five commissions; marriage; biological and adopted children; child qualification; lifetime work; voluntary retirement at 30; generation-two child at 11 and next birthday/school at 12 | 177 |
| Scholar with a questioned calling | `phone-review-city-orphan`, poor city orphan, human | Community schooling and dilemma; certificate; Scholar; month of paid work; delivered commission; met and trained with a thief mentor; declined initiation; set the covenant investigation aside; spoke to and visited a peer | 75 |

The 15 views were inspected for both actual lives at 390 and 1440 pixels: 60 view checks. Navigation preserved the exact life, drawer focus remained contained, phone controls retained their touch area, no horizontal page overflow occurred, and no JavaScript error was observed.

## Baseline findings

The civilian/family journey actually works. It did not need a combat class, artificial gold, an imported master character, or an invented heir. The scholar could develop relevant skills and decline both a calling and the main story, which is essential to the promised freedom.

The interface made those systems harder to understand than they needed to be:

1. Character was 9,149 pixels tall for the heir and 9,442 for the scholar. Twelve mostly unavailable calling cards came before personal preferences. The player's own expression was buried below a lengthy catalog.
2. Local calling initiation buttons displayed a disabled state while omitting its reason. Social action requirements existed only in a title tooltip. That explains little on a touch screen and makes roleplay options look arbitrarily unavailable.
3. The cooperative's materials disclosure closed after every purchase. Calling and activity disclosures also reset after an action. Repeated small actions required repeatedly reopening or finding the same section.
4. Rebuilding the DOM lost the focused control after ordinary actions. Keyboard users had to find it again to repeat a legal purchase or practice.
5. Contact selection could reset the horizontal contact rail. Long threads reopened at the start instead of preserving the reading position or revealing an actual new message.
6. Most views gave no direct route back to a waiting scene. Only Career, Health, and Legacy had specialized attention messages; unrelated pages could hide why the age button remained unavailable.
7. Companion and equipment buttons could look actionable during circumstances their engine guards reject. The useful explanation arrived after the failed click.
8. A commission board in the smith life showed three copies of the same good. This was passed to the career reviewer as a variety finding, rather than changing simulation rules in the UI.

## Changes made from the evidence

- Put the player's preferences before the calling catalog. All twelve callings remain available under three named disclosures, with individual class names visible in the summaries. An active discipline opens its own group.
- Display calling and social action descriptions, time and cost, and the engine's actual lock reason beside their controls.
- Preserve selected disclosures in interface memory across ordinary actions and navigation, without writing them into the life save. A new life or generation clears that memory.
- Restore the focused ordinary action when it remains available. New story moments focus their heading instead.
- Preserve contact-rail position and bring the selected contact into view. Preserve a thread's reading position; an actual new message reveals the latest message.
- Provide one consistent pending-moment banner across unrelated views, with a direct link to the correct conversation, road, project, work commitment, or scene.
- Align companion/equipment controls with canonical engine availability helpers. No UI-only duplicate rules decide availability.
- Honor combat ability target metadata: Blood draw is unavailable against a selected bloodless opponent, while ordinary attacks remain usable against that opponent.

## What remains worth improving

The authored content is finite, even though seeds change people, places, context, and outcomes. Variation should come from consequences and lived commitments rather than merely adding more interchangeable words. Three calls to buy materials should also eventually become a single reviewed quantity purchase; a bulk-control UI needs corresponding engine validation and should not simulate hidden repeated clicks.

Career and family choices are the strongest roleplay surfaces. More specific conversations about a commission, the household's needs, teaching one's child, and the chosen future would connect the existing systems better than another generic statistic bar. Birth, youth, adulthood, and retirement should offer genuinely different priorities. These are design priorities, not claims that the UI changes implement new story content.

## Verification

The focused final-source browser run passed 75 view checks across 360, 390, 430, 768, and 1440 pixels, without horizontal page overflow, small phone controls, or JavaScript errors. It imported the authentic played scholar and continued with actual purchases, priority changes, and a conversation; no fields were edited or granted. It verified:

- Character at 390px is 3,642px high before opening an optional calling group, down from the 9,442px baseline. All twelve calling cards remain available and visible when their group is opened.
- The disabled paladin initiation states its actual requirement on the page.
- Calling and material disclosures remain open through navigation and a real purchase; the purchased control keeps keyboard focus.
- The selected contact remains fully visible in the horizontal rail.
- A real pending reply produces one attention banner. All companion/equipment controls correctly show the canonical lock while that reply waits.
- Changing annual priorities or living standards spends no time, grants no money or health, and updates the visible year forecast. Effects require actual elapsed time.

The fresh expanded smith route completed actual mastery work beyond age 30, rather than assuming the previous threshold. The smith retired at 32 after earning 1,800 XP, and the actual adopted heir continued at 13, completed the next birthday at 14, and attended their own school. The inherited world and workshop were conserved; the child's professional mastery reset. The separate/stay choice was reached through the actual contact. The public salary, household expenses, masterwork's 35-gold upfront price, and inheritance were checked separately.

An expanded scholar run initially exposed a test-policy omission: a materials-free commission still requires an extra cloth for fine finishing. The interface correctly displayed that requirement. The browser helper now buys the finishing material specified by the real method before crafting; it does not bypass the lock. The saved baseline lives are authentic played artifacts and may be imported for targeted UI continuation checks; they are never edited to grant resources or bypass prerequisites.


Reproduction:

```sh
# Serve dist first, then record fresh routes; no standalone build runs here.
HEARTH_UI_PHASE=verification python3 scripts/browser-playtest.py
# Use the actual saved scholar for focused UI continuation checks.
HEARTH_UI_FOCUSED=1 python3 scripts/browser-playtest.py
```

The full legacy browser journey was also updated to earn mastery through additional actual full-year commitments and to account for paid household costs separately from a masterwork's upfront price. Root integration runs compare that complete journey against the final hosted and network-isolated offline bundle.

The final expanded city-orphan scholar also completed its fresh route: 79 recorded controls and all 15 views at both 390 and 1440 pixels (30 checks), with no JavaScript errors. Its complete action/choice/journal transcript and the expanded smith family's actual 205-entry journal are appended to `ui-lives.json`.

The authentic vampire/necromancer construct encounter from the adventure reviewer was imported unchanged for a final combat UI probe (`artifacts/playtest/adventure-vampire-construct-midbattle.json`). Its initial actor was the scout, so the three actual companion turns were played with Defend until the hero's turn. Blood draw was then visibly disabled with “No remaining enemy carries blood,” while ordinary Attack remained enabled against the Stone sentinel and Binding echo. Rendering left the exact saved encounter unchanged; an actual Attack advanced the battle. The final probe passed the 75 responsive view checks plus this real combat check, with zero JavaScript errors (`/workspace/scratch/phone-ui-bloodless-final.log`).
