# v0.72 connected entry boundary: development verification

This extends [draft PR #19](https://github.com/mandyp1411-coder/hearth-and-oath/pull/19)
with ordinary and Ironman entry fences. The app's policy remains unset;
both rulebooks still play. No cutover or deployment is claimed.

| Check | Actual result |
| --- | --- |
| Selected save, creation, Ironman, edition and entry tests | 31 files; 500 passed, 0 failed, 0 skipped; actual Node exit 0 |
| Tracked source, HEAD and clean status | Identical before/after both runs |
| Strict content and acyclic standalone build | Passed; 15 content files, 50 items, zero errors/warnings |
| Size-checked host | 262,811,625 bytes; 1,056 files |
| Exact compiled standalone replay | One full-module session; 14 bounded semantic cases; actual Node exit 0 |
| Full FAST/SLOW, formal release gate, other 29 offline checkers | NOT RUN |
| Browser archive round trip and real farmer/heir verdict | NOT RUN |

The selected source run took 442.799 seconds. The
compiled replay took 17.282 seconds. Configured
policies run against the actual ordinary coordinator/store and Ironman
session/store in source tests. Actual app handlers and the compiled replay
keep today's unset policy. Their fake DOM supplies semantic controls and
measures no browser layout or real IndexedDB handoff. The compiled checker
briefly overlapped the source replay; their source guards match. Engine.js is unchanged;
no engine benchmark was required.

Frozen local verification commit: `11613fa2d5e9ad4e55869d6734c11f920f8d258e`.
API equivalent: `375207e43ea674092533d4dbb720ba96b2644764`.
Their tree is `b78471afe20e3d2905ea8f563f86cf7dd963500f`. The build's actual clean local
source commit is `25597b47fb4832d9ffb286d2f7b5c2fc65ea061a`. Preserve these
distinct Git identities. The earlier [storage-only record](one-rulebook-v072-storage-verification.md)
remains evidence for its own snapshot; it is not added to this test total.

[Machine record](one-rulebook-v072-entry-verification.json) and
[closed raw proof](one-rulebook-v072-entry-proofs.tar.gz) retain commands,
wrappers, logs and source/artifact/output identities. Proof: 31427 bytes;
SHA-256 `061b14bddad858271baf4c0d16678b46cdfffae1c1bcf856e610d79c771a42ea`. Two deterministic packagings matched
and every member was read back.

A workspace disconnect interrupted dispatch during development. No aborted
operation is counted as a test. Retained edits were inspected on recovery,
then the recorded focused and frozen runs completed. Read-only review also
caught the title-screen conflict-reload refusal path leaving stale dialog
markup; its explicit-discard callback now renders retained slots on refusal.

The entry policy is not activated. Independent old-save decoding and safe
export/recovery UI remain unfinished; a refused Ironman life must be
exportable without adoption. Browser and real farmer/heir gates remain open.
