// Authored content. Gameplay applies typed effects and saves decisions separately.
export const REGIONAL_STORIES_V27 = [
  {
    "id": "rainward_last_lantern",
    "regionId": "rainward",
    "title": "The Last Lantern on the Causeway",
    "summary": "A stolen watch light becomes a struggle over who may reach dry ground. Refuge, a profitable road, and a new petty tyranny can all grow from the same frightened night.",
    "chapters": [
      {
        "title": "A Light Too Low",
        "body": "Rain has turned the raised road outside {place} into a narrow spine above black water. One watch lantern burns below it, where no dry footing should be. Carts halt. From the reeds comes a man's voice, very politely asking to be let into a house that drowned years ago.\n\n{speaker} stands with a wet spear and a cabbage tucked under one arm. \"Supper,\" they explain, seeing your look. \"If the road takes me, it can learn to cook.\" Their joke fails when another voice answers from the water.\n\nAt the last dry doorway, {keeper} tends a lamp of {faith}. Its oil will not last the night. {merchant} has oil in a locked wagon; {rival} offers guards in return for control of the crossing. Nobody agrees whether the low light belongs to a stranded traveler or somebody teaching the marsh to call. The people waiting behind you are real enough.",
        "branchBodies": {
          "aid": "The waiting households have already made room around your small shelter. They expect help tonight, and the guards are uncomfortable with a doorway their captain cannot close.",
          "trade": "Your paid carriers arrive with oil and a hungry expectation of wages. Keeping their road open may bring light to everyone, but they want their own wagons moved first.",
          "scheme": "The toll keeper believes you can make the low lantern disappear. Their trust is bought with a secret, and they are beginning to ask what else you can conceal.",
          "fight": "The frightened watch backs your judgement after the roadside struggle. One injured guard wants to go home; their captain wants your strength used on the people refusing orders."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Share the dry doorway and tend its lamp",
            "outcome": "You carry blankets and keep a small light above the flood. People settle shoulder to shoulder; even the cabbage finds a pot before morning.",
            "days": 3,
            "cost": 6,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Buy oil and escort the merchant carts",
            "outcome": "You keep the oil wagon moving and make the crossing worth supplying. The merchant pays for the escort; the poor carts still wait behind it.",
            "days": 3,
            "cost": 12,
            "reward": 30,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Give the rival a private way around the watch",
            "outcome": "You point out a reed path the watch has overlooked. The rival pays, and learns that your help can move people the captain would prefer to stop.",
            "days": 2,
            "cost": 0,
            "reward": 32,
            "skill": {
              "id": "stealth",
              "min": 2
            },
            "effect": "smuggling"
          },
          {
            "id": "investigate",
            "label": "Follow the misplaced light along the bank",
            "outcome": "You find a hooked pole and fresh boot marks below the causeway. Someone living has been moving the light; the voices remain harder to explain.",
            "days": 3,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 2
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the crossing to its watch",
            "outcome": "You turn away from the waiting carts. No lantern is raised by your departure, and the frightened households must look for another pair of hands.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Boots at the Door",
        "body": "A boot dries beside the lamp in {place}. Its mate was found on the flooded road with a foot still inside. The watch calls it proof of a marsh creature. {speaker} calls it proof that the patrol has lost a person, which seems the larger matter.\n\nAt supper, {friend} serves the cabbage in a bowl far grander than the meal deserves. Nobody laughs until someone asks whether the bowl ought to receive its own ration. For a moment the room feels like a room again.\n\nThen {rival} arrives carrying the missing guard's spare coat. They say deserters have stolen lantern hooks and are luring supply wagons off the road. Their proposed cure is to bar the causeway after dusk. {keeper} remembers a different sound: the drowned voice used the watch captain's childhood nickname. The captain, suddenly pale, orders everybody to stop repeating it. Your earlier decision has given you friends here, or people who need you useful.",
        "branchBodies": {
          "aid": "The people you sheltered include a limping deserter. They admit stealing a lantern hook to guide their own family home, and fear what the watch will make of that theft.",
          "trade": "The merchant has counted the missing wagon against your escort. They want a safe route before paying again; their driver quietly offers you the captain's abandoned coat.",
          "scheme": "Your hidden reed path has carried the deserter's family past the toll. The rival now wants the route closed behind them, so nobody else can escape without paying.",
          "fight": "The watch captain wants the injured guard silenced about the night fight. Their bruises make the missing patrol harder to dismiss as a story about monsters."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Hide the frightened family until daylight",
            "outcome": "You make room for people the watch is ready to blame. They sleep badly but safely, while the keeper refuses to let the doorway become a trap.",
            "days": 3,
            "cost": 8,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Pay guides to recover the missing supplies",
            "outcome": "Your guides bring food out of the reeds and earn their share. The merchant accepts a smaller profit, grumbling most loudly while helping unload the sacks.",
            "days": 4,
            "cost": 16,
            "reward": 42,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Keep the captain's old nickname for leverage",
            "outcome": "You let the captain see that you recognize the name from the water. Their gratitude becomes fear, and a private purse changes hands behind the watchhouse.",
            "days": 2,
            "cost": 0,
            "reward": 38,
            "skill": {
              "id": "persuasion",
              "min": 3
            },
            "effect": "blackmail"
          },
          {
            "id": "investigate",
            "label": "Compare the patrol tracks before naming a culprit",
            "outcome": "You trace two patrol routes where the captain claimed one. A living mistake emerges beneath the ghost story: someone sent the last wagon onto rotten boards.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 3
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Let the watch settle its own missing patrol",
            "outcome": "You decline to pursue the boot, the coat, or the family. Their danger remains outside your door; your departure earns no purse or recovered supplies.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Patrol Without a Banner",
        "body": "War reaches the marsh as a distant glow, then as wet people walking without carts. The causeway has become the shortest way to dry ground. At {place}, somebody has painted the watch captain's crest over the refuge door.\n\n{speaker} stares at it. \"Fine bird. Shame it cannot carry a blanket.\" They scrape at the paint with a spoon until {friend} takes the spoon away; supper still needs eating.\n\nThe captain wants the refugees searched for deserters. {rival} wants the strongest hired into a private guard. {merchant} sees customers, porters, and a road that will not survive much longer without repairs. A child points to the low lantern, now drifting against the current. Its light passes over a drowned stone stair and stops as if waiting for feet.\n\n{keeper} asks you to remember what your earlier help actually changed. A warm doorway can become a checkpoint. A paid escort can become a lifeline. Even a hidden path can deliver somebody into the wrong hands.",
        "branchBodies": {
          "aid": "The families from your open doorway know where to find you. They ask you to help the new arrivals before the watch turns your shelter into a recruiting pen.",
          "trade": "Your restored supply wagons can feed the refugees for several days. The merchant asks who will carry the sacks, and whether this time anybody will be paid.",
          "scheme": "The captain fears the story you hold and offers you authority over admissions. The rival smiles as though your old secret has finally become a respectable uniform.",
          "fight": "The patrol expects you to lead another fight. The injured guard refuses to march against hungry civilians, and their refusal divides people who once cheered you."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Take supplies to the arrivals before the searches",
            "outcome": "You carry food past the painted crest and help tired strangers sit down. Local households begin sharing the work before any officer can claim the welcome.",
            "days": 5,
            "cost": 18,
            "reward": 0,
            "skill": null,
            "effect": "war_relief"
          },
          {
            "id": "trade",
            "label": "Hire refugees to mend the supply road",
            "outcome": "You pay skilled arrivals to brace the boards and haul provisions. A temporary camp becomes useful work, though nobody mistakes a wage for a permanent home.",
            "days": 6,
            "cost": 24,
            "reward": 48,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Use the captain's fear to control admissions",
            "outcome": "The captain lets your chosen people pass while others wait under the rain. You gain influence, and the excluded households learn exactly whose favor they lack.",
            "days": 3,
            "cost": 0,
            "reward": 35,
            "skill": {
              "id": "persuasion",
              "min": 4
            },
            "effect": "claim"
          },
          {
            "id": "fight",
            "label": "Drive armed recruiters away from the shelter",
            "outcome": "You force the recruiters back from the sleeping rooms. Their employer will remember the humiliation, but tonight nobody is marched from a blanket into a uniform.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "weapons",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Keep clear of the growing camp",
            "outcome": "You leave the camp's welcome and searches to other people. The arrivals still need food, shelter, and work; their need produces no reward for your absence.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Last Lamp",
        "body": "The low lantern stops moving on the night the watch runs out of oil. From the reeds, voices begin calling the names of households sheltering at {place}. The people whose names are spoken do not know whether to answer.\n\n{speaker} has found the stolen hooks in a dry hollow beneath the causeway. A living gang used some to divert carts. Other hooks hang from roots that have grown around them, each root warm as a pulse. The gang has fled. Its trap has learned to work without it.\n\n{keeper} carries a tiny flame cupped between both hands. \"I can keep one lamp,\" they say. \"You must decide where people stand around it.\" Their faith offers courage, not an explanation for every voice.\n\n{rival} argues for closing the shelter and defending the profitable road. {friend} has begun leading sleepers uphill before the argument finishes. You can follow that practical kindness, protect a narrower interest, or turn the fear into something people will remember whenever they need your door.",
        "branchBodies": {
          "aid": "The families you helped know the higher doorway and can guide new arrivals there. Keeping it open means drawing the callers toward a place you wanted to make safe.",
          "trade": "The repaired causeway will bear the merchant carts and walking households together, if you abandon the promise that customers will always have the first passage.",
          "scheme": "Your control of the gate has left a crowd outside. Their angry voices mix with the callers, making it harder to tell a living accusation from the marsh.",
          "fight": "The recruiters you drove away have returned at a distance. They will defend the high road only if you hand over people whose safety you fought for earlier."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Guide everyone uphill behind the keeper's light",
            "outcome": "You carry the weak across the last sound boards and keep the group together. The callers follow for a while, then fall behind the ordinary sound of breathing.",
            "days": 6,
            "cost": 20,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Sacrifice valuable cargo to brace the crossing",
            "outcome": "The merchant loses fine goods to save the wagons and the people beside them. You recover a working supply route, with a smaller reward than either of you hoped.",
            "days": 5,
            "cost": 28,
            "reward": 40,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Sell the safest doorway to the rival",
            "outcome": "The rival takes the high doorway and pays you well. Those admitted survive under their guard; people outside begin searching for another path through the dark.",
            "days": 3,
            "cost": 0,
            "reward": 55,
            "skill": {
              "id": "stealth",
              "min": 4
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Keep a silent vigil until the callers pass",
            "outcome": "You tend the little lamp without speaking the names from the reeds. Those who join you keep their own prayers; the voices fade before the wick gives out.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 4
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Withdraw before the lamp must be placed",
            "outcome": "You leave the last light in the keeper's hands and take neither authority nor payment. The crossing's frightened people must choose where to gather without you.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Door in Dry Weather",
        "body": "A dry morning returns to {place}. It feels indecently cheerful after so many nights listening for footsteps. The marsh is full of frogs; every one appears determined to interrupt {speaker}'s speech about vigilance.\n\nThe old low lantern hangs from the refuge beam, empty now. {keeper} will not bless it or burn it. \"People used it badly,\" they say. \"That does not mean the iron owes us an apology.\"\n\n{merchant} wants a lasting depot beside the repaired road. {rival} offers a guardhouse with your name over its door. {friend} proposes a room where exhausted arrivals can be treated before anybody asks what useful work they can do. Each plan would change who comes here, and what they must bring.\n\nYour earlier choice already belongs to the crossing's history. {lastOutcome} The people who benefited remember it differently from the people who paid. You can give that history a daily shape: a place to rest, a trade worth tending, or power that will remain attractive after the rain returns.",
        "branchBodies": {
          "aid": "Your open shelter has become a place strangers ask for by description. A permanent sickroom would protect that welcome, but the rival calls it an invitation to every troublesome traveler.",
          "trade": "Carters trust the route you kept usable. They offer regular deliveries if a depot is built, and the keeper asks whether its warmth will reach beyond paying customers.",
          "scheme": "The rival's guards now hold the best doorway. They invite you to join its owners; the excluded households speak of reopening the old path without your blessing.",
          "fight": "The watch still remembers your refusal to hand over the sleepers. Some guards ask to serve a refuge instead of the captain; others will never forgive your defiance."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Make the refuge room a small clinic",
            "outcome": "You help fit the room for fever beds and tired arrivals. Its first patient complains about the soup, which makes the keeper laugh for the first time in weeks.",
            "days": 7,
            "cost": 30,
            "reward": 0,
            "skill": null,
            "effect": "clinic"
          },
          {
            "id": "trade",
            "label": "Build a lasting depot on the dry road",
            "outcome": "You turn a precarious escort into a useful local trade. Goods move regularly, and the merchant keeps a lamp burning for late carriers as well as customers.",
            "days": 7,
            "cost": 24,
            "reward": 54,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Take a share in the guarded crossing",
            "outcome": "Your name joins the guardhouse door and its profits. People who once asked you for shelter now have to decide whether your favor is worth its price.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Teach the next watch how the trap worked",
            "outcome": "You walk new watchers through the rotten boards and misplaced hooks. Fear becomes something they can question, without pretending the unexplained voices were never heard.",
            "days": 6,
            "cost": 10,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 4
            },
            "effect": "school"
          },
          {
            "id": "leave",
            "label": "Leave the crossing's future to its residents",
            "outcome": "You take your leave without claiming the new doorway, depot, or watch. The crossing keeps the consequences of your earlier actions, and others decide its daily future.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  },
  {
    "id": "saltreach_drowned_feast",
    "regionId": "saltreach",
    "title": "The Feast Beneath the Tide",
    "summary": "A wreck brings familiar possessions home without their owners. Harbor families, divers, smugglers, and a moon watcher disagree over what should be brought up from the water.",
    "chapters": [
      {
        "title": "Places Already Set",
        "body": "A storm drives a little dining table onto the shore below {place}. Four plates remain fastened to it with silver wire. The cups are dry. One contains a ring that a harbor family buried with a sailor many years ago.\n\n{speaker}, who normally dives for broken anchors, turns the ring between salt-rough fingers. \"Either we buried a thief,\" they say, \"or the sea has developed expensive tastes.\" They do not smile when {friend} recognizes another cup.\n\nFrom the harbor wall you can see a mast moving beneath the water, its lantern traveling where the tide should have put out any flame. {keeper} knows the old moon-watch songs and cautions that a returned possession is not a returned person. {merchant} wants the silver before another crew reaches it. {rival} offers to fund the dive in exchange for whatever is found beneath the table. The shore smells of wet rope, fish smoke, and a supper nobody has dared to eat.",
        "branchBodies": {
          "aid": "The family you helped has brought blankets for the divers. They want their keepsakes back and are afraid that wanting them will make the sea ask for something more.",
          "trade": "Your backers have sent a proper boat, good rope, and a tally of what they expect to recover. The ring is still in the cup, conspicuously absent from their wishes.",
          "scheme": "A hidden buyer knows where your first relic came from. They offer better money for anything showing a family crest, preferably before the family sees it.",
          "fight": "The salvage crew you confronted is keeping its distance. Their boat still circles the submerged light; pride may bring them back before good sense does."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Help the harbor family recover its keepsakes",
            "outcome": "You spend the low tide hauling the table above the surf. The family takes the ring in silence, then offers hot food to every cold person still working.",
            "days": 3,
            "cost": 8,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Equip a careful salvage voyage for the merchant",
            "outcome": "You fit good rope and lamps to the salvage boat. The merchant buys ordinary silver from the wreck; the cups that bear familiar names stay on the shore.",
            "days": 4,
            "cost": 18,
            "reward": 36,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Move the strange silver through a hidden buyer",
            "outcome": "You sell a small piece of the strange silver away from the harbor crowd. The buyer pays for discretion, and begins asking which families might want the rest.",
            "days": 2,
            "cost": 0,
            "reward": 32,
            "skill": {
              "id": "stealth",
              "min": 2
            },
            "effect": "smuggling"
          },
          {
            "id": "investigate",
            "label": "Follow the mast only during the falling tide",
            "outcome": "You mark where the mast appears against the headland and find a safe descent. The light remains below; your careful route does not make its source less unsettling.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 3
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the table above the surf",
            "outcome": "You leave the cups and the returned ring with the harbor families. No dive is completed on your behalf, and the strange silver yields you nothing.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Diver's Second Shadow",
        "body": "{speaker} comes up from the wreck with a line of white salt across their throat. Beneath the boat they saw a banquet laid out behind broken windows. The seats were empty. Something still moved the curtains as if guests had only stepped outside.\n\nThe diver's shadow now bends toward the sea even when the sun stands inland. They try to tread on it. \"I am going to need a longer boot.\" {friend} laughs, then covers their mouth when the shadow does not follow.\n\n{keeper} sets a silver-rimmed bowl by the harbor wall. The reflection shows an ordinary tired face, not a prophecy. They suggest rest before another descent. {merchant} has heard that a sealed chest remains beneath the banquet floor; {rival} has heard that one cup reveals where its owner's descendants sleep. Neither rumor has been proved. You can make a living from the wreck, but the divers must go home with whatever they bring back in their bodies.",
        "branchBodies": {
          "aid": "The family whose ring you returned offers the diver a spare room. They admit they want another cup recovered, but have not asked again after seeing the shadow.",
          "trade": "The merchant's financed boat is ready for another trip. A sailor refuses to board unless the diver rests first; the merchant dislikes being reminded who actually takes the risk.",
          "scheme": "Your hidden buyer wants the cup that might reveal a household. The diver refuses to find it for them, leaving you a choice between the worker and the profitable rumor.",
          "fight": "The rival crew claims you injured its diver during the harbor fight. Whether their story is fair or not, rescuing your own diver now will be watched closely."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Keep the diver warm and away from another descent",
            "outcome": "You help the diver sleep above the tide and take ordinary meals. Their shadow slowly turns with the sun again; they remember who let them stop working.",
            "days": 5,
            "cost": 10,
            "reward": 0,
            "skill": null,
            "effect": "clinic"
          },
          {
            "id": "trade",
            "label": "Hire another crew for the ordinary salvage",
            "outcome": "You give rested workers a safe rope and pay for recoverable cargo. The valuable chest remains sealed, but the voyage earns enough to keep the harbor trade interested.",
            "days": 5,
            "cost": 22,
            "reward": 44,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Sell the rumor of the household-finding cup",
            "outcome": "You sell a buyer the lead they wanted without promising that it is true. Their agents begin asking questions around the harbor, and the families become noticeably wary.",
            "days": 3,
            "cost": 0,
            "reward": 38,
            "skill": {
              "id": "persuasion",
              "min": 3
            },
            "effect": "blackmail"
          },
          {
            "id": "ritual",
            "label": "Join a quiet moon watch beside the diver",
            "outcome": "You sit by the bowl while the diver names what frightened them. Your chosen vigil brings company through the longest hours; it does not require the diver to share your faith.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 3
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Let the diver choose whom to ask for help",
            "outcome": "You do not buy another descent or promise a cure. The diver seeks company elsewhere, and the harbor keeps wondering what waits behind the submerged windows.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "An Invitation Written in Salt",
        "body": "At low tide, pale letters appear on the dining table. They are invitations to a feast beneath the water. The names belong to houses still standing around {place}; whoever made the invitations knows which doors face the harbor.\n\n{rival} calls this proof of treasure worth guarding. {merchant} thinks it will bring wealthy visitors, if the invitations can be made respectable. {friend} holds a cup without looking into it. \"The dead cannot have enjoyed every party while they were living,\" they say. \"A watery invitation seems unlikely to improve matters.\"\n\n{keeper} sings the old farewell verse of {faith}, then stops before the part that calls an answer. Some families want the sea to explain their losses. Others are furious that a thing below the surf has learned their names. A boatman offers a middle way: the wreck lies beside a cave where smugglers once landed during bad weather. It might be approached without accepting any invitation. His boat, unfortunately, belongs to somebody demanding more than ordinary fare.",
        "branchBodies": {
          "aid": "The diver you nursed can describe the safe descent clearly. They offer guidance from the boat, but their hands shake at the suggestion of another swim.",
          "trade": "Your salvage money has paid for ropes and a rested crew. The merchant wants to stage a profitable spectacle, and the crew wants the job to remain an ordinary dive.",
          "scheme": "The buyer following your rumor has copied the invitations. Their agents now know which households are afraid, and your access to the cave depends on that knowledge.",
          "fight": "The rival crew has discovered the cave passage first. Its captain offers a truce for one voyage, with an uneasy glance toward the shadow beneath the mast."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Help the families refuse the invitations together",
            "outcome": "You gather the worried households above the harbor and leave the cups untouched. Refusing alone had felt like cowardice; refusing together gives them an evening back.",
            "days": 4,
            "cost": 12,
            "reward": 0,
            "skill": null,
            "effect": "ward"
          },
          {
            "id": "trade",
            "label": "Purchase the cave voyage and pay the crew fairly",
            "outcome": "You buy a safe approach to the wreck and keep the crew's work practical. The boatman guides later carriers through the same cave, grateful for an honest voyage.",
            "days": 5,
            "cost": 26,
            "reward": 42,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Turn the invitations into a profitable secret",
            "outcome": "You trade selective access to the cave and the fearful households. The buyer rewards you; the harbor begins hiding its family keepsakes when your boat approaches.",
            "days": 3,
            "cost": 0,
            "reward": 48,
            "skill": {
              "id": "stealth",
              "min": 4
            },
            "effect": "smuggling"
          },
          {
            "id": "investigate",
            "label": "Search the shore for who first carried the cups",
            "outcome": "You find recent rope splices beneath older salt deposits. A living scavenger moved some invitations ashore, though they swear the letters appeared only after the cups dried.",
            "days": 5,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 4
            },
            "effect": "school"
          },
          {
            "id": "leave",
            "label": "Refuse the voyage and step away from the invitations",
            "outcome": "You neither accept the feast nor organize its refusal. The families keep their own fears and hopes, and the submerged table offers you no earned advantage.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Supper No One Ate",
        "body": "The cave opens during a storm lull. Beyond it, the wreck rests in a pocket of air smelling of cold wax. Every place at its table is set for someone from the harbor. The cloth stirs although the air is still.\n\n{speaker} stays beside the rope. {friend} reaches for a cup, then sees a familiar spoon placed across it and pulls their hand back. The small thing is worse than a grand apparition: somebody has remembered how a person used to stir their tea.\n\n{rival}'s guard has found the sealed chest and wants it lifted immediately. {merchant} sees the roof flex with the next tide and urges everyone to leave with what they can carry. {keeper}, waiting above, cannot answer for whatever waits below. You have only the boat crew, the route you prepared, and the earlier choices that made them willing or frightened to follow you. On the table, a fifth chair slowly draws itself back.",
        "branchBodies": {
          "aid": "The households who refused the invitations have sent someone to wait above with blankets. You can leave the keepsakes here without pretending that the families have chosen to forget.",
          "trade": "Your paid crew is ready to lift ordinary cargo and withdraw. The chest would make the voyage rich, but carrying it means abandoning some of the safe equipment.",
          "scheme": "The buyer's agents have followed your hidden route. They want the chest and the familiar cups; the boat crew realizes it may have carried more than a salvage party.",
          "fight": "The rival guard distrusts you after the earlier confrontation. When the fifth chair moves, they reach for a weapon instead of the rope, putting everyone behind them at risk."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Bring the crew out and leave the waiting chair empty",
            "outcome": "You take shaking hands to the rope and leave the offered meal untouched. The sea closes over an empty table; everyone who came with you reaches the harbor alive.",
            "days": 6,
            "cost": 16,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Lift the safe cargo and abandon the sealed chest",
            "outcome": "You choose what the boat can carry without sacrificing its crew. The merchant earns a modest profit, and the voyage becomes a story about good judgement rather than sudden wealth.",
            "days": 5,
            "cost": 24,
            "reward": 50,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Take the cups through the hidden cave exit",
            "outcome": "You carry the most personal objects out by a route the harbor families cannot watch. The buyer pays richly; fear of their use remains part of the sale.",
            "days": 4,
            "cost": 0,
            "reward": 56,
            "skill": {
              "id": "stealth",
              "min": 5
            },
            "effect": "blackmail"
          },
          {
            "id": "fight",
            "label": "Hold the passage while the crew escapes",
            "outcome": "You keep the armed looters from cutting ahead of the boat crew. Steel rings against old stone until the last rope is clear; the wreck keeps its unopened chest.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "defense",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Leave the final descent to the boat crew",
            "outcome": "You hand the remaining voyage back to the people aboard. You claim no chest, rescue, or triumph from the wreck; whatever they find will be their own risk.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "Warm Cups on the Quay",
        "body": "At {place}, the harbor has begun holding an evening meal when the last working boat comes home. Some people bring fine cups. Others bring chipped bowls, and one sailor always carries a mug that leaks unless they grip it in exactly the right place.\n\n{speaker} says the mug is a useful test of character. {friend} says it is a useful test of whether anyone will buy the sailor a better mug. For once the argument matters less than the laughter.\n\nThe dining table from the wreck stands under a tarred roof. Some families want it made into a memorial. {merchant} proposes a lasting quay market, while {rival} wants exclusive use of the cave landing. {keeper} has no need to declare which plan the moon prefers. The harbor will have to live with the plan, not the moon.\n\nYour earlier choice is remembered whenever the table is mentioned. {lastOutcome} There is still a dark place beneath the headland. What grows above it can offer ordinary warmth, profitable passage, or another reason for people to hide their cups.",
        "branchBodies": {
          "aid": "The crew you brought home sits with the families who refused the underwater feast. They want a place that welcomes return without asking everybody to be fearless.",
          "trade": "The modest salvage profits have made the quay useful again. The merchant offers steady work and space for fishers, if you will help keep the landing open.",
          "scheme": "The stolen cups are already circulating among private buyers. Some harbor households avoid the evening meal, and the rival offers to sell them protection from the worry you helped create.",
          "fight": "The crew remembers who held the cave passage. They want a rescue boat kept ready there, even if it earns less than a secret landing for valuable cargo."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Give returning crews a warm shore room",
            "outcome": "You help turn the roofed table into a room for cold arrivals and family suppers. People return at odd hours, finding warmth without an invitation from the sea.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Keep the quay market open to working boats",
            "outcome": "You build the harbor's ordinary trade around safe landings and useful stock. The merchant profits beside the fishers, and fewer crews have to gamble on dubious salvage.",
            "days": 7,
            "cost": 26,
            "reward": 58,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Reserve the cave landing for hidden cargo",
            "outcome": "You and the rival keep the cave profitable and difficult to question. Smugglers know where to find you; families who fear the cups learn to look away.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "smuggling"
          },
          {
            "id": "ritual",
            "label": "Make the table a farewell place beside the shore",
            "outcome": "You set an empty cup for those who never came home and keep the farewell verse unhurried. The living bring their own memories; no answer is demanded from the water.",
            "days": 6,
            "cost": 14,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 4
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Let the harbor make its own use of the table",
            "outcome": "You leave the final use of the quay to its families and crews. The earlier voyage remains remembered, but you claim no new market, refuge, or hidden landing.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  },
  {
    "id": "highstone_two_hearts",
    "regionId": "highstone",
    "title": "The Furnace With Two Hearts",
    "summary": "A failing mountain furnace offers warmth and weapons at an unfamiliar cost. Smiths, mine workers, a war patron, and a stubborn forge priest must choose what their great fire should serve.",
    "chapters": [
      {
        "title": "The Hammer Beneath the Floor",
        "body": "At {place}, the mountain furnace has been cold long enough for frost to bloom inside its mouth. Tonight a hammer sounds beneath the floor. Each blow knocks ice from the iron doors; no worker has gone down to the old chamber.\n\n{speaker} leans an ear against the stone and winces. \"Whoever is down there has dreadful rhythm.\" They have kept the workshop alive by repairing pots while promising themselves they would never become a pot mender. The pots, being useful, have ignored the insult.\n\n{merchant} brings news that the winter convoy is late. {rival} brings a war patron's offer: relight the furnace, make blades first, and the mountain will be paid. {keeper}, devoted to {faith}, lifts an unfinished hinge from the cold ashes. The hammer below answers its clink. A little heat reaches your boots. It could keep households through winter, if anyone can discover why an abandoned chamber still appears to want the work finished.",
        "branchBodies": {
          "aid": "The households you warmed have brought broken hinges and kettles to the workshop. Their ordinary needs are piling up faster than the war patron's promised payment.",
          "trade": "Your convoy backers have gathered sound ore and charcoal. They expect a return before winter closes the pass, and the rival is promising them a quicker profit from blades.",
          "scheme": "The war patron thinks you can obtain the furnace without a public argument. Their agents have started measuring its doors as if the mountain has already changed hands.",
          "fight": "The patron's guard remembers your resistance. The workers appreciate it, but fear that another fight will close the pass before a single load of grain reaches them."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Heat a small workshop for the waiting households",
            "outcome": "You share the first warmth with workers repairing useful things. A hinge is finished, a kettle stops leaking, and the great furnace begins to feel possible again.",
            "days": 4,
            "cost": 12,
            "reward": 0,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "trade",
            "label": "Bring charcoal over the pass with the convoy",
            "outcome": "You guide fuel to the cold furnace and keep the carriers supplied. The merchant pays for the delivery; enough charcoal remains to test an ordinary firing.",
            "days": 5,
            "cost": 20,
            "reward": 40,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Promise the patron first claim on the furnace",
            "outcome": "You give the war patron a private promise of priority and take their advance. Their guard begins watching the workshop door, interested in who else expects its warmth.",
            "days": 3,
            "cost": 0,
            "reward": 34,
            "skill": {
              "id": "persuasion",
              "min": 2
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Find the chamber answering the unfinished hinge",
            "outcome": "You uncover a second firebox beneath the floor and a hammer poised above it. The mechanism wakes at the touch of unfinished iron, leaving its original purpose uncertain.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 3
            },
            "effect": "workshop"
          },
          {
            "id": "leave",
            "label": "Leave the mountain furnace cold for now",
            "outcome": "You step away from the hammering and the patron's offer. The household repairs remain unfinished, and no convoy or firing is completed merely because you departed.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The First Blade Bends",
        "body": "The relit furnace makes beautiful iron. It also makes a noise like someone crying behind a wall. {speaker} turns the first blade in a gloved hand, then bends it across their knee. It folds like soft lead.\n\nThe patron's guard looks outraged. \"Excellent,\" says the smith. \"We have discovered a sword that apologizes.\" Their laughter ends when a gate hinge from the same firing holds against three workers pulling together.\n\n{keeper} thinks the buried hammer may have been built to mend a hall rather than arm its lord. {rival} says a machine can be persuaded, and tells you the patron has hungry soldiers as well as ambitious plans. {merchant} wants to make plow shares before anyone closes the workshop out of spite. In a corner, {friend} cups the warm iron around a frozen finger and says nothing. You can hear the second firebox changing its pace whenever somebody describes what the next piece is for.",
        "branchBodies": {
          "aid": "The repaired household tools have made the smith popular. The guard resents the crowd, especially when a waiting grandmother asks whether a war blade can mend her stove.",
          "trade": "Your charcoal convoy has left the furnace well supplied. The merchant offers profitable plow shares, while the patron argues that the soldiers guarding the pass should come first.",
          "scheme": "Your private promise of priority has reached the workshop workers. They want to know whether they have spent the cold months repairing a thing they will never be allowed to use.",
          "fight": "The guard you confronted keeps pressing the workers to prove their loyalty. The bending blade gives the smith a dangerous opportunity to ridicule them in front of the whole workshop."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Put the first sound iron into household repairs",
            "outcome": "You help finish hinges and stove parts before the patron's blades. Warm doors begin closing properly, and the workers can see whom their difficult firing has helped.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "trade",
            "label": "Sell useful tools to support the next firing",
            "outcome": "You make the furnace pay its way through plow shares and dependable tools. The merchant finds willing buyers; the war patron is furious that practical trade has become a rival.",
            "days": 5,
            "cost": 18,
            "reward": 46,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Hide the bending blades and sell the patron confidence",
            "outcome": "You conceal the failed blade and take another advance against the furnace. The patron thinks your silence means progress; the smith knows whose hands will suffer when the truth arrives.",
            "days": 3,
            "cost": 0,
            "reward": 42,
            "skill": {
              "id": "stealth",
              "min": 3
            },
            "effect": "blackmail"
          },
          {
            "id": "ritual",
            "label": "Finish the cooling iron with the forge priest",
            "outcome": "You and the keeper pass a heated blank between working hands. The old hammer steadies as an ordinary hinge is finished; the priest calls that patience, not a command to the mountain.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 3
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Refuse to choose the next firing's purpose",
            "outcome": "You make no promise about tools, blades, or the buried hammer. The smith and the patron continue their argument, and your silence earns no completed work.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "Bread at the Mine Mouth",
        "body": "The mountain answers the next firing with a tremor. Miners retreat from the upper shaft, leaving their lamps laid in a row beside untouched bread. The bread is still warm when you reach them; the lamps have gone black.\n\n{speaker} recognizes the tremor from an old story about two brothers building the furnace. One made its visible heart. The other took the hammer below and never returned. The story has a different ending in every workshop. None explains why a living miner heard their own name called from the buried firebox.\n\n{friend} offers you a piece of the abandoned bread. \"We might as well disappoint whatever wanted us hungry.\" {keeper} is preparing a watch at the mine mouth. The patron wants the frightened workers back underground before its guards must collect the ore themselves. {merchant} has a safer seam that could be reached through a neglected winter path, if somebody will spend the time making it usable.",
        "branchBodies": {
          "aid": "The households whose tools you repaired send food to the mine mouth. Their warmth has bought time, and they ask you to use it before somebody orders the miners below.",
          "trade": "Your profitable tool trade can finance another ore route. The merchant prefers a slower sound supply; the patron sees every day's delay as a challenge to its authority.",
          "scheme": "The hidden failed blades have been discovered by a guard. The patron wants someone blamed, and the smith has begun hiding apprentices from an angry search.",
          "fight": "The workers you defended trust you to face the guards again. A miner asks you to find another route instead: they are tired of winning fights that never bring supper."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Feed the waiting miners and brace the safer shaft",
            "outcome": "You work beside miners who know the rock better than the patron. The tremor still frightens them, but sound supports and a hot meal make their choices less desperate.",
            "days": 6,
            "cost": 22,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Reopen the winter ore path for a slower supply",
            "outcome": "You lead a paid repair crew along the neglected path. Ore reaches the furnace without forcing the frightened miners below, and the merchant shares the first worthwhile return.",
            "days": 6,
            "cost": 28,
            "reward": 48,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Make the patron's failed blades somebody else's secret",
            "outcome": "You hide the smith's apprentices and tell the patron enough to keep its anger useful. The patron pays for silence, while the people beneath that bargain become more dependent on you.",
            "days": 3,
            "cost": 0,
            "reward": 40,
            "skill": {
              "id": "persuasion",
              "min": 4
            },
            "effect": "blackmail"
          },
          {
            "id": "fight",
            "label": "Keep the guards from forcing workers into the shaft",
            "outcome": "You hold the mine entrance against the patron's armed demand. The miners remain above ground, knowing you have bought a dangerous interval rather than ended the quarrel.",
            "days": 4,
            "cost": 10,
            "reward": 0,
            "skill": {
              "id": "weapons",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Leave the mining dispute to the mountain workers",
            "outcome": "You turn from the mine mouth without claiming to have made it safe. The workers keep their fear and knowledge, and the patron must find another answer.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "Both Hearts Waking",
        "body": "Snow seals the highest path. At {place}, the two furnace mouths begin burning at once. The upper fire warms workshops; the buried fire turns the walls hot enough to blister skin. With every hammer blow below, a fresh blade takes shape in the ash.\n\nThe blades do not bend now. They carry the names of living workers along their edges. {speaker} drops one as if it has bitten them. The patron's guard immediately wants the rest.\n\n{keeper} believes the lower mechanism is copying promises overheard in the workshop. The smith thinks it is copying people. Neither will claim certainty, and the distinction offers little comfort to the worker whose name is cooling in iron. {friend} is moving blankets to the upper hall. {merchant} says the furnace can still be kept useful by closing the lower air channel; {rival} says doing so might destroy the finest weapons this mountain has ever made. You must decide what a successful fire is allowed to cost.",
        "branchBodies": {
          "aid": "The safer mine and repaired households give the workers somewhere to retreat. They will help close the lower air channel if you keep the patron from seizing the named blades.",
          "trade": "Your alternate ore route can support the upper fire alone. The merchant offers a sound future for the workshop, at the price of abandoning its spectacular military profit.",
          "scheme": "The patron knows what you concealed and expects you to protect its investment. Keeping the named blades means giving that leverage a permanent shape in the mountain.",
          "fight": "The guards remember your stand at the mine entrance. Their captain offers a private truce if the patron receives the blades, putting your earlier protection directly in doubt."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Carry workers to the upper hall and close the lower draft",
            "outcome": "You help move the living out of the burning galleries, then close the buried draft. The workshop keeps its smaller useful fire, and the names on the blades stop multiplying.",
            "days": 7,
            "cost": 26,
            "reward": 0,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "trade",
            "label": "Keep the upper furnace on the alternate ore supply",
            "outcome": "You separate useful production from the dangerous lower chamber. The merchant accepts fewer miraculous wares in return for a trade the mountain can keep through another winter.",
            "days": 6,
            "cost": 30,
            "reward": 52,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Deliver the named blades to the war patron",
            "outcome": "You place the strange weapons under the patron's guard and receive your share. Workers recognize their names on other people's swords, and the patron gains a new hold over them.",
            "days": 5,
            "cost": 0,
            "reward": 58,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Unmake a named blade in the Patient Flame's watch",
            "outcome": "You bring one blade to the keeper and return it to unfinished iron. The buried hammer falters; the workers join the cooling watch without promising what the forge must become.",
            "days": 6,
            "cost": 18,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 4
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Leave the furnace's final choice to its makers",
            "outcome": "You step back from both furnace mouths and take no miraculous blade. The smith, the keeper, and the patron must face a choice your departure does not resolve.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Hinge for Every Door",
        "body": "The mountain spring comes late. When it arrives, thaw water trickles past a heap of discarded swords outside the workshop. Some are plain failures. Some still bear names. Nobody here agrees whether melting them is mercy or merely thrift.\n\n{speaker} has made a particularly ugly kettle and placed it on the finest shelf. \"My masterpiece,\" they say. It boils without leaking. {friend} applauds with such solemn dignity that the smith threatens to throw a spoon.\n\n{keeper} wants learners to see both the work and the mistakes. {merchant} has buyers waiting beyond the pass. {rival} says the war patron still remembers a furnace that could have made it powerful. That memory will outlast this pleasant morning.\n\nYour earlier choice has changed which people approach the workshop door with hope and which arrive with a guard. {lastOutcome} The great fire can become a patient trade, a school of difficult craft, or a possession that needs ever more weapons to remain secure. The smith would quite like somebody to choose before the kettle boils dry.",
        "branchBodies": {
          "aid": "The workers you brought into the upper hall now mend its doors. They propose teaching apprentices there, where warmth will be used before it is admired.",
          "trade": "Your ordinary furnace trade has paid for sound tools and a reliable route. The merchant wants a permanent market, while the smith insists that learners still need room at the fire.",
          "scheme": "The patron displays named blades at the pass and asks you to supervise the furnace. Workers seek permission to use the fire they once helped keep alive.",
          "fight": "The miners remember the guards you kept from their entrance. They offer to help protect an independent workshop, knowing that the patron has not forgotten its lost weapons."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Give the upper hall to patient working apprentices",
            "outcome": "You fit benches around the useful fire and help learners start with repairs. The ugly kettle becomes their first lesson: a thing may be worth making because somebody can use it.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "school"
          },
          {
            "id": "trade",
            "label": "Build a lasting market for dependable mountain tools",
            "outcome": "You send sound tools down the reopened pass and bring useful supplies home. The merchant rewards steady production, and the furnace earns a future larger than one military commission.",
            "days": 7,
            "cost": 24,
            "reward": 58,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Hold the furnace through the patron's armed support",
            "outcome": "You accept the patron's protection and keep the workshop beneath its banners. The profits are real; so is the fear among workers who know their names can become weapons.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Teach what the two fireboxes did to the iron",
            "outcome": "You help the smith explain the machinery without promising that every mystery is solved. Apprentices learn which channel to close, which failed blade to keep, and when to stop a firing.",
            "days": 6,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 5
            },
            "effect": "workshop"
          },
          {
            "id": "leave",
            "label": "Leave the mountain's new craft to its working hands",
            "outcome": "You leave the benches, markets, and patronage to those who must live beside the furnace. Your earlier decisions remain visible, but this departure earns no further commission.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  },
  {
    "id": "blackgrove_walking_orchard",
    "regionId": "blackgrove",
    "title": "The Orchard That Walked",
    "summary": "An orchard moves toward hungry households and away from its owners. A grove keeper, timber buyers, refugees, and something waiting among the trees want very different harvests.",
    "chapters": [
      {
        "title": "Fruit on the Wrong Side of the Fence",
        "body": "An apple tree stands in the lane outside {place}. Yesterday it stood beyond the fence, and the fence now leans against the shed as if someone politely moved it aside. There are muddy hollows where roots have stepped.\n\n{speaker} tells you the tree belongs to their orchard. \"I planted it. I weeded it. I shouted at it for sixteen years.\" They examine the fruit. \"Possibly it remembers that last part.\"\n\n{friend} has found another tree beside the household that ran out of grain last week. Its branches bend toward the kitchen window. {keeper}, who tends the root shrine of {faith}, will not call the movement a blessing merely because it feeds somebody. Something in the deeper wood has been following the orchard at night.\n\n{merchant} wants to buy the ripe fruit before the trees move again. {rival} has arrived with timber workers and a suggestion that roots cannot walk if the trunks are cut down. The fruit smells wonderfully sweet. The tracks beneath it smell of turned graves.",
        "branchBodies": {
          "aid": "The hungry household you helped has left clean water at the roots. The nearest tree has stayed, and the orchard owner wonders whether it now belongs to whoever feeds it.",
          "trade": "Your fruit buyers want another reliable collection. The trees keep moving toward households without grain, making the trade promising and infuriating in equal measure.",
          "scheme": "Your private promise to the timber buyer has brought axes into the lane. The hungry neighbors now watch you more carefully than they watch the moving roots.",
          "fight": "The workers you confronted are waiting beyond the fence. The orchard owner appreciates their absence, but worries that the approaching thing in the wood will be less easily driven away."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Carry the fruit to households with empty cupboards",
            "outcome": "You gather what the low branches offer and share it before it spoils. The orchard owner grumbles over ownership while quietly adding a basket for the oldest neighbor.",
            "days": 3,
            "cost": 6,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Arrange a fair harvest before the trees move again",
            "outcome": "You buy the day's fruit and put pickers to useful work. The merchant earns a worthwhile return, while the orchard owner keeps enough apples for winter drying.",
            "days": 4,
            "cost": 16,
            "reward": 34,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Offer the timber buyer a hidden way to the orchard",
            "outcome": "You show the timber workers a path beyond the watched fence. They pay for the chance to cut quietly, and hungry households begin hiding their smallest baskets.",
            "days": 2,
            "cost": 0,
            "reward": 30,
            "skill": {
              "id": "stealth",
              "min": 2
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Follow the root tracks back toward the deeper wood",
            "outcome": "You trace the moving trees to a swallowed hamlet and find fresh growth around its old hearths. The tracks turn toward inhabited doors; the thing following them has left none.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 3
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the moving trees to the orchard owner",
            "outcome": "You leave the fallen fence and the strange fruit alone. The owner must choose between feeding people and defending the orchard without claiming your help or your harvest.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Guest With Moss in Its Teeth",
        "body": "A bear-shaped shadow sits beyond the orchard at dusk. Its paws are roots, and moss hangs between its teeth. It has not attacked anyone. It has been watching the kitchen windows.\n\n{speaker} insists that every animal deserves a useful name. They suggest Stump. {friend} suggests something less likely to annoy an enormous creature. When the shadow lifts its head, both stop suggesting names.\n\n{keeper} finds a broken honey bowl in the swallowed hamlet. Households once left food there before gathering from the wood. That custom does not prove what the creature wants now, especially after so many empty winters. {merchant} offers grain for an escort through the forest. {rival} offers an armed hunt that would leave the timber road free.\n\nA tree has moved into the shadow's path, placing its trunk between the creature and a lit window. Its fruit falls before it is ripe. The orchard may be fleeing something hungry, or trying to bring it back to a table.",
        "branchBodies": {
          "aid": "Your shared harvest has filled the village kitchens with dried fruit. The shadow watches those warm windows, and the households ask whether there is room for one more hungry guest.",
          "trade": "Your paid pickers work within sight of the creature. The merchant wants a guarded harvest; the workers want to know whether its silence can be trusted.",
          "scheme": "The timber workers on your hidden path have broken the old honey bowl. Their buyer urges you to call the creature a menace before anyone asks what brought it here.",
          "fight": "The grove keeper asks the people you defended to put their weapons down for one evening. Some will try; others have children sleeping behind the windows the creature watches."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Put food beyond the houses and keep a quiet watch",
            "outcome": "You carry a meal away from the sleeping rooms and let the grove keeper watch with you. The great shadow eats slowly, leaving the windows undisturbed for another night.",
            "days": 4,
            "cost": 12,
            "reward": 0,
            "skill": null,
            "effect": "ward"
          },
          {
            "id": "trade",
            "label": "Bring grain through a carefully guarded forest route",
            "outcome": "You escort grain without chasing the watching creature. The merchant pays, and the households gain food that does not depend on the moving orchard's unpredictable kindness.",
            "days": 5,
            "cost": 20,
            "reward": 42,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Sell the timber buyer a reason to clear the grove",
            "outcome": "You turn the shadow's silence into a warning that suits the timber buyer. The buyer rewards you, and the frightened households begin accepting axes they had refused before.",
            "days": 3,
            "cost": 0,
            "reward": 38,
            "skill": {
              "id": "persuasion",
              "min": 3
            },
            "effect": "blackmail"
          },
          {
            "id": "ritual",
            "label": "Restore the honey bowl at the old root shrine",
            "outcome": "You leave clean water and food where the old households once gathered. The keeper joins you without promising obedience from the beast; its watching moves farther from the houses.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 3
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Keep your distance from the orchard's watching guest",
            "outcome": "You do not feed, hunt, or hire an escort against the shadow. The household windows remain lit, and the people behind them choose their own precautions.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Price of Winter Grain",
        "body": "The orchard bears twice in one season. The second fruit is pale and bitter, yet hungry people keep eating it. Some dream of a table laid inside a tree. Others dream only of supper, which {speaker} considers the more sensible omen.\n\nWinter grain arrives with {rival}'s wagons. The buyer demands a timber strip through the oldest wood in return. The strip would reach the swallowed hamlet and the restored honey bowl. {merchant} can offer smaller supplies, paid through work rather than forest rights, but cannot feed everybody alone.\n\n{friend} says the households are tired of becoming examples in somebody else's quarrel about nature. They want food, fuel, and a season without wondering whether the next tree is walking toward them or away.\n\n{keeper} brings you a root torn from the moving orchard. It has grown around a little wooden spoon. Something remembered an ordinary meal strongly enough to carry its shape into the living wood.",
        "branchBodies": {
          "aid": "Your food offering has kept the great shadow outside the homes. It now follows the grain wagons, and the timber buyer points to it as proof that generosity merely encourages hunger.",
          "trade": "Your grain route makes the smaller trade possible. The merchant offers actual work to keep it supplied, while the rival promises effortless abundance in return for the older trees.",
          "scheme": "Your warning helped the timber buyer gain entry. The households now expect protection from a danger you described, and the buyer expects you to defend its growing claim.",
          "fight": "The households you protected from armed workers fear a new confrontation. They ask you to bring grain first, then argue about the forest with people who have eaten."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Organize winter food and fuel before the forest quarrel",
            "outcome": "You help the households store fruit, gather fallen wood, and share the smallest grain supply. The winter plan is imperfect, but it belongs to people who will live through it.",
            "days": 6,
            "cost": 22,
            "reward": 0,
            "skill": null,
            "effect": "war_relief"
          },
          {
            "id": "trade",
            "label": "Make household work support the smaller grain route",
            "outcome": "You arrange useful work for the merchant's steady deliveries. The households earn their provisions without selling the whole grove; the trade remains modest enough to need continuing effort.",
            "days": 6,
            "cost": 24,
            "reward": 46,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Take the timber buyer's share of the winter bargain",
            "outcome": "You help the rival secure the oldest timber strip and accept your profit. Grain fills the kitchens, while the grove keeper walks past newly marked trunks without greeting you.",
            "days": 4,
            "cost": 0,
            "reward": 48,
            "skill": {
              "id": "persuasion",
              "min": 4
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Learn why the roots carry household objects",
            "outcome": "You examine the swallowed hearths and find bowls, toys, and spoons tangled in new growth. The orchard has carried fragments of a lost village toward the nearest living meals.",
            "days": 5,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 4
            },
            "effect": "school"
          },
          {
            "id": "leave",
            "label": "Refuse both winter bargains and return to your own life",
            "outcome": "You refuse a share in either bargain and claim no winter provision. The hungry households still must choose between steady work, scarce stores, and the timber buyer's offer.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Table Inside the Tree",
        "body": "The oldest orchard tree splits without falling. Inside its hollow trunk is a long table of roots. A broken cup stands at every place. One place has a fresh apple and a little wooden spoon.\n\nThe bear-shaped creature waits beyond the hollow, smaller now, its moss wet with frost. The timber workers call it weakened. {speaker} notices the shaking in its paws and calls it cold. {keeper} cannot explain whether the roots remember a family, a feast, or the thing that happened after one.\n\n{rival} arrives with axes. {merchant} has brought grain but wants the road kept clear. {friend} places a steaming bowl beside the wooden spoon, then looks surprised at their own hand. \"I do not know who that is for,\" they say.\n\nThe tree's roots begin drawing the forest path inward. If it closes, the winter wagons will not reach {place}. Keeping a way open may require an offering, practical labor, or the violence the timber buyer has wanted since the first tree walked.",
        "branchBodies": {
          "aid": "The food you helped store means the households can afford one patient attempt at the hollow. They bring a warm meal, hoping neither the orchard nor its watcher needs another frightened winter.",
          "trade": "Your smaller grain route is caught between the moving roots. The merchant offers workers to clear it by hand rather than surrender the whole grove to the rival's axes.",
          "scheme": "The timber buyer's new strip runs directly through the hollow. Its workers believe your bargain authorizes the cut; the grove keeper names you when asking who will stop them.",
          "fight": "The armed timber workers wait for you to show your strength again. The creature no longer looks like a triumphant opponent, making a hunt feel uncomfortably like finishing something already cold."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Make a warm meal beside the hollow table",
            "outcome": "You help the households bring ordinary warmth into the hollow. The great shadow settles beyond the bowls; the roots loosen enough for people to carry food back home.",
            "days": 6,
            "cost": 24,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Clear a narrow wagon passage without taking the hollow",
            "outcome": "You work beside carriers to open the road through moving roots. The grain keeps coming, and the merchant learns that profit here will always depend on leaving something unclaimed.",
            "days": 6,
            "cost": 28,
            "reward": 50,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Help the rival control the hollow and its winter path",
            "outcome": "You give the timber buyer the passage it wanted and accept a rich share. The orchard stops beside guarded stumps, and households approach the road through the rival's favor.",
            "days": 5,
            "cost": 0,
            "reward": 56,
            "skill": {
              "id": "stealth",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "fight",
            "label": "Keep the axe crew away while the households cross",
            "outcome": "You hold the workers outside the hollow until the food carriers pass. The rival remembers your resistance; the creature remains beyond the table, watching its meal cool.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "defense",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Withdraw before the hollow closes around the road",
            "outcome": "You step back from the hollow, carrying neither a cup nor a timber promise. The wagon crews and hungry households must make their own passage through the roots.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The First Sweet Fruit",
        "body": "Spring reaches {place} in little green tongues along the orchard branches. The first fruit is sweet again. The trees have not moved for weeks, though {speaker} still marks their trunks each evening and counts twice when they are tired.\n\nThe wooden spoon from the hollow sits beside a new household bowl. {friend} uses it to stir stew and gets scolded for scratching the glaze. They apologize with such exaggerated sorrow that even the grove keeper smiles.\n\n{merchant} proposes a market where grain and forest fruit can support each other. {rival} still wants a guarded timber road. {keeper} imagines a small learning garden where children can discover useful plants without being taught that hunger is shameful or that every old tree is kindly.\n\nYour earlier choice has already changed the path through the wood. {lastOutcome} The bear-shaped watcher has not been seen since the thaw. Its empty place is comforting to some people and strangely lonely to others. The next harvest will come into the life you help build now.",
        "branchBodies": {
          "aid": "The winter meal at the hollow has become a local custom. Households want a garden near the refuge, where food and useful plants can be shared before another hard season.",
          "trade": "Your open grain passage makes a mixed market possible. The merchant offers a modest future for both growers and carriers, without demanding that the trees prove their loyalty.",
          "scheme": "The rival's guarded road controls the easiest winter approach. Its profitable claim remains visible among the stumps; households are quietly looking for a route that does not belong to it.",
          "fight": "The households remember who stood between their meal and the axes. They offer to keep watch together, while the rival waits for the day their patience with you wears thin."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Plant a remedy garden beside the shared hearth",
            "outcome": "You help turn the spared ground into a garden for useful plants and household care. The first patient brings an unwanted basket of bitter apples; nobody turns them away.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "clinic"
          },
          {
            "id": "trade",
            "label": "Keep a fair market between the orchard and grain road",
            "outcome": "You help growers and carriers establish a trade that survives ordinary bad seasons. The merchant earns steadily, and the orchard owner finally finds something useful to do with excess fruit.",
            "days": 7,
            "cost": 24,
            "reward": 58,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Keep the forest's best road beneath your chosen guard",
            "outcome": "You take your place beside the rival's controlled timber route. Its revenue grows, while people who once shared their meals with you begin making their winter plans elsewhere.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Keep the hollow meal as a living grove custom",
            "outcome": "You tend the bowl and the roots with those who choose to come. The custom offers food without claiming the wood must answer; its quiet strangeness becomes part of local life.",
            "days": 6,
            "cost": 14,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 4
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Leave the next harvest to its growers and households",
            "outcome": "You leave the orchard's daily future with the people who tend it. The path keeps your earlier decisions, but no new garden, trade, or guarded claim becomes yours.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  },
  {
    "id": "ashplain_rain_in_glass",
    "regionId": "ashplain",
    "title": "The Rain Inside the Glass",
    "summary": "A glassworker finds rain reflected in a country of dry wells. Caravans and a would-be ruler pursue the promise of water while households decide whether hope has become another way to own them.",
    "chapters": [
      {
        "title": "A Window for a Dry Country",
        "body": "The glassworker at {place} has made a pane that shows rain. Through the open workshop door, wind lifts pale ash from the red stones. Through the pane, green grass bends beneath a summer shower.\n\n{speaker} has been staring at it long enough to forget the glass tongs in one hand. \"If it is a trick,\" they say, \"it is the kindest trick I have learned.\" Their ordinary work makes dark bottles for travelers, not windows into impossible weather.\n\n{friend} sets an empty cup against the pane. No water appears inside it. {keeper}, tending the coal of {faith}, says a remembered warmth and a useful warmth need not be the same thing. {merchant} thinks caravans will pay to see green country again. {rival} thinks whoever can promise rain could win every dry household in the borderlands. Beneath the pane, the workshop floor is wet. Only the stone touching the glass has changed.",
        "branchBodies": {
          "aid": "The households you brought water to have heard about the wet workshop stone. They ask practical questions before admiring the green reflection, which the glassworker finds both rude and reassuring.",
          "trade": "Your caravan buyers are arriving to see the pane. Their coin can supply ordinary water, but some have begun expecting the glass itself to make the dry country green.",
          "scheme": "The rival has repeated your private promise of rain to its followers. Their enthusiasm is useful now, and dangerous if the empty cups stay empty.",
          "fight": "The rival's guards remember you opposing their claim on the workshop. The glassworker likes their distance, but worries that defending a window will turn it into a fortress."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Bring ordinary water to the workshop and nearby hearths",
            "outcome": "You haul real water before anyone sells the reflected rain. The glassworker shares the shade of the workshop with tired neighbors, glad that one useful thing has happened.",
            "days": 4,
            "cost": 12,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Let caravan trade finance a careful trial of the pane",
            "outcome": "You arrange paid demonstrations without promising a miracle. The merchant brings ordinary supplies, and the glassworker has time to learn which stone the reflected rain can reach.",
            "days": 4,
            "cost": 16,
            "reward": 34,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "scheme",
            "label": "Sell the rival the promise of rain before its proof",
            "outcome": "You give the rival an exclusive promise it can carry to dry households. The payment is immediate; the disappointed cups and difficult questions will arrive later.",
            "days": 2,
            "cost": 0,
            "reward": 32,
            "skill": {
              "id": "persuasion",
              "min": 2
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Trace where the pane's wet stone was quarried",
            "outcome": "You find the stone came from a ruined well house beneath the ash. Its old channel still descends below the workshop, offering a practical place to look for water.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 3
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the glassworker with the impossible window",
            "outcome": "You leave the workshop without selling rain or carrying water. The glassworker keeps the wet stone and unanswered questions; the dry households receive nothing from your departure.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Well With No Sky",
        "body": "The old well house lies half buried beyond {place}. Its shaft is dry, but a piece of the strange glass shows water at the bottom. When {speaker} lowers a lamp, the reflection shows a lamp rising to meet it.\n\n{friend} drops a pebble and waits for two sounds. Only one comes. \"At least it is not doubling every foolish thing we do,\" they say, then refuse to lean over the shaft again.\n\n{keeper} has brought a coal to warm the searchers after sunset. They ask the glassworker whether the pane is remembering a lost wet season or drawing on something still below. {merchant} offers ropes and a pumping crew. {rival} wants guards placed around the well before a discovery can be shared.\n\nNear the shaft, a buried clay pipe carries a trickle of ordinary water. A careful repair might make it useful. The reflection below is deeper, brighter, and dangerously more inviting than the hard work beside your feet.",
        "branchBodies": {
          "aid": "The neighbors you supplied have brought cups and spare hands. They hope for a public trickle before a spectacular promise, and are willing to help mend the clay pipe.",
          "trade": "Your workshop trial has paid for rope and careful measurements. The merchant wants a functioning well, while wealthy visitors are already asking to look at the beautiful reflection.",
          "scheme": "Your promised rain has brought the rival's guards to the shaft. They need the discovery to belong to their patron, and the glassworker has begun hiding the smallest useful fragments.",
          "fight": "The guardhouse has become wary of another confrontation with you. That hesitation gives the workers room to reach the pipe before the well is fenced off."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Repair the small pipe before anyone descends",
            "outcome": "You mend the ordinary trickle and help neighbors fill their cups in turn. The reflected pool remains mysterious, but less of the village now has to depend on it.",
            "days": 5,
            "cost": 18,
            "reward": 0,
            "skill": null,
            "effect": "war_relief"
          },
          {
            "id": "trade",
            "label": "Hire a careful crew to reopen the well approach",
            "outcome": "You pay for sound ropes, cleared stone, and patient workers. The merchant earns from useful equipment rather than promised rain, and the old approach becomes usable again.",
            "days": 5,
            "cost": 24,
            "reward": 42,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Give the rival first control of the recovered water",
            "outcome": "You help the guard take the well entrance and accept a share of its future value. The first cups are filled by favor, while thirsty households wait outside the rope.",
            "days": 3,
            "cost": 0,
            "reward": 38,
            "skill": {
              "id": "stealth",
              "min": 3
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Keep an ember watch without calling to the reflection",
            "outcome": "You join the keeper's night watch and leave the reflected lamp unanswered. The searchers return to a real coal, and the well remains a question instead of a summons.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 3
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Refuse the descent and the well's new ownership",
            "outcome": "You leave the shaft without entering its reflection or taking a share of the water. The workers and nearby households must decide what the little pipe can offer.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Caravan of Dry Mouths",
        "body": "A caravan reaches {place} carrying empty barrels and people too tired to argue. Its camels have rubbed their necks raw against the harness. Some travelers have heard that rain is being sold here; others only followed the beacon after their own well failed.\n\n{merchant} counts provisions, then stops counting when a traveler asks whether the numbers include the dead left along the road. {speaker} puts the glass pane face down. The rain in its reflection sounds louder when nobody is looking.\n\n{rival} offers the arrivals water in exchange for their loyalty against a competing claimant. {friend} wants the strongest travelers to help repair shade roofs and the weakest allowed to rest. {keeper} has moved the shrine coal into a larger hearth so more hands can reach it.\n\nThe old pipe cannot serve the whole caravan without care. Through the pane, however, you can see a second well beneath a tower's shadow. The reflected tower has no door, and someone inside has begun knocking.",
        "branchBodies": {
          "aid": "The households helped by your repaired pipe remember being thirsty themselves. They offer cups to the arrivals, but fear losing the small reliable supply you gave them.",
          "trade": "Your reopened route brings the merchant regular provisions. There is work the arrivals can do, provided your new trade values their strength without claiming their whole future.",
          "scheme": "The guarded well lets the rival offer water as allegiance. Its agents repeat your earlier promise to the caravan, making your part in their dependence impossible to ignore.",
          "fight": "The rival sees you protecting tired arrivals as a challenge to its power. The travelers are grateful, yet worry that another armed quarrel will end with the water withheld."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Make shade and water for the exhausted arrivals",
            "outcome": "You help share the usable pipe and put roofs over resting people. The caravan stops moving long enough to become ordinary hungry guests rather than evidence for somebody's grand promise.",
            "days": 6,
            "cost": 24,
            "reward": 0,
            "skill": null,
            "effect": "war_relief"
          },
          {
            "id": "trade",
            "label": "Give willing arrivals work repairing the water route",
            "outcome": "You arrange paid repairs that strengthen the real supply. The merchant gains useful workers, and the travelers earn enough to choose whether to stay without joining the rival's banner.",
            "days": 6,
            "cost": 26,
            "reward": 48,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "scheme",
            "label": "Trade the caravan's support for a stake in the well",
            "outcome": "You help the rival turn thirst into a following and receive your portion of its new influence. The beacon draws more arrivals, none knowing what your promised water will require.",
            "days": 4,
            "cost": 0,
            "reward": 48,
            "skill": {
              "id": "persuasion",
              "min": 4
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Look for the real tower beneath the reflected one",
            "outcome": "You compare the ash-covered foundations with the pane's moving shadow. A buried water channel leads toward an actual ruined tower, giving the knocking a place that can be approached.",
            "days": 5,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 4
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the caravan's welcome to the local households",
            "outcome": "You leave the water and shelter argument without claiming to have settled it. The arrivals still need a place to rest, and the beacon keeps drawing tired travelers.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "Rain in the Closed Room",
        "body": "Inside the ruined tower, rain falls behind a wall of black glass. It never reaches the dusty floor. A shape beyond it knocks whenever somebody speaks of reopening the well.\n\n{speaker} holds a small pane beside the wall. The reflected rain brightens, and the glassworker's hand vanishes from its reflection. They pull back immediately. \"I would like to keep the hand. Sentimental attachment.\"\n\n{merchant} sees a stone channel beneath the wall that could carry water without anyone entering the bright room. {keeper} carries the ordinary shrine coal and says the hungry hearth outside matters more than a beautiful vision. {rival}'s guard sees a source worth controlling before the competing claimant hears of it.\n\n{friend} discovers a row of dried flowers pressed into the wall's mortar. Someone made this room to remember a green place, long before it became a promise to the living. The channel is real. So is the desire to step through and stand for one moment in rain.",
        "branchBodies": {
          "aid": "The rested arrivals can help carry tools to the tower. They ask you to bring back useful water, not another beautiful tale of something they will never be allowed to touch.",
          "trade": "Your paid repair crew has reached the old channel with sound tools. The merchant is ready to accept a modest reliable flow instead of charging visitors to admire unreachable rain.",
          "scheme": "The rival's followers believe you promised them the whole bright room. Sharing the channel would disappoint their patron, while stepping through might give it a more terrible prize.",
          "fight": "The guards you challenged are waiting near the channel mouth. You can protect the workers again, but every quarrel here risks breaking the glass above the only useful water."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Open the channel and keep people outside the glass",
            "outcome": "You help the workers free the water without entering the bright room. Real cups fill at the tower's base, while the reflected rain remains beyond hands that deserve to stay their own.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "clinic"
          },
          {
            "id": "trade",
            "label": "Fit the channel for a dependable caravan supply",
            "outcome": "You turn the difficult discovery into a modest working source. The merchant shares the return, and travelers can buy useful provisions without paying to gaze at somebody else's lost summer.",
            "days": 6,
            "cost": 30,
            "reward": 52,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Give the rival the channel and the tower gate",
            "outcome": "You place the water beneath the rival's guard and keep a profitable share. The bright room becomes its emblem, while real people below wait to be judged deserving of a drink.",
            "days": 5,
            "cost": 0,
            "reward": 56,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "fight",
            "label": "Hold the tower passage while workers free the channel",
            "outcome": "You keep the rival's guard from taking the tools and blocking the outlet. The workers finish beneath the glass, leaving a useful source and a patron who remembers your defiance.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "defense",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Leave the bright room and its channel untouched",
            "outcome": "You leave the tower with your hands unchanged and claim no water or victory. The glassworker and the thirsty households must decide what risks the channel deserves.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Garden That Is Really Green",
        "body": "Near {place}, the first little garden grows beside the recovered channel. Its leaves are dusty, uneven, and much less magnificent than the rain behind the glass. {speaker} visits every morning as though it were a wonder of the world.\n\n{friend} catches them comparing a crooked bean to its reflection. \"The bean is doing its best,\" they say. The glassworker admits that real things can be difficult to admire while a perfect summer waits in the workshop.\n\n{keeper} has returned the coal to the shrine of {faith}. {merchant} proposes a lasting caravan market around the useful water. {rival} still sees a claim that could support a ruler, whether through protection or dependence. The tower's closed room remains bright on cloudless evenings; nobody has made its desire ordinary.\n\nYour earlier choice has already changed how water reaches people. {lastOutcome} The next generation may inherit a small garden worth tending, a profitable road, or a gate where thirst has learned to bow. Today's green leaves cannot choose among those futures.",
        "branchBodies": {
          "aid": "The people who rested beneath your shade roofs now tend the garden. They want the well to remain a place where strangers can become neighbors without first kneeling to a patron.",
          "trade": "Your working caravan supply has brought food, tools, and growers. The merchant wants a permanent market and asks whether the garden can keep a little water when trade is busiest.",
          "scheme": "The rival's guarded tower can make your share valuable for years. The garden workers remember needing permission for their first buckets, and have not mistaken survival for affection.",
          "fight": "The channel workers remember your defense of the tower passage. They offer to help protect its water, knowing that a source guarded by neighbors differs from one claimed by a ruler."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Keep the garden and shade room open to arrivals",
            "outcome": "You help the garden support a small welcoming hearth beside the water. Its uneven beans feed people who know the difference between a promise of rain and a bowl of supper.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Build a caravan market around the useful well",
            "outcome": "You make the real supply the center of dependable trade. The merchant earns steadily, and caravans leave with full barrels instead of another beautiful rumor about rain.",
            "days": 7,
            "cost": 24,
            "reward": 58,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Keep a profitable claim beneath the rival's banner",
            "outcome": "You take a lasting place among the tower's owners and their guards. The water supports your influence, while thirsty arrivals learn that a green garden can have a very narrow gate.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Teach new glassworkers where the reflection ends",
            "outcome": "You help learners distinguish beautiful images from useful channels and dangerous openings. The imperfect garden becomes a lesson their hands can test, without losing wonder at the rain beyond it.",
            "days": 6,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "scholarship",
              "min": 5
            },
            "effect": "school"
          },
          {
            "id": "leave",
            "label": "Leave the garden and water to the people tending them",
            "outcome": "You leave the useful well's daily future with its workers and households. Your earlier choices remain in its gates and gardens, but no further share becomes yours.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  },
  {
    "id": "bellwater_submerged_house",
    "regionId": "bellwater",
    "title": "The House Beneath the Crossing",
    "summary": "A changing river reveals a drowned household and threatens the homes above it. Ferry families must choose what to remember, what to salvage, and where the living will sleep next.",
    "chapters": [
      {
        "title": "A Doorstep in Clear Water",
        "body": "The river beside {place} falls clear enough to reveal a doorstep below the ferry landing. Someone has placed fresh flowers on it. Their stems lean against the current, perfectly still.\n\n{speaker} has worked this crossing for years without seeing the step. They lower a boat hook and touch stone. \"A better foundation than mine,\" they mutter. Their own house leans whenever three people visit, and lately everybody has begun visiting to ask about the flowers.\n\n{friend} recognizes the pattern on a little clay cup beside the door. Their family makes the same pattern, though no living relative can explain how that cup reached the drowned foundations. {keeper}, an ancestor speaker of {faith}, will leave unanswered questions unanswered rather than promise a relative beneath the water.\n\n{merchant} wants to salvage the sound clay and stone before the river rises. {rival} wants the exposed ground claimed for a new landing. The ferry bell rings while nobody is pulling its rope.",
        "branchBodies": {
          "aid": "The families you helped have brought flowers to the new step. They are beginning to think of it as a place to gather, while the ferry keeper worries about the river rising.",
          "trade": "Your paid salvage crew has found useful clay and sound stone. The merchant wants another collection before the exposed landing becomes a quarrel about family history.",
          "scheme": "The rival expects your quiet support for its claim. Its workers are marking the shore, and local families have noticed whose boats can reach the submerged doorstep first.",
          "fight": "The landing workers you defended trust you with their worry. They hope the ringing bell is warning of rising water, and fear that fighting over it has distracted everyone."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Help households reach the flowers without disturbing the door",
            "outcome": "You steady small boats while families leave flowers above the submerged step. The visits bring company to people carrying old grief, without claiming that any dead person has returned.",
            "days": 3,
            "cost": 6,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Recover loose clay and stone for the working landing",
            "outcome": "You gather sound materials already separated from the old house. The merchant pays for useful salvage, and the household door remains undisturbed below the clear water.",
            "days": 4,
            "cost": 16,
            "reward": 34,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "scheme",
            "label": "Give the rival quiet first access to the exposed shore",
            "outcome": "You guide the rival's workers to ground the families have not yet discussed. They pay for your help, and begin treating the river's temporary retreat as a lasting possession.",
            "days": 2,
            "cost": 0,
            "reward": 32,
            "skill": {
              "id": "stealth",
              "min": 2
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Trace the old doorstep through the changing riverbank",
            "outcome": "You follow the foundations to an older river channel and a second landing. The drowned house was part of a living crossing once; its useful approach can be found without opening its door.",
            "days": 4,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 3
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the submerged doorway beside the ferry",
            "outcome": "You leave the flowers, cups, and exposed shore untouched. The ferry families must decide what the doorstep means, and no salvage or new landing is earned by your absence.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Bell With Water in Its Mouth",
        "body": "The ferry bell fills with water every evening. {speaker} empties it into the river and ties a cloth around its mouth. By dawn the cloth is soaked. They insist that bells should be obliged to contain noises, not weather.\n\n{keeper} listens to the water strike a bowl. Its rhythm resembles an old household song, but resembles is the word they keep. A familiar sound can wake memory without making memory a voice from the dead.\n\n{friend} sings an old household tune as they remember it. They get the second verse wrong and look embarrassed until the ferryman admits they always forget that part too. {merchant} offers to buy the troublesome bell as an unusual curiosity. {rival} would rather have it hanging over the new landing as proof that the crossing belongs there.\n\nBeneath the water, the house door stands open a finger's width. The current carries the smell of warm river clay from somewhere too deep to hold a working kiln.",
        "branchBodies": {
          "aid": "The households visiting your flower step now ask you to help keep the old song. They do not agree on its words, and the keeper sees no need to turn disagreement into a miracle.",
          "trade": "The loose salvage you recovered includes clay patterned like the little cup. The merchant wants to display it beside the bell, while local potters would rather make something useful from it.",
          "scheme": "The rival's shoreline claim would be stronger with the bell above it. Its agents are telling families that paying at the new landing is how they honor the old house.",
          "fight": "The families you defended ask you to keep the bell away from the rival. The ferryman fears another fight will break the last ordinary signal boats use in fog."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Keep the crossing bell working and listen with the families",
            "outcome": "You help dry the bell and hold evening company while its strange water drains. Boats keep their ordinary signal, and families can hear the old tune without agreeing on an explanation.",
            "days": 4,
            "cost": 10,
            "reward": 0,
            "skill": null,
            "effect": "ward"
          },
          {
            "id": "trade",
            "label": "Have local potters make useful wares from the loose clay",
            "outcome": "You bring salvaged clay to working hands and sell the finished bowls. The merchant receives a sound trade, and the old pattern reaches living tables instead of a locked curiosity chest.",
            "days": 5,
            "cost": 20,
            "reward": 42,
            "skill": null,
            "effect": "workshop"
          },
          {
            "id": "scheme",
            "label": "Help the rival make the bell its badge of ownership",
            "outcome": "You place the bell over the rival's landing and accept your share. Families who once heard a familiar song now hear the sound of a gate they must pay to pass.",
            "days": 3,
            "cost": 0,
            "reward": 38,
            "skill": {
              "id": "persuasion",
              "min": 3
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Set an empty cup beside the crossing without calling an answer",
            "outcome": "You join the keeper's remembrance and leave space for quiet. Some families sing, others listen, and the empty cup remains a place for absence rather than proof of a returned person.",
            "days": 4,
            "cost": 8,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 3
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Let the crossing families keep the bell as they choose",
            "outcome": "You refuse a share in the bell's sale or new ownership. The families keep its odd water and uncertain song, and the ferry must find another person to help.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "Supper on Unsteady Ground",
        "body": "The households of {place} hold a meal beside the ferry landing before the river rises. Every table has one leg packed with spare clay. {speaker} announces that nobody should dance unless they intend to eat their supper underwater.\n\n{friend} starts a song anyway. Its last verse makes the oldest potter laugh so hard that a bowl tilts into the stew. For a few minutes the crossing remembers how to be a place where people enjoy being alive.\n\nThen the bank settles with a low crack. The submerged doorstep slides nearer to the living houses. {merchant} has spare timber that could brace the landing. {rival} offers stronger piles, provided its guard controls the crossing afterward. {keeper} looks at the flowers drifting from the old step and asks who will help move the sleeping rooms uphill.\n\nThe drowned house is no longer merely an unsettling discovery. The river that buried it is beginning to choose another bank, and supper has become a hurried practical matter.",
        "branchBodies": {
          "aid": "The households whose visits you helped share are gathering blankets for one another. Their trust makes a quick move possible, even while people disagree about abandoning the familiar landing.",
          "trade": "Your living pottery trade has earned the timber merchant's interest. They offer a paid repair crew, wanting the crossing useful more than they want its old mysteries explained.",
          "scheme": "The rival's bell rings above its claimed landing as the bank cracks. Its guards want the safest piles reserved for paying boats, and your earlier share makes that choice visible.",
          "fight": "The ferry workers remember you defending their bell. They are ready to stand with you again, but ask for solid timber before any more proud words."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Move vulnerable households uphill before repairing the landing",
            "outcome": "You help people carry bedding and the smallest treasured things to dry rooms. The tables may have to wait, but nobody's whole future is left balanced on a sinking bank.",
            "days": 6,
            "cost": 22,
            "reward": 0,
            "skill": null,
            "effect": "war_relief"
          },
          {
            "id": "trade",
            "label": "Pay a crew to brace the useful crossing",
            "outcome": "You purchase sound timber and put experienced hands to work. The merchant shares the return from a landing boats can use, without making its safety depend on a new lord.",
            "days": 6,
            "cost": 26,
            "reward": 48,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Give the rival the safe piles and take a guarded share",
            "outcome": "You put the best timber beneath the rival's landing and accept its money. Its favored boats stay dry while other households carry their bedding farther along the shore.",
            "days": 4,
            "cost": 0,
            "reward": 48,
            "skill": {
              "id": "persuasion",
              "min": 4
            },
            "effect": "claim"
          },
          {
            "id": "investigate",
            "label": "Find the older river channel before driving new piles",
            "outcome": "You trace the movement of the drowned foundations and mark firmer ground upriver. The river's history becomes a usable warning, leaving both new and old doorways in their own time.",
            "days": 5,
            "cost": 0,
            "reward": 0,
            "skill": {
              "id": "survival",
              "min": 4
            },
            "effect": "route"
          },
          {
            "id": "leave",
            "label": "Leave the rising river to the ferrymen and households",
            "outcome": "You step away from the repair crews and the rival's offer. The living households still need dry beds, and the old doorstep cannot hold the bank in place for them.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "The Door Opens at Last",
        "body": "On the highest water, the old house door opens. What drifts out is ordinary: a stool, a clay pot, a blanket pale with age. No family walks after them. The river carries a life somebody once arranged, and the sight hurts more than a grand revenant could.\n\n{friend} catches the pot before it strikes the ferry. They set it down and sit beside it, unable to think of anything useful to say. {keeper} leaves them that quiet. {speaker} is busy holding a mooring rope with both feet against a post.\n\nThe current has reached the lower sleeping rooms. {merchant}'s boats can carry families uphill. {rival}'s guard wants the recovered goods and first claim on the new bank. Through the drowned doorway you can see the roots of a living tree growing into the old hearth. People can be saved tonight. The house itself cannot be made young by anybody's need to remember it.",
        "branchBodies": {
          "aid": "The households you moved uphill are already opening rooms for their neighbors. Their earlier welcome gives the boat crews somewhere real to take people before the lower roofs go under.",
          "trade": "Your braced crossing and paid crews can move people along the bank. The merchant offers boats first and argues about compensation later, having seen the old blanket float past.",
          "scheme": "The rival's safe piles protect only its preferred landing. Its guard asks you to help keep others back, while the people left on the lower bank call across the water.",
          "fight": "The guards remember your earlier defiance and want the recovered goods surrendered. The boat crews need you to keep the passage open long enough for the last households."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Bring the lower households to the waiting dry rooms",
            "outcome": "You help the boats carry people before salvaged possessions. The little pot reaches a new shelf beside its living keeper, and the old house disappears beneath water without taking another family.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "shelter"
          },
          {
            "id": "trade",
            "label": "Use merchant boats to move people and useful supplies",
            "outcome": "You keep the carriers working until the last sound cargo and sleeping household are above the flood. The merchant pays your share of a hard voyage nobody will call ordinary.",
            "days": 6,
            "cost": 30,
            "reward": 52,
            "skill": null,
            "effect": "route"
          },
          {
            "id": "scheme",
            "label": "Take the rival's share of the new landing and old salvage",
            "outcome": "You help the guard secure valuable salvage and the firmest bank. The rival pays handsomely, while displaced households learn that their safest return depends on your new owners.",
            "days": 5,
            "cost": 0,
            "reward": 56,
            "skill": {
              "id": "stealth",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "fight",
            "label": "Keep armed claimants away from the rescue boats",
            "outcome": "You hold the claimants back while families board. Their anger survives the flood, but the boat crews reach dry rooms without handing their passengers or recovered keepsakes to a guard.",
            "days": 5,
            "cost": 12,
            "reward": 0,
            "skill": {
              "id": "defense",
              "min": 4
            },
            "effect": "ward"
          },
          {
            "id": "leave",
            "label": "Leave the rescue and salvage to the boats already working",
            "outcome": "You leave the rope with the boat crews and claim no rescue, possession, or new shore. The flood keeps moving, and the households must rely on the people who remain.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      },
      {
        "title": "A Place for the Living",
        "body": "The river settles into its changed course. At {place}, new steps descend from the dry bank to a working boat. From their top you can still see the old ferry post, standing in water deep enough for a whole house to sleep beneath it.\n\n{speaker} has brought the stubborn bell to the new landing. It rings properly until rain, when it dribbles once and embarrasses them. {friend} puts a flower beneath it anyway. The recovered clay pot stands nearby, full of seedlings instead of river silt.\n\n{keeper} proposes a room where children can learn the crossing's songs alongside practical reading and care. {merchant} wants a market that will keep the new landing supplied. {rival} wants guards, tolls, and a lasting claim on the firm bank.\n\nYour earlier choice has already shaped who arrives here comfortably and who waits offshore. {lastOutcome} The drowned household belongs to the past. The children learning these steps will grow up with whatever you help place above it.",
        "branchBodies": {
          "aid": "The rescued households want a school and remedy room beside the landing. They remember having dry places made for them, and hope their children will learn that welcome as ordinary work.",
          "trade": "Your merchant boats have kept the changed crossing useful. Growers and potters offer stock for a new market, asking only that the landing remain reachable when they are poor.",
          "scheme": "The rival's new shore claim brings income and armed protection. The displaced families remember which boats were favored, and gather at a lesser landing beyond its guards.",
          "fight": "The boat crews remember who kept the claimants away. They offer a shared watch for the landing, hoping its bell will summon help rather than another collection."
        },
        "choices": [
          {
            "id": "aid",
            "label": "Build a small school and care room on the dry bank",
            "outcome": "You help children learn beside a room for tired travelers and household care. The old pot grows its first useful herbs, and the crossing gains a future that can be visited.",
            "days": 7,
            "cost": 28,
            "reward": 0,
            "skill": null,
            "effect": "school"
          },
          {
            "id": "trade",
            "label": "Build a useful market beside the working ferry",
            "outcome": "You give growers, potters, and carriers a dependable place to trade. The merchant shares the return, and the new bank becomes somewhere people can afford to keep coming home to.",
            "days": 7,
            "cost": 24,
            "reward": 58,
            "skill": null,
            "effect": "market"
          },
          {
            "id": "scheme",
            "label": "Keep the new bank beneath the rival's profitable claim",
            "outcome": "You hold a lasting share of the guarded landing and its collections. The rival calls it peace, while households at the lesser crossing remember a more expensive name for it.",
            "days": 5,
            "cost": 0,
            "reward": 60,
            "skill": {
              "id": "persuasion",
              "min": 5
            },
            "effect": "claim"
          },
          {
            "id": "ritual",
            "label": "Keep remembrance beside the living ferry's evening bell",
            "outcome": "You set a place for the absent without claiming they still wait underwater. Families bring songs, silence, and ordinary supper; the new bell calls living boats toward the shore.",
            "days": 6,
            "cost": 14,
            "reward": 0,
            "skill": {
              "id": "devotion",
              "min": 4
            },
            "effect": "ritual"
          },
          {
            "id": "leave",
            "label": "Leave the new shore to the people building their homes",
            "outcome": "You leave the school, market, and landing in local hands. The river and your earlier choices remain part of their lives, but their next working day grants you no new reward.",
            "days": 0,
            "cost": 0,
            "reward": 0,
            "skill": null,
            "effect": "none"
          }
        ]
      }
    ]
  }
];
