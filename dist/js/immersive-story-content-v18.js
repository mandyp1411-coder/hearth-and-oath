// Authored scenes only. The public engine owns time, payment, memories and saves.
// Mysteries have competing explanations; folklore is never a free spell or item.
import { isSettlement, worldCalendarContext } from './world.js';

const choice = (label, outcome) => ({ label, outcome });
const site = s => s.world?.locations?.find(p => p.id === s.locationId);
const ancestry = s => s.hero?.appearance?.ancestry || 'human';
const living = p => p && p.alive !== false && p.status !== 'dead';
const storyPeople = s => {
  const people = [...(s.life?.people || []), ...(s.companions || []), ...(s.society?.people || [])];
  return people.filter((p, i) => living(p) && people.findIndex(q => q.id === p.id) === i);
};
const adultAge = (s, p) => Number.isFinite(p.bornDay) ? Math.floor((s.day - p.bornDay) / 365)
  : Number.isFinite(p.age) ? p.age
  : Number.isFinite(p.baseAge) ? p.baseAge + Math.floor(s.day / 365) : 0;
const present = (s, p) => p.locationId ? p.locationId === s.locationId
  : (s.companions || []).some(q => q.id === p.id && q.active)
    || (s.life?.people || []).some(q => q.id === p.id)
      && (s.life?.home?.locationId || s.hero?.birthplaceId || (s.hero?.origin === 'city' ? 'city' : 'home')) === s.locationId;
const witness = (s, roles = []) => {
  const people = storyPeople(s).filter(p => adultAge(s, p) >= 18 && present(s, p));
  return people.find(p => roles.includes(p.role)) || people[0];
};
const actor = roles => s => witness(s, roles)?.id;
const witnessed = s => !!site(s) && !['destroyed', 'evacuated'].includes(site(s).status) && !!witness(s);
const inhabited = s => witnessed(s) && site(s).servicesAvailable !== false
  && (isSettlement(s.world, s.locationId) || site(s).type === 'gate');
const racial = race => s => ancestry(s) === race && inhabited(s);
const watery = s => inhabited(s) && (['brook', 'mill'].includes(s.locationId) || ['marsh', 'coast'].includes(site(s)?.type));

export const IMMERSIVE_LIFE_STORIES = Object.freeze([
  { id: 'buried_bell', title: 'The Bell Beneath the Earth', kind: 'place', minAge: 18, skill: 'survival', eligible: inhabited, actor: actor(['neighbor', 'friend']), chapters: [
    ['At {place}, a low note trembles through the soles of your feet. {name} pulls a loose stone from the ground; beneath it hangs a black bell no hand is ringing. A pale figure crouches beside the clapper, its lips moving a moment before the sound arrives. “They left us below the thaw,” it says. Then the opening exhales the smell of wet earth.',
      choice('Hear the buried figure and unfasten its first binding', 'You and the witness work beside the opening, sounding the bell only when the figure asks. A corroded binding breaks. One pale shape rises through the stone and disappears in the morning light.'),
      choice('Keep a paid night watch over the opening', 'You accept paid watch from the nearby households. You cover the opening between agreed vigils and learn which movement of the bell stills the figure, leaving it below rather than releasing it.'),
      choice('Force the figure to ring warnings for those who pay', 'You tighten the bell’s old binding and threaten the nearby households with its voice. They pay to be spared the nightly warning. The witness sees the pale figure bend lower beneath the clapper.')],
    ['A year later, a deeper chime answers from below the first bell. {name} hears it through a wall at {place}. When you return to the opening, damp steps descend farther than the ground should allow. At their foot, a second bell holds a crowd of pale reflections. The figure beside it has no mouth, only a dark hollow where a voice should be.',
      choice('Descend together and loosen the second bell’s bindings', 'You keep the witness beside you and work through the rusted restraints. Several reflections find voices for one brief moment. Their words name a burial abandoned before its final vigil; then they thin into light.'),
      choice('Sell supervised vigils at the upper opening', 'You take paid work keeping the upper vigil safe and guiding listeners who choose to attend. The lower bell remains closed beneath its covering, audible only as a distant undertone.'),
      choice('Make the lower voices an instrument of fear', 'You sound the lower bell until its reflections rise into the upper opening. Frightened households pay for your promise to keep them down. The witness remembers that the voices were asking to leave.')],
    ['Years later, the last binding shows itself: a narrow iron chain disappearing through both bells into the earth. {name} holds the lantern while something below pulls against it. “Finish the vigil,” the gathered voices say, “or give us a keeper.” At {place}, the night has gone strangely still, waiting for an answer.',
      choice('Complete the vigil and let the buried voices leave', 'You open the final binding with the witness beside you. The bells sound once together, and the pale crowd rises through the earth. At the opening, later nights hold ordinary silence and a shared place of remembrance.'),
      choice('Keep the bells as a guarded place of paid remembrance', 'You arrange a tended vigil and paid access for willing listeners. The voices accept a keeper and fall quiet between visits. The opening at the settlement remains a somber refuge rather than a forbidden hole.'),
      choice('Bind the bells to your protection toll', 'You close the final chain and use the buried chorus to enforce your demands. The opening becomes a place of paid fear: households buy silence, and the witness remembers the voices you refused to release.')],
  ] },
  { id: 'water_second_face', title: 'The Water’s Second Face', kind: 'road', minAge: 20, skill: 'scholarship', eligible: watery, actor: actor(['neighbor', 'friend']), chapters: [
    ['The water near {place} reflects an arch that has no stone above it. As you and {name} watch, a narrow boat passes beneath that impossible arch. Its ferryman wears a sodden veil; the lamp in the bow burns under the water. “The last fare is still unpaid,” it says, though its face remains submerged. The boat waits against the current.',
      choice('Hear what the ferryman means by its last fare', 'You keep vigil with the witness and learn the ferryman was abandoned after carrying others to safety. You speak the lost farewell it has been waiting to hear. Its lamp rises briefly above the water.'),
      choice('Accept paid work observing the boat’s appearances', 'You watch the boat for paying households and mark the nights when the arch appears. The ferryman accepts your presence, but keeps its lamp below the surface and its last question unanswered.'),
      choice('Threaten the ferryman’s lamp to extract payments', 'You use the lamp’s exposed flame to force the ferryman into silence while households pay you to keep the boat away. The witness hears its unfinished farewell beneath your demands.')],
    ['A year later, {name} hears footsteps crossing water where no boat is visible. At dusk, the reflected arch opens wider. Pale passengers stand beneath it with empty hands, waiting for the ferryman to decide which shore is theirs. Its sodden veil has torn; behind it is a face worn smooth by water.',
      choice('Help the waiting passengers finish their crossing', 'You and the witness keep the shoreline vigil while each passenger names what they must leave behind. The ferryman carries several pale figures through the arch; their footsteps fade rather than turning back.'),
      choice('Keep a paid, bounded watch for the living shore', 'You accept work tending the approach while the ferryman makes its own crossings. The living are kept back from the deep water, and willing listeners pay to watch the lamplit boat pass.'),
      choice('Hold the passengers at the arch and sell their silence', 'You threaten the lamp and prevent the waiting figures from crossing. Their footsteps spread along the shoreline until frightened households pay your demanded fee. The witness remembers who held the boat in place.')],
    ['Years later, the ferryman offers its final choice at {place}. The boat has room for no living passenger, but the lamp can be lifted onto the shore. “A farewell, a vigil or a chain,” it says. {name} watches the pale passengers gather beyond the reflected arch. None has a shadow on the water.',
      choice('Give the final farewell and let the boat depart', 'You complete the shoreline vigil without demanding anything from the dead. The lamp goes out, the pale passengers cross, and the reflected arch closes. Later travelers find ordinary water where the second road waited.'),
      choice('Keep the lamp as a tended place of paid remembrance', 'You establish a guarded shoreline vigil for willing visitors. The ferryman keeps passage for its pale passengers, while the living remain on the bank. The impossible arch becomes a known, solemn night sight.'),
      choice('Chain the lamp’s vigil to your protection payments', 'You force the ferryman to remain beneath the arch and demand payment from the living shore. The boat becomes a threat held in place, and the witness keeps the farewell you chose not to give.')],
  ] },
  { id: 'hollow_mask', title: 'A Voice Inside the Iron', kind: 'legacy', minAge: 18, skill: 'persuasion', eligible: inhabited, actor: actor(['friend', 'neighbor', 'colleague']), chapters: [
    ['A hollow iron mask has been set into a niche at {place}. {name} turns its face toward you. Without a head behind it, the mouth speaks: “Is the road still closed?” Cold water runs from the eye slits. The voice belongs to a watcher who died holding a royal barrier long after the order to abandon it had arrived.',
      choice('Hear the watcher and read the old release aloud', 'You work with the witness to uncover the words of release beneath the mask’s niche. When they are spoken, the water stops for a moment. The watcher remembers that guarding the barrier was not its final command.'),
      choice('Take a paid commission to examine the speaking niche', 'You tend the niche for its paying keepers and record when the mask speaks. Its unfinished watch becomes a guarded curiosity; the old release remains partly covered beneath the iron.'),
      choice('Make the mask speak your warning to frightened listeners', 'You conceal the words of release and force the watcher’s voice into a paid warning. Households buy your promise that the barrier’s judgment will pass them by. The witness hears the mask ask its unanswered question again.')],
    ['A year later, {name} finds frost inside the niche although the air is mild. Behind the mask, a dark slit opens onto a road lined with kneeling shadows. Each holds an unlit lantern. The watcher’s voice comes from farther away now: “I sent them back. The road was already open.”',
      choice('Guide the watcher’s confession without excusing it', 'You keep the witness beside the niche while the voice names what it did. The kneeling shadows raise their lanterns and several find a little light. The confession is heard rather than buried under a heroic title.'),
      choice('Offer paid vigils at the opened niche', 'You accept work tending willing listeners at the slit. The shadows remain beyond it, their lamps dark between visits. The keepers pay for the vigil rather than for a claim that the watcher was innocent.'),
      choice('Threaten listeners with the kneeling road', 'You use the shadows beyond the slit to demand payment and obedience. The mask repeats your warning in its old commander’s voice. The witness remembers the confession you prevented it from finishing.')],
    ['Years later, the iron face at {place} is almost bare of rust. The niche opens once more. {name} sees the watcher standing on the shadowed road, unmasked, holding a lantern that will not light. “I can leave the barrier,” it says. “But I cannot decide what waits beyond it.”',
      choice('Give the release and let the watcher face its dead', 'You speak the release without naming the watcher a hero. It steps away from the barrier to join the waiting shadows. Their lanterns kindle, and the niche closes around an ordinary, silent iron mask.'),
      choice('Keep a paid memorial watch at the niche', 'You arrange a tended place where willing listeners hear the watcher’s confession. The shadowed road remains open only during the vigil. The mask becomes a somber memorial, never a pardon for its old cruelty.'),
      choice('Keep the watcher chained to your commands', 'You cover the release and make the mask a voice for your protection toll. The road’s shadows remain kneeling beyond it. The witness keeps the confession that your profitable warning leaves unfinished.')],
  ] },
  { id: 'moth_window', title: 'Moths at the Witch’s Window', kind: 'household', minAge: 20, skill: 'survival', eligible: inhabited, actor: actor(['relative', 'friend', 'neighbor']), chapters: [
    ['At {place}, white moths cover a shutter without making a sound. {name} watches them part around a narrow face on the far side of the glass. Its eyes are pale pits filled with moving wings. “I was given a room here,” the visitor says, “before your walls learned their shape.” It asks whether the window may be opened.',
      choice('Hear the visitor before deciding how to open the window', 'You keep the witness close and open the shutter a little at a time. The visitor releases a cloud of moths, then shows the old mark of a forgotten welcome beneath the sill. No living household is claimed as its possession.'),
      choice('Take paid watch over the unopened window', 'You accept work tending the shutter for the nearby households. The visitor waits outside, quiet during the agreed watch. Its old welcome remains beneath the sill, unread and unrenewed.'),
      choice('Threaten the welcome mark and sell the visitor’s silence', 'You scrape at the old mark until the visitor recoils, then demand payment to leave the shutter alone. The households buy quiet; the witness sees moths falling from the face like pale tears.')],
    ['A year later, the white moths return to {place}. {name} finds them on the inside of a closed shutter this time. The visitor’s outline stands between the wall and its shadow, thinner than a hand. “The room forgot me,” it says. “Now I have begun to forget the room.” Its wings beat with the sound of dry paper.',
      choice('Renew a small welcome that the living freely agree to', 'You tend the sill with the witness and leave the visitor one quiet place to rest. It folds its wings into an ordinary shadow. The welcome is narrow enough for the living to keep without surrendering their home.'),
      choice('Arrange paid, supervised visits at the shutter', 'You keep an agreed vigil for willing visitors. The moth-faced figure appears only while the window is tended; the household remains separate from the curious people gathering outside.'),
      choice('Hold the visitor between wall and shadow for ransom', 'You damage the welcome mark and threaten to erase the last of it. The visitor remains caught in the wall while frightened households pay your demands. The witness hears its wings grow louder when you leave.')],
    ['Years later, the moths make one final pattern on the shutter: an open door drawn in white wings. {name} can see darkness beyond it even when standing inside the room. The visitor says there are other forgotten windows waiting in that dark. It may be sent onward, kept as a guest or held as a threat.',
      choice('Restore the doorway and let the moth visitor leave', 'You finish the old welcome and open its narrow way outward. The visitor steps through, taking the white moths with it. The shutter at the settlement becomes ordinary wood, with one small mark of hospitality left beneath the sill.'),
      choice('Keep a tended window for paid, willing audiences', 'You arrange a guarded vigil where the moth visitor may appear by agreement. The household keeps its rooms; visitors pay to witness the strange guest at the shutter. The old welcome is renewed rather than erased.'),
      choice('Keep the door closed and make fear of the guest profitable', 'You close the visitor’s way onward and use the moths to enforce protection payments. The shutter becomes a place of uneasy silence, and the witness remembers the open door you chose to deny.')],
  ] },
  { id: 'silverleaf_names', title: 'Names on the Silver Leaves', kind: 'legacy', minAge: 22, skill: 'devotion', eligible: racial('elf'), actor: actor(['relative', 'friend']), chapters: [
    ['At {place}, a bare branch has grown through a seam in old stone. {name} touches it, and silver leaves unfold in the dark. Each carries a name in an elven hand. When one is read aloud, its shadow becomes a face that whispers, “I was remembered, but never dismissed.” These are not your ancestors. They are strangers waiting inside an unfinished remembrance.',
      choice('Ask the waiting names which farewell they need', 'You keep a willing remembrance with the witness. One leaf loosens as its shadow speaks a final sentence, then falls into the stone. The branch has been holding the dead rather than merely remembering them.'),
      choice('Keep paid, willing vigils beside the silver leaves', 'You tend the branch for paying listeners who choose to attend. The shadows speak only when addressed, then fold back into their leaves. Their release remains unfinished, but the vigils are quiet rather than forced.'),
      choice('Threaten to erase names unless their listeners pay', 'You damage one silver leaf and use the shadow’s distress to demand payment from its living listeners. The witness sees a name begin to fade beneath your hand.')],
    ['A year later, {name} finds silver roots crossing the stone below the branch. The shadows have started remembering things their leaves never named: a shared room, a broken promise, the wrong voice at a grave. One asks to leave without giving any more of its life to the listeners. Another begs for one more night.',
      choice('Let each shadow choose silence, remembrance or departure', 'You tend the vigil without demanding a story from every shadow. Those ready to leave loosen their own leaves; those wishing to remain fall quiet until willingly addressed.'),
      choice('Arrange paid vigils around the shadows willing to speak', 'You organize attended remembrance with clear hours and willing shadows. The listeners pay for the tended vigil, while the dead who refuse a hearing are left in silence.'),
      choice('Force the leaves to reveal what their listeners fear', 'You bruise the silver roots until the shadows speak their most painful memories. Frightened listeners pay to stop the hearing. The witness remembers the names that asked to remain silent.')],
    ['Years later, the branch bends toward a dark gap in the stone. {name} hears wind beyond it, although no passage is visible. The remaining shadows say the old remembrance can now end. The silver leaves could be let go, kept by willing agreement or held as a treasury of other people’s grief.',
      choice('Finish the remembrance and release the remaining names', 'You give the final farewell beside the witness. Silver leaves fall into the gap like quiet stars, and the roots withdraw. The stone keeps a small bare branch, a memorial that no longer holds anyone captive.'),
      choice('Keep a tended shrine for shadows who choose to remain', 'You arrange paid vigils for willing visitors and willing shadows. The branch becomes a local shrine of chosen remembrance, with a dark gap left open for any name ready to depart.'),
      choice('Seal the gap and make the names answer to your fee', 'You close the shadows’ way out and sell relief from the memories you can force them to speak. The branch becomes a place of ransom, and the witness retains the farewells you refused.')],
  ] },
  { id: 'stone_last_note', title: 'The Last Note in the Stone', kind: 'work', minAge: 18, skill: 'survival', eligible: racial('dwarf'), actor: actor(['relative', 'colleague', 'friend']), chapters: [
    ['From a buried doorway at {place}, {name} hears three short taps, a pause and one final stroke. The rhythm is an old dwarven work signal. You answer on the stone, and a thin seam fills with blue light. Beyond it, figures of ash wait beside tools that crumble whenever they are raised. A voice asks, “Has the shift ended?”',
      choice('Answer the workers and find their buried release mark', 'You work beside the witness to uncover the shift’s release mark. When it is sounded, several ash figures lower their tools. The blue seam brightens, revealing that their work has been repeating since the doorway was sealed.'),
      choice('Take paid watch over the sounding doorway', 'You accept work tending the seam for the nearby households. The ash workers remain beyond it, quiet while the signal is answered on schedule. Their endless shift is contained rather than ended.'),
      choice('Use the workers’ tapping to demand a silence fee', 'You leave the signal unanswered until the tapping spreads through nearby stone. Frightened households pay to have it stopped. The witness sees the ash workers return to tools that cannot survive a stroke.')],
    ['A year later, the seam opens wider. {name} can see a foreman made of soot counting the same empty cart. It will not release the shift until the load is complete. Beside it lies a tally with the final mark struck out. The workers have been ordered to fill an absence that cannot be filled.',
      choice('Restore the struck-out mark and challenge the false tally', 'You uncover the final mark with the witness beside you. The soot foreman sees its count end for the first time. A line of ash workers turns toward the doorway, waiting to be allowed through.'),
      choice('Arrange paid vigils with the false tally laid bare', 'You tend supervised vigils that show the tally and its endless demand. Paying visitors hear the workers’ signal while the seam is kept narrow; the shift still waits for a final release.'),
      choice('Keep the false tally and make its burden profitable', 'You conceal the ending of the count and use the rising noise to demand further payments. The witness remembers the final mark that could have freed the workers.')],
    ['Years later, the foreman holds its tally through the seam at {place}. {name} hears the ash tools fall silent. Beyond the doorway is a road rising through solid rock toward a pale morning. The workers wait for the last signal: an end to the shift, a tended remembrance or another order to continue.',
      choice('Sound the final release and open the workers’ road', 'You answer the work signal with its ending. The ash figures leave their crumbling tools and pass into the stone’s pale road. The buried doorway closes, leaving ordinary rock and a remembered warning about an endless demand.'),
      choice('Keep the doorway as a tended memorial vigil', 'You arrange paid, willing remembrance beside the narrow seam. The workers rest between visits rather than repeating the false load. Their blue-lit doorway remains a somber local memorial.'),
      choice('Order another shift and sell silence from its noise', 'You strike out the final mark again and command the ash workers back to their empty cart. The doorway becomes a source of enforced payments, and the witness keeps the release you chose to conceal.')],
  ] },
  { id: 'ninth_hearth', title: 'The Ninth Hearth in the Song', kind: 'household', minAge: 18, skill: 'persuasion', eligible: racial('halfling'), actor: actor(['relative', 'friend', 'neighbor']), chapters: [
    ['{name} sings a halfling road song counting eight hearths. At its whispered ninth verse, an extra doorway appears in a wall at {place}. Behind it waits a table set for guests whose chairs have no shadows. A small host with a face of old wood says, “I kept the fire. Nobody remembered to come home.” The air smells of bread that never finished baking.',
      choice('Keep a shared vigil with the forgotten host', 'You tend the ninth hearth beside the witness and let the host tell each absent guest’s name. The chairs begin casting faint shadows. The unfinished welcome has been feeding on silence, and being heard makes it less hungry.'),
      choice('Take paid watch over the impossible doorway', 'You tend the doorway for paying households and allow willing visitors to look inside from the threshold. The host keeps its table set, quiet while the watch is maintained.'),
      choice('Threaten the host with another empty table', 'You force the host to show its hungry room to frightened listeners and demand payment to close the door. The witness sees the shadowless chairs turn toward every living voice.')],
    ['A year later, the extra doorway returns to {place}. {name} sees a new chair at the table, broad enough for anyone waiting outside. The wooden host has begun setting places for the living as well as the lost. “A guest must stay until the meal is finished,” it says. The bread is still pale, and no knife can cut it.',
      choice('Teach the host a welcome that lets a guest leave', 'You tend the vigil with the witness and repeat farewells as carefully as greetings. The host clears the new chair. Its welcome begins to understand that an open door must work in both directions.'),
      choice('Keep supervised, paid visits without accepting a place', 'You arrange attended visits at the threshold and keep the living away from the table. The strange hearth becomes a guarded curiosity, while the host waits with its unfinished bread.'),
      choice('Sell frightened households your approval to remain outside', 'You let the host believe the living owe it attendance, then charge households for your promise to keep their chairs empty. The witness remembers the farewells you chose not to teach.')],
    ['Years later, the wooden host stands in the doorway with its apron folded away. {name} hears a fire behind it, warm and ordinary for the first time. The table is ready to be cleared. The ninth hearth may finally let its lost guests go, remain a tended wonder or become a door whose welcome must be bought.',
      choice('Help the host finish the meal and clear the lost places', 'You keep the final vigil, speaking both welcome and farewell. The shadowless guests rise and leave through an inner door. The ninth hearth fades from the wall, and the old song ends with a host who can rest.'),
      choice('Keep a tended, paid threshold for willing visitors', 'You arrange guarded visits by agreement with the host. The table is left for remembrance, and nobody living is made to take a chair. The ninth hearth remains a gentle, uncanny local wonder.'),
      choice('Make the host guard a welcome sold only through you', 'You forbid the final farewell and turn the doorway into a demand for payment. The host keeps hungry places for anyone denied your approval. The witness remembers the meal that could have ended.')],
  ] },
  { id: 'bannerless_oath', title: 'The Oath Without a Banner', kind: 'legacy', minAge: 18, skill: 'defense', eligible: racial('orc'), actor: actor(['relative', 'friend']), chapters: [
    ['At {place}, {name} hears an orcish oath from an empty stretch of ground: “Hear me before you name my strength.” A great shadow kneels where no body stands, its open hands filled with ash. It was ordered to prove a loyalty that its commander never intended to accept. Now it waits for another challenge. Your own life owes it no inherited oath.',
      choice('Hear the kneeling shadow instead of offering a challenge', 'You keep vigil beside the witness and let the shadow describe the demand it could never satisfy. Its ash-filled hands lower. For the first time, it waits for an answer rather than another impossible proof.'),
      choice('Take paid watch over the shadow’s appearances', 'You tend the place for paying households and keep willing listeners outside the shadow’s reach. It remains kneeling, quiet while its opening words are answered.'),
      choice('Threaten to set the shadow’s challenge upon unpaid households', 'You turn the kneeling figure into a threat and demand payment to hold back its challenge. The witness sees its hands fill with more ash each time you repeat the old commander’s words.')],
    ['A year later, the shadow at {place} has grown a second pair of hands. {name} sees one pair begging to be heard while the other strains toward an invisible banner. “If I can hold every burden,” it says, “they will finally believe me.” Behind it, the ground echoes with footsteps that never advance.',
      choice('Release the shadow from proving the commander’s impossible claim', 'You tend the vigil and answer each demand with the truth that the proof was never meant to end. The second hands dissolve. The unseen footsteps slow, leaving the shadow able to hear something besides its commander.'),
      choice('Keep a supervised, paid vigil around the disputed oath', 'You arrange attended hearings at which the shadow speaks without receiving a new challenge. Paying listeners witness its burden, while the invisible banner remains beyond the vigil’s boundary.'),
      choice('Give the shadow a new burden and charge to withhold it', 'You repeat the commander’s logic and make the shadow believe obedience will finally prove its worth. Frightened households pay to be spared its march. The witness remembers that its first request was only to be heard.')],
    ['Years later, the shadow stands at {place} with empty hands. {name} sees a banner behind it, torn so completely that no sign remains. The figure can now step away from the oath, remain as a willing witness or be given another master. “Must someone always be satisfied?” it asks.',
      choice('Let the shadow lay down the oath and depart', 'You keep the last vigil without asking for another proof. The shadow releases its empty hands, and the unseen march ends. The ground becomes ordinary again, with the old oath remembered as a warning rather than a command.'),
      choice('Keep a willing, tended vigil at the bannerless place', 'You arrange paid hearings for listeners who choose to attend. The shadow remains by agreement, speaking of its burden without receiving a new one. The place becomes a somber memorial to an oath that could never be satisfied.'),
      choice('Make the shadow’s next oath obedience to you', 'You claim the torn banner’s authority and bind the figure to your protection demands. Its invisible march resumes beneath the settlement, and the witness remembers the empty hands you turned back into a burden.')],
  ] },
  { id: 'drain_lullaby', title: 'The Lullaby Under the Grate', kind: 'place', minAge: 18, skill: 'scholarship', eligible: racial('goblin'), actor: actor(['friend', 'relative', 'neighbor']), chapters: [
    ['From below a grate at {place}, {name} hears a goblin lullaby sung in a voice made of many small echoes. Lanterns burn beneath it with no flame. When the last verse stops, a thin hand of smoke reaches up for another song. The echoes belong to a room sealed long ago, where someone kept singing after every listener had gone.',
      choice('Answer the lullaby and find the sealed room’s final verse', 'You keep the witness beside the grate and answer the echoes through the vigil. One lantern dims peacefully. The last verse is not a threat but a farewell the sealed room never learned to finish.'),
      choice('Take paid watch over the grate and its quiet songs', 'You tend the grate for paying households, answering the opening verse when the echoes rise. The smoky hand withdraws during the watch, and the room below remains closed.'),
      choice('Leave the echoes rising until households pay for quiet', 'You withhold the answering verse until the lullaby spreads through nearby walls. Frightened listeners pay for silence. The witness sees the smoky hand searching farther above the grate each night.')],
    ['A year later, {name} sees words appear in soot around the grate. They are names, but each disappears when its echo tries to speak it. Below, the lanterns have become small faces of smoke. The old singer says the room was denied even the right to be named aloud. It asks who will hear the last verse now.',
      choice('Hear the smoky names and finish the verse beside them', 'You keep the vigil and speak the names only as the echoes offer them. Several smoke faces become clear for a breath, then settle into quiet. The room begins remembering an ending beyond its sealed walls.'),
      choice('Arrange paid, willing hearings at the grate', 'You tend scheduled vigils for listeners who choose to hear the echoes. The smoky names remain within the opening, audible without being dragged into the frightened streets.'),
      choice('Use the smoke faces to make the silence more costly', 'You threaten to let the echoes name paying households in their unfinished song. The listeners surrender coin to keep their names out. The witness remembers how you replaced a denied farewell with another demand.')],
    ['Years later, the grate at {place} lifts from below. {name} sees a narrow stair filled with lamps, each waiting to go out. The smoky singer offers three endings: open air, a tended hearing or an endless song. Its last note is small enough to lose beneath an ordinary footstep.',
      choice('Open the farewell and let the lamps go dark', 'You finish the last verse beside the witness. The smoke faces pass through the grate into open air, and their lamps go out one by one. The sealed room falls quiet at last; the lullaby survives with its ending restored.'),
      choice('Keep a tended listening place for willing visitors', 'You arrange paid vigils where the remaining echoes may sing by agreement. The grate stays guarded and the names stay audible. The old room becomes a local place of remembrance rather than a feared drain.'),
      choice('Close the grate and sell silence from the endless song', 'You deny the final verse and hold the echoes below for your protection payments. The lullaby continues under the settlement, and the witness keeps the ending you refused to let it reach.')],
  ] },
  { id: 'horns_candle', title: 'A Candle Between the Horns', kind: 'household', minAge: 18, skill: 'persuasion', eligible: racial('tiefling'), actor: actor(['relative', 'friend']), chapters: [
    ['At {place}, {name} finds a mirror framed by carved wooden horns. A candle burns between them without losing wax. The glass reflects neither of you: it shows strangers chained by sentences they once swore. A keeper inside the mirror says, “I was made to witness promises. Nobody taught me which ones should end.” Its horns are part of its frame, not evidence about your own blood.',
      choice('Hear the trapped promises and release one that was fulfilled', 'You tend the mirror with the witness and find a completed promise still held as a chain. When its ending is spoken, one stranger steps out of the reflection and fades. The keeper learns that a vow can end without becoming a betrayal.'),
      choice('Take paid watch over the mirror’s candle', 'You guard the mirror for paying households and cover it between agreed vigils. The keeper remains inside, its chains quiet while the candle is tended.'),
      choice('Use the reflected chains to demand payments from listeners', 'You threaten to show frightened listeners a chain bearing their own words unless they pay. The witness sees you teach the keeper a new way to mistake fear for an oath.')],
    ['A year later, {name} sees a chain in the mirror with no sentence attached. The keeper calls it the safest promise: one that can never be proven complete. The reflected strangers strain toward its candle. Beneath the carved horns, a narrow seam has opened, and cold light spills from promises nobody remembers making.',
      choice('Break the empty demand and hear the strangers’ endings', 'You keep the vigil and name the empty chain for what it is: a demand without a promise. It falls away from the glass. Several strangers can finally speak the words that complete their own bonds.'),
      choice('Arrange paid, supervised hearings at the mirror', 'You tend willing hearings while keeping the empty chain covered. Paying listeners witness the strange promises without being asked to swear into the keeper’s unfinished work.'),
      choice('Keep the empty chain and sell your approval of every oath', 'You make the keeper’s impossible chain the price of your protection. Frightened listeners pay for your declaration that their words are sufficient. The witness remembers the demand with no sentence behind it.')],
    ['Years later, the candle at {place} bends toward the glass instead of upward. {name} sees the keeper hold the last chain in both hands. It can let the reflected strangers depart, remain as a willing witness or keep the mirror hungry for new words. Its carved horns throw no shadow now.',
      choice('Give the keeper an ending and let the candle burn out', 'You complete the final vigil without offering another oath. The reflected strangers loosen their chains and disappear into clear glass. The candle finally burns down, leaving an ordinary mirror and a warning about promises with no permitted end.'),
      choice('Keep a tended mirror for willing hearings', 'You arrange paid visits by agreement with the keeper. Completed promises are allowed to end, and nobody is forced to swear. The horn-framed mirror becomes a strange local place where willing witnesses may hear what a vow once held.'),
      choice('Keep the candle endless and make every release your bargain', 'You refuse the final ending and sell freedom from the keeper’s reflected chains. The mirror remains hungry for promises, and the witness remembers the clear glass you chose not to leave behind.')],
  ] },
  { id: 'road_four_tracks', title: 'The Road of Four Tracks', kind: 'road', minAge: 18, skill: 'survival', eligible: racial('beastfolk'), actor: actor(['friend', 'relative']), chapters: [
    ['At {place}, four sets of animal tracks appear in dust that no wind disturbs. {name} follows them with a lantern. At their meeting stands a dark doorway with four beast-headed shadows behind it, each carrying the same moon. “We found the road,” they say together, “but the road will not finish.” These are old travelers, not an account of what you must become.',
      choice('Hear each traveler and find where the road was broken', 'You keep the witness beside the tracks through the vigil. Each shadow remembers a different last turn, and together they reveal the missing farewell at the doorway. One carried moon begins to wane.'),
      choice('Take paid watch over the meeting of tracks', 'You tend the doorway for paying households, keeping willing observers on its near side. The shadows remain beyond it, quiet while their four opening words are answered.'),
      choice('Make the wandering shadows a threat that buys your silence', 'You leave the travelers calling until their tracks spread through nearby ground. Frightened households pay to have the calls stopped. The witness sees the four shadows clutch their moons more tightly.')],
    ['A year later, a fifth track crosses the old four at {place}. {name} sees no fifth body, only a hollow in the doorway where light seems to vanish. The travelers say the road itself has learned to follow them. It wants every departure to return to the same threshold, and every traveler to remain unfinished.',
      choice('Give the travelers separate farewells and bar the hungry road', 'You keep the vigil and hear each farewell without forcing them into one voice. The hollow draws back from the lantern. Two of the carried moons darken, leaving the travelers able to remember destinations instead of only the doorway.'),
      choice('Keep a paid, guarded vigil outside the hollow', 'You tend willing hearings while the fifth track is kept behind a closed boundary. The travelers remain visible from the near side, and the hungry road is given no new living steps.'),
      choice('Use the fifth track to enforce a larger protection fee', 'You threaten to leave the hollow unguarded unless households pay your demand. The hungry road presses toward the living paths, and the witness remembers who offered its hunger as a bargain.')],
    ['Years later, the four shadows at {place} hold only one pale moon between them. {name} hears their different voices asking for their last separate farewells. Beyond the threshold, the hungry road has curled into a dark ring. It can be ended, contained for willing observation or used to make every nearby departure answer to you.',
      choice('Finish the farewells and let the travelers reach their own roads', 'You keep the last vigil and give each traveler its separate ending. The pale moon rises from their hands, the hollow folds shut, and the tracks become ordinary dust. The doorway no longer calls anyone back.'),
      choice('Keep a tended threshold for paid, willing observers', 'You arrange guarded vigils that let the remaining travelers speak by agreement. The hungry road stays behind its boundary. The four-track doorway becomes a strange local night sight with no demand that visitors step through.'),
      choice('Keep the hungry road and sell permission to pass it', 'You deny the travelers their endings and make the road’s threat the price of your approval. The doorway remains a fearful boundary, and the witness remembers the separate farewells you refused.')],
  ] },
  { id: 'moon_broken_roof', title: 'The Moon Through the Broken Roof', kind: 'place', minAge: 22, skill: 'arcana', eligible: s => witnessed(s) && (['tower', 'ruin'].includes(site(s)?.type) || s.hero?.profession === 'Scholar' || s.hero?.skills?.scholarship >= 8), actor: actor(['friend', 'rival', 'colleague']), chapters: [
    ['At {place}, {name} shows you a roof broken in the shape of a crescent. Moonlight falls through it even though the sky outside is clouded. Beneath the beam, a painted door opens onto another night: stars in the wrong positions, a white stair and a keeper whose face is covered by a disk of dark glass. “The last observation is unfinished,” the keeper says.',
      choice('Hear the keeper and help complete the first observation', 'You spend the vigil beside the witness, following the old marks around the painted door. One frozen star begins to move. The keeper remembers that the night beyond the roof was trapped by an unfinished watching rite.'),
      choice('Take paid watch over the moonlit threshold', 'You accept work guarding the threshold for willing observers. The door is covered between vigils, and the trapped sky remains still. The keeper allows the watch but continues waiting for its last observation.'),
      choice('Make the painted door an omen that demands payment', 'You let frightened listeners believe the wrong stars foretell their ruin and demand payment to cover the door. The witness sees the keeper reach toward a sky you profit from leaving frozen.')],
    ['A year later, {name} sees a black star appear in the moonlit door. It is not distant: it presses against the glass of the keeper’s face. Beneath the frozen night, the white stair now descends into darkness. The keeper says the final observer fled rather than watch the star rise, leaving the rite open around everyone who followed.',
      choice('Finish the next watch with the witness beside you', 'You keep the vigil through the dark star’s ascent instead of turning away. It recedes from the keeper’s glass, and several motionless figures on the stair begin to breathe light. The trapped night loses another binding.'),
      choice('Arrange paid, supervised observations of the strange sky', 'You tend agreed vigils for willing observers while keeping the white stair barred. The dark star remains beyond the threshold, visible only while the painted door is opened under watch.'),
      choice('Use the dark star to force a richer protection bargain', 'You threaten to leave the threshold open unless nearby households pay. The keeper covers its face as the black star presses forward. The witness remembers who turned an unfinished rite into a ransom.')],
    ['Years later, the keeper offers its disk of dark glass toward the moonlight at {place}. Beyond the door, the frozen night is ready to turn. {name} watches the white stair fill with figures awaiting morning. The threshold can be ended, tended or deliberately left hungry for the fears of the living.',
      choice('Complete the last watch and release the trapped morning', 'You finish the watching rite with the witness beside you. The dark star sets, the keeper lifts its empty face and morning reaches the white stair. The painted door closes; the broken roof admits only the settlement’s own sky.'),
      choice('Keep a guarded observatory between the two skies', 'You arrange a tended, paid vigil for willing observers. The keeper accepts the watch and bars the white stair between visits. The roof becomes a strange local observatory where the other night can be seen without being entered.'),
      choice('Keep the night unfinished and sell relief from its omen', 'You refuse the final observation and use the dark star to enforce payments. The painted door remains a fearful threshold, and the witness keeps the account of the morning you chose to hold back.')],
  ] },
]);

// These are ambient observations, not player actions. Eligibility never mutates
// state. Name-bearing entries expose an actor drawn from existing living people.
const ageStage = s => s.age < 3 ? 'infant' : s.age < 10 ? 'child' : s.age < 18 ? 'adolescent' : s.age < 65 ? 'adult' : 'elder';
const seasonIndex = s => Math.min(3, Math.floor((((Math.floor(s.day || 0) % 365) + 365) % 365) / 92));
const weather = s => worldCalendarContext(s.world, s.day, s.seed).weather;
const rows = [];
const add = (group, entries, eligible, extra = {}) => {
  for (const [key, title, text] of entries) rows.push(Object.freeze({ id: `ambient_${group}_${key}`, title, text, eligible, ...extra }));
};

add('infant', [
  ['breathing', 'A World of Breathing', 'For now, the world comes as warmth, hunger and the rise and fall of nearby breathing. Beyond it, {place} has names you cannot yet know.'],
  ['voice', 'Before Words', 'A voice repeats the same soft sounds. You do not know the story inside them; you know the pause before the voice begins again.'],
  ['light', 'Light on the Wall', 'A patch of light moves beyond your reach. Your eyes follow it until it breaks into shadow. No kingdom could be larger than that wall today.'],
  ['fabric', 'The Edge of Cloth', 'Your fingers close around a fold of cloth. The rough weave, the warmth beneath it and the effort of holding on fill the whole moment.'],
  ['sleep', 'The Small Hours', 'You wake while the world is quiet, then drift away before it has finished waking. The hours belong to bodily needs rather than bells or promises.'],
  ['footsteps', 'Steps Beyond Sight', 'Footsteps pass somewhere beyond your view: near, then far, then gone. You turn toward the sound before there is a word for where it went.'],
  ['hands', 'The Shape of a Hand', 'A hand enters your small world. You study its shifting outline, then your own fingers, with the grave attention of someone meeting a mystery for the first time.'],
  ['humming', 'A Low Note', 'A low hum is easier to follow than speech. For a little while, each breath seems to carry the same note through the dark.'],
  ['shadow', 'The Returning Shape', 'A familiar shape leans close, disappears and returns. You cannot count the returns, but your body knows the difference between waiting and being held.'],
  ['morning', 'No Name for Morning', 'The dark thins. Sounds begin again, one after another. You have no name for morning; it arrives all the same, asking only that you wake.'],
], s => ageStage(s) === 'infant', { stage: 'infant' });

add('child', [
  ['shadow', 'The Giant at Your Feet', 'Your shadow runs farther than you do. In a bent angle of light, it briefly wears the stature of someone who knows every road out of {place}.'],
  ['stone', 'A Very Important Stone', 'A stone becomes a tower, a dragon’s tooth and then only a stone again. The world has not grown less strange because the names keep changing.'],
  ['door', 'The Tallest Door', 'The doorways of {place} still belong to taller people. You look up at a worn lintel and wonder how many heads have passed beneath it.'],
  ['echo', 'Someone Answers', 'You hear an echo where a voice has already stopped. For a moment it seems another child has learned to speak from inside the stone. Old stories have plenty to say about that.'],
  ['names', 'The Secret of Names', 'Places seem more solid after you learn their names. Still, a dark corner remains a dark corner no matter how confidently you call it by an ordinary word.'],
  ['grownups', 'The Unfinished Conversation', 'Adult voices lower as you come near. The missing words leave room for a hundred explanations, most of them more fantastic than the truth is likely to be.'],
  ['height', 'A Mark of Height', 'A low shelf no longer seems quite so high. Growing is rarely something you notice as it happens; today, the world gives you a small piece of evidence.'],
  ['monster', 'The Ordinary Monster', 'A knot in wood has the face of a little horned thing from a frightening story. From another angle it looks worried. You wonder whether monsters ever frighten themselves.'],
  ['counting', 'Counting What Stays', 'You count familiar shapes and lose your place when one moves. You begin again. There is comfort in a world that sometimes waits to be counted.'],
  ['wonder', 'A Question Too Large', 'You wonder where the dark goes when morning comes. Nothing at {place} gives an answer, but the unanswered question feels less frightening in daylight.'],
], s => ageStage(s) === 'child', { stage: 'child' });

add('adolescent', [
  ['threshold', 'The Far Side of Familiar', 'The familiar paths at {place} seem both shorter and harder to leave. You can now imagine a different life without yet knowing what it would ask of you.'],
  ['reflection', 'A Face Still Becoming', 'Your reflection looks familiar until an angle of light changes it. There is no single morning when the child vanishes and the person ahead of them is complete.'],
  ['voice', 'The Weight of a Voice', 'An ordinary sentence sounds different when spoken by someone who expects to be heard. You notice how little volume that confidence sometimes needs.'],
  ['maps', 'Beyond the Known Edge', 'The horizon has stopped feeling like the end of the world. Its distance remains; now it also has the troubling shape of a possible future.'],
  ['silence', 'An Answer Kept Back', 'You think of a reply after the conversation has ended. It is sharper in the quiet, where nobody can interrupt it or tell you what they meant.'],
  ['old_story', 'The Other Ending', 'In an old tale, the dead king waits for a rider who never arrives. You used to wonder what lay inside his tomb. Now you wonder whether the rider chose another road.'],
  ['body', 'Growing Into the World', 'The world feels measured for a body you are still growing into. Some days the distances are easier; some days even familiar movements require new thought.'],
  ['name', 'The Name Others Use', 'Your name sounds different in different mouths: a warning, an invitation, a simple greeting. None of those uses is the whole person hearing it.'],
  ['night', 'A Longer Evening', 'Evening leaves you with thoughts too large for the hour. Beyond {place}, lives continue that have never heard your name. The fact is lonely and freeing.'],
  ['choice', 'Before the First Great Choice', 'People talk as though the important life will begin with one great decision. Meanwhile, the smaller days keep happening, and they are already becoming yours.'],
], s => ageStage(s) === 'adolescent', { stage: 'adolescent' });

add('adult', [
  ['grain', 'The Grain of a Day', 'Most days at {place} have no clear beginning worth retelling. They acquire their shape from small necessities, unfinished thoughts and what remains after the noise settles.'],
  ['door', 'A Door Seen Twice', 'You pass a familiar doorway and notice something you had overlooked for years: the uneven stone beneath it, worn by people whose names are no longer spoken here.'],
  ['voice', 'Your Voice in the Room', 'You hear yourself use an old phrase you once questioned. Habit travels quietly. You do not have to keep every word it places in your mouth.'],
  ['distance', 'The Measure of Distance', 'A nearby road looks longer when there is reason to delay and shorter when there is reason to return. Its stones have not moved.'],
  ['quiet', 'When Nobody Is Asking', 'For a little while, nobody asks you for an answer. The quiet at {place} has its own weight, made of things that can wait and things you have not named.'],
  ['light', 'An Ordinary Kind of Gold', 'Low light catches a worn edge and makes it briefly precious. It is easy to understand how old tales gave the smallest light a treasure’s worth, and set something hungry to guard it.'],
  ['stories', 'The Tale Within Reach', 'The grand stories speak of kings and curses. At {place}, older fears fit smaller spaces: the hollow under a doorstep, the pause after a bell, the dark behind an unused door.'],
  ['unknown', 'The Stranger in the Glass', 'In a dim reflection, your face seems to belong to someone whose life you might have heard about. Old mirror tales would make much of that moment. A familiar movement returns it to you.'],
  ['waiting', 'The Things That Wait', 'A paused conversation returns to mind between other thoughts. Not everything unfinished is a summons, though some questions grow louder while you leave them alone.'],
  ['place', 'The Shape of Here', '{place} is more than the names used for its roads and walls. It is also the pattern of sounds you notice when one expected sound fails to arrive.'],
], s => ageStage(s) === 'adult', { stage: 'adult' });

add('elder', [
  ['measure', 'Another Measure of Time', 'A year no longer feels like the same distance it once did. At {place}, a small change can call back a season whose ordinary details nobody thought to preserve.'],
  ['face', 'Lines With No Single Meaning', 'The face looking back at you has lines that no single story explains. Others may read wisdom or hardship into them; you know there were also uneventful afternoons.'],
  ['places', 'What a Place Remembers', 'You recognize an old turn of light at {place}. It has survived changes that seemed permanent when they began. Familiarity can be steadier than the walls around it.'],
  ['names', 'A Name Almost Found', 'A half-remembered name hovers behind another thought. You do not force it. Sometimes a voice returns more clearly when it is allowed to approach in its own time.'],
  ['new', 'Still an Unanswered World', 'Age has answered some questions and revealed how poorly others were asked. The buried kings and wandering lights of old tales feel different now, but the world has not run short of mysteries.'],
  ['youth', 'The Age of Other Faces', 'Younger faces can make an old story feel newly close. They do not owe it a repetition, any more than you owed every future to the people who first named one for you.'],
  ['detail', 'A Small Thing Kept', 'An ordinary detail stays clearer than an important date: the way light fell, a pause before a reply, the sound of someone trying not to laugh.'],
  ['silence', 'The Right to Leave a Pause', 'You let a pause remain in the middle of a thought. It need not be filled with an answer merely because someone has grown accustomed to asking you for one.'],
  ['change', 'The Familiar Changes', 'At {place}, the familiar world continues changing without first seeking your agreement. Some changes sting; some make room for a life you would not have known to imagine.'],
  ['tomorrow', 'A Tomorrow of Your Own', 'There is still a tomorrow to consider. It need not carry the burden of proving what all the years before it meant.'],
], s => ageStage(s) === 'elder', { stage: 'elder' });

add('human', [
  ['many', 'Many Ways to Be Human', 'Human faces at {place} do not resolve into one people with one story. Even the word “ordinary” seems to mean a different life to everyone who uses it.'],
  ['years', 'A Brief Measure', 'Old stories measure ages in reigns and ruins. A human life knows more intimate measures: the first time a place felt familiar, and the last time a voice was heard.'],
  ['custom', 'A Custom Still Becoming', 'Human tales give cold ash many uses: a mark of mourning, a warning against the night, a trace left by a vanished hearth. Ordinary soot must carry a heavy burden in their telling.'],
], s => ancestry(s) === 'human' && s.age >= 10, { ancestry: 'human' });

add('elf', [
  ['ears', 'The Small Sounds', 'A small sound catches your attention beyond the general noise. Elven ears are unmistakable; what any one listener chooses to hear is less easily guessed.'],
  ['long', 'An Old Word in a New Mouth', 'An elven word can sound ancient without telling you how old its speaker is. In old forest tales, a word repeated beneath the wrong tree returns in a stranger’s voice.'],
  ['stories', 'Leaves in the Telling', 'Elven tales sometimes give trees a listener’s patience. You can enjoy the image without mistaking every moving leaf for a reply meant only for you.'],
], s => ancestry(s) === 'elf' && s.age >= 10, { ancestry: 'elf' });

add('dwarf', [
  ['stone', 'What Stone Gives Back', 'Stone carries a struck sound farther than a whisper. Dwarven stories find many meanings in that fact; the stone itself offers the same brief answer to every hand.'],
  ['hands', 'More Than a Craft', 'A dwarven tale speaks of a forge below the last worked gallery, where the hammer has never cooled. Some tellers call it a warning about greed; others stop before explaining it.'],
  ['pause', 'A Pause in the Work Song', 'In dwarven tellings, a pause can matter as much as a sounded note. Silence leaves room for listeners who would otherwise be drowned out by certainty.'],
], s => ancestry(s) === 'dwarf' && s.age >= 10, { ancestry: 'dwarf' });

add('halfling', [
  ['scale', 'A World Built Taller', 'At {place}, an ordinary ledge may be an awkward reach for a halfling. Familiarity is learning which parts of a place were made with your body in mind.'],
  ['home', 'The Size of a Hearth', 'Halfling stories can make a small hearth seem wide enough for the world. A lovely image does not decide where you must live or how much welcome you owe.'],
  ['road', 'The Long Road’s Small Steps', 'A halfling’s steps leave their own measure on a road. The distance ahead remains the same, however confidently another traveler describes it as a short walk.'],
], s => ancestry(s) === 'halfling' && s.age >= 10, { ancestry: 'halfling' });

add('orc', [
  ['hands', 'Empty Hands', 'An orc’s empty hands are still sometimes read as a threat. At {place}, the gap between what a body means and what a stranger assumes can be wide.'],
  ['strength', 'A Strength Left Unnamed', 'An orcish road tale gives its strongest figure no weapon and no name. All that survives is a hand held open at a dark threshold, waiting for someone else to speak.'],
  ['voice', 'Beyond the Old Challenge', 'An orcish tale may use the same words for a challenge and a vow, depending on its teller. A voice, an occasion and a chosen meaning matter more than a convenient label.'],
], s => ancestry(s) === 'orc' && s.age >= 10, { ancestry: 'orc' });

add('goblin', [
  ['view', 'Another Angle on Here', 'From a goblin’s height, familiar places reveal details taller people overlook. A worn lower stone and a gap beneath a door each hold their own small history.'],
  ['song', 'The Quiet Last Verse', 'In a goblin lullaby from old tales, the last verse is whispered so the things behind the wall will not learn the child’s name. Other versions give those things no meaning at all.'],
  ['clever', 'Before the First Question', 'A goblin can be called clever before anyone has heard an answer. It is a small reminder of how quickly admiration can become another expectation to satisfy.'],
], s => ancestry(s) === 'goblin' && s.age >= 10, { ancestry: 'goblin' });

add('tiefling', [
  ['outline', 'A Familiar Outline', 'Your outline is familiar to you. The meanings others imagine around a tiefling’s horns belong to their stories; they are not memories of anything you have done.'],
  ['light', 'The Candle and Its Shadow', 'A candle can throw a horned shadow from an entirely ordinary object. Old stories sometimes forget how easily light supplies what fear already expects to see.'],
  ['blood', 'An Inheritance Without a Verdict', 'Tiefling tales sometimes describe a mirror that reflects promises instead of faces. Its monstrous images belong to what was sworn, not to the horns of the person looking into it.'],
], s => ancestry(s) === 'tiefling' && s.age >= 10, { ancestry: 'tiefling' });

add('beastfolk', [
  ['faces', 'More Than a Familiar Animal', 'A beastfolk face can remind a stranger of an animal they think they understand. Resemblance gives them no knowledge of the person looking back.'],
  ['tracks', 'What a Track Can Tell', 'A track tells where a foot has pressed the ground. Old road tales ask it for motives, virtues and destiny; the earth has recorded none of those things.'],
  ['different', 'Difference Beside Difference', 'An old beastfolk tale gives the moon four different faces. The travelers disagree over which they saw, then discover they each tell a different truth about the same long night.'],
], s => ancestry(s) === 'beastfolk' && s.age >= 10, { ancestry: 'beastfolk' });

add('city', [
  ['walls', 'Between the City Sounds', 'At {place}, one sound rarely ends before another begins. In the gaps, you notice the stone’s colder hush, waiting underneath the life passing over it.'],
  ['height', 'Windows Above Windows', 'The city’s upper windows hold patches of sky you cannot see from every street. Each turn changes which fragment of the wider world is available.'],
], s => s.age >= 3 && site(s)?.type === 'city', { locationType: 'city' });

add('forest', [
  ['branches', 'Where the Branches Meet', 'At {place}, branches turn the sky into narrow shapes. An old path can feel certain beneath your feet while everything above it moves.'],
  ['root', 'The Unhurried Wood', 'A root has lifted the edge of an old track. The wood alters its roads without hurry, leaving travelers to decide whether a familiar way is still a sensible one.'],
], s => s.age >= 3 && site(s)?.type === 'forest', { locationType: 'forest' });

add('ruin', [
  ['door', 'A Door That Opens Into Sky', 'At {place}, a doorway survives the room it once guarded. The space beyond offers sky instead of shelter, and no voice explains which promise the threshold used to keep.'],
  ['marks', 'The Marks Below the Names', 'Old names in stone have softened until their smaller marks resemble ordinary wear. It is possible to stand close to a history and still be unable to read it.'],
], s => s.age >= 10 && site(s)?.type === 'ruin', { locationType: 'ruin' });

add('mountain', [
  ['distance', 'The Mountain’s False Nearness', 'At {place}, a distant ridge looks close in the clear outline of stone. The eye borrows certainty that the feet would need much longer to earn.'],
  ['sound', 'A Sound Carried Away', 'The open slopes give a voice room to travel. Then a turn of rock swallows it, and the mountains become quiet with startling speed.'],
], s => s.age >= 3 && site(s)?.type === 'mountain', { locationType: 'mountain' });

add('marsh', [
  ['reeds', 'The Reed Line', 'At {place}, the reeds hide where water becomes ground. Their movement tells you the air is passing; it does not tell you what will bear your weight.'],
  ['distance', 'Farther Than the Mist Allows', 'The marsh gives back fragments of distance: a stem, a pale edge, then nothing. Familiar landmarks become guesses when the air refuses to show what lies between them.'],
], s => s.age >= 3 && site(s)?.type === 'marsh' && /fog|mist/.test(weather(s)), { locationType: 'marsh' });

add('coast', [
  ['salt', 'The Harbor’s Long Breath', 'At {place}, the water folds against the shore and draws back. Even without a ship in view, the horizon leaves room for departures nobody here has yet named.'],
  ['line', 'The Moving Edge of Here', 'The coast has no single edge that stays where it was placed. A line of damp stone remembers the water’s earlier reach better than the water does.'],
], s => s.age >= 3 && site(s)?.type === 'coast', { locationType: 'coast' });

add('tower', [
  ['stairs', 'Above the Ordinary Roofs', 'At {place}, the tower gives the sky more space than the ground. Its height can make the lives below seem small without making their needs any smaller.'],
  ['stars', 'Questions Facing Upward', 'An observatory can hold careful knowledge and unanswered questions in the same room. The stars do not grow more obliging because people have learned their names.'],
], s => s.age >= 10 && site(s)?.type === 'tower', { locationType: 'tower' });

add('gate', [
  ['threshold', 'The Two Sides of a Gate', 'At {place}, the same threshold is an arrival from one side and a departure from the other. Stone gives neither view a stronger claim to be the whole story.'],
  ['hinge', 'Where the Stone Must Move', 'The gate’s great outline depends on small moving parts. A hinge carries what a carved crest can only announce.'],
], s => s.age >= 3 && site(s)?.type === 'gate', { locationType: 'gate' });

add('first_season', [
  ['turn', 'The First Turn of the Year', 'The year has entered its first season. At {place}, beginnings arrive among old habits; a new name on the calendar does not clear the ground of what came before.'],
  ['return', 'What Returns First', 'Some signs of the turning year are easier to recognize than others. You notice the ordinary ones before any grand promise of renewal.'],
], s => s.age >= 3 && seasonIndex(s) === 0, { seasonIndex: 0 });

add('second_season', [
  ['height', 'The Year at Its Height', 'The second season opens the middle of the year. At {place}, enough time has passed for early intentions to meet the ordinary demands that were waiting for them.'],
  ['time', 'A Season Still Unfinished', 'A season can feel settled long before it has finished changing. The calendar names a span of days; the days themselves refuse to become identical.'],
], s => s.age >= 3 && seasonIndex(s) === 1, { seasonIndex: 1 });

add('third_season', [
  ['count', 'What the Year Has Kept', 'The third season lends weight to what was kept and what was spent. At {place}, even an ordinary day begins to sound like part of an account not yet closed.'],
  ['edge', 'The Farther Side of the Year', 'The year has more days behind it than ahead. That fact changes the feeling of a familiar task without changing the task itself.'],
], s => s.age >= 3 && seasonIndex(s) === 2, { seasonIndex: 2 });

add('fourth_season', [
  ['late', 'The Late Season', 'The year enters its last season. Whatever its weather brings to {place}, the calendar is drawing a boundary through lives that will continue across it.'],
  ['ending', 'An Ending Made of Days', 'The year does not close all at once. It leaves through ordinary days, each carrying something too small to appear in a grand account of what happened.'],
], s => s.age >= 3 && seasonIndex(s) === 3, { seasonIndex: 3 });

const worked = (s, profession) => s.age >= 16 && s.hero?.profession === profession && (s.careers?.records?.[profession]?.workedDays || 0) > 0;
add('smith', [['work', 'Between the Hammer Strokes', 'Your blacksmith’s work leaves you attentive to the pause between sounds. A struck note says something different from the silence in which you decide where to strike next.']], s => worked(s, 'Blacksmith'), { profession: 'Blacksmith' });
add('farmer', [['work', 'A Farmer’s Unfinished Calendar', 'Your farming work teaches another measure of a day. A task can be finished while its result is still hidden, growing beyond the reach of a final decision.']], s => worked(s, 'Farmer'), { profession: 'Farmer' });
add('alchemist', [['work', 'A Clear Limit', 'In your alchemical work, an uncertain observation can be more useful than a confident mistake. The difficult part is sometimes allowing a question to remain visible.']], s => worked(s, 'Alchemist'), { profession: 'Alchemist' });
add('innkeeper', [['work', 'The Space Between Guests', 'Your innkeeping work gives ordinary pauses a particular sound. A room can hold the impression of a conversation after its speakers have gone elsewhere.']], s => worked(s, 'Innkeeper'), { profession: 'Innkeeper' });
add('miner', [['work', 'The Weight Above', 'Your mining work changes the way you look at a supported roof. The space people call empty depends on what continues to bear the weight around it.']], s => worked(s, 'Miner'), { profession: 'Miner' });
add('bard', [['work', 'Where the Verse Breathes', 'Your bard’s work makes the gap before a familiar line feel almost audible. Listeners arrive with expectations; a pause can let them notice those expectations for themselves.']], s => worked(s, 'Bard'), { profession: 'Bard' });
add('cartographer', [['work', 'The White Space on a Map', 'Your cartographic work leaves you aware of what a clean line omits. A route is easier to draw than the reasons different people may need to follow it.']], s => worked(s, 'Cartographer'), { profession: 'Cartographer' });
add('healer', [['work', 'The Words Before a Remedy', 'Your healing work contains questions that cannot be answered by the name of a remedy. What a person fears, understands and chooses belongs in the account too.']], s => worked(s, 'Healer'), { profession: 'Healer' });
add('scholar', [['work', 'A Margin Left Open', 'Your scholarly work gives an unanswered question a place to remain. An honest margin can be more useful to the next reader than a neat conclusion supported by wishful thought.']], s => worked(s, 'Scholar'), { profession: 'Scholar' });
add('herbalist', [['work', 'Beyond the Leaf’s Name', 'Your herbalist’s work leaves you attentive to differences within a familiar plant. A name helps begin an observation; it cannot take the place of looking.']], s => worked(s, 'Herbalist'), { profession: 'Herbalist' });

const livingRelative = s => storyPeople(s).find(p => p.role === 'relative');
const partner = s => storyPeople(s).find(p => p.id === s.life?.partnerId);
add('relative', [['voice', 'The Familiar Way of Speaking', '{name} has a familiar rhythm of speech. The words may change, but a pause in just the right place can make an ordinary sentence sound like home.']], s => s.age >= 3 && !!livingRelative(s), { actor: s => livingRelative(s)?.id, family: 'relative' });
add('partner', [['quiet', 'A Shared Kind of Quiet', 'Knowing {name} gives some silences a familiar shape. Familiarity is not the same as agreement; there is still room to ask what the other person means.']], s => s.age >= 18 && !!partner(s), { actor: s => partner(s)?.id, family: 'partner' });
add('children', [['future', 'The Life Beside Yours', 'A child in your household has a future that will not fit neatly inside your own. It is possible to care deeply about that life without knowing what it will become.']], s => s.age >= 18 && (s.life?.children || []).some(living), { family: 'children' });
add('friend', [['name', 'A Familiar Name in the Day', '{name} remains a living person in your world, beyond the last conversation you remember. A friendship contains separate days as well as the ones its people share.']], s => s.age >= 3 && storyPeople(s).some(p => p.role === 'friend'), { actor: s => storyPeople(s).find(p => p.role === 'friend')?.id, family: 'friend' });

export const ATMOSPHERE_VIGNETTES = Object.freeze(rows);

// Consumers may use this lookup for a vignette's optional named participant.
// It deliberately excludes dead actors and never manufactures a replacement.
export function immersiveStoryPerson(s, id) {
  return storyPeople(s).find(p => p.id === id) || null;
}
