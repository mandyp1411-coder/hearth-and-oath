import { childhoodMilestone } from './childhood-milestones.js';
import { seededRoll } from './world.js';

const PICKS = ['care', 'curiosity', 'courage'];
const SKILLS = ['weapons', 'defense', 'arcana', 'devotion', 'stealth', 'survival', 'scholarship', 'persuasion'];
const ATTRIBUTES = ['strength', 'agility', 'vitality', 'intellect', 'willpower', 'presence'];
const clamp = (n, low = 0, high = 100) => Math.max(low, Math.min(high, n));
const actor = (s, id) => s.life.people.find(p => p.id === id && p.alive !== false);
const carer = s => actor(s, 'kin') || s.life.people.find(p => p.alive !== false && ['parent', 'guardian'].includes(p.familyRole)) || s.life.people.find(p => p.alive !== false) || s.life.people[0];
const names = s => ({ kin: carer(s), friend: actor(s, 'fellow') || carer(s), rival: actor(s, 'rival') || actor(s, 'fellow') || carer(s), sibling: s.life.people.find(p => p.alive !== false && p.familyRole === 'sibling') || actor(s, 'fellow') || carer(s) });
const bond = (p, amount) => ({ bonds: { [p.id]: amount } });
const scene = (id, title, body, rows) => ({ id, title, body, choices: rows.map((r, i) => ({ id: PICKS[i], label: r[0], description: r[1], outcome: r[2], effect: r[3] || {} })) });
const flag = (key, value, extra = {}) => ({ ...extra, flags: { [key]: value } });
const birthOmen = s => s.campaign?.facts?.inheritedResolution ? '' : ({
  ember: 'Cold ash warms your blanket, although the hearth has been dark all night.',
  echo: 'An unpulled bell answers your first cry. The keeper reaches an empty tower.',
  thorn: 'A winter seed sprouts beside your cradle, its roots pointing toward the burial ground.',
})[s.campaign?.fate] || '';

function nurseryScenes(s, n) {
  const k = n.kin.name;
  if (s.age === 0) {
    const shelter = s.family?.setup === 'homeless' ? `The room above the charcoal shed has already been promised to another family. ${k} wraps you against the rain while a shelter bell sounds.` : s.family?.setup === 'orphan' ? `The shelter register leaves a space where a parent’s name should be. ${k} holds you while the keeper finishes the entry.` : `The midwife places you in ${k}’s arms.`;
    const omen = birthOmen(s);
    const options = [
      scene('birth-thread', 'The thread in your blanket', `${shelter} ${omen} A silver thread comes loose from the blanket's trim. Before the birth is entered in the register, ${k} must decide what to tell the keeper.`, [
        ['Show the keeper the thread', 'The keeper is still awake downstairs.', `The keeper wraps the thread in paper and writes a second, smaller line beneath your name. ${k} watches the ink dry.`, flag('birthThread', 'registered', { attributes: { presence: 1 }, ...bond(n.kin, 3) })],
        ['Keep it with the household keepsakes', 'There is room inside an old wooden box.', `${k} folds the thread into the box. By morning, the midwife has forgotten to ask about it.`, flag('birthThread', 'hidden', { attributes: { intellect: 1 } })],
        ['Unpick it from the blanket', 'A clean blanket is needed before morning.', `The thread catches on ${k}’s thumbnail, then comes loose. You sleep through the sound of it falling into the ashes.`, flag('birthThread', 'burned', { attributes: { vitality: 1 }, stress: -2 })],
      ]),
      scene('birth-knock', 'Three knocks after midnight', `${shelter} ${omen} A traveler who heard about the birth knocks after midnight. They carry a little carved bird and ask whether they may leave it for the child.`, [
        ['Let the traveler see you from the doorway', 'The lamp can stay between them and the cradle.', `The traveler sets a little bone bird on the sill. “For the child,” they say, before thanking ${k} for opening the door.`, flag('birthVisitor', 'bird', { attributes: { presence: 1 }, items: { boneBird: true } })],
        ['Ask for a name before opening', `${k} keeps a hand on the bolt.`, `Through the door comes a name that sounds like a place rather than a person. ${k} writes it on the back of the birth record.`, flag('birthVisitor', 'name', { attributes: { intellect: 1 } })],
        ['Keep the door bolted', 'There are enough strangers outside tonight.', `The knocking stops. At dawn, ${k} finds the little bird left beneath the doorstep, wrapped against the rain.`, flag('birthVisitor', 'closed', { attributes: { vitality: 1 }, ...bond(n.kin, 3) })],
      ]),
      scene('birth-bell', 'A second name in the register', `${shelter} ${omen} The keeper brings the birth register. Another household name has been penciled beneath the one ${k} chose. The keeper asks which should remain.`, [
        ['Use the name the household chose', 'The household has been saying it for months.', `${k} gives your name firmly. The keeper crosses out the other one, but presses too lightly to hide it completely.`, flag('birthName', 'household', { attributes: { presence: 1 }, ...bond(n.kin, 4) })],
        ['Ask the keeper to preserve both names', 'A second line can fit beneath the first.', `The keeper writes the unused name in the margin. Years later, the ink there is still darker than the rest.`, flag('birthName', 'margin', { attributes: { intellect: 1 } })],
        ['Leave the second name unwritten', 'The bell has stopped. It is time to go home.', `${k} carries you out before the keeper can ask again. Behind you, the tower door closes on an empty stair.`, flag('birthName', 'blank', { attributes: { vitality: 1 }, stress: -2 })],
      ]),
    ];
    return options;
  }
  if (s.age === 1) return [
    scene('winter-shift', 'The last warm hour', `${k} has been offered night work. The pay would replace a cracked window, but the only person available to watch you is a neighbor you have met once. Tonight, you wake whenever the candle is moved.`, [
      ['Take the shift and leave the familiar blanket', 'The neighbor agrees to sit by the cradle.', `The window is patched before the frost. For a while, you cry whenever ${k} lifts the blanket from its peg.`, flag('earlyCare', 'neighbor', { money: 8, stress: 3, attributes: { vitality: 1 } })],
      ['Stay home and mend the window with cloth', 'There is no spare pane in the house.', `${k} hums until you sleep. Cold air moves behind the cloth all winter.`, flag('earlyCare', 'close', { ...bond(n.kin, 6), happiness: 3, attributes: { presence: 1 } })],
      ['Ask the communal hearth for a place', 'The hearthkeeper has one bench left.', `You spend the winter among unfamiliar voices. One of their songs becomes the first tune you recognize.`, flag('earlyCare', 'hearth', { skills: ['devotion'], attributes: { intellect: 1 } })],
    ]),
    scene('cradle-song', 'The song at the cradle', `${k} catches you laughing at a song the household usually sings very quietly. A visiting relative says the old words ought to be forgotten.`, [
      ['Keep singing the old words', 'You settle when the familiar tune returns.', `The visiting relative leaves before supper. ${k} sings more quietly after that, but never changes the words.`, flag('cradleSong', 'kept', { attributes: { presence: 1 }, ...bond(n.kin, 5) })],
      ['Sing the tune with different words', 'There is an ordinary lullaby that fits.', `The tune remains. Years later, you know exactly where the new words do not quite fit.`, flag('cradleSong', 'changed', { attributes: { intellect: 1 } })],
      ['Put the song away', 'A story might soothe you instead.', `The house is quiet that evening. ${k} turns the songbook face down beneath the lamp.`, flag('cradleSong', 'silenced', { attributes: { vitality: 1 }, stress: 2 })],
    ]),
  ];
  return [
    scene('first-word', 'A word nobody taught you', `You point at the cold fireplace and say a word ${k} has never used. The household argues about whether you heard it in the street. You keep saying it.`, [
      ['Write the word down as it sounds', `${k} reaches for a scrap of paper.`, `The scrap is kept with the birth record. You forget the word before anyone finds out what it means.`, flag('firstWord', 'recorded', { attributes: { intellect: 1 } })],
      ['Turn it into a game', 'Everyone takes a turn making strange sounds.', `You laugh until you hiccup. Nobody asks again why you first said the word.`, flag('firstWord', 'game', { happiness: 5, attributes: { presence: 1 } })],
      ['Teach you the ordinary word for fire', 'The old word is not repeated.', `You learn “fire.” For several nights afterward, you point into the ashes without speaking.`, flag('firstWord', 'corrected', { attributes: { willpower: 1 }, stress: 2 })],
    ]),
    scene('little-boots', 'Boots at the threshold', `You insist on following ${k} outside. Your boots are too large, and the puddle beyond the door looks much deeper from where you stand.`, [
      ['Carry you across the puddle', `${k} is already late.`, `You hold tightly to ${k}’s collar and watch the ground pass beneath you.`, flag('firstOutside', 'carried', { ...bond(n.kin, 5), attributes: { presence: 1 } })],
      ['Let you try with a hand to hold', 'There is time for one small crossing.', `You make it halfway before both boots fill with water. You are furious when ${k} laughs, then laugh too.`, flag('firstOutside', 'tried', { attributes: { agility: 1 }, happiness: 2 })],
      ['Leave you with the neighbor this time', 'The errand cannot wait for the boots.', `You cry at the closing door. The neighbor shows you how to tap a spoon against a cup until you forget the puddle.`, flag('firstOutside', 'waited', { attributes: { willpower: 1 }, stress: 3, skills: ['scholarship'] })],
    ]),
  ];
}

function smallChildScenes(s, n) {
  const f = n.friend.name, r = n.rival.name, k = n.kin.name;
  return [
    scene('wooden-hare', 'A hare with one wooden ear', `${f} trades you a wooden hare for a ribbon. By supper, ${f} wants it back. You have already painted its remaining ear red.`, [
      ['Give the hare back', 'The paint is still wet.', `${f} carries it home without looking at the red ear. The next day, it is sitting in the window with your ribbon tied around its neck.`, flag('hare', 'returned', { ...bond(n.friend, 6), skills: ['persuasion'] })],
      ['Hide it beneath your bedding', 'There is a loose floorboard beside your bed.', `You hear ${f} asking ${k} whether anyone has seen it. You lie very still above the floorboard.`, flag('hare', 'hidden', { ...bond(n.friend, -6), skills: ['stealth'], items: { woodenHare: true }, stress: 3 })],
      ['Offer to take turns keeping it', 'You can bring it tomorrow.', `${f} agrees, then asks whether the red ear counts as your turn. You argue until the supper bell.`, flag('hare', 'shared', { ...bond(n.friend, 2), skills: ['scholarship'] })],
    ]),
    scene('blackberry-rule', 'The blackberry rule', `${r} says you cannot join the other children unless you bring a bowl of blackberries from behind the keeper’s fence. ${f} has already climbed through.`, [
      ['Climb after them', 'The fence is low where the old wood has rotted.', `Your sleeve tears on the fence. The berries stain your mouth purple, and ${r} finally makes room in the game.`, flag('blackberryClub', 'inside', { ...bond(n.rival, 5), skills: ['stealth'], health: -2 })],
      ['Tell the keeper where they went', 'The keeper is stacking logs nearby.', `The keeper brings them out by the hands. ${f} will not look at you for the rest of the afternoon.`, flag('blackberryClub', 'told', { ...bond(n.friend, -8), ...{ bonds: { [n.friend.id]: -8, [n.kin.id]: 3 } }, skills: ['devotion'] })],
      ['Start a game on the other side of the road', 'One younger child is still waiting outside.', `By the time the berry bowl appears, your game has three players. ${r} watches for a while before going home.`, flag('blackberryClub', 'elsewhere', { skills: ['persuasion'], happiness: 3 })],
    ]),
    scene('moth-in-jar', 'The moth in the jar', `${k} leaves a jar on the shelf. A pale moth beats against its lid whenever the lamps go out. ${f} dares you to open it.`, [
      ['Lift the lid after bedtime', 'You can reach it from the stool.', `The moth brushes your cheek. In the morning, its shape is printed in frost on the window.`, flag('moth', 'freed', { skills: ['arcana'], stress: 2 })],
      ['Keep the jar beside your bed', 'The moth is quieter when you hum.', `You fall asleep counting the taps against the glass. ${k} finds the jar beneath your pillow at dawn.`, flag('moth', 'kept', { skills: ['scholarship'], items: { mothJar: true }, ...bond(n.kin, -3) })],
      ['Tell the household about the tapping', `${k} has been looking for the jar.`, `${k} takes it away without explaining why. That night, the shelf seems too empty.`, flag('moth', 'surrendered', { ...bond(n.kin, 4), attributes: { willpower: 1 } })],
    ]),
    scene('fox-bread', 'Bread for the fox', `A fox waits beyond the laundry line. You have been saving the end of your bread for it. Today, ${k} says there is no second loaf.`, [
      ['Leave your bread anyway', 'The fox has learned where to wait.', `The fox takes the bread from your open hand. You go to sleep hungry, wondering whether it will remember you.`, flag('fox', 'fed', { skills: ['survival'], health: -2, items: { foxFriend: true } })],
      ['Eat the bread and chase it off', 'It is only a fox.', `It waits a long time before leaving. When ${k} asks whether you ate, you nod.`, flag('fox', 'chased', { attributes: { vitality: 1 }, happiness: -2 })],
      ['Ask the cook for something the fox can eat', 'The cook has a bucket of scraps.', `The cook gives you a fish head, then makes you wash the bucket. The fox comes back the next evening.`, flag('fox', 'scraps', { skills: ['persuasion'], ...bond(n.kin, 2) })],
    ]),
    scene('broken-cup', 'The cup beneath the table', `${f} knocks over the cup ${k} keeps for guests. When footsteps sound outside, ${f} asks you to say the cat did it.`, [
      ['Say you broke the cup', `${f} is waiting for your answer.`, `${k} makes you sweep the pieces. ${f} brings you a polished stone the next day and says nothing about the cup.`, flag('cup', 'covered', { ...bond(n.friend, 8), ...{ bonds: { [n.friend.id]: 8, [n.kin.id]: -3 } }, stress: 3 })],
      ['Tell what happened', 'The pieces are still on the floor.', `${f} has to carry the broken cup home. For a week, your seat in the game stays empty.`, flag('cup', 'told', { ...bond(n.friend, -5), skills: ['devotion'] })],
      ['Try to fit the pieces together first', 'You have paste from the lesson table.', `The cup holds together until ${k} pours water into it. The puddle makes both of you laugh before anyone speaks.`, flag('cup', 'mended', { skills: ['survival'], happiness: 3, ...bond(n.kin, 2) })],
    ]),
    scene('supper-seat', 'The empty seat at supper', `${n.sibling.name} has put a bowl in the chair you always use. “It’s mine today,” they say. ${k} is too tired to settle the argument.`, [
      ['Move the bowl back', 'You were there first yesterday.', `The bowl hits the floor. No one finishes supper in the place they meant to sit.`, flag('supperSeat', 'fought', { ...bond(n.sibling, -5), happiness: -3, attributes: { strength: 1 } })],
      ['Take another chair', 'There is a stool near the cold doorway.', `Halfway through supper, ${n.sibling.name} pushes their warm roll onto your plate.`, flag('supperSeat', 'yielded', { ...bond(n.sibling, 5), skills: ['persuasion'] })],
      ['Sit in the chair together', 'It might be wide enough.', `The chair tips. ${k} catches it, then makes you both stand until you stop laughing.`, flag('supperSeat', 'shared', { ...bond(n.sibling, 3), happiness: 5, attributes: { agility: 1 } })],
    ]),
  ];
}

function schoolScenes(s, n) {
  const f = n.friend.name, r = n.rival.name, k = n.kin.name;
  const place = s.education?.enrolled ? 'after the lesson' : 'at the free reading table';
  return [
    scene('ink-blot', 'The blot on the attendance sheet', `You find ${r} changing an absence mark on the attendance sheet ${place}. “I was helping at home,” they say. The reader’s footsteps are already on the stairs.`, [
      ['Let them finish', 'You can keep watch at the door.', `${r} slides the sheet back. Later, they save a place for you beside the window.`, flag('attendanceSecret', 'kept', { ...bond(n.rival, 9), skills: ['stealth'] })],
      ['Ask them to explain to the reader', 'You can stay beside them.', `${r} explains, badly at first. The mark stays on the sheet. They blame you until the reader offers to send work home.`, flag('attendanceSecret', 'heard', { ...bond(n.rival, -3), skills: ['persuasion'], stress: 2 })],
      ['Report the altered mark', 'The reader is nearly at the door.', `${r} has to rewrite the whole page. Afterward, your name appears in a rhyme the other pupils whisper.`, flag('attendanceSecret', 'reported', { ...bond(n.rival, -10), skills: ['devotion'], happiness: -3 })],
    ]),
    scene('borrowed-page', 'The page between the covers', `${f} lends you a book with a loose page inside. It describes how to call a dead person by a name nobody else knows. The page is not part of the printed book.`, [
      ['Keep the page and return the book', 'There is a hollow behind your bedpost.', `${f} asks whether the page was there when you opened it. You say the book had several loose leaves.`, flag('borrowedPage', 'kept', { skills: ['arcana', 'stealth'], ...bond(n.friend, -2), items: { loosePage: true } })],
      ['Read it together before returning it', 'The reading table is empty after dusk.', `${f} stops at the line about the secret name. Neither of you tries the words aloud.`, flag('borrowedPage', 'shared', { skills: ['arcana', 'scholarship'], ...bond(n.friend, 5) })],
      ['Give the page to the reader', 'The reader knows the owner’s handwriting.', `The reader folds it without reading aloud. ${f} says the book had belonged to their grandmother.`, flag('borrowedPage', 'given', { skills: ['devotion'], ...bond(n.friend, -6) })],
    ]),
    scene('chalk-answer', 'The answer in the chalk dust', `${f} scratches tomorrow’s examination answers into a patch of chalk dust. They offer to show you before the floor is swept. You have only finished half the lessons.`, [
      ['Memorize the answers', 'There are only six lines.', `You finish before the other pupils. When the reader asks how you found the last answer, the room goes quiet.`, flag('examDust', 'copied', { skills: ['stealth'], stress: 5, ...bond(n.friend, 3) })],
      ['Ask for help with the unfinished lessons', 'The reader is still packing the lesson box.', `You stay after the others leave. ${f} sweeps the answers away before joining you.`, flag('examDust', 'studied', { skills: ['scholarship'], ...bond(n.friend, 2), happiness: -1 })],
      ['Skip the examination', 'There is a festival outside the school wall.', `You hear the festival drums all afternoon. The next lesson begins with an empty space beside your name.`, flag('examDust', 'skipped', { skills: ['survival'], happiness: 5, ...bond(n.kin, -4) })],
    ]),
    scene('slate-society', 'A mark on your slate', `Someone draws a little crown on your slate. ${r} says everyone with the mark is invited to a secret gathering. ${f} has not received one.`, [
      ['Go without telling your friend', 'The gathering begins behind the granary.', `${r} shows you the club’s hand sign. You tuck the marked slate away before seeing ${f}.`, flag('slateClub', 'joined', { ...bond(n.rival, 7), ...{ bonds: { [n.rival.id]: 7, [n.friend.id]: -3 } }, skills: ['stealth'] })],
      ['Bring your friend along', 'The invitation does not mention guests.', `The door closes before either of you gets inside. ${f} walks home beside you anyway.`, flag('slateClub', 'friend', { ...bond(n.friend, 8), ...{ bonds: { [n.friend.id]: 8, [n.rival.id]: -4 } }, skills: ['persuasion'] })],
      ['Erase the mark', 'The slate needs cleaning for tomorrow.', `${r} looks at your blank slate, then puts theirs face down. Nobody mentions the gathering again.`, flag('slateClub', 'erased', { attributes: { willpower: 1 }, ...bond(n.rival, -2) })],
    ]),
    scene('missing-coins', 'Coins in the flour sack', `You find three coins tucked inside a flour sack. ${k} has been counting the pantry supplies all week. The traveling puppet show costs exactly three coins.`, [
      ['Take the coins to the puppet show', 'The painted cart leaves tomorrow.', `The puppeteer lets you hold a wooden knight. At home, ${k} counts the supplies again without speaking.`, flag('flourCoins', 'spent', { skills: ['persuasion'], happiness: 5, ...bond(n.kin, -7) })],
      ['Bring the sack to your caregiver', 'The coins might have been lost there.', `${k} closes a hand around the coins. You are given a little more bread at supper.`, flag('flourCoins', 'returned', { ...bond(n.kin, 6), happiness: 2 })],
      ['Ask the puppeteer whether you can help', 'Someone must carry the folding benches.', `You spend half the show holding a lantern, but the puppeteer lets you watch the ending from the cart.`, flag('flourCoins', 'worked', { skills: ['survival'], money: 2, health: -1 })],
    ]),
    scene('wrong-prayer', 'A prayer with the wrong ending', `The reader asks you to recite a prayer. Halfway through, you recognize the tune ${k} sings at home. Its last line in the schoolbook is different.`, [
      ['Sing the household’s ending', 'You know every word of it.', `A visiting keeper interrupts before the last word. The reader closes the book and asks you to stay afterward.`, flag('prayer', 'household', { skills: ['devotion'], stress: 3, ...bond(n.kin, 4) })],
      ['Recite what is printed', 'Everyone is following the schoolbook.', `The visitor nods. You hear ${k}’s version in your head all the way home.`, flag('prayer', 'printed', { skills: ['scholarship'], happiness: -1 })],
      ['Ask why the endings disagree', 'The reader turns the page to find a note.', `There is no note. The reader asks you to bring the household songbook next time, then lowers their voice when the visitor turns.`, flag('prayer', 'questioned', { skills: ['arcana', 'scholarship'] })],
    ]),
    scene('ditch-bet', 'The jump across the ditch', `${r} bets a copper that you cannot jump the ditch behind the lesson hall. ${f} says it is wider than it looks. Your good shoes are still dry.`, [
      ['Take the running jump', 'The far bank is muddy.', `You land with one foot on the far bank and one in the water. ${r} gives you the copper anyway.`, flag('ditch', 'jumped', { attributes: { agility: 1 }, skills: ['survival'], money: 1, health: -3 })],
      ['Ask your rival to jump first', 'They made the bet.', `${r} backs up, measures the gap, then says the bet is canceled. ${f} laughs until the reader opens the window.`, flag('ditch', 'turned', { skills: ['persuasion'], ...bond(n.rival, -4), happiness: 2 })],
      ['Keep your copper and walk around', 'There is a bridge beyond the hedge.', `You reach the other bank before they settle who should jump. Nobody wins the copper.`, flag('ditch', 'bridge', { skills: ['defense'], attributes: { willpower: 1 } })],
    ]),
    scene('window-seat', 'The lesson beyond the window', `A traveling mason is repairing the old arch outside your lesson room. Every strike of the hammer shakes chalk from the wall. The reader notices you watching.`, [
      ['Ask to learn outside with the mason', 'The reader has not finished the lesson.', `You carry mortar and learn why the stones do not fall. The reader makes you finish the missed page before going home.`, flag('firstCraft', 'masonry', { skills: ['survival', 'defense'], stress: 2 })],
      ['Keep watching without asking', 'The mason is lifting the final stone.', `You miss the question addressed to you. ${r} answers it first and grins at the window.`, flag('firstCraft', 'watched', { skills: ['weapons'], ...bond(n.rival, -2) })],
      ['Close the shutter and finish the page', 'The room will be quieter.', `When the lesson ends, the mason is gone. The arch stands where the broken wall used to be.`, flag('firstCraft', 'lesson', { skills: ['scholarship'], happiness: -1 })],
    ]),
  ];
}

function olderChildScenes(s, n) {
  const f = n.friend.name, r = n.rival.name, k = n.kin.name;
  return [
    scene('forge-invitation', 'Sparks on a borrowed apron', `A smith offers to teach you after the market closes. ${f} has already promised you a place in the festival performance that same evening. The smith will travel tomorrow.`, [
      ['Stay at the forge', 'The smith has set aside a small piece of iron.', `The iron becomes a crooked hook. From the festival square, you hear the part ${f} had saved for you being sung by someone else.`, flag('training', 'forge', { skills: ['weapons', 'survival'], ...bond(n.friend, -5), items: { firstHook: true } })],
      ['Keep your promise to your friend', 'There is no time to do both.', `You forget two lines, but ${f} whispers them to you. The next morning, the forge is cold.`, flag('training', 'stage', { skills: ['persuasion'], happiness: 4, ...bond(n.friend, 5) })],
      ['Ask your rival to take your part', `${r} knows most of the words.`, `${r} agrees on one condition: their name goes first on the festival board. You return from the forge to hear the applause.`, flag('training', 'delegated', { skills: ['weapons'], ...bond(n.rival, 4), ...{ bonds: { [n.rival.id]: 4, [n.friend.id]: -2 } } })],
    ]),
    scene('plum-vendor', 'The vendor’s sleeping hand', `A vendor falls asleep beside a basket of winter plums. ${r} says the bruised ones will be thrown away anyway. You have been thinking about the basket all afternoon.`, [
      ['Take one from the bottom', 'The vendor’s hand is resting on the coin box.', `You eat it behind the cart. The stone stays in your pocket all day, sticky and difficult to forget.`, flag('plum', 'taken', { skills: ['stealth'], happiness: 3, stress: 2 })],
      ['Wake the vendor and ask for the bruised fruit', 'They may be willing to sell it cheaply.', `The vendor gives you two plums after you help cover the cart. ${r} says you took too long.`, flag('plum', 'asked', { skills: ['persuasion'], ...bond(n.rival, -2) })],
      ['Leave it and spend the afternoon elsewhere', 'There is another lane beyond the market.', `You find a quiet yard where a mason is cutting letters into a gravestone. They let you trace a practice letter in the dust.`, flag('plum', 'left', { skills: ['scholarship', 'devotion'] })],
    ]),
    scene('family-letter', 'A letter that was not meant for you', `${k} leaves a letter open beside a candle. The first line asks whether the household can repay what it borrowed. You have never heard the sender’s name.`, [
      ['Read the rest before the candle burns down', 'The footsteps upstairs have stopped.', `There is a date at the bottom and a place you recognize. You fold the letter exactly as you found it.`, flag('householdDebt', 'read', { skills: ['scholarship', 'stealth'], stress: 4 })],
      ['Ask your caregiver about the sender', 'The candle is still burning.', `${k} sits down heavily. “I hoped you would be older before this,” they say, and make room on the bench.`, flag('householdDebt', 'shared', { ...bond(n.kin, 6), stress: 3, skills: ['persuasion'] })],
      ['Turn the letter face down', 'It was not addressed to you.', `At supper, ${k} notices the folded letter and seems about to say something. They ask whether you need more bread instead.`, flag('householdDebt', 'unread', { ...bond(n.kin, 3), attributes: { willpower: 1 } })],
    ]),
    scene('private-name', 'The name your rival keeps', `${r} admits that the name on their lesson slate is not the one their family uses. They ask you to use it outside the lesson hall too. ${f} is coming down the lane.`, [
      ['Use the name when your friend arrives', 'Your rival has asked you to.', `${f} repeats the name once to get it right. ${r} relaxes their grip on the slate.`, flag('rivalName', 'used', { ...bond(n.rival, 8), skills: ['persuasion'] })],
      ['Ask why they waited to tell you', 'You had thought you knew them.', `${r} explains until dusk. They tell you one thing about home you had never guessed.`, flag('rivalName', 'heard', { ...bond(n.rival, 5), skills: ['scholarship'] })],
      ['Say you would rather use the old name', 'It is what you are used to saying.', `${r} takes the slate back. Later, they speak to ${f} while you stand on the other side of the road.`, flag('rivalName', 'refused', { ...bond(n.rival, -12), happiness: -2 })],
    ]),
    scene('river-lesson', 'Lessons in the river', `${f} is skipping the afternoon lesson to swim. It is the first warm day in weeks. Your reader said the next page would begin the part of the subject you had been waiting for.`, [
      ['Go to the river', 'Your friend has brought a spare towel.', `The water is painfully cold. You dry in the grass until the lesson bell has stopped ringing.`, flag('riverLesson', 'swam', { skills: ['survival'], happiness: 5, ...bond(n.friend, 5), health: -2 })],
      ['Go to the lesson', 'The new page is already on the desk.', `The lesson is difficult enough to fill the afternoon. ${f} leaves a wet towel on your doorstep afterward.`, flag('riverLesson', 'stayed', { skills: ['scholarship', 'arcana'], ...bond(n.friend, -2) })],
      ['Ask your friend to wait until the lesson ends', 'The sun will still be up.', `${f} complains, but waits. By the time you reach the river, the best bank is crowded.`, flag('riverLesson', 'later', { skills: ['persuasion'], ...bond(n.friend, 2), happiness: 2 })],
    ]),
    scene('measuring-door', 'A mark above your head', `${k} marks your height on the doorframe. An old line is labeled with a name nobody uses now. It is almost exactly where your head reaches.`, [
      ['Ask whose name it was', 'Your caregiver has put the knife away.', `${k} touches the old mark. The answer comes slowly, and does not sound like the version neighbors tell.`, flag('doorName', 'asked', { ...bond(n.kin, 5), skills: ['scholarship'] })],
      ['Copy the name to ask about elsewhere', 'You can make out most of the letters.', `You rub charcoal across a scrap of paper. ${k} watches but does not ask to see it.`, flag('doorName', 'copied', { skills: ['stealth', 'scholarship'], items: { doorRubbing: true } })],
      ['Carve your own mark beside it', 'There is room on the wood.', `Your mark is uneven. ${k} dates it carefully, leaving the old name untouched.`, flag('doorName', 'marked', { skills: ['survival'], happiness: 2 })],
    ]),
    scene('borrowed-sword', 'A sword too heavy for you', `A retired guard lets you hold their old sword. ${r} asks you to show them a real stroke. The guard has turned to greet someone at the gate.`, [
      ['Try the stroke', 'Your rival is standing well clear.', `The point bites into a fence post and sticks. The guard pulls it free, then asks you to show how you were holding it.`, flag('swordLesson', 'tried', { skills: ['weapons'], health: -3, stress: 2 })],
      ['Wait for the guard to show you', 'The sword is difficult to keep level.', `The guard begins with where to put your feet. ${r} loses interest before the first proper stroke.`, flag('swordLesson', 'trained', { skills: ['weapons', 'defense'], ...bond(n.rival, -1) })],
      ['Give the sword to your rival', 'They have been asking for a turn.', `${r} discovers how heavy it is. You both set it down before the guard turns back.`, flag('swordLesson', 'shared', { ...bond(n.rival, 5), skills: ['persuasion'] })],
    ]),
    scene('market-prize', 'Your work under someone else’s name', `A small piece you made appears on the market demonstration table. ${r} has entered it under their own name. The judge has already pinned a ribbon beside it.`, [
      ['Tell the judge you made it', 'Your tool marks are still visible underneath.', `The judge turns it over and removes the ribbon. ${r} leaves before anyone can ask who entered the piece.`, flag('marketCredit', 'claimed', { ...bond(n.rival, -8), skills: ['scholarship'], money: 5 })],
      ['Speak to your rival before the judging ends', 'They are standing behind the crowd.', `${r} argues until you show the tool marks. A second name is squeezed onto the entry card.`, flag('marketCredit', 'shared', { ...bond(n.rival, 3), skills: ['persuasion'], money: 3 })],
      ['Let the entry stand', 'The ribbon is already in place.', `${r} thanks you privately. Their name is called from the judging table while you watch.`, flag('marketCredit', 'yielded', { ...bond(n.rival, 7), happiness: -3, stress: 2 })],
    ]),
  ];
}

function teenScenes(s, n) {
  const f = n.friend.name, r = n.rival.name, k = n.kin.name;
  return [
    scene('night-invitation', 'A lantern beneath your window', `${f} taps your window after the household goes quiet. A gathering has begun in the disused watchtower. You were told to finish an errand before dawn.`, [
      ['Climb out with your friend', 'The gathering will not last all night.', `You return after the first bell. The errand basket is waiting by the door, and ${k} is already awake.`, flag('watchtowerNight', 'went', { ...bond(n.friend, 7), ...{ bonds: { [n.friend.id]: 7, [n.kin.id]: -6 } }, skills: ['stealth'], happiness: 4, stress: 3 })],
      ['Ask your friend to help finish the errand first', 'The basket is nearly packed.', `${f} complains until you offer them the first sweet roll. You reach the gathering in time to hear its last song.`, flag('watchtowerNight', 'late', { skills: ['survival', 'persuasion'], ...bond(n.friend, 3) })],
      ['Stay and close the shutter', 'The household has enough to do tomorrow.', `${f} pauses beneath the window, then goes alone. They do not mention the gathering next time you meet.`, flag('watchtowerNight', 'stayed', { ...bond(n.kin, 5), ...{ bonds: { [n.kin.id]: 5, [n.friend.id]: -4 } }, attributes: { willpower: 1 } })],
    ]),
    scene('rooftop-message', 'Two initials in the wax', `A folded note arrives with no name on the outside. Inside, someone has pressed two initials into the wax and asked to meet you on the granary roof. ${f} pretends not to notice you reading it.`, [
      ['Go to the roof', 'The ladder is behind the granary.', `${f} is already there, looking at the road. You talk until it is too dark to read the note again.`, flag('firstAffection', 'met', { ...bond(n.friend, 8), happiness: 5, skills: ['persuasion'] })],
      ['Ask your friend about the initials', 'You can speak before anyone climbs a ladder.', `${f} reddens and asks whether you would rather meet somewhere with chairs. The note stays folded between you.`, flag('firstAffection', 'asked', { ...bond(n.friend, 5), skills: ['persuasion'], happiness: 2 })],
      ['Leave the note unanswered', 'It may be easier to pretend it did not arrive.', `${f} stops glancing at your hands. For a while, they invite other people to sit beside them.`, flag('firstAffection', 'silent', { ...bond(n.friend, -5), stress: 2 })],
    ]),
    scene('paid-road', 'One packet, no questions', `A messenger offers you coin to carry a sealed packet across the market. They insist it stay inside your coat. The seal belongs to an institution you know, but has been stamped upside down.`, [
      ['Carry it without opening it', 'The messenger wants an answer now.', `The recipient pays you before breaking the seal. You hear an argument start behind the closing door.`, flag('sealedPacket', 'carried', { money: 18, skills: ['survival'], stress: 3 })],
      ['Ask why the seal is upside down', 'The messenger keeps looking toward the gate.', `The messenger takes the packet back. As they leave, they say you would make a troublesome apprentice.`, flag('sealedPacket', 'questioned', { skills: ['scholarship'], happiness: -1 })],
      ['Take the packet to your caregiver', `${k} has dealt with official letters before.`, `${k} studies the seal and sends for someone you have never met. The packet is gone before supper.`, flag('sealedPacket', 'household', { ...bond(n.kin, 5), skills: ['devotion'] })],
    ]),
    scene('apprentice-price', 'A place with a price', `A maker offers you an apprenticeship trial. You would work the busiest evenings, including the one ${f} has set aside for their own celebration. The maker asks whether you can begin immediately.`, [
      ['Begin tonight', 'There is unfinished work on the bench.', `You learn to finish the edges the maker never has time to explain. ${f}’s celebration is over when you arrive.`, flag('apprenticeTrial', 'began', { skills: ['weapons', 'survival'], money: 10, ...bond(n.friend, -6), stress: 3 })],
      ['Ask to begin after the celebration', 'The maker has other applicants.', `The maker says they will keep the place open until morning. You spend the celebration checking how late it has become.`, flag('apprenticeTrial', 'negotiated', { skills: ['persuasion'], ...bond(n.friend, 4), stress: 1 })],
      ['Choose something with quieter hours', 'The trial is an invitation, not a promise.', `The maker nods and returns to the bench. You walk out wondering which part of the offer you wanted most.`, flag('apprenticeTrial', 'declined', { attributes: { willpower: 1 }, stress: -4, happiness: 2 })],
    ]),
    scene('well-name', 'A voice from the dry well', `At the old well, a voice calls the household name you use only at home. ${r} hears it too. They say you should drop a coin and ask a question.`, [
      ['Ask who is speaking', 'The well has been dry for years.', `The voice repeats your question in a different tone. ${r} leaves before it repeats it a third time.`, flag('wellVoice', 'answered', { skills: ['arcana', 'scholarship'], stress: 3, ...bond(n.rival, -2) })],
      ['Drop a stone and count the echoes', 'There may be a passage beneath the well.', `The stone strikes water somewhere very deep. You and ${r} count different numbers of echoes.`, flag('wellVoice', 'tested', { skills: ['survival', 'scholarship'], ...bond(n.rival, 3) })],
      ['Leave with your rival', 'Neither of you needs to stay here.', `The voice says nothing as you leave. ${r} does not joke about the well on the walk home.`, flag('wellVoice', 'left', { skills: ['defense'], ...bond(n.rival, 5), stress: -2 })],
    ]),
    scene('rival-offer', 'Your rival’s unexpected offer', `${r} has found a patron for a piece of work you both studied. They offer to take you along, but say the patron expects only one of you to speak.`, [
      ['Let your rival make the introduction', 'They found the patron.', `${r} talks too quickly, then stops when the patron asks you a question. You answer before they can begin again.`, flag('patronVisit', 'rival', { ...bond(n.rival, 5), skills: ['scholarship'], money: 6 })],
      ['Insist you speak for your own work', 'You know which part you made.', `The patron hears two versions of the same story. They pay for the work but do not offer another meeting.`, flag('patronVisit', 'insisted', { ...bond(n.rival, -5), skills: ['persuasion'], money: 10, stress: 2 })],
      ['Decline and finish something of your own', 'There is still work on your table.', `${r} returns with a new coat. You finish your own piece two days later and turn it over until the light catches it.`, flag('patronVisit', 'own', { skills: ['survival'], happiness: 3, items: { ownWork: true } })],
    ]),
    scene('household-expectation', 'The future at the supper table', `${k} has told a neighbor that you will take up the household’s kind of work. You hear the neighbor congratulating you before you have been asked.`, [
      ['Agree to try the work for a while', 'Your caregiver has already cleared a place.', `${k} brings out an old tool wrapped in cloth. It has been cleaned far more carefully than the other tools.`, flag('householdFuture', 'tried', { ...bond(n.kin, 7), skills: ['survival'], items: { familyTool: true } })],
      ['Explain the work you actually want', 'The neighbor is still at the table.', `${k} listens without touching their supper. Later, they ask what your first step would be.`, flag('householdFuture', 'own', { ...bond(n.kin, -2), skills: ['persuasion'], happiness: 3 })],
      ['Say nothing until the neighbor leaves', 'The conversation can wait until later.', `The neighbor tells two other households before you get a private moment. ${k} apologizes for one version of the story, but not the other.`, flag('householdFuture', 'waited', { skills: ['stealth'], stress: 3 })],
    ]),
    scene('empty-shrine', 'A vow nobody asked for', `A shrine attendant has left an old ceremonial sword beside an empty oath book. ${f} says you could write a vow tonight, before any order is able to tell you what it ought to say.`, [
      ['Write a promise to someone living', 'You can name the person you mean.', `${f} watches you write. Before you leave, they ask whether you want them to witness it.`, flag('privateVow', 'person', { skills: ['devotion'], ...bond(n.friend, 5), items: { privateVow: true } })],
      ['Write a question instead of a vow', 'The book still has many empty pages.', `Your question looks small on the wide page. The next morning, someone has drawn a line beneath it without answering.`, flag('privateVow', 'question', { skills: ['arcana', 'scholarship'] })],
      ['Close the book', 'A promise can wait until you know what it means.', `You leave the sword where it was. ${f} walks beside you until the shrine lamps disappear behind the road.`, flag('privateVow', 'unwritten', { attributes: { willpower: 1 }, ...bond(n.friend, 2) })],
    ]),
  ];
}

function callbackScene(s, n) {
  const flags = s.timeline.storybook?.flags || {}, f = n.friend.name, r = n.rival.name, k = n.kin.name;
  if (s.age >= 6 && s.age <= 8 && flags.hare && !flags.hareReturned) return scene('hare-return', 'The red ear in the window', flags.hare === 'hidden' ? `${f} has stopped asking about the wooden hare. Today, you find its missing ear wrapped in your old ribbon on the doorstep. The painted toy is still beneath your floorboard.` : `${f} places the red-eared hare on the reading table. “Do you remember this?” they ask. The missing ear is in their other hand.`, [
    ['Return to the old trade', 'You can say what happened to the ribbon.', `${f} presses the repaired hare into your hand. “Keep it this time,” they say.`, flag('hareReturned', 'honest', { ...bond(n.friend, flags.hare === 'hidden' ? 4 : 7), items: { woodenHare: true }, skills: ['persuasion'] })],
    ['Make a new toy together', 'There is scrap wood behind the lesson hall.', `The second hare has two ears and legs of different lengths. ${f} keeps it beside the first.`, flag('hareReturned', 'made', { ...bond(n.friend, 6), skills: ['survival'] })],
    ['Pretend you do not remember', 'It was a long time ago.', `${f} closes their hand around the loose ear. The hare disappears from the window the next morning.`, flag('hareReturned', 'dismissed', { ...bond(n.friend, -7), stress: 2 })],
  ]);
  if (s.age >= 9 && s.age <= 11 && flags.cup && !flags.cupReturned) return scene('cup-return', 'A cup for someone else’s guest', `${f} brings a cracked cup wrapped in cloth. ${flags.cup === 'covered' ? '“I told them it was me this time,” they say. “It wasn’t.”' : flags.cup === 'told' ? '“You always said we should tell,” they say. “So I did.”' : '“Remember the paste?” they ask. “I thought you might know what to do.”'} Someone expects it back by supper.`, [
    ['Help mend the cup', 'The crack has not reached the handle.', `You work until the supper bell. The cup leaks a little, but ${f} carries it openly through the lane.`, flag('cupReturned', 'mended', { skills: ['survival'], ...bond(n.friend, 6) })],
    ['Ask whose story your friend is covering', 'They have avoided saying a name.', `${f} tells you, then asks you not to repeat it. The cup stays wrapped between you.`, flag('cupReturned', 'confided', { skills: ['persuasion'], ...bond(n.friend, 4), stress: 2 })],
    ['Say this is not your problem to fix', 'You have your own work waiting.', `${f} folds the cloth around the cup. They leave before the first supper bell.`, flag('cupReturned', 'refused', { ...bond(n.friend, -5), stress: -2 })],
  ]);
  if (s.age >= 8 && s.age <= 10 && flags.fox && !flags.foxReturned) return scene('fox-return', 'A shape beyond the laundry line', flags.fox === 'chased' ? `A fox stands beyond the old laundry line. It watches ${f}’s hand, then backs away when you come closer.` : `A fox comes to the old laundry line with two cubs. It waits in the place where you used to leave ${flags.fox === 'fed' ? 'your own bread' : 'the cook’s scraps'}. ${f} asks how it knows you.`, [
    ['Show your friend where to leave food', 'The cubs are watching from behind the hedge.', `You and ${f} wait on the doorstep until the cubs venture forward. The food disappears before either of you moves.`, flag('foxReturned', 'shared', { skills: ['survival'], ...bond(n.friend, 5) })],
    ['Watch without bringing food', 'The fox has found its own way here.', `One cub puts a paw on the laundry basket. Its parent calls it back, and the three shapes pass through the hedge.`, flag('foxReturned', 'watched', { skills: ['scholarship'], happiness: 3 })],
    ['Ask the keeper to keep foxes out of the yard', 'There are chickens nearby.', `The keeper repairs the gap in the hedge. For several evenings, you catch yourself looking at the old place by the line.`, flag('foxReturned', 'fenced', { skills: ['defense'], happiness: -1 })],
  ]);
  if (s.age >= 12 && s.age <= 14 && flags.borrowedPage && !flags.pageReturned) return scene('page-return', 'The handwriting in the margin', flags.borrowedPage === 'given' ? `Your reader returns the page you handed over years ago. There is a new note beside the handwriting: “Ask the owner’s child.” ${f} recognizes it before you do.` : flags.borrowedPage === 'kept' ? `You find that your hidden page is no longer where you left it. ${f} brings a copy to the lesson table. One corner has been torn off exactly where your copy was torn.` : `${f} finds another page in the old book. The name you stopped short of reading aloud appears three times in the margin.`, [
    ['Ask your friend about the writer', 'They have brought the book with them.', `${f} tells you about a relative whose death the household never agreed on. They do not ask you to say the words.`, flag('pageReturned', 'family', { ...bond(n.friend, 7), skills: ['scholarship', 'devotion'] })],
    ['Study the two pages privately', 'You can ask for time with the book.', `The pages describe a willing voice, not a bound one. Beneath the second passage, a familiar teacher has written a place and an hour.`, flag('pageReturned', 'study', { skills: ['arcana', 'scholarship'], gameFlags: { ancestralMentor: true }, items: { loosePage: true } })],
    ['Return the pages without pursuing them', 'The writer had a family before this became a question.', `${f} closes the book. They leave it in the reading room, where anyone may ask to see it.`, flag('pageReturned', 'closed', { ...bond(n.friend, 3), attributes: { willpower: 1 } })],
  ]);
  if (s.age >= 15 && s.age <= 17 && flags.attendanceSecret && !flags.attendanceReturned) return scene('attendance-return', 'A name above the school door', `${r} has been asked to help supervise younger pupils. ${flags.attendanceSecret === 'reported' ? 'They pause when they see you beside the old attendance book.' : flags.attendanceSecret === 'kept' ? 'They turn the old attendance book toward you, open at the page you once watched them alter.' : 'The reader recalls the day you stayed beside them to explain the absence.'} A pupil is waiting outside because their household cannot spare them every day.`, [
    ['Remind your rival how that page began', 'You can speak before the younger pupil comes in.', `${r} looks at the old mark for a long time, then leaves room in the new register for lessons taken at home.`, flag('attendanceReturned', 'reminded', { ...bond(n.rival, 6), skills: ['persuasion', 'scholarship'] })],
    ['Let your rival decide without your advice', 'The register is theirs to keep now.', `${r} asks the pupil to sit. The old book remains open on the table until the lesson ends.`, flag('attendanceReturned', 'trusted', { ...bond(n.rival, 4), skills: ['devotion'] })],
    ['Tell the pupil about your rival’s old mark', 'The pupil can hear you from the doorway.', `${r} shuts the book. The pupil asks whether the lesson will still happen today.`, flag('attendanceReturned', 'exposed', { ...bond(n.rival, -10), stress: 3, skills: ['persuasion'] })],
  ]);
  if (s.age >= 14 && s.age <= 17 && flags.householdDebt && !flags.debtReturned) return scene('debt-return', 'The sender at your door', flags.householdDebt === 'read' ? `You recognize the visitor’s name from the letter you once read without permission. ${k} asks you to bring chairs while the visitor unfolds the same paper.` : flags.householdDebt === 'shared' ? `The person whose letter ${k} showed you is waiting at the door. The folded paper between them has grown soft from being opened so often.` : `A visitor arrives with a letter like the one you turned face down years ago. ${k} recognizes them before they give a name.`, [
    ['Offer some of your own savings', 'The visitor has come to settle what was borrowed.', `${k} starts to object, then lets you set the coins down. The visitor counts them twice and folds the letter away.`, flag('debtReturned', 'helped', { money: -12, ...bond(n.kin, 8), stress: 2 })],
    ['Ask the visitor to explain the agreement', 'The letter is on the table where you can see it.', `The visitor reads out what the household promised. ${k} corrects a date and asks whether the next payment can wait until harvest.`, flag('debtReturned', 'terms', { skills: ['scholarship', 'persuasion'], ...bond(n.kin, 3) })],
    ['Leave the two of them to speak', 'The borrowing was not your decision.', `You step outside. When the visitor leaves, ${k} is still sitting beside the empty chair.`, flag('debtReturned', 'outside', { attributes: { willpower: 1 }, ...bond(n.kin, -2), stress: -2 })],
  ]);
  if (s.age >= 16 && s.age <= 17 && flags.firstAffection && !flags.affectionReturned) return scene('affection-return', 'The note your friend kept', flags.firstAffection === 'silent' ? `${f} has kept the folded note you never answered. Today, they ask whether you knew who sent it.` : `${f} takes out the old note with two initials pressed into the wax. “I thought I should ask what you wanted,” they say.`, [
    ['Say you want to keep seeing them', 'There is time to speak plainly now.', `${f} puts the note carefully back in their pocket. You arrange to meet again, somewhere with chairs this time.`, flag('affectionReturned', 'close', { ...bond(n.friend, 7), happiness: 4, skills: ['persuasion'] })],
    ['Say you want the friendship to stay a friendship', 'You can tell them before another note arrives.', `${f} folds the note more tightly than before. After a moment, they ask whether you still want to walk home together.`, flag('affectionReturned', 'friends', { ...bond(n.friend, 3), attributes: { willpower: 1 } })],
    ['Ask for more time without giving an answer', 'You are not certain what you want.', `${f} says they can wait for a little while. The note stays between their hands until someone calls from the road.`, flag('affectionReturned', 'waiting', { stress: 3, ...bond(n.friend, -2) })],
  ]);
  if (s.age === 5 && (flags.birthThread || flags.birthVisitor || flags.birthName)) {
    const keepsake = flags.birthThread === 'registered' ? 'The keeper opens the paper holding the thread from your blanket.' : flags.birthThread === 'hidden' ? `${k} opens the old box with the silver thread caught around its lid.` : flags.birthThread === 'burned' ? `${k} recalls the thread that fell into the hearth on your first night.` : flags.birthVisitor === 'bird' ? 'The bone bird from your cradle is small enough to fit in your hand.' : flags.birthVisitor === 'name' ? `${k} finds the visitor's name on the back of your birth record.` : flags.birthName === 'margin' ? 'The keeper points to the unused name preserved in the register.' : `${k} shows you the space where another name could have been written.`;
    const returnOmen = s.campaign?.facts?.inheritedResolution ? '' : ({
      ember: 'The cold hearth warms beneath your hand again. You draw the shapes you saw in its ashes beside the old birth record.',
      echo: 'The hymn outside has an extra word nobody else is singing: “willing.” You tap its rhythm, the one the unpulled bell answered on your first night.',
      thorn: 'Roots from the winter seed beside your cradle have reached the old burial wall. As you trace them, you say a name that is scratched into the stone.',
    })[s.campaign?.fate] || '';
    return scene('birth-sign', 'Something kept from your first night', `${keepsake} ${returnOmen} ${k} sits beside you with the old birth record.`, [
      ['Tell what you have dreamed', 'You remember a door with light beneath it.', `${k} writes down what you say, then folds the page into the birth record. The keeper is asked to come after sunset.`, flag('fateResponse', 'shared', { ...bond(n.kin, 5), skills: ['devotion'] })],
      ['Ask to see the old record yourself', 'The letters are still difficult to read.', `You trace the line beneath your name. A place appears there that ${k} says is too far away to visit yet.`, flag('fateResponse', 'studied', { skills: ['arcana', 'scholarship'] })],
      ['Say you would rather go outside', 'The other children are waiting.', `${k} closes the record. That evening, the light beneath the hearth looks ordinary again.`, flag('fateResponse', 'refused', { skills: ['survival'], happiness: 2 })],
    ]);
  }
  if (s.age === 18) {
    const object = flags.householdFuture === 'tried' ? 'the old household tool' : flags.privateVow === 'person' ? 'the vow you wrote without an order watching' : flags.pageReturned === 'study' ? 'the pages from the borrowed book' : flags.training === 'forge' ? 'the crooked hook from your first evening at the forge' : 'a box of things kept from the years you were growing up';
    return scene('leaving-box', 'What you leave on the table', `${k} puts ${object} on the table. ${f} has come to ask where you will be living. Outside, a cart waits for a passenger who has not yet paid.`, [
      ['Stay until you have built something here', 'There is work and a place to sleep.', `${k} moves the box to make room for supper. ${f} asks whether you can meet tomorrow.`, flag('adultDirection', 'rooted', { skills: ['survival', 'persuasion'], ...bond(n.kin, 5), happiness: 3 })],
      ['Take the things you are still trying to understand', 'The unanswered parts fit inside the box.', `You pack slowly. ${f} writes their name on a folded scrap and asks you to send word when you reach somewhere new.`, flag('adultDirection', 'questions', { skills: ['arcana', 'scholarship'], ...bond(n.friend, 3) })],
      ['Leave the box and start with what you carry', 'The cart driver has finished loading.', `${k} leaves the box where it is. ${f} walks with you as far as the gate, then waits while you decide whether to board.`, flag('adultDirection', 'away', { skills: ['weapons', 'survival'], attributes: { willpower: 1 }, stress: 2 })],
    ]);
  }
  return null;
}

export function childhoodScene(s) {
  if (s.age > 18) return null;
  const current = s.timeline.storybook?.pending;
  if (current && current.age === s.age && current.day === s.day) return current.scene;
  const n=names(s),recalled=childhoodMilestone(s,n,{recallOnly:true});
  if(recalled)return recalled;
  const callback=callbackScene(s,n);
  if (callback) return callback;
  const milestone=childhoodMilestone(s,n);
  if(milestone){const firstAge={'growth-first-voice':3,'growth-school-door':6,'growth-wider-lessons':12,'growth-first-independence':16}[milestone.id];const firstOffer=seededRoll(s.seed,`growth-milestone:${milestone.id}:born-${s.timeline.birthDay || 0}:generation-${s.dynasty?.generation || 1}`,3)===0;if(s.age>firstAge||firstOffer)return milestone;}
  const rows = s.age < 3 ? nurseryScenes(s, n) : s.age < 6 ? smallChildScenes(s, n) : s.age < 10 ? schoolScenes(s, n) : s.age < 14 ? olderChildScenes(s, n) : teenScenes(s, n);
  const used = new Set(s.timeline.storybook?.records.map(r => r.sceneId) || []);
  const schoolReady=Boolean(s.education?.enrolled&&(s.education.attendanceThisYear>0||s.education.attendance>0));
  const schoolOnly=new Set(['ink-blot','chalk-answer','wrong-prayer','window-seat']);
  const eligible=rows.filter(r=>!schoolOnly.has(r.id)||schoolReady);
  const available = eligible.filter(r => !used.has(r.id));
  const pool = available.length ? available : eligible;
  const salt = `child-story-${s.age}-born-${s.timeline.birthDay || 0}-generation-${s.dynasty?.generation || 1}`;
  return pool[seededRoll(s.seed, salt, pool.length)];
}

export function snapshotChildhoodScene(s, authored) {
  if (!s.timeline.storybook) s.timeline.storybook = { version: 1, records: [], flags: {}, items: {}, pending: null };
  s.timeline.storybook.pending = { age: s.age, day: s.day, scene: structuredClone(authored) };
}

export function applyChildhoodScene(s, selected) {
  const book = s.timeline.storybook, pending = book?.pending;
  if (!pending || pending.age !== s.age || pending.day !== s.day) return null;
  const chosen = pending.scene.choices.find(c => c.id === selected);
  if (!chosen) return null;
  const e = chosen.effect;
  for (const key of e.skills || []) s.hero.skills[key]++;
  for (const [key, amount] of Object.entries(e.attributes || {})) s.hero.attributes[key] += amount;
  if (e.money) s.hero.gold = Math.max(0, s.hero.gold + e.money);
  for (const key of ['happiness', 'stress', 'health']) if (e[key]) s.life[key] = clamp(s.life[key] + e[key]);
  for (const [id, amount] of Object.entries(e.bonds || {})) {
    const person = actor(s, id);
    if (!person) continue;
    person.bond = clamp(person.bond + amount);
    person.memories.push(`When you were ${s.age}: ${chosen.outcome}`);
    person.memories = person.memories.slice(-30);
  }
  Object.assign(book.flags, e.flags || {});
  Object.assign(book.items, e.items || {});
  Object.assign(s.flags, e.gameFlags || {});
  book.records.push({ sceneId: pending.scene.id, age: s.age, day: s.day, choice: selected, outcome: chosen.outcome });
  book.pending = null;
  return { sceneId: pending.scene.id, title: pending.scene.title, label: chosen.label, outcome: chosen.outcome, memory: chosen.label.toLowerCase() };
}

const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeText = (value, max) => typeof value === 'string' && value.length <= max;
const number = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
const flat = (value, predicate, max = 100) => obj(value) && Object.entries(value).length <= max && Object.entries(value).every(([k, v]) => /^[a-zA-Z][a-zA-Z0-9_-]{0,100}$/.test(k) && predicate(k, v));
function validEffect(e, s) {
  if (!obj(e) || Object.keys(e).some(k => !['skills', 'attributes', 'money', 'happiness', 'stress', 'health', 'bonds', 'flags', 'items', 'gameFlags'].includes(k))) return false;
  if (e.skills !== undefined && (!Array.isArray(e.skills) || e.skills.length > 3 || !e.skills.every(k => SKILLS.includes(k)))) return false;
  if (e.attributes !== undefined && !flat(e.attributes, (k, v) => ATTRIBUTES.includes(k) && number(v, 0, 2), 6)) return false;
  if (e.bonds !== undefined && !flat(e.bonds, (k, v) => s.life.people.some(p => p.id === k) && number(v, -20, 20), 5)) return false;
  if (e.flags !== undefined && !flat(e.flags, (_, v) => safeText(v, 80) || typeof v === 'boolean', 5)) return false;
  if (e.items !== undefined && !flat(e.items, (_, v) => typeof v === 'boolean', 5)) return false;
  if (e.gameFlags !== undefined && !flat(e.gameFlags, (k, v) => ['ancestralMentor', 'hiddenPage'].includes(k) && typeof v === 'boolean', 2)) return false;
  return ['money', 'happiness', 'stress', 'health'].every(k => e[k] === undefined || number(e[k], -20, 25));
}

export function validateChildhoodStories(book, s) {
  if (book === undefined) return true;
  if (!obj(book) || book.version !== 1 || !flat(book.flags, (_, v) => safeText(v, 80) || typeof v === 'boolean') || !flat(book.items, (_, v) => typeof v === 'boolean') || !Array.isArray(book.records) || book.records.length > 19) return false;
  if (!book.records.every(r => obj(r) && safeText(r.sceneId, 100) && number(r.age, 0, 18) && number(r.day, 0, s.day) && PICKS.includes(r.choice) && safeText(r.outcome, 2000)) || new Set(book.records.map(r => r.age)).size !== book.records.length) return false;
  if (book.pending === null) return true;
  const p = book.pending, a = p?.scene;
  if (!obj(p) || p.age !== s.age || p.day !== s.day || !number(p.age, 0, 18) || !obj(a) || !safeText(a.id, 100) || !safeText(a.title, 500) || !safeText(a.body, 5000) || !Array.isArray(a.choices) || a.choices.length !== 3) return false;
  return a.choices.every((c, i) => obj(c) && c.id === PICKS[i] && safeText(c.label, 500) && safeText(c.description, 1000) && safeText(c.outcome, 2000) && validEffect(c.effect, s));
}
