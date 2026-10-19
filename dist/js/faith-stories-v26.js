import { FAITH_INQUIRIES } from './audit-content-v25.js';
import { FAITHS } from './realm-content-v18.js';
import { seededRoll, isSettlement } from './world.js';

// New requests keep their own premise, physical setting and signed evidence.
// A religious interpretation remains distinct from what the inquiry establishes.
const extra={
 lantern:[
  ['hearth','The refuge rota has empty night shifts, and the patron’s oil contract requires a seal at the door.','The patron calls exclusion the only way to keep the lamp burning; the rota also records volunteers who were never asked.','Publish the rota and open volunteer watch','Offer a paid watch with an explicit end','Sell admission control to the oil patron'],
  ['ruin','The old doorway bears fire scars beneath the pilgrim’s order mark. A later repair ledger names the surviving household.','The extinguished lantern is offered as an apology; it does not establish that the household has forgiven the burning.','Keep the household’s account and right to refuse','Arrange a limited visit on the household’s terms','Sell the pilgrim exclusive use of the old refuge'],
 ],
 ancestors:[
  ['hearth','Two household records disagree about the ancestral mask’s last custodian; neither records a transfer of ownership.','An empty hearth is said to speak through the mask. The copied accounts do not establish whose claim should prevail.','Keep both household accounts open','Arrange a limited witnessed copy for each household','Give one patron control of the disputed record'],
  ['crossing','The riverward register repeats a living child’s name on an older burial-door sketch. The dates belong to different generations.','The name is treated as a prophecy; the register also shows that names recur within families.','Publish the dates without assigning the child a fate','Keep a limited family copy with the dates intact','Sell a patron exclusive custody of the name record'],
 ],
 wilds:[
  ['grove','A return note and a seed wrapper lie beside the old path. The wrapper describes a graft; the note leaves the bearer’s destination uncertain.','A hunter is said to carry the last grove in a wound. The papers establish a possible living lead, not that a stranger is owned by the grove.','Share the lead without claiming the living bearer','Arrange a paid guide with a right to stop','Sell control of the living lead to a hunting patron'],
  ['grove','Old hinge holes lie beneath the roots around the trapped axe. A household threshold sketch predates the forest map.','The roots are said to punish the woodcutter; the older house also makes the boundary disputed.','Record the older doorway and shared access','Arrange a bounded paid clearing','Give one patron control of the buried threshold'],
 ],
 forge:[
  ['ruin','The old guard-route diagram repeats an empty threshold. The maker’s final tool bears an unfinished release mark.','The guardian is said to owe endless service; its original instructions also describe an end to the work.','Publish the completion mark and its limits','Offer a limited repair record with separate credit','Sell the old service claim to a war patron'],
  ['workshop','The blade commission asks for a faultless edge, while the smith’s margin lists who must repair each failed trial.','The patron promises an unbreakable blade; the trial ledger records labor and material failures instead of proof.','Publish the trials and both makers’ credit','Keep a bounded paid commission with failure terms','Sell the patron a monopoly over the makers’ trials'],
 ],
 moon:[
  ['hearth','The sanctuary’s window rubbings repeat the veil’s stitch mark. The transfer page contains no consent from its present wearer.','The veil is said to reveal a face in every window; a copied pattern cannot prove what every witness saw.','Keep the wearer’s refusal beside the transfer record','Arrange a limited private inspection by agreement','Sell a patron exclusive control of the veil account'],
  ['tower','The tower sketch has no stair, but an older winter-path ledger names a refuge route around its base.','Missing bells are said to call the family into the tower; the ledger supports checking the ordinary path first.','Share the winter path without compelling the family','Offer a priced guide with a stated safe-return limit','Reserve the family’s refuge path for a patron'],
 ],
 ash:[
  ['fortress','A burned crown sketch carries two ownership seals. The older refuge rota records free hearth hours before the conquest.','The claimant calls the coal inherited authority; the rota establishes earlier shelter, not permanent ownership of its people.','Preserve the earlier free-hearth record','Keep a limited paid copy of both seals','Sell a patron exclusive control of the refuge claim'],
  ['archive','The household’s dated ember drawings show different street plans. Their margins distinguish what was seen from what was guessed.','Something is said to watch through a lost city. The pages establish changing images, not a proven watcher or a child’s duty to obey it.','Share the dated drawings without assigning a child a duty','Keep a limited household copy with its uncertainty','Give a patron exclusive access to the household’s drawings'],
 ],
};
const domains={lantern:['crossing','hearth','ruin'],ancestors:['ruin','hearth','crossing'],wilds:['well','grove','grove'],forge:['workshop','ruin','workshop'],moon:['coast','hearth','tower'],ash:['ruin','fortress','archive']};
const context={crossing:'the recorded crossing and its local accounts',hearth:'the surviving hearth and household records',ruin:'the surviving records at the old foundations',grove:'the grove path and its boundary records',well:'the settlement well and its household accounts',workshop:'the actual workshop and its maker records',coast:'the tidal shore and its rescue records',tower:'the existing tower and its route records',fortress:'the fortress gate and its older public accounts',archive:'the existing archive and its dated copies'};
const available=p=>!['destroyed','evacuated'].includes(p.status)&&p.servicesAvailable!==false;
function fits(s,p,domain){
  const services=p.services||[];
  return domain==='crossing'?p.id==='brook'||p.type==='coast'||services.includes('ferry'):
    domain==='hearth'?isSettlement(s.world,p.id)&&services.includes('hearth'):
    domain==='ruin'?p.type==='ruin':domain==='grove'?p.type==='forest':
    domain==='well'?['home','brook','wells'].includes(p.id)||p.type==='village':
    domain==='workshop'?services.includes('smith'):domain==='coast'?p.type==='coast':
    domain==='tower'?p.type==='tower':domain==='fortress'?['citadel','gate'].includes(p.type):services.includes('archive')||services.includes('academy');
}
export function faithInquiryPlan(s,faithId,index,boardId=s.locationId){
  const faith=FAITHS.find(f=>f.id===faithId),base=FAITH_INQUIRIES[faithId];if(!faith||!base||!Number.isInteger(index)||index<0||index>=faith.questFlavor.length)return null;
  const domain=domains[faithId][index];let pool=s.world.locations.filter(p=>available(p)&&fits(s,p,domain));
  const away=pool.filter(p=>p.id!==boardId);if(away.length)pool=away;
  let archiveOnly=false;
  if(!pool.length){archiveOnly=true;pool=s.world.locations.filter(p=>available(p)&&fits(s,p,'archive'));if(!pool.length)pool=s.world.locations.filter(p=>available(p)&&isSettlement(s.world,p.id));}
  if(!pool.length)return null;
  const destination=pool[seededRoll(s.seed,`faith-setting:${faithId}:${index}:${boardId}`,pool.length)],more=index>0?extra[faithId][index-1]:null;
  const evidence={...base,...(more?{observation:more[1],claim:more[2],share:more[3],sell:more[4],suppress:more[5]}:{})};
  if(archiveOnly){evidence.observation=`A dated copied account describes the proposed ${domain}. No personal visit to that setting has been established. ${evidence.observation}`;evidence.claim+=' The local copy cannot establish a physical route to the place it describes.';}
  return {destination,evidence,requestText:faith.questFlavor[index],setting:archiveOnly?'archive':domain,archiveOnly,sceneContext:archiveOnly?'a surviving copied account; the proposed physical setting is not present on this map':context[domain]};
}
export function inquiryWitnessText(s,p){
  const current=s.realm?.sites[p.destinationId]?.keeper,place=s.world.locations.find(l=>l.id===p.destinationId);
  return current?.id===p.witnessId&&available(place||{})?`${p.witnessName} confirms the dated, limited account.`:`The signed account of ${p.witnessName} remains a source. The original witness is not present for a new conversation; no fresh testimony is claimed.`;
}
const privateRites={
 lantern:'Trim your own lamp and keep a quiet watch. The ritual asks whose name you would call if a stranger knocked after midnight.',
 ancestors:'Warm a cup at your own hearth and speak a remembered name. Silence may remain silence; this practice promises no summoned voice.',
 wilds:'Leave clean water at the roots and notice what has grown, eaten and been lost. You keep your chosen practice without claiming this shrine.',
 forge:'Heat a small blank, strike it, and leave its maker’s mark visible. Your own maker record supplies the ritual; no local priest is claimed.',
 moon:'Turn your own silver-rimmed bowl toward the sky. Speak a wish or keep it private; no keeper of another faith is made to conduct the rite.',
 ash:'Shelter a single coal beside your own brazier. Consider what you would warm or burn; the local institution keeps its own tradition.',
};
export function faithRitualText(s,faith){const local=s.realm?.sites[s.locationId],region=s.realm?.regions.find(r=>r.id===local?.regionId);return (local?.faithId||region?.faithId)===faith.id?faith.ritualDescription:privateRites[faith.id];}
