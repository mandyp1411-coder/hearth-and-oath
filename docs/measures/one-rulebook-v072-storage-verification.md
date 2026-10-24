# v0.72 storage boundary: development verification

The first runtime slice on [draft PR #19](https://github.com/mandyp1411-coder/hearth-and-oath/pull/19)
separates retained decoding from optional incoming-write admission. Existing
callers still accept both rulebooks. No cutover or deployment is claimed.

| Check | Actual result |
| --- | --- |
| Selected save, Ironman, edition and cutover tests | 25 files; 448 passed, 0 failed, 0 skipped; actual Node exit 0 |
| Tracked source, HEAD and clean status | Identical before/after both runs |
| Strict content and acyclic standalone build | Passed; 15 content files, 50 items, zero errors/warnings |
| Size-checked host | 262,799,606 bytes; 1,054 files |
| Exact compiled standalone replay | One full-module session; 14 bounded semantic cases; actual Node exit 0 |
| Full FAST/SLOW, formal release gate, other 29 offline checkers | NOT RUN |
| Browser archive round trip and real farmer/heir verdict | NOT RUN |

The selected source run took 368.062 seconds. The
compiled replay took 15.551 seconds. Its fake DOM
supplies semantic controls; it measures no browser layout or real storage.
Configured admission policies are tested in source; the compiled app keeps
its current default policy. Engine.js is unchanged, so no engine benchmark
was required. Genuine v0.61 fixture provenance is in
[v0610-save-fixture.json](v0610-save-fixture.json).

Frozen local verification commit: `27c924424a7577c08c0741e57918d448ee6890dc`.
API equivalent: `11a21de2ab65f2bcfb8be80a83da706b36522cee`.
Their tree is `fcc8d1cf59d33f215a6d08258de17d57e9b6b585`. The build's actual clean local
source commit is `6b8cd46551d10989b70aa33b5ea3bf2f656b5398`; do not confuse
these Git identities. The machine record keeps exact runtime, verification,
artifact, raw-output and source-guard hashes and every selected command.

[Machine record](one-rulebook-v072-storage-verification.json) and
[closed raw proof](one-rulebook-v072-storage-proofs.tar.gz) retain the actual
logs, wrapper code and seals. The proof is 27231 bytes with SHA-256
`eb90958ff8ce93a8c5f1bcdc09df2c06053852c1908c7b5a86419c57c5e9f8fe`; two deterministic packagings matched and
every member was read back. The initial development failure is preserved:
native rejected Promises needed consumption while remaining refused by the
synchronous predicate. The corrected and frozen replays pass.

Both required human/browser gates remain open. The next cutover step is
simulation-entry handling and a durable old-save export/recovery boundary;
this write predicate alone does not replace either.
