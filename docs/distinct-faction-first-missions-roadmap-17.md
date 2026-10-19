# Distinct first faction agreements

Roadmap 17 replaces only prospective first agreements. The current published
baseline is `4c8f38c`; existing displayed decisions, paid projects, ranks,
cooldowns and final public services retain their original terms.

## Finite cases

- Lantern Compact: compare anonymous totals and allocate two identified spare
  covers, or consume two carried Cloth to make and deliver replacements. Guest
  names are never sold or needed.
- Salt Ledger: inspect the cargo mark and original manifest, or hear the willing
  surviving sailor and reconcile three named claimants' loading accounts. The
  player receives no cargo. Persuasion 4 unlocks the oral method, not the case.
- Unbound Archive: use Scholarship 4 to compare dates and rates, or reconstruct
  a shift with the consenting worker and public bell register. Establish 18 Gold
  earned, 12 paid and six unpaid without inventing an employer payment.
- Rootward Circle: actually arrive at the accepted forest destination and agree
  a gathering-access strip with its tenant, or obtain consent and consume two
  Wood and one Cloth to relocate the finite seed planting into raised trays.
- Ash Company: compare the signed payroll and witness a chest count, or use
  Weapons 4 to attend a voluntary veteran muster before the count. A 12-Gold
  shortfall is not proof of theft or a payment to veterans.
- Quiet Table: ask and deliver directly, or use Stealth 4 for an explicitly
  countersigned relay through a named willing courier. Refusal requires return
  of the same parcel, never invented consent. A handoff to a courier alone is
  not final delivery proof.

Each faction has a method with no skill or profession gate. The fixed 20-Gold
limited-work stipend is independent of method and is awarded with one rank and
one faction skill point only after the actual finite agreement is complete.
Travel, materials and household accrual remain separate. No first mission
creates a rank-three service or a global stock, payroll or property transfer.

## State and source identity

`faction.firstMission` is authoritative. Journal, local-area, conversation and
service controls are read models over it, not another quest ledger. Hearing,
opening or leaving an offer does not create acceptance. The selected definition,
method, people, targets, case values, work and evidence remain saved.

Essential petitioners are actual authored `rpg.contacts` with canonical portraits
and existing aging/death handling. Existing service people keep their real roles.
An exact captured service ID must still hold its office to supply new work.
An explicit logged public-custody handoff can accept a successor, but does not
transfer earlier testimony, consent, authorship, bond or private memories.
Death, absence, retirement, a closed site or occupation prevents unsupported
continuation. Withdrawal claims neither unfinished proof nor a reward.

`objective-evidence.js` has a closed seven-kind vocabulary and bounded records.
It owns no world state, criminal logic or global task store. Later finite cases
can pass their own owner record to the same helpers. Callers must establish
completed acquisition and check willing consent where required; verified refusal
is deliberately different from willing consent.

Optional generic `sourceRevision` is a bounded nonnegative integer. Faction
tokens require it to capture the custody-log length at acquisition. The owner
checks the exact custodian at that revision, monotonically dated custody and
proofs, minimum attended work between proofs, and verified actual arrival before
fieldwork. This preserves true same-day handovers without assigning an earlier
signer's proof to a successor. Other evidence owners may omit the field.

## Time, interruption and migration

Objective steps use the existing RPG project clock. Materials consume once on
the first actually attended day. Resuming never charges them again; cancelling
does not refund spent time or materials. A birthday, moon need or other waiting
moment is not overwritten by a newly earned comparison scene. Its conclusion
can be reopened without repeating days. Rejected interpretations remain
unresolved and recoverable, not a false verdict.

The gathering destination is the nearest open connected forest by actual road
days, not alphabetic site order. Field attendance is explicitly outdoor work.
Field direction grants only Rumored map knowledge. Arrival evidence is written
by completed ordinary road or hex arrival after acceptance, not map inspection,
an old Visited record, a survey button or a manually sought encounter.

Old first-decision snapshots continue to accept their saved care/trade/scheme
choices. Old partial projects retain their fee and progress. Existing ranks one
through three get no retroactive first mission, payment, evidence or extra rank.
Heard-only rank-zero saves receive only a prospective offer. Later agreements
quote the saved first outcome, including its actual method and witnesses.

## Validation status

- PASS: syntax checks for changed source and test files; `git diff --check`.
- PASS: four owner-independent evidence tests, including optional revision bounds.
- PASS: all twelve case/method routes through public actions, once-only rewards
  and saved concrete outcomes.
- PASS: no-acceptance flood, interruption and material consumption, missing
  requirements, real road arrival, refusal/return, exact participant death or
  absence, legacy displayed/paid terms, malformed proof, temporal proof/arrival
  forgery, synthetic custody-owner contracts and preserved calendar decisions.
- PASS: a targeted return verified the exact first outcome in chapter two and
  the unchanged real shared Market service at rank three.
- PASS: two affected existing Journal faction contracts.
- NOT RUN after the final source-only refinement: the provenance-checked prose
  bypass and its new public title/body/choice/notice/Journal assertion. These
  await the parent's next integrated runtime lane.
- NOT RUN: current release aggregate, responsive browser checks, offline parity
  and integrated NPC-continuity/faction valid-save successor handoff.

These are controlled threshold/material fixtures played through public actions,
not twelve naturally earned full lifetimes. The initial return-route test ran
out of Focus: source was improved to choose the nearest real route, separately
from correcting the fixture to camp through ordinary public actions. The
synthetic 33-year epoch jump was rejected by the full engine; it is explicitly
not a valid played-lifetime save. Its actual successor projection and action
handlers were narrowed to the faction owner's custody/provenance validator,
which passed. Integrated NPC16 must still establish a valid-save successor and
same-day handoff. No broad suite, browser, build, publication or main-tree edit
was performed. Integration and publication remain the parent's responsibility.

One callback regression exposed generic narrative replacement erasing the new
case instructions and later outcome. The narrow authored-scene bypass preserves
only a known faction, matching pending scene, exact choice set and valid owning
mission. Old faction prose remains under its original presentation. The initial
bypass/callback correction passed its targeted test; the stricter provenance
refinement and new visible-text assertion are source-only pending integration.
