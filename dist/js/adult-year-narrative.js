// The older templates still own their exact numerical effects. These editions
// change the scene and its aftermath only, beginning with content version 7.
const person = (s, id) => s.life.people.find(p => p.id === id && p.alive !== false);

export function adultYearNarrative(s, source) {
  const kin = person(s, 'kin') || s.life.people.find(p => p.alive !== false && ['parent', 'guardian','sibling'].includes(p.familyRole)) || s.life.people.find(p => p.alive !== false) || s.life.people[0];
  const friend = s.life.people.find(p => p.id==='fellow'&&p.alive!==false&&p.id!==kin?.id) || s.life.people.find(p => p.alive !== false && p.role !== 'relative'&&p.id!==kin?.id) || kin;
  const rival = person(s, 'rival') || friend;
  const work = s.hero.profession === 'Unemployed' ? 'ordinary work' : s.hero.profession.toLowerCase() + ' work';
  const entries = {
    'Someone asks to learn your work': [
      `A younger neighbor waits beside your tools after you finish your ${work}. They ask whether you would show them how to begin. A customer is waiting at the door with another commission.`,
      ['The neighbor works slowly, then shows you the first part they can finish without help. The customer counts out payment to both of you.', 'The customer takes the finished commission away. Your written lesson stays folded beside the tools until the neighbor returns.', 'The neighbor goes to the teacher you suggested. You leave the tools where they are and sit down before the light fails.'],
    ],
    'A name missing from the reading room': [
      'A book arrives with its former owner’s name cut from the flyleaf. A patron wants to buy it before the reading room opens. The reader holds the cut page against the light and asks you to look.',
      ['You find the owner’s name in an older catalogue. The reader writes it beside the book before the doors open.', 'The magical notes are in a second hand. You copy them carefully, leaving the strange abbreviations exactly as they were.', 'The patron buys a copy. The original returns to its shelf with a note where the missing name should be.'],
    ],
    'The evening your friend had been waiting for': [
      `${friend.name} has been saving something to tell you. A second invitation arrives from ${kin.name}, who has set an extra place at supper. The two houses are on opposite sides of the settlement.`,
      [`${friend.name} talks well past the time supper would have begun. You walk home with a story you had never heard from them before.`, `${friend.name} and ${kin.name} keep talking after the plates are cleared. You find yourself listening from the doorway.`, `${friend.name} folds the invitation away. The next meeting has a date rather than a vague promise.`],
    ],
    'Your rival’s name beside yours': [
      `A patron brings a clean copy of the survey you made with ${rival.name}. Only your name is on the cover. The patron says they can pay today if you sign it.`,
      [`${rival.name} checks the corrected cover twice before signing beside you. The patron takes longer to count the fee.`, 'Copies of the survey appear in the public reading room. Both names remain on the cover, though the patron never sends the promised fee.', `${rival.name} sees the published cover in someone else’s hands. When you next meet, they speak to the person beside you instead.`],
    ],
    'A household routine after dusk': [
      `An invitation asks you to arrive before midday. ${kin.name} has already said they can keep a place for you. The morning light is reaching farther across your floor than it did last month.`,
      ['You suggest supper instead. By dusk, the difficult part of arranging your own meal is finished, and the invitation is waiting on the table.', `${kin.name} listens until you reach the part about hunger. They ask what you need kept out of the daylight, then clear a place beneath the stairs.`, 'You send a brief refusal. The midday chairs are put away before you leave the house.'],
    ],
    'A refuge that becomes a routine': [
      `The latch on your refuge has loosened. Someone has left an invitation to a supper that falls on the next full moon. ${kin.name} asks whether you are coming.`,
      ['The repaired latch closes without rattling. You test it once more after the lamps are out.', 'You practice the familiar work until your breathing slows. The invitation remains unanswered beside the calendar.', `${kin.name} checks the room with you, then asks which side of the door they should stay on.`],
    ],
    'A duty written in plain words': [
      'An order representative asks you to sign a reassuring account of a disputed visit. The household named in it says the representative never heard them speak. Their door is still open when you arrive.',
      ['Your account includes what the household said. The representative reads the added lines without looking up at you.', 'The representative returns to the household with an empty page. You wait while the first sentence is written.', 'You keep the work you had already promised. The order’s letter stays on your desk until you return.'],
    ],
    'Tools beside an empty hearth': [
      'A carpenter has sorted the usable timbers from a damaged house. A survivor recognizes a beam from their old kitchen and asks that it go into the next one. There are not enough hands for all the houses waiting.',
      ['You help raise the frame. The survivor points out where the kitchen window ought to face.', 'The carpenter takes your contribution and changes the order of the work after speaking to the waiting households.', 'Your own household settles into a surviving room. You mend what will hold before unpacking the keepsakes.'],
    ],
    'A commission with an unnamed buyer': [
      `Two commissions arrive for your ${work}. The richer one has no buyer’s name. The other is signed by a household whose broken fittings you have seen yourself.`,
      ['The household comes to collect the finished work. Their smallest child insists on carrying the lightest part.', 'The unnamed buyer sends no answer to your request for written terms. You keep the unfinished commission on the shelf.', 'You turn both commissions away and finish a piece you had been putting aside. The bench is clear before supper.'],
    ],
    'The useful work that will not make you famous': [
      'You are asked to repair a public fitting on the evening a patron has invited you to their house. The fitting has already failed once. The patron’s messenger waits while you consider the two invitations.',
      ['The fitting holds on its first test. Every helper’s name is written into the account before anyone goes home.', 'The patron introduces you to people who know your work by its name. Outside, the repair crew’s lantern is still burning.', 'The helpers divide the repair between them. You leave when your part is finished, before anyone finds another task for you.'],
    ],
    'A tool inherited with a disagreement': [
      'An old tool lies on the community workshop’s table. The person who left it there has died. One relative brings a copy of the gift letter; another says it was written before the owner changed their mind.',
      ['Both relatives speak before anyone touches the tool. It stays wrapped on the table until they have agreed how it may be used.', 'You find a witness’s mark beneath the folded edge of the letter. The relatives ask to see it before you copy it.', 'You bring your own tools to the work waiting outside. The disputed one remains where the owner’s family can see it.'],
    ],
    'Your friend’s life beside your own': [
      `${friend.name} is moving house. They have packed everything except the things they cannot decide to take. They ask you to help while you are still thinking about a change in your own life.`,
      [`You carry the last box to ${friend.name}’s new door. They leave it closed while showing you the room they chose.`, `${friend.name} talks about the move while you wrap the cups. By the end, you have told them more about your own plans than you intended.`, `${friend.name} gives you one small box to carry. The rest goes with the people who can stay longer.`],
    ],
    'The lesson you can afford to give': [
      'A learner counts out a fee that is smaller than the one you named. They offer to help with the workshop instead. A patron has sent enough coin to reserve the same hours for themselves.',
      ['The learner stays to finish an agreed piece of work. Before leaving, they repeat the part of the lesson they had been afraid to ask about.', 'Your written lesson goes into the public reading room. You return to the paid commission with the patron’s messenger waiting at the door.', 'You keep the hours for your own studies. The learner asks when they may come back, and you give a date you can keep.'],
    ],
    'A warning before the long road': [
      'A guide points out a cracked support on the trade road. A merchant interrupts to say the warning will keep customers away. The guide’s sketch is still wet from the rain.',
      ['The guide pins the sketch beside the departure notices. Someone waiting for the caravan begins asking about another route.', 'The older repair record has a drawing of the same support. You leave it open beside the guide’s wet sketch.', 'You take work that can be finished locally. The supplies intended for the road stay stacked by your door.'],
    ],
    'A household asks for quiet company': [
      'A neighbor leaves the second chair out when you visit. They say they have had enough advice for one week. Their meal is still untouched beside the window.',
      ['You sit until the neighbor begins eating. Most of the evening passes without either of you saying very much.', 'The neighbor chooses one person they would like to ask for help. You write the message as they dictate it.', 'You bring back the things the neighbor asked for. They leave the second chair out when you say you have to go.'],
    ],
    'The festival work nobody planned': [
      'The festival banners are finished, but the benches rock when anyone sits down. A keeper holds an unpaid repair list beside the patron’s account for the banners. The first guests arrive tomorrow.',
      ['The benches are steady by morning. You put the helpers’ names and fees into the account before the keeper closes it.', 'The patron reads the repair list, then sends someone to fetch more coin. The extra banner is left folded in its box.', 'The volunteers finish the simpler repairs after you show them how. You leave your apron on its peg before the evening speeches begin.'],
    ],
    'Your rival returns with a different account': [
      `${rival.name} brings a source that disagrees with something you published. They have marked the relevant line but have not shown it to the patron yet. Your earlier account is on the table between you.`,
      [`${rival.name} adds their name to the correction beside yours. The patron receives both pages together.`, 'You compare the source against the older copies. A note about the disagreement is attached before either account is repeated.', `${rival.name} keeps the source while you finish your practical work. You tell the next person who asks which part remains uncertain.`],
    ],
    'A room for the next household': [
      'A newly arrived household waits beside a room with a broken shutter. The owner asks for rent in advance. A neighbor says they will repair it if someone settles who is meant to pay.',
      ['The household and owner agree on a date and a smaller first payment. The neighbor opens the shutter to measure it.', 'You put the repair estimate on the table. The owner changes the requested rent after seeing how much work remains.', 'You contribute what you can, then return to the room your own household is still making habitable.'],
    ],
    'The craft you still want to learn': [
      'A visiting maker finishes a difficult join while you watch. It is work outside your usual trade. They offer to show you the method before the next customer arrives.',
      ['Your first attempt does not quite fit. The maker leaves the two pieces beside each other so you can see where they differ.', 'The maker shows you an older piece with the same join. Their teacher’s mark is still visible beneath the varnish.', 'You exchange one method from each trade. The maker returns to their customer while you put your own tools away.'],
    ],
    'A letter addressed to the person you were': [
      `${kin.name} finds an old letter describing what someone once expected you to become. They set it beside the things you actually use for your ${work}. Neither of you opens it immediately.`,
      [`${kin.name} listens while you describe an ordinary day. The old letter stays beside the tools until the lamps are lit.`, 'You put the old letter beside an account of the years that followed. The two papers are kept in the same box.', 'You finish a piece of useful work and show it at supper. The letter remains folded where it was found.'],
    ],
  };
  if(kin?.alive===false)entries['The evening your friend had been waiting for']=[`The supper invitations are old. ${kin.name} has died; a saved letter sits beside an empty chair.`,['You read a remembered story from the saved letter.','You copy the remembered name without reviving the writer.','You close the letter and make room for a quiet evening.']];
  else if(friend?.id===kin?.id)entries['The evening your friend had been waiting for']=[`${friend.name} has set one extra place at supper. You have one invitation to answer.`,[`${friend.name} tells the story over supper.`,`You agree one quieter meeting with ${friend.name}.`,`You name a later date for this invitation.`]];
  let entry = entries[source.title];
  if (source.kind) {
    const member = s.life.people.find(p => p.id === source.personId) || s.life.children.find(p => p.id === source.personId) || s.lineage?.people.find(p => p.id === source.personId);
    const name = member?.name || 'Your relative';
    if (source.kind === 'small_child') entry = [`${name} catches the handle of your work bag before you leave. They want to come along, carrying something they made that is much too small to fit inside.`, [`${name} shows you what they made. You find a place for it where they can see it when you return.`, `You and ${name} find out which parts will fit together. The work bag stays by the door a little longer.`, `${name} carries a small part of the work beside you. They insist on doing the last step themselves.`]];
    if (source.kind === 'school_child') entry = [`${name} brings an unfinished page from their lessons. They say the answer in the book does not look like what they saw outside. Their finger stays on the line while they wait for you to read it.`, [`${name} explains what they saw. The unfinished page stays open while you listen.`, `You compare the page with what ${name} noticed outside. They write a question beside the printed answer.`, `${name} tries a small demonstration at the table. The page has to be moved out of the way before either of you finishes.`]];
    if (source.kind === 'teen_child') entry = [`${name} has laid the household's familiar tools aside. They bring a plan written in their own hand and ask you to read it before deciding what to say.`, [`${name} describes the part of the plan they are most afraid to begin. You stay until they have finished explaining it.`, `You put your questions beside ${name}'s plan. They cross out one answer and write another without asking you which to keep.`, `${name} tries a first piece of the work they chose. You leave the tools where they ask to keep them.`]];
    if (source.kind === 'adult_child') entry = [`${name} sends news of a project and asks whether you can visit. Their letter includes a sketch of something you have never made in your own work.`, [`${name} shows you how far the project has come. Most of the visit is spent hearing how they began.`, `You compare the sketch with the unfinished work. ${name} makes a note of a question you had not thought to ask before arriving.`, `You help with the task ${name} gives you, then leave them room to finish the part they wanted to do alone.`]];
    if (source.kind === 'partner_time') entry = [`${name} leaves the second supper plate covered until you return. They ask whether the evenings you keep missing can go back into the household's calendar.`, [`${name} uncovers both plates. The next shared evening has a date written beside it.`, `You and ${name} leave the ledger open between the plates. The changes are written in both hands.`, `${name} covers their plate again while you explain the waiting work. They ask when the season you named is meant to end.`]];
    if (source.kind === 'elder_care') entry = [`${name} has an errand they no longer like making alone. They are already wearing their outdoor coat when you arrive, and ask whether you have time to walk.`, [`${name} chooses the route. You stop where they want to stop before continuing to the errand.`, `${name} tells a story on the walk. You write it down afterward and read it back so they can correct the name you misheard.`, `You and ${name} finish the errand together. They carry the smaller parcel home.`]];
    if (source.kind === 'widow_memory') entry = [`A familiar season brings back an evening you shared with ${name}. One of their things is still in the place where they always left it.`, [`You tell someone a story about ${name} that they had not heard. Their question makes you remember another part of it.`, `You copy the story ${name} wanted kept. The paper goes beside the things that still belong to their memory.`, `You leave the familiar thing where it was and return to the work waiting on your table.`]];
  }
  if(kin?.alive===false)entries['The evening your friend had been waiting for']=[`The supper invitations are old. ${kin.name} has died; a saved letter sits beside an empty chair.`,['You read one remembered story from the saved letter.','You copy the remembered name without reviving the writer.','You close the letter and make room for an ordinary quiet evening.']];
  else if(friend?.id===kin?.id)entries['The evening your friend had been waiting for']=[`${friend.name} has set one extra place at supper and has a story to tell. You have one invitation to answer.`,[`${friend.name} tells the story over supper.`,`You agree a quieter meeting with ${friend.name} the following day.`,`You decline this invitation and name a later date.`]];
  return { ...source, ...(entry ? { body: entry[0] } : {}), choices: source.choices.map((c, i) => ({
      intentTags:c.effect?.villagers<0?['cruelty','take']:c.effect?.stress<0?['rest']:c.effect?.villagers>0||c.effect?.relationship?['care','give']:c.effect?.gold>0?['work','aspiration']:c.effect?.skills?.includes('scholarship')||c.effect?.skills?.includes('arcana')?['learn']:['prudence'], ...c,
    description: c.effect?.cost ? `Contribute ${c.effect.cost} gold if you have it; otherwise bring what help you can.` : '',
    outcome: entry?.[1]?.[i] || `${c.label}. The conversation continues over the things still waiting on the table.`,
  })) };
}
