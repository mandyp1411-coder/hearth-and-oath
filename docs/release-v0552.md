# v0.55.2 — Clear civilian work choices

Status: all 84 scoped source tests passed. The corrected clean build and all eight compiled scenarios passed after the first checker selector failure recorded below. Published as native version85. Later native checks passed the archive flow but found deferred-customer reentry unreachable; the work flow is not a native end-to-end pass. This is not a formal whole-game quality pass.

## Why this increment

The fresh UI-created Izren scholar route on v0.55.1 exposed two concrete usability faults. An empty archivist invited learning without an available record task. A customer follow-up hid its reservation requirements and enabled an unaffordable teaching choice; the player received a generic refusal. The player recovered by deferring the request. No save of the failed pending event was captured, so the later export is evidence of the post-deferral state, not a reproduction of that exact click.

## Changes

- Empty archivists truthfully describe currently available records and local teacher presence. Their existing Activities link is accurately described: teacher shortcuts only for children or enrolled students, work-steward access for unenrolled adults. Talk and Leave remain available. No remote enrollment, free travel, invented books or reward.
- Existing customer repair/teaching choices share the producer's exact reservation specification and admission reason with UI and engine. Missing gold/materials, a dead or mismatched customer, another commitment or wrong settlement are explained before the pending event is cleared.
- New bound customer scenes retain the actual named customer and authored terms instead of being replaced by generic work-event prose. Existing captured generic scenes retain their literal saved body, labels and IDs, with read-only current context and terms beside the choices.
- Repair remains 6 gold and 3 working days; teaching remains 12 gold and 4 working days, with the existing profession-specific materials. No free supplies, weakened project checks or changes to general failed-handler rollback.

## Scope and limits

This is a repair of existing civilian systems, not a new career framework or completion of the expansion roadmap. The Winter Levy aftermath module is unchanged. Original settlement-ID admission is retained; this increment does not establish a new offsite/current-position gate. The stale School & Learning Records destination, adult-unenrolled teacher discovery, broader Journal placeholder prose, mediation-route uncertainty and full-game quality work remain separate open issues.

Fixtures distinguish original fictional native QA exports, newly earned producer requests and controlled old-format compatibility cases. No actual pending failure was recovered or invented. Automated semantic DOM checks cannot establish real geometry, assistive-technology quality or physical iOS behavior.

## Scoped validation

Seven bounded whole-file source checks passed on clean source `2d3d87b45cc6bb3f41eb75921f433f5ddf26bd59`: empty archivist UI (7), society customer terms (12), society (13), careers (18), action-cost clarity (14), research-choice quotes (12) and allegation-choice clarity (8). Total: **84 PASS**, zero failures, skips or cancellations. They ran serially at heap512MiB, UV1 and concurrency1, within their individual caps. The source tests were **not rerun** after the checker-only correction; the exact runtime and entire tests/helpers/fixtures tree remained byte-identical, as recorded below.

The source coverage includes actual earned commissions, real material purchases and reservation/completion actions, unchanged old generic pending text, shared refusal reasons, exact UI handlers and current actual Standard-store reads/writes. Controlled pure admission and old-format compatibility fixtures are explicitly labeled; no exact failed native pending is claimed. Semantic DOM tests are not real browser or native-storage certification.

## First scoped execution — 2d3d87b

Seven whole source files passed: 84/84 tests, no failures, skips or cancellations. Build passed in 56.551 seconds under its 300-second cap. The compiled checker failed normally after 19.420 seconds: its new archive scenario selected both the meeting header Back and interaction Leave controls, violating its own uniqueness assertion. Six retained scenarios completed; the new customer scenario was NOT RUN. This is preserved as a failed checker run, not a compiled pass.

The correction changes only the checker selector: it owns the archive interaction-options region, asserts the Leave label and retains the unique enabled connected-control guard. Production and source-test bytes are unchanged. That failure required a new durable checkpoint, matching clean build and complete compiled rerun; the completed result follows. Original raw failed receipt remains in `artifacts/civilian-build-2d3d87b/scoped-release-evidence.json` (SHA256 `96fa0e6cb68ef53a9bdf3a57842b139c882e3305ab1d28cd75d73e717b19b465`). It remains a failed run, not erased or credited as a pass.

## Corrected build and complete compiled result — 82fddf2

The clean corrected producer was `82fddf299c91039e0c14548c4c839ecabdbb2d74`.
Its build passed with normal exit0 in **53.377 seconds**. The complete corrected
checker then passed with normal exit0 in **26.903 seconds**, **eight sequential
VM sessions**, zero network attempts and at most one live context. Both had
300-second caps, heap1536MiB and UV1; the checker used explicit GC. All owned
sessions closed normally. Artifact/runtime/verification identity remained
unchanged throughout the checker.

The six retained aftermath cases ran alongside an actual fresh fictional QA
Archive navigation case and the funded old-generic customer live-quote/real
reservation case. The Archive visit asserts exact source `visitService` parity,
then treats its post-visit state as the read-only navigation baseline; legitimate
meeting/notice updates are not mistaken for a time or resource cost. The customer
case includes a separately labeled missing-wood clone for actual compiled-engine
refusal, without changing the played UI or durable slots. Actual connected UI
commands, full authoritative slot/mirror parity and unchanged neighboring complete
rows/backups remain asserted.

### Exact source-test carry proof

The 84 source passes belong to `2d3d87b45cc6bb3f41eb75921f433f5ddf26bd59`, not a
new execution on the corrected producer. Both checkpoints have runtime SHA256
`0317de61cf6158ca5a444202054f4e2e3e762f2817e85780580a005553f59674` (622 files)
and the identical entire tests/helpers/fixtures Git tree
`1bb8a026935ad6ce997b9a485e361221022c5e0f`. Only the checker selector,
documentation and generated artifact files changed between them. The final
verification-input aggregate, which includes the corrected checker, is
`fc880f17584a9c397c5d4d28e5911fe8dc3baf96115fbafcc6162f9401a69310` (401 files).
The authored Winter Levy aftermath module remains SHA256
`e6dc3885caa7ef4d7885e714fb70b5381a85c154588aebc135454355d21d33db`.

### Exact artifact and evidence

- Standalone: 133,099,371 bytes, 16 parts, SHA256 `2aeec3b73771af65a7a7888d9731bd324bf7088c42e139ee74cead3e30e9b2fd`.
- Manifest: `6650950e8d15cd8c22a58cead15a812521888f5985f7dd4ec5021c92e1b959b2`.
- Loader: `3a04d1cd7f7091eb36bd78c28afc99a2b24ccbac777be88b0668db25c75d19c5`.
- Corrected executed checker: `28bc4717e47f92725d1559013af2503b31c9fb374ea5371693de1b6c2df3e06b`.
- Source report: `artifacts/civilian-source-2d3d87b/source-scope-report.json`, SHA256 `3bdd0d8a4cd2b2f48687bc28d2eb7646de201573ebd2b6a28fa8b9724e7d6b94`.
- Carry proof: `artifacts/civilian-build-82fddf2/prebuild-inputs.json`, SHA256 `927fdf2fd1f7c92950088f2cfda57c8d1d0bab6401a5a97466e83f7223e763d4`.
- Corrected combined report: `artifacts/civilian-build-82fddf2/scoped-release-evidence.json`, SHA256 `8319eb5c67efd5509725bb91bece372c7fbcf9a6c84eb12b902b990a05592011`.

At the automated checkpoint, native v0.55.2 browser/layout/storage follow-up,
assistive technology, physical iOS, formal software/global quality item11 and
publication were **NOT RUN**. Later publication/native observations follow below;
assistive technology, physical iOS and global certification remain unverified. Earlier baseline failures remain unresolved historical debt,
not rerun, waived or credited here. The separate v0.55.1 native civilian route
does not certify this new repair's native behavior.


## Later publication and native follow-up

Published as native version85 on 2026-10-18 at09:14:08 UTC, source34f39dc120ad1cda6c84f3032987b1dab63e2873, deployment appgdep_6ad48dd0bca481919aa9c5cc487b1343, preserving the existing public audience. Native follow-up confirmed the empty-archive guidance and unchanged day/gold/materials/education. The customer workflow remains incomplete: its existing deferred Return to the plan action is absent from current visible person/workplace navigation. No hidden route was used. See verification/v0552/native-follow-up.md for the later scoped observations; closed automated receipts remain unchanged.
