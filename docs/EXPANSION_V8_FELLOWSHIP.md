# Fellowship and formation, v0.8

The v0.7 audit found that a calling was earned through genuine preparation but its initiation was still a single scene, while the three companions' goals did not keep developing through ordinary life. This expansion gives those identities optional work, disagreements and remembered outcomes after their first qualification.

## Calling formation

Every earned calling offers a separate formation with the character's actual mentor at that mentor's surviving location. The original qualification, combat gifts, old pending initiation and livelihood continue unchanged. Formation is optional and can be withdrawn from without revoking a learned class.

The structure is three distinct commitments: six actual days investigating a problem, eight actual days carrying out the chosen practice, and two actual days reviewing the result. Birthdays, hunger, full moons and known deadlines can interrupt these days. Continuation preserves the completed work; an interruption never awards completion. A service agreement records a 90-day promise. An independent agreement allows the same discipline at the player's pace. Missed deadlines remain visible even when work is eventually completed.

| Calling | Actual disagreement | Divergent practices | Earned technique |
| --- | --- | --- | --- |
| Guardian | An orderly shelter queue excludes injured residents | Accessible escape routes / named watch accountability | The open-door formation |
| Berserker | One celebrated rescuer is working through injuries | Shared stop signals / a trained rescue rotation | The returning breath |
| Knight | A sealed convoy order privileges wealth | A witnessed challenge / a negotiated shared escort | The witnessed challenge |
| Paladin | Sanctuary is conditioned on compulsory confession | Sanctuary without disclosure / an institutional consent reform | The unclaimed sanctuary |
| Healer | A patient refuses a remedy after earlier imposed care | A patient-chosen alternative / a clinic accountability review | The patient's ward |
| Elementalist | An academy ward discharges into occupied workers' homes | A safer shared grounding route / a corrected public inspection | The named grounding |
| Druid | Protecting a nesting bank blocks a displaced household's access | A new crossing / an explicit seasonal maintenance bargain | The two-way bargain |
| Necromancer | An ancestor's limited testimony is being treated as ownership | An agreed question and release / proof from the living instead | The released testimony |
| Thief | Recovering withheld wages could scapegoat a powerless clerk | A witnessed return / evidence controlled by the workers | The unburdened opening |
| Ranger | A supposedly safe road is inaccessible to actual households | An honestly marked accessible route / credited local guides | The return trail |
| Assassin | A paid dossier conceals the patron's interest in a killing | Refusal and a warning / evidence entrusted to a chosen advocate | The withheld blade |
| Bard | A triumphant public memorial would expose private grief | Keeping the private verse private / shared authorship and credit | The unborrowed verse |

Final recognition is public with permitted sources or a private signed account. Completion gives one remembered technique, 5 standing with the chosen constituency and bounded mentor trust. It grants no extra attributes, skills, money or duplicated class ability. Each calling can be completed once. Active companions can witness the formation and remember the work; their actual goals and earlier expedition decisions appear in the discussion.

A completed technique can supply an earned account in a matching dungeon negotiation. It does not automatically clear a guardian: the expedition still requires listening, actual practical aid and trained judgment or a trusted living companion. The dungeon's separate aid-only option makes this a real alternative for a player who protects a refuge without copying its inhabitants' private testimony. Only the active calling's relevant formation counts, so learned disciplines do not accumulate simultaneous combat bonuses.

## Companions have requests and limits

The three requests are not loyalty purchases. Each takes six real days of shared work and two days carrying out a negotiated answer. A 60-day promise is optional; an honest refusal records a boundary without an invented betrayal or departure.

- The actual protector asks whether an order's storehouse deserves their whole working life while residents have no refuge. The outcome is resident-led protection or an accountable institutional rota.
- The actual healer asks for a clinic that does not depend on their exhaustion. The outcome protects a shared rota or trains willing relief staff with credit and patient consent.
- The actual scout asks about their named sibling's route record. Three seeded accounts differ in what is known. The outcome offers one private letter or preserves uncertainty without forcing a reunion, publishing an address or inventing a death.

Earlier memories, campaign outcomes and privately disclosed conditions influence the request. A condition is mentioned only if the companion really knows it. Helping locally does not erase the protector's existing refusal to travel after unwilling soul binding. The final agreed boundary is preserved in the companion's memory and can support later dungeon negotiations.

## Save and continuation contract

`fellowship` is an optional revision-5 sidecar with version 1, formations, companion requests, at most one project, a pending scene, remembered facts and a bounded inherited archive. Import initializes the sidecar prospectively; it changes no original event or progression effects. Exported views are pure.

Projects own their bounded `ctx.spendDays` calls. Their action descriptors have zero engine-charged `days` and `cost`, and expose `durationDays`, `quotedCost` and a plain explanation of real time. All completion rewards require the full actual task. Other annual time does not count as quest labor. Dead companions and terminal lives cannot finish work. Explicit formation withdrawal keeps partial progress; resuming charges only the remaining days and requires a new clear agreement.

`inheritFellowship(previous, next)` creates fresh personal quests and copies completed-parent stories into an archive of at most 48 entries. Children receive no inherited calling, personal technique, relationship completion credit or unfinished promise from this module.

## Evidence

`tests/fellowship.test.js` exercises 24 divergent calling practices, six companion outcomes, partial work and zero-day continuations, actual death, withdrawal/resumption, private knowledge, dead companions, legacy pending initiation, inheritance and malformed histories. The existing 12 calling tests remain unchanged and pass.

`scripts/playtest-fellowship-v8.mjs` plays twelve distinct lives from age zero to actual retirement through public game operations. Every skill, gold piece, lesson, trip and qualification is earned using offered actions. Every transition checks input immutability, JSON save validity and nonnegative savings. The summaries are in `docs/playtest/fellowship-v8.json`; full action and narrative transcripts are in `artifacts/playtest/v8-fellowship/` for the root audit archive.

These are twelve authored formation problems and three companion goals with seeded context, not a claim of unlimited quests or autonomous generation of new plot structures. Future expansions can add different intermediate assignments and ongoing companion livelihoods without changing the original initiation contract.
