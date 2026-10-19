# A conversation remembered

Version 0.43.0 adds a small, specific continuation to four ordinary NPC conversations: the craftsperson’s stubborn repair, the scholar’s missing explanation, the healer’s interrupted meal, and the watchkeeper’s wet boots. After you ask the original question and hear their answer, a later meeting can return to it. You can ask a more particular question, offer a different view, make a relevant joke, or leave the matter in their hands. Their response and your choice remain in the relationship history.

These are conversations, not disguised commissions. They do not repair an object, send someone to a cobbler, complete work, buy food, promise future help, or grant Gold, skills, items, free days, or combat advantages. Ordinary relationship changes and the existing one-exchange-per-day limit remain. The NPC’s existing personality affects the delivery, and an overly familiar joke keeps its normal cost.

## Continuity and old lives

- A compact receipt is created only by a completed original question. An unanswered scene, generic memory or history marker is not enough.
- Old lives can use the exact original opening, player question and NPC answer already in their own thread. Merely loading or inspecting a life does not backfill anything.
- The follow-up must occur after the original answer day, even if the original question waited several days for a reply.
- Every follow-up choice, including leaving, consumes that particular topic for that person. Completion survives ordinary message, memory and seen-history pruning.
- Identities use stable person IDs, so a service successor does not inherit their predecessor’s conversation.
- Saved waiting wording and choices are retained exactly. A person who is absent, unavailable or hostile cannot receive a friendly follow-up reply; cancellation adds no messages, rewards or completion.
- Existing age, location, personal-boundary and daily gates still apply. No combat, party, item, dungeon or household mechanics were retuned.

## Verification

The focused release gate passes 100 tests across the new conversation cases, shared world-first UI, Gateyard shared history, work/trade separation, material barter, crafting and home/household behavior. Coverage includes delayed answers, old pending scenes, reloads, stale duplicate replies, other occupied slots, malformed and contradictory receipts, partial prefix pruning, under-sixteen legacy sources, voice/bond parity and repeated read-only inspection.

The standalone build is regenerated with `npm run build`. `node scripts/verify-offline-followups-v43.mjs` checks the actual embedded selection and reply handlers with network requests forbidden. Semantic DOM tests do not measure browser geometry, touch behavior or screen-reader output. Live browser verification is recorded separately; this focused gate is not a claim that the repository’s entire legacy aggregate passes.
