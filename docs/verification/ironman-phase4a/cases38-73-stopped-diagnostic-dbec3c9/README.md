# Phase 4A declarations 38–73: diagnostic stopped at assertion 42

This is failed diagnostic localization, not a whole-file rerun or gate acceptance. Source dbec3c92649f2dd4a015b5f486a95196da34118b and test d4a2211577d8ff21c005d1a916bace784116ae70d052748f833e3f923e8b8760 remained unchanged.

The selected maximum was the 36 exact original declarations 38–73, in source order. Each authorized probe had an anchored escaped exact-name filter and its own fresh Node process, 512 MiB / UV1 / concurrency 1 / TAP, at most 30 seconds within one 420-second shared batch deadline. A five-second cleanup reservation remained inside that deadline. Every executed effective child cap was exactly 30 seconds. Execution stopped at the first ordinary assertion failure: **4 diagnostic PASS / 1 FAIL**, no signals, shared elapsed 12.446 seconds.

## Actual closed probes

- Declaration 38: invalidation cancels a queued load presentation without creating a gameplay obligation or a late adoption — PASS (diagnostic only), exit 0, 2.319 s / 30 s cap.
- Declaration 39: absent exclusive coordination blocks Ironman admission and never invokes an unsaved Standard fallback — PASS (diagnostic only), exit 0, 2.573 s / 30 s cap.
- Declaration 40: Standard lives remain outside the session and retain ordinary save semantics without independent Ironman writes — PASS (diagnostic only), exit 0, 2.370 s / 30 s cap.
- Declaration 41: invalid or Standard inputs cannot be downgraded into guarded Ironman admission — PASS (diagnostic only), exit 0, 2.223 s / 30 s cap.
- Declaration 42: reviewed session archive retains the exact casualty head/floor and detaches only matching playable copies — FAIL (ordinary assertion), exit 1, 2.928 s / 30 s cap.

Declaration 42 failed ERR_ASSERTION at tests/ironman-session.test.js:777:10: h.detachments was [] rather than [{runId: 00112233-4455-4677-8899-aabbccddeeff, deleted: false}]. The raw expected/actual/stack is retained without normalization. This observation does not establish whether the underlying archive persisted or identify its source cause. No test/assertion was edited or retried.

## Explicit NOT RUN remainder

- Declaration 43: reviewed session delete leaves only the actual store floor tombstone and never fabricates a combat end — NOT RUN after first failure.
- Declaration 44: lifecycle reservation while the actual lock is held cannot be replaced by a double archive/delete request — NOT RUN after first failure.
- Declaration 45: archive/delete require their actual explicit review and never accept an omitted reviewed flag — NOT RUN after first failure.
- Declaration 46: a quota-blocked lifecycle action retries only its original actual head token and confirms detach once — NOT RUN after first failure.
- Declaration 47: an uncertain successful archive stays blocked on its old token until a fresh same-run reviewed lifecycle request supersedes it — NOT RUN after first failure.
- Declaration 48: an unrelated reviewed archive preserves the current binding but keeps it blocked until a fresh unchanged idle refresh — NOT RUN after first failure.
- Declaration 49: reviewed reattachment requires a second actual locked inspection before adopting its authoritative slot and once-only effects — NOT RUN after first failure.
- Declaration 50: a competing actual-store head queued after reattach commit cannot be adopted by its fresh expected-token inspection — NOT RUN after first failure.
- Declaration 51: unconfirmed reattachment cannot relabel its old review and requires a fresh reviewed same-run lifecycle resolution — NOT RUN after first failure.
- Declaration 52: actual ended-marker authority outranks reviewed archive/delete requests and invokes only run-end cleanup — NOT RUN after first failure.
- Declaration 53: a marker confirmed after reattachment review prevents that reviewed operation from adopting a playable run — NOT RUN after first failure.
- Declaration 54: fresh reviewed lifecycle controls cannot supersede an unresolved real companion casualty — NOT RUN after first failure.
- Declaration 55: fresh reviewed lifecycle controls cannot supersede an unresolved terminal marker obligation — NOT RUN after first failure.
- Declaration 56: reviewed lifecycle controls cannot replace uncertain first-save create/import candidates — NOT RUN after first failure.
- Declaration 57: explicit reviewed changed-body and changed-token authority resolves stale actual companion and hero obligations without replaying their candidates — NOT RUN after first failure.
- Declaration 58: a new revision of the identical original source cannot escape actual companion or hero mortality obligations — NOT RUN after first failure.
- Declaration 59: reviewing the unchanged original token cannot discard a still-uncommitted actual casualty — NOT RUN after first failure.
- Declaration 60: explicit authority choice can adopt its exact already stored nonterminal candidate once without repeating casualty effects — NOT RUN after first failure.
- Declaration 61: authority choice refuses wrong-run and unreviewed controls without touching the pending casualty — NOT RUN after first failure.
- Declaration 62: actual ended-marker authority outranks a reviewed authority-choice token and never returns a playable head — NOT RUN after first failure.
- Declaration 63: missing or unreadable authority cannot let a reviewed choice discard an unresolved hero death — NOT RUN after first failure.
- Declaration 64: onAdopt invalidation resolves the durable casualty binding but cannot be overwritten into ready by adoption completion — NOT RUN after first failure.
- Declaration 65: afterAdopt invalidation runs that effect once but leaves the accepted casualty blocked until fresh idle verification — NOT RUN after first failure.
- Declaration 66: malformed reattach targets and failed context reads preserve each uncertain lifecycle obligation unchanged — NOT RUN after first failure.
- Declaration 67: an unbound archive/delete marker outcome with slot null can retry marker-owned cleanup without a fabricated slot — NOT RUN after first failure.
- Declaration 68: reviewed candidate recovery adopts the exact actual stored-orphan companion casualty in a new slot without changing its operation identity — NOT RUN after first failure.
- Declaration 69: reviewed first-save recovery preserves fixed create/import identity and adopts only the stored-orphan original candidate — NOT RUN after first failure.
- Declaration 70: uncertain candidate reattachment retains its original gameplay obligation and reconciles exact authority without another candidate write — NOT RUN after first failure.
- Declaration 71: wrong-run, unreviewed, malformed-target and unavailable-context recovery controls cannot replace a stored-orphan casualty obligation — NOT RUN after first failure.
- Declaration 72: recovery of a different/source head never relabels it as the reserved companion casualty — NOT RUN after first failure.
- Declaration 73: reviewed candidate recovery never supersedes a pending actual hero-terminal obligation — NOT RUN after first failure.

Every separate probe filters its other 72 cases. Earlier isolated declarations 1–37 results remain separately preserved; they are not fresh results from this batch. The original full-file SIGKILL remains failed/incomplete, and this ordinary assertion does not prove the kill cause. All 73 original cases remain required for any eventual whole-file acceptance.

## Identity, observations and durable evidence

Before/after source/runtime/verification identities matched exactly. All prior failed/probe evidence indices and the original failed log were rehashed unchanged. Only evidence docs were untracked. Same-launcher /proc observations were recorded every second: maximum sampled individual VmRSS 274,244 KiB; maximum observed individual VmHWM 274,244 KiB. These are per-process samples, not combined peak, OOM-cause or exhaustive orphan-absence proof. Every executed timeout command was awaited to terminal; original session 15503 closed exit 1.

The archive holds 26 exact list/command/identity, raw TAP/numeric exit/per-case receipt, process-observation and stopped-progress files. Every member was round-tripped and compared to original bytes; checkpoint.json lists hashes and SHA256SUMS covers the archive/checkpoint/README without a self-cycle. No further probe, source/test edit, cap/heap increase, build, browser/native save or deployment occurred. This is unpublished partial-mode evidence and MUST NOT be deployed.
