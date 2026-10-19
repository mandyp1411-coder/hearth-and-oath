# Adult-child livelihoods: leaf checkpoint

Base: public v0.48.0, b24cba8. This checkpoint does not connect the feature to the engine, family UI, residence resolver or succession.

## Shared canonical career rules

`career-entry.js` now owns the unchanged profession catalog, lookup, fresh ledger, modern mastery thresholds and unpaid experience formula. `careers.js` re-exports the existing public catalog/lookup API and uses those same constructors and formula. Entry remains available at sixteen in an operating settlement; certificates are not new eligibility gates.

## One bounded case per person

`adultLife` lives on the stable lineage person, not a reusable local child ID. A real calendar action or conversation may introduce it after eighteen. Reads and migration do not. An old adult starts today with no reconstructed past work, wages, attendance, residence or agreement.

The case stores a latched individual goal and actual educational basis, one destination, eligible calendar intervals, bounded work/course progress, one optional response, one independent-lodgings record and one later milestone. Work stops after one introduction day plus fourteen unpaid training days. Study stops after four dated free sessions, thirty eligible days apart. Residence preparation requires ninety eligible days, or sixty after a one-time explicitly selected twenty-gold start. A study course can continue after the earlier residence date. No certificate, owned building, material reward, wage, parent skill or parent career advancement is created.

## Availability contract for future engine wiring

`advanceAdultChildLife` accepts explicitly verified `(fromDay, toDay]` intervals for the exact existing destination. The caller must obtain actual availability boundaries. Current open status at the end of a large jump does not verify its intervening years. With no verified intervals, time moves forward but progress does not, and skipped time cannot be reclaimed on a later call. A verified earlier open period may count even if the place is closed now. The bounded interval ledger preserves dates needed to validate every lesson, introduction, training and residence milestone.

No engine integration should pass an entire old-to-new interval merely because the destination currently operates. Repeated or overlapping observations cannot grant repeated progress. Active heroes and deceased children receive no autonomous progression.

## Parent response and inheritance contracts

`respondAdultChildLife` returns the exact explicit charge, either zero or twenty, without touching parent money. The future outer handler must apply it atomically once. Listen and decline preserve the same child goal. Later funding cannot backdate a residence or charge for an already completed one.

`adultChildInheritance` is a pure adapter to use after the ordinary successor career reset. It restores only the child's own selected job and recorded unpaid ledger. Skills already in child development are not awarded again. Paid work, earned gold, guild rank, mastery from the parent, materials, class and certifications are not added. The study adapter preserves the earlier distinct course as paused preparation and derives annual lesson counts from actual session dates. Existing child qualifications remain the existing succession handler's responsibility.

Sibling addresses and the selected heir's occupancy still require the reviewed residence/succession callbacks. Independent lodgings are an address at an existing place, never a second deed or an assumed room inside the hero's owned house.

## Verification at this checkpoint

`node --test tests/adult-child-livelihoods.test.js`: 17 pure tests, about 0.25 seconds. Coverage includes distinct interests, canonical unpaid XP/skills, lazy old metadata, explicit support, no replay, unknown gaps, known pre-closure intervals, dated course transfer, bounded milestones, identity/ownership forgery and hero/death freezes. Syntax checks pass. No engine, long-life, browser, build or publication checks have been run.

## Actual clock adapter checkpoint

`adult-child-clock.js` captures only known children/child siblings and unique residence-site availability immediately before a real `spendDays` call. It introduces missing cases prospectively at the start of that call or the actual eighteenth birthday inside it. Normal thirty-day AgeUp chunks and aggregate 365-day advances therefore count. A narrow optional realm callback observes the existing siege closure at its authoritative year-boundary day; it does not create another world event. Adult-life progress runs after the existing world tick without moving ordinary lineage registration, aging or death logic.

An explicit closure excludes its boundary day and later closed time. A dated reopening admits only later days. Stale world-clock events earlier than the current interval correct the starting availability instead of manufacturing current progress. Endpoint changes without a dated cause are unknown. Known sibling deployment intervals are excluded using their exact lineage identity and recorded enlistment/return dates. No whole world copy or historical log scan is needed, including after world history truncation.

The snapshot is local to one invocation and is never saved. Existing early returns for life-ending curses, health mortality, legacy-plan preservation or other terminal interruptions do not settle that snapshot. Any such genuinely unobserved terminal interval is left uncredited rather than inferred later. A dead child or active hero cannot receive autonomous progress. Completed cases freeze at their actual milestone until a later real milestone conversation records its date.

The combined leaf/clock suite contains 31 pure tests, completing in about 0.3 seconds. It covers ordinary aggregate time, split-time equivalence, birthday boundaries, dated closure/reopen, stale catch-up, imported gaps, history truncation, personal deployment and terminal snapshots. Engine semantic tests remain pending the shared validation lane.

## Family, residence and succession callbacks

The family card and contact descriptions now show the recorded individual goal, bounded preparation, independent address and actual earlier support. The optional `lineage_future` event offers the explicit twenty-gold start, listening without a financial promise, or an honest funding limit; `lineage_independence` later hears the one-time milestone. Both have a no-cost close option for interrupted or stale scenes. Their stable child identity is checked in the pending event, and their specific costs and outcomes survive narrative-edition rewriting. No automatic annual prompt was added. Existing annual adult-child conversations can recall the real earlier answer.

The residence resolver respects an existing child's/sibling's recorded independent lodgings ahead of the hero's current home, without granting a second deed or asset. Successor sibling projection retains recorded addresses and work. The chosen heir can start at their surviving independent address while inheriting the parent's physical household home at its separate address.

Succession first clears parent professional knowledge through the ordinary reset, then restores only the validated child's own canonical job and unpaid training evidence. Parent guild rank, wages, mastery and materials are not imported. The child already owns the corresponding developmental skill, so inheritance never awards it twice. Actual study progress is restored with earlier different-route schooling kept paused. The successor journal, personal upbringing and later epilogue retain this particular recorded beginning.

The leaf/clock/view test suite now has 38 pure tests and completes in under one second. Six bounded engine tests in `adult-child-engine.test.js` cover lazy metadata, explicit/stale funding, normal AgeUp, the one-time milestone, distinct course transfer, public succession, cash conservation, sibling addresses and the family card. The first shared-lane run finished in 3.211 seconds: four passed; two succession tests stopped at an unavailable retirement action because the diagnostic parent was nineteen, correctly below the real thirty-year retirement gate. Those two tests now explicitly set up a validated closed chapter through the existing history helper rather than inventing twelve simulated years or weakening gameplay eligibility. Their public `continueAsChild` assertions await the next shared-lane run. No build, browser or publication action has been performed.
