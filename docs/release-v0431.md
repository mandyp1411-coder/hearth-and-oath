# v0.43.1 verification

This bounded patch implements audit-roadmap items 1 and 2 only: cross-tab save protection and the Second Wind self-refund correction. It does not claim the other 35 items are implemented.

## Source and scope

- Save source: 4731beb (independently reviewed before integration).
- Balance source: 40e4f2b and validation amendment 99e667b, integrated here as 05e6ceb and 0faf7dd.
- No account, cloud-save, audience, security-setting, purchase, or unrelated gameplay change.
- Same-slot conflict resolution never auto-overwrites a competing saved life. Unsaved choices remain exportable until an explicit reload. Browsers without usable Web Locks display one-tab guidance; older already-open builds must be reloaded after updates. See [save guarantees and limits](cross-tab-save-protection.md).
- Second Wind spends 5 MP on self-use without refunding it. Healing, ward, fear removal, ally MP transfer, Defend and basic Rallying Verse are preserved. MP-neutral mutual ally support remains documented rather than silently removed. See [bounded balance evidence](balance/second-wind.md).

## Final checks

Combined source command: 185 passed, 0 failed, 302.0 seconds.

```sh
node --test tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/saves.test.js tests/save-deletion-v40.test.js tests/reliability.test.js tests/second-wind-balance.test.js tests/combat.test.js tests/combat-focus.test.js tests/roadmap-v27.test.js tests/conversation-followups-v43.test.js tests/interface-consistency-v40.test.js
```

The final save-specific selection passed 49/49 separately. The balance worker's final focused selection passed 21/21 and its reproducible paired experiment recorded 288 cases. These overlap the combined result and must not be added together as a unique test count.

The ordinary build was killed under concurrent memory pressure, and 768/1152 MB heap caps exhausted V8's heap. After source tests had exited, the serial build succeeded with:

```sh
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-saves-v431.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-followups-v43.mjs
```

Both embedded verifiers passed, one at a time, with networking forbidden. The new verifier exercised the actually packaged save/conflict/export/reload/backup behavior and Second Wind cost. The previous-release verifier retained exact played conversation recognition, contextual replies, stale-click rejection, unchanged resources and the neighboring slot.

Standalone artifact: 132,199,686 bytes in 16 exact-parity parts. SHA-256: b79c2a9420457eb449c5c53bed22016ce10db38c0fac80fe48f7c040ab188681.

## Verification boundaries

No full legacy aggregate pass is claimed. The historical entry-flow test fails identically at line 41 on the unchanged v0.43.0 baseline because its creator-origin controls are obsolete. The balance record separately documents nine older RPG setup failures, without claiming a complete baseline replay.

The semantic handlers and deterministic held-lock tests do not prove CSS geometry, physical touch or real browser cross-process scheduling. Isolated Chromium launch was blocked; the connected cloud browser has no advertised isolated-profile/context capability and could not reach the local QA origin. No existing user or QA save was imported over, deleted or replaced to bypass that limit. Real-browser conflict layout and physical-device behavior remain unverified by this record.
