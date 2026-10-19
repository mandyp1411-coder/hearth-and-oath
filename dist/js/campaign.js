import { groundedQuest } from './grounded-narrative-content.js';
import { endingProse } from './world-prose-v30.js';
import { recordQuestStart, questEntryStatus } from './quest-policy.js';
import { lossesBeforeEnding, endingLosses, endingLossSummary, validateEndingLosses, currentLossCause } from './ending-losses.js';
import { livingStoryPerson,religiousQuestScene } from './story-presence-v26.js';
import { seededRoll, worldCalendarContext, isSettlement } from './world.js';
import { getProfession, recordCareerWork } from './careers.js';

const FATES = {
  ember: { label: 'Cinderbound', birth: 'Cold ash warmed your infant blanket, though the hearth had been dark all night.', clues: ['At four, a cold fireplace shows unfamiliar hands tending its coals. Only the person beside you sees you reach toward them.', 'At ten, you notice that the old cistern stones are warm beneath the rain. The warmth moves toward the city, against the water’s flow.', 'At fifteen, your hidden book describes a hearth that draws its fire from remembered lives. Its diagram matches the pattern you saw in the ashes.'] },
  echo: { label: 'Bellborn', birth: 'An unpulled bell sounded at your birth. Its last note seemed to answer your first cry.', clues: ['At four, you hear an extra word in the shrine hymn: “willing.” The keeper’s written verses leave it out.', 'At ten, a fallen marker rings when you touch it. Beneath its mud you find the words “until I ask to go.”', 'At fifteen, the prohibited book preserves a different version of the first oath. Every promise in it can be withdrawn.'] },
  thorn: { label: 'Rootremembered', birth: 'A winter seed sprouted beside your cradle, its roots curling toward the old burial ground.', clues: ['At four, roots curl around a forgotten grave without disturbing it. You hear a name that no one has spoken that morning.', 'At ten, the storm exposes roots growing around an old marker. They trace a path away from the city and toward the sanctuary.', 'At fifteen, a drawing in the hidden book shows a forest carrying memories that the city’s wards refuse to keep.'] },
};
const C = (id, label, description) => ({ id, label, description });
const ageOf = s => s.timeline?.mode === 'birth' ? Math.floor((s.day-(s.timeline.birthDay || 0)) / 365) : s.age;
const inheritedResolution = s => s.timeline?.contentVersion>=6 && s.campaign?.facts?.inheritedResolution===true;
const place = (s, id) => s.world.locations.find(p => p.id === id);
const placeName = (s, id) => place(s, id)?.name || ({ marsh: 'the reed marsh', coast: 'the ferry coast', camp: 'the refugee camp', sanctuary: 'the old sanctuary', tower: 'the ward tower', citadel: 'the sealed citadel' })[id] || id;
const kin = s => s.life?.people.find(p => p.id === 'kin');
const friend = s => s.life?.people.find(p => p.id === 'fellow');
const pname = (s, id) => s.life?.people.find(p => p.id === id)?.name || ({ kin: 'your caregiver', fellow: 'your old friend', rival: 'your academic rival' })[id] || id;
const receiptMeta=s=>s.narrativeEdition===30?{narrativeEdition:30,capturedReceipt:true}:{};
const journal = (s, ctx, title, text) => { s.notice = text; ctx.journal(title, text, 'campaign',receiptMeta(s)); };
const fact = (s, key, value = true) => { s.campaign.facts[key] = value; };
const bond = (s, id, n, memory) => { const p = s.life?.people.find(p => p.id === id); if (p&&p.alive!==false) { p.bond = Math.max(0, Math.min(100, p.bond + n)); if (memory && !p.memories.includes(memory)) p.memories.push(memory); p.memories = p.memories.slice(-30); } };
const know = (s, id, value) => { const p = s.life?.people.find(p => p.id === id); if (p && p.alive!==false && !p.knownFacts.includes(value)) p.knownFacts.push(value); };
const birthplace = s => s.hero.birthplaceId || (s.hero.origin === 'city' ? 'city' : 'home');
const professionalPlans = {
  Blacksmith:{label:'Fit ordinary braces and hearth fittings with my smithing trade',text:'Use 2 ore and 1 wood. A working craft preserves reinforced homes through the final rupture.',materials:{ore:2,wood:1},fact:'wardsReady',work:'safe hinges, ordinary hearth fittings, and tested structural braces'},
  Miner:{label:'Survey the supports and reinforce the vulnerable homes',text:'Use 2 stone and 1 wood. Practiced surveying preserves reinforced homes through the final rupture.',materials:{stone:2,wood:1},fact:'wardsReady',work:'sound supports and a witnessed inspection of the damaged stonework'},
  Scholar:{label:'Publish enforceable withdrawal terms with the public teachers',text:'Use 1 cloth for weatherproof public copies. Your actual scholarship gives families an accountable coalition; physical shelter still needs another ally.',materials:{cloth:1},fact:'councilCoalition',work:'public lessons, legible consent terms, and copies with every contributor named'},
  Bard:{label:'Gather a public assembly and teach the warning verses',text:'Use 1 cloth for visible signals. Your practiced voice gives affected households a place in the coalition; ordinary buildings still need repair.',materials:{cloth:1},fact:'councilCoalition',work:'warning songs, public testimony, and an account of the voices left unheard'},
  Soldier:{label:'Train volunteer escorts and rehearse the household evacuation',text:'Use 1 cloth for route and household markers. Your actual watch experience prepares people to leave safely.',materials:{cloth:1},fact:'evacuationReady',work:'a voluntary escort drill, inspected watch lanterns, and a safer evacuation route'},
  Cartographer:{label:'Survey safe exits and mark a route every household can use',text:'Use 1 wood and 1 cloth for durable route markers. Your actual surveying prepares people to leave safely.',materials:{wood:1,cloth:1},fact:'evacuationReady',work:'checked paths and weatherproof route markers that name a reachable refuge'},
  Healer:{label:'Prepare a refuge clinic with patient consent and safe triage',text:'Use 2 cloth for clean dressings. Your actual care experience prepares a refuge; it does not cure every disease or reinforce the old homes.',materials:{cloth:2},fact:'refugeReady',work:'clean dressings, a witnessed recovery plan, and a clinic that asks before treating'},
  Herbalist:{label:'Establish labeled remedy stores at the refuge',text:'Use 1 wood and 1 cloth for safe storage. Your actual gathering knowledge prepares a refuge without claiming a universal cure.',materials:{wood:1,cloth:1},fact:'refugeReady',work:'labeled remedy stores and gardens whose limits are recorded beside their uses'},
  Alchemist:{label:'Check the refuge’s water and prepare reliable stores',text:'Use 1 ore and 1 cloth for clean testing vessels. Your actual preparation practice supplies a refuge; it cannot replace consent.',materials:{ore:1,cloth:1},fact:'refugeReady',work:'checked water vessels and honestly labeled, safely prepared community supplies'},
  Merchant:{label:'Organize accounted supplies without demanding household service',text:'Use 2 wood and 1 cloth for provision crates. Your actual trade experience supplies a refuge and leaves families free to refuse a contract.',materials:{wood:2,cloth:1},fact:'refugeReady',work:'a named provision ledger and fair transport agreements for the surviving households'},
  Farmer:{label:'Prepare seed, food stores, and a refuge kitchen',text:'Use 2 wood for dry storage. Your actual growing experience prepares a refuge with ordinary food and future seed.',materials:{wood:2},fact:'refugeReady',work:'dry food stores, shared seed beds, and a kitchen prepared for the next hard season'},
  Innkeeper:{label:'Arrange safe lodgings with clear household boundaries',text:'Use 1 wood and 2 cloth for beds and privacy screens. Your actual hosting experience prepares a refuge without claiming anyone’s home.',materials:{wood:1,cloth:2},fact:'refugeReady',work:'safe beds, clear household agreements, and a public account of the rooms actually available'},
};
const materialText = materials => Object.entries(materials).map(([id,n])=>`${n} ${id}`).join(' + ');
const hasMaterials = (s,materials) => Object.entries(materials).every(([id,n])=>(s.equipment?.materials?.[id] || 0)>=n);
function professionalPlan(s) {
  const plan=professionalPlans[s.hero.profession],profession=getProfession(s.hero.profession),record=s.careers?.records?.[s.hero.profession];
  return plan && record?.workedDays>=14 && (s.hero.skills[profession.skill] || 0)>=2 ? plan : null;
}
function consumeMaterials(s, materials) { for(const [id,n] of Object.entries(materials))s.equipment.materials[id]-=n; }
function storyContext(s) {
  const weather=worldCalendarContext(s.world,s.day,s.seed),site=place(s,s.locationId);
  const detail=seededRoll(s.seed,`covenant-scene:${s.campaign.stage}:${s.dynasty?.generation || 1}`,4);
  return [
    `Outside, ${weather.weather} marks ${weather.season}. ${site?.localCustom || 'The neighbors keep a public witness to important decisions.'}`,
    `The discussion belongs to ${site?.name || s.world.name}, where ${weather.pressure[0].toLowerCase()+weather.pressure.slice(1)}`,
    `A local keeper records who speaks and who still needs to be heard. ${site?.localCustom || weather.pressure}`,
    `The weather is ${weather.weather}; ordinary work continues around the inquiry. ${s.hero.profession!=='Unemployed'?`Your ${s.hero.profession.toLowerCase()} livelihood has not disappeared beneath the omen.`:weather.pressure}`,
  ][detail];
}
function preparationChoices(s,q) {
  const choices=q.choices.filter(c=>c.id!=='professional');
  if(q.id==='pledge' && ageOf(s)<18)return choices.filter(c=>c.id!=='keeper');
  if(q.id==='prepare') { const p=professionalPlan(s);if(p && hasMaterials(s,p.materials))choices.push(C('professional',p.label,`${p.text} Consume these actual supplies once; fourteen recorded work days and skill 2 are required.`)); }
  return choices;
}

const ENDINGS = {
  renew: { title: 'The Willing Compact', summary: 'Withdrawal rights and public consent replace compulsory binding. Reduced wards survive, and every willing keeper has a way home. The region must maintain the agreement it chose.' },
  release: { title: 'The Unbound Dawn', summary: 'The bound ancestors leave freely. Magical conveniences fail, and the living learn to provide heat, care, and protection without taking another person’s eternity.' },
  keeper: { title: 'The Living Keeper', summary: 'An informed adult takes a limited term of service, with witnesses and a release date. Protection endures through a personal commitment rather than inherited imprisonment.' },
  dominion: { title: 'The Iron Covenant', summary: 'Central authority preserves the wards through compulsory binding. The city glows, resistance grows, and the people held beneath it have not consented to the price.' },
  shatter: { title: 'The Broken Anchor', summary: 'The mechanism is destroyed. Its captive voices are free, but the landscape and settlements bear a permanent wound. Survivors decide what can be rebuilt.' },
  haven: { title: 'The Haven Beyond the Ash', summary: 'You lead a community beyond the failing wards. The wider covenant remains unresolved, while a new settlement grows around the people who chose to leave together.' },
};

const AFTERMATH_SCENES={
  renew:[
    ['A promised right is tested','A former participant asks to leave the compact before the winter review. A council member argues that the departure is inconvenient. Their inconvenience does not rewrite the right you recorded.'],
    ['The names missing from the agreement','A copied compact omits the names of several refugee delegates. Those delegates ask for a corrected public copy, while the clerk explains how the error happened.'],
    ['A smaller ward, a useful furnace','The voluntary ward protects less ground than the old anchor. Ordinary makers ask for a reliable furnace plan rather than another promise that magic will carry every household.'],
  ],
  release:[
    ['The first ordinary fuel account','Neighbors compare the price of fuel after covenant heat ended. A comfortable household offers timber if its name alone appears on the shared repair.'],
    ['A healer’s missing convenience','A clinic has lost the anchor’s effortless warmth. Its workers need clean blankets and a practical routine; no one asks to reclaim an ancestor’s freedom as payment.'],
    ['A ceremony without a captive voice','An elder misses hearing a familiar ancestor at the winter ceremony. A younger relative asks to keep the remembrance while respecting that person’s right to leave.'],
  ],
  keeper:[
    ['The person beneath the public title','Witnesses ask what time a willing keeper should retain for an ordinary household and livelihood. They record the answer beside the term’s end date.'],
    ['A release clause read aloud','A clerk proposes shortening the release clause to make the public notice easier to copy. A witness insists that every person should be able to read how service ends.'],
    ['Ordinary protection beside sacred service','Watchers want safe lanterns and sound doors alongside voluntary wards. A keeper’s devotion cannot replace a neighbor’s careful work.'],
  ],
  dominion:[
    ['A household asks for a name','A family brings an old letter and asks whether the person it names was added to the anchor. The official register avoids the question; the private letter does not establish every answer.'],
    ['A prosperous ward and a locked record','The city celebrates another well-lit winter while closing access to the binding register. A worker asks who is paying for the comfort their household enjoys.'],
    ['A refusal written in the margin','A witness preserves an ancestor’s recorded refusal beside a compulsory order. Officials demand the original. The witness asks whether a public record can protect a person the covenant ignores.'],
  ],
  shatter:[
    ['A useful road through the scar','Survivors need a marked route around the crater. Some want the old place restored on the map as though nothing happened; others ask that the permanent loss remain legible.'],
    ['The tools brought back to a ruin','A family returns with a salvaged tool and a list of rooms that no longer exist. A useful temporary shelter can be built without pretending the original town reopened.'],
    ['A memorial with unfinished names','The public memorial includes people confirmed safe beside names still unresolved. A relative asks to keep the distinction rather than turn uncertainty into a convenient ending.'],
  ],
  haven:[
    ['A newcomer at the haven’s door','A newcomer asks to settle beyond the old wards. Founders disagree over whether shared work should be a fair contribution or a permanent obligation to the first households.'],
    ['A child draws the abandoned streets','A young neighbor draws an old settlement from its surviving account. A former resident wants both its welcome and its failures preserved beside the picture.'],
    ['The kitchen needs a second hearth','A larger community needs another ordinary kitchen. A founding household asks whether their old welcome means they can decide every new agreement alone.'],
  ],
};

const QUESTS = [
  { id: 'well', act: 1, title: 'Ash beneath clean water', locationId: 'marsh', dungeon: 'cistern', objective: 'Explore the old cistern and discover what is entering the water.', description: 'The fever returns after a careful repair. Follow the water into rooms that predate the village.' },
  { id: 'patients', act: 1, title: 'The patient’s own voice', locationId: 'home', objective: 'Hear what a patient and their family want before choosing a remedy.', body: s => `The cistern is contaminated by warmth from an ancient conduit. A fever patient asks for an ancestor’s advice; their sibling wants living medicine. Orrin asks you to make room for consent, while ${pname(s, 'kin')} waits outside the clinic.`, choices: [C('living', 'Organize moonroot care and consult the living healers', 'A reliable field remedy; record that the deeper cause remains.'), C('willing', 'Ask a willing ancestor with the patient’s permission', 'Learn ancestral testimony without binding a soul.'), C('coerce', 'Bind an unwilling voice for a quicker answer', 'Obtain the testimony through coercion. Present companions witness the act; this violates a mercy oath.')], apply(s, id, c) { fact(s, 'remedyMethod', id === 'living' ? 'moonroot' : 'ancestral'); fact(s, 'patientConsent', id !== 'coerce'); if (id === 'coerce') { fact(s, 'coercedTestimony'); c.breakOath('You bound an unwilling ancestral witness.'); for (const p of c.witnesses()) c.remember(p.id, 'You coerced a voice while seeking the cistern’s cause.', -18); } else c.standing('villagers', 4); } },
  { id: 'letter', act: 1, title: 'A letter with two seals', locationId: 'city', objective: 'Decide how to approach institutions that disagree about your findings.', body: () => 'The academy offers laboratory support if you return all original notes. The Lantern Order offers a public hearing. A discreet physician offers private study. Each route can reach the truth; each creates a different obligation.', choices: [C('academy', 'Accept academy support and promise the notes back', 'Add an explicit thirty-day research obligation and an institutional contact.'), C('order', 'Request a witnessed Lantern hearing', 'The Order knows that you are investigating the conduit; hidden rites remain private.'), C('independent', 'Work with the physician outside official sponsorship', 'Preserve independence and a discreet contact without creating a crime.')], apply(s, id, c) { fact(s, 'firstSponsor', id); if (id === 'academy') c.addObligation('covenant_notes', 'Return the original covenant notes', 30, 'The academy lent its originals for your investigation.'); if (id === 'order') c.standing('order', 5); if (id === 'independent') fact(s, 'independentPhysician'); } },
  { id: 'return', act: 1, title: 'The homecoming account', locationId: 'home', objective: 'Bring care home and decide who learns how it was obtained.', body: s => `The remedy gives families breathing room. Mira asks how you learned about the conduit. ${s.campaign.facts.coercedTestimony ? 'The unwilling voice you bound is part of the account, if you choose to disclose it.' : 'A patient’s informed permission is a fact worth protecting.'} Gratitude, friendship, and local law will not necessarily agree.`, choices: [C('open', 'Give a public, accurate account', 'Neighbors learn the actual method. Disclosed coercion creates evidence; lawful medicine does not.'), C('mira', 'Tell Mira privately and protect the patient’s identity', 'Mira learns the account. The wider settlement does not automatically learn it.'), C('quiet', 'Explain the care while keeping the research private', 'The public learns about the remedy, with no automatic disclosure of hidden rites.')], apply(s, id, c) { fact(s, 'publicAccount', id); fact(s, 'villageCaredFor'); c.standing('villagers', 8); if (id === 'mira'&&livingStoryPerson(s,'mira')) c.remember('mira', 'You trusted me with the cistern investigation in private.', 6); if (id === 'open' && s.campaign.facts.coercedTestimony) c.addEvidence(2, 'You publicly admitted coercing an ancestral witness during the cistern investigation.'); } },
  { id: 'ledger', act: 2, title: 'The academy’s missing ledger', locationId: 'ruin', dungeon: 'buried_archive', objective: 'Recover the original covenant records from the buried archive.', description: 'An abandoned archive preserves what the academy’s public account omitted.' },
  { id: 'inquiry', act: 2, title: 'Mira’s difficult inquiry', locationId: 'city', objective: 'Choose what evidence to place before the Lantern investigators.', body: () => 'The ledger names souls added to the anchor without consent. Mira believes it, but her commander asks for a reassuring summary until the city has another source of protection. She asks what you are willing to put on the record.', choices: [C('record', 'Submit the full record with its limits clearly stated', 'Expose the covenant’s coercion and earn Mira’s trust. Public institutions learn the documentary evidence.'), C('limited', 'Share the evidence privately while pursuing a safer transition', 'Mira knows the truth; publication waits for a plan.'), C('accuse', 'Publicly accuse the entire Order of knowing', 'Draw attention, but damage trust by exceeding what the record proves.')], apply(s, id, c) { fact(s, 'covenantExposed', id !== 'limited'); fact(s, 'inquiryAccount', id); if(livingStoryPerson(s,'mira'))c.remember('mira', id === 'accuse' ? 'You accused people beyond what our evidence established.' : 'You trusted me with the original covenant evidence.', id === 'accuse' ? -12 : 8); if (id === 'record') c.standing('villagers', 6); if (id === 'accuse') c.standing('order', -10); } },
  { id: 'ferryman', act: 2, title: 'The ferryman’s missing brother', locationId: 'coast', objective: 'Find what Kest’s missing sibling transported and who can testify.', body: () => 'Kest finds a transport receipt signed by their missing sibling. The ferryman sheltered them after they refused a second load of human remains. They are alive, frightened, and afraid that testimony will endanger the people who hid them.', choices: [C('protect', 'Arrange protected testimony with their agreement', 'Gain a living witness and Kest’s trust.'), C('anonymous', 'Use an anonymous copy of their receipt', 'Preserve the witness’s identity while retaining documentary proof.'), C('pressure', 'Demand a public appearance despite the danger', 'Gain public evidence, damage Kest’s trust, and lose the witness’s cooperation.')], apply(s, id, c) { fact(s, 'transportProof'); fact(s, 'protectedWitness', id === 'protect' && s.campaign.facts.transportWitnessType !== 'recorded_statement'); if(s.campaign.facts.transportWitnessType === 'recorded_statement')fact(s, 'protectedTransportAccount', id === 'protect'); c.remember('kest', id === 'pressure' ? 'You pressured my sibling to testify publicly.' : 'You respected my sibling’s fear while recovering the transport evidence.', id === 'pressure' ? -20 : 10); } },
  { id: 'accounts', act: 2, title: 'Three accounts of the first winter', locationId: 'sanctuary', objective: 'Reconcile the oath, the conduit map, and the forest record.', body: s => `Your ${FATES[s.campaign.fate].label} omen makes one account familiar. A keeper reads the original oath, a ward-maker traces the power conduits, and a gardener describes memories preserved in roots. None of them alone holds the whole answer.`, choices: [C('compare', 'Compare every account, including contradictions', 'Learn withdrawal rights, the city’s dependence, and the living forest route.'), C('families', 'Invite affected families to help interpret the record', 'Learn the same essential facts and begin a public constituency.'), C('private', 'Preserve the combined record for discreet negotiation', 'Learn every essential fact while limiting who hears it now.')], apply(s, id, c) { fact(s, 'consentTerms'); fact(s, 'powerConduits'); fact(s, 'forestMemory'); if (id === 'families') { fact(s, 'familyDelegates'); c.standing('villagers', 5); } fact(s, 'recordAudience', id); } },
  { id: 'patron', act: 2, title: 'The chancellor’s open hand', locationId: 'city', objective: 'Set the terms of your relationship with the academy’s patron.', body: () => 'Chancellor Veyr admits that city warmth and protective wards depend on the anchor. They offer access and sponsorship if you delay disclosure until a repair is ready. Their concern is real; so is their wish to control the account.', choices: [C('conditions', 'Accept access with written consent safeguards', 'Gain supervised access and an explicit institutional promise.'), C('independent', 'Refuse sponsorship and organize an independent effort', 'Maintain independence; community contacts become more important.'), C('power', 'Offer to help preserve central control', 'Begin an alliance with the chancellor. You have not yet authorized coercion.')], apply(s, id, c) { fact(s, 'patronAgreement', id); if (id === 'conditions') c.standing('academy', 5); if (id === 'independent') c.standing('villagers', 5); if (id === 'power') c.standing('academy', 8); } },
  { id: 'gate', act: 3, title: 'The cracked floodgate', locationId: 'brook', objective: 'Choose whom the failing ward can protect and prepare for its collapse.', body: s => `${placeName(s, 'brook')}’s river ward is failing. The carpenter says there is time for one coordinated response: reinforce the gate, move the households, or divert the surge toward the old burial fields. The risk is visible; no decision can preserve every familiar thing.`, choices: [C('reinforce', 'Organize a public repair with the millers', 'Save the village buildings; scar the surrounding fields and consume the spare ward.'), C('evacuate', 'Evacuate households before opening the gate', 'People reach the camp safely; the village is destroyed by the surge.'), C('divert', 'Divert the flood through the ancestral grove', 'Buildings survive. The grove is damaged, and its living bypass must later be repaired.')], apply(s, id, c) { fact(s, 'gateChoice', id); if (id === 'reinforce') { changePlace(s, 'brook', 'scarred', 'The river held at a cost', 'Millers and neighbors reinforced the gate. Homes survived; the fields beyond it carry the flood’s damage.', c); fact(s, 'brookSaved'); } if (id === 'evacuate') { fact(s, 'brookEvacuated'); changePlace(s, 'brook', 'destroyed', 'An empty village beneath the flood', 'The households reached the refugee camp before the surge. Buildings and the old mill were lost.', c); displace(s, 'brook', c); } if (id === 'divert') { changePlace(s, 'forest', 'scarred', 'A damaged burial grove', 'The flood was diverted through the grove. Its memory-bearing roots need careful restoration.', c); fact(s, 'groveDamaged'); fact(s, 'brookSaved'); } } },
  { id: 'refugees', act: 3, title: 'The empty seats at supper', locationId: 'camp', objective: 'Find a lasting place for displaced households.', body: s => `${s.campaign.facts.brookEvacuated ? 'The households you moved from Brook' : 'Families leaving the failing wards'} need more than a night under canvas. The city restricts entry, villages offer limited shelter, and the camp steward proposes a permanent common settlement.`, choices: [C('city', 'Negotiate places inside the city', 'Secure city shelter and an official refugee delegation.'), C('village', 'Organize shared village households', 'Secure community support; families remember their actual hosts.'), C('camp', 'Help the camp become a permanent refuge', 'Establish the foundation for an independent haven.')], apply(s, id, c) { fact(s, 'refugePlan', id); fact(s, 'refugeeShelter'); if (id === 'city') { c.standing('academy', 3); fact(s, 'cityDelegates'); } if (id === 'village') c.standing('villagers', 7); if (id === 'camp') { fact(s, 'refugeReady'); changePlace(s, 'camp', 'thriving', 'A camp becoming a town', 'Shared kitchens, a meeting hearth, and timber dwellings turn temporary shelter into a permanent community.', c); } } },
  { id: 'orchard', act: 3, title: 'The orchard of names', locationId: 'forest', dungeon: 'root_caverns', objective: 'Follow the roots into the place where discarded memories survive.', description: 'The forest remembers the people omitted from the city’s records. Reach its living heart.' },
  { id: 'anchor', act: 3, title: 'The second anchor', locationId: 'tower', objective: 'Decide whether emergency protection justifies a new binding device.', body: () => 'At the ward tower, the academy prepares a second anchor. It could stabilize the city quickly by drawing harder on the bound dead. The ward-makers offer a limited staffing pledge for the existing temporary ward. Its original terms allow each volunteer to withdraw.', choices: [C('voluntary', 'Witness the limited, voluntary ward agreement', 'Record willing staffing for the existing ward and its withdrawal terms. This is an agreement using the ward-makers’ existing capacity.'), C('stop', 'Stop the device and publish why', 'Prevent another binding. The city must prepare for reduced protection.'), C('permit', 'Permit emergency compulsory use', 'Stabilize city wards while adding unwilling burdens. Present companions witness your authorization.')], apply(s, id, c) { fact(s, 'secondAnchor', id); if (id === 'voluntary') { fact(s, 'voluntaryWard'); c.standing('order', 5); } if (id === 'stop') c.standing('villagers', 5); if (id === 'permit') { fact(s, 'authorizedCoercion'); c.breakOath('You authorized compulsory soul binding at the ward tower.'); for (const p of c.witnesses()) c.remember(p.id, 'You authorized another compulsory anchor.', -16); c.standing('academy', 6); } } },
  { id: 'council', act: 3, title: 'Who has a seat at the council?', locationId: 'city', objective: 'Decide who may speak for the living and the bound.', body: s => `The academy, the Lantern Order, and the villages meet. ${s.campaign.facts.protectedWitness ? 'Kest’s sibling can testify under the protection you arranged.' : 'Your documentary proof remains available without exposing a frightened witness.'} ${s.campaign.facts.volunteeredHelp || s.campaign.facts.neighborSupport ? 'People you spoke with have offered practical help.' : 'Some neighbors are waiting to hear whether their voices will count.'} The chair asks whom you will include.`, choices: [C('inclusive', 'Include families, refugees, and willing ancestral testimony', 'Build a representative coalition with withdrawal rights.'), C('institutions', 'Limit negotiations to the established institutions', 'Gain a faster agreement while leaving affected families outside.'), C('local', 'Organize a separate assembly of households', 'Establish an independent constituency and a refuge council.')], apply(s, id, c) { fact(s, 'councilChoice', id); fact(s, 'councilCoalition', id === 'inclusive'); if (id === 'inclusive') c.standing('villagers', 6); if (id === 'institutions') c.standing('academy', 5); if (id === 'local') fact(s, 'refugeCouncil'); } },
  { id: 'descent', act: 4, title: 'Beneath the sealed citadel', locationId: 'citadel', dungeon: 'covenant_core', objective: 'Reach the original anchor and the First Keeper.', description: 'The descent crosses old wards, abandoned chambers, and the guardian that maintained them.' },
  { id: 'keeper', act: 4, title: 'A keeper is still a person', locationId: 'citadel', objective: 'Hear the First Keeper’s wishes before proposing another bargain.', body: () => 'The First Keeper volunteered to contain the first winter. They never agreed to imprison later generations. They ask you to hear the distinction: protection can continue through willing service, end through release, pass to a living volunteer, or be preserved by force. Destroying the mechanism and leading a withdrawal are also possible.', choices: [C('listen', 'Hear their account and ask what they would choose freely', 'Obtain testimony and understand every possible route.'), C('terms', 'Read the original withdrawal terms aloud', 'Establish the Keeper’s right to leave and retain their testimony.'), C('bargain', 'Ask what protection costs before committing', 'Learn the practical costs of every route without promising a choice yet.')], apply(s, id) { fact(s, 'keeperTestimony'); fact(s, 'keeperHeard', id); fact(s, 'allRoutesKnown'); } },
  { id: 'pledge', act: 4, title: 'A promise made in public', locationId: 'sanctuary', objective: 'Choose a plan for the covenant, with its costs plainly stated.', body: () => 'The original record and the Keeper’s testimony make six plans possible. None belongs to a birth fate or combat class. State the plan you intend to prepare; the final confrontation still allows you to reconsider.', choices: [C('renew', 'Build a willing compact with the right to leave', 'Replace coercion with public consent and reduced wards.'), C('release', 'Release the bound and replace the failing infrastructure', 'End the covenant; prepare for life without its magical conveniences.'), C('keeper', 'Offer a limited term of living service yourself', 'Become a living keeper with an explicit release date. Your learned identity remains.'), C('dominion', 'Preserve the wards through centralized compulsory power', 'Keep city protection by authorizing the burdens the dead did not choose.'), C('shatter', 'Destroy the anchor and prepare for the rupture', 'Free the captive voices; a permanent scar and possible settlement losses follow.'), C('haven', 'Lead your community beyond the failing covenant', 'Save a particular community while the wider dispute remains unresolved.')], apply(s, id) { fact(s, 'plannedEnding', id); } },
  { id: 'prepare', act: 4, title: 'The work before the last night', locationId: 'home', objective: 'Choose what you will protect if the old wards fail.', body: s => `Your announced plan is “${ENDINGS[s.campaign.facts.plannedEnding]?.title}.” Choose which support pledge you will witness before the last night. These agreements use existing rooms, crews and reserves; they do not construct a new settlement. Allies may pledge other support if you previously helped them. ${s.campaign.facts.ferryReady ? 'The repaired ferries can carry families.' : 'Transport remains limited.'} ${s.campaign.facts.carpenterAlly ? 'The refugee carpenter has offered a crew.' : 'Local builders await your direction.'}`, choices: [C('wards', 'Witness the crews’ pledge for existing homes and utilities', 'Give the willing crews’ existing supplies and repair capacity priority through the transition. Their pledge protects buildings; other households still need a route to safety.'), C('evacuate', 'Confirm willing carriers and host households', 'Record the carriers’ standby agreement and the hosts’ existing places. This pledge prepares a route to safety before the final night.'), C('refuge', 'Witness the hosts’ pledge for an independent refuge', 'Commit the hosts’ existing rooms and donated reserves to a temporary refuge. A future town must still grow from these beginnings; this choice records the pledge.')], apply(s, id) { fact(s, 'preparation', id); fact(s,'preparationBasis','pledged_existing_capacity'); fact(s, 'wardsReady', id === 'wards' || !!s.campaign.facts.carpenterAlly || !!s.campaign.facts.wardReady); fact(s, 'evacuationReady', id === 'evacuate' || !!s.campaign.facts.ferryReady); fact(s, 'refugeReady', id === 'refuge' || !!s.campaign.facts.refugeReady || !!s.campaign.facts.refugeVolunteers); } },
  { id: 'final', act: 4, title: 'The last night of ash', locationId: 'citadel', objective: 'Resolve the guardian’s challenge and carry out your prepared plan.', body: s => `The covenant guardian asks why it should trust your plan: “${ENDINGS[s.campaign.facts.plannedEnding]?.title}.” It was built to keep the wards alive, even when the people inside them suffer. You have the Keeper’s testimony, the original terms, and the consequences of your preparations.`, choices: [C('testimony', 'Present the Keeper’s testimony and the original terms', 'Resolve the challenge through the evidence you actually recovered; carry out your announced plan.'), C('fight', 'Fight the guardian to take control of the anchor', 'Begin an actual final battle. Defeat or retreat does not grant an ending.'), C('ritual', 'Use the combined record to open a lawful withdrawal', 'A prepared ritual resolves the confrontation without requiring a combat class.'), C('reconsider', 'Return to the sanctuary and reconsider the plan', 'Keep your evidence and completed quests; make a different pledge before the final act.')], apply(s, id, c) { if (id === 'fight') { s.campaign.pending = { questId: 'final', stage: 'final', route: s.campaign.facts.plannedEnding }; c.startBattle('covenant_guardian', { kind: 'campaign', questId: 'final', stage: 'final' }); return 'pending'; } if (id === 'reconsider') { s.campaign.stage = 'pledge'; s.campaign.completed = s.campaign.completed.filter(x => !['pledge', 'prepare'].includes(x)); return 'redirect'; } fact(s, 'guardianResolution', id); settleEnding(s, s.campaign.facts.plannedEnding, c); } },
  { id: 'aftermath', act: 5, title: 'The morning belongs to the living', locationId: 'home', objective: 'Return to the places and people your decisions changed.', body: s => `${s.campaign.ending?.summary} ${place(s, 'home')?.status === 'destroyed' ? 'Your birthplace is still visitable, but its burned hearths cannot offer ordinary services.' : 'Your home carries the marks of the last night.'} ${pname(s, 'kin')} asks what you want your next ordinary year to contain.`, choices: [C('rebuild', 'Help survivors rebuild a life, without erasing what was lost', 'Continue civilian life with reconstruction scenes and remembered losses.'), C('people', 'Make room for the people who stayed beside you', 'Continue life with family and relationship followups.'), C('record', 'Preserve the true account for future generations', 'Continue life with a public chronicle and institutional consequences.')], apply(s, id, c) { fact(s, 'afterwardPriority', id); if (id === 'people') bond(s, 'kin', 8, 'After the covenant, you made time for the people who stayed.'); if (id === 'record') c.standing('academy', 4); } },
];

const SIDES = [
  { id: 'ferry', title: 'The ferry and the shrine bell', locationId: 'coast', act: 2, body: () => 'The ferryman can repair the barges or recover a sunken shrine bell first. Both matter, but the work cannot happen at once. Will you help transport, remembrance, or organizing a second crew?', choices: [C('repair', 'Repair the ferries with the crew', 'Working transport can carry households away from a future catastrophe.'), C('bell', 'Recover the bell and its remembered oath', 'The original consent wording becomes a public symbol.'), C('both', 'Find a second crew so neither task is abandoned', 'Build a community partnership; both projects can return later.')], apply(s, id) { fact(s, 'ferryReady', id !== 'bell'); fact(s, 'bellRecovered', id !== 'repair'); } },
  { id: 'carpenter', title: 'A carpenter without a workshop', locationId: 'camp', act: 3, body: () => 'A refugee carpenter offers skilled labor, but needs somewhere to sleep and a place for tools. They ask for a fair exchange, rather than charity that leaves them voiceless.', choices: [C('fair', 'Arrange fair work and a place for the tools', 'The carpenter becomes an ally for reinforcement and reconstruction.'), C('shelter', 'Provide shelter while they choose their next work', 'Gain an ally and preserve their independence.'), C('exploit', 'Demand unpaid emergency labor in exchange for shelter', 'Get immediate repairs; lose a future ally and damage local trust.')], apply(s, id, c) { fact(s, 'carpenterAlly', id !== 'exploit'); if (id === 'exploit') { fact(s, 'wardReady'); c.standing('villagers', -6); } else c.standing('villagers', 4); } },
  { id: 'rival', title: 'Two names on the research', locationId: 'city', act: 2, body: s => `${pname(s, 'rival')} reconstructed part of the conduit map with you. A patron offers to publish it under your name alone. Your rival asks whether the shared work will remain shared.`, choices: [C('credit', 'Insist on credit for both researchers', 'Your rival will stand beside the research at the council.'), C('public', 'Release the map with both names to the reading room', 'Communities gain practical knowledge and your rival trusts you.'), C('patron', 'Accept the patron’s account for better access', 'Gain access but lose your rival’s personal support.')], apply(s, id) { fact(s, 'rivalAlly', id !== 'patron'&&!!livingStoryPerson(s,'rival')); bond(s, 'rival', id === 'patron' ? -15 : 12, id === 'patron' ? 'You accepted sole credit for our shared covenant research.' : 'You kept both our names on the covenant research.'); } },
  { id: 'ward', title: 'The unpaid ward-maker', locationId: 'tower', act: 3, body: () => 'The ward-maker says the city owes them for a year of careful work. They can donate an emergency ward, but want someone to put their unpaid claim on the council record.', choices: [C('record', 'Document the debt and argue for fair payment', 'Gain an emergency ward through an honest agreement.'), C('mutual', 'Organize a mutual-aid repair instead', 'Gain ward preparation without treating their labor as free.'), C('demand', 'Demand the ward as their duty to the city', 'Lose the ward-maker’s cooperation.')], apply(s, id) { fact(s, 'wardReady', id !== 'demand'); fact(s, 'wardClaim', id === 'record'); } },
  { id: 'grove', title: 'The gardener’s boundary', locationId: 'forest', act: 2, body: () => 'The gardener asks you to mark a boundary around the grove’s living roots. A shortcut would spare travelers a day, but cross the places where the forest keeps ancestral names.', choices: [C('protect', 'Protect the boundary and mark a respectful route', 'Preserve the living bypass and a gardener’s future aid.'), C('shared', 'Survey the boundary together with affected families', 'Gain a shared route and community confidence.'), C('shortcut', 'Clear the shortcut despite the objection', 'Gain immediate access while damaging the forest’s trust and living route.')], apply(s, id, c) { fact(s, 'groveProtected', id !== 'shortcut'); if (id === 'shortcut') { fact(s, 'groveDamaged'); changePlace(s, 'forest', 'scarred', 'A shortcut through remembered roots', 'The shortcut cut through the memory grove. Its living route requires restoration.', c); } } },
  { id: 'hearth', title: 'A house with two doors', locationId: 'home', act: 3, body: s => `${s.life?.partnerId ? pname(s, s.life.partnerId) : pname(s, 'kin')} asks what opening your home to strangers would mean for the people already living there. Refuge is important; so are clear household boundaries.`, choices: [C('agree', 'Make a household agreement before opening the door', 'Gain refuge volunteers and a shared memory of consent.'), C('communal', 'Help establish communal shelter instead', 'Gain refuge volunteers while preserving household privacy.'), C('command', 'Announce the decision without consulting anyone', 'Gain shelter space, but damage the household’s trust.')], apply(s, id) { fact(s, 'refugeVolunteers'); const p = s.life?.partnerId || 'kin'; bond(s, p, id === 'command' ? -12 : 8, id === 'command' ? 'You opened our household to guests without discussing it with me.' : 'You discussed our household’s boundaries while helping refugees.'); } },
  { id: 'receipt', title: 'A witness kept the receipt', locationId: 'city', act: 2, body: () => 'A delivery clerk holds a signed receipt naming people who moved remains to the anchor. They will testify if their family’s safety is taken seriously.', choices: [C('protect', 'Arrange protection and let them decide how to testify', 'Gain a protected witness and documentary evidence.'), C('copy', 'Ask permission to copy the receipt anonymously', 'Gain the evidence without exposing a reluctant person.'), C('threaten', 'Threaten them into a public appearance', 'Create local evidence against yourself and lose a willing witness.')], apply(s, id, c) { fact(s, 'transportProof'); if (id === 'protect') fact(s, 'protectedWitness'); if (id === 'threaten') { c.addEvidence(2, 'The transport clerk reports your threat.'); c.breakOath('You threatened a witness to the covenant transports.'); } } },
  { id: 'watchtower', title: 'The abandoned signal watch', locationId: 'tower', act: 2, dungeon: 'watchtower', description: 'An old signal watch could warn distant households before the wards fail.' },
  { id: 'teacher', title: 'The teacher’s missing passage', locationId: 'sanctuary', act: 2, body: () => 'Your old teacher admits removing the withdrawal passage from a school copy. They feared that revealing it would bring down the wards before anyone could prepare another way.', choices: [C('account', 'Ask them to restore the passage and explain the omission', 'Gain an accountable teacher and public consent terms.'), C('private', 'Accept a private correction while preparing a transition', 'Gain the original text without instant disclosure.'), C('reject', 'Refuse their guidance but preserve the evidence', 'Keep every route open without forgiving the concealment.')], apply(s, id) { fact(s, 'consentTerms'); fact(s, 'teacherAccount', id); } },
  { id: 'confidant', title: 'A friend at the evening table', locationId: 'home', act: 2, body: s => `${pname(s, 'fellow')} has heard rumors about marked children and forbidden power. They ask what you want them to understand about your own life. A private conversation is not a public announcement.`, choices: [C('fate', 'Share the childhood omen and the research it led you toward', 'This friend learns your fate clues and offers help.'), C('condition', 'Explain any supernatural condition honestly', 'This friend learns only the condition you actually have.'), C('boundary', 'Ask for privacy while keeping the friendship', 'Preserve secrecy and a valued friend.')], apply(s, id) { if (id === 'fate') { know(s, 'fellow', `fate-${s.campaign.fate}`); if(livingStoryPerson(s,'fellow'))fact(s, 'volunteeredHelp'); } if (id === 'condition' && s.hero.condition) know(s, 'fellow', s.hero.condition.type); bond(s, 'fellow', 6, 'You spoke honestly about what you wanted me to know.'); } },
];

// A stable ID in the event/decision schema preserves old three-choice scenes.
QUESTS.find(q=>q.id==='prepare').choices.push(C('professional','Contribute my practiced civilian trade','Use earned professional experience and actual supplies for one concrete preparation.'));

function current(s) { return QUESTS.find(q => q.id === s.campaign.stage); }
function availableLocation(s, id) {
  if (place(s, id)) return id;
  return ({ marsh: 'forest', coast: 'brook', camp: 'brook', sanctuary: 'ruin', tower: 'city', citadel: 'ruin' })[id] || id;
}

export function initializeCampaign(s, { migration = false } = {}) {
  if (s.campaign) return;
  const fate = ['ember', 'echo', 'thorn'][seededRoll(s.seed, 'birth-fate', 3)];
  const bridged = migration && !!s.flags.villageSaved;
  s.campaign = { fate, act: bridged ? 2 : 1, stage: bridged ? 'ledger' : 'well', facts: {}, decisions: [], completed: bridged ? ['well', 'patients', 'letter', 'return'] : [], ending: null, pending: null, sidequests: {}, ageClues: [], followups: [], lastFollowupAge: ageOf(s) };
  if (bridged) bridgeLegacy(s);
}

function bridgeLegacy(s) {
  const c = s.campaign;
  c.facts.legacyBridge = true;
  c.facts.contaminationKnown = true;
  c.facts.villageCaredFor = true;
  c.facts.remedyMethod = s.flags.remedyMethod || 'moonroot';
  c.facts.publicAccount = s.flags.publicNecromancy ? 'open' : 'quiet';
  if (s.flags.soulBound) c.facts.coercedTestimony = true;
  if (s.flags.researchReturned) c.facts.originalNotesReturned = true;
}

export function onCampaignAge(s, ctx) {
  initializeCampaign(s);
  const c = s.campaign, age = ageOf(s);
  if(c.ending?.id==='keeper' && c.facts.keeperActive && Number.isSafeInteger(c.facts.keeperReleaseDay) && s.day>c.facts.keeperReleaseDay) {
    fact(s,'keeperActive',false);ctx.finishObligation('living_keeper_review');
    changePlace(s,'city','scarred','A keeper’s limited term ended','The agreed keeper term ended without silent renewal. Ordinary public works and reduced voluntary wards now preserve the city.',ctx);
    journal(s,ctx,'Silence cannot renew a life','Your recorded keeper term ended. Missing a review never grants another year of your life; voluntary service can only renew through an explicit agreement.');
  }
  for (const [index, milestone] of [4, 10, 15].entries()) if (!inheritedResolution(s) && s.timeline?.mode === 'birth' && age >= milestone && !c.ageClues.includes(milestone)) {
    c.ageClues.push(milestone); fact(s, `clue${milestone}`);
    ctx.journal(`The ${FATES[c.fate].label} omen · age ${milestone}`, FATES[c.fate].clues[index], 'fate',receiptMeta(s));
  }
  if (s.timeline?.mode !== 'birth' && s.flags.villageSaved && !c.facts.legacyBridge && ['well', 'patients', 'letter', 'return'].includes(c.stage)) {
    bridgeLegacy(s);
    c.completed = [...new Set([...c.completed, 'well', 'patients', 'letter', 'return'])]; c.stage = 'ledger'; c.act = 2;
  }
  const pending = c.pending;
  if (pending?.dungeonId && c.facts[`dungeon_${pending.questId}`]) {
    c.pending = null;
    const q = QUESTS.find(q => q.id === pending.questId);
    if (q) {
      if (q.id === 'well') fact(s, 'contaminationKnown');
      if (q.id === 'ledger') fact(s, 'originalLedger');
      if (q.id === 'orchard') { fact(s, 'forestMemory'); fact(s, 'ancestralNames'); }
      if (q.id === 'descent') fact(s, 'anchorReached');
      complete(s, q.id, ctx);
    } else if (pending.questId === 'side_watchtower') {
      c.sidequests.watchtower = { status: 'completed', choice: 'explored', day: s.day };
      fact(s, 'signalReady'); fact(s, 'evacuationReady');
      ctx.journal('A watch that can warn the living', 'The recovered signal watch can carry a warning before the old wards fail.', 'quest',receiptMeta(s));
    }
  }
  if (c.ending && c.stage === 'complete' && age > c.lastFollowupAge) {
    c.lastFollowupAge = age;
    const id = `followup-${age}`;
    if (!c.followups.includes(id)) c.followups.push(id);
    c.followups = c.followups.slice(-30);
  }
}

function complete(s, id, ctx) {
  const c = s.campaign;
  if (c.completed.includes(id)) return;
  c.completed.push(id);
  const index = QUESTS.findIndex(q => q.id === id);
  c.stage = QUESTS[index + 1]?.id || 'complete';
  c.act = current(s)?.act || 5;
  ctx.journal(QUESTS[index].title, `Completed at age ${ageOf(s)}. ${current(s) ? `Next: ${current(s).objective}` : 'The campaign is finished; your life continues.'}`, 'quest',receiptMeta(s));
}

function action(s, id, label, description, locationId, days = 2) {
  const target = availableLocation(s, locationId);
  return { id, label, description, days, cost: 0, group: 'The Ashfall Covenant', ...(s.locationId !== target ? { disabledReason: `Travel to ${placeName(s, target)} first.` } : {}) };
}

export function campaignActions(s) {
  if (!s.campaign || s.event || s.battle || s.dungeon && !s.dungeon.complete || ageOf(s) < 16) return [];
  const c = s.campaign, q = current(s);
  if (c.facts.declined && !c.ending && !Object.values(s.questLog?.entries||{}).some(e=>e.status==='active')) return [{ id: 'quest_resume', label: 'Return to the covenant investigation', description: 'Pick up the inquiry where you left it. Fate does not require a particular profession.', days: 0, cost: 0, group: 'The Ashfall Covenant' }];
  const result = [];
  if (c.pending?.dungeonId && !s.dungeon) {
    const pendingQuest = QUESTS.find(q => q.id === c.pending.questId) || SIDES.find(q => `side_${q.id}` === c.pending.questId);
    if (pendingQuest) result.push(action(s, 'quest_resume_expedition', `Resume ${pendingQuest.title}`, 'Return with the same quest, cleared rooms, and already claimed supplies. Leaving or losing a fight does not complete an expedition.', pendingQuest.locationId, 0));
    return result;
  }
  if (q && !c.pending && !c.facts.declined) result.push(action(s, `quest_begin_${q.id}`, q.title, q.objective, q.locationId));
  if (s.obligations.some(o => o.id === 'covenant_notes' && !o.resolved)) result.push(action(s, 'quest_return_notes', 'Return the academy’s original notes', 'Keep your knowledge and copies while fulfilling the actual promise you made.', 'city', 1));
  if (c.ending?.id === 'keeper' && c.facts.keeperActive) result.push({ id: 'quest_keeper_review', label: 'Review or leave your living keeper term', description: `Your recorded term ends on day ${c.facts.keeperReleaseDay}. You may invoke its withdrawal clause now; another year requires a new explicit agreement.`, days: 0, cost: 0, group: 'The Ashfall Covenant' });
  if (!c.ending && !c.pending) for (const side of SIDES) if (c.act >= side.act && c.sidequests[side.id]?.status !== 'completed' && (questEntryStatus(s,'side_'+side.id)==='active'||s.locationId===availableLocation(s,side.locationId)) && !['paused','declined'].includes(questEntryStatus(s,'side_'+side.id))) result.push(action(s, `quest_side_${side.id}`, side.title, side.description || 'A personal problem can become part of the region’s future.', side.locationId));
  if (c.stage === 'complete' && c.followups.length) result.push({ id: 'quest_followup', label: 'Live with the covenant’s aftermath', description: inheritedResolution(s) ? 'A new ordinary year brings the people and places changed by your family’s earlier generation into your own life.' : 'A new ordinary year brings the people and places you changed back into your life.', days: 0, cost: 0, group: 'The Ashfall Covenant' });
  if(c.stage==='complete' && professionalPlan(s)) {
    const p=professionalPlan(s),token=`${s.dynasty?.generation || 1}:${ageOf(s)}`;
    result.push({id:'quest_civic_work',label:`Put my ${s.hero.profession.toLowerCase()} trade to work for the changed community`,description:`Seven actual days, 12 gold, and ${materialText(p.materials)} provide ${p.work}. Record a named public contribution and seven unpaid professional work days. This maintains surviving infrastructure; destroyed towns and closed services remain lost. Once per lived year.`,days:7,cost:12,group:'The Ashfall Covenant',...(c.facts.publicWorkLastYear===token?{disabledReason:'Your public contribution for this lived year is already recorded.'}:!isSettlement(s.world,s.locationId)?{disabledReason:'Work with neighbors in a surviving settlement.'}:s.hero.gold<12?{disabledReason:'Requires 12 gold for the agreed public supplies.'}:!hasMaterials(s,p.materials)?{disabledReason:`Requires ${materialText(p.materials)} actual supplies.`}:{})});
  }
  if(c.ending && ['destroyed','evacuated'].includes(place(s,s.locationId)?.status)) {
    const token=`${s.dynasty?.generation || 1}:${ageOf(s)}`;
    result.push({id:'quest_memorial',label:'Visit what this place lost',description:'Spend one real day reading the surviving accounts and naming what can be established. Preserve a personal visit without reopening closed services or inventing deaths. Once per lived year at this place.',days:1,cost:0,group:'The Ashfall Covenant',...(c.facts[`memorial-${s.locationId}`]===token?{disabledReason:'Your visit here for this lived year is already remembered.'}:{})});
  }
  return result;
}

function openQuest(s, q, ctx, side = false) {
  recordQuestStart(s,side?'side_'+q.id:q.id);
  if (q.dungeon) {
    const questId = side ? `side_${q.id}` : q.id;
    s.campaign.pending = { questId, dungeonId: q.dungeon };
    ctx.startDungeon(q.dungeon, questId);
    journal(s, ctx, q.title, q.objective || q.description);
  } else {
    s.campaign.pending = { questId: q.id, side };
    const scene=religiousQuestScene(s,q,preparationChoices(s,q)),choices=scene.choices;
    const p=q.id==='prepare'?professionalPlan(s):null;
    const professional=p?` Your practiced ${s.hero.profession.toLowerCase()} trade offers another route if you bring ${materialText(p.materials)}; it prepares ${p.fact==='wardsReady'?'reinforced homes':p.fact==='evacuationReady'?'safe evacuation':p.fact==='refugeReady'?'a supplied refuge':'a public coalition'}.`:'';
    const source=q.id==='prepare' && s.lore?.records?.length?` You bring your recorded account of “${s.lore.records.at(-1).title}” to the discussion; its source remains named.`:'';
    ctx.setEvent(`quest_${side ? 'side_' : ''}${q.id}`, scene.title, side ? 'A returning life story' : `The Ashfall Covenant · Act ${q.act}`, `${scene.body}${professional}${source}`, choices);
  }
}

export function applyCampaignAction(s, id, ctx) {
  if (!id.startsWith('quest_') || ageOf(s) < 16) return false;
  initializeCampaign(s);
  if (id === 'quest_resume_expedition' && s.campaign.pending?.dungeonId && !s.dungeon) {
    ctx.startDungeon(s.campaign.pending.dungeonId, s.campaign.pending.questId);
    return true;
  }
  if (id === 'quest_return_notes' && s.locationId === 'city' && s.obligations.some(o => o.id === 'covenant_notes' && !o.resolved)) {
    ctx.finishObligation('covenant_notes'); fact(s, 'originalNotesReturned'); ctx.standing('academy', 4);
    journal(s, ctx, 'Knowledge does not require a stolen original', 'You returned the academy’s original notes, kept your copies and understanding, and fulfilled your promise.'); return true;
  }
  if (id === 'quest_keeper_review' && s.campaign.ending?.id === 'keeper' && s.campaign.facts.keeperActive) {
    ctx.setEvent('quest_keeper_review', 'A service that can be freely ended', 'The living keeper’s term', `Your recorded term ends on day ${s.campaign.facts.keeperReleaseDay}. Its withdrawal clause is real: you can return to ordinary life now, or choose a new year with the witnesses recording your consent. Silence cannot renew the term.`, [C('renew', 'Freely agree to a new one-year term from today', 'Finish the existing term and establish a new review date through an explicit agreement.'), C('leave', 'Invoke withdrawal and return to ordinary life', 'End your service; reduce the wards through the safeguarded withdrawal you prepared.')]);
    return true;
  }
  if (id === 'quest_resume') { recordQuestStart(s,'main'); fact(s, 'declined', false); journal(s, ctx, 'An inquiry freely resumed', 'You returned to the covenant investigation through your own choice.'); return true; }
  if(id==='quest_memorial' && s.campaign.ending && ['destroyed','evacuated'].includes(place(s,s.locationId)?.status)) {
    const token=`${s.dynasty?.generation || 1}:${ageOf(s)}`,key=`memorial-${s.locationId}`;
    if(s.campaign.facts[key]===token)return false;fact(s,key,token);
    const site=place(s,s.locationId),loss=currentLossCause(s,s.locationId);
    const knownLoss=site.status==='evacuated'?'Its households left; this does not establish that they died.':'Buildings were destroyed; surviving accounts distinguish confirmed safety, death, and people whose fate remains unresolved.';
    const origin=loss?.source==='war'||/^War leaves /.test(loss?.text||'')?'You returned to a place destroyed in a recorded war.':loss?.source==='covenant'||loss?.id?.startsWith('covenant-')?inheritedResolution(s)?'You came to a place changed in your family’s earlier generation.':'You returned to a place changed by the covenant.':'You returned to a lost place whose cause is not recorded.';
    journal(s,ctx,`A personal visit to ${site.name}`,`${origin} ${knownLoss} ${loss?.text || site.description} You kept the actual account beside the name and left its closed services unchanged.`);
    s.hero.skills.scholarship=Math.min(10000,s.hero.skills.scholarship+1);return true;
  }
  if(id==='quest_civic_work' && s.campaign.stage==='complete') {
    const p=professionalPlan(s),token=`${s.dynasty?.generation || 1}:${ageOf(s)}`;
    if(!p || s.campaign.facts.publicWorkLastYear===token || !isSettlement(s.world,s.locationId) || !hasMaterials(s,p.materials))return false;
    consumeMaterials(s,p.materials);fact(s,'publicWorkLastYear',token);fact(s,'publicWorkCount',(s.campaign.facts.publicWorkCount || 0)+1);
    recordCareerWork(s,{days:7,source:'civic',paid:false},ctx);
    const title=`A ${s.hero.profession.toLowerCase()} contribution after the covenant`,text=`${s.hero.name} worked seven actual days with neighbors in ${placeName(s,s.locationId)}, providing ${p.work}. The agreed work used 12 gold and ${materialText(p.materials)}. The record names the maker and the community; neither old losses nor another person’s consent are erased.`;
    s.world.changes ||= [];s.world.changes.push({id:`civic-${s.dynasty?.generation || 1}-${ageOf(s)}-${s.locationId}`,day:s.day,locationId:s.locationId,title,text});
    ctx.standing('villagers',5);journal(s,ctx,title,text);return true;
  }
  if (id === 'quest_followup' && s.campaign.followups.length) {
    const ending = s.campaign.ending;
    const ruined = s.world.locations.filter(p => p.status === 'destroyed').map(p => p.name).join(', ');
    const bodies = { renew: 'The council must renew the first willing terms. A participant asks to leave, exactly as the compact promised.', release: 'The first winter without covenant heat arrives. Neighbors have practical repairs to make and traditions to keep alive.', keeper: 'Your service review comes due. The witnesses ask whether the term still has your freely given agreement.', dominion: 'A family asks where their ancestor has gone. Officials call the inquiry disruptive; the family calls it love.', shatter: `Survivors return to ${ruined || 'the scarred anchor'} with timber and a list of names that must be remembered.`, haven: 'A child born in the haven asks why the old settlement appears on maps when so few people live there now.' };
    if(inheritedResolution(s)) {
      bodies.renew='The willing compact inherited by your community needs another public review. A participant asks to leave under its recorded rights; your family’s earlier choice now belongs to the people who live with it.';
      bodies.release='The community lives without covenant heat after your family’s earlier generation helped release the bound. Neighbors maintain ordinary furnaces and waterworks; this season brings another repair and a remembered account.';
      bodies.keeper='A keeper in your family’s history chose a limited term of service. The witnesses remember their right to leave; that agreement has not been transferred to you. Neighbors ask how to preserve the ordinary repairs and voluntary protection your family left behind.';
      bodies.dominion='Your family’s earlier generation left the Iron Covenant in place. A household now asks what happened to its ancestor. Their question concerns the power your world inherited, without making that earlier decision yours.';
      bodies.shatter=`The Broken Anchor remains part of your family’s history. Neighbors return to ${ruined || 'the scarred anchor'} with useful tools and names to remember. The surviving settlement records distinguish what your family witnessed from what you have lived yourself.`;
      bodies.haven='The haven established in your family’s earlier generation has become an ordinary home. A younger neighbor asks why an old settlement remains on the map. You can hear its survivors and decide what your own life will add to the account.';
    }
    const followupId=s.campaign.followups[0],year=Number(followupId.slice(9)),scenes=AFTERMATH_SCENES[ending.id];
    const index=(seededRoll(s.seed,`aftermath-start:${ending.id}:${s.dynasty?.generation || 1}`,scenes.length)+year)%scenes.length;
    const [title,scene]=scenes[index];
    const household=s.life.children?.filter(c=>c.alive!==false).length?` Your children live in this changed region; its next public account will become part of their inheritance.`:s.life.partnerId?` ${pname(s,s.life.partnerId)} shares a household with you, while keeping their own account of this world.`:'';
    const plan=professionalPlan(s),trade=plan?` Your practiced ${s.hero.profession.toLowerCase()} trade could contribute ${plan.work}; a funded seven-day public project is available separately.`:'';
    s.campaign.pending = { contentVersion:25,followupId, sceneIndex:index };
    ctx.setEvent('quest_followup', title, 'The covenant remembered', `${bodies[ending.id]} ${scene} ${storyContext(s)}${household}${trade}`, [C('help', 'Offer practical help within an honest agreement', 'Improve local trust and preserve what you offered. Funded repairs and their real time are a separate public-work activity.'), C('listen', 'Hear the people whose experience differs from yours', 'Strengthen an actual living relationship without rewriting the past.'), C('record', 'Record the disagreement and name its sources', 'Preserve this specific public account and gain scholarship.')]);
    return true;
  }
  if (id.startsWith('quest_begin_')) {
    const q = current(s);
    if (!q || id !== `quest_begin_${q.id}` || s.campaign.pending || s.campaign.facts.declined) return false;
    if (s.locationId !== availableLocation(s, q.locationId)) return false;
    openQuest(s, q, ctx); return true;
  }
  if (id.startsWith('quest_side_')) {
    const side = SIDES.find(q => q.id === id.slice(11));
    if (!side || s.campaign.act < side.act || s.campaign.sidequests[side.id]?.status === 'completed' || s.campaign.pending || s.locationId !== availableLocation(s, side.locationId)) return false;
    openQuest(s, side, ctx, true); return true;
  }
  return false;
}

export function applyCampaignChoice(s, eventId, choiceId, ctx) {
  const allowed = campaignEventIds()[eventId];
  if (!allowed?.includes(choiceId)) return false;
  if (eventId === 'quest_keeper_review') {
    if (s.campaign.ending?.id !== 'keeper' || !s.campaign.facts.keeperActive) return false;
    ctx.finishObligation('living_keeper_review');
    fact(s, 'keeperActive', choiceId === 'renew');
    if (choiceId === 'renew') { fact(s, 'keeperReleaseDay', s.day + 365); ctx.addObligation('living_keeper_review', 'Review your freely agreed keeper term', 365, 'A willing keeper may end this term through its recorded withdrawal clause.'); }
    else changePlace(s, 'city', 'scarred', 'A keeper freely returned', 'The living keeper completed their term and left through the recorded withdrawal clause. Reduced wards and ordinary public works preserve the city.', ctx);
    journal(s, ctx, 'Consent is an ongoing choice', choiceId === 'renew' ? 'You freely agreed to another limited year of service.' : 'You ended your keeper service and returned to ordinary life.'); return true;
  }
  if (eventId === 'quest_decline') { if(s.questLog)s.questLog.main=choiceId==='civilian'?'paused':'active'; fact(s, 'declined', choiceId === 'civilian'); journal(s, ctx, 'A choice about fate', choiceId === 'civilian' ? 'You chose to put the investigation aside. Your ordinary life remains yours.' : 'You chose to continue the inquiry freely.'); return true; }
  if (eventId === 'quest_followup') {
    if (!s.campaign.pending?.followupId || !s.campaign.ending) return false;
    const id = s.campaign.pending.followupId,sceneIndex=s.campaign.pending.sceneIndex,material=s.campaign.pending.contentVersion===25;
    if(material){const who=s.life.people.find(p=>p.alive!==false)||s.companions.find(p=>p.alive!==false),site=s.realm?.sites[s.locationId];s.campaign.aftermathAccounts||=[];s.campaign.aftermathAccounts.push({id,endingId:s.campaign.ending.id,day:s.day,locationId:s.locationId,participantId:who?.id||'document',participantName:who?.name||'The recorded household',resolution:choiceId});s.campaign.aftermathAccounts=s.campaign.aftermathAccounts.slice(-18);if(site){site.aftermathPolicy=s.campaign.ending.id==='dominion'&&choiceId!=='help'?'controlled':choiceId==='help'?'shared':'recorded';site.aftermathWitness=who?.name||'The recorded household';site.security=Math.max(0,Math.min(100,site.security+(choiceId==='help'?3:0)));}}
    s.campaign.followups = s.campaign.followups.filter(x => x !== id); s.campaign.pending = null;
    if (choiceId === 'help') ctx.standing('villagers', 4);
    if (choiceId === 'listen') { const contact=s.life.people.find(p=>p.id==='kin' && p.alive!==false) || s.life.people.find(p=>p.id===s.life.partnerId && p.alive!==false) || s.life.people.find(p=>p.alive!==false);if(contact)bond(s,contact.id,6,`In the year you turned ${ageOf(s)}, you listened to my account of the covenant’s aftermath.`); }
    if (choiceId === 'record') s.hero.skills.scholarship++;
    const scenes=AFTERMATH_SCENES[s.campaign.ending.id],year=Number(id.slice(9));
    const index=Number.isInteger(sceneIndex)?sceneIndex:(seededRoll(s.seed,`aftermath-start:${s.campaign.ending.id}:${s.dynasty?.generation || 1}`,scenes.length)+year)%scenes.length;
    const [title,scene]=scenes[index];fact(s,'lastAftermathTopic',title);
    journal(s, ctx, title, `${scene} You chose to ${choiceId === 'help' ? 'offer practical help through an honest agreement' : choiceId === 'listen' ? 'listen to another living person’s account' : 'preserve an honest record with its sources named'} after ${s.campaign.ending.title}.`);
    return true;
  }
  const side = eventId.startsWith('quest_side_');
  const id = eventId.slice(side ? 11 : 6);
  const q = (side ? SIDES : QUESTS).find(q => q.id === id);
  const pending = s.campaign.pending;
  if (!q || !pending || pending.questId !== id || !!pending.side !== side || !q.choices) return false;
  if (!side && s.campaign.stage !== id) return false;
  if (id === 'pledge' && choiceId === 'keeper' && ageOf(s) < 18) return false;
  let result;
  if(id==='prepare' && choiceId==='professional') {
    const p=professionalPlan(s);if(!p || !hasMaterials(s,p.materials))return false;
    consumeMaterials(s,p.materials);fact(s,'preparation','professional');fact(s,'professionalPreparation',s.hero.profession);
    fact(s,'wardsReady',p.fact==='wardsReady' || !!s.campaign.facts.carpenterAlly || !!s.campaign.facts.wardReady);
    fact(s,'evacuationReady',p.fact==='evacuationReady' || !!s.campaign.facts.ferryReady);
    fact(s,'refugeReady',p.fact==='refugeReady' || !!s.campaign.facts.refugeReady || !!s.campaign.facts.refugeVolunteers);
    if(p.fact==='councilCoalition')fact(s,'councilCoalition');
    journal(s,ctx,'An ordinary livelihood carries extraordinary weight',`Your recorded ${s.hero.profession.toLowerCase()} experience provided ${p.work}. The preparation consumed ${materialText(p.materials)} and did not grant the other preparations without their actual allies.`);
  } else {
    if(id==='return'&&choiceId==='mira'&&!livingStoryPerson(s,'mira'))fact(s,'returnPrivateRecipient','sealed_account');
    if(id==='inquiry'&&!livingStoryPerson(s,'mira'))fact(s,'inquiryRecipient','lantern_inquiry');
    if(id==='ferryman'&&!livingStoryPerson(s,'kest'))fact(s,'transportWitnessType','recorded_statement');
    const livingContext={...ctx,remember:(personId,...args)=>{if(livingStoryPerson(s,personId))ctx.remember(personId,...args);},witnesses:()=>ctx.witnesses().filter(p=>p.alive!==false)};
    result = q.apply(s, choiceId, livingContext);
  }
  s.campaign.decisions.push({ questId: side ? `side_${id}` : id, choiceId, day: s.day });
  s.campaign.decisions = s.campaign.decisions.slice(-150);
  s.campaign.pending = result === 'pending' ? s.campaign.pending : null;
  if (side) {
    s.campaign.sidequests[id] = { status: 'completed', choice: choiceId, day: s.day };
    const scene=religiousQuestScene(s,q);
    journal(s, ctx, scene.title, `${scene.choices.find(c => c.id === choiceId).label}. This choice can return in the region’s future.`);
  } else if (!['pending', 'redirect'].includes(result)) complete(s, id, ctx);
  return true;
}

export function afterCampaignBattle(s, context, outcome, ctx) {
  if (context?.kind !== 'campaign' || context.questId !== 'final') return;
  const pending = s.campaign?.pending;
  if (!pending || pending.questId !== 'final' || pending.stage !== 'final') return;
  s.campaign.pending = null;
  if (outcome === 'victory') {
    fact(s, 'guardianResolution', 'battle');
    settleEnding(s, pending.route, ctx);
    complete(s, 'final', ctx);
  } else journal(s, ctx, 'The last night is not decided yet', 'You withdrew or lost the confrontation. Recovery and another approach remain possible; no ending was granted.');
}

function displace(s, id, ctx) {
  const target = place(s, 'camp') ? 'camp' : place(s, 'brook')?.status !== 'destroyed' ? 'brook' : 'forest';
  for (const p of s.life?.people || []) if (p.locationId === id || p.id === 'kin' && id === birthplace(s)) {
    p.locationId = target;
    if (!p.memories.includes(`Our household was displaced from ${placeName(s, id)}.`)) p.memories.push(`Our household was displaced from ${placeName(s, id)}.`);
  }
  if (id === birthplace(s)) {
    fact(s, 'householdDisplaced');
    fact(s, 'householdRefuge', target);
  }
  // A birthplace is a family connection, not the address of every later home.
  // Older unaddressed homes retain the original birthplace rule explicitly.
  const home = s.life?.home;
  if (home && (home.locationId ?? birthplace(s)) === id) {
    home.tier = 'lodgings';
    home.locationId = target;
    fact(s, 'householdDisplaced');
    fact(s, 'householdRefuge', target);
    ctx.journal('The address of a lost home', `Your recorded home in ${placeName(s, id)} can no longer shelter the household. Temporary lodgings are recorded in ${placeName(s, target)}; a property at another address would remain yours.`, 'world',{...receiptMeta(s),eventId:'home_displaced',locationId:id,destinationId:target});
  }
  ctx.journal('People need another address', `Displaced households from ${placeName(s, id)} gather at ${placeName(s, target)}. The lost place remains on the map.`, 'world',{...receiptMeta(s),eventId:'households_displaced',locationId:id,destinationId:target});
}

function changePlace(s, id, status, title, text, ctx) {
  const p = place(s, id);
  if (!p) return;
  if (p.status === 'destroyed' || p.status==='evacuated'&&status==='evacuated') return;
  s.world.changes ||= [];
  const changeId = `covenant-${id}-${status}-${title}`;
  if (s.world.changes.some(c => c.id === changeId)) return;
  p.status = status;
  p.servicesAvailable = !['destroyed', 'evacuated'].includes(status);
  if (!p.servicesAvailable) p.services = [];
  p.description = `${p.description} ${text}`;
  s.world.changes.push({ id: changeId, day: s.day, locationId: id, title, text,source:'covenant',lossStatus:status });
  s.world.changes=s.world.changes.slice(-500);
  ctx.journal(title, `${placeName(s, id)}: ${text}`, 'world',receiptMeta(s));
}

function settleEnding(s, route, ctx) {
  if (s.campaign.ending || !ENDINGS[route]) return;
  const earlierLosses=lossesBeforeEnding(s);
  const f = s.campaign.facts;
  if (route === 'renew') { fact(s, 'withdrawalRights'); fact(s, 'publicConsent');fact(s,'compactRepresentation',f.councilCoalition?'delegated':'institutions');ctx.standing('villagers', f.councilCoalition?12:6);ctx.standing('order',f.councilCoalition?6:3); }
  if (route === 'release') {
    fact(s, 'ancestorsReleased'); fact(s, 'covenantHeatEnded');
    changePlace(s, 'city', 'scarred', 'The city without borrowed warmth', 'The covenant wards fell quiet. Ordinary furnaces, waterworks, and willing neighbors now carry their work.', ctx);
    if (!f.wardsReady) changePlace(s, 'home', 'scarred', 'A difficult first winter', 'Unprepared hearths endured a hard winter after the magical warmth ended. The village remains inhabited.', ctx);
  }
  if (route === 'keeper') { fact(s, 'livingKeeper', s.hero.name); fact(s, 'keeperActive'); fact(s, 'keeperReleaseDay', s.day + 365); ctx.addObligation('living_keeper_review', 'Review your freely agreed keeper term', 365, 'Your living service ends or renews only through informed agreement.'); }
  if (route === 'dominion') { fact(s, 'compulsoryCovenant'); ctx.breakOath('You preserved the covenant through compulsory soul binding.'); ctx.standing('academy', 15); ctx.standing('villagers', -12); for (const p of ctx.witnesses()) ctx.remember(p.id, 'You chose compulsory power for the final covenant.', -25); }
  if (route === 'shatter') {
    fact(s, 'ancestorsReleased'); fact(s, 'anchorDestroyed');
    changePlace(s, 'citadel', 'destroyed', 'The anchor became a crater', 'The covenant mechanism and its citadel were permanently destroyed. The voices it held are free.', ctx);
    displace(s,'citadel',ctx);
    if (f.wardsReady) changePlace(s, 'home', 'scarred', 'Homes behind prepared walls', 'Reinforcement saved the village buildings from the rupture. The surrounding land remains scarred.', ctx);
    else { changePlace(s, 'home', 'destroyed', 'The hearths that could not hold', f.evacuationReady || f.refugeReady ? 'Households reached safety before the rupture destroyed their homes.' : 'The rupture destroyed homes before every household could leave. Survivors remember the people still missing.', ctx); fact(s, 'missingHouseholds', !f.evacuationReady && !f.refugeReady); displace(s, 'home', ctx); }
    changePlace(s, 'city', 'scarred', 'A city after the rupture', 'The city survived with damaged wards and an urgent need for ordinary repairs.', ctx);
  }
  if (route === 'haven') {
    fact(s,'havenPrepared',!!f.refugeReady);fact(s, 'organizedWithdrawal'); fact(s, 'refugeReady');
    changePlace(s, 'home', 'evacuated', 'An old home left behind', 'Households withdrew together. The old settlement remains visitable, but ordinary services closed when its people left.', ctx);
    changePlace(s, 'camp', f.havenPrepared?'thriving':'scarred', 'The Haven beyond the ash', f.havenPrepared?'A permanent settlement grows around shared kitchens, careful waterworks, and people who chose a new life together.':'Households reached a new home without enough prepared lodgings or stores. The refuge survives, but neighbors carry the shortage into the first hard season.', ctx);
    displace(s, 'home', ctx);
  }
  const losses=endingLosses(s,earlierLosses);
  const representation=route==='renew'?f.councilCoalition?' A representative coalition helped establish the compact; its public legitimacy still needs ongoing care.':' Established institutions recorded the willing terms, while excluded households continue to ask for representation.':'';
  const summary = `${ENDINGS[route].summary}${representation}${endingLossSummary(losses)?' '+endingLossSummary(losses):''}`;
  s.campaign.ending = { id: route, title: ENDINGS[route].title, summary, day: s.day,losses };
  journal(s, ctx, ENDINGS[route].title, summary);
}

export function campaignView(s) {
  if (!s.campaign) return { title: 'The Ashfall Covenant', actLabel: 'An undiscovered story', summary: 'An ordinary life may lead toward an extraordinary mystery.', fateLabel: 'An unexplained omen', quests: [], ending: null };
  const c = s.campaign, q = current(s), adult = ageOf(s) >= 16, inherited=inheritedResolution(s);
  const quests = QUESTS.map(item => ({ id: item.id, title: item.title, status: c.completed.includes(item.id) ? 'completed' : c.stage === item.id && adult && !c.facts.declined ? (s.questLog?.main==='active'||c.completed.length||c.pending?'active':'offered') : 'locked', objective: item.objective, locationId: availableLocation(s, item.locationId), description: inherited ? `An earlier family generation recorded this stage of the covenant inquiry. ${item.objective}` : item.description || religiousQuestScene(s,item).body }));
  for (const side of SIDES) quests.push({ id: `side_${side.id}`, title: side.title, status: c.sidequests[side.id]?.status === 'completed' ? 'completed' : adult && c.act >= side.act && !c.ending && (s.locationId===availableLocation(s,side.locationId)||s.questLog?.entries['side_'+side.id]) ? questEntryStatus(s,'side_'+side.id) : 'locked', objective: side.description || 'A personal decision can return as practical help or a remembered conflict.', locationId: availableLocation(s, side.locationId), description: inherited ? `This personal inquiry belongs to the earlier generation’s covenant story. ${side.description || 'Its accounts remain part of the region’s history.'}` : side.description || religiousQuestScene(s,side).body });
  const summary = inherited ? `Your family’s earlier generation left ${c.ending?.title || 'a covenant resolution'} in the region’s history. ${c.ending?.summary || ''} Your own life can add new work, relationships, and choices among those lasting consequences.` : !adult ? 'Your birth omen is appearing in ordinary childhood moments. Investigation and regional adventures open at sixteen; your identity is still yours to earn.' : c.facts.declined ? 'You chose an ordinary life beyond the investigation. You can freely return to the inquiry where you left it.' : c.ending ? c.ending.summary : q?.objective || 'The campaign has ended. Ordinary life continues with what the world remembers.';
  return { title: s.narrativeEdition===30?'The Failing Wards':'The Ashfall Covenant', actLabel: ['','I · A remedy, and a deeper cause','II · The people who benefit','III · A region worth protecting','IV · The last bargain','V · The morning after'][c.act], summary, fateLabel: inherited ? 'A remembered family history' : c.ageClues.length || c.facts.allRoutesKnown ? FATES[c.fate].label : 'An unexplained birth omen', quests:s.narrativeEdition===30?quests.map(q=>({...q,...groundedQuest(s,q,{kind:q.id.startsWith('side_')?'side':'main'})})):quests, completedCount:c.completed.length, ending: s.narrativeEdition===30?endingProse(s,c.ending):c.ending };
}

export function campaignEventIds() {
  return Object.fromEntries([...QUESTS.filter(q => q.choices).map(q => [`quest_${q.id}`, q.choices.map(c => c.id)]), ...SIDES.filter(q => q.choices).map(q => [`quest_side_${q.id}`, q.choices.map(c => c.id)]), ['quest_decline', ['civilian', 'follow']], ['quest_followup', ['help', 'listen', 'record']], ['quest_keeper_review', ['renew', 'leave']]]);
}

export function validateCampaign(value, state) {
  try {
    const v = value, primitive = x => typeof x === 'boolean' || typeof x === 'string' && x.length <= 300 || Number.isSafeInteger(x) && x >= 0;
    const integer = x => Number.isSafeInteger(x) && x >= 0;
    if (!v || !Object.hasOwn(FATES, v.fate) || !Number.isInteger(v.act) || v.act < 1 || v.act > 5 || ![...QUESTS.map(q => q.id), 'complete'].includes(v.stage)) return false;
    if (!v.facts || Array.isArray(v.facts) || typeof v.facts !== 'object' || Object.keys(v.facts).length > 200 || !Object.entries(v.facts).every(([k, x]) => k.length <= 100 && primitive(x))) return false;
    if (!Array.isArray(v.completed) || new Set(v.completed).size !== v.completed.length || !v.completed.every(id => QUESTS.some(q => q.id === id))) return false;
    if (!Array.isArray(v.decisions) || v.decisions.length > 150 || !v.decisions.every(d => integer(d.day) && ((QUESTS.find(q => q.id === d.questId) || SIDES.find(q => `side_${q.id}` === d.questId))?.choices || []).some(c => c.id === d.choiceId))) return false;
    if (!v.sidequests || typeof v.sidequests !== 'object' || Array.isArray(v.sidequests) || !Object.entries(v.sidequests).every(([id, q]) => SIDES.some(s => s.id === id) && q.status === 'completed' && integer(q.day) && (q.choice === 'explored' || SIDES.find(s => s.id === id).choices?.some(c => c.id === q.choice)))) return false;
    if (!Array.isArray(v.ageClues) || new Set(v.ageClues).size !== v.ageClues.length || !v.ageClues.every(a => [4, 10, 15].includes(a))) return false;
    if (!Array.isArray(v.followups) || v.followups.length > 30 || !v.followups.every(f => /^followup-\d+$/.test(f)) || !integer(v.lastFollowupAge)) return false;
    if (v.ending !== null && (!Object.hasOwn(ENDINGS, v.ending.id) || v.ending.title !== ENDINGS[v.ending.id].title || typeof v.ending.summary !== 'string' || v.ending.summary.length > 3000 || !integer(v.ending.day) || state && v.ending.day > state.day)) return false;
    if(v.ending&&state&&!validateEndingLosses(v.ending.losses,state,v.ending.day))return false;
    if (v.pending !== null) {
      const p = v.pending;
      if (!p || typeof p !== 'object') return false;
      if (p.followupId) { if (!v.followups.includes(p.followupId) || !v.ending || p.sceneIndex!==undefined && (!Number.isInteger(p.sceneIndex)||p.sceneIndex<0||p.sceneIndex>2)) return false; }
      else if (p.dungeonId) { const q = p.questId === 'side_watchtower' ? SIDES.find(q => q.id === 'watchtower') : QUESTS.find(q => q.id === p.questId); if (!q || q.dungeon !== p.dungeonId) return false; }
      else if (p.stage === 'final') { if (p.questId !== 'final' || !ENDINGS[p.route]) return false; }
      else if (typeof p.side !== 'boolean' || !(p.side ? SIDES : QUESTS).some(q => q.id === p.questId && q.choices)) return false;
    }
    return true;
  } catch { return false; }
}
