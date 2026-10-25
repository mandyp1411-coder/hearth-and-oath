// The delve: a dungeon as a place with a history (v0.67). Every delve has a
// premise — who built it, what went wrong, what lives there now, why you came —
// and a floor laid out from one template: an approach, a hub, two or three
// chambers off it, a secret the right eyes find, the lair, and the way (the
// objective, or the drop to the next floor). Light burns down; supplies replace
// Focus-per-step; what you notice depends on who you are; noise wakes the
// halls; the lair left alone reaches the village; and what you carry out has an
// owner above. The five authored campaign dungeons are rebuilt on it first.
//
// Every life's dungeons from v0.72.3 (a life that predates the delve begins it when read);
// a maze already begun is finished in the maze, and the regional and contract descents are mazes.
// `state.delve` is the walk in progress; `state.delves.places[id]` is what the
// place remembers between visits (seen, cleared, the lair, the threat).
import { seededRoll, isSettlement, generatePersonName, withArticle } from './world.js';
import { companionOpinion } from './battlecraft.js';
import { isLiterate, studyLevel, useStudy } from './schooling.js';
import { hasNature } from './personality.js';
import { addStationTie } from './station.js';
import { seasonOf, raidFromBelow } from './living-world.js';
import { mazeBegun } from './maze-rules.js';

export const TORCH_HOURS = 4, PACK_COST = 6, DAY_HOURS = 12, AWAKE = 60, STIRRING = 90;
const LIMITS = Object.freeze({ places: 40, log: 30, finds: 12 });
export const NOISE = Object.freeze({ step: 1, search: 3, fight: 12, oil: 15, hazard: 5, retreat: 6, camp: -15 });
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const note = (ctx, title, text, tag = 'delve') => (ctx?.journalLiteral || ctx?.journal)?.(title, text, tag);
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const low = t => t.replace(/^The /, 'the '); // 'The Barrow under Cinderhead' keeps its town
const RUMOUR = ['They say a dog went in last spring and came out.', 'They say two men went in last year and one came out.', 'They say nobody who went in has come out.'];
const placeName = (s, id) => s.world.locations.find(p => p.id === id)?.name || id;
const homeOf = s => s.life?.home?.locationId || s.hero.birthplaceId || 'home';

// The house convention: 'continue' is always the choice that lets the world take its course.
export const DELVE_EVENTS = { ids: () => ({ delve_spoils: ['return', 'sell', 'continue'] }) };

// ---------------------------------------------------------------------------
// Premises. The authored five carry the campaign; the kinds carry the uncharted descents.
// A room row is [name, text, extra]; extra may hold encounterId, hazard, find, cue.
const AUTHORED = Object.freeze({
  cistern: { title: 'The Drowned Cistern', site: 'marsh', family: 'beast', floors: 1, lairName: 'the cistern keeper',
    built: 'The covenant’s engineers cut it under the marsh to carry clean water to the stilt houses, and carved their names on the first sluice.',
    wrong: 'When the first fever came, the households above the marsh shut their gates and the runoff went to the stilt houses. The keeper was bound to the water and told to let no one through. Nobody came back to unbind it.',
    lives: 'Leeches as long as an arm, rats that carry the fever, a bog-light that was a pump attendant once, and the keeper, which still thinks you are the engineers.',
    why: 'The fever is back, and the water is where it starts.',
    rooms: { approach: ['The reed stair', 'Old watermarks go down under the reeds, each one a year the water rose. The engineers’ names are cut into the first step and half of them are under the waterline.', { cue: 'read', inscription: 'the engineers’ names and a date, and under them in a different hand: SHUT IT. THEY ARE NOT COMING.' }],
      hub: ['The sluice gate', 'A gate that could still be worked, if anyone remembered how. Water goes three ways from here: a dry passage toward the pump room, a flooded one, and the broken sluice itself.', {}],
      chambers: [['The broken sluice', 'Something has made its bed in the gate machinery, and it is hungry.', { encounterId: 'cistern_sluice' }], ['The flooded passage', 'Waist-deep and black. Sharp scrap under the water and a nest of rats on the dry shelf that carry the fever in their mouths.', { encounterId: 'cistern_flooded', hazard: { kind: 'water', cue: 'anatomy', text: 'The water is where the fever lives. Something in it finds the cut on your shin.' } }], ['The pump workshop', 'A dry shelf, a maintenance ledger, and the tools of people who meant to come back.', { find: { kind: 'cache', gold: 8, materials: { ore: 2, cloth: 1 }, text: 'Tools nobody came back for, and a few coins left for the next shift.' } }]],
      secret: ['The bellows culvert', 'A crawlway under the sluice, brackets rusted to lace, with old work orders still hanging from them. It comes out behind the keeper’s chamber.', { shortcut: true, find: { kind: 'page', text: 'The last work order: “Diverted to the citadel. Water to be let stand. Do not tell the stilt houses.” Signed, and the signature is a name you have heard above.' } }],
      lair: ['The keeper’s chamber', 'It is bound to the water with chains that have grown into it, and it has been waiting for the engineers for a very long time.', { encounterId: 'cistern_keeper' }],
      way: ['The tainted spring', 'A covenant conduit feeds the spring from somewhere under the citadel, and the water that comes out of it is wrong. Write down how it moves. The people above are waiting.', { objective: { kind: 'record', text: 'The pattern of the taint goes into your book.' }, relic: { kind: 'relic', name: 'the engineers’ sluice-key', owner: 'guild', ownerName: 'the smiths’ guild', text: 'An iron key as long as your forearm, with the smiths’ mark on its bow. The gate above could be worked with it.' } }] },
    cues: ['read', 'anatomy', 'miner', 'zealot'] },
  buried_archive: { title: 'The Buried Archive', site: 'ruin', family: 'spirit', floors: 1, lairName: 'the last archivist',
    built: 'The academy’s first readers dug it to keep the covenant’s original account where the city could not edit it.',
    wrong: 'The city edited it anyway, by burying the readers with it. The wards they set to keep the books kept the readers too.',
    lives: 'Echoes that still turn pages, a warding adept who has forgotten what it is warding, and the last archivist, who remembers.',
    why: 'The academy’s public ledger leaves out a register of names. The original is down here.',
    rooms: { approach: ['The collapsed vestibule', 'Pale runes still light the scriptoria beyond. Someone wrote on the wall by the stair in charcoal, low down, as if sitting.', { cue: 'read', inscription: 'DO NOT TRUST THE COPIES. The hand is a child’s.' }],
      hub: ['The reading room', 'Desks in rows, a book open on every one, and dust that has not been disturbed since the doors were sealed. Three doors.', {}],
      chambers: [['The silent scriptoria', 'The adept at the lectern has not looked up in a hundred years. It looks up.', { encounterId: 'archive_scriptoria' }], ['The ink-sealed stair', 'The runes on the steps react to a hurried foot. They have had a long time to wait for one.', { encounterId: 'archive_vault', hazard: { kind: 'trap', cue: 'thief', text: 'The step gives and the rune under it does what it was made to do. Your left hand is numb for an hour.' } }], ['The record vault', 'A locked coffer, the key still in it, beside the first copy of the covenant and a tally of ink.', { find: { kind: 'cache', gold: 10, materials: { ore: 1, cloth: 2 }, text: 'The readers’ coffer: coin for the lamp oil, and the cloth they wrapped the books in.' } }]],
      secret: ['The bookbinders’ lift', 'A supply shaft from the vestibule to the vault, boards rotted but the ropes still good. It comes up behind the archivist.', { shortcut: true, find: { kind: 'page', text: 'A copyist’s refusal, written in their own hand and never sent: they would not scrape the date off the release clause. Under it, in the same hand, the names of the readers who were buried here.' } }],
      lair: ['The archivist’s desk', 'The last archivist turns a page without touching it and waits to see whether you have come for the record or for a possession.', { encounterId: 'archive_warden' }],
      way: ['The original seal', 'The names behind the official account, in ink that was never scraped. What the city does with them is another decision; what you know now is yours.', { objective: { kind: 'record', text: 'The register of refused names goes into your book.' }, relic: { kind: 'heirloom', name: 'a reader’s binding tool', owner: 'family', text: 'A bone folder with a family mark on the handle. The family is still in the city; the tool is on a list of things they lost.' } }] },
    cues: ['read', 'old_elvish', 'history', 'thief', 'arcanist'] },
  root_caverns: { title: 'The Moonroot Caverns', site: 'forest', family: 'beast', floors: 1, lairName: 'the Thornheart',
    built: 'Nobody built it. The roots did, around a spring, and the grove-tenders kept the paths open for a thousand years.',
    wrong: 'A timber crew cut into the spring for a warrant with a household’s mark on it. The grove closed its paths and grew something to keep them closed.',
    lives: 'Wolves and boar that den where the tenders slept, thorn-sprites in the vines, and the Thornheart, which is the grove’s wound with teeth.',
    why: 'The remedy grows nowhere else, and the people omitted from the city’s records are remembered here.',
    rooms: { approach: ['The split root', 'A tunnel under a root as wide as a house. Animal tracks go in. Fewer come out.', { cue: 'hunter', spoor: 'wolf, boar, and something that drags.' }],
      hub: ['The tenders’ hollow', 'A chamber the roots left open, with sleeping-shelves cut into them and three ways on.', {}],
      chambers: [['The hunting den', 'Wolves, and their young, and the smell of what they ate last.', { encounterId: 'root_spoor', nest: true }], ['The thorn passage', 'The vines move when you do not look at them. Something in them is awake.', { encounterId: 'root_thorns', hazard: { kind: 'thorns', cue: 'hunter', text: 'A vine closes on your calf before you see it move. It lets go reluctantly.' } }], ['The ranger’s refuge', 'A dry alcove: bundled herbs gone to dust, a craftsman’s pack, a bedroll with a shape still in it.', { find: { kind: 'cache', gold: 4, materials: { ore: 1, cloth: 1 }, herbs: 2, text: 'A dead ranger’s pack: herbs still good in their wax, a little coin, a knife.' } }]],
      secret: ['The badger run', 'A burrow that circles the den. The roots will take your weight if you know which ones.', { shortcut: true, find: { kind: 'page', text: 'A timber warrant, water-stained, with a household’s mark at the bottom. The household is still in the city and still sells timber.' } }],
      lair: ['The wound', 'The Thornheart rises out of the poisoned spring with the old nest in its roots. It does not speak. It does not need to.', { encounterId: 'thornheart' }],
      way: ['The moonroot spring', 'The spring is open again, and the moonroot grows thick around it. Take what the remedy needs and no more; the grove counts.', { objective: { kind: 'spring', herbs: 3, text: 'Three bundles of moonroot, cut with the knife and wrapped.' }, relic: { kind: 'relic', name: 'the tenders’ carved staff', owner: 'faith', text: 'A staff of living wood, still green at the tip, carved with the signs of the old grove-faith. The shrine above would know it.' } }] },
    cues: ['hunter', 'miner', 'zealot', 'anatomy'] },
  watchtower: { title: 'The Broken Watchtower', site: 'tower', family: 'bandit', floors: 1, lairName: 'the tower captain',
    built: 'The council raised it to warn the road of raiders. The signal brazier could be seen from three villages.',
    wrong: 'An order without a seal turned the watch into a prison. The men who should have been on the road were paid, with the patrol money, to guard travellers they had locked up for trespass.',
    lives: 'The captain and what is left of his garrison, a jailer, a slinger on the cliff, and the prisoners in the cells who were going somewhere once.',
    why: 'The signal watch could warn the villages before the wards fail. The captain is in the way.',
    rooms: { approach: ['The tower approach', 'A ladder up the cliff to the patrol walk, and a cellar door hanging open. Somebody has painted a tally on the wall by the door, in groups of five.', { cue: 'read', inscription: 'the tally is of days, and the names beside it are the prisoners’, and two of the names have been struck through.' }],
      hub: ['The guardroom', 'Cold hearth, a dice game abandoned mid-throw, a ledger of bribes under a loaf gone to stone. Stairs up, a door to the cells, a door to the stores.', {}],
      chambers: [['The cliff patrol', 'A veteran and a slinger on the walk, bored, and glad of you.', { encounterId: 'tower_cliff' }], ['The holding cells', 'The jailer has the keys on his belt and a reason for every door. The travellers behind them have none.', { encounterId: 'tower_cells', hazard: { kind: 'trap', cue: 'thief', text: 'A bell-wire across the cell passage. The jailer hears it before you see it.' } }], ['The garrison stores', 'Confiscated tools, travellers’ bundles, a payroll that explains the locks.', { find: { kind: 'cache', gold: 12, materials: { ore: 2, cloth: 2 }, text: 'What the garrison took from the road: coin, cloth, and a set of tools with somebody else’s initials.' } }]],
      secret: ['The ropekeepers’ stair', 'A stair inside the cliff, lashings rotten, that comes out on the platform behind the captain.', { shortcut: true, find: { kind: 'page', text: 'The order that made the prison, with no council seal on it, and the name of the man who sent it. You know the name.' } }],
      lair: ['The captain’s platform', 'The captain has a shieldbearer and a slinger and a long speech about necessary precautions, and he gives the speech.', { encounterId: 'tower_captain' }],
      way: ['The signal brazier', 'Oil, flint, a brazier that has not been lit in years. Light it and three villages will know the watch is a watch again.', { objective: { kind: 'signal', text: 'The brazier lit. Somewhere below a bell answers.' }, relic: { kind: 'heirloom', name: 'a courier’s torn travel permit', owner: 'family', text: 'A travel permit, torn, in a name from one of the villages below. The family has been asking after it for two years.' } }] },
    cues: ['read', 'thief', 'siegecraft', 'history'] },
  covenant_core: { title: 'The Covenant Core', site: 'citadel', family: 'construct', floors: 1, lairName: 'the anchor warden',
    built: 'The First Keeper and the living hands of a whole generation built the anchor under the citadel to hold the covenant in place.',
    wrong: 'The first instruction required a willing term. Later commands were carved over it, and the warden obeys the top layer.',
    lives: 'Iron husks that still process, a rune golem and its sparks in the broken forge, an acolyte whose wards sustain them all, and the warden, with its competing orders.',
    why: 'The anchor is where the region’s fate is held. Someone has to reach it.',
    rooms: { approach: ['The inner threshold', 'The procession hall runs straight to the anchor. Over the arch, in the oldest script, a line that has had another line carved across it.', { cue: 'old_elvish', inscription: 'THE LIVING MAY OFFER A TERM, and across it, newer and deeper: ALL SERVE.' }],
      hub: ['The crossing', 'Where the procession hall meets the forge passage and the library stair. The floor hums.', {}],
      chambers: [['The procession hall', 'Iron husks in two lines, and an acolyte between them keeping them standing.', { encounterId: 'core_hall' }], ['The broken forge', 'A rune golem in pieces that are not all still, and sparks that are alive and curious about you.', { encounterId: 'core_forge', hazard: { kind: 'ward', cue: 'arcanist', text: 'A dormant ward wakes under your foot and takes its due from you before it sleeps again.' } }], ['The covenant library', 'Emergency supplies for a crew that never came back, beside the plans of the anchor.', { find: { kind: 'cache', gold: 8, materials: { ore: 3, cloth: 1 }, text: 'A maintenance crew’s stores: rope, oil, hard bread gone to stone, and the plans.' } }]],
      secret: ['The maintenance conduit', 'A conduit under the hall to the library, with wards along it that must be tested one by one. It comes out at the warden’s back.', { shortcut: true, find: { kind: 'page', text: 'The workers’ muster: living names on the anchor’s repair record, several crossed out without explanation, and the first instruction copied out in full by an apprentice who wanted it remembered.' } }],
      lair: ['The warden’s round', 'The anchor warden announces a charged strike, a protective seal, and a sweeping pulse, in that order, and means it.', { encounterId: 'core_warden' }],
      way: ['The living anchor', 'The mechanism that holds the covenant in place, still working, still waiting for a term. What happens to it is the campaign’s decision. That you reached it is yours.', { objective: { kind: 'anchor', text: 'You stood at the anchor and read the first instruction.' }, relic: { kind: 'relic', name: 'the First Keeper’s withdrawal handle', owner: 'faith', text: 'A bronze handle, removed under orders and hidden in the works. It fits a socket on the anchor. The faith above would call it a relic; the court would call it evidence.' } }] },
    cues: ['old_elvish', 'arcanist', 'read', 'history'] },
});
/** The uncharted descents under the towns: a kind by the board's old themes, the premise rolled from a pool. */
const KINDS = Object.freeze({
  barrow: { title: 'The Barrow', family: 'undead', lairName: 'the barrow-wight', builts: ['A chieftain’s people raised it over him with his dogs and his debts.', 'The old faith buried its priests here standing up, facing the dawn they expected.'], wrongs: ['Somebody opened it for the gold and left the door off.', 'A plague year filled it faster than the priests could say the words, and some were put in alive.'], lives: ['The dead do not stay down here, and the things that eat the dead have followed them in.'], whys: ['Something has been coming up out of it at night.', 'The board pays for whatever is taken from it, and does not ask.'], rooms: { approach: ['The barrow mouth', 'A door of one stone, pushed aside long ago. Cold comes out of it in summer.', { cue: 'read', inscription: 'a name and a curse on whoever moves the stone, in a script the shrine still uses.' }], hub: ['The hall of the dead', 'Niches in the walls, most of them full, some of them not any more. Three passages.', {}], chambers: [['The dogs’ chamber', 'They buried the hounds with him. They did not stay buried.', { encounter: true, nest: true }], ['The ossuary', 'Bones stacked to the ceiling and a smell of old incense. The floor is not where it looks.', { encounter: true, hazard: { kind: 'trap', cue: 'thief', text: 'A slab tilts and you go in up to the hip among the bones. Something in there bites.' } }], ['The grave-goods', 'What they thought he would need: cups, a knife, a comb, coin.', { find: { kind: 'cache', gold: 14, materials: { ore: 1 }, text: 'Grave-goods, which is to say someone’s property with a long dead owner and a living faith that counts them.' } }]], secret: ['The priests’ crawl', 'A passage the priests used to tend the dead without waking them. It comes out behind the chieftain.', { shortcut: true, find: { kind: 'page', text: 'A priest’s tally of who was put in alive the plague year, and why, in a hand that shook.' } }], lair: ['The chieftain’s chamber', 'He is sitting up on the slab with his sword across his knees, and he has been waiting for a visitor.', { encounter: true, boss: true }], way: ['The lower barrow', 'A hole in the floor of the chamber where the dead go down, and something that was a stair.', { objective: { kind: 'hoard', text: 'The chieftain’s hoard, counted and carried.' }, relic: { kind: 'relic', name: 'a priest’s dawn-mask', owner: 'faith', text: 'A mask of beaten copper, turned to the east. The shrine above has a wall of them, and a gap.' } }] } },
  roots: { title: 'The Roots', family: 'beast', lairName: 'the brood mother', builts: ['The roots of a forest older than the town did this, slowly.', 'A badger set, widened by things larger than badgers.'], wrongs: ['Something came up from below and found the roots to its liking.', 'The town threw its dead animals down the sinkhole for forty years, and the sinkhole has been eating well.'], lives: ['Things with too many legs, and the brood mother who lays them.'], whys: ['Lambs have been going from the top field.', 'A child went in on a dare.'], rooms: { approach: ['The sinkhole', 'A pit at the field’s edge with roots across it like the bars of a cage, and a rope somebody left.', { cue: 'hunter', spoor: 'claw-marks going down, in groups of six.' }], hub: ['The root-hall', 'Roots thicker than you, and the earth between them packed hard by something’s passing. Three ways.', {}], chambers: [['The nursery', 'Egg-cases the size of barrels, and some of them are empty.', { encounter: true, nest: true }], ['The dripping gallery', 'Water through the roots, and a smell of rot that gets into your mouth.', { encounter: true, hazard: { kind: 'gas', cue: 'anatomy', text: 'The air here is wrong. Your head swims before you understand why, and you lose an hour of the walk you do not remember.' } }], ['The midden', 'What the town threw down, and what the things down here could not eat: buckles, coin, a boot with a foot in it.', { find: { kind: 'cache', gold: 9, materials: { ore: 1, cloth: 1 }, text: 'Forty years of the town’s rubbish, sifted. Coin. A ring.' } }]], secret: ['The old set', 'The badgers’ own passage, too small for the things, just big enough for you. It comes out above the mother.', { shortcut: true, find: { kind: 'page', text: 'A child’s shoe, and a little further, a child’s tin whistle. You take the whistle.' } }], lair: ['The brood chamber', 'She is the size of a cart and the colour of the dark, and the floor moves with her young.', { encounter: true, boss: true }], way: ['The deep roots', 'The roots go down, and so does the smell. There is a shelf here where the things lay their dead, and what the dead carried.', { objective: { kind: 'hoard', text: 'What the brood took, counted and carried.' }, relic: { kind: 'heirloom', name: 'a child’s tin whistle', owner: 'family', text: 'A tin whistle with teeth-marks on it, from the field above. The family is still in the town.' } }] } },
  tower: { title: 'The Fallen Tower', family: 'construct', lairName: 'the tower’s last warden', builts: ['A collegium mage raised it to work alone, and worked alone until the working got out.', 'A lord built it to watch his border and filled it with things that would not sleep.'], wrongs: ['The tower fell inward one night and the lights did not go out.', 'Whatever was made here finished its maker and started on the countryside.'], lives: ['Constructs that still keep the rounds, sparks that have learned to hunt, and whatever the maker became.'], whys: ['The collegium wants its books back and will not go itself.', 'Lights in the fallen tower, and sheep found cold.'], rooms: { approach: ['The fallen stair', 'A tower lying on its side, so the stair goes along. Glass underfoot. Over the lintel, a line of the collegium’s script.', { cue: 'old_elvish', inscription: 'the maker’s name and a warning that the rounds continue.' }], hub: ['The workroom', 'Benches, instruments, a floor-plan of the tower chalked on the wall with one room marked in red. Three doors.', {}], chambers: [['The rounds', 'Iron shapes that still walk the circuit the maker set them, and have nobody to tell them it is done.', { encounter: true }], ['The spark cage', 'A cage of copper wire, bent open, and the things it held loose in the dark.', { encounter: true, hazard: { kind: 'ward', cue: 'arcanist', text: 'A warding circle under the glass, still live, and you walk into it.' } }], ['The maker’s stores', 'Oil, rope, wire, and a strongbox the maker thought nobody would reach.', { find: { kind: 'cache', gold: 16, materials: { ore: 3 }, text: 'A mage’s stores and a strongbox with a simple lock, because who would come here.' } }]], secret: ['The vent', 'A warm vent from the workroom to the top chamber, big enough for one. It comes out above the warden.', { shortcut: true, find: { kind: 'page', text: 'The maker’s last page: the working had a name, and the name is the warden’s.' } }], lair: ['The top chamber', 'What the maker became keeps the top chamber, and it still keeps the maker’s hours.', { encounter: true, boss: true }], way: ['The maker’s study', 'The books the collegium wants, and the instrument the maker was using when it happened, still warm.', { objective: { kind: 'record', text: 'The maker’s books, carried out in a sack.' }, relic: { kind: 'relic', name: 'the maker’s focusing-glass', owner: 'guild', ownerName: 'the Collegium', text: 'A lens in a brass frame that shows you the room a moment before it happens. The collegium will want it back, and will pay, or will not ask.' } }] } },
  cave: { title: 'The Deep Cave', family: 'aberration', lairName: 'the thing in the dark', builts: ['Water made it over more years than there are names for.', 'Miners followed a vein into it and found the vein was not the only thing down there.'], wrongs: ['The miners stopped coming up. The town shut the entrance and moved the road.', 'Something was woken that had been content to sleep.'], lives: ['Things that have never seen the sun and have other ways of seeing you.'], whys: ['The town has started losing dogs, then goats, then a man.', 'A rumour of silver that nobody who went to check has contradicted.'], rooms: { approach: ['The shut entrance', 'Boards over a hole, pulled away from inside. A miner’s lamp hangs on a nail, rusted shut.', { cue: 'miner', spoor: 'the timbering is sound for ten yards and then it is not.' }], hub: ['The old working', 'Where the miners stopped. Picks on the floor. Three ways: the vein, the water, the dark.', {}], chambers: [['The vein', 'Silver in the wall, real silver, and the thing that guards it is not a thing the miners had a word for.', { encounter: true, find: { kind: 'cache', gold: 0, materials: { ore: 4 }, text: 'Silver, dug with the miners’ own picks.' } }], ['The water', 'A pool so still it is a mirror, until something under it breathes.', { encounter: true, hazard: { kind: 'water', cue: 'hunter', text: 'The pool is deeper than it looks and colder than it should be, and something takes hold of your ankle and lets go.' } }], ['The miners’ camp', 'Bedrolls, a cook-fire, letters home that were never sent.', { find: { kind: 'cache', gold: 6, materials: { cloth: 2 }, text: 'A dead crew’s camp: their letters, their coin, their ropes.' } }]], secret: ['The crawl', 'A fissure the miners marked with an arrow and never used. It comes out above the thing.', { shortcut: true, find: { kind: 'page', text: 'A miner’s letter home, finished, folded, addressed. The address is in the town above.' } }], lair: ['The dark', 'The lamp shows you a floor and no walls and no ceiling, and then it shows you what the miners saw.', { encounter: true, boss: true }], way: ['The deeper working', 'The vein goes down, and the water goes down, and so does the thing’s path. There is a shelf of what it could not eat.', { objective: { kind: 'hoard', text: 'What the dark kept, counted and carried.' }, relic: { kind: 'heirloom', name: 'a miner’s unsent letter', owner: 'family', text: 'A letter home, addressed to a house in the town above. The house is still there.' } }] } },
});
const THEME_KIND = Object.freeze({ ossuary: 'barrow', roots: 'roots', tower: 'tower', abyss: 'cave' });
const CRAFT_NAME = Object.freeze({ Blacksmith: 'blacksmith', Merchant: 'merchant', Miner: 'miner' });

// ---------------------------------------------------------------------------
// What you notice depends on who you are.
export const CUES = Object.freeze({
  read: { label: 'You can read', who: s => isLiterate(s), text: r => `You read what is written here: ${r.inscription || 'a name and a date'}.` },
  old_elvish: { label: 'Old Elvish', who: s => studyLevel(s, 'old_elvish') >= 2, study: 'old_elvish', text: r => `The old script over the arch is Old Elvish, and you have enough of it: ${r.inscription || 'a warning, and a name'}.` },
  history: { label: 'History', who: s => studyLevel(s, 'history') >= 2, study: 'history', text: () => 'You know who built this and what they feared; the lectures were not wasted. You know where its weakness will be.' },
  anatomy: { label: 'Anatomy', who: s => studyLevel(s, 'anatomy') >= 2 || s.hero.profession === 'Healer', study: 'anatomy', text: () => 'You read the dead here the way you were taught, and know what killed them before it can kill you.' },
  siegecraft: { label: 'Siegecraft', who: s => studyLevel(s, 'siegecraft') >= 2 || s.hero.profession === 'Soldier', study: 'siegecraft', text: () => 'You see how the place was meant to be held, and so where its holders will be standing.' },
  miner: { label: 'A miner’s ear', who: s => s.hero.profession === 'Miner' || s.guild?.member?.craft === 'miner', text: () => 'You hear the ceiling settle, and know which timbers to trust and which to walk under quickly.' },
  thief: { label: 'A thief’s eye', who: s => (s.hero.skills?.stealth || 0) >= 3 || ['thief', 'assassin'].includes(s.hero.specialization), text: () => 'You see the wire, the tilted slab, the step that is a little too clean.' },
  hunter: { label: 'A hunter’s nose', who: s => (s.hero.skills?.survival || 0) >= 3 || ['ranger', 'druid'].includes(s.hero.specialization), text: r => `You read the spoor: ${r.spoor || 'what came through here, how many, how long ago'}.` },
  arcanist: { label: 'The feel of a ward', who: s => (s.hero.skills?.arcana || 0) >= 3 || studyLevel(s, 'thaumaturgy') >= 2 || ['elementalist', 'necromancer'].includes(s.hero.specialization), study: 'thaumaturgy', text: () => 'You feel the wards before you see them, and feel where the weave is thin.' },
  zealot: { label: 'A believer’s skin', who: s => !!s.realm?.faithId && (hasNature(s, 'zealous') || hasNature(s, 'devout')), text: () => 'The desecration here prickles your skin. Something holy was done wrong, and the faith above would want to know.' },
  darksight: { label: 'Eyes for the dark', who: s => s.hero.condition?.type === 'vampire' || s.hero.appearance?.ancestry === 'beastfolk', text: () => '' },
});
const sees = (s, d) => d.light > 0 || CUES.darksight.who(s);

// ---------------------------------------------------------------------------
// The floor: one template, filled from the premise.
function buildFloor(s, premise, floor, id) {
  const roll = (salt, n) => seededRoll(s.seed, `delve:${id}:${floor}:${salt}`, n);
  const pick = (rows, salt) => rows[roll(salt, rows.length)];
  const P = premise.rooms, tier = Math.min(4, (premise.tier || 1) + floor - 1);
  const mk = (rid, kind, row, extra = {}) => ({ id: rid, kind, name: row[0], text: row[1], exits: [], hidden: false, seen: false, cleared: false, noticed: [], ...row[2], ...extra });
  const rooms = [mk('approach', 'approach', P.approach), mk('hub', 'hub', P.hub)];
  const chambers = [...P.chambers].sort((a, b) => roll('order:' + a[0], 3) - roll('order:' + b[0], 3));
  chambers.forEach((row, i) => rooms.push(mk(`chamber${i + 1}`, 'chamber', row)));
  rooms.push(mk('secret', 'secret', P.secret, { hidden: true }), mk('lair', 'lair', P.lair), mk('way', 'way', P.way));
  const link = (a, b) => { const A = rooms.find(r => r.id === a), B = rooms.find(r => r.id === b); if (!A.exits.includes(b)) A.exits.push(b); if (!B.exits.includes(a)) B.exits.push(a); };
  link('approach', 'hub'); for (let i = 1; i <= chambers.length; i++) link('hub', `chamber${i}`);
  link(`chamber${1 + roll('secret-door', chambers.length)}`, 'secret'); link('hub', 'lair'); link('lair', 'way'); link('secret', 'way');
  for (const r of rooms) {
    if (r.encounterId) r.encounter = { encounterId: r.encounterId, tier, boss: r.kind === 'lair' };
    else if (r.encounter === true) r.encounter = { encounterId: `free_${premise.family}`, tier: r.boss ? tier + 1 : tier, boss: !!r.boss };
    else r.encounter = null;
    delete r.encounterId; delete r.boss;
    if (r.hazard) r.hazard = { ...r.hazard, sprung: false };
    if (r.find) r.find = { ...r.find, taken: false };
    if (r.relic) r.relic = { ...r.relic, taken: false };
    if (r.objective) r.objective = { ...r.objective, done: false };
  }
  rooms[0].seen = true;
  return rooms;
}
function premiseFor(s, id, questId) {
  if (AUTHORED[id]) return { id, ...AUTHORED[id], tier: 2, authored: true };
  const m = /^descent-(ossuary|roots|tower|abyss)-(\d+)$/.exec(id); if (!m) return null;
  const kind = KINDS[THEME_KIND[m[1]]], roll = (salt, n) => seededRoll(s.seed, `delve:${id}:${salt}`, n), pick = (rows, salt) => rows[roll(salt, rows.length)];
  const tier = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3][roll('tier', 11)], floors = tier >= 3 ? 3 : tier; // most places under a town are shallow; the deep ones are the ones with the stories
  return { id, title: `${kind.title} under ${placeName(s, s.locationId)}`, site: s.locationId, family: kind.family, floors, tier, lairName: kind.lairName, built: pick(kind.builts, 'built'), wrong: pick(kind.wrongs, 'wrong'), lives: kind.lives[0], why: pick(kind.whys, 'why'), rooms: kind.rooms, cues: Object.keys(CUES), authored: false };
}

// ---------------------------------------------------------------------------
// Going in.
export function initializeDelves(s) { if (!s.delves) s.delves = { version: 1, places: {}, descents: 0 }; }
const placeRecord = (s, id) => { s.delves.places[id] ||= { id, visits: 0, seen: [], cleared: [], lairCleared: false, objectiveDone: false, floorsCleared: 0, awake: false, threat: 0, lastDay: s.day, relicTaken: false, secretFound: false }; return s.delves.places[id]; };
export function isDelveEntry(s, id) { return !!s.delves && (id === 'adventure_descend' || id.startsWith('explore_enter_') && Object.hasOwn(AUTHORED, id.slice(14)) && !mazeBegun(s, id.slice(14))); }
export function delveEntryReason(s, id) {
  if (!s.delves || s.phase === 'retired' || s.age < 16) return 'Not for you, not yet.';
  if (s.delve) return 'You are already below.';
  if (s.hero.hp < Math.ceil(s.hero.maxHp * 0.3)) return 'You would not come back. Rest first.';
  if (id === 'adventure_descend' && (s.adventuring?.rations || 0) < 1) return 'Nobody goes down without bread. Buy a ration.';
  return null;
}
/** The door: what you carry decides how long you can stay. A pack of torches, rope, oil and chalk for six gold, if you have it. */
export function enterDelve(s, id, questId = null, ctx = {}) {
  if (!s.delves || s.delve || s.event || s.battle || s.phase === 'retired' || s.age < 16) return false;
  let did = id.startsWith('explore_enter_') ? id.slice(14) : id;
  if (id === 'adventure_descend') { if ((s.adventuring?.rations || 0) < 1) return false; s.adventuring.rations--; s.delves.descents++; const theme = ['ossuary', 'roots', 'tower', 'abyss'][seededRoll(s.seed, `delve:theme:${s.delves.descents}`, 4)]; did = `descent-${theme}-${s.delves.descents}`; }
  const premise = premiseFor(s, did, questId); if (!premise) return false;
  if (premise.authored && s.locationId !== premise.site) return false;
  const rec = placeRecord(s, did); rec.visits++; rec.lastDay = s.day; rec.title = premise.title; rec.site = premise.site;
  if (rec.objectiveDone && questId && s.campaign) { s.campaign.facts['dungeon_' + questId] = true; ctx.touchCampaign?.(); s.notice = 'You have stood at the bottom of this place already; what it had to tell you is in your book.'; return true; }
  const before = s.day; ctx.spendDays?.(1, {}); if (s.day === before && ctx.spendDays) { s.notice = 'The day turns before you reach the door. Come back to it.'; if (id === 'adventure_descend') { s.adventuring.rations++; s.delves.descents--; } rec.visits--; return true; }
  const packed = s.hero.gold >= PACK_COST; if (packed) s.hero.gold -= PACK_COST;
  const rooms = buildFloor(s, premise, 1, did);
  for (const r of rooms) { if (rec.seen.includes(`1:${r.id}`)) { r.seen = true; if (r.hidden) r.hidden = false; } if (rec.cleared.includes(`1:${r.id}`)) { r.cleared = true; if (r.encounter) r.encounter.cleared = true; if (r.find) r.find.taken = true; } }
  if (rec.lairCleared) { const lair = rooms.find(r => r.kind === 'lair'); lair.cleared = true; if (lair.encounter) lair.encounter.cleared = true; }
  s.delve = { version: 1, id: did, questId: questId ? String(questId) : null, title: premise.title, site: premise.site, family: premise.family, lairName: premise.lairName, premise: { built: premise.built, wrong: premise.wrong, lives: premise.lives, why: premise.why }, cues: premise.cues, floor: 1, floors: premise.floors, tier: premise.tier, rooms, at: 'approach', light: packed ? TORCH_HOURS : 2, supplies: { torches: packed ? 3 : 0, rope: packed ? 1 : 0, oil: packed ? 1 : 0, chalk: packed }, noise: rec.awake ? AWAKE : 0, hours: 0, startDay: s.day, finds: [], loot: { gold: 0, materials: {}, herbs: 0 }, lairCleared: !!rec.lairCleared, objectiveDone: false, log: [], awake: !!rec.awake, pending: null };
  note(ctx, premise.title, `${premise.built} ${premise.wrong} ${premise.lives} ${premise.why} ${RUMOUR[Math.min(2, premise.tier - 1)]}${packed ? ` Six gold at the door for three torches, a rope, a flask of oil and a stick of chalk.` : ' You go in with a candle-stub and no rope, because six gold was six gold.'}${rec.visits > 1 ? ` You have been down here before; the chalk is still on the walls where you left it.` : ''}`, 'delve');
  arrive(s, ctx, 'approach', true);
  return true;
}

// ---------------------------------------------------------------------------
// Inside: rooms, light, what you notice, what bites.
const here = s => s.delve.rooms.find(r => r.id === s.delve.at);
const room = (s, id) => s.delve.rooms.find(r => r.id === id);
const log = (s, text) => { s.delve.log.push(text); if (s.delve.log.length > LIMITS.log) s.delve.log.splice(0, s.delve.log.length - LIMITS.log); };
function spendHours(s, n, ctx) {
  const d = s.delve; const before = Math.floor(d.hours / DAY_HOURS); d.hours += n;
  // Light burns while you move; a fresh torch is lit from the last without asking.
  d.light = Math.max(0, d.light - n); while (d.light <= 0 && d.supplies.torches > 0) { d.supplies.torches--; d.light += TORCH_HOURS; log(s, 'You light the next torch from the stub of the last.'); }
  const days = Math.floor(d.hours / DAY_HOURS) - before; if (days > 0) ctx.spendDays?.(days, {});
}
const hiddenExit = (s, r) => r.exits.some(x => room(s, x).hidden);
/** Which eyes a room has something for. */
function applies(s, id, r) {
  const d = s.delve;
  switch (id) {
    case 'read': return !!r.inscription;
    case 'old_elvish': return !!r.inscription && ['approach', 'way', 'lair', 'secret'].includes(r.kind);
    case 'history': case 'siegecraft': return ['hub', 'lair'].includes(r.kind);
    case 'anatomy': return r.hazard?.cue === 'anatomy' || r.kind === 'lair';
    case 'miner': return r.hazard?.cue === 'miner' || !!r.find?.materials?.ore || hiddenExit(s, r);
    case 'thief': return r.hazard?.cue === 'thief' || hiddenExit(s, r) || !!(r.find && !r.find.taken);
    case 'hunter': return !!r.spoor || !!(r.encounter && !r.encounter.cleared) || hiddenExit(s, r);
    case 'arcanist': return r.hazard?.cue === 'arcanist' || !!(r.encounter && ['spirit', 'construct'].includes(d.family)) || hiddenExit(s, r);
    case 'zealot': return !!r.relic || r.kind === 'lair';
    default: return false;
  }
}
function revealSecret(s, r, why) {
  const secret = s.delve.rooms.find(x => x.kind === 'secret');
  if (secret?.hidden && r.exits.includes('secret')) { secret.hidden = false; return `${why} ${secret.name.toLowerCase()}: a way the builders hid.`; }
  return null;
}
function notice(s, r, ctx) {
  const d = s.delve; if (!sees(s, d)) return [];
  const hits = [];
  for (const id of d.cues) { const cue = CUES[id]; if (!cue || id === 'darksight' || r.noticed.includes(id) || !cue.who(s) || !applies(s, id, r)) continue; r.noticed.push(id); hits.push(id); if (cue.study) useStudy(s, cue.study); }
  // The right eyes find the door the builders hid: a draught, a hollow note, a track that goes into the wall.
  hits.reveal = null;
  if (hits.some(id => ['thief', 'miner', 'hunter', 'arcanist'].includes(id)) || hits.includes('read') && r.inscription) hits.reveal = revealSecret(s, r, { thief: 'A draught where no draught should be, and behind the slab', miner: 'The wall rings hollow under your knuckle, and behind it', hunter: 'The tracks go into the wall, and so does', arcanist: 'The weave is thin along one wall, and behind it', read: 'What is written here points to' }[hits.find(id => ['thief', 'miner', 'hunter', 'arcanist', 'read'].includes(id))] || 'You find');
  return hits;
}
function arrive(s, ctx, id, first = false) {
  const d = s.delve, r = room(s, id); d.at = id; r.seen = true;
  if (!first) { spendHours(s, d.supplies.chalk || !r.seen ? 1 : 2, ctx); d.noise = clamp(d.noise + NOISE.step); }
  const dark = !sees(s, d);
  const hits = notice(s, r, ctx);
  const lines = [`${r.name}. ${r.text}`];
  if (dark) lines.push('You cannot see your hand. Whatever is written here, whatever is set for the unwary, you will learn by touch.');
  for (const id of hits) { const t = CUES[id].text(r); if (t) lines.push(t); }
  if (hits.reveal) lines.push(hits.reveal);
  // What bites: a hazard noticed is a hazard stepped round; one not noticed takes its due.
  if (r.hazard && !r.hazard.sprung && !r.cleared) {
    if (!dark && r.noticed.includes(r.hazard.cue)) { r.hazard.sprung = true; lines.push(`You step round it. ${{ trap: 'The wire stays taut and the slab stays level.', ceiling: 'You are out from under before it comes down behind you.', water: 'You keep to the shelf and out of the water.', gas: 'You hold your breath and go through quick.', ward: 'You step over the weave where it is thin.', thorns: 'You go between the vines where they are sleeping.', drop: 'You see the edge before the edge sees you.' }[r.hazard.kind] || ''}`); }
    else { r.hazard.sprung = true; const dmg = Math.max(3, Math.round(s.hero.maxHp * (dark ? 0.25 : 0.15))); s.hero.hp = Math.max(1, s.hero.hp - dmg); d.noise = clamp(d.noise + NOISE.hazard); lines.push(`${r.hazard.text} (${dmg} health.)`); if (r.hazard.kind === 'gas') spendHours(s, 1, ctx); }
  }
  log(s, lines.join(' '));
  // Something lives here, and it has heard you.
  if (r.encounter && !r.encounter.cleared && !r.encounter.fled) { d.pending = { roomId: r.id }; const e = r.encounter, title = r.kind === 'lair' ? `${cap(d.lairName)}` : r.name; if (dark) { const dmg = Math.round(s.hero.maxHp * 0.1); s.hero.hp = Math.max(1, s.hero.hp - dmg); log(s, `It has you before you have it: ${dmg} health in the dark before you can draw.`); } ctx.startBattle?.(e.encounterId, battleContext(d, r.id, e.tier + (d.noise >= AWAKE ? 1 : 0), title, e.boss)); return; }
  // The lair, woken, comes looking.
  if (d.noise >= STIRRING && !d.lairCleared && r.kind !== 'lair') { const lair = d.rooms.find(x => x.kind === 'lair'); if (lair.encounter && !lair.encounter.cleared) { d.pending = { roomId: lair.id, cameTo: r.id }; log(s, `${cap(d.lairName)} has heard enough. It comes to you.`); ctx.startBattle?.(lair.encounter.encounterId, battleContext(d, lair.id, lair.encounter.tier, cap(d.lairName), true, r.id)); } }
}
/** Every value a string: the save keeps the context and the battle's result must match it word for word. */
const battleContext = (d, roomId, tier, title, boss, cameTo = null) => ({ kind: 'delve', id: d.id, floor: String(d.floor), roomId, tier: String(Math.max(1, tier)), family: d.family, title: String(title).slice(0, 120), boss: boss ? 'yes' : 'no', ...(cameTo ? { cameTo } : {}) });
const safeHere = s => { const d = s.delve, r = here(s); if (r.kind === 'approach') return true; if (r.encounter && !r.encounter.cleared) return false; return r.exits.every(x => { const n = room(s, x); return n.seen && (!n.encounter || n.encounter.cleared || n.encounter.fled); }) && d.noise < AWAKE; };
const canOut = s => { const d = s.delve, r = here(s); return r.kind === 'approach' || r.kind === 'way' && d.rooms.find(x => x.kind === 'secret')?.seen && !d.rooms.find(x => x.kind === 'secret').hidden; };
const action = (id, label, description, extra = {}) => ({ id, label, description, days: 0, cost: 0, group: 'The delve', ...extra });

export function delveActions(s) {
  const d = s.delve; if (!d || s.event || s.battle || s.phase === 'retired') return [];
  const r = here(s), rows = [], dark = !sees(s, d);
  const ears = CUES.hunter.who(s) || CUES.darksight.who(s); // a hunter hears what is behind a door before opening it
  for (const x of r.exits) { const n = room(s, x); if (n.hidden) continue; rows.push(action(`delve_go_${x}`, n.seen ? `Back to ${n.name.toLowerCase()}` : `On to ${n.name.toLowerCase()}`, n.seen ? (n.cleared || !n.encounter ? 'Quiet, as far as you know.' : 'Something is still in there.') : n.kind === 'lair' ? `${cap(d.lairName)} is in there. You can hear it.` : ears && n.encounter && !n.encounter.cleared ? 'Something is breathing in there. You can hear it from here.' : 'You have not been that way.', { days: 0 })); }
  if (!r.searched && !(r.encounter && !r.encounter.cleared)) rows.push(action('delve_search', 'Search the room', `An hour of light and some noise. ${r.find && !r.find.taken ? 'There is something here.' : 'There may be nothing.'}`, dark ? { disabledReason: 'You cannot search what you cannot see.' } : {}));
  if (r.find && !r.find.taken && r.searched) rows.push(action('delve_take', `Take ${r.find.kind === 'page' ? 'the pages' : 'what is here'}`, r.find.text));
  if (r.relic && !r.relic.taken && r.kind === 'way' && (r.objective?.done || d.objectiveDone)) rows.push(action('delve_relic', `Take ${r.relic.name}`, `${r.relic.text} It has an owner above.`));
  if (r.objective && !r.objective.done) { const lairAlive = !d.lairCleared && d.rooms.find(x => x.kind === 'lair').encounter, sneaked = d.rooms.find(x => x.kind === 'secret')?.seen; rows.push(action('delve_claim', r.objective.kind === 'spring' ? 'Cut the moonroot' : r.objective.kind === 'signal' ? 'Light the brazier' : r.objective.kind === 'anchor' ? 'Read the first instruction' : r.objective.kind === 'hoard' ? 'Count the hoard' : 'Record what is here', lairAlive ? `${r.text} ${cap(d.lairName)} is alive in the next chamber. It will hear this.` : r.text, lairAlive && !sneaked ? { disabledReason: `${cap(d.lairName)} is between you and it, and knows you are here.` } : {})); }
  if (d.supplies.torches > 0 && d.light < 2) rows.push(action('delve_torch', 'Light a fresh torch', `${d.supplies.torches} left. Four hours each.`));
  if (d.supplies.oil > 0 && r.nest && r.encounter && !r.encounter.cleared) rows.push(action('delve_oil', 'Fire the nest', 'The flask of oil and a torch. Nothing in there survives it. Everything else down here hears it.'));
  rows.push(action('delve_camp', 'Make camp here', `Eight hours and a ration: your strength back, the halls quieter. ${safeHere(s) ? 'You have made this room safe.' : ''}`, !safeHere(s) ? { disabledReason: 'You have not made this room safe.' } : (s.adventuring?.rations || 0) < 1 ? { disabledReason: 'No bread. Camp means eating.' } : {}));
  if (r.kind === 'way' && d.floor < d.floors && !(r.encounter && !r.encounter.cleared)) rows.push(action('delve_descend', 'Go down', `Floor ${d.floor + 1} of ${d.floors}: better finds, worse odds. ${d.supplies.rope ? 'You have the rope.' : 'No rope. It is a drop.'}`));
  if (canOut(s)) rows.push(action('delve_out', 'Climb out', r.kind === 'approach' ? 'Back to the daylight with what you carry.' : 'The way the builders hid takes you up behind everything.'));
  return rows;
}
export function applyDelveAction(s, id, ctx = {}) {
  const d = s.delve; if (!d || typeof id !== 'string' || !id.startsWith('delve_') || s.event || s.battle) return false;
  const r = here(s);
  if (id.startsWith('delve_go_')) { const to = id.slice(9); if (!r.exits.includes(to) || room(s, to).hidden) return false; arrive(s, ctx, to); return true; }
  if (id === 'delve_search') { if (r.searched || !sees(s, d) || r.encounter && !r.encounter.cleared) return false; r.searched = true; spendHours(s, 1, ctx); d.noise = clamp(d.noise + NOISE.search); const door = revealSecret(s, r, 'An hour on your knees along the walls finds'); if (door) log(s, door); if (r.find && !r.find.taken) log(s, `You find it: ${r.find.text}`); else if (!door) log(s, 'Dust, bones, nothing you can carry. An hour of light gone.'); return true; }
  if (id === 'delve_take') { if (!r.find || r.find.taken || !r.searched) return false; const f = r.find; f.taken = true; r.cleared = r.cleared || !r.encounter; if (f.gold) { s.hero.gold += f.gold; d.loot.gold += f.gold; } for (const [k, n] of Object.entries(f.materials || {})) { if (s.equipment?.materials) s.equipment.materials[k] = Math.min(100000, (s.equipment.materials[k] || 0) + n); d.loot.materials[k] = (d.loot.materials[k] || 0) + n; } if (f.herbs) { s.flags.herbs = (s.flags.herbs || 0) + f.herbs; d.loot.herbs += f.herbs; } if (f.kind === 'page') d.finds.push({ kind: 'page', room: r.name, text: f.text }); if (d.finds.length > LIMITS.finds) d.finds.splice(0, 1); if (f.kind === 'cache' && f.gold >= 8) { d.supplies.torches++; log(s, 'There is a torch in it too, which you take.'); } return true; }
  if (id === 'delve_relic') { if (!r.relic || r.relic.taken || !(r.objective?.done || d.objectiveDone)) return false; r.relic.taken = true; placeRecord(s, d.id).relicTaken = true; d.finds.push({ kind: r.relic.kind, name: r.relic.name, owner: r.relic.owner, ownerName: r.relic.ownerName || null, text: r.relic.text }); log(s, `You take ${r.relic.name}. It is heavier than it looks, the way owned things are.`); return true; }
  if (id === 'delve_claim') { const lairAlive = !d.lairCleared && d.rooms.find(x => x.kind === 'lair').encounter; if (!r.objective || r.objective.done || lairAlive && !d.rooms.find(x => x.kind === 'secret')?.seen) return false; if (lairAlive) { d.noise = Math.max(d.noise, STIRRING); log(s, `${cap(d.lairName)} has heard you. Whatever you do next, do it quickly.`); } r.objective.done = true; d.objectiveDone = true; r.cleared = true; if (r.objective.herbs) { s.flags.herbs = (s.flags.herbs || 0) + r.objective.herbs; d.loot.herbs += r.objective.herbs; } if (r.objective.kind === 'hoard') { const gold = 20 + d.tier * 12 + d.floor * 8; s.hero.gold += gold; d.loot.gold += gold; } if (d.questId && s.campaign) { s.campaign.facts['dungeon_' + d.questId] = true; ctx.touchCampaign?.(); } log(s, r.objective.text); note(ctx, d.title, `${r.name}: ${r.objective.text} ${d.hours} hours below, ${d.floor === d.floors ? 'and the bottom reached' : 'and further to go'}.`); return true; }
  if (id === 'delve_torch') { if (d.supplies.torches < 1) return false; d.supplies.torches--; d.light += TORCH_HOURS; log(s, 'A fresh torch. The room gets its corners back.'); return true; }
  if (id === 'delve_oil') { if (d.supplies.oil < 1 || !r.nest || !r.encounter || r.encounter.cleared) return false; d.supplies.oil--; r.encounter.cleared = true; r.cleared = true; d.noise = clamp(d.noise + NOISE.oil); spendHours(s, 1, ctx); log(s, 'You pour the oil along the floor and throw the torch from the door. The nest goes up with a sound like a crowd. Nothing in there survives it. Everything else down here heard it.'); return true; }
  if (id === 'delve_camp') { if (!safeHere(s) || (s.adventuring?.rations || 0) < 1) return false; s.adventuring.rations--; spendHours(s, 8, ctx); d.light = Math.max(d.light, 0); d.noise = clamp(d.noise + NOISE.camp); s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + Math.round(s.hero.maxHp * 0.4)); s.hero.mp = s.hero.maxMp; for (const p of (s.companions || []).filter(p => p.recruited && p.active && p.alive !== false)) { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4)); p.mp = p.maxMp; } log(s, 'You eat, and sleep with your back to a wall you have checked, and wake stiff and better.'); return true; }
  if (id === 'delve_descend') { if (r.kind !== 'way' || d.floor >= d.floors || r.encounter && !r.encounter.cleared) return false; const rec = placeRecord(s, d.id); for (const x of d.rooms) { if (x.seen) rec.seen.push(`${d.floor}:${x.id}`); if (x.cleared) rec.cleared.push(`${d.floor}:${x.id}`); } rec.seen = [...new Set(rec.seen)].slice(-80); rec.cleared = [...new Set(rec.cleared)].slice(-80); rec.floorsCleared = Math.max(rec.floorsCleared, d.floor); if (d.supplies.rope) { d.supplies.rope--; log(s, 'You tie the rope off and go down it hand over hand into the next dark.'); } else { const dmg = Math.round(s.hero.maxHp * 0.15); s.hero.hp = Math.max(1, s.hero.hp - dmg); log(s, `No rope. You go down the drop the hard way and lose ${dmg} health and some skin to it.`); } d.floor++; d.rooms = buildFloor(s, { ...premiseFor(s, d.id, d.questId), tier: d.tier }, d.floor, d.id); d.lairCleared = false; d.objectiveDone = false; d.noise = clamp(d.noise - 20); spendHours(s, 1, ctx); arrive(s, ctx, 'approach', true); return true; }
  if (id === 'delve_out') { if (!canOut(s)) return false; endDelve(s, ctx, 'out'); return true; }
  return false;
}

// ---------------------------------------------------------------------------
// The fight, and what comes after it.
export function afterDelveBattle(s, pending, outcome, ctx = {}, completed = null) {
  const d = s.delve; if (!d) return; const c = pending.context || {}, r = room(s, c.roomId); d.pending = null;
  const boss = c.boss === 'yes';
  if (outcome === 'victory') {
    if (r?.encounter) { r.encounter.cleared = true; r.cleared = true; }
    d.noise = clamp(d.noise + NOISE.fight);
    if (boss) { d.lairCleared = true; const rec = placeRecord(s, d.id); rec.lairCleared = true; rec.awake = false; rec.threat = 0; for (const x of d.rooms) if (x.encounter && !x.encounter.cleared && x.nest) { x.encounter.cleared = true; x.cleared = true; } log(s, `${cap(d.lairName)} is dead. Whatever was waiting on it scatters into the dark; the young do not stay without the mother.`); note(ctx, d.title, `${cap(d.lairName)} is dead at the bottom of ${low(d.title)}, and the place is quiet in a way it has not been in years.`); }
    else log(s, `It is dead, and you are not. The halls heard it.`);
    if (c.cameTo && r?.kind === 'lair') d.at = c.cameTo; else if (r) d.at = r.id;
    return;
  }
  if (outcome === 'retreat') { if (r?.encounter) r.encounter.fled = true; d.noise = clamp(d.noise + NOISE.retreat); d.at = r && r.kind !== 'lair' ? r.id : (c.cameTo || here(s).id); const back = room(s, d.at).exits.find(x => room(s, x).seen && (!room(s, x).encounter || room(s, x).encounter.cleared)); if (back && r && !c.cameTo) d.at = back; log(s, 'You back out of it with your face to it, and it lets you, this time. It will be there when you come back.'); return; }
  // Defeat below ground is death, except on the gentle setting, where your companions carry you out.
  if (s.difficulty === 'gentle' || !(s.companions || []).length && s.difficulty === 'gentle') { const rec = placeRecord(s, d.id); rec.awake = true; rec.threat = Math.max(rec.threat, 40); s.hero.hp = Math.max(1, Math.ceil(s.hero.maxHp * 0.1)); note(ctx, 'Carried out', `You do not remember the climb. Someone carried you, and you woke in daylight at the mouth of ${low(d.title)} with ${d.hours} hours gone and the thing below still alive and awake.`); endDelve(s, ctx, 'carried'); return; }
  const rec = placeRecord(s, d.id); rec.awake = true; rec.threat = Math.max(rec.threat, 50); rec.deaths = (rec.deaths || 0) + 1;
  note(ctx, d.title, `${s.hero.name} died in ${low(d.title)}, ${d.floor > 1 ? `on the ${d.floor === 2 ? 'second' : 'third'} floor down` : 'at the bottom of the first stair'}, ${d.hours} hours in, with ${d.supplies.torches} torches left. The place keeps the body.`);
  s.delve = null;
  const killer = (completed?.actors || pending.actors || []).find(a => a.side === 'enemy' && a.hp > 0)?.name || (completed?.actors || []).find(a => a.side === 'enemy')?.name;
  ctx.endLife?.(`Killed in ${low(d.title)} by ${killer ? withArticle(killer.toLowerCase()) : 'what lives there'}`);
}

// ---------------------------------------------------------------------------
// Coming out, and what you brought up with you.
function endDelve(s, ctx, how) {
  const d = s.delve; if (!d) return; const rec = placeRecord(s, d.id);
  for (const x of d.rooms) { if (x.seen) rec.seen.push(`${d.floor}:${x.id}`); if (x.cleared) rec.cleared.push(`${d.floor}:${x.id}`); }
  rec.seen = [...new Set(rec.seen)].slice(-80); rec.cleared = [...new Set(rec.cleared)].slice(-80);
  if (d.objectiveDone) { rec.objectiveDone = true; rec.floorsCleared = Math.max(rec.floorsCleared, d.floor); }
  if (d.rooms.find(x => x.kind === 'secret')?.seen) rec.secretFound = true;
  if (d.lairCleared) { rec.lairCleared = true; rec.awake = false; rec.threat = 0; }
  else if (d.noise >= AWAKE || d.rooms.some(x => x.encounter?.fled)) { rec.awake = true; rec.threat = Math.max(rec.threat, 30); }
  const relic = d.finds.find(f => f.kind === 'relic' || f.kind === 'heirloom');
  // The world above: a cleared lair is a quieter town; a woken one is a village that will hear from it.
  const site = isSettlement(s.world, d.site) ? d.site : homeOf(s), rs = s.realm?.sites?.[site];
  if (d.lairCleared && how === 'out') { if (rs) rs.security = clamp(rs.security + 8); ctx.standing?.('villagers', 6); if (s.world.changes && !s.world.changes.some(c => c.id === `delve-quiet-${d.id}`)) { s.world.changes.push({ id: `delve-quiet-${d.id}`, day: s.day, title: `${d.title} is quiet`, text: `Somebody went down into ${low(d.title)} and came up again, and the thing that lived there did not. The road past it is walked after dark now.`, locationId: site, source: 'delve' }); } }
  const spoils = relic ? ` You carry ${relic.name} up with you, and it has an owner above.` : '';
  note(ctx, how === 'carried' ? 'Carried out' : 'Daylight', `${d.hours} hours under ${low(d.title)}: ${d.loot.gold} gold, ${Object.entries(d.loot.materials).map(([k, n]) => `${n} ${k}`).join(', ') || 'no materials'}${d.loot.herbs ? `, ${d.loot.herbs} bundles of herbs` : ''}, ${d.finds.filter(f => f.kind === 'page').length} pages for your book. ${d.lairCleared ? `${cap(d.lairName)} is dead.` : rec.awake ? `${cap(d.lairName)} is alive down there, and awake.` : `${cap(d.lairName)} is alive down there.`}${spoils}`, 'delve');
  s.delves.history ||= []; s.delves.history.push({ id: d.id, title: d.title, day: s.day, hours: d.hours, floor: d.floor, lairCleared: d.lairCleared, objectiveDone: d.objectiveDone, how }); if (s.delves.history.length > 24) s.delves.history.splice(0, s.delves.history.length - 24);
  const pages = d.finds.filter(f => f.kind === 'page'); if (pages.length) note(ctx, 'Pages from below', pages.map(p => `${p.room}: ${p.text}`).join(' '), 'delve');
  s.delve = null; ctx.touchCampaign?.();
  if (relic) s.delves.pending = { kind: 'spoils', relic, site, from: d.title };
}
export function flushDelveEvent(s, ctx = {}) {
  const p = s.delves?.pending; if (!p || s.event || s.battle || s.delve || s.phase === 'retired') return false;
  if (p.kind === 'spoils') {
    const r = p.relic, owner = r.owner === 'faith' ? 'the shrine' : r.owner === 'guild' ? (r.ownerName || 'the guild') : `the ${generatePersonName(s.seed, `delve:family:${p.site}:${r.name}`).split(' ').slice(-1)[0]} family`; p.ownerLabel = owner;
    const price = r.kind === 'relic' ? 45 : 25;
    ctx.setEvent?.('delve_spoils', 'What you brought up', 'The delve', `${r.text} ${r.owner === 'family' ? `${cap(owner)} are still here, two streets over, and have been asking after it for years.` : r.owner === 'faith' ? 'The keeper at the shrine would know it at a glance, and so would the faithful.' : `${cap(owner)} would know it, and would want it back, and would not thank you for having it.`} A dealer who does not ask questions would give ${price} gold for it.`, [
      { id: 'return', label: `Return it to ${owner}`, description: r.owner === 'family' ? 'A thing they lost, back on the table. They will not forget who brought it.' : r.owner === 'faith' ? 'The keeper takes it in both hands. The faith remembers who brings things back.' : 'Handed in at the hall. They will remember that you could have sold it.' },
      { id: 'sell', label: `Sell it: ${price} gold`, description: `A dealer who does not ask. ${r.owner === 'faith' ? 'Robbing the dead of the faith is a thing the faith has words for.' : 'Someone will hear where it went.'}` },
      { id: 'continue', label: 'Keep it', description: 'On your shelf, where its owner may one day see it.' },
    ]); return true;
  }
  s.delves.pending = null; return false;
}
export function applyDelveChoice(s, eventId, pick, ctx = {}) {
  const p = s.delves?.pending; if (!p || eventId !== 'delve_spoils') return false;
  const r = p.relic, owner = p.ownerLabel || 'its owner';
  if (s.event?.id === eventId) s.event = null;
  if (pick === 'return') { companionOpinion(s, 'honour', ctx); if (r.owner === 'faith') { if (s.realm) s.realm.devotion = Math.min(100, (s.realm.devotion || 0) + 8); ctx.standing?.('order', 3); ctx.standing?.('villagers', 3); } else if (r.owner === 'family') { ctx.standing?.('villagers', 8); addStationTie(s, { kind: 'knows', name: cap(owner), note: `you brought back ${r.name} from ${low(p.from)}` }); } else { if (s.guild?.member && r.ownerName && s.guild.member.craft === (r.ownerName.includes('smith') ? 'blacksmith' : s.guild.member.craft)) s.guild.member.standing = Math.min(100, s.guild.member.standing + 6); ctx.standing?.('academy', 3); } note(ctx, 'What you brought up', `You put ${r.name} on the table at ${owner === 'the shrine' ? 'the shrine' : owner === 'its owner' ? 'the hall' : `${owner}’s door`} and said where it was from. ${r.owner === 'family' ? 'Nobody said anything for a while. Then the grandmother did.' : 'They did not ask what else was down there, which was a kindness.'}`); }
  else if (pick === 'sell') { const price = r.kind === 'relic' ? 45 : 25; s.hero.gold += price; companionOpinion(s, 'greed', ctx); if (r.owner === 'faith') { if (s.realm) s.realm.devotion = Math.max(0, (s.realm.devotion || 0) - 12); ctx.standing?.('order', -4); addStationTie(s, { kind: 'hates', name: 'the keeper of the shrine', note: `you sold ${r.name} that came out of the dead’s keeping` }); } else { ctx.standing?.('villagers', -4); addStationTie(s, { kind: 'hates', name: cap(owner), note: `you sold ${r.name}, which was theirs` }); } ctx.standing?.('underworld', 2); note(ctx, 'What you brought up', `${price} gold from a dealer who did not ask, for ${r.name}. ${r.owner === 'faith' ? 'The keeper heard by the week’s end, because keepers do, and has a word for what you did.' : `${cap(owner)} heard where it went. They will not come to your door about it. They will not need to.`}`); }
  else { s.delves.kept ||= []; s.delves.kept.push({ name: r.name, owner: r.owner, from: p.from, day: s.day }); s.delves.kept = s.delves.kept.slice(-12); note(ctx, 'What you brought up', `${cap(r.name)} goes on the shelf by the door, where anyone who comes in can see it, and one day someone will know what it is.`); }
  s.delves.pending = null; return true;
}

// ---------------------------------------------------------------------------
// The seasons: a woken place left alone reaches the village.
export function onDelveTime(s, { newDay }, ctx = {}) {
  const D = s.delves; if (!D || s.phase === 'retired' || !s.living) return;
  const to = seasonOf(newDay); D.lastSeason ??= seasonOf(D.lastDay ?? newDay) - 1;
  for (let n = D.lastSeason + 1; n <= to; n++) {
    for (const rec of Object.values(D.places)) {
      if (!rec.awake || rec.lairCleared) continue;
      rec.threat = clamp(rec.threat + 15);
      if (rec.threat >= 100) { rec.threat = 40; rec.raids = (rec.raids || 0) + 1; const site = isSettlement(s.world, rec.site) ? rec.site : homeOf(s); const title = rec.title || 'the delve'; raidFromBelow(s, n, site, title, `Something came up out of ${title.toLowerCase()} in the night and took what it wanted from the edge of ${placeName(s, site)}. The men who went to look at the mouth of it did not go in.`); note(ctx, 'From below', `${cap(title)} has reached the village: a goat, then a dog, then a child from the edge houses. The thing down there was woken and never put down.`, 'world'); }
    }
    D.lastSeason = n;
  }
}

// ---------------------------------------------------------------------------
// Reading it back.
export function delveView(s) {
  const d = s.delve; if (!d) return null;
  const r = here(s), dark = !sees(s, d);
  return { title: d.title, premise: { ...d.premise }, floor: d.floor, floors: d.floors, hours: d.hours, days: Math.floor(d.hours / DAY_HOURS), light: d.light, dark, supplies: { ...d.supplies, rations: s.adventuring?.rations || 0 }, noise: d.noise, noiseWord: d.noise >= STIRRING ? 'the lair is coming' : d.noise >= AWAKE ? 'the halls are awake' : d.noise >= 30 ? 'something has heard you' : 'quiet', lairName: d.lairName, lairCleared: d.lairCleared, objectiveDone: d.objectiveDone,
    room: { id: r.id, kind: r.kind, name: r.name, text: r.text, noticed: r.noticed.map(id => ({ id, label: CUES[id]?.label || id })), searched: !!r.searched, find: r.find && !r.find.taken && r.searched ? r.find.text : null, cleared: !!r.cleared, hazard: r.hazard ? { kind: r.hazard.kind, sprung: r.hazard.sprung } : null },
    rooms: d.rooms.filter(x => x.seen || (!x.hidden && r.exits.includes(x.id))).map(x => ({ id: x.id, kind: x.kind, name: x.name, seen: x.seen, here: x.id === r.id, cleared: !!x.cleared, danger: !!(x.encounter && !x.encounter.cleared), exits: x.exits.filter(e => !room(s, e).hidden) })),
    log: d.log.slice(-6), finds: d.finds.map(f => ({ ...f })), loot: { ...d.loot, materials: { ...d.loot.materials } } };
}
export function delveSummary(s) { const D = s.delves; if (!D) return ''; const places = Object.values(D.places); if (!places.length) return ''; const quiet = places.filter(p => p.lairCleared).length, awake = places.filter(p => p.awake && !p.lairCleared).length; return `${places.length} place${places.length === 1 ? '' : 's'} gone down into: ${quiet} put to rest${awake ? `, ${awake} woken and left` : ''}.`; }
export function validateDelve(s) {
  const D = s.delves, d = s.delve, int = (n, max = 1000000) => Number.isSafeInteger(n) && n >= 0 && n <= max, str = (v, max = 400) => typeof v === 'string' && v.length <= max;
  if (D === undefined) return d === undefined || d === null;
  if (!D || D.version !== 1 || !D.places || typeof D.places !== 'object' || Object.keys(D.places).length > LIMITS.places || !int(D.descents, 10000)) return false;
  for (const p of Object.values(D.places)) if (!p || !str(p.id, 60) || !int(p.visits, 10000) || !Array.isArray(p.seen) || p.seen.length > 80 || !Array.isArray(p.cleared) || p.cleared.length > 80 || typeof p.lairCleared !== 'boolean' || typeof p.objectiveDone !== 'boolean' || !int(p.floorsCleared, 3) || typeof p.awake !== 'boolean' || !int(p.threat, 100) || !int(p.lastDay) || (p.title !== undefined && !str(p.title, 120)) || (p.site !== undefined && !str(p.site, 80)) || (p.deaths !== undefined && !int(p.deaths, 100)) || (p.raids !== undefined && !int(p.raids, 100))) return false;
  if (!(D.pending === undefined || D.pending === null || D.pending && D.pending.kind === 'spoils' && D.pending.relic && str(D.pending.relic.name, 120) && ['relic', 'heirloom'].includes(D.pending.relic.kind) && ['faith', 'family', 'guild'].includes(D.pending.relic.owner) && str(D.pending.site, 80) && str(D.pending.from, 120))) return false;
  if (D.lastSeason !== undefined && !Number.isSafeInteger(D.lastSeason)) return false;
  if (D.history !== undefined && (!Array.isArray(D.history) || D.history.length > 24 || !D.history.every(h => h && str(h.id, 60) && str(h.title, 120) && int(h.day) && int(h.hours, 100000) && int(h.floor, 3) && typeof h.lairCleared === 'boolean' && typeof h.objectiveDone === 'boolean' && ['out', 'carried'].includes(h.how)))) return false;
  if (D.kept !== undefined && (!Array.isArray(D.kept) || D.kept.length > 12)) return false;
  if (d === null || d === undefined) return !s.event?.id?.startsWith('delve_') || !!D.pending;
  if (!d || d.version !== 1 || !str(d.id, 60) || !(d.questId === null || str(d.questId, 60)) || !str(d.title, 120) || !str(d.site, 80) || !['beast', 'undead', 'spirit', 'construct', 'bandit', 'aberration'].includes(d.family) || !str(d.lairName, 80) || !d.premise || !int(d.floor, 3) || d.floor < 1 || !int(d.floors, 3) || d.floor > d.floors || !int(d.tier, 6) || !Array.isArray(d.rooms) || d.rooms.length < 6 || d.rooms.length > 9 || !d.rooms.some(r => r.id === d.at) || !int(d.light, 1000) || !d.supplies || !int(d.supplies.torches, 100) || !int(d.supplies.rope, 10) || !int(d.supplies.oil, 10) || typeof d.supplies.chalk !== 'boolean' || !int(d.noise, 100) || !int(d.hours, 100000) || !int(d.startDay) || !Array.isArray(d.finds) || d.finds.length > LIMITS.finds || !d.loot || !int(d.loot.gold, 100000) || typeof d.lairCleared !== 'boolean' || typeof d.objectiveDone !== 'boolean' || !Array.isArray(d.log) || d.log.length > LIMITS.log || !(d.pending === null || d.pending && str(d.pending.roomId, 20))) return false;
  for (const r of d.rooms) if (!r || !str(r.id, 20) || !['approach', 'hub', 'chamber', 'secret', 'lair', 'way'].includes(r.kind) || !str(r.name, 80) || !str(r.text, 600) || !Array.isArray(r.exits) || !r.exits.every(e => d.rooms.some(x => x.id === e)) || typeof r.hidden !== 'boolean' || typeof r.seen !== 'boolean' || typeof r.cleared !== 'boolean' || !Array.isArray(r.noticed) || !(r.encounter === null || r.encounter && str(r.encounter.encounterId, 40) && int(r.encounter.tier, 8))) return false;
  if (s.battle && s.battle.context?.kind === 'delve' && !d.pending) return false;
  if (s.maze || s.dungeon || s.adventuring?.expedition || s.rpg?.expedition || s.timeline?.journey || s.cartography?.offsite || s.cartography?.pending) return false;
  return true;
}
/** An heir takes up the same places: what was put to rest stays quiet, what was woken is still awake, and what sat on the shelf is theirs now. */
export function inheritDelves(old, s) {
  if (!old.delves || !s.delves) return;
  s.delves.places = structuredClone(old.delves.places); s.delves.descents = old.delves.descents; s.delves.lastSeason = seasonOf(s.day) - 1;
  if (old.delves.kept?.length) s.delves.kept = structuredClone(old.delves.kept);
}
