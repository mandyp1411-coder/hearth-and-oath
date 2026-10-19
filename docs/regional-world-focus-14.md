# Focus 14 continuation: regional world foundations

Release **v0.30.0**, 15 October 2026. Continued from v0.29.0, source
`960849b064411303ea2431dd1494aa7ccb6db66c`. Focus 15 remains unstarted.

## Working brief

Build a world of persistent regional cultures, local institutions and competing
governments. Let politics advance through lived time without assigning the hero
an obligation to fix it. Children experience civilian and family consequences;
adults may accept specific local work. Preserve cultural identity and actual
people when political control changes. Expand the map and traversal foundation
to support later territorial campaigns. Retain the muted yellow-gray palette,
the map-only popup, world-first NPC services, existing save geography, identities,
and the exact terms of unfinished travel and expeditions.

## Territories and institutions

| Region | Culture | Government and court | Primary religion |
| --- | --- | --- | --- |
| Rainward March | Marcher Households | Hereditary March; March Court; Margrave | Vigil of the Lantern |
| Salt and Cinder Coast | Saltward Port Communities | League of Free Cities; Assembly of Harbors; First Speaker | Veiled Moon |
| Highstone Reach | Highstone Hall Clans | Confederation of Clans; Moot of Halls; High Warden | Patient Flame |
| Blackgrove Vale | Vale Grove Communities | Covenant of Groves; Root Council; Grove Speaker | Unfenced Wild |
| Ashen Borderlands | Emberward Communities | Elected Protectorate; Council of Wells; Protector | Unspent Ember |
| Bellwater Commons | Bellwater Ferry Commons | River Republic; Common Bench; Convenor | Remembered Hearth |

Each culture has a practical custom, distinct festival, historical charter,
economic interests, political tension and diplomatic terms. New-world capitals
have a real court area with a named ruler and clerk. Other settlements have
envoys at their watchhouses. Speaking to them explains local life and exposes
only the work available there. Festivals consume a real day, support recovery
and can be attended once per region per year by each life.

The primary religion predominates locally, with seeded minority traditions and
settlements without a public shrine. Each new regional seat maintains its
primary shrine. A town without a shrine still has a doctor. Constitutional
leaders serve different terms; hereditary rulers retain succession. Known former
officeholders remain remembered people, and court officers age out. If a ruler
has become a personally known, canonical life actor, their actual recorded death
changes the court once; it does not recreate the deceased person.

Existing saves keep their saved regime, ruler, faiths and local people. Their
new institutions use inhabited capitals already present in their territories.
An old region with no inhabited settlement has no invented physical capital.

## The larger atlas and movement

New generation-7 worlds contain **73–80 locations and 999 hexes** (37 by 27),
compared with 25–32 locations and 165 hexes in the preceding release. Six
territorial anchors follow the existing mountains, woodland, marshes, coast,
fortification and river country. A saved spatial partition assigns settlements
and their regional identity. All six regions receive an actual capital and new
settlements, wilderness and ruins. Roads connect the whole world; crossings
remain grounded in the same saved coastline, lakes and terrain.

Paper charts add regional names, government captions, fine boundaries and six
territorial sheets. Local and larger regional views keep settlement drawings
readable. New large worlds initially open the local sheet; a saved sheet choice
still wins. Country, region and local sheets are views of the same map. Broad
geography and capital names are public; unknown ordinary sites stay undiscovered.
The popup contains only the selected paper map and its close control. Hold-drag,
zoom, keyboard camera controls, inspection and return focus retain their behavior.

Players may mark a hex route to a known place without spending time or learning
its surroundings. The dashed route is saved separately from named-road journeys.
Continue walks one adjacent crossing, preserving real Focus costs, partial slow
steps, calendar interruptions and finite camping packs. The next crossing checks
current access again. Camping preserves the route; clearing it preserves all
completed days and movement. Invalid, looping and teleporting saved plans fail
validation. Open water requires a real crossing.

Older generation-3 through generation-6 maps use their exact original lattice,
site assignments, terrain and road links. Additive migration starts political
cadence at the saved day; it does not replay earlier wars, enlistments or deaths.

## An autonomous world

Saved, deterministic 91-day political periods advance only through the engine's
time path. Repeated queries, map rendering, reloads and clicks do not advance
politics. Adjacent governments can fight over actual border crossings, seized
resource caravans, protected pilgrimage, succession charters or earlier
occupation. At most three wars are active simultaneously. Each stores its cause,
terms, front, balance, exhaustion and phase. The former universal three-year
expiry is replaced for new disputes by campaign progress, exhaustion, negotiated
peace and possible entrenched stalemates. A controlled seeded world check keeps
one dispute active as a stalemate for **101 years** of political time.

War affects existing merchant scarcity, prosperity and security. Severe damage
is concentrated on the front and its immediate roads; hinterland effects are
smaller. New wars have less frequent destructive sieges. Capitals, the current
location, the player home and required unfinished campaign sites keep their
existing protections. If a front settlement is lost, surviving households give
their accounts at a reachable settlement and accepted mediation follows them.
Existing older wars retain their original saved terms and resolver.

Actual adult siblings may enlist when their birthplace's region is at war.
Deployment uses a separate dated assignment and stable lineage identity. It
does not erase a relative or mark them as an unidentified missing person.
Deployed relatives cannot also be approached at home. Service can end in return
or a real death, using the shared lineage, household, grief and memory path.
Casualty dates and frozen ages use the actual event day. Children cannot accept
mediation, confront an occupying force, raid a war road or seize land, including
through forged action IDs.

## Optional intervention and hostile holds

Mediation starts through a local envoy or court. It requires hearing border
households, visiting both courts for written proposals, delivering three actual
rations to civilians, and returning to convene the settlement. It is a journey
with several local tasks, not a single persuasion roll. Written audiences and
the eventual agreement create memories with the named rulers. The war may also
end autonomously while the player is away; the accepted account then closes
honestly without pretending the hero caused the result.

Infrequent vampire outbreaks can occupy inhabited towns outside the current
location, home and protected campaign anchors. At most two holds are occupied
at once. A hold has a controller separate from its original region, faith,
people, shop stock and property. Ordinary public trade and official work close;
a doctor, resistance contact and witness remain reachable. Residents are not
silently converted into vampires or deleted.

An adult may accept the resistance's work, investigate at the Archive, supply
the shelter with two actual rations, then enter the Occupied Keep. Two actual
party encounters defeat the patrol and ruler. Retreat leaves an unfinished quest;
proof and battle resolution are saved and cannot pay twice. Afterwards the
player returns to the resistance to restore regional rule or claim contested
household stewardship. A claimed holding uses existing real ownership, annual
returns and inheritance. Its original regional claim remains in the world.

The Journal retains Active Quests, Archive and Notes. Only accepted intervention
appears as a quest. Learned regional histories and dated dispatches appear in
Notes; personal war losses retain the actual family record. Wars, control,
cultures, court identities and cadence survive genuine heir continuation.
Personal unfinished quests close with the earlier life; an heir can choose
whether to take up an ongoing dispute. Holdings transfer to the actual heir.

## Verification

The release gate passed **253 checks** with zero failures, cancellations or
skips across 17 current test files. A final regional/court recheck passed all
**26 checks**, including the added known-ruler death case, and the final paper
map recheck passed **23 checks** after updating the intended local-sheet default.
This covers **254 distinct checks** across the release gate and final additions.
The historical whole-suite caveat below is retained.

`tests/regional-world-v33.test.js` contains 26 integration and simulation checks:
territorial membership, projection, larger-map labels, reachable courts and
remembered officeholders, local religions, festivals, pure route planning,
adjacent travel and camping, forged routes, neighboring wars, period cadence,
chunk/reload consistency, prolonged and century-scale disputes, actual sibling
deployment/death/grief, child restrictions, full mediation, real hostile service
closures, both liberation outcomes through actual combat, duplicate resolution,
genuine old-save preservation, heir continuation, strict validation and the
production Explore/court handlers.

An authentic v0.29 fixture was generated using the unchanged published source,
alongside the existing authentic v0.28 and v0.27 fixtures. Comparisons preserve
saved worlds, every old hex, site assignment, road link and partially attended
crossing; old paid journeys and old descents retain their own resolvers.

The map checks include 100 new seeds for geography/connectivity and exported
production SVG inspection. The broader gate covers creation, character portraits,
combat, inventory/trade, map camera, navigation, scrolling, saves, world-first
services, childhood-to-elder openings, mazes and legacy travel. The offline check
executes the actual embedded script in a network-denied VM with the production
semantic DOM harness and verifies byte-for-byte reconstruction from stored parts.
The final occupation/local-service recheck passed five checks. The offline game
contains **82,377,245 bytes** across **10 stored parts**, reconstructed exactly.
Its SHA-256 is

`d2e1176ab230db5a0ffb27a4eb0f64599518305ac45d242b46dbb7a254cb3285`.

See [the machine-readable verification receipt](verification-v0.30.0.json).

These checks do not measure browser layout, touch hardware or game balance with
human playtesters. No managed browser capability was available in this workflow.

Historical whole-suite caveat: three old `lineage.test.js` scenarios still assume
remote home purchase or a particular fixed person's romantic compatibility. The
same three failures were reproduced against unchanged v0.29 source. The current
full historical suite is not claimed green; current local service, adult consent,
family death and real heir-continuation flows have dedicated passing coverage.

## Scope remaining

This release delivers regional institutions, independent conflicts, civilian
consequences, diplomacy and party-scale liberation/holding decisions. Army
recruitment, battlefield command, territorial campaigning, independent player
kingdom institutions and coalition diplomacy remain future work. A hold's
contested ownership is a persistent foundation for those systems. Political
history and accepted quest records are bounded; this is not an unlimited
historical simulation. Focus 15 has not been started.
