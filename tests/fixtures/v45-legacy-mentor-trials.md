# Fixed pre-feature original-route captures

`v45-legacy-mentor-trials.json.gz` was reproduced on 2026-10-17 by executing
published v0.45.1 JavaScript from commit
`30e296bf0c72751ce9124b670cd1e1a64c149cf5`, materialized with a read-only Git
archive. It is a deterministic public-engine reproduction, not a historical
user save or a claimed whole lifetime.

Each of paladin, necromancer and assassin has four valid source states:
`prepared`, `offer`, `trial`, and `battle`. All were validated by that published
engine before capture. No hero skills, resources, actors, events or battle
contexts were manually edited.

The public setup used `createGame` with a city origin, noble household, gentle
difficulty and seed `individual-legacy-route-CLASS`:

- Paladin: warrior path, childhood choices defend / martial / question; migrate
  through the published engine; recruit Mira, Orrin and Kest; one ordinary train
  and two shrine prayer actions, walking to the shrine normally.
- Necromancer: mage path, defend / scholarship / question; migrate and recruit
  the same party; two ordinary train actions.
- Assassin: rogue path, investigate / apprentice / hide; migrate and recruit the
  same party; one train, a real road journey home, two herb-gathering actions,
  then a real journey back to the city.

Routine road/calendar followups were resolved using their actual choices. The
prepared state then used the existing `seek_order`, `seek_necromancy`, or
`seek_assassin` action. Mercy, willing consent, or ledger recovery led to the
original initiation trial; choosing combat captured the actual original battle.

The compressed fixture SHA-256 is
`292326a5b298bef0ce025b0f94c292910ff8741c5e7e01316eaf4e19fc94872b`.
Tests verify the source commit, migrate these unmarked authored states without
recasting them, and separately exercise prospective marked-route behavior.
