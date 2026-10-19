# Offline cost and stolen-gear handler gate

This source-only verifier is intended for the final v0.45 source and freshly rebuilt standalone. It changes no gameplay, save, public audience, release version or hosted site. It includes the property-theft shared-cost correction from `cb72e4e`; an older offline artifact is not evidence for the final source.

After the designated release/test lane builds the matching artifact, run exactly:

```sh
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-cost-gear-v45.mjs
```

The script checks the actual artifact's byte length, every ordered part's exact bytes and SHA-256 equality, then executes its exact embedded module graph in one `fakeSurface` VM. Fetch is forbidden. Expected states come from the current source engine and three controlled synthetic save copies, never imported or modified real saves. It compares complete current and independent-slot save states after meaningful handler actions and read-only navigation.

Bounded coverage:

- Activities, current Crime property thefts, the innkeeper and craft review show direct fees/time and the authoritative new household accrual separately, with earlier outstanding costs disclosed separately. Browsing is read-only; an inn stay separates its actual provider fee from settled living costs.
- An exact-direct-fee craft fixture remains affordable despite earlier accrued costs. The actual craft confirmation reaches a birthday interruption after only attended days. Life → Your Years → Return reaches current Today for free, then actual continuation consumes neither prepaid fee nor materials again. Detached confirmations/continuation cannot repeat the commitment.
- The embedded Crime handlers earn an ordinary stolen longsword with its actual instance, catalog bonuses, original merchant, stock season/value and property identity. Inventory renders that one piece, preserves ownership through equip/unequip, and blocks equipped sale. Ordinary barter refuses staging, including a forged-enabled activation; the source ordinary bulk basket excludes it.
- A separate synthetic slot successfully returns a source-handler-earned piece to its current original owner without payment or evidence erasure. Repeated return/sale cannot duplicate it. The actual embedded theft slot sells once to the current local fence for the original-value price, without ordinary merchant restocking, a second payout, or post-sale return stock duplication.

Limitations: semantic DOM/production-handler verification only. No real-browser geometry, CSS visibility, phone/touch, screen-reader, media loading, hosted publication or real-save claims. This is not the exhaustive stolen-gear migration, capacity, custody, evidence, alternate-region/contraband, insufficient-fee, or legacy Return test matrix. It supplements those source tests. A successful run prints its release, exact hash and named coverage; a source-only commit or syntax check is not a passed run.

Preparation validation: JavaScript syntax and diff checks only. The verifier, tests, build and browser were deliberately not executed while another lane owned the heavy test/build process. Record execution results against the eventual rebuilt source/artifact, not against this preparation note.
