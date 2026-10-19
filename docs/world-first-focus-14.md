# Focus 14 continuation — world-first life and roleplay (v0.27.0)

## Working brief

Make Hearth & Oath an approachable fantasy life simulation in which the player learns about people, jobs, factions and places by meeting them. The interface should show the life being lived rather than expose every simulation subsystem as a management screen. Keep the muted yellow-gray palette, original portrait crop metadata, map-only popup and actual consequences of previous choices.

- Six primary destinations: Life, Activities, Explore, Relationships, Inventory and Journal.
- Activities contains personal things to do and existing unfinished work. New medical plans, career batches and remote service dashboards do not belong here.
- Services have named, illustrated people in real areas. A doctor works at the healing room; a work steward offers trades and commissions; an innkeeper offers rest; teachers, mentors, contract givers and faction representatives have their own meetings. A village work service uses an existing Market, never a nonexistent Work Yard. Wild mentors remain at their outdoor location.
- The engine and UI enforce the same service location. Walking inside a settlement is free and uses the real room graph. Approach is free; a service quotes the existing time, fee and eligibility before the action.
- Relationships is a record of people actually met, with Family, Lovers, Friends, Acquaintances, Rivals, Enemies and Everyone Met. A strong friendship alone never implies romance. Portraits cannot overlap a name.
- Journal contains only Active Quests, Archive and Notes. Quests must actually be accepted. New work is discovered in the world. Notes includes discoveries and player-written reminders; opening it does not grant lore.
- Inventory accepts equipment dragging into the matching actual slot, alongside click/keyboard Equip. Supplies are consumable, not equipment. A healing potion consumes one real potion and restores up to 30 Health; illness remains a doctor/care concern.
- Ordinary actions and filters preserve scroll position. New scenes receive accessible focus without pulling the whole interface to the page top.
- Creation uses a centered portrait with a quiet fitted border, preserving assigned atlas crop coordinates and grayscale treatment.

## Narrative edition 30

Retire the former dialogue delivery and cryptic stock framing. New scenes use the person's name and a concrete situation, a short readable opening and choices whose consequences match their actual effects. Random selection stays deterministic for a particular situation, and pending replies retain their displayed snapshot on reload. Conversations do not issue fake contracts or reward skills merely for opening them.

Story, childhood and annual scene adapters run before their snapshots are used. Existing personal-story deeds and terms are captured before prose is replaced, because older editions inferred some consequences from labels. The separate narrative edition retains the existing gear and save version contracts.

Imported lives retain money, equipment, qualifications, contracts, unfinished attendance and mechanical choices. Older opaque journal/correspondence text cannot be safely reconstructed as a detailed new historical scene: it receives a brief factual record, while dated IDs and progress remain. New exchanges retain their new dialogue. This avoids claiming an unrecorded reward, death or relationship.

## Verification

Verified on 15 October 2026 against the final v0.27.0 source:

- **168 checks passed, zero failed or skipped**, across the eleven-file release gate below. This includes actual local service access and payment, guarded remote commands, school teachers, remembered service replacements, new conversation snapshots and reloads, genuine earlier saves, creation ages, equipment drops, trading, combat, map camera behavior and scroll retention in the real content pane. A potion can be used between dungeon encounters without resolving the room or leaving Inventory.
- The offline build passed module/export validation and parsing. Its translated runtime launched, resumed a saved life, opened and closed the map-only popup without changing the life, and completed a confirmed shop purchase with the exact stock and payment changes in the semantic DOM harness.
- All ten downloadable parts reproduce the complete standalone file byte for byte: **82,166,560 bytes**, SHA-256 `e52662e3c903da6e369b7c4f99282ebd28bfbff18c81e14bde220c30044cdb03`.
- Whitespace checks passed. Existing image/audio files and palette variables are unchanged; portrait presentation uses the existing grayscale illustration filter.

```sh
node --test --test-concurrency=4 --test-reporter=spec \
  tests/world-first-focus.test.js tests/explore-trading.test.js \
  tests/appearance-compat.test.js tests/map-camera.test.js \
  tests/combat-focus.test.js tests/creation-feedback.test.js \
  tests/rebuild.test.js tests/rebuild-v4.test.js \
  tests/interface-overhaul.test.js tests/new-life-v15.test.js \
  tests/offline-v16.test.js
node scripts/build-offline.mjs
git diff --check
```

An earlier exploratory full-suite run recorded 825 passing and 173 failing checks out of 998. It exposed bugs corrected during this work, alongside superseded expectations about remote services, sixteen menu destinations, new long care/work plans and original literal prose. The complete older suite has not been fully rebased and rerun after those corrections; this release does **not** claim a clean full-suite result.

Browser-based visual, touch/device and screen-reader QA is unavailable in this environment: the required control-browser skill is not installed, so no substitute browser automation is used. Semantic DOM tests do not measure actual portrait geometry or touch ergonomics.

The release retains the existing site's owner-private audience. Publication uses the exact pushed source and its packaged static output; the native Sites version and deployment records identify the final commit and publication status. Focus 15 remains unstarted.
