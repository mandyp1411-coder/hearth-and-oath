# Phase 4A declarations 14–37: separate localization probes

This is diagnostic localization, not a whole-file rerun or gate acceptance. The source/test remained frozen at dbec3c92649f2dd4a015b5f486a95196da34118b; exact test SHA d4a2211577d8ff21c005d1a916bace784116ae70d052748f833e3f923e8b8760.

Exactly the twenty-four original top-level declarations 14 through 37 were selected in source order. Each ran once in a separate fresh Node test process using an anchored escaped exact-name filter, 512 MiB / UV1 / concurrency 1 / TAP, maximum 30 seconds per probe within a single 300-second batch deadline. A five-second cleanup reservation was retained inside that deadline; every effective child cap was exactly 30 seconds. The batch stopped after the maximum twenty-four probes, with all exact expected single-case verdicts present, all numeric exits 0, no signals, failures, skipped/cancelled/todo. Shared elapsed time was 83.065 seconds.

## Exact selected cases and actual durations

- Source declaration 14: missing authority cannot cancel an unresolved companion death or make the previous living source ready — PASS (diagnostic only), exit 0, 3.373 s / 30 s cap.
- Source declaration 15: a simulated actual storage clear never recreates a run or cancels an unresolved companion casualty — PASS (diagnostic only), exit 0, 4.573 s / 30 s cap.
- Source declaration 16: hero death writes a tiny marker first, ends without adopting the terminal, and leaves unrelated bytes exact — PASS (diagnostic only), exit 0, 3.221 s / 30 s cap.
- Source declaration 17: terminal priority preserves already applied companion casualties through marker-first end without duplicate effects — PASS (diagnostic only), exit 0, 3.422 s / 30 s cap.
- Source declaration 18: failed marker persistence retains a fatal obligation across unchanged-head and clear notifications — PASS (diagnostic only), exit 0, 4.258 s / 30 s cap.
- Source declaration 19: an unconfirmed marker is not an ended outcome until a fresh actual-store retry verifies it — PASS (diagnostic only), exit 0, 3.370 s / 30 s cap.
- Source declaration 20: a missing marker-free head cannot falsely complete a pending fatal obligation — PASS (diagnostic only), exit 0, 3.370 s / 30 s cap.
- Source declaration 21: confirmed terminal cleanup failure drops playable authority and retries only the exact marker-owned run — PASS (diagnostic only), exit 0, 5.176 s / 30 s cap.
- Source declaration 22: cleanup-only retry with a missing marker cannot resurrect authority or report a successful run end — PASS (diagnostic only), exit 0, 3.476 s / 30 s cap.
- Source declaration 23: late fatal completion after invalidation may not adopt a terminal or run stale UI effects — PASS (diagnostic only), exit 0, 5.523 s / 30 s cap.
- Source declaration 24: an idle matching marker notification stops a ready run after fresh verification and never exports it — PASS (diagnostic only), exit 0, 3.421 s / 30 s cap.
- Source declaration 25: first-save quota uncertainty retains the fixed opening and exact original review without a Standard fallback — PASS (diagnostic only), exit 0, 2.921 s / 30 s cap.
- Source declaration 26: first-save successful but unconfirmed write is adopted exactly once from fresh authority without creating a second run — PASS (diagnostic only), exit 0, 2.117 s / 30 s cap.
- Source declaration 27: an occupied first-save target cannot be overwritten by retry or a refreshed/relabelled empty-slot review — PASS (diagnostic only), exit 0, 2.823 s / 30 s cap.
- Source declaration 28: reviewed unknown import adopts actual companion-death authority, never a revived or normalized copy — PASS (diagnostic only), exit 0, 2.977 s / 30 s cap.
- Source declaration 29: known-run import cannot overwrite a later authoritative casualty with an older living JSON — PASS (diagnostic only), exit 0, 3.038 s / 30 s cap.
- Source declaration 30: idle invalidation may restore only the same unchanged binding, without duplicating adoption effects — PASS (diagnostic only), exit 0, 2.874 s / 30 s cap.
- Source declaration 31: idle refresh never silently adopts a different durable head after an external update — PASS (diagnostic only), exit 0, 3.420 s / 30 s cap.
- Source declaration 32: protect refuses a blocked or pending mortality obligation without exposing its old living source — PASS (diagnostic only), exit 0, 3.571 s / 30 s cap.
- Source declaration 33: protect refuses a newer head instead of handing it to a stale current view — PASS (diagnostic only), exit 0, 3.420 s / 30 s cap.
- Source declaration 34: protect exposes only a freshly locked detached current position and returns the consumer value without store authority — PASS (diagnostic only), exit 0, 3.005 s / 30 s cap.
- Source declaration 35: invalidation after a successful locked protect callback stays blocked after its promise settles until fresh refresh — PASS (diagnostic only), exit 0, 3.275 s / 30 s cap.
- Source declaration 36: an asynchronous protected consumer is refused rather than outliving the exclusive read — PASS (diagnostic only), exit 0, 3.123 s / 30 s cap.
- Source declaration 37: invalidation while protect awaits the lock prevents its stale consumer and cannot manufacture a ready view — PASS (diagnostic only), exit 0, 3.173 s / 30 s cap.

Each individual probe filters the other 72 cases. Across this batch, declarations 1–13 and 38–73 receive no result; earlier diagnostics remain separately recorded. No filtered case is credited as a passing case or a reporter skip.

The original full-file SIGKILL remains failed/incomplete, with no individual verdicts and undetermined cause. Separate fresh-process successes for the authorized earlier declarations do not establish full-file safety or prove later cases. No further probe or whole-file retry was performed.

## Process observations and provenance

The same Python launcher observed only its timeout/Node descendant tree from its own /proc namespace at one-second intervals and authoritatively awaited each timeout command. Raw observations preserve PID, PPID, start identity, command, CPU times, sampled RSS and reported process VmHWM. Maximum sampled individual VmRSS was 298,096 KiB; maximum observed individual VmHWM was 300,772 KiB. These are per-process samples/HWM, not guaranteed combined-memory peak, proof of OOM cause, or exhaustive orphan-absence proof. /usr/bin/time was not installed or used.

Full source/runtime/verification identities matched before/after. Only pre-existing evidence docs were untracked. Every prior evidence index and the original full failed raw log were rehashed unchanged. Authoritative batch session 78828 is terminal exit 0. No source/test/helper edit, heap/cap expansion, build, browser/native save, deployment or mode/UI acceptance occurred.

The archive contains 102 exact source/list/command, raw TAP, numeric exit, per-case receipt, one-second observation and closed identity/progress files. Every member was round-tripped and checked against original bytes; checkpoint.json lists member hashes, and SHA256SUMS covers the archive/checkpoint/README without a self-hash cycle. This is unpublished partial Ironman evidence and MUST NOT be deployed.
