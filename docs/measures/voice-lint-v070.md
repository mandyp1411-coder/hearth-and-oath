# Voice lint

Source version 0.70.0, run 2026-10-23. The lint (`scripts/voice-lint.mjs`) reads every string literal in `dist/js` that reads as prose and reports the phrases in `scripts/lib/voice-rules.mjs`: the ledger's words where the chronicle should speak, and text that was never finished. In v0.70 it reports only; `--strict` is how a later release turns the failures on.

## The count

- Modules scanned: 284 (9 skipped, listed below)
- Player-facing strings: 22864
- Hits: 614 (614 audit, 0 placeholder)
- Modules with a hit: 137

## Hits by rule

| Rule | Severity | Hits | Why it is a hit |
|---|---|---:|---|
| `recorded` | audit | 515 | The game says what happened; a ledger says it was recorded. |
| `accrues` | audit | 16 | Interest accrues on a balance sheet; in the game the lender is owed more. |
| `saved-trailer` | audit | 15 | A toast that confirms a write; the game says what is now true. |
| `reattached` | audit | 11 | Save-system vocabulary shown to the player. |
| `category` | audit | 10 | Categories belong to a filing cabinet, not to a life. |
| `compatible` | audit | 9 | Software compatibility; the game has no software. |
| `is-unchanged` | audit | 8 | A diff report; if nothing happened, say nothing or say what stayed. |
| `prediction` | audit | 7 | Enemy intentions are read from their stance, not reported as predictions. |
| `assigned-point` | audit | 5 | Character sheets have points to assign; a life has years. |
| `browser-save-status` | audit | 4 | The browser is not part of the world. |
| `not-a-promise-of` | audit | 3 | A disclaimer about what a number means; the game shows the number or does not. |
| `settled-separately` | audit | 3 | The Bible’s own example of the audit log: money is paid, not settled separately. |
| `range-of-total` | audit | 2 | Pager text ("1–4 of 4"); the game does not paginate its world. |
| `choose-this-action` | audit | 1 | The default caption on every scene choice; a choice needs its own words or none. |
| `dependent-choices` | audit | 1 | A form’s wiring, not a person’s. |
| `estimate` | audit | 1 | A labelled estimate is a form field; the game says what it will cost. |
| `metadata` | audit | 1 | Data about data has no place in a chronicle. |
| `record-not-kept` | audit | 1 | A missing record is the save file apologising; the chronicle simply does not mention what it does not know. |
| `retained-archives` | audit | 1 | Save-system vocabulary shown to the player. |
| `lorem` | placeholder | 0 | Filler text. |
| `nan` | placeholder | 0 | A number that failed to be one. |
| `null` | placeholder | 0 | A missing value printed as a word. |
| `object-object` | placeholder | 0 | An object printed instead of its text. |
| `offers-count` | audit | 0 | A pager’s header; the market has stalls, not a count of offers. |
| `placeholder` | placeholder | 0 | The word itself, left where a line should be. |
| `schema` | audit | 0 | The save format’s word. |
| `template-leak` | placeholder | 0 | A template placeholder inside a plain string: the expression was never evaluated. |
| `todo` | placeholder | 0 | A note to the author, shown to the reader. |
| `undefined` | placeholder | 0 | A missing value printed as a word. |
| `unlocked` | audit | 0 | An achievements screen; the game’s doors open, they are not unlocked with a colon. |

## The worst twenty modules

| Module | Strings | Hits |
|---|---:|---:|
| `dist/js/app.js` | 587 | 44 |
| `dist/js/personal-stories-v27.js` | 528 | 22 |
| `dist/js/campaign.js` | 556 | 20 |
| `dist/js/family-origins.js` | 161 | 19 |
| `dist/js/engine.js` | 906 | 17 |
| `dist/js/people-records.js` | 41 | 16 |
| `dist/js/lineage.js` | 231 | 15 |
| `dist/js/community.js` | 185 | 14 |
| `dist/js/health.js` | 174 | 14 |
| `dist/js/dynasty-ui.js` | 112 | 13 |
| `dist/js/life-context.js` | 47 | 12 |
| `dist/js/household.js` | 402 | 11 |
| `dist/js/journal-ui-v30.js` | 41 | 11 |
| `dist/js/research-runtime.js` | 67 | 11 |
| `dist/js/counting-table-job.js` | 75 | 10 |
| `dist/js/research-definitions.js` | 65 | 10 |
| `dist/js/companion-field-assists.js` | 30 | 9 |
| `dist/js/creator.js` | 51 | 9 |
| `dist/js/faction-first-missions.js` | 202 | 9 |
| `dist/js/life.js` | 526 | 9 |

## Hits by module

### `dist/js/app.js` — 44

- line 247 · `reattached` (“reattaching”): The Ironman position was archived. Review it before reattaching.
- line 262 · `reattached` (“reattachment”): Review reattachment The attachment may already be saved. Retry the original operation or freshly review this run before choosing an archive or deletion. {…}
- line 262 · `reattached` (“Reattach”): Reattach the retained position to this reviewed empty slot. An unresolved action can resume only if the saved position exactly matches its reserved candidate.
- line 262 · `reattached` (“Reattach”): Reattach reviewed position
- line 306 · `reattached` (“reattach”): Only the latest retained position can reattach.
- line 306 · `reattached` (“Reattach”): Reattach reviewed position
- line 306 · `reattached` (“Reattach”): Reattach to freshly reviewed empty slot {…}. Existing backups and other lives remain intact. {…}
- line 306 · `reattached` (“reattachment”): Review empty slot for reattachment
- line 306 · `reattached` (“reattachment”): Archive keeps the full position for later reviewed reattachment. Delete position removes that full position and keeps its nonplayable casualty record; importing a downloaded copy will not restore the deleted position. {…
- line 371 · `recorded` (“recorded”): Your enrollment, lessons and examinations will be recorded here.
- line 374 · `recorded` (“recorded”): Family visits & responsibilities Parents and other relatives keep their own homes. Visit their recorded settlement and Homes area to spend time together. {…}
- line 661 · `browser-save-status` (“browser save status”): {…} {…} HEARTH & OATH / SAVED LIVES {…} {…} {…} {…} {…} {…}{…} Saves stay in this browser. Export keeps a separate JSON file, without changing browser save status. {…} Three saved lives
- line 729 · `recorded` (“recorded”): This account keeps the words recorded at the time; separate itemized changes were not retained.
- line 738 · `recorded` (“recorded”): {…} gold and the listed supplies are already reserved. {…} work days remain; continue at the recorded site without gathering or paying again.
- line 738 · `recorded` (“recorded”): Return to the recorded project site
- line 740 · `recorded` (“recorded”): WORK IN PROGRESS {…} {…} {…} {…} working days remain. Reserved resources are recorded with this project. Abandoning it forfeits the committed gold and supplies. {…}{…}
- line 749 · `category` (“category”): Equipment to make {…} recipes {…} {…} Standard recipes make the named design. Learned patterns make repeatable sound gear with one chosen affix; three matching pieces form its existing set. Rare dungeon pieces can excee…
- line 753 · `recorded` (“recorded”): Part of your recorded background.
- line 824 · `recorded` (“recorded”): Formal school attendance and qualifications are recorded in School.
- line 901 · `recorded` (“recorded”): The upbringing you carry These are your own recorded childhood practices. Personality traits remain your choice within your current age budget. {…}{…}
- line 906 · `recorded` (“recorded”): Find their recorded place
- line 980 · `is-unchanged` (“is unchanged.”): Your note is unchanged.
- line 995 · `browser-save-status` (“browser save status”): Saving needs attention before practice can open safely. Review the browser save status and export your latest session if needed. Your life has not changed.
- line 1013 · `is-unchanged` (“is unchanged.”): Tactics rehearsal. Practice only; your life is unchanged.
- line 1079 · `recorded` (“recorded”): HEARTH & OATH Live a Life in the World Life follows your current moment. {…} Your family, work, health and discoveries shape what happens. Activities separates Everyday, Work & School, Recovery, Training, Social & Fun, …
- line 1115 · `recorded` (“recorded”): Review {…} {…} sessions · up to {…} actual days · {…} Gold in direct fees if every session is attended. Household living costs continue separately. Each session rechecks the current offer and affordability. The routine …
- line 1120 · `reattached` (“reattach”): Retained Ironman positions Review and reattach an archive before playing or exporting it. {…}
- line 1342 · `saved-trailer` (“saved.”): Your session is not saved.
- line 1377 · `retained-archives` (“Retained archives”): Resume this Ironman position before exporting. Retained archives must first be reattached.
- line 1377 · `reattached` (“reattached”): Resume this Ironman position before exporting. Retained archives must first be reattached.
- line 1391 · `browser-save-status` (“Browser save status”): Download started: {…}. Browser save status is unchanged.
- line 1391 · `is-unchanged` (“is unchanged.”): Download started: {…}. Browser save status is unchanged.
- line 1506 · `is-unchanged` (“is unchanged.”): Enter a whole age from 0 to {…}. Your draft age is unchanged.
- line 1533 · `saved-trailer` (“saved.”): Current equipment saved.
- line 1533 · `saved-trailer` (“saved.”): Loadout name saved.
- line 1541 · `recorded` (“recorded”): Your preferences are recorded.
- line 1605 · `recorded` (“Recorded”): Recorded route cleared.
- line 1703 · `is-unchanged` (“is unchanged.”): Filters cleared. Your portrait is unchanged.
- line 1738 · `saved-trailer` (“saved.”): The reviewed Ironman position is saved.
- line 1739 · `saved-trailer` (“saved.”): The reviewed import is saved.
- line 1771 · `recorded` (“recorded”): Their recorded home has no charted route yet.
- line 1784 · `category` (“Category”): Search and slot filter cleared. Category and finish are unchanged.
- line 1845 · `recorded` (“recorded”): Their recorded home has no charted route yet. Ask at a known settlement for leads.
- line 1974 · `compatible` (“compatible”): This is not a compatible Hearth & Oath save. Your current life is safe.

### `dist/js/personal-stories-v27.js` — 22

- line 415 · `compatible` (“incompatible”): Start only with an existing living child whose actual age is at least 18, present at the inhabited home settlement, and a hero age of at least 36. The child must not already be dead, missing or bound to an incompatible …
- line 516 · `recorded` (“recorded”): Start only after an actual recorded wolf rampage or vampire feeding harm with an existing named living adult survivor present locally. Do not invent a victim, confirmed murder, curse type, infection or exposure. The act…
- line 959 · `recorded` (“recorded”): You help make the room lighter while protecting the occupants’ chosen privacy. The ordinary moth is buried beneath the sill, and the earlier visitor keeps the fate already recorded.
- line 1035 · `recorded` (“recorded”): You support a signal current crews can use around actual hazards. The old shift keeps its recorded ending, while living workers gain a way to refuse a dangerous continuation.
- line 1088 · `recorded` (“recorded”): The new table at {place} has a loose leg. Several people insist it always had one; a younger keeper suspects someone simply avoided mending it. Among {name}’s old pages is a line about the warmth after a strange door cl…
- line 1225 · `recorded` (“recorded”): You support route markings that remain practical without claiming one emblem represents every beastfolk traveler. The older threshold retains its recorded ending, and the new road belongs to living journeys.
- line 1243 · `recorded` (“recorded”): You support shared practical tending without making the keepers speak as one people. The dancing kettle remains useful, and the old travelers keep the separate fate recorded in their account.
- line 1273 · `prediction` (“predictions”): You advertise predictions the current observations cannot support. The venture gains your claims, while the old account and new sky remain available to contradict a convenient prophecy.
- line 1291 · `prediction` (“prediction”): You replace admitted absence with a prediction useful to your standing. Earlier copies preserve the pillow and blank, recording where your new certainty began without an observation.
- line 1336 · `recorded` (“recorded”): Your latest choice used the crossing’s fear or access as leverage. The recorded fate of the boat remains intact, and your new claim cannot turn resemblance into a verified token.
- line 1339 · `recorded` (“recorded”): Your latest choice preserved the watcher’s wrongdoing alongside the lives it affected. The earlier release or continuing vigil remains recorded; a repaired memorial does not grant the watcher a pardon.
- line 1344 · `recorded` (“recorded”): Your latest choice tended welcome while leaving the living household room to breathe. The strange guest keeps its recorded fate; ordinary moths at the sill do not prove a return.
- line 1349 · `recorded` (“recorded”): Your latest choice preserved remembrance without assigning strangers to a living family. The silver shadows keep their recorded fate, and uncertain names remain distinct from inherited entitlement.
- line 1354 · `recorded` (“recorded”): Your latest choice gave attention to a worker’s actual burden rather than another endless test. The old shift keeps its recorded ending; current crews still need their own useful practices.
- line 1359 · `recorded` (“recorded”): Your latest choice kept welcome compatible with a guest’s departure. The impossible host keeps its earlier recorded fate, while the living table has practical burdens of its own.
- line 1359 · `compatible` (“compatible”): Your latest choice kept welcome compatible with a guest’s departure. The impossible host keeps its earlier recorded fate, while the living table has practical burdens of its own.
- line 1364 · `recorded` (“recorded”): Your latest choice heard a burden without demanding another impossible proof. The old shadow keeps its recorded fate, and living trainees do not inherit its commander’s oath merely by arriving.
- line 1369 · `recorded` (“recorded”): Your latest choice left room for the song and the lives around it. The old echoes keep their recorded ending; living singers can change a verse without summoning them back.
- line 1374 · `recorded` (“recorded”): Your latest choice allowed a promise to have questions and an ending. The old mirror keeps its recorded fate; a horned frame does not establish anyone’s virtue or blood obligation.
- line 1379 · `recorded` (“recorded”): Your latest choice kept separate travelers and traditions from being forced into one voice. The old threshold keeps its recorded fate; current guides follow living roads for their own reasons.
- line 1381 · `recorded` (“recorded”): Your latest choice used access or one favored route story to strengthen control. Other guides retain their signs and memories, while the denied departures stay recorded in the older account.
- line 1384 · `recorded` (“recorded”): Your latest choice kept attention on an actual watch or its honest limits. The other night retains its recorded ending; the living sky need not produce another revelation to be worth observing.

### `dist/js/campaign.js` — 20

- line 36 · `recorded` (“recorded”): labeled remedy stores and gardens whose limits are recorded beside their uses
- line 62 · `recorded` (“recorded”): {…} Consume these actual supplies once; fourteen recorded work days and skill 2 are required.
- line 77 · `recorded` (“recorded”): A former participant asks to leave the compact before the winter review. A council member argues that the departure is inconvenient. Their inconvenience does not rewrite the right you recorded.
- line 94 · `recorded` (“recorded”): A witness preserves an ancestor’s recorded refusal beside a compulsory order. Officials demand the original. The witness asks whether a public record can protect a person the covenant ignores.
- line 178 · `recorded` (“recorded”): Your recorded keeper term ended. Missing a review never grants another year of your life; voluntary service can only renew through an explicit agreement.
- line 239 · `recorded` (“recorded”): Your recorded term ends on day {…}. You may invoke its withdrawal clause now; another year requires a new explicit agreement.
- line 244 · `recorded` (“recorded”): Your public contribution for this lived year is already recorded.
- line 265 · `recorded` (“recorded”): You bring your recorded account of “{…}” to the discussion; its source remains named.
- line 282 · `recorded` (“recorded”): Your recorded term ends on day {…}. Its withdrawal clause is real: you can return to ordinary life now, or choose a new year with the witnesses recording your consent. Silence cannot renew the term.
- line 291 · `recorded` (“recorded”): You returned to a place destroyed in a recorded war.
- line 291 · `recorded` (“recorded”): You returned to a lost place whose cause is not recorded.
- line 309 · `recorded` (“recorded”): The willing compact inherited by your community needs another public review. A participant asks to leave under its recorded rights; your family’s earlier choice now belongs to the people who live with it.
- line 346 · `recorded` (“recorded”): A willing keeper may end this term through its recorded withdrawal clause.
- line 347 · `recorded` (“recorded”): The living keeper completed their term and left through the recorded withdrawal clause. Reduced wards and ordinary public works preserve the city.
- line 354 · `recorded` (“recorded”): The recorded household
- line 354 · `recorded` (“recorded”): The recorded household
- line 380 · `recorded` (“recorded”): Your recorded {…} experience provided {…}. The preparation consumed {…} and did not grant the other preparations without their actual allies.
- line 429 · `recorded` (“recorded”): Your recorded home in {…} can no longer shelter the household. Temporary lodgings are recorded in {…}; a property at another address would remain yours.
- line 477 · `recorded` (“recorded”): Established institutions recorded the willing terms, while excluded households continue to ask for representation.
- line 486 · `recorded` (“recorded”): An earlier family generation recorded this stage of the covenant inquiry. {…}

### `dist/js/family-origins.js` — 19

- line 46 · `recorded` (“recorded”): The copied mark belongs to the community’s care for the cradle: shared bread, seeds or makers’ work. It is not recorded as a hereditary seal.
- line 47 · `recorded` (“recorded”): The surviving copy repeats the recorded household facts. It carries no authenticated clue to another identity or a living person’s whereabouts.
- line 56 · `recorded` (“recorded”): The exact recorded custodian is unavailable. Keep the uncertain account or close the search; no successor inherits their testimony.
- line 69 · `recorded` (“recorded”): your recorded caregiver
- line 70 · `accrues` (“accrue”): Household living costs accrue separately.
- line 74 · `recorded` (“recorded”): Keep the recorded names and their limits without inventing a conversation.
- line 74 · `recorded` (“recorded”): Close this search respectfully. Keep what was already recorded; no failure or penalty.
- line 76 · `recorded` (“recorded”): The recorded archive or its exact named archivist is no longer available. The household copy is still yours. An unavailable source cannot be treated as an inspection.
- line 77 · `not-a-promise-of` (“not a promise of”): Spend one day inspecting the actual register. Gain one practiced Scholarship; a discovery is not a promise of parent survival.
- line 96 · `recorded` (“recorded”): The household copy keeps the names and gaps that were actually recorded.
- line 97 · `recorded` (“recorded”): You fold the page along its old crease. {…} has a place in your history; the recorded losses and gaps remain as they were. Not every unanswered question has to become tomorrow’s work.
- line 101 · `recorded` (“recorded”): the recorded names
- line 111 · `recorded` (“recorded”): The exact recorded archive source was unavailable. The household copy was preserved; no register inspection or new identity was claimed.
- line 144 · `recorded` (“recorded”): Read the proposal with the exact recorded archivist. Actual inspection costs one day.
- line 155 · `recorded` (“recorded”): You chose to compare the household account with the register. The search promises no reunion. Its named people, childhood choices and starting family facts are now recorded.
- line 156 · `recorded` (“recorded”): The search can wait. Its evidence and people stay recorded.
- line 156 · `recorded` (“recorded”): The search resumes from its recorded next step.
- line 196 · `recorded` (“recorded”): Compare the household account with the exact recorded archive source.
- line 228 · `recorded` (“recorded”): The exact recorded archive source was unavailable. The household copy was preserved; no register inspection or new identity was claimed.

### `dist/js/engine.js` — 17

- line 584 · `recorded` (“recorded”): Your own identity and romantic interests are recorded. Other people keep their own wishes.
- line 593 · `recorded` (“recorded”): Only recorded rooms can be marked.
- line 596 · `saved-trailer` (“saved.”): That map reminder could not be saved.
- line 633 · `recorded` (“recorded”): This care supports your recorded physical symptoms. Health restoration does not immediately clear illness or injury.
- line 634 · `recorded` (“recorded”): You have no recorded physical symptoms. This is preventive supportive care; full Health does not remove that benefit. Existing longer care windows are kept, and values at their limits do not increase.
- line 1064 · `recorded` (“recorded”): Your personality and its ability gains are recorded.
- line 1233 · `recorded` (“recorded”): The merchant recognizes you. Two pieces of local evidence are recorded; restitution remains possible.
- line 1391 · `recorded` (“recorded”): The order offers a supervised encounter against trial guardians, or four days escorting vulnerable travelers. Your chosen oath will be recorded in the character journal.
- line 1714 · `recorded` (“recorded”): Hunger falls, but an identified witness reports the assault. Three local evidence are recorded.
- line 1788 · `recorded` (“recorded”): You made a home in {…}, developed your career to rank {…}, and recorded {…} year{…} of changing priorities.
- line 1796 · `recorded` (“recorded”): Your {…} life included {…} working days, {…} fulfilled commissions, and {…} gold earned through recorded work.
- line 1800 · `recorded` (“recorded”): Your household's recorded living costs totalled {…} gold{…}.
- line 1807 · `recorded` (“recorded”): You kept {…} recorded promise{…}{…}. {…}
- line 1922 · `recorded` (“recorded”): This life’s portrait belongs to its recorded history. Continue as an heir to choose their face.
- line 1934 · `saved-trailer` (“saved.”): Your portrait for this age is saved.
- line 1942 · `recorded` (“recorded”): Your family heritage is recorded in Character and Lore.
- line 2178 · `recorded` (“recorded”): This road has no recorded route.

### `dist/js/people-records.js` — 16

- line 15 · `recorded` (“recorded”): An earlier shared experience remains recorded in your conversations.
- line 36 · `recorded` (“Recorded”): Recorded meetings in the last 30 days.
- line 36 · `recorded` (“recorded”): People recorded as present in your household.
- line 36 · `recorded` (“recorded”): People with a recorded bond of at least 65.
- line 36 · `range-of-total` (“{…}–{…} of {…}”): People You Have Met {…} Find a remembered person Find {…} {…} {…} Showing {…}–{…} of {…} matching people · {…} known overall · Page {…} of {…}. {…} {…} / {…} {…} Contact scope Name or role
- line 41 · `recorded` (“recorded”): A recorded public vacancy
- line 41 · `recorded` (“recorded”): A recorded retirement
- line 41 · `recorded` (“recorded”): Public role ended after their recorded death
- line 41 · `recorded` (“recorded”): Their earlier public life remains recorded; later whereabouts are unrecorded.
- line 41 · `recorded` (“recorded”): The original person and your shared history remain recorded.
- line 43 · `recorded` (“recorded”): No formal mentor meeting is recorded.
- line 43 · `recorded` (“recorded”): Your study with this person {…} {…} supervised preparation lessons are recorded with this person. Earned callings and trained skills remain your own.
- line 43 · `record-not-kept` (“date was not kept”): An exact date was not kept in this earlier record.
- line 43 · `recorded` (“recorded”): Find their recorded place
- line 43 · `recorded` (“recorded”): No specific shared memory has been recorded yet.
- line 43 · `recorded` (“recorded”): {…} A PERSON IN YOUR LIFE {…} {…} · {…} {…} · {…}/100 {…} {…}{…}{…} {…} {…}{…} First recorded meeting {…}{…} {…} What you share {…} {…}{…}{…}

### `dist/js/lineage.js` — 15

- line 105 · `recorded` (“recorded”): The household is already caring for three recorded children.
- line 119 · `recorded` (“recorded”): Their birth parents died during a recorded regional flood; a named shelter keeper has cared for them since.
- line 132 · `recorded` (“recorded”): {…} says they would welcome your offer, provided they can keep their own name, friends, and learning. Their agreement is recorded; you must still prepare the home.
- line 132 · `recorded` (“recorded”): Keep the met child and their recorded wishes. No fee, new parent, or age reset.
- line 140 · `recorded` (“recorded”): The young person is now an adult; the earlier wishes remain recorded, and no childhood adoption is made.
- line 216 · `recorded` (“recorded”): Take up this actual child's life at age {…}. The world stays on day {…}; cash is divided among living children and the selected successor receives the recorded household property. Only their learned skills carry over.
- line 223 · `recorded` (“recorded”): Keep the child’s recorded identity and wishes. No new child, fee, or inherited claim is created.
- line 237 · `recorded` (“recorded”): One real session develops the chosen school skills. Six attended sessions earn a recorded school qualification; sessions become available every thirty days. An operating learning hall can cover the session fee.
- line 240 · `recorded` (“recorded”): This is your recorded preference.
- line 272 · `recorded` (“recorded”): A recorded independent beginning
- line 407 · `recorded` (“recorded”): You and {…} made room for {…}. Their own {…} trait grew; their practiced skills are recorded for their future.
- line 551 · `recorded` (“recorded”): You are part of {…}'s actual recorded family.
- line 566 · `recorded` (“recorded”): Your other recorded parent, with a life and memories of their own.
- line 586 · `recorded` (“recorded”): {…} takes up the story at age {…} on world day {…}. {…} gold and the recorded household property pass to them; {…}. Their own recorded learning remains. {…}'s chronicle is preserved in the dynasty; the changed world is …
- line 589 · `recorded` (“recorded”): {…}'s own {…} introduction and {…} recorded unpaid training days continue. No earlier wages or the parent's professional mastery are awarded.

### `dist/js/community.js` — 14

- line 50 · `recorded` (“recorded”): The building cannot serve people at a closed or lost site; the charter and protected funds remain recorded.
- line 96 · `recorded` (“recorded”): {…} actual days remain. The recorded {…} gold and {…} are already committed and will not be charged again.
- line 96 · `recorded` (“recorded”): Return to the project’s recorded site.
- line 97 · `recorded` (“recorded”): Keep the recorded work already paid for. Its endowment and services are not created by an unfinished plan.
- line 100 · `recorded` (“recorded”): This dynasty already has 24 recorded undertakings.
- line 119 · `recorded` (“recorded”): {…} proposed {…}. {…} will be recorded in its charter{…}. No fee, building or advantage has yet been created.
- line 145 · `recorded` (“recorded”): Its value is in the recorded services and people; this recognition grants no repeated cash or stat bonus.
- line 174 · `saved-trailer` (“saved.”): {…}: {…} actual days remain in the paid milestone. The quotation and remaining work are saved.
- line 176 · `recorded` (“recorded”): The final endowment is now recorded.
- line 287 · `recorded` (“recorded”): {…} {…} are recorded in the proposal. {…}The three recorded milestones cost {…} gold in total. A charter choice spends no gold or time and grants no service before completion.
- line 290 · `recorded` (“recorded”): Keep the protected reserve and its recorded purpose. If funding has run out, choose a contribution separately.
- line 290 · `recorded` (“recorded”): Reopen the recorded service
- line 297 · `recorded` (“recorded”): {…}'s recorded place in the charter
- line 297 · `recorded` (“recorded”): Let the recorded community decide

### `dist/js/health.js` — 14

- line 89 · `recorded` (“recorded”): Earlier symptom-care days were not separately recorded.
- line 89 · `recorded` (“recorded”): {…} symptom-care days recorded during this plan.
- line 105 · `recorded` (“recorded”): {…} actual days of the {…}-day plan were attended. {…} symptom-care days separately recorded; earlier unrecorded credit is not inferred. {…} gold was paid. Unused days grant no recovery; completed care remains.
- line 146 · `recorded` (“recorded”): Symptoms still recorded: {…}. Continue care as needed; plan completion is separate from symptom recovery.
- line 146 · `recorded` (“recorded”): No active symptoms remain recorded.
- line 146 · `recorded` (“recorded”): {…}/{…} actual plan days attended; {…} symptom-care days separately recorded; {…} gold paid once. {…} {…}
- line 165 · `recorded` (“Recorded”): Recorded symptoms still need lived recovery; this is not an instant cure.
- line 165 · `recorded` (“recorded”): No active physical symptoms are recorded; the care window provides preventive support.
- line 165 · `settled-separately` (“settled separately”): Herbal care for {…}. {…} Medicinal Herb{…} used; {…} day{…} passed. No direct Gold fee; household costs are settled separately. Actual session changes: {…}. Physical care is supported through day {…}{…}. {…} Values alre…
- line 234 · `recorded` (“recorded”): It was first noted while low joy and continuing stress were recorded.
- line 237 · `recorded` (“recorded”): Supported care can lower severity to 1; this recurring condition remains recorded.
- line 282 · `recorded` (“recorded”): The original cause was not recorded.
- line 544 · `recorded` (“recorded”): {…} remains recorded at severity {…}/3 despite full health.
- line 544 · `recorded` (“recorded”): No active symptoms are recorded. Your health and bodily wellbeing still measure different needs.

### `dist/js/dynasty-ui.js` — 13

- line 36 · `recorded` (“Recorded”): Recorded budget shortfall: {…} gold. Community care protects basic necessities; optional comforts are put aside when savings run short.
- line 45 · `recorded` (“recorded”): The agreed wage is {…} gold per three completed working days. Your progress and earnings remain recorded when life interrupts.
- line 82 · `recorded` (“recorded”): No active symptoms recorded
- line 82 · `recorded` (“recorded”): No ongoing physical condition is recorded. Rest and a gentle routine can still be part of your days.
- line 82 · `recorded` (“recorded”): No active symptoms recorded
- line 82 · `recorded` (“recorded”): No ongoing emotional condition is recorded. You can seek company and support without needing a diagnosis.
- line 100 · `recorded` (“recorded”): Practiced skills will be recorded here.
- line 101 · `recorded` (“recorded”): No child is recorded in your household yet. Shared life, housing, and the time you make for care can open that next chapter.
- line 102 · `recorded` (“recorded”): Naming a preferred successor records your hopes. When you close this chapter, you can choose a living child; they keep their own recorded skills, education and adult livelihood.
- line 102 · `recorded` (“recorded”): THE NEXT LEAF OF THE BOOK {…} {…} Living children share the household savings. The chosen successor receives its home, equipment, completed structures, and recorded workplace. {…}{…}
- line 103 · `recorded` (“recorded”): {…} gold passed to the chosen child. {…} and the household’s recorded property continued with them.
- line 103 · `recorded` (“recorded”): You are writing this family’s first recorded chapter.
- line 108 · `recorded` (“Unrecorded”): Unrecorded family ties Their identities or whereabouts remain unknown. The family book records no confirmed deaths for these ties. {…}

### `dist/js/life-context.js` — 12

- line 8 · `recorded` (“recorded”): the recorded settlement
- line 13 · `recorded` (“recorded”): Your signed work has a recorded recipient. Your own days, relationships and new interests remain open.
- line 16 · `recorded` (“recorded”): Your {…} work has {…} recorded days. Build on it, change direction or make room for another part of life.
- line 24 · `recorded` (“recorded”): Their age and own development follow their recorded birth date.
- line 38 · `recorded` (“Recorded”): Recorded life entry
- line 42 · `recorded` (“Recorded”): Their own lives · {…} Recorded plans and news shared with this household. Opening this page makes no decision for anyone. {…}{…}
- line 49 · `recorded` (“recorded”): Find recorded place
- line 49 · `recorded` (“recorded”): Make good on an earlier account These are proposals for actual restoration work. The original harm remains recorded; attendance buys no affection or forgiveness. {…}
- line 49 · `recorded` (“recorded”): no separate standing score recorded
- line 49 · `recorded` (“recorded”): No outstanding report is recorded here.
- line 49 · `recorded` (“recorded”): No matching account has yet been recorded.
- line 49 · `recorded` (“Recorded”): THIS PART OF YOUR LIFE {…} {…} Chronological age {…}. Portrait stages begin at 40, 55 and 65; {…} physiology uses its own later-life milestones (elder stage {…}). Saved birth and death dates are preserved. Household cal…

### `dist/js/household.js` — 11

- line 16 · `recorded` (“recorded”): Your recorded caregiver
- line 58 · `recorded` (“recorded”): Let each neighbor approve their own recorded account
- line 150 · `recorded` (“unrecorded”): Birth parent {…} · identity unrecorded
- line 150 · `recorded` (“unrecorded”): Birth parent {…} · identity unrecorded
- line 239 · `recorded` (“unrecorded”): Have a specific discussion with your caregiver. Once per year, raise household support by 10 and reduce stress by 6. No unrecorded parent appears and no money is created.
- line 241 · `recorded` (“recorded”): Your recorded caregivers have died; their names remain in your legacy.
- line 346 · `recorded` (“recorded”): {…} helped arrange practical support. The people recorded in your household remain the people who are actually present.
- line 372 · `recorded` (“recorded”): Your {…} recorded sessions, {…} course progress and {…}/100 performance resume.
- line 549 · `recorded` (“recorded”): {…} arranged a place at the communal shelter. You were kept warm while familiar voices settled around you. Your recorded caregiver remains the person caring for you.
- line 574 · `recorded` (“recorded”): your recorded caregiver
- line 586 · `recorded` (“recorded”): No enrollment recorded

### `dist/js/journal-ui-v30.js` — 11

- line 28 · `recorded` (“unrecorded”): Their later whereabouts are unrecorded.
- line 28 · `recorded` (“recorded”): Their public retirement is recorded. The saved one-time return window ends on world day {…}; current availability still matters. {…}Withdrawal remains possible without losing supplies, Gold or trust.
- line 29 · `saved-trailer` (“saved.”): rooms explored. Discovered passages remain saved.
- line 43 · `category` (“category”): Search active quests, commitments and offers in this category.
- line 43 · `recorded` (“recorded”): Search finished quests and recorded life entries.
- line 48 · `category` (“categories”): {…} Quest categories
- line 51 · `recorded` (“recorded”): matching / {…} recorded
- line 51 · `category` (“category”): Active quests and commitments: {…}{…}. {…} category.
- line 53 · `recorded` (“recorded”): Clear the search to see your recorded quests and commitments.
- line 59 · `recorded` (“recorded”): No earlier moments have been recorded.
- line 63 · `recorded` (“recorded”): matching / {…} recorded

### `dist/js/research-runtime.js` — 11

- line 38 · `recorded` (“recorded”): The exact recorded archivist is unavailable. Keep your acquired copies, explicitly arrange new public custody, or close the question; no successor inherits a private account.
- line 39 · `recorded` (“recorded”): Return to the recorded home settlement.
- line 100 · `recorded` (“recorded”): Return to the actual recorded home table before comparing these copies.
- line 138 · `recorded` (“recorded”): Visit your actual recorded home table.
- line 140 · `recorded` (“recorded”): Visit your actual recorded home table.
- line 141 · `recorded` (“recorded”): Visit your home table or the recorded archive.
- line 163 · `recorded` (“recorded”): You closed this finite question without an unsupported verdict. Acquired copies, practiced comparison and open questions remain recorded. No failure or further reward was invented.
- line 185 · `recorded` (“recorded”): The recorded home or exact local archivist is no longer available. Leave the proposal; no research has been accepted.
- line 188 · `recorded` (“recorded”): Return to the actual recorded home table.
- line 208 · `accrues` (“accrue”): Home collection takes 1 attended day, with no fee or wages. Ordinary household costs accrue separately.
- line 266 · `recorded` (“recorded”): Return to the recorded household table or close the question.

### `dist/js/counting-table-job.js` — 10

- line 35 · `recorded` (“recorded”): {…}, the exact recorded merchant, is unavailable. A successor cannot replace this target.
- line 54 · `recorded` (“recorded”): the recorded representative
- line 59 · `recorded` (“recorded”): {…}, the exact recorded source, is unavailable. No successor inherits their testimony.
- line 81 · `recorded` (“recorded”): The attended day is already recorded; resolving the blocker spends no second day.
- line 137 · `recorded` (“recorded”): The attended day remains recorded; no silver was taken.
- line 161 · `recorded` (“recorded”): The recorded preparation source changed.
- line 163 · `recorded` (“recorded”): {…} One actual day was recorded for {…}. {…}/3 preparation days complete. No silver or Gold was awarded.
- line 212 · `recorded` (“recorded”): This life closed before the counting-table plan was completed. Earlier attended days remain recorded; no unfinished property or reward was claimed.
- line 221 · `recorded` (“recorded”): Claimed; no longer carried. Its later disposition is not recorded here.
- line 229 · `recorded` (“recorded”): {…}/5 actual job days recorded. No Gold fee; household costs are separate.

### `dist/js/research-definitions.js` — 10

- line 32 · `recorded` (“recorded”): A payment share is not an ownership deed. The three recorded contributors need not be the original builders.
- line 47 · `recorded` (“recorded”): The three marks can be attributed to the recorded collaborative repair.
- line 48 · `recorded` (“recorded”): The recorded flour shares reimburse repair work; the schedule does not transfer the mill.
- line 51 · `recorded` (“recorded”): The repair belongs to three recorded contributors. A share of flour is not ownership of the wheel; the original-builder line stays open.
- line 77 · `recorded` (“recorded”): The watch-keepers who recorded the early warning.
- line 78 · `recorded` (“recorded”): Before the captain’s authorization, a watch-keeper sent three shuttered lantern signals down the road. The upper bell rope was recorded as unfit. The log records a warning sent, not a bell rung by an unseen hand.
- line 92 · `recorded` (“recorded”): Three upland lights were seen before an alarm was heard from the lower road. The observer recorded the order of those observations, but did not identify the lower bell or see who rang it.
- line 100 · `recorded` (“recorded”): The recorded lantern warning preceded the captain’s authorization.
- line 102 · `recorded` (“recorded”): The upper bell’s maintenance lacked recorded approval.
- line 118 · `recorded` (“recorded”): The observer heard an unidentified alarm. That does not identify a bell or establish an unseen cause. Keep the idea as a question or revise the conclusion; no failure is recorded.

### `dist/js/companion-field-assists.js` — 9

- line 95 · `recorded` (“unrecorded”): A downed or unrecorded companion cannot take part. Stabilization is separate.
- line 96 · `recorded` (“recorded”): This companion’s personal Focus is not recorded.
- line 149 · `recorded` (“recorded”): This companion’s recorded growth is not valid.
- line 151 · `recorded` (“recorded”): This companion’s recorded role does not qualify for this assistance.
- line 153 · `recorded` (“recorded”): The target’s living Health and Focus must be recorded.
- line 164 · `recorded` (“recorded”): This room’s recorded assistance is not valid.
- line 167 · `recorded` (“recorded”): The hero’s current hazard skill is not recorded.
- line 179 · `recorded` (“recorded”): The attending hero’s identity is not recorded.
- line 181 · `recorded` (“recorded”): The actual companion’s identity is not recorded.

### `dist/js/creator.js` — 9

- line 94 · `saved-trailer` (“saved.”): The portrait now shows the selected age stage. Choices for other stages remain saved.
- line 120 · `assigned-point` (“assigned points”): Maximum six assigned points.
- line 120 · `assigned-point` (“Assigned points”): Assigned points begin at age 3.
- line 120 · `assigned-point` (“assigned point”): No assigned point to remove.
- line 120 · `assigned-point` (“assigned points”): These bonuses add to the abilities earned in your earlier years. Each attribute can receive up to six assigned points. Shown bonuses are assigned additions, not the final totals from your lived history.
- line 132 · `compatible` (“incompatible”): {…} HEARTH & OATH · A NEW LIFE {…} {…} {…} {…} {…} {…} A FACE AMONG THE FORGOTTEN {…} Choose a whole illustrated portrait, or leave the face to fate. {…} Begin at age {…} Exact age Birth 18 40 {…} {…} {…} years of histo…
- line 138 · `dependent-choices` (“dependent choices”): Leave room for fate Randomize unlocked choices in your beginning. Age, traits, assigned points and a custom name stay yours. Locked dependent choices also keep their ancestry compatible. {…} {…}{…} Randomization locks
- line 138 · `compatible` (“compatible”): Leave room for fate Randomize unlocked choices in your beginning. Age, traits, assigned points and a custom name stay yours. Locked dependent choices also keep their ancestry compatible. {…} {…}{…} Randomization locks
- line 138 · `assigned-point` (“assigned points”): Leave room for fate Randomize unlocked choices in your beginning. Age, traits, assigned points and a custom name stay yours. Locked dependent choices also keep their ancestry compatible. {…} {…}{…} Randomization locks

### `dist/js/faction-first-missions.js` — 9

- line 21 · `recorded` (“recorded”): Travel to the recorded forest site, then keep one field day and one day agreeing an access strip. Survival 4 shortens field assessment; no skill is required.
- line 60 · `recorded` (“recorded”): The recorded work at {…} is closed or occupied. Earlier evidence remains; wait or withdraw.
- line 135 · `recorded` (“recorded”): {…} guests, {…} covers in use and {…} spare covers are recorded. No guest names are copied.
- line 136 · `recorded` (“recorded”): Assign the two recorded spare covers with the steward
- line 161 · `recorded` (“recorded”): Actual arrival at the recorded forest site is required. Identify the gathering strip without moving the tenant’s rights.
- line 211 · `recorded` (“recorded”): Walk to the recorded forest destination after accepting this agreement. A map or earlier visit is not arrival proof.
- line 264 · `recorded` (“recorded”): The named intermediary retains the last recorded custody; no recipient receipt is claimed.
- line 312 · `recorded` (“recorded”): You actually walked the recorded gathering route and agreed an access strip with {…}. Their gathering right remained.
- line 386 · `accrues` (“accrual”): 20 Gold on the completed finite agreement; travel and household accrual are separate.

### `dist/js/life.js` — 9

- line 132 · `recorded` (“recorded”): Guild recognition {…} adds 120 gold to a full working-year forecast, before household priorities and living costs, and 4 gold to a three-day shift. Requires {…} guild experience. Technical mastery develops separately th…
- line 183 · `recorded` (“recorded”): The guild recognizes you as a {…} in {…} work. Your labor now commands better wages. This standing is distinct from the technical mastery earned through recorded professional practice.
- line 206 · `recorded` (“recorded”): Your real children and their recorded parents remain part of the family; separation does not erase them or silently divide the recorded estate.
- line 212 · `recorded` (“recorded”): Their tastes have not yet been recorded; asking is the start of a conversation.
- line 258 · `recorded` (“recorded”): Their {…} sessions are recorded; one shared evening does not replace that education.
- line 285 · `recorded` (“recorded”): Gain scholarship and restore 3 happiness. Their memory becomes an actual recorded family account.
- line 330 · `recorded` (“recorded”): You kept a {…} of {…}. Their death remains recorded; a future life can include this memory.
- line 366 · `recorded` (“recorded”): You turn {…}. {…} asks what you want the coming year to stand for. The completed year is recorded in your yearbook; this answer is a direction rather than a destiny.
- line 535 · `recorded` (“recorded”): The real children, co-parent links, family property and shared past remain recorded.

### `dist/js/maze-receipt-ui.js` — 9

- line 21 · `recorded` (“recorded”): Name not recorded
- line 28 · `recorded` (“recorded”): {…} · recorded property
- line 29 · `recorded` (“recorded”): Companion field help {…} personal companion Focus spent. Herb costs are included once in the recorded costs below. {…}
- line 30 · `recorded` (“recorded”): Partial accounting: some settlement details could not be recorded. The listed gains and costs are a partial account, not complete totals.
- line 30 · `recorded` (“recorded”): Objective method recorded on world day {…}; its existing proof remains separate from this receipt.
- line 30 · `recorded` (“recorded”): No finite finds recorded in the covered interval.
- line 30 · `recorded` (“recorded”): {…} {…} · {…} · generation {…} {…} · Objective {…}{…}. {…}{…} {…} rooms explored (+{…} this visit) · {…} cleared (+{…}) · {…} walks. {…} attended days recorded: {…} entry, {…} below, {…} recovery. {…} combat retreat{…};…
- line 42 · `recorded` (“recorded”): Expedition receipts {…} of {…} recorded visits{…}. Earlier visits keep their original traveler and coverage. {…}
- line 47 · `recorded` (“recorded”): Visit account: {…} attended day{…} recorded · {…} combat retreat{…}.{…}{…}

### `dist/js/curses.js` — 8

- line 27 · `recorded` (“recorded”): An earlier recorded change
- line 47 · `recorded` (“recorded”): Curse lore: {…}. Active damage weakness: {…}. The lore adds no extra elemental or silver damage multiplier; the combatant’s recorded weakness and resistances govern hits.
- line 100 · `recorded` (“recorded”): End future automatic attendance; all past fees, confidences and consent remain recorded.
- line 115 · `recorded` (“recorded”): The jailer recorded your request for a moon chamber.
- line 136 · `recorded` (“recorded”): {…} has followed an actual report in this settlement. {…} They know the recorded exposure; they do not know every private deed.
- line 139 · `recorded` (“recorded”): Present the recorded boundaries and witnesses
- line 179 · `recorded` (“recorded”): No regional curse policy is recorded.
- line 179 · `recorded` (“recorded”): Bloodline attributes and battle powers wait until the infection changes you. Your actual magic reserve is kept as recorded.

### `dist/js/maze-map-ui.js` — 8

- line 39 · `recorded` (“recorded”): {…} walk{…} through recorded rooms.
- line 41 · `recorded` (“recorded”): Choose a marked, recorded room to show a route.
- line 44 · `recorded` (“recorded”): No route through recorded rooms without unresolved danger is available.
- line 45 · `recorded` (“recorded”): This recorded route cannot be shown.
- line 51 · `recorded` (“recorded”): Shortest recorded-room route. Not a safety or cost guarantee. Choose each actual walk yourself. {…}
- line 51 · `recorded` (“Recorded”): Recorded route {…} {…}{…}
- line 52 · `recorded` (“recorded”): {…} {…}/{…} map reminders. Inspect recorded rooms to mark them without walking. {…}
- line 55 · `recorded` (“Recorded”): {…} Recorded route knowledge Inspect never walks. Select a recorded square, use arrows to inspect adjacent recorded squares, or choose a marked room below. Marks are reminders, not rewards or promises. {…} {…} {…} Map m…

### `dist/js/sanctuaries.js` — 8

- line 129 · `recorded` (“recorded”): Paused: their public retirement is recorded, but current presence and consent for a session cannot be established. The original agreement remains; animal feeding is available.
- line 140 · `recorded` (“unrecorded”): Paused: the retired watcher’s present availability is unrecorded. Keep the agreement, but use an independent refuge until actual help is available.
- line 205 · `recorded` (“recorded”): Forty-eight active donor arrangements are already recorded. End an existing agreement before establishing another; no feeding or confidence was granted.
- line 218 · `recorded` (“recorded”): Forty-eight active safety agreements are recorded. Close an existing plan before establishing another; no new preparation was granted.
- line 257 · `recorded` (“recorded”): Actual attendance and the agreed fee are recorded.
- line 384 · `recorded` (“recorded”): A watch patrol recognized you in {…} after the recorded return date. Its source remains {…} You are alive, retain your belongings and can choose a hearing or actual supervised restitution. No distant settlement received…
- line 428 · `recorded` (“recorded”): Their public retirement is recorded; a new session requires verified current presence and willingness. The earlier consent record is not a standing claim on their body.
- line 428 · `recorded` (“recorded”): The earlier safety agreement remains recorded, but the retired watcher is not established as currently present. No watch benefit is granted.

### `dist/js/adult-tournament.js` — 7

- line 18 · `recorded` (“recorded”): has a recorded death. No replacement can take their result.
- line 20 · `recorded` (“unrecorded”): has left that public role; their later availability is unrecorded.
- line 36 · `recorded` (“recorded”): This watch has no recorded regional jurisdiction.
- line 94 · `recorded` (“recorded”): A local challenge, honestly recorded
- line 98 · `recorded` (“recorded”): {…} rubs three spaces into a chalkboard beside the Watchhouse. “Three bouts, and you can stop between them. We are keeping a local card, not choosing anyone’s profession.” {…} {…} Entry costs no Gold. Warm-up and this f…
- line 98 · `accrues` (“accrue”): {…} rubs three spaces into a chalkboard beside the Watchhouse. “Three bouts, and you can stop between them. We are keeping a local card, not choosing anyone’s profession.” {…} {…} Entry costs no Gold. Warm-up and this f…
- line 156 · `recorded` (“recorded”): Let us start with what was recorded.

### `dist/js/fellowship.js` — 7

- line 100 · `recorded` (“recorded”): Discuss a new agreement before continuing the remaining work. Your earlier days and disagreements remain recorded.
- line 144 · `recorded` (“recorded”): Their earlier missed deadline remains recorded, even though you eventually did the work.
- line 164 · `recorded` (“recorded”): {…} died during the agreed time. The actual days remain recorded, but no completion or relationship reward is granted.
- line 267 · `recorded` (“recorded”): The completed days and earlier promise remain recorded. No technique, standing or relationship completion reward is granted.
- line 280 · `recorded` (“recorded”): The original supervisor cannot currently take part. The authored meeting and actual work remain recorded; explicitly arrange supervision before continuing.
- line 284 · `recorded` (“recorded”): Six days of inquiry, eight days of the chosen practice, and two days of review. Missing this date is recorded; it does not remove an earned calling.
- line 300 · `recorded` (“recorded”): Six days of shared work and two days carrying out the negotiated decision. A missed promise is recorded; honest renegotiation remains possible.

### `dist/js/life-stories.js` — 7

- line 36 · `recorded` (“recorded”): The seed account belongs to the participating households. New members can see how shares and disagreements are recorded.
- line 85 · `recorded` (“recorded”): A surviving account of {…}’s work reaches you in {…}. Its keepers ask about the recorded work at {…}.
- line 92 · `recorded` (“recorded”): This recorded chapter is unavailable.
- line 103 · `recorded` (“recorded”): the recorded site
- line 111 · `recorded` (“recorded”): Return to the recorded site for this hands-on work.
- line 164 · `recorded` (“recorded”): Return to the recorded site to keep this hands-on commitment. Its attended days and fee remain recorded.
- line 183 · `recorded` (“recorded”): {…} actual days and {…} gold remain recorded. You withdrew before earning the chapter’s reward.

### `dist/js/realm.js` — 7

- line 138 · `recorded` (“recorded”): Hand this same piece back to its recorded original owner. No payment; existing criminal evidence remains. Unequip it first.
- line 145 · `recorded` (“recorded”): Spend 30 gold and five days rebuilding surviving foundations. {…}/4 stages completed. Old losses remain recorded.
- line 169 · `is-unchanged` (“is unchanged.”): {…}, {…} of {…}, asks: {…} Their copied lead points toward {…}. Examine {…} there, then bring your own account back to this keeper’s institution. Your own congregation is unchanged.
- line 173 · `recorded` (“recorded”): Two days at {…} {…} Return to {…}; the inquiry belongs to {…}’s recorded request.
- line 173 · `recorded` (“recorded”): The inquiry pauses at a calendar need. Your attended days remain recorded.
- line 180 · `recorded` (“recorded”): {…} recorded the sale restricting their institution’s account.
- line 190 · `recorded` (“recorded”): {…} receives the stolen {…} back. You receive no payment; the original property and any local evidence remain recorded.

### `dist/js/status-reference.js` — 7

- line 20 · `recorded` (“recorded”): Supported care manages severity toward 1; this recurring condition remains recorded. Unsupported reviews can reduce Health and bodily wellbeing.
- line 32 · `recorded` (“recorded”): Use the available recovery choices below, or inspect remedies in Inventory. Visiting a provider reviews their offers; it does not automatically treat you. A pleasant activity can ease Stress without ending recorded symp…
- line 33 · `recorded` (“recorded”): symptoms are currently recorded. Care and rest do not require a diagnosis.
- line 33 · `recorded` (“recorded”): Earlier symptom-care days were not separately recorded.
- line 33 · `recorded` (“recorded”): symptom-care days separately recorded.
- line 41 · `accrues` (“accrue”): Household living costs accrue only for actual adult days.
- line 50 · `accrues` (“accrue”): {…} Estimates are not an upfront provider fee; only actual adult days accrue living costs.

### `dist/js/audit-content-v25.js` — 6

- line 3 · `recorded` (“unrecorded”): The keeper crossed into the dead country; the list instead suggests an unrecorded living passenger.
- line 12 · `compatible` (“compatible”): keep healing work compatible with time for family
- line 26 · `recorded` (“recorded”): Defend the recorded limit together
- line 26 · `recorded` (“recorded”): The recorded contract gains a separately priced extension.
- line 27 · `recorded` (“recorded”): Release the route and open the recorded door
- line 28 · `recorded` (“recorded”): A public lesson route opens at the recorded workbench.

### `dist/js/boss-stories-v27.js` — 6

- line 28 · `recorded` (“recorded”): No recorded approach exists.
- line 31 · `recorded` (“recorded”): The required living participants must be present at their recorded hearth.
- line 61 · `recorded` (“recorded”): The required living participants are not present at their recorded hearth.
- line 83 · `recorded` (“recorded”): was returned to its actual recorded source. No sale proceeds were received.
- line 97 · `recorded` (“recorded”): Attendance and fees already spent remain recorded; no reward or rescue was granted.
- line 121 · `recorded` (“recorded”): Transfer this unique property once for 100 gold. Provenance and former owners remain recorded.

### `dist/js/careers.js` — 6

- line 166 · `accrues` (“accrue”): At your present living standard, these days accrue about {…} gold in household costs; changes in your household can change that rate.
- line 191 · `recorded` (“recorded”): Your lifetime work for this profession is already recorded.
- line 293 · `recorded` (“recorded”): You told {…} that {…} would not be delivered. Spent supplies remain spent; the promise and its local professional consequence are recorded.
- line 478 · `recorded` (“recorded”): Your own road journal contains {…} recorded journeys and meetings; the map need not pretend you witnessed every road.
- line 490 · `recorded` (“recorded”): Earn {…} gold; lose {…} professional reputation and {…} safety, adding {…} stress. The tradeoff is recorded.
- line 506 · `recorded` (“recorded”): {…} continues the household custody of {…}. The original authorship and quality remain recorded; no professional mastery or completion reward is inherited.

### `dist/js/conversations.js` — 6

- line 44 · `recorded` (“recorded”): We separated a recorded debt from a demand for loyalty.
- line 345 · `recorded` (“recorded”): They refer to the pressure recorded in their own memories. They do not claim knowledge of your private deeds.
- line 347 · `compatible` (“compatible”): A bounded bargain can be compatible with an ambitious or caring ally.
- line 347 · `recorded` (“recorded”): I refused the proposed task because my recorded boundary remains.
- line 348 · `compatible` (“compatible”): They witness this demand themselves. A compatible ambitious ally can bargain; a free companion can withdraw.
- line 370 · `recorded` (“recorded”): Their recorded account:

### `dist/js/crafting-ui.js` — 6

- line 35 · `accrues` (“accrue”): WORK IN PROGRESS {…} {…} of {…} Days Remain · Supplies and Gold Already Committed {…}{…} Interruptions keep this project saved. Continue here without paying the committed fee or materials again. Household living costs s…
- line 37 · `settled-separately` (“Settled separately”): Expected Living-Cost Accrual +{…} Gold over this time · Settled separately from the fee
- line 37 · `accrues` (“Accrual”): Expected Living-Cost Accrual +{…} Gold over this time · Settled separately from the fee
- line 37 · `accrues` (“accrual”): AT THE WORKBENCH Choose What to Make Inspect a design to see its result, your materials, direct fee, time and expected household accrual before beginning.
- line 38 · `category` (“category”): No designs match these filters. Clear the search or choose another slot or category to see its requirements.
- line 38 · `category` (“Categories”): {…} THE CRAFTSPERSON’S WORKBENCH Craft with {…} {…} Craftsmanship {…} Workbench Tier {…} Your Gold {…} {…} {…} Search Designs {…} Find {…} {…} {…} matching of {…} designs {…} {…} {…} Your Material Store {…} These are th…

### `dist/js/exploration.js` — 6

- line 178 · `recorded` (“recorded”): Their concern is recorded.
- line 185 · `recorded` (“recorded”): the recorded refuge or route work
- line 422 · `recorded` (“recorded”): and the work recorded in your completed “{…}” formation
- line 425 · `recorded` (“recorded”): {…}, {…}, gave their account with limits: their words can be recorded, but not used as consent for what others did.
- line 442 · `recorded` (“recorded”): {…}’s words and their limits are recorded.{…}
- line 487 · `recorded` (“recorded”): Linked quest objective recorded

### `dist/js/journal-commitments.js` — 6

- line 23 · `recorded` (“recorded”): The recorded {…} Gold fee is not yet paid.
- line 56 · `recorded` (“recorded”): Paused. Your earlier choices and return date remain recorded.
- line 75 · `recorded` (“recorded”): The recorded next chapter
- line 102 · `recorded` (“recorded”): {…}/4 actual field days recorded. Original mentor: {…}. Agreed supervisor: {…}.
- line 171 · `recorded` (“recorded”): the recorded person
- line 177 · `recorded` (“recorded”): The recorded workplace is not offering public service. Its saved terms remain unchanged.

### `dist/js/rpg-depth-v27.js` — 6

- line 82 · `recorded` (“recorded”): the recorded participant
- line 138 · `recorded` (“recorded”): The recorded fee remains due. No time was spent.
- line 173 · `recorded` (“recorded”): You completed a limited paid agreement and recorded its terms.
- line 185 · `recorded` (“recorded”): You establish a priced service with its limits recorded.
- line 187 · `recorded` (“recorded”): A {…} {…} service is recorded at the crossing.
- line 286 · `recorded` (“recorded”): The rulers disputed the road and its recorded claims.

### `dist/js/action-costs.js` — 5

- line 19 · `settled-separately` (“settled separately”): Household estimate: +{…} Gold accrues over this time; settled separately from the fee.
- line 19 · `accrues` (“accrues”): Household estimate: +{…} Gold accrues over this time; settled separately from the fee.
- line 19 · `estimate` (“estimate:”): Household estimate: +{…} Gold accrues over this time; settled separately from the fee.
- line 27 · `accrues` (“accrued”): {…} Gold has already accrued and is separate from these estimates.
- line 27 · `accrues` (“accrue”): How time & costs work The fee is the action’s direct Gold cost; materials and consumed supplies are separate. Use the action description and review for its specific requirements; an unlisted material is not a promise th…

### `dist/js/adult-child-view.js` — 5

- line 13 · `recorded` (“recorded”): No financial support or earlier parental answer is recorded.
- line 14 · `recorded` (“recorded”): Independent lodgings in {…}, recorded on day {…}.{…}
- line 19 · `recorded` (“recorded”): You leave {…}'s own plan and recorded progress unchanged. No fee or new promise is made.
- line 29 · `recorded` (“recorded”): You celebrate {…}'s recorded beginning in {…}, naming their own learning and effort rather than treating it as your achievement. {…}
- line 41 · `recorded` (“recorded”): {…} shared their actual beginning and independent lodgings with {…}. {…} {…}. The recorded address created no claim of ownership.

### `dist/js/radiant-descent.js` — 5

- line 50 · `recorded` (“recorded”): Work from the recorded ward
- line 65 · `recorded` (“recorded”): One actual day. Previously provisioned depths cost no second ration; their rooms and gains remain recorded.
- line 88 · `recorded` (“recorded”): {…}: the completed work is recorded. Return outside for its stated field payment; deeper exploration is optional.
- line 105 · `recorded` (“recorded”): A recorded route, trained judgment, one day and one ration secured passage. No combat spoils were claimed.
- line 107 · `recorded` (“recorded”): An independent landmark recorded

### `dist/js/career-development.js` — 4

- line 18 · `recorded` (“recorded”): Supported galleries, recorded warnings and the crews who enter them
- line 22 · `recorded` (“recorded”): a recorded civic undertaking
- line 25 · `recorded` (“recorded”): Your recorded promise, “{…}”, is due on day {…}.
- line 33 · `recorded` (“recorded”): {…}, guild rank {…}, mastery {…}: {…}. Your {…} recorded work days most recently included {…}.{…}{…}{…}{…}{…}

### `dist/js/ending-losses.js` — 4

- line 3 · `recorded` (“recorded”): The earlier loss has no recorded cause.
- line 5 · `recorded` (“recorded”): , and {…} other recorded places
- line 40 · `recorded` (“recorded”): This decision added no recorded destruction or evacuation.
- line 40 · `is-unchanged` (“is unchanged.”): Attribution follows the surviving dated accounts; the saved ending text is unchanged.

### `dist/js/expansion-ui.js` — 4

- line 21 · `recorded` (“recorded”): Earlier symptom-care days were not separately recorded.
- line 21 · `recorded` (“recorded”): {…} symptom-care days separately recorded.
- line 78 · `recorded` (“recorded”): Their agreement has been heard and recorded.
- line 87 · `recorded` (“recorded”): {…} {…} {…} {…} recorded evidence · {…}

### `dist/js/legacy-mentor-trials.js` — 4

- line 18 · `recorded` (“recorded”): The mentor’s recorded place is not offering this public service.
- line 57 · `recorded` (“recorded”): {…}/4 field days are recorded for your {…} trial. Only the actual remaining days may be continued, under an available named supervisor. No initiation reward has been granted.
- line 67 · `recorded` (“recorded”): Continue the recorded field trial
- line 74 · `recorded` (“recorded”): The {…} trial with {…} remains unfinished, with {…}/4 field days recorded. No completed combat result, earned calling or prior choice is removed, and no new penalty, fee or reward is added.

### `dist/js/local-intrigue.js` — 4

- line 39 · `recorded` (“recorded”): the recorded settlement
- line 59 · `saved-trailer` (“saved.”): The same clue remains saved.
- line 69 · `saved-trailer` (“saved.”): Your evidence and the offer remain saved.
- line 79 · `recorded` (“recorded”): Return to the recorded settlement for this approach.

### `dist/js/lore.js` — 4

- line 24 · `recorded` (“recorded”): A commission’s first test is open to every worker who helped make it. Failed work is recorded beside the repair rather than hidden under a polished dedication.
- line 54 · `recorded` (“recorded”): well keepers negotiated public access and recorded every household’s labor on the cistern walls
- line 185 · `recorded` (“recorded”): A furnace ledger records fuel shares, apprentices’ lessons, and repair commissions taken when military buyers demanded exclusive contracts. Makers kept the furnace open by selling useful tools and sharing expensive heat…
- line 260 · `recorded` (“recorded”): Your {…} birth omen led into the recorded account of {…}. Its resolution has become part of this region’s history.

### `dist/js/people-context.js` — 4

- line 10 · `recorded` (“recorded”): pay the recorded compensation and give the worker their own settlement copy
- line 40 · `recorded` (“recorded”): The remedy is recorded. Give them until day {…}, then ask about their boundary in an ordinary conversation.
- line 40 · `recorded` (“recorded”): The remedy is recorded. Ask about their boundary in an ordinary conversation before proposing a new pledge or active travel.
- line 63 · `recorded` (“recorded”): The part where my answer stopped being a choice. I want the remedy recorded before another promise.

### `dist/js/personal-services.js` — 4

- line 4 · `recorded` (“recorded”): Use the recorded shelter door
- line 30 · `recorded` (“recorded”): This settlement is closed; its recorded service is not operating.
- line 30 · `recorded` (“recorded”): Requires the recorded fee.
- line 38 · `recorded` (“RECORDED”): RECORDED LOCAL SERVICES Recorded doors & lessons These local services keep their own terms and return dates. {…}

### `dist/js/story-continuity.js` — 4

- line 95 · `recorded` (“recorded”): You pay the recorded arrears and preserve the colleague’s credited work. The archive records the wage grievance and its settlement.
- line 111 · `recorded` (“recorded”): You pay for a separately held copy. Each practice keeps its own prices and names; the original archive’s restrictions remain recorded.
- line 118 · `recorded` (“recorded”): You release the private route and fund the agreed week. The household chooses what may be recorded afterward.
- line 123 · `recorded` (“recorded”): The winter agreement has reached its recorded end.

### `dist/js/yard-tournament.js` — 4

- line 16 · `recorded` (“recorded”): End this practice commitment so you can attend to other needs. Keep the time and exchanges already recorded.
- line 20 · `recorded` (“recorded”): Keep the time already spent and your recorded exchanges. No reward or penalty to health.
- line 45 · `saved-trailer` (“saved.”): Commit 1 actual day. Borrowed equipment; no fee. Your score and decisions are saved.
- line 55 · `not-a-promise-of` (“not a promise of”): {…} {…}–{…} against {…}, after {…} exchanges. {…} kept the result, not a promise of knighthood. No coin, class or combat bonus was awarded.

### `dist/js/classes.js` — 3

- line 85 · `recorded` (“recorded”): {…} cannot currently take part; their earlier teaching remains recorded.
- line 159 · `recorded` (“recorded”): You returned after the deadline; its earlier missed promise remains recorded.
- line 179 · `recorded` (“recorded”): Keep the same combat gifts and pledge six further days within 60 days: {…} Completing the actual work builds mentor trust; the promise is recorded if missed.

### `dist/js/companion-combat-profile.js` — 3

- line 18 · `recorded` (“recorded”): Remembered, not available for battle. These are recorded combat values, not restored resources.
- line 20 · `recorded` (“recorded”): Attending their own work; no return day is recorded.
- line 22 · `recorded` (“recorded”): Health not recorded

### `dist/js/dialogue-ui-v22.js` — 3

- line 83 · `recorded` (“recorded”): Read earlier recorded words
- line 92 · `recorded` (“recorded”): Their recorded place is elsewhere. Go there to speak with them.
- line 92 · `recorded` (“recorded”): Find their recorded place

### `dist/js/encounter-design-v27.js` — 3

- line 2471 · `prediction` (“prediction”): The oracle predicts the next party attacker and raises a retaliatory ward against that one hand. A different attacker or a support turn invalidates the prediction.
- line 4374 · `category` (“category”): The asset uses sacred; the existing combat engine uses radiance. Normalize sacred to radiance at integration. physical is a new explicit category; it must not mean every old basic attack gets an unexplained bonus.
- line 4381 · `metadata` (“metadata”): requiredTags is proposed suitability metadata derived from actual terrain/site/services and remembered scene facts. It must not fabricate a coast, harbor, mine, shrine faith or living witness to satisfy a template. Miss…

### `dist/js/life-ui.js` — 3

- line 83 · `recorded` (“recorded”): {…} stories completed · {…} left behind. Their recorded consequences remain in the chronicle and world.
- line 91 · `recorded` (“recorded”): Not separately recorded
- line 91 · `recorded` (“recorded”): Plan attendance {…}/{…} days Symptom-care days recorded {…} Consultation {…} {…}

### `dist/js/maze-signature.js` — 3

- line 97 · `recorded` (“recorded”): The explored map is the earlier expedition’s recorded route knowledge, not your own memories. Personal household permission must be renewed with the living people here.
- line 104 · `recorded` (“recorded”): The recorded work cannot finish under the present conditions. Attendance and paid fees remain spent; no result was granted.
- line 121 · `recorded` (“recorded”): You establish a priced service with its limits recorded.

### `dist/js/npc-continuity.js` — 3

- line 40 · `recorded` (“unrecorded”): Retired from this public role; later whereabouts are unrecorded.
- line 159 · `recorded` (“recorded”): This handover cites the already-recorded death; it does not invent another life event.
- line 159 · `recorded` (“recorded”): The earlier favour for this person has a one-time return window through world day {…}, subject to their actual availability. After that, you can withdraw without losing supplies, Gold or trust; no failure is recorded.

### `dist/js/people-dialogue.js` — 3

- line 7 · `recorded` (“recorded”): Their own recorded account: {…}
- line 8 · `recorded` (“recorded”): “The remedy is recorded. I need two real days before we discuss a new agreement.”
- line 14 · `recorded` (“recorded”): I want the recorded remedy before another pledge or journey. We can still speak.

### `dist/js/personal-notes-ui.js` — 3

- line 6 · `recorded` (“recorded”): · Ownership not recorded
- line 6 · `recorded` (“recorded”): No earlier family notes have been recorded.
- line 6 · `recorded` (“recorded”): Personal Notes Only your own reminders can be changed. Earned events and discoveries stay as recorded. Archived notes can be restored; nothing is deleted. {…}{…}{…} {…}{…} {…} / {…} notes kept by this life, including it…

### `dist/js/quest-journal.js` — 3

- line 14 · `category` (“categories”): {…} Quest categories
- line 20 · `recorded` (“recorded”): No completed chapter decision was recorded.
- line 49 · `recorded` (“recorded”): Closing date was not recorded in this older save

### `dist/js/quest-records.js` — 3

- line 15 · `recorded` (“recorded”): No chapter decision recorded yet.
- line 26 · `recorded` (“recorded”): No choice recorded yet
- line 34 · `recorded` (“recorded”): An accepted finite research question; sources and open questions remain recorded

### `dist/js/regional-world-v33.js` — 3

- line 150 · `recorded` (“recorded”): The accepted work is recorded in your Journal.
- line 155 · `recorded` (“recorded”): We heard the border proposal together and recorded its terms.
- line 161 · `recorded` (“recorded”): Your progress is recorded. Read the next step in your Journal.

### `dist/js/relationship-repairs.js` — 3

- line 12 · `recorded` (“recorded”): the recorded place
- line 18 · `recorded` (“recorded”): Return to the place recorded for this remedy.
- line 28 · `recorded` (“recorded”): A remedy recorded with {…}

### `dist/js/repertoire-gameplay.js` — 3

- line 33 · `recorded` (“recorded”): Make a private manuscript from four original fictional lines. Source and your composer credit are recorded. No time, money, skill or finished performance is granted.
- line 37 · `accrues` (“accrue”): One attended day prepares this exact revision and arrangement. No wages, career days or skill gain. Ordinary living costs still accrue.
- line 64 · `recorded` (“recorded”): All three fixed stops are now recorded. No extra completion payment or skill is awarded.

### `dist/js/rpg-ui.js` — 3

- line 34 · `recorded` (“recorded”): Continue the saved expedition using its recorded rooms and provisions.
- line 43 · `recorded` (“recorded”): {…} {…} Prosperity {…}/100 Security {…}/100 {…} {…} {…} gold restitution and {…} days of custody per recorded evidence. Public magic is {…}. {…} {…} {…}
- line 46 · `recorded` (“Recorded”): {…} / {…} · {…} · Recorded cause: {…}{…}

### `dist/js/silver-property.js` — 3

- line 43 · `recorded` (“recorded”): Return to the silver’s recorded settlement.
- line 45 · `recorded` (“recorded”): The recorded market is closed or occupied. The target has not been replaced.
- line 46 · `recorded` (“recorded”): The recorded jurisdiction has changed. Withdraw rather than substituting another target.

### `dist/js/story-presence-v26.js` — 3

- line 17 · `recorded` (“recorded”): A transport receipt survives in Kest’s recorded papers. The ferry’s copied statement describes shelter given to the missing sibling after they refused a second load of human remains. It records fear for the people who h…
- line 18 · `recorded` (“recorded”): Protect the recorded names. The papers do not establish a living witness’s whereabouts or agreement.
- line 18 · `recorded` (“recorded”): Make the documentary evidence public despite its recorded fears. This secures no witness’s cooperation.

### `dist/js/workshop.js` — 3

- line 121 · `recorded` (“recorded”): The actual funded commons supports recovery only during its recorded operating periods.
- line 189 · `recorded` (“recorded”): The bag has no space for another individually recorded piece; the committed work was not refunded.
- line 405 · `recorded` (“recorded”): The recorded site

### `dist/js/world-people-v31.js` — 3

- line 19 · `recorded` (“recorded”): Their earlier public life is recorded; later whereabouts are unrecorded.
- line 49 · `recorded` (“recorded”): Close this accepted favour without taking supplies, Gold or trust. Its earlier agreement remains recorded.
- line 79 · `recorded` (“recorded”): . The original agreement remains recorded; no supplies, Gold or trust changed hands.

### `dist/js/adult-tournament-ui.js` — 2

- line 13 · `recorded` (“recorded”): The recorded loss remains. The {…} Gold three-win purse is no longer available; you may continue for the practice or stop.
- line 14 · `recorded` (“recorded”): No bout result has been recorded.

### `dist/js/battle-ui.js` — 2

- line 35 · `not-a-promise-of` (“not a promise of”): Enemy recipients are current predictions, not a promise of damage or a full-round forecast. Guarding, Health, Focus, marks and intervening actions can change them before an enemy acts.
- line 35 · `prediction` (“current predictions”): Enemy recipients are current predictions, not a promise of damage or a full-round forecast. Guarding, Health, Focus, marks and intervening actions can change them before an enemy acts.

### `dist/js/birth.js` — 2

- line 95 · `recorded` (“recorded”): learn how a journey is recorded
- line 465 · `recorded` (“recorded”): Gain arcana and scholarship. Your family’s covenant history is recorded; decide what you want to learn next.

### `dist/js/companion-combat-ui.js` — 2

- line 9 · `recorded` (“recorded”): Missing legacy reserves use battle defaults for this readout only. Viewing changes no recorded resources.
- line 9 · `recorded` (“recorded”): None learned yet. Their own recorded chapter choices can earn techniques; viewing this profile grants none.

### `dist/js/companion-dialogue-v27.js` — 2

- line 14 · `recorded` (“recorded”): You prepare a small paid lodging agreement. Its prices and private rooms are recorded, and the courier work pays for linen.
- line 57 · `recorded` (“recorded”): You establish an adult courier rota with a right to refuse danger. The recorded route supports ordinary households.

### `dist/js/counting-table-case.js` — 2

- line 194 · `recorded` (“recorded”): The exact target or bag changed. No silver was awarded; withdraw or resolve the recorded blocker.
- line 205 · `recorded` (“recorded”): You withdrew from the {…} plan for {…}. Your attended days remain recorded; you took no silver and earned no Gold.

### `dist/js/cultural-name-catalog-v31.js` — 2

- line 104 · `recorded` (“recorded”): Dwarven names are short enough to call across a busy hall. A family may give its clan directly or name the hall recorded in its oldest surviving household account.
- line 242 · `recorded` (“recorded”): Sabledock names use rounded vowels and a final sound that carries clearly across a crowded quay. Inherited families are recorded without translating them into a trade or a joke.

### `dist/js/daylife-v35.js` — 2

- line 72 · `recorded` (“recorded”): They are no longer here. No crime, roll or reward was recorded.
- line 73 · `recorded` (“recorded”): This person could not be recorded. No attempt was made.

### `dist/js/depth-ui-v27.js` — 2

- line 20 · `recorded` (“recorded”): Return to a surviving source location to use a recorded service.
- line 20 · `recorded` (“recorded”): The doors your stories opened {…} recorded {…}

### `dist/js/gear-organizer.js` — 2

- line 34 · `saved-trailer` (“saved.”): That loadout is no longer saved.
- line 67 · `saved-trailer` (“saved.”): That loadout is no longer saved.

### `dist/js/inventory-ui.js` — 2

- line 24 · `recorded` (“recorded”): Acquired on day {…}. Its source and owner remain recorded.
- line 38 · `category` (“Categories”): Search Inventory Search Sort {…} Slot {…} {…}{…} Search Inventory Inventory Categories

### `dist/js/journal-history.js` — 2

- line 7 · `recorded` (“recorded”): The detailed outcome was not recorded.
- line 18 · `recorded` (“recorded”): Closing date was not recorded in this older save

### `dist/js/maze-receipt-runtime.js` — 2

- line 71 · `recorded` (“recorded”): Earlier entry costs and gains were not recorded.
- line 71 · `recorded` (“recorded”): {…}: {…}. {…} rooms explored; {…} cleared. {…} attended days recorded.{…}

### `dist/js/maze-ui-v31.js` — 2

- line 27 · `recorded` (“recorded”): Inspect mode: select recorded rooms without moving. Switch to Walk to use doorways.
- line 27 · `recorded` (“recorded”): BENEATH {…} {…} Health {…}/{…} · Focus {…}/{…} {…} {…} {…} {…} {…}/{…} rooms recorded · ↟ Entrance · △ Shelter · ◇ Cache · ✦ Objective {…} {…} {…} {…} {…}{…}{…}{…}{…}{…} Dungeon Maze

### `dist/js/narrative-edition.js` — 2

- line 38 · `recorded` (“recorded”): the recorded settlement
- line 68 · `recorded` (“recorded”): A recorded childhood moment

### `dist/js/new-life.js` — 2

- line 160 · `recorded` (“recorded”): {…}. {…} Fate has drawn {…} earlier years. Your childhood, learning, work, and remembered losses are recorded in the Journal. From this birthday, the choices are yours.
- line 165 · `recorded` (“recorded”): The chosen character could not be recorded.

### `dist/js/research-scenes.js` — 2

- line 6 · `accrues` (“accrue”): {…} attended day; ordinary household costs accrue separately.
- line 34 · `recorded` (“recorded”): {…} {…} Questions left open: {…} Public historical contributors retain their source credit. The craftsperson’s private admission is excluded unless you explicitly choose a permitted quotation. {…}, the recorded local ar…

### `dist/js/save-health-ui.js` — 2

- line 5 · `recorded` (“recorded”): Last saved: time not recorded in this older save.
- line 11 · `browser-save-status` (“Browser save status”): {…} {…} {…} {…} Browser save status for slot {…}

### `dist/js/society.js` — 2

- line 247 · `recorded` (“recorded”): Keep the recorded partial days. Reserved funding and materials remain spent; there is no wage, refund or finished enterprise.
- line 258 · `recorded` (“recorded”): {…} heard why you released {…} remaining days. The reserved supplies stay consumed and no finished work is recorded.

### `dist/js/story-allegations.js` — 2

- line 46 · `recorded` (“recorded”): Another separately recorded local report remains.
- line 61 · `recorded` (“recorded”): You paid the 12-gold filing fee and withdrew the altered claim. {…}’s earlier agreement and your correction stay together; only this report’s 1 evidence was answered. Other local reports and the earlier choice remain re…

### `dist/js/supernatural-ui.js` — 2

- line 6 · `recorded` (“recorded”): Your recorded decision remains part of this life.
- line 6 · `recorded` (“unrecorded”): Weeks lived on eligible routes Since {…}: {…} eligible days, {…} weekly discovery checks. Earlier unrecorded exposure is not inferred.

### `dist/js/upbringing.js` — 2

- line 39 · `recorded` (“recorded”): You also need two {…}; {…} were recorded.
- line 39 · `recorded` (“recorded”): {…} actual focus days were recorded; 180 are needed.{…}

### `dist/js/winter-levy-aftermath.js` — 2

- line 93 · `prediction` (“prediction”): The relief room remains open under the agreement. The clerk pauses at its doorway. “It is quiet just now. I am enjoying that without turning it into a prediction about tomorrow.”
- line 102 · `recorded` (“recorded”): Their exact part in the earlier levy account remains recorded.

### `dist/js/activities-v31.js` — 1

- line 90 · `recorded` (“recorded”): Stall & Household Property These longer attempts use stealth and agility against the merchant’s existing guards, not the pickpocket d20 above. A stolen weapon remains real equipment with its original owner recorded. {…}

### `dist/js/adventuring.js` — 1

- line 98 · `recorded` (“recorded”): The field work pauses for a calendar need. Your attended days remain recorded.

### `dist/js/annual-world-memory.js` — 1

- line 9 · `recorded` (“recorded”): completed a paid repair and recorded the helpers

### `dist/js/budget.js` — 1

- line 247 · `recorded` (“recorded”): {…}; {…}. Past costs and paid work remain recorded. Future living costs are {…} gold per adult year.

### `dist/js/career-entry.js` — 1

- line 30 · `recorded` (“recorded”): This civilian profession is not recorded.

### `dist/js/cartography.js` — 1

- line 173 · `recorded` (“recorded”): You recorded the travelers’ accounts without mistaking them for your own visits.

### `dist/js/combat-status-ui.js` — 1

- line 15 · `prediction` (“Current prediction”): Current prediction: {…}

### `dist/js/combat-statuses.js` — 1

- line 44 · `recorded` (“Recorded”): Recorded combat effect.

### `dist/js/combat.js` — 1

- line 495 · `recorded` (“recorded”): Spend 5 MP on a piercing sacred strike. A recorded radiance weakness strengthens the hit.

### `dist/js/economy-planning.js` — 1

- line 46 · `accrues` (“accrued”): Savings, trade & a wanted goal {…}Ordinary Age up and dedicated work are alternative schedules. Forecasts use current wages, household priorities and upkeep; birthdays and choices can change them. Ordinary year, net {…}…

### `dist/js/education-progress.js` — 1

- line 31 · `recorded` (“recorded”): {…} recorded before the course ledger opened (route attribution unrecorded)

### `dist/js/enemy-plans-v27.js` — 1

- line 21 · `prediction` (“prediction”): Names a party actor as the next target. Inspection breaks the prediction.

### `dist/js/faith-stories-v26.js` — 1

- line 34 · `recorded` (“recorded”): the recorded crossing and its local accounts

### `dist/js/family-origin-ui.js` — 1

- line 11 · `recorded` (“recorded”): {…} · {…} Began at age {…} · day {…}. The family’s recorded availability was not changed by this search. {…} Evidence acquired: {…}. Acquisition of a statement does not make its uncertain claims true.

### `dist/js/field-treatment-ui.js` — 1

- line 4 · `recorded` (“recorded”): Health not recorded

### `dist/js/field-treatment.js` — 1

- line 48 · `recorded` (“recorded”): This person’s Health is not recorded for treatment.

### `dist/js/grounded-narrative-content.js` — 1

- line 40 · `choose-this-action` (“Choose this action”): Choose this action.

### `dist/js/home-ownership.js` — 1

- line 29 · `recorded` (“recorded”): Address not recorded

### `dist/js/home-ui.js` — 1

- line 14 · `recorded` (“recorded”): Your earlier home has no recorded address.

### `dist/js/hospitality-v36.js` — 1

- line 40 · `recorded` (“recorded”): Ask about nearby work and roads. Named leads are recorded in Journal Notes and marked on your map.

### `dist/js/household-residence.js` — 1

- line 22 · `recorded` (“recorded”): Their recorded home is unavailable. Their family record is preserved.

### `dist/js/immersive-story-content-v18.js` — 1

- line 321 · `recorded` (“recorded”): A track tells where a foot has pressed the ground. Old road tales ask it for motives, virtues and destiny; the earth has recorded none of those things.

### `dist/js/journal-pagination.js` — 1

- line 10 · `range-of-total` (“{…}–{…} of {…}”): {…}–{…} of {…}

### `dist/js/justice.js` — 1

- line 88 · `recorded` (“recorded”): away. It can be equipped from Inventory, and its original owner remains recorded. A fence may buy it; an honest sale can expose its origin.

### `dist/js/maze-authored.js` — 1

- line 89 · `recorded` (“recorded”): The recorded work cannot finish under the present conditions. Attendance remains spent; no result was granted.

### `dist/js/maze-inscription-note.js` — 1

- line 8 · `recorded` (“recorded”): A mason recorded the names of workers who never returned to the surface.

### `dist/js/maze-v31.js` — 1

- line 167 · `recorded` (“recorded”): You climb to the surface with what you earned. Unfinished rooms and claimed caches remain recorded.

### `dist/js/notifications-ui-v40.js` — 1

- line 10 · `recorded` (“Recorded”): Find Their Recorded Place

### `dist/js/origins.js` — 1

- line 45 · `recorded` (“recorded”): Your elven household tends a coastal observatory threatened by the rising sea. Your birth is recorded on the last dry lower floor before the instruments move uphill. Tide charts, salvaged lenses and the work of rebuildi…

### `dist/js/personal-notes.js` — 1

- line 88 · `is-unchanged` (“is unchanged.”): Your note was updated. Its original date is unchanged.

### `dist/js/personality-ui.js` — 1

- line 8 · `compatible` (“compatible”): Choose up to three compatible traits. Conflicting traits cannot be paired.

### `dist/js/personality.js` — 1

- line 73 · `recorded` (“recorded”): This life’s nature belongs to its recorded history.

### `dist/js/quest-policy.js` — 1

- line 64 · `recorded` (“recorded”): Undertaking paused. Its people, proof and return date remain recorded.

### `dist/js/radiant-ui.js` — 1

- line 12 · `recorded` (“RECORDED”): A RECORDED DESCENT Floor {…} · the routes you can see {…} rations {…} {…} Lead: floor {…}. {…} {…} {…} Click, Enter or Space to inspect. Choose Confirm to move, or double click an available neighboring doorway. Unseen r…

### `dist/js/regional-content-v33.js` — 1

- line 5 · `recorded` (“recorded”): Craft, mutual shelter and obligations recorded in stone

### `dist/js/repertoire-ui.js` — 1

- line 14 · `recorded` (“recorded”): All three recitals recorded.

### `dist/js/research-ui.js` — 1

- line 16 · `recorded` (“recorded”): Comparison and once-only practice recorded

### `dist/js/road-memory.js` — 1

- line 20 · `recorded` (“recorded”): Completed the recorded road response

### `dist/js/settlement-spaces.js` — 1

- line 23 · `recorded` (“recorded”): {…} keeps this place operating. Its recorded services remain funded through day {…}; support follows the actual charter.

### `dist/js/stolen-gear.js` — 1

- line 8 · `recorded` (“recorded”): Your gear bag has reached its 120 individually recorded pieces. Sell equipment before taking another.

### `dist/js/supernatural-discovery.js` — 1

- line 86 · `recorded` (“recorded”): An earlier meeting was recorded, but its person and precise return point were not saved. The earlier invitation routes retain their original requirements.

### `dist/js/travel.js` — 1

- line 118 · `recorded` (“recorded”): Gain 1 scholarship the first time this road’s inscription is recorded. Add a lasting journal entry.

### `dist/js/world-prose-v30.js` — 1

- line 33 · `recorded` (“recorded”): Their adult beginning included {…} recorded unpaid {…} training days.

### `dist/js/world-services.js` — 1

- line 103 · `recorded` (“recorded”): Their earlier public life is recorded; later whereabouts are unrecorded.

### `dist/js/yard-conversation.js` — 1

- line 45 · `recorded` (“recorded”): Talk through the recorded exchanges

## Skipped

- `dist/js/aged-portraits-v57.js` — art catalogue, 3071 KB
- `dist/js/foe-catalog.js` — generated module; no authored text
- `dist/js/grounded-portraits-v39.js` — art catalogue, 827 KB
- `dist/js/lifecycle-portraits-v40.js` — art catalogue, 810 KB
- `dist/js/linked-curse-art-v27.js` — art catalogue, 227 KB
- `dist/js/linked-portraits-v27.js` — art catalogue, 499 KB
- `dist/js/mature-portraits-v40.js` — art catalogue, 178 KB
- `dist/js/portrait-catalog.js` — art catalogue, 478 KB
- `dist/js/portrait-identity-v20.js` — art catalogue, 348 KB

## Known false positives

The lint reads source, not the screen. Hits that are not the ledger speaking, seen in this release:

- A person doing the recording, in the ordinary sense: “The jailer recorded your request for a moon chamber.” (`recorded`).
- `compatible` in plain English: “Choose up to three compatible traits.”, “keep healing work compatible with time for family”.
- `prediction` inside an authored story: the astrologer’s predictions in `personal-stories-v27.js`, the oracle in the encounter designs.
- Design notes shipped inside a content module (`encounter-design-v27.js`’s notes: “requiredTags is proposed suitability metadata…”). The player never sees them, but they travel with the game.
- Strings the UI never shows but that read as prose: validation errors, console messages, blocked-action reasons. They are counted among the player-facing strings and are hits only when they say a forbidden phrase.

Two limits of reading source. Text built from parts is seen in its parts: the pager’s “Offers: 1–4 of 4 saved” is `'Offers'`, `{…}–{…} of {…}` and `' saved'` in `journal-pagination.js`, so `offers-count` and `saved-trailer` see none of it and `range-of-total` sees the middle; a check that feeds the rendered screen to `lintText` would see it whole. And a string of three words or more is taken as prose, so a two-word label (“Recipe category”) is not read at all.

The rules stay precise rather than broad. A hit that is in the game’s voice is a reason to narrow the rule, not to rewrite the line.
