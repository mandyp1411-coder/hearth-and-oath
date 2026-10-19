// Authored realm content. The engine owns time, law, rewards and consequences.
// No ancestry, presentation or inherited trait restricts a faith or a region.
export const REGION_TEMPLATES = [
  {
    id: 'rainward', name: 'The Rainward March', climate: 'rain-soaked lowlands', resource: 'bog iron',
    description: 'Black water gathers beneath the raised roads. Marsh lights follow the last cart home, and the watch hangs iron lanterns over every crossing. Behind the warm windows, neighbors argue about who deserves protection when the outer bells begin to toll.',
    law: { name: 'The Lantern Assize', theftFinePerEvidence: 12, prisonDaysPerEvidence: 4, enforcement: 65, contrabandAllowed: false, publicMagic: 'licensed' },
    dominantFaith: 'lantern', tradeFocus: 'martial',
    conflictFlavor: [
      'A watch bell sounds from a tower that has stood empty for three winters. Two rival companies arrive to claim its road.',
      'Soldiers ford the blackwater with their banner wrapped around a coffin. The villages downstream bar their doors.',
      'A lord orders every bridge lantern extinguished so an approaching army cannot follow the causeway. Travelers are still outside.',
      'The reed beds hide deserters from both armies. Their pursuers burn the same signal fires and offer different names for the war.',
    ],
    developmentFlavor: [
      'Raised walkways reach the outer hearths. For the first time in years, children can cross the marsh without waiting for a ferryman.',
      'A drained bog yields good iron and a row of ancient helmets. A smithy opens beside the place where the dead were found.',
      'The first stone pier replaces a timber bridge. Its lantern burns through the rain, drawing merchants to the little market.',
      'Water takes the low ward again. Survivors build higher, leaving chimney tops and a submerged shrine beneath their new windows.',
    ],
  },
  {
    id: 'saltreach', name: 'The Salt and Cinder Coast', climate: 'wind-cut coast and sheltered inland valleys', resource: 'sea salt',
    description: 'Cliffside towns lean over a sea that sometimes returns what it swallowed. Salt whitens shrine ropes and sailors’ coats alike. Foreign vessels bring strange goods, strange gods and crews who will not describe the lights they saw beyond the headlands.',
    law: { name: 'The Harbor Articles', theftFinePerEvidence: 18, prisonDaysPerEvidence: 3, enforcement: 50, contrabandAllowed: true, publicMagic: 'licensed' },
    dominantFaith: 'moon', tradeFocus: 'coastal',
    conflictFlavor: [
      'Warships anchor beyond the headland. Their lanterns remain dark, but fishing boats return with arrows in their sails.',
      'A privateer sells captured bells in the harbor. One rings by itself whenever a ship from the enemy coast enters the bay.',
      'A blockade leaves the grain ships waiting at sea. Smugglers know a cave passage beneath the old lighthouse.',
      'Two fleets demand the same harbor oath. The tide brings their dead ashore before either envoy reaches the council.',
    ],
    developmentFlavor: [
      'A longer breakwater shelters the winter boats. Rope-makers, fishers and foreign merchants raise new stalls beside it.',
      'Freshwater wells open above the salt flats. Families return to a quarter whose doors had been nailed shut.',
      'Storm surf breaks the old quay. Boat-builders begin again with wreck timber, beneath the bell of a ship that never came home.',
      'The harbor grows around a new ferry crossing. An unfamiliar prayer is heard beside the old tide shrine each morning.',
    ],
  },
  {
    id: 'highstone', name: 'The Highstone Reach', climate: 'cold uplands and steep river valleys', resource: 'mountain ore',
    description: 'Mountain halls hold the last heat of enormous furnaces. Above them, frozen passes lead to mines where the rock sometimes answers a hammer stroke. Every settlement depends on the next convoy, and every master knows the strength of iron can conceal the weakness of a promise.',
    law: { name: 'The Iron Compact', theftFinePerEvidence: 20, prisonDaysPerEvidence: 6, enforcement: 75, contrabandAllowed: false, publicMagic: 'licensed' },
    dominantFaith: 'forge', tradeFocus: 'craft',
    conflictFlavor: [
      'A rival banner appears above the pass. Its soldiers want the furnace fed while the valley households ration their last charcoal.',
      'The mine road is sealed with chains. Each side claims the other awoke the armored thing heard moving beneath the mountain.',
      'An army buys every sound blade in the market. The smiths keep the cracked ones for neighbors who cannot leave.',
      'A fortress falls silent at dawn. Smoke rises from its forge through the following night, though no living worker answers the gate.',
    ],
    developmentFlavor: [
      'A new shaft finds a rich ore seam. Hearths and workshops spread along the lower slope, within earshot of the rescue bell.',
      'Stone shelters mark the winter pass. Caravans arrive with enough grain for the mountain markets to open through the snow.',
      'The great furnace is relit after a generation of cold. Its first casting is a set of hinges for the village doors.',
      'A collapse buries the upper mine. The surviving households settle below, carrying the names of those who stayed in the dark.',
    ],
  },
  {
    id: 'blackgrove', name: 'The Blackgrove Vale', climate: 'deep woodland and fertile clearings', resource: 'old-growth timber',
    description: 'Forests older than the roads crowd around orchard hearths and moss-covered shrines. Some trails lead back to the same tree until a traveler speaks an honest name. Keepers, loggers and hungry households all claim to know what the wood should be allowed to keep.',
    law: { name: 'The Rootbound Custom', theftFinePerEvidence: 8, prisonDaysPerEvidence: 3, enforcement: 35, contrabandAllowed: true, publicMagic: 'permitted' },
    dominantFaith: 'wilds', tradeFocus: 'rural',
    conflictFlavor: [
      'An army cuts a road through the old grove. Its scouts return with bark beneath their fingernails and no memory of the banners.',
      'The border watch follows hunters into the trees. Neither side will cross the clearing where their ancestors left weapons together.',
      'A warlord promises grain for every felled oak. At night, roots pull the new boundary stakes out of the earth.',
      'Refugees shelter in the sacred wood. Their fires feed children and draw the gaze of a guardian no keeper has seen before.',
    ],
    developmentFlavor: [
      'New orchards take root around the market clearing. Their first fruit is shared with the households that kept the paths open.',
      'A sawmill opens on the river. The nearest shrine gains a wooden roof while the deeper grove grows strangely quiet.',
      'Neighbors restore the forest trail with living bridges. Traders reach a village that had become only a name on old maps.',
      'The woodland swallows an abandoned hamlet. Returning families build at its edge, beside the doors still visible between the trunks.',
    ],
  },
  {
    id: 'ashplain', name: 'The Ashen Borderlands', climate: 'dry plains around old volcanic stone', resource: 'volcanic glass',
    description: 'Wind carries pale ash over broken towers and red stone wells. Caravans follow beacons lit in the ribs of ruined fortresses. The keepers of the last flame offer shelter to strangers; other hands sell the same fire as a promise of power over those left in the dark.',
    law: { name: 'The Cinder Edicts', theftFinePerEvidence: 10, prisonDaysPerEvidence: 8, enforcement: 55, contrabandAllowed: true, publicMagic: 'permitted' },
    dominantFaith: 'ash', tradeFocus: 'shadow',
    conflictFlavor: [
      'A claimant raises an army among the ruins. Their crimson standard promises a new kingdom to everyone who has lost the old one.',
      'The border wells are guarded by rival companies. A night caravan offers water to both sides, at a price neither will name aloud.',
      'Flames appear in a fortress thought to be buried under ash. Its returning garrison wears the crest of a dynasty dead for centuries.',
      'Victors drag a broken crown through the market. Its former subjects must decide whether the new fire means shelter or tribute.',
    ],
    developmentFlavor: [
      'A cleared cistern brings water to the ruined ward. Tent roofs give way to clay houses and a market beneath the beacon.',
      'Glass-workers build a furnace beside the caravan hearth. Their dark wares carry the shapes of things found in the ash.',
      'The old fortress becomes a refuge. Its murder holes are bricked over, though the lower doors still bear the marks of prisoners.',
      'A dry season empties the outer wells. Some households leave; others dig beneath an ancient shrine whose fire has never gone out.',
    ],
  },
  {
    id: 'bellwater', name: 'The Bellwater Commons', climate: 'river islands, reed beds and rolling hills', resource: 'river clay',
    description: 'Small bells guide boats through fog between gardens, stilt houses and drowned foundations. Ancestors are remembered beside the ferries, where the living still depend on one another’s hands. Below the clear water, old walls trace the outline of a town nobody agrees to name.',
    law: { name: 'The Crossing Peace', theftFinePerEvidence: 14, prisonDaysPerEvidence: 4, enforcement: 45, contrabandAllowed: false, publicMagic: 'permitted' },
    dominantFaith: 'ancestors', tradeFocus: 'arcane',
    conflictFlavor: [
      'Armed ferries seize the crossings. One army calls the toll a defense levy; the other calls it theft from the same households.',
      'The river carries broken shields from an upstream battle. The island shrines ring for dead whose names have not arrived.',
      'A council hires mercenaries to keep the bridges open. Their captain begins charging a second toll after sunset.',
      'An invading force finds the causeway submerged. In the fog, crossing bells answer from places where no boat should be.',
    ],
    developmentFlavor: [
      'A new ferry landing joins two isolated wards. Potters bring river clay, and the first shared market lasts until the evening bell.',
      'Floodbanks protect the lower gardens. A drowned doorstep becomes visible again, with fresh flowers left on its sill.',
      'A school and remedy garden rise beside the crossing shrine. Their bells join the ferrymen’s calls each morning.',
      'The river changes its course around an old island. Its households rebuild on the new bank, keeping the abandoned bells within sight.',
    ],
  },
];

export const FAITHS = [
  {
    id: 'lantern', name: 'The Vigil of the Lantern', sigil: '✧',
    doctrine: 'A light has meaning because someone keeps it burning. Some devotees shelter whoever reaches the door; others believe order must decide who may enter. No oath makes that disagreement disappear.',
    ritualName: 'Keep the last light',
    ritualDescription: 'Trim a shrine lamp and hold a quiet watch beside it. The keeper asks whose name you would call if a stranger knocked after midnight.',
    skill: 'devotion', serviceMp: 6, templeKeeperRole: 'lantern keeper',
    questFlavor: [
      'A shrine lamp burns blue whenever a missing watch-keeper’s name is spoken. Someone must take its light to the abandoned crossing.',
      'The outer refuge has no oil left. A rich patron offers a supply only if its doors close to travelers without a seal.',
      'A black-armored pilgrim carries an extinguished lantern and asks to spend one night in the place their order once burned.',
    ],
  },
  {
    id: 'ancestors', name: 'The Remembered Hearth', sigil: '◇',
    doctrine: 'The dead may be remembered without being owned. Devotees seek counsel in names, songs and willing voices, while disputing whether family duty offers guidance or becomes another chain.',
    ritualName: 'Set a place for the absent',
    ritualDescription: 'Warm a cup beside the shrine hearth and speak a remembered name. Silence is allowed to remain silence; the keeper never promises that every voice will answer.',
    skill: 'scholarship', serviceMp: 5, templeKeeperRole: 'ancestor speaker',
    questFlavor: [
      'A grave bell answers with the voice of someone buried under the wrong name. Their family fears what the true name will reveal.',
      'An ancestral mask has begun speaking at empty hearths. One household asks for its return, another begs that it be left alone.',
      'The river uncovered a burial door bearing a living child’s name. The shrine keeper wants to hear the older account before breaking its seal.',
    ],
  },
  {
    id: 'wilds', name: 'The Unfenced Wild', sigil: '⌁',
    doctrine: 'Growth and hunger belong to the same world. Some followers keep a careful balance between hearth and forest; others seek dominion through the oldest beasts. The wild grants no simple verdict on either path.',
    ritualName: 'Leave water at the roots',
    ritualDescription: 'Carry clean water to a root shrine and listen until the ordinary sounds return. The keeper points out what has grown, what has eaten and what has been lost.',
    skill: 'survival', serviceMp: 4, templeKeeperRole: 'grove keeper',
    questFlavor: [
      'A stag with iron antlers drinks from the village well. Its arrival keeps wolves away, but the water now tastes of rust.',
      'The last seed of a vanished grove sprouts in a hunter’s wound. The keeper asks that the living bearer be found before the next frost.',
      'A root shrine tightens around a woodcutter’s axe. Beneath it lies the threshold of a house swallowed before the present forest grew.',
    ],
  },
  {
    id: 'forge', name: 'The Patient Flame', sigil: '⟐',
    doctrine: 'Work can bind people together or make them instruments of another will. Its followers honor the hand that makes and repairs, though some worship perfect order and others prize the flawed thing kept useful.',
    ritualName: 'Strike the waking iron',
    ritualDescription: 'Heat a small iron blank, strike it once and let another hand finish the cooling. The keeper keeps the mark of each participant rather than polishing them away.',
    skill: 'devotion', serviceMp: 5, templeKeeperRole: 'forge priest',
    questFlavor: [
      'A furnace calls for a smith who died before its first firing. Each night it casts the same unfinished key.',
      'A guardian made for a ruined hall still protects its empty threshold. The master’s last tool may tell it that the work is finished.',
      'A war patron commissions a blade that will never break. The shrine’s oldest smith warns that something else must bear every wound it refuses.',
    ],
  },
  {
    id: 'moon', name: 'The Veiled Moon', sigil: '☾',
    doctrine: 'A changing face can still belong to the same person. The faithful attend to tides, transformations and hidden desires; some use secrecy as refuge and others as a weapon. A veil does not settle what lies behind it.',
    ritualName: 'Watch the silver bowl',
    ritualDescription: 'Sit before a bowl of still water while the keeper turns its silver rim toward the sky. You may speak a wish, keep it private or let the reflection pass without an answer.',
    skill: 'arcana', serviceMp: 8, templeKeeperRole: 'moon watcher',
    questFlavor: [
      'The shrine’s reflection shows a second stair descending beneath the tide. A drowned pilgrim waits at its foot whenever the moon is dark.',
      'A silver veil stolen from the sanctuary reveals its wearer’s face in every nearby window. Its new owner refuses to remove it.',
      'A moonbound family has lost the path to its winter refuge. Their watcher hears the missing bells from a tower that has no stairs.',
    ],
  },
  {
    id: 'ash', name: 'The Unspent Ember', sigil: '✦',
    doctrine: 'What survives destruction can warm a stranger or kindle another conquest. Some followers keep free hearths among the ruins; others promise power to those willing to feed the flame. Ash remembers both uses, without choosing for the living.',
    ritualName: 'Wake an ember from the ash',
    ritualDescription: 'Kneel beside the cold brazier and shelter a single coal until it catches. The keeper asks what you intend to warm, and what you would be willing to burn.',
    skill: 'arcana', serviceMp: 7, templeKeeperRole: 'ember keeper',
    questFlavor: [
      'A ruined shrine keeps one room warm through every winter. The ember sustaining it has begun asking visitors for a name.',
      'A claimant wears a crown of unburned wood from a conquered refuge. The hearth-keepers want the hidden coal returned before it lights another war.',
      'A child brought an ember home from the ash fields. It shows a different lost city each night, and something in those streets has noticed the watcher.',
    ],
  },
];

export const CONTRACT_FLAVOR = [
  {
    id: 'hunt-iron-antlers', title: 'The antlers at the well', type: 'hunt', giverRole: 'village hunter', targetType: 'beast',
    brief: '{giver} found iron scraped into the stones around {place}’s well. {target} returns before dawn, and the cattle will no longer drink.',
    moralAngle: 'The creature is dangerous, but something may have driven it from its old watering place.',
  },
  {
    id: 'hunt-barrow-teeth', title: 'Teeth beneath the burial hill', type: 'hunt', giverRole: 'grave keeper', targetType: 'undead',
    brief: 'Fresh tracks end at the old burial mound near {place}. {giver} hears {target} chewing beneath the grave stones after the last bell.',
    moralAngle: 'Ending the threat need not grant permission to take everything buried with it.',
  },
  {
    id: 'hunt-empty-bell', title: 'The bell with no tower', type: 'hunt', giverRole: 'crossing keeper', targetType: 'spirit',
    brief: '{target} rings from the fog beyond {place}. Every household that answers finds its hearth cold by morning. {giver} has stopped sleeping.',
    moralAngle: 'A haunting may carry an unfinished demand as well as a threat.',
  },
  {
    id: 'hunt-walking-mill', title: 'The miller’s iron beast', type: 'hunt', giverRole: 'miller', targetType: 'construct',
    brief: '{giver} fled the lower mill when its chained mechanism tore itself free. {target} now drags the grinding stones along the road to {place}.',
    moralAngle: 'The machine’s maker and the people exposed to its failure have different stakes in its destruction.',
  },
  {
    id: 'hunt-hollow-moth', title: 'Wings against the window', type: 'hunt', giverRole: 'herbalist', targetType: 'aberration',
    brief: 'Children in {place} dream of the same enormous moth. {giver} found pale dust on their windows, then saw {target} folding itself into the chimney shadows.',
    moralAngle: 'Protecting the households is urgent; fear alone does not explain what drew the thing here.',
  },
  {
    id: 'hunt-road-hook', title: 'Hooks over the old road', type: 'hunt', giverRole: 'caravan scout', targetType: 'bandit',
    brief: '{target} hangs hooks from the trees outside {place} to catch passing reins. {giver} escaped on foot, leaving a loaded wagon behind.',
    moralAngle: 'Clearing a predatory road crew should not make the stranded travelers’ goods yours by default.',
  },
  {
    id: 'bounty-veil-captain', title: 'The captain behind the veil', type: 'bounty', giverRole: 'watch captain', targetType: 'bandit',
    brief: '{giver} offers a bounty for {target}, whose masked company has taken three caravans bound for {place}. A torn veil is the only likeness the survivors could give.',
    moralAngle: 'The warrant names a captain; it does not make every frightened conscript equally guilty.',
  },
  {
    id: 'bounty-returning-knight', title: 'A knight who will not fall', type: 'bounty', giverRole: 'fortress steward', targetType: 'undead',
    brief: '{target} has returned to demand a gate surrendered generations ago. {giver} fears the next visit will break the defenses of {place}.',
    moralAngle: 'An old claim can explain a revenant’s grievance without entitling it to the lives behind the gate.',
  },
  {
    id: 'bounty-drowned-voice', title: 'The voice beneath the ferry', type: 'bounty', giverRole: 'ferryman', targetType: 'spirit',
    brief: '{giver} hears {target} naming passengers before they step aboard. Two ferries have drifted back to {place} with their ropes cut and their seats empty.',
    moralAngle: 'A reward for ending a haunting may conceal what happened to its first victim.',
  },
  {
    id: 'bounty-runaway-ward', title: 'The guardian without a master', type: 'bounty', giverRole: 'rune smith', targetType: 'construct',
    brief: '{target} carries the seal of a ruined lord and bars the road outside {place}. {giver} recognizes its runes but cannot make it hear a living command.',
    moralAngle: 'A patron may value recovered property more than the people the guardian has endangered.',
  },
  {
    id: 'bounty-grinning-pit', title: 'Something smiles in the quarry', type: 'bounty', giverRole: 'quarry foreman', targetType: 'aberration',
    brief: 'The lowest pit near {place} has begun opening like a mouth at sunset. {giver} names {target} as the thing seen crawling out before the missing shift’s lamps went dark.',
    moralAngle: 'The people who kept a dangerous quarry working should remain part of the account after the monster is gone.',
  },
  {
    id: 'bounty-black-key', title: 'The keeper of the black key', type: 'bounty', giverRole: 'prison warden', targetType: 'bandit',
    brief: '{target} stole a black key and released prisoners from the watch-room in {place}. {giver} promises payment for ending the fugitive’s next raid.',
    moralAngle: 'The escaped cells held both dangerous captives and people whose charges deserve another hearing.',
  },
  {
    id: 'relic-unfinished-crown', title: 'The crown left in the forge', type: 'relic', giverRole: 'fallen heir', targetType: 'construct',
    brief: '{giver} asks for a crown never collected from the sealed forge beneath {place}. {target} still tends its furnace as if the coronation were tomorrow.',
    moralAngle: 'Recovering an heirloom can preserve a family memory or arm a claim to power.',
  },
  {
    id: 'relic-bone-flute', title: 'A song from the closed tomb', type: 'relic', giverRole: 'traveling musician', targetType: 'undead',
    brief: 'A bone flute plays through the sealed door of a tomb near {place}. {giver} believes it is their teacher’s lost instrument; {target} keeps time behind the stone.',
    moralAngle: 'A desired object can also belong to a burial, a promise or someone who refused to surrender it.',
  },
  {
    id: 'relic-silver-eye', title: 'The eye in the moon bowl', type: 'relic', giverRole: 'moon watcher', targetType: 'spirit',
    brief: '{giver} seeks a silver eye taken from the tide shrine at {place}. {target} appears in its bowl each night, looking toward a stair submerged below the headland.',
    moralAngle: 'Restoring a shrine relic may wake what its former keepers deliberately put to sleep.',
  },
  {
    id: 'relic-saint-mask', title: 'The saint’s stolen face', type: 'relic', giverRole: 'shrine keeper', targetType: 'bandit',
    brief: '{target} fled {place} wearing the shrine’s old bronze mask. {giver} says strangers now kneel before the thief and hear their prayers answered in an unfamiliar voice.',
    moralAngle: 'A holy face can be used to comfort, deceive or command; its return does not settle those uses.',
  },
  {
    id: 'relic-star-in-jar', title: 'A fallen star under glass', type: 'relic', giverRole: 'occult scholar', targetType: 'aberration',
    brief: '{giver} saw a star fall beyond {place} and wants the glass vessel made to hold it. {target} coils around the impact hollow, lit from within.',
    moralAngle: 'The scholar’s curiosity may offer discovery, while the thing sought may be alive rather than treasure.',
  },
  {
    id: 'relic-last-seed', title: 'The seed in the antler shrine', type: 'relic', giverRole: 'grove keeper', targetType: 'beast',
    brief: 'The last seed of an older woodland rests inside a split antler shrine. {giver} asks you to recover it beyond {place}, where {target} has made its den.',
    moralAngle: 'Bringing life back to a grove should leave room for the life already sheltering there.',
  },
  {
    id: 'escort-winter-caravan', title: 'The last wagon before winter', type: 'escort', giverRole: 'caravan leader', targetType: 'beast',
    brief: '{giver} has one grain wagon left to bring through {place}. {target} follows its tracks, waiting whenever the exhausted draft animals stop.',
    moralAngle: 'Protecting the caravan also means deciding who receives its scarce cargo.',
  },
  {
    id: 'escort-burial-lantern', title: 'A light for the distant grave', type: 'escort', giverRole: 'ancestor speaker', targetType: 'undead',
    brief: '{giver} must carry a burial lantern beyond {place} before its flame goes out. {target} walks behind them, growing nearer whenever the name of the dead is spoken.',
    moralAngle: 'The traveler seeks a farewell; the pursuer may be refusing one.',
  },
  {
    id: 'escort-veiled-pilgrim', title: 'The pilgrim with no reflection', type: 'escort', giverRole: 'veiled pilgrim', targetType: 'spirit',
    brief: '{giver} wants passage through {place} without entering a shrine or removing their veil. {target} waits at each bridge, calling the traveler by an older name.',
    moralAngle: 'A person’s secrecy can protect them without obliging you to ignore a danger to others.',
  },
  {
    id: 'escort-forge-apprentice', title: 'The apprentice and the waking iron', type: 'escort', giverRole: 'forge apprentice', targetType: 'construct',
    brief: '{giver} is taking a wrapped iron hand to a master outside {place}. {target} has followed since it began moving inside the cloth.',
    moralAngle: 'A maker’s instructions and an apprentice’s growing fear do not necessarily point toward the same destination.',
  },
  {
    id: 'escort-ash-child', title: 'The ember carried home', type: 'escort', giverRole: 'ember keeper', targetType: 'aberration',
    brief: '{giver} shelters a household carrying a warm coal from the ruins near {place}. {target} follows its glow, and nobody can bear to extinguish the last heat they own.',
    moralAngle: 'A strange flame can be both refuge and a danger; protecting its bearers requires more than choosing a label for it.',
  },
  {
    id: 'escort-unpaid-company', title: 'Across the company’s road', type: 'escort', giverRole: 'remedy merchant', targetType: 'bandit',
    brief: '{giver} needs to carry medicine past {place}. {target} commands unpaid soldiers who have made the road their only source of coin.',
    moralAngle: 'The soldiers’ hardship explains their demand without erasing the sick households waiting for the medicine.',
  },
];
