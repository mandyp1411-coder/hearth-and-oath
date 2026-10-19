# Everyday life in v0.9

The new `pastimes.js` module gives the character afternoons which do not have to become a class, a job or a quest. These are optional activities in the existing calendar, alongside school, family, civilian work and adventure.

## Playable activities

| Age | Activities |
| --- | --- |
| 0–3 | No independent pastime decisions. Caregivers handle these years. |
| 4+ | Choose an interest and practice it: manuscripts, sketching, music, gardening, storytelling or crownstones. |
| 6+ | Visit the traveling fair. |
| 7+ | Meet the rescue keeper and consider a cat, hound or raven. A child meets them with an actual nearby caregiver. |
| 8+ | Join a school club while enrolled, with an actual peer nearby. |
| 10+ | School pranks and revision afternoons. |
| 12+ | Gaming tables; teenagers may decide to miss a lesson. |
| 14–17 | Make plans after curfew with a nearby peer. |
| 16–17 | Talk about a first affection with an unrelated nearby peer. This does not create a marriage or an adult partner. |
| 18+ | Invite people to supper or share practiced music, stories or drawings in a little hall. |

There are 35 authored situations: twelve hobby situations, three fair situations, two each for school clubs, pranks, absences, revision, games, curfew, first affection, supper and performances, and two pet situations. Seed, actual age, character identity and previous uses determine the scene. Choosing a hobby never chooses the character's combat path.

Scene choices describe what the player does rather than listing their future rewards. A prank can deepen a friendship while damaging school performance; naming the prankster damages that particular friendship. Missing a lesson does not erase already attended lessons or grant fictional attendance. Copying an answer sheet improves immediate confidence without giving the course progress earned by actual revision. First affections can be reciprocated or remain friendships. Wagers cost a real stake and can lose it.

Seven kinds of callbacks revisit school pranks, absences, memorized answers, broken curfew, club decisions, creative keepsakes and supper invitations. A later teacher question, old membership list or returning guest reveals something from the earlier afternoon. These callbacks wait behind urgent scenes and ongoing commitments. A dead acquaintance cannot return to hand the player a keepsake.

## Hobbies and pets

Practice records actual finished days, not tab visits. Six days of practice earn one hobby level and one relevant existing skill point, to a maximum of eight levels. Three sessions per actual age limit rapid repetition. Switching interests keeps earlier practice intact.

Each adopted animal has a stable identity, seeded name, species, actual birth date, finite seeded lifespan, household location, care date, health and bond. Care requires returning to that household. A present child's caregiver provides basic care without manufacturing additional bond or skill. When no caregiver is tending the animal, prolonged absence leaves a care reminder and reduces its health and bond. Loss creates a dated record rather than an immortal equipment slot.

An heir can inherit the same living animal. Its birth date, household and remaining lifespan are preserved; the parent's practiced hobby levels and private conversations are not inherited as the child's achievements.

## Time and compatibility

Activity cards quote days and any known fee. The handler owns real time and costs through the engine's bounded annual context. Birthday, full moon, blood hunger, deadline and death checks still run. Outdoors activities pass their actual outdoor/daylight context; curfew outings use nighttime.

An interrupted activity records completed and remaining days, location and paid fee. Continuing charges only an unpaid fee. A zero-day pause refunds its reservation immediately. Abandoning leaves its already spent days and annual use recorded without awarding an ending. Death during the work never grants a completed hobby session, adopted animal or shared supper.

The additive sidecar is initialized prospectively. Existing birth, school and conversation events remain unchanged. Save validation checks actual progress, fee and scene agreements, pet dates, age gates and exact pending choice sets. Views are pure.

## Verification

`node --test tests/pastimes.test.js` passes 21 targeted tests. They exercise all six interests across 40 seeds each; the eight school/social activity groups across 50 seeds each; meaningful choice differences; birthday and zero-day interruptions; provision costs; nighttime context; death during activities; school preparation limits; location and kinship restrictions; pet death and succession; pending-event compatibility; view purity; and rejection of forged or inconsistent saves. These are focused scenarios, not claims to have exhausted every possible life.
