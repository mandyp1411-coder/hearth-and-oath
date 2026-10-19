# Personal interests and the inn performance

Version 0.40.0 restores access to existing play, rather than introducing a second bard career or booking system.

- Social & Fun → Time for Yourself exposes the existing interest chooser and practice. All six interests retain their own selection and progress.
- The named local innkeeper offers the existing performance for adult characters whose current interest is music, storytelling or sketching. It is an activity, not a relationship conversation. The action now requires the inn's actual room and an available provider.
- Newly opened performance and music-practice scenes retain their authored situation and choices instead of generic afternoon filler. An absent acquaintance is not invented by name; the fallback performer audience is an anonymous listener.
- Social & Fun includes the existing in-progress panel, allowing calendar-interrupted afternoons to resume or be set aside.

No new persistent state, quest, fee, booking, memory or reward system was added. Performance remains two days, twice per character year, with the existing persuasion, happiness and stress effects. Practice remains three days, three times per year, with unchanged level progression. Passive tavern music and relationship Talk remain separate.

Existing pending event bodies and choices are preserved on load. No old accepted snapshot is reconstructed from current content. The existing project, annual use and event IDs remain unchanged.

Verification: production-handler navigation covers selecting music from null interest, walking to a named innkeeper, opening a performance, reloading the pending event and completing it. Birthday coverage verifies one attended day before interruption, saved remaining time, visible continuation under Social & Fun, and one remaining day on completion. Additional checks and publication results are recorded with the release.

Verification limits: semantic DOM and simulation tests, not visual browser, touch-device or screen-reader QA. Historical aggregate failures are not represented as passing coverage.

Independent review: all nine focused checks passed, including the three choice branches' exact existing two-day, zero-fee, +1 persuasion, capped +5 happiness and capped −1 stress effects; adult/current-interest and provider/location gates; empty wallet; two-per-year and stale-click safety; anonymous versus known audience; both authored scene variants; unchanged old pending snapshots; and artwork-compatible inn dialogue separate from Talk. All six save/persistence checks passed. The two production-handler and birthday tests also passed.

The full 117-file legacy aggregate was started and stopped before useful results; it is not counted as completed coverage. Bounded shared regressions and the standalone embedded verification are the release gates.

The existing pastimes and school-shortcut suite passed all 24 checks. The rebuilt 132,130,928-byte standalone HTML passed the full existing embedded runtime/art/interface verification plus the restored performance loop, with zero network requests. Its digest and detailed coverage are in verification-v0.40.0.json.

Final shared gate: 33/33 passed across world-first service/UI, recent yard-conversation continuity and the two new performance handler/calendar checks. Total selected coverage is 72 passing checks across the nine independent review cases, six persistence cases, 24 pastimes/school cases and this 33-case gate (the handler pair is counted only once). No selected failures were encountered.
