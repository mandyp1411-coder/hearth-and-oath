import {MAX_SAVE_CHARS} from './save-limits.js';
import { countingTableCommitment } from './local-project-ownership.js';
import { observationalInfancy, infantAgencyReason, observationalCareEvent } from './development.js';
import { isIronman, validateIronman, validateBattleMortality, sameBattleMortalityPolicy, paladinTrialContext, validPaladinTrialContext, ironmanBattleDeaths, ironmanHeroDeath, ironmanCombatStopped, IRONMAN_TERMINAL } from './ironman.js';
import { tournamentActions,tournamentLocked,applyTournamentAction,applyTournamentChoice,tournamentChoiceReason,tournamentEventIds,resolveTournamentBattle,closeTournamentForLife,reconcileTournament } from './adult-tournament.js';
import { validateAdultTournament,validTournamentBattle,validTournamentContext } from './adult-tournament-state.js';
import { isTournamentBattle } from './tournament-duel-rules.js';
import { countingTableTransition, closeCountingTableLife } from './counting-table-job.js';
import { quoteFieldPotion, applyFieldPotion, fieldPotionMomentReason } from './field-treatment.js';
import { appendPersonalNote, validPersonalNotes, editPersonalNote, archivePersonalNote } from './personal-notes.js';
import { legacyCallingOffers, captureLegacyMentorTrial, legacyMentorTrialChoice, markLegacyTrialAccepted, completeLegacyMentorTrial, continueLegacyMentorField, legacyMentorTrialActions, applyLegacyMentorTrialAction, validateLegacyMentorTrial } from './legacy-mentor-trials.js';
import { initializeNpcContinuity, observeNpcContinuity, reconcileNpcContinuity, validateNpcContinuity, townNpc, synchronizeMentorContinuity } from './npc-continuity.js';
import { recordFirstMissionArrival } from './faction-first-missions.js';
import { ensureMazeVisit, recordMazeDays, recordMazeUse, recordMazeFee, beginMazeSettlement, endMazeVictory } from './maze-receipt-runtime.js';
import { isMazeEntry } from './maze-rules.js';
import { validFirstDayGuide } from './first-day-guide.js';
import { flavoredCompletion } from './story-flavor.js';
import { repertoireActions, applyRepertoireAction, applyRepertoireChoice, repertoireEventIds } from './repertoire-gameplay.js';
import { validateRepertoire } from './repertoire.js';
import { yardActions, yardLocked, applyYardAction, applyYardChoice, yardEventIds, validateYard } from './yard-tournament.js';
import { receiveNotification, validNotifications, suppressEarlyCorrespondence } from './notifications-v40.js';
import { hospitalityActions, applyHospitalityAction, innSupplyReason, useInnSupply, validateHospitality } from './hospitality-v36.js';
import { daylifeActions, applyDaylifeAction, validateDaylife } from './daylife-v35.js';
import {homeRestActions,applyHomeRest} from './home-recovery-v38.js';
import { applyWildernessChoice, validateWilderness } from './wilderness-v35.js';
import { learnQuestDirections } from './quest-directions-v35.js';
import { initializeRegionalWorld, onRegionalTime, regionalActions, applyRegionalAction, validPoliticalBattle, afterPoliticalBattle, validateRegionalWorld, learnRegion, regionalQuestRows, closeRegionalLife } from './regional-world-v33.js';
import { initializeSocialLife, socialLifeActions, applySocialLifeAction, rememberResident, romanceReason, validateSocialLife } from './world-people-v31.js';
import { initializeMaze, enterMaze, mazeActions, mazeRoomCell, applyMazeAction, afterMazeBattle, validMazeContext, validateMazes, archiveStoryMazeAtLifeEnd, inheritStoryMazes, mazeMapRuntime, repairStoryMazeContactJournal, mazeFieldAssistQuote } from './maze-v31.js';
import { editMazeMapMemory } from './maze-map-memory.js';
import { rewriteWorldProse } from './world-prose-v30.js';
import { editionEvent, upgradeNarrative, refreshNarrativeRecords } from './narrative-edition.js';
import { groundedOutcome } from './grounded-narrative-content.js';
import { settlementServices, serviceAccessReason } from './world-services.js';
import { nightInvitation, settleNightInvitation } from './supernatural-discovery.js';
import { defeatGuidance } from './combat-guidance.js';
import { initializeUpbringing, upbringingActions, applyUpbringingAction, onUpbringingTime, validateUpbringing } from './upbringing.js';
import { initializeQuestJournal, questJournalActions, applyQuestJournalAction, validateQuestJournal } from './quest-policy.js';
import { retirementQuestReview, closeQuestAccounts } from './quest-records.js';
import { initializeRpg, rpgActions, applyRpgAction, applyRpgChoice, rpgEventIds, onRpgTime, validateRpg, afterRpgBattle, validRpgBattleContext, inheritRpg, rpgChoiceReason, recordCurseSurvivor } from './rpg-depth-v27.js';
import { validEnemyPlan } from './enemy-plans-v27.js';
import { advancedTechnique } from './techniques-v27.js';
import { validateReleaseFields } from './release-v25-validation.js';
import { fieldActions,applyFieldAction,applyFieldChoice,fieldEventIds,validateFieldNotes } from './field-notes-v25.js';
import { killNamedPerson } from './lineage.js';
import { queueRareNightEncounter, validateNightEncounters, curseTimeBudget, initializeCurse, contractCurse, feedBlood, bloodHungerRate, recordCurseExposure, onCurseTime, curseActions, applyCurseAction, applyCurseChoice, flushCurseEvent, afterCurseBattle, validateCurse, curseEventIds } from './curses.js';
import { feedingChoices, feedingScene, validateFeedingTerms } from './feeding-stories-v26.js';
import { initializeCartography, syncCartography, inheritCartography, cartographyActions, applyCartographyAction, validateCartography, markSiteKnowledge, hexAtlas, planHexRoute, learnRoadDirections, observeRoadCountry } from './cartography.js';
import { culturalName } from './names.js';
import { generateCharacter } from './characters.js';
import { originById, MAX_START_AGE } from './origins.js';
import { generateWorld, seededRoll, validateWorld, expandWorld, travelPreview, resolveBirthplace, generatePersonName, isSettlement, worldCalendarContext, withArticle } from './world.js';
import { createBattle, takeBattleAction, getBattleActions, combatProfile } from './combat.js';
import { initializePersonality, initializePersonalityDecision, personalityActions, applyPersonalityAction, applyPersonalityChoice, personalityEventIds, applyPersonalityBuild, applyPersonalityImpact, personalitySelectionReason, personalityImpact, validatePersonality } from './personality.js';
import { validateStartingAttributes } from './starting-attributes.js';
import { normalizeAppearance, isCanonicalAppearance } from './avatar.js';
import { selectPortrait, assignHeritage } from './portrait-library.js';
import { heritageById } from './heritages.js';
import { initializeGear, gearActions, applyGearAction, equipItem, validateGear, dropEquipment } from './gear.js';
import { saveGearPreset, renameGearPreset, replaceGearPreset, deleteGearPreset, toggleGearFavorite, stageGearPreset } from './gear-organizer.js';
import { applyTrade } from './trading.js';
import { initializeLife, lifeActions, applyLifeAction, applyLifeChoice, lifeChoiceReason, startYearPlan, continueYearPlan, validateLife, lifeEventIds } from './life.js';

import { relationshipActions, applyRelationshipAction } from './relationship-repairs.js';
import { personalReadiness, respectPersonalBoundaries } from './people-context.js';
import { initializeTimeline, getAgeActivities, getAgeUnlocks, getLifeStage, applyBirthAction, applyBirthChoice, birthEvent, observationalBirthEvent, startAgeYear, continueAgeYear, birthEventIds, validateTimeline } from './birth.js';
import { CLASS_CATALOG, initializeProgression, classView, capturePendingMentor, callingActions, applyCallingAction, applyCallingChoice, callingEventIds, validateProgression } from './classes.js';
import { initializeConversations, getContacts, upgradeDialogueEdition, dialogueActions, applyDialogueAction, replyToConversation, onConversationAge, dialogueEventIds, validateConversations } from './conversations.js';
import { campaignView, initializeCampaign, campaignActions, applyCampaignAction, applyCampaignChoice, afterCampaignBattle, campaignEventIds, validateCampaign, onCampaignAge } from './campaign.js';
import { DUNGEONS, initializeExploration, explorationActions, applyExplorationAction, applyExplorationChoice, afterExplorationBattle, explorationEventIds, validateExploration, encounterIds, enterDungeon } from './exploration.js';

import { researchActions, applyResearchAction, applyResearchChoice, researchChoiceReason, researchTransition, closeResearchLife } from './research-runtime.js';
import { validateResearchPortfolio } from './research-portfolio.js';
import { researchDefinition } from './research-definitions.js';
import { researchEventIds, preserveResearchEvent, validateResearchScene } from './research-scenes.js';
import { initializeFamilyOrigins, originActions, applyOriginAction, applyOriginChoice, originChoiceReason, originEventIds, validateFamilyOrigins, originTransition, closeFamilyOrigins } from './family-origins.js';
import { initializeHousehold, initializeFamilyDepth, householdActions, applyHouseholdAction, applyHouseholdChoice, householdEventIds, onHouseholdAge, householdContext, validateHousehold, validateEducation } from './household.js';
import { initializeWorkshop, workshopActions, applyWorkshopAction, refreshWorkshop, validateWorkshop } from './workshop.js';
import { initializePreferences, normalizePreferences, applyPreferenceActivity, validatePreferences } from './preferences.js';
import { initializeLore, loreActions, applyLoreAction, applyLoreChoice, loreEventIds, validateLore } from './lore.js';
import { initializeCareers, careerActions, applyCareerAction, applyCareerChoice, onCareerTime, flushCareerEvent, careerEventIds, validateCareers, PROFESSION_CATALOG, professionWage, professionAnnualWage, recordCareerWork } from './careers.js';
import { initializeLineage, registerCompanionRecord, registerWorldLifeRecord, lineageActions, applyLineageAction, applyLineageChoice, onLineageTime, flushLineageEvent, lineageEventIds, validateLineage, createSuccessor, completeLineageHistory, killCurrentCompanionPerson } from './lineage.js';
import { captureAdultChildClock, recordAdultChildSiteChange, settleAdultChildClock } from './adult-child-clock.js';
import { initializeHealth, healthActions, applyHealthAction, applyHealthChoice, onHealthTime, flushHealthEvent, healthChoiceReason, healthEventIds, validateHealth, recoveryActions, applyRecoveryAction, herbalCareOffer, herbalCareReceipt } from './health.js';
import { initializeLifeStories, storyActions, applyStoryAction, applyStoryChoice, storyChoiceReason, storyEventIds, validateStories } from './life-stories.js';
import { flushPersonalAllegation } from './story-allegations.js';
import { recordLifeAtmosphere } from './life-atmosphere.js';
import { initializeRealm, realmActions, applyRealmAction, onRealmTime, regionAt, validateRealm } from './realm.js';
import { initializeJustice, justiceActions, applyJusticeAction, applyJusticeChoice, imprison, onJusticeTime, flushJustice, justiceEventIds, validateJustice } from './justice.js';
import { initializeAdventuring, adventureActions, applyAdventureAction, applyAdventureChoice, adventureEventIds, afterAdventureBattle, onAdventuringTime, refreshAdventureBoard, validAdventureContext, validateAdventuring } from './adventuring.js';
import { validEnemyIllustration } from './enemies.js';
import { initializeTravelEnergy, travelEnergyView, travelEnergyForecast, progressTravelStep, campingActions, applyCampingAction, noteTravelRest, validateTravelEnergy } from './travel-energy.js';
import { initializeTravel, setTravelPlan, travelPlanPreview, beginTravelJourney, onTravelLeg, travelActions, applyTravelAction, applyTravelChoice, flushTravelEvent, afterTravelBattle, travelEventIds, validateTravel } from './travel.js';
import { initializeFortune, onFortuneTime, fortuneIncomeFactor, validateFortune, flushWinterEvent, applyWinterChoice, WINTER_EVENT } from './fortune.js';
import { STATIONS, stationById, rollStation, rollBirthCircumstances, stationIncome, validateStation } from './station.js';
import { epitaph, validateEpitaph } from './voice.js';
import { initializeSchooling, onSchoolingBirthday, onSchoolingYear, validateSchooling, flushSchoolingEvent, applySchoolingChoice, SCHOOLING_EVENTS } from './schooling.js';
import { initializeLivingWorld, onLivingTime, flushLivingEvent, applyLivingChoice, validateLiving, LIVING_EVENTS } from './living-world.js';
import { initializeGuild, onGuildTime, guildActions, applyGuildAction, applyGuildGates, flushGuildEvent, applyGuildChoice, validateGuild, GUILD_EVENTS } from './guild.js';
import { initializeDelves, isDelveEntry, delveEntryReason, enterDelve, delveActions, applyDelveAction, afterDelveBattle, flushDelveEvent, applyDelveChoice, onDelveTime, validateDelve, DELVE_EVENTS } from './delve.js';
import { initializeHouseholdBudget, accrueHouseholdBudget, settleHouseholdBudget, chargeDebtInterest, debtReckoning, applyDebtReckoningChoice, DEBT_RECKONING_EVENT, applyAnnualFocus, annualWorkRatio, householdCostPreview, householdBudgetActions, applyHouseholdBudgetAction, validateHouseholdBudget } from './budget.js';
import { initializeSociety, societyActions, applySocietyAction, applySocietyChoice, societyEventIds, onSocietyTime, flushSocietyEvent, validateSociety, inheritSociety, societyCustomerChoiceReason } from './society.js';
import { initializeCommunity, communityActions, applyCommunityAction, applyCommunityChoice, communityEventIds, onCommunityTime, flushCommunityEvent, validateCommunity, inheritCommunity } from './community.js';
import { initializeFellowship, fellowshipActions, applyFellowshipAction, applyFellowshipChoice, fellowshipEventIds, onFellowshipTime, flushFellowshipEvent, validateFellowship, inheritFellowship } from './fellowship.js';
import { initializeSanctuaries, sanctuaryActions, applySanctuaryAction, applySanctuaryChoice, sanctuaryEventIds, onSanctuaryTime, flushSanctuaryEvent, validateSanctuaries, onEvidence, onSanctuaryNeed, applySanctuaryNeed, sanctuaryNeedsBypass, sanctuaryMoonPrepared, sanctuaryHouseholdPlan, onSanctuaryRefugePrepared } from './sanctuaries.js';
import { initializeSocial, socialActions, applySocialAction, applySocialChoice, socialEventIds, onSocialTime, flushSocialEvent, validateSocial } from './social.js';
import { initializePastimes, pastimeActions, applyPastimeAction, applyPastimeChoice, pastimeEventIds, onPastimeTime, flushPastimeEvent, validatePastimes } from './pastimes.js';

export { getAgeActivities, getAgeUnlocks, getLifeStage };
const birthMode = state => state?.timeline?.mode === 'birth';
const waiting = state => Boolean(state.event || state.battle || state.conversations?.pending);
const terminalRun = state => isIronman(state) && ironmanCombatStopped(state?.battle);
const experienceModule = state => countingTableCommitment(state) ? 'justice_job' : tournamentLocked(state) ? 'tournament' : yardLocked(state) ? 'yard' : state.conversations?.project ? 'conversations' : state.rpg?.project ? 'rpg' : state.stories?.project ? 'stories'
  : state.researchPortfolio?.project ? 'research' : state.familyOrigins?.project ? 'origin' : state.health?.recovery ? 'recovery'
  : state.society?.project ? 'society'
  : state.community?.project?.commitment ? 'community'
  : state.fellowship?.project ? 'fellowship'
  : state.sanctuaries?.commitment ? 'sanctuary'
  : state.lineage?.adoption?.preparation ? 'lineage_adoption'
  : state.pastimes?.project ? 'pastime' : state.repertoire?.project ? 'repertoire' : null;
const experienceActions = state => [...justiceActions(state),...tournamentActions(state),...researchActions(state),...originActions(state),...yardActions(state),...relationshipActions(state),...rpgActions(state),...storyActions(state),...recoveryActions(state),...societyActions(state), ...communityActions(state), ...fellowshipActions(state), ...sanctuaryActions(state), ...socialActions(state), ...pastimeActions(state),...repertoireActions(state,state.repertoire?.recall?getContacts(state):[]),...(state.lineage?.adoption?.preparation?lineageActions(state).filter(a=>a.id.startsWith('lineage_adoption_')):[])];
export function getLifeCommitment(state) {
  if(state&&tournamentLocked(state))return {kind:'tournament',title:'The Watchhouse Challenge',locationId:state.adultTournament.locationId,totalDays:1,completedDays:state.adultTournament.paidDays,remainingDays:1-state.adultTournament.paidDays};
  if(state&&yardLocked(state))return {kind:'yard',title:'The Gateyard Ribbon',locationId:state.yardTournament.locationId,totalDays:1,completedDays:state.yardTournament.paidDays,remainingDays:1-state.yardTournament.paidDays};
  if(state?.cartography?.pending){const p=state.cartography.pending;return {kind:'atlas',title:'Your journey through the country',locationId:state.locationId,totalDays:p.totalDays,completedDays:p.progress,remainingDays:p.totalDays-p.progress};}
  if(state?.justice?.prison){const p=state.justice.prison;return {kind:'prison',title:'A regional sentence',locationId:p.locationId,totalDays:p.totalDays,completedDays:p.servedDays,remainingDays:p.totalDays-p.servedDays};}
  const counting=countingTableCommitment(state);if(counting){const {run,phase}=counting,completedDays=phase.completedDay===null?0:1;return {kind:'justice_job',title:'The Counting-Table Silver · '+run.stage,locationId:run.locationId,totalDays:1,completedDays,remainingDays:1-completedDays};}
  if(state?.rpg?.expedition){const p=state.rpg.expedition;return {kind:'rpg',title:p.title,locationId:p.locationId,totalDays:0,completedDays:0,remainingDays:0};}
  if(state?.adventuring?.expedition){const p=state.adventuring.expedition;return {kind:'adventure',title:'The '+p.theme+' descent',locationId:p.locationId,totalDays:0,completedDays:0,remainingDays:0};}
  const kind=state&&experienceModule(state);if(!kind)return null;
  if(kind==='lineage_adoption'){
    const p=state.lineage.adoption.preparation,total=p.stage==='prepare'?3:2;
    return {kind,title:'Making room for a child’s own wishes',locationId:state.locationId,totalDays:total,completedDays:p.progress,remainingDays:Math.max(0,total-p.progress)};
  }
  const project=kind==='research'?state.researchPortfolio.project:kind==='origin'?state.familyOrigins.project:kind==='recovery'?state.health.recovery:kind==='sanctuary'?state.sanctuaries.commitment:kind==='pastime'?state.pastimes.project:state[kind].project;
  const work=kind==='community'?project.commitment:project;
  const total=work.totalDays||0,done=work.completedDays??work.attendedDays??work.workedDays??(total-(work.remainingDays??total));
  const namedTitle=kind==='research'?researchDefinition(state.researchPortfolio.runs.find(run=>run.id===project.runId)?.definitionId)?.title:kind==='fellowship'?(project.kind==='formation'?`${CLASS_CATALOG.find(c=>c.id===project.subjectId)?.name||'Your calling'} — ${{field:'inquiry',practice:'chosen practice',attest:'mentor review'}[project.phase]||'formation'}`:`${state.companions.find(p=>p.id===project.subjectId)?.name||'Your companion'}’s ${project.phase==='field'?'shared request':'agreed next step'}`):kind==='community'?project.name:kind==='society'?`${state.society.people.find(p=>p.id===project.personId)?.name||'Someone you know'} — ${{repair:'a repair promised',teach:'time at the workbench',credit:'a share in the work',hours:'a working agreement',launch:'an independent livelihood'}[project.type]||'a promise'}`:null;
  return {kind,title:kind==='repertoire'?`${project.kind==='recital'?'Recital':'Rehearsal'}: ${project.piece.title}`:project.title||work.title||namedTitle||'An agreement to keep',locationId:work.locationId||project.locationId||state.locationId,totalDays:total,completedDays:done,remainingDays:work.remainingDays??Math.max(0,total-done)};
}
const ageAllows = (state, age) => birthMode(state) ? state.age >= age : state.phase === 'adult';
const birthDay = state => birthMode(state) ? state.timeline?.birthDay || 0 : 0;
const nextBirthday = state => birthDay(state) + (Math.floor((state.day - birthDay(state)) / 365) + 1) * 365;
const npcAge = (state, person) => {
  const day=person.alive===false&&Number.isInteger(person.deathDay)?person.deathDay:state.day;
  return Number.isInteger(person.bornDay) ? Math.max(0, Math.floor((day - person.bornDay) / 365)) : person.baseAge + Math.floor(day / 365);
};
const birthdayId = state => birthDay(state) ? `birthday-${birthDay(state)}-${state.age}` : `birthday-${state.age}`;
const PATHS = ['warrior', 'mage', 'rogue'];
const ATTRIBUTES = ['strength', 'agility', 'vitality', 'intellect', 'willpower', 'presence'];
const SKILLS = ['weapons', 'defense', 'arcana', 'devotion', 'stealth', 'survival', 'scholarship', 'persuasion'];
const PASSIVE_WAGE_FACTOR = 0.6;
const TEMPERAMENTS = ['compassionate', 'ambitious', 'curious', 'cautious', 'rebellious'];
const BELIEFS = ['lantern', 'ancestors', 'wilds', 'secular'];
const PRONOUNS = ['she/her', 'he/him', 'they/them'];
const copy = value => structuredClone(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const location = state => state.world.locations.find(place => place.id === state.locationId);
const home = state => state.world.locations.find(place => place.id === 'home');
const city = state => state.world.locations.find(place => place.id === 'city');
const skill = (state, key, amount = 1) => { state.hero.skills[key] += amount; };
const standing = (state, key, amount) => { state.factions[key] = clamp(state.factions[key] + amount, -100, 100); };
const choice = (id, label, description) => ({ id, label, description });
const personalNames = (state, text) => String(text).replace(/\b(Mira|Orrin|Kest)\b/g, name => state.companions.find(p => p.id === name.toLowerCase())?.name || name);
const setEvent = (state, id, title, category, body, choices) => {
  if(['life_hunger','vampire_feeding'].includes(id))choices=feedingChoices(state,id,choices);
  if(id==='life_hunger'&&state.justice?.prison)body=`Hunger is ${state.hero.condition.hunger}/100 behind the locked door. The infirmary jailer can provide an emergency animal ration, but must record the need locally. You can also refuse another night; confinement does not stop starvation or the calendar.`;
  if(['life_hunger','vampire_feeding'].includes(id)&&!choices.some(c=>c.id==='agreement'))choices=[...choices,...onSanctuaryNeed(state,'vampire')];
  const named=id.startsWith('tournament_')||['lineage_future','lineage_independence'].includes(id)||id.startsWith('origin_')||id.startsWith('yard_')||id==='rpg_intrigue'||id==='society_customer'||id==='curse_rare_meeting'||['vampire_offer','lycan_offer'].includes(id)&&!!nightInvitation(state,id==='vampire_offer'?'vampire':'lycanthrope')||id==='stories_allegation'||/^(social_|pastime_|repertoire_)/.test(id)||(id.startsWith('birth_')&&state.timeline?.contentVersion>=7);
  const format=named?text=>String(text??''):text=>personalNames(state,text);
  state.event = observationalCareEvent(state,observationalBirthEvent(state,editionEvent(state,{ id, title:format(title), category, body:format(body), choices:choices.map(c=>({...c,label:format(c.label),description:format(c.description)})) })));
  if(/(?:^|_)letter(?:$|_)/.test(id))receiveNotification(state,{kind:'letter',sourceId:'event-letter:'+id+':'+state.day,title:state.event.title.slice(0,160),body:state.event.body.slice(0,2400)});
  if(state.narrativeEdition===30&&state.timeline?.annualScene&&id==='birth_adult_year'){state.timeline.annualScene.title=state.event.title;state.timeline.annualScene.body=state.event.body;}
};
// Entries written by the current narrative edition are stamped so the edition
// upgrade (narrative-edition.js) leaves their words alone. Only prose from
// older saves lacks the stamp and is rewritten from its recorded facts. The
// few event ids with an authored current-edition rewrite stay unstamped so
// that wording still applies.
const EDITION_REWRITTEN_EVENTS = new Set(['person_died', 'home_displaced', 'households_displaced']);
const addJournal = (state, title, text, tag = 'life', {literal=false,meta={}}={}) => {
  const format=literal?text=>String(text??''):text=>personalNames(state,text);
  const stamp=state.narrativeEdition===30&&!EDITION_REWRITTEN_EVENTS.has(meta?.eventId);
  state.journal.push({ id: `entry-${state.journal.length + 1}`, day: state.day, age: state.age, title:format(title), text:format(text), tag,...meta,...(stamp?{narrativeEdition:30}:{}), ...(state.revision>=5?{generation:state.dynasty?.generation||1}:{}) });
};
const recordPlanGold = (state, before) => {
  if (!state.life?.plan) return;
  const change = state.hero.gold - before;
  if (change > 0) state.life.plan.income += change;
  else if (change < 0) state.life.plan.expenses -= change;
};
const addObligation = (state, id, title, days, description) => {
  if (!state.obligations.some(item => item.id === id && !item.resolved)) {
    state.obligations.push({ id, title, dueDay: state.day + days, description, resolved: false });
  }
};
const finishObligation = (state, id) => {
  for (const item of state.obligations) if (item.id === id && !item.resolved) item.resolved = true;
};
const remember = (state, companionId, text, change = 0) => {
  const person = state.companions.find(item => item.id === companionId);
  if (!person) return;
  person.relationship = clamp(person.relationship + change, -100, 100);
  if (!person.memories.includes(text)) person.memories.push(text);
};
const witnesses = state => state.companions.filter(person => person.recruited && person.active);
function learnCoercion(state, people, reason) {
  for (const person of people) {
    remember(state, person.id, reason, person.id === 'mira' ? -45 : person.id === 'orrin' ? -20 : -15);
    if (person.id === 'mira') { state.flags.miraWithdrawn = true; person.active = false; }
  }
}
function earnExperience(state, amount) {
  state.hero.exp += amount;
  let levels = 0;
  while (state.hero.exp >= state.hero.level * 45) {
    state.hero.exp -= state.hero.level * 45;
    state.hero.level += 1;
    state.hero.maxHp += 4;
    state.hero.maxMp += 2;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 4);
    state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + 2);
    levels++;
  }
  if (levels) addJournal(state, 'Experience becomes confidence', `You reached level ${state.hero.level}. Your health and magical reserves grew.`, 'progress');
}
function currentIncident(state) {
  return (state.legal.incidents || []).find(item => item.locationId === state.locationId);
}
function syncLaw(state) {
  const incident = currentIncident(state);
  state.legal.evidence = incident?.evidence || 0;
  state.legal.wanted = (incident?.evidence || 0) >= 3;
  state.legal.description = incident
    ? `${location(state).name}: ${incident.description}${state.legal.wanted ? ' A local warrant is outstanding.' : ' Officials have an unresolved report.'}`
    : 'No local charges or known evidence.';
}
function addEvidence(state, amount, description) {
  state.legal.incidents ||= [];
  let incident = currentIncident(state);
  if (!incident) {
    incident = { locationId: state.locationId, evidence: 0, description };
    state.legal.incidents.push(incident);
  }
  incident.evidence += amount;
  incident.description = description;
  syncLaw(state);
  if(state.sanctuaries)onEvidence(state,amount,description,engineContext(state));
}
function breakOath(state, reason) {
  if (!(state.hero.specialization === 'paladin'||state.progression?.learnedClassIds?.includes('paladin')&&state.flags.oathType) || state.flags.oathBroken) return;
  state.flags.oathBroken = true;
  standing(state, 'order', -20);
  addJournal(state, 'An oath broken', `${reason} Your learned martial skills remain. Sacred gifts are quiet until you make amends.`, 'oath');
  if (witnesses(state).some(person => person.id === 'mira')) remember(state, 'mira', `You broke your oath: ${reason}`, -12);
}
function spendDays(state, days, { outdoors = false, night, expeditionDayKind = 'inside' } = {}) {
  days=curseTimeBudget(state,days,{outdoors,night:night??state.flags.travelByNight});
  const oldDay = state.day;
  if(days>0&&state.maze)ensureMazeVisit(state);
  const childClock = days > 0 ? captureAdultChildClock(state,{oldDay,newDay:oldDay+days}) : null;
  state.day += days;
  if(days>0&&state.maze)recordMazeDays(state,days,expeditionDayKind);
  state.age = (birthMode(state) ? 0 : 18) + Math.floor((state.day - birthDay(state)) / 365);
  if (birthMode(state) && state.phase !== 'retired') state.phase = state.age >= 18 ? 'adult' : 'childhood';
  for (const person of state.companions) person.age = npcAge(state, {...person,baseAge:person.baseAge??18});
  if (state.life) {
    for (const person of state.life.people) person.age = npcAge(state,person);
    for (const child of state.life.children) child.age = npcAge(state,child);
  }
  if (state.hero.condition?.type === 'lycanthrope') {
    const condition = state.hero.condition;
    let moonDay = Math.max(14, 14 + 28 * Math.ceil((oldDay + 1 - 14) / 28));
    state.flags.pendingMoonDays ||= [];
    while (moonDay <= state.day) {
      if (moonDay > condition.lastFullMoon && !state.flags.pendingMoonDays.includes(moonDay)) state.flags.pendingMoonDays.push(moonDay);
      moonDay += 28;
    }
  }
  onUpbringingTime(state,oldDay,engineContext(state));
  queueRareNightEncounter(state,oldDay,{outdoors,night:night??state.flags.travelByNight});
  onCurseTime(state, oldDay, state.day, {outdoors,night:night ?? state.flags.travelByNight}, engineContext(state));
  if(state.phase==='retired')return days;
  for (const obligation of state.obligations) {
    if (obligation.resolved || state.day <= obligation.dueDay) continue;
    obligation.resolved = true;
    obligation.missed = true;
    if (obligation.id === 'scholarship_service' || obligation.id === 'exam') {
      standing(state, 'academy', -12);
      state.flags.scholarshipMissed = true;
    } else if (obligation.id === 'return_research') {
      standing(state, 'academy', -15);
      state.flags.researchOverdue = true;
    } else if (obligation.id === 'oath_service') {
      standing(state, 'order', -10);
      state.flags.oathServiceMissed = true;
    } else if (obligation.id === 'plague_return') {
      state.flags.plagueDelay = true;
      remember(state, 'mira', 'You arrived late after the village asked for aid.', -6);
    } else if (obligation.id === 'companion_request') {
      remember(state, 'orrin', 'You did not make time for my family when I asked.', -8);
    }
    addJournal(state, 'A promise came due', `The deadline for “${obligation.title}” passed. ${obligation.description} The opportunity remains, but the missed promise is remembered.`, 'obligation');
  }
  if (state.revision >= 5 && days > 0) {
    const ctx = engineContext(state);
    if (state.careers?.preserveLegacyPlan && state.life?.plan) {
      if(state.householdBudget)state.householdBudget.lastDay=state.day;
      state.lineage.lastDay=state.day;
      state.health.lastPhysicalCheckDay=state.day;
      state.health.lastMentalCheckDay=state.day;
      state.health.lastAgeCheckYear=Math.floor(state.day/365);
    } else {
      onCommunityTime(state,{oldDay,newDay:state.day},ctx);
      accrueHouseholdBudget(state,oldDay,state.day);
      onFortuneTime(state,{oldDay,newDay:state.day},ctx);
      onCareerTime(state, days, ctx);
      onLineageTime(state, { oldDay, newDay:state.day, outdoors }, ctx);
      onHealthTime(state, { oldDay, newDay:state.day, outdoors }, ctx);
      if(state.phase==='retired')return days;
      onSocietyTime(state,{oldDay,newDay:state.day},ctx);
      onFellowshipTime(state,{oldDay,newDay:state.day},ctx);
      onSanctuaryTime(state,{oldDay,newDay:state.day},ctx);
      onSocialTime(state,{oldDay,newDay:state.day},ctx);
      onPastimeTime(state,{oldDay,newDay:state.day},ctx);
      const worldClockContext=childClock?{...ctx,onSettlementAvailability:event=>recordAdultChildSiteChange(childClock,event)}:ctx;
      onRegionalTime(state,oldDay,state.day,worldClockContext);onRealmTime(state,oldDay,state.day,worldClockContext);onLivingTime(state,{oldDay,newDay:state.day},ctx);onGuildTime(state,{oldDay,newDay:state.day},ctx);onDelveTime(state,{oldDay,newDay:state.day},ctx);initializeRegionalWorld(state);onRpgTime(state,{oldDay,newDay:state.day},ctx);onJusticeTime(state,days,ctx);onAdventuringTime(state);
      settleAdultChildClock(state,childClock);
      recordLifeAtmosphere(state,oldDay,state.day,(title,text,tag,options)=>addJournal(state,title,text,tag,options));
    }
  }
  return days;
}
function childhoodEvent(state) {
  const family = state.hero.household === 'poor' ? 'Your household counts every copper.'
    : state.hero.household === 'noble' ? 'Your family has money and a name to protect.'
      : 'Your family works a small trade, and neighbors know your door.';
  if (state.flags.childhoodStage === 0) {
    setEvent(state, 'childhood_1', 'The first person you stood beside', 'Childhood · age 7',
      `${family} At the ${state.hero.origin === 'city' ? 'city school gate' : 'village well'}, older children blame Mira for a missing silver charm. You saw the charm fall into the mud. Your choice is small, but someone will remember it.`, [
        choice('defend', 'Speak up for Mira', 'Gain Presence and devotion. Mira remembers your courage and becomes your oldest friend.'),
        choice('investigate', 'Recover the charm quietly', 'Gain Agility and survival. Mira remembers that you looked for the truth.'),
        choice('family', 'Find an adult you trust', 'Gain Willpower and persuasion. You learn that asking for help can protect someone.'),
      ]);
  } else if (state.flags.childhoodStage === 1) {
    setEvent(state, 'childhood_2', 'A door into the wider world', 'Childhood · age 12',
      `${state.hero.origin === 'city' ? 'The academy is close enough to see from your window' : 'A visiting teacher brings academy books to your village'}. ${state.hero.household === 'poor' ? 'Tuition is beyond your family, but a service scholarship is available.' : state.hero.household === 'noble' ? 'Your family offers tuition, if you preserve its reputation.' : 'Your family can help with tuition, or find you a practical apprenticeship.'} What kind of education do you pursue?`, [
        choice('scholarship', 'Earn a service scholarship', 'Gain scholarship and arcana. Begin adulthood with 20 gold and one clinic shift promised within 35 days.'),
        choice('apprentice', 'Learn a useful trade', 'Gain survival and persuasion. Begin with an apprenticeship and 28 extra gold.'),
        choice('martial', 'Study with a retired guard', 'Gain weapons and defense. Your teacher introduces you to the local order.'),
      ]);
  } else {
    setEvent(state, 'childhood_3', 'The book your teacher hid', 'Childhood · age 17',
      'Your teacher discovers a page about speaking with the willing dead tucked inside an ordinary anatomy book. The discipline is disputed, and your teacher wants to know how you found it. Mira waits outside, worried that your education might end here.', [
        choice('confess', 'Explain what you found', 'Gain Willpower and academy trust. Your teacher becomes a contact for lawful study.'),
        choice('question', 'Ask whose voices the ban protects', 'Gain Intellect and scholarship. Your curiosity opens a route to a discreet necromancy mentor.'),
        choice('hide', 'Hide the page before answering', 'Gain stealth and underworld standing. You keep the research, and Mira remembers your secrecy.'),
      ]);
  }
}

export function createGame(config = {}) {
  const seed = String(config.seed || 'a-life-in-eldermere').slice(0, 128);
  const path = PATHS.includes(config.path) ? config.path : 'warrior';
  const origin = config.origin === 'city' ? 'city' : 'village';
  const household = ['poor', 'tradesfolk', 'noble'].includes(config.household) ? config.household : 'tradesfolk';
  const attributes = Object.fromEntries(ATTRIBUTES.map(key => [key, 3]));
  const skills = Object.fromEntries(SKILLS.map(key => [key, 0]));
  if (path === 'warrior') { attributes.strength += 3; attributes.vitality++; skills.weapons = 2; skills.defense = 1; }
  if (path === 'mage') { attributes.intellect += 3; attributes.willpower++; skills.arcana = 2; skills.scholarship = 1; }
  if (path === 'rogue') { attributes.agility += 3; attributes.presence++; skills.stealth = 2; skills.survival = 1; }
  if (household === 'poor') { attributes.vitality++; skills.survival++; }
  if (household === 'tradesfolk') { skills.persuasion++; }
  if (household === 'noble') { attributes.presence++; skills.scholarship++; }
  const maxHp = 44 + attributes.vitality * 3;
  const maxMp = 16 + attributes.intellect * 3;
  const world = generateWorld(seed);
  const appearance = normalizeAppearance(config.appearance);
  const state = {
    version: 1, revision: 2, difficulty: ['gentle', 'balanced', 'perilous'].includes(config.difficulty) ? config.difficulty : 'balanced', seed, phase: 'childhood', day: 0, age: 7,
    hero: {
      name: String(config.name || 'Rowan').trim().slice(0, 40) || 'Rowan', origin, household, path,
      specialization: null, profession: 'Unemployed', appearance,
      temperament: TEMPERAMENTS.includes(config.temperament) ? config.temperament : 'curious',
      belief: BELIEFS.includes(config.belief) ? config.belief : 'lantern',
      pronouns: PRONOUNS.includes(config.pronouns) ? config.pronouns : 'they/them',
      ambition: String(config.ambition || 'Protect the place I call home').slice(0, 160),
      level: 1, exp: 0, hp: maxHp, maxHp, mp: maxMp, maxMp,
      gold: ({ poor: 12, tradesfolk: 42, noble: 85 })[household], attributes, skills, condition: null, potions: 2,
    },
    locationId: origin === 'city' ? 'city' : 'home', world,
    companions: [
      { id: 'mira', name: 'Mira', role: 'warrior', goal: 'Earn a place in the Lantern Order without abandoning old friends.', values: ['Protect the vulnerable', 'Never bind an unwilling soul'], relationship: 12, memories: [], recruited: false, active: false, hp: 58, maxHp: 58, mp: 22, maxMp: 22, agility: 5, baseAge: 18, age: 18 },
      { id: 'orrin', name: 'Orrin', role: 'mage', goal: 'Find a remedy for the fever and keep his family safe.', values: ['Consent matters', 'Knowledge should heal'], relationship: 0, memories: [], recruited: false, active: false, hp: 43, maxHp: 43, mp: 38, maxMp: 38, agility: 4, baseAge: 22, age: 22 },
      { id: 'kest', name: 'Kest', role: 'rogue', goal: 'Make the western road safe enough to visit a missing sibling.', values: ['Keep your word', 'Do not prey on desperate families'], relationship: 0, memories: [], recruited: false, active: false, hp: 48, maxHp: 48, mp: 24, maxMp: 24, agility: 8, baseAge: 19, age: 19 },
    ],
    factions: { villagers: 0, academy: 0, order: 0, underworld: 0 },
    legal: { wanted: false, evidence: 0, description: 'No local charges or known evidence.', incidents: [] },
    flags: { childhoodStage: 0, actionsTaken: 0, education: 0, clinicShifts: 0, training: 0, roadSafe: false, travelByNight: false, plagueStage: 0 },
    obligations: [], event: null, journal: [], battle: null, notice: '', chronicle: null,
  };
  initializeGear(state, { starter: true });
  initializeLife(state, config);
  addJournal(state, 'A life begins', `Born in ${location(state).name}, ${state.hero.name} grows up in a ${household === 'poor' ? 'struggling' : household === 'noble' ? 'noble' : 'working'} household. The regional crisis is ${world.crisis}. Your ambition: ${state.hero.ambition}.`, 'origin');
  childhoodEvent(state);
  return copy(state);
}

function action(id, label, description, days, cost, group, disabledReason) {
  return { id, label, description, days, cost, group, ...(disabledReason ? { disabledReason } : {}) };
}
function getCoreActions(state) {
  if (!state || state.phase !== 'adult' || state.event || state.battle) return [];
  const actions = [];
  const place = location(state);
  if (!place) return [];
  const settled = isSettlement(state.world,state.locationId);
  const canAfford = cost => state.hero.gold < cost ? `Requires ${cost} gold; you have ${state.hero.gold}.` : undefined;
  const vow = state.flags.oathBroken ? ' Your oath is broken; seek atonement at the order.' : '';
  if (settled) {
    const wages = workWages(state);
    actions.push(action('work', `Work as ${state.hero.profession === 'Unemployed' ? 'a day laborer' : state.hero.profession.toLowerCase()}`, `Earn ${wages} gold. Practice your profession and meet local people.`, 3, 0, 'Livelihood'));
    actions.push(action('choose_profession', 'Find an apprenticeship', 'Choose healing, trade, scholarship, herbalism, or soldiering. Civilian life remains open to every combat path.', 2, 0, 'Livelihood'));
    actions.push(action('rest', 'Rest at a welcoming hearth', `Recover all health and magic; companions recover too.${state.hero.condition ? ' Hunger still increases with time.' : ''}`, 2, 4, 'Everyday life', canAfford(4)));
    actions.push(action('study', 'Study with a local teacher', 'Gain scholarship; mages also gain arcana. Three study periods prepare you for an academy examination.', 5, 12, 'Education', canAfford(12)));
    actions.push(action('train', `Train your ${state.hero.path} path`, 'Gain one path skill and experience. No level requirement blocks your specialization.', 3, 6, 'Training', canAfford(6)));
    actions.push(action('pray', 'Tend the shrine', `Gain devotion, restore 8 magic, and improve order standing.${vow}`, 2, 0, 'Training'));
    actions.push(action('socialize', 'Make time for someone', 'An old friend, a healer, or a scout may have a story to share. Your answer becomes a memory.', 2, 3, 'Relationships', canAfford(3)));
    actions.push(action('help_clinic', 'Help at the fever clinic', 'Earn 10 gold and village trust; fulfill a scholarship service promise. The crisis has a personal story.', 3, 0, 'Community'));
    actions.push(action('buy_potion', 'Buy a healing draught', 'Add one party healing potion. Potions heal during turn-based combat.', 0, 10, 'Supplies', state.realm&&!(state.realm.sites[state.locationId]?.merchant?.potions>0)?'The local shop has sold out of draughts until next season.':canAfford(10)));
  }
  actions.push(action('camp_rest', 'Take a quiet recovery day', 'Recover 20 health and 12 magic without spending gold. Living companions recover too.', 2, 0, 'Everyday life'));
  if (state.locationId === (state.hero.birthplaceId || (state.hero.origin === 'city' ? 'city' : 'home'))) {
    actions.push(action('visit_family', 'Visit your family home', 'Your family responds to what they know about the life you have made. Birthplace and family remain part of your life.', 1, 0, 'Relationships'));
  }
  if (state.locationId === 'city' && settled) {
    actions.push(action('take_exam', 'Sit the academy examination', 'After three study periods, prove your learning. Earn a certificate, a teaching contact, and better scholar wages.', 2, 8, 'Education', state.flags.education < 3 ? `Study ${3 - state.flags.education} more period${3 - state.flags.education === 1 ? '' : 's'}.` : state.flags.certified ? 'You already hold the certificate.' : canAfford(8)));
    if (state.revision<5 && !birthMode(state) && !state.hero.specialization && state.hero.path === 'warrior') actions.push(action('seek_order', 'Seek the Lantern Order', 'Earn paladin initiation with weapons 5 and devotion 3. A visible oath creates commitments.', 2, 0, 'Advanced path', state.hero.skills.weapons < 5 || state.hero.skills.devotion < 3 ? 'Requires weapons 5 and devotion 3. Train and tend a shrine.' : undefined));
    if (state.revision<5 && !birthMode(state) && !state.hero.specialization && state.hero.path === 'rogue') actions.push(action('seek_assassin', 'Meet the Veiled Guild', 'Earn assassin initiation with stealth 5 and survival 3. Choose how to handle your first commission.', 2, 0, 'Advanced path', state.hero.skills.stealth < 5 || state.hero.skills.survival < 3 ? 'Requires stealth 5 and survival 3. Train and gather herbs.' : undefined));
    if (state.flags.plagueStage === 1) actions.push(action('consult_academy', 'Ask the academy for a remedy', 'Find out why the ordinary remedy failed. Choose licensed fieldwork or discreet ancestral research.', 2, 0, 'The Ashfall story'));
    if (state.flags.researchBorrowed) actions.push(action('return_research', 'Return the borrowed research', 'Keep your notes and your knowledge. Return the original to settle your academy promise.', 1, 0, 'Obligations'));
    if (state.hero.specialization === 'paladin') actions.push(action('fulfill_oath', state.flags.oathBroken ? 'Seek atonement' : 'Serve your order', state.flags.oathBroken ? 'Make an honest account and complete restorative service. Sacred gifts return; memories remain.' : 'Help a threatened household. Fulfill your order commitment and strengthen local trust.', 4, 0, 'Oath'));
    actions.push(action('lift_purse', 'Risk a crowded-market theft', 'A witnessed failure creates local evidence; an unwitnessed success does not notify distant factions. Earn up to 24 gold.', 1, 0, 'Underworld'));
  }
  if (settled || place.services?.includes('order') && !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false) {
    if (state.hero.specialization === 'paladin' && state.locationId !== 'city') actions.push(action('fulfill_oath', state.flags.oathBroken ? 'Seek atonement through local service' : 'Serve the local order', 'Give an honest account and protect a threatened household. Surviving orders remain available if the city is lost.', 4, 0, 'Oath'));
  }
  if (state.locationId !== 'city' && place.services?.includes('academy') && !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false) {
    actions.push(action('study', 'Study with an alternative academy teacher', 'Gain scholarship and arcana. Learning remains reachable when city services cease.', 5, 12, 'Education', canAfford(12)));
    actions.push(action('take_exam', 'Sit an academy examination here', 'A surviving teacher can recognize three study periods with the same certificate and wage benefit.', 2, 8, 'Education', state.flags.education < 3 ? 'Complete three study periods first.' : state.flags.certified ? 'You already hold the certificate.' : canAfford(8)));
  }
  const fine = (currentIncident(state)?.evidence || 0) * (state.realm?.lawVersion===1?regionAt(state)?.law.theftFinePerEvidence||12:12);
  if (fine) actions.push(action('settle_fine', 'Answer the local charges', `Pay ${fine} gold in restitution through a council representative; clear known evidence here.`, 2, fine, 'Local law', canAfford(fine)));
  if (state.revision<5 && !birthMode(state) && state.hero.path === 'mage' && !state.hero.specialization && ['city', 'ruin'].includes(state.locationId)) {
    actions.push(action('seek_necromancy', 'Seek an ancestral teacher', 'Earn necromancer initiation with arcana 5 and scholarship 3. Willing testimony and soul binding have different consequences.', 2, 0, 'Advanced path', state.hero.skills.arcana < 5 || state.hero.skills.scholarship < 3 ? 'Requires arcana 5 and scholarship 3. Train and study.' : undefined));
  }
  if (['forest', 'home', 'brook'].includes(state.locationId)) {
    actions.push(action('gather_herbs', 'Gather medicinal herbs', 'Gain survival, earn 8 gold, and collect one remedy component. A peaceful way to support the clinic.', 3, 0, 'Livelihood'));
  }
  if (state.locationId === 'forest') actions.push(action('forest_expedition', 'Patrol the western road', 'Face a small turn-based encounter. Victory makes the road safer and strengthens village trust.', 3, 0, 'Adventure', state.hero.hp < 12 ? 'Recover to at least 12 health before an expedition.' : undefined));
  if (state.locationId === 'ruin') actions.push(action('ruin_expedition', 'Explore the buried archive', 'Face a harder turn-based encounter. Victory recovers restricted research and a fever remedy clue.', 4, 0, 'Adventure', state.hero.hp < 20 ? 'Recover to at least 20 health before entering the archive.' : undefined));
  if (state.flags.plagueStage === 2 && state.locationId === 'forest') actions.push(action('find_remedy', 'Find the moonroot remedy', 'Three gathered herb bundles or a successful road patrol support a safe expedition. Cure the fever through fieldwork.', 3, 0, 'The Ashfall story', (state.flags.herbs || 0) < 3 && !state.flags.roadSafe ? 'Gather three herb bundles, or first secure the western road.' : undefined));
  if (state.flags.plagueStage === 2 && state.flags.forbiddenResearch && state.locationId === 'ruin') actions.push(action('ask_ancestor', 'Ask a willing ancestor', 'Use the recovered research to learn where the fever began. No combat level or advanced class is required.', 2, 0, 'The Ashfall story'));
  if (state.nightEncounters?.patronMet && !nightInvitation(state,'vampire') && !state.hero.condition && !state.flags.vampireDeclined && ['city', 'ruin'].includes(state.locationId) && state.day >= 12) actions.push(action('vampire_invitation', 'Answer the twilight invitation', 'A discreet patron offers a changed life. Hear the powers, hunger, daylight costs, and cure route before deciding.', 1, 0, 'Supernatural'));
  if (state.hero.condition?.type === 'vampire') {
    actions.push(action('feed_vampire', 'Arrange a feeding', 'Choose a willing donor, animal blood, or predation. Hunger is visible; consent and witnesses matter.', 1, 0, 'Vampirism'));
    actions.push(action('night_travel', state.flags.travelByNight ? 'Return to daylight travel' : 'Arrange travel after dusk', state.flags.travelByNight ? 'Daytime journeys resume; outdoor actions cost 2 health per day.' : 'Spend one day arranging safe dusk travel. Journeys and outdoor work avoid daylight damage.', 1, 0, 'Vampirism'));
    if (settled) actions.push(action('seek_cure', 'Consult a cure healer', 'A known healer can restore mortal life with two herb bundles and 20 gold. Your learned skills remain.', 3, 20, 'Vampirism', (state.flags.herbs || 0) < 2 ? 'Gather two herb bundles first.' : canAfford(20)));
  }
  if (state.nightEncounters?.rangerMet && !nightInvitation(state,'lycanthrope') && !state.hero.condition && !state.flags.lycanDeclined && ['forest', 'brook'].includes(state.locationId) && state.day >= 6) {
    actions.push(action('lycan_invitation', 'Speak with the moonwise ranger', 'Hear a voluntary moonbound invitation: strength, control, a visible 28-day lunar cycle, safe refuge, and a cure.', 1, 0, 'Supernatural'));
  }
  if (state.hero.condition?.type === 'lycanthrope') {
    const moon = getMoonForecast(state);
    actions.push(action('lycan_prepare', 'Prepare a secluded moon refuge', `Prepare safely for full moon on day ${moon.nextFullMoon}; shelter lasts through that night. Gain at most 1 control once for this moon.`, 2, 0, 'Lycanthropy'));
    actions.push(action('lycan_control', 'Practice moonbound restraint', 'Three days of practice grant at most 2 control. Practice is available once per week; genuine mastery takes repeated safe moons.', 3, 0, 'Lycanthropy',state.hero.condition.lastTrainingDay!==null&&state.day-state.hero.condition.lastTrainingDay<7?'Practice again seven days after the last session.':undefined));
    if (settled) actions.push(action('lycan_cure', 'Seek a moonbound cure', 'A healer can restore mortal life for 25 gold and three herb bundles. Keep all skills, profession, and personal history.', 3, 25, 'Lycanthropy', (state.flags.herbs || 0) < 3 ? 'Gather three herb bundles first.' : canAfford(25)));
    if (state.life?.people.length) actions.push(action('lycan_confide', 'Tell a trusted person about the moon', 'Choose one known confidant. Their knowledge changes through your disclosure, with no automatic official report.', 1, 0, 'Relationships'));
  }
  if (state.flags.plagueStage === 3 && state.locationId === 'home') actions.push(action('deliver_remedy', 'Bring the remedy home', 'Help the village, face questions about the method, and decide who learns the truth.', 2, 0, 'The Ashfall story'));
  if (state.day >= 60 || state.flags.plagueStage >= 4) actions.push(action('retire', 'Close this chapter of your life', 'Choose a peaceful retirement and receive a chronicle of the choices this world remembers.', 0, 0, 'Chronicle'));
  if (state.equipment && !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false) actions.push(...gearActions(state));
  if (state.life && settled) actions.push(...lifeActions(state));
  if (state.hero.condition?.type === 'vampire' && !state.flags.travelByNight) {
    for (const item of actions) if (['gather_herbs', 'forest_expedition', 'ruin_expedition', 'find_remedy'].includes(item.id)) {
      item.description += ` Daylight costs ${item.days * 2} health; arrange dusk travel to avoid it.`;
    }
  }
  return [...actions,...(state.hero.condition?curseActions(state):[])];
}

function unfilteredActions(state) {
  if (!state || waiting(state)) return [];
  if (state.phase === 'retired') return state.revision >= 5 ? lineageActions(state) : [];
  if(tournamentLocked(state))return tournamentActions(state);
  if(yardLocked(state))return yardActions(state);
  if(state.delve)return delveActions(state);
  if(state.maze)return mazeActions(state);
  if (state.justice?.prison) return [...justiceActions(state),...curseActions(state)];
  if(state.rpg?.expedition)return rpgActions(state);
  if (state.adventuring?.expedition) return adventureActions(state);
  if (state.dungeon) return explorationActions(state);
  if(state.cartography?.pending)return [...cartographyActions(state),...(state.hero.condition?.type==='vampire'?[action('feed_vampire','Arrange feeding before continuing','Arrange a meal on this crossing. Consent, supplies and the meal’s own time remain visible in the next decision.',1,0,'Vampirism')]:[])];
  if(state.cartography?.offsite)return [...fieldActions(state),...(!state.hero.condition?curseActions(state):[]),...cartographyActions(state),...adventureActions(state).filter(a=>a.id.startsWith('adventure_roam_')),...(state.hero.condition?.type==='vampire'?[action('feed_vampire','Arrange animal blood on the trail','Spend one day meeting blood hunger without coercion.',1,0,'Vampirism')]:[])];
  const experience=experienceModule(state);
  if(experience)return experienceActions(state).filter(a=>a.id.startsWith(experience+'_'));
  if (state.careers?.batch) return careerActions(state).filter(a=>/career_batch_(continue|cancel|resume|abandon)/.test(a.id));
  if (state.timeline?.journey) return [...(state.revision>=5?travelActions(state):[]), action('grow_continue_journey', state.timeline.journey.energyVersion===1?'Walk the Next Stretch':'Continue the Road Journey', state.timeline.journey.energyVersion===1?'Walk one stretch of the saved route, then stop if you want to camp. Focus determines your pace.':'Resume the saved route after the waiting need is resolved. Only remaining road days are spent.',state.timeline.journey.energyVersion===1?(state.timeline.journey.energyStep?state.timeline.journey.energyStep.totalDays-state.timeline.journey.energyStep.progress:travelEnergyView(state).speed):0,0,'Travel'), ...(state.hero.condition?.type === 'vampire' ? [action('feed_vampire', 'Arrange a feeding along the road', 'Meet the visible hunger need before completing the remaining route. Consent and witnesses still matter.', 1, 0, 'Vampirism')] : [])];
  if (!birthMode(state)) {
    const actions = [...fieldActions(state),...curseActions(state),...cartographyActions(state),...getCoreActions(state),...personalityActions(state),...realmActions(state),...regionalActions(state),...adventureActions(state),...justiceActions(state)];
    if (state.progression && state.phase === 'adult') actions.push(...callingActions(state));
    if (state.conversations) actions.push(...dialogueActions(state));
    if (state.campaign && state.phase === 'adult' && !state.life?.plan) actions.push(...campaignActions(state));
    if (state.age >= 16 && state.phase === 'adult' && state.dungeon === null) actions.push(...explorationActions(state));
    if (state.revision >= 4) actions.push(...researchActions(state),...householdActions(state), ...originActions(state), ...workshopActions(state), ...loreActions(state));
    if (state.revision >= 5) actions.push(...careerActions(state), ...lineageActions(state), ...healthActions(state), ...householdBudgetActions(state),...experienceActions(state),...yardActions(state),...guildActions(state));
    return applyGuildGates(state,[...actions,...questJournalActions(state,campaignView(state).quests),...upbringingActions(state)]);
  }
  const actions = [...fieldActions(state),...curseActions(state),...cartographyActions(state),...getAgeActivities(state),...personalityActions(state), ...dialogueActions(state),...realmActions(state),...regionalActions(state),...adventureActions(state),...justiceActions(state)];
  if (state.age >= 16) {
    const teenAllowed = new Set(['work', 'choose_profession', 'rest', 'camp_rest', 'study', 'pray', 'help_clinic', 'buy_potion', 'gather_herbs', 'forest_expedition', 'ruin_expedition', 'take_exam']);
    const core = getCoreActions({ ...state, phase: 'adult' }).filter(item => state.age >= 18 || teenAllowed.has(item.id) || item.id.startsWith('gear_'));
    for (const item of core) {
      if (item.id === 'train' && state.hero.path === 'unformed') continue;
      if (item.id === 'visit_family' || item.id === 'socialize') continue;
      if (['consult_academy', 'find_remedy', 'ask_ancestor', 'deliver_remedy'].includes(item.id)) continue;
      if (item.id === 'retire' && state.age < 30) continue;
      actions.push(item);
    }
    actions.push(...callingActions(state), ...explorationActions(state));
  }
  actions.push(...campaignActions(state));
  if (state.revision >= 4) actions.push(...researchActions(state),...householdActions(state), ...originActions(state), ...workshopActions(state), ...loreActions(state));
  if (state.revision >= 5) actions.push(...careerActions(state), ...lineageActions(state), ...healthActions(state), ...householdBudgetActions(state),...experienceActions(state),...yardActions(state),...guildActions(state));
  applyGuildGates(state,actions);
  for (const row of actions) if (!/^(tournament_|research_|polity_|atlas_|stories_|recovery_|workshop_|society_|community_|fellowship_|sanctuary_|lineage_adoption_|social_|pastime_)/.test(row.id) && row.days > 0 && state.day + row.days >= nextBirthday(state)) row.disabledReason = 'Your next birthday is due. Choose Age up before starting this activity.';
  return [...actions,...questJournalActions(state,campaignView(state).quests),...upbringingActions(state)];
}

// Observe finite exposed public roles only on authoritative state transitions.
// The roster remains fixed throughout the selected action and its elapsed days.
function settlePublicRoster(state,{migration=false}={}){
 if(state.revision<5||!state.socialLife||!state.realm||!state.cartography)return;
 initializeNpcContinuity(state);
 const sites=state.world.locations.filter(p=>(p.id===state.locationId||state.cartography.sites[p.id]?.kind==='Visited'&&!state.npcContinuity.slots['town:'+p.id+':0'])&&isSettlement(state.world,p.id)&&!['destroyed','evacuated'].includes(p.status)&&p.servicesAvailable!==false);
 const people=sites.flatMap(p=>[...Array.from({length:10},(_,i)=>townNpc(state,p.id,i)),...settlementServices(state,{siteId:p.id}).map(r=>r.person)]);
 capturePendingMentor(state);
 observeNpcContinuity(state,[...people,...classView(state).callings.map(c=>c.mentor)]);
 synchronizeMentorContinuity(state);
 if(!migration)reconcileNpcContinuity(state,engineContext(state));
}

/** World services share the same location rules in the UI and simulation. */
export function getActions(state){
 if(!state||terminalRun(state))return [];
 if(observationalInfancy(state))return [];
 if(countingTableCommitment(state)||tournamentLocked(state)||yardLocked(state))return unfilteredActions(state);
 if(state.delve)return unfilteredActions(state); // below ground there is only the dark and what you can do in it
 const contacts=state?getContacts(state):[];
 const rows=[...new Map([...[...unfilteredActions(state),...(state.adultTournament?.stage==='paused'?tournamentActions(state):[]),...legacyCallingOffers(state),...legacyMentorTrialActions(state)].filter(a=>(!state.trail||!['atlas_rest','camp_rest'].includes(a.id))&&!a.id.startsWith('adventure_roam_')&&a.id!=='atlas_scout'),...campingActions(state),...hospitalityActions(state),...homeRestActions(state),...socialLifeActions(state,contacts),...(experienceModule(state)?[]:daylifeActions(state,contacts))].map(a=>[a.id,a])).values()];
 const owner=experienceModule(state);
 // The canonical producer owns spatial precedence too: an interrupted maze
 // project still uses maze_work_*; custody still uses justice_*.
 const visible=owner?unfilteredActions(state):rows;
 if(state?.worldServicesVersion!==1)return visible;
 const services=settlementServices(state);
 return applyGuildGates(state,visible.map(a=>{if(state.trail&&['health_rest','life_rest'].includes(a.id))a={...a,description:a.description+' Rest also restores '+(a.id==='life_rest'?'all':'up to three quarters of your')+' Focus.'};let reason=serviceAccessReason(state,a.id,services);if(/^(talk_|confide_)/.test(a.id)){const id=a.id.replace(/^(talk_quest_|talk_|confide_)/,''),p=contacts.find(p=>p.id===id);if(p?.roomId&&p.roomId!==(state.cartography?.interior?.roomId||'gate'))reason='Meet this person in their part of the settlement.';}const match=/^life_(visit|gift|court|commit|separate|endcourt|values)_(.+)$/.exec(a.id);if(match){const p=contacts.find(p=>p.id===match[2]);if(!p||p.available===false||p.locationId!==state.locationId||p.roomId&&p.roomId!==(state.cartography?.interior?.roomId||'gate'))reason='Meet this person where they actually are.';else if(state.socialLife&&['court','commit'].includes(match[1]))reason=romanceReason(state,p)||reason;}return reason?{...a,disabledReason:reason}:a;}));
}
export function visitService(original,id){if(terminalRun(original))return copy(original);
 if(observationalInfancy(original))return {...copy(original),notice:infantAgencyReason(original)};
 const s=copy(original);settlePublicRoster(s,{migration:true});const r=settlementServices(s).find(r=>r.id===id&&r.here);
 if(!r||waiting(s)||s.phase==='retired'||s.dungeon||s.timeline?.journey||s.justice?.prison){s.notice='Walk to this person before speaking with them.';return s;}
 const people=s.conversations.servicePeople ||= {};
 if(!Object.hasOwn(people,r.personId)&&Object.keys(people).length>=512){s.notice='Your relationship book is full.';return s;}
 const p=r.person;people[p.id]={id:p.id,name:p.name,role:p.role||r.role,age:p.age||35,baseAge:(p.age||35)-Math.floor(s.day/365),locationId:s.locationId,...(p.serviceEndDay!==undefined?{serviceEndDay:p.serviceEndDay}:{}),...(p.appearance?{appearance:p.appearance}:{}),...(p.pronouns?{pronouns:p.pronouns}:{})};
 const meetings=s.conversations.meetings ||= {},old=meetings[p.id];
 if(old||Object.keys(meetings).length<512)meetings[p.id]={locationId:s.locationId,firstDay:old?.firstDay??s.day,lastDay:s.day};
 s.notice='';return s;
}
export function updateRomanticIdentity(original,{gender,attraction}={}){if(terminalRun(original))return copy(original);const s=copy(original);if(!s.socialLife||s.age<18||s.phase==='retired'||!['man','woman','nonbinary'].includes(gender)||!['any','men','women','none'].includes(attraction)){s.notice='These choices are not available now.';return s;}s.socialLife.gender=gender;s.socialLife.attraction=attraction;s.notice='Your own identity and romantic interests are recorded. Other people keep their own wishes.';return s;}
export const keepPlayerNote = (original,text) => terminalRun(original) ? copy(original) : appendPersonalNote(original,text);
export const editPlayerNote = (original,review,text) => terminalRun(original) ? copy(original) : editPersonalNote(original,review,text);
export const archivePlayerNote = (original,review,archived) => terminalRun(original) ? copy(original) : archivePersonalNote(original,review,archived);
/** Pure reminders never execute a walk, resolve a room or advance the calendar. */
export function updateMazeMapMemory(original,request){if(terminalRun(original))return copy(original);
 const s=copy(original),runtime=mazeMapRuntime(s);
 const result=editMazeMapMemory(s.maze,request,runtime.context,runtime.rules);
 if(!result.ok){s.notice={paused:'Resolve the current moment before changing map reminders.',
  'stale-run':'That reminder belongs to another saved maze.', 'unvisited-room':'Only recorded rooms can be marked.',
  full:'This map has room for 32 reminders. Remove one before adding another.',
  'not-a-stair':'Only an actual discovered return stair can use this mark.',
  'invalid-note':'Keep the map note to 160 characters of plain text.'}[result.reason]||'That map reminder could not be saved.';return s;}
 if(result.mapMemory)s.maze.mapMemory=result.mapMemory;else delete s.maze.mapMemory;
 s.notice=request.mark||request.note.trim()?'Map reminder kept. No time or supplies spent.':'Map reminder removed.';
 return s;
}
function consumableMomentReason(s,id){
 if(terminalRun(s))return 'This Ironman run has ended in combat.';
 if(id==='potions')return fieldPotionMomentReason(s);
 if(!s||s.phase==='retired'||s.hero.hp<=0)return 'There is no living character to treat.';
 if(waiting(s)||s.cartography?.pending||s.timeline?.journey)return 'Finish the current moment first. In battle, use the party potion action.';
 return null;
}
function fieldPotionOptions(s,targetId){
 const moment=consumableMomentReason(s,'potions');if(moment)return {contextReason:moment};
 // Ordinary hero use keeps its existing field/dungeon eligibility. Companions
 // cannot be treated remotely through attended work, custody or other pledges.
 if(targetId!=='hero'){
  if(s.justice?.prison||s.workshop?.project||s.careers?.batch||s.life?.plan||experienceModule(s))return {contextReason:'Finish or cancel your current commitment before treating a companion.'};
  return {mazeRoom:s.maze&&[1,2].includes(s.maze.version)?mazeRoomCell(s.maze):null,legacyDungeonRooms:s.dungeon?.definition?.rooms||DUNGEONS.find(d=>d.id===s.dungeon?.id)?.rooms||[]};
 }
 return {};
}
export function fieldAssistQuote(s,kind,helperId,targetId='hero'){return mazeFieldAssistQuote(s,kind,helperId,targetId);}
export function fieldPotionQuote(s,targetId='hero'){return quoteFieldPotion(s,targetId,fieldPotionOptions(s,targetId));}
export function consumableReason(s,id,targetId='hero'){
 const moment=consumableMomentReason(s,id);if(moment)return moment;
 if(['meals','ale'].includes(id)){if(s.dungeon||s.maze||s.adventuring?.expedition||s.rpg?.expedition)return 'Find a safe place before eating or drinking.';return innSupplyReason(s,id);}
 if(id==='potions')return fieldPotionQuote(s,targetId).disabledReason;
 if(id==='herbs'){if(!(s.flags.herbs>0))return 'You have no medicinal herbs.';if(s.dungeon||s.adventuring?.expedition||s.rpg?.expedition)return 'Find a safe place before preparing herbs.';return null;}
 return 'This item cannot be used that way.';
}
// The same offer used by getActions supplies every displayed cost and effect.
export function herbalCareQuote(s) {
 const offer=getActions(s).find(a=>a.id==='health_herbs'), plan=offer||herbalCareOffer(s);
 const disabledReason=consumableReason(s,'herbs')||offer?.disabledReason||(!offer?'Finish your current commitment before preparing herbal care.':null);
 const physical=s.health?.physical?.length||0;
 return {...plan,disabledReason,effectExplanation:physical
  ? 'This care supports your recorded physical symptoms. Health restoration does not immediately clear illness or injury.'
  : 'You have no recorded physical symptoms. This is preventive supportive care; full Health does not remove that benefit. Existing longer care windows are kept, and values at their limits do not increase.'};
}
export function useConsumable(original,id,targetId='hero'){if(terminalRun(original))return copy(original);
 const s=copy(original),reason=consumableReason(s,id,targetId);if(reason){s.notice=reason;return s;}
 if(['meals','ale'].includes(id)){useInnSupply(s,id,engineContext(s));return s;}
 if(id==='potions'){if(s.maze)ensureMazeVisit(s);const quote=applyFieldPotion(s,targetId,fieldPotionOptions(s,targetId));if(quote.disabledReason){s.notice=quote.disabledReason;return s;}if(s.maze)recordMazeUse(s,'potions',1);s.notice=targetId==='hero'?`You drink a healing potion and recover ${quote.amount} Health.`:`You give ${quote.targetName} a healing potion, restoring ${quote.amount} Health. One potion used.`;addJournal(s,'A Healing Potion',s.notice,'health');s.journal.at(-1).narrativeEdition=30;return s;}
 const offer=healthActions(s).find(a=>a.id==='health_herbs'&&!a.disabledReason);if(!offer){s.notice='You cannot prepare the herbs during this commitment.';return s;}
 return chooseAction(s,'health_herbs');
}

export function createBirthGame(config = {}) {
  const identity=normalizeAppearance(config.appearance),naming=culturalName(config.seed,'new-life:name',{appearance:identity,pronouns:config.pronouns});
  const resolvedConfig = { ...config,name:typeof config.name==='string'&&config.name.trim()?config.name.trim().slice(0,40):naming.name };
  const birthplace = resolveBirthplace(config.birthplace || config.origin || 'village', String(config.seed || 'a-life-in-eldermere'));
  resolvedConfig.origin = birthplace.origin;
  // Station is fate's. A caller that already rolled one (the creator, an
  // heir) passes it; a bare household narrows the ladder; nothing at all
  // rolls the whole ladder by rarity.
  const birthSeed = String(config.seed || 'a-life-in-eldermere').slice(0, 128);
  const station = config.station === null ? null : config.station && validateStation(config.station, { day: 0 }) ? config.station
    : rollBirthCircumstances(birthSeed, rollStation(birthSeed, ['poor', 'tradesfolk', 'noble'].includes(config.household) ? STATIONS.filter(st => st.means === config.household).map(st => st.id) : STATIONS.map(st => st.id)), identity.ancestry);
  if (station) resolvedConfig.household = stationById(station.id).means;
  else if (config.household === 'random') resolvedConfig.household = ['poor', 'tradesfolk', 'noble'][seededRoll(birthSeed, 'household-wealth', 3)];
  const state = createGame(resolvedConfig);
  if (station) state.hero.station = { ...station, ties: station.ties.map(t => ({ ...t })) };
  state.hero.firstDayGuide = { version: 1, dismissed: false };
  state.revision = 5;
  state.worldServicesVersion=1;
  state.narrativeEdition=30;
  if(state.hero.name===naming.name)state.hero.naming=naming;
  state.world = generateWorld(state.seed, { expanded: true });rewriteWorldProse(state);
  state.flags.portraitGeneration = 1;
  state.locationId = birthplace.locationId;
  state.hero.birthplace = birthplace.id;
  state.hero.birthplaceId = birthplace.locationId;
  state.life.home.locationId = birthplace.locationId;
  state.hero.path = 'unformed'; state.hero.specialization = null;
  state.hero.attributes = Object.fromEntries(ATTRIBUTES.map(key => [key, 3]));
  state.hero.skills = Object.fromEntries(SKILLS.map(key => [key, 0]));
  state.hero.maxHp = 53; state.hero.hp = 53; state.hero.maxMp = 25; state.hero.mp = 25;
  state.hero.gold = 0; state.hero.potions = 0;
  state.age = 0; state.day = 0; state.phase = 'childhood'; state.event = null; state.journal = [];
  initializePersonality(state);
  state.equipment = null; initializeGear(state);
  for (const [index, person] of state.companions.entries()) { person.baseAge = index; person.age = index; person.name = generatePersonName(state.seed,`companion-${person.id}`); Object.assign(person,generateCharacter(state.seed,`companion-${person.id}`,{role:person.role,age:person.age,pronouns:({mira:'she/her',orrin:'he/him',kest:'they/them'}[person.id])})); }
  const bases = { kin: 27, fellow: 0, rival: 1, river: 2 };
  for (const person of state.life.people) {
    person.baseAge = bases[person.id]; person.age = person.baseAge;
    person.name = generatePersonName(state.seed, `life-${person.id}`);
    if (person.id === 'river') person.role = 'friend';
    person.locationId = state.locationId;
    if(person.id!=='kin')Object.assign(person,generateCharacter(state.seed,`life-${person.id}`,{role:person.role,age:person.age,disposition:person.disposition}));
  }
  initializeTimeline(state); initializeProgression(state); initializeConversations(state);state.characterDialogueVersion=28;
  initializeCampaign(state); initializeExploration(state,{fresh:true});
  initializeHousehold(state, { config: resolvedConfig }); initializeFamilyOrigins(state); initializeWorkshop(state);
  if (state.family && station) { state.family.support = stationById(station.id).support; state.family.literate = station.literate; }
  initializeSchooling(state);
  initializePreferences(state, { values: config.preferences }); initializeLore(state);
  initializeCareers(state); initializeHealth(state); initializeTravel(state); initializeTravelEnergy(state); initializeMaze(state); initializeSocialLife(state); initializeLineage(state,{startingAge:config.startAge});
  initializeHouseholdBudget(state,{edition:true});initializeFortune(state,{attempt:Number.isInteger(config.attempt)&&config.attempt>0&&config.attempt<=12?config.attempt:0});
  initializeFamilyDepth(state);initializeSociety(state);initializeCommunity(state);initializeFellowship(state);initializeSanctuaries(state);
  initializeSocial(state);initializePastimes(state);initializeLifeStories(state);
  initializeRealm(state,{fresh:true});initializeLivingWorld(state);initializeGuild(state);initializeDelves(state);initializeJustice(state);initializeAdventuring(state);initializeCartography(state);initializeRegionalWorld(state);initializeRpg(state,{fresh:true},engineContext(state));
  initializeQuestJournal(state);initializeUpbringing(state);settlePublicRoster(state,{migration:true});
  addJournal(state, 'A life begins at birth', `${state.hero.name} was born in ${location(state).name}${station ? ` to ${station.rank}` : ''}. The morning brought ${worldCalendarContext(state.world,state.day,state.seed).weather}.`, 'origin',{literal:true,meta:{narrativeEdition:30,capturedReceipt:true}});
  birthEvent(state, engineContext(state), true);
  const omen = { ember: 'Cold ash warmed your blanket although the hearth was dark.', echo: 'An unpulled bell answered your first cry.', thorn: 'A winter seed sprouted beside your cradle, its roots pointing toward the burial ground.' }[state.campaign.fate];
  if(state.timeline.contentVersion<7)state.event.body += ` ${omen}`;
  refreshNarrativeRecords(state);
  return copy(state);
}

export function attendBloodHunger(original){if(terminalRun(original))return copy(original);
  const state=copy(original);
  if(state.phase==='retired'||waiting(state)||state.hero.condition?.type!=='vampire'||state.hero.condition.hunger<75){state.notice='There is no unresolved blood hunger to attend.';return state;}
  delete state.flags.hungerPauseDay;
  setEvent(state,'life_hunger','A need before the next season','Vampirism',`Hunger is ${state.hero.condition.hunger}/100. Attend to it here, or refuse another real night. Your other promises remain; opening this decision spends no time.`,[choice('animal','Arrange animal blood','Take one real day without gold or assault.'),...(state.hero.gold>=8?[choice('donor','Find a willing local donor','Take one day and spend 8 gold.')]:[]),choice('pause','Keep the decision for later','Return to your current situation without spending time or feeding.')]);
  return afterAction(state);
}
/** Live a season: a quarter of a year, stopping only for things that matter.
 * The last season of a year runs to the birthday. New-edition lives only. */
export function liveSeason(original) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if(!state.hero.station||state.age<3)return ageUp(original);
  if(state.cartography?.pending||state.cartography?.offsite){state.notice='Reach a named place before the season can turn. Continue your journey in Explore.';return state;}
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition){state.notice='Complete custody or leave the descent before living on.';return state;}
  if(experienceModule(state)){state.notice='Finish or withdraw from your current commitment before living on.';return state;}
  if (!state.timeline) initializeTimeline(state, { migration: true });
  if(!waiting(state)&&!state.dungeon&&!state.timeline.journey&&!state.workshop?.project&&!state.careers?.batch&&!state.life?.plan)delete state.flags.hungerPauseDay;
  // A season that was paused on its last day turns now, and the next begins.
  if (state.timeline.season && state.timeline.yearTarget !== null && state.timeline.yearTarget <= state.day && !waiting(state)) { delete state.timeline.season; state.timeline.yearTarget = null; }
  if (state.timeline.yearTarget === null) {
    const born=state.timeline.birthDay||0, birthday=born+(Math.floor((state.day-born)/365)+1)*365, target=Math.min(birthday, state.day+92);
    if (waiting(state) || state.dungeon || state.timeline.journey || state.workshop?.project || state.careers?.batch || state.life?.plan) { state.notice='Finish the waiting decision before the season can turn.'; return state; }
    state.timeline.yearStartDay = state.day;
    state.timeline.yearTarget = target;
    if (target < birthday) state.timeline.season = true; else delete state.timeline.season;
  }
  startAgeYear(state, engineContext(state, { annual: true }));
  return afterAction(state);
}
export function ageUp(original) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if(state.cartography?.pending||state.cartography?.offsite){state.notice='Reach a named place before turning the year. Continue your journey in Explore.';return state;}
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition){state.notice='Complete custody or leave the descent before beginning another year.';return state;}
  if(experienceModule(state)){state.notice='Finish or withdraw from your current commitment before beginning another year.';return state;}
  if (!state.timeline) initializeTimeline(state, { migration: true });
  if (!birthMode(state) && state.phase === 'childhood') { state.notice = 'Finish your saved childhood episode before aging up.'; return state; }
  if(!waiting(state)&&!state.dungeon&&!state.timeline.journey&&!state.workshop?.project&&!state.careers?.batch&&!state.life?.plan)delete state.flags.hungerPauseDay;
  startAgeYear(state, engineContext(state, { annual: true }));
  return afterAction(state);
}
export function continueAgeUp(original) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if(state.cartography?.pending||state.cartography?.offsite){state.notice='Reach a named place before turning the year. Continue your journey in Explore.';return state;}
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition){state.notice='Complete custody or leave the descent before resuming the year.';return state;}
  if(experienceModule(state)){state.notice='Continue or withdraw from the committed work before resuming your year.';return state;}
  if (!state.timeline) { state.notice = 'Choose Age up to begin a year.'; return state; }
  if(state.timeline.yearTarget!==null&&!waiting(state)&&!state.dungeon&&!state.workshop?.project&&!state.careers?.batch)delete state.flags.hungerPauseDay;
  continueAgeYear(state, engineContext(state, { annual: true }));
  return afterAction(state);
}
export function updatePreferences(original, values) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if (!state.hero.preferences) initializePreferences(state, { migration: true });
  state.hero.preferences = normalizePreferences(values);
  state.notice = 'Your preferences are updated.';
  return state;
}
export function replyMessage(original, personId, replyId) {if(terminalRun(original))return copy(original);
  if(observationalInfancy(original))return {...copy(original),notice:infantAgencyReason(original)};
  const state = copy(original);
  if (state.event || state.battle || state.dungeon || state.phase === 'retired') { state.notice = 'Finish the current situation before replying.'; return state; }
  if(state.cartography?.offsite||state.cartography?.pending){state.notice='Return to a named place before opening correspondence.';return state;}
  if (!state.conversations) { state.notice = 'There is no waiting conversation.'; return state; }
  const pending=state.conversations.pending;
  const reply=pending?.personId===personId?pending.replies.find(r=>r.id===replyId):null;
  const sequence=state.conversations.sequence;
  replyToConversation(state, personId, replyId, engineContext(state));
  // A cleared stale topic is not a spoken reply.
  if(reply && !['yard_conversation','research_recall','tournament_rival','levy_reaction','levy_household','levy_return'].includes(pending.nodeId) && state.conversations.sequence>=sequence+2)
    applyPersonalityImpact(state,{kind:'dialogue',eventId:pending.nodeId,id:replyId,label:reply.label});
  return afterAction(state);
}

function workWages(state) {
  if (state.revision >= 5) return professionWage(state,3);
  const wages = { Unemployed: 18, Healer: 24, Merchant: 28, Scholar: 23, Herbalist: 23, Soldier: 26 };
  return (wages[state.hero.profession] || 20) + (state.flags.certified && ['Scholar', 'Healer'].includes(state.hero.profession) ? 8 : 0) + (state.factions.villagers >= 25 ? 3 : 0) + (state.life?.career.rank || 0) * 4;
}
function plagueMessage(state) {
  if (birthMode(state) || state.flags.plagueStage || state.flags.actionsTaken < 3 || state.event || state.battle) return;
  state.flags.plagueStage = 1;
  addObligation(state, 'plague_return', 'Answer your hometown’s plea', 30, `Visit the fever clinic or bring a remedy to ${home(state).name}.`);
  setEvent(state, 'plague_letter', 'A letter from home', 'The Ashfall story',
    `Mira brings a letter from ${home(state).name}. Ashfall fever has reached the wellside houses. The official remedy eases the pain but does not stop the illness. “You have learned things we haven’t,” your teacher writes. “Will you come?” There is a clinic at home, and the academy in ${city(state).name} knows the old records.`, [
      choice('promise', 'Promise to help', 'Gain village trust. The promise is due within 30 days; the crisis remains playable if you are late.'),
      choice('questions', 'Ask what has already been tried', 'Gain scholarship. Learn that the old burial ground and a spring upstream may be connected.'),
      choice('later', 'Say you need time', 'You keep your other commitments. Mira remembers your honesty, but the letter remains in your journal.'),
    ]);
}
function companionFollowup(state) {
  if (state.event || state.battle || !state.flags.plagueStage || state.flags.companionRequestSeen || state.day < 25) return;
  const orrin = state.companions.find(person => person.id === 'orrin');
  if (!orrin.recruited) return;
  state.flags.companionRequestSeen = true;
  setEvent(state, 'orrin_request', 'Orrin’s unfinished letter', 'Companion memory',
    'Orrin has begun the same letter four times. His younger sister is working at the fever clinic, and he is afraid she will keep working until she collapses. He asks whether you can make time for one shift together. This is a personal request, not a party loyalty meter.', [
      choice('promise', 'Promise a clinic shift together', 'A visible 16-day obligation appears. Helping at any settlement clinic fulfills it.'),
      choice('honest', 'Explain what you can manage', 'Orrin appreciates an honest answer. No deadline is created.'),
    ]);
}

export function getMoonForecast(state) {
  const currentDay = Number.isInteger(state?.day) ? state.day : 0;
  const condition = state?.hero?.condition?.type === 'lycanthrope' ? state.hero.condition : null;
  const queued = state?.flags?.pendingMoonDays?.find(day => !condition || day > condition.lastFullMoon);
  const next = queued ?? Math.max(14, 14 + 28 * Math.ceil((currentDay + 1 - 14) / 28));
  const prepared = Boolean(condition && sanctuaryMoonPrepared(state,next));
  return {
    cycleDay: currentDay % 28, nextFullMoon: next, daysUntil: Math.max(0, next - currentDay),
    prepared, control: condition?.control || 0,
    description: `Full moon: day ${next}${next <= currentDay ? ' · a choice is waiting' : ` · in ${next - currentDay} days`}.${condition ? ` Control ${condition.control}/100. ${prepared ? 'Your refuge is prepared.' : 'Prepare a refuge or practice restraint before that night.'}` : ' A full moon arrives every 28 days, on cycle day 14.'}`,
  };
}

function pendingDeadline(state) {
  if (!state.life?.plan && !state.timeline?.yearTarget && !state.timeline?.journey && !state.workshop?.project && !state.careers?.batch && !experienceModule(state)) return null;
  const reviewed = state.flags.reviewedObligations || [];
  return state.obligations.filter(item => !item.resolved && item.dueDay <= state.day + 3 && !reviewed.includes(`${item.id}:${item.dueDay}`))
    .sort((first, second) => first.dueDay - second.dueDay)[0] || null;
}
function pendingNeed(state) {
  if (state.hero.condition?.type === 'lycanthrope' && state.flags.pendingMoonDays?.length) return 'lycan_fullmoon';
  if (state.hero.condition?.type === 'vampire' && state.hero.condition.hunger >= 75) return 'vampire';
  if (pendingDeadline(state)) return 'deadline_review';
  return null;
}
function nextInterruptionDay(state, {ignoreNeed=null}={}) {
  const need=pendingNeed(state);
  if (need && need!==ignoreNeed) return state.day;
  const days = [];
  if (birthMode(state)) {
    days.push(nextBirthday(state));
    // A season's end is not a wall: a care session begun on its last day runs past it, and the season turns after.
    if (state.timeline?.yearTarget !== null && state.timeline?.yearTarget !== undefined && !state.timeline.season) days.push(Math.max(state.day, state.timeline.yearTarget));
  }
  if (state.hero.condition?.type === 'lycanthrope') days.push(getMoonForecast(state).nextFullMoon);
  if (state.hero.condition?.type === 'vampire' && ignoreNeed!=='vampire') days.push(state.day + Math.max(1, Math.ceil((75 - state.hero.condition.hunger) / bloodHungerRate(state.hero.condition))));
  if (state.life?.plan || state.timeline?.yearTarget || state.timeline?.journey || state.workshop?.project || state.careers?.batch || state.justice?.prison || state.adventuring?.expedition || experienceModule(state)) {
    const reviewed = state.flags.reviewedObligations || [];
    for (const item of state.obligations) if (!item.resolved && !reviewed.includes(`${item.id}:${item.dueDay}`)) days.push(Math.max(state.day, item.dueDay - 3));
  }
  return days.length ? Math.min(...days) : null;
}
function engineContext(state, { annual = false, resolvingNeed=null } = {}) {
  return {
    contacts:()=>getContacts(state),
    beginCourtship:id=>applyLifeAction(state,'life_court_'+id,engineContext(state)),
    registerWorldPerson:p=>{initializeFamilyDepth(state);registerWorldLifeRecord(state,p);},
    spendDays: (days, options = {}) => {
      const interruption = annual ? nextInterruptionDay(state,{ignoreNeed:resolvingNeed}) : null;
      const actual = interruption === null ? days : Math.min(days, Math.max(0, interruption - state.day));
      const result = spendDays(state, actual, options);
      if (annual && actual > 0) state.flags.actionsTaken++;
      return result;
    },
    earnExperience: amount => earnExperience(state, amount),
    journal: (title, text, tag, meta={}) => addJournal(state, title, text, tag,{meta}),
    journalLiteral: (title, text, tag,meta={}) => {addJournal(state,title,text,tag,{literal:true,meta:{...(state.narrativeEdition===30?{narrativeEdition:30,capturedReceipt:true}:{}),...meta}});return state.journal.at(-1);},
    validateMazeNarrative: m => state.maze===m&&m?.version===2&&validateMazes(state),
    standing: (faction, amount) => standing(state, faction, amount),
    remember: (id, text, amount) => remember(state, id, text, amount),
    addObligation: (id, title, days, description) => addObligation(state, id, title, days, description),
    finishObligation: id => finishObligation(state, id),
    addEvidence: (amount, description) => addEvidence(state, amount, description),
    imprison: () => imprison(state,engineContext(state)),
    breakOath: reason => breakOath(state, reason),
    witnesses: () => witnesses(state),
    setEvent: (id, title, category, body, choices) => setEvent(state, id, title, category, body, choices),
    setResearchEvent: snapshot => { if (preserveResearchEvent(state,snapshot)) state.event=editionEvent(state,copy(snapshot)); },
    afterAction: () => { reconcile(state); },
    nextInterruptionDay: () => nextInterruptionDay(state),
    pendingNeed: () => pendingNeed(state),
    endLife: cause => endLife(state,cause),
    killPerson: (id,cause,day=state.day,wording=null) => killNamedPerson(state,id,cause,engineContext(state),day,wording),
    awardLegacySpecialization: classId=>{if(state.progression.learnedClassIds.includes(classId))return false;awardSpecialization(state,classId);return state.hero.specialization===classId&&state.progression.learnedClassIds.includes(classId);},
    resumeLegacyTrial: classId=>trialEvent(state,classId),
    createSuccessor: childId => createSuccessor(state,childId,createBirthGame),
    householdCostPreview: days => householdCostPreview(state,days),
    annualIncome: (days,beforeDay) => {
      if (state.age < 18 || state.phase === 'retired') return;
      if (state.revision < 5) {
        const rate=state.hero.profession==='Unemployed'?.25:.55+(state.life.career.rank||0)*.1;
        state.hero.gold+=Math.max(0,Math.floor((state.day-state.timeline.yearStartDay)*rate)-Math.floor((beforeDay-state.timeline.yearStartDay)*rate));
        state.life.career.experience+=state.hero.profession==='Unemployed'?0:Math.floor(days/10);
      } else {
        // Waiting for the year to turn earns less than working it: the passive
        // wage is 60% of the profession's figure, so shifts matter.
        const bonded=(state.householdBudget?.bondedUntil||0)>beforeDay;
        // Rents and allowances come whether or not the heir works; a bond takes the wage, not the rents.
        const wage=(bonded?0:professionAnnualWage(state)*(state.householdBudget?annualWorkRatio(state)*(state.householdBudget.debt===undefined?1:PASSIVE_WAGE_FACTOR):1)*fortuneIncomeFactor(state,beforeDay))+stationIncome(state);
        const income=Math.max(0,Math.floor(state.day*wage/365)-Math.floor(beforeDay*wage/365));
        state.hero.gold+=income;
        state.life.career.experience+=state.hero.profession==='Unemployed'?0:Math.floor(days/10);
        const workDays=state.householdBudget?Math.max(0,Math.floor(state.day*wage/professionWage(state,3)*3/365)-Math.floor(beforeDay*wage/professionWage(state,3)*3/365)):days;
        recordCareerWork(state,{days:workDays,source:'year',paid:true,gold:income},engineContext(state));
        applyAnnualFocus(state,days,engineContext(state));
        settleHouseholdBudget(state,engineContext(state));
      }
    },
    householdContext: () => state.family ? householdContext(state) : null,
    registerCompanion:id=>registerCompanionRecord(state,id),
    endLife: cause=>endLife(state,cause),
    offerCurse: type=>type==='vampire'?vampireEvent(state):lycanOffer(state),
    startBattle: (id, context) => beginBattle(state, id, context),
    startDungeon: (id, questId) => state.delves&&!state.flags.dungeonRecords?.[id]?enterDelve(state,id,questId,engineContext(state,{annual:true})):state.mazeBook&&!state.flags.dungeonRecords?.[id]?enterMaze(state,id,questId,engineContext(state,{annual:true})):enterDungeon(state,id,questId,engineContext(state)),
    touchCampaign: () => { if (state.campaign && !waiting(state)) onCampaignAge(state, engineContext(state)); },
    onBirthday: () => {
      if (state.family && state.education) onHouseholdAge(state, engineContext(state));
      onSchoolingBirthday(state, engineContext(state)); onSchoolingYear(state, engineContext(state));
      chargeDebtInterest(state, engineContext(state));
      const bloodPlan=state.hero.condition?.feedingPlan;
  if(bloodPlan&&state.hero.condition.hunger>=65&&!waiting(state)&&!state.justice?.prison&&!state.sanctuaries?.commitment){const id='sanctuary_feed_'+bloodPlan.agreementId,offer=sanctuaryActions(state).find(a=>a.id===id);if(offer&&!offer.disabledReason&&((nextInterruptionDay(state,{ignoreNeed:'vampire'})??state.day+2)>state.day)){applySanctuaryAction(state,id,engineContext(state,{annual:true,resolvingNeed:'vampire'}));if(state.phase==='retired')return copy(state);}else if(!offer||offer.disabledReason){state.hero.condition.feedingPlan=null;addJournal(state,'A standing agreement interrupted',offer?.disabledReason||'The agreed donor is no longer available. No fee or feeding was taken.','condition');}}
  if (state.workshop) refreshWorkshop(state, engineContext(state));
      if (state.conversations) onConversationAge(state, engineContext(state));
      if (state.campaign && !waiting(state) && !state.life?.plan) onCampaignAge(state, engineContext(state));
      // The lender comes last, so his knock never swallows the year's other
      // business: a birthday the campaign owes you still arrives.
      if (!waiting(state)) debtReckoning(state, engineContext(state));
    },
  };
}
function annualDeadlineEvent(state) {
  if (state.phase !== 'adult' && !birthMode(state)) return;
  const obligation = pendingDeadline(state);
  if (!obligation) return;
  state.flags.activeDeadlineToken = `${obligation.id}:${obligation.dueDay}`;
  setEvent(state, 'annual_deadline_review', 'A promise before the next season', 'Annual plan · obligation',
    `“${obligation.title}” is due on day ${obligation.dueDay}, in ${Math.max(0, obligation.dueDay - state.day)} days. ${obligation.description} Your annual plan has stopped before spending further time. You can take day-based activities to keep the promise, or knowingly accept the stated consequences of missing it.`, [
      choice('pause', 'Make time for the promise', 'Pause here and return to ordinary activities. Continue the planned year when you are ready.'),
      choice('continue', 'Accept the risk and keep the larger plan', 'Acknowledge this deadline once. It can be missed with its stated consequences; the plan still waits for your next Continue.'),
    ]);
}
function lycanOffer(state) {
  const remembered=nightInvitation(state,'lycanthrope');
  setEvent(state, 'lycan_offer', 'A wild life, with a calendar', 'Lycanthropy',
    `${remembered?remembered.personName+' returns to the invitation you remember. ':''}A moonwise ranger offers a voluntary initiation into lycanthropy. Your profession and education will remain. You gain a feral combat ability, but every 28 days the full moon asks how you prepared. The next full moon is day ${getMoonForecast(state).nextFullMoon}. A secluded refuge is free to prepare, control can be practiced, and a healer can cure you for 25 gold and three herb bundles. Lycanthropy and vampirism cannot coexist. Losing control follows visible choices; no official learns your secret without evidence or disclosure.`, [
      choice('accept', 'Accept the moonbound life', 'Begin the moon curse with control 12. The beast is untrained; prepare a refuge before the next full moon.'),
      choice('decline', 'Keep my mortal life', 'Decline this invitation for the rest of this life. You keep all skills and relationships.'),
      choice('later', 'Ask for time to consider it', 'Leave the invitation available. You remain as you are.'),
    ]);
}
function moonEvent(state) {
  if (state.phase !== 'adult' || state.hero.condition?.type !== 'lycanthrope') return;
  const condition = state.hero.condition;
  state.flags.pendingMoonDays = (state.flags.pendingMoonDays || []).filter(day => day > condition.lastFullMoon);
  const moonDay = state.flags.pendingMoonDays[0];
  if (moonDay === undefined) return;
  state.flags.activeMoonDay = moonDay;
  const prepared = sanctuaryMoonPrepared(state,moonDay);
  const watcher = prepared ? sanctuaryHouseholdPlan(state) : null;
  setEvent(state, 'lycan_fullmoon', 'The night you could see coming', 'Full moon · transformation',
    `The full moon on day ${moonDay} brings the change. Your control is ${condition.control}/100. ${prepared ? watcher?.contactName ? `${watcher.contactName} is present for the moon-watch you prepared together. Your agreed refuge offers a safe, private night.` : 'Your secluded refuge is ready. The preparation offers a safe, private night.' : 'You have not prepared an available refuge here. You can still isolate yourself safely at a small physical cost, or take the stated risks.'} Companions present can remember what they witness; hidden preparation does not send a report to officials.`, [
      ...(prepared ? [choice('safe', 'Use the refuge I prepared', 'A safe private transformation. Gain up to 2 control and earn mastery through a real safe moon; no injury or official evidence.')] : []),
      choice('isolate', 'Keep away from other people tonight', 'Lose 6 health and gain up to 1 control. A body without enough health can die. No outsider is endangered and no report appears.'),
      choice('resist', 'Rely on practiced restraint', condition.control >= 85&&condition.mastery>=30 ? 'Long-earned mastery holds, at a cost of 2 health.' : `Your current control gives a ${condition.control}% chance to hold. A failure costs 14 health and can kill a weak body; present companions know you struggled.`),
      choice('roam', 'Run freely through the night', 'The untamed beast follows living voices in a settlement. Named people can die, hunters can discover you, and silver wounds can kill. Wilderness avoids outsiders but still costs 4 health.'),
    ]);
}

/** Reconcile the state in place after an action: derived records, pauses, notices. */
function reconcile(state) {
  if (terminalRun(state)) return state;
  refreshNarrativeRecords(state);
  respectPersonalBoundaries(state);
  initializeQuestJournal(state);
  initializeUpbringing(state);
  syncCartography(state);learnRegion(state);learnQuestDirections(state);
  settlePublicRoster(state);reconcileTournament(state);
  for(const r of Object.values(state.realm?.politics?.regions||{}))if(r.capitalId&&!state.cartography.sites[r.capitalId])markSiteKnowledge(state,r.capitalId,'Rumored','A regional capital printed on your atlas');
  for(const q of regionalQuestRows(state))if(q.locationId&&!state.cartography.sites[q.locationId])markSiteKnowledge(state,q.locationId,'Rumored','Your accepted regional quest');
  if (state.phase === 'retired') return state;
  const bloodPlan=state.hero.condition?.feedingPlan;
  if(bloodPlan&&state.hero.condition.hunger>=65&&!waiting(state)&&!state.justice?.prison&&!state.sanctuaries?.commitment){const id='sanctuary_feed_'+bloodPlan.agreementId,offer=sanctuaryActions(state).find(a=>a.id===id);if(offer&&!offer.disabledReason&&((nextInterruptionDay(state,{ignoreNeed:'vampire'})??state.day+2)>state.day)){applySanctuaryAction(state,id,engineContext(state,{annual:true,resolvingNeed:'vampire'}));if(state.phase==='retired')return copy(state);}else if(!offer||offer.disabledReason){state.hero.condition.feedingPlan=null;addJournal(state,'A standing agreement interrupted',offer?.disabledReason||'The agreed donor is no longer available. No fee or feeding was taken.','condition');}}
  if (state.workshop) refreshWorkshop(state, engineContext(state));
  syncLaw(state);refreshAdventureBoard(state);
  if (!state.event && !state.battle) flushCurseEvent(state,engineContext(state));
  if (!state.event && !state.battle) moonEvent(state);
  if (!state.event && !state.battle) annualDeadlineEvent(state);
  if (!waiting(state) && birthMode(state) && state.age > 0 && (state.day-birthDay(state)) % 365 === 0 && !state.timeline.yearHistory.some(y => y.id === birthdayId(state))) { state.timeline.yearStartDay=Math.max(state.timeline.yearStartDay,state.day-365);state.timeline.yearTarget = state.day; birthEvent(state, engineContext(state)); }
  if (!state.event && !state.battle) plagueMessage(state);
  if (!state.event && !state.battle) companionFollowup(state);
  if (!waiting(state) && (state.timeline?.yearTarget || state.timeline?.journey || state.maze || state.delve || state.dungeon || state.workshop?.project || state.careers?.batch || state.justice?.prison || state.adventuring?.expedition || experienceModule(state)) && state.flags.hungerPauseDay !== state.day && state.hero.condition?.type === 'vampire' && state.hero.condition.hunger >= 75) {
    setEvent(state, 'life_hunger', 'A need before the next season', 'Vampirism', 'Your year stops at blood hunger 75 or above. Feed without coercion, or suspend the year and make other arrangements.', [choice('animal', 'Arrange animal blood', 'Take one day and reduce hunger by 45, without gold or official evidence.'), ...(state.hero.gold >= 8 ? [choice('donor', 'Find a willing donor', 'Take one day, spend 8 gold and reduce hunger by 65.')] : []), choice('pause', 'Make my own arrangements', 'Pause the year and return to day-based activities.')]);
  }
  if (state.revision >= 5 && !waiting(state)) {
    const ctx=engineContext(state);
    flushPersonalAllegation(state,ctx);
    if(!waiting(state))flushJustice(state,ctx);
    if(!waiting(state))flushTravelEvent(state,ctx);
    if (!waiting(state)) flushHealthEvent(state,ctx);
    if (!waiting(state)) flushWinterEvent(state,ctx);
    if (!waiting(state)) flushSchoolingEvent(state,ctx);
    if (!waiting(state)) flushLivingEvent(state,ctx);
    if (!waiting(state)) flushGuildEvent(state,ctx);
    if (!waiting(state)) flushDelveEvent(state,ctx);
    if (!waiting(state)) flushLineageEvent(state,ctx);
    if (!waiting(state)&&!state.justice?.prison) flushSanctuaryEvent(state,ctx);
    if (!waiting(state)) flushFellowshipEvent(state,ctx);
    if (!waiting(state)) flushCommunityEvent(state,ctx);
    if (!waiting(state)) flushSocietyEvent(state,ctx);
    if (!waiting(state)) flushCareerEvent(state,ctx);
    if (!waiting(state)&&!experienceModule(state)) flushSocialEvent(state,ctx);
    if (!waiting(state)&&!experienceModule(state)) flushPastimeEvent(state,ctx);
  }
  // A late flush can create custody, or a birthday can claim the calendar,
  // after the first reconciliation. Pause only this card before returning;
  // never reorder or answer the interruption, repeat attendance, or pay a prize.
  reconcileTournament(state);
  if(state.event?.id.startsWith('birth_'))state.notice=observationalInfancy(state)?'Continue watching your early years when you are ready.':'Make your birthday choice before the year can continue.';
  refreshNarrativeRecords(state);
  return state;
}
/** Public-command tail: reconcile, then return a detached copy. */
function afterAction(state) { return copy(reconcile(state)); }


// Apply nature only to a committed choice, never a failed or disabled command.
function committedChange(before,after){return JSON.stringify({...before,notice:''})!==JSON.stringify({...after,notice:''});}
export function completeTrade(original,quote){if(terminalRun(original))return copy(original);if(quote?.vendor!=='inn'&&!getActions(original).some(a=>quote?.vendor==='materials'?a.id.startsWith('career_buy_'):/^gear_buy_|^realm_(potion|ration|sellgear_|sellloot_)/.test(a.id)))return {...copy(original),notice:'Finish your current commitment before trading.'};if(quote?.vendor==='materials'){const credit=Number.isSafeInteger(quote.sellTotal)&&quote.sellTotal>0?quote.sellTotal:0,offers=getActions({...original,hero:{...original.hero,gold:original.hero.gold+credit}});if(!Array.isArray(quote.buy)||quote.buy.some(row=>typeof row?.id!=='string'||!row.id.startsWith('material:')||!offers.some(a=>a.id==='career_buy_'+row.id.slice('material:'.length)&&!a.disabledReason)))return {...copy(original),notice:'The materials collection is no longer available. No goods or coins changed hands.'};}const state=copy(original),before=state.hero.gold;if(!applyTrade(state,quote,engineContext(state)))return {...copy(original),notice:'The offer has changed or cannot be completed. No goods or coins changed hands.'};recordPlanGold(state,before);if(quote.vendor==='materials'&&quote.days)spendDays(state,quote.days);return afterAction(state);}
export function chooseAction(original,id){if(terminalRun(original))return copy(original);const next=performAction(original,id);if(terminalRun(next))return next;recordFirstMissionArrival(next,original.locationId);if(next.trail&&next.day>original.day&&['health_rest','life_rest'].includes(id)&&next.phase!=='retired')next.hero.mp=Math.min(next.hero.maxMp,next.hero.mp+Math.ceil(next.hero.maxMp*(id==='life_rest'?1:.75)));if(next.day>original.day&&next.hero.mp>original.hero.mp&&/^(rest$|life_rest$|health_rest$|pastime_relax$)/.test(id))noteTravelRest(next);if(personalityImpact(original,{kind:'action',id}).impacts.length&&next.hero.personality&&committedChange(original,next))applyPersonalityImpact(next,{kind:'action',id});if(!researchTransition(original,next)&&!countingTableTransition(original,next)&&!originTransition(original,next)&&!flavoredCompletion(original,next)&&!/^(tournament_|repertoire_|yard_|leisure_|misdeed_|rpg_intrigue_|rpg_objective_)/.test(id)&&!['intrigue','faction-objective'].includes(original.rpg?.project?.kind)&&original.narrativeEdition===30&&next.phase!=='retired'&&committedChange(original,next)&&!id.startsWith('atlas_room_')&&!id.startsWith('talk_')){
 const newEntries=next.journal.filter(r=>!original.journal.some(p=>p.id===r.id));
 if(newEntries.length){const a=getActions(original).find(a=>a.id===id),parts=[],days=next.day-original.day,gold=next.hero.gold-original.hero.gold,hp=next.hero.hp-original.hero.hp;
 if(days)parts.push(`${days} day${days===1?'':'s'} passed`);if(gold)parts.push(`${gold>0?'+':''}${gold} Gold`);if(hp)parts.push(`${hp>0?'+':''}${hp} Health`);
 let result=a?`${a.label.replace(/\.$/,'')}.`:'You continue your day.';
 const p=original.stories?.project;if(p&&!next.stories?.project&&next.stories.arcs.find(a=>a.id===p.arcId)?.chapter>original.stories.arcs.find(a=>a.id===p.arcId)?.chapter){const choice=p.rowSnapshot?.[['care','enterprise','coercion'].indexOf(p.choice)+1];if(choice)result=next.stories.history.findLast(h=>h.arcId===p.arcId&&h.day===next.day)?.text||groundedOutcome(original,{eventId:'stories_chapter',choice:{...choice,id:p.choice},personName:original.stories.arcs.find(a=>a.id===p.arcId)?.personName});}
 result+=(parts.length?' '+parts.join(' · ')+'.':'');const kind=id.split('_')[0],tag={career:'career',school:'education',health:'health',stories:'personal',quest:'quest',pastime:'life',travel:'travel',rpg:'rpg',lineage:'family'}[kind],record=tag?newEntries.findLast(r=>r.tag===tag&&!r.eventId):null;if(record&&!record.capturedReceipt){record.text=result;record.narrativeEdition=30;if(!next.event&&!next.battle)next.notice=result;}
 }
 }
 if(id==='health_herbs'){
  const receipt=herbalCareReceipt(original,next);
  if(receipt){
   const record=next.journal.findLast(r=>r.tag==='health'&&!original.journal.some(o=>o.id===r.id)&&!r.eventId);
   if(record){record.text=receipt;record.narrativeEdition=30;}
   const history=next.health?.history.findLast(r=>!original.health?.history.some(o=>o.id===r.id)&&r.title==='A body and a life worth caring for');
   if(history)history.text=receipt;
   next.notice=receipt+((next.event||next.battle)&&next.notice?' '+next.notice:'');
  }
 }
 if(id==='fun_pairs_finish'&&original.socialLife?.game?.matched.length===12&&!next.socialLife?.game&&next.day>original.day){
  const delta=(a,b)=>`${b-a>=0?'+':''}${b-a}`;
  const receipt=`${next.hero.name} finished Runestone Pairs. ${next.day-original.day} day passed; no entry fee. Actual session changes: ${delta(original.life.happiness,next.life.happiness)} Joy · ${delta(original.life.stress,next.life.stress)} Stress · ${delta(original.hero.gold,next.hero.gold)} Gold (including daily living costs). Play again on a later day.`;
  const record=next.journal.findLast(r=>r.title==='Runestone Pairs'&&!original.journal.some(o=>o.id===r.id));if(record){record.text=receipt;record.narrativeEdition=30;}
  next.notice=receipt+((next.event||next.battle)&&next.notice?' '+next.notice:'');
 }
 return next;}
export function chooseEventOption(original,id){if(terminalRun(original))return copy(original);if(observationalInfancy(original))return performEventOption(original,id);const next=performEventOption(original,id);if(terminalRun(next))return next;if(next.phase!=='retired'&&original.event&&personalityImpact(original,{kind:'choice',eventId:original.event.id,id,intentTags:original.event.choices.find(c=>c.id===id)?.intentTags}).impacts.length&&committedChange(original,next))applyPersonalityImpact(next,{kind:'choice',eventId:original.event.id,id,intentTags:original.event.choices.find(c=>c.id===id)?.intentTags});if(!researchTransition(original,next)&&!countingTableTransition(original,next)&&!originTransition(original,next)&&!flavoredCompletion(original,next)&&!original.event?.id.startsWith('tournament_')&&!original.event?.id.startsWith('yard_')&&!original.event?.id.startsWith('repertoire_')&&!['country_danger','rpg_intrigue','health_concern','life_values','curse_rare_meeting','vampire_offer','lycan_offer','quest_followup'].includes(original.event?.id)&&!(original.event?.id==='rpg_faction'&&(original.rpg?.pending?.firstOffer||original.rpg?.pending?.objectiveDecision))&&original.narrativeEdition===30&&next.phase!=='retired'&&original.event&&committedChange(original,next)&&!(next.event?.id===original.event.id&&next.event?.body===original.event.body)){
 const c=original.event.choices.find(c=>c.id===id);
 if(c){const commitment=getLifeCommitment(next),completedStory=original.event.id==='stories_chapter'&&next.stories?.history.findLast(h=>!original.stories.history.some(old=>old.id===h.id)),result=commitment&&commitment.remainingDays>0?`You begin the activity. ${commitment.remainingDays} days remain.`:completedStory?.text||groundedOutcome(original,{eventId:original.event.id,choice:c}),changes=[];const gold=next.hero.gold-original.hero.gold,hp=next.hero.hp-original.hero.hp;
 if(gold)changes.push(`${gold>0?'+':''}${gold} Gold`);if(hp)changes.push(`${hp>0?'+':''}${hp} Health`);
 next.notice=result+(changes.length?' '+changes.join(' · ')+'.':'');
 const kind=original.event.id.split('_')[0],tags={birth:['childhood','birthday'],childhood:['childhood'],health:['health'],quest:['quest'],stories:['personal'],career:['career'],school:['education'],family:['family'],lineage:['family'],travel:['travel'],pastime:['life'],rpg:['rpg'] }[kind]||[],record=next.journal.findLast(r=>tags.includes(r.tag)&&!r.eventId&&!original.journal.some(o=>o.id===r.id));if(record){record.title=original.event.title;record.text=next.notice;record.narrativeEdition=30;}
 }
 }return next;}
export function choosePersonalityTrait(original,id){if(terminalRun(original))return copy(original);const state=copy(original),reason=personalitySelectionReason(state,id);if(reason){state.notice=reason;return state;}const ids=[...(state.hero.personality?.traits||[]),id];applyPersonalityBuild(state,ids);addJournal(state,'A nature taking shape',`Your ${id} nature becomes part of your choices and abilities.`,'personality');state.notice='Your personality and its ability gains are recorded.';return state;}
export function chooseBattleAction(original,id,target){if(terminalRun(original))return copy(original);const state=copy(original),before=state.battle;if(!before)return state;const actor=before.actors.find(a=>a.id===before.currentActorId),offer=getBattleActions(before).find(a=>a.id===id);state.battle=takeBattleAction(before,id,target);if(!applyIronmanBattleMortality(state))return {...copy(original),notice:'The captured combat mortality does not match this run. No command was accepted.'};if(terminalRun(state))return state;const withoutLog=b=>({...b,log:[]});if(actor?.id==='hero'&&offer&&!offer.disabledReason&&JSON.stringify(withoutLog(before))!==JSON.stringify(withoutLog(state.battle)))applyPersonalityImpact(state,{kind:'battle',id,specialization:state.hero.specialization});return state;}

function performAction(original, id) {
  const state = copy(original);
  if(observationalInfancy(state)){state.notice=infantAgencyReason(state);return state;}
  if (typeof id === 'string' && id.startsWith('lineage_continue_')) return continueAsChild(original,id.slice('lineage_continue_'.length));
  if (id === 'grow_continue_journey') return continueJourney(original);
  const selected = getActions(state).find(item => item.id === id);
  if (!selected || selected.disabledReason) {
    state.notice = selected?.disabledReason || 'That activity is not available here right now.';
    return state;
  }
  state.notice = '';
  if(isDelveEntry(state,id)){const why=delveEntryReason(state,id);if(why)return {...copy(original),notice:why};if(!enterDelve(state,id,null,engineContext(state,{annual:true})))return {...copy(original),notice:'The door does not open to you today.'};return afterAction(state);}
  const newMaze=isMazeEntry(state,id);
  if(newMaze){if(!enterMaze(state,id,null,engineContext(state,{annual:true})))return {...copy(original),notice:'This descent cannot begin yet.'};return afterAction(state);}
  const experienceHandlers=[['tournament_',applyTournamentAction],['repertoire_',applyRepertoireAction],['research_',applyResearchAction],['origin_',applyOriginAction],['legacycalling_',applyLegacyMentorTrialAction],['yard_',applyYardAction],['home_',applyHomeRest],['inn_',applyHospitalityAction],['leisure_',applyDaylifeAction],['misdeed_',applyDaylifeAction],['polity_',applyRegionalAction],['people_',applySocialLifeAction],['fun_',applySocialLifeAction],['maze_',applyMazeAction],['delve_',applyDelveAction],['trail_',applyCampingAction],['conversations_',applyRelationshipAction],['rpg_',applyRpgAction],['way_',applyFieldAction],['curse_',applyCurseAction],['atlas_',applyCartographyAction],['nature_',applyPersonalityAction],['realm_',applyRealmAction],['justice_',applyJusticeAction],['adventure_',applyAdventureAction],['stories_',applyStoryAction],['recovery_',applyRecoveryAction],['society_',applySocietyAction],['community_',applyCommunityAction],['fellowship_',applyFellowshipAction],['sanctuary_',applySanctuaryAction],['lineage_adoption_',applyLineageAction],['social_',applySocialAction],['pastime_',applyPastimeAction]];
  for(const [prefix,handler] of experienceHandlers)if(id.startsWith(prefix)) {
    const before=state.hero.gold,actionStartDay=state.day,ctx=engineContext(state,{annual:true,resolvingNeed:id.startsWith('curse_')?'vampire':sanctuaryNeedsBypass(state,id)});
    if(!handler(state,id,ctx,getContacts(state)))return {...copy(original),notice:'This commitment could not proceed; no time or resources were spent.'};
    if(terminalRun(state))return copy(state);
    if(ctx.completedActionId)applyPreferenceActivity(state,ctx.completedActionId,ctx);
    // Only an action that spent time can collect a bill; opening a page,
    // walking a room or reviewing an offer never does.
    if(state.day>actionStartDay)settleHouseholdBudget(state,ctx);
    recordPlanGold(state,before);
    return afterAction(state);
  }
  state.hero.gold -= selected.cost;
  if (state.life?.plan) state.life.plan.expenses += selected.cost;
  const goldAfterFee = state.hero.gold;
  if (id.startsWith('career_batch_') || id === 'career_masterwork') {
    const ctx=engineContext(state,{annual:true});
    if (!applyCareerAction(state,id,ctx)) return {...copy(original),notice:'The work could not begin; no time or resources were spent.'};
    if(ctx.completedActionId)applyPreferenceActivity(state,ctx.completedActionId,ctx);
    settleHouseholdBudget(state,ctx);
    return afterAction(state);
  }
  if (id.startsWith('workshop_')) {
    const ctx = engineContext(state, { annual: true });
    if (!applyWorkshopAction(state, id, ctx)) return { ...copy(original), notice: 'The project could not begin; no time or resources were spent.' };
    if (ctx.completedActionId) applyPreferenceActivity(state, ctx.completedActionId, ctx);
    recordPlanGold(state, goldAfterFee); return afterAction(state);
  }
  if(id.startsWith('talk_'))rememberResident(state,getContacts(state).find(p=>p.id===id.slice(5)));
  const oldDay = state.day;
  const enjoyCompleted = () => { if (state.revision >= 4 && state.day > oldDay && !state.battle) applyPreferenceActivity(state, id, engineContext(state)); };
  spendDays(state, selected.days, { outdoors: ['gather_herbs', 'forest_expedition', 'ruin_expedition', 'find_remedy'].includes(id) });
  if (state.phase === 'retired') return afterAction(state);
  state.flags.actionsTaken++;
  if (id.startsWith('gear_') && applyGearAction(state, id, engineContext(state))) { enjoyCompleted(); recordPlanGold(state, goldAfterFee); return afterAction(state); }
  if (id.startsWith('life_') && applyLifeAction(state, id, engineContext(state))) { enjoyCompleted(); recordPlanGold(state, goldAfterFee); return afterAction(state); }
  const handlers = [
    ['upbringing_', applyUpbringingAction], ['journal_', applyQuestJournalAction], ['grow_', applyBirthAction], ['quest_', applyCampaignAction], ['explore_', applyExplorationAction],
    ['calling_', applyCallingAction], ['talk_', applyDialogueAction],['confide_',applyDialogueAction],
    ['family_', applyHouseholdAction], ['school_', applyHouseholdAction], ['lore_', applyLoreAction],
    ['career_', applyCareerAction], ['lineage_', applyLineageAction], ['health_', applyHealthAction], ['travel_', applyTravelAction],
    ['budget_', applyHouseholdBudgetAction], ['guild_', applyGuildAction],
  ];
  for (const [prefix, handler] of handlers) if (id.startsWith(prefix)) {
    if (handler(state, id, engineContext(state,{annual:id.startsWith('travel_')}))) { if(terminalRun(state))return copy(state);enjoyCompleted(); recordPlanGold(state, goldAfterFee); return afterAction(state); }
    return { ...copy(original), notice: 'This activity could not be started; no time or resources were spent.' };
  }
  switch (id) {
    case 'work': {
      const wage = workWages(state);
      state.hero.gold += wage;
      if (state.life) { state.life.career.experience += 2; state.life.stress = Math.min(100, state.life.stress + 2); }
      if (state.hero.profession === 'Healer') { if(state.careers?.contentVersion!==2)skill(state, 'devotion'); standing(state, 'villagers', 2); }
      if (state.hero.profession === 'Merchant'&&state.careers?.contentVersion!==2) skill(state, 'persuasion');
      if (state.hero.profession === 'Scholar'&&state.careers?.contentVersion!==2) skill(state, 'scholarship');
      if (state.hero.profession === 'Herbalist') { if(state.careers?.contentVersion!==2)skill(state, 'survival'); state.flags.herbs = (state.flags.herbs || 0) + 1; }
      if (state.hero.profession === 'Soldier'&&state.careers?.contentVersion!==2) skill(state, 'weapons');
      if (state.revision >= 5) recordCareerWork(state,{days:3,source:'work',paid:true,gold:wage},engineContext(state));
      earnExperience(state, 8);
      state.notice = `Three days of ${state.hero.profession === 'Unemployed' ? 'honest labor' : state.hero.profession.toLowerCase() + ' work'} earned ${wage} gold.`;
      addJournal(state, 'A living earned', `${state.notice} Work at ${location(state).name} keeps you part of the community.`, 'livelihood');
      break;
    }
    case 'choose_profession':
      setEvent(state, 'apprenticeship', 'A useful place in the world', 'Livelihood',
        'The guild board has room for people who intend to stay as well as adventurers passing through. None of these professions changes your combat path. Each earns a living and practices a different skill.', [
          choice('healer', 'Assist the village healer', 'Become a Healer. Work earns 24 gold and practices devotion.'),
          choice('merchant', 'Learn a merchant’s trade', 'Become a Merchant. Work earns 28 gold and practices persuasion.'),
          choice('scholar', 'Copy and teach academy lessons', 'Become a Scholar. Work earns 23 gold and practices scholarship; certification increases wages.'),
          choice('herbalist', 'Apprentice to an herbalist', 'Become a Herbalist. Work earns 23 gold, practices survival, and gathers remedy components.'),
          choice('soldier', 'Join the local watch', 'Become a Soldier. Work earns 26 gold and practices weapons; serving a settlement is a livelihood.'),
        ]);
      break;
    case 'rest':
      state.hero.hp = state.hero.maxHp; state.hero.mp = state.hero.maxMp;
      for (const person of state.companions) if (person.recruited) { person.hp = person.maxHp; person.mp = person.maxMp; }
      if (state.life) { state.life.health = Math.min(100, state.life.health + 8); state.life.happiness = Math.min(100, state.life.happiness + 3); state.life.stress = Math.max(0, state.life.stress - 10); }
      state.notice = 'A warm bed and two quiet days restore the party.';
      break;
    case 'camp_rest':
      state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 20); state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + 12);
      for (const person of state.companions) if (person.recruited) { person.hp = Math.min(person.maxHp, person.hp + 20); person.mp = Math.min(person.maxMp, person.mp + 12); }
      if (state.life) { state.life.health = Math.min(100, state.life.health + 4); state.life.stress = Math.max(0, state.life.stress - 5); }
      state.notice = 'Two quiet days restore 20 health and 12 magic. No gold spent.';
      break;
    case 'study':
      skill(state, 'scholarship'); if (state.hero.path === 'mage' || birthMode(state)) skill(state, 'arcana');
      state.flags.education++; standing(state, 'academy', 2); earnExperience(state, 12);
      if (state.life) state.life.stress = Math.min(100, state.life.stress + 3);
      state.notice = `Five days of study sharpen your scholarship${state.hero.path === 'mage' ? ' and arcana' : ''}. ${state.flags.education >= 3 ? 'You are ready for the academy examination.' : `${3 - state.flags.education} more study periods prepare you for the exam.`}`;
      if (state.flags.education === 3 && !state.flags.certified) addObligation(state, 'exam', 'Attend the academy examination', 30, `Sit the examination in ${city(state).name}; missing it reduces academy trust, but you can still sit it later.`);
      addJournal(state, 'Lessons with a person', state.notice, 'education');
      break;
    case 'take_exam':
      state.flags.certified = true; finishObligation(state, 'exam'); standing(state, 'academy', 12);
      state.hero.attributes.intellect++; earnExperience(state, 25);
      addJournal(state, 'The academy certificate', 'You passed the practical and written examinations. A scholar or healer can now earn eight more gold per work period.', 'education');
      state.notice = 'Your learning is recognized. Scholar and healer wages increase by 8 gold.';
      break;
    case 'train':
      skill(state, ({ warrior: 'weapons', mage: 'arcana', rogue: 'stealth' })[state.hero.path]);
      if (state.hero.path === 'warrior') skill(state, 'defense');
      state.flags.training++; earnExperience(state, 12);
      state.notice = `Your ${state.hero.path} training advances one skill. Specializations are earned through skill and a world initiation.`;
      break;
    case 'pray':
      skill(state, 'devotion'); state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + 8); standing(state, 'order', 3);
      if (state.life) state.life.stress = Math.max(0, state.life.stress - 3);
      state.notice = 'You tend the shrine, learn devotion, and restore 8 magic.';
      if (state.flags.childhoodMentor && !state.flags.shrineRestored && state.hero.skills.devotion >= 3) {
        state.flags.shrineRestored = true; standing(state, 'villagers', 8);
        addJournal(state, 'The village shrine restored', 'Neighbors joined your work. This is a place of refuge now, and they will remember who began it.', 'world');
      }
      break;
    case 'socialize': socialEvent(state); break;
    case 'help_clinic':
      state.hero.gold += 10; state.flags.clinicShifts++; skill(state, 'devotion'); standing(state, 'villagers', 6);
      finishObligation(state, 'scholarship_service'); finishObligation(state, 'plague_return');
      if (state.obligations.some(item => item.id === 'companion_request' && !item.resolved)) {
        finishObligation(state, 'companion_request'); remember(state, 'orrin', 'You kept your promise and worked a clinic shift beside me.', 15);
        addJournal(state, 'A promise kept beside Orrin', 'Working together gave his sister a day to rest. He remembers that you made time.', 'relationship');
      }
      earnExperience(state, 12);
      state.notice = 'You earn 10 gold, gain devotion, and help tired neighbors. Any clinic service promise is fulfilled.';
      if (!state.flags.plagueStage) { state.flags.actionsTaken = Math.max(state.flags.actionsTaken, 3); }
      else if (state.flags.plagueStage === 1) setEvent(state, 'clinic', 'The remedy that only buys time', 'The Ashfall story',
        'Orrin shows you the clinic ledger. The licensed remedy stops the shivering, then the fever returns. Every affected house draws from the same stream. You can consult the academy for a field remedy, or ask about the forgotten burial ground upstream.', [
          choice('academy', 'Take the ledger to the academy', 'The academy offers both a licensed field route and a restricted research route in the city.'),
          choice('support', 'Keep caring for people while you prepare', 'Gain village trust. The investigation remains available when you visit the academy.'),
        ]);
      break;
    case 'buy_potion': if(state.realm)state.realm.sites[state.locationId].merchant.potions--;state.hero.potions++; state.notice = 'One healing draught added to the shared party supplies.'; break;
    case 'gather_herbs':
      skill(state, 'survival'); state.flags.herbs = (state.flags.herbs || 0) + 1; state.hero.gold += 8; earnExperience(state, 8);
      state.notice = `You gather a remedy bundle and earn 8 gold. You have ${state.flags.herbs} bundle${state.flags.herbs === 1 ? '' : 's'}.`;
      break;
    case 'visit_family': familyEvent(state); break;
    case 'forest_expedition': beginBattle(state, 'forest'); break;
    case 'ruin_expedition': beginBattle(state, 'ruin'); break;
    case 'seek_order': if(state.revision<5||captureLegacyMentorTrial(state,'paladin'))paladinEvent(state);else state.notice='The exact mentor cannot currently open this initiation.';break;
    case 'seek_necromancy': if(state.revision<5||captureLegacyMentorTrial(state,'necromancer'))necromancyEvent(state);else state.notice='The exact mentor cannot currently open this initiation.';break;
    case 'seek_assassin': if(state.revision<5||captureLegacyMentorTrial(state,'assassin'))assassinEvent(state);else state.notice='The exact mentor cannot currently open this initiation.';break;
    case 'lift_purse': {
      const roll = seededRoll(state.seed, `theft-${state.flags.actionsTaken}`, 10);
      const success = state.hero.skills.stealth + Math.floor(state.hero.attributes.agility / 2) >= roll + 2;
      if (success) {
        state.hero.gold += 24; standing(state, 'underworld', 3); skill(state, 'stealth');
        state.notice = 'You slip away with 24 gold. No witness identifies you; there is no new official evidence.';
        addJournal(state, 'An unwitnessed theft', state.notice, 'crime');
        if (['truth', 'protection'].includes(state.flags.oathType)) breakOath(state, 'You took a stranger’s purse and concealed it.');
      } else {
        addEvidence(state, 2, 'A merchant identified you during a market theft.'); standing(state, 'villagers', -6);
        state.notice = 'The merchant recognizes you. Two pieces of local evidence are recorded; restitution remains possible.';
        addJournal(state, 'A witness in the market', state.notice, 'crime');
        breakOath(state, 'You preyed on a person you had sworn to protect.');
      }
      break;
    }
    case 'settle_fine': {
      state.legal.incidents = state.legal.incidents.filter(item => item.locationId !== state.locationId);
      standing(state, 'villagers', 3); syncLaw(state);
      state.notice = 'You paid restitution and answered the local report. That settlement’s evidence is cleared.';
      addJournal(state, 'Restitution paid', state.notice, 'crime');
      break;
    }
    case 'consult_academy':
      setEvent(state, 'academy_remedy', 'Two ways to ask the past', 'The Ashfall story',
        'Your former teacher reads the clinic ledger. A licensed herbal route requires moonroot from the forest. A recovered ancestral rite could instead ask a willing burial-ground custodian where the contamination began. The second route uses restricted research, not automatically a wicked act. Local laws differ, and secrecy cannot erase what a witness sees.', [
          choice('field', 'Accept licensed fieldwork', 'Gather three herb bundles or secure the forest road, then find the moonroot remedy. No forbidden magic is needed.'),
          choice('research', 'Borrow the restricted ancestral rite', 'Seek a willing ancestor in the ruin. Promise to return the original research within 20 days.'),
          choice('both', 'Prepare both possibilities', 'Keep the licensed route available and borrow the ancestral rite, with the same 20-day return promise.'),
        ]);
      break;
    case 'return_research':
      state.flags.researchBorrowed = false; state.flags.researchReturned = true; finishObligation(state, 'return_research'); standing(state, 'academy', 8);
      state.notice = 'The original research is back in the archive. Your notes and learned rites remain your own.';
      addJournal(state, 'Borrowed knowledge returned', state.notice, 'obligation');
      break;
    case 'fulfill_oath':
      state.flags.oathBroken = false; state.flags.oathServiceMissed = false; finishObligation(state, 'oath_service'); finishObligation(state, 'order_service'); standing(state, 'order', 12); standing(state, 'villagers', 5);
      state.notice = 'You gave an honest account and served a threatened household. Your sacred gifts answer again.';
      addJournal(state, 'Service beneath the lantern', state.notice + ' Your oath is still visible, and past choices remain in the chronicle.', 'oath');
      remember(state, 'mira', 'You returned to service and made amends instead of denying your oath.', 6);
      break;
    case 'find_remedy':
      state.flags.plagueStage = 3; state.flags.remedyMethod = 'moonroot';
      state.notice = `You prepare a licensed moonroot remedy. Bring it to ${home(state).name}.`;
      addJournal(state, 'A remedy from living roots', 'Careful fieldwork identified the contaminated spring and a herb that neutralizes its ash. No forbidden rite was needed.', 'story');
      break;
    case 'ask_ancestor': ancestorEvent(state); break;
    case 'vampire_invitation': vampireEvent(state); break;
    case 'feed_vampire': feedingEvent(state); break;
    case 'night_travel':
      state.flags.travelByNight = !state.flags.travelByNight;
      if(state.travel)state.travel.plan.night=state.flags.travelByNight;
      state.notice = state.flags.travelByNight ? 'You arrange travel and outdoor work after dusk. Sunlight will no longer cost health during those activities.' : 'You resume daylight journeys. Outdoor activity now costs 2 health per day.';
      break;
    case 'lycan_invitation':
      lycanOffer(state);
      break;
    case 'lycan_prepare':
      state.hero.condition.preparedUntil = getMoonForecast(state).nextFullMoon;
      onSanctuaryRefugePrepared(state);
      {const c=initializeCurse(state),old=c.control;if(c.refugeControlMoon!==c.preparedUntil){c.control=Math.min(100,c.control+1);c.refugeControlMoon=c.preparedUntil;}c.lastControlGain=c.control-old;}
      state.flags.lycanRefugeLocation = state.locationId;
      state.notice = `A secluded refuge is ready for full moon on day ${state.hero.condition.preparedUntil}. Control rises by ${state.hero.condition.lastControlGain}. No outsider receives a report.`;
      addJournal(state, 'A refuge before the moon', state.notice, 'condition');
      break;
    case 'lycan_control':
      {const c=initializeCurse(state),old=c.control;c.control=Math.min(100,c.control+2);c.lastControlGain=c.control-old;c.lastTrainingDay=state.day;}
      if (state.life) { state.life.stress = Math.max(0, state.life.stress - 5); state.life.health = Math.min(100, state.life.health + 2); }
      state.notice = `Three days of deliberate practice raised control by ${state.hero.condition.lastControlGain}. The beast still returns at the moon.`;
      break;
    case 'lycan_cure':
      state.flags.herbs -= 3; state.hero.condition = null; state.flags.pendingMoonDays = []; state.flags.lycanCured = true;
      state.hero.hp = state.hero.maxHp; state.hero.mp = state.hero.maxMp;
      state.notice = 'The moonbound cure restores mortal life. Your learned skills, livelihood, and relationships remain.';
      addJournal(state, 'The moon without a summons', state.notice, 'condition');
      break;
    case 'lycan_confide': {
      const people = state.life.people.filter(person => person.bond >= 20);
      setEvent(state, 'lycan_confidant', 'A secret offered freely', 'Relationship knowledge', 'A person can help you prepare only if they know what you are living with. You choose whose confidence to trust; telling one person does not notify the region.', [
        ...people.slice(0, 5).map(person => choice(`person_${person.id}`, `Tell ${person.name}`, 'This person learns your lycanthropy and remembers your trust. No official evidence is created.')),
        choice('keep', 'Keep this private for now', 'Your condition stays private. Safe refuge and control practice remain available.'),
      ]);
      break;
    }
    case 'seek_cure':
      state.flags.herbs -= 2; state.hero.maxMp = Math.max(0, state.hero.maxMp - (state.hero.condition?.reserveGranted??6)); state.hero.condition = null; state.flags.travelByNight = false; state.flags.vampireCured = true;
      state.hero.hp = state.hero.maxHp; state.hero.mp = state.hero.maxMp;
      state.notice = 'The healer restores your mortal life. Your profession, skills, relationships, and memories remain.';
      addJournal(state, 'The first sunrise without fear', state.notice, 'condition');
      if (witnesses(state).some(person => person.id === 'mira') || state.flags.miraKnowsCondition) remember(state, 'mira', 'You found a cure and trusted someone with the work.', 6);
      break;
    case 'deliver_remedy': homecomingEvent(state); break;
    case 'retire':
      setEvent(state, 'retirement', 'A life you can call your own', 'Journal',
        `You have spent ${state.day} days making your way through ${state.world.name}. Your ambition was “${state.hero.ambition}.” You may settle into the life you built, or keep living it. Closing the chapter keeps your save and gives you a chronicle.\n\n${retirementQuestReview(state)}`, [
          choice('settle', 'Settle into a quieter life', 'Retire and record the completed, paused and unfinished undertakings you chose to leave.'),
          choice('continue', 'There is more I want to do', 'Return to the calendar without retiring.'),
        ]);
      break;
  }
  if(terminalRun(state))return copy(state);
  enjoyCompleted();
  recordPlanGold(state, goldAfterFee);
  return afterAction(state);
}

function socialEvent(state) {
  const known = state.companions.filter(person => person.recruited);
  const person = known.length ? known[(state.flags.actionsTaken + state.day) % known.length] : state.companions[0];
  state.flags.socialTarget = person.id;
  const story = person.id === 'mira'
    ? 'Mira remembers the lost silver charm from childhood. Now she trains with the Lantern Order, where teachers say compassion is easy until it costs something. She asks whether an institution can ever demand too much.'
    : person.id === 'orrin'
      ? 'Orrin explains that he became a healer because his father distrusted the academy after an expensive treatment failed. He wants knowledge to help people without becoming an excuse to ignore their consent.'
      : 'Kest shows you a worn road map marked with the last place their sibling was seen. They smuggle medicine when official shipments fail, but refuse to profit from desperate families.';
  setEvent(state, 'companion_talk', `An evening with ${person.name}`, 'Relationships', story, [
    choice('listen', 'Listen before offering an answer', 'Gain relationship and persuasion. This person remembers that you gave their concern time.'),
    choice('principle', 'Share a principle you intend to keep', 'Gain relationship and Willpower. A clear commitment becomes a memory.'),
    choice('disagree', 'Disagree without dismissing them', 'Gain scholarship. Your relationship changes slightly, and your difference remains in memory.'),
  ]);
}
function familyEvent(state) {
  const memories = [];
  if (state.flags.shrineRestored) memories.push('The shrine you restored is giving people refuge.');
  if (state.flags.certified) memories.push('Your certificate has been shown to every visiting neighbor.');
  if (state.flags.plagueStage >= 4) memories.push('The people you helped are back at work, and no one has forgotten why.');
  if (state.flags.conditionDisclosed) memories.push('Your family knows about the hunger you live with and has kept your confidence.');
  if (state.flags.publicNecromancy) memories.push('Some neighbors are grateful for your research; others still fear the way you obtained it.');
  if (!memories.length) memories.push('The table is still small, and your place at it is still waiting.');
  setEvent(state, 'family_visit', 'The people who knew you first', 'Homecoming',
    `${memories.join(' ')} ${state.hero.household === 'noble' ? 'Your relatives ask how your choices reflect on the family name.' : state.hero.household === 'poor' ? 'A sack of grain would change the next few weeks for this household.' : 'Your family asks whether your new work leaves any time for ordinary life.'} How do you spend this visit?`, [
      choice('time', 'Help with the day’s ordinary work', 'Gain village trust. Family remembers that you still make time for home.'),
      ...(state.hero.gold >= 10 ? [choice('gift', 'Leave ten gold for household supplies', 'Spend 10 gold and gain village trust. Your contribution becomes a family memory.')] : []),
      ...(state.hero.condition?.type === 'vampire' && !state.flags.conditionDisclosed ? [choice('confide', 'Tell your family about the hunger', 'Your family learns your condition. They offer a safe refuge; officials receive no automatic report.')] : []),
      choice('stories', 'Tell them what you have learned', 'Gain Presence and share your education and profession. Hidden powers stay private unless you disclose them.'),
    ]);
}
function paladinEvent(state) {
  const mentor = state.flags.legacyMentorTrial?.stage==='offer'?state.flags.legacyMentorTrial.mentor:state.world.mentors.find(person => person.specialization === 'paladin');
  setEvent(state, 'paladin_oath', 'The oath must have words', 'Paladin initiation',
    `${mentor?.name || 'The order’s mentor'} has seen your training and shrine service. “We grant a duty, not a clean conscience. Choose words you can understand. The trial can be a guarded sparring encounter or four days protecting a household; both prove commitment.” ${state.hero.condition?.type === 'vampire' ? 'The Lantern Order accepts a controlled vampire who feeds by consent, but sacred powers fall silent after predation.' : state.hero.condition?.type === 'lycanthrope' ? 'The Lantern Order accepts a moonbound guardian who protects neighbors through preparation and restraint.' : ''}`, [
      choice('mercy', 'Swear an oath of mercy', 'Never bind an unwilling soul or feed on an unwilling person. Make amends through service if you break it.'),
      choice('truth', 'Swear an oath of truth', 'Keep your account honest; theft by deceit, coerced souls, and predatory feeding break this oath.'),
      choice('protection', 'Swear an oath of protection', 'Protect vulnerable people. Theft, coerced souls, and predatory feeding break this oath.'),
      choice('decline', 'Keep your martial skill without an oath', 'Leave freely. The initiation remains available later.'),
    ]);
}
function necromancyEvent(state) {
  const mentor = state.flags.legacyMentorTrial?.stage==='offer'?state.flags.legacyMentorTrial.mentor:state.world.mentors.find(person => person.specialization === 'necromancer');
  setEvent(state, 'necromancer_ethics', 'A voice is still a person', 'Necromancer initiation',
    `${mentor?.name || 'The ancestral teacher'} prepares a circle around a memorial, not a stolen body. “A willing keeper can teach us. Binding an unwilling soul is faster and leaves a different debt.” Your discipline will be a specialization, not an automatic criminal record. Authorities can learn from witnesses and evidence. Mira’s limit is explicit: she will not travel with someone who binds an unwilling soul.`, [
      choice('consent', 'Wait for a willing ancestor', 'Respect consent. Take a controlled trial or a four-day memorial service to complete initiation.'),
      choice('bind', 'Demand an answer from an unwilling spirit', 'The teacher reports coercion: gain three local evidence. Active companions witness it; Mira withdraws if present. Continue to a trial if you choose.'),
      choice('decline', 'Study ordinary healing for now', 'Leave freely; keep all prior training. You may return to this teacher.'),
    ]);
}
function assassinEvent(state) {
  setEvent(state, 'assassin_commission', 'The terms of a quiet profession', 'Assassin initiation',
    `${state.flags.legacyMentorTrial?.stage==='offer'?state.flags.legacyMentorTrial.mentor.name+' brings a named commission. ':''}The Veiled Guild’s first commission concerns a noble courier accused of selling fever medicine abroad. The contact offers a lethal commission, but a discreet operative could instead recover the ledger and expose the trade. You will learn an assassin’s techniques either way; each future commission remains a choice.`, [
      choice('ledger', 'Recover the ledger and expose the trade', 'A four-day surveillance trial can earn initiation without killing. Kest approves of protecting desperate households.'),
      choice('lethal', 'Accept the lethal commission', 'A guarded combat trial stands in for the dangerous contract. A witnessed victory creates local evidence and costs village trust.'),
      choice('decline', 'Refuse this commission', 'Keep your rogue skills and leave. Another initiation is available when you return.'),
    ]);
}
function trialEvent(state, specialization) {
  state.flags.pendingSpecialization = specialization;markLegacyTrialAccepted(state,specialization);
  setEvent(state, 'initiation_trial', 'A commitment made concrete', `${specialization} initiation`,
    specialization === 'paladin' ? 'The order offers a supervised encounter against trial guardians, or four days escorting vulnerable travelers. Your chosen oath will be recorded in the character journal.'
      : specialization === 'necromancer' ? 'You can demonstrate command in a warded encounter with guardian echoes, or spend four days preparing a consenting memorial rite. Neither requires an arbitrary level.'
        : 'The guild offers a guarded encounter to test your precision, or four days of surveillance to recover the evidence. A nonlethal route remains viable.', [
      ...(state.hero.hp >= 20 ? [choice('combat', 'Enter the controlled trial', 'Begin turn-based combat. Victory completes your specialization; retreat or defeat lets you prepare and try again.')] : []),
      choice('service', 'Complete the four-day field trial', 'Spend 4 days and complete initiation through earned skills and practical work. No gold required.'),
      choice('pause', 'Prepare before making the final commitment', 'Keep your training and leave without a specialization. You may seek initiation again.'),
    ]);
}
function awardSpecialization(state, specialization) {
  state.hero.specialization = specialization;
  if (state.progression && !state.progression.learnedClassIds.includes(specialization)) state.progression.learnedClassIds.push(specialization);
  delete state.flags.pendingSpecialization;
  earnExperience(state, 25);
  if (specialization === 'paladin') {
    standing(state, 'order', 15); skill(state, 'defense', 2);
    addObligation(state, 'oath_service', 'Serve beneath the Lantern oath', 24, `Complete order service in ${city(state).name}. A missed deadline harms standing; atonement remains available.`);
    remember(state, 'mira', `You earned the Lantern Order’s recognition and swore: ${state.flags.oath}`, 12);
  } else if (specialization === 'necromancer') {
    skill(state, 'arcana', 2); state.flags.knowsAncestralRite = true;
    if (!state.flags.soulBound && witnesses(state).some(person => person.id === 'mira')) remember(state, 'mira', 'You studied necromancy but kept your promise to respect willing souls.', 3);
  } else {
    skill(state, 'stealth', 2); standing(state, 'underworld', 15);
    if (!state.flags.lethalCommission) remember(state, 'kest', 'You exposed stolen medicine instead of taking a life for payment.', 12);
  }
  state.notice = `You earned the ${specialization} specialization. Your livelihood and personal history continue.`;
  addJournal(state, `Initiated as a ${specialization}`, `${state.notice}${specialization === 'paladin' ? ` Oath: ${state.flags.oath}` : specialization === 'necromancer' ? ` Your practice began with ${state.flags.soulBound ? 'an unwilling binding that a witness reported' : 'consensual ancestral study, without an automatic criminal record'}.` : ` Your first commission used ${state.flags.lethalCommission ? 'lethal force' : 'surveillance and recovered evidence'}.`}`, 'specialization');
}
function ancestorEvent(state) {
  setEvent(state, 'ancestor_remedy', 'The keeper beneath the spring', 'Forbidden power',
    'The ancestral circle brightens. A former spring keeper offers to answer because the village still tends her memorial. She remembers a sealed cistern beneath the burial ground, cracked when looters disturbed its supports. Speaking with her can guide a cure. Forcing the other resting souls into service could yield more power, but none have consented. There is no guard here; your companions will remember what they see.', [
      choice('consent', 'Accept only the willing keeper’s testimony', 'Find the cause and a remedy. Active companions learn you used consensual necromancy; authorities do not learn by magic.'),
      choice('license', 'Record the testimony for a licensed report', 'Use consensual necromancy and prepare transparent evidence. Gain academy trust; homecoming still lets you decide how to share it.'),
      choice('bind', 'Bind the silent souls to force more answers', 'Gain arcana and the cure. If present or told later, Mira refuses further travel. Coercion breaches a paladin oath. No official evidence appears without a report.'),
      choice('withdraw', 'Close the circle and find a living remedy', 'Return to the forest moonroot route. No knowledge or profession is erased.'),
    ]);
}
function vampireEvent(state) {
  const remembered=nightInvitation(state,'vampire');
  setEvent(state, 'vampire_offer', 'A life after sunset', 'Vampirism',
    (remembered?remembered.personName+' offers to explain the invitation you remember. ':'')+'The twilight patron offers a blood-bearing bite of the Velvet Sepulchre. A three-day fever precedes the changed life. A healer can cleanse the fresh bite for 12 gold before the third day; afterward, restoring mortality requires a costly rite. Your profession, schooling and companions continue. The changed blood grants a combat ability and greater magical reserves, but hunger rises by 2 each day and prolonged starvation harms body and humanity. Outdoor daylight costs 2 health per day unless you arrange dusk travel. Animal blood is free; willing local donors and named agreements have their own terms. A Lantern oath permits consensual feeding, but cannot cancel another region’s curse warrant. Disclosure and witnessed acts can bring hunters.', [
      choice('accept', 'Accept the patron’s bite', 'Begin the three-day infection at hunger 20 and gain 6 maximum magic. The old life continues beneath the fever; the bite is still treatable before it changes you.'),
      choice('decline', 'Choose the life you already have', 'Decline the invitation permanently for this life. No powers or relationships are lost.'),
      choice('later', 'Ask for time to decide', 'Leave the invitation available. You remain mortal.'),
    ]);
}
function feedingEvent(state) {
  setEvent(state, 'vampire_feeding', 'The need and the choice', 'Vampirism',
    feedingScene(state), [
      ...(state.hero.gold >= 8 ? [choice('donor', 'Pay a willing donor eight gold', 'Spend 8 gold; lower hunger by 50. The donor keeps your confidence, and no official evidence is created.')] : []),
      choice('animal', 'Use animal blood carefully', 'Lower hunger by 28 without spending gold or harming a person.'),
      choice('predation', 'Take blood from an unwilling traveler', 'Lower hunger by 70. A frightened witness reports the assault: gain 3 local evidence and lose trust. Break any paladin oath.'),
      choice('abstain', 'Abstain for now', 'Keep your hunger unchanged after the day already spent. The need remains visible.'),
    ]);
}
function homecomingEvent(state) {
  setEvent(state, 'plague_homecoming', 'Return to people who remember', 'Homecoming',
    `The remedy is ready. ${state.flags.plagueDelay ? 'You arrive later than promised; not every household can forget the waiting, but your help still matters.' : 'Your neighbors gather around the clinic doors.'} ${state.flags.remedyMethod === 'ancestral' ? `Your discovery came from an ancestral voice. In ${home(state).name}, necromancy is ${home(state).necromancyLaw}. Mira has become a sworn investigator of the Lantern Order, and asks for an honest account.` : 'Your field notes describe moonroot and the broken cistern. Mira, now sworn to the Lantern Order, asks how the danger escaped notice.'} Gratitude, law, and friendship do not have to agree.`, [
      choice('open', 'Give an open account of the remedy', `Help the village and tell the truth.${state.flags.soulBound ? ' Admitting soul coercion creates evidence and Mira withdraws.' : state.flags.remedyMethod === 'ancestral' && home(state).necromancyLaw === 'forbidden' ? ' A witnessed forbidden rite creates local evidence, while villagers remain grateful.' : ' A consensual or licensed practice can earn academy support.'}`),
      choice('private', 'Explain the full truth to Mira privately', `Help the village. Mira knows your method and remembers your trust.${state.flags.soulBound ? ' She refuses further travel after learning of unwilling binding.' : ''} A private conversation creates no automatic official report.`),
      choice('quiet', 'Give the remedy and keep your method quiet', 'Help the village without public disclosure. A truth oath is broken if you deliberately mislead the inquiry; Mira remembers the distance.'),
    ]);
}

function performEventOption(original, id) {
  const state = copy(original);
  const activeEvent = state.event;
  if(observationalInfancy(state)&&!(id==='continue'&&(activeEvent?.id==='birth_arrival'||/^birth_year_[012]$/.test(activeEvent?.id||'')||activeEvent?.id==='health_concern'))){state.notice=infantAgencyReason(state);return state;}
  if (!activeEvent || state.battle || !activeEvent.choices.some(item => item.id === id)) {
    state.notice = 'That choice is not part of the current situation.';
    return state;
  }
  if(!validateFeedingTerms(activeEvent)){state.notice='The captured feeding terms are invalid. No time, gold or feeding was taken.';return state;}
  const blockedReason = tournamentChoiceReason(state,activeEvent.id,id) || researchChoiceReason(state,activeEvent,id) || originChoiceReason(state,activeEvent.id,id) || lifeChoiceReason(state,activeEvent.id,id) || societyCustomerChoiceReason(state,activeEvent.id,id) || (activeEvent.id==='stories_chapter'?storyChoiceReason(state,id):activeEvent.id.startsWith('rpg_')?rpgChoiceReason(state,id):healthChoiceReason(state, activeEvent.id, id));
  if (blockedReason) { state.notice = blockedReason; return state; }
  const extraCost = activeEvent.id === 'family_visit' && id === 'gift' ? 10
    : ['life_hunger','vampire_feeding'].includes(activeEvent.id) && id === 'donor' ? 8 : 0;
  if (state.hero.gold < extraCost) {
    state.notice = `This choice requires ${extraCost} gold. Choose another available approach.`;
    return state;
  }
  state.event = null;
  if(legacyMentorTrialChoice(state,activeEvent.id,id))return afterAction(state);
  state.notice = '';
  if(['life_hunger','vampire_feeding'].includes(activeEvent.id)&&id==='agreement') {
    const ctx=engineContext(state,{annual:true,resolvingNeed:'vampire'});
    if(!applySanctuaryNeed(state,'vampire',id,ctx))return {...copy(original),notice:'The agreed feeding cannot take place now. Choose another approach.'};
    settleHouseholdBudget(state,ctx);return afterAction(state);
  }
  if (activeEvent.id.startsWith('life_')) {
    if (applyLifeChoice(state, activeEvent.id, id, {...engineContext(state,{annual:birthMode(state),resolvingNeed:activeEvent.id==='life_hunger'?'vampire':null}),meal:activeEvent.choices.find(c=>c.id===id)?.meal})) {
      if (activeEvent.id === 'life_hunger' && id === 'pause' && birthMode(state)) { state.flags.hungerPauseDay = state.day; if (!state.timeline.journey) state.timeline.yearTarget = null; }
      return afterAction(state);
    }
    return { ...copy(original), notice: 'This life decision could not be resolved. Choose an available approach.' };
  }
  if(activeEvent.id.startsWith('research_')) {
    const before=state.hero.gold, ctx=engineContext(state,{annual:true});
    if(!applyResearchChoice(state,activeEvent,id,ctx))return {...copy(original),notice:'This exact research proposal could not proceed; no work or disclosure was claimed.'};
    if(state.day>original.day)settleHouseholdBudget(state,ctx);recordPlanGold(state,before);return afterAction(state);
  }
  const moduleChoices = [ ['tournament_',applyTournamentChoice], ['repertoire_',applyRepertoireChoice], ['origin_',applyOriginChoice], ['yard_',applyYardChoice], ['rpg_',applyRpgChoice],
    ['country_',applyWildernessChoice],['way_',applyFieldChoice],
    ['curse_',applyCurseChoice],
    ['nature_',applyPersonalityChoice],['hard_',applyWinterChoice],['schooling_',applySchoolingChoice],['living_',applyLivingChoice],['guild_',applyGuildChoice],['delve_',applyDelveChoice],
    ['birth_', applyBirthChoice], ['calling_', applyCallingChoice], ['fate_', applyCampaignChoice],
    ['quest_', applyCampaignChoice], ['dungeon_', applyExplorationChoice],
    ['family_', applyHouseholdChoice], ['school_', applyHouseholdChoice], ['lore_', applyLoreChoice],
    ['career_', applyCareerChoice], ['lineage_', applyLineageChoice], ['health_', applyHealthChoice], ['travel_', applyTravelChoice],
    ['society_',applySocietyChoice],['community_',applyCommunityChoice],['fellowship_',applyFellowshipChoice],['sanctuary_',applySanctuaryChoice],
    ['social_',applySocialChoice],['pastime_',applyPastimeChoice],
    ['stories_',applyStoryChoice],['justice_',applyJusticeChoice],['adventure_',applyAdventureChoice],['debt_',applyDebtReckoningChoice],
  ];
  for (const [prefix, handler] of moduleChoices) if (activeEvent.id.startsWith(prefix) && activeEvent.id !== 'family_visit') {
    const before = state.hero.gold;
    if (handler(state, activeEvent.id, id, engineContext(state,{annual:birthMode(state)||activeEvent.id.startsWith('justice_counting_')||activeEvent.id.startsWith('tournament_')||activeEvent.id.startsWith('origin_')||activeEvent.id.startsWith('travel_'),resolvingNeed:activeEvent.id.startsWith('curse_')?'vampire':sanctuaryNeedsBypass(state,null,activeEvent.id,id)}))) { if(activeEvent.id.startsWith('tournament_')&&state.day>original.day||activeEvent.id.startsWith('origin_')&&state.day>original.day||activeEvent.id.startsWith('rpg_')||activeEvent.id.startsWith('yard_')&&state.day>original.day||activeEvent.id.startsWith('justice_counting_')&&state.day>original.day)settleHouseholdBudget(state,engineContext(state));recordPlanGold(state, before); return afterAction(state); }
    return { ...copy(original), notice: 'This decision is still waiting for a valid approach.' };
  }
  const goldBeforeChoice = state.hero.gold;
  switch (activeEvent.id) {
    case 'annual_deadline_review':
      state.flags.reviewedObligations ||= [];
      if (!state.flags.reviewedObligations.includes(state.flags.activeDeadlineToken)) state.flags.reviewedObligations.push(state.flags.activeDeadlineToken);
      delete state.flags.activeDeadlineToken;
      state.notice = id === 'pause' ? 'The annual plan waits. Take ordinary activities to honor the promise, then Continue when ready.' : 'You acknowledged the deadline. Continue the year when ready; the promise can still have consequences.';
      addJournal(state, 'A deadline considered', state.notice, 'obligation');
      break;
    case 'lycan_offer':
      if (id === 'accept') {
        if (state.hero.condition) { state.event = activeEvent; state.notice = 'Only one major supernatural condition can be active.'; return state; }
        contractCurse(state,'lycanthrope','The moonwise ranger warned you before the blood rite',engineContext(state));settleNightInvitation(state,'lycanthrope','accepted');
        if(/control 35/.test(activeEvent.choices.find(c=>c.id==='accept')?.description||''))state.hero.condition.control=35;
        state.flags.pendingMoonDays = []; state.flags.lycanAccepted = true;
        for (const person of witnesses(state)) remember(state, person.id, 'I was present when you accepted the moonbound life and learned its need for restraint.', 0);
        state.notice = `Your moonbound life begins. ${getMoonForecast(state).description}`;
        addJournal(state, 'A bargain with the changing moon', state.notice + ' Your profession and education remain.', 'condition');
      } else if (id === 'decline') { state.flags.lycanDeclined = true; settleNightInvitation(state,'lycanthrope','declined'); state.notice = 'You keep your mortal life; the ranger respects your decision.'; }
      else {settleNightInvitation(state,'lycanthrope','deferred');state.notice=nightInvitation(state,'lycanthrope')?'The invitation remains in your Journal. Return to the remembered place and look after dusk; the ranger may be absent.':'You remain mortal. The moonwise invitation stays available.';}
      break;
    case 'lycan_fullmoon': {
      if(state.hero.condition?.type!=='lycanthrope')break;
      const c=initializeCurse(state),moonDay=state.flags.activeMoonDay;
      if(moonDay===undefined||moonDay<=c.lastFullMoon)break;
      if(id==='safe'&&!sanctuaryMoonPrepared(state,moonDay)){state.event=activeEvent;state.notice='The promised refuge must actually be prepared and available here.';return state;}
      const oldControl=c.control;let damage=0,gain=0;c.form='beast';c.formUntil=state.day+1;c.moonsLived++;
      if(id==='safe'){gain=2;c.rage=Math.max(0,c.rage-8);c.mastery=Math.min(100,c.mastery+(c.accepted?3:1));c.form=c.control>=65?'restrained':'beast';state.notice='The lock takes the first blow. By dawn the walls are scored, but no one outside was harmed. The prepared refuge held.';}
      else if(id==='isolate'){damage=6;gain=1;state.notice='You wake among broken branches with your jaw aching and the taste of iron in your mouth. Isolation protected other people, but injured your own body.';}
      else if(id==='resist'){const holds=c.control>=85&&c.mastery>=30||seededRoll(state.seed,'moon-restraint-'+moonDay,100)<Math.min(80,c.control);damage=holds?2:14;gain=holds?2:-3;c.rage=clamp(c.rage+(holds?-5:12),0,100);state.notice=holds?'You held a fragment of your own name through the change. Restraint cost two health.':'Your name disappeared. Dawn found you beneath a splintered door, fourteen health weaker. No outsider saw this isolated struggle.';}
      else if(id==='roam'){const dangerous=!state.cartography?.offsite&&!state.dungeon&&!state.adventuring?.expedition&&!state.timeline?.journey&&['city','village','town','citadel'].includes(location(state).type)&&c.control<75;if(dangerous){c.frenzies++;c.form='feral';damage=12;gain=-2;const victim=[...(state.life?.people||[]),...(state.society?.people||[])].find(p=>p.alive!==false&&p.age>=18&&p.locationId===state.locationId&&!p.familyRole);if(victim)recordCurseSurvivor(state,victim.id,'Survived the uncontrolled moon rampage at the actual settlement.');if(victim&&seededRoll(state.seed,'moon-victim-'+moonDay,100)<35)killNamedPerson(state,victim.id,'Killed during the uncontrolled moon rampage',engineContext(state));recordCurseExposure(state,engineContext(state),'The watch witnessed a ferocious moon rampage among the settlement’s households.',3);standing(state,'villagers',-12);breakOath(state,'You released the beast among vulnerable neighbors.');state.notice='The beast followed frightened voices into the streets. The watch used silver. Your local victims and their surviving families remain in the record.';}else{damage=4;gain=1;state.notice='The animal ran until its claws split. Four health were lost in the wilderness; no official learned your secret.';}}
      else break;
      c.control=clamp(c.control+gain,0,100);state.hero.hp=Math.max(0,state.hero.hp-damage);c.lastFullMoon=moonDay;
      state.flags.pendingMoonDays=(state.flags.pendingMoonDays||[]).filter(day=>day>moonDay);delete state.flags.activeMoonDay;
      state.notice+=` Control ${c.control-oldControl>=0?'+':''}${c.control-oldControl}; mastery ${c.mastery}/100. The beast’s shape lasts until the next day.`;
      for (const person of witnesses(state)) remember(state,person.id,id==='safe'?'I witnessed the refuge contain the beast without harming an outsider.':id==='resist'?'I heard your voice struggle beneath the beast’s breath.':'I witnessed the danger of the moon curse.',id==='safe'?2:id==='roam'?-5:0);
      if(state.life)state.life.stress=clamp(state.life.stress+(id==='safe'?-4:id==='roam'?10:5),0,100);
      addJournal(state,'The beast’s own night',state.notice,'condition');
      if(!state.hero.hp)endLife(state,'The moon transformation and its injuries ended this life');
      break;
    }
    case 'lycan_confidant':
      if (id === 'keep') state.notice = 'Your condition remains private.';
      else {
        const person = state.life.people.find(item => id === `person_${item.id}`);
        if (!person) { state.event = activeEvent; state.notice = 'That person is not in your known circle.'; return state; }
        if (!person.knownFacts.includes('lycanthrope')) person.knownFacts.push('lycanthrope');
        if (!person.memories.includes('You trusted me with your moonbound condition.')) person.memories.push('You trusted me with your moonbound condition.');
        person.bond = Math.min(100, person.bond + 8);
        state.notice = `${person.name} knows about your lycanthropy and remembers your trust. No official report is created.`;
        addJournal(state, 'A condition shared with one person', state.notice, 'relationship');
      }
      break;
    case 'childhood_1':
      if (id === 'defend') { state.hero.attributes.presence++; skill(state, 'devotion'); remember(state, 'mira', 'At seven, you spoke up when I was falsely accused.', 15); }
      if (id === 'investigate') { state.hero.attributes.agility++; skill(state, 'survival'); remember(state, 'mira', 'You found the silver charm when no one believed me.', 13); }
      if (id === 'family') { state.hero.attributes.willpower++; skill(state, 'persuasion'); remember(state, 'mira', 'You asked a trusted adult to protect me.', 10); }
      state.flags.childhoodFriend = true;
      addJournal(state, 'A friendship at the wellside', state.companions[0].memories.at(-1), 'childhood');
      state.flags.childhoodStage = 1; state.age = 12; childhoodEvent(state);
      break;
    case 'childhood_2':
      if (id === 'scholarship') {
        skill(state, 'scholarship', 2); skill(state, 'arcana'); state.hero.gold += 20; state.flags.scholarship = true;
        addObligation(state, 'scholarship_service', 'Repay a service scholarship with a clinic shift', 35, 'Help at a settlement fever clinic. One three-day shift fulfills the promise and pays 10 gold.');
      } else if (id === 'apprentice') {
        skill(state, 'survival'); skill(state, 'persuasion'); state.hero.gold += 28; state.hero.profession = 'Herbalist'; state.flags.apprenticeship = true;
      } else {
        skill(state, 'weapons', 2); skill(state, 'defense'); state.flags.childhoodMentor = true; standing(state, 'order', 5);
      }
      addJournal(state, 'An education earned', id === 'scholarship' ? 'A service scholarship opened the academy through learning and a promise.' : id === 'apprentice' ? 'An apprenticeship taught practical skills and offered a way to earn a living.' : 'A retired guard taught discipline and introduced the local order.', 'childhood');
      state.flags.childhoodStage = 2; state.age = 17; childhoodEvent(state);
      break;
    case 'childhood_3':
      if (id === 'confess') { state.hero.attributes.willpower++; standing(state, 'academy', 8); state.flags.trustedTeacher = true; }
      if (id === 'question') { state.hero.attributes.intellect++; skill(state, 'scholarship'); state.flags.ancestralMentor = true; }
      if (id === 'hide') { skill(state, 'stealth', 2); standing(state, 'underworld', 5); state.flags.hiddenPage = true; remember(state, 'mira', 'You kept the forbidden page and did not explain why.', -2); }
      addJournal(state, 'A teacher’s question', id === 'confess' ? 'You spoke honestly about the disputed page. Your teacher trusts your account.' : id === 'question' ? 'You asked what the prohibition protected. A discreet teacher remembers the question.' : 'You hid the page. Your curiosity and your secrecy traveled together.', 'childhood');
      state.flags.childhoodStage = 3; state.phase = 'adult'; state.age = 18;
      state.hero.maxHp = 44 + state.hero.attributes.vitality * 3; state.hero.maxMp = 16 + state.hero.attributes.intellect * 3;
      state.hero.hp = state.hero.maxHp; state.hero.mp = state.hero.maxMp;
      state.notice = `Your adult life begins in ${location(state).name}. Work, learn, make time for people, and choose what to become. Mira can join you in any settlement.`;
      addJournal(state, 'Eighteen, and a life to make', `${state.notice} Your combat path is ${state.hero.path}; your ambition is “${state.hero.ambition}.”`, 'milestone');
      break;
    case 'apprenticeship': {
      const profession = { healer: 'Healer', merchant: 'Merchant', scholar: 'Scholar', herbalist: 'Herbalist', soldier: 'Soldier' }[id];
      if (state.life && state.hero.profession !== profession) { state.life.career.rank = 0; state.life.career.experience = 0; }
      state.hero.profession = profession; state.notice = `You begin work as a ${profession.toLowerCase()}. Your ${state.hero.path} path remains your way of fighting.`;
      addJournal(state, 'A profession alongside a path', state.notice, 'livelihood');
      break;
    }
    case 'companion_talk': {
      const personId = state.flags.socialTarget;
      if (id === 'listen') { skill(state, 'persuasion'); remember(state, personId, 'You listened carefully when I spoke about what matters to me.', 10); }
      if (id === 'principle') { state.hero.attributes.willpower++; remember(state, personId, 'You said your commitments should be visible and kept.', 8); }
      if (id === 'disagree') { skill(state, 'scholarship'); remember(state, personId, 'We disagreed, but you made room for my answer.', 2); }
      const person = state.companions.find(item => item.id === personId);
      addJournal(state, `An evening with ${person.name}`, person.memories.at(-1), 'relationship');
      state.notice = `${person.name} remembers how you answered.`;
      break;
    }
    case 'family_visit':
      if (id === 'time') { standing(state, 'villagers', 5); state.flags.familyHelped = true; }
      if (id === 'gift') { state.hero.gold -= 10; standing(state, 'villagers', 8); state.flags.familySupported = true; }
      if (id === 'confide') {
        state.flags.conditionDisclosed = true; state.flags.familyRefuge = true;
        if (witnesses(state).some(person => person.id === 'mira')) { state.flags.miraKnowsCondition = true; remember(state, 'mira', 'You trusted your family with your condition while I was there.', 3); }
      }
      if (id === 'stories') state.hero.attributes.presence++;
      state.notice = id === 'confide' ? 'Your family knows and offers refuge. No officials receive a report.' : 'Your family remembers that you came home and made time.';
      addJournal(state, 'Home still has your place', state.notice, 'family');
      break;
    case 'plague_letter':
      if (id === 'promise') { standing(state, 'villagers', 5); remember(state, 'mira', 'You promised to help when the fever reached home.', 5); }
      if (id === 'questions') { skill(state, 'scholarship'); state.flags.springClue = true; }
      if (id === 'later') remember(state, 'mira', 'You honestly said you needed time before promising aid.', 1);
      state.notice = `Consult the academy in ${city(state).name}, or help at a settlement clinic. Your hometown’s plea is in the journal.`;
      addJournal(state, 'A plea from the village', state.notice, 'story');
      break;
    case 'clinic':
      if (id === 'support') standing(state, 'villagers', 5);
      state.notice = `Your ledger is ready for the academy in ${city(state).name}.`;
      break;
    case 'academy_remedy':
      state.flags.plagueStage = 2; state.flags.fieldResearch = id !== 'research';
      if (id !== 'field') {
        state.flags.forbiddenResearch = true; state.flags.researchBorrowed = true;
        addObligation(state, 'return_research', 'Return the ancestral research original', 20, `Return the original in ${city(state).name}. Your notes and acquired knowledge remain yours.`);
      }
      state.notice = id === 'field' ? 'Gather herbs in the forest, then find the moonroot remedy.' : 'A willing ancestor at the ruin can reveal the cause. The forest remedy remains an alternative.';
      addJournal(state, 'A choice of research', `${state.notice} Choosing to learn in private creates no official evidence.`, 'story');
      break;
    case 'paladin_oath':
      if (id === 'decline') { state.notice = 'You leave with your martial training and your freedom. The order remains available.'; break; }
      state.flags.oathType = id;
      state.flags.oath = { mercy: 'Show mercy: never bind an unwilling soul or feed on an unwilling person.', truth: 'Speak and act honestly: do not deceive through theft, coerce souls, or prey on unwilling people.', protection: 'Protect the vulnerable: do not steal from others, prey on travelers, or bind an unwilling soul.' }[id];
      state.flags.oathBroken = false; trialEvent(state, 'paladin');
      break;
    case 'necromancer_ethics':
      if (id === 'decline') { state.notice = 'Your ordinary healing study continues. The ancestral teacher remains available.'; break; }
      if (id === 'bind') {
        state.flags.soulBound = true; addEvidence(state, 3, 'An ancestral teacher reported an unwilling soul binding.'); standing(state, 'academy', -12);
        learnCoercion(state, witnesses(state), 'I witnessed you binding an unwilling soul after your teacher explained consent.');
      }
      trialEvent(state, 'necromancer');
      break;
    case 'assassin_commission':
      if (id === 'decline') { state.notice = 'You refuse the commission. Your trained rogue skills remain.'; break; }
      state.flags.lethalCommission = id === 'lethal'; trialEvent(state, 'assassin');
      break;
    case 'initiation_trial':
      if (id === 'pause') { delete state.flags.pendingSpecialization; state.notice = 'You pause the initiation. Rest or train, then return to your teacher.'; }
      if (id === 'combat') {
        if (isIronman(state) && state.flags.pendingSpecialization === 'paladin') {
          const context = paladinTrialContext(state);
          if (!context || state.hero.hp < 20 || !activeEvent.choices.some(item => item.id === 'combat' && !item.disabledReason)) {
            state.event = activeEvent; state.notice = 'The supervised Paladin trial no longer matches this living oath and place. No battle has begun.'; break;
          }
          beginBattle(state, 'initiation', context);
        } else beginBattle(state, 'initiation');
      }
      if (id === 'service') {
        if(state.flags.legacyMentorTrial&&state.flags.legacyMentorTrial.classId===state.flags.pendingSpecialization){continueLegacyMentorField(state,engineContext(state,{annual:true}));break;}
        spendDays(state, 4);
        if (state.flags.pendingSpecialization === 'assassin' && state.flags.lethalCommission) {
          state.flags.lethalCommission = false;
          remember(state, 'kest', 'You chose surveillance after considering a lethal commission.', 5);
        }
        awardSpecialization(state, state.flags.pendingSpecialization);
      }
      break;
    case 'ancestor_remedy':
      if (id === 'withdraw') { state.flags.fieldResearch = true; state.notice = 'The circle closes peacefully. Gather herbs and follow the living moonroot route.'; break; }
      state.flags.plagueStage = 3; state.flags.remedyMethod = 'ancestral'; state.flags.knowsAncestralRite = true;
      if (id === 'bind') {
        skill(state, 'arcana', 2); state.flags.soulBound = true;
        learnCoercion(state, witnesses(state), 'I witnessed you binding unwilling souls at the spring instead of respecting their consent.');
        breakOath(state, 'You bound unwilling souls to force answers.');
      } else {
        for (const person of state.companions.filter(item => item.recruited && item.active)) remember(state, person.id, 'You asked a willing ancestor for help and respected the other resting souls.', person.id === 'orrin' ? 10 : 5);
        if (id === 'license') { state.flags.licensedReport = true; standing(state, 'academy', 8); }
      }
      state.notice = `The keeper reveals a cracked ash-cistern beneath the spring. Prepare the remedy and return to ${home(state).name}.`;
      addJournal(state, 'The dead remembered the living', `${state.notice} ${id === 'bind' ? 'You chose coercion, and your companions remember the cost.' : 'A willing ancestral voice identified the cause. No official report appears simply because you learned the rite.'}`, 'story');
      break;
    case 'vampire_offer':
      if (id === 'accept') {
        if (state.hero.condition) { state.event = activeEvent; state.notice = 'Only one major supernatural condition can be active.'; return state; }
        contractCurse(state,'vampire','The twilight patron left a blood-bearing bite',engineContext(state),'velvet_sepulchre');settleNightInvitation(state,'vampire','accepted'); state.hero.condition.reserveGranted=6; state.hero.maxMp += 6; state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + 6); state.flags.vampireAccepted = true;
        for (const person of witnesses(state)) {
          remember(state, person.id, 'I was present when you accepted the twilight bargain and learned to live with hunger.', 0);
          if (person.id === 'mira') state.flags.miraKnowsCondition = true;
        }
        state.notice = 'The bite begins a three-day fever. It can still be cleansed before transformation; afterward, hunger, daylight and the regional curse law govern the changed life.';
        addJournal(state, 'The twilight bargain', state.notice + ' Your existing profession and relationships continue.', 'condition');
      } else if (id === 'decline') { state.flags.vampireDeclined = true; settleNightInvitation(state,'vampire','declined'); state.notice = 'You choose mortal life. The patron respects the decision.'; }
      else {settleNightInvitation(state,'vampire','deferred');state.notice = nightInvitation(state,'vampire')?'The invitation remains in your Journal. Return to the remembered place and look after dusk; the traveler may be absent.':'The invitation remains. You have time to decide.';}
      break;
    case 'vampire_feeding':
      if (id === 'donor') { state.hero.gold -= 8; const relief=feedBlood(state,'donor',activeEvent.choices.find(c=>c.id===id)?.meal?.baseAmount??50,engineContext(state)); state.notice = `A willing donor lowered hunger by ${relief}. The 8-gold meal created no report.`; }
      if (id === 'animal') { const relief=feedBlood(state,'animal',activeEvent.choices.find(c=>c.id===id)?.meal?.baseAmount??28,engineContext(state)); state.notice = `Animal blood lowered hunger by ${relief}; no person was harmed.`; }
      if (id === 'predation') {
        feedBlood(state,'predation',70,engineContext(state)); recordCurseExposure(state,engineContext(state),'A traveler identified you after an unwilling feeding.',3); standing(state, 'villagers', -15);
        state.flags.conditionDiscovered = true;
        for (const person of witnesses(state)) remember(state, person.id, 'I saw you take blood from an unwilling traveler despite having alternatives.', person.id === 'mira' ? -25 : -20);
        breakOath(state, 'You fed on an unwilling traveler.');
        state.notice = 'Hunger falls, but an identified witness reports the assault. Three local evidence are recorded.';
      }
      if (id === 'abstain') state.notice = 'You abstain. Your current hunger remains visible.';
      if (id !== 'abstain') addJournal(state, 'How you lived with hunger', state.notice, 'condition');
      break;
    case 'plague_homecoming': {
      state.flags.plagueStage = 4; state.flags.villageSaved = true; finishObligation(state, 'plague_return');
      standing(state, 'villagers', state.flags.plagueDelay ? 20 : 30); state.hero.gold += 35; earnExperience(state, 40);
      if (id === 'open') {
        state.flags.publicNecromancy = state.flags.remedyMethod === 'ancestral';
        if (state.flags.publicNecromancy && state.flags.soulBound) addEvidence(state, 3, 'A clinic witness reported your disclosed unwilling soul binding.');
        else if (state.flags.publicNecromancy && home(state).necromancyLaw === 'forbidden') addEvidence(state, 2, 'A clinic witness reported your disclosed ancestral rite.');
        else standing(state, 'academy', 10);
        remember(state, 'mira', 'You came home with a cure and gave an open account of the method.', 15);
        if (state.flags.soulBound && !state.flags.miraWithdrawn) learnCoercion(state, [state.companions[0]], 'You told me at homecoming that you bound unwilling souls. I cannot travel with that choice.');
      } else if (id === 'private') {
        state.flags.miraKnowsResearch = true; remember(state, 'mira', 'You trusted me privately with how you found the cure.', state.flags.soulBound ? -8 : 12);
        if (state.flags.soulBound && !state.flags.miraWithdrawn) learnCoercion(state, [state.companions[0]], 'You privately told me you bound unwilling souls. I cannot travel with that choice.');
      } else {
        remember(state, 'mira', 'You helped the village but kept me at a distance about the method.', -5);
        if (state.flags.oathType === 'truth') breakOath(state, 'You concealed your method during an honest inquiry you had sworn to answer.');
      }
      for (const person of state.companions.filter(item => item.recruited && item.active)) remember(state, person.id, 'We returned together and helped the village survive Ashfall fever.', 8);
      state.notice = 'The fever breaks. Villagers collect 35 gold for your work; gratitude and any known legal questions both persist.';
      addJournal(state, 'Homecoming after the Ashfall', `${state.notice} Your remedy used ${state.flags.remedyMethod === 'ancestral' ? 'ancestral testimony' : 'licensed moonroot fieldwork'}. You ${id === 'open' ? 'spoke openly' : id === 'private' ? 'trusted Mira in private' : 'kept your method quiet'}.`, 'milestone');
      setEvent(state, 'homecoming_aftermath', 'The next morning belongs to you', 'Life continues',
        `${state.hero.profession === 'Unemployed' ? 'The guild still has apprenticeships to offer.' : `Your ${state.hero.profession.toLowerCase()} work is waiting.`} Your neighbors are grateful, ${state.flags.miraWithdrawn ? 'Mira still refuses to excuse the unwilling soul binding she learned about,' : 'Mira is considering the account you shared,'} and the academy ${state.flags.researchBorrowed ? 'still expects its borrowed original back.' : 'remembers your work.'} No universal label declares you a hero or a villain. The next commitment is yours.`, [
          choice('continue', 'Return to the life I am building', 'Keep playing with all relationships, knowledge, conditions, and consequences intact.'),
          choice('chronicle', 'Write the chronicle and settle down', 'Retire into your chosen livelihood and review the life the world remembers.'),
        ]);
      break;
    }
    case 'homecoming_aftermath':
      if (id === 'chronicle') retire(state);
      else state.notice = 'Your life continues. There are people to see, work to do, and choices still yours.';
      break;
    case 'orrin_request':
      if (id === 'promise') addObligation(state, 'companion_request', 'Give Orrin’s sister a rest day', 16, 'Help at any settlement fever clinic beside Orrin.');
      else remember(state, 'orrin', 'You were honest about the time you could offer my family.', 4);
      state.notice = id === 'promise' ? 'Orrin’s request appears among your obligations, due in 16 days.' : 'Orrin accepts an honest answer. No deadline is created.';
      break;
    case 'retirement': if (id === 'settle') retire(state); else state.notice = 'Your life is still unfolding.'; break;
    default: state.notice = 'The moment passes, and you return to your life.';
  }
  if(terminalRun(state))return copy(state);
  recordPlanGold(state, goldBeforeChoice);
  if (state.phase === 'adult') return afterAction(state);
  return copy(state);
}

function retire(state, reason='retirement') {
  closeTournamentForLife(state);
  settleHouseholdBudget(state,engineContext(state),true);
  const questRecord=closeQuestAccounts(state,reason);closeResearchLife(state);closeFamilyOrigins(state);closeRegionalLife(state);closeCountingTableLife(state);
  state.phase = 'retired'; state.event = null; state.battle = null;
  const hero = state.hero;
  const life = [
    `${hero.name}’s chronicle`,
    `Born in ${state.world.locations.find(p=>p.id===hero.birthplaceId)?.name || (hero.origin === 'city' ? city(state).name : home(state).name)} to a ${hero.household === 'poor' ? 'struggling' : hero.household === 'noble' ? 'noble' : 'working'} household, your childhood and education shaped a life of your own.`,
    `At age ${state.age}, you closed this chapter as ${hero.profession === 'Unemployed' ? 'a person still free to find a calling' : `${withArticle(hero.profession.toLowerCase())}`}${hero.specialization ? `, with the training of a ${hero.specialization}` : ''}. Your ambition was “${hero.ambition}.”`,
  ];
  if (state.flags.villageSaved) life.push(`You helped ${home(state).name} survive Ashfall fever through ${state.flags.remedyMethod === 'ancestral' ? 'ancestral testimony' : 'careful moonroot fieldwork'}. ${state.flags.publicNecromancy ? 'The neighbors know how the cure was found.' : 'The public account leaves some of the method private.'}`);
  else life.push(`The region’s fever remained part of the world you lived in. You gave ${state.flags.clinicShifts} clinic shift${state.flags.clinicShifts === 1 ? '' : 's'} to its people.`);
  if (state.flags.certified) life.push('The academy recognized your learning with a certificate.');
  if (state.flags.shrineRestored) life.push('The restored village shrine remained a refuge.');
  if (state.flags.roadSafe) life.push('Travelers remember that you made the western road safer.');
  if (hero.specialization === 'paladin') life.push(`Your oath was: ${state.flags.oath} It ${state.flags.oathBroken ? 'remained broken when you stepped away' : 'still guided your life'}.`);
  if (state.flags.soulBound) life.push('You bound an unwilling soul; knowledge and power did not erase the damage to trust.');
  if (hero.condition?.type === 'vampire') life.push(`You settled into a life after sunset, living with vampiric hunger ${hero.condition.hunger}/100. ${state.flags.conditionDisclosed ? 'Your family knew and offered refuge.' : 'Some of that life remained secret.'}`);
  else if (hero.condition?.type === 'lycanthrope') life.push(`You learned to live with the changing moon, with control ${hero.condition.control}/100. ${state.flags.lycanDiscovered ? 'A witnessed night made part of that life public.' : 'Your preparations remained private except to those you trusted.'}`);
  else if (state.flags.vampireCured) life.push('You found your way back to mortal life and saw the sunrise without fear.');
  if (state.flags.lycanCured) life.push('You found a moonbound cure and kept the skills and memories of that life.');
  if (state.life) {
    const recordedYears=new Set([...(state.timeline?.yearHistory||[]),...state.life.yearHistory].map(y=>y.age)).size;
    life.push(`You made a home in ${state.life.home.tier === 'lodgings' ? 'modest lodgings' : `a ${state.life.home.tier}`}, developed your career to rank ${state.life.career.rank}, and recorded ${recordedYears} year${recordedYears === 1 ? '' : 's'} of changing priorities.`);
    const partner = state.life.people.find(person => person.id === state.life.partnerId);
    if (partner) life.push(`${partner.name} shared your household. ${partner.memories.slice(-2).join(' ')}`);
    if (state.life.children.length) life.push(`Your family grew to include ${state.life.children.map(child => child.name).join(', ')}.`);
    const fulfilled = state.life.goals.filter(goal => goal.completed);
    if (fulfilled.length) life.push(`Your personal achievements included ${fulfilled.map(goal => goal.label.toLowerCase()).join(', ')}.`);
  }
  const profession=state.careers?.records[hero.profession];
  if(profession?.workedDays)life.push(`Your ${hero.profession.toLowerCase()} life included ${profession.workedDays} working days, ${profession.commissions} fulfilled commissions, and ${profession.earnedGold} gold earned through recorded work.`);
  if(state.careers?.shop)life.push(`${state.careers.shop.name} stood in ${state.world.locations.find(p=>p.id===state.careers.shop.locationId)?.name}. Its colleagues and surviving property remained part of the household estate.`);
  const signedWorks=state.careers?.masterworks.filter(w=>w.authorName===hero.name)||[];
  if(signedWorks.length)life.push(`The work bearing your name included ${signedWorks.map(w=>w.name).join(', ')}.`);
  if(state.householdBudget?.billedGold)life.push(`Your household's recorded living costs totalled ${state.householdBudget.billedGold} gold${state.householdBudget.supportedGold?`, with ${state.householdBudget.supportedGold} gold of communal support during difficult periods`:''}.`);
  if(state.campaign?.ending)life.push(state.campaign.ending.summary);
  for (const person of state.companions.filter(item => item.recruited || item.memories.length)) {
    life.push(`${person.name} ${person.relationship >= 25 ? 'remained close' : person.relationship < 0 ? 'kept a wounded distance' : 'shared part of your road'}. ${person.memories.slice(-2).join(' ')}`);
  }
  const missed = state.obligations.filter(item => item.missed).length;
  const kept = state.obligations.filter(item => item.resolved && !item.missed).length;
  life.push(`You kept ${kept} recorded promise${kept === 1 ? '' : 's'}${missed ? ` and missed ${missed}` : ''}. ${state.legal.incidents.length ? 'Some settlements still held evidence of your choices.' : 'No unresolved local charge followed you into retirement.'}`);
  if(questRecord)life.push(questRecord);
  state.chronicle = life.join('\n\n');
  if(reason!=='retirement')state.chronicle+=`\n\n${hero.name} died at age ${state.age}. ${reason} Their family and the world they changed remain.`;
  state.notice = 'Your chronicle is ready. This life remains saved for reading.';
  if (hero.station) {
    // The book closes with an epitaph that judges the life against what it set out to do.
    state.epitaph = epitaph(state, reason);
    addJournal(state, 'The book closes', state.epitaph, 'chronicle');
  } else addJournal(state, reason==='retirement'?'A quieter life, freely chosen':'The final page of a life', `This chapter closed at age ${state.age}, on world day ${state.day}. Your story belongs to the choices you made.`, 'chronicle');
  if(state.revision>=5)completeLineageHistory(state,reason);
}

function endLife(state, cause) {
  if (state.phase === 'retired') return;
  archiveStoryMazeAtLifeEnd(state);
  retire(state,cause);
  state.dungeon=null;
  if(state.timeline){state.timeline.journey=null;state.timeline.yearTarget=null;}
  if(state.travel)state.travel.pending=null;
  if(state.yardTournament){const t=state.yardTournament;t.pending=null;if(t.stage!=='finished'){t.stage='finished';t.outcome='withdrawn';t.finishedDay=state.day;}}
  for(const key of ['family','education','lore','careers','campaign','health'])if(state[key])state[key].pending=null;
  if(state.workshop)state.workshop.project=null;
  if(state.careers)state.careers.batch=null;
  if(state.conversations)state.conversations.pending=null;
  if(state.life)state.life.plan=null;
  if(state.health)state.health.recovery=null;
  if(state.stories){state.stories.project=null;state.stories.pending=null;}
  if(state.rpg){state.rpg.project=null;state.rpg.pending=null;state.rpg.expedition=null;state.rpg.propertyBattle=null;}
  for(const key of ['society','community','fellowship','sanctuaries','social','pastimes','repertoire','justice'])if(state[key]){state[key].pending=null;if(state[key].project)state[key].project=null;if(state[key].commitment)state[key].commitment=null;}
  state.maze=null;
  if(state.adventuring){state.adventuring.expedition=null;state.adventuring.raid=null;state.adventuring.claim=null;}
  if(state.cartography)state.cartography.pending=null;
  if(state.justice){state.justice.prison=null;state.justice.arrest=null;}
  if(state.lineage?.adoption)state.lineage.adoption.preparation=null;
  if(state.flags.legacyMentorTrial&&!['recognized','withdrawn'].includes(state.flags.legacyMentorTrial.stage)){state.flags.legacyMentorTrial.stage='withdrawn';delete state.flags.pendingSpecialization;}
  if(state.lineage)state.lineage.heroDeath={day:state.day,cause:String(cause),age:state.age};
  state.notice=`${state.hero.name}’s life has ended. Their family and legacy remain.`;
  addJournal(state,'A life remembered',`${cause} This is the end of ${state.hero.name}’s life, at age ${state.age}. A living child may continue the family story.`,'legacy');
}

export function continueAsChild(original, childId) {if(terminalRun(original))return copy(original);
  if(original.revision<5||original.phase!=='retired')return {...copy(original),notice:'Close this chapter before continuing as a child.'};
  const next=createSuccessor(original,childId,createBirthGame);
  if(next){initializeHouseholdBudget(next,{reset:true,edition:original.householdBudget?.debt!==undefined});if(original.fortune)initializeFortune(next);initializeConversations(next);inheritRpg(next,original);inheritStoryMazes(next,original);settlePublicRoster(next,{migration:true});}
  return next && next !== false && validateSave(next) ? next : {...copy(original),notice:'That child cannot continue this family story.'};
}

export function updateTravelPlan(original, values) {if(terminalRun(original))return copy(original);
  const state=copy(original);
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition){state.notice='Road preparations wait until you return.';return state;}
  if(state.revision<5||state.timeline?.journey||state.battle||state.event||state.dungeon||state.workshop?.project||state.careers?.batch||experienceModule(state)||state.life?.plan||state.conversations?.pending||state.phase==='retired'){state.notice='Choose preparations before starting your journey.';return state;}
  if(!setTravelPlan(state,values))return {...copy(original),notice:'Finish your current commitment before changing the road plan.'};
  state.notice='Your next journey will use these preparations. Costs are paid only on departure.';
  return state;
}

function beginBattle(state, encounterId, context = null) {
  state.battle = createBattle(state, encounterId, context);
  state.flags.battlesStarted = (state.flags.battlesStarted || 0) + 1;
  state.battle.instanceId = `battle-${state.seed}-${state.flags.battlesStarted}`;
  if (context) state.battle.context = copy(context);
  if (!applyIronmanBattleMortality(state)) throw new Error('The captured combat mortality does not match this run.');
}

/** Only accepted engine boundaries install detached combat consequences. No
 * storage, revival or ordinary battle settlement occurs in this helper. */
function applyIronmanBattleMortality(state) {
  if (!isIronman(state)) return true;
  const battle = state.battle;
  if (!battle || !validateBattleMortality(battle, state)) return false;
  const deaths = ironmanBattleDeaths(state, battle);
  for (const casualty of deaths) {
    if (!killCurrentCompanionPerson(state, casualty.personId, 'Killed in ' + battle.title, engineContext(state), casualty.day)) return false;
    state.ironman.casualties.push(casualty);
  }
  if (ironmanHeroDeath(state)) state.notice = `${state.hero.name} died in combat. This Ironman run has ended.`;
  return validateIronman(state) && validateBattleMortality(battle, state);
}

export function planYear(original, config = {}) {if(terminalRun(original))return copy(original);
  if(original.cartography?.offsite||original.cartography?.pending)return {...copy(original),notice:'Return to a named place before planning a year.'};
  const state = original.revision < 4 && original.phase === 'adult' ? migrateSave(original) || copy(original) : copy(original);
  if (state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition||birthMode(state) || state.phase !== 'adult' || waiting(state) || state.dungeon || state.timeline?.journey || state.workshop?.project || experienceModule(state)) {
    state.notice = birthMode(state) ? 'Use Age up to continue this life.' : 'Finish the current situation before planning a year.';
    return state;
  }
  if (!state.life) initializeLife(state);
  state.notice = '';
  startYearPlan(state, config, engineContext(state, { annual: true }));
  return afterAction(state);
}

export function continueYear(original) {if(terminalRun(original))return copy(original);
  if(original.cartography?.offsite||original.cartography?.pending)return {...copy(original),notice:'Complete your crossing and return to a named place before resuming a year.'};
  const state = copy(original);
  if (state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition||state.phase !== 'adult' || waiting(state) || state.dungeon || state.timeline?.journey || state.workshop?.project || experienceModule(state)) {
    state.notice = 'Finish the current decision or battle before continuing the planned year.';
    return state;
  }
  if (!state.life?.plan) { state.notice = 'Choose an annual focus and living standard first.'; return state; }
  state.notice = '';
  continueYearPlan(state, engineContext(state, { annual: true }));
  return afterAction(state);
}

export function updateAppearance(original, value) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  state.hero.appearance = normalizeAppearance(value);
  state.notice = 'Your appearance is updated. Your abilities, resources, relationships, and pending decisions remain as they were.';
  return state;
}

export function portraitSelectionReason(state) {
  if(terminalRun(state))return 'This Ironman run has ended in combat.';
  return state?.hero?.condition?.curseVersion===1&&state.hero.condition.stage==='changed'&&(state.hero.condition.type==='vampire'||state.hero.condition.form!=='human')?'Your transformed face follows hunger, humanity and the beast’s form. Your saved mortal portrait returns when the curse or transformation ends.':state?.battle?'Finish the encounter before changing your portrait.':state?.phase==='retired'?'This life’s portrait belongs to its recorded history. Continue as an heir to choose their face.':'';
}
function saveHeroPortrait(state,appearance) {
  state.hero.appearance=normalizeAppearance(appearance);
  const record=state.lineage?.people.find(p=>p.id===state.dynasty?.activePersonId);
  if(record)record.appearance=copy(state.hero.appearance);
}
export function selectCharacterPortrait(original,key) {if(terminalRun(original))return copy(original);
  const state=copy(original),reason=portraitSelectionReason(state);
  if(reason){state.notice=reason;return state;}
  const appearance=selectPortrait(normalizeAppearance(state.hero.appearance),key,{age:state.age,condition:state.hero.condition,identity:state.hero.id||state.hero.name});
  if(!appearance){state.notice='That portrait belongs to another age, ancestry or heritage.';return state;}
  saveHeroPortrait(state,appearance);state.notice='Your portrait for this age is saved.';return state;
}
export function declareCharacterHeritage(original,id) {if(terminalRun(original))return copy(original);
  const state=copy(original),reason=portraitSelectionReason(state);
  if(reason){state.notice=reason;return state;}
  if(state.hero.appearance.heritageVersion===1){state.notice='Your heritage is already part of this life’s history.';return state;}
  if(!heritageById(id,state.hero.appearance.ancestry)){state.notice='Choose a heritage among your own people.';return state;}
  saveHeroPortrait(state,assignHeritage(normalizeAppearance(state.hero.appearance),id,state.seed+':heritage'));
  state.notice='Your family heritage is recorded in Character and Lore.';return state;
}

export function equipGear(original, id) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  const reason=equipmentActionReason(state);
  if (reason) {
    state.notice = reason;
    return state;
  }
  if (!state.equipment) initializeGear(state);
  state.notice = equipItem(state, id) ? 'Your equipment is ready for the next encounter. Base attributes remain your own.' : 'You must own this item before equipping it in its proper slot.';
  return state;
}

/** Local bookmarks do not advance the simulation. Rejected and no-op commands
 * preserve the exact input state; the shell displays unsaved feedback instead. */
export function gearOrganizerCommand(original,command) {
  if(terminalRun(original))return {ok:false,changed:false,state:original,reason:'This Ironman run has ended in combat.',issues:[]};
  if(!original||!command||typeof command!=='object')return {ok:false,changed:false,state:original,reason:'Choose a saved loadout or a carried item.',issues:[]};
  const {kind,id,label,expected}=command;
  if(kind==='apply') {
    const reason=equipmentActionReason(original);
    if(reason)return {ok:false,changed:false,state:original,reason,issues:[]};
  }
  const result=kind==='save'?saveGearPreset(original,id,label):kind==='rename'?renameGearPreset(original,id,label):kind==='replace'?replaceGearPreset(original,id,expected):kind==='delete'?deleteGearPreset(original,id,expected):kind==='favorite'?toggleGearFavorite(original,id):kind==='apply'?stageGearPreset(original,id):{ok:false,changed:false,reason:'That equipment bookmark command is not available.',issues:[]};
  if(!result.ok||!result.changed)return {...result,state:original};
  const state=copy(original);state.equipment=result.equipment;
  return {...result,state};
}

function partyPreparationReason(state) {
  if(terminalRun(state))return 'This Ironman run has ended in combat.';
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition)return 'Return from custody or the descent before changing party equipment.';
  if(!state)return 'Begin a life first.';
  if(state.cartography?.pending)return 'Finish this travel stretch before changing your equipment.';
  if(state.phase==='retired')return 'This chapter has closed; continue as a living child to prepare another journey.';
  if(!ageAllows(state,16))return 'Equipment and traveling companions become available at age 16.';
  if(waiting(state))return 'Finish the current decision, conversation or battle first.';
  if(state.dungeon)return 'Return from the expedition before changing your preparations.';
  if(state.timeline?.journey)return 'Complete the current road journey before changing your preparations.';
  if(state.workshop?.project||state.careers?.batch||state.life?.plan||experienceModule(state))return 'Finish or cancel your current commitment before changing your preparations.';
  return null;
}
export function equipmentActionReason(state) { return partyPreparationReason(state); }
export function companionActionReason(state,id,mode='recruit') {
  if(terminalRun(state))return 'This Ironman run has ended in combat.';
  const independent=state.rpg?.companionStages[id];if(independent&&['away','departed','dead'].includes(independent.status))return independent.status==='away'?'This companion is attending their own work until day '+independent.awayUntil+'.':'This companion is no longer available to your party.';
  if(state.cartography?.offsite)return 'Meet companions at a named place before changing your traveling circle.';
  const barrier=partyPreparationReason(state);if(barrier)return barrier;
  const person=state.companions.find(p=>p.id===id);
  if(!person)return 'You do not know this person.';
  if(person.alive===false)return `${person.name} is remembered in your family's history.`;
  if(mode==='toggle') {
    if(!person.recruited)return 'Invite this person to travel before adding them to the party.';
    if(!person.active&&id==='mira'&&state.flags.miraWithdrawn)return `${person.name} remembers the unwilling binding and refuses active travel.`;
    if(!person.active&&personalReadiness(state,id))return personalReadiness(state,id);
    if(!person.active&&state.companions.filter(p=>p.active&&p.alive!==false).length>=3)return 'The active party has room for three companions.';
    return null;
  }
  if(person.recruited)return `${person.name} already belongs to your traveling circle.`;
  if(id==='mira'&&state.flags.miraWithdrawn)return `${person.name} refuses to travel after the unwilling soul binding. Their stated limit remains in memory.`;
  if(['mira','orrin'].includes(id)&&!isSettlement(state.world,state.locationId))return `${person.name} can meet you at a surviving settlement.`;
  if(id==='kest'&&!['forest','brook','city',...(birthMode(state)?['camp','sanctuary']:[])].includes(state.locationId))return `${person.name} is available at the forest road, riverside village, or city.`;
  return null;
}

function enableRoleplayUpdates(state) {
  initializeTravelEnergy(state); initializeMaze(state); initializeSocialLife(state);
  initializeQuestJournal(state);
  initializeUpbringing(state);
  initializeGear(state);
  state.worldServicesVersion=1;
  state.characterDialogueVersion=28;
  initializePersonalityDecision(state);
  if(state.timeline&&!state.timeline.roleplayVersion&&!state.timeline.nextRoleplayVersion) {
    if(state.event?.id.startsWith('birth_'))state.timeline.nextRoleplayVersion=1;
    else state.timeline.roleplayVersion=1;
  }
  if(state.progression&&!state.progression.trialVersion&&!state.progression.nextTrialVersion) {
    if(state.progression.pendingCalling)state.progression.nextTrialVersion=1;
    else state.progression.trialVersion=1;
  }
  initializeHouseholdBudget(state);
  initializeFamilyOrigins(state);initializeFamilyDepth(state);initializeSociety(state,{migration:true});initializeCommunity(state,{migration:true});initializeFellowship(state,{migration:true});initializeSanctuaries(state,{migration:true});
  initializeSocial(state,{migration:true});initializePastimes(state,{migration:true});initializeLifeStories(state);
  initializeCurse(state);initializeRealm(state);initializeJustice(state);initializeAdventuring(state);initializeCartography(state,{migration:true});initializeRegionalWorld(state);initializeRpg(state,{migration:true});
  if(state.timeline?.mode==='birth' && (state.timeline.contentVersion||4)<7) {
    if(state.event?.id.startsWith('birth_'))state.timeline.nextContentVersion=7;
    else state.timeline.contentVersion=7;
  }
  // This retired permission prompt made no commitment. Dismiss it without choosing for the player.
  if(state.event?.id==='quest_decline'){state.event=null;state.notice='';}
  const existingNarrative=state.narrativeEdition===30;
  upgradeNarrative(state); // Captured pending dialogue and its replies remain the player's original exchange.
  if(existingNarrative)repairStoryMazeContactJournal(state);
  learnQuestDirections(state);
  settlePublicRoster(state,{migration:true});
}


export function migrateSave(value) {
  if (!validateSave(value)) return null;
  const state = copy(value);
  if (state.revision === 5) {enableRoleplayUpdates(state);normalizeInfantObservation(state);return validateSave(state)?state:null;}
  if (!(state.revision >= 2)) {
    state.difficulty = ['gentle', 'balanced', 'perilous'].includes(state.difficulty) ? state.difficulty : 'balanced';
    state.hero.legacyAppearance = copy(state.hero.appearance);
    state.hero.appearance = normalizeAppearance(state.hero.appearance);
    state.hero.temperament = TEMPERAMENTS.includes(state.hero.temperament) ? state.hero.temperament : 'curious';
    state.hero.belief = BELIEFS.includes(state.hero.belief) ? state.hero.belief : 'lantern';
    state.hero.pronouns = PRONOUNS.includes(state.hero.pronouns) ? state.hero.pronouns : 'they/them';
    initializeGear(state); initializeLife(state, { migration: true });
  }
  if (!(state.revision >= 3)) {
    state.world = expandWorld(state.world, state.seed);
    initializeTimeline(state, { migration: true });
    initializeProgression(state, { migration: true }); initializeConversations(state);
    initializeCampaign(state, { migration: true }); initializeExploration(state);
  }
  state.revision = 4;
  initializeHousehold(state, { migration: true }); initializeWorkshop(state, { migration: true });
  initializePreferences(state, { migration: true }); initializeLore(state, { migration: true });
  state.revision=5;
  initializeCareers(state,{migration:true});initializeHealth(state,{migration:true});initializeTravel(state,{migration:true});initializeLineage(state,{migration:true});
  if(state.timeline){if(state.event?.id.startsWith('birth_'))state.timeline.nextContentVersion=6;else state.timeline.contentVersion=6;}
  enableRoleplayUpdates(state);
  normalizeInfantObservation(state);
  return validateSave(state) ? state : null;
}

function normalizeInfantObservation(state){
  suppressEarlyCorrespondence(state);
  if(!observationalInfancy(state))return;
  state.event=observationalCareEvent(state,observationalBirthEvent(state,state.event));
  if(state.conversations?.pending)state.conversations.pending=null;
  if(state.event?.id==='family_dilemma'){
    state.event=null;if(state.family)state.family.pending=null;
    state.notice='Your caregivers tend to the household while you watch and grow.';
  }
}

function resumeRoad(state) {
  const j = state.timeline.journey;
  if (!j) return state;
  const ctx = engineContext(state, { annual: true });
  while (j.legIndex < j.route.length - 1 && !waiting(state)) {
    if (pendingNeed(state)) { reconcile(state); break; }
    const from = j.route[j.legIndex], to = j.route[j.legIndex + 1];
    const road = state.world.roads.find(r => [r.from, r.to].includes(from) && [r.from, r.to].includes(to));
    const legIndex=j.legIndex, leg=j.legs?.[legIndex], totalDays=leg?.totalDays??road.days;
    const step=j.energyVersion===1&&j.legProgress<totalDays?progressTravelStep(state,j,ctx):null;
    const actual=step?step.distance:j.legProgress>=totalDays?0:ctx.spendDays(totalDays-j.legProgress,{outdoors:true,night:j.plan?j.plan.night:state.flags.travelByNight});
    if(state.phase==='retired')return afterAction(state);
    j.legProgress += actual;
    if(actual>0||j.energyStep?.progress)observeRoadCountry(state,from,to,(j.legProgress+(j.energyStep?j.energyStep.progress/j.energyStep.totalDays:0))/totalDays);
    if(pendingNeed(state)||birthMode(state)&&(state.day-birthDay(state))%365===0&&!state.timeline.yearHistory.some(y=>y.id===birthdayId(state)))afterAction(state);
    if(state.revision>=5&&!waiting(state)&&(actual>0||j.legProgress>0))onTravelLeg(state,{actualDays:actual||j.legProgress,legIndex},ctx);
    if(waiting(state)||state.travel?.pending)break;
    if (j.legProgress >= totalDays) {
      j.legIndex++; j.legProgress = 0; j.traversedIds.push(to); state.locationId = to; learnRoadDirections(state);
      if (j.legIndex === j.route.length - 1) {
        const elapsed = state.day - j.startedDay;
        state.timeline.lastJourney = { route: [...j.route], day: state.day };
        state.timeline.journey = null;
        recordFirstMissionArrival(state,from);
        state.notice = `The road brings you to ${location(state).name}. ${elapsed} days elapsed on this journey.`;
        addJournal(state, 'A road taken', state.notice, 'travel');
      }
    }
    reconcile(state);
    if(j.energyVersion===1||actual===0&&j.legIndex===legIndex||!state.timeline.journey||waiting(state))break;
  }
  if(state.timeline.journey&&!waiting(state))state.notice=j.energyVersion===1?'You stop beside the trail. Continue walking, or make camp to recover Focus.':'Your journey pauses for a visible need. Resolve it, then continue the same road.';
  return afterAction(state);
}
export function continueJourney(original) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if (!state.timeline?.journey || waiting(state) || state.dungeon || !ageAllows(state, 14)) { state.notice = 'Finish the waiting decision before continuing a road journey.'; return state; }
  delete state.flags.hungerPauseDay;
  return resumeRoad(state);
}
/** One destination contract for the map and its command. Old road payments and
 * partially attended crossings continue through their original resolvers. */
export function exploreTravelPreview(state, destinationId) {
  const site=state?.world?.locations.find(p=>p.id===destinationId);
  let disabledReason=null;
  if(!site||!state.cartography?.sites[destinationId])disabledReason='Choose a place on your known map.';
  else if(state.phase==='retired')disabledReason='This life’s travelling chapter has ended.';
  else if(!ageAllows(state,14))disabledReason='Independent travel begins at age 14.';
  else if(waiting(state))disabledReason='Finish the current decision before setting out.';
  else if(state.justice?.prison)disabledReason='You must leave custody before travelling.';
  else if(state.maze||state.delve||state.dungeon||state.rpg?.expedition||state.adventuring?.expedition)disabledReason='Leave the dungeon before setting out.';
  else if(state.timeline?.journey||state.cartography?.route)disabledReason='Continue your journey, or stop before choosing another destination.';
  else if(state.cartography?.pending)disabledReason='Finish the current stretch, or turn back before choosing a destination.';
  else if(state.workshop?.project)disabledReason='Finish or cancel your workshop project in Activities.';
  else if(state.careers?.batch)disabledReason='Finish or end your current work in Activities.';
  else if(experienceModule(state))disabledReason='Finish or withdraw from your current commitment in Today.';
  else if(state.life?.plan)disabledReason='Finish your current year in Today before setting out.';
  if(!site)return {mode:'road',route:[],days:0,baseDays:0,risk:0,disabledReason};
  if(!state.cartography?.offsite){
    const p=travelPlanPreview(state,destinationId);
    return {...p,mode:'road',disabledReason:disabledReason||p.disabledReason||null};
  }
  const atlas=hexAtlas(state),keys=planHexRoute(state,atlas.sites[destinationId]);
  const baseDays=keys?.slice(1).reduce((sum,key)=>{const c=atlas.byKey[key];return sum+(c.ferry?2:c.road?1:({mountain:3,marsh:2,forest:2}[c.terrain]||1));},0)||0;
  return {mode:'trail',route:[],keys:keys||[],baseDays,days:state.trail?travelEnergyForecast(state,baseDays).days:baseDays,cost:0,risk:travelEnergyView(state).danger,disabledReason:disabledReason||(!keys?'No passable route reaches this place.':null)};
}
export function startExploreJourney(original,destinationId) {if(terminalRun(original))return copy(original);
  const preview=exploreTravelPreview(original,destinationId);
  if(preview.disabledReason)return {...copy(original),notice:preview.disabledReason};
  if(preview.mode==='road')return travelTo(original,destinationId);
  const planned=chooseAction(original,'atlas_plan_'+destinationId);
  if(planned.cartography?.route?.destination!==destinationId)return planned;
  return chooseAction(planned,'atlas_route_continue');
}
export function continueExploreJourney(original) {if(terminalRun(original))return copy(original);
  let state=original;
  // Attend a short stretch, rather than ask the player to click every terrain
  // cell. Rest, encounters, birthdays and real waypoints always take priority.
  for(let n=0;n<3;n++){
    let next;
    if(state.timeline?.journey)next=state.travel?.pending?.stage==='delay'?chooseAction(state,'travel_continue_response'):continueJourney(state);
    else {const id=state.cartography?.pending?'atlas_continue':state.cartography?.route?'atlas_route_continue':null;next=id?chooseAction(state,id):{...copy(state),notice:'Choose a destination to begin a journey.'};}
    const advanced=next.day>state.day;state=next;
    if(!advanced||waiting(state)||state.phase==='retired'||state.locationId!==original.locationId||state.day-original.day>=3||travelEnergyView(state).speed>1||!state.timeline?.journey&&!state.cartography?.route&&!state.cartography?.pending)break;
  }
  return state;
}
export function familiarJourneyReason(s){
 if(terminalRun(s)||waiting(s)||s.phase==='retired')return 'Resolve the current moment before continuing.';
 if(travelEnergyView(s).speed>1)return 'Rest before continuing a longer familiar stretch.';
 const c=s.cartography,atlas=c&&hexAtlas(s);let keys=[];
 if(c?.route)keys=c.route.keys.slice(c.route.index);
 else if(c?.pending)keys=[c.pending.from,c.pending.to];
 else if(s.timeline?.journey){const j=s.timeline.journey;for(let i=j.legIndex;i<j.route.length-1;i++){const path=atlas.roadPaths.find(p=>p.from===j.route[i]&&p.to===j.route[i+1]||p.to===j.route[i]&&p.from===j.route[i+1]);if(!path)return 'This road has no recorded route.';keys.push(...path.cells);}}
 if(!keys.length)return 'Choose a journey first.';
 return keys.every(k=>c.cells[k]?.kind==='Visited')?null:'This route includes country you have not personally traversed. Continue one short stretch at a time.';
}
export function continueFamiliarJourney(original){
 const reason=familiarJourneyReason(original);if(reason)return {...copy(original),notice:reason};
 let state=original;const health=JSON.stringify([state.health?.physical,state.health?.mental]);
 for(let n=0;n<2;n++){
  if(familiarJourneyReason(state)||state.day-original.day>=4)break;
  const next=continueExploreJourney(state),advanced=next.day>state.day;state=next;
  if(!advanced||waiting(state)||state.age!==original.age||state.locationId!==original.locationId||JSON.stringify([state.health?.physical,state.health?.mental])!==health)break;
 }
 if(state!==original){const delta=state.hero.gold-original.hero.gold;state.notice=`Familiar journey: ${state.day-original.day} actual days · Gold ${delta>=0?'+':''}${delta} including living costs · Focus ${state.hero.mp}/${state.hero.maxMp}. ${state.notice||'The saved route remains available; choose when to continue or rest.'}`;}
 return state;
}
export function stopExploreJourneyReason(s) {
  if(terminalRun(s))return 'This Ironman run has ended in combat.';
  if(waiting(s)||s.travel?.pending)return 'Finish the current encounter before stopping.';
  if(s.cartography?.pending)return 'Finish this stretch before changing your destination.';
  const j=s.timeline?.journey;
  if(j&&(j.legProgress!==0||j.energyStep))return 'Reach the next waypoint before stopping.';
  return j||s.cartography?.route?null:'There is no journey to stop.';
}
export function stopExploreJourney(original) {if(terminalRun(original))return copy(original);
  const state=copy(original),reason=stopExploreJourneyReason(state);
  if(reason){state.notice=reason;return state;}
  if(state.timeline?.journey){
    state.timeline.journey=null;
    state.notice='You stop at '+location(state).name+'. Your travelled days and any departure payment remain spent.';
  }else {state.cartography.route=null;state.notice='You stop along the trail. Choose another destination when you are ready.';}
  addJournal(state,'A Journey Paused',state.notice,'travel');
  return afterAction(state);
}
export function travelTo(original, locationId) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  if(state.cartography?.offsite||state.cartography?.pending){state.notice='Complete your crossing and return to a named place before taking a road journey.';return state;}
  if(state.maze||state.delve||state.rpg?.expedition||state.justice?.prison||state.adventuring?.expedition){state.notice='You must leave custody or withdraw from the descent before traveling.';return state;}
  if (!ageAllows(state, 14) || waiting(state) || state.dungeon || state.timeline?.journey || state.workshop?.project || state.careers?.batch || experienceModule(state) || state.life?.plan || state.phase === 'retired') {
    state.notice = state.workshop?.project ? 'Finish or cancel your committed project before traveling.' : !ageAllows(state, 14) ? 'Regional travel opens at age 14.' : 'Finish the current situation or road journey before traveling.'; return state;
  }
  const destination = state.world.locations.find(place => place.id === locationId);
  if (!destination || state.locationId === locationId) { state.notice = destination ? 'You are already here.' : 'That place is not on your regional map.'; return state; }
  if(state.revision>=5){
    const preview=travelPlanPreview(state,locationId);
    if(preview.disabledReason||preview.route.length<2||state.hero.gold<preview.cost){state.notice=preview.disabledReason||'Your savings do not cover these preparations.';return state;}
    markSiteKnowledge(state,locationId,'Rumored','Directions requested from local road carriers',{heard:true});
    state.hero.gold-=preview.cost;
    if(!beginTravelJourney(state,preview,engineContext(state,{annual:true})))return {...copy(original),notice:'The planned journey could not begin.'};
    return resumeRoad(state);
  }
  if (birthMode(state)) {
    const preview = travelPreview(state, locationId);
    if (preview.disabledReason || preview.route.length < 2) { state.notice = preview.disabledReason || 'No road reaches this place.'; return state; }
    state.timeline.journey = { destinationId: locationId, route: [...preview.route], legIndex: 0, legProgress: 0, startedDay: state.day, traversedIds: [state.locationId] };
    return resumeRoad(state);
  }
  const originName = location(state).name;
  state.notice = ''; spendDays(state, destination.travelDays, { outdoors: true });
  const daylightNotice = state.notice; state.locationId = locationId; state.flags.actionsTaken++;
  state.notice = `${destination.travelDays} day${destination.travelDays === 1 ? '' : 's'} from ${originName} brings you to ${destination.name}.${daylightNotice ? ` ${daylightNotice}` : ''}`;
  addJournal(state, 'A road taken', state.notice, 'travel'); recordFirstMissionArrival(state,original.locationId);return afterAction(state);
}

export function recruitCompanion(original, id) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  const reason=companionActionReason(state,id);
  if(reason){state.notice=reason;return state;}
  const person = state.companions.find(item => item.id === id);
  person.recruited = true;
  person.active = !personalReadiness(state,id)&&state.companions.filter(item => item.active&&item.alive!==false).length < 3;
  person.relationship = Math.max(person.relationship, id === 'mira' ? 20 : 10);
  remember(state, id, state.rpg?'You invited me to share the road while respecting my own work, family and unfinished accounts.':id === 'mira' ? 'We began traveling together after growing up as friends.' : id === 'orrin' ? 'You invited me to travel as a healer, without asking me to forget my family.' : 'You invited me onto the road while respecting my search for my sibling.');
  const active=state.companions.filter(item=>item.active&&item.alive!==false).length;
  state.notice = person.active?`${person.name} joins the active party (${active}/3 companion slots). Their goals and values remain their own.`:`${person.name} joins your traveling circle in reserve (${active}/3 active companion slots). Open Party to choose who travels.${personalReadiness(state,id)?' '+personalReadiness(state,id):''}`;
  addJournal(state, 'A companion, not an equipment slot', state.notice, 'relationship');
  return copy(state);
}

export function toggleCompanion(original, id) {if(terminalRun(original))return copy(original);
  const state = copy(original);
  const reason=companionActionReason(state,id,'toggle');
  if(reason){state.notice=reason;return state;}
  const person = state.companions.find(item => item.id === id);
  person.active = !person.active;
  state.notice = person.active ? `${person.name} is traveling in the active party.` : `${person.name} takes time for their own life and remains in your circle.`;
  return copy(state);
}

export function resolveBattle(original, completed) {
  if (terminalRun(original)) return copy(original);
  const state = copy(original);
  const pending = state.battle;
  if(pending?.context?.kind==='tournament'||pending?.tournamentRulesVersion!==undefined){
    if(!validBattle(pending,state)||!sameBattleMortalityPolicy(pending,completed)||state.flags.lastResolvedBattle===pending.instanceId||!resolveTournamentBattle(state,completed,engineContext(state)))return {...copy(original),notice:'There is no matching earned local bout to resolve.'};
    return afterAction(state);
  }
  if (!pending || !completed || !['victory', 'defeat', 'retreat', IRONMAN_TERMINAL].includes(completed.outcome)
      || completed.instanceId !== pending.instanceId || completed.encounterId !== pending.encounterId
      || state.flags.lastResolvedBattle === pending.instanceId || !Array.isArray(completed.actors)) {
    state.notice = 'There is no matching completed battle to resolve.';
    return state;
  }
  if (JSON.stringify(completed.context ?? null) !== JSON.stringify(pending.context ?? null)) { state.notice = 'The result does not match the expedition that began this battle.'; return state; }
  if (!sameBattleMortalityPolicy(pending, completed)) { state.notice = 'The result changed the captured combat mortality rules.'; return state; }
  if(completed.tacticsVersion!==pending.tacticsVersion){state.notice='The result changed the earned tactics.';return state;}
  if(completed.effectsVersion!==pending.effectsVersion){state.notice='The result changed the captured effects.';return state;}
  if(completed.balanceVersion!==pending.balanceVersion){state.notice='The result changed the battle rules.';return state;}
  const expectedIds = pending.actors.map(actor => actor.id).sort().join('|');
  const actualIds = completed.actors.map(actor => actor?.id).sort().join('|');
  if (expectedIds !== actualIds || !completed.actors.every(actor => Number.isFinite(actor.hp) && actor.hp >= 0 && Number.isFinite(actor.mp) && actor.mp >= 0)) {
    state.notice = 'The combat result does not match the party that entered the encounter.';
    return state;
  }
  if (!validBattle(completed, state) || !completed.actors.every(actor => actor.side === pending.actors.find(originalActor => originalActor.id === actor.id)?.side)) {
    state.notice = 'The completed encounter has invalid actors, turns, or resources.';
    return state;
  }
  if(!completed.actors.every(actor=>{const before=pending.actors.find(a=>a.id===actor.id);return ['name','role','maxHp','maxMp','agility','armor','attackPower','illustration','attributes','skills','gear','bloodless','weakness','aiKey','path','specialization','oathBroken','trainedTechniques','planId','planCycle','resistances','bossId','phasePlan','ephemeral'].every(key=>JSON.stringify(actor[key])===JSON.stringify(before[key]));})){state.notice='The result changed the identity or abilities of a combatant.';return state;}
  const livingParty = completed.actors.some(actor => actor.side === 'party' && actor.hp > 0);
  const livingEnemy = completed.actors.some(actor => actor.side === 'enemy' && actor.hp > 0);
  if ((completed.outcome === 'victory' && (livingEnemy || !livingParty)) || (completed.outcome === 'defeat' && livingParty)) {
    state.notice = 'The encounter is still in progress; its result has not been earned.';
    return state;
  }
  const heroActor = completed.actors.find(actor => actor.id === 'hero' && actor.side === 'party');
  if (!heroActor) { state.notice = 'The party result is missing your character.'; return state; }
  if (isIronman(state)) {
    state.battle = copy(completed);
    if (!applyIronmanBattleMortality(state)) return {...copy(original),notice:'The captured combat mortality does not match this run. No result was accepted.'};
    if (terminalRun(state)) return state;
  }
  const mazeRun=pending.context?.kind==='maze'?state.maze:null;
  if(mazeRun)ensureMazeVisit(state,mazeRun);
  state.hero.hp = clamp(heroActor.hp, 0, state.hero.maxHp);
  state.hero.mp = clamp(heroActor.mp, 0, state.hero.maxMp);
  if (state.hero.condition?.type === 'vampire' && heroActor.condition?.type === 'vampire' && Number.isFinite(heroActor.condition.hunger)) {
    const relief=Math.max(0,state.hero.condition.hunger-heroActor.condition.hunger);
    if(relief>0)feedBlood(state,'combat',relief,engineContext(state));else state.hero.condition.hunger=clamp(heroActor.condition.hunger,0,100);
  }
  if (state.hero.condition?.type === 'lycanthrope' && heroActor.condition?.type === 'lycanthrope' && Number.isFinite(heroActor.condition.control)) state.hero.condition.control = clamp(heroActor.condition.control, 0, 100);
  if (Number.isInteger(completed.potions) && completed.potions >= 0) state.hero.potions = Math.min(pending.potions, completed.potions);
  if(mazeRun)recordMazeUse(state,'potions',Math.max(0,pending.potions-state.hero.potions),mazeRun);
  for (const person of state.companions) {
    const actor = completed.actors.find(item => item.id === person.id && item.side === 'party');
    if (actor && completed.outcome==='victory' && (!isIronman(state) || person.alive !== false))person.combatExperience=Math.min(324,(person.combatExperience||0)+1);
    if (actor) { person.hp = clamp(actor.hp, 0, person.maxHp); person.mp = clamp(actor.mp, 0, person.maxMp); }
  }
  if(completed.outcome==='retreat')applyPersonalityImpact(state,{kind:'battle',id:'retreat'});
  state.flags.lastResolvedBattle = pending.instanceId;
  state.battle = null;
  const goldBeforeResult = state.hero.gold;
  const mazeVictoryBefore=mazeRun&&completed.outcome==='victory'?beginMazeSettlement(state,mazeRun):null;
  if (completed.outcome === 'victory') {
    state.hero.gold += pending.rewards.gold;
    earnExperience(state, pending.rewards.exp);
    state.hero.hp = Math.max(1, state.hero.hp);
    state.notice = `Victory earns ${pending.rewards.gold} gold and ${pending.rewards.exp} experience. Your remaining health, magic, and potions carry back into life.`;
    if (pending.encounterId === 'forest') {
      state.flags.roadSafe = true; standing(state, 'villagers', 8);
      remember(state, 'kest', 'You helped make the western road safe enough for ordinary travelers.', 8);
      addJournal(state, 'The western road is safer', 'The road’s danger was real, and your patrol changed it. This fact supports later fieldwork.', 'world');
    } else if (pending.encounterId === 'ruin') {
      state.flags.archiveRecovered = true; state.flags.knowsAncestralRite = true; standing(state, 'academy', 4);
      addJournal(state, 'The archive recovered', 'Sealed research now has a path back into the world. A recovered field note connects the ruined cistern to the fever.', 'world');
    } else if (pending.encounterId === 'initiation' && state.flags.pendingSpecialization) {
      if (state.flags.pendingSpecialization === 'assassin' && state.flags.lethalCommission) {
        addEvidence(state, 3, 'A courier’s guard reported your lethal guild commission.'); standing(state, 'villagers', -10);
        remember(state, 'kest', 'You carried out a lethal commission when another approach existed.', -12);
      }
      if(state.flags.legacyMentorTrial&&state.flags.legacyMentorTrial.classId===state.flags.pendingSpecialization)completeLegacyMentorTrial(state,'combat',engineContext(state));
      else awardSpecialization(state, state.flags.pendingSpecialization);
    }
    addJournal(state, 'A battle returned to a life', state.notice, 'combat');
  } else if (completed.outcome === 'defeat' && pending.context?.kind==='curse') {
    state.hero.hp=Math.max(1,Math.ceil(state.hero.maxHp*.1));
    state.notice = `You survive the hunt with at least 10% health. ${defeatGuidance(completed)}`;
    addJournal(state, 'A hunt survived', state.notice, 'combat');
  } else if (completed.outcome === 'defeat' && pending.context?.kind==='delve') {
    state.notice = 'You went down in the dark.';
  } else if (completed.outcome === 'defeat') {
    const lost = Math.min(state.hero.gold, Math.max(4, Math.floor(state.hero.gold * 0.15)));
    if(mazeRun)recordMazeFee(state,'recovery',lost,mazeRun);
    state.hero.gold -= lost; spendDays(state, 3,{expeditionDayKind:mazeRun?'recovery':'inside'});
    if(state.phase==='retired')return afterAction(state);
    state.hero.hp = Math.max(1, Math.ceil(state.hero.maxHp * 0.4));
    state.hero.mp = Math.max(state.hero.mp, Math.ceil(state.hero.maxMp * 0.35));
    for (const person of state.companions) if (person.recruited && person.active) person.hp = Math.max(person.hp, Math.ceil(person.maxHp * 0.35));
    delete state.flags.pendingSpecialization;
    state.notice = `You survive defeat. Recovery takes 3 days and ${lost} gold; no profession, friendship, or learned skill is erased. ${defeatGuidance(completed)}`;
    addJournal(state, 'Survival has a cost', state.notice, 'combat');
  } else {
    state.hero.hp = Math.max(1, state.hero.hp); delete state.flags.pendingSpecialization;
    state.notice = 'You retreat with your remaining resources. No rewards are granted; you can recover and try again.';
    addJournal(state, 'The choice to survive', state.notice, 'combat');
  }
  if(pending.encounterId==='initiation'&&completed.outcome!=='victory'&&state.flags.legacyMentorTrial&&['trial','service'].includes(state.flags.legacyMentorTrial.stage)&&state.phase!=='retired')state.flags.pendingSpecialization=state.flags.legacyMentorTrial.classId;
  if(completed.outcome==='victory'&&['dungeon','rpg','campaign','delve'].includes(pending.context?.kind))dropEquipment(state,'battle:'+pending.instanceId,Math.min(6,1+(pending.actors.filter(a=>a.side==='enemy').length||1)),engineContext(state));
  if (pending.context?.kind === 'curse') afterCurseBattle(state,pending,completed.outcome,engineContext(state));
  if (pending.context?.kind === 'dungeon') afterExplorationBattle(state, copy(pending.context), completed.outcome, engineContext(state));
  if (pending.context?.kind === 'campaign') afterCampaignBattle(state, copy(pending.context), completed.outcome, engineContext(state));
  if (pending.context?.kind === 'travel') afterTravelBattle(state, copy(pending.context), completed.outcome, engineContext(state,{annual:true}));
  if(pending.context?.kind==='maze')afterMazeBattle(state,pending,completed.outcome,engineContext(state,{annual:true}),completed);
  if(pending.context?.kind==='delve'){afterDelveBattle(state,pending,completed.outcome,engineContext(state,{annual:true}),completed);if(terminalRun(state)||state.phase==='retired')return afterAction(state);}
  if(mazeVictoryBefore)endMazeVictory(state,mazeRun,Number(pending.context.roomId),mazeVictoryBefore,pending.rewards.exp);
  if(pending.context?.kind==='rpg')afterRpgBattle(state,completed,engineContext(state));
  if(pending.context?.kind==='politics')afterPoliticalBattle(state,pending,completed.outcome,engineContext(state,{annual:true}));
  if(pending.context?.kind==='adventure')afterAdventureBattle(state,pending,completed,engineContext(state,{annual:true}));
  if(state.age>=18&&!state.hero.condition&&state.phase!=='retired'&&heroActor.hp<(pending.startingHeroHp??pending.actors.find(a=>a.id==='hero').hp)&&completed.actors.some(a=>a.side==='enemy'&&/feral.*blood|vampire/i.test(a.name))&&seededRoll(state.seed,'bite:'+pending.instanceId,100)<10)contractCurse(state,'vampire','A feral vampire’s bite in '+location(state).name,engineContext(state),completed.actors.find(a=>a.illustration?.condition?.type==='vampire')?.illustration.condition.bloodline);
  if(state.age>=18&&!state.hero.condition&&state.phase!=='retired'&&heroActor.hp<(pending.startingHeroHp??pending.actors.find(a=>a.id==='hero').hp)&&completed.actors.some(a=>a.side==='enemy'&&/moon-cursed|werewolf/i.test(a.name))&&seededRoll(state.seed,'moon-bite:'+pending.instanceId,100)<10)contractCurse(state,'lycanthrope','A moon-cursed beast’s bite in '+location(state).name,engineContext(state));
  if (completed.outcome === 'victory' && state.revision >= 4) applyPreferenceActivity(state, 'forest_expedition', engineContext(state));
  recordPlanGold(state, goldBeforeResult);
  return afterAction(state);
}

const EVENT_CHOICES = {
  ...curseEventIds(),...fieldEventIds(),country_danger:['avoid','fight'],
  childhood_1: ['defend', 'investigate', 'family'], childhood_2: ['scholarship', 'apprentice', 'martial'], childhood_3: ['confess', 'question', 'hide'],
  apprenticeship: ['healer', 'merchant', 'scholar', 'herbalist', 'soldier'], companion_talk: ['listen', 'principle', 'disagree'],
  family_visit: ['time', 'gift', 'confide', 'stories'], plague_letter: ['promise', 'questions', 'later'], clinic: ['academy', 'support'],
  academy_remedy: ['field', 'research', 'both'], paladin_oath: ['mercy', 'truth', 'protection', 'decline'],
  necromancer_ethics: ['consent', 'bind', 'decline'], assassin_commission: ['ledger', 'lethal', 'decline'],
  initiation_trial: ['combat', 'service', 'pause'], ancestor_remedy: ['consent', 'license', 'bind', 'withdraw'],
  vampire_offer: ['accept', 'decline', 'later'], vampire_feeding: ['donor', 'animal', 'predation', 'abstain'],
  plague_homecoming: ['open', 'private', 'quiet'], homecoming_aftermath: ['continue', 'chronicle'],
  orrin_request: ['promise', 'honest'], retirement: ['settle', 'continue'],
  lycan_offer: ['accept', 'decline', 'later'], lycan_fullmoon: ['safe', 'isolate', 'resist', 'roam'],
  annual_deadline_review: ['pause', 'continue'],
};
const FLAG_NUMBERS = ['childhoodStage', 'actionsTaken', 'education', 'clinicShifts', 'training', 'plagueStage', 'herbs', 'battlesStarted', 'activeMoonDay', 'hungerPauseDay'];
const FLAG_BOOLEANS = ['familyOriginInterest','roadSafe', 'travelByNight', 'hungerWarning', 'scholarshipMissed', 'researchOverdue', 'oathServiceMissed', 'plagueDelay', 'companionRequestSeen', 'certified', 'oathBroken', 'scholarship', 'apprenticeship', 'childhoodMentor', 'childhoodFriend', 'trustedTeacher', 'ancestralMentor', 'hiddenPage', 'shrineRestored', 'researchBorrowed', 'researchReturned', 'forbiddenResearch', 'fieldResearch', 'knowsAncestralRite', 'archiveRecovered', 'soulBound', 'lethalCommission', 'miraWithdrawn', 'familyHelped', 'familySupported', 'familyRefuge', 'conditionDisclosed', 'conditionDiscovered', 'vampireAccepted', 'vampireDeclined', 'vampireCured', 'licensedReport', 'publicNecromancy', 'miraKnowsResearch', 'miraKnowsCondition', 'villageSaved', 'springClue', 'lycanAccepted', 'lycanDeclined', 'lycanCured', 'lycanDiscovered', 'mageLicence', 'ordained'];
const integer = (value, min = 0, max = 1000000) => Number.isInteger(value) && value >= min && value <= max;
const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const textField = (value, maximum = 20000) => typeof value === 'string' && value.length <= maximum;
const finiteRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
function validCondition(condition, day) {
  if (condition === null) return true;
  if (!plain(condition)||!validateCurse(condition,day)) return false;
  if (condition.type === 'vampire') return finiteRange(condition.hunger, 0, 100);
  if (condition.type !== 'lycanthrope') return false;
  const moonDate = value => integer(value) && (value === 0 || value >= 14 && (value - 14) % 28 === 0);
  return finiteRange(condition.control, 0, 100) && moonDate(condition.preparedUntil) && moonDate(condition.lastFullMoon) && condition.lastFullMoon <= day;
}

function validBattle(battle, state) {
  if (!plain(battle) || !(encounterIds().includes(battle.encounterId)||battle.encounterId==='watchhouse_duel') || !textField(battle.instanceId, 256) || !battle.instanceId) return false;
  if (!validateBattleMortality(battle, state)) return false;
  if (!textField(battle.title) || !Array.isArray(battle.actors) || battle.actors.length < 2 || battle.actors.length > 10) return false;
  if(battle.tournamentRulesVersion!==undefined&&!isTournamentBattle(battle))return false;
  if(battle.encounterId==='watchhouse_duel'&&!isTournamentBattle(battle))return false;
  if(isTournamentBattle(battle)){
    if(!validTournamentBattle(state,battle))return false;
    const actor=battle.actors.find(a=>a.id==='hero'),earned=combatProfile(state).actor;
    if(!actor||!['name','role','maxHp','maxMp','agility','armor','attributes','skills','gear','equipment','path','specialization','oathBroken'].every(k=>JSON.stringify(actor[k])===JSON.stringify(earned[k]))||JSON.stringify(actor.trainedTechniques??[])!==JSON.stringify(state.rpg?.trainedTechniques??[])||battle.startingHeroHp!==state.hero.hp)return false;
    const condition=copy(actor.condition);if(condition?.type==='lycanthrope')condition.control=state.hero.condition?.control;
    if(JSON.stringify(condition)!==JSON.stringify(state.hero.condition||null))return false;
  }else if(battle.actors.some(a=>a.duelPlanId!==undefined||a.duelDifficulty!==undefined))return false;
  const ids = new Set();
  for (const actor of battle.actors) {
    if(battle.balanceVersion!==undefined&&battle.balanceVersion!==21)return false;
    if (!plain(actor) || !textField(actor.id, 64) || !actor.id || ids.has(actor.id) || !['party', 'enemy'].includes(actor.side)) return false;
    if (!textField(actor.name, 120) || !textField(actor.role, 64) || !integer(actor.maxHp, 1, 100000) || !integer(actor.maxMp, 0, 100000)) return false;
    if (!finiteRange(actor.hp, 0, actor.maxHp) || !finiteRange(actor.mp, 0, actor.maxMp) || !integer(actor.agility, 1, 10000)) return false;
    if (typeof actor.defending !== 'boolean' || !plain(actor.status)) return false;
    if (actor.side === 'party' && !['hero', ...state.companions.map(person => person.id),...(battle.effectsVersion===27?['ash_attendant']:[])].includes(actor.id)) return false;
    if (actor.id === 'hero' && (!plain(actor.attributes) || !plain(actor.skills))) return false;
    if (actor.id === 'hero' && !ATTRIBUTES.every(key => finiteRange(actor.attributes[key], 0, 10000))) return false;
    if (actor.id === 'hero' && !SKILLS.every(key => finiteRange(actor.skills[key], 0, 10000))) return false;
    if (actor.id === 'hero' && actor.condition !== undefined && !validCondition(actor.condition, state.day)) return false;
    if (actor.gear !== undefined && (!plain(actor.gear) || !['attack', 'armor', 'magic', 'agility'].every(key => finiteRange(actor.gear[key], -200, 200)))) return false;
    if (!Object.values(actor.status).every(status => typeof status === 'boolean' || finiteRange(status, 0, 10000))) return false;
    if (actor.side === 'enemy' && !finiteRange(actor.attackPower, 0, 10000)) return false;
    if (actor.armor !== undefined && !finiteRange(actor.armor, 0, 10000)) return false;
    if(!validEnemyPlan(actor))return false;
    if(actor.resistances!==undefined&&(!Array.isArray(actor.resistances)||actor.resistances.length>16||new Set(actor.resistances).size!==actor.resistances.length||!actor.resistances.every(key=>['fire','ice','lightning','radiance','physical','bleed','poison','burn','fear','silenced','rooted','stunned','weakened'].includes(key))))return false;
    if(actor.sealedTechnique!==undefined&&(!textField(actor.sealedTechnique,80)||!actor.sealedTechnique))return false;
    if(actor.trainedTechniques!==undefined&&(!Array.isArray(actor.trainedTechniques)||actor.trainedTechniques.length>24||!actor.trainedTechniques.every(id=>advancedTechnique(id))))return false;
    if (actor.aiStep !== undefined && !integer(actor.aiStep, 0, 1000000)) return false;
    if (actor.aiKey !== undefined && !['keeper', 'archivist', 'thornheart', 'captain', 'warden', 'covenant', 'warder', 'leech', 'sniper', 'hexer', 'barbed', 'basic', 'striker'].includes(actor.aiKey)) return false;
    if (actor.intent !== undefined && !textField(actor.intent, 2000)) return false;
    if(actor.illustration!==undefined&&(!validEnemyIllustration(actor.illustration)||(actor.illustration.kind==='person'&&!isCanonicalAppearance(actor.illustration.appearance))))return false;
    if(actor.personality!==undefined&&!textField(actor.personality,64))return false;
    if(actor.bloodless!==undefined&&typeof actor.bloodless!=='boolean')return false;
    if(actor.weakness!==undefined&&!['fire','ice','lightning','radiance','physical'].includes(actor.weakness))return false;
    ids.add(actor.id);
  }
  if (!ids.has('hero') || !battle.actors.some(actor => actor.side === 'enemy')) return false;
  if (battle.context !== undefined) {
    const context = battle.context;
    if (!plain(context) || !['dungeon', 'campaign', 'travel','adventure','curse','rpg','maze','delve','politics','tournament','initiation'].includes(context.kind) || !Object.entries(context).every(([key,v]) => textField(v, context.kind==='maze'&&context.contentVersion==='1'&&key==='runSeed'?400:160))) return false;
    if (context.kind === 'initiation' && (battle.encounterId !== 'initiation' || !validPaladinTrialContext(state, context))) return false;
    if(context.kind==='politics'&&!validPoliticalBattle(state,context))return false;
    if(context.kind==='tournament'&&!validTournamentContext(state,context))return false;
    if(context.kind==='maze'&&!validMazeContext(state,context,battle))return false;
    if(context.kind==='curse'&&(context.locationId!==state.locationId||!state.hero.condition?.hunts?.some(h=>h.locationId===state.locationId&&h.status==='summoned')))return false;
    if(context.kind==='adventure'&&!validAdventureContext(state,context))return false;
    if(context.kind==='rpg'&&!validRpgBattleContext(state,context))return false;
    if (context.kind === 'dungeon' && (!state.dungeon || context.dungeonId !== state.dungeon.id || context.roomId !== state.dungeon.pendingRoom || context.roomId !== state.dungeon.roomId || context.questId !== state.dungeon.facts?.questId)) return false;
    if (context.kind === 'campaign' && (!state.campaign?.pending || context.questId !== state.campaign.pending.questId || context.stage !== state.campaign.pending.stage)) return false;
    if (context.kind === 'travel' && (state.revision<5 || !state.timeline?.journey || state.travel?.pending?.stage!=='battle' || context.journeyId!==state.travel.pending.journeyId || context.legId!==state.travel.pending.legId)) return false;
  }
  if (!Array.isArray(battle.turnOrder) || !battle.turnOrder.every(id => ids.has(id)) || new Set(battle.turnOrder).size !== battle.turnOrder.length) return false;
  if (!integer(battle.round, 1) || !Array.isArray(battle.log) || !battle.log.every(item => textField(item, 2000))) return false;
  if (!integer(battle.potions, 0, 10000) || !integer(battle.potionsUsed, 0, 10000)) return false;
  if (!plain(battle.rewards) || !integer(battle.rewards.gold, 0, 1000) || !integer(battle.rewards.exp, 0, 1000)) return false;
  if (![null, 'victory', 'defeat', 'retreat', IRONMAN_TERMINAL].includes(battle.outcome)) return false;
  const livingParty = battle.actors.some(actor => actor.side === 'party' && actor.hp > 0);
  const livingEnemy = battle.actors.some(actor => actor.side === 'enemy' && actor.hp > 0);
  if (battle.outcome === null) {
    const current = battle.actors.find(actor => actor.id === battle.currentActorId);
    const livingIds = battle.actors.filter(a => a.hp > 0).map(a => a.id);
    if (battle.turnOrder.length !== livingIds.length || !battle.turnOrder.every(id => livingIds.includes(id))) return false;
    if (!current || current.side !== 'party' || current.hp <= 0 || !battle.turnOrder.includes(current.id) || !livingParty || !livingEnemy) return false;
  }
  if (battle.outcome === 'victory' && (!livingParty || livingEnemy)) return false;
  if (battle.outcome === 'defeat' && livingParty) return false;
  if (battle.outcome !== null && battle.currentActorId !== null) return false;
  return true;
}

export function validateSave(value) {
  try {
    if (!validateIronman(value)) return false;
    if(value?.adultTournament!==undefined&&value.revision!==5)return false;
    if (!plain(value) || value.version !== 1 || !textField(value.seed, 128) || !value.seed || !['childhood', 'adult', 'retired'].includes(value.phase)) return false;
    if (![undefined, 1, 2, 3, 4, 5].includes(value.revision)) return false;
    if (!integer(value.day) || !integer(value.age, birthMode(value) ? 0 : 7, 5000) || !plain(value.hero) || !validateWorld(value.world)) return false;
    if (!value.world.locations.some(place => place.id === value.locationId)||!validateNpcContinuity(value)) return false;
    if(!validateCartography(value.cartography,value))return false;
    if(!validNotifications(value.inbox,value))return false;
    if (!textField(value.notice) || !(value.chronicle === null || textField(value.chronicle, 100000))) return false;
    const hero = value.hero;
    if(!validFirstDayGuide(hero.firstDayGuide))return false;
    if(!validatePersonality(hero.personality,value)||!validateStartingAttributes(hero.startingAttributes,value))return false;
    if(hero.lifeOrigin!==undefined && (!plain(hero.lifeOrigin)||hero.lifeOrigin.version!==1||!originById(hero.lifeOrigin.id)||!integer(hero.lifeOrigin.startingAge,0,Math.min(MAX_START_AGE,value.age))))return false;
    if (!textField(hero.name, 40) || !hero.name.trim() || !['village', 'city'].includes(hero.origin) || !['poor', 'tradesfolk', 'noble'].includes(hero.household) || !(PATHS.includes(hero.path) || value.revision >= 3 && hero.path === 'unformed')) return false;
    if (!(hero.specialization === null || ['paladin', 'necromancer', 'assassin'].includes(hero.specialization) || value.revision >= 3 && CLASS_CATALOG.some(c => c.id === hero.specialization)) || !(value.revision>=5?PROFESSION_CATALOG.some(p=>p.name===hero.profession):['Unemployed', 'Healer', 'Merchant', 'Scholar', 'Herbalist', 'Soldier'].includes(hero.profession))) return false;
    if(hero.birthplaceId!==undefined&&!value.world.locations.some(p=>p.id===hero.birthplaceId))return false;
    if (!plain(hero.appearance) || !['hair', 'eyes', 'skin', 'build'].every(key => textField(hero.appearance[key], 80)) || !textField(hero.ambition, 160)) return false;
    if (!integer(hero.level, 1, 1000) || !integer(hero.exp, 0, hero.level * 45 - 1) || !integer(hero.gold, 0, 10000000) || !integer(hero.potions, 0, 10000)) return false;
    if (!integer(hero.maxHp, 1, 100000) || !integer(hero.maxMp, 0, 100000) || !finiteRange(hero.hp, 0, hero.maxHp) || !finiteRange(hero.mp, 0, hero.maxMp)) return false;
    if (!plain(hero.attributes) || !ATTRIBUTES.every(key => integer(hero.attributes[key], 1, 10000))) return false;
    if (!plain(hero.skills) || !SKILLS.every(key => integer(hero.skills[key], 0, 10000))) return false;
    // Marks: what a life has done to a person (a break's coping, later scars and the like).
    if (hero.marks !== undefined && !(Array.isArray(hero.marks) && hero.marks.length <= 24 && hero.marks.every(m => plain(m) && textField(m.id, 40) && integer(m.day, 0, value.day) && textField(m.source, 40)))) return false;
    if (!validCondition(hero.condition, value.day)) return false;
    if(value.event?.id.startsWith('curse_')&&value.event.id!=='curse_rare_meeting'&&hero.condition===null)return false;
    if (value.revision >= 2) {
      if (!['gentle', 'balanced', 'perilous'].includes(value.difficulty) || !TEMPERAMENTS.includes(hero.temperament) || !BELIEFS.includes(hero.belief) || !PRONOUNS.includes(hero.pronouns)) return false;
      if (!isCanonicalAppearance(hero.appearance)) return false;
      if (hero.legacyAppearance !== undefined && (!plain(hero.legacyAppearance) || !['hair', 'eyes', 'skin', 'build'].every(key => textField(hero.legacyAppearance[key], 80)))) return false;
      if(!validPersonalNotes(value))return false;
      if(value.narrativeEdition!==undefined&&value.narrativeEdition!==30)return false;
      if(value.worldServicesVersion!==undefined&&value.worldServicesVersion!==1)return false;
      if(value.characterDialogueVersion!==undefined&&value.characterDialogueVersion!==28)return false;
      if (!validateUpbringing(value.upbringing,value))return false;
      if (!validateNightEncounters(value.nightEncounters,value))return false;
      if (!validateQuestJournal(value.questLog,value))return false;
      if (!validateGear(value.equipment) || !validateLife(value.life, value)) return false;
    }
    if (!Array.isArray(value.companions) || value.companions.length !== (value.rpg?.rosterVersion===1?6:3)) return false;
    for (const [index, person] of value.companions.entries()) {
      if (!plain(person) || person.id !== ['mira', 'orrin', 'kest','sable','tovin','vesper'][index] || !['warrior', 'mage', 'rogue','healer'].includes(person.role)) return false;
      if (![person.name, person.goal].every(item => textField(item, 1000)) || !Array.isArray(person.values) || !person.values.length || !person.values.every(item => textField(item, 1000))) return false;
      if (person.knownFacts !== undefined && (!Array.isArray(person.knownFacts) || person.knownFacts.length > 60 || !person.knownFacts.every(fact => textField(fact, 1000)))) return false;
      if (!Array.isArray(person.memories) || !person.memories.every(item => textField(item, 2000)) || !finiteRange(person.relationship, -100, 100)) return false;
      if (typeof person.recruited !== 'boolean' || typeof person.active !== 'boolean' || (person.active && !person.recruited)) return false;
      if (!integer(person.maxHp, 1, 100000) || !integer(person.maxMp, 0, 100000) || !finiteRange(person.hp, 0, person.maxHp) || !finiteRange(person.mp, 0, person.maxMp) || !integer(person.agility, 1, 10000)) return false;
      if(person.combatExperience!==undefined&&!integer(person.combatExperience,0,324))return false;
      if (person.age !== undefined && !integer(person.age, birthMode(value) ? 0 : 1, 5000)) return false;
      if (person.baseAge !== undefined && !integer(person.baseAge, birthMode(value) ? 0 : 1, 5000)) return false;
      if (person.bornDay !== undefined && !integer(person.bornDay, -10000000, value.day)) return false;
      if (person.alive !== undefined && typeof person.alive !== 'boolean') return false;
      if (person.deathDay !== undefined && !(person.deathDay === null || person.alive === false && integer(person.deathDay, 0, value.day))) return false;
    }
    if (!plain(value.factions) || !['villagers', 'academy', 'order', 'underworld'].every(key => finiteRange(value.factions[key], -100, 100))) return false;
    if (!plain(value.legal) || typeof value.legal.wanted !== 'boolean' || !integer(value.legal.evidence) || !textField(value.legal.description) || !Array.isArray(value.legal.incidents)) return false;
    if (new Set(value.legal.incidents.map(item => item?.locationId)).size !== value.legal.incidents.length) return false;
    if (!value.legal.incidents.every(item => plain(item) && value.world.locations.some(place => place.id === item.locationId) && integer(item.evidence, 1) && textField(item.description))) return false;
    if (!plain(value.flags)||!validateLegacyMentorTrial(value)) return false;
    if (!['childhoodStage', 'actionsTaken', 'education', 'clinicShifts', 'training', 'plagueStage'].every(key => integer(value.flags[key]))) return false;
    if (!['roadSafe', 'travelByNight'].every(key => typeof value.flags[key] === 'boolean')) return false;
    if (value.flags.childhoodStage > 3 || value.flags.plagueStage > 4) return false;
    if (FLAG_NUMBERS.some(key => value.flags[key] !== undefined && !integer(value.flags[key]))) return false;
    if (FLAG_BOOLEANS.some(key => value.flags[key] !== undefined && typeof value.flags[key] !== 'boolean')) return false;
    if (value.flags.pendingSpecialization !== undefined && !['paladin', 'necromancer', 'assassin'].includes(value.flags.pendingSpecialization)) return false;
    if (value.flags.oathType !== undefined && !['mercy', 'truth', 'protection'].includes(value.flags.oathType)) return false;
    if (value.flags.oath !== undefined && !textField(value.flags.oath, 1000)) return false;
    if (value.flags.socialTarget !== undefined && !['mira', 'orrin', 'kest'].includes(value.flags.socialTarget)) return false;
    if (value.flags.remedyMethod !== undefined && !['moonroot', 'ancestral'].includes(value.flags.remedyMethod)) return false;
    if (value.flags.lastResolvedBattle !== undefined && !textField(value.flags.lastResolvedBattle, 256)) return false;
    if (value.flags.activeDeadlineToken !== undefined && !textField(value.flags.activeDeadlineToken, 256)) return false;
    if (value.flags.lycanRefugeLocation !== undefined && !value.world.locations.some(place => place.id === value.flags.lycanRefugeLocation)) return false;
    if (value.flags.pendingMoonDays !== undefined && (!Array.isArray(value.flags.pendingMoonDays) || value.flags.pendingMoonDays.length > 1000 || !value.flags.pendingMoonDays.every(day => integer(day, 14) && (day - 14) % 28 === 0 && day <= value.day) || new Set(value.flags.pendingMoonDays).size !== value.flags.pendingMoonDays.length)) return false;
    if (value.flags.reviewedObligations !== undefined && (!Array.isArray(value.flags.reviewedObligations) || !value.flags.reviewedObligations.every(token => textField(token, 256)))) return false;
    if (!Array.isArray(value.obligations) || !value.obligations.every(item => plain(item) && textField(item.id, 120) && textField(item.title, 500) && textField(item.description, 3000) && integer(item.dueDay) && typeof item.resolved === 'boolean' && (item.missed === undefined || typeof item.missed === 'boolean'))) return false;
    if (!Array.isArray(value.journal) || !value.journal.length || !value.journal.every(item => plain(item) && textField(item.id, 120) && integer(item.day) && integer(item.age, birthMode(value) ? 0 : 7, 5000) && textField(item.title, 1000) && textField(item.text, 10000) && textField(item.tag, 80) && (item.capturedReceipt===undefined||typeof item.capturedReceipt==='boolean') && (item.generation===undefined||integer(item.generation,1,5000)))) return false;
    if (value.event !== null) {
      const event = value.event;
      const allowed = { ...EVENT_CHOICES, ...yardEventIds(), ...tournamentEventIds(), ...lifeEventIds(), ...birthEventIds(), ...callingEventIds(), ...campaignEventIds(), ...explorationEventIds(), ...dialogueEventIds(), ...householdEventIds(), ...researchEventIds(), ...originEventIds(), ...loreEventIds(), ...careerEventIds(), ...lineageEventIds(), ...healthEventIds(), ...travelEventIds(),...societyEventIds(),...communityEventIds(),...fellowshipEventIds(),...sanctuaryEventIds(),...socialEventIds(),...pastimeEventIds(),...repertoireEventIds(),...storyEventIds(),...rpgEventIds(),...personalityEventIds(),...justiceEventIds(),...adventureEventIds(),...curseEventIds(),...WINTER_EVENT.ids(), ...DEBT_RECKONING_EVENT.ids(), ...SCHOOLING_EVENTS.ids(), ...LIVING_EVENTS.ids(),...GUILD_EVENTS.ids(),...DELVE_EVENTS.ids() };
      for(const need of ['life_hunger','vampire_feeding'])if(value.sanctuaries&&allowed[need])allowed[need]=[...allowed[need],'agreement'];
      if (!plain(event) || !(Object.hasOwn(allowed, event.id) || event.id === 'lycan_confidant') || ![event.title, event.category, event.body].every(item => textField(item))) return false;
      if (!Array.isArray(event.choices) || !event.choices.length || event.choices.length > 8 || new Set(event.choices.map(item => item?.id)).size !== event.choices.length) return false;
      if (!validateFeedingTerms(event))return false;
      if (!event.choices.every(item => plain(item) && (event.id === 'lycan_confidant' ? item.id === 'keep' || value.life?.people.some(person => item.id === `person_${person.id}`) : allowed[event.id].includes(item.id)) && textField(item.label, 1000) && textField(item.description, 3000))) return false;
      if(event.id==='curse_rare_meeting'){if(!value.nightEncounters?.pending||hero.condition!==null||value.age<18)return false;const pair=['patron','ranger'].includes(value.nightEncounters.pending)?value.nightEncounters.meeting?['speak','defer','leave']:['speak','leave']:['fight','withdraw'];if(JSON.stringify(event.choices.map(c=>c.id))!==JSON.stringify(pair))return false;}
      if (event.id === 'companion_talk' && !value.flags.socialTarget) return false;
      if (event.id === 'vampire_feeding' && !hero.condition) return false;
      if (event.id === 'initiation_trial' && !value.flags.pendingSpecialization) return false;
      if (['vampire_offer', 'lycan_offer'].includes(event.id) && hero.condition !== null) return false;
      if (['lycan_fullmoon', 'lycan_confidant'].includes(event.id) && hero.condition?.type !== 'lycanthrope') return false;
      if (event.id === 'lycan_fullmoon' && (!integer(value.flags.activeMoonDay, 14) || value.flags.activeMoonDay > value.day || value.flags.activeMoonDay <= hero.condition.lastFullMoon || !value.flags.pendingMoonDays?.includes(value.flags.activeMoonDay))) return false;
      if (event.id === 'annual_deadline_review' && !textField(value.flags.activeDeadlineToken, 256)) return false;
      if (event.id === 'life_hunger' && hero.condition?.type !== 'vampire') return false;
      if (event.id === 'life_wolf_confidant' && hero.condition?.type !== 'lycanthrope') return false;
      if (['life_courtship', 'life_commitment'].includes(event.id) && (!value.life?.pendingEvent || !value.life.people.some(person => person.id === value.life.pendingEvent.personId && person.role !== 'relative' && !person.familyRole && person.alive !== false && person.age >= 18))) return false;
    }
    if(value.event?.choices.some(c=>c.intentTags!==undefined&&(!Array.isArray(c.intentTags)||c.intentTags.length>4||!c.intentTags.every(t=>['care','give','learn','work','aspiration','rest','truth','deceit','cruelty','ruthless','take','domination','prudence','patience','delay','reckless','decisive','courage','mercy','forgive','vengeance','abandon','ritual','renounce','retreat'].includes(t)))||c.owner!==undefined&&!['hero','guardian','observer'].includes(c.owner)))return false;
    if (value.battle !== null && value.flags.lastResolvedBattle === value.battle.instanceId) return false;
    if (value.battle !== null && (!validBattle(value.battle, value) || value.event !== null || !ageAllows(value, 16))) return false;
    if (value.revision >= 3) {
      if (value.conversations?.pending && (value.event || value.battle || value.dungeon)) return false;
      if (value.dungeon?.pendingRoom && (value.battle?.context?.kind !== 'dungeon' || value.battle.context.roomId !== value.dungeon.pendingRoom)) return false;
      if (value.event?.id.startsWith('dungeon_') && value.event.id !== `dungeon_${value.dungeon?.id}_${value.dungeon?.roomId}`) return false;
      if (value.progression?.pendingCalling !== null && value.event?.id !== 'calling_initiation') return false;
      if (hero.specialization && CLASS_CATALOG.find(c => c.id === hero.specialization)?.role !== hero.path) return false;
      if (value.life?.people.some(p => p.locationId !== undefined && !value.world.locations.some(l => l.id === p.locationId))) return false;
      if (!validateTimeline(value.timeline, value) || !validateProgression(value.progression, value) || !validateCampaign(value.campaign, value) || !validateConversations(value.conversations, value) || !validateExploration(value.dungeon, value)) return false;
    }
    if (value.revision >= 4) {
      if (value.workshop?.project && value.timeline?.journey) return false;
      // validateNpcContinuity above authenticates the exact slot/person snapshot
      // before family-origin proof may use it instead of the old epoch projection.
      if (!validateResearchPortfolio(value.researchPortfolio,value,{npcRecord:id=>value.npcContinuity?.people[id]||null})||!validateResearchScene(value)||!validateFamilyOrigins(value.familyOrigins,value,{npcRecord:id=>value.npcContinuity?.people[id]||null})||!validateHousehold(value.family, value) || !validateEducation(value.education, value) || !validateWorkshop(value.workshop, value) || !validatePreferences(hero.preferences, value.preferenceHistory, value) || !validateLore(value.lore, value)) return false;
    }
    if(value.revision>=5){
      if(!validateHospitality(value)||!validateDaylife(value)||!validateWilderness(value)||!validateSocialLife(value)||!validateMazes(value)||!validateTravelEnergy(value)||!validateCareers(value.careers,value)||!validateLineage(value.lineage,value)||!validateHealth(value.health,value)||!validateTravel(value.travel,value))return false;
      if(value.householdBudget!==undefined&&!validateHouseholdBudget(value.householdBudget,value))return false;
      if(!validateFortune(value.fortune,value))return false;
      if(!validateStation(value.hero.station,value))return false;
      if(!validateEpitaph(value.epitaph)||(value.epitaph!==undefined&&value.phase!=='retired'))return false;
      if(value.education&&!validateSchooling(value.education.schooling,value))return false;
      if(!validateLiving(value.living,value))return false;
      if(!validateGuild(value.guild,value))return false;
      if(!validateDelve(value))return false;
      if(value.society!==undefined&&!validateSociety(value.society,value))return false;
      if(value.community!==undefined&&!validateCommunity(value.community,value))return false;
      if(value.fellowship!==undefined&&!validateFellowship(value.fellowship,value))return false;
      if(value.sanctuaries!==undefined&&!validateSanctuaries(value.sanctuaries,value))return false;
      if(value.social!==undefined&&!validateSocial(value.social,value))return false;
      if(!validateYard(value)||!validateAdultTournament(value))return false;
      if(value.pastimes!==undefined&&!validatePastimes(value.pastimes,value))return false;
      if(!validateRepertoire(value.repertoire,value))return false;
      if(value.event?.id==='repertoire_recall'&&!value.repertoire?.pending)return false;
      if(value.stories!==undefined&&!validateStories(value.stories,value))return false;
      if(!validateRpg(value.rpg,value))return false;
      if(value.realm!==undefined&&(!validateRealm(value.realm,value)||!validateRegionalWorld(value)))return false;
      if(!validateFieldNotes(value.cartography,value)||!validateReleaseFields(value))return false;
      if(value.justice!==undefined&&!validateJustice(value.justice,value))return false;
      if(value.adventuring!==undefined&&!validateAdventuring(value.adventuring,value))return false;
      if(value.event?.id.startsWith('social_')&&!value.social)return false;
      if(value.event?.id.startsWith('pastime_')&&!value.pastimes)return false;
      if(value.event?.id.startsWith('stories_')&&!value.stories)return false;
      const additions=[countingTableCommitment(value),tournamentLocked(value)?value.adultTournament:null,value.researchPortfolio?.project,value.familyOrigins?.project,value.rpg?.project,value.stories?.project,value.health?.recovery,value.society?.project,value.community?.project?.commitment,value.fellowship?.project,value.sanctuaries?.commitment,value.lineage?.adoption?.preparation,value.pastimes?.project,value.repertoire?.project].filter(Boolean);
      const commitments=[...additions,value.careers?.batch,value.workshop?.project,value.timeline?.journey].filter(Boolean);
      if(additions.length&&commitments.length>1)return false;
      if(value.careers?.batch&&(value.workshop?.project||value.timeline?.journey||value.dungeon||value.life?.plan))return false;
    }
    if (birthMode(value)) {
      if (value.age !== Math.floor((value.day-birthDay(value)) / 365) || value.age < 18 && value.phase !== 'childhood' && value.phase!=='retired' || value.age >= 18 && value.phase === 'childhood') return false;
      if (value.companions.some(p => !integer(p.baseAge, 0, 200) || p.age !== npcAge(value,p)) || value.life.people.some(p => p.age !== npcAge(value,p))) return false;
      if (hero.specialization === null && value.progression.learnedClassIds.length === 0 && hero.path !== 'unformed') return false;
      if (value.age < 16 && (value.battle || value.dungeon || value.companions.some(p => p.recruited) || hero.profession !== 'Unemployed')) return false;
      if (value.age < 18 && (hero.specialization !== null || hero.condition !== null || value.life.partnerId || value.life.courtshipId || value.life.children.length || value.life.plan)) return false;
      if (value.event?.id.startsWith('birth_') && (value.event.id === 'birth_arrival' ? value.age !== 0 || value.day !== birthDay(value) || value.timeline.yearTarget !== null : (value.age > 18 ? value.event.id !== 'birth_adult_year' : value.event.id !== `birth_year_${value.age}`) || (value.day-birthDay(value)) % 365 !== 0 || value.timeline.yearTarget !== value.day)) return false;
    } else {
      if (value.phase === 'childhood' && (value.day !== 0 || value.flags.childhoodStage > 2 || value.event?.id !== `childhood_${value.flags.childhoodStage + 1}` || value.age !== [7, 12, 17][value.flags.childhoodStage])) return false;
      if (value.phase !== 'childhood' && (value.flags.childhoodStage !== 3 || value.age !== 18 + Math.floor(value.day / 365))) return false;
    }
    if (value.phase === 'retired' && (value.event !== null || value.battle !== null || !value.chronicle)) return false;
    // Reject non-JSON save contents, including cycles and values that would disappear on export.
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > MAX_SAVE_CHARS) return false;
    return true;
  } catch {
    return false;
  }
}
