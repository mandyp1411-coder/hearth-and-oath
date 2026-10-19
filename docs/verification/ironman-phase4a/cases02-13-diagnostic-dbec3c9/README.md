# Phase 4A declarations 2–13: separate localization probes

This is diagnostic localization, not a whole-file rerun or gate acceptance. The source/test remained frozen at dbec3c92649f2dd4a015b5f486a95196da34118b; exact test SHA d4a2211577d8ff21c005d1a916bace784116ae70d052748f833e3f923e8b8760.

Exactly the twelve original top-level declarations 2 through 13 were selected in source order. Each ran once in a separate fresh Node test process using an anchored escaped exact-name filter, 512 MiB / UV1 / concurrency 1 / TAP, maximum 30 seconds per probe within a single 180-second batch deadline. A five-second cleanup reservation was retained inside that deadline; every effective child cap was exactly 30 seconds. The batch stopped after the maximum twelve probes, with all twelve exact expected single-case verdicts present, all numeric exits 0, no signals, failures, skipped/cancelled/todo. Shared elapsed time was 43.764 seconds.

## Exact selected cases and actual durations

- Source declaration 2: resume reserves immediately, adopts only inside the held lock, and explicitly installs the virtual slot — PASS (diagnostic only), exit 0, 3.373 s / 30 s cap.
- Source declaration 3: accept reserves a detached candidate before lock entry and cannot adopt or run effects early — PASS (diagnostic only), exit 0, 3.679 s / 30 s cap.
- Source declaration 4: duplicate and newer gameplay controls cannot replace an already reserved candidate — PASS (diagnostic only), exit 0, 3.875 s / 30 s cap.
- Source declaration 5: real companion casualty effects and the exact floor are adopted once after durable confirmation — PASS (diagnostic only), exit 0, 3.931 s / 30 s cap.
- Source declaration 6: record quota failure freezes a real casualty and unchanged-source refresh cannot resurrect or discard it — PASS (diagnostic only), exit 0, 3.975 s / 30 s cap.
- Source declaration 7: unconfirmed successful casualty write reconciles the exact candidate once without engine replay or another write — PASS (diagnostic only), exit 0, 4.122 s / 30 s cap.
- Source declaration 8: a mismatched readback that still shows the old source cannot clear a physically stored casualty obligation — PASS (diagnostic only), exit 0, 3.721 s / 30 s cap.
- Source declaration 9: invalidation during a held casualty commit suppresses late adoption but retains the candidate for fresh reconciliation — PASS (diagnostic only), exit 0, 3.471 s / 30 s cap.
- Source declaration 10: a changed external context prevents late adoption and prevents retry from reinstalling the prior run — PASS (diagnostic only), exit 0, 3.421 s / 30 s cap.
- Source declaration 11: source bytes changed in place during a held commit cannot be overwritten by a late candidate adoption — PASS (diagnostic only), exit 0, 3.471 s / 30 s cap.
- Source declaration 12: a newer authoritative head blocks the old candidate without relabeling its token or adopting the newer head — PASS (diagnostic only), exit 0, 3.723 s / 30 s cap.
- Source declaration 13: missing live authority freezes the binding instead of recreating a run from an in-memory source — PASS (diagnostic only), exit 0, 2.921 s / 30 s cap.

Each individual probe filters the other 72 cases. Across this batch, the other 61 declarations receive no result; declaration 1 belongs only to its separate earlier diagnostic, and declarations 14–73 remain NOT RUN. No filtered case is credited as a passing case or a reporter skip.

The original full-file SIGKILL remains failed/incomplete, with no individual verdicts and undetermined cause. These separate fresh-process successes do not establish that the full file, cumulative lifetime/retention, or any later case is safe. No further probe or whole-file retry was performed.

## Process observations and provenance

The same Python launcher observed only its timeout/Node descendant tree from its own /proc namespace at one-second intervals and authoritatively awaited each timeout command. Raw observations preserve PID, PPID, start identity, command, CPU ticks converted to seconds, sampled RSS and reported process VmHWM. Maximum sampled individual VmRSS was 286,800 KiB; maximum observed individual VmHWM was 309,660 KiB. These are per-process samples/HWM, not guaranteed combined-memory peak, proof of OOM cause, or exhaustive orphan-absence proof. /usr/bin/time was not installed or used.

Full source/runtime/verification identities matched before/after. Only pre-existing evidence docs were untracked. Both earlier stopped and first-case evidence indices and the full failed raw log were rehashed unchanged. Authoritative batch session 88357 is terminal exit 0. No source/test/helper edit, heap/cap expansion, build, browser/native save, deployment or mode/UI acceptance occurred.

The archive contains 54 exact source/list/command, raw TAP, numeric exit, per-case receipt, one-second observation and closed identity/progress files. Every member was round-tripped and checked against original bytes; checkpoint.json lists member hashes, and SHA256SUMS covers the archive/checkpoint/README without a self-hash cycle. This is unpublished partial Ironman evidence and MUST NOT be deployed.
