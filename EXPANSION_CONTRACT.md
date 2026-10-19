# Expansion ownership and integration contract

Keep existing public APIs and all baseline gameplay. Save `version:1` stays compatible; extended states carry `revision:2`. Engine exports `migrateSave(value)` -> independent migrated state or null, and validates both old base states and complete revision2 states. Migration grants no resources, changes no pending event/battle, and preserves journal/memories/local evidence. Root app migrates read/resume/import and retains current localStorage key.

## Ownership

- Root: app.js, offline bundler, source workflow, this brief/contracts, publication.
- life_engine: engine.js, world.js, tests/engine.test.js; integrate modules and validate extensions.
- annual_life: life.js and tests/life.test.js; annual planning, wellbeing/career/housing/social relationships/ambitions and authored decisions.
- party_combat: combat.js, gear.js, tests/combat.test.js, tests/gear.test.js; catalog and tactical combat.
- avatar_design: avatar.js, tests/avatar.test.js; pure SVG/customization/rendering APIs.
- visual_design: styles.css, index.html, art/*.svg; match root markup and fantasy visual upgrade.
- journey_qa: tests/expansion.test.js and README; independent integrated acceptance.

## Shared extended fields

hero gains temperament ('compassionate','ambitious','curious','cautious','rebellious'), belief ('lantern','ancestors','wilds','secular'), pronouns ('she/her','he/him','they/them'); appearance is normalized by avatar.js. No hidden attractiveness score. Condition is null, existing vampire {type:'vampire',hunger}, or {type:'lycanthrope',control:0..100,preparedUntil:integer,lastFullMoon:integer}. Existing companion data remains (3 recruitable party members); generated social NPCs live in life.people.

state.equipment = {owned:[catalog item ids], equipped:{weapon:null/id,armor:null/id,trinket:null/id}, materials:{ore:integer,cloth:integer}}. Existing herb count remains flags.herbs to avoid duplicate resources. Gear initialization does not duplicate old owned items or permanently modify hero stats.

state.life = {focus:'livelihood'/'education'/'relationships'/'adventure'/'rest',lifestyle:'frugal'/'comfortable'/'generous',happiness:0..100,stress:0..100,health:0..100,career:{rank:integer,experience:integer},home:{tier:'lodgings'/'cottage'/'townhouse'/'estate'},people:[{id,name,role,baseAge,age,relation,disposition,bond:0..100,memories:[string],knownFacts:[string]}],partnerId:null/id,children:[{id,name,age,bornDay}],goals:[{id,label,progress,target,completed}],achievements:[{id,label,day}],yearHistory:[{id,age,day,focus,income,expenses,title,summary}],eventHistory:[{id,day,choice}],plan:null/object}. Module may add bounded serializable fields with validation. Inform root promptly of deviations.

## Avatar module (DOM free)

exports DEFAULT_APPEARANCE, AVATAR_OPTIONS, normalizeAppearance(value), renderAvatar(person,options={size:'small'/'large'/'hero',age,context}), appearanceFields(value,{prefix:''}), appearanceFromForm(formData,{prefix:''}), describeAppearance(person). Fields: ancestry ('human','elf','dwarf','halfling'), skin, hair, hairStyle, eyes, face, build, outfit, outfitColor, accessory, scar, tattoo. Provide options/labels to root. renderAvatar returns safe HTML with SVG, .fantasy-avatar plus size class; never interpolate unescaped save text.

## Gear module (DOM free)

exports GEAR_CATALOG (array {id,name,slot,description,price,bonuses:{attack,armor,magic,agility},recipe:null/{ore,cloth,gold}}), initializeGear(state) MUTATES, gearBonuses(state) -> numeric bonus object, gearActions(state) -> existing action descriptors, applyGearAction(state,id,ctx) MUTATES -> boolean handled, equipItem(state,id) MUTATES -> boolean success, validateGear(value) -> boolean. Action ids prefix gear_, e.g. gear_buy_id / gear_craft_id / gear_gather_ore. Engine handles generic action days/cost ONCE before applyGearAction. Gear apply does not charge day/gold again. ctx offers journal(title,text,tag), earnExperience(amount). Gear stat effects compute on battle creation, never modify hero base stats. Root UI shops/equips from catalog; engine exposes equipGear(state,id) -> cloned state.

## Annual life module (DOM free)

exports YEAR_FOCI (array {id,label,description}), LIFESTYLES (array {id,label,description}), initializeLife(state,config={}) MUTATES, lifeActions(state) -> existing descriptors with life_ prefix, applyLifeAction(state,id,ctx) MUTATES -> handled boolean, applyLifeChoice(state,eventId,choiceId,ctx) MUTATES -> handled boolean, startYearPlan(state,config,ctx) MUTATES, continueYearPlan(state,ctx) MUTATES, yearPreview(state,config) -> {days,income,expenses,description,warnings:[string]}, validateLife(value,state?) -> boolean, lifeEventIds() -> object mapping event ids to allowed choice ids.

ctx closure (provided by engine) contains spendDays(days,options), earnExperience(amount), journal(title,text,tag), standing(faction,amount), remember(companionId,text,amount), addObligation(id,title,days,description), finishObligation(id), addEvidence(amount,description), breakOath(reason), witnesses() -> active companions, setEvent(id,title,category,body,choices), afterAction() optional. State-owned mutations valid; helper functions update resource/time/experience invariants. Ordinary annual decisions are explicit planning/continue actions, so old day-based work does not suddenly block on every birthday. Engine exposes planYear(state,config) and continueYear(state); calls life helpers, preserves barriers, returns clone. Life module may pause a plan with life_* authored events, using ctx.setEvent; resume only through Continue planned year after resolving decision. Plan ends at next birthday target day, records summary ONCE, then opens annual turning-point event with seeded relevant choices. Deadline interruptions and vampire/fullmoon safety need explicit options; do not bulk leap silently over needs. Coordinate lycan hooks with engine.

Annual life actions cover profession development/promotion, housing, wellbeing, named-person interaction/courtship/commitment and family, plus ambitions. Root uses lifeActions indirectly via getActions, with filtering. Yearbook view uses yearPreview/YEAR_FOCI/LIFESTYLES and state.life. Social cards link to named-person action IDs available from getActions. Handle affordability in disabledReason, honest descriptions and no unlimited negative balances. Named interpersonal memories require actual participant knowledge.

## Engine integration

createGame initializes revision2 appearance/traits/life/equipment. getActions includes gearActions/lifeActions alongside existing. chooseAction dispatches module actions AFTER charging displayed days/cost once; yearly functions handle their own intervals. chooseEventOption delegates life_ events before legacy switch; validation merges lifeEventIds. spendDays updates people/children ages and wellbeing as necessary but no automatic annual blocking event on ordinary birthday. afterAction prioritizes pending lunar events safely without overwriting an existing event or battle. updateAppearance(state,value) returns cosmetic-only cloned state; blocked only if needed for safe stage transitions. equipGear returns cloned state with event/battle barriers.

Lycanthropy: engine owns invitation/acceptance, moon forecast (28-day cycle/fullmoon day14), known control/preparation/refuge, control practice, and cure. Action/choice ids lycan_ prefix; condition exclusivity enforced. Full moon event must queue safely and resolve once per cycle. Annual module asks engine ctx.spendDays and stops on pending moon events rather than overriding or skipping them; communicate hook.

## Root interface plan

Existing views retained with new `yearbook` and `inventory` tabs. Creation hero includes live avatar preview; full extended fields + temperament/belief/pronouns/difficulty optionally. Character has customize button. Year planner has focus cards and lifestyle selection, preview costs/warnings, Live this year / Continue planned year, yearbook entries and wellbeing/goals. Relationships shows named social NPCs and available interaction/courtship/family actions, plus faction/legal standing. Inventory shows equipped/owned gear and shop/crafting/resources; all actions call chooseAction from actual descriptors. Combat shows statuses, gear, additional abilities and supernatural condition. Conditional sidebar status appropriate to vampire/werewolf. Root owns app markup; visual agent styles classes sent directly.
