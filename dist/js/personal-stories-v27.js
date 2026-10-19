// Authored content. Gameplay applies typed effects and saves decisions separately.
export const PERSONAL_STORIES_V27 = {
  "newFamilies": [
    {
      "id": "marriage_second_chair",
      "title": "The Second Chair",
      "kind": "household",
      "minAge": 22,
      "skill": "persuasion",
      "actorRole": "partner",
      "eligibleNote": "Start only with an existing living adult partner present at the inhabited home settlement; no invented affair or automatic infidelity. The rival is an unnamed adult artisan, not a newly created named contact. Later chapters read saved correspondence; if the partner dies, address the surviving workshop and household, without changing the dead partner bond.",
      "chapters": [
        [
          "A second chair has appeared at the household table in {place}. It belongs to an artisan who has asked your partner to exhibit work at the autumn fair. In a folded note, {name} writes, \"They looked at what I made. You asked whether supper was ready.\" Nothing in the note mentions an affair. That almost makes the small jealousy worse. The artisan has brought a ridiculous velvet cap as a gift, and everyone except you seems able to laugh at it. Your own days have their demands too; the unused chair asks whose ambitions fit beside them.",
          {
            "label": "Make room for their work and name your jealousy",
            "outcome": "You clear a working corner and admit the feeling without making it an accusation. The household gains a shared workshop; affection still depends on how you use it.",
            "effect": "workshop"
          },
          {
            "label": "Offer to arrange the exhibition as a business",
            "outcome": "You propose selling space at the fair and making your own contribution visible. The exhibition becomes a joint venture, with ambition joining the household before tenderness does.",
            "effect": "market"
          },
          {
            "label": "Make the artisan unwelcome and take the best work",
            "outcome": "You turn the visitor away and claim the household pieces for your own display. The workshop remains useful, but its shut door becomes a remembered act of possession.",
            "effect": "claim"
          }
        ],
        [
          "Among the papers from the exhibition lies a sketch signed by {name}: two people sharing one enormous coat, each pulling toward a different road. Beneath it someone has written, \"A marriage, probably.\" The joke has traveled farther than the artist intended. At {place}, a new commission would keep its maker away through a whole season. You could prepare the household for that absence, manage the commission for profit, or make leaving costly. The old exhibition decision matters here: a shared space, a commercial bargain, or a confiscated piece cannot all be remembered as the same beginning.",
          {
            "label": "Prepare a household that can bear the absence",
            "outcome": "You arrange practical help and preserve a place for the returning artist. The workroom becomes easier to share; being missed is allowed to feel different from being abandoned.",
            "effect": "shelter"
          },
          {
            "label": "Turn the commission into an independent partnership",
            "outcome": "You separate the household duties from the commission and seek a share for your actual work. The workshop trades under several contributions rather than one married name.",
            "effect": "workshop"
          },
          {
            "label": "Threaten to display the private sketch as a scandal",
            "outcome": "You make the private joke your leverage over the commission. The work may continue, but future letters arrive carefully worded and the laughing coat disappears from public view.",
            "effect": "blackmail"
          }
        ],
        [
          "The household chest at {place} now contains two kinds of letter: news of ordinary days and arguments about the work. One saved line from {name} says, \"I do not want every kindness weighed against every absence.\" A commission has failed, leaving a useful room and several disappointed workers. Your earlier decisions explain why those workers trusted the household, paid to enter it, or feared being excluded. There is no proof of a secret lover in these papers. There is plenty of proof that people can wound one another while talking about something else entirely.",
          {
            "label": "Use the room to help the displaced workers",
            "outcome": "You open the room to the workers while protecting the household space. A failed commission becomes temporary shelter, and the old letters stay private instead of becoming weapons.",
            "effect": "shelter"
          },
          {
            "label": "Rebuild the venture around smaller commissions",
            "outcome": "You offer smaller commissions the workshop can actually finish. The household gains a steadier trade, though the old letters cannot guarantee that everyone wants the same future.",
            "effect": "workshop"
          },
          {
            "label": "Keep the room by blaming the absent artist",
            "outcome": "You put the failure on the artist named in the old letters and retain control of the room. The workers remember your version as an accusation, not an established truth.",
            "effect": "claim"
          }
        ],
        [
          "A younger worker asks which portrait to hang above the workshop hearth at {place}. One is flattering, one is severe, and a third shows the ridiculous velvet cap. On its reverse is a remembered remark from {name}: \"If they paint us solemn, tell them we were sometimes fools.\" The choice concerns more than a picture. Your household venture has given other people a model of how love, work and rivalry might live together. Some remember generosity, some remember a price, and some remember a locked door. None of those memories can be corrected merely by choosing a handsome face.",
          {
            "label": "Hang the foolish portrait beside several workers’ names",
            "outcome": "You make room for humor and shared contribution above the hearth. The workshop becomes a place where a useful life need not be edited into a flawless legend.",
            "effect": "school"
          },
          {
            "label": "Keep the portraits private and establish a trade hall",
            "outcome": "You preserve the household pictures and organize a hall for current commissions. The business can continue without selling intimate memories as part of its public reputation.",
            "effect": "market"
          },
          {
            "label": "Commission a grand portrait crediting only you",
            "outcome": "You turn the household venture into your personal monument. The hall displays the version you paid for; workers preserve less flattering memories away from its polished frame.",
            "effect": "claim"
          }
        ],
        [
          "The second chair finally needs mending. Its legs have been cut down twice, its seat replaced once, and a carved line underneath still names the first exhibition. At {place}, people ask who should inherit the workshop when your household no longer needs it. The letters from {name} offer no simple answer: affection, rivalry and exhaustion share the same handwriting. You could pass on a room where independent work is welcome, preserve a business under several names, or make access depend on devotion to yours. The chair has outlasted the joke. What it held is still yours to choose.",
          {
            "label": "Give the room to workers who can choose their own lives",
            "outcome": "You pass the workshop to its working occupants and keep the household letters together. The second chair remains useful without requiring the next generation to repeat your marriage.",
            "effect": "workshop"
          },
          {
            "label": "Leave a continuing business with shared attribution",
            "outcome": "You establish a trade venture whose contributors keep their own names. The workshop survives as work people can enter or leave, with the intimate papers held separately.",
            "effect": "market"
          },
          {
            "label": "Make the room a shrine to your household authority",
            "outcome": "You reserve the room for those who praise your account of the marriage. The chair becomes an emblem of obedience, while other memories continue outside your chosen walls.",
            "effect": "claim"
          }
        ]
      ]
    },
    {
      "id": "festival_hollow_lantern",
      "title": "The Hollow Lantern Fair",
      "kind": "place",
      "minAge": 18,
      "skill": "survival",
      "actorRole": "neighbor",
      "eligibleNote": "Start only in an inhabited settlement with services and a present living adult neighbor or friend. It is a local voluntary fair, not a universal religious rite. No living person is automatically killed, possessed or accused; danger, ward and market outcomes must remain bounded to this story site.",
      "chapters": [
        [
          "The lantern fair at {place} begins with a contest to make the ugliest goat from wicker. The reigning champion has given its creation six knees. In a note about the preparations, {name} complains that the real goats are offended. Then a lantern goes dark from the inside. Its flame still shines on the hands holding it, but the paper shell contains a moving patch of night. The celebrants call it a clever trick until it whispers the next line of a song nobody has begun singing. The fairground can be guarded, exploited as an attraction, or frightened into paying for your protection.",
          {
            "label": "Quietly guard the lantern and keep the fair welcoming",
            "outcome": "You separate the strange lantern from the games and arrange a cautious watch. The fair keeps its foolish goats while the dark shell receives an actual boundary.",
            "effect": "ward"
          },
          {
            "label": "Offer a guarded exhibition away from the crowds",
            "outcome": "You establish a separate attraction with a watched approach. Curious visitors can choose to attend, and the ordinary market remains distinct from the unsettling lantern.",
            "effect": "market"
          },
          {
            "label": "Let the whisper spread and charge for safety",
            "outcome": "You encourage frightened celebrants to buy your protection from the whisper. The fair continues under your influence; the darkness becomes leverage rather than a solved danger.",
            "effect": "blackmail"
          }
        ],
        [
          "When the fair returns to {place}, a saved preparation list from {name} contains the words \"NO MORE KNEES\" in unusually heavy ink. Below them is a smaller warning: the dark lantern copied the voices of people who stood nearest it. A current fairkeeper has heard laughter in an empty booth, repeating the exact laughter of last year. There is no evidence that the people themselves are trapped. The sound nevertheless draws listeners away from the lit paths. Your earlier arrangement determines whether they expect a safe gathering, a profitable show, or another demand disguised as protection.",
          {
            "label": "Build a lit return path and keep listeners together",
            "outcome": "You mark a clear path back to the fair and keep the echoing booth under watch. The copied laughter loses its power to separate curious visitors from the crowd.",
            "effect": "route"
          },
          {
            "label": "Stage a smaller show with a guarded entrance",
            "outcome": "You move the attraction to one watched booth and limit its audience. The market gains a strange performance whose promised boundaries can be checked by the fairkeepers.",
            "effect": "market"
          },
          {
            "label": "Claim only your clients can safely hear the voices",
            "outcome": "You advertise protection you cannot prove and use the copied laughter to support it. The fairkeepers remember the claim as yours; the echo supplies no proof of safety.",
            "effect": "blackmail"
          }
        ],
        [
          "A storm has ruined the painted booths at {place}, exposing an older ring of lantern hooks below them. A fairkeeper reads from {name}’s earlier note: \"It learns an audience faster than we learn a warning.\" The strange shell now shows an empty festival lit by hundreds of tiny flames. Something walks between them carrying a goat with too many knees. Nobody can say whether it remembers your fair or borrowed the shape from a frightened mind. The damaged hooks provide a place to ward the image, build a careful attraction, or threaten the rebuilding crews with what might emerge.",
          {
            "label": "Help the crews rebuild around a contained lantern ring",
            "outcome": "You repair the lit fairground and establish a warded boundary around the old hooks. The unsettling image remains separate from the paths used by ordinary celebrants.",
            "effect": "ward"
          },
          {
            "label": "Fund a watched pavilion for willing spectators",
            "outcome": "You organize a pavilion with an entrance the keepers can close. Its revenue supports rebuilding, while the lantern ring remains a strange sight rather than an open crossing.",
            "effect": "market"
          },
          {
            "label": "Demand a share of every booth to keep the ring quiet",
            "outcome": "You turn the damaged hooks into a threat against the crews. The rebuilding proceeds beneath your demands; no keeper mistakes the threatened emergence for a verified prophecy.",
            "effect": "claim"
          }
        ],
        [
          "The fair now has a quieter hour before the musicians begin. At {place}, children watch adults mend the wicker animals and argue about which knee was least necessary. A phrase from {name}’s old note has become a local joke: \"We survived the goat; mind the lantern.\" The shell shows that same quiet hour, although its figures have no faces. A boothkeeper proposes letting mourners look for familiar silhouettes inside it. The image has never proved itself a messenger from the dead. It could remain a guarded curiosity, become a respectful theater, or be sold as certainty to people desperate for a reply.",
          {
            "label": "Keep the quiet hour for ordinary company and comfort",
            "outcome": "You make a sheltered corner for people who need company before the noise begins. The lantern remains guarded, and nobody must buy a supernatural explanation for their grief.",
            "effect": "shelter"
          },
          {
            "label": "Create a theater that admits the image’s uncertainty",
            "outcome": "You organize performances around the strange silhouettes without claiming they are the dead. The pavilion earns its place through art and watchful staging rather than false revelations.",
            "effect": "school"
          },
          {
            "label": "Sell guaranteed messages from the faceless figures",
            "outcome": "You sell certainty the lantern has never supplied. The buyers receive performances and your claims; some keep those claims to confront you when the promised answers fail.",
            "effect": "blackmail"
          }
        ],
        [
          "On the night chosen to retire the old lantern at {place}, the image inside it becomes an empty road. Its little flames extinguish one by one. The surviving fair notes, including {name}’s jokes, suggest that the thing grew stronger whenever people mistook a borrowed voice for a promise. The current keepers ask what should remain: a fair that acknowledges its frightening history, a watched theater with honest limits, or an enduring source of fear held under your control. Beyond the pavilion, someone has made a wicker goat with two entirely sensible knees. The crowd finds this disappointing.",
          {
            "label": "Close the crossing and preserve the fair’s ordinary joy",
            "outcome": "You complete a careful closing watch and leave the fairground to its living visitors. The old notes remain a warning, while the lantern’s empty road receives no new audience.",
            "effect": "ward"
          },
          {
            "label": "Retain a guarded theater without promises of revelation",
            "outcome": "You establish a continuing pavilion for art and willing curiosity. Its keepers preserve the warnings beside the attraction and close the display whenever the boundary fails.",
            "effect": "market"
          },
          {
            "label": "Reserve the lantern and make future fairs answer to you",
            "outcome": "You retain the dark shell as the basis of your authority over the fair. The keepers preserve the history of your demands alongside the older warnings.",
            "effect": "claim"
          }
        ]
      ]
    },
    {
      "id": "deserter_unfinished_boot",
      "title": "The Unfinished Boot",
      "kind": "road",
      "minAge": 20,
      "skill": "defense",
      "actorRole": "neighbor",
      "eligibleNote": "Start only while an actual local or adjacent war/occupation is active, at an inhabited settlement with a present living adult contact. The deserter is an unnamed adult stranger whose claim is unverified, not an invented confirmed atrocity witness. Never fabricate a king, regiment, regional law, victory or death. Later letters can survive absence; smuggling/crime outcomes require actual law handling by the engine.",
      "chapters": [
        [
          "An exhausted stranger comes to {place} carrying one boot and wearing the other. The missing sole hangs from a cord at their belt. A note left with {name} records the stranger’s explanation: \"I finished the march. They said there was another.\" Their old military coat has been turned inside out, but the stitches still show where its badge was removed. They claim to have deserted rather than burn an occupied granary. You have no witness who can prove that claim. What you do have is a wounded foot, a nearby conflict, and a person asking to sleep before being questioned.",
          {
            "label": "Give shelter and treatment before deciding whom to trust",
            "outcome": "You arrange a bed and care for the wounded foot. The shelter does not establish the stranger’s story as true or promise protection from every consequence of the conflict.",
            "effect": "clinic"
          },
          {
            "label": "Offer paid civilian work away from military service",
            "outcome": "You help the stranger take bounded civilian work while their claim remains unverified. The workshop receives a worker rather than an obligation to excuse a whole military past.",
            "effect": "workshop"
          },
          {
            "label": "Hold the stranger’s coat as leverage for secret work",
            "outcome": "You keep the identifying coat and make the stranger’s freedom depend on errands. The route you gain rests on coercion, and the stranger remembers who held the evidence.",
            "effect": "smuggling"
          }
        ],
        [
          "The boot has been mended badly enough to resemble a small sleeping beast. In a letter saved through {name}, the stranger jokes that it now deserves rations of its own. They have begun carrying supplies between households harmed by the conflict near {place}. A trader offers to use the same journey for undeclared goods. A frightened household asks for one more sack of flour. Neither request proves the stranger’s original account of desertion. Your earlier choice has made this route a refuge, a livelihood, or something owed to you; the new cargo will show what that means.",
          {
            "label": "Keep the journey devoted to displaced households",
            "outcome": "You help keep the supply route open for households suffering from the conflict. Relief carries its actual cargo and claims no proof that the stranger’s military story was righteous.",
            "effect": "war_relief"
          },
          {
            "label": "Establish a civilian transport venture with visible cargo",
            "outcome": "You organize transport work whose loads can be inspected by its participants. The route becomes a livelihood, with relief and trade distinguished rather than hidden beneath one name.",
            "effect": "route"
          },
          {
            "label": "Use the relief journey to conceal your own contraband",
            "outcome": "You hide a second trade beneath the relief cargo. The stranger’s route becomes vulnerable to discovery, and the households depending on it do not automatically know your scheme.",
            "effect": "smuggling"
          }
        ],
        [
          "A folded scrap in the route chest names a place the stranger refuses to revisit. It was kept with {name}’s earlier papers, not presented as a new confession. A current carrier says patrols have begun asking about travelers with altered military coats near {place}. The conflict has made many such coats common. You could move the household deliveries onto safer paths, separate the trade from the relief work, or use fear of recognition to tighten your hold on the route. The old boot sits beside the chest, its ridiculous repairs now copied in several newer pairs.",
          {
            "label": "Help the carriers choose a safer relief path",
            "outcome": "You help reroute household deliveries around the known danger. The change protects actual carriers without claiming that every patrol is hostile or every altered coat hides a deserter.",
            "effect": "war_relief"
          },
          {
            "label": "Separate the relief path from the commercial route",
            "outcome": "You divide the cargo arrangements so one venture does not secretly endanger the other. The civilian trade retains its own route and the households can judge its offers.",
            "effect": "route"
          },
          {
            "label": "Threaten recognition unless the route answers to you",
            "outcome": "You use the scrap and coat history to strengthen your control. The threat reaches the people you address; it does not turn your private suspicion into universal public knowledge.",
            "effect": "blackmail"
          }
        ],
        [
          "Someone has carved a tiny boot above the route shelter at {place}. Below it, an earlier remark preserved in {name}’s papers reads, \"Let this door stop marching people for a night.\" The shelter now receives travelers from more than one side of the conflict. Some are grieving; some boast of deeds they will not describe. A current keeper wants a rule that would exclude anyone with an old military coat. Another worries that the rule would shut out half the hungry road. You must decide how the place treats people whose histories cannot be made clean at the threshold.",
          {
            "label": "Keep refuge open while addressing actual threats",
            "outcome": "You support shelter for weary travelers and a response to specific dangerous conduct. An old coat alone no longer decides admission, though the refuge cannot promise safety from every conflict.",
            "effect": "shelter"
          },
          {
            "label": "Maintain a civilian waystation for bounded stays",
            "outcome": "You establish a waystation with practical limits on space and supplies. Travelers receive rest without the business claiming to judge every war story brought through its door.",
            "effect": "route"
          },
          {
            "label": "Sell exceptions to an exclusion you impose",
            "outcome": "You make the military-coat rule a source of private payments. The refuge becomes selective under your authority, and the keepers retain the history of who was turned away.",
            "effect": "claim"
          }
        ],
        [
          "The old boot at {place} has lost its sole again. This time nobody thinks it worth repairing; they want to hang it above the door. In the papers associated with {name}, the stranger’s first story remains a claim, alongside years of actual deliveries. The two are not the same kind of evidence. The route’s future could belong to the people who carry relief, to an independent trade, or to someone who keeps its secrets as an inheritance. The conflict may have changed since the first arrival. The shelter still needs an answer about what this particular road should carry onward.",
          {
            "label": "Pass the relief route to its working households",
            "outcome": "You leave the route to those carrying its relief and retain the uncertain first account as uncertain. The mended boot remembers useful work without declaring a spotless military life.",
            "effect": "war_relief"
          },
          {
            "label": "Build an independent transport house from the route",
            "outcome": "You establish a continuing civilian venture with its own workers and visible cargo. The shelter keeps its earlier history while future livelihoods need not depend on one stranger’s story.",
            "effect": "route"
          },
          {
            "label": "Keep the route’s secrets as a private source of power",
            "outcome": "You preserve leverage over the carriers and reserve the route for your purposes. The boot becomes an emblem of a road whose travelers still pay for your permission.",
            "effect": "smuggling"
          }
        ]
      ]
    },
    {
      "id": "false_accusation_ash_coat",
      "title": "Ash on the Wrong Coat",
      "kind": "rivalry",
      "minAge": 18,
      "skill": "scholarship",
      "actorRole": "friend",
      "eligibleNote": "Start with an existing living local adult friend or colleague, at an inhabited settlement. The opening accusation is explicitly unsupported and creates no proven crime or automatic arrest. After initiation, use the saved accusation or the affected workshop; do not have a dead participant testify. Any engine legal effect must be evidence-specific and regional.",
      "chapters": [
        [
          "A workshop fire at {place} leaves everyone smelling of smoke. An accusation is scrawled on a scorched shutter: {name}’s name, followed by a drawing of a knife. The accuser says the wrong coat was seen near the door. Half the neighborhood wears patched coats in the same color. A note from the affected household asks you to look at what actually burned before the argument becomes a punishment. There is no surviving witness who claims to have seen the fire started. The person being blamed is frightened; the people who lost their work are angry enough to want an answer anyway.",
          {
            "label": "Help the affected household examine the damaged work",
            "outcome": "You assist the household in separating what can be observed from the accusation. The workshop begins recovering, and the named person’s guilt remains unproved rather than quietly assumed.",
            "effect": "workshop"
          },
          {
            "label": "Offer to organize repairs without endorsing the charge",
            "outcome": "You arrange a repair venture with the household and keep the accusation outside its promises. The damaged workshop gains practical help before anyone has solved the fire’s cause.",
            "effect": "workshop"
          },
          {
            "label": "Use the accusation to demand favors from its target",
            "outcome": "You make the unsupported charge your leverage over the named person. Their fear becomes useful to you, while the fire’s cause remains unknown to anyone without further evidence.",
            "effect": "blackmail"
          }
        ],
        [
          "Under a bench in the recovering workshop, someone finds a lamp with a split reservoir. It could have leaked; it could have been broken after the fire. A surviving note from {name} says, \"I wish an honest answer made people less hungry for a culprit.\" At {place}, the shutter has become a place where strangers add accusations of their own. The household that lost its work wants it removed, but fears being called ungrateful to its defenders. Your earlier choice determines whether you stand beside a recovery effort, manage its trade, or profit from the uncertainty.",
          {
            "label": "Restore the workshop and remove the accusation board",
            "outcome": "You help the household take back its doorway and preserve the lamp without calling it a solved cause. The accusation loses its public stage, while actual losses remain acknowledged.",
            "effect": "workshop"
          },
          {
            "label": "Make the repairs a teaching project about fire safety",
            "outcome": "You turn the damaged room into practical lessons on lamps and repairs. The school addresses preventable danger without pretending that a lesson settles who caused this fire.",
            "effect": "school"
          },
          {
            "label": "Keep the shutter and sell names a place beneath it",
            "outcome": "You profit by expanding the accusation board. People you target can know what you demand; strangers elsewhere do not magically learn the accusations or accept them as true.",
            "effect": "blackmail"
          }
        ],
        [
          "The repaired workshop at {place} has produced its first beautiful thing since the fire: a bowl glazed in uneven gold. Its maker wants to give it to the household once accused, but another worker calls that an insult to the people who lost everything. In the old correspondence, {name} describes a wish to be ordinary again, \"not the innocent one in every story.\" The bowl sits between those wishes. You can help it become a gift freely offered, a traded piece whose maker speaks for the work, or a symbol used to compel forgiveness nobody has promised.",
          {
            "label": "Offer the bowl without requiring forgiveness in return",
            "outcome": "You support a gift whose recipient may accept or refuse it. The workshop gains a gesture of repair without making anyone’s grief or fear an obligation to reconcile.",
            "effect": "none"
          },
          {
            "label": "Let the maker sell the bowl and fund new work",
            "outcome": "You place the bowl in the workshop’s trade and use its value to support current makers. The venture moves forward without selling a claim that the accusation was resolved.",
            "effect": "market"
          },
          {
            "label": "Demand public gratitude from those you helped",
            "outcome": "You make past assistance the price of a flattering public gesture. The named households remember the demand; their compliance does not establish forgiveness or disprove the original accusation.",
            "effect": "claim"
          }
        ],
        [
          "A play performed near the workshop at {place} includes a villain with a patched coat. The audience laughs before the actor has spoken. A sentence preserved from {name}’s old note has reached the troupe: \"Give the fire a face and nobody need look at the lamp.\" The playwright claims the story is harmless because no name is used. The workshop’s current makers disagree about whether to stop the play, answer it with their own account, or buy the popular ending. Their own rooms still contain the cracked lamp and the pieces that survived.",
          {
            "label": "Help the makers tell a story that leaves the cause open",
            "outcome": "You support a performance about loss, suspicion and rebuilding. The audience receives a more difficult ending, and the workshop keeps its actual artifacts without turning them into a verdict.",
            "effect": "school"
          },
          {
            "label": "Sponsor a different play centered on the new workshop",
            "outcome": "You fund a story about the makers’ current work rather than buying the accusation’s fame. The troupe gains a commission and the recovering room keeps a future beyond the fire.",
            "effect": "market"
          },
          {
            "label": "Buy the popular ending and profit from the suspicion",
            "outcome": "You sponsor the patched-coat villain and trade on a familiar accusation. The audience hears a performance, while the households affected retain their own accounts of what was never proved.",
            "effect": "blackmail"
          }
        ],
        [
          "The scorched shutter has become brittle at its edges. At {place}, the workshop keepers ask whether to burn it, display it, or leave it locked away. In the saved papers associated with {name}, the last relevant line reads, \"If they remember me, I hope I did something besides being blamed.\" No new witness has solved the old fire. There are, however, years of work after it: mended lamps, bowls, lessons, grudges and whatever influence you chose to build. The final choice is about what this place teaches people to do when certainty is tempting and absent.",
          {
            "label": "Display the shutter as a warning beside the rebuilt work",
            "outcome": "You preserve the unsupported accusation alongside the workshop’s recovery. The room teaches caution without demanding that one named person spend eternity serving as its example of innocence.",
            "effect": "school"
          },
          {
            "label": "Retire the shutter and keep the workshop trading",
            "outcome": "You put the old accusation away and support the makers’ continuing venture. The surviving papers remain available without making the fire the first story told about every piece.",
            "effect": "workshop"
          },
          {
            "label": "Reserve the accusation for the leverage it still offers",
            "outcome": "You keep the shutter and its uncertain history under your control. The workshop survives, but you choose to inherit a weapon of suspicion instead of putting it down.",
            "effect": "blackmail"
          }
        ]
      ]
    },
    {
      "id": "child_other_road",
      "title": "The Road That Is Not Yours",
      "kind": "legacy",
      "minAge": 36,
      "skill": "persuasion",
      "actorRole": "adult_child",
      "eligibleNote": "Start only with an existing living child whose actual age is at least 18, present at the inhabited home settlement, and a hero age of at least 36. The child must not already be dead, missing or bound to an incompatible scene. Refer to their own saved name as actor; do not grant marriage, a profession, travel arrival or a new child automatically. Later correspondence can remain after death and no relationship gain applies to a dead child.",
      "chapters": [
        [
          "Your adult child has packed badly: three shirts, one cup, and a stone that has apparently become essential. In a note placed under the cup, {name} writes, \"I am going to find out whether I am brave away from you.\" They have not yet left {place}. Their imagined future may follow your old ambitions, or become something you have never tried. You remember the stone from years ago and almost ask why it must travel. What you really want to ask is whether home has failed them. The road offers no answer, only space in which another life might begin.",
          {
            "label": "Help prepare the journey and leave a welcome behind",
            "outcome": "You help prepare for a possible departure and make clear that returning need not mean failure. The household door becomes a refuge rather than a promise that the road will be safe.",
            "effect": "shelter"
          },
          {
            "label": "Offer a bounded family venture they may accept or refuse",
            "outcome": "You propose work tied to the household while leaving room for an independent future. The workshop gains an offer of partnership, not automatic authority over your adult child’s plans.",
            "effect": "workshop"
          },
          {
            "label": "Make their keepsakes collateral for staying",
            "outcome": "You withhold the packed keepsakes and use their attachment as leverage. The household remains available under your conditions, while the adult child remembers what you made obedience cost.",
            "effect": "claim"
          }
        ],
        [
          "An unsent draft from {name} remains in the household chest at {place}. It describes a road-house where everyone pretended to know the way and one traveler finally admitted they were lost. Whether the intended journey was completed is not established by this page. The draft asks a smaller question: \"If I come back without a grand story, will you still want to hear it?\" A current household visitor needs temporary lodging. Making room would put your old promise into practice for someone else; a business arrangement or a demand for service would give it a different shape.",
          {
            "label": "Make a room for returns that are not triumphs",
            "outcome": "You prepare a shelter room for people whose journeys did not become grand stories. The household’s welcome gains a practical form without inventing where the adult child has traveled.",
            "effect": "shelter"
          },
          {
            "label": "Open a small waystation alongside the family trade",
            "outcome": "You organize short stays around the household’s existing work. The venture offers a livelihood for willing participants and leaves the unsent draft separate from its advertising.",
            "effect": "route"
          },
          {
            "label": "Require useful service before allowing anyone to return",
            "outcome": "You make admission depend on work under your direction. The old question receives a hard answer, and the household records whose return you made conditional.",
            "effect": "claim"
          }
        ],
        [
          "The essential stone has been left beside the household door at {place}; someone finds it while repairing the threshold. A childhood drawing stored with {name}’s earlier note shows the same stone as a mountain. The household’s current occupants argue over what the room should be: a quiet place for uncertain travelers, an extension of the family workshop, or accommodation for people who owe you labor. The current keeper turns the childhood drawing over, finds an equally solemn sketch of a spoon, and smiles. Home contains these ridiculous mountains alongside the larger choices its people make.",
          {
            "label": "Let the household’s occupants shape the welcome together",
            "outcome": "You help the current occupants keep a room for uncertain arrivals. The stone stays by the door without making the absent adult child responsible for every guest who follows.",
            "effect": "shelter"
          },
          {
            "label": "Build a workshop that people can join independently",
            "outcome": "You arrange a working room where contribution has its own name. The family trade becomes one possible path through the household instead of the destiny of everyone entering it.",
            "effect": "workshop"
          },
          {
            "label": "Reserve the room for people pledged to your service",
            "outcome": "You give the room an admission rule based on allegiance to you. The stone remains at the threshold, marking a home whose welcome you have turned into a bargain of obedience.",
            "effect": "claim"
          }
        ],
        [
          "A young traveler at {place} asks whether being homesick means choosing the wrong road. The household keeper reads an old sentence from {name}’s papers: \"Sometimes I wanted home most on the days I was glad to be elsewhere.\" The traveler laughs, then cries without much warning. Your earlier arrangements determine what the keeper can offer after the conversation: a room, work, or another condition. There is no need to decide the traveler’s whole future tonight. The more difficult decision is whether your household can help someone without making gratitude the rope that pulls them back.",
          {
            "label": "Support a listening room without directing people’s futures",
            "outcome": "You make room for ordinary company and stories people choose to share. The household becomes useful to uncertain travelers without appointing itself the author of their next chapter.",
            "effect": "school"
          },
          {
            "label": "Offer practical training for those who want it",
            "outcome": "You build optional lessons around the household trade and the needs of travelers. The workshop gives people something to carry onward rather than a reason they must remain.",
            "effect": "workshop"
          },
          {
            "label": "Make help conditional on joining your household network",
            "outcome": "You use shelter and lessons to demand lasting loyalty. The travelers you address know the condition; other people do not acquire magical knowledge of the private bargain.",
            "effect": "claim"
          }
        ],
        [
          "The old cup from the first packing has become too cracked to drink from. Someone at {place} has planted a small seedling in it. The papers bearing {name}’s name are uneven: plans, questions, anger, affection, a drawing of the essential stone. They establish a particular relationship and no universal rule for raising children. The household keepers ask what they should inherit from your choices. They could keep an open door, a venture where family is one connection among several, or a house whose favors remain debts long after the original need is gone.",
          {
            "label": "Leave an open door without an inherited debt",
            "outcome": "You establish the room as a refuge its keepers can continue. The adult child’s papers remain personal history, and future guests receive a welcome without owing the household their lives.",
            "effect": "shelter"
          },
          {
            "label": "Leave an independent venture with room for many paths",
            "outcome": "You pass on a working household whose participants keep their own ambitions. Family connection remains meaningful without automatically appointing an heir, a profession or a future partner.",
            "effect": "workshop"
          },
          {
            "label": "Bind the house’s help to loyalty beyond your lifetime",
            "outcome": "You make future access depend on honoring your account of the family. The cracked cup survives in a household whose kindness has been made into an inherited condition.",
            "effect": "claim"
          }
        ]
      ]
    },
    {
      "id": "curse_survivor_last_lamp",
      "title": "The Last Lamp Left Lit",
      "kind": "household",
      "minAge": 20,
      "skill": "survival",
      "actorRole": "curse_survivor",
      "eligibleNote": "Start only after an actual recorded wolf rampage or vampire feeding harm with an existing named living adult survivor present locally. Do not invent a victim, confirmed murder, curse type, infection or exposure. The actor must know their own recorded harm, not universally know the hero’s curse. Story choices cannot grant curse mastery, cure, feeding control, absolution, resurrection, hunters, sentences or new occult powers; root links appropriate real mechanics.",
      "chapters": [
        [
          "At {place}, someone has kept a lamp burning since the night your curse harmed them. A note from {name} says the light is for the doorway, not for you. The wound itself may have changed; the habit has not. They ask whether you will help repair the room where ordinary sleep became difficult. You cannot answer by explaining that the beast or hunger was real. That is already part of what frightens them. The question is what you intend to do with the days when you can still choose, and who will carry the cost of those choices.",
          {
            "label": "Help repair the room without asking for forgiveness",
            "outcome": "You assist with the survivor’s damaged room and leave their lamp where they choose. The repair addresses actual harm without declaring the curse controlled or the relationship healed.",
            "effect": "clinic"
          },
          {
            "label": "Arrange separate help and keep your distance",
            "outcome": "You organize practical help without requiring the survivor to face you. The work creates a safer room while leaving the survivor free to decide whether future contact is wanted.",
            "effect": "shelter"
          },
          {
            "label": "Make help depend on silence about what happened",
            "outcome": "You turn necessary repairs into leverage over the survivor. The demand is known to the people involved; it neither proves your curse publicly nor guarantees they will remain silent.",
            "effect": "blackmail"
          }
        ],
        [
          "The lamp’s glass is dark with soot. In an older letter associated with {name}, one line reads, \"It is exhausting to be brave in your own bed.\" A current caretaker at {place} wants to use the repaired room for others who have survived terrifying nights. The room cannot diagnose every bite, cure every curse, or decide whether a stranger is guilty. Your earlier response determines whether it begins as care, distance, or silence bought under pressure. What it can offer now is more modest and more tangible: company, treatment within ordinary means, and somewhere to wake without being alone.",
          {
            "label": "Help make a care room for willing survivors",
            "outcome": "You support an ordinary care room for people who choose to enter. Its keepers offer company and practical treatment without promising a supernatural cure or forgiveness on anyone’s behalf.",
            "effect": "clinic"
          },
          {
            "label": "Establish a refuge with a separate working income",
            "outcome": "You organize shelter supported by a visible venture rather than secret favors. The room can remain useful while its visitors keep their histories and decisions separate from your needs.",
            "effect": "shelter"
          },
          {
            "label": "Use the room to learn secrets you can trade",
            "outcome": "You make access to help a way of gathering leverage. Only stories actually told can enter your scheme, and visitors who recognize it may refuse to offer more.",
            "effect": "blackmail"
          }
        ],
        [
          "Among the care room’s stored papers at {place}, a sketch bearing {name}’s name shows the night as a great animal pressing against a tiny door. Beneath it is written, \"This is how it felt. It is not what I saw.\" A visitor wants the sketch displayed as proof of a particular kind of monster. Another asks that no survivor be made into an exhibit. You know how tempting it is to give terror a complete explanation. The lamp gutters while they argue. Someone moves the oil away from the sketch, careful not to touch its edges.",
          {
            "label": "Teach the difference between experience and a diagnosis",
            "outcome": "You support lessons that take survivors seriously without turning one drawing into a verdict. The room gains a careful teaching practice; your curse mechanics continue to require actual time and choices.",
            "effect": "school"
          },
          {
            "label": "Keep the papers private and fund practical care",
            "outcome": "You preserve the personal accounts away from public display and support the room’s current work. The venture offers assistance without selling a guaranteed explanation for each frightening night.",
            "effect": "clinic"
          },
          {
            "label": "Exhibit the sketch as certainty and sell your protection",
            "outcome": "You market a claim the sketch itself rejects and make fear a source of influence. Its original caption remains in the surviving papers, contradicting the certainty you chose to advertise.",
            "effect": "blackmail"
          }
        ],
        [
          "The repaired room at {place} needs a new keeper. The older correspondence includes a sentence from {name}: \"A monster can be tired. That does not make the door safe.\" Candidates disagree about whether cursed travelers should be admitted, watched elsewhere, or turned away. Nobody has enough knowledge to identify every stranger by sight, and survivors need not share a room with a person they fear. You could support separate places for care and preparation, build a guarded refuge with explicit limits, or appoint yourself judge of everyone who asks to come in.",
          {
            "label": "Support separate spaces for survivors and curse preparation",
            "outcome": "You help the keepers preserve survivor care and a distinct preparation space. Nobody is required to reconcile, and the new ward provides no instant control over a curse.",
            "effect": "ward"
          },
          {
            "label": "Build a guarded refuge with practical admission limits",
            "outcome": "You organize a refuge whose keepers can manage actual space and known danger. It offers a place to prepare without claiming to recognize every hidden curse or overrule local law.",
            "effect": "shelter"
          },
          {
            "label": "Make access depend on accepting your judgment",
            "outcome": "You claim authority over admission and use uncertain histories as leverage. The refuge follows your conditions, while excluded people retain their own accounts beyond your control.",
            "effect": "claim"
          }
        ],
        [
          "The first lamp finally breaks. At {place}, the current keepers ask whether to replace it or keep its fragments beside the repaired doorway. In the papers associated with {name}, the last pertinent line reads, \"I want the story to end without the night being called necessary.\" The keeper sets the fragments in a bowl, unwilling to discard something that once made a frightened doorway easier to cross. What remains is the actual work, the distance respected or ignored, and the uses you found for another person’s fear. The keepers need a future that does not require a survivor to perform gratitude forever.",
          {
            "label": "Leave care independent of your need to be absolved",
            "outcome": "You pass the care room to its keepers and preserve the survivor’s account on its own terms. The lamp can be replaced without making your curse or forgiveness their continuing duty.",
            "effect": "clinic"
          },
          {
            "label": "Leave a separate refuge for practical preparation",
            "outcome": "You establish a continuing refuge apart from the survivor’s room. Its work supports preparation and rest while the curse still requires actual hunger, time and moon decisions.",
            "effect": "ward"
          },
          {
            "label": "Keep the survivor’s story under your control",
            "outcome": "You reserve the papers and admission decisions as sources of influence. The room remains useful under your terms, and the survivor’s refusal of a necessary suffering stays in its history.",
            "effect": "blackmail"
          }
        ]
      ]
    }
  ],
  "extraChapters": {
    "cracked_mark": [
      [
        "At {place}, a learner has copied your old working mark onto a practice piece. The piece is ugly and sound; the one beside it is beautiful and cracked. A remembered complaint bearing {name}’s name sits above the bench, where people disagree about whether it belongs. The current master wants the ugly piece hidden before an important visitor arrives. The learner says, \"Then what are we teaching?\" Nobody disputes that appearances help sell work. The dispute is whether a workshop that survived a concealed fault will teach the next generation to conceal another.",
        {
          "label": "Show both pieces and teach what the crack reveals",
          "outcome": "You leave the sound and cracked pieces side by side and support a practical lesson. The old complaint becomes a tool for learning rather than a stain to be hidden.",
          "effect": "school"
        },
        {
          "label": "Build a trade around the sound, ordinary work",
          "outcome": "You organize a small venture around reliable work and leave room for plain appearances. The workshop sells what its makers can stand behind without promising that every piece is beautiful.",
          "effect": "workshop"
        },
        {
          "label": "Hide the crack and sell the visitor a grand reputation",
          "outcome": "You remove the flawed piece from the display and claim a spotless practice. The learner retains the example outside your exhibition, along with the memory of what you concealed.",
          "effect": "claim"
        }
      ],
      [
        "A worn workbench at {place} is being replaced. Under its top lies a practice mark beside {name}’s preserved complaint, both scratched deeper than anyone expected. Younger makers want to cut that corner out and keep it. Others are tired of an old fault becoming the first thing customers hear. Your own experience gives you reasons to understand both wishes: memory can teach, and memory can make every new effort stand trial. The workshop asks what should pass into the new room, now that the people who began the dispute need not be present to keep it alive.",
        {
          "label": "Keep the marked corner as a lesson beside current work",
          "outcome": "You preserve the marked wood in a teaching corner and leave the new benches to current makers. The old fault remains visible without becoming the whole identity of the workshop.",
          "effect": "school"
        },
        {
          "label": "Fund new benches and preserve the history separately",
          "outcome": "You support a continuing workshop and keep the complaint in its own place. New work can earn its reputation while readers still have access to the earlier dispute.",
          "effect": "workshop"
        },
        {
          "label": "Reserve the old mark and control who may use it",
          "outcome": "You make the remembered practice a source of exclusive authority. The new benches work under your claim, while independent makers keep their own copies of the disputed history.",
          "effect": "claim"
        }
      ]
    ],
    "two_names": [
      [
        "A map seller at {place} has made a popular miniature of the old survey. It is so small that both signatures have become one dark blot. The saved field pages bearing {name}’s name are larger and less convenient. Travelers laugh at a hill drawn like a sleeping toad, then ask which crossing is actually passable. A current roadkeeper needs a useful map more than a victory in the old rivalry. You could bring several observations together, sell a clearly limited route, or let the attractive miniature give your preferred version a reach it never earned in the field.",
        {
          "label": "Help the roadkeeper compare the actual route observations",
          "outcome": "You help compare the surviving surveys with present observations and leave disagreements visible. The road gains a practical correction without making a handsome miniature the final authority.",
          "effect": "route"
        },
        {
          "label": "Sell a new route under clearly identified contributions",
          "outcome": "You organize a map venture naming the work behind its new route. The old miniature remains a souvenir, and travelers can judge a current account on its actual limits.",
          "effect": "market"
        },
        {
          "label": "Use the blurred signatures to claim the route alone",
          "outcome": "You advertise the miniature as your exclusive work and restrict rival copies. The original pages remain elsewhere, preserving contributions that your useful little blot conceals.",
          "effect": "claim"
        }
      ],
      [
        "The old survey at {place} has gained so many corrections that its first road is hard to see. Beside {name}’s earlier field mark, someone has drawn a flower where a dangerous turn once stood. The current roadkeepers want to name the route after a single famous mapmaker. Others prefer the name travelers actually use: \"the way that did not kill us.\" A name could honor shared labor, advertise a profitable guide, or erase people whose work once challenged yours. The landscape does not care which signature wins. The households depending on the road have better reasons to care.",
        {
          "label": "Give the roadkeepers a shared account of the route",
          "outcome": "You leave the route history with its working keepers and preserve several contributions. The corrected road becomes useful common knowledge rather than a memorial to one winning signature.",
          "effect": "route"
        },
        {
          "label": "Establish independent guides with their own stated routes",
          "outcome": "You help guide businesses identify the observations each actually sells. Competition continues around current routes while the old survey remains available to anyone wishing to examine it.",
          "effect": "market"
        },
        {
          "label": "Make every guide use your name and seek your approval",
          "outcome": "You turn the route’s fame into an exclusive claim over its guides. The road remains where it was, and the excluded mapmakers retain the corrections your title leaves out.",
          "effect": "claim"
        }
      ]
    ],
    "winter_commons": [
      [
        "The common beds at {place} have produced an absurdly large turnip. Someone has dressed it in a little coat and placed it on a stool. In the old seasonal notes associated with {name}, there is a complaint about children wasting good cloth. Now the current growers argue over whether to sell the turnip, divide it, or save its seed. It is an argument almost pleasant enough to forget the winters that began this plot. Your earlier choice still shapes who may enter the beds and who expects a share. The turnip is funny; the fence around it is consequential.",
        {
          "label": "Use the harvest to bring the participating households together",
          "outcome": "You help share the harvest and protect enough seed for future beds. The ridiculous coat remains a joke the growers can enjoy without making admission depend on its owner.",
          "effect": "market"
        },
        {
          "label": "Develop a trade from the growers’ surplus",
          "outcome": "You organize a surplus venture whose participants choose their contributions. The beds gain a livelihood around what they can spare, leaving winter needs distinct from the sales pitch.",
          "effect": "market"
        },
        {
          "label": "Claim the best seed and sell access to the beds",
          "outcome": "You take control of the desirable seed and use it to extend your authority. The growers retain the seasonal history of the beds outside your new conditions.",
          "effect": "claim"
        }
      ],
      [
        "A frost damages the beds at {place}, leaving the turnip’s little coat hanging above a much poorer harvest. The saved notes from {name}’s earlier seasons list tools repaired by several hands, along with arguments nobody quite won. Current growers need to choose how to recover: cooperate on new beds, trade for supplies, or surrender more ground to a patron who offers immediate relief. The growers stand by the fence comparing cracked fingernails and trying to guess whose seedlings will recover. A small laugh passes between them, then fades when somebody looks at the empty storage shed.",
        {
          "label": "Help the growers restore beds they can manage together",
          "outcome": "You support practical recovery with the growers who choose to participate. The new beds are shaped by actual helpers, and no private plot silently becomes public through the telling.",
          "effect": "workshop"
        },
        {
          "label": "Trade for supplies under the existing plot boundaries",
          "outcome": "You arrange a recovery venture that respects the boundaries already chosen. The growers gain supplies without treating one bad harvest as a sale of everyone’s future labor.",
          "effect": "market"
        },
        {
          "label": "Use emergency supplies to expand your control of the ground",
          "outcome": "You make recovery depend on surrendering more ground to your authority. The harvest may resume, but the growers preserve how the emergency changed who could use the beds.",
          "effect": "claim"
        }
      ]
    ],
    "hearth_letter": [
      [
        "The old room at {place} has a new crack in its wall. Through it, a small branch has reached toward the hearth. The household papers associated with {name} include an argument over the same wall from years earlier, written in two angry hands that become almost indistinguishable near the bottom. Current occupants want repairs; a relative wants the branch left because it flowers indoors. The creditor’s old demands cannot decide either matter on their own. You could make a more useful room, turn the repairs into a modest venture, or use uncertainty about the wall to strengthen a claim over the household.",
        {
          "label": "Repair the room while keeping space for the flowering branch",
          "outcome": "You help the current occupants repair the room and preserve a little space for its unlikely tree. The household gains shelter shaped by present needs rather than an inherited demand.",
          "effect": "shelter"
        },
        {
          "label": "Arrange a workshop for repairing neighboring hearths",
          "outcome": "You use the practical repairs to begin a modest venture with willing workers. The household room remains separate from claims over neighbors’ homes or descendants.",
          "effect": "workshop"
        },
        {
          "label": "Claim the room by exploiting the unsettled wall dispute",
          "outcome": "You use the old argument to press for greater control of the room. The papers retain their original disagreement and cannot honestly be read as unanimous support for your claim.",
          "effect": "claim"
        }
      ],
      [
        "The branch at {place} has become too large for the room. A current occupant proposes moving the hearth rather than cutting the tree. Among {name}’s old household papers lies a recipe written in the margin of the disputed agreement, with the warning \"Too much salt last time.\" The room has held life besides its quarrel, and the occupants want that remembered. They ask whether its future should be a useful home, a private venture, or a monument to the person who acquired the strongest claim. The old recipe offers no ruling. It does suggest somebody once hoped for another supper.",
        {
          "label": "Help make the room a home its occupants can use",
          "outcome": "You support a practical household arrangement and keep the old papers with their ordinary margins. The room gains a future without requiring descendants to reenact every earlier dispute.",
          "effect": "shelter"
        },
        {
          "label": "Give the repaired room a bounded independent trade",
          "outcome": "You establish a small venture around the repaired room and its actual use. The recipe and disputed agreement remain household history rather than advertising for a grand ancestral entitlement.",
          "effect": "market"
        },
        {
          "label": "Make the room a monument to your exclusive claim",
          "outcome": "You reserve the room around your preferred account of its ownership. The tree remains inside a controlled space, and the surviving recipe remembers a less solemn life beyond your monument.",
          "effect": "claim"
        }
      ]
    ],
    "night_door": [
      [
        "The door at {place} has become famous for a painted cat that was meant to be a lion. A surviving note from {name} calls it \"a beast no burglar could fear.\" Current guests disagree about whether it should be repainted. More seriously, a traveler has arrived who cannot pay and does not want to explain the journey yet. Your earlier charter still matters: a refuge, a private inn, and a patron-controlled gate offer different promises. The traveler knows only the door in front of them. You can make room within the actual arrangement, organize a livelihood, or use the threshold to extract something private.",
        {
          "label": "Help the keepers offer one practical night of shelter",
          "outcome": "You support a night of shelter within the door’s actual arrangement. The guest receives rest without having to offer a whole private route as the price of being believed.",
          "effect": "shelter"
        },
        {
          "label": "Build a small trade that helps the door remain usable",
          "outcome": "You organize useful work around the existing door and its keepers. The venture supports rooms through actual trade rather than pretending every visitor has the same resources.",
          "effect": "market"
        },
        {
          "label": "Demand the traveler’s private route in exchange for entry",
          "outcome": "You make the traveler’s admission depend on revealing a route. The people involved know your demand; other households do not automatically acquire the guest’s private movements.",
          "effect": "smuggling"
        }
      ],
      [
        "The hinges at {place} have worn into grooves. A carpenter wants to replace the door, painted cat and all. In the papers preserved from {name}, a traveler once described the threshold as \"the first place I could stop being interesting.\" The current keepers are deciding whether to preserve that possibility, expand the inn trade, or close admission around a powerful household. Your earlier charter and later conduct explain why people now approach freely, bargain carefully, or fear being refused. The new wood will smell clean for a while. It cannot erase what the old door allowed or demanded.",
        {
          "label": "Leave a working door for travelers who need to pause",
          "outcome": "You support a practical refuge arrangement the keepers can maintain. The old painted cat survives nearby, and future guests are allowed to arrive without performing an entertaining history.",
          "effect": "shelter"
        },
        {
          "label": "Leave an independent inn with useful rooms and trade",
          "outcome": "You establish a continuing inn venture around its actual keepers and guests. The door earns its place through lodging, while earlier route disclosures remain part of its separate history.",
          "effect": "market"
        },
        {
          "label": "Reserve the new door for those admitted through you",
          "outcome": "You strengthen exclusive admission at the threshold. The keepers remember the earlier travelers, and refused households continue to carry accounts beyond the door you control.",
          "effect": "claim"
        }
      ]
    ],
    "own_key": [
      [
        "A learner at {place} has made a key shaped like a fish. It opens nothing, but the workmanship is excellent. In the older teaching papers associated with {name}, someone has drawn a similar useless object and labeled it \"first freedom.\" Current masters disagree about whether such lessons waste expensive material. A patron wants the workshop to produce only things already sold. You can protect room for experiment, make a venture of useful commissions, or place learning wholly under the patron’s demand. The fish key gives you no new door. It shows what a person can discover when every attempt is not already owned.",
        {
          "label": "Keep a workbench for experiments learners may name",
          "outcome": "You support a bench for independent attempts and credit the people making them. The fish key remains useless in a useful way: proof that learning can precede a sale.",
          "effect": "school"
        },
        {
          "label": "Build commissions alongside an independent teaching bench",
          "outcome": "You organize paid commissions that support the workshop without claiming every lesson. Learners can distinguish the work they sell from experiments they are still allowed to call their own.",
          "effect": "workshop"
        },
        {
          "label": "Make every lesson answer to your patron’s commission",
          "outcome": "You reserve the teaching bench for work the patron controls. The fish key is kept outside the official display, alongside the learner’s memory of what you excluded.",
          "effect": "claim"
        }
      ],
      [
        "The independent workbench at {place} needs a keeper who did not learn directly from you. The candidates bring finished work, awkward mistakes, and a copy of {name}’s earlier teaching pages. One asks which matters more: remembering the master or becoming someone the master never imagined. The old fish key has acquired a place in the tool chest, although it still opens nothing. Your previous choices determine who may learn here and whose name remains on the lesson. A new keeper could inherit a school, a working venture, or your permission to decide who is permitted a future.",
        {
          "label": "Pass the teaching bench to independent learners and makers",
          "outcome": "You help the current makers keep a teaching practice whose next lessons may change. The older pages remain credited, and learning does not end at the edge of your approval.",
          "effect": "school"
        },
        {
          "label": "Establish a continuing workshop with separate contributions",
          "outcome": "You leave a workshop venture where makers can identify what each contributes. The teaching pages support current work without appointing your old practice owner of every new method.",
          "effect": "workshop"
        },
        {
          "label": "Keep the school dependent on your exclusive authority",
          "outcome": "You require the next keeper to preserve your control over admission and teaching. Independent learners retain the fish key and the memory of a bench they could not enter.",
          "effect": "claim"
        }
      ]
    ],
    "buried_bell": [
      [
        "Near the old bell opening at {place}, workers uncover an ordinary little shoe. The preserved account bearing {name}’s name describes the earlier voices, but the shoe proves no identity among them. A current keeper wants a flower bed over the disturbed ground. Another wants a display that will draw visitors. Children have begun ringing a kitchen spoon against stones to hear whether the place answers; their game is lively and unsettling. A child puts a flower through the shoe’s worn buckle, then anxiously asks whether it should be red. What remains here is the opening’s actual condition, the kept account, and a piece of ground people must use.",
        {
          "label": "Make a quiet garden without naming an unknown child",
          "outcome": "You help tend the disturbed ground and preserve the shoe without inventing its owner. The garden offers remembrance while the released dead remain released and uncertain details stay uncertain.",
          "effect": "ward"
        },
        {
          "label": "Build a tended exhibit explaining the surviving finds",
          "outcome": "You organize a modest exhibit that separates the shoe from unproved identities. Visitors see actual finds and preserved accounts, while the opening retains its earlier chosen condition.",
          "effect": "market"
        },
        {
          "label": "Sell certainty about the shoe to strengthen your influence",
          "outcome": "You turn an unknown object into a confident story and trade on frightened curiosity. The surviving account proves no such identity, and the current keepers retain that contradiction.",
          "effect": "blackmail"
        }
      ],
      [
        "The bell site at {place} has acquired living sounds: arguments over flowers, laughter from visitors, someone dropping an entire tray. A sentence in {name}’s saved account reads, \"The quiet afterward was not empty.\" The current keeper worries that people want a new haunting every year to justify coming. The tray’s owner looks close to tears until a visitor kneels to gather the pieces, complaining cheerfully about the price of bowls. There is room here for a school about careful remembrance, an independent tending venture, or a profitable legend that makes uncertainty answer to you.",
        {
          "label": "Teach remembrance through the account and present ground",
          "outcome": "You establish lessons around the actual history and current site. The living learn to notice what remains without demanding a new haunting or changing the fate chosen for the bells.",
          "effect": "school"
        },
        {
          "label": "Leave a tended place with an independent livelihood",
          "outcome": "You organize continuing care around the site and its keepers. Visitors support practical tending, while the old bell decisions remain visible rather than replaced by a more profitable tale.",
          "effect": "market"
        },
        {
          "label": "Make every account of the bells pass through you",
          "outcome": "You reserve the place’s public story and access as sources of authority. The preserved papers keep the earlier decisions, including the details your new legend would prefer to hide.",
          "effect": "claim"
        }
      ]
    ],
    "water_second_face": [
      [
        "An ordinary fishing float catches near the old shore at {place}. It resembles the lamp in the account associated with {name}, but it is wood, paint and a snapped cord. A current guide wants to sell it as a token from the impossible crossing. Another wants to show travelers where the bank gives way. An old fisher remembers a farewell here and refuses to turn it into a trick for visitors. You can make the present shore easier to use, build an honest guiding trade, or let a familiar shape carry an extraordinary claim it has not earned.",
        {
          "label": "Help mark the bank’s actual hazards for travelers",
          "outcome": "You help make the current shore safer using observations of its ground and water. The float remains an ordinary find, and the old crossing keeps the ending you actually chose.",
          "effect": "route"
        },
        {
          "label": "Support guides who distinguish scenery from revelation",
          "outcome": "You organize a guiding venture around actual paths and the preserved crossing account. Visitors can enjoy the strange history without buying the float as proof of a new supernatural message.",
          "effect": "market"
        },
        {
          "label": "Sell the float as a token guaranteeing your crossing",
          "outcome": "You advertise a guarantee the found float cannot support. The guide’s trade gains your claim, while the bank and saved account offer no assurance that the promise is true.",
          "effect": "blackmail"
        }
      ],
      [
        "The shore path at {place} now carries people with no interest in the old boat: workers, courting pairs, an exhausted traveler carrying a broken umbrella. In {name}’s preserved account, a line describes waiting on the bank long after an answer had become possible. A current pathkeeper thinks the place should offer a sheltered pause. A trader wants a scenic route with regular custom. A patron wants admission kept exclusive. A couple on the path have stopped quarreling to share the traveler’s absurd umbrella. They can decide what the living shoreline becomes around that history.",
        {
          "label": "Leave a sheltered path for people with their own journeys",
          "outcome": "You support a usable path and a place to rest beside it. The shoreline keeps its preserved history while ordinary travelers receive a welcome independent of the old ferryman’s fate.",
          "effect": "shelter"
        },
        {
          "label": "Establish an honest shoreline guiding venture",
          "outcome": "You organize a continuing route trade grounded in the actual shore. The guides retain the strange crossing account and make no claim that visitors can command its old passengers.",
          "effect": "route"
        },
        {
          "label": "Make access to the shore a mark of your approval",
          "outcome": "You reserve the useful approach under your authority and exclude those outside it. The bank remains real ground, while the old account remembers a crossing your new gate cannot rewrite.",
          "effect": "claim"
        }
      ]
    ],
    "hollow_mask": [
      [
        "Someone at {place} has painted a smile on a copy of the old iron mask. It looks foolish enough that passersby stop fearing it. The saved account carrying {name}’s name includes the watcher’s confession and the release you chose or refused. A current caretaker wants the smiling copy removed because it dishonors the dead. A former traveler says ridicule is how a cruel barrier loses its grandeur. You do not need the watcher to appear again for those views to clash. The copy could begin an honest lesson, a theatrical trade, or a renewed threat hiding behind the old commanding face.",
        {
          "label": "Teach both the confession and the barrier’s human cost",
          "outcome": "You support a lesson that includes the watcher’s own wrongdoing and the lives affected by it. The painted copy becomes discussion rather than a pardon or a revived commander.",
          "effect": "school"
        },
        {
          "label": "Make a theater of several accounts of the barrier",
          "outcome": "You organize performances that preserve disagreement about the old watch. The troupe earns its trade without claiming the original mask’s current voice supports every line they speak.",
          "effect": "market"
        },
        {
          "label": "Use the mask’s image to demand obedience again",
          "outcome": "You turn the recognizable face into a warning under your authority. People you threaten know the demand, while the saved confession still contradicts a spotless heroic portrait.",
          "effect": "claim"
        }
      ],
      [
        "The niche at {place} needs repair. The current masons find small names scratched below the grand inscription, probably by travelers who waited at the barrier. Their identities are unknown. Among {name}’s old pages is a careful copy of those scratches, left beside the watcher’s own confession. One keeper wants the names carved deeper; another fears inventing complete lives around marks nobody can read. The masons have brought broth, and the keeper is reluctant to interrupt their fragile good humor. You could preserve a place where several accounts can coexist, turn the repair into useful work, or remove the difficult marks so the commanding face stands alone.",
        {
          "label": "Preserve the small marks beside the larger account",
          "outcome": "You help repair the niche without inventing identities for the scratched names. The memorial keeps uncertainty and the watcher’s confession together, respecting whichever ending the earlier vigil actually chose.",
          "effect": "ward"
        },
        {
          "label": "Train masons through the careful restoration",
          "outcome": "You establish practical restoration lessons around the niche and its surviving surfaces. The work supports current makers while the small marks retain their limits as evidence.",
          "effect": "workshop"
        },
        {
          "label": "Remove the small marks and keep one commanding story",
          "outcome": "You simplify the memorial around the version you control. The preserved copy of the smaller scratches remains elsewhere, recording what the restored stone no longer permits visitors to see.",
          "effect": "claim"
        }
      ]
    ],
    "moth_window": [
      [
        "A perfectly ordinary moth has died on the sill at {place}. The current household keeper mourns it with an extravagance that makes the neighbors smile. The account associated with {name} describes a stranger welcome, but the tiny insect proves no return of a departed visitor. A carpenter has offered to widen the window, bringing more light and exposing the room to the street. The household wants comfort; curious listeners want a better view. You can help make the room useful to its occupants, build a separate exhibition, or use the old window’s reputation to turn their privacy into something you sell.",
        {
          "label": "Repair the window for the household’s comfort",
          "outcome": "You help make the room lighter while protecting the occupants’ chosen privacy. The ordinary moth is buried beneath the sill, and the earlier visitor keeps the fate already recorded.",
          "effect": "shelter"
        },
        {
          "label": "Make a separate display of the preserved window history",
          "outcome": "You arrange an exhibit outside the household rooms, using the saved account and careful copies. The trade gives visitors something to see without granting them entry into a private home.",
          "effect": "market"
        },
        {
          "label": "Sell views into the room as part of the old wonder",
          "outcome": "You make the household’s window a source of paid curiosity. The occupants retain their complaint, and a familiar uncanny story does not erase the intrusion you impose.",
          "effect": "claim"
        }
      ],
      [
        "The room at {place} has acquired a stubborn plant that leans toward the repaired window. A line in {name}’s old account describes welcome as something small enough to keep. Current occupants want the room left quiet; a local keeper proposes lessons about forgotten hospitality. Others think the old moth story could attract richer patrons. Someone has left a small saucer beside the plant for the ordinary moths gathering at dusk. The neighbors have begun leaning over the sill to offer advice the occupants have not requested. The plant asks only for light. The household asks who gets to decide what else enters.",
        {
          "label": "Keep a quiet room and teach hospitality elsewhere",
          "outcome": "You preserve the household’s useful privacy and support lessons outside its door. The window retains its actual history without making the occupants responsible for providing wonder to every visitor.",
          "effect": "school"
        },
        {
          "label": "Establish a separate attraction with its own tended space",
          "outcome": "You organize a small venture away from the living rooms and credit the preserved account. The household gains a boundary between ordinary life and public curiosity about the old window.",
          "effect": "market"
        },
        {
          "label": "Reserve the window and make the household host your patrons",
          "outcome": "You give your patrons priority over the occupants’ quiet. The room’s history gains a new demand, and the old welcome mark remains a reminder of a hospitality you chose to command.",
          "effect": "claim"
        }
      ]
    ],
    "silverleaf_names": [
      [
        "At {place}, a living tree drops pale leaves near the old memorial. A keeper cannot stop visitors picking them up as if each carried a name. The preserved account bearing {name}’s name describes the silver leaves and the choices made about their shadows; these ordinary leaves establish nothing about the dead. An elven maker proposes a garden where strangers can be remembered without being claimed as ancestors. A trader wants carefully labeled replicas. A patron wants an exclusive family legend. The branch’s earlier ending cannot turn unknown names into your inheritance merely because that would make a pleasing story.",
        {
          "label": "Make a garden for remembered strangers without inherited claims",
          "outcome": "You support a garden that keeps unknown lives distinct from living family entitlements. The earlier silver-leaf decisions remain intact, and ordinary fallen leaves are allowed to be ordinary.",
          "effect": "ward"
        },
        {
          "label": "Support makers selling clearly identified memorial replicas",
          "outcome": "You organize a craft venture whose replicas are named as current work. Visitors receive art rather than a purchased claim of kinship with the shadows in the preserved account.",
          "effect": "workshop"
        },
        {
          "label": "Claim the unknown names as proof of your lineage",
          "outcome": "You turn uncertain strangers into an ancestral legend useful to your authority. The preserved account contains no proof of that kinship and remains available to contradict the claim.",
          "effect": "claim"
        }
      ],
      [
        "The memorial garden at {place} contains a bench carved with a phrase from {name}’s old account: \"A name is not a room we own.\" Current visitors leave stories whose accuracy the keeper cannot verify. Some are tender; one is obviously copied from a song about a king with seven wives and no shoes. An elven school would like to teach the difference between remembrance and descent. A patron offers funds if inconvenient stories disappear. The keeper laughs over the shoeless king, then finds a plain note from someone who could not afford a grave marker. Beauty and need share the bench uneasily.",
        {
          "label": "Teach remembrance with room for uncertainty and strangers",
          "outcome": "You establish lessons that distinguish remembered stories from ancestry and entitlement. The garden keeps its several voices without conjuring the released shadows or assigning unknown dead to living families.",
          "effect": "school"
        },
        {
          "label": "Keep a tended memorial with independent makers and guides",
          "outcome": "You organize ongoing tending supported by craft and guiding work. The keepers label current stories for what they are, and the old silver-leaf account remains separate from patronage.",
          "effect": "market"
        },
        {
          "label": "Take the patron’s funds and edit the garden into your legend",
          "outcome": "You remove inconvenient stories from the public garden and strengthen the lineage you advertise. Copies survive beyond the display, recording memories the purchased legend chose to exclude.",
          "effect": "claim"
        }
      ]
    ],
    "stone_last_note": [
      [
        "At {place}, a young maker strikes the old work rhythm on a cooking pot and receives an answering complaint from the cook. Nobody mistakes it for a new ash worker. The account associated with {name} remains beside the buried doorway, including the ending actually given to its shift. Current workers want a common signal for stopping when a roof is unsafe. A patron dislikes the possibility of a whole crew laying tools down together. You may know how stubbornly a task can outlast good judgment from your own days of difficult work. The new signal belongs to living workers, not an order carried back into the stone.",
        {
          "label": "Help the crews establish a practical stopping signal",
          "outcome": "You support a signal current crews can use around actual hazards. The old shift keeps its recorded ending, while living workers gain a way to refuse a dangerous continuation.",
          "effect": "workshop"
        },
        {
          "label": "Teach safer work through a paid independent practice",
          "outcome": "You organize practical training around real tasks and observed hazards. The venture earns its place through living work rather than claiming the old ash figures certify every lesson.",
          "effect": "school"
        },
        {
          "label": "Make the stopping signal require your permission",
          "outcome": "You turn a useful crew signal into another demand for approval. The workers retain the old doorway account and remember whose authority delayed the chance to lay tools down.",
          "effect": "claim"
        }
      ],
      [
        "A worn hammer at {place} has been hung beside the account bearing {name}’s name. Its handle was replaced so often that a maker asks whether it is still the same hammer. The cook says it is definitely the same noise. Current workers want to leave the buried doorway in the care of a new crew, one not trained to obey the old patron automatically. The earlier shift may have ended, rested by agreement, or remained coerced; this ordinary inheritance cannot rewrite that. It can determine whether the living learn independence, establish their own practice, or receive another unfinished demand.",
        {
          "label": "Leave the tools and lessons to an independent crew",
          "outcome": "You support a workshop whose current makers can shape their own practice. The replaced hammer keeps its joke, and the old doorway preserves the shift’s actual chosen ending.",
          "effect": "workshop"
        },
        {
          "label": "Build a continuing trade with separately credited makers",
          "outcome": "You organize an independent venture around the living crew’s work. The old account remains beside it without granting the next patron ownership of every task or lesson.",
          "effect": "market"
        },
        {
          "label": "Use the inherited tools to bind the crew to your authority",
          "outcome": "You make access to useful tools depend on obedience to your practice. The current crew remembers that condition, and the old stopping signal acquires another reason to matter.",
          "effect": "claim"
        }
      ]
    ],
    "ninth_hearth": [
      [
        "An ordinary baker at {place} has named a loaf \"the ninth\" and cut it into ten uneven pieces. The joke is better than the bread. The account saved with {name}’s name describes an impossible host and the welcome it was allowed or denied. Current neighbors want a supper for people who find festivals lonely. A trader offers to organize the meal; a patron wants invited guests chosen for their influence. The old host does not need to return for the new table to face the same temptation: making someone’s welcome depend on what their presence gives the person who owns the door.",
        {
          "label": "Help make a supper people can attend and leave freely",
          "outcome": "You support a shared table with room for lonely guests and ordinary farewells. The old ninth-hearth fate remains intact, while the living practice a welcome they can actually keep.",
          "effect": "shelter"
        },
        {
          "label": "Build an independent supper trade with willing guests",
          "outcome": "You organize a meal venture whose guests choose to attend. The baker’s ridiculous loaf becomes current work rather than proof that the impossible host has returned.",
          "effect": "market"
        },
        {
          "label": "Make the supper a gathering for people who owe you favors",
          "outcome": "You turn the table into an instrument of influence and selective admission. The guests know your demand, and the old account retains its warning about a welcome that cannot end.",
          "effect": "claim"
        }
      ],
      [
        "The new table at {place} has a loose leg. Several people insist it always had one; a younger keeper suspects someone simply avoided mending it. Among {name}’s old pages is a line about the warmth after a strange door closed. The supper’s current hosts ask how to continue when one household can no longer do all the work. They could share the practical burden, open a modest meal venture, or let a patron reserve the strongest seats. The old impossible hearth keeps its recorded ending. This table needs a living answer, preferably before anyone leans on the wrong corner again.",
        {
          "label": "Help several households share the work of the supper",
          "outcome": "You support a practical shared supper and a repaired table. Hospitality becomes work people can divide, with nobody required to inherit an endless duty from the old story.",
          "effect": "shelter"
        },
        {
          "label": "Establish a meal venture whose hosts keep their own time",
          "outcome": "You organize a continuing supper trade with willing hosts and guests. The old pages remain a story beside the hearth rather than an obligation to keep every chair forever filled.",
          "effect": "market"
        },
        {
          "label": "Reserve the supper around a patron’s favored guests",
          "outcome": "You give the patron control over the table’s strongest places. The meal continues under selective authority, and excluded neighbors preserve a less flattering account of its welcome.",
          "effect": "claim"
        }
      ]
    ],
    "bannerless_oath": [
      [
        "At {place}, a current maker has carved the old open hands onto a doorpost. An orcish visitor asks whether they mean surrender or welcome. The saved account associated with {name} includes the shadow’s burden, but it does not settle what every living hand must mean. A neighborhood crew wants to train young adults in defense without repeating the old commander’s impossible demands. A patron offers support if trainees swear exclusive service. Two trainees practice below the carved hands, one repeatedly apologizing to the practice post. Your new decision concerns living people whose strength could become a skill, a livelihood, or another proof someone keeps moving beyond their reach.",
        {
          "label": "Support defense training without an endless loyalty test",
          "outcome": "You establish practical lessons whose trainees can finish and leave. The old open hands remain a warning about impossible proof rather than a command over every orc who sees them.",
          "effect": "school"
        },
        {
          "label": "Build an independent defensive practice with bounded work",
          "outcome": "You organize a defense venture around actual tasks and willing participants. The trainees gain a livelihood without promising every future burden to the patron who funds the practice.",
          "effect": "workshop"
        },
        {
          "label": "Make training depend on exclusive loyalty to you",
          "outcome": "You turn the training ground into a test of allegiance under your authority. The old account survives beside it, preserving the shadow’s first request to be heard.",
          "effect": "claim"
        }
      ],
      [
        "The trainees at {place} have made a banner with no emblem because they cannot agree on one. A joke in the old papers associated with {name} calls such cloth \"excellent shade, terrible argument.\" The current keepers need to decide who will lead the practice next. Some value skill, some favor a profitable sponsor, and some want the loudest name preserved above the yard. One candidate brings a loaf to share and immediately regrets it when the cook critiques the crust. You can help the yard become independent, establish a bounded venture, or make its empty banner another thing that must be satisfied before anyone can put down a burden.",
        {
          "label": "Leave the practice to trainees who can choose its future",
          "outcome": "You support independent keepers for the training yard and preserve the old warning. The empty banner becomes room for their choices rather than an inherited command to prove devotion to you.",
          "effect": "school"
        },
        {
          "label": "Establish a continuing practice around actual defensive work",
          "outcome": "You organize a venture that earns support through bounded defensive tasks. The yard can continue without promising a sponsor every future act of strength from the people it trains.",
          "effect": "workshop"
        },
        {
          "label": "Put your name on the banner and make the yard serve it",
          "outcome": "You reserve the yard around your authority and the loyalty it demands. The old papers remain outside that command, recording the earlier burden the practice chose to resemble.",
          "effect": "claim"
        }
      ]
    ],
    "drain_lullaby": [
      [
        "A living singer at {place} has put a comic verse into the old lullaby. It mentions a pot falling downstairs and includes a very convincing clatter. The account associated with {name} preserves the earlier echoes and the ending they received. Current neighbors argue about whether laughter disrespects the sealed room. A goblin visitor says songs survive partly by escaping the solemn people who collect them. You could support several tellings, make a musical trade, or claim that only your version may be heard. A passerby joins the clatter verse a beat too late; the living singer loses the next line to laughter.",
        {
          "label": "Make room for the old account and the living song",
          "outcome": "You support lessons that preserve the old ending alongside newer performances. The song can change among living singers without pretending to change what happened to the sealed echoes.",
          "effect": "school"
        },
        {
          "label": "Build a performance venture crediting the current singers",
          "outcome": "You organize performances whose makers keep their own contributions visible. The trade sells living music rather than claiming every comic clatter is a new message from below.",
          "effect": "market"
        },
        {
          "label": "Reserve the lullaby and threaten unauthorized singers",
          "outcome": "You make the familiar song a source of exclusive authority. The performers retain their own versions elsewhere, while the old account remembers a room once denied a voice.",
          "effect": "claim"
        }
      ],
      [
        "The ordinary grate at {place} needs clearing. A current worker hums the lullaby while lifting leaves from it, then forgets the final verse and invents one about sore knees. Among {name}’s old pages is the recovered ending, carefully copied without such complaints. A local school wants both versions because one preserves history and the other belongs to this morning. A patron wants the first locked away for exclusive performances. The worker ends the improvised verse with a magnificent complaint about puddles, to the schoolteacher’s delight. The people using the street must decide whether its remembered song is a lesson, a livelihood, or another voice that asks permission before it can be heard.",
        {
          "label": "Give the school several versions and preserve their origins",
          "outcome": "You support a teaching collection that distinguishes the recovered verse from current songs. The street keeps a usable grate, and the old room’s ending remains intact beneath new living voices.",
          "effect": "school"
        },
        {
          "label": "Leave an independent musical venture around willing performers",
          "outcome": "You organize a continuing trade for singers who choose to participate. The old pages stay credited, while new verses are allowed to sound like the lives producing them.",
          "effect": "market"
        },
        {
          "label": "Give the patron exclusive control of the recovered ending",
          "outcome": "You reserve the old verse for favored performances and exclude others from its public use. The singers keep newer versions, and copies of the recovered ending survive beyond the patron’s room.",
          "effect": "claim"
        }
      ]
    ],
    "horns_candle": [
      [
        "A craftsperson at {place} has copied the horn-framed mirror in plain wood. The new glass reflects its viewer normally, which has disappointed one buyer. The preserved account associated with {name} describes the old keeper and the promises it was allowed or denied to finish. Current neighbors want a room for discussing vows before making them. A trader proposes selling ceremony furnishings. A patron wants every promise witnessed by someone under your control. Two visitors wait outside rehearsing a promise, stopping whenever its grand words sound ridiculous in daylight. The new room could help living people choose their words, or turn their uncertainty into another chain somebody profits from keeping unfinished.",
        {
          "label": "Help people examine promises before they choose to make them",
          "outcome": "You support a teaching room where living participants can ask what a promise would mean. The old mirror stays in its chosen condition, and no visitor is forced to swear.",
          "effect": "school"
        },
        {
          "label": "Build a craft venture for clearly ordinary ceremony furnishings",
          "outcome": "You organize trade around furnishings sold as current work, without guaranteed supernatural power. The copied mirror earns its place as craftsmanship rather than a new keeper hungry for oaths.",
          "effect": "workshop"
        },
        {
          "label": "Make the room’s promises depend on your approval",
          "outcome": "You claim authority over the vows discussed in the room and use hesitation as leverage. The old papers retain their warning about demands that cannot be completed.",
          "effect": "claim"
        }
      ],
      [
        "The plain wooden mirror at {place} has warped a little, making every solemn face look astonished. A current keeper thinks this improves the room. A line preserved from {name}’s old account says, \"Even a promise needs somewhere to stop.\" The visitors now want to leave the practice to younger keepers. They could inherit a place for careful questions, a craft venture with its own work, or your exclusive authority to declare when words are enough. Nothing here proves a tiefling’s character from a horned frame. A nervous visitor sees the astonished face in the glass and laughs before beginning a difficult question.",
        {
          "label": "Leave a room where promises can be questioned and completed",
          "outcome": "You support independent keepers for the questioning room and preserve the old warning. The warped mirror adds an ordinary laugh without changing the keeper or candle’s earlier chosen fate.",
          "effect": "school"
        },
        {
          "label": "Establish a continuing craft practice with independent makers",
          "outcome": "You organize a venture around useful ceremony work and its actual makers. The old account stays available, while current furnishings carry no invented guarantee about blood, virtue or supernatural judgment.",
          "effect": "workshop"
        },
        {
          "label": "Keep authority over every promise discussed in the room",
          "outcome": "You reserve the room around your approval and conditions. The younger keepers remember that restriction, and the surviving account describes the unfinished demands your rule has begun to resemble.",
          "effect": "claim"
        }
      ]
    ],
    "road_four_tracks": [
      [
        "Travelers at {place} have started marking the ordinary road with four different shapes so people can find it in poor light. The account associated with {name} describes the older tracks and the fate chosen for their travelers; these new marks are paint and carved wood. A current guide wants to include several beastfolk traditions without pretending they all follow one road. A trader favors one recognizable emblem. A patron wants the route named for a single obedient household. Four guides wait nearby with different ideas of a useful sign, and a traveler who only wants to stop getting lost.",
        {
          "label": "Help the guides keep several traditions and a usable route",
          "outcome": "You support route markings that remain practical without claiming one emblem represents every beastfolk traveler. The older threshold retains its recorded ending, and the new road belongs to living journeys.",
          "effect": "route"
        },
        {
          "label": "Build a guide trade naming its actual makers and paths",
          "outcome": "You organize a venture whose guides identify their own routes and contributions. Visitors gain usable travel knowledge without buying a claim that all four old travelers became one people.",
          "effect": "market"
        },
        {
          "label": "Make the route answer to one favored household emblem",
          "outcome": "You reserve the route’s public identity around a household you control. Other guides retain their markings and accounts beyond your preferred emblem, while the old history remains unchanged.",
          "effect": "claim"
        }
      ],
      [
        "One of the painted route marks at {place} has been mistaken for a dancing kettle. The guides have decided to keep it because travelers remember the joke. In {name}’s preserved account, the old travelers asked for separate endings rather than a single voice. Current keepers must decide who maintains the ordinary road next. They could share the work across different households, build independent guiding practices, or submit every marking to your approval. A current traveler copies the kettle onto a scrap of cloth, convinced it will be easier to remember than another proud beast. The kettle points down a living road, where departures still have reasons of their own.",
        {
          "label": "Leave the route to several households with their own stories",
          "outcome": "You support shared practical tending without making the keepers speak as one people. The dancing kettle remains useful, and the old travelers keep the separate fate recorded in their account.",
          "effect": "route"
        },
        {
          "label": "Establish independent guides around the current road",
          "outcome": "You organize a continuing trade where guides can identify their own work and limits. The route supports varied journeys without granting any household ownership of another traveler’s destination.",
          "effect": "market"
        },
        {
          "label": "Make every mark on the road require your approval",
          "outcome": "You reserve the route’s public markings under your authority. The guides remember that demand and keep alternative signs beyond your control, along with the earlier account of denied departures.",
          "effect": "claim"
        }
      ]
    ],
    "moon_broken_roof": [
      [
        "The roof at {place} needs ordinary repair around the place where the strange observation began. A maker has used a crescent-shaped tile simply because it fits. The account associated with {name} contains the keeper’s words and the ending chosen for the other night; the new tile predicts nothing. Current observers want to study the settlement’s own sky, and a teacher wants somewhere sheltered to begin. A patron offers funds for impressive omens rather than patient observation. You can support the actual work, build an independent observatory, or make the roof’s reputation answer questions the stars have never agreed to settle.",
        {
          "label": "Help create a sheltered place for patient observation",
          "outcome": "You support lessons about the actual sky and the limits of what observers know. The other night retains its earlier chosen fate, and a crescent tile remains useful building work.",
          "effect": "school"
        },
        {
          "label": "Build an independent observatory with clearly bounded visits",
          "outcome": "You organize an observatory venture around real observations and the preserved history. Visitors can choose to attend without being promised a new omen whenever the sky refuses to cooperate.",
          "effect": "workshop"
        },
        {
          "label": "Sell the roof’s old reputation as certainty about the future",
          "outcome": "You advertise predictions the current observations cannot support. The venture gains your claims, while the old account and new sky remain available to contradict a convenient prophecy.",
          "effect": "blackmail"
        }
      ],
      [
        "The observatory at {place} has produced a careful chart with one large blank space where the observer admits falling asleep. Somebody has drawn a pillow in it. A sentence from {name}’s preserved account reads, \"The unfinished watch was real; so was the morning beyond it.\" Current keepers want to decide how the practice continues. A school would keep the honest blank; a trader would frame the whole chart; a patron would prefer you to fill the space with something grand. An observer is trying to stay awake now, taking bitter tea in solemn little sips. The settlement’s own sky has offered a smaller test of whether you can leave uncertainty visible.",
        {
          "label": "Leave the observatory to teachers who preserve honest limits",
          "outcome": "You support a continuing school that keeps the pillow and blank on the chart. The old watching rite remains history, while living observers learn that an unfinished answer can be useful.",
          "effect": "school"
        },
        {
          "label": "Establish a tended observatory supported by independent visits",
          "outcome": "You organize a venture around current observation and clearly identified displays. The chart can be framed with its blank intact, and visitors receive no guaranteed revelation from the old roof.",
          "effect": "market"
        },
        {
          "label": "Fill the blank with a prophecy and claim exclusive authority",
          "outcome": "You replace admitted absence with a prediction useful to your standing. Earlier copies preserve the pillow and blank, recording where your new certainty began without an observation.",
          "effect": "blackmail"
        }
      ]
    ]
  },
  "branchPremises": {
    "cracked_mark": {
      "care": "Your latest choice made a fault visible instead of hiding it. The makers remember the practical correction, and the preserved complaint still has a place beside the work.",
      "enterprise": "Your latest choice treated the work as a limited independent venture. That bargain remains what you actually offered; it did not settle every grievance around the earlier fault.",
      "coercion": "Your latest choice used control of the work or its account to gain authority. Surviving copies and the makers who know the pressure remain beyond a flattering display."
    },
    "two_names": {
      "care": "Your latest choice preserved more than one contribution to the route. The jointly held observations remain part of the history, even when the mapmakers disagreed about what they saw.",
      "enterprise": "Your latest choice kept a separate trade around identified contributions. It did not grant one guide ownership of every other field page or make competing observations disappear.",
      "coercion": "Your latest choice claimed authority at another maker’s expense. The original pages and excluded contributions remain in the saved history; a useful route does not make that appropriation true."
    },
    "winter_commons": {
      "care": "Your latest choice helped the people who actually work the beds. Their contributions remain distinct, and earlier boundaries are not silently erased by a generous new arrangement.",
      "enterprise": "Your latest choice made a bounded trade from the beds and their produce. The bargain remains separate from a claim to every household’s ground or future harvest.",
      "coercion": "Your latest choice used supplies or access to strengthen control of the beds. The affected growers retain their own account of the condition, including who stood outside it."
    },
    "hearth_letter": {
      "care": "Your latest choice addressed the household’s actual needs without turning old paper into a hereditary command. The surviving disagreements remain; practical care did not make every relative agree.",
      "enterprise": "Your latest choice separated a useful private arrangement from the wider family claim. The room and papers still carry their history, while the venture has its own limits.",
      "coercion": "Your latest choice pressed a claim over the household or room. The older papers do not become unanimous support for that pressure, and affection cannot be read from compliance."
    },
    "night_door": {
      "care": "Your latest choice made the door useful to a traveler without purchasing their whole life. The charter already chosen for this place still matters, along with the guest’s own boundaries.",
      "enterprise": "Your latest choice supported an independent livelihood around the actual door. The agreed trade did not grant its keepers possession of a guest’s private journey.",
      "coercion": "Your latest choice used admission or a traveler’s route as leverage. The people directly affected know that demand; it does not become knowledge held by every stranger on the road."
    },
    "own_key": {
      "care": "Your latest choice gave learners room to develop work under their own names. The earlier teaching pages remain credited, and the next attempt need not fit your imagined future.",
      "enterprise": "Your latest choice organized a venture around separate contributions. The commissions belong to the work actually offered, leaving independent teaching distinct from an endless obligation.",
      "coercion": "Your latest choice reserved learning or credit under your authority. The excluded makers retain their own work and account; your signature does not erase how they contributed."
    },
    "buried_bell": {
      "care": "Your latest choice attended the bell site without buying authority through fear. Whatever release or binding the earlier vigils actually established remains its history; care cannot invent a returning voice.",
      "enterprise": "Your latest choice arranged tended work or willing attention around the bell site. That trade does not prove an unknown object’s identity or change the earlier fate of the voices.",
      "coercion": "Your latest choice profited from fear or control at the bell site. The keepers retain the history of that pressure, and unsupported claims do not become facts about the buried dead."
    },
    "water_second_face": {
      "care": "Your latest choice helped the crossing or the living shore without demanding a passenger’s whole story. The old boat keeps the fate chosen for it; the present bank offers different work.",
      "enterprise": "Your latest choice made a bounded vigil or guiding trade around the shore. The account’s earlier farewell remains distinct from any guarantee sold about the current path.",
      "coercion": "Your latest choice used the crossing’s fear or access as leverage. The recorded fate of the boat remains intact, and your new claim cannot turn resemblance into a verified token."
    },
    "hollow_mask": {
      "care": "Your latest choice preserved the watcher’s wrongdoing alongside the lives it affected. The earlier release or continuing vigil remains recorded; a repaired memorial does not grant the watcher a pardon.",
      "enterprise": "Your latest choice supported tended work or performance around the niche. The trade has its own limits, and the old confession is not a new endorsement spoken by an absent watcher.",
      "coercion": "Your latest choice used the commanding face or its account to strengthen authority. The smaller marks and saved confession remain part of the history that a grander legend would conceal."
    },
    "moth_window": {
      "care": "Your latest choice tended welcome while leaving the living household room to breathe. The strange guest keeps its recorded fate; ordinary moths at the sill do not prove a return.",
      "enterprise": "Your latest choice arranged a bounded watch or separate attraction around the window. Public curiosity did not automatically acquire ownership of the household’s ordinary rooms.",
      "coercion": "Your latest choice made fear or entry at the window a source of control. The occupants retain their own account, and the earlier welcome mark does not authorize your new demand."
    },
    "silverleaf_names": {
      "care": "Your latest choice preserved remembrance without assigning strangers to a living family. The silver shadows keep their recorded fate, and uncertain names remain distinct from inherited entitlement.",
      "enterprise": "Your latest choice organized willing remembrance or clearly identified current work. That trade does not establish ancestry for the names held in the older account.",
      "coercion": "Your latest choice used the names or their public story to gain control. The preserved account supplies no automatic kinship, even if a beautiful lineage legend would now benefit you."
    },
    "stone_last_note": {
      "care": "Your latest choice gave attention to a worker’s actual burden rather than another endless test. The old shift keeps its recorded ending; current crews still need their own useful practices.",
      "enterprise": "Your latest choice made a bounded vigil, lesson or trade around the doorway. The venture concerns work actually offered, not ownership of every future stroke from another maker.",
      "coercion": "Your latest choice used the shift or its living lesson as a demand for obedience. The preserved ending and stopping signal remain in the history, including what you refused to allow."
    },
    "ninth_hearth": {
      "care": "Your latest choice kept welcome compatible with a guest’s departure. The impossible host keeps its earlier recorded fate, while the living table has practical burdens of its own.",
      "enterprise": "Your latest choice arranged willing visits or an independent meal venture. That work did not make an ordinary supper proof that the old impossible hearth had returned.",
      "coercion": "Your latest choice made admission or a hungry welcome a source of authority. The people excluded retain their own story, and attendance does not establish freely offered affection."
    },
    "bannerless_oath": {
      "care": "Your latest choice heard a burden without demanding another impossible proof. The old shadow keeps its recorded fate, and living trainees do not inherit its commander’s oath merely by arriving.",
      "enterprise": "Your latest choice arranged a willing vigil or bounded defensive practice. It concerned the work actually offered, not every future act of strength a patron might imagine buying.",
      "coercion": "Your latest choice put strength or its public story beneath another demand for allegiance. The saved request to be heard remains alongside that decision, outside the banner’s authority."
    },
    "drain_lullaby": {
      "care": "Your latest choice left room for the song and the lives around it. The old echoes keep their recorded ending; living singers can change a verse without summoning them back.",
      "enterprise": "Your latest choice arranged willing hearings or a musical trade with identified contributors. The old account remains separate from new performances and the claims their audiences might imagine.",
      "coercion": "Your latest choice used silence or control of the song as leverage. Other singers retain their versions, and the old room’s denied voice remains in the history you cannot wholly reserve."
    },
    "horns_candle": {
      "care": "Your latest choice allowed a promise to have questions and an ending. The old mirror keeps its recorded fate; a horned frame does not establish anyone’s virtue or blood obligation.",
      "enterprise": "Your latest choice arranged willing hearings or clearly ordinary craft work. The venture carries its own limits and offers no automatic judgment from the earlier keeper.",
      "coercion": "Your latest choice made words or their public account answer to your approval. The preserved warning about unfinished demands remains, and compliance is not evidence of an oath freely chosen."
    },
    "road_four_tracks": {
      "care": "Your latest choice kept separate travelers and traditions from being forced into one voice. The old threshold keeps its recorded fate; current guides follow living roads for their own reasons.",
      "enterprise": "Your latest choice arranged willing attention or guides with identified paths and contributions. That trade did not turn every beastfolk journey into the property of a single household.",
      "coercion": "Your latest choice used access or one favored route story to strengthen control. Other guides retain their signs and memories, while the denied departures stay recorded in the older account."
    },
    "moon_broken_roof": {
      "care": "Your latest choice kept attention on an actual watch or its honest limits. The other night retains its recorded ending; the living sky need not produce another revelation to be worth observing.",
      "enterprise": "Your latest choice arranged willing observation or an independent venture around the roof. Its trade remains bounded, and the old keeper has not promised a fresh omen for each visitor.",
      "coercion": "Your latest choice used the roof’s fear or reputation to advertise certainty. The preserved observations still distinguish what was seen from what you demanded other people believe."
    }
  }
};
