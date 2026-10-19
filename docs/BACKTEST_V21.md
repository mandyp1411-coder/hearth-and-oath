# Hearth & Oath 0.21.0 — implementation and backtest

The two prior audits informed this release. It retains the text life RPG, accepted
complete portraits, ancestry/heritage and age rules, cultural names, free roleplay,
existing saves, and the current hosting audience.

## Shipped changes

- Persistent six-neighbor hex exploration with unknown, rumored, charted and
  visited knowledge; terrain travel and calendar interruptions; public city rooms
  sharing services; five authored dungeon graphs with hidden unvisited names.
- Age-appropriate young contacts, committed dialogue trait consequences, coercion
  and oath consistency, dated history, named aging keepers, relevant news, and
  eighteen faith requests with real field work and later civic effects.
- Diminishing conversion of lifetime training in new battles, preserved bloodless
  physiology, companion practice, species signatures, persistent inspected
  weaknesses, devotion scaling, party readiness, and controlled living capture.
  Civilian contract alternatives and property ownership also gain consequences.
- Reviewed save imports and recoverable predecessors, grouped menus, display
  settings, chronicle search, retained spatial context and target focus.
- Ten contextual synthesized music cues, longer phrase variation, shared limiting,
  committed result/error cues, and closed-AudioContext recovery.

## Final evidence

- 100 / 100 distinct seeded lives completed after fixes,
  with 0 failures, 100 distinct finished-life hashes and
  100 distinct decision-trace hashes under ten scripted play styles.
- 122,080 public commands and input-immutability checks;
  44,737 exact save/reload round trips;
  1,127,231 portrait consistency checks across recorded attempts,
  including the retained failed life-86 prefix.
- 4,348 battles: 590 retreat; 3,547 victory; 211 defeat.
- 19 heir continuations checked. Lives ended in
  100 retirements and 0 deaths.
- All 716 regression tests passed on the final candidate. Post-build offline checks passed; the complete
  HTML parses and exactly matches its four downloadable parts. The offline
  manifest now derives its version from package.json.
- All 67 runtime files retained their frozen SHA-256 hashes during each recorded
  run. The first frozen cohort passed 99 lives and exposed one grievance deadlock.
  Life 86 was replayed in full after that narrow fix; the other 99 lives were not
  repeated after it. Both source hash sets and the complete final suite are retained.

## Found and fixed

1. Seed hearth-backtest-v21-c10-life-02: a zero-day city-room move collected
   deferred upkeep from earlier care. Room movement leaves that ledger untouched;
   subsequent timed work still settles actual costs. Whole-life replay passed.
2. Seed hearth-backtest-v21-c09-life-02: hungry vampires could not feed while a
   hex crossing was paused. Feeding is now offered and continuation explains the
   unmet need. The exact save is a regression fixture. Whole-life replay passed.
3. Seed hearth-backtest-v21-c09-life-06, age 65: a personality grievance opened
   with hunger 75 and every reply needed a day. New grievances explain the hunger
   barrier; existing scenes gain a zero-day exit on loading. Leaving grants no
   bond, skills or trait relief, and allows feeding and a later real answer.
   The exact save is a regression fixture. Whole-life replay passed.

Interrupted candidates, pilots and diagnostic replays are excluded from final
counts and retained in the separate evidence. Two later policy failures repeated
timed care while urgent hunger correctly blocked time. The offered zero-day
Continue response was valid. The policy was corrected and the entire ten-life
c09 group replayed against the same frozen game source; the old group is retained.
No stats, clock, rewards or saves were patched by the driver.

## Remaining work and limits

The audit disposition records implemented and partial findings separately.
Private city interiors, procedural dungeon graphs, broader cultural scenes,
episodic NPC chronology, deeper companion/foe tactics, veteran balance and a
larger authored soundtrack remain areas for development. Ordinary paid road
travel can request attributed directions; city-room walking is free; authored
dungeon doors retain their existing expedition day.

These are automated public-engine journeys and instrumented handler/audio tests,
not human critic reviews. No supported browser-control skill was available, so
rendered layouts, touch, assistive technology, browser storage limits and actual
device audio were not verified. Earlier captured battle actors remain intact;
new battles use the revised training conversion. Existing atlases migrate into
attributed chart knowledge without inventing personal visits.

Source base: 75a0d50261d6ce31b2242a11fa46bb139a20c103.
The implementation brief is in IMPLEMENTATION_BRIEF_V21.md. The separate PDF and
evidence archive contain the full methodology, exclusions, audit matrix and
prior audits. This is finite heuristic coverage, not an exhaustive guarantee.
