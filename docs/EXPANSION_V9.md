# Hearth & Oath v0.9

This pass focuses on the texture of a life: distinct childhood decisions, other people's relationships, afternoons outside work, and a region that looks like a place rather than a diagram.

## Stories and everyday life

Childhood has 37 authored situations and nine returning or leaving chapters. Birth choices belong to the actual caregiver; later choices increasingly belong to the child. A name kept in the register, an unfinished argument, a school secret or a saved keepsake can return in another year. The nursery and age-five scenes refer to the campaign's actual ash, bell or root omen. An heir in a resolved world does not acquire their parent's omen.

Version-seven adult chapters also use dialogue and observed aftermath. Twenty adult chapters and seven family situation types have new prose while retaining the previous gameplay effects. Numerical reward previews and repeated explanatory filler are removed from these new chapters. Known prices remain visible before a commitment. Birthday correspondence marks important ages with distinct letters instead of sending the same greeting every year.

Characters have relationships with other characters. Sixteen social situations allow taking a side, keeping a confidence, intervening, reconciling or declining. Calendar time changes NPC ties independently. Only witnessed developments appear in the player's news and journal; remote developments remain private. Invitations are optional, and unaccepted childhood situations expire instead of following someone into middle age. The same actual person's ties remain attached to them when an heir later knows them as a neighbour.

Six hobbies support practice, interests and skills without imposing a profession. Thirty-five everyday situations include school clubs, pranks, revision, truancy, fairs, curfew outings, first affection, games, performances and suppers. Seven callback types revisit earlier decisions. Cats, hounds and ravens live at a real household, need care, grow older and die. A living pet may remain with the child; its birth date and lifespan are preserved.

## The atlas and interface

Fresh regions use river basins, broken coasts, highlands, islands, wooded basins or estuaries. Settlement positions, landmasses, tributaries, lakes, ridges and regions vary by seed. Connected roads wind across the actual saved geography, including ferry crossings. The route preview and animated pawn follow the same saved points. The engraving adds shore lines, riverbanks, contours, fields, trees and settlement roofs.

The People view shows known connections and witnessed news. Life keeps hobbies and pets compact; Activities offers the full choices. Additional ties, older news and plans use expandable sections. Contact links are real navigation controls, with phone touch targets of at least 46 pixels. The existing phone dock, sound settings, map zoom, keyboard controls and reduced-motion support remain available.

## Continuity and verification

Save revision remains five. Earlier maps, pending birthdays, dialogue, projects, finances and obligations retain their original contents. New sidecars begin at the imported date, with no invented earlier history or retroactive charges. A pending older birthday resolves under its original rules before new chapters begin. New childhood scenes retain saved wording and effects. Successors keep actual family identities, dates and inherited property; they develop their own hobbies and childhood.

The reproducible audit uses 32 distinct seeds, four decision policies, all twelve birthplaces, four household arrangements and eight ancestries. Every life starts at age zero and closes at retirement through the public game API. The audit checks every transition for save validity, nonnegative gold and input immutability. Its 4,010 transitions cover all six atlas forms, all fourteen ordinary pastime actions and four social action families. Replays are not counted as additional lives.

- [Complete-life summaries](playtest/v9-lives.json), [compressed action records](playtest/v9-actions.json.gz), and `scripts/playtest-v9.mjs` preserve the evidence.
- The integration regression suite passed 567 tests. After the final canonical-omen prose change, 42 relevant childhood, legacy, social and succession checks passed, including the added omen test. The later correspondence pass also passed the conversation and connected-life checks, plus an explicit regression for milestone letters and unchanged pending replies.
- `scripts/browser-v9.py` imports genuine checkpoints through the normal save interface, clicks visible controls at 390 and 1440 pixels, reloads saves and requires exact online/offline parity. [The browser report](playtest/v9-browser.json) records the final checkpoint count and results.
- Atlas verification covers 1,000 additional generated regions and eighteen browser checks across six map forms and three widths.
- Genuine public succession checks cover birthday-paused supper, one-time fees, a consenting older adoption, preserved NPC friendships, pet mortality and the child's continued life.

This is a finite authored simulation. These runs exercise varied branches, not every possible combination. The long campaign remains the Ashfall Covenant; this pass deepens ordinary life and its connections rather than replacing that campaign. Text decisions and discrete calendar developments still drive NPC behaviour.

Implementation details and focused checks are recorded in [Childhood](EXPANSION_V9_CHILDHOOD.md), [Social life](EXPANSION_V9_SOCIAL.md), [Pastimes](EXPANSION_V9_PASTIMES.md), and [Atlas](EXPANSION_V9_MAP.md).
