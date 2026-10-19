# Hearth & Oath v0.3 — a life shaped by fate

The user's correction is the design authority: birth at zero; age-gated life choices; an earned identity instead of a creation class; seeded childhood and a connected long campaign; consequential quests, dungeons and many endings; a visibly moving piece on a genuinely seeded map; character conversations and a dedicated relationships screen. The old focus/lifestyle planner is not the new progression loop.

## Refined build prompt

Build a high-fantasy life simulator in which an ordinary life can become a legend. Begin at birth with no selected class. Use age-by-age progression and seeded, contextual yearly dilemmas; unlock school, training, travel, work, romance, and danger at appropriate ages. Let actual experiences develop attributes, skills, relationships, and eventually an earned calling. Give the player a seeded fate whose meaning unfolds through childhood, then allow them to embrace, reinterpret, or defy it.

Connect that personal history to an overarching campaign of investigation, exploration, dungeon rooms, party battles, and consequential alliances. Choices must create persistent facts and materially different endings, including changed institutions, damaged or destroyed settlements, displaced people, and survival beyond the crisis. Civilian life and further years remain playable after the campaign. Secrets spread through named witnesses and disclosure, while friends retain individual values and memories.

Present the experience through a coherent fantasy interface: an evolving customizable portrait; readable scenes with specific choices and visible consequences; an always-visible age progression control; a large seed-generated map with real roads and an animated character piece; named conversation threads; and dedicated relationships, quests, and chronicle views. Build connected playable systems, verify complete journeys and old saves, and judge every addition by how it changes the life the player is developing.

## Ownership

- Root: app.js, offline bundler, browser journeys, package/version, publication.
- life_engine: engine.js, birth.js, life.js integration as needed, engine/birth tests. Central state mutations, chronology, age gates, migration, dispatch and campaign/dungeon hooks.
- annual_life: campaign.js and campaign tests. Full authored branching story and sidequests.
- party_combat: exploration.js, combat.js, gear.js and their tests. Room exploration, many encounters, bosses and class combat effects.
- visual_design: world.js, map.js, styles.css, index.html, art and world/map tests. Seeded geography, routing model, rendered board/piece, polished game shell styling.
- avatar_design: conversations.js, classes.js and their tests. Named message threads, replies, relationship context; earned class catalog and initiation scenes.
- journey_qa: integrated tests/fixtures, README, final acceptance audit. Do not edit other agents' files.

## Shared state and compatibility

Keep version:1. New lives are revision:3; legacy APIs/fixtures remain supported. New UI calls createBirthGame(config), which starts day0 age0, childhood, hero.path='unformed', no specialization and no starting weapon. createGame remains legacy-compatible for previous journeys. Use timeline.mode='birth'|'legacy'; birth age=floor(day/365), legacy adult age=18+floor(day/365). Existing legacy childhood milestones must resume exactly. Migrate old saves additively, preserving pending events, combat snapshots, names/laws, money, memories, knowledge and obligations. An unfinished v2 annual plan remains recoverable through a small compatibility control; new games never offer the old planner.

Birth peers use base ages relative to birth (parent ~27, peer0, rival1, prospective partner2); companions start as children and age with the hero. All normal mutations clone in public engine wrappers. Module handlers below MUTATE the supplied clone and use ctx; modules never call engine wrappers.

New fields:

- timeline: {mode,yearTarget:null|int,yearStartDay:int,yearHistory:array,activityUses:object,childhoodFacts:object}. Engine/birth agent may extend with explicit validated fields.
- progression: {learnedClassIds:[],pendingCalling:null|id,mentors:object}. hero.path uses 'unformed' until earned; hero.specialization stores the active earned class ID. One active class, no bonus stacking.
- campaign: {fate:'ember'|'echo'|'thorn',act:int,stage:string,facts:object,decisions:[],completed:[],ending:null|object,pending:null|object}. Agent can add explicit fields and validate them. Story fate is a lens, not a forced class or guaranteed ending.
- dungeon: null|{id,roomId,visited:[],cleared:[],facts:object,pendingRoom:null|id,complete:boolean}. Rewards and room results once only.
- conversations: {threads:object,seen:[],pending:null|object}. Threads contain safe serializable messages {id,speaker,text,day,age}; pending holds personId/nodeId/replies. No freeform AI or automatic secret sharing.

## Module contract

ctx supplies spendDays(days,options), earnExperience(amount), journal(title,text,tag), standing(faction,amount), remember(companionId,text,amount), addObligation, finishObligation, addEvidence, breakOath, witnesses, setEvent(id,title,category,body,choices), afterAction, nextInterruptionDay, pendingNeed. **setEvent choices remain {id,label,description}.**

ctx.startBattle(encounterId,context) starts a battle with a pending immutable context copied into battle.context. Engine applies result via the matching subsystem after resolving baseline HP/MP/gold once. ctx.touchCampaign() can refresh campaign availability. Do not pay battle reward gold/XP again in campaign/dungeon handlers; extra quest rewards explicitly once-only.

### Birth / engine

Exports createBirthGame(config), ageUp(state), continueAgeUp(state), getAgeActivities(state), getAgeUnlocks(state), getLifeStage(state). Root uses existing chooseAction/chooseEventOption/travelTo/recruit/toggle/resolve wrappers. Birth activities prefix grow_; annual/new childhood event IDs prefix birth_. Each Age up advances toward exactly the next birthday and stops for meaningful decisions and existing supernatural/obligation needs. Calls while any event/battle waits do not skip it. New-year events draw on seed and remembered childhood; infancy decisions belong to guardians. Guardian/school/training choices grow actual attributes and skills.

Age gates enforced in engine, not merely hidden UI: family0, play3, reading/school6, practice10, regional travel14, dungeons/party/profession16, courtship/advanced calling18. Do not allow adult spending/work/romance/retirement/transformation through child API calls. New characters may remain unformed/civilian until trained. Legacy daily activities continue for adult saves. New timeline yearbook can reuse life.yearHistory where practical. No auto-resolve fights, hunger, full moons or story decisions on Age up.

Engine dispatches getActions: grow_, quest_, explore_, talk_/calling_, existing core adult activities. If modern dungeon/event/battle active, expose only appropriate progression. Engine extends event/hero/battle/world/save validation; use each module's eventIds/validator. For new lives, the campaign replaces automatic legacy plague-letter entry (legacy story remains for imported lives).

### Campaign

Exports initializeCampaign(state,{migration=false}={}), campaignActions(state), applyCampaignAction(state,id,ctx), applyCampaignChoice(state,eventId,choiceId,ctx), afterCampaignBattle(state,context,outcome,ctx), campaignEventIds(), validateCampaign(value,state?), campaignView(state), onCampaignAge(state,ctx).

campaignView returns {title,actLabel,summary,fateLabel,quests:[{id,title,status,objective,locationId,description}],ending:null|{id,title,summary}}. Quest statuses active/locked/completed/failed; IDs stable. Actions prefix quest_, event IDs fate_/quest_. Campaign must work from childhood revelations to age16+ investigations, allies and sidequests, several dungeons, a settlement catastrophe with evacuation/ward/resource choices, final confrontation and at least5 materially distinct endings. Player can refuse fate and continue civilian life. Class/build never sole entry gate. Legacy plague facts feed into opening without duplicate reward.

World changes mutate location.status ('thriving'|'scarred'|'evacuated'|'destroyed'), append world.changes entries {id,day,locationId,title,text}, and update description. Stable IDs are never deleted. Lost homes/cities stay visitable; services cease, NPC displacement appears in story/conversations, and alternative teachers/work routes remain reachable.

### Exploration / combat

Exports DUNGEONS catalog, initializeExploration(state), explorationActions(state), applyExplorationAction(state,id,ctx), applyExplorationChoice(state,eventId,choiceId,ctx), afterExplorationBattle(state,context,outcome,ctx), explorationEventIds(), validateExploration(value,state?), dungeonView(state), encounterIds(). Prefix explore_; scene IDs dungeon_.

dungeonView -> null|{title,description,rooms:[{id,title,visited,cleared,current}],room:{title,description},complete}. Room graph choices: investigate, traps, talk/negotiate, treasure, hazards, fights, boss, return/exit. Multiple authored dungeons with seeded room ordering/flavor and clear progress. Retreat keeps unfinished room; defeat exits with recovery and no phantom quest success. Engine fight resolution dispatches pending context. Context: {kind:'dungeon',dungeonId,roomId,questId?:string} or {kind:'campaign',questId,stage}. New encounter IDs declared by encounterIds; retain forest/ruin/initiation and all old battle behavior. Enemy roster3..8 total actors supported, inspectable roles/intent; bosses have telegraphed attacks. More earned classes have distinct real tactic effects, not names only.

### Classes / conversations

Classes exports CLASS_CATALOG, initializeProgression(state,{migration=false}={}), callingActions(state), applyCallingAction(state,id,ctx), applyCallingChoice(state,eventId,choiceId,ctx), callingEventIds(), validateProgression(value,state?), classView(state). CLASS_CATALOG array {id,name,role,description,skills:object,minAge,locationId,ability}. At least12 earned callings mapped to warrior/mage/rogue combat role: guardian/berserker/knight/paladin, healer/elementalist/druid/necromancer, thief/ranger/assassin/bard. Requirements actual learned skills and a mentor/initiation in a reachable world location. Prefix calling_; generic calling_initiation event stores progression.pendingCalling. No starting class in creation. Migration keeps existing specialization/path unchanged and recognizes it as earned.

Conversations exports initializeConversations(state), getContacts(state), getThread(state,personId), dialogueActions(state), applyDialogueAction(state,id,ctx), replyToConversation(state,personId,replyId,ctx), onConversationAge(state,ctx), dialogueEventIds(), validateConversations(value,state?). Root engine wrapper replyMessage(state,personId,replyId) clones. Actions talk_PERSONID open authored thread node; reply options exposed by getThread as {messages,replies:[{id,label,description}],pending:boolean}. getContacts returns [{id,name,role,age,bond,description,unread,appearance?,locationId?}]. Support family, peers/rivals, companions, teachers/faction contacts, seeded personal scenes, childhood friend followups, campaign/fate/world damage responses. Replies cause actual knowledge, bonds, obligations or quest facts. Messages only named participants learn; secrets stay local. When replying, do not also advance global engine.event unless explicitly setting a story scene. Text bubble layout should fit fantasy letters/conversations, never imply phones in-world.

### World / map

generateWorld(seed,{expanded=false}={}) retains legacy5 behavior; new expanded generation preserves original5 IDs plus at least8 new sites (mountain, marsh, coast, tower, camp, gate, citadel, sanctuary preferred IDs), roads and lore, per-seed layout/biomes/landmarks. Add expandWorld(state.world,seed) for migration without renaming existing places. Export expandWorld, findRoute(world,from,to), travelPreview(state,id). findRoute -> [locationIds] or []; travelPreview -> {route,days,description,disabledReason?}. Engine travel follows actual route and reports exact displayed days; childhood gate14; destruction does not disconnect essential alternatives. world.map includes nodes [{id,x,y}], terrain/biomes and seed-dependent geometry; world.changes defaults [].

map.js exports renderWorldMap(state,{compact=false,selectedId=null,movement=null}={}), animateMapMovement(root,movement), getMapMovement(previous,next). HTML/SVG board draws real terrain, roads, quest/damage marks, node labels, character chess piece, selected route. Map node click uses data-op='map-select', data-id; travel via separate confirmation button. Pawn animation runs AFTER root.render and uses movement {route,from,to}; reduced motion immediate. Map controls data-op='map-zoom' data-id='in'|'out'|'reset', root handler delegated. Board accessible location buttons, zoom via data scale/controller root-owned. Root-selected destination state persists during views.

Root shell: primary Life/World/People/Quests/Chronicle; Character opens from portrait, Pack header action, Party secondary. Compact headings replace huge repeated banners. Persistent Age up button, readable16px narrative,14px controls,12px metadata,44px hit areas, mobile5-item bottom nav. Classes/callings as earned character progress. Life = current story + small actual map + compact age activities. People = contact list + real chronological thread. Quests = current objective + route links + outcomes. Old planner UI removed from primary flow.

## Acceptance

Birth0 is real; every early year presents seeded appropriate story, memories and age gates; no creation class. Child choices materially shape available adult callings. Seed changes childhood, contacts and map geometry. A complete campaign can be played through investigations, actual room encounters and bosses, catastrophe choices, and different final outcomes; destroyed places alter visible map/services. At least one ending averts catastrophe, one sacrifices a settlement, one changes institutions, one embraces dangerous power, and one defies the covenant. Real named conversation/reply threads return personal facts. Existing saves and unfinished battles survive. Meaningful branch tests and real desktop/mobile/offline browser checks before publication. Do not claim full commercial scope; deliver connected playable systems rather than decorative counters or disconnected menus.
