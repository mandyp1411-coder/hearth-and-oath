# Unpublished Ironman phase 2: stopped attempt 4fcc262

This preserves the first phase-2 failure exactly. It is not acceptance of the phase, the complete mode or any release.

- Tested clean checkpoint: `4fcc262f308e7e43f19803cbf6f5d56b2136eb9e`.
- First whole file, `tests/ironman-engine.test.js`: **22 PASS / 2 FAIL**, zero skips/cancellations, numeric exit **1**, 25.932 s within the 180 s cap. Policy: 512 MiB / UV1 / test concurrency 1 / TAP.
- Failed cases: actual retreat settlement and actual victory settlement preserving exact casualty/grief. Both failed at line 183.
- The captured diff shows one typed `person_died` Journal row receiving current title/text and `narrativeEdition: 30` during settlement. The remaining displayed roster, exact person, RPG stage, casualty and grief fields match. This receipt does not grant credit for any assertion after the failure point.
- The gate stopped before the remaining **11 whole files**. The lineage baseline comparison and direct Standard comparison are **NOT RUN**, not omitted passes.
- Candidate HEAD, runtime and verification identities matched the preflight after the test process returned normally. No retry or cap expansion occurred.

`failed-source-receipts.tar.gz` contains the exact raw TAP, numeric exit, timing/cap/file identity receipt, full input manifest and stopped report. Every member was read back and compared with its original bytes. `checkpoint.json` contains all member byte lengths and SHA-256 hashes. `SHA256SUMS` hashes these files except itself to avoid a cycle.

Production/test repair and any new run require a fresh reviewed checkpoint. The original failure remains FAIL even if a later run passes. No production/tests were edited to create this evidence. A later documentation commit is not retroactively the tested source commit.

Storage/session/creator/UI exposure, offline build, compiled checks, native save/browser/AT, formal global software certification and publication are not accepted or performed here. All archives are unpublished partial Ironman evidence and must never be deployed. Fictional gameplay only; no real personal save, credentials or configuration is included.
