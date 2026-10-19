# Work and materials are separate

The Work Steward handles professions, shifts, practice and the existing commission system. “Any Commissions Available?” opens a free conversation before eligible offers appear. Asking does not accept work, spend days or Gold, or roll a different offer. When there is no available work, the steward says so. An accepted or finished commission remains visible on the main conversation and the commission branch, including its original continuation and delivery controls.

A separate named Materials Merchant appears in People Here at the Market. This resident owns the existing ore, cloth, wood, stone, hide and crystal purchase commands. The steward can point the player there using ordinary free local walking. Existing residents retain their stable IDs; no merchant, steward, customer or saved commission is replaced.

## Unchanged mechanics

- Every material purchase still gives three units and spends one real day.
- Bundle prices remain: ore 12, cloth 6, wood 6, stone 6, hide 15 and crystal 27 Gold.
- Existing age, Gold, pending-moment and actual-provider location gates still apply.
- Offer rotation, customer identity, materials, quality, deadlines, payout, failure and delivery rules are unchanged.
- Accepted agreements, inventory, old saves and legacy commitments keep their saved terms. The conversation branch is transient UI state, not another quest or commission system.

## Verification

- 15 focused engine/save/handler tests cover exact provider ownership, all six purchase economics, invalid/remote commands, insufficient Gold, the existing age gate, repeated free inquiries, untouched save slots while asking, explicit empty offers, acceptance without payment, stale duplicate acceptance, accepted and finished reloads, career-story interruption, and free navigation to the merchant.
- 40 existing world-first, market-person and interface-consistency tests passed.
- The standalone build and actual embedded work/trade verifier passed with network requests forbidden.
- `npm run build` regenerates the offline game. `node scripts/verify-offline-work-trade.mjs` exercises the actual embedded UI with network requests forbidden.

The semantic UI checks test handlers, saved state and controls, not browser geometry, touch behavior or screen-reader output. These checks do not replace production browser testing.
