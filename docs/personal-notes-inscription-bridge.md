# Personal notes / generic inscription compatibility bridge

## Source finding

Published maze-v31.js manual maze_read pushed an unowned day/text row and then sliced the entire personal notebook to its last 100 rows. ID26 at 13c3947 extracted that producer unchanged into maze-inscription-note.js and reused it from scholar assistance. Its old six-variant pure regression explicitly expected Old note 0 to disappear. That contract is incompatible with editable notes, lazy index-derived legacy identities, and each life’s owned notebook capacity.

No old inscription-looking raw text is retrospectively classified as earned proof or assigned a different owner. Existing generation-based legacy ownership policy is unchanged. This bridge affects new deliberate reads only.

## Shared personal-copy contract

copyPersonalNote(state, text) is the single in-place storage path used by both appendPersonalNote and new automatic discovery copies. It returns transient data, never a save schema field:

- Success: { copied: true, reason: null, id, key }. The new editable copy has the same current-person ownership, stable local ID, owner/generation review key, original current day, and text/length rules as an ordinary new personal note.
- Failure: { copied: false, reason }, where reason is invalid_text, owner_unavailable, full, or legacy_limit.
- It only mutates personal-note storage after every preflight succeeds. It never sets an action notice, charges resources, clears a room, records a receipt, or writes earned Journal proof.
- A failed full/invalid/unowned copy leaves every existing property and row unchanged, including absent optional fields, raw legacy metadata, array order and outstanding review fingerprints. A full notebook is not sliced or rotated.
- Genuine ambiguous later-generation old rows retain their exact raw wording/day and existing unknown identity in the already-bounded legacy pool when a successful write needs that partition. Text matching an inscription never proves ownership or discovery.

recordGenericMazeInscription records the same exact current generic text through journalLiteral (or its established journal fallback), with narrativeEdition 30, independently of whether an editable personal copy fits. It then attempts the optional copy and returns { title, text, notebookCopy, notebookCopyNotice }, or false for an invalid/non-generic room. Only the existing callers decide attendance, room clearing, costs and receipts. The helper is not a new repeat-read permission and does not change those guards.

At a full current-life notebook the immutable discovery still succeeds. The outcome says the notebook is full, no existing note was replaced, and the discovery remains in Journal Archive. Editing, archiving or restoring an available personal copy cannot change that earned proof.

## Exact ID26 integration patch

The adjacent personal-notes-id26-caller.patch is a four-file unified patch against 13c3947, not a merge of the other branch:

1. companion-field-assists.js: propagate only the inscription helper’s notebookCopyNotice onto the transient returned q. Do not put it in q.receipt or change receiptKeys, quotes, resource arithmetic, room clearing or ledger validation.
2. companion-field-assists-ui.js: scholar descriptions promise the immutable Archive record, make the optional editable-copy limit explicit in the preview, and show the actual copy/fallback notice after use.
3. maze-v31.js: retain ID26’s existing ensureMazeVisit call and clear guard; append the returned copy notice to manual read outcome. Rename the manual offer to Read the Inscription and describe the bounded optional copy honestly.
4. companion-field-assists-pure.test.js: give its controlled note fixtures an explicit actual current owner; expect complete new-note metadata; replace the old eviction expectation with exact preservation of Old note 0 through Old note 99, exact six-line Journal proof and unchanged scholar Focus/day/receipt effects. The regression is retained, not deleted.

Both branches add maze-inscription-note.js. Resolve that add/add conflict explicitly by retaining this bridge version, which imports copyPersonalNote and never pushes/slices raw notes. Do not accept ID26’s older push/slice helper. The manual maze hunk on this older ID35 source does not contain the later publisher’s receipt/visit code; preserve the integrated publisher/ID26 context and apply only the small described behavior change. Do not blindly replace the whole maze runtime.

## Evidence and limits

- 19 native pure cases passed in approximately 0.18 seconds: the existing 12 note cases plus seven bridge cases, including every six-line inscription, full raw/owned notebook preservation, unchanged old review fingerprints, failed-copy purity and editing copies without rewriting discovery proof.
- An isolated .local/note-bridge-id26 projection pinned ID26’s pure dependencies to 13c3947, overrode only this note bridge and the proposed caller/test changes, and ran its existing pure suite: 64/64 passed in approximately 0.31 seconds. No engine module was imported. All six full-book scholar cases retained actual Focus spend/gain and one valid assistance receipt.
- The parent’s prior eight engine/actual-app passes at fbfc63d remain evidence for that earlier scope only. The new bridge and projected caller changes have not received an engine, actual-app, browser, build, standalone/offline or publication pass. Those remain publisher-lane work after conflict resolution.
