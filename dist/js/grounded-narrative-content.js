import { adultChildEventIds, adultChildChoiceOutcome, adultChildLifeView } from './adult-child-view.js';
import { preserveResearchEvent } from './research-scenes.js';
import { firstMissionSceneProvenance } from './faction-first-missions.js';
import { countingTableSceneProvenance } from './counting-table-job.js';
import { preserveOriginEvent } from './family-origins.js';
import { STORY_FLAVOR } from './story-flavor.js';
import { conversationFollowUp } from './conversation-followups.js';
import { societyCustomerContext } from './society.js';
// Narrative edition 30. Text only: this module never advances time, changes an
// offer, awards a reward, or invents a historical result. Stable mechanical IDs
// and the engine's captured terms remain authoritative.
const clean = value => typeof value === 'string' ? value.trim() : '';
const titleCase = value => clean(value).replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
const hash = value => { let n=2166136261; for (const c of String(value)) n=Math.imul(n^c.charCodeAt(0),16777619); return n>>>0; };
const choose = (s,key,rows) => rows[hash(`${s?.seed||'hearth'}:edition30:${key}`)%rows.length];
const list = s => [...(s?.life?.people||[]),...(s?.companions||[]),...(s?.society?.people||[]),...(s?.rpg?.contacts||[]),...(s?.life?.children||[])];
const person = (s,id) => list(s).find(p=>p.id===id);
const name = (s,id,fallback='someone you know') => clean(person(s,id)?.name)||fallback;
const place = (s,id=s?.locationId,fallback='the settlement') => clean(s?.world?.locations?.find(p=>p.id===id)?.name)||fallback;
const finite = n => typeof n==='number'&&Number.isFinite(n);
const presentKin = s => (s?.life?.people||[]).find(p=>p.alive!==false&&['parent','guardian'].includes(p.familyRole))||(s?.life?.people||[]).find(p=>p.alive!==false&&p.role==='relative');
const kinName = s => clean(presentKin(s)?.name)||'your caregiver';
const friendName = s => name(s,'fellow','your friend');
const rivalName = s => name(s,'rival','the other learner');
const workName = s => clean(s?.hero?.profession)&&s.hero.profession!=='Unemployed'?s.hero.profession.toLowerCase():'paid';
const contextKey = (s,e) => `${e.id}:${s?.age||0}:${s?.day||0}:${s?.locationId||''}`;
const sceneRow = (title,body,labels={}) => ({title,body,labels});
const expand = (text,s,extra={}) => String(text||'').replace(/\{([a-zA-Z]+)\}/g,(_,key)=>({here:place(s),kin:kinName(s),friend:friendName(s),rival:rivalName(s),mira:name(s,'mira','your companion'),orrin:name(s,'orrin','the researcher'),kest:name(s,'kest','your scout'),work:workName(s),...extra}[key]||'the person nearby'));

function mechanicalDescription(choice, fallback='') {
  const parts=[],days=choice.durationDays??choice.days,cost=choice.quotedCost??choice.cost,reward=choice.reward;
  if(finite(days))parts.push(days===0?'No time passes':`${days} ${days===1?'day':'days'}`);
  if(finite(cost))parts.push(cost===0?'No fee':`${cost} Gold fee`);
  if(finite(reward)&&reward>0)parts.push(`${reward} Gold on completion`);
  if(parts.length)return /standing|trust|reputation|oath|evidence|correspondence|hands-on|first attendance/i.test(choice.description||'')?clean(choice.description):parts.join(' · ')+'.';
  if(/existing rooms|donated reserves/i.test(choice.description||''))return clean(choice.description);
  // Old event descriptions often carry the only numerical quotation. Preserve
  // short mechanical sentences rather than replacing a real fee with a guess.
  const quotes=clean(choice.description).split(/(?<=[.!?])\s+/).filter(line=>/^(?:Spend|Pay|Contribute|Use|Requires?|Gain|Earn|Lose|Recover|Restore|Reduce|Take|No (?:time|gold|fee|reward|cost)|Keep \d|\d)/i.test(line)&&(/\d|No (?:time|gold|fee|reward|cost)/i.test(line))).slice(0,2);
  return quotes.length?quotes.join(' ').replace(/\bHP\b/g,'Health'):fallback||'Choose this action.';
}
function replaceChoices(s,choices,labels={},descriptions={}) {
  return (choices||[]).map(c=>({...c,...(labels[c.id]?{label:expand(labels[c.id],s)}:{}),description:mechanicalDescription(c,expand(descriptions[c.id]||'',s))}));
}

// These entries describe the same decisions as the mechanical event IDs. They
// avoid implying that opening a scene has already spent money or finished work.
const EVENTS = {
  childhood_1:sceneRow('A Rough Afternoon','Another child knocks a smaller pupil into the dust outside the lesson hall. The pupil is trying not to cry. You are close enough to help, find an adult, or go back to your family.',{defend:'Stand beside the smaller pupil',investigate:'Find out why the argument began',family:'Go and tell your family'}),
  childhood_2:sceneRow('Your Next Lessons','The teacher has a place for further study. A maker nearby is willing to teach practical work, and the watch trains older pupils in the yard. You can ask about the kind of training you want.',{scholarship:'Ask about a place at the academy',apprentice:'Try learning a trade',martial:'Join the practice in the yard'}),
  childhood_3:sceneRow('The Hidden Page','You find a page about forbidden magic inside a borrowed book. Your teacher notices that you have stopped reading. They ask what you found.',{confess:'Show the teacher the page',question:'Ask why the subject is forbidden',hide:'Put the page out of sight'}),
  apprenticeship:sceneRow('A First Profession','There are useful trades to learn around {here}. Choose the work you want to try; a profession can change as your life changes.',{healer:'Learn to care for the sick',merchant:'Learn to buy and sell',scholar:'Study and teach',herbalist:'Learn to gather and prepare herbs',soldier:'Join the watch'}),
  companion_talk:sceneRow('A Moment to Talk','Your companion stops beside you. There is time for a proper conversation before you move on.',{listen:'Hear them out',principle:'Explain what matters to you',disagree:'Tell them where you disagree'}),
  family_visit:sceneRow('Back at the Hearth','You find your family getting on with the day. A familiar voice asks whether you can stay for a while.',{time:'Stay and help with the day',gift:'Bring something for the household',confide:'Tell them what has been troubling you',stories:'Ask for a story from before you were born'}),
  plague_letter:sceneRow('Illness at Home','A message from home says more people are falling ill. The healer needs help finding a treatment. You can offer your help, ask about the symptoms, or return to this later.',{promise:'Promise to help find a treatment',questions:'Ask what the healer has already tried',later:'Say you cannot help yet'}),
  clinic:sceneRow('At the Clinic','The benches outside the clinic are full. Inside, a healer rinses a bowl and asks what help you can offer.',{academy:'Take the problem to the academy',support:'Help care for the people waiting'}),
  academy_remedy:sceneRow('Finding a Treatment','The researchers can study samples here. Gatherers also know where the treatment herbs grow. You decide whether to help in the field, at the worktable, or with both.',{field:'Gather the needed herbs',research:'Study the samples',both:'Help with the gathering and the research'}),
  paladin_oath:sceneRow('An Oath You Can Live By','Your teacher asks what you would promise when keeping that promise becomes difficult. You can swear an oath or leave without taking one.',{mercy:'Swear to show mercy',truth:'Swear to speak the truth',protection:'Swear to protect people in danger',decline:'Leave without swearing an oath'}),
  necromancer_ethics:sceneRow('Learning to Speak with the Dead','The teacher shows you how the ritual works. A willing spirit may answer; forcing one to remain is a different act. They ask which practice you intend to learn.',{consent:'Learn to summon only willing spirits',bind:'Learn to force a spirit to stay',decline:'Refuse the training'}),
  assassin_commission:sceneRow('A Dangerous Offer','A contact offers a place among the assassins. One task concerns stolen papers; the other calls for a killing. You can ask for either task or walk away.',{ledger:'Take the task to steal the papers',lethal:'Accept the killing',decline:'Walk away'}),
  initiation_trial:sceneRow('The Final Trial','Your teacher offers a test of what you have learned. You can take the fighting trial, prove yourself through service, or return when you are ready.',{combat:'Take the fighting trial',service:'Prove yourself through service',pause:'Return another day'}),
  ancestor_remedy:sceneRow('An Ancestor’s Help','The ritual could help with the illness, but someone must decide how to summon the spirit. Will you ask it to help, use the licensed rite, or force it to remain?',{consent:'Ask a willing ancestor for help',license:'Use the licensed ritual',bind:'Bind the spirit against its will',withdraw:'Do not perform the ritual'}),
  orrin_request:sceneRow('A Researcher’s Request','{orrin} asks you to bring back the notes you borrowed. They need them for their own work and want a straight answer about when you can return.',{promise:'Promise to return the notes',honest:'Say that you cannot promise yet'}),
  plague_homecoming:sceneRow('The Healer Asks What Happened','The treatment has reached home. People want to know where it came from, and whether there is more that can be done. You choose how much of your research to share.',{open:'Explain the treatment in public',private:'Speak to someone you trust',quiet:'Explain the treatment and keep the rest private'}),
  homecoming_aftermath:sceneRow('The Days After','People return to their work as the immediate crisis passes. There is still a life to build here, and other roads to take.',{continue:'Keep living this life',chronicle:'Settle down and close this life'}),
  retirement:sceneRow('Time to Settle Down','You have reached a point where you can stop chasing the next task. Settle into the life you have built, or keep going for a while.',{settle:'Settle down',continue:'Keep going'}),
  annual_deadline_review:sceneRow('A Promise Is Nearly Due','Something you agreed to do is nearly due. Stop advancing the year to attend to it, or continue knowing the deadline may pass.',{pause:'Stop here and attend to the promise',continue:'Continue the year'}),
  life_trade_shortage:sceneRow('A Grain Delivery','A grain caravan has reached {here}. Wealthy buyers are offering more than the local households can pay. As a merchant, you must decide who gets your stock.',{fair:'Sell at your usual price',profit:'Sell to the highest bidders',reserve:'Keep some grain for your family'}),
  life_healer_consent:sceneRow('A Patient’s Request','A sick patient asks you to summon an ancestor who knew a treatment. Their sibling is frightened of the ritual. You can explain it, seek another healer, or stay with the patient without using magic.',{consent:'Explain the ritual and ask the patient',living:'Call a living specialist',private:'Stay with the patient without a ritual'}),
  life_scholar_citation:sceneRow('Your Research, Their Name','{rival} shows you a manuscript containing research you did together. The patron intends to publish it under a different name. They are waiting to hear whether you will object.',{challenge:'Insist on credit for both researchers',bargain:'Take the patron’s teaching job instead',publish:'Share the research at the reading room'}),
  life_soldier_orders:sceneRow('A Family at the Checkpoint','A family stops at the bridge with barely enough money for food. Your captain has ordered you to collect the toll. They are waiting on the other side of your lantern.',{appeal:'Ask the captain for an exemption',waive:'Let the family through and give your name',enforce:'Collect the posted toll'}),
  life_herbalist_grove:sceneRow('The Herb Patch','You find a healthy patch of medicinal roots. There are enough mature plants to harvest now. Pulling the young ones too would leave little for next season.',{tend:'Take mature roots and plant the seeds',harvest:'Gather the whole patch',teach:'Show the patch to the village gardeners'}),
  life_grove_return:sceneRow('New Growth','The patch of herbs you helped protect is growing again. A learner asks how to harvest it without stripping the ground.',{mentor:'Show the learner how to harvest',gather:'Gather herbs for your own use',festival:'Celebrate the new growth with friends'}),
  life_family_roof:sceneRow('A Leaking Roof','{kin} needs help with a leak above the sleeping room. A carpenter can mend it, or you can lend a hand yourself. You can also explain what you can afford and ask the neighbors for help.',{hands:'Help mend the roof',money:'Pay the carpenter',honest:'Ask the neighbors to help'}),
  life_friend_ambition:sceneRow('Your Friend’s New Idea','{friend} tells you about work they want to try. They sound excited, then ask whether the idea seems foolish. They are looking for a friend’s answer, not permission.',{encourage:'Encourage them to try',practical:'Talk through the practical difficulties',listen:'Ask what they like about the idea'}),
  life_friend_ward:sceneRow('Somewhere to Begin','{friend} is looking for a useful place to start. They ask whether helping at home, learning at the clinic, or trying craft work would suit them.',{home:'Suggest starting at home',clinic:'Suggest learning at the clinic',craft:'Suggest trying a craft'}),
  life_rival_race:sceneRow('A Friendly Challenge','{rival} challenges you to a test of skill. A few people have stopped to watch, and {friend} wants to know whether you are joining in.',{compete:'Take the challenge',together:'Suggest practicing together',watch:'Watch this time'}),
  life_lantern_vigil:sceneRow('An Evening at the Shrine','The shrine lamps are being lit. You can join the gathering, spend a few quiet minutes on your own, or stay home with your family.',{all:'Join the gathering',private:'Light a lamp in private',family:'Spend the evening with family'}),
  life_ancestor_chair:sceneRow('Stories Over Supper','An old family story comes up at supper. Someone suggests calling an ancestor to tell it themselves. Others would rather remember the person through the people still here.',{stories:'Listen to the family stories',permission:'Ask whether the ancestor would join you',boundary:'Keep supper for the living tonight'}),
  life_secular_debate:sceneRow('A Question Over Tea','The conversation turns to belief. One person puts their trust in the gods; another says people should look after each other without waiting for them. You are asked what you think.',{evidence:'Explain why you want things you can test',care:'Talk about looking after people',dialogue:'Ask each person what brought them to that view'}),
  life_noble_table:sceneRow('An Invitation to Dinner','You receive an invitation to a wealthy house in {here}. Some of the people close to you have been left off the guest list.',{insist:'Ask that they be invited too',attend:'Attend the dinner',own:'Hold a supper of your own'}),
  life_budget_feast:sceneRow('The Feast and the Purse','There is a celebration in {here}. You could spend something on an evening out, take paid work while others celebrate, or help prepare the feast.',{work:'Take the available work',celebrate:'Pay for an evening at the feast',help:'Help the cooks and join them afterward'}),
  life_smuggler_offer:sceneRow('Cargo After Dark','A trader offers you money to carry goods without taking them through the customs gate. You can refuse, seek legal papers, or accept the concealed cargo.',{decline:'Refuse the cargo',license:'Ask for legal travel papers',smuggle:'Carry the goods past customs'}),
  life_receipt_returns:sceneRow('An Old Deal Causes Trouble','Someone has kept the receipt from a deal you made. They say they were treated unfairly and want a reply.',{account:'Pay to put the problem right',defend:'Defend the deal you made',pressure:'Pressure them to drop the complaint'}),
  life_vampire_guest:sceneRow('An Invitation Before Sunset','Your family has asked you to come before sunset. With your condition, the time of day matters. You can suggest a later meal, tell them why, or stay away.',{dusk:'Ask to come after sunset',truth:'Tell them about your vampirism',decline:'Decline the invitation'}),
  life_wolf_confidant:sceneRow('Before the Full Moon','Someone close to you asks why you keep leaving before the full moon. You can tell them, keep the reason private, or focus on practicing control.',{tell:'Tell them about the transformation',boundary:'Ask to keep the reason private',train:'Practice keeping control'}),
  life_partner_time:sceneRow('An Evening Together','Your partner says they miss spending time with you. There are things they have been waiting to tell you, and the day is nearly over.',{time:'Put the work aside and stay',explain:'Explain what has been keeping you busy',dismiss:'Tell them you have no time for this'}),
  life_child_school:sceneRow('Choosing Lessons','Your child is old enough for further lessons. You can ask about the community school, pay for academy study, or help them learn a craft.',{public:'Ask about community lessons',academy:'Pay for academy study',craft:'Arrange practical lessons'}),
  life_child_question:sceneRow('“How Does It Work?”','Your child watches you work and asks how you learned. You can show them, tell a story about learning, or ask what they would like to try.',{show:'Show them what you are doing',story:'Tell them about your first attempt',ask:'Ask what they would like to learn'}),
  life_overwork:sceneRow('Too Many Long Days','You are tired before the day has properly begun. There is more work waiting, but continuing at this pace is wearing you down.',{rest:'Take time to rest',share:'Ask someone to share the work',push:'Push through another long day'}),
  life_open_hearth:sceneRow('Room for a Guest','A traveler needs a place to stay in {here}. You have the chance to offer shelter, help them find work, or charge for a room.',{shelter:'Offer shelter',work:'Help them find paid work',inn:'Offer a room at a stated price'}),
  life_border_story:sceneRow('A Disputed Crossing','People disagree about which road crosses the border safely. You can take the longer way, inspect the route, or compare the older maps.',{around:'Take the longer route',survey:'Inspect the disputed crossing',archive:'Compare the old maps'}),
  life_birthday:sceneRow('Another Birthday','Another year has passed. You can spend the day thinking about your training, the people you care about, or something you want for yourself.',{calling:'Think about your training',people:'Spend time with people you care about',self:'Keep the day for yourself'}),
  life_values:sceneRow('Getting to Know Each Other','The conversation turns to the things each of you wants from life. You can ask a question, share your own thoughts, or end the subject.',{listen:'Ask what matters to them',share:'Tell them what matters to you',dismiss:'Change the subject'}),
  life_courtship:sceneRow('A Walk Together','The invitation is clearly more than friendly. You can accept it as a date, keep the relationship as a friendship, or talk before deciding.',{yes:'Accept the date',friends:'Ask to remain friends',discuss:'Talk about what you both want'}),
  life_commitment:sceneRow('Making a Home Together','You have reached the point of discussing a shared home and a lasting relationship. You can make the commitment or ask for more time.',{pledge:'Commit to a life together',wait:'Ask for more time'}),
  life_separation:sceneRow('A Difficult Conversation','You sit down with your partner to talk about whether this relationship should continue. You can leave, or stay and try again.',{end:'End the relationship',stay:'Stay together'}),
  life_courtship_end:sceneRow('Ending a Courtship','You need to decide whether to continue seeing each other. You can end the courtship or give it more time.',{end:'End the courtship',stay:'Keep seeing each other'}),
  life_family_start:sceneRow('A Larger Household','You discuss whether there is room in your life for a child. You can ask about adoption, welcome a child into the household, or wait.',{adopt:'Ask about adoption',welcome:'Welcome a child',wait:'Wait for now'}),
  life_budget:sceneRow('Keeping the Household Going','The household needs money for ordinary food and shelter. You can reduce expenses, take work, or stop the year here to decide what to do next.',{simplify:'Reduce the household expenses',work:'Take available work',pause:'Stop here and decide what to do'}),
  career_invoice:sceneRow('A Customer at the Workshop','A customer has a question about the price of your work. You can explain the charge, offer help through the community, or conceal the problem.',{honest:'Explain the charge honestly',community:'Help the customer through the community',conceal:'Hide the problem'}),
  career_staff:sceneRow('Another Pair of Hands','There is enough work to consider taking on help. You can hire a worker, teach an apprentice, or keep working alone.',{worker:'Hire a worker',apprentice:'Take on an apprentice',decline:'Keep working alone'}),
  career_year:sceneRow('How You Work','Another stretch of {work} work lies ahead. You decide whether to put extra care into the craft, help the community, or pursue the best-paying work.',{care:'Put care into the work',community:'Take work that helps the settlement',profit:'Pursue the best-paying jobs'}),
  career_legacy:sceneRow('Passing On the Workshop','People ask what will happen to the work you built. You can pass it to the community, keep it in the family, or concentrate on teaching others.',{community:'Pass the work to the community',household:'Keep it in the family',teach:'Teach others what you know'}),
  health_concern:sceneRow('You Do Not Feel Well','Something has been troubling you physically or emotionally. You can rest, seek treatment, ask someone to help, or carry on for now.',{rest:'Take time to rest',care:'Seek treatment',support:'Ask someone you trust for help',routine:'Give yourself a gentler day',continue:'Carry on for now'}),
  justice_arrest:sceneRow('Stopped by the Watch','The local watch stops you over an unresolved charge. You can submit to arrest, pay the offered fine, attempt to flee, or offer a bribe if that option is available.',{surrender:'Go with the watch',pay:'Pay the fine',flee:'Attempt to escape',bribe:'Offer a bribe'}),
  lineage_marriage:sceneRow('A Wedding','You and your partner are asked whether you are ready to marry. You can make your vows or wait.',{vow:'Make your vows',wait:'Wait for now'}),
  lineage_bereavement:sceneRow('After a Death','Someone close to the family has died. You can arrange a memorial, spend time with other mourners, or grieve in private.',{memorial:'Arrange a memorial',share:'Spend time with the family',private:'Grieve in private'}),
  lineage_adoption:sceneRow('Meeting a Child','You meet a child who may join your household. Listen to them first, offer a home if you are ready, help in another way, or return later.',{listen:'Listen to the child',offer:'Offer them a home',support:'Help without adopting',wait:'Return another day'}),
  nature_slight:sceneRow('An Insult in Public','Someone insults you within hearing of other people. You can let it pass, answer in kind, ask them to explain, or take a moment before reacting.',{forgive:'Let the insult pass',retaliate:'Strike back',account:'Ask them to explain themselves',wait:'Wait before answering',pause:'Leave it for now'}),
  quest_followup:sceneRow('After the Trouble','You return to people living with the effects of what happened. Some need practical help; others want to talk. You can listen before deciding what comes next.',{help:'Help with the work',listen:'Listen to the people here',record:'Write down what happened'}),
  quest_keeper_review:sceneRow('A Keeper’s Term','The agreed term of service is ending. You can choose to serve again or leave the duty behind.',{renew:'Choose another term',leave:'End your service'}),
};

const ROAD = {
  bandits:sceneRow('Bandits on the Road','Armed travelers block the way between {from} and {to}. They want money before they let you pass. There may be a way around them, but drawing a weapon will begin a fight.',{avoid:'Find a way around them',bribe:'Pay to pass',fight:'Draw your weapons',turn_back:'Turn back'}),
  beasts:sceneRow('Animals Ahead','You hear movement beyond a bend on the road to {to}. Hungry animals are close to the path. You can avoid them, leave supplies to distract them, fight, or turn back.',{avoid:'Take a quieter path',supplies:'Leave supplies and move past',fight:'Fight the animals',turn_back:'Turn back'}),
  weather:sceneRow('An Exposed Crossing','The road between {from} and {to} crosses ground with little shelter. Waiting will take longer. Pushing through will be harder on your party.',{shelter:'Wait under cover',press:'Push through now',turn_back:'Turn back'}),
  caravan:sceneRow('Company on the Road','A merchant caravan is heading toward {to}. {traveler} offers a place near the cooking fire before the carts move on.',{share:'Share food and road stories',trade:'Ask to trade supplies',continue:'Wish them well and keep walking'}),
  witness:sceneRow('News from the Next Town','{traveler} has come from {to}. They stop to tell you what the roads and the people there have been like lately.',{listen:'Stop and listen',continue:'Thank them and keep going'}),
  sick_traveler:sceneRow('A Traveler with a Fever','{traveler} sits beside the road to {to}, too tired to keep up with the others. They ask for help reaching somewhere sheltered.',{aid:'Stay and help them',herb:'Offer a healing herb',continue:'Say you cannot stop'}),
  messenger:sceneRow('A Broken Satchel Strap','{traveler} is trying to mend a satchel beside the road. The sealed letter inside is dry, but the strap will not hold.',{aid:'Help mend the strap',ask:'Ask about news from the road',extort:'Demand money to return the satchel',continue:'Continue along the road'}),
  pilgrims:sceneRow('Pilgrims at the Fire','{traveler} and a small group of pilgrims are sharing a meal on their way to {to}. They invite you to sit with them.',{pray:'Join their prayer',offering:'Contribute to the food',continue:'Thank them and keep going'}),
  grave_robber:sceneRow('An Opened Grave','A treasure hunter has opened a roadside grave. {traveler}, who tends the burial ground, is trying to stop them taking its contents.',{refuse:'Stand with the keeper',join:'Take a share of the grave goods',study:'Read the inscription and cover the grave',continue:'Pass without getting involved'}),
  fortune:sceneRow('Tea with a Fortune Teller','{traveler} has set out divining pieces beside a small fire. They offer a reading and a cup of tea, or a conversation about how the pieces are used.',{study:'Ask how they learned the craft',reading:'Pay for a reading and tea',continue:'Keep walking'}),
  wagon:sceneRow('A Wagon in the Ditch','{traveler} is struggling with a wagon wheel. They need someone to hold the axle steady, or carry a heavy crate while they work.',{aid:'Help repair the axle',labor:'Carry the crate for pay',continue:'Say you cannot stop today'}),
  relic:sceneRow('Shelter at a Roadside Shrine','A shrine roof is letting in rain. {traveler} has left a repair bowl beneath the eaves. You can donate, rest for a while, or carry on.',{donate:'Contribute to the roof repairs',pocket:'Take money from the repair bowl',rest:'Rest beneath the eaves',continue:'Keep to the road'}),
  lore:sceneRow('A Carved Road Marker','A weathered marker stands between {from} and {to}. There is still enough of the inscription to make out where this road used to lead.',{record:'Copy the inscription',continue:'Continue toward your destination'}),
  delay:sceneRow('The Road Is Still Ahead','The journey has taken longer than expected. You can continue from this point or abandon the journey.',{continue:'Continue the journey',abandon:'Abandon the journey'}),
};

const CAMPAIGN = {
  patients:sceneRow('At the Sickbed','The healer has found that the water is contaminated. A patient asks whether an ancestor could explain the old channel beneath the village. Their sibling asks you to try living medicine first.',{living:'Use herbs and living healers',willing:'Ask a willing ancestor for help',coerce:'Force an ancestor to answer'}),
  letter:sceneRow('Help with the Investigation','The academy offers research help if you return its borrowed notes. The Order offers a hearing. A physician will also help you work independently. You can choose whom to approach.',{academy:'Borrow the academy’s notes',order:'Ask the Order for a hearing',independent:'Work with the independent physician'}),
  return:sceneRow('Returning with the Treatment','The treatment has reached the village. People ask how you found it. You can explain your methods publicly, tell {mira} privately, or keep the research to yourself.',{open:'Explain your methods publicly',mira:'Tell {mira} in private',quiet:'Keep your research private'}),
  inquiry:sceneRow('What the Old Books Reveal','The recovered books describe people forced to sustain the city’s magic. {mira} asks what you intend to tell the investigators. You can show everything, speak privately, or accuse the whole Order.',{record:'Show the investigators the full findings',limited:'Discuss the findings privately',accuse:'Accuse the entire Order'}),
  ferryman:sceneRow('At the Ferry','A ferry worker can explain the cargo your investigation has been following. Public testimony may put the people who helped them at risk. You can protect the speaker, use an unnamed copy, or insist they appear in public.',{protect:'Arrange protected testimony',anonymous:'Use a copy without naming the speaker',pressure:'Demand a public appearance'}),
  accounts:sceneRow('Different Versions of the Same Event','The city’s official history leaves out people named in the older books. Local families still remember them. You can compare the sources, hear the families, or keep the discovery private.',{compare:'Compare the older books with the official version',families:'Invite the families to tell their stories',private:'Keep the discovery private for now'}),
  patron:sceneRow('An Offer of Support','A powerful patron offers help with your investigation. Their help would come with influence over what happens next. You can set conditions, work without them, or accept the power they offer.',{conditions:'Set conditions before accepting',independent:'Continue without the patron',power:'Accept the patron’s backing'}),
  gate:sceneRow('Preparing the Town Gate','The failing wards leave people worried about an attack. The gate can be reinforced, people can be moved to safety, or danger can be diverted toward another route.',{reinforce:'Reinforce the gate',evacuate:'Help people leave safely',divert:'Divert the danger elsewhere'}),
  refugees:sceneRow('Finding Somewhere Safe','Displaced families are waiting to hear where they can go. You can help them reach the city, find rooms in the village, or arrange shelter at the camp.',{city:'Help the families reach the city',village:'Find shelter in the village',camp:'Arrange places at the camp'}),
  anchor:sceneRow('The People Bound to the Wards','The old magic uses people to keep the wards working. You must decide whether to allow willing help, stop the binding, or permit the existing practice to continue.',{voluntary:'Allow only people who freely volunteer',stop:'Stop the binding',permit:'Allow the binding to continue'}),
  council:sceneRow('Who Gets to Decide','A meeting is being called about the failing wards. You can include the affected households, leave the decision to the institutions, or put local communities first.',{inclusive:'Invite the affected households',institutions:'Let the established institutions decide',local:'Put local communities in charge'}),
  keeper:sceneRow('Speaking with the Keeper','The keeper explains how the warding mechanism works. You can listen first, insist on limits to its use, or strike a bargain for control.',{listen:'Hear how the mechanism works',terms:'Insist on limits to its use',bargain:'Bargain for control'}),
  pledge:sceneRow('What to Do with the Wards','You know what keeps the wards alive and what changing them would cost. Choose whether to renew them, release the bound people, become a keeper, seize control, destroy the mechanism, or build another refuge where that route is available.',{renew:'Renew the wards with willing help',release:'Release the bound people',keeper:'Serve as the keeper',dominion:'Take control of the mechanism',shatter:'Destroy the mechanism',haven:'Establish another refuge'}),
  prepare:sceneRow('Before the Wards Change','There is time to make a practical preparation. You can strengthen shelters, prepare an evacuation, pledge existing rooms and donated reserves for a refuge, or contribute through a trade you have actually practiced. A pledge records existing capacity; it does not construct a free building.',{wards:'Strengthen the shelters',evacuate:'Prepare the evacuation routes',refuge:'Make a pledge of existing refuge capacity',professional:'Contribute through your trade'}),
  final:sceneRow('At the Warding Mechanism','You have reached the mechanism beneath the citadel. The people and preparations you brought matter now. You can use what you learned, fight the guardian, perform the ritual, or reconsider.',{testimony:'Use what the people taught you',fight:'Fight the guardian',ritual:'Perform the ritual',reconsider:'Step back and reconsider'}),
  aftermath:sceneRow('The Next Morning','The struggle at the citadel is over. People are beginning to live with the result. You can help rebuild, spend time with them, or write down what happened.',{rebuild:'Help rebuild',people:'Visit the people affected',record:'Write down what happened'}),
  side_ferry:sceneRow('A Ferry That Needs Repair','The ferryman needs help with the crossing. The landing can be mended, and its warning bell can be made useful again.',{repair:'Repair the landing',bell:'Restore the warning bell',both:'Help with both jobs'}),
  side_carpenter:sceneRow('Work for the Carpenter','The carpenter is trying to keep up with repairs and the need for shelter. You can arrange fair paid work, help house people, or use their need to get cheap labor.',{fair:'Arrange fair paid work',shelter:'Help prepare shelter',exploit:'Demand cheap labor'}),
  side_rival:sceneRow('A Shared Discovery','{rival} has helped make a discovery. A patron would prefer to publish it under a single name. You decide whether to insist on shared credit, publish it freely, or accept the patron’s offer.',{credit:'Credit both contributors',public:'Share the discovery publicly',patron:'Accept the patron’s offer'}),
  side_ward:sceneRow('A Watch Duty','The watch needs help with its duties. You can document the work, arrange help between neighbors, or demand that others do it for you.',{record:'Document the watch duty',mutual:'Arrange help between neighbors',demand:'Demand service from others'}),
  side_grove:sceneRow('A Path Through the Grove','Travelers need a safe path through the grove. You can protect the ground, agree shared use, or take a shortcut that damages it.',{protect:'Protect the grove',shared:'Agree a shared path',shortcut:'Force a shortcut through'}),
  side_hearth:sceneRow('Guests at Home','People need a place to stay. Before opening your household, you can talk with the people who live there, help arrange communal shelter, or make the decision yourself.',{agree:'Talk with your household first',communal:'Help open communal shelter',command:'Open the house without asking'}),
  side_receipt:sceneRow('A Delivery Clerk’s Help','A delivery clerk kept a receipt that could help explain the cargo sent to the warding mechanism. They worry about what will happen to their family if they speak.',{protect:'Arrange protection before they speak',copy:'Ask to copy the receipt without their name',threaten:'Threaten them into speaking'}),
  side_teacher:sceneRow('Your Teacher’s Omission','Your former teacher admits leaving an important passage out of a schoolbook. The missing passage describes how people could leave the old magical agreement.',{account:'Ask the teacher to restore the missing passage',private:'Accept a private correction',reject:'Keep the passage and refuse further guidance'}),
  side_confidant:sceneRow('A Friend Wants to Understand','{friend} asks how the investigation has been affecting your life. You can tell them about your childhood experiences, explain a condition you actually have, or keep the subject private.',{fate:'Tell them about your childhood experiences',condition:'Explain your supernatural condition',boundary:'Ask to keep the subject private'}),
};

const SUPERNATURAL = {
  vampire_offer:sceneRow('An Offer of Vampirism','The person before you describes a life sustained by blood. Accepting would change how you eat, travel, and live with other people. You can accept, refuse, or ask for time.',{accept:'Accept the transformation',decline:'Refuse the transformation',later:'Ask for time to think'}),
  lycan_offer:sceneRow('An Offer of the Wolf’s Curse','The person before you offers a transformation that brings strength and the danger of losing control at the full moon. You can accept, refuse, or ask for time.',{accept:'Accept the transformation',decline:'Refuse the transformation',later:'Ask for time to think'}),
  vampire_feeding:sceneRow('Hunger','You need blood. You can look for a willing donor, use animal blood, prey on someone, or refuse to feed. The hunger remains a real part of living with the condition.',{donor:'Ask a willing donor',animal:'Use animal blood',predation:'Attack someone to feed',abstain:'Refuse to feed',agreement:'Use the donor arrangement'}),
  life_hunger:sceneRow('You Need to Feed','The hunger is making it hard to concentrate. Decide how to feed, or stop here while you consider your options.',{animal:'Use animal blood',donor:'Find a willing donor',pause:'Decide later',endure:'Go another night without feeding',jailer:'Ask the jailer for an emergency ration',agreement:'Use the donor arrangement'}),
  lycan_fullmoon:sceneRow('The Full Moon','The transformation is close. You can use a prepared refuge, isolate yourself, try to resist, or go out where other people may be at risk.',{safe:'Use the prepared refuge',isolate:'Isolate yourself',resist:'Try to resist the transformation',roam:'Go out into the night'}),
  lycan_confidant:sceneRow('Someone You Can Tell','You may be able to face the next transformation with help. Choose someone to tell, or keep it private for now.',{keep:'Keep the condition private'}),
  curse_rare_meeting:sceneRow('A Dangerous Meeting','You have met someone touched by an unfamiliar power. Watch what they do and decide whether to speak, leave, or defend yourself if they attack.',{fight:'Defend yourself',withdraw:'Withdraw from the encounter',speak:'Speak with them',leave:'Leave',defer:'Ask to return another time'}),
  curse_frenzy:sceneRow('Losing Control','Your hunger has become difficult to contain. You can struggle to hold it back, feed, or hunt. The people around you will live with what happens.',{contain:'Try to contain the hunger',feed:'Feed now',hunt:'Hunt for blood'}),
  curse_hunters:sceneRow('Hunters Nearby','Hunters have come looking for someone with your condition. You can hide, confront them with weapons, or try to answer their questions.',{hide:'Hide from the hunters',fight:'Fight the hunters',answer:'Speak to the hunters'}),
  curse_trial:sceneRow('Before the Magistrate','The court has called you over your supernatural condition and the events connected to it. You can present the documents you have, attempt to escape, or accept the judgment.',{records:'Present your documents',escape:'Attempt to escape',accept:'Accept the judgment'}),
  sanctuary_case_accusation:sceneRow('A Complaint to the Watch','A complaint has brought the watch to your door. You can cooperate, flee, or return to the matter later if they permit it.',{cooperate:'Cooperate with the watch',escape:'Attempt to escape',later:'Return to this later'}),
  sanctuary_case_hearing:sceneRow('At the Hearing','The magistrate hears the complaint. The options available depend on your money, support, and the sentence being offered.',{pay:'Pay the fine',advocate:'Ask an advocate to speak',service:'Accept community service',escape:'Attempt to escape',later:'Ask to return later',prison:'Accept the sentence'}),
  sanctuary_case_capture:sceneRow('In Custody','The watch has taken you into custody. You can use any offered way to settle the charge, or serve the sentence.',{pay:'Pay the fine',advocate:'Ask an advocate to speak',service:'Accept community service',prison:'Serve the sentence'}),
  sanctuary_case_aftercare:sceneRow('After the Hearing','The hearing has ended. You can explain what happened or take some quiet time before returning to your day.',{account:'Explain what happened',quiet:'Take some quiet time'}),
  sanctuary_donor_terms:sceneRow('Talking with a Donor','A willing donor asks you to agree when and how feeding will happen. You can accept, choose animal blood instead, or leave without an arrangement.',{agree:'Agree to the donor’s terms',animal:'Use animal blood instead',private:'Leave without an arrangement'}),
  sanctuary_pack_terms:sceneRow('Meeting the Pack','The pack offers help living with the transformation. You can join their arrangement or keep your distance.',{agree:'Accept the pack’s help',private:'Keep your distance'}),
};

const CHILDHOOD = {
  'birth-thread':['A New Arrival','{kin} settles you into a warm blanket. A silver thread has come loose, and the household is deciding whether to show it to the keeper or put it away.',['Show the thread to the keeper','Keep the thread with the household things','Remove the thread from the blanket']],
  'birth-knock':['A Gift for the Baby','A visitor arrives with a small carved bird for you. {kin} meets them at the door and decides whether to let them in.',['Let the visitor see you at the door','Ask the visitor’s name before opening','Keep the door closed']],
  'birth-bell':['Choosing Your Name','The keeper has come to enter your birth. {kin} is asked which household name should be written beside yours.',['Use the household’s chosen name','Keep both names in the birth entry','Leave the second name unwritten']],
  'winter-shift':['A Cold Night','{kin} has been offered night work. The money would help mend a broken window, but someone would need to stay with you.',['Take the shift and ask the neighbor to help','Stay home and patch the window with cloth','Ask for a place at the communal hearth']],
  'cradle-song':['A Song Before Sleep','You laugh when {kin} sings an old household song. A visiting relative does not like its words.',['Keep singing the old song','Sing the tune with different words','Put the song away']],
  'first-word':['Your First Words','You point at the hearth and repeat a new word. {kin} kneels beside you, trying to understand what you mean.',['Write down the unfamiliar word','Turn the sounds into a game','Teach the ordinary word for fire']],
  'little-boots':['Outside in Your Boots','Your boots are too big, but you want to follow {kin} outside. A puddle fills most of the space beyond the doorstep.',['Carry you over the puddle','Let you try while holding a hand','Leave you with the neighbor this time']],
  'wooden-hare':['A Toy to Share','{friend} wants back the wooden hare they traded you. You have already started painting it.',['Give the toy back','Hide the toy','Suggest taking turns']],
  'blackberry-rule':['Outside the Game','{rival} says you must bring berries from behind the keeper’s fence before you can join the game. {friend} has already climbed over.',['Climb over the fence','Tell the keeper','Start another game outside']],
  'moth-in-jar':['A Moth on the Shelf','There is a moth trapped in a jar on the shelf. {friend} dares you to open it after bedtime.',['Open the jar','Keep the jar beside your bed','Tell your caregiver']],
  'fox-bread':['A Hungry Fox','A fox is waiting where you sometimes leave food. Today, the piece of bread in your hand is your supper.',['Give the fox your bread','Eat the bread and chase it away','Ask for kitchen scraps']],
  'broken-cup':['A Broken Cup','{friend} knocks a cup onto the floor. They ask you to take the blame before {kin} comes into the room.',['Take the blame','Tell what happened','Try to mend the cup']],
  'supper-seat':['The Best Chair','Your sibling has taken the chair you like at supper. The food is getting cold while you argue.',['Move their bowl','Sit in another chair','Try to share the chair']],
  'ink-blot':['The Attendance Sheet','You catch {rival} changing an absence mark. They say they were helping at home. The teacher is coming upstairs.',['Let them finish changing the mark','Ask them to explain the absence to the teacher','Report the altered mark']],
  'borrowed-page':['Something in the Book','A loose page falls out of a book {friend} lent you. It describes a spell that is not in your lessons.',['Keep the page and return the book','Read the page together and return it','Give the page to the teacher']],
  'chalk-answer':['Before the Examination','{friend} offers to show you answers they found for tomorrow’s examination. You have not finished studying.',['Memorize the answers','Ask for help with the unfinished lessons','Skip the examination']],
  'slate-society':['An Invitation','You have been invited to a small gathering. {rival} says only the invited pupils can come. {friend} is still waiting for an invitation.',['Go to the gathering','Bring your friend','Turn down the invitation']],
  'missing-coins':['Three Coins','You find money inside a flour sack. {kin} has been counting the food carefully. The puppet show costs the same amount.',['Spend it at the puppet show','Bring the money to your caregiver','Ask to work at the puppet show']],
  'wrong-prayer':['A Different Version','The prayer in the schoolbook has a different ending from the one sung at home. The teacher asks you to recite it.',['Sing the version from home','Recite the printed version','Ask why the versions differ']],
  'ditch-bet':['A Jump Across the Ditch','{rival} offers you a coin if you jump across the ditch. {friend} says the far bank looks slippery.',['Attempt the jump','Ask your rival to jump first','Walk around by the bridge']],
  'window-seat':['A Mason Outside','A mason is repairing the arch outside your lesson room. You keep looking out of the window while the teacher speaks.',['Ask to learn with the mason','Keep watching the repair','Close the shutter and study']],
  'forge-invitation':['Two Invitations','A visiting smith offers you an evening at the forge. You have already promised {friend} that you will join their performance.',['Learn with the smith','Join your friend’s performance','Ask someone to take your part']],
  'plum-vendor':['At the Fruit Stall','The plum vendor has fallen asleep beside the basket. {rival} points at the fruit and says nobody will notice one missing.',['Take a plum','Wake the vendor and ask for bruised fruit','Leave the stall and spend the afternoon elsewhere']],
  'family-letter':['An Open Letter','A letter about money is lying open on the table. It belongs to {kin}. You have not been asked to read it.',['Read the letter','Ask about it','Leave it alone']],
  'private-name':['A Name to Use','{rival} asks you to use a different name for them outside lessons. {friend} is coming down the lane.',['Use the name they asked for','Ask why they waited to tell you','Insist on using the old name']],
  'river-lesson':['Lessons or the River','It is the first warm afternoon in weeks. {friend} wants to swim instead of attending the lesson you have been waiting for.',['Go swimming','Attend the lesson','Ask your friend to come to lessons first']],
  'measuring-door':['Growing Taller','{kin} marks your height on the doorframe. There is an older mark beside it, made when someone else was your height.',['Ask whose name is beside the older mark','Copy the name to ask about elsewhere','Carve your own height mark beside it']],
  'borrowed-sword':['A Guard’s Old Sword','A retired guard lets you hold a sword. While the guard turns away, {rival} asks you to demonstrate a fighting stroke.',['Try a stroke','Wait for the guard to teach you','Give your rival a turn with the sword']],
  'market-prize':['Someone Else’s Prize','A piece you made has won a small prize at the market. {rival} entered it under their own name. The judge is still nearby.',['Tell the judge who made it','Speak with your rival privately','Let your rival keep the prize']],
  'night-invitation':['A Late Invitation','{friend} taps at your window. People are gathering at the old watchtower, but you have an errand to finish before morning.',['Slip out to join them','Ask your friend to help finish the errand first','Stay home and close the shutter']],
  'rooftop-message':['A Note Asking to Meet','Someone has sent a note asking you to meet on the granary roof. {friend} glances at the paper and waits for your answer.',['Go to the meeting','Ask who sent the note','Keep the note without answering']],
  'paid-road':['A Sealed Packet','A messenger offers money to carry a sealed packet across the market. They insist you keep it hidden inside your coat.',['Carry the packet without opening it','Ask about the unusual seal','Take the packet to your caregiver']],
  'apprentice-price':['A Trial at the Workshop','A maker offers you a trial at the workshop. The first busy evening falls on {friend}’s celebration.',['Begin the workshop trial tonight','Ask to begin after the celebration','Turn down the trial and seek quieter hours']],
  'well-name':['A Sound from the Well','You and {rival} hear a voice below the dry well. It seems to be calling for someone. You can answer it, test the depth, or leave.',['Ask who is speaking','Drop a stone and count the echoes','Leave with your rival']],
  'rival-offer':['An Introduction to a Patron','{rival} offers to introduce you to a patron interested in work you studied together. The patron expects only one of you to present it.',['Go and share the introduction','Ask that both of you speak','Turn down the introduction']],
  'household-expectation':['What You Want to Do','{kin} has told a neighbor that you will learn the household trade. You hear congratulations before anyone has asked what you want.',['Try the household trade for a while','Explain the work you want to do','Wait until the neighbor leaves to speak privately']],
  'empty-shrine':['A Promise of Your Own','You and {friend} find an empty oath book at the shrine. Nobody is asking you to sign it. You can write something or leave it blank.',['Write a promise to someone living','Write a question instead of a vow','Leave the book blank']],
  'hare-return':['The Toy Comes Back','{friend} brings out the wooden hare from your early childhood. The painted ear is still easy to recognize.',['Talk honestly about the old trade','Make a new toy together','Pretend not to remember the toy']],
  'cup-return':['Another Broken Cup','{friend} brings a cracked cup and asks whether you can help before it must be returned. You both remember the one broken years ago.',['Help repair the cup','Ask who your friend is covering for','Say you cannot take on the repair']],
  'fox-return':['The Fox Returns','A fox stands beyond the laundry line. {friend} asks whether it is the one that used to wait for you.',['Show your friend where to leave food','Watch without bringing food','Ask the keeper to keep foxes out']],
  'page-return':['The Old Magic Page','The page you found years ago has come up again. The people who saw it remember what you did with it.',['Discuss the page openly','Study it carefully','Leave the subject alone']],
  'affection-return':['An Answer to the Note','{friend} asks about a note from years ago. They want to know whether you understood why it was sent.',['Tell them how you felt','Ask to remain friends','Say you are still unsure']],
  'attendance-return':['Helping a Younger Pupil','{rival} is helping supervise lessons now. A younger pupil cannot attend every day because of work at home. You remember the absence mark your rival once changed.',['Remind your rival about that earlier absence','Let your rival decide how to help','Tell the pupil about your rival’s old absence mark']],
  'debt-return':['The Lender Visits','The person who lent money to your household has come to speak with {kin}. The payment letter is on the table between them.',['Offer some of your savings','Ask the lender to explain what was agreed','Leave them to speak privately']],
  'birth-sign':['A Question About Your Birth','{kin} brings out something kept from the night you were born. They ask whether you have questions about that time.',['Tell them about your dreams','Look at the old birth entry','Go outside to join your friends']],
  'leaving-box':['Eighteen','{kin} has put a box of childhood things on the table. {friend} asks what you want to do now that you are old enough to choose your own work and roads.',['Build a life here first','Keep studying what interests you','Try life beyond the settlement']],
  'growth-first-voice':['Something to Show','You have been trying a new word, a story, or a game. {kin} makes time to watch what you can do.',['Ask for the next part of the story','Share the pieces and make a game','Build a little model']],
  'growth-school-door':['Your First Visit to School','The lesson room is open. {friend} is waiting at a bench, and the teacher asks what you would like to see. This visit does not enroll you.',['Sit beside another learner','Ask the teacher a question','Show something you made']],
  'growth-wider-lessons':['More Ways to Learn','You can ask about academy study or practical lessons now. {friend} wants to know which you would like to try.',['Ask about further study','Ask to try practical work','Discuss how to fit lessons around home']],
  'growth-first-independence':['An Afternoon of Your Own','Paid work and longer journeys are becoming possible. For this afternoon, {friend} asks whether you would rather study, help at home, or sit down to supper.',['Study with your friend','Help repair something at home','Talk over supper']],
  'growth-old-slate':['Helping the Younger Learners','{friend} brings out a slate from your first lessons. The younger learners have a different idea about how to solve the same task.',['Try their idea beside yours','Ask which part they found difficult','Make a little model they can take apart']],
  'growth-kept-plan':['Your First Adult Birthday','You are eighteen. {kin} makes time to mark the day with you, and {friend} asks what you would like to learn or try next.',['Thank the people who raised you','Talk with your friend about further learning','Spend the morning outdoors together']],
};

const ADULT_STORIES = [
  ['Someone asks to learn your work','A Learner at Your Bench','A younger neighbor asks to watch you work. You have a paying job to finish, but there is room to teach if you are willing to slow down.',['Teach while you finish a shared commission','Take the commission and leave a lesson for later','Rest and suggest another teacher'],['You teach the learner as you finish the commission together.','You finish the paid commission and leave a lesson for another day.','You take a rest and introduce the learner to another teacher.']],
  ['A name missing from the reading room','An Old Book for the Reading Room','An old book has arrived without its former owner’s name. A teacher wants to find out who it belonged to. A buyer is interested in a copy, and you notice magical notes between the ordinary pages.',['Help identify the book for the reading room','Study the magical notes','Sell a copy and preserve the original'],['You help restore the book’s history in the reading room.','You spend time studying the unfamiliar magical notes.','You sell a copy and keep the original available to readers.']],
  ['The evening your friend had been waiting for','Two Invitations for Supper','{friend} wants to tell you about a difficult year. {kin} has invited you to supper on the same evening. Both would like to see you.',['Spend the evening with your friend','Invite family and friend to one meal','Arrange another evening and rest tonight'],['You spend the evening listening to your friend.','You bring family and friend together for a meal.','You explain that you need rest and arrange another time to meet.']],
  ['Your rival’s name beside yours','A Buyer for the Shared Map','A patron wants to buy the survey you completed with {rival}. They offer to publish it under your name alone. Your rival has not yet seen the proposed cover.',['Insist on credit for both surveyors','Release the map for public use','Accept the offer under your name alone'],['You insist that both surveyors are named on the finished map.','You make the map available to everyone with both names on it.','You take the patron’s payment while your rival’s name is left out.']],
  ['A household routine after dusk','An Invitation Before Sunset','Someone has invited you to a midday meal. Your vampirism makes that difficult. You can change the time, tell {kin} why you need help, or decline.',['Arrange an evening meal and animal blood','Tell your caregiver about the hunger','Decline without revealing your condition'],['You arrange to eat after sunset and attend to your hunger with animal blood.','You explain the hunger to your caregiver in private.','You decline the invitation and keep the condition private.'],'vampire'],
  ['A refuge that becomes a routine','Before the Next Full Moon','You need to prepare for another full moon. The refuge needs attention, and {kin} has noticed how carefully you watch the date.',['Repair the refuge','Practice keeping control','Ask your caregiver to help prepare'],['You repair the refuge before the next full moon.','You practice restraint through steady everyday work.','You tell your caregiver about the transformation and ask for help.'],'lycanthrope'],
  ['A duty written in plain words','A Household Asks to Be Heard','An Order representative wants your help. The household affected by the visit says nobody has listened to them. Your oath is already your own; now you must decide what to do.',['Help the household and explain what happened','Ask the Order to hear the household directly','Finish the paid work you already promised'],['You help the household and give an honest explanation of what happened.','You ask the Order to hear the household directly.','You finish the paid work you had already promised.'],'paladin'],
  ['Tools beside an empty hearth','Rebuilding a Home','A carpenter is helping people rebuild after a settlement was damaged. A survivor asks for a hand with the next frame. Your own household also needs time and work.',['Help raise the new frame','Contribute toward the rebuilding','Make a stable home with your family'],['You help the survivors raise the frame of a new home.','You contribute what you can and let the carpenter direct the work.','You help your own household settle into a safe surviving home.'],'damaged'],
  ['A commission with an unnamed buyer','Two Jobs on the Bench','A buyer offers good money for your {work} work but will not say who will use it. Another household offers less for a repair whose purpose is clear.',['Take the household’s repair','Ask the other buyer for clear terms','Turn down both and work on your own craft'],['You complete the household’s repair for the agreed payment.','You ask what the other commission will be used for before accepting it.','You turn down the two offers and spend time on your own craft.']],
  ['The useful work that will not make you famous','Repairs Before the Gathering','A public fitting needs repair on the same evening that a patron has invited you to a gathering. You cannot give the whole evening to both.',['Finish the repair with the other helpers','Attend the patron’s gathering','Share the repair and keep part of the evening free'],['You finish the public repair and share credit with the helpers.','You attend the gathering and make new professional introductions.','You help divide the repair work and keep time to rest afterward.']],
  ['A tool inherited with a disagreement','A Tool for the Workshop','A neighbor left a useful tool to the workshop. Their relatives disagree about whether the gift was properly witnessed. The tool is still wrapped on the table.',['Hear the relatives before arranging its use','Check the original gift and witness marks','Do paid work with your own tools while they decide'],['You hear both relatives before discussing how the tool may be used.','You compare the gift and its witness marks without rushing the family.','You take useful paid work with your own tools while the family decides.']],
  ['Your friend’s life beside your own','Helping with a Move','{friend} is moving house. They ask for help carrying and packing while you talk about what each of you wants to do next.',['Help your friend with the move','Pack together and exchange your news','Offer a smaller task you can manage'],['You help your friend carry their things to the new home.','You pack together and listen to each other’s news.','You explain your limits and complete a smaller useful part of the move.']],
  ['The lesson you can afford to give','A Learner Who Cannot Pay','A learner wants {work} instruction but cannot afford your usual fee. They offer practical help in exchange. You also have unfinished study of your own.',['Agree a fair exchange for the lesson','Share a public lesson and take paid work','Keep the time for your own study'],['You teach through an exchange the learner agrees to.','You leave a public lesson and earn your living through other paid work.','You use the time to continue your own study.']],
  ['A warning before the long road','A Damaged Road','A guide reports loose supports on a trade road. A merchant wants the route kept open. Before anyone leaves, you can help warn travelers, check the repairs, or prepare for a safer job.',['Help post the guide’s warning','Check the repair history','Take a safer local job'],['You help the guide warn travelers about the damaged road.','You check the repair history before repeating a claim about the route.','You prepare supplies and take a safer local job.']],
  ['A household asks for quiet company','A Neighbor Needs Company','A neighbor has had a difficult season. They ask for a quiet visit. You can listen, help them reach support they want, or complete an errand so they have less to worry about.',['Spend time listening','Help arrange the support they want','Complete a practical errand'],['You spend a quiet visit listening to your neighbor.','You help your neighbor arrange the support they choose.','You complete the errand you offered and leave them time to rest.']],
  ['The festival work nobody planned','Getting the Fair Ready','The songs and decorations are ready for the fair, but the benches and lantern hooks still need repair. A keeper asks whether you can help.',['Take the paid repair job','Ask patrons to pay for safe fittings first','Teach volunteers the repair and rest afterward'],['You repair the fittings and share the work with the other helpers.','You persuade the patrons to fund the needed safety work before more decoration.','You teach volunteers a useful repair and leave when the lesson is finished.']],
  ['Your rival returns with a different account','A Correction from Your Rival','{rival} finds a mistake in something you both used to believe. They bring the source to you before showing it to everyone else.',['Publish the correction together','Check the source together','Admit the uncertainty and return to your paid work'],['You thank your rival and publish the correction together.','You compare the sources before defending the old claim.','You acknowledge the uncertainty and return to the paid work you can finish.']],
  ['A room for the next household','New Neighbors Need a Room','A newly arrived household needs somewhere safe while they look for regular work. The neighbors disagree over rent and the repairs the room needs.',['Help arrange a temporary welcome','Inspect the room and price the repairs','Contribute what you can while keeping your home secure'],['You help agree a temporary place for the new household.','You inspect the room and prepare a practical repair estimate.','You contribute what you can while keeping your own household secure.']],
  ['The craft you still want to learn','A Visiting Maker','A visiting maker offers a lesson in work outside your usual trade. You can try the technique, ask about its history, or show a method of your own.',['Learn the visiting maker’s technique','Ask about the history of the craft','Share your method and keep a quieter schedule'],['You learn enough of the other craft to work more easily with its makers.','You ask how the technique developed and study its history.','You exchange methods while keeping time for your own rest.']],
  ['A letter addressed to the person you were','An Old Family Letter','{kin} finds a letter describing what someone expected you to become. Your life may have taken another direction. They ask what you think of it now.',['Tell your family what your life means to you','Keep the letter beside a description of your own years','Mark the day with work you enjoy'],['You tell your family what you value about the life you chose.','You keep the old letter without treating it as a promise you must fulfill.','You spend the day on useful work you enjoy.']],
];

function adultRow(s,e={}) {
  const captured=s.timeline?.storybook?.pending?.scene,annual=s.timeline?.annualScene;
  const titles=[e.title,captured?.title,annual?.title].filter(Boolean),named=ADULT_STORIES.find(row=>titles.includes(row[0])||titles.includes(row[1]));
  if(named)return named;
  const scenario=e.scenarioId||captured?.scenarioId||annual?.scenarioId||'';
  if(scenario.startsWith('family-'))return null;
  const deadRival=(s.life?.people||[]).find(p=>p.id==='rival')?.alive===false,deadKin=!presentKin(s);
  const rows=ADULT_STORIES.filter((r,i)=>{
    const guard=r[5];if(guard==='vampire')return s.hero?.condition?.type==='vampire';if(guard==='lycanthrope')return s.hero?.condition?.type==='lycanthrope';if(guard==='paladin')return s.hero?.specialization==='paladin';if(guard==='damaged')return (s.world?.locations||[]).some(p=>['destroyed','evacuated'].includes(p.status));
    if(deadRival&&[3,16].includes(i))return false;
    if(deadKin&&[2,4,5,7,19].includes(i))return false;
    return true;
  });
  const index=Number(/^adult-(\d+)$/.exec(scenario)?.[1]);
  return Number.isInteger(index)&&rows[index]?rows[index]:choose(s,`adult:${s.age||0}:${scenario}`,rows);
}
function adultEvent(s,e) {
  const captured=s.timeline?.storybook?.pending?.scene,scenario=e.scenarioId||captured?.scenarioId||s.timeline?.annualScene?.scenarioId||'',family=/^family-(small_child|school_child|teen_child|adult_child|partner_time|elder_care|widow_memory)-(.+)$/.exec(scenario);
  if(family){
    const kind=family[1],id=family[2],who=name(s,id,clean(s.lineage?.people?.find(p=>p.id===id)?.name)||'your family member');
    const data={
      small_child:['An Afternoon with Your Child',`${who} has been exploring the room and wants you to join in. There is time for comfort, a little question, or a safe game.`,['Listen and join their game','Explore something together','Try a little practical task']],
      school_child:['A Question After School',`${who} brings home a question the lesson did not settle. You can listen, help investigate it, or try making something that shows the answer.`,['Listen to what interests them','Work through the question together','Try a safe practical task']],
      teen_child:['Your Child’s Next Step',`${who} wants to try something different from your own work. You can offer encouragement, explore the idea together, or help them test it in practice.`,['Support the interest they bring','Explore their question together','Help them try a practical task']],
      adult_child:['Your Grown Child’s News',`${who} has news of a project of their own. They ask for company and a little help without asking you to choose their life for them.`,['Listen and offer support','Talk through their question','Help with a task they chose']],
      partner_time:['An Evening You Keep Missing',`${who} says the evenings keep disappearing into work. They want time together and a clear idea of what you can both manage.`,['Keep a regular evening together','Talk about the work and time you each need','Explain the busy season and its cost']],
      elder_care:['An Errand Together',`${who} asks for help with an ordinary errand. You can make time, listen to a story while you sit together, or share a manageable task.`,['Offer the help they asked for','Listen to a story they want to tell','Do a small practical task together']],
      widow_memory:['Remembering Your Partner',`The season brings back a memory of ${who}. You can talk with someone, write down a story, or keep the remembrance private.`,['Share a particular memory','Write down a story from their life','Remember them privately and return to your work']],
    }[kind];
    return sceneRow(data[0],data[1],Object.fromEntries(['care','curiosity','courage'].map((id,i)=>[id,data[2][i]])));
  }
  const row=adultRow(s,e);
  return sceneRow(row[1],row[2],Object.fromEntries(['care','curiosity','courage'].map((id,i)=>[id,row[3][i]])));
}

function childhoodEvent(s,e) {
  if((s.age||0)>18)return adultEvent(s,e);
  const captured=s?.timeline?.storybook?.pending?.scene;
  const row=captured&&CHILDHOOD[captured.id];
  if(row)return {title:row[0],body:expand(row[1],s),labels:Object.fromEntries((e.choices||[]).map((c,i)=>[c.id,row[2][i]||c.label]))};
  if((s.age||0)<3)return sceneRow('A Small Beginning','Your days are filled with meals, sleep, familiar voices, and the people caring for you. Your caregiver chooses how to spend this little part of the day.');
  if(s.age<6)return sceneRow('A Day Close to Home',choose(s,contextKey(s,e),['There is time to play near home. The adults are busy, but a familiar person has stopped to see what you have been doing.','You have found something interesting to show the people at home. They make a little space beside their work.','The afternoon is yours for a small game, a question, or time with someone you know.']));
  if(s.age<12)return sceneRow('After Lessons',choose(s,contextKey(s,e),['The lesson has ended in {here}. There is still time to spend with friends before you are expected home.','You and the other learners gather your things. Someone has a question about the day, and you have a chance to answer.','A free afternoon opens after lessons. You can decide how to spend it without choosing your whole future.']));
  if(s.age<18)return sceneRow('A Choice of Your Own',choose(s,contextKey(s,e),['Work, lessons, and friendships are beginning to pull your days in different directions. Choose what you will do in this moment.','Someone close to you asks what you would like to try next. You can give an honest answer without promising a lifetime.','The day leaves you with a small decision about the people and work around you. The choice is yours.']));
  return sceneRow('Another Year Begins','You have more freedom to decide how to spend your time. Choose the next step that suits the life you want to live.');
}

const PERSONAL = {
  cracked_mark:['A Repair Gone Wrong',['{actor} brings back work you helped make. A fitting has failed, and the household wants it fixed before anyone is hurt.','{actor} has found another piece with the same fault. More customers may need help, and the buyer wants to know who will pay.','The workshop must decide what to teach the next learner about the failure. {actor} asks you to choose how the problem will be handled.']],
  two_names:['The Shared Map',['{actor} mapped a route with you. A buyer offers to pay for a clean copy bearing only your name.','Floodwater has changed a crossing on the map. {actor} brings fresh measurements before the next caravan departs.','The ferry house needs a reliable copy of the route. {actor} arrives with their original field pages and asks whose work will be included.']],
  winter_commons:['The Village Garden',['A blocked drain is flooding the shared vegetable beds. {actor} asks whether you can help before the next rain.','The gardeners have counted their winter food and seed. {actor} asks how much should be eaten now and how much kept for planting.','The garden is productive enough that a wealthy buyer wants control of it. {actor} asks what will happen to the households that have tended it.']],
  hearth_letter:['The Family’s Old Debt',['{actor} finds an old agreement about a family debt. The lender is demanding more work than the written sum appears to justify.','Two relatives want to use the same room. {actor} brings the original payment letter so you can help settle the disagreement.','The lender returns to settle the remaining debt. {actor} wants the household to know exactly what is owed before anyone signs again.']],
  night_door:['A Room for the Winter',['A traveler reaches {there} after the gates close. {actor} knows a household with a spare room, but the gatekeeper is asking where the guest will go next.','There is only enough fuel for another week of shelter. {actor} asks you to help work out what the hosts and guests can manage.','The gatekeeper is leaving. {actor} asks whether the existing guest rooms should become a shared shelter, a private inn, or a restricted house.']],
  own_key:['Teaching the Trade',['{actor} asks to learn from your work. A patron offers more money if the learner’s finished pieces are sold under your name.','{actor} wins a commission you also wanted. The buyer asks you for a reference before allowing the work to begin.','{actor} now has a learner of their own. They ask to copy your teaching materials for the new workbench.']],
  buried_bell:['The Miners Below',['{actor} discovers a bell above an abandoned mine. The ghost beside it says miners were left below after a collapse and asks you to help them rest.','The ghost shows {actor} another part of the mine. More trapped spirits are waiting to be released.','You have reached the chain holding the mine’s spirits. {actor} asks whether to release them, tend the place with willing help, or take control of it.']],
  water_second_face:['The Ferryman’s Last Crossing',['A ghostly ferryman appears in the water near {there}. It tells {actor} that passengers are stranded between the shores and asks for help.','The stranded passengers have gathered again. {actor} asks you to help them cross without forcing anyone to remain.','The ferryman offers to give up its work. You must decide whether to end the crossing, keep it with willing help, or use its power for yourself.']],
  hollow_mask:['The Watcher’s Release',['{actor} finds a spirit attached to an old guard’s mask. It was ordered to hold a barrier long after the war ended and does not know it can leave.','Other spirits are still waiting behind the barrier. {actor} asks how you intend to help them leave.','The watcher is ready to leave its post. {actor} asks what should become of the road and the spirits that used it.']],
  moth_window:['The Guest at the Window',['A spirit appears at a window in {there}. It tells {actor} that this used to be its room and asks whether it may stay.','The spirit is struggling to remember the room. {actor} asks whether you will help it move on, make space for it, or use its fear to control it.','The spirit is ready to leave the house. You can help it depart, offer a willing place to stay, or try to hold it here.']],
  silverleaf_names:['The Remembering Tree',['{actor} finds a tree whose leaves hold the names of dead travelers. The spirits appear when called and ask whether they may finally leave.','Some spirits want to tell their families what happened; others want quiet. {actor} asks you to help each one choose.','The tree’s old magic can end now. You decide whether to release the remaining spirits, keep only willing visitors, or bind them for your own use.']],
  stone_last_note:['The Lost Mine Shift',['{actor} hears a work signal behind a sealed mine door. The spirits inside ask whether their shift has ended.','The mine spirits remember the orders that kept them underground. {actor} asks you to help finish their work without trapping them again.','The last spirits can leave the mine. You can help them rest, preserve a place for willing visitors, or claim the worksite through its binding.']],
  ninth_hearth:['The Empty House',['{actor} finds a house still warmed by a spirit’s fire. The spirit asks why its family never came home.','People need shelter, but the old resident still occupies the house. {actor} asks whether a shared arrangement can be made.','The house needs a lasting keeper. You must decide who can use it and whether the spirit is free to leave.']],
  bannerless_oath:['The Soldier Without a Company',['A dead soldier is still keeping watch near {there}. {actor} learns that nobody ever told them the fighting had ended.','Other soldiers have begun gathering around the old post. {actor} asks you to help them find a purpose they can choose.','The company’s last duty can end here. You decide whether to release its soldiers, arrange willing service, or put them under your command.']],
  drain_lullaby:['A Child Below the Street',['{actor} hears a child crying beneath a street drain. A trapped spirit explains that it cannot find the way back to its family.','The spirit’s family has been found among old burial names. {actor} asks how you will help bring them together.','The spirit can finally leave the drain. You decide whether to help it rest, keep a willing place of remembrance, or use the haunting for your own ends.']],
  horns_candle:['The Shrine Visitor',['{actor} meets a spirit at a roadside shrine. It asks for a light and a chance to speak without being driven away.','The visitor has returned to the shrine. Local people disagree about whether to welcome it, hire its help, or force it to obey.','The shrine needs a lasting decision about its visitor. You can offer freedom, arrange willing service, or keep control of the spirit.']],
  road_four_tracks:['Travelers After Dark',['{actor} finds travelers following an old route after nightfall. Some are living; others have not understood that their journey ended years ago.','The travelers return along the same road. {actor} asks you to help them reach the place they are actually seeking.','You can end the wandering, arrange a route for willing travelers, or control who is allowed through. {actor} waits for your answer.']],
  moon_broken_roof:['Shelter Under the Moon',['A damaged roof has left a frightened resident exposed to the moon. {actor} asks for help with shelter and the danger of transformation.','The shelter needs more work. {actor} asks whether you will help protect the resident, arrange paid use, or make safety depend on obedience.','The shelter can become useful to others. You must decide who will control it and how its guests will be treated.']],
  marriage_second_chair:['Making Room at Home',['Your partner {actor} has been invited to show their work at a fair. They want you to notice the work, and you are struggling with being left out.','A commission would take {actor} away for a season. You discuss how to handle the work and the household while they are gone.','A failed commission has left a room and workers who need help. You decide how the household venture should continue.','People ask what to remember about the workshop. You choose how to share the credit and what to keep private.','The workshop needs a new owner. You decide what should happen to the room and the work after your household no longer needs them.']],
  festival_hollow_lantern:['The Festival Workshop',['{actor} is helping prepare the festival. A practical problem needs work before the celebration can begin.','The festival has returned, and the people doing the work need a fair share of the money and rest. {actor} asks for your help.','The festival needs a lasting home. You choose how the work and the useful rooms will be managed.','New helpers are joining the festival. {actor} asks who will teach them and who will receive credit.','The festival is ready to pass to new hands. You decide what rules they will inherit.']],
  deserter_unfinished_boot:['A Soldier Looking for Work',['{actor} brings you a soldier who left their company and needs civilian work. Helping them may draw attention from their former officers.','The soldier is trying to build a life beyond the fighting. {actor} asks for help with a practical job.','The former company wants the soldier’s labor again. You decide whether to help protect their new life or profit from their need.','Other soldiers want a way out of the war. {actor} asks what kind of work and shelter can be offered.','The work is ready to continue without you. Decide who will hold the workshop and set its conditions.']],
  false_accusation_ash_coat:['An Unfair Accusation',['{actor} asks for help with an accusation that has not been fairly examined. People are already repeating it around {there}.','The accusation has affected a household’s work. {actor} asks whether you will help them recover or use the dispute for profit.','There is a chance to settle the accusation openly. You decide whether to help, take a separate paid role, or pressure the people involved.','The people affected want to make the place useful again. {actor} asks who should manage it.','A new keeper will decide how future complaints are handled. Choose what you want to leave behind.']],
  child_other_road:['Your Child’s Own Road',['Your grown child {actor} is preparing to leave home. They ask for help without promising to live the life you expected.','{actor} writes about difficulties away from home. You can help, arrange paid support, or use the difficulty to demand they return.','The household has a room to use differently now. You decide whether to make it useful to others or keep it under your own control.','A younger traveler asks about leaving home. The people at {there} consider what help they can offer.','Old family things are being sorted for the next generation. Decide what should happen to the room and its work.']],
  curse_survivor_last_lamp:['Helping After a Frightening Night',['{actor} asks for help repairing the room where they were harmed. They want to feel safe sleeping there again.','The repaired room could help other people recovering from frightening experiences. {actor} asks how it should be used.','A visitor wants to turn a private description of fear into a public story. You decide whether to protect it or use it.','The room needs a new keeper. {actor} asks how guests will be welcomed and protected.','The room is ready to pass to other hands. Decide who will look after it and what they may ask of its guests.']],
};

const QUESTS = {
  well:['The Sickening Water','Explore the cistern and find what is contaminating the water.'],
  patients:['Help at the Clinic','Speak with the patient and choose how to help the healer.'],
  letter:['Research Help','Ask about help with the investigation.'],
  return:['Bring the Treatment Home','Return home and decide how to explain the treatment.'],
  ledger:['The Lost Warding Books','Explore the buried archive and recover the original warding books.'],
  inquiry:['Speak with the Investigators','Bring the recovered findings to the investigators.'],
  ferryman:['The Missing Cargo','Speak with the ferryman about the cargo sent to the old mechanism.'],
  accounts:['Compare the Old Histories','Compare the city’s history with what local families remember.'],
  patron:['An Offer of Support','Decide whether to accept the patron’s help.'],
  orchard:['The Forest Spring','Explore the root caverns and reach the spring.'],
  gate:['Prepare the Gate','Help prepare the gate for the failing wards.'],
  refugees:['Shelter for the Displaced','Choose where to help the displaced families find shelter.'],
  anchor:['The Bound People','Decide how the warding mechanism may use people’s help.'],
  council:['A Meeting About the Wards','Decide who should take part in choosing what happens next.'],
  keeper:['Meet the Keeper','Speak with the keeper of the warding mechanism.'],
  pledge:['The Future of the Wards','Choose what you intend to do with the warding mechanism.'],
  prepare:['Get People Ready','Make a practical preparation before changing the wards.'],
  descent:['Below the Citadel','Explore the citadel’s lower passages and reach the warding mechanism.'],
  final:['At the Mechanism','Face the guardian and carry out your chosen approach.'],
  aftermath:['After the Wards Change','Return to the people affected and choose how to help.'],
  side_ferry:['Repair the Ferry','Ask the ferryman what needs repairing.'],
  side_carpenter:['The Carpenter’s Work','Speak with the carpenter about paid work and shelter.'],
  side_rival:['Credit for the Discovery','Speak with your rival about sharing the discovery.'],
  side_ward:['The Watch Duty','Ask about the work needed to keep the watch useful.'],
  side_grove:['A Path Through the Grove','Help decide how the grove’s paths should be used.'],
  side_hearth:['A Place to Stay','Talk to the household about sheltering guests.'],
  side_receipt:['The Delivery Clerk','Speak with the clerk about the retained receipt.'],
  side_watchtower:['Restore the Warning Tower','Explore the watchtower and restore its use as a warning post.'],
  side_teacher:['The Missing Passage','Ask your former teacher about the missing passage.'],
  side_confidant:['A Conversation with a Friend','Talk with your friend about what has been happening.'],
};

// A topic is a small conversation, not an invisible quest. The reply answers
// the question on screen, and its only effects are familiarity and a memory.
const TOPICS = {
  home:[
    ['Supper','I tried the neighbor’s soup recipe. Mine tastes mostly of onions. I may have misunderstood a measurement.','Did anyone ask for another bowl?','They did. I am choosing to take that as praise.','Tell me about your day while I rescue what is left.','You can laugh after you have tried a spoonful.'],
    ['A Quiet House','The house is quiet today. I thought I wanted quiet, and now I keep finding reasons to make noise.','What have you been doing with the afternoon?','Sorting things I should have thrown away years ago. I have found three lids and none of their pots.','Stay for a little while. We can be busy later.','I was managing a very respectable conversation with the kettle.'],
    ['A Family Habit','I still make too much food when I cook. I count everyone who used to sit at the table before I remember.','Do you like having people over?','Yes. I just need somebody to tell me how many are actually coming.','What have your meals been like lately?','If you start growing again, at least I will be ready.'],
    ['Small Repairs','The door has stopped sticking. I keep giving it the old shove and nearly falling through it.','Did the repair take long?','Long enough that I should have done it last winter. I will deny saying that.','You look as though you have had a longer day than the door. Tell me.','You may laugh. It will probably happen again before supper.'],
  ],
  lover:[
    ['Time Together','I passed the bread stall and bought the kind you like. Then I nearly ate your half on the way back.','Nearly?','There is enough left to prove I was thinking of you. Barely.','Come and sit with me. I want to hear the whole day.','You should be grateful I fought so bravely against the temptation.'],
    ['An Ordinary Evening','We keep saving our time together for a day when neither of us is busy. I am beginning to suspect that day is a rumor.','What would you like to do tonight?','Sit close, eat something warm, and let the washing wait a little.','Tell me what has been on your mind. I do not need an entertaining version.','A bold suggestion. Next you will say we should enjoy ourselves.'],
    ['A Walk','I would like to walk with you without deciding where we are going before we leave.','Even if we get lost?','Especially if we only get a little lost and find somewhere selling supper.','Then tell me what sort of day you have had as we walk.','I trust you with my heart. My sense of direction is another matter.'],
  ],
  child:[
    ['A New Game','I made up a game. You can play, but I have not decided how anyone wins yet.','What are the rules so far?','That stone is a dragon. Unless it is your turn, when it is a mountain.','You can tell me a story after my turn. It needs a dragon.','That is what someone who is losing would say.'],
    ['Something Made by Hand','I made this little boat. It floats if you do not put it in water for very long.','How did you make it?','The small pieces were easy. Making them stay together was the difficult part.','Did you make things like this when you were little?','It is a very good boat for a dry river.'],
    ['A Difficult Lesson','I knew the answer until the teacher asked me. Then I knew every other thing in the world instead.','What was the question?','I remember it now. That is the annoying part.','Did that ever happen to you?','You are not allowed to laugh until I get it right.'],
    ['A Place to Hide','I found the best hiding place. I cannot tell you where it is because then it would be the second-best hiding place.','Will you at least tell me when you are hiding?','Yes. Otherwise you might forget to look.','I want to hear your news, but quietly. We might give the place away.','You will never find me. Unless I need supper.'],
  ],
  teacher:[
    ['A Good Question','A pupil asked why the answer mattered. I had to stop the lesson and think before I could answer properly.','What did you tell them?','That it lets us solve the next problem without guessing. Then I had to show them.','What have you been trying to learn lately?','The most dangerous pupil is the one who asks a sensible question.'],
    ['The Lesson Room','I found a drawing of myself on a slate. Six legs. An impressive amount of hair. I kept it.','Was it a good likeness?','Only in the eyes. Apparently I look at unfinished work like a hungry spider.','Tell me about the parts of your day I never see from the teaching bench.','It is going beside the attendance sheet. They should know the creature has seen it.'],
    ['Learning Slowly','Someone stayed after the lesson to ask for the explanation again. I was glad they did. Most people are better at pretending.','Do you mind repeating a lesson?','I mind a learner leaving with no idea what I meant. Repeating it is the easy part.','You may ask me a question too, if you have one.','You would be surprised how many adults need the same lesson twice.'],
    ['Chalk Everywhere','There is chalk in my sleeves, my supper, and a book I have not opened for a week.','Do you ever get a day away from lessons?','Sometimes. I spend half of it finding things to show the pupils.','Tell me something that happened outside this room. I could use the change.','At least nobody can accuse me of leaving my work behind.'],
  ],
  merchant:[
    ['A Wet Market Day','Rain gets into everything except the customers’ purses. Those remain very firmly closed.','Has trade been slow?','Slow enough to mend the awning twice. Not slow enough to close early.','Tell me something from the road. It is more interesting than watching the puddle.','If jokes were coin, I could afford a roof instead of an awning.'],
    ['The Difficult Customer','Someone spent half the morning comparing two identical buckles. Bought neither. Asked whether I could get a third.','What did you say?','I said I would try. It is an excellent way to have them leave without an argument.','What have you been looking for lately? Tell me the story, not the price.','Careful. I may start charging for advice by the hour.'],
    ['A Useful Piece','I like goods that are still useful after they stop looking new. People often shop in the opposite order.','What would you keep for yourself?','A sound pair of boots. You only notice bad ones after the road gets long.','Tell me where you have been wearing out your own boots.','An elegant opinion. You should try selling it.'],
    ['Closing Time','I am looking forward to closing up, eating something hot, and not counting anything until morning.','What do you do when the stall is closed?','Sometimes I walk through the market and enjoy being the person who buys nothing.','Stay a moment if you have news. The goods can wait.','Yes, I do occasionally have thoughts that are not about profit.'],
  ],
  healer:[
    ['A Cold Bowl of Soup','My soup has gone cold three times today. I reheat it, someone arrives, and the soup gets another hour older.','Have you managed to eat any of it?','A little. I am determined to finish the bowl before it becomes tomorrow’s soup.','How have you been feeling? You can answer without making it sound brave.','If you have come to scold me into eating, there is a second spoon.'],
    ['Learning the Craft','A learner finally tied a bandage that stayed put. They were more pleased than anyone I have seen this week.','Do you remember your first attempt?','Perfectly. It fell off before I had finished explaining how secure it was.','Tell me what you are learning. It is good to hear about something besides wounds.','People think steady hands are a gift. Mostly they are what is left after practice.'],
    ['A Short Break','I stepped outside for fresh air and realized I had not noticed the weather all day.','Was it worth the wait?','Yes. Even the drizzle felt better than another hour indoors.','Walk a little with me and tell me about your day.','I am prescribing myself ten minutes away from that doorway.'],
    ['The Clinic Shelf','I put the jars back in order this morning. By midday every one I needed was somewhere else.','Who moved them?','Three helpers, each improving the arrangement. I have asked them to stop improving it.','You look as though you have been busy too. What happened?','The medicine is easier to understand than the people arranging it.'],
  ],
  craft:[
    ['A Stubborn Repair','It looked like a small repair when I started. That was before I took it apart.','What was wrong with it?','Someone fixed the first problem in a way that created three better-hidden ones.','Tell me about your work. My hands can keep busy while I listen.','Laugh if you like. Then hold this end steady.'],
    ['A First Attempt','I keep an early piece beside the bench. It is awful. Looking at it is cheaper than becoming too pleased with myself.','Can I see it?','Yes, but you have to let me show you the newer work afterward.','What is the first thing you remember making?','It had character. Unfortunately, it also had a crack all the way through.'],
    ['Borrowed Tools','A neighbor returned my tool cleaner than when I lent it. Now I feel obliged to clean the rest.','Is that a bad thing?','Only for the excellent excuse I had for leaving them as they were.','Have you had help from anyone lately?','Generosity has led to an unexpected amount of sweeping.'],
    ['Finishing for the Day','There is a point in the evening when I should put the tools down. I usually recognize it just after making a mistake.','Have you reached it yet?','Possibly. You arriving is a useful excuse to stop.','Come away from the bench with me. Tell me what you have been doing.','An expert knows when to stop. I am still practicing that part.'],
  ],
  guard:[
    ['Wet Boots','My boots let water in from somewhere. I have searched every seam except the one with the leak.','Have you tried the cobbler?','Tomorrow. Today I am conducting a very thorough inspection of puddles.','How have the roads been treating you?','You may joke when you have stood in these for a watch.'],
    ['The Long Watch','A quiet watch is a good watch. It is also a very long conversation with the inside of your own head.','What do you think about out there?','Supper, mostly. Then whether it is time for supper.','Tell me something that happened beyond this corner.','If you have a more exciting watch, I would still prefer the quiet one.'],
    ['Practice in the Yard','A new recruit keeps gripping the practice weapon too tightly. I recognize the mistake because I made it for weeks.','What finally helped you?','Someone telling me to breathe before they told me to swing again.','What have you been practicing lately?','I was excellent at losing practice bouts. A very experienced beginner.'],
    ['Off Duty','I am looking forward to being a person who can sit down without everyone asking what happened at the gate.','What will you do instead?','Find a meal and a seat with my back to something warm. Nothing heroic.','Tell me what you have been up to. I would rather hear your news.','If anyone asks, sitting down is an advanced defensive technique.'],
  ],
  scholar:[
    ['A Page That Finally Makes Sense','I read the same page four times before realizing the writer had skipped a step. I feel much better about the first three attempts.','Did you find the missing step?','Yes. On the next page, where they explain that it was obvious. It was not.','What has kept your mind busy lately?','A useful discovery: even old experts could write badly.'],
    ['Trying an Explanation','I tried explaining the subject to someone new. It exposed several things I had been repeating without understanding.','Did they notice?','Immediately. They asked the shortest question in the room.','Tell me about something you know well. I will try to ask a sensible question.','I have become very suspicious of the word “simply.”'],
    ['Too Many Books','I went to find one book and came back carrying four. The one I wanted was not among them.','Will you go back for it?','Of course. I am trying to think of a route that avoids the other shelves.','Tell me your news before I find something else to read.','I could stop at any time. That is what I tell the person lending them.'],
    ['Learning Outside','I found the answer to a difficult question while walking. I had left all my notes indoors, which may have helped.','Did you remember it when you returned?','Eventually. First I remembered every unrelated thought from the walk.','What do you do when a problem will not leave you alone?','An excellent reason to spend more time wandering, I think.'],
  ],
  guild:[
    ['The Shared Tool Rack','Everyone says they return the shared tools. The empty hooks seem to hold a different opinion.','Where do they usually turn up?','Beside the person who needed them for just one moment yesterday.','How has your own work been going?','If I start charging rent for borrowed tools, we can afford a larger hall.'],
    ['A New Member','Someone came in expecting the guild to turn them away. They brought work worth seeing. I wish they had come sooner.','What did you tell them?','To show us the work before deciding what we would say about it.','What was it like when you first tried your trade?','We are very intimidating until somebody sees us arguing over firewood.'],
    ['Work Worth Doing','The most useful job this week was a small repair nobody will ever admire. I think the person using it is pleased enough.','Does that bother you?','Not really. I would rather something work than be remembered as the person who made it complicated.','Tell me about something that went well for you.','We should award a medal for jobs that no longer need mentioning.'],
  ],
  rival:[
    ['A Challenge','I tried that exercise again. Better this time. I am telling you now so you cannot look too surprised later.','Which part improved?','The part I was hoping nobody had noticed last time. You may have noticed.','How has your own practice been going? I can be civil for a few minutes.','Enjoy the joke while you still have the lead.'],
    ['Comparing Work','I saw how you handled the last piece of work. There was something useful in it. Do not make me say that twice.','What did you like about it?','You took your time with the part I would have rushed. I may try that.','Show me what you have been doing. I will try to be fair.','I said useful, not flawless. There is still room for my opinion.'],
    ['A Small Defeat','I lost a game I was certain I understood. It turns out certainty is not a move.','Will you play again?','After I stop explaining to myself why the other player was lucky.','Have you had anything go wrong lately, or are you still pretending?','You could try looking a little less delighted.'],
  ],
  stranger:[
    ['A Place to Sit','I was just looking for a dry place to sit. This one has the advantage of already being here.','Have you been in town long?','Long enough to find the baker. I am working outward from there.','What has your day been like?','A roof is impressive craftsmanship when you have spent enough time without one.'],
    ['Market Noise','I like listening to the market when I have nothing to buy. Everyone is trying to sound as though the price is their final word.','Do you bargain?','Badly. I start worrying about whether I am making the seller miss supper.','Tell me where you usually spend your day.','I once negotiated a price upward by accident. A memorable talent.'],
    ['A Familiar Tune','Somebody has been whistling the same tune all morning. I do not know the ending, and now I need to.','Will you ask them?','I was hoping they would reach it on their own. My patience has been wildly optimistic.','What do you find yourself humming when you work?','If you know the ending, this would be a merciful time to share it.'],
    ['The Weather','I dressed for the weather we had yesterday. Yesterday would have appreciated the effort.','Have you far to go?','Not far enough to justify complaining this much, but I am going to finish anyway.','You look as though you have been out in it too.','I am considering consulting the sky before I leave next time.'],
  ],
};

const COMPANION_TOPICS = {
  mira:[
    ['A Practice Bout','I let a younger fighter win a practice bout once. They noticed. They were angrier than if I had knocked them flat.','What did you do?','Apologized, then gave them a proper bout. They made me work for it.','What have you been practicing?','A lesson in humility. Unfortunately, it was mine.'],
    ['An Evening off Watch','For once, nobody needs me at a gate. I have spent most of the hour deciding what to do without one.','What would you enjoy?','A warm meal, then a walk where I do not have to inspect every doorway.','Come and tell me your news. I am off duty enough to listen.','If relaxation were a duty, I would be much better at it.'],
  ],
  orrin:[
    ['An Experiment','I tested a small spell outdoors. It worked beautifully. The wind then scattered everything I needed to write down.','Did you learn what you wanted?','Yes. I also learned to bring a stone for the loose pages.','What have you learned the difficult way lately?','A dramatic display followed by a scholar chasing paper. An excellent performance.'],
    ['A Book Borrowed Too Long','I found a book I meant to return. I had put it beneath the other book I meant to return.','Will the lender mind?','Probably. I am rehearsing an apology with fewer explanations in it.','Tell me about your day before I make another excuse to read.','The books have been excellent company. This will not improve my apology.'],
  ],
  kest:[
    ['Walking Quietly','There is a bird that notices me every time I try to pass quietly. I am beginning to think it waits for the attempt.','Have you tried another path?','Yes. It enjoys a change of scenery too.','How have your own travels been?','At least one of us is finding my practice entertaining.'],
    ['A Useful Knot','Someone showed me a quicker way to tie a knot. I have used the old one for years and keep doing it without thinking.','Is the new one better?','Yes, which makes forgetting it considerably more irritating.','Tell me something you are trying to learn.','A great victory for rope over experience.'],
  ],
  sable:[
    ['An Unfinished Meal','I promised myself a proper meal before taking on anything else. Then I started offering the food to everyone who passed.','Did you keep any for yourself?','Some. I am learning to put it on my own plate first.','Sit with me while I finish it. How has your day been?','Yes, I am aware this is a very obvious lesson.'],
    ['A Learner’s First Success','A learner cleaned and dressed a difficult wound without help today. Afterward they went outside and sat down very suddenly.','Were they all right?','Yes. They had been holding their breath for most of it. I remember doing the same.','What has made you proud lately?','Steady hands, shaking knees. A familiar combination.'],
  ],
  tovin:[
    ['A Pair of Boots','I have finally found boots that do not fight me with every step. I may be dangerously cheerful about it.','What happened to the old pair?','They are retired. I hope they spend the rest of their life holding a door open.','How have your own days been treating you?','A formidable enemy, defeated by a cobbler.'],
    ['A Civilian Afternoon','I spent an afternoon helping mend a fence. Nobody shouted an order. The fence stayed where we put it. I liked that.','Did the work suit you?','Yes. There is satisfaction in knowing what you built will be for.','Tell me about some useful work you have done.','It was a poorly armed fence. We had the advantage.'],
  ],
  vesper:[
    ['A Song That Changed','Someone sang my song with a different ending. The annoying part is that I liked it.','Will you use their ending?','If they let me. I will have to survive admitting that it is better.','Tell me a story from your day. I promise not to rhyme it immediately.','I am trying to be gracious. Give me a moment.'],
    ['A Small Audience','I played to three people last night. One was asleep and one wanted directions. The third listened to everything.','Was it a good performance?','I think so. It is hard to hide behind the crowd when you can see every face.','What have you been doing when nobody is watching?','I am counting the sleeper as someone who found the music soothing.'],
  ],
};

function dialogueDeck(s,p,relationship) {
  const own=COMPANION_TOPICS[p.id];
  if(own&&s.age>=16&&p.age>=16)return own;
  if((p.age??30)<12||s.age<12&&p.age<16)return TOPICS.child;
  const r=clean(relationship).toLowerCase(),role=clean(p.familyRole||p.occupation||p.role||p.source?.role).toLowerCase();
  if(/partner|lover|courtship|spouse/.test(r)||s.life?.partnerId===p.id||s.life?.courtshipId===p.id)return TOPICS.lover;
  if(p.familyRole||role==='relative')return TOPICS.home;
  if(/rival/.test(r+' '+role)||p.id==='rival')return TOPICS.rival;
  if(/teacher|tutor|professor/.test(role)||role==='practice instructor')return TOPICS.teacher;
  if(/healer|doctor|physician|clinic|herbalist/.test(role))return TOPICS.healer;
  if(/merchant|trader|shop|customer/.test(role))return TOPICS.merchant;
  if(/guild|steward|foreman|employer|recruiter/.test(role))return TOPICS.guild;
  if(/smith|miner|carpenter|maker|craft|worker|colleague|mason/.test(role))return TOPICS.craft;
  if(/soldier|warrior|guard|knight|captain|order/.test(role))return TOPICS.guard;
  if(/mage|scholar|reader|researcher|librarian/.test(role))return TOPICS.scholar;
  return TOPICS.stranger;
}

export function groundedDialogue(state,who,{topic,relationship,scene}={}) {
  const s=state||{},p=who||{},personName=clean(p.name)||'The person before you';
  const topicId=clean(topic)||`visit-${s.age||0}-${s.day||0}-${p.id||'person'}`;
  const remote=p.locationId&&p.locationId!==s.locationId,where=place(s,p.locationId||s.locationId);
  const key=`${p.id||personName}:${topicId}`,deck=dialogueDeck(s,p,relationship),row=choose(s,key,deck);
  const bond=p.bond??(finite(p.relationship)?50+p.relationship/2:35);
  const young=(p.age??30)<3||s.age<3;
  if(young){
    const baby=(p.age??30)<3,body=baby?`${personName} watches you from a blanket while a caregiver stays close. A small hand reaches toward the light as you sit nearby.`:`${personName} sits close enough for you to see their face. They repeat a familiar sound and wait for your answer.`;
    return {nodeId:'person_v30',topic:topicId,title:'A Little Company',body,choices:[
      {id:'ask',label:baby?'Answer their little gesture':'Try the sound again',description:'Share a quiet moment.',text:'[You answer with a small sound and a smile.]',response:baby?'[They watch your face, then reach toward you again.]':'[They smile and repeat the sound slowly.]',effect:{bond:3,memory:'We shared a quiet moment together.'}},
      {id:'share',label:baby?'Sit nearby':'Show what caught your attention',description:'Spend a little time together.',text:'[You settle into the moment.]',response:'[The familiar company makes the room feel easier.]',effect:{bond:2,memory:'We spent a little time together.'}},
      {id:'tease',label:'Play a small game',description:'Keep the game gentle.',text:'[You make a little game of the movement.]',response:'[A laugh breaks the quiet.]',effect:{bond:2,memory:'We shared a little game.'}},
      {id:'leave',label:'Let the moment end',description:'No promise or penalty.',text:'[You let the moment settle.]',response:'[The room grows quiet again.]',effect:{bond:0}},
    ]};
  }
  const hostile=/enem/.test(clean(relationship).toLowerCase())||bond<15;
  if(hostile)return {nodeId:'person_v30',topic:topicId,title:'An Uneasy Meeting',body:`${personName} sees you approach in ${where} and keeps their distance. “If you have something to say, say it. I am not ready to pretend we get on.”`,choices:[
    {id:'ask',label:'Ask whether they are willing to talk',description:'A conversation does not settle an old quarrel.',text:'Will you talk with me for a moment?',response:'For a moment. That is all I am offering.',effect:{bond:1,memory:'We spoke briefly while the disagreement remained.'}},
    {id:'share',label:'Say why you came',description:'Explain yourself without demanding a welcome.',text:'I came because I wanted you to hear it from me.',response:'Then speak plainly. I will decide what I make of it.',effect:{bond:0,memory:'You spoke to me directly despite our disagreement.'}},
    {id:'tease',label:'Try a joke',description:'You are not on friendly terms.',text:'We could try being civil for once.',response:'You could try taking this seriously for once.',effect:{bond:-2,memory:'Your joke did not help our quarrel.'}},
    {id:'leave',label:'Leave them alone',description:'End the conversation.',text:'All right. I will go.',response:'Thank you.',effect:{bond:0}},
  ]};
  if(!topic){const followUp=conversationFollowUp(s,p,topicId);if(followUp)return followUp;}
  const disposition=clean(p.disposition||p.source?.disposition).toLowerCase();
  const greeting=choose(s,key+':greeting',/reserved|wary|secretive/.test(disposition)?['They make room beside them.','They look up and wait until you are close.']: /bold|gregarious/.test(disposition)?['They wave you over.','They look pleased to have an audience.']: /driven|ambitious|exacting/.test(disposition)?['They finish what they are doing before turning to you.','They put their work aside for a moment.']:['They look up when you approach.','They smile and make a little room.']);
  const framing=remote?`An unfinished letter from ${personName} in ${where} is waiting for your answer.`:`You find ${personName} in ${where}. ${greeting}`;
  const teaseBond=bond<30?-2:/reserved|wary|secretive/.test(disposition)?1:3;
  const goodbye=choose(s,key+':goodbye',bond>=65?['Come back when you have time. I like having you here.','Take care. I will look forward to hearing the rest.','Go on, then. We will find another evening.']:['Take care on your way.','Good to talk. I should get back to this.','Until next time, then.']);
  return {nodeId:'person_v30',topic:topicId,title:row[0],body:`${framing}\n\n“${row[1]}”`,choices:[
    {id:'ask',label:row[2],description:'Ask about what they have just told you.',text:row[2],response:row[3],effect:{bond:4,memory:`We talked about ${row[0].toLowerCase()} in ${where}.`}},
    {id:'share',label:s.age<12?'Tell them about your day':'Tell them how your day has been',description:'Share your own news.',text:s.age<12?'Something happened to me today too.':'I have some news of my own.',response:row[4],effect:{bond:3,memory:`We exchanged news in ${where}.`}},
    {id:'tease',label:'Make a gentle joke',description:bond<30?'You do not know each other well yet.':'There is room for a little humor.',text:choose(s,key+':joke',['You make it sound like a grand adventure.','That sounds like a story you will be telling for a while.','I am trying very hard to look sympathetic.']),response:bond<30?'We hardly know each other. Give me a little time before the jokes.':row[5],effect:{bond:teaseBond,memory:bond<30?'We had an awkward moment before we knew each other well.':`We shared a joke about ${row[0].toLowerCase()}.`}},
    {id:'leave',label:remote?'Finish the letter':'Say goodbye',description:'End the conversation without making a promise.',text:remote?'I will end the letter here. Take care.':'I should go. It was good to talk.',response:remote?'Write again when you have news.':goodbye,effect:{bond:0}},
  ]};
}

const DUNGEON_ROOMS = {
  entry:['The Entrance','You have reached the entrance. Check the passages before choosing a way forward.'],
  sluice:['The Sluice Gate','Creatures shelter beside the old water gate. You will need to deal with them before you pass.'],
  flooded:['The Flooded Passage','Water covers the floor and hides sharp scrap. A careful inspection may find a safer path.'],
  cache:['The Supply Room','There are supplies left in this room. Inspect them before deciding what to take.'],
  keeper:['The Keeper’s Chamber','The keeper is blocking the passage ahead. Be ready to fight or use another offered way through.'],
  source:['The Contaminated Spring','The old magical channel empties into the water here. You can investigate the source before returning to the people above.'],
  scriptoria:['The Copying Room','A magical defender stands among the copying desks. It can see you approaching.'],
  trap:['The Trapped Stair','Protective magic crosses the stairs. Study the pattern before stepping through.'],
  vault:['The Storage Vault','A coffer and old books remain in the vault. Decide what you can safely recover.'],
  archivist:['The Archive Guardian','The guardian is still protecting the collection. Choose how to get past it.'],
  seal:['The Original Warding Instructions','You have reached the original instructions for the warding mechanism. Read them before deciding what to do next.'],
  spoor:['The Animals’ Den','The tunnel opens into a den. The animals are watching you from the far side.'],
  thorns:['The Thorn Passage','Thorns cross the passage from wall to wall. Look for a way through before pushing into them.'],
  refuge:['The Ranger’s Shelter','The alcove is dry. There are remains of a traveler’s supplies and space to take stock.'],
  thornheart:['The Root Guardian','A large rooted creature blocks the approach to the spring. Watch how it moves before committing to an attack.'],
  spring:['The Forest Spring','You have reached the spring. Check what you can gather and what you need to do before leaving.'],
  cliff:['The Cliff Patrol','A patrol holds the narrow path. Their ranged fighter is positioned behind a defender.'],
  cells:['The Holding Cells','A jailer stands between you and the cells. Travelers are locked inside.'],
  captain:['The Captain’s Platform','The captain and guards have taken position on the platform. You can see the fight ahead.'],
  signal:['The Warning Brazier','The warning post is within reach. Inspect it and finish the work you came to do.'],
  hall:['The Inner Hall','Armored defenders guard the direct route. A spellcaster supports them from farther back.'],
  forge:['The Damaged Forge','Broken machinery and unstable magic fill the forge. Look for a way to stop the danger before crossing.'],
  library:['The Warding Library','Books about the mechanism and emergency supplies remain here. Check the room before approaching the guardian.'],
  warden:['The Final Guardian','The guardian stands between you and the warding mechanism. Prepare for the encounter before you move forward.'],
  anchor:['The Warding Mechanism','You have reached the mechanism. Your discoveries and earlier decisions determine what you can do here.'],
  witness:['A Person in the Dungeon','Someone is still living here. You can approach them and hear what they need before deciding how to proceed.'],
  service:['The Maintenance Passage','This route was built to keep the place working. Check the supports and the work still needed before using it.'],
  reliquary:['The Side Chamber','Belongings have been left in this chamber. Inspect them before choosing what to preserve or take.'],
};
const DUNGEON_LABELS={fight:'Prepare to fight',listen:'Listen carefully',search:'Search the room',parley:'Try to negotiate passage',take:'Take the available supplies',rest:'Rest here',leave:'Leave the dungeon',finish:'Finish the objective',hear_witness:'Ask the person what happened',record_witness:'Write down what they tell you',protect_witness:'Help protect the person here',repair_route:'Repair the passage',aid_only:'Help without taking control',preserve:'Preserve what you found',restore:'Restore what was damaged',salvage:'Take the salvage',finish_public:'Share the discovery publicly',finish_stewardship:'Arrange care for this place',sneak:'Try to slip past',open:'Open the container',disarm:'Try to disarm the trap',rush:'Force your way through',offering:'Leave an offering',trade:'Offer a trade',talk:'Speak with them',descend:'Take the stairs down',return:'Return to the entrance',withdraw:'Withdraw from the descent',study:'Study what you found',repair:'Repair the crossing',record:'Write down the discovery',camp:'Make camp',ascend:'Take the stairs up'};

function dungeonEvent(s,e) {
  const id=s.dungeon?.roomId||e.id.replace(/^dungeon_[a-z_]+_/,'');
  const definition=s.dungeon?.definition,room=definition?.rooms?.find(r=>r.id===id);
  const row=DUNGEON_ROOMS[id]||DUNGEON_ROOMS[room?.kind]||null;
  let body=row?.[1];
  if(!body){const offered=new Set((e.choices||[]).map(c=>c.id));body=offered.has('fight')?'There is danger in the room ahead. Inspect the choices before committing your party to a fight.':offered.has('disarm')?'Something in the passage may be trapped. You can inspect it or choose another offered way through.':offered.has('descend')?'The stairs continue below you. Decide whether to press deeper or return with what you have.':'You have stopped in a dungeon room. Look over the available passages and actions before moving on.';}
  const labels={...DUNGEON_LABELS};
  for(const c of e.choices||[]){
    if(c.id.startsWith('route_')){const target=definition?.rooms?.find(r=>r.id===c.id.slice(6));if(target)labels[c.id]=`Go to ${DUNGEON_ROOMS[target.id]?.[0]||titleCase(target.kind||'the next room')}`;}
  }
  return sceneRow(row?.[0]||'Inside the Dungeon',body,labels);
}

function storyEvent(s,e) {
  const arc=s.stories?.arcs?.find(a=>a.id===s.stories?.pending?.arcId)||s.stories?.arcs?.find(a=>a.status==='active');
  const source=PERSONAL[arc?.id],actor=clean(arc?.personName)||name(s,arc?.personId,'the person who asked for help'),there=place(s,arc?.locationId);
  if(!source)return sceneRow('A Local Request',`${actor} has a request concerning ${there}. Choose only the work you are willing to take on.`,{leave:'Turn down the request',defer:'Come back to this later'});
  const chapter=arc.chapter||0,body=expand(source[1][Math.min(chapter,source[1].length-1)],s,{actor,there});
  // Specific action labels carry captured deed/terms. Keeping them here avoids
  // changing a paid correction into a different act merely to shorten prose.
  return sceneRow(source[0],body,{leave:'Turn down the request',defer:'Come back to this later'});
}

const REGIONAL = {
  rainward_last_lantern:['The Flooded Causeway',['The causeway is flooding. A watch lantern is still burning below the road, and someone may need help reaching dry ground.','The watch needs to understand what happened on the flooded road before blaming the wrong person.','People fleeing the fighting need a safe route through the marsh.','The watch is running short of oil while people still use the causeway at night.','The rain has eased. The local people need to decide how the crossing will be maintained.']],
  saltreach_drowned_feast:['The Wreck Below the Harbor',['A table from a wreck has washed ashore. Local people ask for help finding what happened to the ship.','A diver has reached the wreck and needs help with what they found.','Families in the harbor are being drawn toward the wreck by its magic.','There is a way into the wreck. You must decide how to deal with the danger there.','The harbor is returning to ordinary life. The people involved want a useful place to gather.']],
  highstone_two_hearts:['The Mountain Furnace',['The old furnace has begun making noise although nobody has relit it. The workers need help finding the cause.','The furnace is producing useful iron, but the power underneath it may be harming someone.','Tremors have made the mine unsafe. The workers need a practical response before returning below.','Both furnace chambers are burning. The settlement needs heat without sacrificing the people beneath it.','The immediate danger has passed. The workers want to put the furnace to lasting use.']],
  blackgrove_walking_orchard:['The Moving Orchard',['An orchard tree has moved into the lane. The local people need a safe way to deal with the strange growth.','A creature is waiting at the orchard edge. It has not attacked, but people are afraid to approach.','The orchard’s second crop has made people ill. There is still a need for winter food.','A hollow in the oldest tree has opened. You can investigate what is affecting the orchard.','The fruit is healthy again. People need to decide how the orchard will be used.']],
  ashplain_rain_in_glass:['Water in the Dry Country',['A glassworker has made a pane showing rain where the land is dry. The strange glass may lead to a source of water.','The old well is dry, but the glass shows water below it. The next step needs care.','A thirsty caravan has arrived. The people need water while work on the source continues.','The hidden source can be reached through the ruined tower. You must deal with what is holding it closed.','Water is reaching a small garden. The local people need to decide who will maintain and use the channel.']],
  bellwater_submerged_house:['The House Below the Ferry',['The river has fallen enough to reveal a submerged doorway. Local people want to know what remains of the house.','The ferry bell keeps filling with water. Something from the submerged house is affecting the crossing.','The river is rising while families gather beside the landing. They need a safe place to go.','The old house has opened. Its contents are drifting toward the ferry landing.','The river has settled into a new course. The crossing needs steps and a place for the living to gather.']],
};

function rpgEvent(s,e) {
  const pending=s.rpg?.pending||{},chapter=pending.chapter||0;
  if(pending.kind==='regional'){
    const source=REGIONAL[pending.id],arc=s.rpg?.arcs?.find(a=>a.id===pending.id),speaker=clean(arc?.cast?.speaker?.name)||'A local resident';
    return sceneRow(source?.[0]||'A Request in the Region',`${speaker} meets you in ${place(s,arc?.locationId||pending.locationId)}. ${source?.[1]?.[Math.min(chapter,4)]||'There is local work to discuss. Decide whether to help, take paid work, investigate, or leave it for now.'}`,{leave:'Come back another time'});
  }
  if(pending.kind==='companion'){
    const who=person(s,pending.id),deck=COMPANION_TOPICS[pending.id]||TOPICS.stranger,row=choose(s,`${pending.id}:${chapter}:request`,deck);
    return sceneRow(`A Request from ${clean(who?.name)||'Your Companion'}`,`${clean(who?.name)||'Your companion'} asks for help with the next piece of their own work. “${row[1]}” You can offer help, agree paid work, use the situation for your own gain, or leave the decision for another time.`,{care:'Give your time and supplies',trade:'Agree paid work',scheme:'Use their need for your own gain',leave:'Come back to the request later'});
  }
  if(pending.kind==='faction')return sceneRow('Work with the Faction','The faction’s representative has work available. You can contribute time and supplies, take a paid job, exploit the situation, or leave it for another day.',{care:'Contribute time and supplies',trade:'Take the paid work',scheme:'Use the job for your own gain',leave:'Come back another day'});
  return sceneRow('Work in the Region','Speak with the person offering the work and choose the part you are willing to undertake.',{leave:'Leave for now'});
}

export function groundedEvent(state,event) {
  // This existing named customer's captured reservation terms are the proposal,
  // not generic daily filler. Preserve old generic captures literally as well;
  // the live UI can quote today's requirements without rewriting saved text.
  if(societyCustomerContext(state,event))return {...event};
  // Named night meetings and transformation offers already carry the person,
  // consent options, infection window and exact treatment terms.
  if(['curse_rare_meeting','vampire_offer','lycan_offer'].includes(event?.id))return {...event};
  if(adultChildEventIds.includes(event?.id))return {...event};
  // These versioned faction cases name the actual evidence, actors and saved
  // method. Generic faction filler would erase their concrete instructions and
  // the resulting account in returning agreements. Legacy scenes stay unchanged.
  if(firstMissionSceneProvenance(state,event))return {...event};
  if(preserveResearchEvent(state,event))return {...event};
  if(countingTableSceneProvenance(state,event))return {...event};
  if(preserveOriginEvent(state,event))return {...event};
  if(event?.id==='stories_chapter'&&event.choices?.some(c=>c.narrativeFlavor===STORY_FLAVOR))return {...event,title:'The Family’s Old Debt'};
  if(event?.id==='rpg_regional'&&state.rpg?.pending?.narrativeFlavor===STORY_FLAVOR)return {...event};
  // This exact authored legal scene already names its witness and discloses each
  // response's evidence, fee and oath risks. Never replace it with daily filler.
  if(event?.id==='stories_allegation')return {...event};
  // Keep the existing authored performance and music situations: their choices
  // refer to the correction, listener or tune described in the original body.
  if(event?.id==='pastime_scene'&&/^(performance|music)_[01]$/.test(state.pastimes?.pending?.sceneId||''))return {...event};
  if(event?.id?.startsWith('tournament_')||event?.id?.startsWith('yard_')||event?.id==='rpg_intrigue')return {...event};
  if(event?.id==='repertoire_recall'&&state.repertoire?.pending?.snapshot?.body===event.body&&state.repertoire.pending.snapshot.title===event.title)return {...event};
  const s=state||{},e=event||{},id=clean(e.id),pending=s.travel?.pending,journey=s.timeline?.journey,leg=journey?.legs?.[pending?.legIndex??journey?.legIndex??0];
  let row=EVENTS[id]||SUPERNATURAL[id],extra={};
  if(/^travel_/.test(id)){
    row=ROAD[id.slice(7)]||row;
    extra={from:place(s,leg?.from),to:place(s,leg?.to||journey?.destinationId),traveler:clean(pending?.person?.name)||'A traveler'};
  }else if(/^birth_|^childhood_/.test(id)&&!row)row=childhoodEvent(s,e);
  else if(/^dungeon_/.test(id)||id==='adventure_room')row=dungeonEvent(s,e);
  else if(id==='stories_chapter')row=storyEvent(s,e);
  else if(/^rpg_/.test(id))row=rpgEvent(s,e);
  else if(/^quest_/.test(id)&&!row)row=CAMPAIGN[id.slice(6)];
  else if(/^lore_/.test(id)){
    const note=groundedNote(s,{id:id.slice(5),locationId:s.lore?.pending?.locationId||s.locationId,discovered:true});
    row=sceneRow(note.title,note.text,{record:'Write this in your notes',share:'Share what you learned',follow:'Ask about the next place to visit'});
  }
  if(!row&&/^school_/.test(id))row=schoolEvent(s,e);
  if(!row&&/^family_|^lineage_/.test(id))row=familyEvent(s,e);
  if(!row&&/^social_/.test(id))row=socialEvent(s,e);
  if(!row&&/^pastime_/.test(id))row=pastimeEvent(s,e);
  if(!row&&/^fellowship_|^calling_/.test(id))row=sceneRow('Learning from a Mentor','You meet your mentor to discuss the next part of your training. Choose the work you can commit to, or return when you are ready.',{accept:'Accept the training',defer:'Return another day',service:'Learn through service',independent:'Learn through independent practice',later:'Return another day',stay:'Continue the work',withdraw:'Stop the unfinished work',public:'Share what you learned publicly',private:'Review the work privately'});
  if(!row&&/^society_/.test(id))row=sceneRow('At Work in the Settlement','Someone whose work connects with yours has stopped to speak. Decide what help or paid work you are willing to offer.',{repair:'Help repair the work',teach:'Teach what you know',decline:'Say you cannot take this on',prepare:'Return after preparing',credit:'Share credit for the work',hours:'Agree working hours',boundary:'Say what work you can offer',launch:'Help them start their own trade',stay:'Continue working together',release:'Let them leave the job',independent:'Help them work independently',partner:'Work together as partners',study:'Help with further study',welcome:'Welcome the new neighbor',work:'Offer practical help',private:'Keep to your own household'});
  if(!row&&/^community_/.test(id))row=sceneRow('A Place for the Community','Local people are discussing a service they want to keep running. You can take on the offered work or leave the decision for now.',{open:'Open the service',practice:'Begin with the available work',cancel:'Leave it for now',keep:'Keep the service running',pause:'Close it for now',reopen:'Open it again',handover:'Hand it to a new keeper',listen:'Listen to the people using it',support:'Help with the work',delegate:'Ask someone else to take the work'});
  if(!row&&id==='way_encounter')row=sceneRow('Someone on the Road','You come across someone who needs to decide what to do next. You can help, find out more, take advantage, or pass by.',{care:'Offer practical help',record:'Find out more',exploit:'Take advantage of the situation',leave:'Pass by'});
  const preserveAuthoredChoices=!row;
  if(!row){
    const promise=(s.obligations||[]).find(o=>!o.resolved);
    row=sceneRow(clean(e.title)||(s.phase==='retired'?'The End of This Life':promise&&/deadline/.test(id)?'A Promise Is Due':'A Moment in Your Day'),clean(e.body)||(promise&&/deadline/.test(id)?`A promise is due on day ${promise.dueDay}. Decide whether to stop here and attend to it.`:`You are in ${place(s)}. Consider the offered actions and choose what you want to do next.`));
  }
  let body=expand(row.body,s,extra);
  // The road author captures actual weather, earlier resolutions and any
  // remaining attended response days. A reminder also names the real promise.
  // Keep those time-bound facts rather than reducing them to a generic scene.
  if((/^travel_/.test(id)||['annual_deadline_review','deadline_review','retirement'].includes(id))&&clean(e.body))body=e.body;
  if(id==='health_concern'){
    const condition=[...(s.health?.physical||[]),...(s.health?.mental||[])].find(c=>c.id===s.health?.pending?.conditionId);
    const symptom={infection:'A wound is sore and slow to heal.',fever:'You feel hot, cold, and unusually tired.',injury:'An injury is still painful when you move.',chronic:'The recurring pain and tiredness have been troubling you.',distress:'You have been feeling overwhelmed and finding it difficult to rest.',depression:'Your mood has been low and things you usually enjoy have felt difficult.',anxiety:'Worry and tension have been making it hard to settle.'}[condition?.type];
    if(symptom)body=`${symptom}${clean(e.body)?'\n\n'+e.body:' You can rest, visit a healer, ask for support, or carry on for now.'}`;
  }
  if(id==='life_hunger'&&finite(s.hero?.condition?.hunger))body+=` Your hunger is ${s.hero.condition.hunger}/100.`;
  return {...e,title:expand(row.title,s,extra),body,choices:preserveAuthoredChoices?(e.choices||[]).map(c=>({...c})):replaceChoices(s,e.choices,row.labels,row.descriptions)};
}

function schoolEvent(s,e) {
  const rows={
    school_dilemma:sceneRow('A Problem at Lessons','Something at school needs a decision. You can help, ask more about it, or say what you are willing to do.',{help:'Offer to help',ask:'Ask what happened',boundary:'Say what you can do'}),
    school_exam:sceneRow('The Examination','The examiner is ready to see your work. You can present it now, spend more time studying, or return another day.',{present:'Present your work',revise:'Study before trying again',defer:'Return another day'}),
    school_scholarship:sceneRow('A Place to Study','Your teacher can discuss help with the cost of study. You can apply through study or service, or wait before choosing.',{study:'Apply through study',service:'Apply through service',wait:'Wait for now'}),
    school_project:sceneRow('Choosing a School Project','The teacher asks what you want to work on. You can investigate a question, help someone, or make something useful.',{research:'Investigate a question',care:'Help someone',practical:'Make something useful'}),
    school_path:sceneRow('Your Next Kind of Lesson','The teacher asks which kind of work you would like to explore. This is a direction to try, not a promise to keep forever.',{inquiry:'Pursue further study',service:'Learn through helping people',practical:'Try practical work'}),
  };
  return rows[e.id]||sceneRow('At Lessons','You are meeting your teacher. Choose the lesson or response that suits what you want to learn.');
}
function familyEvent(s,e) {
  const who=name(s,s.lineage?.pending?.personId||s.family?.pending?.personId,'your family');
  if(e.id==='lineage_school')return sceneRow('Lessons for Your Child',`${who} is ready for lessons. You can ask about the public school, shrine teaching, academy study, or wait.`,{public:'Choose public lessons',shrine:'Choose shrine lessons',academy:'Choose academy study',wait:'Wait for now'});
  if(e.id==='lineage_childhood')return sceneRow('Time with Your Child',`${who} has something to show you. Spend a little time helping, listening, or encouraging them to try.`,{care:'Offer care and company',curiosity:'Ask what they are learning',courage:'Encourage them to try'});
  return sceneRow('A Conversation at Home','The people at home need a decision about everyday life. You can help, ask more, or be clear about what you can manage.',{help:'Help with the problem',ask:'Ask what is needed',boundary:'Say what you can manage',inquiry:'Encourage their questions',service:'Help with their project',own:'Let them choose their own direction'});
}
function socialEvent(s,e) {
  const pending=s.social?.pending,ids=pending?.actorIds||[],names=ids.map(id=>clean(s.social?.nodes?.find(p=>p.id===id)?.name)||name(s,id,'a friend'));
  const company=names.length?names.join(' and '):'People you know';
  const bodies={table:'There is a choice about where to sit and whom to spend time with.',dare:'Someone has suggested a dare. You can join, question it, or leave.',notes:'Shared lesson notes have caused a disagreement about who may use them.',rehearsal:'The rehearsal needs help, and people are waiting to decide how to continue.',secret:'Something private has been shared with you. Decide how you will treat it.',festival:'The festival gives you a chance to spend time together.',invitation:'You have been invited to spend time together. You can accept, ask about it, or decline.',household:'An ordinary household decision has brought different wishes into the same room.',sibling:'Your sibling wants to talk about something you share at home.',credit:'Someone’s contribution has been overlooked. Decide whether to raise it.',boundary:'Someone has said what they are comfortable doing. You can ask about it or respect the limit.',care:'Someone needs a little help and company.',achievement:'There is a success worth celebrating.',departure:'Someone is preparing to leave. There is time for practical help or a farewell.',purse:'People disagree about shared money and what it should pay for.',truce:'There is a chance to speak after a disagreement.',echo:'A person you know has brought up something from an earlier meeting.'};
  return sceneRow('Time with People You Know',`${company} ${names.length===1?'is':'are'} here. ${bodies[e.id.slice(7)]||'There is time to talk before you go on with your day.'}`);
}
function pastimeEvent(s,e) {
  if(e.id==='pastime_interest')return sceneRow('Something You Enjoy','Choose something you would like to spend your free time doing.',{manuscripts:'Read and collect books',sketching:'Draw and sketch',music:'Make music',gardening:'Grow a garden',storytelling:'Tell stories',strategy:'Play strategy games'});
  if(e.id==='pastime_pet_choice')return sceneRow('An Animal Companion','The keeper introduces you to the animals in their care. You can offer one a home, wait, or choose how to spend time with the animal you already care for.',{cat:'Offer the cat a home',hound:'Offer the hound a home',raven:'Offer the raven a home',wait:'Wait before taking an animal home',walk:'Go for a walk together',groom:'Brush and care for them',teach:'Practice a familiar trick'});
  if(e.id==='pastime_callback')return sceneRow('Remembering an Afternoon','Someone brings up an earlier afternoon you shared. You can answer, listen to what they remember, or leave it alone.',{answer:'Talk about the afternoon',listen:'Listen to what they remember',leave:'Leave the subject alone'});
  const key=s.pastimes?.pending?.sceneId||'',subject=key.split('_')[0];
  const descriptions={manuscripts:'You have time to read. Something in the book gives you a decision about what to copy, keep, or share.',sketching:'You are working on a drawing. Decide how to finish it and whether to share it.',music:'There is time for music. You can play with someone, practice alone, or simply listen.',gardening:'The garden needs attention. Decide what to grow, tend, or share.',storytelling:'Someone is listening to your story. Decide how you want to tell it.',strategy:'A game is under way. Decide how you want to play.',fair:'You are at a small fair. Choose whether to join in, lend a hand, or watch.',club:'Other learners have gathered for an afternoon together. Decide whether to join them.',prank:'Someone has tried a prank. You can join in, speak up, or put things back.',skip:'There is a lesson to attend and a tempting reason to miss it.',revision:'You have a chance to study before the next examination.',games:'You have stopped at a gaming table. Decide whether to play and what to stake.',night:'There is something happening after the household has settled for the night.',crush:'Someone has shown an interest in you. You can ask what they mean, offer friendship, or keep your distance.',dinner:'A meal gives you time to spend with the people who came.',performance:'You have an audience. Decide how to continue the performance.',pet:'Your animal needs a little time and care.'};
  return sceneRow('An Afternoon of Your Own',descriptions[subject]||'You have a little time for something you enjoy. Choose how you want to spend it.');
}

export function groundedQuest(state,quest,{kind='main'}={}) {
  const s=state||{},q=quest||{},id=clean(q.id).replace(/^quest_/,'').replace(/^invitation:/,'');
  const definition=QUESTS[id],story=PERSONAL[id],destinationId=q.destinationId||q.locationId,where=destinationId?place(s,destinationId,''):clean(q.destinationName)||clean(q.destination),giver=clean(q.giver?.name)||clean(q.personName)||clean(q.client);
  const status=clean(q.status||q.result),closed=['completed','done','abandoned','failed'].includes(status),ready=status==='ready';
  let title,objective,description;
  if(definition){title=definition[0];objective=definition[1];description=clean(q.description)||`${objective}${where?` Go to ${where} to continue.`:''}`;}
  else if(story){title=story[0];objective=`${giver?`Speak with ${giver}`:'Meet the person involved'}${where?` in ${where}`:''} about the next part of this request.`;description=expand(story[1][Math.min(q.chapter||0,story[1].length-1)],s,{actor:giver||'The person involved',there:where||'the settlement'});}
  else if(q.type||q.flavorId||kind==='radiant'||kind==='contract'){
    const target=clean(q.targetName),type=q.type||'';
    title=type==='escort'?`Escort${where?' to '+where:''}`:type==='recovery'?`Recovery${where?' in '+where:''}`:type==='bounty'?`Bounty${target?': '+target:''}`:'A Local Contract';
    objective=ready?`Return to ${giver||'the client'}${q.boardId?` in ${place(s,q.boardId)}`:''} for payment.`:type==='escort'?`Escort the travelers${where?` to ${where}`:''}, then return to ${giver||'the client'}.`:type==='recovery'?`Recover the requested object${where?` at ${where}`:''} and return to ${giver||'the client'}.`:`Deal with ${target||'the named target'}${where?` at ${where}`:''}, then return to ${giver||'the client'}.`;
    description=`${giver?`${giver} is offering this job. `:''}${objective}${finite(q.reward)&&!closed?` The offered payment is ${q.reward} Gold.`:''}`;
  }else if(id&&REGIONAL[id]){title=REGIONAL[id][0];objective=`Meet the people involved${where?` in ${where}`:''} to continue.`;description=REGIONAL[id][1][Math.min(q.chapter||0,4)];}
  else {title=kind==='main'?'The Failing Wards':kind==='side'?'A Local Request':'An Undertaking';objective=`${giver?`Speak with ${giver}`:'Return to the person who offered this work'}${where?` in ${where}`:''} for the next step.`;description=kind==='main'?'Illness in the village leads to an investigation of the old magic protecting the region. Meet the people involved and decide how far you want to follow it.':`This ${closed?'earlier ':' '}request concerns ${where||'a place you have learned about'}.${giver?` ${giver} is the person involved.`:''}`;}
  if(closed)objective=status==='completed'||status==='done'?'This undertaking is complete.':status==='abandoned'?'You left this undertaking before finishing it.':'This undertaking ended without completion.';
  return {title,description,objective,premise:description,brief:description,summary:description};
}

const NOTES = {
  founding:['How the Settlement Began','The local keeper describes the families and workers who built the first houses here. Their old routes still help explain where the town’s roads lead.'],
  academy:['Learning in the Region','Teachers here offer different kinds of lessons. Ask them about entry requirements, sponsorship, and the work a learner must complete.'],
  river:['The Old Crossing','The ferry and bridge have both been repaired after floods. Local workers know which paths are still used and where the water has changed them.'],
  passage:['Travel Through the Gate','The gatekeepers check passage along this road. Ask about the current toll and local rules before setting out.'],
  watchers:['The Warning Towers','The old towers carried warnings between settlements. A tower needs a working signal and people who know when to use it.'],
  sanctuary:['Shelter at the Refuge','The refuge has housed travelers and families during difficult seasons. Its keepers can explain what space and help are available now.'],
  grove:['The Forest Paths','Local guides know paths through the woodland and places where useful herbs grow. Old tunnels and animal dens make some routes dangerous.'],
  archive:['The Buried Collection','Books about the warding magic were kept in an older collection. Some survive below ground, where old guardians still defend the rooms.'],
  mine:['Working the Mountain','The upland sites contain ore and crystals. Guides and miners know the worked ledges and the passages that should be left alone.'],
  cistern:['The Old Water Channels','The settlement’s water passes through channels built before the present houses. Trouble below the marsh can affect the people drinking from them.'],
  receipt:['Cargo at the Ferry','The ferry carried cargo for the city’s warding works. A worker who handled the deliveries may know more about where it went.'],
  stars:['The Full Moon','The lunar cycle helps people prepare for the full moon. Anyone living with a dangerous transformation needs somewhere secure before it arrives.'],
  travelers:['Roads and Resting Places','Travelers rely on places that offer food, repairs, and shelter. Local guides can point out the routes they actually use.'],
  craft:['Trades in the Settlement','The local workshops make and repair things people need every day. Visit the people working there to ask about employment, training, and commissions.'],
  family:['Households and Kin','Families here include birth relatives, adoptive families, and people who make a home together. A household’s present members matter more than an old family name.'],
  storm:['Storms on the Coast','Harbor workers know how storms affect the landing and the roads above it. Ask them about conditions before taking a coastal journey.'],
  commons:['Shared Ground','Local households use some gardens and paths together. Speak with the people tending them before gathering or changing anything.'],
  remedies:['Treatment and Herbs','Healers use gathered ingredients alongside practical care. Visit the clinic when you need treatment, and ask gatherers where supplies can be found.'],
  signals:['How the Watch Gives Warning','The watch uses bells and lights to warn nearby households. Signals are useful only when the route and the people answering them are ready.'],
  millwright:['The Mill and the River','The mill depends on the river and regular repairs. Its workers can explain what work is available and where the machinery has been damaged.'],
  stonework:['The Quarry','The quarry supplies stone for roads and houses. Loose rock makes old galleries dangerous; ask a working guide before going below.'],
  islanders:['The Island Landing','The landing links island households with the harbor. Its workers know the ferry route and what the crossing needs.'],
  border_seals:['The Border Road','Different authorities check travelers along the border. The people working the route can explain which permits and tolls apply.'],
  abbey_letters:['The Abbey’s Books','The abbey preserves books and teaches learners. Its keepers can tell you what may be read and which lessons are available.'],
  orchard_seeds:['The Orchard','The orchard supplies food when the growing season is good. Its workers know how the trees and nearby paths have changed.'],
  crypt_names:['The Burial Place','Families visit the crypt to remember the people buried there. Speak with the keeper before entering closed rooms or moving belongings.'],
  furnace:['The Furnace','The furnace supplies the workshops with metal and heat. Its workers need steady fuel, safe machinery, and paid help.'],
};

export function groundedNote(state,note) {
  const s=state||{},n=note||{},id=clean(n.id||n.entryId).replace(/^lore_/,''),row=NOTES[id];
  if(!row&&clean(n.title)&&clean(n.text))return {title:n.title,text:n.text};
  const where=n.locationId?place(s,n.locationId,''):'',witness=clean(n.witness)||clean(n.witnessName);
  const title=row?.[0]||(/ancestry|heritage/.test(id)?'People and Customs':'A Place You Have Learned About');
  if(n.discovered===false)return {title,text:`You have heard there is more to learn${where?` in ${where}`:''}. Visit the people there and ask about this subject.`};
  return {title,text:`${witness?`${witness} explains: `:''}${row?.[1]||`People${where?` in ${where}`:' here'} keep different customs and stories. Ask them directly about the places, work, and traditions they know.`}${where?`\n\nLearned in ${where}.`:''}`};
}

const RECORD_KINDS={
  life:['A Day in Your Life','an earlier event in your life'],childhood:['Growing Up','an earlier childhood event'],birthday:['A Birthday','a birthday decision'],relationships:['Time with Someone You Know','an earlier interaction'],family:['A Family Event','an earlier household event'],health:['Health and Care','an earlier health event'],quest:['An Undertaking','an earlier quest event'],campaign:['The Warding Investigation','an earlier step in the investigation'],personal:['A Personal Request','an earlier personal request'],rpg:['Work in the Region','an earlier regional event'],adventure:['An Adventure','an earlier adventure'],travel:['A Journey','an earlier journey'],education:['Learning','an earlier lesson or examination'],school:['At School','an earlier school event'],career:['Paid Work','an earlier work event'],work:['Work','an earlier work event'],craft:['At the Workshop','an earlier crafting event'],lore:['Something Learned','an earlier discovery'],fate:['An Unusual Experience','an earlier unusual experience'],curse:['Living with a Transformation','an earlier event involving a transformation'],law:['A Matter for the Watch','an earlier legal event'],justice:['A Matter for the Watch','an earlier legal event'],chronicle:['The Life Ended','the end of this life'],personality:['A Personal Choice','an earlier personal choice'],progress:['Practice and Experience','an earlier change in experience'],oath:['An Oath','an earlier oath-related event'],community:['Life in the Settlement','an earlier community event'],social:['People You Know','an earlier social event'],pastime:['Free Time','an earlier pastime'],lineage:['Family Across the Years','an earlier family event'],sanctuary:['Help and Shelter','an earlier refuge event'],fellowship:['Learning and Companionship','an earlier mentoring event'],trade:['Buying and Selling','an earlier trade'],gear:['Equipment','an earlier equipment change']
};

export function groundedRecord(state,record,{kind='journal'}={}) {
  const s=state||{},r=record||{};
  if(r.narrativeEdition===30&&clean(r.title)&&clean(r.text))return {title:r.title,text:r.text};
  const tag=clean(r.tag||r.kind)||kind,row=RECORD_KINDS[tag]||RECORD_KINDS[kind]||['An Earlier Moment','an earlier event'];
  const when=[finite(r.day)?`Day ${r.day}`:'',finite(r.age)?`age ${r.age}`:''].filter(Boolean).join(', '),where=r.locationId?place(s,r.locationId,''):'';
  const facts=[];
  if(where)facts.push(`Place: ${where}.`);
  if(clean(r.personName))facts.push(`Person involved: ${r.personName}.`);
  if(clean(r.result))facts.push(`Result: ${titleCase(r.result)}.`);
  if(finite(r.completedDays)||finite(r.attendedDays))facts.push(`${r.completedDays??r.attendedDays} days completed${finite(r.totalDays)?` of ${r.totalDays}`:''}.`);
  else if(finite(r.days))facts.push(`${r.days} ${r.days===1?'day':'days'} spent.`);
  if(finite(r.paidGold))facts.push(`${r.paidGold} Gold paid.`);
  else if(finite(r.reward)&&['completed','done'].includes(r.status||r.result))facts.push(`${r.reward} Gold earned.`);
  if(finite(r.cost))facts.push(`${r.cost} Gold cost.`);
  if(r.proof&&finite(r.proof.day))facts.push(`The task was verified on day ${r.proof.day}.`);
  if(r.consequences){const changes=Object.entries(r.consequences).filter(([,v])=>finite(v)&&v!==0).map(([k,v])=>`${titleCase(k)} ${v>0?'+':''}${v}`);if(changes.length)facts.push(changes.join(' · ')+'.');}
  if(clean(r.eventId)&&r.choice){const outcome=groundedOutcome(s,{eventId:r.eventId,choice:r.choice,personName:r.personName,locationId:r.locationId});return {title:row[0],text:`${when?when+'. ':''}${outcome}${facts.length?' '+facts.join(' '):''}`};}
  return {title:row[0],text:`${when?when+'. ':''}This marks ${row[1]}.${facts.length?' '+facts.join(' '):' The earlier choice remains part of this life.'}`};
}

const OUTCOMES = {
  life_trade_shortage:{fair:'You sell the grain at your usual price. Local households can buy their share.',profit:'You sell to the buyers offering the most money. The households left waiting are angry.',reserve:'You put grain aside for the people at home.'},
  life_healer_consent:{consent:'You explain the ritual before asking the patient whether they want it.',living:'You ask another living healer to help.',private:'You stay beside the patient without performing the ritual.'},
  life_scholar_citation:{challenge:'You insist that both researchers are named.',bargain:'You accept the patron’s paid position instead of challenging the missing credit.',publish:'You make the research available in the reading room.'},
  life_soldier_orders:{appeal:'You bring the family’s situation to the captain and ask for an exemption.',waive:'You let the family cross and give your name when challenged.',enforce:'You collect the toll the captain ordered.'},
  life_herbalist_grove:{tend:'You gather mature roots and plant the seeds for another season.',harvest:'You pull the whole patch, including the young roots.',teach:'You show the gardeners where the herbs grow.'},
  life_grove_return:{mentor:'You show the learner how to harvest without stripping the patch.',gather:'You gather the mature herbs for your own use.',festival:'You join friends in celebrating the new growth.'},
  life_family_roof:{hands:'You help mend the leaking roof.',money:'You pay the carpenter to repair the roof.',honest:'You explain what help you can offer and ask the neighbors to lend a hand.'},
  life_friend_ambition:{encourage:'You encourage {person} to try the work they want.',practical:'You and {person} talk through the practical difficulties.',listen:'You listen while {person} explains what excites them about the idea.'},
  life_friend_ward:{home:'You suggest beginning with useful work at home.',clinic:'You suggest learning from the people at the clinic.',craft:'You suggest trying craft work.'},
  life_rival_race:{compete:'You take the challenge and test your skill.',together:'You suggest practicing together instead of keeping score.',watch:'You watch the challenge from the side.'},
  life_lantern_vigil:{all:'You join the gathering at the shrine.',private:'You light a lamp away from the crowd.',family:'You spend the evening with your family.'},
  life_ancestor_chair:{stories:'You listen to stories about the people the household remembers.',permission:'You ask whether the ancestor is willing to join the gathering.',boundary:'You leave the dead at rest and spend the meal with the living.'},
  life_secular_debate:{evidence:'You explain why you trust ideas you can test.',care:'You talk about looking after people in everyday life.',dialogue:'You ask the others how they came to believe what they do.'},
  life_noble_table:{insist:'You ask the hosts to invite the people they left out.',attend:'You attend the dinner as invited.',own:'You hold a supper of your own.'},
  life_budget_feast:{work:'You take work while the celebration is under way.',celebrate:'You spend the evening at the feast.',help:'You help prepare the feast and join the cooks afterward.'},
  life_smuggler_offer:{decline:'You refuse the concealed cargo.',license:'You seek the papers needed to carry the cargo legally.',smuggle:'You carry the goods past customs.'},
  life_receipt_returns:{account:'You pay to put the disputed deal right.',defend:'You defend the deal you made.',pressure:'You pressure the person to drop the complaint.'},
  life_vampire_guest:{dusk:'You ask to arrive after sunset.',truth:'You explain that you have become a vampire.',decline:'You decline the invitation.'},
  life_wolf_confidant:{tell:'You tell {person} about the transformation.',boundary:'You ask to keep the reason for your absences private.',train:'You spend time practicing control.'},
  life_partner_time:{time:'You put your work aside and stay with your partner.',explain:'You explain what has been keeping you busy.',dismiss:'You dismiss your partner’s request for time together.'},
  life_child_school:{public:'You arrange community lessons for your child.',academy:'You pay for academy study.',craft:'You arrange practical lessons for your child.'},
  life_child_question:{show:'You stop and show your child what you are doing.',story:'You tell your child about learning the work.',ask:'You ask your child what they would like to learn.'},
  life_overwork:{rest:'You stop working and give yourself time to recover.',share:'You ask someone to share the work.',push:'You keep working despite being tired.'},
  life_open_hearth:{shelter:'You offer the traveler shelter.',work:'You help the traveler find paid work.',inn:'You offer a room at a stated price.'},
  life_border_story:{around:'You choose the longer route.',survey:'You inspect the disputed crossing.',archive:'You compare the older maps.'},
  life_values:{listen:'You ask what matters to {person}.',share:'You share your own thoughts with {person}.',dismiss:'You bring the conversation to an end.'},
  life_courtship:{yes:'You accept the invitation as a date.',friends:'You ask to keep the relationship as a friendship.',discuss:'You talk about what each of you wants.'},
  life_commitment:{pledge:'You make the commitment to a shared life.',wait:'You ask for more time before committing.'},
  life_separation:{end:'You end the relationship.',stay:'You choose to stay together.'},
  life_courtship_end:{end:'You end the courtship.',stay:'You choose to keep seeing each other.'},
  life_family_start:{adopt:'You ask about adopting a child.',welcome:'You welcome a child into the household.',wait:'You decide to wait before making the household larger.'},
  life_budget:{simplify:'You reduce the household’s expenses.',work:'You take available work to help meet the costs.',pause:'You stop advancing the year to decide what to do next.'},
  career_invoice:{honest:'You explain the charge to the customer.',community:'You arrange help for the customer through the community.',conceal:'You conceal the problem from the customer.'},
  career_staff:{worker:'You hire help for the work.',apprentice:'You take on an apprentice.',decline:'You keep working alone.'},
  career_year:{care:'You put care into the work.',community:'You take work that helps the settlement.',profit:'You focus on the best-paying work.'},
  career_legacy:{community:'You pass the work to the community.',household:'You keep the work in the family.',teach:'You teach others what you have learned.'},
  school_exam:{present:'You present your work to the examiner.',revise:'You return to study before trying again.',defer:'You leave the examination for another day.'},
  school_scholarship:{study:'You pursue support through study.',service:'You pursue support through service.',wait:'You wait before applying.'},
  school_project:{research:'You work on a question you want to understand.',care:'You choose a project that helps someone.',practical:'You choose a practical project.'},
  school_path:{inquiry:'You choose to pursue further study.',service:'You choose to learn through service.',practical:'You choose to try practical work.'},
  health_concern:{rest:'You make time to rest.',care:'You seek help with the symptoms.',support:'You ask someone you trust for support.',routine:'You choose a gentler day.',continue:'You carry on without seeking care for now.'},
  justice_arrest:{surrender:'You go with the watch.',pay:'You pay the offered fine.',flee:'You attempt to escape the watch.',bribe:'You offer a bribe.'},
  lineage_marriage:{vow:'You make your marriage vows.',wait:'You decide to wait before marrying.'},
  lineage_bereavement:{memorial:'You arrange a memorial.',share:'You spend time with other people who are grieving.',private:'You grieve in private.'},
  lineage_adoption:{listen:'You listen to the child before deciding.',offer:'You offer the child a home.',support:'You offer help without adopting.',wait:'You decide to return another day.'},
  travel_bandits:{avoid:'You attempt to take a way around the bandits.',bribe:'You pay for passage.',fight:'You draw your weapons against the bandits.',turn_back:'You turn back along the road.'},
  travel_beasts:{avoid:'You take a quieter route around the animals.',supplies:'You leave supplies to distract the animals.',fight:'You prepare to fight the animals.',turn_back:'You turn back.'},
  travel_weather:{shelter:'You wait under cover before continuing.',press:'You push through the exposed crossing.',turn_back:'You turn back instead of crossing.'},
  travel_caravan:{share:'You share food and conversation with the caravan.',trade:'You trade for supplies with the caravan.',continue:'You leave the caravan and keep walking.'},
  travel_witness:{listen:'You listen to the traveler’s news.',continue:'You thank the traveler and continue.'},
  travel_sick_traveler:{aid:'You stay to help the sick traveler reach shelter.',herb:'You give the traveler a healing herb.',continue:'You explain that you cannot stop and keep moving.'},
  travel_messenger:{aid:'You help mend the messenger’s satchel strap.',ask:'You exchange news of the road.',extort:'You demand money before returning the satchel.',continue:'You leave the messenger to continue the repair.'},
  travel_pilgrims:{pray:'You join the pilgrims’ prayer.',offering:'You contribute to their meal.',continue:'You wish the pilgrims well and continue.'},
  travel_grave_robber:{refuse:'You side with the keeper and refuse the grave goods.',join:'You take a share of the grave goods.',study:'You study the exposed inscription before covering the grave.',continue:'You pass without joining the dispute.'},
  travel_fortune:{study:'You ask the reader how the divining pieces are used.',reading:'You pay for a reading and sit down to tea.',continue:'You leave without a reading.'},
  travel_wagon:{aid:'You help hold and mend the wagon axle.',labor:'You carry the heavy crate for the offered wage.',continue:'You say you cannot stop today.'},
  travel_relic:{donate:'You contribute money to the shrine repairs.',pocket:'You take money from the repair bowl.',rest:'You rest beneath the eaves.',continue:'You leave the shrine and continue.'},
  travel_lore:{record:'You copy the road marker’s inscription.',continue:'You leave the marker and keep walking.'},
  travel_delay:{continue:'You resume the journey.',abandon:'You abandon the unfinished journey.'},
  vampire_offer:{accept:'You accept the transformation into a vampire.',decline:'You refuse the transformation.',later:'You ask for time before deciding.'},
  lycan_offer:{accept:'You accept the wolf’s curse.',decline:'You refuse the transformation.',later:'You ask for time before deciding.'},
  vampire_feeding:{donor:'You feed with a willing donor.',animal:'You use animal blood.',predation:'You attack someone to feed.',abstain:'You refuse to feed.',agreement:'You feed through the donor arrangement.'},
  life_hunger:{donor:'You seek a willing donor.',animal:'You use animal blood.',pause:'You leave the decision open.',endure:'You go another night without feeding.',jailer:'You ask the jailer for an emergency ration.',agreement:'You use the donor arrangement.'},
  lycan_fullmoon:{safe:'You use the prepared refuge for the transformation.',isolate:'You isolate yourself before the transformation.',resist:'You try to resist the transformation.',roam:'You go out into the night.'},
  retirement:{settle:'You settle down and bring this life to its close.',continue:'You decide to keep living this life.'},
  annual_deadline_review:{pause:'You stop advancing the year to attend to the promise.',continue:'You continue the year despite the approaching deadline.'},
};

const DEED_OUTCOMES={
  restore_credit:'You correct the credit and name the person who did the work.',share_credit:'You keep both contributors’ names on the work.',take_credit:'You claim someone else’s work as your own.',unpaid_work:'You require someone to work without the pay they were owed.',pay_arrears:'You pay the wages that were owed.',false_report:'You make a false accusation about another person’s work.',suppress_account:'You suppress the other person’s version of what happened.',exclude_archive:'You restrict access to the shared teaching materials.',restore_access:'You open access to the teaching materials.',restore_credit_access:'You restore the maker’s credit and open access to their work.',sell_route:'You sell a traveler’s private route.',release_route:'You give up control of the traveler’s route.',exclude_gate:'You restrict who may use the shelter.',open_gate:'You open the shelter through a shared arrangement.',bounded_inspection:'You complete the limited inspection you agreed to do.',independent_review:'You fund an independent review of the dispute.',independent_reference:'You give a reference for work you have actually seen.',independent_copy:'You fund a separately held copy of the teaching materials.',shelter_limit:'You help arrange shelter for the agreed time.',paid_work:'You agree to paid work with stated hours.',priced_door:'You arrange rooms at clearly stated prices.'
};

export function groundedOutcome(state,{eventId='',choice,personName,locationId}={}) {
  const s=state||{},c=typeof choice==='string'?{id:choice}:choice||{},id=clean(eventId),who=clean(personName)||'the person involved';
  if(adultChildEventIds.includes(id)){const p=s.lineage?.people.find(p=>p.id===s.lineage.pending?.sourcePersonId);return adultChildChoiceOutcome(s,p,id,c.id);}
  if(id==='birth_adult_year'){
    const family=c.effect?.familyRoleplay;
    if(family){
      const relative=name(s,family.personId,clean(s.lineage?.people?.find(p=>p.id===family.personId)?.name)||who);
      const rows={partner_time:[`You make time for a regular evening with ${relative}.`,`You and ${relative} talk through the work and time you each need.`,`You explain the busy season to ${relative} and acknowledge what it costs your time together.`],elder_care:[`You help ${relative} with the errand they asked about.`,`You listen while ${relative} tells a story they want to share.`,`You and ${relative} complete a small practical task together.`],widow_memory:[`You share a particular memory of ${relative}.`,`You write down a story from ${relative}’s life.`,`You remember ${relative} privately before returning to your work.`]};
      const index=['care','curiosity','courage'].indexOf(c.id);
      const answer=(rows[family.kind]||[`You listen to ${relative} and support the interest they bring.`,`You and ${relative} explore the question together.`,`You help ${relative} try a safe practical task.`])[Math.max(0,index)];
      const child=family.kind==='adult_child'&&s.lineage?.people.find(p=>p.source==='child'&&p.localId===family.personId),adult=child&&adultChildLifeView(s,child);
      return adult?`${answer} ${adult.summary} ${adult.support}`:answer;
    }
    const row=adultRow(s),index=['care','curiosity','courage'].indexOf(c.id);
    if(row&&index>=0)return expand(row[4][index],s);
  }
  const known=OUTCOMES[id]?.[c.id];
  if(known)return known.replaceAll('{person}',who);
  if(DEED_OUTCOMES[c.deed])return DEED_OUTCOMES[c.deed];
  const captured=s.timeline?.storybook?.pending?.scene,childRow=CHILDHOOD[c.sceneId||captured?.id||id];
  if(childRow){
    const index=['care','curiosity','courage'].indexOf(c.id),label=childRow[2][index<0?0:index];
    return (s.age||0)<3?`${kinName(s)} chooses to ${label.charAt(0).toLowerCase()+label.slice(1)}.`:`You ${label.charAt(0).toLowerCase()+label.slice(1)}.`;
  }
  if(id==='stories_chapter'&&c.id==='leave')return 'You leave this story behind. Earlier choices remain, but no further chapter or reward is claimed.';
  if(id==='stories_chapter'&&c.id==='defer')return 'You put the proposal aside. The story remains active in your Journal; no time, fee or reward was taken.';
  if(c.id==='leave'||c.id==='decline'||c.id==='defer'||c.id==='later')return 'You leave this for another time.';
  if(c.id==='withdraw'||c.id==='cancel')return 'You stop the unfinished work.';
  if(c.id==='fight')return 'You choose to fight. The encounter determines what happens next.';
  if(c.id==='ask'||c.id==='listen'||c.id==='hear')return `You stop to listen to ${who}.`;
  if(c.id==='share')return `You share your news with ${who}.`;
  if(c.id==='tease')return `You try a joke with ${who}.`;
  if(c.id==='care'||c.id==='aid')return `You give your time to help${who==='the person involved'?'':` ${who}`}${locationId?` in ${place(s,locationId)}`:''}.`;
  if(c.id==='enterprise'||c.id==='trade')return 'You undertake the paid work you agreed to do.';
  if(c.id==='coercion'||c.id==='scheme'||c.id==='pressure')return 'You use the other person’s need to get what you want.';
  const e=groundedEvent(s,{id,choices:[c]}),newLabel=e.choices?.[0]?.label;
  // A chosen action is known; its success may not be. Never turn an opaque old
  // result into a successful cure, repair, kill, payment, or reconciliation.
  const safeLabel=clean(newLabel)&&newLabel!==c.label?newLabel:null;
  return safeLabel?`You choose to ${safeLabel.charAt(0).toLowerCase()+safeLabel.slice(1)}.`:'You make your choice and continue from there.';
}
