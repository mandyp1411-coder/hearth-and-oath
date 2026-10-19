# v0.9: The people around a life

The social layer adds relationships **between existing named characters**, rather than creating a second cast of random strangers. Family members, peers, companions, the current enrolled teacher, children, actual customers, colleagues and neighbors participate. Society mirrors of an existing peer resolve to the original person.

An NPC pair has a seeded agenda and a relationship that changes while time passes. Recognition, company, privacy, fairness and independence influence which situations appear. Calendar movement permits at most two developments per call, and social developments do not interrupt Age Up with a modal. Local observation is recorded in the journal and relationships panel; the player can spend an actual day to join the discussion. Remote developments remain private, including any changed friendship or rivalry. The public panel retains the relationship as it was last witnessed.

There are sixteen authored situation families and 65 initial choices: school seating, a bridge dare, shared notes, rehearsal, a sealed letter, festival plans, exclusion from supper, parental disagreement, a sibling's locked-out game, professional credit, a garden boundary, a care rota, a rival's certificate, departure, a disputed shared purse and reconciliation. Each involves two actual named people. Options describe what the character can do; they do not advertise reputation rewards or numerical moral judgments. Choices affect both participants' actual bonds and their tie to each other, leave memories and can produce an observed later scene. Taking one person's side often costs confidence with the other. Hearing both people and keeping out of a dispute are distinct possibilities.

Follow-ups arrive after 24–78 actual days and are nonblocking observations with an optional conversation. They show changed behavior: separate market stalls, a shared lesson book, a returned chair, an unanswered letter. Scene bodies and choices are saved when offered, preserving actor identities and exact options across saving/loading. An accepted pending scene stays pending. An unaccepted afternoon expires after 180 days, and callbacks after 365 days, so a childhood invitation cannot hang around into middle age. Action rows require both actual participants to still be local. A global recent-scene window avoids repeating the same dilemma on successive actor pairs.

Personal hobbies, school clubs, pranks and first affection can be recognized in relevant social scenes when the actual participant has a memory of the afternoon. No second participant is informed of a private history merely by being present. No social action grants gold, equipment, a job, a class or knowledge of a supernatural condition.

## Integration

The optional `s.social` sidecar is version 1. It is initialized prospectively on migration and does not invent past meetings, journal entries, confidence or payments. Successors keep existing people and their world relationships but begin with their own observed circle and confidence; the parent's private invitations are not inherited.

Exports from `dist/js/social.js`:

- `initializeSocial(state, { migration })`
- `inheritSocial(previous, next)`
- `socialActions(state)` and `applySocialAction(state, id, context)`
- `onSocialTime(state, { oldDay, newDay }, context)`
- `flushSocialEvent(state, context)` and `applySocialChoice(state, eventId, choiceId, context)`
- `socialEventIds()`, `socialView(state)`, `validateSocial(sidecar, state)`

Actions use the `social_` prefix, declare `days: 0`, `durationDays: 1` and own their bounded `context.spendDays(1)`. A zero-day pause cannot create an interaction or consume the annual visit limit. `flushSocialEvent` opens only player-initiated invitations; passive witnessed scenes stay in the journal and action list. `context.journalLiteral`, when available, prevents a legacy companion-name replacement from changing an unrelated peer whose given name is Kest, Mira or Orrin.

The public view exposes only witnessed `ties`, `notices`, `circles` and currently offered `actions`. Contact IDs are real existing IDs; private graph IDs do not replace contact identities. Internally, stable lineage identity, with unique exact name and birth date as a fallback, preserves the graph when an older friend becomes a guardian or a society neighbor. Reused life/contact slots do not turn an old acquaintance into a new child.

## Verification

`tests/social.test.js` covers migration, pure queries, identity stability across fractional years, bounded time, private knowledge, real bonds, delayed echoes, saved exact choices, actual deaths and absence, successor confidence, malformed graph rejection and all sixteen situation families with every initial choice. Reachability is checked across 720 seeded age/household fixtures. Eight additional runs use public engine operations from birth through eighteen, join an actual social scene and resolve different choices; every transition is JSON-round-tripped and validated, input mutation is rejected and no social modal occurs during ordinary Age Up. These are regression runs, not a claim to have manually played every possible life.
