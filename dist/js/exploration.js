import { dropEquipment } from './gear.js';
import { seededRoll, generatePersonName } from './world.js';
import { culturalName as legacyDungeonName } from './legacy-dungeon-names-v20.js';

const room = (id, title, description, kind, exits, extra = {}) => ({ id, title, description, kind, exits, ...extra });
export const DUNGEONS = [
  { id: 'cistern', title: 'The Drowned Cistern', locationId: 'marsh', description: 'Follow the water beneath the reeds. Two approaches reach a keeper and the source of the corruption.', rooms: [
    room('entry', 'The reed stair', 'Old watermarks descend below the marsh. You can follow the sluice or the flooded service passage.', 'safe', ['sluice', 'flooded']),
    room('sluice', 'The broken sluice', 'Hungry marsh creatures shelter beside a gate that can still be repaired.', 'fight', ['entry', 'cache'], { encounterId: 'cistern_sluice', parley: true }),
    room('flooded', 'The flooded passage', 'The water hides sharp scrap and a nest of fever-carrying creatures. A careful search can locate a dry ledge.', 'hazard', ['entry', 'cache'], { encounterId: 'cistern_flooded' }),
    room('cache', 'The pump workshop', 'A dry shelf holds useful scraps and a maintenance ledger. The keeper’s chamber lies beyond.', 'treasure', ['sluice', 'flooded', 'keeper'], { loot: { gold: 8, ore: 2, cloth: 1 } }),
    room('keeper', 'The cistern keeper', 'A bound guardian mistakes every traveler for the people who poisoned its charge. Its next attack is visible in battle.', 'boss', ['cache', 'source'], { encounterId: 'cistern_keeper' }),
    room('source', 'The tainted spring', 'A covenant conduit feeds the contamination. Record its pattern before returning to the people waiting above.', 'objective', ['keeper']),
  ] },
  { id: 'buried_archive', title: 'The Buried Archive', locationId: 'ruin', description: 'A branching archive preserves the covenant’s origin and the people it was supposed to protect.', rooms: [
    room('entry', 'The collapsed vestibule', 'The scriptoria remain lit by pale runes. A narrow stair offers another route through a trapped reading room.', 'safe', ['scriptoria', 'trap']),
    room('scriptoria', 'The silent scriptoria', 'A warding adept and its echo defend the names in these books. A patient visitor can request passage.', 'fight', ['entry', 'vault'], { encounterId: 'archive_scriptoria', parley: true }),
    room('trap', 'The ink-sealed stair', 'Old defensive runes react to hurried movement. Study their repeated pattern or confront the guardians bound to them.', 'hazard', ['entry', 'vault'], { encounterId: 'archive_vault' }),
    room('vault', 'The record vault', 'A locked coffer holds workshop supplies beside the record of the first covenant.', 'treasure', ['scriptoria', 'trap', 'archivist'], { loot: { gold: 10, ore: 1, cloth: 2 } }),
    room('archivist', 'The last archivist', 'The guardian will test your intent before surrendering the original seal.', 'boss', ['vault', 'seal'], { encounterId: 'archive_warden' }),
    room('seal', 'The original seal', 'Read the names behind the official account. The knowledge belongs to your life; its political use is another decision.', 'objective', ['archivist']),
  ] },
  { id: 'root_caverns', title: 'The Moonroot Caverns', locationId: 'forest', description: 'Tracks and living thorns lead to a spring hidden beneath the old forest.', rooms: [
    room('entry', 'The split root', 'Animal tracks enter a low tunnel; a narrow passage winds through the thorns.', 'safe', ['spoor', 'thorns']),
    room('spoor', 'The hunting den', 'Beasts guard their young. Waiting and leaving supplies can secure passage without a fight.', 'fight', ['entry', 'refuge'], { encounterId: 'root_spoor', parley: true }),
    room('thorns', 'The thorn passage', 'Sharp living vines conceal an older path. A careful search can spare your party a wound.', 'hazard', ['entry', 'refuge'], { encounterId: 'root_thorns' }),
    room('refuge', 'The old ranger’s refuge', 'A dry alcove contains bundled herbs and the remains of a craftsman’s pack.', 'treasure', ['spoor', 'thorns', 'thornheart'], { loot: { gold: 4, ore: 1, cloth: 1, herbs: 2 } }),
    room('thornheart', 'The Thornheart', 'A rooted guardian draws strength from the damaged grove. Cleansing wards answer its barbed attacks.', 'boss', ['refuge', 'spring'], { encounterId: 'thornheart' }),
    room('spring', 'The moonroot spring', 'The hidden spring is accessible again. Gather three herb bundles once and learn the route through the forest.', 'objective', ['thornheart'], { herbs: 3 }),
  ] },
  { id: 'watchtower', title: 'The Broken Watchtower', locationId: 'tower', description: 'A roadside garrison has become a prison. A cliff path and cellar approach lead to its captain.', rooms: [
    room('entry', 'The tower approach', 'A ladder reaches the cliff patrol. The cellar opens toward the captives instead.', 'safe', ['cliff', 'cells']),
    room('cliff', 'The cliff patrol', 'A veteran screens a slinger. Their different roles reward choosing the first target carefully.', 'fight', ['entry', 'cache'], { encounterId: 'tower_cliff' }),
    room('cells', 'The holding cells', 'A jailer guards ordinary travelers accused of trespass. Speak for them, or force the cell doors.', 'fight', ['entry', 'cache'], { encounterId: 'tower_cells', parley: true, rescue: true }),
    room('cache', 'The garrison stores', 'Confiscated tools remain beside a ledger of bribes. Take the useful scraps and preserve the names.', 'treasure', ['cliff', 'cells', 'captain'], { loot: { gold: 12, ore: 2, cloth: 2 } }),
    room('captain', 'The captain’s platform', 'The captain commands a fixed pair of guards. Watch the promised volley before spending the party’s turns.', 'boss', ['cache', 'signal'], { encounterId: 'tower_captain' }),
    room('signal', 'The signal brazier', 'The tower can now warn travelers instead of trapping them. The council will hear what you recovered.', 'objective', ['captain']),
  ] },
  { id: 'covenant_core', title: 'The Covenant Core', locationId: 'citadel', description: 'Two routes through the citadel reach the anchor that binds the region’s fate.', rooms: [
    room('entry', 'The inner threshold', 'The procession hall offers a direct route. The damaged forge holds a narrower alternative.', 'safe', ['hall', 'forge']),
    room('hall', 'The procession hall', 'Iron husks protect an acolyte whose wards sustain them.', 'fight', ['entry', 'library'], { encounterId: 'core_hall' }),
    room('forge', 'The broken forge', 'A rune golem and living sparks remain among the fragments. Careful investigation can cut their power.', 'hazard', ['entry', 'library'], { encounterId: 'core_forge' }),
    room('library', 'The covenant library', 'Emergency supplies lie beside the plans used to build the anchor. Its purpose becomes comprehensible.', 'treasure', ['hall', 'forge', 'warden'], { loot: { gold: 8, ore: 3, cloth: 1 } }),
    room('warden', 'The anchor warden', 'The warden announces a charged strike, a protective seal, and a sweeping pulse. Prepare for its sequence.', 'boss', ['library', 'anchor'], { encounterId: 'core_warden' }),
    room('anchor', 'The living anchor', 'You reached the mechanism that sustains the covenant. Your campaign choices determine what happens to it.', 'objective', ['warden']),
  ] },
];

const dungeonById = (id) => DUNGEONS.find((dungeon) => dungeon.id === id);
const roomById = (dungeon, id) => dungeon?.rooms.find((entry) => entry.id === id);
const copy = (value) => structuredClone(value);
const readyAge = (state) => state.phase !== 'retired' && (state.timeline?.mode === 'birth' ? state.age >= 16 : state.phase === 'adult');
const currentDefinition = (state) => state.dungeon?.definition || dungeonById(state.dungeon?.id);
const currentRoom = (state) => roomById(currentDefinition(state), state.dungeon?.roomId);

// Version one is a snapshot contract. Keep these authored definitions stable:
// an expedition already entered must not change when later content is added.
const MOTIVES = [
  { id: 'duty', title: 'An unpaid duty', skill: 'scholarship', role: 'warrior', need: 'The people who built this place left maintenance promises unfulfilled. Its custodian wants practical responsibility, rather than another order from above.' },
  { id: 'witness', title: 'A witness who was erased', skill: 'persuasion', role: 'mage', need: 'An official account omitted someone who objected. Its custodian wants that person heard with consent before surrendering the records.' },
  { id: 'shelter', title: 'A home under threat', skill: 'survival', role: 'rogue', need: 'People and creatures have made a refuge here. Its custodian fears that reopening the place will make those dependants expendable.' },
];
const VARIANT_CONTENT = {
  cistern: {
    custodianRole: 'keeper of the lower water', witnessRole: 'the last pump attendant',
    objectives: [
      { id: 'water-rights', title: 'Who is allowed clean water?', description: 'The source contains a diversion register: households above the marsh were protected while the stilt homes drank the runoff. A copy proves the mechanism; deciding who receives the original changes whose account survives.', work: 'Reconnect the households’ emergency water channel', materials: { ore: 1, cloth: 1 }, result: 'An emergency hand-pump now serves the stilt households. The covenant conduit itself still awaits the campaign decision.' },
      { id: 'missing-workers', title: 'The workers who did not return', description: 'The source preserves the shift names of workers sent below during the first fever. Their families asked for an account, while the academy asked only for a diagram.', work: 'Seal and identify the workers’ flooded memorial niche', materials: { cloth: 2 }, result: 'The workers’ names are protected from the water, with a dry place for their families to visit.' },
      { id: 'sealed-spring', title: 'A spring promised to everyone', description: 'The spring’s first covenant promised common access. Later gates diverted it. The keeper can show how the corruption travels, but cannot decide who should own the water above.', work: 'Fit a temporary shared-access sluice', materials: { ore: 2 }, result: 'A shared-access sluice is fitted for ordinary water. You have not healed the region’s deeper corruption by doing this repair.' },
    ],
    witness: ['The attendant lives on a dry landing, preserving the names of sick neighbors.', 'They ask whether you intend to repair a channel or merely take an interesting diagram.'],
    service: ['The bellows culvert', 'A maintenance crawlway crosses beneath the guarded sluice. Its corroded brackets still carry old work orders.'],
    reliquary: ['The household tally', 'Cloth-wrapped water tokens and a single iron fitting lie beside a list of households denied service.'],
  },
  buried_archive: {
    custodianRole: 'keeper of the unabridged account', witnessRole: 'a displaced copyist',
    objectives: [
      { id: 'refused-names', title: 'The names that refused the covenant', description: 'The original seal includes a separate register of people who refused a binding term. Later copies removed that register. The campaign needs the terms; the people’s refusal deserves a record of its own.', work: 'Make protected copies of the refused names', materials: { cloth: 2 }, result: 'The refused names survive in separate cloth-bound copies entrusted to the displaced readers.' },
      { id: 'altered-term', title: 'A term made to look eternal', description: 'A scraped-out release date survives under the seal. The keeper can prove that an agreement was altered, but the person who copied the change was also coerced.', work: 'Restore the dated release ledger without erasing the copyist', materials: { cloth: 1, ore: 1 }, result: 'The dated ledger now preserves both the original release clause and the pressured copyist’s account.' },
      { id: 'borrowed-voices', title: 'An account cannot own its speakers', description: 'The seal distinguishes willing testimony from captured voices. Several families want their ancestors’ accounts returned; scholars argue for keeping the whole collection together.', work: 'Prepare consent-labelled family copies', materials: { cloth: 2 }, result: 'Families receive labelled copies without another soul being bound or a refusal being overwritten.' },
    ],
    witness: ['A copyist shelters among books saved from a purge.', 'They will give an account, but refuse to be carried upstairs as a convenient confession.'],
    service: ['The bookbinders’ lift', 'A narrow supply shaft links the vestibule and vault. Rotted boards must be surveyed before a party can use it.'],
    reliquary: ['The unclaimed reading desk', 'A dead reader’s binding tool lies beside a refusal written in their own hand. The tool could be sold; the page could be preserved.'],
  },
  root_caverns: {
    custodianRole: 'the grove’s scarred custodian', witnessRole: 'an exiled grove-tender',
    objectives: [
      { id: 'nursery-water', title: 'The nursery beneath the roots', description: 'Moonroot grows around an animal nursery. The remedy route must be opened, but the grove-tender asks that gathering leave the young a safe source of water.', work: 'Screen the nursery’s water from the gathering path', materials: { cloth: 1, herbs: 1 }, result: 'A screened drinking place lets gatherers pass without driving the young from the spring.' },
      { id: 'logging-mark', title: 'A wound with a household’s mark', description: 'An old timber warrant identifies the crew that cut into the spring. Some members fed their families with that work. The grove’s injury is real; blaming every descendant would invent a new one.', work: 'Bind and tend the damaged root bank', materials: { cloth: 2, herbs: 1 }, result: 'The root bank is tended and the timber warrant kept intact, without assigning inherited guilt.' },
      { id: 'last-seeds', title: 'The last seeds of an older grove', description: 'The spring holds moonroot and a few seeds from a grove that vanished above. Taking every useful plant would end its return. The cure still needs its three herb bundles.', work: 'Protect a small seed bed beside the spring', materials: { herbs: 2 }, result: 'A protected seed bed remains for the older grove. Your expedition’s remedy bundles are gathered separately.' },
    ],
    witness: ['An exiled grove-tender keeps watch over animals too young to leave.', 'They know a safe route, but ask who will be displaced when people come gathering.'],
    service: ['The badger run', 'A low burrow circles the hunting den. Fresh tracks reveal which roots can support a traveler’s weight.'],
    reliquary: ['The abandoned tending kit', 'An iron pruning tool rests beside a cloth roll and a grove-tender’s account of the damaged spring.'],
  },
  watchtower: {
    custodianRole: 'the captain of the paid silence', witnessRole: 'a detained courier',
    objectives: [
      { id: 'false-orders', title: 'The order without a seal', description: 'The brazier holds the unsanctioned order that turned a watch post into a prison. A copy can prove it; the courier who brought it fears being blamed for its author.', work: 'Restore a public road-warning lamp', materials: { ore: 1, cloth: 1 }, result: 'The repaired lamp warns ordinary travelers. The courier’s account remains distinct from the captain’s command.' },
      { id: 'missing-pay', title: 'Who bought the prison locks?', description: 'The signal platform holds payrolls showing that money for road patrols purchased new cell locks. Soldiers have dependants too, but the prisoners paid the greater price.', work: 'Fit a safe exit for released travelers', materials: { ore: 2 }, result: 'A repaired release gate lets detained travelers leave safely without pretending their confinement never happened.' },
      { id: 'stolen-papers', title: 'A road for people with no papers', description: 'The platform stores confiscated travel permits, including forged papers used by refugees. Reporting every bearer would repeat the tower’s abuse; concealing the orders would protect its captain.', work: 'Make protective copies for the displaced households', materials: { cloth: 2 }, result: 'Households retain copies of their own papers while the orders behind the seizures remain in your evidence.' },
    ],
    witness: ['A courier waits between the cells with a torn travel permit.', 'They carried an order, not its authority. They ask you to preserve that distinction.'],
    service: ['The ropekeepers’ stair', 'A narrow stair passes under the cliff patrol. Rotten lashings can be repaired or surveyed at a risk.'],
    reliquary: ['The confiscation desk', 'One iron clasp lies among a courier’s letters and the names of families awaiting their return.'],
  },
  covenant_core: {
    custodianRole: 'the warden with competing commands', witnessRole: 'an anchor maintenance apprentice',
    objectives: [
      { id: 'withdrawal-clause', title: 'The machinery of withdrawal', description: 'The living anchor still contains a workable release clause. Its maintenance staff removed the visible handles under orders. A witness wants the right to leave made practical again.', work: 'Fit a visible withdrawal handle', materials: { ore: 2, cloth: 1 }, result: 'The withdrawal handle is accessible and labelled. The campaign still determines whether anyone is free to use it.' },
      { id: 'living-workers', title: 'The living hands behind the anchor', description: 'The anchor’s repair record names ordinary workers as well as bound ancestors. They want wages and a way out, rather than a place in a glorious final sacrifice.', work: 'Mark and secure the workers’ emergency exit', materials: { ore: 1, cloth: 2 }, result: 'A marked emergency exit gives the living maintenance crew a route. It does not choose the anchor’s final fate.' },
      { id: 'overwritten-command', title: 'The first command beneath the last', description: 'The anchor repeats compulsory commands carved over a first instruction requiring a willing term. The warden’s violence follows the contradiction, not a verdict on your character.', work: 'Restore the visible consent instruction', materials: { cloth: 2 }, result: 'The oldest consent instruction is made legible beside the later command. The mechanism remains dangerous until the final campaign decision.' },
    ],
    witness: ['An apprentice hides in a service niche beside their abandoned tools.', 'They know which instruction was overwritten and who was required to continue working.'],
    service: ['The maintenance conduit', 'A narrow conduit reaches the library beneath the procession hall. Its dormant wards must be tested before crossing.'],
    reliquary: ['The workers’ muster', 'An iron fitting lies on a ledger of living workers. Several names have been crossed out without explanation.'],
  },
};
const OPTIONAL_IDS = ['witness', 'service', 'reliquary'];

/** Seeded once on first entry; the resulting graph is kept in the save. */
export function generateDungeonDefinition(seed, id, { legacyNames = false } = {}) {
  const base = dungeonById(id), content = VARIANT_CONTENT[id];
  if (!base || !content) return null;
  const definition = copy(base);
  const layout = seededRoll(seed, `dungeon-v1:${id}:layout`, 3);
  const motive = copy(MOTIVES[seededRoll(seed, `dungeon-v1:${id}:motive`, MOTIVES.length)]);
  const objective = copy(content.objectives[seededRoll(seed, `dungeon-v1:${id}:objective`, content.objectives.length)]);
  const name = salt => legacyNames ? legacyDungeonName(seed, salt).name : generatePersonName(seed, salt);
  const custodian = { name: name(`dungeon-${id}-custodian`), role: content.custodianRole };
  const witness = { name: name(`dungeon-${id}-witness`), role: content.witnessRole };
  const [entry, first, second, cache, boss, goal] = definition.rooms;
  const connect = (a, b) => { if (!a.exits.includes(b.id)) a.exits.push(b.id); if (!b.exits.includes(a.id)) b.exits.push(a.id); };
  const optional = layout === 0 ? ['witness', 'service'] : layout === 1 ? ['service', 'reliquary'] : ['witness', 'reliquary'];
  for (const optionalId of optional) {
    const here = optionalId === 'witness'
      ? room('witness', `${witness.name}’s refuge`, `${witness.name}, ${witness.role}. ${content.witness.join(' ')}`, 'witness', [])
      : optionalId === 'service'
        ? room('service', ...content.service, 'hazard', [], { optional: true })
        : room('reliquary', ...content.reliquary, 'dilemma', []);
    here.optional = true;
    definition.rooms.push(here);
    const links = optionalId === 'witness' ? (layout === 0 ? [entry, first] : [second, cache]) : optionalId === 'service' ? (layout === 0 ? [second, cache] : [entry, cache]) : (layout === 1 ? [first, cache] : [entry, cache]);
    for (const destination of links) connect(here, destination);
  }
  if (layout === 2) connect(first, second);
  goal.description = `${goal.description}\n\n${objective.description}`;
  boss.description += `\n\n${custodian.name}, ${custodian.role}. ${motive.need}`;
  return { ...definition, version: 1, seed: String(seed), layout, objective, motive, custodian, witness };
}

const modern = (state) => state.dungeon?.definition?.version === 1;
const FORMATION_SITES = {
  guardian: ['watchtower'], knight: ['watchtower'], paladin: ['watchtower'],
  healer: ['cistern'], elementalist: ['cistern'], druid: ['root_caverns'], ranger: ['root_caverns'], berserker: ['root_caverns'],
  necromancer: ['buried_archive'], thief: ['buried_archive'], bard: ['buried_archive'], assassin: ['watchtower', 'covenant_core'],
};
export function formationSupport(state, definition) {
  const id = state.hero.specialization, record = state.fellowship?.formations?.[id];
  return FORMATION_SITES[id]?.includes(definition.id) && record?.stage === 'completed' && Number.isSafeInteger(record.completedDay) && record.completedDay <= state.day ? { id, technique: record.technique } : null;
}
export function rememberedSupport(state, definition) {
  return (state.companions || []).find(person => person.recruited && person.active && person.alive !== false && person.hp > 0 && person.role === definition.motive.role && (person.relationship || 0) >= 5 && (
    (person.memories || []).some(memory => typeof memory === 'string' && /protect|consent|willing|honest|fair|help|keep.*promise|expedition:/i.test(memory))
    || state.fellowship?.companions?.[person.id]?.stage === 'completed' && Number.isSafeInteger(state.fellowship.companions[person.id].completedDay)
  ));
}
export function negotiationChecklist(state){
  if(!modern(state))return [];
  return authoredNegotiationChecklist(state,currentDefinition(state),currentRoom(state),state.dungeon);
}
export function authoredNegotiationChecklist(state,definition,here,active){
  const facts=active.facts;
  if(!here||!['boss','fight'].includes(here.kind))return [];
  const support=rememberedSupport(state,definition),formation=formationSupport(state,definition);
  const source=(key,fallback)=>{const id=facts[key],room=definition.rooms.find(r=>r.id===id&&active.visited.includes(id));return room?room.title:fallback;};
  const heard={id:'account',label:'Hear the inhabitant',met:Boolean(facts[`listened_${here.id}`]),detail:facts[`listened_${here.id}`]?'Their concern is recorded.':'First hear this inhabitant’s account.'};
  if(here.kind!=='boss'){
    const met=(state.hero.skills[definition.motive.skill]||0)>=3||facts.variantProof||facts.variantAid||support;
    return [heard,{id:'approach',label:'An answer to the concern',met:Boolean(met),detail:met?'A trained, evidenced, practical or trusted approach is available.':`Requires ${definition.motive.skill} 3, examined evidence, practical aid, or a trusted ${definition.motive.role} companion.`}];
  }
  return [heard,
    {id:'proof',label:'Examined negotiation evidence',met:Boolean(facts.variantProof||formation),detail:facts.variantProof?'Preserved account: '+source('proofSource','the examined optional account')+'.':formation?`Your completed “${formation.technique}” formation supplies the relevant proof.`:'Missing preserved account or relevant completed calling formation. Examine and preserve an optional account; recovering a cache alone does not examine its testimony.'},
    {id:'aid',label:'Practical aid',met:Boolean(facts.variantAid),detail:facts.variantAid?'Completed aid: '+source('aidSource','the recorded refuge or route work')+'.':'Missing practical aid. Complete the optional refuge protection, wrapping restoration or route repair; its attendance and supplies are quoted separately.'},
    {id:'judgment',label:'Judgment or trusted support',met:(state.hero.skills[definition.motive.skill]||0)>=4||Boolean(support),detail:support?`${support.name} can speak from a trusted shared memory.`:(state.hero.skills[definition.motive.skill]||0)>=4?`${definition.motive.skill} 4 is met.`:`Requires ${definition.motive.skill} 4, or an active ${definition.motive.role} companion with a trusted memory of your conduct.`},
  ];
}
function negotiationReason(state){return negotiationChecklist(state).filter(step=>!step.met).map(step=>step.detail).join(' ')||null;}
function passageCue(room,definition){
  const marks=['chalk marks','a split lintel','a narrow arch','a low arch','rust streaks','a ribbed arch','a worn carving','a crooked arch'];
  const sound={witness:'a low voice',hazard:definition.id==='cistern'?'water underfoot':'uneven footing',dilemma:'a still alcove',treasure:'a metallic rattle',fight:'scuff marks',boss:'a deeper footfall',objective:'a steady light',safe:'a familiar draft'}[room.kind]||'a bend in the stone';
  return marks[definition.rooms.findIndex(r=>r.id===room.id)%marks.length]+' · '+sound;
}
const materialCount = (state, key) => key === 'herbs' ? state.flags.herbs || 0 : state.equipment?.materials?.[key] || 0;
const materialReason = (state, materials) => Object.entries(materials).filter(([key, count]) => materialCount(state, key) < count).map(([key, count]) => `${count} ${key}`).join(', ');
function consumeMaterials(state, materials) {
  for (const [key, count] of Object.entries(materials)) {
    if (key === 'herbs') state.flags.herbs -= count;
    else state.equipment.materials[key] -= count;
  }
}
function rememberExpedition(state, definition, ctx, text, change = 2) {
  for (const person of (ctx.witnesses?.() || []).filter(person => person.alive !== false && person.hp > 0)) ctx.remember?.(person.id, `Expedition: ${definition.id}. ${text}`, change);
}
const timeCost = (id) => ['search', 'parley', 'rest', 'record_witness', 'protect_witness', 'repair_route', 'aid_only', 'preserve', 'restore', 'finish_public', 'finish_stewardship'].includes(id) || id.startsWith('route_') ? 1 : 0;
export const authoredActionDays = id => timeCost(id);

const ACCOUNTS = {
  cistern: {
    keeper: 'The keeper answers through the sluice: “They promised to mend the channel after the first household fell ill. Then they stopped writing the households’ names.” Its anger belongs to a neglected duty, though it still bars the passage.',
    other: 'A scratched maintenance tally lies among the nests. Its final entry records workers diverted to the citadel while the water grew dark. The creatures have made their shelter in the work those people left behind.',
  },
  buried_archive: {
    archivist: 'The archivist turns a page without touching it. “A copied name can survive a burned book. A person cannot be made to return merely because you miss them.” It waits to see whether you will treat the record as a witness or a possession.',
    other: 'A marginal hand names the readers who once kept this chamber. The ward repeats their instruction: preserve the account, but never substitute a convenient voice for someone who refused to speak.',
  },
  root_caverns: {
    thornheart: 'The roots draw aside just enough to show an old nest and the pale remains of a poisoned spring. The guardian gives you no human speech. Its wounds make clear what it is trying to keep from happening again.',
    other: 'Under the growling and rustle of thorns you hear smaller creatures sheltering deeper in the grove. This place is a home before it is an obstacle on your map.',
  },
  watchtower: {
    captain: '“The last order arrived without a council seal,” the captain admits. “I called the prisoners a necessary precaution. It was easier than admitting whose wages bought the new locks.” The admission changes your account of this place; the captain still refuses to stand aside.',
    other: 'A prisoner calls out the destination written on their confiscated travel paper. The jailer will not read it aloud. The charge is trespass, but the tower was built to protect precisely these roads.',
  },
  covenant_core: {
    warden: 'The warden repeats the oldest instruction: “The living may offer a term. The unwilling may not be named in their place.” Later commands have been carved over those words. Its competing orders explain the violence without making the anchor harmless.',
    other: 'A workshop mark survives beneath the runes: a human hand once fitted these pieces. The mechanism obeys commands it cannot question. Its keepers could, and their choices remain written in the repairs.',
  },
};
function guardianAccount(state, definition, here) {
  return authoredGuardianAccount(state,definition,here,modern(state));
}
export function authoredGuardianAccount(state, definition, here, enriched = true) {
  const account = ACCOUNTS[definition.id]?.[here.id] || ACCOUNTS[definition.id]?.other;
  const atmosphere = ['The reply arrives after a silence long enough to be uncomfortable.', 'Someone in the chamber listens even after the last word.', 'Your own footstep sounds different when you understand what stands in your way.'][seededRoll(state.seed, `${definition.id}:${here.id}:account`, 3)];
  if (!enriched) return `${account} ${atmosphere}`;
  const support = rememberedSupport(state, definition), formation = formationSupport(state, definition);
  return `${account}\n\n${definition.custodian.name} asks about ${definition.motive.title.toLowerCase()}: ${definition.motive.need}${support ? ` ${support.name} recalls your earlier conduct and is willing to speak beside you.` : ''}${formation ? ` Your completed “${formation.technique}” formation provides a relevant account of work you actually carried through.` : ''} ${atmosphere}`;
}

export function initializeExploration(state, { fresh = false } = {}) {
  if (state.dungeon === undefined) state.dungeon = null;
  if (fresh) state.flags.explorationVersion = 1;
}

function saveProgress(state) {
  state.flags.dungeonRecords ||= {};
  if (state.dungeon) state.flags.dungeonRecords[state.dungeon.id] = copy({ visited: state.dungeon.visited, cleared: state.dungeon.cleared, facts: state.dungeon.facts, complete: state.dungeon.complete, ...(state.dungeon.definition ? { definition: state.dungeon.definition } : {}) });
}

function clearRoom(state, id) {
  if (!state.dungeon.cleared.includes(id)) state.dungeon.cleared.push(id);
  saveProgress(state);
}

function operationChoices(state) {
  return authoredRoomChoices(state,currentDefinition(state),currentRoom(state),state.dungeon,{modern:modern(state)});
}
export function authoredRoomChoices(state,definition,here,active,{modern:enriched=false,navigation=true}={}) {
  if (!active || !here) return [];
  const cleared = active.cleared.includes(here.id);
  const choices = [];
  if (!cleared && ['fight', 'boss'].includes(here.kind)) {
    if (!active.facts[`listened_${here.id}`]) choices.push({ id: 'listen', label: 'Listen before drawing a weapon', description: 'Hear a guard’s account, or read what a living creature is protecting. Record this place’s story once. Listening grants no passage, experience, or combat reward.' });
    choices.push({ id: 'fight', label: here.kind === 'boss' ? 'Face the guardian' : 'Engage the encounter', description: 'Begin a real turn-based battle. Inspect enemy intent; retreat remains available.' });
    if (here.parley || enriched && here.kind === 'boss') {
      const steps = enriched ? authoredNegotiationChecklist(state,definition,here,active) : [];
      const reason = steps.filter(step=>!step.met).map(step=>step.detail).join(' ')||null;
      const checklist=steps.map(step=>`${step.label}: ${step.met?'met':'missing'}`).join(' · ');
      choices.push({ id: 'parley', label: here.rescue ? 'Negotiate the prisoners’ release' : here.kind === 'boss' ? `Offer ${definition.custodian.name} an answer to their concern` : 'Seek peaceful passage', description: enriched ? `Spend one actual day. ${checklist}. Earn passage without combat rewards.` : 'Spend one day attending to their reason for guarding this place. Earn passage without combat rewards.', ...(reason ? { disabledReason: reason } : {}) });
    }
  }
  if (!cleared && here.kind === 'hazard') {
    choices.push({ id: 'search', label: 'Study a safe way through', description: `Spend one day. Survival, stealth, or scholarship 3 avoids injury; otherwise suffer 5 health and learn the route.` });
    if (here.encounterId) choices.push({ id: 'fight', label: 'Clear the passage by fighting', description: 'Face the creatures or constructs directly. Victory clears this room.' });
    if (enriched && here.id === 'service') {
      const reason = materialReason(state, { ore: 1 });
      choices.push({ id: 'repair_route', label: 'Repair the maintenance route', description: 'Spend one actual day and 1 ore. Make the passage safe, preserve its work orders, and provide practical aid toward the custodian’s concern.', ...(reason ? { disabledReason: `Requires ${reason}.` } : {}) });
    }
  }
  if (enriched && here.kind === 'witness') {
    if (!active.facts.witnessHeard) choices.push({ id: 'hear_witness', label: `Hear ${definition.witness.name}’s account`, description: 'Hear their own words once. Listening alone grants no passage or reward.' });
    if (!active.facts.witnessRecorded) choices.push({ id: 'record_witness', label: 'Preserve their account with permission', description: 'Spend one actual day recording their words and limits. Keep a witness account, not ownership of its speaker.', ...(!active.facts.witnessHeard ? { disabledReason: 'Hear their account first.' } : {}) });
    if (!active.facts.witnessProtected) {
      const reason = !active.facts.witnessHeard ? 'Hear their account first.' : materialReason(state, { cloth: 1 });
      choices.push({ id: 'protect_witness', label: 'Make their refuge safe before bringing visitors', description: 'Spend one actual day and 1 cloth. Preserve their account, provide practical aid, and give present companions a memory of what you protected.', ...(reason ? { disabledReason: reason } : {}) });
    }
  }
  if (enriched && here.kind === 'dilemma' && !cleared) {
    choices.push({ id: 'preserve', label: 'Leave the useful tool and preserve the personal account', description: 'Spend one actual day. Record the account, leave its tools to their owners, and retain evidence for negotiation. Gain no supplies.' });
    const reason = materialReason(state, { cloth: 1 });
    choices.push({ id: 'restore', label: 'Protect the account and replace its worn wrapping', description: 'Spend one actual day and 1 cloth. Preserve the evidence and provide practical aid; present companions remember the care.', ...(reason ? { disabledReason: `Requires ${reason}.` } : {}) });
    choices.push({ id: 'salvage', label: 'Recover the iron tool and leave the account', description: 'Take 1 ore once. The personal account is not preserved as evidence, and companions see what you chose to recover.' });
  }
  if (enriched && here.optional && !active.facts[`aid_only_${here.id}`] && (here.kind === 'witness' ? !active.facts.witnessProtected : !cleared)) {
    const materials = here.id === 'service' ? { ore: 1 } : { cloth: 1 };
    const reason = here.kind === 'witness' && !active.facts.witnessHeard ? 'Hear their account first.' : materialReason(state, materials);
    choices.push({ id: 'aid_only', label: here.kind === 'witness' ? 'Protect the refuge without carrying away their account' : here.id === 'service' ? 'Repair safe passage and leave the work orders here' : 'Protect the original account without making a copy', description: `Spend one actual day and 1 ${here.id === 'service' ? 'ore' : 'cloth'}. Provide practical aid, leave the personal records in their own place, and earn no negotiation evidence. A relevant completed calling formation can supply a different kind of proof.`, ...(reason ? { disabledReason: reason } : {}) });
  }
  if (!cleared && here.kind === 'treasure') choices.push({ id: 'take', label: enriched ? 'Recover the supplies and background records' : 'Recover the cache and its records', description: enriched ? 'Claim these supplies once. Cache records give background context; negotiation evidence requires examining and preserving an optional account. Your discoveries remain when you return.' : 'Claim these supplies once. Your discoveries remain when you leave and return.' });
  if (!cleared && here.kind === 'objective') {
    choices.push({ id: 'finish', label: enriched ? 'Keep a careful copy and complete the expedition' : 'Record the discovery and complete the expedition', description: enriched ? 'Complete the mandatory discovery once. Keep its personal accounts private; your campaign decision remains separate.' : 'Complete the dungeon objective once. Campaign rewards are handled separately; your choice of how to use the discovery remains.' });
    if (enriched) {
      choices.push({ id: 'finish_public', label: active.facts.witnessRecorded ? 'Publish the evidence with the witness’s stated limits' : 'Publish material evidence and keep personal names private', description: `Spend one actual day. Make the omitted account public and gain 2 village standing.${active.facts.witnessRecorded ? ' The witness’s consent and limits remain beside their account.' : ' Publish the material record with personal names redacted; you have not secured a living witness’s agreement to be named.'} This does not decide the campaign ending.` });
      const reason = materialReason(state, definition.objective.materials);
      choices.push({ id: 'finish_stewardship', label: definition.objective.work, description: `Spend one actual day and ${Object.entries(definition.objective.materials).map(([key, count]) => `${count} ${key}`).join(', ')}. ${definition.objective.result} Complete the discovery with a practical contribution.`, ...(reason ? { disabledReason: `Requires ${reason}.` } : {}) });
    }
  }
  if (navigation && here.kind === 'safe') choices.push({ id: 'rest', label: 'Rest at the entrance', description: 'Spend one day. Restore up to 8 health and 5 magic to living party members.' });
  if (navigation) {
    const exits = here.exits.filter((exit) => cleared || here.kind === 'safe' || active.complete || active.visited.includes(exit));
    if (exits.length > 1 && seededRoll(state.seed, `${active.id}:${here.id}:exits`, 2)) exits.reverse();
    for (const exit of exits) {
      const destination = roomById(definition, exit);
      choices.push({ id: `route_${exit}`, label: active.visited.includes(exit)?`Go to ${destination.title}`:'Enter the unexplored passage · '+passageCue(destination,definition), description: 'Spend one day traveling within the dungeon. Visited and cleared rooms stay remembered.' });
    }
  }
  if (navigation) choices.push({ id: 'leave', label: active.complete ? 'Return to the wider world' : 'Leave the dungeon safely', description: 'Keep your resources, discoveries, and cleared rooms. An unfinished expedition can be resumed.' });
  return choices;
}

function presentRoom(state, ctx) {
  if (state.event || state.battle || ctx.pendingNeed?.()) return;
  const here = currentRoom(state);
  if (!here) return;
  const definition = currentDefinition(state);
  const flavor = ['Water and distant footsteps carry through the stone.', 'Old marks tell you someone has taken this route before.', 'The silence breaks whenever your party moves.'][seededRoll(state.seed, `${definition.id}:${here.id}:flavor`, 3)];
  const briefing = modern(state) && here.id === 'entry' ? `\n\nExpedition concern: ${definition.objective.title}. ${definition.custodian.name}, ${definition.custodian.role}, is still guarding the last chamber. ${definition.motive.need} Optional passages can provide evidence and practical aid; the main route remains reachable.` : '';
  const witnessAccount = modern(state) && here.id === 'witness' && state.dungeon.facts.witnessHeard ? `\n\n“I will let you record what happened here,” ${definition.witness.name} says. “Do not present me as someone who agreed to everything they did. Keep my words beside the limits I gave you.”` : '';
  ctx.setEvent?.(`dungeon_${definition.id}_${here.id}`, here.title, `${definition.title} · exploration`, `${here.description} ${flavor}${briefing}${witnessAccount}${state.dungeon.facts[`listened_${here.id}`] ? `\n\n${guardianAccount(state, definition, here)}` : ''}${state.dungeon.cleared.includes(here.id) ? ' You have already resolved this room.' : ''}`, operationChoices(state));
}

export function enterDungeon(state, id, questId = null, ctx = {}) {
  const base = dungeonById(id);
  if (!base || !readyAge(state) || state.event || state.battle || state.dungeon || state.locationId !== base.locationId) return false;
  const record = state.flags.dungeonRecords?.[id];
  const definition = record?.definition || (!record && state.flags.explorationVersion === 1 ? generateDungeonDefinition(state.seed, id) : base);
  if (record?.complete) {
    if (questId && state.campaign) {
      state.campaign.facts[`dungeon_${questId}`] = true;
      ctx.touchCampaign?.();
      state.notice = 'Your earlier discovery answers this expedition’s objective. No supplies or rewards are granted again.';
      return true;
    }
    state.notice = 'That expedition’s discoveries are already part of your life.';
    return false;
  }
  state.dungeon = { id, roomId: 'entry', visited: record ? [...record.visited] : ['entry'], cleared: record ? [...record.cleared] : [], facts: record ? copy(record.facts) : {}, pendingRoom: null, complete: false, ...(definition.version === 1 ? { definition: copy(definition) } : {}) };
  if (questId) state.dungeon.facts.questId = String(questId);
  saveProgress(state);
  ctx.journal?.('Beneath the familiar world', `You entered ${definition.title}. ${definition.version === 1 ? `Your concern is “${definition.objective.title}.” ${definition.custodian.name} guards the last chamber for a reason: ${definition.motive.title.toLowerCase()}. This expedition’s routes, people and concern are now remembered.` : 'Its rooms and choices remain connected to the life above.'}`, 'exploration');
  presentRoom(state, ctx);
  return true;
}

export function explorationActions(state) {
  if (!readyAge(state) || state.event || state.battle) return [];
  if (state.dungeon) return operationChoices(state).map((choice) => ({ id: `explore_${choice.id}`, label: choice.label, description: choice.description, days: timeCost(choice.id), cost: 0, group: 'Dungeon', ...(choice.disabledReason ? { disabledReason: choice.disabledReason } : {}) }));
  return DUNGEONS.filter((definition) => definition.locationId === state.locationId).map((definition) => ({ id: `explore_enter_${definition.id}`, label: `Enter ${definition.title}`, description: definition.description, days: 1, cost: 0, group: 'Adventure', ...(state.flags.dungeonRecords?.[definition.id]?.complete ? { disabledReason: 'This expedition is already complete.' } : state.hero.hp < 16 ? { disabledReason: 'Recover to at least 16 health before exploring.' } : {}) }));
}

export function finishAuthoredDungeon(state,active,definition,here,ctx,method='copy',enriched=true,onClear=null) {
  const clear = id => { if (!active.cleared.includes(id)) active.cleared.push(id); onClear?.(id); };
  if (active.complete) return;
  if (!definition.rooms.filter(room => room.kind === 'boss').every(room => active.cleared.includes(room.id))) return;
  active.complete = true;
  if (here.herbs && !active.facts.objectiveHerbs) { state.flags.herbs = (state.flags.herbs || 0) + here.herbs; active.facts.objectiveHerbs = true; }
  active.facts.discovery = true;
  if (enriched) {
    active.facts.objectiveId = definition.objective.id;
    active.facts.objectiveMethod = method;
    active.facts.custodianName = definition.custodian.name;
    if (active.facts.witnessHeard) active.facts.witnessName = definition.witness.name;
    active.facts.motive = definition.motive.id;
    if (method === 'public') {
      active.facts.publicAccount = true;
      ctx.standing?.('villagers', 2);
      active.facts.publicWitnessNamed = Boolean(active.facts.witnessRecorded);
      rememberExpedition(state, definition, ctx, active.facts.witnessRecorded ? `You made the omitted account public and kept ${definition.witness.name}’s stated limits beside their words.` : 'You made the material evidence public while keeping personal names private; you did not invent a witness’s consent.');
    }
    if (method === 'stewardship') {
      active.facts.stewardship = true;
      ctx.standing?.('villagers', 3);
      rememberExpedition(state, definition, ctx, definition.objective.result, 3);
    }
    if (state.campaign) state.campaign.facts[`expedition_${active.id}_method`] = method;
    ctx.journal?.('A discovery with a human consequence', `${definition.objective.title}: ${method === 'stewardship' ? definition.objective.result : method === 'public' ? active.facts.witnessRecorded ? `The evidence is public, with ${definition.witness.name}’s own limits preserved.` : 'The material evidence is public with personal names redacted; no living witness’s consent has been invented.' : 'You kept a careful private copy; the personal account has not been publicly exposed.'} The main campaign decision is still yours.`, 'exploration');
  }
  clear(here.id);
  if (active.facts.questId && state.campaign) state.campaign.facts[`dungeon_${active.facts.questId}`] = true;
  ctx.journal?.('An expedition remembered', `${definition.title} is complete. The discovery survives in your journal and can change the story above.`, 'quest');
  ctx.touchCampaign?.();
}

export function applyAuthoredContentChoice(state,definition,here,active,id,ctx={}, {modern:enriched=true,onClear=null,checkOffer=true,navigation=false}={}) {
  if (checkOffer && !authoredRoomChoices(state,definition,here,active,{modern:enriched,navigation}).some(choice=>choice.id===id&&!choice.disabledReason)) return false;
  const clear = roomId => { if (!active.cleared.includes(roomId)) active.cleared.push(roomId); onClear?.(roomId); };
  const progressBefore = { cleared: active.cleared.includes(here.id), proof: Boolean(active.facts.variantProof), aid: Boolean(active.facts.variantAid), complete: active.complete };
  if (id === 'listen') {
    active.facts[`listened_${here.id}`] = true;
    ctx.journal?.('A place with its own account', `${here.title}: ${authoredGuardianAccount(state, definition, here, enriched)}`, 'exploration');
  } else if (id === 'search') {
    const trained = Math.max(state.hero.skills.survival || 0, state.hero.skills.stealth || 0, state.hero.skills.scholarship || 0) >= 3;
    if (!trained) state.hero.hp = Math.max(1, state.hero.hp - 5);
    active.facts[`searched_${here.id}`] = true;
    clear(here.id);
    ctx.journal?.('A route learned', `You investigated ${here.title}${trained ? ' and found a safe passage' : ', took 5 damage, and found the safe route for your next visit'}.`, 'exploration');
  } else if (id === 'parley') {
    active.facts[`peaceful_${here.id}`] = true;
    if (here.rescue) {
      active.facts.prisonersFreed = true;
      if (state.campaign) state.campaign.facts.watchtowerPrisoners = true;
      ctx.standing?.('villagers', 4);
      ctx.witnesses?.().forEach((person) => ctx.remember?.(person.id, 'You secured the imprisoned travelers’ release without treating them as expendable.', 3));
    }
    clear(here.id);
    const support = enriched ? rememberedSupport(state, definition) : null;
    const formation = enriched && here.kind === 'boss' ? formationSupport(state, definition) : null;
    if (support) { active.facts[`companion_${here.id}`] = support.id; ctx.remember?.(support.id, `Expedition: ${definition.id}. I spoke beside you because your earlier choices gave me reason to trust how you answered ${definition.custodian.name}.`, 2); }
    if (formation) active.facts[`formation_${here.id}`] = formation.id;
    ctx.journal?.('Another way through', `You earned peaceful passage through ${here.title}.${enriched ? ` You answered ${definition.custodian.name}’s concern about ${definition.motive.title.toLowerCase()}${support ? ` with ${support.name} speaking from a real shared memory` : ` through ${active.facts.variantAid ? 'practical aid' : active.facts.variantProof ? 'a preserved account' : 'your trained judgment'}`}${formation ? ` and the work recorded in your completed “${formation.technique}” formation` : ''}.` : ''} There was no combat reward.`, 'exploration');
  } else if (id === 'hear_witness') {
    active.facts.witnessHeard = true;
    ctx.journal?.('A person beside the objective', `${definition.witness.name}, ${definition.witness.role}, gave their account with limits: their words can be recorded, but not used as consent for what others did.`, 'exploration');
  } else if (id === 'aid_only') {
    consumeMaterials(state, here.id === 'service' ? { ore: 1 } : { cloth: 1 });
    active.facts.variantAid = true; active.facts[`aid_only_${here.id}`] = true;
    active.facts.aidSource=here.id;
    if (here.kind === 'witness') active.facts.witnessProtected = true;
    clear(here.id);
    rememberExpedition(state, definition, ctx, 'You helped make this refuge safe while leaving its personal records with the people they concern.', 3);
    ctx.journal?.('Care without taking an account', `You spent one actual day and one ${here.id === 'service' ? 'ore' : 'cloth'} in ${here.title}. The route or refuge is safer; its personal records remain here and grant no negotiation evidence.`, 'exploration');
  } else if (id === 'record_witness' || id === 'protect_witness') {
    if (id === 'protect_witness') {
      consumeMaterials(state, { cloth: 1 }); active.facts.witnessProtected = true; active.facts.witnessRecorded = true; active.facts.variantAid = true;active.facts.aidSource=here.id;
      rememberExpedition(state, definition, ctx, `You helped protect ${definition.witness.name}’s refuge before opening this place to visitors.`, 3);
    } else active.facts.witnessRecorded = true;
    active.facts.variantProof = true;
    active.facts.proofSource=here.id;
    clear(here.id);
    ctx.journal?.('An account kept with permission', `${definition.witness.name}’s words and their limits are recorded.${id === 'protect_witness' ? ' You spent one cloth and a real day making their refuge safer.' : ' Recording took a real day; their account is evidence, not ownership of its speaker.'}`, 'exploration');
  } else if (id === 'repair_route') {
    consumeMaterials(state, { ore: 1 }); active.facts.variantAid = true; active.facts.variantProof = true;active.facts.proofSource=here.id;active.facts.aidSource=here.id;
    clear(here.id);
    rememberExpedition(state, definition, ctx, 'You helped restore a neglected maintenance route instead of leaving its duty to the next traveler.', 3);
    ctx.journal?.('A promise repaired in practice', `${here.title}: one ore and a real day repaired the supports. Its work orders remain as evidence of a neglected duty.`, 'exploration');
  } else if (id === 'preserve' || id === 'restore' || id === 'salvage') {
    if (id === 'salvage') {
      if (state.equipment) state.equipment.materials.ore += 1;
      active.facts.salvagedPersonalTool = true;
      rememberExpedition(state, definition, ctx, 'You recovered the useful iron tool and left the personal account behind.', -1);
    } else {
      active.facts.variantProof = true;
      active.facts.proofSource=here.id;
      if (id === 'restore') { consumeMaterials(state, { cloth: 1 }); active.facts.variantAid = true;active.facts.aidSource=here.id; }
      rememberExpedition(state, definition, ctx, `You ${id === 'restore' ? 'helped preserve' : 'preserved'} a personal account and left its tools to their owners.`, id === 'restore' ? 3 : 1);
    }
    clear(here.id);
    ctx.journal?.('What you chose to carry', id === 'salvage' ? `You took one ore from ${here.title}; its personal account is not preserved as negotiation evidence.` : `You preserved the personal account in ${here.title}${id === 'restore' ? ', using one cloth to protect it' : ', leaving its useful tool in place'}.`, 'exploration');
  } else if (id === 'take') {
    if (!active.facts[`claimed_${here.id}`]) {
      const loot = here.loot;
      dropEquipment(state,`cache:${active.id}:${here.id}`,Math.min(6,1+definition.rooms.findIndex(r=>r.id===here.id)),ctx);
      state.hero.gold += loot.gold || 0;
      if (state.equipment) for (const key of ['ore', 'cloth']) state.equipment.materials[key] += loot[key] || 0;
      state.flags.herbs = (state.flags.herbs || 0) + (loot.herbs || 0);
      active.facts[`claimed_${here.id}`] = true;
      ctx.journal?.('A cache recovered once', `You recovered ${loot.gold || 0} gold, ${loot.ore || 0} ore, ${loot.cloth || 0} cloth${loot.herbs ? `, and ${loot.herbs} herbs` : ''} from ${here.title}.`, 'equipment');
    }
    clear(here.id);
  } else if (id === 'rest') {
    for (const person of [state.hero, ...state.companions.filter((person) => person.recruited && person.active)]) {
      if (person.hp > 0) { person.hp = Math.min(person.maxHp, person.hp + 8); person.mp = Math.min(person.maxMp, person.mp + 5); }
    }
  } else if (id === 'finish' || id === 'finish_public' || id === 'finish_stewardship') {
    if (id === 'finish_stewardship') consumeMaterials(state, definition.objective.materials);
    finishAuthoredDungeon(state,active,definition,here,ctx,id === 'finish_public' ? 'public' : id === 'finish_stewardship' ? 'stewardship' : 'copy',enriched,onClear);
  }
  if (['search','parley','aid_only','record_witness','protect_witness','repair_route','preserve','restore','finish','finish_public','finish_stewardship'].includes(id)) {
    const credit = [];
    if (!progressBefore.cleared && active.cleared.includes(here.id)) credit.push(`Passage secured: ${here.title}`);
    if (!progressBefore.proof && active.facts.variantProof) credit.push('Negotiation evidence preserved');
    if (!progressBefore.aid && active.facts.variantAid) credit.push('Practical aid completed for the custodian’s concern');
    if (!progressBefore.complete && active.complete) {
      credit.push('Expedition objective completed');
      if (active.facts.questId && state.campaign) credit.push('Linked quest objective recorded');
      if (id === 'finish_public') credit.push('Villager standing +2');
      if (id === 'finish_stewardship') credit.push('Villager standing +3');
    }
    if (credit.length) {
      if (id === 'parley' && enriched) {
        const support = rememberedSupport(state, definition);
        const formation = here.kind === 'boss' ? formationSupport(state, definition) : null;
        if (support) credit.push(`${support.name} spoke from a real shared memory`);
        if (formation) credit.push(`Supported by your completed formation: ${formation.technique}`);
      }
      state.notice = credit.join('. ') + '. Progress is kept on return; no combat gold or combat experience is granted. Fighting is not required for this result.';
      ctx.journal?.('Progress without a fight', state.notice, 'exploration');
    }
  }
  return true;
}

function performChoice(state, id, ctx, charged = false) {
  if (!state.dungeon) return false;
  const offered = operationChoices(state).find((choice) => choice.id === id);
  if (!offered || offered.disabledReason) return false;
  const active = state.dungeon;
  const definition = currentDefinition(state);
  const here = currentRoom(state);
  if (!charged && timeCost(id)) {
    const beforeDay = state.day;
    ctx.spendDays?.(1, { outdoors: false });
    if (state.phase === 'retired' || !state.dungeon) return true;
    if (state.day <= beforeDay) { state.notice = 'This dungeon action waits for its real day. Resolve the calendar need, then choose it again; no room or reward was granted.'; return true; }
  }
  if (id === 'leave') {
    saveProgress(state);
    state.dungeon = null;
    state.notice = 'You return to the wider world. Cleared rooms and claimed supplies remain remembered.';
    return true;
  }
  if (id.startsWith('route_')) {
    active.roomId = id.slice(6);
    if (!active.visited.includes(active.roomId)) active.visited.push(active.roomId);
    saveProgress(state);
  } else if (id === 'fight') {
    active.pendingRoom = here.id;
    saveProgress(state);
    ctx.startBattle?.(here.encounterId, { kind: 'dungeon', dungeonId: active.id, roomId: here.id, ...(active.facts.questId ? { questId: active.facts.questId } : {}) });
    return true;
  } else applyAuthoredContentChoice(state,definition,here,active,id,ctx,{modern:modern(state),onClear:()=>saveProgress(state),checkOffer:false,navigation:true});
  saveProgress(state);
  if (!state.event && !state.battle) presentRoom(state, ctx);
  return true;
}

export function applyExplorationAction(state, id, ctx = {}) {
  if (typeof id !== 'string' || !id.startsWith('explore_')) return false;
  if (id.startsWith('explore_enter_')) return enterDungeon(state, id.slice(14), null, ctx);
  return performChoice(state, id.slice(8), ctx, true);
}

export function applyExplorationChoice(state, eventId, choiceId, ctx = {}) {
  if (!state.dungeon || eventId !== `dungeon_${state.dungeon.id}_${state.dungeon.roomId}`) return false;
  return performChoice(state, choiceId, ctx);
}

export function afterExplorationBattle(state, context, outcome, ctx = {}) {
  const active = state.dungeon;
  if (context?.kind !== 'dungeon' || !active || context.dungeonId !== active.id || context.roomId !== active.pendingRoom || !['victory', 'retreat', 'defeat'].includes(outcome)) return false;
  active.pendingRoom = null;
  if (outcome === 'victory') {
    clearRoom(state, context.roomId);
    if (roomById(currentDefinition(state), context.roomId).rescue && !active.facts.prisonersFreed) {
      active.facts.prisonersFreed = true;
      if (state.campaign) state.campaign.facts.watchtowerPrisoners = true;
      ctx.standing?.('villagers', 2);
      ctx.journal?.('The cell doors opened', 'Your victory freed the detained travelers. Their families can return to the road.', 'quest');
    }
  }
  saveProgress(state);
  if (outcome === 'defeat') {
    state.dungeon = null;
    ctx.journal?.('Back above ground', 'Recovery brought your party out of the dungeon. The unfinished room remains unresolved; prior discoveries are kept.', 'exploration');
  } else if (!state.event) presentRoom(state, ctx);
  return true;
}

export function explorationEventIds() {
  const events = {};
  const operations = ['fight', 'listen', 'search', 'parley', 'take', 'rest', 'leave', 'finish', 'hear_witness', 'record_witness', 'protect_witness', 'repair_route', 'aid_only', 'preserve', 'restore', 'salvage', 'finish_public', 'finish_stewardship'];
  // Every possible room uses a stable id, including optional seeded chambers.
  // The engine can validate saved scenes without creating or rerolling a graph.
  for (const definition of DUNGEONS) {
    const ids = [...definition.rooms.map(here => here.id), ...OPTIONAL_IDS];
    for (const id of ids) events[`dungeon_${definition.id}_${id}`] = [...operations, ...ids.map(exit => `route_${exit}`)];
  }
  return events;
}

const snapshotSignatures = new Map();
function stableSnapshot(value) {
  if (Array.isArray(value)) return `[${value.map(stableSnapshot).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSnapshot(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function validSnapshot(value, id, state) {
  if (!value || value.version !== 1 || value.id !== id || typeof value.seed !== 'string' || !value.seed || value.seed.length > 128 || state && value.seed !== state.seed) return false;
  const key = `${value.seed}\u001f${id}`;
  if (!snapshotSignatures.has(key)) {
    if (snapshotSignatures.size >= 128) snapshotSignatures.clear();
    snapshotSignatures.set(key, new Set([
      stableSnapshot(generateDungeonDefinition(value.seed, id)),
      stableSnapshot(generateDungeonDefinition(value.seed, id, { legacyNames: true })),
    ]));
  }
  // A saved graph is a snapshot, not a user-supplied loot/encounter definition.
  // V1 generation is immutable and checked without mutating the saved graph.
  return snapshotSignatures.get(key).has(stableSnapshot(value));
}

function validRecord(value, definition, active = false) {
  if (!value || !Array.isArray(value.visited) || !Array.isArray(value.cleared) || typeof value.complete !== 'boolean' || !value.facts || typeof value.facts !== 'object' || Array.isArray(value.facts)) return false;
  for (const list of [value.visited, value.cleared]) if (new Set(list).size !== list.length || list.length > definition.rooms.length || list.some((id) => !roomById(definition, id))) return false;
  if (value.visited[0] !== 'entry' || value.visited.some((id, index) => index > 0 && !definition.rooms.some((here) => value.visited.slice(0, index).includes(here.id) && here.exits.includes(id)))) return false;
  if (!value.cleared.every((id) => value.visited.includes(id)) || Object.keys(value.facts).length > 40 || !Object.values(value.facts).every((fact) => typeof fact === 'boolean' || typeof fact === 'string' && fact.length <= 120 || Number.isSafeInteger(fact) && fact >= 0)) return false;
  if (active && (!roomById(definition, value.roomId) || !value.visited.includes(value.roomId) || value.pendingRoom !== null && (value.pendingRoom !== value.roomId || value.cleared.includes(value.pendingRoom)))) return false;
  if (value.complete && !definition.rooms.filter((here) => ['boss', 'objective'].includes(here.kind)).every((here) => value.cleared.includes(here.id))) return false;
  return true;
}

export function validateExploration(value, state) {
  if (state?.flags?.explorationVersion !== undefined && state.flags.explorationVersion !== 1) return false;
  if (value !== null) {
    const base = dungeonById(value?.id);
    if (!base || value.definition !== undefined && !validSnapshot(value.definition, value.id, state)) return false;
    const definition = value.definition || base;
    if (!definition || !validRecord(value, definition, true)) return false;
    if (state && (state.locationId !== definition.locationId || !readyAge(state))) return false;
  }
  const records = state?.flags?.dungeonRecords;
  if (records !== undefined && (!records || typeof records !== 'object' || Array.isArray(records) || Object.keys(records).length > DUNGEONS.length || Object.entries(records).some(([id, record]) => !dungeonById(id) || record?.definition !== undefined && !validSnapshot(record.definition, id, state) || !validRecord(record, record.definition || dungeonById(id))))) return false;
  if (value?.definition && records?.[value.id]?.definition && stableSnapshot(value.definition) !== stableSnapshot(records[value.id].definition)) return false;
  return true;
}

export function dungeonView(state) {
  const definition = currentDefinition(state);
  if (!definition) return null;
  const support = modern(state) ? rememberedSupport(state, definition) : null, formation = modern(state) ? formationSupport(state, definition) : null;
  return { title: definition.title, description: definition.description, rooms: definition.rooms.filter(here=>state.dungeon.visited.includes(here.id)||currentRoom(state).exits.includes(here.id)).map((here) => ({ id: here.id, mapIndex:definition.rooms.findIndex(r=>r.id===here.id), title: state.dungeon.visited.includes(here.id)?here.title:'Unexplored passage · '+passageCue(here,definition), visited: state.dungeon.visited.includes(here.id), cleared: state.dungeon.cleared.includes(here.id), current: state.dungeon.roomId === here.id, optional: here.optional === true, exits: state.dungeon.visited.includes(here.id)?here.exits.filter(id=>state.dungeon.visited.includes(id)||here.id===state.dungeon.roomId):[] })), room: { title: currentRoom(state).title, description: currentRoom(state).description, encounterId: currentRoom(state).encounterId || null, resolved: state.dungeon.cleared.includes(currentRoom(state).id) }, complete: state.dungeon.complete, ...(modern(state) ? { variant: 1, objective: copy(definition.objective), inhabitant: copy(definition.custodian), witness: copy(definition.witness), motive: copy(definition.motive), evidence: Boolean(state.dungeon.facts.variantProof), aid: Boolean(state.dungeon.facts.variantAid), negotiation: negotiationChecklist(state), cacheIsBackground: definition.rooms.some(r=>r.kind==='treasure'&&state.dungeon.facts['claimed_'+r.id]), supportedBy: support ? { id: support.id, name: support.name } : null, supportedTechnique: formation, method: state.dungeon.facts.objectiveMethod || null } : {}) };
}

export function encounterIds() {
  return ['rpg_guardian','rpg_pursuit','vampire_hunters','wolf_hunters','feral_vampire','moon_mauler','free_beast','free_undead','free_spirit','free_construct','free_bandit','free_aberration','forest', 'ruin', 'initiation', 'road_bandits', 'road_beasts', 'cistern_sluice', 'cistern_flooded', 'cistern_keeper', 'archive_scriptoria', 'archive_vault', 'archive_warden', 'root_spoor', 'root_thorns', 'thornheart', 'tower_cliff', 'tower_cells', 'tower_captain', 'core_hall', 'core_forge', 'core_warden', 'covenant_guardian'];
}
