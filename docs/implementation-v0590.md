# Hearth & Oath 0.59.0 — implementation and continuation record

This release reconciles **Hearth_and_Oath_UI_Fixes_and_Implementation(1).pdf** and **Hearth_and_Oath_Comprehensive_Game_Audit_and_Development_Context_v0581.pdf** against the actual 0.58.1 source. The PDFs contain historical findings, defects already repaired by later releases, and larger development proposals. Historical working behavior is retained; the proposed systems receive bounded first implementations connected to the existing simulation.

The game remains a fantasy life simulation. Work, learning, family, care and ordinary company can be its center. Adventure and combat remain optional. Reading a proposal, calendar or record does not accept work, spend time or generate a relationship.

The creator’s routine “Draft updated” strip has been removed. A named undo arrow stays in the top-left toolbar and becomes enabled only when a change can be reversed. The preview frame, avatar and crop now have a complete explicit width/height chain on desktop and compact layouts. All 64 ancestry/age preview combinations resolve to existing art; native browser layout remains a separate check.

## Story, lifecycle and records

| Report item | Implemented contract |
| --- | --- |
| HOO001 | Closing-account producers and validation share a complete undertaking-kind registry, including faction work. All twelve first-mission methods are exercised through public commands before closing/import. Closing an account twice preserves the first recorded decision. |
| HOO002 | Eligible personal-story offers appear in the current Journal. **Hear the proposal** opens the actual scene; it does not accept the work. Nearby-person story offers remain available. |
| HOO003 | Newly selected school-only childhood premises require enrollment and actual attendance. Existing pending scenes retain their saved wording and terms. |
| HOO004 | Health prose retains symptom severity, care windows and the authored context. Physical and emotional care remain separate; recovery does not promise a cure. |
| HOO005 | Infant guide, footer and service meetings describe observation and adult care. Infants receive no autonomous action menu or personal letters. |
| HOO006 | Paused radiant work is labeled Paused and has its real Resume control in Journal. Tracking does not implicitly resume work. |
| HOO007 | Finished personal stories expose every captured choice, outcome, date, duration, fee and proceeds, including older five-chapter records. |
| HOO008 | The current Journal Archive renders the saved closing review and its complete unfinished-account list. It never regenerates a closing account from present circumstances. |
| HOO009 | Undertaking display states use authored labels such as Abandoned and Completed; machine IDs remain unchanged. |
| HOO010 | The active 80-notice inbox gains a 320-notice archive and 20-row pages. The 81st unread notice retains its exact words. Retention beyond 400 is explicit and favors unread notices over read notices. It does not silently imply an unlimited archive. |
| HOO011 | Free and guided recovery starts, free self-care and household focus controls are accessible again. Annual work batching keeps its existing separate policy. Saved commitments retain their resume/cancel terms. |
| HOO012 | Plans describes chronological age, portrait stages and ancestry-specific physiological milestones separately. Existing paintings, saved death dates and mortality rules are preserved. |
| HOO013 | Unsubmitted note drafts remain scoped to the actual life during the page session and now participate in the page-exit warning. **Keep Note** still performs the durable game save; the UI does not promise reload recovery for an unsubmitted draft. |
| HOO014 | Discoveries are paginated after search. Counts and page state are transient; no discoveries are discarded. |
| HOO015 | Unknown future event/note identifiers preserve valid authored titles, bodies and numerical terms rather than replacing them with generic invented accounts. |
| HOO016 | The release contract continues to discover every test and every offline verifier. No historical exclusion, expected failure or known-debt waiver was added. |

| Story verification | Repair |
| --- | --- |
| QS01 | Literal current receipts carry the narrative marker before refresh. Infant outcomes agree between storybook and Journal. A uniquely linked current-life generic childhood entry can recover its surviving exact storybook outcome; ambiguous matches are left alone. |
| QS02 | The existing speech capability boundary drives infant presentation. The age threshold was not raised to conceal a UI contradiction. |
| QS03 | Birthday hooks outside the actual anniversary window no longer send old greetings as new mail. Earlier greetings sit behind a collapsed, dated correspondence disclosure with their recorded age and elapsed time; the inbox dates opened letters explicitly. Current proposals take precedence over unrelated later letters. New conversation messages capture `channel`, `authoredDay` and `receivedDay`. Old records may lack provenance. A historical letter or unknown earlier record is presented separately from live spoken dialogue. IDs beginning `letter-` are not treated as proof of a letter. |
| QS04 | Scene choices preserve their deed and captured terms. Completed personal work keeps the actual specific outcome; health, work and regional literal receipts are protected from the broad generic action rewrite. |
| QS05 | Known story fact tokens resolve to the captured decision/outcome. Unknown opaque tokens receive neutral record text, never fabricated facts. |
| QS06 | Relationships says **First recorded meeting**. An earlier age explicitly present in a memory is shown as evidence of knowing someone by then, without inventing a meeting date. |
| QS07 | Unaccepted openings read **Saved proposal**. They remain optional and count as never accepted at closure. Same-age returns invite review without a misleading zero-year wait. |

A genuinely played age-21 campaign exposed the old two-million-character save ceiling when it reached its last dungeon. Full-state admission now uses a shared eight-million-character ceiling and a matching UTF-8-aware import bound. The exact pre-battle life is retained as a compressed regression fixture. Browser quota failures still retain the session and export path; the larger validation budget is not a claim about device storage capacity.

Earned personal-story doors and lessons are reachable again in Everyday activities and the actual settlement. Community works appear in a collapsed section of Plans, including their funded, unfunded, suspended or closed status. These controls call the existing authoritative actions and retain each service’s fee, attendance and return date.

Standard creator save conflicts retain the generated life and expose its JSON export in the conflict review. Choosing another empty slot or keeping the draft never overwrites the life saved by another session.

Current Journal offers also retain free decline/reconsider controls. Archived contract cards preserve their captured client, objective, route, closing date, actual proof, payment and failed/withdrawn attempts; searches include those saved names. New retirement invitations keep the generated unfinished-account warning.

Named night meetings and transformation offers retain their actual participant, consent choices, infection window and treatment costs. The Journal records the invitation and points to its remembered place; the actual return search is performed in the surroundings, with its original night and eligibility rules.

Campaign completion, memorial visits and household-displacement receipts keep their specific original accounts. Versioned aftermath scenes retain the selected ending’s people, losses and disagreement instead of a generic yearly scene. The two existing complete campaign playthroughs now run in separate test files under the unchanged per-file timeout; no playthrough or assertion was removed.

One-time narrative migration now preserves captured conversations, memories, outcomes, quoted proposals and pending scenes. It does not overwrite a player's earlier words with today's editorial version. Prospective copy improvements and mechanical state remain separate concerns.

## UI manual crosswalk

| ID | Current disposition |
| --- | --- |
| UI001 | Existing displayed-position number dispatch, disabled positions and held-key guard retained and tested. |
| UI002 | Existing free profession review and authoritative confirmation retained. |
| UI003 | Final semantic disabled rules override primary, hover and active styling. Explanations remain readable. |
| UI004 | Dialogue, inbox and notification metadata use the chosen reading scale exactly once. |
| UI005 | Home movement typography uses the shared serif role; plain reading is respected. |
| UI006 | Quest/map detours focus the destination heading. Import records its opener before file selection and restores it on cancellation/error. Existing Settings/Load/Ironman return focus remains intact. |
| UI007 | Each battle target includes the actor's display name, with separate support and opponent groups. Checked state remains the actual selected target. |
| UI008 | Creator discard review and safe **Keep Creating** default retained. |
| UI009 | Generation progress remains outside the inert form. External creator navigation/topline controls are also disabled while generation is running. |
| UI010 | Current search/empty-state improvements retained; discoveries are bounded after filtering. |
| UI011 | Persistent single-key shortcut control retained. Reading presets can turn shortcuts off. |
| UI012 | Both project-abandonment entry points share one review of exact committed resources and remaining days. **Keep working** receives initial focus. Confirmation is bound to the same state and project snapshot and rechecks the actual public offer. |
| UI013 | Calling cards show one named mentor-map action. |
| UI014 | Lineage navigation says **Family history**, with links to living family and reciprocal history access. |
| UI015 | Fullscreen labels reflect actual state and update on `fullscreenchange`. |
| UI016 | Established lives receive a compact guide disclosure; explicit reopen/dismiss behavior remains. Infant guidance still opens with appropriate observation copy. |
| UI017 | Zero/nonfinite ingredient amounts are omitted from visible requirements. Eligibility and spending rules are unchanged. |
| UI018 | Changed general controls use 46px minimum targets; map-cell density retains its own rules. |
| UI019 | Existing natural-flow ownership and safe view-position restoration are retained. Historical CSS blocks were not indiscriminately removed. |
| UI020 | Final menu and inbox drawer owners include safe-area padding and usable scroll extent. |
| UI021 | Interactive boundaries and focus outlines have distinct roles from decorative ledger rules. |
| UI022 | Navigation labels wrap at words; narrow creator controls retain usable widths. |
| UI023–024 | Facts and original story receipts use the record repairs above; unknown historical details are not invented. |
| UI025–027 | Existing contiguous origin ordinals, stable IDs and explicit pronoun display mapping retained. Canonical story titles are shared without importing the full narrative runtime. |
| UI028 | Existing authoritative herbal-care review and actual receipt retained. |
| UI029–030 | Existing scoped note drafts, failed-save retry and top Write Note retained; page-exit protection added. |
| UI031–032 | Existing board-local focus, hidden faces, held-input protection and exactly-once Finish retained. |
| UI033 | Portrait frame and child have explicit positive dimensions: 192px desktop and 88px compact, with square aspect ratio. |
| UI034 | Collapsed or short creator layouts use normal document flow; sticky portrait positioning is removed there. Settings no longer wraps in the middle of a word. |

Creation packages CC01–CC12 retain three stages, exact age, dependency explanations, scoped locks, portrait-only randomization, a single top-left undo arrow, deterministic review, first-save retry and the concise Ironman disclosure. All mature/older/elder ancestry and presentation assets remain included. Portrait identity now uses its stable atlas identifier rather than deriving identity from a hosted filename, so embedded media URLs cannot change a person's identity.

QoL01–QoL10 retain the shared action-cost authority, safe scene detours, scoped drafts, search counts, known-contact scopes, actual quest tracking, full-loadout comparisons, quiet save health and dismissible help. Project loss review, bounded inbox/discoveries and precise history complete the identified gaps. Optional multi-pinning is not a second quest or relationship authority.

## Connected systems and the first development slices

| Topics | Implementation and existing authority |
| --- | --- |
| T01 adult chapters | A contextual current-life chapter reflects actual work, household, teaching or signed work. Age is not a compulsory life goal. |
| T02 / F01 routines | Plans reviews up to seven days of a supported short activity. Every session calls canonical public handlers and rechecks affordability/eligibility. Decisions, birthdays, changed health, places and unfinished work stop it. The recap records actual elapsed days and Gold, including separate household accrual. No dialogue, combat, pledge or contract is automatically answered. |
| T03 childhood continuity | Childhood outcomes and earlier memories remain specific. Adult person conversations can acknowledge their own recorded shared account. Existing peer development and annual callbacks remain the source of further continuity. |
| T04 education | School premises are eligibility-checked; existing named teachers, dated courses, practical projects, qualifications and interrupted progress remain authoritative. |
| T05 NPC voices | Existing disposition and personal-topic decks are retained. Current ordinary conversation includes the person's actual concern, shared decision and unresolved boundary rather than resetting to anonymous small talk. Saved replies are never regenerated. |
| T06 relationships | Recent repeated ordinary conversation/company gives a smaller familiarity gain. New values discussions disclose one preference at a time; already-known records and old captured discussions retain their prior knowledge/terms. Familiarity never resolves a concrete harm. |
| T07 / F03 family autonomy | **Their own lives** projects existing adult-child and society records: chosen work/study, actual training, explicit support and independent residence. It creates no competing NPC clock or omniscient schedule. |
| T08 / F05 career and mentorship | Existing mastery, paid/unpaid work, commissions, staff, customer teaching projects and masterworks remain real work. Plans makes work evidence and reputation visible alongside family and calendar concerns. |
| T09 economy | Shared quotes remain authoritative. Plans distinguishes direct fees/wages from actual-day household provision costs. Savings-goal forecasts are available under Plans, including actual material shortfalls and separate household provision costs. No retrospective debt or passive apprentice wages are added. |
| T10 undertakings | Proposals, accepted work, paused contracts, returns and closing records are connected in the current Journal and calendar. Original systems continue to own their actions and rewards. |
| T11 / F10 consequences | **Because of earlier events** is a bounded read-only view of captured current-life accounts. Reading never repeats effects, payment, forgiveness or legal changes. |
| T12 local life | Existing distinct weather, faith, customs, government, service locations and provider handovers are preserved. The local standing/legal explanation stays separate from professional and faction standing. |
| T13 / F08 travel | Familiar continuation is available only over personally traversed route knowledge. It uses the existing road/atlas resolvers for up to six attended days, preserves intermediate progress and stops for decisions, arrival, birthdays, changed health or slower pace. Ordinary short continuation remains available. |
| T14 combat | Named targets, support/opponent groups, existing role profiles, intent and canonical previews improve decision clarity without inventing numerical certainty or changing earned combat balance. |
| T15 / F07 expeditions | **New ordinary radiant/contract** sites have deterministic 5×5, 7×7 or 11×11 layouts. Explicit generation metadata is validated against the seed. Earlier v1 maps and authored/signature v2 maps retain exact topology. Route advice, map coordinates, reminders, receipts and inheritance respect those boundaries. |
| T16 health | Recovery plans and self-care are visible again; severity, care dates and physical/emotional distinctions are retained. The calendar exposes actual support windows. Supernatural private knowledge is not broadcast by a read model. |
| T17 reputation | **How people know your work** separates actual professional reputation, local standing/reports and faction rank. It is not a global morality score. |
| T18 / F06 inheritance | Existing household-recipient masterworks provide named, dated provenance and an explicit successor acknowledgment of custody. Skills, personal contracts and rewards are not inherited. Earlier signed works are not retroactively fabricated. |
| T19 / F11 presentation | Book, Clear reading and Quiet reading presets configure existing reading options; reduced movement is explicit. Creator/menu/loading, audio and instant-letter behavior are preserved with the UI repairs above. |
| T20 performance | Discoveries/inbox/history views are bounded; the shell reuses one action read model during a render. Local timings are bounded diagnostics. Offline media moved to inert JSON, reducing executable module bytes from 331,981,373 to approximately 11.6 MB while retaining complete art/audio and recipe checks. This byte comparison is not a native browser latency benchmark. |
| T21 verification | Source, semantic handlers, current/legacy state, full stress cohort and every exact offline verifier remain required. Native device/browser geometry and screen-reader evidence are recorded separately. |
| F02 calendar | Recorded birthdays, accepted deadlines, personal-story availability and care windows appear under **Plans & calendar**. Availability dates are distinguished from promises; no invented appointments are added. |
| F04 ordinary occasions | Existing family memories, shared company, festivals and invitation scenes remain optional. Plans connects available household/company actions rather than manufacturing obligations or seasonal rewards. |
| F09 contextual help | Authoritative reasons remain beside disabled controls, with actual provider/place links and available free care. Specific reasons are not replaced with a generic instruction to find someone. |
| F12 authoring | The pure authoring validator checks scene/choice structure, captured numerical terms and explicit speech/school/person prerequisites. Regression checks cover the current chapter catalog, missing context, fallback content and a deterministic public-command childhood replay. |

These are usable first slices. More authored adult/family chapters, a larger seasonal-occasion catalog, richer independent-NPC stories, additional mentorship outcomes and new heirloom objects are content expansions, not claims that this release generated every future storyline mentioned in the reports.

## Rules for continuing development

1. Keep one simulation authority. UI read models do not advance clocks, grant rewards, accept work or establish acquaintances.
2. Capture the actual deed, participants, terms, dates and outcome at commitment/completion. Display those captured facts later. Resource URLs and prose labels are not identity keys.
3. Apply new authoring prospectively. Preserve old proposals, outcomes, mortality dates, maps and quoted schedules. An ambiguous historical gap remains a gap.
4. Preserve person-specific consent and repair boundaries through social gains, gifts, time, recruitment and succession. Parents, children, companions and staff keep independent wishes.
5. Keep infancy observational. A caregiver's choice is not a baby's decision. Do not deliver personal letters or new autonomous services before speech.
6. A routine follows public actions only, with explicit interruption boundaries. It must never auto-resolve a scene, pledge, disclosure, contract or combat.
7. Short/medium generation is prospective ordinary expedition content. Do not change the global legacy topology or authored manifests. Keep size metadata through reminders, routes, validation and inheritance.
8. Offline copies must retain inert media, the unchanged compiled module and boot guard. Verifiers supply the actual static media element, never substitute game code. Continue to verify every embedded byte and neighboring save.
9. Keep navigation preferences and unsubmitted drafts separate from game-save authority. Report persistence honestly, especially for Ironman and failed saves.
10. Do not certify physical layout, touch, screen readers, latency or balance from a semantic DOM or a source assertion.

## Verification record

Development checks exercised the actual source handlers and a complete unmodified compiled graph, including full-state routine parity, archived words/read receipts and independent neighboring slots. New cross-system cases cover all twelve faction closing methods, infancy receipts, school context, provenance, future-ID fallbacks, proposal consent, old five-chapter history, routine guards, family autonomy, generation sizes, loss review, reading presets and exit warnings.

The final complete release gate and deployment identifiers are recorded in the release-validation artifacts and Site source commit. This document does not turn a partial development run into a full PASS. Native browser/phone/zoom geometry and screen-reader checks are **NOT RUN** in this environment because the supported browser-control capability is unavailable; they remain separate from software checks.

Older v0.20–0.27 dungeon snapshots are authenticated against the immutable historical naming catalog as well as the current catalog. Import retains the entire original snapshot, including keeper and witness names; edited people, routes and rewards remain invalid.

The current Journal can record already-offered undertakings without requiring a nonexistent local service provider. Their execution still uses its original locality, costs and prerequisites. A participant’s authored return to coercion or a shared personal-story decision takes precedence over ordinary edition-30 small talk and retains its boundary/pressure choices. Birthday-interrupted craft work retains focus on the waiting scene.

## Immediate publication request

The user explicitly requested **“Publish it”** while the final full run was still in progress. The run stopped at a clean boundary with **845 passing cases across 62 of 254 test files, zero failures and zero skipped cases**, and the immutable-source check passed. The remaining files, stress cohort and final combined offline gate were not completed in that run; its overall software status is **NOT RUN**, not PASS. Earlier focused checks and offline diagnostic runs are separate evidence, not a substitute full-gate result. The exact stopped report is retained in `docs/release-v0590-validation.json`. Native browser geometry and screen-reader checks remain NOT RUN.
