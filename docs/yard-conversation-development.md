# Gateyard shared history · v0.39.0

Ordinary Talk now recognizes the instructor and opponent from the completed first Gateyard practice bout. Each has a separate one-time conversation, using the saved result, score, actual exchanges and completion day. An instructor discusses learning; an opponent speaks from their side of the same result. Six existing voice profiles vary the tone, and known motive categories inform replies without inventing extra biography.

Only resolved, paid practice participation qualifies. The same saved participant must be alive/available and physically present at the bout's settlement and room. Hostile contacts retain their ordinary boundary dialogue. Unrelated people, letters, unfinished invitations and unfinished bouts never receive this scene. The existing Training → Talk Over Your First Bout action remains unchanged.

## Save and cancellation semantics

Opening Talk captures the whole scene without consuming it. Navigation away and reload preserve that pending text and its exact choices. Any actual reply, including explicitly leaving the subject, consumes only that participant's acknowledgement. A permanent participant marker is kept in the existing tournament record, rather than the bounded conversation-history list. Subsequent Talk uses normal topics. Old saves require no speculative history conversion: resolved eligible bouts can be discussed, while already-pending ordinary scenes remain untouched.

If the participant ceases to be present/available before a reply, the stale reply is cleared without speaking for them and without consuming the marker. Discussion can be offered if they become eligible again. No new fee, time, reward, bond, personality, skill, class or quest change accompanies these replies. The save validator rejects effects in the captured scene. Journal text is written literally so participant names and actual exchanges survive narrative wrappers.

## Verification

Targeted engine/save/handler and independent review results are recorded with this release. These are semantic integration checks, not visual browser QA. No claim is made that the historical full regression suite is clean; prior unrelated baseline failures remain outside this bounded change.

Release checks: all 10 new continuity tests passed (nine engine/save cases and one actual UI-handler navigation/reply case); all 12 existing tournament checks passed. The six-file selected regression run had 83 passing checks and 10 failures in the older people-focus suite. Additional final hostility/UI checks passed separately. The historical failures were investigated against the unchanged prior source rather than treated as a clean full-suite result. Build and complete existing embedded offline verification passed for v0.39.0 with zero network requests; see `verification-v0.39.0.json` for artifact size, digest and coverage.

Independent read-only review additionally exercised a known existing rival, dead/expired/unavailable participants, injected snapshot effects, a valid 1–1 draw, one-exchange withdrawal and literal names that overlap old companion placeholders. All reported defects were corrected before packaging.

Baseline parity confirmed: the same 10 people-focus failure names reproduce on untouched source commit `ce4fa3bca6f96c33bd8bbe680ed93915d49162e1` (20 checks: 10 pass, 10 fail). They are not regressions from this patch.
